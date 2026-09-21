/**
 * TikTok 离线补环境：为 webmssdk 提供一个「够用」的浏览器式全局对象。
 *
 * 设计原则（对应 web-js-env-patcher）：
 * - 只补 SDK 真正触达的对象，不铺一整套 DOM；
 * - 关键指纹值来自真实浏览器 dump（见 tiktok/artifacts/mssdk-dump.json），保证与线上一致；
 * - 所有补丁集中在此文件，便于按报错逐条增补（诊断驱动）。
 *
 * 用法：const { createEnv } = require('./tt_env'); const env = createEnv({...});
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, '..', 'artifacts', 'mssdk-dump.json');

function loadSeed() {
  try { return JSON.parse(fs.readFileSync(SEED_PATH, 'utf8')); } catch (e) { return null; }
}

/** 造一个「像 canvas 的」对象：只实现 SDK 会调到的部分 */
function createCanvas() {
  const ctx = {
    fillRect() {}, fillText() {}, clearRect() {}, strokeText() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {},
    arc() {}, rect() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    getImageData() { return { data: new Uint8ClampedArray(4), width: 1, height: 1 }; },
    putImageData() {}, createImageData() { return { data: new Uint8ClampedArray(4), width: 1, height: 1 }; },
    measureText() { return { width: 10 }; },
    setTransform() {}, drawImage() {},
  };
  const gl = {
    getExtension(name) {
      if (name === 'WEBGL_debug_renderer_info') {
        return { UNMASKED_VENDOR_WEBGL: 0x9245, UNMASKED_RENDERER_WEBGL: 0x9246 };
      }
      return null;
    },
    getParameter(p) {
      const seed = loadSeed();
      const w = (seed && seed.extra && seed.extra.webglVendor) || 'Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)';
      if (p === 0x9245) return w.split('|')[0];
      if (p === 0x9246) return w.split('|')[1];
      if (p === 0x1F00) return 'WebKit';
      if (p === 0x1F01) return 'WebKit WebGL';
      if (p === 0x1F02) return 'WebGL 1.0 (OpenGL ES 2.0 Chromium)';
      return '';
    },
    getSupportedExtensions() { return ['WEBGL_debug_renderer_info']; },
    createBuffer() { return {}; }, bindBuffer() {}, bufferData() {},
    enable() {}, disable() {}, clearColor() {}, viewport() {}, clear() {}, flush() {}, finish() {},
  };
  const canvas = {
    width: 300, height: 150,
    getContext(kind) { return kind === '2d' ? ctx : kind === 'webgl' || kind === 'experimental-webgl' ? gl : null; },
    toDataURL() {
      const seed = loadSeed();
      return (seed && seed.extra && seed.extra.canvasFp) || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANwAAAAeCAYAAABHenA+';
    },
    toBlob(cb) { try { cb(null); } catch (e) {} },
    style: {},
    addEventListener() {}, removeEventListener() {},
    getBoundingClientRect() { return { x: 0, y: 0, width: 300, height: 150, top: 0, left: 0, right: 300, bottom: 150 }; },
  };
  return canvas;
}

function createElement(tag) {
  tag = String(tag).toLowerCase();
  if (tag === 'canvas') return createCanvas();
  const el = {
    tagName: tag.toUpperCase(),
    nodeName: tag.toUpperCase(),
    nodeType: 1,
    style: {},
    children: [],
    childNodes: [],
    attributes: {},
    dataset: {},
    innerHTML: '',
    textContent: '',
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; },
    removeAttribute(k) { delete this.attributes[k]; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k); },
    appendChild(c) { this.children.push(c); this.childNodes.push(c); return c; },
    removeChild(c) { return c; },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    getBoundingClientRect() { return { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }; },
    getElementsByTagName() { return []; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    focus() {}, blur() {}, click() {},
    play() { return Promise.resolve(); }, pause() {},
  };
  return el;
}

/**
 * @param {object} opts
 * @param {string} opts.url        页面 URL（影响 location / origin）
 * @param {object} opts.mssdkConfig _mssdk 初始化配置（cacheOpts / _enablePathList / umode ...）
 * @param {function} opts.fetchImpl 真 fetch 实现（用于 SDK 内部上报；默认不发网络）
 * @param {object} opts.storage    初始 localStorage / sessionStorage 内容
 */
