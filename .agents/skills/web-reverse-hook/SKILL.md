---
name: web-reverse-hook
description: 生成并注入页面级运行时 Hook 脚本，用于拦截加密库（CryptoJS/JSEncrypt/SM-crypto）、JSVMP 虚拟机探针、反调试综合防御绕过（debugger/console/窗口尺寸/强退/iframe原生借用）、关键数据流追踪（Promise/Cookie/Storage/网络/时间）、SPA 动态路由深度提取（Vue/React 路由表与守卫清除）以及**Vue/Vuex 运行时状态固化与组件注册表替换**（油猴 / 篡改猴 / userscript 注入范式）。当用户提到“hook CryptoJS”“拦截 RSA 明文密文”“国密 hook”“JSVMP 探针”“绕过反调试”“无限 debugger”“阻止跳转/关闭”“SPA 隐藏路由提取”“拦截 cookie/storage/promise”“改 Vuex state”“$store.state 改不动”“__vue__ 取不到”“registerComponent 替换组件”“videojs Player 注入”“油猴脚本怎么注入”“无直链视频怎么下”“video 的 src 是 blob:”“网络面板只有分片没有可播地址”“hook addSourceBuffer”“MSE 缓存视频”“控制台反检测”“devtools 检测”“注入太晚拦截不到”“jQuery 事件定位”“Event Listener 只有 jQuery 闭包”“jQuery hook 拿不到真实回调”“$._data events”、以及“cookie hook 装完页面就不正常”“覆盖 document.cookie 后其它 cookie 丢了”“油猴 @match 不生效/只命中首页”“setter 里 debugger 断太多次”“没有任何注入设施时怎么抢在页面代码之前”、反hook检测、Function.toString 检测、hook 被发现、closed shadow root、attachShadow 拿不到、shadowRoot 是 null、页面禁止复制、user-select none、去除登录弹窗、页面解锁配方、油猴去水印、倍速被重置、切屏即暂停、blob 图片导出 PDF 时使用。
---

# Web 运行时 Hook 脚本

生成可直接注入页面的 hook 脚本。本 skill 只负责**确定性脚本拼装与生成**：拦截逻辑以纯函数形式放在 `scripts/hooks/` 和 `scripts/probes/` 下，注入交给 browsercli 的通用工具完成（`evaluate_script` 或 `inject_hook`）。

## 核心预设能力一览

