/**
 * 通过 CDP 在页面内抓「签名 URL 构造点的完整调用栈」（不受 proxycli preload 影响）。
 * 用途：定位 webmssdk 里真正生成 X-Gnarly / X-Dynosaur 的入口函数。
 */
'use strict';
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';

async function listTargets() {
  const r = await fetch(CDP_HTTP + '/json/list');
  return await r.json();
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0; this.pending = new Map();
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', () => rej(new Error('ws error')));
    });
    this.ws.addEventListener('message', (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout ' + method)); } }, 60000);
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

const SCRIPT = `
(async () => {
  const stacks = [];
  const RE = /X-Gnarly/i;
  const NativeURL = window.URL;
  function Patched(u, base) {
    const inst = new NativeURL(u, base);
    try {
      if (RE.test(String(inst.href)) && stacks.length < 3) {
        stacks.push({ href: String(inst.href).slice(0, 120), stack: String(new Error().stack).split('\\n').slice(0, 26) });
      }
    } catch (e) {}
    return inst;
  }
  Patched.prototype = NativeURL.prototype;
  Object.setPrototypeOf(Patched, NativeURL);
  window.URL = Patched;

  const before = performance.now();
  let status = null, len = 0;
  try {
    const q = 'aid=1988&app_name=tiktok_web&device_platform=web_pc&count=12&region=SG&user_is_login=true&from_page=fyp';
    const r = await fetch('https://www.tiktok.com/api/recommend/item_list/?' + q, { headers: { 'Content-Type': 'application/json' } });
    status = r.status;
    len = (await r.text()).length;
  } catch (e) { status = 'ERR ' + e.message; }
  window.URL = NativeURL;
  return JSON.stringify({ status, len, stacks });
})()
`;

(async () => {
  const targets = await listTargets();
  const t = targets.find(x => x.type === 'page' && /tiktok/.test(x.url)) || targets.find(x => x.type === 'page');
  if (!t) throw new Error('no page');
  const cdp = new Cdp(t.webSocketDebuggerUrl);
  await cdp.ready;
  try {
    const r = await cdp.send('Runtime.evaluate', { expression: SCRIPT, returnByValue: true, awaitPromise: true, timeout: 45000 });
    if (r.exceptionDetails) { console.log('PAGE ERR', r.exceptionDetails.exception && r.exceptionDetails.exception.description); return; }
    const parsed = JSON.parse(r.result.value);
    console.log('status=%s len=%s stacks=%d', parsed.status, parsed.len, parsed.stacks.length);
    parsed.stacks.forEach((s, i) => {
      console.log('--- stack[' + i + '] ' + s.href);
      s.stack.forEach(f => console.log('   ' + f.trim()));
    });
  } finally { cdp.close(); }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });