# 记一次资金盘APPsign算法破解

> **作者**: 全拼 | **发布时间**: 2023-06-03 18:50:00 | **版块**: 『移动安全区』 | **查看/回复**: 5470 / 30
> **原文**: [https://www.52pojie.cn/thread-1793143-1-1.html](https://www.52pojie.cn/thread-1793143-1-1.html)

---

**经常写青龙脚本薅羊毛免不了要与sign算法打交道，随手记录一个昨天刚拿下的资金盘羊毛APP**

![](https://attach.52pojie.cn/forum/202306/03/175710inzwc32l04iz686n.png)

**基本都是这一种套路，找个噱头让你投资点钱，然后每天返点多少，前期进去大概能撸点钱，后期进去裤衩子都不剩，典型的传炸药桶游戏**
**先抓包**

![](https://attach.52pojie.cn/forum/202306/03/175958h3n7r6ddyf8ps3y4.png)

**带sign值，np打开发现没有加壳，先拖进”杰尼龟“里瞅瞅长啥样**

![](https://attach.52pojie.cn/forum/202306/03/180622vasbnyll0n4larll.png)

**打开AndroidManifest.xml发现经典的uniapp特征，那么分析java层就没什么意义了，解压压缩包**
**打开assets目录，一般uniapp的核心js文件就在assets目录下面，寻找app-service.js**

![](https://attach.52pojie.cn/forum/202306/03/181029ohx4ohtmdjx979l4.png)

**在assets某个子目录下找到了service.js文件，notepad++打开，里面是一团压缩过后的js文件，找个在线解压网站解压**

![](https://attach.52pojie.cn/forum/202306/03/181218ui7ufl7luic8tsnz.png)

**没有被混淆，直接查找关键字"sign"**

![](https://attach.52pojie.cn/forum/202306/03/181629ka9n5db5q5dmt6d6.png)

**e.header["sign"] = l.default.getSign(Object.assign(e.data, e.params))这一串代码，简单分析一下，data一般指的是form表单数据，params一般是指类似于url关键字之类的东西，比如 ?wd=xxxx那种**
**发现调用****getSign函数，继续追踪，查找getsSign()**

![](https://attach.52pojie.cn/forum/202306/03/182110tqli7nnslr3nkqsq.png)

**先分析一下n.default.APP\_SECRET是一个常量，t是一个字典型数据，a对字典里的key进行排序，后面就是一堆乱七八糟的字符串操作了，基本扣下来改改就行了**

![](https://attach.52pojie.cn/forum/202306/03/183040fatcsaddvtttyax7.png)

**输入一个时间戳字典进去（考虑到人家还没倒，我还想撸点钱，e的字符串常量我就没放上去，XD）**

![](https://attach.52pojie.cn/forum/202306/03/184221gsjufpr90pz6f7aa.png)

**至此大概就明白了这串东西在干什么**
**重新用回第一张截图的抓包数据，带入，然后进行md5加密**

![](https://attach.52pojie.cn/forum/202306/03/184403e1osooonh1oho1hj.png)

**和第一张截图的sign完美契合**
**拿到sign过后那肯定要薅羊毛啊，写青龙脚本，本人不太喜欢用js写青龙脚本，感觉不是很优雅，习惯用python写，一开始想用python复写那段加密算法，写了一段，卧槽感觉好烦。。。。。突然想起来神奇的python好像有个叫做PyExecJS的库**
**最终写成了一大拖一小的模式**

![](https://attach.52pojie.cn/forum/202306/03/184438x57faz5bthz54zbw.png)

**app和我写的脚本就不放论坛上面了，里面含有我自己薅羊毛群的信息，容易被版主正己大佬乱棍打死，就分析到这里了，溜溜球了**