| 预设 Preset | 覆盖范围与核心交付 | 特性与绕过机制 |
|---|---|---|
| `cryptojs` | 对称加解密（AES/DES）入参、密钥、IV、模式与密文；**Hash / HMAC `finalize` 入参及输出哈希值** | 拦截 `Function.prototype.apply`，靠 `$super` 特征对齐内部分发 |
| `jsencrypt` | RSA 公私钥、明文与密文（Hex 与 Base64） | 兼容全局 `window.JSEncrypt` 与 **Webpack 闭包内的 RSA 实例特征侦听** (`hasRSAProp`) |
| `smcrypto` | 国密 SM2 加解密、SM3 哈希摘要、SM4 对称加解密 | 兼容全局 `window.sm*` 与 **Webpack 模块试算探测** (利用内置标准测试向量匹配闭包导出) |
| `antidebug` | **反调试综合防御与绕过**：无限 debugger、console 保护、窗口尺寸伪造、强退阻断、iframe 原生盗取防护 | 1. 清空 `eval`/`Function`/`constructor` 字符串中的 `debugger`<br>2. Proxy 保护 `console.log/trace`，静默 `clear()` 并抑制 `table()` 耗时探测<br>3. 固定 `innerWidth/innerHeight` 等避开控制台尺寸差检测<br>4. 阻断 `window.close`、`history.go/back`，支持 `onbeforeunload` 跳转断点<br>5. 伪装 `Function.prototype.toString` 并 Proxy `HTMLIFrameElement.prototype.contentWindow` 阻断干净原生借用 |
| `dataflow` | **关键数据流追踪、环境锁定与限流熔断**：Promise resolve、Cookie 条件断点、Storage、XHR/Fetch、原生编解码（JSON/Base64/URI）、定时器、调用栈行号回溯与防卡死熔断 | 1. 拦截 `Promise` 构造器，记录 resolve 值与调用栈，快速定位异步回调完成点<br>2. 监控 `document.cookie` setter，支持 `--cookie-match` 命中特定 key/value 时触发 `debugger`<br>3. 监控 `localStorage` / `sessionStorage` 增删改查<br>4. 拦截常用 Builtins：`JSON.parse/stringify`、`atob/btoa`、`encodeURI/decodeURI` 及 `setTimeout/setInterval`<br>5. 内置 `--limit-per-api`（默认 50 次）防死循环控制台刷屏卡死，`logAt` 自动提取触发文件名与行号<br>6. 固定 `Date.now`、`performance.now`、`Math.random` 支持脱敏复现 |
| `spa-vue` | **Vue 2/3 动态路由与接口深度探测** | 1. DOM BFS 扫描自动定位 Vue 2 (`__vue__`) 与 Vue 3 (`__vue_app__`) 根实例并读取完整路由表<br>2. **解除导航守卫**：拦截 `Array.prototype.push` 自动剔除 `beforeEach` 与 `beforeResolve`<br>3. 可选阻断 `router.push/replace/go` 强退 |
| `spa-react` | **React Fiber 树与路由扫描** | BFS 探测 React 根挂载点 (`__reactContainer$*`, `_reactRootContainer`)，深度扫描 Fiber 树属性，提取 Route 配置 |
| `spa-state` | **Vue/Vuex 运行时状态固化 + 组件注册表替换**（B28 新增） | 1. 定位 Vue 2 (`__vue__`) / Vue 3 (`__vue_app__`) 根实例并解析 `$store`（Vuex 取 `.state`，Pinia 取自身）<br>2. 按 `a.b.c=值` 固化状态；**用访问器挡回写**（SPA 重挂载后仍被强制回目标值）<br>3. 包装 `store.subscribe` 打印每次 mutation 的 `type` / `payload`（定位"到底是谁改的"）<br>4. 组件注册表探针（如 `window.videojs.registerComponent`）+ `replaceComponent(name, fn)`：自动接原型链并**搬运你自己写在 prototype 上的成员** |
| `mse-capture` | **MSE 流捕获（「无直链视频」落盘）**：代理 `MediaSource.prototype.addSourceBuffer` / `SourceBuffer.appendBuffer` / `endOfStream` / `URL.createObjectURL` | 1. 抓的是**播放器真正喂进去的字节流**，与分片走 fetch / XHR / 拼接都无关<br>2. 交付走 `window.__mse_capture_sink`（宿主接管）或 `<a download>`<br>3. `minBytes` 过滤小片、`maxTotalBytes`（默认 256MB）熔断防 OOM<br>4. 文件名与扩展名按 mime 派生（`video/mp4`⇒`.m4v`、`audio/mp4`⇒`.m4a`、`video/webm`⇒`.webm`）<br>5. 交付后**立刻释放**本地缓存；`pauseOnFinish` 可暂停 `<video>`<br>6. **blob 地址的顺序**：站点会先 `URL.createObjectURL(ms)` 再 `addSourceBuffer`，两者都要能记下（B29 真机跑出来的缺陷，Node 假环境测不出） |
| `jquery-handler` | **jQuery 事件定位**：包住 `$.fn` 上的事件方法，把每次注册的**回调**挂到全局变量并在元素上打属性 | 1. 绕开 jQuery 自建的事件机制 —— DevTools 的 Event Listener 面板只能定位到 jQuery 内部闭包，本预设把真实回调**直接暴露成全局变量**<br>2. 元素属性 `data-rjq-jquery-<事件>-event-function`，Elements 面板里即「该元素有哪些 jQuery 事件」<br>3. Console 里粘贴属性值 → 打印函数内存地址 → 点进去就是真实代码位置<br>4. 支持简写（`.click(fn)`）/ 通用（`.on('submit', fn)`）/ 事件映射对象（`.on({click: fn})`）/ 多事件串（`'click mouseover'`）/ 命名空间（`'submit.myNS'`）<br>5. **同一回调 + 同一事件只登记一个变量名**（真 jQuery 的 `.click` 内部转调 `.on`，不去重会登记两次）<br>6. `window.__jquery_handler_report()` 列出全部登记项（变量名 / 函数名 / 源码片段） |
| `jsvmp-proxy` | JSVMP 虚拟机探针（全覆盖） | 代理全局对象、`Function.prototype` 与 `Reflect` |
| `jsvmp-transparent` | JSVMP transparent 探针（无感） | 只替换原型 getter，痕迹更小，规避强指纹检测 |

---

---

## 油猴 / userscript 注入范式与运行时状态改写（B28）

这一节回答：**"页面上的某个判断，我不想改源码，只想在运行时把它按下去"** 该怎么做。
两个来源都出自实战（`52pojie-1830072` 百度文库复制、`52pojie-1669080` video.js 注入），
可复用的部分**不是某一行代码，而是两条通用范式**。

### 范式 A：状态树改写（Vuex / Pinia）

**为什么是改状态而不是改函数**：SPA 的界面行为由**状态**驱动，函数只是状态的消费者。
改了消费者，下一次渲染又用状态把行为算回来；改了状态，所有消费者一起变。

定位链条（按顺序走，别跳）：

1. **从交互入手**：点一下那个按钮 → 在事件监听器里断下 → 走到 Vue 的事件分发
   （`o._wrapper` → `n.fns` → render 模板函数 → `clickCopy()` 这样的具名方法）；
2. **找状态写入**：具名方法里那一串 `this.setVisible(!1), this.setIsCopyActivated(!0)`
   就是 `mapMutations` 映射出来的 commit 包装 —— 顺着 `store.commit` 走到 `_mutations[type]`，
   那里才是"用户写的分发函数"（如 `setTaskStatus: function(e,t){ e.taskStatus = t }`）；
3. **找状态读取**：`mapState("visitUserInfo", ["isTaskUser","taskStatus"])` /
   `mapGetters("readerPlugin", ["canCopy"])` —— **这一行就是"这个组件关心哪些字段"的清单**；
4. **找真正的判定**：`watch: { isCopyActivated: function(t){ t && !this.canCopy && this.fetchCopyTimes(...) } }`
   —— 状态变化**之后**触发的那个动作，往往才是"跳去付费页"的真凶；
   `canCopy` 的 getter 里出现 `n.vipInfo.isVip` ⇒ 目标字段就找到了；
