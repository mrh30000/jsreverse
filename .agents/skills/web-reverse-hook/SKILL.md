---
name: web-reverse-hook
description: 生成并注入页面级运行时 Hook 脚本，用于拦截加密库与 JSVMP 虚拟机行为。当需要 Hook CryptoJS（AES/DES/MD5/SHA/HMAC）、JSEncrypt RSA、SM-crypto 国密（SM2/SM3/SM4）、或给 JSVMP/字节码解释器站点装运行时探针（proxy / transparent）时使用。用户提到“hook CryptoJS”“拦截 RSA 明文密文”“国密 hook”“JSVMP 探针”“hook 加密库”“拦截加解密参数”，或需要把加密库拦截脚本注入页面时都应使用本 skill，即使没有明确说出 CryptoJS / JSEncrypt / SM-crypto / JSVMP 这些名字。
---

# Web 运行时 Hook 脚本

生成可直接注入页面的 hook 脚本。本 skill 只负责**脚本生成**：拦截逻辑以纯函数形式放在 `scripts/` 下，注入交给 browsercli 的通用工具完成。

## 为什么拆成两步

原先是 `hook_cryptojs` / `hook_jsencrypt` / `hook_smcrypto` / `hook_jsvmp_interpreter` 四个 MCP 工具，每个把 JS 字符串塞进 `frame.evaluate()`。脚本化后有两处变化，理解它们能避免踩坑：

1. **脚本本身与注入解耦**。生成脚本是确定性的、可离线校验的（`tests/unit/skills/web-reverse-hook.test.ts` 用 `node:vm` 跑真探针），注入则复用已有的 `evaluate_script` / `inject_hook`。少一层工具，拦截逻辑却因此可测。
2. **`--file` 只接受函数表达式**。`evaluate_script --file <script.js>` 会把文件内容整体当作 `function` 参数，即最终执行 `(async () => { await (<文件内容>) })()`。所以生成物必须是 `(function f(){...})({...});` 这种**表达式**，不能带顶层 `return` 或半截语句。本 skill 的输出天然满足。

## 生成脚本

```bash
# CryptoJS：默认拦截全部算法
node skills/web-reverse-hook/scripts/build-hook.js cryptojs --out hook.js

# 只拦 AES 与 MD5，输出用 json 格式便于解析
node skills/web-reverse-hook/scripts/build-hook.js cryptojs --algorithms AES,MD5 --log-format json --out hook.js

# JSEncrypt RSA
node skills/web-reverse-hook/scripts/build-hook.js jsencrypt --log-format json --out hook.js

# 国密 SM2/SM3/SM4
node skills/web-reverse-hook/scripts/build-hook.js smcrypto --algorithms SM2,SM4 --out hook.js

# JSVMP 探针：transparent 痕迹更小，proxy 覆盖更全但可被检测
node skills/web-reverse-hook/scripts/build-hook.js jsvmp-transparent --script-url app.js --out hook.js
node skills/web-reverse-hook/scripts/build-hook.js jsvmp-proxy --script-url app.js --out hook.js
```

`--json` 输出的字段刻意只保留 `{"hookId","script"}`，与 `inject_hook` 的 schema 对齐，因此可以直接管道给它做持久注入：

```bash
node skills/web-reverse-hook/scripts/build-hook.js jsvmp-transparent --script-url app.js --json \
  | browsercli call inject_hook --stdin
```

（`description` 不在 `inject_hook` 的 schema 里，多带一个字段会被参数校验整体拒绝——所以别把完整结果对象直接喂过去。）

`inject_hook` 没有 `--file` 参数：`--file` 对 `.js` 文件会展开成 `{function: ...}`，那是 `evaluate_script` 的入参形状。要显式传源码就用 `--script "$(cat hook.js)"`。

完整参数见 `node skills/web-reverse-hook/scripts/build-hook.js --help`。

## 注入脚本

**一次性注入**（当前文档、当前 Frame）：

```bash
browsercli call evaluate_script --file hook.js
```

**跨导航持久注入**（同步加载的 SDK 必须走这条，否则 hook 装得比 SDK 初始化晚）：生成脚本后用 `--json | inject_hook --stdin` 注册，**然后必须 reload**（见上一节的等价写法）。

⚠️ **`--persistent true` 不作用于当前已加载的文档**，实测确认：`addInitScript` 只在后续导航生效，所以**必须跟一次 reload** 才能让 hook 覆盖同步初始化的 SDK。少了这一步，工具会返回 `success: true / persisted: true`，但页面里什么都没装上——`persisted` 只说明「注册成功」，不代表「已生效」。

## 读取拦截结果

