# 非极验滑块厂商协议形态对照（唯一权威源）

> **范围**：除极验（→ `geetest-protocol-matrix.md`）与腾讯防水墙 `cap_union_*` 旧形态
> （→ `tencent-tcaptcha-protocol.md`）之外，本族剩下的**滑块 / 拼图类厂商与站点自研方案**。
> **本文件是「厂商判据 + 链路形态 + 参数配方 + 该家专属坑」的唯一权威源**：
> 图像几何看 `tile-scramble-and-coordinate-mapping.md` 与 `captcha-model-training.md`，
> 轨迹编码格式看 `motion-and-coordinate.md`，本文件不复述这两处。
> 判据器：`python scripts/slider_vendor_identify.py --fingerprint <file|-> --markdown`。
> **下文所有 `python scripts/...` 命令都以本技能根目录为 cwd**（即 `<skills>/web-verify-patcher/`）；
> 从仓库根目录运行请自行补成 `python .claude/skills/web-verify-patcher/scripts/...`。
>
> 指纹（`--fingerprint` 的输入）就是一个 JSON，字段都可选、缺省即"没这条证据"：
> ```json
> {"urls":["https://turing.captcha.qcloud.com/cap_union_prehandle"],
>  "params":["collect","tlg","eks"],"cookies":["sl-session"],"js":"tdc.js",
>  "body":"pn=com.web.tianyu","headers":{"host":"..."},
>  "image":{"slices":32,"layout":"vertical"},"blob":"任意原始文本"}
> ```
> 非 JSON 输入按纯文本处理（整段进 `blob`）。
>
> **证据强度标注**：`★双源` = 两篇互不引用的文章对同一对象逐值/逐字段一致；
> `单源` = 只有一篇文章，可作线索不可当定律；`待复核` = 来源自述为猜测或表述含糊。
> 本批（B19）21 篇来源见 §7，其中 **4 家（腾讯云 turing / 360 天御 / 云片 / 安居客）拿到双源互证**；
> **互证覆盖的是「链路与公式」，字段级证据强度见各节标注**（有双源家的个别字段仍可能是单源）。

## 1、怎么用这份文件（30 秒分流）

1. 有抓包特征（接口名 / 参数名 / Cookie 名 / 图片形态 / 域名）→ 直接跑判据器，拿到厂商 + 该节锚点。
2. 判据器返回 `unknown` → 读 §5 证据补齐表，按「接口 / 图片 / 轨迹 / 换票」四件事拆，**不要先猜厂商**。
3. 判出厂商 → **只读该家小节**。每家小节固定四段：链路 → 参数配方 → 图片几何 → 该家专属坑。
4. 判出**站点自研**（`site-*`）→ 读 §4 跨厂商共性，按「两种加密之一 + 三种图片几何之一」套，不要硬套别家字段名。

### 判据器覆盖的 17 族 + 2 条路由

- **17 族**（本文件 §3 逐家展开）：

`tencent-turing`（腾讯云验证码）· `360-tianyu`（360 天御 / 360CaptchaSDK）· `shumei`（数美）·
`yunpian`（云片）· `luosimao`（螺丝帽）· `anjuke`（安居客）· `fang`（房天下）· `51com`（51.com）·
`lofter`（乐某自研）· `dangdang`（当当）· `ths`（同花顺）· `eastmoney`（东方财富）·
`verify5`（WebSocket 承载）· `safeline`（雷池 WAF）· `ali-227`（阿里 AWSC 无痕）· `kuaishou`（快手）· `acla-jigsaw`（异型拼接）。

- **2 条路由**（命中即转别的文件，不在本文件展开）：`geetest`（→ `geetest-protocol-matrix.md`）、
  `tencent-tcaptcha-old`（提交里带 `vData` 的腾讯防水墙旧形态 → `tencent-tcaptcha-protocol.md`）。
  **互斥方向**：`tencent-turing` 对 `vData` 有**排他 veto**（命中即取消）；反向不设 veto ——
  旧形态靠 `vData` 这条 3 分强信号入选，**没有 `vData` 时它自然不入选**，
  再加一个反向 veto 反而会在"两代参数同时出现"的异常样本上把双方都清零（只能返回 `unknown`）。

## 2、厂商速查矩阵（按"一票命中"信号排序）

| # | 厂商 / 标签 | 一票命中信号（命中即锁定） | 链路 | 参数加密 | 图片形态 | 详节 |
|---|-------------|---------------------------|------|---------|---------|------|
| 1 | 腾讯云验证码 `tencent-turing` | `cap_union_prehandle` / `collect` / `tdc.js` / `pow_answer`（**旧形态有 `vData` ⇒ 不是本文形态**） | prehandle → tdc.js → collect → PoW → verify | jsvmp 内构 `collect`+`eks`；PoW 是散列原像 | 镂空缺口（+ sprite 含拖动条需裁） | §3.1 ★双源 |
| 2 | 360 天御 `360-tianyu` | `pn=com.web.tianyu` / `sdkName=360CaptchaSDK`（后者**单源**） | 前置 `auto` → 校验 `check` | MD5 拼串签名 + RSA-long + MD5 后缀 | 背景 **32 条**竖向乱序 | §3.2 ★双源 |
| 3 | 数美 `shumei` | `captchaUuid` + `organization`（**参数名不可当判据**：见 §3.3） | 取图 → 校验 | DES-ECB/ZeroPadding + base64 | 镂空缺口（源 600×300） | §3.3 ★四源 |
| 4 | 云片 `yunpian` | `yp_riddler_id` / `captcha.yunpian.com` | `get` → `verify`（JSONP） | AES-CBC(key/iv 随机) + RSA(key+iv) | 镂空缺口（bg + front 两张） | §3.4 ★双源 |
| 5 | 螺丝帽 `luosimao` | `data-site-key` / `captcha.luosimao.com` | widget → request → frame → user_verify → submit | AES（函数名假称 SHA3） | **30 片**（上下两半各 15，20×80） | §3.5 单源 |
| 6 | 安居客 `anjuke` | `captchaNew.html` / `sessionId` + `responseId` | 首页 → getInfoTp → checkInfoTp | AES-CBC，key=iv=sessionId 奇位字符 | 镂空缺口（源 480×270） | §3.6 ★双源 |
| 7 | 房天下 `fang` | `getslidecodeinit.api` / `c=index&a=codeDrag` | init → jigsaw → codeDrag → 短信 | 6bit 自定义位压缩（指纹 / 轨迹各一路） | 镂空缺口（源 320×160） | §3.7 单源 |
| 8 | 51.com `51com` | `authcode.51.com` + `gt_cut_fullbg_slice` | slidecode(JSONP) → yz2 | `token = md5(challenge+times+point)` | **13×25 片 → 260×100** | §3.8 单源 |
| 9 | 乐某（LOFTER）`lofter` | `type=jigsaw` + `data:image/png;base64,` | 登录(sha256 密码) → 取图 → 校验 | AES-CBC(随机 key/iv) + 头 `x-encseckey`=RSA(key-iv) | 镂空缺口（内联 base64） | §3.9 单源 |
| 10 | 当当 `dangdang` | `getSlidingVerifyCode` / `permanent_id` | getRankey → 取图 → check → accountLogin | AES(key=rankey) + `point_json` AES(encryptKey) | 镂空缺口 | §3.10 单源 |
| 11 | 同花顺 `ths` | `upass.10jqka.com.cn` / `crnd` / `passwdsalt` | getGS → dologin → getPreHandle → 校验 → 登录 | RSA + HMAC-SHA256/XOR 三段链 | 镂空缺口（`inity` 换算） | §3.11 单源 |
| 12 | 东方财富 `eastmoney` | `qgqp_b_id` / `ctxid` | 取图 → 校验 | **XXTEA** + base64（不是 AES/DES） | **26×2 = 52 片** | §3.12 单源 |
| 13 | v5（verify5）`verify5` | ws 连接 + 6 发 3 收 / 分片头 | 3 轮 WS 消息 | AES-CTR(NoPadding)，key=token 奇偶拆 | 图片由服务端下发 URL（**形态来源未给**） | §3.13 单源 |
| 14 | 雷池 WAF `safeline` | `challenge.js` / `calc.js` / `sl-challenge-jwt` | 首页 → challenge → issue → calc(wasm) → verify | wasm 计算 + jwt 换票 | **无图**（环境+计算挑战） | §3.14 单源 |
| 15 | 阿里 227 `ali-227` | `nocaptcha/analyze.jsonp` / `__fy.getFYToken` | 环境脚本 ×4 → 取 `n` → analyze | 环境数组 `s[]` + `n` 一次成串 | 镂空缺口 | §3.15 单源 |
| 16 | 快手 `kuaishou` | `/rest/zt/captcha/sliding/config` / `verifyParam` | config → 校验 | 轨迹 + 环境；**轨迹点被变异** | 镂空缺口 | §3.16 单源 |
| 17 | 异型拼接 `acla-jigsaw` | 同一站并存「标准滑块 + 拼接错位滑块」 | 同普通滑块 | 同普通滑块 | **拼接错位**（无镂空） | §3.17 单源 |

