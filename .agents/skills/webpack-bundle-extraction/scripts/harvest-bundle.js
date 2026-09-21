#!/usr/bin/env node
'use strict';

/**
 * harvest-bundle.js —— 从打包产物里「抠出目标模块」并在 node 里复用（零依赖，不执行输入代码）
 *
 * 六个子命令，对应文章里三套打法：
 *   手抠        → `loader-export` + `closure` + `emit`
 *   运行时半自动 → `breakpoint`（本脚本生成「贴到 DevTools 就能用」的断点表达式）
 *   AST 自动     → `closure` + `emit`（静态闭包，替代 webpack_mixer 那类工具）
 *
 * 用法：
 *   node harvest-bundle.js loader-export <bundle.js> -o <out.js> [--record] [--as <expr>] [--runtime <file>]
 *   node harvest-bundle.js breakpoint    <bundle.js> [--runtime <file>]
 *   node harvest-bundle.js closure       <bundle.js> --entry <id|id2|...> [--runtime <file>] [--any-call]
 *   node harvest-bundle.js emit          <bundle.js> --entry <id> -o <out-one-bundle.js> [--runtime <file>] [--dir <outdir>]
 *   node harvest-bundle.js wrap          --harvest <harvest.json|js> -o <one_bundle.js> [--template <bundle.js>]
 *   node harvest-bundle.js --selftest
 *
 * 退出码：0 成功；2 输入不满足前置（会说明缺什么）；1 用法/IO 错误。
 */

const fs = require('fs');
const path = require('path');
const scan = require('./lib/bundle-scan.js');

function die(msg) { process.stderr.write(msg + '\n'); process.exit(1); }
function pre(msg) { process.stderr.write(msg + '\n'); process.exit(2); }

function read(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { die(`无法读取 ${p}：${e.message}`); }
}

function parseOpts(argv, valueFlags) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    // 单横线与双横线都要认：`-o` 与 `--out` 等价。
    // （只判 `--` 会让 `-o out.js` 把 `-o` 当成位置参数，报出「缺少 -o」这种自相矛盾的错。）
    if (/^-{1,2}[A-Za-z]/.test(a)) {
      const name = a.replace(/^-{1,2}/, '');
      if (valueFlags.includes(name)) { opts[name] = argv[++i]; }
      else opts[name] = true;
    } else opts._.push(a);
  }
  return opts;
}

const VALUE_FLAGS = ['o', 'out', 'entry', 'runtime', 'as', 'dir', 'harvest', 'template', 'loader'];
// `force` 是布尔开关：跳过「模块表未被佐证」的拦截（只在确认真是打包产物时用）。

// ---------------------------------------------------------------- 结构装配

/**
 * 拆一个 push 注册的三个部分（供 emit / wrap 复用）。
 *
 * 踩过的坑：`.push([[...],{...},[[...]]])` 里最外层 `[...]` 是**整个 payload**，
 * 用 `indexOf('[', pushDot)` + `matchPair` 拿到的是这个外层数组的下标范围，
 * 直接拿去当「chunk 名数组」会把旧模块表整段一起塞回产物——
 * 于是产物体积不减、无关模块照样在里面，而**运行还是正常的**（容易被当成成功）。
 */
/**
 * 按原始注册形态重建语句（chunk 名与入口 id 列表原样保留）。
 *
 * 两种形态必须分别重建，混用会让产物**静默失效**：
 *   push：`.push([["chunk"],{…},[[入口]]])`        ← 载荷是一个数组
 *   call：`webpackJsonpdxCaptcha(["chunk"],{…})`   ← 载荷是多个实参
 * 早期实现只认 push，还把「最外层数组」当成 chunk 名数组去切片，
 * 结果把旧模块表整段又塞回产物：**体积不减、无关模块照样在里面，而运行还是正常的**。
 */
function rebuildRegistration(reg, tableText) {
  const tail = reg.tailText ? `,${reg.tailText}` : '';
  if (reg.kind === 'push') {
    return `${reg.calleeExpr}.push([${reg.idsText},${tableText}${tail}]);\n`;
  }
  return `${reg.calleeExpr}(${reg.idsText},${tableText}${tail});\n`;
}

/** 从一个文件里找「加载器 + 模块表」。找不到就返回原因，不抛异常。 */
function analyze(file) {
  const raw = read(file);
  const masked = scan.maskLiterals(raw);
  const functions = scan.findFunctions(masked);
  const loaders = scan.findLoaders(masked, functions);
  const tables = scan.findModuleTables(raw, masked);
  const registrations = scan.findRegistrations(raw, masked);
  return { file, raw, masked, functions, loaders, tables, registrations };
}

/** 推断加载器的可用名字：具名直接用；匿名则回看 `x = function(...)` 的赋值目标。 */
function inferLoaderName(raw, masked, fn) {
  if (fn.name) return fn.name;
  let i = fn.headerStart - 1;
  while (i >= 0 && /\s/.test(raw[i])) i--;
  if (i < 0 || raw[i] !== '=') return '';
  i--;
  while (i >= 0 && /\s/.test(raw[i])) i--;
  let end = i + 1;
  while (i >= 0 && /[A-Za-z0-9_$]/.test(raw[i])) i--;
  const name = raw.slice(i + 1, end);
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : '';
}

/** 收集一个文件里所有「模块表条目」，带来源标记（inline 表 / push 注册）。 */
function collectTables(a) {
  const out = [];
  for (const t of a.tables) out.push({ table: t, source: 'inline' });
  for (const g of a.registrations) {
    if (g.moduleTable) out.push({ table: g.moduleTable, source: g.kind === 'push' ? 'push' : 'call', push: g });
  }
  out.sort((x, y) => y.table.count - x.table.count);
  return out;
}

/** 从若干候选里挑主模块表：条目数优先。 */
function pickTable(a, preferPush) {
  const all = collectTables(a);
  if (!all.length) return null;
  if (preferPush) {
    const p = all.find((x) => x.source === 'push' || x.source === 'call');
    if (p) return p;
  }
  return all[0];
}

/**
 * 「这张模块表能不能信」的第二条证据：**加载器**或**模块注册语句**至少有一个。
 *
 * 只有一张「键: 函数」的表时，它更可能是二次混淆的字符串表 / 字典。
 * 不拦住的后果是：闭包算得头头是道、产物生成成功，但 id 与源码**整张都是错的**，
 * 而且不会报任何错（这是本技能反复强调的「静默失败」家族里的一个）。
 */
function assertTableCorroborated(a, sel, opts) {
  if (opts.force) return;
  // 判据与 detect-bundler.js 的 tableCorroborated 同源，但**按表**判定（更严）：
  // detect 只问「本文件有没有第二条证据」，这里还要问「那条证据是不是就指向这张表」。
  // 二者不一致时以这里为准（detect 是分流提示，这里是执行前闸门）。
  const corroborated = a.loaders.length > 0
    || a.registrations.some((g) => g.table.start === sel.table.start);
  if (corroborated) return;
  pre('这张模块表**未被佐证**：既没找到加载器，也没有指向它的模块注册语句。\n'
    + '  ⇒ 它更可能是二次混淆的字符串表 / 字典，用它算出来的闭包会「看着很完整、其实全错」。\n'
    + '  ⇒ 先跑 detect-bundler.js 确认；真是打包产物时用 `--force` 跳过本检查。\n'
    + '  ⇒ 被二次混淆的产物：先按 ast-deobfuscation 还原字符串表，再回来。');
}

/** 模块源码切片（`"id": function(...){...}` 整段）。 */
function entrySlice(a, e) { return a.raw.slice(e.keyStart, e.valueEnd + 1); }

/** 造出「只含指定条目」的模块表文本。 */
function subsetTable(a, table, ids) {
  const keep = table.entries.filter((e) => ids.includes(e.key));
  const missing = ids.filter((id) => !table.entries.some((e) => e.key === id));
  return {
    text: `{\n${keep.map((e) => entrySlice(a, e)).join(',\n')}\n}`,
    kept: keep.map((e) => e.key),
    missing,
  };
}

/** 按偏移从后往前打补丁（避免前一处改动造成后一处偏移失效）。 */
function applyPatches(src, patches) {
  const sorted = [...patches].sort((x, y) => y.at - x.at);
  let out = src;
  for (const p of sorted) {
    if (p.at < 0 || p.at > out.length) continue;
    out = out.slice(0, p.at) + p.text + out.slice(p.remove || p.at);
  }
  return out;
}

/**
 * 生成「全局导出加载器」的补丁。
 * 注入点选在加载器函数体的右括号之后：该处仍在**加载器所在的那个作用域**内，
 * 所以直接引用加载器名字是合法的（不需要把函数改成具名或再包一层）。
 */
function exportPatch(a, loaderName, explicitExpr) {
  const expr = explicitExpr || loaderName;
  if (!expr) return null;
  return {
    at: a.loaders[0].fn.bodyEnd + 1,
    text: `\n;try{globalThis.__exposedWebpackRequire=${expr};}catch(__e){}`,
  };
}

/**
 * 生成「记录模块解析顺序 + 模块源码」的补丁（运行时半自动抠取的自动化替代）。
 * 只读不调用，且**按 id 去重**——去重放在收集器里，而不是靠断点位置的取舍
 * （文章里的数组收集法必须靠「在 call 行打断点」来避免重复；
 *  用 keyed 对象收集时重复无害，这也是为什么这里敢放在函数入口）。
 */
function recordPatch(a, loaderName) {
  const l = a.loaders[0];
  if (!l.modulesIdent) return null;
  const p = l.param;
  const y = l.modulesIdent;
  return {
    at: l.fn.bodyStart + 1,
    text: `\ntry{var __wpG=(globalThis.__wpHarvest=globalThis.__wpHarvest||{seen:{},list:[]});`
      + `var __wpId=${p};if(!__wpG.seen[__wpId]){__wpG.seen[__wpId]=1;`
      + `var __wpSrc=(typeof ${y}!=="undefined"&&${y})?${y}[__wpId]:null;`
      + `__wpG.list.push([__wpId,__wpSrc?String(__wpSrc):null]);}}catch(__e){}`,
  };
}

// ---------------------------------------------------------------- 静态闭包

/**
 * 从入口模块出发，沿加载器调用做广度优先，得到静态可达的模块集合。
 *
 * 两种模式：
 *   strict   —— 已知加载器名（同文件找到加载器，或 `--runtime` 里找到），只认 `loader("id")`；
 *   heuristic—— 加载器在别的文件且没给 `--runtime`：认「任何 `f("id")`，且 id 是模块表里真有的 key」。
 *               这一模式会打印警告，因为同名 id 在极少数站点上会误命中。
 */
function closureOf(a, tableSel, entryIds, opts) {
  const table = tableSel.table;
  const byKey = new Map(table.entries.map((e) => [e.key, e]));
  const loaderName = opts.loaderName || '';
  const anyCall = !!opts.anyCall || !loaderName;
  const seen = new Set();
  const queue = [];
  const missing = new Set();
  const calls = [];
  const modes = new Set();

  for (const id of entryIds) {
    if (!byKey.has(id)) missing.add(id);
    queue.push(id);
  }

  const looseRe = /(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g;

  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    const e = byKey.get(id);
    if (!e) continue;
    const body = a.masked.slice(e.valueStart, e.valueEnd + 1);
    const rawBody = a.raw.slice(e.valueStart, e.valueEnd + 1);

    // 该模块体内 require 的候选名：优先取本模块函数的**第三个形参**，
    // 其次才是加载器自己的函数名。
    const names = new Set();
    const third = (e.params || [])[2];
    if (third && /^[A-Za-z_$][\w$]*$/.test(third)) names.add(third);
    if (loaderName) names.add(loaderName);

    const candidates = [];
    looseRe.lastIndex = 0;
    let m;
    while ((m = looseRe.exec(body)) !== null) {
      const callee = m[1];
      if (!names.has(callee) && !anyCall) continue;
      candidates.push({ lp: m.index + (m[0].length - 1), callee });
    }

    for (const cand of candidates) {
      const rp = scan.matchPair(body, cand.lp);
      if (rp < 0) continue;
      // 实参必须在**掩码串**上定位、在**原文**里读取：
      // 模块 id 是字符串字面量（`r("+OK6")`），掩码串上它的内容已经变成空格，
      // 在那里读会得到一串空格当 id —— 不报错，只是闭包永远为空。
      const innerMasked = body.slice(cand.lp + 1, rp).trim();
      const inner = rawBody.slice(cand.lp + 1, rp).trim();
      if (!innerMasked || innerMasked.includes(',')) continue;          // 多实参 ⇒ 不是模块 id
      if (!/^(?:['"][^'"]*['"]|\d+)$/.test(innerMasked)) continue;
      const dep = inner.replace(/^['"]|['"]$/g, '');
      const known = byKey.has(dep);
      const viaRequire = names.has(cand.callee);
      if (!known) {
        // 只有确认是 require 调用时，才敢把「表里没有的 id」记成缺失模块；
        // 兜底模式下误报会把使用者引到并不存在的地方。
        if (viaRequire) missing.add(dep);
        continue;
      }
      if (!seen.has(dep)) queue.push(dep);
      modes.add(viaRequire ? 'strict' : 'heuristic');
      calls.push({ from: id, to: dep, mode: viaRequire ? 'strict' : 'heuristic' });
    }
  }
  const mode = modes.size === 0 ? (anyCall ? 'heuristic' : 'strict')
    : (modes.has('heuristic') ? (modes.has('strict') ? 'mixed' : 'heuristic') : 'strict');
  return { ids: [...seen], missing: [...missing], calls, mode };
}

// ---------------------------------------------------------------- 子命令

function cmdDetect(file) { return require('./detect-bundler.js').detect(read(file), file); }

function cmdLoaderExport(opts) {
  const file = opts._[0];
  if (!file) die('用法：harvest-bundle.js loader-export <bundle.js> -o <out.js> [--record] [--as <expr>] [--runtime <file>]');
  const a = analyze(file);
  if (!a.loaders.length) {
    const run = opts.runtime ? analyze(opts.runtime) : null;
    if (run && run.loaders.length) return emitRuntimeFrom(run, opts, file);
    pre('本文件里找不到加载器。三种可能：\n'
      + '  ① 这是 chunk，加载器在 runtime 文件里 ⇒ 加 `--runtime <runtime.js>`；\n'
      + '  ② 加载器是箭头函数/被包装过 ⇒ 用 `--as <表达式>` 手工指定导出表达式；\n'
      + '  ③ 不是 webpack（先跑 detect-bundler.js 判族）。');
  }
  const a2 = a;
  const l = a2.loaders[0];
  const name = inferLoaderName(a2.raw, a2.masked, l.fn);
  const patches = [];
  const p1 = exportPatch(a2, name, opts.as);
  if (!p1) pre('加载器是匿名函数且推不出名字，无法自引用 ⇒ 用 `--as <表达式>` 指定从外部能拿到它的写法。');
  patches.push(p1);
  if (opts.record) {
    const p2 = recordPatch(a2, name);
    if (!p2) pre('无法记录模块：加载器里的模块表标识符没识别出来（用 detect-bundler.js --json 看 modulesIdent）。');
    patches.push(p2);
  }

  const out = applyPatches(a2.raw, patches);
  const outPath = opts.o || opts.out;
  if (!outPath) die('缺少 -o <out.js>');
  fs.writeFileSync(outPath, out);
  process.stdout.write(`已写出 ${outPath}\n`);
  process.stdout.write(`  加载器：${name || '(匿名)'}(${l.param})  缓存表 ${l.cacheIdent}  模块表 ${l.modulesIdent}\n`);
  process.stdout.write(`  已注入：globalThis.__exposedWebpackRequire = ${opts.as || name}\n`);
  if (opts.record) process.stdout.write('  已注入：模块记录器 globalThis.__wpHarvest.list（[id, 源码或 null]）\n');
  process.stdout.write('  下一步：\n');
  process.stdout.write(`    node -e "global.self=global;require('./${path.basename(outPath)}');`
    + `console.log(typeof globalThis.__exposedWebpackRequire)"\n`);
  process.stdout.write('    记录器版本记得在调用后打印 `JSON.stringify(globalThis.__wpHarvest.list)`（null 的条目说明该模块在别的 chunk 里，要另抓）。\n');
  return 0;
}

function emitRuntimeFrom(a, opts, chunkFile) {
  const l = a.loaders[0];
  const name = inferLoaderName(a.raw, a.masked, l.fn);
  const patches = [{ at: l.fn.bodyEnd + 1, text: `\n;try{globalThis.__exposedWebpackRequire=${opts.as || name};}catch(__e){}` }];
  const outPath = opts.o || opts.out || 'runtime.js';
  fs.writeFileSync(outPath, applyPatches(a.raw, patches));
  process.stdout.write(`已写出 ${outPath}（runtime，含全局导出）\n`);
  process.stdout.write(`被抠的 chunk：${chunkFile} —— 它不是 runtime，加载器来自 ${opts.runtime}\n`);
  return 0;
}

function cmdBreakpoint(opts) {
  const file = opts._[0];
  if (!file) die('用法：harvest-bundle.js breakpoint <bundle.js> [--runtime <file>]');
  let a = analyze(file);
  if (!a.loaders.length && opts.runtime) a = analyze(opts.runtime);
  if (!a.loaders.length) pre('找不到加载器，无法生成针对该 loader 的断点表达式（判族请先跑 detect-bundler.js）。');
  const l = a.loaders[0];
  const name = inferLoaderName(a.raw, a.masked, l.fn) || '(匿名)';
  const body = a.masked.slice(l.fn.bodyStart, l.fn.bodyEnd + 1);
  const p = l.param;
  const cache = l.cacheIdent || '<缓存表标识符>';
  const mods = l.modulesIdent || '<模块表标识符>';

  const cacheRe = new RegExp(`if\\s*\\(\\s*${cache}\\s*\\[\\s*${p}\\s*\\]`);
  // webpack 5 官方 runtime 里缓存检查是 `var r = i[e]; if (r !== undefined) …`，
  // 断点应该打在这个 `var` 语句上（打 `if` 也行，但 `i[e]` 在原地更好读）。
  const varCacheRe = new RegExp(`var\\s+[A-Za-z_$][\\w$]*\\s*=\\s*${cache}\\s*\\[\\s*${p}\\s*\\]`);
  const callRe = new RegExp(`\\b${mods}\\s*\\[\\s*${p}\\s*\\]\\s*\\.\\s*call\\s*\\(`);
  const at = (re) => {
    const m = re.exec(body);
    if (!m) return -1;
    let line = 1;
    for (let i = 0; i < l.fn.bodyStart + m.index; i++) if (a.raw[i] === '\n') line++;
    return line;
  };
  const cacheLine = (() => {
    const inline = at(cacheRe);
    return inline > 0 ? inline : at(varCacheRe);
  })();
  const callLine = at(callRe);
  const lineText = (ln) => {
    if (ln <= 0) return '';
    const all = a.raw.split('\n');
    return (all[ln - 1] || '').trim().slice(0, 120);
  };

  const L = [];
  L.push('# webpack 运行时半自动抠取 —— 本文件由 harvest-bundle.js 依据真实变量名生成');
  L.push('# 注：表达式里的标识符是从你的样本里读出来的，不是模板；改过样本要重新生成。');
  L.push('');
  L.push(`目标文件：${file}    加载器：${name}(${p})`);
  L.push(`  缓存表 = ${cache}    模块表 = ${mods}`);
  L.push('');
  L.push('## 0. Console 先建收集器（**对象按 id 去重**，所以重复命中无害）');
  L.push('window.__wpModules = window.__wpModules || {};');
  L.push('');
  L.push('## 1. 清空模块缓存（让本次轨迹触发尽可能多的依赖加载）');
  L.push(`${cache} = {};      // ← 断在加载器内部时执行；作用域不对就先确认 ${cache} 是否在闭包里`);
  L.push('');
  L.push(`## 2. 在第 ${cacheLine > 0 ? cacheLine : '?'} 行 上右键 → Add conditional breakpoint：`);
  if (cacheLine > 0) L.push(`    （该行原文：${lineText(cacheLine)}）`);
  L.push(`window.__wpModules[${p}]=${mods}[${p}],false`);
  L.push('    末尾的 `,false` 是逗号表达式：赋值做完但条件为假，断点不停（否则会停下几百次）。');
  L.push('');
  L.push(`## 3. 在第 ${callLine > 0 ? callLine : '?'} 行 上右键 → Add logpoint（可选，用来看加载顺序）：`);
  if (callLine > 0) L.push(`    （该行原文：${lineText(callLine)}）`);
  L.push(`'need ' + ${p}`);
  L.push('');
  L.push('## 4. 跳到目标模块出口断点，然后取回收集结果');
  L.push('copy(JSON.stringify(window.__wpModules))');
  L.push('    ⇒ 存成 harvest.json，交给本脚本的 wrap 子命令直接生成 one_bundle.js。');
  L.push('');
  L.push('## 5. 为什么用「对象收集」而不是文章里的数组拼接');
  L.push('    数组拼接必须在 `.call` 行打断点才不会重复；对象按 id 去重，');
  L.push('    所以能放在缓存检查那一行，**已缓存过的模块也能被收集到**（缺依赖时少跑一轮）。');
  process.stdout.write(L.join('\n') + '\n');
  return cacheLine > 0 && callLine > 0 ? 0 : 2;
}

function cmdClosure(opts) {
  const file = opts._[0];
  if (!file) die('用法：harvest-bundle.js closure <bundle.js> --entry <id[,id]> [--runtime <file>] [--any-call]');
  const a = analyze(file);
  const sel = pickTable(a, true);
  if (!sel) pre('本文件里没有模块表。若这是 runtime，请对含目标模块的 chunk 跑本命令；缺 chunk 就先按 breakpoint 子命令收集。');
  const entries = String(opts.entry || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!entries.length) die('缺少 --entry <模块id>');
  assertTableCorroborated(a, sel, opts);

  let loaderName = a.loaders.length ? inferLoaderName(a.raw, a.masked, a.loaders[0].fn) : '';
  if (!loaderName && opts.runtime) {
    const r = analyze(opts.runtime);
    if (r.loaders.length) loaderName = inferLoaderName(r.raw, r.masked, r.loaders[0].fn);
  }
  if (opts.loader) loaderName = opts.loader;
  const mode = opts['any-call'] ? '' : loaderName;

  const res = closureOf(a, sel, entries, { loaderName: mode });
  process.stdout.write(`模块表来源：${sel.source}  共 ${sel.table.count} 项\n`);
  process.stdout.write(`入口：${entries.join(', ')}\n`);
  process.stdout.write(`闭包模式：${res.mode}${res.mode === 'heuristic' ? '（加载器名未知，按「id 命中模块表」判定；如误命中请加 --runtime 或 --loader）' : ''}\n`);
  process.stdout.write(`可达模块 ${res.ids.length} 个：${res.ids.join(', ')}\n`);
  if (res.missing.length) {
    process.stdout.write(`⚠ 引用了但**本文件里没有**的模块 ${res.missing.length} 个：${res.missing.join(', ')}\n`);
    process.stdout.write('  ⇒ 这些模块在别的 chunk 里：按 breakpoint 子命令收集后一起 wrap，或把这些 chunk 也下载下来。\n');
    return 2;
  }
  process.stdout.write('依赖边：\n');
  for (const c of res.calls) process.stdout.write(`  ${c.from} → ${c.to}\n`);
  process.stdout.write(`\n下一步：node harvest-bundle.js emit ${file} --entry ${entries.join(',')} -o one_bundle.js\n`);
  return 0;
}

function cmdEmit(opts) {
  const file = opts._[0];
  const outPath = opts.o || opts.out;
  if (!file || !outPath) die('用法：harvest-bundle.js emit <bundle.js> --entry <id[,id]> -o <out.js> [--runtime <file>] [--dir <outdir>]');
  const a = analyze(file);
  const sel = pickTable(a, true);
  if (!sel) pre('本文件里没有模块表，无法静态 emit。请先用 breakpoint 子命令做运行时收集，再走 wrap。');
  const entries = String(opts.entry || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!entries.length) die('缺少 --entry <模块id>');
  assertTableCorroborated(a, sel, opts);

  let loaderName = a.loaders.length ? inferLoaderName(a.raw, a.masked, a.loaders[0].fn) : '';
  if (!loaderName && opts.runtime) {
    const r = analyze(opts.runtime);
    if (r.loaders.length) loaderName = inferLoaderName(r.raw, r.masked, r.loaders[0].fn);
  }
  if (opts.loader) loaderName = opts.loader;
  const res = closureOf(a, sel, entries, { loaderName: opts['any-call'] ? '' : loaderName });
  if (res.missing.length) {
    process.stdout.write(`⚠ 静态闭包不完整：缺 ${res.missing.join(', ')}（在别的 chunk 里）。\n`
      + '  已生成的部分可以先跑，报「Cannot read property call of undefined」的那个 id 就是下一个要补的模块。\n');
  }

  const sub = subsetTable(a, sel.table, res.ids);
  const dir = opts.dir || path.dirname(path.resolve(outPath));
  fs.mkdirSync(dir, { recursive: true });

  let mode;
  if (sel.source === 'inline') {
    // 自执行 IIFE：就地替换模块表内容，同时给加载器加全局导出
    // 注意：替换的是**整个对象字面量**（含两侧花括号）。
    // 用 `at: start+1, remove: end` 会把 `{` 与 sub.text 自带的花括号叠成 `{{`，
    // 产物**语法就是错的**（`SyntaxError: Unexpected token '{'`），而不是「算出来不对」。
    const patches = [{ at: sel.table.start, remove: sel.table.end + 1, text: sub.text }];
    const l = a.loaders[0];
    if (l) patches.push({ at: l.fn.bodyEnd + 1, text: `\n;try{globalThis.__exposedWebpackRequire=${loaderName};}catch(__e){}` });
    fs.writeFileSync(outPath, applyPatches(a.raw, patches));
    mode = 'inline-iife';
    if (l) {
      process.stdout.write(`已写出 ${outPath}（自执行 IIFE：加载器 + ${sub.kept.length} 个模块，已全局导出加载器）\n`);
    } else {
      process.stdout.write(`已写出 ${outPath}（只有模块表，加载器需来自 --runtime）\n`);
    }
  } else {
    // 注册形态：按原始形态重建（chunk 名与入口 id 列表原样保留）
    const reg = sel.push;
    fs.writeFileSync(outPath, rebuildRegistration(reg, sub.text));
    mode = reg.kind === 'push' ? 'push' : 'call';
    process.stdout.write(`已写出 ${outPath}（${mode} 形态 chunk：${sub.kept.length} 个模块）\n`);
    if (a.loaders.length) {
      const rt = opts.runtime ? opts.runtime : null;
      if (rt) process.stdout.write(`  runtime 用 ${rt}（本文件里的加载器不是最终运行时，分开放更稳）\n`);
      else process.stdout.write('  ⚠ 本文件里的加载器只在 chunk 内可见；运行时请用 --runtime 指定 runtime.js，并用 loader-export 处理它。\n');
    } else {
      process.stdout.write('  ⚠ 本文件不含加载器：请对 runtime 文件跑 loader-export，或在 run.js 里 require 它。\n');
    }
  }

  // F6（根因修复）：run.js 里的 `globalThis.__exposedWebpackRequire` 必须由 runtime 提供，
  // 而用户传进来的 runtime **通常没有**这个导出（那正是 loader-export 要干的事）。
  // 早期实现把 runtime 原样 require 进去 ⇒ 生成的 run.js **必然**报「没有拿到 __exposedWebpackRequire」。
  // 现在：只要给了 --runtime，就顺手产出一份**带全局导出**的 `runtime.exported.js`，并让 run.js 引用它。
  let runtimeForRun = '';
  if (opts.runtime) {
    const rtRaw = read(opts.runtime);
    const rtName = path.basename(opts.runtime);
    if (/__exposedWebpackRequire/.test(rtRaw)) {
      runtimeForRun = rtName;
      process.stdout.write(`  runtime 已是「带全局导出」的版本，直接复用 ${rtName}\n`);
    } else {
      const r = analyze(opts.runtime);
      const rName = r.loaders.length ? inferLoaderName(r.raw, r.masked, r.loaders[0].fn) : '';
      if (rName) {
        const exportedPath = path.join(dir, 'runtime.exported.js');
        fs.writeFileSync(exportedPath, applyPatches(r.raw, [exportPatch(r, rName, opts.as)]));
        runtimeForRun = 'runtime.exported.js';
        process.stdout.write(`  已顺手写出 ${exportedPath}（加载器 ${rName} 已全局导出）—— run.js 引用的是它\n`);
      } else {
        runtimeForRun = rtName;
        process.stdout.write(`  ⚠ 无法自动给 ${rtName} 加全局导出（没找到加载器，或加载器是匿名函数）；\n`
          + '    run.js 会报「没有拿到 __exposedWebpackRequire」⇒ 请手工跑\n'
          + `    harvest-bundle.js loader-export ${opts.runtime} -o ${path.join(dir, 'runtime.exported.js')}\n`);
      }
    }
  }

  const runPath = path.join(dir, 'run.js');
  fs.writeFileSync(runPath, runSkeleton(path.basename(outPath), entries[0], mode, runtimeForRun));
  process.stdout.write(`已写出 ${runPath}（调用骨架，含最小环境 prelude）\n`);
  return res.missing.length ? 2 : 0;
}

function runSkeleton(bundleFile, entryId, mode, runtimeFile) {
  const requires = [];
  if (runtimeFile) requires.push(`require('./${runtimeFile}');`);
  requires.push(`require('./${bundleFile}');`);
  // prelude 直接内联进产物：run.js 会被复制到用户的目录里，
  // 不能指望它还能按相对路径 require 到本技能的 env-shim.js。
  const prelude = require('./env-shim.js').prelude({});
  return `'use strict';
// 打包产物复用骨架（harvest-bundle.js 生成）—— 形态：${mode}
//
// 下面的 prelude 只补「node 里必定没有、而打包运行时一定会碰」的那几个。
// ⚠ prelude 里的 UA / location 是**通用占位值**，不是目标站点的真实值。
//   若结果与浏览器不一致（尤其是抠出来的函数会读 navigator/location），
//   先把这两处换成目标站点的真实值再重跑 —— 见 references/node-reuse-and-env-handoff.md。
// 缺什么再补什么，报错信息里的标识符就是线索；
// 若报错来自指纹/风控检测（而不是「xxx is not defined」），
// 说明这已经不是「复用」问题而是「补环境」问题 ⇒ 交给 web-js-env-patcher。
${prelude}
${requires.join('\n')}

const require_ = globalThis.__exposedWebpackRequire;
if (typeof require_ !== 'function') {
  throw new Error('没有拿到 __exposedWebpackRequire：runtime 是否已全局导出加载器？');
}

const mod = require_(${JSON.stringify(entryId)});
console.log('module keys =', Object.keys(mod));
// TODO: 按站点真实调用方式取值，例如 mod.someFn(arg)
`;
}

/**
 * 把「运行时收集到的 harvest.json」拼成 one_bundle.js。
 * 入参是 { "<id>": "<模块函数源码>" }（id 与源码都来自页面里的真实值）。
 */
function cmdWrap(opts) {
  const src = opts.harvest;
  const outPath = opts.o || opts.out;
  if (!src || !outPath) die('用法：harvest-bundle.js wrap --harvest <harvest.json> -o <one_bundle.js> [--template <bundle.js>]');
  const text = read(src);
  let obj;
  try { obj = JSON.parse(text); } catch (e) { die(`harvest 文件不是合法 JSON：${e.message}`); }
  const ids = Object.keys(obj);
  if (!ids.length) die('harvest 文件里没有任何模块。');
  const nullIds = ids.filter((k) => obj[k] === null);
  const body = ids.filter((k) => obj[k] !== null)
    .map((k) => `${JSON.stringify(k)}:${obj[k]}`).join(',\n');

  if (opts.template) {
    const a = analyze(opts.template);
    const sel = pickTable(a, true);
    if (!sel) die('--template 里没有模块表，无法定位插入点。');
    if (sel.source === 'inline') {
      fs.writeFileSync(outPath, applyPatches(a.raw, [{ at: sel.table.start, remove: sel.table.end + 1, text: `{\n${body}\n}` }]));
    } else {
      fs.writeFileSync(outPath, rebuildRegistration(sel.push, `{\n${body}\n}`));
    }
  } else {
    fs.writeFileSync(outPath, `(globalThis.webpackChunkHarvest = globalThis.webpackChunkHarvest || []).push([[0],{\n${body}\n}]);\n`);
  }
  process.stdout.write(`已写出 ${outPath}：模块 ${ids.length - nullIds.length} 个\n`);
  if (nullIds.length) {
    process.stdout.write(`⚠ 其中 ${nullIds.length} 个模块在页面里取到的是 null（源码在别的 chunk / 未加载）：${nullIds.join(', ')}\n`
      + '  ⇒ 到 Network 里把对应 chunk 下载下来，或对这些 id 单独再走一轮记录。\n');
    return 2;
  }
  return 0;
}

// ---------------------------------------------------------------- selftest

function selftest() {
  const os = require('os');
  const { execFileSync } = require('child_process');
  let pass = 0;
  const fails = [];
  const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg); };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wbe-selftest-'));
  const p = (n) => path.join(tmp, n);
  // 实跑失败（语法错、运行时抛错）要变成一条 FAIL，而不是让整个自检崩掉 ——
  // 崩掉时使用者只看到栈帧，看不到「哪几条已经过了」。
  const runThrows = [];
  const firstLine = (e) => String(e.stderr || e.message).split(/\r?\n/)[0];
  const run = (file, expr) => {
    try {
      return execFileSync(process.execPath, ['-e', `global.self=global;require(${JSON.stringify(file)});${expr}`], { encoding: 'utf8', stdio: 'pipe' }).trim();
    } catch (e) {
      runThrows.push(firstLine(e));
      return `<<实跑失败: ${firstLine(e)}>>`;
    }
  };
  /** 以子进程方式跑本脚本（这样 `pre()` 的 exit 2 才是真的退出码，而不是被 catch 吞掉）。 */
  const cli = (args) => {
    try { execFileSync(process.execPath, [__filename, ...args], { stdio: 'pipe', encoding: 'utf8' }); return 0; }
    catch (e) { return typeof e.status === 'number' ? e.status : 1; }
  };

  try {
    // ---- 夹具：webpack 1-3 风格自执行 IIFE（含一个不被依赖的模块，用来验「不该被带进来」）
    const bundle = [
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
      '    t.exports={add:function(a){return o.dbl(a)+1;}};',
      '  },',
      '  20:function(t,e,n){ t.exports={dbl:function(a){return a*2;}}; },',
      '  30:function(t,e,n){ t.exports={triple:function(a){return a*3;}}; },',
      '  99:function(t,e,n){ t.exports={unused:function(){return "no";}}; }',
      '});',
      '',
    ].join('\n');
    fs.writeFileSync(p('bundle.js'), bundle);

    // (1) detect 复核
    const d = cmdDetect(p('bundle.js'));
    ok(d.family === 'webpack-inline-iife', `detect 家族应为 webpack-inline-iife，实为 ${d.family}`);
    ok(d.tables[0].ids.join(',') === '10,20,30,99', `detect 模块 id 应为 10,20,30,99，实为 ${d.tables[0].ids.join(',')}`);

    // (2) loader-export：导出后必须能真的调用到模块
    cmdLoaderExport({ _: [p('bundle.js')], o: p('runtime_export.js') });
    const v1 = run(p('runtime_export.js'), 'const r=globalThis.__exposedWebpackRequire;console.log(r(10).add(21));');
    ok(v1 === '43', `loader-export 后直接 require 应能算出 43，实为 ${v1}`);

    // (3) --record：记录器必须按 id 去重，并且能拿到源码串
    cmdLoaderExport({ _: [p('bundle.js')], o: p('runtime_record.js'), record: true });
    const v2 = run(p('runtime_record.js'),
      'const r=globalThis.__exposedWebpackRequire;r(10);r(10);r(20);'
      + 'const L=globalThis.__wpHarvest.list;console.log(JSON.stringify([L.length,L.map(x=>x[0]),typeof L[0][1]]));');
    ok(v2 === '[2,[10,20],"string"]', `--record 应去重成 2 条且保留源码字符串，实为 ${v2}`);

    // (4) closure：可达集合必须含 10/20，且排除 30/99
    const cl = closureOf(analyze(p('bundle.js')), pickTable(analyze(p('bundle.js')), true), ['10'], { loaderName: 'e' });
    ok(cl.ids.sort().join(',') === '10,20', `闭包应为 10,20，实为 ${cl.ids.sort().join(',')}`);
    ok(cl.missing.length === 0, `闭包不应有缺失，实为 ${cl.missing.join(',')}`);
    ok(cl.calls.every((c) => c.mode === 'strict'), '已知加载器名时应走 strict 模式');

    // (5) 闭包不完整必须被报出来（反向断言：不许静默成功）
    const cl2 = closureOf(analyze(p('bundle.js')), pickTable(analyze(p('bundle.js')), true), ['404'], { loaderName: 'e' });
    ok(cl2.missing.includes('404'), '入口不存在时必须报 missing');

    // (6) emit：产物要与原产物**逐字节同结果**，且体积更小、不含无关模块
    cmdEmit({ _: [p('bundle.js')], entry: '10', o: p('one_bundle.js') });
    const v3 = run(p('one_bundle.js'), 'const r=globalThis.__exposedWebpackRequire;console.log(r(10).add(21));');
    ok(v3 === '43', `emit 产物应算出 43，实为 ${v3}`);
    const emitted = fs.readFileSync(p('one_bundle.js'), 'utf8');
    ok(emitted.includes('"dbl"') || emitted.includes('dbl:'), 'emit 产物应含被依赖的模块 20');
    ok(!emitted.includes('unused'), 'emit 产物不得含无关模块 99（unused）');
    ok(!emitted.includes('triple'), 'emit 产物不得含无关模块 30（triple）');
    ok(emitted.length < bundle.length, `emit 产物应比原产物小（${emitted.length} < ${bundle.length}）`);

    // (7) emit 的入口不存在时：必须**非零退出**，不许静默产出「能加载但算不出值」的空壳
    const badOut = p('bad.js');
    const code7 = cli(['emit', p('bundle.js'), '--entry', '404', '-o', badOut]);
    ok(code7 !== 0, `emit 缺失入口应以非零码退出，实为 ${code7}`);

    // (8) loader-export 对「找不到加载器」的文件必须拒绝（反向断言）
    fs.writeFileSync(p('plain.js'), 'function add(a,b){return a+b;}\nmodule.exports={add};\n');
    const code8 = cli(['loader-export', p('plain.js'), '-o', p('plain.out.js')]);
    ok(code8 === 2, `普通脚本应被拒绝（exit 2），实为 ${code8}`);
    ok(!fs.existsSync(p('plain.out.js')), '被拒绝时不得产出任何文件');

    // (9) breakpoint 必须直接产出可粘贴的表达式（含真实变量名）
    const bp = execFileSync(process.execPath, [__filename, 'breakpoint', p('bundle.js')], { encoding: 'utf8' });
    ok(bp.includes('window.__wpModules[s]=t[s],false'), 'breakpoint 应产出带真实变量名的条件断点表达式');
    ok(/Add logpoint/.test(bp), 'breakpoint 应给出 logpoint 建议');
    ok(/i\s*=\s*\{\}/.test(bp), 'breakpoint 应给出「清空缓存」用的真实缓存表标识符');

    // (10) wrap：从 harvest JSON 拼 one_bundle.js；null 模块必须报出来而不是静默丢掉
    fs.writeFileSync(p('harvest.json'), JSON.stringify({
      '5': 'function(t,e,n){t.exports={half:function(a){return a/2;}};}',
      '6': null,
    }));
    const rc = cmdWrap({ harvest: p('harvest.json'), o: p('wrap.js') });
    ok(rc === 2, `wrap 遇到 null 模块应返回 2（提示补 chunk），实为 ${rc}`);
    const wrapped = fs.readFileSync(p('wrap.js'), 'utf8');
    ok(wrapped.includes('"5"'), 'wrap 产物应含可用的模块 5');
    ok(!/"6":\s*null/.test(wrapped), 'wrap 产物不得把 null 模块写进去');
    const v4 = run(p('wrap.js'), 'console.log(globalThis.webpackChunkHarvest[0][1]["5"]!=null);');
    ok(v4 === 'true', `wrap 产物应可在 node 里加载，实为 ${v4}`);

    // (11) push 形态（webpack 5）：emit 必须重建 push 语句并保住 chunk 名
    const wp5 = [
      '(self.webpackChunkapp = self.webpackChunkapp || []).push([["src_foo_js"],{',
      '  245:(e,n,o)=>{ let t=o(633); e.exports={hex:(s)=>t.MD5(s).toString(t.enc.Hex)}; },',
      '  633:(e,n,o)=>{ e.exports={MD5:(s)=>s,enc:{Hex:"hex"}}; },',
      '  999:(e,n,o)=>{ e.exports={dead:()=>"x"}; }',
      '},[[245]]]);',
      '',
    ].join('\n');
    fs.writeFileSync(p('wp5.js'), wp5);
    const code11 = cli(['emit', p('wp5.js'), '--entry', '245', '-o', p('wp5.one.js')]);
    ok(code11 === 0, `push 形态 emit 应成功，实为 ${code11}`);
    const wp5out = fs.readFileSync(p('wp5.one.js'), 'utf8');
    ok(wp5out.includes('src_foo_js'), 'push 产物应保住 chunk 名（否则 webpackJsonp 挂钩会失效）');
    ok(wp5out.includes('633'), 'push 产物应含依赖模块 633');
    ok(!wp5out.includes('999'), 'push 产物不得含无关模块 999');
    const v5 = run(p('wp5.one.js'),
      'const arr=globalThis.webpackChunkapp[0];console.log(arr[0][0]+"/"+Object.keys(arr[1]).join(","));');
    ok(v5 === 'src_foo_js/245,633', `push 产物结构应正确，实为 ${v5}`);

    // (12) **真实形态**：webpack 4「直接调用注册」`webpackJsonpdxCaptcha(["chunk"],{…})`
    // （结构取自仓内样本 `project/dingxiang/sources/basic-captcha-js.js.orig`）
    //      —— 产物必须仍是「调用」，不能改写成 `.push(...)`，否则运行时的挂钩方式就变了。
    const jsonpCall = [
      'webpackJsonpdxCaptcha(["basic-captcha-js"],{',
      '  "+OK6":function(t,e){t.exports={noop:function(){return 7;}};},',
      '  "09s5":function(t,e,r){var i=r("+OK6");t.exports={go:function(){return i.noop();}};},',
      '  "zzzz":function(t,e){t.exports={dead:function(){return 0;}};}',
      '});',
      '',
    ].join('\n');
    fs.writeFileSync(p('jsonp.js'), jsonpCall);
    const code12 = cli(['emit', p('jsonp.js'), '--entry', '09s5', '-o', p('jsonp.one.js')]);
    ok(code12 === 0, `call 形态 emit 应成功，实为 ${code12}`);
    const jsonpOut = fs.readFileSync(p('jsonp.one.js'), 'utf8');
    ok(/^webpackJsonpdxCaptcha\(\["basic-captcha-js"\],\{/m.test(jsonpOut),
      `call 形态产物必须仍是直接调用且保留 chunk 名，实为：${jsonpOut.slice(0, 90)}`);
    ok(!/\.push\(/.test(jsonpOut), 'call 形态产物不得被改写成 .push(...)');
    ok(jsonpOut.includes('+OK6'), 'call 形态产物应含依赖模块 +OK6');
    ok(!jsonpOut.includes('zzzz'), 'call 形态产物不得含无关模块 zzzz');
    // 用「把注册函数实现成捕获语义」的桩来实跑，验证结构与内容都对
    const stub = [
      'globalThis.__captured=null;',
      'globalThis.webpackJsonpdxCaptcha=function(ids,mods){globalThis.__captured=[ids,mods];};',
      `require(${JSON.stringify(p('jsonp.one.js'))});`,
      'const a=globalThis.__captured;',
      'console.log(a[0][0]+"/"+Object.keys(a[1]).join(","));',
    ].join('\n');
    fs.writeFileSync(p('jsonp.run.js'), stub);
    const v7 = execFileSync(process.execPath, [p('jsonp.run.js')], { encoding: 'utf8' }).trim();
    ok(v7 === 'basic-captcha-js/+OK6,09s5', `call 形态产物结构应正确，实为 ${v7}`);

    // (13) 反向断言：**未被佐证的模块表必须被拒绝**（字符串表 / 字典不是模块表）
    const stringTable = [
      'var dict = {',
      '  "+t5M": function (a) { return a + 1; },',
      '  "/8Uj": function (a) { return a * 2; }',
      '};',
      'module.exports = dict;',
      '',
    ].join('\n');
    fs.writeFileSync(p('dict.js'), stringTable);
    const code13 = cli(['closure', p('dict.js'), '--entry', '+t5M']);
    ok(code13 === 2, `未被佐证的模块表应以 exit 2 拒绝，实为 ${code13}`);
    const code13b = cli(['closure', p('dict.js'), '--entry', '+t5M', '--force']);
    ok(code13b === 0, `--force 应可跳过佐证检查，实为 ${code13b}`);
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { void e; }
  }

  if (fails.length) {
    process.stdout.write(`FAIL ${fails.length} 项\n` + fails.map((f) => '  - ' + f).join('\n') + `\n通过 ${pass} 项\n`);
    return 1;
  }
  process.stdout.write(`OK 全部 ${pass} 项断言通过（含「实跑产物」与「必须被拒绝」两类强断言）\n`);
  return 0;
}

// ---------------------------------------------------------------- main

function main(argv) {
  if (argv.includes('--selftest')) return selftest();
  const cmd = argv[0];
  const opts = parseOpts(argv.slice(1), VALUE_FLAGS);
  switch (cmd) {
    case 'detect': {
      const file = opts._[0];
      if (!file) die('用法：harvest-bundle.js detect <bundle.js>');
      process.stdout.write(require('./detect-bundler.js').render(cmdDetect(file)) + '\n');
      return 0;
    }
    case 'loader-export': return cmdLoaderExport(opts);
    case 'breakpoint': return cmdBreakpoint(opts);
    case 'closure': return cmdClosure(opts);
    case 'emit': return cmdEmit(opts);
    case 'wrap': return cmdWrap(opts);
    default:
      process.stderr.write('未知子命令。可用：detect | loader-export | breakpoint | closure | emit | wrap | --selftest\n');
      return 1;
  }
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { analyze, closureOf, pickTable, subsetTable, applyPatches, inferLoaderName, selftest };
