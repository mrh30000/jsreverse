'use strict';
const { TikTokSigner } = require('./tt_sign');
const s = new TikTokSigner().init();
const dump = (tag) => {
  const m = s.sandbox._mssdk || {};
  console.log(tag, '| _enablePathList:', (m._enablePathList||[]).length,
    '| cacheOpts:', Object.keys(m.cacheOpts||{}).join(','),
    '| umode:', m.umode);
};
dump('webmssdk only:');
try { s.loadEx(); dump('after loadEx :'); } catch (e) { console.log('loadEx ERR', e.message.slice(0,200)); }
console.log('_xex:', typeof s.sandbox._xex);
console.log('fetch wrapped?', /M\[8\]|S\(\d+,/.test(String(s.sandbox.fetch)));
