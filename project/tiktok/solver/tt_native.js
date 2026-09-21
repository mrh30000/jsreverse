/**
 * native 保护：让补环境里的「假原生」函数骗过 Function.prototype.toString 检测。
 *
 * 依据：webmssdk.js 内部持有
 *   /\\s*\\(\\)\\s*{\\s*\\[\\s*native\\s+code\\s*]\\s*}\\s*$/   （原生函数检测正则）
 * 并配合 Function.prototype.toString 判断某个全局函数是否「原生」，
 * 只有判定为原生才会走正常的包装/签名链路。因此在 Node 补环境里必须让
 * 我们自造的函数也返回 "[native code]"。
 *
 * 用法：installNativeProtect(sandbox)
 */
'use strict';

const NATIVE_RE = /\s*\(\)\s*{\s*\[\s*native\s+code\s*]\s*}\s*$/;

function installNativeProtect(sandbox) {
  const originalToString = Function.prototype.toString;

  // 记录需要伪装成原生的函数
  const fakeNatives = new WeakSet();
  const nativeNames = new WeakMap();

  function markNative(fn, name) {
    if (typeof fn === 'function') {
      try { fakeNatives.add(fn); } catch (e) {}
      if (name) { try { nativeNames.set(fn, name); } catch (e) {} }
    }
    return fn;
  }

  function patchedToString() {
    let name = null;
    try { name = nativeNames.get(this); } catch (e) {}
    if (!name && typeof this === 'function' && this.name) name = this.name;
    if (!name) name = '';
    // 与 Chrome 输出一致：function NAME() { [native code] }
    return 'function ' + name + '() { [native code] }';
  }
  markNative(patchedToString, 'toString');

  // 覆盖全局 Function.prototype.toString，同时保证它自己也「像原生」
  try {
    Object.defineProperty(Function.prototype, 'toString', {
      value: patchedToString, writable: true, enumerable: false, configurable: true,
    });
  } catch (e) {}

  // 把沙箱里已有的可疑函数标记为原生（浏览器内置对象的方法都应是原生）
  const CANDIDATE_OBJECTS = [
    'fetch', 'XMLHttpRequest', 'Headers', 'Request', 'Response', 'URL', 'URLSearchParams',
    'MutationObserver', 'IntersectionObserver', 'ResizeObserver', 'PerformanceObserver',
    'RTCPeerConnection', 'Worker', 'SharedWorker', 'MessageChannel', 'Blob', 'Event', 'CustomEvent',
  ];
  for (const key of CANDIDATE_OBJECTS) {
    const v = sandbox[key];
    if (typeof v === 'function') {
      markNative(v, key);
      if (v.prototype) {
        for (const m of Object.getOwnPropertyNames(v.prototype)) {
          if (m === 'constructor') continue;
          try { if (typeof v.prototype[m] === 'function') markNative(v.prototype[m], m); } catch (e) {}
        }
      }
    }
  }
  // 其它常见原生方法
  for (const [obj, methods] of [
    [sandbox.navigator, ['sendBeacon', 'javaEnabled', 'getBattery']],
    [sandbox.performance, ['now', 'getEntriesByType', 'getEntriesByName', 'mark', 'measure']],
    [sandbox.crypto, ['getRandomValues', 'randomUUID']],
    [sandbox.document, ['createElement', 'createElementNS', 'getElementById', 'querySelector', 'querySelectorAll', 'addEventListener', 'removeEventListener']],
    [sandbox, ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'addEventListener', 'removeEventListener', 'postMessage', 'btoa', 'atob', 'matchMedia', 'getComputedStyle']],
  ]) {
    if (!obj) continue;
    for (const m of methods) {
      try { if (typeof obj[m] === 'function') markNative(obj[m], m); } catch (e) {}
    }
  }

  return { markNative, originalToString, isNativeDetected: (fn) => NATIVE_RE.test(originalToString.call(fn)) };
}

module.exports = { installNativeProtect, NATIVE_RE };