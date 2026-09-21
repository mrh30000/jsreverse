/**
 * 定位「谁写入了 window._mssdk 的引导配置（cacheOpts / _urlRewriteRules / umode）」。
 *
 * 方法：用 CDP Page.addScriptToEvaluateOnNewDocument 在 document-start 安装 setter，
 * 页面加载时任何对 window._mssdk 的赋值都会被捕获，并记录调用栈（文件 + 行列）。
 */
'use strict';
const fs = require('fs');
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';

async function listTargets() { const r = await fetch(CDP_HTTP + '/json/list'); return await r.json(); }

class Cdp {
  constructor(w) {
    this.ws = new WebSocket(w); this.id = 0; this.p = new Map(); this.onEvent = () => {};
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', () => rej(new Error('ws')));
    });
    this.ws.addEventListener('message', (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.id && this.p.has(m.id)) {
        const { resolve, reject } = this.p.get(m.id);
        this.p.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
        return;
      }
      if (m.method) this.onEvent(m);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.p.set(id, { resolve: res, reject: rej });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.p.has(id)) { this.p.delete(id); rej(new Error('timeout ' + method)); } }, 120000);
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

const PRELOAD = `
(function () {
  window.__mssdkWrites = [];
  var _v;
  var rec = function (label, value, extra) {
    try {
      window.__mssdkWrites.push({
        label: label,
        when: Date.now(),
        keys: value && typeof value === 'object' ? Object.keys(value).slice(0, 30) : null,
        hasCache: !!(value && value.cacheOpts),
        cacheKeys: value && value.cacheOpts ? Object.keys(value.cacheOpts) : null,
        hasRewrite: !!(value && value._urlRewriteRules),
        rewriteLen: value && value._urlRewriteRules ? value._urlRewriteRules.length : null,
        hasPathList: !!(value && value._enablePathList),
        pathListLen: value && value._enablePathList ? value._enablePathList.length : null,
        stack: String(new Error().stack).split('\\n').slice(1, 14),
        extra: extra || null
      });
    } catch (e) {}
  };
  try {
    Object.defineProperty(window, '_mssdk', {
      configurable: true,
      enumerable: true,
      get: function () { return _v; },
      set: function (v) { rec('set', v); _v = v; }
    });
  } catch (e) {
    rec('defineProperty-failed', null, String(e && e.message));
  }
  // 也监听属性级写入（若 SDK 取得对象后再补字段）
  var origDefineProperty = Object.defineProperty;
  Object.defineProperty = function (obj, key, desc) {
    try {
      if (obj === window && key === '_mssdk') rec('defineProperty', desc && desc.value, 'desc');
    } catch (e) {}
    return origDefineProperty.apply(this, arguments);
  };
})();
`;

(async () => {
  const t = (await listTargets()).find(x => x.type === 'page' && !/chrome/.test(x.url)) ||
            (await listTargets()).find(x => x.type === 'page');
  console.log('target:', t.url.slice(0, 60));
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  try {
    await cdp.send('Page.enable');
    const added = await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: PRELOAD });
    console.log('preload id:', added.identifier);
    await cdp.send('Page.navigate', { url: 'https://www.tiktok.com/@tiktok' });
    await new Promise(r => setTimeout(r, 22000));
    const r = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify({
        writes: (window.__mssdkWrites || []),
        finalKeys: Object.keys(window._mssdk || {}),
        finalCache: Object.keys((window._mssdk || {}).cacheOpts || {}),
        finalPathLen: ((window._mssdk || {})._enablePathList || []).length,
        finalRewriteLen: ((window._mssdk || {})._urlRewriteRules || []).length,
        umode: (window._mssdk || {}).umode
      })`,
      returnByValue: true, timeout: 30000,
    });
    const v = JSON.parse(r.result.value);
    console.log('writes captured:', v.writes.length);
    v.writes.forEach((w, i) => {
      console.log('--- write[' + i + '] label=' + w.label + ' keys=' + JSON.stringify(w.keys));
      console.log('     hasCache=' + w.hasCache + ' cacheKeys=' + JSON.stringify(w.cacheKeys) +
                  ' hasRewrite=' + w.hasRewrite + '(' + w.rewriteLen + ')' +
                  ' hasPathList=' + w.hasPathList + '(' + w.pathListLen + ')');
      (w.stack || []).slice(0, 8).forEach(f => console.log('     ' + f.trim()));
    });
    console.log('\nfinal: keys=%s cacheOpts=%s pathList=%d rewrite=%d umode=%s',
      JSON.stringify(v.finalKeys), JSON.stringify(v.finalCache), v.finalPathLen, v.finalRewriteLen, v.umode);
    fs.writeFileSync('tiktok/artifacts/mssdk-writer-stacks.json', JSON.stringify(v, null, 1));
    await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: added.identifier }).catch(() => {});
  } finally { cdp.close(); }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });