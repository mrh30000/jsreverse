// const-id.js (设备指纹/lid/param) 离线 harness —— 目标是把真实 `param` 录下来。
//
// 手法与 greenseer 那套一致: DOM stub + 注入模块缓存暴露点。
// 关键: XHR/fetch 全部换成"录制器", 不真发请求; SDK 自己还会把 param 挂到 window._constID_param。
// 用法: node dx_constid.js
const fs = require("node:fs");
const vm = require("node:vm");

const RAW = "dingxiang/sources/const-id.js.orig";
const APPKEY = "90762f230adee6af3957d9a029269461";
const SERVER = "https://captcha.gdtspace.com/udid/c1";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const reqs = [];

function mkEl(name) {
  const el = {
    nodeName: String(name || "div").toUpperCase(),
    style: {},
    dataset: {},
    children: [],
    childNodes: [],
    innerHTML: "",
    textContent: "",
    src: "",
    width: 0,
    height: 0,
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
    hasAttribute() {
      return false;
    },
    appendChild(c) {
      this.children.push(c);
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
    cloneNode() {
      return mkEl(name);
    },
    focus() {},
    blur() {},
    remove() {},
    getBoundingClientRect() {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      };
    },
  };
  return el;
}

// ---- 真实指纹注入 -------------------------------------------------------
// 来自活浏览器 about:blank 采集(避开 JSVMP 陷阱), 存 artifacts/fp-real.json。
// 文章口径: mimeTypes/canPlayType 是死值, plugins 可死值, webgl 每个浏览器不同。
let FP = {};
try {
  FP = JSON.parse(fs.readFileSync("dingxiang/artifacts/fp-real.json", "utf8"));
} catch {
  /* 没采到就用空桩 */
}

const GW = FP.webgl || {};
const REAL_GL = {
  RENDERER: GW.RENDERER,
  VENDOR: GW.VENDOR,
  VERSION: GW.VERSION,
  SHADING_LANGUAGE_VERSION: GW.SHADING,
  UNMASKED_RENDERER_WEBGL: GW.RENDERER,
  UNMASKED_VENDOR_WEBGL: GW.VENDOR,
};

// GL 常量是数字, SDK 拿数字再回查 getParameter -> 用双向表把名字接回去
const ENUM = new Map();
const BY_VAL = new Map();
let nextEnum = 8192;
function enumOf(n) {
  if (!ENUM.has(n)) {
    ENUM.set(n, nextEnum);
    BY_VAL.set(nextEnum, n);
    nextEnum += 1;
  }
  return ENUM.get(n);
}
const IS_ENUM = (k) => typeof k === "string" && /^[A-Z][A-Z0-9_]*$/.test(k);
const CAN_PLAY = FP.canPlayType || {};

function mkGl(canvas) {
  const t = {};
  return new Proxy(t, {
    get: (tt, k) => {
      if (k === "canvas") return canvas;
      if (k === "getSupportedExtensions")
        return () =>
          String(GW.exts || "")
            .split(";")
            .filter(Boolean);
      if (k === "getExtension")
        return (n) =>
          n === "WEBGL_debug_renderer_info"
            ? new Proxy(
                {},
                { get: (_t, b) => (IS_ENUM(b) ? enumOf(b) : undefined) },
              )
            : null;
      if (k === "getParameter")
        return (v) => {
          const n = BY_VAL.get(v);
          if (n && REAL_GL[n] !== undefined) return REAL_GL[n];
          if (n === "SCISSOR_BOX" || n === "VIEWPORT")
            return [0, 0, canvas.width || 1, canvas.height || 1];
          if (n === "MAX_TEXTURE_SIZE" || n === "MAX_VERTEX_ATTRIBS")
            return 16384;
          return 0;
        };
      if (k === "getShaderPrecisionFormat")
        return () => ({ rangeMin: 127, rangeMax: 127, precision: 23 });
      if (IS_ENUM(k)) return enumOf(k);
      if (k in tt) return tt[k];
      return () => undefined; // 其余 GL 调用一律吞掉: 采集器只要常量与字符串
    },
    set: (tt, k, v) => {
      tt[k] = v;
      return true;
    },
  });
}

function mk2d(canvas) {
  const t = {};
  return new Proxy(t, {
    get: (tt, k) => {
      if (k === "canvas") return canvas;
      if (k === "toDataURL") return () => FP.canvas2d || "";
      if (k === "measureText") return () => ({ width: 42 });
      if (k === "getImageData")
        return (_x, _y, w, h) => ({
          data: new Uint8ClampedArray(Math.max(1, w * h * 4)),
        });
      if (k === "createLinearGradient") return () => ({ addColorStop() {} });
      if (k in tt) return tt[k];
      return () => undefined;
    },
    set: (tt, k, v) => {
      tt[k] = v;
      return true;
    },
  });
}

function attachCanvas(el) {
  el.width = 300;
  el.height = 150;
  el.getContext = (kind) => (/webgl/i.test(String(kind)) ? mkGl(el) : mk2d(el));
  el.toDataURL = () => FP.canvas2d || "";
  return el;
}

function attachMedia(el) {
  el.canPlayType = (t) => {
    const s = String(t);
    if (/ogg/.test(s)) return CAN_PLAY.ogg || "";
    if (/mp4/.test(s)) return CAN_PLAY.mp4 || "";
    if (/webm/.test(s)) return CAN_PLAY.webm || "";
    return "";
  };
  return el;
}

// navigator.plugins / mimeTypes: 还原成可遍历 array-like(采集器读 name/filename/description 并下钻)
function parsePlugins() {
  const list = (FP.plugins || []).map((raw) => {
    const [name, filename, description, types] = String(raw).split("|");
    const mimes = String(types || "")
      .split(",")
      .filter(Boolean)
      .map((s) => {
        const [type, suffixes] = s.split(":");
        return { type, suffixes, description: name, enabledPlugin: null };
      });
    const p = { name, filename, description, length: mimes.length };
    mimes.forEach((m, i) => {
      m.enabledPlugin = p;
      p[i] = m;
    });
    p.item = (i) => mimes[i] || null;
    p.namedItem = (n) => mimes.find((m) => m.type === n) || null;
    return p;
  });
  list.item = (i) => list[i] || null;
  list.namedItem = (n) => list.find((p) => p.name === n) || null;
  list.refresh = () => {};
  return list;
}

function parseMimeTypes() {
  const list = (FP.mimeTypes || []).map((raw) => {
    const [name, type, suffixes, description] = String(raw).split("|");
    return {
      name: name === "undefined" ? "" : name,
      type,
      suffixes,
      description,
    };
  });
  list.item = (i) => list[i] || null;
  list.namedItem = (n) => list.find((m) => m.type === n) || null;
  return list;
}

