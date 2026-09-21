# JSVMP 反编译的工程化路线（CFG / 异常表 / PC 状态机 / 旁路 AST）

> 配套关系：
> - **助记符表、符号执行骨架（`VMState` / `used` 标记 / BOX 变量 / 成员引用）** 以
>   `jsvmp-bytecode-and-decompiler.md` 为准，本文不重复。
> - **插桩、日志采集与分析** 以 `jsvmp-dynamic-instrumentation.md` 为准。
> - 本文负责：**三条反编译路线的选型**、**CFG 构建**、**栈式 VM 的指令语义表模板**、
>   **异常表语义**、**PC 状态机与 CFG bound 合并**、**寄存器式 VM 的差异**、**vmp 套 vmp**。

---

## 0. 三条反编译路线（先选路，再写代码）

| 路线 | 做法 | 产物 | 适合 | 风险 |
| --- | --- | --- | --- | --- |
| **0.1 纯静态生成器** | 读字节码 + 语义表 → 直接生成 JS AST，**脱离网页** | 完整可读 JS | 指令集已摸清、要长期维护 | 需要先有完整语义表；环境相关指令没法静态求值 |
| **0.2 解释器改造为生成器** | **改原解释器**：每个 opcode handler 里同时建 AST 节点 | 完整 JS，**由真实执行路径产生** | 想省掉「先摸清全部指令」这一步 | 破坏原流程、改错难核对；需要较高代码能力 |
| **0.3 旁路式（live AST）** | 页面里注入 AST SDK，handler **一边执行一边**记录 | 执行轨迹 + AST 片段 | 调试与逆向分析、分支探索 | 不追求完整状态机；产物是半成品需人工整理 |

### 0.1 选路判据

- **只需要结果** ⇒ 都不是，走补环境。
- **指令集 ≤ 20 条、结构简单** ⇒ 0.1（手写语义表成本低）。
- **指令集 70~90 条、要完整还原** ⇒ 0.2 或 0.1 + CFG（§1）。
- **分支极多（`if/else` 判定链）、想知道控制流形状** ⇒ 0.3（`2120914` 的选择）。
- **只想知道「该往哪插桩」** ⇒ 只做 CFG（§1），不做完整反编译。

**0.2 的一个实用技巧**（`52pojie-1752755`）：
在**每个 case 开头**插入 `throw Error("未更改")`，然后跑一遍。
抛异常的就是**还没处理的 case**；处理完就不再抛。跑通即覆盖完整。
配套技巧：在每个 case 首行插 `june.push(case_num)`，跑一次收集**实际执行到的 case**，
把没出现的 case 全部删掉（0~255 的枚举里有很多是死分支）。

---

## 1. CFG 构建（四步，通用）

> 来源：`2116186`（某音 a_bogus）。**这一步的产物是「该往哪插桩」的地图。**

### 1.1 基本块定义

```js
class BasicBlock {
  constructor(startIndex) {
    this.id = BasicBlock.blockId++;
    this.startIndex = startIndex;
    this.endIndex = -1;
    this.instructions = [];
    this.trueSuccessor = null;     // 条件为真时的后继块 id
    this.falseSuccessor = null;    // 条件为假时的后继块 id
    this.predecessors = [];
  }
}
```

### 1.2 步骤

| 步 | 做什么 | 规则 |
| --- | --- | --- |
| **① Leader 识别** | 标记基本块入口 | 函数第一条指令；**任何跳转指令的目标地址**；**紧跟条件跳转/return 之后的下一条** |
| **② 构建基本块** | 从每个 Leader 起，连续切到下一个 Leader 或函数结束 | 得到一堆**单进单出**的直线序列，不含分支 |
| **③ 块间连接** | 遍历每块最后一条指令，把跳转目标解析成块索引 | 建立前驱/后继有向边 |
| **④ 出图** | 遍历所有块 → `dot` 文件 → Graphviz | 用图看整体形状，比读代码快得多 |

**判据**：CFG 出图之后，先看图找**环**（loop back-edge）和**多入口块**——
环对应业务循环，多入口块对应 `if/else` 汇合点，这两类节点就是插桩的优先位置。

**已知局限（必须显式声明）**：CFG 只解决「块与块的关系」，
**不解决「每块里那几条指令在算什么」**——后者仍要靠插桩或语义表。
`2116186` 的作者原话：「本方法只是生成控制流图，最后手动优化结合 AI 得到 js 代码，属于半自动半手动。」

---

## 2. 栈式 VM 的指令语义表模板

> 来源：`2116186`（某音 bdms，76 个 handler）。**换一个 VM 时，这张表是要重填的唯一部分。**

按**栈效果**记录，而不是按名字记录。记法：`[... 前状态] -> [后状态]`。

### 2.1 堆栈操作

| 语义 | 栈效果 |
| --- | --- |
| `IrPushImm` | `[] -> [stringTable[keyStringIndex]]` 或 `[] -> [value]` |
| `IrPushConstant` | `[] -> [constant]` |
| `IrPushVar` | `[] -> [var]` |
| `IrPop` | `[a] -> []` |
| `IrCopyTop` | `[a] -> [a, a]` |
| `IrCreateArray` | `[... a1..an] -> [[a1..an]]`（操作数是数组长度） |
| `IrSetTop` | `[...] -> [undefined]` |

### 2.2 运算 / 类型 / 比较

| 语义 | 栈效果 |
| --- | --- |
| `IrAdd` / `IrSub` / `IrMul` / `IrDiv` / `IrMod` | `[a, b] -> [a op b]` |
| `IrNeg` | `[a] -> [-a]` |
| `IrLogicalNot` | `[a] -> [!a]` |
| `IrTypeOf` | `[a] -> [typeof a]` |
| `IrConvertByteCodeNumber` | `[...] -> [+stringTable[idx]]`（**操作数在字节码里**） |
| `IrConvertStackNumber` | `[a] -> [+a]` |
| `IrBitwiseAnd/Or/Xor` | `[a, b] -> [a & b]` 等 |
| `IrBitwiseNot` | `[a] -> [~a]` |
| `IrBitwiseSal` / `Sar` / `Shr` | `[a, b] -> [a << b]` / `a >> b` / `a >>> b` |
| `IrCmp` | `[a, b] -> [a cond b]` |

**注意 `IrConvertByteCodeNumber` 与 `IrConvertStackNumber` 的区别**：
前者的操作数是**字节码里的常量索引**（不消耗栈），后者消耗栈顶。
**这是「不能假设 `codes[pc]` 一定是 opcode」的一个具体表现**——
同一条指令在不同 VM 里操作数来源不同，必须逐条看 handler 实现。

### 2.3 对象操作

| 语义 | 栈效果 / 语义 |
| --- | --- |
| `IrNewObject` | `[func, arg1..argn] -> [new func.bind(G)()]`（`G = [undefined, ...args]`） |
| `IrGetPropKeyFromStack` | `[obj, key] -> [obj[key]]` |
| `IrGetPropKeyFromByteCode` | `[obj] -> [obj[stringTable[idx]]]` |
| `IrSetPropKeyFromStack` | `[obj, key, value] -> [value]` |
| `IrSetPropKeyFromByteCodePop` | `[obj, key, value] -> []` |
| `IrSetPropKeyFromStackPop` | `[obj, value] -> []`（key 在字节码里） |
| `IrDeleteProp` | `[obj, key] -> [delete obj[key]]` |
| `IrDefineKeyProp` | `[obj, value] -> [obj]`，等价 `Object.defineProperty(obj, k, {value, writable:true, configurable:true, enumerable:true})` |
| `IrDefineGetterProp` / `IrDefineSetterProp` | 同上，`{get}` / `{set}` |
| `IrPropPostIncrementAssign` | `[obj, key] -> [obj[key]++]` |

### 2.4 全局对象 / 环境数组

| 语义 | 说明 |
| --- | --- |
| `IrGetGlobalProp` | `[] -> [globalThis[stringTable[idx]]]` |
| `IrSetGlobalProp` | `[value] -> []` |
| `IrInitGlobalProp` | **无栈变化**；`if (!(k in globalThis)) globalThis[k] = undefined` |
| `IrTypeOfGlobalProp` | `[] -> [typeof globalThis[k]]` |
| `IrCreateGlobalStringAccessor` | `[] -> [accessor, string]`（带 `ReferenceError` 语义的读写器） |
| `IrSetEnvProp` | `[value] -> []`，操作数 `envDepth, envIndex` |
| `IrPushEnvProp` | `[] -> [curEnvArray[envIndex]]`（按 `envDepth` 逐层 `U = U[0]`） |
| `IrPushEnvIndexAndEnv` | `[] -> [curEnvArray[envIndex], curEnvArray]` |

**环境数组的层级语义**（`2116186` 的 `case 74`）：

```js
for (; depth > 0;) { U = U[0]; --depth; }   // 逐层向外找作用域
operandStack[++sp] = U[index];
```

