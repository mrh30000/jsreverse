# JSVMP 字节码与反编译器（助记符表 / 符号执行 / 控制流还原）

> 本文解决的是 `jsvmp-deobfuscation.md` 里"插桩硬看日志"之上的**更高一档做法**：
> 不跑日志，直接把 VM 的字节码**翻译回可读 JS**。
>
> 先读 `jsvmp-deobfuscation.md` 建立 VM 结构认知，再读这里。

---

## 0. 先做判据：跑日志 vs 写反编译器

| 情况 | 走哪条路 | 成本 |
| --- | --- | --- |
| 只需拿到**一个常量/一个公式**（如某个 key、某个派生） | 插桩打日志，硬看；日志太多就 push 到数组里最后一次性 dump（直接 `console.log` 会卡死） | 低 |
| 需要理解**控制流/数据结构**（如环境检测的判定链、某个编码器的完整实现） | **写反编译器** | 高，但一次性 |
| 只需**跑出结果**而不需要读懂 | 补环境（`web-js-env-patcher`），不碰 VM | 最低 |
| 同上，但目标有强环境检测 | 补环境 + 定点绕过检测点（`../../web-js-env-patcher/references/high-strength-browser-detection.md`） | 中 |

**判据：如果目标是"读懂"，就不要硬看四万行日志。** 反编译器的投入会在第二个 VM 上回本
（指令集不同，但骨架方法完全一样，见 §4）。

---

## 1. VM 的三种形态（先认形态，再决定怎么读）

| 形态 | 判据 | 例 | 读法 |
| --- | --- | --- | --- |
| **A. 巨数组 + 索引调用** | 一个长度上万、混着数字与函数的数组；`h.length = R[c++]` 这类"从数组里取长度/取数据"的指令；`__TENCENT_CHAOS_VM(pc, codes, stack)` 入口 | 腾讯防水墙 TDC.js | §2 助记符表 + §3 反编译器 |
| **B. 纯 `switch` 分发** | `while(true){ switch(opcodes[pc++]) { case 0: ... } }`，无函数数组 | 常见自研 VM | 直接提 opcode 语义（`scripts/analyze-jsvmp-vm.js`） |
| **C. 字节码是 base64/hex 字符串** | 一段长 base64 + 一段数组，两者解码后拼成字节码 | 腾讯（"里面有**一大段 base64 编码的字符串，以及一个大数组，这两个最终会解码成一个大数组**"） | 先跑自执行函数拿字节码，不必自己写解码 |

**形态 A 的两个必知特征**：

1. **数组里混着"指令函数"和"纯数据"**。`R[1]` 可能是栈长度、`R[3]` 可能是函数表索引。
   → 所以**不能假设 `codes[pc]` 一定是 opcode**，要按指令自身的语义去解释操作数。
2. **数组里可能有空洞（`,` `,`）**。空槽是真实存在的干扰项，会让序号偏移。
   → 必须把 `hole`（空槽）与 `empty`（`function(){}` 空体）**分开处理**，混为一谈会让控制流整体错位。

---

## 2. 第一步：助记符表（把"序号"换成"不变量"）

### 2.1 为什么必须做

腾讯的指令数组**每次请求都会被打乱重排**，数组变量名也会变（这次 `w`、下次 `Q`）：

```js
// 这一次
I[I.length - 2] = I[I.length - 2] + I.pop();
// 下一次（同一动作，序号与变量名都变了）
Q[Q.length - 2] = Q[Q.length - 2] + Q.pop();
```

所以**按序号识别指令会立刻失效**。必须先做一次"变量名归一化"：

```
I[I.length - 2] = I[I.length - 2] + I.pop();
        ↓ 归一化（标识符 → #）
#[#.# - 2] = #[#.# - 2] + #.#();
Q[Q.length - 2] = Q[Q.length - 2] + Q.pop();
        ↓ 归一化（得到**完全相同**的字符串）
#[#.# - 2] = #[#.# - 2] + #.#();
```

归一化后，同一动作在任何一次混淆产物里都得到**同一个助记符**，于是可以建
「助记符 → 语义」映射表，反编译器只认这张表，不再关心序号。

**⚠️ 归一化必须按 token 类型做**（字符串、注释、数字、关键字原样保留），
不能用正则直接替换全文件——否则字符串字面量也被改，会制造"假差异"。
（本技能建立时踩过这个坑：夹具用正则改名 → 字符串 `/[^\r\n]/` 里的 `\r` 被改写 →
1 条助记符不一致。**那次的差异来自夹具，不是工具。**）

### 2.2 工具