5. **写值**：`document.querySelector('.header-wrapper').__vue__.$store.state.vipInfo.isVip = true`。

**用本技能固化它**（而不是在控制台手敲一次 —— 手敲的那次会在刷新/重挂载后失效）：

```bash
node .agents/skills/web-reverse-hook/scripts/build-hook.js spa-state \
  --state-path vipInfo.isVip=true \
  --state-path visitUserInfo.isTaskUser=true \
  --state-path visitUserInfo.taskStatus=1 \
  --out hook-vue-state.js
```

⚠️ **"挡回写"是这个预设的核心价值**：SPA 会重挂载、会重新初始化、会 `history.go(0)`；
只赋一次值的写法在这些时刻会被冲掉。本预设用访问器把叶子锁住，**任何后续写回都被强制改回目标值**，
并且会打印一行"挡回一次…"的日志 —— 这行日志本身也是证据（说明确实有人在往回写）。

### 范式 B：全局注册表替换（组件 / 插件 / 编解码器）

**判据**：目标是一个"按名字注册、按名字取用"的注册表 ——
`Component.components_[name]`、`X.getComponent(name)`、`X.registerComponent(name, factory)`。

**为什么能替换**（video.js 的源码级判据，可迁移到同类库）：

```js
Component.getComponent = function getComponent(name) {
  if (!name || !Component.components_) return;
  return Component.components_[name];          // 取用点：只认这张表
};
// 注册时的守卫（决定了"还能不能换"）
if (name === 'Player' && Player && Player.players) { ... throw ... }
// 结论：只有"已经创建过实例"才禁止替换 ⇒ 注入必须早于实例化
```

**三步替换**（原型链继承，保留原实现）：

```js
const Origin = X.getComponent('Player');
function Wrapper(...args) { /* 前置逻辑 */ const p = new Origin(...args); /* 后置逻辑 */ return p; }
Wrapper.prototype = Object.create(Origin.prototype);   // ⚠️ 会丢掉你自己写的 prototype 成员
X.registerComponent('Player', Wrapper);
```

本预设把这三步做成了可调用接口，并且**比原文多一步**：搬运你自己写在 `prototype` 上的成员
（直接 `Object.create` 会**静默丢弃**它们 —— 这是 B28 实跑带出的缺陷，已修）：

```bash
node .agents/skills/web-reverse-hook/scripts/build-hook.js spa-state \
  --registry-root window.videojs --registry-method registerComponent --registry-names Player \
  --out hook-registry.js
# 页面里：
#   __mcp_vue_hook__.registry.Player.factory   // 探针记录到的原工厂
#   __mcp_vue_hook__.replaceComponent('Player', Wrapper)
```

**三条时机纪律**：

1. **注入必须早于注册**（否则探针记录不到原工厂）；本预设 `installRegistry()` 在注入时先试一次，
   之后按 `pollInterval` 轮询重试；
2. **替换必须早于实例化**（`Player.players` 非空就换不动了）；
3. **先注册再替换**：`replaceComponent` 依赖探针已记录原工厂，没记录就返回 `false` 并打印原因。

### 与油猴脚本的关系

上面两段**就是油猴脚本的本质**：`@match` 决定作用面、`@grant` 决定权限面、脚本体里做上面两件事。
区别只有分发方式：

| 维度 | 本技能（注入） | 油猴 / userscript |
| --- | --- | --- |
| 生效时机 | 你控制（导航前注册最稳） | `@run-at`（`document-start` 最稳） |
| 作用面 | 当前会话 | `@match` 声明的所有站点 |
| 风险 | 无第三方代码 | 脚本可读你的登录态、可回传数据（审计走 `web-malware-forensics`） |

**结论**：调试阶段用本技能注入（可控、可撤、日志全）；要"长期生效"才考虑落成油猴脚本，
并且**落成前先按 `web-malware-forensics` 的清单审一遍自己的脚本**（别自己造一个回传面）。

---

## 反 hook 检测、closed shadow DOM 与页面限制解除（B32）

详见 `references/anti-hook-detection-and-bypass.md`。四条判据：

1. **页面报「异常脚本」但你的 hook 逻辑本身没错** ⇒ 先找 `Function.prototype.toString` 白名单比对
   （站点把若干原生函数逐个 `fn.toString()` 过正则查 `native code`，任一不匹配就上报）。
   **先短路「上报动作」（它往往只有一处），不要死磕 `toString`。**
2. **选择性劫持**（★ 通用范式）：在 wrapper 里构造 `Error` 取 `stack`，
   **只掐掉来自检测函数的调用，其它一律放行**：

```js
const _setTimeout = window.setTimeout;
window.setTimeout = function (...args) {
  if ((new Error('probe').stack || '').includes('checkoutNotTrustScript')) return;  // 只掐检测函数的注册
  return _setTimeout.apply(this, args);
};
```

3. **closed shadow DOM**：Elements 里查不到子节点 / `el.shadowRoot === null` ⇒ 包装 `Element.prototype.attachShadow`
   把 `args[0].mode` 改成 `'open'`（**必须注入在页面代码之前**）；拦不到时还可走「框架句柄逃逸」——
   读组件的自有属性（如 `el.__vue__.shadowDom.innerHTML`）。
4. **页面禁止复制 / 弹登录框**：① 行内 `user-select: text !important` 能压住作者样式表里的 `!important`
   （对 `::selection` / `pointer-events` 等不生效，要逐个补）；② **改函数**而不只改样式
   （判据：先看「点按钮时执行的是哪个函数」）。
5. **代价**：`stack` 过滤依赖函数名，**代码压过混淆后就失效**；
   `Error.prepareStackTrace` / `Error.stackTraceLimit` 也会影响它。

---

## 页面功能解锁与资源捕获配方（B33）

详见 `references/page-unlock-and-userscript-recipes.md`（`anti-hook-detection-and-bypass.md` 的同族扩展：
那篇讲「怎么不被发现」，本文讲「**怎么把页面自己的限制按下去、把页面自己的资源捞出来**」）。
六条判据：

1. **★ 控制台条件断点注入**（临时验证，刷新失效）：条件写 `d[s]===false&&(d[s]=true),false` ——
   **逗号表达式前半段改值、最后一项恒 `false` ⇒ 永不停下但每次经过都改**。
   正式产物走第 2 条。
2. **★ 原型/内置方法重写**：判断写在 `Array.prototype.find` 之下 ⇒ 重写 `find`，
   用**数组内容特征**（源文 `JSON.stringify(this).includes('github-sync')`）区分「该管的那次调用」。
   **纪律：先备份再重写**（`[].constructor.prototype._find = [].constructor.prototype._find || [].constructor.prototype.find`，
   不备份就把原生 `find` 永久覆盖掉；`||` 防二次注入覆盖备份）。
3. **★ Vue 路由监听两条路**：① 原生层（hash 听 `hashchange`/`popstate`，history 拦 `history.pushState`）**只有字符串**；
   ② 框架层 `document.querySelector('#app').__vue__.$router.afterHooks.push(fn)` **能拿 `to`/`from` 结构化对象**
   （原理链：`this.afterHooks = []` → `afterEach` = `registerHook` = `list.push(fn)`；
   `Vue.prototype.$router` getter 返回 `this._routerRoot._router`）。
4. **★ 去水印三路线选型**：删标签 / 劫持生成都「改一下特征值就失效」；
   **在「获取时」改水印内容「除非改接口，理论上通杀」**（源文选它）。
5. **★★ 媒体播放解锁**（失焦秒暂停 / 倍速被轮询重置 / `currentTime` 直改崩）：
   从**源头**屏蔽失焦检测（`document-start` 重写 `addEventListener` + `killSetter` + 顶掉 `hidden`/`visibilityState`，
   **别把全局 `addEventListener` 打死**）；倍速用 `Object.getOwnPropertyDescriptor` 取原 setter 后**劫持 set + 锁定开关**；
   **MSE 播放器直改 `currentTime` 会抛 `DOMException: aborted`**（且 webpack 隔离拿不到内部 API）
   ⇒ 改为**按进度条 DOM 物理尺寸算绝对坐标、派发 `mousedown→mouseup→click`**；**400ms 防抖**只做唯一一次 seek；
   快捷键要 `preventDefault`+`stopImmediatePropagation`、用 `e.code`、**先判焦点不在 input/textarea/contentEditable**。
   **边界：服务端强制校验会让进度无效。**
6. **★★ 资源捕获型脚本**：F12 网络面板**能看到完整 `https` 图片 URL ⇒ URL 截取版；只见 `blob:https://` ⇒ 图片捕获版**。
   URL 截取版三通道（`fetch` + `XHR.prototype.open` + `PerformanceObserver`）；
   图片捕获版 `MutationObserver`（`childList`+`subtree`，命中 `div.pdfimg.move.rendered`）+ **生产者-消费者队列**
   （`fetchQueue` / `processingUrls` / `isWorkerRunning`）、**页码取元素 `data-page`**；
   **必须完整翻页、下载必须队列化**。

**收束判据（与 §「反 hook 检测」同层）**：动手前先分清「**限制在前端**」还是「**校验在服务端**」——
前端解锁**只在服务端不复核时有效**（源文金句「几乎没有什么是油猴做不到的。。。如果有，那就是服务器功能了」）。

---

## 定位「绑在元素上的真实代码」：jQuery 事件（B30）

**问题**：老系统大量使用 jQuery。它在原生 DOM 事件机制之上自建了一套事件管理
（`$.fn.on` 把回调存进内部数据表），于是 DevTools 的 *Event Listener* 面板只能把你带到
**jQuery 自己的闭包**里 —— 跟进去就是「无法自拔」，看不到真正处理这个点击的业务代码。

**判据（30 秒确认是这条路）**：

| 现象 | 判断 |
| --- | --- |
| Event Listener 面板里事件的链接指向 `jquery.min.js` 内部 | jQuery 托管事件 |
| Console 里 `typeof window.jQuery === 'function'`，`jQuery.fn.jquery` 有版本号 | 页面确实引了 jQuery |
| `$._data(el, 'events')` 能列出事件（`_data` 是 jQuery 私有 API） | 同上；**只适用于 jQuery 2/3** |

**做法**：包住 `$.fn` 上的事件方法，把回调暴露出来。
（本预设把源工具（`JSREI/jQuery-hook`）的属性前缀 `cc11001100-jquery-<事件>-event-function`
泛化成了 `data-rjq-…` —— 前缀可配，不影响用法。）

