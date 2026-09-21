/**
 * 探针 W（下一步建议的实施）：用「环境 API 调用序列」定位 Node 补环境与真浏览器的分叉点。
 *
 * 背景：probe-call-diff.js 测得签名期间浏览器调 `Math.random` 约 400 次、Node 只有 1 次
 * —— 数量差三个数量级，说明两边**根本不是同一条代码路径**（Node 大概率在某处失败后走了
 * 备用分支，且异常被 SDK 吞掉）。盲目对比「读了哪些全局」找不到原因，必须找到**分叉点**。
 *
 * 手法：在两侧（真浏览器 iframe / Node vm）**同码同配置**下，把签名过程中调用到的
 * 确定性环境 API 按**发生顺序**记成序列，然后逐位置比对，报出第一处分叉及其上下文。
 *
 * 判读：
 *   分叉点前一个事件就是「走岔」的地方 —— 该事件之后 Node 少了一长串调用 ⇒ 从那里开始
 *   SDK 进入了 fallback。顺着这个事件回溯，就能找到缺失/异常的输入。
 *
 * 用法：cd /d/work/jsreverse && node tiktok/solver/_probes/probe-call-sequence.js
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { createEnv, makeFakeResponse } = require('../tt_env');
const { installNativeProtect } = require('../tt_native');
const { loadSeedConfig } = require('../tt_sign');
const { pageSession, pageSigned, Cdp, RAW_POST } = require('../cdp-oracle');

const SDK = path.join(__dirname, '..', '..', 'sources', 'webmssdk.1.0.0.417.js.orig');
const PATH_ = '/api/post/item_list/';
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';
const CAP = 20000;

/**
 * 调用序列插桩。只挂**确定性** API（随机/时间类会天然不同，只记“被调用”不记值，
 * 因为它们的次数差本身就是重要信号）。
 * 必须在 SDK 求值**之前**安装，否则 SDK 已经把函数引用缓存进闭包。
 */
const HOOK = `
(function (w) {
  var L = w.__seq = [];
  function rec(tag, arg, ret) {
    if (L.length < ${CAP}) L.push(arg === undefined ? tag : tag + '|' + arg);
  }
  function wrapGet(obj, name, tag, fmt) {
    try {
      var f = obj[name];
      if (typeof f !== 'function') return;
      var g = function () {
        var r;
        try { r = f.apply(this, arguments); }
        catch (e) { rec(tag + ':THROW'); throw e; }
        rec(tag, fmt ? fmt(arguments, r) : undefined, r);
        return r;
      };
      obj[name] = g;
    } catch (e) {}
  }
  wrapGet(w.Math, 'random', 'random');
  wrapGet(w, 'btoa', 'btoa', function (a) { return String(a).length; });
  wrapGet(w, 'atob', 'atob', function (a) { return String(a).length; });
  wrapGet(w.performance, 'now', 'pnow');
  wrapGet(w.crypto, 'getRandomValues', 'grv', function (a) { return a[0] && a[0].length; });
  wrapGet(w.crypto, 'randomUUID', 'uuid');
  wrapGet(w, 'encodeURIComponent', 'eUC', function (a) { return String(a).length; });
  wrapGet(w, 'decodeURIComponent', 'dUC', function (a) { return String(a).length; });
  wrapGet(w.JSON, 'stringify', 'jstr');
  wrapGet(w.JSON, 'parse', 'jparse');
  try {
    var dn = w.Date.now;
    w.Date.now = function () { rec('datenow'); return dn.apply(this, arguments); };
    var ct = w.Date;
    w.Date = function () { rec('newDate'); return ct.apply(this, arguments); };
    w.Date.now = dn; w.Date.prototype = ct.prototype;
  } catch (e) {}
})(window);
`;

