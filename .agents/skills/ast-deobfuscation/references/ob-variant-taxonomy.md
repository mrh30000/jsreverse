# OB 混淆变体分类与还原对策

本文件回答一个问题：**为什么通用 OB 反混淆器/在线网站"只解开一部分"，剩下那部分该怎么处理。**

`references/obfuscation-detector.md` 讲的是"识别是不是 OB"；本文件讲"OB 被改造过之后如何识别改造点，
以及每类改造对应的还原手法"。两者配合使用。

---

## 一、标准 OB 的五个特征（检测基线）

| # | 特征 | 说明 |
| --- | --- | --- |
| 1 | 三要素 | **大数组（或含大数组的函数）+ 自执行函数 + 解密函数** |
| 2 | 数组元素 | 一般是字符串；可能是明文、base64，也可能是 **RC4 密文** |
| 3 | 自执行函数 | 参数含数组、偏移量（数值/十六进制）；体内含 `push` / `shift` 做位移 |
| 4 | 解密函数 | 常含 `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=` 码表 |
| 5 | 命名 | 标识符以 `_0x` 或 `0x` 开头 + 1~6 位数字/字母 |

**动态识别（通用脚本）就靠这两条硬判据**：
- 找数组 → 要求**数组元素全是字符串**；
- 找解密函数 → 要求**函数体内含标准 base64 码表字符串**。

所以"打补丁"的方向也就清楚了：**只要打破这两条判据，自动识别就失效。**

> 排查顺序建议：先跑在线站（`webcrack.netlify.app`、`obf-io.deobfuscate.io`）试一次。
> **能解掉就不必上 AST**；解不掉（或只解一部分）再按下面的变体分类走 AST。

---

## 二、变体一：破坏「基本特征」

| 改造手法 | 现象 | 还原对策 |
| --- | --- | --- |
| 数组元素掺入非字符串 | 元素是变量引用、三元表达式 | 先静态求出这些元素的字符串值替换回数组；只有一两个元素时**手工替换最快** |
| 去掉自执行函数（不做位移） | 数组顺序 = 解密函数入参顺序 | 直接内联，无需还原位移 |
| 标识符不用 `_0x`/`0x` 前缀 | 特征检测 5 失效 | 靠特征 1~4 判断，别依赖命名 |
| 打乱 base64 码表顺序 | 解密函数里的码表不是标准顺序 | **仍按 `indexOf` 逻辑解**：把码表当参数读出来用即可，不要硬编码标准表 |
| 插入格式化检查语句 | 代码压缩后能跑、格式化后报错 | **压缩后再加载进内存**（见 §6） |

---

## 三、变体二：解密函数「分身」（多重赋值）

```js
var _0xae0a = function (n) { /* 真正解密 */ };
var dd = _0xae0a;                  // 一层分身
function hi() { var uu = dd; console[uu('0x1')](uu('0x0')); }   // 嵌套分身
```

**还原手法**（Babel）：

1. 定位解密函数的 `path`；
2. 用 `path.scope.getBinding(name)` 拿到赋值 path，读出被赋的变量名；
3. 把所有通过该变量名调用的 path 的 callee 改回解密函数原名；
4. **多重赋值要递归**，直到没有新分身；
5. 最后统一把「解密函数调用」替换成调用结果。

---

## 四、变体三：字典混淆（与数组混淆叠加）

字典 `dict[key] → value` 取代 `array[index] → value`，value 可以是字面量，**也可以是函数**。

```js
var ix = {
  'MLMYr': function (a, b) { return a == b; },   // 返回值是表达式
  'KWXXu': function (a, b) { return a(b); },     // 参数是函数
  'sXyej': "log",
};
function hi(name){ if (ix['MLMYr']('lili','lili')) console[ix[_0xae0a('0x1')]](name); }
ix['KWXXu'](hi, _0xae0a('0x0'));
```

还原要处理四件事：

1. **执行顺序**：先解字典还是先解数组？取决于"字典 value 当数组解密函数的参数"还是反过来；
   字典往往不止一个。
2. **实参替换形参**：value 是函数时，`params` 与 `body` 里的 `arguments` 必须**配对替换**。
3. **字典嵌套**：value 的实参可能是另一个 key 的调用 ⇒ 需要**堆栈**思想（参数含函数调用先入栈），
   不能简单地"遍历一遍替换"。
4. **字典也有多重赋值**，对策同 §3。

> **字典 value 是函数时的「按返回类型替换」细则**（5 类：Literal / MemberExpression /
> BinaryExpression / LogicalExpression / CallExpression，其中**只有第 5 类需要先比形参个数**）
> 集中在 `obfuscator-io-four-step-pipeline.md` §3.2 —— 本节的四件事是「**怎么找到字典**」，
> 那一节是「**找到之后怎么替**」，两处配合使用。判据侧还有一条来自那边的补充：
> 「键长恒为 5」只是某一套配置的产物，稳定判据是「**全字符串键 + 同文件内该形态对象键长一致**」。

### 4.1 实测样本（`52pojie-1471146`，某东 `tak.js`）：自比恒假指纹 + 解码函数识别启发式

同一形态（字典 / 代理对象叠加数组混淆）的另一个样本。这里只记 **§四 + §六 + `wrapper-folder.md` 尚未覆盖的三条**，
其余机制直接看那三处，**不要在本节重复实现**。

**① ★ 检测信号：「同一个字符串自比」的整块死代码 = 代理对象没还原的指纹。**

对象里同时有**常量**属性与**函数**属性，业务代码把**同一个常量**摆在 `!==` 的两侧：

```
f = { 'NjnDJ': function (g, h) { return g !== h; }, 'EJTjg': 'GjCQo', 'lwSYh': "gEvkv", ... };
if (f["NjnDJ"](f['EJTjg'], f["EJTjg"])) { ... }      // 内联之前：肉眼看不出恒假
```

内联（§六第 4 步）之后它退化成一个**字面量自比**的 `if`：

```
if ("GjCQo" !== "GjCQo") { ...死代码... } else { ...活代码... }
if ("gEvkv" !== "gEvkv") { ...死代码... } else { ...活代码... }
```

⇒ **判据：源码里出现 `if ("X" !== "X")` / `if ("X" === "X")`（同一个字面量自比）就是「代理对象没还原」的指纹。**
处置与 `obfuscator-io-four-step-pipeline.md` §4.1 的「剪假分支」完全相同：**恒假取 `else` 臂**。
未内联前的同型指纹也认：`if (f['cd'](f['gh'], f['gh']))` —— 两个实参是**同一个**成员表达式。

**② ★ 解码函数的识别启发式（标识符不是 `_0x` 前缀时用它）。**

源文口径（原话「基本是 a1-aa 之类的，b1-bb 之类的两位字符串，a 或者 b 开头」）：
**函数名长度为 2 + 以 `a` 或 `b` 开头 + 只接 1 个参数**。
这一条补上了 §二「标识符不用 `_0x`/`0x` 前缀」留下的空白（那里只说「别依赖命名」，没给「那靠什么认」）。

> ⚠️ 源文那行条件有**运算符优先级缺陷**：
> `(name && name.length==2 && name.substr(0,1)=='a') || (name && …=='b') && curNode.arguments.length === 1`
> —— `&& curNode.arguments.length === 1` **只跟 `b` 那一支结合** ⇒ `a` 开头的**多参**调用会被一并替换掉。
> 本库落地写成 `(name.length === 2 && /^[ab]/.test(name)) && args.length === 1`。

**③ 两趟顺序与收尾**

- 源文顺序：**先 `funToStr`（解码函数调用 → 字符串字面量），再 `callToStr`（对象属性引用内联）**；
  与 `obfuscator-io-four-step-pipeline.md` §1 的「S1 → S2」同源（顺序依赖的理由见那一节）。
- 第二趟遍历 `VariableDeclarator` 里 `init` 是 `ObjectExpression` 的节点：属性值是**函数**且函数体首句是
  `return` ⇒ 按返回表达式的**返回类型**分别内联（`BinaryExpression` / `LogicalExpression` / `CallExpression`，
  分别对应实参 2 / 2 / ≥1，`CallExpression` 情形**实参整体左移一位**）；属性值是**常量** ⇒
  把 `MemberExpression` 直接换成 `StringLiteral`；处理完 `path.remove()` 掉那个对象声明。
  （5 类返回值的完整表见 `obfuscator-io-four-step-pipeline.md` §3.2。）
- 收尾顺手两条：`!![] → true`、`![] → false`；别名（`var a4 = b; var a5 = b;`）先归一，见 §三。

**⚠️ 源文未解决项（不要写成「已能还原」）**

1. 该样本最大的控制流是**多个函数合并成的大型控制流，存在多个入口和出口**，源文自陈**还原不了**。
2. 源文产物里仍留着**未被展开的 `eval(<字符串>)`**：业务逻辑被拆成多段源码字符串，
   由 `if (N == 'cca') … ? eval('var bb = b3, W = {…}; …') : ''` 这类**运行时条件**选中后执行
   （`'cca'` / `'ab'` / `'ch'` / `'cbc'` / `'by'` / `'xa'` / `'cza'` / `'cb'` 各一段）。
   通用 OB pass **不会**展开它 ⇒ 反混淆后见到「`eval` + 一段带 `\n` 的源码串」属**预期残留**，不是 pass 出错。

