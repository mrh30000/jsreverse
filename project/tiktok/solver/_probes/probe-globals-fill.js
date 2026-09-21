/**
 * 探针 AA（下一步建议的收口实验）：把「浏览器有、Node 缺」的全局**按组补齐**，
 * 看哪一组能让离线签名变为被服务端接受。
 *
 * 依据：probe-env-value-diff.js 列出了 73 项 Node 缺失全局 + 5 项类型不同。
 * 之前只试过其中 20 项（未生效），这次做**全量 + 分组**，避免漏项。
 *
 * 判定：某一组补齐后签名由「被拒」变「被接受」⇒ 该组即根因。
 *       全部补齐仍未通过 ⇒ 说明缺的不是「某个全局的存在」，而是**语义/行为**层面的差异
 *       （如 self/top/parent 是真正的 Window 而非普通对象、Storage 是真 Storage 等）。
 *
 * 用法：
 *   cd /d/work/jsreverse && proxycli open && proxycli browser connect --cloak
 *   node tiktok/solver/_probes/probe-globals-fill.js
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const os = require('os');
const { execFileSync } = require('child_process');
const path = require('path');
const { createEnv, makeFakeResponse } = require('../tt_env');
const { installNativeProtect } = require('../tt_native');
const { loadSeedConfig, TikTokSigner } = require('../tt_sign');

const ART = path.join(__dirname, '..', '..', 'artifacts');
const SDK = path.join(__dirname, '..', '..', 'sources', 'webmssdk.1.0.0.417.js.orig');
const PATH_ = '/api/post/item_list/';
const RAW = 'WebIdLastTime=0&aid=1988&app_language=zh-Hans&app_name=tiktok_web&browser_language=zh-CN&browser_name=Mozilla&browser_online=true&browser_platform=Win32&browser_version=5.0%20(Windows%20NT%2010.0%3B%20Win64%3B%20x64)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F153.0.0.0%20Safari%2F537.36&channel=tiktok_web&cookie_enabled=true&count=16&coverFormat=2&cursor=0&data_collection_enabled=false&device_id=7686701696877217301&device_platform=web_pc&focus_state=true&history_len=4&is_fullscreen=false&is_page_visible=true&language=zh-Hans&odinId=7686701682830672912&os=windows&priority_region=&referer=https%3A%2F%2Fwww.tiktok.com%2F%40tiktok&region=TW&root_referer=https%3A%2F%2Fwww.tiktok.com%2F&screen_height=1080&screen_width=1920&secUid=MS4wLjABAAAAv7iSuuXDJGDvJkmH_vz1qkDZYo1apxgzaxdBSeIuPiM&tz_name=Asia%2FSingapore&user_is_login=false&verifyFp=verify_mu6d0neq_4CnjBa5N_m9I3_4VB1_9u05_8E4p9t3KhC8u&video_encoding=dash&webcast_language=zh-Hans';

/** 分组补齐：每组一个 stub 生成器（尽量贴近浏览器语义，不要只给 empty object） */
const GROUPS = {
  'g01 加密/存储': (s) => {
    s.Crypto = class Crypto {};
    s.crypto.constructor = s.Crypto;
    s.CryptoKey = class CryptoKey {};
    s.SubtleCrypto = class SubtleCrypto {};
    s.indexedDB = { open: () => ({ onsuccess: null, onerror: null, onupgradeneeded: null, result: null }), deleteDatabase: () => ({}) };
    s.caches = { open: () => Promise.resolve({ match: () => Promise.resolve(undefined), put: () => Promise.resolve(), keys: () => Promise.resolve([]), delete: () => Promise.resolve(false) }), keys: () => Promise.resolve([]), delete: () => Promise.resolve(false), has: () => Promise.resolve(false) };
    s.CookieStore = class CookieStore { get() { return Promise.resolve(null); } getAll() { return Promise.resolve([]); } set() { return Promise.resolve(); } delete() { return Promise.resolve(); } };
  },
  'g02 网络/通道': (s) => {
    s.WebSocket = class WebSocket { constructor() { this.readyState = 0; } close() {} send() {} addEventListener() {} };
    s.MessagePort = class MessagePort { postMessage() {} addEventListener() {} removeEventListener() {} };
    s.BroadcastChannel = class BroadcastChannel { constructor() { this.name = ''; } postMessage() {} close() {} addEventListener() {} };
    s.EventSource = class EventSource { constructor() {} close() {} addEventListener() {} };
    s.AbortController = class AbortController { constructor() { this.signal = new s.AbortSignal(); } abort() {} };
    s.AbortSignal = class AbortSignal { constructor() { this.aborted = false; } addEventListener() {} };
    s.FormData = class FormData { append() {} getAll() { return []; } entries() { return [][Symbol.iterator](); } };
    s.File = class File { constructor(a, b) { this.name = (b && b.name) || ''; this.size = 0; this.type = ''; this.lastModified = Date.now(); } };
  },
  'g03 DOM 元素构造器': (s) => {
    s.HTMLElement = class HTMLElement {};
    s.Element = class Element {};
    s.Node = class Node {};
    s.NodeList = class NodeList { constructor() { this.length = 0; } item() { return null; } };
    s.HTMLCollection = class HTMLCollection { constructor() { this.length = 0; } item() { return null; } namedItem() { return null; } };
    s.Image = class Image { constructor() { this.width = 0; this.height = 0; this.complete = true; this.naturalWidth = 0; this.naturalHeight = 0; } addEventListener() {} };
    s.Audio = class Audio { constructor() { this.paused = true; this.volume = 1; } play() { return Promise.resolve(); } pause() {} addEventListener() {} };
    s.Option = class Option { constructor() {} };
    s.ErrorEvent = class ErrorEvent { constructor() {} };
    s.PromiseRejectionEvent = class PromiseRejectionEvent { constructor() {} };
    s.DOMException = class DOMException { constructor() {} };
    s.NodeList.prototype.item = () => null;
  },
  'g04 Canvas/WebGL': (s) => {
    s.HTMLCanvasElement = s.HTMLCanvasElement || class HTMLCanvasElement {};
    s.CanvasRenderingContext2D = class CanvasRenderingContext2D {};
    s.WebGLRenderingContext = class WebGLRenderingContext {};
    s.OffscreenCanvas = class OffscreenCanvas { constructor() { this.width = 0; this.height = 0; } getContext() { return null; } };
    s.ImageData = class ImageData { constructor(w, h) { this.width = w || 0; this.height = h || 0; this.data = new Uint8ClampedArray(Math.max(0, (w || 0) * (h || 0) * 4)); } };
    s.Path2D = class Path2D { constructor() {} };
    s.DOMParser = class DOMParser { parseFromString() { return s.document; } };
    s.CSS = { supports: () => false, escape: (x) => String(x) };
    s.CustomElementRegistry = class CustomElementRegistry { define() {} get() { return undefined; } whenDefined() { return Promise.resolve(); } };
    s.MediaQueryList = class MediaQueryList { constructor() { this.matches = false; this.media = ''; } addEventListener() {} };
  },
  'g05 navigator 子对象': (s) => {
    s.navigator.userAgentData = undefined;
    s.navigator.pdfViewerEnabled = true;
    s.navigator.globalPrivacyControl = true;
    s.navigator.locks = { request: () => Promise.resolve() };
    s.navigator.permissions = { query: () => Promise.resolve({ state: 'granted', onchange: null }) };
    s.navigator.storage = { estimate: () => Promise.resolve({ quota: 1e11, usage: 1e6 }), persisted: () => Promise.resolve(true), persist: () => Promise.resolve(true) };
    s.navigator.serviceWorker = { controller: null, ready: Promise.resolve({}), register: () => Promise.resolve({}), addEventListener() {} };
    s.navigator.gpu = undefined;
    s.navigator.mediaDevices = { enumerateDevices: () => Promise.resolve([]), getUserMedia: () => Promise.reject(new Error('x')) };
    s.navigator.bluetooth = undefined;
    s.navigator.usb = undefined;
    s.navigator.xr = undefined;
    s.navigator.wakeLock = { request: () => Promise.resolve({ release: () => Promise.resolve() }) };
    s.Permissions = class Permissions {};
    s.StorageManager = class StorageManager {};
    s.IDBFactory = class IDBFactory {};
    s.IDBKeyRange = { only: () => ({}), lowerBound: () => ({}), upperBound: () => ({}), bound: () => ({}) };
  },
  'g06 document 集合': (s) => {
    s.document.forms = { length: 0, item: () => null, namedItem: () => null };
    s.document.images = { length: 0, item: () => null, namedItem: () => null };
    s.document.embeds = { length: 0, item: () => null, namedItem: () => null };
    s.document.links = { length: 0, item: () => null, namedItem: () => null };
    s.document.anchors = { length: 0, item: () => null, namedItem: () => null };
    s.document.styleSheets = { length: 0, item: () => null };
  },
  'g07 chrome/external/etc': (s) => {
    s.chrome = { loadTimes: () => ({}), csi: () => ({}), app: { isInstalled: false, InstallState: {}, RunningState: {} } };
    s.external = { AddSearchProvider() {}, IsSearchProviderInstalled() { return 0; } };
    s.performance.navigation = { type: 0, redirectCount: 0 };
    s.performance.getEntries = () => [];
    s.Performance = class Performance {};
    s.PerformanceObserver = class PerformanceObserver { observe() {} disconnect() {} takeRecords() { return []; } };
  },
  'g08 杂项原生': (s) => {
    s.structuredClone = (x) => JSON.parse(JSON.stringify(x));
    s.reportError = () => {};
    s.print = () => {};
    s.CookieStore = s.CookieStore || class CookieStore {};
    s.Notification = class Notification { static requestPermission() { return Promise.resolve('granted'); } };
    s.Scheduler = class Scheduler {};
    s.TaskController = class TaskController {};
    s.ReportingObserver = class ReportingObserver {};
    s.visualViewport = { width: 1920, height: 947, scale: 1, offsetLeft: 0, offsetTop: 0, pageLeft: 0, pageTop: 0, addEventListener() {}, removeEventListener() {} };
    s.speechSynthesis = { getVoices: () => [], speak() {}, cancel() {}, addEventListener() {} };
    s.crossOriginIsolated = false;
    s.URLPattern = class URLPattern { constructor() {} test() { return false; } };
  },
};


