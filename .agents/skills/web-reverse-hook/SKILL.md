---
name: web-reverse-hook
description: 生成并注入页面级运行时 Hook 脚本，用于拦截加密库（CryptoJS/JSEncrypt/SM-crypto）、JSVMP 虚拟机探针、反调试综合防御绕过（debugger/console/窗口尺寸/强退/iframe原生借用）、关键数据流追踪（Promise/Cookie/Storage/网络/时间）、SPA 动态路由深度提取（Vue/React 路由表与守卫清除）以及**Vue/Vuex 运行时状态固化与组件注册表替换**（油猴 / 篡改猴 / userscript 注入范式）。当用户提到“hook CryptoJS”“拦截 RSA 明文密文”“国密 hook”“JSVMP 探针”“绕过反调试”“无限 debugger”“阻止跳转/关闭”“SPA 隐藏路由提取”“拦截 cookie/storage/promise”“改 Vuex state”“$store.state 改不动”“__vue__ 取不到”“registerComponent 替换组件”“videojs Player 注入”“油猴脚本怎么注入”“无直链视频怎么下”“video 的 src 是 blob:”“网络面板只有分片没有可播地址”“hook addSourceBuffer”“MSE 缓存视频”“控制台反检测”“devtools 检测”“注入太晚拦截不到”时使用。
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
4. **反调试类脚本的边界**：用户脚本改不了页面**内联**的 `debugger` 语句；
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
