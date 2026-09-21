/**
 * 离线签名器（补环境跑真 SDK）。
 *
 * 目标：不依赖浏览器，用 vm 加载 webmssdk 原码，调用其 SDK 入口生成
 *       X-Bogus / X-Gnarly / X-Dynosaur，并复用服务端下发的 msToken / verifyFp。
 *
 * 用法：
 *   node tiktok/solver/tt_sign.js --selftest
 *   node tiktok/solver/tt_sign.js --query "aid=1988&app_name=tiktok_web"
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createEnv, makeFakeResponse } = require('./tt_env');
const { installNativeProtect } = require('./tt_native');

const ROOT = path.join(__dirname, '..');
const SDK_PATH = path.join(ROOT, 'sources', 'webmssdk.1.0.0.417.js.orig');
const EX_PATH = path.join(ROOT, 'sources', 'webmssdk_ex.1.0.0.2865.js.orig');
const SEED_PATH = path.join(ROOT, 'artifacts', 'mssdk-dump.json');
const SESSION_PATH = path.join(ROOT, 'artifacts', 'session-dump.json');

/**
 * 读取浏览器会话材料（cookie + localStorage + sessionStorage）。
 *
 * 为什么需要它：msToken 不在算法内部生成，而是**服务端下发**后落在
 * localStorage.msToken（以及同名 cookie）里，签名时被读到 URL 上。
 * 所以离线签名必须携带这份会话：
 *   copyFromBrowser()  ⤍  session-dump.json  ⤍  new TikTokSigner({ cookie, storage })
 * 缺了 localStorage.msToken，签名里 msToken 就是空值（服务端会拒）。
 *
 * @returns {{cookie:string, local:object, session:object, ua?:string}|null}
 */
function loadSession() {
  if (!fs.existsSync(SESSION_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(SESSION_PATH, 'utf8')); } catch (e) { return null; }
}

function loadSeedConfig() {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  const cfg = seed.mssdk || {};
  return {
    length: 0,
    _sharedCache: { slardarErrs: [], ttwid: '', tt_webid: '', tt_webid_v2: '', msNewTokenList: [], coreTiming: [Date.now(), -1, -1, -1, -1, -1] },
    _enablePathList: cfg._enablePathList || [],
    _enablePathListRegex: (cfg._enablePathList || []).map(p => {
      const esc = String(p).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      return new RegExp(esc);
    }),
    umode: cfg.umode != null ? cfg.umode : 516,
    _loaderInit: true,
    cacheOpts: cfg.cacheOpts || {},
    opts: [],
    _urlRewriteRules: cfg._urlRewriteRules || [],
    pppt: 2,
    ets: -1,
  };
}

class TikTokSigner {
  constructor(opts = {}) {
    this.opts = opts;
    this.requests = [];       // 捕获 SDK 内部发出的请求（便于确认签名链路）
    this.logs = [];
  }

  init() {
    const mssdkConfig = this.opts.mssdkConfig || loadSeedConfig();
    const record = (url, method) => this.requests.push({ url, method: method || 'GET' });
    const env = createEnv({
      url: this.opts.url || 'https://www.tiktok.com/',
      mssdkConfig,
      cookie: this.opts.cookie || '',
      storage: this.opts.storage,
      fetchImpl: (url, init) => {
        record(url, init && init.method);
        const impl = this.opts.fetchImpl;
        return impl ? Promise.resolve(impl(url, init)) : makeFakeResponse('{}', 200, url);
      },
      // SDK 用 XHR 向 mssdk 后端取资源（msToken 来源）；
      // 不传 xhrImpl 时保持假响应，msToken 会为空。
      xhrImpl: this.opts.xhrImpl ? (method, url, headers, body) => {
        record(url, method);
        return this.opts.xhrImpl(method, url, headers, body);
      } : null,
    });

    // 严禁 Node 泄露：只暴露浏览器式对象 + 语言内置
    const sandbox = Object.create(null);
    for (const k of Object.keys(env)) sandbox[k] = env[k];
    sandbox.console = {
      log: (...a) => this.logs.push(['log', a.map(String).join(' ')]),
      info: (...a) => this.logs.push(['info', a.map(String).join(' ')]),
      warn: (...a) => this.logs.push(['warn', a.map(String).join(' ')]),
      error: (...a) => this.logs.push(['error', a.map(String).join(' ')]),
      debug: () => {},
      trace: () => {},
      table: () => {},
      group: () => {}, groupEnd: () => {},
      time: () => {}, timeEnd: () => {},
    };
    sandbox.globalThis = sandbox;
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.top = sandbox;
    sandbox.parent = sandbox;

    this.context = vm.createContext(sandbox, {
      name: 'tiktok-signer',
      codeGeneration: { strings: true, wasm: false },
    });
    this.sandbox = sandbox;

    const sdkSrc = fs.readFileSync(SDK_PATH, 'utf8');
    // 先装 native 保护：SDK 靠 Function.prototype.toString 判定“原生”才走包装/签名链路
    this.nativeProtect = installNativeProtect(sandbox);

    new vm.Script(sdkSrc, { filename: 'webmssdk.js' }).runInContext(this.context, { timeout: 30000 });

    this.acrawler = sandbox.byted_acrawler;
    return this;
  }

  /** 载入 webmssdk_ex（第二层 SDK，含补环境相关逻辑） */
  loadEx() {
    if (!fs.existsSync(EX_PATH)) return this;
    const src = fs.readFileSync(EX_PATH, 'utf8');
    new vm.Script(src, { filename: 'webmssdk_ex.js' }).runInContext(this.context, { timeout: 30000 });
    return this;
  }

  /**
   * 用 SDK 自己的引导配置初始化签名链路。
   * 不调用它，SDK 只会使用 2 条默认路径，不会给业务 API 追加 X-Gnarly / X-Dynosaur。
   */
  bootstrap() {
    const cfg = this.opts.mssdkConfig || loadSeedConfig();
    const c = (cfg.cacheOpts && cfg.cacheOpts['1988']) || {};
    this.initOptions = {
      aid: 1988,
      dfp: !!c.dfp,
      boe: !!c.boe,
      intercept: !!c.intercept,
      enablePathList: c.enablePathList || [],
      region: c.region || 'sg-tiktok',
      apiHost: c.apiHost || '',
      mode: c.mode != null ? c.mode : cfg.umode,
      isSDK: false,
      custom: c.custom || {},
      umode: cfg.umode,
      pppt: cfg.pppt,
      ets: cfg.ets,
    };
    this.acrawler.init(this.initOptions);
    return this;
  }

  /**
   * 离结对给定 query 出签名。
   * 做法：在补环境里发一次 fetch，让 SDK 完成签名，再捕获它最终使用的 URL。
   *
   * @param {string} query 原始 query（不含签名参数）
   * @param {string} [path] API 路径，默认推荐流
   * @returns {Promise<{url:string, params:object, msToken:string}>}
   */
  async sign(query, path) {
    const apiPath = path || '/api/recommend/item_list/';
    const raw = String(query || '').replace(/^\?/, '');
    const url = 'https://www.tiktok.com' + apiPath + '?' + raw;
    const before = this.requests.length;
    const code = `(async()=>{try{await fetch(${JSON.stringify(url)},{method:'GET',headers:{'Content-Type':'application/json'}});` +
                 `return 'ok';}catch(e){return 'ERR '+(e&&e.message);}})()`;
    const r = await vm.runInContext(code, this.context, { timeout: 20000 });
    const reqs = this.requests.slice(before);
    if (!reqs.length) throw new Error('SDK 未发出请求（fetch:' + r + '），无法取到签名 URL');
    const signed = reqs[reqs.length - 1].url;
    const params = {};
    for (const k of ['X-Bogus', 'X-Gnarly', 'X-Dynosaur', 'msToken']) {
      const m = new RegExp('[?&]' + k + '=([^&]*)').exec(signed);
      if (m) params[k] = m[1];
    }
    return { url: signed, params, msToken: params.msToken || '' };
  }

  /** 调 SDK 公开入口（当前版本只返回 X-Bogus，且线上用常量 1 占位） */
  frontierSign(query) {
    if (!this.acrawler || typeof this.acrawler.frontierSign !== 'function') {
      throw new Error('byted_acrawler.frontierSign 不可用（SDK 未初始化成功）');
    }
    const r = this.acrawler.frontierSign(String(query));
    return r;
  }

