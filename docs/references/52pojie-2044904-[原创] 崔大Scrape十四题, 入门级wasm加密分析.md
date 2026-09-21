# [原创] 崔大Scrape十四题 , 入门级wasm加密分析

> **作者**: ZenoMiao | **发布时间**: 2025-07-10 23:36:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5858 / 38
> **原文**: [https://www.52pojie.cn/thread-2044904-1-1.html](https://www.52pojie.cn/thread-2044904-1-1.html)

---

*本帖最后由 ZenoMiao 于 2025-7-10 23:39 编辑*

本次分析的地址为: aHR0cHM6Ly9zcGExNC5zY3JhcGUuY2VudGVyLw==

本题如图所示: 为wasm加密, ajax接口且有时间限制(应该涉及到时间戳)

![](https://attach.52pojie.cn/forum/202507/10/223424x5f1sti7e0lm0v6s.png)

开搞!

F12抓包发现sign值应该就是目标值

![](https://attach.52pojie.cn/forum/202507/10/224028pfws1efyosscog0c.png)

通过XHR断点后跟栈轻松可以找到sign加密的位置, 已知是wasm加密所以就不管他了, 先把wasm文件拿下来

![](https://attach.52pojie.cn/forum/202507/10/223833u2j11kh2qq1ak2v1.png)

下载下来之后再通过@逍遥一仙 发的一个软件一键转.o文件用ida进行分析
软件连接: https://www.52pojie.cn/forum.php?mod=viewthread&tid=1438499

打开ida, 点击Go(work on your own) -> File -> Open ->选择刚转下来的wasm.o文件 -> OK

![](https://attach.52pojie.cn/forum/202507/10/224723hk3okyvfykyhilvk.png)

通过ida左边的Functions window和js的调用找到加密函数(双击)

![](https://attach.52pojie.cn/forum/202507/10/224901dmkbk2f4km2s7l21.png)

然后按F5还原伪C代码, 第一个参数为全局结构体, 注意第二第三个形参和return
第二个形参则是js传进去的n值, 第三个形参则是十三位时间戳除1000后向上取整的值

![](https://attach.52pojie.cn/forum/202507/10/225052kvffr9szvd97fcqc.png)

![](https://attach.52pojie.cn/forum/202507/10/225216poeece8eeaduq5dl.png)

return上面并没有用到变量a3和a2所以函数体内的代码直接忽略了, 直接看return

[C] *纯文本查看*

```
return a3 / 3 + a2 + 16358;
```

翻译成中文return的值就是: 十三位时间戳除1000后向上取整 / 3 + n + 16358

ida分析完毕后我们再分析一下在浏览器中wasm源代码
通过之前打的加密e值的断点单步进去可以看到wasm代码

![](https://attach.52pojie.cn/forum/202507/10/225557v3565dziwzkni5vg.png)

可以看到他这里有两个参数, 均是int32的类型 变量名为$var0和$var1

[C] *纯文本查看*

```

(func $encrypt (;4;) (export "encrypt") (param $var0 i32) (param $var1 i32) (result i32)
    local.get $var0
    local.get $var1
    i32.const 3
    i32.div_s
    i32.add
    i32.const 16358
    i32.add
  )
```

通过local.get $var0 把第一个形参的值压入堆栈0
通过local.get $var1 把第一个形参的值压入堆栈1
通过i32.const 3 新建一个类型为int32常量为3的值压入堆栈2
i32.div\_s为把堆栈按顺序拿出来"计算有符号除法", 先把堆栈2的值"3"拿出来作为除数, 再把$var1的值拿出来作为被除数进行计算.
注意: 堆栈因为前面计算拿出来了两个值, 所以目前堆栈只有一个变量为$var0, 然后前面因为计算后的值需要保存, 所以也被压入栈内, 所以目前栈内有2个值 $var0和除法计算后的值

然后i32.add 是把栈内2个栈拿出来进行相加, 也就是把$var0 和除法计算后的值进行相加, 也就是(时间戳 / 3) + n, 把结果再压入栈内.(目前栈内只有这个相加后的值)
再通过i32.const新建一个类型为int32的局部变量为16358的常量, 再压入栈内 (目前栈内有2个)
再通过i32.add把栈顶的两个值拿出来进行相加. 执行完最后一段代码后result 一个int32类型的值

如下图所示

![](https://attach.52pojie.cn/forum/202507/10/233349yzy7xf70f8oyd89s.png)

搞完撸py代码

[Python] *纯文本查看*

```

import math
import time
# i是页码
n = (i - 1) * 10
sign = math.ceil(time.time() / 3) + n + 16358
```

以上是所谓的"核心代码"(其实就只有2行有用), 其他的代码自己撸吧, 提高动手能力

![](https://attach.52pojie.cn/forum/202507/10/233643ejiouokjj4b4uxmx.png)

打完收工
