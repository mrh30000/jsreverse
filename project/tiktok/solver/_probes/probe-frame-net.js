/** 探针 N：记录「真浏览器 iframe 里 SDK」在 init+签名期间发出的**全部**请求，
 *  与 Node 补环境（只发业务请求）对比 —— 差异请求就是签名所需的服务端输入。 */
'use strict';
const fs=require('fs'),path=require('path');
const { RAW_POST, Cdp, pageSigned } = require('./_oracle');
const SDK=path.join(__dirname,'..','..','sources','webmssdk.1.0.0.417.js.orig');
const PATH_='/api/post/item_list/';
(async()=>{
const sdkSrc=fs.readFileSync(SDK,'utf8');
const P=await pageSigned(RAW_POST,PATH_);
const list=await (await fetch('http://127.0.0.1:19222/json/list')).json();
const t=list.find(x=>x.type==='page'&&/tiktok/.test(x.url));
const cdp=new Cdp(t.webSocketDebuggerUrl);await cdp.ready;
const r=await cdp.send('Runtime.evaluate',{expression:`(async(sdkSrc,path,raw)=>{
  const fr=document.createElement('iframe');fr.style.display='none';document.body.appendChild(fr);
  await new Promise(r=>setTimeout(r,300));const w=fr.contentWindow;
  w.__all=[];
  const of=w.fetch.bind(w);
  w.fetch=function(u,i){
    let info={url:String(typeof u==='string'?u:(u&&u.url)),method:(i&&i.method)||'GET',t:Date.now()};
    const pr=of(u,i);
    if(pr&&pr.then) pr.then(res=>{ info.status=res.status; }).catch(e=>{ info.err=String(e&&e.message); });
    w.__all.push(info); return pr;
  };
  // 也记录 XHR
  const OX=w.XMLHttpRequest;
  w.XMLHttpRequest=function(){ const x=new OX(); const oo=x.open; x.open=function(m,u){ w.__all.push({url:String(u),method:m,xhr:true}); return oo.apply(x,arguments); }; return x; };
  w.eval(sdkSrc);
  const m=window._mssdk,c=(m&&m.cacheOpts&&m.cacheOpts['1988'])||{};
  w.byted_acrawler.init({aid:1988,dfp:!!c.dfp,boe:!!c.boe,intercept:!!c.intercept,enablePathList:c.enablePathList||[],region:c.region||'sg-tiktok',apiHost:c.apiHost||'',mode:c.mode!=null?c.mode:516,isSDK:false,custom:c.custom||{}});
  await new Promise(r=>setTimeout(r,1200));      // 给 SDK 的配置请求留时间
  await w.fetch('https://www.tiktok.com'+path+'?'+raw,{headers:{'Content-Type':'application/json'}});
  await new Promise(r=>setTimeout(r,800));
  return JSON.stringify(w.__all);
})(${JSON.stringify(sdkSrc)},${JSON.stringify(PATH_)},${JSON.stringify(RAW_POST)})`,returnByValue:true,awaitPromise:true,timeout:90000});
cdp.close();
const all=JSON.parse(r.result.value);
console.log('iframe SDK 期间发出的请求（%d 条）:',all.length);
for(const q of all) console.log('  %s %s %s',String(q.method).padEnd(6),String(q.status==null?'':q.status).padEnd(5),q.url.slice(0,130));
// 与 Node 侧对比
const vm=require('vm');
const {loadSeedConfig}=require('../tt_sign');
const {createEnv,makeFakeResponse}=require('../tt_env');
const reqs=[];
const env=createEnv({url:'https://www.tiktok.com/@tiktok',mssdkConfig:loadSeedConfig(),cookie:'',
  fetchImpl:(u,init)=>{reqs.push({url:u,method:(init&&init.method)||'GET'});return Promise.resolve(makeFakeResponse('{}',200,u))}});
console.log('\nNode 补环境期间发出的请求（%d 条）:',reqs.length);
for(const q of reqs) console.log('  %s %s',String(q.method).padEnd(6),q.url.slice(0,130));
fs.writeFileSync(path.join(__dirname,'..','..','artifacts','probe-frame-net.json'),JSON.stringify({frame:all,node:reqs},null,1));
process.exit(0);
})().catch(e=>{console.error('FAILED:',e.message);process.exit(1)});
