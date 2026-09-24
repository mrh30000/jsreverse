# 文心一言绕过无限debugger（条件判断）

> **作者**: strength660 | **发布时间**: 2024-04-03 19:25:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 17845 / 141
> **原文**: [https://www.52pojie.cn/thread-1909547-1-1.html](https://www.52pojie.cn/thread-1909547-1-1.html)

---

在该网站中有一个帖子使用的是hook的方式绕过文心一言的无限debugger，我这里给出一个不同的方法：条件断点。

首先打开调试控制台，可以发现进入无限debugger：

![](https://attach.52pojie.cn/forum/202404/03/192315ib3d5pwdf6a13j1d.png)

这里在degugger关键字的地方添加条件断电为false：

![](https://attach.52pojie.cn/forum/202404/03/192437xr712b5cu5k1geke.png)

之后放行断电，然后重新进入网站，可以发现无限debugger已经没了：

![](https://attach.52pojie.cn/forum/202404/03/192439utp87zq88vabzqtp.png)
