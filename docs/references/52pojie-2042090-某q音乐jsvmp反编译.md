# 某q音乐jsvmp反编译

> **作者**: hostname | **发布时间**: 2025-06-28 03:10:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 12327 / 130
> **原文**: [https://www.52pojie.cn/thread-2042090-1-1.html](https://www.52pojie.cn/thread-2042090-1-1.html)

---

### 一、分析虚拟机架构

参考这位师傅的文章`https://jixun.uk/posts/2024/qqmusic-zzc-sign/`, 将虚拟机架构代码重新命名了一下

该虚拟机是基于寄存器的虚拟框架，所有临时变量、结果都保存在一个寄存器列表中

```
function getVariableType(e) {
    return e && "undefined" != typeof Symbol && e.constructor === Symbol ? "symbol" : typeof e
}

// 这俩虚拟机指令都相同
function VM() {
    function decodeVM() {}
    return function (encod_code, isVM1) {
        var vm_code = decodeVM(encod_code);
        function createVM1(entrypoint, params, world, initialData, errorReportCallback) {
            return function vm_runtime() {
                var tempParams;
                var tempParamsCount;
                var regs = [world, initialData, params, this, arguments, vm_runtime, vm_code, 0];
                var fnCtx = undefined;
                var pc = entrypoint;
                var tryCatchHandlers = [];
                try {
                    for (;;) {
                        switch (vm_code[++pc]) {
                            case 2:
                                for (tempParams = [], tempParamsCount = vm_code[++pc]; tempParamsCount > 0; tempParamsCount--) {
                                    tempParams.push(regs[vm_code[++pc]]);
                                }
                                regs[vm_code[++pc]] = createVM2(pc + vm_code[++pc], tempParams, world, initialData, errorReportCallback);
                                try {
                                    Object.defineProperty(regs[vm_code[pc - 1]], "length", {
                                        value: vm_code[++pc],
                                        configurable: true,
                                        writable: false,
                                        enumerable: false
                                    });
                                } catch (v) {}
                                break;
                            case 46:
                                // 46 paramsCount param_1 param_2 ... param_n vmFunc offset func_length
                                for (tempParams = [], tempParamsCount = vm_code[++pc]; tempParamsCount > 0; tempParamsCount--) {
                                    tempParams.push(regs[vm_code[++pc]]);
                                }
                                regs[vm_code[++pc]] = createVM1(pc + vm_code[++pc], tempParams, world, initialData, errorReportCallback);
                                try {
                                    Object.defineProperty(regs[vm_code[pc - 1]], "length", {
                                        value: vm_code[++pc],
                                        configurable: true,
                                        writable: false,
                                        enumerable: false
                                    });
                                } catch (v) {}
                                break;
                            case 65:
                                regs[vm_code[++pc]] += String.fromCharCode(vm_code[++pc]);
                                for (tempParams = [], tempParamsCount = vm_code[++pc]; tempParamsCount > 0; tempParamsCount--) {
                                    tempParams.push(regs[vm_code[++pc]]);
                                }
                                regs[vm_code[++pc]] = createVM1(pc + vm_code[++pc], tempParams, world, initialData, errorReportCallback);
                                try {
                                    Object.defineProperty(regs[vm_code[pc - 1]], "length", {
                                    value: vm_code[++pc],
                                    configurable: true,
                                    writable: false,
                                    enumerable: false
                                    });
                                } catch (A) {}
                                regs[vm_code[++pc]][regs[vm_code[++pc]]] = regs[vm_code[++pc]];
                                break;
                        }
                    }
                } catch (e) {

                }
            }
        }
        function createVM2(entrypoint, params, world, initialData, errorReportCallback) {
            return function vm_runtime() {
                var tempParams;
                var tempParamsCount;
                var regs = [world, initialData, params, this, arguments, vm_runtime, vm_code, 0];
                var fnCtx = undefined;
                var pc = entrypoint;
                var tryCatchHandlers = [];
                try {
                    for (;;) {
                        switch (vm_code[++pc]) {

                        }
                    }
                } catch (e) {

                }
            }
        }
        return isVM1 ? createVM1 : createVM2;
    }
}
const createVM = VM(encod_code, false);
const vm_func = createVM(entrypoint, params, world, initialData, errorReportCallback);
vm_func();
```

首先调用createVM函数传入入口点、初始化参数、全局变量、初始数据等等，返回一个构造好的虚拟函数

在该函数中会从入口点开始读取操作码，根据不同的操作码找到对应的handler，执行完handler后又返回分发器继续获取下一个操作码，循环往复，直到遇到return，结束运行该虚拟函数，整个执行流程如下所示：

![](https://attach.52pojie.cn/forum/202506/28/030257fqkemrwbrco62dmw.png)

该虚拟机共有82个handler

举几个例子：

```
case 0:
    regs[vm_code[++pc]] = new regs[vm_code[++pc]](regs[vm_code[++pc]]);
    break;
case 1:
    return regs[vm_code[++pc]];
 case 2:
    for (tempParams = [], tempParamsCount = vm_code[++pc]; tempParamsCount > 0; tempParamsCount--) {
        tempParams.push(regs[vm_code[++pc]]);
    }
    regs[vm_code[++pc]] = createVM2(pc + vm_code[++pc], tempParams, world, initialData, errorReportCallback);
    try {
        Object.defineProperty(regs[vm_code[pc - 1]], "length", {
            value: vm_code[++pc],
            configurable: true,
            writable: false,
            enumerable: false
        });
    } catch (v) {}
    break;
case 6:
    regs[vm_code[++pc]] = regs[vm_code[++pc]] >> vm_code[++pc];
    regs[vm_code[++pc]] = regs[vm_code[++pc]][regs[vm_code[++pc]]];
    break;
case 13:
    regs[vm_code[++pc]] = regs[vm_code[++pc]] | regs[vm_code[++pc]];
    regs[vm_code[++pc]][regs[vm_code[++pc]]] = regs[vm_code[++pc]];
    pc += regs[vm_code[++pc]] ? vm_code[++pc] : vm_code[(++pc, ++pc)];
    break;
```

每个handler中又包含了多个操作(可以称之为一条指令)

### 二、虚拟指令

在看下面指令介绍之前，可以先了解一下js中自增运算的特性，可以参考这位师傅的文章`https://www.resourch.com/archives/129.html`

以下内容均引用该师傅的文з«

> 可以发现，第一次输出的PC为3，第二次则为4
>
> ```
> var PC = 1
> PC += ++PC
> // PC = 3
> ```
>
> ```
> var PC = 1
> var value = ++PC
> PC += value
> // PC = 4
> ```
>
> 我们将这段代码编译为v8字节码
>
> ```
> var PC = 0;
> PC +=1;
> ```
>
> ```
>  0x63e081d5b7a @    0 : 0c                LdaZero
>  0x63e081d5b7b @    1 : 25 02             StaCurrentContextSlot [2]
>  0x63e081d5b7d @    3 : 17 02             LdaImmutableCurrentContextSlot [2]
>  0x63e081d5b7f @    5 : 45 01 00          AddSmi [1], [0]
>  0x63e081d5b87 @   13 : c4                Star0
>  0x63e081d5b88 @   14 : a9                Return
> ```
>
> * **`LdaZero`**：将常量 `0` （PC的值）加载到累加器（Accumulator）中。
> * **`StaCurrentContextSlot [2]`**：将累加器中的值存储到当前上下文的槽位 `2` 中。
> * **`LdaImmutableCurrentContextSlot [2]`**：将当前上下文槽位 `2` 中的不可变值加载到累加器中。
> * **`AddSmi [1], [0]`**：将累加器中的值与小整数（Smi）`1` 相加，并将结果存储在累加器中。
> * **`Return`** 返回累加器中的值
>
> 看出什么端倪了吗？在第一条字节码中，就已经获取了PC的值，并将其存入累加器，这意味着累加时，赋值语句左侧的PC一直是最初的值
>
> `PC += ++PC` 实际上等同于 `PC = (PC)+(++value)`，变成了简单的覆盖操作，而不是在右侧表达式执行完毕后再进行累еҠ

#### (一) 基础指令

##### 1、Mov

将寄存器赋值给寄存器

```
regs[vm_code[++pc]] = regs[vm_code[++pc]];
```

```
Ra = Rb
```

##### 2、MovCall

将源寄存器传入某个函数中，得到执行结果后赋值给目标寄存器

```
regs[vm_code[++pc]] = Y(regs[vm_code[++pc]])
```

```
Ra = Y(Rb)
```

##### 3、LoadImm

将一个立即数赋值给寄存器，这个立即数是从vm\_code中获取的

```
regs[vm_code[++pc]] = vm_code[++pc];
```

```
Ra = b
```

##### 4、LoadConstant

将一个常量赋值给寄存器，这个常量并不在vm\_code，而是直接给定的，不会影响pc，如下：

```
regs[vm_code[++pc]] = "";
regs[vm_code[++pc]] = {};
regs[vm_code[++pc]] = true;
```

```
Ra = "";
Ra = {};
Ra = true;
```

#### (二) 运算指令

##### 1、算数运算

###### (1) Add

`目的操作数 = 源操作数1 + 源操作数2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] + vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] + regs[vm_code[++pc]]
```

源操作数可能为`寄存器`也可能为`立即数`

```
Ra = Rb + c;
Ra = Rb + Rc;
```

###### (2) Sub

`目的操作数 = 源操作数1 - 源操作数2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] - vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] - regs[vm_code[++pc]]
```

源操作数可能为`寄存器`也可能为`立即数`

```
Ra = Rb - c;
Ra = Rb - Rc;
```

###### (3) Mul

`目的操作数 = 源操作数1 * 源操作数2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] * vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] * regs[vm_code[++pc]]
```

源操作数可能为`寄存器`也可能为`立即数`

```
Ra = Rb * c;
Ra = Rb * Rc;
```

######

###### (4) Div

`目的操作数 = 源操作数1 / 源操作数2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] / vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] / regs[vm_code[++pc]]
```

源操作数可能为`寄存器`也可能为`立即数`

```
Ra = Rb / c;
Ra = Rb / Rc;
```

###### (5) Mod

`目的操作数 = 源操作数1 % 源操作数2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] % vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] % regs[vm_code[++pc]]
```

源操作数可能为`寄存器`也可能为`立即数`

```
Ra = Rb % c;
Ra = Rb % Rc;
```

###### (6) Neg

`目的操作数 = -源操作数`

> 这里的源操作数一般就是寄存器，该虚拟机中没有出现立即数的情况

```
regs[vm_code[++pc]] = -regs[vm_code[++pc]];
```

```
Ra = -Rb;
```

###### (7) PreIncrementAssign

`目的操作数 = ++源操作数`

> 这里的源操作数肯定是寄存器，一个立即数怎么可能去自增呢

```
regs[vm_code[++pc]] = ++regs[vm_code[++pc]];
```

```
Ra = ++Rb;
```

###### (8) PostIncrementAssign

`目的操作数 = 源操作数++`

> 这里的源操作数肯定是寄存器，一个立即数怎么可能去自增呢

```
regs[vm_code[++pc]] = regs[vm_code[++pc]]++;
```

```
Ra = Rb++;
```

##### 2、逻辑运算

###### (1) LogicalAnd

`目的操作数 = 源操作数1 && 源操作数2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] && vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] && regs[vm_code[++pc]]
```

源操作数可能为`寄存器`也可能为`立即数`

```
Ra = Rb && c;
Ra = Rb && Rc;
```

###### (2) LogicalOr

`目的操作数 = 源操作数1 || 源操作数2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] || vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] || regs[vm_code[++pc]]
```

源操作数可能为`寄存器`也可能为`立即数`

```
Ra = Rb || c;
Ra = Rb || Rc;
```

###### (3) LogicalNot

`目的操作数 = !源操作数`

```
regs[vm_code[++pc]] = !regs[vm_code[++pc]];
```

> 源操作数一般为寄存器，如果是一个立即数，那在生成vm\_code的时候就直接取非么，不会留到虚拟指令运行时去取反的

```
Ra = !Rb
```

##### 3、位运算

###### (1) BitwiseAnd

`目的操作数 = 源操作数1 & 源操作数2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] & vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] & regs[vm_code[++pc]]
```

源操作数可能为`寄存器`也可能为`立即数`

```
Ra = Rb & c;
Ra = Rb & Rc;
```

###### (2) BitwiseOr

`目的操作数 = 源操作数1 | 源操作数2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] | vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] | regs[vm_code[++pc]]
```

源操作数可能为`寄存器`也可能为`立即数`

```
Ra = Rb | c;
Ra = Rb | Rc;
```

###### (3) BitwiseXor

`目的操作数 = 源操作数1 ^ 源操作数2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] ^ vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] ^ regs[vm_code[++pc]]
```

源操作数可能为`寄存器`也可能为`立即数`

```
Ra = Rb ^ c;
Ra = Rb ^ Rc;
```

###### (4) BitwiseNot

`目的操作数 = !源操作数`

```
regs[vm_code[++pc]] = ~regs[vm_code[++pc]];
```

> 源操作数一般为寄存器，如果是一个立即数，那在生成vm\_code的时候就直接取反么，不会留到虚拟指令运行时去取反的

```
Ra = ~Rb
```

###### (5) BitwiseSal

`目的操作数 = 源操作数1 << 源操作数2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] << vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] << regs[vm_code[++pc]]
```

源操作数可能为`寄存器`也可能为`立即数`

```
Ra = Rb << c;
Ra = Rb << Rc;
```

###### (6) BitwiseShr

`目的操作数 = 源操作数1 >>> 源操作数2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] >>> vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] >>> regs[vm_code[++pc]]
```

源操作数可能为`寄存器`也可能为`立即数`

```
Ra = Rb >>> c;
Ra = Rb >>> Rc;
```

###### (7) BitwiseSar

`目的操作数 = 源操作数1 >> 源操作数2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] >> regs[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] >> regs[vm_code[++pc]]
```

源操作数可能为`寄存器`也可能为`立即数`

```
Ra = Rb >> c;
Ra = Rb >> Rc;
```

##### 4、比较指令

###### (1) Cmp

比较的条件有`<`, `<=`, `>`, `>=`, `===`, `==`, `!===`, `!==`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] cond vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] cond regs[vm_code[++pc]];
```

```
Ra = Rb cond c;
Ra = Rb cond Rc;
```

#### (三) 控制流指令

##### 1、Jz

分支语句

```
pc += regs[vm_code[++pc]] ? vm_code[++pc] : vm_code[++pc, ++pc];
```

```
Jz<Ra> b: c
```

![](https://attach.52pojie.cn/forum/202506/28/030250if0y10oy15xsntn5.png)

##### 2、Ret

return语句，会退出虚拟函数

```
return regs[vm_code[++pc]];
```

包含该指令的handler就是退出handler

#####

##### 3、Call

顾名思义，就是调用其他函数，这里使用的是js中Function的call方法

```
regs[vm_code[++pc]] = regs[vm_code[++pc]].call(fnCtx);
regs[vm_code[++pc]] = regs[vm_code[++pc]].call(fnCtx, regs[vm_code[++pc]], regs[vm_code[++pc]]);
regs[vm_code[++pc]] = regs[vm_code[++pc]].call(regs[vm_code[++pc]]);
regs[vm_code[++pc]] = regs[vm_code[++pc]].call(regs[vm_code[++pc]], regs[vm_code[++pc]]);
```

这里的fnCtx会被初始化为undefined

这个在处理的时候需要关注一下传入参数的个数以及this指针

#### (四) 对象操作指令

##### 1、NewObj

就是new一个新的对象

```
regs[vm_code[++pc]] = new regs[vm_code[++pc]](regs[vm_code[++pc]]);
```

```
Ra = new Rb(Rc, ...)
```

这里也需要注意传入参数的个数

##### 2、PropSet

给某个对象的某个属性赋值

```
regs[vm_code[++pc]][regs[vm_code[++pc]]] = regs[vm_code[++pc]];
regs[vm_code[++pc]][vm_code[++pc]] = regs[vm_code[++pc]];
regs[vm_code[++pc]][regs[vm_code[++pc]]] = vm_code[++pc];
regs[vm_code[++pc]][vm_code[++pc]] = vm_code[++pc];
```

```
Ra[Rb] = Rc;
Ra[b] = Rc;
Ra[Rb] = c;
Ra[b] = c;
```

这里除了被修改的对象操作数以外，其他操作数有可能是寄存器也有可能是立即数

##### 3、PropGet

```
regs[vm_code[++pc]] = regs[vm_code[++pc]][regs[vm_code[++pc]]];
regs[vm_code[++pc]] = regs[vm_code[++pc]][vm_code[++pc]];
```

```
Ra = Rb[Rc];
Ra = Rb[c];
```

#### (五) 字符串操作指令

##### 1、StrConcat

```
regs[vm_code[++pc]] += String.fromCharCode(vm_code[++pc]);
```

```
Ra += String.fromCharCode(b);
```

#### (六) 特殊指令

##### 1、ArrayCreate

```
regs[vm_code[++pc]] = Array(vm_code[++pc]);
```

```
Ra = Array(b);
```

创建容量为b的数组

##### 2、ConvertToNumber

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] - 0;
```

