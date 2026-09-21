# 简单分析下吾爱POST登录MD5密码加密找法

> **作者**: s3233431 | **发布时间**: 2016-09-10 18:00:00 | **版块**: 『编程语言区』 | **查看/回复**: 9016 / 18
> **原文**: [https://www.52pojie.cn/thread-536217-1-1.html](https://www.52pojie.cn/thread-536217-1-1.html)

---

这个东西肯定对于大牛来说简直是简单的不能太简单了，

所以大牛嘴下留情

我们开始第一步抓包：
工具我用的是谷歌内核的浏览器，市面上谷歌内核的打开都一样
F12 打开开发人员工具
Netword 网络然后抓包

发现一个POST包详细看图：

![](https://attach.52pojie.cn/forum/201609/10/175734y8hhkzjp008hzdhe.png)

我相信抓包大家都会啊我就不啰嗦了看第二步：
分析参数
formhash:04ebb833 每个电脑应该不一样在登录的源代码里可以找到固定的
referer:<http://www.52pojie.cn/forum.php>
username:    这个就是账号了
password:   用原密码加密出来的一大长串MD5
questionid:0
answer:
seccodehash:
seccodemodid:
seccodeverify: 验证码
loginsubmit:

其中会变的应该就是这个password了
我们怎么搜索它呢，
在开发人员工具里ctrl+shitf+F 全局寻找 就会找到哪里调用了

![](https://attach.52pojie.cn/forum/201609/10/175736tfjyyw8ds49xnrcx.png)

看图我们可以找到一个 onsubmit  提交事件 里面有一个函数
pwmd5 是不是很眼熟，那么我们就进去看看这个函数是什么内容

看图三~

![](https://attach.52pojie.cn/forum/201609/10/175736pollgmfafl4gvaod.png)

我们看到这个函数我们可以下断跟 在这个函数上左键点一下，然后在点登陆如果对的话就会断下

断下后那么这个就应该是我们需要的函数了ctrl+A全选复制粘贴到记事本

有些朋友肯定会迫不及待的直接丢到E语言或者什么里面试试，心想妈的智障，直接调用不就成了

然而你会发现会说这函数没定义那个函数没定义 会各种提示undefine，或者说你没找到对象，你没对象，活该单身，咳咳咳扯远了

我们来分析下这个函数需要修改的
直接看图：

![](https://attach.52pojie.cn/forum/201609/10/175737j2i6xj25kiixc2km.png)

他代码有判断密码是否为空，为空就直接返回，肯定就白来了
所以删掉第一个判断语句if

然后我们看看第二个判断
哎呀卧槽这么多什么什么鬼arguments是什么啊，
容我百度下，
大概找到的结果是
arguments对象是比较特别的一个对象，实际上是当前函数的一个内置属性
arguments对象的长度是由实参个数而不是形参个数决定的

大概的意思应该是用它来枚举出参数，那么我们参数就一个就是明文密码所以删掉删掉都删掉

然后在这个函数（）中加上一个参数随便一个什么名字只要你开心

最后修改如下，

![](https://attach.52pojie.cn/forum/201609/10/175737hha2zxsjaxbxxpwi.png)

hi呀，终于码完字了，

快给我回点血，手动滑稽