function makeWindow() {
  const doc = {
    createElement: (t) =>
      /canvas/i.test(String(t))
        ? attachCanvas(mkEl(t))
        : /audio|video/i.test(String(t))
          ? attachMedia(mkEl(t))
          : mkEl(t),
    createTextNode: mkEl,
    documentElement: mkEl("html"),
    body: mkEl("body"),
    head: mkEl("head"),
    getElementsByTagName: (t) =>
      String(t).toLowerCase() === "script" ? [] : [mkEl()],
    getElementById: () => null,
    getElementsByName: () => [],
    querySelector: () => null,
    querySelectorAll: () => [],
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
    createDocumentFragment: () => mkEl(),
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
    plugins: parsePlugins(),
    mimeTypes: parseMimeTypes(),
  };
  const w = {};
  const timers = [];
  Object.assign(w, {
    window: w,
    self: w,
    top: w,
    parent: w,
    frames: w,
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
    // 立即执行的定时器: SDK 用 setTimeout 做轮询/异步, 同步跑掉才能走完流程
    setTimeout: (f, t) => {
      timers.push([f, t]);
      try {
        if (typeof f === "function") f();
      } catch (e) {
        w.__err = String(e.message);
      }
      return timers.length;
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
    localStorage: {
      getItem: () => null,
      setItem() {},
      removeItem() {},
      key: () => null,
      length: 0,
    },
    sessionStorage: {
      getItem: () => null,
      setItem() {},
      removeItem() {},
      key: () => null,
      length: 0,
    },
    Image: () => mkEl("img"),
    console,
    XMLHttpRequest: function () {
      const rec = { method: "", url: "", headers: {}, body: null };
      reqs.push(rec);
      this.open = (m, u) => {
        rec.method = m;
        rec.url = u;
      };
      this.setRequestHeader = (k, v) => {
        rec.headers[k] = v;
      };
      this.getAllResponseHeaders = () => "";
      this.getResponseHeader = () => null;
      this.addEventListener = (t, f) => {
        (this._l = this._l || {})[t] = f;
      };
      this.send = (b) => {
        rec.body = b;
        // 不回数据: 只要求出参, 网络留给真实 curl 复放
        setTimeout(() => {
          try {
            if (typeof this.onreadystatechange === "function")
              this.onreadystatechange();
          } catch {
            /* noop */
          }
        }, 0);
      };
      this.readyState = 4;
      this.status = 0;
      this.responseText = "";
    },
    fetch: (u, o) => {
      reqs.push({
        method: "FETCH",
        url: String((u && u.url) || u),
        headers: (o || {}).headers || {},
        body: (o || {}).body || null,
      });
      return Promise.resolve({
        ok: false,
        status: 0,
        json: () => ({}),
        text: () => "",
      });
    },
  });
  w.globalThis = w;
  return w;
}

function load() {
  const raw = fs.readFileSync(RAW, "utf8");
  const src = raw.replace("h.m=t,h[", "h.m=t,globalThis.__mods=h,h[");
  if (!src.includes("__mods=h"))
    throw new Error("模块缓存注入点没命中, 检查 const-id 版本");
  const win = makeWindow();
  const ctx = vm.createContext(win);
  // UMD 形参 (r,e) 是两张字符串表
  const tblIdx = raw.lastIndexOf("}([");
  try {
    vm.runInContext(src, ctx, { filename: "const-id.js", timeout: 15000 });
  } catch (e) {
    console.error("[run 抛错]", e.message);
  }
  return { win, mods: win.__mods, tablesHint: tblIdx };
}

if (require.main === module) {
  const { win, mods } = load();
  console.log(
    "模块缓存:",
    mods
      ? Object.keys(mods.c || {}).length +
          " 个已执行, " +
          Object.keys(mods.m).length +
          " 个 factory"
      : "未拿到",
  );
  console.log(
    "window 上新增键:",
    Object.getOwnPropertyNames(win)
      .filter((k) => /constID|ConstID|_dx|ts$/i.test(k))
      .join(","),
  );
  const CI = win.ConstID;
  console.log("ConstID 类型:", typeof CI);
  if (typeof CI === "function") {
    try {
      const inst = new CI({ appKey: APPKEY, server: SERVER });
      console.log(
        "实例化 ok, 实例键:",
        Object.getOwnPropertyNames(inst).join(","),
      );
      setTimeout(() => {}, 0);
    } catch (e) {
      console.log("实例化失败:", e.message);
    }
  }
  console.log("\n=== 录到的请求 ===");
  for (const r of reqs) {
    console.log(`${r.method} ${String(r.url).slice(0, 120)}`);
    for (const [k, v] of Object.entries(r.headers))
      console.log(`   header ${k}: ${String(v).slice(0, 160)}`);
    if (r.body) console.log(`   body: ${String(r.body).slice(0, 200)}`);
  }
  console.log(
    "\nwindow._constID_param =",
    JSON.stringify(String(win._constID_param || "").slice(0, 200)),
  );
}

module.exports = { load, makeWindow, reqs };
