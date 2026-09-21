---
title: "一文速通控制流平坦化"
source: "https://mp.weixin.qq.com/s?__biz=MzkxNzcwMzIyMw==&mid=2247484812&idx=1&sn=391df6a4af9fafc439b73584784cafc4&poc_token=HGX2pGqj6SpwI_gKQpE_w3G2FFaAwPT62eyZW3wN"
author:
  - "[[小小杨学编程]]"
published:
created: 2026-09-12
description: "一文速通控制流平坦化"
tags:
  - "clippings"
---
小小杨学编程 小小杨学编程 *2026年9月11日 12:17*

前言：

本文通过个人想法基础结合AI生成文章，讲述不对的地方多多担待指正

这不是一篇“把 case 按顺序拼起来”的文章。本文要解决的是：面对单层或多层 JavaScript 控制流平坦化，怎样找到真正的状态机，怎样恢复每一条边，怎样把 CFG 重新变成 if、while、break、continue，以及怎样证明改写没有悄悄改变 JavaScript 语义。

控制流平坦化（Control Flow Flattening，CFF）最迷惑人的地方，不是代码“乱”，而是它把源码中的结构信息搬走了。

原来的源码靠缩进和语句位置表达控制关系：

```javascript
prepare();    if (ready()) {  run();} else {     fallback();  }   finish();
```

平坦化之后，语句位置不再等于执行顺序。真正的顺序藏在状态值和跳转边里：

```perl
let state = 0x31;while (state !== 0xff) {      switch (state) {    case 0x31:      prepare();      state = ready() ? 0x72 : 0x19;      break;    case 0x72:      run();      state = 0x44;      break;    case 0x19:      fallback();      state = 0x44;      break;
case 0x44:      finish();      state = 0xff;      break;        }      }
```

因此，CFF 解混淆的本质不是文本整理，而是一次逆向编译：

```objectivec
识别真实调度器          ↓      恢复状态及其转移          ↓      把 case 提升为基本块和边          ↓      构造 CFG          ↓      按条件归约顺序、分支、循环和共享区域          ↓      重新发射自然 JavaScript          ↓      做静态检查与行为差分
```

整条流程里，最重要的一句话是：

节点里是动作，边上才是控制流。

---

## 1\. 什么是控制流平坦化

## 1.1 混淆器如何把结构变成状态机

一段结构化程序通常包含四类控制关系：

1. 顺序执行；
2. 条件分支；
3. 循环回边；
4. return、throw、break、continue 等提前完成。

控制流平坦化通常先把函数切成基本块，再把块之间的边编码为状态更新，最后让所有块回到一个统一调度器。

例如：

```nginx
function normalize(x) {  let value = x * 2;
  if (value > 10) {    value -= 3;  } else {    value += 4;  }
  return value;}
```

可以被改造成：

```javascript
function normalize(x) {  let state = 7;  let value;
  while (true) {    switch (state) {      case 7:        value = x * 2;        state = value > 10 ? 41 : 23;        break;
      case 41:        value -= 3;        state = 88;        break;
      case 23:        value += 4;        state = 88;        break;
      case 88:        return value;    }  }}
```

这里：

- 状态 7 是入口块；
- 7 到 41/23 是条件边；
- 41 和 23 都到 88，形成公共汇合；
- 88 是 Return 终结块；
- case 在文件中的排列顺序完全可以任意打乱。

所以，手工分析时不要写“case 7 后面是 case 41”，而要写：

```apache
B7:  action: value = x * 2  terminator: Branch(value > 10, B41, B23)
B41:  action: value -= 3  terminator: Jump(B88)
B23:  action: value += 4  terminator: Jump(B88)
B88:  terminator: Return(value)
```

从这一刻开始，case 的文本外观才被转换成可推理的控制流。

---

## 1.2 识别调度器必须回答的九个问题

不要一看到 while + switch 就认定是混淆。协议解析器、业务流程、虚拟机、async/generator 转译代码也可能长得一样。

真正开始改写前，至少回答以下九个问题。

### 1\. 调度循环的真实入口是什么

检查：

- 状态变量在哪里初始化；
- 是进入循环前初始化，还是由参数、闭包或属性提供；
- 是否允许从多个状态进入；
- 外层还有没有包装函数或前置分支；
- 是否存在异常入口、恢复入口或外部跳入。

如果入口可能是 B 或 C，那么后续 B↔C 即使构成环，也未必能还原成一个从 B 开始的 while。

### 2\. 循环 test 和 update 做了什么

最简单的是：

```perl
while (state !== END) {  switch (state) {    // ...  }}
```

但也可能是：

```perl
for (; audit(state), state !== END; tick++) {  switch (decode(state)) {    // ...  }}
```

每次调度都可能发生：

- audit(state)；
- tick++；
- decode(state)；
- getter、Proxy 或类型转换；
- try/finally 清理。

如果把两轮调度合并成一段顺序代码，就会减少这些动作的执行次数。

因此，必须先证明调度过程不可观察；证明不了，就把这些动作显式保留到 CFG 的边上。

### 3\. switch 判别式到底是什么

判别式可能不是状态变量本身：

```javascript
switch ((state ^ key) & 0xff) {  // ...}
```

也可能是：

```css
switch (table[index++]) {    // ...   }
```

