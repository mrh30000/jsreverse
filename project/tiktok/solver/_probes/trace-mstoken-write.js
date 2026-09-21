'use strict';
// 抓 msToken 的赋值点（谁把 msToken 写进 URL / 写进 SDK 状态）
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';
async function listTargets(){const r=await fetch(CDP_HTTP+'/json/list');return await r.json();}
class Cdp{constructor(w){this.ws=new WebSocket(w);this.id=0;this.p=new Map();this.onEvent=()=>{};
this.ready=new Promise((res,rej)=>{this.ws.addEventListener('open',()=>res());this.ws.addEventListener('error',()=>rej(new Error('ws')));});
this.ws.addEventListener('message',ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return;}
if(m.id&&this.p.has(m.id)){const{resolve,reject}=this.p.get(m.id);this.p.delete(m.id);m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result);return;}
if(m.method)this.onEvent(m);});}
send(method,params={}){const id=++this.id;return new Promise((res,rej)=>{this.p.set(id,{resolve:res,reject:rej});this.ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(this.p.has(id)){this.p.delete(id);rej(new Error('timeout '+method));}},90000);});}
close(){try{this.ws.close()}catch(e){}}}

const SCRIPT = `
(async () => {
  const out = { gen: [], urlBuild: [] };
  const NativeURL = window.URL;
  function P(u, base) {
    const inst = new NativeURL(u, base);
    try {
      const href = String(inst.href);
      if (/msToken=/.test(href) && out.urlBuild.length < 5) {
        const m = /[?&]msToken=([^&]*)/.exec(href);
        out.urlBuild.push({ msLen: m ? m[1].length : 0, href: href.slice(0, 150), stack: String(new Error().stack).split('\n').slice(1, 16) });
      }
    } catch (e) {}
    return inst;
  }
  P.prototype = NativeURL.prototype; Object.setPrototypeOf(P, NativeURL); window.URL = P;

  // 也 hook String.prototype.concat（部分版本用拼接）
  const oc = String.prototype.concat;
  String.prototype.concat = function () {
    const r = oc.apply(this, arguments);
    try {
      if (/msToken=[A-Za-z0-9_\-+/=]{20,}/.test(String(r)) && out.gen.length < 5) {
        out.gen.push({ head: String(r).slice(0, 120), stack: String(new Error().stack).split('\n').slice(1, 16) });
      }
    } catch (e) {}
    return r;
  };

  try {
    const q = 'aid=1988&app_name=tiktok_web&device_platform=web_pc&count=12&from_page=fyp&region=SG&user_is_login=true';
    const r = await fetch('https://www.tiktok.com/api/recommend/item_list/?' + q, { headers: { 'Content-Type': 'application/json' } });
    out.status = r.status;
    out.len = (await r.text()).length;
  } catch (e) { out.err = String(e && e.message); }
  window.URL = NativeURL; String.prototype.concat = oc;
  return JSON.stringify(out);
})()
`;

(async()=>{
  const t=(await listTargets()).find(x=>x.type==='page'&&/tiktok/.test(x.url));
  const cdp=new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  try{
    const r=await cdp.send('Runtime.evaluate',{expression:SCRIPT,returnByValue:true,awaitPromise:true,timeout:45000});
    if(r.exceptionDetails){console.log('PAGE ERR', r.exceptionDetails.exception && r.exceptionDetails.exception.description);return;}
    const v=JSON.parse(r.result.value);
    console.log('status=%s len=%s urlBuild=%d gen=%d err=%s', v.status, v.len, v.urlBuild.length, v.gen.length, v.err||'-');
    v.urlBuild.forEach((b,i)=>{console.log('--- urlBuild['+i+'] msLen='+b.msLen+' '+b.href); (b.stack||[]).slice(0,10).forEach(f=>console.log('    '+f.trim()));});
    v.gen.forEach((g,i)=>{console.log('--- gen['+i+'] '+g.head); (g.stack||[]).slice(0,10).forEach(f=>console.log('    '+f.trim()));});
  } finally { cdp.close(); }
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
