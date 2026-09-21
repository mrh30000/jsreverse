# 极验

当样本属于极验（v3 的 `fullpage.*.js` / `slide.*.js` / `click.*.js`，或 v4 的 `gcaptcha4.js`）
时，使用这份规则。这类样本属于 **guarded-switch VM + 别名族混淆**的混合体。

## 识别信号

- 变量名是 `$_CEGDT` / `$_CJDe` / `$_FFW` 这类 **`$_` 前缀 + 5~6 位随机大小写字母**族；
  注意：**v3 与 v4 都可能出现**，不能只靠变量名判代际；
- 别名族的真实形态是**一条 `var` 带 3 个 declarator + 紧跟一条 `X.shift()`**：

  ```js
  var A = <解码函数>, B = ["$_x"].concat(A), C = B[1];
  B.shift();
  ```

  （实测 `gcaptcha4.js` 里有 **1647 组**。文章里常见的是它被展开成 4 行的可读版，两者等价。）
  识别判据：3 个 declarator、第 1 个 init 等于前几条语句里定义过的那个解码函数引用、
  `init1` 形如 `["..."] .concat(init0)`、`init2` 形如 `init1Name[1]`；
- `while/for + switch` 的**状态来自对象调用**：`$_Dm()[0][10]`、`$_Dm()[4][9]` 这种
  「取数组下标当 opcode」，而不是裸数字；
- `loop/switch` 平坦化外层还包着 guarded `if` 结构；
- 字符串表访问形如 `t[$_CEGDT(326)]`（**别名函数 + 数字常量**），不是 `arr[123]`。

## 处理顺序（顺序反了会静默清空函数体）

1. **先做别名归一**，再做字符串表还原，最后才碰控制流。
   本技能的 `scripts/patterns/geetest4-guarded-pass.js` 实现了这一组：把
   `别名(数字常量)` 就地求值成字面量，然后删掉那条声明 + 紧跟的 `shift()`。

   > ⚠️ **该 pass 在 2026-09-20 修过一个静默语义缺陷**：旧版会无条件删除声明之后的
   > **两条**兄弟语句，而真实形态只有一条 `shift()` —— 于是把紧随其后的**真实业务语句**
   > 一起删了。在 `geetest/gcaptcha4.js` 上实测少掉约 9000 个 AST 节点，且产物**仍能解析、
   > 不报错**（典型静默失败，只能靠跑起来才发现）。现在改为**严格匹配 `X.shift()` 且
   > X 属于本组声明的名字**才删。
   > 回归夹具：`artifacts/skill-evolution/fixtures-20260920-1939/alias-and-next-statement.js`
   > —— 用 node 实跑改前/改后对照，旧版抛 `ReferenceError: keep is not defined`，
   > 新版与基线输出一致（`S242`）。
2. 别名归一之后，`t[$_CEGDT(326)]` 会退化成 `t["某个字符串"]`，字符串表才可能被静态还原。
3. 再做 guarded-switch 适配（同一份 pass 里的 `ForStatement` 分支），最后才允许走通用平坦化器。

> **教训（可迁移到所有 AST 改写 pass）**：凡是要删"相邻语句"的 pass，
> 都必须**按节点类型 + 标识符归属精确匹配**，不能按"第几条兄弟"计数。
> 验证方式不是 diff 文本，而是**用 node 实跑改前/改后并比对 stdout**；
> 静默删代码的 pass 不会报错，只会让产物"看起来更干净"。

## 可选的「外部工具链」前置（能省大量手工，但有代价）

极验的混淆可以直接过两站工具，再回浏览器调试：

```text
① deobfuscate.io            初步解混淆（字符串/编码层）
② UglifyJS Online           勾 beautify: true + toplevel: true，把离谱变量名换掉
③ DevTools Override content 用本地文件替换 gcaptcha4.js，在本地版上打断点
```

**代价与处置**：

- 第 ② 步会**重命名变量**，之后所有基于「变量名 / 行号」的定位都会失效。
  规避办法：解混淆前在文件顶部挂一个**哨兵变量**（例如 `var bobo = <目标对象>;`），
  解混淆后**手动把它改回原名**，否则引用会解析不到、脚本直接报错。
- 判断「解混淆产物是否可用」：如果**断点打不上**、或**验证码图片不出来**，
  说明产物缺了某段（通常是反调试/初始化段）。
  处置：**另开一个未解混淆的页面**，在同样位置下断点，对比缺了什么再补回本地版。
- 走这条路后就不必再逆 `SEQUENCE` / 轨迹编码这类算法细节，
  但**服务端字段与版本相关项仍要按 `web-verify-patcher` 的协议文档核对**。

## 当前残留重点

- 仍然残留的直接 `loop/switch` 热点；
- 仍然比参考产物更嘈杂的 guarded opcode dispatcher 结构；
- 别名归一没跑干净的样本里，`$_xxx` 族仍会在字符串表里留下二次包装。

> 协议侧（链路、字段、`w`/`td` 结构、版本陷阱）见
> `../../../web-verify-patcher/references/geetest-protocol-matrix.md`；
> 算法侧（AES/RSA 分段、变体编码）见
> `../../../web-reverse-algorithm/references/08-mixed-crypto-segmentation.md`。
> 本文件只管「怎么把 JS 变得能读」。
> （引用约定：不带 `../` 前缀的 references 相对路径按 **skill 根**解析；
> `../` 开头的相对引用才相对**引用它的文件**解析 —— 本文件在 `references/patterns/` 下，
> 跨技能要写三级 `../`。）
