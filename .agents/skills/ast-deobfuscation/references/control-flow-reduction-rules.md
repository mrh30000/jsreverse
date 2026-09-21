# 控制流归约规则（R00–R35）

这份文档是 `control-flow-and-opcode-patterns.md` 的配套清单，用于把单层状态图（基本块 + 边）归约回自然 JavaScript。

每条规则按 **形状 → 安全前提 → 改写 → 常见错误** 四段式给出。改写前逐条核对前提；前提不成立就跳过，宁可保留状态机。

## 通用前提

- 先确认边的完成身份（Normal / Break / Continue / Return / Throw / Indirect / Suspend），而不是只看目标编号。
- 先区分 Pred 和 InEdges：`A.true→B` 与 `A.false→B` 是两条边，可能各带赋值。
- `|Succ(A)|>1 且 |Pred(B)|>1` 的临界边要插入边块 `A → EdgeAB:[edge actions] → B`，边独有动作既不能放 A 尾也不能放 B 头。
- 代码移动的前提包括：不跨作用域、不跨异常边界、不跨挂起边界、不改变求值时点、不改变对象身份与分配次数。

## 顺序、分支与汇合

| 规则 | 形状 | 前提 | 改写 | 常见错误 |
| --- | --- | --- | --- | --- |
| R00 空跳板 | `P1/P2 → B → C`，B 无动作 | 无动作、无边赋值、无可观察调度、无绑定/异常/恢复效果、引用可重定向、别名链不是环 | `Jump(B) → Jump(C)` | 把 `B → C → B`（空循环/发散）删成正常落下；`case B: log(); state = C;` 里 log 可观察，B 不是空跳板 |
| R01 独占顺序后继 | `A:P → B:Q → E`，B 只有这一条有效入边 | 移动 Q 不跨作用域/异常/挂起边界 | `A:P; Q → E` | B 还有 `X→B` 时当独占删掉（共享块不能删；可先归约前驱区域或有限复制） |
| R02 分支内独占后继 | `A: cond ? B : E`，`B: Q → D` | B 只由 A 的 true 边进入 | `if (cond) { Q(); } else { ...E }` | 把 Q 追加到 A 尾部 → false 分支也执行 Q |
| R03 共享公共后继 | `B/C → J:Q → E` | B/C 已是完整区域、所有正常路径都到 J、J 无未接管侧入口 | `if (cond) { B() } else { C() }` 后接 `Q();` | 只因"都能到 J"就提前 Q；忽略 return/throw/发散路径、忽略绕过 J 的落下路径 |
| R04 两条边同目标 | `state = check() ? J : J` | — | 保留条件求值：`check(); // Jump(J)` | 目标相同就把条件删掉 |
| R05 单臂三角形 | `A: cond ? B:T → J : J` | B 无侧入口，正常后继确实是 J | `if (cond) { T(); }` | 顺手把 `!(x < y)` 化简成 `x >= y`（NaN 下不同） |
| R06 双臂菱形 | `A: cond ? B:T : C:F` 两臂汇合于 J | 两臂单入口、不交叉、无侧入口、正常后继相同、条件只求值一次、异常与发散路径保持 | `if (cond) { T(); } else { F(); }` | 两臂有交叉边时仍按菱形处理 |
| R07/R08 提前 return/throw | 一臂确定 return | — | `if (cond) { return makeValue(); }` 后接后续代码，不虚构 join | 两臂都 return 时预先计算两边：`const a=left(); const b=right(); return cond?a:b;` 会执行未选中分支 |
| R09/R10 判断阶梯与短路 | 后续判断只从上一判断的失败边进入，中间无动作 | — | `if (c1() && c2()) T();` | 失败边上有 Q 时写成 `else if` → Q 的时点消失或提前 |
| R11 多路分支与 fallthrough | 原图含 B→C 落下 | — | 恢复 switch 并保留 discriminant 单次求值、case 搜索顺序、严格相等、default、fallthrough、break 真实目标 | 误补 break → `key=0` 时丢掉 CBody |

## 循环、回边与出口