## 3、逐家形态

### 3.1 腾讯云验证码（turing / qcloud）★双源

**来源**：`52pojie-2126956`（opencv + quickjs 路线，附开源实现）、`52pojie-2052187`（Proxy 补环境路线）。

- **域名**：`turing.captcha.qcloud.com`、`turing.captcha.gtimg.com`（iframe 模板 `drag_ele.html`）。
- **链路**：`cap_union_prehandle` → 下载 `tdc.js` → CV 识别缺口 → 生成 `collect` → 本地 PoW → `cap_union_new_verify` → 拿 `ticket` + `randstr`。
- **双源互证的边界（重要）**：两篇一致的是**链路与域名**（`cap_union_prehandle` → `tdc.js` → `collect` → PoW →
  `cap_union_new_verify` → `ticket`+`randstr`）。下列 `prehandle` 字段与提交参数**只有 `52pojie-2052187` 给出（单源）**。
- **prehandle 返回**：`sess`；`data.comm_captcha_cfg.pow_cfg{md5, prefix}`；`data.comm_captcha_cfg.tdc_path`（每次刷新）；
  `data.dyn_show_info.bg_elem_cfg.img_url`；`data.dyn_show_info.sprite_url`（**含拖动条，必须裁剪**）。
- **提交参数**：`collect`（`tdc.js` 内产出，含轨迹 + 环境校验）、`tlg`（**= `collect.length`**）、`eks`、`sess`、`ans`、`pow_answer`、`pow_calc_time`。
  - `ans` 格式（**单源，2052187**）：`[{"elem_id":1,"type":"DynAnswerType_POS","data":"<x>,<y>"}]`。
- **PoW**：`pow_answer` = 暴力枚举 `u` 使 `md5(prefix + u) == pow_cfg.md5`；`pow_calc_time` = 实际耗时毫秒。
- **补环境（2052187）**：`window.TDC.getData(!0)` 实现于 `tdc.js`，是 **jsvmp**。要点四条：
  1. 全对象 Proxy 吐环境（`get/set/has/getPrototypeOf/ownKeys/getOwnPropertyDescriptor`），日志与浏览器逐项对拍，"浏览器有才补"。
  2. `window.toString` 必须返回 `[object Window]`；并用 `safeFunction` 把 `Function.prototype.toString` 还原成 `[native code]`（否则 `toString.toString()` 露馅）。
  3. 原型链要真补：`class HTMLDocument extends EventTarget`、`Navigator`、`Screen`、`Location`，并各自 `safeFunction` 保 native。
  4. 参考量级：来源补了约 500 行环境代码才出值。
- **该家专属坑**
  - ❌ **`pow_answer` 随机填也能被接口"接受"，但提交时必失败**（来源实测）。必须真算。
  - `sprite_url` 不裁就做模板匹配，缺口定位会整体偏（拖动条参与了匹配）。
- **两条路线的取舍（要对用户讲清）**
  - `2052187`：扣 `tdc.js` 全量补环境 → **可离线、可并发**，但版本升级要重新补。
  - `2126956`：用 quickjs 轻量补环境 + node 沙箱注入轨迹生成 `collect` → 部署友善，来源自述"下次版本升级又要重新搞"。

### 3.2 360 天御 / 360CaptchaSDK ★双源

**来源**：`52pojie-2054148`（360 滑块）、`52pojie-2042898`（某天御滑块）。**两篇目标是同一产品**（`tianyu.360.cn`），
且签名公式、32 条切图函数、`report` 两段拼接**逐字一致** ⇒ 下列常量可写死。

- **一票判据**：请求体里 `pn=com.web.tianyu`（**双源**）、`sdkName=360CaptchaSDK`（**单源，仅 `52pojie-2054148`**；
  `52pojie-2042898` 该字段被脱敏）、`appId=dc1db94ea7b3843c`。
  ❌ 不要因为它长得像腾讯系就套 `tencent-tcaptcha-protocol.md`。
- **双源互证的边界（重要）**：两篇一致的是**公式与结构**（`sign` 拼接规则、`nonce`/`timestamp` 算法、
  32 条切图函数、`report` 两段拼接、`encryptLong` 分段）；**字段取值只在一篇给出的（如 `sdkName`）按单源对待**。
- **链路**：前置接口（来源称 `auto`）→ 校验接口（来源称 `check`）。两次请求，前置返回 `captchaId`、`token`、背景图、滑块图。
- **前置参数（16 个，双源一致）**：
  `appId, dc, ec, hc, nonce, os=3, pc, phone=10000000000, pn, rc, sdkName, timestamp, type=1, ui='null', version=2.0.0, xc`
  - `nonce = Math.round(Date.now()) + Math.floor(1e8 * Math.random())`
  - `timestamp = Math.round(Date.now())`
  - `sign = MD5(按请求体顺序把 k 与 v 直接拼接)`（**无分隔符、无排序**）
    - 一篇给的是展开后的字面串（`appId...xc0`），另一篇给的是 `''.join(f"{k}{v}")` 遍历 —— 同一件事的两种写法，
      **拼接顺序 = 抓包里的字段顺序**，不要按字典序自己重排。
- **校验参数 `report`（双源一致）**：`RSA_encryptLong(JSON.stringify(track)) + MD5(captchaId + token)`
  - 公钥：`atob(vConfig.k)`，是 **PKCS#8**（`-----BEGIN PUBLIC KEY-----`）；单行 PEM 需按 64 字符重新折行才能被标准库吃下。
  - `encryptLong` = **PKCS#1 v1.5 分段加密**，段长 `= key_size_bytes - 11`，各段密文拼接后整体 base64。
  - `RSA` 分组用 **ECB 口径**（对分段而言即"每段独立加密"），不要用带 IV 的模式。
