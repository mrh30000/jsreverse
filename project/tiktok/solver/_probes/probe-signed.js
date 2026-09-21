'use strict';
const vm = require('vm');
const { TikTokSigner, loadSeedConfig } = require('./tt_sign');
const s = new TikTokSigner().init();
const c = loadSeedConfig().cacheOpts['1988'];
const cfg = loadSeedConfig();
s.acrawler.init({
  aid: 1988, dfp: !!c.dfp, boe: !!c.boe, intercept: !!c.intercept,
  enablePathList: c.enablePathList || [], region: c.region, apiHost: c.apiHost || '',
  mode: c.mode, isSDK: false, custom: c.custom || {},
  umode: cfg.umode, pppt: cfg.pppt, ets: cfg.ets,
});
const q = 'WebIdLastTime=0&aid=1988&app_language=en&app_name=tiktok_web&browser_language=en-US&browser_name=Mozilla&browser_online=true&browser_platform=Win32&channel=tiktok_web&cookie_enabled=true&count=12&data_collection_enabled=true&device_platform=web_pc&focus_state=true&from_page=fyp&history_len=3&is_fullscreen=false&is_page_visible=true&os=windows&priority_region=SG&region=SG&screen_height=1080&screen_width=1920&tz_name=Asia/Singapore&user_is_login=true&video_encoding=dash&webcast_language=en';
vm.runInContext(`(async()=>{const r=await fetch('https://www.tiktok.com/api/recommend/item_list/?${q}',{headers:{'Content-Type':'application/json'}});return 'status='+r.status;})()`, s.context, { timeout: 20000 })
 .then(x => {
   console.log('fetch:', x);
   const reqs = s.capturedRequests();
   console.log('内部请求数:', reqs.length);
   reqs.forEach((r, i) => {
     const u = r.url;
     const ks = ['X-Gnarly','X-Dynosaur','X-Bogus','msToken'];
     console.log('['+i+'] len='+u.length);
     ks.forEach(k => { const m = new RegExp('[?&]'+k+'=([^&]*)').exec(u); console.log('   '+k+' = '+(m ? m[1].length+' chars' : 'absent')); });
     require('fs').writeFileSync('tiktok/artifacts/node-signed-url.txt', u);
     console.log('   saved -> tiktok/artifacts/node-signed-url.txt');
   });
 })
 .catch(e => console.log('FAIL', e.message));
