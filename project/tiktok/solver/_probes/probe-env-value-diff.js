/**
 * 探针 Z（下一步建议的实施）：找出 Node 补环境与真浏览器**读到的值**差异。
 *
 * 背景链条：
 *   · probe-seq-divergence 证明两侧**调用序列几乎一致**（88 vs 87，仅差一次 Date.now）
 *     ⇒ SDK 没走不同分支，那签名不同只能是**读到的值不同**。
 *   · 用 Proxy 包整个 sandbox 会破坏 vm 的全局语义（SDK 直接 `t is not a constructor` 报错），
 *     所以改成**白名单取值快照**：把候选环境属性在签名前后各取一次值，两侧 diff。
 *
 * 候选清单 = 浏览器 iframe 有、Node 沙箱可能缺/不等价的全局（含内建对象与嵌套属性），
 * 逐项取「类型 + 稳定摘要」，两侧对齐后打印差异。
 *
 * 用法：
 *   cd /d/work/jsreverse && proxycli open && proxycli browser connect --cloak
 *   node tiktok/solver/_probes/probe-env-value-diff.js
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { createEnv } = require('../tt_env');
const { installNativeProtect } = require('../tt_native');
const { loadSeedConfig } = require('../tt_sign');

const ART = path.join(__dirname, '..', '..', 'artifacts');
const SDK_URL = 'https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/webmssdk/1.0.0.417/webmssdk.js';

/** 候选属性清单：SDK 可能用来参与指纹/加密的全局。取「值摘要」而非仅类型。 */
const CANDIDATES = [
  // 顶层全局
  'Math', 'Date', 'JSON', 'Intl', 'Proxy', 'Reflect', 'Symbol', 'Promise', 'BigInt', 'Number', 'String',
  'Array', 'Object', 'Function', 'RegExp', 'Error', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Boolean',
  'Uint8Array', 'Uint16Array', 'Uint32Array', 'Int8Array', 'Int16Array', 'Int32Array', 'Float32Array',
  'Float64Array', 'BigInt64Array', 'BigUint64Array', 'ArrayBuffer', 'DataView', 'SharedArrayBuffer',
  'TextEncoder', 'TextDecoder', 'URL', 'URLSearchParams', 'Blob', 'File', 'FormData', 'Headers',
  'Request', 'Response', 'fetch', 'XMLHttpRequest', 'WebSocket', 'Worker', 'SharedWorker',
  'MessageChannel', 'MessagePort', 'BroadcastChannel', 'EventSource', 'AbortController', 'AbortSignal',
  'crypto', 'Crypto', 'CryptoKey', 'SubtleCrypto', 'performance', 'Performance', 'PerformanceObserver',
  'MutationObserver', 'IntersectionObserver', 'ResizeObserver', 'RTCPeerConnection', 'webkitRTCPeerConnection',
  'navigator', 'screen', 'document', 'history', 'location', 'localStorage', 'sessionStorage',
  'atob', 'btoa', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI', 'escape', 'unescape',
  'structuredClone', 'queueMicrotask', 'requestAnimationFrame', 'requestIdleCallback', 'setTimeout',
  'setInterval', 'clearTimeout', 'clearInterval', 'reportError', 'matchMedia', 'getComputedStyle',
  'addEventListener', 'removeEventListener', 'dispatchEvent', 'postMessage', 'open', 'close', 'focus', 'blur',
  'alert', 'confirm', 'prompt', 'print', 'indexedDB', 'caches', 'CookieStore', 'Notification', 'Permissions',
  'StorageManager', 'visualViewport', 'speechSynthesis', 'isSecureContext', 'crossOriginIsolated',
  'devicePixelRatio', 'innerWidth', 'innerHeight', 'outerWidth', 'outerHeight', 'scrollX', 'scrollY',
  'screenX', 'screenY', 'pageXOffset', 'pageYOffset', 'origin', 'name', 'length', 'closed', 'opener',
  'status', 'self', 'top', 'parent', 'frames', 'window', 'globalThis', 'WebAssembly', 'Event', 'CustomEvent',
  'ErrorEvent', 'PromiseRejectionEvent', 'Image', 'Audio', 'Option', 'HTMLElement', 'HTMLCanvasElement',
  'CanvasRenderingContext2D', 'WebGLRenderingContext', 'OffscreenCanvas', 'ImageData', 'Path2D', 'DOMParser',
  'Node', 'Element', 'NodeList', 'HTMLCollection', 'CSS', 'CustomElementRegistry', 'MediaQueryList',
  'IDBFactory', 'IDBKeyRange', 'DOMException', 'URLPattern', 'ReportingObserver', 'Scheduler', 'TaskController',
  // 嵌套（SDK 常读的）
  'navigator.userAgent', 'navigator.platform', 'navigator.language', 'navigator.languages', 'navigator.vendor',
  'navigator.hardwareConcurrency', 'navigator.deviceMemory', 'navigator.maxTouchPoints', 'navigator.webdriver',
  'navigator.cookieEnabled', 'navigator.onLine', 'navigator.doNotTrack', 'navigator.product', 'navigator.productSub',
  'navigator.appCodeName', 'navigator.appName', 'navigator.appVersion', 'navigator.userAgentData', 'navigator.plugins',
  'navigator.mimeTypes', 'navigator.pdfViewerEnabled', 'navigator.globalPrivacyControl', 'navigator.locks',
  'navigator.permissions', 'navigator.storage', 'navigator.serviceWorker', 'navigator.connection', 'navigator.gpu',
  'navigator.mediaDevices', 'navigator.bluetooth', 'navigator.usb', 'navigator.xr', 'navigator.wakeLock',
  'screen.width', 'screen.height', 'screen.availWidth', 'screen.availHeight', 'screen.colorDepth',
  'screen.pixelDepth', 'screen.orientation',
  'location.href', 'location.origin', 'location.protocol', 'location.host', 'location.hostname',
  'location.pathname', 'location.search', 'location.hash', 'location.port',
  'document.cookie', 'document.referrer', 'document.title', 'document.URL', 'document.readyState',
  'document.visibilityState', 'document.hidden', 'document.characterSet', 'document.compatMode',
  'document.documentElement', 'document.scripts', 'document.forms', 'document.images', 'document.embeds',
  'document.hasFocus', 'document.createElement', 'document.addEventListener', 'document.cookie',
  'history.length', 'history.state', 'history.scrollRestoration',
  'performance.now', 'performance.timeOrigin', 'performance.timing', 'performance.navigation',
  'performance.getEntries', 'performance.getEntriesByType', 'performance.memory', 'performance.mark',
  'crypto.getRandomValues', 'crypto.randomUUID', 'crypto.subtle',
  'localStorage.length', 'sessionStorage.length',
  'Intl.DateTimeFormat', 'Intl.NumberFormat', 'Intl.Collator', 'Intl.RelativeTimeFormat',
  'Math.random', 'Math.max', 'Math.min', 'Math.floor', 'Math.abs', 'Math.imul', 'Math.clz32', 'Math.fround',
  'Date.now', 'Date.UTC', 'Date.parse',
  'JSON.stringify', 'JSON.parse',
  'Function.prototype.toString', 'Object.prototype.toString', 'Array.prototype.push', 'String.prototype.charCodeAt',
  'window.chrome', 'chrome', 'window.external', 'external',
  'window.__proto__', 'navigator.__proto__', 'screen.__proto__',
];

