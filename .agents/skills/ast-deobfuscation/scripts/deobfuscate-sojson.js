#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sojson 混淆 (v4/v5/v6) 专项反混淆与反调试清理脚本
 * 蒸馏自 v_jstools 核心 AST 算法：
 * 1. 抽取并沙箱求值大数组、移位 IIFE 与解密函数
 * 2. 批量内联所有解密函数调用点
 * 3. 剔除 Sojson 注入的格式化检测死循环与定时器 debugger
 *
 * 用法:
 *   node deobfuscate-sojson.js <input.js> [output.js]
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

function deobfuscateSojson(sourceCode, options = {}) {
  const ast = parser.parse(sourceCode, {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
  });

  // 如果最外层是被单一 IIFE 包裹，解包到内部语句
  if (
    ast.program.body.length === 1 &&
    t.isExpressionStatement(ast.program.body[0]) &&
    t.isCallExpression(ast.program.body[0].expression) &&
    t.isFunctionExpression(ast.program.body[0].expression.callee)
  ) {
    ast.program.body = ast.program.body[0].expression.callee.body.body;
  }

  // 1. 定位头部解密三件套（大数组、洗牌自执行函数、解密函数声明）
  let firstIdx = 0;
  for (let i = 0; i < ast.program.body.length; i++) {
    if (!t.isEmptyStatement(ast.program.body[i])) {
      firstIdx = i;
      break;
    }
  }

  const decryptStatements = ast.program.body.slice(firstIdx, firstIdx + 3);
  let decryptFuncName = options.decFuncName || '';

  // 寻找解密函数名
  if (!decryptFuncName && decryptStatements[2]) {
    if (t.isVariableDeclaration(decryptStatements[2])) {
      decryptFuncName = decryptStatements[2].declarations[0]?.id?.name || '';
    } else if (t.isFunctionDeclaration(decryptStatements[2])) {
      decryptFuncName = decryptStatements[2].id?.name || '';
    }
  }

  let totalDecoded = 0;

  if (decryptStatements.length >= 3 && decryptFuncName) {
    const decryptCode = generator(t.program(decryptStatements), { compact: true }).code;

    // 在安全隔离沙箱中执行三件套以初始化解密函数
    const sandbox = {
      window: {},
      document: {},
      navigator: { userAgent: 'Mozilla/5.0' },
      location: { href: 'http://localhost/' },
      console: { log() {}, warn() {}, error() {} },
    };
    sandbox.window = sandbox;
    sandbox.global = sandbox;

    let decryptFn = null;
    try {
      const context = vm.createContext(sandbox);
      vm.runInContext(decryptCode, context);
      decryptFn = context[decryptFuncName];
    } catch (e) {
      console.warn(`[-] 解密函数沙箱执行失败: ${e.message}`);
    }

    if (typeof decryptFn === 'function') {
      console.log(`[+] 成功提取并初始化 Sojson 解密函数: ${decryptFuncName}`);

      // 剩余实际代码块
      ast.program.body = ast.program.body.slice(firstIdx + 3);

      // 2. 批量遍历调用点并内联字面量
      traverse(ast, {
        CallExpression(callPath) {
          const callee = callPath.node.callee;
          if (t.isIdentifier(callee, { name: decryptFuncName })) {
            try {
              const callCode = generator(callPath.node).code;
              // 在沙箱环境中执行该单次调用
              const decodedVal = vm.runInContext(callCode, vm.createContext(sandbox));
              if (typeof decodedVal === 'string') {
                callPath.replaceWith(t.stringLiteral(decodedVal));
                totalDecoded++;
              } else if (typeof decodedVal === 'number') {
                callPath.replaceWith(t.numericLiteral(decodedVal));
                totalDecoded++;
              } else if (typeof decodedVal === 'boolean') {
                callPath.replaceWith(t.booleanLiteral(decodedVal));
                totalDecoded++;
              }
            } catch (_) {}
          }
        },
      });
      console.log(`[+] 成功内联 Sojson 解密字符串: ${totalDecoded} 处`);
    }
  }

  // 3. 剔除 Sojson 注入的额外反调试与自毁守卫 (del_sojson_extra)
  let removedExtra = 0;
  traverse(ast, {
    CallExpression(callPath) {
      // 检查 setInterval 或 setTimeout 中注入的 debugger
      const callee = callPath.node.callee;
      if (t.isIdentifier(callee, { name: 'setInterval' }) || t.isIdentifier(callee, { name: 'setTimeout' })) {
        const firstArg = callPath.node.arguments[0];
        if (firstArg) {
          const argCode = generator(firstArg).code;
          if (argCode.includes('debugger') || argCode.includes('action') || argCode.includes('stateObject')) {
            const stmtParent = callPath.getStatementParent();
            if (stmtParent) {
              stmtParent.remove();
              removedExtra++;
            }
          }
        }
      }
    },
    FunctionDeclaration(funcPath) {
      // 检查防格式化检测函数：包含 toString 比对或正则检测
      const funcCode = generator(funcPath.node).code;
      if (
        (funcCode.includes('\\w+ *\\(\\) *{\\w+ *') && funcCode.includes('toString')) ||
        (funcCode.includes('debugger') && funcCode.includes('action') && funcCode.includes('stateObject'))
      ) {
        funcPath.remove();
        removedExtra++;
      }
    },
  });

  if (removedExtra > 0) {
    console.log(`[+] 成功剔除 Sojson 防调试/自毁防护节点: ${removedExtra} 处`);
  }

  // 4. 清理冗余属性与十六进制转义
  traverse(ast, {
    StringLiteral(p) {
      delete p.node.extra;
    },
    NumericLiteral(p) {
      delete p.node.extra;
    },
  });

  const outputCode = generator(ast, {
    compact: false,
    jsescOption: { minimal: true },
  }).code;

  return { code: outputCode, totalDecoded, removedExtra };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log(`
deobfuscate-sojson.js - Sojson v4/v5/v6 混淆专项还原与反调试移除

用法:
  node deobfuscate-sojson.js <input.js> [output.js]

示例:
  node deobfuscate-sojson.js obfuscated.js clean.js
`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = args[1] ? path.resolve(args[1]) : inputPath.replace(/\.js$/i, '.sojson_deob.js');

  if (!fs.existsSync(inputPath)) {
    console.error(`[-] 输入文件不存在: ${inputPath}`);
    process.exit(1);
  }

  console.log(`[*] 读取输入文件: ${inputPath}`);
  const sourceCode = fs.readFileSync(inputPath, 'utf8');

  const { code, totalDecoded, removedExtra } = deobfuscateSojson(sourceCode);
  fs.writeFileSync(outputPath, code, 'utf8');

  console.log(`[+] Sojson 反混淆完成 (解密字面量: ${totalDecoded}, 移除防护: ${removedExtra})`);
  console.log(`[+] 结果已保存至: ${outputPath}`);
}

if (require.main === module) {
  main();
}

module.exports = { deobfuscateSojson };