- **图片几何（双源一致）**：背景图在接口里就是**乱序的 32 条竖条**，前端再重排；顺序数组由一段字符串算出：
  ```
  out = []
  n = min(32, len(s))                 # 一版以 s.length 为界、一版硬编码 32；输入恰好 32 字符时等价
  for i in range(n):
      c = ord(s[i])
      while (c % 32) in out: c += 1   # 递增直到与已收集的值不重复（32 以内必有空位）
      out.append(c % 32)
  ```
  - 输入 `s` = 背景图 URL 中的一段前缀字符（一版明确"取格式前面那一串字符"）。
  - 还原（360 站）：画布 `544×284`，条宽 `17`：`paste(crop(i*17, 0, i*17+17, 284), item*17, 0)`。
  - **自验口径（本文件自算示例，来源未给样本）**：取 `s = "22/aa27352e782eb74ccccef04eb91bc"`（32 字符）⇒
    `out = [18,19,15,1,2,20,23,21,22,24,5,25,26,27,6,3,28,29,4,7,8,9,10,11,16,30,12,13,31,17,14,0]`。
    **机械判据：`out` 必须是 `0..31` 的一个排列**（去重后长度恰为 32）——
    "递增去重"实现最容易漏掉某个值，用这条先验约束可自查，不必等提交失败。
    （本批另有一个一次性 oracle，但它是**流程产物、不进技能库**——本技能对使用者必须自包含；
    以本节给出的示例与"排列"约束为准即可，不需要外部脚本。）
- **轨迹字段（单源，2054148）**：`[{ "<x>": {"t": <ms>, "y": <y>}, ... }]` —— **对象以 x 为 key**，不是三元组数组。
- **该家专属坑**
  - 图片几何的条宽/画布尺寸是**站点渲染值**（544×284/17），换站要重新量，不要把 17 当全局常量。
  - 距离换算照抄别家的数会导致整体偏移（见 §4 第 5 条）。

### 3.3 数美 `shumei` ★四源

**来源（四篇）**：`52pojie-2043649`（ishumei demo，B19）、`52pojie-1782883`（全家桶 + AST 取动态参数）、
`52pojie-1881927`（点选协议全面剖析）、`52pojie-2059636`（2025 滑块全流程可运行代码）。
**B20 的三篇互不引用、站点不同、SDK 版本与参数名全不一样**，加上 B19 那篇共四篇，机制逐条吻合
（`★四源` 指的就是这四篇；「三源」只数 B20 新增的那三篇时容易被误读成总数，故统一按四篇记）。

- **一票判据**：请求参数 `captchaUuid` + `organization`（`organization` 该站固定）。
  ⚠️ **不要用提交参数名当判据**——这是本批最重要的结论：
  同一家三篇来源的参数名分别是 `tm/tb/ly/fr`（B19）、`en/dy/xy/tb/mu/oc/mp/nu/qd/ww/kq/jo`（2024）、
  `to/ny/bs/fm/lf/sl/qt/yh/bq/gg/hg/th`（2025）。
  **参数名 + DES key 都随 `captcha-sdk.min.js` 小版本变**，只有机制不变。
- **三接口**：`GET /ca/v1/conf`（取配置，返回 SDK 地址）→ `GET /ca/v1/register`（取图）→
  `GET /ca/v2/fverify`（提交）。域名 `captcha1.fengkongcloud.cn`，图片前缀 `castatic.fengkongcloud.cn`。
  - `register` 可能**不是 JSON**：返回形如 `callback({...})`，**先按文本用正则取 `(...)` 再 `json.loads`**。
- **`conf` 的 `model` 枚举就是全题型表**（一份来源给全，直接当分类依据用）：
  `slide` 滑块 / `auto_slide` 无感 / `select` 文字点选 / `icon_select` 图标点选 /
  `seq_select` 语序点选 / `spatial_select` 空间推理。
  其余字段：`organization` / `appId` / `callback` / `lang` / `sdkver` / `channel` / `captchaUuid` / `rversion`。
- **`captchaUuid` 的形态是"时间戳 + 随机串"，但位数与字符表不是硬约束**：
  - 两篇给的是 `yyyyMMddHHmmss + 18 位`（其中一篇正文写"17 个"，**它的代码是 `range(18)`、示例值也是 18 位
    ⇒ 以代码为准**），字符表 `ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678`
    （**相对完整 base62 少了 `I/L/O/U/V` 等易混字符** —— 这是对来源字符表的观察）。
  - **第三篇（2025 版）用的是 16 位 + `string.ascii_letters + string.digits`（完整 base62），实测同样通过**
    ⇒ **服务端不校验位数与字符表**。⇒ 复现时位数/字符表可任选其一，**不要把这当成通过条件**。
- **加密**：`getEncryptContent(word, key)` = **DES-ECB + ZeroPadding + base64**，
  `word` 必须是**字符串**（数字也先转字符串）。**四个固定入参的字段可以整段写死**
  （换版本的等价值可用现场抓包替换）：
  `mp = DES('default', '9cc268c1')`、`oc = DES('DEFAULT', 'c2659527')`、
  `xy = DES('zh-cn', 'b1807581')`、`jo = DES(getSafeParams(), '6d005958')`。
  每字段对照（该版本实测）：`qd`=`selectData`（点选坐标）、`mu`=`mouseData`（轨迹）、
  `nu`=图宽 `300`、`dy`=图高 `150`、`tb`=`1`、`en`=`0`、`kq`=`-1`、
  **`ww` = 一个常量 `28504615`**（不是"宽高"——照字面猜会把常量写错）。
  **同一批 key 只在同一 SDK 版本内有效**，升级就换。
- **`this._data` 按题型分三套**（一份来源给全三套字段，**照它填即可**）：
  - 滑块：`mouseData`=轨迹 `[x,y,t]`、`mouseEndX`=距离、`trueWidth`/`trueHeight`=300/150、
    `blockWidth`=40、`selectData`=[]、`startTime`=0、`endTime`=轨迹末时间 + `random(100,500)`。
  - 点选类：坐标先**归一化**（`x/300`、`y/150`）再打时间戳，
    `startTime = 末点时间 − random(800, 20000)`，`selectData` 与 `mouseData` **是同一份坐标**。
  - 无感：`mouseData=[[0,0,0]]`、`mouseEndX`=260、`endTime=random(100,500)`。
- **点选坐标的最终形状**：`[x / 图宽, y / 图高, 时间戳]` —— 就是 `[x, y, t]` 三元组，
  只是 x/y **先按图宽图高归一化**（`co[0] /= 300`、`co[1] /= 150`）。
  ⚠️ 归一化的分母是**原图尺寸**（300×150），不是渲染尺寸。
- **结果字段**：`riskLevel` = `PASS`（放行）/ `REJECT`（拦截）；
  `code` 枚举：`1100` 成功、`1901` QPS 超限、`1902` 参数不合法、`1903` 服务失败、`9101` 无权限。
- **图片**：源 `600×300`，页面渲染 `300×150` ⇒ 距离识别后**除 2**；`bg` 是底图、`fg` 是滑块。
- **该家专属坑（本文件最重要的一组）**
  - ❌ 代码里有自定义格式化检测 `isJsFormat`：**一旦把 JS 格式化/美化，加密用的 key 会被换成"时间戳+域名"**，
    提交必然失败且现象是"参数看起来正常"。处置：**只做单行压缩缓存替换，不美化**；需要可读时另存一份只用于阅读。
  - **资源有多个域名热备**：替换 JS 时若其中一个域名失败会自动跳另一个，
    现象是"我明明替换了但没生效"。做替换时**先确认命中的是哪一个域名**。
  - **动态 JS URL 会导致断点只生效一次**（每次 URL 都变）⇒ 用 Charles `Map Local`
    或 mitmproxy 把页面/脚本回写成固定文件，再下断点。
  - **样本里不同 DCC 工具链口径**：`v1.0.4` 从 `148` 起有混淆；`v1.0.3` / `v1.0.1` 的 `147` 及以前
    **没有混淆**，可正则直取。AST 直取目标 = **12 个提交参数名 + DES key**
    （不是"还原所有混淆"），提取结果**有序未去重，按索引取**。

### 3.4 云片 `yunpian` ★双源

**来源**：`52pojie-2020008`、`52pojie-2057170`。

- **接口**：`GET https://captcha.yunpian.com/v1/jsonp/captcha/get`、`.../verify`（**JSONP**，`cb` 回调名）。
- **参数**：`cb`（JSONP 回调名）、`i` = `AES-CBC + Pkcs7 + base64(明文)`、`k` = `RSA_PKCS1v1_5(key + iv)`
  （公钥内联在 JS 里，单行 PEM 需折行）。
  - **`cb`**：一篇（2020008）给的是 `Math.random().toString(32).replace("0.", "")`；另一篇（2057170）直接
    `.join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=11))`。两篇结果都能过
    ⇒ **服务端不校验 `cb` 形式**（这是双源互证出的"这步不严"），别在这上面纠结。
  - **key / iv**：各 16 位随机，来自 `mt.getRandomStr(16)`（一篇的实现未展开，另一篇用 `Math.random().toString(36)` 反复拼后 `slice(0,16)`）。
- **get 明文**：`{browserInfo:[{key,value}×5], nativeInfo, additions, options:{sdk,sdkBuildVersion,hosts}, fp, address, yp_riddler_id}`
  - `fp` = 浏览器环境哈希（同站可固定）；`browserInfo` 五项 = `userAgent/language/hardware_concurrency/resolution/navigator_platform`。
- **verify 明文** = `{points, distanceX, fp, address, yp_riddler_id}`（**不是 get 那套 `browserInfo/options`**；
  两篇对"get 明文含 `browserInfo`/`options`"与"verify 只带这五项"的描述不同 ⇒ 以抓包为准）。
  - `distanceX = (imgWidth − alertImgTag.width) × (offsetX / (imgWidth − 42)) / n`
  - 一篇的具体数：`(304−59) × (distance/(304−42)) / 304` ⇒ **按响应里的 `imgWidth` 与小图宽度算，不要照抄 304/42**。
- **轨迹**：`points` 为 `[x, y, t]` 三元组数组，**超过 50 点要抽稀**（步长 `len//50`，保首尾）。
  两篇给的起点范围不同（`start_x 800–850 / start_y 1960–1971`）⇒ 服务端对起点不严格。
- **该家专属坑**：轨迹点数不抽稀时提交体积会膨胀且更容易被判异常；`distanceX` 用了 `imgWidth − 42` 这种"少一块"的口径，
  42 是该插件滑块的固定占位，**换站无效**。

### 3.5 螺丝帽 Luosimao

**来源**：`52pojie-1846991`。

- **一票判据**：页面 `data-site-key`（= 请求参数 `k`）；域名 `captcha.luosimao.com`。
- **链路**：`widget`（带 `i`）→ `request`（params `k`,`l`；data `bg`,`b`）→ `frame`（带 `s`）→ `user_verify`（`h`,`v`,`s`）→ `submit`。
- **参数配方**
  - `i = "_" + Math.random().toString(36).substr(2, 9)`；`widget` 返回的 HTML 里有 `data-token`。
  - `bg = AES(环境串)`：`us + "||" + token + "||" + sc.w + ":" + sc.h + "||" + pf.toLowerCase() + "||" + prefix.toLowerCase()`
  - `b = AES(轨迹串)`：`path[0] + ":" + timePoint[0] + "||" + path[1] + ":" + timePoint[1]`
    （`path` = [进入点击区坐标, 点击时坐标]；`timePoint` = [页面加载完时间, 开始点击时间]）
  - `s = AES(dots.join("#"), key = request 返回的 i).toString()`
  - `v = MD5(...)` —— **来源对 `v` 的入参表述含糊（待复核）**，落地前用浏览器实测对齐一次：在 `user_verify` 前把 `h/v/s` 三个值都抓下来，
    用已知 `dots` 反推哪个是 AES 直出、哪个被 MD5 过。
- **图片几何**：300×160，**上下两半各 15 片、每片 20×80**（共 30 片）；
  `left/right/frame` 返回里的 `captchaImage.l` 数组 = "原始图第 N 位 ← 乱序图片段左上角 `[x,y]`"，与 CSS `background-position` 同值。
  还原：`canvas.paste(crop(x, y, x+20, y+80), (index % 15 * 20, 80 if index > 14 else 0))`。
- **该家专属坑**
  - **加密函数名叫 `SHA3`，实际是 AES** —— 信函数名会走一天弯路，**用结果比对定算法**。
  - `dots` 是**倒序且每个点内 x/y 互换**（`["第3次的 y,x", "第2次的 y,x", "第1次的 y,x"]`），照正序提交静默失败。
  - **`frame` 接口校验 header 的 `Host`**，且与其他接口不同；Host 不对直接失败，报错不指向 Host。

### 3.6 安居客 `anjuke` ★双源

**来源**：`52pojie-1756696`（改写路线）、`52pojie-1796423`（硬扣路线）。
**互证范围**：两篇的 `reduce` 取 key、`CryptoJS.enc.Utf8.parse` + `AES-CBC/Pkcs7` 一致；
**输出行两篇写法不同**（一篇 `encodeURIComponent(_cRV.toString())`、一篇 `JSON.stringify(ciphertext)`），
但**两篇都实测通过** ⇒ 该站无 salt 时 `CryptoJS AES.encrypt(...).toString()` 与 `Base64.stringify(ciphertext)` **结果相同**，
两种写法等价，任选其一即可。

- **链路**：`captchaNew.html`（HTML 里有 `name="sessionId"` 的 input）→ `getInfoTp`（`sessionId`,`dInfo`）→
  `checkInfoTp`（`sessionId`,`responseId`,`dInfo`,`language`,`data`）。
- **参数配方**
  - **AES key == iv == `sessionId` 的奇数下标字符**（JS `reduce: idx%2==0 ? p : p+c`；Python 口径 `if index % 2 != 0`）。
  - `dInfo = AES(JSON({sdkv:"3.0.1", busurl, useragent, clienttype:1}))`，**再做 `encodeURIComponent`**。
  - `getInfoTp` 返回的 `info` 用同一 key 解密得到图片地址。
  - `data = AES({x: 距离, track: 轨迹, p: [0,0]})`。
- **Python 侧对应写法（最值钱的一条）**：`base64.b64encode(cipher.encrypt(pad(...)))` 后再 `quote_plus`。
  `encrypt()` 与 `encryptor.update()+finalize()` 等价（见 `motion-and-coordinate.md` 的编码库字节级差异），
  但 **`quote_plus` 不能省**（`+`/`/`/`=` 必须转义）。
- **图片**：源 `480×270`，渲染 `280×158`（比例 ≈ 0.5833）；识别前或识别后任一处缩放即可。
- **轨迹**：该站校验不严，可用**样本轨迹 × 距离比**缩放法（来源附一条 126px 基准轨迹，`ratio = distance / 126`）。
- **该家专属坑**：`_taN()` 里的判断（`undefined - (8*564<<5>0)`）是 `NaN` ⇒ 分支不执行，**返回的是写死的指纹字典**；
  不要试图去"求值"那些表达式，直接抄字典。

### 3.7 房天下 `fang`

