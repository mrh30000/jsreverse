# decodeObfuscator 兼容层

`scripts/decode-obfuscator-pass.js` 将 `open-source/decodeObfuscator-main` 中可复用、低风险的预处理能力接入分层流水线：

- 规范十六进制、Unicode 转义字面量；
- 折叠 Babel 能确认的有限基础常量表达式；
- 为单语句 `for` / `while` 补齐块；
- 合并对象声明后紧邻的静态属性赋值。

该 pass 默认用于 OB 变种流水线。原实现的 dispatcher 内联和 `while + switch` 拍平已由现有通用步骤覆盖，因此不重复移植。

## 安全边界

- 不执行输入源码，不使用 `eval` 解码字符串表。
- 不按 `constructor`、`RegExp`、`debugger` 等文本特征删除代码。
- 对象属性值引用对象自身、键重复或赋值不再紧邻声明时停止合并。
- 超过 512 KiB 的样本跳过本 pass 的常量折叠，避免单次 Babel 遍历发生深栈溢出；其余预处理仍执行。
- 动态字符串表仍按 `references/string-array-and-minimal-eval.md` 的隔离策略处理。