```bash
node .agents/skills/web-reverse-hook/scripts/build-hook.js jquery-handler --out hook-jq.js
node .agents/skills/web-reverse-hook/scripts/build-hook.js jquery-handler --events click,on --out hook-jq-click.js
browsercli call evaluate_script --file hook-jq.js
```

注入后：

1. **Elements 面板**选中元素，看属性 `data-rjq-jquery-click-event-function`，
   值形如 `rjq_click_2` —— 属性名即事件名，属性值即「该回调所在的全局变量」；
2. **Console** 粘贴 `rjq_click_2` 回车 → 打印函数 → 点内存地址 → **直达业务代码**；
3. 或者一次性列表：

```bash
browsercli call evaluate_script --function "() => JSON.stringify(window.__jquery_handler_report())"
```

**三个真机才暴露的坑**（Node 假环境测不出，本批在 Chrome + jQuery 3.6.0 上实测）：

1. **真 jQuery 的简写方法内部就是转调 `.on()`**：
   `$.fn.click = function(data, fn) { return arguments.length > 0 ? this.on('click', null, data, fn) : this.trigger('click') }`。
   所以一次 `$(el).click(fn)` 会先后穿过包装后的 `click` 与 `on` 两层 ⇒ **登记两次**、
   元素属性被后写的那个变量名覆盖。本预设按「回调 + 事件名」做幂等去重（实测 6 次绑定恰好 6 个变量）。
2. **事件名要从参数里读，不能取方法名**：`.on('submit', fn)` 的事件是 `submit` 而不是 `on`。
   按方法名命名会打出 `…-jquery-on-event-function` 这种没有信息量的属性。
3. **`$.fn` 必须是集合对象的原型** —— 写测试替身时 `Object.create($.fn)` 才是对的形态；
   把方法挂在集合自身上，`$(el).click` 根本走不到原型链（我第一次的替身就是这么错的）。

**边界**：

- jQuery 被 **Webpack 闭包持有**（`window.jQuery` 不存在）时本预设不适用，
  它会明确打印「仍未拿到 window.jQuery」并给出替代路线（`dataflow` 预设按选择器 / 关键字追）；
- 现代框架（Vue/React）的合成事件不走 jQuery，走 `spa-vue` / `spa-react` 或直接看组件注册表；
- 本预设**不代理请求**：只解决「这段代码在哪」，不解决「它发了什么」。

---

## Cookie hook：三个「一定有」的坑（B31）

来源：`docs/references/52pojie-1746432`（一篇**没人解答的提问帖**，反而把三个坑同时暴露在一段代码里）
+ `52pojie-1900424`（同型脚本的完整操作序列）。目标 cookie 是 `passport.1905.com` 的 `PHPSESSID`。

### 坑 1 · `@match` 只写主机名 = **只匹配根路径**

```js
// @match        https://passport.1905.com      ← 只命中这一个 URL
// @match        https://passport.1905.com/*    ← 才是「该站所有页面」
```

- **判据**：油猴装了、也启用了、Console 里却什么都没有 ⇒ 先看 `@match` 有没有 `/*`。
  match pattern 的 path 部分不可省略；省略后语义是**根路径精确匹配**，带 path 或 query 的页面一律不命中。
- 同类问题：`@match *://*.example.com/*` 与 `@match *://example.com/*` **不互相覆盖**（子域要单独写）。

### 坑 2 · ★ 覆盖 `document.cookie` 时「只留最后一次写入的值」**会毁掉整站**

提问帖里的代码是这个形态：

```js
let cookieTemp = '';
Object.defineProperty(document, 'cookie', {
  set: (newValue) => { /* 打日志 */ ; return (cookieTemp = newValue); },
  get: () => cookieTemp,
});
```

- **它的问题不是「hook 不到」，是「hook 把它改坏了」**：`cookieTemp = newValue` 是**赋值覆盖** ——
  只保留**最后一段**写入的 `k=v`，站点之前写进去的会话 / 风控 / 埋点 cookie 全被丢掉；
  `get` 又只返回这一段 ⇒ 页面自己再读 `document.cookie` 时读到的是残缺值。
- **症状**：hook 装上之后页面「行为不正常」（登录态掉、风控失败、跳转异常），
  于是第一反应是「hook 写错了」—— 其实逻辑没错，**是它干了观测之外的活**。
- **正确姿势：转发给原生描述符，只做观测**（本技能 `dataflow` 预设的实现，见 `scripts/hooks/dataflow.js`
  的 cookie 分支 —— 它会依次在 `document` / 原型 / `Document.prototype` / `HTMLDocument.prototype`
  上找 `cookie` 描述符，找不到就静默跳过，找到才包）：

```js
const d = Object.getOwnPropertyDescriptor(document, 'cookie')
       || Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
Object.defineProperty(document, 'cookie', {
  configurable: true,
  get() { return d.get ? Reflect.apply(d.get, this, []) : ''; },   // ← 读走原生
  set(v) { /* 只观测：打日志 / 条件断点 */ ; return Reflect.apply(d.set, this, [String(v)]); },  // ← 写走原生
});
```

- **判据（一句话）**：**装完之后页面还正常，才是合格的观测 hook。**
  凡是把 getter 换成「自己维护的字符串 / 自己维护的 map」的写法，都属于**改写**而不是观测 ——
  要改写就明确说出来、并自己负责把 `k=v; ` 拼接与过期语义补齐（那已经不叫 hook 了）。

#### 真机验收（Chrome，`artifacts/skill-evolution/b31-run/cookie-hook-ab.js`）

同一页面顺序执行「坏 hook → 还原 → 好 hook」，实测：

| 观测点 | 实测值 | 结论 |
| --- | --- | --- |
| `Object.getOwnPropertyDescriptor(document, 'cookie')` | `undefined` | **描述符默认不在 `document` 自身**（在 `Document.prototype` 上）⇒ 必须先沿原型链找，否则拿到 `undefined` 后 `defineProperty` 直接抛 `Property description must be an object: undefined` |
| 坏 hook 写一次后读 `document.cookie` | `rj_c=3; path=/` | **读回来的就是最后一次写入的原始串** —— 之前的 `rj_a` / `rj_b` 在读取结果里全部消失 |
| `delete document.cookie` 之后再读 | `rj_a=1; rj_b=2` | **cookie 本身没丢，是坏 hook 的 `get` 在「说谎」** ⇒ 症状是「页面行为异常」而不是「cookie 没了」 |
| 好 hook 写一次后读 | `rj_a=1; rj_b=2; rj_d=4` | 旧 cookie 全在；同时 `seen` 里拿到原始写入串（观测不受影响） |

- **附带结论**：被坏 hook 吞掉的那次写入（`rj_c`）是**真的没有落盘**（后面的检查 `good_all_present` 因它而 false）——
  坏 hook 的破坏对被吞的写入是**不可逆**的，不只是「读不到」。
- **还原技巧**：调试完要撤掉 hook，用 **`delete document.cookie`**（删掉自己装的**自有**属性即可，
  原型上的原生描述符会自动重新生效）；**不要**用 `Object.getOwnPropertyDescriptor(document,'cookie')` 去「存原描述符再 restore」
  —— 在干净页面上它本来就是 `undefined`，restore 会直接抛错。

### 坑 3 · 无条件 `debugger` 放在 setter 里会断到你崩溃

- 页面初始化阶段写 cookie 十几次很常见；无条件断点会让「刷新一次要点十几次继续」。
- 本技能的做法：`--cookie-match <关键词>` ⇒ **只在匹配时才 `debugger`**，其余只打日志：

```bash
node .agents/skills/web-reverse-hook/scripts/build-hook.js dataflow \
  --targets cookie --cookie-match PHPSESS --out hook-cookie-debug.js
browsercli call evaluate_script --file hook-cookie-debug.js
```

- **匹配是「子串包含」**：想抓 `PHPSESSID` 写 `PHPSESSION` 也能命中（提问帖里就是这么写的，恰好能中）。
  但反过来要小心 —— 关键词写得太短（如 `a`）会命中一切，等于没有条件。

### 复现前置：先清 cookie

`52pojie-1900424` 的第一步是**清空目标站 cookie** 再刷新。理由：让「写 cookie」的动作**从零开始**，
否则响应里已经带着旧值，你分不清哪一次写入是首次、哪一次是更新。

---

## 「断点暂停」= 最可靠的注入时机（缺 `document-start` 时的穷人版）

注入时机表（`inject_hook` / `@run-at document-start` / Tampermonkey *Userscript API Dynamic*）在
下文「注入与生效时机」§3。这里补**第四个手段**，专治「纯 DevTools 手工环境、没有任何注入设施」或
「前三个都还是不够早」：

1. Network 勾 **`Preserve log`**，清掉目标站 cookie，刷新；
2. 找到**第一个请求**（通常是文档本身）→ 右键 *Open in Sources panel*；
3. 在该脚本**顶端**打一个断点；
4. 再刷新 ⇒ 页面会在你手上**停住**（此刻页面自己的 JS **一行都没跑**）；
5. 在 Console 里粘贴 hook 脚本（`evaluate_script` 在这里等价于「手工粘贴」）；
6. 放行 ⇒ hook 在所有页面代码**之前**生效。

**为什么它比 `document-start` 还稳**：断点暂停不是「抢跑」，而是把**时间轴停住**了 ——
注入窗口是「你决定放行的那一刻」，理论上无限宽。三个前提前提是「你必须能停在第一个脚本上」。

**三条纪律**：

- 断点**必须打在第一个脚本**上，打晚了前面的代码已经跑完；
- 「第一个脚本」不一定是文档本身 —— **内联 `<script>` 也算**，按 Network 里最先出现的那个资源找；
- 这只解决**「装得早」**，不解决**「装得对」** —— 上面坑 1/2/3 照样要逐条处理。

**边界**：手工调试用它最快；要长期生效仍应落成油猴脚本或 `inject_hook`
（并注意 `52pojie-1746432` 的教训：**落成油猴时 `@match` 与描述符转发是两个必查项**）。

---

## 常用生成命令

