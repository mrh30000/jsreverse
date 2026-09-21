/**
 * 诊断：为什么某接口「http=200 但响应体 0 字节」——是签名不对，还是业务参数不足？
 *
 * 三路**互相独立**的对照，把「签名问题」和「参数问题」拆开：
 *   P) 页面 fetch（页面 SDK 会二次签名）—— 页面自己都不行 ⇒ 不是我们签名的问题
 *   I) iframe 原始 fetch + 我们的离线签名
 *   O) iframe 原始 fetch + **浏览器现签**的 URL（本次新增，关键对照）
 *
 * 判读：
 *   O 通过 而 I 不通过 ⇒ 签名问题（离线签名不达标）
 *   O/I 都不通过      ⇒ 业务参数不足（该接口还需要别的 query 参数）
 *   P 抛错            ⇒ 页面 fetch 被 SDK/扩展污染，不能作为对照（见 README 坑 1）
 *
 * 用法：cd /d/work/jsreverse && node tiktok/solver/diagnose-empty-body.js [/api/user/detail/] ["uniqueId=xxx&from_page=user"]
 *
 * ⚠️ Windows + MSYS 坑：以 `/` 开头的参数会被 MSYS 自动转成 Windows 路径（如 `E:/env/Git/api/...`），
 * 导致请求路径错乱。请用 `MSYS_NO_PATHCONV=1 node ...` 运行，或用 `tt_session.js` 里同样的写法。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { TikTokSigner } = require('./tt_sign');
const { runOracle, pageSigned, pageSession } = require('./cdp-oracle');

const ART = path.join(__dirname, '..', 'artifacts');
const BASE_RAW = 'WebIdLastTime=0&aid=1988&app_language=en&app_name=tiktok_web&browser_language=en-US&browser_name=Mozilla&browser_online=true&browser_platform=Win32&channel=tiktok_web&count=12&cookie_enabled=true&coverFormat=2&cursor=0&data_collection_enabled=false&device_platform=web_pc&focus_state=true&from_page=fyp&history_len=3&is_fullscreen=false&is_page_visible=true&language=en&os=windows&priority_region=SG&region=SG&screen_height=1080&screen_width=1920&tz_name=Asia/Singapore&user_is_login=true&video_encoding=dash&webcast_language=en';

function up(q, k, v) {   // 字符串级追加/覆盖（保持其余字节不变）
  const parts = q.split('&');
  const i = parts.findIndex(s => s.split('=')[0] === k);
  if (i === -1) parts.push(k + '=' + v); else parts[i] = k + '=' + v;
  return parts.join('&');
}
const get = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]*)').exec(u); return m ? m[1] : ''; };

(async () => {
  const target = process.argv[2] || '/api/user/detail/';
  if (!/^\/api\//.test(target)) {
    throw new Error('路径参数异常（很可能被 MSYS 转成了 Windows 路径）: ' + target +
      '\n   → 请用 MSYS_NO_PATHCONV=1 重跑');
  }
  const extra = process.argv[3] || 'uniqueId=tiktok&from_page=user';
  const raw = extra.split('&').reduce((q, kv) => up(q, kv.split('=')[0], kv.slice(kv.indexOf('=') + 1)), BASE_RAW);

  const page = await pageSession();
  const sess = JSON.parse(fs.readFileSync(path.join(ART, 'session-dump.json'), 'utf8'));
  // 页面现签要用页面自己的 msToken，离线签名也要对齐同一份（否则比对不成立）
  const browserUrl = await pageSigned(raw, target);
  // msToken 必须与页面同源：优先取页面现签 URL 里的值，退化到页面 localStorage。
  // （dump 快照里的 msToken 可能已过期，用它会得到「签名不对」的假结论）
  const liveMs = (browserUrl && get(browserUrl, 'msToken')) || page.local.msToken || sess.local.msToken || '';
  const storage = {
    local: Object.assign({}, page.local, { msToken: liveMs, xmst: liveMs }),
    session: Object.assign({}, page.session, { msToken: liveMs }),
  };
  const s = new TikTokSigner({ cookie: page.cookie, storage, url: page.url }).init();
  s.bootstrap();
  const offlineUrl = (await s.sign(raw, target)).url;

  console.log('目标: %s', target);
  console.log('raw 参数个数: %d', raw.split('&').length);

  console.log('   ' + 'browserUrl: ' + (browserUrl ? browserUrl.slice(0, 100) : '(未抓到)') + '');
  const urls = [offlineUrl, browserUrl].filter(Boolean);
  const labels = ['I iframe + 离线签名', 'O iframe + 浏览器现签'];
  const res = await runOracle(urls);
  labels.forEach((l, i) => console.log('   ' + l.padEnd(24) + (res[i] && res[i].ok ? '✅ ' + res[i].detail : '❌ ' + (res[i] && res[i].detail))));

  const iOk = res[0] && res[0].ok, oOk = res[urls.length - 1] && res[urls.length - 1].ok;
  console.log('\n判读: %s', oOk && !iOk ? '签名问题（离线签名不达标）'
    : (!oOk && !iOk ? '业务参数不足（浏览器现签也不行）' : (iOk ? '两者都通过（签名可用）' : '需人工核对')));

  console.log('\n--- 离线的 URL 参数与签名长度 ---');
  for (const seg of offlineUrl.slice(offlineUrl.indexOf('?') + 1).split('&')) {
    const k = seg.split('=')[0];
    const v = seg.slice(k.length + 1);
    console.log('   ' + k.padEnd(24) + (/^X-|^msToken$/.test(k) ? 'SIG len=' + v.length : 'len=' + v.length + '  ' + v.slice(0, 50)));
  }
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e); process.exit(1); });
