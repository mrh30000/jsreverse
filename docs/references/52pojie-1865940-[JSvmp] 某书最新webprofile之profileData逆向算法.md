# [JSvmp] 某书最新webprofile之profileData逆向算法

> **作者**: shanel | **发布时间**: 2023-12-06 14:40:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6468 / 17
> **原文**: [https://www.52pojie.cn/thread-1865940-1-1.html](https://www.52pojie.cn/thread-1865940-1-1.html)

---

*本帖最后由 shanel 于 2023-12-8 13:44 编辑*

* **抓包：**

![](https://attach.52pojie.cn/forum/202312/06/144238jwxtekavzaysc5l6.png)

在request中上报的信息如下：

* platform: 平台
* profileData：加密数据（一些浏览器环境罢了）
* sdkVersion：版本
* svn：这是啥

主要分析的就是profileData；

2. 下断点
    这里直接搜的话是搜不到什么东西的，所以采用xhr断点进行调试：

![](https://attach.52pojie.cn/forum/202312/06/144315jytc051tqzq1sahn.png)

跟踪堆栈：

![](https://attach.52pojie.cn/forum/202312/06/144334ttwzihh61ts1z9h9.png)

堆栈打开可以看到是一个vmp，和签名x-s的很像

![](https://attach.52pojie.cn/forum/202312/06/144359gckwie1jk7kf777e.png)

一般来说，代码使用vmp加密，最后能够实现补环境获取签名后，再在本地分析（我推荐的方式），但字节的vm都是跳来跳去的，一个签名可能使用了好几个vmp；
那么，开始补环境：
懂事的小伙伴都知道
x-s入口函数：window.\_webmsxyw()
profileData:  window.xhsFingerprintV3.getV18

![](https://attach.52pojie.cn/forum/202312/06/144504ayxgtytjjthtjt59.png)

**补环境(jsdom)**
签名函数入口调用:

![](https://attach.52pojie.cn/forum/202312/06/144559jn8wuwk2m8nwuzz2.png)

运行一下：

![](https://attach.52pojie.cn/forum/202312/06/144615sb14odnk6nzzdoon.png)

我擦，有结果了，格式看起来和网页上的一致
但是我不喜欢，执行vmp消耗的资源巨大，手上没点钱是顶不住业务机器的高并发的；

**那么，分析算法：**
首先，这个vm和之前的x-s的vmp很像，那么，根据之前分析x-s的思路来分析这个vmp会不会大大提升效率？开干！

打log调试，看看内存变化：

![](https://attach.52pojie.cn/forum/202312/06/144806tvv5vg1hhqfj4oop.png)

什么？乱七八糟的看不懂啊！！，别急，懂事的小伙伴已经看到了我标记的一处地点了，抓下来，base64看看是什么数据

![](https://attach.52pojie.cn/forum/202312/06/144938sahq0wlg9wyxzagh.png)

这不就是浏览器各种各样的环境吗，太棒了。
分析到这里，笔者发现，这思路逻辑不就妥妥的和x-s的一模一样吗！？好的，开始验证：：
在x-s签名算法中，我们使用的是  "x1=" + x1 + ";x2=0|0|0|1|0|0|1|0|0|0|1|0|0|0|0;" + "x3=" + setCa1 + ";x4=1687164665;"; 那么，我将这个字符串替换成我们上面得到的呢

![](https://attach.52pojie.cn/forum/202312/06/145008ad8ujunlnlk8lhxn.png)

好像不太一样；那换个key呢？返回到内存中看看有没有类似于key的数组存在

![](https://attach.52pojie.cn/forum/202312/06/145044vuf3c4r3pofp3mvq.png)

好吧，原来答案已经写在脸上了，当然前提要有和笔者一样分析过x-s的经验。
最好将key替换得到结果：

![](https://attach.52pojie.cn/forum/202312/06/143949gf5cn11nbr86cni1.png)

![](https://attach.52pojie.cn/forum/202312/06/144008vio6whhjauipayja.png)

好的，完美结束！
