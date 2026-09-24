---
name: stream-drm-reverse
description: 流媒体 / 视频点播 / 直播流 / 电子书的内容加密链路逆向技能：先定位「加密发生在哪一层」，再逐层解密。触发词：`m3u8`、`ts`、`EXT-X-KEY`、`METHOD=AES-128`、`SAMPLE-AES`、`AES-128-PES`、`AES-128-ECB`、`decryptdata.key`、`qiniuDRMKey`、`encrypt_info`、`protectedLicenses`、`GetLicense`、`GetProvision`、`service_name=mdcm`、`KID`、`CEK`、`CENC`、`cenc:pssh`、`cbcs`、`enca`、`cdm`、`widevine`、`playready`、`FairPlay`、`skd://`、`tokenVideoKey`、`h5e`、`liveLineUrl`、`streamName`、`bilidrm`、`data-keys`、`mp4decrypt`、`pywidevine`、`.wvd`、`KeyDive`、`wvdumper`、`MediaKeys.createSession`、`requestMediaKeySystemAccess`、`generateRequest`、`videojs-contrib-eme`、`SampleAesDecrypter`、`getAvcEncryptedData`、`funcNN_TEA`、`PES`、`NALU`、`HEAPU8`、`_emscripten_run_script`、`importObject`、`sekiro`、`ffmpeg -decryption_key`、`EPUB`。用户说「m3u8 解密/ts 解密/视频解析/去水印/无水印/直播源/切片解密/DRM/数字版权/白盒密码/白盒 AES/加密播放器/ffmpeg 重封装/电子书章节解密/下载器提示 key 错误/key 长度不是 16 字节/页面能播但网络面板看不到 m3u8 只能看到一堆 png/m3u8 地址解出来 403/播放器是 canvas 而不是 video/录屏会被录上浮动水印/视频能下载但不能播放/花屏/只有前几帧正常/拿到播放地址/authKey/ddCalcu/蜻蜓FM/听书网」时都应使用本技能。
---

# 流媒体 / 视频内容保护逆向

一句话：**先把「加密发生在哪一层」定下来，再谈算法。**

这一族 80% 的返工来自层判错——最常见的是把 E 层（DRM 许可证体系）当成 A 层（m3u8 的 AES-128）做，
费两天扣不出来；其次是 C 层（ES/NALU 逐帧加密）当 A 层做，**解不报错、只是花屏**。

> 判据、结构常量与坑表都在 `references/` 里；本文只给分层判据与执行顺序。
> **C 层（帧加密）单独有一份权威源**：`references/frame-encryption-and-wasm-decryptors.md`
> ——帧加密五形态、`SAMPLE-AES` 的逐字节覆盖粒度、EBSP 严格/宽松分歧、
> 「算法在 wasm 里且导出函数带环境检测」时的两条调用路线（`wasm2c` vs `wasm2wat` 改导出表）、
> 以及 hls.js 侧的五个 hook 点。**只要出现「有声音花屏 / 部分 NALU 解了部分没解 /
> 本来能播、改完反而不能播」，先去那一份。**

## 分层判据（30 秒分流）

