/**
 * 验证架构假设：webmssdk 把签名委托给 window._xex，而 _xex 由 webmssdk_ex 定义。
 */
'use strict';
const vm = require('vm');
const { TikTokSigner } = require('./tt_sign');

const s = new TikTokSigner().init();
console.log('1) 仅 webmssdk：_xex =', typeof s.sandbox._xex);

try {
  s.loadEx();
  console.log('2) 加载 webmssdk_ex 后：_xex =', typeof s.sandbox._xex);
  const x = s.sandbox._xex;
  if (x) console.log('   _xex keys:', Object.getOwnPropertyNames(x).join(','));
} catch (e) {
  console.log('2) webmssdk_ex 加载失败:', (e && e.message || '').slice(0, 300));
}

// 若 _xex 可用，直接试调它的 r()
const x = s.sandbox._xex;
if (x && typeof x.r === 'function') {
  const raw = 'aid=1988&app_name=tiktok_web&device_platform=web_pc&count=12';
  for (const mode of [0, 1, 2]) {
    try {
      const out = x.r(mode, raw, true);
      console.log('3) _xex.r(%d, raw, true) ->', mode, typeof out, JSON.stringify(out).slice(0, 120));
    } catch (e) {
      console.log('3) _xex.r(%d) ERR: %s', mode, (e && e.message || '').slice(0, 200));
    }
  }
}
