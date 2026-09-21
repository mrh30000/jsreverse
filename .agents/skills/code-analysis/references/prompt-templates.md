# 分析提示词模板

以下模板原属 `src/services/LLMService.ts` 与 `src/modules/analyzer/AISummarizer.ts` 的内置提示词。工具面移除 LLM 后，由调用方 Agent 使用同样的提示词自行推理，保持输出契约不变。

## 1. 代码理解（understand_code）

System:

```text
You are an expert JavaScript reverse engineer. Analyze code and return strict JSON only.
```

User:

```text
Focus: {all|structure|business|security}

Return JSON with: techStack, businessLogic, securityRisks, summary.

Code:
{code}
```

要求：`focus` 只控制分析侧重，返回结构仍以 SKILL.md 的「代码理解」契约为准。

## 2. 加密检测（detect_crypto）

System:

```text
You are a cryptography code auditor. Detect algorithms and return strict JSON only.
```

User:

```text
Return JSON with: algorithms[] where each item contains name, type, confidence, usage, parameters.

Code:
{code}
```

注意：先做关键字/AST 规则检测，LLM/Agent 只用于补充自定义或魔改算法；`parameters` 记录 mode/padding/key/iv。

## 3. 污点分析增强

System:

```text
You are a JavaScript taint-analysis assistant. Return strict JSON only.
```

User:

```text
Sources: {sources}
Sinks: {sinks}

Return JSON with taintPaths and highRiskFlows.

Code:
{code}
```

规则分析已给出基础 taintPaths 时，本提示用于补全被规则遗漏的传播链。

## 4. 反混淆说明

System:

```text
You are an advanced JavaScript deobfuscation expert. Explain transformations and produce cleaned code guidance.
```

User:

```text
Analyze obfuscation techniques and provide a concise remediation strategy.

Code:
{code}
```

实际解混请走 `ast-deobfuscation` 技能；本提示只产出策略说明。

## 5. 单文件摘要（summarize_code single/batch）

User:

````text
Analyze this JavaScript file and provide a structured summary:

**File**: {url}

**Code**:
```javascript
{code}
````

Provide analysis in JSON format with the following structure:
{
"summary": "Brief description of what this code does",
"purpose": "Main purpose of this file",
"keyFunctions": ["function1", "function2"],
"dependencies": ["dependency1", "dependency2"],
"hasEncryption": true/false,
"encryptionMethods": ["AES", "RSA"] (if applicable),
"hasAPI": true/false,
"apiEndpoints": ["/api/endpoint1"] (if applicable),
"hasObfuscation": true/false,
"obfuscationType": "type" (if applicable),
"securityIssues": ["issue1", "issue2"],
"suspiciousPatterns": ["pattern1"],
"complexity": "low/medium/high",
"recommendations": ["recommendation1"]
}

````

单文件超过约 10000 字符时截断并标注 `... (truncated)`。批量模式并发不超过 3，保持结果顺序。

## 6. 项目摘要（summarize_code project）

User:
```text
Analyze this JavaScript project based on the following files:

{JSON.stringify(fileInfos, null, 2)}

Provide a high-level summary including:
1. Main purpose of the project
2. Architecture pattern (MVC, SPA, etc.)
3. Key technologies used
4. Security concerns
5. Recommendations for reverse engineering

Format your response as JSON.
````

`fileInfos` 每项含 `{url, size, type, preview(前 200 字符)}`。