/** 生成取值脚本：对每个候选路径求值并转成「稳定摘要」 */
function buildSnapshotFn() {
  const paths = JSON.stringify(CANDIDATES);
  return `
function () {
  const PATHS = ${paths};
  const out = {};
  const get = (obj, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const sum = (v) => {
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    const t = typeof v;
    if (t === 'function') {
      let s; try { s = Function.prototype.toString.call(v); } catch (e) { s = ''; }
      const native = /\\[native code\\]/.test(s);
      return 'function:' + (v.name || '') + ':' + (native ? 'native' : 'js') + ':' + s.length;
    }
    if (t === 'string') return 'string:' + v.length + ':' + v.slice(0, 40);
    if (t === 'number' || t === 'boolean' || t === 'bigint') return t + ':' + String(v);
    if (t === 'symbol') return 'symbol:' + String(v);
    if (t === 'object') {
      if (Array.isArray(v)) return 'array[' + v.length + ']';
      if (v instanceof RegExp) return 'regexp:' + v.source;
      let keys; try { keys = Object.keys(v); } catch (e) { keys = []; }
      let own; try { own = Object.getOwnPropertyNames(v); } catch (e) { own = []; }
      let proto; try { proto = Object.prototype.toString.call(v); } catch (e) { proto = '?'; }
      return 'object:' + proto + ':keys=' + keys.length + ':own=' + own.length + ':[' + own.slice(0, 12).join(',') + ']';
    }
    return t;
  };
  for (const p of PATHS) {
    try { out[p] = sum(get(window, p)); } catch (e) { out[p] = 'THROW:' + String(e && e.message); }
  }
  return out;
}`;
}