| 现象 | 层 | 先做什么 |
| --- | --- | --- |
| **目标是「拿到一个能直接播的地址」，还没到解开密文** | **§0 地址还原层**（视频/直播/音频站的接口链路） | `references/playback-address-interfaces.md` §1 定层 → §2/§3/§3A/§3B/§4 按站型走 |
| 地址里带 `authKey` / `vf` / `ckey` / `ddCalcu` / `sign` | **§0 + 签名参数** | 同上 §2；配方查 `../reverse-knowledge` 蓝图（`iqiyi-cmd5x` / `tencent-ckey` / `migu-playurl` / `douyu-live` / `qingting-fm`） |
| **APP 端取直播源**：请求头有 `Play-Ua` / 请求体有 `secretToken`，密钥是「前缀 + 资源 + native」拼出来的 | **§0 · APP 接口层** | 同上 §3A（三段拼接密钥 + 双端参数差异 + native 只做校验） |
| **接口 200，但响应里的 `playUrl` / `playurl` 仍是密文** | **§0 之后还差一层（D 接口层）** | 同上 §3A：**HTTP 200 ≠ 拿到可播地址**；源文未公开算法时**不许编** |
| **分享短链（`v.kuaishou.com/s/…` 一类）要 mp4「无水印直链」** | **§0 地址还原层（直链）** | 同上 §3B（落点是 `srcNoMark` / `origin_video_download` 这类**另一个字段**） |
| **播放页 HTML 里捞到好几条 m3u8，不知哪条在播** | **A 层前置：挑选** | `references/hls-and-ts-structure.md` §1.5（「重复出现次数最多」只当第一猜想） |
| **试看只有 N 秒 / m3u8 路径带 `_preview` / 拿不到完整 playlist** | **预览门控层**（§0 与 A 层之间） | `references/preview-gating-and-segment-enumeration.md` §1 二分判据 → §3 分片枚举补齐 |
| m3u8 里有 `#EXT-X-KEY:METHOD=AES-128,URI="..."` | **A 容器层**：整片同一 key | `scripts/m3u8_probe.py <playlist.m3u8>` |
| **拿到的 key 不是 16 字节**（32/47/64 位、或一长串 hex） | **W 包装层**：key 被二次构造过 | `scripts/key_wrapper.py alpha-check --enforce` → 再解 |
| m3u8 里**没有** KEY，但 JS 里有 `decryptdata.key` / `this.decryptkey` / `qiniuDRMKey` | **B 播放器层**：key 由 JS 拼或由接口给 | 断点打 `decryptdata.key`；`license_parse.py mdcm` |
| m3u8 有 KEY、解出来仍花屏 / 只有一部分画面正常 | **C ES 层**：加密在 PES 之后的 NALU 上 | `scripts/ts_probe.py <seg.ts>`；`references/frame-encryption-and-wasm-decryptors.md` §1 |
| `METHOD=AES-128-PES` | **C 层（厂商扩展）**：只加密 **PES 载荷** | `m3u8_probe.py` 会直接标出；`ts_probe.py --nalu` |
| `METHOD=SAMPLE-AES` | **C 层**：**苹果那套「每 160 字节只加密 16 字节」** | **别当连续块解**；`scripts/nalu_frame_crypto.py sample-aes-range --len <N>` |
| `METHOD=AES-128-ECB` / `-CTR` / `SM4-*` | **A 层（厂商扩展）**：模式/长度不同 | 见 `m3u8_probe.py` 的模式提示；**别套 CBC 的 padding** |
| `METHOD=NONE` 出现在**全部** KEY 上 | **PLAIN**：这份列表本身没加密 | 别在这层找 key，去看 B/C/E 层 |
| 响应字段是密文（`encrypt_info`、`o`/`v`、`url`、`params`） | **D 接口层**：与媒体流无关 | `scripts/media_crypto.py` |
| 出现 `protectedLicenses` / `GetLicense` / `GetProvision` / `KID` / `CEK` / `CENC` | **E DRM 许可证层** | `references/license-and-key-hierarchy.md` |
| 分片是 `.m4s`/`.mp4`，`mp4info` 显示 `[ENCRYPTED] Coding: enca` / `Scheme Type: cbcs` | **E 层 · CENC/CBCS** | `mp4decrypt` / `ffmpeg -decryption_key`；`references/widevine-cdm-and-eme.md` |
| 清单里有 `cenc:pssh` / `KEYFORMAT="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed"` / `skd://` | **E 层 · 国际派（Widevine / FairPlay / PlayReady）** | `references/widevine-cdm-and-eme.md` §0 判派 → §2 三步链 |
| 网络里有个 `bilidrm` 小文件（含公钥），或页面用 ClearKey | **E 层 · ClearKey（明文 key）** | 同文 §4：SPC → CKC → KEY，三步就完 |
| 页面用 `requestMediaKeySystemAccess` / `MediaKeys.createSession` / `generateRequest` | **E 层（EME 变体）**：不走自建许可证 | 断 `generateRequest` 与 `message` 事件；见 `references/widevine-cdm-and-eme.md` §5 与 `player-and-live-capture.md` §5 |
| **请求头/HTML 里出现 `data-keys="…, …, …, …"`（4 个 int32）** | **W6 外部掩码异或**（key 长度正常，下载器却报 key 错） | `scripts/key_wrapper.py dataview-xor --mask <4个int32>` |
| `.key` 返回 16 字节、下载器报「key 不正确」 | **W6 或 W1**（长度正常 ≠ 没有包装） | `key_wrapper.py dataview-xor`；当 ASCII 读得出来吗 |
| **网络面板里只有一堆 `.png`，没有 Media 请求** | **伪装层**：分片被拼上图片头 | `scripts/container_disguise.py locate/strip <伪图片>` |
| 清单里没有 KEY，但 JS 里有 `decryptdata.key` / `this.decryptkey` / `qiniuDRMKey` | **B 播放器层**：key 由 JS 拼或由接口给 | 断点打 `decryptdata.key`；`license_parse.py mdcm` |
| 加密函数在 wasm 或 wasm2js 产物里 | **F 白盒 / wasm 层** | `references/whitebox-and-wasm-crypto.md` |
| 内容不是分片，而是「一章一份的加密正文」（EPUB / PDF / 阅读器章节接口） | **容器层** | `references/ebook-and-container-drm.md` |
| 分片只有**文件头**被加密，或解密后长度变了、ffmpeg 报 NALU size | **回写层** | `scripts/ts_repack.py`（§10.2） |
| 页面能播，但**网络面板看不到 m3u8/flv 请求** | **播放器侧** | `references/player-and-live-capture.md` §2（MSE 源码注入） |
| **PC 端抓不到**、移动端能抓到；或只有 P2P/WSS | **发行版差异** | 换移动 UA / `m.` 域名，再从**页面源码**里找（§3） |
| base64 解出的地址 **403**，或含 `$0 $1 $2 $3` | **不是最终地址** | 占位符替换 + `md5(拼接串)` 盐 + 改域名后缀（§3.1） |
| 播放器容器是 **`<canvas>` 而不是 `<video>`** | **反录制层** | MSE dump 失效，改走 wasm 取证（§2.3） |
| 函数找得到但扣不出来、环境补不动 | **RPC 免扣**兜底 | 见下文「RPC 兜底」 |
| 只是接口**签名**算不出、媒体流本身没加密 | 不是本技能 | `web-reverse-algorithm` |

`m3u8_probe.py` 会直接给出「本播放列表属于 A 层还是 B/C 层」的结论——**先跑它，不要先读 JS**。

## 工作流

1. **抓全三件套**：`m3u8`（含 master 与 media 两级，注意 `#EXT-X-STREAM-INF`）、**至少一个分片**、以及**拿 key 的那个接口**。
   只抓分片不抓接口，会在第 4 步原地打转。
2. **判层**（上表）+ **定「key/IV 从哪来」**——四类来源：
   | 来源 | 特征 | 处置 |
   | --- | --- | --- |
   | 明文 `#EXT-X-KEY URI` | m3u8 里直接给 key 地址 | 取回 16 字节即用；注意 IV 缺省时用**媒体序列号**（`EXT-X-MEDIA-SEQUENCE`）当 IV |
   | 接口返回 | 一次响应里同时有密文 URL 与 key | 见 D 层 |
   | **派生**（无 key 请求） | 全程抓不到 key 请求，但 JS 里有 `MD5(固定串)` / `ptk + video_id` | 走 B 层：把派生式完整抄下来，见 `references/hls-and-ts-structure.md` |
   | 许可证 | 有 `GetLicense` 响应 | 走 E 层 |

   > 四类都试不出来、或接口字段「看着像密文」时，**先查 `references/vendor-key-schemes.md` §3 判据表**：
   > 那里有 13 个实测配方的「现象 → 先试哪一招」，命中即省 1~2 天。

