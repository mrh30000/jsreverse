---
name: stream-drm-reverse
description: 流媒体 / 视频点播 / 直播流的加密链路逆向技能：先定位「加密发生在哪一层」，再逐层解密。当目标站或 App 的播放地址、m3u8、ts 分片解不出来，或分片能下载却不能播放、播放花屏 / 绿屏 / 只有声音没画面 / 卡在首帧，或页面与接口里出现 `EXT-X-KEY`、`#EXT-X-KEY:METHOD=AES-128`、`decryptdata.key`、`qiniuDRMKey`、`encrypt_info`、`protectedLicenses`、`GetLicense`、`GetProvision`、`service_name=mdcm`、`KID`、`CEK`、`cdm`、`widevine`/`playready`、`CENC` 时使用。覆盖 HLS/m3u8 播放列表与 EXT-X-KEY 语义、TS→PES→ES/NALU 分层与「整片加密 vs 仅关键帧 vs 逐 NALU 加密」判据、AES-128-CBC / AES-256-CBC / SM4-CBC 内容解密、key 与 IV 的四种来源（明文 key URI、接口返回、由固定串派生、DRM 许可证）、CDRM/STSDK 式 Provision→License 许可证体系（TLV 单元、SM2 解 SessionKey、MACKey、HMAC-SM3 验签、SM4-ECB 解 CEK）、iqiyi `mdcm` 的 `dcm` 混合模式（CTR + 周期性 XOR）与 NALU 尾部 CRC16 校验、wasm / wasm2js 白盒 AES（含 DFA 故障注入与 CTR 差分反推写死的 key）、wasm VMP 反汇编到 IR 中间产物、用 wasm `importObject` 代理在 JS 侧捕获全部环境取值。用户提到 m3u8 解密、ts 解密、视频解析、直播源、切片解密、DRM、数字版权、许可证、白盒密码、白盒 AES、加密播放器、RPC 免扣（sekiro）、ffmpeg 重封装、或说「视频能下载但不能播放 / 花屏 / 只有前几帧正常」时都应使用本技能。
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
| m3u8 里**没有** KEY，但 JS 里有 `decryptdata.key` / `this.decryptkey` / `qiniuDRMKey` | **B 播放器层**：key 由 JS 拼或由接口给 | 断点打 `decryptdata.key`；`license_parse.py mdcm` |
| m3u8 有 KEY、解出来仍花屏 / 只有一部分画面正常 | **C ES 层**：加密在 PES 之后的 NALU 上 | `scripts/ts_probe.py <seg.ts>` |
| 响应字段是密文（`encrypt_info`、`o`/`v`、`url`、`params`） | **D 接口层**：与媒体流无关 | `scripts/media_crypto.py` |
| 出现 `protectedLicenses` / `GetLicense` / `GetProvision` / `KID` / `CEK` / `CENC` | **E DRM 许可证层** | `references/license-and-key-hierarchy.md` |
| 加密函数在 wasm 或 wasm2js 产物里 | **F 白盒 / wasm 层** | `references/whitebox-and-wasm-crypto.md` |
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
3. **🔴 CHECKPOINT · 单分片闭环（必做）**：先只解**一个**分片，用 `ffmpeg` 试播：
   ```bash
   ffmpeg -v error -i seg0.ts -f null -            # 0 error 才算过；只看「能解出字节」不算
   ```
   - 能播 → 整片批量解，进第 5 步。
   - **不报错但花屏 / `Invalid NAL unit size` / `no frame`** → 你大概率在 C 层而不是 A 层，回第 2 步。
4. **落算法**：按层选实现（A 用 `media_crypto.py aes-cbc`；C 用 `ts_probe.py` 定位后逐 NALU 解；B 把派生式抄成 Python；E 走许可证三层解）。
5. **重封装验证**：`ffmpeg -i 解密后的.ts -c copy out.mp4`。**只有这一步过了才算解密成功**——`crc`/长度对不对都是间接证据。
6. **工程化收尾**：key、IV、许可证都带时效（活体 token 常 1~5 分钟过期），
   把「取 key → 解密 → 重封装」串成一次执行，不要分开跑两遍。

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

## 反例黑名单（不要做的事）

- **不要用「m3u8 里没有 KEY」推断「没有加密」**。B 层与 E 层都不在 m3u8 里写 KEY，判据是 `decryptdata.key` / `GetLicense` 是否存在。
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

# 1) 判层：这个 m3u8 是 A 层还是 B/C 层
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
```

## RPC 兜底（D/F 层环境补不动时）

当加密函数依赖大量浏览器状态、扣代码成本远高于收益时，**把浏览器当 oracle**：在页面里把
`window.encrypt/decrypt` 挂出去，本地用 HTTP 调，不要扣代码。

- 桥接框架（sekiro / websocket-RPC）的注册与调用写法、以及「页面不能关」这条硬约束，见 `references/hls-and-ts-structure.md`。
- 这条路的适用边界：**只要能稳定复现一次调用**就划算；目标是长期批量、调用量很大时，再回头扣代码。

## 资源

- `references/hls-and-ts-structure.md`：HLS/m3u8 全字段语义与判层、TS→PES→ES/NALU 分层、
  **加密覆盖范围判据**、key/IV 四类来源与派生式、A/B/C/D 层实战配方、RPC 桥接、排错速查。
- `references/license-and-key-hierarchy.md`：CDRM/STSDK 式 **Provision → License** 全流程、许可证 TLV 单元编码、
  密钥层级（DevPrK → SessionKey/MACKey → CEK）、SM2/SM4/HMAC-SM3 参数口径、`mdcm` 与 `dcm` 混合模式、
  NALU 尾部 CRC16、ffmpeg 重封装接入点。
- `references/whitebox-and-wasm-crypto.md`：wasm / wasm2js 白盒 AES 的**四条路线选择**、
  `importObject` 代理捕获环境、DFA 故障注入、**CTR+XOR 差分反推写死 key**、wasm VMP → IR 中间产物、
  AI 补环境重放 worker 的适用边界。
- `scripts/m3u8_probe.py`：零依赖 m3u8 解析与判层（master/media 两级、EXT-X-KEY/IV、媒体序列、字节范围）。自带 `--selftest`（27 项）。
- `scripts/ts_probe.py`：零依赖 TS 解复用（PAT/PMT/PES/`service_name`/CEI），NAL 切分、CRC16 与逐 NALU 解密。自带 `--selftest`（42 项）。
- `scripts/media_crypto.py`：纯 Python 零依赖 AES-128/192/256（ECB/CBC/CTR）+ SM4（ECB/CBC/CTR）+ `dcm` 混合模式 + CRC16 变体探针。
  自带 `--selftest`（**95 项**：FIPS-197 分组向量、**SP 800-38A 的 CBC/CTR 模式向量**、GB/T 32907 SM4 向量、dcm 往返、拒绝路径）；
  `--slow-selftest` 追加 SM4 **百万次迭代**标准向量（约 38 秒）。
- `scripts/license_parse.py`：许可证 TLV 解析、`mdcm` service_name 解析、密钥层级一致性校验；
  SM3 / HMAC-SM3 为**完整实现**并用 GB/T 32905 标准向量自检（41 项）。
- 相关技能：接口签名 / 参数还原 → `../web-reverse-algorithm/SKILL.md`；wasm 反编译与内存语义 → `../wsam-reverse/SKILL.md`；
  播放器页面本身带反调试 → `../web-reverse-algorithm/references/07-antidebug-and-live-patching.md`；
  浏览器环境补全（会话 Cookie / 指纹）→ `../web-js-env-patcher/SKILL.md`。
