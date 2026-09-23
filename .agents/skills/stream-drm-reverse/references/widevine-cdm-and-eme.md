# 国际派 DRM：Widevine / EME / ClearKey（E 层第二权威源）

> **分界**：国内派（CDRM / STSDK / `mdcm`：`GetProvision` → TLV → SM2/SM3/SM4）在
> `license-and-key-hierarchy.md`；**本文只讲国际派**（Widevine / PlayReady / FairPlay / ClearKey / EME）。
> 两者**判据不同、工具不同、失败现象也不同**，先判"是哪一派"再动手。

## §0 30 秒判派

| 判据 | 国内派 | 国际派（本文） |
| --- | --- | --- |
| 清单/协议 | `#EXT-X-KEY:METHOD=AES-128,URI=…` + 自建 `GetProvision`/`GetLicense` | `mpd`（DASH）/ `KEYFORMAT="com.apple.streamingkeydelivery"` / **`KEYFORMAT="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed"`（Widevine）** |
| 特征串 | `service_name=mdcm`、`protectedLicenses`、`_signature` | **`cenc:pssh`**、`PSSH`、`KID`、`ContentDecryptionModule`、`MediaKeys`、`requestMediaKeySystemAccess`、`bilidrm`、`skd://` |
| 分片形态 | `.ts` | `.m4s` / `.mp4`，`mp4info` 显示 `Coding: enca` + `Scheme Type: cbcs` |
| 解密工具 | 自写 Python | **`mp4decrypt`**（Bento4）/ `ffmpeg -decryption_key` / `shaka-packager` |
| 密钥形态 | 国密体系 | `KID:KEY`（各 16 字节 hex） |

**一眼识别**：`mp4info` / `mp4dump` 看到 `[ENCRYPTED] Coding: enca` + `Scheme Type: cbcs`
⇒ 这是 **CENC/CBCS 的 DRM 媒体**，别再按 m3u8 的 AES-128 搞。

---

## §1 Widevine 三级与"为什么 L3 可解"

| 级别 | 解密发生位置 | 可解性 |
| --- | --- | --- |
| **L1** | 硬件（TEE） | 不可解（需真机 + 厂商签名链） |
| **L2** | 核心在硬件、视频处理在软件 | 基本不可解 |
| **L3** | **全部在软件 CDM 里** | **可解** —— 市面上所有公开工具都做 L3 |

⇒ 判据：浏览器（非 Safari / 非 4K 强制 L1 的内容）多半是 **L3**，可走本文流程。

**链路全貌**：

```
MPD(含 pssh) ──▶ CDM(device_client_id_blob + device_private_key) ──▶ challenge
        │                                                              │
        │                          license server（代理/Widevine 官方）◀┘
        ▼
     license（含 CEK）──▶ mp4decrypt / ffmpeg ──▶ 明文媒体
```

`pssh` 有**长短两个**：**长的给 PlayReady、短的给 Widevine**（实测：mpd 里出现两个 `cenc:pssh` 时，
"短的那个"才是你要用的；偷懒做法是**排序取最短**）。

---

## §2 `0804`：整条链路上最容易卡死的一个点

**症状**：pssh 与 license URL 都拿到了，直接发 challenge 却拿不到 key；参考别人的 C# 实现能看到
**先提交了一个 `0x08 0x04`，再把返回当证书设置，然后才提交真正的 challenge**。而 `0804` 从哪来，无从推断。

**答案**：`\x08\x04`（base64 写作 `CAQ=`）是 **`generateRequest()` 返回的固定值**，
可以直接发给**同一个 license 服务器**（甚至同样的 headers）拿回**服务证书**。
在 Widevine 官方诊断页生成任意 pssh，返回值都是 `0804`。

⇒ 完整三步（**顺序不能换**）：

```
① POST licenseURL  body = b"\x08\x04"          → 得到 Service Certificate（证书，乱码）
② cdm.set_service_certificate(session, cert)   → 开启 Privacy Mode（VMP 强制要求）
③ POST licenseURL  body = challenge            → 拿到 license → parse → CEK
```

- 第 ② 步在 `pywidevine` 里是 `set_service_certificate(session_id, certificate)`；
  **参数必须是 `SignedDrmCertificate`（或含它的 `SignedMessage`）**，直接塞 `DrmCertificate` 会被拒。
- **抓包侧判据**：license 服务器**很直观**——**提交与返回都是乱码**的那个请求就是它；
  而且会出现**两次提交**（第一次就是 `0804`）。
- **不做 ② 的后果**：请求本身"正常返回"，但拿到的 key 是**假的/空的**（不报错）。
  这是本层最典型的"安静失败"。

### 最小可用代码

```python
from pywidevine.cdm import Cdm
from pywidevine.device import Device
from pywidevine.pssh import PSSH
import requests

def get_keys(wvd_path, pssh_b64, license_url, headers=None, service_cert_b64=None):
    cdm = Cdm.from_device(Device.load(wvd_path))
    sid = cdm.open()
    if service_cert_b64:                       # ①②：先拿证书、再设置
        cdm.set_service_certificate(sid, service_cert_b64)
    challenge = cdm.get_license_challenge(sid, PSSH(pssh_b64))
    lic = requests.post(license_url, data=challenge, headers=headers or {})
    lic.raise_for_status()
    cdm.parse_license(sid, lic.content)        # ③
    keys = [f"{k.kid.hex}:{k.key.hex()}" for k in cdm.get_keys(sid) if "CONTENT" in k.type]
    cdm.close(sid)
    return keys
```

> `get_keys` **会返回多条**（音频/视频/不同码率各一条）。**不必逐条挑**：
> 实测"把全部 key 依次喂给 ffmpeg，它会自己识别正确的那条"，
> 但 `mp4decrypt` 要显式 `--key KID:KEY`，此时才需要按 KID 对上。

---

## §3 `.wvd`（Widevine Device）从哪来

`.wvd` = `RSA 私钥 + Client ID Blob` 打包而成（`pywidevine create-device`）。三条路：

| 路线 | 做法 | 注意 |
| --- | --- | --- |
| **Android 真机（root + Magisk）** | Magisk 装 `MagiskFrida`，可选 L1 回退模块；`pip install -r KeyDive/requirements.txt`；`python keydive.py -a -d <设备> -w` | 产物是 `ClientId + Private_key.pem`，还需 `create-device` 转 `.wvd` |
| **AVD 模拟器** | Android Studio 建 **Pixel 6 + 系统选 Pie**；下载**与 `pip install frida` 版本一致**的 `frida-server`；push 到 `/data/local/tmp` 并 `chmod +x` 运行；跑 `wvdumper/dumper` 的 `dump_keys.py`（`pip install protobuf==3.20.*`）；模拟器访问 DRM 测试页（bitmovin）产生文件 | **模拟器本身不带 WVD**，这一步是**劫持**出来的；`frida-server` 版本不对会直接失败；**Pie 是前提**（新系统 frida-server 起不来） |
| **在线/他人提供** | `cdrm-project.com` 一类 | 有隐私与合规风险，仅作最后手段 |

```bash
pywidevine create-device -k private_key.pem -c client_id.bin -t "CHROME" -l 3 -o wvd
```

- **`-l 3` 必须是 3**：L1/L2 的 device 在软件侧解不出。
- **模拟器网络**：AVD 的回环代理是 **`10.0.2.2`**；要在 Wi-Fi 设置里手工配 proxy 才能加载 DRM 测试页。
- **"视频没加载出来就不会生成 bin/pem"** ⇒ 反复刷新，先把测试视频播起来。

---

## §4 ClearKey：最"有救"的一类（密钥是明文给的）

**判据**：网络里出现一个小的 **`bilidrm`** 文件（或任何"公钥 + 元数据"的小文件），
媒体文件的 `Scheme Type` 是 `cbcs`，但**没有走 Widevine license**。这是 **W3C Clear Key**。

链路（W3C `encrypted-media-2#clear-key`）：

```
① 从 mp4 里读 KID（或直接从代码里拿）
② 用公钥生成 SPC → 请求 license 拿到 CKC
③ CKC 里就是明文 KEY
```

实测的 JS 结构非常直白（甚至带注释），值得直接抄思路：

```
case 2:  通过公钥生成 SPC
case 6:  通过 SPC 请求许可 CKC
case 12: 通过 CKC 获得解密 KEY     ← 在 case 12 的 return 处下断点，kid 与 key 一次拿全
```

### 拿 key 的两种写法

```bash
# KID 可以从媒体文件里读（ClearKey 场景常可省）
mp4dump a.mp4 | findstr /i "KID"
# base64 的 key 要转 hex（ClearKey 给的常是 base64）
node -e "console.log(Buffer.from('W2DWP4mgRSmF8jtTAqFh4A==','base64').toString('hex'))"   # 5b60d63f89a0452985f23b5302a161e0

# ① mp4decrypt 要显式 KID:KEY
mp4decrypt --key a4f8dc6f83df4de0ab3faa4562f7bddd:5b60d63f89a0452985f23b5302a161e0 in.mp4 out.mp4
# ② ffmpeg 只要 KEY（免找 KID）
ffmpeg -decryption_key 5b60d63f89a0452985f23b5302a161e0 -i in.mp4 -c copy out.mp4
```

> **判据**：`bilidrm` 文件里**有公钥** ⇒ "明文 DRM" ⇒ 一定有解（密钥不是黑盒）。
> 反过来，如果链路里出现的是 Widevine 的 license 请求，就走 §2。

---

## §5 EME：走浏览器原生 CDM 的那条（hook 点在哪）

现象：页面用 `navigator.requestMediaKeySystemAccess` + `MediaKeys.createSession`，
**没有自建 license 接口**，而 `videojs-contrib-eme` / `dash.js` 在中间转发。

关键 API 与 hook 点：

| API | 作用 | 取证 |
| --- | --- | --- |
| `requestMediaKeySystemAccess('com.widevine.alpha', …)` | 选 keySystem | 断点看 keySystem 与配置 |
| `MediaKeys.createSession()` | 建会话 | — |
| `session.generateRequest(initDataType, initData)` | 生成 license 请求（`initData` 就是 pssh 字节） | **`initData` 处可直接取 pssh** |
| `session.addEventListener("message", …)` | 收到 license 请求消息 | **最值的 hook 点**：`e.messageType === "license-request"` 时取 `e.message` |
| `session.update(response)` | 用 license 响应更新会话 | 在这之后 `session.keys` 里就有 `eme.keys` |

- **不要被 Promise 链骗走**：站点的封装常是"`getLicense` 里建一个 promise，
  拿到数据后回调 `resolve`"，在调用栈里跟会**直接跟丢**。
  **正确做法是在 `addEventListener("message")` 与 `generateRequest` 两处下断**，不要顺着 promise 追。
- 判据：**只有 `e.messageType` 是 `license-request` / `license-renewal` 时才是要走 license 的**；
  别的类型不需要跟。
- 想在栈帧里直接拿解密后的 `eme.keys`（EME 变体），见 `player-and-live-capture.md` §5。

### 定位 DRM 库

- 页面里搜 `eme` 命中 `videojs-contrib-eme` / `dash.js` ⇒ 按该库的 `keySystems` 配置拿 license URL：
  ```js
  player.eme()
  player.src({ src: '<url>', type: 'application/dash+xml',
               keySystems: { 'com.widevine.alpha': '<LICENSE URL>' } })
  ```
- 搜 `"DRM encrypted source cannot be decrypted without a DRM plugin"` ⇒ 从这句往上翻，就能找到 DRM 库与 license URL。

---

## §6 网络层：本层最常见的三个"环境"失败

| 症状 | 原因 | 处置 |
| --- | --- | --- |
| **Postman 能拿到、`cmd`/Python 拿不到，PowerShell 又能** | CDN 强制 **HTTP/2**，且做 TLS 指纹校验 | 用 **HTTP/2** 发包（Node `http2` / Go），或对齐 TLS 指纹 |
| 请求 200 但拿到的"key"是假的 | **`x-hash` / `x-of-rev` 版本戳过期**（见 §7） | 这两个参数必须最新；旧的会让请求"正常成功但 cookie/key 是假的" |
| `yt-dlp` 报无法格式化/`--allow-u` 之类 | DRM 内容 yt-dlp 不能直接解 | `--allow-u` 只是为了**允许下载**（拿到加密媒体），解 key 仍走 §2 |

**HTTP/2 最小示例**（Node）：

```js
const http2 = require("http2");
const client = http2.connect("https://<cdn>");
const req = client.request({
  ":method": "GET", ":path": "/dash/files/xx/xx.mpd",
  "accept": "*/*", "cookie": "<cookie>", "referer": "https://<site>/",
});
let data = ""; req.on("data", c => data += c); req.on("end", () => { console.log(data); client.close(); });
req.end();
```

> TLS 指纹"改 cipher 顺序"的做法（undici `buildConnector({ciphers: shuffled})`）
> **实测常常不够**；切换到 HTTP/2 才是这一类问题的真解。
> 更系统的指纹对齐见 `web-js-env-patcher` 的 TLS 指纹章节。

---

## §7 浏览器侧取证（历史路线，作为判据保留）

**老版 32 位 Chrome + Widevine** 的 CDM 是**可代理的 DLL**，这是"从浏览器里直接取明文"的经典路线：

- 目录：`…/Chrome/Application/<ver>/WidevineCdm/_platform_specific/win_x86/`
  - `widevinecdm.dll`：`InitializeCdmModule_4` / `CreateCdmInstance` / `GetCdmVersion`
  - `widevinecdmadapter.dll`：`PPP_GetInterface` 等
- 调用链：`Chrome → widevinecdmadapter.dll → widevinecdm.dll`（adapter 调 `CreateCdmInstance` 建 CDM 实例）
- **关键接口**：`cdm::ContentDecryptionModule_8::Decrypt(encrypted_buffer, decrypted_buffer)`
  —— **只要在这两个 DLL 之间插一层代理，就拿到了"密文 + 明文"对**。
- 落地要点：① DLL 在**沙盒进程**里，`ReadProcessMemory`/`CreateFile`/`OutputDebugString` 全被禁；
  ② 直接 patch `chrome.exe` 让它加载代理 DLL（**启动时沙盒尚未启用**）；
  ③ 再用 `--no-sandbox` 才真正能用上文件写入。
- **日志读法（判据）**：`Decrypt(IV:<hex>, encData(N):<hex>, decData(N):<hex>)`
  —— 比对 `encData` 与 `decData` 的**前 16 字节**，可见 CBC/CTR 的差异位置（实测前 16 字节同、其后分叉）。
- **历史局限**：现代 Chrome 的 CDM 已移出可代理的 DLL 形态，这条路**只在老版本上成立**。
  ⇒ 保留它的价值在于**判据**（"明文在 CDM 里是存在的，只是拿不到"），而不是可复制的操作。

现代等价手段：**chrome 的 MSE/EME 栈里拦截 `Decrypt` 的 JS 侧等价物**（见 §5），
或**wasm 化 CDM**（如某些平台的 `biliDRM` 用 wasm/SDK 实现），此时走 `whitebox-and-wasm-crypto.md` 的取证方法。

---

## §8 工程化：把 CDM 包成"本地服务"再被主流程调用

`.wvd` 与 `pywidevine` 都只活在 Python 侧，而采集主流程常在 Node/Python 混合栈里。
实测可行且省事的形态是 **把 CDM 包成 HTTP 服务**：

```
Python(flask + pywidevine) ──pyinstaller──▶ cdmServer.exe
    端点：/ping  /close  /loadDevice  /getKeys
    自动销毁：debounce(autoClose=300s)，带 /ping 心跳续期
Node 侧：openCDMServer({ wvdFullPath }) → 起进程 → 轮询 /ping → getKeys(licenseURL, pssh)
```

工程要点（都是实测踩出来的）：

| 要点 | 为什么 |
| --- | --- |
| **先 bind 一个空闲端口再传给子进程**（`sock.bind(('localhost', 0))`） | 避免端口冲突；`port=0` 让 OS 分配 |
| **轮询 `/ping` 直到 `/loadDevice` 成功**，超时 60 次 × 1s | 进程起来 ≠ 可用；`pyinstaller` 冷启动可能好几秒 |
| **心跳 + debounce 自动销毁（默认 300s）** | 免"忘了关"；`/ping` 同时充当续期 |
| **node 侧做 `checkPortOccupy`** | 端口已被占用时**不要**重复起进程 |
| **`ffmpeg` 拿 key 列表逐个 `-decryption_key`** | 多 key 场景不必自己挑 |

> 这一层的价值在于**解耦**：CDM 只在 Python 里，
> 主流程（Node/Go）不需要理解 Widevine，只要 HTTP 调一次。

---

## §9 坑表（"不报错但结果错"专区）

| 坑 | 症状 | 判据 / 修法 |
| --- | --- | --- |
| **不设 service certificate** | license 请求 200、key 是假的 | §2：先 `0804` 取证书再 `set_service_certificate` |
| 用**长的** pssh（PlayReady 那个） | challenge 被拒 / key 空 | **短的那个给 Widevine**；不确定就排序取最短 |
| 只给 `ffmpeg` 一个 key、却是音频的 key | 视频花/黑，音频正常 | `ffmpeg` 可把**全部 key 依次传入**，它会自己认；或先按 KID 对齐 |
| `mp4decrypt` 只给 key 不给 KID | 直接失败 | `mp4decrypt` 必须 `--key KID:KEY` |
| ClearKey 给的 key 是 base64 | "16 字节"对不上 | base64 → hex 再传；`atob` + `charCodeAt.toString(16)` 补零 |
| 拿到了 `bilidrm` 却以为要走 Widevine | 死磕 license | 有**公钥** ⇒ ClearKey ⇒ `SPC→CKC→KEY`，三步就完 |
| `x-hash`/`x-of-rev` 用旧值 | **请求正常、cookie/key 是假的** | 这两个参数必须最新；旧值不会报错 |
| Postman 成功、脚本失败 | HTTP/2 或 TLS 指纹 | 切 HTTP/2；别只改 cipher 顺序 |
| 模拟器里取 WVD | 模拟器**不带 WVD** | 必须走劫持（AVD dumper）；系统要 **Pie** |
| `frida-server` 版本与 `frida` 不一致 | 起不来 / 无输出 | 版本必须严格一致 |
| `-l` 给了 1 或 2 | 软件侧解不出 | `create-device -l 3` |
| 把 AVD 的 `10.0.2.2` 代理忘了配 | 测试页加载不出，不产 bin/pem | AVD Wi-Fi 里手配 proxy |
| 拿 `eme.keys` 时顺着 promise 跟栈 | 跟丢 | 断在 `generateRequest` / `message` 事件 |

---

## §10 复跑命令

```bash
S=.claude/skills/stream-drm-reverse/scripts

# 判派：先看媒体是不是 CENC/CBCS
mp4info a.mp4            # [ENCRYPTED] Coding: enca / Scheme Type: cbcs
mp4dump a.mp4 | findstr /i "KID"
ffprobe -v error -show_entries stream=codec_name -of csv in.mp4   # 解密后应能正常解析

# ClearKey：base64 key → hex
node -e "console.log(Buffer.from('W2DWP4mgRSmF8jtTAqFh4A==','base64').toString('hex'))"

# 解密（两种）
mp4decrypt --key <KID>:<KEY> in.mp4 out.mp4
ffmpeg -decryption_key <KEY> -i in.mp4 -c copy out.mp4

# .wvd 生成
pywidevine create-device -k private_key.pem -c client_id.bin -t "CHROME" -l 3 -o wvd

# 本技能自检（不受本文影响，但交付前必跑）
python $S/key_wrapper.py --selftest
python $S/container_disguise.py --selftest
```

## §11 与其它文档的边界

- 国内派（CDRM/STSDK/`mdcm`/TLV/SM2）→ `license-and-key-hierarchy.md`
- EME 里 `eme.keys` 的栈帧取证、MSE 源码注入 → `player-and-live-capture.md`
- wasm 化 CDM / 白盒 AES / 解密器内存取证 → `whitebox-and-wasm-crypto.md`
- 分片是 `SAMPLE-AES`（每 160 字节只动 16 字节）/ NALU 级 → `frame-encryption-and-wasm-decryptors.md`
- 只是 m3u8 + AES-128（**没有** `pssh`/`KID`）→ 不是本层，回 SKILL.md 的 A/B/C 层判据
