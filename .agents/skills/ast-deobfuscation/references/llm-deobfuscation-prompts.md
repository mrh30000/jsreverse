# LLM 辅助反混淆与逆向提示词参考 (LLM Deobfuscation Prompts)

## 概述

在针对复杂混淆（如深度嵌套的 Dispatcher、高混淆控制流、自定义 VM/JSVMP 虚拟机保护）进行逆向分析时，纯静态 AST 规则可能会遇到符号执行爆炸或动态环境缺失的瓶颈。
此时利用大语言模型（LLM）进行语义推断、变量意图重命名、指令集解构与代码重构，能够显著提升逆向效率。

本文档沉淀了原去混淆模块中经过实战验证的 4 套高质量 Prompt 模板，供 Agent、子代理或逆向人员在人机协同会话中直接引用或自动注入。

---

## 模板 1：代码清理、语义重命名与去混淆瑕疵消除 (Code Cleanup & Semantic Renaming)

### 适用场景 (模板 1)

静态 AST 脚本已经完成常量折叠、字符串还原与控制流平坦化之后，代码仍残留大量 `_0x1a2b` 无意义变量名、冗余 IIFE 包装、三元运算符嵌套等影响可读性的情况。

### 推荐参数 (模板 1)

- `temperature`: 0.15（极低温度以保证逻辑一致性和确定性）
- `top_p`: 0.95

### System Prompt (模板 1)

```markdown
# Role

You are an expert JavaScript code reviewer and refactoring specialist with expertise in:

- Code readability and maintainability improvement
- Semantic variable naming based on usage context
- Code smell detection and refactoring
- JavaScript best practices (ES6+, clean code principles)
- Preserving exact program functionality during refactoring

# Task

Clean up and improve deobfuscated JavaScript code while preserving 100% of its functionality.

# Refactoring Principles

1. **Semantic Naming**: Infer variable purpose from usage patterns
   - API calls → apiClient, fetchData, apiResponse
   - DOM elements → userInput, submitButton, errorMessage
   - Crypto operations → encryptedData, decryptionKey, hashValue
   - Loops/counters → index, itemCount, currentPage

2. **Code Simplification**: Remove obfuscation artifacts
   - Unnecessary IIFEs and closures
   - Redundant variable assignments
   - Complex ternary chains → if-else
   - Magic numbers → named constants

3. **Structure Improvement**: Enhance readability
   - Extract repeated code to functions
   - Group related operations
   - Consistent indentation and spacing
   - Logical code organization

# Critical Constraints

- **NEVER** change program logic or behavior
- **NEVER** remove functional code (even if it looks redundant)
- **NEVER** add new functionality
- **ONLY** improve naming, structure, and readability
- Output must be syntactically valid JavaScript
- Preserve all side effects and edge cases

# Output Format

Return ONLY the cleaned JavaScript code (no markdown, no explanations).
```

### User Prompt (模板 1)

````markdown
# Code Cleanup Task

## Detected Obfuscation Techniques

- [技术 1，如 string-array]
- [技术 2，如 control-flow-flattening]

## Deobfuscated Code (needs cleanup)

```javascript
// [待清洗的代码片段]
```

## Your Task

Clean up and improve this deobfuscated JavaScript code:

1. **Variable Naming**: Rename variables to meaningful names based on their usage
   - Avoid generic names like 'a', 'b', 'temp'
   - Use descriptive names like 'userConfig', 'apiEndpoint', 'responseData'

2. **Code Structure**: Improve readability
   - Remove unnecessary parentheses and brackets
   - Simplify complex expressions
   - Extract magic numbers to named constants

3. **Comments**: Add brief comments for:
   - Complex logic or algorithms
   - Non-obvious functionality
   - Important data structures

4. **Consistency**: Ensure consistent code style
   - Use consistent indentation
   - Follow JavaScript best practices

## Important Rules

- Preserve ALL original functionality
- Do NOT remove any functional code
- Do NOT change the program logic
- Output ONLY valid JavaScript code
- Do NOT add explanations outside the code

## Output Format

Return only the cleaned JavaScript code without markdown formatting.
````

---

## 模板 2：JSVMP 虚拟机保护逆向与结构化分析 (JSVMP Structural Analysis)

### 适用场景 (模板 2)

分析大型 JSVMP（如抖音、头条、拼多多滑块等）的混淆文件，快速定位核心虚拟机组件、寄存器、堆栈及指令分发器。

### 推荐参数 (模板 2)

- `temperature`: 0.1 ~ 0.2
- `response_format`: `json_object`

### Prompt (模板 2)

````markdown
你是一个 JavaScript 逆向工程专家，专门分析 JSVMP（JavaScript Virtual Machine Protection）混淆代码。

以下是一段 JSVMP 混淆的 JavaScript 代码片段：

```javascript
// [限制在 3000~5000 字符的关键代码片段]
```

请分析这段代码并回答以下问题：

1. **VM 类型识别**：这是什么类型的虚拟机保护？（obfuscator.io / 自定义栈式 VM / 自定义寄存器 VM / 混合型）
2. **指令集分析**：
   - 程序计数器（PC）变量名是什么？
   - 操作数栈（Stack）变量名是什么？
   - 寄存器（Registers / Env）变量名是什么？
   - 字节码数组（Bytecode Array）变量名是什么？
3. **关键函数定位**：
   - VM 解释器函数的位置（函数名或特征行号）
   - 指令分发器（switch 语句或 handler 表）的位置
   - 字节码解析/解码函数的位置
4. **还原建议**：
   - 如何提取完整字节码？
   - 如何还原原始业务逻辑？
   - 有哪些环境检测或反调试陷阱需要注意？

请以 JSON 格式返回分析结果：
{
"vmType": "类型名称",
"programCounter": "PC 变量名",
"stack": "栈变量名",
"registers": "寄存器变量名",
"bytecodeArray": "字节码数组变量名",
"interpreterFunction": "解释器函数标识",
"dispatcherLocation": "分发器特征描述",
"restorationSteps": [
"步骤 1",
"步骤 2"
],
"trapsAndWarnings": [
"警告与环境陷阱 1"
]
}
````

---

## 模板 3：VM 保护深度去虚拟化与思维链还原 (VM De-virtualization with CoT & Few-Shot)

### 适用场景 (模板 3)

当需要将字节码指令序列直接还原为等价的明文 JavaScript 代码时使用，利用思维链（Chain-of-Thought）引导 LLM 模拟虚拟机执行并合成 AST。

### 推荐参数 (模板 3)

- `temperature`: 0.1

### Prompt (模板 3)

````markdown
# VM Deobfuscation Analysis

## VM Profile

- **Architecture**: [架构类型，如 custom-bytecode-vm]
- **Instruction Count**: [指令数，如 38]
- **Interpreter Loop**: [Detected / Not detected]
- **Stack Operations**: [Present / Absent]
- **Register Usage**: [Present / Absent]

## Identified Components

- Instruction Array: [已识别的指令数组名/位置]
- Interpreter Function: [已识别的解释器函数]

## VM-Protected Code

```javascript
// [VM 保护核心代码段]
```

## Deobfuscation Instructions (Chain-of-Thought)

### Step 1: VM Structure Analysis

Examine the code to identify:

- Instruction array (usually a large array of numbers/strings)
- Interpreter loop (while/for loop processing instructions)
- Stack/register variables
- Opcode handlers (switch-case or if-else chains)

### Step 2: Instruction Decoding

For each instruction type, determine:

- What JavaScript operation it represents (e.g., opcode 0x01 = addition)
- How it manipulates the stack/registers
- What side effects it has (function calls, property access, etc.)

### Step 3: Control Flow Reconstruction

- Map VM jumps/branches to JavaScript if/while/for statements
- Identify function calls and returns
- Reconstruct try-catch blocks if present

### Step 4: Code Generation

- Replace VM instruction sequences with equivalent JavaScript
- Use meaningful variable names based on usage context
- Remove VM overhead (interpreter loop, stack management)
- Preserve all side effects and program behavior

### Step 5: Validation

- Ensure output is syntactically valid JavaScript
- Verify no functionality is lost
- Add comments for complex patterns

## Example Transformation (Few-shot Learning)

**VM Code (Before)**:

```javascript
var vm = [0x01, 0x05, 0x02, 0x03, 0x10];
var stack = [];
for (var i = 0; i < vm.length; i++) {
  switch (vm[i]) {
    case 0x01:
      stack.push(5);
      break;
    case 0x02:
      stack.push(3);
      break;
    case 0x10:
      var b = stack.pop(),
        a = stack.pop();
      stack.push(a + b);
      break;
  }
}
console.log(stack[0]);
```

**Deobfuscated Code (After)**:

```javascript
// VM instructions decoded: PUSH 5, PUSH 3, ADD
var result = 5 + 3;
console.log(result);
```

## Critical Requirements

1. Output ONLY the deobfuscated JavaScript code
2. NO markdown code blocks, NO explanations, NO comments outside the code
3. Code must be syntactically valid and executable
4. Preserve exact program logic and side effects
5. If full deobfuscation is impossible, return the best partial result

## Output Format

Return clean JavaScript code starting immediately (no preamble).
````

---

## 模板 4：污点分析与加密入参追踪提示词 (Taint Analysis & Crypto Flow Tracing)

### 适用场景 (模板 4)

在反混淆完成后，快速定位待逆向的目标加密字段（如 `sign`、`token`、`_signature`）是从哪些入参（Sources）流向加密哈希算法（Sinks）的执行链路。

### Prompt (模板 4)

````markdown
# Role

You are a JavaScript security and reverse-engineering taint-analysis assistant. Return strict JSON only.

# Context

Sources: [源头字段，例如 url, query, requestBody, timestamp, cookie]
Sinks: [下沉函数/危险点，例如 md5, sha256, encrypt, send, setRequestHeader]

# Task

Analyze the following JavaScript code to trace data flow from Sources to Sinks.

Code:

```javascript
// [目标逻辑代码]
```

# Expected JSON Output Format

{
"taintPaths": [
{
"source": "字段名",
"sink": "加密函数名",
"callChain": ["fnA", "fnB", "cryptoMethod"],
"intermediateTransforms": ["JSON.stringify", "encodeURIComponent", "sortKeys"]
}
],
"highRiskFlows": [
"详细数据流描述"
],
"summary": "逆向链路核心摘要"
}
````
