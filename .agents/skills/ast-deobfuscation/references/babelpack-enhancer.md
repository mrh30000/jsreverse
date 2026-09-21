# BabelPack 深度增强反混淆 (BabelPack Enhancer)

## 概述与核心能力

BabelPack 是从 `decodeObfuscator` 深度迁移与工程化的高级 AST 变换流水线，专门针对 JavaScript-Obfuscator 生成的高强度防御代码。
它不仅包含语法树层面的规范化与重写，更具备沙箱动态求值（`callExpressToLiteral`）与反调试注入代码安全清除能力。

## 八大核心 AST Passes

1. **`keyToLiteral`（属性规范化）**：
   将 `obj.key` 转化为 `obj["key"]`，统一成员访问语法，便于后续属性模式匹配与查找。
2. **`varDeclarToFuncDeclar`（函数声明规范化）**：
   将 `var f = function() {}` 提升重构为标准的 `function f() {}`，利于词法作用域分析与函数重命名。
3. **`declaratorToDeclaration`（多变量声明拆分）**：
   将逗号连续声明 `var a = 1, b = 2;` 拆分为多条独立的 `var a = 1; var b = 2;` 语句。
4. **`deleteRepeatDefine`（冗余别名合并）**：
   识别并消除 `var _0xalias = _0xorig;` 等变量传递别名，直接将所有下游引用统一指向源变量，并删除中间别名。
5. **`preDecodeObject`（分散属性合并）**：
   识别将对象声明与属性赋值分开的混淆模式（`var obj = {}; obj["a"] = 1; obj["b"] = 2;`），将其自动合并回初始对象字面量声明中。
6. **`decodeObject`（对象映射内联）**：
   当对象属性全为字面量或简单运算符包装时，将对该对象的所有访问就地内联为目标值或操作符，并删除原对象。
7. **`deleteObfuscatorCode`（混淆器防御代码清洗）**：
   自动识别并剥离混淆器注入的反调试基础设施（RegExp 测试链、constructor 定时器、setInterval 循环探测、死代码注入块）。
8. **`callExpressToLiteral`（解码函数动态求值内联）**：
   自动识别大数组声明、IIFE 数组位移（shift/push）以及解码函数体，提取成可执行代码片段在 Node.js `vm` 沙箱中执行，将全代码中所有的 `_0xdecoder(...)` 调用表达式批量替换为最终求值后的字符串字面量，并在完成后删除已失效的混淆函数。

## 脚本入口

- `scripts/babelpack-enhancer-pass.js <input.js> <output.js>`
- 支持模块导出：

  ```javascript
  const {
    runBabelPackPasses,
    callExpressToLiteral,
    decodeObject,
  } = require('./babelpack-enhancer-pass');
  ```
