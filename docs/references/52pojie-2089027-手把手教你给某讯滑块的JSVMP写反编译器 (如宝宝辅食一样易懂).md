# 手把手教你给某讯滑块的JSVMP写反编译器 (如宝宝辅食一样易懂)

> **作者**: Command | **发布时间**: 2026-01-27 17:49:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6526 / 50
> **原文**: [https://www.52pojie.cn/thread-2089027-1-1.html](https://www.52pojie.cn/thread-2089027-1-1.html)

---

### 前言

`文章中所有内容仅供学习交流使用，不用于其他任何目的，禁止用于商业和非法用途，否则由此产生的一切后果与作者本人无关。`

本反编译器针对防水墙`TDC.js`的JSVMP, 先给大家上个图片看一下反编译后的效果 (恕我不能全放出来, 全部反编译完有2500多行, 太多了)

![](https://attach.52pojie.cn/forum/202601/27/174911vgsja37stlssshv4.png)

![](https://attach.52pojie.cn/forum/202601/27/174919mjbtjw1zzwpkm1u1.png)

### 预备知识

* JSVMP简单说就是将JS代码通过自己实现的编译器编译到字节码形式, 使用时通过自己实现的VM(虚拟机)运行字节码
* JSVMP的代码里通常没有具体逻辑, 就是一个大数组然后不断跑循环, 一般的虚拟机都是基于栈/堆栈的
* 一般来说, 目前逆向JSVMP都是通过插桩打日志然后硬看 (大概是吧)
* 注意: TDC的指令会进行乱序处理, 每一次的指令数组会被打乱重排

## 虚拟机分析

### 解密字节码

![](https://attach.52pojie.cn/forum/202601/27/174952bxltry1t8q180r3r.png)

直接把这个自执行函数和上面用到的的函数扣下来即可, 放到控制台就能得到指令字节码(一个大数组)

### VM简单看一眼

```
function __TENCENT_CHAOS_VM(PC, Codes, Stack) {
  var Z = !Stack,
    ErrCB = [], // Try (异常时会从中获取设置)
    Stack = Stack || [[this], [{}]], // VM栈
    G = null; // 异常变量

  for (
    var B = [func1, func2, func3...... /* 指令这会先不看 */]; ;
  )
    try {
      for (var A = !1; !A; ) A = B[Codes[PC++]](); // 从指令表中读取并执行, 返回True时停止执行(return或throw)
      if (G) throw G;
      return Z
        ? (Stack.pop(), Stack.slice(3 + __TENCENT_CHAOS_VM.v))
        : Stack.pop(); // 返回值, 一般执行完后直接从栈中pop
    } catch (X) { // 异常处理
      var o = ErrCB.pop(); // 从异常处理栈中获取 [跳转的位置, 栈高度, 异常变量存放位置(可选)] 并设置
      if (o === undefined) throw X; // 如果没有try catch处理该异常, 则继续抛
      ((G = X), // 保存异常变量
        (PC = o[0]),
        (Stack.length = o[1]),
        o[2] && (Stack[o[2]][0] = G));
    }
}
```

从这里我们可以看到, 一共有两个栈 (混合栈`Stack`, 异常栈`ErrCB`), 并且没有其他的寄存器, 堆等;

**混合栈Stack在此既充当了作用域内存(存储变量), 又充当了操作数栈(用于计算)**

### VM指令分析

#### 让函数数组更易读

```
var D = [function() {w[w.length - 2] = w[w.length - 2] == w.pop()}
        ,,function() {w[w.length - 1] = E[w[w.length - 1]]},
        function() {w.push(w[j[I++]][0])}
        /*......*/ ]
```

原先的数组中会出现`,,`在数组中插入空白干扰, 且数组形式不方便知道当前指令的索引

不妨写代码使用Babel进行处理 (需提前NPM安装依赖)

```
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const t = require("@babel/types");

const code = ``; // 将函数数组代码放在这里

const ast = parser.parse(code, {
  sourceType: "unambiguous",
});

traverse(ast, {
  ArrayExpression(path) {
    const elements = path.node.elements;
    if (path.node.elements.length > 10) {
        // console.log(elements)
        const properties = elements.map((el, idx) =>{
            if (el !== null) {
                return t.objectProperty(
                    t.numericLiteral(idx),
                    el
                )
            } else {
                return undefined
            }
            }
        ).filter((X) => X);
        const obj = t.objectExpression(properties);
        path.replaceWith(obj);
    }

  }
});

const output = generator(ast, {
  minified: false,
  comments: false,
}).code;

console.log(output);
```

经处理后即可得到

```
var D = {
  0: function () {
    w[w.length - 2] = w[w.length - 2] == w.pop();
  },
  2: function () {
    w[w.length - 1] = E[w[w.length - 1]];
  },
  3: function () {
    w.push(w[j[I++]][0]);
  }
  /* ...... */
}
```

#### 栈中变量存储&引用

个人认为此部分是这个VM比较难理解的地方, 理解这里之后基本上写反编译器就没啥问题了.

他难理解就难理解在, **变量不是直接以值的形式存储在栈的索引上, 而是被包裹在一个数组中(BOX), 就像这样**

```
Stack[index] = [ value ] // 实际值被包裹住, 应该是为了引用传递 (函数中会复制栈), 避免内部修改变量后无法从外部获取更新的值
```

**以下是与变量&引用有关的指令(由于字节码会改变, 故不再展示字节码):**

变量声明 (相当于`var XXX;`, 提前占位):

```
function () {
    var Z = Codes[PC++]; // 操作数: 变量在栈上的索引
    Stack[Z] = Stack[Z] === undefined ? [] : Stack[Z];
}
```

创建变量引用 (注: **这里不会创建一个值为数字的变量**):

```
function () {
    // 引用栈上变量
    Stack.push([Codes[PC++]]); // 将变量索引包装后PUSH
}
```

根据引用赋值:

```
function () {
    // 设置变量 (数字引用找变量, 然后复制)
    // Stack.length-2 是上文创建的变量引用, Stack.length-1 是要赋的值 (复制后并不会删除, 与AssignmentExpression行为一致)
    Stack[Stack[Stack.length - 2][0]][0] = Stack[Stack.length - 1];
}
```

变量读取:

```
function () {
    // 读变量
    // 操作数: 变量在栈上的索引
    Stack.push(Stack[Codes[PC++]][0]);
},
```

结合函数定义(指令):

```
function () {
    // ...
    Stack.push(function Q() {
        var Z = W.slice(0); // 复制栈
        ((Z[0] = [this]),   // this变量
        (Z[1] = [arguments]), // arguments变量
        (Z[2] = [Q]));      // 函数自身 变量 (在大多数情况下会被直接覆盖占用)
        // ...
        return __TENCENT_CHAOS_VM(G, Codes, Z);
    });
},
```

**不难得到如下栈布局:**

![](https://attach.52pojie.cn/forum/202601/27/174938krerr7ynzcys865n.png)

(~~诶你说是哪个天才想到这么整的~~)

#### 成员引用/访问 (MemberExpression)

(这里也挺抽象的, 第一次接触很容易就一脸懵)

当VM执行类似 `obj.prop` 的操作时, 它不会直接把 `prop` 的值压栈并读取, 而是把一个数组压栈(创建一个引用), 直接按`MemberExpression`就好, 此数组不会被存储为变量:

```
[Object /* 目标对象 */, PropertyName /* 属性名称 */]
```

**以下是与此有关的指令(由于字节码会改变, 故不再展示字节码):**

创建成员引用:

```
function () {
    // MemberExpression, 成员引用 [Object, Property]
    Stack.push([Stack.pop(), Stack.pop()].reverse());
}
```

读取变量然后创建成员引用:

```
function () {
    // 栈布局: [var1, var2.., 变量引用([n]), 属性名]
    var Z = Stack.pop(); // 属性名
    // 下方Stack.pop() 获取变量引用，Stack[...] 从变量引用读取变量
    Stack.push([Stack[Stack.pop()][0], Z]); // 压入 成员引用[变量值, 属性名]
}
```

读成员引用:

```
function () {
    var Z = Stack.pop(); // Z 是 [Object, Key]
    Stack.push(Z[0][Z[1]]); // 执行 Object[Key] 并将结果值压栈
}
```

赋值成员引用:

```
function () {
    // 从引用设置Property, 不会pop (与AssignmentExpression相符)
    var Z = Stack[Stack.length - 2]; // 获取栈顶下方的引用 [Object, Key]
    Z[0][Z[1]] = Stack[Stack.length - 1]; // 将栈顶的值赋给 Object[Key]
}
```

函数调用:

```
function () {
    // 调用函数, 但是MemberExpression -> CallExpression
    var Z = Codes[PC++], // 参数个数
        l = Z ? Stack.slice(-Z) : [], // 获取参数
        Z = ((Stack.length -= Z), Stack.pop()); // 弹出成员引用

    // Z[0] 是 Object, Z[1] 是 Key
    Stack.push(Z[0][Z[1]].apply(Z[0], l)); // 以Z[0]为this调用Z[0][Z[1]](l...)
}
```

链式访问:

```
function () {
    // 读MemberExpression并再MemberExpression (例 a.b .c)
    var Z = Stack.pop(), // 新的属性 (c)
        l = Stack.pop(); // 原引用 [a, b]
    // l[0][l[1]] 读a.b
    // 压入新的引用 [a.b(值), c]
    Stack.push([l[0][l[1]], Z]);
}
```

OK, 对虚拟机的分析到这里就结束了, 接下来直接开干!

## 反编译器编写

### 思路

**使用AST表示所有值**：不再PUSH具体的字面量, 而是使用 AST 节点 (如 `{type: 'Literal', value: 1}`),

**符号执行**：当虚拟机执行具体的操作时, 不计算结果, 而是生成与操作相对应的AST并正常放入栈中

(上面那俩是不是重复了, 说白了就是全套一层AST)

**分支探索**: 遇到有条件跳转时, 复制现场环境并递归探索另一条分支

**使用标记**: 对于被使用过的AST, 将它们从列表中隐藏, 用于区分中间产物`Expression`与结果`Expression`, `Statement`   (我知道你看不懂这个, 你往下看就知道了)

**警告, 下文假设你足够了解Javascript AST**

### 状态管理

在遇到分支/进入函数时, 需要保存现场, 并复制一份(用于递归调用, 走入另一条分支); 还需要留存AST, 用于最后生成代码

这时就要引入一个状态类

```
class VMState {
    // 位置, 栈, 异常栈, 变量数
    constructor(PC, Stack, ErrCB, VARCount = 0) {
        this.PC = PC
        this.Stack = Stack
        this.ErrCB = ErrCB
        this.VARCount = VARCount
        this.ASTs = [] // 存储AST (未被当做值引用的Expression和Statement, 这样可以分行)
    }

    // 复制一份
    Copy() {
        return new VMState(this.PC, [...this.Stack], [...this.ErrCB], this.VARCount)
    }

    // 获取临时变量名
    GetVARName() {
        return 'v' + this.VARCount++
    }
}
```

### 基础架构

符号执行, 启动!

```
class Symbolic {
    // 传字节码
    constructor(Codes) {
        this.Codes = Codes
        this.Visited = new Set() // 存储已经走过的PC, 防止重复执行
    }

    // Run
    Run() {
        let AST = this.ProcessBlock(new VMState(0, [[{type: 'ThisExpression'}], [{type: 'ObjectExpression'}]], []))
        // console.log(JSON.stringify(AST))
        console.log(escodegen.generate({type: 'Program', body: AST}))
    }

    // 一开始我是想分块然后做队列的, 结果好像也没分成... 直接递归了
    ProcessBlock(State) {
        let i = State.PC
        let Stack = State.Stack
        let Codes = this.Codes
        var Z;
        var l;
        let Expr;
        let LastI = 0 // 存储上一个PC
        Outside: while (i < this.Codes.length) {
            if (this.Visited.has(i)) {
                if (LastI > i) State.ASTs.push({type: 'Identifier', name: 'GOTO_' + i}); // 向上跳转的我没处理
                // 但是如果是向下跳转的可以不管, 因为另一条分支应该已经走到了
                break
            } else {
                this.Visited.add(i)
            }
            LastI = i
            switch (this.Codes[i++]) {
                // 指令处理
                // 我知道你最想要的是这部分, 但是你先别想
                default:
                    throw new Error('UNKNOWN ' + Codes[i-1])
                    console.log('UNKNOWN ',Codes[i-1])
                    break
            }
        }
        // 我下面会解释这里
        return State.ASTs.filter(X => !X.used).map(X => {
            if (X.type.endsWith('Statement') || X.type.endsWith('Declaration')) {
                return X
            }
            return {type: 'ExpressionStatement', expression: X}
        })
    }
}
```

**解释一下最后return那里**: 简而言之, 我将所有可能是最终语句的AST节点添加到State.ASTs中(节点与栈中是同一个Object), 如果执行过程中使用了此节点, 就将其标为`used`, 最后返回所有未被使用的节点, 他们就是每一行的根节点. 更形象的说:

```
ThisIsAVar = ThisIsAFun() // 先向栈中PUSH CallExpression, 再PUSH AssignementExpression
// 由于并没有办法区分该二者是否是单独的语句, 他会被反编译成这样:
ThisIsAFun()
ThisIsAVar = ThisIsAFun()
// 而当加入used标记后, 栈中的CallExpression在赋值被使用后会被标记为used, 然后会从State.ASTs中被清理掉, 而AssignementExpression未被使用, 因此可以确认AssignementExpression是单独的一个语句
```

**接下来的都是示例, 其他的你们留作课后练习, 自己写去!!!**

#### 表达式还原

注: 引入 `used` 标记. 因为栈中的节点可能是计算中间产物 (比如没人单独算加法然后不用他的值), 只有那些从未被使用的节点, 才是最终的“语句”

```
switch (this.Codes[i++]) {
    /* ... */
    // 这些指令数字会变, 你们根据自身情况填充
    case OPCodes.ADD: case OPCodes.SUB: case OPCodes.MULT: case OPCodes.DIV:
    case OPCodes.MOD: case OPCodes.AND: case OPCodes.OR: case OPCodes.XOR: case OPCodes.LSH:
    case OPCodes.RSH: case OPCodes.URSH: case OPCodes.SEQUAL:
    case OPCodes.EQUAL: case OPCodes.GE: case OPCodes.GEQ:
    {
        let right = Stack.pop();
        let left = Stack.pop();
        // 将栈中取下来的节点标记为已使用
        left.used = 1
        right.used = 1
        const opMap = {
            [OPCodes.ADD] :'+', [OPCodes.SUB]:'-', [OPCodes.MULT]:'*', [OPCodes.DIV]: '/', [OPCodes.MOD]: '%',
            [OPCodes.AND]: '&', [OPCodes.OR]:'|', [OPCodes.XOR]: '^', [OPCodes.LSH]:'<<', [OPCodes.RSH]:'>>', [OPCodes.URSH]:'>>>',
            [OPCodes.SEQUAL]: '===', [OPCodes.EQUAL]:'==', [OPCodes.GE]:'>', [OPCodes.GEQ]:'>='
        };
        const node = {type: 'BinaryExpression', left, right, operator: opMap[Codes[i-1]]};
        Stack.push(node); // 没有人会直接把比较结果扔在这不管, 所以不需要State.ASTs.push(Expr), Expr变量的作用是为了保证node一致性
    }
    break
}
```

### 变量与变量引用还原

```
switch (this.Codes[i++]) {
    /* ... */
    case OPCodes.VAR:
        Z = Codes[i++];
        l = {type: 'VariableDeclaration', declarations: [{type: 'VariableDeclarator', id: {type: 'Identifier', name: State.GetVARName()}, init: null}], kind: 'var'};
        Stack[Z] === undefined ? State.ASTs.push(l): 0;
        Stack[Z] = Stack[Z] === undefined ? l.declarations[0].id: Stack[Z];
        break
    case OPCodes.VAR_FROM_INTREF:
        l = Stack.pop()[0]  // 引用Index
        Z = Stack[l] || {type: 'Identifier', name: 'UNDEF_' + l} // 不知道为啥, 有时候会爆
        Z.used = 1
        Stack.push(Z)
        break
    case OPCodes.MAKE_INTREF: // 变量引用, 这里不需要当AST处理 (同样其他pop也是)
        Stack.push([Codes[i++]]);
        break
}
```

#### 函数还原

```
switch (this.Codes[i++]) {
    case OPCodes.FUNCTION:
        {
            for (var G = Codes[i++], W = [], Z = Codes[i++], l = Codes[i++], B = [], A = 0; A < Z; A++) W[Codes[i++]] = Stack[Codes[i++]];
            for (A = 0; A < l; A++) B[A] = Codes[i++];
            var Z = W.slice(0); // Stack
            // 如果你眼睛好的话应该能看出来上面三行我是直接从VMP复制过来的
            var nm = State.GetVARName() // 函数名
            Z[0] = {type: 'ThisExpression'},
            Z[1] = {type: 'Identifier', name: 'arguments'},
            Z[2] = {type: 'Identifier', name: nm};
            var co = 0;
            for (var l = 0; l < B.length; l++) // 原先这里还有< arguments.length, 我这里默认按照最多参数处理
                0 < B[l] && (Z[B[l]] = {type: 'Identifier', name: 'a' + ++co}); // 这个改了一下
            var S1 = State.Copy()
            S1.Stack = Z
            S1.PC = G

            var cnmb = [] /* 嗯对求我当时的精神状态 */
            for (var awa = 0; awa < co; awa++) {
                cnmb.push({type: 'Identifier', name: 'a' + (awa+1)})
            }
            if (!this.Visited.has(i)) { // 考虑边界情况
                this.Visited.add(i)
                State.ASTs.push({type: 'FunctionDeclaration', id: {type: 'Identifier', name: nm}, body: {type: 'BlockStatement', body: this.ProcessBlock(S1) /* 递归 */}, params: cnmb});
                this.Visited.delete(i)
            } else {
                State.ASTs.push({type: 'FunctionDeclaration', id: {type: 'Identifier', name: nm}, body: {type: 'BlockStatement', body: this.ProcessBlock(S1)}, params: cnmb});
            }

            Stack.push({type: 'Identifier', name: nm}) // 函数实际作为Identifier PUSH
        }
        break
}
```

#### 控制流还原

终于到了万众瞩目的控制流部分!

我在这里假定所有的`WhileStatement`(While循环)被编译出来都是(事实上我没考虑Break, Continue, 还有欠缺):

```
Loop:
; ... 条件代码 ...
JZ  LoopEnd(不管是JZ还是JNZ吧)
; ... 循环中的代码 ...
JMP Loop
LoopEnd:
......
```

代码如下:

```
switch (this.Codes[i++]) {
    case OPCodes.JZ: // 嘶, 其实我也不知道是JZ还是JNZ, 反正是个有条件跳转就是了
        var S1 = State.Copy()
        S1.PC = Codes[i++]
        Stack[Stack.length - 1].used = 1
        Expr = {type: 'IfStatement', test: Stack[Stack.length - 1], consequent: {type: 'BlockStatement', body: this.ProcessBlock(S1)}, alternate: null} // 满足条件跳走
        State.ASTs.push(Expr)
        break
    case OPCodes.JMP:
        Z = i
        i = Codes[i++];
        if (i < Z && this.Visited.has(i) && State.ASTs.some(X => X.type === 'IfStatement')) { // JMP上跳为循环
            Expr = State.ASTs.pop()
            var Exprs = [Expr]
            while (Expr.type !== 'IfStatement') {
                Expr = State.ASTs.pop()
                Exprs.push(Expr)
            }
            Expr = Exprs.pop()
            State.ASTs.push({type: 'WhileStatement', test: Expr.test, body: {type: 'BlockStatement', body: Exprs.reverse()}}) // 直接处理为WhileStatement
            State.ASTs = State.ASTs.concat(Expr.consequent.body)
        }
        break
}
```

## 碎碎念

2026, 又是新的一年, 新能力GET! 没想到我不仅能写JSVMP, 我还能写反编译器, 嘿嘿!

~~话说, 以我目前的能力, 能上班吗 ( (~~

马上就是高中阶段第一个寒假, 难得能抽出时间 :) :)
