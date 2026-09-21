// 指纹值回放模板：用于 Canvas / WebGL / DOM 几何等终端 API 的真实浏览器采样值回放。
// 使用前复制到 case/result/src/env/ 中，并接入 case/fixtures/fingerprint.fixture.json。
// 目标：回放真实浏览器最终返回值，而不是在 Node.js 中真实模拟渲染。
'use strict';

let native = {};
try { native = require('./native-protect'); } catch {}

const defineValue = native.defineValue || function defineValue(obj, key, value, options = {}) {
  Object.defineProperty(obj, key, {
    value,
    writable: options.writable ?? true,
    enumerable: options.enumerable ?? true,
    configurable: options.configurable ?? true,
  });
  return value;
};

const defineNativeValue = native.defineNativeValue || function defineNativeValue(obj, key, impl, options = {}) {
  return defineValue(obj, key, impl, options);
};

const defineNativeGetter = native.defineNativeGetter || function defineNativeGetter(obj, key, impl, options = {}) {
  Object.defineProperty(obj, key, {
    get: impl,
    enumerable: options.enumerable ?? true,
    configurable: options.configurable ?? true,
  });
  return impl;
};

const markObjectToString = native.markObjectToString || function markObjectToString(obj, tag) {
  try {
    Object.defineProperty(obj, Symbol.toStringTag, {
      value: tag,
      enumerable: false,
      configurable: true,
    });
  } catch {}
  return obj;
};

function stackText() {
  try { return String(new Error().stack || ''); } catch { return ''; }
}

function b64ToBytes(value) {
  if (!value) return new Uint8ClampedArray();
  const buf = Buffer.from(String(value), 'base64');
  return new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.byteLength);
}

function includesStack(match, stack) {
  if (!match || !match.stackIncludes) return true;
  const needles = Array.isArray(match.stackIncludes) ? match.stackIncludes : [match.stackIncludes];
  return needles.some(s => stack.includes(String(s)));
}

function matchScalar(expected, actual) {
  if (expected === undefined) return true;
  return String(expected) === String(actual);
}

function findReplay(list, ctx, options = {}) {
  const items = Array.isArray(list) ? list : [];
  const stack = ctx.stack || stackText();
  for (const item of items) {
    const match = item.match || {};
    let ok = includesStack(match, stack);
    for (const [key, expected] of Object.entries(match)) {
      if (key === 'stackIncludes') continue;
      ok = ok && matchScalar(expected, ctx[key]);
    }
    if (ok) return item.result;
  }
  if (options.strict !== false) {
    const brief = Object.fromEntries(Object.entries(ctx).filter(([k]) => k !== 'stack'));
    throw new Error(`缺少浏览器指纹回放样本：${ctx.api || 'unknown'} ${JSON.stringify(brief)}`);
  }
  return undefined;
}

function createImageData(result) {
  const width = Number(result && result.width) || 0;
  const height = Number(result && result.height) || 0;
  const data = result && result.dataBase64 ? b64ToBytes(result.dataBase64) : new Uint8ClampedArray(width * height * 4);
  return markObjectToString({ width, height, data }, 'ImageData');
}

