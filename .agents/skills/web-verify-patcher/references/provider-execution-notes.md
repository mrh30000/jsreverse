# 厂商执行注意点

本文件用于第二阶段的授权验证流程。厂商识别只决定注意点，不代表可以自动通过。

> **唯一权威源声明**：厂商判据与协议形态以 `slider-vendor-matrix.md`（滑块族 17 家）、
> `geetest-protocol-matrix.md`（极验全家）、`tencent-tcaptcha-protocol.md`（腾讯防水墙老形态）为准。
> **本文件只写"该家最容易踩的一条"与指针，不复述字段表与公式**（避免两处漂移）。
> 定厂先用 `python scripts/slider_vendor_identify.py --fingerprint <file|-> --markdown`。

## 国内行为验证码

### 极验

- 常见类型：`slider`、`click-select`、`grid`（九宫格）、`risk-score`（含**深知 V2 业务风控**）、`token-widget`、`game-challenge`（**消消乐 `match` / 五子棋 `winlinze`**）、`one-click`（**一键通过 / 无感 `ai`**）、`pow-challenge`（v4 的 `pow_detail`）。
- 先判代际，**四代形态都要认**：**初代**（`geetest.0.0.0.js` + `offline.*.js`，全本地算 `validate`）、**二代在线**（`netWebServlet.json` → `get.php` 给**新 challenge** → `ajax.php`）、**二代离线**（同初代）、**v3**（`gt` + `challenge`，`api.geetest.com`，`fullpage.*.js`）、**v4**（`captcha_id` + `lot_number` + `payload`/`process_token`，`gcaptcha4.geetest.com`）。
  初代/二代离线**没有 `w`**，只有一个 `validate`（`A(距离, challenge)_A(rand0)_A(rand1)`）——把离线形态当 v3 去搜 `"\u0077"` 会白找半天。
- 注意点：视觉答案、行为轨迹和加密载荷分离；`challenge` / `lot_number` 短期有效并绑定会话状态。

**协议细节（链路顺序、三个 `w` 的分工、字段来源、底图还原几何、轨迹编码、
v4 的 PoW / 动态防篡改块 / `td`+`td_sign`、九宫格、以及 16 条实测翻车点）统一维护在
`references/geetest-protocol-matrix.md`，动手前先读那一份。**

四条最容易被忽略、且一定会导致失败的点，先记住：

1. **v3 是三个 `w`，不是两个。** 首包 `get.php`、题型确认 `ajax.php`、提交 `ajax.php` 各带一个，
   相互关联；**只逆最后一个会被判 `forbidden`**（"以前能过、现在过不去"的头号原因）。
2. **`w = 密文段 + RSA 段`，两段共用同一把 AES key，且同一会话内只生成一次。**
   v3 的密文段是**自有 base64 变体**（码表尾 `+/` 换成 `()`，补 `.`），v4 是**小写 hex**；
   IV 是**字符串 `"0000000000000000"`（16 个 ASCII `'0'`）**，不是 16 个 `\x00`。
3. **极验 v4 判定必须断言 `data.result == "success"`**：失败时 HTTP 仍 200、外层 `status` 仍是
   `success`；且失败响应里带**新票据**，要拿它走 `pt=1` 换题，直接重发旧 `payload` 会无限 fail。
4. **四代报 `param decrypt error` / `-50002` 时，先怀疑 PoW 而不是 `w`**：
   哈希函数由 `load` 的 `pow_detail.hashfunc` 决定（`md5`/`sha1`/`sha256`，**不是恒定 SHA256**），
   难度是 `bits`（判据＝前导零 `bits//4` 位 + 第 `bits//4` 位 hex ≤ 7/3/1），
   照抄官方 demo 的 md5 写法在别的站点必失败。用 `scripts/geetest_pow.py` 求解。

> 新增章节（B16）：§零.1 初代/二代判据、§8.1 PoW 的**三种哈希 + `bits` 难度判据**、§十五 无感的两个 `w`、§十六 动态键值对（`h9s9`/`kqg5`/`f019`/`l0zs`/`xnbw`）与 gct 动态导出、§十七 题型 → `userresponse` 写法表、§十八 **报错码 → 根因速查**、§十九 补环境两件、§二十 深知 V2。
> PoW 直接跑 `scripts/geetest_pow.py`（`solve` / `check` / `--from-load` / `--selftest` 41 项）。
> 算法层（AES/RSA 四元组、变体编码对照、PoW 归约模板、逐字节对拍方法）见
> `../../web-reverse-algorithm/references/08-mixed-crypto-segmentation.md`。
> 图像线（v3 52 片底图还原、缺口定位）见
> `references/tile-scramble-and-coordinate-mapping.md`；矩阵线（九宫格特征相似度识别）见
> `references/captcha-model-training.md` §九。
> **图像线与参数线必须分开推进。**

> ⚠️ **历史纠正**：早期笔记里「v3 的 AES key 由时间戳派生、用字符 `'0'` 手工补位」的说法不准确
> —— 那是当年作者的推测与他自己 Python 复现脚本的实现选择，已被同系列补遗否证。
> 现行口径：key 为 4 段随机 hex 拼接（`(65536*(1+Math.random())|0).toString(16).substring(1)` × 4），
> 站点侧填充为 CryptoJS 默认 `PKCS7`。以"固定 key/iv/明文与浏览器密文逐字节 diff"为最终判据。

### 腾讯 TCaptcha

- 常见类型：`slider`、`click-select`、`audio`、`one-click`、`risk-score`。
- 常见材料：`aid`/`appid`、`randstr`、`ticket`。
- 注意点：`ticket` 和 `randstr` 往往与 session、页面和行为采集绑定。
- **`cap_union_*` 系（旧 TDC 形态）的五个参数 `ua`/`sess`/`collect`/`eks`/`vData`、TDC 的 37 段拼接与
  魔改 TEA、`vData` 的"填充→打乱→TEA→自定义 base64"、以及站点适配的五请求链（`csrf-token` 两步法、
  `publicKey` 加密轨迹、`secret-key` 提供 AES 的 iv/key）→ 读 `references/tencent-tcaptcha-protocol.md`。
  **该文件是腾讯系「提交参数来源」的唯一权威源，本节只做指针，不在两处并行维护。**

**六宫格「AI 生成图」点选（纯算，不训模型）**：题面是 `3 列 × 2 行` 共 6 张小图，
其中 **2 张彼此相似且孤立于另外 4 张**，目标就是那 2 张里任选一张。

- 切图：按 `3×2` 等分（实测：整图 672×480，先裁掉顶部 34 px，再以 226 为步长切 220×220）。
- 相似度：每格求平均色（缩略到 12×12 再平均），两两算 RGB 欧氏距离，
  `sim = 1 - dist / 441.67`（`√(3 × 255²) ≈ 441.67` 是距离上界）。
  再找"彼此相似、但与其余图都不相似"的那一对。
- 实测：**只用色系判相似成功率 50%+**；换成感知哈希 / SSIM 可到 80%+。
- 取图不必逆协议：用带 stealth 的浏览器（`puppeteer-extra-plugin-stealth`）打开，
  监听 `t.captcha.qq.com/cap_union_new_getcapbysig?img` 响应直接取 buffer。
  六格中心坐标可由 `#slideBg` 的 `getBoundingClientRect()` 直接算出（`w/3`、`h/2` 网格）。

### 百度旋转验证码（`rotate`）

> **协议全文（含 v1/v2 代际判据、两套接口名、`rzData` 两代结构、三个报错码、两条专属坑）**
> 已收敛到 [`rotation-and-gesture-protocols.md`](rotation-and-gesture-protocols.md) §2.2。
> 本节只留"最容易踩的三条"，避免两处并行维护。

- **代际判据只看核心 JS 文件名**：`mkd.js` = v1、`mkd_v2.js` = v2。接口名两代不同，**别按接口名判代际**。
  （两套已实测名字：v1 取参 `viewlog`→`getstyle`、提交二次 `viewlog`、收尾 `viewlog/c`；
  v2 结构一致但收尾走 `cap/c`。其它来源见过 `init`/`style`/`log` 口径 ⇒ **同一家多套接口名，按站点抓包为准**。）
- **动态时间戳后缀导致断点打不上**：脚本 URL 形如 `mkd_v2.js?cdnversion=1756709834`，
  直接断点无效。全局搜 `cdnversion` 找到拼接处 → 删掉后缀（等价 DevTools Overrides 重写文件）→ 刷新后再断。
- **`fs` 是否二次加密两派口径**：另一来源给的是二次（`fs₁` → 包一层 `{common_en: fs₁, backstr}`），
  B20 两篇独立来源都只描述**一次 AES** 且实测通过 ⇒ **先按一次实现，失败再补第二层**。
- **AES key 派生带"算法开关"**：`getNewKey(as)` 取 `as` 的**最后一个字符**查表决定哈希算法
  （`FB→MD5`、`eR→SHA1`、`JQ→SHA256`、`o→SHA512`、`DZ→SHA3-256`、`NZ→SHA3-512`），
  输入是 `as + 'appsapi2'`，**取 hex 前 16 位**当 key。
  遇到"同一个加密函数在不同站点表现不同"时，优先怀疑这种"按某字符查表选算法"的写法。
- **两处填充不同**：`fs` 用 **AES-ECB + ZeroPadding**；`fuid`（`window.passFingerPrint()`，含 canvas 指纹）
  用 **AES-ECB + PKCS7**。不要统一成一种。
- **换算别抄错代际**：v1 旋转 `ac_c = parseFloat(angle/360).toFixed(2)`（滑轨 212 会抵消）；
  v2 旋转同值，但 **v2 滑块分支的分母是 290**（不是 238）。
  可执行件：`scripts/rotation_and_gesture_calc.py baidu-ac-c --version v2 --mode slide --distance <px>`。
- **三个高频坑（都不指向算法，别去翻加密代码）**：
  ① 第一步校验通过后**立刻**调收尾接口（v1 `viewlog/c`、v2 `cap/c`）会 `code 1 Verification Failed`
  ⇒ **随机 sleep 1~3 秒**；
  ② `Referer` 缺失/错误 → v1 `Unregistered Host` / `Invalid Request`、v2 `code 100600 Unauthorized Host`；
  ③ `{'code': 0, 'msg': 'success', 'data': {'f': {'reason': '存在安全风险，请再次验证'}}}` **不是失败**
  （浏览器手动滑也一样），本地加"再次验证"重试即可。
- 环境项与轨迹写死的口径见协议全文；`ac_c` 与图片识别是两件事，别混在一起调。


### 数美、顶象、百度、京东云、云片

- 数美：注意 `organization`、`rid`、`pass`，可见题和无感模式分开分析。滑块细节见下方「数美 / 树美」。
- 顶象：题型多，命中厂商后不要固定判滑块。详见下方「顶象」小节。
- 百度：数字、文字、滑块、轨迹绘制都可能出现；旋转验证码见上方「百度旋转验证码」。
- 京东云：保留 `Jcap.create`、`appId`、`sceneId` 等配置。
- 云片：区分网页行为验证和短信/语音验证码服务。滑块细节见 `slider-vendor-matrix.md` §3.4。

### 其余滑块厂商（B19 新增，只给"最容易踩的一条"）

| 厂商 | 最容易踩的一条 | 详细在哪 |
| --- | --- | --- |
| 腾讯云 turing / qcloud | `pow_answer` 随机值也能被接口"接受"，但**提交必挂**；`sprite_url` 含拖动条，必须先裁；**旧形态有 `vData`** ⇒ 走 `tencent-tcaptcha-protocol.md` 而不是本节 | `slider-vendor-matrix.md` §3.1 |
| 360 天御 / 360CaptchaSDK | `sign` 用**请求体字段顺序**直接拼 `k+v`，按字典序重排必失败 | 同上 §3.2 |
| 螺丝帽 Luosimao | 加密函数叫 `SHA3` 其实是 **AES**；`dots` 倒序且每点 x/y 互换；`frame` 校验 `Host` | 同上 §3.5 |
| 安居客 | 输出 base64 后**必须**再 `encodeURIComponent`（`quote_plus`）；两种 JS 写法等价，别在 `toString()` vs `ciphertext` 上纠结 | 同上 §3.6 |
| 房天下 | 先看状态码 `100/101/102`：`101` 是参数错、`102` 才是识别错 | 同上 §3.7 |
| 51.com | 布局像极验（`gt_cut_fullbg_slice`）但**不是极验** | 同上 §3.8 |
| 乐某（LOFTER） | key/iv 每次请求新生成且**同时用于加解密**，跨轮复用会静默解出乱码 | 同上 §3.9 |
| 当当 | `requestId` 是**接口返回值**不是本地生成，别在 JS 里翻 | 同上 §3.10 |
| 同花顺 | 三段链任一环错，现象是 `dsk/ssv` 全空，容易误判成"接口挂了" | 同上 §3.11 |
| 东方财富 | 加密是 **XXTEA** 不是 AES/DES；给 canvas 打断点断不住，要搜 `DecodeImg` | 同上 §3.12 |
| v5（verify5） | 走 WS；`requestId` 时间戳若是过去时间，结果必 `false` | 同上 §3.13 |
| 雷池 WAF（SafeLine） | 43 个检测点累计 ≥100 分即判"被检测"；无图，属 `waf-challenge` | 同上 §3.14 |
| 阿里 227（AWSC） | **降层后的 AST 产物不能替换浏览器原代码**，只能用于阅读 | 同上 §3.15 |
| 快手 | 轨迹点会被变异，但**不变异也能过**（实测 93.8%–99.5%）⇒ 先跑基线 | 同上 §3.16 |
| 异型拼接滑块 | 纯相似度算法准确率仅 ≈70%，批量任务必须报失败率 | 同上 §3.17 |


### 数美 / 树美（`shumei-captcha`）

> **详表在 [`slider-vendor-matrix.md`](slider-vendor-matrix.md) §3.3（B20 起为 ★三源）**：
> 三接口、`model` 六题型枚举、`captchaUuid`、逐字段 DES key、`_data` 三套题型结构、
> `code`/`riskLevel` 枚举、四域名热备、AST 直取「参数名 + key」。本节只留必读结论。

- **一票判据是 `captchaUuid` + `organization` + 域名 `fengkongcloud`/`castatic`**；
  ⚠️ **提交参数名不是判据** —— 本批证明**同一家在不同 SDK 小版本下的参数名完全不同**
  （三篇来源各一套，逐字段对照表见 `slider-vendor-matrix.md` §3.3，**这里不复述那三套名字**，
  避免两处枚举不一致）。参数名与 DES key 都随版本变，只有机制不变。
- **加密**：`getEncryptContent(word, key)` = **DES-ECB + ZeroPadding + base64**，`word` 必须是**字符串**。
  固定入参的字段（`appId` / `channel` / `lang` / `getSafeParams`）**可以整段写死**；
  坐标/轨迹/尺寸那几把 key 每版都不同。
- **`register` 可能不回 JSON**（JSONP 形态）⇒ **先按文本正则取括号内再解析**。
- 反混淆定位技巧：控制流平坦化 + 字符串数组时，**按业务关键词给分支下断点**
  （`slide` / `auto_slide` 这类分支名），让运行时自己告诉你走哪条；
  再搜"解密后的可读变量名"（如 `getMouseAction`）比搜混淆后的 `_0x` 名字有效。
- **格式化检测**：本地替换 / 格式化 `captcha-sdk.min.js` 后提交必失败，
  检测函数实测就叫 `isJsFormat`；判定为"已被格式化"时，代码把加密 key 换成「时间戳 + 域名」
  ⇒ 请求参数看起来完全正常但必失败。**处置：只做单行压缩缓存替换，绝不美化**。
- **换 JS 没生效先怀疑多域名热备**（数美资源有多个域名，失败会自动跳另一个）。
- **动态 JS URL 会让断点只生效一次** ⇒ 用 Charles `Map Local` / mitmproxy 回写固定文件再断点。
- 距离识别用 ddddocr `slide_match` 或平台；滑动时间取轨迹最后一组时间 +50 即可；源图 600×300、渲染 300×150 ⇒ 距离 **÷2**。

### 同盾（`tongdun-risk`）

- 请求体带 `x_tongdun2_web`，`token = 'tongdun-' + 时间戳 + '-' + Math.random().toString(16).slice(2)`。
- **自有 base64 变体**：码表为
  `abcdefghijklmnoqprstuvwxyzABCDEFGHJIKLMNOPQRSTUVWXYZ0123456789~/=`
  —— 小写段里 **`p` / `q` 的顺序与标准表不同**，且用 `~` 占第 63 位。
  **拿 Python 标准 base64 直接解会失败**，必须先按这张表重建解码器。
- 站点把 CryptoJS 整体改写成 `_0x` 混淆命名（`OoOQ0O` / `QOoOOO` 这类），
  并额外叠了一层**字母位移**：只对**小写字母 `-1`**，且 `'a'` 回绕成 `'{'`（`if c == 'a': c = 123`）。
  还原时这一层必须一起复现，否则密文对不上。
- **背景图还原用 hex 串下发**：`bgImageSplitSequence`（如 `4F387A69D1C2B50E`，16 字符 = 2 层 × 8 片），
  每字符 `int(c, 16)` 即目标槽位，语义是 **source-to-target 且来源索引"扁平"**
  （`x >= 8` 要从**第 1 层**取片）。判据、易错点与 `--order-hex` 复跑命令见
  `references/tile-scramble-and-coordinate-mapping.md` §3.1。
- 提交侧变动字段：`requestType = 3`、`validateCodeObj`（首包返回）、`userAnswer`（需按还原后的图算）、
  `mouseInfo`（轨迹，**重点校验项**）、`usedTime`（写个非 0 的固定值即可）；其余参数不变。

### aj-captcha / tianai-captcha（自托管行为验证库）

- `captchaType` 是固定枚举：`blockPuzzle`（滑块）/ `clickWord`（文字点选）。
- 提交字段：`captchaType`、`token`、`secretKey`、`pointJson`（点选）或滑块坐标。
- **`pointJson` 的构造**：`base64( AES-ECB + PKCS7( JSON.stringify(checkPosArr), secretKey ) )`。
  `token` / `secretKey` 都来自 `get` 接口响应，**`secretKey` 每次不同**。
  ⇒ 两个常见错：把 `pointJson` 当明文 JSON 提交；用了写死的 key。

### 通用图片类：GIF 动图验证码

- 响应同时给 `T` / `F` 两个 base64 时，**取体积更大的那个**（另一个是干扰图）。
- 前缀经验判据：`IVB...` 开头多为静态图片，`ROLGO...` 开头多为 GIF 动图。
- 解法：逐帧拆 → **按像素标准差挑最清晰帧**（`ImageStat.Stat(frame.convert('L')).stddev[0]` 最大）
  → 送 ddddocr。合成帧**必须先垫白底**（`RGBA` → 白底 `paste` → `RGB`），否则透明区会变黑块。
- 识别结果过短（如 < 3 字符）时**直接丢弃重取**，不要提交。

### 网易易盾

- 常见类型：`slider`、`click-select`、`audio`、`risk-score`。
- 常见材料：`captchaId`、`validate`、`fp`、`acToken`。
- 注意点：指纹采集和行为采集可能影响可见题结果。

#### 推理拼图（`image-restore` / 乱序拼图）的提交参数

有可见题时，提交走 `https://c.dun.163.com/api/v3/check`，**用 JSONP（动态插 `<script>`）发 GET**，所以 XHR 断点抓不到，必须用「事件监听断点」或从调用堆栈反向找。

变动参数只有 4 个：`token`、`data`、`cb`、`callback`。

| 字段 | 构造 |
| --- | --- |
| `data.m` | `f( sample(traceData, 50).join(':') )` —— 路径**抽样 50 条**后用 `:` 拼接再加密 |
| `data.p` | `f( token, exchangePos.join(',') )` —— `[起点下标, 终点下标]`，**顺序不可颠倒** |
| `data.ext` | `f( token, 1 + ',' + pathList.length )` |
| `cb` | `f()`，内部每次调用都带随机数，所以**同一路径同一 token 每次结果都不同** |
| `callback` | `'__JSONP_' + Math.random().toString(36).slice(2,9) + '_' + <递增计数器 i，从 0 起>`（实测样本形如 `__JSONP_mvnvfob_6`；**后缀不是固定 `1`**） |

其中 `f` 是同一个路径加密函数，形如 `f(token, [x, y, dt] + '')`，`traceData` 每一项都是它算出来的。

三条实操注意点：

1. **提交点会不断变化的值要固化再读**。拖动结束处的 `data` 每次查看都不一样（内含随机数）。用 Fiddler/mitmproxy 把脚本下载下来做「响应替换」，把 `JSON.stringify` 单独提出来打印，才能看到真实的固定值。
2. **不要扣路径加密函数**。它是高度混淆的 `_0x` 嵌套调用，扣起来极慢。改成把内部函数**暴露成全局变量**（`window.win_0x1767c8 = _0x1767c8`）后直接调用，再配一份「录制好的路径库 + 随机微调」即可。
3. **GET 提交前要处理空格**。直接把对象拼成 query 会因链接含空格被判「链接检测错误」，必须照抄站点的 `encodeURIComponent` 拼装方式。

**还原侧**：推理拼图的题面是一张**真拼图**（块被彻底打乱，无 `order` 数组可读），
不是切片乱序，所以走**遗传算法**路线而非顺序还原 —— 二值化后"错误拼缝处边缘趋于直线且突变明显"
就是适应度判据。施工步骤见 `references/captcha-model-training.md` §七。

### 第三方行为验证（tuyacn 口径，智慧酒店类站点）

链路 `geeVerify → getQuestion → collectData`（**不是极验**，只是命名像）：

| 接口 | 关键产出 |
| --- | --- |
| `POST /api/v2/geeVerify` | `verifyId`、`challenge` |
| `POST https://captcha.tuyacn.com/verify/v1/getQuestion` | `bgUrl`、`sliceUrl`、`shuffle`、`publicKey`；`callback` 形如 `verify_<13位时间戳>` |
| `POST .../verify/v1/collectData` | `success: true/false` |

`shuffle` 是 **JSON 字符串**（要再 `json.loads` 一次），语义是 `source-to-target`
（`shuffle[i]` = 来源 `i` 的目标槽位），2 行 × N 列 —— 见
`references/tile-scramble-and-coordinate-mapping.md` §三。

**`collectData` 的打包格式（不常见，值得记）**：不是简单拼接，而是**类 TLV + CRC32**：

```text
[Ver 1B=1][Counts 1B][CRC32 4B]  +  payload
payload = 若干个 [Tag1=1][Length][Tag2][Data] 片段
  浏览器信息 6 段：userAgent / windowSize / url / isF12 / isHeadless / timestamp（Tag2 = 2）
  轨迹：按 ~252 字节预算分片，片段内以 '|' 连接 "x.00,y.00,t" 字符串，每片同样套 TLV
Length = DataLen + 3     # 1B Tag2 + 2B 头部开销
```

打包成字节后再加密：

- `collectData` = **AES-CTR + NoPadding**，密钥为 `getKey(16)` 生成的随机 16 位串，
  **IV 也是 `getKey(16)`**，密文 = `base64(iv + ciphertext)`（IV 前置拼接）。
- `key` = 同一把 AES 密钥经响应里的 `publicKey` 做 **RSA / PKCS1v15**（**不是 OAEP**）。

> 两个易错点：① `padding` 是 **nopadding**，不是 PKCS7；② RSA 填充是 PKCS1v15。
> `getKey(n)` 的字符池是 `0-9A-Z` 且**索引从 1 起**，所以**永远不会生成字符 `'0'`**。
> 轨迹字符串要 `f"{x:.2f},{y:.2f},{t}"`（两位小数），与 JS 的 `toFixed(2)` 对齐。

### 阿里云验证码

- 常见类型：`slider`、`image-restore`、`one-click`、`risk-score`。
- 常见材料：`appkey`、`scene`、`sessionId`、`sig`、`token`。
- 注意点：智能验证和风控模式可能没有可见题，优先做官方接入和服务端校验诊断。

### 顶象（dingxiang-captcha）

**链路（滑块，5.1.x 实测）**：

| 步骤 | 接口 | 产出 |
| --- | --- | --- |
| 1 | `c1` GET | `lid`（= `str(ms时间戳) + 32位随机串`，字符集 `0-9a-zA-Z`；其余参数固定） |
| 2 | `c1` POST（表单 `Param`） | `data` —— 即之后 v1 接口要用的 `c` 值 |
| 3 | `a` | `p1`(背景图) `p2`(滑块图) `sid` `y` |
| 4 | `v1` POST | `token`（最终目标） |

- `aid` 格式：`'dx-' + str(int(ms时间戳)) + '-' + str(random(10000000,99999999)) + '-3'`，
  **`a` 接口与 `v1` 接口的 `aid` 必须一致**。
- 两次 `c1` 用的是**同一个加密函数**，只是第二次参与加密的参数更多（所以 `Param` 更长）。
  先还原一次即可复用。
- 官网 demo 的 JS **每天动态更新两次**（早上 10 点、晚上 7 点，实际常延迟约 1 小时），
  且有两个 `index.js` —— 要分析的是带 `?_t=***` 的那个。练习请选第三方固定 JS 的站。

**背景图路径算法**：见 `references/tile-scramble-and-coordinate-mapping.md` §二（`En`/`_n`/`Cn` 三件套 + 派生顺序）。

**`ac` 参数（即 `ua`）**：生成逻辑在 `greenseer.js`（同样每天更新两次、同样混淆强度）。
`reload()` 初始化内部上下文 → `start()` 依次加密各字段，**所有方法最终都调 `app`**：

| 方法 | 内容 |
| --- | --- |
| `getTM` | 时间加密 |
| `getBR` | 系统 / 浏览器版本 |
| `getLO` | `document.referrer` + `location.href` |
| `getCF` | 随机数 |
| `getDI` | `window.top === window.self` 判断 + 窗口宽高 |
| `getEM` | 自动化特征检测（headless/F12） |
| `getJSV` | JS 版本号 |
| `getTK` | `sid` 加密 |
| `getSC` | `window.screen` |
| `bindDomEvents` | 轨迹采集与加密 |

`app` 把各段加密结果**追加到 `_ua` 后整体 `btoa`** 得到 `ac`。
`bindDomEvents` 之前先生成一个**短 `ua`**，之后才把轨迹追加进去。

**轨迹**：共三处（点击前的点击轨迹 / 出滑块前的移动轨迹 / 拖动轨迹），
**前两处不是强校验**，纯算可省略；拖动轨迹必做。
`recordSA` 取 `pageX/pageY` + 时间戳加密存入 `_sa`，`sendSA` 遍历 `_sa` 调 `app` 更新 `ua`，
`sendTemp` 传入 `xpath` + `x` 距离 + `y`（来自 `a` 接口）再做最后一段拼接。
**拖动距离有偏移计算**，不是裸距离 —— 见 `tile-scramble-and-coordinate-mapping.md` §4.1。

**识别**：缺口识别用 OpenCV / 任意 OCR，注意**图像缩放**；轨迹校验不严格，物理模型轨迹可用。
**反复二次验证 ⇒ 先查 IP，不是算法问题。**

> 本仓库 `dingxiang/` 案例（顶象滑块纯算）有完整复跑清单与 harness，改动前先读其 `README.md`。

## 海外 token/组件类

### reCAPTCHA

- v2 checkbox/invisible 多为 `token-widget` 或 `one-click`。
- v3/Enterprise score/action 归 `risk-score`。
- 注意点：服务端可能校验 hostname、action、score、session、IP。

### hCaptcha

- 常见 `token-widget`、`grid`、`audio`、语义图片题。
- 注意点：`rqdata`、`rqtoken` 和企业载荷可能影响平台任务。

### Cloudflare Turnstile

- 常见 `token-widget`、`one-click`、`risk-score`。
- 与 Cloudflare WAF challenge page 区分：`cf_clearance` 和 `/cdn-cgi/challenge-platform/` 是 WAF 流程。

### Arkose / FunCaptcha

- 常见 `game-challenge` 或组件初始化。
- 注意点：public key、surl、blob、会话绑定和 3D/小游戏状态。
- 开源方案通常只适合识别题面和状态，稳定验证常需要人工接管或授权平台对照。

## PoW 类

FriendlyCaptcha、ALTCHA、Private Captcha、Cap.js、mCaptcha 主要是 `pow-challenge`。

优先检查官方协议：

- challenge/payload 是否有效。
- difficulty、nonce、solution 是否匹配。
- TTL、防重放和服务端签名是否正确。

通常不需要打码平台；自有系统应先修复接入。

## WAF / Bot Management

Cloudflare WAF、AWS WAF、DataDome、Akamai、Imperva/Incapsula、PerimeterX/HUMAN、Kasada、Netacea、Radware、F5 都优先归 `waf-challenge`。

**先分清本技能管哪一半**（这是这一族最容易走错的地方）：

| 形态 | 归属 |
|---|---|
| 有图 / 有交互 / 需要人工成功样本基线（Turnstile 的 checkbox 交互、AWS WAF 的 `grid`、`px-captcha`） | **本技能** |
| 只要算出 clearance cookie 就能进站（无图、无交互） | `../../web-js-env-patcher/references/edge-waf-cookie-challenge.md`（判层与链路），可离线部分在 `../../web-reverse-algorithm/references/10-waf-clearance-cookie.md` |

**准入 Cookie 链不是验证码**：它没有图片、没有人工成功样本基线，走「图片还原 → 坐标换算 → 打码平台」
这条 Phase-2 流程必然空转。定族用 `node ../../web-js-env-patcher/scripts/classify_edge_challenge.js`。

优先诊断：

- 响应头、状态码、cookie 名。
- JS challenge 是否加载和执行。
- 浏览器 API、Canvas/WebGL/字体/Audio 等环境。
- TLS/HTTP 指纹、UA、IP、session 粘性。
- WAF 服务端日志和误伤样本。

不要把 WAF challenge 当成普通 OCR 题。

### 各家的设卡层（决定你该修哪一层）

| 厂商 | 设卡层 | 判据 / 特点 |
| --- | --- | --- |
| Cloudflare | CDN 边缘 + 全网画像 | JA3/JA4 + 头序 + IP 信誉 + 速率；Bot Score 1–99；Turnstile 单次 POST 可达 79 个参数 |
| Akamai | 浏览器内部 | `sensor.js`(~512KB) + 多请求评分；探测约 60 个 `chrome-extension://` URL（**太干净的浏览器反而像自动化**） |
| DataDome | 单站行为模型 | 每站一个模型；`datadome` cookie + WASM `boring_challenge`；**IP 信誉占总分 25%~30%** |
| HUMAN / PerimeterX | 跨站信誉网络 | **五向量统一评分**（TLS、IP、HTTP 头、JS 指纹、行为必须同时成立），只修一个点无效 |
| Kasada | 浏览器完整性 + PoW | 用 `Function.prototype.toString()` 查原生函数**是否被自动化框架改过**；封禁是静默 403/429 |
| F5 Shape | 自定义 VM + 短 token | 载荷轮换、token 分钟级有效；目标是「让你维护不起」 |
| Fastly | CDN 边缘 | 轻量 JS PoW，只在风险高时升级 |
| Anubis | 反向代理 PoW | 开源（Go），专治低成本 AI 抓取 |

一条**跨厂商的设计取舍**值得记住：Akamai 在这一版**明确降低了字体指纹与 Canvas 2D 的权重**，
理由是这两者受渲染栈影响大（同一台机器装个软件就可能漂移）——
**风控要的是「一致性」，不是「区分度」**。而指纹商（追求区分度）恰恰相反。
所以不要拿「通用指纹清单」直接套到风控上：**先看这家在采什么，再补什么**。

**共同结论**：核心是**对抗成本**，不是单点检测。别只修一个指纹就以为过了。

### 加速乐（jsl）：两趟 521 与「第一趟不是随机数」

- 三趟共用同一 Session：521（JSFuck 化表达式写 `__jsl_clearance_s`）→ 521（`go({...})` 再写一次，**同名覆盖**）→ 200。
- **第一趟的 cookie 不是随机数**：结构是 `<unix_ts>.<ms>|-1|<urlenc-base64>`，第二趟 `bts[0]` 同结构但 flag 为 `0`。
- 第二趟参数 `{bts, chars, ct, ha, is, tn, vt, wt}` 里 **`ha` 每次都可能换**（实测 md5 / sha1 / sha256），
  求解 = 用 `chars` 做双字符补位暴力匹配 `ct`（529/576 组）。
