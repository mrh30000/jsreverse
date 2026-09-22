#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * JSFuck 纯算与符号表达式递归反混淆脚本
 * 蒸馏自 v_jstools 核心 AST 算法：
 * 递归遍历由 []()!+ 构造的 UnaryExpression、BinaryExpression、MemberExpression，
 * 在受控上下文中安全求值并折叠为基础字面量。
 *
 * 用法:
 *   node deobfuscate-jsfuck.js <input.js> [output.js]
 */

const fs = require('fs');
const path = require('path');
function loadPackage(pkg) {
  try {
    return require(pkg);
  } catch (_) {
    try {
      return require(path.join('C:/Users/Administrator/node_modules', pkg));
    } catch (err) {
      throw new Error(`无法加载依赖 ${pkg}，请确保已安装 @babel 依赖包`);
    }
  }
}

const parser = loadPackage('@babel/parser');
const traverse = loadPackage('@babel/traverse').default || loadPackage('@babel/traverse');
const generator = loadPackage('@babel/generator').default || loadPackage('@babel/generator');
const t = loadPackage('@babel/types');

function valueToNode(val) {
  if (val === null) return t.nullLiteral();
  if (val === undefined) return t.identifier('undefined');
  if (typeof val === 'number') return t.numericLiteral(val);
  if (typeof val === 'string') return t.stringLiteral(val);
  if (typeof val === 'boolean') return t.booleanLiteral(val);
  return null;
}

function isSafeJsFuckExpr(code) {
  // 只允许基础符号与安全标识符
  return /^[\[\]\(\)\!\+\s\d"']+$/.test(code);
}

function deobfuscateJsFuck(sourceCode) {
  const ast = parser.parse(sourceCode, {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
  });

  let totalReplacements = 0;
  let iteration = 0;
  const MAX_ITERATIONS = 20;

  while (iteration < MAX_ITERATIONS) {
    let replacedInPass = 0;

    function tryFold(path) {
      if (path.isLiteral()) return;
      const exprCode = path.toString();
      if (!isSafeJsFuckExpr(exprCode)) return;

      try {
        const val = Function(`"use strict"; return (${exprCode});`)();
        const newNode = valueToNode(val);
        if (newNode) {
          path.replaceWith(newNode);
          path.skip();
          replacedInPass++;
        }
      } catch (_) {}
    }

    traverse(ast, {
      UnaryExpression: tryFold,
      BinaryExpression: tryFold,
      MemberExpression: tryFold,
    });

    totalReplacements += replacedInPass;
    if (replacedInPass === 0) break;
    iteration++;
  }

  const outputCode = generator(ast, {
    compact: false,
    jsescOption: { minimal: true },
  }).code;

  return { code: outputCode, totalReplacements };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log(`
deobfuscate-jsfuck.js - JSFuck 纯算与深层符号表达式自动折叠

用法:
  node deobfuscate-jsfuck.js <input.js> [output.js]

示例:
  node deobfuscate-jsfuck.js target.js deob_output.js
`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = args[1] ? path.resolve(args[1]) : inputPath.replace(/\.js$/i, '.deob.js');

  if (!fs.existsSync(inputPath)) {
    console.error(`[-] 输入文件不存在: ${inputPath}`);
    process.exit(1);
  }

  console.log(`[*] 读取输入文件: ${inputPath}`);
  const sourceCode = fs.readFileSync(inputPath, 'utf8');

  const { code, totalReplacements } = deobfuscateJsFuck(sourceCode);
  fs.writeFileSync(outputPath, code, 'utf8');

  console.log(`[+] 反混淆完成! 累计折叠 JSFuck 节点: ${totalReplacements}`);
  console.log(`[+] 结果已保存至: ${outputPath}`);
}

if (require.main === module) {
  main();
}

module.exports = { deobfuscateJsFuck };
