/**
 * 探针 U（关键）：X-Dynosaur 是否依赖 SDK 对 mssdk 后端的请求？
 *
 * 手法：用 CDP `Network.setBlockedURLs` 在网络层直接掐掉 mssdk 域（比在页面里包 fetch 可靠 ——
 * SDK 会在加载时缓存 fetch/XHR 引用，页面内的包装拦不住它），
 * 再让 iframe 里的 SDK 签一次，看 X-Dynosaur 是否变得不被接受。
 *
 *   A 不阻断（真网络）      —— 基准，应通过
 *   B 阻断 mssdk-sg 全域     —— 若被拒 ⇒ 根因 = Node 缺这个后端响应（可离线回灌）
 *                                若仍通过 ⇒ 与后端无关，差异在浏览器其它环境输入
 *
 * 用法：cd /d/work/jsreverse && node tiktok/solver/_probes/probe-block-mssdk.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { runOracle, pageSigned, Cdp, RAW_POST } = require('../cdp-oracle');

const SDK = path.join(__dirname, '..', '..', 'sources', 'webmssdk.1.0.0.417.js.orig');
const PATH_ = '/api/post/item_list/';
const get = (q, k) => { const m = new RegExp('[?&]' + k + '=([^&]*)').exec(q); return m ? m[1] : ''; };
const set = (q, k, v) => { const p = q.split('&'); const i = p.findIndex(s => s.split('=')[0] === k); if (i === -1) p.push(k + '=' + v); else p[i] = k + '=' + v; return p.join('&'); };
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';

(async () => {
  const sdkSrc = fs.readFileSync(SDK, 'utf8');
  const P = await pageSigned(RAW_POST, PATH_);
  if (!P) throw new Error('未抓到页面自签 URL');

  const list = await (await fetch(CDP_HTTP + '/json/list')).json();
  const t = list.find(x => x.type === 'page' && /tiktok/.test(x.url));
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  const ev = async (e) => {
    const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, timeout: 90000 });
    if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0, 240) };
    return { value: r.result.value };
  };

  const FRAME = `(async(sdkSrc,path,raw)=>{
    const fr=document.createElement('iframe');fr.style.display='none';document.body.appendChild(fr);
    await new Promise(r=>setTimeout(r,300));const w=fr.contentWindow;const out={};
    try{
      w._mssdk=window._mssdk;
      w.__cap=[];const of=w.fetch.bind(w);
      w.fetch=function(u,i){try{w.__cap.push(String(typeof u==='string'?u:(u&&u.url)))}catch(e){};return of(u,i)};
      w.eval(sdkSrc);
      if(!w.byted_acrawler){out.err='未挂载';return JSON.stringify(out)}
      const c=(w._mssdk.cacheOpts&&w._mssdk.cacheOpts['1988'])||{};
      w.byted_acrawler.init({aid:1988,dfp:!!c.dfp,boe:!!c.boe,intercept:!!c.intercept,enablePathList:c.enablePathList||[],region:c.region||'sg-tiktok',apiHost:c.apiHost||'',mode:c.mode!=null?c.mode:516,isSDK:false,custom:c.custom||{}});
      await new Promise(r=>setTimeout(r,1500));   // 给后端的配置请求留时间
      await w.fetch('https://www.tiktok.com'+path+'?'+raw,{headers:{'Content-Type':'application/json'}});
      await new Promise(r=>setTimeout(r,600));
      out.url=(w.__cap||[]).filter(u=>u.indexOf(path)!==-1).pop()||null;
      out.mssdkSeen=(w.__cap||[]).filter(u=>u.indexOf('mssdk-sg')!==-1).length;
      out.tiktokvSeen=(w.__cap||[]).filter(u=>u.indexOf('tiktokv.com')!==-1).length;
      if(!out.url) out.err='未捕获 cap='+(w.__cap||[]).length;
    }catch(e){out.err=String(e&&e.message)}
    return JSON.stringify(out);
  })`;

  const urls = [P], labels = ['★ 页面基准'];
  try {
    await cdp.send('Network.enable', {});
    for (const [n, blocked] of [
      ['① 不阻断（真网络）', []],
      ['② 阻断 mssdk-sg.tiktok.com', ['*mssdk-sg.tiktok.com*']],
      ['③ 阻断全部 mssdk', ['*mssdk*.tiktok.com*', '*mssdk*.tiktokv.com*']],
      ['④ 阻断 tiktokv（含 monitor_web 配置）', ['*tiktokv.com*']],
    ]) {
      await cdp.send('Network.setBlockedURLs', { urls: blocked });
      const r = await ev(`${FRAME}(${JSON.stringify(sdkSrc)},${JSON.stringify(PATH_)},${JSON.stringify(RAW_POST)})`);
      const o = r.err ? { err: r.err } : JSON.parse(r.value);
      console.log('%s -> %s  (页面内可见 mssdk 调用 %s 次)', n.padEnd(34),
        o.url ? 'dy=' + get(o.url, 'X-Dynosaur').length : 'ERR ' + o.err, o.mssdkSeen);
      urls.push(o.url ? set(P, 'X-Dynosaur', get(o.url, 'X-Dynosaur')) : P);
      labels.push(n);
    }
    await cdp.send('Network.setBlockedURLs', { urls: [] });
    const res = await runOracle(urls);
    console.log('\n=== 送测（只替换 X-Dynosaur，其余字节同已接受的基准）===');
    labels.forEach((l, i) => console.log(l.padEnd(38) + JSON.stringify(res[i] || {})));
    const blockedRejected = res[2] && !res[2].ok;
    console.log('\n判定：%s', blockedRejected
      ? '✅ 根因确认：X-Dynosaur 依赖 mssdk 后端响应；离线必须回灌该响应'
      : '❌ 阻断后端后签名仍被接受 ⇒ 与后端无关，差异是浏览器其它环境输入');
  } finally { cdp.close(); }
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e); process.exit(1); });