  /** 内部发出的请求（SDK 上报用） */
  capturedRequests() { return this.requests.slice(); }

  dispose() {
    this.context = null;
    this.sandbox = null;
  }
}

async function selftest() {
  const assert = require('assert');
  console.log('== 1) 构造签名器（vm + 真 SDK）');
  const sess = loadSession();
  if (sess) console.log('   会话: cookie=%d msToken(localStorage)=%d', (sess.cookie||'').length, ((sess.local||{}).msToken||'').length);
  else console.log('   ⚠️ 无 session-dump.json，msToken 将为空（先跑 dump-session.js）');
  const s = new TikTokSigner(sess ? { cookie: sess.cookie, storage: { local: sess.local, session: sess.session } } : {}).init();
  console.log('   byted_acrawler keys:', s.acrawler ? Object.keys(s.acrawler).join(',') : '(null)');
  assert.ok(s.acrawler, 'byted_acrawler 未挂载');

  console.log('== 2) frontierSign 输出结构');
  const out = s.frontierSign('aid=1988&app_name=tiktok_web&device_platform=web_pc');
  console.log('   ->', JSON.stringify(out));
  assert.ok(out && typeof out === 'object', 'frontierSign 必须返回对象');
  assert.ok(typeof out['X-Bogus'] === 'string' && out['X-Bogus'].length > 0, 'X-Bogus 必须是非空字符串');

  console.log('== 3) 两次调用应产生不同值（含随机盐）');
  const a = s.frontierSign('aid=1988&x=1')['X-Bogus'];
  const b = s.frontierSign('aid=1988&x=1')['X-Bogus'];
  console.log('   a=%s b=%s', a, b);
  assert.notStrictEqual(a, b, '签名含随机盐，两次不应完全相同');

  console.log('== 4) 输出字符集');
  const set = new Set(a.split(''));
  console.log('   charset:', Array.from(set).sort().join(''));
  assert.ok(/^[A-Za-z0-9+/=_-]+$/.test(a), 'X-Bogus 应是 base64url 风格字符集');

  console.log('\n✅ selftest 通过');

  console.log('== 5) bootstrap() 引导后离线签名（X-Gnarly / X-Dynosaur）');
  s.bootstrap();
  const signed = await s.sign('WebIdLastTime=0&aid=1988&app_name=tiktok_web&device_platform=web_pc&count=12&region=SG&user_is_login=true');
  console.log('   X-Gnarly  :', signed.params['X-Gnarly'] ? signed.params['X-Gnarly'].length + ' chars' : 'ABSENT');
  console.log('   X-Dynosaur:', signed.params['X-Dynosaur'] ? signed.params['X-Dynosaur'].length + ' chars' : 'ABSENT');
  console.log('   msToken   :', signed.params.msToken ? signed.params.msToken.length + ' chars' : 'ABSENT（缺 session-dump.json）');
  assert.ok(signed.params['X-Gnarly'], 'X-Gnarly 必须非空');
  assert.ok(signed.params['X-Dynosaur'], 'X-Dynosaur 必须非空');
  assert.strictEqual(signed.params['X-Gnarly'].length, 332, 'X-Gnarly 长度应与浏览器一致（332）');
  if (sess) assert.strictEqual(signed.params.msToken.length, 172, 'msToken 应来自会话（172 字符）');

  console.log('✅ selftest 通过');
  return s;
}

module.exports = { TikTokSigner, loadSeedConfig, loadSession, selftest, SDK_PATH, EX_PATH, SESSION_PATH };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const getArg = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? null : argv[i + 1];
  };
  try {
    if (argv.includes('--selftest') || argv.length === 0) {
      selftest().then(() => process.exit(0)).catch(e => { console.error('FAILED:', e && e.stack ? e.stack.split(String.fromCharCode(10)).slice(0, 12).join(String.fromCharCode(10)) : e); process.exit(1); });
    } else {
      const s = new TikTokSigner().init();
      const q = getArg('--query') || 'aid=1988&app_name=tiktok_web&device_platform=web_pc';
      console.log(JSON.stringify(s.frontierSign(decodeURIComponent(q))));
    }
  } catch (e) {
    console.error('FAILED:', e && e.stack ? e.stack.split('\n').slice(0, 12).join('\n') : e);
    process.exit(1);
  }
}