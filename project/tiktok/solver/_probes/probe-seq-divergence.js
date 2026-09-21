/**
 * 探针 X：跨环境「调用序列」逐位置比对，定位 Node 补环境与真浏览器的分叉点。
 *
 * 为什么需要它：probe-call-diff.js 测到签名期间浏览器调 `Math.random` 约 400 次、Node 只 1 次
 * —— 差三个数量级，说明两边**不是同一条代码路径**：Node 大概率在某处失败后走了 fallback，
 * 且异常被 SDK 吞掉。所以「对比读了哪些全局」找不到原因，必须找**分叉点**。
 *
 * 手法：
 *   ① Node vm 补环境里跑 webmssdk + 页面真配置，插桩记录调用序列（插桩必须早于 SDK 求值）
 *   ② 把这份序列作为参数传给页面，让**页面自己**在真浏览器 iframe 里跑同样流程并做逐位置 diff
 *      （在页面里 diff 是因为 proxycli worker 模式不支持把大结果写文件，回传几十 KB 会撑爆上下文）
 *   ③ 只回传「计数表 + 第一处分叉及上下文」
 *
 * 为什么用 proxycli 而不是裸 CDP：本机调试实例由 proxycli daemon 接管，
 * 直连 19222 会拿不到；proxycli 自带 attach 与 frame 上下文管理。
 *
 * 用法：
 *   cd /d/work/jsreverse && proxycli open && proxycli browser connect --cloak
 *   node tiktok/solver/_probes/probe-seq-divergence.js
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
const SDK = path.join(__dirname, '..', '..', 'sources', 'webmssdk.1.0.0.417.js.orig');
/** 页面自己 fetch 这个 URL（内联 243KB 源会因脚本体积静默失败） */
const SDK_URL = 'https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/webmssdk/1.0.0.417/webmssdk.js';
const PATH_ = '/api/post/item_list/';
const CAP = 20000;

const RAW = 'WebIdLastTime=0&aid=1988&app_language=zh-Hans&app_name=tiktok_web&browser_language=zh-CN&browser_name=Mozilla&browser_online=true&browser_platform=Win32&browser_version=5.0%20(Windows%20NT%2010.0%3B%20Win64%3B%20x64)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F153.0.0.0%20Safari%2F537.36&channel=tiktok_web&cookie_enabled=true&count=16&coverFormat=2&cursor=0&data_collection_enabled=false&device_id=7686701696877217301&device_platform=web_pc&focus_state=true&history_len=4&is_fullscreen=false&is_page_visible=true&language=zh-Hans&odinId=7686701682830672912&os=windows&priority_region=&referer=https%3A%2F%2Fwww.tiktok.com%2F%40tiktok&region=TW&root_referer=https%3A%2F%2Fwww.tiktok.com%2F&screen_height=1080&screen_width=1920&secUid=MS4wLjABAAAAv7iSuuXDJGDvJkmH_vz1qkDZYo1apxgzaxdBSeIuPiM&tz_name=Asia%2FSingapore&user_is_login=false&verifyFp=verify_mu6d0neq_4CnjBa5N_m9I3_4VB1_9u05_8E4p9t3KhC8u&video_encoding=dash&webcast_language=zh-Hans';

