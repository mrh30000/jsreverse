'use strict';
const { TikTokSigner } = require('./tt_sign');
const s = new TikTokSigner().init();
console.log('1) 直接调 byted_acrawler.init()');
try {
  const r = s.acrawler.init();
  console.log('   ->', typeof r, JSON.stringify(r).slice(0,200));
} catch (e) { console.log('   ERR:', String(e && e.message).slice(0,300)); }
const m = s.sandbox._mssdk || {};
console.log('2) _mssdk 现状: cacheOpts=%s pathList=%d umode=%s',
  Object.keys(m.cacheOpts||{}).join(','), (m._enablePathList||[]).length, m.umode);
console.log('3) fetch 被包装?', /M\[8\]|S\(\d+,/.test(String(s.sandbox.fetch)));
// 再试 fetch
const vm=require('vm');
vm.runInContext(`(async()=>{try{const r=await fetch('https://www.tiktok.com/api/recommend/item_list/?aid=1988&app_name=tiktok_web&count=12',{headers:{'Content-Type':'application/json'}});return 'ok '+r.status;}catch(e){return 'ERR '+e.message;}})()`, s.context, {timeout:15000})
 .then(x=>{ console.log('4) fetch 结果:', x); console.log('5) SDK 内部请求:', JSON.stringify(s.capturedRequests()).slice(0,300)); })
 .catch(e=>console.log('4) FAIL', e.message));
