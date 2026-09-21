/**
 * 探针 F：把 SDK 签名过程中**调用到的环境 API**全部记录下来，Node 补环境 vs 真浏览器 iframe 逐条比对，
 * 找出「同码同配置、结果却一个被接受一个被拒」的输入差异。
 *
 * 做法：在签名前给 crypto / Math.random / Date.now / performance.now / btoa / atob /
 * TextEncoder / encodeURIComponent / JSON.stringify / Intl / navigator 等打调用日志，
 * 签名后把日志导出比对。
 *
 * 用法：cd /d/work/jsreverse && node tiktok/solver/_probes/probe-call-diff.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { TikTokSigner } = require('../tt_sign');
const { RAW_POST, pageSigned, Cdp } = require('./_oracle');

const SDK = path.join(__dirname, '..', '..', 'sources', 'webmssdk.1.0.0.417.js.orig');
const PATH_ = '/api/post/item_list/';
const get = (q, k) => { const m = new RegExp('[?&]' + k + '=([^&]*)').exec(q); return m ? m[1] : ''; };

/** 记录调用日志的插桩脚本（在 iframe 里 eval 用；Node 侧请看 tt_sign 的 hook 版本） */
const HOOK = `
(function(w){
  var L = w.__calls = [];
  function wrap(obj, name, tag, fmt){
    try {
      var f = obj[name];
      if (typeof f !== 'function') return;
      obj[name] = function(){
        var r; try { r = f.apply(this, arguments); } catch(e){ L.push([tag,'THROW',String(e&&e.message)]); throw e; }
        try { L.push([tag, fmt ? fmt(arguments, r) : (String(r).slice(0,24))]); } catch(e){}
        return r;
      };
    } catch(e){}
  }
  wrap(w.Math,'random','Math.random',(a,r)=>String(r));
  wrap(w,'btoa','btoa',(a,r)=>'in:'+String(a).length+' out:'+String(r).length);
  wrap(w,'atob','atob',(a,r)=>'in:'+String(a).length+' out:'+String(r).length);
  try {
    var dnow = w.Date.now;
    w.Date.now = function(){ var r = dnow.apply(this,arguments); L.push(['Date.now', String(r)]); return r; };
  } catch(e){}
  wrap(w.performance,'now','perf.now',(a,r)=>String(r));
  wrap(w.crypto,'getRandomValues','crypto.grv',(a,r)=>'len:'+(a[0]&&a[0].length));
  wrap(w.crypto,'randomUUID','crypto.uuid',(a,r)=>String(r));
  wrap(w,'encodeURIComponent','eUC',(a,r)=>'in:'+String(a).length+' out:'+String(r).length);
  wrap(w,'JSON','stringify','JSON.stringify',(a,r)=>'out:'+String(r).length);
  // 记录每次读取的 navigator/屏幕等值（只取一次快照）
})(window);
`;

(async () => {
  const sdkSrc = fs.readFileSync(SDK, 'utf8');
  const P = await pageSigned(RAW_POST, PATH_);
  if (!P) throw new Error('未抓到页面自签 URL');

  // --- 浏览器 iframe 侧 ---
  const list = await (await fetch((process.env.CDP_URL || 'http://127.0.0.1:19222') + '/json/list')).json();
  const t = list.find(x => x.type === 'page' && /tiktok/.test(x.url));
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  const r = await cdp.send('Runtime.evaluate', {
    expression: `(async(sdkSrc,path,raw,hook)=>{
      const fr=document.createElement('iframe');fr.style.display='none';document.body.appendChild(fr);
      await new Promise(r=>setTimeout(r,300)); const w=fr.contentWindow;
      w.__cap=[]; const of=w.fetch.bind(w);
      w.fetch=function(u,i){try{w.__cap.push(String(typeof u==='string'?u:(u&&u.url)))}catch(e){};return of(u,i)};
      w.eval(hook);
      w.eval(sdkSrc);
      const m=window._mssdk,c=(m&&m.cacheOpts&&m.cacheOpts['1988'])||{};
      w.byted_acrawler.init({aid:1988,dfp:!!c.dfp,boe:!!c.boe,intercept:!!c.intercept,enablePathList:c.enablePathList||[],region:c.region||'sg-tiktok',apiHost:c.apiHost||'',mode:c.mode!=null?c.mode:516,isSDK:false,custom:c.custom||{}});
      await w.fetch('https://www.tiktok.com'+path+'?'+raw,{headers:{'Content-Type':'application/json'}});
      await new Promise(r=>setTimeout(r,400));
      return JSON.stringify({url:(w.__cap||[]).filter(u=>u.indexOf(path)!==-1).pop()||null, calls:w.__calls||[]});
    })(${JSON.stringify(sdkSrc)},${JSON.stringify(PATH_)},${JSON.stringify(RAW_POST)},${JSON.stringify(HOOK)})`,
    returnByValue: true, awaitPromise: true, timeout: 90000,
  });
  cdp.close();
  const frame = JSON.parse(r.result.value);

  // --- Node 侧：同样的插桩（借用 tt_sign 的 sandbox，用 vm 在签名前注入 hook） ---
  const vm = require('vm');
  const s = new TikTokSigner({ cookie: '', storage: undefined }).init();
  s.bootstrap();
  const hookExpr = HOOK.replace('window', 'globalThis');
  try { vm.runInContext(hookExpr, s.context, { timeout: 5000 }); } catch (e) { console.log('Node 侧 hook 失败:', e.message); }
  const N = (await s.sign(RAW_POST, PATH_)).url;
  let nodeCalls = [];
  try { nodeCalls = vm.runInContext('JSON.stringify(globalThis.__calls||[])', s.context); nodeCalls = JSON.parse(nodeCalls); } catch (e) { console.log('取 Node 日志失败:', e.message); }

  const tally = (calls) => {
    const m = {};
    for (const [tag] of calls) m[tag] = (m[tag] || 0) + 1;
    return m;
  };
  const tf = tally(frame.calls || []), tn = tally(nodeCalls);
  console.log('=== 签名期间环境 API 调用次数 ===');
  const keys = Array.from(new Set([...Object.keys(tf), ...Object.keys(tn)])).sort();
  for (const k of keys) {
    const a = tf[k] || 0, b = tn[k] || 0;
    console.log('  %s  浏览器=%d  Node=%d  %s', k.padEnd(18), a, b, a === b ? '' : '  ← 差异');
  }
  console.log('\n浏览器帧 X-Dynosaur=%d  Node X-Dynosaur=%d', get(frame.url, 'X-Dynosaur').length, get(N, 'X-Dynosaur').length);

  // 把两侧的调用序列写盘，供离线核对
  fs.writeFileSync(path.join(__dirname, '..', '..', 'artifacts', 'probe-call-diff.json'),
    JSON.stringify({ frameCalls: frame.calls || [], nodeCalls, frameDyn: get(frame.url, 'X-Dynosaur'), nodeDyn: get(N, 'X-Dynosaur') }, null, 1));
  console.log('完整调用序列 -> tiktok/artifacts/probe-call-diff.json');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e); process.exit(1); });