/**
 * 取页面**真实发出**的完整 URL（含业务参数与登录态）。
 * 做法：导航到用户页让页面自然发一次 post/item_list，再从 proxycli 网络记录里捞回来。
 * 为什么不用 pageSigned(手拼 raw)：手拼 query 缺业务参数，浏览器现签也会返回空体。
 */
async function realPageUrl(apiPath) {
  const { proxycliAvailable } = require('../cdp-oracle');
  if (!proxycliAvailable()) throw new Error('本探针依赖 proxycli 后端（ORACLE_BACKEND=proxycli）');
  const run = (args, t) => execFileSync('proxycli', args, { encoding: 'utf8', timeout: t, shell: true, maxBuffer: 256 * 1024 * 1024 });
  run(['call', 'evaluate_script', '--file', (() => {
    const p = path.join(os.tmpdir(), 'fill-trigger.js');
    fs.writeFileSync(p, `async () => {
      document.querySelectorAll('iframe').forEach(f => { try { f.remove(); } catch (e) {} });
      try {
        const seg = location.pathname.split('/').filter(Boolean)[0] || '';
        const u = seg ? 'https://www.tiktok.com/' + seg.replace(/^@?/, '@') : 'https://www.tiktok.com/foryou';
        setTimeout(() => { location.href = u; }, 50);
      } catch (e) {}
      return btoa('nav');
    }`);
    return p;
  })(), '--allowAnyFrame', 'true', '--timeoutMs', '40000'], 90000);
  await new Promise(r => setTimeout(r, 15000));
  const out = run(['call', 'list_network_requests', '--urlFilter', apiPath, '--pageSize', '3'], 180000);
  const found = [...out.matchAll(/"(https:\/\/www\.tiktok\.com[^"]*?)"/g)].map(m => m[1]).filter(u => u.indexOf(apiPath) !== -1);
  return found.pop() || null;
}

