# 控制流平坦化与 Opcode 模式

这份文档用于处理控制流平坦化、opcode `if` 链、虚拟机解释器主分发器，以及测试位噪声分支。

## 适用场景

- `for (...; ![];) { switch (...) { ... } }`
- `while (true) { switch (...) { ... } }`
- `"3|1|2".split('|')` 一类数组或顺序表驱动的平坦化
- 大量 `if (0x31 === opcode) ... else if ...`
- 虚拟机解释器里围绕同一个 opcode 变量做长链分发

核心心智模型只有一句：**节点里是动作，边上才是控制流。** case 在文件里的排列顺序没有任何意义，`state = NEXT` 也只是为下一轮调度准备数据，不等于控制流已经转移。

## 先判定，再改写

不要一看到 `while + switch` 就认定是混淆。协议解析器、业务流程、事件循环、generator/async 转译产物都长这样。下面九问至少要能答上大部分，答不上就当作不可还原的分支结构处理：

1. **循环入口**：状态变量在哪里初始化？进入循环前，还是由参数/闭包/属性提供？允不允许从多个状态进入？有没有异常入口或外部跳入？
2. **test / update 做了什么**：除了比较，有没有 `audit(state)`、`tick++`、`decode(state)`、getter/Proxy、`try/finally`？把两轮调度合并成一段顺序代码会减少这些动作的执行次数，所以**证明不了调度不可观察，就必须把这些动作保留到 CFG 的边上**。
3. **switch 判别式是什么**：可能不是状态变量本身，而是 `(state ^ key) & 0xff`、`table[index++]`、`nextState(machine)`。记录它的求值次数、顺序、副作用和值域。
4. **状态由什么表示**：数字/字符串、数组调度序列、位编码、多变量元组、查表或函数计算、对象属性。不要假设状态连续，也不要因为 case 标签是整数就用 `for (i=0;i<n;i++)` 枚举。
5. **binding 是哪个**：按**词法绑定**追踪，不是按变量名搜索。`inner()` 里的 `state` 和外面的 `state` 无关；`alias = machine; alias.state = 2` 是别名写入。用 Babel 的 scope/binding API，不要正则替换同名标识符。
6. **状态写点全集**：直接赋值、复合赋值、自增自减、解构、作为参数传进函数后被写、表项/属性写入、`eval`/`with`。写点不全 → 目标集合不全 → **保留未知边，不要删 default，也不要自己补一个 `throw`**。
7. **case 怎么真正离开**：不一定是 `break`。可能 fallthrough、`return`/`throw`、`continue` 外层、`break 外层标签`、`try/finally` 的 pending completion、`await/yield` 挂起，或嵌套 switch 里只退出内层。看见 break 先问它退出谁，而不是默认回 dispatcher。
8. **状态写入之后还有什么**：`state = NEXT; observe(state); cleanup(); break;` —— 在赋值处直接生成 `Jump(NEXT)` 是 CFF 解混淆最常见的致命错误。赋值之后的语句、外层 update、外层 test、判别式的再次求值，都发生在真正转移之前。
9. **它真的可以删吗**：业务状态机（状态即业务数据）、VM 解释器、generator 恢复状态机、解析器、协议循环，都不该当混淆抹掉。识别 CFF 靠数据流和运行证据，不是靠 `_0x` 长相。

## 状态模型与 IR

```text
Block = { id, actions, terminator, lexicalContext, exceptionContext, suspensionContext, origins }
Region = { entry, members, body, exitPorts, contexts, origins }
```

终结方式（terminator）：

```text
Jump(t)  Branch(cond, trueT, falseT)  OrderedSwitch(discriminant, cases, defaultT)
Return(v)  Throw(v)  Indirect(expr, knownTargets, unknownBehavior)
Suspend(value, normalResume, throwResume, returnResume)
```

出口保存的是**完成身份**而不是目标编号：`Normal(t)` / `Break(region)` / `Continue(loop)` / `Return(v)` / `Throw(v)` / `Indirect(expr)` / `Suspend(resumeInfo)`。return、throw、break、continue 都携带函数、循环、标签或异常上下文，压成一个编号会丢语义。

节点与边必须分开：把 `state = NEXT; observe(state); cleanup()` 放进 `actions`，terminator 标成 `ReDispatch`；再由调度器分析把 `ReDispatch` 专门化为 `edge actions: loopUpdate → loopTest → discriminant`、`target: NEXT`。注意区分 Pred 与 InEdges：`A.true→B` 和 `A.false→B` 时 `Pred(B)={A}` 但 `InEdges(B)` 有两条，两条边各带不同赋值时不能因为前驱只有一个就内联。`|Succ(A)|>1 且 |Pred(B)|>1` 的临界边要插入边块，边独有动作既不能放 A 尾也不能放 B 头。

## 控制流展平原则

- 优先写定向 visitor，不要一开始追求通用大而全。
- 先验证 `init`、`test`、`update`、`body` 结构是否稳定。
- 只要结构不匹配，就直接跳过，不要强行展平。
- 拼接 case 时同步清理仅用于跳转的赋值、无意义 `break` 和明显噪声语句。
- **状态赋值本身不是跳转**；只有到达真实重新调度点才能建边（见九问第 8 条）。
- 节点归约规则见 `references/control-flow-reduction-rules.md`，改写前逐条核对前提。

## `if` 链改写为 `switch`

仅在以下条件同时满足时改写：

- 整条链都在判断同一个判别表达式。
- 每个分支都拿这个表达式与字面量比较。
- 分支数量足够长，改写后可读性明显提升。
- 改写后才安全的反向操作是还原 switch：discriminant 只求值一次、case 表达式按顺序搜索、严格相等、default 与 fallthrough 都要保留（见 `control-flow-reduction-rules.md` R11）。误补一个 `break` 就会丢掉 fallthrough 分支。

## 多层 switch 压缩

多层 switch 不是"套了几层 case"，而是把完整状态 `S` 拆成多个判别字段。执行到外层 case A、内层 case B，意思是 `K = (f(S)===A) ∧ (g(S)===B)`。压缩一层的本质是求解 K：唯一确定 S → 生成单层状态；对应多个 S → 状态集合；无法求解 → 保留符号约束或 Indirect；内层条件与 S 无关（业务条件）→ 原样保留。

正确做法是沿真实执行路径累计约束，**不是把内外 case 标签相加**。位编码 `low = state & 3; high = state >>> 2` 时，`state = low + 4 × high`；把每个叶子 `(low, high)` 映射回完整状态后再压平。多变量状态 `(s1, s2)` 要按顺序更新，`s1 = s2; s2 = s1 + 1;` 第二句读的是已更新的 s1。

必须区分两个阶段：①多层压成单层开关 → 恢复"完整状态到基本块的映射"；②单层状态机恢复 if/while → 恢复"基本块之间的自然结构"。压平后如果立刻做美化，等于在错误的状态图上做代码移动。

压缩过程中必须保留：判别式的一次求值、case 表达式顺序与副作用、严格相等与 fallthrough、解码字段中途写入后的新值、循环 test/update 与 getter/Proxy、JS 32 位有/无符号位运算语义、多变量元组约束、无法证明完整时的未知目标与原 default 行为。应从真实入口做可达闭包，不要枚举所有字段的笛卡尔积。

### 数组调度序列的安全条件

`"2|0|3|1".split("|")` 这类只读顺序表的"照抄拼接"，仅在以下全部成立时安全：序列静态不可变、索引初值静态、每轮索引更新可预测、case 不改序列或索引、判别式无其他副作用、continue/break 目标已确认、越界分支不可达、每轮调度无可观察动作、case 内无动态跳转或异常改变顺序。任一条不成立（例如 `case "0": if (condition) index++;` 或 case 内 `order.push(...)`）就退回状态机分析。

## 恢复为 if / while / break / continue

CFF 恢复到单层状态图后，按 `references/control-flow-reduction-rules.md` 的 R00–R35 逐节点归约。最常用的几条：

- **循环**：判断循环头是否支配所有回边来源（SCC 只说明"哪里有环"，dominator 才说明"有没有单入口循环头"）。true 分支自环 → `while (cond)`；false 分支自环 → `while (!stop)`；无条件自环 → `while (true)` **不能删**（发散是程序语义）。带每轮公共前缀的循环要写成 `while (true) { Prefix(); if (!cond) { ExitAction(); break; } Body(); }`，把 Prefix 提到循环外会少执行若干次。
- **continue / break**：先确定 continue point（while → test；do-while → 尾部 test；for → update 再 test），绕过 update 的边不能变成普通 `for` continue。break 边上的动作不能提到循环后。
- **for 美化是后处理，不是完成度指标**：Init 只执行一次、test 时点相同、所有普通回边都经过 Update、所有 continue 都经过 Update、break 跳过 Update、Update 异常时点相同、`let` 逐轮绑定与闭包捕获不变、TDZ 不变——全满足才改，否则保留 while。
- **多出口**：优先复用已有外层 if/loop/label；其次最小范围标签；再次 `exitKind` 选择器；最后才保留局部残余调度器。标签是表达跨层目标的合法结构，不是"不够漂亮"的证据。
- **多入口 SCC**（环内没有一个节点支配整个环）：不要伪造单入口 while，保留局部状态机 `region: while (true) { switch (state) {...} }`，已经比函数级 dispatcher 清晰得多。
- **临界边 / 路径赋值**：边独有动作留在边上；`[x, y] = [y, x]` 不能拆成 `x = y; y = x;`。
- **未知目标**：`table` 可变、`compute()` 有副作用、候选集合不完整时保留 `Indirect`，不要把未观测目标改成 `throw`，也不要因为一次动态轨迹没走到就删 default。
- **异常与挂起边界**：`try/finally` 的归约要携带 `Completion × ExceptionContext`，跨 finally 区域不做全局归约；没有恢复模型时 `await/yield` 不能当普通 Jump。

顺序建议：先把 dispatcher 压成单层状态图 → 恢复自然循环（header、latch、continue/break）→ 恢复循环内分支 → 结构稳定后才做等价尾部共享和作用域收窄。每步之间重新 parse 输出并保留中间产物。

## 误改写黑名单（CFF 专项）

| 错误做法 | 后果 |
| --- | --- |
| 在 `state = NEXT` 处直接建跳转边 | 丢掉赋值后的 `observe/cleanup`、外层 update/test |
| 把两轮调度的公共语句提出去或合并 | 减少 `audit/decode/getter` 的执行次数 |
| 用 `for (i=0;i<n;i++)` 枚举状态 | 状态不连续、case 标签是整数不代表可枚举 |
| 按变量名/正则替换状态标识符 | 误伤同名不同 binding 或别名写入 |
| 删除 default、把未知目标改成 throw | 掩盖真实的动态目标集合 |
| `if (cond) { A() } else { B() }` 归约时把 A 提到分支外 | else 路径多执行 A |
| 合并两臂公共后继时忽略 return/throw 路径 | 提前终止的路径被迫执行汇合块 |
| `x - x === 0`、`!(x<y)` → `x>=y` 之类代数化 | NaN / Infinity 下语义不同 |
| 空循环、`B → C → B` 删成正常落下 | 把发散变成继续执行 |
| 把 `A && B && 0 \|\| C` 按布尔语义化简成 `A && B && C` 或 `C` | 短路链是**顺序语句伪装**，化简会改执行顺序、丢副作用（VM 的执行就是副作用） |
| 把 `X.$[1][X.$[0]](...)` 当普通数组索引「就地替换成员」 | 破坏第 1 层挂在 `Function.prototype.call/apply` 上的副作用，`call.call` 跳板失效 |

## 测试位噪声与哨兵比较

某些样本会在测试条件里塞入噪声，例如：

```js
cond && fn(...) !== {}
cond && fn(...) === {}
```

只在以下前提下清理：

- 它位于 `if`、`for.test` 或 `while.test` 位置。
- 右侧确实只是混淆器注入的空对象比较噪声。
- 删除后不会影响左侧真实条件的副作用顺序。

## 虚拟机解释器建议

- 第一轮只求看清主分发器、栈变量、opcode 读取器。
- 清掉虚假分支后，再把 `if` 链改成 `switch`。
- 第二轮再考虑简化 case 内的局部结构。

## 顺序表达式伪装（`&& 0 ||` 链）

有些加固把**整个函数体写成一条 `return` 表达式**，用短路运算把顺序副作用串起来：

```js
eval(function r(n, Z) {
  var r = "JS DUN PROTECT", e, k, y, t, f, ...;
  return (((((...) && (...) || (...)) && ...));
}(...))
```

两轮 VM 之间的衔接点是这套写法的典型形态（**先执行副作用，再把自己变 falsy，靠 falsy 触发下一段**）：

| 片段 | 作用 |
| --- | --- |
| `])))` | 关闭字节码数组与第一轮 `p(...)` 调用 |
| `\|\| 1)` | 让前半段恒为真值（丢弃第一轮返回值） |
| `&& (T = 0) && 0` | 执行副作用（重置计数器 `T`），然后故意让左侧变 falsy |
| `\|\| (V = p(Q, ...))` | 借这个 falsy 触发**第二轮** VM 调用 |

**读法**：`A && B && 0 || C` ≡ 「执行 A → 执行 B → 执行 C」
（**前提是 A、B 都是真值**；若 A 为 falsy，`B` 会被正常短路掉 —— 所以这只是「读法」，
不是可以拿来化简的等价式）。

⚠️ **不要按布尔语义化简**（例如把 `X && 0 || Y` 折叠成 `Y` 或 `X && B && C`）：
那样会**丢掉 X 的副作用**，而这里的副作用就是 VM 的执行本身。也不要把整条链当「条件表达式」提公共子表达式。

**建议顺序**：① 先按**副作用顺序**把它逐段拆成顺序语句（保留全部调用与赋值，哪怕是「恒真/恒假」的分支）；
② 再对拆出来的顺序语句做常规归约；③ 全程保证**每个副作用恰好执行一次**。

⚠️ 与「控制流平坦化」不是一回事：**这里没有状态机**，只有嵌套短路链 ⇒ `switch` 归约那套不适用，别硬套。

## 虚拟方法表（`X.$`）：数组索引 + 双层 call 跳板

样本是某国产 JSVMP 加固壳（`eval(function r(n, Z){...})`：字节码数组 + 两轮 VM 执行）。
**这个结构值得单独识别，因为它让 AST 层彻底失去「谁调用了谁」的信息**：

```js
X.$ = [
  X.$ = "1.1",
  X.apply[X.$] = X.call[X.$] = X.call,
  X.apply,
  [].push,
  [].pop,
  [].concat,
  [].slice,
  X.bind,
  function (r, n, Z, e, k) {
    return 7 == r ? X.$[1][X.$[0]](X.$[3], n, Z, e, k) :
           2 == r ? X.$[1][X.$[0]](X.$[r], n, Z, e) :
                    X.$[1][X.$[0]](X.$[r], n, Z)
  }
]
```

三层设计：

| 层 | 手法 | 效果 |
| --- | --- | --- |
| 1 | 先 `X.$ = "1.1"`，再 `X.call["1.1"] = X.call`（`apply` 同理） | 用「带点的字符串 key」把函数引用**伪装成一个看起来像版本号的属性**；⚠️ 该属性**仍然是可枚举自有属性**（实测 `Object.keys(Function.prototype.call)` 会返回 `["1.1"]`）⇒ 它挡的不是遍历，而是**静态分析不会去猜这个 key 指向什么** |
| 2 | `X.$[1][X.$[0]](f, this, ...a)` ＝ `call.call(f, this, ...a)` ＝ `f.call(this, ...a)` | **双层 call 跳板**：静态分析只看到数组索引访问，推不出调用目标 |
| 3 | 调度器把**第一个参数 `r` 当 opcode**：`2`=apply、`3`=push、`4`=pop、`5`=concat、`6`=slice、`7`=多值 push | 全部栈操作与函数调用收敛到**唯一入口** `X.$[8]`，便于加固方自己 hook 检测 |

**识别信号**：出现「字符串属性 + `Function.prototype.call/apply` 与 `[].push/pop/concat/slice` 混排在同一个数组字面量里」的构造。
同一文件里常能搜到**字符串字面量** `"JS DUN PROTECT"`（仅作提示，站点可改名）。

**还原思路（按收益排序）**：

1. **先解析调度器参数 → opcode 映射**（`r` 到第 i 项原生方法）。这一步比还原字节码便宜得多，且立刻可验证。
2. 再用这张表把 `X.$[8](k, ...)` 全部**改写成语义等价的直接调用**（`arr.push(v)` 等）⇒ 到此 AST 才恢复可读性。
3. 最后才处理字节码与主分发器（`references/jsvmp-*.md`、`references/jsvmp-ir-and-optimization.md`）。

⚠️ **不要**把 `X.$[...]` 当普通数组整体求值后「就地替换成员」：那会破坏第 1 层挂在
`Function.prototype.call/apply` 上的**副作用**，后续 `call.call` 跳板随之失效。

**两轮 VM 的顶层结构**（用于判断「加固后为什么膨胀」）：

| 阶段 | 做什么 |
| --- | --- |
| 初始化 | 声明变量、缓存原生方法引用（`Math.sin` / `JSON.stringify` / `String.fromCharCode` …） |
| 第一轮 `p(字节码, ...)` | 解码字节码并执行 |
| 第二轮 `p(代码生成器 handler, ...)` | **产出真正要执行的目标 JS 代码**（壳 = 代码产出 + 字符串解码 + 格式化检测） |

⚠️ **格式化检测**：这类壳会在解码后检查自身代码是否被格式化，命中就拒绝执行
⇒ 想自动化处理，要么**不格式化、直接补环境跑**，要么自己写可靠的反混淆器（成本远高于前者）。
同源结论见 `../../web-js-env-patcher/references/edge-waf-cookie-challenge.md` §3.2
与 `../../web-reverse-algorithm/references/10-waf-clearance-cookie.md` §6.2（「代码文本参与计算」）。

## 停止条件

- 主 opcode 分发器已可读。
- 关键 case 已经可以逐个分析。
- 继续静态展开开始明显增加误改写风险。

到这里就可以转入人工分析或结合运行时证据继续逆向。
