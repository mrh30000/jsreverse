# JS逆向之某道translate解密

> **作者**: QingYi. | **发布时间**: 2021-07-23 11:19:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6150 / 45
> **原文**: [https://www.52pojie.cn/thread-1480963-1-1.html](https://www.52pojie.cn/thread-1480963-1-1.html)

---

首先抓个包 看看什么参数是加密的

![](https://attach.52pojie.cn/forum/202107/23/104105gxcz9uv79337bkax.png)

好像是有这么多哦，我们不知道那些是加密的 那些是定死的 怎么办，再抓一次看看

![](https://attach.52pojie.cn/forum/202107/23/104356sp67jp76pmya6zdl.png)

我们发现好像是这个三个 才是我们需要去找的吧？

![](https://attach.52pojie.cn/forum/202107/23/104416fimuw2vroioxitqw.png)

我们直接开干sign，初步判断是这边，不管那么多，先打个断点先

![](https://attach.52pojie.cn/forum/202107/23/104542pxa47u9uu8x48exl.png)

落下来了，大家看看这两个东西是不是有点像？

![](https://attach.52pojie.cn/forum/202107/23/104751po0a4gp8wieoelz8.png)

好，我们点进去md5看看sign

![](https://attach.52pojie.cn/forum/202107/23/104910q3a5b8tzi3mm0e0o.png)

定位到这边，所以说我们可以把md5和 那个 sign拿出来改写一下了。

![](https://attach.52pojie.cn/forum/202107/23/105851pgdt5nxxf2dtpyxb.png)

改写完成，但是看到这边是不是少了两个参数？

![](https://attach.52pojie.cn/forum/202107/23/105719kvbodunubqwubrno.png)

我们来看看他们在哪儿

![](https://attach.52pojie.cn/forum/202107/23/105853d2bt99mvtrv952c9.png)

e是我们的单词，i是由r构成。 r等于当前时间戳，i等于r 在拼接一位  一位数的整数 可以看看之前抓包的参数是不是这样，这边我就不细讲了。我直接改写了。

改完之后他告诉你错误，是不是没有h f函数啊？我们把他添加进来

![](https://attach.52pojie.cn/forum/202107/23/110246jy9smbmwy4fxrbwb.png)

下个断点在这边，看看他的函数在哪

![](https://attach.52pojie.cn/forum/202107/23/110359zblk8pik8g2y82h7.png)

似乎就在上面哦，我就给大家演示这一个，后面的你们自己去添加吧，我直接把函数扣出来了。

![](https://attach.52pojie.cn/forum/202107/23/110451h4ci87uaub2jrxi1.png)

sign 拿到 完事

![](https://attach.52pojie.cn/forum/202107/23/110636qjnx5qhhnzhvcx5n.png)

好，现在拿到Python里面去改写。

![](https://attach.52pojie.cn/forum/202107/23/111914f7pdbmjzuadduqju.png)

关键代码就是上面这一部分了，后面的自己去修修补补就行了。
