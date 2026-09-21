# steam hcaptcha 一些环境监测点分享

> **作者**: zsmz | **发布时间**: 2025-11-23 06:12:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3114 / 10
> **原文**: [https://www.52pojie.cn/thread-2074942-1-1.html](https://www.52pojie.cn/thread-2074942-1-1.html)

---

本篇文章适合于对于hcaptcha流程稍微熟悉一些的朋友看

\*\*\*hcaptcha整体思路就是不断进行对照试验，然后不断查漏补缺\*\*\*

1.前置操作
a.CSP不能全删，只能删除最后script验证，也就是<meta http-equiv="Content-Security-Policy" content="object-src 'none'; base-uri 'self'; worker-src blob:;">这两个不能删。带有integrity的地方通通删掉。

b.hcaptcha的wasm会有两次调用，第一次是初始化，第二次是用来生成加密，经过测试，初始化可以不要，这样也可以减少一半的日志量，方便你看日志对照环境。

c.vm\_data以及motionData可以先复制浏览器的写死，注意\\的问题

![](https://attach.52pojie.cn/forum/202511/23/040954hh707o5ucchh3csb.png)

d.上述abc三项完成后，复制浏览器的指纹数组，node中给写死/不写死。如果写死能过，不写死过不了才能说明是你环境数组的问题。

2.一些环境检测点详解
2.1 Math精度
可以通过搜索Math.E或者Math.PI快速定位

![](https://attach.52pojie.cn/forum/202511/23/041223ssjem55iem5pi5fz.png)

可以明显看出浏览器和node，再进行Math计算的时候，会存在微小精度区别（上位浏览器，下为node），[Math['cos'](13 \* Math.E), Math['pow'](Math.PI, -100), Math['sin'](39 \* Math.E), Math['tan'](6 \* Math['LN2'])]

![](https://attach.52pojie.cn/forum/202511/23/041515w9o0as0qoczadd9h.png)

2.2 getImageData
可以简单看看下图流程，简单来说就是
绘制一个canvas标签 ---> 利用clearRect清空画布 ---> 将画布的宽高设为2 ---> 设置画布的填充颜色 ---> 对画布进行填充 ---> 利用getImageData获取画布数据
这里fillStyle的颜色实际是随机的，我这里为了看的清晰些先写死了。这里大家就可以比较清晰的看到，你在补环境的时候，通过getImageData获取data值不能写死，而是要于fillStyle保持一致。

![](https://attach.52pojie.cn/forum/202511/23/042223t3wyvmq3bu3b7m37.png)

类似我下面的写法即可进行动态解析，通过获取fillStyle的值，进行正则匹配获取rgb值，其中255我写死是因为我看a值貌似都是1，这里实际也可以进行动态解析。

![](https://attach.52pojie.cn/forum/202511/23/042703lmhd9nbhgiib838y.png)

2.3 多种字体指纹
所谓字体指纹，实际就是通过设置字体样式，然后获取其宽度高度等数据。

![](https://attach.52pojie.cn/forum/202511/23/043433y8jrrdqoj5oreozj.png)

![](https://attach.52pojie.cn/forum/202511/23/043834ozjdzk8c4bzbd4qc.png)

上图的逻辑实际就是 创建一个画布，通过measureText方法获取上图中的7个值。

![](https://attach.52pojie.cn/forum/202511/23/043933yzfu77qo8ggfon99.png)

![](https://attach.52pojie.cn/forum/202511/23/044113ct63wawhf3x3jalt.png)

此外还利用measureText方法，获取92个emoji图像的数据。

2.4 音频
这里就是通过OfflineAudioContext方法，获取音频数据，通过Math.abs把这两个数组的值进行求和，所以这里可以尝试进行轻微扰动模拟不同设备

![](https://attach.52pojie.cn/forum/202511/23/052120mf1pdkk8g1012b0g.png)

![](https://attach.52pojie.cn/forum/202511/23/052155vu8wxzvbvvdu1xlm.png)

2.5 toDataURL
很常见的toDataURL,一共会获取四次，可以先这样进行写死（不同hsw.js获取顺序好像不同）

![](https://attach.52pojie.cn/forum/202511/23/052843xfcb5syydvsfdwv5.png)

2.6 worker以及SharedWorker
指纹数组里有两个是Worker和SharedWorker获取的，这里也不用去新创建个vm，因为不涉及到上下文的什么东西，所以只要能触发message事件，接收到消息就行。

![](https://attach.52pojie.cn/forum/202511/23/060616egghhfgwkgfkiwzf.png)

![](https://attach.52pojie.cn/forum/202511/23/060644qw7eysqewek17xnt.png)

只要能触发事件，怎么写都行，下图只是我写的一种方法，只要能接收到消息就行，随便怎么写

![](https://attach.52pojie.cn/forum/202511/23/060910i2z2f52v5g22qwnz.png)

2.7 描述符检测
会有一块地方，集中对15个方法获取描述符，这里必须和浏览器一样，需要有点耐心把这里和浏览器对齐

![](https://attach.52pojie.cn/forum/202511/23/055759tsj1sajsbucta24t.png)

得到的结果是类似下面这种，具体逻辑大家到时候自己去看下就行，就几十行。这里算是比较严格一点的地方，要是和浏览器不一致的话，很有可能你就会出图。
[274814465,275514479,274614461,3571143656,274714463,548828914,53814445,71715571391,548728912,275114471,1100657912,274514459,549128932,275514479,274614461]

实际上就是和浏览器指纹数组不断对比就行，没什么神秘的地方，坐得住就能补出来

温馨提示：补得差不多就先去试试能不能过，稍微能过几次再继续补才有动力，不然坐着太无聊了，，，![](https://static.52pojie.cn/static/image/smiley/laohu/laohu10.gif)

![](https://attach.52pojie.cn/forum/202511/23/060245pnr8w44et3tt8eot.png)

希望有大佬补完直接把无敌并发扔我脸上![](https://static.52pojie.cn/static/image/smiley/default/40.gif)
