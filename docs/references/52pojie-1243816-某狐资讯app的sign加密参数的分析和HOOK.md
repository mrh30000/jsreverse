# 某狐资讯app的sign加密参数的分析和HOOK

> **作者**: z5487693 | **发布时间**: 2020-08-11 11:32:00 | **版块**: 『移动安全区』 | **查看/回复**: 6896 / 24
> **原文**: [https://www.52pojie.cn/thread-1243816-1-1.html](https://www.52pojie.cn/thread-1243816-1-1.html)

---

52论坛是学习逆向最开始的论坛。又水了好久，发个帖子冒冒泡！大佬请轻喷。
先抓包，app是用的okhttp3没有混淆的直接用抓了xp的justtrustme插件的模拟器抓包。

![](https://attach.52pojie.cn/forum/202008/11/111445ythsy6cye4s4zspx.png)

抓包结果sign、pid、mid这三个值。pid是个随机值，mid是类似deviceID一样的东西固定死的。我就分析了sign这个值。
然后直接app扔到jadx里面进行搜索

![](https://attach.52pojie.cn/forum/202008/11/111406a88pug1zquqcau1i.png)

跟包名相关的路径下的sign点进去看看

![](https://attach.52pojie.cn/forum/202008/11/111412dzvd4d25ogrtxd7w.png)

![](https://attach.52pojie.cn/forum/202008/11/111414at7qgmqjmk7yzm7g.png)

![](https://attach.52pojie.cn/forum/202008/11/111416o3tjb2unsbsknakr.png)

最终跳转到这了为什么这么肯定是这，因为我搜pid的时候最终也走的这，调用的是e方法。记录下这个java的路径等会儿可以hook一些java的参数看看到底是不是。
然后上ida分析看看native是怎么实现的

![](https://attach.52pojie.cn/forum/202008/11/111424pu02rr4m0krmct0r.png)

导出表搜直接就是静态注册的跳转进去，然后找到有一个md5的关键点(不一定每一个都有这个md5,这个简单所以没好找)

![](https://attach.52pojie.cn/forum/202008/11/111408gdi464n1831dh12z.png)

在这个md5之前还有一些操作就是把jstring转cstring然后拼接之类的，忘了保存图片了。
，c语言好的可以自己看，我是比较菜的属于那种感觉像就hook一下然后hexdump一下。

![](https://attach.52pojie.cn/forum/202008/11/111402xba3p3pppzkb3ocl.png)

![](https://attach.52pojie.cn/forum/202008/11/111418ndznmunnu2u2u4de.png)

memcpy这些应该是env函数吧，拷贝还是什么的咱也不是很懂。就看这个tranform里面。

![](https://attach.52pojie.cn/forum/202008/11/111410zn1zjyjvjwthw1p1.png)

这个函数里面就是一些异或了，md5的具体实现就在这里，所以hook点就在这个update。找到它的偏移然后进行hook

![](https://attach.52pojie.cn/forum/202008/11/111359ki1sj9j132j88kh3.png)

![](https://attach.52pojie.cn/forum/202008/11/111404xojqj8jj9q3j9qoy.png)

这里hexdump打印出来的值keyword=后面应该是编码问题，java层的我也hook输出了一下把关键字和时间戳替换成抓包的进行md5一下。就可以确认了。（对于非标准md5这些算法的so层加密还没学习方向，最近也还在学js逆向！）（在北京的爬虫猿）
大家都努力吧！！感谢论坛各位大佬们的分享！（如有违规麻烦管理动手删掉就行）