---

## 五、变体四：给解密函数套「外衣」函数

```js
function uu(a, b) { return _0xae0a(a + b); }
function nn(a, b, c) { return uu(a + b, c); }
function hi() { console[nn(0,'x',1)](nn(0,'x',0)); }
```

**外衣的识别特征**：函数体只有**一条 `return` 语句**，且实参是**常量**（数值/字符串/一元表达式）。

两条定位路线，建议**联合使用**：

1. 从外向内：找最外层外衣 → 逐个折叠；
2. 从内向外：先定位解密函数，一层层往上找，直到"调用参数是常量"的那层。

四个坑：

- **函数名与形参同名**（`function a(a, b, c)`）：AST 会把引用识别错，
  必须**先把 `params` 与 `body` 中与函数名同名的参数改名**再处理。
- **嵌套层级深、作用域交错** ⇒ 引入沙箱隔离（`references/sandbox-evaluator.md`）。
- 折叠顺序错了会**静默失败**（函数体被清空而不报错），改完必须 diff 输出。
- 折叠后节点被替换，**AST 结构已变** ⇒ 后续 visitor 可能找不到节点。

---

## 六、工程化「主动调用」路线（最通用的一招）

对"看不懂但确定是同一个函数"的强混淆（如风控指纹生成），**不要求还原算法，只要求拿到结果**：

**思路**：把混淆代码整体加载进内存 → 把目标函数**导出** → AST 遍历时把参数喂进去**主动调用** → 用返回值替换节点。

四步配方（实测于某大厂 WAF 壳，`B3` 是字符串解密函数、`B` 是运算/调用字典）：

```js
// 0) 把混淆源码压缩后放进补环境框架（或直接用 playwright 在原页面执行），把目标函数导出
//    var B3 = myExports.B3;

// 1) 静态计算数值混淆：0x42e * -0x6 + 0x25c8 + -0xcb4 → 一个数
traverse(ast, {
  BinaryExpression(path) {
    const { confident, value } = path.evaluate();      // ★ Babel 内置静态求值
    if (!confident) return;                            // 含变量/动态值 → 不碰
    if (typeof value === 'string') path.replaceWith(t.stringLiteral(value));
    else if (typeof value === 'number') path.replaceWith(t.numericLiteral(value));
  }
});

// 2) 内联「数值字典」：Pm.B / Pm.T 这类对象属性实为整数
traverse(ast, {
  VariableDeclarator(path) {                           // 收集 {对象名.键: 数值}
    const { id, init } = path.node;
    if (!t.isIdentifier(id) || !t.isObjectExpression(init)) return;
    init.properties.forEach(p => {
      if (t.isObjectProperty(p) && t.isIdentifier(p.key) && t.isNumericLiteral(p.value))
        numberMap[`${id.name}.${p.key.name}`] = p.value.value;
    });
  }
});
traverse(ast, {
  MemberExpression(path) {                             // 替换 Pm.B → 2
    const { object, property } = path.node;
    const k = `${object?.name}.${property?.name}`;
    if (numberMap[k] !== undefined) path.replaceWith(t.numericLiteral(numberMap[k]));
  }
});

// 3) 分身归一 + 主动调用：dT(x)/ci(x)/... 其实都指向 B3
traverse(ast, {
  VariableDeclarator(path) {                           // 把别名全部改回 B3
    if (!t.isIdentifier(path.node.init) || path.node.init.name !== 'B3') return;
    const binding = path.scope.getBinding(path.node.id.name);
    if (!(binding && binding.constant && binding.references > 0)) return;
    binding.referencePaths.forEach(ref => ref.replaceWith(t.identifier('B3')));
    path.parent.declarations.length === 1 ? path.parentPath.remove() : path.remove();
  }
});
traverse(ast, {
  CallExpression(path) {                               // B3(数字) → 直接算出结果
    if (!t.isIdentifier(path.node.callee, { name: 'B3' })) return;
    if (path.node.arguments.length !== 1 || !t.isNumericLiteral(path.node.arguments[0])) return;
    const r = B3(path.node.arguments[0].value);
    if (typeof r === 'string') path.replaceWith(t.stringLiteral(r));
    else if (typeof r === 'number') path.replaceWith(t.numericLiteral(r));
    else if (typeof r === 'boolean') path.replaceWith(t.booleanLiteral(r));
  }
});

// 4) 还原「字典对象 B」：按 value 类型分类收集，再按类型替换引用
//    B['wICbM'](a,b) → a + b     （value 是 "return c + M" 形式）
//    B['LWatF']      → "acw_sc__v2"（value 是字符串）
//    B['lPpIn'](a,b,c) → a(b, c)  （value 是 "return c(M, s)" 形式）
```

