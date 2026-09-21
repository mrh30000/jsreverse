/**
 * 新鲜度实验（判定验收入口）：
 *   A) 正常请求一次，用 CDP Network 域抓下浏览器最终发出的已签名 URL
 *   B) 立即重放该 URL（同一页面、同一会话、秒级内）
 *   C) 同一 rawQuery 再让 SDK 重新签名后请求
 * 若 B 失败而 C 成功 → 签名是时间/一次性绑定，离线签名器必须「即时生成」。
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
    this.id = 0; this.pending = new Map(); this.onEvent = () => {};
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

function evalFetch(urlExpr) {
  return `
(async () => {
  try {
    const r = await fetch(${urlExpr}, { headers: { 'Content-Type': 'application/json' } });
    const t = await r.text();
    return JSON.stringify({ status: r.status, len: t.length, head: t.slice(0, 50) });
  } catch (e) { return JSON.stringify({ err: String(e && e.message) }); }
})()`;
}

(async () => {
  const targets = await listTargets();
  const t = targets.find(x => x.type === 'page' && /tiktok/.test(x.url));
  if (!t) throw new Error('no tiktok page');
  const cdp = new Cdp(t.webSocketDebuggerUrl);
  await cdp.ready;
  let signedUrl = null;
  cdp.onEvent = (m) => {
    if (m.method === 'Network.requestWillBeSent') {
      const u = m.params.request.url;
      if (u.indexOf('/api/recommend/item_list/') !== -1 && /X-Gnarly=/.test(u)) signedUrl = u;
    }
  };
  try {
    await cdp.send('Network.enable', {});

    console.log('--- A) 正常请求（浏览器自行签名）');
    let r = await cdp.send('Runtime.evaluate', { expression: evalFetch(JSON.stringify(API + RAW)), returnByValue: true, awaitPromise: true, timeout: 45000 });
    console.log('   ', r.result.value);
    await new Promise(res => setTimeout(res, 800));
    console.log('    捕获签名 URL:', signedUrl ? signedUrl.length + ' chars' : '（无）');

    if (!signedUrl) { console.log('无法捕获，终止'); return; }

    console.log('--- B) 立即重放捕获到的签名 URL');
    r = await cdp.send('Runtime.evaluate', { expression: evalFetch(JSON.stringify(signedUrl)), returnByValue: true, awaitPromise: true, timeout: 45000 });
    console.log('   ', r.result.value);

    console.log('--- C) 同一 rawQuery 让 SDK 重新签名（不显式指定 msToken）');
    r = await cdp.send('Runtime.evaluate', { expression: evalFetch(JSON.stringify(API + RAW)), returnByValue: true, awaitPromise: true, timeout: 45000 });
    console.log('   ', r.result.value);

    const msM = /msToken=([^&]*)/.exec(signedUrl);
    console.log('--- D) 重放时保留旧 msToken，其余让 SDK 重签');
    r = await cdp.send('Runtime.evaluate', { expression: evalFetch(JSON.stringify(API + RAW + '&msToken=' + (msM ? msM[1] : ''))), returnByValue: true, awaitPromise: true, timeout: 45000 });
    console.log('   ', r.result.value);
  } finally { cdp.close(); }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });