# 补环境分层与模块资产

本文件用于把补环境从“一坨 env.js”拆成可验证、可替换、可复用的模块。

## Level 1 / 2 / 3 分层

| 层级 | 目标 | 常见模块 | 进入条件 | 交付要求 |
|---|---|---|---|---|
| Level 1 基础运行层 | 让目标 JS 在隔离 Node.js 运行上下文中安全加载并可调用入口 | window/self/globalThis、location、URLSearchParams、atob/btoa、TextEncoder、Date、console、setTimeout、Storage | 已有入口和 fixtures | 不暴露 Node；能记录缺失环境 |
| Level 2 指纹与对象真实性层 | 让环境更接近浏览器并通过常见检测 | navigator、screen、document、plugins、mimeTypes、crypto、performance、Canvas/WebGL/WebGPU/Audio/字体/DOM 几何值回放、属性描述符、原型链、toString | Level 1 能运行但输出不一致或出现检测 | 有 descriptor/accessor/prototype/native-like/Object.prototype.toString 记录；指纹终端 API 有真实采样值 |
| Level 3 目标 SDK 专用层 | 针对具体站点 SDK 的初始化、缓存、消息和异步行为 | SDK init、动态 chunk、Worker、WASM、postMessage、IndexedDB 摘要、请求封装 | 已确认目标 SDK 依赖 | 写入 notes，避免污染通用 env |

## 模块选择矩阵

| trace / 错误信号 | 优先模块 | 备注 |
|---|---|---|
| `ReferenceError: window` / `self` | base-env | 先建立全局别名 |
| `location.href/origin/pathname` | location-env | 由 fixture.pageUrl/apiUrl 生成 |
| `navigator.userAgent/language/platform` | navigator-env | 使用浏览器真实样本 |
| `document.cookie` | document-cookie-env | 敏感值脱敏记录 |
| `localStorage.getItem` | storage-env | 从 fixture 注入 key/value |
| `crypto.getRandomValues` | crypto-env | 需要固定随机源 |
| `performance.now` | time-env | 与 Date.now 联动 |
| `canvas/WebGL/WebGPU/Audio/字体/DOM 几何` | fingerprint-env | 回放真实浏览器终端 API 返回值，不在 Node.js 中真实模拟渲染 |
| `Object.getOwnPropertyDescriptor` | descriptor-env / native-protect | 检查 enumerable/configurable/writable，区分 data descriptor 与 accessor descriptor |
| `Function.prototype.toString` | native-protect / native-addon | 普通函数、构造函数、getter、setter 都要保护 |
| `document.all` | native-addon | JS 难以完全模拟，优先 addon |
| `Worker/postMessage/WASM` | worker-wasm-env | 单独建消息链 |

## 推荐目录

```text
case/
├── env/
│   ├── base-env.js
│   ├── navigator-env.js
│   ├── document-env.js
│   ├── storage-env.js
│   ├── crypto-time-env.js
│   ├── native-protect.js
│   └── target-sdk-env.js
├── result/
│   ├── final.js        # 唯一执行入口；也可在用户选择 Python 请求客户端时为 final.py
│   └── src/            # 最终项目模块：env、signer、request、utils 等
└── notes/
    ├── entry-chain.md
    ├── missing-env-priority.md
    └── silent-failure-checklist.md
```

Skill 自带模板位于 `assets/env-modules/`，使用前应复制到 case 中按目标调整，不要直接改 Skill 内模板。当前模板包括 `native-protect.js`、`base-env.js`、`storage-env.js`、`document-env.js`、`fingerprint-env.js`。

## 固化规则

- 探测阶段可以用 Proxy；交付阶段逐步替换为真实对象。
- 每补一个模块，只解决 trace 中实际出现的路径，避免大而全。
- 每轮补齐后跑 fixtures，对比目标参数，不以“不报错”为完成。
- 通用模块和目标 SDK 专用模块分开，避免把站点私有逻辑写进通用 env。
- 敏感 Cookie、token、localStorage 值只放在本地 fixture，不写入总结原文。
- **Storage / Cookie 是可变状态，不是常量**：若生成链路存在自举依赖（写入后再读回），
  入口必须在运行时重建状态并按两趟生成，见 `multi-pass-cookie-generation.md`。
  禁止把某一次采样的 Storage 值写死进 `storage-env.js`。
- **参与校验的 JS 必须保持原始字节**：内容被用于计算特征值的脚本（如挑战页 VM 代码）
  不得经过 linter / 格式化器 / 编辑器改写，一律以 `.orig` 保存并原样加载。
  判据是「与浏览器取到的字节逐字节一致」，不是「单行」。
- 最终交付前运行 `check_env_realism.js`，确认原型链、属性描述符、访问器、函数 / 访问器 / 实例对象 toString 保护、`document.all` 特殊对象处理和指纹值回放均有证据；涉及指纹时再运行 `check_fingerprint_fixture.js`。
- 最终交付时，允许把已验证模块规范整理到 `result/src/`，但只能由 `result/final.js` 或 `result/final.py` 作为唯一入口串联调用；不要把测试脚本、临时 runner 或第二入口留在最终产物目录。

## 模块笔记模板

```markdown
## 环境模块补齐记录

| 模块 | 触发证据 | 补齐内容 | 真实性处理 | 验证结果 |
|---|---|---|---|---|
| base-env | ReferenceError: window | window/self/globalThis | descriptor 已记录 | 通过加载 |
| storage-env | localStorage.getItem | 注入 key 列表 | Storage 原型待补 | sign 仍不一致 |
```