还可能是包装调用：

```javascript
switch (nextState(machine)) {  // ...   }
```

要记录判别式的：

- 求值次数；
- 求值顺序；
- 副作用；
- 异常；
- 返回值域；
- 与完整状态的关系。

JavaScript 的 switch 判别式只求值一次，case 表达式按顺序搜索，匹配使用严格相等，default 的位置也可能影响后续 fallthrough。把它改成随意排序的 if 链，可能改变行为。

### 4\. 状态由什么表示

常见状态表示至少有六种：

| 状态形态 | 需要恢复的内容 |
| --- | --- |
| 数字或字符串 | 初值、全部写点、候选目标、default |
| 数组调度序列 | 序列内容、索引更新、越界、中途修改 |
| 位编码状态 | 位宽、符号转换、掩码、高低位约束 |
| 多变量状态 | 元组约束、字段写入顺序、别名 |
| 查表或函数计算 | 表是否可变、计算是否有副作用、未知目标 |
| 对象属性状态 | getter/setter、Proxy、别名和外部观察 |

不要假设状态一定连续，也不要因为 case 标签是整数，就用 for (i = 0; i < n; i++) 枚举。

### 5\. 状态 binding 是哪个

必须按词法绑定追踪，而不是按变量名搜索。

```javascript
let state = 1;
function inner() {  let state = 9;  return state;}
```

这两个 state 没有任何关系。

同理：

```cs
machine.state = 1;const alias = machine;alias.state = 2;
```

属性状态还涉及别名。若对象可能经过 Proxy，读取和写入本身也是可观察动作。

使用 Babel 时，应通过 scope/binding API 确定引用；不要用正则替换所有同名标识符。

### 6\. 状态所有写点在哪里

需要找到：

- 直接赋值；
- 复合赋值；
- 自增自减；
- 解构赋值；
- 函数调用中的别名写入；
- 表项或属性写入；
- eval/with 等动态边界。

如果写点不完整，得到的目标集合就不完整。此时必须保留未知边，而不是删除 default 或新增一个自作主张的 throw。

### 7\. 每个 case 怎样真正离开

case 的结束不一定等于 break：

- 可能 fallthrough 到下一个 case；
- 可能 return/throw；
- 可能 continue 外层循环；
- 可能 break 外层标签；
- 可能在 try/finally 中产生 pending completion；
- 可能 await/yield 挂起；
- 可能进入嵌套 switch，而其中的 break 只退出内层 switch。

必须解析真实控制容器。看到一个 break，先问它退出谁，而不是默认“回 dispatcher”。

### 8\. 状态写入之后还有什么

这是 CFF 解混淆中最常见的致命错误。

```perl
state = NEXT;observe(state);cleanup();break;
```

错误做法是在赋值处立即生成 Jump(NEXT)。

原执行顺序实际上是：

```javascript
写 state→ observe→ cleanup→ break 当前 switch→ 外层循环 update→ 外层循环 test→ 再次计算 switch 判别式→ 进入 NEX
```

所以，“状态赋值”只是为下一轮调度准备数据，不等于当前控制流已经转移。

正确的 Lift 必须先保留赋值之后的语句，再在真实重新调度点建立边。

### 9\. 它真的是可以删除的混淆调度吗

下面几类结构要谨慎：

- 业务状态机：状态本身就是业务数据；
- VM 解释器：每个 case 是一条指令；
- generator/async 恢复状态机：有 next/throw/return 或 fulfill/reject 入口；
- 解析器：状态与输入位置共同决定语义；
- 事件循环或协议循环：每轮调度本身有业务效果。

识别 CFF 要依赖完整数据流和运行证据，而不是变量名像 \_0x1234 或形状像 while(true)。

---

## 1.3 完整实战：恢复 while、continue 和 break

下面用一个比“顺序拼接”更接近实战的例子，完整走一遍。

### 1\. 混淆代码

```javascript
function sumUntil(items, limit) {  let state = 0x71;  let index = 0;  let total = 0;  let value;
  while (state !== 0xff) {    switch (state) {      case 0x71:        state = index < items.length ? 0x24 : 0x90;        break;
      case 0x24:        value = items[index];        state = value == null ? 0x51 : 0x35;        break;
      case 0x51:        index++;        state = 0x71;        break;
      case 0x35:        total += value;        state = total > limit ? 0xa2 : 0x63;        break;
      case 0x63:        index++;        state = 0x71;        break;
      case 0xa2:        state = 0xff;        break;
      case 0x90:        state = 0xff;        break;
      default:        throw new Error("bad state: " + state);    }  }
  return total;}
```

这段代码的业务含义并不复杂，但不能靠 case 排列直接得到。

### 2\. 先提取状态表

| 块 | 动作 | 终结转移 |
| --- | --- | --- |
| B71 | 无 | `index < items.length ? B24 : B90` |
| B24 | `value = items[index]` | `value == null ? B51 : B35` |
| B51 | `index++` | B71 |
| B35 | `total += value` | `total > limit ? BA2 : B63` |
| B63 | `index++` | B71 |
| BA2 | `state = 0xff` | dispatcher exit |
| B90 | `state = 0xff` | dispatcher exit |

