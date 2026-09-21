# 场景推断规则

原 `src/modules/analyzer/ai/SceneDetector.ts` 的确定性规则。输入为会话请求行（`CapturedRequestRow`）与 Hook 行（`HookRecordRow`），单遍 O(N) 扫描。

## 标签与置信度

| 标签             | 判定                                                                                                                                                                                       | 置信度                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `auth-token`     | `Authorization: Bearer <jwt>`；JWT 格式（`xxx.yyy.zzz` 或 `ey` 开头）；`x-*-token` 类 Header；URL 参数 `access_token/token/jwt/auth_token/accessToken/authToken/id_token`；body 含同名字段 | JWT → high；自定义 token → medium                                     |
| `signature-hash` | URL 参数或 Header 含 `sign/signature/sig/hmac/nonce/timestamp/_ts/app_key/api_key`；body 含 `sign/signature/hmac`                                                                          | 值为 32-128 位十六进制、命中 ≥2 个参数、或含 hmac → high；否则 medium |
| `crypto-cipher`  | body 含 `ciphertext/encryptedData/"cipher"/"iv"`；或 Hook 命中加密函数                                                                                                                     | 请求体特征 → medium；crypto Hook → high                               |
| `ai-sse`         | `isStreaming=1` 或 content-type `text/event-stream`；URL 含 `completions/chat/sse/stream` 或 chunked                                                                                       | 流式 → high；关键字 → medium                                          |
| `login-flow`     | URL/body 含 `login/signin/captcha/sms/verify/auth/login/oauth/authorize/passport`                                                                                                          | POST/PUT 且直接登录/校验端点 → high；否则 medium                      |

## 合并规则

同一标签多次命中时，置信度取最高（high > medium > low），evidence 用 `; ` 连接，matchedUrls 去重。

## crypto Hook 判定

`hookType` 为 `crypto` / `crypto_lib`，或 functionName 含 `subtle. / cryptojs / sm2 / sm3 / sm4 / jsencrypt / aes / rsa / des / encrypt / decrypt`。

## 常量

- JWT：`/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/`
- 十六进制摘要：`/^[a-fA-F0-9]{32,128}$/`

## 输出结构

```json
[
  {
    "scene": "signature-hash",
    "confidence": "high",
    "evidence": "Detected signature / hash parameters: [sign, nonce]",
    "matchedUrls": ["https://…"]
  }
]
```
