/**
 * 探针 Y：用页面**真实发出的** query（从 proxycli 网络记录取，含登录态与完整业务参数）
 * 做离线 / 页面 的 A/B，再交叉替换单参数 —— 排除「手拼 query 不完整」这个干扰变量。
 *
 * 为什么要改用真 query：之前 verify-dynosaur-parity 用的手拼 query，
 * 对 8/12 个接口浏览器现签也拿不到数据（业务参数不足），使归因不干净。
 * proxycli 的 list_network_requests 直接给出页面真实请求的完整 URL，可直接复用。
 *
 * 用法：
 *   cd /d/work/jsreverse && proxycli open && proxycli browser connect --cloak
 *   # 先在页面里触发一次目标接口请求（脚本会自动触发）
 *   node tiktok/solver/_probes/probe-realquery-ab.js [/api/post/item_list/]
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { TikTokSigner } = require('../tt_sign');

const ART = path.join(__dirname, '..', '..', 'artifacts');
const SIG = ['X-Bogus', 'X-Gnarly', 'X-Dynosaur', 'msToken'];
const get = (q, k) => { const m = new RegExp('[?&]' + k + '=([^&]*)').exec(q); return m ? m[1] : ''; };
const set = (q, k, v) => { const p = q.split('&'); const i = p.findIndex(s => s.split('=')[0] === k); if (i === -1) p.push(k + '=' + v); else p[i] = k + '=' + v; return p.join('&'); };

function proxycli(args, timeout = 240000) {
  return execFileSync('proxycli', args, { encoding: 'utf8', timeout, shell: true });
}

/** 用 proxycli 在页面执行一个函数脚本，回传 base64（避开 shell 转义）
 *  @param {'json'|'raw'} mode  json=解码后按 JSON 解析；raw=解码后原样返回字符串 */
function evalInPage(fnSrc, timeoutMs = 180000, mode = 'json') {
  const p = path.join(os.tmpdir(), 'probe-realquery.js');
  fs.writeFileSync(p, fnSrc);
  const raw = proxycli(['call', 'evaluate_script', '--file', p, '--allowAnyFrame', 'true', '--timeoutMs', String(timeoutMs)]);
  const line = raw.split(/\r?\n/).map(l => l.trim()).find(l => /^value:\s*[A-Za-z0-9+/=]{2,}$/.test(l));
  if (!line) throw new Error('未取到 base64 value:\n' + raw.slice(0, 900));
  const text = Buffer.from(line.replace(/^value:\s*/, ''), 'base64').toString('utf8');
  return mode === 'raw' ? text : JSON.parse(text);
}

/** 触发一次目标请求（导航到用户页，页面会自然发出 post/item_list），让网络记录里出现完整 query */
function triggerUserPageRequest() {
  return evalInPage(`async () => {
    document.querySelectorAll('iframe').forEach(f => { try { f.remove(); } catch (e) {} });
    try {
      const m = location.pathname.match(/^\\/@([^\\/]+)/);
      const u = m && m[1] ? 'https://www.tiktok.com/@' + m[1] : 'https://www.tiktok.com/foryou';
      setTimeout(() => { location.href = u; }, 50);
    } catch (e) {}
    return btoa('nav');
  }`, 30000, 'raw');
}

/** 用 proxycli 批量发 URL（iframe 原始 fetch），回传 base64 结果 */
function runOracle(urls) {
  const fn = `
async () => {
  document.querySelectorAll('iframe').forEach(f => { try { f.remove(); } catch (e) {} });
  const ifr = document.createElement('iframe');
  ifr.style.display = 'none';
  document.body.appendChild(ifr);
  await new Promise(r => setTimeout(r, 400));
  const f = ifr.contentWindow.fetch.bind(ifr.contentWindow);
  const out = [];
  for (const u of ${JSON.stringify(urls)}) {
    try {
      const r = await f(u, { headers: { 'Content-Type': 'application/json' } });
      const tx = await r.text();
      let j = null; try { j = JSON.parse(tx); } catch (e) {}
      const keys = j ? Object.keys(j) : [];
      const arr = keys.find(k => Array.isArray(j[k]) && j[k].length);
      const obj = keys.find(k => j[k] && typeof j[k] === 'object' && !Array.isArray(j[k]) && Object.keys(j[k]).length && !['extra','log_pb','statusCode','status_code','status_msg'].includes(k));
      const code = j ? (j.status_code != null ? j.status_code : j.statusCode) : null;
      out.push({ status: r.status, len: tx.length, code,
        ok: !!(code === 0 && (arr || obj)), detail: arr ? arr + '[' + j[arr].length + ']' : (obj ? obj + '{' + Object.keys(j[obj]).length + '}' : 'sc=' + code + ' len=' + tx.length) });
    } catch (e) { out.push({ status: 0, len: 0, ok: false, detail: 'ERR ' + String(e && e.message) }); }
    await new Promise(r => setTimeout(r, 2500));
  }
  ifr.remove();
  return btoa(unescape(encodeURIComponent(JSON.stringify(out))));
}`;
  return evalInPage(fn, 240000);
}

