// 离线 harness: 用 DOM stub 跑 greenseer.js.orig, 让真 SDK 自己解析运行时 key。
// 注入两处: UMD 形参 n/e/r(三张字符串表) -> globalThis.__T; webpack 模块缓存 -> globalThis.__mods。
// 复用: const {cache, tables, findEncrypt} = require('./dx_harness.js')
const fs = require("node:fs");
const vm = require("node:vm");

const RAW = "dingxiang/sources/greenseer.js.orig";

const mkEl = () => ({
  style: {},
  dataset: {},
  children: [],
  childNodes: [],
  innerHTML: "",
  textContent: "",
  offsetWidth: 0,
  offsetHeight: 0,
  clientWidth: 0,
  clientHeight: 0,
  scrollLeft: 0,
  scrollTop: 0,
  setAttribute() {},
  getAttribute() {
    return null;
  },
  removeAttribute() {},
  appendChild(c) {
    return c;
  },
  removeChild(c) {
    return c;
  },
  insertBefore(c) {
    return c;
  },
  addEventListener() {},
  removeEventListener() {},
  attachEvent() {},
  detachEvent() {},
  getElementsByTagName() {
    return [];
  },
  getElementsByName() {
    return [];
  },
  hasAttribute() {
    return false;
  },
  cloneNode() {
    return mkEl();
  },
  focus() {},
  blur() {},
  getBoundingClientRect() {
    return { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0 };
  },
});

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function load() {
  const src = fs
    .readFileSync(RAW, "utf8")
    .replace(
      "!function(n,e,r){!function(t){",
      "!function(n,e,r){globalThis.__T={n:n,e:e,r:r};!function(t){",
    )
    .replace("i.m=t,i.c=u,", "i.m=t,i.c=u,globalThis.__mods=i,");
  for (const probe of ["__T={n:n", "__mods=i"]) {
    if (!src.includes(probe))
      throw new Error(`注入点没命中: ${probe} — 检查 bundle 版本`);
  }

  const doc = {
    createElement: mkEl,
    createTextNode: mkEl,
    documentElement: mkEl(),
    body: mkEl(),
    head: mkEl(),
    getElementsByTagName: () => [mkEl()],
    getElementById: () => null,
    getElementsByName: () => [],
    addEventListener() {},
    removeEventListener() {},
    attachEvent() {},
    readyState: "complete",
    cookie: "",
    referrer: "https://www.hb56.com/",
    all: [],
    scripts: [],
    title: "hb56",
    hasFeature: () => false,
    createDocumentFragment: mkEl,
  };
  const nav = {
    userAgent: UA,
    appName: "Netscape",
    appVersion:
      "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    platform: "Win32",
    language: "zh-CN",
    languages: ["zh-CN", "en"],
    cookieEnabled: true,
    vendor: "Google Inc.",
    webdriver: false,
    doNotTrack: null,
    hardwareConcurrency: 8,
    maxTouchPoints: 0,
    mimeTypes: { length: 0, item: () => null },
    plugins: { length: 0, item: () => null },
  };
  const win = {};
  Object.assign(win, {
    window: win,
    self: win,
    top: win,
    parent: win,
    frames: win,
    document: doc,
    navigator: nav,
    location: {
      href: "https://www.hb56.com/Login.aspx?type=pw",
      protocol: "https:",
      host: "www.hb56.com",
      hostname: "www.hb56.com",
      pathname: "/Login.aspx",
      search: "?type=pw",
      hash: "",
      origin: "https://www.hb56.com",
      reload() {},
      replace() {},
      assign() {},
    },
    screen: {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: 24,
    },
    innerWidth: 1920,
    innerHeight: 929,
    outerWidth: 1936,
    outerHeight: 1048,
    devicePixelRatio: 1,
    setTimeout: (f) => {
      try {
        if (typeof f === "function") f();
      } catch {
        /* 探测代码 */
      }
      return 0;
    },
    setInterval: () => 0,
    clearTimeout() {},
    clearInterval() {},
    requestAnimationFrame: () => 0,
    addEventListener() {},
    removeEventListener() {},
    attachEvent() {},
    detachEvent() {},
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    matchMedia: () => ({ matches: false, addListener() {} }),
    chrome: { app: { isInstalled: false }, runtime: {} },
    crypto: require("node:crypto"),
    performance: { now: () => Date.now() },
    history: { length: 1, pushState() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {} },
    Image: () => mkEl(),
    XMLHttpRequest: () => ({
      open() {},
      send() {},
      setRequestHeader() {},
      addEventListener() {},
    }),
    fetch: () => Promise.resolve({ json: () => ({}), text: () => "" }),
    console,
  });
  win.globalThis = win;

  const ctx = vm.createContext(win);
  try {
    vm.runInContext(src, ctx, { filename: "greenseer.js", timeout: 8000 });
  } catch (e) {
    console.error("[run 抛错, 继续用已注册模块]", e.message);
  }

  const mods = win.__mods;
  if (!mods) throw new Error("拿不到 webpack 模块缓存");
  return { win, mods, cache: mods.c || {}, tables: win.__T };
}

// 遍历所有模块导出, 找出带 encrypt_* 的对象
function findEncrypt(cache) {
  const out = [];
  const seen = new Set();
  const walk = (obj, path, depth) => {
    if (!obj || depth > 3 || typeof obj !== "object") return;
    if (seen.has(obj)) return;
    seen.add(obj);
    let ks = [];
    try {
      ks = Object.keys(obj);
    } catch {
      return;
    }
    if (ks.some((k) => /^encrypt_/.test(k))) out.push({ path, keys: ks, obj });
    for (const k of ks.slice(0, 60)) {
      try {
        walk(obj[k], `${path}.${k}`, depth + 1);
      } catch {
        /* getter 抛错 */
      }
    }
  };
  for (const [id, m] of Object.entries(cache))
    walk(m.exports, `mods[${id}]`, 0);
  return out;
}

if (require.main === module) {
  const { cache, tables } = load();
  console.log(
    `模块数=${Object.keys(cache).length} 表长度 n=${tables.n.length} e=${tables.e.length} r=${tables.r.length}`,
  );
  for (const f of findEncrypt(cache)) {
    console.log(`\n### ${f.path} (${f.keys.length} keys)`);
    console.log(f.keys.filter((k) => /^encrypt_/.test(k)).join("\n"));
    for (const k of f.keys.filter((x) => /^encrypt_/.test(x))) {
      console.log(`\n// ${k}`);
      console.log(String(f.obj[k]));
    }
  }
}

module.exports = { load, findEncrypt, mkEl, UA };
