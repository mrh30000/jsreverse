# 决策树与路由

## 一、先问 4 个问题

1. 真正决定成败的是哪条请求、哪次 cookie 写入、哪次 verify、哪帧 WebSocket。
2. 目标字段长什么样：`sign / cookie / header / body / verify payload / track / collect / image result`。
3. 当前题型属于哪类：标准签名、混合加密、Cookie/Header、JSVMP/VMP、Wasm/协议、验证码。
4. 当前阻塞点属于哪类：入口、原始串、中间态、环境、图像线、协议线。

如果这 4 个问题答不清，就不要直接抄大文件。

## 二、题型判断

### 1. 标准签名题

信号：

- 输出长度规整
- `md5/sha1/hmac`
- 原始串可恢复
- 请求字段关系稳定

代表：

- 财联社
- 百度翻译
- 有道翻译
- 淘宝 H5

### 2. 混合加密题

信号：

- 对称加密和非对称包装并存
- `params + encSecKey`
- 返回包也可能要解密

代表：

- 网易云音乐
- 部分响应解密题

### 3. Cookie / Header / 多参数联动题

信号：

- 值写进 `document.cookie`
- 或多个字段共同收口成最终 header
- 中间字段承担不同角色

代表：

- 盼之 cookie
- 滴滴 `dd03/dd05/wsgsig`
- 某农网 `X-CLIENT-SIGN`

### 4. JSVMP / VMP 题

信号：

- 大数组
- `for(;;) + switch`
- 寄存器式状态机
- 值逐位、逐段、逐数组构造

代表：

- 抖音 `a_bogus`
- 小红书 `x-s`
- QQ 音 VMP

### 5. Wasm / 协议题

信号：

- `WebAssembly.instantiate`
- protobuf / 二进制 payload
- WebSocket 分段交互

代表：

- Wasm 签名题
- Spiderdemo T6
- V5 / hCaptcha 某些阶段

### 6. 验证码 / 风控题

信号：

- 至少两段请求
- 图像、参数、环境并存
- `collect/w/fs/pow_answer` 等字段

代表：

- 腾讯滑块
- 极验 3/4 代
- 网易盾
- 百度旋转

> **注意**：`阿里 v2`（`acw_sc__v2`）**不属于本节**，见下面第 7 类。
> 它没有图片、没有交互，是「算出一个准入 cookie 才能进站」，走的是完全不同的链路。

### 7. 边缘 WAF / CDN 准入 Cookie 题

信号（命中任意两条即归入本类）：

- **首访不是正常页面**：403 / 412 / 429 / 503 / 521 / 202，且响应体是「一段 JS」或「HTML 里塞着 JS」
- `Set-Cookie` 下发一个「无值或半值」的准 cookie（`__jsluid_s`、`__cf_bm`、`ak_bmsc`…）
- 响应体出现 `document.cookie=`、`_cf_chl_opt`、`arg1`+`unsbox`、`sensor_data`、`reese84`
- 明确目标是「**必须先拿到一个 clearance cookie 才能进站**」

代表：

- 加速乐 jsl（两趟 521 + `__jsl_clearance_s`）
- 阿里 `acw_sc__v2`（旧版 `unsbox`+`hexXor` / 新版 LCG+洗牌）
- Cloudflare 5s 盾 / managed challenge（`cf_clearance`）
- Akamai Bot Manager（`_abck` / `sensor_data`）
- F5 Shape / Reese84、Imperva、Kasada、DataDome、HUMAN/PerimeterX、AWS WAF、Fastly

**这类题不属于验证码**：无图片、无交互、无人工成功样本基线。走图像 / 坐标 / 打码平台路线必然空转。

路由：

1. 先判层 —— 十二族一页判层表在
   [`../../web-js-env-patcher/references/edge-waf-cookie-challenge.md`](../../web-js-env-patcher/references/edge-waf-cookie-challenge.md)；
   或用 `python scripts/waf_clearance_solver.py classify --html page.html --status 521`。
2. 可离线部分 —— 读 [`10-waf-clearance-cookie.md`](./10-waf-clearance-cookie.md)，
   用 `scripts/waf_clearance_solver.py`（`jsl` / `jsl-first` / `acw-v2-old` / `acw-table` / `cf-decode` / `cf-strtable` / `pow-drop` / `pow-bigint`）。
3. 不可离线部分（环境校验点顺序随机、`isTrusted` 事件、行为生物特征）—— 交回 `../../web-js-env-patcher/SKILL.md`。

### 8. 打包产物（webpack）题

信号（**判族信号表以 `../../webpack-bundle-extraction/references/bundler-identification.md` 为唯一权威源**，
本节只给两条最容易现场确认的）：

- 报错 `Cannot read property 'call' of undefined`（加载器返回了 `undefined` ⇒ 模块没抠全）
- 加密函数点进去要**一路跟好几层**，或「缺哪个模块补哪个」永远补不完

**这类题的解法不是「读懂算法」，而是「把模块抠出来当黑盒用」**，
它和上面 1~7 类的关系是：1~7 类要的是**纯算实现**，本类给的是**可复用黑盒**。
两者常串联使用（先用本类拿到稳定 oracle，再按 1~7 类做纯算）。

路由：

1. **判族**（30 秒，务必先做）：
   `node .claude/skills/webpack-bundle-extraction/scripts/detect-bundler.js <bundle.js>`
   退出码 `2` = 它不是打包产物，回到上面的 1~7 类判断。
2. **抠 + 对拍**：读 [`../../webpack-bundle-extraction/references/harvest-routes.md`](../../webpack-bundle-extraction/references/harvest-routes.md)，
   用 `harvest-bundle.js` 的 `loader-export` / `closure` / `emit` / `wrap`；
   **必须做端到端数值对拍**（「跑起来没报错」不算验收）。
3. **补环境**：抠出来的模块报错落在指纹/风控上时，交回 `../../web-js-env-patcher/SKILL.md`
   （交接判据表在 [`../../webpack-bundle-extraction/references/node-reuse-and-env-handoff.md`](../../webpack-bundle-extraction/references/node-reuse-and-env-handoff.md)）。
4. **不是打包产物时**：`browserify` 走 AST 拆包、`esm`（vite/rollup 直出）走源码级处理，
   见 [`../../ast-deobfuscation/references/webcrack-bundle-unpack.md`](../../ast-deobfuscation/references/webcrack-bundle-unpack.md)。

> **边界**：本站只是「用了 webpack 打包」而加密本身是标准算法时，仍按 1~7 类做纯算；
> 只有当"扣不完/环境扣不动"成为主要成本时，才升级到本类。

## 三、阻塞点判断

### A. 入口没找对

信号：

- 说不清 writer 是谁
- 本地跑的是 wrapper，不是 builder
- 看了很多代码仍然找不到真实输入边界

优先动作：

1. 回到最终请求或最终 sink。
2. 重建 `writer <- builder <- entry <- source`。
3. 暂停做补环境和整体迁移。

### B. 原始串没对齐

信号：

- 最终长度对但值不对
- hash 前原文和浏览器不同
- JSON / query / path / cookie 顺序不对

优先动作：

1. 打印原始串。
2. 固定时间戳和随机数。
3. 检查 token、cookie、UA、序列化格式。

### C. 中间态没采到

信号：

- JSVMP 题只知道最终输出
- AST 做完仍然无法下手
- 复杂 builder 没有任何关键数组和对象

优先动作：

1. 对数组写入点插桩。
2. 对 builder 做输入输出 hook。
3. 用 logpoint 代替高频断点。

### D. 运行时依赖没补齐

信号：

- `window/document/navigator` 未定义
- 浏览器与本地中间态差异大
- `collect`、环境位串、指纹值明显不一致

优先动作：

1. 收缩到最小入口。
2. 记录真实访问属性。
3. 只补进入 builder 的必要对象。

### E. 图像线和参数线没拆开

信号：

- 一边调距离，一边调签名，一直不知道谁错
- verify 字段很多，却没有分线记录

优先动作：

1. 单独保存识别结果。
2. 单独保存 builder 输入对象。
3. 让识别结果作为 builder 显式输入。

### F. 协议边界没证明

信号：

- 二进制帧很多，但不知哪一段是真校验
- Wasm、protobuf、WS 全混在一起

优先动作：

1. 先数包或先列导出函数。
2. 证明输入输出关系。
3. 再决定是否反编译或迁移。

## 四、统一闭环

```text
目标字段
<- writer
<- builder
<- entry
<- source
```

然后固定这 5 层检查点：

1. writer 检查点
2. builder 输入
3. 原始串 / payload
4. 中间数组 / 中间对象
5. 最终输出

## 五、常用标签

- `header-sign`
- `cookie-sign`
- `response-decrypt`
- `captcha`
- `vmp`
- `jsvmp`
- `wasm`
- `protobuf`
- `websocket`
- `env`
- `fingerprint`
- `ast`
- `solver`
- `service`