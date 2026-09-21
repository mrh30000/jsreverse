# Amazon登录协议逆向分析

> **作者**: rsds0duck | **发布时间**: 2026-05-12 12:27:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 1891 / 8
> **原文**: [https://www.52pojie.cn/thread-2107326-1-1.html](https://www.52pojie.cn/thread-2107326-1-1.html)

---

## Amazon 登录协议逆向：metadata1 与 encryptedPwd

> **作者：** 能让我睡午觉吗、人生导师

这篇记录 Amazon 登录流程的协议逆向过程。最终目标是纯 Python 完成登录，不依赖浏览器。结论先说：加密算法全部还原了，但 bot 检测信号绕不过去，最终还是得靠自动化。

版本：2026 年 5 月，美区 amazon.com。

---

### 登录流程概览

Amazon 的登录不是一个简单的 POST，而是分三步走：

```
GET  /ap/signin        → 重定向到 /ax/claim，拿 cookies + ARB token
POST /ax/claim         → 提交 email + metadata1 → 返回密码页
POST /ap/signin        → 提交 password + metadata1 → 拿到认证 cookies
```

每一步都带一个叫 `metadata1` 的字段，这是设备指纹数据的加密结果。密码提交时还有个 `encryptedPwd` 字段，是 AWS Encryption SDK 格式的加密密码。

---

### metadata1：XXTEA 变种加密

用 Chrome DevTools 在登录页断点，找到 `fwcim` 全局对象。它是 `FWCIMAssets.js`（81kCF8wuZEL.js）暴露出来的指纹采集器。

关键结构：

```
fwcim.globalProfiler.collectAndEncrypt()
// 内部流程：
// 1. collect() → 采集指纹 JSON
// 2. encoder.encode(data) → CRC32hex + '#' + JSON
// 3. encryptor.encrypt(encoded) → XXTEA 加密 + base64
```

直接在控制台调 `fwcim.encryptor.keyProvider.provide()` 就能拿到密钥：

```
{
  identifier: "ECdITeCs",
  material: [1888420705, 2576816180, 2347232058, 874813317]
}
```

所以 metadata1 的最终格式是：

```
ECdITeCs:{base64(xxtea_encrypt(CRC32(email) + '#' + JSON指纹))}
```

XXTEA 算法本身是标准的 Corrected Block TEA，delta 常数 `0x9E3779B9`，轮数 `6 + 52/blockCount`。没有魔改，直接用开源实现就能跑通。

验证方法：把浏览器生成的 metadata1 解密出来，对比自己加密的结果，格式和内容完全一致。

---

### 指纹数据结构

解密 metadata1 之后拿到的 JSON 大概 7KB，核心字段：

| 字段 | 内容 |
| --- | --- |
| `interaction` | 鼠标点击位置、按键间隔、mouseCycles |
| `scripts` | 页面加载的 JS URL 列表 + inline script hash |
| `canvas` | Canvas 指纹 hash + 256 bin 直方图 |
| `gpu` | WebGL vendor/model/extensions |
| `performance.timing` | Navigation Timing API 全量数据 |
| `automation.wd` | navigator.webdriver 检测结果 |
| `form` | 各表单字段的交互数据（点击、按键、焦点时间） |

有意思的是 `automation.wd.properties.navigator` 这个字段 — 它会列出 navigator 上所有自动化相关的属性。Playwright 默认会暴露 `webdriver` 属性，这里就会被记录下来。

但实测发现：**即使 `webDriver: true`，email 提交这一步也能通过**。Amazon 不是在 metadata1 层面做拦截的。

---

### encryptedPwd：AWS Encryption SDK 格式

密码加密用的是 SiegeCrypto，加载自 `AuthenticationPortalSigninNA.js`。在 DevTools 里挖它的内部结构：

```
engine._encryptionEngine.getDataTypeStorage()._dataTypes._entries
  .AuthPortalSigninPasswordNA._value.value.publicKeyProvider
// → keyId: "973900addb061fbe5bb4ea871e9d8161"
// → providerId: "si:md5"
// → wrappingAlgorithm: RSA-OAEP SHA-256
```

公钥是 2048-bit RSA，JWK 格式，从 `static.siege-amazon.com` 加载。加密流程：

1. 生成随机 AES-128 密钥
2. RSA-OAEP-SHA256 加密 AES 密钥
3. HMAC-SHA256 KDF 派生加密密钥
4. AES-128-GCM 加密密码明文
5. 按 AWS Encryption SDK Message Format v1 组装消息

整个消息结构：`header + headerAuthIV(12) + headerAuthTag(16) + finalFrameHeader + ciphertext + frameTag(16)`

Python 用 pycryptodome 实现，大概 100 行代码。

**但是**：实测发现直接提交明文 `password` 字段（不带 `encryptedPwd`）也能登录成功。Amazon 服务端两种都接受。所以 encryptedPwd 不是必须的。

---

### Bot 检测：真正的拦截点

加密算法全部还原之后，纯 HTTP 请求跑登录流程：

* Step 1 GET 页面：通过
* Step 2 POST email：通过，拿到密码页
* Step 3 POST password：被重定向到 `/ap/cvf/request`（aamation challenge）

问题出在哪？抓浏览器的请求对比发现，浏览器在 Step 2 和 Step 3 之间会自动发一个 POST 到：

```
https://unagi-na.amazon.com/1/events/com.amazon.BotCXPolicy.na.prod.bd
```

请求体里有个 `additionalData` 字段，是一个 2.5KB 的加密 blob。这个数据由 `BotDetectionJSSignalCollectionAsset`（31QQnN9HM+L.js）和 `BotCXMetricsCollectionJSAsset`（41zhkvN-TOL.js）生成。

这两个 JS 加起来 33KB，重度混淆，需要完整的浏览器 DOM 环境才能运行。它们采集的是浏览器行为指纹（不是设备指纹），包括事件循环特征、渲染时序、内存分配模式等。

尝试发送一个假的 bot signal（`additionalData` 填 placeholder）：服务端返回 200，但密码提交仍然被拦截。说明服务端会校验这个加密数据的有效性。

---

### 结论

| 组件 | 能否纯 Python 还原 | 备注 |
| --- | --- | --- |
| metadata1 (XXTEA) | 完全还原 | 密钥固定，算法标准 |
| encryptedPwd (RSA+AES) | 完全还原 | 但实际不需要 |
| BotDetection signal | 无法还原 | 需要真实浏览器环境 |

最终方案：Playwright + Chrome（非 headless shell）+ stealth 注入，包装成 FastAPI 接口。有头模式的 Chrome 能通过所有检测，各位也可以自己找一下指纹浏览器，我这里就不打广告了，每次登录约 30 秒

纯协议登录的路在 BotDetection 这里断了。除非能逆向那 33KB 的混淆 JS 并在 Node.js 里模拟出完整的浏览器行为指纹，否则绕不过去。这块等后续有精力再研究。