⇒ **`envArray[0]` 是外层作用域**（globalState），`envArray[1]` 是 `arguments`，`envArray[2..]` 是形参。

**⚠️ 与 `52pojie-1752755` 的 `$0` / `$1` / `$2` 不是同一套下标，别混用**：
两者同属「**层级作用域数组**」模型，但**索引起点相反**——

| 说法 | 指向 | 对应关系 |
| --- | --- | --- |
| `2116186` 的 `envArray[0]` | **最外层**（globalState） | — |
| `2116186` 的 `envArray[1]` | 当前函数的 `arguments` | — |
| `2116186` 的 `envArray[2..]` | 当前函数的形参 | — |
| `52pojie-1752755` 的 `$0` | **当前函数**（本函数内定义的变量） | ↔ 当前 `envArray` **本身**（depth 0） |
| `52pojie-1752755` 的 `$1` | **上一层** | ↔ `envArray[0]`（depth 1） |

⇒ **`$0` ≈ `envArray` 自身，`$1` ≈ `envArray[0]`**。
**不要把 `$0` 当成 `envArray[0]`**——一个从「当前」起数，一个从「最外层」起数，方向正好相反。
（这也正是 `2116186` 的 `case 74` 要写 `for (; depth > 0;) U = U[0]` 逐层向外的原因。）

### 2.5 控制流（**最容易写错的一类**）

| 语义 | 条件为真 | 条件为假 |
| --- | --- | --- |
| `IrJfalse` | **弹出** cond | **不弹**，跳转 pc |
| `IrJfalsePop` | 弹出两个操作数，跳转 pc | 只弹第一个，不跳转 |
| `IrJeq` | **不弹**，跳转 pc | 弹出 cond |
| `IrJtrue` | **弹出**，**不**跳转 | **弹出**，跳转 pc |
| `IrJtruePop` | — | — 栈无变化，**无条件跳转** pc |
| `IrJmp` | **弹出**，跳转 pc | **弹出**，**不**跳转 |
| `IrCall` | `[this, func, arg1..argn] -> [func.apply(this, [args])]` | — |
| `IrRet` | 结束函数执行 | — |
| `IrThrowError` | 抛异常 | — |

> **⚠️ 命名极度误导（照名字猜必错）**：
> - `IrJtrue` 是「**假**才跳」（真时只是弹出）；
> - `IrJmp` 是「**真**才跳」。
> 两个都**总是弹出** cond，区别只在跳转条件相反。
> 把 `IrJmp` 的跳转条件写反 ⇒ 分支整体反转，而生成的代码**仍是合法 JS**（只是走了另一条路）——
> 属于最危险的一类静默错误。
>
> **陷阱**：`IrJfalse` / `IrJeq` 是「**只在一个分支上弹栈**」的。
> 把它们当成「总是弹」或「总是不弹」会让操作数栈在整个函数范围内**持续错位**，
> 而错位后生成的代码**看起来是合法 JS**（只是算错）。
> 每写一条跳转指令，都要显式回答两个问题：「**弹还是不弹**」「**真跳还是假跳**」。

---

## 3. 异常表语义（有 try/catch/finally 的 VM 必须处理）

> 来源：`2116186` 的 `handleFlowControl`。异常表每项形如 `[tryStart, catchStart, finallyStart, tryEnd]`。

VM 用一个 `stateFlag` 表示「当前是正常流还是异常流」，循环体是
`do { executeInstruction() } while (handleFlowControl())`：

| `stateFlag` | 含义 | `handleFlowControl` 做什么 |
| --- | --- | --- |
| `0` | 正常 | 继续执行 |
| `1` | `return` | 倒序查异常表；命中 try/catch 且存在 finally ⇒ `pc = finallyStart`；否则设 `pc = 返回值`、`stateFlag = 0` |
| `2` | 正常「返回结束」 | 查表；命中 try/catch 且有 finally ⇒ 跳 finally；否则**弹调用栈帧**，恢复现场 |
| `3` | 抛异常 | ① 在 try 内 ⇒ `pc = catchStart`，异常对象**入栈**，`stateFlag = 0`；② 在 catch 内 ⇒ `pc = finallyStart`；③ 都没有 ⇒ 弹栈帧，**递归** `handleFlowControl()`；④ 调用栈也空 ⇒ `throw` |

**调用栈帧保存的 8 项**（`IrCall` 时 push，返回时 pop）：

```
[bytecode, isStrictMode, exceptionTable, envArray, currentThis, pc, stateFlag, returnValueOrException]
```

**判据**：如果反编译产物里出现了「函数返回后局部变量串味」，
第一嫌疑就是**栈帧恢复漏了某项**（最常见是漏 `exceptionTable` 或 `envArray`）。
**先只支持「无 try/catch」的 VM**——没有异常表时 `stateFlag` 只会走 0/2，逻辑简单一个数量级。

---

## 4. PC 状态机与 CFG bound 合并（旁路式的核心）

> 来源：`2120914`（某音 a_bogus 旁路式还原）。

### 4.1 为什么不直接建完整状态机

完整状态机要求「知道每个分支在哪结束」，这在旁路式下**无法静态判定**。
折中方案：**执行过程中收集，只保证最小可用**。

```js
function __astBeginOpcode(pc) {
  __astCurrentPc = pc;
  __astGetBlock(pc).executed = true;
}
function __astRecordNormalExit(nextPc) {
  if (__astCurrentPc < 0) return;
  var block = __astGetBlock(__astCurrentPc);
  var lastExit = block.exits[block.exits.length - 1];
  if (!lastExit) block.exits.push({ type: 'next', to: nextPc });
}
```

**关键约束：给状态机方案加桩时，所有 opcode 都要加**（`__astBeginOpcode` + `__astRecordNormalExit`），
漏一个就会在 CFG 上留下断边。

### 4.2 每个 handler 的 AST 桩（示例）

```js
case 24:                          // 原逻辑：v[p] = typeof v[p]
  v[p] = typeof v[p];
  if (__astTypes) {
    var __astArg = __astStack[__astP];
    __astStack[__astP] = __astTypes.unaryExpression('typeof', __astArg, true);
  }
  break;

case 21:                          // 原逻辑：E = v[p--], v[p] -= E
  E = v[p--], v[p] -= E;
  if (__astTypes) {
    var __astRight = __astStack[__astP--];
    var __astLeft = __astStack[__astP];
    __astStack[__astP] = __astTypes.binaryExpression('-', __astLeft, __astRight);
  }
  break;
```

**桩是「旁路」的**：原逻辑一行不改，AST 栈另开一套（`__astStack` / `__astP`）。
这样即使 AST 侧写错，**也不会影响真实执行**——这是旁路式相对 0.2 的最大优势。

### 4.3 CFG bound 合并（把状态机压回可读代码）

**判据：一个 pc 有多个入口 ⇒ 它不是普通语句，存在控制流；单入口 ⇒ 普通语句，可合并。**

```js
// 把所有 pc 塞进 map 后排序：
//   - 多入口 ⇒ 保留为独立 case（汇合点）
//   - 单入口且只被前一条直落 ⇒ 合并进前一块
// ⚠️ 不能把存在两个入口的 case 合并
case 1788:            // flow block 1788 [z[150]] merged=1788,1789,1792,1795
  pc = 0;
  break;
```

配套：**建 CFG → 算支配树 → 找段内回边**，把块拼回 `if/else` / `while`。
`2120914` 的最终产物长这样（真实片段）：

```js
// loop header pc 639, back-edge from pc 663
while (_s0_51 === 11) {
  // block pc 647 / 661
  if (_s0_50 < _s0_19.length) { _s0_51 = _s0_18[_s0_50]; continue; } else { break; }
}
```

**已知局限（作者自述）**：合并后的**槽位与调用细节会有错误**（因为 `case 63` 这类**递归调用**
没有做映射），必须**结合运行时记录逐条比对**，或者把 CFG 产物交给 AI 结合字节码一起看。

### 4.4 递归 opcode 要单独处理

VM 内函数调用（`E = D(o[a++], s), v[++p] = E;`）在旁路式下**不展开**——
只生成一个占位空函数。要完整还原，得**用 opcode 执行记录里的 pc 回溯**，
判断「首次执行时用的是哪个栈」来建立关联。这是纯体力活，但对完整度是必需的。

---

## 5. 寄存器式 VM 的差异

| 维度 | 栈式 VM | 寄存器式 VM |
| --- | --- | --- |
| 操作数来源 | 提前压栈，指令隐含弹栈 | 指令**显式带寄存器号**（`Mov / LoadImm / MovCall`） |
| 语义表形态 | 按「栈效果」记（§2） | 按「寄存器读写」记（`r[a] = r[b] op r[c]`） |
| 反编译 | 符号执行（`jsvmp-bytecode-and-decompiler.md` §3） | 更接近三地址码，**更容易直接生成 AST** |
| 典型样本 | 某音 `bdms.js`（a_bogus） | 某 q 音乐（`52pojie-2042090`） |

**判据（一句话分辨）**：看 handler 里是 `stack.push/pop` 还是 `regs[x] = ...`。
前者栈式，后者寄存器式。寄存器式的指令表通常更规整，**优先做纯静态生成器（0.1）**。

---

## 6. AI 辅助（分而治之）

> 来源：`52pojie-2027657`、`2116186`、`2120914`。

**核心方法：把一个大的逆向流程，不断拆分成很多个小流程，逐个交给模型。**

实操要点：

1. **先给出「已经确定的流程骨架」**（哪几段拼成结果、每段的长度特征），再让模型补细节。
2. **日志/CFG 产物直接贴给模型**，要求它「**结合字节码和 CFG 产物**」输出代码，
   而不是凭空生成（`2116186` 明确这么做）。
3. **模型产出的每一段都要能对拍**——用日志里的真实中间值验证，不要只看「看起来对」。
4. 反编译产物（半成品）**交给模型做「结构整理」比让它做「语义还原」更可靠**。

**边界**：模型不擅长「从零读 400 行 VM 解释器」，
擅长「给一段 20 行字节码 + 语义表，写出等价 JS」。**拆分的粒度决定了成败。**

---

## 7. vmp 套 vmp（嵌套 VM）

> 来源：`52pojie-2030247`（某 d 的 `_fingerprint`）。

**形态**：外层 VM 的某个 opcode 里，又加载了一个内层 VM（`$_ts` 式的双层结构；
瑞数系的 `36` 号 PC 寄存器与 `336` 号内层 PC 寄存器是同类设计，
见 `../../web-js-env-patcher/references/ruishu-vmp-structure.md`）。

**处置顺序（不要跳步）**：

1. **先只还原外层**，把内层当成一个黑盒函数（插桩记录它的入参/返回值）。
2. 内层的入参往往就是**外层拼好的短串**——先做「**短串分析**」：
   这个短串由哪几段拼成、每段是常量还是环境值。
3. 确认内层**是否与某个已知算法同构**（对比 `_fingerprint` 这类参数的历史版本）。
4. 内层确实需要还原时，**独立建一个工程**（不要和外层混在一个反编译器里）。

**判据**：如果外层插桩日志里出现「一段看不懂的乱码被喂给一个函数，然后直接成了最终结果」，
大概率是嵌套 VM，先按 §7 第 2 步做短串分析，不要急着展开内层。

---

## 8. 反例黑名单

- **不要在没做 CFG 的情况下猜插桩点。** CFG 是插桩的地图，先出图再插桩。
- **不要把 `IrJfalse` 当成「总是弹栈」。** 单分支弹栈写错 ⇒ 栈在函数范围内持续错位，产物仍是合法 JS（§2.5）。
- **不要假设操作数一定在栈上。** `IrConvertByteCodeNumber` / `IrSetPropKeyFromByteCodePop` 的操作数在字节码里。
- **不要在没有异常表处理的情况下声称支持 try/catch。** 先只做无异常表的 VM（§3）。
- **不要在旁路式里只给部分 opcode 加桩。** 漏一个就留断边（§4.1）。
- **不要把「多入口的 case」合并进前一块。** 那是控制流汇合点，合并后语义错（§4.3）。
- **不要把递归 opcode 当成普通调用展开。** 需要先用执行记录回溯建立关联（§4.4）。
- **不要内外层 VM 混在一个反编译器里。** 嵌套 VM 分工程做（§7）。
- **不要指望 CFG 产物直接可用。** 它是半成品，槽位与调用细节需要运行时比对修正。

---

## 9. 复跑

```bash
cd <仓库根>    # 本仓库无固定安装路径：cd 到你 clone 出来的 jsreverse 根目录

# 纯静态解剖 VM 骨架（提取 while-switch / index-dispatch、字节码来源、指令表空洞）
node -r ./artifacts/skill-evolution/tools/node-resolve-preload.js \
  .claude/skills/ast-deobfuscation/scripts/analyze-jsvmp-vm.js \
  artifacts/tiktok/webmssdk.js --json

# 跨版本稳定的助记符表（详细用法见 jsvmp-bytecode-and-decompiler.md §2）
node .claude/skills/ast-deobfuscation/scripts/jsvmp-mnemonic-table.js \
  --input artifacts/tiktok/webmssdk.js --out artifacts/skill-evolution/jsvmp-mnemonics.json --min-size 100

# 插桩（三层）与常量识别
node .claude/skills/ast-deobfuscation/scripts/jsvmp-instrument.js --selftest
node .claude/skills/ast-deobfuscation/scripts/crypto-signature-id.js --selftest
```
