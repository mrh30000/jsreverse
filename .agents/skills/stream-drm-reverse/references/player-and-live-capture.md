# 直播流捕获 / 播放器侧 / 反录制 —— 唯一权威源

> **本文是「拿不到 m3u8」「拿到 m3u8 却 403」「解开了却抓不到流」这一类问题**的判据与处置唯一权威源。
> 与 `hls-and-ts-structure.md` 的分工：那份讲**分片内部结构**（TS/PES/ES/NAL），
> 本文讲**流是怎么被找到、被抢到、被播出来的**（B/D 层 + 播放器层）。
> 结构化结论来源：B14 蒸馏（21 篇），含 4 个「PC 端抓不到、移动端能抓到」的实测案例。

## §1 三条入口路线的选路判据（先选路，再动手）

| 现象 | 走哪条 | 为什么 |
| --- | --- | --- |
| 页面能播，DevTools 里**看不到**任何 m3u8 / flv 请求 | **§2 播放器侧**：MSE 源码注入 | 流可能由 `hls.js` 在 worker 里播、或 URL 由 JS 拼出来后直接喂给 MSE |
| PC 端抓不到、移动端能抓到；或只有 P2P/WSS 流量 | **§3 移动端 UA / 页面** | 站点按 UA 下发不同发行版：PC 走 P2P/WSS，移动端走 m3u8/flv |
| 能抓到接口，但返回的是**加密字符串**或**图片** | **§4 接口层** | 属 D 层；先 `media_crypto.py` 解接口，再回到本文 |

**判据前置**：先确认「流对象是 m3u8 还是 flv」——
`hls.js` 改写走 A/C 层解分片；**FLV 没有解分片这一步**，直接是「URL 签名 → 拼参数 → 请求」。

## §2 播放器侧：MSE 源码注入 / 污染 `MediaSource`（最稳的一条路）

**适用**：URL 由 JS 拼出来后直接喂 `SourceBuffer.appendBuffer()`，网络面板里看不出可复现的 URL 结构。

### §2.1 核心方法

污染的落点有四处，按「拿到东西的完整度」排序：

| 落点 | 拿到什么 | 备注 |
| --- | --- | --- |
| `SourceBuffer.prototype.appendBuffer` | **解密后的明文分片**（最适合直接 dump 成文件） | 解出来就已经是明文，不必知道 key |
| `MediaSource.prototype.addSourceBuffer` | `(mimeCodec, URL)` 的时序关系 | 配合上一个能知道"哪条流是哪条" |
| `Window.URL.createObjectURL` | blob 的对象 URL | 便于复现播放 |
| `hls.js` 的 `loadSource(URL)` | **真正的 m3u8 地址**（JS 拼出来的那一个） | 最省力，一步到位 |

### §2.2 dplayer / hls.js 系的具体钩子

```js
// ① hls.js：URL 入口
const H = window.Hls;
if (H) { const _ls = H.prototype.loadSource;
  H.prototype.loadSource = function (u) { console.log('[m3u8]', u); return _ls.apply(this, arguments); }; }

// ② MSE：明文分片
const _ab = SourceBuffer.prototype.appendBuffer;
SourceBuffer.prototype.appendBuffer = function (b) {
  window.__chunks = window.__chunks || []; window.__chunks.push(new Uint8Array(b));
  return _ab.apply(this, arguments);
};
// 落盘：__chunks.map(u => [...u].map(c => String.fromCharCode(c)).join('')).join('')
//        → btoa → 本地 atob 还原 → 拼成一个 .ts/.mp4
```

> ★ **落盘时必须走 base64 或 byte-array 通道**。直接 `JSON.stringify(Uint8Array)` 会得到
> `{"0":71,"1":64,…}` 而不是原字节 —— 这是这一族最常见的「拿到了却写不出」原因。

### §2.3 反录制：MSE 注入**什么时候会失效**

当站点把播放从 MSE 换成 **canvas 逐帧渲染**时，`appendBuffer` 根本不会被调用：

| 站点做法 | 判据（**看 DOM 而不是看代码**） | MSE 注入还能用吗 |
| --- | --- | --- |
| 标准 MSE（`<video>` + `SourceBuffer`） | 播放器容器里是 `<video>` | ✅ 可以，直接 dump 明文分片 |
| **canvas 自渲染** | 容器里是 `<canvas>`，**没有 `<video>`** | ❌ 失效 |
| 多路流分别渲染（如三分屏：底图 / 动画 / 笔迹） | 多个 canvas 叠在一起 | ❌ 失效，且**没有"一路视频"可删水印** |
| 字幕层单独渲染 | 文字是 canvas 画出来的 | 只影响字幕，不影响主画面 |

**canvas 路线的两个连带特征**（用来确证，而不是猜）：

1. wasm 体积**突然猛增** —— 因为它不只有解密库，还**内封装了视频解码库**；
2. JS 层出现 **YUV 原始流** —— canvas 需要 YUV 才能绘制。

> ⇒ **反录制的工程解法顺序**：MSE 注入（首选）→ 若见 canvas，则改走
> 「用 wasm 的 `importObject` 代理捕获全部环境取值 + 内存取证」（见
> `whitebox-and-wasm-crypto.md` §7），不要试图 hook `drawImage`（帧率与调用量都不现实）。

### §2.4 ffmpeg 重封装时的已知噪声

```
[mp4 @ …] Application provided invalid, non monotonically increasing dts to muxer in stream 1: 75168 >= 74242
Error muxing packet
```
这是**下载/合并顺序**问题，不是解密问题。处置：换容器（MKV）或改用「先本地下载再解密」两段式，
不要据此回头怀疑 key。

## §3 移动端 UA / 移动端页面（「PC 抓不到」的标准解法）

**实测三例**（同一站点的 PC 与移动端是两套发行版）：

| 站点类型 | PC 端 | 移动端 |
| --- | --- | --- |
| 某牙直播 | P2P + WSS，抓不到地址 | 页面源码里有 `liveLineUrl`（base64） |
| 某奇艺直播 | `hcdnlive://…` **私有 scheme** | `formatType=TS` 的 `hlslive…m3u8` |
| 某音网页直播 | 走签名接口 | FLV 直链（见 `vendor-key-schemes.md`） |

**做法**：改 UA 或直接访问移动域名（`m.` 前缀），**再从页面源码里找**：

- 源码里的 `liveLineUrl` / `streams[]` / `playUrl` 常是 base64 ⇒ 解出来就是地址；
- 解出来的地址**可能仍 403**：因为它是**给播放器看的"基址"**，真实请求还要拼参数（见 §3.1）。

### §3.1 base64 解出来的地址 403 ⇒ 一定是「基址」而不是「最终地址」

实测规律（`52pojie-1602878`）：

1. base64 解出的地址里含 **`$0 $1 $2 $3` 占位符** ⇒ 这是**模板**，必须替换；
2. 参数是**分层拼出来**的：`wsSecret`/`wsTime` 一类**先对「不变的参数串」求 md5**，
   再与 `uid`/`uuid`/`seqid` 等拼进模板；
3. `uuid` 常是**动态派生**（`Date.now()%1e10*1e3 + Math.random()*1e3`），
   但**同一场直播内可复用** ⇒ 抓一次当常量用即可；
4. 最后一步错得最离谱也最常见：**域名与路径要改**（`al.flv.huya.com` / `.m3u8 → .flv`）。

> 判据：**`403` 不是「被封」，而是「拿到的不是最终地址」**。
> 处置顺序：解 base64 → 找占位符 → 找 `md5(拼接串)` 的盐 → 补动态参数 → 改域名/后缀。

## §4 接口层返回值的两种伪装（D 层）

| 伪装 | 特征 | 处置 |
| --- | --- | --- |
| **返回一张"裂图"** | 响应头是图片、内容以文本打开是密文 | 明文可能是「按键值对生成的假 png」；先按文本读，再 `media_crypto.py` 解 |
| 返回 hex/`\uXXXX` 文本 | 载荷里 `url` / `time` / `key` 三个参数 | 见下 |

### §4.1 「每次请求参数都不同但我能复现」的通用配方（实测）

```
url  = encrypt(原视频地址)
time = encrypt(Date.now())
key  = encrypt( sign( hex_md5(time + 原视频地址) ) )
```

判据：

- `encrypt` 是**自写字符表滚动**（不是标准 base64）⇒ 先跑 §6 字母表守卫；
- `encrypt` 里常含**随机前缀字符** ⇒ 所以「同一输入两次结果不同」是**正常**的，
  不要据此判断「有会话状态」；
- 响应回来的是 **AES 密文 + `aes_key`/`aes_iv` 明文返回** ⇒ 属「响应自带 key/iv」家族，
  直接照用（见 `vendor-key-schemes.md`）。

### §4.2 某鹅通式「key 接口少一个参数」

`URI` 指向的接口直接请求会失败，因为 JS 请求时**在 URL 后追加了 `&uid=<页面浮动的用户ID>`**。

判据与处置：

- 全局搜索接口路径片段（如 `…material-center…get`），看拼 URL 的那一行；
- `window.USERID` / `window.USERID` 一类**全局常量**直接在控制台打印即可；
- ★ 这类站点常把真实 key 做成**二次加密**（见 `key-wrapper-families.md`）。

## §5 EME / CDM 拦截（E 层的「不读许可证」打法）

当站点用的是**浏览器原生 EME** 而不是自建许可证接口时，不要去找 `GetLicense`，
直接拦截**标准化 API** 拿最终密钥：

```js
// 油猴脚本（在页面上下文注入）
(function () {
  const orig = MediaKeySession.prototype.addEventListener;
  const func = function () {
    if (arguments.length === 2 && arguments[0] === "message") debugger;   // 断在密钥交付那一刻
    return orig.apply(this, arguments);
  };
  func.prototype = orig.prototype;
  func.toString = orig.toString.bind(orig);      // 防 `toString` 检测
  MediaKeySession.prototype.addEventListener = func;
})();
```

- `addEventListener("message")` 命中时，**上一层栈帧**里就有 `o.keys`（即最终解密密钥）。
- 另外两个可拦落点：`navigator.requestMediaKeySystemAccess`（拿 KID / key system）、
  `MediaKeys.createSession`（拿 session 类型）。

### §5.1 「拦截 `atob` 拿密钥」这条路什么时候会断

原作者的做法是：注意到 `play_licenses` 响应里有 base64 数据 ⇒ 假设 JS 用 `atob` 解码 ⇒ 拦 `atob` 命中。
**三种情况下它会失效**，遇到就必须换路：

| 情况 | 判据 | 换哪条路 |
| --- | --- | --- |
| JS 用了**自实现 base64 解码**（不调 `atob`） | 拦 `atob` 一次都不命中 | 拦 EME API（本节） |
| 响应里不是 base64，而是 **hex / 字节流的十六进制表示** | 响应体全是 `0-9a-f` | `media_crypto.py` 按 hex 解 |
| 页面**混淆到搜不到特征字符串** | 全局搜 `license` / `key` 零命中 | 拦 EME API + 栈帧回溯 |

### §5.2 判定「视频文件用了哪种 DRM」的**离线**手段（不需要浏览器）

对拿到的视频文件跑（任一即可，互为交叉验证）：

```bash
strings video.mp4 | grep Handler
exiftool -HandlerDescription video.mp4
ffprobe -v quiet -select_streams v:0 -show_entries stream_tags=handler_name \
  -of default=noprint_wrappers=1:nokey=1 video.mp4
```

`handler_name` / `HandlerDescription` 会直接写出 DRM 系统名（如 `Widevine` / `PlayReady`），
比在 JS 里翻要快一个数量级。Bento4 的 `mp4info` 不是必需 —— 上面三条命令在任意环境都能跑。

## §6 网页上的 `blob:` / 私有 scheme 地址怎么办

`blob:https://x/…` 与 `hcdnlive://…` 都**不能直接下载**。处置：

1. 先按 §2 在 MSE 落点抓**明文分片**（最省事，绕开地址问题）；
2. 或按 §3.1 反向拼出**可下载的 `http(s)://` 地址**（改 scheme + 补参数）；
3. 道路 B：把页面里已经解好的 `Blob` 用 FileSaver 落盘（仅适合小体积）。

## §7 坑表

| 坑 | 症状 | 判据 / 修法 |
| --- | --- | --- |
| 把 M3U8 地址当成"加密了" | 花时间逆算法 | 先看有没有 `EXT-X-KEY`；没有 ⇒ 直接下（`m3u8_probe.py` 判层） |
| PC 端死磕 | 抓到的全是 P2P/WSS 流量 | 切移动端 UA / `m.` 域名（§3） |
| 把「基址」当最终地址 | 403 | 找 `$0 $1 $2 $3` 占位符 + md5 盐（§3.1） |
| `JSON.stringify(Uint8Array)` 落盘 | 得到 `{"0":…}` 不是字节 | 走 base64 / byte-array 通道（§2.2） |
| 见到 canvas 还在 hook MSE | 永远抓不到 | 看 DOM 判据（§2.3），改走 wasm 取证 |
| 认为「同一输入两次结果不同」= 有状态 | 白做一轮会话对齐 | 随机前缀字符是**设计**（§4.1） |
| 只在下载器里填 key 不去核 `METHOD` | 遇到厂商 METHOD 直接失败 | 先 `m3u8_probe.py`（`AES-128-PES` / `AES-128-ECB` 见 SKILL.md 分层表） |
| 「合并时报 dts 非单调」当成解密失败 | 反复重解 | 是容器/顺序问题（§2.4） |
| 一次性抓「所有分辨率」 | 拿到的多码流混在一起 | 把 `main.m3u8` 换成 `2000.m3u8` / `4000.m3u8` 逐档取（并非每档都存在） |

## §8 与其它文档的边界

- **拿到 key 之后**（远程 KEY → 本地 `key.key`、去时效 query）→ `scripts/m3u8_rewrite.py`
- **分片内部分层 / 加密覆盖范围** → `hls-and-ts-structure.md`
- **key 是二次构造的** → `key-wrapper-families.md`（**先跑它的字母表守卫**）
- **厂商级 key 配方与 URL 差值法** → `vendor-key-schemes.md`
- **wasm 内存取证 / 白盒** → `whitebox-and-wasm-crypto.md`