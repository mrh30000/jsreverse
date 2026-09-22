---
name: stream-drm-reverse
description: 流媒体 / 视频点播 / 直播流 / 电子书的内容加密链路逆向技能：先定位「加密发生在哪一层」，再逐层解密。当目标站或 App 的播放地址、m3u8、ts 分片解不出来，或分片能下载却不能播放、播放花屏 / 绿屏 / 只有声音没画面 / 卡在首帧，或页面与接口里出现 `EXT-X-KEY`、`#EXT-X-KEY:METHOD=AES-128`、`METHOD=AES-128-PES`、`METHOD=AES-128-ECB`、`decryptdata.key`、`decryphtdata.key`、`qiniuDRMKey`、`encrypt_info`、`protectedLicenses`、`GetLicense`、`GetProvision`、`service_name=mdcm`、`KID`、`CEK`、`CENC`、`cdm`、`widevine`/`playready`、`overlayKey`、`tokenVideoKey`、`h5e`、`jsdecVOD`、`liveLineUrl`、`streamName`、`hcdnlive`、`MediaKeys.createSession`、`requestMediaKeySystemAccess` 时使用。覆盖 HLS/m3u8 与 EXT-X-KEY 语义（含厂商扩展 METHOD）、TS→PES→ES/NALU 分层与「整片 vs 仅 PES 载荷 vs 逐 NALU」覆盖范围判据、AES-128/256-CBC 与 SM4 内容解密、**key 二次构造 / 包装层（重复 XOR 三段链、字符表滚动 + 前缀标记 + 噪声插入、定长正文 + hex 标记串、两半异或、字母表覆盖性与单射性守卫）**、key/IV 四种来源（明文 URI、接口返回、固定串派生、DRM 许可证）、**直播流捕获（移动端 UA 换发行版、MSE 源码注入 dump 明文分片、base64「基址」403 与 `$0..$3` 占位符 / md5 盐拼最终地址）**、**播放器侧与反录制判据（`<video>`+MSE 可 dump vs `<canvas>` 自渲染失效、wasm 内封装解码库与 YUV 流的识别）**、**EME/CDM 拦截取 `eme.keys`**、厂商 key 配方与 URL 差值法、CDRM/STSDK 式 Provision→License（TLV、SM2、MACKey、HMAC-SM3、SM4-ECB 解 CEK）、iqiyi `mdcm` 的 `dcm` 混合模式（CTR + 周期性 XOR）与 NALU 尾部 CRC16、wasm / wasm2js 白盒 AES（DFA 与 CTR 差分反推写死 key）、wasm 媒体解密器内存取证（HEAPU8 dump / 地址差法 / `_emscripten_run_script` 打桩）与文件头解密、wasm VMP 反汇编到 IR、`importObject` 代理捕获环境取值、解密后重新封装 TS（保留 PES 头、重算 adaptation field）与 m3u8 本地化改写。用户提到 m3u8 解密、ts 解密、视频解析、直播源、切片解密、DRM、数字版权、白盒密码、白盒 AES、加密播放器、RPC 免扣（sekiro）、ffmpeg 重封装、EPUB / 电子书 / 在线阅读器章节解密、课件视频解密、**下载器提示 key 错误 / key 长度不对 / 填充错误**、**拿到的 key 是 32 位或 47 位或 64 位、不是 16 字节**、**页面能播但网络面板看不到 m3u8**、**PC 抓不到只有移动端能抓到**、**m3u8 地址解出来 403**、**播放器是 canvas 而不是 video**、**录屏会被录上浮动水印**、或说「视频能下载但不能播放 / 花屏 / 只有前几帧正常」时都应使用本技能。
---

# 流媒体 / 视频内容保护逆向

一句话：**先把「加密发生在哪一层」定下来，再谈算法。**

这一族 80% 的返工来自层判错——最常见的是把 E 层（DRM 许可证体系）当成 A 层（m3u8 的 AES-128）做，
费两天扣不出来；其次是 C 层（ES/NALU 逐帧加密）当 A 层做，**解不报错、只是花屏**。

> 判据、结构常量与坑表都在 `references/` 三个文件里；本文只给分层判据与执行顺序。

## 分层判据（30 秒分流）

| 现象 | 层 | 先做什么 |
| --- | --- | --- |
| m3u8 里有 `#EXT-X-KEY:METHOD=AES-128,URI="..."` | **A 容器层**：整片同一 key | `scripts/m3u8_probe.py <playlist.m3u8>` |
| **拿到的 key 不是 16 字节**（32/47/64 位、或一长串 hex） | **W 包装层**：key 被二次构造过 | `scripts/key_wrapper.py alpha-check --enforce` → 再解 |
| m3u8 里**没有** KEY，但 JS 里有 `decryptdata.key` / `this.decryptkey` / `qiniuDRMKey` | **B 播放器层**：key 由 JS 拼或由接口给 | 断点打 `decryptdata.key`；`license_parse.py mdcm` |
| m3u8 有 KEY、解出来仍花屏 / 只有一部分画面正常 | **C ES 层**：加密在 PES 之后的 NALU 上 | `scripts/ts_probe.py <seg.ts>` |
| `METHOD=AES-128-PES` | **C 层（厂商扩展）**：只加密 **PES 载荷** | `m3u8_probe.py` 会直接标出；`ts_probe.py --nalu` |
| `METHOD=AES-128-ECB` / `-CTR` / `SM4-*` | **A 层（厂商扩展）**：模式/长度不同 | 见 `m3u8_probe.py` 的模式提示；**别套 CBC 的 padding** |
| `METHOD=NONE` 出现在**全部** KEY 上 | **PLAIN**：这份列表本身没加密 | 别在这层找 key，去看 B/C/E 层 |
| 响应字段是密文（`encrypt_info`、`o`/`v`、`url`、`params`） | **D 接口层**：与媒体流无关 | `scripts/media_crypto.py` |
| 出现 `protectedLicenses` / `GetLicense` / `GetProvision` / `KID` / `CEK` / `CENC` | **E DRM 许可证层** | `references/license-and-key-hierarchy.md` |
| 页面用 `navigator.requestMediaKeySystemAccess` / `MediaKeys.createSession` | **E 层（EME 变体）**：不走自建许可证 | 拦截 `MediaKeySession.addEventListener("message")` 后在栈帧里取 `eme.keys`，见 `references/player-and-live-capture.md` §5 |
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
   五族快速对号（细节 `references/key-wrapper-families.md`）：
   | 结构签名 | 族 | 命令 |
   | --- | --- | --- |
   | base64 文本 + `charCodeAt(i) ^ token[i % d]` | W1 重复 XOR | `key_wrapper.py xor --mode b64-xor-b64` |
   | 首字符 + 末 3 字符「不参与」解码；末 3 的中间位是个位数 | W2 字符表滚动 + 噪声 | `key_wrapper.py xiaoe` |
   | 整个响应是 hex，还原后含固定标记串与前后各 13 位数字 | W3 定长正文 | `key_wrapper.py xm` |
   | 响应同时给两段等长串 | W4 两半异或 | `key_wrapper.py xor-halves` |

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

## 反例黑名单（不要做的事）

- **不要用「m3u8 里没有 KEY」推断「没有加密」**。B 层与 E 层都不在 m3u8 里写 KEY，判据是 `decryptdata.key` / `GetLicense` 是否存在。
- **不要用「拿到 16 字节 key 了」推断「包装层已经没有了」**。W 族的产物**也可能是 16 字节**；
  反过来，**不是 16 字节就一定是包装层**。这条判据单向成立（B14）。
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
- **不要把「解出来是合法 UTF-8 / JSON」当成功**。D 层的密文解出 JSON 只说明接口层对了，媒体流可能还是加过密的。
- **不要在只有一组明文密文对时反推白盒 key 就宣称完成**。白盒 AES 的 key 是写死的，**必须换一个随机输入再对拍一次**（`references/whitebox-and-wasm-crypto.md` 的差分法自带这条断言）。
- **不要跳过 CRC16 / HMAC 校验直接解**。这两处校验是**唯一能在本地区分「key 对但轮次错」和「key 错」的信号**；跳过会把错误往下一层推。
- **不要用「浏览器能播」证明本地链路已对齐**。带 `vmpTag` / `mediaTagID` 一类会话状态的链路，浏览器与本地结果**本来就可能不一致**，判据是本地解出的分片能否原样重封装（见 `references/whitebox-and-wasm-crypto.md` §5「路线四」）。

## 命令入口

前四条**可直接粘贴跑**（用的是文章真实数值 / 标准测试向量），后几条需要你自己的样本，参数名已标成 `<占位>`：

```bash
S=.claude/skills/stream-drm-reverse/scripts

# 0) 全脚本自检（AES/SM4 走 NIST 与国标测试向量，dcm 走往返，TS 走合成包）
python $S/media_crypto.py --selftest
python $S/ts_probe.py --selftest
python $S/license_parse.py --selftest
python $S/m3u8_probe.py --selftest
python $S/key_wrapper.py --selftest

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

- `references/hls-and-ts-structure.md`：HLS/m3u8 全字段语义与判层、TS→PES→ES/NALU 分层、
  **加密覆盖范围判据**、key/IV 四类来源与派生式、A/B/C/D 层实战配方、RPC 桥接、排错速查。
- `references/key-wrapper-families.md`：**key 二次构造 / 包装层（W 族）唯一权威源** ——
  W1~W4 四族结构签名与还原、W5 **字母表守卫**（覆盖性 / 单射性 / 越界下标）、
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
- `references/license-and-key-hierarchy.md`：CDRM/STSDK 式 **Provision → License** 全流程、许可证 TLV 单元编码、
  密钥层级（DevPrK → SessionKey/MACKey → CEK）、SM2/SM4/HMAC-SM3 参数口径、`mdcm` 与 `dcm` 混合模式、
  NALU 尾部 CRC16、ffmpeg 重封装接入点。
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
  `xor`（三段链 `b64→xor→b64`）/ `xor-halves`。自带 `--selftest`（断言数**以实跑输出为准**）；
  所有「静默出错」路径（末 3 字符非数字、表外字符、明文长度不符、空 XOR 密钥）一律**报错退出**。
- `scripts/ts_probe.py`：零依赖 TS 解复用（PAT/PMT/PES/`service_name`/CEI），NAL 切分、CRC16 与逐 NALU 解密。自带 `--selftest`（42 项）。
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