这里要注意：BA2 和 B90 虽然业务动作为空，但从它们进入 0xff 之前，原程序仍会再执行一次外层循环 test。

在本例中 test 只是本地变量的纯比较，state 也不被外部观察，因此这一步可消去。若 test 是 audit(state), state!== 0xff，就不能直接跳过。

### 3\. 画出 CFG

```javascript
false                    ┌──────────────→ B90 → EXIT                    │                  B71                    │ true                    ↓                  B24             null  /   \ non-null                 ↓     ↓               B51    B35                 │    /  \                 │   /    \ total > limit                 │  ↓      ↓                 │ B63    BA2 → EXIT                 │  │                 └──┴──────────────→ B71
```

现在可以识别出：

- B71 是循环头候选；
- B51→B71 和 B63→B71 是两条 latch/back edge；
- B71 的 false 边是正常循环退出；
- B35 的 true 边是循环体内提前退出；
- B24→B51 是一条跳过求和的 continue 路径；
- B24→B35→B63 是普通循环体路径。

### 4\. 用支配关系确认自然循环

只看 SCC 还不够。要确认 B71 是否支配所有回边来源。

定义：

```js
Dom(entry) = {entry}    Dom(n) = {n} ∪ 交集 Dom(p)，p 属于 Pred(n)
```

迭代到固定点后，如果 H 属于 Dom(L)，那么 L→H 才是自然循环回边候选。

在本例中：

- 任何从函数入口到 B51 的路径都经过 B71；
- 任何从函数入口到 B63 的路径也都经过 B71；
- 区域外没有直接进入 B24、B35、B51、B63 的侧入口。

因此，B71 可以作为单入口自然循环 header。

从每个 latch 逆向收集前驱，得到循环成员：

```ini
Loop = {B71, B24, B51, B35, B63}
```

B90、BA2 和 EXIT 不属于循环体。

### 5\. 先恢复循环内部的分支

B24 的逻辑是：

```perl
value = items[index]if value == null:    index++    回 B71else:    去 B35
```

回到 B71 等价于开始下一轮，因此可写成：

```perl
value = items[index];
if (value == null) {  index++;  continue;}
```

B35 和 B63 的逻辑是：

```bash
total += valueif total > limit:    离开循环else:    index++    回 B71
```

可写成：

```bash
total += value;
if (total > limit) {  break;}
index++;
```

这里不能把 index++ 放到公共尾部，因为提前 break 的路径原本不会执行它。

### 6\. 恢复循环头

B71 每轮先判断：

```diff
index < items.length
```

false 时正常退出，true 时进入体。因此可形成：

```perl
while (index < items.length) {  // B24/B51/B35/B63}
```

组合后得到：

```perl
while (index < items.length) {  // B24/B51/B35/B63}
```

### 7\. 最后再做可选美化

value 没有在循环外使用，可以缩短作用域：

```javascript
function sumUntil(items, limit) {  let index = 0;  let total = 0;
  while (index < items.length) {    const value = items[index];
    if (value == null) {      index++;      continue;    }
    total += value;
    if (total > limit) {      break;    }
    index++;  }
  return total;}
```

但不要急着改成 for：

```perl
for (let index = 0; index < items.length; index++) {  // ...}
```

因为原逻辑在 value == null 时会 index++，普通路径也会 index++，而提前 break 不会。这个例子可以安全改写，但只有在确认所有 continue 都经过 update、所有 break 都跳过 update、闭包绑定也不变之后，for 才只是美化。

恢复 while 是控制流归约；改成 for 是后处理。不要把两步混在一起。

---

## 2\. 多层 switch 压缩成一层的原理

## 2.1 压缩的本质：把路径条件合成为完整状态

多层 switch 不是简单地“套了几层 case”，而是把完整状态 S 拆成多个判别字段。假设外层读取 f(S)，内层读取 g(S)，那么执行到外层 case A、内层 case B，意味着：

```ini
K = (f(S) === A) ∧ (g(S) === B)
```

压缩一层的核心就是求解约束 K：

- K 唯一确定 S：生成一个单层状态；
- K 对应多个 S：生成状态集合或状态分区；
- K 无法求解：保留符号约束或 Indirect；
- 内层条件与 S 无关：它通常是业务条件，继续保留。

所以，正确方法不是把内外 case 标签相加，而是沿真实执行路径累计约束。

## 2.2 一个双层位编码的完整推导

假设状态低两位作为外层路由，高位作为内层路由：

```javascript
let state = 21;
dispatch:while (state !== 255) {  const low = state & 3;  const high = state >>> 2;
  switch (low) {    case 0:      switch (high) {        case 1:          onFalse();          state = 255;          continue dispatch;      }      break;
    case 1:      switch (high) {        case 2:          onTrue();          state = 255;          continue dispatch;        case 5:          prepare();          state = 14;          continue dispatch;      }      break;
    case 2:      switch (high) {        case 3:4
          continue dispatch;      }      break;  }
  throw new Error("unknown state");}
```

在 state 已按相应 32 位无符号语义处理的前提下：

```ini
low  = state mod 4high = floor(state / 4)state = low + 4 × high
```

逐个叶子求解：

| low | high | 完整状态 |
| --- | --- | --- |
| 0 | 1 | 4 |
| 1 | 2 | 9 |
| 1 | 5 | 21 |
| 2 | 3 | 14 |

