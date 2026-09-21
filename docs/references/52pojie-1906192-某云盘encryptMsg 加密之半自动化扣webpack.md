# 某云盘encryptMsg 加密之半自动化扣webpack

> **作者**: hybpjx | **发布时间**: 2024-03-26 16:12:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4916 / 22
> **原文**: [https://www.52pojie.cn/thread-1906192-1-1.html](https://www.52pojie.cn/thread-1906192-1-1.html)

---

## 前言

本文主要介绍了webpack半自动化扣代码的流程。不需要ast基础。也不涉及加密的过程。网站硬扣的话很麻烦。特地挑一个模块多的网站去搞。着重介绍于webpack工具的使用与实现方式。

这里的话。本人也开源到了github上了。本人代码写的烂。大佬勿喷，

> <https://github.com/hybpjx/semi_auto_webpack>

## 目标网站

> aHR0cHM6Ly95dW4uMTM5LmNvbS93LyMv

## webpack是什么？

Webpack是一个用于构建现代 Web 应用程序的静态模块打包工具。它是一个高度可配置的工具，通过将应用程序的所有资源（例如JavaScript、CSS、图片等）视为模块，并使用依赖关系来管理它们之间的引用，将它们打包成一个或多个最终的静态资源文件。

其实我们做爬虫只需要知道。

webpack就是把所有的代码 打包成一个JS去运行。其中包含了加密解密的JS。然后你通过加载器去调用其中的模块去获取加密代码。

## 网站分析

这里就不多说了。直接开搞

如下图 encryptMsg 就是我们本文的目标。

![](https://s2.loli.net/2024/03/26/tHmX86PjOpaN5vu.png)

然后直接搜索就行。找到加密位置。

![](https://s2.loli.net/2024/03/26/mQfPApF2BezEHky.png)

![](https://s2.loli.net/2024/03/26/KM5ycR6kNe2xDHj.png)

这里其实点进去就能知道什么加密 好像也没有经过别的加密。

直接写算法就行。

但是本文目标是实现webpack自动化。这里我们选择强扣。

本文重点不是逆向这个网站。只能说

直接从上一个栈找。

好了 找到了这个地方。

![](https://s2.loli.net/2024/03/26/zjYVcUpa3xEtPAo.png)

然后我们把s扣下来就行。

这里往上滑。可以看到 加载器只加载了 `4f52`这个函数。

那就简单了。我们封装一下

```
s = func_call("4f52")
a = {
    "account": "17772231096",
    "dycPwd": "123213213",
    "type": 1,
    "autoLogin": true,
    "ifOpenAccount": "1",
    "verType": 2
}
console.log(s["a"].loginDataPrecode(a))
```

## 编写工具

这里如果要硬扣的话会很麻烦。

这里我主要呢。实现了以下几个步骤

1. 将整体文件分成三个部分
   1. 模块列表
   2. 加载器列表
   3. 运行文件
2. 运行文件 运行加载器列表 加载器列表 运行模块列表
3. 然后运行我们的业务代码。
4. 然后根据重写的加载器 获取到所有有用的模块列表
5. 遍历模块列表。写入键和值
6. 重新进行封装 然后写入。
7. 完成加密。然后运行代码

这里值得注意的是我们需要重写加载器的这个部分。

需要手动找到如下部分代码

![](https://s2.loli.net/2024/03/26/HjIQZSBe631KAdX.png)

如上图 在调度函数的开始加上如上代码。e为传参值。

```
if (!modules_list.includes(e)) {
                modules_list.push(e)
}
```

其他正常使用即可。

当然 本工具尚还不成熟。就是本人瞎写着玩的。

写的也很仓促。就随便封装了一下。

之前看了一个视频里 用了 我就想自己能不能写一个。

大家有兴趣的可以github 点个stars。

> [hybpjx/semi\_auto\_webpack: v1版本 (github.com)](https://github.com/hybpjx/semi_auto_webpack)
