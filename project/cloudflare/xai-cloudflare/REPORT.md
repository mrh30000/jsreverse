# accounts.x.ai Cloudflare Turnstile 逆向分析报告

> 目标：`https://accounts.x.ai/sign-up?redirect=account`
> 结合参考资料：
>
> - `1752891-cloudflare-turnstile-reverse.md`（Turnstile 自定义 VM / BigInt POW / 遥测）
> - `2116523-cloudflare-drop-reverse.md`（Cloudflare 前端保护思路）
> - `cloudflare 5s盾分析-CSDN博客.md`（5s 盾完整请求链路）
>
> 分析方法：Observe-first / Hook-preferred / Breakpoint-last / Evidence-first
> 结论：**已完整还原链路并成功端到端通过验证（账号注册成功，拿到 cf_clearance）。**

---

## 0. 结论速览（TL;DR）


| 项目                     | 结果                                                               |
| ---------------------- | ---------------------------------------------------------------- |
| 保护类型                   | **Cloudflare Turnstile（managed 模式）+ x.ai 自研 Castle SDK** 双层      |
| x.ai Turnstile SiteKey | `0x4AAAAAAAhr9JGVDZbrZOo0`                                       |
| 渲染参数                   | `theme=light`, `size=flexible`, `mode=managed`, `rch=<widgetId>` |
| 最终 token 字段            | `<input name="cf-turnstile-response">` / 请求体 `turnstileToken`    |
| Token 形态               | `1.<payloadBase64url>.<tag>.<64位hex>`，实测长度 **837**               |
| 主要校验点                  | 挑战页 JSVMP 解释器（自定义字节码 VM）+ 环境探测 + BigInt 模幂 POW + 遥测              |
| 反混淆关键                  | 字符串表按固定规则旋转后用 `WJ(u)=table[u-239]` 取用；响应体用 **rayId 派生 XOR** 解密   |
| 端到端结果                  | **注册成功**，服务端返回 `cf_clearance` + `sso` 会话                         |


---

## 1. 侦察：页面结构与验证码定位

### 1.1 页面嵌套结构

```
https://accounts.x.ai/sign-up?redirect=account        (主 frame / OOPIF 父)
 ├─ about:blank                                        (隐藏辅助 iframe)
 ├─ about:blank
 └─ https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/g/turnstile/
        f/av0/rch/<widgetId>/0x4AAAAAAAhr9JGVDZbrZOo0/<theme>/fbE/<state>/flexible
        → Cloudflare Turnstile 挑战页（独立 OOPIF，closed shadow DOM 挂载）
```

- Turnstile widget 挂在主文档的 **closed shadow root** 上，`document.querySelectorAll` 查不到内部节点；
但可通过 `input#cf-chl-widget-<id>_response`（隐藏 input）→ `getRootNode().host` 反查宿主 DIV（实测 `384×71`）。
- x.ai 侧集成代码（bundle `239.js`）：

```js
// TurnstileCtx：动态注入 api.js
src: `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=${i}`

// 渲染
turnstile.render(el, {
  sitekey: _.sitekey,
  theme: dark?'dark':'light',
  size: 'flexible',
  callback: t => e(t),                       // 拿到 token
  'error-callback': e => reportTurnstileError(e)
});
```

### 1.2 实际发起的挑战链路（抓包）

以一次成功的交互为例（`ray=a393f8784a8dce7a`）：


| 顺序  | 方法   | 端点                                                                                | 说明                                 |
| --- | ---- | --------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | GET  | `/turnstile/f/av0/rch///light/fbE/new                                             | auto_timeout/flexible`             |
| 2   | POST | `/h/g/fo/<A>:<B>:<C>/<cRay>/<cf-chl>`                                             | 首次提交遥测（**加密体**），返回加密 JS/字节码        |
| 3   | GET  | `brunhild.challenges.cloudflare.com/cdn-cgi/challenge-platform/h/g/i/<cRay>/<ch>` | 图片资源（环境校验用，**不发必失败**）              |
| 4   | GET  | `/h/g/pat/<cRay>/<ts>/<sha256>/<chl>`                                             | 轮询/结果，首次 `401`                     |
| 5   | GET  | `/h/g/ci/<cRay>/<ts>/<..>`                                                        | canvas/渲染相关                        |
| 6   | POST | `/h/g/fo/...`                                                                     | 二次提交，返回**解密后 token**（长度 1000~5000） |
| 7   | 回调   | `turnstile` `callback(token)`                                                     | 写入 `cf-turnstile-response`         |


> 与 CSDN「5s 盾」文一致：`fo` 返回体分两支，`startsWith('window._')` → 明文脚本；否则 → **VMP 字节码分支**。
> 本目标命中 **VMP 分支**。

---

## 2. 挑战页 JS 静态分析（JSVMP 解混淆）

### 2.1 文件构成

挑战 HTML 抽出的内联脚本：

- `new_chl_script_1.js`（3,463 B）：首先是**我方 preload hook 被 Cloudflare 挑战页继承**（说明 hook 注入到了挑战帧），随后是页面引导逻辑。
- `new_chl_script_2.js`（237,353 B）：**核心**——Cloudflare Turnstile 引擎（字符串表 + 控制流平坦化 + 自定义字节码 VM）。
- `chl_script_1.js`（227,689 B）：另一个 widget（`pbe9r`）的同源挑战脚本，用于交叉验证。

### 2.2 字符串表还原（关键突破点）

脚本形态：

```js
~function(xc, T, f, Z, ...){ for(xc=i, function(x,F,...){ ... }(V, 608776), T=this||self, ...
  function V(tl){ return tl = `...semicolon-joined-string-table...`.split(`;`), V=function(){return tl}, V() }
  function i(b,x,F,O){ return b=b-458, F=V(), O=F[b], O }   // 取值器：i(n)=table[n-458]
```

- 字符串表是 **2050 项**、分号拼接的数组字面量。
- 启动时执行**校验旋转**（数论恒等式约束数组顺序）：
  ```js
  parseInt(q(539))/1 + -parseInt(q(2236))/2 + -parseInt(q(1037))/3*(parseInt(q(2421))/4) + ...
  // 旋转直到结果 === 608776
  ```
- 还原脚本 `rotate.js` 通过枚举旋转量，命中：**向左旋转 434 位**。
- 之后 `table[n-458]` 即可解出所有字面量。样例：


| 索引                                     | 明文                                                                 |
| -------------------------------------- | ------------------------------------------------------------------ |
| 1487                                   | `document`                                                         |
| 1960 / 2384 / 496 / 1126 / 2069 / 1029 | `object` / `string` / `undefined` / `symbol` / `number` / `bigint` |
| 1931                                   | `_cf_chl_opt`                                                      |
| 618                                    | `BCkZA9`（全局 key，存 `_cf_chl_opt` 引用）                                |
| 773 / 1367 / 1861 / 1690               | `parent` / `postMessage` / `cloudflare-challenge` / `widgetStale`  |
| 1238 / 1613 / 1663 / 2145              | `XMLHttpRequest` / `open` / `send` / `setRequestHeader`            |
| 824 / 930 / 2355                       | `atob` / `charCodeAt` / `fromCharCode`                             |
| 1684 / 2380                            | `getRandomValues` / `crypto`                                       |


（完整表见 `artifacts/new_strtable_decoded.txt`，1864 行。）

### 2.3 响应体解密函数（核心算法）

在 `chl_script_1.js` 中定位到解密函数 `R`（字符串表逆向确认真身）：

```js
R = function (g, aE, aJ, We, h, O, x, sX, sk, sF) {
  // 字面量还原后：
  sF, x = 32,
  sk = d._cf_chl_opt.TfPFa9 + "_" + 0,          // d._cf_chl_opt.rayId + "_0"
  sk = sk.replace(/./g, function (sS, sG) { x ^= sk.charCodeAt(sG); }),   // 逐字符累积 XOR key
  g = d.atob(g),                                 // base64 解码
  sX = [], O = -1;
  while (!isNaN(sF = g.charCodeAt(++O)))
    sX.push(String.fromCharCode(((sF & 255) - x - (O % 65535) + 65535) % 255));
  return sX.join("");
};
```

即（与参考文 Turnstile 篇一致）：

```
key = 32
for i in rayId+"_0": key ^= charCodeAt(i)
bin = atob(cipherB64)
plain[i] = ( bin[i] - key - i % 65535 + 65535 ) % 255
```

已用两段真实 `fo` 响应体验证可跑通（见 `artifacts/cf_decoder.js`）。**正确性对照**（对 `fo_stage2` 3336 字节响应体）：


| 使用的 rayId              | 解密结果 base64 字符占比 |
| ---------------------- | ---------------- |
| `a393f8784a8dce7a`（真实） | **1.000**        |
| `...ce7b`（末位差 1）       | 0.835            |
| 全 0                    | 0.346            |
| 其它会话 ray               | 0.472            |


真实 rayId 才能得到 100% base64 字母表输出，证明解密算法正确。

### 2.4 自定义字节码 VM（JSVMP）

`analyze_jsvmp_vm` 静态特征：

```
dispatcher.kind = switch-only
switchCount = 59, maxSwitchCases = 69
opcode handlers  : 7 类（control）
```

脚本中可见 VM 骨架与算子表：

- 操作码派发：`switch(...case\`0...case7)`、`while(true)`+`case` 分发。
- 寄存器/内存：`this.h / this.i / this.j / this.m / this.l`（栈指针 + 寄存器堆）。
- 大量 `^`/`&`/`+`/`-` 与 `53/203/255` 偏移混淆的单指令实现（例如 `bM[bs++]-53+256&255` 形式）。
- 调用/取值/属性访问：`Array.prototype.fill`、`Object.getPrototypeOf`、`Function`、`apply`、`call`。

**POW（BigInt 模幂）常量**（两脚本均存在，与 Turnstile 篇一致）：

```js
mod  = BigInt("0x00e9d3dca1328a49ad3403e4badda37a6a13610b608b5099839e1074e720f5a33b2ebd8c2ffd12c09be0015a4635aa9d2022d8f72f90ed11610c3742b0baef5b7da73d7e79aff6cdbdeab72492ce0a858e4c1f4c27a14ebbb4ce3beacfda982fe74463e76f654aab0c597d5e73686ea149023e8f60ae6365a30055fe2c5eb2ebfb");
exp  = 65537;                                 // 0x10001
seed = crypto.getRandomValues(new Uint8Array(128)); seed[0]=0;
base = 大整数(seed) % mod;
res  = powmod(base, 65537, mod);              // 逐位平方-乘（模幂）
res  -> 128 字节小端/大端填充 -> 参与挑战载荷
```

- 另有 LZW 变种压缩、遥测采集（鼠标轨迹/点击/触摸）、`PerformanceObserver` 资源计时等，
与参考文《关于 cloudflare turnstile 逆向》描述的行为一致。

### 2.5 环境校验

- 校验点数量十几个到二十几个、**顺序随机**（与 CSDN 文一致），因此**纯补环境重建算法不可行**，
应以「真实浏览器执行 + 拦截结果」为主。
- 必需的外呼：`fo` 提交、**图片请求 `/h/g/i/...`**（不发 100% 失败）、`/h/g/ci/...` canvas。
- 时间敏感：页面不可长时间挂起调试，否则超时失败。

---

## 3. 动态验证：Hook + 真实交互拿到 token

### 3.1 注入的 preload hook

`artifacts/preload_hook.js` 通过 `new_page --preloadHook` 在页面脚本前注入，覆盖：

1. `XMLHttpRequest.open/send/setRequestHeader`：记录所有 `challenge-platform / challenges.cloudflare.com / castle` 请求。
2. `window.fetch`：同上。
3. `window.turnstile.render`：抓取 `sitekey/theme/size`，并包裹 `callback` 记录 token。
4. `window.addEventListener('message')`：抓取 `source=cloudflare-challenge` 的 iframe 消息。

### 3.2 捕获到的 iframe 消息（证明 managed 挑战）

```
{source:'cloudflare-challenge', widgetId:'tg0ho', event:'init', mode:'managed', nextRcV:'ImyY...'}
{source:'cloudflare-challenge', widgetId:'tg0ho', event:'requestExtraParams'}
food seq:1..N            ← 心跳
interactiveBegin         ← 进入需要交互（managed）
... 真实交互后 ...
interactiveEnd
complete                 ← 挑战完成
```

### 3.3 交互细节（关键）

