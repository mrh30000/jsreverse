#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { param: 'sign', apiPattern: '/api/', types: 'fetch,xhr,urlsearchparams,cookie,storage,time-random,dynamic-code,websocket,postmessage', out: '' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--param') args.param = argv[++i] || 'sign';
    else if (a === '--api-pattern') args.apiPattern = argv[++i] || '/api/';
    else if (a === '--types') args.types = argv[++i] || args.types;
    else if (a === '--out') args.out = argv[++i] || '';
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`未知参数：${a}`);
  }
  return args;
}

function usage() {
  return `用法：
  node scripts/generate_hook_templates.js --param sign --api-pattern /api/ --types fetch,xhr,cookie,storage
  node scripts/generate_hook_templates.js --param a_bogus --api-pattern /web/api --out case/hooks/hooks.js`;
}

function q(v) { return JSON.stringify(String(v)); }
function section(name, code) { return `\n// ===== ${name} =====\n${code.trim()}\n`; }

function snippets(ctx) {
  return {
    fetch: section('fetch 请求写入定位', `
(() => {
  const targetParam = ${q(ctx.param)};
  const apiKeyword = ${q(ctx.apiPattern)};
  const rawFetch = window.fetch;
  window.fetch = function patchedFetch(input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    const body = init && init.body;
    if (String(url).includes(apiKeyword) || String(url).includes(targetParam) || String(body || "").includes(targetParam)) {
      console.group("[fetch 命中]", url);
      console.log("input =", input);
      console.log("init =", init);
      console.trace("fetch 调用栈");
      console.groupEnd();
      debugger;
    }
    return rawFetch.apply(this, arguments);
  };
})();`),
    xhr: section('XMLHttpRequest 请求写入定位', `
(() => {
  const targetParam = ${q(ctx.param)};
  const apiKeyword = ${q(ctx.apiPattern)};
  const rawOpen = XMLHttpRequest.prototype.open;
  const rawSend = XMLHttpRequest.prototype.send;
  const rawSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function patchedOpen(method, url) {
    this.__reverse_method = method;
    this.__reverse_url = String(url || "");
    return rawOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.setRequestHeader = function patchedSetRequestHeader(name, value) {
    if (String(name).includes(targetParam) || String(value).includes(targetParam)) {
      console.group("[XHR Header 命中]", this.__reverse_url);
      console.log(name, value);
      console.trace("setRequestHeader 调用栈");
      console.groupEnd();
      debugger;
    }
    return rawSetHeader.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function patchedSend(body) {
    const url = this.__reverse_url || "";
    if (url.includes(apiKeyword) || url.includes(targetParam) || String(body || "").includes(targetParam)) {
      console.group("[XHR send 命中]", this.__reverse_method, url);
      console.log("body =", body);
      console.trace("send 调用栈");
      console.groupEnd();
      debugger;
    }
    return rawSend.apply(this, arguments);
  };
})();`),
    urlsearchparams: section('URLSearchParams 与 FormData 参数写入定位', `
(() => {
  const targetParam = ${q(ctx.param)};
  for (const Ctor of [window.URLSearchParams, window.FormData].filter(Boolean)) {
    for (const method of ["append", "set"]) {
      const raw = Ctor.prototype[method];
      if (typeof raw !== "function") continue;
      Ctor.prototype[method] = function patchedParamWrite(name, value) {
        if (String(name) === targetParam || String(value).includes(targetParam)) {
          console.group("[" + Ctor.name + "." + method + " 命中]", name);
          console.log("value =", value);
          console.trace("参数写入调用栈");
          console.groupEnd();
          debugger;
        }
        return raw.apply(this, arguments);
      };
    }
  }
})();`),
    cookie: section('Cookie 读写定位', `
(() => {
  const targetParam = ${q(ctx.param)};
  const desc = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
  if (!desc || !desc.set || !desc.get) return;
  Object.defineProperty(document, "cookie", {
    configurable: true,
    enumerable: desc.enumerable,
    get() {
      const value = desc.get.call(document);
      if (String(value).includes(targetParam)) console.trace("document.cookie 读取命中");
      return value;
    },
    set(value) {
      if (String(value).includes(targetParam)) {
        console.group("[cookie 写入命中]");
        console.log(value);
        console.trace("cookie 写入调用栈");
        console.groupEnd();
        debugger;
      }
      return desc.set.call(document, value);
    }
  });
})();`),
    storage: section('Storage 读写定位', `
(() => {
  const keys = [${q(ctx.param)}, "token", "device", "fingerprint"];
  for (const storageName of ["localStorage", "sessionStorage"]) {
    const storage = window[storageName];
    if (!storage) continue;
    for (const method of ["getItem", "setItem", "removeItem"]) {
      const raw = storage[method];
      storage[method] = function patchedStorage(key, value) {
        if (keys.some(k => String(key).includes(k))) {
          console.group("[" + storageName + "." + method + " 命中]", key);
          console.log("value =", value);
          console.trace("Storage 调用栈");
          console.groupEnd();
        }
        return raw.apply(this, arguments);
      };
    }
  }
})();`),
    'time-random': section('时间与随机数定位', `
(() => {
  const rawDateNow = Date.now;
  Date.now = function patchedDateNow() {
    const ret = rawDateNow.apply(this, arguments);
    console.log("[Date.now]", ret);
    console.trace("Date.now 调用栈");
    return ret;
  };
  const rawRandom = Math.random;
  Math.random = function patchedMathRandom() {
    const ret = rawRandom.apply(this, arguments);
    console.log("[Math.random]", ret);
    console.trace("Math.random 调用栈");
    return ret;
  };
  if (window.crypto && crypto.getRandomValues) {
    const rawGetRandomValues = crypto.getRandomValues;
    crypto.getRandomValues = function patchedGetRandomValues(arr) {
      const ret = rawGetRandomValues.apply(this, arguments);
      console.log("[crypto.getRandomValues]", Array.from(arr));
      console.trace("crypto.getRandomValues 调用栈");
      return ret;
    };
  }
})();`),
    'dynamic-code': section('动态代码定位', `
(() => {
  const rawEval = window.eval;
  window.eval = function patchedEval(code) {
    console.log("[eval]", String(code).slice(0, 500));
    console.trace("eval 调用栈");
    debugger;
    return rawEval.apply(this, arguments);
  };
  const rawFunction = window.Function;
  window.Function = new Proxy(rawFunction, {
    construct(target, args) {
      console.log("[new Function]", args);
      console.trace("new Function 调用栈");
      debugger;
      return Reflect.construct(target, args);
    },
    apply(target, thisArg, args) {
      console.log("[Function]", args);
      console.trace("Function 调用栈");
      debugger;
      return Reflect.apply(target, thisArg, args);
    }
  });
})();`),
    websocket: section('WebSocket 定位', `
(() => {
  if (!window.WebSocket) return;
  const rawWS = window.WebSocket;
  window.WebSocket = new Proxy(rawWS, {
    construct(target, args) {
      console.log("[WebSocket 创建]", args);
      console.trace("WebSocket 调用栈");
      return Reflect.construct(target, args);
    }
  });
})();`),
    postmessage: section('postMessage 定位', `
(() => {
  const rawPostMessage = window.postMessage;
  if (!rawPostMessage) return;
  window.postMessage = function patchedPostMessage(message, targetOrigin, transfer) {
    console.log("[postMessage]", message, targetOrigin);
    console.trace("postMessage 调用栈");
    return rawPostMessage.apply(this, arguments);
  };
})();`),
  };
}

function build(args) {
  const map = snippets({ param: args.param, apiPattern: args.apiPattern });
  const chosen = args.types.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const unknown = chosen.filter(t => !map[t]);
  if (unknown.length) throw new Error(`未知 Hook 类型：${unknown.join(', ')}`);
  return `// Web JS 逆向定位 Hook 模板
// 目标参数：${args.param}
// API 关键字：${args.apiPattern}
// 使用后请及时移除；只用于授权调试和调用栈定位。
${chosen.map(t => map[t]).join('\n')}`;
}

try {
  const args = parseArgs(process.argv);
  if (args.help) { console.log(usage()); process.exit(0); }
  const content = build(args);
  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(args.out, content, 'utf8');
    console.log(`已写入 Hook 模板：${path.resolve(args.out)}`);
  } else {
    process.stdout.write(content);
  }
} catch (err) {
  console.error(err.message || String(err));
  console.error(usage());
  process.exit(1);
}
