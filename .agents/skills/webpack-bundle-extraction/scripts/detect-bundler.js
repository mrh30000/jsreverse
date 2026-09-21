#!/usr/bin/env node
'use strict';

/**
 * detect-bundler.js —— 打包器家族识别 + 加载器/模块表定位（零依赖，不执行输入代码）
 *
 * 为什么单独做一个「先判族」的脚本：
 *   打包产物的三种抠取姿态（手抠 / 运行时半自动 / AST 自动）与五种集成形式
 *   （自执行 IIFE / webpackJsonp / webpackChunk / runtime 与 chunk 分离 / browserify）
 *   **对应的操作完全不同**。判错族的代价是「按 A 形态去找加载器，结果永远找不到」，
 *   而且**不报错**——它只会让你以为这个文件没有加载器。
 *
 * 用法：
 *   node detect-bundler.js <bundle.js> [--json] [--pretty]
 *   node detect-bundler.js --selftest
 *
 * 退出码：0 识别成功；2 无法识别为打包产物（会明确说明）；1 用法/IO 错误。
 */

const fs = require('fs');
const path = require('path');
const scan = require('./lib/bundle-scan.js');

function readFileOrDie(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    process.stderr.write(`无法读取 ${p}：${e.message}\n`);
    process.exit(1);
  }
}

/**
 * 核心识别。返回
 *   { family, confidence, evidence[], loader, tables[], registrations[], chunks[], signals[], strings[] }
 * family ∈ webpack5-push | webpack4-jsonp | webpack-inline-iife | webpack-runtime-only |
 *          browserify | esm-bundler | unknown
 */
function detect(raw, filePath) {
  const masked = scan.maskLiterals(raw);
  const functions = scan.findFunctions(masked);
  const loaders = scan.findLoaders(masked, functions);
  const tables = scan.findModuleTables(raw, masked);
  const registrations = scan.findRegistrations(raw, masked);
  const signals = scan.familySignals(masked);

  const chunks = [];
  for (const pt of registrations) for (const c of pt.chunkIds) if (!chunks.includes(c)) chunks.push(c);
  for (const m of masked.matchAll(/\.\s*e\s*\(\s*["']([^"']+)["']\s*\)/g)) if (!chunks.includes(m[1])) chunks.push(m[1]);

  // 「字符串里提到了哪些打包器全局名」——只用于报告，不参与判定
  const strings = [];
  for (const m of raw.matchAll(/["']([^"'\n]{0,60})["']/g)) {
    const s = m[1];
    if (/\b(webpack|webpackChunk|webpackJsonp|__webpack_require__|browserify)\b/.test(s)) strings.push(s);
  }

  const evidence = [];
  let family = 'unknown';
  let confidence = 0;

  const biggest = tables[0] || null;

  if (registrations.length && signals.webpackChunk) {
    family = 'webpack5-push';
    confidence = 0.95;
    evidence.push(`模块注册 ×${registrations.length}（形态 ${registrations.map((r) => r.kind).join('/')}），接收者表达式 ${registrations.map((r) => r.calleeExpr).join(' / ')}`);
    if (signals.selfName) evidence.push('self["webpackChunk…"] 形态');
  } else if (registrations.length && signals.webpackJsonp) {
    family = 'webpack4-jsonp';
    confidence = 0.95;
    evidence.push(`webpackJsonp 注册 ×${registrations.length}（形态 ${registrations.map((r) => r.kind).join('/')}）`);
  } else if (loaders.length && biggest) {
    family = 'webpack-inline-iife';
    confidence = 0.85;
    evidence.push(`自执行 IIFE：加载器 ${loaders[0].name || '(匿名)'} + 模块表 ${biggest.count} 项`);
  } else if (loaders.length && !biggest) {
    family = 'webpack-runtime-only';
    confidence = 0.7;
    evidence.push('找到加载器但没有模块表 ⇒ 本文件大概率是 runtime.js，模块表在别的 chunk 里');
  } else if (signals.browserify) {
    family = 'browserify';
    confidence = 0.8;
    evidence.push('命中 browserify 特征（`[function(require,module,exports)` 或 `typeof require=="function"&&require`）');
  } else if (signals.esm) {
    family = 'esm-bundler';
    confidence = 0.6;
    evidence.push('出现 ESM 的 import/export ⇒ rollup/vite/esbuild 直出，通常没有模块加载器');
  }

  if (family !== 'unknown') {
    if (signals.reqDevNames) { confidence = Math.min(0.99, confidence + 0.04); evidence.push('存在未压缩的 __webpack_* 符号（开发模式产物）'); }
    if (signals.asyncChunk) { evidence.push('存在异步 chunk 加载（`.e("name")`）⇒ 缺失模块可能在别的 chunk'); }
  }

  // 模块表的「可信度」需要第二条证据：**加载器**或**模块注册语句**。
  // 只有一张「键: 函数」的表时，它更可能是二次混淆的**字符串表 / 字典**——
  // 实测：某 runtime（顶象 `dx-captcha-index.js`）里被识别出的 110 项「模块表」，
  // 键是 `+t5M` / `/8Uj` / `0` 这种，其实是字符串解码字典，不是模块表。
  // 不加这道判据的后果是：调用方拿到一份**看着很完整、其实全错**的模块 id 列表。
  const tableCorroborated = loaders.length > 0 || registrations.length > 0;

  return {
    file: filePath,
    family,
    confidence,
    evidence,
    tableCorroborated,
    loader: loaders[0] ? {
      name: loaders[0].name,
      param: loaders[0].param,
      cacheIdent: loaders[0].cacheIdent,
      modulesIdent: loaders[0].modulesIdent,
      bodyStart: loaders[0].fn.bodyStart,
      bodyEnd: loaders[0].fn.bodyEnd,
      line: lineOf(raw, loaders[0].fn.bodyStart),
      evidence: loaders[0].evidence,
    } : null,
    loaderCandidates: loaders.length,
    tables: tables.map((t) => ({
      count: t.count,
      line: lineOf(raw, t.start),
      ids: t.entries.map((e) => e.key),
      forms: [...new Set(t.entries.map((e) => e.form))],
    })),
    registrations: registrations.map((r) => ({ kind: r.kind, calleeExpr: r.calleeExpr, chunkIds: r.chunkIds, line: lineOf(raw, r.start) })),
    chunks,
    signals,
    stringMentions: [...new Set(strings)].slice(0, 10),
  };
}

