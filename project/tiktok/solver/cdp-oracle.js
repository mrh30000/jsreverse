/**
 * 验收用 CDP 工具：把候选 URL 交给「浏览器 iframe 的**原始 fetch**」发出并回收结果。
 *
 * 为什么必须用 iframe 的原始 fetch：页面主上下文的 fetch 已被 SDK 包装，
 * 会**自动二次签名**。用它测「去掉签名」永远得到假阳性（被补签了），
 * 从而把「非强制参数」误判成「必需」。见 README 坑 2。
 *
 * 判定口径：只回传「响应体摘要」（命中哪个业务字段、条数、status_code），
 * 不回传完整 body —— 业务响应动辄数百 KB，回传会拖垮 CDP。
 *
 * 双后端（自动选择，优先 proxycli）：
 *   · proxycli 后端 —— 浏览器被 proxycli daemon 接管时**只有它能用**
 *     （daemon attach 后裸 CDP 端口 19222 会 ECONNREFUSED）
 *   · 裸 CDP 后端 —— 自己用 --remote-debugging-port=19222 起的实例
 *   可用环境变量 ORACLE_BACKEND=proxycli|cdp 强制指定。
 *
 * 用法（被其它验收脚本 require）：
 *   const { RAW_POST, runOracle, pageSession, pageSigned } = require('./cdp-oracle');
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const CDP_HTTP = process.env.CDP_URL || 'http://127.0.0.1:19222';

/** 与浏览器 /api/post/item_list/ 实际请求逐字节相同的 raw query（含 device_id/odinId/verifyFp） */
const RAW_POST = 'WebIdLastTime=0&aid=1988&app_language=zh-Hans&app_name=tiktok_web&browser_language=zh-CN&browser_name=Mozilla&browser_online=true&browser_platform=Win32&browser_version=5.0%20(Windows%20NT%2010.0%3B%20Win64%3B%20x64)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F153.0.0.0%20Safari%2F537.36&channel=tiktok_web&cookie_enabled=true&count=16&coverFormat=2&cursor=0&data_collection_enabled=false&device_id=7686701696877217301&device_platform=web_pc&focus_state=true&history_len=4&is_fullscreen=false&is_page_visible=true&language=zh-Hans&odinId=7686701682830672912&os=windows&priority_region=&referer=https%3A%2F%2Fwww.tiktok.com%2F%40tiktok&region=TW&root_referer=https%3A%2F%2Fwww.tiktok.com%2F&screen_height=1080&screen_width=1920&secUid=MS4wLjABAAAAv7iSuuXDJGDvJkmH_vz1qkDZYo1apxgzaxdBSeIuPiM&tz_name=Asia%2FSingapore&user_is_login=false&verifyFp=verify_mu6d0neq_4CnjBa5N_m9I3_4VB1_9u05_8E4p9t3KhC8u&video_encoding=dash&webcast_language=zh-Hans';

// ---------- proxycli 后端 ----------
/** proxycli daemon 是否可用（接管了浏览器时裸 CDP 端口会 ECONNREFUSED） */
function proxycliAvailable() {
  if (process.env.ORACLE_BACKEND === 'cdp') return false;
  if (process.env.ORACLE_BACKEND === 'proxycli') return true;
  try {
    const out = execFileSync('proxycli', ['browser', 'status'], { encoding: 'utf8', timeout: 30000, shell: true, maxBuffer: 64 * 1024 * 1024 });
    return /connected[:\s"]+true/i.test(out);
  } catch (e) { return false; }
}

/** 用 proxycli 在页面里跑一个函数（源码形式），结果以 base64 回传 */
function proxycliEval(fnSrc, timeoutMs) {
  const p = path.join(os.tmpdir(), 'cdp-oracle-page.js');
  fs.writeFileSync(p, fnSrc);
  const raw = execFileSync('proxycli', [
    'call', 'evaluate_script', '--file', p, '--allowAnyFrame', 'true', '--timeoutMs', String(timeoutMs),
  ], { encoding: 'utf8', timeout: timeoutMs + 60000, shell: true, maxBuffer: 256 * 1024 * 1024 });
  // base64 里没有引号/反斜杠，所以按行扫 value 字段即可，避开正则拆转义文本
  const line = raw.split(/\r?\n/).map(l => l.trim()).find(l => /^value:\s*[A-Za-z0-9+/=]{2,}$/.test(l));
  if (!line) throw new Error('proxycli 未返回 base64 结果:\n' + raw.slice(0, 900));
  const text = Buffer.from(line.replace(/^value:\s*/, ''), 'base64').toString('utf8');
  try { return JSON.parse(text); } catch (e) { return text; }
}

/** 业务载荷识别器源码（供 proxycli 后端在页面里执行） */
const PICK_DATA_SRC = `
  const DATA_KEYS=['itemList','userList','user_list','comments','itemInfo','userInfo','challengeInfo','playList','mixList','mixInfo','searchInfo','storyList'];
  const META_KEYS=['extra','log_pb','statusCode','status_code','status_msg','hasMore','cursor','logId','TotalCount'];
  const pickData=(j)=>{
    if(!j||typeof j!=='object') return {ok:false,detail:'非 JSON 响应'};
    const code=(j.status_code!=null)?j.status_code:j.statusCode;
    if(code!==0) return {ok:false,detail:'status_code='+code+' '+String(j.status_msg||'').slice(0,40)};
    for(const k of DATA_KEYS){ const v=j[k]; const n=Array.isArray(v)?v.length:(v&&typeof v==='object'?Object.keys(v).length:0);
      if(n>0) return {ok:true,key:k,count:n,detail:k+(Array.isArray(v)?'['+v.length+']':'{'+n+'}')}; }
    for(const k of Object.keys(j)){ const v=j[k];
      if(META_KEYS.indexOf(k)===-1 && Array.isArray(v) && v.length) return {ok:true,key:k,count:v.length,detail:k+'['+v.length+']'}; }
    return {ok:false,detail:'status_code=0 但业务载荷为空'};
  };
`;

function proxycliRunOracle(urls) {
  const fn = `
async () => {
  ${PICK_DATA_SRC}
  document.querySelectorAll('iframe').forEach(f => { try { f.remove(); } catch (e) {} });
  const ifr = document.createElement('iframe');
  ifr.style.display = 'none';
  document.body.appendChild(ifr);
  await new Promise(r => setTimeout(r, 500));
  const f = ifr.contentWindow.fetch.bind(ifr.contentWindow);
  const out = [];
  for (const u of ${JSON.stringify(urls)}) {
    try {
      const r = await f(u, { headers: { 'Content-Type': 'application/json' } });
      const tx = await r.text(); let j = null; try { j = JSON.parse(tx); } catch (e) {}
      const p = pickData(j);
      out.push({ status: r.status, len: tx.length, ok: p.ok, key: p.key || null, count: p.count || 0, detail: p.detail });
    } catch (e) { out.push({ status: 0, len: 0, ok: false, detail: 'ERR ' + String(e && e.message) }); }
    await new Promise(r => setTimeout(r, 2500));
  }
  ifr.remove();
  return btoa(unescape(encodeURIComponent(JSON.stringify(out))));
}`;
  return proxycliEval(fn, 240000);
}

function proxycliPageSession() {
  return proxycliEval(`() => btoa(unescape(encodeURIComponent(JSON.stringify({
    cookie: document.cookie, url: location.href,
    local: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])),
    session: Object.fromEntries(Object.keys(sessionStorage).map(k => [k, sessionStorage.getItem(k)])),
  }))))`, 60000);
}

/**
 * 页面 SDK 现签：在页面里发一次同 raw query 的请求，再从 proxycli 网络记录取回**最终发出的 URL**。
 * 不能在页内包装 fetch —— SDK 在加载时就缓存了 fetch 引用，包装拦不住它（本项目已踩过）。
 */
function proxycliPageSigned(raw, apiPath) {
  proxycliEval(`() => { document.querySelectorAll('iframe').forEach(f => { try { f.remove(); } catch (e) {} }); return btoa('ok'); }`, 30000);
  proxycliEval(`() => { fetch('https://www.tiktok.com${apiPath}?${raw}', { headers: { 'Content-Type': 'application/json' } }).then(r => r.text()).catch(() => {}); return btoa('sent'); }`, 30000);
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const out = execFileSync('proxycli', ['call', 'list_network_requests', '--urlFilter', apiPath, '--pageSize', '3'],
        { encoding: 'utf8', timeout: 120000, shell: true, maxBuffer: 256 * 1024 * 1024 });
      const found = [...out.matchAll(/"(https:\/\/www\.tiktok\.com[^"]*?)"/g)].map(m => m[1]).filter(u => u.indexOf(apiPath) !== -1);
      if (found.length) return found.pop();
    } catch (e) {}
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);
  }
  return null;
}


/**
 * 取页面**真实发出**的完整 URL（含业务参数与登录态）。
 *
 * 为什么必须这样做：手拼 query 的 device_id/odinId/verifyFp 来自旧快照，
 * 与当前登录态 cookie 不匹配；且缺 secUid/from_page 等业务参数 ——
 * 结果是**连页面现签也拿不到数据**，A/B 实验失去基准。
 *
 * 做法：导航到用户页让页面自然发一次请求，再从 proxycli 网络记录里捞回完整 URL。
 * 依赖 proxycli 后端（裸 CDP 后端下返回 null）。
 */
