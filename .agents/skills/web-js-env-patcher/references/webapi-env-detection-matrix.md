# WebAPI 环境检测矩阵门禁

本文件用于解决另一类常见失败：Trace 已经列出了 API，补环境也实现了 API，但目标仍因 iframe、Worker、PerformanceTimeline、DOM/CSSOM、枚举、任务队列或 writer 分支行为不像真实浏览器而进入错误分支。Trace API 覆盖矩阵回答“访问了什么”，本矩阵回答“访问到的浏览器行为是否一致”。

本文件只用于授权范围内的网页端 Node.js 补环境、真实浏览器基线采样和 Node 行为 diff。不得把它解释为厂商专用绕过流程；遇到 JSVMP / opcode / 字节码解释器时仍只记录环境行为、请求链和 writer 分支，不主动分析虚拟机源码。

## 触发条件

出现以下任一信号时，在进入真实请求、长跑验证或 final writer 判定前必须建立 WebAPI 环境检测矩阵：

- Trace / 阶段报告中出现 `iframe`、`srcdoc`、`contentWindow`、`contentDocument`、`defaultView`、`document.write`、`document.close`。
- 出现 `Worker`、`SharedWorker`、`DedicatedWorkerGlobalScope`、`postMessage`、`MessageChannel`、`MessagePort`、`terminate`、Worker 内 timer 或 Worker 内 `performance`。
- 出现 `PerformanceObserver`、`PerformanceObserverEntryList.getEntries`、`PerformanceResourceTiming`、`PerformancePaintTiming`、`performance.mark`、`performance.getEntries*`、XHR / image / favicon resource timing。
- 出现 `XMLHttpRequest`、`fetch`、`Request`、`Response`、`Headers`、`navigator.sendBeacon`，且目标路径依赖动态资源、Cookie、challenge、telemetry、resource timing 或 writer 分支。
- 出现 `Object.keys`、`Object.getOwnPropertyNames`、`Reflect.ownKeys`、descriptor、getter / setter、prototype walk、brand check、`Function.prototype.toString` 多通道。
- 出现 `this.__xxx`、`this._xxx`、`__readyState`、`__headers`、`__children`、`Object.defineProperty(obj, "__xxx")`、`defineValue(obj, "_xxx")` 等浏览器对象私有状态泄露迹象。
- 出现 `structuredClone`、`DataCloneError`、`MessagePort.prototype.postMessage(fn)`、Error stack / message 差异。
- 出现 DOM / CSSOM 完整性检查：`DOMParser`、`innerHTML`、Comment/Text 原型、`HTMLUnknownElement`、`textarea`、`option`、`select`、`HTMLCollection`、`ShadowRoot`、`CSSStyleSheet.insertRule`、`CSSRuleList`、`getComputedStyle`、`document.links/images/forms/title/on*`。
- 出现 writer 分支差异，例如同一链路中 Node 停在 continuation / reload writer，而真实浏览器进入 form writer / final writer。

## 必须产物

触发本门禁后，进入真实请求验证前至少生成：

```text
case/fixtures/browser-env-detection-baseline.json
case/tmp/node-env-detection-audit.json
case/notes/webapi-env-detection-matrix.md
```

如果已经有高强度 diff 文件，也要在 `case/notes/high-intensity-env-diff.md` 中引用本矩阵结论。若暂时不能生成真实浏览器 baseline，必须在矩阵中标记为 `needs-browser-baseline` 并说明阻塞原因，不得把 Node probe 通过当作真实浏览器一致。

矩阵状态不能自行证明一致。浏览器 baseline 与 Node audit 的每个触发类别必须包含同名 probe 和实际观测值；`check_webapi_env_detection_matrix.js` 将深度比较观测结果。空类别数组、只有 `status: matched` 或只有证据路径而没有结果均视为未审计。两端必须记录相同 `probeSuiteVersion` 与 `probeSourceHash`，并用 case 内的 `probeSourceFile` 让门禁重算真实 SHA-256，证明运行的是同一份 probe 源码；Node audit 还必须记录 `runtimeSourceHash`、`probeVersion` 和可信 `generatedBy`，源码变化后旧 audit 失效。

`browser-env-detection-baseline.json` 至少记录：

```json
{
  "schemaVersion": "webapi-env-detection-baseline/v2",
  "baselineId": "fp-example-001",
  "capturedBy": "ruyiPage+RuyiTrace",
  "browser": "Firefox",
  "probeSuiteVersion": "webapi-realm-lifecycle/v2",
  "probeSourceFile": "fixtures/webapi-env-probe-suite.js",
  "probeSourceHash": "<same-sha256-on-browser-and-node>",
  "categories": {
    "iframe-realm": [
      {
        "id": "global-relations",
        "capability": "realm-global-relations",
        "observation": {"selfIsWindow": true, "parentIsMain": true, "defaultViewIsFrame": true}
      }
    ],
    "worker-task": [
      {
        "id": "immediate-terminate",
        "capability": "worker-terminate-immediate",
        "observation": {"messagesAfterTerminate": []}
      }
    ],
    "message-lifecycle": [
      {
        "id": "sender-close",
        "capability": "message-port-close-sender",
        "observation": {"delivered": false}
      }
    ],
    "performance-timeline": [{"id": "resource-entry-order", "observation": {"entries": []}}],
    "dom-cssom": [{"id": "current-path-involved", "observation": {"involved": false}}],
    "dom-crud": [
      {
        "id": "valid-combinator-selector",
        "capability": "dom-selector-validity",
        "observation": {"selector": "div > span", "throws": false}
      }
    ],
    "event-clone-error": [{"id": "xhr-brand", "observation": {"brand": "[object XMLHttpRequest]"}}],
    "xhr-fetch-session-bridge": [{"id": "network-mode", "observation": {"mode": "live-session-bridge"}}],
    "object-shape": [{"id": "xhr-prototype-chain", "observation": {"chain": ["XMLHttpRequest", "XMLHttpRequestEventTarget", "EventTarget", "Object"]}}],
    "private-state-leakage": [{"id": "xhr-private-own-keys", "observation": {"keys": []}}],
    "clock-timer": [{"id": "current-path-involved", "observation": {"involved": false}}],
    "writer-branch": [{"id": "final-writer-path", "observation": {"writer": "form-writer"}}]
  }
}
```

`node-env-detection-audit.json` 至少记录同一组类别、同一 probe 名称、同一 `capability` 和 Node 实际观测值，并额外包含 `generatedBy`、`probeVersion`、`probeSuiteVersion`、`probeSourceFile`、`probeSourceHash`、`runtimeSourceHash`。`not-involved` 也必须以明确 probe 观测表达，不能使用空数组。

以下字段才算实际观测：`observation`、`observed`、`result`、`value`、`output` 或 `expected`。`evidence`、`notes`、`status`、文件路径和人工结论不属于实际观测。

## 状态枚举

矩阵中每个检测项必须选择一个状态：

| 状态 | 含义 | 是否允许真实请求 |
|---|---|---|
| `matched` | 浏览器 baseline 与 Node audit 一致 | 允许 |
| `accepted-diff` | 差异已评估为不影响当前路径，并有证据 | 允许，但必须写风险 |
| `not-involved` | 当前 Trace / writer 路径未涉及 | 允许 |
| `needs-browser-baseline` | 缺真实浏览器基线 | 不允许 |
| `needs-node-audit` | 缺 Node 同 probe audit | 不允许 |
| `mismatch` | 存在未修复行为差异 | 不允许 |
| `native-capability-gap` | 当前 JS / addon / xbs 均无法可靠表达 | 不允许，进入 native 能力缺口闭环 |
| `unknown` | 未判断 | 不允许 |

Realm identity、对象形状、私有状态、Worker/MessagePort 生命周期、DOM CRUD、当前网络 writer 和请求语义属于 P0/P1 时不得使用 `accepted-diff`。这些差异必须修复、补采真实 baseline，或进入明确的 native capability gap。

## 强制 capability

触发下列类别时，browser 与 Node 两端都必须包含这些 capability；probe 名称可以按项目细化，但 capability id 不得省略：

| 类别 | capability |
|---|---|
| `iframe-realm` | `realm-global-relations`、`realm-ecma-constructor-isolation`、`realm-webapi-constructor-isolation`、`realm-object-isolation`、`realm-document-relations`、`realm-navigation-lifecycle` |
| `worker-task` | `worker-global-surface`、`worker-constructor-isolation`、`worker-object-isolation`、`worker-message-order`、`worker-terminate-immediate`、`worker-terminate-deferred` |
| `message-lifecycle` | `message-order`、`message-port-start`、`message-port-close-sender`、`message-port-close-receiver`、`message-port-transfer` |
| `dom-crud` | `dom-tree-mutation`、`dom-live-collections`、`dom-selector-validity`、`dom-html-parsing`、`dom-document-relations`、`dom-mutation-observer` |

## 必查类别

### iframe / Window realm

检查：

- `iframe.contentWindow` / `contentDocument` / `defaultView` 关系。
- `srcdoc`、sandbox、`document.write()`、`document.close()`、load 事件顺序。
- 主窗口与 iframe Window 的 `eval`、`fetch`、`location`、`navigator` descriptor。
- 主窗口与 iframe 的 `Object/Function/Array/Promise`、`Event/EventTarget`、`URL/Blob`、`Headers/Request/Response/XHR` 构造器 identity 必须不同。
- iframe 的 `self/window/globalThis/frames` 指向自身，`parent/top` 指向正确上层；`document.defaultView/contentWindow/contentDocument/frameElement` 关系必须闭合。
- 允许共享同源 Cookie/Storage 后端和 TLS Session，但 navigator/performance/crypto/storage wrapper/fetch/timer 等公开对象不能直接复用主 Realm 实例。
- `Object.keys`、`Object.getOwnPropertyNames`、`Reflect.ownKeys` 的数量、顺序和过滤策略。
- `document.all`、`currentScript`、`readyState`、`defaultView` 是否按目标浏览器可见。

禁止为了推进链路全量放开 raw ownNames；只能基于浏览器 baseline 做窄范围 A/B，并记录为什么该项可见。

### Worker / Message task queue

检查：

- Worker scope 是否有独立 `performance`、`timeOrigin`、`performance.now()` 序列和 UA / baseline 选择。
- Worker 的 `self/globalThis`、构造器图和实例必须独立；Window-only API 必须缺失，主 Window 也不得错误暴露 WorkerGlobalScope-only API。
- Worker 内 `setTimeout` / `clearTimeout` 是否绑定 Worker 私有状态。
- `Worker.prototype.terminate()` 后 pending timer、延迟 `postMessage` 是否清理。
- 立即 terminate 与延迟 terminate 必须分开检测。
- `WorkerGlobalScope.self.postMessage()` 与 `MessagePort.prototype.postMessage()` 是否后续 task 派发，而不是同步栈内派发。
- `addEventListener` / `removeEventListener` / `dispatchEvent` 是否支持 listener object、capture、once、passive、stopImmediatePropagation。

Promise resolved、Worker 回包出现或 probe 不报错都不能单独视为完成；必须验证同步 / 异步顺序和 terminate 后行为。

### MessagePort / postMessage 生命周期

检查：

- `postMessage` 相对当前同步栈、Promise microtask、queueMicrotask、timer 的顺序。
- `start()` 与设置 `onmessage` 的隐式启动行为。
- sender close、receiver close、双方 close、消息入队后 close。
- transfer 后原端口是否失效、目标端口是否保持 entangled。
- `close()` 是否清除监听、待派发 task 和 peer 关系；不能只在发送时检查“对端是否 closed”。

### Performance timeline / resource timing

检查：

- `performance.getEntries()`、`getEntriesByType()`、`getEntriesByName()` 的排序。
- `PerformanceObserver.observe()` 对 `buffered` 与非 `buffered` 的差异。
- `PerformanceObserverEntryList.getEntries()` 回调内容和触发时机。
- XHR readyState 4 / load / loadend 前后 resource entry 是否可见。
- image、favicon、Turnstile / third-party script、flow、`/d/`、`/peek` 等资源是否进入正确 timeline。
- `PerformanceEntry.toJSON()`、paint、mark、resource entry 序列化是否一致。

禁止无条件 synthetic 初始 callback；禁止用插入顺序替代浏览器 `startTime` 排序，除非目标 baseline 证明如此。

### DOM / CSSOM 短值行为

检查：

- `document.createElement(tag)` 的 tag 到构造器映射，特别是未知 tag、`html`、`textarea`、`option`、`select`、`form`、`input`、`img`、`iframe`。
- `innerHTML` / `DOMParser.parseFromString()` 后 Text、CDATA、Comment、Element 原型与 `[object Xxx]`。
- `appendChild/removeChild/insertBefore/replaceChild/replaceChildren` 的移动、重复插入、DocumentFragment 展开、错误类型和 ownerDocument/isConnected 更新。
- `childNodes`、`children`、`getElementsBy*` 的 live 语义与 `querySelectorAll` 的 static 语义。
- 合法选择器如 `div > span` 不得错误抛出 `SyntaxError`；非法选择器必须按浏览器 baseline 抛错。
- HTML parser 不得丢弃 Comment/Text；`innerHTML`、clone/import/adopt 后 document/parent/sibling 关系必须一致。
- `MutationObserver` 的 record 内容、合并策略和 microtask 时序。
- `HTMLCollection`、`NodeList`、`HTMLOptionsCollection` 是否 native-like，是否实时或快照符合目标路径。
- `attachShadow()`、`ShadowRoot.host/mode`、`shadowRoot` descriptor。
- `CSSStyleSheet.insertRule()`、`CSSStyleRule.selectorText/style`、`CSSRuleList.item()`、`getComputedStyle()` 对目标选择器的最小一致性。
- `document.links/images/forms/title/on*`、`document.cookie` 可见性与 descriptor。

### 风控 / 验证码类目标的高频环境检测点（B23）

> **本节不新增触发类别**：下列每一项都按最后一列映射到上面既有的 `CATEGORIES`
> （校验器 `scripts/check_webapi_env_detection_matrix.js` 的枚举是闭集，不要自创 id）。
> 来源：`52pojie-2074942`（hCaptcha 的环境监测点）、`52pojie-1868945`（易盾无感 `fp` 补环境）。

| # | 检测点 | 浏览器侧"正确形态" | 映射类别 |
| --- | --- | --- | --- |
| 1 | **Math 精度** | `[Math.cos(13*Math.E), Math.pow(Math.PI,-100), Math.sin(39*Math.E), Math.tan(6*Math.LN2)]` —— 浏览器与 Node 的结果**有微小差异**，必须回放浏览器真实值 | `object-shape`（值级 baseline） |
| 2 | **`getImageData` ↔ `fillStyle` 自洽** | 流程：`clearRect` → 画布宽高设为 2 → 设 `fillStyle`（**随机色**）→ 填充 → `getImageData`。返回值**必须与本次 `fillStyle` 一致** ⇒ 按 rgb 动态解析，**不能写死**（`a` 通道观察到恒为 1） | `dom-cssom` |
| 3 | **系统色 → rgb 转换** | `div.style.color = 'ActiveBorder'` 后 `getComputedStyle(div).getPropertyValue('color')` **必须是 `rgb(...)`**（不是关键字）。实测同一系统色在 **Firefox 与 Edge 下 rgb 值不同**，所以判据是"**形态必须是 rgb**"而不是某个具体值 | `dom-cssom` |
| 4 | **字体指纹** | `measureText` 取 **7 个**宽度值；另有 **92 个 emoji** 的测量数据 | `dom-cssom` |
| 5 | **音频指纹** | `OfflineAudioContext` 渲染后对两组数据取 `Math.abs` 求和（可做轻微扰动模拟不同设备） | `object-shape`（值回放；枚举无音频类别，按"值级 baseline"归此） |
| 6 | **`toDataURL`** | 同一路径会取**四次**（不同 `hsw.js` 获取顺序可能不同） | `dom-cssom` |
| 7 | **Worker / SharedWorker** | 指纹数组里有两项来自它们；**不要求新开 VM**：只要能触发 `message` 事件、收到消息即可 | `worker-task` |
| 8 | **描述符批量检测** | 会对 **15 个方法**集中取描述符，结果必须与浏览器**逐项一致**（"坐得住就能补出来"，是本族**最容易出图**的一项） | `object-shape` |

**三条取证口径（同一来源实测）**：

1. **CSP 不要整段删**：只删最后那处 script 校验，`<meta http-equiv="Content-Security-Policy"
   content="object-src 'none'; base-uri 'self'; worker-src blob:">` **这两项不能删**；带 `integrity` 的地方全部删掉。
2. **wasm 只保留需要的那次**：该指纹的 wasm 会被调用两次（第一次初始化、第二次生成加密数据）；
   **初始化那次可以不实现**，日志量直接减半（对照环境时更省事）。
3. **先做"写死能否过"的二分**：把浏览器的 `vm_data` / `motionData` 与指纹数组**先原样写死**
   （注意转义字符）；"写死能过、不写死过不了" ⇒ 问题一定在**你生成的数组**上。
   反之若写死也过不了，就不要继续在数组里挖，先查链路/时序。

**一个必须避开的"看起来能用"的坑（`1868945`）**：直接用 **jsdom 的 `getComputedStyle`** 会被立刻识破
（原文口径："jsdom 被检测烂了"）。该检测点还伴随 `localStorage` / `body` / `openDatabase` 一类
DOM 存在性检测 —— 这些都必须按真实浏览器 baseline 回放，而不是"返回一个空对象"，
详见 `references/env-object-model.md` 的 `CSSStyleDeclaration / getComputedStyle` 一行。

### ★★★ 评分型风控 SDK 的采集面与「耗时」通道（B42 新增）

> 来源：`52pojie-1104122`（数美 `fpv2.js`，douyu 登录页引入）、`52pojie-1537322`（iOS `SAKGuard` 设备风控）。
> **本节同样不新增触发类别**；重点是**两张字段清单**与**一条容易被全体忽略的检测通道**。

| # | 检测点 | 浏览器侧"正确形态" | 映射类别 |
| --- | --- | --- | --- |
| 9 | **`canvas` 指纹**（`smdata.canvas`） | 与 `toDataURL` 同类，但**单独成一个上报字段** ⇒ 补环境时它必须与 `toDataURL` **同源一致** | `dom-cssom` |
| 10 | **`plugins` 列表** | 不是空数组就能过：**长度、顺序、每项的 `name/description/filename/length`** 都要与 baseline 同形 | `object-shape` |
| 11 | **四个语言字段** | `lang` / `userLang` / `browserLang` / `systemLang` + `langs` 数组 —— **五个值的组合关系**必须自洽（不能全填同一个） | `object-shape` |
| 12 | **`res` / `clientSize` / `timezone`** | 分辨率、可视区、时区三者**互相自洽**（`res` 说 1920×1080 而 `clientSize` 说 375×667 会被对不上） | `object-shape` |
| 13 | **★★★ 执行耗时（`time`）** | 数美的 `smdata.time` 不是"时刻"，而是 **`(+new Date()) - <函数开始时刻>`**，即**这次执行花了多少毫秒**。⇒ **补环境跑得太快本身就是异常信号** | `clock-timer` |

