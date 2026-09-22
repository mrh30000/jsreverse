# 厂商 key 方案与接口配方（B / C / D 层落地版）

本文件是 `hls-and-ts-structure.md` §4「key / IV 的四类来源」的**落地版**。
那个文件回答「key 属于哪一类」，本文件回答「**具体厂商/站点长什么样、先试哪一招**」。

**使用顺序**：先跑 `scripts/m3u8_probe.py` 判层 → 判为 B / C / D 层 → 来本文件 §3 判据表对号入座 →
命中则直接抄 §2 的配方；没命中再回去读 JS。

> **不要跳过判据表去读 JS。** 本文件里 13 个配方覆盖了实测中绝大多数「JS 层加密的媒体 key」，
> 命中即省 1~2 天；未命中时判据表也给出了「先量什么」的路线。

---

## 1. 通用三问：5 分钟定方案

任何「key / 参数解不开」的场景，先量三件事，再决定读不读 JS：

| 问题 | 怎么量 | 得到的结论 |
| --- | --- | --- |
| **① 密文的字符集与长度** | 长度是否 16 的整数倍？全 hex？全 base64？含 `()`/`-_` 等非标字符？ | 分组密码 / 摘要 / **自定义 base64 变体** |
| **② 响应里是否同时给了 key 与 iv** | 一次响应 JSON 里有没有 `aes_key`/`aes_iv`/`key`/`iv` 之类字段 | 「**响应自带密钥**」形态 ⇒ 不需要逆任何算法 |
| **③ 参数末尾是否「多出一截」** | 尾部是不是既有密文又有「不像密文」的短串 | 「**自描述密文**」（尾部携带二次密钥 / 长度字段） |

**长度 → 算法反查表**（hex 口径，1 字节 = 2 字符）：

| 长度 | 候选 | 备注 |
| --- | --- | --- |
| 32 hex | MD5 / 16 字节分组密钥 | 也可能是 AES 的 key 本身 |
| 64 hex | SHA-256 / 32 字节 | 参数里出现 64 hex，**第一个假设就是 SHA-256** |
| 16 的整数倍 + 末尾有填充块 | AES / SM4 分组密文 | 多出的整块是 `0x10`×16 ⇒ PKCS7 |
| 256 / 512 hex | RSA-1024 / RSA-2048 密文 | 见 `../../web-reverse-algorithm/references/08-mixed-crypto-segmentation.md` |
| 无固定长度、含自定义字符 | 站点自有 base64 变体 | 先找 `replace(/../g,` 的表 |

---

## 2. 逐个配方

### 2.1 腾讯云点播 / TCPlayer 系：`overlayKey` + `cipheredOverlayKey`

**现象**：密钥请求 URL 里出现 `overlayKey`（**值为空**）与 `cipheredOverlayKey`（一串 256 hex，每次请求都不同）。

**链路（原文逐步跟栈得出）**：

```
课程 id → 取 psign
    ↓
本地随机生成 overlayKey / overlayIv（各 32 个 hex 字符，Math.random 生成）
    ↓
overlayKey + overlayIv 用公钥加密 → cipheredOverlayKey（256 hex，每次不同）
    ↓
请求播放 CGI 时把 cipheredOverlayKey 一并带上（服务端据此下发地址与 key）
    ↓
响应里的 key 是「用 overlayKey 当 key、overlayIv 当 iv」加密的
    ↓
本地用自己生成的那一对解密 → 得到真正的内容 key
```

**关键结论（可直接用的简化）**：`overlayKey` / `overlayIv` 是**客户端自选、服务端原样回环**的临时密钥，
所以**可以写死成全 `'0'`（32 个字符 `0`）**，仍然能解出正确 key（原文实测已验证）。

**陷阱**：

- `overlayKey` 字段在 URL 里**是空的**，真正的密文叫 `cipheredOverlayKey`。
  看到「overlayKey 为空」不要以为「没有加密」。
