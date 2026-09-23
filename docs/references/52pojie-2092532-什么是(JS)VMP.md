# 什么是(JS)VMP

> **作者**: LiXieZengHui | **发布时间**: 2026-02-20 22:39:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 1808 / 7
> **原文**: [https://www.52pojie.cn/thread-2092532-1-1.html](https://www.52pojie.cn/thread-2092532-1-1.html)

---

[ 本帖最后由 LiXieZengHui 于 2026-2-20 22:41 编辑 ]

## 什么是(JS)VMP

#### VM即`Virtual Machine`

虚拟机，接受源代码通过编译生成的字节码，然后将字节码转换成对应平台CPU能够识别的机器码

为什么要有VM而不是直接源代码编译成机器码呢？

因为通过字节码+VM的运行方式，可以实现多平台运行，程序不再和平台强绑定

对于Java，JIT 编译会将热点字节码动态编译成本地机器码，然后直接让 CPU 跑。

#### JSVMP

在 JavaScript 代码里，用软件手写了一个虚拟的 CPU，专门用来执行一套加密过的私有指令，从而保护核心逻辑。

## 创建VMP-理论

* **第一步：编译（Compiler）**
  + 将源代码编译成字节码
    - 因为这是我们自己的虚拟机，因此我们就是上帝，我们可以自定义每个操作对应的字节码，只要最后不产生冲突即可。
  + `0x12` 代表加法运算
  + `0x55` 代表取余
  + `0x99` 代表减法运算
* **第二步：解释器（Interpreter）/执行器（Executor）**
  + 浏览器在获取字节码之后无法正常执行，因此需要虚拟机的CPU进行指令识别&指令执行
  + 解释器和执行器一般是同时出现在一个巨大的死循环中。解释器每拿到一条指令，就会通过switch来进行指令匹配，匹配到对应的case块之后执行case块内的语句

### 常见VMP结构

```
// 此处 data 就是源代码编译后的得到的字节码(Bytecode)
function virtual_machine(data) {
    var program_counter = 0; // 指令指针，相当于读书读到了第几行
    var stack = []; // 栈，相当于小背包，用来临时存数据

    // 这是一个巨大的死循环，就像机器一直在转动
    while (true) {
        // 1. 取出一条指令
        var opcode = data[program_counter];
        program_counter++;

        // 2. 解释器解释指令
        switch (opcode) {
            case 0x01: // 比如这是加法
                // 执行器立即执行指令对应的操作
                var a = stack.pop();
                var b = stack.pop();
                stack.push(a + b);
                break;
            case 0x02: // 比如这是输出
                console.log(stack.pop());
                break;
            case 0x03: // 结束
                return;
            // ... 这里会有成百上千个 case ...
        }
    }
}
```

## 创建VMP-实战

### 编写源代码

假设我们要完成一个加法操作`c=a+b`，我们写出对应的指令集

寄存器模式

```
MOV EAX, 10    ;
MOV EBX, 20    ;
ADD EAX, EBX   ;
MOV ECX, EAX   ;
```

栈模式

```
PUSH 10   ;
PUSH 20   ;
ADD       ;
POP ECX   ;
```

栈模式对应的JS代码

```
// 1. 指令集定义：代表一系列待执行的操作
const instructionSequence = [
    { action: "LOAD", parameter: 2000 },
    { action: "LOAD", parameter: 210 },
    { action: "ADD" },
    { action: "RETURN" },
];
```

### 创建编译器

#### 构建指令集

我们明确了要完成的操作后，可以自定义每个指令对应的操作码

想要实现加法一共有三个操作，`LOAD`、`ADD`、`RETURN`

```
// 2. 映射表：将可读的指令动作映射为混淆后的操作码
const operationCodeMapping = {
    "LOAD": "_0x04de2",
    "ADD": "_0x04de3",
    "RETURN": "_0x04de4"
};
```

OK，以上就是我们的指令集/操作码合集了

#### 构建编译程序

将操作翻译为对应的操作码

```
/**
 * 编译器函数：将高层指令转换为虚拟机可识别的字节码字符串
 * @Param {Array} instructions - 指令数组
 * @returns {string} - 格式化后的字节码
 */
function compileToBytecode(instructions) {
    const rawBytecodes = [];

    for (const instruction of instructions) {
        // 提取混淆后的指令名称
        const mappedCode = operationCodeMapping[instruction.action];
        rawBytecodes.push(mappedCode);

        // 如果存在参数，将其转换为 ASCII 字符编码
        if (instruction.parameter !== undefined) {
            // 将数字转化为对应的Unicode字符
            const charCode = String.fromCharCode(instruction.parameter);
            rawBytecodes.push(charCode);
            // 这里默认参数只有一位，如果我们的参数是字符串类型，则需要先把字符串长度压入栈中，然后处理字符串
        }
    }

    // 使用管道符 '|' 连接，形成最终的指令流
    return rawBytecodes.join("|");
}
```

### 编译源代码

完成上述操作后我们编译源代码，最终得到

`_0x04de2|97|_0x04de2|98|_0x04de3|_0x04de4`

## 创建解释器

我们如果提供`_0x04de2|97|_0x04de2|98|_0x04de3|_0x04de4`这样一串莫名其妙的字符串作为输入，浏览器一定是不知到要做什么的，因此我们需要创建我们自己的解释器，来解释我们的输入，要执行哪些动作

### 初始化VM

```
function VirtualMachine() {
    // 1. 数据栈：用来存放运算过程中的临时数据
    this.dataStack = []
    // 2. 指令映射表：将混淆后的字符串映射回逻辑动作
    this.operationCodeMapping = {
        "LOAD": "_0x04de2",
        "ADD": "_0x04de3",
        "RETURN": "_0x04de4"
    }
}
```

初始化一个空栈用于运算

初始化操作码Mapping用于将操作码翻译为指令

### 定义核心运算方法/执行器

```
/**
 * 核心运算方法 (原 add)
 * 执行具体的数学加法逻辑
 */
VirtualMachine.prototype._0x00af = function (_0x00bf, _0x00cf) {
    return _0x00bf + _0x00cf
}
```

一般来说核心运算操作都是直接定义在VM的原型链上的，这里我们还可以对函数名进行混淆，此处相当于是`add`被混淆成了`_0x00af`

### 创建解释器

```
// 解释器&执行器
VirtualMachine.prototype.executer = function (rawOPCode) {
    let OPCodeSeq = rawOPCode.split("|");
    let pc = 0
    while (pc < OPCodeSeq.length) {
        switch (OPCodeSeq[pc++]) {
            case this.operationCodeMapping.LOAD:
                this.dataStack.push(OPCodeSeq[pc++].charCodeAt());
                break;
            case this.operationCodeMapping.ADD:
                console.log(this.dataStack)
                this.dataStack.push(this._0x00af.apply(
                    this, [this.dataStack.pop(), this.dataStack.pop()])
                )
                break
            case this.operationCodeMapping.RETURN:
                return this.dataStack.pop()
        }

    }
}
```

### 调用并执行

```
JSVMP = new VirtualMachine()
res = JSVMP.executer("_0x04de2|ߐ|_0x04de2|Ò|_0x04de3|_0x04de4")
console.log(res)
```

## 总结

VMP的核心思想是将原始程序逻辑编译为自定义字节码，并由一个虚拟机解释器来执行，而不再由宿主CPU或原生执行环境直接运行真实语义。

其本质结构通常包括字节码、虚拟CPU（包含程序计数器、数据栈v或寄存器）、指令分发机制以及状态驱动执行模型。

解释器通过`while`循环不断读取`opcode`，根据调度机制（如 `switch` 或函数表）分发到对应的`handler`执行，从而将原本具有清晰结构的控制流（`if`、`for`、`call` 等）转化为统一的状态机循环结构，实现控制流平坦化。

对于逆向而言

由于程序结构被抹平、语义被封装进自定义指令处理函数中，逆向分析者难以通过控制流图还原真实逻辑，同时自动化分析、符号执行和模式匹配等工具也难以直接适配自定义指令集。

VMP 的优势不仅在于混淆控制流，还在于隐藏指令语义、提高逆向成本、支持动态解密与环境绑定，并具备良好的跨平台封装能力。虽然理论上解释器存在即意味着语义可被还原，但 VMP 的核心目标并非绝对不可破解，而是显著提高攻击成本，使破解变得复杂、耗时且难以规模化。
