---
name: code-analysis
description: JavaScript 代码静态分析技能，替代已移除的 understand_code / summarize_code / risk_panel / detect_crypto MCP 工具。当需要理解代码结构、业务逻辑、技术栈、污点数据流、安全风险、加密算法，或对单文件/批量/项目做摘要与风险评分时使用。分析由调用方 Agent 自己完成，本技能只负责采集证据、给出提示词模板、评分口径与产出结构。
---

# 代码静态分析（Agent 自行分析）

原 `understand_code` / `summarize_code` / `risk_panel` / `detect_crypto` 工具已从 MCP 工具面移除。分析不再由服务端内置 LLM 完成，而是：**用基础工具采集代码与运行时证据 → 按本技能给定的提示词与口径自行分析 → 产出与原工具一致的结构化结果**。

## 不变量

- Agent 即分析器：不要等待任何 `*_ai` / `useAI` 参数，工具面已无 LLM。
- 证据优先：先 `collect_code` / `search_in_scripts` / `get_script_source` / `get_hook_data` 拿到源码与样本，再下结论；不要凭 URL 猜逻辑。
- 输出与原工具契约保持一致（见各节 JSON 结构），下游仍按这些字段消费。

## 采集证据

```bash
# 收集页面脚本（按优先级返回，便于挑重点文件）
browsercli call collect_code --url "https://target.example/app.js" --smartMode priority

# 关键词定位签名/加密/鉴权代码
browsercli call search_in_scripts --pattern "sign"

# 按 scriptId 取完整源码
browsercli call get_script_source --scriptId "<scriptId>"

# 若已注入 Hook，取运行时样本作为数据流证据
browsercli call get_hook_data --hookId "<hookId>" --view detail
```

代码较长时先截断（单文件约 10k 字符、合并多文件约 300k 字符以内），避免分析上下文溢出。

## 分析模式

### 1. 代码理解（对应 understand_code）

输入：代码文本 + focus（`all` / `structure` / `business` / `security`）。
按 focus 只输出相关部分，结构如下：

```json
{
  "structure": {
    "functions": [],
    "classes": [],
    "modules": [],
    "callGraph": {"nodes": [], "edges": []}
  },
  "techStack": {
    "framework": null,
    "bundler": null,
    "cryptoLibrary": [],
    "other": []
  },
  "businessLogic": {
    "mainFeatures": [],
    "entities": [],
    "rules": [],
    "dataModel": {}
  },
  "dataFlow": {"sources": [], "sinks": [], "taintPaths": []},
  "securityRisks": [
    {
      "type": "xss|sql-injection|csrf|sensitive-data|other",
      "severity": "critical|high|medium|low",
      "location": {"file": "", "line": 0},
      "description": "",
      "recommendation": ""
    }
  ],
  "qualityScore": 0,
  "codePatterns": [],
  "antiPatterns": [],
  "complexityMetrics": {}
}
```

- `structure`：解析 AST 或按语法归纳函数/类/模块与调用关系。
- `techStack`：优先特征匹配（React/Vue/Angular、webpack、CryptoJS/JSEncrypt），不要只依赖模型判断。
- `dataFlow`：按 `<sources, sinks, sanitizers>` 三元组建污点路径，重点 source 为 user_input/storage/network，sink 为 eval/dom/network。
- `securityRisks`：先规则扫描（eval、innerHTML、document.write、拼接 SQL、明文密钥与 Token），再人工复核。
- `qualityScore`：0-100，综合结构完整度、安全风险数、复杂度、反模式数；高风险项显著扣分。

详见 `references/prompt-templates.md` 的「代码理解提示词」。

### 2. 代码摘要（对应 summarize_code）

mode 三选一：

- `single`：单文件 → `{url, type, size, summary, purpose, keyFunctions[], dependencies[], hasEncryption, encryptionMethods[], hasAPI, apiEndpoints[], hasObfuscation, obfuscationType, securityIssues[], suspiciousPatterns[], complexity: low|medium|high, linesOfCode, recommendations[]}`
- `batch`：文件数组 → 上述结构数组，可并发处理但保持顺序。
- `project`：项目级 → `{totalFiles, totalSize, mainPurpose, architecture, technologies[], securityConcerns[], recommendations[]}`

特征检测（加密/API/混淆）必须给出证据（命中的函数名或字符串），不要只给布尔值。

### 3. 加密识别（对应 detect_crypto）

输出 `{algorithms[], libraries[], confidence, securityIssues[], strength}`；算法项含 `name/type(symmetric|asymmetric|hash|encoding)/confidence/location/parameters{mode,padding,key,iv}/usage`。

- 先关键字与库特征（AES/RSA/SHA/MD5/SM2/SM3/SM4、CryptoJS/JSEncrypt/forge/SJCL），再识别模式（ECB/CBC/CTR）、padding 与 IV 来源。
- 弱算法（MD5/SHA1/RC4/DES）与硬编码密钥/IV 记为安全风险。
- 自定义/魔改加密结合 Hook 采样与本地复现验证，不要仅凭命名下结论。

### 4. 风险评分（对应 risk_panel）

按原权重对证据加权，归一到 0-100：

| 因子                            | 权重        |
| ------------------------------- | ----------- |
| 高危安全风险数（critical/high） | ×20         |
| 加密安全问题数                  | ×15         |
| 危险算法数（md5/sha1/rc4/des）  | ×10         |
| Hook 信号数                     | ×2，封顶 10 |

`score >= 70` → high，`>= 40` → medium，否则 low。输出含 `score/level/factors/recommendations`，无代码时可用 `collect_code` 的 top-priority 文件作为输入。

## 完成标准

- 每次结论都能指回具体文件/行号或 Hook 样本。
- 结构字段完整（无证据的字段留空数组/null，不要编造）。
- 涉及混淆代码先走 `ast-deobfuscation` 技能解混再分析。
