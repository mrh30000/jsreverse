# [原创]Scrape spa14 wasm加密过程分析

> **作者**: ZenoMiao | **发布时间**: 2025-06-10 17:34:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2468 / 2
> **原文**: [https://www.52pojie.cn/thread-2037819-1-1.html](https://www.52pojie.cn/thread-2037819-1-1.html)

---

本次分析网站为aHR0cHM6Ly9zcGExNC5zY3JhcGUuY2VudGVyL3BhZ2UvMw==

已知本网站加密为wasm实现的

![](https://attach.52pojie.cn/forum/202506/10/165145al0y2ggsgssddz0t.png)

直接打开网站, 然后F12抓包看看哪个是加密参数!!!!  很明显就是sign了

![](https://attach.52pojie.cn/forum/202506/10/165249qbfknfbo5hoyrfro.png)

知道sign是加密参数后  直接全局搜sign: 定位加密位置(如果搜sign不行那就加个冒号 再不行加等号, 此方法在普通网站中挺好用, 但是在一些故意隐藏变量名的就不好使了)

![](https://attach.52pojie.cn/forum/202506/10/170600n98srq497u9d4x9r.png)

找到了加密地点后 发现两个参数n, e. n参数明显是当前页码 - 1 \* 10. 10为固定数
e参数是用wasm加密的, 分别传入了n参数和一个10位数的向上取整的时间戳, 他的源代码为

[JavaScript] *纯文本查看*

```
parseInt(Math.round((new Date).getTime() / 1e3).toString())
```

其实改成这个也一样

[JavaScript] *纯文本查看*

```
Math.round((new Date).getTime() / 1e3).toString()
```

好了分析完了(毕竟wasm代码我也看不懂, 直接调用就算了) 直接开撸
首先先构建n参数

[Python] *纯文本查看*

```

n = (i - 1) * 10
```

然后导入python的wasmer包, 顺便构建instance实例

[Python] *纯文本查看*

```
from wasmer import Instance, Store, engine, Module
from wasmer_compiler_cranelift import Compiler

store = Store(engine.JIT(Compiler))
module = Module(store, open('spa14.wasm', 'rb').read())
instance = Instance(module)
```

然后通过刚才构建的wasm实例来进行参数加密

[Python] *纯文本查看*

```
sign = instance.exports.encrypt(n, math.ceil(time.time()))
```

打完收工! 核心代码都在上面了 , 完整的代码就不贴了, 提高自己动手能力嘛

![](https://attach.52pojie.cn/forum/202506/10/173349bez78ycpexzryhn7.png)
