'use strict';
const { TikTokSigner } = require('./tt_sign');
const s = new TikTokSigner().init();
console.log('1) load SDK 后 sandbox.fetch 源码前 220 字:');
console.log('   ', String(s.sandbox.fetch).slice(0, 220));
console.log('2) 是否被 SDK 包装(含 M[8]/S( 特征):', /M\[8\]|A=\[|S\(\d+,/.test(String(s.sandbox.fetch)));
console.log('3) XHR 源码前 160 字:', String(s.sandbox.XMLHttpRequest.prototype.open).slice(0, 160));
console.log('4) _mssdk 是否存在:', !!s.sandbox._mssdk, '| cacheOpts.aid:', Object.keys((s.sandbox._mssdk||{}).cacheOpts||{}).join(','));
console.log('5) _enablePathListRegex 数量:', ((s.sandbox._mssdk||{})._enablePathListRegex||[]).length);
