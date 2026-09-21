'use strict';
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';
async function listTargets(){const r=await fetch(CDP_HTTP+'/json/list');return await r.json();}
class Cdp{constructor(w){this.ws=new WebSocket(w);this.id=0;this.p=new Map();this.onEvent=()=>{};
this.ready=new Promise((res,rej)=>{this.ws.addEventListener('open',()=>res());this.ws.addEventListener('error',()=>rej(new Error('ws')));});
this.ws.addEventListener('message',ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return;}
if(m.id&&this.p.has(m.id)){const{resolve,reject}=this.p.get(m.id);this.p.delete(m.id);m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result);return;}
if(m.method)this.onEvent(m);});}
send(method,params={}){const id=++this.id;return new Promise((res,rej)=>{this.p.set(id,{resolve:res,reject:rej});this.ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(this.p.has(id)){this.p.delete(id);rej(new Error('timeout '+method));}},60000);});}
close(){try{this.ws.close()}catch(e){}}}

const SCRIPT = `
(() => {
  const out = { initScripts: [], mssdkReady: null, definedBy: null };
  out.mssdkReady = !!window._mssdk;
  out.umode = window._mssdk && window._mssdk.umode;
  out.cacheOptsKeys = Object.keys((window._mssdk && window._mssdk.cacheOpts) || {});
  // 找出页面里所有 <script> 中提到了 _mssdk 的内联脚本
  for (const s of document.querySelectorAll('script')) {
    const t = s.textContent || '';
    if (t.indexOf('_mssdk') !== -1 && t.length < 4000) out.initScripts.push(t.slice(0, 1200));
  }
  return JSON.stringify(out);
})()
`;

(async()=>{
  const t=(await listTargets()).find(x=>x.type==='page'&&/tiktok/.test(x.url));
  const cdp=new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  try{
    const r=await cdp.send('Runtime.evaluate',{expression:SCRIPT,returnByValue:true,timeout:30000});
    const v=JSON.parse(r.result.value);
    console.log('mssdkReady:', v.mssdkReady, '| umode:', v.umode);
    console.log('cacheOpts keys:', JSON.stringify(v.cacheOptsKeys));
    console.log('内联脚本中提到 _mssdk 的数量:', v.initScripts.length);
    v.initScripts.slice(0,3).forEach((t,i)=>{console.log('--- script['+i+']'); console.log(t.slice(0,700));});
  } finally { cdp.close(); }
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
