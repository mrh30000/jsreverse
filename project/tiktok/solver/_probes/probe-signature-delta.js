/**
 * 探针 T（决定性问题）：离线签名到底「差在哪」——
 * 是算法不达标，还是只是少了某个只有页面会话才有的输入？
 *
 * 做法：对同一份逐字节相同的 raw query，各取两组签名（离线 / 页面现签），
 * 然后**交叉替换**单个参数，观察哪一步能让离线签名变为被接受：
 *   A 离线全量                 —— 已知被拒
 *   B 页面全量                 —— 已知被接受
 *   C 离线 + 用页面的 X-Dynosaur —— 若通过，则差别**只在** X-Dynosaur
 *   D 页面 + 用离线的 X-Dynosaur —— 反向验证：换掉好签名就坏
 *   E 离线 + 页面的 X-Gnarly
 *   F 离线 + 页面的 msToken
 *
 * 用法：cd /d/work/jsreverse && node tiktok/solver/_probes/probe-signature-delta.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { TikTokSigner } = require('../tt_sign');
const { runOracle, pageSigned, pageSession } = require('../cdp-oracle');

const PATH_POST = '/api/post/item_list/';
const PATH_REC = '/api/recommend/item_list/';
const get = (q, k) => { const m = new RegExp('[?&]' + k + '=([^&]*)').exec(q); return m ? m[1] : ''; };
const set = (q, k, v) => { const p = q.split('&'); const i = p.findIndex(s => s.split('=')[0] === k); if (i === -1) p.push(k + '=' + v); else p[i] = k + '=' + v; return p.join('&'); };

(async () => {
  const page = await pageSession();
  const RAW = require('../cdp-oracle').RAW_POST;
  const liveMs = get(await pageSigned(RAW, PATH_POST), 'msToken');
  const st = { local: Object.assign({}, page.local, { msToken: liveMs, xmst: liveMs }), session: Object.assign({}, page.session, { msToken: liveMs }) };
  const mk = () => { const s = new TikTokSigner({ cookie: page.cookie, storage: st, url: page.url }).init(); s.bootstrap(); return s; };

  console.log('=== 对照一：recommend（校验宽松）===');
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
    cases.forEach((c, i) => console.log(c[0].padEnd(28) + JSON.stringify(res[i] || {})));
  }

  console.log('\n=== 对照二：post/item_list（校验严格；浏览器现签可通过）===');
  {
    const O = (await mk().sign(RAW, PATH_POST)).url;
    const B = await pageSigned(RAW, PATH_POST);
    const cases = [
      ['A 离线全量', O],
      ['B 页面全量', B],
      ['C 离线 + 页面 X-Dynosaur', set(O, 'X-Dynosaur', get(B, 'X-Dynosaur'))],
      ['D 离线 + 页面 X-Gnarly', set(O, 'X-Gnarly', get(B, 'X-Gnarly'))],
      ['E 离线 + 页面 msToken', set(O, 'msToken', get(B, 'msToken'))],
      ['F 离线 + 页面 X-Bogus', set(O, 'X-Bogus', get(B, 'X-Bogus'))],
      ['G 离线 + 页面全部签名参数', ['X-Dynosaur', 'X-Gnarly', 'msToken', 'X-Bogus'].reduce((u, k) => set(u, k, get(B, k)), O)],
      ['H 页面 + 离线 X-Dynosaur', set(B, 'X-Dynosaur', get(O, 'X-Dynosaur'))],
      ['I 页面 + 离线 X-Gnarly', set(B, 'X-Gnarly', get(O, 'X-Gnarly'))],
    ];
    const res = await runOracle(cases.map(c => c[1]));
    cases.forEach((c, i) => {
      const r = res[i] || {};
      console.log(c[0].padEnd(28) + JSON.stringify(r));
    });
    console.log('\n离线 X-Dynosaur 长度=%d  页面 X-Dynosaur 长度=%d',
      get(O, 'X-Dynosaur').length, get(B, 'X-Dynosaur').length);
    console.log('离线 X-Gnarly   长度=%d  页面 X-Gnarly   长度=%d',
      get(O, 'X-Gnarly').length, get(B, 'X-Gnarly').length);
  }
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e); process.exit(1); });
