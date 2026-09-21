/**
 * 反查浏览器里 msToken 的实际存放位置。
 *
 * 思路：先让浏览器发一次请求拿到实际使用的 msToken 值，
 * 再遍历 window 上的候选对象、storage、cookie，找出哪些地方出现了同一字符串。
 *
 * 用法：node tiktok/solver/find-mstoken-storage.js
 */
'use strict';
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';

async function listTargets() { const r = await fetch(CDP_HTTP + '/json/list'); return await r.json(); }

class Cdp {
  constructor(w) {
    this.ws = new WebSocket(w); this.id = 0; this.p = new Map(); this.handlers = [];
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', () => rej(new Error('ws')));
    });
    this.ws.addEventListener('message', (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
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
      setTimeout(() => { if (this.p.has(id)) { this.p.delete(id); rej(new Error('timeout ' + method)); } }, 120000);
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

const PATH = '/api/challenge/detail/';
const RAW = 'WebIdLastTime=0&aid=1988&app_name=tiktok_web&device_platform=web_pc&challengeName=music&region=SG&user_is_login=true';

(async () => {
  const t = (await listTargets()).find(x => x.type === 'page' && /tiktok/.test(x.url));
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;

  let usedMs = null;
  cdp.on((m) => {
    if (m.method !== 'Network.requestWillBeSent') return;
    const u = m.params.request.url;
    if (u.indexOf('/api/challenge/detail/') !== -1) {
      const ms = (/[?&]msToken=([^&]*)/.exec(u) || [])[1];
      if (ms) usedMs = ms;
    }
  });

  try {
    await cdp.send('Network.enable');
    await cdp.send('Runtime.evaluate', {
      expression: `fetch('https://www.tiktok.com'+${JSON.stringify(PATH)}+'?'+${JSON.stringify(RAW)}+'&_scan=1',{headers:{'Content-Type':'application/json'}}).then(r=>r.text()).then(t=>t.length)`,
      returnByValue: true, awaitPromise: true, timeout: 40000,
    });
    await new Promise(x => setTimeout(x, 1000));

    if (!usedMs) { console.log('未捕获到 msToken'); return; }
    console.log('本次使用的 msToken len=%d: %s…\n', usedMs.length, usedMs.slice(0, 30));

    // 在页面里全量扫描这个值出现在哪
    const scan = `
(function(target){
  var hits = [];
  var probe = function(label, obj, depth){
    if (!obj || depth > 3) return;
    var keys;
    try { keys = Object.keys(obj); } catch(e) { return; }
    for (var i=0;i<keys.length;i++){
      var k = keys[i], v;
      try { v = obj[k]; } catch(e){ continue; }
      if (typeof v === 'string') {
        if (v === target) hits.push(label+'.'+k+' (===)');
        else if (v.indexOf(target) !== -1) hits.push(label+'.'+k+' (contains, len='+v.length+')');
      } else if (v && typeof v === 'object' && depth < 3) {
        probe(label+'.'+k, v, depth+1);
      }
    }
  };
  probe('window._mssdk', window._mssdk, 0);
  probe('window.byted_acrawler', window.byted_acrawler, 0);
  probe('window._xex', window._xex, 0);
  probe('window', window, 1);
  // storage
  try { for (var i=0;i<localStorage.length;i++){ var k=localStorage.key(i), v=localStorage.getItem(k);
    if (v && v.indexOf(target)!==-1) hits.push('localStorage['+k+']'); } } catch(e){}
  try { for (var i=0;i<sessionStorage.length;i++){ var k=sessionStorage.key(i), v=sessionStorage.getItem(k);
    if (v && v.indexOf(target)!==-1) hits.push('sessionStorage['+k+']'); } } catch(e){}
  if (document.cookie.indexOf(target)!==-1) hits.push('document.cookie(contains)');
  return JSON.stringify({
    hits: hits.slice(0, 40),
    cookieMs: (document.cookie.match(/msToken=([^;]*)/)||[])[1]||'',
    allCookieParts: document.cookie.split('; ').filter(function(c){return /msToken|ttwid|webid/i.test(c)}).map(function(c){return c.slice(0,40)})
  });
})(${JSON.stringify(usedMs)})`;

    const r = await cdp.send('Runtime.evaluate', { expression: scan, returnByValue: true, timeout: 30000 });
    const out = JSON.parse(r.result.value);
    console.log('命中位置 (%d):', out.hits.length);
    out.hits.forEach(h => console.log('  -', h));
    console.log('\ncookie 里的 msToken:', out.cookieMs ? out.cookieMs.slice(0, 30) + '… len=' + out.cookieMs.length : '(无)');
    console.log('cookie 里的 msToken 与本次相同?', out.cookieMs === usedMs);
    console.log('cookie 相关项:', JSON.stringify(out.allCookieParts));
  } finally { cdp.close(); }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });