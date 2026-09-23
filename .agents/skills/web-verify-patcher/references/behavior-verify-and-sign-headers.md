# 无感 / 行为验证的请求链、签名头与正确率四因素

> **来源**：`52pojie-1978737` + `52pojie-1982617`（某云无感滑块上/下，**双源同一目标**）、
> `52pojie-1697353`（快手滑块）、`52pojie-1745678`（抖音 `s_v_web_id`）、
> `52pojie-1857712`（百某网数字九宫格，cookie 状态机）、`52pojie-1872638`（备案查询 汉字点选 + jsl）、
> `52pojie-2088578`（某雷云盘 `ck0.` 无感 token）、`52pojie-1606904`（captcha 机器人检测原理）。
>
> 本文件只收**"提交参数/交互链路"层**的事实；图像识别与坐标换算走
> `references/motion-and-coordinate.md` / `references/captcha-model-training.md`，
> 滑块厂商对照表走 `references/slider-vendor-matrix.md`。

## 1. 先分级：无感 < 滑块 < 点选（`1882302` 实测）

同一个厂商（易盾）的三种形态，**防御等级并不相同**：

| 形态 | 特征 | 实测结论 |
| --- | --- | --- |
| 无感 / 无痕 | **不发 `d` 包与 `b` 包** | 防御等级最低；"随手过" |
| 滑块 | 发 `d` 包 | 中等 |
| 点选 | 同上 + 更严的环境/时间校验 | 最高；**正确率掉到 ~10% 是常见现象** |

**"能过无感"≠"能过点选"** —— 拿无感的代码直接套点选站，症状是"算法没错、通过率极低"。

## 2. 阿里云验证码 2.0：四请求链 + 表单签名 + deviceconfig（**双源**）

抓包会看到**四次请求**：拖动前两次、拖动后两次。原文只细究了 1/2/4。

### 2.1 请求 1：`Action=InitCaptchaV2`

表单字段（原样）：

```
AccessKeyId / SignatureMethod=HMAC-SHA1 / SignatureVersion=1.0 / Format=JSON
Timestamp=2024-11-05T10:33:31Z / Version=2023-03-05 / Action=InitCaptchaV2
SceneId=19x5u7lo / Language=cn / Mode=embed
UserUserId=… / UserId=… / UserCertifyId=… / DeviceData=…
SignatureNonce=<uuid> / Signature=<base64>
```

**需要逆向的只有两个**：`SignatureNonce`、`Signature`；其余主要是固定值或**起始页返回**。

定位坑（原文实打实踩过）：
* 搜 `SignatureNonce` / `Signature` 会命中 `feilin*.js`，**但该站同时存在 6–8 个版本**，
  功能相同、断点却可能落在**不执行的那一份**上（表现为"断点被跳过"）；
* `Signature` 的真正生成点在 **`AliyunCaptcha.js`**；
* **可复用的判据**：表单里写了 `SignatureMethod: HMAC-SHA1` ⇒ 直接搜 **`SHA1`** 命中生成函数，
  再在 `_createHelper` 下断；堆栈里能看到基础数据**用 `#` 连接**（"搜特征串"的通用套路）。

### 2.2 请求 2：`Action=Log2`

```
Version=2020-10-15        ← 与请求 1 的 2023-03-05 不同，抄错就失败
Data=<长 base64> / SignatureNonce / Signature
```

* `Data` = **两重 AES-CBC + 一次 base64**；
* 里面还嵌了 `deviceconfig`（同样是 **AES-CBC 的输出再 base64**，直接解是乱码）；
* **关键链条**：`deviceconfig` 来自**请求 1 的响应**，而解它的 `key/iv` 在 **`AliyunCaptcha.js`** 里。
  ⇒ 不先解 `deviceconfig` 就凑不出 `Data`。

### 2.3 请求 4：`Action=VerifyCaptchaV2`

```
CertifyId / SceneId / CaptchaVerifyParam = {
   "sceneId", "certifyId", "deviceToken", "data"      // data = 轨迹的加密结果
}
```

* `data` 的明文是下面这个 **TrackList 对象**（原文实测结构）：

```json
{
  "TrackList": {
    "mc": "597,308,15083, ,1",
    "tc": "", "mu": "", "te": "",
    "mp": "x,y,t,1|x,y,t,1|…",
    "tmv": "",
    "mm": "x,y,t,1|…",
    "ks": "", "fi": "",
    "startTime": 1731508021832,
    "si": "1393,3440,1271,1393,1271,1392,1440,154.55950543806017,3440"
  },
  "TrackStartTime": 1731508021832,
  "VerifyTime": 1731508037064,
  "arg": "ak0haTIeEhFPZD69TgF/NhZ+Qn2WFvAlZZ8OCRkY"
}
```

* **判据（怎么知道不是普通 AES-HMAC 路线）**：断点处出现 **`TextEncoder` / `Uint8Array`** ⇒
  轨迹是"对象 → 数组 → 二进制 → 拼装"后才进 AES；
* **扣代码要整块扣**：那段代码里有 `prototype` ⇒ 只扣一段会掉进"补环境地狱"；
* `si` 字段**语义未明**（原文只给了一个观测值）⇒ 本仓库按**透传字符串**处理，**不允许臆造公式**；
* 容器编解码用 `scripts/trajectory_codec.py`：

```bash
S=.agents/skills/web-verify-patcher/scripts
python $S/trajectory_codec.py identify --value "<抓到的 mp 串>"
python $S/trajectory_codec.py decode --format aliyun-tracklist --value "<mp 串>"
```

### 2.4 时效性（上/下两篇的对照）

同一目标两次会话：`AccessKeyId` 相同，但 `CertifyId` / `deviceToken` / `SignatureNonce`
**每次都是新的** ⇒ 这类链路**必须一次执行到底**（取 challenge → 出轨迹 → 立刻提交），
不能"上午抓的参数下午用"。

## 3. 快手滑块：`verifyParam` 与轨迹容器（`1697353`）

* 校验接口：`https://captcha.zt.kuaishou.com/rest/zt/captcha/sliding/kSecretApiVerify`
* 主参数 `verifyParam`，其中 `c` 是**加密后的轨迹串**（另有指纹 hash）；
* 轨迹容器（原文扣出的生成逻辑）：

```js
let r = t.trajectory[0] ? t.trajectory[0][2] : 0
let c = t.trajectory.slice(-100).reduce(function (n, t) {
  return n + ',' + t[0] + '|' + t[1] + '|' + (t[2] - r)
}, '')
// 提交的是 c.slice(1)
```

* 轨迹点结构 = `[x, y, 时间戳]`；`Δt` 相对**整条轨迹的起点**（不是相邻点差）；
* **断点位置的判据**：行 6374 时 `c` 还是 `undefined`，F8 到 6394 才算出来 ⇒
  "**值不在第一次断下的那一层生成**"，别在 `undefined` 处执着。
* 编解码与对拍：

```bash
python $S/trajectory_codec.py encode --format kuaishou-comma --points points.json
python $S/trajectory_codec.py decode --format kuaishou-comma --value "<抓到的 c>" --t0 <首点时间戳>
```

## 4. 抖音 `s_v_web_id`：能自造，但**用途决定可行性**（`1745678`）

* 作用：网页端过完滑块后的 `s_v_web_id` **可以免掉 `signature` 验证**；
* 来源：**验证码中间页 HTML 里的 `fp` 参数**就是它（从页面取即可，不必算）；
* 可本地生成的形态（原文 JS）：

```js
function create_s_v_web_id() {
  var e = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split(""),
      t = e.length, n = (new Date).getTime().toString(36), r = [];
  r[8] = r[13] = r[18] = r[23] = "_"; r[14] = "4";
  for (var o, i = 0; i < 36; i++)
    r[i] || (o = 0 | Math.random() * t, r[i] = e[19 == i ? 3 & o | 8 : o]);
  return "verify_" + n + "_" + r.join("");
}
```

⇒ 形态 = `verify_<base36 毫秒时间戳>_<36 位 UUID v4 变体>`（第 8/13/18/23 位固定 `_`，第 14 位固定 `4`）。

**⚠️ 用途边界（原文明确）**：这样生成的只能用于一部分场景，**采集评论所需的 `s_v_web_id`
必须从页面取下来再过滑块** —— 同一个参数，**不同接口的可复现性不同**。

**两个实测坑**：
* 下载验证码图片报"当前网络不稳定，请稍后再试" ⇒ 请求参数里补 **`"app_name": ""`**；
* 轨迹校验在 2023 年元旦后收紧（`xb` + 轨迹），**selenium 基本过不了**；
  原文改用"手动采集轨迹"，通过率约 90% —— 再次印证 §1 的"点选/滑块 > 无感"分级。

## 5. 九宫格数字类：cookie 状态机比算法更难（`1857712`）

第一次访问主页 **307**（不是 200）是正常流程，链路是**带 cookie 的状态机**：

| 步 | 请求 | 关键产物 |
| --- | --- | --- |
| 1 | 主页 `s9verify_html` | Set-Cookie `_trackId`（必需）、`__city`（可选） |
| 2 | `bf.js` | **必须真实请求一遍**（否则后面一直 307），它负责给后续 `s.webp` 的参数加密 |
| 3 | 第一次 `s.webp`（GET，带 `cf`/`s`/`f`） | Set-Cookie `c0fc…`、`c1fc…`、`bxf`（均由 JS 生成） |
| 4 | 第二次 `s.webp`（同参数） | 返回 `sbxf`（值与 `bxf` 相同）⇒ **cookie 被激活** |
| 5 | 再请求主页 | 才是验证码页（HTML 内联一段长 JS，含图片 URL 与要点的数字） |

参数生成（`s` / `f`，原文硬看 `bf.js` 得出）：

```js
var cb = MD5(baseImg)                       // baseImg = canvas 画出的图（同设备固定）
var cc = cb.substring(0,8), cd = cb.substring(8,16),
    ce = cb.substring(16,24), cf = cb.substring(24,32),
    cg = cc + 1 + cd + 1 + ce + 1 + cf;      // 35 位，"1" 来自恒为 true 的三目判断
s = MD5("fc276cce08ba22dc" + cg);           // 第二次请求把该固定串换成"第一次响应的新 base64 的 MD5"
f = cg;
```

**四条可直接复用的结论**：
1. `canvas` 那步**不必补环境**：同设备同浏览器绘制结果固定 ⇒ 取一次值写死即可（原文原话）；
2. 三目判断恒 true 时**直接用 `1` 拼接**，不必跟进去看判断条件；
3. **"值对但仍不成功"的两个独立来源**：cookie 状态机不完整 + 点击坐标本身的坑；
4. **header 只加 `Referer` 与 `User-Agent`** —— 原文明确"多一个 `Host` 都可能导致后续请求不成功"。

**判据**：如果你"请求主页直接就是 200 + 验证码"，说明你**不是冷启动**；
先清 cookie 再按 1→5 重跑一遍，否则拿不到那三个 JS 生成的 cookie。

## 6. 点选 + jsl 521：验证码只负责"给一个 header"（`1872638`）

整条业务链（备案查询站）：

```
521 (jsl challenge)                  → 得到 jsl cookie
  ↓
/auth            {authKey=MD5(时间戳+盐), timeStamp}          → 返回 token（后续 header 用）
  ↓
/getCheckImagePoint {clientUid}                              → bigImage/smallImage/secretKey/uuid/wordCount
  ↓
/checkImage      {clientUid, pointJson, secretKey, token}    → 通过后返回多一个 sign 字段
  ↓
/queryByCondition                                            → 需要 4 个正确 header
```

* 业务接口的**四个 header 缺一不可**：`Cookie`（jsl 生成）、`Sign`（点选通过后返回）、
  `Token`（`/auth` 返回）、`Uuid`（验证码加载时的 `uuid`）；
  ⇒ **"过了验证码"只是拿到 `sign`**，不等于业务接口能通（与 `1882302` 的"过了一层不算过"同型）；
* `pointJson` 是坐标密文，`secretKey` 由加载接口下发（**同一轮的密钥，不可跨轮复用**）；
* **定位技巧**：`clientUid`（设备 id）搜不到生成点就搜 **`localStorage.getItem`** ——
  它常是"生成后写本地缓存"的模式（原文即此法命中）。

## 6.1 第二例：验证结果要**映射成业务参数**（`1634219`，阿里滑块）

同一个模式在另一个站复现（阿里滑块 + 短信登录）：

| 业务请求参数 | 来自 |
| --- | --- |
| `session_id` | 滑块成功后接口返回的 **`csessionid`** |
| `sig` | 滑块成功后接口返回的 **`value`** |
| `token` | 该请求自身的 **`token` 字段** |

⇒ 结论：**"过滑块"的产物不是"一个通过状态"，而是一组要拼进后续请求的字段**，
字段名在两边**往往不同**（`csessionid`→`session_id`、`value`→`sig`），
所以排查"验证通过但登录失败"时，第一步是**逐字段对表**，而不是怀疑验证码没通过。

同源还有一条**与算法无关但极高频的坑**：该站的自动化检测直接来自
**pyppeteer 启动参数 `--enable-automation`** —— 在 `launcher` 源码里把它注释掉就过了。
即"**被检测到自动化"有时是驱动层的显式标识，不是 JS 层的指纹**（先查这层，再补环境）。

## 6.2 站点自研滑块的 `g` / `s` 双接口形态（`1903272`，某东登录）

**站点自研**（不是厂商 SDK）的常见形态是「一个取参数、一个做校验」两个接口：

| 接口 | 作用 | 要点 |
| --- | --- | --- |
| `g`（或 `get`） | 取图片 + 下发参数 | 多数字段可写死（`appId` / `scene` / `product` / `lang`）；`callback` 的随机数算法**也可以写死**（原文实测）；真正要跟的是 `e` / `j` 两个字段（跟进去会进到 VM 里） |
| `s`（或 `check`） | 校验 | `c` 基本对应 `challenge`；**重点是 `d`**（轨迹/行为数据） |

**同站三种形态并存**：登录滑块、`cfe` 链接里的滑块、`cfe` 链接里的点选 ——
**同一个站的不同入口可能用不同验证码**，不要假设「一个站的验证码只有一套」。
另有两点风险提示（原文口径）：**旋转验证码一旦触发基本等于高风险标记**
（原文写作「触发就离毁号不远」），**手势验证码只出现在固定接口**。

> **定位口径**：`g` 里能写死的字段就别去逆（`callback` 随机数、`appId`、`scene`）；
> 把时间花在 `e`/`j`/`d` 这类**真正参与校验**的字段上 —— 这是站点自研族的通用取舍。

## 7. `ck0.` 无感 token：只登记结构，不登记公式（`2088578`）

请求头里的 `x-captcha-token` 形态：

```
ck0.<Part1>.<Part2>
  Part1 = base64url（注意用 - 与 _，不是 + 与 /）的加密数据
  Part2 = 解码后疑似 protobuf：client_id / version("1.92.33") / domain("pan.xunlei.com") /
          device_id / signature(二进制)
```

配套头：`x-device-id`、`x-client-id`（`Authorization: Bearer …` 原文隐藏）。

**⚠️ 口径声明**：原文对"生成原理"给的是**推测**（"根据结构推测"），只有**结构是观测事实**。
本仓库因此**只登记结构与判据**：
* 这类目标是 `risk-score`（无感）型：**无图、无交互** ⇒ 先判"能否沿用现成 token / 是否需要设备一致"，
  而不是上手破解；
* 真要复现，走浏览器侧 hook 生成点（见 `../../web-reverse-hook/SKILL.md`），
  不要试图硬解 `Part1`。

## 8. "本地通过"不等于"服务端认可"（`1606904`）

一个未混淆的 `captcha.js` 里，提交时会检查：

```js
// options.onSuccess 在 e.verified 与 e.spliced 均为真时触发；e 来自 n.verify()
```

`verified` 的判定方式**可配置**：既可**本地校验**，也可**把鼠标轨迹发给服务器校验**；
该站用的是本地校验。⇒ 结论：**看到 `verified = true` 只能说明"这一层过了"**，
服务端是否认可要看业务接口的返回（这与"过了一层 WAF 又失败在自研风控"是同一类坑）。

## 9. 正确率四因素（`1882302`，点选尤其明显）

| # | 因素 | 实测口径 |
| --- | --- | --- |
| 1 | **请求头完整性** | `Accept` / `Accept-Language` / `Cache-Control` / `Connection` 等"平时懒得加"的头在这里是**重要变量** |
| 2 | **`callback` 随机范围** | 随机范围**不能大于 10**（原文为此排错好几天） |
| 3 | **`fp` 必须与站点域名对应** | 滑块写死域名仍有 ~80%+；**点选写死且站点不对 = 0–10%** |
| 4 | **发送间隔（时间校验）** | 轨迹耗时 1s 就别在 0.1s 后提交；点选会做时间一致性校验 |

补充（同源）：点选对**轨迹形状本身**校验其实很松（直线也能过，贝塞尔也可以），
所以**上面四条没达标时，换什么轨迹都没用**；`d` 包发了能提高正确率，
`b` 包不发没有观察到明显影响。

## 10. 坑表

| # | 坑 | 判据 / 处置 |
| --- | --- | --- |
| 1 | 拿无感的过法套点选站 | 分级：无感 < 滑块 < 点选（§1） |
| 2 | 断点落在不执行的 `feilin*.js` 副本上 | 同站多版本脚本；改在 `AliyunCaptcha.js` 下断 |
| 3 | 两次请求的 `Version` 抄成同一个 | `InitCaptchaV2`=2023-03-05 / `Log2`=2020-10-15（§2.2） |
| 4 | 不解 `deviceconfig` 就想拼 `Data` | key/iv 在其 JS 里，`deviceconfig` 来自请求 1 的响应 |
| 5 | 只扣轨迹加密的"一段" | 代码里有 `prototype` ⇒ 整块扣，否则补环境地狱 |
| 6 | 给 `si` 之类未明字段编公式 | **未明就是未明**，透传（本仓库口径） |
| 7 | 用自造 `s_v_web_id` 去采评论 | 评论必须用页面那份（§4） |
| 8 | 抓完参数慢慢调 | 这类链路多为**一次性**，要"取一次马上用"（§2.4） |
| 9 | 冷启动没做 | 九宫格类必须清 cookie 走完整 1→5 步（§5） |
| 10 | header 加太多 | 该站只认 `Referer`+`User-Agent`，多一个 `Host` 都可能失败（§5） |
| 11 | 过了验证码就以为业务能通 | `sign`/`token`/`uuid`/`cookie` 四件套缺一不可（§6） |
| 12 | 把"结构观测"当"生成公式" | 只有结构是事实时，只登记结构（§7） |
| 13 | 本地 `verified=true` 就当通过 | 可能还有服务端复核（§8） |
| 14 | 纠结轨迹形状 | 先查四因素（请求头/callback/fp/发送间隔），再谈轨迹 |

## 11. 反例（不要做）

* ❌ 不要用同一套参数套路跨厂商/跨形态平移（**同一厂商不同形态的防御等级都不一样**）。
* ❌ 不要"看到一个长串就猜 base64/AES"：`TextEncoder + Uint8Array` 出现时，
  先怀疑"二进制序列化"，不是加密算法（§2.3）。
* ❌ 不要为"能自造的参数"高兴太早 —— 先确认**该接口**是否接受自造值（§4）。
* ❌ 不要把未验证的推测写进脚本（`ck0.` 的生成公式就是例子）：**先取一次真值当 oracle**。
* ❌ 不要在冷启动缺 cookie 的状态下 debug 参数生成（九宫格类会把 307 当成"失败"）。
