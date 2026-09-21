# HLS / TS 分层与 A~D 层实战配方

> 本文件是**分层判据与配方**的唯一权威源。SKILL.md 的 30 秒分流表由此展开。
> 许可证体系（E 层）见 `references/license-and-key-hierarchy.md`；wasm/白盒（F 层）见 `references/whitebox-and-wasm-crypto.md`。

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
- [10. 排错速查](#10-排错速查)

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
- **防竞争字节**：编码器把 payload 里的 `00 00 00/01/02/03` 改写为 `00 00 03 xx`。
  解密前必须先 **`nal_unescape`（删掉 `00 00 03` 里的 `03`）**，解密后如需重新封装再 `nal_escape` 回去。
  顺序写反（先解密再 unescape）会**静默产出错数据**。

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

### 4.5 同一次请求里的签名（别和媒体解密混在一起）

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

---

## 6. B 层配方：key 由 JS 拼或由接口给

**动作顺序（照抄，不要跳）**：

1. 在 Sources 里全局搜 `decryptdata`、`EXT-X-KEY`、`aes-128`、`decryptkey`、`DRMKey`，**全部下断点**再刷新。
2. 命中的那个变量（如 `this.decryptkey`）先**转 hex 打出来**，用 `media_crypto.py` 直接解一个分片，
   **先验证「这个 key 是对的」再去找它是怎么来的**——顺序反了会白追一大圈。
3. 回溯链：`decryptkey ← new Uint8Array(XXXKey) ← config.XXXKey ← 上一层的 config ← ... ← 接口响应`。
   跟到**换 JS 文件**处通常就是边界，往上一步就是「接口返回密文、JS 解密后得到 key 与 URL」。
4. 用抓包工具**只搜 Response Body** 找那串密文（如 `annex_secret` / `o` / `v`），确认来源接口。
5. 把接口的 AES 解密抄成 Python（第 4 节 4.2/4.3/4.4 之一），**与浏览器控制台结果逐字节对拍一次**。

> 该案例作者最后承认「其实一开始就在控制台看到 key 了」——**B 层的性价比最高动作永远是「先断点打出 key 并用它解一个分片」**，
> 而不是先追回溯链。追链只在你需要**长期稳定批量**时才有必要。

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

- **`nal_unescape` 必须在解密之前**。
- **两次 CRC16 校验**（解密前 + 解密后）是这类目标的标志性设计，见 `references/license-and-key-hierarchy.md`。
  跳过校验的代价是：解错了也一路往下走，最后表现为「随机花屏」。
- 只解**视频 PID**；音频（`0xC0~0xDF`）通常不加密，硬解会把音频毁掉。
- 加密只覆盖**部分 NAL 类型**时（如仅 IDR），按 `nal_unit_type` 过滤；判据是「解出来是合法 NAL 头的那些不该再动」。

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

## 10. 排错速查

| 现象 | 首查 | 次查 |
| --- | --- | --- |
| 解出来全是 `0x00` / 高熵乱码 | 加密起点（TS 头 / PES 头是否被加密） | key 的**编码形态**（hex 文本 vs 二进制 vs ASCII） |
| 能解出字节、`ffmpeg` 报 `Invalid NAL unit size` | 没做 `nal_unescape`，或 NAL 头长度判错（H264=1 / HEVC=2） | 尾部 CRC16 没剪掉 |
| 花屏但能播 | IV 用错（缺省 IV 未按媒体序列号推） | 逐 NALU 加密只覆盖部分 NAL 类型 |
| 只有声音 / 只有画面 | 音视频 PID 用了同一个 IV | 某一类流本就未加密，被误解 |
| 首帧坏、后面好 | IDR 帧用了不同 IV | CRC16 校验被跳过导致首帧被吞 |
| 换了码率就失败 | 每个码率的 `EXT-X-KEY` 不同 | 不同 CEK（E 层） |
| `md5` 派生式算出来不对 | `substring` 切的是**字符**不是字节 | `raw=true` / `hexdigest` 混用 |
| `AES.new` 抛长度异常 | key 长度不是 16/24/32 | 把 hex 文本当成了二进制 key（或反之） |
| 接口响应解不开 | `Latin1` vs `utf-8` 编码口径 | `s0` 是运行时算出来的，静态数组读不到 |
