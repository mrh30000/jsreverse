/**
 * msToken 来源取证：确认它由 mssdk 后端下发，而非本地算法。
 *
 * 方法：CDP Network 域（不劫持 fetch/XHR，避免 SDK 包装器递归卡死）监听一段时间内：
 *   - 发往 mssdk-sg.tiktok.com/web/resource 的请求（msToken 后端）
 *   - 业务请求上实际使用的 msToken
 * 然后比对「后端调用次数」与「msToken 取值个数」的对应关系。
 *
 * 用法：node tiktok/solver/trace-mstoken-source.js
 */
'use strict';
const fs = require('fs');
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
const RAW = 'WebIdLastTime=0&aid=1988&app_language=en&app_name=tiktok_web&browser_language=en-US&browser_name=Mozilla&browser_online=true&browser_platform=Win32&channel=tiktok_web&challengeName=music&cookie_enabled=true&data_collection_enabled=true&device_platform=web_pc&focus_state=true&from_page=hashtag&history_len=3&is_fullscreen=false&is_page_visible=true&os=windows&priority_region=SG&region=SG&screen_height=1080&screen_width=1920&tz_name=Asia/Singapore&user_is_login=true&webcast_language=en';

(async () => {
  const t = (await listTargets()).find(x => x.type === 'page' && /tiktok/.test(x.url));
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;

  const backendCalls = [];   // mssdk 后端调用
  const signedReqs = [];     // 业务请求（带签名）

  cdp.on((m) => {
    if (m.method !== 'Network.requestWillBeSent') return;
    const u = m.params.request.url;
    if (/mssdk[^/]*\.tiktok\.com\/web\/resource/.test(u)) {
      backendCalls.push({ t: Date.now(), url: u });
    } else if (/\/api\/challenge\/detail\//.test(u)) {
      const ms = (/[?&]msToken=([^&]*)/.exec(u) || [])[1];
      const gn = (/[?&]X-Gnarly=([^&]*)/.exec(u) || [])[1];
      if (gn) signedReqs.push({ t: Date.now(), msToken: ms || '', gnarly: (gn || '').length });
    }
  });

  try {
    await cdp.send('Network.enable');

    const call = (i) => cdp.send('Runtime.evaluate', {
      expression: `(async()=>{try{const r=await fetch('https://www.tiktok.com'+${JSON.stringify(PATH)}+'?'+${JSON.stringify(RAW)}+'&_n='+${i},{headers:{'Content-Type':'application/json'}});const t=await r.text();return r.status+':'+t.length;}catch(e){return 'ERR '+e.message;}})()`,
      returnByValue: true, awaitPromise: true, timeout: 40000,
    });

    console.log('连续 5 次请求，观察 msToken 与后端调用的对应关系…\n');
    for (let i = 1; i <= 5; i++) {
      const r = await call(i);
      console.log('  第%d次请求: %s', i, r.result.value);
      await new Promise(x => setTimeout(x, 1200));
    }
    await new Promise(x => setTimeout(x, 1500));

    console.log('\n--- mssdk 后端调用（msToken 来源）---');
    console.log('次数:', backendCalls.length);
    backendCalls.forEach((c, i) => {
      const eq = (/[?&]eq=([^&]*)/.exec(c.url) || [])[1] || '';
      console.log('  #%d len(eq)=%d  %s', i + 1, eq.length, c.url.slice(0, 90));
    });

    console.log('\n--- 业务请求使用的 msToken ---');
    const uniq = [...new Set(signedReqs.map(r => r.msToken))];
    signedReqs.forEach((r, i) => console.log('  #%d msToken len=%d  %s…  gnarly=%d',
      i + 1, r.msToken.length, r.msToken.slice(0, 18), r.gnarly));
    console.log('\nmsToken 去重后取值数:', uniq.length, '/ 请求数:', signedReqs.length);

    const verdict = backendCalls.length > 0
      ? '✅ msToken 由 mssdk 后端 mssdk-sg.tiktok.com/web/resource 下发（非本地算法）'
      : '⚠️ 本周期未观察到后端调用（可能命中缓存）';
    console.log('结论:', verdict);

    fs.writeFileSync('tiktok/artifacts/mstoken-source.json', JSON.stringify({
      backendCalls, signedReqs, uniqMsTokens: uniq, verdict,
    }, null, 1));
  } finally { cdp.close(); }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });