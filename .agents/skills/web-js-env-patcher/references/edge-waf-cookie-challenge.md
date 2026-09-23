# 边缘 WAF / CDN 准入 Cookie 挑战族谱

当目标站点出现下面这条链路时读取本文件：

```
首访不是正常页面（403 / 412 / 429 / 503 / 521 / 202）
  → 响应体是「一段 JS」或「一段 HTML 里塞着 JS」
  → 响应头 Set-Cookie 下发一个「无值或半值」的准 cookie（如 __jsluid_s、__cf_bm）
  → JS 算出一个 clearance cookie 后 reload
  → 第二次仍然可能不是正常页面（cookie 变了）
  → 最终带最新 clearance cookie 才能拿到正常页面
```

**本文件是该族（CDN / WAF 边缘准入 Cookie）判层、链路形态与一致性绑定的唯一权威源。**
其它文件只引用、不复述：

| 想查什么 | 去哪里 |
|---|---|
| 纯算求解（jsl 补位、acw_sc__v2、CF 响应体解码、CF 字符串表旋转） | `../../web-reverse-algorithm/references/10-waf-clearance-cookie.md` 与 `../../web-reverse-algorithm/scripts/waf_clearance_solver.py` |
| 瑞数（Botgate）分代与三件套 | `references/ruishu-botgate.md`、`references/ruishu-vmp-structure.md` |
| 多趟自举的通用判据与趟数上限 | `references/multi-pass-cookie-generation.md` |
| Cookie 分类与四层链路 | `references/cookie-generation-analysis.md` |
| 挑战页资源的保鲜与「同一页面修订」 | `references/dynamic-resource-freshness.md` |
| 请求顺序、Cookie jar、Session 生命周期 | `references/session-request-chain.md` |
| UA / Client Hints / TLS / HTTP2 对齐 | `references/tls-request-validation.md` |
| 高强度完整性检测（WebGL/plugins/webdriver 掩码） | `references/high-strength-browser-detection.md` |
| 验证码型（有图、有交互）的识别与求解 | `../../web-verify-patcher/SKILL.md` |

本文件只描述**证据特征、链路形态、一致性绑定与排错顺序**，用于授权范围内的分析。
不提供可运行的风控绕过成品，不用于绕过登录、验证码、MFA 或访问控制。

## 执行次序

1. 先按 `SKILL.md` 硬规则 1 / 主流程 A 完成 intake 与取证模式确认。**读到本文件不等于可以跳过 intake。**
2. 跑 `node scripts/classify_edge_challenge.js --html <页面> --status <码> --cookies <Set-Cookie> --markdown` 定族
   （或人工按 §1 表判）。**命令一律以本技能根 `.claude/skills/web-js-env-patcher/` 为 cwd**，
   在仓库根直接照搬 `scripts/...` 会找不到文件（详见下面「快速工具」的路径说明）。
3. 按 §2 对应小节抓一次**完整的**多趟序列，原始字节落盘。
4. 再决定路线：**纯算**（§2 各小节的「可离线求解」条）还是**环境拟合**（§2 的「必须真浏览器」条）。
5. 最后按 §4 固定一致性维度，按 §5 排错。

---

## 1. 一页判层

判层三要素：**响应码 × 响应体形态 × Set-Cookie 名**。任一条单独都不可靠，至少凑两条。

| 厂商 / 族 | 典型首访码 | 响应体形态 | 关键 Set-Cookie / 请求头 | 落层 |
|---|---|---|---|---|
| 加速乐（jsl） | **521** | 一段 `document.cookie=('_')+('_')+('j')+...` 表达式拼接 | `__jsluid_s`（第一趟）→ `__jsl_clearance_s`（第二趟） | 纯算（两趟都能离线解） |
| 阿里 acw_sc__v2（旧版） | 200 但内容异常 | 内联 `<textarea>` 藏 `arg1` + OB 混淆 JS | `acw_sc__v2` | 纯算（`unsbox` + `hexXor`） |
| 阿里 acw_sc__v2（新版） | 200 但内容异常 | 内联 JS + `PxjRjE` 主函数 + 无限 debugger | `acw_sc__v2` | 纯算（LCG + 洗牌），需**原始未格式化** JS |
| Cloudflare 5s 盾 / managed | 403 / 503（也有 200 + JS 跳转的形态） | `Just a moment...` + `/cdn-cgi/challenge-platform/` | `__cf_bm` → `cf_clearance` | 混合：响应体可离线解，环境校验必须真浏览器 |
| Cloudflare Turnstile | 200 | 独立 iframe `challenges.cloudflare.com/turnstile/...` + 隐藏 `input[name=cf-turnstile-response]` | `cf_clearance` | 混合（同上） |
| Cloudflare Drop | — | `/cdn-cgi/…` 之外的 `api.cloudflare.com/client/v4/provisioning/previews/*` | 无 clearance cookie，靠 PoW | 纯算（时间锁 PoW，可离线） |
| Akamai Bot Manager | 200 | `sensor.js`（约 512KB，高度混淆） | `_abck`、`bm_sz`、`ak_bmsc`、`bm_sv` | 环境拟合（环境数组 + 行为） |
| F5 Shape / Reese84 | 200 | 动态路径 JS（路径每几小时轮换）+ `reese84interrogatorconstructor` | `reese84` cookie 或 `X-D-Token` 头 | 环境拟合（22 个采集函数） |
| Imperva / Incapsula | 403 / 200 | `___utmvc` + `reese84` | `visid_incap`、`incap_ses` | 环境拟合 |
| Kasada | 静默 403 / 429 | `ips.js`（多态命名） | `x-kpsdk-ct`、`x-kpsdk-cd`、`KP_UID` | 环境拟合 + PoW |
| DataDome | 403 | `boring_challenge`（WASM） | `datadome` | 环境拟合 |
| HUMAN / PerimeterX | 403 | `px-captcha` / `_px3` 采集 | `_px3`、`_pxde`、`pxvid` | 环境拟合 |
| AWS WAF | 405 / 403 | `challenge.js` / `captcha.js` | `aws-waf-token` | PoW（可离线）+ 可选 `grid` |
| Fastly Bot Management | 403 | 轻量 JS PoW | `fs_ch_st`、`fs_ch_cp` | PoW |
| Anubis（开源反 AI 爬虫） | 200 / 403 | 反向代理页 + JS PoW | 无标准 cookie 名 | PoW |

**快速工具**（命令里的路径按**本文件所在目录**为基准：`.claude/skills/web-js-env-patcher/references/`；
`scripts/...` 指本技能根，`../../<别的技能>/...` 指同级技能）：

```bash
# ① 定族（首选，Node 版）：输出 vendor + family + 落层 + 下一步命令
node scripts/classify_edge_challenge.js --html page.html --status 521 --cookies "__jsluid_s=..." --markdown
# 手上只有响应头时同样可用（证据越全，置信度越高）
node scripts/classify_edge_challenge.js --headers resp_headers.txt --markdown

# ② 离线可解的先解（jsl 补位 / acw_sc__v2 / CF 响应体）
python ../../web-reverse-algorithm/scripts/waf_clearance_solver.py jsl --json '{"bts":[...],"chars":"...","ct":"...","ha":"sha1"}'
python ../../web-reverse-algorithm/scripts/waf_clearance_solver.py acw-v2-old --arg1 <40位hex>
python ../../web-reverse-algorithm/scripts/waf_clearance_solver.py cf-decode --body fo_stage2.txt --ray <16位hex>
```

> 求解器也有 `classify` 子命令（判据与上面的 Node 版同源，纯 Python、零依赖）。
> **不要两边各跑一次**：环境里能跑 Node 就用 Node 版（证据字段更全、输出更细）；
> 只有在没有 Node 时才用 `waf_clearance_solver.py classify` 兜底。

**判层三个高频误判**：

1. **`waf-challenge` ≠ 验证码。** 这一族没有图片、没有用户交互、没有「人工成功样本基线」。用验证码的 Phase-2 流程（图片还原、坐标换算、打码平台）处理它必然空转。
2. **响应码不是唯一判据。** 阿里 acw_sc__v2 首访是 200，只是内容被换掉；Akamai / Reese84 / Kasada 全程 200。**必须同时看响应体形态和 Set-Cookie。**
3. **同一站可能叠两家。** 例如 Cloudflare（边缘准入）+ 站点自研 SDK（业务风控）。两层要分别识别、分别满足；只过一层仍然失败。

---

## 2. 六族逐族

### 2.1 加速乐（jsl）：两趟 521

**代际/形态**：目前观察到的只有一种形态，区别只在第二趟的 `ha` 与 `chars` 长度。

**链路**（必须三趟都走，且共用同一 Session）：

| 趟 | 请求 | 响应 | 做什么 |
|---|---|---|---|
| 1 | 无 cookie | **521** + `Set-Cookie: __jsluid_s=...` + 一段 `document.cookie=...` | 取出 `document.cookie=` 右侧表达式求值 → 得第一趟 `__jsl_clearance_s` |
| 2 | 带第一趟两个 cookie | **521** + 一段 OB 混淆 JS，结尾 `go({...})` | 解出第二趟 `__jsl_clearance_s`（覆盖同名 cookie） |
| 3 | 带更新后的 cookie | **200** + 正常页面 | 完成 |

**第一趟的表达式**是纯字面量拼接（`('_')+('_')+...` 配 `-~{}+''`、`(1+[2])/[2]+''`、`1<<1` 这类 JSFuck 化算术），**不需要解混淆，直接求值即可**。
稳妥做法是把 `document.cookie=` 与 `;location.href=` 之间的整段抠出来交给 JS 引擎（`execjs` / node `eval`）执行；
纯 Python 路线见 `../../web-reverse-algorithm/scripts/waf_clearance_solver.py` 的 `jsl-first`。

**第二趟的 `go({...})` 参数**：

```js
{"bts":["<ts>|<n>|<3字符>","<URL编码的哈希>"],
 "chars":"<23 或 24 个字符>", "ct":"<十六进制哈希>",
 "ha":"md5|sha1|sha224|sha256|sha384|sha512|sha3",
 "is":true, "tn":"__jsl_clearance_s", "vt":"3600", "wt":"1500"}
```

**求解公式**（双字符补位暴力）：

```
for i in 0..len(chars)-1:
  for j in 0..len(chars)-1:
    cand = bts[0] + chars[i] + chars[j] + bts[1]
    if HASH_ha(cand) == ct:   →  cand 就是 __jsl_clearance_s
```

`chars` 长度 23/24 → 枚举量 529/576，毫秒级完成。

**四个必须知道的坑**：

1. **`bts[1]` 保持 URL 编码原样**，不要 `unquote`。`rLB%2FdFGil%2FWSDtvv5CSWRc%3D` 里的 `%2F` / `%3D` 是哈希输入的一部分。
2. **`ha` 每次都可能换**，不要写死 md5。同一站实测出现过 `md5` / `sha1` / `sha256`。
3. **`wt` 是延时字段**：`delay = wt > elapsed ? wt - elapsed : 500`。纯请求路线直接写 cookie，不要照抄这个 `setTimeout`。
4. **反自动化在 `go()` 之前**：解混淆后能看到一个 `_0xdcae14()` 式函数，检查 `navigator.userAgent` 是否含 `Phantom`，以及 `window.callPhantom` / `window._phantom` / `window.Headless` / `navigator.webdriver` / `navigator.__driver_evaluate` / `navigator.__webdriver_evaluate`。**命中任一条直接 `return`，不写 cookie**——表现为「算出来是对的但页面还是 521」。这是本族最常见的假失败。

**可离线求解**：两趟都是。见 `waf_clearance_solver.py jsl` / `jsl-first`（自带 4 组真实样本 oracle）。

**`__jsluid_s` 不是准入凭证**，只是会话标识；不要把它当成「已经过了」。

### 2.2 阿里 acw_sc__v2：旧版 / 新版

两代**输出同名 cookie**，但算法完全不同。判据是**内联 JS 的形态**，不是 cookie 值。

#### 旧版：`unsbox` + `hexXor`（固定常量）

形态：页面内联一段 OB 混淆 JS，里面有一个隐藏 `<textarea>` 存 `arg1`（40 位 hex，**每次访问都变**），另有 `_0x55f3(...)` 形式的字符串表查表器。

解出来的核心只有两步（`String.prototype` 上挂的两个方法）：

```js
// 固定 40 元置换表（1..40 的一个排列）
unsbox(): var T=[15,35,29,24,33,16,1,38,10,9,19,31,40,27,22,23,25,13,6,11,
                39,18,20,8,14,21,32,26,2,30,7,4,17,5,3,28,34,37,12,36];
          out[T[k]-1] = arg1[k]        // 按表把第 k 个字符搬到 T[k]-1 位

// 固定 40 位 hex（20 字节）的 key 串（按 2 位一组 XOR；单字节结果左侧补 '0' 到两位）
hexXor(key="3000176000856006061501533003690027800375"):
          out += (parseInt(a[2k:2k+2],16) ^ parseInt(b[2k:2k+2],16)).toString(16).padStart(2,'0')

acw_sc__v2 = unsbox(arg1).hexXor(KEY)
```

`unsbox` 是**双射**（置换表是 1..40 的排列），因此输入输出等长且可逆。

#### 新版：LCG 伪随机 + 洗牌

形态判据（与旧版的三处硬区别）：

1. 内联 JS 里有 **`Math.random` 被替换**：用自定义**线性同余生成器（LCG）**，种子写死 → 序列可预测。
2. `Array.prototype.fill` 被**魔改**（按自定义规则打乱重组）。
3. 有一段 **Fisher–Yates 式十六进制字符洗牌**：接受 hex 串，按预定义顺序把每个 hex 字符映射到另一个 hex 字符。
4. 出现 **`ox` 形式 XOR 加密的字符串常量表**，且带固定下标偏移（原文样本记为 `m(466) === ox[0]`；偏移量随版本变，别照抄 466）。
5. 末尾还会拼一些字符串再转小写。

新版**没有 `unsbox` 表**，因此「搜 `unsbox` 关键词」在新版上必然零命中。

#### 新版的两个「不按套路就必错」的点

**(a) `Function.prototype.toString()` 的内容参与计算 ⇒ 绝不能格式化源码**

主函数（实测名 `PxjRjE`）内部会取**自己函数体的源码字符串**做索引：

```js
// 浏览器里 PxjRjE.toString() 是压缩成一行的；本地格式化后索引全部错位
oO = <PxjRjE 源码>.indexOf('fc1e53')          // 某个固定子串的偏移
Y || (R = T + (-1 === b.toString()['indexOf']('debugger')
             || new RegExp('\\{[\\s\\S]*[/\\*]{2}[\\s\\S]*\\}', 'gm')['test'](b.toString())))
```

后果与处置：

- **本地格式化源码 → 索引错位 → 卡死在某个 `while` 里（不是报错，是死循环）。** 必须用浏览器里那份压缩一行的原文，
  或把源码偏移从 Console 取出来写死。原文两处独立观察：`oO` = 主函数源码里 `'fc1e53'` 的 `indexOf` 位置；
  另一个从源码里取出的量在浏览器里**恒为 594**。
- **`debugger` 字符串绝对不能删**（最容易做错的一步）：

  ```js
  R = T + (-1 === b.toString()['indexOf']('debugger')
           || new RegExp('\\{[\\s\\S]*[/\\*]{2}[\\s\\S]*\\}', 'gm')['test'](b.toString()))
  ```

  - 浏览器里含 `debugger` ⇒ `indexOf` ≥ 0 ⇒ `-1 === …` 为 **false** ⇒ 由后面那段正则决定 `R`。
  - **删掉字符串**（`replace('debugger;','')`）后 `indexOf` 返回 **-1** ⇒ 判断变 **true** ⇒ `R` 走另一分支
    ⇒ **流程能跑完但算出的 cookie 过不了校验**。
  - **正确处置**：① 首选**不改字符串**，用 DevTools 的「永不在此暂停」绕过无限 debugger；
    ② 若要改，必须**同时保持判断结果不变**——把 `indexOf` 的**实参也换成空串**（`indexOf('')` 恒返回 0）。
- 第二段正则 `\{\[\s\S]*[/\*]{2}[\s\S]*\}` 检测的是**函数体里有没有注释符号**（`[/\*]{2}` = 「连续两个字符都取自 `/` 或 `*`」，`//`、`/*`、`*/`、`**` 都会命中），即「有没有被格式化过」。
  **这就是「格式化 JS 后提交必失败」的机制**（不是玄学，是一条可复算的正则）。

**(b) 末尾随机数的奇偶性由 `T` 表决定，`T` 表读 `navigator`**

```js
T = [t(void 0, b['navigator']), t(void 0, b['navigator']) && b['navigator'][...],
     t(b, b[...]), !(...), !(...)]
// 注释口径：T 表决定最后生成 cookie 末尾随机数的奇偶性，true=奇数 / false=偶数
// T 表通过读取 navigator（含 webdriver 类判据）生成 → 直接拿浏览器的 T 表写死
```

**处置**：不要在本地重算 `T`，直接在浏览器里把 `T` 表取出来内联成常量。

#### 新版 `arg1` 的两种形态

- 旧版：`arg1` 是固定长度的 hex 串（40 位）。
- 新版：`arg1` 仍可正则从响应体提取，但**内容与长度都变**；脚本里表现为「第一次 POST 响应里有 `arg1`，第二次 POST 才有 cookie」。**必须先发一次拿到 `arg1`，再算。**

#### 字符串表（`_0x55f3`）的还原

`_0x55f3(idx, key)` 是一个 **RC4 字符串表查表器**，结构固定：

```
1. 表 = 一个大 base64 数组（本批实测样本 56 项）
2. 启动时做数组旋转：while(--n) push(shift())，n 由调用点决定
3. _0x55f3(i, key) = RC4( decodeURIComponent( escape( atob(表[i]) ) ), key )
```

**旋转次数的准确口径**（B7 曾在这里踩过坑，本批用 oracle 钉死）：

- 源码形态 A：`}(表, 347)`，函数体 `while(--n) { push(shift()) }` —— **本批样本就是这一形态**
- 源码形态 B：`}(表, 0xee)` + 函数体 `while(--n)`，但**调用点**写 `_f(++arg)` —— 跨族通用口径，出处见 `../../ast-deobfuscation/references/string-array-and-minimal-eval.md`（**本批 17 篇里没有这一形态**）

两种形态的**有效旋转次数都恰好等于那个字面量**（形态 B 里调用点的 `++` 与函数体的 `--` 相互抵消）。

⚠️ **但「字面量」≠「表要左移几位」**：`while(--n)` 是**绕环**跑的，表长 `N` 时左移 `L` 次 ≡ 左移 `L mod N` 位。
本批样本表长 **56**、字面量 **347** ⇒ 实际左移 **347 mod 56 = 11** 位。**标定要枚举 `0..N-1`，不是 `0..347`**。

本批用 13 组「索引 + key → 明文」的浏览器 Console 输出做 oracle：
按字面量做 **347 次 `push(shift())`**（≡ 左移 11 位）⇒ **13/13 命中**；左移 10 位 / 12 位（字面量 346 / 348）⇒ **0/13**。

**还原套路**：不要读 RC4 代码。用**已知索引反查**：
从文章/浏览器 Console 里拿到若干组 `_0x55f3('0x3','jS1Y') === '3000176000856006061501533003690027800375'` 这样的对照，
先用它们**标定「实际左移位数」**（枚举 `0..表长-1`，命中必须唯一），再拿 `_0x55f3` 反查剩余索引 —— **每条表项的 key 不同，反查时 key 不能省**。见 `waf_clearance_solver.py acw-table --literal <字面量>`（工具会核对「字面量 mod 表长 == 枚举到的位数」）。

**可离线求解**：旧版完全可离线；新版需一次浏览器取值（`oO` / `z` / `T` 表 / 未格式化源码），取到后完全可离线。

### 2.3 Cloudflare：5s 盾 / Turnstile / Drop

三者共用同一套引擎（字符串表 + 控制流平坦化 + 自定义字节码 VM + BigInt 模幂 PoW + 遥测），
区别只在**入口形态**与**是否需要交互**。

#### 5s 盾（managed challenge）五步链

| 步 | 动作 | 关键产出 |
|---|---|---|
| 1 | 初始化页面 | `_cf_chl_opt`：`cRay`、`cHash`、`md`、`rayId`、`chlHeaderVal`、`widgetId`、`sitekey`、`apiPath` |
| 2 | 用 `cRay` 拼 JS 地址请求 JS，JS 发 **POST `/h/g/fo/<A>:<B>:<C>/<cRay>/<cf-chl>`**（本仓 `cloudflare/xai-cloudflare/` 案例实测；段名 `fo` / `i`(图片) / `ci`(canvas) 随版本与站点变，**以现场抓包的路径为准**） | 提交遥测（**加密体**），响应是**加密的** JS / 字节码 |
| 3 | 请求 `normal` HTML，再发第二次 POST（`chReq:"chl_api_m"` + `chlApi*` 字段） | 返回长字符串（十几万 ~ 二十几万字符） |
| 4 | **环境校验** | 校验点十几个 ~ 二十几个，**只有第一个固定，其余顺序随机** |
| 5 | 通过后取 `sh/aw` 三参数 → 向初始化页 POST 四参数 | `cf_clearance` + 正常页面 |

#### 响应体解密：rayId 派生 XOR（**可离线，且已有逐字节 oracle**）

```js
function decodeResponse(encoded, rayId) {
  let key = 32;
  const seg = rayId + "_0";
  for (let i = 0; i < seg.length; i++) key ^= seg.charCodeAt(i);   // 逐字符累积 XOR
  const bin = atob(encoded);
  let out = "";
  for (let i = 0; i < bin.length; i++)
    out += String.fromCharCode(((bin.charCodeAt(i) & 255) - key - (i % 65535) + 65535) % 255);
  return out;
}
```

- **key 由 `_cf_chl_opt.rayId` 派生**（16 位 hex，**不是** `challengeRayId`）。
- 本仓 `cloudflare/xai-cloudflare/artifacts/` 有两个真实 `fo` 响应体 + 对应 `.plain`：
  `fo_stage2`（4448 → 3336）与 `fo_stage1`（127228 → 95420）**逐字节命中**。
- **判别「rayId 对不对」的机械指标**：解出串的 **base64 字母表占比**。真实 rayId = **1.000**；
  末位差 1 = 0.835 / 0.788；全 0 = 0.346；别的会话 ray = 0.472。
  **这个指标就是本族的自检**：占比 < 1.0 说明 rayId 取错了，不要往下走。

#### 解密后的两个分支（三处来源一致）

```js
const nextActionCode = decodeResponse(xhr.responseText, rayId);
if (nextActionCode.startsWith("window._")) {
  new Function(nextActionCode)(payloadData, executeChallengeAndSubmit);   // 明文脚本分支
} else {
  new CloudflareVM(nextActionCode);   // 字节码分支：VM 内部再做 base64ToUint8Array
}
```

**本批两个真实样本都命中字节码分支**，且解密结果**是 base64 字符串**（不是明文 JS）——
所以完整链路是 `响应体(base64) → rayId-XOR → base64 字符串 → base64 解码 → 字节码`。
判据用 `startsWith('window._')`，不要用「像不像 base64」。

#### 字符串表按「恒等式自校验」旋转（**可离线**）

挑战脚本开头有一段自执行函数，作用是把字符串表旋转到满足一个数论恒等式：

```js
for (xL = i, be = x(); ;) {
  try {
    if (bl = parseInt(xL(539))/1 + -parseInt(xL(2236))/2 + -parseInt(xL(1037))/3*(parseInt(xL(2421))/4)
           + -parseInt(xL(1247))/5*(parseInt(xL(2279))/6) + -parseInt(xL(1176))/7
           + -parseInt(xL(1797))/8*(-parseInt(xL(1532))/9) + parseInt(xL(2302))/10,
        F === bl) break;              // F 是写死的 magic 值
    else be.push(be.shift());
  } catch (by) { be.push(be.shift()); }
}(V, 608776)
```

- 取表器是 `i(n) = table[n - 基址]`（本批基址 **458**，表 **2050** 项）。
- 旋转量靠**枚举**（2050 次以内），命中 magic 值即停：本批 **434**（`new_chl_script_2.js`）。
- 另一个 widget 的脚本：基址 **239**、magic **520249** ⇒ **旋转量、基址、magic 每个版本都不同，必须现场算，不能硬编码。**
- **验证**：旋转 434 后 `table[1487-458] === 'document'`、`table[618-458] === 'BCkZA9'`，与仓内 `new_strtable_decoded.txt` 逐行一致。

工具：`waf_clearance_solver.py cf-strtable --table <表文件> --expr <恒等式> --target <magic>`。

#### PoW 与遥测

- **BigInt 模幂**：`crypto.getRandomValues(new Uint8Array(128))`（`seed[0]=0`）→ 大整数 `% MODULUS` → `powmod(base, 65537, MODULUS)`。
  模数是写死的 **1024 bit** 常量（`0x00e9d3dc...2ebfb`，258 位 hex、首字节是 `0x00` 填充），两个脚本共用同一常量 ⇒ **可跨版本复用**。
- **遥测**：鼠标轨迹（`mousePathSample`，≥10ms 采样、上限 250 点）、点击（含到 widget 中心的距离、`tapDuration`）、
  `mouseEvents` / `touchEvents` / `inputType`(1 鼠标 / 2 触摸 / 3 混合)、`PerformanceObserver` 的 `resource`+`navigation` 计时。
  最终用 **LZW 变种**压缩后提交。
- **`/h/g/i/<cRay>/<ch>` 图片请求不发 → 100% 失败**；`/h/g/ci/...`（canvas）同理。
- 挑战 **120s 有效期**；长时间停在断点必然超时。

#### Turnstile 的交互（closed shadow root）

- widget 挂在主文档的 **closed shadow root**，`document.querySelectorAll` 查不到内部节点。
- 定位方式：先找隐藏 `input#cf-chl-widget-<id>_response` → `getRootNode().host` 反查宿主 DIV → 取矩形。
- 普通 `.click()` 无效。有效路径是在**复选框中心**（`x+28, y+h/2`）构造完整 `MouseEvent` 序列
  `mouseover → mousemove → mousedown → mouseup → click`（带 `bubbles/cancelable/view/clientX/clientY`）。
- **CDP 路线**：浏览器原生 `MouseEvent` 的 `screenX/screenY` 在 CDP 驱动下会与 `clientX/clientY` 不自洽，
  需要 `CDP-bug-MouseEvent-.screenX-.screenY-patcher` 一类补丁；否则「点了但过不去」，且**死循环重试会被封 IP**。
- iframe 消息是可靠的进度信号：`init` → `requestExtraParams` → `food`(心跳 seq) → `interactiveBegin` → `interactiveEnd` → `complete`。
- token 形态 `1.<base64url 载荷>.<22 字符站点标识>.<64 位 hex 校验>`，实测长度 837；**一次性**，与 widget/ray 绑定，重放无效。
- **服务端二次校验**（B21 补，来源：`docs/references/csdn-159429874`）：
  `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`，body `secret`(站点私钥) + `response`(token)
  → `{"success": bool}`。**排错意义**：`success=false` 说明 token 本身无效或已用过，此时**不必再查浏览器环境**；
  反之 `success=true` 而业务接口仍 403，才回头查 §3.5 的 cookie/IP/TLS 绑定。
- **token TTL ≈ 300 秒且一次性**（同上来源）⇒ **不能预取批量**，只能「取即用」；
  与 §2.3 的挑战 120s 有效期是两套时钟，别混用（widget 挑战 120s、token 300s）。

#### Drop：时间锁 PoW（**纯算，可完全离线**）

- 挑战响应给出 `challengeToken`(JWT) + `seed`(base64url) + `k` + `g` + `s`。
- 求解：`state = SHA256(base64url_decode(seed))`；外层 `k` 次、内层 `g` 次**串行** `state = SHA256(state)`，
  每个检查点存一份 → `base64(concat(checkpoints))`。
- 实测参数 `k=1000`、`g=2000` ⇒ `(k+1)×g = 2,002,000` 次 SHA-256（约 2s）；**`s=16` 当前未参与计算**。
- 设计要点：**检查点链可分段验证**（服务端每收一段验一段，不必重算整链）；SHA-256 链天然串行，GPU/多线程无法加速。
- 提交后拿到临时账户 `apiToken(cfat_*)` + `claimToken`；`cfwau_*` Assets JWT 是 Ed25519 签名，**只发给浏览器来源**，
  纯 API 请求会拿到 HS256(aud:"ewc") 的受限 token → 上传端点 401。绕法：把文件内联进 Worker 脚本走 Workers API（1MB 上限）。

**可离线求解**：响应体解密、字符串表旋转、BigInt 模幂 PoW、Drop 时间锁 PoW、遥测格式。
**必须真浏览器**：环境校验（顺序随机 + 十几个到二十几个检测点）、`isTrusted` 事件、图片/canvas 请求。

### 2.4 Akamai Bot Manager（`_abck` / `bm_sz`）

**有效性判据**：`_abck` 里的 `~-1~` 变成 `~0~` 才算有效。**「能登录」≠「过了」**；`*_bm=Unknown Bot` 表示已被标记。

**准入链路**：首次页面加载后，由**三次触发**产生三次 `sensor_data` 提交：

| 触发 | 机制 |
|---|---|
| 1 | 首屏自执行函数 |
| 2 | `setTimeout(..., 500)` |
| 3 | `setTimeout(..., 1000)` |

- 简单档站点**第 1 次返回的 cookie 就有效**；难档可能要第 3 次，甚至要等特定事件触发后才有有效值。
- `sensor_data` 由 `XMLHttpRequest.prototype.send` 处可截获。
- 通过检测的响应会**注入额外脚本**（如 `/akam/13/...`）——「有没有注入」也是一个判据。

**环境数组（本族最有价值的可复用结构）**：提交体主体是一个「负数 tag 与值交替」的数组。
原文只注释了其中几个元素，**没有明说 tag 在值的之前还是之后**，所以下面按**数组下标**列（下标与注释的对应关系是唯一能直接回源的部分）：

| 数组下标 | 元素 | 原文注释 / 判断 |
|---|---|---|
| 0 | `-100` | 原文注释「固定值」 |
| 1 | `Mozilla/5.0 …,uaend,12147,20030107,zh-TW,Gecko,5,0,0,0,…,cpen:0,i1:0,…,x12:1,…,loc:` | 原文注释「检测了 ua、window 的一些属性、自动化工具、Screen 等」（**最长、最需要逐字段对齐**） |
| 2 | `-105` | — |
| 3 | `0,0,0,0,-1,888,0;0,-1,0,0,-1,-1,0;` | 原文注释「检测页面 input 标签的一些属性」（原文「技巧」一节也是拿**下标 3** 举例） |
| 4 | `-108` | — |
| 5 | `""` | — |
| 6 / 7 | `-101` / `do_en,dm_en,t_en` | — |
| 8–21 | `-110` `""` `-117` `""` `-109` `""` `-102` `<与下标 3 同值>` `-111` `""` `-114` `""` `-103` `""` | 这一段多为空串占位；下标 15 与下标 3 **同值**（input 属性的另一组） |
| 22 / 23 | `-106` / `0,0` | — |
| 24 | `-115` | — |
| 25 | `1,32,32,…,<含 `_abck` 的 cookie 快照>,…` | 原文注释「这里取了 cookie，因此在第 1 次请求前，要先对页面进行 1 次请求，从而获取页面返回的 cookie」 |
| 26 / 27 | `-112` / 页面 URL | — |
| 28 / 29 | `-119` / `-1` | — |
| 30 | `-122` | — |
| 31 | `0,0,0,0,1,0,0` | 原文注释「检测了一堆东西，如 XPathResult」 |
| 32–37 | `-123` `""` `-124` `""` `-126` `""` | 空串占位 |
| 38 / 39 | `-127` / `8` | — |
| 40 / 41 | `-128` / `,,` | — |
| 42 / 43 | `-131` / `,,,` | — |
| 44–47 | `-132` `""` `-133` `""` | 空串占位 |
| 48 / 49 | `-70` / `-1` | — |
| 50 / 51 | `-80` / `94` | — |
| 52 / 53 | `-90` / base64 串 | — |
| 54 / 55 | `-116` / `0` | — |
| 56 / 57 | `-129` / `,,0,,,,,,,,` | — |

**两条与配对方向无关的硬结论**：

1. **含 cookie 快照的那一项里存着 `_abck` 本身**（下标 25 实测 `…~-1~YAAQlBw/…~-1~-1~-1`）
   ⇒ **第一次 POST 之前必须先 GET 一次页面把 cookie 拿到**，否则这一项填不出来。
2. **下标 1 那一项是「UA + window 属性 + 自动化工具 + Screen」的最长合并串**，需要逐字段对齐。
   其内部格式（按 `,` 切）：`<UA>,uaend,<appVersion 数字>,<appVersion 日期>,<语言>,Gecko,5,0,0,0,<随机>,0,<screen.width>,<availHeight>,<screen.height>,<availWidth>,<innerWidth>,<innerHeight>,<outerWidth>,,cpen:0,i1:0,dm:0,cwen:0,non:1,opc:0,fc:0,sc:0,wrc:1,isc:0,vib:1,bat:1,x11:0,x12:1,<随机>,<随机>,<timeOrigin>,0,0,loc:`
   （末尾 `loc:` 后面在实测样本里是空的。）

⚠️ **tag 与值的配对方向必须现场钉死**：原文没有明说，二手资料里两种读法都有。
**动手前先在 `XMLHttpRequest.prototype.send` 处 dump 一次真实数组**，把「哪个 tag 对应哪一段值」确认下来，
**不要照抄任何二手对照表**（包括本文这张——本文只保证下标与注释的对应关系可回源）。
另外：数组长度与元素个数**每个站点、每个版本都可能不同**，不要按固定下标伪造。

**定位技巧（比读代码快）**：环境数组里的某个值 → 在混淆代码里 search 该**字面量** → 落到一堆 `switch/case` → 在**每个 `return` 处下断点** → 命中即知是哪个分支 → 再进 `UJ.apply(undefined, tJ)` 看具体检测。

**最新版采集路线（按需对齐）**：

| 采集点 | 特点 | 对不上的后果 |
|---|---|---|
| UA-CH 高熵 | `navigator.userAgentData.getHighEntropyValues([brands,mobile,architecture,bitness,model,platform,platformVersion,uaFullVersion,fullVersionList])`，**异步 Promise，一次 9 项** | 改了同步 `navigator.userAgent` 却没处理这个异步接口 → 两边数据对不上，直接暴露 |
| WebGL | **同一份 UNMASKED_VENDOR/RENDERER 采三次**：主线程 canvas / `OffscreenCanvas` / **Blob+Worker 里再采一次** | 只 hook 主线程 `getParameter` 必然翻车（Worker 是干净环境） |
| WebAudio | `OfflineAudioContext(1, 44100, 44100)` + `Oscillator(triangle, 10000Hz)` + `DynamicsCompressor`，**与公开资料一字不差** | 难点不在参数，在于**伪造结果要与 GPU/UA/平台自洽** |
| plugins | **校验对象图完整性**，不是「看你装了什么」：枚举插件比对（Flash/Widevine/Native Client）、自引用一致性 `plugins[0][0].enabledPlugin === plugins[0]`、改写 `plugins.refresh` 埋探针 | 只补 `length` 和名字 → 三层互相指向缺失，一眼假 |
| webdriver | 几十位的**自动化特征掩码**（`__nightmare`、`cdc_*`、`__playwright__binding__`、`__selenium_*` 一位一个）+ **原型链完整性校验**（`Navigator.prototype` 上的描述符、`[native code]`、getter 的 `hasOwnProperty` 分布） | `Object.defineProperty(navigator,'webdriver',...)` 挂在**实例**上，与原生「定义在 `Navigator.prototype` 且 getter 是 native」形态不同 → 描述符检查一眼看出 |
| 品牌特征位 | 存在即打标，每项一个 bit：`window.InstallTrigger`(Firefox)、`window.chrome`/`chrome.webstore`(Chrome)、`window.opera`、`window.ActiveXObject`(IE)、`window.callPhantom`、`window.mozInnerScreenY`、`navigator.getBattery`、`navigator.vibrate` | bit 与 UA 声明的品牌不一致 |
| `RTCPeerConnection` | **存在即打标**：只做 `typeof RTCPeerConnection`，**不调用、不建连**（与指纹商拿 ICE 泄露真实 IP 的用法完全不同） | — |
| 第 2 次请求的 font 检测 | 不同 `fontSize` × `fontFamily` 的 `offsetHeight`/`offsetWidth` 字典 | — |
| 第 2 次请求的 iframe 检测 | `Object.keys(iframe.contentWindow)` → `JSON.stringify` → 加密 + 数组长度 | — |
| 第 3 次请求的 CSS 检测 | 约 40 项 CSS 属性取值 | — |

**两条与主流认知相反的反向结论**（不要照抄通用指纹清单）：

- **字体指纹权重很低**：这一版没有出现典型的 `offsetWidth` 枚举式字体检测。
- **Canvas 2D 不是主力**：`toDataURL` 式经典 canvas 指纹权重低，算力都花在 WebGL 和 Audio 上。

原因：字体与 canvas 2D 受渲染栈影响大（同机装个软件就漂移），**风控要一致性，不要区分度**。

**TLS 侧**：`curl_cffi` 的 `impersonate` 必须与 JS 环境里的 UA / `appVersion` **一致**（实测 `chrome101` 对 `Chrome/101`），否则 TLS 指纹与 UA 自相矛盾。

**必须真浏览器**：环境数组的完整性与行为生物特征（鼠标轨迹、键盘节奏、触摸流、服务端动态挑战）。指纹只是入场券。

### 2.5 F5 Shape / Reese84

**形态**：动态路径 JS，路径**每几小时轮换**（实测只有 3 条路径在轮换）。关键字是
`y-Almost-yet-know-Now-Son-ther-That-swearers-of-` 与 `pplacked-bothe-right-eque-mine-in-him-aftend-Thi`。

**两条路线**（都可用，核心逻辑一致）：

| 路线 | 请求数 | 特点 |
|---|---|---|
| 动态链接 | 1 GET + 2 POST | GET 拿动态 JS；第 1 次 POST 载荷固定 `{"f":"gpc"}`，响应 base64 解码出字段；第 2 次 POST 载荷里的 **`p`** 是核心加密参数，响应里的 **token** 是最终目标 |
| 固定链接 | 1 GET + 1 POST | POST 载荷就是动态链接拿到的 token（多一个 `old_token`，实测为空也行），响应 token 不变。**替换 JS 更方便、少一次 POST** |

- token 落点因站而异：**cookie 里的 `reese84`** 或**请求头 `X-D-Token`**。
- 把 `reese84` token 从 localStorage 删掉后会重新走动态链接；不删则一段时间内不再请求。

**两个必踩的坑**：

1. **替换本地 JS 后要改脚本里写死的请求路径**，改成当前时段的动态路径，否则报错。
2. **`st` 时间戳校验**：`reese84interrogatorconstructor` 里 `this["st"] = Math.floor(Date.now()/1000)` 会被校验超时。
   调试卡住时先看这个：**改成当前时间**即可继续。
   另外动态链接断点断不住时，在 JS 文件**第一行加一行 `debugger;`** 是最快的入口。

**加密结构**：核心方法创建一个**隐藏 iframe**，`load` 后向数组 `re` 里 push **22 个函数**，最后遍历执行，把结果存进 `nt` 数组，`p = 加密(nt)`。

**22 个函数的采集清单**（补环境按这个逐条对齐）：

| # | 采集内容 |
|---|---|
| 1 | `document.addEventListener` 多个监听 |
| 2 | `window.OfflineAudioContext` 离线音频渲染 |
| 3 | `document.addEventListener` + `document.__selenium_evaluate` 自动化检测 |
| 4 | 随机数组生成字符串 |
| 5 | `navigator`/`screen`/window 参数 + 生成 **4 个 canvas 链接** |
| 6 / 8 / 9 / 14 | 分别拿第 5 步的某个 canvas 链接做处理（**顺序重要**） |
| 7 | `window.WebAssembly` 计算 |
| 10 | 创建 canvas 取 **WebGL** 上下文 |
| 11 | 取上一步 WebGL 的值（**大量扩展列表属性与着色器数值**）+ 生成 2 个 canvas 链接 |
| 12 | 拿第 11 步的 canvas 链接生成 hash |
| 13 / 16 | 随机数组生成字符串 |
| 15 | 最大的一坨：`WebGLRenderingContext`、`navigator` 属性、`document.createEvent` **主动报错**、`window.ontouchstart`、`createElement('video'/'audio')`、`window.chrome`、`history.length`、自动化环境、`window.PERSISTENT/TEMPORARY`、`PerformanceObserver`、canvas 2D、`documentElement/head/body.children`、document 若干函数 |
| 17 | push 一个 `true` |
| 18 | `WebAssembly` + `window.BigInt` |
| 19 | `createElement` + `navigator` 属性 + `new window.Audio()` |
| 20 | 原型链：`Function.prototype.toString/call/apply/bind` + window/navigator |
| 21 | `window.performance.now()` + `Object.getPrototypeOf()` 校验属性 |
| 22 | 生成 `p`（无校验） |

**补环境两种方式**：

