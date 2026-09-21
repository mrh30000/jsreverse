# 安全沙箱求值器 (Sandbox Evaluator)

## 作用与边界

混淆代码（如 JavaScript-Obfuscator / decodeObfuscator）通常会在文件头部定义大数组、自执行洗牌（push/shift）函数以及解码解密包装函数。
若要正确还原后续所有的 `_0x1234("0x5a")` 字符串或常量查表，必须安全地执行前置 Prelude 语句，并建立受控的 Node.js `vm` 沙箱上下文。

## 沙箱设计准则

1. **最小必要全局环境模拟**：
   - 注入标准 JS 内建对象：`Array`, `Boolean`, `Date`, `Error`, `JSON`, `Map`, `Math`, `Number`, `Object`, `RegExp`, `Set`, `String`, `Symbol`, `parseInt`, `parseFloat`, `encodeURIComponent`, `decodeURIComponent`, `atob`, `btoa`, `Buffer` 等。
   - 环形自引用：`sandbox.window = sandbox.self = sandbox.global = sandbox.globalThis = sandbox`，防止混淆函数因访问 `window` 报错退出。
2. **严防执行逃逸与死循环**：
   - 设定严格的单次调用与前置语句超时（默认 1000ms）。
   - 仅对满足白名单特性的前置语句（`FunctionDeclaration`、纯变量声明、或自执行旋转 `ExpressionStatement`）进行预执行，遇到 DOM 操作或网络 I/O 立即中断。
3. **别名传播与跨作用域绑定**：
   - 混淆代码常出现 `var _0xalias = _0xdecoder;` 别名定义，沙箱需追踪并自动建立别名映射，确保所有别名调用均能命中沙箱函数。

## 模块与使用方式

- `scripts/sandbox-evaluator.js`
- 模块导出：

  ```javascript
  const {
    createSandbox,
    evaluatePrelude,
    evaluateExpression,
  } = require('./sandbox-evaluator');

  const {sandbox, executedCount} = evaluatePrelude(ast, {timeoutMs: 1000});
  const res = evaluateExpression('_0x5a12("0x12")', sandbox);
  ```
