# 【JS逆向】某某经营网jsl逆向分析

> **作者**: littlewhite11 | **发布时间**: 2024-11-18 23:13:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6372 / 61
> **原文**: [https://www.52pojie.cn/thread-1983279-1-1.html](https://www.52pojie.cn/thread-1983279-1-1.html)

---

*本帖最后由 littlewhite11 于 2025-3-10 07:35 编辑*

## 逆向目标

* 网址：`aHR0cDovL3d3dy5jYi5jb20uY24v`
* 目标：cookie中的`__jsl_clearance`参数

## 抓包分析

清空cookie，刷新网站，会发起三个相同的请求，其中前两次响应状态码为512，第三次响应状态码为200，这是jsl的典型特征。

![](https://attach.52pojie.cn/forum/202411/18/231551vq5jb5q0121shvjh.png)

第一次响应设置了一个名为`__jsluid_h`的cookie。

![](https://attach.52pojie.cn/forum/202411/18/231554mj6z555pz6pl6600.png)

第二次请求携带上一个响应的cookie和一个名为`__jsl_clearance`的cookie。

![](https://attach.52pojie.cn/forum/202411/18/231557w8b5w38b57bw317w.png)

第三次请求携带和第二次响应名字相同的cookie，但`__jsl_clearance`的值不一样了，比较明显的区别就是第二次cookie值中间的数字是-1，第三次cookie值中间的数字是0。

![](https://attach.52pojie.cn/forum/202411/18/231600iw0w9g09z959d11g.png)

## 逆向分析

流程分析完了，下面开始正式逆向，一般来说，对于cookie加密的情况，直接hook。

成功hook到第二次的cookie，而且代码也非常熟悉，经典的OB混淆。

![](https://attach.52pojie.cn/forum/202411/18/231604f8559e1952vyex35.png)

那第二次请求的`__jsl_clearance`在哪生成的呢，为什么没有hook到。

还是下熟悉的`script断点`看看吧。

第一加载index的时候，会发现是这个时候生成了第二次请求的`__jsl_clearance`，这个并不难，我们重点需要分析第二次生成的`__jsl_clearance`。

![](https://attach.52pojie.cn/forum/202411/18/231607rz63wp3177nagwz1.png)

既然遇到OB混淆了，那就无脑AST。

还原后的代码只有240行，我们甚至可以直接静态分析。

![](https://attach.52pojie.cn/forum/202411/18/231610lyzxxc9ra2hq3aog.png)

直接搜索`document["cookie"]`，只有一个地方，`_0x4954f5`就是我们的目标了。

![](https://attach.52pojie.cn/forum/202411/18/231613t448rsmp4pxrq8zp.png)

继续往前分析，发现`_0x5bef39[0]`就是`__jsl_clearance`最终的值。

![](https://attach.52pojie.cn/forum/202411/18/231616jugpryirzdnrut11.png)

再往前分析，最终找到目标参数的生成位置。

![](https://attach.52pojie.cn/forum/202411/18/231620ctjyppt4ardjsstw.png)

剩下的事情就是，你懂的，缺啥补啥。其中`_0x23b046`是调用`go`函数传进去的对象。

![](https://attach.52pojie.cn/forum/202411/18/231623nu12ap2pp2bzj3nq.png)

下面直接模拟请求：

![](https://attach.52pojie.cn/forum/202411/18/231626jahsin6irnj94f4i.png)

成功！！！

> 请求的时候可以`session保持`，其次还需要注意JS脚本是`动态`的，每次使用的`hash算法`可能都不一样，需要将动态的参数提取出来进行请求。
