#!/usr/bin/env node
/**
 * jsvmp-instrument.js — JSVMP 三层插桩器（函数调用层 / 运算符层 / 赋值层）
 *
 * 依据 references/jsvmp-dynamic-instrumentation.md：
 *   - 三层插桩顺序不可乱（call/apply → 运算符 → 赋值）
 *   - 插桩只读不调用：所有包装都「求值一次」，绝不二次调用被插桩函数
 *   - 逻辑/一元/自增一律「只记结果」，不捕获操作数（避免短路语义被破坏、
 *     typeof 未声明标识符抛 ReferenceError、delete 触发 getter）
 *   - 必须做语义等价性验证：实跑对拍 + 节点数只增不减 + 重复插桩守卫
 *
 * 用法：
 *   node jsvmp-instrument.js <input.js> <output.js> [--tier call,op,assign] [--stats]
 *   node jsvmp-instrument.js --selftest
 *
 * 依赖：@babel/parser @babel/traverse @babel/generator @babel/types
 *   （本技能脚本不带 node_modules，离线校验用：
 *    node -r artifacts/skill-evolution/tools/node-resolve-preload.js <本脚本> ...）
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MARKER = '__VMP_INSTRUMENTED__';
const REC = '__vmpRec';
const LOG = '__vmpLog';

/** 可以安全捕获操作数的二元运算符（求值两次仍是纯值运算）。
 *  逻辑运算符 && || ?? 被排除：捕获操作数会破坏短路语义。 */
const SAFE_BINARY = new Set([
  '+', '-', '*', '/', '%', '**',
  '==', '!=', '===', '!==', '<', '<=', '>', '>=',
  '<<', '>>', '>>>', '|', '^', '&',
  'in', 'instanceof',
]);

const PRELUDE = [
  ';(function () {',
  '  var g = typeof globalThis !== "undefined" ? globalThis : this;',
  '  if (!g) return;',
  `  g.${MARKER} = true;`,
  `  if (!g.${LOG}) g.${LOG} = [];`,
  '  if (typeof g.__vmpMaxLog !== "number") g.__vmpMaxLog = 200000;',
  `  if (!g.${REC}) {`,
  `    g.${REC} = function (rec) { if (g.${LOG}.length < g.__vmpMaxLog) g.${LOG}.push(rec); };`,
  '  }',
  '})();',
].join('\n');

function loadBabel() {
  try {
    const parser = require('@babel/parser');
    const traverseMod = require('@babel/traverse');
    const genMod = require('@babel/generator');
    const t = require('@babel/types');
    return {
      parse: parser.parse,
      traverse: traverseMod.default || traverseMod,
      generate: genMod.default || genMod,
      t,
    };
  } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND') {
      const msg = [
        '找不到 @babel/* 依赖 —— 本技能脚本不自带 node_modules，依赖要靠调用方目录解析。',
        '',
        '请用本仓库的预加载注入解析路径（-r 后必须写 ./ 或绝对路径）：',
        '  node -r ./artifacts/skill-evolution/tools/node-resolve-preload.js \\',
        '    .claude/skills/ast-deobfuscation/scripts/jsvmp-instrument.js <in.js> <out.js>',
        '',
        '原始错误：' + e.message,
      ].join('\n');
      const err = new Error(msg);
      err.code = 'BABEL_MISSING';
      throw err;
    }
    throw e;
  }
}

function countNodes(node, seen) {
  if (!node || typeof node !== 'object') return 0;
  if (Array.isArray(node)) {
    let n = 0;
    for (const c of node) n += countNodes(c, seen);
    return n;
  }
  if (typeof node.type !== 'string') return 0;
  let n = 1;
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
    n += countNodes(node[key], seen);
  }
  return n;
}

/** 判断某个节点是否已经处在插桩包装内部（避免嵌套包装导致日志爆炸） */
function insideWrapper(path) {
  let p = path.parentPath;
  while (p) {
    if (p.node && p.node.__vmpWrapper) return true;
    if (typeof p.isStatement === 'function' && p.isStatement()) return false;
    p = p.parentPath;
  }
  return false;
}

/** 已套了几层包装（限制嵌套深度，避免 a+b+c+d 这类链式表达式日志爆炸） */
const MAX_WRAPPER_DEPTH = 3;
function wrapperDepth(path) {
  let n = 0;
  let p = path.parentPath;
  while (p) {
    if (p.node && p.node.__vmpWrapper) n++;
    if (typeof p.isStatement === 'function' && p.isStatement()) break;
    p = p.parentPath;
  }
  return n;
}

function makeResultOnly(t, tag, extraNodes, exprNode) {
  const v = t.identifier('_$v');
  const rec = t.callExpression(t.identifier(REC), [
    t.arrayExpression([t.stringLiteral(tag)].concat(extraNodes).concat([t.cloneNode(v)])),
  ]);
  const body = t.sequenceExpression([rec, t.cloneNode(v)]);
  const arrow = t.arrowFunctionExpression([t.cloneNode(v)], body);
  const call = t.callExpression(arrow, [exprNode]);
  call.__vmpWrapper = true;
  return call;
}

function makeBinary(t, op, leftNode, rightNode) {
  const l = t.identifier('_$l');
  const r = t.identifier('_$r');
  const computed = t.binaryExpression(op, t.cloneNode(l), t.cloneNode(r));
  const rec = t.callExpression(t.identifier(REC), [
    t.arrayExpression([
      t.stringLiteral('BIN'),
      t.stringLiteral(op),
      t.cloneNode(l),
      t.cloneNode(r),
      t.cloneNode(computed),
    ]),
  ]);
  const body = t.sequenceExpression([rec, computed]);
  const arrow = t.arrowFunctionExpression([t.cloneNode(l), t.cloneNode(r)], body);
  const call = t.callExpression(arrow, [leftNode, rightNode]);
  call.__vmpWrapper = true;
  return call;
}

/** 取被调用函数/属性的名字（只用于日志，不参与求值） */
function nameOf(node, t) {
  if (!node) return 'anonymous';
  if (t.isIdentifier(node)) return node.name;
  if (t.isMemberExpression(node)) {
    const obj = node.object && node.object.name ? node.object.name : '?';
    if (t.isIdentifier(node.property)) return obj + '.' + node.property.name;
    if (t.isStringLiteral(node.property)) return obj + '.' + node.property.value;
    return obj + '[...]';
  }
  return 'anonymous';
}