```bash
# 1. 反调试综合绕过（直接生成全套防护）
node .agents/skills/web-reverse-hook/scripts/build-hook.js antidebug --out hook-antidebug.js

# 2. 定位页面跳转来源（开启 onbeforeunload 跳转断点）
node .agents/skills/web-reverse-hook/scripts/build-hook.js antidebug --redirect-trap --out hook-redirect.js

# 3. 提取 Vue SPA 隐藏路由并清除权限守卫
node .agents/skills/web-reverse-hook/scripts/build-hook.js spa-vue --block-redirects --out hook-vue.js

# 4. 追踪特定 Cookie 或 Token 写入
node .agents/skills/web-reverse-hook/scripts/build-hook.js dataflow --targets cookie,storage --keyword token --out hook-token.js

# 5. 追踪异步 Promise 完成与回调落地
node .agents/skills/web-reverse-hook/scripts/build-hook.js dataflow --targets promise --out hook-promise.js

# 6. 精准 Cookie 条件断点（仅在写入包含 token 时触发 debugger 断点）
node .agents/skills/web-reverse-hook/scripts/build-hook.js dataflow --targets cookie --cookie-match token --out hook-cookie-debug.js

# 7. 原生编解码与定时器拦截（带 30 次单接口熔断防刷屏）
node .agents/skills/web-reverse-hook/scripts/build-hook.js dataflow --targets builtins --limit-per-api 30 --out hook-builtins.js

# 8. CryptoJS 加密库拦截
node .agents/skills/web-reverse-hook/scripts/build-hook.js cryptojs --algorithms AES,MD5 --log-format json --out hook-crypto.js

# 9. JSEncrypt RSA 拦截
node .agents/skills/web-reverse-hook/scripts/build-hook.js jsencrypt --log-format json --out hook-rsa.js

# 10. 国密 SM2/SM3/SM4 拦截
node .agents/skills/web-reverse-hook/scripts/build-hook.js smcrypto --out hook-sm.js

# 11. Vue/Vuex 运行时状态固化（含挡回写；路径相对 store 的 state 根）
node .agents/skills/web-reverse-hook/scripts/build-hook.js spa-state \
  --state-path vipInfo.isVip=true --state-path visitUserInfo.taskStatus=1 --out hook-vue-state.js

# 12. 组件注册表探针（先看注册了什么，再决定替换谁）
node .agents/skills/web-reverse-hook/scripts/build-hook.js spa-state \
  --registry-root window.videojs --registry-method registerComponent --out hook-registry.js

# 13b. jQuery 事件定位（老系统：Event Listener 只能定位到 jQuery 闭包）
node .agents/skills/web-reverse-hook/scripts/build-hook.js jquery-handler --out hook-jq.js
node .agents/skills/web-reverse-hook/scripts/build-hook.js jquery-handler --events click,on,submit --out hook-jq-click.js
#     注入后：Elements 面板看属性 data-rjq-jquery-<事件>-event-function
#             Console 粘贴属性值 ⇒ 打印函数 ⇒ 点内存地址直达业务代码
#             或 __jquery_handler_report() 一次性列表

# 13. MSE 流捕获（无直链视频：src 是 blob:、网络面板只有分片）
node .agents/skills/web-reverse-hook/scripts/build-hook.js mse-capture --out hook-mse.js
#     播一遍 ⇒ window.__mse_capture.streams() 看清单 ⇒ .save() 落盘；
#     也可 --auto-download（流结束自动交付）或先设 window.__mse_capture_sink = (blob, name) => {...}
```

支持管道直接传给 `inject_hook`：

```bash
node .agents/skills/web-reverse-hook/scripts/build-hook.js antidebug --json \
  | browsercli call inject_hook --stdin
```

---

## 注入与生效时机

1. **一次性调试注入**（当前文档、当前 Frame）：
   ```bash
   browsercli call evaluate_script --file hook-antidebug.js
   ```
2. **跨导航持久注入**（对于同步初始化的反调试或 SDK，必须在导航前注册）：
   ```bash
   node .agents/skills/web-reverse-hook/scripts/build-hook.js antidebug --json \
     | browsercli call inject_hook --stdin
   # 注册后必须重新加载页面以生效
   browsercli call navigate_page --type reload
   ```

3. **必须比页面更早**（B29 新增判据，来自「控制台反检测」油猴脚本的实战口径）：
   有些拦截**只有在页面自身代码之前跑才有效** —— 典型是「检测控制台是否打开」这类探针，
   以及任何会**替换原生方法**的 hook（MSE / 编解码 / 组件注册表）。
   | 手段 | 什么时候用 | 关键点 |
   | --- | --- | --- |
   | `inject_hook`（本 CLI） | 本工具链内 | 注册后**必须 reload**；`addScriptToEvaluateOnNewDocument` 语义 = 每次新文档都先跑 |
   | 油猴 `@run-at document-start` | 交付给人工复现 | 只写 `document-start` 还不够 |
   | Tampermonkey *设置 → 安全 → Content Script API = `Userscript API Dynamic`* | 需要**最早**注入 | 这是唯一能稳定「早于页面一切代码」的开关；不设它会**偶发失效** |
   - **注入晚了的症状**：脚本明明装上了、也没有报错，但检测照样命中（因为检测跑在你前面）。
   - **判据**：在 Network 里勾 *Disable cache* + 把网速限到 3G/慢速 4G 再刷新 —— 页面变慢后你的脚本
     相对更早，若这样就好了，那就是**注入时机**问题，不是逻辑问题。