1. **只补第一部分**（核心加密都在这里）：手动构造 `interrogate` 方法 + 含 `aih` 的参数。**注意它是异步函数。**
2. **一二三部分全要**：不用构造 `interrogate`，但要 hook `fetch` 请求。
   环境量略多。两种方式都要做 `toString` 保护。

实测补了约 1000 行；JS 异步执行 → Python 调 JS 后把参数写文件再读，是最省事的桥接方式。

### 2.6 其它厂商：设卡层对照

选哪家产品，本质是**在哪一层设卡**：

| 厂商 | 设卡层 | 标志 |
|---|---|---|
| Akamai | 浏览器内部 | `sensor.js`(~512KB) + `_abck`/`bm_sz`；多请求评分；探测约 60 个 `chrome-extension://` URL（**太干净的浏览器反而像自动化**） |
| Cloudflare | CDN 边缘 + 全网画像 | JA3/JA4 + HTTP 头 + IP 信誉 + 速率；Bot Score 1–99；Turnstile 单次 POST 可达 **79 个参数**（canvas hash、字体测量、SHA-256 PoW、加密时序） |
| DataDome | 单站行为模型 | 每站一个模型（约 85,000 个）；`datadome` cookie + WASM `boring_challenge` + Picasso 设备指纹；**IP 信誉占总分 25%~30%** |
| HUMAN / PerimeterX | 跨站信誉网络 | `_px3`/`_pxde`；**五向量统一评分**（TLS、IP、HTTP 头、JS 指纹、行为必须同时成立），只修一个点无效 |
| Kasada | 浏览器完整性 + PoW | `x-kpsdk-ct`/`x-kpsdk-cd` + 多态命名 `ips.js`；**用 `Function.prototype.toString()` 查原生函数是否被自动化框架改过**；封禁是静默 403/429 |
| F5 Shape | 自定义 VM + 短 token | `reese84`/`TS`/`$rsc`；载荷轮换、token 分钟级有效；目标是「让你维护不起」 |
| Fastly | CDN 边缘 | `fs_ch_st`/`fs_ch_cp`；轻量 JS PoW，风险高时才升级 |
| Anubis | 反向代理 PoW | 开源（Go），专治低成本 AI 抓取；先花 CPU 把题算完 |

**共同结论**：反爬的核心是**对抗成本**。所有厂商的组合拳都是
「低级脚本直接拦 → 数据中心代理限掉 → 不执行 JS 的卡掉 → 自动化浏览器靠指纹和时序识别 → 复杂攻击再用挑战/信誉/业务行为消耗」。

### 2.7 站点自研风控（不在上表里的那一类）

不是所有风控都来自 CDN/WAF 厂商。**大厂自研的 bot 风控**同样走「独立 signal 请求 + 服务端校验」这条路，
而且它常常是**真正的拦截点**（外层 CDN 过了也没用）。

**Amazon 登录（2026-05 美区）实测样本**：

```
GET  /ap/signin  → 重定向 /ax/claim，拿 cookies + ARB token
POST /ax/claim   → 提交 email + metadata1      → 返回密码页
POST /ap/signin  → 提交 password + metadata1   → 拿到认证 cookies
```

| 组件 | 形态 | 能否纯协议还原 |
|---|---|---|
| `metadata1` | `<identifier>:<base64(XXTEA(CRC32hex + '#' + JSON 指纹))>`，密钥 `fwcim.encryptor.keyProvider.provide()` 可取（实测 `{identifier:"ECdITeCs", material:[4×uint32]}`），XXTEA 是**标准 Corrected Block TEA**（`delta=0x9E3779B9`，轮数 `6+52/n`，**无魔改**） | **能**（密钥固定、算法标准） |
| `encryptedPwd` | AWS Encryption SDK Message Format v1：随机 AES-128 → RSA-OAEP-SHA256 包密钥 → HMAC-SHA256 KDF → AES-128-GCM 加密密码；公钥 2048-bit RSA(JWK)，`keyId` / `providerId: "si:md5"` 可从 `engine._encryptionEngine...` 挖出 | **能**（但实测**不提交它、只提交明文 `password` 也登录成功** ⇒ 不是必须） |
| **BotDetection signal** | 浏览器在 email 与 password 两步之间**自动多发一个 POST** 到 `unagi-na.amazon.com/1/events/com.amazon.BotCXPolicy.na.prod.bd`，body 里的 `additionalData` 是一个 **2.5KB 加密 blob**，由两个重度混淆脚本（各约十几 KB）生成 | **不能**（需要完整浏览器行为指纹） |

**两条可直接迁移的结论**：

1. **「加密参数全部还原」≠「能过」**。该样本里 `metadata1` 与 `encryptedPwd` 都完全还原，
   纯 HTTP 跑：Step1 通过、Step2（email）通过、**Step3（password）被重定向到 `/ap/cvf/request`（aamation challenge）**。
   真正的拦截点是那个**独立的 bot signal 请求**——**先找「浏览器多发了一个什么请求」，再谈参数还原**。
2. **「服务端 200」不等于「signal 有效」**。把 `additionalData` 填 placeholder，服务端仍返回 200，
   但密码提交照样被拦 ⇒ **判据要看最终业务动作，不要看 signal 接口的状态码**。
   （同族判据：Akamai 的 `*_bm=Unknown Bot`、Cloudflare 的 `cf_clearance` 缺失、加速乐的「cookie 对了但还 521」。）

**判层补充**：如果 Set-Cookie 里没有上表任何厂商特征，但抓包能看到「登录/提交前后浏览器多发了一个
指向厂商域名的 POST（body 是高熵 blob）」，就按本节处理——**先定位那个 signal 请求，再决定路线**。

---

## 3. 跨族共性机制（五条硬结论）

### 3.1 多趟自举是常态

本族几乎全部是「**先拿准 cookie → 算出 clearance → reload → 可能再来一趟**」：

| 族 | 趟数 | 口径 |
|---|---|---|
| 加速乐 | 2 趟 521 + 1 趟 200 | 第二趟覆盖同名 cookie |
| Cloudflare | 2 次 `fo` POST + 图片 + `pat` 轮询 | `fo` 返回分两支 |
| Akamai | 3 次触发（自执行 + 500ms + 1000ms） | 简单档第 1 次就够 |
| 阿里 acw | 1~2 次 POST | 新版先拿 `arg1` 再算 |
| Reese84 | 1 GET + 1~2 POST | 删 token 会重走动态链接 |

**通用判据**：同一份 JS 连跑两次结果不同、本地 cookie 明显短于浏览器、响应里出现「先拿种子再算」的两段结构
⇒ 按多趟处理，判据与趟数上限见 `references/multi-pass-cookie-generation.md`。

### 3.2 代码文本本身参与计算 ⇒ 格式化 / 改写 / 重编码必失败

这是本族**最容易静默失败**的一条，已有多处独立证据：

