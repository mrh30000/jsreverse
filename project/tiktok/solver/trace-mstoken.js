/**
 * 追踪 msToken 的来源：
 *   1) 正常发一次请求，抓「浏览器最终 URL」里的 msToken 值；
 *   2) 对比 document.cookie 里的 msToken；
 *   3) 抓所有与 msToken 相关的网络请求（/msToken、/ttwid/check 等）；
 *   4) 连续请求两次，看 msToken 是否每次都变（判定是否为一次性）。
 */
'use strict';
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';

async function listTargets() { const r = await fetch(CDP_HTTP + '/json/list'); return await r.json(); }

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl); this.id = 0; this.pending = new Map(); this.onEvent = () => {};
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
        return;
      }
      if (m.method) this.onEvent(m);
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

const RAW = [
  'WebIdLastTime=0', 'aid=1988', 'app_language=en', 'app_name=tiktok_web', 'browser_language=en-US',
  'browser_name=Mozilla', 'browser_online=true', 'browser_platform=Win32', 'channel=tiktok_web',
  'cookie_enabled=true', 'count=12', 'data_collection_enabled=true', 'device_platform=web_pc',
  'focus_state=true', 'from_page=fyp', 'history_len=3', 'is_fullscreen=false', 'is_page_visible=true',
  'os=windows', 'priority_region=SG', 'region=SG', 'screen_height=1080', 'screen_width=1920',
  'tz_name=Asia/Singapore', 'user_is_login=true', 'video_encoding=dash', 'webcast_language=en'
].join('&');
const API = 'https://www.tiktok.com/api/recommend/item_list/?';

const fetchExpr = (url) => `
(async () => {
  try {
    const r = await fetch(${JSON.stringify(url)}, { headers: { 'Content-Type': 'application/json' } });
    const t = await r.text();
    return JSON.stringify({ status: r.status, len: t.length });
  } catch (e) { return JSON.stringify({ err: String(e && e.message) }); }
})()`;

(async () => {
  const targets = await listTargets();
  const t = targets.find(x => x.type === 'page' && /tiktok/.test(x.url));
  const cdp = new Cdp(t.webSocketDebuggerUrl);
  await cdp.ready;

  const captured = [];
  const msTokenReqs = [];
  cdp.onEvent = (m) => {
    if (m.method !== 'Network.requestWillBeSent') return;
    const u = m.params.request.url;
    if (u.indexOf('/api/recommend/item_list/') !== -1) {
      const ms = /msToken=([^&]*)/.exec(u);
      const gn = /X-Gnarly=([^&]*)/.exec(u);
      captured.push({ ms: ms ? ms[1] : null, gnLen: gn ? gn[1].length : 0 });
    }
    if (/msToken|ttwid\/check|webmssdk|mssdk/i.test(u) && !/\.js|\.css/.test(u)) msTokenReqs.push(u);
  };

  try {
    await cdp.send('Network.enable', {});

    const cookieExpr = `JSON.stringify({ cookieMs: (document.cookie.match(/msToken=([^;]*)/)||[])[1] || null })`;
    let r = await cdp.send('Runtime.evaluate', { expression: cookieExpr, returnByValue: true });
    console.log('cookie 里的 msToken:', r.result.value);

    for (let i = 1; i <= 3; i++) {
      r = await cdp.send('Runtime.evaluate', { expression: fetchExpr(API + RAW), returnByValue: true, awaitPromise: true, timeout: 45000 });
      console.log('请求 #' + i + ':', r.result.value);
      await new Promise(res => setTimeout(res, 600));
    }

    console.log('\n捕获到推荐接口请求数:', captured.length);
    captured.forEach((c, i) => console.log('  #' + i, 'msToken=' + (c.ms ? c.ms.slice(0, 30) + '...(' + c.ms.length + ')' : '-'), 'gnarlyLen=' + c.gnLen));

    const uniq = Array.from(new Set(captured.map(c => c.ms)));
    console.log('不同 msToken 值数量:', uniq.length, '/', captured.length, uniq.length > 1 ? '=> msToken 每次变化（一次性）' : '=> msToken 固定');

    r = await cdp.send('Runtime.evaluate', { expression: cookieExpr, returnByValue: true });
    console.log('请求后 cookie msToken:', r.result.value);

    console.log('\nmsToken 相关请求:', msTokenReqs.length);
    msTokenReqs.slice(0, 8).forEach(u => console.log('  ', u.slice(0, 140)));
    require('fs').writeFileSync('tiktok/artifacts/mstoken-trace.json', JSON.stringify({ captured, msTokenReqs }, null, 1));
  } finally { cdp.close(); }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });