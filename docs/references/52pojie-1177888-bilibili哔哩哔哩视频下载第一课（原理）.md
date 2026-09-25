# bilibili哔哩哔哩视频下载第一课（原理）

> **作者**: 天域至尊 | **发布时间**: 2020-05-13 05:01:00 | **版块**: 『编程语言区』 | **查看/回复**: 13587 / 74
> **原文**: [https://www.52pojie.cn/thread-1177888-1-1.html](https://www.52pojie.cn/thread-1177888-1-1.html)

---

*本帖最后由 天域至尊 于 2020-5-13 10:06 编辑*

**本文仅限技术讨论，请尊重版权，违规窃取视频者，可能承担法律责任！**

本文技术实现需要Xdown下载器。

首先，本文参考了另外一篇文章：<https://www.52pojie.cn/thread-1171367-1-1.html>
楼主发布了一个工具，我看能下载480P的，然后激发了我无尽的兴趣，作为良心小破站，不被搞搞，岂不是说不过去。

我注意到上帖软件会抛出一个下载链接，以美女UP主 兔总裁S 的视频为例：
视频链接：<https://www.bilibili.com/video/BV1Yk4y1r7jM>
使用软件解析出的Xdown下载命令：

[Bash shell] *纯文本查看*

```
https://cn-hbsjz2-cmcc-bcache-09.bilivideo.com/upgcxcode/86/12/185221286/185221286-1-32.flv?e=ig8euxZM2rNcNbh17WdVhoMzhWUVhwdEto8g5X10ugNcXBlqNxHxNEVE5XREto8KqJZHUa6m5J0SqE85tZvEuENvNo8g2ENvNo8i8o859r1qXg8xNEVE5XREto8GuFGv2U7SuxI72X6fTr859r1qXg8gNEVE5XREto8z5JZC2X2gkX5L5F1eTX1jkXlsTXHeux_f2o859IB_&uipk=5&nbs=1&deadline=1589323216&gen=playurl&os=bcache&oi=2029264455&trid=6b4a3b9180e44b3f8d75374c8f7d74e7u&platform=pc&upsig=c30afd0fffeeff5a9a38940bea3de387&uparams=e,uipk,nbs,deadline,gen,os,oi,trid,platform&mid=0&logo=80000000
--out "横屏.flv"
--header "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"
--header "Referer:[url=https://www.bilibili.com]https://www.bilibili.com[/url]"
```

可以看到，仅仅是在一个链接上增加了header。我测试了下，能下载480P的。
那么，链接是怎么来的？我是不是有了链接就能下载4K的了？（这个视频有4K）
我持怀疑态度，刷新了下页面，F12抓包看。

![](https://attach.52pojie.cn/forum/202005/13/044817se6nkuqqkcutpib6.png)

通过不断回溯，我怀疑这个包最可疑，复制响应，到记事本查看。

搜索关键字4K，找到链接：

![](https://attach.52pojie.cn/forum/202005/13/045041ud8wgws9z1zmm9mb.png)

标记的部分，就是4K链接。
手动构建下载命令

[Bash shell] *纯文本查看*

```
http://cn-lnsy-cmcc-v-04.bilivideo.com/upgcxcode/86/12/185221286/185221286-1-30080.m4s?expires=1589321400&platform=pc&ssig=NAiLBU6O3urPKPLcO2PHdg&oi=2029264455&trid=edec3b471a49448ab2865db8e6a180fau&nfc=1&nfb=maPYqpoel5MI3qOUX6YpRA==&mid=87067778&logo=80000000
--out "兔总裁.flv"
--header "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"
--header "Referer:[url=https://www.bilibili.com]https://www.bilibili.com[/url]"
```

下载好了

![](https://attach.52pojie.cn/forum/202005/13/045209rjctq02jzqwlw2jz.png)

打开观赏：

![](https://attach.52pojie.cn/forum/202005/13/045316nsfoz9koekokhxlg.png)

果不其然，我在想桃子。分辨率是1080的，不是4K的。

我充值了大会员，再来测试，重复以上操作，获取4K链接：

![](https://attach.52pojie.cn/forum/202005/13/045522cwcejem0tqt5w0wq.png)

构建下载链接：

[Bash shell] *纯文本查看*

```
https://cn-hbsjz2-cmcc-bcache-12.bilivideo.com/upgcxcode/86/12/185221286/185221286-1-30120.m4s?e=ig8euxZM2rNcNbdlhoNvNC8BqJIzNbfqXBvEqxTEto8BTrNvN0GvT90W5JZMkX_YN0MvXg8gNEV4NC8xNEV4N03eN0B5tZlqNxTEto8BTrNvNeZVuJ10Kj_g2UB02J0mN0B5tZlqNCNEto8BTrNvNC7MTX502C8f2jmMQJ6mqF2fka1mqx6gqj0eN0B599M=&uipk=5&nbs=1&deadline=1589322657&gen=playurl&os=bcache&oi=2029264455&trid=414e763b6f60413bad0d5d03b1622c10u&platform=pc&upsig=1c298db45f33f18c60ad1fc6552ffe0d&uparams=e,uipk,nbs,deadline,gen,os,oi,trid,platform&mid=207809951&logo=80000000
--out "兔总裁2.flv"
--header "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"
--header "Referer:[url=https://www.bilibili.com]https://www.bilibili.com[/url]"
```

下载：

![](https://attach.52pojie.cn/forum/202005/13/045630rysq25u2m2s52427.png)

打开观赏：

![](https://attach.52pojie.cn/forum/202005/13/045742iltgtg6bmtr83wsp.png)

成功，下一步，就是实现自动化脚本进行下载。
对了，给你们解释下下载链接的内容

![](https://attach.52pojie.cn/forum/202005/13/050100j2o62ta2x5wt9au2.png)

不要干坏事！

**下载视频没有声音，非常感谢大佬发现这个问题，并且给出了解决方案。因为我是半夜干的，没开声音，就没发现问题，我下一课详细讲解大佬给出的解决方案。**
