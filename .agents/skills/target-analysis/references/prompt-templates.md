# 会话分析提示词模板

原 `src/modules/analyzer/ai/PromptBuilder.ts` 的提示词。工具面移除 LLM 后，Agent 直接用这些模板对提纯结果推理。

## 角色头

```text
你是一名资深 Web 逆向与流量分析专家，擅长从抓包数据中还原接口链路、签名算法与加密逻辑。
```

## 系统提示词（按模式）

- `auto`：综合场景标签、高价值请求与加密代码切片，先判定业务场景（鉴权 / 签名 / 加密 / AI 流式 / 登录），再给出最值得深入的逆向方向与下一步建议。
- `api_reverse`：侧重接口签名与入参结构，逐条分析高价值请求的 URL、方法、关键 Header 与 body，还原本接口参数构造顺序、必填/可选字段与签名入参，输出可复现的请求构造流程。
- `security`：侧重鉴权与传输安全，审查 Token 传递、鉴权绕过、明文敏感数据、签名可重放性、Cookie/Header 安全属性，列风险点与证据。
- `perf`：侧重性能，结合时序与耗时识别慢接口、重复请求、瀑布式串行依赖与大响应体。
- `js_crypto`：侧重算法识别与密钥还原，分析加密切片中的函数（md5/sha/AES/RSA/SM 系列），推断算法、模式、padding、密钥与 IV 来源，给出本地复现路径。

## 用户提示词骨架

```text
分析目标: {targetUrl}
分析模式: {mode}

## 场景推断
- [{scene}] confidence={confidence}: {evidence} | matched: {urls}

## 高价值请求 ({n})
- #{sequence} {method} {url} -> {statusCode} ({durationMs}ms)
  headers: {keyHeaders}
  body: {bodyPreview}

## 加密代码切片 ({n})
- {functionName} ({hookType}) @ {file}:{line}
  {sourceSnippet}

请基于以上提纯数据，按当前模式输出结构化分析结论。
```

## 离线兜底报告（无 Agent 生成时）

```markdown
# AI 分析报告（离线降级）

## 分析模式

{auto|api_reverse|security|perf|js_crypto}

## 场景推断

- **{scene}** (置信度: {confidence}) — {evidence}

## 高价值请求

| 序号       | 方法     | URL   | 状态码       |
| ---------- | -------- | ----- | ------------ |
| {sequence} | {method} | {url} | {statusCode} |

## 加密代码切片

- **{functionName}** — {file} (line {line})

## 建议

- {按模式给出的建议条目}
```

## 各模式建议

- `auto`：核对场景标签；优先深入置信度最高场景；把请求时序与切片作为下一轮上下文。
- `api_reverse`：还原签名参数拼装顺序；重放确认最小 Header/Cookie 集；定位 writer/builder 函数并用 Hook 采样。
- `security`：检查 Authorization/Cookie 明文或可预测 Token；验证时间戳与 nonce 防重放窗口；审查敏感接口鉴权。
- `perf`：按 durationMs 排序定位慢请求；识别串行瀑布；统计重复/轮询请求。
- `js_crypto`：沿切片函数名回溯调用链定位 entry 与密钥常量；确认 mode/padding/IV 并本地对齐；混淆源码先解混。