function ensureConstructors(g, options = {}) {
  const addon = options.addon;
  if (!g.HTMLCanvasElement) {
    const HTMLCanvasElement = native.createNativeConstructor ? native.createNativeConstructor('HTMLCanvasElement', 0, function HTMLCanvasElement() {}, addon) : function HTMLCanvasElement() {};
    defineValue(g, 'HTMLCanvasElement', HTMLCanvasElement, { enumerable: false, configurable: true });
  }
  if (!g.CanvasRenderingContext2D) {
    const CanvasRenderingContext2D = native.createNativeConstructor ? native.createNativeConstructor('CanvasRenderingContext2D', 0, function CanvasRenderingContext2D() {}, addon) : function CanvasRenderingContext2D() {};
    defineValue(g, 'CanvasRenderingContext2D', CanvasRenderingContext2D, { enumerable: false, configurable: true });
  }
  if (!g.WebGLRenderingContext) {
    const WebGLRenderingContext = native.createNativeConstructor ? native.createNativeConstructor('WebGLRenderingContext', 0, function WebGLRenderingContext() {}, addon) : function WebGLRenderingContext() {};
    defineValue(g, 'WebGLRenderingContext', WebGLRenderingContext, { enumerable: false, configurable: true });
  }
  if (!g.DOMRect) {
    const DOMRect = native.createNativeConstructor ? native.createNativeConstructor('DOMRect', 4, function DOMRect(isNew, x = 0, y = 0, width = 0, height = 0) {
      if (!isNew && !(this instanceof DOMRect)) return new g.DOMRect(x, y, width, height);
      defineValue(this, 'x', Number(x), { enumerable: true, writable: false, configurable: true });
      defineValue(this, 'y', Number(y), { enumerable: true, writable: false, configurable: true });
      defineValue(this, 'width', Number(width), { enumerable: true, writable: false, configurable: true });
      defineValue(this, 'height', Number(height), { enumerable: true, writable: false, configurable: true });
      defineValue(this, 'top', Number(y), { enumerable: true, writable: false, configurable: true });
      defineValue(this, 'left', Number(x), { enumerable: true, writable: false, configurable: true });
      defineValue(this, 'right', Number(x) + Number(width), { enumerable: true, writable: false, configurable: true });
      defineValue(this, 'bottom', Number(y) + Number(height), { enumerable: true, writable: false, configurable: true });
      markObjectToString(this, 'DOMRect');
    }, addon) : function DOMRect(x = 0, y = 0, width = 0, height = 0) {
      defineValue(this, 'x', Number(x), { enumerable: true, writable: false, configurable: true });
      defineValue(this, 'y', Number(y), { enumerable: true, writable: false, configurable: true });
      defineValue(this, 'width', Number(width), { enumerable: true, writable: false, configurable: true });
      defineValue(this, 'height', Number(height), { enumerable: true, writable: false, configurable: true });
      defineValue(this, 'top', Number(y), { enumerable: true, writable: false, configurable: true });
      defineValue(this, 'left', Number(x), { enumerable: true, writable: false, configurable: true });
      defineValue(this, 'right', Number(x) + Number(width), { enumerable: true, writable: false, configurable: true });
      defineValue(this, 'bottom', Number(y) + Number(height), { enumerable: true, writable: false, configurable: true });
      markObjectToString(this, 'DOMRect');
    };
    defineValue(g, 'DOMRect', DOMRect, { enumerable: false, configurable: true });
  }

  for (const Ctor of [g.HTMLCanvasElement, g.CanvasRenderingContext2D, g.WebGLRenderingContext, g.DOMRect]) {
    try {
      defineValue(Ctor.prototype, 'constructor', Ctor, { enumerable: false, writable: true, configurable: true });
    } catch {}
  }
  try { markObjectToString(g.HTMLCanvasElement.prototype, 'HTMLCanvasElement'); } catch {}
  try { markObjectToString(g.CanvasRenderingContext2D.prototype, 'CanvasRenderingContext2D'); } catch {}
  try { markObjectToString(g.WebGLRenderingContext.prototype, 'WebGLRenderingContext'); } catch {}
}

function create2DContext(g, canvas, state) {
  const ctx = Object.create(g.CanvasRenderingContext2D.prototype);
  ctx.__canvas = canvas;
  ctx.__state = state || { font: '10px sans-serif' };
  markObjectToString(ctx, 'CanvasRenderingContext2D');
  return ctx;
}

function createWebGLContext(g, canvas, state) {
  const gl = Object.create(g.WebGLRenderingContext.prototype);
  gl.__canvas = canvas;
  gl.__state = state || {};
  markObjectToString(gl, 'WebGLRenderingContext');
  return gl;
}

