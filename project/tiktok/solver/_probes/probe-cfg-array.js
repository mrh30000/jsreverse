/**
 * 探针 K（根因）：页面 `window._mssdk` 的**真实类型是 Array**（带命名属性），
 * 而 solver 的 loadSeedConfig() 造的是普通 Object。
 * SDK 靠 Array 语义（push/indexOf/…）维护路径表，类型不对就走到「不签名」或「签旧版」分支。
 */
'use strict';
const fs=require('fs'),path=require('path');
const { RAW_POST, runOracle, pageSigned, Cdp } = require('./_oracle');
const SDK=path.join(__dirname,'..','..','sources','webmssdk.1.0.0.417.js.orig');
const PATH_='/api/post/item_list/';
const get=(q,k)=>{const m=new RegExp('[?&]'+k+'=([^&]*)').exec(q);return m?m[1]:'';};
const set=(q,k,v)=>{const p=q.split('&');const i=p.findIndex(s=>s.split('=')[0]===k);if(i===-1)p.push(k+'='+v);else p[i]=k+'='+v;return p.join('&');};
(async()=>{
const sdkSrc=fs.readFileSync(SDK,'utf8');
const P=await pageSigned(RAW_POST,PATH_);
const list=await (await fetch('http://127.0.0.1:19222/json/list')).json();
const t=list.find(x=>x.type==='page'&&/tiktok/.test(x.url));
const cdp=new Cdp(t.webSocketDebuggerUrl);await cdp.ready;
const ev=async(e)=>{const r=await cdp.send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true,timeout:90000});if(r.exceptionDetails)return{err:JSON.stringify(r.exceptionDetails).slice(0,240)};return{value:r.result.value};};
const FRAME=`(async(sdkSrc,path,raw,mode)=>{
  const fr=document.createElement('iframe');fr.style.display='none';document.body.appendChild(fr);
  await new Promise(r=>setTimeout(r,300));const w=fr.contentWindow;const out={};
  try{
    const m=window._mssdk;                       // 页面真 _mssdk（Array）
    if(mode==='shared') w._mssdk=m;
    else if(mode==='arrayClone'){ const a=[]; for(const k of Object.getOwnPropertyNames(m)) a[k]=m[k]; w._mssdk=a; }
    else if(mode==='plainClone'){ const o={}; for(const k of Object.getOwnPropertyNames(m)) o[k]=m[k]; w._mssdk=o; }
    w.__cap=[];const of=w.fetch.bind(w);
    w.fetch=function(u,i){try{w.__cap.push(String(typeof u==='string'?u:(u&&u.url)))}catch(e){};return of(u,i)};
    w.eval(sdkSrc);
    if(!w.byted_acrawler){out.err='未挂载';return JSON.stringify(out)}
    const cm=(w._mssdk.cacheOpts&&w._mssdk.cacheOpts['1988'])||{};
    w.byted_acrawler.init({aid:1988,dfp:!!cm.dfp,boe:!!cm.boe,intercept:!!cm.intercept,enablePathList:cm.enablePathList||[],region:cm.region||'sg-tiktok',apiHost:cm.apiHost||'',mode:cm.mode!=null?cm.mode:516,isSDK:false,custom:cm.custom||{}});
    await w.fetch('https://www.tiktok.com'+path+'?'+raw,{headers:{'Content-Type':'application/json'}});
    await new Promise(r=>setTimeout(r,400));
    out.isArray=Array.isArray(w._mssdk);
    out.url=(w.__cap||[]).filter(u=>u.indexOf(path)!==-1).pop()||null;
    if(!out.url) out.err='未捕获 cap='+(w.__cap||[]).length;
  }catch(e){out.err=String(e&&e.message)}
  return JSON.stringify(out);
})`;
const urls=[P],labels=['★ 页面基准'];
try{
  for(const [n,mode] of [['① 共享（Array）','shared'],['② [] 克隆（Array）','arrayClone'],['③ {} 克隆（Object）','plainClone']]){
    const r=await ev(`${FRAME}(${JSON.stringify(sdkSrc)},${JSON.stringify(PATH_)},${JSON.stringify(RAW_POST)},${JSON.stringify(mode)})`);
    const o=r.err?{err:r.err}:JSON.parse(r.value);
    console.log('%s -> isArray=%s  %s',n.padEnd(24),o.isArray,o.url?'dy='+get(o.url,'X-Dynosaur').length:'ERR '+o.err);
    urls.push(o.url?set(P,'X-Dynosaur',get(o.url,'X-Dynosaur')):P);labels.push(n);
  }
  const res=await runOracle(urls);
  console.log('\n=== 送测 ===');
  labels.forEach((l,i)=>console.log(l.padEnd(26)+JSON.stringify(res[i]||{})));
}finally{cdp.close();}
process.exit(0);
})().catch(e=>{console.error('FAILED:',e.message);process.exit(1)});
