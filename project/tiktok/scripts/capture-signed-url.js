/**
 * 通过 CDP Network 域（协议层）捕获「浏览器最终发出的已签名 URL」。
 * 不用页面内 hook，因此不会被 SDK 内部的 fetch 引用绕过。
 *
 * 用法：node tiktok/scripts/capture-signed-url.js <targetId> [apiPath] [outFile]
 */
const fs = require('fs');
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';

async function listTargets() {
  const r = await fetch(CDP_HTTP + '/json/list');
  return await r.json();
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.handlers = [];
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', () => rej(new Error('ws error')));
    });
    this.ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
        return;
      }
      if (msg.method) {
        this.events.push(msg);
        this.handlers.forEach(h => { try { h(msg); } catch (e) {} });
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('cdp timeout: ' + method)); }
      }, 60000);
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

const API = process.argv[3] || '/api/recommend/item_list/';
const OUT = process.argv[4] || 'tiktok/artifacts/signed-url.txt';

function triggerScript(api) {
  return `
(async () => {
  try {
    const q = [
      'WebIdLastTime=0','aid=1988','app_language=en','app_name=tiktok_web','browser_language=en-US',
      'browser_name=Mozilla','browser_online=true','browser_platform=Win32','channel=tiktok_web',
      'cookie_enabled=true','count=12','data_collection_enabled=true','device_platform=web_pc',
      'focus_state=true','from_page=fyp','history_len=3','is_fullscreen=false','is_page_visible=true',
      'os=windows','priority_region=SG','region=SG','screen_height=1080','screen_width=1920',
      'tz_name=Asia/Singapore','user_is_login=true','video_encoding=dash','webcast_language=en'
    ].join('&');
    const resp = await fetch('https://www.tiktok.com' + ${JSON.stringify(api)} + '?' + q,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    const text = await resp.text();
    return JSON.stringify({ status: resp.status, bodyLen: text.length });
  } catch (e) { return JSON.stringify({ error: String(e && e.message) }); }
})()`;
}

async function main() {
  const targets = await listTargets();
  const targetId = process.argv[2];
  const t = targets.find(x => x.id === targetId) || targets.find(x => x.type === 'page' && /tiktok/.test(x.url));
  if (!t) throw new Error('no tiktok page target');

  const cdp = new Cdp(t.webSocketDebuggerUrl);
  await cdp.ready;
  const hits = [];
  try {
    cdp.handlers.push((msg) => {
      if (msg.method === 'Network.requestWillBeSent') {
        const url = msg.params.request.url;
        if (url.indexOf(API.split('?')[0]) !== -1) hits.push(url);
      }
    });
    await cdp.send('Network.enable', {});
    const r = await cdp.send('Runtime.evaluate', {
      expression: triggerScript(API), returnByValue: true, awaitPromise: true, timeout: 45000
    });
    console.log('page result:', r.result && r.result.value);
    // 等一拍，确保网络事件都到齐
    await new Promise(res => setTimeout(res, 1500));
  } finally { cdp.close(); }

  console.log('captured requests:', hits.length);
  hits.forEach((u, i) => {
    const sig = /X-Gnarly=([^&]*)/.exec(u);
    const dyn = /X-Dynosaur=([^&]*)/.exec(u);
    const bog = /X-Bogus=([^&]*)/.exec(u);
    console.log('  [' + i + '] gnarly=' + (sig ? sig[1].length : '-') + ' dynosaur=' + (dyn ? dyn[1].length : '-') + ' bogus=' + (bog ? bog[1] : '-'));
  });
  const signed = hits.find(u => /X-Gnarly=/.test(u));
  if (signed) {
    fs.writeFileSync(OUT, signed);
    console.log('saved ->', OUT, '(len ' + signed.length + ')');
  } else {
    console.log('!! 未捕获到带 X-Gnarly 的请求');
  }
}

main().catch(e => { console.error('ERR', e.message); process.exit(1); });