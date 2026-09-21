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
