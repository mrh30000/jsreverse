/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 运行时关键数据流观测与拦截探针 (DataFlow Probes).
 *
 * 序列化约束：函数体内不得引用模块级变量，配置通过 config 传入。
 *
 * config 支持的选项：
 * - hookId: string
 * - targets: string[] ('promise' | 'cookie' | 'storage' | 'network' | 'freeze-time' | 'builtins' | 'all')
 * - keyword: string (可选，针对 cookie、storage 键名、XHR URL 的关键词过滤)
 * - cookieMatch: string (可选，当 cookie 匹配该关键词时触发 debugger 断点)
 * - limitPerApi: number (可选，每个类别/接口的最大打印次数熔断，默认 50，防止死循环刷屏卡死)
 * - logAt: boolean (可选，是否提取并打印触发调用位置的文件路径与行号，默认 true)
 * - fixedTime: number (默认 Date.now() 当前快照或指定时间戳)
 * - fixedRandom: number (默认 0.5)
 * - logFormat: 'compact' | 'json'
 */
export function installDataflowHook(config) {
  const hookId = config.hookId || 'hook_dataflow';
  const targets = config.targets || ['all'];
  const keyword = config.keyword ? String(config.keyword).toLowerCase() : '';
  const cookieMatch = config.cookieMatch ? String(config.cookieMatch) : '';
  const limitPerApi = typeof config.limitPerApi === 'number' ? config.limitPerApi : 50;
  const logAt = config.logAt ?? true;
  const logFormat = config.logFormat || 'compact';

  const callCounters = {};
  const silencedCategories = {};

  function checkLimit(category) {
    if (!category) return true;
    callCounters[category] = (callCounters[category] || 0) + 1;
    if (callCounters[category] > limitPerApi) {
      if (!silencedCategories[category]) {
        silencedCategories[category] = true;
        console.warn(`[${hookId}] ⚠️ ${category} 已超过最大打印限额 (${limitPerApi})，自动熔断后续输出。`);
      }
      return false;
    }
    return true;
  }

  function getCallerLocation() {
    if (!logAt) return undefined;
    try {
      const lines = (new Error().stack || '').split('\n');
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.includes(hookId) && !line.includes('installDataflowHook')) {
          return line.replace(/^at\s+/, '');
        }
      }
    } catch (_) {}
    return undefined;
  }

  function shouldTarget(name) {
    return targets.includes('all') || targets.includes(name);
  }

  function emit(data) {
    if (!checkLimit(data.category + (data.action ? ':' + data.action : ''))) {
      return;
    }
    if (logAt && !data.triggerAt) {
      data.triggerAt = getCallerLocation();
    }
    if (logFormat === 'json') {
      console.log(JSON.stringify(data));
    } else {
      console.log(`[${hookId}:${data.category}]`, data);
    }
  }

  // 1. Promise Resolve 追踪（快速定位异步回调完成与解密数据落地位置）
  if (shouldTarget('promise') && typeof window.Promise === 'function') {
    const RawPromise = window.Promise;
    function PatchedPromise(executor) {
      if (typeof executor !== 'function') {
        return Reflect.construct(RawPromise, arguments);
      }
      return Reflect.construct(RawPromise, [
        function (resolve, reject) {
          function wrappedResolve(val) {
            try {
              if (val !== undefined && val !== null && typeof val !== 'function') {
                const stack = new Error().stack || '';
                emit({
                  category: 'promise',
                  action: 'resolve',
                  timestamp: Date.now(),
                  valuePreview: typeof val === 'object' ? JSON.stringify(val).slice(0, 300) : String(val).slice(0, 300),
                  stack: stack.split('\n').slice(1, 4).map(s => s.trim()).join(' -> '),
                });
              }
            } catch (_) {}
            return resolve(val);
          }
          return executor(wrappedResolve, reject);
        },
      ]);
    }
    PatchedPromise.prototype = RawPromise.prototype;
    PatchedPromise.all = RawPromise.all;
    PatchedPromise.race = RawPromise.race;
    PatchedPromise.resolve = RawPromise.resolve;
    PatchedPromise.reject = RawPromise.reject;
    PatchedPromise.allSettled = RawPromise.allSettled;
    PatchedPromise.any = RawPromise.any;
    window.Promise = PatchedPromise;
  }

  // 2. Cookie 写入监控
  if (shouldTarget('cookie') && typeof document !== 'undefined') {
    let cookieTarget = document;
    let cookieDesc = Object.getOwnPropertyDescriptor(document, 'cookie');
    if (!cookieDesc && Object.getPrototypeOf(document)) {
      cookieTarget = Object.getPrototypeOf(document);
      cookieDesc = Object.getOwnPropertyDescriptor(cookieTarget, 'cookie');
    }
    if (!cookieDesc && typeof Document !== 'undefined') {
      cookieTarget = Document.prototype;
      cookieDesc = Object.getOwnPropertyDescriptor(cookieTarget, 'cookie');
    }
    if (!cookieDesc && typeof HTMLDocument !== 'undefined') {
      cookieTarget = HTMLDocument.prototype;
      cookieDesc = Object.getOwnPropertyDescriptor(cookieTarget, 'cookie');
    }

    if (cookieDesc && cookieDesc.set) {
      const rawSet = cookieDesc.set;
      const rawGet = cookieDesc.get;

      Object.defineProperty(document, 'cookie', {
        configurable: true,
        enumerable: true,
        get() {
          return rawGet ? Reflect.apply(rawGet, this, []) : '';
        },
        set(val) {
          const strVal = String(val);
          if (!keyword || strVal.toLowerCase().includes(keyword)) {
            const stack = new Error().stack || '';
            emit({
              category: 'cookie',
              action: 'set',
              timestamp: Date.now(),
              value: strVal,
              stack: stack.split('\n').slice(1, 5).map(s => s.trim()).join(' -> '),
            });
            if (cookieMatch && strVal.includes(cookieMatch)) {
              console.warn(`[${hookId}:cookie] 🎯 命中 Cookie 条件断点 [${cookieMatch}]:`, strVal);
              debugger;
            }
          }
          return Reflect.apply(rawSet, this, [val]);
        },
      });
    }
  }

  // 3. Storage (localStorage & sessionStorage) 监控
  if (shouldTarget('storage') && typeof Storage !== 'undefined' && Storage.prototype) {
    const rawSetItem = Storage.prototype.setItem;
    const rawGetItem = Storage.prototype.getItem;
    const rawRemoveItem = Storage.prototype.removeItem;
    const rawClear = Storage.prototype.clear;

    Storage.prototype.setItem = function (key, value) {
      const k = String(key);
      if (!keyword || k.toLowerCase().includes(keyword)) {
        emit({
          category: 'storage',
          storageType: this === window.localStorage ? 'localStorage' : 'sessionStorage',
          action: 'setItem',
          key: k,
          valuePreview: String(value).slice(0, 200),
          stack: (new Error().stack || '').split('\n').slice(1, 4).map(s => s.trim()).join(' -> '),
        });
      }
      return Reflect.apply(rawSetItem, this, arguments);
    };

    Storage.prototype.getItem = function (key) {
      const res = Reflect.apply(rawGetItem, this, arguments);
      const k = String(key);
      if (!keyword || k.toLowerCase().includes(keyword)) {
        emit({
          category: 'storage',
          storageType: this === window.localStorage ? 'localStorage' : 'sessionStorage',
          action: 'getItem',
          key: k,
          resultPreview: res ? String(res).slice(0, 100) : null,
        });
      }
      return res;
    };

    Storage.prototype.removeItem = function (key) {
      const k = String(key);
      if (!keyword || k.toLowerCase().includes(keyword)) {
        emit({
          category: 'storage',
          storageType: this === window.localStorage ? 'localStorage' : 'sessionStorage',
          action: 'removeItem',
          key: k,
        });
      }
      return Reflect.apply(rawRemoveItem, this, arguments);
    };

    Storage.prototype.clear = function () {
      emit({
        category: 'storage',
        storageType: this === window.localStorage ? 'localStorage' : 'sessionStorage',
        action: 'clear',
      });
      return Reflect.apply(rawClear, this, arguments);
    };
  }

  // 4. 固定时间与确定性伪随机 (用于脱敏测试与可复现算法对齐)
  if (shouldTarget('freeze-time')) {
    const fixedNow = config.fixedTime || 1700000000000;
    const fixedRand = config.fixedRandom ?? 0.5;

    Date.now = function () {
      return fixedNow;
    };
    if (typeof performance !== 'undefined' && performance.now) {
      performance.now = function () {
        return 1000.0;
      };
    }
    Math.random = function () {
      return fixedRand;
    };
  }

  // 5. XHR / Fetch 网络流拦截
  if (shouldTarget('network')) {
    if (typeof XMLHttpRequest !== 'undefined' && XMLHttpRequest.prototype) {
      const rawOpen = XMLHttpRequest.prototype.open;
      const rawSetHeader = XMLHttpRequest.prototype.setRequestHeader;

      XMLHttpRequest.prototype.open = function (method, url) {
        this.__adb_req = { method, url: String(url), headers: {} };
        const u = String(url);
        if (!keyword || u.toLowerCase().includes(keyword)) {
          emit({
            category: 'xhr',
            action: 'open',
            method,
            url: u,
            stack: (new Error().stack || '').split('\n').slice(1, 4).map(s => s.trim()).join(' -> '),
          });
        }
        return Reflect.apply(rawOpen, this, arguments);
      };

      XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
        if (this.__adb_req && this.__adb_req.headers) {
          this.__adb_req.headers[header] = value;
        }
        if (!keyword || String(header).toLowerCase().includes(keyword)) {
          emit({
            category: 'xhr',
            action: 'setRequestHeader',
            header,
            value: String(value).slice(0, 100),
          });
        }
        return Reflect.apply(rawSetHeader, this, arguments);
      };
    }

    if (typeof window.fetch === 'function') {
      const rawFetch = window.fetch;
      window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : (input?.url || '');
        if (!keyword || url.toLowerCase().includes(keyword)) {
          emit({
            category: 'fetch',
            action: 'request',
            url,
            method: init?.method || 'GET',
            headers: init?.headers || {},
            bodyPreview: init?.body ? String(init.body).slice(0, 200) : null,
          });
        }
        return Reflect.apply(rawFetch, this, arguments);
      };
    }
  }

  // 6. 常用编解码与定时器 Builtins 拦截 (JSON / URI / Base64 / Timers)
  if (shouldTarget('builtins')) {
    if (typeof JSON !== 'undefined') {
      const rawParse = JSON.parse;
      const rawStringify = JSON.stringify;

      JSON.parse = function (text, reviver) {
        const preview = typeof text === 'string' ? text.slice(0, 200) : String(text);
        if (!keyword || preview.toLowerCase().includes(keyword)) {
          emit({
            category: 'builtins',
            action: 'JSON.parse',
            inputPreview: preview,
          });
        }
        return Reflect.apply(rawParse, this, arguments);
      };

      JSON.stringify = function (value, replacer, space) {
        const res = Reflect.apply(rawStringify, this, arguments);
        if (res && (!keyword || res.toLowerCase().includes(keyword))) {
          emit({
            category: 'builtins',
            action: 'JSON.stringify',
            outputPreview: res.slice(0, 200),
          });
        }
        return res;
      };
    }

    if (typeof window.atob === 'function') {
      const rawAtob = window.atob;
      window.atob = function (encoded) {
        const s = String(encoded);
        if (!keyword || s.toLowerCase().includes(keyword)) {
          emit({ category: 'builtins', action: 'atob', input: s.slice(0, 150) });
        }
        return Reflect.apply(rawAtob, this, arguments);
      };
    }

    if (typeof window.btoa === 'function') {
      const rawBtoa = window.btoa;
      window.btoa = function (stringToEncode) {
        const s = String(stringToEncode);
        if (!keyword || s.toLowerCase().includes(keyword)) {
          emit({ category: 'builtins', action: 'btoa', input: s.slice(0, 150) });
        }
        return Reflect.apply(rawBtoa, this, arguments);
      };
    }

    const uriFuncs = ['decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent'];
    for (const name of uriFuncs) {
      if (typeof window[name] === 'function') {
        const rawFunc = window[name];
        window[name] = function (str) {
          const s = String(str);
          if (!keyword || s.toLowerCase().includes(keyword)) {
            emit({ category: 'builtins', action: name, input: s.slice(0, 150) });
          }
          return Reflect.apply(rawFunc, this, arguments);
        };
      }
    }

    if (typeof window.setTimeout === 'function') {
      const rawSetTimeout = window.setTimeout;
      window.setTimeout = function (handler, timeout, ...args) {
        const isStr = typeof handler === 'string';
        if (isStr || (!keyword && limitPerApi > 0)) {
          emit({
            category: 'builtins',
            action: 'setTimeout',
            timeout: Number(timeout) || 0,
            handlerPreview: isStr ? handler.slice(0, 150) : (handler?.name || 'anonymous_fn'),
          });
        }
        return Reflect.apply(rawSetTimeout, this, arguments);
      };
    }

    if (typeof window.setInterval === 'function') {
      const rawSetInterval = window.setInterval;
      window.setInterval = function (handler, timeout, ...args) {
        const isStr = typeof handler === 'string';
        emit({
          category: 'builtins',
          action: 'setInterval',
          timeout: Number(timeout) || 0,
          handlerPreview: isStr ? handler.slice(0, 150) : (handler?.name || 'anonymous_fn'),
        });
        return Reflect.apply(rawSetInterval, this, arguments);
      };
    }
  }

  console.log('[' + hookId + '] ✅ DataFlow hook installed for: ' + targets.join(', '));
}
