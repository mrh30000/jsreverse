/** 探针 O：列出「真浏览器 iframe 有、Node 沙箱没有」的全局，作为缺失能力候选 */
'use strict';
const fs=require('fs'),path=require('path');
const { RAW_POST, Cdp } = require('./_oracle');
const { createEnv } = require('../tt_env');
const { loadSeedConfig } = require('../tt_sign');
(async()=>{
const list=await (await fetch('http://127.0.0.1:19222/json/list')).json();
const t=list.find(x=>x.type==='page'&&/tiktok/.test(x.url));
const cdp=new Cdp(t.webSocketDebuggerUrl);await cdp.ready;
const r=await cdp.send('Runtime.evaluate',{expression:`(async()=>{
  const fr=document.createElement('iframe');fr.style.display='none';document.body.appendChild(fr);
  await new Promise(r=>setTimeout(r,300));const w=fr.contentWindow;
  const names=Object.getOwnPropertyNames(w).sort();
  const info={};
  for(const n of names){ let ty; try{ty=typeof w[n]}catch(e){ty='?'} info[n]=ty; }
  // 再补一层常用内置
  const extra={};
  for(const n of ['crypto','performance','navigator','screen','document','history','location','localStorage','sessionStorage','TextEncoder','TextDecoder','WebAssembly','Proxy','Reflect','Symbol','JSON','Math','Date','Intl','BigInt','Uint8Array','ArrayBuffer','Promise','WeakMap','WeakSet','Map','Set','Function','eval','atob','btoa','fetch','XMLHttpRequest','Request','Response','Headers','URL','URLSearchParams','Blob','File','FormData','Image','Audio','Worker','WebSocket','EventSource','Notification','RTCPeerConnection','screen','visualViewport','speechSynthesis','indexedDB','caches','CookieStore','Crypto','CryptoKey','SubtleCrypto','Permissions','StorageManager','MutationObserver','IntersectionObserver','ResizeObserver','PerformanceObserver','requestIdleCallback','queueMicrotask','structuredClone','reportError','isSecureContext','crossOriginIsolated','origin','devicePixelRatio','innerWidth','innerHeight','scrollX','scrollY','matchMedia','getComputedStyle','postMessage','open','close','focus','blur','alert','confirm','prompt','print','self','top','parent','frames','length','name','closed','opener','status','toolbar','menubar']){
    try{ extra[n]=typeof w[n]; }catch(e){ extra[n]='?' }
  }
  // subtle 的方法
  let subtle=null;
  try{ subtle={type:typeof w.crypto.subtle, methods:w.crypto.subtle?Object.getOwnPropertyNames(Object.getPrototypeOf(w.crypto.subtle)):null}; }catch(e){ subtle={err:String(e.message)} }
  fr.remove();
  return JSON.stringify({count:names.length,info,extra,subtle});
})()`,returnByValue:true,awaitPromise:true,timeout:60000});
cdp.close();
const frame=JSON.parse(r.result.value);
const env=createEnv({url:'https://www.tiktok.com/@tiktok',mssdkConfig:loadSeedConfig(),cookie:''});
const nodeKeys=new Set(Object.keys(env));
const missing=Object.keys(frame.extra).filter(n=>!nodeKeys.has(n)&&frame.extra[n]!=='undefined');
const undefInFrame=Object.keys(frame.extra).filter(n=>frame.extra[n]==='undefined');
console.log('iframe 全局数:',frame.count);
console.log('\niframe 有、Node 沙箱缺（且存在）:');
for(const n of missing) console.log('   '+n.padEnd(24)+frame.extra[n]);
console.log('\n两边都 undefined 的:',undefInFrame.join(', ')||'(无)');
console.log('\ncrypto.subtle:',JSON.stringify(frame.subtle));
fs.writeFileSync(path.join(__dirname,'..','..','artifacts','probe-globals-diff.json'),JSON.stringify({frame,missing},null,1));
process.exit(0);
})().catch(e=>{console.error('FAILED:',e.message);process.exit(1)});
