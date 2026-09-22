---
name: web-reverse-hook
description: 生成并注入页面级运行时 Hook 脚本，用于拦截加密库（CryptoJS/JSEncrypt/SM-crypto）、JSVMP 虚拟机探针、反调试综合防御绕过（debugger/console/窗口尺寸/强退/iframe原生借用）、关键数据流追踪（Promise/Cookie/Storage/网络/时间）以及 SPA 动态路由深度提取（Vue/React 路由表与守卫清除）。当用户提到“hook CryptoJS”“拦截 RSA 明文密文”“国密 hook”“JSVMP 探针”“绕过反调试”“无限 debugger”“阻止跳转/关闭”“SPA 隐藏路由提取”“拦截 cookie/storage/promise”时使用。
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
| `jsvmp-proxy` | JSVMP 虚拟机探针（全覆盖） | 代理全局对象、`Function.prototype` 与 `Reflect` |
| `jsvmp-transparent` | JSVMP transparent 探针（无感） | 只替换原型 getter，痕迹更小，规避强指纹检测 |

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

---

## 读取拦截与观测结果

- **SPA 路由结果**：写入 `window.__spa_routes__`，直接在控制台或通过 `evaluate_script` 读取：
  ```bash
  browsercli call evaluate_script --function "() => JSON.stringify(window.__spa_routes__)"
  ```
- **控制台输出缓冲**（在 attach 模式下防止丢失 `console.log`）：
  ```bash
  # 1. 装缓冲
  browsercli call evaluate_script --function "() => { if (window.__hookConsoleBuffer) return 'already'; window.__hookConsoleBuffer = []; const o = {log: console.log, error: console.error, warn: console.warn, info: console.info}; for (const k of Object.keys(o)) { console[k] = (...a) => { try { window.__hookConsoleBuffer.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); } catch {} return o[k].apply(console, a); }; } return 'buffering'; }"
  # 2. 读缓冲
  browsercli call evaluate_script --function "() => JSON.stringify(window.__hookConsoleBuffer || [])"
  ```
