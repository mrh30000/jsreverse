# 常见案例模式

本文件用于识别补环境任务中的常见形态，只作为分析提示，不替代证据。

## Header 签名型

信号：目标参数在 Header 中，例如 `x-sign`、`x-s`、`x-token`。

重点：

- `setRequestHeader` 或 fetch init.headers 是 writer。
- builder 常在 request interceptor 或 SDK request wrapper。
- source 往往包含 URL、Body、时间戳、Cookie、设备标识。

## Query 混淆参数型

信号：目标参数在 URL Query 中，例如 `sign`、`a_bogus`。

重点：

- Hook `URLSearchParams.append/set` 与 XHR/fetch URL。
- 注意 Query 排序、编码方式、空值和数组序列化。
- 常依赖 UA、Referer、时间和随机数。

## Body 签名型

信号：目标参数在 JSON 或表单 Body 中。

重点：

- 保留原始 Body 字符串，避免 JSON 重新序列化造成差异。
- 比对 Content-Type 与空格、顺序、转义。
- Hook `JSON.stringify` 可辅助定位 builder。

## SDK 初始化型

信号：入口函数找到了但直接调用失败，或必须先执行 init。

重点：

- 查 `init`、`config`、`setConfig`、`install`、`use`、`start`。
- 记录全局配置、meta 标签、script 标签参数。
- 先补初始化链，再补环境对象。

## 异步消息型

信号：签名结果通过 Promise、回调、Worker message 返回。

重点：

- 记录消息类型和 payload。
- 区分初始化消息与签名请求消息。
- 用 fixtures 验证最终异步输出。

## 挑战页自举 Cookie 型（202 / 412 + 内联脚本 + 外链 JS）

信号：首访返回 202 或 412，页面内联一段自执行脚本，另引一个外链 JS；后续业务请求带动态后缀。

重点：

- 先读 `ruishu-botgate.md`（代际判据、三件套、环境矩阵、排错清单）。
- 结构常量与可复现重算见 `ruishu-vmp-structure.md`；变量名可由 `nsd` 重算，不必正则匹配。
- 三件套必须同一次刷新成套取得，内容保持原始字节；见 `dynamic-resource-freshness.md`。
- **Cookie 通常是自举 / 多趟生成**：本地只跑一趟会得到偏短的结果，见 `multi-pass-cookie-generation.md`。
- 用 `node scripts/extract_challenge_bundle.js` 抽三件套，用 `node scripts/ruishu_keynames.js` 做变量名重算与校验。

## 环境自检清单型（已知体检项逐条对齐）

信号：目标 JS 大量读取 `navigator.*` / `window.*` 的细粒度字段，缺失时不报错只在分支里静默走错。

重点：

- 不要等报错才补；**字段清单以 `ruishu-botgate.md` §6 / §6.1 为唯一权威源**，不要在本文件另立一份。
- 高频漏项（只作提醒，补法见权威源）：`document.hidden`、`navigator.battery` 的 4 个子字段、
  `eval.toString().length === 33`、四个 window 尺寸、`navigator.maxTouchPoints`、`navigator.connection.type`。
- 有状态 DOM 调用（`getElementsByTagName('script')` 第一次与后续不同、`createElement` 按序号返回不同对象）
  必须实测，不能返回同一对象。