**第 4 步的分类规则**（遍历 `B` 对象的属性）：

| value 形态 | 分类 | 替换方式 |
| --- | --- | --- |
| `StringLiteral` | `string` | `B[k]` → 字符串字面量 |
| `function(){ return c(M, s) }`（单 return，返回 `CallExpression`） | `call` | `B[k](f, x, y)` → `f(x, y)`（**首参当被调函数，其余当参数**） |
| `function(){ return c + M }`（单 return，返回 `BinaryExpression`） | `binary` | `B[k](a, b)` → `a <op> b` |

> 判据就是"**函数体只有一条 return**"，与 §5 外衣识别同源。
> **可运行实现见 `scripts/patterns/ob-variant-pass.js`**（`foldWrapperObjects` 走的就是这套
> 单-return-return 分类）；本节的四段代码是"能读懂"的最小示意，真要落到流水线请改专用 pass，
> 不要把示意代码直接塞进通用脚本。

**关键陷阱**：

- 第 1 步的 `path.evaluate()` 必须**先检查 `confident`**，否则会把含动态值的表达式算成 `NaN` 并写死进代码。
- 第 3 步导出函数时，**先把源码压缩再加载**，否则格式化检查语句会拦下来。
- 第 4 步的"首参当被调函数"规则只对**恰好是代理调用**的 value 成立；若 value 函数体里对参数做了
  变换（如 `return c(M + 1)`），套用该规则会漏掉 `+1`。区分办法：只有 `return` 的实参**原样透传**
  形参时才按代理处理，否则按"外衣函数"走 §5 的折叠流程。
- 每一步替换后都可能改变 AST 结构 ⇒ **每步单独跑、单独 diff**，不要一口气串完再看。

---

## 七、收尾习惯（这条最容易忘）

1. 每个 visitor 结尾考虑 `path.crawl()`：节点被替换后 AST 结构变了，
   不加会导致**下一个 visitor 找不到节点**（静默漏解）。
2. 每阶段输出都要能**单独运行和排查**；不要做成一个大而全的一次性脚本。
3. 还原目标定在"**简化到能看/能用**"即可。绝大多数混淆壳大同小异，
   不必追求 100% 还原（某案例最终只去掉 4 类混淆就已经可读）。
4. 处理前先确认输入是**压缩态**：如果源码已经被格式化过且带检查语句，先压回去。

---

## 八、变体五：伪 OB —— 有大数组但"没有取舍"

判据三条**同时看**：

1. 有大数组 + `_0x…[数字]` 取值；
2. **没有数组移位**（无 `(function(a,b){while(--b){a.push(a.shift())}}(arr, N))` 这类自选取/移位）；
3. **没有解密函数**（同一个下标每次取值都得到同一个字符串）。

三条齐 ⇒ 这不是"被改造的 OB"，而是**换名 + 大数组取值 + 编码字符串**的浅壳。
**不要走"主动调用"路线**（§六）：它假设存在"必须执行才知道结果"的解密函数，对浅壳只增加失败面。
直接按下标取值即可。

来源实例（B19）：螺丝帽 `captcha.js` / `widget.js` / `frame.js` —— 三份同一个壳，来源原话
"没有 OB 混淆里的打乱数组的操作，比 OB 混淆要简单很多"。

**反例（必须记住）**：`52pojie-2052600`（某初滑块）**不是**伪 OB —— 来源明确写了
"三要素：大数组、数组移位函数、解密函数"，它**会**命中 §一 的标准 OB 检测基线，按真 OB 处理。
⇒ **判据 2 和 3 必须逐条去源码里找"有没有"**，不能因为"看着只是个编码壳"就跳过（本批差点写错这条）。

三条可复用的 pass（顺序固定）：

1. **大数组取值 → 字面量**：`eval(generate(ast.program.body[0]).code)` 把数组加载进内存，
   遍历 `MemberExpression`，`object.name === <数组名>` 时
   `replaceWith(types.stringLiteral(eval(path.toString())))`。
   - 先判"它到底是不是数组"：**大数组 ≠ 模块表**。判据见
     `../../webpack-bundle-extraction/references/bundler-identification.md`（模块表/字符串字典的第二种证据）。
