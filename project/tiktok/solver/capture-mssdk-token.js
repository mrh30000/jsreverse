/**
 * 捕获 mssdk 后端资源请求（msToken 的来源链路）。
 *
 * 用 CDP Network 域在页面重载期间抓：
 *   - 发往 mssdk 域名的 web/resource 请求（URL 里的 eq 参数、请求头、postData）
 *   - 完整响应头（看是否 Set-Cookie 下发 msToken）
 *   - 响应体（加密 content）
 *   - 同页面此时的 localStorage.msToken / cookie msToken，用于比对
 *
 * 用法：node tiktok/solver/capture-mssdk-token.js
 * 产物：tiktok/artifacts/mssdk-token-capture.json
 */
'use strict';
const fs = require('fs');
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';

async function listTargets() { const r = await fetch(CDP_HTTP + '/json/list'); return await r.json(); }

class Cdp {
  constructor(w) {
    this.ws = new WebSocket(w); this.id = 0; this.p = new Map(); this.handlers = [];
    this.ready = new Promise((a, b) => {
      this.ws.addEventListener('open', () => a());
      this.ws.addEventListener('error', () => b(new Error('ws')));
    });
    this.ws.addEventListener('message', (e) => {
      let m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.id && this.p.has(m.id)) {
        const { resolve, reject } = this.p.get(m.id); this.p.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
        return;
      }
      if (m.method) this.handlers.forEach((h) => h(m));
    });
  }
  on(fn) { this.handlers.push(fn); }
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
  const t = (await listTargets()).find(x => x.type === 'page' && /tiktok/.test(x.url));
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;

  const hits = new Map();  // requestId -> record
  cdp.on((m) => {
    if (m.method === 'Network.requestWillBeSent') {
      const u = m.params.request.url;
      if (/mssdk[^/]*\.(tiktok|byteoversea|byteintlapi)\.com/.test(u)) {
        hits.set(m.params.requestId, {
          url: u,
          method: m.params.request.method,
          headers: m.params.request.headers,
          postData: m.params.request.postData || null,
          initiator: m.params.initiator,
          ts: Date.now(),
        });
      }
    } else if (m.method === 'Network.responseReceived') {
      const r = hits.get(m.params.requestId);
      if (r) {
        r.status = m.params.response.status;
        r.responseHeaders = m.params.response.headers;
        r.mimeType = m.params.response.mimeType;
      }
    } else if (m.method === 'Network.loadingFinished') {
      const r = hits.get(m.params.requestId);
      if (r) {
        cdp.send('Network.getResponseBody', { requestId: m.params.requestId })
          .then((b) => { r.body = b.body ? b.body.slice(0, 4000) : ''; r.bodyBase64 = !!b.base64Encoded; })
          .catch((e) => { r.bodyErr = String(e.message); });
      }
    }
  });

  try {
    await cdp.send('Network.enable');
    await cdp.send('Page.enable');
    console.log('重载页面以触发 mssdk 后端请求…');
    await cdp.send('Page.reload', { ignoreCache: true });
    await new Promise(r => setTimeout(r, 15000));

    // 取当前会话里的 msToken 用于比对
    const rr = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify({ ls: localStorage.getItem('msToken')||'', xmst: localStorage.getItem('xmst')||'',
        cookie: (document.cookie.match(/msToken=([^;]*)/)||[])[1]||'' })`,
      returnByValue: true, timeout: 20000,
    });
    const sess = JSON.parse(rr.result.value);

    const list = [...hits.values()];
    console.log('\nmssdk 相关请求:', list.length);
    for (const r of list) {
      console.log('─'.repeat(70));
      console.log('URL   :', r.url.slice(0, 160));
      console.log('状态  :', r.status, r.mimeType);
      const setCookie = r.responseHeaders && (r.responseHeaders['set-cookie'] || r.responseHeaders['Set-Cookie']);
      if (setCookie) console.log('SetCookie:', String(setCookie).slice(0, 200));
      const eq = (/[?&]eq=([^&]*)/.exec(r.url) || [])[1];
      if (eq) console.log('eq len:', eq.length, '| eq:', eq.slice(0, 120));
      if (r.postData) console.log('postData:', String(r.postData).slice(0, 200));
      if (r.body) console.log('body  :', r.body.slice(0, 200));
    }

    console.log('\n' + '─'.repeat(70));
    console.log('会话中的 msToken:');
    console.log('  localStorage.msToken len:', sess.ls.length, sess.ls.slice(0, 30));
    console.log('  localStorage.xmst    len:', sess.xmst.length, sess.xmst.slice(0, 30));
    console.log('  cookie.msToken       len:', sess.cookie.length, sess.cookie.slice(0, 30));
    console.log('  三者相同?', sess.ls === sess.cookie, sess.ls === sess.xmst);

    fs.writeFileSync('tiktok/artifacts/mssdk-token-capture.json', JSON.stringify({
      requests: list, session: sess,
    }, null, 1));
    console.log('\n已写入 tiktok/artifacts/mssdk-token-capture.json');
  } finally { cdp.close(); }
})().catch(e => { console.error('ERR', e && e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : e); process.exit(1); });