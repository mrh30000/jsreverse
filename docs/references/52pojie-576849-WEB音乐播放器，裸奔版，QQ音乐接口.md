# WEB音乐播放器，裸奔版，QQ音乐接口

> **作者**: Amyas | **发布时间**: 2017-01-27 21:53:00 | **版块**: 『编程语言区』 | **查看/回复**: 13311 / 34
> **原文**: [https://www.52pojie.cn/thread-576849-1-1.html](https://www.52pojie.cn/thread-576849-1-1.html)

---

我在某培训机构学JS，趁过年回家利用点时间，写个播放器，当毕业作品之一，但是距离完整还有很遥远的距离，发个帖子分享下api，也希望高手指正。

用到的技术：
1、抓包（找接口，用了差不多一天一夜学会一点，至少能找QQ音乐的了）

歌曲列表：url: "https://c.y.qq.com/soso/fcgi-bin/search\_cp?remoteplace=txt.yqq.center&searchid=37159670560306796&t=0&aggr=1&cr=1&catZhida=1&lossless=0&flag\_qc=0&p=1&n=100&w="+歌手/歌曲+"&g\_tk=5381&jsonpCallback=searchCallbacksong1291&loginUin=0&hostUin=0&format=jsonp&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0",

歌曲信息：url: "https://c.y.qq.com/v8/fcg-bin/fcg\_play\_single\_song.fcg?songmid="+歌曲MID+"&tpl=yqq\_song\_detail&format=jsonp&callback=getOneSongInfoCallback&g\_tk=5381&jsonpCallback=getOneSongInfoCallback&loginUin=0&hostUin=0&format=jsonp&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0",

歌词：url = "https://c.y.qq.com/lyric/fcgi-bin/fcg\_query\_lyric.fcg?nobase64=1&musicid=歌曲ID&callback=jsonp1&g\_tk=5381&jsonpCallback=jsonp&loginUin=0&hostUin=0&format=jsonp1&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0";
(需要设置请求头Referer)

2、ajax（调数据，用了一天学会大概怎么用了）

3、php（伪造Referer，得到歌词的数据，PHP学到PHP连接MySQL了，这个伪造我弄了一天一夜才搞明白一点怎么用）

下一步学习正则表达式，要不然回调的数据有点不好处理。

目前的用法：

![](https://attach.52pojie.cn/forum/201701/27/214436qzs9hsjj9sqtdf55.png)

1、输入歌名/歌手名
2、点击音乐列表

![](https://attach.52pojie.cn/forum/201701/27/214623qd85688j28nunz5d.png)

3、选中songmid
4、放到输入框中，点歌曲

![](https://attach.52pojie.cn/forum/201701/27/214752dq4xuuee9uzr3oho.png)

5、选中url放到输入框中
6、点播放

（在本地运行歌词不会显示，在服务器上就可以，目前我还不知道怎么不用php也可以设置请求头）

什么限制也没加，学知识点用的时间比较长一点，写加解决问题用了小半天

希望大家指正我的不足，就喜欢听缺点，多进步进步万一能去百度阿里上班什么的呢哈哈！！

基本上就是遇见坎，就各种搜，各种现学，虽然现在播放器还很low，但是我会一步一步让他强大起来的（初步计划音量拖拽，时间拖拽，歌词拖拽，mv播放，嗯目前就想到这些）！

链接: https://pan.baidu.com/s/1bpvKb87 密码: mmg2
