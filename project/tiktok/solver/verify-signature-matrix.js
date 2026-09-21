/**
 * 签名矩阵验收（纯字符串级操作，避免 URL 重编码破坏签名）。
 *
 * 方法论要点：X-Dynosaur 绑定的是「原始 query 字符串」。
 * 用 URL 对象增删参数会触发 re-encode，可能让未改动的参数变成不同字节，
 * 从而让签名失效 —— 那样的失败无法区分「参数被删」和「编码被改」。
 * 因此这里只在字符串层面做增删替换。
 *
 * 所有请求经「原始 iframe fetch」发出（绕过页面 SDK 二次签名）。
 *
 * 用法：node tiktok/solver/verify-signature-matrix.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { TikTokSigner } = require('./tt_sign');

const ART = path.join(__dirname, '..', 'artifacts');

const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';
const PATH = '/api/recommend/item_list/';
const BASE_RAW = 'WebIdLastTime=0&aid=1988&app_language=en&app_name=tiktok_web&browser_language=en-US&browser_name=Mozilla&browser_online=true&browser_platform=Win32&channel=tiktok_web&count=12&cookie_enabled=true&coverFormat=2&cursor=0&data_collection_enabled=false&device_platform=web_pc&focus_state=true&from_page=fyp&history_len=3&is_fullscreen=false&is_page_visible=true&language=en&os=windows&priority_region=SG&region=SG&screen_height=1080&screen_width=1920&tz_name=Asia/Singapore&user_is_login=true&video_encoding=dash&webcast_language=en';
const OTHER_RAW = BASE_RAW.replace('cursor=0', 'cursor=12');

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

/** 取参数值（按 raw query 的 & 与 = 直接切，不做 URL 解析） */
function getRaw(query, key) {
  for (const seg of query.split('&')) {
    const i = seg.indexOf('=');
    if (i !== -1 && seg.slice(0, i) === key) return seg.slice(i + 1);
  }
  return undefined;
}
/** 删除参数（字符串级，其余字节原样保留） */
function dropRaw(query, keys) {
  return query.split('&').filter(seg => {
    const i = seg.indexOf('=');
    const k = i === -1 ? seg : seg.slice(0, i);
    return !keys.includes(k);
  }).join('&');
}
/** 替换参数值（字符串级） */
function setRaw(query, key, value) {
  return query.split('&').map(seg => {
    const i = seg.indexOf('=');
    if (i !== -1 && seg.slice(0, i) === key) return key + '=' + value;
    return seg;
  }).join('&');
}

function iframeBatch(urls) {
  return `
(async()=>{
  const ifr = document.createElement('iframe');
  ifr.style.display='none';
  document.body.appendChild(ifr);
  await new Promise(r=>{ifr.onload=r;ifr.src='about:blank';setTimeout(r,3000)});
  const f = ifr.contentWindow.fetch.bind(ifr.contentWindow);
  const urls = ${JSON.stringify(urls)};
  const out = [];
  for (const u of urls) {
    try {
      const r = await f(u, {headers:{'Content-Type':'application/json'}});
      const t = await r.text();
      let j=null; try{j=JSON.parse(t)}catch(e){}
      out.push({ status:r.status, len:t.length,
        items:(j&&j.itemList&&j.itemList.length)||0,
        status_code:(j&&j.status_code!=null)?j.status_code:'-',
        head:t.slice(0,120) });
    } catch(e) { out.push({ status:0, len:0, items:0, head:'ERR '+String(e&&e.message) }); }
    await new Promise(r=>setTimeout(r,700));
  }
  ifr.remove();
  return JSON.stringify(out);
})()`;
}

