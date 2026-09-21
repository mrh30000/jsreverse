# 【Fiddler为所欲为第四篇】直播源抓取与接口分析

> **作者**: 狂暴补师亚丝娜 | **发布时间**: 2019-02-12 11:44:00 | **版块**: 『编程语言区』 | **查看/回复**: 57208 / 107
> **原文**: [https://www.52pojie.cn/thread-864112-1-1.html](https://www.52pojie.cn/thread-864112-1-1.html)

---

*本帖最后由 狂暴补师亚丝娜 于 2019-2-12 12:11 编辑*

首先，大家如果还没看过之前三篇教程，可以顺便看看哦。了解封包的本质才能尽可能地为所欲为。
为所欲为第一篇：<https://www.52pojie.cn/thread-854434-1-1.html>
为所欲为第二篇：<https://www.52pojie.cn/thread-858631-1-1.html>
为所欲为第三篇：https://www.52pojie.cn/thread-859813-1-1.html

今天的教程，主要是教大家如何进行“封包逆向”，关键词跳转，接口分析。（怎么样，是不是感觉和OD很像~~~）
今天的教程我们以【麻花影视】为例，当然，其他APP的逻辑也是一样，通用的哦~

首先需要做好准备工作：（所有APP的抓包都会用到以下工具，就不要再说抓不到证书的包啦。）
1、安卓模拟器，并进行root。（推荐使用MUMU模拟器），当然，安卓手机肯定没有问题。
2、安装XP框架（用模拟器可以自适应），链接：<https://pan.baidu.com/s/1YfLpVQb1QophNO38alNdug> 提取码：5m98
3、安装https HOST（基于XP框架），链接：<https://pan.baidu.com/s/1PFidSyoAtHynxNPF4t-voA> 提取码：0f2d

以上的准备工作必须要做，不然很多包是抓不到的！！！
FD的wifi代{过}{滤}理教程就不说啦，网上很多，我这里直接开始演示哦~

第一步：
首先，我们打开咪咕视频，找到想要抓的节目，并观察FD里面是否有数据。【我这里就以【CCTV1】为例】。

![](https://attach.52pojie.cn/forum/201902/12/111630rlmlqowxl2luxzqw.png)

![](https://attach.52pojie.cn/forum/201902/12/111710y5nasnq48y8xkwwq.png)

若发现FD有数据，既表示正确，既可开始下一步。

第二步：
正常打开CCTV1，然后看FD里面的数据。

![](https://attach.52pojie.cn/forum/201902/12/111905raeqtq7e6f4co4qe.png)

![](https://attach.52pojie.cn/forum/201902/12/111906lvckovfec0e2dl2f.png)

第三步：
过滤封包，将所有封包进行数据化。

![](https://attach.52pojie.cn/forum/201902/12/112204dpmrlssbhpbhqq4x.png)

第四步：
进行关键字查询，和OD的PUSH大法差不多，直播源的关键词是【m3u8】。首先我们需要查询咪咕视频的节目源是否是m3u8格式，因此搜索：m3u8，若出现黄色表示该请求含有m3u8.因此，我们需要看看这个封包。

![](https://attach.52pojie.cn/forum/201902/12/112524yiqqjcjt0qjqggmp.png)

第五步：
封包分析，通常非常多数据的则是ison，所以我们点击json。

![](https://attach.52pojie.cn/forum/201902/12/112937n16cetee36ewngwg.png)

通过Json，很明显，可以看得出来，这个play.miguvideo.com这个域名，返回了一个m3u8的地址。
url=http://gslbmgsplive.miguvideo.com/wd\_r2/cctv/cctv1/600/index.m3u8?msisdn=10b1efdfd58919f4ccf07b3987d39131&mdspid=&spid=699004&netType=4&sid=2200291011&pid=2028597139×tamp=20190212113218&Channel\_ID=25000502-99000-200300080100005&ParentNodeID=-99&assertID=2200291011&client\_ip=125.123.158.154&SecurityKey=20190212113218&imei=008796753773920&promotionId=&mvid=&mcid=&mpid=&encrypt=4b4a040bf73d40d80a8974fdc095d593
可以看出，这个m3u8，包含了很多参数，比如我们的IP信息。

![](https://attach.52pojie.cn/forum/201902/12/113051dogmflkvvqqbxafv.png)

第六部：
用VCL等播放工具，试试看能不能播放。若可以播放，则证明我们的播放地址是对的。因此，play.miguvideo.com则是播放地址的接口。

![](https://attach.52pojie.cn/forum/201902/12/113430z21rrhr7x4418r4h.png)

第七部：抓任意频道的接口。
我们用在FD命令下输入：bpater play.miguvideo.com

![](https://attach.52pojie.cn/forum/201902/12/114232x1vvgb1adll92znl.png)

然后回车。

![](https://attach.52pojie.cn/forum/201902/12/114232su6uooiiz2o5mjo6.png)

第八部：
点击任意频道，就可以自动下断点得到播放地址了。而且非常明显！

![](https://attach.52pojie.cn/forum/201902/12/114406wag1ewrxgxrzmq9g.png)

——————————————————————————————————————————————
以上就是直播源抓取的教程~~
**当然， 这只是简单的入门级教程，但是适用大多数直播类型的APP了！！！**
