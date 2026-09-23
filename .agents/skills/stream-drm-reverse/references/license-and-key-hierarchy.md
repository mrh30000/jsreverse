# DRM 许可证体系与密钥层级（E 层 · 国内派）

> 本文件是 **E 层（DRM 许可证）· 国内派** 的唯一权威源。C 层的 TS/PES/NALU 分层见 `references/hls-and-ts-structure.md`。
> 适用对象：CDRM / STSDK 一类**自研 DRM**（`GetProvision` + `GetLicense` + 国密套件），
> 以及带 `CENC` / `KID` / `protectedLicenses` 字段的同构体系。
>
> ⚠️ **国际派在另一份**：出现 `cenc:pssh`、`enca`/`cbcs`、`KEYFORMAT="urn:uuid:edef8ba9-…"`、`skd://`、
> ClearKey 的 `bilidrm`、`MediaKeys`/`requestMediaKeySystemAccess` 时，
> **去 `references/widevine-cdm-and-eme.md`**（Widevine L3 / `.wvd` / `0804` / `mp4decrypt` / EME）。
> **两派的判据、工具、失败现象都不通用**——本文件里的"Provision"在国际派里没有对应步骤。

**目录**

- [1. 全貌：三段式链路](#1-全貌三段式链路)
- [2. 密钥层级](#2-密钥层级)
- [3. Provision 阶段（设备注册）](#3-provision-阶段设备注册)
- [4. License 阶段（许可证）](#4-license-阶段许可证)
- [5. 国密参数口径与 Python 实现坑](#5-国密参数口径与-python-实现坑)
- [6. `mdcm` 模式串与 `dcm` 混合解密](#6-mdcm-模式串与-dcm-混合解密)
- [7. NALU 尾部 CRC16](#7-nalu-尾部-crc16)
- [8. 白盒 AES 与 CTR 差分反推](#8-白盒-aes-与-ctr-差分反推)
- [9. ffmpeg 重封装接入点](#9-ffmpeg-重封装接入点)
- [10. 排错速查](#10-排错速查)

---

## 1. 全貌：三段式链路

```
┌─ Provision ─────────────────────────────────────────────┐
│ encrypt_info(接口返回, AES)  → Provision Server URL      │
│ GetProvisionRequest          → 设备注册请求（RSA-PSS 签名）│
│ ProcessProvisionResponse     → 设备私钥 DevPrK + 证书链   │
└──────────────────────────────────────────────────────────┘
                    ↓  落盘 certchain.data
┌─ License ───────────────────────────────────────────────┐
│ GetLicenseRequest            → SM2 签名 + contentID(base64)│
│ ProcessLicenseResponse       → 解析 TLV → 解出 CEK[]      │
└──────────────────────────────────────────────────────────┘
                    ↓
┌─ 内容解密 ───────────────────────────────────────────────┐
│ 解析 CEI(KID, IV) → 按 KID 选 CEK → SM4-CBC 解 NALU      │
└──────────────────────────────────────────────────────────┘
```

**先做的一件事**：找**标准文件**。这类体系的字段名、单元编码、算法枚举几乎都是照抄一份
行业规范（本例是《7.2 许可证编码》+《附录 B 密码算法》）。作者原话是：
「我一开始纯逆向分析 so 文件，分析完才发现标准文件里都有定义，浪费了大量时间」。
判据：JS / so 里出现 `KeyProfile1`、`KeyType`、`CryptoAlgorithm` 这类**枚举式命名** ⇒ 先搜规范再逆向。

---

## 2. 密钥层级

```
DevPrK（设备私钥，Provision 阶段获得）
 ├─ SM2 解密 → SessionKey   (KeyType 0x20)
 ├─ SM2 解密 → MACKey       (KeyType 0x21) → 用于 HMAC-SM3 验签
 └──────────────────────────────────────────────┐
                                                ▼
                     CEK (KeyType 0x01)  ← SM4-ECB 用 SessionKey 解密
                                                │
                                                ▼
                                    SM4-CBC 解密视频内容
```

**判据**：每个密钥单元都带 `UpperKeyIdentifier` 指向它的上级。
**校验方法**：解出的 `SessionKey` 长度必须是 **16 字节**（SM4 密钥）；
`CEK` 长度必须 **16 字节**；`MACKey` 用于 HMAC-SM3，长度 **32 字节**。
长度不对 ⇒ 上一级解错了，**不要继续往下做**。

---

## 3. Provision 阶段（设备注册）

### 3.1 `encrypt_info` 解密

接口返回的 `encrypt_info` 是 AES 加密的 JSON，解密后直接给出三个 URL：

```json
{
  "license_url": "https://<host>/cau_v2/GetLicense",
  "provision_url": "https://<host>/provision/v1",
  "isDrmEmergency": "https://<host>/v1/drm1_config.json"
}
```

### 3.2 `GetProvisionRequest` 请求结构

```
signedRequest = base64( JSON )
{
  "clientInfo": { "appCertFingerprint", "appName", "appProvider", "appVersion",
                  "drmClientVersion", "deviceID" },
  "drmClientSystemId": "STSDK-xxxxxxxxxxxx",
  "keyProfile": "KMSProfile1",
  "reqID": "<唯一请求 ID>",
  "sign": "<签名>",
  "timestamp": "<时间戳>",
  "version": "STSDK1"
}
```

- `reqID` 就是一个 **MD5**（随机生成也能过）。
- `sign` 的两步：**先用 `AES-ECB(s_drm_key)` 解密内存里的常量地址 `DTA_SIGN_PKEY` 得到私钥，
  再用该私钥做 `RSA PKCS1_PSS with SHA256` 签名**。
  即：私钥本身是**加密存**在二进制里的，`s_drm_key` 是解它的钥匙。

### 3.3 `ProcessProvisionResponse` 响应与多层解密

```
{
  "resultCode", "reqID",
  "provisionData": "<Base64 加密数据>",
  "tempKey":  "<RSA-OAEP 加密的临时密钥1>",
  "tempIV":   "<Base64 IV>",
  "tempKey2": "<RSA-OAEP 加密的临时密钥2>",
  "timestamp",
  "stsdkPrvKeyInfo": { "aesRandom", "prvKeyD0", "prvKeyN" },
  "minRetryInterval": "0",
  "signCerts": ["<Base64 DER 证书1>", "<Base64 DER 证书2>"],
  "sign": "<服务器签名>"
}
```

解密链条（**层数固定，别自己发明**）：

```
RSA-OAEP 解 tempKey/tempKey2 → 得到 AES 密钥
AES-GCM 解 provisionData（第一层）
AES-GCM（第二层）
AES-GCM（第三层）
→ 得到 { 设备证书链, DevPrK, DevPubK, deviceID }
```

结构体（kaitai 风格，可直译）：

```
parts_4 = Struct(
  "version"    / Int32ub,
  "dataLength" / Int32ub,
  "data"       / Bytes(this.dataLength),     # 加密的公钥证书（证书链第一个）
  "devCALength"/ Int32ub,
  "devCA"      / Bytes(this.devCALength),    # 证书链第二个
)
```

- **`DTA_DEC_PKEY`** 与 `DTA_SIGN_PKEY` 同构：也是用 `s_drm_key` 解出的内存常量，得到**解密私钥**。
- **`sm3` 算的是「公钥」，不是「公钥证书」**：先 `pem.armor('PUBLIC KEY', spki_der)`，
  去掉 `-----` 行、拼接 body、`base64.b64decode` 之后再做 SM3。**顺序错了哈希必错**。
- `signCerts` **不含根证书**。

### 3.4 落盘 `certchain.data`

```
AES-ECB(key_seed) 套  SM4-ECB(ProvisionResponse)
```

> ⚠️ **本技能的脚本不实现 AES-GCM**（需要 GHASH，纯 Python 实现收益低、易错）。
> 处置二选一：① 环境里有 `cryptography` / `gmssl` 就直接用；② **Hook `EVP_*` 系列函数**把中间密钥打出来。
> 见第 5 节的 Hook 路线。

---

## 4. License 阶段（许可证）

### 4.1 请求

- 接口：`POST /cau_v2/GetLicense`；`protectedLicenses` 在响应里。
- `contentIDs` 用 **base64** 编码（如 `["MjAyNzI0OTU=", "MjAyNzI0OTY="]`）。
- 请求用 **DevPrK 做 SM2 签名**。

### 4.2 单元编码（TLV 变体）

```
┌────────┬────────┬──────────┬─────────────┐
│ 类型8  │ 索引8  │ 长度16   │ 数据 N×8    │
└────────┴────────┴──────────┴─────────────┘
```

| 类型 | 编码 | 说明 |
| --- | --- | --- |
| 许可证索引 | `0x00` | Version / LicenseID(8B) / UnitsNumber / TimeStamp |
| 内容 | `0x01` | ContentID + CEKCount + KeyIdentifiers[] |
| 被授权对象 | `0x02` | ObjectType + ObjectID(deviceID) |
| 密钥 | `0x03` | KeyAlgorithm / KeyData / KeyType / KeyIdentifier / UpperKeyIdentifier |
| 密钥使用规则 | `0x04` | KeyIdentifier + KeyRules[]（时间限制） |
| 数字签名 | `0xFF` | Algorithm(HMAC_SM3) + KeyID + Signature |
| 保留 | `0x05~0xEF` | — |

**解析实现要点**：`LicenseIndex` 是第一个单元，`DigitalSignature` 是最后一个单元，
中间的 `BaseUnits` 数量由 `LicenseIndex.UnitsNumber` 决定。
单元长度 `> 4` 才有效（`if bufLen <= 4: return 0` 是原实现的守卫）。

### 4.3 KeyProfile1 的算法规范

| 项目 | 算法 | 模式 |
| --- | --- | --- |
| 内容加密 | SM4 | **CBC** |
| CEK 加密 | SM4 | **ECB（无填充）** |
| SessionKey 加密 | SM2 | — |
| 消息验证 | HMAC-SM3 | 32 字节密钥 |

算法枚举（附录 B）：`SM3_256 = 0x02`、`SM2_256 = 0x12`、`SM4_128 = 0x22`、`HMAC_SM3 = 0x43`。
密钥类型枚举：`ContentEncryptionKey = 0x01`、`DeviceKey = 0x03`、`SessionKey = 0x20`、`MACKey = 0x21`。

### 4.4 解密六步（顺序固定）

```
1. base64 解码 protectedLicenses
2. 解析 TLV → LicenseIndex / BaseUnits[] / DigitalSignature
3. 遍历 BaseUnits，按 KeyType 分流
4. SessionKey = SM2_Decrypt(KeyData, DevPrK)          # 设备私钥
5. MACKey     = SM2_Decrypt(KeyData, DevPrK)
   msg = license_data.split(b'\xFF\x0D')[0]           # 签名覆盖的字节范围
   assert HMAC_SM3(MACKey, msg) == DigitalSignature.Signature
6. CEK = SM4_ECB_Decrypt(KeyData, SessionKey)         # 无填充！
```

**`msg` 的切法**是 `split(b'\xFF\x0D')[0]`——即「签名单元（`0xFF`）的类型字节 + 索引字节 `0x0D`」之前的全部字节。
用整段 license 去算 HMAC 会一直失败。

### 4.5 内容解密

```
解析 CEI 单元 → 取 KID 与 IV
按 KID 选 CEK
SM4-CBC(CEK, IV) 解 NALU
```

---

## 5. 国密参数口径与 Python 实现坑

| 坑 | 现象 | 正确写法 |
| --- | --- | --- |
| `gmssl` 的 `set_key` | 传 bytes 报错 | 传 **hex 字符串**；`sm2.CryptSM2(public_key=..., private_key=..., mode=1)` **公私钥都必须传**，否则出错 |
| SM4 ECB 是 **nopadding** | 默认 PKCS7，解密报 `padding` 错 | `sm4.CryptSM4(padding_mode="")` —— **必须显式传空串** |
| SM2 密文首字节 | 解密报格式错 | 密文十六进制以 `04` 开头时**先去掉这 1 字节**（未压缩点标识） |
| SM2 签名算法 | 验签不过 | 是 `sm2_with_sm3`（不是裸 SM3） |
| `tempIV` | 长度对不上 | 是 **base64**，先解码 |
| `sm3` 输入 | 哈希值总不对 | 算的是**公钥**（SPKI DER 的 base64 body 解码后），不是证书 |
| `keyProfile` | 单元解出来是垃圾 | 必须是 `KMSProfile1`；不同 profile 的算法表不同 |

**Hook 路线（推荐，绕开纯 Python 的密码库依赖）**：

1. **先还原符号**：从二进制里找 `OpenSSL <version>` 字符串 → 下载对应版本源码 → 编译带符号的 ARM64 版本
   → 利用 `ERR_put_error` 的**参数唯一性**建立「地址 → 函数名」映射 → 回写到去符号文件。
   `ERR_put_error(lib, func, reason, file, line)` 的 `file:line` 组合在 OpenSSL 内部唯一，这是符号还原的关键。
2. Hook `EVP_CipherInit_ex`、`ECDSA_sign` 等常用函数，**加密/签名/哈希/摘要四类一次 hook 全**。
3. 需要解析复杂结构体时，**自编译一个辅助 DLL/so** 把结构体解析封装成导出函数，再 Hook 它——
   比在 Frida 里手写 JS 解析指针偏移省事得多。
4. 非导出函数地址：用「导出函数的已知偏移」做锚点推算（如 `base + 0x4D36E8` 这类**函数地址 + 1** 的 Thumb 约定）。

> Hook 的性价比判据：**当你需要「拿一次 key」而不是「实现算法」时，Hook 永远比纯算快。**
> 本案例作者的结论也是「单纯拿 key，直接 hook SM4 解密函数就行了，目前都是固定的」。

---

## 6. `mdcm` 模式串与 `dcm` 混合解密

### 6.1 模式串藏在 PMT 的 `service_name` 里

```
mdcm|s1:9:10|a0|vd70b0e7a262f4cc52b667901eb2e8b9d|e1|f497006|
```

按 `|` 分割，**每段的第一个字母决定语义**：

| 段 | 含义 |
| --- | --- |
| `m` | 加密模式（`mdcm`） |
| `s a:b:c` | 一轮 = `a` 次 CTR + `b` 次 XOR，共 `c` 次（本例 `1:9:10`） |
| `a 0/1` | `1` ⇒ **只加密关键帧**（`isKeyframesOnly`）；`0` ⇒ 全加密 |
| `v<hex>` | **IV**：十六进制，长度 33（前导 `1~25` + 计数器 `00000001`） |
| `e`、`f` | 其它参数，参与计数校验 |

**解析器的两个关键行为**（照抄原实现）：

1. 逐段扫描，**只有段首是小写字母**才进入 `switch`；`v` 段用 `ost_hexstring_to_binary` 解出 **16 字节** IV，
   返回长度必须**恰好等于 16**，否则该段不计入。
2. **末尾有计数校验**：`cryptoMode == 0` 时有效段数必须是 `3`，`cryptoMode == 1` 时必须是 `4`；
   不等则整体返回 `-1`（解析失败）。
   这条校验非常有用——**它是判断「你抄的模式串是否完整」的免费 oracle**。

### 6.2 `dcm` 块解密

核心逻辑（原实现 `dcm_block`）：

```
每 16 字节一块，totalRounds 轮为一个周期，每轮按下面的规则处理一块：

  if (remaining <= 16) or (rounds > xorBlksInCycl):
      走标准 AES-CTR（用分组密码生成 keystream 异或）
  else:
      xord = counter ^ in ; counter += 1 ; in = xord
```

**必须理解的四点**：

1. **`remaining <= 16` 是独立于轮次的条件** —— **最后一块无论轮次如何都走 CTR**。
   只按轮次判断，会在「末块恰好落在 XOR 相位」时算错（192 字节 payload 的第 12 块、
   160 字节 payload 的第 10 块都会命中），**而且解密不报任何错**。
   `media_crypto.py` 已用「第 2 块必须是裸 counter / 第 10 块必须是 AES keystream」两条**区分性断言**钉死该语义。
2. `av_aes_ctr_set_full_iv(aes_ctr, iv)` 把 **counter 初始化为 IV**，所以「XOR 分支」用的就是 CTR 的 keystream。
3. XOR 分支里 **counter 要 `addOne`**——漏了这一步，第二个块开始全错。
4. 表面是「1 次 CTR + 9 次 XOR」的混合，实际两侧都在消耗连续计数器，
   canonical 等价的表述是「连续 N 个 keystream 块的异或」；
   但第 1 块（以及 EVERY 末块）必须由分组密码生成 keystream——**不能简化成纯 XOR**。

`scripts/media_crypto.py dcm` 已实现该逻辑，并用「加密后再解密必须逐字节还原」（3 组参数 × 7 种长度）
+ 上述两条区分性断言共同自检。

---

## 7. NALU 尾部 CRC16

```
if crc16(buffer, size - 2) != *(uint16_t *)(buffer + size - 2):  return 0
```

- **解密前后各校验一次**：解密前校验「密文完整性」，解密后校验「解密正确性」。
- 尾部 **2 字节是校验值**，解密后要**剪掉**，否则 `ffmpeg` 会报 NAL 长度异常。
- 这条校验是本类目标**唯一能在本地判断「key 对但轮次错」的信号**——跳过它会把错误静默推到播放层。

---

## 8. 白盒 AES 与 CTR 差分反推

自研 DRM 常用 **VMP 保护的白盒 AES（DCM 变体）**。常规解法是 DFA（故障注入），
但**当 CTR 的 key/iv 是写死的**，有一条更短的路：

```
CTR 模式下  C = P ^ KS(ctr)，KS 只依赖 counter，与 P 无关
⇒ 只要拿到一组已知的 (明文 P, 密文 C)：
     KS = P ^ C
     任意密文的明文：P' = C' ^ KS
```

**适用判据**：`ctr` 与 `key` 都是常量（不随会话变），且你能拿到任意明文对应的密文（能调用加密函数即可）。
**验收判据（必做）**：换一个**随机**输入再对拍一次。只用一组对推出「key」就收工，会把「恰好那组对得上」误判为成功。

**另一条路线是 DFA**（`references/whitebox-and-wasm-crypto.md` 有 wasm2js 版的完整注入写法）：
在倒数第二轮注入单字节故障 → 收集 100 组故障密文 → `phoenixAES` + `aes_keyschedule` 恢复 key。
**注意**：故障注入的前提是**你已经定位到轮函数**（`while` 次数恒为 10 的那个大循环）。

---

## 9. ffmpeg 重封装接入点

**判据：只有 `ffmpeg -i 解密后.ts -c copy out.mp4` 成功，才算解密成功。**

两种接入方式：

| 方式 | 适用 | 做法 |
| --- | --- | --- |
| **改 FFmpeg 源码** | 快速验证 | 参考官方 `doc/examples/remuxing.c`，在 `av_read_frame(ifmt_ctx, pkt)` 返回处截获 `pkt`（`pkt->data` 即 PES/ES 数据），就地解密 |
| **写独立 demuxer** | 不想重编译 | 参考 CicadaPlayer 的 `sampleDecryptDec.c` |

**HLS 输入的坑**：直接传 m3u8 时 `ifmt_ctx` 指向的是 **HLS 层**，真实 TS 的 format context 藏在
`HLSContext → playlists[0]->ifmt_ctx` 里，而 `HLSContext` 结构体**随 FFmpeg 版本变化**——自己去源码里找。

**`service_name` 的读取位置**（模式串就在这里）：

```c
for (int i = 0; i < ctx->nb_programs; i++) {
    AVProgram *p = ctx->programs[i];
    while ((tag = av_dict_get(p->metadata, "", tag, AV_DICT_IGNORE_SUFFIX))) {
        if (!strcmp(tag->key, "service_name") && !strncmp(tag->value, "mdcm", 4)) { /* 解析模式串 */ }
    }
}
```

**IV 的构造**（原实现）：取 `v` 段 33 字符的 hex → `ff_hex_to_data` → 然后

```c
memset(cenc_info->iv + 12, 0, 3);   // 后 4 字节里前 3 个清零
cenc_info->iv[15] = 1;              // 末字节固定为 1
```

即 **前 12 字节来自模式串、末 4 字节被改写为 `00 00 00 01`**。照抄，别自作主张。

---

## 10. 排错速查

| 现象 | 首查 | 次查 |
| --- | --- | --- |
| License 解析在第一个单元就崩 | 忘了 base64 解码 | TLV 的 `length` 是大端 16 bit |
| HMAC-SM3 验签不过 | `msg` 的切法（`split(0xFF 0x0D)[0]`） | MACKey 解错（SM2 密文 `04` 前缀没去掉） |
| `SessionKey` 长度不是 16 | 上一级 SM2 解密输入错 | `mode=1` 与公私钥成对传入 |
| CEK 解出来是 16 字节但解内容全乱 | **SM4-ECB 用了 PKCS7 默认填充** | 内容侧其实是 SM4-CBC（不是 ECB） |
| `service_name` 解析返回 -1 | 段数校验（`cryptoMode` 0→3 段 / 1→4 段） | 模式串被日志/终端截断 |
| `dcm` 解完第一块对、后面全错 | XOR 分支漏了 `counter += 1` | 轮次计数（10 轮）没重置 |
| 解密后 `ffmpeg` 报 NAL 长度异常 | 尾部 2 字节 CRC 没剪 | 解密后长度变了（padding） |
| 首帧坏、后面好 | `a1`（只加密关键帧）标志 | IDR 的 IV 与其它帧不同 |
| 白盒 key 换一次输入就不对 | 只用了单组明密文对 | 改用 DFA 或换一组随机输入复验 |
