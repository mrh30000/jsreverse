# jsdom / vm 环境伪装补丁参考（吸收自 hello_js_reverse_skill）

> **吸收说明**：本文件把 `hello_js_reverse_skill`（路径 B 环境伪装 / 环境补全）独有的、`web-js-env-patcher` 原 references 未覆盖的高操作价值补环境内容整理进本 Skill。其方法论与 `web-js-env-patcher` 互补：本 Skill 的 `env-object-model.md` / `env-native-protection.md` / `fingerprint-value-replay.md` 讲"怎么把对象补到真实浏览器一致"，本文件讲"在 jsdom / vm 沙箱里把整套浏览器环境伪装到能跑通 JSVMP 类字节码签名"，核心是 **Feed-Intercept（喂入-截出）** 与 **原生代码格式伪装**。

## 适用范围

- 目标 JS 是 JSVMP / opcode / 字节码虚拟机签名黑箱，算法不可提取，但可以在 jsdom / vm 沙箱中整体加载执行（算法与环境指纹深度绑定）。
- 通过 XHR / fetch 拦截器在请求时自动追加签名，用「喂入-截出」截获最终签名值。
- SDK 需要完整初始化链（如 `_SdkGlueInit(config, resources)` / `cacheOpts`）才注册业务拦截路径。
- 服务端可能**静默拒绝**（HTTP 200 + 空 body）而不是报错——这是环境伪装失败的经典信号。

## 边界与红线（沿用本 Skill）

- 本文件只用于网页端 JS 在 Node.js 中运行的环境补全，不扩展为 App / Native / 纯算重写。
- 遇到 JSVMP 时仍遵循"不主动分析字节码 / opcode / 解释器源码"，只围绕环境调用、writer、行为 diff 与请求链推进。
- 指纹终端 API 的值仍以真实浏览器采样回放为准，不把 `node-canvas` / `headless-gl` / jsdom 的结果当最终回放值（见 `fingerprint-value-replay.md`）。jsdom / vm 只作为"能让目标 JS 跑起来"的运行载体，不代表真实渲染结果。
- 最终交付仍走本 Skill 的 addon-first / xbs native-first、原型链、描述符、访问器、toString 保护与 fixtures 验证，不允许把浏览器自动化作为最终方案。

---

## 一、核心方法论：jsdom 环境伪装六步法

> 吸收自 hello_js_reverse_skill 的"路径 B 环境伪装六步法"。

1. **用用户确认的取证浏览器采集真实环境指纹**（本 Skill 优先 ruyiPage + RuyiTrace；hello_js_reverse_skill 用 camoufox-reverse 的环境采集能力）。分批采集，单次采集脚本不要太长。
2. **在 jsdom / vm 沙箱中运行完全相同的采集代码**，得到沙箱端环境值。
3. **逐项 diff，按检测影响分级**（致命级 → 高危级 → 中危级）。
4. **编写 `patchEnvironment()` 全量修复**。
5. **从沙箱内部（`win.eval`）验证所有检测点通过**。
6. **端到端验证**：加载完整目标 JS → 触发签名生成 → 用截获签名值请求接口（或按用户选择只输出本地参数）。

## 二、jsdom 创建要点

```js
const { JSDOM } = require('jsdom');

function createPatchedJsdom(url, options = {}) {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url,
    referrer: options.referrer || '',
    contentType: 'text/html',
    pretendToBeVisual: true,
    runScripts: 'dangerously',
    resources: options.resources || undefined, // 见下方「resources:'usable'」坑
  });
  const win = dom.window;
  const doc = win.document;
  const nav = win.navigator;

  patchEnvironment(win, doc, nav, options);
  return dom;
}
```

关键参数：

| 参数 | 作用 |
|---|---|
| `url` | 必须设为目标 URL，影响 `document.URL` / `document.domain` / `location.*` |
| `pretendToBeVisual` | 使 `requestAnimationFrame` 可用 |
| `runScripts: 'dangerously'` | 允许执行目标 JS（环境伪装必需） |
| `resources: 'usable'` | 部分 SDK 的 XHR 拦截器**必须**依赖完整 XHR 实现；缺失时 SDK 能加载但拦截器不触发（见踩坑） |

## 三、markNative 三层防御（jsdom 环境伪装第一杀手）

> 吸收自 hello_js_reverse_skill 的 `markNative` 三层防御与 Firefox/Chrome 格式差异。

jsdom 所有 DOM 方法都是 JS 实现，`toString()` 会暴露完整源码（如 `createElement(localName) { const esValue = ... }`）。目标 JS 通过此判断是否在真实浏览器。

### 三层防御（在**单次** `Function.prototype.toString` 覆写的函数体内部完成）

```js
const _origFnToString = win.Function.prototype.toString;
const nativeFnSet = new WeakSet();

function markNative(fn) {
  if (typeof fn === 'function') {
    nativeFnSet.add(fn);
    try {
      const name = fn.name || '';
      // 第一层（实例级）：直接在函数对象上定义 toString
      Object.defineProperty(fn, 'toString', {
        value: function () { return nativeCode(name); },
        writable: true, configurable: true,
      });
    } catch (e) {}
  }
  return fn;
}

// 第二层（源码正则）：捕获 WeakSet 遗漏的 jsdom 内部函数
const jsdomPatterns = [
  /^\s*\w+\s*\([^)]*\)\s*\{[\s\S]*?const\s+esValue\s*=/,
  /^\s*function\s*\([^)]*\)\s*\{[\s\S]*?this\._globalObject/,
  /^\s*\w+\s*\([^)]*\)\s*\{\s*const\s+\w+\s*=\s*this\s*!==/,
  /tryImplForWrapper/,
  /ceReactionsPreSteps/,
];

// 仅一次整体覆写
win.Function.prototype.toString = function () {
  if (nativeFnSet.has(this)) {
    return nativeCode(this.name || '');
  }
  let src;
  try { src = _origFnToString.call(this); } catch (e) {
    return 'function () { [native code] }';
  }
  for (const pat of jsdomPatterns) {
    if (pat.test(src)) return nativeCode(this.name || '');
  }
  return src;
};
```

### 原生代码格式：Chrome vs Firefox（关键）

`native code` 字符串格式必须与**取证浏览器内核一致**，否则签名仍被拒：

| 内核 | 格式 |
|---|---|
| Chrome | `function name() { [native code] }`（单行） |
| Firefox（Camoufox 等） | `function name() {\n    [native code]\n}`（含换行 + 4 空格缩进） |

```js
// 按取证浏览器选择
function nativeCode(name) {
  return IS_FIREFOX
    ? `function ${name}() {\n    [native code]\n}`
    : `function ${name}() { [native code] }`;
}
```

### 禁用：第二次覆写

整个补丁只能有**一次** `Function.prototype.toString = function() {...}` 赋值。"三层防御"指单次赋值函数体内部的三段检测逻辑（WeakSet + jsdom 源码正则 + 源码 fallback），**不是覆盖三次**。第二次赋值会让命名函数暴露自身源码。

自检：`grep -c "win.Function.prototype.toString *=" env-patch.js` 必须 `= 1`。

## 四、jsdom 环境补丁分级清单

> 吸收自 hello_js_reverse_skill 的 58 / 62 项差异表。所有 stub / getter / 方法都要经 `markNative` 处理。

### 致命级（缺失即被拒）

| 检测项 | 修复 |
|---|---|
| `Function.prototype.toString` | markNative 三层防御（见上） |
| `navigator.webdriver` | `Object.defineProperty(nav, 'webdriver', { get: () => false, ... })` |
| `navigator.plugins` / `mimeTypes` | 完整 PluginArray / Plugin / MimeType 对象树（`length`、`item()`、`namedItem()`、`Symbol.toStringTag`、`Symbol.iterator`），不要用普通数组。**本 Skill 环境优先用 addon `getMimeTypesAndPlugins(config)`**，jsdom 内无 addon 时才用下述 JS 对象树 |
| `document.hasFocus()` | 覆写为始终返回 `true` |
| DOM 布局属性 | `HTMLElement.prototype` 的 `offsetHeight/offsetWidth/clientHeight/clientWidth/scrollHeight/scrollWidth` getter 返回非零值（解析 style 或默认值）；`getBoundingClientRect()` 返回合理 DOMRect |
| `JSON.stringify` / `JSON.parse` toString | 显式 `markNative`（它们不在任何 DOM 原型链上，`scanPrototypeChain` 扫不到），格式与取证内核一致 |
| `navigator.permissions` / `clipboard` | 存根（见中危段） |

### 高危级（可能参与指纹哈希）

| 检测项 | 修复 |
|---|---|
| `Object.prototype.toString` 标签 | `Symbol.toStringTag` 挂到**正确 prototype**（`HTMLDocument.prototype` / `Screen.prototype` / `Navigator.prototype` / `Performance.prototype` / `Location.prototype`），不要挂实例 |
| `window.chrome` | 完整 `{ app, runtime, csi, loadTimes }`（仅 Chrome UA，含运行时枚举常量） |
| `navigator.userAgentData` | 完整 `NavigatorUAData`（`brands/mobile/platform` + `getHighEntropyValues()` + `toJSON`），仅 Chrome UA |
| `performance.timing` / `navigation` / `memory` | 构造合理对象 + `Symbol.toStringTag`；`memory` 仅 Chrome UA |
| `navigator.platform` / `language` / `languages` / `vendor` / `productSub` | 按取证值 `Object.defineProperty` 覆盖 |
| `document.hidden` / `visibilityState` / `readyState` / `fullscreenEnabled` | getter 覆写（`readyState` 应为 `'complete'`） |
| `screen` | 重建（`width/height/avail*/colorDepth/pixelDepth/availLeft/availTop/orientation` + `Symbol.toStringTag`） |

### 中危级（API 存在性检测，30+）

> 吸收自 hello_js_reverse_skill 的批量 API 存根。每个 stub 函数必须经 `markNative`；本 Skill 环境优先用 addon 创建 native-like 函数。

`Notification`、`Worker` / `SharedWorker`、`RTCPeerConnection`、`AudioContext` / `OfflineAudioContext`、`fetch` + `Request/Response/Headers/AbortController`、`matchMedia`、`requestIdleCallback` / `cancelIdleCallback`、`requestAnimationFrame`（`pretendToBeVisual` 已提供则跳过）、`indexedDB`、`caches`、`speechSynthesis`、`customElements`、`visualViewport`、`isSecureContext`、`clientInformation`、`navigator.connection`（仅 Chrome UA）、`navigator.getBattery`、`navigator.deviceMemory`、`navigator.maxTouchPoints`、`navigator.pdfViewerEnabled`、`navigator.permissions.query`、`navigator.clipboard.readText/writeText`、`document.fonts`、`document.timeline`、`WebSocket`（含静态常量）、`IntersectionObserver` / `ResizeObserver` / `PerformanceObserver` / `MessageChannel`、`structuredClone`。

## 五、UA 分支矩阵（禁止跨分支混补）

> 吸收自 hello_js_reverse_skill 的 UA 分支矩阵。环境值必须与 `navigator.userAgent` 自洽，否则签名被静默拒绝。

### Firefox UA（含 `Firefox/xxx`，如 Camoufox 内核）

- 必补：`Notification`、`Worker/SharedWorker/RTCPeerConnection`、`AudioContext/OfflineAudioContext`、`matchMedia`、`requestIdleCallback`、`indexedDB/caches/speechSynthesis/customElements/visualViewport`、`isSecureContext`、`clientInformation`、`WebSocket`、`document.fonts/timeline`、`navigator.permissions/clipboard`、`IntersectionObserver/ResizeObserver/PerformanceObserver/MessageChannel`、`structuredClone`。
- 禁补（Chrome 独有，Firefox UA 下必须 `undefined`）：`navigator.userAgentData`、`navigator.connection`、`navigator.getBattery`、`window.chrome`、`performance.memory`。
- Firefox 特有：`navigator.buildID` 存在；`window.CSS2Properties` 是 `CSSStyleDeclaration` 别名（Firefox 用 `CSS2Properties`，Chrome 用 `CSSStyleDeclaration`）。

### Chrome UA（含 `Chrome/xxx`）

- 必补（在 Firefox 基础上额外）：`navigator.userAgentData`（完整 `NavigatorUAData`）、`navigator.connection`、`window.chrome.{app,runtime,csi,loadTimes}`、`performance.memory`。
- 禁补（Firefox 独有）：`navigator.buildID`、`InstallTrigger`。

自检：Firefox UA 下 `grep -c "userAgentData\|navigator\.connection\|getBattery\|window\.chrome\|performance\.memory"` 必须 `= 0`。

## 六、喂入-截出（Feed-Intercept）策略

> 吸收自 hello_js_reverse_skill 的「喂入-截出」与 XHR / fetch 双通道拦截。

目标 JS 通过拦截 XHR / fetch 在请求时自动追加签名。补环境时在沙箱内发起请求，让拦截器自动追加签名，再 Hook 截获最终 URL / Header 中的签名值。

```js
// 在 jsdom 内发 XHR，触发拦截器自动追加签名
win.eval(`(function(){
  var x = new XMLHttpRequest();
  x.open('GET','${fullUrl.replace(/'/g, "\\'")}',true);
  x.send();
})()`);

// 通过已注册的 URL 捕获数组取出签名
setTimeout(() => {
  for (const url of win.__capturedUrls) {
    const m = url.match(/[&?]a_bogus=([^&]+)/);
    if (m) { aBogus = decodeURIComponent(m[1]); break; }
  }
  resolve(aBogus);
}, 500);
```

### 双通道拦截（XHR + fetch）

有的 SDK 同时修改 `XMLHttpRequest.prototype.open` 和 `window.fetch`：XHR 拦截器把签名追加到 URL，fetch 拦截器把签名注入 Header。必须**同时** Hook 两个通道：

- Hook XHR：拦截 `XMLHttpRequest.prototype.open`，收集 URL 中的签名参数。
- Hook fetch：拦截 `window.fetch(url, opts)`，从 `opts.headers['X-Gnarly']` 等取 Header 签名。

### Hook 加载顺序（关键）

```
我方 Hook → SDK 加载（保存我方 Hook 后的引用）→ 目标 JS 调用时经过我方 Hook
```

如果 SDK 先加载再 Hook，SDK 保存的是 Hook 前的原始 `open`，我方 Hook 截获不到最终 URL。因此：

- XHR / fetch Hook 必须在目标 SDK **加载前**安装。
- 环境补丁（`patchEnvironment()`）必须在任何目标 JS 脚本 eval 之前执行。
- 配置驱动的拦截器（`_SdkGlueInit` / `cacheOpts`）要先完成初始化，业务路径才被注册、拦截器才会触发。

### SDK 初始化配置（cacheOpts）

> 吸收自 hello_js_reverse_skill 的 cacheOpts 踩坑。旧版只需 `bdms.paths`，新版必须同时传 `cacheOpts`（路径注册 + 缓存策略），否则拦截器不触发。

```js
window._SdkGlueInit({
  cacheOpts: {
    paths: ['^/api/v1/', '^/aweme/v1/', '^/web/api/'],
    ttl: 300,
  },
}, {
  bdms: { paths: ['^/aweme/v1/', '^/web/'] },
});
```

## 七、禁动清单（jsdom 补丁的"不要碰"）

> 吸收自 hello_js_reverse_skill 的禁动清单。每一条都源自真实踩坑——改动后签名正常生成但服务端静默拒绝（HTTP 200 + 空 body）。

1. **不要替换 `win.Error` 构造函数**。JSVMP 内部多处用 `Error` 做类型分发，替换会让所有 `instanceof Error` 走向不确定、连锁打乱内部状态。先证明确实读 `Error.stack` 再动手。
2. **不要改任何 `constructor.name`**（如 `document.constructor.name = 'HTMLDocument'`）。改它不会让 `document.constructor === window.HTMLDocument` 成立，反而让 `Object.prototype.toString.call(document.constructor)` 返回非标准字符串。要 `[object HTMLDocument]` 只走 `Symbol.toStringTag` 路线。
3. **不要改 `Object.prototype` 层**。`scanPrototypeChain` 必须有 `if (proto === Object.prototype) break;` 边界，否则任何对象的 toString 都会跑进你的代码。
4. **不要只把 `Symbol.toStringTag` 设在实例上**。`Object.prototype.toString.call(document)` 的算法是原型链查找，要设到 prototype 上。
5. **不要对 `Function.prototype.toString` 做第二次覆盖**（见第三节）。

## 八、minimal vm 沙箱（无 jsdom 依赖时的最小环境）

> 吸收自 hello_js_reverse_skill 的 `environment-patch.md`。当目标 JS 环境依赖少、不需要完整 DOM 时，可用 `node:vm` 建最小沙箱，避免引入 jsdom。