- widget 位于 closed shadow root，普通 `click` 无效。
- 有效方式：先定位 `input#cf-chl-widget-<id>_response` → 取宿主矩形（`384×71 @ (768,475.5)`）→
在**复选框中心坐标 (x+28, y+h/2)** 构造 `MouseEvent` 序列
`mouseover → mousemove → mousedown → mouseup → click`（`bubbles/cancelable/view=window/clientX/Y`）。
- 触发后：`interactiveEnd → complete`，`callbacks[0].tokenLen = 837`，`cf-turnstile-response` 被写入。

### 3.4 捕获到的真实 token

```
1.n24b-iCO8hV3lIE60-tr7rRqmyS3BKSvAEPXd9Igp9Nv1tQsGB3qHclwIMVjcQdTn4aMtVTSrpRFgD4d7UX3EyhVsscgPB8StOiQIDGaDuqNPwEj_A_xzGvsmPtCJmu6t2TPWDV-RLrP6F5c0svg_vgKec7InINyp9qXN-gYSllVO3E9PGy9wCUz45yTod5-M93H065cxGoUTKhwBQHfF-p5AP9TnANISE8bX0VZ7eIRg7MI1yEAesLnkdeV4BIxzbRBey03XE6UuyLXtUckE_KO74out2Bqth9wAryYtK9ErYdTcaiwcQV6pfVrffzVEQKpwnQX-hDxRQiVRWwgbrnbj_kkQCfc1M0RKfFu49DbYopF5md7UufV2q1niE1AmonfdUbsvODqbc0EHhYue0AQP9WsblQqT7BQ2N_JyybYZPbWCAyPCVMxqUteId-smsd-VNoV4bR6NVtE_jn8I-ZeMMFaYF7QXh06FF4OwndggV8W1GFBlBe9z2ZCvxW-Mf5HSAtCRvhS9Wvofop23DmZzRvrPgMcjMnx-cpJvROnEkpLJs6n3xe5_M8O_YEB8YNqKOryjKWKPobbCVlzJtu4Xvk_397zt9sIVtx1CuQ2XBpP8Iz0HaDsxx64mebDrNPDn8Js1kqKuT1wbqpPJ7FFe4yNa5VWT23YjlJIACpRWziDNR4r45iCoSoVJjlRX78Cq4QxeLMrNIDqUc2RLDhvghIFviyz3hM4_VKcVWY.NANwYiZIGCKk-4F5sHjhQQ.8a4c687fc6c5a9c9bbb45b4e6098f39110bd6a302319c75d88dcac95a96c1c7c
```

Token 结构：


| 段                        | 长度  | 含义                                        |
| ------------------------ | --- | ----------------------------------------- |
| `1`                      | 1   | 版本/协议标识                                   |
| `n24b-...-xg`            | 747 | base64url 载荷（环境指纹 + 遥测 + POW 结果 + ray 绑定） |
| `NANwYiZIGCKk-4F5sHjhQQ` | 22  | 站点/挑战标识                                   |
| `8a4c...1c7c`            | 64  | 完整性校验（SHA-256 形态 hex）                     |


---

## 4. x.ai 侧业务集成（token 消费方）

Turnstile **不是唯一**防护，x.ai 另有 **Castle SDK**（`createRequestToken`）：

```js
// 644.js —— 注册调用链
const castle = await W.createRequestToken({ method:'email_password', flow:'signup', email });
await sendVerificationCode({ email, castleRequestToken: castle });

const n = await signUp.createAccount({
  email, password, givenName, familyName,
  emailValidationCode, turnstileToken: B,      // ← Turnstile token
  castleRequestToken: i,                       // ← Castle token
  marketingEmailOptIn
});
```

- Castle 令牌形态：`m4fRgxVW|JABPeDlESDJjZld4ODdIMGNmUng4...`，由 `https://m.castle.io/v1/monitor` 相关 SDK（bundle `137.js`，`castle-obfuscator`）产出。
- `error_type: 'castle_token_failed'` 是独立失败分支，与 Turnstile 失败分开处理。
- 结论：**要完成注册，需要同时提供 Turnstile token 与 Castle requestToken**；两者都依赖真实浏览器环境。

---

## 5. 端到端验证结果

按真实流程驱动后，注册成功：

