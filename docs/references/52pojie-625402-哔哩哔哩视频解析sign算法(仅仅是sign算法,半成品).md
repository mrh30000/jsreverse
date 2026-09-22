# 哔哩哔哩视频解析sign算法(仅仅是sign算法,半成品)

> **作者**: vv4304 | **发布时间**: 2017-07-20 11:55:00 | **版块**: 『编程语言区』 | **查看/回复**: 12840 / 16
> **原文**: [https://www.52pojie.cn/thread-625402-1-1.html](https://www.52pojie.cn/thread-625402-1-1.html)

---

![](http://att.125.la/data/attachment/forum/201707/20/113416fje8o9c5d0ojascm.png)

我通过反编译flash文件弄出了bilibili视频解析的sign算法
算法是一些参数加一个秘钥然后md5
![](http://att.125.la/data/attachment/forum/201707/20/112613y2pt9ipwtmm3c0ko.png)

计算出来的网页可以访问,并且和浏览器(火狐浏览器,flash播放器)调试的结果一样
![](http://att.125.la/data/attachment/forum/201707/20/112652kcex0299i9wm02es.png)

但是,复制浏览器的那个连接访问出来的地址和我计算出来的地址拿去浏览器访问输出的视频url去访问,得到的视频却是403
提示没有权限....
![](http://att.125.la/data/attachment/forum/201707/20/113008bppwwwbtb7j17kzd.png)

我觉得算法应该没啥问题,问题应该出在协yi上,希望有大佬能够继续完成下去

上源码

![](https://static.52pojie.cn/static/image/filetype/zip.gif)

[demo.zip](https://www.52pojie.cn/forum.php?mod=attachment&aid=OTEzNTU5fDc4ODY5YWI4fDE3OTAwODAzOTJ8MjMyMzcyN3w2MjU0MDI%3D)
*(690.4 KB, 下载次数: 349)*
