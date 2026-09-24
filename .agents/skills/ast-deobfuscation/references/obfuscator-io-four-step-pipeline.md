# obfuscator.io 四步教学链：顺序依赖、判据与手写实现的静默崩溃点

> **来源**：`docs/references/52pojie-1332822`（环境与工具链）· `52pojie-1335042`（Step1 函数调用还原）·
> `52pojie-1337494`（Step2 对象调用还原）· `52pojie-1340194`（Step3 分支流程判断）·
> `52pojie-1341603`（Step4 平坦化控制流）—— 同一作者（漁滒）的完整系列；
> `52pojie-1473162`（另一位作者）**独立**走了同一条链的前三步。
>
> **定位**：本库的 `scripts/run-pipeline.js` / `scripts/decode-obfuscator-pass.js` 已经把这条链自动化，
> 所以本文**不是**「再写一遍流水线」。本文只回答三件自动化脚本不能替你回答的事：
> ① **顺序依赖**（哪一步漏做会出现什么症状）；② **手写实现时（Python / estraverse）的判据与静默崩溃点**；
> ③ **用同一份配置自己生成混淆样本 = 免费真值 oracle**（下一节）。
> 家族分类见 `obfuscation-detector.md`，字典变体与多重赋值见 `ob-variant-taxonomy.md`。

---

## §0 「配置即 oracle」：先造一份原码已知的样本

系列作者的做法值一整节：他**不做线上站，先用 <https://obfuscator.io> 的固定配置把一份十几行的源代码混淆**，
再去还原，最后用**原码**（已知真值）逐行 diff。1473162 也是同一招（`function MyFun(a,b){...}` 混淆后还原回
同样三行）。

**为什么这是本库最划算的一步**：

| 维度 | 线上站样本 | 自己生成的样本 |
| --- | --- | --- |
| 真值 | 只能靠逐段对拍猜 | **原码在手**，端到端 diff 一次定性 |
| 迭代成本 | 每次改动都要重新抓包 / 补环境 | 修改 `--config` 重生成，秒级 |
| 失败归因 | 分不清「我的 pass 错」还是「站点变体」 | **一定是 pass 错** |

**用法（三步）**：

1. 写一份覆盖目标特征的**最小源代码**：字符串字面量、对象方法调用、恒真/恒假 `if`、有顺序依赖的语句块；
2. 过一遍 obfuscator.io（或本地 `javascript-obfuscator` 包）的**目标开关组合**（`stringArray` /
   `stringArrayRotate` / `stringArrayShuffle` / `stringArrayThreshold` / `objectKeys` / `controlFlowFlattening` /
   `deadCodeInjection` / `identifierNamesGenerator: hexadecimal`）；
3. 流水线跑完，**对原码逐行 diff** ⇒ 残留的 `_0x` / `split('|')` / 未折叠的字典调用就是没覆盖到的 pass。

> ⚠️ 这套 oracle 只能证明「**这一类 shell 我处理干净了**」，不能证明「线上站也被我处理干净了」。
> 线上线下用的是同一套 shell 时它才有迁移性 —— 判据是 §1 的结构特征（`_0x` 名 + 顶层三节点 +
> 大数组 IIFE），不是站点名。

---

## §1 四步链与硬顺序

| 步 | 目标 | 判据（AST 形状） | 前置 | **漏做的症状** |
| --- | --- | --- | --- | --- |
| S1 | 字符串调用还原 | `CallExpression` + `callee` 是**那个随机名**的解密函数 | 先从顶层节点拿到函数名（**不能写死**） | 满屏 `_0x166e('0x305')`；S2 的实参不是字面量 |
| S2 | 字典对象调用还原 | `CallExpression` + `callee` 是 `MemberExpression`，其 `object` 名 ∈ 已收集的字典集合 | S1 完成 | `if (_0x1468d1['KYTBP']('OWFLT', _0x1468d1['imVvW']))` 判不出真假 |
| S3 | 假分支剪除 | `IfStatement` + `test` 是**两侧均为字面量**的 `BinaryExpression` | S2 完成 | 真假两臂都在，`consequent` 里的死代码干扰 S4 的顺序串定位 |
| S4 | 平坦化控制流还原 | `BlockStatement` 首节点为 `VariableDeclaration`（**2 个 declarator**，第 1 个 init 是 `CallExpression`）且次节点为 `WhileStatement` | S1–S3 完成 | 每条语句都对、**执行顺序不可见** |

三条顺序依赖各自的理由（都是本库踩过的同型坑）：

