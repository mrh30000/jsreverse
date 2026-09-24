# 利用Charles和FD巧妙改微信小程序“消灭病毒”无限邀请

> **作者**: 第八个男人 | **发布时间**: 2019-03-11 20:52:00 | **版块**: 『移动安全区』 | **查看/回复**: 39152 / 69
> **原文**: [https://www.52pojie.cn/thread-893603-1-1.html](https://www.52pojie.cn/thread-893603-1-1.html)

---

用到的工具：【Charles】和【Fiddler】没有的朋友站内搜索。不知道软件干嘛用的可以先行退下。
适用的游戏：微信搜索”消灭病毒“（还不是贪玩的朋友一直叨叨要我看看这个游戏）
放在最后说的话挪到了前面：改这个被某宝拿去卖，看销量还不错。真搞不懂一个打飞机的游戏还有这么多人花钱买？
站内的朋友就别效仿了，丢了品格。
![](https://static.52pojie.cn/static/image/hrline/1.gif)
![](https://static.52pojie.cn/static/image/hrline/line1.png)
屁话说完了，来简单的抓包分析。
WiFi改代{过}{滤}理链接到电脑，打开Charles，FD同上。（关于证书，怎么连接，怎么抓HTTPS，请自行百度。）
打开微信小程序：如图：
得到一堆链接，一顿分析，检查了几个get、upload、login（关于其他数据，文末说）

![](https://attach.52pojie.cn/forum/201903/11/203106wssmss17nbrh8spp.png)

找到一个比较容易入手的关键词：invit
检查这个get文件，得出两个邀请数据，我之前邀请的。

![](https://attach.52pojie.cn/forum/201903/11/203500b8nqyg66l0u33vlu.png)

这个json里面除了state参数，别的基本没改头。
来测试修改state参数，尝试修改成：1试试。
把改好的数据额外保存一份，然后本地映射。

![](https://attach.52pojie.cn/forum/201903/11/203810zgqvg6fgfi2wztpp.png)

进入游戏，点开邀请，果不其然，之前领取过的钻石，还可以再领取。
如图：

![](https://attach.52pojie.cn/forum/201903/11/204017q9zamdj11ofec0f1.png)

注意看顶部钻石数量，点领取之后再点开邀请界面。
如图：

![](https://attach.52pojie.cn/forum/201903/11/204759eng15dnj5enl7sls.png)

这里贴出js代码，可自行修改。

[JavaScript] *纯文本查看*

```
{"data":{"infos":[{"nickname":"Harry&#227;&#128;&#130;","sex":1,"state":1,"avatar":"https:\/\/wx.qlogo.cn\/mmopen\/vi_32\/8udden1kRL4giajiaeIWZFQAM30WhUiagZupU8kPmr8HnkOdOJFBB7jLdsCibhjYdNxaEpnfibQaMj090S47tlWg4dA\/132","openid":"oc6rl5U1zIGV9y0beSrZxV1d2eyM","address":"China.Hunan.Changsha"},{"nickname":"","sex":0,"state":1,"avatar":"","openid":"oc6rl5aB7-J2z2_h8IykEtHl_leY","address":""}]},"code":0}
```

以上测试得知state参数为1的时候，是可以领取。为2的时候，是已领取。通过修改参数可以无限制的领取钻石。
（上面邀请人数，可以自己增加。看代码格式添加即可。提示：openid可以重复，修改nickname参数即可。）

![](https://static.52pojie.cn/static/image/hrline/1.gif)
写在最后的话，如果你有精力，有能力，得到sign可以修改上面任何数据。
如果你成功了，可以跟帖分享经验。
自行测试吧。思路已经给出。

码字不容易，且看且珍惜。
