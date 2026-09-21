/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * All-in-one JavaScript Deobfuscator (Main Orchestrator)
 *
 * 拆分架构：
 * - ./deobfuscate/utils.js: AST 解析与代码生成及基础工具
 * - ./deobfuscate/unpacker.js: Packer, AAEncode, URLEncode 解包模块
 * - ./deobfuscate/string-decoder.js: 字符串数组沙箱求值解码模块
 * - ./deobfuscate/control-flow.js: while-switch 控制流平坦化还原
 * - ./deobfuscate/ast-optimizer.js: 常量折叠、逻辑化简与死分支剪枝
 */

const fs = require('node:fs');
const path = require('node:path');

const {parseCode, generateCode} = require('./deobfuscate/utils');
const {
  unpack,
  detectPacker,
  unpackPacker,
  detectAAEncode,
  unpackAAEncode,
  detectURLEncode,
  unpackURLEncode,
} = require('./deobfuscate/unpacker');
const {evaluateStringDecoders} = require('./deobfuscate/string-decoder');
const {unflattenControlFlow} = require('./deobfuscate/control-flow');
const {runOptimizationPass} = require('./deobfuscate/ast-optimizer');

function deobfuscate(code, options = {}) {
  const maxPasses = options.maxPasses ?? 5;

  // 1. 解包
  let currentCode = code;
  if (options.unpack !== false) {
    currentCode = unpack(currentCode);
  }

  // 2. 解析 AST
  let ast;
  try {
    ast = parseCode(currentCode);
  } catch (err) {
    return {
      code: currentCode,
      success: false,
      error: `AST Parse error: ${err.message}`,
    };
  }

  // 3. 字符串数组沙箱求值解码
  if (options.stringArray !== false) {
    try {
      evaluateStringDecoders(ast);
    } catch {
      // 沙箱解码失败不中断主流程
    }
  }

  // 4. 控制流平坦化还原
  if (options.unflatten !== false) {
    try {
      unflattenControlFlow(ast);
    } catch {
      // 平坦化还原失败不中断主流程
    }
  }

  // 5. 循环迭代 AST 优化（与其他步骤一致：失败不中断主流程）
  try {
    for (let pass = 0; pass < maxPasses; pass++) {
      const changed = runOptimizationPass(ast);
      if (!changed) break;
    }
  } catch {
    // 优化失败时保留已完成的还原结果
  }

  // 6. 生成还原后的代码（前面的步骤为容错设计会吞掉遍历异常，AST 可能处于
  //    部分变异的中间状态，codegen 抛错时回退到当前已还原的代码文本）。
  let deobfuscatedCode;
  try {
    deobfuscatedCode = generateCode(ast);
  } catch (err) {
    return {
      code: currentCode,
      success: false,
      error: `AST Generate error: ${err.message}`,
    };
  }

  return {
    code: deobfuscatedCode,
    success: true,
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    process.stdout.write('Usage: node deobfuscate.js <input.js> [output.js]\n');
    process.stdout.write('       node deobfuscate.js --unpack <input.js>\n');
    process.exit(args.length === 0 ? 1 : 0);
  }

  let inputArg = null;
  let unpackOnly = false;
  let outputArg = null;

  // 显式校验位置参数，避免把未知 flag（如 --foo）当成文件名。
  const positionals = [];
  for (const arg of args) {
    if (arg === '--unpack') {
      unpackOnly = true;
    } else if (arg.startsWith('-')) {
      process.stderr.write(`Error: unknown option: ${arg}\n`);
      process.exit(1);
    } else {
      positionals.push(arg);
    }
  }
  [inputArg, outputArg] = positionals;

  if (!inputArg) {
    process.stderr.write('Error: input file required\n');
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  if (!fs.existsSync(inputPath)) {
    process.stderr.write(`Error: File not found: ${inputPath}\n`);
    process.exit(1);
  }

  const sourceCode = fs.readFileSync(inputPath, 'utf8');

  if (unpackOnly) {
    const unpacked = unpack(sourceCode);
    if (outputArg) {
      const outputPath = path.resolve(outputArg);
      fs.mkdirSync(path.dirname(outputPath), {recursive: true});
      fs.writeFileSync(outputPath, unpacked, 'utf8');
      process.stdout.write(`Unpacked output written to: ${outputPath}\n`);
    } else {
      process.stdout.write(unpacked + '\n');
    }
    process.exit(0);
  }

  const result = deobfuscate(sourceCode);

  if (!result.success) {
    process.stderr.write(`${result.error}\n`);
    process.exit(1);
  }

  if (outputArg) {
    const outputPath = path.resolve(outputArg);
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, result.code, 'utf8');
    process.stdout.write(`Deobfuscation complete: ${outputPath}\n`);
  } else {
    process.stdout.write(result.code + '\n');
  }
}

module.exports = {
  deobfuscate,
  unpack,
  detectPacker,
  unpackPacker,
  detectAAEncode,
  unpackAAEncode,
  detectURLEncode,
  unpackURLEncode,
};