**来源**：`52pojie-1846995`。

- **链路**：`getslidecodeinit.api`（→`challenge`, `gt`）→ `c=index&a=jigsaw`（→`surl` 背景图, `url` 滑块图）→
  `c=index&a=codeDrag`（→`validate`）→ `loginsendmsm.api`（带 `validate` 发短信）。
- **图片**：源背景 `320×160`、滑块 `60×158`；**渲染 `300×150`、`57×150`** ⇒ 必须先缩放再识别。
  背景图完整地址要拼前缀 `https://static.soufunimg.com/common_m/m_recaptcha/jigsawimg/`。
- **状态码（排错第一步）**：`100` 成功、`101` **参数校验失败**、`102` **缺口识别错误**。看到 `101` 先去对参数，别改轨迹。
- **`i` 参数**＝环境指纹的**自定义位压缩**：
  指纹数组（**41 项**，逐项见来源 §3.7 表）→ `join("!!")` → `encodeURIComponent` → 编码为二进制串 →
  **每 6 位取一次，`parseInt(bin6, 2)` 作下标，从固定字符表 `charAt` 取值**（配 `String.fromCharCode` 与 `toChart16`）。
- **`t` 参数**＝鼠标轨迹 → 大数组 → 二进制串 → **同一套 6 位索引压缩**。
- **`callback`**：`"fangcheck_" + (parseInt(1e4 * Math.random()) + Date.now())`。
- **留白（明确未落库）**：6 位压缩用的**固定字符表内容**与"二进制串的具体展开函数"只在来源截图里，
  本文件不给猜测值；复现时按 `baseCompress` 原样扣。
- **该家专属坑**：指纹数组 41 项里有一半是浏览器冷门属性（`HTMLLength`、`CPUClass`、`jsFonts`），
  来源原话"最后确实校验了，但不多" ⇒ **先用最简指纹跑通，再逐项补齐**，不要一上来全造假。

### 3.8 51.com（仿极验 HTML 布局）

**来源**：`52pojie-1918745`。

- **接口**：`GET https://authcode.51.com/authcode/slidecode?callback=...&from=passport&_=<ms>`（JSONP）；
  校验 `.../authcode/yz2`。
- **HTML 布局与极验早期形态相同**：`class='gt_cut_fullbg_slice' style='background-position:<x>px <y>px'` + `background-image: url(...)`。
- **图片几何**：片 **13×25**，y 档四档（`0 / -25 / -50 / -75`），共约 20 个 x 档 → 还原画布 **260×100**。
  还原：按 `abs(y)` 作裁剪起点 `crop((abs(x), abs(y), abs(x)+13, abs(y)+25))` 依次贴 `x_offset += 13`，满 260 换行。
- **校验参数**：`point`（距离）+ `times` + `challenge`（两者都在 HTML 的 input 里）+ `token = md5(challenge + times + point)`。
- **该家专属坑（本节存在的主要价值）**
  - ❌ **命中 `gt_cut_*` 不等于极验**。本条判据：域名 `authcode.51.com` + 参数 `times/challenge/point` + `token=md5(三串)`。
    套 `geetest-protocol-matrix.md` 的 `w`/`validate`/七步链会一无所获。

### 3.9 乐某（LOFTER）自研

**来源**：`52pojie-2040415`。

- **链路**：登录（`passport = SHA256(密码)`）→ 取图（`?type=jigsaw`）→ 滑块校验 → 带滑块结果再登录。
- **图片是内联的**：`data.bg` / `data.front` 直接是 `data:image/png;base64,` 串 ⇒ **不用再请求图片 URL**，`base64.b64decode` 即可。
- **参数配方**
  - 请求体 = `{id: 图片接口返回的 id, 距离}`，`AES-CBC + Pkcs7`，**key 与 iv 各自随机 16 位**（数字 + 小写字母等概率）：
    `Math.round(Math.random()) ? floor(9*Math.random()) : String.fromCharCode(97 + floor(25*Math.random()))`
  - 请求头 `x-encseckey = RSA_PKCS1v1_5(key + "-" + iv)`（公钥 PEM，`PKCS1_v1_5`）。
    **待复核**：来源正文只出现函数名 `x_encseckey_get`，**头名本身取自截图** ⇒ 落地前用抓包确认头名连字符/下划线。
  - **响应解密用本次的 key/iv**：`arrayBuffer → btoa → AES 解密`。
- **随机源**：`getRandomString(t=16)` = 每位「数字（`floor(9*random())`）或小写字母（`97+floor(25*random())`）」二选一；
  来源正文未直接给出调用点，但 key/iv 与"响应解密"用的必须是同一组 ⇒ 视为每次请求新生成（**待复核**：落地前打印一次确认）。
- **该家专属坑**：key/iv 是**每次请求新生成并同时用于加解密**；
  解密失败先确认"本次请求的 key/iv"，不要复用上一轮（这是最容易发生的静默错）。

### 3.10 当当 `dangdang`

**来源**：`52pojie-2025578`。

- **链路**：`isShowSlide`（**可忽略**，不是参数校验）→ `getSlidingVerifyCode`（图片）→ `checkSlidingVerifyCode`（校验）→ `accountLogin`；
  另有 `getRankey` 换 `rankey` / `requestId`。
- **`permanent_id` 生成链**：`yyyyMMddHHmmssSSS + rand(100000,999999) ×2 + "DDClick521"` → `MD5` →
  取 hex 前 8 位 → `str(int(hex8,16))[:6]`（不足 6 位补 `0`）→ 再与时间/两个随机数拼成最终串
  （来源给出的顺序：`时间(含毫秒) + processed_hash + random1 + random2`）。
- **`sign`**：`AES(明文, key = rankey)`，明文由参数转 URL 查询串再 `decodeURIComponent` 得到；
  **首次请求（`rankey` 还没拿到）密钥为空串**。
- **`requestId` 是接口返回值，不是本地生成的** —— 别再往 JS 里翻（来源明确踩过）。
- **滑块校验**：`point_json = AES(..., key = encryptKey)`，`encryptKey` 与 `y` 由图片接口返回；
  同批还有 `slide_cost_time`、`verifyToken`（取图时一起返回）。
- **成功链路**：校验返回 `checkcode` → 登录接口带上。

### 3.11 同花顺 `ths`

**来源**：`52pojie-2035508`。

- **链路**：`getGS`（验证账号，回 `dsk/dsv/ssv`）→ `dologinreturnjson2`（触发验证码）→
  `getPreHandle`（取图 + `inity` + `signature`）→ 滑块校验（拿 `ticket`）→ 再登录。
- **登录参数**：`uname/passwd` 走 `thsencrypt.encode`（RSA：公钥以 **`modulus` + `exponent=10001` 直接给出**，
  不是 PEM；填充实测为 **PKCS#1 v1.5**），`passwd` 多一步标准 `MD5`。
- **`crnd`**：`Math.random().toString(36)` 取后 8 位**重复两次** → 16 位数字+小写字母。
- **`passwdsalt` 三段链**（`encodeDataSaltOnce`）：
  1. `n1 = SHA256(crnd + dsk)`
  2. `k = XOR(base64decode(ssv), n1)` —— **来源对"取 `=` 之后的部分作 HMAC key"表述含糊（待复核）**，
     落地前把 `n1`、XOR 结果、HMAC key 三者在浏览器里各打印一次对齐。
  3. `v1 = HMAC_SHA256(MD5(passwd), k)`；`v2 = SHA256(dsv)`；`final = RSA(base64(XOR(v1, v2)))`
  - 该链任一环错，现象是 **`dsk/ssv` 全为空**（很容易误判成"接口挂了"）。