> ★★★ **第 13 条是本类目标最容易被漏掉的一维**：
> **"字段值全对"不代表"通过"** —— 评分型风控会拿**自身执行耗时**做"是否被 hook / 是否真机"的判据。
> ⇒ 补环境侧的对策只有两条：① **不要为调试在关键路径插 `console.log` / 断点**（会显著拖慢）；
> ② **不要为了"快"而把 SDK 的异步/延时步骤整段删掉**（会显著加快）。
> ⇒ 落地口径：**把 `time` 的"量级"也写进 baseline 矩阵**（不要求逐毫秒一致，要求量级同阶）。
> ★ 同族：`1537322` 的 iOS 侧有 `m148`/`m149`（**浮点秒**）与 `m150`/`m200`（**整数**）并存，
> 也是"时间通道不止一个"的实证。

**★★★ 关键数据落多处缓存（复现时最容易只做一半）**：

```text
数美：deviceId 同时写 cookie / local / session / flash / userData，key 统一是 smidV2；
      ★ 而且 **每次运行都会重新"算"一个 deviceId，但上报的是缓存里的那个**
      ⇒ 判据：「算了却不用」 ⇒ 复现时要**同步所有落地 + 让"读缓存"先命中**
SAKGuard（iOS）：本地 ID 走 **keychain**（`generateLocalID` → `localID`），**卸载重装不换**
```

> ★★ 与 `references/fingerprint-baseline-consistency.md` 的分工：
> 那里讲"多入口读到同一个值"的**一致性**；这里补的是"**同一份数据要写进多个介质**"这一半。


检查：

- `structuredClone(fn)`、`MessagePort.prototype.postMessage(fn)` 的错误 name / message / stack。
- `Function.prototype.toString.call(fn)`、`fn + ""`、`String(fn)`、保存旧 FTS 后调用。
- 构造函数直接调用 / `new` 调用错误差异。
- `Object.getOwnPropertyDescriptor`、`__lookupGetter__`、`__lookupSetter__`、`hasOwnProperty`、`propertyIsEnumerable`、`for...in`。
- `Object.prototype.toString.call`、`Symbol.toStringTag`、`instanceof`、prototype walk。

### XHR / fetch session bridge

检查：

- `XMLHttpRequest.send()` / `fetch()` / `navigator.sendBeacon()` 是否为 `offline-fixture` 诊断模式，还是 `live-session-bridge` 真实请求模式。
- 真实请求模式是否通过同一 CycleTLS / impers / curl-cffi-node / curl_cffi / cffi_curl / cyCronet Session 发送。
- Python `curl_cffi` 场景是否由 `final.py` 持有唯一 session，并通过 IPC 服务 Node JS runtime 的 XHR/fetch 请求。
- Cookie jar、`document.cookie`、`Set-Cookie`、`getResponseHeader("set-cookie")`、Response headers、body、readyState / Promise / event 顺序是否与浏览器 baseline 一致。
- XHR / fetch 请求是否产生正确的 PerformanceResourceTiming 可见性。

禁止把 fixture / 默认 200 / mock response 写成真实请求成功；禁止在 XHR/fetch 内部直接调用 Node 宿主 `fetch`、`http`、`https`、`axios` 或 Python 普通 `requests`。

### Object shape

检查：

- `Object.keys`、`Object.getOwnPropertyNames`、`Object.getOwnPropertySymbols`、`Reflect.ownKeys` 的数量、顺序和字段名。
- `Object.getOwnPropertyDescriptor`、`hasOwnProperty`、`propertyIsEnumerable`、`for...in`、`in`、`__lookupGetter__`、`__lookupSetter__`。
- 构造函数、prototype、实例对象、集合对象、iframe realm、Worker realm 的 prototype walk。
- `Object.prototype.toString.call(obj)`、`Symbol.toStringTag`、`constructor.name`、`instanceof`。

如对象形状涉及内部状态，应同时生成 `object-shape-audit.md`、`browser-object-shape-baseline.json` 和 `node-object-shape-audit.json`。

### Private state leakage

检查：

- 浏览器可见对象是否存在自定义 `_` / `__` 自有属性，包括 non-enumerable 属性。
- 是否使用 `this.__state`、`this._headers`、`Object.defineProperty(obj, "__readyState")`、`defineValue(obj, "_store")` 或自定义 Symbol 保存内部状态。
- 内部状态是否迁移到 addon / xbs private API、原生内部槽或模块级 `WeakMap`。