- **`bts[1]` 必须保持 URL 编码原样**（`%2F` / `%3D` 是哈希输入的一部分）。
- **反自动化在 `go()` 之前**：命中 `navigator.webdriver` / `window.callPhantom` / `_phantom` / `Headless` 等
  任一条就直接 `return`，不写 cookie ⇒ 表现为「算出来是对的但页面还是 521」。
- 可离线求解：`../../web-reverse-algorithm/scripts/waf_clearance_solver.py jsl-first` 与 `jsl`。

### 阿里 `acw_sc__v2`：两代同名不同算法

判据是**内联 JS 形态**，不是 cookie 值。

| | 旧版 | 新版 |
| --- | --- | --- |
| 核心 | `unsbox`（固定 40 元置换表）+ `hexXor`（固定 40 位 hex key） | 自定义 **LCG** 替换 `Math.random` + 魔改 `fill` + Fisher–Yates 式 hex 洗牌 + `ox` XOR 常量表（带固定偏移） |
| 判据 | 搜到 `unsbox` / `hexXor` | 搜 `unsbox` **零命中**；有 `PxjRjE` 式主函数 + 无限 debugger |
| 坑 | `arg1` 每次变，需从新响应体正则提取 | ① `Function.toString()` 内容参与计算 ⇒ **格式化 / 美化 JS 后提交必失败**（local 格式化会让源码偏移错位，表现为**死循环**而不是报错）；② `debugger` 字符串**不能删**（它参与 `indexOf('debugger')` 判断：删掉后 `indexOf` 变 -1、判断翻转，**流程能过但值过不了校验**；正确做法是**不改字符串**，用 DevTools「永不在此暂停」绕过，或把 `indexOf` 的实参也换成空串）；③ 末尾随机数的奇偶性由 `T` 表决定，而 `T` 表读 `navigator` ⇒ 从浏览器取常量 |

附注：`acw_sc__v2` 是**风控基础算法**，触发风控后该站会升级到滑块。实测口径：**`v2` 一个代理能采 5 页左右就会出 `v3`**；
换 IP 可继续采，但换了 IP 就要重算。

### Cloudflare：5s 盾五步链与 Turnstile 的工程量

**5s 盾（managed challenge）**：

1. 初始化页拿 `_cf_chl_opt`（`cRay` / `cHash` / `md` / `rayId` / `chlHeaderVal`）；
2. JS 发 `POST /h/g/fo/<A>:<B>:<C>/<cRay>/<cf-chl>` 提交遥测（**加密体**），响应是加密的 JS / 字节码；
3. 请求 `normal` HTML，再发第二次 POST（`chReq:"chl_api_m"` + `chlApi*`），返回十几万~二十几万字符的长串；
4. **环境校验**：校验点十几个~二十几个，**只有第一个固定，其余顺序随机**；
5. 通过后取 `sh/aw` 三参数 → 向初始化页 POST 四参数 → 得 `cf_clearance`。

**两个机械判据**（本族最有价值的两把尺子）：

- **响应体解密**：key 由 `_cf_chl_opt.rayId + "_0"` 逐字符累积 XOR 派生，再按
  `(byte - key - i%65535 + 65535) % 255` 还原。**解出串的 base64 字母表占比必须 = 1.000**，
  否则 rayId 取错（末位差 1 ≈ 0.79~0.84，全 0 ≈ 0.35，别的会话 ≈ 0.47）。
  **解密结果本身还是 base64**，要再解一层才是字节码；分支用 `startsWith("window._")` 判，不要看「像不像 base64」。
- **字符串表旋转**：脚本开头把字符串表旋转到满足一个**写死的数论恒等式**（本批 magic `608776`、基址 `458` ⇒ 旋转 `434`；
  另一 widget 基址 `239`、magic `520249`）。**旋转量/基址/magic 每版本都不同，必须现场枚举**。

**Turnstile 的工程量与坑**：

- 引擎同 5s 盾（字符串表 + 控制流平坦化 + 自定义字节码 VM + BigInt 模幂 PoW（1024 bit 模数，指数 65537）+ LZW 变种压缩的遥测）。
- widget 挂在 **closed shadow root**，`querySelectorAll` 查不到；要经隐藏 `input#cf-chl-widget-<id>_response`
  → `getRootNode().host` 反查宿主矩形。
- 普通 `.click()` 无效；有效路径是在复选框中心（`x+28, y+h/2`）构造完整 `MouseEvent` 序列。
  **CDP 驱动下原生 MouseEvent 的 `screenX/screenY` 与 `clientX/clientY` 不自洽**，需要
  `CDP-bug-MouseEvent-.screenX-.screenY-patcher` 一类补丁；**不要死循环重试，会被封 IP**。
- `/h/g/i/<cRay>/<ch>` 图片请求与 `/h/g/ci/...` **不发 100% 失败**；挑战 **120s 有效期**，长时间停在断点必然超时。
- iframe 消息是可靠进度信号：`init → requestExtraParams → food(心跳) → interactiveBegin → interactiveEnd → complete`。
- token 形态 `1.<base64url>.<22 字符站点标识>.<64 位 hex 校验>`（实测长度 837）；**一次性**，与 widget/ray 绑定，重放无效。

### Cloudflare Drop：可完全离线的时间锁 PoW

- `POST /client/v4/provisioning/previews/challenge` → `{challengeToken(JWT), seed(base64url), k, g, s}`。
- 求解：`state = SHA256(base64url_decode(seed))`；外层 `k` 次、内层 `g` 次**串行** `state = SHA256(state)`，
  每检查点存一份 → `base64(concat(checkpoints))`。实测 `k=1000`、`g=2000` ⇒ `2,002,000` 次 SHA-256（约 2s）；
  **`s=16` 未参与计算**。
- 设计要点：**检查点链可分段验证**；SHA-256 链天然串行，GPU / 多线程无法加速。
- 提交后得临时账户 `apiToken(cfat_*)` + `claimToken`；`cfwau_*` Assets JWT 是 Ed25519 签名，**只发给浏览器来源**，
  纯 API 请求拿到 HS256(aud:"ewc") 受限 token ⇒ 上传端点 401。绕法：把文件内联进 Worker 脚本走 Workers API（1MB 上限）。
- 求解器：`../../web-reverse-algorithm/scripts/waf_clearance_solver.py pow-drop`。

### F5 Shape / Reese84：动态路径 + 22 个采集函数

- 动态路径 JS，**路径每几小时轮换**（实测只有 3 条在轮换）。关键字
  `y-Almost-yet-know-Now-Son-ther-That-swearers-of-` / `pplacked-bothe-right-eque-mine-in-him-aftend-Thi`。