- **滑块参数**：`phrase = x + ";" + inity + ";" + opt.width + ";" + opt.height`，
  其中 `inity = data.data.inity / 195 * opt.height`（`data` 来自 `getPreHandle`；`195`、`opt 宽高` 是该站常量）；
  另需图片接口返回的 `signature`。
- **该家专属坑**：站点**禁用 F12** ⇒ 先开控制台再发请求。

### 3.12 东方财富 `eastmoney`

**来源**：`52pojie-2042937`。

- **一票判据**：cookie `qgqp_b_id`（`browserid` 来源于它）。
- `browserid` = **20 位数字**：第 1 位 `1–9`（`floor(9*random()+1)`），后 19 位 `0–8`（`floor(9*random())`，**可能为 0 但不会为 9**）。
- **提交**：`{ctxid: 接口返回, request: base64Encode(XXTEA(明文))}`
  - **是 XXTEA，不是 AES/DES** —— 与常见库比对全部不一致时**先怀疑 XXTEA / 自定义分组**（来源即如此判定）。
- **明文格式（pipe 分隔）**：
  `appid=...|ctxid=...|type=slide|u=<距离>|d=<x,y,t:x,y,t:...>|a=quoteapi|p=|t=<总时长>|r=<随机小数>`
- **图片几何**：**26×2 = 52 片**，由 `background-position` 控制；按还原数组裁剪堆叠（26 列 × 2 行）。
- **距离**：`distance = int(box_x - 8)`（该站固定偏移 `-8`，来源口径）。
- **该家专属坑**：给 canvas 打断点断不住 ⇒ 改搜 `img` 找 `DecodeImg`，图片还原在 `k` 函数里（不是 canvas 路径）。

### 3.13 v5（verify5）——WebSocket 承载

**来源**：`52pojie-2038972`。**这是本族唯一的 WS 承载样本**；
**WS 那一层的取证顺序与拆帧方法见 `../../websocket-reverse/references/cases/case-ws-carried-captcha.md`**，
本节只给厂商侧的链路与加密口径。

- **形态**：打开页面即建 ws；一次完整验证**发 6 条消息、收 3 条**；**没有 HTTP 参数加密**，只有消息体加密。
- **消息封装**：待发字符串按 **1024 字节**分片，每片前加消息头。
  来源明确给出的只有**第二轮消息头以 `1|1|` 开头**（单源，`52pojie-2038972` 原话）；
  第一轮的头形态来源未给（看到 `a|b|` 这类分隔形式请**按抓包实测**，不要当常量）。
- **加密**：**AES-CTR + NoPadding**，`btoa(IV + ciphertext)`
  - key 由 `Y(d, h)` 派生：取 token **最后一个字符的 charCode 对 2 取余**，按奇/偶下标拆字符串得 key；
    第一轮 `d` 与 `h` 相同。
  - 解密时：**前 32 个 hex 字符 = IV**，其余 base64 解码后才是密文（来源 Python 实现即"先 `b64decode().hex()` 切 32"）。
- **明文**：`requestId = "req" + 时间戳`；`data.l` = 页面返回的 token；其余为浏览器指纹（可写死）。
  轨迹明文（来源口径）：**最前面两个值是时间戳**，之后**每 3 个一组**（滑动时间 / 距离 / y 偏移），整串逗号分隔。
- **该家专属坑**
  - **`requestId` 里的时间戳若是过去时间，结果必为 `false`**（新鲜度硬要求）。
  - 返回值里会带一个 `u`/`m` 之类的材料，**下一轮 key 由「上一轮返回值前 32 位 + token」生成**；
    demo 里 `u` 与 `m` 相同，但**不要依赖这一点**（来源自述"可能是因为 demo"）。

### 3.14 雷池 WAF 滑块（SafeLine）

**来源**：`52pojie-1995970`。**该家没有图片**，判 `waf-challenge` 而非 `slider`。

- **链路**：首页（→ `client_id` + cookie `sl-session`）→ `challenge.js`（环境检测）→
  `issue`（带 `client_id`，取数组 + `issue_id`）→ `calc.js`（Worker + Blob + **wasm**）→
  `verify`（带新数组 + 固定参数，拿 jwt）→ cookie `sl-challenge-jwt`。
- `client_id` 形如 `<hex>_61`，来自首页响应内容（**后缀 `_61` 只有单一样本，疑似站点适配项，换站需重取**）。
- **43 个检测点**：`v` 数组里 43 个 `fun`，初始分 0，每命中一个加分，**总分 ≥ 100 判为"正在被检测"**。
- **wasm 调用顺序固定四步**：`reset → arg → calc → ret`。
- **轨迹不校验**（来源实测可写死）；难点只在 `calc`。
- **定位技巧**：`new Worker(URL.createObjectURL(new Blob([calcJs])))` ⇒ 浏览器里会出现 `blob:` 脚本，直接读它即可拿到 wasm 胶水层。
- **该家专属坑**：来源给的是"从源头注释掉检测"的调试法 —— **只在本地分析时用**，不要写进交付脚本。

### 3.15 阿里 227（AWSC 无痕 / 滑块）

**来源**：`52pojie-1903141`（站点为 51job 上出现的 227）。

- **接口**：`nocaptcha/analyze.jsonp`，核心参数 `n`；`o.__fy_options` 可固定。
- **脚本加载顺序（本地复现照抄）**：`awsc.js` → `et_f.js` → `fireyejs.js` → `nc.js`。
- **出值路径**：导出 `m` → 先 `m.init` → 再导出 `o` 调 `o.__fy.getFYToken`。
- **补环境需要**（来源实测命中）：
  - `getComputedStyle(document.body)` 的**全部属性**（等价 `t = getComputedStyle(document.body); pe = [].slice.call(t)`）
  - `Performance.prototype.getEntriesByType`
  - `font` 指纹（两处比较）
- **`s[]` 环境特征数组**（来源逐项给出）：
  - `s[5]` = 点击前轨迹数组长度 − 1（含 mousedown 那一下）；`s[46]` = 同类但不计 mousedown ⇒ 比 `s[5]` 小 1
  - `s[26]` = WebGL 两项 + `DeviceOrientationEvent` 的 `"undefined"` + `MouseEvent` 的 `target.id`
  - `s[23]` = `ScriptProcessorNode.onaudioprocess` → `AnalyserNode.prototype.getFloatFrequencyData`
  - `s[48]` = 时间戳相关；`s[91]` / `s[52]` = Promise 回调；`s[3]` = `FocusEvent`；`s[36]` = 滑块相关
  - **`s[90]` = 轨迹数组（最重要）**：由 `mousedown/mousemove` 驱动（全局有 2 个监听，要用**第 2 个**）；
    取 `clientX/clientY/timestamp/pageX/pageY` 并**做过异或等运算** ⇒ **不能拿鼠标原始值直接对拍**；
    轨迹**点击前的也一直在 push**，所以要点在"点击前/点击后"分段。
- **该家专属坑（两条硬结论）**
  - ❌ **不要把"多层 switch → 单 switch"的降层产物拿去替换浏览器里的原代码**：来源实测因作用域问题无效。
    **降层版只用于跟值/阅读，替换仍用多层原版**（这就是双轨）。
  - ❌ **代码不要格式化**（有检测）；`s[90]` 长度有 17/18 两种，来源未查明，本地构造也会自然出现两种 ⇒ 不强行统一。

### 3.16 快手 `kuaishou`

