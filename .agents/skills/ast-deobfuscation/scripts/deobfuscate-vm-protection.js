/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');

const VM_PATTERNS = [
  /while\s*\(\s*(?:true|1|!!\[\])\s*\)\s*\{[\s\S]*?switch\s*\(/i,
  /var\s+\w+\s*=\s*\[\s*\d+(?:\s*,\s*\d+){10,}\s*\]/i,
  /\w+\[\s*pc\+\+\s*\]|\w+\[\s*\+\+pc\s*\]/i,
  /stack\.push|stack\.pop/i,
];

function detectVMProtection(code) {
  const matchCount = VM_PATTERNS.filter(pattern => pattern.test(code)).length;
  // 同时匹配数字与字符串 opcode（含 '0' / "0" 形式的字符串分发器）。
  const opcodeMatches = code.match(/case\s+(?:\d+|'[^']*'|"[^"]*")\s*:/g);
  const instructionCount = opcodeMatches ? opcodeMatches.length : 0;

  if (matchCount >= 2 || (matchCount >= 1 && instructionCount >= 10)) {
    return {
      detected: true,
      type: matchCount >= 3 ? 'custom-bytecode-vm' : 'simple-dispatch-vm',
      instructionCount,
      confidence: matchCount >= 3 ? 0.9 : 0.65,
    };
  }

  return {detected: false, type: 'none', instructionCount: 0, confidence: 0};
}

function caseHasCall(switchCase) {
  if (switchCase.consequent.length === 0) return false;
  let found = false;
  traverse(t.file(t.program(switchCase.consequent)), {
    CallExpression(pathNode) {
      found = true;
      pathNode.stop();
    },
  });
  return found;
}

function analyzeVMStructure(code) {
  const structure = {
    hasInterpreter: false,
    hasStack: /stack\.(?:push|pop)/i.test(code),
    hasPcCounter: /\bpc\+\+|\+\+pc\b/i.test(code),
    instructionOpcodes: [],
    instructionTypes: [],
  };

  try {
    const ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx'],
    });

    traverse(ast, {
      SwitchStatement(pathNode) {
        const discriminant = pathNode.node.discriminant;
        // 判断 discriminant 是否包含数组索引访问
        const isIndexed =
          t.isMemberExpression(discriminant) ||
          (t.isUpdateExpression(discriminant) &&
            t.isMemberExpression(discriminant.argument));

        if (isIndexed || pathNode.node.cases.length >= 8) {
          structure.hasInterpreter = true;
          for (const switchCase of pathNode.node.cases) {
            if (t.isNumericLiteral(switchCase.test)) {
              structure.instructionOpcodes.push(switchCase.test.value);
            } else if (t.isStringLiteral(switchCase.test)) {
              structure.instructionOpcodes.push(switchCase.test.value);
            }

            // 分析 case 内部行为
            const caseCode = generator(switchCase, {compact: true}).code;
            if (
              caseCode.includes('+') ||
              caseCode.includes('-') ||
              caseCode.includes('*')
            ) {
              structure.instructionTypes.push('arithmetic');
            }
            if (caseCode.includes('push') || caseCode.includes('pop')) {
              structure.instructionTypes.push('stack-op');
            }
            if (caseHasCall(switchCase)) {
              structure.instructionTypes.push('call');
            }
          }
        }
      },
    });

    structure.instructionTypes = Array.from(
      new Set(structure.instructionTypes),
    );
  } catch (err) {
    // 解析失败必须与「扫描成功但没找到解释器」区分开，否则报告会把
    // 假阴性当成事实。
    structure.parseError = err.message;
  }

  return structure;
}

function extractVMComponents(code) {
  const components = {
    bytecodeArrays: [],
    interpreterSnippets: [],
  };

  // 1. 提取长整数数组（疑似字节码）
  const arrayMatches = code.matchAll(
    /(?:var|let|const)\s+(\w+)\s*=\s*(\[\s*\d+(?:\s*,\s*\d+){10,}\s*\])/g,
  );
  for (const m of arrayMatches) {
    // 用数字匹配计数，避免 `[1,2,3,]` 尾逗号让 split(',') 多算一个元素。
    const numbers = m[2].match(/\d+/g);
    components.bytecodeArrays.push({
      identifier: m[1],
      length: numbers ? numbers.length : 0,
      sample: m[2].slice(0, 100) + '...',
    });
  }

  // 2. 提取解释循环片段
  const loopMatch = code.match(
    /while\s*\([^)]*\)\s*\{[\s\S]{1,500}?switch\s*\([^)]*\)\s*\{/i,
  );
  if (loopMatch) {
    components.interpreterSnippets.push(loopMatch[0]);
  }

  return components;
}

if (require.main === module) {
  const [, , inputPath, outputReport] = process.argv;
  if (!inputPath) {
    process.stderr.write(
      'Usage: node deobfuscate-vm-protection.js <input.js> [output-report.json]\n',
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
  const detection = detectVMProtection(raw);
  const structure = detection.detected ? analyzeVMStructure(raw) : null;
  const components = detection.detected ? extractVMComponents(raw) : null;

  const report = {
    file: path.resolve(inputPath),
    detection,
    structure,
    components,
  };

  const jsonStr = JSON.stringify(report, null, 2);
  if (outputReport) {
    fs.mkdirSync(path.dirname(path.resolve(outputReport)), {recursive: true});
    fs.writeFileSync(path.resolve(outputReport), jsonStr, 'utf8');
    process.stdout.write(`VM analysis report written to ${outputReport}\n`);
  } else {
    process.stdout.write(jsonStr + '\n');
  }
}

module.exports = {
  detectVMProtection,
  analyzeVMStructure,
  extractVMComponents,
};
