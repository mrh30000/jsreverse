/**
 * 从真实页面 dump `window._mssdk` 全量配置（含无法 JSON 化的 `_enablePathListRegex`）。
 *
 * 为什么要重新 dump：`_enablePathListRegex` 是**已经编译好的正则**，JSON.stringify 会丢成 {}。
 * 之前的 dump 只存了 `_enablePathList`（原始字符串），离线侧自己重新拼正则，
 * 结果与页面实际使用的正则**并不等价**（例：`/webcast.*` vs `/webcast\..*`），
 * 于是某些路径在离线侧匹配到不同的签名分支。
 *
 * 用法：cd /d/work/jsreverse && node tiktok/scripts/dump-mssdk.js
 * 产物：tiktok/artifacts/mssdk-dump.json（覆盖，旧文件自动备份为 .bak）
 */
'use strict';
const fs = require('fs');
const path = require('path');

const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';
const OUT = path.join(__dirname, '..', 'artifacts', 'mssdk-dump.json');

const EXPR = `(()=>{
  const m = window._mssdk;
  if (!m) return JSON.stringify({ error: 'no _mssdk' });
  const re = (m._enablePathListRegex || []).map(r => (r instanceof RegExp) ? r.source : String(r));
  return JSON.stringify({
    mssdk: {
      length: m.length, _sharedCache: m._sharedCache, _enablePathList: m._enablePathList,
      _enablePathListRegex: re, umode: m.umode, _loaderInit: m._loaderInit,
      cacheOpts: m.cacheOpts, opts: m.opts, _urlRewriteRules: m._urlRewriteRules,
      pppt: m.pppt, ets: m.ets,
    },
    extra: {
      userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency,
      screen: { w: screen.width, h: screen.height, cd: screen.colorDepth },
      devicePixelRatio: window.devicePixelRatio, language: navigator.language,
      languages: navigator.languages, platform: navigator.platform, vendor: navigator.vendor,
      historyLen: history.length, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      pageUrl: location.href,
    },
  });
})()`;

class Cdp {
  constructor(w) {
    this.ws = new WebSocket(w); this.id = 0; this.p = new Map();
    this.ready = new Promise((a, b) => {
      this.ws.addEventListener('open', () => a());
      this.ws.addEventListener('error', () => b(new Error('ws')));
    });
    this.ws.addEventListener('message', (e) => {
      let m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.id && this.p.has(m.id)) {
        const { resolve, reject } = this.p.get(m.id); this.p.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.p.set(id, { resolve: res, reject: rej });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.p.has(id)) { this.p.delete(id); rej(new Error('timeout ' + method)); } }, 60000);
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

(async () => {
  const list = await (await fetch(CDP_HTTP + '/json/list')).json();
  const t = list.find(x => x.type === 'page' && /tiktok/.test(x.url));
  if (!t) throw new Error('CDP 里没有 tiktok 页面');
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  const r = await cdp.send('Runtime.evaluate', { expression: EXPR, returnByValue: true, timeout: 30000 });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
  const dump = JSON.parse(r.result.value);
  if (dump.error) throw new Error(dump.error);

  if (fs.existsSync(OUT)) fs.copyFileSync(OUT, OUT + '.bak');
  fs.writeFileSync(OUT, JSON.stringify(dump, null, 1));
  const c = dump.mssdk.cacheOpts || {};
  console.log('页面: %s', dump.extra.pageUrl);
  console.log('_enablePathList=%d 条(去重后)  _enablePathListRegex=%d 条  cacheOpts aid=%s',
    new Set(dump.mssdk._enablePathList).size, dump.mssdk._enablePathListRegex.length, Object.keys(c).join(','));
  for (const aid of Object.keys(c)) {
    const x = c[aid] || {};
    console.log('  aid=%s enablePathList=%d mode=%s region=%s intercept=%s custom=%s',
      aid, (x.enablePathList || []).length, x.mode, x.region, x.intercept, JSON.stringify(x.custom));
  }
  console.log('-> tiktok/artifacts/mssdk-dump.json');
  cdp.close(); process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e); process.exit(1); });