1. **S1 → S2**：字典 value 的实参常常是字符串解密调用。不先还原，你拿到的是 `_0x0a9e(0x2c)` 而不是字面量，
   无法代入「实参替换形参」的运算（`ob-variant-taxonomy.md` §四第 2 条）。
2. **S2 → S3**：`test` 的左右两侧在 S2 之前**不是字面量**，判真假的代码看到的 `left.value === undefined`。
3. **S3 → S4**：`while+switch` 的还原靠扫 `'|'` 定位顺序串 —— 字符串没还原时会把**字面量 `'|'`** 当顺序串，
   把整个循环体替换成空，**函数体被静默清空且产物仍能正常 parse**（守卫条件见 `mba-and-dispatcher-reduction.md` §3）。

> **最低验收线**：每一步漏做都**不抛异常**、产物都能 parse。所以「跑通了」不是验收，
> **对拍（§0 原码 diff / §7 残留指标）才是**。

---

## §2 S1 · 函数名不能写死：obfuscator.io 的固定顶层结构

obfuscator.io 默认输出的**前三条语句形状是固定的**（顺序不固定，所以必须**两条都看**）：

```
[0] var _0x101c = [ '...', '...', ... ];                     // 大数组
[1] (function(_0xa, _0xb){ ... while(--_0xb){ _0xa.push(_0xa.shift()); } }(_0x101c, 0x1a9));  // 洗牌 IIFE
[2] var _0x166e = function(_0xa, _0xb){ ... };               // 字符串取值函数（← 要找的就是它）
```

- **第二条与第三条顺序可能互换** ⇒ 判据写成「在 `body[1]` 与 `body[2]` 之间找 `FunctionDeclaration` /
  `VariableDeclarator`+`FunctionExpression` 的那一个」，**不要写 `body[2]`**。
- 函数名是随机 hex（`_0x` + 6 位）⇒ **绝不要把名字写进 pass**。

**求值的两种实现**（都在源文里出现过，按环境选）：

| 路线 | 做法 | 适用 |
| --- | --- | --- |
| A · 隔离求值 | 只把**前 3 条语句**重新 generate 成 `ob_step1.js`，自己加一行 `console.log(_0x166e('0x305'))` 确认能出值，再由 Python 侧 `execjs` 的 `ctx.call(fnName, arg0, arg1)` 求值 | 小样本、本地 Python 主控（源文做法） |
| B · 抽出解密器 | 把解密函数**单独存成 `de.js`** 并 `module.exports = { _0x7969 }`，AST 脚本里 `require('./de')` 直接调用（§5） | 解密器自包含、要反复调用 |

- **参数个数必须容错**：源文的调用点有形如 `fn(arg)` 与 `fn(arg1, arg2)` 两种，取值写成
  「`len(arguments) == 2` 才取第二个，否则第二个补 `''`」——不要假设固定 2 参。
- 取值函数返回的是**字符串**（S1 阶段可以断言这一点）⇒ 替换节点构造 `{type:'Literal', value}` 即可。
- **收尾必须删掉前 3 条语句**（数组 / 洗牌 IIFE / 取值函数），否则 S4 的 `BlockStatement` 扫描会把它们当噪声。

---

## §3 S2 · 字典对象的判据与「5 类返回值」替换表

### §3.1 怎么在 AST 里认出字典对象

源文给的判据**两条同时成立**：

1. 节点是 **`VariableDeclaration`**（不是函数、不是普通赋值）；
2. 其 `init` 是 `ObjectExpression`，且**所有键都是字符串字面量**（`Literal`），并且**键长恒为 5 位**。

```text
var _0x118a14 = { 'jyyYA': function (a, b) { return a !== b; }, 'imVvW': 'OWFLT', … };
```

> 「键长恒为 5」是 obfuscator.io 该配置的产物特征，**不是一个通用不变量** ——
> 换配置（`identifiersPrefix` / 长度设置）就不成立。稳的判据是「**全字符串键 + 同文件内所有该形态对象键长一致**」，
> 长度值现场统计得出。同理 `ob-variant-taxonomy.md` §四 的字典也可能用非 5 位键。

调用点判据：`CallExpression` + `callee.type === 'MemberExpression'` + `callee.object.name` **∈ 前面收集到的集合**。
（漏了最后一条会把 `JSON.stringify(...)`、`console.log(...)` 这类**也当字典调用**处理。）

### §3.2 5 类返回值 → 5 种替换（这条表是本文最可复用的部分）

字典 value 是函数，函数体只有一条 `return`，返回的东西分成 5 类。**按返回类型分别处置**，
不要写成一坨 `if`——错一类会静默产出「看起来对但语义变了」的代码：

| # | 返回类型 | 形态 | 替换规则 | 易错点 |
| --- | --- | --- | --- | --- |
| 1 | `Literal` | `'jyyYA': function(){ return 'OWFLT'; }` | 整个调用节点 → 该字面量 | 无 |
| 2 | `MemberExpression` | `return obj.prop` | 整个调用节点 → 该成员表达式 | 无 |
| 3 | `BinaryExpression` | `return a !== b` | 调用第 1 实参放**左**、第 2 实参放**右**，拼成新二元表达式替换整节点 | 左右顺序写反（`a-b` vs `b-a`）不报错、只错值 |
| 4 | `LogicalExpression` | `return a && b` | 同 3 | 同上；且**短路语义**在实参有副作用时与二元不同，只做实参替换、不做常量折叠 |
| 5 | `CallExpression` | `return a(b)` / `return f(p0, p1)` | **先比形参个数**：调用实参数 == 返回函数形参数 ⇒ 按序替换实参、**函数名不变**；不等 ⇒ **第 1 个实参充当返回函数的函数名**，其余按序替换 | 不比对参数个数就直接套用，会把 `f(a,b)` 错写成 `a(b)` |

> 关于第 5 类的「第 1 个实参充当函数名」：源文的原文口径是「将调用函数的第一个参数变成返回函数的函数名，
> 剩下的参数按顺序替换，如果调用函数和返回函数的参数数量是一样的，那么只需要按顺序替换参数即可，函数名不用变」。
> 本库的 `scripts/fold-wrappers.js` 与 `patterns/xiaohongshu.md` 走的是更严的口径
> （按 `returnArgument.callee` 是否等于形参决定内联 callee 还是取 `args[0]`）——**以那边为准**；
> 这里记录源文口径只用于读旧文章时对齐。

### §3.3 收尾

替换完毕后，那些对象定义就全部成了**废代码** ⇒ 用**同一套判据**再遍历一次「找到就删」。
（同一次遍历里既做替换又做删除容易漏：替换会产生新的节点、删除会让遍历失效 ⇒ **两趟**。）

---

## §4 S3 / S4 · 最短的两步，但各有静默坑

### §4.1 S3 剪假分支

- 判据：`IfStatement`，`test` 是 `BinaryExpression`，**两侧都是字面量**（`'OWFLT' !== 'OWFLT'`、`'a' === 'b'`）。
- 处置：用 Python 按 `test.operator` + 两侧值算出真假，取 `consequent` 或 `alternate` 的语句**替换掉整个 IfStatement**。

**手写实现的三个静默崩溃点**（源文版实现里三处都缺，1473162 的片段同样缺；本库的
`scripts/prune-fake-branches.js` 用 Babel 已规避，但你在 Python / estraverse 里手写时会原样撞上）：

| # | 缺陷 | 症状 | 正确判据 |
| --- | --- | --- | --- |
| 1 | 直接读 `node.alternate.body` | 源码里 `if (x === y) {...}` **没有 `else`** 时 `alternate === null` ⇒ `TypeError: Cannot read property 'body' of null` | 先判 `alternate` 是否存在；不存在时**丢弃整个节点** |
| 2 | 直接 `parent.body.splice(...)` | `if` 出现在 `consequent` / `alternate` / 循环体 / `try` 块里时父节点**没有 `body`** ⇒ 崩 | 只对 `Program` / `BlockStatement` 父节点做 splice，其余**就地替换节点** |
| 3 | 用 `left.value == right.value` 比较 | `'0' == 0`、`'' == false` 会判成「恒真」 ⇒ **删掉活代码** | 字面量比较必须用 `===`（`prune-fake-branches.js` 的 `evaluateBinary` 是按 operator 分派的，可照抄） |

- **额外一条**：`test` 为**恒真**时替换成 `consequent`，为**恒假**时替换成 `alternate` —— **不要反过来**。
  该形态下 `'a' !== 'a'` 是**恒假**，取的是 `alternate`（源文 Step3 的截图口径一致）。
- 源文自述这一步是「所有步骤里最简单的一步」；难的不是逻辑，是上面这三处**边界**。

### §4.2 S4 平坦化还原

形态（obfuscator.io 的 `controlFlowFlattening`）：

```text
var _0x51adbe = '3|4|0|5|1|2'['split']('|'), _0x50da1a = 0;
while (!![]) {
  switch (_0x51adbe[_0x50da1a++]) {
    case '0': var _0x89f607 = _0x5c99f5[_0x55b3ce] || _0x527778; continue;
    case '1': _0x527778['toString'] = _0x89f607['toString']['bind'](_0x89f607); continue;
    ...
  }
  break;
}
```

- **判据的完整写法**（三个条件缺一不可）：遍历 `BlockStatement`，`body[0]` 是 `VariableDeclaration`
  且**恰好 2 个 declarator**、**第 1 个 declarator 的 init 是 `CallExpression`**（`'3|4|0|5|1|2'.split('|')`），
  `body[1]` 是 `WhileStatement`。
  > 「一次定义两个变量」是关键 —— 只判 `body[0]` 是 `var` 会命中遍地都是的普通声明。
- **顺序**：`'3|4|0|5|1|2'.split('|')` 得到的就是**执行顺序**；`cases` 数组里则是**书写顺序**。
  按 split 的顺序去 `cases` 里取代码、拼成一个新 block，替换整个 `BlockStatement` 即可。
- ⚠️ **依赖 S3**：假分支没剪掉时，`split('|')` 的定位会被同形的 `var x = 'a|b'.split('|')` 干扰
  （同 `mba-and-dispatcher-reduction.md` §3 的守卫）。取到顺序串后**先断言「split 出的每个元素都能在 `cases` 里找到」**，
  找不到就**放弃并保留原样**，不要产出空 block。

---

## §5 工程组织：解密函数离线模块化（1473162 的范式）

源文把「**解密函数**」和「**要被解密的执行体**」物理分成三个文件 —— 这个组织方式比任何单个 pass 都更值得抄：

| 文件 | 内容 | 作用 |
| --- | --- | --- |
| `de.js` | **只**粘混淆代码里的那个解密函数，末尾加一行 `module.exports = { _0x7969 }` | 变成可 `require` 的纯函数 |
| `en.js` | **只**粘要用到解密的执行体（业务函数 + 调用点） | 待处理的 AST 来源 |
| `obTest.js` | AST 脚本：`require('./de')`，遍历时直接 `de._0x7969(args[0].value, args[1].value)` 求值 | 主控 |

**为什么这样做**：

- 解密器**不塞进 AST 脚本** ⇒ 换样本时只换 `de.js` / `en.js`，主控脚本不动；
- 求值是**同步、进程内**的（`require` 进来的真函数），不走 `eval` / 子进程 ⇒ 可断点、可单测；
- 与 `sandbox-evaluator.md` 的沙箱路线互补：**解密器自包含时优先这条路**（成本最低），
  解密器依赖 `window` / 反调试 / 定时器时才上沙箱。

**两个配套注意点**：

1. **编码**：源文用 `fs.readFileSync('./en.js', { encoding: 'binary' })` + `iconv.decode(buf, 'utf-8')`
   规避读文件时的编码错乱 —— 这是源文当时的处理；本库统一按 UTF-8 读、落盘前
   `iconv`/`recode` 检查（见 `../../web-reverse-algorithm/references/06-engineering-maintenance.md` §十三的口径）。
2. **`estraverse.replace` 的语义**：`enter` 里 `return {type, value, raw}` 即**替换当前节点**、
   `return undefined` 即不改动。替换后**不要**再按旧节点引用做遍历决策（AST 已变，对应
   `ob-variant-taxonomy.md` §五的「折叠后 AST 结构已变」坑）。

---

## §6 与其它文档 / 本库脚本的对应

| 本文的步 | 本库实现 | 备注 |
| --- | --- | --- |
| S1 字符串调用还原 | `scripts/inline-literals.js` · `scripts/deobfuscate/string-decoder.js` · `scripts/sandbox-evaluator.js` | 静态优先、沙箱兜底 |
| S2 字典对象还原 | `scripts/fold-wrappers.js`（包装器折叠）· `references/ob-variant-taxonomy.md` §四 | 5 类返回值表见本文 §3.2 |
| S3 假分支剪除 | `scripts/prune-fake-branches.js` · `scripts/prune-opaque-predicates.js` | 三个崩溃点见本文 §4.1 |
| S4 平坦化还原 | `scripts/flatten-array-control-flow.js` · `references/control-flow-reduction-rules.md` | 判据见本文 §4.2 |
| 顺序与残留体检 | `scripts/run-pipeline.js` · `scripts/collect-residue-metrics.js` | 残留指标 = 自动化版「漏做检测」 |

**一句话**：能自动化的都自动化了；**手工阶段的全部价值在于「顺序 + 边界 + 对拍」**。
