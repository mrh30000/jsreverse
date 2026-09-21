# 行动方案与关联分析

原 `src/tools/analyzer/reports.ts`（`buildActionPlan` / `buildWhyTheseSteps` / `buildStopConditions`）与 `analyzeTarget.ts` 的规则。Agent 按这些模板生成 `actionPlan`、`whyTheseSteps`、`stopIf`、`nextActions`。

## 行动方案（buildActionPlan）

按序拼接，编号从 1 开始：

1. 调用 `collect_code`，参数 `{"url":"<target>","returnMode":"top-priority","topN":10}`。
2. 有可疑流 → `重点观察可疑请求: <METHOD> <URL>，命中指标: <signatureIndicators>`；否则 → `先触发登录/下单/关键业务操作，再重新分析捕获动态请求`。
3. 有优先目标 → 网络型：`优先复现网络链路: <target>（priority=<score>）`；函数型：`优先审计函数: <target>（priority=<score>）`。
4. 有签名候选函数 → `使用 search_in_scripts 搜索函数名 "<fn>"，并深挖调用链`；否则 → `使用 search_in_scripts 搜索关键词 sign/token/auth/nonce，定位签名生成点`。
5. 有 Hook → `调用 get_hook_data 查看首个 hook 数据: {"hookId":"<id>"}`；否则 → `用 create_hook + inject_hook 手工注入 fetch/xhr hook 后再采样`。
6. 收尾：`对疑似签名代码先做 AST 解混（ast-deobfuscation 技能）并复测请求参数变化`。

> 原第 6 步引用的 `deobfuscate_code` 工具已下线，改为 `ast-deobfuscation` 技能。

## 为什么是这些步骤（buildWhyTheseSteps）

- 有请求指纹 → `观察到可疑的请求指纹：<前2个>`；否则 → `尚未捕获稳定请求指纹，后续步骤将继续观察和轻量采集。`
- 有候选函数 → `找到候选签名函数：<前3个>`；否则 → `未发现明显的签名函数名，工作流将优先依赖请求和 Hook 证据。`
- Hook 记录 > 0 → `Hook 已采集到 <n> 条记录，足以开始关联分析和本地重建。`；否则 → `Hook 尚未产出数据，应避免过早进行本地重建猜测。`

## 停止条件（buildStopConditions）

- 可疑流 > 0 → `目标请求路径确认后即可停止扩大采集范围，并导出重建 Bundle。`；否则 → `若尚未确认可疑请求路径，应先触发目标操作后再停止分析。`
- Hook 记录 > 200 → `Hook 数据超过 200 条时应先降噪（summary 视图或缩小目标），再决定是否注入新 Hook。`；否则 → `Hook 证据不足以定位问题时，再考虑升级到断点调试。`

## 下一步动作（nextActions）

- 加密算法数 > 0 → `Focus on crypto-related files from top-priority list.`
- Hook 时间线为空 → `Trigger page interactions and rerun get_hook_data / 目标分析。`
- 有高危安全风险 → `Review high-severity security findings and verify call stacks.`

## 关联分析常量

| 项                | 默认      |
| ----------------- | --------- |
| topN              | 8         |
| 采集超时          | 30s       |
| 分析代码上限      | 300k 字符 |
| 关联窗口          | 1500ms    |
| 最多关联流        | 20        |
| 最多指纹          | 12        |
| 活跃 URL 上限     | 10        |
| 可疑流上限        | 10        |
| 时间线样本上限    | 30        |
| 优先目标上限      | 10        |
| Hook 记录停止阈值 | 200       |

## Hook 预设

- `none`：不注入。
- `api-signature`：`fetch, xhr, websocket`。
- `network-core`：`fetch, xhr, websocket, eval, timer`。
