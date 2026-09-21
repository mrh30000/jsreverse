'use strict';
// 判定当前是否被限流：间隔发两次「浏览器自签名」请求，看是否恢复
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';
async function listTargets(){const r=await fetch(CDP_HTTP+'/json/list');return await r.json();}
class Cdp{constructor(w){this.ws=new WebSocket(w);this.id=0;this.p=new Map();
this.ready=new Promise((res,rej)=>{this.ws.addEventListener('open',()=>res());this.ws.addEventListener('error',()=>rej(new Error('ws')));});
this.ws.addEventListener('message',ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return;}
if(m.id&&this.p.has(m.id)){const{resolve,reject}=this.p.get(m.id);this.p.delete(m.id);m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result);}});}
send(method,params={}){const id=++this.id;return new Promise((res,rej)=>{this.p.set(id,{resolve:res,reject:rej});this.ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(this.p.has(id)){this.p.delete(id);rej(new Error('timeout '+method));}},60000);});}
close(){try{this.ws.close()}catch(e){}}}

const RAW='WebIdLastTime=0&aid=1988&app_language=en&app_name=tiktok_web&browser_language=en-US&browser_name=Mozilla&browser_online=true&browser_platform=Win32&channel=tiktok_web&cookie_enabled=true&count=12&data_collection_enabled=true&device_platform=web_pc&focus_state=true&from_page=fyp&history_len=3&is_fullscreen=false&is_page_visible=true&os=windows&priority_region=SG&region=SG&screen_height=1080&screen_width=1920&tz_name=Asia/Singapore&user_is_login=true&video_encoding=dash&webcast_language=en';

(async()=>{
  const t=(await listTargets()).find(x=>x.type==='page'&&/tiktok/.test(x.url));
  const cdp=new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  const probe = `(async()=>{try{const r=await fetch('https://www.tiktok.com/api/recommend/item_list/?${RAW}',{headers:{'Content-Type':'application/json'}});const t=await r.text();return JSON.stringify({status:r.status,len:t.length,head:t.slice(0,40)});}catch(e){return 'ERR '+e.message;}})()`;
  try {
    for (let i=1;i<=3;i++){
      const r=await cdp.send('Runtime.evaluate',{expression:probe,returnByValue:true,awaitPromise:true,timeout:45000});
      console.log('第%d次:', i, r.result.value);
      await new Promise(x=>setTimeout(x, 15000));
    }
  } finally { cdp.close(); }
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