加密库 hook 通过 `console.log` 输出。**默认的 `list_console_messages` 读法在 attach 模式下不可靠**（实测：`evaluate_script` 与页面自身脚本的 `console.log/error/warn` 都不进缓存，只有 `pageerror` 类消息能读到）。要稳定拿到拦截记录，先装一层 console 缓冲，再读页面全局：

```bash
# 1) 装缓冲（幂等，可重复调用）
browsercli call evaluate_script --function "() => { if (window.__hookConsoleBuffer) return 'already'; window.__hookConsoleBuffer = []; const o = {log: console.log, error: console.error, warn: console.warn, info: console.info}; for (const k of Object.keys(o)) { console[k] = (...a) => { try { window.__hookConsoleBuffer.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); } catch {} return o[k].apply(console, a); }; } return 'buffering'; }"

# 2) 生成并注入 hook（顺序重要：缓冲要在 hook 之前装）
node skills/web-reverse-hook/scripts/build-hook.js cryptojs --algorithms AES,MD5 --log-format json --out hook.js
browsercli call evaluate_script --file hook.js

# 3) 读缓冲，只取结构化事件
browsercli call evaluate_script --function "() => JSON.stringify((window.__hookConsoleBuffer || []).map(s => { try { return JSON.parse(s) } catch { return null } }).filter(o => o && (o.type === 'encrypt' || o.type === 'decrypt')))"
```

`--log-format json` 让每条记录是一行纯 JSON，上面第 3 步才能直接 `JSON.parse`。用 `compact` 时只能拿到人读的字符串，需要自己切分。

`list_console_messages` 仍然可以用来读页面自己报的错（`pageerror` 路径是通的）：

```bash
browsercli call list_console_messages --pageSize 100
browsercli call get_console_message --msgid <id>
```

JSVMP 探针不走 console，而是写入页面全局：

```bash
# 探针记录在 window.__mcp_jsvmp_log，由页面内表达式读取
browsercli call evaluate_script --function "() => JSON.stringify(window.__mcp_jsvmp_log.slice(-50))"
```

记录条目类型：`fn_apply` / `fn_call` / `fn_bind`（调用追踪）、`proxy_get` / `proxy_set` / `proxy_has`（属性代理）、`reflect_apply` / `reflect_get` / `reflect_set` / `reflect_construct`（Reflect 追踪）、`api_call`（Date.now / performance.now / Math.random）、`transparent_get`（transparent 模式的 getter 读取）。

## 探针行为与边界

**JSVMP proxy 模式是可检测的**。它替换 `Function.prototype.apply/call/bind`、`Reflect.*` 与全局对象为 Proxy，RS/AK 一类的签名型风控会读到被改写的 `toString()` 与对象形状。仅在确认目标没有这类检测时使用；否则优先 `transparent`，它只替换原型 getter 并保留原始 `toString()` 输出。

**探针必须在目标 SDK 执行前安装**。JSVMP 解释器会缓存原生引用，装晚了记录为空。装到已加载文档上时，正确做法是 `navigate_page --type reload` 重新初始化。

**卸载**：两个探针都暴露卸载函数，可在页面内调用并检查恢复结果：

```js
window.__mcp_jsvmp_uninstall(); // proxy
window.__mcp_transparent_uninstall(); // transparent
// 都返回 {restored: string[]}，列出已恢复的属性
```

**CryptoJS hook 走 `Function.prototype.apply`**。这是原工具的做法：CryptoJS 4 的加解密最终都经 `apply` 分发，且靠 `Object.hasOwn(fn, '$super')` 判定调用来自 CryptoJS 内部，避免误报。代价是会包装全局 `apply`——如果页面有基于 `apply` 的检测，同样会暴露。

## 文件结构

- `scripts/build-hook.js` — CLI 入口，`PRESETS` 表定义所有 preset 与参数映射
- `scripts/hooks/crypto-libs.js` — CryptoJS / JSEncrypt / SM-crypto 三个 install 函数
- `scripts/probes/jsvmp.js` — JSVMP proxy / transparent 两个 install 函数

install 函数都会被 `Function.prototype.toString()` 序列化后注入，因此**函数体内不得引用模块级变量**（否则页面里抛 `ReferenceError`）。加配置一律走唯一入参 `config`，这是这些函数看起来"啰嗦地读 `config.xxx`"的原因，改动时别把它内联成闭包。

`probes/jsvmp.js` 由已下线的 `src/tools/jsvmp/hookScripts.ts` 编译产物迁出，逻辑未改动。

## 校验

```bash
node --test build/tests/unit/skills/web-reverse-hook.test.js
```

用 `node:vm` 建真实浏览器形态的 realm（含品牌校验的 getter、私有字段、拒绝 Proxy 的变体），跑生成的脚本并断言记录类型、返回值语义未变、卸载后完全恢复。
