/**
 * 纯 HTTP 会话引导 —— 完全不需要浏览器。
 *
 * 关键发现：msToken 是服务端通过普通 `Set-Cookie` 下发的（172 字符），
 * 对 tiktok.com / mssdk 的任意请求都会带，无需登录、无需逆向 eq、无需解密。
 *
 * 因此冷启动链路就是：
 *   GET https://www.tiktok.com/            → ttwid / tt_csrf_token / tt_chain_token
 *   GET https://www.tiktok.com/api/...     → msToken
 *   把 cookie jar 交给 TikTokSigner 即可离线签名
 *
 * 用法：node tiktok/solver/tt_session.js --selftest
 */
'use strict';
const { requestViaProxy } = require('./net');

/** 极简 cookie jar：只管 name=value，忽略属性 */
function parseSetCookies(headerBlock) {
  const out = [];
  for (const line of String(headerBlock).split(/\r?\n/)) {
    const m = /^set-cookie:\s*([^=]+)=([^;]*)/i.exec(line);
    if (m) out.push([m[1].trim(), m[2]]);
  }
  return out;
}

function jarToString(jar) {
  return Object.entries(jar).map(([k, v]) => k + '=' + v).join('; ');
}

/**
 * 判断响应是否为 WAF 挑战页。
 * 实测 tiktok.com 首页会间歇性返回 SlardarWAF 挑战页（约 1462 字节，不下发任何 cookie），
 * 特征是含 `_wafchallengeid` 且体积远小于真实主页（约 180KB）。
 * 遇到它必须重试，否则拿不到 ttwid。
 */
function isWafChallenge(text) {
  return text.length < 5000 && /_wafchallengeid|waf-aiso|Please wait\.\.\./.test(text);
}

/**
 * 纯 HTTP 建立会话。
 *
 * 重试是必需的（不是防御性冗余）：首页约 20~50% 概率返回 WAF 挑战页，
 * 而 msToken 只在 API 请求上稳定下发。
 *
 * @param {object} [opts] { proxy, timeoutMs, retry }
 * @returns {Promise<{cookie:string, jar:object, local:object, session:object, log:Array}>}
 */
async function buildSession(opts = {}) {
  const jar = {};
  const log = [];
  const retry = opts.retry || 4;
  const visit = async (url, note, extraHeaders) => {
    const r = await requestViaProxy(url, {
      method: 'GET',
      headers: Object.assign({
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      }, jarToString(jar) ? { Cookie: jarToString(jar) } : {}, extraHeaders || {}),
      proxy: opts.proxy,
      timeoutMs: opts.timeoutMs || 15000,
    });
    const set = parseSetCookies(r.headers);
    for (const [k, v] of set) jar[k] = v;
    log.push({
      note, url: url.slice(0, 110), status: r.status, len: r.text.length,
      waf: isWafChallenge(r.text), setCookies: set.map(s => s[0]),
    });
    return r;
  };

  // 1) 先拿 msToken —— 它是必需项，且 API 请求极少被 WAF 拦。
  //    （业务是否成功无所谓，200/4xx 都会带 Set-Cookie）
  for (let i = 0; i < retry && !jar.msToken; i++) {
    await visit('https://www.tiktok.com/api/recommend/item_list/?aid=1988&app_name=tiktok_web&device_platform=web_pc&count=12',
      'API（取 msToken）' + (i ? ' 第' + (i + 1) + '次' : ''), {
        Accept: 'application/json, text/plain, */*',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        Referer: 'https://www.tiktok.com/foryou',
      });
  }

  // 2) 若还没拿到，补一次 mssdk 域
  if (!jar.msToken) await visit('https://mssdk-sg.tiktok.com/web/common', 'mssdk 域（补 msToken）');

  // 3) 最后尽力取 ttwid（可选：首页易被 WAF 拦，拿不到也不影响签名被接受）
  if (opts.wantTtwid !== false) {
    for (let i = 0; i < retry && !jar.ttwid; i++) {
      await visit('https://www.tiktok.com/', '主页（取 ttwid，可选）' + (i ? ' 第' + (i + 1) + '次' : ''));
    }
  }

  return {
    cookie: jarToString(jar),
    jar,
    // 浏览器里 msToken 同时存在 localStorage.msToken / xmst，签名器从这里读
    local: { msToken: jar.msToken || '', xmst: jar.msToken || '' },
    session: { msToken: jar.msToken || '' },
    log,
  };
}

async function selftest() {
  const assert = require('assert');
  console.log('== 纯 HTTP 会话引导自检 ==');
  const s = await buildSession();
  for (const l of s.log) {
    console.log('  %s http=%s len=%s waf=%s set-cookie=[%s]',
      l.note.padEnd(26), l.status, String(l.len).padEnd(8), l.waf ? 'Y' : 'N', l.setCookies.join(','));
  }
  console.log('\ncookie (%d 字符):', s.cookie.length);
  console.log('  ', s.cookie.slice(0, 160));

  assert.ok(s.jar.msToken, '必须拿到 msToken');
  // msToken 长度不是定值：实测 HTTP 冷启动得到 ~120 字符，浏览器已登录会话为 172 字符
  // （base64 载荷长度不同）。因此只校验量级与字符集。
  assert.ok(s.jar.msToken.length >= 100, 'msToken 长度应在 100 字符以上，实际 ' + s.jar.msToken.length);
  assert.ok(/^[A-Za-z0-9_=-]+$/.test(s.jar.msToken), 'msToken 应为 base64/base64url 字符集');
  if (!s.jar.ttwid) console.log('⚠️ 未拿到 ttwid（首页持续被 WAF 拦截），msToken 仍可用');

  console.log('\n✅ 纯 HTTP 引导通过：ttwid=%d字符 msToken=%d字符', (s.jar.ttwid || '').length, s.jar.msToken.length);
  return s;
}

module.exports = { buildSession, parseSetCookies, jarToString, isWafChallenge };

if (require.main === module) {
  selftest().then(() => process.exit(0)).catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split(String.fromCharCode(10)).slice(0, 8).join(String.fromCharCode(10)) : e); process.exit(1); });
}