```
URL   : https://accounts.x.ai/account
文本  : SpaceXAI / 欢迎，John。 / 账户 / 安全 / 会话 / 数据
全名  : John Smith
邮箱  : edwafcwsedf@aibox666.top
账户创建: 2026年9月11日
```

服务端返回的凭据（已脱敏）：

```
cf_clearance = X5RWStBF...PmZXCV9NxUu_Lq8jZBA..Q     ← Cloudflare 放行凭证
__cf_bm      = .4ARw4u7qaram2UH3r5JCdO5DmcTQHp3...    ← Cloudflare Bot Management cookie
sso / sso-rw = eyJ...JWT...                            ← x.ai 会话 JWT
last-logged-in-with = EMAIL
```

> 注意：`cf_clearance` 与当时的 **IP / TLS 指纹 / UA 强绑定**。

---

## 6. 复现要点与坑

1. **必须真实浏览器执行**：环境校验点随机顺序 + JSVMP，纯补环境不可行（可参考，但工作量大且不稳）。
2. **图片请求不能省**：`/h/g/i/<cRay>/<ch>` 不发则必失败。
3. **closed shadow DOM**：DOM 工具无法直接点到 checkbox，需通过隐藏 input 反查宿主矩形，再用坐标级 `MouseEvent` 序列。
4. **时间敏感**：挑战有 120s 有效期，调试长时间停顿易超时；建议「先 hook、后交互、快速取数」。
5. **token 一次性**：`cf-turnstile-response` 与 widget/ray 绑定，重放无效；每次提交需重新走挑战。
6. **双 token**：别只盯 Turnstile，`castleRequestToken` 同样必需。
7. **字符串表**：Cloudflare 每个版本旋转量/基址不同（本版基址 `458`、旋转 `434`、校验值 `608776`；另一版基址 `239`、校验 `520249`）。需按脚本内恒等式现场计算，不能硬编码。

---

## 7. 交付物清单


| 文件                                                             | 说明                                  |
| -------------------------------------------------------------- | ----------------------------------- |
| `artifacts/new_chl_script_2.js`                                | 挑战页核心 VMP 脚本（237 KB）                |
| `artifacts/chl_script_1.js`                                    | 同源挑战脚本（227 KB，含解密函数 R）              |
| `artifacts/new_table_raw.txt` / `new_strtable_decoded.txt`     | 字符串表原文 / 解密后（1864 行）                |
| `artifacts/strtable_raw.txt` / `strtable_decoded.txt`          | 另一 widget 的字符串表                     |
| `artifacts/cf_decoder.js`                                      | **响应体解密器**（rayId 派生 XOR + atob）     |
| `artifacts/fo_stage1.txt` / `fo_stage2.txt(.plain)`            | `fo` 两阶段加密响应体                       |
| `artifacts/challenge_new.html` / `turnstile_auto_timeout.html` | 挑战页 HTML 快照                         |
| `artifacts/preload_hook.js`                                    | XHR/fetch/turnstile/message 采集 hook |
| `artifacts/ts_iframe_dump.txt`                                 | Turnstile OOPIF target 脚本转储         |
| `artifacts/01~04_*.png`                                        | 过程截图                                |


---

## 8. 与参考资料的关系对照


| 参考                                                  | 本文对应                                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| Turnstile 篇：自定义 VM 字节码 / BigInt 模幂 POW / LZW / 遥测   | §2.4：同款 VM 骨架、同一模数 `0x00e9d3dc...`、同一 `65537` 指数、遥测与 `PerformanceObserver` |
| Turnstile 篇：`decodeEncryptedString`（base64+XOR）     | §2.3：本版为 `rayId+"_0"` 累积 XOR + `atob`，语义等价                                 |
| 5s 盾文：`fo` → `normal` → 环境校验 → token → cf_clearance | §1.2 / §2.5 / §4：完整复刻其分支判定与两步 `fo` 提交                                      |
| Drop 文：以「暴露的端点 + 可离线求解的算法」为突破口                      | 本文同样先摸清端点语义，再回到 JSVMP 逐层拆解                                                 |


---

*报告生成：ProxyCLI（session `default`）| 目标页 `page-27/page-31` | 证据已记录至 `task_xai_cf`*