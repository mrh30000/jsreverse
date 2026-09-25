# 实战某东so层算法sign分析

> **作者**: Null_Null | **发布时间**: 2021-01-21 13:21:00 | **版块**: 『移动安全区』 | **查看/回复**: 16951 / 66
> **原文**: [https://www.52pojie.cn/thread-1355674-1-1.html](https://www.52pojie.cn/thread-1355674-1-1.html)

---

*本帖最后由 Null\_Null 于 2021-1-21 13:37 编辑*

前两天分析的帖子被删除了，包含了个人联系方式

这次重发，本文只用做技术分享，若有违规的地方请及时联系删除

某东sign算法，非rpc远程调用，从0开始分析算法！

高清PDF版本链接：https://pan.baidu.com/s/1i0TW4GMSL9dOE9DsiNBAlQ

提取码：bcan

正文

=================

经过简单分析，确定native方法存在与libjdbitmapkit.so中

ida打开进行静态分析

跟进sub\_127E4

![](https://attach.52pojie.cn/forum/202101/21/133123bfswonis1w9nibsd.png)

首先对字符串进行了一些简单的拼接

拼接完成通过sub\_126AC对字符串字节码进行处理

![](https://attach.52pojie.cn/forum/202101/21/133126zrr46464id8ddti8.png)

经过两个函数sub\_18B8、sub\_227C处理，得到sign值

![](https://attach.52pojie.cn/forum/202101/21/133129ptxx07n7qxeggahv.png)

Sub\_18B8,base64

![](https://attach.52pojie.cn/forum/202101/21/133131rlpz20it10t0vtiw.png)

![](https://attach.52pojie.cn/forum/202101/21/133134ti9uqz6228g0gbb2.png)

Sub\_227c,md5

![](https://attach.52pojie.cn/forum/202101/21/133137dldjljmezs95j855.png)

流程大致如下

字符串拼接---->sub\_126AC---->base64---->md5---->sign

观察sub\_126AC传参

![](https://attach.52pojie.cn/forum/202101/21/133141hkcwvddcv1zasqdn.png)

V9为jni指针,v65为加密明文字节码,v33为加密长度,v26以及v27为随机数

![](https://attach.52pojie.cn/forum/202101/21/133144jqsies2iem8eqrsp.png)

V26以及v27经过sub\_12640处理，得到sv,其中下图的sub\_1261c是append函数

![](https://attach.52pojie.cn/forum/202101/21/133147hp0mak1kk6gww46k.png)

Sub\_126AC

![](https://attach.52pojie.cn/forum/202101/21/133150l5qnfen555s5z355.png)

![](https://attach.52pojie.cn/forum/202101/21/133154o0bbwehbxhx9imvm.png)

sv顾名思义signVersion，签名版本，通过生成的随机数来控制生成不同的签名算法，故动态调试的时候，固定一种算法分析即可

下面动态调试，选择sv=121这种算法进行逆向分析，v26对应1，v27对应2

ida没办法识别函数，因为此函数被加密过，因此在这个地方下断点，跟着进去就行了

对应sub\_126AC

![](https://attach.52pojie.cn/forum/202101/21/133201z0ywzw38e200s8c5.png)

p识别为函数，f5

![](https://attach.52pojie.cn/forum/202101/21/133203lm2b2wetyqmibwme.png)

更改a5,a6的值

![](https://attach.52pojie.cn/forum/202101/21/133206d4f0q49nq04qkta9.png)

![](https://attach.52pojie.cn/forum/202101/21/133209ua68zi8112znkyv5.png)

更改完毕，固定走case 0这种算法

![](https://attach.52pojie.cn/forum/202101/21/133212koxizshxindb6c87.png)

主要加密函数是unk\_D0257AF4，v9应该是一个加密的对象

![](https://attach.52pojie.cn/forum/202101/21/133214adrpdgxd6xzhgkdd.png)

V4应该是该版本加密算法对应的随机因子，也就是密钥

![](https://attach.52pojie.cn/forum/202101/21/133217exieblyf1ncw558i.png)

V7对应明文，v6为1，v7是明文长度

![](https://attach.52pojie.cn/forum/202101/21/133220eg7mfgmj1m7smgfm.png)

![](https://attach.52pojie.cn/forum/202101/21/133223lrn8yrgsfbnnbb8y.png)

D0257AF4

![](https://attach.52pojie.cn/forum/202101/21/133226sg1eeeegh2e1bds1.png)

![](https://attach.52pojie.cn/forum/202101/21/133228z8nnj2bct292989y.png)

![](https://attach.52pojie.cn/forum/202101/21/133231jheoegv2vvz2oo7v.png)

unk\_D02565AC

![](https://attach.52pojie.cn/forum/202101/21/133234b2mc414li2h0lzc4.png)

剩下的就是翻译算法过来，自动生成url

![](https://attach.52pojie.cn/forum/202101/21/133237otvppmftpy2tf1yi.png)

成功响应，说明计算没问题

![](https://attach.52pojie.cn/forum/202101/21/133241e9koozq4ny22kfzy.png)

此算法的难度就在翻译sub\_D02565AC算法，只要能翻译过来，基本上也没别的问题了，so层代码可读性还是很高的
