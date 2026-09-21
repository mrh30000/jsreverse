#!/usr/bin/env node
'use strict';

/**
 * env-shim.js —— 抠出的打包代码在 node 里跑起来的「最小环境 prelude」（零依赖）
 *
 * 定位说明（避免与 web-js-env-patcher 重复维护）：
 *   本脚本**不是**补环境技能。它只解决「抠出来的模块在 node 里第一步就 ReferenceError」这一件事，
 *   补的内容只有 4 个：`self` / `window` / `navigator.userAgent` / `document` 的空壳。
 *   一旦报错不是「xxx is not defined」而是指纹/风控相关（`toString`、`getUndetectable`、
 *   各种 `webdriver`/`chrome` 探测），说明问题已经从「复用」升级为「补环境」，
 *   请切到 `web-js-env-patcher`（环境字段权威清单、模块层级、native 保护都在那边）。
 *
 * `--trace` 走的是「环境自吐」：用 Proxy 拦 get/set，把代码真正访问过的环境字段打出来。
 * 这是**发现**缺什么的最快手段，但**权威做法与完整字段矩阵**在
 * `web-js-env-patcher`（见 `../../web-js-env-patcher/references/env-debug-loop.md`）；本脚本只给最小可用版。
 *
 * 用法：
 *   node env-shim.js --print [--trace] [--ua "<UA>"] [--url "<页面URL>"]
 *   node env-shim.js --run <bundle.js> [--trace]
 *   node env-shim.js --selftest
 */

const fs = require('fs');

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * 装一个全局。**必须用 defineProperty**。
 *
 * 本机实测（Node v22.22.2）：
 *   `globalThis.navigator` 已经存在，是**惰性 getter**，`userAgent === 'Node.js/22'`，
 *   属性描述符是 `{get, set, enumerable, configurable:true}`。
 *   `globalThis.navigator = {...}` 是**静默失败** —— 不抛错、不警告，赋完还是 `Node.js/22`。
 *   ⇒ 抠出来的代码里 `navigator.userAgent` 会读到 `Node.js/22`，
 *     指纹类检测立刻把它当成「非浏览器」，而你的 prelude **看上去是写对了的**。
 *   `Object.defineProperty` 能覆盖（因为 configurable 为 true），所以这里统一走它。
 */
function setGlobal(name, value) {
  try {
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true, enumerable: true });
    return true;
  } catch (e) {
    void e;
    try { globalThis[name] = value; return true; } catch (e2) { void e2; return false; }
  }
}

/** 生成可直接粘到 run.js 顶部的 prelude 源码。 */
function prelude(opts) {
  const o = Object.assign({ trace: false, ua: DEFAULT_UA, url: 'https://example.com/' }, opts || {});
  const body = `// ---- env-shim prelude（最小环境，不是补环境）----
function __setGlobal(name, value) {
  // 关键：必须 defineProperty。Node >= 21 的 navigator 是惰性 getter，
  // 直接赋值 **静默失败**（不报错，userAgent 仍是 'Node.js/xx'）。
  try { Object.defineProperty(globalThis, name, { value: value, writable: true, configurable: true, enumerable: true }); }
  catch (e) { try { globalThis[name] = value; } catch (e2) {} }
}
__setGlobal('self', globalThis);
__setGlobal('window', globalThis);
__setGlobal('top', globalThis);
__setGlobal('frames', globalThis);
var __ua = ${JSON.stringify(o.ua)};
if (!globalThis.navigator || !globalThis.navigator.userAgent || /^Node\\.js/.test(globalThis.navigator.userAgent)) {
  __setGlobal('navigator', { userAgent: __ua, platform: 'Win32', language: 'zh-CN', languages: ['zh-CN', 'zh'] });
}
if (typeof globalThis.document === 'undefined') {
  __setGlobal('document', {
    cookie: '',
    title: '',
    readyState: 'complete',
    referrer: '',
    createElement: function () { return { style: {}, setAttribute: function () {}, appendChild: function () {} }; },
    createEvent: function () { return { initEvent: function () {}, timeStamp: Date.now() }; },
    getElementsByTagName: function () { return []; },
    querySelector: function () { return null; },
    addEventListener: function () {},
    removeEventListener: function () {},
  });
}
if (typeof globalThis.location === 'undefined') {
  __setGlobal('location', { href: ${JSON.stringify(o.url)}, protocol: 'https:', host: (function () { try { return new URL(${JSON.stringify(o.url)}).host; } catch (e) { return 'example.com'; } })(), pathname: '/', search: '', hash: '' });
}
// 只读的「环境自吐」：把代码真正碰过的字段打出来，据此决定补什么
if (!globalThis.__envTraceInstalled) {
  globalThis.__envTrace = globalThis.__envTrace || { hits: [] };
  var __wrap = function (name) {
    var real = globalThis[name];
    if (real === undefined || real === globalThis) return;
    try {
      __setGlobal(name, new Proxy(real, {
        get: function (t, k) {
          if (typeof k === 'string') globalThis.__envTrace.hits.push(name + '.' + k + ' (get)');
          return t[k];
        },
        set: function (t, k, v) {
          if (typeof k === 'string') globalThis.__envTrace.hits.push(name + '.' + k + ' (set)');
          t[k] = v;
          return true;
        },
      }));
    } catch (e) { /* 某些宿主对象不可代理：忽略，不影响主流程 */ }
  };
  if (${o.trace ? 'true' : 'false'}) { ['navigator', 'document', 'location', 'screen', 'history'].forEach(__wrap); }
  globalThis.__envTraceInstalled = true;
}
// ---- env-shim prelude end ----
`;
  return body;
}

