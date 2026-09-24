# 小程序《胡莱三国》-websocket分析

> **作者**: wjmtgg | **发布时间**: 2020-04-06 20:49:00 | **版块**: 『移动安全区』 | **查看/回复**: 21516 / 56
> **原文**: [https://www.52pojie.cn/thread-1150098-1-1.html](https://www.52pojie.cn/thread-1150098-1-1.html)

---

*本帖最后由 wjmtgg 于 2020-4-6 20:49 编辑*

最近玩小程序《胡莱三国》
抓包看到是websocket传输数据的
遂分析之。

![](https://attach.52pojie.cn/forum/202004/06/202654c0v6m1v1um0dvrrf.jpg)

![](https://attach.52pojie.cn/forum/202004/06/202659lu53uvmruf9299f7.jpg)

![](https://attach.52pojie.cn/forum/202004/06/202826rzbnoou7oxwaatsq.jpg)

可以看到数据并不是我们熟知的json格式。
遂反编译之。

![](https://attach.52pojie.cn/forum/202004/06/203059uzq50h568o8tztf8.png)

找到这么一段解密的函数。

MessagePack百度搜索
发现有它对各种语言的支持：c、java、ruby、python、php...

于是用了py版的  pip install msgpack
import msgpack
加密就是 msgpack.loads()
解密是  msgpack.dumps()
遂带入数据尝试之
确实可以解密
发送的数据直接msgpack.dumps(xxx) 就好
而接受的数据需要先去掉前面的mask

利用py抓包改包mitmproxy

![](https://attach.52pojie.cn/forum/202004/06/204104aa8o0nmpophnmdmm.png)

就可以实时显示数据啦

![](https://attach.52pojie.cn/forum/202004/06/204658tdir33r1wkdijk3n.jpg)

如上图所示。

最后！关于改包改数据。
发送的数据全是你的操作代码，不附带任何数据。
所有的数据计算及保存都在服务器上，根据你的动作修改的。
