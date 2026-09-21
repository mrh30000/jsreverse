# 对某网站进行JS逆向AES实战

> **作者**: QingYi. | **发布时间**: 2021-07-01 19:27:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8756 / 29
> **原文**: [https://www.52pojie.cn/thread-1468829-1-1.html](https://www.52pojie.cn/thread-1468829-1-1.html)

---

*本帖最后由 QingYi. 于 2021-8-27 18:41 编辑*

由于之前那个网易云的md做的不是很好，特意在本站写一次。网易云AES链接：<https://www.52pojie.cn/thread-1453411-1-1.html>

为什么要学会JS，因为爬虫post包登录，发现参数加密，怎么办？ 或者说某个网站有活动，需要post登录 怎么办？ 加密了 又怎么办。

总而言之，多学一点知识总是没有坏处（虽然现在占用了我的时间,也没见到能产生金钱利益....）

首先打开我们的网站：<https://tianaw.95505.cn/tacpc/#/login>

输入账号密码，进入抓包。我们可以看到这个网站的验证码好像是假的，没发请求过去，点进去参数一看，是加密的。

![](https://attach.52pojie.cn/forum/202107/01/165113lostdb6oobboozd2.jpg)

我们可以看到他的调用栈，都是第一行，我们点进去，直接查找“jsonKey”---------先在左下角搜索，再在页面里面搜索，定位到这边。。但是我们从初学者的角度来带大家看问题；故，我们不这么操作。

![](https://attach.52pojie.cn/forum/202107/01/165341ttf50z20uduq5fiv.jpg)

我们要添加xhr断点因为他就是xhr请求，可以自己抓包分析，添加断点，从com 后面复制一段过来就行，然后我们刷新页面

![](https://attach.52pojie.cn/forum/202107/01/165937g4gregjm9053enl5.jpg)

再点登录，是断下来了，但是还是加密的

![](https://attach.52pojie.cn/forum/202107/01/170048ojzwyfg7y2zqy222.jpg)

我们一步一步往上找，数据结构中的栈是先进后出 FILO-----------我们可以看到还是加密的

![](https://attach.52pojie.cn/forum/202107/01/183751efp31tf5zf7i2fm2.jpg)

然后一直往上找这里我就不演示了，找到了password是明文

![](https://attach.52pojie.cn/forum/202107/01/183957i4kibcc2mse5u3l7.jpg)

然后我们把断点打到这里，再点击登录

![](https://attach.52pojie.cn/forum/202107/01/184419dbwyztvfvbkbvz2p.jpg)

好了，断点断下来了，我们按F11进入看是怎么回事，数据为什么会变化
f11一次

![](https://attach.52pojie.cn/forum/202107/01/184810jae82taooaezv38b.jpg)

f11两次

![](https://attach.52pojie.cn/forum/202107/01/184805v0h33lqlq3lqbvch.jpg)

然后我们单步调试，可以看到未加密的JSON和一个Encrypt，猜测是一个加密算法
我们把鼠标悬浮上去，点进去

![](https://attach.52pojie.cn/forum/202107/01/191114tzoy18pa6yabbbar.jpg)

我们可以看到他是一个标准的AES加密的，这里我就直接用模板了，因为抠函数太难抠了

![](https://attach.52pojie.cn/forum/202107/01/191749hyg2szy0faxnfra2.jpg)

各种模块的引用

![](https://attach.52pojie.cn/forum/202107/01/192442aa600b0uoiruimku.jpg)

好，现在我们AES进行操作，但是我们看到，这边需要插入一个值I,I怎么来？

![](https://attach.52pojie.cn/forum/202107/01/191725fmrr0ndp4a944ma9.jpg)

我们现在来找I,复制这个I，即可

![](https://attach.52pojie.cn/forum/202107/01/191824yfqxxmgfmyzqwx9q.jpg)

好，我们现在来运行一下：

到此完毕。
可以改成Python代码，来对网站进行post登录，以达到你想要的目的。