function lineOf(raw, pos) {
  let line = 1;
  for (let i = 0; i < pos && i < raw.length; i++) if (raw[i] === '\n') line++;
  return line;
}

function render(r) {
  const L = [];
  L.push(`文件：${r.file}`);
  L.push(`家族：${r.family}（置信度 ${r.confidence.toFixed(2)}）`);
  L.push(`证据：`);
  for (const e of r.evidence) L.push(`  - ${e}`);
  if (r.loader) {
    L.push(`加载器：${r.loader.name || '(匿名)'}(${r.loader.param})  第 ${r.loader.line} 行`);
    L.push(`  缓存表标识符 = ${r.loader.cacheIdent || '(未识别)'}`);
    L.push(`  模块表标识符 = ${r.loader.modulesIdent || '(未识别)'}`);
    L.push(`  判据：${r.loader.evidence.join('、')}`);
    L.push(`  候选加载器个数 = ${r.loaderCandidates}`);
  } else {
    L.push(`加载器：未找到（候选 ${r.loaderCandidates} 个）`);
  }
  if (r.tables.length) {
    if (!r.tableCorroborated) {
      L.push('模块表：⚠ 找到一张「键: 函数」的表，但**既没有加载器、也没有模块注册语句** ⇒ 不采信。');
      L.push(`  它更可能是二次混淆的字符串表 / 字典（样本：${r.tables[0].ids.slice(0, 6).join(', ')} …）。`);
      L.push('  ⇒ 先用 ast-deobfuscation 还原字符串表，再回来重跑本脚本。');
    } else {
      r.tables.forEach((t, i) => {
        L.push(`模块表 #${i + 1}：${t.count} 项（第 ${t.line} 行，形态 ${t.forms.join('/')}）`);
        L.push(`  ids = ${t.ids.slice(0, 40).join(', ')}${t.ids.length > 40 ? ` …（共 ${t.ids.length}）` : ''}`);
      });
    }
  } else {
    L.push('模块表：未找到');
  }
  if (r.registrations.length) {
    for (const g of r.registrations) {
      const form = g.kind === 'push'
        ? `${g.calleeExpr}.push([[${g.chunkIds.join(',')}], {…}])`
        : `${g.calleeExpr}([${g.chunkIds.join(',')}], {…})`;
      L.push(`模块注册（${g.kind}）：${form}  第 ${g.line} 行`);
    }
  }
  if (r.chunks.length) L.push(`chunk 名：${r.chunks.join(', ')}`);
  L.push(`信号：${Object.entries(r.signals).filter(([, v]) => v).map(([k]) => k).join(', ') || '(无)'}`);
  if (r.stringMentions.length) L.push(`字符串里提到的打包器名：${r.stringMentions.join(' | ')}`);
  if (r.family === 'unknown') {
    L.push('');
    L.push('⇒ 无法识别为打包产物。先确认：① 是否抓错了文件（runtime 与 chunk 分离时，');
    L.push('   目标模块可能在另一个 chunk）；② 是否被二次混淆（先走 ast-deobfuscation 还原字符串表再回来）。');
  } else if (r.family === 'webpack-runtime-only') {
    L.push('');
    L.push('⇒ 这是 runtime：请对「含目标模块的 chunk」再跑一次本脚本，两边的输出一起交给 harvest-bundle.js。');
  }
  return L.join('\n');
}

