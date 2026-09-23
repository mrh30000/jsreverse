# djyyy音乐网站音乐下载地址分析

> **作者**: paxj168 | **发布时间**: 2021-11-08 17:14:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 16127 / 104
> **原文**: [https://www.52pojie.cn/thread-1540379-1-1.html](https://www.52pojie.cn/thread-1540379-1-1.html)

---

哈哈哈，最近刚学爬虫，入门为了练手，跟音乐网站干上了![](https://static.52pojie.cn/static/image/smiley/default/lol.gif)
准备工作：
    1、网站地址：https://www.djyyy.com/
    2、python 3.9
    3、pycharm
    4、360浏览器

一、分析网站源码找音乐地址

![](https://attach.52pojie.cn/forum/202111/08/162317e2dho4w2jkwgaoz7.jpg)

打开地址：https://www.djyyy.com/play/40881.html
调出调试窗口

![](https://attach.52pojie.cn/forum/202111/08/163059w0g0vowwv1j5510t.jpg)

发现音乐地址：

[HTML] *纯文本查看*

```
https://dj.djyyy.com:446/myxc/2019/11/29/%E5%A4%9C%E5%9C%BA%E5%8C%85%E6%88%BF%E7%A5%9E%E4%BB%99%E6%B0%B4%E5%A5%B6%E8%8C%B6%E9%A3%98%E9%A3%98%E4%B8%8A%E5%A4%B4%E4%B8%B2%E7%83%A7.2s3e9a1z12.m4a
```

还是很简单嘛，这个网站并没有设反调试什么的，一下子就找到，直接下载就好，感觉没有什么，想着放弃了，在看一下他是怎么来的

![](https://attach.52pojie.cn/forum/202111/08/162838l7sc4447cgds7ht8.jpg)

看一下源代码，是不是把播放地址直接放在源码里面的

![](https://attach.52pojie.cn/forum/202111/08/163730ryg0mm2io0mycvp1.jpg)

发现一个可疑之处

[JavaScript] *纯文本查看*

```
<script type="text/javascript" src="/i/static/cmp/url.php?id=22764"></script>
```

![](https://attach.52pojie.cn/forum/202111/08/163911xz4zvpt67vlljk29.jpg)

居然打不开![](https://static.52pojie.cn/static/image/smiley/default/27.gif)![](https://static.52pojie.cn/static/image/smiley/default/27.gif)![](https://static.52pojie.cn/static/image/smiley/default/27.gif)![](https://static.52pojie.cn/static/image/smiley/default/27.gif)![](https://static.52pojie.cn/static/image/smiley/default/27.gif)

二、再次扑包分析

![](https://attach.52pojie.cn/forum/202111/08/164222hzww2uwequwzwut0.jpg)

果然这个就是我们想要地址，把地址拼起来就可以了

[HTML] *纯文本查看*

```
https://dj.djyyy.com:446
```

三、请求音乐下载地址

![](https://attach.52pojie.cn/forum/202111/08/165108fwo63ugoc2o6ge5e.jpg)

访问不了，难道是cookies有问题，看一下

![](https://attach.52pojie.cn/forum/202111/08/165428hwdoigp3twtooopo.jpg)

PHPSESSID这是什么玩意：度娘了一下

![](https://attach.52pojie.cn/forum/202111/08/165540k116mga9yby19obu.gif)

**Session 的生命周期**Session 在以下情况会被删除，也就是失效：

* Session 超时，超时指的是连续一定时间服务器没有收到该 Session 所对应客户端的请求，并且这个时间超过了服务器设置的 Session 超时的最大时间；
* 程序调用方法主动销毁 Session；
* 服务器关闭或服务停止。

![](https://attach.52pojie.cn/forum/202111/08/165827g0dhgilhiiii0h9i.jpg)

与这个一模一样，那就是说，请求这个页面获取值，然后带上这个值在访问，

![](https://attach.52pojie.cn/forum/202111/08/170510gbpuiilmaytpf84o.jpg)

还是不对，难道我写错了，检测了一下代码，也没有问题呀![](https://static.52pojie.cn/static/image/smiley/default/27.gif)

来路不对，来路不对，来路不对，难道是！！！来路的问题![](https://static.52pojie.cn/static/image/smiley/default/27.gif)

![](https://attach.52pojie.cn/forum/202111/08/170748zbb4tllsw4tbkkrk.jpg)

我在把那个cookies去掉试一下

![](https://attach.52pojie.cn/forum/202111/08/171135n0h3zhhqq722o2h7.jpg)

![](https://static.52pojie.cn/static/image/smiley/default/mad.gif)![](https://static.52pojie.cn/static/image/smiley/default/mad.gif)![](https://static.52pojie.cn/static/image/smiley/default/mad.gif)![](https://static.52pojie.cn/static/image/smiley/default/mad.gif)![](https://static.52pojie.cn/static/image/smiley/default/mad.gif)![](https://static.52pojie.cn/static/image/smiley/default/mad.gif)![](https://static.52pojie.cn/static/image/smiley/default/mad.gif)![](https://static.52pojie.cn/static/image/smiley/default/mad.gif)![](https://static.52pojie.cn/static/image/smiley/default/mad.gif)![](https://static.52pojie.cn/static/image/smiley/default/mad.gif):wwqwq:wwqwq:wwqwq:wwqwq自己把自己蠢哭了,有没有跟我一样的人，绕了这么一个大圈圈，来路:wwqwq来路:wwqwq来路人家都提醒我了:wwqwq
