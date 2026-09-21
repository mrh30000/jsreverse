/**
 * 探针 Z（下一步建议的核心实施）：用「全局属性读取记录」找出 Node 补环境缺的输入。
 *
 * 思路：probe-seq-divergence 已证明两侧**调用序列几乎一致**（88 vs 87 条，只差一次 Date.now），
 * 所以 SDK 不是走了不同的代码分支 —— 那签名结果不同，只能是**读到的值不同**。
 * 于是把 SDK 签名期间**读取过的全局属性名**记下来，两侧比对：
 *   · 只在浏览器侧被读 → Node 缺这个全局（重点嫌疑）
 *   · 两侧都读但值不同 → 值不等价（需逐个比对）
 *
 * 实现：用 Proxy 包住 window 记录 get。注意 vm 的 sandbox 本身就能用 Proxy
 * （createEnv 返回的普通对象需要换成 Proxy，且必须保证 SDK 的 has/get 语义不被破坏）。
 *
 * 用法：
 *   cd /d/work/jsreverse && proxycli open && proxycli browser connect --cloak
 *   node tiktok/solver/_probes/probe-global-reads.js
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { createEnv, makeFakeResponse } = require('../tt_env');
const { installNativeProtect } = require('../tt_native');
const { loadSeedConfig } = require('../tt_sign');

const ART = path.join(__dirname, '..', '..', 'artifacts');
const SDK_URL = 'https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/webmssdk/1.0.0.417/webmssdk.js';
const PATH_ = '/api/post/item_list/';
const RAW = 'WebIdLastTime=0&aid=1988&app_language=zh-Hans&app_name=tiktok_web&browser_language=zh-CN&browser_name=Mozilla&browser_online=true&browser_platform=Win32&browser_version=5.0%20(Windows%20NT%2010.0%3B%20Win64%3B%20x64)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F153.0.0.0%20Safari%2F537.36&channel=tiktok_web&cookie_enabled=true&count=16&coverFormat=2&cursor=0&data_collection_enabled=false&device_id=7686701696877217301&device_platform=web_pc&focus_state=true&history_len=4&is_fullscreen=false&is_page_visible=true&language=zh-Hans&odinId=7686701682830672912&os=windows&priority_region=&referer=https%3A%2F%2Fwww.tiktok.com%2F%40tiktok&region=TW&root_referer=https%3A%2F%2Fwww.tiktok.com%2F&screen_height=1080&screen_width=1920&secUid=MS4wLjABAAAAv7iSuuXDJGDvJkmH_vz1qkDZYo1apxgzaxdBSeIuPiM&tz_name=Asia%2FSingapore&user_is_login=false&verifyFp=verify_mu6d0neq_4CnjBa5N_m9I3_4VB1_9u05_8E4p9t3KhC8u&video_encoding=dash&webcast_language=zh-Hans';

/** 记录「读了哪些全局属性名 + 读到 undefined 的次数」。用一个可重置的开关，只统计签名阶段。 */
const READ_HOOK = `
(function (w) {
  var names = w.__reads = {};
  var on = false;
  w.__readsOn = function (v) { on = !!v; if (v) names.__reset = 0; };
  try {
    var handler = {
      get: function (t, k, r) {
        if (on && typeof k === 'string') {
          var v = t[k];
          var e = names[k] || (names[k] = { n: 0, undef: 0 });
          e.n++;
          if (v === undefined) e.undef++;
        }
        return t[k];
      },
      has: function (t, k) {
        if (on && typeof k === 'string') { var e = names['#' + k] || (names['#' + k] = { n: 0, undef: 0 }); e.n++; }
        return k in t;
      }
    };
    w.__proxied = new Proxy(w, handler);
  } catch (e) { w.__proxyErr = String(e && e.message); }
})(window);
`;

function proxycli(args, timeout = 300000) {
  return execFileSync('proxycli', args, { encoding: 'utf8', timeout, shell: true });
}
function evalInPage(fnSrc, timeoutMs = 240000) {
  const p = path.join(os.tmpdir(), 'probe-global-reads.js');
  fs.writeFileSync(p, fnSrc);
  const raw = proxycli(['call', 'evaluate_script', '--file', p, '--allowAnyFrame', 'true', '--timeoutMs', String(timeoutMs)], timeoutMs + 60000);
  const line = raw.split(/\r?\n/).map(l => l.trim()).find(l => /^value:\s*[A-Za-z0-9+/=]{2,}$/.test(l));
  if (!line) throw new Error('未取到 base64 value:\n' + raw.slice(0, 900));
  const text = Buffer.from(line.replace(/^value:\s*/, ''), 'base64').toString('utf8');
  try { return JSON.parse(text); } catch (e) { return text; }
}