/** 直接在进程内装上（供 `--run` 与其它脚本 require 使用）。 */
function install(opts) {
  const o = Object.assign({ trace: false, ua: DEFAULT_UA, url: 'https://example.com/' }, opts || {});
  setGlobal('self', globalThis);
  setGlobal('window', globalThis);
  setGlobal('top', globalThis);
  setGlobal('frames', globalThis);
  if (!globalThis.navigator || !globalThis.navigator.userAgent || /^Node\.js/.test(globalThis.navigator.userAgent)) {
    setGlobal('navigator', { userAgent: o.ua, platform: 'Win32', language: 'zh-CN', languages: ['zh-CN', 'zh'] });
  }
  if (typeof globalThis.document === 'undefined') {
    setGlobal('document', {
      cookie: '', title: '', readyState: 'complete', referrer: '',
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
      createEvent: () => ({ initEvent() {}, timeStamp: Date.now() }),
      getElementsByTagName: () => [],
      querySelector: () => null,
      addEventListener() {}, removeEventListener() {},
    });
  }
  if (typeof globalThis.location === 'undefined') {
    let host = 'example.com';
    try { host = new URL(o.url).host; } catch (e) { void e; }
    setGlobal('location', { href: o.url, protocol: 'https:', host, hostname: host.split(':')[0], pathname: '/', search: '', hash: '', origin: 'https://' + host });
  }
  globalThis.__envTrace = globalThis.__envTrace || { hits: [] };
  if (o.trace) {
    for (const name of ['navigator', 'document', 'location']) {
      const real = globalThis[name];
      if (!real || real === globalThis) continue;
      try {
        setGlobal(name, new Proxy(real, {
          get(t, k) { if (typeof k === 'string') globalThis.__envTrace.hits.push(`${name}.${k} (get)`); return t[k]; },
          set(t, k, v) { if (typeof k === 'string') globalThis.__envTrace.hits.push(`${name}.${k} (set)`); t[k] = v; return true; },
        }));
      } catch (e) { void e; }
    }
  }
  return globalThis;
}

// ------------------------------------------------------------------ selftest

