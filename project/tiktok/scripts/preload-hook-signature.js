/**
 * 持久 preload hook（v3）：在 SDK 包装 fetch 之前截获「未签名 URL」，并与「已签名 URL」配对。
 *
 * 原理：document-start 时把 window.fetch 定义成 getter/setter。
 * 之后无论谁（webmssdk / secsdk / PPF）给 window.fetch 赋值，我们都拿到它的 wrapper 函数 W，
 * 再把 window.fetch 换成我们的 shim：
 *     页面调用 → 记录未签名 URL → 调 W（W 内部完成签名）→ 记录签名后 URL → 底层 fetch
 * 这样一次请求就能拿到 (unsigned, signed) 配对，作为离线签名器的 oracle。
 *
 * 用法：proxycli call inject_preload_script --file tiktok/scripts/preload-hook-signature.js
 */
(function () {
  'use strict';
  var RE_SIG = /X-Gnarly|X-Dynosaur/i;
  var MAX = 300;
  var store = (window.__ttSig = window.__ttSig || { pairs: [], log: [] });

  function sigOf(url) {
    var out = {};
    var q = String(url).indexOf('?');
    if (q === -1) return out;
    String(url).slice(q + 1).split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      var n = i === -1 ? kv : kv.slice(0, i);
      if (/^(x-gnarly|x-dynosaur|x-bogus|mstoken)$/i.test(n)) out[n] = i === -1 ? '' : kv.slice(i + 1);
    });
    return out;
  }

  function stripSig(url) {
    var s = String(url), q = s.indexOf('?');
    if (q === -1) return s;
    return s.slice(0, q) + '?' + s.slice(q + 1).split('&').filter(function (kv) {
      return !/^(x-gnarly|x-dynosaur|x-bogus|mstoken)=/i.test(kv);
    }).join('&');
  }

  function push(rec) {
    try { if (store.log.length < MAX) store.log.push(rec); } catch (e) {}
  }

  // --- 1) 截获所有对 window.fetch 的赋值 ---
  var nativeFetch = window.fetch;
  var current = nativeFetch;
  var pending = [];   // 未签名调用队列（与签名后配对）

  function shim(input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var rec = {
      t: Date.now(),
      unsigned: String(url),
      method: (init && init.method) || (input && input.method) || 'GET',
      body: init && typeof init.body === 'string' ? init.body.slice(0, 500) : null
    };
    push({ where: 'shim:in', url: rec.unsigned, method: rec.method });
    var p;
    try { p = current.apply(this, arguments); } catch (e) { p = Promise.reject(e); }
    if (typeof p === 'object' && p && typeof p.then === 'function') {
      var pp = p.then(function (resp) {
        try {
          // 从 response.url 拿签名后的最终 URL（fetch 的 response.url 即最终请求 URL）
          var finalUrl = resp && resp.url ? resp.url : '';
          if (finalUrl && RE_SIG.test(finalUrl)) {
            store.pairs.push({
              t: rec.t,
              method: rec.method,
              body: rec.body,
              unsigned: rec.unsigned,
              signed: finalUrl,
              rawQuery: stripSig(rec.unsigned).slice(0, 1200),
              sig: sigOf(finalUrl),
              sigLen: { gnarly: (sigOf(finalUrl)['X-Gnarly'] || '').length, dynosaur: (sigOf(finalUrl)['X-Dynosaur'] || '').length }
            });
            if (store.pairs.length > MAX) store.pairs.shift();
          } else {
            push({ where: 'shim:no-sig', url: rec.unsigned.slice(0, 200), finalUrl: String(finalUrl).slice(0, 200) });
          }
        } catch (e) {}
        return resp;
      });
      pending.push(rec);
      return pp;
    }
    return p;
  }
  shim.__ttShim = true;

  try {
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get: function () { return shim; },
      set: function (fn) {
        push({ where: 'set:fetch', fnName: (fn && fn.name) || 'anon', stack: String(new Error().stack || '').split('\n').slice(1, 10).map(function (s) { return s.trim(); }) });
        current = fn;
      }
    });
  } catch (e) {
    push({ where: 'set:fetch:ERR', err: String(e && e.message) });
    // 退化为直接包装
    window.fetch = shim;
  }

  // --- 2) URL 构造点：确认签名发生在哪一层 ---
  var U = window.URL;
  if (U && !U.__ttHooked) {
    var nU = function (u, base) {
      var inst = new U(u, base);
      try {
        if (RE_SIG.test(String(inst.href))) {
          push({ where: 'URL.ctor', url: String(inst.href).slice(0, 400), stack: String(new Error().stack || '').split('\n').slice(1, 14).map(function (s) { return s.trim(); }) });
        }
      } catch (e) {}
      return inst;
    };
    nU.__ttHooked = true;
    Object.setPrototypeOf(nU, U);
    nU.prototype = U.prototype;
    window.URL = nU;
  }

  // --- 3) 采集接口 ---
  window.__ttDump = function () {
    var seen = {}, samples = [];
    store.pairs.forEach(function (p) {
      var k = p.rawQuery.slice(0, 150);
      if (seen[k]) return;
      seen[k] = 1;
      samples.push(p);
    });
    return {
      pairCount: store.pairs.length,
      uniqueSamples: samples.length,
      sigLens: samples.map(function (s) { return s.sigLen; }),
      samples: samples.slice(0, 8),
      logTail: store.log.slice(-6)
    };
  };

  console.log('[tt-hook] v3 installed @', location.href.slice(0, 60));
})();