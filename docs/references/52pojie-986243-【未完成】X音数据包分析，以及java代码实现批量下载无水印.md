# 【未完成】X音数据包分析，以及java代码实现批量下载无水印

> **作者**: 夜袭和尚庙 | **发布时间**: 2019-07-06 18:47:00 | **版块**: 『编程语言区』 | **查看/回复**: 4628 / 9
> **原文**: [https://www.52pojie.cn/thread-986243-1-1.html](https://www.52pojie.cn/thread-986243-1-1.html)

---

*本帖最后由 wushaominkk 于 2019-7-6 19:32 编辑*

之前我根据某个网站的接口，练手写了一款抖音批量下载无水印视频， 但是！！我们怎么能够只满足于调用人家接口！！！于是我花了一上午配置了FD的HTTPS证书，总算是给我的模拟器装上了证书，开始抖音的抓包之旅~  以下结果仅仅只是简单的分析了一下json  还有一些因技术不够 不知道怎么整，希望大佬们能够教教萌新

首先我们的思路是：
既然要批量下载，哪里最容易获取到用户的所有视频呢？  当然是个人主页啦！！我们通过进入某个用户的主页抓到以下几个数据包

![](https://attach.52pojie.cn/forum/201907/06/181307fh4823hl0kszzs7i.png)

其中有两个数据包最为可疑！！

![](https://attach.52pojie.cn/forum/201907/06/181618ccq2844z7j3kjuak.png)

两个都是json  我们分别截图看一下

![](https://attach.52pojie.cn/forum/201907/06/181759uqg1ovgf4d94mffg.png)

![](https://attach.52pojie.cn/forum/201907/06/181803twq7hryh7snehj23.png)

一个json有很多个花括号！我们暂时不去管它 ，另一个json很小，详细查看了一下发现里面包含的是作者的一些图片 还有详细说明什么的。那么我们就定位第一个JSON。 打开花括号 看看里面有点啥！一顿骚操作后就发现 这个json包含了近20个作品左右的数据

![](https://attach.52pojie.cn/forum/201907/06/182215p0z52kq8qcu2s3a5.png)

无水印视频路径为：花括号下的Video下的play\_addr\_lowbr下的url\_list里  打开看一下

![](https://attach.52pojie.cn/forum/201907/06/182447fcz35kvsc52t00fk.png)

没毛病！！！小姐姐很漂亮！！咳咳 现在我们来看一下请求头 还有网址信息等

![](https://attach.52pojie.cn/forum/201907/06/182552pk0tgk33ikgopzyj.png)

URL比较长 我贴出来 不知道方不方便看。。https://api-hl.amemv.com/aweme/v1/aweme/post/?max\_cursor=0&user\_id=101166401417&count=20&retry\_type=no\_retry&iid=77895323871&device\_id=68600307762&ac=wifi&channel=tengxun\_new&aid=1128&app\_name=aweme&version\_code=700&version\_name=7.0.0&device\_platform=android&ssmix=a&device\_type=MI+6+&device\_brand=Xiaomi&language=zh&os\_api=22&os\_version=5.1.1&uuid=863254010212610&openudid=d43d7e9c97495920&manifest\_version\_code=700&resolution=900\*1600&dpi=320&update\_version\_code=7002&\_rticket=1562407941830&ts=1562407942&app\_type=normal&js\_sdk\_version=1.18.1.0&mcc\_mnc=46007&sec\_user\_id=MS4wLjABAAAAollsLWH4REQgH-TMlNe4E\_\_qcAogQwkaPpuv8PjbESM
我简单的分析了一下（因为难的不会![](https://static.52pojie.cn/static/image/smiley/laohu/laohu25.gif)）
其中rticket为精准到毫秒的时间戳，ts比rticket少三位，我猜测是精准到分还是小时？？
user\_id是用户ID
还有一个sec\_user\_id 好像是根据用户ID某种算法加密生成的
其他的都是固定的  URL中包含设备的相关信息
除了该主机头以外，还有其他的几个主机头，重新打开抖音就可以抓到不同主机头的包 但是数据都是相同的
JSON中的has\_more是判断是否下一页，因为json只返回了部分视频 当你向上拖动屏幕时，就会再次请求，如果为0则没有下一页

![](https://attach.52pojie.cn/forum/201907/06/184005wllr11cl2vv27t78.png)

分析到这里 我认为就可以用java实现批量下载无水印了，但是！！！！事情没有那么简单！！！![](https://static.52pojie.cn/static/image/smiley/laohu/laohu10.gif)
当我写好URL链接上去 配置好UA和相关参数的时候！！返回的json居然！！！没有数据！！
{"status\_code": 0, "has\_more": 0, "max\_cursor": 0, "min\_cursor": 0, "aweme\_list": []}无论我怎么写UA还有相关参数的时候，都获取不到！！![](https://static.52pojie.cn/static/image/smiley/laohu/laohu10.gif)

![](https://attach.52pojie.cn/forum/201907/06/184425o3tsy6yhgihoaigy.png)
本人全靠自学，没有相关信息，完全分析不出来原因。。。。万般无奈只能来找各位大佬能不能帮我分析一下原因![](https://static.52pojie.cn/static/image/smiley/laohu/laohu35.gif)如果发错地方了 麻烦大佬点点小手帮我挪个位置，感谢！
