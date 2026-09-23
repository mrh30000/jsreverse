# 极验

当样本属于极验（v3 的 `fullpage.*.js` / `slide.*.js` / `click.*.js`，或 v4 的 `gcaptcha4.js`）
时，使用这份规则。这类样本属于 **guarded-switch VM + 别名族混淆**的混合体。

> **命名说明（B21）**：本文件原名 `geetest4.md`，但内容**同时承载 v3 与 v4**
> （v3 的顺序恒真状态机也在本文件 §「v3 顺序恒真状态机」），文件名与内容不符已挂账两轮。
> 现统一改为**版本无关的家族名 `geetest`**，路由 id 同步为 `geetest`；
> v3 专用的可执行件仍叫 `scripts/patterns/geetest3-state-machine-pass.js`（那份确实是 v3 专属，名字正确）。
> `pipeline-config.js` 的 `hintTokens` **保留** `geetest4` 作为检索词——用户 hint 里写 geetest4 时要仍能命中本 pattern。

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
   本技能的 `scripts/patterns/geetest-guarded-pass.js` 实现了这一组：把
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

## v3 顺序恒真状态机（B20 新增，两篇独立来源互证）

极验 v3 的 `slide.7.9.3.js` / `fullpage.9.2.0-guwyxh.js` / `gct.js` 里，控制流平坦化是
**「恒为真 + 按状态值顺序执行」**，不是经典 OB 的 `while(!![])` 数组移位：

```js
function r(e, t) {
  var $_DCGHt = Vwtrj.$_DD()[0][19];        // ① 初值：对象方法 + 二维下标
  for (; $_DCGHt !== Vwtrj.$_DD()[3][16];) { // ② 终态：另一个下标
    switch ($_DCGHt) {
      case Vwtrj.$_DD()[12][19]:            // ③ 当前态
        var n = 1;
        $_DCGHt = Vwtrj.$_DD()[0][18];      // ④ 下一态（也可能直接 return，没有 ④）
        break;
      …
    }
  }
}
```

**判据（三条同时成立才认定）**：

1. 循环是 `for`，**没有 `update`**，`test` 形如 `S !== <下标表达式>`；
2. `body` 只有一个 `switch`，`discriminant` 就是 `S`，每个 `case` 的 test 都是**同一种下标表达式**；
3. 每个 `case` 的 consequent **以 `break` 结尾**，倒数第二条是 `S = <下标表达式>`（最后一态例外，可以是 `return`）。

**为什么不能只看源码顺序**：状态值由 `Vwtrj.$_DD()` 这类**表函数**给出，
「下一个执行哪个 `case`」只能**按值比较** —— 来源对此的表述是
「把所有的取值写到 map 中，然后循环判断」，**并没有给出表的实际内容**；
只要表里存在**同一个数值落在多个下标上**的情况，按下标文本比较就会判错。
本技能的回归夹具
`artifacts/skill-evolution/fixtures-20260923-1154/geetest3-real-sample.js`（照抄来源的函数形状自建）
就刻意让 `[0][19]` 与 `[12][19]` 取同值、`[12][17]` 与 `[0][17]` 取同值；
**该表的真实取值属于站点数据，本技能不声称它一定重复，只要求实现"按值比较"这个前提成立**。
更关键的是：作者完全可以把 `case` 打乱书写，此时"按源码顺序展开"会**静默错序**
（产物能跑、结果错）。这正是 `geetest-guarded-pass.js` 的 `ForStatement` 分支的隐含假设，别默认它成立。

> **两种声明位置都要认**（只看 `node.init` 会整段漏掉形态 ②）：
> ① 写在 for-init 里 `for (var S = T.$_DD()[0][0]; S !== …;)`；
> ② 写在前一条语句里 `var S = T.$_DD()[0][0];` + `for (; S !== …;)` —— **v3 实测更常见**。
> 形态 ② 展平后会留下一条只读一次的 `var S = …` 死声明：**只有在全程序里该名字只剩声明本身时才能删**，
> 否则 `return S` 之类会直接 `ReferenceError`。

**执行顺序**（顺序反了会把真实业务语句当垃圾删掉）：

```text
① 别名归一 + 编码归一（geetest-guarded-pass.js 的 VariableDeclaration 分支）
② 状态机展平：geetest3-state-machine-pass.js
   —— 先用 --table 给状态值表，或让脚本从顶层前缀 eval 出来
③ 再走通用平坦化器处理剩下的 loop/switch 热点
```

### 可执行件：`scripts/patterns/geetest3-state-machine-pass.js`

```bash
# 状态表能从脚本顶层前缀 eval 出来时（对象定义在前几条语句里）
node scripts/patterns/geetest3-state-machine-pass.js in.js out.js --markdown

# 真实站点：$_DD() 在混淆对象内部、脚本外求不了值 ⇒ 显式给表
#   键 = 状态引用的**压缩源码文本**（如 `Vwtrj.$_DD()[0][19]`），值 = 数值
node scripts/patterns/geetest3-state-machine-pass.js in.js out.js --table state.json --markdown

# 只做顺序断言（CI/回归）：源码顺序 ≠ 推导顺序时退出码 2
node scripts/patterns/geetest3-state-machine-pass.js in.js --check
```

- **退出码三态**：`0` 正常（含"没有可还原的循环"）｜`1` 参数/解析错误｜
  `2` `--check` 发现顺序不一致｜**`3` 状态表解析不全 —— 此时"不产出输出文件"**。
  设 `3` 的理由：若照样写盘，用户会拿到一个**一字未改的产物**却以为展平成功了（典型静默失败）。
- 默认**不删**链外（不可达）`case`，而是跳过该循环并报 `unreachable-cases`；
  确认确为死代码后加 `--drop-unreachable`。
- `--check` 的退出码 `2` 是「源码顺序与推导顺序不一致」——**这是断言，不是错误**。
- 形态 ②（声明在循环之前）展平后会留下只读一次的 `var S = …` 死声明：
  脚本**只在"全程序里该名字只剩声明本身"时才删**，否则保留
  （否则 `return S` 之类会直接 `ReferenceError`）。
- **状态变量逃逸出循环时（循环之后还读 `S`）必须保持语义**：展平会删掉循环内所有
  `S = <下标表达式>` 赋值，而 `var` 是函数级作用域 ⇒ 只看文本会"能跑但值错"。
  脚本对这类样本：**补上终态赋值** `S = <终态表达式>;`（正常退出时 `S` 恰等于终态值）；
  若循环是**靠 `return` 退出**、外部却还要读 `S`，则**直接跳过该循环并报 `state-var-escapes-loop`**
  （此时无法在不改写语义的前提下展平）。
  自检里有两条夹具用「改前/改后各跑一遍、比对返回值」验证语义等价，而不是只 diff 文本。
- `--selftest` 32 项，含一条**照抄真实样本**（表里同值多下标 + 末态 `return`）的回归夹具
  `artifacts/skill-evolution/fixtures-20260923-1154/geetest3-real-sample.js`（配套 `--table` JSON），
  另有 `artifacts/skill-evolution/tools/b20-verify-pass-edges.py` 的 **19 项边界阳性验证**
  （乱序 case、缺表项不写盘、不可达 case 的两条路径、普通循环不误伤、二次运行幂等、产物过 `node --check`）。

> 与 `geetest-guarded-pass.js` 的分工：那份 pass 的 `ForStatement` 分支是
> **「按源码顺序展平 + 要求 `init === null`」的快速路径**；本脚本只做**按键值链推导 + 顺序断言**，
> 两者结论不一致时**以本脚本为准**。同名函数体的 3-declarator 别名族两份 pass 都能处理，先跑哪份都行。

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