function proxycli(args, timeout = 300000) {
  return execFileSync('proxycli', args, { encoding: 'utf8', timeout, shell: true });
}
function evalInPage(fnSrc, timeoutMs = 240000) {
  const p = path.join(os.tmpdir(), 'probe-env-diff.js');
  fs.writeFileSync(p, fnSrc);
  const raw = proxycli(['call', 'evaluate_script', '--file', p, '--allowAnyFrame', 'true', '--timeoutMs', String(timeoutMs)], timeoutMs + 60000);
  const line = raw.split(/\r?\n/).map(l => l.trim()).find(l => /^value:\s*[A-Za-z0-9+/=]{2,}$/.test(l));
  if (!line) throw new Error('未取到 base64 value:\n' + raw.slice(0, 900));
  const text = Buffer.from(line.replace(/^value:\s*/, ''), 'base64').toString('utf8');
  try { return JSON.parse(text); } catch (e) { return text; }
}

/** 浏览器侧：在 iframe 里取快照（iframe 与主页面环境基本一致，且是 SDK 实际运行的地方） */
function browserSnapshot() {
  const snap = buildSnapshotFn();
  const fn = `
async () => {
  document.querySelectorAll('iframe').forEach(f => { try { f.remove(); } catch (e) {} });
  const fr = document.createElement('iframe');
  fr.style.display = 'none';
  document.body.appendChild(fr);
  await new Promise(r => setTimeout(r, 500));
  const out = {};
  try {
    const snapFn = ${snap};
    // 在 iframe 的全局里求值（不能直接把函数对象跨 realm 传，用 eval 让它在子帧里定义）
    fr.contentWindow.__snapFn = snapFn;
    out.snap = fr.contentWindow.eval('__snapFn()');
  } catch (e) { out.err = String(e && e.message); }
  fr.remove();
  return btoa(unescape(encodeURIComponent(JSON.stringify(out))));
}`;
  return evalInPage(fn);
}

/** Node 侧：在 sandbox 里取同样的快照 */
function nodeSnapshot() {
  const env = createEnv({ url: 'https://www.tiktok.com/@tiktok', mssdkConfig: loadSeedConfig(), cookie: '' });
  const sandbox = Object.create(null);
  for (const k of Object.keys(env)) sandbox[k] = env[k];
  sandbox.console = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
  sandbox.globalThis = sandbox; sandbox.window = sandbox; sandbox.self = sandbox;
  sandbox.top = sandbox; sandbox.parent = sandbox;
  const ctx = vm.createContext(sandbox, { name: 'snap', codeGeneration: { strings: true, wasm: false } });
  installNativeProtect(sandbox);
  const snapSrc = buildSnapshotFn();
  vm.runInContext('globalThis.__snapFn = ' + snapSrc, ctx, { timeout: 10000 });
  return JSON.parse(vm.runInContext('JSON.stringify(__snapFn())', ctx, { timeout: 10000 }));
}

(async () => {
  console.log('=== ① 真浏览器 iframe 快照 ===');
  const B = browserSnapshot();
  if (B.err) console.log('   ⚠️ %s', B.err);
  const bs = B.snap || {};
  console.log('   取到 %d 项', Object.keys(bs).length);

  console.log('\n=== ② Node vm 补环境快照 ===');
  const ns = nodeSnapshot();
  console.log('   取到 %d 项', Object.keys(ns).length);

  const diffs = [];
  for (const p of CANDIDATES) {
    const a = bs[p], b = ns[p];
    if (a === b) continue;
    diffs.push({ p, browser: a, node: b });
  }
  const missInNode = diffs.filter(d => d.node === 'undefined');
  const typeMismatch = diffs.filter(d => d.node !== 'undefined' && (d.browser || '').split(':')[0] !== (d.node || '').split(':')[0]);
  const valueDiff = diffs.filter(d => !missInNode.includes(d) && !typeMismatch.includes(d));

  console.log('\n=== 差异汇总：共 %d 项 ===', diffs.length);
  console.log('\n【A】Node 里 undefined（浏览器有）—— 最可能的缺失输入：%d 项', missInNode.length);
  missInNode.forEach(d => console.log('   ' + d.p.padEnd(34) + '浏览器: ' + d.browser));

  console.log('\n【B】类型不同：%d 项', typeMismatch.length);
  typeMismatch.forEach(d => console.log('   ' + d.p.padEnd(34) + '浏览器: ' + String(d.browser).slice(0, 46) + '\n' + ''.padEnd(36) + 'Node  : ' + String(d.node).slice(0, 46)));

  console.log('\n【C】值/结构不同：%d 项', valueDiff.length);
  valueDiff.slice(0, 60).forEach(d => console.log('   ' + d.p.padEnd(34) + '浏览器: ' + String(d.browser).slice(0, 44) + '\n' + ''.padEnd(36) + 'Node  : ' + String(d.node).slice(0, 44)));

  fs.writeFileSync(path.join(ART, 'probe-env-value-diff.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), browser: bs, node: ns,
    diffs: { missingInNode: missInNode, typeMismatch, valueDiff },
  }, null, 1));
  console.log('\n-> tiktok/artifacts/probe-env-value-diff.json');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 10).join('\n') : e); process.exit(1); });