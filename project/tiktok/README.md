# TikTok Web 端签名参数离线生成（部分脱离浏览器）

> **一句话结论（v2，已修正）**：`X-Gnarly` / `msToken` / `X-Bogus` 三项可在 Node 离线生成**且与浏览器等价**；
> `X-Dynosaur` 能离线生成、但**服务端不认可**（只在 `recommend/item_list` 这类校验宽松的端点上通过）。
> 因此**只有 `/api/recommend/item_list/` 与 `/api/user/list/` 两条路径真正做到脱离浏览器**，
> 其它业务接口（`post/item_list`、`search/*` 等）必须用浏览器签发。
>
> 路线：**补环境跑真 SDK**（vm 加载 `webmssdk.js` 原码），不做纯算法重写。
>
> ⚠️ **v1 结论「四参数均可在 Node 离线生成、服务端接受（itemList=8）」口径过宽**：
> 当时的验收只跑 `/api/recommend/item_list/`，而该端点对签名校验明显宽松。
> 修正依据见 `solver/verify-dynosaur-parity.js`（三跑一致）。

---

## 0. 快速开始（下次会话直接照抄）

```bash
cd /d/work/jsreverse

# ① 纯 HTTP 采会话（无需浏览器；msToken 从这里来）
node tiktok/solver/tt_session.js --selftest

# ② 离线签名自检（无需浏览器，无需网络）
node tiktok/solver/tt_sign.js --selftest

# ③ 冷启动验收（HTTP 取会话 + Node 签名 → recommend 端点真实数据）
node tiktok/solver/verify-coldstart.js

# ④ ★ 签名保真度验收：定位「哪个参数服务端不认」（核心证据，需浏览器 + CDP 19222）
node tiktok/solver/verify-dynosaur-parity.js

# ④' ★ 用「页面真实 query」再确认一遍（排除手拼 query 不完整这个干扰变量）
#     前提：proxycli open && proxycli browser connect --cloak
MSYS_NO_PATHCONV=1 node tiktok/solver/verify-realquery-parity.js /api/post/item_list/

# ⑤ 多业务接口通用性矩阵（需浏览器 + CDP；结论：只有 2/12 端点离线签名真正可用）
node tiktok/solver/verify-endpoint-matrix.js

# ⑥ 签名参数必要性矩阵（需浏览器页面在 tiktok.com）
node tiktok/solver/verify-signature-matrix.js
```

**环境前提**（本机固定条件，改动前先确认）：

| 项 | 值 |
| --- | --- |
| shell | Windows + MSYS bash，命令一律前缀 `cd /d/work/jsreverse &&` |
| Node | v22.23.2 |
| 代理 | `http://127.0.0.1:7890`（**Node/curl 直连 tiktok.com 不通，必须走代理**） |
| CDP 调试端口 | `http://127.0.0.1:19222`（`CDP_URL` 可覆盖）。⚠️ **与 proxycli 互斥**：daemon attach 后裸端口会 ECONNREFUSED，`cdp-oracle.js` 会自动选可用后端（`ORACLE_BACKEND=proxycli|cdp` 可强制） |
| proxycli | `proxycli open && proxycli browser connect --cloak`（跑 ④' 与所有 `_probes/probe-*.js` 需要） |
| 浏览器 | Chrome 153（仅需 CDP/proxycli 的脚本才要；**不必登录**，游客态即可） |

## 1. 签名参数全景（哪些要、哪些真被校验、离线版是否等价）

| 参数 | 观测长度 | 服务端是否硬校验 | 离线版是否与浏览器等价 | 来源 |
| --- | --- | --- | --- | --- |
| `X-Dynosaur` | 404~472（可变，长度非定值） | **✅ 是** | **❌ 否** — 服务端不认，仅在 recommend 上通过 | `webmssdk.js` 生成，**绑定原始 query 字节** |
| `X-Gnarly` | 332 | ❌ 否 | ✅ 是（长度/字符集/结构均一致） | `webmssdk.js` 生成 |
| `msToken` | 120（HTTP 冷启动）/ 172（浏览器会话） | ❌ 否 | ✅ 是（直接复用服务端下发值） | **服务端 `Set-Cookie` 下发** |
| `X-Bogus` | 1（常量 `1`） | ❌ 否 | ✅ 是（占位常量，**不是算法产物**） | 占位常量 |

全部拼在 **query string**，不是请求头。另有 `verifyFp`（= cookie `s_v_web_id`）、
`device_id`、`odinId` 等来自 cookie。

## 1.1 ★ 核心修正：X-Dynosaur 是唯一不等价的参数

**定位方法**（`verify-dynosaur-parity.js`）：对同一份**逐字节相同**的 raw query，
各取「离线签名」与「页面现签」两组，然后**只换单个参数**再发同一端点：

| 用例（端点 `/api/post/item_list/`） | 结果 | 说明 |
| --- | --- | --- |
| A 离线全量 | ❌ 被拒 | 严谨端点不接受离线签名 |
| B 页面全量（对照） | ✅ itemList[16] | 说明请求本身完全合法 |
| C 离线 + 页面的 `X-Dynosaur` | **✅ 通过** | ⇒ **唯一差异参数就是它** |
| D 离线 + 页面的 `X-Gnarly` | ❌ 被拒 | 不是它 |
| E 离线 + 页面的 `msToken` | ❌ 被拒 | 不是它 |
| F 离线 + 页面的 `X-Bogus` | ❌ 被拒 | 不是它 |
| G 离线 + 页面全部签名参数 | ✅ 通过 | 与 C 一致 |
| H 页面 + 离线的 `X-Dynosaur` | ❌ 被拒 | 反向验证：换掉好签名就坏 |
| I 页面 + 离线的 `X-Gnarly` | ✅ 通过 | 离线的 X-Gnarly 不影响 |

即：**X-Gnarly / msToken / X-Bogus 与浏览器等价，X-Dynosaur 不等价**。
长度差异（离线 404~416 / 浏览器 464~472）只是表象，真正原因是内容不被服务端接受。

### 已排查掉的嫌疑（都不是原因）

| 嫌疑 | 结论 | 验证方式 |
| --- | --- | --- |
| 配置对象差异（`_mssdk` 各字段、正则数组） | ✗ 排除 | 同一浏览器 iframe 内用离线配置也能通过 |
| `tt_native` 的 `Function.prototype.toString` 伪装 | ✗ 排除 | 真浏览器里加同样伪装仍通过 |
| `crypto.subtle` 缺失（页面有 EC 私钥条目） | ✗ 排除 | 真浏览器里删掉 `subtle` 仍通过 |
| mssdk 后端响应（`/web/resource?eq=`、`monitor_web/settings`） | ✗ 排除 | CDP `Network.setBlockedURLs` 阻断后仍通过 |
| 浏览器全局缺失（20 项：`structuredClone`/`File`/`indexedDB`/…） | ✗ 排除 | Node 侧补齐后结论不变 |
| 页面 URL / referrer / 指纹输入 | ✗ 排除 | 逐组破坏实验无一能复现失败 |
| **query 不完整**（手拼缺业务参数） | ✗ 排除 | 用**页面真实发出的 41 参数 query** 重跑，结论不变（`verify-realquery-parity.js`）|
| **SDK 走了不同代码分支** | ✗ 排除 | 调用序列逐位置比对：两侧仅差一次 `Date.now`（88 vs 87），其余完全一致 |
| **缺少某个浏览器全局**（73 项） | ✗ 排除 | 按 8 组 + 全量补齐后签名仍被拒（`probe-globals-fill.js`）|

### 已做的三级定位（下一步建议的实施结果）

| 级 | 探针 | 结果 |
| --- | --- | --- |
| 1 调用序列 | `_probes/probe-seq-divergence.js` | 两侧序列**几乎相同**（分叉仅因一次 `Date.now`）⇒ 不是分支差异，而是**读到的值**差异 |
| 2 环境值 | `_probes/probe-env-value-diff.js` | 列出 73 项 Node 缺失全局 + 5 项类型不同 + 95 项值不同 |
| 3 批量补齐 | `_probes/probe-globals-fill.js` | 8 组 + 全量补齐**全部仍被拒** ⇒ 不是「某个全局存在与否」 |

**结论（下一步的真正起点）**：差异在**语义/行为层面**，不在「有没有这个全局」。
最有希望的四个方向（已写入 `artifacts/findings-next-step.json`）：
1. `self` / `top` / `parent` / `frames`：浏览器里是**真 Window**，Node 里是普通对象；
2. `localStorage` / `sessionStorage`：真 `Storage` 的 `getItem/setItem` 与普通对象不同；
3. 原型链与 `toString`：SDK 可能读 `constructor.name` / `Object.prototype.toString`；
4. **反向二分**：在真浏览器 iframe 里逐项破坏这 73 项，找出使签名变坏的那一项。

**最有力的对照**：同一份 `webmssdk.js` 原码注入**真浏览器 iframe**、用同一份配置 init，
签名**被接受**；换成 Node `vm` 补环境即被拒。
⇒ 差异在**浏览器 JS 引擎的某些行为**上，而非配置或算法版本。

## 2. 方法论要点（含两个必读陷阱）

### 2.1 `msToken` 是 `Set-Cookie` 下发 —— 不需要逆 `eq`、不需要解密
一度以为要逆向 `mssdk-sg.tiktok.com/web/resource?eq=<加密>`（响应是加密 blob）。
实际上 **任何 tiktok.com 请求都会用普通 `Set-Cookie` 下发 msToken**：

```
GET https://www.tiktok.com/api/recommend/item_list/?aid=1988&...   （业务会失败，没关系）
← Set-Cookie: msToken=t6hDI80sxCQSBU9FSw_0Dm2PeeTSBfzo6vLfHV0eCww...; domain=tiktok.com
```

所以冷启动只需两次 GET，`eq` 逆向**完全不需要**。
- 长度**不是定值**：HTTP 冷启动 ~120 字符，浏览器登录态 172 字符（base64 载荷不同），断言别写死。
- `ttwid` **不是必需**：实测首页被 WAF 拦 5 次（拿不到 ttwid），msToken 仍有效、签名仍被接受。

### 2.2 页面 `fetch` 会被 SDK 自动重新签名（方法论陷阱，必读）
任何经**页面** `fetch` 发出的请求，SDK 都会重新签名一遍。
→ 用它测「去掉签名」**永远得到假阳性**（因为被补签了），这会让人误判「某参数不重要」。
**必须用 iframe 的原始 fetch**（未被页面 SDK 包装）：

```js
const f = iframe.contentWindow.fetch.bind(iframe.contentWindow);
```

### 2.3 `X-Dynosaur` 绑定「原始 query 字节」→ 实验必须用字符串级增删
用 `URL` 对象增删参数会触发 **re-encode**，让未改动的参数变成不同字节，
签名随之失效 —— 于是「删除某参数」的失败无法区分是「参数被删」还是「编码被改」。

做签名实验**必须在字符串层面**操作（见 `verify-signature-matrix.js` 的 `dropRaw/setRaw`）。
换成字符串级后，矩阵结果连跑三次完全一致。

### 2.4 ★ 端点严格度不同：recommend 宽松，其它业务接口严格
这是 v1 结论过宽的直接原因。**同一份离线签名**：

| 端点 | 离线签名 | 浏览器签名 |
| --- | --- | --- |
| `/api/recommend/item_list/` | ✅ itemList=16 | ✅ itemList=16 |
| `/api/post/item_list/` | ❌ 0 字节 | ✅ itemList=16 |
| `/api/search/user/full/` | ❌ 0 字节 | ✅ user_list[10] |
| `/api/user/list/` | ✅ userList[30] | ✅ userList[30] |
| `/api/challenge/detail/` | ✅ challengeInfo | ✅ challengeInfo（不校验签名）|

⇒ **只能拿 recommend 做验收，会误判为「已完全打通」**。
多接口矩阵见 `solver/verify-endpoint-matrix.js`（结果：12 个端点里只有 3 个接受离线签名）。

### 2.5 「签名不对」与「业务参数不足」必须用浏览器对照拆开
多个接口（`user/detail`、`post/item_list`、`search/item_list` 等）在**浏览器现签**下
同样返回 `len=0` 的空体。若只看离线结果，会把它们误归因为「签名失败」。
因此 `verify-endpoint-matrix.js` 对每个接口都跑三路：离线 / 去 X-Dynosaur 负对照 / 浏览器现签对照，
并据此归因（`SIGNATURE_WEAK` / `NEEDS_MORE_PARAMS`）。

## 3. 协议链路（已证）

```
页面 fetch(...)
  └─ secsdk_runtime_bundler.js  onRequest        ← PPF 隐私框架包装（不改签名）
       └─ webmssdk.js  Array.d @1:149129         ← 真正在这里拼 URL / 生成签名
            └─ S(...)  JSVMP 解释器 @1:243557
                 └─ new URL(...)                  ← 签名参数在此刻已拼好
```

证据：`scripts/capture-writer-stack.js`（调用栈）+ `artifacts/decoded-webmssdk-strings.json`
（字符串表解开后明文含 `X-Gnarly` / `X-Dynosaur` / `X-Bogus` / `signURL`）。

**`byted_acrawler.init(配置)` 是签名链路的开关**：不调用它，SDK 只认 2 条默认路径，
不给业务 API 追加任何签名参数。必须喂真实配置（209~211 条 API 路径）：

```js
init({ aid:1988, intercept:true, mode:516, enablePathList:[...209条...], region:'sg-tiktok', ... })
```

`bootstrap()` 已封装，配置来自 `artifacts/mssdk-dump.json`（CDP 从真实页面 dump，
用 `scripts/dump-mssdk.js` 重采；该脚本会连真正的 `_enablePathListRegex` 正则数组一起存）。

## 4. 验收证据

### 4.1 冷启动验收（`verify-coldstart.js`）—— **仅覆盖 recommend 端点**
```
① 纯 HTTP 采会话:  cookie=356字符  msToken=120字符
② Node 离线签名:   X-Gnarly=332  X-Dynosaur=408~416  X-Bogus=1  msToken=120
③ 发送:
   N) Node 经代理直发   http=200 len=18    items=0   ← 出口 IP 被风控
   I) 浏览器 iframe 发出 http=200 len=208116 items=8  ← recommend 端点接受
```
⚠️ 不要把这个结果读成「已完全脱离浏览器」—— 见 4.4。

### 4.2 签名矩阵（`verify-signature-matrix.js`，三轮一致）
| 用例 | items | 结论 |
| --- | --- | --- |
| A 基准：Node 完整签名 | **8** | 被接受（仅 recommend 端点）|
| B 去掉 X-Dynosaur | 0 | 被拒 |
| C 篡改 X-Dynosaur | 0 | 被拒 |
| H 挪用他 query 的 X-Dynosaur | 0 | 被拒（绑定 query）|
| J 三种签名全去掉 | 0 | 被拒 |
| D/E/F/G 去掉 X-Gnarly / msToken / X-Bogus | 8 | **非强制** |
| I 同 URL 立即重放 | 8 | 无一次性限制 |

### 4.3 X-Bogus 同构性（`verify-xbogus-accepted.js`）
300 样本下，浏览器与 Node 输出的字母表**完全一致**（标准 base64 全集）。

### 4.4 ★ 签名保真度验收（`verify-dynosaur-parity.js`）—— 修正 v1 结论的核心证据
九项判定全部成立（连跑三次一致）：
```
A 离线签名在严格端点上被拒            : ✅
B 页面现签在同一端点上被接受          : ✅
C 换上页面的 X-Dynosaur 即通过        : ✅   ← 唯一差异参数
D/E/F 换 X-Gnarly / msToken / X-Bogus 都不通过: ✅
G 离线 + 页面全部签名参数             : ✅
H 页面 + 离线 X-Dynosaur → 被拒       : ✅
I 页面 + 离线 X-Gnarly → 仍通过        : ✅
```

### 4.5 多业务接口矩阵（`verify-endpoint-matrix.js`）
每个接口跑三路（离线 / 去 X-Dynosaur 负对照 / 浏览器现签对照）：

| 接口 | 离线签名 | 浏览器现签 | 归因 |
| --- | --- | --- | --- |
| `/api/recommend/item_list/` | ✅ itemList[8] | ✅ | 可用 |
| `/api/user/list/` | ✅ userList[30] | ✅ | 可用 |
| `/api/challenge/detail/` | ✅ challengeInfo | ✅ | 该端点不校验签名 |
| `/api/user/detail/` 等 8 个 | ❌ | ❌ | 该接口还需其它业务参数 |
| `/api/user/playlist/` | （空但 status_code=0） | 同 | 需先有收藏夹，需人工判读 |

结论：12 个端点里**离线签名真正可用 2 个**。
注意：手拼的 query 对多个接口不完整（浏览器现签也拿不到数据），
这恰恰说明 **4.4 / 4.6 的参数级对照才是签名结论的可靠依据**。

> 注：依赖业务 ID 的用例（话题、带 `secUid` 的列表）在取不到 ID 时会自动跳过，
> 所以不同时间跑的「总数」会略有差异（10~12）。
> `search/user/full` 的归因也会波动（有时浏览器现签能过、有时不能）——
> 手拼的搜索 query 本身不稳定，不是签名结论变化。
> 稳定的结论是 4.4 / 4.6 的参数级对照。

### 4.6 ★ 用「页面真实 query」复核（`verify-realquery-parity.js`）

为什么还要再验一遍：4.4 用的是**手拼 query**，对多个接口浏览器现签也拿不到数据，
有人可以质疑「离线失败是因为 query 不对」。本脚本从 proxycli 网络记录里直接取
**页面真实发出的完整 URL**（41 个参数，含登录态/`device_id`/`clientABVersions` 等），
再跑同一套参数级对照：

```
目标: /api/post/item_list/
页面真实 query: 41 个参数   页面签名的 X-Dynosaur=416 字符
   A 离线全量                    ❌ sc=null len=0
   B 页面全量                    ✅ itemList[16]
   C 离线 + 页面 X-Dynosaur      ✅ itemList[16]     ← 唯一差异参数
   D 离线 + 页面 X-Gnarly        ❌ sc=null len=0
   E 页面 + 离线 X-Dynosaur      ❌ sc=null len=0
```

⇒ 同一份真实 query，**只换 X-Dynosaur 就能过**，结论与 4.4 完全一致，
「query 不完整」这个干扰变量已排除。

### 4.7 三级定位（下一步建议的实施结果）

| 级 | 探针 | 结果 |
| --- | --- | --- |
| 1 调用序列 | `_probes/probe-seq-divergence.js` | 两侧 88 vs 87 条，**仅差一次 `Date.now`** ⇒ 同一条代码路径 |
| 2 环境值 | `_probes/probe-env-value-diff.js` | 73 项 Node 缺失全局 + 5 项类型不同 + 95 项值不同 |
| 3 批量补齐 | `_probes/probe-globals-fill.js` | 8 组 + 全量补齐**全部仍被拒**（页面基准 ✅）|

⇒ **差异在语义/行为层面，不在「有没有这个全局」。**
下一步方向已写入 `artifacts/findings-next-step.json`（self/top/parent 是真 Window、Storage 语义、
原型链与 toString、以及「在真浏览器里逐项破坏做反向二分」）。

## 5. 用法

```js
const { TikTokSigner } = require('./solver/tt_sign');
const { buildSession } = require('./solver/tt_session');

const sess = await buildSession();               // 纯 HTTP 取 cookie + msToken
const s = new TikTokSigner({
  cookie: sess.cookie,
  storage: { local: sess.local, session: sess.session },   // msToken 从这里被读到
}).init();
s.bootstrap();                                   // 激活签名链路（必需）

const { url, params } = await s.sign(rawQuery, '/api/recommend/item_list/');
// params = { 'X-Gnarly':..., 'X-Dynosaur':..., 'X-Bogus':..., msToken:... }
```

签名**必须即时生成**：与当次 query 字节绑定，缓存复用会失败。

⚠️ **能用在哪**：`X-Gnarly` / `msToken` / `X-Bogus` 可以拿来替（与浏览器等价）；
**`X-Dynosaur` 不要拿来替** —— 服务端不认，只有 `recommend/item_list` 这类宽松端点会放过。
需要在严格端点上跑时，`X-Dynosaur` 必须向浏览器要。

## 6. 文件表

### sources/（原站 JS，一律 `.orig`）
| 文件 | 说明 |
| --- | --- |
| `webmssdk.1.0.0.417.js.orig` | **核心**：签名生成方（与线上逐字节一致，已校对） |
| `webmssdk_ex.1.0.0.2865.js.orig` | 提供 `window._xex`（上报），含字符串表 |
| `webmssdk_ex.1.0.0.2867.js.orig` | 线上当前版本（2865 的升级版，`probe-fetch-ex.js` 抓） |
| `secsdk.1.2.22.umd.js.orig` | CSRF token 防护（与本议题无关） |
| `ppf_loader.1.0.0.951.js.orig` | 隐私保护框架加载器 |

### solver/（核心推导件）
| 文件 | 作用 |
| --- | --- |
| `tt_sign.js` | **主入口**：`TikTokSigner.init()/bootstrap()/sign()` |
| `tt_session.js` | **纯 HTTP 会话引导**（cookie + msToken），含 WAF 重试 |
| `cdp-oracle.js` | **验收基础设施**：iframe 原始 fetch 批量发 URL + 响应摘要；页面现签对照。双后端（proxycli / 裸 CDP）自动选择 |
| `tt_env.js` | 浏览器式环境（localStorage / cookie / XHR / fetch 均可注入） |
| `tt_native.js` | native 保护：骗过 SDK 的 `[native code]` 检测 |
| `net.js` | 极简 HTTP(S) 客户端（走代理 CONNECT 隧道） |
| `verify-coldstart.js` | 冷启动验收（HTTP 会话 + Node 签名，**仅 recommend 端点**） |
| **`verify-dynosaur-parity.js`** | ★ **保真度验收**：参数级交叉替换，定位到「X-Dynosaur 是唯一不等价参数」 |
| **`verify-endpoint-matrix.js`** | ★ **多接口矩阵**：离线 / 负对照 / 浏览器对照 三路比对，输出归因 |
| `verify-signature-matrix.js` | 签名参数必要性矩阵（recommend 端点） |
| `verify-recommend.js` | 三路对比（Node 直发 / iframe / 浏览器） |
| `verify-xbogus-accepted.js` | X-Bogus 与浏览器同构性（300 样本） |
| `replay-mssdk-network.js` | 把抓到的 mssdk 后端响应回灌补环境（排查用） |
| `diagnose-empty-body.js` | 「http=200 但 0 字节」三路对照（页面 / iframe / 反签） |
| `dump-session.js` | 从浏览器 dump 会话（备选路径，冷启动已不需要） |
| `capture-mssdk-token.js` | 抓 mssdk 后端请求（`eq` / 加密响应取证） |
| `find-mstoken-storage.js` | 定位 msToken 存放位置（→ `localStorage`） |
| `trace-mstoken-source.js` | 抓 mssdk 后端调用与 msToken 复用情况 |
| `check-rate-limit.js` | 风控判定 |
| `_probes/` | 排查脚本（记录定位方法，见其 README） |

### scripts/（浏览器侧采集）
| 文件 | 作用 |
| --- | --- |
| `cdp.js` | 极简 CDP 客户端（绕过 proxycli worker 卡顿） |
| **`dump-mssdk.js`** | 重采 `_mssdk` 配置（**含真正的 `_enablePathListRegex` 正则数组**，JSON 无法序列化） |
| **`capture-mssdk-network.js`** | 用 CDP Network 抓 SDK 启动时的后端配置请求 + **响应体** |
| `capture-writer-stack.js` | 抓签名 URL 构造点调用栈 |
| `capture-signed-url.js` | 抓浏览器最终发出的已签名 URL |
| `decode-webmssdk-strings.js` | 解 webmssdk 字符串表 |
| `locate-string-usage.js` | 定位字符串表使用点 |
| `preload-fix-fetch.js` | 修复被污染的 fetch（见坑 1） |

### artifacts/
| 文件 | 说明 |
| --- | --- |
| `mssdk-dump.json` | 真实页面 dump 的 `_mssdk` 配置（`bootstrap()` 的输入，含正则源） |
| `session-dump.json` | 浏览器会话快照（验收脚本的会话来源） |
| `verify-dynosaur-parity.json` | ★ 保真度验收原始结果 |
| `verify-endpoint-matrix.json` | ★ 多接口矩阵原始结果 |
| `verify-signature-matrix.json` | 矩阵验收原始结果 |
| `verify-coldstart.json` | 冷启动验收原始结果 |
| `mssdk-network.json` | SDK 后端配置请求 + 响应体取证 |
| `decoded-webmssdk-strings.json` | 解开的字符串表（签名参数归属证据） |
| `probe-*.json` | 各探针的原始输出（参数级排查证据） |
| `findings-next-step.json` | 三级定位的汇总结论 + 下一步方向 |

## 7. 环境坑（每条都会导致假结果或卡死，务必先读）

1. **`window.fetch` 不能用 getter/setter 劫持**：SDK 包装器会 `var he = window.fetch`
   拿到我们的 shim，形成 `shim → SDK wrapper → shim` **无限递归，页面直接卡死**。
   要观察网络请用 CDP `Network` 域，或单层函数包装。
2. **proxycli worker 会因页面卡死而 `client disconnected`**；此时用 `scripts/cdp.js`
   直连 CDP 端口绕过。
3. **Node/curl 直连 tiktok.com 不通**，必须走代理（`net.js` 已封装）。
4. **tiktok.com 首页会间歇返回 WAF 挑战页**（约 1462 字节，含 `_wafchallengeid`，
   不下发任何 cookie）——必须重试，`tt_session.js` 已内置 `isWafChallenge()` 判定。
5. **`inject_preload_script` 是 future-only**：已打开的页面不受影响，需重新导航才生效。
6. **`_mssdk` 是被 SDK「就地扩展」的**，不是整体赋值；直接 `window._mssdk = {...}` 会被覆盖。
7. **xbs isolated-vm 原生 addon ABI 不匹配**（需 NODE_MODULE_VERSION 123，Node 22 = 127），
   故本项目走纯 `vm` 方案。
8. **`tt_env.js` 的 `FakeXHR` 默认返回假响应**。SDK 靠 XHR 取后端资源，
   排查「某字段为空」时先确认是否被死桩了（本项目 msToken 为空曾卡在这里）。
9. **页面 `document.cookie` 里没有 `ttwid`**（它是 HttpOnly，只有 CDP `Network.getAllCookies`
   看得到）；不要把 `document.cookie` 当成「完整 cookie」用。
10. **`/api/*` 的「http=200 + 0 字节」= 被拒**，不是网络错误。
    排查时先跑 `diagnose-empty-body.js` 看三路对照，别直接归因为签名问题。
11. **MSYS 会把 `/` 开头的命令行参数转成 Windows 路径**（`/api/xxx/` → `E:/env/Git/api/xxx/`）。
    传站点路径参数时必须加 `MSYS_NO_PATHCONV=1`；已加防护的脚本会明确报错提示。
12. **proxycli 与裸 CDP 互斥**：`proxycli browser connect` 后裸端口 19222 会 ECONNREFUSED。
    `cdp-oracle.js` 已做自动后端选择；用 proxycli 后端时**不要**再用 `Runtime.evaluate` 那套。
13. **proxycli 脚本体量敏感**：内联 243KB 的 SDK 原码会**静默失败**。
    要让页面自己 `fetch()` 原码（`probe-seq-divergence.js` 已这样做）。
14. **proxycli 结果必须 base64 回传**：结果里满是引号/反斜杠，走 shell 中转的转义极易损坏。
    统一 `btoa(unescape(encodeURIComponent(JSON.stringify(x))))`；解析时按行扫 `value:` 字段，
    不要用正则拆转义文本。另：**base64 长度阈值不能设太高**（`btoa('ok')` 只有 4 字符）。
15. **proxycli 的 `--filePath` 在 worker 模式不支持**（`saveFile not supported in worker mode`）。
    大结果要在**页面内**先汇总/diff，只回传摘要。
16. **不要替换 `window.Date` 本体做插桩**（会丢掉静态方法与原型语义，SDK 直接报
    `this is not a Date object`）。只包装 `Date.now`。
17. **用 `Proxy` 包整个 vm sandbox 会破坏全局语义**（SDK 报 `t is not a constructor`）。
    要记录属性读取，改用「白名单取值快照」而非全代理（见 `probe-env-value-diff.js`）。
18. **页面导航后 `_mssdk` 会重新初始化**，旧的 `byted_acrawler` 引用失效；
    且导航拼错（如 `/@@tiktok`）会把页面弄坏，需 `navigate_page` 手动恢复。

## 8. 已知限制

1. **★ `X-Dynosaur` 与浏览器不等价（核心限制）**：能生成、长度量级也对，但服务端不认。
   已用参数级交叉替换证实它是**唯一**差异参数（见 4.4），并在**页面真实 query** 上再次确认（4.6）；
   并排除了配置 / native 伪装 / `crypto.subtle` / mssdk 后端响应 / 73 项浏览器全局 / 页面 URL 等嫌疑。
   调用序列逐位置比对显示**两侧走同一条代码路径**（仅差一次 `Date.now`），
   而 8 组 + 全量补齐缺失全局后**仍被拒** ⇒ 差异在**语义/行为层面**。
   同码同配置的真浏览器 iframe 签名却**被接受**。
   **下一步的真正起点**（详见 `artifacts/findings-next-step.json`）：
   ① `self`/`top`/`parent`/`frames` 在浏览器里是真 Window（Node 是普通对象）；
   ② `localStorage`/`sessionStorage` 的 `Storage` 语义；③ 原型链与 `toString`；
   ④ 反向二分：在真浏览器 iframe 里逐项破坏那 73 项，找出使签名变坏的那一项。
2. **只能在 recommend 端点验收**：该端点校验宽松，换成 `post/item_list` 立即失败。
   拿它当「已完全打通」会得出错误结论（v1 就踩了这个坑）。
3. **多数业务接口还需其它业务参数**：`user/detail`、`item/detail` 等即使浏览器现签也返回空体，
   需要在浏览器里实际走一遍页面才能采到完整 query。
4. **Node 直发受出口 IP 风控**：验收用 iframe 原始 fetch 规避；生产环境需可用出口。
5. **`msToken` 未解出生成算法**（也不需要）：已确认是服务端下发，直接 HTTP 取即可。
6. **`enablePathList` 有 209 条**（去重后），目前只实测了其中十余条。

