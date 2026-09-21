/**
 * 用「若页面真实发出的 query」做签名保真度验收（proxycli 驱动版）。
 *
 * 与 verify-dynosaur-parity.js 的区别（为什么需要这一份）：
 *   前者用手拼的 query，对 8/12 个接口连浏览器现签都拿不到数据（业务参数不足），
 *   归因被污染。本脚本从 proxycli 的网络记录里直接取**页面真实发出的完整 URL**
 *   （含登录态、device_id、clientABVersions、post_item_list_request_type 等），
 *   保证「离线失败 ≠ query 不对」，结论只归因于签名本身。
 *
 * 判定链（与前者一致，九项中取关键五项）：
 *   A 离线全量              ❌ 基线
 *   B 页面全量              ✅ 证明请求合法
 *   C 离线 + 页面 X-Dynosaur ✅ ⇒ 唯一差异参数
 *   D 离线 + 页面 X-Gnarly   ❌ 排除
 *   E 页面 + 离线 X-Dynosaur ❌ 反向验证
 *
 * 前置：
 *   proxycli open && proxycli browser connect --cloak
 * 用法：
 *   cd /d/work/jsreverse && MSYS_NO_PATHCONV=1 node tiktok/solver/verify-realquery-parity.js [/api/post/item_list/]
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { TikTokSigner } = require('./tt_sign');

const ART = path.join(__dirname, '..', 'artifacts');
const SIG = ['X-Bogus', 'X-Gnarly', 'X-Dynosaur', 'msToken'];
const get = (q, k) => { const m = new RegExp('[?&]' + k + '=([^&]*)').exec(q); return m ? m[1] : ''; };
const set = (q, k, v) => { const p = q.split('&'); const i = p.findIndex(s => s.split('=')[0] === k); if (i === -1) p.push(k + '=' + v); else p[i] = k + '=' + v; return p.join('&'); };

function proxycli(args, timeout = 300000) {
  return execFileSync('proxycli', args, { encoding: 'utf8', timeout, shell: true });
}

/** 页面侧脚本统一回传 base64，避免 shell 转义破坏引号/反斜杠 */
function evalInPage(fnSrc, timeoutMs = 240000) {
  const p = path.join(os.tmpdir(), 'verify-realquery.js');
  fs.writeFileSync(p, fnSrc);
  const raw = proxycli(['call', 'evaluate_script', '--file', p, '--allowAnyFrame', 'true', '--timeoutMs', String(timeoutMs)], timeoutMs + 60000);
  const line = raw.split(/\r?\n/).map(l => l.trim()).find(l => /^value:\s*[A-Za-z0-9+/=]{2,}$/.test(l));
  if (!line) throw new Error('未取到 base64 value:\n' + raw.slice(0, 900));
  const text = Buffer.from(line.replace(/^value:\s*/, ''), 'base64').toString('utf8');
  try { return JSON.parse(text); } catch (e) { return text; }
}

/** iframe 原始 fetch 批量发 URL（页面 SDK 会二次签名，绝不能用页面 fetch） */
function runOracle(urls) {
  const fn = `
async () => {
  document.querySelectorAll('iframe').forEach(f => { try { f.remove(); } catch (e) {} });
  const ifr = document.createElement('iframe');
  ifr.style.display = 'none';
  document.body.appendChild(ifr);
  await new Promise(r => setTimeout(r, 500));
  const f = ifr.contentWindow.fetch.bind(ifr.contentWindow);
  const META = ['extra', 'log_pb', 'statusCode', 'status_code', 'status_msg', 'hasMore', 'cursor'];
  const out = [];
  for (const u of ${JSON.stringify(urls)}) {
    try {
      const r = await f(u, { headers: { 'Content-Type': 'application/json' } });
      const tx = await r.text();
      let j = null; try { j = JSON.parse(tx); } catch (e) {}
      const code = j ? (j.status_code != null ? j.status_code : j.statusCode) : null;
      let detail = 'sc=' + code + ' len=' + tx.length, ok = false;
      if (j && code === 0) {
        const k = Object.keys(j).find(x => !META.includes(x) && Array.isArray(j[x]) && j[x].length);
        if (k) { ok = true; detail = k + '[' + j[k].length + ']'; }
      }
      out.push({ status: r.status, len: tx.length, code, ok, detail });
    } catch (e) { out.push({ status: 0, len: 0, ok: false, detail: 'ERR ' + String(e && e.message) }); }
    await new Promise(r => setTimeout(r, 2500));
  }
  ifr.remove();
  return btoa(unescape(encodeURIComponent(JSON.stringify(out))));
}`;
  return evalInPage(fn);
}

(async () => {
  const target = process.argv[2] || '/api/post/item_list/';
  if (!/^\/api\//.test(target)) {
    throw new Error('路径参数被 MSYS 转成了 Windows 路径: ' + target + '\n   → 请用 MSYS_NO_PATHCONV=1 重跑');
  }

  // ① 触发页面发一次目标请求（导航到用户页），让网络记录里出现完整 query
  evalInPage(`async () => {
    document.querySelectorAll('iframe').forEach(f => { try { f.remove(); } catch (e) {} });
    try {
      const m = location.pathname.match(/^\\/@([^\\/]+)/);
      const u = (m && m[1]) ? 'https://www.tiktok.com/@' + m[1] : 'https://www.tiktok.com/foryou';
      setTimeout(() => { location.href = u; }, 50);
    } catch (e) {}
    return btoa('nav');
  }`, 40000);
  await new Promise(r => setTimeout(r, 15000));

  // ② 从网络记录里取页面真实发出的完整 URL
  const net = proxycli(['call', 'list_network_requests', '--urlFilter', target, '--pageSize', '3']);
  const found = [...net.matchAll(/"(https:\/\/www\.tiktok\.com[^"]*?)"/g)].map(m => m[1]).filter(u => u.indexOf(target) !== -1);
  const realUrl = found.pop();
  if (!realUrl) throw new Error('未能从网络记录里取到 ' + target + ' 的真实 URL（页面是否已加载 webmssdk？）');
  const realRaw = realUrl.slice(realUrl.indexOf('?') + 1).split('&').filter(s => !SIG.includes(s.split('=')[0])).join('&');
  console.log('目标: %s', target);
  console.log('页面真实 query: %d 个参数   页面签名的 X-Dynosaur=%d 字符', realRaw.split('&').length, get(realUrl, 'X-Dynosaur').length);

  // ③ 离线签名：会话取页面当前值（msToken 用页面真实 URL 里那一个，保证同源）
  const sess = JSON.parse(fs.readFileSync(path.join(ART, 'session-dump.json'), 'utf8'));
  const liveMs = get(realUrl, 'msToken');
  const storage = { local: Object.assign({}, sess.local, { msToken: liveMs, xmst: liveMs }), session: Object.assign({}, sess.session, { msToken: liveMs }) };
  const s = new TikTokSigner({ cookie: sess.cookie, storage, url: 'https://www.tiktok.com/foryou' }).init();
  s.bootstrap();
  const O = (await s.sign(realRaw, target)).url;

  const cases = [
    ['A 离线全量', O],
    ['B 页面全量', realUrl],
    ['C 离线 + 页面 X-Dynosaur', set(O, 'X-Dynosaur', get(realUrl, 'X-Dynosaur'))],
    ['D 离线 + 页面 X-Gnarly', set(O, 'X-Gnarly', get(realUrl, 'X-Gnarly'))],
    ['E 页面 + 离线 X-Dynosaur', set(realUrl, 'X-Dynosaur', get(O, 'X-Dynosaur'))],
  ];
  const res = runOracle(cases.map(c => c[1]));
  console.log('\n=== 结果（真 query，仅换单个签名参数）===');
  const rows = [];
  cases.forEach((c, i) => {
    const r = res[i] || {};
    console.log('   ' + c[0].padEnd(26) + (r.ok ? '✅ ' + r.detail : '❌ ' + r.detail));
    rows.push({ name: c[0], ...r });
  });

  const pass = !rows[0].ok && rows[1].ok && rows[2].ok && !rows[3].ok && !rows[4].ok;
  console.log('\nX-Dynosaur: 离线 %d 字符 / 页面 %d 字符', get(O, 'X-Dynosaur').length, get(realUrl, 'X-Dynosaur').length);
  console.log('\n判定：%s', pass
    ? '✅ 用页面真实 query 复现同一结论 —— 唯一不等价的签名参数是 X-Dynosaur\n' +
      '   （已排除「手拼 query 不全」这个干扰变量：同一份 query 只换 X-Dynosaur 即可通过）'
    : '❌ 判定链不完整（端点可能有状态波动，建议重跑）');

  fs.writeFileSync(path.join(ART, 'verify-realquery-parity.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), target, realUrl, offlineUrl: O, thresholds: { pass }, results: rows,
  }, null, 1));
  console.log('-> tiktok/artifacts/verify-realquery-parity.json');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 10).join('\n') : e); process.exit(1); });