**来源**：`52pojie-1897823`。**该家唯一值得单独成节的原因是"轨迹点会被变异"。**

- **定位**：`verifyParam` 上一层作用域可取到**加密前的轨迹文本**（`x,y,time` 逗号分隔）。
- **配置接口** `/rest/zt/captcha/sliding/config` 返回 `a / q / d / sx / sy / ix / iy` 等。
- **坐标换算（该站实测口径）**：
  - `x = floor((clientX − clientX0) / 276 × 1000)`，`clientX0` = 第一个轨迹点的 clientX
  - `y = floor(clientY − 282.25)`
  - **`276` / `282.25` 是该站常量，不是通用公式。**
- **变异点两类**
  - 含 `d`：轨迹长度等于 `a` 时第一次变异，之后每隔 `d` 个点再变异（来源样本：`a=12, d=13` → 12 / 25 / 38）
  - 只含 `q`：第 `a+1` 个点起变异（来源样本 `a=30`；**来源自述此条为多次测试归纳、未跟栈**）
  - 变异值：`x' = x × sx + ix`，`y' = y × sy + iy`；
    后续变异点来源给的**猜测式**为 `Math.floor(Math.pow(q, 变异次数) + a)`（**待复核**）
- **该家专属坑（性价比判断）**：**不做变异也能过**。来源实测（不同 IP、指纹部分随机）：
  200 次 **99.5%** / 500 次 **98.2%** / 1000 次 **93.8%**。
  ⇒ **先跑"不变异 + 真实轨迹缩放"基线拿通过率，再决定要不要复刻变异**。一上来就逆变异逻辑是本族最低性价比的路线。

### 3.17 异型拼接滑块（`acla-jigsaw`）

**来源**：`52pojie-1881668`。**图像侧判定**，与协议无关。

- **判据**：同一站点可能**并存两种滑块** —— 标准镂空滑块 与 **拼接错位**滑块（没有镂空缺口，"缺口"是左右图拼接错位）。
- **纯算法思路（来源实现）**：灰度 → 按 `split` 切掉底部 → **转置** → 按行归一化到 `0..10` →
  对相邻列（`i*2-1` 与 `i*2+1`）算**余弦相似度** → 在 `50 < i*2 < 550` 内取**相似度最低**的列索引作为错位位置。
- **该家专属坑**：来源实测准确率 **≈70%**，**颜色相近的图会判错** ⇒
  这类题优先走模型（`captcha-model-training.md` §八 特征相似度路线），纯算法只作兜底；不要拿 70% 的路线去做批量任务而不报失败率。

## 4、跨厂商共性（8 条，可迁移）

1. 链路骨架高度一致：**前置取图 → 识别距离 → 生成轨迹 → 加密提交 → 换票**。
   **换票字段各不同**（`ticket` / `validate` / `checkcode` / `randstr`+`ticket` / `resp` / `jwt`）—— 别硬套字段名。
2. 参数加密**多数落在两种**：**① AES-CBC/Pkcs7 + base64**；**② AES(key/iv 随机) + RSA 包 key**。
   例外的三种已实测到：**DES-ECB/ZeroPadding**（数美）、**XXTEA**（东方财富）、**AES-CTR/NoPadding**（v5）。
   比对不上时**先按标准算法跑一遍**（B12 结论：自制查表实现常与标准 AES 等价），再怀疑这几种例外。
3. **函数名不可信**：`SHA3` 实为 AES（螺丝帽）、`stringify` 是自定义 base64（安居客）—— 一律用结果比对定算法。
4. 图片几何三选一：**竖条乱序**（30 / 32 / 26×2 / 13×25 都出现过）、**镂空缺口**、**拼接错位**。
   先数片数与方向，再决定用哪个 `--model`（见 `tile-scramble-and-coordinate-mapping.md`）。
5. 距离换算永远是**独立一步**，缩放系数与固定偏移**逐站实测**：
   已出现 `-8`（东方财富）、`/480×304`（云片）、`/544×300`（360）、`-52`（百度旋转）、`inity/195×height`（同花顺）。
6. **弱校验站**轨迹可写死或样本缩放（安居客 / 房天下 / 雷池 / 云片）；**强校验站**把轨迹与环境一起算
   （阿里 227 / qcloud）。**注意快手的双重性**：轨迹会被变异（强行为），但**不变异也能过**（通过率实测 93.8%–99.5%）——
   先按"弱"做基线，再决定是否复刻变异。
7. 会话内**一次性材料**（`token`/`sess`/`captchaId`/`rankey`/`encryptKey`/`u`）必须与本次请求配对；跨轮复用是老失败的常见根因。
8. **「格式化 / 改写 JS 后提交失败」是这一族的通用坑，但机理不止一种**：数美是**显式的 `isJsFormat` 检测**
   （格式化后 key 被换掉）；阿里 227 是**降层后作用域失效**（无法替换）；雷池是**环境检测**（43 个检测点）。
   ⇒ 共同处置只有一条：**替换必须用与原始字节同形态的版本**。

## 5、判不出时的证据补齐表

| 缺什么 | 怎么补（离线优先） | 补完能判什么 |
|--------|-------------------|-------------|
| 接口名 | 抓包导出 HAR / 只看 URL 列表 | `cap_union_*`→腾讯；`nocaptcha/*`→阿里；`/rest/zt/*`→快手；`challenge.js`+`calc.js`→雷池 |
| 参数名 | 只看请求体的 key 集合 | `collect/tlg/eks`→turing；`yp_riddler_id`→云片；`dInfo/responseId`→安居客；`crnd/passwdsalt`→同花顺；`ctxid`→东方财富 |
| Cookie 名 | 只看 `document.cookie` 的 key | `qgqp_b_id`→东方财富；`sl-session`/`sl-challenge-jwt`→雷池 |
| 图片 | 数切片数量与方向、看是否镂空 | 30 片→螺丝帽；32 片→360；26×2→东方财富；13×25→51.com；无图→雷池 |
| JS 特征串 | `grep` 关键标识符 | `site-key`→螺丝帽；`organization`+`captchaUuid`→数美；`getFYToken`→阿里 227；`isJsFormat`→数美 |
| 域名 | 直接看 host | `turing.captcha.*`→腾讯云；`tianyu.360.cn`→360 天御；`captcha.yunpian.com`→云片 |

## 6、反例与黑名单（不要做什么）

- ❌ **不要**把「命中 `gt_cut_*`」直接判成极验 —— 51.com 用同一套 HTML 布局但协议完全不同（判据见 §3.8）。
- ❌ **不要**把云片的 `480/304`、360 的 `544/300/17`、快手的 `276/282.25`、同花顺的 `195` 当通用常量。
- ❌ **不要**在没有**反向断言**的情况下声称脚本"能识别厂商"：判据器必须在陌生输入上返回 `unknown`（见 `scripts/slider_vendor_identify.py --selftest`）。
- ❌ **不要**对代码做格式化 / 美化后直接替换提交（数美 `isJsFormat`、阿里 227 检测）；需要可读时**另存一份**，替换用原样。
- ❌ **不要**把降层 / 简写后的 AST 产物拿去替换浏览器原代码（阿里 227 实测无效），只能用于阅读。
- ❌ **不要**用随机 `pow_answer` 试探接口（qcloud：接口可能照常返回，提交必挂）。
- ❌ **不要**在拿到 `101`（房天下"参数校验失败"）时先去改轨迹 —— 先对参数，再对图像。
- ❌ **不要**把 360 天御与腾讯 turing/qcloud 混为一谈：判据是 `pn=com.web.tianyu` / `sdkName=360CaptchaSDK`。
- ❌ **不要**把腾讯**防水墙旧形态**（`ua` / `vData` 五参数 + TDC 37 段 + 魔改 TEA）当成 §3.1 的新形态；
  两者的分水岭是「提交里有没有 `vData`」—— 判据器对 `vData` 有排他 veto。
