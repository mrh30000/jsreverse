/** 逐字段 diff：页面真实 _mssdk vs solver 的 loadSeedConfig() */
'use strict';
const fs=require('fs'),path=require('path');
const { loadSeedConfig } = require('../tt_sign');
const { Cdp } = require('./_oracle');
(async()=>{
const list=await (await fetch('http://127.0.0.1:19222/json/list')).json();
const t=list.find(x=>x.type==='page'&&/tiktok/.test(x.url));
const cdp=new Cdp(t.webSocketDebuggerUrl);await cdp.ready;
const r=await cdp.send('Runtime.evaluate',{expression:`(()=>{const m=window._mssdk;
  const re=(m._enablePathListRegex||[]).map(x=>x instanceof RegExp?x.source:String(x));
  return JSON.stringify({keys:Object.keys(m), _enablePathList:m._enablePathList, _enablePathListRegex:re,
    umode:m.umode, pppt:m.pppt, ets:m.ets, length:m.length, _loaderInit:m._loaderInit,
    _sharedCache:m._sharedCache, cacheOpts:m.cacheOpts, opts:m.opts, _urlRewriteRules:m._urlRewriteRules,
    ownProps:Object.getOwnPropertyNames(m)});})()`,returnByValue:true});
cdp.close();
const page=JSON.parse(r.result.value);
const seed=loadSeedConfig();
seed._enablePathListRegex=seed._enablePathListRegex.map(x=>x.source);
const SKIP=['_enablePathList'];
for(const k of Object.keys(seed)) SKIP.includes(k)||0;
for(const k of new Set([...Object.keys(page),...Object.keys(seed)])){
  if(k==='ownProps') continue;
  const a=page[k], b=seed[k];
  let sa,sb;
  try{sa=JSON.stringify(a);}catch(e){sa='<circular>'}
  try{sb=JSON.stringify(b);}catch(e){sb='<circular>'}
  if(sa===sb) { console.log('  = '+k); continue; }
  if(k==='_enablePathList'||k==='_enablePathListRegex'){
    console.log('  ≠ '+k+'  页面条数='+(a&&a.length)+'  seed条数='+(b&&b.length));
    const setA=new Set((a||[]).map(String)), setB=new Set((b||[]).map(String));
    const onlyA=[...setA].filter(x=>!setB.has(x)), onlyB=[...setB].filter(x=>!setA.has(x));
    console.log('      页面独有('+onlyA.length+'): '+onlyA.slice(0,12).join(' | '));
    console.log('      seed独有('+onlyB.length+'): '+onlyB.slice(0,12).join(' | '));
    continue;
  }
  console.log('  ≠ '+k+'  页面='+String(sa).slice(0,160)+'   seed='+String(sb).slice(0,160));
}
console.log('\n页面 keys:',page.keys.join(','));
console.log('页面 ownProps:',page.ownProps.join(','));
process.exit(0);
})().catch(e=>{console.error('FAILED:',e.message);process.exit(1)});