async function signWith(applyGroups, storage, rawQuery) {
  const reqs = [];
  const env = createEnv({
    url: 'https://www.tiktok.com/@tiktok', mssdkConfig: loadSeedConfig(), cookie: '', storage,
    fetchImpl: (u) => { reqs.push(u); return Promise.resolve(makeFakeResponse('{}', 200, u)); },
  });
  // 先补齐全局，再建沙箱（SDK 会在加载时读取并缓存）
  for (const g of applyGroups) { try { GROUPS[g](env); } catch (e) { return { err: g + ':' + e.message }; } }
  const sandbox = Object.create(null);
  for (const k of Object.keys(env)) sandbox[k] = env[k];
  sandbox.console = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
  sandbox.globalThis = sandbox; sandbox.window = sandbox; sandbox.self = sandbox;
  sandbox.top = sandbox; sandbox.parent = sandbox;
  const ctx = vm.createContext(sandbox, { name: 'fill', codeGeneration: { strings: true, wasm: false } });
  installNativeProtect(sandbox);
  new vm.Script(fs.readFileSync(SDK, 'utf8'), { filename: 'webmssdk.js' }).runInContext(ctx, { timeout: 30000 });
  const c = loadSeedConfig().cacheOpts['1988'];
  sandbox.byted_acrawler.init({
    aid: 1988, dfp: false, boe: false, intercept: true, enablePathList: c.enablePathList,
    region: 'sg-tiktok', apiHost: '', mode: 516, isSDK: false, custom: c.custom,
  });
  await vm.runInContext(`fetch('https://www.tiktok.com${PATH_}?${rawQuery}',{method:'GET'})`, ctx, { timeout: 30000 });
  return { url: reqs.filter(u => u.indexOf(PATH_) !== -1).pop() || null };
}

