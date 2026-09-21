# 【JS逆向】某大型电商平台参数逆向分析

> **作者**: LaoBwait | **发布时间**: 2025-12-26 23:53:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6294 / 42
> **原文**: [https://www.52pojie.cn/thread-2082647-1-1.html](https://www.52pojie.cn/thread-2082647-1-1.html)

---

### 声明

本文章中所有内容仅供学习交流使用，不用于其他任何目的，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关！若有侵权，请联系作者删除。

#### 网址

aHR0cHM6Ly93d3cuamQuY29t

#### 分析

这里用第一个使用该参数的接口进行分析

![](https://attach.52pojie.cn/forum/202512/26/173219d44clpzkudp4sl4c.png)

进到加密位置

![](https://attach.52pojie.cn/forum/202512/26/174426e7kakkg4b47bkqka.png)

跟代码进到sdmnd ~~（总感觉coder在骂街）~~

![](https://attach.52pojie.cn/forum/202512/26/175859crv7kys539dkj2h3.png)

给这个模块内所有的call和函数打上断点 （如下所示）

![](https://attach.52pojie.cn/forum/202512/26/180336t3xm7x31vekr6g8r.png)

经过一通f8 f9操作后我们能看到生成fp的函数

![](https://attach.52pojie.cn/forum/202512/26/180912rcd4lndhn3jncjjr.png)

继续进行f8 f9 我们会发现

![](https://attach.52pojie.cn/forum/202512/26/210231e2u6nz2pufofpf3u.png)

跟进去会找到生成模块，依旧在call和函数打上断点

![](https://attach.52pojie.cn/forum/202512/26/210704pcczczcg77qf443w.png)

分析后可以知道clt模块是对窗口指纹信息包括fp进行魔改过后的base64编码 这里就不具体进行分析了
在clt后紧跟ms 打好断点跟进代码

![](https://attach.52pojie.cn/forum/202512/26/211911pbjpbsexqkrrxkkm.png)

如上图所示 新生成一个时间戳将其转为 yyyyMMddhhmmssSSS 格式
继续跟代码 找到生成默认token的模块

![](https://attach.52pojie.cn/forum/202512/26/212558a4yc8s8dcpc8cuf8.png)

进一步跟进分析（这里断点少打了 为了不中断 更换浏览器来实现这部分）

![](https://attach.52pojie.cn/forum/202512/26/220540vc1eetu9g1hnc6zt.png)

其中
****expr**** 由随机生成表示三个加密算法排列组合的字符串 用随机字符串填充至固定长度 最后由 base64进行编码
****cipher**** 由固定参数 fp 时间戳 随机字符串组合成新字符串（组合顺序不是这个顺序）用平台修改过的MD5 获得签名 这组字符串加上签名 由魔改过后的base64进行编码

拼接后得到并不完整的token

![](https://attach.52pojie.cn/forum/202512/26/222621zp0vk9ztxypsd9tv.png)

用平台修改过的MD5 获得不完整的token的签名
进行MD5之前会对字符串加上签名（姑且叫签名吧） 其中的逻辑不再赘述

![](https://attach.52pojie.cn/forum/202512/26/223022vv5gpo3nkbs3vzt7.png)

然后就得到了

![](https://attach.52pojie.cn/forum/202512/26/223424pitddi8wgii9edgd.png)

拼接后 获得默认的token

![](https://attach.52pojie.cn/forum/202512/26/223605qfflzy20au9v99u0.png)

跟进代码 （更换回最开始的浏览器）

![](https://attach.52pojie.cn/forum/202512/26/224217xx030zomdeyd88r5.png)

依旧是参数进行拼接 跟据token中的expr开始加密

![](https://attach.52pojie.cn/forum/202512/26/225157djljqqlbdz3adabl.png)

加密算法为 local\_key\_1 local\_key\_2 local\_key\_3 在加密之前都会数据进行加上签名和对不完整的token进行MD5之前的操作一样 其中local\_key\_1算法可以确定是平台修改过的MD5 local\_key\_2算法我推测是修改过的SHA256 而local\_key\_3算法则是修改过的HMAC-SHA256 ****（欢迎大佬指正）****
加密完以后得到这样的依托

![](https://attach.52pojie.cn/forum/202512/26/231109btfqabirt7lbgbs3.png)

接着跟代码

![](https://attach.52pojie.cn/forum/202512/26/232133u2khqammc5lazmek.png)

进入gs后 先将如下数据送入local\_key\_2

![](https://attach.52pojie.cn/forum/202512/26/232613t2o1aonoot1nto1n.png)

得到
![](https://attach.52pojie.cn/forum/202512/26/232709gvikexwwv7gw17mv.png)

继续跟代码

![](https://attach.52pojie.cn/forum/202512/26/232902dx0jzvjkm0w0m0tm.png)

继续跟

![](https://attach.52pojie.cn/forum/202512/26/233230fjjj9mrs4b5gz1jy.png)

![](https://attach.52pojie.cn/forum/202512/26/233252vmhuxdbztxb1mewt.png)

即 把数据使用local\_key\_2 加密

![](https://attach.52pojie.cn/forum/202512/26/233353r18dkddmjdlqzkll.png)

最后一个参数 拿来即用 ~~固定参数~~

![](https://attach.52pojie.cn/forum/202512/26/233936t27ig2z2qvw2uwgr.png)

最终我们得到

![](https://attach.52pojie.cn/forum/202512/26/234259vf42nz9b9na2t9na.png)

拼接后

![](https://attach.52pojie.cn/forum/202512/26/234424bii91661susym140.png)

实现逻辑 整个请求验证

![](https://attach.52pojie.cn/forum/202512/26/234836mux8et5k8lxxex5e.png)

#### 结束

这是我第一次分享 感谢大家耐着性子看完 新人发帖有缺陷的地方欢迎大家指正 也欢迎大家讨论

最后 祝大家事业有成 技术进步
