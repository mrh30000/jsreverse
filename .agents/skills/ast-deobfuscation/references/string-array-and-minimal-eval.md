# 字符串表与最小求值

这份文档用于处理字符串表、解码包装、局部别名链和最小引导 `eval`。

## 适用场景

- 文件开头几条语句就在初始化解码器。
- 顶层 IIFE 里传入数组、对象或字符串表。
- 源码里大量出现 `fn(12)`、`arr[123]`、`String.fromCharCode(...)`。
- 第一层去壳之后，函数内部还存在二次字符串恢复。

## 推荐顺序

1. 先定位数组字面量、解码函数和别名链。
2. 尽量优先做静态恢复，例如数组下标、纯字面量拼接、纯数字参数调用。
3. 只有静态无法推进时，才执行最小引导代码。
4. 删除已经消费掉的引导声明或包装层。
5. 重新 parse 一次，再进入控制流还原阶段。

## 最小引导 `eval` 原则

- 只执行前几条足以构造解码器的代码。
- 不要直接执行整份源文件。
- 不要在未隔离的环境里执行明显依赖 DOM、`window`、定时器或网络的逻辑。
- 求值目标应尽量窄，例如“只恢复数字参数到字符串的函数调用”。

## 常见模式

### 别名族 + 数组字面量的模板（极验系，必须先处理）

极验一族在**每个函数开头**都会插这样一组。压缩后的真实形态是
**一条 `var` 带 3 个 declarator + 紧跟一条 `shift()` 表达式语句**：

```js
var $_CJDe = LIuDu.$_Ca, $_CJCW = ["$_CJGo"].concat($_CJDe), $_CJCx = $_CJCW[1];
$_CJCW.shift();
```

读文章时你更常看到它被展开成 4 行（等价，只是可读版）：

```js
var $_CEGDT = LIuDu.$_Ca;                  // 指向解码函数
var $_CEGCS = ["$_CEGGw"].concat($_CEGDT); // 数组字面量 + concat，纯混淆
var $_CEGEk = $_CEGCS[1];                  // 取回同一个引用
$_CEGCS.shift();
```

两种形态之后都是 `$_CJDe === $_CJCW === $_CJCx`，即**同一个值被拆成 3 个名字**。
若不处理，字符串表访问 `t[$_CJDe(326)]` 永远不可能被静态还原。

处理配方（整组处理，不要逐行删）：

1. 判据：一条 `VariableDeclaration` 有 **3 个 declarator**，且第 1 个 init（`X.y` 形式）
   等于**前几条语句里出现过的**那个解码函数引用；
2. 把该别名族下所有 `name(数字字面量)` 调用就地求值成字符串字面量；
3. **整组删掉**这条 3 declarator 声明 + 紧跟的 `shift()` 表达式语句。

现成实现见 `../scripts/patterns/geetest-guarded-pass.js` 的 `VariableDeclaration` 分支 ——
它同时做了「别名归一 + 常量调用还原 + 整组清除」三件事，可作为写其它站点适配器的模板。

> ⚠️ 这里有个**必须避开的坑**：如果你自己用 AST 批量删「单声明且 init 是成员表达式」的语句，
> 会把**你刚插进去的哨兵变量**（例如 `var bobo = 目标对象;`）一起删掉，
> 导致后续引用全部解析失败。删之前必须排除刚赋值的那个名字。
>
> 另一条判据：**如果 `shift()` 那行没被一起删掉**，剩下的 `arr.shift()` 会继续引用已删除的绑定，
> 反混淆产物会报 `undefined`。所以"整组"是硬要求，不能只删声明。

### 顶层 IIFE 带数组参数

- 从顶层调用提取 `formalParam -> actualArg` 映射。
- 只替换明确命中的数组下标访问。
- 处理包装函数里直接可展开的语句块。

### 前几条语句就是解密引导

