# 某酷ckey签名生成算法系列-（四）ast代码字符串反混淆与回填

> **作者**: 漁滒 | **发布时间**: 2021-12-30 23:50:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5036 / 12
> **原文**: [https://www.52pojie.cn/thread-1569514-1-1.html](https://www.52pojie.cn/thread-1569514-1-1.html)

---

@[TOC](https://www.52pojie.cn/%E6%9F%90%E9%85%B7ckey%E7%AD%BE%E5%90%8D%E7%94%9F%E6%88%90%E7%AE%97%E6%B3%95%E7%B3%BB%E5%88%97--%EF%BC%88%E5%9B%9B%EF%BC%89ast%E4%BB%A3%E7%A0%81%E5%AD%97%E7%AC%A6%E4%B8%B2%E5%8F%8D%E6%B7%B7%E6%B7%86%E4%B8%8E%E5%9B%9E%E5%A1%AB)

上一篇中，我们已经把控制流完全去掉了，但是存在的字符串混淆，依然阻挡了调试的脚本，本篇文章尝试对这部分进行还原，减少调试点击的次数

![](https://attach.52pojie.cn/forum/202410/11/172909vure8dzldjluyttx.png)

最明显的形如上面图片中的代码，加密字符串En最终异或解密赋值给Ne，使用ast的话可以直接对其进行异或计算

![](https://attach.52pojie.cn/forum/202410/11/172911sslxwxkcdhbxh03p.png)

还原后简洁了一些，继续查看另外一种字符串混淆

![](https://attach.52pojie.cn/forum/202410/11/172913mmm3mmmhufiu1u5t.png)

这里的操作如上图，通过w数组传入加密内容，解密，然后再取出，知道逻辑后，就可以使用ast去还原这部分计算

![](https://attach.52pojie.cn/forum/202410/11/172915b8dk2z484oh44ogz.png)

这样就完成了字符串混淆的大部分还原了，继续查看发现有很多字符串都被切分开了

![](https://attach.52pojie.cn/forum/202410/11/172917tqdh8vgbqvizf4f8.png)

使用ast拼接，会使得阅读更加直接

![](https://attach.52pojie.cn/forum/202410/11/172920wz8tsn3zrrr88ijr.png)

来到这里就已经差不多了，还差一点点收尾工作，发现有一些字符串反转后才是实际的内容

![](https://attach.52pojie.cn/forum/202410/11/172922raampvzhpasvbx2a.png)

使用ast就很容易对这部分内容进行反转

![](https://attach.52pojie.cn/forum/202410/11/172924b9up9vxbgvgggdig.png)

到这里，所有的混淆已经全部处理完整，对比与一开始源码的样子，已经变得相对容易阅读很多了，不过这才是分析签名生成的第一步。