(async () => {
  const target = process.argv[2] || '/api/post/item_list/';
  if (!/^\/api\//.test(target)) {
    throw new Error('路径参数被 MSYS 转成了 Windows 路径: ' + target + '\n   → 请用 MSYS_NO_PATHCONV=1 重跑');
  }
  const rawQueryUrl = process.argv[3] || null;   // 可选：直接指定一个已抓到的 URL

  let realUrl = rawQueryUrl;
  if (!realUrl) {
    triggerUserPageRequest();
    await new Promise(r => setTimeout(r, 14000));
    const out = proxycli(['call', 'list_network_requests', '--urlFilter', target, '--pageSize', '3'], 240000);
    const urls = [...out.matchAll(/"(https:\/\/www\.tiktok\.com[^"]*?)"/g)].map(m => m[1]).filter(u => u.indexOf(target) !== -1);
    realUrl = urls.pop() || null;
  }
  if (!realUrl) throw new Error('未能从网络记录里取到 ' + target + ' 的真实 URL');

  const realRaw = realUrl.slice(realUrl.indexOf('?') + 1).split('&').filter(s => !SIG.includes(s.split('=')[0])).join('&');
  console.log('目标: %s', target);
  console.log('真实 query 参数数: %d   页面签名的 X-Dynosaur 长度: %d', realRaw.split('&').length, get(realUrl, 'X-Dynosaur').length);

  // ③ 取页面当前会话（cookie + storage），让离线签名与页面同源
  const sess = JSON.parse(fs.readFileSync(path.join(ART, 'session-dump.json'), 'utf8'));
  const pageCookie = (() => {
    try {
      const s = proxycli(['call', 'get_storage', '--filter', 'cookie'], 120000);
      const m = /cookieHeader:\s*([^\n]+)/.exec(s);
      return m ? m[1].trim() : sess.cookie;
    } catch (e) { return sess.cookie; }
  })();
  // 页面真实 URL 里的 msToken 就是当前有效的那个
  const liveMs = get(realUrl, 'msToken');
  const storage = { local: Object.assign({}, sess.local, { msToken: liveMs, xmst: liveMs }), session: Object.assign({}, sess.session, { msToken: liveMs }) };

  const s = new TikTokSigner({ cookie: pageCookie, storage, url: 'https://www.tiktok.com/foryou' }).init();
  s.bootstrap();
  const O = (await s.sign(realRaw, target)).url;

  const cases = [
    ['A 离线全量（真 query）', O],
    ['B 页面全量（真 query）', realUrl],
    ['C 离线 + 页面 X-Dynosaur', set(O, 'X-Dynosaur', get(realUrl, 'X-Dynosaur'))],
    ['D 离线 + 页面 X-Gnarly', set(O, 'X-Gnarly', get(realUrl, 'X-Gnarly'))],
    ['E 页面 + 离线 X-Dynosaur', set(realUrl, 'X-Dynosaur', get(O, 'X-Dynosaur'))],
  ];
  const res = runOracle(cases.map(c => c[1]));
  console.log('\n=== 结果（真 query，仅换单个签名参数）===');
  cases.forEach((c, i) => {
    const r = res[i] || {};
    console.log('   ' + c[0].padEnd(28) + (r.ok ? '✅ ' + r.detail : '❌ ' + r.detail));
  });
  console.log('\n离线 X-Dynosaur=%d  页面 X-Dynosaur=%d', get(O, 'X-Dynosaur').length, get(realUrl, 'X-Dynosaur').length);

  fs.writeFileSync(path.join(ART, 'probe-realquery-ab.json'), JSON.stringify({ target, realUrl, offlineUrl: O, results: res.map((r, i) => ({ name: cases[i][0], ...r })) }, null, 1));
  console.log('-> tiktok/artifacts/probe-realquery-ab.json');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 10).join('\n') : e); process.exit(1); });