- 只截取前 2 到 5 条关键语句。
- 建立最小运行时后，恢复只带字面量参数的调用点。
- 删除已消费的引导语句。

### 去掉第一层后，局部函数还有二次恢复

- 先展开顶层 IIFE。
- 重新 parse。
- 再识别函数内部那组“构造器 + 成员表达式 + 数字下标”的模式。

### 字符串表的「三点自动定位」（旧版 OB / 模板引擎渲染后再混淆）

站点把模板渲染出的常量串（密钥、密文、CSS 片段）塞进字符串数组，再整体过一遍 OB。
想不靠人眼把 `data` / `key` / `iv` 捞出来，需要三个量：

| 量 | 从哪拿 | 判据 |
| --- | --- | --- |
| **偏移量** | 取值函数的函数体 | 函数体恰好是 3 条语句：`x = x - 0x0;`、`var y = arr[x]; return y;` —— 第 1 条的减数就是偏移 |
| **rotate 次数** | 数组洗牌 IIFE | 形如 `(function(a, b){ while(--b){ a.push(a.shift()); } }(arr, 0x1a9))`，**第二个实参**就是次数 |
| **大数组名** | 同一个 IIFE 的**第一个实参** | 拿这个名字回查 `var <name> = [...]` 声明，取字面量 |

拿到三者后：

1. 对大数组**先执行 rotate**（`push(shift())` 循环 `n` 次）得到真实顺序；
2. 再把「偏移 + 索引」喂给取值函数，逐个把 `fn(0x1a)` 静态替换成字符串字面量；
3. 替换完再 parse 一次，常量就都回来了。

> **口径提醒（极易算错一位）**：洗牌 IIFE 的**第二个实参不等于**旋转函数的入参。原文是
> `_0x19a768(++_0x36191f)` —— 传参前先自增，而旋转函数内部又是 `while (--b)`：
> 入参 `0x1aa`，先减后判断，实际迭代 `0x1a9` 次。**结论：左移次数恰等于第二个实参**。
>
> 常见错误是只看到 `while (--b)` 就减 1，得到 `0x1a8` —— 数组整体错位一位，
> 而错位后的 `fn(0x2c)` 仍然返回**一个字符串**（只是不对的那个），所以错误完全静默。
>
> 稳妥做法：自己实现时不要照抄 `while (--b)`，直接
> `arr = arr[n:] + arr[:n]`（`n` = 第二个实参），并用「还原出的常量串能组成可读的密钥/密文」反向验证。
>
> **为什么值得专门做这一步**：站点把**业务常量（尤其是解密密钥与密文）**放在这张表里，
> 常量没恢复时，读业务代码会得到一堆 `_0x0a9e(0x2c)`，看不出任何业务语义，
> 于是很容易误判「这站没有反爬逻辑」。常量恢复是**判断有无反爬的前置步骤**，不是可选项。
>
> **第二个数据点（同一结论，另一种写法）**：有的站把自增放在**辅助函数**里 ——
> `_0x52d57c = function (f, n) { f(++n) }; _0x52d57c(_0x4db1c, 347)`，旋转函数内部同样是 `while (--_0x48181e)`。
> 效果一样：**有效左移次数 = IIFE 的第二个实参 = 347**。
> 该样本用浏览器 Console 的 13 组「索引 + key → 明文」对照做过 oracle：
> 按字面量做 **347 次 `push(shift())` 时 13/13 命中**，左移 10 位 / 12 位（字面量 346 / 348）时 **0/13**。
> **再次确认「等于第二个实参」这条口径**，不要按 `--` 减 1。
>
> **补充（B9 复算时踩到的第二个坑）**：`push(shift())` 是**绕环**的，表长 `N` 时「左移 `L` 次」≡「左移 `L mod N` 位」。
> 上面的样本表长 56，`347 mod 56 = 11` —— 所以**用「已知索引反查」做标定时，枚举范围是 `0..N-1`（这里是 0..55），
> 不是 `0..347`**。写成 `for rot in range(len(arr))` 再断言 `rot == 347` 就是死代码（永远不成立、自检真空通过）。

