/**
 * 修复版 preload：唯一职责是「解除此前 preload 对 window.fetch 的 getter/setter 劫持」。
 *
 * 背景：早期版本用 Object.defineProperty(window,'fetch',{get,set}) 拦截 SDK 的 fetch 包装，
 * 而 PPF 包装器会 `var he = window.fetch`（拿到我们的 shim），形成
 *   shim → PPF wrapper → he(shim) → … 无限递归，页面卡死。
 *
 * 修复方式（无副作用、不递归）：
 *   1. 删掉 window.fetch 上的 accessor，露出原型链上的原生 fetch；
 *   2. 用纯 passthrough 覆写为普通数据属性，保证后续 SDK 的正常包裹链工作。
 *
 * 不记录任何数据，不改变请求语义。
 */
(function () {
  'use strict';
  try {
    var d = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (d && (d.get || d.set)) {
      try { delete window.fetch; } catch (e) {}
    }
    var native = window.fetch;
    if (typeof native === 'function' && !native.__ttPassthrough) {
      var passthrough = function () { return native.apply(this, arguments); };
      passthrough.__ttPassthrough = true;
      try {
        Object.defineProperty(window, 'fetch', {
          value: passthrough, writable: true, configurable: true, enumerable: true
        });
      } catch (e) {
        try { window.fetch = passthrough; } catch (e2) {}
      }
      console.log('[tt-fix] fetch accessor removed, passthrough installed');
    }
  } catch (e) {
    console.log('[tt-fix] failed:', String(e && e.message));
  }
})();