async function realQueryUrl(apiPath, opts = {}) {
  if (!proxycliAvailable()) return null;
  const waitMs = opts.waitMs || 15000;
  // ① 导航触发自然请求
  const trigger = `async () => {
    document.querySelectorAll('iframe').forEach(f => { try { f.remove(); } catch (e) {} });
    try {
      const seg = location.pathname.split('/').filter(Boolean)[0] || '';
      const u = seg ? 'https://www.tiktok.com/' + seg.replace(/^@?/, '@') : 'https://www.tiktok.com/foryou';
      setTimeout(() => { location.href = u; }, 50);
    } catch (e) {}
    return btoa('nav');
  }`;
  try { proxycliEval(trigger, 40000); } catch (e) { /* 导航后上下文可能变，忽略 */ }
  await new Promise(r => setTimeout(r, waitMs));
  // ② 从网络记录取完整 URL
  const out = execFileSync('proxycli', ['call', 'list_network_requests', '--urlFilter', apiPath, '--pageSize', '3'],
    { encoding: 'utf8', timeout: 180000, shell: true, maxBuffer: 256 * 1024 * 1024 });
  const found = [...out.matchAll(/"?(https:\/\/www\.tiktok\.com[^"\s]*?)"?/g)]
    .map(m => m[1]).filter(u => u.indexOf(apiPath) !== -1);
  return found.pop() || null;
}

// ---------- 裸 CDP 后端 ----------
class Cdp {
  constructor(w) {
    this.ws = new WebSocket(w); this.id = 0; this.p = new Map();
    this.ready = new Promise((a, b) => {
      this.ws.addEventListener('open', () => a());
      this.ws.addEventListener('error', () => b(new Error('ws')));
    });
    this.ws.addEventListener('message', (e) => {
      let m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.id && this.p.has(m.id)) {
        const { resolve, reject } = this.p.get(m.id); this.p.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.p.set(id, { resolve: res, reject: rej });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.p.has(id)) { this.p.delete(id); rej(new Error('timeout ' + method)); } }, 240000);
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

/** 页面侧的业务载荷识别器（与 solver 侧 pickData 同一套键名；放在页面里跑可避免回传大 body） */
const PAGE_CLASSIFY = `
  const DATA_KEYS=['itemList','userList','comments','itemInfo','userInfo','challengeInfo','playList','mixList','mixInfo','searchInfo','storyList'];
  const META_KEYS=['extra','log_pb','statusCode','status_code','status_msg','hasMore','cursor','logId','TotalCount'];
  const pickData=(j)=>{
    if(!j||typeof j!=='object') return {ok:false,detail:'非 JSON 响应'};
    const code=(j.status_code!=null)?j.status_code:j.statusCode;
    if(code!==0) return {ok:false,detail:'status_code='+code+' '+String(j.status_msg||'').slice(0,40)};
    for(const k of DATA_KEYS){ const v=j[k]; const n=Array.isArray(v)?v.length:(v&&typeof v==='object'?Object.keys(v).length:0);
      if(n>0) return {ok:true,key:k,count:n,detail:k+(Array.isArray(v)?'['+v.length+']':'{'+n+'}')}; }
    for(const k of Object.keys(j)){ const v=j[k];
      if(META_KEYS.indexOf(k)===-1 && Array.isArray(v) && v.length) return {ok:true,key:k,count:v.length,detail:k+'['+v.length+']'}; }
    return {ok:false,detail:'status_code=0 但业务载荷为空'};
  };
`;

async function cdpForTiktokPage() {
  const list = await (await fetch(CDP_HTTP + '/json/list')).json();
  const t = list.find(x => x.type === 'page' && /tiktok/.test(x.url));
  if (!t) throw new Error('CDP 里没有 tiktok 页面（先打开 https://www.tiktok.com/）');
  const cdp = new Cdp(t.webSocketDebuggerUrl); await cdp.ready;
  return cdp;
}

/**
 * 批量发送：用 iframe 原始 fetch 依次发出，回传 {status,len,ok,detail,key,count}。
 * @param {string[]} urls
 */
async function runOracle(urls) {
  if (proxycliAvailable()) return proxycliRunOracle(urls);
  const cdp = await cdpForTiktokPage();
  const code = `(async()=>{
  ${PAGE_CLASSIFY}
  const ifr=document.createElement('iframe'); ifr.style.display='none'; document.body.appendChild(ifr);
  await new Promise(r=>{ifr.onload=r;ifr.src='about:blank';setTimeout(r,3000)});
  // ★ 必须是 iframe 的原始 fetch：页面 fetch 会被 SDK 重新签名
  const f=ifr.contentWindow.fetch.bind(ifr.contentWindow);
  const out=[];
  for(const u of ${JSON.stringify(urls)}){
    try{
      const r=await f(u,{headers:{'Content-Type':'application/json'}});
      const tx=await r.text(); let j=null; try{j=JSON.parse(tx)}catch(e){}
      const p=pickData(j);
      out.push({status:r.status,len:tx.length,ok:p.ok,key:p.key||null,count:p.count||0,detail:p.detail});
    }catch(e){ out.push({status:0,len:0,ok:false,detail:'ERR '+String(e&&e.message)}); }
    await new Promise(r=>setTimeout(r,2000));
  }
  ifr.remove(); return JSON.stringify(out);
})()`;
  try {
    const r = await cdp.send('Runtime.evaluate', { expression: code, returnByValue: true, awaitPromise: true, timeout: 200000 });
    if (r.exceptionDetails) throw new Error('页面异常: ' + JSON.stringify(r.exceptionDetails).slice(0, 200));
    return JSON.parse(r.result.value);
  } finally { cdp.close(); }
}

/** 取浏览器当前会话（cookie / localStorage / sessionStorage / 页面 URL） */
async function pageSession() {
  if (proxycliAvailable()) return proxycliPageSession();
  const cdp = await cdpForTiktokPage();
  try {
    const r = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify({cookie:document.cookie,url:location.href,
        local:Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])),
        session:Object.fromEntries(Object.keys(sessionStorage).map(k=>[k,sessionStorage.getItem(k)]))})`,
      returnByValue: true,
    });
    return JSON.parse(r.result.value);
  } finally { cdp.close(); }
}

/** 让页面 SDK 自己签一次这个 raw，从 CDP 网络事件里抓回最终 URL（作为「已被服务端接受」的对照） */
async function pageSigned(raw, path_) {
  if (proxycliAvailable()) return proxycliPageSigned(raw, path_);
  const cdp = await cdpForTiktokPage();
  const seen = [];
  const onMsg = (e) => {
    let m; try { m = JSON.parse(e.data); } catch (x) { return; }
    if (m.method === 'Network.requestWillBeSent' && m.params.request.url.indexOf(path) !== -1) seen.push(m.params.request.url);
  };
  cdp.ws.addEventListener('message', onMsg);
  try {
    await cdp.send('Network.enable', {});
    await cdp.send('Runtime.evaluate', {
      expression: `fetch('https://www.tiktok.com${path}?${raw}',{headers:{'Content-Type':'application/json'}}).then(r=>r.text()).then(t=>t.length).catch(e=>'ERR '+e.message)`,
      returnByValue: true, awaitPromise: true, timeout: 60000,
    });
    await new Promise(r => setTimeout(r, 2500));
    return seen.pop() || null;
  } finally { cdp.close(); }
}

/** 取一份完整响应体（只在确需读业务数据时用；会回传大 body） */
async function fetchBody(url) {
  if (proxycliAvailable()) {
    const fn = `async () => btoa(unescape(encodeURIComponent(await (async () => {
      document.querySelectorAll('iframe').forEach(f => { try { f.remove(); } catch (e) {} });
      const ifr = document.createElement('iframe'); ifr.style.display = 'none'; document.body.appendChild(ifr);
      await new Promise(r => setTimeout(r, 500));
      const f = ifr.contentWindow.fetch.bind(ifr.contentWindow);
      const res = await f(${JSON.stringify(url)}, { headers: { 'Content-Type': 'application/json' } });
      const tx = await res.text(); ifr.remove(); return tx;
    })())))`;
    return proxycliEval(fn, 120000);
  }
  const cdp = await cdpForTiktokPage();
  try {
    const r = await cdp.send('Runtime.evaluate', {
      expression: `(async()=>{
        const ifr=document.createElement('iframe'); ifr.style.display='none'; document.body.appendChild(ifr);
        await new Promise(r=>{ifr.onload=r;ifr.src='about:blank';setTimeout(r,3000)});
        const f=ifr.contentWindow.fetch.bind(ifr.contentWindow);
        const res=await f(${JSON.stringify(url)},{headers:{'Content-Type':'application/json'}});
        const tx=await res.text(); ifr.remove(); return tx;
      })()`,
      returnByValue: true, awaitPromise: true, timeout: 60000,
    });
    return r.result.value;
  } finally { cdp.close(); }
}

module.exports = { RAW_POST, runOracle, pageSession, pageSigned, fetchBody, realQueryUrl, Cdp, PAGE_CLASSIFY, proxycliAvailable };
