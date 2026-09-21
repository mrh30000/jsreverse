# 浏览器 Hook 模板

本文件提供授权调试时用于定位加密参数的最小 Hook 模板。原则：只观察、不篡改、不批量请求；命中后用调用栈回到源码确认。

## 使用规则

- 只在用户授权的目标页面中使用。
- Hook 前先记录目标 API、参数名和页面 URL。
- Hook 代码只输出调用栈和关键值，不修改请求内容。
- 命中后尽快移除 Hook，避免影响目标页面逻辑。
- 不用 Hook 绕过登录、验证码、MFA 或风控。

## fetch

```javascript
(() => {
  const targetParam = "sign";
  const apiKeyword = "/api/";
  const rawFetch = window.fetch;
  window.fetch = function patchedFetch(input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    const body = init && init.body;
    if (url.includes(apiKeyword) || String(url).includes(targetParam) || String(body || "").includes(targetParam)) {
      console.group("[fetch 命中]", url);
      console.log("input =", input);
      console.log("init =", init);
      console.trace("fetch 调用栈");
      console.groupEnd();
      debugger;
    }
    return rawFetch.apply(this, arguments);
  };
})();
```

## XMLHttpRequest

```javascript
(() => {
  const targetParam = "sign";
  const apiKeyword = "/api/";
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
})();
```

## URLSearchParams / FormData

```javascript
(() => {
  const targetParam = "sign";
  for (const Ctor of [URLSearchParams, FormData].filter(Boolean)) {
    for (const method of ["append", "set"]) {
      const raw = Ctor.prototype[method];
      if (typeof raw !== "function") continue;
      Ctor.prototype[method] = function patchedParamWrite(name, value) {
        if (String(name) === targetParam || String(value).includes(targetParam)) {
          console.group(`[${Ctor.name}.${method} 命中]`, name);
          console.log("value =", value);
          console.trace("参数写入调用栈");
          console.groupEnd();
          debugger;
        }
        return raw.apply(this, arguments);
      };
    }
  }
})();
```

## Cookie

```javascript
(() => {
  const targetParam = "sign";
  const proto = Document.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "cookie");
  if (!desc || !desc.set || !desc.get) return;
  Object.defineProperty(document, "cookie", {
    configurable: true,
    enumerable: desc.enumerable,
    get() {
      const value = desc.get.call(document);
      if (String(value).includes(targetParam)) {
        console.trace("document.cookie 读取命中");
      }
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
})();
```

## localStorage / sessionStorage

```javascript
(() => {
  const keys = ["token", "sign", "device", "fingerprint"];
  for (const storageName of ["localStorage", "sessionStorage"]) {
    const storage = window[storageName];
    if (!storage) continue;
    for (const method of ["getItem", "setItem", "removeItem"]) {
      const raw = storage[method];
      storage[method] = function patchedStorage(key, value) {
        if (keys.some(k => String(key).includes(k))) {
          console.group(`[${storageName}.${method} 命中]`, key);
          console.log("value =", value);
          console.trace("Storage 调用栈");
          console.groupEnd();
        }
        return raw.apply(this, arguments);
      };
    }
  }
})();
```

## 时间、随机数和动态代码

```javascript
(() => {
  for (const [owner, name] of [[Date, "now"], [Math, "random"]]) {
    const raw = owner[name];
    owner[name] = function patchedTimeRandom() {
      const ret = raw.apply(this, arguments);
      console.log(`[${name}]`, ret);
      console.trace(`${name} 调用栈`);
      return ret;
    };
  }

  const rawGetRandomValues = crypto && crypto.getRandomValues;
  if (rawGetRandomValues) {
    crypto.getRandomValues = function patchedGetRandomValues(arr) {
      const ret = rawGetRandomValues.apply(this, arguments);
      console.log("[crypto.getRandomValues]", Array.from(arr));
      console.trace("crypto 随机数调用栈");
      return ret;
    };
  }

  const rawFunction = Function;
  window.Function = new Proxy(rawFunction, {
    construct(target, args) {
      console.log("[new Function]", args);
      console.trace("动态函数调用栈");
      debugger;
      return Reflect.construct(target, args);
    },
    apply(target, thisArg, args) {
      console.log("[Function]", args);
      console.trace("动态函数调用栈");
      debugger;
      return Reflect.apply(target, thisArg, args);
    }
  });
})();
```

## WebSocket、事件和 postMessage

```javascript
(() => {
  const rawWS = window.WebSocket;
  if (rawWS) {
    window.WebSocket = new Proxy(rawWS, {
      construct(target, args) {
        console.log("[WebSocket 创建]", args);
        console.trace("WebSocket 调用栈");
        return Reflect.construct(target, args);
      }
    });
  }

  const rawPostMessage = window.postMessage;
  if (rawPostMessage) {
    window.postMessage = function patchedPostMessage(message, targetOrigin, transfer) {
      console.log("[postMessage]", message, targetOrigin);
      console.trace("postMessage 调用栈");
      return rawPostMessage.apply(this, arguments);
    };
  }
})();
```

## 证据输出要求

命中 Hook 后至少记录：

- 命中的 API 或参数名。
- 调用栈截图或文本。
- 所在 JS 文件、行列号、chunk 名。
- 写入前后请求对象。
- 是否可复现。
- 是否需要 sourcemap 或动态 chunk。
