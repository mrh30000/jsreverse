'use strict';
const vm = require('vm');
const { TikTokSigner, loadSeedConfig } = require('./tt_sign');
const s = new TikTokSigner().init();
const cfg = loadSeedConfig();
const c = cfg.cacheOpts['1988'] || {};
s.acrawler.init({ aid:1988, dfp:!!c.dfp, boe:!!c.boe, intercept:!!c.intercept,
  enablePathList:c.enablePathList||[], region:c.region, apiHost:c.apiHost||'', mode:c.mode,
  isSDK:false, custom:c.custom||{}, umode:cfg.umode, pppt:cfg.pppt, ets:cfg.ets });

// 读 SDK 内部状态（通过 init 返回的 options 与 _mssdk）
const opts = s.sandbox._mssdk;
console.log('_mssdk._sharedCache:', JSON.stringify(opts._sharedCache).slice(0, 300));
console.log('umode:', opts.umode, '| pppt:', opts.pppt, '| ets:', opts.ets);

const q = 'aid=1988&app_name=tiktok_web&count=12&region=SG&user_is_login=true';
vm.runInContext(`(async()=>{await fetch('https://www.tiktok.com/api/recommend/item_list/?${q}',{headers:{'Content-Type':'application/json'}});return 'done';})()`, s.context, { timeout: 20000 })
 .then(() => {
   const u = s.capturedRequests().slice(-1)[0].url;
   console.log('请求 URL 长度:', u.length);
   console.log('含 msToken:', /msToken=/.test(u));
   // 打印非标准参数（SDK 追加的）
   const base = new Set(q.split('&').map(x=>x.split('=')[0]));
   const extra = u.split('?')[1].split('&').filter(kv => !base.has(kv.split('=')[0]));
   console.log('SDK 追加的参数:', extra.map(e => e.split('=')[0] + '(' + e.split('=')[1].length + ')').join(', '));
   // 看看 _sharedCache 里有没有 token 列表
   console.log('_sharedCache after:', JSON.stringify(s.sandbox._mssdk._sharedCache).slice(0, 400));
 })
 .catch(e => console.log('FAIL', e.message));
