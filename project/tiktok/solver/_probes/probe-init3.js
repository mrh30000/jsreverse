'use strict';
const vm = require('vm');
const { TikTokSigner, loadSeedConfig } = require('./tt_sign');
const s = new TikTokSigner().init();
const cfg = loadSeedConfig();
const c1988 = cfg.cacheOpts['1988'];

// 用浏览器真实 cacheOpts[1988] 作为 init 入参
const opts = {
  aid: 1988,
  dfp: !!c1988.dfp,
  boe: !!c1988.boe,
  intercept: !!c1988.intercept,
  enablePathList: c1988.enablePathList || [],
  region: c1988.region || 'eu-ttp2',
  apiHost: c1988.apiHost || '',
  mode: c1988.mode != null ? c1988.mode : 513,
  isSDK: false,
  custom: c1988.custom || {},
  umode: cfg.umode,
  pppt: cfg.pppt,
  ets: cfg.ets,
};
console.log('init 入参: aid=%d pathList=%d mode=%s region=%s', opts.aid, opts.enablePathList.length, opts.mode, opts.region);
try {
  const r = s.acrawler.init(opts);
  console.log('init ->', JSON.stringify(r).slice(0, 400));
} catch (e) { console.log('init ERR:', String(e && e.message).slice(0, 300)); }

const m = s.sandbox._mssdk || {};
console.log('_mssdk: cacheOpts=%s pathList=%d umode=%s urlRewrite=%d',
  Object.keys(m.cacheOpts || {}).join(','), (m._enablePathList || []).length, m.umode, (m._urlRewriteRules || []).length);
console.log('fetch wrapped?', /M\[8\]|S\(\d+,/.test(String(s.sandbox.fetch)));

vm.runInContext(`(async()=>{try{const r=await fetch('https://www.tiktok.com/api/recommend/item_list/?aid=1988&app_name=tiktok_web&count=12',{headers:{'Content-Type':'application/json'}});return 'ok '+r.status;}catch(e){return 'ERR '+e.message;}})()`, s.context, { timeout: 15000 })
  .then(x => {
    console.log('fetch:', x);
    const reqs = s.capturedRequests();
    console.log('内部请求数:', reqs.length);
    reqs.slice(0,3).forEach((r,i)=>console.log('  ['+i+']', r.method, 'gnarly=' + /X-Gnarly=/.test(r.url), 'len=' + r.url.length));
  })
  .catch(e => console.log('FAIL', e.message));
