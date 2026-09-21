# JSVMP (JavaScript Virtual Machine Protection) 反混淆与分析

## 概述与实战背景

JSVMP 是目前前端与逆向领域对抗强度最高的技术之一（常见于抖音 `bdms.js`、头条 `acrawler.js`、淘宝、拼多多等核心加密逻辑）。它将原始 JS 语法转换为自定义字节码，在页面运行时由内置的纯 JS 解释器还原执行。

## JSVMP 核心架构特征

1. **字节码与数据段 (Bytecode & Data)**：
   - 字节码通常存储于大字符串、十六进制数组或整型数组中，由类似 `parseInt("" + b[pc] + b[pc + 1], 16)` 解析指令。
2. **操作数栈与寄存器池**：
   - 栈式虚拟机（Stack-based VM）：`stack.push(...)`, `stack.pop()`，运算（如加法、比较）直接弹出栈顶两个元素运算后压回栈顶。
   - 寄存器虚拟机（Register-based VM）：使用数组或对象作为局部变量/寄存器表存储计算结果。
3. **解释调度大循环 (Interpreter Loop)**：
   - `for(;;)` 或 `while(true)` 内部包含超过数十至上百个 `case` 的巨型 `switch` 语句。
4. **原生反射调用接口**：
   - `func.apply(context, args)` 或 `Reflect.apply`，用于跳出虚拟机调用浏览器宿主环境 DOM/BOM API。

## 逆向与反混淆流程

1. **虚拟机特征探测 (Detection)**：
   - 检测 Switch Cases 密度（通常 > 20 个分支）。
   - 检测字节码数组、PC 自增模式与宿主环境反射调用。
   - 判断虚拟机类型（`stack-based`, `register-based`, `mixed`）。
2. **指令集提取与映射 (Opcode Extraction)**：
   - 提取所有分支的 opcode 与处理逻辑，分类为：算术运算、逻辑判断、栈操作、变量存取、函数调用、流程跳转。
3. **指令流跟踪与代码还原 (De-virtualization)**：
   - 提取可静态分析的常量运算与结构。
   - 导出结构化指令执行流与反编译中间表示（IR）。

## 脚本入口

- `scripts/deobfuscate-jsvmp.js <input.js> [output.json]`
- 支持模块导出：

  ```javascript
  const {
    detectJSVMP,
    extractInstructions,
    analyzeJSVMP,
  } = require('./deobfuscate-jsvmp');

  const report = analyzeJSVMP(code);
  console.log(
    `Detected JSVMP with ${report.features.instructionCount} opcodes`,
  );
  ```