因此可以先压成单层：

```javascript
while (state !== 255) {  switch (state) {    case 21:      prepare();      state = 14;      break;    case 14:4
      break;    case 9:      onTrue();      state = 255;      break;    case 4:      onFalse();      state = 255;      break;    default:      throw new Error("unknown state");  }}
```

对应单层 CFG：

```nginx
B21 → B14B14 ─true→ B9 → EXIT    └false→ B4 → EXIT
```

继续做节点归约，才得到：

```javascript
prepare();
if (flag) {  onTrue();} else {  onFalse();}
```

这里必须区分两个阶段：

1. 多层 switch 压成单层，恢复“完整状态到基本块的映射”；
2. 单层状态机恢复 if/while，恢复“基本块之间的自然结构”。

## 2.3 通用压缩算法

```markdown
输入：初始状态或入口约束 K
1. 按原顺序计算循环 test、解码字段和判别式2. 模拟 switch 的真实 case 搜索顺序3. 每命中一层路由，就把条件加入 K4. 专门化继续参与调度的内层 switch/if/三元5. 普通业务动作原样记录6. 状态写入只更新抽象环境，不立即 Jump7. 到达真实重新调度点时生成 Jump/Branch/Indirect8. 将新目标加入可达状态工作队列9. 重复到没有新状态，或遇到无法求解的目标
```

应从真实入口沿转移做可达闭包，不要枚举所有字段的笛卡尔积。动态轨迹可以证明某个状态确实出现过，但不能证明未出现的状态不存在。

压缩过程中还必须保留：

- switch 判别式的一次求值；
- case 表达式的顺序和副作用；
- 严格相等、default 与 fallthrough；
- 解码字段中途写入后的新值；
- 循环 test/update、getter、Proxy 和解码调用；
- JavaScript 32 位、有符号和无符号位运算；
- 多变量状态的元组约束；
- 无法证明完整时的未知目标和原 default 行为。

完成这一阶段后，产物应该是一张可靠的单层状态图，而不是已经被过早“美化”的源码。

## 2.4 数组调度型状态

常见简单混淆是：

```javascript
const order = "2|0|3|1".split("|");let index = 0;
while (true) {  switch (order[index++]) {    case "0":      second();      continue;
    case "1":      fourth();      break;
    case "2":      first();      continue;
    case "3":      third();      continue;  }
  break;}
```

很多脚本直接读取 order，按 2、0、3、1 拼接 case。只有同时满足以下条件才安全：

- order 内容静态且不可变；
- index 初值静态；
- 每轮 index 更新方式可预测；
- case 不修改 order 或 index；
- 判别式没有其他副作用；
- continue/break 的目标已确认；
- 越界行为不会到达；
- dispatcher 每轮没有可观察动作；
- case 内不存在动态跳转或异常改变顺序。

若成立，可得到：

```sql
first();     second();   third();fourth();
```

但加入任意一个细节，机械拼接都可能失效：

```sql
case ”0”:   if (condition) index++;  second();  continue;
```

或者：

```css
switch (order[index++]) {  case "2":    order.push("0");    // ...}
```

数组调度只是一种状态表示，仍然要恢复“索引和序列共同定义的状态转移”。

---

## 2.5 位编码和多变量状态的补充

多层调度不能通过“外层 case + 内层 case”机械合并。

### 1\. 位编码示例

```javascript
const low = state & 3;const high = state >>> 2;
switch (low) {  case 1:    switch (high) {      case 5:        action();        break;    }}
```

在 state 已经过 ToUint32、掩码宽度为 2 位的前提下：

```ini
low = state mod 4high = floor(state / 4)state = low + 4 × high
```

因此 low=1、high=5 对应 state=21。

但实际分析不能忽略：

- 位运算会转成 32 位；
- > > 与 >>> 的符号语义不同；
- Number、BigInt 不能混用；
- 解码字段可能在轮中被改写；
- 外层 case 可能只限制部分状态；
- 两层 switch 之间可能有业务动作或副作用。

### 2\. 多变量状态

```javascript
switch (s1) {  case 1:    if (s2 === 7) {      // ...    }}
```

应把状态视为元组：

```ini
S = (s1, s2)
```

入口约束可能是：

```apache
K = (s1 = 1) ∧ (s2 = 7)
```

状态更新也必须按顺序：

```ini
s1 = s2;s2 = s1 + 1;
```

第二句读到的是已经更新后的 s1，不能一直用入口旧值替换。

如果编码不是双射，不需要强行求唯一整数状态；可以保留符号分区。

### 3\. 正确的多层 Lift 流程

```swift
输入：入口约束 K、完整状态 S  1. 按原顺序求值解码字段K
  3. 专门化内部参与调度的 switch/if/三元  4. 保留普通业务条件  5. 保留副作用和异常  6. 得到动作序列、
```

一个内层 switch 是否参与同一调度，要看它是否依赖同一完整状态，而不是看它“位于外层 case 里面”。

---

## 3\. 控制流中有哪些节点，分别怎么处理

## 3.1 先把 case 提升成 CFG 节点

### 1\. 推荐的 IR

一个实用基本块至少需要：

```bash
Block = {  id,  actions,  terminator,  lexicalContext,  exceptionContext,  suspensionContext,  origins}
```

终结方式至少包括：

```sql
Jump(target)Branch(condition, trueTarget, falseTarget)OrderedSwitch(discriminant, cases, defaultTarget)Return(value)Throw(value)Indirect(expression, knownTargets, unknownBehavior)Suspend(value, normalResume, throwResume, returnResume)
```

区域则需要：

```makefile
Region = {  entry,  members,  body,  exitPorts,  contexts,  origins}
```

出口不能只记一个 target，而应保存完成身份：

```powershell
Normal(target)Break(region)Continue(loop)Return(value)Throw(value)Indirect(expression)Suspend(resumeInfo)
```

为什么这么麻烦？因为 return、throw、break 和 continue 都不是“跳到某个编号”那么简单。它们携带函数、循环、标签或异常上下文。

### 2\. 节点和边必须分开

错误 IR 经常把状态赋值塞在块尾，然后假设块末状态就是目标。

更稳妥的做法是：

```css
actions:  state = NEXT  observe(state)  cleanup()
terminator:  ReDispatch
```

再由调度器分析把 ReDispatch 专门化为：

```makefile
edge actions:  loopUpdate  loopTest  switchDiscriminant
target:  NEXT
```

如果 state 写入本身不可观察，且后续不再读取，可以在之后的消调度阶段删除；不是在 Lift 时直接抹掉。

### 3\. 区分 Pred 和 InEdges

设 A 的两条分支都进入 B：

```css
A.true  → BA.false → B
```

此时：

```bash
Pred(B) = {A}InEdges(B) = {A.true→B, A.false→B}
```

B 只有一个不同前驱节点，但有两条进入边。

如果两条边各带不同赋值：

```css
A.true  → [x = 1] → BA.false → [x = 2] → B
```

就不能仅凭 Pred(B).size === 1 把 B 当成一条独占边内联。

### 4\. 临界边要拆开

当 A 有多个后继、B 有多个前驱时，A→B 是临界边。只属于这条边的动作既不能放到 A 末尾，也不能放到 B 开头。

```js
|Succ(A)| > 1|Pred(B)| > 1
```

正确做法是插入边块：

```css
A → EdgeAB:[edge actions] → B
```

例如：

```sql
A.true  → [result = left]  → JoinX       → [result = other] → Join
```

若把 result = left 放进 Join，从 X 进入时也会错误执行。

---

## 3.2 按节点类型归约控制流

下面按“形状、前提、改写、常见错误”讲清主要规则。

## 3.3 顺序、分支与汇合节点

### R00：空跳板

形状：

```bash
P1/P2/... → B → C
```

安全前提：

- B 没有动作；
- 没有边赋值；
- 没有可观察调度步骤；
- 没有绑定、异常或恢复效果；
- 所有进入 B 的引用都能重定向；
- 别名链不是环。

改写：

```css
Jump(B) → Jump(C
```

反例：

```css
B → C → B
```

这是一个空循环，代表发散，不能删除成正常落下。

又如：

```bash
case B:  log();  state = C;  break;
```

B 不是空跳板，因为 log 可观察。

### R01：独占顺序后继

形状：

```css
A:P → B:Q → E
```

若 B 只有这一条有效入边，而且移动 Q 不跨作用域、异常或挂起边界，可改成：

```css
A:P;Q → E
```

若还有 X→B，则 B 是共享块，不能删。可以先归约包含 A/X 的前驱区域，或考虑有限复制。

### R02：分支内部独占后继

形状：

```makefile
A: condition ? B : E      B: Q → D
```

若 B 只由 A 的 true 边进入，可改成：

```javascript
if (condition) {  Q();  // 去 D} else {  // 去 E};
```

最常见错误是把 Q 追加到 A 尾部，导致 false 分支也执行 Q。

### R03：共享公共后继

形状：

```css
B ─┐         ├→ J:Q → E      C ─┘
```

若 B/C 已形成一个完整区域，所有正常路径都到 J，且 J 没有未接管侧入口，可恢复成：

```javascript
if (condition) {  BBody();} else {  CBody();}
Q();
```

不能因为 B 和 C “都能到 J”就把 Q 提出来。必须确认：

- 相关正常路径都一定进入 J；
- return/throw/发散路径不会被迫执行 Q；
- 没有一条正常落下路径绕过 J；
- J 没有区域外入口。

后支配可以帮助找候选汇合点，但不是代码移动的充分证明。

### R04：两条边目标相同

```ini
state = check() ? J : J;
```

目标相同不表示条件可删。正确处理是保留条件求值：

```cs
void check();// Jump(J)
```

如果 true/false 边上还有不同动作，就保留 if，只合并真正相同的后续。

### R05：单臂三角形

```javascript
true → B:T ─┐A:cond               ├→ J        false ───────┘
```

可恢复为：

```js
if (condition) {  T();}
```

前提是 B 没有侧入口，正常后继确实是 J。

反向三角形可以使用 if (!condition)，但不要擅自把!(x < y) 化简为 x >= y，NaN 会让两者不同。

### R06：双臂菱形

```css
┌→ B:T ─┐A:cond ───┤       ├→ J          └→ C:F ─┘
```

可恢复为标准 if/else：

```javascript
if (condition) {  T();} else {  F();}
```

前提：

- 两臂单入口；
- 两臂内部不交叉；
- 没有侧入口；
- 正常后继相同；
- 条件只求值一次；
- 异常和发散路径保持。

### R07/R08：提前 return 或 throw

如果一臂确定 return：

```kotlin
if (condition) {  return makeValue();}
continueWork();
```

就不需要虚构 join。

若两臂都 return，可在无边动作时写成：

```sql
return condition ? left() : right();
```

但绝不能预先计算两边：

```sql
const a = left();const b = right();return condition ? a : b;
```

这会执行原本未选中的分支。

### R09/R10：判断阶梯与短路

只有后续判断仅从上一判断的失败边进入，而且中间没有动作时，才能组合：

```nginx
if (c1()) {  if (c2()) T();}
```

变为：

```nginx
if (c1() && c2()) T();
```

如果失败边上有 Q：

```javascript
if (c1()) {  T();} else {  Q();  if (c2()) F();}
```

就不能写成单纯的 else-if，因为 Q 的时点不能消失或提前。

### R11：多路分支和 fallthrough

恢复 switch 时必须保持：

- discriminant 只求值一次；
- case 表达式搜索顺序；
- 严格相等语义；
- default；
- fallthrough；
- break 的真实目标。

例如原图表达 B→C 的落下：

```css
switch (key) {  case 0:    BBody();    // 不能补 break  case 1:    CBody();    break;  default:    FBody();}
```

若误加 break，就丢掉 key=0 时的 CBody。

## 3.4 循环、回边与出口节点

### R12：true 分支自环

形状：

```powershell
H: condition ? Body→H : Exit
```

可恢复为：

```javascript
while (condition) {  Body();}
```

验证重点：

- 0 轮；
- 1 轮；
- 多轮；
- n 次 body 对应 n+1 次 condition；
- body 抛出时，不额外执行退出动作。

### R13：false 分支自环

```powershell
H: stop ? Exit : Body→H
```

可恢复为：

```css
while (!stop) {  Body();}
```

应保留逻辑取反，而不是未经证明改写比较符。

### R14：带每轮公共前缀

形状：

```powershell
H: Prefix; condition ? Body→H : ExitAction→Exit
```

正确结构：

```kotlin
while (true) {  Prefix();
  if (!condition) {    ExitAction();    break;  }
  Body();}
```

错误结构：

```javascript
Prefix();
while (condition) {  Body();}
ExitAction();
```

后者只执行一次 Prefix，而原程序每轮和最终退出判断前都会执行。

### R15：尾判断循环

形状：

```powershell
H: Body; condition ? H : Exit
```

恢复为：

```javascript
do {  Body();} while (condition);
```

必须确认首次进入一定先执行 Body。若某些动作只在条件为真时执行，就不能塞进 do-while 的公共体。

### R16：无条件自环

```powershell
H: Body → H
```

恢复为：

```javascript
while (true) {  Body();}
```

空循环也不能删除。发散本身是程序语义；删除后会让后续代码执行。

### R17/R18：双节点和线性多节点环

```powershell
H: condition ? B : ExitB: T → H
```

先把独占 B 内联到 H 的 true 臂，再化为 while。

多节点链同理：

```powershell
H → B1 → B2 → ... → Bn → H
```

但每个中间块都必须没有侧入口和额外出口。外部若能直接进入 B2，线性拼接就会强制执行本应绕过的 B1。

### R19：两条分支都回头

```powershell
H: condition ? T→H : F→H
```

对应：

```javascript
while (true) {  if (condition) {    T();  } else {    F();  }}
```

绝不能写成：

```javascript
while (condition) {  T();}F();
```

因为原 false 分支也回到 H，不是退出。

### R20：一般自然循环和多 latch

识别自然循环的工程步骤：

1. 给函数增加虚拟 ENTRY；
2. 计算可达性；
3. 计算 dominator；
4. 对每条边 L→H，若 H 支配 L，则标为回边候选；
5. 从 L 反向收集前驱直到 H；
6. 合并同一 H 的多个 latch；
7. 检查区域外入口是否只到 H；
8. 收集所有出口及边动作；
9. 先结构化内部子区域；
10. 再把回 H 的边映射为 continue。

SCC 适合发现“哪里有环”，dominator 负责判断“是否存在单入口循环头”。两者不能互相替代。

### R21：continue

恢复 continue 前必须知道它的真正 continue point：

| 循环 | continue 后去哪 |
| --- | --- |
| while | test |
| do-while | 尾部 test |
| for | update，然后 test |

假设原图有：

```css
Body → Update → HeaderSkip → Update → Header
```

可以用 for 的 continue。

若 Skip 直接去 Header，绕过 Update，就不能把它变成普通 for continue，否则会额外执行 Update。

### R22：break

若提前退出边上有 F：

```css
stop ? [F; Exit] : [Q; Header]
```

应恢复为：

```css
if (stop) {  F();  break;}
Q();
```

不能把 F 提到循环后，因为普通条件失败退出原本不执行 F。

### R23：多个不同出口

一个循环可能去 E1、E2、E3，后续完全不同。

可选结构按优先级考虑：

1. 利用已有的外层 if/loop/label；
2. 最小范围标签；
3. 新鲜出口选择器；
4. 局部残余调度器。

出口选择器示意：

```bash
let exitKind;
loop: while (true) {  if (done()) {    exitKind = 1;    break loop;  }
  if (failed()) {    exitKind = 2;    break loop;  }
  work();}
if (exitKind === 1) {  onDone();} else {  onFailed();}
```

每个正常退出必须初始化 exitKind；边上动作不能重复。

### R24：嵌套循环和跨层跳转

```kotlin
outer: while (c1()) {  while (c2()) {    if (stop()) break outer;    work();  }
  afterInner();}
```

若把 break outer 改成裸 break，afterInner 会错误执行。

标签不是“代码不够漂亮”的证据。它是表达跨层目标的合法结构。只有确认真实目标等于最近循环时，才能去标签。

### R25：for 美化

只有满足以下条件时，才把 while 改成 for：

- Init 只执行一次；
- test 时点相同；
- 所有普通回边都经过 Update；
- 所有 continue 都经过 Update；
- break 跳过 Update；
- Update 抛出异常的时点相同；
- let 的逐轮绑定和闭包捕获不变；
- TDZ 和声明作用域不变。

不满足就保留 while。for 不是解混淆完成度指标。

## 3.5 交叉、多入口和语义边界节点

### R26：无环交叉、N 型共享

典型形状：

```makefile
A: c ? B : CB: P; d ? C : DC: Q → DD: S → E
```

如果经过 B 且 d 为假时要跳过 Q，可以用最小标签区域：

```bash
join: {  if (c) {    P();
    if (!d) {      break join;    }  }
  Q();}
S();
```

这里 d 只能在经过 B 且执行 P 之后求值。不能把 d 提前，也不能让 c=false 路径求 d。

另一方案是复制 Q，但要限制体积并检查绑定和对象身份。

### R27：多入口 SCC

形状：

```css
ENTRY → BENTRY → CB ↔ C
```

如果没有一个内部节点支配整个环，就不能假装它是普通单入口 while。

可保留局部状态机：

```kotlin
state = choose() ? B : C;
region: while (true) {  switch (state) {    case B:      BBody();
      if (goC()) {        state = C;        continue region;      }
      exitKind = 1;      break region;
    case C:      CBody();
      if (goB()) {        state = B;        continue region;      }
      exitKind = 2;      break region;  }}
```

这已经比保留整个函数级 dispatcher 更清晰，而且不会伪造单入口结构。

### R28：受控复制

共享节点 B 有多个前驱时，可以只把 B 复制到选中的边，其他入口继续使用原 B。

粗略成本：

```apache
growth ≈ (copies - 1) × cost(B)
```

还要加上下游复制、标签和包装成本。

禁止无预算递归复制；不要复制带回边节点导致无限展开；不要因复制闭包声明而改变共享 binding。

### R29：return/throw 终结块

共享终结块可以在安全时就地展开：

```css
A → R:[P; Return(expr)]
```

变为：

```css
A:[P; Return(expr)]
```

但 expr 必须在原分支、原函数和原 finally 上下文中按相同时点求值。

### R30：常量分支和不可达代码

只有对所有有效入口都证明 condition 恒真或恒假，才能删除一侧。

```javascript
if ((audit(), true)) {  T();} else {  F();}
```

可以去掉 F，但 audit 仍要执行：

```js
audit();T();
```

一次动态运行没有经过 F，只能说明该输入没经过，不能证明 F 不可达。

删除不可达语句还要考虑 var、函数声明、块函数和类的绑定实例化。

### R31：临界边和路径赋值

边独有动作必须留在边上。SSA 的 φ 或并行复制也要按入边降低。

例如交换：

```cs
[x, y] = [y, x];
```

不能错误写成：

```ini
x = y;y = x;
```

简单 binding 可使用新鲜临时变量；若左值含 getter/setter 或计算属性，则需要保留完整引用求值语义。

### R32：未知和间接目标

```ini
state = table[compute()];
```

如果 table 可变、compute 有副作用、候选集合不完整，就保留：

```makefile
target = Eval(table[compute()])Dispatch(target, knownTargets, originalUnknownBehavior)
```

不要把未观测目标改成 throw，也不要因动态轨迹只出现 A 就删除 default。

### R33：异常边和 finally

普通 CFG 的 successor 不足以描述 finally。

```kotlin
try {  return choose();} finally {  cleanup();}
```

真实语义是：

1. 求值 choose；
2. 保存 pending return；
3. 执行 cleanup；
4. cleanup 若正常完成，则继续原 return；
5. cleanup 若 return/throw，则覆盖原完成。

因此，跨异常区域归约至少要携带：

```nginx
Completion × ExceptionContext
```

若没有异常感知的结构化器，只在同一 try/finally 子区域内做局部安全归约。

### R34：await/yield

generator 的控制入口包括：

- 第一次 next；
- 正常 next(value)；
- throw(error)；
- return(value)。

async 还包括 fulfill/reject 和微任务时序。

未建立恢复模型时，Suspend 不能当成普通 Jump，yield/await 也不能当普通函数调用。保留局部恢复状态机是正确策略。

### R35：等价尾部再共享

```css
if (condition) {  P();  S();} else {  Q();  S();}
```

可以尝试提取：

```css
if (condition) {  P();} else {  Q();}
S();
```

但文本相同不等于语义等价。两处 S 必须满足：

- 使用同一个 binding；
- 对象身份和分配次数一致；
- 异常上下文一致；
- 生命周期一致；
- 对应正常路径都执行；
- 前缀提前终止时不会新增 S；
- 没有未接管侧入口。

尾部共享应放到结构稳定后，避免与尾部复制来回振荡。

---

## 4\. 控制流平坦化通常还伴随哪些混淆

真实样本很少只使用控制流平坦化。更多时候，CFF 只是其中一层，外面还会叠加字符串、表达式、状态编码和反调试等手段。

这一节先做类型梳理，不继续展开具体解法。后续文章再逐项分享。

## 4.1 标识符混淆

变量、函数、参数和属性都会被替换成无语义名称：

```javascript
function _0x3a1f(_0x51d2) {  let _0x22ab = 7;}
```

它不会直接改变控制流，却会隐藏状态变量、索引、结果变量和业务函数之间的关系。

## 4.2 字符串池与字符串加密

常见形式包括：

- 字符串数组；
- 数组旋转；
- 索引偏移；
- Base64；
- XOR、RC4 等加密；
- 多层解码包装；
- 解码结果缓存。

状态值、属性名、接口路径、错误信息乃至动态载荷，都可能藏在字符串解码器中。

## 4.3 常量与表达式混淆

简单常量会被改写为复杂算术、位运算或类型转换：

```apache
state = (0x31 ^ 0x55) + (3 << 2);
```

状态更新还可能藏在逗号、三元和逻辑表达式里：

```perl
log(), state = condition ? A : B, cleanup();
```

这类混淆主要干扰常量传播、条件识别和状态目标恢复。

## 4.4 不透明谓词与死代码

混淆器会插入结果恒定但难以一眼判断的条件，再把大量伪代码和伪状态挂在不可达分支上。

```javascript
if (((x * x + x) & 1) === 0) {  realCode();} else {  fakeCode();}
```

它会扩大 CFG，制造假的分支、汇合、循环和出口，使控制流结构比真实业务复杂得多。

## 4.5 状态编码与跳转表

状态不一定直接写成 case 标签，还可能经过：

- XOR、ADD 等编码；
- 高低位拆分；
- 多变量组合；
- 数组或对象查表；
- 动态密钥；
- 属性别名；
- getter、setter 或 Proxy。

多层 switch 本身也可以看成状态编码的一种表现。

## 4.6 控制流虚拟化

更重的保护会把原程序转换成自定义字节码，再由虚拟机解释执行：

```javascript
while (ip < bytecode.length) {  switch (bytecode[ip++]) {    case OP_ADD:      // ...      break;    case OP_JUMP:      // ...      break;  }}
```

这时每个 case 代表的是一条虚拟指令，而不是原程序的基本块。它与普通控制流平坦化外观相似，但分析目标已经变成指令集、虚拟栈、寄存器和字节码。

## 4.7 eval、Function 与动态代码

部分代码不会直接出现在静态文件中，而是在运行时通过以下方式产生：

- eval；
- Function 构造器；
- 动态 import；
- Worker；
- WebAssembly；
- 网络下发载荷；
- 运行时解密和二次执行。

这种情况下，磁盘上的 JavaScript 可能只是一层加载器，真正的控制流需要从运行态生成内容中继续恢复。

## 4.8 反调试与自防御

常见手段包括：

- debugger；
- 定时器差值检测；
- DevTools 检测；
- console 方法篡改；
- Function.prototype.toString 检查；
- Error stack 检查；
- 源码完整性校验；
- 无限递归或定时触发；
- DOM、Canvas、WebGL 等环境检测。

这类代码不一定参与业务逻辑，但会影响动态调试结果，甚至根据环境切换到另一套控制流。

## 4.9 异常、异步与生成器状态机

try/catch/finally、Promise、async/await 和 generator 本身就带有复杂的控制转移。

经过转译或混淆后，它们可能表现为：

- 正常与异常两套状态；
- fulfill/reject 恢复入口；
- next/throw/return 多入口；
- finally 清理状态；
- 微任务与宏任务调度。

这类结构不能简单当成同步 while-switch 删除。

## 4.10 后续分享

控制流平坦化只是 JavaScript 混淆体系中的一个环节。后续可以继续拆解：

- 字符串数组和解码函数还原；
- 不透明谓词与死代码清理；
- 状态编码和跳转表恢复；
- JavaScript 控制流虚拟化；
- eval 与动态载荷提取；
- 反调试和自防御代码分析；
- async、generator 与异常状态机恢复。

本次分享就到这里，其余混淆类型，等待后续分享~

广告时间：

星球地址:https://wx.zsxq.com/group/28882844228481

需要加入星球或课程都，可加我好友咨询有对应优惠，感谢各位大佬支持

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/31U1xELYneUHJw8t9nUMlF4xFQiaLFHmdiaY8NSDFEGr4L3jAZ9YmnzHLicMiaHe2MFDCdrXFf3WOHmhAibgmkj5vx3MuzOliaZg9ibtib4ia0XL97Yg/640?wx_fmt=jpeg&from=appmsg&watermark=1&wxfrom=5&wx_lazy=1&tp=webp#imgIndex=1)