function installCanvasReplay(g, fixture, options) {
  const canvasFx = fixture.canvas || {};
  const proto = g.HTMLCanvasElement.prototype;
  const ctx2dProto = g.CanvasRenderingContext2D.prototype;

  defineNativeValue(proto, 'getContext', function getContext(type) {
    const kind = String(type || '').toLowerCase();
    if (kind === '2d') return this.__ctx2d || (this.__ctx2d = create2DContext(g, this, { font: '10px sans-serif' }));
    if (kind === 'webgl' || kind === 'experimental-webgl' || kind === 'webgl2') return this.__webgl || (this.__webgl = createWebGLContext(g, this, {}));
    return null;
  }, { name: 'getContext', length: 1, enumerable: true, configurable: true }, options.addon);

  defineNativeValue(proto, 'toDataURL', function toDataURL(type = 'image/png', quality) {
    const result = findReplay(canvasFx.toDataURL, {
      api: 'canvas.toDataURL',
      width: this.width,
      height: this.height,
      type,
      quality,
      stack: stackText(),
    }, options);
    return result === undefined ? '' : String(result);
  }, { name: 'toDataURL', length: 0, enumerable: true, configurable: true }, options.addon);

  defineNativeValue(proto, 'toBlob', function toBlob(callback, type = 'image/png', quality) {
    const result = findReplay(canvasFx.toBlob, {
      api: 'canvas.toBlob',
      width: this.width,
      height: this.height,
      type,
      quality,
      stack: stackText(),
    }, { ...options, strict: options.strictToBlob ?? options.strict });
    if (typeof callback === 'function') {
      const blob = markObjectToString({ type, size: result && result.size ? Number(result.size) : 0, __replay: result }, 'Blob');
      callback(blob);
    }
  }, { name: 'toBlob', length: 1, enumerable: true, configurable: true }, options.addon);

  defineNativeGetter(ctx2dProto, 'font', function getFont() {
    return this.__state && this.__state.font || '10px sans-serif';
  }, { name: 'font', enumerable: true, configurable: true }, options.addon);
  Object.defineProperty(ctx2dProto, 'font', {
    get: Object.getOwnPropertyDescriptor(ctx2dProto, 'font').get,
    set: function setFont(value) { this.__state.font = String(value); },
    enumerable: true,
    configurable: true,
  });

  defineNativeValue(ctx2dProto, 'measureText', function measureText(text) {
    const result = findReplay(canvasFx.measureText, {
      api: 'canvas.measureText',
      text: String(text),
      font: this.font,
      stack: stackText(),
    }, options) || { width: 0 };
    return markObjectToString({ ...result }, 'TextMetrics');
  }, { name: 'measureText', length: 1, enumerable: true, configurable: true }, options.addon);

  defineNativeValue(ctx2dProto, 'getImageData', function getImageData(sx, sy, sw, sh) {
    const result = findReplay(canvasFx.getImageData, {
      api: 'canvas.getImageData',
      sx, sy, sw, sh,
      stack: stackText(),
    }, options);
    return createImageData(result || { width: sw, height: sh });
  }, { name: 'getImageData', length: 4, enumerable: true, configurable: true }, options.addon);

  for (const name of ['fillText', 'strokeText', 'drawImage', 'fillRect', 'clearRect', 'rect', 'arc', 'beginPath', 'closePath', 'stroke', 'fill', 'putImageData']) {
    if (!ctx2dProto[name]) {
      defineNativeValue(ctx2dProto, name, function noop() {}, { name, length: 0, enumerable: true, configurable: true }, options.addon);
    }
  }
}

function installWebGLReplay(g, fixture, options) {
  const webglFx = fixture.webgl || {};
  const proto = g.WebGLRenderingContext.prototype;

  defineNativeValue(proto, 'getParameter', function getParameter(pname) {
    return findReplay(webglFx.getParameter, { api: 'webgl.getParameter', pname, stack: stackText() }, options);
  }, { name: 'getParameter', length: 1, enumerable: true, configurable: true }, options.addon);

  defineNativeValue(proto, 'getSupportedExtensions', function getSupportedExtensions() {
    const configured = webglFx.getSupportedExtensions;
    if (configured && Array.isArray(configured.result)) return configured.result.slice();
    return findReplay(webglFx.getSupportedExtensions, { api: 'webgl.getSupportedExtensions', stack: stackText() }, options) || [];
  }, { name: 'getSupportedExtensions', length: 0, enumerable: true, configurable: true }, options.addon);

  defineNativeValue(proto, 'getExtension', function getExtension(name) {
    const configured = webglFx.getExtension;
    const result = findReplay(configured, { api: 'webgl.getExtension', name: String(name), stack: stackText() }, { ...options, strict: false });
    return result === undefined ? null : markObjectToString({ name: String(name), ...result }, String(name));
  }, { name: 'getExtension', length: 1, enumerable: true, configurable: true }, options.addon);

  defineNativeValue(proto, 'getShaderPrecisionFormat', function getShaderPrecisionFormat(shaderType, precisionType) {
    const result = findReplay(webglFx.getShaderPrecisionFormat, {
      api: 'webgl.getShaderPrecisionFormat',
      shaderType,
      precisionType,
      stack: stackText(),
    }, options) || { rangeMin: 0, rangeMax: 0, precision: 0 };
    return markObjectToString({ ...result }, 'WebGLShaderPrecisionFormat');
  }, { name: 'getShaderPrecisionFormat', length: 2, enumerable: true, configurable: true }, options.addon);

  defineNativeValue(proto, 'readPixels', function readPixels(x, y, width, height, format, type, pixels) {
    const result = findReplay(webglFx.readPixels, {
      api: 'webgl.readPixels',
      x, y, width, height, format, type,
      stack: stackText(),
    }, options);
    if (pixels && result && result.dataBase64) {
      const bytes = b64ToBytes(result.dataBase64);
      for (let i = 0; i < Math.min(pixels.length, bytes.length); i++) pixels[i] = bytes[i];
    }
  }, { name: 'readPixels', length: 7, enumerable: true, configurable: true }, options.addon);

  defineNativeValue(proto, 'getContextAttributes', function getContextAttributes() {
    return { alpha: true, antialias: true, depth: true, desynchronized: false, failIfMajorPerformanceCaveat: false, powerPreference: 'default', premultipliedAlpha: true, preserveDrawingBuffer: false, stencil: false, xrCompatible: false };
  }, { name: 'getContextAttributes', length: 0, enumerable: true, configurable: true }, options.addon);
}