/** 浏览器侧：iframe 里跑 SDK，用 Proxy 包 window 记录属性读取 */
function runInBrowser() {
  const fn = `
async () => {
  const SDK_URL = ${JSON.stringify(SDK_URL)};
  const READ_HOOK = ${JSON.stringify(READ_HOOK)};
  const PATH = ${JSON.stringify(PATH_)};
  const RAW = ${JSON.stringify(RAW)};
  const out = {};
  try {
    const sdkSrc = await (await fetch(SDK_URL)).text();
    document.querySelectorAll('iframe').forEach(f => { try { f.remove(); } catch (e) {} });
    const fr = document.createElement('iframe');
    fr.style.display = 'none';
    document.body.appendChild(fr);
    await new Promise(r => setTimeout(r, 500));
    const rawWin = fr.contentWindow;
    // 装读取记录（包 iframe 的 window 自身）
    rawWin.eval(READ_HOOK);
    const W = rawWin.__proxied || rawWin;
    out.proxyOk = !!rawWin.__proxied;
    out.proxyErr = rawWin.__proxyErr || null;
    W._mssdk = window._mssdk;
    W.__cap = [];
    const of = rawWin.fetch.bind(rawWin);
    rawWin.fetch = function (u, i) {
      try { W.__cap.push(String(typeof u === 'string' ? u : (u && u.url))); } catch (e) {}
      return of(u, i);
    };
    rawWin.eval(sdkSrc);
    out.hasAc = !!W.byted_acrawler;
    if (!out.hasAc) { fr.remove(); return btoa(unescape(encodeURIComponent(JSON.stringify(out)))); }
    const m = W._mssdk, c = (m && m.cacheOpts && m.cacheOpts['1988']) || {};
    W.byted_acrawler.init({ aid: 1988, dfp: !!c.dfp, boe: !!c.boe, intercept: !!c.intercept,
      enablePathList: c.enablePathList || [], region: c.region || 'sg-tiktok', apiHost: c.apiHost || '',
      mode: c.mode != null ? c.mode : 516, isSDK: false, custom: c.custom || {} });
    W.__reads = {};                       // 重置，只统计签名阶段
    W.__readsOn(true);
    await rawWin.fetch('https://www.tiktok.com' + PATH + '?' + RAW, { headers: { 'Content-Type': 'application/json' } });
    await new Promise(r => setTimeout(r, 900));
    W.__readsOn(false);
    const hit = (W.__cap || []).filter(u => u.indexOf(PATH) !== -1).pop() || null;
    const dm = hit && new RegExp('[?&]X-Dynosaur=([^&]*)').exec(hit);
    out.dyLen = dm ? dm[1].length : 0;
    out.reads = W.__reads;
    fr.remove();
  } catch (e) { out.err = String(e && e.message); }
  return btoa(unescape(encodeURIComponent(JSON.stringify(out))));
}`;
  return evalInPage(fn);
}

/** Node 侧：同样的 Proxy 记录方式 */
async function runInNode() {
  const reqs = [];
  const env = createEnv({
    url: 'https://www.tiktok.com/@tiktok', mssdkConfig: loadSeedConfig(), cookie: '',
    fetchImpl: (u) => { reqs.push(u); return Promise.resolve(makeFakeResponse('{}', 200, u)); },
  });
  const target = Object.create(null);
  for (const k of Object.keys(env)) target[k] = env[k];
  const reads = {};
  let on = false;
  const proxy = new Proxy(target, {
    get(t, k) {
      if (on && typeof k === 'string') {
        const v = t[k];
        const e = reads[k] || (reads[k] = { n: 0, undef: 0 });
        e.n++; if (v === undefined) e.undef++;
      }
      return t[k];
    },
    has(t, k) {
      if (on && typeof k === 'string') { const e = reads['#' + k] || (reads['#' + k] = { n: 0, undef: 0 }); e.n++; }
      return k in t;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  const ctx = vm.createContext(proxy, { name: 'reads', codeGeneration: { strings: true, wasm: false } });
  installNativeProtect(target);
  new vm.Script(fs.readFileSync(path.join(__dirname, '..', '..', 'sources', 'webmssdk.1.0.0.417.js.orig'), 'utf8'),
    { filename: 'webmssdk.js' }).runInContext(ctx, { timeout: 30000 });
  const c = loadSeedConfig().cacheOpts['1988'];
  target.byted_acrawler.init({
    aid: 1988, dfp: false, boe: false, intercept: true, enablePathList: c.enablePathList,
    region: 'sg-tiktok', apiHost: '', mode: 516, isSDK: false, custom: c.custom,
  });
  for (const k of Object.keys(reads)) delete reads[k];
  on = true;
  await vm.runInContext(`fetch('https://www.tiktok.com${PATH_}?${RAW}',{method:'GET'})`, ctx, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 500));
  on = false;
  const url = reqs.filter(u => u.indexOf(PATH_) !== -1).pop() || null;
  const dm = url && new RegExp('[?&]X-Dynosaur=([^&]*)').exec(url);
  return { reads, dyLen: dm ? dm[1].length : 0, url };
}

(async () => {
  console.log('=== ① 真浏览器 iframe（Proxy 记录 window 读取）===');
  const B = runInBrowser();
  if (B.err) console.log('   ⚠️ %s', B.err);
  console.log('   proxyOk=%s  X-Dynosaur=%s  记录到的属性数=%d',
    B.proxyOk, B.dyLen || '(无)', B.reads ? Object.keys(B.reads).length : 0);
  if (B.proxyErr) console.log('   proxyErr=%s', B.proxyErr);

  console.log('\n=== ② Node vm 补环境（同样 Proxy 记录）===');
  const N = await runInNode();
  console.log('   X-Dynosaur=%s  记录到的属性数=%d', N.dyLen || '(无)', Object.keys(N.reads).length);

  const br = B.reads || {}, nr = N.reads;
  const onlyB = Object.keys(br).filter(k => !(k in nr)).sort();
  const onlyN = Object.keys(nr).filter(k => !(k in br)).sort();
  const undefB = Object.keys(br).filter(k => br[k].undef > 0).sort();
  const undefN = Object.keys(nr).filter(k => nr[k].undef > 0).sort();

  console.log('\n=== 只在浏览器侧被读到的属性（Node 缺 = 重点嫌疑）===');
  console.log(onlyB.length ? onlyB.map(k => '   ' + k + '  n=' + br[k].n + ' undef=' + br[k].undef).join('\n') : '   （无）');
  console.log('\n=== 只在 Node 侧被读到的属性 ===');
  console.log(onlyN.length ? onlyN.map(k => '   ' + k + '  n=' + nr[k].n).join('\n') : '   （无）');
  console.log('\n=== 读到 undefined 的属性 ===');
  console.log('   浏览器: ' + (undefB.length ? undefB.join(', ') : '（无）'));
  console.log('   Node  : ' + (undefN.length ? undefN.join(', ') : '（无）'));

  console.log('\n=== 两侧次数差异最大的 20 个 ===');
  const all = Array.from(new Set([...Object.keys(br), ...Object.keys(nr)]));
  const diffs = all.map(k => ({ k, b: (br[k] || {}).n || 0, n: (nr[k] || {}).n || 0 }))
    .filter(x => x.b !== x.n)
    .sort((a, c) => Math.abs(c.b - c.n) - Math.abs(a.b - a.n));
  diffs.slice(0, 20).forEach(x => console.log('   ' + x.k.padEnd(24) + '浏览器=' + String(x.b).padEnd(7) + 'Node=' + x.n));

  fs.writeFileSync(path.join(ART, 'probe-global-reads.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    browser: { dyLen: B.dyLen, proxyOk: B.proxyOk, reads: br },
    node: { dyLen: N.dyLen, reads: nr },
    onlyBrowser: onlyB, onlyNode: onlyN, undefBrowser: undefB, undefNode: undefN,
  }, null, 1));
  console.log('\n-> tiktok/artifacts/probe-global-reads.json');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 10).join('\n') : e); process.exit(1); });