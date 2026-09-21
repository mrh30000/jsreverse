'use strict';
const fs = require('fs');
const vm = require('vm');
const { TikTokSigner, loadSeedConfig } = require('./tt_sign');

const cookieHeader = fs.readFileSync('tiktok/artifacts/cookie-header.txt', 'utf8').trim();
const s = new TikTokSigner({ cookie: cookieHeader }).init();
const cfg = loadSeedConfig();
const c = cfg.cacheOpts['1988'] || {};
s.acrawler.init({ aid:1988, dfp:!!c.dfp, boe:!!c.boe, intercept:!!c.intercept,
  enablePathList:c.enablePathList||[], region:c.region, apiHost:c.apiHost||'', mode:c.mode,
  isSDK:false, custom:c.custom||{}, umode:cfg.umode, pppt:cfg.pppt, ets:cfg.ets });

console.log('document.cookie 长度:', s.sandbox.document.cookie.length);
const q = 'aid=1988&app_name=tiktok_web&count=12&region=SG&user_is_login=true';
vm.runInContext(`(async()=>{await fetch('https://www.tiktok.com/api/recommend/item_list/?${q}',{headers:{'Content-Type':'application/json'}});return 'done';})()`, s.context, { timeout: 20000 })
 .then(() => {
   const u = s.capturedRequests().slice(-1)[0].url;
   for (const k of ['X-Gnarly','X-Dynosaur','X-Bogus','msToken']) {
     const m = new RegExp('[?&]'+k+'=([^&]*)').exec(u);
     console.log('  %s = %s', k.padEnd(12), m ? 'len='+m[1].length : 'ABSENT');
   }
 })
 .catch(e => console.log('FAIL', e.message));
