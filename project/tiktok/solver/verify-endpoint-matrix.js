/**
 * 多业务接口签名通用性验收。
 *
 * 动机：README 原先只验了 `/api/recommend/item_list/` 一条路径就下了「签名已被服务端接受」的结论。
 * 本脚本对 enablePathList 里的多个业务接口各跑**两条**用例：
 *     ① 完整 Node 离线签名               → 期望被服务端接受
 *     ② 同一 URL 去掉 X-Dynosaur（负对照） → 期望被拒
 * 只有「①通过 且 ②被拒」才算该接口的签名被真正校验且有效；
 * 若 ① 通过而 ② 也通过，说明该端点不校验签名，结论无效。
 *
 * 判定基准：X-Dynosaur 绑定的是**原始 query 字节**，所以增删参数只在字符串层面做，
 * 绝不经过 URL 对象（re-encode 会让未改动的参数变成不同字节，失败原因不可归因）。
 *
 * 用法：cd /d/work/jsreverse && node tiktok/solver/verify-endpoint-matrix.js
 * 产物：tiktok/artifacts/verify-endpoint-matrix.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { TikTokSigner } = require('./tt_sign');
const { runOracle, pageSigned, fetchBody } = require('./cdp-oracle');

const ART = path.join(__dirname, '..', 'artifacts');
const SIG = ['X-Bogus', 'X-Gnarly', 'X-Dynosaur', 'msToken'];

/** 基准 query：逐字节复制自浏览器真实请求（recommend 流） */
const BASE_RAW = 'WebIdLastTime=0&aid=1988&app_language=zh-Hans&app_name=tiktok_web&browser_language=zh-CN&browser_name=Mozilla&browser_online=true&browser_platform=Win32&channel=tiktok_web&cookie_enabled=true&count=12&coverFormat=2&cursor=0&data_collection_enabled=false&device_platform=web_pc&focus_state=true&from_page=fyp&history_len=4&is_fullscreen=false&is_page_visible=true&language=zh-Hans&os=windows&priority_region=&region=TW&screen_height=1080&screen_width=1920&tz_name=Asia%2FSingapore&user_is_login=false&video_encoding=dash&webcast_language=zh-Hans';

// ---------- 字符串级 query 操作（绝不经过 URL 对象） ----------
const getRaw = (q, k) => {
  for (const seg of q.split('&')) { const i = seg.indexOf('='); if (i !== -1 && seg.slice(0, i) === k) return seg.slice(i + 1); }
  return undefined;
};
function setRaw(q, k, v) {
  const parts = q.split('&');
  const i = parts.findIndex(s => s.split('=')[0] === k);
  if (i === -1) parts.push(k + '=' + v); else parts[i] = k + '=' + v;
  return parts.join('&');
}
const setMany = (q, o) => Object.entries(o).reduce((a, [k, v]) => setRaw(a, k, v), q);
const dropRaw = (q, keys) => q.split('&').filter(s => !keys.includes(s.split('=')[0])).join('&');
const sigLen = (u, k) => { const m = new RegExp('[?&]' + k + '=([^&]*)').exec(u); return m ? m[1].length : 0; };

/** 业务载荷识别（与 cdp-oracle 页面侧的 PAGE_CLASSIFY 同一套键名） */
const DATA_KEYS = ['itemList', 'userList', 'comments', 'itemInfo', 'userInfo', 'challengeInfo', 'playList', 'mixList', 'mixInfo', 'searchInfo', 'storyList'];
const META_KEYS = ['extra', 'log_pb', 'statusCode', 'status_code', 'status_msg', 'hasMore', 'cursor', 'logId', 'TotalCount'];
function pickData(j) {
  if (!j || typeof j !== 'object') return { ok: false, detail: '非 JSON 响应' };
  const code = j.status_code != null ? j.status_code : j.statusCode;
  if (code !== 0) return { ok: false, detail: 'status_code=' + code + (j.status_msg ? ' ' + String(j.status_msg).slice(0, 40) : '') };
  for (const k of DATA_KEYS) {
    const v = j[k];
    const n = Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : 0);
    if (n > 0) return { ok: true, key: k, value: v, detail: k + (Array.isArray(v) ? '[' + v.length + ']' : '{' + n + '}') };
  }
  for (const [k, v] of Object.entries(j)) {
    if (!META_KEYS.includes(k) && Array.isArray(v) && v.length) return { ok: true, key: k, value: v, detail: k + '[' + v.length + ']' };
  }
  return { ok: false, detail: 'status_code=0 但业务载荷为空' };
}

/** search_id：timestamp + 16 位随机 hex（与 example/api.js 同构） */
function searchId() {
  const d = new Date();
  const p = [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()]
    .map((x, i) => String(x).padStart(i === 6 ? 3 : (i === 0 ? 4 : 2), '0')).join('');
  let r = ''; for (let i = 0; i < 16; i++) r += Math.floor(Math.random() * 16).toString(16);
  return p + r.toUpperCase();
}

(async () => {
  const sess = JSON.parse(fs.readFileSync(path.join(ART, 'session-dump.json'), 'utf8'));
  const mk = () => { const s = new TikTokSigner({ cookie: sess.cookie, storage: { local: sess.local, session: sess.session } }).init(); s.bootstrap(); return s; };

  // ===== 阶段 0：先取基准数据（itemId / secUid / challengeID），后面各接口要用 =====
  console.log('=== 阶段 0：取基准数据 ===');
  const recSigned = (await mk().sign(BASE_RAW, '/api/recommend/item_list/')).url;
  const ids = await fetchPaperIds(recSigned);
  console.log('   基准 ID:', JSON.stringify(ids).slice(0, 180));
  if (!ids.itemId) throw new Error('基准 recommend 未取到 itemId，无法继续（先确认 /api/recommend/item_list/ 可用）');

  // ===== 用例表：每个接口声明它依赖的 ID，缺了就跳过（否则是空参请求，失败无从归因） =====
  const cases = [
    { n: '0 推荐流', p: '/api/recommend/item_list/', q: BASE_RAW },
    { n: '1 用户详情', p: '/api/user/detail/', need: 'uniqueId', q: setMany(BASE_RAW, { uniqueId: ids.uniqueId, from_page: 'user' }) },
    { n: '2 用户作品', p: '/api/post/item_list/', need: 'secUid', q: setMany(BASE_RAW, { secUid: ids.secUid, from_page: 'user', count: 16 }) },
    { n: '3 视频详情', p: '/api/item/detail/', need: 'itemId', q: setMany(dropRaw(BASE_RAW, ['coverFormat']), { itemId: ids.itemId, from_page: 'video' }) },
    { n: '4 评论列表', p: '/api/comment/list/', need: 'aweme_id', q: setMany(BASE_RAW, { aweme_id: ids.itemId, count: 20, from_page: 'video', enter_from: 'tiktok_web', fromWeb: 1 }) },
    { n: '5 搜索视频', p: '/api/search/item/full/', q: setMany(dropRaw(BASE_RAW, ['count', 'coverFormat']), { keyword: 'tiktok', count: 12, offset: 0, from_page: 'search', is_non_personalized_search: 0, search_id: searchId() }) },
    { n: '6 搜索用户', p: '/api/search/user/full/', q: setMany(dropRaw(BASE_RAW, ['coverFormat']), { keyword: 'tiktok', count: 12, cursor: 0, from_page: 'search' }) },
    { n: '7 关注/粉丝列表', p: '/api/user/list/', need: 'secUid', q: setMany(BASE_RAW, { secUid: ids.secUid, count: 30, maxCursor: 0, minCursor: 0, scene: 151, from_page: 'user' }) },
    { n: '8 收藏夹列表', p: '/api/user/playlist/', need: 'secUid', q: setMany(BASE_RAW, { secUid: ids.secUid, cursor: 0, count: 30, from_page: 'user' }) },
    { n: '9 话题详情', p: '/api/challenge/detail/', need: 'challengeID', q: setMany(BASE_RAW, { challengeID: ids.challengeID, challengeName: ids.challengeName, from_page: 'challenge' }) },
    { n: '10 话题作品', p: '/api/challenge/item_list/', need: 'challengeID', q: setMany(BASE_RAW, { challengeID: ids.challengeID, cursor: 0, count: 16, from_page: 'challenge' }) },
    { n: '11 相关推荐', p: '/api/related/item_list/', q: setMany(dropRaw(BASE_RAW, ['coverFormat']), { itemID: ids.itemId, count: 16 }) },
  ].filter(c => !c.need || (getRaw(c.q, c.need) || '').length > 0);

  console.log('\n=== 阶段 1：Node 离线签名 → iframe 原始 fetch ===');
  const urls = [], meta = [];
  for (const c of cases) {
    const u = (await mk().sign(c.q, c.p)).url;
    const head = u.slice(0, u.indexOf('?'));
    const negUrl = head + '?' + dropRaw(u.slice(u.indexOf('?') + 1), ['X-Dynosaur']);
    // ★ 关键对照：同一 raw query 交给**页面 SDK 现签**。
    //   有它才能区分「签名不达标」与「该接口还需其它业务参数」——
    //   两者都会表现为「离线签被拒」，只有浏览器版对照能拆开。
    const browserUrl = await pageSigned(c.q, c.p);
    urls.push(u, negUrl, browserUrl || u);
    meta.push({ ...c, signed: u, negUrl, browserUrl });
  }
  const outs = await runOracle(urls);

  console.log('\n' + '接口'.padEnd(18) + '签名'.padEnd(7) + 'http'.padEnd(6) + 'len'.padEnd(9) + '结果');
  const results = [];
  cases.forEach((c, i) => {
    const pos = outs[i * 3] || {}, neg = outs[i * 3 + 1] || {}, br = outs[i * 3 + 2] || {};
    const verdict = pos.ok && !neg.ok ? 'PASS' : (pos.ok ? 'NOT_ENFORCED' : 'REJECTED');
    // 归因：离线被拒时，看浏览器现签是否通过
    const attribution = pos.ok ? null
      : (br.ok ? 'SIGNATURE_WEAK' : (br.status === 200 && br.detail === '非 JSON 响应' ? 'NEEDS_MORE_PARAMS' : 'UNKNOWN(' + br.detail + ')'));
    console.log(c.n.padEnd(16) + '离线'.padEnd(6) + String(pos.status).padEnd(6) + String(pos.len).padEnd(9) +
      (pos.ok ? '✅ ' + pos.detail : '❌ ' + pos.detail));
    console.log(''.padEnd(16) + '浏览器'.padEnd(5) + String(br.status).padEnd(6) + String(br.len).padEnd(9) +
      (br.ok ? '✅ ' + br.detail : '❌ ' + br.detail) + (attribution ? '   → ' + attribution : ''));
    results.push({
      name: c.n, path: c.p,
      sigLen: { gnarly: sigLen(meta[i].signed, 'X-Gnarly'), dynosaur: sigLen(meta[i].signed, 'X-Dynosaur'), msToken: sigLen(meta[i].signed, 'msToken') },
      browserSigLen: meta[i].browserUrl ? sigLen(meta[i].browserUrl, 'X-Dynosaur') : null,
      signed: pos, negCtrl: neg, browserCtrl: br, verdict, attribution,
    });
  });

  const pass = results.filter(r => r.verdict === 'PASS');
  const accepted = results.filter(r => r.signed.ok);
  const notEnforced = results.filter(r => r.verdict === 'NOT_ENFORCED');
  const weak = results.filter(r => r.attribution === 'SIGNATURE_WEAK');
  const needParams = results.filter(r => r.attribution === 'NEEDS_MORE_PARAMS');
  const unknown = results.filter(r => r.attribution && r.attribution.startsWith('UNKNOWN'));

  console.log('\n===== 结论 =====');
  console.log('1) 离线签名被服务端接受的接口: %d/%d', accepted.length, results.length);
  console.log('2) 「接受 且 去 X-Dynosaur 被拒」双向成立: %d/%d', pass.length, results.length);
  if (pass.length) console.log('   ✅ ' + pass.map(r => r.name + '(' + r.signed.detail + ')').join('、'));
  if (notEnforced.length) console.log('3) 接受但负对照也通过（该端点不校验签名）: ' + notEnforced.map(r => r.name).join('、'));
  console.log('4) 离线被拒的归因：');
  if (weak.length) console.log('   ❌ 浏览器现签通过、离线被拒（离线签名不达标）: ' + weak.map(r => r.name).join('、'));
  if (needParams.length) console.log('   ⚪ 浏览器现签也不返回业务数据（该接口还需其它业务参数，非签名问题）: ' + needParams.map(r => r.name).join('、'));
  if (unknown.length) console.log('   ❓ 需人工判读: ' + unknown.map(r => r.name + '=' + r.attribution).join('、'));
  const weakPct = weak.length + pass.length;
  console.log('\n总结：离线签名**真正可用**的接口 %d 个；因签名不达标而失败的 %d 个。', pass.length, weak.length);
  console.log('说明：X-Dynosaur 绑定原始 query 字节，本脚本全部在字符串层面增删参数。');

  fs.writeFileSync(path.join(ART, 'verify-endpoint-matrix.json'),
    JSON.stringify({ ids, baseQuery: BASE_RAW, results, summary: { accepted: accepted.length, pass: pass.length, notEnforced: notEnforced.length, signatureWeak: weak.length, needsMoreParams: needParams.length, total: results.length } }, null, 1));
  console.log('原始结果 -> tiktok/artifacts/verify-endpoint-matrix.json');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e); process.exit(1); });

/**
 * 从一份完整 recommend 响应里抽出后续接口要用的业务 ID。
 * 单独取是因为 cdp-oracle 的批量接口只回「响应摘要」（itemList 几百 KB 不适合回传）。
 */
async function fetchPaperIds(signedUrl) {
  const j = JSON.parse(await fetchBody(signedUrl));
  const it = (j.itemList || [])[0] || {};
  return {
    itemId: String(it.id || ''),
    secUid: (it.author && it.author.secUid) || '',
    uniqueId: (it.author && it.author.uniqueId) || '',
    challengeID: String((it.challenges && it.challenges[0] && it.challenges[0].id) || ''),
    challengeName: (it.challenges && it.challenges[0] && it.challenges[0].title) || '',
  };
}
