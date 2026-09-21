# Q音VMP初始化分析&SHA-1算法识别

> **作者**: LiXieZengHui | **发布时间**: 2026-07-07 21:48:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3979 / 40
> **原文**: [https://www.52pojie.cn/thread-2116112-1-1.html](https://www.52pojie.cn/thread-2116112-1-1.html)

---

*本帖最后由 LiXieZengHui 于 2026-7-8 12:05 编辑*

## QQ音乐Sign逆向

碎碎念

本篇主要分析VMP初始化，识别VMP，识别SHA-1在VMP中的输出特征

此VMP也比较有趣，一般来说VMP会将元操作抽离为某个case或者某个函数，但是此VMP中将多个元操作组合在一个函数中，导致插桩后日志输出较多

## Sign参数分析

我们观察搜索请求

![](https://attach.52pojie.cn/forum/202607/07/213131q2bu6r51t1k97596.png)

直接搜索大法寻找sign的生成位置，我们直接能够找到对应的关键字

![](https://attach.52pojie.cn/forum/202607/07/213135nneda1a9794ej7e5.png)

在来源面板中打开，然后随手写入日志点，发现输出的就是我们的目标，而且目标开头都是zzc

![](https://attach.52pojie.cn/forum/202607/07/213138a99o9d1soekdme91.png)

猜测是某种字符的编码吧，全文搜索没有发现相关的明文字符，我们暂时先放一放，继续分析

![](https://attach.52pojie.cn/forum/202607/07/213140n8t8fu63n6y9tvf9.png)

七步之内必有解药，我们扫一眼就能看到u的计算过程就在上方，我们打断点分析

![](https://attach.52pojie.cn/forum/202607/07/213143nzvlsdiz2kdzkhfd.png)

可以看到参数，估计对应的就是请求体，这里打码是因为包含个人信息

断点向下执行，进入了一个for循环，看着这一堆case和无条件for，还有`[++[]]`，嗯确认过眼神，是VMP(不知道是不是错觉，感觉这个VMP比较的温柔？？？)

![](https://attach.52pojie.cn/forum/202607/07/213146d3gf3ulfuwtgzckg.png)

直接插桩感觉不太行，我们还是先分析一下整体结构吧

## VMP整体分析

众所周知，VMP想要执行，必须先要初始化，我们来看看这个虚拟机是如何一步一步初始化并且最后计算出结果的吧～(注意，接下来的分析默认读者对VMP有初步了解，例如PC、SP、opcode、Stack/Register)

![](https://attach.52pojie.cn/forum/202607/07/213149htevondntkio0dl7.png)

### 函数柯里化

我们来观察一下整体的结构，发现形如`(function(){})()()()`

。。。那么这是啥呢？？？这就是大名鼎鼎的柯里化

柯里化是一种函数式编程技术，它将一个接收多个参数的函数，转换为一系列每次只接收一个参数的函数。每次调用返回一个新的函数，直到所有参数收集完毕才执行原函数。

```
// 普通函数
function add(a, b, c, d) {
    return a + b + c + d;
}
add(1, 2, 3, 4); // 10

// 柯里化版本
function curriedAdd(a) {
    return function(b) {
        return function(c) {
            return function(d) {
                return a + b + c + d;
            };
        };
    };
}
curriedAdd(1)(2)(3)(4); // 10
```

也就是说我们这里先执行这个自执行函数`IIFE`，然后自执行函数返回的函数被第二个括号调用，并且完成参数传递，以此类推，最后完成函数整体调用

这里插一嘴，为啥自执行函数的函数本身需要使用括号包裹？因为不添加括号默认是函数声明，通过添加括号将声明变成表达式，然后再利用第二个括号完成调用。

我们来看一下自执行函数做了什么

![](https://attach.52pojie.cn/forum/202607/07/213152z88kvk7rkkmevdv7.png)

简而言之，这里的IIFE的作用就是创建一个私有作用域，在私有作用域中定义了一些工具函数/变量

* `e`：生成连续数字数组的工具函数
* `t`：Base64 解码函数
* `n`：一个位运算转换函数（处理 VL‑Base128 变长数字）
* `r`：临时数组
* `i`：构建指令映射表（数字数组，后续的虚拟机指令集）
* `o`：对输入的 Base64 字符串完整解码、解析成字节指令流，把原始密文转为指令字节数组`n`
* `i()`、`a()`：两个高度重复的递归函数，二者是**JS 虚拟机的核心解释器**

返回出去的最终函数`function(e,t){...}`
接收外部参数（加密字符串 + 布尔标记`t` ），闭包捕获上面全部私有工具、指令表，后续执行时调用`o`解密、再调用`i/a`虚拟机解释器逐条跑指令。

那么这里可能就有读者要问了

Q：下面那串base64字符串不是已经包含了所有的操作码和操作数了吗？为什么还需要建立指令映射表？？？

A：这是因为我们弄混了字节指令流和指令映射表，我们观察VMP解释器的代码

![](https://attach.52pojie.cn/forum/202607/07/213155icmefyff4afheey4.png)

是一个switch结构，每一个case对应一个独立的操作，这一整套规则就是指令集，像我们这里一共有83个case，说明我们这里一共有83个指令，也就是83个独立操作。

* 0 → 创建对象
* 1 → return 返回
* 2 → 函数调用
* 3 → 小于比较
  ……

一共 83 条指令，对应代码里 switch 的`case 0 ~ case 83`。

按照我们的想法，字节指令流中直接存储我们的`opcode`，在VMP解释器执行的时候，`PC`直接取到`opcode`，然后直接进入`switch`开始匹配对应的操作，但其实不然。真实情况是，PC取到字节流中的`byte_opcode`，然后查询指令映射表得到该指令对应的`case`(也可以认为是`real_opcode`)，也就是说`real_opcode = mapping_table[byte_opcode]`

假设我们JS源码的第一个操作是创建一个对象对应的`opcode`应该是`0`，但是实际上字节指令流解码后对应的是`78`，那么此时我们就需要查询指令映射表来找到`78`对应的真实操作，所以指令映射表实际上就是将`byte_opcode`与`real_opcode` 一一对应的一张表

Q：为什么不直接将`real_opcode`写入字节流中呢？
A：因为如果直接写入一旦完成解码，那么逆向者就可以直接知道调用顺序(虽然现在只不过多了一层转换。。。)，这样可以增加逆向成本。

### VMP初始化

OK，搞清楚了为什么我们需要指令映射表后，我们可以尝试来模拟一下这个VMP的初始化。

自执行函数IIFE执行完成后返回函数`func(e, t)` ，接受参数为`(base64 string, 0)`

![](https://attach.52pojie.cn/forum/202607/07/213158ilnblhcbxec28l9x.png)

我们来看一下闭包函数`o`

```
o = function(e) {
        for (var r = [], i = new Int8Array(t(e)), o = i.length, a = 0; o > a; ) {
            var s = i[a++], u = 127 & s;
            s >= 0 ? r.push(n(u)) : (u |= (127 & (s = i[a++])) << 7,
            s >= 0 || (u |= (127 & (s = i[a++])) << 14,
            s >= 0 || (u |= (127 & (s = i[a++])) << 21,
            s >= 0 || (u |= (s = i[a++]) << 28))),
            r.push(n(u)))
        }
        return r
};
```

创建了一个用于存储结果的数组r，创建了一个Int8Array视图，有符号8位整数数组，初始化为`t(e)` ，然后循环次数为数组长度，循环索引为a，初始化为0

### 解密函数t

* 解密函数t

  我们来看一下解密函数`t`

  ```
  t = function(e) {
    for (var t, n, r = String(e).replace(/[=]+$/, ""), o = r.length, a = 0, s = 0, u = []; s < o; s++)
        ~(n = i[r.charCodeAt(s)]) && (t = a % 4 ? 64 * t + n : n,
        a++ % 4) && u.push(255 & t >> (-2 * a & 6));
    return u
  }
  ```

  r的值为输入的base64字符串删除末尾`=` 后的值，u用来存储结果

  #### 指令映射表

  + 指令映射表

    进入循环的时候我们看到了`i`，也就是指令映射表

    我们分析一下`i`

    ```
    i = e(0, 43, 0)
        .concat([62, 0, 62, 0, 63])
        .concat(e(51, 10, 1))
        .concat(e(0, 8, 0))
        .concat(e(0, 25, 1))
        .concat([0, 0, 0, 0, 63, 0])
        .concat(e(25, 26, 1));

    e = function(e, t, n) {
      for (var r = [], i = 0; i++ < t; )
          r.push(e += n);
      return r
    }
    ```

![](https://attach.52pojie.cn/forum/202607/07/213200hvktk3hfkzc71o56.png)

```
    tip：仅使用console.log可能会因为输出过长而被折叠，搭配`JSON.stringify(array)`使用

在循环体中先获取当前索引对应的字符的码点，然后查询指令映射表，再将结果赋值给n，最后对n按位取反，如果结果为0，直接跳过该字符

那么`~n`什么时候为0呢？？？我们知道JS中按位取反的规则可以认为是`~x = -(x + 1)` ，也就是说当n=-1的时候，就会被跳过。

接下来的运算和base64相关`((t **=** a **%** 4 **?** 64 ***** t **+** n **:** n)**,** a**++** **%** 4)`

这里是逗号表达式，执行完毕后仅返回最右边的值

`a%4`是在判定是否已经取到了4个字符，如果还没到，就将之前积累的值左移6位，然后加上当前mapping后的真实值

- `i` 的真面目
    - 那么看到这里我们上面应该是分析错了，`i`确实是映射表，但是映射的并不单单是`byte_opcode`，而是整个base64 string都被映射了。。。)，也就是说我们看到的硬编码在js文件中的base64字符串实际上是`base64 string’`，有

        ```tsx
        base64 string' = base64 string.forEach(c => {
            func mapping(c)
        });
        ```

如果`t`中已经累计了4个字符的二进制了，那么说明当前n为下一个分组中的第一个字符，直接让`t`记录即可。执行完了左值，接着执行右值并返回。这里的右值就是用来记录当前分组的第几个字符，执行完毕后返回，如果t内尚未完成拼接，就不向后执行；反之则t内值已拼接完成，处于可用状态。

`u**.**push(255 **&** (t **>>** ((**-**2 ***** a) **&** 6)))**;**`

这里不难看出将结果存放入数组u中，但是我们来学习一下他是怎么完成转换的

`255 **&** (t **>>** ((**-**2 ***** a) **&** 6))`

与255相与很好理解，取低8位；

模拟执行一下，

当取第一位的时候，a=0，表达式a++ %4=0，这句话不执行，a=1

a=1的时候，表达式a++ %4=1，a自增后=2，此时t中已经有12位有效bit了，可以输出第一个字符了`t **>>** ((**-**2 ***** a) **&** 6)`

`-2*2 = -4` 的二进制为`11111100`，`6`为`00000110` ，相与的结果为4

所以t右移4位，刚好对应第一个字节

```tsx
t = function (e) {
    for (
        var t,
            n,
            r = String(e).replace(/[=]+$/, ""), // 删除base64 string末尾"="
            o = r.length, // 新字符串的长度
            a = 0, // 标记当前base64分组
            s = 0, // 循环索引
            u = []; // 存储最终结果
        s < o; // 遍历每一个字符
        s++
    )
        ~(n = i[r.charCodeAt(s)]) && // 判定是否为脏数据
            ((t = a % 4 ? 64 * t + n : n), a++ % 4) && // base64 还原
            u.push(255 & (t >> ((-2 * a) & 6)));
    return u;
};
```
```

![](https://attach.52pojie.cn/forum/202607/07/213203fxsb2x2ahpag2ea2.png)

分析完了解密函数t，我们能够看到最后的结果就是字节数组

这里的循环体遍历整个字节数组

`u = 127 & s`，这里是取低7位，相当于排除符号位

这里是标准的 32 位 Varint 解码！！！

| **规则** | **说明** |
| --- | --- |
| **每个字节只用 7 位存数据** | 最高位（bit 7）是标志位 |
| **最高位 = 1** | 表示"后面还有字节"（继续读） |
| **最高位 = 0** | 表示"这是最后一个字节"（停止读） |
| **数据按小端序排列** | 低位字节在前 |
| 一个数最多用5个字节表示 | 4\*7+? = 32 |

```
function decodeVarint32(buffer, offset) {
    let result = 0;
    let shift = 0;
    let byte;

    while (true) {
        // 读取一个字节
        byte = buffer[offset++];

        // 取低 7 位作为数据
        result |= (byte & 0x7F) << shift;

        // 检查最高位：如果为 0，说明是最后一个字节
        if ((byte & 0x80) === 0) {
            break;
        }

        // 移到下一组 7 位
        shift += 7;

        // 32 位 Varint 最多 5 个字节（因为 4*7+? = 32）
        if (shift >= 32) {
            throw new Error("Varint 超过 32 位");
        }
    }

    return { value: result, offset: offset };
}
```

所以这里的o实际上是在将压缩的int还原成标准的32位int，s≥0表示完结，<0表示未完

`(u **|=** (127 **&** (s **=** i[a**++**])) **<<** 7)`

这里美化一下就是`u **=** u **|** ((i[a**++**] **&** 0x7F) **<<** 7)`

就是如果没有完结，就把当前的数据取低7位然后左移7为再或上之前的数据，这里当前值左移7位再或是因为接收到的数据采用小端序排列

![](https://attach.52pojie.cn/forum/202607/07/213205d1o2k21ktxg2kb1k.png)

我们看到最后其实还经过了函数n，这个n是干啥的呢

#### ZigZag编码

* ZigZag编码

  ```
  n = function (e) {
      return (e >> 1) ^ -(1 & e);
  };
  ```

  **ZigZag Decode（变位解码）** 是一种在计算机科学和通信协议中常用的数据编码/解码技术，主要用于将**有符号整数（Signed Integers）转换为无符号整数（Unsigned Integers）**，以便更高效地进行压缩或传输。将有符号数映射为无符号数，使得**绝对值较小的数对应的无符号数也较小**。这样在后续进行变长编码（如 VarInt, Google Protocol Buffers 的 ZigZag 编码）时，小数值占用的字节更少，从而节省存储空间或带宽。标准的二进制补码表示法中，正数和负数的分布是不连续的，且负数的高位通常是 1。如果直接对补码进行变长编码（VarInt），负数通常会占用更多的字节，因为它们的数值很大（例如 -1 在 32 位系统中是 `0xFFFFFFFF`）。

  仔细看了一下则个点原理，优雅。。。太优雅了。。。

  **1. 编码 (Encode) —— 从普通整数到 ZigZag**
  公式超级短（假设是 32 位整数）：`ZigZag(n) = (n << 1) xor (n >> 31)`
  • **如果是正数：** `n >> 31` 得到全是 `0` 的掩码，异或之后相当于没变，结果就是 n << 1（也就是乘以 2）。
  • **如果是负数：** n >> 31 得到全是 `1` 的掩码（`0xFFFFFFFF`），异或之后相当于按位取反，最后就能巧妙地把负数变成奇数啦！
  **2. 解码 (Decode) —— 从 ZigZag 还原回原始整数**
  `n = (ZigZag >> 1) xor -(ZigZag & 1)`

![](https://attach.52pojie.cn/forum/202607/07/213208pjtg3ttv8jlobv3l.png)

所以整体流程就是

1. 预先构建数组`i`（映射表，固定不变，写死在 IIFE 闭包里面）。
2. 外部传入一串 Base64 字符串（被混淆加密后的代码）。
3. 函数`t`进行 Base64 解码，得到原始字节数组。
4. 函数`o`再做变长解码（n 函数处理 VL‑Base128），得到一堆索引值。
5. 用这些索引值去查映射表`i`，拿到真正的虚拟机指令号。
6. 将最终指令号丢进 switch‑case（i ()/a () 解释器），执行对应的逻辑。

简而言之⬇️

Base64 字符串 → Base64 解码 (t) → 变长解压 (o) → 索引值 → **查表 i 映射** → 真实指令码 → switch‑case 执行

OK，我们已经看到了最终的执行结果了，这大概率就是标准的VMP的指令了，当然不同类型的VMP指令流会有不同

* VMP类型

  1. 固定长度指令`[opcode][operand]`

     每条指令固定两个字段。

     ```
     10 100 // PUSH 100
     10 101 // PUSH 101
     10 102 // PUSH 102
     ```
  2. 变长指令

     ```
     10 100 // 10 = PUSH_CONST，后面跟1个参数
     28 130 19 0 // 28 = CALL，后面跟3个参数
     15 4993 // 15 = LOAD_STRING，后面跟1个参数
     ```

     解释器类似：

     ```
     switch(op){
             case10:
                     value=code[pc++];
             break;

             case15:
                     idx=code[pc++];
             break;

             case28:
                     a=code[pc++];
                     b=code[pc++];
                     c=code[pc++];
                     break;
     }
     ```

     1. TLV结构`[opcode][argc][arg1][arg2][arg3]`

        ```
        28 3 130 19 0 // opcode=28，参数个数=3
        ```
     2. 寄存器VM

        ```
        28 130 19 0 // CALL r130,r19,r0
        ```

我们可以`fromCharCode`来看一下

![](https://attach.52pojie.cn/forum/202607/07/213210k5l447gsn4ges4zc.png)

看着不像是VMP的指令啊。。。我们单独打印一下ascii字符来看看

![](https://attach.52pojie.cn/forum/202607/07/213213nxd2zgpaaz692pnk.png)

额，如此看来，我们得到了一个opcode夹杂着string pool

Q：什么是**String Pool**

A：String Pool（字符串池）的作用是**统一管理字符串常量**，存储在String Pool中的字符串都是JS源码中有的字符串，为了便于管理且附带压缩代码长度，我们将所有用到的字符串直接存储在一个池子里，然后在访问的时候直接`String Pool[index]` 获取对应的字符串

问题不大，该分析的应该都分析了，我们直接进入VMP的核心解释器

## 核心解释器

我们观察源码第二个参数传入的是一个`!1` ，那么对应的解释器应该是`a()`

我们先来确定一下这个VMP到底是一个什么类型的VMP，是寄存器式的还是栈式的？

我们查看核心代码，显然这是一个堆栈类型的VMP

![](https://attach.52pojie.cn/forum/202607/07/213215djam1pqcz2zsrm1r.png)

如果是寄存器型VM一定会在开头声明寄存器v0, v1, v2…

我们来详细分析一下

`switch(n[++p])` 告诉我们，n是指令数组，p是PC指针

`h = [0, s, t, this, arguments, c, n, 0]`

我们看一下调用时的闭包

![](https://attach.52pojie.cn/forum/202607/07/213217xtun2rttuozm0ltz.png)

![](https://attach.52pojie.cn/forum/202607/07/213219tgxwesutzrrxhhy5.png)

我们调用传入的参数

```
(3944, [], ne, arr, void 0)
arr=[void 0, 1732584193, 4023233417, 2562383102, 3285377520, !1, !0, 2147483648, 4294967295, 4294967296, 1518500249, 1859775393, 1894007588]
```

这里我们需要结合代码具体分析，光看调用反正我是猜不出来这个h是啥。。。

我们来看第一个case

```
case 0:
  h[n[++p]] = new h[n[++p]](h[n[++p]]);
  break;
```

这里出现了关键字`new`，说明在创建一个对象，我们将`n[++p]` 看成一个整体`i`

有代码`h[i] = new h[i](h[i]);`

可以看到从h中取出一个构造函数，然后再取出构造函数所需的参数，构成出对象之后将对象存储在h中

由此我们可以断定，这里的h就是数据栈，所有的数据，全局的、临时的都存放在h中，我们可以打点测试一下

![](https://attach.52pojie.cn/forum/202607/07/213222lggqsy1s1se83s38.png)

嗯哼，可能还是有点模糊。。。看到h的结构应该还是比较好判定的，那么这里的g应该就是对应调用栈，函数如果进行跳转或者递归，会将当前PC存放入g中，等到跳转完成之后再g.pop()获取返回地址(其实是下一条执行的指令)，这里的g可以认为是X30寄存器也就是LR寄存器。既然能够联想到这些，那么估计h中应该还会保存一些环境，一些局部变量，一些上下文调用关系。

OK，分析完毕，我们进入分析阶段

## 插桩(可略过)

虽然我们知道VMP插桩应该对数学运算和`apply/call`进行插桩，但是一上来就全部插满好像不是很舒服，我们先简单的看一下`apply/call`吧。

```
ie
ƒ c(){for(var l,f,h=[o,s,t,this,arguments,c,n,0],d=void 0,p=e,g=[];;)try{for(;;)switch(n[++p]){case 0:h[n[++p]]=new h[n[++p]](h[n[++p]]);break;case 1:return h[n[++p]];case 2:for(l=[],f=n[++p];f>0;f--)l…
ie(r.data)
'zzc84b5bd9s7v6krlxlomjuld3q42cxp4it4baff9e39'
```

![](https://attach.52pojie.cn/forum/202607/07/213224qyuhcs0sqmweqdo0.png)

Q：为什么`ie=func c`，而`func c`不接受任何参数，但是`ie(r.data)`依然能够正常执行？？？

A：函数 `c` 确实接受参数。虽然你在定义时没有写 `(a, b, ...)`，但 JavaScript 的函数对象默认拥有一个名为 `arguments` 的特殊数组对象，它会自动收集所有传递给该函数的实参。

我们简单打了一个断点就发现，这个VMP好像还是递归调用。。。

额，不知道为啥，这里的a()每调用啥，反而会去调用i()。我们简单对比了一下a()和i()，这俩一模一样。。。我们直接换个函数名就行了，日志啥的都不用改，简单修改如下

![](https://attach.52pojie.cn/forum/202607/07/213226f8jzdnexm65r865m.png)

然后我们刷新一下页面，日志就出来鸟～

![](https://attach.52pojie.cn/forum/202607/07/213229oi9e39z93833461g.png)

接下来下载日志到本地或者在console中直接分析，丰俭由君，笔者偏向后者

废话少说，直接开始分析

![](https://attach.52pojie.cn/forum/202607/07/213231utp7ded7d7q8d98e.png)

![](https://attach.52pojie.cn/forum/202607/07/213233uq3z5xn6wuw6za4x.png)

我们发现了一个神奇的东西，获取了解密后的请求体的前64个字节，然后就递归调用了一次

看一下末尾

![](https://attach.52pojie.cn/forum/202607/07/213236ebkdddfkz731d8gc.png)

![](https://attach.52pojie.cn/forum/202607/07/213238w28n8pnnkpvc28gg.png)

![](https://attach.52pojie.cn/forum/202607/07/213240u6egsawssg6k6ca1.png)

至于哪儿来的。。。不知道，还是得对着运算符插桩啊🥹

我们还是能偷懒则偷懒，不要急着插满，我们就插几个高频运算符，我们关注`+`和`^`

![](https://attach.52pojie.cn/forum/202607/07/213242s86208qs698434fk.png)

最终生成方式

![](https://attach.52pojie.cn/forum/202607/07/213244kzrqbgb5lp5belp9.png)

zzc为定值，然后跟着一个三明治

上下两片面包分别为两个数组，中间的夹心字符串不知道从哪里来

这里写一下神奇的case

* case 2

  ```
  case 2: // 调用函数a
    for (l = [], f = n[++p]; f > 0; f--) {
        // 将当前数据栈h中的某个索引下的所有数据全部push到数组l中，这里的l在进入for循环时被定义，可以理解为
        l.push(h[n[++p]]); // * l是上一个调用的环境
    }
    console.log("[func:a]", "create fn, args:", l);
    h[n[++p]] = a(p + n[++p], l, o, s, u); // 存储函数返回值，p + n[++p]的功能为计算下一个指令需要执行的地址
    try {
        Object.defineProperty(h[n[p - 1]], "length", {
            value: n[++p],
            configurable: !0,
            writable: !1,
            enumerable: !1,
        });
    } catch (m) {}
    break;
  ```

  我们关注一下调用a的时候的`p + n[++p]`

  假设当前PC指向100，然后进入a函数时要执行的指令位于300，那么此时n[++p]中的值就应该是200，所以这里的n[++p]对应的是offset

  待函数执行完成结果存放在h[n[++p]]中，执行

  ```
  try {
    Object.defineProperty(h[n[p - 1]], "length", {
        value: n[++p],
        configurable: !0,
        writable: !1,
        enumerable: !1,
    });
  } catch (m) {}
  ```

  此处设置该函数(因为是p-1，指针回退了)的length的值，在js中函数默认存在属性length，用于记录参数长度
* case 4

  ```
  case 4:
          ((h[n[++p]] += String.fromCharCode(n[++p])),
    (h[n[++p]] += String.fromCharCode(n[++p])),
    console.log("[str+prop]", h[n[p - 1]], "[", h[n[p]], "]"),
    (h[n[++p]] = h[n[++p]][h[n[++p]]]));
  break;
  ```

  开始先存储两个字符，然后获取某个成员的属性，不知道目的是什么，我们关闭其他所有日志，就放开这一个来看一下

![](https://attach.52pojie.cn/forum/202607/07/213246in04zupfp404tvau.png)

```
这里存储的是一个方法应用。。。

我们推测应该是String Pool中存储着调用函数的前几个字母，然后后几个字母使用数字记录在指令流中，然后通过fromCharCode完成拼接，再取出目标对象，通过方括号调用目标函数，但是作为引用存储，然后等之后进行调用
```

### 分析日志

倒着往上看，先分析base64

![](https://attach.52pojie.cn/forum/202607/07/213249jeuuuv2bxvgxvlgu.png)

那么数据源是什么？

![](https://attach.52pojie.cn/forum/202607/07/213251qpzrk22rdyjafzz2.png)

数据源来自这20位数组

就在上方生成

![](https://attach.52pojie.cn/forum/202607/07/213253haia3vq3uid2iqow.png)

![](https://attach.52pojie.cn/forum/202607/07/213255yzjr6ej63qjt2yde.png)

![](https://attach.52pojie.cn/forum/202607/07/213257hunhag0gtztugh3p.png)

这里从一个四十位十六进制数组中每次取两位，然后搭配20位数组每次取一位

```
A = ""
B = []
for i in range(20):
    hex2dec(A(i,i+1))^B[i]
```

我们先来看一下这个20位数组是如何生成的

。。。扫一眼发现没有任何计算过程，在代码中对应case 55，然后刷新重试了一下，依然是这几个定值。那么应该是直接写死在指令流中的

![](https://attach.52pojie.cn/forum/202607/07/213259exxh53hh69mgx51x.png)

接下来我们关注这个40位十六进制是怎么来的

#### SHA-1识别

看到output的长度是40位，再想到之前我们观察到每次递归调用前都会读取前64个字节，也就是512位，加密大概率就是SHA-1。我们用脚趾头猜一下input大概率是我们的请求体。。。

我们测试一下，日志中的输出是`BEBD6ECFA06E970AC16498790178FD5C4622EA1E`

![](https://attach.52pojie.cn/forum/202607/07/213302j33nv3n060dn30ye.png)

![](https://attach.52pojie.cn/forum/202607/07/213304jur40o9a0u70w944.png)

这里又是硬编码，两组，暂时留用

![](https://attach.52pojie.cn/forum/202607/07/213306rdfptt0j0yxzynft.png)

继续向上观察，我们就找到相关内容了

![](https://attach.52pojie.cn/forum/202607/07/213308ipe9vcukev4bvhjz.png)

![](https://attach.52pojie.cn/forum/202607/07/213311pzlpy3bbd8dpbl8a.png)

其实看到这里基本上已经能够确定了，结果40位，然后5个寄存器转hex后拼接，基本上就是SHA1无疑了，我们继续向上看，看看还有哪些特征

![](https://attach.52pojie.cn/forum/202607/07/213313w85ss1qsqbf7ss8q.png)

我们追踪一下h0的生成过程，根据我们对SHA-1的了解，每进行完80轮压缩迭代之后，一定会用临时工作变量中的值通过运算更新到全局变量h0-h4中

最后生成输出的h0是`285562963` ，生成过程使用了`1527879746`

![](https://attach.52pojie.cn/forum/202607/07/213315o1h1shn7dxqh4hsd.png)

![](https://attach.52pojie.cn/forum/202607/07/213317yksqe2kdwd277223.png)

我们查找上一次的`h0`，发现确实是使用了

![](https://attach.52pojie.cn/forum/202607/07/213319dcii43ilfillfzka.png)

那么更加确定是SHA-1了

接下来我们观察单次处理的过程，再次发现关键字

![](https://attach.52pojie.cn/forum/202607/07/213321yzvuczecveue7uv9.png)

对于单个块中一共处理80轮，每20轮使用一个单独的处理函数

#### 验证padding

我们想要查看padding，我们要找到padding的过程

目前定位到第一次使用h0

![](https://attach.52pojie.cn/forum/202607/07/213324vvubzb7b66apa0f1.png)

神奇的是没有看到任何相关操作。。。

![](https://attach.52pojie.cn/forum/202607/07/213518yiy67yimiskvsvdd.png)

这就比较神奇了，不按套路出牌。虽然也确实是没有强制规定必须要在第一阶段padding

我们知道padding一定会先填充一个1再填充n个0，所以一定有

我们来计算一下

当前请求体长度为971个字节，我们暂时先不要用bit的视角，我们要使用字节的视角，因为在VMP中我们操作的是字节

首先SHA-1一个块是512bit⇒64字节，我们未填充的情况下是`971 % 64 = 11` ，最后一个块中只有11个有效字节，那么我们已知最后一个字节用于记录长度，也就是说我们还需要再填充`64-11-1=42`个字节，这42个字节除了第一个字节的最高地址为1，其他全部是0

![](https://attach.52pojie.cn/forum/202607/07/213520ibfg55t11cg07uq0.png)

我们以字节的视角来看就是补充一个`0x80` ，也就是对应十进制的128，所以在日志中应该有`xxx | 128` ，这里xxx是啥呢？

我们知道一个block是32位，现在我们一共11个字节，那么当前block对应的应该是最后的三个字节，然后拼接上`0x80` ，我们看`input`

![](https://attach.52pojie.cn/forum/202607/07/213524j3xe8asvf3eqxees.png)

最后三个有效字节是`}}}`，对应的ASCII是125，也就是7D，所以我们日志中应该会出现`7D7D7D00 | 0x80` ，全部转换成十进制之后就是`2105376000 | 128`

![](https://attach.52pojie.cn/forum/202607/07/213522ibnaal3n5rb7yyl1.png)

奇怪，没有啊，我们只找到

![](https://attach.52pojie.cn/forum/202607/07/213332qzfnffu4r3h33tau.png)

？？？这是我们日志打印错误了吗？？？

我们找到对应的case，并输出

![](https://attach.52pojie.cn/forum/202607/07/213334nkbx0ttysvfmxovc.png)

![](https://attach.52pojie.cn/forum/202607/07/213336yoff7a75xsz442o8.png)

。。。

这就很逆天了，为什么会出现这个问题呢？？？

虽然我们看到的代码是`h[n[++p]] = h[n[++p]] | h[n[++p]];`

但实际上在指令流n中排列的可能是97,7,34,**12,12,**43,41,3，可能会出现相同的slot，所以这种不会影响其他局部变量的运算，尽量在运算前输出日志信息。

OK，闲话少叙，我们拉回来，在正确输出日志之后，我们在日志中搜索`2105376000 | 128`

![](https://attach.52pojie.cn/forum/202607/07/213338xdxebxslklbkdkxt.png)

确实是有滴～

我们观察上方还有一个四位数组，存储着`[-2147483648, 8388608, 32768, 128]` ，分别对应着0x80000000，0x800000，0x8000，0x80，代表padding不同的位数,最多填充4个字节，对应的就是`input % 512 = 448`

OK，我们还能够计算补充的长度信息，我们input是971Byte，对应7768bit，那应该就有一个block在处理7768

![](https://attach.52pojie.cn/forum/202607/07/213340wnlyl3lee8rzr3uu.png)

![](https://attach.52pojie.cn/forum/202607/07/213342rndl4osyynjd4npm.png)

好，那么我想，针对SHA-1的分析到此结束

我们还剩下两个固定的数组没有使用，分析一下

![](https://attach.52pojie.cn/forum/202607/07/213345ts4bjq1aks7sxs7x.png)

嗯，就是从SHA-1结果获取的

OK，结束战斗

![](https://attach.52pojie.cn/forum/202607/07/213347buy9rsl9uysspz4i.png)

## 请求体分析&响应体解密

我们在日志中看到的请求体是标准的请求体，但是在请求中看到的请求体直接是base了

我们从r.data跟栈。。。

![](https://attach.52pojie.cn/forum/202607/07/213349y08b42el2lib7b2b.png)

又是一个VMP

得，打日志吧，我们还是先针对apply和call进行修改

![](https://attach.52pojie.cn/forum/202607/07/213352p100dk4d17oow4ky.png)

这下倒是不打自招了，请求体采用了AES-GCM模式加密，我们看到数组的长度最开始是请求体，然后接下来增加了16，最后又增加了12

这分别对应GCM的过程

16个字节对应Tag，也就是认证标签，此时已经完成了加密，Tag是AES内部运算的结果

12字节对应的是我们的IV，虽然GCM模式支持任意长度IV，但是官方推荐默认为12字节，在运算过程中最后四字节为计数器`0x00000…1`

那么接下来我们需要找到IV和Key来完成校验

![](https://attach.52pojie.cn/forum/202607/07/213354r50a53crfz00dfs0.png)

向上翻翻就是Key，而且貌似是固定值

![](https://attach.52pojie.cn/forum/202607/07/213356c5ttbf4tmmmxt4if.png)

IV就在Key上方

那么请求体的加密我们已经分析完成了，最后就剩下响应体了

![](https://attach.52pojie.cn/forum/202607/07/213359m6rb2ee2bob22462.png)

![](https://attach.52pojie.cn/forum/202607/07/213401wx6jf0golf9ooppg.png)

非常凑巧，就在下方直接有日志，就是转换成字节数组，然后decode即可，没有任何解密过程

经评论区大佬提醒，最后的响应体解码还要经过一个异或

![](https://attach.52pojie.cn/forum/202607/08/113514f9c48vb9hxe6vxvp.png)

![](https://attach.52pojie.cn/forum/202607/08/120249t1u1s10z4104r3f0.png)

两种方式查看，第一种就是跟栈，在开始前断住，然后一步一步跟踪，能够发现这个数组被硬编码在指令流中然后逐个读取
另一种就是直接插桩，但是内容会很多。。。建议找找性价比高的点位(当然我这个属于马后炮)
本来想直接打get\_prop的，但是简单搜索了一下发现有8+位置，遂放弃。
如果还有其他更便捷的调试方法，也请各位大佬不吝赐教！