function selftest() {
  let pass = 0;
  const fails = [];
  const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg); };

  // (1) prelude 必须是可解析的源码（否则用户粘进 run.js 会直接语法错）
  for (const trace of [false, true]) {
    const code = prelude({ trace });
    let parsed = true;
    try { new Function(code); } catch (e) { parsed = false; void e; }
    ok(parsed, `prelude(trace=${trace}) 应可被解析`);
    ok(/__setGlobal\('self', globalThis\)/.test(code), `prelude(trace=${trace}) 应包含 self 绑定`);
    ok(/Object\.defineProperty\(globalThis, name/.test(code), `prelude(trace=${trace}) 必须用 defineProperty 装全局（见 navigator 静默失败陷阱）`);
  }

  // (2) prelude 里的 UA / URL 必须真的被带上（不能是写死的模板值）
  const code2 = prelude({ ua: 'UA-UNIT-TEST', url: 'https://unit.test/p' });
  ok(code2.includes('UA-UNIT-TEST'), 'prelude 应带上自定义 UA');
  ok(code2.includes('https://unit.test/p'), 'prelude 应带上自定义 URL');

  // (3) 实跑：self/window 指向同一对象，navigator/document 可用
  const g = install({ trace: false, ua: 'UA-UNIT-TEST' });
  ok(g.self === g && g.window === g, 'install 后 self/window 应指向 globalThis');
  ok(g.navigator.userAgent === 'UA-UNIT-TEST', 'install 后 navigator.userAgent 应为传入值');
  ok(typeof g.document.createElement('div').style === 'object', 'document.createElement 应返回带 style 的对象');
  ok(typeof g.document.createEvent('Event').timeStamp === 'number', 'document.createEvent 应返回带 timeStamp 的对象');
  ok(typeof g.location.host === 'string' && g.location.host.length > 0, 'location.host 应可用');

  // (4) --trace：真的记录了访问；反向断言：不开 trace 时不得记录
  const before = globalThis.__envTrace.hits.length;
  globalThis.navigator.userAgent;            // 触发一次 get
  ok(globalThis.__envTrace.hits.length === before, '不开 trace 时不得往 __envTrace 里写（反向断言）');

  // (5) 幂等：重复 install 不得把已存在的 document 覆盖掉（否则用户手工补的内容会被抹掉）
  g.document.marker = 'keep-me';
  install({ trace: false });
  ok(g.document.marker === 'keep-me', 'install 必须幂等：不得覆盖已存在的 document');

  // (6) Node ≥ 21 的 navigator 陷阱（本机实测 Node v22.22.2）：
  //     直接赋值是**静默失败**，必须 defineProperty。
  //     必须在**全新子进程**里验证：本进程里 navigator 已被前面的用例换成普通数据属性，
  //     在同一个进程里断言「赋值会失败」永远不成立（那等于没测）。
  const { execFileSync } = require('child_process');
  const plain = execFileSync(process.execPath, ['-e',
    "try{globalThis.navigator={userAgent:'SHOULD-NOT-STICK'}}catch(e){};console.log(String(globalThis.navigator&&globalThis.navigator.userAgent));"],
    { encoding: 'utf8' }).trim();
  const fixed = execFileSync(process.execPath, ['-e',
    `require(${JSON.stringify(__filename)}).install({ua:'UA-FRESH-PROCESS'});console.log(String(globalThis.navigator.userAgent));`],
    { encoding: 'utf8' }).trim();
  ok(plain === 'Node.js/22' || plain.startsWith('Node.js'),
    `全新进程里「直接赋值 navigator」应静默失败（读到 Node.js/x），实为 ${plain}`);
  ok(fixed === 'UA-FRESH-PROCESS',
    `全新进程里 install 后应读到自定义 UA，实为 ${fixed}`);

  if (fails.length) {
    process.stdout.write(`FAIL ${fails.length} 项\n` + fails.map((f) => '  - ' + f).join('\n') + `\n通过 ${pass} 项\n`);
    return 1;
  }
  process.stdout.write(`OK 全部 ${pass} 项断言通过\n`);
  return 0;
}

// ------------------------------------------------------------------ CLI

function main(argv) {
  if (argv.includes('--selftest')) return selftest();
  const val = (name, dflt) => (argv.includes('--' + name) ? argv[argv.indexOf('--' + name) + 1] : dflt);
  const trace = argv.includes('--trace');

  if (argv.includes('--print')) {
    process.stdout.write(prelude({ trace, ua: val('ua', DEFAULT_UA), url: val('url', 'https://example.com/') }));
    return 0;
  }
  if (argv.includes('--run')) {
    const file = val('run', '');
    if (!file || !fs.existsSync(file)) { process.stderr.write(`--run 需要存在的文件：${file}\n`); return 1; }
    install({ trace });
    require(require('path').resolve(file));
    if (trace) process.stderr.write('环境访问记录：\n' + globalThis.__envTrace.hits.join('\n') + '\n');
    return 0;
  }
  process.stderr.write('用法：node env-shim.js --print [--trace] | --run <bundle.js> [--trace] | --selftest\n');
  return 1;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { prelude, install, selftest, setGlobal, DEFAULT_UA };