(async () => {
  const get = (q, k) => { const m = new RegExp('[?&]' + k + '=([^&]*)').exec(q || ''); return m ? m[1] : ''; };
  const set = (q, k, v) => { const p = q.split('&'); const i = p.findIndex(s => s.split('=')[0] === k); if (i === -1) p.push(k + '=' + v); else p[i] = k + '=' + v; return p.join('&'); };
  const { pageSigned, runOracle, pageSession, proxycliAvailable } = require('../cdp-oracle');
  // ★ 用**页面真实发出的完整 query** 作为基准，而不是自己拼。
  //   硬编码 query 的 device_id/odinId/verifyFp 与当前登录态 cookie 不匹配，
  //   而且缺 secUid/from_page 等业务参数 —— 会导致连页面自签都拿不到数据，实验没有基准。
  const realUrl = await realPageUrl(PATH_);
  if (!realUrl) throw new Error('未从网络记录里取到页面真实请求 URL');
  const SIG = ['X-Bogus', 'X-Gnarly', 'X-Dynosaur', 'msToken'];
  const RAW_REAL = realUrl.slice(realUrl.indexOf('?') + 1).split('&').filter(s => !SIG.includes(s.split('=')[0])).join('&');
  console.log('页面真实 query: %d 个参数', RAW_REAL.split('&').length);

  const page = await pageSession();
  const liveMs = get(realUrl, 'msToken');
  const storage = {
    local: Object.assign({}, page.local, { msToken: liveMs, xmst: liveMs }),
    session: Object.assign({}, page.session, { msToken: liveMs }),
  };
  const B = realUrl;

  const names = Object.keys(GROUPS);
  const plans = [
    ['⓪ 不补（基线）', []],
    ...names.map(g => [g, [g]]),
    ['★ 全部补齐', names],
  ];
  const urls = [B], labels = ['★ 页面基准'];
  for (const [n, gs] of plans) {
    const r = await signWith(gs, storage, RAW_REAL);
    if (r.err) { console.log('%s -> ERR %s', n.padEnd(22), r.err); labels.push(n + ' ERR'); urls.push(B); continue; }
    console.log('%s -> dy=%s', n.padEnd(22), get(r.url, 'X-Dynosaur').length || '(无)');
    urls.push(set(B, 'X-Dynosaur', get(r.url, 'X-Dynosaur') || get(B, 'X-Dynosaur')));
    labels.push(n);
  }

  const res = await runOracle(urls);
  console.log('\n=== 送测（只替换 X-Dynosaur；其余字节同已接受的页面基准）===');
  labels.forEach((l, i) => console.log('   ' + l.padEnd(24) + (res[i] && res[i].ok ? '✅ ' + res[i].detail : '❌ ' + (res[i] && res[i].detail))));
  const won = labels.filter((l, i) => i > 0 && res[i] && res[i].ok);
  console.log('\n判定：%s', won.length
    ? '✅ 补齐「' + won.join('、') + '」后签名变为被接受 ⇒ 根因锁定在该组'
    : '❌ 全部补齐后仍被拒 ⇒ 缺的不是「某个全局的存在」，而是**语义/行为**差异\n' +
      '   （如 self/top/parent 是真 Window 而非普通对象、Storage 是真 Storage、原生函数 toString 等）');

  fs.writeFileSync(path.join(ART, 'probe-globals-fill.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), results: labels.map((l, i) => ({ name: l, ...(res[i] || {}) })), won }, null, 1));
  console.log('-> tiktok/artifacts/probe-globals-fill.json');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 10).join('\n') : e); process.exit(1); });