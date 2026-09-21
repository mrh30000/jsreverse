'use strict';
// 在 Node 环境里查 SDK 内部 msToken 状态对象（vA / msStatus），判断卡在哪一步
const fs = require('fs');
const vm = require('vm');
const { TikTokSigner, loadSeedConfig } = require('./tt_sign');
const cookie = fs.readFileSync('tiktok/artifacts/cookie-header.txt','utf8').trim();
const s = new TikTokSigner({ cookie }).init();
const cfg = loadSeedConfig();
const c = cfg.cacheOpts['1988'] || {};
s.acrawler.init({ aid:1988, dfp:!!c.dfp, boe:!!c.boe, intercept:!!c.intercept,
  enablePathList:c.enablePathList||[], region:c.region, apiHost:c.apiHost||'', mode:c.mode,
  isSDK:false, custom:c.custom||{}, umode:cfg.umode, pppt:cfg.pppt, ets:cfg.ets });

// 通过 CDP 思路不行，这里用 Proxy 包 fetch 观察 SDK 何时决定追加 msToken
// 关键：在 Node 侧读 _mssdk 上 SDK 暴露的状态
const m = s.sandbox._mssdk;
console.log('_mssdk own keys:', Object.getOwnPropertyNames(m).join(','));
console.log('_sharedCache:', JSON.stringify(m._sharedCache));
console.log('custom:', JSON.stringify(m.custom));
console.log('opts:', JSON.stringify(m.opts));
console.log('ets/pppt/umode:', m.ets, m.pppt, m.umode);

// 直接调 init 返回值里的 options 看 msToken 相关开关
const r = s.acrawler.init({ aid:1988, region:c.region, mode:c.mode, enablePathList:c.enablePathList||[] });
console.log('init options:', JSON.stringify(r && r.options).slice(0, 500));
