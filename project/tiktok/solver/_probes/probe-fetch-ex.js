/** 通过页面把 webmssdk_ex 当前版本原码抓回本地（ttwstatic 直连 TLS 会失败，走浏览器） */
'use strict';
const fs = require('fs');
const path = require('path');
const { Cdp } = require('./_oracle');
const CDP_HTTP = process.env.CDP_HTTP || 'http://127.0.0.1:19222';
const URL_ = process.argv[2] || 'https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/ttweb_webmssdk_ex/1.0.0.2867/webmssdk_ex.js';
const OUT = process.argv[3] || path.join(__dirname, '..', '..', 'sources', 'webmssdk_ex.1.0.0.2867.js.orig');
(async () => {
  const list = await (await fetch(CDP_HTTP + '/json/list')).json();
  const t = list.find(x => x.type === 'page' && /tiktok/.test(x.url));
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  try {
    const r = await cdp.send('Runtime.evaluate', {
      expression: `fetch(${JSON.stringify(URL_)}).then(r=>r.text())`,
      returnByValue: true, awaitPromise: true, timeout: 60000,
    });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 200));
    const src = r.result.value;
    fs.writeFileSync(OUT, src);
    console.log('写入 %s  %d 字符', OUT, src.length);
    console.log('含 Gnarly:', src.indexOf('Gnarly') !== -1, ' 含 Dynosaur:', src.indexOf('Dynosaur') !== -1);
  } finally { cdp.close(); }
  process.exit(0);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