function installDomGeometryReplay(g, fixture, options) {
  const domFx = fixture.domGeometry || {};
  if (!g.Element) return;
  const proto = g.Element.prototype;

  function selectorOf(el) {
    return el.__fingerprintSelector || el.id && `#${el.id}` || el.className && `.${String(el.className).split(/\s+/)[0]}` || String(el.tagName || '').toLowerCase();
  }

  defineNativeValue(proto, 'getBoundingClientRect', function getBoundingClientRect() {
    const result = findReplay(domFx.getBoundingClientRect, {
      api: 'dom.getBoundingClientRect',
      selector: selectorOf(this),
      stack: stackText(),
    }, options) || {};
    return new g.DOMRect(result.x || result.left || 0, result.y || result.top || 0, result.width || 0, result.height || 0);
  }, { name: 'getBoundingClientRect', length: 0, enumerable: true, configurable: true }, options.addon);

  defineNativeValue(proto, 'getClientRects', function getClientRects() {
    const rect = this.getBoundingClientRect();
    return markObjectToString({ 0: rect, length: 1, item(i) { return i === 0 ? rect : null; } }, 'DOMRectList');
  }, { name: 'getClientRects', length: 0, enumerable: true, configurable: true }, options.addon);

  for (const key of ['offsetWidth', 'offsetHeight', 'scrollWidth', 'scrollHeight', 'clientWidth', 'clientHeight']) {
    defineNativeGetter(proto, key, function geometryGetter() {
      const result = findReplay(domFx.offset, {
        api: `dom.${key}`,
        selector: selectorOf(this),
        stack: stackText(),
      }, { ...options, strict: false });
      if (result && result[key] !== undefined) return Number(result[key]);
      const rect = this.getBoundingClientRect();
      return /height/i.test(key) ? Math.round(rect.height || 0) : Math.round(rect.width || 0);
    }, { name: key, enumerable: true, configurable: true }, options.addon);
  }
}

function createCanvasElement(globalObj, width = 300, height = 150) {
  const g = globalObj || globalThis;
  ensureConstructors(g, options);
  const canvas = Object.create(g.HTMLCanvasElement.prototype);
  defineValue(canvas, 'width', Number(width), { enumerable: true, writable: true, configurable: true });
  defineValue(canvas, 'height', Number(height), { enumerable: true, writable: true, configurable: true });
  markObjectToString(canvas, 'HTMLCanvasElement');
  return canvas;
}

function installFingerprintValueReplay(globalObj, fixture = {}, options = {}) {
  const g = globalObj || globalThis;
  const replayOptions = { strict: true, ...options };
  ensureConstructors(g, replayOptions);
  installCanvasReplay(g, fixture, replayOptions);
  installWebGLReplay(g, fixture, replayOptions);
  installDomGeometryReplay(g, fixture, replayOptions);
  if (!g.document) return { createCanvasElement: (w, h) => createCanvasElement(g, w, h) };
  if (g.document && typeof g.document.createElement === 'function' && !g.document.__fingerprintCreateElementPatched) {
    const rawCreateElement = g.document.createElement;
    defineNativeValue(g.document, 'createElement', function createElement(tagName, optionsArg) {
      const tag = String(tagName || '').toLowerCase();
      if (tag === 'canvas') return createCanvasElement(g);
      return rawCreateElement.call(this, tagName, optionsArg);
    }, { name: 'createElement', length: 1, enumerable: true, configurable: true }, replayOptions.addon);
    defineValue(g.document, '__fingerprintCreateElementPatched', true, { enumerable: false, configurable: true });
  }
  return { createCanvasElement: (w, h) => createCanvasElement(g, w, h) };
}

module.exports = {
  installFingerprintValueReplay,
  createCanvasElement,
  findReplay,
};