- ❌ **不要**把异型拼接滑块的 70% 纯算法路线当生产方案而不报失败率。
- ❌ **不要**在 360 天御里按字典序重排 `sign` 的拼接顺序 —— 必须与请求体字段顺序一致。

## 7、来源与口径（B19 的 21 篇 + B20 补充的 3 篇，可追溯）

> **推导值声明**：来源出于脱敏，站点 URL 多为 base64（`aHR0…`）且标题写「某*」。
> 本文件的厂商名（如 `10jqka` / `verify5` / `ishumei` / `lofter` / `dangdang` / `eastmoney` / `soufunimg`）
> 是**由这些 base64 解出或由参数/域名推导的**，属推导值；**落地时以实际域名与参数为准**。
> 反过来，本文件给的"一票信号"都是**真实流量里会原样出现**的子串，可以直接喂给判据器。
>
> **`★双源` 的含义**：该篇参与了双源互证；**互证的是链路与公式**，字段级强度仍以各节标注为准。

| # | 文章 | 贡献 | 强度 |
|---|------|------|------|
| B19-1 | `52pojie-2052187-某x滑块补环境分析` | 腾讯云 / turing：prehandle+verify 字段、`collect/tlg/eks/ans/pow_*`、jsvmp、Proxy 补环境与 native 保护 | ★双源 |
| B19-2 | `52pojie-2126956-qcloud滑块验证` | 腾讯云：prehandle → tdc.js → collect → PoW → verify 链路、quickjs 补环境取舍、开源实现 | ★双源 |
| B19-3 | `52pojie-2054148-360滑块验证码逆向` | 360 天御：前置参数 + `sign` 公式、32 条切图与还原、`report` 两段、轨迹对象字段 | ★双源 |
| B19-4 | `52pojie-2042898-某天御滑块逆向分析` | 360 天御：`sign` 遍历口径、`encryptLong` 分段、切图函数还原、PKCS#8 公钥处理 | ★双源 |
| B19-5 | `52pojie-2020008-【JS逆向】yun片滑块验证码分析` | 云片：get/verify、`cb`、明文结构、`distanceX` 公式 | ★双源 |
| B19-6 | `52pojie-2057170-逆向过云片滑动验证码` | 云片：可运行 Python + JS 全链、抽稀、起点不严 | ★双源 |
| B19-7 | `52pojie-1756696-【验证码逆向专栏】安某客滑块逆向` | 安居客：三接口、AES key=sessionId 奇位、改写口径、轨迹缩放法 | ★双源 |
| B19-8 | `52pojie-1796423-某居客滑块逆向分析` | 安居客：硬扣口径、`ciphertext` 直出 base64 + encodeURIComponent、指纹字典 | ★双源 |
| B19-9 | `52pojie-1846991-【验证码逆向专栏】螺丝帽人机验证逆向分析` | 螺丝帽：五接口链、假 SHA3、30 片几何、dots 倒序逆序、Host 校验 | 单源 |
| B19-10 | `52pojie-1846995-【验证码逆向专栏】房天下登录滑块逆向分析` | 房天下：三接口 + 状态码、41 项指纹、6bit 位压缩 | 单源 |
| B19-11 | `52pojie-2043649-某美官网案例滑块逆向` | 数美：`captchaUuid` 字母表、`isJsFormat` 格式化检测、图片缩放比 | ★四源之一 |
| B20-1 | `52pojie-1782883-【验证码逆向专栏】数美验证码全家桶逆向分析以及 AST 获取动态参数` | 数美：`model` 六题型枚举、`conf/register/fverify` 三接口、DES-ECB/ZeroPadding 与固定入参可写死、`_data` 三套题型结构、`code`/`riskLevel` 枚举、四域名热备、AST 直取「12 参数名 + key」及适用版本区间 | ★四源之二 |
| B20-2 | `52pojie-1881927-数美点选验证协议全面剖析` | 数美：逐字段 DES key 对照表、点选坐标 `[x/图宽, y/图高, ts]` 的三段语义、动态 JS URL 的 Map Local / mitmproxy 处置、抠解码函数 + node CLI + python 正则批量替换的解混淆法 | ★四源之三 |
| B20-3 | `52pojie-2059636-数美滑动验证码逆向` | 数美（2025 版）：`register` JSONP 文本预处理、`gg/hg/th` 三个提交量与本版 key、`protocol=185`、可运行 Python 全流程、轨迹生成两种实现 | ★四源之四（字段与该版本绑定） |
| B19-12 | `52pojie-2040415-乐某自研滑块逆向分析` | 乐某：sha256 密码、内联 base64 图、随机 key/iv 会话内配对、`x-encseckey` | 单源 |
| B19-13 | `52pojie-2025578-某当网登录滑块逆向` | 当当：四接口、`permanent_id` 链、`rankey`/`encryptKey`、`requestId` 来自接口 | 单源 |
| B19-14 | `52pojie-2035508-某花顺登录滑块逆向` | 同花顺：RSA 登录、`crnd`、`passwdsalt` 三段链、`phrase` 与 `inity` | 单源 |
| B19-15 | `52pojie-1918745-[51]网站滑块验证码还原` | 51.com：仿极验 HTML 布局、13×25 几何、`token=md5(三串)` | 单源 |
| B19-16 | `52pojie-2042937-某财富网滑块逆向` | 东方财富：`qgqp_b_id`、XXTEA、明文 pipe 格式、26×2 片、`-8` 偏移 | 单源 |
| B19-17 | `52pojie-2038972-v5滑块验证逆向` | v5：WS 承载、1024 分片与消息头、AES-CTR iv 前置、key 奇偶拆分、时间戳新鲜度 | 单源 |
| B19-18 | `52pojie-1995970-雷池WAF滑块版本逆向分析` | 雷池：五步链、43 检测点与 100 分阈值、wasm 四步、Blob Worker 定位 | 单源 |
| B19-19 | `52pojie-1903141-浅逆某里227滑块` | 阿里 227：脚本顺序、`getFYToken`、`s[]` 环境数组、降层双轨结论 | 单源 |
| B19-20 | `52pojie-1897823-快手滑块轨迹分析` | 快手：配置接口字段、坐标换算常量、两类变异点、不变异通过率实测 | 单源 |
| B19-21 | `52pojie-1881668-异型滑块算法解决思路` | 异型拼接：判据与余弦相似度路线、70% 准确率边界 | 单源 |

### 与其他文件的分工（避免重复维护）

- 极验（含 v3/v4/无感/九宫格/消消乐）= `geetest-protocol-matrix.md`（唯一权威源）。
- 腾讯防水墙 `cap_union_*` 旧形态（`ua/sess/collect/eks/vData` 五参数、TDC 37 段、魔改 TEA）= `tencent-tcaptcha-protocol.md`。
  **注意**：本文件的 §3.1 是同一家在新版链路下的形态（`cap_union_prehandle` + PoW），两者按"参数里有没有 `vData`/`ua`"区分。
- 厂商执行注意点汇总 = `provider-execution-notes.md`（只保留指针与"该家最容易踩的一条"，细节回到本文件）。
- 轨迹编码格式与坐标换算通用表 = `motion-and-coordinate.md`。
- 图片几何与切片还原 = `tile-scramble-and-coordinate-mapping.md`。