- 两条路线：**动态链接**（1 GET + 2 POST，第 2 次 POST 的 `p` 是核心参数）与**固定链接**（1 GET + 1 POST，
  载荷就是已拿到的 token，`old_token` 为空也行）——固定链接**替换 JS 更方便、少一次 POST**。
- 加密结构：创建**隐藏 iframe**，`load` 后向数组 push **22 个函数**，最后遍历执行把结果存进 `nt`，`p = 加密(nt)`。
  22 个函数覆盖：`document.addEventListener`、`OfflineAudioContext`、`__selenium_evaluate`、随机串、
  `navigator`/`screen` + **4 个 canvas**（后续几个函数按**顺序**取用）、`WebAssembly`、
  **WebGL 扩展列表与着色器数值** + 2 个 canvas、canvas hash、
  以及最大的第 15 个（`createEvent` 主动报错、`ontouchstart`、`video/audio`、`chrome`、`history.length`、
  `PERSISTENT/TEMPORARY`、`PerformanceObserver`、canvas 2D、`documentElement/head/body.children` 等）、
  原型链 `Function.prototype.toString/call/apply/bind`、`performance.now()` + `Object.getPrototypeOf`。
- 两个必踩的坑：① 替换本地 JS 后要**改脚本里写死的请求路径**为当前时段的动态路径；
  ② `reese84interrogatorconstructor` 里的 `this["st"] = Math.floor(Date.now()/1000)` 会被**校验超时**，
  调试卡住先改它。动态链接断点断不住时，在 JS 文件**第一行加一行 `debugger;`** 最快。
- token 落点因站而异：cookie `reese84` 或请求头 `X-D-Token`。

### Akamai Bot Manager 的三层结构

Akamai 的难点不在 JS，而在**它同时校验三层**，任何一层不过都会返回「成功但被标记」的响应——这是最容易误判的地方。

| 层 | 内容 | 失败症状 |
| --- | --- | --- |
| 1. TLS/HTTP 指纹 | JA3、header 顺序、HTTP/2 帧序 | 响应正常返回，但携带 `*_bm=Unknown Bot (...)` cookie |
| 2. 环境指纹（JS） | `sensor_data`（含 WebGL、字体、`navigator`、声音组件等） | `*_bm=Unknown Bot (...):slow::JavaScript Fingerprint Not Received (BETA)` |
| 3. Cookie 状态机 | `_abck` / `bm_sz` 等 | 无验证的 cookie 提交后接口返回 `You don't have permission to access...` |

必须建立的判断习惯：**只要响应头里出现带 `Unknown Bot` 的 `*_bm` cookie，这次请求就已经被标记了**，即使业务接口看起来成功（登录成功、页面正常），后续的写操作（加购、下单）也一定会失败。不要把「能登录」当成「过了」。

诊断顺序（从低成本到高成本）：

1. 先比对**浏览器与本地请求的响应差异**：Akamai 会在通过检测的响应里注入一段形如
   `<script>bazadebezolkohpepadr="355903178"</script><script src="/akam/13/1536a743" defer></script>`
   的脚本。**本地请求没有这段** ⇒ 环境或指纹未过，不要在 JS 上继续折腾。
2. 其次查 TLS/HTTP 指纹：用 `ja3er.com` 一类服务对比本地与浏览器的 JA3。普通 `requests` / Node `http` 一定不同。可用方案：`curl-impersonate`（及其 Win 版编译）、`node-libcurl` 绑定替换版。
3. 最后才做 `sensor_data` 的 JS 逆向。

`sensor_data` 侧的要点：

- 页面首屏返回一段形如 `<script src="/RiyQJ/Gbek/k6cy/do/h9Bat/iw3rGrXz/ejRAYyE8BQU/eCteLm16/SD0">` 的脚本，**该路径第一次 GET 拿 JS，之后 POST 提交数据到同一路径**。
- **本地调试时必须保持这个路径格式一致**，脚本里有路径格式校验。
- POST 触发时机随版本不同：IHG 只在初始加载时提交且拿到有效 `_abck` 后就不再触发；TI 每次点击都触发，且 `sensor_data` 有额外加密、多一个 `bm_sz` cookie。
- 脚本内部对**关键函数做 hash 校验**，改过的代码会走错误分支 ⇒ 本地调试需跳过该校验。
- `sensor_data` 解密后的头部形如 `7a74G7m23Vrp0o5c9231281.75`：前缀固定、中间与时间相关、**尾部是版本号**。

**环境指纹的 VM 版（jsz / jzz）与 `dvc` 段**：

- 新版把环境指纹也塞进了一个小 VM：断在 `wPz` 生成处 → 追 `jsz` → 里面 `VQ()[AJ(xg)](FCz, lE, SL) === 'dvc'`，
  值形如 `"a3iea3adfa3eeYe2yi2a"`，尾部是一串用 `concat` 与 `,` 拼出来的字段序（如 `l+h+f+b+i+j+k+a+c+g+e+d+`）。
  ⇒ **`dvc` 是「按固定字段序拼接后的 hash」**，字段序本身写死在代码里，是**跨版本较稳定**的部分。
- 该 VM 的入口入参实测形如 `[2, '16|24', 0, 0]`；第 4 个值用到 `[..."214|160"].map(c => c.charCodeAt())`，
  而 `214` / `160` 来自入口入参前几项的拼接。
- **可复用的一段**（文章明确给了完整代码，第一个值的生成）：

  ```js
  const first = "0" + startTs.toString() + UA.slice(-32) + "0";
  let r = 5381;
  for (let i = 0; i < first.length; i++) r = (r * 33) ^ first.charCodeAt(i);
  r = r >>> 0;          // djb2 的 XOR 变体
  ```

  **口径提醒（诚实标注）**：这是**算法形态**（`h = 5381; h = (h*33) ^ c`，无符号右移归零）可复现；
  但文章里给出的 `startTs` 与记录值 `2482411364` **对不上**——`startTs` 是**会话相关的时间戳**，
  文章放的是示意值。⇒ **要用它就必须在自己的会话里同时拿到 `startTs` 与结果做一次对拍**，
  不要拿文章那个记录值当 oracle。

**有效性判据与触发时机**：

- `_abck` 里的 **`~-1~` 变成 `~0~`** 才算有效。
- 首次页面加载后由**三次触发**产生三次 `sensor_data` 提交：首屏自执行函数、`setTimeout(..., 500)`、`setTimeout(..., 1000)`。
  简单档站点**第 1 次返回的 cookie 就有效**；难档可能要第 3 次，甚至要等特定事件触发（点击）后才有有效值。
- `sensor_data` 可以在 `XMLHttpRequest.prototype.send` 处截获。

**环境数组（可复用的结构常量）**：提交体主体是「负数 tag 与值交替」的数组。
**完整下标对照表以 `../../web-js-env-patcher/references/edge-waf-cookie-challenge.md §2.4` 为唯一权威源**（本文只列要点）：

| 数组下标 | 元素 | 说明 |
| --- | --- | --- |
| 0 | `-100` | 原文注释「固定值」 |
| 1 | `Mozilla/5.0 …,uaend,…,cpen:0,i1:0,…,x12:1,…,loc:` | **UA + window 属性 + 自动化工具 + Screen 的合并串**（最长、最需要逐字段对齐） |
| 2 / 3 | `-105` / `0,0,0,0,-1,888,0;0,-1,0,0,-1,-1,0;` | 下标 3 原文注释「检测页面 input 标签的一些属性」 |
| 6 / 7 | `-101` / `do_en,dm_en,t_en` | — |
| 15 | `0,0,0,0,-1,888,0;…` | 与下标 3 同值（input 属性另一组） |
| 22 / 23 | `-106` / `0,0` | — |
| 25 | `1,32,32,…,<含 `_abck` 的 cookie 快照>,…` | 原文注释「这里取了 cookie，因此第 1 次请求前要先 GET 一次页面」⇒ **第一次 POST 之前必须先 GET 一次页面拿 cookie** |
| 26 / 27 | `-112` / 页面 URL | — |
| 30 / 31 | `-122` / `0,0,0,0,1,0,0` | 下标 31 原文注释「检测了一堆东西，如 XPathResult」 |
| 8–21、38–57 | 多为 `""` / 逗号占位 / `8` / `94` / base64 串 | 其余 tag 多为空串或短常量占位 |

⚠️ **tag 与值的配对方向原文没明说，动手前必须在 `XMLHttpRequest.prototype.send` 处 dump 一次真实数组**，
不要照抄任何二手对照表。数组长度与元素个数**每站每版本都可能不同**，不要按固定下标伪造。

**下标 1 的内部格式**：`<UA>,uaend,<appVersion 数字>,<appVersion 日期>,<语言>,Gecko,5,0,0,0,<随机>,0,<screen.width>,<availHeight>,<screen.height>,<availWidth>,<innerWidth>,<innerHeight>,<outerWidth>,,cpen:0,i1:0,dm:0,cwen:0,non:1,opc:0,fc:0,sc:0,wrc:1,isc:0,vib:1,bat:1,x11:0,x12:1,<随机>,<随机>,<timeOrigin>,0,0,loc:`

**定位技巧（比读代码快）**：环境数组里的某个值 → 在混淆代码里 search 该**字面量** → 落到一堆 `switch/case`
→ 在**每个 `return` 处下断点** → 命中即知是哪个分支 → 再进 `UJ.apply(undefined, tJ)` 看具体检测。

**最新版的采集路线（按需对齐，不是「都补一遍」）**：

| 采集点 | 特点 | 对不上的后果 |
| --- | --- | --- |
| UA-CH 高熵 | `navigator.userAgentData.getHighEntropyValues([brands,mobile,architecture,bitness,model,platform,platformVersion,uaFullVersion,fullVersionList])`，**异步 Promise，一次 9 项** | 改了同步 `navigator.userAgent` 却没处理这个异步接口 ⇒ 两边对不上，直接暴露 |
| WebGL | **同一份 UNMASKED_VENDOR/RENDERER 采三次**：主线程 canvas / `OffscreenCanvas` / **Blob + Worker 里再采一次** | 只 hook 主线程 `getParameter` 必然翻车（Worker 是干净环境） |
| WebAudio | `OfflineAudioContext(1, 44100, 44100)` + `Oscillator(triangle, 10000Hz)` + `DynamicsCompressor`，**与公开资料一字不差** | 难点不在参数，在于**伪造结果要与 GPU/UA/平台自洽** |
| plugins | **校验对象图完整性**，不是「看你装了什么」：枚举插件比对、自引用一致性 `plugins[0][0].enabledPlugin === plugins[0]`、改写 `plugins.refresh` 埋探针 | 只补 `length` 和名字 ⇒ 三层互相指向缺失，一眼假 |
| webdriver | 几十位的**自动化特征掩码**（`__nightmare`、`cdc_*`、`__playwright__binding__`、`__selenium_*` 一位一个）+ **原型链完整性校验**（`Navigator.prototype` 上的描述符、`[native code]`、getter 的 `hasOwnProperty` 分布） | `defineProperty(navigator,'webdriver',...)` 挂在**实例**上，与原生「定义在 `Navigator.prototype` 且 getter 是 native」形态不同 ⇒ 描述符检查一眼看出 |
| 品牌特征位 | 存在即打标，每项一个 bit：`window.InstallTrigger`(FF)、`window.chrome`/`chrome.webstore`(Chrome)、`window.opera`、`window.ActiveXObject`(IE)、`window.callPhantom`、`window.mozInnerScreenY`、`navigator.getBattery`、`navigator.vibrate` | bit 与 UA 声明的品牌不一致 |
| `RTCPeerConnection` | **存在即打标**：只做 `typeof RTCPeerConnection`，**不调用、不建连** | — |
| 第 2 次请求 | 不同 `fontSize`×`fontFamily` 的 `offsetHeight`/`offsetWidth` 字典；`Object.keys(iframe.contentWindow)` → `JSON.stringify` → 加密 + 数组长度 | — |
| 第 3 次请求 | 约 40 项 CSS 属性取值 | — |

**两条与主流认知相反的反向结论**（不要照抄通用指纹清单）：

- **字体指纹权重很低**：这一版没有出现典型的 `offsetWidth` 枚举式字体检测。
- **Canvas 2D 不是主力**：`toDataURL` 式经典 canvas 指纹权重低，算力都花在 WebGL 和 Audio 上。

原因：字体与 canvas 2D 受渲染栈影响大（同机装个软件就漂移），**风控要一致性，不要区分度**。

**TLS 侧**：`curl_cffi` 的 `impersonate` 必须与 JS 里的 UA / `appVersion` **一致**（实测 `chrome101` 对 `Chrome/101`）。

> 环境采集（段号数组逐字段对齐、WebGL/Audio/plugins/webdriver 掩码）属于补环境线：
> 判层与链路读 `../../web-js-env-patcher/references/edge-waf-cookie-challenge.md §2.4`，
> 实现与门禁回 `../../web-js-env-patcher/SKILL.md`；本节只负责厂商识别与执行顺序。

## 活体/人脸

`biometric-liveness` 只做识别、官方 SDK 接入检查、人工审核、可访问性替代和隐私合规建议。不要生成绕过、伪造或替身方案。
