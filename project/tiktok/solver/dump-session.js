'use strict';
// 从浏览器 dump 出离线签名所需的全部会话材料（cookie / localStorage / sessionStorage / UA）
const fs = require('fs');
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';
class Cdp{constructor(w){this.ws=new WebSocket(w);this.id=0;this.p=new Map();
this.ready=new Promise((a,b)=>{this.ws.addEventListener('open',()=>a());this.ws.addEventListener('error',()=>b(new Error('ws')));});
this.ws.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data)}catch(x){return;}
if(m.id&&this.p.has(m.id)){const{resolve,reject}=this.p.get(m.id);this.p.delete(m.id);m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result);}});}
send(method,params={}){const id=++this.id;return new Promise((res,rej)=>{this.p.set(id,{resolve:res,reject:rej});this.ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(this.p.has(id)){this.p.delete(id);rej(new Error('timeout '+method));}},120000);});}
close(){try{this.ws.close()}catch(e){}}}
(async()=>{
  const list=await (await fetch(CDP_HTTP+'/json/list')).json();
  const t=list.find(x=>x.type==='page'&&/tiktok/.test(x.url));
  const cdp=new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  const r=await cdp.send('Runtime.evaluate',{expression:`JSON.stringify({
    cookie: document.cookie,
    local: Object.fromEntries(Object.keys(localStorage).map(k=>[k, localStorage.getItem(k)])),
    session: Object.fromEntries(Object.keys(sessionStorage).map(k=>[k, sessionStorage.getItem(k)])),
    ua: navigator.userAgent, url: location.href,
  })`,returnByValue:true,timeout:30000});
  const s=JSON.parse(r.result.value);
  fs.writeFileSync('tiktok/artifacts/session-dump.json', JSON.stringify(s,null,1));
  console.log('cookie len:', s.cookie.length);
  console.log('localStorage keys:', Object.keys(s.local).join(','));
  console.log('  msToken len:', (s.local.msToken||'').length);
  console.log('  xmst len:', (s.local.xmst||'').length);
  console.log('sessionStorage keys:', Object.keys(s.session).join(','));
  console.log('UA:', s.ua);
  cdp.close();
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
