'use strict';
// 用 CDP Debugger 在所有脚本里搜 "_mssdk" 的写入点（源码级搜索，避开 proxycli）
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';
async function listTargets(){const r=await fetch(CDP_HTTP+'/json/list');return await r.json();}
class Cdp{constructor(w){this.ws=new WebSocket(w);this.id=0;this.p=new Map();this.onEvent=()=>{};
this.ready=new Promise((res,rej)=>{this.ws.addEventListener('open',()=>res());this.ws.addEventListener('error',()=>rej(new Error('ws')));});
this.ws.addEventListener('message',ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return;}
if(m.id&&this.p.has(m.id)){const{resolve,reject}=this.p.get(m.id);this.p.delete(m.id);m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result);return;}
if(m.method)this.onEvent(m);});}
send(method,params={}){const id=++this.id;return new Promise((res,rej)=>{this.p.set(id,{resolve:res,reject:rej});this.ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(this.p.has(id)){this.p.delete(id);rej(new Error('timeout '+method));}},60000);});}
close(){try{this.ws.close()}catch(e){}}}

(async()=>{
  const t=(await listTargets()).find(x=>x.type==='page'&&/tiktok/.test(x.url));
  const cdp=new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  try{
    await cdp.send('Debugger.enable');
    const r = await cdp.send('Debugger.searchInContent', {
      scriptId: '', query: '_mssdk', caseSensitive: true,
    }).catch(e=>({error:e.message}));
    console.log('searchInContent(empty scriptId) ->', JSON.stringify(r).slice(0,200));

    // 列出所有脚本，逐个搜
    const scripts = [];
    cdp.onEvent = (m)=>{ if(m.method==='Debugger.scriptParsed') scripts.push(m.params); };
    await new Promise(res=>setTimeout(res,1500));
    console.log('scriptParsed 事件数:', scripts.length);
    let hits = 0;
    for (const sc of scripts) {
      if (!sc.url || /extensions|chrome-extension/.test(sc.url)) continue;
      try {
        const rr = await cdp.send('Debugger.searchInContent', { scriptId: sc.scriptId, query: '_mssdk.cacheOpts', caseSensitive: true });
        if (rr.result && rr.result.length) {
          hits++;
          console.log('HIT', sc.url.slice(-70), 'matches=', rr.result.length, JSON.stringify(rr.result.slice(0,2)));
        }
      } catch(e) {}
      if (hits >= 6) break;
    }
    console.log('含 "_mssdk.cacheOpts" 的脚本数:', hits);
  } finally { cdp.close(); }
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