```
Ra = Rb - 0;
```

将一个寄存器变成一个数字

##### 3、CreateVmFunction

这个是重中之重，用来调用createVM1或者createVM2来创建一个新的虚拟函数，以便后续使用Call指令进行调用

换句话来说，其实这个虚拟机就是一个又一个的虚拟函数组成，给定一个入口函数，开始执行，函数之间互相调用完成对应的功能，最终返回运算结果

```
for (tempParams = [], tempParamsCount = vm_code[++pc]; tempParamsCount > 0; tempParamsCount--) {
    tempParams.push(regs[vm_code[++pc]]);
}
regs[vm_code[++pc]] = createVM2(pc + vm_code[++pc], tempParams, world, initialData, errorReportCallback);
try {
    Object.defineProperty(regs[vm_code[pc - 1]], "length", {
        value: vm_code[++pc],
        configurable: true,
        writable: false,
        enumerable: false
    });
} catch (v) {}
```

![](https://attach.52pojie.cn/forum/202506/28/030242mvn6jvevcje4eepn.png)

* count: 这个是该函数临时params的个数, 在函数内部使用
* param\_i: 这个具体的params
* target: 寄存器操作数，用来保存创建后的虚拟函数
* offset: 新的虚拟函数的pc偏移(pc = off + offset)
* length: 这个是新创建函数的length，是Function的一个属性，用来指示形参个数

#### (七) 中间指令集抽象定义

由于是jsvmp，所以使用js代码来处理

##### 1、指令类

定义`IRInstruction`基类类，用来存放基本的属性，例如`ir_name`, `address`, `ins_len`

接着根据不同的指令定义对应的类，均继承该基类，我定义了如下指令类，其继承关系如下图：

![](https://attach.52pojie.cn/forum/202506/28/030246g78f7a75s87j9x5z.png)

##### 2、操作数类

上面的分析可知，操作数分为两类，一类是寄存器，另一类是立即数

![](https://attach.52pojie.cn/forum/202506/28/030248azenckecfd2frh2t.png)

### 三、构建控制流图

在构建控制流图前，先定义一下基本块类

```
class BasicBlock {
    static blockId = 0;
    static exitAddr = -1;

    constructor() {
        this.id = BasicBlock.blockId++;
        this.startAddr = BasicBlock.exitAddr;
        this.endAddr = BasicBlock.exitAddr;
        this.instructions = [];
        this.prevBlocks = new Set(); // 前驱基本块
        this.nextBlocks = new Map(); // 后继基本块: true 或者 false分支
        this.isExitBlock = false;
    }
}
```

#### (一) 创建初始基本块

此步骤为每个handler创建一个基本块对象，然后将handler中的多条虚拟指令添加到基本块中

* 如果handler最后一个指令不是Jz，那就将该基本块的后驱节点设置为下一个handler的地址(可根据该handler的字节码长度计算得到)
* 如果handler最后一个指令是Jz，那就递归的处理true和false分支
  + 该虚拟机会有一种花指令，其Jz条件恒真或恒假，此时就不需要递归处理false或者true分支

在创建初始基本块时，可能会遇到虚拟字节码自更改的情况，这个时候需要打上补丁，详细分析可以参考`https://jixun.uk/posts/2024/qqmusic-zzc-sign/`

#### (二) 填充基本块前驱节点

此步骤会将基本块的前驱节点字段填充

遍历所有基本块，将其后驱节点的前驱节点设置为当前基本块

#### (三) 合并基本块

如果一个节点的后驱节点只有一个, 并且这个唯一的后驱节点的前驱节点也只有一个, 那么后驱节点就可以与该节点合并

#### (四) 删除花指令

该虚拟机架构主要有两种花指令

* Jz条件恒真或恒假，此时就不需要递归处理false或者true分支
* Jz的条件进行二次判断

  ![](https://attach.52pojie.cn/forum/202506/28/030252r2ec4127e5zeickc.png)

  可以看到当Rx为假时会跳转到`Block off2`基本块，那么此时`Block off2`中关于Rx的判断一定也是假，那么就不会跳转到`Block off3`，而是跳转到`Block off4`，所以从`Block off2`到`Block off3`这条边需要删掉

#### (五) 生成控制流图

遍历所有基本块，根据其前驱节点和后驱节点，生成节点和边，最终得到`dot`文件，使用`Graphviz`工具将`dot`文件转换成png

### 四、qqyysign分析

#### (一) f\_3945

从虚拟机入口开始分析，最开始的入口函数地址偏移为`3945`

其控制流图如下所示：

![](https://attach.52pojie.cn/forum/202506/28/030301m0ekehgwgwk9zkwk.png)

手动转换成js代码如下：

```
function f_3945() {
    f_4(f_4157)
    return undefined;
}
```

#### (二) f\_4

接着需要分析偏移为4的函数，其控制流图如下：

![](https://attach.52pojie.cn/forum/202506/28/030259v9vvyfhav9wtv2mx.png)

转换成js代码如下：

```
function f_4(func) {
    if (typeof window["define"] === "function" && window["define"]["amd"]) {
        window["define"].call(undefined, func);
    } else {
        func.call(undefined);
    }
    return undefined;
}
```

就是将传入的参数当作函数调用

#### (三) f\_4157

![](https://attach.52pojie.cn/forum/202506/28/030303iqjc4qjz1ocwxxd4.png)

```
function f_4157() {a
    // createVM1(6777, length=1, paramsCount=1, param=[R26])
    R24 = [f_6777];
    // createVM1(5770, length=1, paramsCount=1, param=[R24]);
    R43 = [f_5770];
    R33 = [getGlobalContext()];
    R34 = [window];
    R25 = [["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"]];
    R20 = [[-2147483648, 8388608, 32768, 128]];
    R27 = [[24, 16, 8, 0]];
    R26 = [[]];
    // createVM1(3902, length=1, paramsCount=2, param=[R34,R27]);
    f_6777.prototype.update = f_3902;
    // createVM1(6860, length=0, paramsCount=1, param=[R20]);
    f_6777.prototype.finalize = f_6860;
    // createVM1(4633, length=0, paramsCount=0, param=[]);
    f_6777.prototype.hash = f_4633;
    // createVM1(2555, length=0, paramsCount=1, param=[R25]);
    f_6777.prototype.hex = f_2555;
    f_6777.prototype.toString = f_6777.prototype.hex;
    // createVM1(5329, length=1, paramsCount=2, param=[R43,R33]);
    window._getSecuritySign = f_5329;
    return undefined;
}
```

这里就发现了关键的函数`_getSecuritySign`，其偏移为5329，这个就是用来生成sign的函数

结合网上公开的分析以及这里的函数名`update`, `finalize`, `hash`, `hex`，可以知道这里其实是一个sha1的类

<https://github.com/emn178/js-sha1/blob/5c5ec87/src/sha1.js#L145>

#### (四) f\_5329

![](https://attach.52pojie.cn/forum/202506/28/030306qfy1p1spv1v91ff6.png)

```
function f_5329(data) {
    let params = [
        [f_5770],
        [getGlobalContext()]
    ];
    R88 = data;
    sha1 = f_5770(data).toUpperCase();
    R43 = [sha1];
    R67 = Array(0);
    R128 = [f_5770];
    R160 = [getGlobalContext()];
    R94 = vm_runtime;
    R85 = {"0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "A": 10, "B": 11, "C": 12, "D": 13, "E": 14, "F": 15};
    R116 = "ABCDEDGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    // R135 = getVariableType(window) === "object";
    // R135 = getVariableType(window.navigator) === "object";
    R135 = getVariableType(window.location) === "object";
    R104 = getVariableType(window.location) === "object";
    R71 = /Headless/i.test(navigator.userAgent);
    R154 = /Headless/i.test(navigator.userAgent);
    R78 = ["qq.com", "joox.com", "tencentmusic.com", "wavecommittee.com", "kugou.com", "kuwo.cn"];
    R98 = R78.some((ele) => {
        return location.host.indexOf(ele) !== -1;
    }); // R98 = true
    R78 = false;
    R95 = [23, 14, 6, 36, 16, 40, 7, 19];
    // createVM1(3488, length=1, paramsCount=2, param=[R67,R43]);
    R139 = R95.map((ele) => {
        return R43[0][ele];
    });
    R8 = R139.join("");
    R153 = [16, 1, 32, 12, 19, 27, 8, 5];
    R186 = R153.map((ele) => {
        return R43[0][ele];
    });
    R162 = R186.join("");

    R87 = [89, 39, 179, 150, 218, 82, 58, 252, 177, 52, 186, 123, 120, 64, 242, 133, 143, 161, 121, 179];
    R48 = [];
    R181 = 0;
    while (R181 < 20) {
        // R85 = {"0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "A": 10, "B": 11, "C": 12, "D": 13, "E": 14, "F": 15};
        R48.push(R85[sha1[R181 * 2]] * 16 + R85[sha1[R181 * 2 + 1]] ^ R87[R181]);
        R181++;
    }

    R85 = false;
    R43[0] = false;
    R87 = false;
    R80 = "";
    R61 = 0;
    while (R61 < 6) {
        // R116 = "ABCDEDGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        R80 += R116[R48[R61 * 3] >> 2] + R116[R48[R61 * 3] & 3 << 4 | R48[R61 * 3 + 1] >> 4] + R116[R48[R61 * 3 + 1] & 15 << 2 | R48[R61 * 3 + 2] >> 6] + R116[R48[R61 * 3 + 2] & 63];
        R61++;
    }
    R80 += R116[R48[18] >> 2] + R116[R48[18] & 3 << 4 | R48[19] >> 4] + R116[R48[19] & 15 << 2];

    R46 = "zzc" + R8 + R80.replace(/[\/+]/g, "") + R162;
    R134 = R46.toLowerCase();
    return R134;
}
```

可以看到sign由三部分构成

### 四、下步改进方向

本方法只是去除了最简单的花指令，然后生成控制流图，最后手动优化得到js代码，属于半自动半手动

下一步将继续学习中间代码优化相关知识，进行常量折叠、常量传播等优化，优化完毕后将控制流图转换成对应的js代码

### 参考资料

[对抗QQ音乐网页端的请求签名(zzc + ag-1)](https://jixun.uk/posts/2024/qqmusic-zzc-sign/)

[jsvmp编译与反编译详解 (3)——某讯新版vmp反编译](https://www.resourch.com/archives/129.html)
