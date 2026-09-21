/**
 * 探针：在 Node 补环境里调用 SDK 包装后的 fetch，看能否复现
 * X-Gnarly / X-Dynosaur 的签名链路（真浏览器里由 SDK 拦截器追加）。
 */
'use strict';
const vm = require('vm');
const { TikTokSigner } = require('./tt_sign');

const s = new TikTokSigner().init();
console.log('1) sandbox.fetch 类型:', typeof s.sandbox.fetch);

const raw = 'https://www.tiktok.com/api/recommend/item_list/?WebIdLastTime=0&aid=1988&app_name=tiktok_web&device_platform=web_pc&count=12&region=SG&user_is_login=true';

const script = `
(async () => {
  try {
    const r = await fetch(${JSON.stringify(raw)}, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    return JSON.stringify({ status: r.status, url: r.url });
  } catch (e) { return 'ERR ' + (e && e.message); }
})()
`;

vm.runInContext(script, s.context, { timeout: 20000 }).then(res => {
  console.log('2) 页面侧结果:', res);
  const reqs = s.capturedRequests();
  console.log('3) SDK 内部实际请求数:', reqs.length);
  reqs.slice(0, 6).forEach((r, i) => {
    const hasG = /X-Gnarly=/.test(r.url), hasD = /X-Dynosaur=/.test(r.url);
    console.log('   [' + i + ']', r.method, 'gnarly=' + hasG, 'dynosaur=' + hasD, 'len=' + r.url.length);
    if (hasG || hasD) console.log('      ', r.url.slice(0, 300));
  });
  const errs = s.logs.filter(l => l[0] === 'error' || l[0] === 'warn');
  if (errs.length) console.log('4) 日志:', errs.slice(0, 6));
}).catch(e => console.error('FAILED', e && e.stack ? e.stack.split('\n').slice(0,8).join('\n') : e));