## 9. 已证伪的假设（避免下次重走）

| 假设 | 结论 |
| --- | --- |
| 「四参数均可离线生成且被服务端接受」 | ✗ 口径过宽：**X-Dynosaur 不被严检端点接受**（见 4.4） |
| `byted_acrawler.frontierSign` 能出 X-Gnarly/X-Dynosaur | ✗ 只返回 `X-Bogus`（16 位） |
| `window._xex.r(...)` 是签名接口 | ✗ 它是**上报**接口（mode 0/1/2 = sec/asgw/init） |
| secsdk / PPF loader 生成签名 | ✗ 二者源码无 `Gnarly`/`Dynosaur` 字面量 |
| 签名 URL 可缓存复用 | ✗ 重放必败（但同 URL 立即重放可通过，见矩阵 I） |
| `X-Bogus=1` 是有效签名 | ✗ 是占位常量（去掉/改成任意值都不影响） |
| 需要逆 `mssdk-sg.../web/resource?eq=` 才能拿 msToken | ✗ 普通 `Set-Cookie` 就下发 |
| 需要回灌 `/web/resource` 响应才能得到有效签名 | ✗ CDP 网络层阻断它后签名仍被接受 |
| 注入 `localStorage.msToken` 到 SDK 内部状态即可 | ✗ 要注入到**环境**的 localStorage（`opts.storage`），曾因没透传而误判 |
| 浏览器「账号被限流」导致验收失败 | ✗ 实为**出口 IP** 被风控；iframe 发同一签名可成功 |
| `_mssdk` 必须是普通 Object | ✗ 页面里它实际是 **Array**（带命名属性，`length=0`）；但改对类型并不能修复签名 |
| 离线配置（`loadSeedConfig`）与页面配置不等价 | ✗ 逐字段换回页面值后签名仍被接受；配置不是原因 |
| `tt_native` 的 `toString` 伪装导致签名降级 | ✗ 真浏览器里加同样伪装仍通过 |
| `crypto.subtle` 缺失（页面有 EC 私钥）导致降级 | ✗ 真浏览器里删掉 `subtle` 仍通过；SDK 全程不调它 |
| 缺浏览器全局（20 项）导致降级 | ✗ Node 侧补齐后结论不变 |
| 缺浏览器全局（全量 73 项）导致降级 | ✗ 按 8 组 + 全量补齐后仍被拒（`probe-globals-fill.js`）|
| SDK 在 Node 里走了 fallback 分支 | ✗ 调用序列逐位置比对：两侧仅差一次 `Date.now` |
| 手拼 query 不完整导致离线签名被拒 | ✗ 用页面真实 41 参数 query 重跑，结论不变 |
| 签名里有时间戳，过期即失效 | ✗ 同 URL 立即重放可通过；新签的被拒 |

## 10. 下一步（推荐顺序）

> 本节已按「下一步建议实施」的结果重写。三级定位已完成，
> 结论：差异在**语义/行为层面**，不在「缺某个全局」。完整数据见
> `artifacts/findings-next-step.json`。

1. **★ 反向二分（最直接，建议先做）**：在真浏览器 iframe 里**逐项破坏**
   `probe-env-value-diff.js` 列出的 73 项全局之一，看哪一项被破坏后签名变坏。
   正向补齐已排除（全补也不行），反向破坏能直接定位到「哪一项被 SDK 真正依赖」。
   建议优先试：`self`/`top`/`parent`/`frames`（真 Window vs 普通对象）、
   `localStorage`/`sessionStorage`（`Storage` 语义）、原型链与 `toString`。
2. **为严检接口在浏览器端签发 X-Dynosaur**（当前唯一可行的生产方案）：
   把 `cdp-oracle.js` 的 `pageSigned(raw, path)` 当成一个小服务，由浏览器补上这一个参数，
   其余三项用 Node 离线出（已证等价）。
3. **用 proxycli 采真实业务 query 全集**：`list_network_requests` 直接给出页面真实 URL，
   比手拼可靠（`verify-realquery-parity.js` 已示范）；可批量导出后逐个验签名。
4. **换可用出口 IP**，让 Node 直发也能通过。
5. 若需长期稳定：把 `tt_session.js` 的会话缓存起来（msToken 有效期约 1 年，见
   `Set-Cookie: expires=`），避免每次冷启动。