(async () => {
  const sess = JSON.parse(fs.readFileSync(path.join(ART, 'session-dump.json'), 'utf8'));
  const cookie = sess.cookie;
  const mk = () => {
    const s = new TikTokSigner({ cookie, storage: { local: sess.local, session: sess.session } }).init();
    s.bootstrap();
    return s;
  };

  const FULL = (await mk().sign(BASE_RAW, PATH)).url;
  const FULL_OTHER = (await mk().sign(OTHER_RAW, PATH)).url;

  const q = (full) => full.slice(full.indexOf('?') + 1);
  const base = q(FULL);

  // 完整签名 query（含签名参数）
  const cases = [
    ['A 基准：Node 完整签名', base, true],
    ['B 去掉 X-Dynosaur', dropRaw(base, ['X-Dynosaur']), false],
    ['C 篡改 X-Dynosaur（末尾3字符）', setRaw(base, 'X-Dynosaur', getRaw(base, 'X-Dynosaur').slice(0, -3) + 'XYz'), false],
    ['D 去掉 X-Gnarly（非强制）', dropRaw(base, ['X-Gnarly']), true],
    ['E 去掉 msToken（非强制）', dropRaw(base, ['msToken']), true],
    ['F 去掉 X-Bogus（非强制）', dropRaw(base, ['X-Bogus']), true],
    ['G 改 X-Gnarly 单字符（非强制）', setRaw(base, 'X-Gnarly', getRaw(base, 'X-Gnarly').slice(0, -1)), true],
    ['H 挪用他 query 的 X-Dynosaur', setRaw(base, 'X-Dynosaur', getRaw(q(FULL_OTHER), 'X-Dynosaur')), false],
    ['I 同 URL 立即重放', base, null],
    ['J 三种签名全去掉', dropRaw(base, ['X-Gnarly', 'X-Dynosaur', 'msToken']), false],
  ];

  console.log('Node 离线签名参数长度: X-Gnarly=%d X-Dynosaur=%d X-Bogus=%d msToken=%d\n',
    getRaw(base, 'X-Gnarly').length, getRaw(base, 'X-Dynosaur').length,
    getRaw(base, 'X-Bogus').length, getRaw(base, 'msToken').length);

  const list = await (await fetch(CDP_HTTP + '/json/list')).json();
  const t = list.find(x => x.type === 'page' && /tiktok/.test(x.url));
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;

  const urls = cases.map(([, query]) => 'https://www.tiktok.com' + PATH + '?' + query);
  const results = [];
  try {
    const r = await cdp.send('Runtime.evaluate', {
      expression: iframeBatch(urls), returnByValue: true, awaitPromise: true, timeout: 120000,
    });
    if (r.exceptionDetails) { console.log('PAGE ERR', r.exceptionDetails.exception && r.exceptionDetails.exception.description); return; }
    const outs = JSON.parse(r.result.value);

    console.log('用例'.padEnd(34) + 'http'.padEnd(7) + 'len'.padEnd(9) + 'items'.padEnd(7) + '期望');
    cases.forEach(([label, , expect], i) => {
      const o = outs[i] || {};
      const ok = o.items > 0;
      const mark = expect === null ? '' : (ok === expect ? '✅' : '❌不符');
      console.log(label.padEnd(32) + String(o.status).padEnd(7) + String(o.len).padEnd(9) +
        String(o.items).padEnd(7) + (expect === null ? '观察' : (expect ? '应通过' : '应被拒')) + ' ' + mark);
      if (o.head && !ok) console.log('     body: ' + o.head.slice(0, 100));
      results.push({ label, expect, ...o });
    });
  } finally { cdp.close(); }

  const find = (p) => results.find(r => r.label.startsWith(p));
  console.log('\n===== 结论 =====');
  console.log('1) Node 离线签名被服务端接受:', find('A').items > 0 ? '✅ 是（itemList=' + find('A').items + '）' : '❌ 否');
  console.log('2) X-Dynosaur 必需:', find('B').items === 0 ? '✅（去掉即 0 字节）' : '❌');
  console.log('3) X-Dynosaur 内容被校验:', find('C').items === 0 ? '✅（篡改即失败）' : '❌');
  console.log('4) X-Gnarly 必需:', find('D').items === 0 ? '✅' : '❌（去掉仍通过）');
  console.log('5) msToken 必需:', find('E').items === 0 ? '✅' : '❌（去掉仍通过）');
  console.log('6) X-Bogus 必需:', find('F').items === 0 ? '✅' : '❌（去掉仍通过，符合占位常量）');
  console.log('7) X-Dynosaur 绑定 query:', find('H').items === 0 ? '✅（挪用他 query 失败）' : '❌');
  console.log('8) 同 URL 重放:', find('I').items > 0 ? '可通过（无一次性限制）' : '被拒（一次性）');

  fs.writeFileSync(path.join(ART, 'verify-signature-matrix.json'), JSON.stringify({ FULL, FULL_OTHER, results }, null, 1));
  process.exit(0);   // 不显式退出时 WebSocket/定时器可能拖住进程
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e); process.exit(1); });