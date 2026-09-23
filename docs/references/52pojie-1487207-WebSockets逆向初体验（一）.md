# WebSockets逆向初体验（一）

> **作者**: QingYi. | **发布时间**: 2021-08-02 16:37:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 13946 / 56
> **原文**: [https://www.52pojie.cn/thread-1487207-1-1.html](https://www.52pojie.cn/thread-1487207-1-1.html)

---

首先打开我们的网址，进行抓包记得调对位置是WS（WebSockets）

![](https://attach.52pojie.cn/forum/202108/02/153024n6lz4b2ul4u4404k.png)

不懂这一块的可以自己先看看网上教程，然后学一些，后面我会带一点知识出来

点进去看看调用栈

![](https://attach.52pojie.cn/forum/202108/02/153150e3sbcd86suvv3edi.png)

这里需要注意，仔细看看少了什么东西？我们今天来干的就是这个发送消息的。也就是send

![](https://attach.52pojie.cn/forum/202108/02/154509t9p6v8f9jjhvnhbv.png)

但是他有很多个，难不成我们一个一个去断点吗？

![](https://attach.52pojie.cn/forum/202108/02/155010k5dms8hpmnm2zuvd.png)

好，我们对他进行Hook，钓鱼
因为肯定是p调用的，所以我们断点要断在这里

![](https://attach.52pojie.cn/forum/202108/02/153654gxf3ggg7ttzmx7om.png)

好，我们把它勾住了

![](https://attach.52pojie.cn/forum/202108/02/155215e2bhupw7tnl2u22b.png)

我们来看调用栈，顺便打个断点

![](https://attach.52pojie.cn/forum/202108/02/155251pspcspcpyssnhppv.png)

我们现在要回去p那边，把钩子取下来

![](https://attach.52pojie.cn/forum/202108/02/155419fqir3pxqc3qixeuc.png)

发送的时候断住了

![](https://attach.52pojie.cn/forum/202108/02/155525s61o7bcwh7nj5duc.png)

追栈，发现这个就是主体

![](https://attach.52pojie.cn/forum/202108/02/155628pwbxlbcclssbjxvu.png)

我们可以看到，他就是d搞出来的名堂，我们把d给抓出来

![](https://attach.52pojie.cn/forum/202108/02/155814l2jfecpceg39pag2.png)

改写，顺带把当前可以看到的数据先拿出来

![](https://attach.52pojie.cn/forum/202108/02/160910k7ujl083t63s0q0l.png)

然后我们发现还差一个p.Wup，这个p又是什么，wup又是神马？
其实它在上面，仔细看下这个流程

![](https://attach.52pojie.cn/forum/202108/02/161856thop006aozo7psqa.png)

我们现在点进去看看这个函数是什么东西

![](https://attach.52pojie.cn/forum/202108/02/162203k2p3crpy3r7eeeya.png)

随便找一行来搜索一下

![](https://attach.52pojie.cn/forum/202108/02/162245ljz2n7nxkxw6xjdi.png)

他其实是通过这个方法来的

![](https://attach.52pojie.cn/forum/202108/02/162326gnx96nx58md79ox9.png)

仔细想一下这个玩意是不是在哪里似曾相识

![](https://attach.52pojie.cn/forum/202108/02/162458ajc8ce9cg2ttcidj.png)

好，仔细想一下。

我们现在是要用p，用p去点出方法但是wIU9这个东西怎么拿出来呢？

其实这是一个webpack的包（具体可以看我这个帖子：<https://www.52pojie.cn/thread-1469095-1-1.html>）
我们要对他进行改写

![](https://attach.52pojie.cn/forum/202108/02/161605r7s3s5dcon6suozk.png)

是不是有这个东西?

![](https://attach.52pojie.cn/forum/202108/02/163636jsnc1nscocnyz15o.png)

好，本次教程还没完，后续的下次写，你们先看着。
