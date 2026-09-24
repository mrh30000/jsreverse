---
name: target-analysis
description: 目标级/会话级逆向分析工作流技能，替代已移除的 analyze_target、session_analyze_purified、session_generate_report 三个 MCP 工具。当需要一键式采集代码+Hook 时间线并给出行动方案、对抓包会话做场景推断/流量提纯/加密切片、或产出会话分析报告时使用。规则逻辑以参考实现形式保留，调用方 Agent 用现有工具（collect_code/create_hook/get_hook_data/list_network_requests 等）复现。当出现「网络面板没有接口但页面有数据」「RENDER_DATA / __NEXT_DATA__ / __INITIAL_STATE__」「SSR 直出数据」「无限滚动加载不动」「XHR 截获拿不到响应」「列表数据导出 CSV」这类采集侧现象时，也用本技能（见 references/in-page-data-carriers.md）。当出现「抓包工具里空无一物 / 只有 Tunnel to 443 / 客户端 certificate verify failed / 程序一设代理就无法联网」这类捕获层现象时，也用本技能（见 references/capture-layer-tooling.md）。
---

# 目标与会话分析工作流（Agent 自行编排）

`analyze_target` / `session_analyze_purified` / `session_generate_report` 已从 MCP 工具面移除。它们原本是「规则提纯 + 可选 LLM 生成」的编排工具；现在编排由调用方 Agent 完成，规则逻辑保留在 `references/` 中。

## 不变量

- 无内置 LLM：所有生成式结论由 Agent 自己产出，不再有 `useAI` 参数或服务端模型调用。
- 规则优先：场景推断、流量提纯、加密切片都是确定性规则，先跑规则再让 Agent 解读。
- 证据落盘：结论直接写入任务目录 `artifacts/tasks/<task-id>/`（`record_reverse_evidence` 已下线），不要只留在对话里。

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

1. 用 `list_network_requests` 取请求记录、`get_hook_data` 取 Hook 采样（原 `session_get_data` 已随抓包会话工具下线）。
2. **场景推断**：按 `references/scene-detection.md` 的规则给 auth-token / signature-hash / crypto-cipher / ai-sse / login-flow 打标签与置信度。
3. **流量提纯**：按 `references/traffic-purifier.md` 过滤静态资源与追踪域名，抽取关键 Header 与 body 预览，上限 100 条。
4. **加密切片**：按 `references/crypto-slicing.md` 从 Hook 调用栈解析 JS 帧，配合 `get_script_source` 取上下文（±10 行）。
5. **组装提示词**：用 `references/prompt-templates.md` 的模板（与已删除的 PromptBuilder 一致），把 `systemPrompt + userPrompt` 作为 `recommendedPrompt` 交给 Agent。

输出：`sessionId`、`mode`、`sceneHints`、`purifiedRequests`、`cryptoSnippets`、`recommendedPrompt`。

## C. 会话报告（对应 session_generate_report）

1. 复用 B 的提纯结果（同一套规则）。
2. 按模式（auto/api_reverse/security/perf/js_crypto）选系统提示词，分析提纯数据。
3. 生成 Markdown 报告；本技能取代了原「离线降级报告」，Agent 未产出时的兜底结构见 `references/prompt-templates.md` 的 fallback 小节。
4. 需要持久化时由 Agent 直接写 Markdown 到 `artifacts/tasks/<task-id>/session-report.md`（原 `ai_reports` 表与 `record_reverse_evidence` / `export_session_report` 工具均已移除）。

## D. 页面直出数据载体与列表采集驱动（B32）

**何时用**：网络面板里**没有数据接口**、但页面上明明有数据（SSR / 直出），
或者数据接口要**滚动到底 / 点分页**才发出来（**驱动**问题，不是解密问题），
或者你已拿到响应、要**批量落盘**。判据、载体清单与两个静默陷阱见
`references/in-page-data-carriers.md`。

三步骨架：

1. **先分清「没有接口」还是「没触发」**（判据表在该文件 §1）——
   把「没触发」当「没接口」去翻 DOM，会在一屏 20 条数据上耗掉一整轮；
2. **直出载体按命中率取**：`<script id="RENDER_DATA">`（**URL-encoded JSON，必须先
   `decodeURIComponent` 再 `JSON.parse`**）→ `__NEXT_DATA__` → `window.__INITIAL_STATE__` / `__NUXT__`
   → JSON-LD → `data-*`；
3. **增量靠「截获 + 驱动」**：XHR 截获**必须用 `this.responseURL`**（源文里的 `this._url`
   不是标准属性 ⇒ 判断条件永远不成立、一条都不收，且**不报错**），
   并在 `addEventListener("load")` 里做，**不要覆盖 `onreadystatechange`**（那是页面在用的属性）。
   驱动优先级：**直接驱动分页参数 > 点「加载更多」 > 滚屏**。

## E. 捕获层工具与盲区（B33）

**何时用**：抓包工具里空无一物 / 只有 `Tunnel to` 443 / 客户端报证书错 / 程序一开代理就断网 ——
即「**这个包到底能不能抓到、抓不到时是哪一层断的**」。这是 `references/traffic-purifier.md` 的**上游一层**
（那份规则管「**已经抓到的流量**怎么提纯」，本文管「**流量凭什么能被抓到**」）。

三句判据：

1. **抓包 = 让流量经过代理**（`127.0.0.1:8888`）：不经过就抓不到；HTTPS 解密 = 中间人，前提是客户端信任根证书；
2. **抓不到先分三种形态**：程序**自带 HTTP 栈**直连 socket（全局代理对它无效，用 `depends` 看是否依赖 `WININET.DLL`）→
   **自带 CA bundle、不读系统根证书**（`Tunnel to` 443 后没有下文 + `certificate verify failed`）→
   **客户端主动检测代理**（一开代理就断网）；
3. ★ **域名必须在代理层可见**：`Resolve hostnames through proxy` 不勾 ⇒ 代理只收到 `CONNECT 180.97.33.108:443`，
   伪造证书签给了 IP ⇒ 做校验的客户端就报错。

改包路线（改 Request 骗服务器 vs 改 Response 骗客户端）、FiddlerScript / AutoResponder / 命令调试，
以及封包字段与 304 假象，见 `references/capture-layer-tooling.md`。

## 相关工具

```bash
browsercli call list_network_requests --urlFilter "<pattern>" --pageSize 50
browsercli call collect_code --url "<url>" --smartMode priority
browsercli call get_hook_data --hookId "<id>" --view detail
# 证据落盘：直接写入 artifacts/tasks/<task-id>/（原 record_reverse_evidence / export_session_report 工具已下线）
```

> 抓包会话隔离工具（`session_create` / `session_list` / `session_get_data` / `session_export`）已下线。会话状态管理现聚焦于浏览器 Cookie/Storage 快照：`save_session_state` / `restore_session_state` / `list_session_states` / `dump_session_state` / `load_session_state` / `delete_session_state`。
