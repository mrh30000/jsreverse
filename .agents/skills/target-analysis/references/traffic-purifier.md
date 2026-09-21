# 流量提纯规则

原 `src/modules/analyzer/ai/TrafficPurifier.ts` 的确定性规则。输入 `CapturedRequestRow[]`，输出 `PurifiedRequest[]`（按 sequence 升序，上限默认 100 条）。

## 过滤

1. **静态资源**：pathname 扩展名命中
   `png jpg jpeg gif svg ico woff woff2 ttf eot css map webp avif mp4 mp3 webm ogg wav bmp tiff`
2. **追踪域名**（hostname 等于或为其子域）：
   `google-analytics.com googletagmanager.com doubleclick.net sentry.io clarity.ms hotjar.com segment.com segment.io mixpanel.com amplitude.com bugsnag.com`

> 注意：不要复用 `PatternDetector.BLACKLIST_DOMAINS`（混入 CDN 与广告域名，会误删逆向最需要的 JS bundle）。

## 关键 Header 提取

保留业务/鉴权/签名相关 Header，丢弃噪声：
`sec-ch-ua*`、`sec-fetch-*`、`accept-encoding`、`accept-language`、`connection`、`host`。

## 字段裁剪

- `bodyPreview` / `responsePreview`：超 1000 字符截断为 `前1000...`。
- 无 body 且 content-type 为二进制（含 `image/ octet-stream pdf zip protobuf binary`）时，`responsePreview` 置 `"[Binary Data]"`。

## 输出结构

```json
{
  "sequence": 1,
  "method": "POST",
  "url": "https://…",
  "source": "cdp",
  "statusCode": 200,
  "durationMs": 42,
  "contentType": "application/json",
  "keyHeaders": {"content-type": "application/json"},
  "bodyPreview": "…",
  "responsePreview": "…",
  "isStreaming": 0,
  "isWebSocket": 0
}
```

请求行可由 `session_get_data` 获取，字段一一对应。
