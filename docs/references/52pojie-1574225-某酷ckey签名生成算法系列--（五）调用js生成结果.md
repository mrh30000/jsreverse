# 某酷ckey签名生成算法系列-（五）调用js生成结果

> **作者**: 漁滒 | **发布时间**: 2022-01-10 22:03:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6750 / 36
> **原文**: [https://www.52pojie.cn/thread-1574225-1-1.html](https://www.52pojie.cn/thread-1574225-1-1.html)

---

@[TOC](https://www.52pojie.cn/%E6%9F%90%E9%85%B7ckey%E7%AD%BE%E5%90%8D%E7%94%9F%E6%88%90%E7%AE%97%E6%B3%95%E7%B3%BB%E5%88%97--%EF%BC%88%E4%BA%94%EF%BC%89%E8%B0%83%E7%94%A8js%E7%94%9F%E6%88%90%E7%BB%93%E6%9E%9C)

通过替换本地js后，继续在第一篇里面说到的this.uabModule处下一个断点。这次我们跟入到 this.uabModule.getUA 这个函数内部

![](https://attach.52pojie.cn/forum/202410/11/173038nyeuejoo7yoia5oo.png)

发现是调用【e(1, o)】得到的结果，o就是传入的参数，这里是undefined，那么参数都清楚了，看看函数内部做了什么

![](https://attach.52pojie.cn/forum/202410/11/173040ldd0dojtltjapo50.png)

整个函数非常非常之长，里面实际包含了多个函数，主要是通过第一个参数的数值，来判断具体执行的是哪一个函数。因为已经去除了控制流，现在就是繁琐的从上往下一步一步的分析数值是怎么来的了。

在调试过程中可以发现，里面检测了非常多的设备信息。包括但不限于各种鼠标和触摸事件、dom和bom属性和方法、插件和画布等等。所有信息序列化，拼接在一起，最后才得出这个【140#.......】的ckey

因为调试过程非常繁琐，就不多叙述，下图的大致的计算流程

![](https://attach.52pojie.cn/forum/202410/11/173042zseyverl7rjhe771.png)

分析完成后，尝试使用node调用来生成这个ckey

![](https://attach.52pojie.cn/forum/202410/11/173044fzq00a10eiytz51g.png)

经历了多少错误，重新分析后，终于出来了，放入到某酷的接口中请求，可以正常返回数据，说明算法没有问题了。尝试移植到其他地方使用，依然是没有问题的，整个分析算是完结了，整个反混淆加分析用了大概一月的时间。

![](https://attach.52pojie.cn/forum/202410/11/173046hl400xzhwqhwhl2n.png)
