---
name: target-analysis
description: 目标级/会话级逆向分析工作流技能，替代已移除的 analyze_target、session_analyze_purified、session_generate_report 三个 MCP 工具。当需要一键式采集代码+Hook 时间线并给出行动方案、对抓包会话做场景推断/流量提纯/加密切片、或产出会话分析报告时使用。规则逻辑以参考实现形式保留，调用方 Agent 用现有工具（collect_code/create_hook/get_hook_data/session_get_data 等）复现。
---

# 目标与会话分析工作流（Agent 自行编排）

`analyze_target` / `session_analyze_purified` / `session_generate_report` 已从 MCP 工具面移除。它们原本是「规则提纯 + 可选 LLM 生成」的编排工具；现在编排由调用方 Agent 完成，规则逻辑保留在 `references/` 中。

## 不变量

- 无内置 LLM：所有生成式结论由 Agent 自己产出，不再有 `useAI` 参数或服务端模型调用。
- 规则优先：场景推断、流量提纯、加密切片都是确定性规则，先跑规则再让 Agent 解读。
- 证据落盘：结论写回 `record_reverse_evidence`，不要只留在对话里。

## A. 目标一键分析（对应 analyze_target）

原工具串行做了这些事，按顺序复现：

1. **采集代码**：`collect_code --url <target> --smartMode priority`，再用 `getTopPriorityFiles` 同款逻辑取 top N（默认 8）；合并代码上限 300k 字符。
2. **装 Hook**：按预设注入（`api-signature` → fetch/xhr/websocket；`network-core` → 再加 eval/timer），`create_hook` + `inject_hook`。
3. **触发动作**：需要时 `replayActions`（navigate/click/type/wait/scroll/pressKey/evaluate）复现业务操作。
4. **加密检测**：对合并代码做关键字 + AST 规则检测（见 `code-analysis` 技能的加密识别）。
5. **静态分析**：按 security focus 做一次代码理解（见 `code-analysis`）。
6. **关联 Hook 时间线**：`get_hook_data` 采样后按 correlationWindow（默认 1500ms）聚合网络流、算请求指纹、提签名链候选。
7. **产出行动方案**：按 `references/action-plan.md` 的模板给出 recommendedNextSteps / whyTheseSteps / stopIf / nextActions。

输出契约（原 `AnalyzeTargetData`）：`target`、`durationMs`、`collection`、`analysis{qualityScore,securityRiskCount,cryptoAlgorithms}`、`hooks{preset,hookIds,correlatedFlows,suspiciousFlows,timelineSample}`、`requestFingerprints`、`priorityTargets`、`signatureChain`、`actionPlan`、`recommendedNextSteps`、`whyTheseSteps`、`stopIf`、`nextActions`、`replay`。

## B. 会话提纯（对应 session_analyze_purified）

1. `session_get_data --sessionId <id>` 取请求与 Hook 记录。
2. **场景推断**：按 `references/scene-detection.md` 的规则给 auth-token / signature-hash / crypto-cipher / ai-sse / login-flow 打标签与置信度。
3. **流量提纯**：按 `references/traffic-purifier.md` 过滤静态资源与追踪域名，抽取关键 Header 与 body 预览，上限 100 条。
4. **加密切片**：按 `references/crypto-slicing.md` 从 Hook 调用栈解析 JS 帧，配合 `get_script_source` 取上下文（±10 行）。
5. **组装提示词**：用 `references/prompt-templates.md` 的模板（与已删除的 PromptBuilder 一致），把 `systemPrompt + userPrompt` 作为 `recommendedPrompt` 交给 Agent。

输出：`sessionId`、`mode`、`sceneHints`、`purifiedRequests`、`cryptoSnippets`、`recommendedPrompt`。

## C. 会话报告（对应 session_generate_report）

1. 复用 B 的提纯结果（同一套规则）。
2. 按模式（auto/api_reverse/security/perf/js_crypto）选系统提示词，分析提纯数据。
3. 生成 Markdown 报告；本技能取代了原「离线降级报告」，Agent 未产出时的兜底结构见 `references/prompt-templates.md` 的 fallback 小节。
4. 需要持久化时写入会话报告存储（原 `ai_reports` 表已随工具移除，改由 `record_reverse_evidence` + `export_session_report` 落盘）。

## 相关工具

```bash
browsercli call session_create --name "<name>" --targetUrl "<url>"
browsercli call session_get_data --sessionId "<id>"
browsercli call collect_code --url "<url>" --smartMode priority
browsercli call get_hook_data --hookId "<id>" --view detail
browsercli call record_reverse_evidence --taskId "<task>" --entry '{"note":"..."}'
browsercli call export_session_report --format markdown
```
