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

function detectJSVMP(code) {
  try {
    const ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx'],
      errorRecovery: true,
    });

    let hasSwitch = false;
    let hasInstructionArray = false;
    let hasProgramCounter = false;
    let maxSwitchCases = 0;
    let hasBytecodeArray = false;
    let hasApplyCall = false;
    let hasWhileLoop = false;
    let interpreterLine = 0;

    traverse(ast, {
      SwitchStatement(pathNode) {
        const caseCount = pathNode.node.cases.length;
        if (caseCount > 8) {
          hasSwitch = true;
          if (caseCount > maxSwitchCases) {
            maxSwitchCases = caseCount;
            interpreterLine = pathNode.node.loc
              ? pathNode.node.loc.start.line
              : 0;
          }
        }
      },
      ArrayExpression(pathNode) {
        if (pathNode.node.elements.length > 30) {
          hasInstructionArray = true;
        }
      },
      UpdateExpression(pathNode) {
        if (
          pathNode.node.operator === '++' ||
          pathNode.node.operator === '--'
        ) {
          if (
            t.isIdentifier(pathNode.node.argument) &&
            pathNode.node.argument.name.length <= 4
          ) {
            hasProgramCounter = true;
          }
        }
      },
      CallExpression(pathNode) {
        if (
          t.isIdentifier(pathNode.node.callee, {name: 'parseInt'}) &&
          pathNode.node.arguments.length >= 2
        ) {
          hasBytecodeArray = true;
        }
        if (
          t.isMemberExpression(pathNode.node.callee) &&
          t.isIdentifier(pathNode.node.callee.property, {name: 'apply'})
        ) {
          hasApplyCall = true;
        }
      },
      WhileStatement(pathNode) {
        if (
          t.isBooleanLiteral(pathNode.node.test, {value: true}) ||
          t.isNumericLiteral(pathNode.node.test, {value: 1})
        ) {
          hasWhileLoop = true;
        }
      },
      ForStatement(pathNode) {
        if (!pathNode.node.test) {
          hasWhileLoop = true;
        }
      },
    });

    const isJSVMP =
      hasSwitch &&
      (hasInstructionArray || hasProgramCounter || hasBytecodeArray) &&
      (hasApplyCall || hasWhileLoop || maxSwitchCases >= 20);

    if (isJSVMP) {
      let complexity = 'low';
      if (maxSwitchCases > 100) {
        complexity = 'high';
      } else if (maxSwitchCases > 40) {
        complexity = 'medium';
      }

      return {
        isJSVMP: true,
        instructionCount: maxSwitchCases,
        interpreterLine,
        complexity,
        hasSwitch,
        hasInstructionArray,
        hasProgramCounter,
        hasBytecodeArray,
        hasApplyCall,
        hasWhileLoop,
      };
    }

    return null;
  } catch (err) {
    // 区分「解析失败」与「未检测到」：调用方不应把无法解析的样本
    // 当成确定性的否定结论。
    return {parseError: err.message};
  }
}

function identifyVMType(code, features) {
  const hasStack =
    /stack\.(?:push|pop)/i.test(code) || /\[\s*--\s*\w+\s*\]/i.test(code);
  const hasRegisters = /reg(?:isters)?\[/i.test(code) || /env\[/i.test(code);

  if (hasStack && hasRegisters) return 'hybrid-vm';
  if (hasStack) return 'stack-based-vm';
  if (hasRegisters) return 'register-based-vm';
  if (features && features.hasBytecodeArray) return 'bytecode-interpreter-vm';
  return 'custom-state-vm';
}

function extractInstructions(code) {
  const instructions = [];

  try {
    const ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx'],
      errorRecovery: true,
    });

    traverse(ast, {
      SwitchStatement(pathNode) {
        if (pathNode.node.cases.length < 8) return;

        for (const switchCase of pathNode.node.cases) {
          let opcode = null;
          if (t.isNumericLiteral(switchCase.test))
            opcode = switchCase.test.value;
          else if (t.isStringLiteral(switchCase.test))
            opcode = switchCase.test.value;

          const caseBody = switchCase.consequent
            .map(stmt => generator(stmt, {compact: true}).code)
            .join(';');

          let category = 'other';
          if (/push|pop/i.test(caseBody)) category = 'stack';
          else if (/[+\-*/%&|^]/.test(caseBody)) category = 'arithmetic';
          else if (/apply|call/i.test(caseBody)) category = 'call';
          else if (/===|!==|[<>]=?/.test(caseBody)) category = 'comparison';

          instructions.push({
            opcode,
            category,
            snippet: caseBody.slice(0, 150),
          });
        }
      },
    });
  } catch {
    // ignore
  }

  return instructions;
}

function analyzeJSVMP(code) {
  const features = detectJSVMP(code);
  if (!features) {
    return {
      isJSVMP: false,
      message: 'No JSVMP characteristics detected.',
    };
  }
  if (features.parseError) {
    return {
      isJSVMP: false,
      parseError: features.parseError,
      message: `Parse failed: ${features.parseError}`,
    };
  }

  const vmType = identifyVMType(code, features);
  const instructions = extractInstructions(code);

  return {
    isJSVMP: true,
    vmType,
    features,
    instructionCount: instructions.length,
    instructions: instructions.slice(0, 50),
  };
}

if (require.main === module) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath) {
    process.stderr.write(
      'Usage: node deobfuscate-jsvmp.js <input.js> [output.json]\n',
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
  const result = analyzeJSVMP(raw);
  const jsonStr = JSON.stringify(result, null, 2);

  if (outputPath) {
    fs.mkdirSync(path.dirname(path.resolve(outputPath)), {recursive: true});
    fs.writeFileSync(path.resolve(outputPath), jsonStr, 'utf8');
    process.stdout.write(`JSVMP analysis written to ${outputPath}\n`);
  } else {
    process.stdout.write(jsonStr + '\n');
  }
}

module.exports = {
  detectJSVMP,
  identifyVMType,
  extractInstructions,
  analyzeJSVMP,
};