2. **编码字符串还原**：`StringLiteral` 的 `node.extra` 存在且 `raw` 含 `\x` / `\u` 时，三选一（三者等价）：
   `node.extra = undefined`、`node.extra.raw = '"' + node.value + '"'`、`delete node.extra.raw`。
   数字同理：`/^0[obx]/i.test(node.extra.raw)` 时清掉 `extra`。
   输出建议 `generate(ast, {jsescOption: {minimal: true}}).code`。
3. **属性访问还原**：`MemberExpression.property` 是 `StringLiteral` 且 `value !== ""` 时
   `computed = false` + `property = types.identifier(value)`（`obj["Number"]` → `obj.Number`）。

配套：伪 OB 常与"对象字典"叠加（`obj[funcName](args)`），那一层按 §四 字典混淆处理，不要把两件事混在一个 pass 里。

## 九、"可读产物"与"可替换产物"是两种产物（B19 硬结论）

同一份源码经常要出两个**互相不能替代**的产物：

| 产物 | 用途 | 特征 |
| --- | --- | --- |
| 可读产物 | 跟值、找调用链、写笔记 | 降层（多层 `switch` → 单层）、格式化、加注释 |
| 可替换产物 | 塞回浏览器替换原文件 | **与原始字节同形态**：单行、不美化、不降层 |

两条实测依据：

- **格式化会让加密 key 变**：数美 `isJsFormat` 一旦判定"已被格式化"，把 key 换成「时间戳 + 域名」⇒ 提交必失败
  （见 `../../web-verify-patcher/references/slider-vendor-matrix.md` §3.3）。
- **降层会因作用域失效**：阿里 227 把"多层 `switch`"降成"单 `switch`"后**无法替换浏览器里的原代码**，
  但用于向上跟值极具价值——多层嵌套时要同时跟多个状态变量，单层只要搜 `li = <目标 case>` 再逐个下断
  （见同文件 §3.15）。

落地约定：两个文件分开存（如 `*.readable.js` / `*.patch.js`），笔记里写明"哪个给谁用"。
**别拿可读产物去替换，也别拿可替换产物去跟值。**

### 本节反例清单

- ❌ 见到 `_0x` 就判 OB 并直接上"主动调用"路线 —— 先跑 §八 的三条判据。
- ❌ 用 `grep` 统计 `_0x` 出现次数当"混淆强度" —— 伪 OB 的 `_0x` 密度与真 OB 一样高，该指标没有区分力。
- ❌ **先格式化再做字符串还原**：`node.extra.raw` 已被 prettier 重写，第 2 条 pass 会静默失效（顺序必须是先还原、后美化）。
- ❌ 只产出一个"可读产物"，然后拿它去替换页面文件（数美、阿里 227 都会失败，且报错不指向真正原因）。

---

## 十、变体六：「运算符字典 + `arguments` 顺序改写」（数美族）

**这是本文件七类变体之外的两条独立信号**，B42 由 `52pojie-1104122` 补入，与前三段的"数组 + 解密函数"是**叠加**关系：

| 信号 | 形态 | 处置 |
| --- | --- | --- |
| **运算符字典** | `var D = { 'yZA': function(a,b){return a===b;}, … }`，源码里到处是 `D['yZA'](x, y)`；**字典条目可再查上一层字典**；value 也可以是"转发调用" | 解析出 `{key → (二元运算符 \| 转发)}` 两张表，用 esprima 递归替换；**复现时要给每个操作数加括号**（连续调用有优先级问题）。**多行函数体直接跳过**（源文的取舍） |
| **`arguments` 原地改写** | `for (…) if (typeof arguments[i] === 'string') arguments[i] = arguments[i].split("").reverse().join("")`；再 `for (…) 交换 arguments[i] ↔ arguments[len-1-i]` | ★★ **"传进去的参数没错、函数里读到的错位"就是这个**。**最省事做法：在参数被改写完之后下断点，直接抄 `arguments`**，不要在调用点猜顺序 |
| **`switch` 平坦化的 `runLine`** | `var runLine = "4\|1\|0\|5\|3\|2".split('\|'), step = 0; while(!![]) switch(runLine[step++]) {…}` | ★★ **这个字符串就是执行顺序** ⇒ 按它展开成线性语句即可（与 `control-flow-reduction-rules.md` 同族） |

> ★★★ **顺序判据**：字典替换与 `runLine` 展开**都只依赖"当前表达式"**，可以互相独立地做；
> 但 **`arguments` 反转是"运行时行为"**，**不可能靠静态替换还原** ⇒
> **必须靠"断点抄值"**。⇒ **不要试图用 AST 去还原参数顺序。**
>
> 站点细节、以及"自写 base64 但码表是标准的"这类**"实现非标、数据标准"**的坑，
> 见 `patterns/shumei.md`。