- 同一个站点的 **App / H5 端常常根本没启用这套加密**（原文实测 h5 与 app 给的都是未加密 m3u8）。
  ⇒ **先试替代路线（改 UA / 换端接口），再回来啃算法。**

### 2.2 百度 BCE DRM：`tokenVideoKey` + `encryptedVideoKey`

**现象**：key 接口形如

```
https://drm.media.baidubce.com/v1/tokenVideoKey?videoKeyId=<id>&token=<token>&playerId=<pid>
```

响应字段同时出现 `encryptedVideoKey`（32 hex）、`videoKeyId`、`playerId`。

**链路**：

```
GET /v1/authex/bce/valid?f=<视频地址>&m=<视频id>&e=<时间戳>&k=<固定串>   → 取 token
    ↓
token 拼成  <token>_<playerId>_<expire>
    ↓
带 token 请求 tokenVideoKey → 得到 encryptedVideoKey
```

**算法**（无 IV）：

```python
key = AES_ECB_decrypt(bytes.fromhex(encryptedVideoKey), key=b"72Fhskjglp8qjpqx")
# 结果是 16 个 ASCII 字符，直接当 m3u8 的 AES-128 key 用
```

**判据与互证**：两篇不同年份、不同站点的文章里，这个固定口令**逐字符相同**
（`72Fhskjglp8qjpqx`）⇒ 它是**服务商侧常量**，不是站点自定。
遇到 `encryptedVideoKey` 先直接试这个口令，再考虑是否被站点改过。

### 2.3 某浪「V3 key」：`data` 里塞 key + iv + 密文

**现象**：key 接口响应 `{"data": "<A>:<B>"}`，`A` 恰好 32 字符、`B` 较长。

**算法**：

```
iv  = A[16:32]
key = A[16:32] + A[0:16]          # 后 16 位拼前 16 位（旋转 16 位）
realKey = AES_decrypt(B, key=utf8(key), iv=utf8(iv))
```

**陷阱**：`key` **不是** `A[0:16]`。直接把前半段当 key 会**解出乱码但不报错**——
这是本族最典型的「静默失败」，务必用 §2.5 的「解出的必须是可读 key」做验收。

### 2.4 m3u8 正文整表替换字符：**响应体本身**不是 m3u8

**现象**：m3u8 响应不是 `#EXTM3U` 开头，像 base64 但含 `! @ ( ) - _ *` 等 base64 非法字符，
**末尾有 `==`**。

**判据**：末尾 `==` ⇒ 它仍然是 base64，只是**字母表被替换**了。

**定位手法**（命中率极高）：在 js 里搜 `replace(/\(/`——
`(` 在正则里必须转义，而替换表里几乎必然出现 `(`。
搜 `replace(/\//g` 也行（`/` 是 base64 的字符，必然被换）。

**算法**：把表逆过来再做 base64 decode。实测一例：

```
/→B   _→A   -→h   *→I   !→N   @→O   (→s   )→X
```

**边界**：**不要把这个表套到 ts 分片上**。ts 分片通常是另一套算法（或根本没加密）——
表只作用于 `m3u8` 文本，套错会产生「长度对但内容全错」的结果。

### 2.5 固定口令 + AES-ECB：`encryptedVideoKey` 家族

**现象**：接口返回 `encryptedVideoKey`（32 hex）；js 里长这样：

```js
var _key  = _aes.utils.utf8.toBytes("72Fhskjglp8qjpqx");
var _ecb  = new _aes.ModeOfOperation.ecb(_key);
var _bbb  = [];  for (var i = 0; i < enc.length; i += 2) _bbb.push(parseInt(enc[i]+enc[i+1], 16));
var _dec  = _ecb.decrypt(_bbb);          // 结果就是真正的 key
```

**算法**：AES-ECB（**无 IV**）+ 手动 hex→bytes 切分。

**陷阱**：