const HOOK_SRC = `
(function (w) {
  var L = w.__seq = [];
  function rec(tag, arg) { if (L.length < ${CAP}) L.push(arg === undefined ? tag : tag + '|' + arg); }
  function wrap(obj, name, tag, fmt) {
    try {
      var f = obj[name];
      if (typeof f !== 'function') return false;
      obj[name] = function () {
        var r;
        try { r = f.apply(this, arguments); } catch (e) { rec(tag + ':THROW'); throw e; }
        rec(tag, fmt ? fmt(arguments, r) : undefined);
        return r;
      };
      return true;
    } catch (e) { return false; }
  }
  var ok = {};
  ok['Math.random'] = wrap(w.Math, 'random', 'random');
  ok['btoa'] = wrap(w, 'btoa', 'btoa', function (a) { return String(a).length; });
  ok['atob'] = wrap(w, 'atob', 'atob', function (a) { return String(a).length; });
  ok['perf.now'] = wrap(w.performance, 'now', 'pnow');
  ok['crypto.grv'] = wrap(w.crypto, 'getRandomValues', 'grv', function (a) { return a[0] && a[0].length; });
  ok['crypto.uuid'] = wrap(w.crypto, 'randomUUID', 'uuid');
  ok['eUC'] = wrap(w, 'encodeURIComponent', 'eUC', function (a) { return String(a).length; });
  ok['dUC'] = wrap(w, 'decodeURIComponent', 'dUC', function (a) { return String(a).length; });
  ok['JSON.stringify'] = wrap(w.JSON, 'stringify', 'jstr');
  ok['JSON.parse'] = wrap(w.JSON, 'parse', 'jparse');
  try { var dn = w.Date.now; w.Date.now = function () { rec('datenow'); return dn.apply(this, arguments); }; ok['Date.now'] = true; } catch (e) { ok['Date.now'] = false; }
  // 注：不要替换 w.Date 本身 —— 会丢掉 Date 的静态方法/原型语义，SDK 直接报错
  w.__hookOk = ok;
})(window);
`;

const count = (seq) => { const m = {}; for (const e of seq) { const k = e.split('|')[0]; m[k] = (m[k] || 0) + 1; } return m; };

/** Node 侧：跑补环境签名并回收调用序列 */
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
  const ctx = vm.createContext(sandbox, { name: 'seqprobe', codeGeneration: { strings: true, wasm: false } });
  installNativeProtect(sandbox);
  vm.runInContext(HOOK_SRC, ctx, { timeout: 5000 });
  const hookOk = JSON.parse(vm.runInContext('JSON.stringify(globalThis.__hookOk||{})', ctx));
  new vm.Script(sdkSrc, { filename: 'webmssdk.js' }).runInContext(ctx, { timeout: 30000 });
  const c = loadSeedConfig().cacheOpts['1988'];
  sandbox.byted_acrawler.init({
    aid: 1988, dfp: false, boe: false, intercept: true, enablePathList: c.enablePathList,
    region: 'sg-tiktok', apiHost: '', mode: 516, isSDK: false, custom: c.custom,
  });
  vm.runInContext('globalThis.__seq.length = 0', ctx, { timeout: 5000 });
  await vm.runInContext(`fetch('https://www.tiktok.com${PATH_}?${RAW}',{method:'GET'})`, ctx, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 500));
  const seq = JSON.parse(vm.runInContext(`JSON.stringify((globalThis.__seq||[]).slice(0, ${CAP}))`, ctx, { timeout: 5000 }));
  const url = reqs.filter(u => u.indexOf(PATH_) !== -1).pop() || null;
  return { url, seq, hookOk, n: seq.length };
}

/** 浏览器侧：把 Node 序列传进页面，让页面在 iframe 里跑同流程并直接做 diff，只回传摘要。
 *  注意：不要把 SDK 原码（243KB）内联进脚本 —— proxycli 对脚本体积敏感，会静默失败。
 *  改成页面自己 fetch ttwstatic（同源 CORS 允许）。 */
