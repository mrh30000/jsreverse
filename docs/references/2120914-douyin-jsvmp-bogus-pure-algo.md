# 某音 JSVMP bogus纯算

> **作者**: 李恒道 | **发布时间**: 当前离线 | **版块**: 『脱壳破解区』 | **查看/回复**: 4016 / 50
> **原文**: [https://www.52pojie.cn/thread-2120914-1-1.html](https://www.52pojie.cn/thread-2120914-1-1.html)

---

* 本帖最后由 李恒道 于 2026-8-3 18:02 编辑 *

根据代码进行调试可以发现J是vmp的装载器

```

```

function J(t, r, e, n) {
return (
Z.length ||
(function (t) {
var r = (function (t) {
for (var r = atob(t), e = 0, n = 4; n < 8; ++n)
e += r.charCodeAt(n);
return { d: C(Uint8Array.from(r.slice(8), _, e % 256)), i: 0 };
})(t);
((Z.length = 0), (z.length = 0), V.clear());
for (var e = W(r), n = 0; n < e; ++n) Z.push(K(r));
var o = W(r);
for (n = 0; n < o; ++n) {
for (
var i = W(r),
u = Boolean(W(r)),
s = new Array(),
c = W(r),
a = 0;
a < c;
++a
)
s.push([W(r), W(r), W(r), W(r)]);
for (var f = new Array(), l = W(r), p = 0; p < l; ++p)
f.push(W(r));
z.push([f, i, u, s]);
}
})(
"字符串",
),
X(z[t], r, e, n)
);

```

```

实际的执行器在function X(t, r, e, n)，看代码首先内部会执行g函数进行初始化

o为指令流，i为严格模式判断，s是变量表，数组0是外层作用域，1是arguments，2开始拷贝参数

u，异常处理表，a，pc指针，f，异常处理状态，l异常对象

```

```

function g(t, r, e, n) {
var p = Math.min(e.length, t[1])
, v = {};
Object.defineProperty(v, "length", {
value: e.length,
writable: !0,
enumerable: !1,
configurable: !0
}),
o = t[0],
i = t[2],
u = t[3],
s = [n, v];
for (var h = 0; h < p; ++h)
s.push(e[h]);
if (i)
for (c = r,
h = 0; h < e.length; ++h)
v[h] = e[h];
else {
c = null == r ? globalThis : Object(r);
var g = function(t) {
t < p ? Object.defineProperty(v, t, {
get: function() {
return s[t + 2]
},
set: function(r) {
s[t + 2] = r
},
enumerable: !0,
configurable: !0
}) : v[t] = e[t]
};
for (h = 0; h < e.length; ++h)
g(h)
}
a = 0,
f = 0,
l = void 0
}

```

```

初始化后开始进入d函数进行执行，这里vmp为了混淆判断分支流，用了大量的if，我们可以用ast拍平变成switch-case结构

```

```

// 根据指定 opcode，从原始 if/else 分发树里取出真正会执行的 handler。
function resolveStatementForOpcode(statementNode, opcodeValue) {
if (types.isIfStatement(statementNode)) {
let matched;

try {
matched = evaluateTest(statementNode.test, opcodeValue);
} catch {
// handler 内部也可能有普通业务判断，例如：
//
//   if ("function" != typeof n) ...
//
// 这种判断和 opcode t 无关，不能静态选择分支，必须原样保留。
return [types.cloneNode(statementNode, true)];
}

const next = matched ? statementNode.consequent : statementNode.alternate;

if (!next) {
return [];
}

return resolveStatementForOpcode(next, opcodeValue);
}

if (types.isBlockStatement(statementNode)) {
return statementNode.body.flatMap((item) =>
resolveStatementForOpcode(item, opcodeValue),
);
}

if (types.isExpressionStatement(statementNode)) {
return [
types.expressionStatement(
simplifyExpression(statementNode.expression, opcodeValue),
),
];
}

if (types.isReturnStatement(statementNode)) {
const cloned = types.cloneNode(statementNode, true);

if (cloned.argument) {
cloned.argument = simplifyExpression(cloned.argument, opcodeValue);
}

return [cloned];
}

// 其他语句类型暂时原样克隆。
// 如果后续遇到不准确的 case，再针对那个结构补处理逻辑。
return [types.cloneNode(statementNode, true)];
}
function evaluateTest(testNode, opcodeValue) {
if (!types.isBinaryExpression(testNode)) {
throw new Error(`暂不支持的条件类型：${testNode.type}`);
}

const left = testNode.left;
const right = testNode.right;
const operator = testNode.operator;

// 支持 t < number。
if (isOpcodeIdentifier(left)) {
const rightValue = numericValue(right);

if (rightValue === undefined) {
throw new Error(`条件右侧不是数字：${generator(testNode).code}`);
}

switch (operator) {
case "<":
return opcodeValue < rightValue;
case "<=":
return opcodeValue <= rightValue;
case ">":
return opcodeValue > rightValue;
case ">=":
return opcodeValue >= rightValue;
case "===":
case "==":
return opcodeValue === rightValue;
case "!==":
case "!=":
return opcodeValue !== rightValue;
default:
throw new Error(`暂不支持的操作符：${operator}`);
}
}

// 支持 number === t / number !== t。
if (isOpcodeIdentifier(right)) {
const leftValue = numericValue(left);

if (leftValue === undefined) {
throw new Error(`条件左侧不是数字：${generator(testNode).code}`);
}

switch (operator) {
case "<":
return leftValue < opcodeValue;
case "<=":
return leftValue <= opcodeValue;
case ">":
return leftValue > opcodeValue;
case ">=":
return leftValue >= opcodeValue;
case "===":
case "==":
return leftValue === opcodeValue;
case "!==":
case "!=":
return leftValue !== opcodeValue;
default:
throw new Error(`暂不支持的操作符：${operator}`);
}
}

throw new Error(`条件里没有 opcode 变量 t：${generator(testNode).code}`);
}

```

```

处理完成后得到了

```

```

function d() {
for (;;) {
// 读取当前 opcode，并让 pc 后移一位。
var t = o[a++];

switch (t) {
case 0:
// opcode 0: handler 逻辑省略
break;

case 1:
// opcode 1: handler 逻辑省略
break;

case 2:
// opcode 2: handler 逻辑省略
break;

case 3:
// opcode 3: handler 逻辑省略
break;

case 4:
// opcode 4: handler 逻辑省略
break;

case 5:
// opcode 5: handler 逻辑省略
break;

case 6:
// opcode 6: handler 逻辑省略
break;

case 7:
// opcode 7: handler 逻辑省略
break;

// ...

case 75:
// opcode 75: handler 逻辑省略
break;

default:
// 未知 opcode / 默认处理逻辑
break;
}
}
}

```

```

可以看到一共75个opcode+fallback code，这个时候一定要替换文件测试一下，确保算法依然是正常的

关于ast处理vmp目前主要分为三类

1.纯静态生成，读取opcode+对应参数，直接脱离网页的代码和执行逻辑，静态decompile，给到夯

2.解释器改造为生成器，会处理opcode的时候直接修改原stack代码，实现还原，破坏了原来的基本流程，需要较高的代码能力去核对

3.采用旁路式，在执行代码的同时执行ast代码，更利于调试和逆向分析

这里采用旁路式，那我们需要在浏览器环境下引入一个ast的sdk

```

```

import * as types from "@babel/types";
import generateModule from "@babel/generator";

const generator = generateModule.default || generateModule;

globalThis.AST = {
types,
generator,
generate(node, options) {
return generator(node, options).code;
},
};

```

```

构建出ast_bundle.js，这里推荐制作一个脚本猫脚本来自动注入提供环境

构造完验证一下

```

```

window.**AST_SDK_INJECTED**
AST.generate(AST.types.stringLiteral("dfp"))
'"dfp"'

```

```

接下来处理opcode，大部分都是比较简单的，例如opcode 24是v[p] = typeof v[p];，从堆栈取出来一个值进行typeof然后塞回去，我们就写一下对应的ast代码就可以

```

```

case 24:
// opcode 24
// 原逻辑：对当前栈顶做 typeof，结果覆盖当前栈顶。AST：生成 UnaryExpression 'typeof'。
v[p] = typeof v[p];
if (__astTypes) {
var__astArg = __astStack[__astP];
__astStack[__astP] = __astTypes.unaryExpression("typeof",__astArg, true);
}
break;

```

```

同样类似的还有

```

```

case 21:
// opcode 21
// 原逻辑：弹出右值 E，对当前栈顶做减法 -=。AST：生成 BinaryExpression '-'。
E = v[p--], v[p] -= E;
if (__astTypes) {
var__astRight = __astStack[__astP--];
var __astLeft =__astStack[__astP];
__astStack[__astP] =__astTypes.binaryExpression("-", __astLeft,__astRight);
}
break;

```

```

一些基础的CRUD的opcode大约40个，全部处理完还有30多个没处理，我们要靠debugger去分析对应代码，可以把没处理的顶部都加一个debugger，以便调试

这里有一个需要注意的就是case 63是一个递归调用，这里我们主要目的是跟踪，所以不进行处理，只制造一个空function表示，如果有需求后续考虑加强代码递归调用

```

```

E = D(o[a++], s), v[++p] = E;

```

```

这些都是比较简单的，剩下的一些就是cfg bound的处理了

目前也是有两种处理方案

1.按看雪的<https://bbs.kanxue.com/thread-276268-1.htm> 文章，如果遇到if就开始创建一个block

同样结构是这样的

```

```

如果 xxx >10 为false则跳转语句B
语句A
跳转语句C
语句B
语句C

```

```

所以无论如何，读取跳转语句的last语句，即可直到该分支的结束位置，为了防止递归，最好用stack处理

2.运行时收集数据结构，生成完整pc状态机，后续可以识别各种分支以便进行美化，例如

```

```

function _vm_func_12(args_0, args_1) {
var pc = 0;
var stack = [];
var sp = -1;

while (true) {
switch (pc) {
case 0:
...
pc = 8;
break;

case 8:
...
if (cond) pc = 20;
else pc = 10;
break;

case 20:
...
return stack[sp];
}
}
}

```

```

我们其实这里也可以更折中一点，PC状态机的方案可以无视各种分支流的处理，也具有可读性，所以直接在执行过程中生成pc状态机，但不追求构建完整状态机，仅保证最小可用，缺点就是不会去判断什么时候分支流程结束，但是因为我们目标是还原，而非完美还原，所以到这里已经可以满足需求

例如

```

```

var x = o[a++],
S = v[p--],
P = [];
for (var j in S) P.push(j);
s[x] = [P, S];

```

```

我们可以构造出来

```

```

var __astOpcodePc = a - 1;
if (__astTypes) {
__astBeginOpcode(__astOpcodePc);
}
// opcode 3
var x = o[a++],
S = v[p--],
P = [];
for (var j in S) P.push(j);
s[x] = [P, S];
if (__astTypes) {
--__astP;
}
if (__astTypes) {
__astRecordNormalExit(a);
}

```

```

其中

```

```

function __astBeginOpcode(pc) {
__astCurrentPc = pc;
__astGetBlock(pc).executed = true;
}
function__astRecordNormalExit(nextPc) {
if (__astCurrentPc < 0) return;
var block =__astGetBlock(__astCurrentPc);
var lastExit = block.exits[block.exits.length - 1];
if (!lastExit) {
block.exits.push({
type: "next",
to: nextPc
});
}
}

```

```

这里注意当处理状态机的时候，那所有的opcode都要加上对应的信息桩

```

```

while (true) {
switch (pc) {
case 0:
pc = 1;
break;
case 1:
var _s0_3 = this;
_s0_2 = false;
pc = 4;
break;
case 2:
var _s0_2 = 1;
_s0_4 = [];
_s0_4 = "=";
_s0_3 = "";
_s0_3 = [];
_s0_3 = [];
_s0_3 = [];
_s0_4 = [];
_s0_4 = "=";
pc = 4;
break;
case 3:
Object.defineProperty({}, "name", {
value: "Other",
writable: true,
configurable: true,
enumerable: true
});
Object.defineProperty({}, "name", {
value: "Other",
writable: true,
configurable: true,
enumerable: true
});
Object.defineProperty({}, "name", {
value: "Other",
writable: true,
configurable: true,
enumerable: true
});
Object.defineProperty({}, "name", {
value: "Other",
writable: true,
configurable: true,
enumerable: true
});
Object.defineProperty({}, "name", {
value: "Other",
writable: true,
configurable: true,
enumerable: true
});
Object.defineProperty({}, "name", {
value: "Other",
writable: true,
configurable: true,
enumerable: true
});
if (_s1_8) {
pc = 12;
} else {
--sp;
pc = 5;
}
break;
case 4:
_s0_2 = location.href;
_s0_2 = window.outerWidth;
_s0_2 = window.outerWidth;
if (navigator.storage) {
--sp;
pc = 6;
} else {
pc = 16;
}
break;
case 5:
if (null == _s0_3) {
pc = 16;
} else {
--sp;
pc = 7;
}
break;
case 1827:
var _s0_93 = _s2_1.apply(undefined, [_s0_92, "s4"]);
pc = 1830;
break;
case 1833:
controlState = 2;
controlValue = _s0_93;
return;

```

```

生成了这样的状态机代码，然后根据返回值判断可以确定是bogus，接下来根据_s2_1的函数来看，因为目前没有做opcode 63 vm递归生成的映射处理，所以我们需要再处理一下，这些都是纯体力话，就不多赘述了，我们可以利用之前的opcode的执行记录pc来回溯目前首条执行时到底时哪个stack来形成关联

目前还有许多空跳，以及对普通流进行合并，这里我的方法是把所有的pc指针的case都塞到一个map里，然后进行排序，此时如果某一pc有多入口，则视为非普通语句，存在控制流，如果存在单一入口则视为普通语句，属于比较基本的呆呆的CFG Bound处理方法，这里要注意不能把存在两个入口的case进行合并

```

```

case 1820:
pc = 1823;
break;
// frame z[150]
// frame z[150]
case 1823:
pc = 1825;
break;
// frame z[150]
// frame z[150]
case 1825:
pc = 0;
break;
// frame z[150]
// frame z[150]

```

```

全部处理完就得到了类似于

```

```

case 1745:
var _s0_90 = _s1_20.apply(undefined, [_s0_88]);
pc = 0;
break;
// flow block 1788 [z[150]] merged=1788,1789,1792,1795
// frame z[150]
case 1788:
pc = 0;
break;
// flow block 1797 [z[150]] merged=1797,1799,1801
// frame z[150]
case 1797:
pc = 0;
break;
// flow block 1803 [z[150]] merged=1803,1806,1809,1812,1813,1816,1817,1820,1823,1825
// frame z[150]
case 1803:
var _s0_91 = _s2_2.apply(undefined, [String.fromCharCode.apply.apply(String.fromCharCode, [null, [211]]), String.fromCharCode.apply.apply(String.fromCharCode, [null, [].concat.apply([], [_s1_6.apply(undefined, [_s0_86]), _s1_6.apply(undefined, [_s0_90])])])]);
var _s0_92 = _s0_89 + _s0_91;
pc = 0;
break;
// flow block 1827 [z[150]] merged=1827,1830
// frame z[150]
case 1827:
var _s0_93 = _s2_1.apply(undefined, [_s0_92, "s4"]);
pc = 1833;
break;
// flow block 1833 [z[150]] merged=1833
// frame z[150]
case 1833:
controlState = 2;
controlValue = _s0_93;
return;
break;
}
}

```

```

这样的格式，接下来开始处理cfg bound，结合一下，我们就可以得到，这里是一个纯耐心的工作，需要尝试自己找规律，建 CFG，算支配树，找段内回边，然后把原来的代码拼回块里，因为代码多到爆炸，所以这里就省略了，同时处理后的代码槽位和调用有一些细节错误，应该是我处理的问题，需要仔细结合运行时比对，也让AI结合decompile的资料去分析字节码和cfg bound后的代码，结合后可以得出一个不错的效果

```

```

function recovered_z150_structured() {
// block pc 0
var _s0_12 = 11;
// block pc 14
if (window.onwheelx) {
// block pc 16
// block pc 22
if (window.onwheelx._Ax) {
// block pc 24
xxxxxxx
// block pc 52
if (_s0_13 === void 0) {
// goto pc 54 (external frame)
} else {
// block pc 59
// block pc 66
if (_s0_13.writable === false) {
// block pc 68
_s0_12 = 3;
// block pc 77
var_s0_14 = Date.now.apply(Date, []);
var_s0_15 = new_s2_3();
_s0_16 =_s2_4.apply(undefined, []);
// block pc 114
if (_s2_5.track.mode !== 0) {
// goto pc 116 (external frame)
} else {
// block pc 120
xxxxx
// block pc 250
if (navigator.vendorSubs === null) {
// block pc 259
if (_s0_11 === void 0) {
// goto pc 261 (external frame)
} else {
// block pc 266
// block pc 271
if (_s0_11.ink) {
// block pc 275
var_s0_22 =_s0_11.ink;
var_s0_23 = [3, 82];
var_s0_24 = 41;
var_s0_25 =_s0_10.split.apply(_s0_10, ["."]).map.apply(_s0_10.split.apply(_s0_10, ["."]), [_vm_func_151]);
var _s0_26 = (new Date().getTime.apply(new Date(), []) - 1721836800000) / 1000 / 60 / 60 / 24 / 14 >> 0;
var _s0_27 = _s1_21.apply(undefined, []);
var _s0_28 = 2;
// block pc 365
if (_s1_3 > 0) {
// block pc 367
_s0_28 = _s0_14 - _s1_3 + 3 & 255;
// block pc 383
var _s0_29 = _s0_14 & 255;
var _s0_30 = _s0_14 >> 8 & 255;
var _s0_31 = _s0_14 >> 16 & 255;
var _s0_32 = _s0_14 >> 24 & 255;
var _s0_33 = _s0_14 / 256 / 256 / 256 / 256 & 255;
var _s0_34 = _s0_14 / 256 / 256 / 256 / 256 / 256 & 255;
var _s0_35 = _s0_16 % 256 & 255;
var _s0_36 = _s0_16 / 256 & 255;
var _s0_37 = _s2_13.apply(undefined, [1, 0, 8, _s0_6, _s0_7, _s0_8, _s2_18.pageId, _s2_18.aid, "1.0.1.19-fix.01"]);
var _s0_38 = _s0_37["4"] & 255;
var _s0_39 = _s0_37["4"] >> 8 & 255;
xxxxxx
var _s0_50 = 3;
var _s0_51 = _s0_18[_s0_50];
// loop header pc 639, back-edge from pc 663
while (_s0_51 === 11) {
// block pc 647
// block pc 661
if (_s0_50 < _s0_19.length) {
// block pc 663
_s0_51 = _s0_18[_s0_50];
continue; // -> pc 639
} else {
break; // -> pc 675
}
}
// block pc 682
// block pc 690
if (_s0_37["4"] & 2) {
// goto pc 692 (external frame)
} else {
// block pc 697
var _s0_52 = _s0_19["10"];
var _s0_53 = _s0_19["19"];
var _s0_54 = 4;
var _s0_55 = _s0_19[_s0_54];
// block pc 734
if (_s0_55 === 8) {
// goto pc 736 (external frame)
} else {
// block pc 771
// block pc 779
if (_s0_37["4"] & 4) {
// goto pc 781 (external frame)
} else {
// block pc 786
var _s0_56 = _s0_21["11"];
var _s0_57 = _s0_21["21"];
var _s0_58 = 5;
var _s0_59 = _s0_21[_s0_58];
// block pc 823
if (_s0_59 === 12) {
// goto pc 825 (external frame)
} else {
// block pc 860
// block pc 868
if (_s0_37["4"] & 8) {
// goto pc 870 (external frame)
} else {
// block pc 875
var _s0_60 = _s0_22 & 255;
var _s0_61 = _s0_22 >> 8 & 255;
var _s0_62 = _s0_22 >> 16 & 255;
var _s0_63 = _s0_22 >> 24 & 255;
var _s0_64 = _s0_22 / 256 / 256 / 256 / 256 & 255;
var _s0_65 = _s0_22 / 256 / 256 / 256 / 256 / 256 & 255;
var _s0_66 = _s0_12;
xxxxxx

var _s0_75 = {};
var _s0_76 = _s1_13.apply(undefined, [_s0_75]);
var _s0_77 = _s1_12.apply(undefined, [_s0_76]);
var _s0_78 = _s0_77.length;
var _s0_79 = _s0_78 & 255;
var _s0_80 = _s0_78 >> 8 & 255;
var _s0_81 = (_s0_14 + 3 & 255) + ",";
var _s0_82 = _s1_12.apply(undefined, [_s0_81]);
var _s0_83 = _s0_82.length;
var _s0_84 = _s0_83 & 255;
var _s0_85 = _s0_83 >> 8 & 255;
var _s0_86 = _s2_37.apply(undefined, [_s0_8.searchParams.toString.apply(_s0_8.searchParams, []), _s0_2]);
var _s0_87 = _s0_86["0"] ^ _s0_86["1"] ^ _s0_86["2"] ^ _s0_86["3"] ^ _s0_86["4"] ^ _s0_86["5"] ^ _s0_86["6"] ^ _s0_86["7"] ^ _s0_24 ^ _s0_26 ^ _s0_27 ^ _s0_28 ^ _s0_29 ^ _s0_30 ^ _s0_31 ^ _s0_32 ^ _s0_33 ^ _s0_34 ^ _s0_35 ^ _s0_36 ^ _s0_38 ^ _s0_39 ^ _s0_40 ^ _s0_41 ^ _s0_42 ^ _s0_43 ^ _s0_44 ^ _s0_45 ^ _s0_56 ^ _s0_47 ^ _s0_48 ^ _s0_49 ^ _s0_51 ^ _s0_52 ^ _s0_53 ^ _s0_55 ^ _s0_56 ^ _s0_57 ^ _s0_59 ^ _s0_60 ^ _s0_61 ^ _s0_62 ^ _s0_63 ^ _s0_64 ^ _s0_65 ^ _s0_66 ^ _s0_67 ^ _s0_68 ^ _s0_69 ^ _s0_70 ^ _s0_71 ^ _s0_72 ^ _s0_73 ^ _s0_74 ^ _s0_79 ^ _s0_80 ^ _s0_84 ^ _s0_85;
var _s0_88 = [_s0_34, _s0_44, _s0_56, _s0_61, _s0_73, _s0_29, _s0_70, _s0_45, _s0_35, _s0_49, _s0_38, _s0_66, _s0_51, _s0_68, _s0_28, _s0_48, _s0_64, _s0_47, _s0_30, _s0_71, _s0_26, _s0_55, _s0_31, _s0_69, _s0_59, _s0_40, _s0_62, _s0_63, _s0_27, _s0_72, _s0_41, _s0_74, _s0_57, _s0_52, _s0_42, _s0_39, _s0_33, _s0_67, _s0_53, _s0_43, _s0_65, _s0_46, _s0_36, _s0_24, _s0_60, _s0_32, _s0_79, _s0_80, _s0_84, _s0_85].concat.apply([_s0_34, _s0_44, _s0_56, _s0_61, _s0_73, _s0_29, _s0_70, _s0_45, _s0_35, _s0_49, _s0_38, _s0_66, _s0_51, _s0_68, _s0_28, _s0_48, _s0_64, _s0_47, _s0_30, _s0_71, _s0_26, _s0_55, _s0_31, _s0_69, _s0_59, _s0_40, _s0_62, _s0_53, _s0_27, _s0_72, _s0_41, _s0_74, _s0_57, _s0_52, _s0_42, _s0_39, _s0_33, _s0_67, _s0_53, _s0_43, _s0_65, _s0_46, _s0_36, _s0_24, _s0_60, _s0_32, _s0_79, _s0_80, _s0_84, _s0_85], [_s1_6.apply(undefined, [_s0_77]), _s1_6.apply(undefined, [_s0_82]), [_s0_87]]);
var _s0_89 = String.fromCharCode.apply.apply(String.fromCharCode, [String, _s1_6.apply(undefined, [_s1_18.apply(undefined, [_s0_23, 1])])]);
var _s0_90 = _s1_20.apply(undefined, [_s0_88]);
var _s0_91 = _s2_2.apply(undefined, [String.fromCharCode.apply.apply(String.fromCharCode, [null, [211]]), String.fromCharCode.apply.apply(String.fromCharCode, [null, [].concat.apply([], [_s1_6.apply(undefined, [_s0_86]), _s1_6.apply(undefined, [_s0_90])])])]);
var _s0_92 = _s0_89 + _s0_91;
var _s0_93 = _s2_1.apply(undefined, [_s0_92, "s4"]);
// block pc 1833
controlState = 2;
controlValue = _s0_93;
return;
}
}
}
}
}
} else {
// goto pc 383 (already emitted)
}
} else {
// goto pc 273 (external frame)
}
}
} else {
// block pc 252
// goto pc 259 (already emitted)
}
}
} else {
// goto pc 72 (external frame)
}
}
} else {
// block pc 45
// goto pc 52 (already emitted)
}
} else {
// goto pc 77 (already emitted)
}
} else {
// goto pc 22 (already emitted)
}
}

```

```

类似对其他函数进行同样的处理，在合适的地方下断点进行分析，最后将所有代码聚集到一起进行分析

可以知道bogus采用了SM3 + 字节抽样 → 拼环境字节 → 随机展开 → RC4 → s4 base64 → 188 字符

![image](https://attach.52pojie.cn/forum/202608/03/180135vx17i7a2d0w7tyam.png)

![image](https://attach.52pojie.cn/forum/202608/03/180159ljncnnf2rzfotfxy.png)

实现bogus纯算，验证需要注意有些接口即使没有bogus也能通过，要找一些需要强校验的

![image](https://attach.52pojie.cn/forum/202608/03/002142pqgjcjrymg1sgbnz.png)