- js 里那套自制实现有 `Kd / Ke`、`S / Si / T1..T8 / U1..U4` 一堆表，
  看着像魔改 AES，**其实等价于标准 AES-ECB**。
  ⇒ **先按标准 AES-ECB 跑**，结果对上就不必读代码（对不上再回去看是不是魔改 S 盒）。
- ECB 与「固定口令」组合意味着**同一站点的所有视频共用一把包装口令**；
  但 `encryptedVideoKey` 本身**可能每次请求都不同**（服务端按会话轮换）⇒
  **不要缓存上一次解出的明文 key**，每次现解。
- 有的实现手工实现了 `decrypt` 但 `encrypt` 是空函数（原文明说用不到）⇒ 别指望能反向验证。

### 2.6 解析站：`params = SHA256(盐 + url + platform)`

**现象**：POST JSON `{"url": "...", "platform": "...", "params": "<64 hex>"}`。

**判据**：64 hex ⇒ 第一个假设 SHA-256（原文即如此，盐是固定串 `bf5941f27ee14d9ba9ebb72d89de5dea`）。

**通用做法**：把「盐」与「拼接顺序」当两组未知量，用 **2~3 个真实样本穷举**。
顺序的候选很少（盐在头/尾 × url 在前/在后 = 4 种），几分钟就能穷举完，
比读 JS 快得多。**穷举时必须用两个以上样本同时命中**，单样本命中是假阳性。

### 2.7 解析站：请求 AES + **响应自带** `AES_KEY` / `AES_IV`

**现象**：请求参数 `key=`（base64，长度是 16 的倍数）；响应 JSON 里同时有 `aes_key`、`aes_iv`
与两个密文字段（如 `url`、`html`）。

**算法**：

```
请求侧：
  key   = utf8( MD5HEX(时间戳 + url) )     # 注意：32 个 ASCII 字符当 32 字节 key 用
  iv    = utf8("3cccf88181408f19")          # 站点固定
  key参数 = base64( AES_CBC(时间戳 + url, key, iv, padding=Zeros) )

响应侧：
  直接拿响应里的 aes_key / aes_iv 解 url / html —— 不需要逆任何算法
```

**陷阱**：

- 请求侧 **padding 是 Zeros 不是 PKCS7**（对端口径常写 `PaddingMode.Zeros`）。
  用 PKCS7 解会在末尾**静默多出或少掉字节**。
- 「响应自带密钥」的题**别再花时间找 key 的派生式**——它就在响应里。
  判据就是「同一次响应里既有密文又有 16 字符的 key」。

### 2.8 解析站：`signter = MD5(排序参数&ts&盐) + "-" + ts`

**现象**：请求头 `signter: <32hex>-<10 位秒级时间戳>`。

**算法**：

```
s = 按 key 字典序拼接  k=v&   → 去掉尾 &
s = s + "&" + ts + "&" + 盐
signter = MD5(s) + "-" + ts
```

**判据**：**值里自带时间戳**（`-` 后面是 10 位数字）⇒ 一定是「签名 + 时效」组合。
把时间戳当第二段解出来单独对拍一次，能立刻确认签名口径对不对。

### 2.9 自描述密文：`密文 + 二次密钥`（尾部携带密钥）

**现象**：请求/响应里是一条长的 base64 串，**末尾一截看起来像随机短串**；
解密函数里出现 `slice(0, -v)`、`substring(len - v)`、`parseInt(decode(v))` 之类。

**实测结构**（原文逐函数还原）：

```
请求侧：
  k = 7~9 位随机小写字母 + 数字
  payload = AES_CBC(JSON, key=md5(k)[16:32], iv=md5(k)[0:16]) + reverse(k) + str(len(k))
  ⇒ 尾部是「反转的密钥 + 密钥长度」，长度字段本身（v）另行 base64 编码后单独放一个字段

响应侧（更绕，双层）：
  ciphertext = url.slice(0, -n)                  # n = parseInt(b64decode(v))
  realKey    = join('_', rev_each(AES_decrypt_with(响应里的 key 字段, url 尾部 n 位) → reverse → b64decode → JSON))
  plaintext  = AES_decrypt_with(realKey, ciphertext)
```

**通用结论**：**「长度字段 + 尾部密钥」是最常见的自描述形态**。
量出「末尾多出多少字符」，再决定它是密钥、是长度、还是两者都有。

**陷阱**：`key = md5(k)` 切成 `[0:16]` 与 `[16:32]` 两半，**哪半当 key、哪半当 iv 是常见的搞反点**。
搞反的表现是**解出乱码但不报错**；用「解出的必须是合法 JSON / 可读 URL」验收。

### 2.10 央视 h5e：NALU 级 wasm 解密 + `vmpTag` 派发（C 层 + F 层）

**现象**：ts 分片能下、m3u8 里没有 KEY，解出来花屏或只有声音；页面用 worker 加载 wasm。

**关键结构**（原文给出完整调用链）：

```
NALU type == 25（SEI 类）：payload[0] === 1  ⇒  置 shouldDecrypt = true
NALU type ∈ {1, 5}      ：仅当 shouldDecrypt 才解密，其它类型原样返回
⇒ 不是「整片加密」，也不是「全部 NALU 加密」

vmpTag = wasm._CNTV_UpdatePlayer(mem) 的返回值（8 位 hex）
  → 字符落在 "0123456" 中的位决定调用 _CNTV_jsdecVOD{7-i}

会话串：普通包用 mediaTagID；特殊包用 "mediaTagID##<dts>##<seeked>"
```

**解密后必须重写 TS**：NALU 长度变了 ⇒ 重算 adaptation field：

```
adaptationField.payloadLength = 188 - 4 - 1 - offset - newNALU.byteLength
```

**判据总结**：「解出来是合法 TS 但花屏」+「wasm 里有一堆 `jsdecVOD*` 导出」⇒ 走这条。
实现细节见 `whitebox-and-wasm-crypto.md` §6 与 `../scripts/ts_repack.py`。

### 2.11 直播源：**URL 差值法**（斗鱼标准格式）

**现象**：抓到的是带时效参数的地址（`wsSecret` / `wsTime` / `txSecret` / `txTime` / `wsAuth`），
播几分钟就失效。

**手法（可迁移）**：同一路资源，用**两种不同途径**各抓一次（PC 端 F12 / 手机浏览器 / App / 第三方软件），
把两条 URL 并排 diff：

- **不变段** = `域名 + 路径里的 <房间号+随机串>` ← 这是资源的真实标识
- **变化段** = 全部 query 参数 ← 这是时效鉴权

套用「标准格式」：`http://<真实 CDN 域名>/live/<房间号+随机串>.flv`

- `.flv` 与 `.xs` 可互换；
- 路径里的 `_4000P / _2000p / _1200p / _550p` 是清晰度，可改可去。

**边界**：**只对 24 小时不间断的直播间长期有效**；关播再开播必须重取。

**为什么有效**：时效参数只影响**鉴权**，而很多 CDN 域名的「直连路径」并不校验它。

**可迁移形式**：任何「地址带时效签名」的场景（直播源、直链、临时下载地址、STS 签名 URL），
**先做两次抓包的 diff，把常量段与变量段分离，再逐段试删**——比读 JS 快，而且常常直接成功。

### 2.12 清风DJ 系：内联 `DeCode` 两套解码

**现象**：播放页里内联一段重度混淆的 `DeCode` 类，密文是含 `>` `[` `?` 的自定义编码。

**该站内联类里存在两套解码，判据看密文形态**：

| 形态 | 用哪套 | 算法 |
| --- | --- | --- |
| `>187Q190q193k196Q...`（**符号 + 3 位数字**，每 4 字符一组） | 表格法 | 首 2 位跳过；每组取第 1 个字符与后 3 位数字：`idx=(num-100)/3`，`char = 2*ord(组内第1字符) - table[idx]` |
| 纯 hex、末尾接 8 位 hex | 线性同余异或法 | 见下 |