/** 在真浏览器 iframe 里跑同码同配置，回收调用序列 + 签名 URL */
async function runInFrame(sdkSrc, storageJson) {
  const list = await (await fetch(CDP_HTTP + '/json/list')).json();
  const t = list.find(x => x.type === 'page' && /tiktok/.test(x.url));
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  try {
    const r = await cdp.send('Runtime.evaluate', {
      expression: `(async(sdkSrc, path, raw, hookSrc, storageJson) => {
        const fr = document.createElement('iframe'); fr.style.display='none'; document.body.appendChild(fr);
        await new Promise(r=>setTimeout(r,300));
        const w = fr.contentWindow; const out = {};
        try {
          const S = JSON.parse(storageJson);
          // 用页面（已被 SDK 就地扩展过的）配置对象，避免配置本身成为变量
          w._mssdk = window._mssdk;
          // 页面同源 iframe 共享 localStorage，但为了与 Node 侧对齐，显式写入同一份 storage
          try { Object.keys(S.local).forEach(k => w.localStorage.setItem(k, S.local[k])); } catch(e) {}
          try { Object.keys(S.session).forEach(k => w.sessionStorage.setItem(k, S.session[k])); } catch(e) {}
          w.__cap = [];
          const of = w.fetch.bind(w);
          w.fetch = function (u, i) {
            try { w.__cap.push(String(typeof u === 'string' ? u : (u && u.url))); } catch (e) {}
            return of(u, i);
          };
          w.eval(hookSrc);      // ★ 必须在 eval(sdkSrc) 之前
          w.eval(sdkSrc);
          const m = w._mssdk, c = (m&&m.cacheOpts&&m.cacheOpts['1988'])||{};
          w.byted_acrawler.init({aid:1988,dfp:!!c.dfp,boe:!!c.boe,intercept:!!c.intercept,
            enablePathList:c.enablePathList||[],region:c.region||'sg-tiktok',apiHost:c.apiHost||'',
            mode:c.mode!=null?c.mode:516,isSDK:false,custom:c.custom||{}});
          w.__seq.length = 0;                       // 只统计签名阶段
          await w.fetch('https://www.tiktok.com' + path + '?' + raw, {headers:{'Content-Type':'application/json'}});
          await new Promise(r=>setTimeout(r,800));
          out.url = (w.__cap||[]).filter(u=>u.indexOf(path)!==-1).pop() || null;
          out.seq = w.__seq.slice(0, ${CAP});
        } catch (e) { out.err = String(e && e.message); }
        return JSON.stringify(out);
      })`,
      returnByValue: true, awaitPromise: true, timeout: 120000,
    });
    if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0, 300) };
    return JSON.parse(r.result.value);
  } finally { cdp.close(); }
}

/** 在 Node vm 补环境里跑同码同配置，回收调用序列 + 签名 URL */
async function runInNode(sdkSrc, storage) {
  const reqs = [];
  const env = createEnv({
    url: 'https://www.tiktok.com/@tiktok', mssdkConfig: loadSeedConfig(), cookie: '', storage,
    fetchImpl: (u) => { reqs.push(u); return Promise.resolve(makeFakeResponse('{}', 200, u)); },
  });
  const sandbox = Object.create(null);
  for (const k of Object.keys(env)) sandbox[k] = env[k];
  sandbox.console = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
  sandbox.globalThis = sandbox; sandbox.window = sandbox; sandbox.self = sandbox;
  sandbox.top = sandbox; sandbox.parent = sandbox;
  const ctx = vm.createContext(sandbox, { name: 'probe', codeGeneration: { strings: true, wasm: false } });
  installNativeProtect(sandbox);
  // ★ 在 SDK 之前装插桩
  vm.runInContext(HOOK, ctx, { timeout: 5000 });
  new vm.Script(sdkSrc, { filename: 'webmssdk.js' }).runInContext(ctx, { timeout: 30000 });
  const c = loadSeedConfig().cacheOpts['1988'];
  sandbox.byted_acrawler.init({
    aid: 1988, dfp: false, boe: false, intercept: true, enablePathList: c.enablePathList,
    region: 'sg-tiktok', apiHost: '', mode: 516, isSDK: false, custom: c.custom,
  });
  vm.runInContext('globalThis.__seq.length = 0', ctx, { timeout: 5000 });   // 只统计签名阶段
  await vm.runInContext(`fetch('https://www.tiktok.com${PATH_}?${RAW_POST}',{method:'GET'})`, ctx, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 500));
  const seq = JSON.parse(vm.runInContext(`JSON.stringify((globalThis.__seq||[]).slice(0, ${CAP}))`, ctx, { timeout: 5000 }));
  return { url: reqs.filter(u => u.indexOf(PATH_) !== -1).pop() || null, seq };
}

