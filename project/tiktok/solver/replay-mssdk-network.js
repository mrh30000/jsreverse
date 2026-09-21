/**
 * 把浏览器抓到的 mssdk 服务端响应回灌进离线补环境，看签名是否随之变化。
 *
 * 背景：capture-mssdk-network.js 显示页面会请求
 *   GET  https://mssdk-sg.tiktok.com/web/resource?eq=<加密>   → 返回 {"code":0,"content":"<加密blob>"}
 *   GET  https://mon.tiktokv.com/monitor_web/settings/browser-settings?bid=webmssdk
 * 而离线补环境把它们死桩成 `{}`。
 * 若 X-Dynosaur 长度/内容随真实响应改变（404 → 416，与浏览器一致），
 * 说明签名算法的一部分配置是**服务端下发**的，必须在离线时一并回灌。
 *
 * 用法：cd /d/work/jsreverse && node tiktok/solver/replay-mssdk-network.js
 *   依赖 tiktok/artifacts/mssdk-network.json（先跑 scripts/capture-mssdk-network.js）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { TikTokSigner } = require('./tt_sign');

const ART = path.join(__dirname, '..', 'artifacts');
const NET = path.join(ART, 'mssdk-network.json');
const PATH_ = '/api/post/item_list/';
const RAW = 'WebIdLastTime=0&aid=1988&app_language=en&app_name=tiktok_web&browser_language=en-US&browser_name=Mozilla&browser_online=true&browser_platform=Win32&channel=tiktok_web&count=12&cookie_enabled=true&cursor=0&data_collection_enabled=false&device_platform=web_pc&focus_state=true&history_len=3&is_fullscreen=false&is_page_visible=true&language=en&os=windows&priority_region=SG&region=SG&screen_height=1080&screen_width=1920&tz_name=Asia/Singapore&user_is_login=false&video_encoding=dash&webcast_language=en';

const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';
const SIG = ['X-Bogus', 'X-Gnarly', 'X-Dynosaur', 'msToken'];
const get = (q, k) => { const m = new RegExp('[?&]' + k + '=([^&]*)').exec(q); return m ? m[1] : ''; };

/** 把抓包结果做成「URL 片段 → 响应」的桩表 */
function buildStubs() {
  const j = JSON.parse(fs.readFileSync(NET, 'utf8'));
  const stubs = [];
  for (const r of j.requests) {
    if (r.body == null) continue;
    const key = r.url.replace(/^https?:\/\//, '').split('?')[0];
    if (stubs.some(s => s.key === key)) continue;
    stubs.push({ key, url: r.url, status: r.status || 200, text: r.body, len: r.bodyLen });
  }
  return stubs;
}

/** 找到与请求 URL 匹配的桩（同 host+path 即命中；查询串忽略，因为 eq 是随机的） */
function matchStub(stubs, url) {
  const key = String(url).replace(/^https?:\/\//, '').split('?')[0];
  return stubs.find(s => s.key === key) || null;
}

(async () => {
  const stubs = buildStubs();
  console.log('可用桩（host+path → 响应长度）:');
  for (const s of stubs) console.log('   %s  len=%d', s.key, s.len);

  const mk = (storage, opts) => new TikTokSigner(Object.assign({
    cookie: '', storage,
  }, opts)).init();

  const sessPath = path.join(ART, 'session-dump.json');
  const sess = fs.existsSync(sessPath) ? JSON.parse(fs.readFileSync(sessPath, 'utf8')) : null;
  const storage = sess ? { local: sess.local, session: sess.session } : undefined;

  const variants = [];
  // A：现状（无网络，全部假响应）
  variants.push(['A 死桩 {}（现状）', await (async () => {
    const s = mk(storage); s.bootstrap(); return s;
  })()]);
  // B：回灌真实 mssdk 服务端响应（非 mssdk 域）
  for (const name of ['monitor_web/settings', 'mssdk-sg.tiktok.com/web/resource', 'all']) {
    const filtered = stubs.filter(s =>
      name === 'all' ? true : (name === 'monitor_web/settings' ? /monitor_web\/settings/.test(s.key) : /web\/resource/.test(s.key)));
    if (!filtered.length) { console.log('   ⚠️ 桩表里没有 %s，跳过', name); continue; }
    const xhrImpl = (m, url) => {
      const hit = matchStub(filtered, url);
      if (hit) { console.log('      [桩] %s -> %d bytes', hit.key, hit.len); return Promise.resolve({ status: hit.status, text: hit.text, headers: '' }); }
      return Promise.resolve({ status: 200, text: '{}', headers: '' });
    };
    const s = mk(storage, { xhrImpl });
    s.bootstrap(); variants.push(['B 回灌 ' + name, s]);
  }

  console.log('\n各变体的 X-Dynosaur / X-Gnarly 长度:');
  const results = [];
  for (const [label, s] of variants) {
    let u;
    try { u = (await s.sign(RAW, PATH_)).url; } catch (e) { console.log('   %s ERR %s', label, e.message); continue; }
    const dy = get(u, 'X-Dynosaur').length, gn = get(u, 'X-Gnarly').length;
    const inner = (s.capturedRequests() || []).length;
    console.log('   %s  X-Dynosaur=%d  X-Gnarly=%d  内部请求=%d', label.padEnd(30), dy, gn, inner);
    results.push({ label, dy, gn, signed: u });
  }

  // 与浏览器原生 URL 对比（若页面可用）
  try {
    const list = await (await fetch(CDP_HTTP + '/json/list')).json();
    const t = list.find(x => x.type === 'page' && /tiktok/.test(x.url));
    if (t) {
      const ws = new WebSocket(t.webSocketDebuggerUrl);
      await new Promise(r => ws.addEventListener('open', r));
      const send = (m, p = {}) => new Promise((res, rej) => {
        const id = Math.floor(Math.random() * 1e6);
        const h = (e) => { const d = JSON.parse(e.data); if (d.id === id) { ws.removeEventListener('message', h); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } };
        ws.addEventListener('message', h); ws.send(JSON.stringify({ id, method: m, params: p }));
      });
      const r = await send('Runtime.evaluate', {
        expression: `JSON.stringify(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.indexOf(${JSON.stringify(PATH_)})!==-1))`,
        returnByValue: true,
      });
      const nat = JSON.parse(r.result.value).pop();
      if (nat) console.log('\n   浏览器原生同一接口: X-Dynosaur=%d  X-Gnarly=%d', get(nat, 'X-Dynosaur').length, get(nat, 'X-Gnarly').length);
      ws.close();
    }
  } catch (e) { console.log('   （跳过浏览器对比: %s）', e.message); }

  fs.writeFileSync(path.join(ART, 'replay-mssdk-network.json'), JSON.stringify({ stubs: stubs.map(s => ({ key: s.key, len: s.len })), results: results.map(r => ({ label: r.label, dy: r.dy, gn: r.gn })) }, null, 1));
  console.log('\n-> tiktok/artifacts/replay-mssdk-network.json');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 10).join('\n') : e); process.exit(1); });
