'use strict';
/**
 * X-Bogus 单独验证：frontierSign 的产物是否被服务端接受。
 * 由于当前账号已被限流（连浏览器自签名基线都返回空），这里只做「可离线自证」的部分：
 *   1. 同一 query 在「浏览器 SDK」与「Node SDK」下分别签名，比较长度/字符集/结构一致性；
 *   2. 断言 Node 输出与浏览器同构（长度、字符集、随机性）。
 * 真实 HTTP 验收在限流解除后由 verify_e2e.js 执行。
 */
const fs = require('fs');
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';
const { TikTokSigner } = require('./tt_sign');

async function listTargets(){const r=await fetch(CDP_HTTP+'/json/list');return await r.json();}
class Cdp{constructor(w){this.ws=new WebSocket(w);this.id=0;this.p=new Map();
this.ready=new Promise((res,rej)=>{this.ws.addEventListener('open',()=>res());this.ws.addEventListener('error',()=>rej(new Error('ws')));});
this.ws.addEventListener('message',ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return;}
if(m.id&&this.p.has(m.id)){const{resolve,reject}=this.p.get(m.id);this.p.delete(m.id);m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result);}});}
send(method,params={}){const id=++this.id;return new Promise((res,rej)=>{this.p.set(id,{resolve:res,reject:rej});this.ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(this.p.has(id)){this.p.delete(id);rej(new Error('timeout '+method));}},60000);});}
close(){try{this.ws.close()}catch(e){}}}

const Q = 'aid=1988&app_name=tiktok_web&device_platform=web_pc&count=12&region=SG';

(async () => {
  const assert = require('assert');

  // 1) 浏览器侧
  const t = (await listTargets()).find(x => x.type === 'page' && /tiktok/.test(x.url));
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  let browserOut = null;
  try {
    const r = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify((function(){var a=[];for(var i=0;i<300;i++){a.push(window.byted_acrawler.frontierSign(${JSON.stringify(Q)})['X-Bogus']);}return a;})())`,
      returnByValue: true, timeout: 30000,
    });
    browserOut = JSON.parse(r.result.value);
  } finally { cdp.close(); }

  // 2) Node 侧
  const s = new TikTokSigner().init();
  const nodeOut = [];
  for (let i = 0; i < 300; i++) nodeOut.push(s.frontierSign(Q));

  const bx = browserOut;
  const nx = nodeOut.map(o => o['X-Bogus']);
  console.log('样本数: 浏览器=%d Node=%d', bx.length, nx.length);
  console.log('浏览器样例:', bx.slice(0, 4));
  console.log('Node   样例:', nx.slice(0, 4));

  for (const v of [...bx, ...nx]) {
    assert.strictEqual(typeof v, 'string');
    assert.ok(v.length > 0, 'X-Bogus 非空');
  }
  assert.strictEqual(bx[0].length, nx[0].length, '浏览器与 Node 输出长度一致');
  assert.notStrictEqual(nx[0], nx[1], 'Node 两次输出不同（含随机盐）');

  const charset = (arr) => Array.from(new Set(arr.join('').split(''))).sort().join('');
  console.log('浏览器字符集:', charset(bx));
  console.log('Node   字符集:', charset(nx));
  assert.deepStrictEqual(charset(bx), charset(nx), '字母表完全一致（大样本收敛）');

  console.log('\n✅ X-Bogus 同构性验证通过（长度/字符集/随机性一致）');
  fs.writeFileSync('tiktok/artifacts/xbogus-compare.json', JSON.stringify({ browser: bx, node: nx }, null, 1));
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
