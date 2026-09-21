'use strict';
// 用 CDP 重新加载页面并收集所有 scriptParsed，搜索 _mssdk 的写入点
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';
async function listTargets(){const r=await fetch(CDP_HTTP+'/json/list');return await r.json();}
class Cdp{constructor(w){this.ws=new WebSocket(w);this.id=0;this.p=new Map();this.onEvent=()=>{};
this.ready=new Promise((res,rej)=>{this.ws.addEventListener('open',()=>res());this.ws.addEventListener('error',()=>rej(new Error('ws')));});
this.ws.addEventListener('message',ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return;}
if(m.id&&this.p.has(m.id)){const{resolve,reject}=this.p.get(m.id);this.p.delete(m.id);m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result);return;}
if(m.method)this.onEvent(m);});}
send(method,params={}){const id=++this.id;return new Promise((res,rej)=>{this.p.set(id,{resolve:res,reject:rej});this.ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(this.p.has(id)){this.p.delete(id);rej(new Error('timeout '+method));}},120000);});}
close(){try{this.ws.close()}catch(e){}}}

(async()=>{
  const t=(await listTargets()).find(x=>x.type==='page'&&/tiktok/.test(x.url));
  const cdp=new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  const scripts=[];
  cdp.onEvent=(m)=>{
    if(m.method==='Debugger.scriptParsed') scripts.push(m.params);
    if(m.method==='Page.frameNavigated') console.log('  [nav]', m.params.frame.url.slice(0,70));
  };
  try{
    await cdp.send('Debugger.enable');
    await cdp.send('Page.enable');
    console.log('reloading...');
    await cdp.send('Page.reload', { ignoreCache: false });
    // 等待加载完成
    await new Promise(res=>setTimeout(res, 20000));
    console.log('scriptParsed 数:', scripts.length);
    let hits=0;
    const results=[];
    for (const sc of scripts) {
      if (!sc.url || /chrome-extension/.test(sc.url)) continue;
      try {
        const rr = await cdp.send('Debugger.searchInContent', { scriptId: sc.scriptId, query: '_mssdk', caseSensitive: true });
        if (rr.result && rr.result.length) {
          hits++;
          results.push({url: sc.url, n: rr.result.length, lines: rr.result.slice(0,3)});
        }
      } catch(e){}
    }
    console.log('含 "_mssdk" 的脚本:', hits);
    results.slice(0,10).forEach(r=>console.log('  ', r.n, r.url.slice(-80)));
    require('fs').writeFileSync('tiktok/artifacts/mssdk-writers.json', JSON.stringify(results,null,1));
  } finally { cdp.close(); }
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
