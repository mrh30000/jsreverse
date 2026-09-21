#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

// ESM 原生导入（兼容 CommonJS 子目录隔离且零 require 调用）
(async () => {
  const {readFile} = await import('node:fs/promises');
  const path = (await import('node:path')).default;
  const {parseArgs} = await import('node:util');
  const parser = await import('@babel/parser');
  const traverseImport = await import('@babel/traverse');
  const traverse =
    traverseImport.default?.default || traverseImport.default || traverseImport;
  const t = await import('@babel/types');

  const BINARY_ARITHMETIC_OPS = new Set([
    '+',
    '-',
    '*',
    '/',
    '%',
    '**',
    '^',
    '&',
    '|',
    '<<',
    '>>',
    '>>>',
  ]);

  function printHelp() {
    console.log(`
analyze-jsvmp-vm.js - 纯静态解剖 JSVMP 虚拟机骨架 (分派器结构、字节码来源、指令表与 Opcode 映射)

用法:
  node analyze-jsvmp-vm.js --input <file.js> [选项]

选项:
  -i, --input <path>      待分析的混淆 JavaScript 源码文件路径
  -c, --code <string>     待分析的 JavaScript 代码字符串（可与 --input 二选一）
      --json              以 JSON 格式输出完整分析数据
  -h, --help              显示帮助信息

示例:
  node analyze-jsvmp-vm.js --input ./obfuscated.js
  node analyze-jsvmp-vm.js --input ./vmp.js --json
`);
  }

  function nodeLine(node) {
    return node?.loc?.start?.line;
  }

  function classifySwitchCase(caseNode) {
    let hasArithmetic = false;
    let hasControl = false;
    let hasCall = false;
    let hasAssignment = false;

    for (const stmt of caseNode.consequent) {
      if (
        t.isIfStatement(stmt) ||
        t.isBreakStatement(stmt) ||
        t.isContinueStatement(stmt) ||
        t.isReturnStatement(stmt)
      ) {
        hasControl = true;
      }
      if (t.isExpressionStatement(stmt)) {
        const expr = stmt.expression;
        if (t.isCallExpression(expr)) hasCall = true;
        if (t.isAssignmentExpression(expr)) hasAssignment = true;
        if (
          t.isBinaryExpression(expr) &&
          BINARY_ARITHMETIC_OPS.has(expr.operator)
        ) {
          hasArithmetic = true;
        }
      }
    }

    if (hasArithmetic) return 'arithmetic';
    if (hasControl) return 'control';
    if (hasCall) return 'call';
    if (hasAssignment) return 'store';
    return 'load';
  }

  function extractOpcodeLabel(test, index) {
    if (t.isNumericLiteral(test)) return test.value;
    if (t.isStringLiteral(test)) return test.value;
    return index;
  }

  function findDispatcher(ast) {
    let whileTrueCount = 0;
    let switchCount = 0;
    let maxSwitchCases = 0;
    let dispatchExpression;
    let dispatcherLine;
    const switchCases = [];

    traverse(ast, {
      WhileStatement(p) {
        const test = p.node.test;
        if (
          (t.isBooleanLiteral(test) && test.value === true) ||
          (t.isNumericLiteral(test) && test.value === 1)
        ) {
          whileTrueCount += 1;
        }
      },
      SwitchStatement(p) {
        const count = p.node.cases.length;
        if (count > 3) {
          switchCount += 1;
          if (count > maxSwitchCases) {
            maxSwitchCases = count;
            switchCases.length = 0;
            switchCases.push(...p.node.cases);
          }
        }
      },
      CallExpression(p) {
        const callee = p.node.callee;
        if (
          !t.isMemberExpression(callee) ||
          !t.isMemberExpression(callee.property)
        ) {
          return;
        }
        const inner = callee.property;
        if (
          t.isUpdateExpression(inner.property, {operator: '++'}) ||
          t.isUpdateExpression(inner.property, {operator: '--'})
        ) {
          if (!dispatchExpression) {
            dispatchExpression = '[callee with index update]';
            dispatcherLine = nodeLine(p.node);
          }
          return;
        }
        if (
          t.isBinaryExpression(inner.property) &&
          inner.property.operator === '+'
        ) {
          if (!dispatchExpression) {
            dispatchExpression = '[callee with index + offset]';
            dispatcherLine = nodeLine(p.node);
          }
        }
      },
    });

    let kind;
    if (dispatchExpression && whileTrueCount > 0) {
      kind = 'while-switch';
    } else if (dispatchExpression) {
      kind = 'index-dispatch';
    } else if (switchCount > 0) {
      kind = 'switch-only';
    } else {
      return {switchCases};
    }

    return {
      switchCases,
      dispatcher: {
        kind,
        switchCount,
        maxSwitchCases,
        whileTrueCount,
        dispatchExpression,
        dispatcherLine,
      },
    };
  }

  function findBytecode(ast) {
    let bestCandidate;

    traverse(ast, {
      ArrayExpression(p) {
        const elts = p.node.elements;
        if (elts.length < 15) return;

        const numCount = elts.filter(e => t.isNumericLiteral(e)).length;
        if (numCount / elts.length > 0.7) {
          if (!bestCandidate || elts.length > (bestCandidate.length || 0)) {
            bestCandidate = {
              kind: 'array-literal',
              length: elts.length,
              encrypted: false,
              line: nodeLine(p.node),
            };
          }
        }
      },
      CallExpression(p) {
        if (
          t.isFunctionExpression(p.node.callee) ||
          t.isArrowFunctionExpression(p.node.callee)
        ) {
          const body = p.node.callee.body;
          const stmts = t.isBlockStatement(body) ? body.body : [];
          if (stmts.length > 3) {
            const returnsArray = stmts.some(
              s =>
                t.isReturnStatement(s) &&
                t.isArrayExpression(s.argument) &&
                s.argument.elements.length > 20,
            );
            if (returnsArray) {
              bestCandidate = {
                kind: 'iife',
                encrypted: true,
                line: nodeLine(p.node),
              };
            }
          }
        }
      },
    });

    return bestCandidate || {kind: 'none', encrypted: false};
  }

  function findInstructionTable(ast) {
    let best;

    traverse(ast, {
      ArrayExpression(p) {
        const elts = p.node.elements;
        if (elts.length < 8) return;

        let holes = 0;
        let funcCount = 0;

        for (const e of elts) {
          if (e === null) {
            holes += 1;
          } else if (
            t.isFunctionExpression(e) ||
            t.isArrowFunctionExpression(e)
          ) {
            funcCount += 1;
          }
        }

        if (funcCount >= 5) {
          if (!best || elts.length > best.length) {
            best = {
              kind: 'array-literal',
              length: elts.length,
              holes,
              line: nodeLine(p.node),
            };
          }
        }
      },
    });

    return best || {kind: 'none', length: 0, holes: 0};
  }

  function analyzeVmCode(code) {
    const ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'asyncGenerators', 'classProperties'],
      errorRecovery: true,
    });

    const {dispatcher, switchCases} = findDispatcher(ast);
    const bytecode = findBytecode(ast);
    const instructionTable = findInstructionTable(ast);

    const opcodes = switchCases.map((c, i) => ({
      id: extractOpcodeLabel(c.test, i),
      type: classifySwitchCase(c),
      line: nodeLine(c),
    }));

    let score = 0;
    if (dispatcher) {
      if (dispatcher.kind === 'while-switch') score += 45;
      else if (dispatcher.kind === 'index-dispatch') score += 35;
      else score += 20;
      if (dispatcher.maxSwitchCases > 20) score += 20;
      else if (dispatcher.maxSwitchCases > 8) score += 10;
    }
    if (bytecode.kind !== 'none') score += 20;
    if (instructionTable.kind !== 'none') score += 15;

    const confidence = Math.min(Number((score / 100).toFixed(2)), 1);
    const isJsvmp = score >= 40;

    const nextSteps = [];
    if (!isJsvmp) {
      nextSteps.push(
        '未检测到显著的 JSVMP 虚拟机特征，建议尝试 ast-deobfuscation 常规去混淆',
      );
    } else {
      if (bytecode.encrypted) {
        nextSteps.push(
          '字节码来源于 IIFE 解密函数，建议运行 deobfuscate-jsvmp.js 做动态还原',
        );
      } else if (bytecode.kind === 'array-literal') {
        nextSteps.push(
          `检测到明文 Opcode 字节码数组 (长度 ~${bytecode.length})，可尝试静态反汇编提取控制流`,
        );
      }
      if (dispatcher?.kind === 'while-switch') {
        nextSteps.push(
          `分派器为经典 while-switch 架构 (拥有 ${dispatcher.maxSwitchCases} 个 case)，可针对分派循环入口进行插桩追踪`,
        );
      }
    }

    return {
      isJsvmp,
      confidence,
      dispatcher,
      bytecode,
      instructionTable,
      opcodeCount: opcodes.length,
      opcodes: opcodes.slice(0, 50),
      nextSteps,
    };
  }

  let parsed;
  try {
    parsed = parseArgs({
      options: {
        input: {type: 'string', short: 'i'},
        code: {type: 'string', short: 'c'},
        json: {type: 'boolean', default: false},
        help: {type: 'boolean', short: 'h', default: false},
      },
      allowPositionals: true,
    });
  } catch (err) {
    console.error(`参数解析错误: ${err.message}`);
    process.exit(1);
  }

  const {values, positionals} = parsed;
  if (values.help) {
    printHelp();
    process.exit(0);
  }

  let code = values.code;
  const inputPath = values.input || positionals[0];

  if (inputPath) {
    try {
      code = await readFile(path.resolve(inputPath), 'utf-8');
    } catch (err) {
      console.error(`读取输入文件失败: ${err.message}`);
      process.exit(1);
    }
  }

  if (!code || code.trim().length === 0) {
    console.error(
      '错误: 请提供待分析的 JS 源码 (--input <file> 或 --code "...")',
    );
    printHelp();
    process.exit(1);
  }

  const isJson = Boolean(values.json);

  try {
    const analysis = analyzeVmCode(code);

    if (isJson) {
      console.log(JSON.stringify({success: true, data: analysis}, null, 2));
    } else {
      console.log('🤖 JSVMP 虚拟机骨架静态分析报告');
      console.log(
        '============================================================',
      );
      console.log(
        `   判定为 JSVMP: ${analysis.isJsvmp ? '✅ 是' : '❌ 否'} (置信度: ${(analysis.confidence * 100).toFixed(0)}%)`,
      );

      if (analysis.dispatcher) {
        console.log(`\n🎛️  分派器架构 (Dispatcher):`);
        console.log(`   类型: ${analysis.dispatcher.kind}`);
        console.log(
          `   最大分支数 (Switch Cases): ${analysis.dispatcher.maxSwitchCases}`,
        );
        console.log(
          `   while(true) 循环计数: ${analysis.dispatcher.whileTrueCount}`,
        );
        if (analysis.dispatcher.dispatcherLine) {
          console.log(
            `   分派器所在行: 第 ${analysis.dispatcher.dispatcherLine} 行`,
          );
        }
      }

      console.log(`\n📦 字节码来源 (Bytecode):`);
      console.log(`   形式: ${analysis.bytecode.kind}`);
      if (analysis.bytecode.length)
        console.log(`   预估长度: ${analysis.bytecode.length} 元素`);
      console.log(
        `   是否加密/动态生成: ${analysis.bytecode.encrypted ? '是' : '否'}`,
      );

      if (analysis.instructionTable.kind !== 'none') {
        console.log(`\n📑 指令函数表 (Instruction Table):`);
        console.log(
          `   长度: ${analysis.instructionTable.length} | 空洞 (Holes): ${analysis.instructionTable.holes}`,
        );
      }

      console.log(
        `\n🎯 识别到的 Opcode 分支: 共 ${analysis.opcodeCount} 个 (展示前 ${analysis.opcodes.length} 项):`,
      );
      analysis.opcodes.slice(0, 15).forEach(op => {
        console.log(
          `   - Op [${op.id}]: 类型 [${op.type.padEnd(10, ' ')}] (行: ${op.line || '未知'})`,
        );
      });

      console.log('\n💡 后续逆向建议 (Next Steps):');
      analysis.nextSteps.forEach(s => console.log(`   👉 ${s}`));
    }
  } catch (error) {
    if (isJson) {
      console.log(
        JSON.stringify({success: false, error: error.message}, null, 2),
      );
    } else {
      console.error(`❌ 分析失败: ${error.message}`);
    }
    process.exit(1);
  }
})();