function createEnv(opts = {}) {
  const seed = loadSeed();
  const extra = (seed && seed.extra) || {};
  const pageUrl = opts.url || 'https://www.tiktok.com/';
  const parsed = new URL(pageUrl);

  const listeners = Object.create(null);
  const timers = new Set();

  const win = Object.create(null);

  // --- 基础全局 ---
  win.self = win;
  win.window = win;
  win.top = win;
  win.parent = win;
  win.globalThis = win;
  win.frames = win;
  win.length = 0;
  win.name = '';
  win.closed = false;
  win.opener = null;
  win.isSecureContext = true;
  win.origin = parsed.origin;
  win.devicePixelRatio = extra.devicePixelRatio || 1;
  win.innerWidth = 1920;
  win.innerHeight = 947;
  win.outerWidth = 1920;
  win.outerHeight = 1080;
  win.scrollX = 0; win.scrollY = 0;
  win.pageXOffset = 0; win.pageYOffset = 0;
  win.screenX = 0; win.screenY = 0;
  win.locationbar = { visible: true };
  win.menubar = { visible: true };
  win.personalbar = { visible: true };
  win.scrollbars = { visible: true };
  win.statusbar = { visible: true };
  win.toolbar = { visible: true };
  win.status = '';

  // --- location / history / navigator / screen ---
  win.location = {
    href: pageUrl,
    origin: parsed.origin,
    protocol: parsed.protocol,
    host: parsed.host,
    hostname: parsed.hostname,
    port: parsed.port,
    pathname: parsed.pathname,
    search: parsed.search,
    hash: '',
    reload() {}, replace() {}, assign() {}, toString() { return pageUrl; },
  };
  win.history = {
    length: extra.historyLen || 3,
    state: null,
    scrollRestoration: 'auto',
    pushState() {}, replaceState() {}, back() {}, forward() {}, go() {},
  };
  win.screen = {
    width: (extra.screen && extra.screen.w) || 1920,
    height: (extra.screen && extra.screen.h) || 1080,
    availWidth: 1920, availHeight: 1040,
    colorDepth: (extra.screen && extra.screen.cd) || 24,
    pixelDepth: (extra.screen && extra.screen.cd) || 24,
    availLeft: 0, availTop: 0,
    orientation: { type: 'landscape-primary', angle: 0, onchange: null },
  };
  win.navigator = {
    userAgent: extra.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
    appCodeName: 'Mozilla',
    appName: 'Netscape',
    appVersion: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
    platform: extra.platform || 'Win32',
    vendor: extra.vendor || 'Google Inc.',
    vendorSub: '',
    productSub: '20030107',
    product: 'Gecko',
    language: (extra.language) || 'zh-CN',
    languages: extra.languages || ['zh-CN', 'zh', 'en-US', 'en'],
    onLine: true,
    cookieEnabled: true,
    doNotTrack: null,
    hardwareConcurrency: extra.hardwareConcurrency || 16,
    deviceMemory: 8,
    maxTouchPoints: 0,
    webdriver: false,
    plugins: { length: 0, item: () => null, namedItem: () => null, refresh() {} },
    mimeTypes: { length: 0, item: () => null, namedItem: () => null },
    userAgentData: undefined,
    sendBeacon() { return true; },
    javaEnabled() { return false; },
    getBattery() { return Promise.resolve({ charging: true, level: 1, chargingTime: 0, dischargingTime: Infinity }); },
    connection: { effectiveType: '4g', rtt: 50, downlink: 10, saveData: false },
  };

  // --- storage ---
  function makeStorage(init) {
    const map = Object.assign(Object.create(null), init || {});
    return {
      get length() { return Object.keys(map).length; },
      key(i) { return Object.keys(map)[i] ?? null; },
      getItem(k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; },
      setItem(k, v) { map[k] = String(v); },
      removeItem(k) { delete map[k]; },
      clear() { for (const k of Object.keys(map)) delete map[k]; },
    };
  }
  win.localStorage = makeStorage(opts.storage && opts.storage.local);
  win.sessionStorage = makeStorage(opts.storage && opts.storage.session);

  // --- timer / 事件 ---
  win.setTimeout = (fn, ms) => { const t = setTimeout(fn, ms); timers.add(t); return t; };
  win.clearTimeout = (t) => { timers.delete(t); return clearTimeout(t); };
  win.setInterval = (fn, ms) => { const t = setInterval(fn, ms); timers.add(t); return t; };
  win.clearInterval = (t) => { timers.delete(t); return clearInterval(t); };
  win.requestAnimationFrame = (fn) => win.setTimeout(() => fn(Date.now()), 16);
  win.cancelAnimationFrame = (t) => win.clearTimeout(t);
  win.requestIdleCallback = (fn) => win.setTimeout(() => fn({ didTimeout: false, timeRemaining: () => 50 }), 1);
  win.cancelIdleCallback = (t) => win.clearTimeout(t);
  win.queueMicrotask = (fn) => Promise.resolve().then(fn);
  win.addEventListener = (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); };
  win.removeEventListener = (type, fn) => {
    if (listeners[type]) listeners[type] = listeners[type].filter(f => f !== fn);
  };
  win.dispatchEvent = () => true;
  win.postMessage = () => {};
  win.open = () => null;
  win.close = () => {};
  win.focus = () => {};
  win.blur = () => {};
  win.alert = () => {};
  win.confirm = () => false;
  win.prompt = () => null;
  win.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  win.getComputedStyle = () => ({ getPropertyValue: () => '' });
  win.btoa = (s) => Buffer.from(String(s), 'binary').toString('base64');
  win.atob = (s) => Buffer.from(String(s), 'base64').toString('binary');
  win.crypto = {
    getRandomValues(arr) {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    },
    randomUUID() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); },
    subtle: undefined,
  };
  win.performance = {
    now: () => Number(process.hrtime.bigint() / 1000n) / 1000,
    timeOrigin: Date.now() - 1000,
    timing: { navigationStart: Date.now() - 1000, domLoading: Date.now() - 500 },
    getEntriesByType: () => [],
    getEntriesByName: () => [],
    mark() {}, measure() {}, clearMarks() {}, clearMeasures() {},
    memory: { jsHeapSizeLimit: 4294705152, totalJSHeapSize: 30000000, usedJSHeapSize: 20000000 },
  };

  // --- document ---
  const htmlEl = createElement('html');
  const headEl = createElement('head');
  const bodyEl = createElement('body');
  const documentEl = {
    nodeType: 9,
    documentElement: htmlEl,
    head: headEl,
    body: bodyEl,
    title: 'TikTok - Make Your Day',
    URL: pageUrl,
    documentURI: pageUrl,
    domain: parsed.hostname,
    referrer: '',
    readyState: 'complete',
    visibilityState: 'visible',
    hidden: false,
    fullscreenElement: null,
    fullscreenEnabled: true,
    cookie: opts.cookie || '',
    characterSet: 'UTF-8',
    charset: 'UTF-8',
    contentType: 'text/html',
    compatMode: 'CSS1Compat',
    currentScript: null,
    scripts: [],
    styleSheets: [],
    createElement,
    createElementNS: (ns, tag) => createElement(tag),
    createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }),
    createDocumentFragment: () => createElement('fragment'),
    createEvent: () => ({ initEvent() {}, initCustomEvent() {} }),
    getElementById: () => null,
    getElementsByTagName: () => [],
    getElementsByClassName: () => [],
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(type, fn) { (listeners['doc:' + type] = listeners['doc:' + type] || []).push(fn); },
    removeEventListener() {},
    dispatchEvent: () => true,
    hasFocus: () => true,
    exitFullscreen() { return Promise.resolve(); },
    write() {}, writeln() {}, open() {}, close() {},
  };
  win.document = documentEl;
  win.HTMLCanvasElement = function HTMLCanvasElement() {};

  // --- 网络对象（默认不发网络） ---
  function FakeXHR() {
    this.readyState = 0;
    this.status = 0;
    this.responseText = '';
    this.response = '';
    this.responseType = '';
    this.withCredentials = true;
    this.onreadystatechange = null;
    this.onload = null;
    this.onerror = null;
    this.onloadend = null;
    this.onabort = null;
    this.onloadstart = null;
    this.ontimeout = null;
    this.onprogress = null;
    this.upload = {};
  }
  FakeXHR.prototype.open = function (method, url) {
    this.readyState = 1;
    this._method = String(method || 'GET').toUpperCase();
    this._url = String(url || '');
  };
  FakeXHR.prototype.setRequestHeader = function (k, v) {
    this._headers = this._headers || {};
    this._headers[k] = v;
  };
  FakeXHR.prototype.getAllResponseHeaders = function () { return ''; };
  FakeXHR.prototype.getResponseHeader = function () { return null; };
  FakeXHR.prototype.abort = function () {};
  FakeXHR.prototype.addEventListener = function () {};
  FakeXHR.prototype.removeEventListener = function () {};
  const xhrImpl = opts.xhrImpl || null;
  FakeXHR.prototype.send = function (body) {
    const self = this;
    const finish = (status, text, headers) => {
      self.readyState = 4;
      self.status = status;
      self.responseText = text;
      self.response = self.responseType === 'json' ? safeJson(text) : text;
      self._headers = headers || '';
      try { if (typeof self.onreadystatechange === 'function') self.onreadystatechange(); } catch (e) {}
      try { if (typeof self.onload === 'function') self.onload(); } catch (e) {}
      try { if (typeof self.onloadend === 'function') self.onloadend(); } catch (e) {}
    };
    if (xhrImpl && this._url) {
      Promise.resolve(xhrImpl(this._method || 'GET', this._url, this._headers || {}, body))
        .then((r) => finish(r.status, r.text, r.headers))
        .catch(() => finish(0, '', ''));
      return;
    }
    win.setTimeout(() => finish(200, '{}', ''), 0);
  };
  win.XMLHttpRequest = FakeXHR;

  const fetchImpl = opts.fetchImpl || (() => Promise.resolve(makeFakeResponse('{}', 200, 'about:blank')));
  win.fetch = function (input, init) {
    const u = typeof input === 'string' ? input : (input && input.url) || '';
    return Promise.resolve(fetchImpl(u, init));
  };

  function safeJson(t) { try { return JSON.parse(t); } catch (e) { return null; } }
  win.Headers = class Headers {
    constructor(init) { this._m = new Map(); if (init) Object.entries(init).forEach(([k, v]) => this.set(k, v)); }
    set(k, v) { this._m.set(String(k).toLowerCase(), String(v)); }
    append(k, v) { this.set(k, v); }
    get(k) { return this._m.has(String(k).toLowerCase()) ? this._m.get(String(k).toLowerCase()) : null; }
    has(k) { return this._m.has(String(k).toLowerCase()); }
    forEach(fn) { this._m.forEach((v, k) => fn(v, k, this)); }
    entries() { return this._m.entries(); }
  };
  win.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = (init.method || 'GET').toUpperCase();
      this.headers = new win.Headers(init.headers);
      this.body = init.body;
      this.credentials = init.credentials || 'same-origin';
      this.mode = init.mode || 'cors';
    }
  };
  win.Response = class Response {
    constructor(body, init = {}) { this._body = body; this.status = init.status || 200; this.url = init.url || ''; this.headers = new win.Headers(init.headers); this.ok = this.status >= 200 && this.status < 300; }
    text() { return Promise.resolve(this._body); }
    json() { return Promise.resolve(JSON.parse(this._body)); }
    clone() { return new win.Response(this._body, { status: this.status, url: this.url }); }
  };
  win.Blob = class Blob { constructor(parts) { this._p = parts; } get size() { return 0; } };
  win.URL = URL;
  win.URLSearchParams = URLSearchParams;
  win.TextEncoder = TextEncoder;
  win.TextDecoder = TextDecoder;
  win.MutationObserver = class { observe() {} disconnect() {} takeRecords() { return []; } };
  win.IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} };
  win.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  win.PerformanceObserver = class { observe() {} disconnect() {} };
  win.RTCPeerConnection = class { createDataChannel() { return {}; } createOffer() { return Promise.resolve({}); } setLocalDescription() { return Promise.resolve(); } close() {} };
  win.webkitRTCPeerConnection = win.RTCPeerConnection;
  win.Worker = class { postMessage() {} terminate() {} addEventListener() {} };
  win.SharedWorker = win.Worker;
  win.MessageChannel = class { constructor() { this.port1 = { postMessage() {}, addEventListener() {} }; this.port2 = this.port1; } };
  win.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
  win.Event = class { constructor(type, init) { this.type = type; this.bubbles = !!(init && init.bubbles); } };
  win.Origin = win.location.origin;

  // --- _mssdk（SDK 启动强依赖） ---
  if (opts.mssdkConfig) {
    const cfg = JSON.parse(JSON.stringify(opts.mssdkConfig));
    if (cfg._enablePathList && !cfg._enablePathListRegex) {
      cfg._enablePathListRegex = cfg._enablePathList.map(p => {
        const esc = String(p).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        return new RegExp(esc);
      });
    }
    win._mssdk = cfg;
  }
  win.MSSDK_INITIALIZED = true;
  win.$SECURE_VERSION = '0.2.11';
  win.$SECURE_REGION = 'eu';
  win.$SECURE_MONITOR = { setContext() {}, setWebId() {}, setEnv() {}, accountApiSlardar() {} };

  return win;
}

function makeFakeResponse(body, status, url) {
  return {
    status: status || 200,
    ok: (status || 200) < 300,
    url: url || '',
    headers: { get: () => null, forEach: () => {}, entries: () => [][Symbol.iterator]() },
    text: () => Promise.resolve(body == null ? '' : String(body)),
    json: () => Promise.resolve(JSON.parse(body == null ? '{}' : String(body))),
    clone() { return makeFakeResponse(body, status, url); },
  };
}

module.exports = { createEnv, createCanvas, createElement, makeFakeResponse };