### 字符串表的「恒等式自校验」旋转（不读洗牌循环也能还原）

有些站不把旋转量写成明文，而是让洗牌循环**跑到满足一个数论恒等式为止**：

```js
for (xL = i, be = x(); ;) {
  try {
    if (bl = parseInt(xL(539))/1 + -parseInt(xL(2236))/2 + -parseInt(xL(1037))/3*(parseInt(xL(2421))/4)
           + -parseInt(xL(1247))/5*(parseInt(xL(2279))/6) + -parseInt(xL(1176))/7
           + -parseInt(xL(1797))/8*(-parseInt(xL(1532))/9) + parseInt(xL(2302))/10,
        F === bl) break;                 // F 是写死的 magic 值
    else be.push(be.shift());
  } catch (by) { be.push(be.shift()); }
}(V, 608776)
```

**处置：不要读循环，直接枚举。** 把恒等式与取表器抄下来，枚举 `rot ∈ [0, len(table))`，
命中 magic 值即停（本批实测：表 2050 项、取表器基址 458、magic `608776` ⇒ 旋转 **434**）。

**四个静默失败点**（本批实测，错了不会报错，只会搜不到）：

1. **`parseInt` 是「取前导整数前缀」**，不是 `float()`。表项形如 `'998842qYxftE'` ⇒ `parseInt` 得 `998842`；
   用 Python `int()` / `float()` 会**抛异常**，一旦被 `try/except` 跳过，旋转量永远找不到。
2. **累加是 IEEE754 双精度且从左到右**，比较是 JS 的 `===`（**精确相等**）—— 不要加容差，
   也不要重排项顺序（`a/1 + -b/2` 与 `a/1 - b/2` 在浮点上不保证同结果）。
3. **旋转量 / 取表器基址 / magic 值三者每个版本都不同**（本批同一站的两个 widget 分别是
   `434 / 458 / 608776` 与另一组 `基址 239 / magic 520249`）⇒ **必须现场枚举，不能硬编码**。
4. **不要用「结果像不像可读字符串」验收**：错位 1 位的结果**仍然是可打印字符串**。
   要用**已知索引反查**做机械 oracle（本批：旋转 434 后 `table[1487-458] === 'document'`、
   `table[618-458] === 'BCkZA9'`、`table[1931-458] === '_cf_chl_opt'`）。

**判据**：如果洗牌 IIFE 的循环条件里有 `break`，且循环体是「判断 + `push(shift())`」，
就先按恒等式处理，不要去找「第二个实参」——**这种情况下根本没有那个实参**。

可执行实现（含上面两组 oracle 与反例）：
`../../web-reverse-algorithm/scripts/waf_clearance_solver.py cf-strtable` 与 `acw-table`；
判层与厂商上下文见 `../../web-js-env-patcher/references/edge-waf-cookie-challenge.md`。

### 解码求值失败时的自适应错误恢复 (ReferenceError Adaptive Retry)

在自动化执行提取的解密代码块时，常见痛点是：混淆器对外层函数重命名、多层闭包封装或别名分发，导致沙箱在求值目标表达式时抛出 `ReferenceError: 'xxx' is not defined`。

成熟的工程化自适应重试启发式规则（来自 v_jstools 实践）：
```javascript
function safeDeobfuscateWithRetry(code, config, runDeob) {
  try {
    return runDeob(code, config);
  } catch (e) {
    // 捕获 ReferenceError 并提取未定义标识符
    if (e && (e.name === 'ReferenceError' || Object.getPrototypeOf(e)?.name === 'ReferenceError')) {
      const match = /^(.*) is not defined/.exec(e.message);
      if (match && match[1] && match[1] !== config.decFuncName) {
        console.warn(`[AST-Deob] 触发 ReferenceError: '${match[1]}' 未定义，自动设为候选解密函数并进行二次重试。`);
        config.decFuncName = match[1];
        try {
          return runDeob(code, config);
        } catch (retryErr) {
          // 二次重试仍失败则保留堆栈并降级
          throw retryErr;
        }
      }
    }
    throw e;
  }
}
```
**收益**：消除了大量由于局部混淆变量名多重赋值导致的人工手动干预，使得批量自动化反混淆成功率大幅提高。

