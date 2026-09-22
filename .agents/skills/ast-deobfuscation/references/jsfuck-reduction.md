# JSFuck 混淆纯算与 AST 递归折叠

这份文档针对纯粹由 6 个字符 `[]()!+` 构成的 JSFuck 或局部包含深层符号算式的混淆代码，提供受控的安全 AST 递归求值与字面量折叠方案。

## 一、混淆特征与原理

JSFuck 依靠 JavaScript 的弱类型转换特性，利用 6 个基本符号构造所有原始值与函数调用：
- `![] === false`
- `+[] === 0`
- `+!+[] === 1`
- `[!+[]+!+[]] === [2]`
- `[][[]] === undefined`
- `(![]+[])[0] === "f"`

其语法树表现为层层嵌套的 `UnaryExpression`（一元运算 `!`、`+`）、`BinaryExpression`（二元加法 `+`）、`MemberExpression`（属性访问）和 `ArrayExpression`（空数组与单元素数组）。

---

## 二、AST 递归识别与安全折叠

### 1. 纯符号无害子树判定

一个 AST 子树能够被就地执行并安全求值的前提是：**它不依赖任何外部作用域变量与浏览器 API**。

满足以下条件的节点属于安全纯算子树：
- 节点自身及其全部子节点仅由下列 AST 类型组成：
  - `ArrayExpression`（如 `[]`）
  - `UnaryExpression`（操作符仅为 `!` 或 `+`）
  - `BinaryExpression`（操作符仅为 `+`）
  - `MemberExpression`（计算属性访问，且非全局对象盗取）
  - `NumericLiteral` / `StringLiteral` / `BooleanLiteral`

### 2. 受控求值与就地替换

在 Babel AST 访问器中遍历目标节点，进行自底向上的安全计算：

```javascript
function reduceJsFuckNode(path) {
  // 如果当前节点已经是字面量，无需再折叠
  if (path.isLiteral()) return;

  // 严格检查子树是否无副作用且完全由基础符号构成
  if (isPureJsFuckSubtree(path)) {
    try {
      // 提取代码片段并在受控上下文中运行
      const exprCode = path.toString();
      // 在干净隔离环境或沙箱中计算
      const evaluated = Function(`"use strict"; return (${exprCode});`)();

      // 将结果转换为对应的 AST 字面量
      if (typeof evaluated === 'string') {
        path.replaceWith(t.stringLiteral(evaluated));
        path.skip();
      } else if (typeof evaluated === 'number' && Number.isFinite(evaluated)) {
        path.replaceWith(t.numericLiteral(evaluated));
        path.skip();
      } else if (typeof evaluated === 'boolean') {
        path.replaceWith(t.booleanLiteral(evaluated));
        path.skip();
      }
    } catch (_) {
      // 求值失败则保持原样，绝不中断解析流程
    }
  }
}
```

### 3. 处理全局函数构造（`Function("...")()` 逃逸）

JSFuck 进阶形式中常通过 `[]["flat"]["constructor"]("return eval")()` 构造动态代码执行器。

- **识别标志**：针对 `CallExpression`，其 `callee` 最终解析为 `Function` 构造器。
- **还原策略**：
  1. 先把传给 `Function(...)` 的参数纯算折叠为明文字符串代码。
  2. 提取出该代码字符串后，对其重新作为独立 JS 脚本进行 AST 解析与第二轮反混淆。
  3. 绝不盲目放行全局执行。

---

## 三、与通用反混淆流水线配合

1. **执行顺序建议**：
   - JSFuck 折叠应当安排在流水线**最前置阶段**。
   - 必须在常量折叠、控制流平坦化和解密函数提取之前完成，否则庞大的符号树会导致通用 AST 分析器节点爆炸并严重拖慢速度。
2. **验证守卫**：
   - 折叠前后字符串内容应保持语义严格等价。
   - 替换后的 AST 进行语法合法性重新校验（`babel.parse`）。
