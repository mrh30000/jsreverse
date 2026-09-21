'use strict';
const fs = require('fs');
const { TikTokSigner, loadSeedConfig } = require('./tt_sign');
const s = new TikTokSigner().init();
const cfg = loadSeedConfig();
console.log('loadSeedConfig.cacheOpts keys:', Object.keys(cfg.cacheOpts));
console.log('sandbox._mssdk.cacheOpts keys:', Object.keys((s.sandbox._mssdk || {}).cacheOpts || {}));
console.log('sandbox._mssdk.umode:', s.sandbox._mssdk && s.sandbox._mssdk.umode);
console.log('sandbox._mssdk._enablePathList len:', ((s.sandbox._mssdk || {})._enablePathList || []).length);
console.log('sandbox._mssdk._enablePathListRegex len:', ((s.sandbox._mssdk || {})._enablePathListRegex || []).length);
console.log('MSSDK_INITIALIZED:', s.sandbox.MSSDK_INITIALIZED);
// 检查 fetch 是否被 SDK 覆盖（对比 installNativeProtect 之前的原生引用）
console.log('fetch own props:', Object.getOwnPropertyNames(s.sandbox.fetch || {}).slice(0, 10));
