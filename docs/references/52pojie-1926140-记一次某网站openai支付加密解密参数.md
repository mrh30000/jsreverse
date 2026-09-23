# 记一次某网站openai支付加密解密参数

> **作者**: Nemoris丶 | **发布时间**: 2024-05-20 13:10:00 | **版块**: 『编程语言区』 | **查看/回复**: 667 / 12
> **原文**: [https://www.52pojie.cn/thread-1926140-1-1.html](https://www.52pojie.cn/thread-1926140-1-1.html)

---

说明：本记录仅供学习参考。不做任何商业等其他用途。为防止网站作者损失盈利，此学习不公开笔记中的任何链接

在支付页面时候点击继续，会发送一些支付数据

![](https://attach.52pojie.cn/forum/202405/20/124642a18hxgdh0110o9hz.png)

![](https://attach.52pojie.cn/forum/202405/20/124840bqi1siirsviyvvc7.png)

![](https://attach.52pojie.cn/forum/202405/20/124731x6ylx9yb39y84xpq.png)

根据请求数据的分析，可以得出下面这几个参数
amount: 订单金额
channel: 唤起付款渠道
platform: 渠道。h5，Android等等
type: 上图的会员类型
但是在返回时，数据都被加密我们得不到对应内容
![](https://www.52pojie.cn/forum.php?mod=image&aid=2696804&size=300x300&key=45535c98bb3ff3d8&nocache=yes&type=fixnone&ramdom=Zv1ya)
在支付请求唤起后，会返回一串加密信息，js中重定向该加密信息的内容(这个就是我们要逆向解析的数据)
1.打开F12，我们可以看到网站在初始化的时候加载了一堆js，其中就有一些加解密的方法

![](https://attach.52pojie.cn/forum/202405/20/125232mzerio4y2ejj2uro.png)

画圈如图，我们只要知道这2个即可。在上面走步骤之前我测了一下，只有在唤起支付的时候才走axios请求，其他时候都是连带网页加载进来。
那么我们先开第一个图AES-xxxxx.js  熟悉的朋友都知道这个是加解密的对应单词方法，打开进去，格式化代码我们可以看到。iv值是写死的，key和内容是在其他地方引入该js时候传入进去

![](https://attach.52pojie.cn/forum/202405/20/125534p6hmk8o4eel8z8f4.png)

在请求发送的时候，推测了下应该是在request.js做。那么我们打开该js可以看到在请求后的处理。直接全局搜索关键词 decrypt，定位到该地方

![](https://attach.52pojie.cn/forum/202405/20/125708ys7bsqm3rtm9ckr2.png)

按上图的截图可得，作者的解密方法是将返回的加密字符串截取前16个字符作为key，从第17位字符后是需要我们解密的数据，那么根据上面加密的方式以及解密的方式，我们可以自己写出一套解密流程

![](https://attach.52pojie.cn/forum/202405/20/130259y57iorss7oz7oe9i.png)

![](https://attach.52pojie.cn/forum/202405/20/130346pcywcif3t93xxsc9.png)

可以看到我们已经成功解密出来。
那么到这里就有个疑问了，前端发送的时候，我们能否更改金额，实现1元支付然后买他的永久vip？我们这边尝试一下

![](https://attach.52pojie.cn/forum/202405/20/130645ynr8zkrnqqh5tell.png)

右键编辑并且重发，把参数166改为1后，我们请求一下。将请求结果解析出来看看

![](https://attach.52pojie.cn/forum/202405/20/130709zxgbxy9sddsfy4sz.png)

![](https://attach.52pojie.cn/forum/202405/20/130758tr15ab1wz1wnamnm.png)

可以看到解析返回
{"code":200,"data":null,"retCode":"fail","retMsg":"会员参数错误，请刷新重新尝试 -2。"}
通过多次尝试和对比，猜想了下。作者可能把支付的金额带到后端后，做比对：假设后台商品有166的价格商品，这时候才做参数注入。并且返回，否则直接提示参数错误
ps:一开始还想投机取巧的。结果还是失败了。但我看了下，该网站在ai对话发送和返回的加解密都是用的同一套代码。![](https://static.52pojie.cn/static/image/smiley/default/47.gif)
