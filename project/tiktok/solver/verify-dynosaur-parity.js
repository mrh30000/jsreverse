/**
 * X-Dynosaur 保真度验收（关键验收项）。
 *
 * 背景：README 原先的验收只跑 `/api/recommend/item_list/` 并通过，于是写成「签名被服务端接受」。
 * 实测该端点校验宽松，这个结论**过宽**。本脚本用「参数级交叉替换」把问题定位到单个参数：
 *
 *   对同一份**逐字节相同**的 raw query，各取离线签名与页面现签两组，然后交叉换参数：
 *     A 离线全量               —— 在 recommend 上通过、在 post/item_list 上被拒
 *     B 页面全量               —— 两条都通过（对照，必须成立）
 *     C 离线 + 页面 X-Dynosaur —— 若通过 ⇒ 唯一差异参数就是 X-Dynosaur
 *     D 离线 + 页面 X-Gnarly   —— 应仍被拒（证明不是它）
 *     E 离线 + 页面 msToken    —— 应仍被拒（证明不是它）
 *     F 离线 + 页面 X-Bogus    —— 应仍被拒（证明不是它）
 *     G 页面 + 离线 X-Dynosaur —— 应被拒（反向验证：换掉好签名就坏）
 *
 * 判定：C 通过 且 D/E/F 不通过 且 G 不通过 ⇒ 离线 X-Dynosaur 与浏览器不等价，其余参数等价。
 *
 * 已验证的排除项（都不影响结果）：配置对象、原生伪装、crypto.subtle、mssdk 后端响应、
 * 浏览器全局、页面 URL / 指纹输入；同码同配置的真浏览器 iframe 签名**被接受**。
 *
 * 用法：cd /d/work/jsreverse && node tiktok/solver/verify-dynosaur-parity.js
 * 产物：tiktok/artifacts/verify-dynosaur-parity.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { TikTokSigner } = require('./tt_sign');
const { runOracle, pageSigned, pageSession, realQueryUrl, proxycliAvailable, RAW_POST } = require('./cdp-oracle');
const SIG = ['X-Bogus', 'X-Gnarly', 'X-Dynosaur', 'msToken'];

const ART = path.join(__dirname, '..', 'artifacts');
const PATH_REC = '/api/recommend/item_list/';
const PATH_POST = '/api/post/item_list/';
const get = (q, k) => { const m = new RegExp('[?&]' + k + '=([^&]*)').exec(q); return m ? m[1] : ''; };
const set = (q, k, v) => { const p = q.split('&'); const i = p.findIndex(s => s.split('=')[0] === k); if (i === -1) p.push(k + '=' + v); else p[i] = k + '=' + v; return p.join('&'); };
const b64len = (s) => Buffer.from(String(s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').length;

(async () => {
  // ★ 优先用**页面真实发出的完整 query**。
  //   手拼 query 的 device_id/odinId/verifyFp 来自旧快照，与当前登录态 cookie 不匹配，
  //   会导致页面现签也返回空体、A/B 失去基准（实测确实发生过）。
  let browserPost = null, RAW = RAW_POST;
  if (proxycliAvailable()) {
    const real = await realQueryUrl(PATH_POST);
    if (real) {
      browserPost = real;
      RAW = real.slice(real.indexOf('?') + 1).split('&').filter(s => !SIG.includes(s.split('=')[0])).join('&');
      console.log('基准：来自页面真实请求（%d 个参数）', RAW.split('&').length);
    }
  }
  if (!browserPost) {
    browserPost = await pageSigned(RAW_POST, PATH_POST);
    console.log('基准：手拼 query（proxycli 后端不可用或不适用）');
  }
  if (!browserPost) throw new Error('未抓到页面自签 URL（先确认页面已加载 webmssdk）');
  const page = await pageSession();
  const liveMs = get(browserPost, 'msToken');
  const st = {
    local: Object.assign({}, page.local, { msToken: liveMs, xmst: liveMs }),
    session: Object.assign({}, page.session, { msToken: liveMs }),
  };
  const mk = () => { const s = new TikTokSigner({ cookie: page.cookie, storage: st, url: page.url }).init(); s.bootstrap(); return s; };

  const report = { browserPost: { dyn: get(browserPost, 'X-Dynosaur'), gnarly: get(browserPost, 'X-Gnarly') }, blocks: {} };

  // ---------- 对照一：recommend（校验宽松）----------
  {
    const O = (await mk().sign(RAW, PATH_REC)).url;
    const B = await pageSigned(RAW, PATH_REC);
    const cases = [
      ['A 离线全量', O],
      ['B 页面全量', B],
      ['C 离线 + 页面 X-Dynosaur', set(O, 'X-Dynosaur', get(B, 'X-Dynosaur'))],
      ['D 页面 + 离线 X-Dynosaur', set(B, 'X-Dynosaur', get(O, 'X-Dynosaur'))],
    ];
    const res = await runOracle(cases.map(c => c[1]));
    console.log('\n=== 对照一：' + PATH_REC + '（校验宽松）===');
    const out = [];
    cases.forEach((c, i) => {
      const r = res[i] || {};
      console.log('   ' + c[0].padEnd(26) + (r.ok ? '✅ ' + r.detail : '❌ ' + r.detail));
      out.push({ name: c[0], ...r });
    });
    report.blocks.recommend = out;
  }

  // ---------- 对照二：post/item_list（校验严格；浏览器现签可通过）----------
  {
    const O = (await mk().sign(RAW, PATH_POST)).url;
    const cases = [
      ['A 离线全量', O],
      ['B 页面全量', browserPost],
      ['C 离线 + 页面 X-Dynosaur', set(O, 'X-Dynosaur', get(browserPost, 'X-Dynosaur'))],
      ['D 离线 + 页面 X-Gnarly', set(O, 'X-Gnarly', get(browserPost, 'X-Gnarly'))],
      ['E 离线 + 页面 msToken', set(O, 'msToken', get(browserPost, 'msToken'))],
      ['F 离线 + 页面 X-Bogus', set(O, 'X-Bogus', get(browserPost, 'X-Bogus'))],
      ['G 离线 + 页面全部签名参数', ['X-Dynosaur', 'X-Gnarly', 'msToken', 'X-Bogus'].reduce((u, k) => set(u, k, get(browserPost, k)), O)],
      ['H 页面 + 离线 X-Dynosaur', set(browserPost, 'X-Dynosaur', get(O, 'X-Dynosaur'))],
      ['I 页面 + 离线 X-Gnarly', set(browserPost, 'X-Gnarly', get(O, 'X-Gnarly'))],
    ];
    const res = await runOracle(cases.map(c => c[1]));
    console.log('\n=== 对照二：' + PATH_POST + '（校验严格）===');
    const out = [];
    cases.forEach((c, i) => {
      const r = res[i] || {};
      console.log('   ' + c[0].padEnd(26) + (r.ok ? '✅ ' + r.detail : '❌ ' + r.detail));
      out.push({ name: c[0], ...r });
    });
    report.blocks.post = out;

    console.log('\nX-Dynosaur：离线 %d 字符 / %d 字节  ｜ 页面 %d 字符 / %d 字节',
      get(O, 'X-Dynosaur').length, b64len(get(O, 'X-Dynosaur')),
      get(browserPost, 'X-Dynosaur').length, b64len(get(browserPost, 'X-Dynosaur')));
    console.log('X-Gnarly  ：离线 %d 字符 / %d 字节  ｜ 页面 %d 字符 / %d 字节',
      get(O, 'X-Gnarly').length, b64len(get(O, 'X-Gnarly')),
      get(browserPost, 'X-Gnarly').length, b64len(get(browserPost, 'X-Gnarly')));
    report.lengths = {
      offline: { dyn: get(O, 'X-Dynosaur'), gnarly: get(O, 'X-Gnarly') },
      browser: { dyn: get(browserPost, 'X-Dynosaur'), gnarly: get(browserPost, 'X-Gnarly') },
    };
  }

  // ---------- 判定 ----------
  const p = (i) => report.blocks.post[i];
  const concl = {
    A_offlineRejected: !p(0).ok,
    B_browserAccepted: !!p(1).ok,
    C_dynosaurFix: !!p(2).ok,
    D_gnarlyNoFix: !p(3).ok,
    E_msTokenNoFix: !p(4).ok,
    F_bogusNoFix: !p(5).ok,
    G_allBrowserSigFix: !!p(6).ok,
    H_offlineDynBreaksBrowser: !p(7).ok,
    I_offlineGnarlyFine: !!p(8).ok,
  };
  const pass = concl.A_offlineRejected && concl.B_browserAccepted && concl.C_dynosaurFix &&
    concl.D_gnarlyNoFix && concl.E_msTokenNoFix && concl.F_bogusNoFix &&
    concl.G_allBrowserSigFix && concl.H_offlineDynBreaksBrowser && concl.I_offlineGnarlyFine;

  console.log('\n===== 判定 =====');
  console.log('A 离线签名在严格端点上被拒          : ' + (concl.A_offlineRejected ? '✅' : '❌'));
  console.log('B 页面现签在同一端点上被接受        : ' + (concl.B_browserAccepted ? '✅' : '❌'));
  console.log('C 换上页面的 X-Dynosaur 即通过      : ' + (concl.C_dynosaurFix ? '✅' : '❌'));
  console.log('D/E/F 换 X-Gnarly / msToken / X-Bogus 都不通过: ' +
    (concl.D_gnarlyNoFix && concl.E_msTokenNoFix && concl.F_bogusNoFix ? '✅' : '❌'));
  console.log('G 全部签名参数换页面版即通过        : ' + (concl.G_allBrowserSigFix ? '✅' : '❌'));
  console.log('H 把页面的 X-Dynosaur 换成离线的即被拒: ' + (concl.H_offlineDynBreaksBrowser ? '✅' : '❌'));
  console.log('I 离线的 X-Gnarly 不影响结果        : ' + (concl.I_offlineGnarlyFine ? '✅' : '❌'));
  console.log('\n结论：%s', pass
    ? '✅ 已定位：唯一不等价的签名参数是 **X-Dynosaur**；X-Gnarly / msToken / X-Bogus 与浏览器等价。\n' +
      '   ⇒ README「四参数可离线生成、签名被服务端接受」应改为：\n' +
      '      · X-Gnarly / msToken / X-Bogus 与浏览器等价，可以离线替；\n' +
      '      · X-Dynosaur 可生成但服务端**不认可**，只在校验宽松的端点上通过；\n' +
      '      · 「脱离浏览器可用」目前仅对 /api/recommend/item_list/ 与 /api/user/list/ 成立（见 verify-endpoint-matrix.js）。'
    : '❌ 判定链不完整，需回查（可能有端点状态波动，建议重跑）');

  fs.writeFileSync(path.join(ART, 'verify-dynosaur-parity.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), thresholds: concl, pass, ...report }, null, 1));
  console.log('\n原始结果 -> tiktok/artifacts/verify-dynosaur-parity.json');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e); process.exit(1); });
