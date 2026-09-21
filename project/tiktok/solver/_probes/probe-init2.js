'use strict';
// 用探针定位 init(...) 的正确入参形状
const { TikTokSigner } = require('./tt_sign');
const s = new TikTokSigner().init();

const tries = [
  ['init({aid:1988})', () => s.acrawler.init({ aid: 1988 })],
  ['init({aid:1988,region:"eu-ttp2"})', () => s.acrawler.init({ aid: 1988, region: 'eu-ttp2' })],
  ['init(1988)', () => s.acrawler.init(1988)],
  ['init({aid:1988,umode:516})', () => s.acrawler.init({ aid: 1988, umode: 516 })],
];
for (const [label, fn] of tries) {
  try {
    const r = fn();
    console.log('%-38s -> OK %s', label, JSON.stringify(r).slice(0, 160));
  } catch (e) {
    console.log('%-38s -> ERR %s', label, String(e && e.message).slice(0, 160));
  }
}
const m = s.sandbox._mssdk || {};
console.log('最终 _mssdk: cacheOpts=%s pathList=%d umode=%s',
  Object.keys(m.cacheOpts||{}).join(','), (m._enablePathList||[]).length, m.umode);
