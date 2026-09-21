/**
 * 探针 R（结论级）：证明「Node 离线签名只在 recommend 上被接受，
 * 在其它业务接口上被拒」——即 README 原结论「签名已被服务端接受」仅对推荐流成立。
 *
 * 关键手法：同一份已签 URL，只换路径（query 字节不变），看服务端是否还接受。
 * 若「recommend 过、post 不过」，说明判定差异来自**路径**，不是 query。
 *
 * 用法：cd /d/work/jsreverse && node tiktok/solver/_probes/probe-path-strictness.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { TikTokSigner } = require('../tt_sign');
const { RAW_POST, runOracle, pageSigned, pageSession } = require('./_oracle');

const PATH_POST = '/api/post/item_list/';
const PATH_REC = '/api/recommend/item_list/';
const get = (q, k) => { const m = new RegExp('[?&]' + k + '=([^&]*)').exec(q); return m ? m[1] : ''; };
const swapPath = (u, p) => u.replace(/^https:\/\/www\.tiktok\.com[^?]*/, 'https://www.tiktok.com' + p);

(async () => {
  const page = await pageSession();
  const liveMs = get(await pageSigned(RAW_POST, PATH_POST), 'msToken');
  const st = {
    local: Object.assign({}, page.local, { msToken: liveMs, xmst: liveMs }),
    session: Object.assign({}, page.session, { msToken: liveMs }),
  };
  const mk = () => { const s = new TikTokSigner({ cookie: page.cookie, storage: st, url: page.url }).init(); s.bootstrap(); return s; };

  const oursPost = (await mk().sign(RAW_POST, PATH_POST)).url;
  const oursRec = (await mk().sign(RAW_POST, PATH_REC)).url;
  const browserPost = await pageSigned(RAW_POST, PATH_POST);

  const cases = [
    ['① 浏览器签 + post 路径（对照）', browserPost],
    ['② 我们签 + post 路径', oursPost],
    ['③ 我们(post query) + recommend 路径', swapPath(oursPost, PATH_REC)],
    ['④ 我们签(recommend) + recommend 路径', oursRec],
    ['⑤ 我们(recommend query) + post 路径', swapPath(oursRec, PATH_POST)],
  ];
  const res = await runOracle(cases.map(c => c[1]));
  console.log('=== 同一签名换路径 ===');
  cases.forEach((c, i) => console.log(c[0].padEnd(36) + JSON.stringify(res[i] || {})));

  const recOk = (res[2] || {}).itemList, postOk = (res[1] || {}).itemList;
  console.log('\n判定：我们的签名在 recommend = %s，在 post = %s',
    recOk ? '✅ 被接受' : '❌ 被拒', postOk ? '✅ 被接受' : '❌ 被拒');
  console.log(recOk && !postOk
    ? '→ 结论：recommend 端点校验宽松，我们的离线签名「部分有效」；\n   其它业务接口严格校验，离线签名不通过 —— README 的验收口径需要修正。'
    : '→ 结论：与预期不符，需重查。');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e); process.exit(1); });
