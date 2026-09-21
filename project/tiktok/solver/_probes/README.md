# _probes：一次性排查脚本

这些脚本是定位过程中的中间产物，**不保证可直接复跑**（依赖当时的浏览器会话状态）。
保留原因：它们记录了「如何定位」的方法，复现同类问题时可复用思路。

有价值的结论已固化进 `../tt_sign.js`、`../verify-dynosaur-parity.js` 与 `../../README.md`。

## 公用底座

- `_oracle.js` —— 兼容层，转发到 `../cdp-oracle.js`（真正实现已上移，供正式验收脚本复用）。
  `cdp-oracle.js` **双后端**：浏览器被 proxycli daemon 接管时用 proxycli，否则用裸 CDP。

> ⚠️ 用 proxycli 跑探针前先 `proxycli open && proxycli browser connect --cloak`。
> 所有探针都靠 proxycli 的 `evaluate_script` + `list_network_requests`；
> 结果统一 **base64 回传**（结果里的引号/反斜杠经 shell 中转极易损坏）。

## 本轮新方法（值得直接复用）

### 三级定位：从「调用了什么」→「读到了什么」→「缺什么」

| 脚本 | 定位方法 | 结论 |
| --- | --- | --- |
| `probe-seq-divergence.js` | 两侧对同一份 SDK 装同样插桩，把**调用序列逐位置比对** | 88 vs 87 条，**仅差一次 `Date.now`** ⇒ SDK 走同一条代码路径，不是分支差异 |
| `probe-env-value-diff.js` | 白名单取值快照（不能用 Proxy 包整个 sandbox） | 73 项 Node 缺失全局 + 5 项类型不同 + 95 项值不同 |
| `probe-globals-fill.js` | 把缺失全局**按 8 组 + 全量补齐**，看哪组能修 | **全部仍被拒** ⇒ 差异在语义/行为，不在「有没有这个全局」|

结论汇总：`../../artifacts/findings-next-step.json`。

### 其他关键方法

| 脚本 | 定位方法 | 结论 |
| --- | --- | --- |
| `probe-signature-delta.js` | 同一 raw query，离线 vs 页面各取一份签名，**只换单个参数**再发同一端点 | ★ 唯一差异参数 = **X-Dynosaur** |
| `probe-realquery-ab.js` | 用 proxycli 取**页面真实发出的完整 URL** 做同一套 A/B | 用 41 参数真 query 复现同一结论（已固化为 `../verify-realquery-parity.js`）|
| `probe-path-strictness.js` | 同一份签名**只换路径** | recommend 宽松、post/item_list 严格 |
| `probe-block-mssdk.js` | CDP `Network.setBlockedURLs` 在**网络层**掐后端（页面内包 fetch 拦不住，SDK 缓存了引用） | 签名不依赖 mssdk 后端响应 |
| `probe-call-diff.js` | 对 `Math.random` / `Date.now` / `btoa` / `subtle` 打调用日志，Node vs 浏览器比对 | 两边次数差异（曾误以为走了 fallback，已被 `probe-seq-divergence` 推翻）|
| `probe-globals-diff.js` | 列出「浏览器 iframe 有、Node 沙箱缺」的全局 | 缺 30+ 项 |
| `probe-cfg-diff.js` / `probe-cfg-array.js` | 逐字段 diff 页面真 `_mssdk` 与 `loadSeedConfig()` | 页面里 `_mssdk` 实际是 **Array**（带命名属性）；但改对类型无效 |
| `probe-frame-net.js` | 记录 iframe 里 SDK 发出的**全部**请求 | SDK 会请求 `mssdk-sg/web/resource?eq=` 与 `monitor_web/settings`；Node 侧没有 |
| `probe-dynosaur-asn1.js` | 把 X-Dynosaur 载荷当 ASN.1 解 | 非 DER，是私有格式；当前解析器不够，需继续改 |
| `probe-fetch-ex.js` | 借页面把 ttwstatic 上的 JS 原码抓回本地（Node 直连 TLS 会失败） | 可用于更新 `sources/*.orig` |

## 坑（写在这里避免重踩）

1. **不要替换 `window.Date` 本体**做插桩 —— 会丢静态方法/原型语义，SDK 直接报
   `this is not a Date object`。只包装 `Date.now`。
2. **不要用 `Proxy` 包整个 vm sandbox** —— 破坏全局语义，SDK 报 `t is not a constructor`。
3. **内联 243KB SDK 原码进 proxycli 脚本会静默失败** —— 让页面自己 `fetch()`。
4. **`--filePath` 在 worker 模式不支持** —— 大结果在页面内先 diff，只回传摘要。
5. **base64 长度阈值不能设太高**（`btoa('ok')` 仅 4 字符）。
6. **不要用硬编码 query 做基准** —— `device_id`/`odinId`/`verifyFp` 会与当前登录态 cookie
   不匹配，连页面自签都拿不到数据，实验失去基准。用 proxycli 取真 query。

## 早期（上一轮）代表性脚本

- `probe-init3.js` —— 决定性一步：用真实 `_mssdk.cacheOpts` 初始化后，SDK 才开始给业务 API 签名
- `trace-mssdk-bootstrap.js` —— 证明 `_mssdk` 是「就地扩展」而非整体赋值
- `probe-mstoken-seed.js` —— 验证 msToken 无法用注入 cookie 值解决