发现 `_` / `__` 私有状态泄露时直接阻断；不能用 `enumerable:false` 作为豁免。

### Clock / timer

检查：

- `Date.now()`、`new Date()`、主线程 `performance.now()`、Worker `performance.now()` 是否来自同一 baseline 策略。
- 虚拟 timer driver 是否只运行到期 timer，不因 sleep cap 把 10s / 30s timer 一轮快进。
- `queueMicrotask`、Promise job、timer task、MessagePort task、PerformanceObserver callback 的相对顺序。

### Writer branch

检查：

- 请求链中每个关键响应对应的 writer 类型：continuation program、reload writer、form writer、final writer。
- Node 与真实浏览器在 final writer 前 300 到 1000 个环境事件的类别差异。
- 是否出现 `HTMLFormElement.submit(true)`、hidden input 创建、`cf_chl_rc_ni` 删除、`Location.reload` 等分支证据。
- 不得把拿到 Cookie、Set-Cookie 或 reload writer 响应写成最终成功；必须记录 writer 类型。

## 阻断规则

- 存在 `mismatch`、`needs-browser-baseline`、`needs-node-audit`、`native-capability-gap` 或 `unknown` 的 P0/P1 检测项时，不得执行真实请求验证、不得宣称 final writer 已闭环。
- 只有类别名称或手工 `matched`、没有逐 probe 浏览器值和 Node 值时，直接阻断。
- browser/Node 的 `probeSuiteVersion`、`probeSourceFile` 或 `probeSourceHash` 缺失，hash 不一致，源文件不在 case 内，或声明 hash 与实际文件不一致，直接阻断。
- iframe/Worker 构造器或公开对象复用主 Realm、MessagePort 只实现单侧 close、DOM probe 把合法 selector 当非法、HTML parser 丢 Comment，直接阻断。
- 存在 `xhr-fetch-session-bridge` 阻断项时，不得宣称 TLS 指纹已解决；fixture/mock 只能作为离线诊断结论。
- 存在 `private-state-leakage` 阻断项时，不得交付；必须迁移到 addon / xbs private API 或 WeakMap。
- 如果后续阶段新增 WebAPI 是因为本矩阵遗漏了已触发检测项，必须标为 `missed-from-webapi-env-matrix` 流程缺陷，并补写矩阵与代码变更记忆。
- 如果真实请求失败但矩阵未覆盖 Worker / performance / iframe / DOM/CSS / writer branch，而 Trace 或阶段报告已经出现这些信号，下一步只能补矩阵和离线 diff，不能继续盲目真实请求。

## 阶段报告记录模板

```markdown
## WebAPI 环境检测矩阵

- 矩阵文件：case/notes/webapi-env-detection-matrix.md
- 浏览器 baseline：case/fixtures/browser-env-detection-baseline.json
- Node audit：case/tmp/node-env-detection-audit.json
- baselineId：
- 触发类别：iframe-realm / worker-task / message-lifecycle / performance-timeline / dom-cssom / dom-crud / event-clone-error / xhr-fetch-session-bridge / object-shape / private-state-leakage / clock-timer / writer-branch
- 阻断项：无 / 列表
- writer 分支：真实浏览器 = form writer；Node = reload writer / continuation / form writer

| 类别 | 检测项 | 浏览器证据 | Node 证据 | 状态 | 处理 |
|---|---|---|---|---|---|
| worker-task | postMessage async task | fixtures/... | tmp/... | matched | 保持 |
```

## 检查命令

```bash
node scripts/check_webapi_env_detection_matrix.js --case-dir case --markdown
node scripts/check_webapi_env_detection_matrix.js --case-dir case --require --require-writer-branch --json
```

检查失败时，下一步只能补浏览器 baseline、Node audit、矩阵、native 能力缺口或离线 diff；不能继续真实请求验证。
