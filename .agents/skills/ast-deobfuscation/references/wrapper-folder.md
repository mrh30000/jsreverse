# 复杂函数包装器与 Dispatcher 折叠 (Wrapper Folder)

## 混淆特征

混淆器（如 JavaScript-Obfuscator）为了隐藏真实的运算符调用和常量访问，会在局部作用域生成包含大量小代理函数和字面量映射的大对象（Dispatcher Object）：

```javascript
var _0xobj = {
  "ab": function(a, b) { return a + b; },
  "cd": function(a, b) { return a === b; },
  "ef": function(a, b) { return a(b); },
  "gh": "secret_key",
  "ij": function(a) { return !a; }
};

// 调用处表现为：
var res = _0xobj["ab"](x, _0xobj["gh"]);
if (_0xobj["cd"](res, target)) { ... }
```

此外，部分复杂混淆还会出现**多层代理转发**（`_0xobj2["xy"] = _0xobj1["ab"]`）以及动态计算属性名。

## 处理策略

1. **收集包装器描述符 (Wrapper Descriptors)**：
   - 字面量描述符 (`literal`)：纯数值、字符串、布尔值。
   - 二元运算描述符 (`binary`)：`function(a, b) { return a + b; }`。
   - 逻辑运算描述符 (`logical`)：`function(a, b) { return a && b; }`。
   - 一元运算描述符 (`unary`)：`function(a) { return !a; }`。
   - 函数调用描述符 (`call`)：`function(fn, ...args) { return fn(...args); }`。
   - 嵌套成员别名 (`member`)：递归解析多层对象引用链。
2. **就地替换与折叠**：
   - 匹配 `_0xobj["ab"](x, y)` 形式的 `CallExpression`，根据描述符直接就地改写为 `BinaryExpression(x + y)`、`LogicalExpression` 或直接调用 `fn(args)`。
   - 匹配 `_0xobj["gh"]` 形式的 `MemberExpression`，直接内联其字面量。
3. **安全死代码清理**：
   - 当该代理对象的所有属性都被完全折叠且无其他外部引用逃逸时，安全删除原始对象声明节点。

## 脚本入口

- `scripts/fold-wrappers.js <input.js> <output.js>`
- 支持模块导出：

  ```javascript
  const {foldWrappers} = require('./fold-wrappers');
  ```
