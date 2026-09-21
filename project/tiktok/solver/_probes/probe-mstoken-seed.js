'use strict';
const fs = require('fs');
const vm = require('vm');
const { TikTokSigner, loadSeedConfig } = require('./tt_sign');

const cookie = fs.readFileSync('tiktok/artifacts/cookie-header.txt', 'utf8').trim();
const cookieMs = (/msToken=([^;]*)/.exec(cookie) || [])[1] || '';
const ttwid = (/ttwid=([^;]*)/.exec(cookie) || [])[1] || '';
console.log('cookieMs len:', cookieMs.length, '| ttwid len:', ttwid.length);

const variants = [
  ['baseline', (s) => {}],
  ['seed _sharedCache.msToken', (s) => { s.sandbox._mssdk._sharedCache.msToken = cookieMs; }],
  ['seed custom.msToken', (s) => { s.sandbox._mssdk.custom = { msToken: cookieMs, ttwid }; }],
  ['seed both', (s) => { s.sandbox._mssdk._sharedCache.msToken = cookieMs; s.sandbox._mssdk.custom = { msToken: cookieMs, ttwid }; }],
];

(async () => {
  for (const [label, seed] of variants) {
    const s = new TikTokSigner({ cookie }).init();
    const cfg = loadSeedConfig();
    const c = cfg.cacheOpts['1988'] || {};
    try {
      s.acrawler.init({ aid:1988, dfp:!!c.dfp, boe:!!c.boe, intercept:!!c.intercept,
        enablePathList:c.enablePathList||[], region:c.region, apiHost:c.apiHost||'', mode:c.mode,
        isSDK:false, custom:c.custom||{}, umode:cfg.umode, pppt:cfg.pppt, ets:cfg.ets });
      seed(s);
    } catch (e) { console.log(label, 'init ERR', e.message.slice(0,80)); continue; }
    await vm.runInContext(`(async()=>{try{await fetch('https://www.tiktok.com/api/recommend/item_list/?aid=1988&app_name=tiktok_web&count=12',{headers:{'Content-Type':'application/json'}});}catch(e){}return 1;})()`, s.context, { timeout: 15000 });
    const u = (s.capturedRequests().slice(-1)[0] || {}).url || '';
    const ms = (/[?&]msToken=([^&]*)/.exec(u) || [])[1];
    console.log('%-26s msToken len=%s | gnarly=%s dynosaur=%s',
      label, ms == null ? 'ABSENT' : ms.length,
      ((/[?&]X-Gnarly=([^&]*)/.exec(u)||[])[1]||'').length,
      ((/[?&]X-Dynosaur=([^&]*)/.exec(u)||[])[1]||'').length);
  }
})().catch(e => console.log('FAIL', e.message));