function runInBrowser(sdkUrl, storage, nodeSeq) {
  const pageFn = `
async () => {
  const SDK_URL = ${JSON.stringify(sdkUrl)};
  const HOOK = ${JSON.stringify(HOOK_SRC)};
  const NODE_SEQ = ${JSON.stringify(nodeSeq)};
  const PATH = ${JSON.stringify(PATH_)};
  const RAW = ${JSON.stringify(RAW)};
  const STORAGE = ${JSON.stringify(storage)};

  const out = {};
  try {
    const sdkSrc = await (await fetch(SDK_URL)).text();
    out.sdkLen = sdkSrc.length;
    document.querySelectorAll('iframe').forEach(f => { try { f.remove(); } catch (e) {} });
    const fr = document.createElement('iframe');
    fr.style.display = 'none';
    document.body.appendChild(fr);
    await new Promise(r => setTimeout(r, 400));
    const w = fr.contentWindow;
    w._mssdk = window._mssdk;
    try { Object.keys(STORAGE.local).forEach(k => w.localStorage.setItem(k, STORAGE.local[k])); } catch (e) {}
    try { Object.keys(STORAGE.session).forEach(k => w.sessionStorage.setItem(k, STORAGE.session[k])); } catch (e) {}
    w.__cap = [];
    const of = w.fetch.bind(w);
    w.fetch = function (u, i) {
      try { w.__cap.push(String(typeof u === 'string' ? u : (u && u.url))); } catch (e) {}
      return of(u, i);
    };
    w.eval(HOOK);                                 // ★ 必须早于 eval(sdkSrc)
    out.hookOk = w.__hookOk;
    w.eval(sdkSrc);
    out.hasAc = !!w.byted_acrawler;
    if (!out.hasAc) { fr.remove(); return JSON.stringify(out); }
    const m = w._mssdk, c = (m && m.cacheOpts && m.cacheOpts['1988']) || {};
    w.byted_acrawler.init({ aid: 1988, dfp: !!c.dfp, boe: !!c.boe, intercept: !!c.intercept,
      enablePathList: c.enablePathList || [], region: c.region || 'sg-tiktok', apiHost: c.apiHost || '',
      mode: c.mode != null ? c.mode : 516, isSDK: false, custom: c.custom || {} });
    w.__seq.length = 0;
    await w.fetch('https://www.tiktok.com' + PATH + '?' + RAW, { headers: { 'Content-Type': 'application/json' } });
    await new Promise(r => setTimeout(r, 800));
    const hit = (w.__cap || []).filter(u => u.indexOf(PATH) !== -1).pop() || null;
    const dm = hit && new RegExp('[?&]X-Dynosaur=([^&]*)').exec(hit);
    out.dyLen = dm ? dm[1].length : 0;

    const B = w.__seq;
    const cnt = (seq) => { const o = {}; for (const e of seq) { const k = e.split('|')[0]; o[k] = (o[k] || 0) + 1; } return o; };
    out.browserCounts = cnt(B);
    out.browserN = B.length;
    let i = 0;
    while (i < B.length && i < NODE_SEQ.length && B[i] === NODE_SEQ[i]) i++;
    out.divergence = i;
    out.before = B.slice(Math.max(0, i - 10), i);
    out.browserAfter = B.slice(i, i + 18);
    out.nodeAfter = NODE_SEQ.slice(i, i + 18);
    out.browserHead = B.slice(0, 6);
    out.nodeHead = NODE_SEQ.slice(0, 6);
    out.browserTail = B.slice(-6);
    out.nodeTail = NODE_SEQ.slice(-6);
    fr.remove();
  } catch (e) { out.err = String(e && e.message); }
  // ★ 用 base64 回传：结果里满是引号/反斜杠，走 shell 中转的转义极容易损坏
  return btoa(unescape(encodeURIComponent(JSON.stringify(out))));
}`;
  const scriptPath = path.join(os.tmpdir(), 'probe-seq-browser.js');
  fs.writeFileSync(scriptPath, pageFn);
  const raw = execFileSync('proxycli', [
    'call', 'evaluate_script', '--file', scriptPath,
    '--allowAnyFrame', 'true', '--timeoutMs', '180000',
  ], { encoding: 'utf8', timeout: 240000, shell: true });
  // 回传是 base64（见页面函数末尾注释）。base64 里没有引号/反斜杠，所以按行扫 value 即可，
  // 不用正则去拆转义文本（shell 中转会吃反斜杠，正则维护成本高且易错）。
  const line = raw.split(/\r?\n/).map(l => l.trim()).find(l => /^value:\s*[A-Za-z0-9+/=]{16,}$/.test(l));
  if (!line) throw new Error('未在 proxycli 输出里找到 base64 value：\n' + raw.slice(0, 1200));
  const payload = line.replace(/^value:\s*/, '');
  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
}

