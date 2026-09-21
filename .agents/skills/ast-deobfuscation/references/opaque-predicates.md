# 不透明谓词与代数逻辑混淆消除

## 混淆特征

不透明谓词（Opaque Predicates）是指计算结果在静态编译期即可确定（恒为真或恒为假），但在运行时表现为动态表达式的条件分支，混淆器借此构造大量的虚假死代码分支、不可达代码以及混淆控制流路径：

1. **数值字面量比较**：
   - `if (5 > 3) { ... }` 恒真分支
   - `if (1 === 2) { ... }` 恒假分支
2. **代数恒等式 (Algebraic Invariants)**：
   - `if (x * 0 === 0) { ... }` 对于任意有限数字 $x$，乘 0 恒等于 0
   - `if ((x ^ x) === 0) { ... }` 自异或经 ToInt32 转换恒为 0
   - `if (typeof "str" === "string") { ... }` 静态类型运算
   - 注：`x - x === 0` 在 `NaN`/`Infinity` 输入下不成立，故本脚本保守地不折叠该形态。
3. **三元与逻辑表达式包装**：
   - `(x * 0 === 0) ? realCall() : fakeTrap()`

## 处理策略

1. **AST 模式匹配与代数简化**：
   - 识别数值比较（`>`, `<`, `>=`, `<=`, `===`, `!==`）并计算真假。
   - 识别带有 0 乘子（`x * 0`、`0 * x`）并与 0 判等的恒真表达式。
   - 识别自异或（`x ^ x`）。
2. **死代码剪枝与分支提升**：
   - 条件恒真时：
     - 如果 `consequent` 为代码块（`BlockStatement`），提升其中的所有语句替换原 `IfStatement`；
     - 否则用 `consequent` 单语句替换。
   - 条件恒假时：
     - 若存在 `alternate`（else 分支），提升 `alternate` 替换原 `IfStatement`；
     - 若无 `alternate`，直接从 AST 中完全删除该 `IfStatement` 节点。
   - 对三元表达式（`ConditionalExpression`），直接用对应分支节点替换。

## 脚本入口

- `scripts/prune-opaque-predicates.js <input.js> <output.js>`
- 支持模块导出：

  ```javascript
  const {
    pruneOpaquePredicates,
    detectOpaquePredicates,
  } = require('./prune-opaque-predicates');
  ```
