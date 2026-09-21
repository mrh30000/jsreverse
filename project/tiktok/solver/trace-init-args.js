/**
 * 抓 byted_acrawler.init(...) 的真实入参。
 * 做法：document-start 用 setter 截获 SDK 对 window.byted_acrawler 的赋值，
 * 然后把 init 包一层，记录参数并透传。
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
      if (m.id && this.p.has(m.id)) { const { resolve, reject } = this.p.get(m.id); this.p.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); return; }
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
  window.__initCalls = [];
  var _ac;
  function wrap(ac) {
    if (!ac || ac.__wrapped) return ac;
    try {
      var origInit = ac.init;
      if (typeof origInit === 'function') {
        ac.init = function () {
          var args = [];
          for (var i = 0; i < arguments.length; i++) {
            try { args.push(JSON.parse(JSON.stringify(arguments[i]))); } catch (e) { args.push(String(arguments[i])); }
          }
          window.__initCalls.push({ fn: 'init', args: args, stack: String(new Error().stack).split('\\n').slice(1, 12) });
          return origInit.apply(this, arguments);
        };
      }
      var origFs = ac.frontierSign;
      if (typeof origFs === 'function') {
        ac.frontierSign = function () {
          var a0 = arguments[0];
          if (window.__initCalls.length < 40) {
            window.__initCalls.push({ fn: 'frontierSign', argLen: a0 ? String(a0).length : 0, stack: String(new Error().stack).split('\\n').slice(1, 10) });
          }
          return origFs.apply(this, arguments);
        };
      }
      ac.__wrapped = true;
    } catch (e) {}
    return ac;
  }
  try {
    Object.defineProperty(window, 'byted_acrawler', {
      configurable: true, enumerable: true,
      get: function () { return _ac; },
      set: function (v) { _ac = wrap(v); }
    });
  } catch (e) {
    window.__initCalls.push({ fn: 'defineProperty-failed', msg: String(e && e.message) });
  }
})();
`;

(async () => {
  const all = await listTargets();
  const t = all.find(x => x.type === 'page' && !/chrome/.test(x.url)) || all.find(x => x.type === 'page');
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  try {
    await cdp.send('Page.enable');
    const added = await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: PRELOAD });
    await cdp.send('Page.navigate', { url: 'https://www.tiktok.com/@tiktok' });
    await new Promise(r => setTimeout(r, 24000));
    const r = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify({ calls: (window.__initCalls||[]).slice(0,12), acType: typeof window.byted_acrawler, mssdkKeys: Object.keys(window._mssdk||{}), pathLen: ((window._mssdk||{})._enablePathList||[]).length, cacheKeys: Object.keys((window._mssdk||{}).cacheOpts||{}) })`,
      returnByValue: true, timeout: 30000,
    });
    const v = JSON.parse(r.result.value);
    console.log('byted_acrawler:', v.acType, '| _mssdk keys:', JSON.stringify(v.mssdkKeys));
    console.log('pathLen:', v.pathLen, '| cacheOpts:', JSON.stringify(v.cacheKeys));
    console.log('captured calls:', v.calls.length);
    v.calls.forEach((c, i) => {
      console.log('--- [' + i + '] ' + c.fn + (c.args ? ' args=' + JSON.stringify(c.args).slice(0, 600) : ' argLen=' + c.argLen));
      (c.stack || []).slice(0, 6).forEach(f => console.log('      ' + f.trim()));
      if (c.msg) console.log('      msg=' + c.msg);
    });
    fs.writeFileSync('tiktok/artifacts/init-calls.json', JSON.stringify(v, null, 1));
    await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: added.identifier }).catch(() => {});
  } finally { cdp.close(); }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });