# [原创] 网洛者 JJEncode加密 - 初体验 逆向分析

> **作者**: ZenoMiao | **发布时间**: 2025-06-10 21:51:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2792 / 3
> **原文**: [https://www.52pojie.cn/thread-2037870-1-1.html](https://www.52pojie.cn/thread-2037870-1-1.html)

---

*本帖最后由 ZenoMiao 于 2025-6-10 21:54 编辑*

本次逆向题目为aHR0cHM6Ly93YW5nbHVvemhlLmNvbS9jaGFsbGVuZ2UvMg==

![](https://attach.52pojie.cn/forum/202506/10/213947vx9wdwtw4q0i24iq.png)

打开网站 开启F12抓包, 发现请求是h2 和请求参数\_signature为加密参数

![](https://attach.52pojie.cn/forum/202506/10/213058bs72ipo1lpspo7ia.png)

全局搜\_signature发现加密函数入口, 先打个断点 再翻页单步进去看一看啥情况

![](https://attach.52pojie.cn/forum/202506/10/213142knhzzoh6u4uhns61.png)

好家伙, 果然是JJEncode, 一大堆看不懂的东西, 怎么办  怎么处理???

![](https://attach.52pojie.cn/forum/202506/10/213252vvk1ol31rho1kvh3.png)

既然看不懂那就不用看懂, 把他变成能看懂的代码就好了, JJEncode处理方法很简单. 把他所有代码复制下来, 把最后的一对括号删了, 然后在console那黏贴运行一下就好了. 这下能看懂了吧?

![](https://attach.52pojie.cn/forum/202506/10/213728kgqj25vq359aarvj.png)

![](https://attach.52pojie.cn/forum/202506/10/213801joe4o2jo6nxbhmh2.png)

上面都已经说了时候魔改的SHA1, 这个是练习的网站, 应该也没啥必要骗你, 所以直接扣下来吧, 也懒得试是否标准算法了
扣下来之后吧他的第一个function给去了, 然后sign就不赋值了  直接console出来

![](https://attach.52pojie.cn/forum/202506/10/214918vlll9lcajkelcll4.png)

python调用就直接用node来调用, 关键代码如下

[Python] *纯文本查看*

```
        _signature = subprocess.Popen("node 2.JJEncode加密-初体验 ", encoding="utf-8", stdout=subprocess.PIPE)
        _signature = _signature.stdout.read().replace('\n', '')
```

打完收工, 关键代码已经有了 其他代码没有难度自己撸吧

![](https://attach.52pojie.cn/forum/202506/10/215048r4y7wrpyyfrxgctp.png)
