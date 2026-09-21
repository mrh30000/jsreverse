'use strict';
const { TikTokSigner } = require('./tt_sign');
const s = new TikTokSigner().init();
s.loadEx();
const x = s.sandbox._xex;

const longQ = 'WebIdLastTime=0&aid=1988&app_language=en&app_name=tiktok_web&browser_language=en-US&browser_name=Mozilla&browser_online=true&browser_platform=Win32&channel=tiktok_web&cookie_enabled=true&count=12&data_collection_enabled=true&device_platform=web_pc&focus_state=true&from_page=fyp&history_len=3&is_fullscreen=false&is_page_visible=true&os=windows&priority_region=SG&region=SG&screen_height=1080&screen_width=1920&tz_name=Asia%2FSingapore&user_is_login=true&video_encoding=dash&webcast_language=en';

const cases = [
  ['r(longQ)', () => x.r(longQ)],
  ['r(longQ,true)', () => x.r(longQ, true)],
  ['r(longQ,{})', () => x.r(longQ, {})],
  ['r(longQ,null)', () => x.r(longQ, null)],
  ['r(0,longQ,true)', () => x.r(0, longQ, true)],
  ['i(longQ)', () => x.i(longQ)],
  ['i()', () => x.i()],
  ['x0(longQ)', () => x.x0(longQ)],
  ['x1(longQ)', () => x.x1(longQ)],
];
for (const [label, fn] of cases) {
  try {
    const out = fn();
    let s2 = typeof out === 'string' ? out : JSON.stringify(out);
    console.log('%-24s -> %s', label, String(s2).slice(0, 140));
  } catch (e) {
    console.log('%-24s -> ERR %s', label, String(e && e.message).slice(0, 120));
  }
}
