# HLS / TS 分层与 A~D 层实战配方

> 本文件是**分层判据与配方**的唯一权威源。SKILL.md 的 30 秒分流表由此展开。
> 许可证体系（E 层）见 `references/license-and-key-hierarchy.md`（国内派）与
> `references/widevine-cdm-and-eme.md`（国际派：Widevine / EME / ClearKey）；
> wasm/白盒（F 层）见 `references/whitebox-and-wasm-crypto.md`。
>
> **「分片本身根本不是标准 TS」** 的情形（被拼上真图片头伪装成 `.png`、网络面板只有一堆图片请求）
> 不在本文件里：那是**容器伪装**，用 `scripts/container_disguise.py locate/strip` 先还原出真分片再回来判层。

**目录**

- [1. m3u8 字段语义（判层靠它）](#1-m3u8-字段语义判层靠它)
- [2. TS → PES → ES/NALU 三层结构与解密边界](#2-ts--pes--esnalu-三层结构与解密边界)
- [3. 加密覆盖范围判据（花屏的第一因）](#3-加密覆盖范围判据花屏的第一因)
- [4. key / IV 的四类来源与真实派生式](#4-key--iv-的四类来源与真实派生式)
- [5. A 层配方：m3u8 明文 KEY](#5-a-层配方m3u8-明文-key)
- [6. B 层配方：key 由 JS 拼或由接口给](#6-b-层配方key-由-js-拼或由接口给)
- [7. C 层配方：ES/NALU 逐帧加密](#7-c-层配方esnalu-逐帧加密)
- [8. D 层配方：接口字段解密](#8-d-层配方接口字段解密)
- [9. RPC 免扣兜底](#9-rpc-免扣兜底)
- [10. 交付前必做的两件机械动作](#10-交付前必做的两件机械动作都有现成脚本)
- [11. 排错速查](#11-排错速查)

---

## 1. m3u8 字段语义（判层靠它）

m3u8 是**纯文本**，先把它当数据读一遍，比读 JS 快得多。

### 1.1 master 与 media 两级

```m3u8
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720      ← master：只有这一行 + 下一行 URI
720p/index.m3u8
```

- 有 `#EXT-X-STREAM-INF` ⇒ 这是 **master**，真正的分片列表在它下一行的 URI 里。
  直接去请求 master 拿分片，会拿到 `404` 或一个 HTML，**不要**在这里下结论说「没有加密」。
- 多码率时**每个码率各有自己的 `EXT-X-KEY`**，key 可能不同。**不要跨码率复用 key**。

### 1.2 判层关键字段

| 字段 | 含义 | 对判层的作用 |
| --- | --- | --- |
| `#EXT-X-KEY:METHOD=AES-128,URI="k",IV=0x...` | 后续分片用这个 key | 出现 ⇒ 至少 A 层；`IV` 省略 ⇒ 用**媒体序列号**推 IV |
| `#EXT-X-KEY:METHOD=SAMPLE-AES` | 只加密部分样本 | 直接跳 C 层，别做整片解密 |
| `#EXT-X-KEY:METHOD=NONE` | 从这里起**恢复明文** | 广告插播段常出现；**不要**把 NONE 之后的分片也解密 |
| `#EXT-X-MEDIA-SEQUENCE:n` | 首个分片的序号 | **IV 缺省时的取值来源**，不是从 0 开始 |
| `#EXT-X-DISCONTINUITY` | 编码参数突变 | 这里前后**可能换 key / 换 IV**，不要跨过它复用 |
| `#EXT-X-BYTERANGE` | 分片是文件的一段 | 密文区间 = 该字节范围，不是整个文件 |
| `#EXT-X-MAP:URI="init.mp4"` | fMP4 初始化段 | 说明是 fMP4 而非 TS，C 层判据要换成 mp4 box 结构 |
| `#EXT-X-KEY:KEYFORMAT="urn:uuid:..."` | DRM 系统标识 | 直接跳 E 层 |

> `EXT-X-KEY` 是**作用于其后所有分片**的状态字段，遇到新的 `EXT-X-KEY` 才覆盖。
> 写解析器时按「状态机」处理，不要假设每个分片行前都紧跟一行 KEY。

### 1.3 IV 缺省时的推导（高频错点）

`EXT-X-KEY` 不带 `IV` 时，HLS 规定用**该分片的媒体序列号**作为 IV：

```
IV = 16 字节大端整数，值 = EXT-X-MEDIA-SEQUENCE + 分片在该列表中的下标
```

用 `0x00...00` 当 IV 是最常见的静默错误：**能解出字节、能过 CRC、只是花屏**。

**★ 静默到什么程度？—— 本批用两个独立实现把它量出来了**（源文 `52pojie-977455` 是 2019 年一篇
「ts 下载 → openssl 解密 → copy 合并」的教学帖，作者在正文里明写「偏移量没写，**默认为 0**」，
并**用同一个全零 IV 解了全部分片**，还给出了「播放正常」的截图）：

| 判据 | 结论 |
| --- | --- |
| 破坏范围 | **只损坏第 0 块的 16 字节**（CBC 解密的第 i 块 = `D(C_i) ^ C_{i-1}`，IV 只进第 0 块的异或），第 16 字节起逐字节完好 |
| 破坏**位置** | **恰等于「正确 IV 与错误 IV 的差异字节位置」**。分片 1 的正确 IV 是 `00…01`，与全零只差**最后 1 字节** ⇒ **只坏 1 个字节，下标 15** |
| 为什么看不出来 | 下标 15 落在 **TS 首包（188 字节）的载荷里**，且**首字节 `0x47` 同步字节完好** ⇒ 解码器顶多丢一帧，肉眼与 ffmpeg 的 `-v error` 都不报错 |
| 何时才炸 | IV 与「媒体序列号」差异越大越明显（换到全 `FF` 的 IV 就坏满 16 字节）；或分片切在关键帧上 |

> **可复跑证据**：`artifacts/skill-evolution/tools/b40-hls-cli-check.sh`（openssl 侧，11/11）
> 与 `b40-browser-assert.py` E 组（真机 Chrome WebCrypto 解 openssl 产物，**跨实现逐字节一致**，
> 且零 IV 的差异下标实测 `[15]`）。
> ⇒ **判据升级**：遇到「作者说他用零 IV / 固定 IV 解全部分片而且能播」的帖子，
> **不要照抄**，也不要反过来认为「他成功了说明 HLS 默认 IV 就是 0」——
> 那是**破坏面太小所以没暴露**，正确取值仍是媒体序列号。

### 1.4 同一个「视频信息」接口里可能有四个 m3u8 URL（选错就白干）

不少平台（实测：某 TV 站 `api/getHttpVideoInfo.do`）在**同一个响应**里给出一组并列地址：

| 字段 | 语义 | 用它的后果 |
| --- | --- | --- |
| `hls_url` | **明文**地址 | ⚠️ **分辨率被锁死**：把 URL 里的 `450` 手改成 `1200`，返回的**仍然是 450** |
| `hls_enc_url` | 客户端在线播放（加密） | 需要解密，但可能只有客户端 UA 能取 |
| `hls_h5e_url` | **网页播放**（加密） | ✅ 浏览器能直接播 ⇒ 优先从这里抓 key |
| `hls_enc2_url` | 客户端**下载**（加密） | 可能是另一套 key/清晰度 |

**两条判据**：

1. 抓到的 m3u8 **一解就出明文、且清晰度偏低** ⇒ 你抓的是 `hls_url`，**别继续往下做**
   （它本来就不加密，也拿不到高清晰度），改去抓 `hls_h5e_url` / `hls_enc_url`。
2. 同一响应里既有明文地址又有加密地址时，**以加密地址为准做判层**——两者可能连
   分片命名都不同（`/asp/hls/` vs `/asp/h5e/hls/`），拿明文的分片去套加密的 key 是空转。

### 1.5 多候选 m3u8 的挑选判据（播放页里捞到好几条时挑哪条）

播放页 HTML 里**经常同时出现多条 m3u8**（同一份被写进多段 JS / 多个标签 / 多个清晰度入口）。
2019 年某站样本（源文 `52pojie-1056398`）给的是一个**朴素启发式**：

```python
m3u8_url = Counter(re.findall("http.*?index\.m3u8", r.text)).most_common(1)[0][0]
# 源文注释原话：找到提取内容重复次数最多的链接
```

- **判据**：**取「重复出现次数最多」的那一条**。理由：真正被播放器加载的那条，常在播放页的
  多段 JS / 多个标签里被重复引用；只出现一次的往往是模板、注释、备用清晰度或死链。
- ⚠️ **这是 2019 年源文的朴素启发式，不是硬判据**：① 它是站点特定写法，换站未必成立；
  ② 「出现次数最多」与「真正被加载」**没有因果关系**，只是统计相关；
  ③ 更稳的判据仍是**从播放器实际的网络请求 / master 的 `#EXT-X-STREAM-INF` 指向**去拿。
  把它当**第一猜想**，不要当结论。
- **路径归一（站点特定，不可迁移）**：源文在捞到的 URL **不含 `hls`** 时，把 `index.m3u8`
  替换成 `1000kb/hls/index.m3u8`：

  ```python
  if not "hls" in m3u8_url:
      m3u8_url = re.sub("index.m3u8", "1000kb/hls/index.m3u8", m3u8_url)
  ```

  ⇒ `1000kb/hls/` 是**该站点的目录形态**（码率目录 + `hls` 子目录），**抄结构不抄常量**，
  换站必须重新判断目录层级（不要把这个字符串当通用规律）。

---

## 2. TS → PES → ES/NALU 三层结构与解密边界

```
┌─────────── TS 层（188 字节定长包）───────────┐
│ 0x47 │ flags/PID(13bit) │ ... │ payload     │
└──────────────────────────────────────────────┘
        ↓ 按 PID 分流（PAT → PMT → 各 stream PID）
┌─────────── PES 层 ──────────────────────────┐
│ 00 00 01 │ stream_id │ PES_packet_length   │
└──────────────────────────────────────────────┘
        ↓ 去掉 PES 头
┌─────────── ES 层（H264 / HEVC NALU）────────┐
│ 00 00 01 │ NAL header │ payload ...        │
└──────────────────────────────────────────────┘
```

### 2.1 TS 层要点

- 定长 **188** 字节；首字节固定 `0x47`。文件长度不是 188 的整数倍 ⇒ 有前置/后置附加数据。
- `PID` 在字节 1~2（13 bit）；`payload_unit_start_indicator` 在字节 1 的 bit 6。
- **PID 0 是 PAT**，PAT 指向 PMT 的 PID；PMT 里才是音视频各自的 PID。
  拿到 PMT 才能知道「哪个 PID 是视频、哪个是音频」——**音视频的 key/IV 可能不同**。

### 2.2 PES 层要点

- 起始码 `00 00 01`，紧跟 `stream_id`（视频 `0xE0~0xEF`，音频 `0xC0~0xDF`）。
- `PES_packet_length` 是 **16 bit**，且**视频流常写 0**（表示长度不受限，实际长度由 TS 层承载）。
  所以**不能用 PES 长度推明文长度**，要用 TS 层 payload 累计或 NAL 切分结果。
- 有些目标把 `service_name` 之类的自定义字段挂在 **PMT 的 program descriptor** 上
  （ffmpeg 里读作 `ctx->programs[i]->metadata`）——**这是 DRM 模式串最常见的藏身处**，见 `references/license-and-key-hierarchy.md`。

### 2.3 ES / NALU 层要点

- NAL 起始码 `00 00 01` 或 `00 00 00 01`。
- NAL 头长度：**H264 = 1 字节，HEVC = 2 字节**。判错会导致「解出来的头被当密文」。
- **防竞争字节（EBSP）**：编码器把 payload 里的 `00 00 00/01/02/03` 前插一个 `03`
  （`00 00 00 → 00 00 03 00` 等）。**完整替换表、`00 00` 在末尾不多插、以及「严格 vs 宽松」
  两种 unescape 的分歧**见 `frame-encryption-and-wasm-decryptors.md` §3。
  解密前必须先 **`nal_unescape`（删掉 `03`）**，解密后如需重新封装再 `nal_escape` 回去。
  **顺序写反（先解密再 unescape）会静默产出错数据**；而 `nal_escape` **不幂等**，
  同一段数据做两次会让长度持续膨胀。
  机械实现：`python $S/nalu_frame_crypto.py ebsp-unescape <in> -o <out> [--loose]`。

---

## 3. 加密覆盖范围判据（花屏的第一因）

拿到一个分片后，**用「解出来的前若干字节是不是合法结构」反推加密起点**，不要靠猜：

| 覆盖范围 | 判据（把文件头 64 字节 dump 出来看） | 常见度 |
| --- | --- | --- |
| 全文件 | 连 `0x47` 都变了 | 罕见 |
| TS payload | `0x47` 在，188 对齐处**每包都有 `0x47`**，但 payload 乱 | 少 |
| PES payload | `0x47` 在，`00 00 01` 起始码在，PES 头之后乱 | 中 |
| **ES/NALU payload** | `00 00 01` 与 NAL 头都在，**头后面乱** | **最多（高级形态）** |
| 仅关键帧 | 一部分 NAL 正常、IDR 帧乱 | 中 |

**只有 ES/NALU payload 加密时，明文 NAL 头是「锚点」**：解出来的每个 NALU 头必须仍是合法的
`(nal_ref_idc, nal_unit_type)`；用它就能验证解密是否正确，而**不需要先能播放**。

---

## 4. key / IV 的四类来源与真实派生式

> ★ **先做一次长度检查再往下读**：`#EXT-X-KEY` 拿回来的值**不是 16 字节** ⇒
> 100% 还有一层**包装**（W 族）⇒ 转 `key-wrapper-families.md`（先跑它的 §6 字母表守卫）。
> 本节的四类来源是「怎么**得到**那 16 字节」，W 族讲的是「得到的是**包装**时怎么还原」。

### 4.1 明文 key URI

m3u8 给了 `URI`，直接 GET 回 16 字节。注意：
- 返回的可能是 **hex 文本**（32 字符）而不是 16 字节二进制——两种都要能处理；
- 也可能返回 **base64**。判据：长度 16 ⇒ 原始；长度 32 且全 `[0-9a-f]` ⇒ hex；长度 24 且以 `=` 结尾 ⇒ base64。

### 4.2 派生式一：`key = MD5(固定串)` 切两半（某牛 / 七牛系）

真实 JS：

```js
function decrypt(e) {
  var t = CryptoJS.MD5("固定字符串").toString();          // 32 位 hex
  var i = CryptoJS.enc.Utf8.parse(t.substring(0, 16));    // IV  = 前 16 个**字符**
  var r = CryptoJS.enc.Utf8.parse(t.substring(16));       // Key = 后 16 个**字符**
  return CryptoJS.AES.decrypt(e, r, { iv: i, padding: CryptoJS.pad.Pkcs7 }).toString(CryptoJS.enc.Utf8);
}
```

**三个易错点**：

1. `substring` 切的是 **hex 字符串的字符**，不是字节。所以 key/IV 是 **16 字节 ASCII**，不是 16 字节二进制。
   写成 `bytes.fromhex(t)[:16]` 会得到完全不同的 key，而**解出来仍是 16 字节、仍不报错**。
2. `CryptoJS.AES.decrypt(cipherObj, key, {iv})` 中 `cipherObj` 可以是 **base64 字符串**（自动解码）。
3. 明文层通常还是 JSON（`annex_secret` / `o` / `v` 这类字段），**解出 JSON 才算到位**。

该案例的**方法论价值大于算法本身**：作者先是从控制台 `console.log` 里直接看到了 key（`this.decryptkey`），
再顺着 `decryptdata.key ← new Uint8Array(this.qiniuDRMKey) ← config.DRMKey ← 接口返回的 o/v` 一路回溯，
最终在**接口响应**里找到 `o`（密文 URL）与 `v`（密文 key）。这条回溯链是 B 层的标准动作。

### 4.3 派生式二：`ptk` + 视频 ID 组合（西瓜系）

```php
$key = "ef84a15b-ffd0-4c4d-9d56-b652532f";                                  // ptk，32 字符
$iv  = md5($key . "_" . $video_id, true);                                   // 注意 raw=true → 16 字节
openssl_decrypt(base64_decode($data), 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
```

- key 是 **32 个 ASCII 字符**（= AES-256 的 32 字节），不是 16 字节 hex 解码结果。
- IV 是 **`md5(..., raw=true)`**：PHP 里 `raw=true` ⇔ Python `hashlib.md5(s).digest()`；
  写成 `.hexdigest()` 会变成 32 字节，`AES.new` 直接抛异常（**这种会报错的错反而好排查**）。
- `video_id` 用的是**带前缀的完整 ID**（如 `v03043740000bkdcm2d8kgepf3ld6a0g`），不是纯数字部分。

### 4.4 派生式三：`Latin1` key，IV 取 key 前缀（直播接口系）

```js
const b = e.aes.enc.Latin1.parse(s0.substring(0, 16));   // IV
const t = e.aes.enc.Latin1.parse(s0);                    // Key（s0 全串，16/24/32 字符）
```

- **`Latin1.parse` ⇔ Python `s.encode('latin-1')`**。用 `utf-8` 编码在纯 ASCII 下结果相同，
  但 `s0` 一旦含非 ASCII 字节（混淆代码常用）就会分叉。
- `s0` 常由**混淆数组**动态生成（`u = [104, 101, ...]` + 偏移量拼装）。
  处置：**动态断点把运行时 `s0` 复制出来**，不要静态读数组——这是本类目标最常见的返工点。

### 4.5 派生式四：`:` 分栏 + 前后半段互换（某浪 V3 系）

响应里的 `data` 是 `"<32 字符>:<密文>"`，JS 只做一件事——**把前段的两个 16 字符换个位置**：

```js
var ae = V.split(":");
var se = ae[0];
var ue = se.substring(16);                 // IV  = 后 16 字符
return { iv: ue, key: ue + se.substring(0, 16), encData: ae[1] };
```

⇒ **IV = 后 16 字符；内容 key = (后 16 + 前 16) 拼起来的 32 字符 ASCII**；
用这一对 AES 解 `encData`，得到最终的 16 字节内容 key。
解出来的 key 还会被 `window.btoa()` 写回 `de.data` ——「**解密响应 → 重新 base64 写回**」是本族的指纹。

```bash
python $S/nalu_frame_crypto.py split-derive --data "AAAABBBBCCCCDDDDeeeeffffgggghhhh:9f8e" --pretty
```

> **通用判据**：只要响应是「两段用一个分隔符分开、其中一段长度正好是 16 的整数倍」，
> **先按「半段互换/拼接」试一遍**再考虑异或族——「把两半换个顺序」是最省事的混淆，
> 而它恰好会让「直接取前 16 当 key」的直觉全部落空。
> 另：切分只按**第一个**分隔符（密文里常含同样的字符）。

### 4.6 派生式五：厂商双层（某利威 / polyv 系）——key 文件不是 16 字节

两层各自独立，**必须按顺序解**：

1. **先解配置**（那个返回 JSON 的接口，本身是密文）：
   `key = MD5(vid)[:16]`、`iv = MD5(vid)[16:]`（同一串 MD5 的**前 16 字符当 key、后 16 字符当 iv**）；
   解出 → **base64 解码** → 才是 JSON；JSON 里取 `seed_const`。
   `vid` = **视频链接后面的那个参数**。
2. **再解 key 文件**：请求回来的 key 文件 **32 字节**（不是 16）⇒ 一层 AES-CBC 包装：
   `key = MD5(seed_const)[:16]`，`iv` 是**固定 base64 常量**（本族实测 `AQIDBQcLDRETFx0HBQMCAQ==`），
   解出后**取前 16 字节**作为真 key。

**判据表**：

| 现象 | 结论 |
| --- | --- |
| key URI **403 / 需要 token** | URI 被加固，不是 key 的问题；先补 token（与 §10.1 同源） |
| key URI 形如 `…/xxx.key?pid=null&ts=<毫秒>&sign=<32hex>&ms=<32hex>&audit=&appId=` | **厂商托管（videocc.net / 某利威系）**：`ts`+`sign`+`ms` 是**时效鉴权四件套**；`sign/ms` 由页面接口下发，**不能自己算**，必须"取一次、马上用" |
| key 文件 **32 字节** | 一层 AES-CBC 包装，取解出后的**前 16 字节** |
| key 文件 **33 字节** | 同上（多 1 字节是 padding/换行残留）；**先试「去掉尾部 1 字节再解」** |
| 同一个 MD5 字符串既当 key 又当 IV | 这是**切片式**用法（前 16 / 后 16），不是取两次 MD5 |

### 4.6.1 操作层（`52pojie-1637348`）：vid 取全名、hex 输入与「假成功」判据

同一族（某利威 / polyv 双层）的**操作手册版**：源文自陈「**不介绍分析过程，只介绍如何去做**」
⇒ **这一篇是工具复现式，不是算法还原的依据**（算法看 §4.6）。
四条与 §4.6 互补的判据：

| # | 判据 | 依据 / 说明 |
| --- | --- | --- |
| 1 | **`vid` 必须取带后缀的完整名**（如 `4adf37ccc0af24c6ab7f0ba0d3beadd1_4`），**不能只取 `_4` 之前的部分** | 源文原话「有些人取值 `4adf37ccc0af24c6ab7f0ba0d3beadd1` 是错误的，一定是 `4adf37ccc0af24c6ab7f0ba0d3beadd1_4`」。**`vid` = 那个 JSON 响应体的文件名**（不是链接参数，也不是纯 md5）。源文实测：JSON 体后缀 `_4`、key 文件后缀 `_3.key` |
| 2 | 这一层的 `key` / `iv` **只服务「解配置 JSON」**，与 m3u8 媒体流无关 | 源文原话「取前 16 位为对称加密的 key、后 16 位为对称加密的 iv，**注意和 m3u8 没有一点关系**」—— 与 §4.6「先解配置」**同口径**，别把这两半当成媒体 key |
| 3 | 配置密文**先按 hex 解释**（工具箱里 raw→hex），解出后**还要再走一次「编解码」**才是可读文本 | 源文步骤：body 长串 → 待处理 raw 改 hex → 选「解密」→ 输出再进「编解码」→ 文本里搜 `seed_const`。⚠️ §4.6 把这一步写作「解出 → base64 解码」，**两篇源文口径不同**；落地按「输入 hex、输出再做一次编解码」试（两篇都未给可逐字节复算的样本，**本条标未复核**） |
| 4 | ★ **「分片全部下完、只有合并那一步报错」= key 解密密码不对** | 源文自陈「下载全部完成了，在合并的时候出错了……你的 key 解密密码不对」。这是本族最典型的**假成功**：分片能下、长度也对，只有合成那一步炸 |

**三个可复算的常量**（本库独立复算，不照抄源文数字）：

```python
import hashlib, base64
hashlib.md5("4adf37ccc0af24c6ab7f0ba0d3beadd1_4".encode()).hexdigest()
# '142572a1e3661b91ad17ae24ce47f959'  → key='142572a1e3661b91'（前 16） iv='ad17ae24ce47f959'（后 16）
hashlib.md5(b"24").hexdigest()
# '1ff1de774005f8da13f42943881c655f'  → key='1ff1de774005f8da'（seed_const=24 的 MD5 前 16）
list(base64.b64decode("AQIDBQcLDRETFx0HBQMCAQ=="))
# [1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 7, 5, 3, 2, 1]   ← 固定 IV（16 字节），与 §4.6 同一常量
```

> ★ **那条固定 IV 的记忆锚点**（本库观察，便于在混淆常量里认出它）：
> 16 字节 = `01 02 03 05 07 0B 0D 11 13 17 1D 07 05 03 02 01` ——
> **「1 与素数」序列 `1,2,3,5,7,11,13,17,19,23,29` 后接回折 `7,5,3,2,1`**。
> 换站时若 IV 不是这个常量，说明不是同一套服务端实现，§4.6 的「固定 IV」结论**不可迁移**。
>
> 源文给出的最终真 key 是 `CF7767B4C359687EF78BD7824147E8A4`（32 位 hex → 16 字节二进制）
> —— **本库未复核**（缺 key 文件的密文样本），此处仅留存源文口径。

### 4.6.2 工具层：`.pdx` 容器与 `N_m3u8DL-RE` 的 Polyv 三参数（`52pojie-1945942`）

同一族（某利威 / polyv）的**第三种来源形态**：拿到的既不是 `.m3u8` 也不是 `.ts`，
而是一个 **`.pdx`**（形如 `…/<vid>_1.pdx`）。**`N_m3u8DL-RE` 默认当普通 HLS 处理会失败**。

**配方（源文原样两条命令）**：

```bash
# v12 —— 可直接合并成 mp4
N_m3u8DL-RE.exe "https://hls.videocc.net/<...>/<vid>_1.pdx" \
  --tmp-dir ./cache --save-dir ./Download --save-name "1697442267278116" \
  --custom-hls-method Polyv --custom-hls-key 98d2ea568b5316a9eb9aae8596ef2241 \
  --seed-const 215 -H "Referer:https://www.yiihuu.cc"

# v13 —— 只能二进制合并，产物要用专用播放器播
N_m3u8DL-RE.exe "https://hls.videocc.net/<...>/<vid>_3.pdx" \
  --tmp-dir ./cache --save-dir ./Download --save-name "1697442267278116.mp4" \
  --custom-hls-method Polyv --custom-hls-key RleW2az0Y70z3eQ0CZFLJA== \
  --seed-const 171 -H "Referer:https://www.yiihuu.cc" --binary-merge
```

**代次判据（可机械判别，不靠猜）**：

| 现象 | 代 | 处置 |
| --- | --- | --- |
| 同一命令直接产出**可播 mp4** | v12 | 不加 `--binary-merge` |
| 必须加 `--binary-merge`、且产物**要用专用播放器**才播得出来 | v13 | 二进制合并；别急着怀疑 key |

**`--custom-hls-key` 的两种编码形态（本库复算，`b36-verify-numbers.py` 已断言）**：

| 来源 | 字面量 | 字符数 | 解出字节数 |
| --- | --- | --- | --- |
| v12 | `98d2ea568b5316a9eb9aae8596ef2241` | 32（纯 hex） | **16** |
| v13 | `RleW2az0Y70z3eQ0CZFLJA==` | 24（base64，带 `==`） | **16**（`465796d9acf463bd33dde43409914b24`） |

⇒ **判据：`--custom-hls-key` 解出来必须是 16 字节**。两种写法只是「给人看」的编码不同
（hex / base64），**不是两把不同的 key**。

**⚠️ 两个必须登记的边界（源文未说明，本库只登记不判因）**：

1. **`--seed-const` 与 `--custom-hls-key` 是两个独立参数**：
   本库复算 `MD5("215")[:16] = 3b8a614226a953a8 ≠ 98d2ea568b5316a9`、
   `MD5("171")[:16] = a4a042cf4fd6bfb4 ≠ 465796d9acf463bd`
   ⇒ **`custom-hls-key` 不是 `MD5(seed_const)` 的派生值**。
   §4.6 里那句「`key = MD5(seed_const)[:16]`」讲的是**解「key 文件」那一层**，
   **不要**把它挪来解释这个命令行参数（两篇源文讲的不是同一个量）。
2. **`seed-const` 的取值来源**（215 / 171）**源文没给**，只给了值 ⇒ **不得**编造推导式。

**其它两条纪律**：

- **`Referer` 是必需的**（源文两条命令都带 `-H "Referer:https://www.yiihuu.cc"`）——
  与 §4.6 判据表里「key URI 403 ⇒ 先补 token」同源，都是**站点侧的来源校验**。
- 本篇是**工具复现式**（源文自陈「不介绍分析过程」）⇒ **不得**据此反推 §4.6 的双层结构；
  算法口径一律以 §4.6 为准。

### 4.7 同一次请求里的签名（别和媒体解密混在一起）

直播接口系常在同一个接口里既签名又返回加密播放地址：

```
signature = MD5( join( sort(keys(params)) 的 "k v" 拼接 ) + SALT )
```

- 排序是**字母序**（`Object.keys().sort()`），拼接**无分隔符**（`code_idbqzmios_status1match_id...`）。
- `SALT` 是**长固定串**（本例 84 字符，`yKBm0pKLdVcGbnu4XGon13TsyBdEsjj3WVAzszpoqjn3BNmovLgzvcRTxD1Wey7QQ10kcov0b8e9oBi7jAUR`），从 JS 里抄。
- 时间戳必须用**当前时间**，回放旧包必然失败。
- 这类题**与媒体流无关**：签名过了、拿到播放地址，才是本技能的第 2 步。

---

## 5. A 层配方：m3u8 明文 KEY

```bash
python .claude/skills/stream-drm-reverse/scripts/m3u8_probe.py <playlist.m3u8> --pretty
python .claude/skills/stream-drm-reverse/scripts/m3u8_probe.py <playlist.m3u8> --fetch-keys -o keys.json
python .claude/skills/stream-drm-reverse/scripts/media_crypto.py aes-cbc \
  --input seg0.ts --out seg0.clear.ts --key-hex <32位hex> --iv-hex <32位hex>
ffmpeg -v error -i seg0.clear.ts -f null -     # 0 error 才算过
```

- 若 m3u8 未给 IV：`m3u8_probe.py` 会按媒体序列号算出 IV 并打印，直接用它。
- 分片用 `--strip-crc16`（尾部 2 字节校验，见 C 层）。

### 5.0 无 Python 时的命令行兜底（`openssl` + `copy /b`）与它的两个真陷阱

> 源文 `52pojie-977455`（2019-06）。**适用场景**：只有一台装了 openssl 的机器、
> 分片已经用 `wget -i url.txt` 全量下到本地、且只想验证「这个 key 对不对」。
> ⚠️ 它**不是**本技能的主推路线（主推 §5 的 `m3u8_probe.py` + `media_crypto.py`，能自动算 IV）；
> 这里收录是因为**源文那两条命令本身有坑，照抄必踩**。

```bash
# ① 从 #EXT-X-KEY 的 URI 取 key，转 hex（16 字节 ⇒ 32 位 hex）
#    源文样例：F1BE8491D4E9DA2275B2055DFC4A2E17
# ② 逐分片解密
openssl enc -aes-128-cbc -d -nosalt -K <32位hex> -iv <32位hex> -in index0.ts -out clear0.ts
# ③ 合并（Windows CMD；Linux 用 cat clear*.ts > all.ts）
copy /b *.ts all.ts
```

**★ 陷阱一：`-K` 与 `-k` 不是大小写随意。** 源文**正文**写「`-k` 是加密的 key」，**命令行**却写 `-K`——
两处不一致。实测（`b40-hls-cli-check.sh` 第 1 组，OpenSSL 3.5.7）：

| 写法 | 语义 | 产物 |
| --- | --- | --- |
| `-K <32位hex>` | **裸 key**（Raw key, in hex） | 正确 |
| `-k <同一串>` | **口令**，先走 KDF（默认摘要 `sha256`，旧版 `md5`）派生 key | 解出来是乱码（**不报错**） |

⇒ 判据：**HLS 的 key 是「已经 16 字节的裸 key」，永远用大写 `-K`**。
若拿到的是「口令」才用 `-k`，那时**加解密两侧的 `-nosalt` 必须同时出现**（不带就是默认加盐，
两侧不一致会 `bad decrypt`）；而用 `-K` 时 `-nosalt` **对结果没有影响**（不走 KDF）——
所以源文那条命令里 `-nosalt` 是**冗余但无害**的，别以为它必需。

**★ 陷阱二：`copy /b *.ts` 的分片顺序是「文件名字典序」，不是数值序。**

```
glob 顺序（实测）= index0.ts index1.ts index10.ts index11.ts index2.ts
```

⇒ **一旦分片序号超过 9 而文件名没有零填充，合并出来的视频就是乱的**（而且**不报错**）。
两条修法：① 下载时就重命名成零填充（`index00000.ts`，与 §5.1 的 `zfill(5)` 同理）；
② 显式按顺序列文件，不要用通配符。
**同一坑的 Linux 版**：`cat *.ts > all.ts` 的 glob 顺序也一样是字典序。

> **更稳的收尾**：合并后**不要只看能不能播**，跑一次
> `ffmpeg -v error -i all.ts -f null -`（§10.2 同款机械动作），有错就说明顺序或 IV 有问题。

### 5.1 整片 AES 解密的工程实现（2019 年某站样本）

> 源文 `52pojie-1056398`。这条链路的价值在**工程骨架**：从「挑 m3u8」到「并发下分片」到「ffmpeg 合成」
> 一次串完，且**失败单独计数**。挑选判据见 §1.5。

**加密判据（★ `key == IV`）**：

```python
if 'URI="key.key"' in r.text:
    key_url = re.sub("index.m3u8", "key.key", m3u8_url)   # 分片名换成 key.key 即密钥地址
    key = requests.get(key_url, headers=headers).text
    cryptor = AES.new(key, AES.MODE_CBC, key)             # ★ 第三参数是 IV，这里直接传 key
```

- **`AES.new(key, AES.MODE_CBC, key)` ⇒ `key == IV`**：IV 直接用 key 本身，**没有单独的 IV 值**。
  这是「**站点把 IV 偷懒取成 key**」的一类实现，见到 `AES.new(k, MODE_CBC, k)` 直接照抄，别再找 IV。
- **判据写法**：m3u8 文本里含 `URI="key.key"` ⇒ 密钥就在**同目录的 `key.key`** 下，把分片名替换掉即可。
  ⚠️ `key.key` 是该站点约定的**文件名**（站点特定，改版即失效），不是规范；
  这里的替换同时体现了「**相对分片名 / 相对密钥名按 m3u8 目录拼绝对地址**」这条通用判据。
- **与 W 族的边界**：`key-wrapper-families.md` 里「同一串既当 key 又当 IV」是**切片式**（前 16 / 后 16）；
  本条是**整串复用**（`key` 与 `iv` 同一个值），**属同族另一样本**，不要与切片式混为一谈。

**分片收集（★ 序号补齐 5 位）**：

```python
ts_list = []
for index, ts in enumerate(re.findall('(\w*?\.ts)', r.text)):
    ts_list.append((str(index).zfill(5), m3u8_url.replace("index.m3u8", ts)))
```

- `str(index).zfill(5)`：**序号补到 5 位**，既保证合成顺序（`00000` < `00001` < …），也便于排序 / 断点续传。
- URL 拼接 `m3u8_url.replace("index.m3u8", ts)` —— **相对分片名按 m3u8 目录拼绝对地址**（同一判据）。

**下载（`gevent` 协程池 + 失败单独计数）**：

```python
pool = gevent.pool.Pool(50)
# 每个分片中 try/except：成功解密写盘，失败 c += 1（★ 不静默吞掉）
print(f"下载完成 失败:{c}/{b}")
```

- ★ **失败计数单独统计**（`c`），不要 `except: pass` 静默吞掉 —— 否则「缺了几片」要到 `ffmpeg` 合成时才暴露。

**合成（Windows CMD + ffmpeg concat）**：

```bat
(for %a in (*.ts) do @echo file '%a') > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy 学习资料.mp4
del /Q *.ts
del /Q list.txt
```

- `(for %a in (*.ts) do @echo file '%a') > list.txt`：**Windows CMD 语法**（`%a` / `>` / `@echo`），
  生成 `ffmpeg concat` 用的文件清单（每行 `file 'xxx.ts'`）。
- **`-c copy` = 不重编码**（流直接拷贝，合成本身不解码，快且无损）。
- **`-safe 0` 的必要性**：`concat` 默认走「安全」协议白名单，清单里出现**相对路径 / 特殊协议路径**时
  会被拒绝（报 `Unsafe file name`）⇒ 传 `-safe 0` 才允许。
- 合成后 `del /Q *.ts` / `del /Q list.txt` 清理中间产物（源文还会 `exit`）。

---

## 6. B 层配方：key 由 JS 拼或由接口给

**动作顺序（照抄，不要跳）**：

1. 在 Sources 里全局搜 `decryptdata`、`EXT-X-KEY`、`aes-128`、`decryptkey`、`DRMKey`，**全部下断点**再刷新。
2. 命中的那个变量（如 `this.decryptkey`）先**转 hex 打出来**，用 `media_crypto.py` 直接解一个分片，
   **先验证「这个 key 是对的」再去找它是怎么来的**——顺序反了会白追一大圈。
3. 回溯链：`decryptkey ← new Uint8Array(XXXKey) ← config.XXXKey ← 上一层的 config ← ... ← 接口响应`。
   跟到**换 JS 文件**处通常就是边界，往上一步就是「接口返回密文、JS 解密后得到 key 与 URL」。
4. 用抓包工具**只搜 Response Body** 找那串密文（如 `annex_secret` / `o` / `v`），确认来源接口。
5. 把接口的 AES 解密抄成 Python（第 4 节 4.2 起各派生式之一），**与浏览器控制台结果逐字节对拍一次**。

> 该案例作者最后承认「其实一开始就在控制台看到 key 了」——**B 层的性价比最高动作永远是「先断点打出 key 并用它解一个分片」**，
> 而不是先追回溯链。追链只在你需要**长期稳定批量**时才有必要。

**两条省事的旁路（先试，再决定要不要追链）**：

1. **「名字像」的函数往往不是那个函数**。实测：断在 `onkeyload` 上拿不到 key，
   改断 `loadsuccess` 立刻拿到 16 字节明文 key。
   ⇒ **按「拿到 16 字节」这个结果挑断点，而不是按函数名挑**；名字可疑的函数全部下上，
   哪个先出明文就是它。
2. **播放器自己会把明文 key 缓存的地方**：
   - 有的站点在同一响应里**顺手给了两个 `blob:` 地址**——一个是 m3u8 内容、一个就是 16 字节明文 key，
     直接复制即可（不必读 JS）。
   - 有的把 key 放在 wasm 堆的**固定偏移**上，取证方式就是读内存定址（如从
     `Module.HEAPU8.buffer` 的某个偏移处取 16 字节）。**这条能免掉整个算法还原**，
     但代价是**偏移会随版本变**——只适合「一次性拿样本」，要长期稳定仍得回到算法。

---

## 7. C 层配方：ES/NALU 逐帧加密

```bash
# 1) 先看清结构：PID、PES、NAL 起始码、NAL 头是否明文
python .claude/skills/stream-drm-reverse/scripts/ts_probe.py <seg0.ts> --pretty
python .claude/skills/stream-drm-reverse/scripts/ts_probe.py <seg0.ts> --nalu --pid <PID> --pretty

# 2) 逐 NALU 解密（自动跳过 NAL 头、做 nal_unescape、校验并剪掉尾部 CRC16）
python .claude/skills/stream-drm-reverse/scripts/ts_probe.py <seg0.ts> \
  --decrypt-nalu --out seg0.clear.ts --key-hex <32位hex> --iv-hex <32位hex> --crc16
```

**实现要点（顺序不能错）**：

```
切 NAL → 保留 NAL 头明文 → payload 去防竞争字节(nal_unescape)
       → 校验尾部 2 字节 CRC16（key/轮次对不对的唯一本地信号）
       → 解密 payload → 二次 CRC16 校验 → 拼回 TS
```

- **`nal_unescape` 必须在解密之前**，且**不能重复做**（`nal_escape` 不幂等）。
- **两次 CRC16 校验**（解密前 + 解密后）是这类目标的标志性设计，见 `references/license-and-key-hierarchy.md`。
  跳过校验的代价是：解错了也一路往下走，最后表现为「随机花屏」。
- 只解**视频 PID**；音频（`0xC0~0xDF`）通常不加密，硬解会把音频毁掉。
- 加密只覆盖**部分 NAL 类型**时（如仅 IDR），按 `nal_unit_type` 过滤；判据是「解出来是合法 NAL 头的那些不该再动」。

> **`METHOD=SAMPLE-AES` 有独立的覆盖粒度**（每 160 字节只加密 16 字节、末块留明文、IV 每 NALU 重置），
> **不要套 A 层的连续块解密**；`scripts/nalu_frame_crypto.py sample-aes-range/sample-aes` 专治这一档。
>
> **本层的形态分类（整体 / 文件头 / PES / NALU 头 / NALU 内容）、`SAMPLE-AES` 的逐字节判据、
> 以及「算法在 wasm 里且导出函数带环境检测」时的两条调用路线（`wasm2c` vs `wasm2wat` 改导出表），
> 全部在 `references/frame-encryption-and-wasm-decryptors.md`。** 只要出现
> 「有声音花屏」「部分 NALU 解了部分没解」「本来能播、改完反而不能播」，直接翻那一份。

---

## 8. D 层配方：接口字段解密

典型形态：一次响应同时给出**密文播放地址**与**密文 key**，JS 用固定算法还原。

- 密文常是 **base64**；key/IV 的生成方式归入第 4 节的四类之一。
- `encrypt_info` 这类字段常见做法是「AES 解密后得到一段 JSON 配置」，里面**直接写着 Provision / License 服务器 URL**
  ——这是进入 E 层的入口。
- 校验方式：**解出的 JSON 能被 `json.loads` 且字段名与 JS 里读的属性一致**，即算过。

---

## 9. RPC 免扣兜底

当加密函数与浏览器状态耦合很深（wasm + 会话状态 + worker），**扣代码的边际收益会迅速变负**。此时把浏览器当 oracle：

```js
// 页面控制台注入（sekiro 式；框架自带 web client 脚本）
var _mscript = document.createElement("script");
_mscript.src = "https://<rpc-host>/sekiro-doc/assets/sekiro_web_client.js";
document.body.appendChild(_mscript);
// 注册 action：内部直接调用页面里已经存在的 window.encrypt / window.decrypt
client.registerAction("ojbk", async function (request, resolve, reject) {
  const s = window.encrypt(`${request['url']}|${Math.floor(Date.now() / 1e3)}`);
  const n = await Ut(`/v2/jx1`, s, "POST");
  resolve(JSON.stringify({ url: window.decrypt(n.url) }));
});
```

```python
import requests
print(requests.get("http://127.0.0.1:5620/business-demo/invoke",
                   params={'group': 'test', 'action': 'ojbk',
                           'url': 'https://v.qq.com/x/cover/xxx/yyy.html'}).text)
```

**硬约束与边界**：

- **页面必须一直开着**（XHR 断点放行后不要关），否则 oracle 消失。
- 请求里的时间戳是**当前秒**，说明加密有 1 秒级时效——脚本要「取即用」，不要缓存结果。
- 适合「短平快、拿一次真实地址」；要**长期稳定**再回头扣代码。
- 注入方式除控制台外还可用油猴；**先解除 XHR 断点再放行**，否则请求会一直挂住。

---

## 10. 交付前必做的两件机械动作（都有现成脚本）

### 10.1 把远程 KEY 本地化 —— 交给下载器之前

拿到 key 之后，手工「写 `key.key` + 把 m3u8 里的 URI 改掉 + 放同一目录」是每道题都要做一遍的动作，
而且**漏掉任何一步都表现为下载器在运行时才炸**。用脚本一次做对：

```bash
S=.claude/skills/stream-drm-reverse/scripts
python $S/m3u8_rewrite.py playlist.m3u8 -o local.m3u8 --key-file key.key --key-hex <32位hex>
python $S/m3u8_rewrite.py playlist.m3u8 -o local.m3u8 --key-file key.key --base <分片基地址> --strip-query
python $S/m3u8_rewrite.py playlist.m3u8 --dump-urls segs.txt --pretty      # 只要分片清单
```

**容易漏的一条**：分片 URL 上的时效 token（`?upt=` / `?token=` / `?wsSecret=`）
**必须扩散到每个分片**。只给 m3u8 带 token 是「m3u8 能下、ts 403」的常见来源。

**更省事的替代路线：把 key 内联进 m3u8，连 key 文件都不用落地。**

```bash
S=.agents/skills/stream-drm-reverse/scripts
python $S/nalu_frame_crypto.py inline-key --key-hex <32位hex> --iv-hex <32位hex>
# -> #EXT-X-KEY:METHOD=AES-128,URI="base64:AAECAwQFBgcICQoLDA0ODw==",IV=0x...
```

`URI="base64:<b64>"` **不是 HLS 规范**，是**下载器约定**（主流下载器都支持）。
好处三条：① 少落地一个文件；② 不怕多码率列表漏改；③ key 与 m3u8 一起走，不会再出现
「m3u8 改好了、key 文件没拷过去」。缺点：**明文 key 进了 m3u8**，别把这种文件当可分享产物。

### 10.2 解密后长度变了 —— 必须重新封装 TS

`ts_probe.py --decrypt-nalu` 出的是**明文 ES**，不是能播的 TS。只要 ES 长度变了
（`nal_unescape` 会、文件头解密会、NALU 重排也会），原来的包布局就不再成立：

```bash
python $S/ts_repack.py seg0.ts --pid 0x100 --extract-es seg0.es      # 取出明文 ES（或解密后回写）
python $S/ts_repack.py seg0.ts --pid 0x100 --es seg0.clear.es -o seg0.clear.ts
python $S/ts_repack.py seg0.clear.ts --pid 0x100 --check --expect-es seg0.clear.es
ffmpeg -v error -i seg0.clear.ts -f null -                           # 唯一算数的验收
```

`ts_repack.py` 保留原 PES 头（**含 PTS/DTS**，重建头会丢时间戳）、按 NALU 起始码切分回填、
补 `adaptation field` 填充（`188 - 4 - 1 - offset - naluLen`），非目标 PID 逐字节原样通过。

---

## 11. 排错速查

| 现象 | 首查 | 次查 |
| --- | --- | --- |
| 解出来全是 `0x00` / 高熵乱码 | 加密起点（TS 头 / PES 头是否被加密） | key 的**编码形态**（hex 文本 vs 二进制 vs ASCII） |
| 能解出字节、`ffmpeg` 报 `Invalid NAL unit size` | 没做 `nal_unescape`，或 NAL 头长度判错（H264=1 / HEVC=2） | 尾部 CRC16 没剪掉 |
| 花屏但能播 | IV 用错（缺省 IV 未按媒体序列号推） | 逐 NALU 加密只覆盖部分 NAL 类型 |
| 只有声音 / 只有画面 | 音视频 PID 用了同一个 IV | 某一类流本就未加密，被误解 |
| 首帧坏、后面好 | IDR 帧用了不同 IV | CRC16 校验被跳过导致首帧被吞 |
| 换了码率就失败 | 每个码率的 `EXT-X-KEY` 不同 | 不同 CEK（E 层） |
| `md5` 派生式算出来不对 | `substring` 切的是**字符**不是字节 | `raw=true` / `hexdigest` 混用 |
| key 不是 16 字节（32/47/64 位、长 hex） | 站点对 key 做了二次构造 | 转 `key-wrapper-families.md` |
| 页面能播但网络面板看不到 m3u8/flv | 流由 JS 拼好后直接喂 MSE | 转 `player-and-live-capture.md` §2 |
| base64 解出的地址 403 / 含 `$0 $1 $2 $3` | 那是「基址」不是最终地址 | 同上 §3.1 |
| `AES.new` 抛长度异常 | key 长度不是 16/24/32 | 把 hex 文本当成了二进制密钥（或反之） |
| 接口响应解不开 | `Latin1` vs `utf-8` 编码口径 | `s0` 是运行时算出来的，静态数组读不到 |
| 解密后文件大小对、ffmpeg 报 NALU size | 明文 ES **长度变了**，TS 包布局失效 | 走 §10.2 的 `ts_repack.py` |
| m3u8 能下、分片 403 | 时效 token 没扩散到分片 URL | 走 §10.1 的 `m3u8_rewrite.py --strip-query` 或补 token |
| 下载器报「填充错误」 | key 不是内容 key（还差一层包装） | 见 `vendor-key-schemes.md` §3 判据表 |
| key 文件是 **32 / 33 字节** | 一层 AES-CBC 包装（见 §4.6） | 解出后取**前 16 字节**；33 字节先去掉尾部 1 字节 |
| 抓到 m3u8 **一解就是明文**、清晰度还低 | 抓的是 `hls_url`（明文专用，分辨率锁死，见 §1.4） | 改抓 `hls_h5e_url` / `hls_enc_url` |
| 断在「名字像」的函数上**拿不到 key** | 名字与职责不符（`onkeyload` 是壳） | 换 `loadsuccess` 一类；或直接找播放器缓存的 `blob:` / 堆偏移 |
| **有声音、花屏** | C 层（NALU 内容加密） | 逐字读 `frame-encryption-and-wasm-decryptors.md` §1–§3 |
| 解出来「**部分画面正常、部分仍花屏**」 | wasm 导出壳带环境检测，或选错了近似变体 | 同上 §5（绕壳 / 逐字节 diff 两个变体） |
| **本来能播、改了「解密」反而不能播** | 解密写在了解复用之后，SPS 已被当明文解析 | 同上 §6（把解密提到 `case 7` 内、`ExpGolomb` 之前） |
| ★ 分片**全部下完**、只有**合并**这一步报错 | key 解密密码不对（双层族的**假成功**） | 见 §4.6.1 判据 4；同时回查 `vid` 是否取了**带后缀的全名** |
| 拿到的是 **`.pdx`** 而不是 `.m3u8` / `.ts`，下载器直接失败 | 厂商自封装容器（某利威 / polyv 系） | 走 §4.6.2：`--custom-hls-method Polyv --custom-hls-key <16 字节> --seed-const <n>` + `-H "Referer:…"`；v13 还要 `--binary-merge` |
| `--custom-hls-key` 填了却仍报 key 错 | 编码形态填错（hex 字面量 vs base64 字面量） | 解出来**必须是 16 字节**（§4.6.2 表）；别把 `--seed-const` 当成它的派生来源 |
| ★ 分片**能播**、只有**开头一小段**画面/声音不对 | 用了全零 IV（或固定 IV）解全部分片 | 见 §1.3：改按「媒体序列号」逐片推 IV |
| ★ `openssl` 解出来是乱码但**不报错** | 用了小写 `-k`（口令 KDF）而不是 `-K`（裸 key） | 见 §5.0 陷阱一 |
| ★ 合并后出现**周期性错位**、文件能播但内容顺序乱 | `copy /b *.ts` 走了文件名字典序（`index10` 排在 `index2` 前） | 见 §5.0 陷阱二：零填充重命名或显式列顺序 |
