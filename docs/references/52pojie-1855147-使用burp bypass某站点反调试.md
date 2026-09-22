# 使用burp bypass某站点反调试

> **作者**: p0ss | **发布时间**: 2023-11-10 16:11:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 1646 / 7
> **原文**: [https://www.52pojie.cn/thread-1855147-1-1.html](https://www.52pojie.cn/thread-1855147-1-1.html)

---

F12进入无限debugger

![](https://attach.52pojie.cn/forum/202311/10/150002zzyoeb3oare41eye.png)

开始分析，burp代{过}{滤}理，发现请求时数据包如下：

![](https://attach.52pojie.cn/forum/202311/10/152549j2xs1iu4hwh42yiz.png)

首先浏览器F12，分析html document：

![](https://attach.52pojie.cn/forum/202311/10/152738mq3bidz1uupr4sxx.png)

备注写了，这段script是用来禁止F12，那么在burp返回的时候去除掉这段代码吧。
去掉html script代码后，发现F12还是进入debugger，那么逻辑就在js里面了，分析app.xxx.js吧。
下意识搜索debugger，没搜到，有点纳闷，花了点时间，发现js里面用了construct来动态构建函数，debugger也是洞态拼接的，这段for循环和switch代码比较关键。

![](https://attach.52pojie.cn/forum/202311/10/153240qpgbmz9p059bwpd0.png)

多次单步调试，发现这里会用switch方式动态生成反调试代码，那让下面的case条件永远触发不了是不是就ok了。于是，在burp里面将类似于1|0|2|3|4|5改为100：
改了这里也不行，发现app.xx.js里面还有其他地方可以生成检测代码，还有两处：
3|4|0|5|1|2
3|1|5|2|4|0
代码类似

![](https://attach.52pojie.cn/forum/202311/10/153557gr65qkss1rsrl8r6.png)

app.xx.js里面这两处switch都改了，发现还进入debugger，在F12调用堆栈中发现1.xx.js也有检测代码，方式都一样，那没办法，依次操作呗。

![](https://attach.52pojie.cn/forum/202311/10/155348jgexxi6g4psnxugz.png)

接下来可以进行调试了。
