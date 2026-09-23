# [python] 逆向破译JS，爬取政府网站。

> **作者**: hj170520 | **发布时间**: 2021-07-17 18:07:00 | **版块**: 『编程语言区』 | **查看/回复**: 1046 / 13
> **原文**: [https://www.52pojie.cn/thread-1477604-1-1.html](https://www.52pojie.cn/thread-1477604-1-1.html)

---

*本帖最后由 hj170520 于 2021-7-23 07:01 编辑*

我之前也提问过不少爬取政府网站的问题。

然而，我们今天要讲的这位受害者的数据无法单纯地从网站上直接获取，需要逆向JS。

感谢[@QingYi.](https://www.52pojie.cn/home.php?mod=space&uid=1449385) 之前发表的一些帖子，给了我很大的启发和帮助。今天我也小试牛刀。

上网址：aHR0cDovL2p6c2MubW9odXJkLmdvdi5jbi9kYXRhL2NvbXBhbnk=

首先打开这个网址，我们的目标就是获取图中表格中的数据。

![](https://attach.52pojie.cn/forum/202107/23/070029crciy3tr717ar7yl.png)

然后，我们打开开发者工具，搜索相关数据。

![](https://attach.52pojie.cn/forum/202107/17/174909bndg878338z8nug5.png)

显然，没有找到任何的文件包含我们想要的内容。
那么，我们打开“下一页”看看哪个文件发生了变化。

![](https://attach.52pojie.cn/forum/202107/17/175226qfkycksr49kkr8r9.png)

可以看到我们返回的数值，是一串数字。这很有可能是加过密的。
然后，我们先凭直觉在搜索框里搜索 ：Json.Parse

![](https://attach.52pojie.cn/forum/202107/17/175404ahh2s8ctepnyr0ar.png)

我们发现有3个JS文件里有这种语法。
那么我们先一个个来，现针对第一个来尝试。首先我们找到Json.Parse对应的地方进行断点。

![](https://attach.52pojie.cn/forum/202107/17/175724e8vz5inbjfb28ns2.png)

我们发现，t数值应该就是我们之前那个返回的一串待解密的数据。这说明胜利离我们不远了。
通过分析这段语法，我们发现t数值是经过h函数进行转换的。我们点进去看看。

![](https://attach.52pojie.cn/forum/202107/17/180433pqrqahdad8dkud5t.png)

果然，经过对h函数进行断点debug，我们看到了这个返回出来我们想要的数值。
JS逆向解析到这里就大功告成了。

后续的提取相应的JS代码，通过nodejs模块进行解密就行。
由于涉及到政府网站的信息，本着学习交流的态度，所以就不放源码了。望理解。![](https://static.52pojie.cn/static/image/smiley/laohu/laohu23.gif)