4. **绕过无限 `debugger` 的三档手段（从弱到强，先试便宜的那档）**：

   | 档 | 手段 | 适用与代价 |
   | --- | --- | --- |
   | ① 最便宜 | **条件断点**：在 `debugger` 那一行右键 *Add conditional breakpoint*，条件填 `false` | 不动页面、不装脚本；**放行一次后重进页面即生效**。代价：只对付被断点命中的那一处，源码换行就失效，刷新后条件可能丢 |
   | ② 常规 | `antidebug` 预设（清空 `eval`/`Function`/`constructor` 里的 `debugger` + `bypass_debugger`） | 覆盖面最广、可持久；代价：只治**动态构造**形态 |
   | ③ 兜底 | *右键行号 → Never pause here* | 对付**内联**的 `debugger`（脚本改不了的那种） |

   **判据**：先看 `debugger` 是**内联写死**的还是**动态构造**的。
   内联 ⇒ 只能 ① 或 ③；动态构造 ⇒ ② 最省事。
   （`52pojie-1909547` 用的就是 ①：在文心一言的 `debugger` 行加条件断点 `false`，
   放行后重进站点，无限 debugger 消失 —— 与 hook 法是**两条不同的路**，不是替代关系。）

5. **反调试类脚本的边界**：用户脚本改不了页面**内联**的 `debugger` 语句；
   只能过滤 `Function('debugger')()` / `new Function('debugger')()` / `function(){}.constructor('debugger')()` 这三种**动态构造**形态，
   其余要靠「右键行号 → 永不在此处暂停」。

---

## 读取拦截与观测结果

- **SPA 路由结果**：写入 `window.__spa_routes__`，直接在控制台或通过 `evaluate_script` 读取：
  ```bash
  browsercli call evaluate_script --function "() => JSON.stringify(window.__spa_routes__)"
  ```
- **运行时状态改写结果**：写入 `window.__mcp_vue_hook__`：
  ```bash
  # 看固化结果 / 谁被挡回过 / mutation 流水
  browsercli call evaluate_script --function "() => JSON.stringify({applied: window.__mcp_vue_hook__.applied, mutations: window.__mcp_vue_hook__.mutations.slice(-20)})"
  # 手动重放一次（页面重挂载后想立刻再压一遍）
  browsercli call evaluate_script --function "() => window.__mcp_vue_hook__.apply()"
  # 看注册表里都有哪些组件（决定替换谁）
  browsercli call evaluate_script --function "() => JSON.stringify(Object.keys(window.__mcp_vue_hook__.registry))"
  ```
### MSE 捕获：**数据要「喂」够才能落盘**（B30 补充）

MSE 是流式的：**播放器喂进来的字节流 = 你能拿到的全部**。
只播了开头就保存 ⇒ 保存下来的文件只有开头那段
（`52pojie-2115438` 原话：要播放完才能下载）。

推进进度的三个技巧（按性价比排序）：

| 技巧 | 做法 | 为什么有效 |
| --- | --- | --- |
| **智能跳播到缓冲区前沿** | 把 `currentTime` 设到 `buffered.end(buffered.length - 1)` 附近 | 播放器为了保持前方有缓冲会**继续拉流**；相当于「缓冲到哪就跳到哪」，比匀速播放快得多 |
| **倍速播放** | `video.playbackRate = 10` | 直接加速消耗缓冲。⚠️ 部分站点会报错或从头播（原文明示「我试过有些网站会报错」） |
| **先 `play()` 再等** | 有些播放器**不播就不拉** | 静音 + `play()` 是最低成本的「催流」 |

**判据**：`window.__mse_capture.streams()` 里 `bytes` 不再增长 ⇒ 流喂完了（或播放器停了）。
**边界**：三个技巧都是「催」，不是「保证」—— 卡在广告 / 付费墙 / DRM 前面时，
再怎么跳播也拿不到后面的数据（那属于 `stream-drm-reverse` 的题）。

- **MSE 捕获结果**：写入 `window.__mse_capture`：
  ```bash
  # 看清单（mime / 字节数 / 分片数 / 是否结束 / blob 地址）
  browsercli call evaluate_script --function "() => JSON.stringify(window.__mse_capture.streams())"
  # 落盘（浏览器端走 <a download>；headless 场景先设 sink 再落盘）
  browsercli call evaluate_script --function "() => { window.__mse_capture_sink = (b,n) => { const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=n; a.click(); }; return window.__mse_capture.save(); }"
  # 释放内存（长视频很容易把标签页撑爆）
  browsercli call evaluate_script --function "() => window.__mse_capture.clear()"
  ```
- **控制台输出缓冲**（在 attach 模式下防止丢失 `console.log`）：
  ```bash
  # 1. 装缓冲
  browsercli call evaluate_script --function "() => { if (window.__hookConsoleBuffer) return 'already'; window.__hookConsoleBuffer = []; const o = {log: console.log, error: console.error, warn: console.warn, info: console.info}; for (const k of Object.keys(o)) { console[k] = (...a) => { try { window.__hookConsoleBuffer.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); } catch {} return o[k].apply(console, a); }; } return 'buffering'; }"
  # 2. 读缓冲
  browsercli call evaluate_script --function "() => JSON.stringify(window.__hookConsoleBuffer || [])"
  ```
