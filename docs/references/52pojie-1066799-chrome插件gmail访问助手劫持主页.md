# chrome插件gmail访问助手劫持主页

> **作者**: 金木赤赤 | **发布时间**: 2019-12-02 23:13:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6315 / 68
> **原文**: [https://www.52pojie.cn/thread-1066799-1-1.html](https://www.52pojie.cn/thread-1066799-1-1.html)

---

我们访问自己的gmail邮箱是比较麻烦的，有开发者提供了gmail访问助手，通过此浏览器插件可以访问自己的邮箱，但是为了运营，此插件会劫持新建标签页为某度，如图

![](https://attach.52pojie.cn/forum/201912/02/224311m4netshvn97uoc7w.png)

我们就看一看它的源码，分析是如何劫持的，用解压软件打开crx文件

![](https://attach.52pojie.cn/forum/201912/02/224315y1ajbmjtafff8ajd.png)

我们可用看到许多html文件，逐个打开，发现transfer.html就是指向百度的文件

![](https://attach.52pojie.cn/forum/201912/02/224321kjy17kjkhc8jc1mm.png)

用vs打开整个文件夹

![](https://attach.52pojie.cn/forum/201912/02/224324s5dx58u1c1k5mvzq.png)

我们需要找到在哪里调用了这个transfer文件，果然，Newtab这个新建标签页的命令执行时会调用这个文件，所以我们直接把这个函数给注释掉

![](https://attach.52pojie.cn/forum/201912/02/224328q6sgqgnp3kn9ngkz.png)

保存后导入浏览器，劫持已经不存在了，但是问题是我们的gmail也无法访问，我们考虑应该是改动触发了相关代码的保护机制，继续寻找transfer没有收获，所以我们考虑直接查找baidu相关的内容，猜测其应该是检测到新标签页不是百度而停止了服务

![](https://attach.52pojie.cn/forum/201912/02/224331gsnsur0mfbcjsaus.png)

搜索后和我们的想法也是一致的，此处进行了判断，当baidu.com!==-1时，if下的语句全都不会执行

![](https://attach.52pojie.cn/forum/201912/02/224334wp5mmxgak1xezgep.png)

我们也进行暴力改动，直接去掉！号，让代码能够执行

![](https://attach.52pojie.cn/forum/201912/02/224337vzjjops2u9i92sta.png)

修改后我们重新打包成为crx文件，导入浏览器，然后我们不仅能访问自己的gmail邮箱，还能继续愉快的使用infinity标签页了！

![](https://attach.52pojie.cn/forum/201912/02/224520n2l2tj15jqddd71t.png)

（此文为分享学习贴，所以不会放相关的文件以及修改后的文件）
