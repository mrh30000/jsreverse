# Cookie 生成链路与过期处理

当 Cookie/token 过期、不需要登录的网站请求因 Cookie 失败、目标参数位于 Cookie，或需要分析 `Set-Cookie` / `document.cookie` / JS 计算 / Storage 派生 / challenge 生成链路时读取本文件。

## 总原则

- 先判断 Cookie 是否与登录 / 账号授权相关，再决定处理方式。
- 对登录态 Cookie，不绕过登录、不索要账号密码、不破解验证码或 MFA；让用户手动登录或提供授权样本。
- 对非登录 Cookie，不要默认要求用户重新提供新 Cookie；应分析它如何生成、刷新和写入，并尽量纳入补环境或最终请求入口。
- 最终项目只能用 Node.js / Python 请求客户端发送请求；浏览器自动化只用于前置取证。

## Cookie 分类

| 分类 | 常见特征 | 处理策略 |
|---|---|---|
| 登录态 / 会话 Cookie | 与账号、session、SSO、权限、Authorization 绑定 | 用户手动登录或提供授权样本；不复现登录绕过 |
| 服务端首访 Cookie | 首次访问页面或接口时 `Set-Cookie` 下发 | 在最终 Node.js / Python 请求前增加首访 / challenge 请求，维护 Cookie jar |
| 前端写入 Cookie | 通过 `document.cookie = ...` 写入 | Hook setter 或用 RuyiTrace 查 `document.cookie` 调用栈 |
| JS 计算 Cookie | 混淆 JS、SDK、指纹模块生成 | 按 `source → entry → builder → writer` 搬运原始 JS 并补环境 |
| Storage 派生 Cookie | localStorage / sessionStorage / IndexedDB 参与 | 固化必要存储键，或在入口中先生成存储再生成 Cookie |
| **自举 / 多趟 Cookie** | **同一份 JS 连跑两次结果不同；本地结果明显短于浏览器，或缺字段** | **按 `multi-pass-cookie-generation.md` 做冷启动 + 热启动两趟，第二趟结果才是交付值；不要硬编码第一趟写入的状态** |
| 指纹 / challenge Cookie | 依赖 navigator、canvas、WebGL、时间、随机数、server seed | 结合 RuyiTrace / Hook / Node trace 补齐环境和 seed 传递 |
| **链式外链下发 Cookie** | 需**三个 Cookie 齐备**才返回数据；短的那个要**逐级取外链 JS** 才能拿到 `Set-Cookie`（`52pojie-1888223`） | 按 `## 链式下发` 一节做「正则提 JS → 请求 → 再提 → 再请求」；**直取会拿到 403 页**，别以为是环境问题 |
| 一次性服务端状态 | 与服务端临时状态、账号风控或设备校验强绑定 | 说明不可或不应复现，要求授权交互或离线样本 |

## 分析流程

1. **确认是否需要登录**
   - 目标页面 / API 是否无需账号即可访问。
   - 失败响应是否明确是未登录、权限不足、账号风控、验证码或 MFA。
   - 若需要登录，进入用户手动登录流程，不继续尝试复现登录态 Cookie。

2. **定位 Cookie 来源**
   - 检查 HAR / cURL / 响应头中是否存在 `Set-Cookie`。
   - Hook `document.cookie` setter，记录写入值、调用栈和写入时机。
   - 若使用 ruyiPage + RuyiTrace，优先在 NDJSON 摘要和原始日志中搜索 `document.cookie`、`Document.cookie`、Storage、navigator、canvas、WebGL、crypto、performance 等相关调用。
   - 检查 localStorage / sessionStorage / IndexedDB 是否参与派生。
   - 检查 Worker、iframe、WASM、postMessage 是否参与生成。

3. **梳理四层链路**

| 层级 | Cookie 场景中要回答的问题 |
|---|---|
| source | Cookie 输入来自 URL、Body、响应 seed、时间、随机数、指纹、Storage 还是已有 Cookie |
| entry | 哪个函数、SDK、模块或 challenge 入口生成 Cookie 值 |
| builder | 哪个请求构造 / Cookie 构造函数拼装 name、value、domain、path、expires 等 |
| writer | 最终由 `Set-Cookie`、`document.cookie`、请求头 `Cookie`、fetch/XHR 拦截器或 Cookie jar 写入 |

只找到 Cookie 值或疑似函数，不代表完成；必须确认 writer。

4. **决定补环境方式**
   - `Set-Cookie` 可刷新：最终入口先执行首访 / challenge 请求，保存 Cookie jar，再发目标请求。
   - `document.cookie` / JS 计算：将目标 JS 与必要环境补齐到 Node.js，入口运行时生成 Cookie。
   - Storage 派生：在 `env.js` 或入口初始化阶段准备必要 Storage 值，并记录来源。
   - **自举 / 多趟**：先跑一遍冷启动，保留其写入的 Storage / Cookie 状态，再跑第二趟取交付值；
     判据、趟数上限与陷阱见 `multi-pass-cookie-generation.md`。**不要把第一趟结果当交付值，也不要把第一趟状态硬编码。**
   - 指纹 / challenge 依赖：优先从 RuyiTrace 确认环境 API，再用 Node trace 补充。
   - 登录态 / 一次性服务端状态：不纳入补环境生成，转为手动登录或离线样本。

5. **确认 Cookie 长度口径**
   - 记录浏览器基线长度、本地单趟长度、本地两趟长度三者的分段对比，而不是只比总长度。
   - 「主页能过、接口 400」常见原因是接口额外校验指纹字段（Cookie 变长），不是环境不对。
   - 挑战页形态（202 / 412 + 内联脚本 + 外链 JS）见 `ruishu-botgate.md`；
     其资源保鲜按 `dynamic-resource-freshness.md` 的「同一次页面修订」要求处理。

## 链式下发：正则提外链 JS → 逐级请求 → 取 `Set-Cookie`

来源 `52pojie-1888223`（**悬赏求助帖：源文作者自己没跑通**，以下只登记**已观察到的结构**，不是可用方案）。
该站要**三个 Cookie 齐备**才返回数据：定值 `csrfToken`（**且请求头 `x-csrf-token` 必须与该 Cookie 同名值绑定**）+
一个短 Cookie + 一个长 Cookie。短 Cookie **不牵扯逆向**，但**不能直取**，链路是：

```
请求主页 → 正则提取 <script> 的外链 JS → 请求它
        → 在响应里再正则提取另一个外链 JS → 请求它 → 拿 Set-Cookie
```

⚠️ **源文明确实测**：把这条链当成"直接请求那两个 JS"会**拿到一个 403 无权访问页** ——
所以**「拿不到 Cookie」时要先确认"是不是少走了前一级"**，而不是先怀疑补环境。

判据：**同一站要多个 Cookie 齐备才给数据**时，先把每个 Cookie 的**下发点**分开定位
（`Set-Cookie` / `document.cookie` / JS 计算），**不要假定它们来自同一个响应**。

## 结构判据：`substr(13)` ⇒ 「时间戳 + 随机体」拼接

同一来源的长 Cookie 生成函数里，**两处**出现同一种写法（源文 `_$Ir()` 是一个按长度生成随机串的函数）：

```
_0x4d67a0 = _$Ir(48);                        // 取 48 位随机串
_0x4d67a0 = _$Hj1["call"](_0x4d67a0["substr"](13), "");   // ★ 切掉前 13 位
```

> **判据**：**`substr(13)` 切掉前 13 位 = 把 `13` 位毫秒时间戳从"随机串"里摘掉** ——
> 说明那个"随机串"其实是 **`时间戳(13) + 随机体`** 的拼接，**前 13 位是可预测的时间戳**。
> 见到 `substr(13)` / `substr(0, 13)` / `slice(-N)` 这类**恰好 13** 的切片，先按这个结构读。

同函数的其余结构（源文原样，**均未跑通**，只作形态参考）：

- 时间戳按 `Math.floor(new Date().getTime() / 1000)` 取**秒级**，再**逐字符写回**到随机串的
  **指定位置**（位置由一个 `timeArr` 数组给出）—— 即**时间戳不是简单拼接，而是"按位置表插入"**；
- 结尾用 `base64` 解码一段模板串、**再补一段**（源文补 `,"post_md5":"<另一个 18 位随机串切 13 位后的 5 位>"}`）后整体 `base64` 编码；
- 最后按**固定下标数组** `["3","7","10","12","15","18","20","23","35","40"]` 做**位置置换**（打乱）。

⚠️ **源文的失败点（必须原样登记，不得写成方案）**：作者自陈「**中间要传入 cookie 才能生成 cookie**，
但是加了之后还是不对。有没有大佬帮忙看看」⇒ **该生成链上游缺一环，未解决**。
⇒ 遇到同型结构时，**把"生成时依赖已有 Cookie"当作已知条件**去回溯：先确认那一环是哪次响应下发的，
再谈复现（与本文「四层链路」的 `source` 一问是同一件事）。

## 输出模板

```markdown
## Cookie 过期处理判断

- Cookie 名称：
- 当前失败现象：
- 是否需要登录：
- 是否账号 / 授权相关：
- 来源判断：Set-Cookie / document.cookie / JS 计算 / Storage 派生 / challenge / 未确认
- 关键证据：HAR / cURL / RuyiTrace api / stack.file / Hook 调用栈
- 是否可生成或刷新：
- source：
- entry：
- builder：
- writer：
- 是否纳入补环境：
- 最终入口中的处理方式：生成 Cookie / 刷新 Cookie jar / 用户手动登录 / 仅离线样本
- 是否需要用户补充材料：
```

## 不合格做法

- 不区分登录态与非登录 Cookie，直接要求“重新提供有效 Cookie”。
- 对不需要登录的网站，只把 Cookie 当固定样本复制到最终代码。
- 已有 RuyiTrace NDJSON 时，不查看 `document.cookie` / Storage / 指纹相关日志，直接盲补。
- 最终产物通过浏览器自动化生成 Cookie 后再请求。
- 把真实 Cookie / token 明文写入公开报告或最终交付物。
- **只跑一趟就把结果当交付值**，不去核对浏览器基线长度（漏掉自举 / 多趟生成）。
- **把第一趟写入的 Storage / Cookie 硬编码**进最终入口，导致换 baseline 即失效。
- **把"源文自己没跑通"的生成链当成可用方案**（如 `52pojie-1888223` 的 `_$j2()`）——
  单源未复核的链路只能登记**结构与失败点**，不能写进交付物。
- **拿不到 Cookie 就先怀疑补环境**：先确认"链路上游少走了没有"（多级 `Set-Cookie` /
  生成时依赖已有 Cookie），见 `## 链式下发`。
