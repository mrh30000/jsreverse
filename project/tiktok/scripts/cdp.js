/**
 * 最小 CDP 客户端：通过 DevTools WebSocket 在页面里执行 JS / 取 cookie。
 * 用于绕过 proxycli worker 卡顿（worker 不稳时仍能采集与验证）。
 *
 * 用法：
 *   node tiktok/scripts/cdp.js list
 *   node tiktok/scripts/cdp.js eval <targetId> "<js expression>"
 *   node tiktok/scripts/cdp.js cookies <targetId>
 */
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
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', (e) => rej(new Error('ws error')));
    });
    this.ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('cdp timeout: ' + method));
        }
      }, 30000);
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

async function withTarget(targetId, fn) {
  const targets = await listTargets();
  const t = targets.find(x => x.id === targetId) || targets.find(x => x.type === 'page');
  if (!t) throw new Error('no target');
  const cdp = new Cdp(t.webSocketDebuggerUrl);
  await cdp.ready;
  try { return await fn(cdp, t); } finally { cdp.close(); }
}

async function main() {
  const [cmd, targetId, expr] = process.argv.slice(2);
  if (cmd === 'list') {
    const t = await listTargets();
    t.filter(x => x.type === 'page' || x.type === 'iframe').forEach(x =>
      console.log(x.id, '|', x.type, '|', JSON.stringify((x.url || '').slice(0, 70)), '|', JSON.stringify(x.title || '').slice(0, 40)));
    return;
  }
  if (cmd === 'eval') {
    const out = await withTarget(targetId, async (cdp) => {
      const r = await cdp.send('Runtime.evaluate', {
        expression: expr, returnByValue: true, awaitPromise: true, timeout: 20000
      });
      if (r.exceptionDetails) return { error: r.exceptionDetails.exception && r.exceptionDetails.exception.description };
      return r.result && r.result.value;
    });
    console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 1));
    return;
  }
  if (cmd === 'cookieheader') {
    const out = await withTarget(targetId, async (cdp) => {
      await cdp.send('Network.enable', {});
      const r = await cdp.send('Network.getAllCookies', {});
      return r.cookies;
    });
    const kept = out.filter(c => /tiktok\.com$/.test(c.domain));
    const header = kept.map(c => c.name + '=' + c.value).join('; ');
    require('fs').writeFileSync('tiktok/artifacts/cookie-header.txt', header);
    console.log('cookies:', kept.length, 'headerLen:', header.length, '-> tiktok/artifacts/cookie-header.txt');
    return;
  }
  if (cmd === 'cookies') {
    const out = await withTarget(targetId, async (cdp) => {
      await cdp.send('Network.enable', {});
      const r = await cdp.send('Network.getAllCookies', {});
      return r.cookies;
    });
    const pick = out.filter(c => /^(sessionid|sessionid_ss|ttwid|msToken|s_v_web_id|odin_tt|sid_tt|tt_csrf_token|store-idc|tt-target-idc)$/.test(c.name));
    console.log(JSON.stringify(pick.map(c => ({ name: c.name, domain: c.domain, valuePreview: String(c.value).slice(0, 24), len: String(c.value).length })), null, 1));
    return;
  }
  console.log('unknown command:', cmd);
}

main().catch(e => { console.error('ERR', e.message); process.exit(1); });