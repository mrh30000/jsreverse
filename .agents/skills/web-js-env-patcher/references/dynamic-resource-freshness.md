# 动态 HTML / JS 资源保鲜与运行时刷新

当目标站点的 HTML、JS bundle、动态 chunk、challenge JS、403/风控页面或内联脚本可能随时间、会话、Cookie、seed、nonce、地域、TLS 指纹或点击动作变化时读取本文件。目标是防止把已经过期的本地快照当作最终补环境输入。

## 核心规则

- 下载到本地的动态 HTML / JS 默认只是 **分析快照**，不能直接作为最终产物的固定依赖。
- 最终入口运行时必须先刷新当前有效资源，再加载当前资源生成加密参数并发送请求。
- 如果资源会过期，最终项目必须包含资源刷新模块，例如 `src/resources/fetch-runtime-resources.js` 或等价封装。
- cURL / HAR / fixture 中的旧 HTML、旧 JS、旧 seed、旧 token、旧 Cookie 只能作为证据和 expected，不得硬编码到最终 signer。
- 请求失败或参数不一致时，先检查资源是否过期、JS hash 是否变化、challenge seed 是否变化，再继续补 WebAPI。

## 动态性判定

任一条件命中时，将资源标记为动态或高风险：

| 证据 | 说明 |
|---|---|
| `Cache-Control: no-store/no-cache/private/max-age=0` | 不应长期复用 |
| `Expires` 已过期或 TTL 很短 | 需要运行时刷新 |
| URL 含 `t/ts/timestamp/nonce/rand/random/_` 等 query | 可能每次变化 |
| 同 URL 多次请求 body hash 不一致 | 不能固定本地文件 |
| HTML 内联 `seed/nonce/config/challenge/token` 每次变化 | 必须刷新入口页 |
| 403 / challenge 页面返回 JS | 通常与当前会话绑定 |
| 响应包含 `Set-Cookie` | 可能刷新设备 Cookie / 风控 Cookie |
| JS URL 从当前 HTML 动态拼接 | 需要最终入口重新解析 HTML |
| JS 内容依赖当前 Cookie / Storage / 地域 / TLS | 需要和请求客户端链路绑定 |

## 资源清单

每个已保存资源都记录到 `case/notes/resource-manifest.json`：

```json
{
  "resources": [
    {
      "url": "https://example.com/challenge.js?ts=...",
      "type": "js",
      "file": "case/js/snapshots/challenge-001.js",
      "capturedAt": "2026-06-23T00:00:00.000Z",
      "status": 200,
      "headers": {
        "cache-control": "no-store",
        "set-cookie": "脱敏记录"
      },
      "sha256": "body hash",
      "dynamic": true,
      "use": "analysis-snapshot",
      "requiredForFinal": true,
      "runtimeRefresh": true,
      "refreshEntry": "result/src/resources/fetch-runtime-resources.js",
      "dependsOn": ["Cookie", "HTML seed", "TLS client"]
    }
  ]
}
```

字段要求：

- `dynamic: true`：明确动态资源。
- `use: "analysis-snapshot"`：只用于分析，不进入最终主路径。
- `use: "runtime-refresh"` 或 `runtimeRefresh: true`：最终运行前刷新。
- `requiredForFinal: true`：最终生成参数需要它；此时必须提供运行时刷新方案。
- `refreshEntry`：最终项目中负责重新获取该资源的模块。

## 目录约定

```text
case/
├── js/
│   ├── snapshots/        # 动态资源快照，只用于分析
│   ├── static/           # 已确认可长期复用的静态 bundle
│   └── extracted/
├── notes/
│   └── resource-manifest.json
└── result/
    ├── final.js
    └── src/
        ├── resources/    # 运行时刷新 HTML / JS / challenge
        ├── env/
        ├── signer/
        └── request/
```

动态资源可以保存在 `case/js/snapshots/`，但不得原样复制到 `result/` 作为 signer 主输入。

## 「同一次页面修订」原则（多资源必须成套）

挑战类页面（如 202 / 412 + 内联脚本 + 外链 JS，见 `ruishu-botgate.md`）的资源**不是独立的**，
而是同一次服务端修订生成的一套。必须成套刷新、成套使用：

| 资源 | 是否每次刷新都变 | 说明 |
|---|---|---|
| 入口 HTML 的 `meta.content` / 内联 seed | 变 | 参与生成运算 |
| 内联自执行脚本（定义 `$_ts`） | 变量名变、逻辑不变 | 与 `meta.content` 配套 |
| 外链 JS（如 `c.FxJzG50F.dfe1675.js`） | **文件名变**，同站同页内容较稳定 | 与上面两者配套 |
| 服务端下发 Cookie（如 `...S`） | 变 | 与当前会话绑定 |

规则：

- **禁止跨修订混用**：拿 A 次的 `meta.content` 配 B 次的外链 JS，通常直接 400。
- 三个资源的 `sha256` 与 `capturedAt` 必须来自**同一次请求序列**，并在 manifest 中标记同一 `revisionId`。
- 外链 JS 的文件名会变，本地按名匹配会失败。用
  `node scripts/extract_challenge_bundle.js` 抽取并记录 sha256；脚本按
  「精确 → 哈希片段 → 主体名 → 唯一候选」降级匹配，**任何降级都会告警，必须人工确认**。
- 资源内容必须保持**原始字节**（不得被 linter / 格式化器 / 编辑器改写），因为内容本身参与校验。
  证据存 `.orig` 后缀。

## 运行时状态也是「资源」

除了网络资源，**运行时状态同样跨运行传递**：`document.cookie`、`localStorage`、`sessionStorage`
在生成链路里可能被写入后再读回，形成自举依赖。

- 判据与处理见 `multi-pass-cookie-generation.md`。
- 刷新资源时**不要顺带清空 Storage / Cookie**，否则会破坏自举前提。
- 反过来，跨会话复用过期的 Storage 也会失败；应按 `revisionId` 一起判定有效性。

## 最终入口流程

涉及动态 HTML / JS 时，最终入口应按以下顺序执行：

1. 使用用户已确认的 TLS 指纹兼容客户端请求入口页或 challenge 页。
2. 解析最新 HTML，提取当前 seed、nonce、config、动态 JS URL、Set-Cookie。
3. 按当前页面状态请求最新 JS / chunk / challenge 资源。
4. 验证资源 hash、状态码和关键字段，并更新运行时资源上下文。
5. 将当前 JS / seed / Cookie / Storage 注入补环境运行链路。
6. 生成目标加密参数。
7. 用同一会话 / Cookie / TLS 客户端发送最终请求。

不得在最终入口中只执行“加载旧本地 JS 快照 → 生成参数 → 请求”。

## 验证

进入最终交付前运行：

```bash
node scripts/check_dynamic_resources.js --case-dir case --markdown
node scripts/check_dynamic_resources.js --case-dir case --require-runtime-refresh --markdown
```

检查失败时先修复资源刷新链路，再继续补环境或最终请求。

## 输出模板

```markdown
## 动态资源保鲜检查

- 是否存在动态 HTML / JS：
- 动态资源清单：
- 是否只作为分析快照：
- 是否影响最终参数生成：
- 最终入口是否运行时刷新：
- 刷新模块：
- 当前资源 hash 是否与 fixture 一致：
- 失败时是否先排查资源过期：
```
