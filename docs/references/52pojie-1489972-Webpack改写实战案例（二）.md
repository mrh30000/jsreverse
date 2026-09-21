# Webpack改写实战案例（二）

> **作者**: QingYi. | **发布时间**: 2021-08-07 11:39:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4142 / 14
> **原文**: [https://www.52pojie.cn/thread-1489972-1-1.html](https://www.52pojie.cn/thread-1489972-1-1.html)

---

这是第一篇webpack：<https://www.52pojie.cn/thread-1469095-1-1.html>

首先打开我们的网址进行抓包aHR0cHM6Ly93d3cuZ205OS5jb20v

![](https://attach.52pojie.cn/forum/202108/07/111721berqjorm75rmmek2.png)

这边可以跟栈，也可以搜索。我们找到加密函数了

![](https://attach.52pojie.cn/forum/202108/07/111934oxxtxahlttt1hajc.png)

我们进去看看

![](https://attach.52pojie.cn/forum/202108/07/112015t7unlrl9ihhcbnn7.png)

发现他对我们密码还进行了加时间戳操作，我们先把当前的函数抠出来

![](https://attach.52pojie.cn/forum/202108/07/112109s332l02jdd2lllxj.png)

我们发现他是一个webpack，我们要对他进行改写先

![](https://attach.52pojie.cn/forum/202108/07/112149i3whno8ofadr8bo2.png)

完美

![](https://attach.52pojie.cn/forum/202108/07/112515gbs4zo8sbg22zgx8.png)

再进他的加密函数，看看

![](https://attach.52pojie.cn/forum/202108/07/112545sscp77ppsc73z9lq.png)

来到了这个地方，继续扣

![](https://attach.52pojie.cn/forum/202108/07/112728n93o33llyvlpoafk.png)

依旧狠完美

![](https://attach.52pojie.cn/forum/202108/07/112951ybzppaybbppycc5b.png)

所有函数都拿出来了，我们现在进行调用
我们发现这是1去调用2，我们要用到n.encode函数

![](https://attach.52pojie.cn/forum/202108/07/113212i8a0zhamf5x5lz8l.png)

我们发现n又在这里，我们要导出n

![](https://attach.52pojie.cn/forum/202108/07/113549ee10oma9mpem6019.png)

导出来之后，我们new出来第一个函数去调用第二个函数即可

![](https://attach.52pojie.cn/forum/202108/07/113841kez8d43g87m3c45t.png)