## 形态：**原地解密函数**（不是数组表）——AST 批量替换（`52pojie-712068`）

前面讲的都是「**字符串表 + 索引**」这一族。还有另一族**长得完全不像**的：

### 判据：调用形态是「一个字面量直接喂给一个函数」

```text
S('...')   /   _0x4c77('0x2', 'V%DS')   /   atob(window['b'])
```

- **没有数组、没有索引**，所以 `string-array` 类脚本**一个都匹配不到**；
- 但**仍然是「常量折叠」问题**：`S` 是**纯函数**（输出只依赖入参），
  所以可以在 AST 上把 `S(<Literal>)` **整节点替换成它解码后的字面量**。

### 两个实测形态（本批新收）

**形态 A · 单密钥 + 位置相关 XOR**（`52pojie-712068` 的 CKFinder）

```js
function S(e) {
    for (var t = "", n = e.charCodeAt(0), i = 1; i < e.length; ++i)
        t += String.fromCharCode(e.charCodeAt(i) ^ i + n & 127);
    return t;
}
```

> ★ **判据**：**首字节当密钥**（`n = e.charCodeAt(0)`）+ **下标参与运算**
> ⇒ 同一个字符在不同位置解出不同值。
> ⚠️ **优先级**：JS 里 `+` 先于 `&`，`&` 先于 `^`
> ⇒ `e.charCodeAt(i) ^ i + n & 127` 实际是 `charCodeAt(i) ^ ((i + n) & 127)`。
> **移植到 Python 时必须照这个括号写**，否则**不报错、结果全错**。
> 同文件还有**第二个变体**（常量密钥 `255`）：`String.fromCharCode(e.charCodeAt(n) ^ 255 & n)`
> ⇒ **同一份代码里可能有多个不同参数的解码函数，先分别识别再批量替换。**

**形态 B · RC4 变体 + 字符串表**（`52pojie-1294569` 猿人学第 1 题）

```js
// 源文原样：J(0x0, ']dQW') / J(0x1, 'GTu!')
var t = function (w, m) {
    var T = [], A = 0x0, C, b = '', W = '';
    w = Y(w);                                    // Y = 自定义 base64 解码
    for (var R = 0x0, v = w['length']; R < v; R++)
        W += '%' + ('00' + w['charCodeAt'](R)['toString'](0x10))['slice'](-0x2);
    w = decodeURIComponent(W);                   // ★ 先做一次「百分号 → 字节」往返
    for (l = 0x0; l < 0x100; l++) T[l] = l;      // KSA 初始化
    for (l = 0x0; l < 0x100; l++) {              // KSA 打乱（密钥 = 第二实参）
        A = (A + T[l] + m['charCodeAt'](l % m['length'])) % 0x100,
        C = T[l], T[l] = T[A], T[A] = C;
    }
    for (var L = 0x0; L < w['length']; L++) {    // PRGA
        l = (l + 0x1) % 0x100, A = (A + T[l]) % 0x100,
        C = T[l], T[l] = T[A], T[A] = C,
        b += String['fromCharCode'](w['charCodeAt'](L) ^ T[(T[l] + T[A]) % 0x100]);
    }
    return b;
};
```

> ★★ **判据**：**「256 表 + 两次打乱 + 逐字节异或」= RC4**（与 `control-flow-and-opcode-patterns.md`
> 里 VMP 的 RC4 识别同源）。这里的两个差异点：
> 1. **密文先过 base64，再过一次 `decodeURIComponent`**
>    （`%XX` 往返 = 「把每个字节重新按 UTF-8 解释一遍」）⇒ **移植时这一句最容易漏**；
> 2. **密钥是「第二实参」**（这里是 `']dQW'` / `'GTu!'`），所以**同一个 `J` 函数能解出多组字符串**。

### ★★★ 通用做法：用 `acorn` + `escodegen` 做**定向替换**（源文给的是完整可跑代码）

源文原话：「因为 JavaScript 的字符串太特殊了，使用字符串匹配的话很麻烦，
我这里选择分析 AST，针对 AST 进行替换。」

```js
const acorn = require('acorn');
const walk = require('acorn/dist/walk');
const escodegen = require('escodegen');

function recursiveDecode(node) {
    if (node.type === 'Literal') {
        node.value = S(node.value);
    } else if (node.type === 'ConditionalExpression') {
        recursiveDecode(node.consequent);
        recursiveDecode(node.alternate);
    } else {
        console.log('Node type is neither Literal nor ConditionalExpression. ' + node.start);
    }
}

const ast = acorn.parse(data);
walk.simple(ast, {
    CallExpression: function (node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'S' && node.arguments.length === 1) {
            const arg0 = node.arguments[0];
            recursiveDecode(arg0);
            if (arg0.type === 'Literal') {
                node.type = arg0.type; node.value = arg0.value;
            } else if (arg0.type === 'ConditionalExpression') {
                node.type = arg0.type; node.test = arg0.test;
                node.consequent = arg0.consequent; node.alternate = arg0.alternate;
            }
        }
    }
});
fs.writeFileSync(outputFile, escodegen.generate(ast));
```

> ★★ **四条可迁移判据**：
> 1. **替换的是「整个 `CallExpression` 节点」，不是它的实参** ——
>    即 `S('abc')` 整块变成 `'解码结果'`。源文正是这么做的（把 `node.type` 改成 `Literal`）。
> 2. **必须处理三元分支**：混淆器常把 `S(...)` 写成
>    `cond ? S('a') : S('b')`，**两个分支都要递归解码**，否则漏一半。
> 3. **遇到非预期节点类型时「打印位置 + 跳过」而不是抛错**（源文的 `else` 分支打印 `node.start`）
>    ⇒ 让脚本能**跑完**，你再看漏了哪几处。
> 4. **⚠️ 替换前先确认 `S` 是纯函数**：只要它读了 `window`/`document`/时间/随机数，
>    静态替换就会**静默产出错误的合法 JS**（这是本技能反复强调的坑，
>    见 `static-index-replacement-pitfalls.md`）。
>    **验证动作**：在**断点处的 Console 里原地调用一次 `S('...')`**，
>    看结果与你的离线实现是否一致（做法见
>    `../../web-reverse-hook/references/response-rewrite-and-locating-hooks.md` §5.3）。

### ★ 补充判据：「乱码字符串排查法」（源文原话）

> 「这一行会打印所有的一次解码之后的字符串，然后我们就排查一下吧，
> 反正才 6246 行，**不到五分钟差不多就能看完**。」

即：在 `recursiveDecode` 里加一行 `console.log(node.value)`，
**把「解码后仍是乱码」的字符串全打出来**，然后**人眼扫一遍**找线索
（源文正是靠这一步找到「`This is a demo version of CKFinder 3`」那个暗桩串的）。

> ★ **适用条件**：解码函数**能正确还原大部分字符串**（说明它就是对的），
> 剩下少数「解了还是乱码」的往往**不是字符串**而是别的编码/数据结构。
> ⇒ 这是一个**零成本的「解码器对不对」体检**，比逐个人工验证快得多。

---

## 停止条件
- 主要字符串表已经恢复。
- 核心解码器入口已经清楚。
- 剩余部分不再适合纯静态恢复。

满足以上条件后，应切换到控制流或结构标准化阶段。
