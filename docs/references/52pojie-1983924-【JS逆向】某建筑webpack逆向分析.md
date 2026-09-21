# 【JS逆向】某建筑webpack逆向分析

> **作者**: littlewhite11 | **发布时间**: 2024-11-20 20:44:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4819 / 44
> **原文**: [https://www.52pojie.cn/thread-1983924-1-1.html](https://www.52pojie.cn/thread-1983924-1-1.html)

---

*本帖最后由 littlewhite11 于 2025-3-10 07:36 编辑*

## 逆向目标

* 网址：`aHR0cHM6Ly9qenNjLm1vaHVyZC5nb3YuY24vZGF0YS9jb21wYW55`
* 目标：响应数据解密

## 抓包分析

随便翻个页，会发起一个请求，可以看到响应是加密的。

![](https://attach.52pojie.cn/forum/202411/20/203534ksi18z8g4fcsf617.png)

## 逆向分析

既然已经知道是响应加密了，那就直接开始逆向。点开启动器，按照经验（1.响应加密，2.xhr请求），那就先去响应拦截器搂一眼，一般是从`xxx.request`点进去即可。

![](https://attach.52pojie.cn/forum/202411/20/203536tx0ggcgnwakfwaak.png)

下断，翻页，成功断住，一气呵成。

![](https://attach.52pojie.cn/forum/202411/20/203538x9d666lefjhjfds4.png)

然后我们就需要找响应拦截器，其实逐个点进去看看都可以的，本案例就在下图箭头的地方，直接进去。

![](https://attach.52pojie.cn/forum/202411/20/203540tjq0b2ubqirqviqq.png)

`xxx.interceptors.response.use`这就是响应拦截器的一个标志，那`t.data`应该就是密文，`b`应该就是解密函数。

![](https://attach.52pojie.cn/forum/202411/20/203542f8766k0njx00k4xt.png)

直接下断，成功断住。

![](https://attach.52pojie.cn/forum/202411/20/203544tev5phmeqvvpvjvf.png)

然后我们直接单步进去`b`函数，经常玩逆向的朋友其实到这就已经秒了，这不一眼AES嘛。

![](https://attach.52pojie.cn/forum/202411/20/203547tbbrblfott5dl76z.png)

确实如此，其实逆向到这，拿到`key`，拿到`iv`，就可以找个加解密网站看是不是标准的AES了，经验证，算法没有被魔改。

![](https://attach.52pojie.cn/forum/202411/20/203550d972379sy7ypvpyz.png)

但是！！！我们这篇文章的主题是webpack，我们就不按套路出牌，否则以后遇到webpack，加解密算法不明显的时候，该不会抠还是不会抠。

经常搞webpack的朋友都清楚，代码该怎么抠，无非就是找加载器，补齐缺失的模块，导出关键函数，最后进行加解密。

我们先分析一下代码逻辑，在解密的时候主要用到了`d`对象，而`d`又是`n.n(u)`，很显然第一个`n`就是加载器，因为前面很多对象都通过`n(xxx)`赋值，而`xxx`就是模块名称。

![](https://attach.52pojie.cn/forum/202411/20/203553aiqvv5dlhn46vv55.png)

加载器找到了，可以在`u = n("3452")`中下断，因为`d`的赋值用到了`u`，然后刷新页面，进去加载器，发现加载器实际是函数`s`。

![](https://attach.52pojie.cn/forum/202411/20/203555yoauxrpy1ry4shim.png)

然后我们把加载器拿下来（箭头所指部分），注意，先不要拿模块，模块就是这个自执行函数传入的大对象，我们先传空。

![](https://attach.52pojie.cn/forum/202411/20/203557m9z733ff9ytfffb9.png)

代码拿下来之后，回到加载器中分析一下逻辑，`e`为模块名，`a`为存储模块的地方，先判断有没有，有的话直接返回，没有的话就走后面的逻辑，去`t`对象里面拿，而`t`就是自执行函数的传参，包含了所有模块。

所以，我们抠模块的时候，直接从`t`对象拿就行。

![](https://attach.52pojie.cn/forum/202411/20/203559fz383kdfrczkzc4k.png)

下面有两种选择：

* 运行代码，缺哪个模块补哪个，直到成功解密
* 半自动抠webpack

我选第二种，那么怎么半自动抠模块呢，首先我们要清楚需要构造一个怎样的字符串，才适合我们的加载器调用。

> {"模块名": 模块函数, ...}，这应该没有异议吧。或者你构造成数组也没问题，不过数组是怎么调用的，要自己去看看webpack的相关知识了。

那我就直接将字符串挂到window上了，下面是流程：

> 1. 回到`u = n("3452")`断点，刷新页面，重新断住
> 2. 将字符串挂载到window上，window.module\_str = '{'
> 3. 在加载器的`if (a[e])`处下条件断点，，`` window.module_str += `"${e}":${t[e].toString()},`,false ``
> 4. 在目标对象后面下断（可以在这`p = n("5c96")`），确保成功加载了`d`对象
> 5. 将断点跳到`p = n("5c96")`处
> 6. 执行`window.module_str += '}'`
> 7. 执行`copy(window.module_str)`
> 8. 将自执行函数的空对象换成我们复制的对象

OK，到这里，我们就成功把加载器和解密相关的模块都抠下来了，接下来就是导出我们需要的东西。

我就直接在自执行函数最后将加载器挂到window（global）上了。 剩下的就是网页上怎么解密的，我们就怎么解密就行了。

![](https://attach.52pojie.cn/forum/202411/20/203601z46a4bw1yqdq3dz1.png)

解密结果：

![](https://attach.52pojie.cn/forum/202411/20/203604schjudhg62gdauue.png)

成功！！！