| 族 | 机制 |
|---|---|
| 阿里 acw_sc__v2 | `PxjRjE.toString().indexOf('fc1e53')` 取源码偏移；正则 `\{\[\s\S]*[/\*]{2}[\s\S]*\}` 检测「有没有被格式化」 |
| 瑞数 | `cp[]` 是**代码校验值**（参数名与 VM 代码每隔一段距离的 `charCodeAt` 之和） |
| Cloudflare | 字符串表旋转量由**写死的数论恒等式**约束（改一个字符就命中不了 magic 值） |
| 加速乐 | 第二趟 JS 每次返回不同，但**同一次内** `ct` 与 `chars` 必须成对使用 |

**处置**：所有挑战页 JS 一律按**原始字节**保存与使用（本仓约定存 `.orig`）；
不要用编辑器格式化、不要过 linter/autofix、不要转码行尾。改完要用 hash 复核。

### 3.3 常量表 / 置换表的还原优先级

1. **先找自校验条件**（恒等式 / magic 值 / 校验和）→ 枚举出旋转量或基址。
2. **再用「已知索引 → 明文」反查**标定表（从浏览器 Console 抓几组对照即可）。
3. **最后才读算法**（RC4 / XOR / 洗牌）。

**不要跳过第 1、2 步直接读 RC4**：本批 13 组 oracle 证明，旋转量差 1 位就 0/13 全错，而错的结果**仍然是一串可打印字符**，不会报错。

### 3.4 外呼不可省

- Cloudflare：`/h/g/i/<cRay>/<ch>` **图片请求不发 100% 失败**；`/h/g/ci/...`（canvas）同理。
- Akamai：环境数组里含 cookie 快照的那一项（原文样本是下标 25，其前一个元素为 `-115`）存着 `_abck` 本身 ⇒ **第一次 POST 之前必须先 GET 一次页面**。
- Reese84：GET 拿动态 JS 不能省。
- 加速乐：三趟必须共用同一 Session。

### 3.5 clearance cookie 与 IP / TLS / UA 强绑定

- Cloudflare：`cf_clearance` 与当时的 **IP / TLS 指纹 / UA** 强绑定。
- 阿里：`acw_sc__v2` 一个代理采几页就升级到 v3 滑块（**换 IP 可继续，但换了就要重算**）。
- Akamai：`curl_cffi impersonate` 必须与 JS 环境 UA 一致。
- 通用：**「破解时用什么，再次使用就必须用完全一样的 IP / TLS 指纹 / UA」**。

---

## 4. 一致性绑定矩阵

过挑战时固定下面全部维度，任何一项漂移都要重新走一趟：

| 维度 | 必须固定 | 证据位置 |
|---|---|---|
| IP | 同一出口 IP | 挑战时的实际出口 |
| TLS | JA3/JA4 与 UA 自洽 | `curl_cffi impersonate` / `references/tls-request-validation.md` |
| HTTP/2 | 帧顺序与伪头一致 | 同上 |
| UA | `navigator.userAgent` == 请求头 UA == `appVersion` 派生值 | 挑战页 JS 读的就是它 |
| UA-CH | 高熵 9 项与 UA 自洽 | Akamai 必查 |
| Client Hints | `sec-ch-ua*` 与 UA 一致 | — |
| 语言 / 时区 | `navigator.language(s)` / `Intl` 双采一致 | Akamai 双采 |
| Screen 全家桶 | `screen.*` + `window.inner*/outer*` + `devicePixelRatio` | 环境数组下标 1 的合并串 |
| Cookie jar | 同 Session，包含挑战过程中下发的**全部** cookie | `references/session-request-chain.md` |
| 时间 | 挑战有 TTL（Cloudflare 120s；Akamai/CF cookie 有寿命） | 不要长时间停在断点 |
| 代码文本 | 挑战页 JS 原始字节 | §3.2 |

---

## 5. 排错清单

按顺序排查，每条给**判据**：

| # | 现象 | 判据 / 处置 |
|---|---|---|
| 1 | 算出 cookie 但页面还是挑战页 | 先查 §2.1 坑 4 的反自动化分支（`webdriver` / `callPhantom` 命中即不写 cookie） |
| 2 | 本地跑挑战 JS 卡死（不是报错） | §2.2(a)：源码偏移错位。用**未格式化**的原文，或把 `oO`/`z` 从浏览器写死 |
| 3 | 删掉 `debugger` 后流程能过但校验失败 | §2.2(a)：`debugger` 参与 `indexOf` 判断。改成空串，别整段删 |
| 4 | 云盾解出的串「像 base64」但不是代码 | §2.3：解密结果**本来就是 base64**，还要再解一层才是字节码 |
| 5 | 云盾解出乱码 | rayId 取错。用 **base64 字母表占比 == 1.000** 做机械判据（§2.3） |
| 6 | 字符串表旋转找不到 | §3.3：不要猜，**枚举**直到恒等式命中 magic 值；旋转量/基址/magic 每版本都不同 |
| 7 | 挑战请求都发了但还是失败 | §3.4：少发一个外呼（图片 / canvas / 预置 GET）100% 失败 |
| 8 | 昨天能过今天不能 | §3.5：IP/TLS/UA 漂了；或 cookie 过期（看 TTL） |
| 9 | 把 JS 格式化/美化后失败 | §3.2：文本参与计算 |
| 10 | `_abck` 一直是 `~-1~` | 未通过。看 `*_bm` 是否 `Unknown Bot`；补齐 3 次触发；对齐环境数组（下标 1 的 UA/Screen 合并串、下标 25 的 cookie 快照） |
| 11 | Turnstile 点了没反应 / 一直重试 | closed shadow root + CDP `screenX/screenY` 不自洽（§2.3）；**不要死循环重试**，会被封 IP |
| 12 | 补环境跑通了但提交还是失败 | 分清「参数生成成功」与「准入通过」；本族多数厂商还要行为/时序 |
| 13 | 同一个站过了 WAF 还是 403 | 可能**叠了两家**（边缘 WAF + 站点自研风控 SDK），分别识别 |
| 14 | 本地值与浏览器值差一点点 | 按 `references/fixture-validation.md` 做逐字段 diff，不要只看「能不能跑」 |

---

## 6. 与相邻技能的边界

| 场景 | 归属 |
|---|---|
| 首访非正常页面 + 需要 clearance cookie 才能进站（本文件 §1 表） | **本文件** |
| 有图 / 有交互 / 需要人工成功样本基线的验证码 | `../../web-verify-patcher/SKILL.md` |
| 要把挑战页 JS 搬进 Node 里跑（env / runner / Trace / native-like） | 本技能 `SKILL.md` + `references/env-debug-loop.md` + `references/ruishu-*` |
| 挑战页 JS 的混淆家族识别与 AST 还原 | `../../ast-deobfuscation/SKILL.md` |
| 纯算求解与响应解密（jsl / acw_sc__v2 / CF 响应体 / CF 字符串表） | `../../web-reverse-algorithm/references/10-waf-clearance-cookie.md` |
| 业务参数签名（与准入无关） | `../../web-reverse-algorithm/SKILL.md` |

**判定口诀**：**「要不要先拿到一个 cookie 才能进站」** —— 要，就是本文件；不要，就不是。
