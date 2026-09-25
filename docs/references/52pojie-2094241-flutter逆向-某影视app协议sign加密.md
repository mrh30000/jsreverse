# flutter逆向-某影视app协议sign加密

> **作者**: K23 | **发布时间**: 2026-03-03 16:55:00 | **版块**: 『移动安全区』 | **查看/回复**: 2249 / 14
> **原文**: [https://www.52pojie.cn/thread-2094241-1-1.html](https://www.52pojie.cn/thread-2094241-1-1.html)

---

*本帖最后由 K23 于 2026-3-3 17:41 编辑*

为公司业务目标，具体软件名就不发了

从谷歌商店下载完app，提取apk

![](https://attach.52pojie.cn/forum/202603/03/174050qog2gkmgrdipgtdo.png)

习惯性的拿了base.apk  （这里有坑，后面说）

抓包拿到curl，解析为python代码，发现目标

![](https://attach.52pojie.cn/forum/202603/03/173750x9i2gngixgkwpoqv.png)

丢入jadx一番搜索后无果，没有具体的业务代码

![](https://attach.52pojie.cn/forum/202603/03/173344brtcun55c3bjnac1.png)

毫无疑问，看so，解压打开   发现kotlin  ！！！

![](https://attach.52pojie.cn/forum/202603/03/173402nra4zj2orf012dfu.png)

不是，我lib文件夹呐？我so文件呐？一个都没有（天塌了！:'(weeqw）

![](https://attach.52pojie.cn/forum/202603/03/173426evxwftwgnonn18cw.png)

几经周转，了解到了谷歌商店的分包 split apk ，就是需要什么下载什么，原来之前其他的apk都是有用的：

base.apk          → 核心代码、资源
split\_config.arm64\_v8a.apk  → 只含 arm64 的 so
split\_config.armeabi\_v7a.apk → 只含 arm 的 so
split\_config.en.apk          → 英文资源
split\_config.xxhdpi.apk      → 对应分辨率资源

然后提取arm64\_v8a.apk  解压打开，成功拿到so文件

![](https://attach.52pojie.cn/forum/202603/03/173500diimgbzjswz0ijpu.png)

对于flutter的反编译参考正己大佬的帖子{:1\_919:}

选择使用blutter.py 进行反编译，输出了如下文件夹还有一些文件

![](https://attach.52pojie.cn/forum/202603/03/173524lbjz5bygm6uuv1vz.png)

进入asm文件夹，里面是输出的dart源码，一股脑的搜搜，终于发现关键

![](https://attach.52pojie.cn/forum/202603/03/173547gik1707extuzxejx.png)

向上找开始的位置，找到函数名和地址，无疑就是这个了

![](https://attach.52pojie.cn/forum/202603/03/173558z4xfw3pvwjvf3ct1.png)

  ida启动！打开libapp       使用生成的ida脚本解析 so文件

![](https://attach.52pojie.cn/forum/202603/03/173624xl6g5gnn5l0g50g5.png)

![](https://attach.52pojie.cn/forum/202603/03/173609v0hy1shk22l4yr57.png)

![](https://attach.52pojie.cn/forum/202603/03/173638s64wk3nrprccqih3.png)

等待解析完毕就能看见函数名了（直接使用偏移，好像也不影响）

随便找一找，RSA！！！后面就简单了，hook追踪拿秘钥就行了

![](https://attach.52pojie.cn/forum/202603/03/173647iyk1qoock5y66c16.png)

![](https://attach.52pojie.cn/forum/202603/03/173656rg368b1bbnbbgxq1.png)

![](https://attach.52pojie.cn/forum/202603/03/173710tagmg5a0a31m835g.png)

响应成功就很棒{:1\_927:}

第一次发帖，图片排版不明白，有点乱{:1\_909:}
