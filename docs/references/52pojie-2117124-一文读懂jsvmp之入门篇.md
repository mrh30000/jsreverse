# 一文读懂jsvmp之入门篇

> **作者**: PokerS429 | **发布时间**: 2026-07-14 11:41:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 989 / 4
> **原文**: [https://www.52pojie.cn/thread-2117124-1-1.html](https://www.52pojie.cn/thread-2117124-1-1.html)

---

**一文读懂jsvmp之入门篇**

**一、什么是jsvmp**

JSVMP (Virtual Machine based code Protection for JavaScript) 作为一种先进的代码虚拟化保护方案，能够有效提升 JavaScript 代码的安全性。

当然了，这是官话，通俗的来讲，JSVMP 是把原本可读的 JS 逻辑，转换成一套自定义[虚拟机](https://www.52pojie.cn/thread-661779-1-1.html)能识别的字节码，然后用一个 JS 写的解释器去执行这些字节码。

这样说，可能也不太理解，于是，我们来通过一个简单的例子，看一看大概是一个什么感觉

[] *纯文本查看*

```

var username = "admin";
var password = "123456";
var loginTime = Date.now();
var userToken = username + "_" + password;
var finalHash = btoa(userToken + loginTime);
window.authResult = finalHash;
```

我们借用csdn上d0ublecl1ck\_大佬的例子，用我们自定义的vm来举例，依次说明

[] *纯文本查看*

```

(function () {
  var constPool = [
    "admin",
    "123456",
    "_",
    "authResult"
  ];

  var stack = [];
  var regs = [];

  var bytecode = [
    0x01, 0,   // push constPool[0] => "admin"
    0x02, 0,   // store regs[0]

    0x01, 1,   // push constPool[1] => "123456"
    0x02, 1,   // store regs[1]

    0x03,      // Date.now()
    0x02, 2,   // store regs[2]

    0x04, 0,   // load regs[0]
    0x01, 2,   // push "_"
    0x05,      // add
    0x04, 1,   // load regs[1]
    0x05,      // add
    0x02, 3,   // store regs[3]

    0x04, 3,   // load userToken
    0x04, 2,   // load loginTime
    0x05,      // add
    0x06,      // btoa()
    0x02, 4,   // store regs[4]

    0x04, 4,   // load finalHash
    0x07, 3,   // window[constPool[3]] = value

    0xff       // end
  ];

  var ip = 0;

  while (ip < bytecode.length) {
    var op = bytecode[ip++];

    switch (op) {
      case 0x01: {
        var index = bytecode[ip++];
        stack.push(constPool[index]);
        break;
      }

      case 0x02: {
        var regIndex = bytecode[ip++];
        regs[regIndex] = stack.pop();
        break;
      }

      case 0x03: {
        stack.push(Date.now());
        break;
      }

      case 0x04: {
        var regIndex = bytecode[ip++];
        stack.push(regs[regIndex]);
        break;
      }

      case 0x05: {
        var b = stack.pop();
        var a = stack.pop();
        stack.push(String(a) + String(b));
        break;
      }

      case 0x06: {
        var value = stack.pop();
        stack.push(btoa(value));
        break;
      }

      case 0x07: {
        var propIndex = bytecode[ip++];
        var value = stack.pop();
        window[constPool[propIndex]] = value;
        break;
      }

      case 0xff:
        return;
    }
  }
})();
```

先把源码放在这里，接下来，跟随我一起进入控制台来一步一步看，vm内究竟发生了什么

**二、举例说明jsvmp简单运转逻辑**

**自定义字节码数组**

首先断点打在var ip = 0上，然后鼠标移至bytecode的位置，我们看一下bytecode是什么，很明显，是上面写好的数组。于是，我们管这个数组，叫做字节码。更准确的说，它一组自定义 VM 指令序列 / 自定义字节码数组。

在这个案例中，为了便于观察，我们按照虚拟机的取指顺序和每条指令的参数结构，将字节码拆分成了多行并添加注释。但在真实 JSVMP 样本中，字节码通常是连续存储的，没有注释，也不会直观区分每条指令的边界。

通常，会是这样的，var bytecode = [1,0,2,0,1,1,2,1,3,2,2,4,0,1,2,5,4,1,5,2,3,4,3,4,2,5,6,2,4,4,4,7,3,255];这也仅仅是六行代码做出来的指令序列。

![](https://i.markdowneditor.cloud/20260714112833.png)

**初始化部分**

我们把部分源码提取出来，接下来的讲解在代码块中。

[] *纯文本查看*

```

 var constPool = [
    "admin",
    "123456",
    "_",
    "authResult"
  ];//首先，我们定义了一个常量池，这通常是用来集中存放程序运行时会用到的固定值。但并不是所有jsvmp都这么处理固定值部分的。处理这些固定值的方法有许多，固定值可能被加密、拆分、内联到字节码中，或者在运行时动态生成。这里只是为了举例，所以很简单。

  var stack = [];//这里我们定义了一个数组 stack，用来模拟虚拟机的操作数栈，也可以叫工作栈。在 VM 执行字节码的过程中，很多指令都会把数据压入栈中，或者从栈中弹出数据进行计算。后续运行过程中，我们会重点观察每条指令是如何对这个工作栈进行入栈、出栈和取值操作的。
  var regs = [];//寄存器数组，用于保存虚拟机运行过程中的中间变量或局部变量。

//注意！以上两个变量，在真实jsvmp中，大多数以单个字母，或者混淆变量名出现。

  var bytecode = [0x01,0,0x02,0,0x01,1,0x02,1,0x03,0x02,2,0x04,0,0x01,2,0x05,0x04, 1,0x05,0x02,3,0x04,3,0x04,2,0x05,0x06,0x02,4,0x04,4,0x07,3,0xff];//自定义字节码数组

  var ip = 0;//起始坐标，我们也可以叫指针，因为它起的就是指针的作用，那么通俗的来讲，它会告诉程序，现在我们走到了字节码数组中的哪一个位置了。当然在这里还是要说，各个jsvmp中的表现方式不同，要注意观察
```

**opcode**

紧接着，我们按照代码顺序向下分析，一个while循环，在ip没走完的时候，一直执行。

var op = bytecode[ip++];这样读出来的 op 叫 **opcode**。operation code，**操作码**，也就是“这条指令要做什么操作”的编号。

如果您刚接触jsvmp，那就会隐隐有这种疑惑。

> VM 是怎么知道当前读出来的这个数字是“操作码”，而不是“参数值”的？
> 为什么 0x01 就一定对应 push const，而不是别的意思？

这都是因为，我们已经提前约定好的“指令格式”————>字节码数组

字节码数组通过ip走到了哪里，自然就会知道现在该干什么。冥冥之中，自有安排~

好，那我认为，我已经说明白了var op = bytecode[ip++];这行代码，简单来说，就是告诉程序，现在该执行哪个操作了。

**堆栈操作**

在学习核心知识之前，先在这里，为大家提前补习一些基础知识。

入栈与出栈

[] *纯文本查看*

```

var stack = [];
stack.push(10)//stack = [10]
stack.push(20)//stack = [10,20]
stack.pop()//stack = [10]
var value = stack.pop();//value = 10   stack = []
```

查看栈顶

[] *纯文本查看*

```

stack = [10,20,30]
var top = stack[stack.length - 1];//top = 30
//这种操作是只查看，不删除
```

其他的一些基础操作
反转数组

[] *纯文本查看*

```

stack = [10,20,30]
stack.reverse();// stack = [30,20,10]
```

从数组开头取元素

[] *纯文本查看*

```

stack = [10,20,30]
var value = stack.shift();
console.log(value); // 10
console.log(stack); // [20, 30]
```

往数组**开头**插入一个值

[] *纯文本查看*

```

stack = [10,20,30]
stack.unshift(null);
console.log(stack); // [null, 10, 20, 30]
```

截取数组，不修改原数组

[] *纯文本查看*

```

var stack = [10, 20, 30, 40];

var part = stack.slice(1, 3);//左闭右开
var copy = stack.slice(0)//浅拷贝
console.log(part); // [20, 30]
console.log(stack);  // [10, 20, 30, 40]
console.log(copy);//[10, 20, 30, 40]
```

**浅拷贝与深拷贝**

> 浅拷贝：只复制外层，里面对象还共用。
> 深拷贝：外层和里面嵌套内容都重新复制。

[] *纯文本查看*

```

//浅拷贝
var a = [{ name: "admin" }];
var b = a.slice(0);
console.log(b); // [{ name: "admin" }]
console.log(a === b); // false
//a 和 b 不是同一个数组
//但是数组里的对象还是同一个
console.log(a[0] === b[0]); // true
b[0].name = "test";
console.log(a[0].name); // test
```

[] *纯文本查看*

```

//深拷贝
var a = [{ name: "admin" }];
var b = structuredClone(a);
b[0].name = "test";
console.log(a[0].name); // admin
console.log(b[0].name); // test
console.log(a === b);       // false
console.log(a[0] === b[0]); // false
```

**opcode handler**

有了以上的基础知识，我们终于可以学习核心部分

那么接下来，就是switch 里面每个 case 对应的代码块

> **opcode handler**
> 操作码处理逻辑 / 指令处理器

同时，我们把字节码数组也拿到，这样大家就能边看处理顺序，边理解操作码的处理逻辑了

[] *纯文本查看*

```

var bytecode = [
    0x01, 0,   // push constPool[0] => "admin"
    0x02, 0,   // store regs[0]

    0x01, 1,   // push constPool[1] => "123456"
    0x02, 1,   // store regs[1]

    0x03,      // Date.now()
    0x02, 2,   // store regs[2]

    0x04, 0,   // load regs[0]
    0x01, 2,   // push "_"
    0x05,      // add
    0x04, 1,   // load regs[1]
    0x05,      // add
    0x02, 3,   // store regs[3]

    0x04, 3,   // load userToken
    0x04, 2,   // load loginTime
    0x05,      // add
    0x06,      // btoa()
    0x02, 4,   // store regs[4]

    0x04, 4,   // load finalHash
    0x07, 3,   // window[constPool[3]] = value

    0xff       // end
  ];
```

我们就以第一次的操作举例0x01, 0，意思是去case 0x01的地方。

[] *纯文本查看*

```

case 0x01: {
        //在第一次操作的时候，我们的ip已经在var op = bytecode[ip++];这里自增过了，此时id=1
        var index = bytecode[ip++];//index = bytecode[1] = 0
    //而后，ip++ ->ip = 2
        stack.push(constPool[index]);
    //将常量池中的第0号元素admin，入栈
    //此时stack = ['admin']
        break;
      }
```

我们继续示例，以便于大家彻底理解stack工作栈的用途

紧接着，0x02, 0，意思是去case 0x02的地方

[] *纯文本查看*

```

 case 0x02: {
     //ip已经在var op = bytecode[ip++];这里自增过了，此时id=3
        var regIndex = bytecode[ip++];//regIndex = bytecode[3] = 0
     //而后，ip++ ->ip = 4
        regs[regIndex] = stack.pop();
     //regs[0] = 'admin'
     //此时stack = []
        break;
      }
```

接下来，我就不一一举例了，感兴趣的话可以继续模拟下去，在这里我们直接给出stack的变化

|  |  |  |  |
| --- | --- | --- | --- |
| 步骤 | 指令 | 操作 | stack 变化 |
| 1 | 0x01, 0 | push "admin" | ["admin"] |
| 2 | 0x02, 0 | pop，存入 regs[0] | [] |
| 3 | 0x01, 1 | push "123456" | ["123456"] |
| 4 | 0x02, 1 | pop，存入 regs[1] | [] |
| 5 | 0x03 | push Date.now() | [T] |
| 6 | 0x02, 2 | pop，存入 regs[2] | [] |
| 7 | 0x04, 0 | push regs[0] | ["admin"] |
| 8 | 0x01, 2 | push "\_" | ["admin", "\_"] |
| 9 | 0x05 | pop 两个值，相加 | ["admin\_"] |
| 10 | 0x04, 1 | push regs[1] | ["admin\_", "123456"] |
| 11 | 0x05 | pop 两个值，相加 | ["admin\_123456"] |
| 12 | 0x02, 3 | pop，存入 regs[3] | [] |
| 13 | 0x04, 3 | push regs[3] | ["admin\_123456"] |
| 14 | 0x04, 2 | push regs[2] | ["admin\_123456", T] |
| 15 | 0x05 | pop 两个值，相加 | ["admin\_123456" + T] |
| 16 | 0x06 | pop，执行 btoa()，再 push | [H] |
| 17 | 0x02, 4 | pop，存入 regs[4] | [] |
| 18 | 0x04, 4 | push regs[4] | [H] |
| 19 | 0x07, 3 | pop，赋值给 window.authResult | [] |
| 20 | 0xff | 结束 | [] |

[] *纯文本查看*

```

while (ip < bytecode.length) {
    var op = bytecode[ip++];

    switch (op) {
      case 0x01: {
        var index = bytecode[ip++];
        stack.push(constPool[index]);
        break;
      }

      case 0x02: {
        var regIndex = bytecode[ip++];
        regs[regIndex] = stack.pop();
        break;
      }

      case 0x03: {
        stack.push(Date.now());
        break;
      }

      case 0x04: {
        var regIndex = bytecode[ip++];
        stack.push(regs[regIndex]);
        break;
      }

      case 0x05: {
        var b = stack.pop();
        var a = stack.pop();
        stack.push(String(a) + String(b));
        break;
      }

      case 0x06: {
        var value = stack.pop();
        stack.push(btoa(value));
        break;
      }

      case 0x07: {
        var propIndex = bytecode[ip++];
        var value = stack.pop();
        window[constPool[propIndex]] = value;
        break;
      }

      case 0xff:
        return;
    }
  }
```

所以我们可以看到，这段 VM 的核心并不是浏览器直接执行原始业务逻辑，而是通过 bytecode + opcode handler + stack/regs 的方式，把原始逻辑重新解释执行了一遍。
