# 【原创】V8 JSC反编译成JS

> **作者**: wolfSpicy | **发布时间**: 2026-07-05 12:31:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2314 / 8
> **原文**: [https://www.52pojie.cn/thread-2115726-1-1.html](https://www.52pojie.cn/thread-2115726-1-1.html)

---

起因是在逆向Typora的时候发现有个最关键的授权逻辑全在JSC

![](https://attach.52pojie.cn/forum/202607/05/122307czhr6hxcn5zgccrc.png)

V8开头的前4个字节是0xc0de0687 庆幸没有加壳

![](https://attach.52pojie.cn/forum/202607/05/122318uk8hs1hk3s2z82zb.png)

说明是V8编译的JSC 不简单 甚至还挺麻烦的
我不爽就想把JSC给反编译

首先是要得到V8的版本 这是最重要的一点 （我是把eletron开启调试了之后进入到里面然后console控制台里面输入得到的）

然后是要使用python库  jsc2js 基于view8的

![](https://attach.52pojie.cn/forum/202607/05/122327yyywfv9fkhlwk39x.png)

得到V8版本后又听说有个网站支持这个V8版本的JSC反编译成JS就好奇试了下

![](https://attach.52pojie.cn/forum/202607/05/122338gx7o8togtia2t7ka.png)

要钱的并且也不值得特地给钱去弄
但也不影响 jsc2js里面就有我们需要的版本13.4.114.21（向作者致敬respect）

然后 ".\d8.exe" -e  "loadjsc('C:/Users/Administrator/jsc\_decompile/atom.jsc')" > "disasm.txt"
运行最终得到

![](https://attach.52pojie.cn/forum/202607/05/122346njaj4ivwiwjijsrj.png)

里面自带view8了
python view8.py --disassembled "disasm.txt"  "atom.decompiled.js"
最终输出

![](https://attach.52pojie.cn/forum/202607/05/122356myrdzlmrdk75y5ae.png)

可读性确实很垃 它其实很像是IDA的F5IDA的F5为什么可读性不算弱 那是因为那家公司写的引擎本身就给力像JSC这种的如果有人愿意花大堆时间写一个好的识别引擎可能也是可以做到的但现在我们有了AI 直接上蹬

![](https://attach.52pojie.cn/forum/202607/05/122407muhztnd9g7bwubg5.png)

可以看到可读性确实好很多了原理是叫AI静态配合CDP协议控制来动态调用读取最后才让函数变得可读但缺点是只能覆盖触发的 如果没有触发就没办法知道 所以是没办法达到整个js文件都知道
我已经把过程总结成skill了 1903247335/jsc-lifter
