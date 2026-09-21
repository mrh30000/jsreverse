/**
 * 采集页面 SDK 启动时的「服务端配置请求」——签名算法版本很可能是服务端下发的。
 *
 * 动机：离线签名对 /api/recommend/item_list/ 被接受，但对 /api/post/item_list/
 * 等接口被拒；而浏览器对同一份 raw query 签名是被接受的。
 * 差异只在签名值本身（把浏览器的 X-Dynosaur 换进来即通过）。
 * 最可能的原因：我们的补环境把 SDK 的配置请求（mon.tiktokv.com 等）死桩成 `{}`，
 * 于是 SDK 退回到默认（旧）算法版本；浏览器拿到真配置，走新版本。
 *
 * 本脚本把页面启动过程中 SDK 发的所有非业务请求连同**响应体**抓下来，
 * 供 solver 回灌（见 solver/replay-mssdk-network.js）。
 *
 * 用法：cd /d/work/jsreverse && node tiktok/scripts/capture-mssdk-network.js
 * 产物：tiktok/artifacts/mssdk-network.json
 */
'use strict';
const fs = require('fs');
const path = require('path');

const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';
const OUT = path.join(__dirname, '..', 'artifacts', 'mssdk-network.json');
/** 只抓这些域（业务 API 域名排除，避免把推荐流几百 KB 灌进来） */
const KEEP = /(mssdk|mon\.tiktokv\.com|tiktokv\.com|byteoversea|secsdk|\/web\/resource|\/web\/common|\/monitor_web\/)/i;
const BODY_CAP = 200 * 1024;

class Cdp {
  constructor(w) {
    this.ws = new WebSocket(w); this.id = 0; this.p = new Map();
    this.handlers = [];
    this.ready = new Promise((a, b) => {
      this.ws.addEventListener('open', () => a());
      this.ws.addEventListener('error', () => b(new Error('ws')));
    });
    this.ws.addEventListener('message', (e) => {
      let m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.id && this.p.has(m.id)) {
        const { resolve, reject } = this.p.get(m.id); this.p.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
        return;
      }
      if (m.method) this.handlers.forEach(h => h(m));
    });
  }
  on(fn) { this.handlers.push(fn); }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.p.set(id, { resolve: res, reject: rej });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.p.has(id)) { this.p.delete(id); rej(new Error('timeout ' + method)); } }, 60000);
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

(async () => {
  const list = await (await fetch(CDP_HTTP + '/json/list')).json();
  const t = list.find(x => x.type === 'page' && /tiktok/.test(x.url));
  if (!t) throw new Error('CDP 里没有 tiktok 页面');
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;

  const reqs = new Map();   // requestId -> {url, method, headers}
  const out = [];
  cdp.on(async (m) => {
    if (m.method === 'Network.requestWillBeSent') {
      const u = m.params.request.url;
      if (KEEP.test(u)) {
        reqs.set(m.params.requestId, {
          url: u, method: m.params.request.method,
          headers: m.params.request.headers,
          postData: m.params.request.postData || null,
          type: m.params.type,
        });
      }
    } else if (m.method === 'Network.responseReceived') {
      const r = reqs.get(m.params.requestId);
      if (r) {
        r.status = m.params.response.status;
        r.respHeaders = m.params.response.headers;
        r.mimeType = m.params.response.mimeType;
      }
    } else if (m.method === 'Network.loadingFinished') {
      const r = reqs.get(m.params.requestId);
      if (r && r.status != null) {
        reqs.delete(m.params.requestId);
        try {
          const b = await cdp.send('Network.getResponseBody', { requestId: m.params.requestId });
          r.body = b.base64Encoded ? '(base64) ' + b.body.slice(0, BODY_CAP) : b.body.slice(0, BODY_CAP);
          r.bodyLen = b.body.length;
        } catch (e) { r.body = null; r.bodyErr = e.message; }
        out.push(r);
        console.log('[+] %s %s -> %s bodyLen=%s', r.method, r.url.slice(0, 100), r.status, r.bodyLen);
      }
    }
  });

  await cdp.send('Network.enable', {});
  await cdp.send('Page.enable', {});
  console.log('已开启 Network 录制，正在重新加载页面（约 25 秒）…');
  await cdp.send('Page.reload', { ignoreCache: false });
  await new Promise(r => setTimeout(r, 25000));

  // 再主动触发一次业务签名，观察签名阶段的额外请求
  try {
    await cdp.send('Runtime.evaluate', {
      expression: `fetch('https://www.tiktok.com/api/recommend/item_list/?aid=1988&app_name=tiktok_web&device_platform=web_pc&count=12',{headers:{'Content-Type':'application/json'}}).then(r=>r.text()).then(t=>t.length)`,
      returnByValue: true, awaitPromise: true, timeout: 40000,
    });
  } catch (e) {}
  await new Promise(r => setTimeout(r, 4000));

  fs.writeFileSync(OUT, JSON.stringify({ capturedAt: new Date().toISOString(), page: t.url, requests: out }, null, 1));
  console.log('\n共抓取 %d 条 SDK 配置类请求 -> %s', out.length, 'tiktok/artifacts/mssdk-network.json');
  for (const r of out) console.log('   %s %s (%s)', r.method, r.url.slice(0, 110), r.status);
  cdp.close();
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e); process.exit(1); });