// ------------------------------------------------------------------ selftest

function selftest() {
  let pass = 0;
  const fails = [];
  const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg); };

  // 夹具 1：webpack 1-3 风格自执行 IIFE（对象模块表 + 经典加载器）
  const wpLegacy = [
    '!function(t){',
    '  var i={};',
    '  function e(s){',
    '    if(i[s]) return i[s].exports;',
    '    var n=i[s]={exports:{},id:s,loaded:!1};',
    '    return t[s].call(n.exports,n,n.exports,e), n.loaded=!0, n.exports;',
    '  }',
    '  globalThis.__e=e;',
    '}({',
    '  10:function(t,e,n){',
    '    var o=n(20);',
    '    e.exports={add:function(a){return o.dbl(a)+1;}};',
    '  },',
    '  20:function(t,e,n){ e.exports={dbl:function(a){return a*2;}}; },',
    '  99:function(t,e,n){ e.exports={unused:function(){return "no";}}; }',
    '});',
    '',
  ].join('\n');

  const r1 = detect(wpLegacy, '<fixture-wp-legacy>');
  ok(r1.family === 'webpack-inline-iife', `夹具1 家族应为 webpack-inline-iife，实为 ${r1.family}`);
  ok(!!r1.loader && r1.loader.name === 'e', `夹具1 加载器应为 e，实为 ${r1.loader && r1.loader.name}`);
  ok(r1.loader && r1.loader.param === 's', `夹具1 加载器形参应为 s，实为 ${r1.loader && r1.loader.param}`);
  ok(r1.loader && r1.loader.cacheIdent === 'i', `夹具1 缓存表应为 i，实为 ${r1.loader && r1.loader.cacheIdent}`);
  ok(r1.loader && r1.loader.modulesIdent === 't', `夹具1 模块表应为 t，实为 ${r1.loader && r1.loader.modulesIdent}`);
  ok(r1.tables.length === 1 && r1.tables[0].count === 3, `夹具1 模块表应 1 张 3 项，实为 ${r1.tables.length}/${r1.tables[0] && r1.tables[0].count}`);
  ok(!!r1.tables[0] && r1.tables[0].ids.join(',') === '10,20,99', `夹具1 模块 id 应为 10,20,99，实为 ${r1.tables[0] ? r1.tables[0].ids.join(',') : '(无模块表)'}`);

  // 夹具 2：webpack 5 push 形态（chunk 注册 + 短名加载器）
  const wp5 = [
    '(self.webpackChunkapp = self.webpackChunkapp || []).push([["src_foo_js"],{',
    '  245:(e,n,o)=>{ let t=o(633); e.exports={hex:(s)=>t.MD5(s).toString(t.enc.Hex)}; },',
    '  633:(e,n,o)=>{ e.exports={MD5:(s)=>s,enc:{Hex:"hex"}}; },',
    '  808:(e,n,o)=>{ let t=o(245); e.exports={wrap:(s)=>t.hex(s)}; }',
    '},[[245]]]);',
    '',
  ].join('\n');
  const r2 = detect(wp5, '<fixture-wp5>');
  ok(r2.family === 'webpack5-push', `夹具2 家族应为 webpack5-push，实为 ${r2.family}`);
  ok(r2.registrations.length === 1, `夹具2 模块注册应 1 处，实为 ${r2.registrations.length}`);
  ok(r2.registrations[0] && r2.registrations[0].kind === 'push', `夹具2 注册形态应为 push，实为 ${r2.registrations[0] && r2.registrations[0].kind}`);
  ok(r2.registrations[0] && r2.registrations[0].chunkIds.join(',') === 'src_foo_js', `夹具2 chunk 名应为 src_foo_js，实为 ${r2.registrations[0] && r2.registrations[0].chunkIds.join(',')}`);
  ok(r2.tables.length >= 1 && r2.tables[0].count === 3, `夹具2 模块表应 3 项，实为 ${r2.tables[0] && r2.tables[0].count}`);
  ok(!!r2.tables[0] && r2.tables[0].forms.includes('arrow'), '夹具2 应识别出箭头函数模块');

  // 夹具 3：webpack 4 jsonp
  const wp4 = [
    '(window.webpackJsonp = window.webpackJsonp || []).push([[242],{',
    '  2368: function(t, e, n) { n(42), n(43); t.exports = { go: function () { return 1; } }; },',
    '  42: function(t, e, n) { t.exports = 42; },',
    '  43: function(t, e, n) { t.exports = 43; }',
    '}]);',
    '',
  ].join('\n');
  const r3 = detect(wp4, '<fixture-wp4>');
  ok(r3.family === 'webpack4-jsonp', `夹具3 家族应为 webpack4-jsonp，实为 ${r3.family}`);

  // 夹具 4：browserify
  const br = [
    '(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;',
    'if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module \'"+o+"\'")}',
    'var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n||e)},f,f.exports,e,t,n,r)}',
    'return n[o].exports}for(var i=typeof require=="function"&&require,o=0;o<r.length;o++)s(r[o]);return s})',
    '({1:[function(require,module,exports){module.exports=1},{}]},{},[1]);',
    '',
  ].join('\n');
  const r4 = detect(br, '<fixture-browserify>');
  ok(r4.family === 'browserify', `夹具4 家族应为 browserify，实为 ${r4.family}`);

  // 反向断言 1：普通业务 JS 不得被识别成任何打包器
  const plain = [
    "'use strict';",
    '// 这是一个普通脚本，注释里提到 webpack 与 __webpack_require__ 也不算数',
    'const s = "webpackJsonp __webpack_require__ webpackChunk";',
    'function add(a, b) { return a + b; }',
    'const mul = (a, b) => a * b;',
    'module.exports = { add, mul, s };',
    '',
  ].join('\n');
  const r5 = detect(plain, '<fixture-plain>');
  ok(r5.family === 'unknown', `反向断言1 普通脚本应 unknown，实为 ${r5.family}`);
  ok(r5.loader === null, '反向断言1 普通脚本不得识别出加载器');

  // 反向断言 2：注释里的 `}` 不得破坏括号配对（掩码串有效性）
  const braceInComment = 'function f(a){\n  /* } { ) ( */\n  return a + 1;\n}\n';
  const masked2 = scan.maskLiterals(braceInComment);
  const fns2 = scan.findFunctions(masked2);
  ok(fns2.length === 1 && braceInComment.slice(fns2[0].bodyEnd, fns2[0].bodyEnd + 1) === '}', '反向断言2 注释中的括号不应破坏配对');

  // 反向断言 3：正则字面量里的括号与引号不得破坏掩码
  const reSrc = "const r = /[)}\\]]/g;\nfunction g(x){ return r.test(x); }\n";
  const masked3 = scan.maskLiterals(reSrc);
  ok(scan.findFunctions(masked3).length === 1, '反向断言3 正则字面量不应破坏函数扫描');

  // 反向断言 4：字符串里的 `key: function` 不得被当成模块表条目
  const fakeTable = 'var o = { a: 1, b: "x: function(){}" };\nfunction h(){ return o; }\n';
  ok(scan.findModuleTables(fakeTable, scan.maskLiterals(fakeTable)).length === 0, '反向断言4 字符串里的 key:function 不应计入模块表');

  // 反向断言 5：webpack-runtime-only（有加载器、无模块表）
  const runtimeOnly = [
    'var t={},e={};',
    'function n(r){ if(t[r]) return t[r].exports; var o=t[r]={i:r,l:!1,exports:{}};',
    ' return e[r].call(o.exports,o,o.exports,n), o.l=!0, o.exports; }',
    'globalThis.__exposedWebpackRequire=n;',
    '',
  ].join('\n');
  const r6 = detect(runtimeOnly, '<fixture-runtime-only>');
  ok(r6.family === 'webpack-runtime-only', `反向断言5 应为 webpack-runtime-only，实为 ${r6.family}`);

  // 夹具 5：**真实形态**（取自仓内样本 `project/dingxiang/sources/basic-captcha-js.js.orig` 的结构）：
  // webpack 4 把 JSONP 数组替换成函数后的「直接调用注册」，且全局名带后缀 `webpackJsonpdxCaptcha`。
  // 两种写法都会让「只认 .push(...) + 只认裸 webpackJsonp」的实现整个失配。
  const jsonpCall = [
    '/*! captcha.js v1.4.0 prod private_main */',
    'webpackJsonpdxCaptcha(["basic-captcha-js"],{',
    '  "+OK6":function(t,e){t.exports={noop:function(){return 1;}};},',
    '  "09s5":function(t,e,r){var i=r("+OK6");t.exports={go:function(){return i.noop();}};}',
    '});',
    '',
  ].join('\n');
  const r7 = detect(jsonpCall, '<fixture-jsonp-call>');
  ok(r7.family === 'webpack4-jsonp', `夹具5 家族应为 webpack4-jsonp，实为 ${r7.family}`);
  ok(r7.registrations.length === 1 && !!r7.registrations[0] && r7.registrations[0].kind === 'call',
    `夹具5 注册形态应为 call，实为 ${r7.registrations[0] && r7.registrations[0].kind}`);
  ok(!!r7.registrations[0] && r7.registrations[0].chunkIds.join(',') === 'basic-captcha-js',
    `夹具5 chunk 名应为 basic-captcha-js，实为 ${r7.registrations[0].chunkIds.join(',')}`);
  ok(!!r7.registrations[0] && r7.registrations[0].calleeExpr === 'webpackJsonpdxCaptcha',
    `夹具5 接收者应为带后缀的全局名，实为 ${r7.registrations[0].calleeExpr}`);
  ok(!!r7.tables[0] && r7.tables[0].ids.join(',') === '+OK6,09s5', `夹具5 模块 id 应为 +OK6,09s5，实为 ${r7.tables[0] ? r7.tables[0].ids.join(',') : '(无模块表)'}`);
  ok(r7.tableCorroborated === true, '夹具5 模块表应被佐证');

  // 反向断言 6：**字符串表不是模块表**。
  // 没有加载器、也没有注册语句时，一张「键: 函数」的表不得被当成模块表采信
  // （真实反例：某 runtime 里 110 项字符串解码字典会被误判成模块表）。
  const stringTable = [
    'var dict = {',
    '  "+t5M": function (a) { return a + 1; },',
    '  "/8Uj": function (a) { return a * 2; },',
    '  "1Hmm": function (a, b) { return a + b; }',
    '};',
    'module.exports = dict;',
    '',
  ].join('\n');
  const r8 = detect(stringTable, '<fixture-string-table>');
  ok(r8.tableCorroborated === false, '反向断言6 字符串表不得被佐证为模块表');
  ok(r8.family === 'unknown', `反向断言6 家族应为 unknown，实为 ${r8.family}`);

  if (fails.length) {
    process.stdout.write(`FAIL ${fails.length} 项\n` + fails.map((f) => '  - ' + f).join('\n') + `\n通过 ${pass} 项\n`);
    return 1;
  }
  process.stdout.write(`OK 全部 ${pass} 项断言通过（5 组正向夹具 + 6 条反向断言）\n`);
  return 0;
}

// ------------------------------------------------------------------ CLI

function main(argv) {
  if (argv.includes('--selftest')) return selftest();
  const args = argv.filter((a) => !a.startsWith('--'));
  if (!args.length) {
    process.stderr.write('用法：node detect-bundler.js <bundle.js> [--json]\n       node detect-bundler.js --selftest\n');
    return 1;
  }
  const file = args[0];
  if (!fs.existsSync(file)) { process.stderr.write(`文件不存在：${file}\n`); return 1; }
  const r = detect(readFileOrDie(file), file);
  if (argv.includes('--json')) process.stdout.write(JSON.stringify(r, null, 2) + '\n');
  else process.stdout.write(render(r) + '\n');
  return r.family === 'unknown' ? 2 : 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { detect, render, selftest };