| 规则 | 形状 | 前提 / 验证重点 | 改写 | 常见错误 |
| --- | --- | --- | --- | --- |
| R12 true 分支自环 | `H: cond ? Body→H : Exit` | 验证 0 轮 / 1 轮 / 多轮、n 次 body 对应 n+1 次 condition、body 抛出时不额外执行退出动作 | `while (cond) { Body(); }` | 忽略 0 轮情况 |
| R13 false 分支自环 | `H: stop ? Exit : Body→H` | 保留逻辑取反，不擅自改比较符 | `while (!stop) { Body(); }` | 未证明就改写比较符 |
| R14 每轮公共前缀 | `H: Prefix; cond ? Body→H : ExitAction→Exit` | Prefix 每轮和退出判断前都执行 | `while (true) { Prefix(); if (!cond) { ExitAction(); break; } Body(); }` | `Prefix(); while (cond) { Body(); } ExitAction();` → Prefix 只执行一次 |
| R15 尾判断循环 | `H: Body; cond ? H : Exit` | 首次进入一定先执行 Body | `do { Body(); } while (cond);` | 把只在条件为真时执行的动作塞进公共体 |
| R16 无条件自环 | `H: Body → H` | — | `while (true) { Body(); }` | 把空循环删掉 → 后续代码被执行（发散是程序语义） |
| R17/R18 双节点/线性多节点环 | `H: cond ? B : Exit`，`B: T → H` | 每个中间块无侧入口、无额外出口 | 先内联独占臂，再化为 while | 外部能直接进入 B2 时仍线性拼接 → 强制执行本应绕过的 B1 |
| R19 两分支都回头 | `H: cond ? T→H : F→H` | — | `while (true) { if (cond) { T(); } else { F(); } }` | 写成 `while (cond) { T(); } F();` → false 分支本应回到 H 而非退出 |
| R20 一般自然循环 | 多 latch | 1 加虚拟 ENTRY；2 可达性；3 dominator；4 `H ∈ Dom(L)` 才是回边候选；5 从 latch 反向收集前驱到 H；6 合并同 H 的多个 latch；7 区域外入口只到 H；8 收集出口及边动作；9 先结构化内部子区域；10 回 H 的边映射为 continue | 见 R12–R19 | 只用 SCC 判断（SCC 说明"哪里有环"，dominator 才说明"有没有单入口循环头"，两者不可互替） |
| R21 continue | — | continue point：while→test；do-while→尾部 test；for→update 再 test | 结构匹配时用对应 continue | 绕过 Update 的边改成普通 `for` continue → 多执行 Update |
| R22 break | `stop ? [F; Exit] : [Q; Header]` | — | `if (stop) { F(); break; } Q();` | 把 F 提到循环后 → 正常条件失败退出也执行 F |
| R23 多个不同出口 | 循环可能去 E1/E2/E3 | 每个正常退出必须初始化 exitKind，边上动作不重复 | 优先级：①复用外层 if/loop/label ②最小范围标签 ③`exitKind` 选择器 ④局部残余调度器 | 用单一 break 表达多种出口 |
| R24 嵌套循环跨层跳转 | `outer: while (c1()) { while (c2()) { if (stop()) break outer; } afterInner(); }` | 确认真实目标等于最近循环才能去标签 | 保留标签 | 把 `break outer` 改成裸 break → afterInner 错误执行 |
| R25 for 美化 | while → for | Init 只执行一次、test 时点相同、所有普通回边经过 Update、所有 continue 经过 Update、break 跳过 Update、Update 异常时点相同、`let` 逐轮绑定与闭包捕获不变、TDZ 与声明作用域不变 | 满足才改，否则保留 while | 把 for 当解混淆完成度指标 |

## 交叉、多入口与语义边界

| 规则 | 形状 | 前提 | 改写 | 常见错误 |
| --- | --- | --- | --- | --- |
| R26 无环交叉 / N 型共享 | `A: c ? B : C`，`B: P; d ? C : D`，`C: Q → D`，`D: S → E` | d 只能在经过 B 且执行 P 之后求值 | 最小标签区域：`join: { if (c) { P(); if (!d) break join; } Q(); } S();` 或受限复制 Q（限体积、查绑定与对象身份） | 把 d 提前，或让 c=false 路径求 d |
| R27 多入口 SCC | `ENTRY→B`，`ENTRY→C`，`B ↔ C` | 环内没有节点支配整个环时不能伪造单入口 while | 保留局部状态机 `state = choose() ? B : C; region: while (true) { switch (state) {...} }` | 硬套单入口 while |
| R28 受控复制 | 共享节点 B 多前驱 | 粗略成本 `growth ≈ (copies-1) × cost(B)`，再加下游复制/标签/包装成本 | 只把 B 复制到选中的边，其他入口继续用原 B | 无预算递归复制；复制带回边节点导致无限展开；复制闭包声明改变共享 binding |
| R29 return/throw 终结块 | `A → R:[P; Return(expr)]` | expr 在原分支、原函数、原 finally 上下文中按相同时点求值 | `A:[P; Return(expr)]` | 把 expr 提到不同 finally 上下文 |
| R30 常量分支与不可达代码 | `if ((audit(), true)) { T(); } else { F(); }` | 对所有有效入口都证明 condition 恒真/恒假 | 去掉 F，但保留 `audit(); T();` | 用一次动态运行没走到 F 就删 F；删不可达语句时忽略 var/函数声明/块函数/类的绑定实例化 |
| R31 临界边与路径赋值 | 边独有动作、SSA φ / 并行复制 | 按入边降低 | 边动作留在边上；交换用临时变量或保完整引用求值语义 | `[x, y] = [y, x]` 写成 `x = y; y = x;`；左值含 getter/setter 或计算属性时简化引用 |
| R32 未知与间接目标 | `state = table[compute()]` | table 可变 / compute 有副作用 / 候选集合不完整 → 保留 | `target = Eval(table[compute()]); Dispatch(target, knownTargets, originalUnknownBehavior)` | 把未观测目标改成 throw；因动态轨迹只出现 A 就删 default |
| R33 异常边与 finally | `try { return choose(); } finally { cleanup(); }` | 真实语义：求值 choose → 保存 pending return → cleanup → cleanup 正常完成则继续原 return，若 return/throw 则覆盖原完成 | 跨异常区域归约至少携带 `Completion × ExceptionContext`；无异常感知结构器时只在同一 try/finally 子区域内做局部安全归约 | 用普通 successor 描述 finally |
| R34 await/yield | generator / async 状态机 | 恢复入口：首次 next、next(value)、throw(error)、return(value)；async 还有 fulfill/reject 与微任务时序 | 未建立恢复模型时保留局部恢复状态机 | 把 Suspend 当普通 Jump，把 yield/await 当普通函数调用 |
| R35 等价尾部再共享 | `if (cond) { P(); S(); } else { Q(); S(); }` | 两处 S 必须：同一 binding、对象身份与分配次数一致、异常上下文一致、生命周期一致、对应正常路径都执行、前缀提前终止时不新增 S、无未接管侧入口 | `if (cond) { P(); } else { Q(); } S();` | 文本相同就当作语义等价；与尾部复制来回振荡（应在结构稳定后再做） |

## 伴随混淆的边界提示

CFF 很少单独出现。遇到以下叠加层时，先处理它们再动控制流，否则状态值和目标集合都不可信：

- **标识符混淆**：用 scope/binding 追踪，不用正则。
- **字符串池/加密**：状态值、属性名、错误信息可能藏在解码器里，先恢复字符串再解状态。
- **常量与表达式混淆**：`state = (0x31 ^ 0x55) + (3 << 2)`、`log(), state = cond ? A : B, cleanup();` 会干扰常量传播与目标恢复。
- **不透明谓词与死代码**：`if (((x*x+x) & 1) === 0)` 会制造假分支/假汇合/假循环，先清谓词再算 CFG（见 `opaque-predicates.md`）。
- **状态编码与跳转表**：XOR/ADD 编码、高低位拆分、多变量组合、数组/对象查表、动态密钥、属性别名、getter/setter/Proxy。
  - 「多变量组合」若是**位切片**形态（`Ci = 31 & li; fi = li >> 5; mi = 31 & fi; Ai = 31 & bi;` 然后三层嵌套 switch），直接按其可逆线性和式 `li = Ci | (mi << 5) | (Ai << 10)` 归约成单层 `switch (li)`——配方与自动化注意点见 `mba-and-dispatcher-reduction.md` §2。
  - ⚠️ 归约前必须确认**字符串数组已还原**：`while+switch` 的还原靠扫描 `'|'` 定位顺序串，未还原时会取到字面量 `'|'` 并把整个循环替换为空，**函数体被静默清空且产物仍能正常 parse**。守卫条件见 `mba-and-dispatcher-reduction.md` §3。
- **控制流虚拟化**：`switch (bytecode[ip++])` 的每个 case 是一条虚拟指令而不是基本块，分析目标变成指令集/虚拟栈/寄存器/字节码（见 `jsvmp-deobfuscation.md`、`vm-protection.md`）。
- **eval/Function/动态代码**：磁盘上的 JS 可能只是加载器，真正控制流要从运行态产物恢复（见 `sandbox-evaluator.md`）。
- **反调试与自防御**：`debugger`、定时器差值、DevTools 检测、`Function.prototype.toString` 检查、Error stack 检查、源码完整性校验，可能按环境切换到另一套控制流。
- **异常/异步/生成器状态机**：转译或混淆后表现为正常与异常两套状态、fulfill/reject 恢复入口、next/throw/return 多入口、finally 清理状态，不能当同步 while-switch 删除。
