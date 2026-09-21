# 虚拟机保护混淆分析 (VM Protection Analysis)

## 混淆特征

虚拟机保护（VM Protection / Virtual Machine Protection）是将原有的 JavaScript 控制流与 AST 语法结构编译为自定义二进制字节码或数值指令序列，并在目标页面内附带一个微型解释器（Interpreter）在运行时动态解释执行的混淆技术。常见于企业级反爬方案（例如 JScrambler VM、TikTok 自研 VM、各类高端滑块）。

核心结构特征包括：

1. **指令流与数据数组 (Bytecode / Opcode Array)**：
   包含大量无明显语义的整型数组，例如 `var opcodes = [32, 1, 15, 0, 88, 201, ...];`。
2. **程序计数器 (PC)**：
   自增游标变量：`pc++`、`cursor += 1`、`opcodes[pc]`。
3. **操作数栈与寄存器环境 (Stack & Environment)**：
   显式的栈数组与压栈/弹栈操作：`stack.push(...)`、`stack.pop()`。
4. **分发循环与状态机 (Dispatch Loop)**：
   主调度大循环：`while(true) { switch(opcodes[pc++]) { case 0: ...; case 1: ... } }`。

## 分析与处理策略

1. **VM 特征自动检测与分类**：
   - 提取主分发循环结构；
   - 统计 Opcode 处理分支数量（`case <id>:` 密度）；
   - 区分栈式虚拟机（Stack-based VM）与寄存器虚拟机（Register-based VM）。
2. **组件提取与结构剖析 (Component Extraction)**：
   - 抽取字节码指令数组与静态常量池；
   - 识别操作数处理逻辑（加减乘除、逻辑运算、属性访问、函数调用）；
   - 输出结构化报告供逆向人员与 Agent 专项分析。

## 脚本入口

- `scripts/deobfuscate-vm-protection.js <input.js> [output-report.json]`
- 支持模块导出：

  ```javascript
  const {
    detectVMProtection,
    analyzeVMStructure,
    extractVMComponents,
  } = require('./deobfuscate-vm-protection');

  const info = detectVMProtection(code);
  if (info.detected) {
    const structure = analyzeVMStructure(code);
    console.log(structure);
  }
  ```
