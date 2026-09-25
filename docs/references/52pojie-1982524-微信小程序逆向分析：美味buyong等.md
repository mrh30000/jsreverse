# 微信小程序逆向分析：美味buyong等

> **作者**: studySprider | **发布时间**: 2024-11-16 16:12:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3530 / 8
> **原文**: [https://www.52pojie.cn/thread-1982524-1-1.html](https://www.52pojie.cn/thread-1982524-1-1.html)

---

*本帖最后由 studySprider 于 2024-11-16 17:10 编辑*

微信小程序逆向分析：美味buyong等
1.[破解](https://www.52pojie.cn)mAuthToken

![](https://attach.52pojie.cn/forum/202411/16/142546r720utut7fi0at0u.png)

2.搜索关键字‘‘mAuthToken’’，找到相应位置，网上找到s

![](https://attach.52pojie.cn/forum/202411/16/143154jv99x9vaxjvsljbj.png)

3.在var s = (0,
                i.getStore)(n.MW\_AUTH\_TOKEN)打上断点，打印s值和上次请求的mAuthToken不一致，猜测因为时间戳或者随机是在变化的
n.MW\_AUTH\_TOKEN='mwAuthToken'，所以关键方法是i.getStore

![](https://attach.52pojie.cn/forum/202411/16/143641pafuxafi12zaiuu2.png)

![](https://attach.52pojie.cn/forum/202411/16/144128kj7h1rqa41n2y8by.png)

4.进入到getStore方法了，if (!r.default[e])进入不了，不用管，o是undefined，所以o && a(e)不会触发，关键取值在t[e]，e是传进来的key即'mwAuthToken'，所以应该去找t，t在闭包里不是局部变量

![](https://attach.52pojie.cn/forum/202411/16/145508x3ot4y41s14wenyb.png)

![](https://attach.52pojie.cn/forum/202411/16/145905mmzhxlu3n2h6y2cc.png)

5.往上找t，发现了初始化为一个空字典，在此处打个断点，想看下怎么从无到有的

![](https://attach.52pojie.cn/forum/202411/16/152645pbddl1w996dbzcdd.png)

6.然后就开始迷惑起来了，因为无论我怎么触发，都无法到达这个断点，然后我又尝试在我认为可能有用的方法上断点，setStore和clearStore，发现setStore也断不了，clearStore可以断，但是看传入的参数e，都不是我想要的key值
线索不能断在这里，我个人直觉setStore是最有用的，虽然无法触发断点，但是可以搜索下哪里调用了setStore，毕竟看这方法，形参里e是key，o是value，还是得看value

![](https://attach.52pojie.cn/forum/202411/16/153714hjwtutad01ex3xih.png)

7.再补一张完整代码片段的图，大致意思就是一定会执行o方法，resetStore也是执行o方法

![](https://attach.52pojie.cn/forum/202411/16/155038zo7kyozcmui96iu9.png)
