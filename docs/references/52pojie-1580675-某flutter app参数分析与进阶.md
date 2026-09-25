# 某flutter app参数分析与进阶

> **作者**: darbra | **发布时间**: 2022-01-25 17:27:00 | **版块**: 『移动安全区』 | **查看/回复**: 7295 / 25
> **原文**: [https://www.52pojie.cn/thread-1580675-1-1.html](https://www.52pojie.cn/thread-1580675-1-1.html)

---

抓包体验

![](https://attach.52pojie.cn/forum/202201/25/171630fahggxdhigh9f5w9.png)

我们发现参数“api-sign”服务端是校验的，尝试分析

分析
各种尝试均无功而返，查看lib，发现有libflutter.so

![](https://attach.52pojie.cn/forum/202201/25/171613ohmscmmgz3h2sggg.png)

这次推荐的神器闪亮登场--->>>>
https://github.com/rscloura/Doldrums

我们搜索下哪个so里有md5

![](https://attach.52pojie.cn/forum/202201/25/171653p99l4ga99v4ddasq.png)

按照指令 python3 main.py libapp.so output

感受下output

![](https://attach.52pojie.cn/forum/202201/25/171639tgivbxuv999i6zai.png)

我们就在这个output里各种尝试，在搜索update里发现大新闻，

![](https://attach.52pojie.cn/forum/202201/25/171641b0tf1rrrnnjvfcdt.png)

使用frida hook拿到了结果！

![](https://attach.52pojie.cn/forum/202201/25/171644yl5y9oey9u1kycez.png)

我们书写脚本进行测试

![](https://attach.52pojie.cn/forum/202201/25/171724hnq2n0g3q02ntrkp.png)

内容准确。

大家试试看，flutter app的参数说不定无意间hook出来了， 祝好运。