(async () => {
  const sdkSrc = fs.readFileSync(SDK, 'utf8');
  const page = await pageSession();
  const browserUrl = await pageSigned(RAW_POST, PATH_);
  const liveMs = (() => { const m = /[?&]msToken=([^&]*)/.exec(browserUrl || ''); return m ? m[1] : (page.local.msToken || ''); })();
  const storage = {
    local: Object.assign({}, page.local, { msToken: liveMs, xmst: liveMs }),
    session: Object.assign({}, page.session, { msToken: liveMs }),
  };

  console.log('=== 采集两侧调用序列 ===');
  const F = await runInFrame(sdkSrc, JSON.stringify(storage));
  const N = await runInNode(sdkSrc, storage);
  if (F.err) console.log('   ⚠️ iframe 侧: %s', F.err);
  const getK = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]*)').exec(u || ''); return m ? m[1] : ''; };
  console.log('   浏览器 iframe: seq=%d  X-Dynosaur=%s', (F.seq || []).length, getK(F.url, 'X-Dynosaur').length || '(无)');
  console.log('   Node vm      : seq=%d  X-Dynosaur=%s', N.seq.length, getK(N.url, 'X-Dynosaur').length || '(无)');

  // 计数对比
  const count = (seq) => { const m = {}; for (const e of seq) { const k = e.split('|')[0]; m[k] = (m[k] || 0) + 1; } return m; };
  const cf = count(F.seq || []), cn = count(N.seq);
  console.log('\n=== 调用次数 ===');
  for (const k of Array.from(new Set([...Object.keys(cf), ...Object.keys(cn)])).sort()) {
    const a = cf[k] || 0, b = cn[k] || 0;
    console.log('   ' + k.padEnd(14) + '浏览器=' + String(a).padEnd(7) + 'Node=' + String(b).padEnd(7) + (a === b ? '' : ' ← 差异'));
  }

  // 逐位置找第一处分叉
  const A = F.seq || [], B = N.seq;
  let i = 0;
  while (i < A.length && i < B.length && A[i] === B[i]) i++;
  console.log('\n=== 第一处分叉 ===');
  if (i >= A.length && i >= B.length) console.log('   两侧序列完全相同（长度 %d）', A.length);
  else {
    console.log('   分叉位置: #%d（浏览器 %d 条 / Node %d 条）', i, A.length, B.length);
    console.log('   分叉前最后 6 个共同事件:');
    for (let j = Math.max(0, i - 6); j < i; j++) console.log('     #%d  %s', j, A[j]);
    console.log('   浏览器侧接下来 12 个:');
    for (let j = i; j < Math.min(A.length, i + 12); j++) console.log('     #%d  %s', j, A[j]);
    console.log('   Node 侧接下来 12 个:');
    for (let j = i; j < Math.min(B.length, i + 12); j++) console.log('     #%d  %s', j, B[j]);
  }

  fs.writeFileSync(path.join(__dirname, '..', '..', 'artifacts', 'probe-call-sequence.json'),
    JSON.stringify({ counts: { frame: cf, node: cn }, firstDivergence: i, frameSeq: A, nodeSeq: B }, null, 1));
  console.log('\n完整序列 -> tiktok/artifacts/probe-call-sequence.json');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 10).join('\n') : e); process.exit(1); });