```js
const vm = require('vm');

function createMinimalSandbox(options = {}) {
  const sandbox = {
    window: null, self: null, globalThis: null,
    document: {
      cookie: options.cookie || '',
      createElement: (tag) => ({ tagName: tag.toUpperCase(), style: {}, setAttribute: () => {}, getAttribute: () => null, appendChild: () => {}, innerHTML: '', src: '' }),
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      head: { appendChild: () => {} }, body: { appendChild: () => {} },
      location: { href: options.url || 'https://example.com', hostname: 'example.com' },
      referrer: '', title: '', readyState: 'complete',
    },
    navigator: {
      userAgent: options.userAgent || 'Mozilla/5.0 ...', appCodeName: 'Mozilla',
      appName: 'Netscape', appVersion: '5.0', platform: 'MacIntel',
      language: 'zh-CN', languages: ['zh-CN', 'zh', 'en'],
      cookieEnabled: true, onLine: true, plugins: { length: 3 }, mimeTypes: { length: 4 },
      webdriver: false, hardwareConcurrency: 8, maxTouchPoints: 0,
    },
    location: { href: options.url || 'https://example.com', protocol: 'https:', host: 'example.com', hostname: 'example.com', port: '', pathname: '/', search: '', hash: '', origin: 'https://example.com' },
    screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1055, colorDepth: 24, pixelDepth: 24 },
    setTimeout, setInterval, clearTimeout, clearInterval,
    String, Array, Object, Math, Date, RegExp, JSON, Map, Set, WeakMap, WeakSet,
    parseInt, parseFloat, isNaN, isFinite, NaN, Infinity, undefined,
    encodeURIComponent, decodeURIComponent, encodeURI, decodeURI, escape, unescape,
    Error, TypeError, RangeError, SyntaxError, ReferenceError,
    ArrayBuffer, Uint8Array, Int32Array, Float64Array, DataView, Promise, Proxy, Reflect, Symbol,
    btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
    atob: (b64) => Buffer.from(b64, 'base64').toString('binary'),
    console,
  };
  sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
  sandbox.top = sandbox; sandbox.parent = sandbox; sandbox.frames = sandbox;
  return sandbox;
}

// 清除 Node 特征
function hideNodeFeatures(sandbox) {
  for (const g of ['process', 'module', 'exports', 'require', 'global', '__filename', '__dirname', 'Buffer']) {
    try { delete sandbox[g]; } catch { try { sandbox[g] = undefined; } catch {} }
  }
}
```

### WASM 环境补全（vm 沙箱场景）

> 吸收自 hello_js_reverse_skill 的 WASM 补全。目标 JS 依赖 WASM 时，加载需要补默认 imports（`env` / `wasi_snapshot_preview1`），不能直接用裸 `WebAssembly.instantiate`。

```js
const result = await WebAssembly.instantiate(wasmBuffer, {
  env: { memory: new WebAssembly.Memory({ initial: 256 }), table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' }), abort: () => { throw new Error('WASM abort'); } },
  wasi_snapshot_preview1: { fd_write: () => 0, fd_close: () => 0, fd_seek: () => 0, proc_exit: () => {} },
});
```

wasm-bindgen / Emscripten 场景：补 `Window` 构造器 + `instanceof` 链（wasm-bindgen），或补 `Module` 全局对象（Emscripten）。

### XHR stub（vm 沙箱拦截）

> 吸收自 hello_js_reverse_skill 的 XHR stub。目标是"记录拦截、不真实发网"。

```js
function createXHRStub(interceptor) {
  return class XMLHttpRequest {
    constructor() { this.readyState = 0; this.status = 0; this.responseText = ''; this.response = ''; }
    open(method, url) { this._method = method; this._url = url; this.readyState = 1; }
    setRequestHeader(name, value) { (this._headers = this._headers || {})[name] = value; }
    send(body) {
      if (interceptor) interceptor({ method: this._method, url: this._url, headers: this._headers, body });
      this.readyState = 4; this.status = 200;
      if (this.onreadystatechange) this.onreadystatechange();
      if (this.onload) this.onload();
    }
    addEventListener(event, handler) { this['on' + event] = handler; }
  };
}
```

## 九、Node 泄露阻断（vm / jsdom 通用）

> 吸收自 hello_js_reverse_skill 的环境检测绕过清单。目标 JS 可能通过 `typeof process` 等检测是否在 Node 中。

| 检测项 | Node 默认 | 应补为 |
|---|---|---|
| `typeof window` | `undefined` | `object` |
| `typeof document` | `undefined` | `object` |
| `typeof navigator` | `undefined` | `object` |
| `typeof process` / `module` / `global` | `object`（暴露） | 删除 / `undefined` |
| `navigator.webdriver` | N/A | `false` / `undefined` |
| `window.chrome` | N/A | `{ runtime: {} }` |
| `navigator.plugins.length` | N/A | `> 0` |

## 十、服务端静默拒绝与失败排查

> 吸收自 hello_js_reverse_skill 的错误处理 / 环境依赖判断。

| 现象 | 最可能原因 | 排查方向 |
|---|---|---|
| 签名长度正确但服务端拒绝 | 环境指纹不匹配（jsdom 伪装不一致） | 重新 diff，检查致命级差异 + UA 分支混补 |
| 签名长度不对 | 算法参数错误 | 检查输入拼接 + 编码 |
| HTTP 200 + 空 body | 环境检测失败（最常见！） | 不是算法错，是环境指纹不对 |
| HTTP 403 / 412 | 签名格式错误或 Cookie 缺失 | 检查签名 + Cookie 链 |
| 本地成功但 Docker 失败 | 时区 / locale / 随机数种子 | 固定时区 + 检查 Math.random |
| 第一次成功后续失败 | Cookie / Token 过期 | 检查动态 Cookie 刷新链 |
| 签名 192 字符但空 body | 环境补丁混入了违规项 | 逐条检查「禁动清单」+ UA 分支矩阵 |

### 环境补丁最小化原则

> 吸收自 hello_js_reverse_skill 的最小化原则。jsdom 补丁**行数越多越不稳**，每一行"保险代码"都可能引入新的泄露点。

**加代码的唯一合法循环**：

1. 用 trace / Hook 证明目标 JS 确实读了某个 API / 属性。
2. 用取证浏览器确认沙箱中该 API 的值与真实浏览器不同。
3. 加最小化 stub（只 stub 真正被读的属性 / 方法）。
4. 跑真实请求 / fixtures 验证成功。
5. 保留；否则立即回退。

**禁止**："先加上保险"式编码。没有证据的补丁 = 未知泄露点。

## 十一、与 web-js-env-patcher 已有体系的关系

- **优先级**：本 Skill 默认不用 jsdom 做最终交付的指纹方案。jsdom / vm 环境伪装主要用于"运行 JSVMP 类签名黑箱"这一特定场景；凡是本 Skill 的 addon / xbs native-first 可表达的 WebAPI，仍优先 addon。
- **指纹值**：jsdom / vm 只是运行载体。Canvas / WebGL / Audio / 字体 / DOM 几何终端值一律按 `fingerprint-value-replay.md` 用真实浏览器采样回放，`node-canvas` / `headless-gl` 只能离线探索，不能当最终一致方案。
- **对象真实性**：jsdom 补丁的 `markNative` / `Symbol.toStringTag` / prototype 边界，与本 Skill `env-native-protection.md` 的 NativeProtect / addon-first 是同一目标的不同载体；jsdom 场景受限于其 JS 实现，能做的真实性保护就是本文件这套。最终交付若不用 jsdom，仍按 `env-native-protection.md` 的 addon-first 执行。
- **验证**：jsdom 场景也要跑本 Skill 的 fixtures 验证（`fixture-validation.md`），以"沙箱生成的目标参数 == 浏览器真实样本"为完成标准，不以"不报错"为完成。

## 相关 reference

- `env-object-model.md`：对象补全硬性清单、构造函数行为、原型链、descriptor。
- `env-native-protection.md`：addon / xbs native-first、NativeProtect fallback、多通道 toString / DataCloneError。
- `fingerprint-value-replay.md`：指纹终端 API 真实采样回放（不要用 jsdom / node-canvas 结果）。
- `webapi-env-detection-matrix.md`：iframe / Worker / DOM / writer 行为一致性门禁。
- `high-strength-browser-detection.md` / `high-intensity-env-diff.md`：高强度风控通用排查。
- `env-debug-loop.md`：Node 补环境调试循环与双模式策略。