线性同余异或法（同一类里的另一套，注意**是字符串加法**）：

```
h = parseInt(密文末 8 位, 16); 密文 = 密文去掉末 8 位     # 末 8 位参与初始状态，不参与解密
e = 由密钥串 charCode 拼成的数字串取 5 个等分位组成
f = round(len(密钥串)/2);  g = 2**31 - 1
k = 把数字串按 10 位切分反复相加直到 <= 10 位            # 字符串加法，不是普通整数加法
k = (e*k + f) % g
逐 2 个 hex 位：byte ^= floor(255 * k / g);  k = (e*k + f) % g
```

**产物陷阱**：解出的是**带 `?upt=<token>&news` 的 m3u8 地址**；
该 token 是访问分片的**唯一凭据**，**每个 ts 的 URL 也必须带上它**。
不要只给 m3u8 带 token；也不要把 `upt` 当签名重算（它由服务端下发）。

### 2.13 Widevine（CDM）：**不在 JS 层——这是明确的边界**

**现象**：m3u8 / 初始化段解不开，JS 里搜不到任何 key 逻辑；
`#EXT-X-KEY:METHOD=SAMPLE-AES` 且 `KEYFORMAT` 是 Widevine 的 KID
（`urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed`）；页面提示浏览器不支持。

**结论**：解密发生在 **CDM（Content Decryption Module）** 内部，JS 层拿到的**只有解密后的帧**。
「扣 JS 拿 key」这条路**不存在**，不要在这里空转。

**可行路线（原文思路）**：自己编译 Chromium → 打开编译开关 `enable_widevine = true` →
在编译产物目录建 `WidevineCdm/` 放入 Google 官方 CDM 包 →
在 `MojoDecryptor::OnVideoDecoded` 处拿到 `VideoFrame`（I420），转 ARGB/PNG 或重新编码落盘。

**本技能的处置**：**标注为边界，不做纯算实现**；只提供「识别 + 绕行/放弃」的判据。

**识别判据**（用来把这题和自有 DRM 区分开）：

| 判据 | 含义 |
| --- | --- |
| `METHOD=SAMPLE-AES` + Widevine KID | 大概率 Widevine |
| 有 `GetLicense` / `protectedLicenses` / `KID` / `CEK` 且走自有 TLV | **自有 CDRM/STSDK 系** ⇒ 走 `license-and-key-hierarchy.md`，可解 |
| JS 里完全没有任何 key/解密逻辑，但能播 | CDM 系 ⇒ 走「取解码后帧」或放弃 |

---

## 3. 跨配方判据表（先查表，再读 JS）

| 现象 | 第一个要试的 |
| --- | --- |
| 响应含 `encryptedVideoKey` | AES-ECB + 口令 `72Fhskjglp8qjpqx` |
| URL 含 `overlayKey`（空）/ `cipheredOverlayKey` | 写死全 `'0'` 的 overlayKey / overlayIv |
| `data` 含 `:` 且 `:` 前恰好 32 字符 | V3key：`iv=A[16:]`，`key=A[16:]+A[:16]` |
| m3u8 正文尾 `==` 且含 `()` | 整表替换 + base64（搜 `replace(/\(/`） |
| 参数是 64 hex | SHA-256(盐 + …)，盐用 2 个样本穷举 |
| 值是 `32hex-10位数字` | 签名 + 时间戳 |
| 参数末尾多出一截「不像密文」的短串 | 自描述密文（长度字段 + 尾部密钥） |
| 响应里同时有密文与 `aes_key`/`aes_iv` | 响应自带密钥，直接解 |
| **拿到的 key 不是 16 字节**（32/47/64 位、或长 hex） | **W 包装层**：先跑 `key_wrapper.py alpha-check`，再按 `key-wrapper-families.md` §2 对号 |
| JS 里有自定义字符表（非标准 base64）+ `indexOf` + `charCodeAt` 求和 | W2/W3 字符表滚动族，同上 |
| URL 带 `wsSecret`/`txSecret`/`upt`/`wsAuth` | 先做两次抓包 diff，再试直连域名 |
| TS 能解但花屏、wasm 里有 `jsdecVOD*` | C 层 + F 层：NALU 级解密 + 重写 adaptation field |
| `SAMPLE-AES` + Widevine KID | 边界：CDM 系，不做纯算 |

---

## 4. 坑表（全部是「不报错但结果错」）

| 坑 | 触发 | 表现 | 正确做法 |
| --- | --- | --- | --- |
| key 与 iv 取反 / 取错半段 | `md5(k)` 切成两半、`A[0:16]` vs `A[16:]` | 解出乱码，**无异常** | 用「解出的必须是可读 key / 合法 JSON」验收 |
| padding 用 PKCS7 解 Zeros 的密文 | 对端口径是 `PaddingMode.Zeros` | 末尾多出或少掉几个字节 | 四元组（算法+模式+填充+key/iv）逐项对齐 |
| 只给 m3u8 带 token，ts 没带 | 分片 URL 也要求 `?upt=` / `?token=` | m3u8 能下、ts 403 或内容错 | 把 token 扩散到每个分片 URL |
| 缓存了上一次解出的明文 key | `encryptedVideoKey` 每次轮换 | 「昨天能下今天不行」 | 每次请求现解 key |
| 把「overlayKey 为空」当「没加密」 | 真密文在 `cipheredOverlayKey` | 找不到 key 就停在原地 | 看字段名而不是看值 |
| 把 m3u8 的字符替换表套到 ts 上 | 两者用不同算法 | 长度对内容全错 | 替换表只作用于 m3u8 文本 |
| 用「浏览器能播」证明链路对齐 | 带会话状态（`vmpTag`/`mediaTagID`）的链路 | 本地与浏览器本来就可能不一致 | 判据是「本地解出的分片能原样重封装」 |
| 在 CDM 系上死磕纯算 | 解密在底层 | 白费数天 | §2.13 的识别判据，早判早绕 |
| 把「包装后 key」当内容 key | 站点对 key 做了二次构造 | 下载器报填充错误 / key 长度不对 | key 不是 16 字节 ⇒ 100% 还有一层（`key-wrapper-families.md`） |
| 照抄文档里的字符表 | 表缺字符 / 有重复 | 产物看似合法、实际全错 | 先跑覆盖性 + 单射性检查 |
| 噪声字符落在 base64 表内 | 原码把噪声也拼进 base64 串 | `atob('YQxx==') → 'aq'`，不报错 | 噪声只能用 ASCII 空白；`n == 0` 的样本暴露不出 |
| `substr(x, y)` 当成 `substring(x, y)` | 第二参数是**长度**不是终点 | 部分样本整体错位、结果仍是合法 base64 字符 | 逐项核对窗口长度随下标变化 |

---

## 5. 与其他文件的分工

- 分层判据、TS→PES→ES 结构与加密覆盖范围 → `hls-and-ts-structure.md`
- **key 二次构造 / 包装层（W 族）与字母表守卫** → `key-wrapper-families.md`（**拿到的 key 不是 16 字节就先看这份**）
- **直播流捕获 / 播放器侧 / 反录制 / EME 拦截** → `player-and-live-capture.md`
- 自有 DRM 许可证体系（TLV / 密钥层级 / `mdcm` / CRC16） → `license-and-key-hierarchy.md`
- wasm 白盒、内存取证、文件头解密、NALU 级 wasm 解密实现 → `whitebox-and-wasm-crypto.md`
- 电子书 / 容器型内容保护（EPUB / PDF / 章节接口） → `ebook-and-container-drm.md`
- 混合加密的**骨架推断**与「密钥包装的其他形态」 →
  `../../web-reverse-algorithm/references/08-mixed-crypto-segmentation.md`
- 纯接口签名（媒体流本身没加密） → `../../web-reverse-algorithm/SKILL.md`