```bash
# 抽助记符表
node scripts/jsvmp-mnemonic-table.js --input tdc.js --out mnemonics.json
node scripts/jsvmp-mnemonic-table.js --input tdc.js --pretty            # 打印每条指令的助记符
node scripts/jsvmp-mnemonic-table.js --input tdc.js --min-size 20       # 指令数组长度门槛

# 跨抓取比对：两次抓的 VM 指令语义是否一致（→ 助记符表能否复用）
node scripts/jsvmp-mnemonic-table.js --diff a.json b.json
```

输出三态分开统计，**这个区分很重要**：

| 状态 | 含义 | 处理 |
| --- | --- | --- |
| `hole` | 数组里就是空的（`,` `,`） | 序号占位，**不是指令**，不产生助记符 |
| `empty` | `function(){}` 空体 | **是合法指令**（no-op），可能被执行 |
| `instruction` | 正常指令 | 进映射表 |

### 2.3 已实测的量化结论（本仓库真实样本）

对 `artifacts/tiktok/webmssdk.js`（某音 webmssdk，真实混淆产物）：

| 指标 | 值 |
| --- | --- |
| 指令数组长度 | 365 |
| 空洞 / 空体 | 0 / 0 |
| 去重后助记符种类 | 359 |
| **重排 + 改名后**，助记符集合是否完全一致 | **是（359/359，共有 359 条）** |
| 同位置助记符相同数（重排前 vs 后） | **0 / 365**（证明序号确实全变了） |

复现命令见本文 §6；夹具生成器：
`artifacts/skill-evolution/tools/make-jsvmp-cross-version.js`（确定性洗牌，固定种子 `20260921`）。

**结论**：助记符表对「重排 + 改名」完全免疫（359/359），而对序号完全敏感（0/365）。
这正是它作为标识符的价值所在。

**去重后 359 < 365 的含义**：有指令**语义完全相同**（如多条 `#.#[#] = #` 形态的赋值只在操作数上不同，
但操作数是运行时从栈上取的，不进助记符）。这不是信息丢失——语义相同的指令本来就该映射到同一个助记符。

---

## 3. 第二步：写反编译器（符号执行）

### 3.1 核心思路（两句话）

1. **栈上不放假值，放 AST 节点**：`Stack.push({type:'Literal', value:1})`，而不是 `Stack.push(1)`。
2. **不计算结果，生成对应的 AST**：遇到加法，弹出两个 AST 节点，压回一个 `BinaryExpression`。

说白了就是：**把 VM 的执行过程"全套一层 AST"**。

### 3.2 状态对象

分支探索与函数调用都需要"保存现场 + 复制一份"，所以要有状态类：

```js
class VMState {
  constructor(PC, Stack, ErrCB, VARCount = 0) {
    this.PC = PC;
    this.Stack = Stack;      // 混合栈：既是作用域内存，又是操作数栈
    this.ErrCB = ErrCB;      // 异常栈：try/catch 的跳转表
    this.VARCount = VARCount;
    this.ASTs = [];          // 累积"可能是完整语句"的 AST 节点
  }
  Copy() { return new VMState(this.PC, [...this.Stack], [...this.ErrCB], this.VARCount); }
  GetVARName() { return 'v' + this.VARCount++; }
}
```

### 3.3 这个 VM 最难理解的两处（理解了就能写反编译器）

#### (1) 变量被包在 BOX 里

```js
Stack[index] = [ value ]     // 不是 Stack[index] = value
```

**为什么**：函数调用时会**复制栈**。如果变量直接以值的形式存，函数内部改了变量，外部拿不到更新值。
包一层数组（BOX）就能做引用传递。

由此派生出四条指令：

| 语义 | 实现 |
| --- | --- |
| 变量声明（`var x`，提前占位） | `Stack[Z] = Stack[Z] === undefined ? [] : Stack[Z]` |
| 创建变量引用（**注意不创建数字变量**） | `Stack.push([Codes[PC++]])` —— 把**索引**包起来压栈 |
| 读变量 | `Stack.push(Stack[Codes[PC++]][0])` —— 双层取值，取出 BOX 里的真值 |
| 按引用赋值 | `Stack[Stack[Stack.length-2][0]][0] = Stack[Stack.length-1]` |

#### (2) 成员引用也是一个数组

`obj.prop` 不压 `prop` 的值，而是压一个**两元素数组**：

```js
Stack.push([Object, PropertyName])
```

| 语义 | 实现 |
| --- | --- |
| 创建成员引用 | `Stack.push([Stack.pop(), Stack.pop()].reverse())` |
| 读成员引用 | `var Z = Stack.pop(); Stack.push(Z[0][Z[1]])` |
| 给成员引用赋值（**不 pop**，与 `AssignmentExpression` 行为一致） | `Z = Stack[Stack.length-2]; Z[0][Z[1]] = Stack[Stack.length-1]` |
| 链式访问 `a.b.c` | 弹出新属性 `c` 与原引用 `[a,b]`，压入 `[l[0][l[1]], Z]` |
| 函数调用（MemberExpression → CallExpression） | `Stack.push(Z[0][Z[1]].apply(Z[0], args))` —— **以 `Z[0]` 为 this** |

### 3.4 `used` 标记：区分"中间产物"与"完整语句"

**问题**：栈上的 AST 节点可能是计算中间产物（没人会单独算一个加法然后用它的值），
也可能是完整语句。同一个节点在两种角色里都存在，无法直接分辨。

**做法**：把所有"可能是最终语句"的节点同时放进 `State.ASTs`（**与栈中是同一个 Object 引用**）。
执行过程中一旦某节点被当作值使用，就打上 `used` 标记。最后只输出**未被使用**的节点——它们才是每行的根节点。

```
ThisIsAVar = ThisIsAFun()   // 先压 CallExpression，再压 AssignmentExpression
        ↓ 无 used 标记时（错）
ThisIsAFun()
ThisIsAVar = ThisIsAFun()
        ↓ 有 used 标记时（对）：CallExpression 被赋值用了 → 标记 used → 从 ASTs 清理
ThisIsAVar = ThisIsAFun()
```

**注意**：给节点打标记时用的是**同一个 Object 引用**，所以 `Stack` 与 `State.ASTs` 必须共享对象，
不能深拷贝——否则标记不会生效。这是最容易写错的一处。

### 3.5 控制流还原

前提假设（**也是已知局限**）：`While` 循环被编译成这个形状。

```
Loop:
; ... 条件代码 ...
JZ  LoopEnd
; ... 循环体 ...
JMP Loop
LoopEnd:
```

还原方法：**遇到 `JMP` 向上跳、且目标 PC 已访问过**，就断定这是循环回边；
把 `ASTs` 里从最近的 `IfStatement` 开始到栈顶的节点整段弹出，重组成 `WhileStatement`。

```js
// 有条件跳转 → IfStatement（并把条件节点标记 used）
Expr = { type:'IfStatement', test: Stack[Stack.length-1], consequent: Block(ProcessBlock(S1)), alternate: null }

// JMP 向上跳 + 已访问 + ASTs 里有 IfStatement → 转 WhileStatement
if (i < Z && this.Visited.has(i) && State.ASTs.some(X => X.type === 'IfStatement')) {
  let Expr = State.ASTs.pop();
  const Exprs = [Expr];
  while (Expr.type !== 'IfStatement') { Expr = State.ASTs.pop(); Exprs.push(Expr); }
  Expr = Exprs.pop();
  State.ASTs.push({ type:'WhileStatement', test: Expr.test, body: Block(Exprs.reverse()) });
  State.ASTs = State.ASTs.concat(Expr.consequent.body);
}
```

**已知未覆盖**（写反编译器时要显式声明，别假装支持）：
`break` / `continue` / `do-while` / 带 `label` 的跳转 / `finally` 语义。
这些需要在 `while` 之外单独建结构，第一版可以先抛"未支持"而不是静默生成错的控制流。

### 3.6 函数还原

函数在字节码里带三类操作数：入口 PC、参数表、被捕获的外部变量表。

```js
// 形参：把 B 里的索引位置映射成 a1 / a2 ...
for (let l = 0; l < B.length; l++) if (B[l] > 0) Z[B[l]] = { type:'Identifier', name:'a' + ++co };

// 复制现场并递归
const S1 = State.Copy(); S1.Stack = Z; S1.PC = entryPC;

// 栈布局（由 VM 的调用约定决定）：
//   Z[0] = this
//   Z[1] = arguments
//   Z[2] = 函数自身（多数情况会被直接覆盖占用）
```

两个坑：

- **递归要有 `Visited` 保护**。同一个函数体可能被多次进入，第二次进入时不该再次展开
  （否则无限递归）。用 `Visited.add(i)` / `Visited.delete(i)` 把"正在展开"与"已展开"分开。
- **形参个数按"最多参数"处理**。真实 VM 里会有 `< arguments.length` 的上限判断，
  反编译器侧可以放宽到最多参数——**放宽不会生成错的代码，只会多生成未使用的形参**，
  比收紧导致漏形参安全。

### 3.7 让指令数组变得可读（预处理）

巨数组里混着 `,,` 空洞、且数组形式看不出索引。用 Babel 把它转成对象字面量
（`elements[idx]` → `{idx: fn}`），空洞自然消失、索引显式可见：

```js
traverse(ast, {
  ArrayExpression(path) {
    if (path.node.elements.length <= 10) return;
    const properties = path.node.elements
      .map((el, idx) => (el === null ? undefined : t.objectProperty(t.numericLiteral(idx), el)))
      .filter(Boolean);
    path.replaceWith(t.objectExpression(properties));
  },
});
```

**注意**：转成对象后空洞**从语法上消失了**（`{0:fn, 2:fn}`），索引信息仍在 key 里。
如果后续要按"槽位序号"做控制流计算，**必须用 §2 的分类结果而不是对象 key**
（对象 key 与数组下标在有空洞时会错位）。

---

## 4. 换一个 VM 要改什么（迁移成本评估）

| 部件 | 是否可复用 | 说明 |
| --- | --- | --- |
| 助记符表工具 | ✅ 完全复用 | 判据与归一化与站点无关 |
| 状态类 / 符号执行骨架 | ✅ 完全复用 | `VMState` / `used` 标记 / 分支探索 |
| 栈约定（BOX / 成员引用） | ⚠️ 大概率同类 | 这是"栈式 VM 的常见设计"；换成寄存器 VM 要重写 |
| 指令语义映射 | ❌ 必须重标定 | 这是唯一真正费时的部分，但**只需按助记符逐条填一次** |
| 控制流还原 | ⚠️ 形状假设需验证 | 先确认目标编译器产出的循环形状再套 §3.5 |

**判据**：如果目标 VM 的数组里能抽出 ≥ 50 条不同助记符，且助记符跨两次抓取稳定 → 值得写反编译器。
否则（指令太少、或每次彻底不同）→ 走插桩日志。

---

## 5. 反例黑名单

- **不要按序号识别指令。** 腾讯的指令数组每次重排，序号无意义。
- **不要用正则做助记符归一化的改名。** 会改到字符串字面量，制造假差异；必须按 token 类型。
- **不要把空洞当空体指令。** `,` `,` 是干扰项，算进序号会让整个控制流错位。
- **不要深拷贝栈上的 AST 节点。** `used` 标记依赖对象引用共享，拷贝了就失效。
- **不要声称支持 `break`/`continue`/`finally`**，第一版应当显式抛"未支持"。
- **不要跳过 VM 结构分析直接写反编译器。** 先把"哪些是数据、哪些是指令"分清（`§1` 的两个特征），
  否则会把 `R[1]`（栈长度）当成 opcode。
- **不要在需要"跑出结果"时写反编译器。** 补环境的成本低一个数量级（见 `§0` 判据表）。

---

## 6. 复跑

```bash
cd <仓库根>    # 本仓库无固定安装路径：cd 到你 clone 出来的 jsreverse 根目录

# 1) 助记符表工具自检（31 项，含跨版本不变量断言）
node .claude/skills/ast-deobfuscation/scripts/jsvmp-mnemonic-table.js --selftest

# 2) 真实样本抽表（artifact:artifacts/tiktok/webmssdk.js, 365 条指令）
node .claude/skills/ast-deobfuscation/scripts/jsvmp-mnemonic-table.js \
  --input artifacts/tiktok/webmssdk.js \
  --out artifacts/skill-evolution/jsvmp-run-20260921-0900/webmssdk-mnemonics.json --min-size 100

# 3) 生成"跨版本"夹具（重排 + 按 token 改名）
node artifacts/skill-evolution/tools/make-jsvmp-cross-version.js

# 4) 抽夹具的助记符表并比对（期望：完全一致）
node .claude/skills/ast-deobfuscation/scripts/jsvmp-mnemonic-table.js \
  --input artifacts/skill-evolution/jsvmp-run-20260921-0900/webmssdk-shuffled-renamed.js \
  --out artifacts/skill-evolution/jsvmp-run-20260921-0900/shuffled-mnemonics.json --min-size 100
node .claude/skills/ast-deobfuscation/scripts/jsvmp-mnemonic-table.js --diff \
  artifacts/skill-evolution/jsvmp-run-20260921-0900/webmssdk-mnemonics.json \
  artifacts/skill-evolution/jsvmp-run-20260921-0900/shuffled-mnemonics.json
# 期望输出：A 359 条 / B 359 条 / 共有 359 条 / 完全一致 / exit 0
```