function instrument(code, opts) {
  const { parse, traverse, generate, t } = loadBabel();
  const tiers = opts.tiers;
  const stats = { call: 0, op: 0, assign: 0 };

  if (code.indexOf(MARKER) !== -1) {
    throw new Error(
      '输入看起来已经插过桩（含 ' + MARKER + '）。请用未插桩的原始文件，或先移除插桩。',
    );
  }

  const ast = parse(code, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    errorRecovery: true,
  });
  const nodesBefore = countNodes(ast.program);

  // 全部走 exit：由内向外包，内层记录会嵌套在外层记录里（信息更全）。
  // 若改成 enter，赋值/声明层会 p.skip() 掉整棵子树，把运算符层直接吞掉
  // （本脚本的 --selftest 就是靠这一条抓出了最初的实现缺陷）。
  traverse(ast, {
    // ---------- 第一层：函数调用（call / apply） ----------
    CallExpression: {
      exit(p) {
        if (!tiers.call) return;
        if (p.node.__vmpWrapper) return;
        if (insideWrapper(p)) return;
        if (wrapperDepth(p) >= MAX_WRAPPER_DEPTH) return;
        const callee = p.node.callee;
        if (!t.isMemberExpression(callee)) return;
        let prop = null;
        if (t.isIdentifier(callee.property) && !callee.computed) prop = callee.property.name;
        else if (t.isStringLiteral(callee.property)) prop = callee.property.value;
        if (prop !== 'call' && prop !== 'apply') return;

        const argNodes = p.node.arguments;
        if (argNodes.length < 1) return;

        const target = callee.object;
        const thisArg = argNodes[0];
        const restArgs = argNodes.slice(1);

        let call = null;
        if (prop === 'apply') {
          const fn = t.identifier('_$fn'), th = t.identifier('_$th'), ar = t.identifier('_$ar');
          const invoke = t.callExpression(
            t.memberExpression(t.cloneNode(fn), t.identifier('apply')),
            [t.cloneNode(th), t.cloneNode(ar)],
          );
          const rec = t.callExpression(t.identifier(REC), [
            t.arrayExpression([
              t.stringLiteral('CALL'), t.stringLiteral('apply'),
              t.stringLiteral(nameOf(target, t)),
              t.cloneNode(th), t.cloneNode(ar),
            ]),
          ]);
          const body = t.sequenceExpression([rec, invoke]);
          const arrow = t.arrowFunctionExpression(
            [t.cloneNode(fn), t.cloneNode(th), t.cloneNode(ar)], body,
          );
          call = t.callExpression(arrow, [target, thisArg, restArgs[0] || t.identifier('undefined')]);
        } else {
          const fn = t.identifier('_$fn'), th = t.identifier('_$th');
          const rest = t.restElement(t.identifier('_$ar'));
          const invoke = t.callExpression(
            t.memberExpression(t.cloneNode(fn), t.identifier('call')),
            [t.cloneNode(th)].concat([t.spreadElement(t.identifier('_$ar'))]),
          );
          const rec = t.callExpression(t.identifier(REC), [
            t.arrayExpression([
              t.stringLiteral('CALL'), t.stringLiteral('call'),
              t.stringLiteral(nameOf(target, t)),
              t.cloneNode(th), t.cloneNode(t.identifier('_$ar')),
            ]),
          ]);
          const body = t.sequenceExpression([rec, invoke]);
          const arrow = t.arrowFunctionExpression([t.cloneNode(fn), t.cloneNode(th), rest], body);
          call = t.callExpression(arrow, [target, thisArg].concat(restArgs));
        }
        call.__vmpWrapper = true;
        p.replaceWith(call);
        p.skip();
        stats.call++;
      },
    },

    // ---------- 第二层：运算符 ----------
    BinaryExpression: {
      exit(p) {
        if (!tiers.op) return;
        if (p.node.__vmpWrapper) return;
        if (insideWrapper(p)) return;
        if (wrapperDepth(p) >= MAX_WRAPPER_DEPTH) return;
        const op = p.node.operator;
        if (!SAFE_BINARY.has(op)) return;   // 逻辑运算符不走捕获路线
        p.replaceWith(makeBinary(t, op, p.node.left, p.node.right));
        p.skip();
        stats.op++;
      },
    },

    LogicalExpression: {
      exit(p) {
        if (!tiers.op) return;
        if (p.node.__vmpWrapper) return;
        if (insideWrapper(p)) return;
        if (wrapperDepth(p) >= MAX_WRAPPER_DEPTH) return;
        // 只记结果，不捕获操作数：保住短路语义
        p.replaceWith(makeResultOnly(t, 'LOGIC', [t.stringLiteral(p.node.operator)], p.node));
        p.skip();
        stats.op++;
      },
    },

    UnaryExpression: {
      exit(p) {
        if (!tiers.op) return;
        if (p.node.__vmpWrapper) return;
        if (insideWrapper(p)) return;
        if (wrapperDepth(p) >= MAX_WRAPPER_DEPTH) return;
        p.replaceWith(makeResultOnly(t, 'UNARY', [t.stringLiteral(p.node.operator)], p.node));
        p.skip();
        stats.op++;
      },
    },

    UpdateExpression: {
      exit(p) {
        if (!tiers.op) return;
        if (p.node.__vmpWrapper) return;
        if (insideWrapper(p)) return;
        if (wrapperDepth(p) >= MAX_WRAPPER_DEPTH) return;
        p.replaceWith(makeResultOnly(t, 'UPDATE', [t.stringLiteral(p.node.operator)], p.node));
        p.skip();
        stats.op++;
      },
    },

    // ---------- 第三层：赋值 ----------
    AssignmentExpression: {
      exit(p) {
        if (!tiers.assign) return;
        if (p.node.__vmpWrapper) return;
        if (insideWrapper(p)) return;
        if (wrapperDepth(p) >= MAX_WRAPPER_DEPTH) return;
        let lhsName = '';
        const left = p.node.left;
        if (t.isIdentifier(left)) lhsName = left.name;
        else if (t.isMemberExpression(left)) lhsName = nameOf(left, t);
        p.replaceWith(makeResultOnly(t, 'ASSIGN', [
          t.stringLiteral(lhsName), t.stringLiteral(p.node.operator),
        ], p.node));
        p.skip();
        stats.assign++;
      },
    },

    VariableDeclarator: {
      exit(p) {
        if (!tiers.assign) return;
        if (!p.node.init) return;
        if (p.node.__vmpWrapper) return;
        if (insideWrapper(p)) return;
        if (wrapperDepth(p) >= MAX_WRAPPER_DEPTH) return;
        const name = t.isIdentifier(p.node.id) ? p.node.id.name : 'pattern';
        p.node.init = makeResultOnly(t, 'DECL', [t.stringLiteral(name)], p.node.init);
        stats.assign++;
      },
    },
  });

  const nodesAfter = countNodes(ast.program);
  // 注意：PRELUDE 以 ';' 开头，Babel 会把它解析成 EmptyStatement，
  // 所以不能直接取 body[0]，要过滤掉空语句再整体前插。
  const preludeStmts = parse(PRELUDE, { sourceType: 'script' }).program.body
    .filter((s) => s.type !== 'EmptyStatement');
  ast.program.body.unshift.apply(ast.program.body, preludeStmts);
  const out = generate(ast, { comments: true, compact: false, jsescOption: { minimal: true } }).code;
  return { code: out, stats, nodesBefore, nodesAfter };
}

// ---------------------------------------------------------------- selftest

const FIXTURE = [
  'function miniVM(input) {',
  '  var stack = [];',
  '  var regs = [];',
  '  var a = input.length + 3;',
  '  var b = 7;',
  '  regs[0] = a * b;',
  '  regs[1] = (regs[0] ^ 255) % 97;',
  '  stack.push(String.fromCharCode.call(String, 65 + (regs[1] % 26)));',
  '  var out = stack.join("") + "!";',
  '  regs[2] = b > 3 ? 1 : 0;',
  '  out += regs[2];',
  '  var s = 0;',
  '  for (var i = 0; i < 3; i++) { s = s + i; }',
  '  out += s;',
  '  return out;',
  '}',
].join('\n');

function runFixture(source, input) {
  const vm = require('vm');
  const sandbox = { console: { log() {} } };
  vm.createContext(sandbox);
  vm.runInContext(source + '\n;__vmpResult = miniVM(' + JSON.stringify(input) + ');', sandbox, {
    timeout: 10000,
  });
  return { result: sandbox.__vmpResult, log: sandbox[LOG] || [] };
}

function selftest() {
  const assert = require('assert');
  let checks = 0;
  const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

  const tiers = { call: true, op: true, assign: true };

  // 1) 原代码可跑，且给出确定结果
  const base = runFixture(FIXTURE, 'hello');
  ok(base.result === 'F!13', '夹具基线结果应为 F!13，实际 ' + base.result);

  // 2) 插桩
  const r1 = instrument(FIXTURE, { tiers });
  ok(r1.stats.call >= 1, 'call 层至少插到 1 处');
  ok(r1.stats.op >= 3, 'op 层至少插到 3 处，实际 ' + r1.stats.op);
  ok(r1.stats.assign >= 5, 'assign 层至少插到 5 处，实际 ' + r1.stats.assign);

  // 3) 关键守卫：节点数只增不减（B3 静默删代码事故的防线）
  ok(
    r1.nodesAfter > r1.nodesBefore,
    '插桩后节点数必须增加：' + r1.nodesBefore + ' -> ' + r1.nodesAfter,
  );

  // 4) 产物可重新解析
  const { parse } = loadBabel();
  let reparsed = true;
  try { parse(r1.code, { sourceType: 'unambiguous' }); } catch (e) { reparsed = false; }
  ok(reparsed, '插桩产物必须能被 parser 重新解析');

  // 5) 实跑对拍：除日志外结果逐字节一致
  const after = runFixture(r1.code, 'hello');
  ok(after.result === base.result, '插桩前后结果必须一致：' + base.result + ' vs ' + after.result);
  ok(after.log.length > 0, '插桩必须真的产生日志');

  const tags = new Set(after.log.map((r) => r[0]));
  ok(tags.has('CALL'), '日志应含 CALL 记录');
  ok(tags.has('BIN'), '日志应含 BIN 记录');
  ok(tags.has('ASSIGN') || tags.has('DECL'), '日志应含 ASSIGN/DECL 记录');

  // 6) 短路语义必须保住（LOGIC 只记结果，不捕获操作数）
  const shortCircuit = [
    'var hit = 0;',
    'function bump() { hit++; return true; }',
    'var r = false && bump();',
    'r = true || bump();',
    'globalThis.__sc = hit;',
  ].join('\n');
  const scBase = (() => {
    const vm = require('vm');
    const s = {}; vm.createContext(s);
    vm.runInContext(shortCircuit, s); return s.__sc;
  })();
  const scInstr = (() => {
    const vm = require('vm');
    const s = {}; vm.createContext(s);
    const out = instrument(shortCircuit, { tiers }).code;
    vm.runInContext(out, s); return s.__sc;
  })();
  ok(scBase === 0, '基线：短路后 bump 不应被调用');
  ok(scInstr === 0, '插桩后短路语义必须保持不变，实际 hit=' + scInstr);

  // 7) typeof 未声明标识符不得抛错（一元运算只记结果）
  const typeofCase = 'globalThis.__t = typeof __definitely_undeclared_xyz;';
  const tBase = (() => {
    const vm = require('vm'); const s = {}; vm.createContext(s);
    vm.runInContext(typeofCase, s); return s.__t;
  })();
  const tInstr = (() => {
    const vm = require('vm'); const s = {}; vm.createContext(s);
    vm.runInContext(instrument(typeofCase, { tiers }).code, s); return s.__t;
  })();
  ok(tBase === 'undefined', '基线 typeof 未声明标识符应为 undefined');
  ok(tInstr === 'undefined', '插桩后 typeof 未声明标识符仍应为 undefined，实际 ' + tInstr);

  // 8) 确定性：同一输入插两次，产物完全相同
  const r2 = instrument(FIXTURE, { tiers });
  ok(r2.code === r1.code, '插桩必须是确定性变换（同输入同产物）');

  // 9) 重复插桩守卫
  let guarded = false;
  try { instrument(r1.code, { tiers }); } catch (e) { guarded = /已经插过桩/.test(e.message); }
  ok(guarded, '对已插桩产物再次插桩必须被拒绝');

  // 10) 分层开关生效
  const onlyCall = instrument(FIXTURE, { tiers: { call: true, op: false, assign: false } });
  ok(onlyCall.stats.op === 0 && onlyCall.stats.assign === 0 && onlyCall.stats.call >= 1,
    '--tier call 只应插 call 层');
  const onlyOp = instrument(FIXTURE, { tiers: { call: false, op: true, assign: false } });
  ok(onlyOp.stats.call === 0 && onlyOp.stats.assign === 0 && onlyOp.stats.op >= 3,
    '--tier op 只应插运算符层');

  console.log('jsvmp-instrument --selftest: ' + checks + ' 项断言全部通过');
  console.log('  call=' + r1.stats.call + ' op=' + r1.stats.op + ' assign=' + r1.stats.assign
    + ' | nodes ' + r1.nodesBefore + ' -> ' + r1.nodesAfter);
}

