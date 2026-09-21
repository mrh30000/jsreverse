/**
 * 冷启动验收：完全不用浏览器取会话材料。
 *
 *   会话（cookie + msToken）  ── 100% 纯 HTTP（tt_session.js）
 *   签名（X-Gnarly/Dynosaur/msToken/X-Bogus）── 100% Node 离线（tt_sign.js）
 *   发送 ── 两路对比：
 *        N) Node 经代理直发（受出口 IP 风控影响）
 *        I) 交给浏览器「原始 iframe fetch」发出（绕过页面 SDK 二次签名）
 *
 * 判定：只要有一路返回 itemList 非空，即证明该离线签名**在本路径**被接受。
 *
 * ⚠️ 口径提醒（初版验收偏乐观）：本脚本只验 `/api/recommend/item_list/`，
 * 而该端点的签名校验明显宽松 —— 同一份签名换成 `/api/post/item_list/` 会被拒。
 * 所以这里通过只代表「推荐流可用」，不代表签名通用。
 * 通用性请看 verify-endpoint-matrix.js。
 *
 * 用法：cd /d/work/jsreverse && node tiktok/solver/verify-coldstart.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { TikTokSigner } = require('./tt_sign');
const { buildSession } = require('./tt_session');
const { requestViaProxy } = require('./net');

const ART = path.join(__dirname, '..', 'artifacts');
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

async function viaIframe(url, cookie) {
  const list = await (await fetch(CDP_HTTP + '/json/list')).json();
  const t = list.find(x => x.type === 'page' && /tiktok/.test(x.url));
  if (!t) return { status: 0, len: 0, items: 0, head: 'no tiktok page' };
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  try {
    const r = await cdp.send('Runtime.evaluate', {
      expression: `
(async()=>{
  const ifr = document.createElement('iframe');
  ifr.style.display='none'; document.body.appendChild(ifr);
  await new Promise(r=>{ifr.onload=r;ifr.src='about:blank';setTimeout(r,3000)});
  const f = ifr.contentWindow.fetch.bind(ifr.contentWindow);
  try {
    const r = await f(${JSON.stringify(url)}, {headers: Object.assign({'Content-Type':'application/json'},
      ${JSON.stringify(cookie ? { Cookie: cookie } : {})})});
    const t = await r.text();
    let j=null; try{j=JSON.parse(t)}catch(e){}
    return JSON.stringify({status:r.status, len:t.length, items:(j&&j.itemList&&j.itemList.length)||0,
      status_code:(j&&j.status_code!=null)?j.status_code:'-', head:t.slice(0,100)});
  } catch(e) { return JSON.stringify({status:0,len:0,items:0,head:'ERR '+e.message}); }
  finally { ifr.remove(); }
})()`,
      returnByValue: true, awaitPromise: true, timeout: 60000,
    });
    return JSON.parse(r.result.value);
  } finally { cdp.close(); }
}

(async () => {
  console.log('=== 1) 纯 HTTP 采集会话 ===');
  const sess = await buildSession();
  for (const l of sess.log) {
    console.log('   ' + l.note.padEnd(26) + ' http=' + l.status + ' len=' + String(l.len).padEnd(8) + ' waf=' + (l.waf ? 'Y' : 'N') + ' [' + l.setCookies.join(',') + ']');
  }
  console.log('   cookie=' + sess.cookie.length + '字符  msToken=' + sess.session.msToken.length + '字符');
  if (!sess.session.msToken) throw new Error('未取到 msToken');

  console.log('\n=== 2) Node 离线签名 ===');
  const s = new TikTokSigner({ cookie: sess.cookie, storage: { local: sess.local, session: sess.session } }).init();
  s.bootstrap();
  const signedUrl = (await s.sign(RAW, PATH)).url;
  for (const k of ['X-Gnarly', 'X-Dynosaur', 'X-Bogus', 'msToken']) {
    const m = new RegExp('[?&]' + k + '=([^&]*)').exec(signedUrl);
    console.log('   ' + k.padEnd(11) + ' ' + (m ? 'len=' + m[1].length : 'ABSENT'));
  }

  console.log('\n=== 3) 发送 ===');
  const results = {};

  // N) Node 直发
  try {
    const r = await requestViaProxy(signedUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sess.cookie,
        Referer: 'https://www.tiktok.com/foryou',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    let j = null; try { j = JSON.parse(r.text); } catch (e) {}
    results.N = { status: r.status, len: r.text.length, items: (j && j.itemList && j.itemList.length) || 0, head: r.text.slice(0, 90) };
  } catch (e) { results.N = { status: 0, len: 0, items: 0, head: 'ERR ' + e.message }; }
  console.log('   N) Node 直发     http=%s len=%s items=%s', results.N.status, results.N.len, results.N.items);
  if (!results.N.items && results.N.head) console.log('      %s', results.N.head.slice(0, 80));

  // I) 浏览器 iframe
  try {
    results.I = await viaIframe(signedUrl, '');
  } catch (e) { results.I = { status: 0, len: 0, items: 0, head: 'ERR ' + e.message }; }
  console.log('   I) iframe 发出   http=%s len=%s items=%s', results.I.status, results.I.len, results.I.items);
  if (!results.I.items && results.I.head) console.log('      %s', results.I.head.slice(0, 80));

  console.log('\n=== 判定 ===');
  if (results.I.items > 0) {
    console.log('   ✅ recommend/item_list 路径可用：HTTP 取会话 + Node 离线签名 → itemList=' + results.I.items);
    console.log('      （Node 直发 items=' + results.N.items + '，差异来自出口 IP 风控，非签名问题）');
    console.log('      ⚠️ 只说明推荐流可用；其它业务接口请跑 verify-endpoint-matrix.js');
  } else if (results.N.items > 0) {
    console.log('   ✅ 该路径成立（Node 直发即通过）：itemList=' + results.N.items);
  } else {
    console.log('   ❌ 两路均为空，需排查');
  }

  fs.writeFileSync(path.join(ART, 'verify-coldstart.json'), JSON.stringify({ sessionLog: sess.log, signedUrl, results }, null, 1));
  process.exit(0);   // 不显式退出时 WebSocket/定时器可能拖住进程
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e); process.exit(1); });