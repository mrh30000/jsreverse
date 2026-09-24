# 【Fiddler为所欲为第五篇】破解必备思路

> **作者**: 狂暴补师亚丝娜 | **发布时间**: 2019-05-23 15:57:00 | **版块**: 『编程语言区』 | **查看/回复**: 29580 / 54
> **原文**: [https://www.52pojie.cn/thread-962784-1-1.html](https://www.52pojie.cn/thread-962784-1-1.html)

---

*本帖最后由 狂暴补师亚丝娜 于 2019-5-23 17:59 编辑*

首先，大家如果还没看过之前三篇教程，可以顺便看看哦。了解封包的本质才能尽可能地为所欲为。
为所欲为第一篇：<https://www.52pojie.cn/thread-854434-1-1.html>
为所欲为第二篇：<https://www.52pojie.cn/thread-858631-1-1.html>
为所欲为第三篇：https://www.52pojie.cn/thread-859813-1-1.html
为所欲为第四篇：https://www.52pojie.cn/thread-864112-1-3.html

本来第四篇就应该差不多的， 但是之前C佬在学FD的时候，遇到了很多问题，因此再继续出，将C佬遇到的坑，在帖子上写出来。[@CrazyNut](https://www.52pojie.cn/home.php?mod=space&uid=584216)
顺便恭喜C佬，成功薅到考虫的羊毛，最后竟然不要回报提交BUG给考虫了，哈哈哈哈哈..................

首先，不管你英语是有多么的不好，一定要记住关键词：
**Request（请求）、Response（回复）
在Fiddler script中，会经常使用带有这两个单词的地方。比如Onbefore Request.....**

你最想了解的问题：
我想[破解](https://www.52pojie.cn)某个APP的会员使用权限，怎么做最好？
其实破解使用权限有两种思路供大家选择。以【绑定手机为例】。
A用户购买了【吾爱免费刷话费】的APP，绑定了小米9【序列号为123456】。此时B用户的手机一加7pro【序列号为654321】，也想用这个APP，则可以采取这两种方式：

教学开始：
一、修改提交的数据，以达到欺骗服务器的目的。
首先：欺骗服务器的意思就是说在达到服务器之前，就需要做好欺骗的工作，因此，需要在Request这里面就进行修改。**Request（请求）**
假设这个是A手机提交的封包：

> GET <https://www.52pj.com/UpdateCheck.aspx?isBeta=True> HTTP/1.1
> User-Agent: Fiddler/5.0.20173.50948 (.NET 4.6.2; WinNT 6.1.7601 SP1; zh-CN; 4xAMD64; Auto Update; Full Instance; Extensions: APITesting, AutoSaveExt, EventLog, FiddlerOrchestraAddon, HostsFile, RulesTab2, SAZClipboardFactory, SimpleFilter, Timeline)
> Pragma: no-cache
> Host: www.52pj.com
> Accept-Language: zh-CN
> Accept-Encoding: gzip, deflate
> udid:123456
> Connection: close

看这个封包，udid:123456就是A手机的特征，也就是说，一加7pro也想使用APP，则可以下断点，将udid:654321改成udid:123456，再提交给服务器就OK啦！这样就能达到欺骗服务器的方式啦。

二、修改返回数据，以达到欺骗客户端的目的。**Response（回复）**
首先：欺骗服务器的意思就是说在达到服务器之前，就需要做好欺骗的工作，因此，需要在Response这里面就进行修改。
假设这个是A手机返回的封包：

> staus:1
> endtime:2019-05-23

看这个返回的结果，1表示状态，endtime表示到期时间，也就是说5月23日到期。于是我们下断点，将返回的封包改成A手机，既可成功欺骗客户端而使用APP啦。

三、欺骗服务器和欺骗客户端的优缺点。
欺骗服务器：
优点：
1、若服务器返回的key是一次性加密的，则无法做到欺骗客户端。但是服务器端返回的数据是合法的，因此可以直接破解。
2、服务器数据不会异常，后台只会显示小米9一直在换着地方登陆，而不会有过多的猜想。
缺点：
1、必须已经有一台付费的设备才可以，必须要付费。

欺骗客户端：
优点：
1、无需付费的设备即可破解，看返回的数据更容易修改。
2、无需了解APP验证的业务逻辑， 只看最后结果。
缺点：若为加密算法， 绑定了其他的信息，则会破解失败。

以上两种破解方法各有特色，大家在破解的时候可以根据实际的情况来看。预祝大家可以顺利薅羊毛和破解！！！！

四、好了，知道如果破解APP了过后，就可以灵活使用script了！
祝大家破解成功，爱你们的亚丝娜~
但是亚丝娜最爱的人是谁呢？那肯定是xl。
