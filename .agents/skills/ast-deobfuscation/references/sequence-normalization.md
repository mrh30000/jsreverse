# 逗号表达式与结构标准化

这份文档用于处理 `SequenceExpression`、表达式语句、`if`/`for` 中的逗号表达式，以及部分可安全收敛的结构标准化。

## 总原则

- 不要把所有逗号表达式都统一拆成多条语句。
- 必须先看父节点，再决定改写方式。
- 必须保证执行顺序和副作用顺序不变。

## 按父节点判断

### `ExpressionStatement`

- 通常可以直接拆成多条表达式语句。
- 但如果末尾结果还被后续逻辑隐式依赖，先确认再拆。

### `IfStatement.test`

- `if (a(), b(), test)` 可以改写为：
  1. 先把 `a()`、`b()` 提到 `if` 之前。
  2. 保留 `if (test)`。

### `ForStatement.init`

- `for (a(), b(), c(); test; update)` 中的 `init` 逗号表达式最适合先拆，因为它只执行一次。

### `ForStatement.test`

- `for (init; a(), b(), test; update)` 可以改写为：
  1. 保留循环头里的稳定部分。
  2. 把 `a()`、`b()` 放到循环体开头。
  3. 在顶部加基于 `test` 的 `break` 守卫。

### `ForStatement.update`

- 只在循环体中不存在 `continue` 风险时再拆。
- 如果存在 `continue`，把更新表达式搬到循环体尾部可能会改变行为，应保守跳过。

### `ReturnStatement` 与 `VariableDeclarator`

- 这两类需要分别处理，不能简单套用表达式语句的拆法。
- 如果暂时没有足够稳定的模板，宁可不动。

## 可顺手清理的结构

- 零参数、立即执行、纯包裹的 IIFE。
- 表达式语句里的简单三元噪声。
- 可静态确认且不改变副作用顺序的简单逻辑表达式语句。

## 不要做的事

- 不要把复杂 `LogicalExpression` 默认改写成 `if`。
- 不要在不知道父节点语义的情况下使用批量 `replaceWithMultiple`。
- 不要只因为“文本更好看”就重排表达式执行顺序。

## 实战 AST 规范化模式库

以下为工业级反混淆中最常见的语法树展开模式（源自成熟工具实践）：

### 1. 三元赋值提升与转 if-else (TransCondition & ConditionToIf)
- **输入形式**：`a = m ? 11 : 22;`
- **第一阶段提升 (TransCondition)**：
  将 Assignment 内部的三元提到外层：`m ? (a = 11) : (a = 22);`
- **第二阶段转 if-else (ConditionToIf)**：
  ```javascript
  if (m) {
    a = 11;
  } else {
    a = 22;
  }
  ```
- **变量声明三元提升 (ConditionVarToIf)**：
  `var a = m ? 11 : 22;` 拆分为 `var a; if (m) { a = 11; } else { a = 22; }`

### 2. 连续逗号序列表达式拆解 (RemoveComma & RemoveVarComma)
- **输入形式**：`a = 1, b = 2, c = 3;` 或 `var a = 1, b = 2;`
- **改写策略**：
  在语句块（BlockStatement 或 Program）级别，将 `SequenceExpression` 中的各子表达式顺序转换为独立的 `ExpressionStatement`。
  将多变量 `VariableDeclaration` 拆解为多个单变量 `VariableDeclaration`，消除长链逗号污染。

### 3. 顶层短路与转条件语句 (And2If)
- **输入形式**：`isReady && doAction();`
- **改写策略**：
  若整个 `LogicalExpression` 为单独的 `ExpressionStatement` 且运算符为 `&&`：
  直接替换为 `if (isReady) { doAction(); }`，使执行逻辑和分支调用栈更加清晰。

### 4. 成员属性方括号访问规范化 (FormatMember)
- **输入形式**：`_0x1234['removeCookie']['toString']()`
- **改写策略**：
  当 `MemberExpression` 的 `property` 为 `StringLiteral`，且其内容符合合法 JavaScript 标识符正则（`/^[a-zA-Z_$][0-9a-zA-Z_$]*$/`）时：
  将 `property` 转为 `Identifier` 并将 `computed` 设为 `false`，还原为标准点语法 `_0x1234.removeCookie.toString()`。

---

## 验证建议

- 结构标准化后立即重新 parse。
- 对 `for.test` 和 `for.update` 的改写，优先用代表性样本回归一次。
- 如果改写后只提升了少量可读性，却增加了行为不确定性，就回退。