3. **🔴 CHECKPOINT · key 是不是 16 字节（B14 新增，插在动手解分片之前）**：
   拿到的 key 不是 16 字节 ⇒ **100% 还有一层包装**，先别怀疑算法或 IV。
   ```bash
   python $S/key_wrapper.py alpha-check --table "<JS 里的字符表>" --enforce   # ★ 先跑这个
   python $S/key_wrapper.py noise-check --enforce                             # 噪声字符是否三侧都忽略
   ```
   按结构签名快速对号（完整族表见 `references/key-wrapper-families.md` §2）：
   | 结构签名 | 族 | 命令 |
   | --- | --- | --- |
   | base64 文本 + `charCodeAt(i) ^ token[i % d]` | W1 重复 XOR | `key_wrapper.py xor --mode b64-xor-b64` |
   | 首字符 + 末 3 字符「不参与」解码；末 3 的中间位是个位数 | W2 字符表滚动 + 噪声 | `key_wrapper.py xiaoe` |
   | 整个响应是 hex，还原后含固定标记串与前后各 13 位数字 | W3 定长正文 | `key_wrapper.py xm` |
   | 响应同时给两段等长串 | W4 两半异或 | `key_wrapper.py xor-halves` |
   | **许可接口（如 `play_licenses`）下发的带 `1-` 前缀 base64 文本** | W7 前缀剥离 + 隔 2 异或 | 见 `references/key-wrapper-families.md` §6.6 复算 |

4. **🔴 CHECKPOINT · 单分片闭环（必做）**：先只解**一个**分片，用 `ffmpeg` 试播：
   ```bash
   ffmpeg -v error -i seg0.ts -f null -            # 0 error 才算过；只看「能解出字节」不算
   ```
   - 能播 → 整片批量解，进第 5 步。
   - **不报错但花屏 / `Invalid NAL unit size` / `no frame`** → 你大概率在 C 层而不是 A 层，回第 2 步。
5. **落算法**：按层选实现（A 用 `media_crypto.py aes-cbc`；C 用 `ts_probe.py` 定位后逐 NALU 解；B 把派生式抄成 Python；E 走许可证三层解）。
6. **重封装验证**：`ffmpeg -i 解密后的.ts -c copy out.mp4`。**只有这一步过了才算解密成功**——`crc`/长度对不对都是间接证据。
   - **解密后的 ES 长度变了**（`nal_unescape`、文件头解密、NALU 重排都会）⇒ 原包布局失效，
     必须先 `scripts/ts_repack.py` 重新封装（保留 PES 头 / 按 NALU 起始码回填 / 补 adaptation field），见 §10.2。
   - 交给下载器之前，先 `scripts/m3u8_rewrite.py` 把远程 KEY 本地化成 `key.key`，见 §10.1。
7. **工程化收尾**：key、IV、许可证都带时效（活体 token 常 1~5 分钟过期），
   把「取 key → 解密 → 重封装」串成一次执行，不要分开跑两遍。
   - ★ W 族的 token 常含**时间戳/md5**（如 `md5(md5(格式化时间/1000 + key))`），
     这条时效最紧：**必须一次跑完「取 token → 解 key → 解分片」**。

## 失败模式与一线修复

| 触发条件 | 一线修复 | 仍失败兜底 |
| --- | --- | --- |
| 分片解出来是垃圾 / 全 `0x00` | 密文不是从文件首字节开始（TS 包头、PES 头未被加密），或 IV 用错 | `ts_probe.py` 看 `PES_packet_length` 与 NAL 起始码，只解 payload |
| **解不报错但花屏** | 逐 NALU 加密只覆盖部分 NAL 类型，或 NAL 头不参与加密 | 见 `references/hls-and-ts-structure.md`「加密覆盖范围判据」 |
| **有声音、画面花** | C 层 NALU 内容加密 | `references/frame-encryption-and-wasm-decryptors.md` §1–§3 |
| **部分 NALU 解了、部分没解**（花屏位置不固定） | wasm 导出壳函数带环境检测，或选错近似变体 | 同上 §5（绕壳 / 逐字节 diff `func58` vs `func60`） |
| **本来能播、改完「解密」反而不能播** | 解密写在了**解复用之后**，SPS 已被当明文解析 | 同上 §6（解密提到 `case 7` 内、`ExpGolomb` 之前） |
| 帧加密是 `SAMPLE-AES`，按连续块解出 90% 垃圾 | 该模式**每 160 字节只加密 16 字节** | `scripts/nalu_frame_crypto.py sample-aes-range/sample-aes` |
| key 文件是 **32 / 33 字节** | 一层 AES-CBC 包装 | 解出后取**前 16 字节**（`hls-and-ts-structure.md` §4.6） |
| 抓到的 m3u8 **一解就是明文**、清晰度还低 | 抓的是 `hls_url`（明文专用，分辨率锁死） | 改抓 `hls_h5e_url` / `hls_enc_url`（§1.4） |
| 只有声音没画面 / 只有画面没声音 | 音频与视频**用了不同的 KID/IV**，或音频不需要解密 | 按 PID 分流，别用同一个 IV 通吃 |
| 卡在首帧、后面正常 | 关键帧（IDR）用了不同 IV，或 CRC16 校验被跳过导致首帧被吞 | 查 `dcm` 的 `a` 标志与尾部 2 字节 CRC |
| 换了分辨率/清晰度就解不开 | 不同码率对应不同 `EXT-X-KEY` 或不同 CEK | 分别取，不要跨码率复用 key |
| 重封装后时长对但画面错位 | 解密后**长度变了**（padding / CRC 未剪掉） | 明文长度必须与容器声明的 `PES_packet_length` 对齐 |
| key 每次刷新都变 | key 由时间戳 / 随机数派生 | 把派生式（含盐）完整抄下来，随手抓一次 key 当 oracle 对拍 |
| 解密后大小对、ffmpeg 报 `Invalid NAL unit size` | 明文 ES 长度变了，TS 包布局失效 | `scripts/ts_repack.py --es` 重新封装 |
| m3u8 能下、分片 403 / 内容错 | 时效 token 没扩散到每个分片 URL | `scripts/m3u8_rewrite.py --strip-query` 或给分片补 token |
| 下载器报「填充错误」 | 手上这把不是内容 key，还差一层包装 | `references/key-wrapper-families.md`（**先跑 §6 字母表守卫**） |
| 拿到的 key 是 **32 / 47 / 64 位**，不是 16 字节 | 是 hex 文本 / base64 文本 / 拼接串，不是密钥本身 | 同上；长度本身就是第一判据 |
| 换了个视频就解不开，或隔几分钟就失败 | 包装里含 UID / 时间戳（会话相关） | 把「取 token → 解 key → 解分片」串成一次执行 |
| ★ 页面能播，网络面板里**没有任何** m3u8/flv 请求 | 流由 JS 拼好后直接喂 MSE | `references/player-and-live-capture.md` §2 源码注入 |
| ★ PC 端怎么抓都没有，移动端一抓就有 | 站点按 UA 下发两套发行版 | 换移动 UA / `m.` 域名，再从**页面源码**找（§3） |
| ★ base64 解出的地址 **403** | 那是「基址」不是最终地址 | 找 `$0 $1 $2 $3` 占位符 + `md5(拼接串)` 盐 + 改域名后缀（§3.1） |
| ★ 容器是 `<canvas>`，录屏还带上浮动水印 | 反录制：自解码 + 自渲染，不走 MSE | MSE dump 失效，改走 wasm 取证（§2.3） |
| 合并时报 `dts non monotonically increasing` | 下载/合并顺序，非解密 | 换 MKV，或改「先下载再解密」（§2.4） |
| ★ 网络面板**只有一堆 `.png`**、没有 Media 请求 | 分片被拼上**真图片头**（图床白嫖） | `scripts/container_disguise.py locate <伪图片>` → `strip --offset N` |
| ★ `.key` 是 16 字节、下载器却报 key 错 | **W6**：掩码不在 JS 里（在 DOM 属性 / 常量数组） | `key_wrapper.py dataview-xor --mask <4个int32>` |
| ★ license 请求 200 但 key 是空的/假的 | 没设 **service certificate**（Privacy Mode） | 先 POST `\x08\x04` 拿证书 → `set_service_certificate`（`widevine-cdm-and-eme.md` §2） |
| ★ `mp4decrypt` 直接报错 | 它必须显式 `--key KID:KEY` | 或换 `ffmpeg -decryption_key <KEY>`（免 KID） |
| ★ Postman/curl 能过、脚本过不去 | CDN 强制 **HTTP/2** + TLS 指纹 | 改用 HTTP/2 发包，别只改 cipher 顺序 |
| ★ 直播源**看一会就断** | 地址里带 `wsAuth`/`token`/`expire`/`did` ⇒ 短效，不是解析失败 | 长期化三步：换稳定 CDN + 从 `.flv?` 截断 + 清清晰度后缀（`references/live-source-longevity.md` §0/§1） |
| ★ **本地能取、服务器取不到**（关键字段为空） | **机房 IP 黑名单**，不是算法问题 | 先做本地 vs 线上同请求 A/B；处置走代理 IP 池（同上 §3） |
| ★ 抄来的页面串里出现 `amp;` / `&#182;` / `×` | **HTML 实体残留**（三个已确认实例） | 一律先搜这三个模式再拼串（同上 §2） |
| ★ m3u8 **只有很少几个分片、且路径含 `_preview`** | 服务端侧试看门控：`_preview` 后缀 = 服务端**只下发试看切片**（不是前端截断） | `references/preview-gating-and-segment-enumeration.md` §3 按分片序号枚举补齐（**连续 3×404** 停） |
| ★ **去掉 `_preview` 后缀无效** | 受控点在服务端：改 URL 不改授权（源文实测此路无效） | 同上 §2 处置分叉 → §3 分片枚举；连可预测分片名也没有则属「放弃」档 |
| ★ **接口 200、`playUrl` 仍是密文**（base64、尾部 `==`） | 判据：**HTTP 200 ≠ 拿到可播地址**，先看响应字段是不是密文 | `references/playback-address-interfaces.md` §3A；源文未公开算法时**不许编** |
| ★ APP 里 native 方法「点进去没算法」 | 先看 `return` 形态：**只做 APP 签名校验**的方法不用逆 | 同上 §3A.3（判「参与计算 vs 只做校验」） |
| ★ 想「去水印」却去找水印字段删 | 落点是**另一个字段**（`srcNoMark` / `origin_video_download`） | 同上 §3B；随机 `did` 只需同会话内一致，不必复现 |
| ★ `ffmpeg -f concat` 报 `Unsafe file name` | 清单里是相对 / 特殊协议路径，默认安全策略拒绝 | 加 `-safe 0`（`hls-and-ts-structure.md` §5.1） |
| ★ 分片**全部下完**、只有**合并**这一步报错 | key 解密密码不对（双层族典型**假成功**） | `hls-and-ts-structure.md` §4.6.1（判据 4） |

## 反例黑名单（不要做的事）

- **不要用「m3u8 里没有 KEY」推断「没有加密」**。B 层与 E 层都不在 m3u8 里写 KEY，判据是 `decryptdata.key` / `GetLicense` 是否存在。
- **不要用「拿到 16 字节 key 了」推断「包装层已经没有了」**。W 族的产物**也可能是 16 字节**；
  反过来，**不是 16 字节就一定是包装层**。这条判据单向成立（B14）。
  **B22 第二次应验**：W6（外部掩码异或）的产物就**正好 16 字节**，表现只是"下载器报 key 错"。
  补充判据：**"当 ASCII 读得出来吗"**（真实 key 常是 16 个可打印字符）；W6 见 `key-wrapper-families.md` §6.5。
- **不要因为「页面上是 `<video>` 却看不到 Media 请求」就以为走的是 MSE 加密**。
  先看是不是**分片被伪装成了图片**（`container_disguise.py locate`）——这一类连"加密"都还没有。
- **不要在噪声字符非 ASCII 空白时假设「三侧行为一致」**。实测 Python / Node / 浏览器处置可以是「忽略 / 静默改字节 / 抛错」三种（`atob('YQxx==') → "aq"`，不报错、长度还对）。
  **判据必须在目标运行时里实测**，且 `n == 0` 的样本永远暴露不出这个问题。
- **不要照抄文档里的字符表 / 字母表**。先跑 `key_wrapper.py alpha-check`（覆盖性 + 单射性），
  数学约束比「两篇文章都这么写」强。实测案例：`…789-=+` 缺 `/`；某 IR 的 base64 表 `D` 重复。
- **不要把 `substr(x, y)` 当成 `substring(x, y)`**：前者第二参数是**长度**，误用会把「窗口长度随下标变化」写成常量，
  且错位后解出的仍**是合法 base64 字符**（静默）。
- **不要在 `METHOD=NONE` 的列表里找 key**。NONE 是 HLS 标准值（该段不加密）；
  若视频仍不可播，加密在 B/C/E 层。
- **不要一上来读 wasm 算法**。F 层先用 `importObject` 代理把 JS 侧取值全捕获，很多时候直接调用比读算法快一个数量级（`references/whitebox-and-wasm-crypto.md`）。
- **不要对 TS 全文件做 AES-CBC**。TS 的 188 字节包头、PES 头、NAL 头通常**不加密**；从文件首字节开始解会得到「能解出字节但完全没法播」的结果，而且**不报错**。
- **不要把 `SAMPLE-AES` 当连续块解**。它是「每 160 字节只动 16 字节、每 NALU 重置 IV、末块留明文」，
  连续 CBC 解出来 90% 是垃圾，表现仍是「能跑、花屏」；判据与工具见 `references/frame-encryption-and-wasm-decryptors.md` §2。
- **不要把 `nal_escape` / `nal_unescape` 当成幂等操作**。对已编码数据再 escape 会持续膨胀；
  正确顺序是「unescape → 解密 → escape」，每步一次，且站点用严格还是宽松实现要实测（§3）。
- **不要用「页面能播」推断「SPS 没被加密」**。写文件时先落一份明文 SPS/PPS 很常见，
  流里会有**两份 SPS**，播放器用第一份照样播（§1）。
- **不要把「解出来是合法 UTF-8 / JSON」当成功**。D 层的密文解出 JSON 只说明接口层对了，媒体流可能还是加过密的。
- **不要在只有一组明文密文对时反推白盒 key 就宣称完成**。白盒 AES 的 key 是写死的，**必须换一个随机输入再对拍一次**（`references/whitebox-and-wasm-crypto.md` 的差分法自带这条断言）。
- **不要把国际派与国内派 DRM 混着打**。看到 `pssh`/`KID`/`enca` 就走 `widevine-cdm-and-eme.md`（`mp4decrypt` / `ffmpeg -decryption_key`）；
  看到 `mdcm`/`protectedLicenses`/TLV 才走 `license-and-key-hierarchy.md`。**两派的判据与工具完全不通用。**
- **不要在没设 service certificate 的情况下就断定"license 通了"**。请求会 200、key 会是空的；
  **两次提交**（第一次 `\x08\x04`）才是国际派的正常形态（B22）。
- **不要挑「长的那个 pssh」**。mpd 里常有两个 `cenc:pssh`：**长的给 PlayReady、短的给 Widevine**（不确定就排序取最短）。
- **不要跳过 CRC16 / HMAC 校验直接解**。这两处校验是**唯一能在本地区分「key 对但轮次错」和「key 错」的信号**；跳过会把错误往下一层推。
- **不要用「浏览器能播」证明本地链路已对齐**。带 `vmpTag` / `mediaTagID` 一类会话状态的链路，浏览器与本地结果**本来就可能不一致**，判据是本地解出的分片能否原样重封装（见 `references/whitebox-and-wasm-crypto.md` §5「路线四」）。

## 命令入口

前四条**可直接粘贴跑**（用的是文章真实数值 / 标准测试向量），后几条需要你自己的样本，参数名已标成 `<占位>`：

```bash
S=.claude/skills/stream-drm-reverse/scripts

# 0) 全脚本自检（AES/SM4 走 NIST 与国标测试向量，dcm 走往返，TS 走合成包）
python $S/playback_address.py --selftest
python $S/media_crypto.py --selftest
python $S/ts_probe.py --selftest
python $S/license_parse.py --selftest
python $S/m3u8_probe.py --selftest
python $S/key_wrapper.py --selftest
python $S/nalu_frame_crypto.py --selftest
python $S/container_disguise.py --selftest

# 0.7) ★ 分片被伪装成图片（网络面板只有 .png、没有 Media 请求）
python $S/container_disguise.py locate <伪图片或伪分片>          # 报出真实 TS 起点偏移 + 候选
python $S/container_disguise.py strip  <伪分片> -o out.ts [--offset N]

# 0.8) ★ W6 外部掩码异或（掩码常写在 DOM 属性 data-keys 上）
python $S/key_wrapper.py dataview-xor --input 80f5f48bd4a6d7ffd0e26a04f0d90e86 \
       --mask 3854078970,2917115795,3887476043,3350876132 --raw
python $S/key_wrapper.py dataview-xor --input-hex <32位hex> --mask-file masks.txt --allow-search

# 0.6) ★ C 层帧加密三件套（EBSP / SAMPLE-AES 粒度 / key 派生与内联）
python $S/nalu_frame_crypto.py ebsp-unescape payload.bin -o payload.clear.bin --loose
python $S/nalu_frame_crypto.py sample-aes-range --len 24411 --nalu-type 5 --pretty
python $S/nalu_frame_crypto.py split-derive --data "AAAABBBBCCCCDDDDeeeeffffgggghhhh:9f8e" --pretty
python $S/nalu_frame_crypto.py inline-key --key-hex <32位hex> --iv-hex <32位hex>

# 0.5) ★ W 包装层：先跑守卫，再解 key（三条都可直接跑）
python $S/key_wrapper.py alpha-check --table "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-=+" --enforce
python $S/key_wrapper.py noise-check --enforce
python $S/key_wrapper.py xor --mode b64-xor-b64 --input "aGVsbG8gd29ybGQ=" --key tok --raw

# 1) 判层：这个 m3u8 是 A 层还是 B/C 层（厂商扩展 METHOD 也会给出语义）
python $S/m3u8_probe.py <播放列表.m3u8> --pretty
python $S/m3u8_probe.py <播放列表.m3u8> --fetch-keys -o keys.json    # 明文 KEY 直接取回

# 2) 容器层：AES-128-CBC / AES-256-CBC / SM4-CBC 解分片
python $S/media_crypto.py aes-cbc --input seg0.ts --out seg0.clear.ts --key-hex <32位hex> --iv-hex <32位hex>
python $S/media_crypto.py aes-cbc --input seg0.ts --out seg0.clear.ts --key-utf8 <16字符> --iv-utf8 <16字符> --strip-crc16
python $S/media_crypto.py sm4-cbc --input seg0.ts --out seg0.clear.ts --key-hex <32位hex> --iv-hex <32位hex>
python $S/media_crypto.py sm4-ecb --input blk.bin --out blk.clear.bin --key-hex <32位hex>   # 无填充！

# 3) ES 层：看 PES / NAL 分层、service_name、CRC16，再逐 NALU 解
python $S/ts_probe.py <seg0.ts> --pretty
python $S/ts_probe.py <seg0.ts> --nalu --pid <PID> --pretty
python $S/ts_probe.py <seg0.ts> --decrypt-nalu --out seg0.clear.ts --key-hex <32位hex> --iv-hex <32位hex> --crc16
python $S/license_parse.py mdcm --service-name "mdcm|s1:9:10|a0|vd70b0e7a262f4cc52b667901eb2e8b9d|e1|f497006|" --pretty

# 4) 许可证层：TLV 单元解析（本地要先备好 base64 后的 license）
python $S/license_parse.py tlv --input license.b64 --pretty

# 5) 交付前：把远程 KEY 本地化成 key.key（并可批量绝对化 / 去时效 query）
python $S/m3u8_rewrite.py <播放列表.m3u8> -o <local.m3u8> --key-file key.key --key-hex <32位hex>
python $S/m3u8_rewrite.py <播放列表.m3u8> -o <local.m3u8> --base <分片基地址> --strip-query
python $S/m3u8_rewrite.py <播放列表.m3u8> --dump-urls segs.txt --pretty

# 6) 地址差值法（直播源 / 直链：把「不变段」与「时效参数」分离）
python $S/m3u8_rewrite.py --diff-url "<抓包A的URL>" "<抓包B的URL>"
python $S/m3u8_rewrite.py --diff <A.m3u8> <B.m3u8>

# 6.5) ★ §0 地址还原层：四个可复算 oracle（详见 references/playback-address-interfaces.md）
python $S/playback_address.py charcodes --input "*104*116*116*112*115*58*47*47*97"     # 字符码表族
python $S/playback_address.py qingting --id 1234 --ts-unix 1758700000                    # 蜻蜓FM HMAC-MD5
python $S/playback_address.py migu-ddcalcu --url "<咪咕 h5 地址（带 puData）>" --json       # 咪咕字符交织
python $S/playback_address.py iqiyi-authkey --tm 1625936950392 --tvid 8485811691506600   # 爱奇艺 authKey

# 7) 解密后重新封装 TS（长度变了也照样能播）
python $S/ts_repack.py <seg>.ts --pid 0x100 --extract-es <seg>.es
python $S/ts_repack.py <seg>.ts --pid 0x100 --es <seg>.clear.es -o <seg>.clear.ts
python $S/ts_repack.py <seg>.clear.ts --pid 0x100 --check --expect-es <seg>.clear.es

# 8) ★ W 包装层四族还原与造夹具（`xiaoe`=`-encode`，族与参数详解见 references/key-wrapper-families.md）
python $S/key_wrapper.py xiaoe --input "<[xiaoe] 前缀之后的密文>" --salt appbgzjnopv1917
python $S/key_wrapper.py xm --input "<signCoen 的完整 hex 串>"
python $S/key_wrapper.py xor-halves --input-hex <32位hex> --raw
python $S/key_wrapper.py noise-check --chars "-_! " --json
```

## RPC 兜底（D/F 层环境补不动时）

当加密函数依赖大量浏览器状态、扣代码成本远高于收益时，**把浏览器当 oracle**：在页面里把
`window.encrypt/decrypt` 挂出去，本地用 HTTP 调，不要扣代码。

- 桥接框架（sekiro / websocket-RPC）的注册与调用写法、以及「页面不能关」这条硬约束，见 `references/hls-and-ts-structure.md`。
- 这条路的适用边界：**只要能稳定复现一次调用**就划算；目标是长期批量、调用量很大时，再回头扣代码。

## 资源

- `references/live-source-longevity.md`：**直播源「长期化」唯一权威源（B31 新增）** ——
  §0 一句话判据（地址带 `wsAuth`/`token`/`expire`/`did` ⇒ 必然短效，长期化 = 切「不变段 + 时效段」）、
  斗鱼三步改写（二级域名→`tx2play1`、从 `.flv?` 截断、清晰度后缀；**必须 HTTP** + `_4000p` 兜底）、
  虎牙（`hyPlayerConfig` 内联 JSON / `"state":"ON"` 开播判据 / `str_replace('amp;','')`
  —— **HTML 实体残留的第三例，三例已升格为通用判据**）+ **手机 UA `m.huya.com` 一条正则出源**、
  B 站三接口关系（③ = ① + ②；② 未开播也有 `durl` ⇒ 接近永久源）与
  **★★ 机房 IP 黑名单**（本地绿、线上红且关键字段为空 ⇒ 先怀疑 IP 段，别在请求头上打转）、
  asx 容器作为长期源的交付形态、8 行排错表。
- `references/playback-address-interfaces.md`：**§0 地址还原层（视频 / 直播 / 音频站取地址）唯一权威源** ——
  定层判据（§0 与 A–F 的分界）、长视频三段式链路（爱奇艺 `cache.video.iqiyi.com/dash` +
  `authKey=md5(md5("")+tm+tvid)` 与清晰度成套参数 / 腾讯 `proxyhttp` + `auth_refresh` 会话自举 +
  `cKey` 多行值、**腾讯旧版 `getinfo` 变体二**（§2.2c：`keyid` 重建文件名 + `ul.ui[3]` 基址）/
  咪咕三级链 + `ddCalcu` 字符交织）、直播源两条路线（斗鱼免签 `hlsH5Preview` vs
  动态签名、抖音 `reflow/info` 一次拿 rtmp+hls、小红书 `__INITIAL_STATE__` 书签脚本）、
  **§3A 移动 APP 直播源**（`Play-Ua` DESede + `secretToken` HMacMD5 + 「前缀+资源+native」三段拼接密钥 +
  native 只做校验的审计判据 + iOS/Android 参数差异；HTTP 200 ≠ 拿到可播地址）、
  **§3B 短视频去水印直链三形态**（`srcNoMark` / `origin_video_download` / 易语言 COM 对照）、
  音频站两族（字符码表 `*104*116*…` / 蜻蜓FM HMAC-MD5）、「拿到地址但播不了」总表与各级边界。
- `scripts/playback_address.py`：**§0 层的四个可复算 oracle** —— `charcodes`（字符码表族，含前导空段 /
  UTF-16 码元 / 越界码点三类守卫）、`qingting`（蜻蜓FM HMAC-MD5，`--ts-case` 暴露源文未证的大小写）、
  `migu-ddcalcu`（字符交织，断言结构而非具体值）、`iqiyi-authkey`（含**源文自带的两条样例 URL 对拍向量**）。
  `--selftest` 自带（断言数**以实跑输出为准**，勿手抄；含 1 个负对照「换口令签名必须不同」与 5 条拒绝路径）。
- `references/hls-and-ts-structure.md`：HLS/m3u8 全字段语义与判层、**多候选 m3u8 的挑选判据（§1.5）**、
  TS→PES→ES/NALU 分层、
  **加密覆盖范围判据**、key/IV 四类来源与派生式、A/B/C/D 层实战配方、
  **整片 AES 的工程骨架（§5.1：`key==IV` + `zfill(5)` 序号 + gevent 并发 + `ffmpeg -safe 0` 合成）**、
  RPC 桥接、排错速查。
- `references/preview-gating-and-segment-enumeration.md`：**试看门控 / 索引被截断的补齐（B32 新增）** ——
  受控点二分判据（URL 带 `_preview` 后缀 ⇒ **服务端侧**，去掉后缀实测无效）、前端截断 vs 服务端侧的处置分叉、
  **分片名可预测 ⇒ 按序号枚举**（从 `0` 起、**连续 3 个 404** 停、末尾升序两位数字）、
  试看 m3u8 的 key/IV 相对路径拼法与 `Content-Length: 16` 判据、
  该案例 5 条安全缺陷（**L0 静态密钥 → L3 动态鉴权**）与 Python 枚举骨架、排错表。
- `references/key-wrapper-families.md`：**key 二次构造 / 包装层（W 族）唯一权威源** ——
  W1~W4 四族结构签名与还原、**W6 外部掩码异或（int32 / `DataView` 默认大端 vs `Uint32Array` 平台端序）**、
  W5 **字母表守卫**（覆盖性 / 单射性 / 越界下标）、
  **噪声字符三侧宽容度矩阵**（Python / Node / 浏览器对同一字符可分别为「忽略 / 静默改字节 / 抛错」）、
  `substr` vs `substring` 导致的「窗口长度随下标变化」、两处「录入错必须自己算」的实例、「不报错但结果错」坑表。
- `references/player-and-live-capture.md`：**直播流捕获 / 播放器侧 / 反录制唯一权威源** ——
  三条入口路线的选路判据、**MSE 源码注入四处落点与 `Uint8Array` 落盘陷阱**、
  **反录制判据（`<video>`+MSE 可 dump vs `<canvas>` 自渲染失效 + 两个确证特征）**、
  移动端 UA 换发行版、**base64「基址」403 的三步处置**、接口层两种伪装、`blob:` / 私有 scheme、已知 dts 噪声。
- `references/vendor-key-schemes.md`：**厂商 key 方案与接口配方唯一权威源** —— 13 个实测配方
  （腾讯云点播 `overlayKey`、百度 BCE DRM `tokenVideoKey`、某浪 V3key、m3u8 整表替换、固定口令 AES-ECB、
  SHA256 盐、响应自带 key/iv、`signter`、自描述密文、央视 h5e 的 `vmpTag` 派发、直播源 URL 差值法、
  清风DJ 内联 `DeCode`、Widevine/CDM 边界）+ 跨配方判据表 + 「不报错但结果错」坑表。
- `references/ebook-and-container-drm.md`：**容器型内容保护（EPUB / PDF / 在线阅读器章节接口）** ——
  与流媒体不同的分层判据、某东 PC/H5-1 的 `utf16ToBytes` 自写加解密、H5-2 的 `enc=1` 家族
  （**AES/DES 由时间戳奇偶切换**、`uuid`/`sign` 的派生与 `localStorage` 陷阱）、某学堂 EPUB 的
  双层 AES/ECB + 长度前置（`dpbt`）、拿到明文后的 EPUB 回填与验收。
- `references/license-and-key-hierarchy.md`：**国内派 E 层唯一权威源** —— CDRM/STSDK 式 **Provision → License** 全流程、许可证 TLV 单元编码、
  密钥层级（DevPrK → SessionKey/MACKey → CEK）、SM2/SM4/HMAC-SM3 参数口径、`mdcm` 与 `dcm` 混合模式、
  NALU 尾部 CRC16、ffmpeg 重封装接入点。
- `references/widevine-cdm-and-eme.md`：**国际派 E 层唯一权威源（B22 新增）** —— 判派表（CENC/CBCS/`enca` × `pssh`/`KID`）、
  Widevine **L1/L2/L3** 与"为什么 L3 可解"、**`0804` 固定值三步链（取证书 → `set_service_certificate` → challenge）**、
  长短两个 pssh 的归属、`.wvd` 三条提取路线（真机 KeyDive / AVD dumper / 在线）与 `create-device -l 3`、
  **ClearKey 三步（SPC → CKC → KEY）** 与 `mp4decrypt` / `ffmpeg -decryption_key` 两种解密、
  **EME 的两个 hook 点**（`generateRequest` / `message` 事件）与"不要顺 promise 跟栈"、
  HTTP/2 与 TLS 指纹这一类"Postman 能过脚本过不去"、老版 Widevine CDM DLL 代理（历史，作判据保留）、
  **把 CDM 包成本地 HTTP 服务**的工程形态（空闲端口 / 心跳 / debounce / 端口占用检查）、坑表 12 条。
- `references/whitebox-and-wasm-crypto.md`：wasm / wasm2js 白盒 AES 的**四条路线选择**、
  `importObject` 代理捕获环境、DFA 故障注入、**CTR+XOR 差分反推写死 key**、wasm VMP → IR 中间产物、
  AI 补环境重放 worker 的适用边界。
- `scripts/m3u8_probe.py`：零依赖 m3u8 解析与判层（master/media 两级、EXT-X-KEY/IV、媒体序列、字节范围）。
  自带 `--selftest`（断言数**以实跑输出为准**，不要在文档里手抄）；
  分层结论含 **PLAIN（只有 `METHOD=NONE`）** 与 **6 种厂商扩展 METHOD**
  （`AES-128-PES`→C、`AES-128-ECB`→C、`AES-256`、`AES-128-CTR`、`SM4-CBC`、`SM4-ECB`），
  未知 METHOD 才落 `A?` 并回填 `vendor_method` 字段供程序化分支。
- `scripts/key_wrapper.py`：**key 包装层（W 族）还原** —— `alpha-check`（字母表覆盖性 / 单射性 / 越界下标）、
  `noise-check`（噪声字符三侧宽容度矩阵）、`xiaoe` / `xm`（两个字符表滚动族，含与文章原样 JS 对拍过的 encode 方向）、
  `xor`（三段链 `b64→xor→b64`）/ `xor-halves` / **`dataview-xor`（W6 外部掩码异或，`--endian big|little`、`--allow-search`）**。
  自带 `--selftest`（断言数**以实跑输出为准**）；
  所有「静默出错」路径（末 3 字符非数字、表外字符、明文长度不符、空 XOR 密钥）一律**报错退出**。
- `scripts/ts_probe.py`：零依赖 TS 解复用（PAT/PMT/PES/`service_name`/CEI），NAL 切分、CRC16 与逐 NALU 解密。自带 `--selftest`（42 项）。
- `scripts/container_disguise.py`：**「分片被伪装成图片 / 加了文件头」的定位与还原（B22 新增）** ——
  不靠硬编码偏移，靠 **MPEG-TS 同步字节 `0x47` + 188 步长的连中数**定位真实起点；
  支持任意前缀长度、`--max-scan`、多解时**全部列出不静默取一个**、图片 magic 嗅探（PNG/JPEG/GIF/ICO…）。
  `--selftest` **21 项**（文章原样的 212 字节、0/1/7/100/188/213/1024 各前缀、随机数据无假阳性、多解可见、截断不崩）。
- `scripts/media_crypto.py`：纯 Python 零依赖 AES-128/192/256（ECB/CBC/CTR）+ SM4（ECB/CBC/CTR）+ `dcm` 混合模式 + CRC16 变体探针。
  自带 `--selftest`（**95 项**：FIPS-197 分组向量、**SP 800-38A 的 CBC/CTR 模式向量**、GB/T 32907 SM4 向量、dcm 往返、拒绝路径）；
  `--slow-selftest` 追加 SM4 **百万次迭代**标准向量（约 38 秒）。
- `scripts/m3u8_rewrite.py`：**播放列表本地化改写**（远程 KEY → 本地 `key.key`、相对分片绝对化、
  去时效 query、导出分片清单）**+ 地址差值法**（`--diff-url` / `--diff`）。自带 `--selftest`（37 项，含拒绝路径）。
- `scripts/ts_repack.py`：**解密后重新封装 TS** —— 保留原 PES 头（含 PTS/DTS）、按 NALU 起始码切分回填、
  重算 `adaptation_field` 填充、非目标 PID 逐字节通过；`--check` 严格校验（sync / CC / 填充 / ES 逐字节）。
  自带 `--selftest`（35 项，含拒绝路径）。这是 B8 遗留的「解密 → 重新封装」回写路径。
- `scripts/license_parse.py`：许可证 TLV 解析、`mdcm` service_name 解析、密钥层级一致性校验；
  SM3 / HMAC-SM3 为**完整实现**并用 GB/T 32905 标准向量自检（41 项）。
- 密钥包装的**通用骨架推断**（自描述密文 / 响应自带密钥 / 算法按时间戳或随机分支切换）→
  `../web-reverse-algorithm/references/08-mixed-crypto-segmentation.md`。
- 相关技能：接口签名 / 参数还原 → `../web-reverse-algorithm/SKILL.md`；wasm 反编译与内存语义 → `../wsam-reverse/SKILL.md`；
  播放器页面本身带反调试 → `../web-reverse-algorithm/references/07-antidebug-and-live-patching.md`；
  浏览器环境补全（会话 Cookie / 指纹）→ `../web-js-env-patcher/SKILL.md`。
