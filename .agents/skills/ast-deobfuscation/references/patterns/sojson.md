# Sojson 混淆特征与 AST 定向反混淆

这份文档用于定位和还原国内 Web 逆向中常见的 Sojson（v4 / v5 / v6）系列混淆脚本，消除其内置的反调试与自毁逻辑。

## 一、家族特征

Sojson 具有鲜明的结构与防篡改痕迹：

1. **版本声明与版权桩**：
   - 文件头部或特定函数内常带有注释或声明字符串：`sojson.v4`、`sojson.v5`、`sojson.v6`、`jsjiami.com`。
2. **全局解密函数与大数组**：
   - 顶部定义一个乱码/十六进制字符串大数组（如 `var _0xabcd = ['...', '...'];`）。
   - 紧随一个自执行的数组移位函数（IIFE），通过比对哈希值或调用次数进行 `push`/`shift` 乱序洗牌。
   - 提供一个或多个全局解密函数（如 `_0x1234(index, key)`），内部包含 Base64 解码、RC4 对称解密或字符串查表偏移。
3. **环境检测与反篡改守卫**：
   - 包含格式化检测（`selfDefending`）：调用 `Function.prototype.toString` 探测函数是否被美化，若格式化则触发死循环或内存耗尽。
   - 定时注入 `debugger`：通过 `setInterval` 或递归调用注入 `debugger;` 阻碍 DevTools 调试。
   - 控制台 API 覆盖：将 `console.log`、`console.clear`、`console.warn` 重写为清空或抛错。

---

## 二、反混淆四步流水线

### 步骤 1：定位与抽取核心三件套

- **大数组节点**：通常为顶部作用域中唯一的长字符串数组声明。
- **乱序 IIFE 节点**：包裹着 `parseInt` 运算与 `while(!![])` 的自执行函数，用于洗牌大数组。
- **解密函数声明**：接受 1~2 个参数，函数体内含有数组引用或 Base64/RC4 运算。

在 Node.js 环境或沙箱（见 `references/sandbox-evaluator.md`）中单独提取并执行这三段代码，使得解密函数在内存中处于可调用状态。

### 步骤 2：AST 调用点遍历与字面量内联

遍历整棵 AST，找到所有对解密函数的 `CallExpression`：

```javascript
// 判定规则
if (path.node.callee.name === decFuncName) {
  // 获取实参（数字索引或伴随 key）
  const args = path.node.arguments.map(arg => arg.value);
  // 沙箱/内存中直接求值
  const decodedValue = decFunc(...args);
  // 用还原后的 StringLiteral 替换 CallExpression
  path.replaceWith(t.stringLiteral(decodedValue));
}
```

### 步骤 3：消除 Sojson 专属防御代码 (del_sojson_extra)

Sojson 注入的反调试与环境防护代码具备固定语法树特征，完成字符串还原后必须彻底剔除：

1. **剔除 setInterval 定时 debugger**：
   - 识别 `CallExpression` 为 `setInterval` 的语句。
   - 检查参数是否包含包含递归 `debugger` 或空死循环函数，直接调用 `path.remove()` 删除整条表达式语句。
2. **剔除自执行格式化/防篡改检测**：
   - 识别正则 `/\\w+ *\\(\\) *{\\w+ *['"].+['"]/` 或包含 `toString` 比对的匿名 IIFE。
   - 阻断由于美化排版触发的死循环代码块。
3. **剔除无用大数组与解密函数自身**：
   - 所有调用点全部被常量字符串替换后，大数组和解密函数的引用计数归零，安全将其节点从 AST 中移除。

### 步骤 4：死分支与不透明谓词清理

Sojson 常引入大量虚假二元比较（如 `"x" === "y"`）及无用三元分支，执行通用常量折叠与虚假分支清理（`prune-fake-branches`），最终输出干净可读的源码。

---

## 三、常见坑点与防御措施

1. **解密函数别名分身**：
   - Sojson 常在局部作用域中将全局解密函数多重赋值：`var _0x55aa = _0x1234;`。
   - **应对**：先遍历 VariableDeclarator 收集所有指向原始解密函数的别名，合并到解密函数集合中一并内联。
2. **内存中直接执行原文件风险**：
   - 绝不能 `eval` 完整的原始脚本，原脚本中含有格式化自毁逻辑。
   - **应对**：仅截取「大数组 + 洗牌函数 + 解密函数」这前 3 个安全语句在受限沙箱中运行。
