/**
 * 目标端点验收：/api/recommend/item_list/
 *
 * 三路对比，判断 Node 离线签名是否被服务端接受：
 *   N) Node 离线签名 + Node 直发（经代理）      —— 目标：返回 itemList
 *   B) 浏览器自签名 + 浏览器直发                —— 基线：若也为空则是风控
 *   I) Node 签名 URL + 浏览器 iframe 原始 fetch —— 排除 SDK 重签名干扰
 *
 * 用法：node tiktok/solver/verify-recommend.js
 */
'use strict';
const fs = require('fs');
const { TikTokSigner } = require('./tt_sign');
const { requestViaProxy } = require('./net');

const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';
const PATH = '/api/recommend/item_list/';
const RAW = 'WebIdLastTime=0&aid=1988&app_language=en&app_name=tiktok_web&browser_language=en-US&browser_name=Mozilla&browser_online=true&browser_platform=Win32&channel=tiktok_web&count=12&cookie_enabled=true&coverFormat=2&cursor=0&data_collection_enabled=false&device_platform=web_pc&focus_state=true&from_page=fyp&history_len=3&is_fullscreen=false&is_page_visible=true&language=en&os=windows&priority_region=SG&region=SG&screen_height=1080&screen_width=1920&tz_name=Asia/Singapore&user_is_login=true&video_encoding=dash&webcast_language=en';

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
      setTimeout(() => { if (this.p.has(id)) { this.p.delete(id); rej(new Error('timeout ' + method)); } }, 90000);
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

const summarize = (label, status, text) => {
  let j = null; try { j = JSON.parse(text); } catch (e) {}
  const items = (j && j.itemList && j.itemList.length) || 0;
  const sc = j && j.status_code != null ? j.status_code : '-';
  console.log('  ' + label + ' http=' + status + ' len=' + String(text.length).padEnd(7) + ' status_code=' + sc + ' itemList=' + items);
  if (text.length && items === 0) console.log('        body: ' + text.slice(0, 300));
  return { label: label.trim(), status, len: text.length, status_code: sc, items };
};

(async () => {
  const sess = JSON.parse(fs.readFileSync('tiktok/artifacts/session-dump.json', 'utf8'));
  const cookie = sess.cookie;

  // --- N) Node 离线签名 ---
  const s = new TikTokSigner({ cookie, storage: { local: sess.local, session: sess.session } }).init();
  s.bootstrap();
  const nodeUrl = (await s.sign(RAW, PATH)).url;
  const nodeMs = (/[?&]msToken=([^&]*)/.exec(nodeUrl) || [])[1] || '';
  console.log('Node 签名: X-Gnarly=%d X-Dynosaur=%d msToken=%d',
    ((/[?&]X-Gnarly=([^&]*)/.exec(nodeUrl) || [])[1] || '').length,
    ((/[?&]X-Dynosaur=([^&]*)/.exec(nodeUrl) || [])[1] || '').length,
    nodeMs.length);

  // --- 浏览器侧 ---
  const list = await (await fetch(CDP_HTTP + '/json/list')).json();
  const t = list.find(x => x.type === 'page' && /tiktok/.test(x.url));
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;

  const results = [];
  try {
    // B) 浏览器自签名
    const rb = await cdp.send('Runtime.evaluate', {
      expression: `(async()=>{const r=await fetch('https://www.tiktok.com'+${JSON.stringify(PATH)}+'?'+${JSON.stringify(RAW)}+'&_b=1',{headers:{'Content-Type':'application/json'}});const t=await r.text();return JSON.stringify({s:r.status,t:t});})()`,
      returnByValue: true, awaitPromise: true, timeout: 60000,
    });
    const b = JSON.parse(rb.result.value);
    results.push(summarize('B) 浏览器自签名      ', b.s, b.t));

    // I) 浏览器 iframe 原始 fetch 发 Node 签名 URL（绕过页面 SDK 重签名）
    const ri = await cdp.send('Runtime.evaluate', {
      expression: `
(async()=>{
  const ifr = document.createElement('iframe');
  ifr.style.display='none';
  document.body.appendChild(ifr);
  await new Promise(r=>{ifr.onload=r;ifr.src='about:blank';setTimeout(r,3000)});
  const f = ifr.contentWindow.fetch.bind(ifr.contentWindow);
  try {
    const r = await f(${JSON.stringify(nodeUrl + '&_i=1')}, {headers:{'Content-Type':'application/json'}});
    const t = await r.text();
    return JSON.stringify({s:r.status,t:t});
  } catch(e) { return JSON.stringify({s:0,t:'ERR '+e.message}); }
  finally { ifr.remove(); }
})()`,
      returnByValue: true, awaitPromise: true, timeout: 60000,
    });
    const i = JSON.parse(ri.result.value);
    results.push(summarize('I) iframe发Node签名  ', i.s, i.t));
  } finally { cdp.close(); }

  // N) Node 直发
  try {
    const r = await requestViaProxy(nodeUrl + '&_n=1', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Cookie: cookie, Referer: 'https://www.tiktok.com/foryou', 'Accept-Language': 'en-US,en;q=0.9' },
    });
    results.push(summarize('N) Node直发离线签名  ', r.status, r.text));
  } catch (e) {
    console.log('  N) Node 直发 ERR %s', e.message);
    results.push({ label: 'N) Node直发离线签名', status: 0, len: 0, err: e.message });
  }

  console.log('\n判定:');
  const n = results.find(r => r.label.startsWith('N'));
  const b = results.find(r => r.label.startsWith('B'));
  if (n && n.items > 0) console.log('  ✅ Node 离线签名被服务端接受（itemList=%d）', n.items);
  else if (b && b.items > 0) console.log('  ⚠️ 浏览器有数据但 Node 没有 → Node 签名仍需修正');
  else console.log('  ⚠️ 浏览器基线也为空 → 会话被风控，无法判定（非签名问题）');

  fs.writeFileSync('tiktok/artifacts/verify-recommend.json', JSON.stringify({ nodeUrl, results }, null, 1));
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e); process.exit(1); });