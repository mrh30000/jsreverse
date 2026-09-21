// 受控实验：在页面内跑多组重放，判定服务端到底看什么。
// 关键对照：
//   A 用 capture 脚本抓到的 signed URL（同一 query + 真签名）重放
//   B 用完全相同的 query，但让页面 SDK 重新签名（走 SDK 拦截器）
// 两者 query 唯一差异应只有签名值 → 若 B 成功 A 失败，说明签名与「时间/一次性」绑定。
const FS = require('fs');

const signed = FS.readFileSync('tiktok/artifacts/signed-url.txt', 'utf8').trim();
const u = new URL(signed);
// 原始 query（剔除签名参数）
const sigKeys = ['X-Gnarly', 'X-Dynosaur', 'X-Bogus', 'msToken'];
const rawPairs = [];
u.searchParams.forEach((v, k) => { if (!sigKeys.includes(k)) rawPairs.push(k + '=' + v); });
const rawQuery = rawPairs.join('&');

const script = `
(async () => {
  const out = {};
  const rawQuery = ${JSON.stringify(rawQuery)};
  const signedUrl = ${JSON.stringify(signed)};
  const base = 'https://www.tiktok.com/api/recommend/item_list/?';
  const call = async (label, url) => {
    try {
      const r = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      const t = await r.text();
      out[label] = { status: r.status, len: t.length, head: t.slice(0, 60) };
    } catch (e) { out[label] = { err: String(e && e.message) }; }
  };
  // A: 直接重放抓到的已签名 URL
  await call('A_replay_captured', signedUrl);
  // B: 同一 rawQuery，交给页面 SDK 重新签名（拼接后由 SDK 补签名）
  await call('B_fresh_sign_same_query', base + rawQuery);
  // C: 同一 rawQuery，但显式跟上被抓到的旧签名（等价于 A，用于排除拼接差异）
  await call('C_reshoot_with_oldsig', base + rawQuery + '&msToken=' + new URL(signedUrl).searchParams.get('msToken'));
  return JSON.stringify(out, null, 1);
})()
`;

process.stdout.write(script);