// ---------------------------------------------------------------- cli

function main(argv) {
  const args = argv.slice(2);
  if (args.indexOf('--selftest') !== -1) {
    try {
      selftest();
      return 0;
    } catch (e) {
      // 依赖缺失给可读报错；断言失败保留堆栈便于定位
      if (e && e.code === 'BABEL_MISSING') {
        console.error(e.message);
        return 3;
      }
      console.error(e && e.message ? e.message : String(e));
      if (e && e.stack) console.error(e.stack.split('\n').slice(0, 6).join('\n'));
      return 1;
    }
  }

  const positional = args.filter((a) => a.indexOf('--') !== -1 ? false : true);
  const tierIdx = args.indexOf('--tier');
  const stats = args.indexOf('--stats') !== -1;

  if (positional.length < 2) {
    console.error('用法: node jsvmp-instrument.js <input.js> <output.js> [--tier call,op,assign] [--stats]');
    console.error('      node jsvmp-instrument.js --selftest');
    return 2;
  }
  const [inPath, outPath] = positional;

  let tiers = { call: true, op: true, assign: true };
  if (tierIdx !== -1) {
    const raw = (args[tierIdx + 1] || '').split(',').map((s) => s.trim()).filter(Boolean);
    tiers = { call: raw.indexOf('call') !== -1, op: raw.indexOf('op') !== -1, assign: raw.indexOf('assign') !== -1 };
    if (!tiers.call && !tiers.op && !tiers.assign) {
      console.error('--tier 至少要选一个：call / op / assign');
      return 2;
    }
  }

  const abs = path.resolve(inPath);
  if (!fs.existsSync(abs)) {
    console.error('输入文件不存在: ' + abs);
    return 1;
  }
  const code = fs.readFileSync(abs, 'utf8');

  let res;
  try {
    res = instrument(code, { tiers });
  } catch (e) {
    console.error('插桩失败: ' + e.message);
    return 3;
  }

  // 硬门禁：节点数只增不减
  if (res.nodesAfter <= res.nodesBefore) {
    console.error('拒绝写出：节点数未增加（' + res.nodesBefore + ' -> ' + res.nodesAfter
      + '），疑似有代码被静默删除。');
    return 4;
  }

  const absOut = path.resolve(outPath);
  const outDir = path.dirname(absOut);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(absOut, res.code, 'utf8');
  if (stats) {
    console.log('插桩完成 -> ' + absOut);
    console.log('  call=' + res.stats.call + ' op=' + res.stats.op + ' assign=' + res.stats.assign);
    console.log('  nodes ' + res.nodesBefore + ' -> ' + res.nodesAfter);
    console.log('  运行后在控制台执行: JSON.stringify(__vmpLog).length  查看日志条数');
  }
  return 0;
}

module.exports = { instrument, PRELUDE, MARKER, LOG, REC };

if (require.main === module) {
  process.exit(main(process.argv));
}