(async () => {
  const sdkSrc = fs.readFileSync(SDK, 'utf8');
  const sess = JSON.parse(fs.readFileSync(path.join(ART, 'session-dump.json'), 'utf8'));
  const storage = { local: sess.local, session: sess.session };   // 两侧同一份会话材料

  console.log('=== ① Node vm 补环境 ===');
  const N = await runInNode(sdkSrc, storage);
  const getK = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]*)').exec(u || ''); return m ? m[1] : ''; };
  console.log('   hookOk=%s  X-Dynosaur=%s  seq=%d', JSON.stringify(N.hookOk), getK(N.url, 'X-Dynosaur').length || '(无)', N.n);

  console.log('\n=== ② 真浏览器 iframe（proxycli 驱动，diff 在页面内完成）===');
  const B = runInBrowser(SDK_URL, storage, N.seq);
  if (B.err) console.log('   ⚠️ %s', B.err);
  console.log('   hookOk=%s  X-Dynosaur=%s  seq=%d', JSON.stringify(B.hookOk), B.dyLen || '(无)', B.browserN || 0);

  const cn = count(N.seq), cb = B.browserCounts || {};
  console.log('\n=== 调用次数对比 ===');
  for (const k of Array.from(new Set([...Object.keys(cb), ...Object.keys(cn)])).sort()) {
    const a = cb[k] || 0, b = cn[k] || 0;
    console.log('   ' + k.padEnd(14) + '浏览器=' + String(a).padEnd(7) + 'Node=' + String(b).padEnd(7) + (a === b ? '' : ' ← 差异'));
  }

  console.log('\n=== 第一处分叉 ===');
  if (B.divergence == null) console.log('   （无结果）');
  else if (B.divergence >= (B.browserN || 0) && B.divergence >= N.n) console.log('   两侧序列完全相同（%d 条）', B.browserN);
  else {
    console.log('   位置 #%d   浏览器共 %d 条 / Node 共 %d 条', B.divergence, B.browserN, N.n);
    console.log('   ── 分叉前最后 10 个共同事件（「走岔」前的最后动作）:');
    (B.before || []).forEach((e, j) => console.log('      #%d  %s', B.divergence - (B.before.length - j), e));
    console.log('   ── 浏览器此后 18 个:');
    (B.browserAfter || []).forEach((e, j) => console.log('      #%d  %s', B.divergence + j, e));
    console.log('   ── Node 此后 18 个:');
    (B.nodeAfter || []).forEach((e, j) => console.log('      #%d  %s', B.divergence + j, e));
    console.log('\n   读法：分叉点前最后 1 个事件 = SDK 在此分道扬镳的那个动作；顺着它回溯即可定位缺失输入。');
  }

  fs.writeFileSync(path.join(ART, 'probe-seq-divergence.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    node: { n: N.n, dyLen: getK(N.url, 'X-Dynosaur').length, hookOk: N.hookOk, counts: cn, head: N.seq.slice(0, 20), tail: N.seq.slice(-20) },
    browser: { n: B.browserN, dyLen: B.dyLen, hookOk: B.hookOk, err: B.err || null, counts: cb, head: B.browserHead, tail: B.browserTail },
    firstDivergence: B.divergence, before: B.before, browserAfter: B.browserAfter, nodeAfter: B.nodeAfter,
  }, null, 1));
  console.log('\n摘要 -> tiktok/artifacts/probe-seq-divergence.json');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 10).join('\n') : e); process.exit(1); });