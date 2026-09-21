# 某音a_bogus jsvmp反编译

> **作者**: hostname | **发布时间**: 当前在线 | **版块**: 『脱壳破解区』 | **查看/回复**: 4573 / 84
> **原文**: [https://www.52pojie.cn/thread-2116186-1-1.html](https://www.52pojie.cn/thread-2116186-1-1.html)

---

* 本帖最后由 hostname 于 2026-7-8 11:45 编辑 *

上一篇文章[某q音乐jsvmp反编译](https://www.52pojie.cn/thread-2042090-1-1.html)介绍了寄存器类型的vmp反编译，bdms这个是基于堆栈的vmp，去年已经写好了，一直懒得总结，今天跟大家分享一下思路，如有不对的地方，欢迎大家批评指正，共同学习。

### 一、分析虚拟机架构

```
bdms_1.0.1.19_fix.js
```

该虚拟机是基于堆栈的虚拟机框架，操作数都提前压入堆栈中

以下是简化的vm框架代码，展示了部分case

```

```

var stringTable = [];
var vmFunctionInfos = [];
var functionWrapperMap = new Map();
var functionIndexMap = new Map();
function executeVirtualMachine(functionIndex, thisArg, args, globalState) {
stringTable.length || function (t) {
var r = function (t) {
for (var r = atob(t), e = 0, n = 4; n < 8; ++n) {
e += r.charCodeAt(n);
}
return {
d: C(Uint8Array.from(r.slice(8), _, e % 256)),
i: 0
};
}(t);
stringTable.length = 0;
vmFunctionInfos.length = 0;
functionWrapperMap.clear();
for (var e = W(r), n = 0; n < e; ++n) {
stringTable.push(K(r));
}
var o = W(r);
for (n = 0; n < o; ++n) {
for (var i = W(r), u = Boolean(W(r)), s = new Array(), c = W(r), a = 0; a < c; ++a) {
s.push([W(r), W(r), W(r), W(r)]);
}
for (var f = new Array(), l = W(r), p = 0; p < l; ++p) {
f.push(W(r));
}
vmFunctionInfos.push([f, i, u, s]);
}
}("xxxx");
return runFunction(vmFunctionInfos[functionIndex], thisArg, args, globalState);
}
function createFunctionWrapper(funcIndex, env) {
var funcInfo = vmFunctionInfos[funcIndex];
functionIndexMap.has(funcIndex) && functionWrapperMap.delete(functionIndexMap.get(funcIndex));
function wrappedFunction() {
return runFunction(funcInfo, this, arguments, env);
}
functionIndexMap.set(funcIndex, wrappedFunction);
functionWrapperMap.set(wrappedFunction, [funcInfo, env]);
return wrappedFunction;
}
function runFunction(vmFunctionInfo, thisArg, args, globalState) {
var bytecode;
var isStrictMode;
var exceptionTable;
var envArray;
var currentThis;
var pc;
var stateFlag;
var returnValueOrException;
var stackPointer = -1;
var operandStack = [];
var callStack = [];
initializeEnvironment(vmFunctionInfo, thisArg, args, globalState);
do {
try {
executeInstruction();
} catch (error) {
stateFlag = 3;
returnValueOrException = error;
}
} while (handleFlowControl());
return returnValueOrException;
function initializeEnvironment(vmFunctionInfo, thisArg, args, globalState) {
var paramCount = Math.min(args.length, vmFunctionInfo[1]);
var argumentsObj = {};
Object.defineProperty(argumentsObj, "length", {
value: args.length,
writable: !0,
enumerable: !1,
configurable: !0
});
bytecode = vmFunctionInfo[0];
isStrictMode = vmFunctionInfo[2];
exceptionTable = vmFunctionInfo[3];
envArray = [globalState, argumentsObj];
for (var index = 0; index < paramCount; ++index) {
envArray.push(args[index]);
}
if (isStrictMode) {
for (currentThis = thisArg, index = 0; index < args.length; ++index) {
argumentsObj[index] = args[index];
}
} else {
if (null == thisArg) {
currentThis = globalThis;
} else {
currentThis = Object(thisArg);
}
function defineParamAccessor(t) {
t < paramCount ? Object.defineProperty(argumentsObj, t, {
get: function () {
return envArray[t + 2];
},
set: function (r) {
envArray[t + 2] = r;
},
enumerable: !0,
configurable: !0
}) : argumentsObj[t] = args[t];
}
for (index = 0; index < args.length; ++index) {
defineParamAccessor(index);
}
}
pc = 0;
stateFlag = 0;
returnValueOrException = 0;
}
function executeInstruction() {
for (;;) {
var opcode = bytecode[pc++];
switch (opcode) {
case 0:
var argCount = bytecode[pc++];
stackPointer -= argCount;
var e = operandStack.slice(stackPointer + 1, stackPointer + argCount + 1);
var n = operandStack[stackPointer--];
var d = operandStack[stackPointer--];
if ("function" != typeof n) {
stateFlag = 3;
return returnValueOrException = new TypeError(typeof n + " is not a function");
}
var y = functionWrapperMap.get(n);
if (y) {
callStack.push([bytecode, isStrictMode, exceptionTable, envArray, currentThis, pc, stateFlag, returnValueOrException]);
initializeEnvironment(y[0], d, e, y[1]);
} else {
var m = n.apply(d, e);
operandStack[++stackPointer] = m;
}
break;
case 20:
x = bytecode[pc++];                 // key
E = operandStack[stackPointer--];   // value
S = operandStack[stackPointer--];   // obj
s[stringTable[x]] = E;
break;
case 71:
U = bytecode[pc++];
if (operandStack[stackPointer--]) {
pc += U;
}
// operandStack[stackPointer--] && (pc += U);
break;
case 72:
x = bytecode[pc++];
var W = stringTable[x];
if (!(W in globalThis)) {
globalThis[W] = void 0;
}
// W in globalThis || (globalThis[W] = 0);
break;
case 74:
N = bytecode[pc++]; // 层级
x = bytecode[pc++];
U = envArray;
for (; N > 0;) {
U = U[0];
--N;
}
E = U[x];
operandStack[++stackPointer] = E;
break;
default:
stateFlag = 2;
return returnValueOrException = operandStack[stackPointer--];
break;
}
}
}
function handleFlowControl() {
var pc_ = pc;
var exceptionTable_= exceptionTable;
if (1 === stateFlag) {
for (var e = exceptionTable_.length - 1; e >= 0; --e) {
n = exceptionTable_[e];
if (n[0] < pc_ && pc_<= n[3]) {
if (pc_ <= n[2] && n[2] !== n[3]) {
// 存在finally代码块并且pc在try或者catch块中
// 将pc设置为finally代码块起始位置
pc = n[2];
return pc;
} else {
// pc在finally块或者不存在finally代码块
pc = returnValueOrException;
stateFlag = 0;
returnValueOrException = void 0;
return true;
}
}
}
throw new SyntaxError("Illegal statement");
}
if (2 === stateFlag) {
for (e = exceptionTable_.length - 1; e >= 0; --e) {
n = exceptionTable_[e];
if (n[0] < pc_&& pc_ <= n[2] && n[2] !== n[3]) {
pc = n[2];
return true;
}
}
// 从调用栈弹出栈帧
g = callStack.pop();
// 如果弹出失败(g为假值), 直接返回false
if (!g) {
return false;
}
// 成功弹出栈帧，执行状态恢复操作：
// 1. 操作数栈存储返回值/异常(栈指针先自增)
operandStack[++stackPointer] = returnValueOrException;
// 2. 恢复栈帧中的运行时状态
bytecode = g[0];                // 字节码
isStrictMode = g[1];            // 严格模式标志
exceptionTable = g[2];          // 异常处理表
envArray = g[3];                // 环境数组
currentThis = g[4];             // 当前this值
pc = g[5];                      // 程序计数器
stateFlag = g[6];               // 状态标志
returnValueOrException = g[7];  // 返回值/异常
return true;
}
if (3 === stateFlag) {
for (e = exceptionTable_.length - 1; e >= 0; --e) {
var n = exceptionTable_[e];
if (n[0] < pc_) {
// 判断pc是否在try代码块
if (pc_ <= n[1] && n[1] !== n[2]) {
// 设置pc为catch代码块起始位置
pc = n[1];
// 此时returnValueOrException存储的是异常对象
// 将异常对象入栈
operandStack[++stackPointer] = returnValueOrException;
stateFlag = 0;
returnValueOrException = 0;
return true;
}
// 判断pc是否在catch代码块
if (pc_<= n[2] && n[2] !== n[3]) {
// 设置pc为finally代码块起始位置
pc = n[2];
return true;
}
}
}
var g = callStack.pop();
if (g) {
bytecode = g[0];
isStrictMode = g[1];
exceptionTable = g[2];
envArray = g[3];
currentThis = g[4];
pc = g[5];
return handleFlowControl();
}
throw returnValueOrException;
}
return true;
}
function createStringAccessor(globalName, isStrict) {
var accessor = Object.create(null);
Object.defineProperty(accessor, globalName, {
get: function () {
if (globalName in globalThis) {
return globalThis[globalName];
}
throw new ReferenceError(globalName + " is not defined");
},
set: function (value) {
if (isStrict && !(globalName in globalThis)) {
throw new ReferenceError(globalName + " is not defined");
}
globalThis[globalName] = value;
}
});
return accessor;
}
}
function W(t) {
for (var r = 0, e = 0;;) {
var n = t.d[t.i++];
if (r |= (127 & n) << e, e += 7, !(128 & n)) {
return e < 32 && 64 & n ? r | -1 << e : r;
}
}
}
function K(t) {
for (var r = -1, e = new Array();;) {
var n = t.d[t.i++];
if (n >= 128 && n < 192) {
r = (r << 6) + (63 & n);
} else {
if (r >= 0 && e.push(r), n < 128) {
r = n;
} else {
if (n < 224) {
r = 31 & n;
} else {
if (n < 240) {
r = 15 & n;
} else {
if (!(n < 248)) {
break;
}
r = 7 & n;
}
}
}
}
}
return String.fromCodePoint.apply(null, e);
}
function_(t, r) {
return (t.charCodeAt(0) ^ (this + this % 10 * r) % 256) >>> 0;
}

```

```

调用

```
executeVirtualMachine
```

来执行虚拟函数，例如:

```

```

executeVirtualMachine(232, 0, arguments, {
get 0() {
return globalVar0;
},
set 0(t) {
globalVar0 = t;
},
get 1() {
return globalVar1;
},
set 1(t) {
globalVar1 = t;
},
get 2() {
return globalVar2;
},
set 2(t) {
globalVar2 = t;
},
get 3() {
return globalVar3;
},
set 3(t) {
globalVar3 = t;
},
get 4() {
return globalVar4;
},
set 4(t) {
globalVar4 = t;
},
get 5() {
return globalVar5;
},
set 5(t) {
globalVar5 = t;
},
get 6() {
return globalVar6;
},
set 6(t) {
globalVar6 = t;
},
get 7() {
return globalVar7;
},
set 7(t) {
globalVar7 = t;
},
get 8() {
return globalVar8;
},
set 8(t) {
globalVar8 = t;
}
});

```

```

传入虚拟函数

```
id
```

，this指针，参数，当前作用域

在

```
executeVirtualMachine
```

内部

1、首先解密字节码，获得所有虚拟函数列表以及字符串表

其中每个虚拟函数包含四个元素：

```
[字节码, 参数个数, isStrict, 异常表]
```

2、接着调用

```
initializeEnvironment
```

初始化虚拟机

3、最后调用

```
executeInstruction
```

分发指令，如遇异常会调用

```
handleFlowControl
```

函数处理

整个执行流程如下所示（引用我上一篇文章的图）：

![image](https://attach.52pojie.cn/forum/202607/08/111709exlxx3zysoky47xo.png)

该虚拟机共有76个handler，每个handler就只完成了一件事，可以抽象成一个指令，举几个例子：

```

```

case 0:
var argCount = bytecode[pc++];
stackPointer -= argCount;
var e = operandStack.slice(stackPointer + 1, stackPointer + argCount + 1);
var n = operandStack[stackPointer--];
var d = operandStack[stackPointer--];
if ("function" != typeof n) {
stateFlag = 3;
return returnValueOrException = new TypeError(typeof n + " is not a function");
}
var y = functionWrapperMap.get(n);
if (y) {
callStack.push([bytecode, isStrictMode, exceptionTable, envArray, currentThis, pc, stateFlag, returnValueOrException]);
initializeEnvironment(y[0], d, e, y[1]);
} else {
var m = n.apply(d, e);
operandStack[++stackPointer] = m;
}
break;
case 20:
x = bytecode[pc++];                 // key
E = operandStack[stackPointer--];   // value
S = operandStack[stackPointer--];   // obj
s[stringTable[x]] = E;
break;
case 71:
U = bytecode[pc++];
if (operandStack[stackPointer--]) {
pc += U;
}
// operandStack[stackPointer--] && (pc += U);
break;
case 72:
x = bytecode[pc++];
var W = stringTable[x];
if (!(W in globalThis)) {
globalThis[W] = void 0;
}
// W in globalThis || (globalThis[W] = 0);
break;
case 74:
N = bytecode[pc++]; // 层级
x = bytecode[pc++];
U = envArray;
for (; N > 0;) {
U = U[0];
--N;
}
E = U[x];
operandStack[++stackPointer] = E;
break;

```

```

### 二、虚拟指令

#### (一) 堆栈操作

##### 1、IrPushImm

```

```

// 压入一个立即数, 该立即数从虚拟字节码中获取: [] -> [imm]
/**

* |opcode|keyStringIndex|
*        |   |            栈顶 -> |stringTable[keyStringIndex]|
* 栈顶 -> |...|     --->          |... ... ... ... ... ... ...|
*|...|                   |... ... ... ... ... ... ...|
_/
/_*
* |opcode|value|
*        |   |            栈顶 -> |value|
* 栈顶 -> |...|     --->          | ... |
*|...|                   | ... |
*/

```

```

##### 2、IrPushConstant

```

```

// 压入一个常量: [] -> [constant]
/**

* |opcode|
*        |   |            栈顶 -> |constant|
* 栈顶 -> |...|     --->          |.... ....|
*|...|                   |.... ....|
*/

```

```

##### 3、IrPushVar

```

```

// 压入一个变量: [] -> [var]

```

```

##### 4、IrPop

```

```

// 弹出栈顶元素: [a] -> []
/**

* |opcode|
* 栈顶 -> |tmp|    --->            |   |
*|...|             栈顶 -> |...|
*/

```

```

##### 5、IrCopyTop

```

```

// 复制栈顶元素: [a] -> [a, a]
/**

* |opcode|
*         |     |           栈顶 -> |value|
* 栈顶 -> |value|    --->           |value|
*| ... |                   | ... |
*/

```

```

##### 6、IrCreateArray

```

```

// 创建数组: [... a, b] -> [[a, b]]
/**

* |opcode|arrayLength|
* 栈顶 ->| an |                   |                 |
*|....|                   |                 |
*       | a3 |    --->           |                 |
*| a2 |                   |                 |
*       | a1 |           栈顶 -> |[a1,a2,a3,...,an]|
*|....|                  |... ... .... ....|
*/

```

```

##### 7、IrSetTop

```

```

/**

* |opcode|
*        |   |                    |         |
* 栈顶 -> |...|     --->   栈顶 -> |undefined|
*|...|                   |.... ....|
*/

```

```

#### (二) 算数运算

##### 1、IrAdd

```

```

// 加法运算: [... a, b] -> [a+b]
/**

* |opcode|
* 栈顶 -> |operand1|                  |                   |
*|operand2|    --->  栈顶 ->  |operand2 + operand1|
*        |........|                  |.... .... .... ....|
*/

```

```

##### 2、IrSub

```

```

// 减法运算: [... a, b] -> [a-b]

```

```

##### 3、IrMul

```

```

// 乘法运算: [... a, b] -> [a*b]

```

```

##### 4、IrDiv

```

```

// 除法运算: [... a, b] -> [a/b]

```

```

##### 5、IrMod

```

```

// 取模运算: [... a, b] -> [a%b]

```

```

##### 6、IrNeg

```

```

// 取负运算: [... a] -> [-a]

```

```

#### (三) 逻辑运算

##### 1、IrLogicalNot

```

```

// 逻辑非: [... a] -> [!a]

```

```

#### (四) 类型操作

##### 1、IrTypeOf

```

```

// 类型判断: [... a] -> [typeof a]
/**

* |opcode|
* 栈顶 -> |operand|    --->    栈顶 -> |typeof operand|
*|... ...|                    |.... .... ....|
*/

```

```

##### 2、IrConvertByteCodeNumber

```

```

// 类型转换(转换成数字)
/**

* |opcode|stringIndex|
*         |   |          栈顶 -> |+stringTable[stringIndex]|
* 栈顶 -> |...|    --->          |.... .... .... .... .....|
* 将字符串转换成数字
*/

```

```

##### 3、IrConvertStackNumber

```

```

/**

* |opcode|
* 栈顶 -> |operand|    --->    栈顶 -> |+operand|
*|... ...|                    |... ....|
*/

```

```

#### (五) 位运算

##### 1、IrBitwiseAnd

```

```

// 按位与: [... a, b] -> [a & b]
/**

* |opcode|
* 栈顶 -> |operand1|                  |                   |
*|operand2|    --->  栈顶 ->  |operand2 & operand1|
*        |........|                  |.... .... .... ....|
*/

```

```

##### 2、IrBitwiseOr

```

```

// 按位或: [... a, b] -> [a | b]

```

```

##### 3、IrBitwiseXor

```

```

// 按位异或: [... a, b] -> [a ^ b]

```

```

##### 4、IrBitwiseNot

```

```

// 按位取反: [... a] -> [~a]

```

```

##### 5、IrBitwiseSal

```

```

// 左移: [... a, b] -> [a << b]

```

```

##### 6、IrBitwiseSar

```

```

// 算术右移(有符号右移): [... a, b] -> [a >> b]

```

```

##### 7、IrBitwiseShr

```

```

// 逻辑右移(无符号右移): [... a, b] -> [a >>> b]

```

```

#### (六) 比较运算

##### 1、IrCmp

```

```

// 比较运算: [... a, b] -> [a cond b(Boolean)]
/**

* |opcode|
* 栈顶 -> |operand1|                  |                    |
*|operand2|    --->  栈顶 ->  |operand2 == operand1|
*        |........|                  |.... .... ..... ....|
*/

```

```

#### (七) 对象操作

##### 1、IrNewObject

```

```

// new一个对象: [... Func, ...args] -> [instance]
/**

* |opcode|argCount|
* G = [undefined, arg1, arg2, ..., argn]
* 栈顶 -> |argn|                 |                  |
*|....|                 |                  |
*        |arg3|                 |                  |
*|arg2|    -->          |                  |
*        |arg1|                 |                  |
*|func|          栈顶 -> |new func.bind(G)()|
*        |....|                 |.... .... .... ...|
*/

```

```

##### 2、IrGetPropKeyFromStack

```

```

// 属性获取(key来自栈顶): [... obj, key] -> [value]
/**

* |opcode|
* 栈顶 -> |key|                    |        |
*|obj|     --->    栈顶 -> |obj[key]|
*        |...|                    |... ....|
*/

```

```

##### 3、IrGetPropKeyFromByteCode

```

```

// 属性获取(key来自字节码): [obj] -> [value]
/**

* |opcode|keyStringIndex|
* 栈顶 -> |obj|    --->    栈顶 -> |obj[StringTable[keyStringIndex]]|
*|...|                   |... ... ... ... ... ... ... ....|
*/

```

```

##### 4、IrSetPropKeyFromStack

```

```

/**

* |opcode|
* 栈顶 -> | key |                   |     |
*| obj |   --->            |     |
*        |value|           栈顶 -> |value|
*        | ... |                  | ... |
* obj[key] = value;
*/

```

```

##### 5、IrSetPropKeyFromByteCodePop

```

```

/**

* |14|
* 栈顶 -> |value|                    |   |
*| key |      --->          |   |
*        | obj |                    |   |
*| ... |            栈顶 -> |...|
*/

```

```

##### 6、IrSetPropKeyFromStackPop

```

```

// 属性赋值(key来自字节码): [... obj, value] -> []
/**

* |opcode|keyStringIndex|
* 栈顶 -> |value|                      |   |
*| obj |     --->             |   |
*        | ... |              栈顶 -> |...|
* obj[stringTable[keyStringIndex]] = value
*/

```

```

##### 7、IrDeleteProp

```

```

// 删除属性: [... obj, key] -> [Boolean]
/**

* |opcode|
* 栈顶 -> |key|                    |               |
*|obj|     --->    栈顶 -> |delete obj[key]|
*        |...|                    |... ... ... ...|
*/

```

```

##### 8、IrDefineKeyProp

```

```

/**

* |opcode|keyStringIndex|
* 栈顶 -> |value|                 |   |
*| obj |   --->   栈顶 -> |obj|
*        | ... |                 |...|
* Object.defineProperty(obj, stringTable[keyStringIndex], {
*value: E,
*     writable: true,
*configurable: true,
*     enumerable: true
* })
*/

```

```

##### 9、IrDefineGetterProp

```

```

/**

* |opcode|keyStringIndex|
* 栈顶 -> |getter|                 |   |
*|  obj |   --->   栈顶 -> |obj|
*        | .... |                 |...|
* Object.defineProperty(obj, stringTable[keyStringIndex], {
*get: getter,
*     enumerable: true,
*     configurable: true
* })
*/

```

```

##### 10、IrDefineSetterProp

```

```

/**

* |opcode|keyStringIndex|
* 栈顶 -> |setter|                 |   |
*|  obj |   --->   栈顶 -> |obj|
*        | .... |                 |...|
* Object.defineProperty(obj, stringTable[keyStringIndex], {
*set: setter,
*     enumerable: true,
*     configurable: true
* })
*/

```

```

##### 11、IrPropPostIncrementAssign

```

```

/**

* |opcode|
* 栈顶 -> |key|                  |          |
*|obj|    --->   栈顶 -> |obj[key]++|
*        |...|                  |... ... ..|
*/

```

```

#### (八) 函数操作

##### 1、IrCreateFunction

```

```

/**

* 创建函数包装器
* |opcode|funcIndex|
*         |   |         栈顶 -> |functionWrapper|
* 栈顶 -> |...|   --->          |... ... ... ...|
*|...|                 |... ... ... ...|
*/

```

```

#### (九) 全局对象

##### 1、IrGetGlobalProp

```

```

// 全局变量读取: [] -> [value]
/**

* |opcode|keyStringIndex|
*         |   |          栈顶 -> |globalThis[stringTable[keyStringIndex]]|
* 栈顶 -> |...|    --->          |.... .... .... .... .... .... .... ....|
*|...|                  |.... .... .... .... .... .... .... ....|
*/

```

```

##### 2、IrSetGlobalProp

```

```

/**

* |opcode|keyStringIndex|
* 栈顶 -> |value|    --->          |   |
*        | ... |           栈顶 -> |...|
* globalThis[stringTable[keyStringIndex]] = value
*/

```

```

##### 3、IrInitGlobalProp

```

```

// 初始化全局变量为undefined: 无栈变化
/**

* |opcode|keyStringIndex|
* 如果stringTable[keyStringIndex]不在globalThis
* globalThis[stringTable[keyStringIndex]] = undefined
*/

```

```

##### 4、IrTypeOfGlobalProp

```

```

// 获取全局变量类型: [] -> [typeString]
/**

* |opcode|keyStringIndex|
*         |   |          栈顶 -> |typeof globalThis[stringTable[keyStringIndex]]|
* 栈顶 -> |...|   --->           |... ... ... ... ... ... ... ... ... ... ... ..|
*|...|                  |... ... ... ... ... ... ... ... ... ... ... ..|
*/

```

```

##### 5、IrCreateGlobalStringAccessor

```

```

// 创建全局字符串访问器: [] -> [accessor, string]

```

```

#### (十) 环境数组

##### 1、IrSetEnvProp

```

```

// 环境变量写入(向指定作用域写入变量): [value] -> []
/**

* |opcode|envDepth|envIndex|
* 栈顶 -> |value|   --->           |   |
*        | ... |           栈顶 -> |...|
* curEnvArray[envIndex] = value
*/

```

```

##### 2、IrPushEnvProp

```

```

/**

* |opcode|envDepth|envIndex|
*         |   |           栈顶 -> |curEnvArray[envIndex]|
* 栈顶 -> |...|    --->          |... ... ... ... .....|
*|...|                  |... ... ... ... .....|
*        |...|                  |... ... ... ... .....|
* 将当前环境数组取得的值压入栈中
*/

```

```

##### 3、IrPushEnvIndexAndEnv

```

```

/**

* |opcode|envDepth|envIndex|
*|   |           栈顶 -> |curEnvArray[envIndex]|
*         |   |                  |     curEnvArray     |
* 栈顶 -> |...|    --->          |... ... ... ... .....|
*|...|                  |... ... ... ... .....|
*        |...|                  |... ... ... ... .....|
* 将当前环境数组和取得的值压入栈中
*/

```

```

#### (十一) 控制流

##### 1、IrJfalse

```

```

/**

* |opcode|offset|
* 如果cond为真, 将cond弹出:
*栈顶 -> |cond|     --->     |...|
*             |....|       栈顶 -> |...|
* 如果cond为假, 跳转pc, 不弹出cond:
*栈顶 -> |cond|   --->   栈顶 -> |cond|
*             |....|                  |...|
*/

```

```

##### 2、IrJfalsePop

```

```

/**

* |opcode|offset|
* 如果 operand2 === operand1, 弹出两个操作数, 然后跳转pc:
*栈顶 -> |operand1|                   |   |
*             |operand2|    --->           |   |
*             |... ....|           栈顶 -> |...|
* 如果 operand2 !== operand1, 只弹出第一个操作数, 不跳转pc:
*栈顶 -> |operand1|                   |        |
*             |operand2|    --->    栈顶 -> |operand2|
*|... ....|                   |... ....|
*/

```

```

##### 3、IrJeq

```

```

/**

* |opcode|offset|
* 如果cond为真, 跳转pc, 不弹出cond:
*栈顶 -> |cond|   --->   栈顶 -> |cond|
*             |....|                  |...|
* 如果cond为假, 将cond弹出:
*栈顶 -> |cond|     --->     |...|
*             |....|       栈顶 -> |...|
*/

```

```

##### 4、IrJtrue

```

```

/**

* |opcode1|offset|
* 栈顶 -> |cond|   --->          |   |
*        |....|          栈顶 -> |...|
* 如果cond为假, 跳转pc
* 总是弹出
*/

```

```

##### 5、IrJtruePop

```

```

/**

* |opcode|offset|
* 栈无变化
* 无条件跳转pc
*/

```

```

##### 6、IrJmp

```

```

/**

* |opcode|offset|
* 栈顶 -> |cond|   --->          |   |
*        |....|          栈顶 -> |...|
* 如果cond为真, 跳转pc
* 总是弹出
*/

```

```

##### 7、IrCall

```

```

// 函数调用
/**

* |opcode|argCount|
* 栈顶 -> |argn|         |                         |
*|....|          |                         |
*        |arg3|          |                         |
*|arg2|          |                         |
*        |arg1|   --->   |                         |
*|func|          |                         |
*        |this|  栈顶 ->  |func.apply(this, [args])|
*|....|          |.... .... .... .... ....|
*/

```

```

##### 8、IrRet

结束执行函数

#### (十二) 异常

##### 1、IrThrowError

抛出异常

### 三、构建控制流图

在构建控制流图前，先定义一下基本块类

```

```

class BasicBlock {
static blockId = 0;

constructor(startIndex) {
this.id = BasicBlock.blockId++;
this.startIndex = startIndex;
this.endIndex = -1;
this.instructions = [];
this.trueSuccessor = null;      // 条件为真时的后继块ID
this.falseSuccessor = null;     // 条件为假时的后继块ID
this.predecessors = [];         // 前驱块ID

this.stack = new ExpressionStack();
this.astNodes = [];
}
}

```

```

#### (一) Leader识别

会扫描所有指令，标记出**基本块的入口点（Leader）**。标记规则通常包括：

* 整个函数的**第一条指令**；

* 任何**条件或无条件跳转指令的目标地址**；

* 紧跟在**条件跳转或返回指令之后的下一条指令**（因为前一条指令会改变执行流）。

#### (二) 构建基本块

有了领导者列表后，这一步进行“切片”。从每个领导者开始，连续包含后续指令，直到遇到下一个领导者或函数结束为止。此时生成的是一个个**独立的、直线型（单进单出）的指令序列**，不包含任何分支逻辑。

#### (三) 块间连接

最后，通过遍历每个块的最后一条指令，将其跳转目标解析为对应的基本块索引，在块之间建立**有向边（前驱/后继关系）**

至此，散落的“指令列表”被正式组装成完整的**控制流图（CFG）**数据结构。

#### (四) 生成控制流图

遍历所有基本块，根据其前驱节点和后驱节点，生成节点和边，最终得到

```
dot
```

文件，使用

```
Graphviz
```

工具将

```
dot
```

文件转换成

### 四、a-bogus分析

经过上述步骤就可以将每个函数转换成控制流图了，举例如下：

![image](https://attach.52pojie.cn/forum/202607/08/111707hh5phicppeeiqcjj.png)

![image](https://attach.52pojie.cn/forum/202607/08/111704f2vllx41x6x2r2rc.png)

本方法只是生成控制流图，最后手动优化结合AI得到js代码，属于半自动半手动

最终去混淆的

```
bdms_1.0.1.19_fix.js
```

如下图所示

![image](https://attach.52pojie.cn/forum/202607/08/111711lugzvxuucm17m83b.png)

### 五、脚本编写

根据去混淆后的js文件，可以比较轻松的转换成python代码：

![image](https://attach.52pojie.cn/forum/202607/08/111715maaau1y6444ezz65.png)

请求效果如下：

![image](https://attach.52pojie.cn/forum/202607/08/111713awetwedgscdmz078.png)

![image](https://attach.52pojie.cn/forum/202607/08/111718l330dm36cs88n5zx.png)

### 六、下步改进方向

本方法只是生成控制流图，最后手动结合AI优化得到js代码，属于半自动半手动

下一步将继续学习中间代码优化相关知识，进行常量折叠、常量传播等优化，优化完毕后将控制流图转换成对应的js代码
