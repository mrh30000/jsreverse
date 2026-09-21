# cctv视频解密，wasm vmp分析

> **作者**: 漁滒 | **发布时间**: 当前离线 | **版块**: 『脱壳破解区』 | **查看/回复**: 9345 / 170
> **原文**: [https://www.52pojie.cn/thread-2094716-1-1.html](https://www.52pojie.cn/thread-2094716-1-1.html)

---

@[TOC](cctv视频解密，wasm vmp分析)

### 前言

1.本篇文章仅记录大致的分析过程，没有成品

2.参考文献

[ts帧加密案例(一)](https://www.52pojie.cn/thread-1875225-1-1.html)

[ts帧加密案例(二)](https://www.52pojie.cn/thread-1882587-1-1.html)

[cctv视频下载解密](https://www.52pojie.cn/thread-2052017-1-1.html)

[CCTV WEB和客户端.cbox下载解密](https://www.52pojie.cn/thread-1940562-1-1.html)

[WEB前端逆向TS PES NALU解密](https://www.52pojie.cn/thread-1957747-1-1.html)

[某视频站wasm 分析](https://mp.weixin.qq.com/s/aCN84875VEzhNbJB5inbjg)

### js逆向初步分析

目标地址：aHR0cHM6Ly90di5jY3R2LmNvbS8yMDI2LzAyLzA5L1ZJREVMenZvZjhreEhtT1Z5VDhmMUNNYTI2MDIwOS5zaHRtbA==

f12查看请求内容，m3u8地址是来源于【/api/getHttpVideoInfo.do】

请求中只有【pid】参数是必须的，根据 [CCTV WEB和客户端.cbox下载解密](https://www.52pojie.cn/thread-1940562-1-1.html) 中可知，网页播放的是manifest里面的hls_h5e_url ，本次也是分析这里的解密播放

根据大佬 [ts帧加密案例(一)](https://www.52pojie.cn/thread-1875225-1-1.html) 和 [WEB前端逆向TS PES NALU解密](https://www.52pojie.cn/thread-1957747-1-1.html) 的分析，可知ts分片使用的是es层的加密

首先找到js中调用解密的入口

![image](https://attach.52pojie.cn/forum/202603/05/173012xm39uv3r29wxmrw2.jpg)

可以看到js层和之前几乎没差别，还是先提取ts到pes到es，将es放到解密函数中进行解密，继续跟进会进入到wasm的ua函数

![image](https://attach.52pojie.cn/forum/202603/05/173016hanvv7o4nkhjk4na.jpg)

### ida分析

接着就是常规操作，将wasm下载下来，用wasm2c工具转换为o文件，最后丢到ida分析，在ida中查看ua函数

![image](https://attach.52pojie.cn/forum/202603/05/173020hyjemx7kthkloilr.jpg)

这个函数却非常简单，将所有入参放到指定位置后，就只有调用了一个特殊的函数【f50】

为什么说这个是一个特殊的函数呢，随便再打开几个导出函数，发现都是几乎一样的代码，一样的调用这个特殊函数，继续进入到【f50】里面看

![image](https://attach.52pojie.cn/forum/202603/05/173024fmzzbbik9xkzd6bv.jpg)

这个函数非常之大，在553行有一个大循环，并且存在非常多的case，猜测可能是控制流或者vmp

浏览器动态分析后，发现每个case的长度都非常短，并且存在重复运行，那么大概率这里就是一个vmp，而【f50】就是自定义的解释器，接着就是寻找指令码在哪里

分析【f50】可以知道，这个函数是直接从入参的地址开始读取指令码，然后不断执行

那么回到ua函数，入参就是【*a1->w2c_env_d + 519704】，其中d是来自js层导入，eb就是申请了一段长度为682576内存的基址

![image](https://attach.52pojie.cn/forum/202603/05/173028y3wwxr32srlusz1l.jpg)

![image](https://attach.52pojie.cn/forum/202603/05/173033gaai085t75c3qj9c.jpg)

那么519704应该就是真实的函数基址，d就是指令码的基址。既然这样的话，指令码就不是硬编码在wasm，继续在js层找

![image](https://attach.52pojie.cn/forum/202603/05/173037m77w080qqcuswlnz.jpg)

可以看到js有很多段非常长的数组，并以eb为基址写入，将这段内容保存下载，发现长度刚刚好就是682576

### vmp进行反汇编

拿到字节码之后，就可以根据ida里面的每一个case进行反汇编

在我第一次进行反汇编时，重心是在如何还原出一个可读的js代码，但是当代码中的跳转逻辑非常复杂时，对还原出js代码的难度就会大大增加

后来阅读了 [某视频站wasm 分析](https://mp.weixin.qq.com/s/aCN84875VEzhNbJB5inbjg) （需要具体反汇编函数的可以参考这里）则恍然大悟，有时候不一定要还原出js代码，因为这样不单只要处理字节码，甚至还要处理一些运行时的跳转

后来我尝试改写了一套代码，用指令码来生成一种类似于【Intermediate Representation, IR】的中间产物，此时仅需要知道每个指令码做了什么，而不需要关注任何跳转等运行时的东西

例如ua函数的函数基址是519704，那么就直接从519704开始处理，能够得到如下内容，第一个元素是pc指针，第二个元素是指令码所执行的逻辑，第三个元素就是中间产物

```

```

[519712,2,"r21 = -1212248019"]
[519720,2,"r22 = -509605442"]
[519728,2,"r23 = -1346088452"]
[519736,136,"r24 = g7"]
[519740,0,"r18 = r24"]
[519744,136,"r24 = g7"]
[519748,25,"r24 = r24 + 48"]
[519752,137,"g7 = r24"]
[519756,25,"r14 = r18 + 36"]
[519760,25,"r9 = r18 + 32"]
[519764,25,"r11 = r18 + 43"]
[519768,0,"r8 = r18"]
[519772,25,"r6 = r18 + 28"]
[519776,25,"r10 = r18 + 42"]
[519780,25,"r7 = r18 + 24"]
[519784,25,"r12 = r18 + 20"]
[519788,25,"r5 = r18 + 41"]
[519792,25,"r4 = r18 + 40"]

# 省略

```

```

当我生成完成后，发现里面还有非常多的跳转，怪不得一开始不好还原为js代码

虽然中间产物的可阅读性比js差很多，但是如果相对于指令码来说，就是大大增加了可阅读性，那么此时就可以进行人工通过中间产物来还原出js代码

还原了一部分后我发现，里面竟然也是wasm转js的代码来的，通过和旧版wasm代码对比可以证实

![image](https://attach.52pojie.cn/forum/202603/05/173041kzm3klpmpq3pqmkm.jpg)

![image](https://attach.52pojie.cn/forum/202603/05/173045hzdfmqup3dqjqvp3.jpg)

可以看出结构上高度相似，同时也可以证实了vmp反汇编和还原的js代码是正确的

最后就是通过中间产物和还原出的js代码互相调试分析，找到es的tea解密等逻辑

![image](https://attach.52pojie.cn/forum/202603/05/173051dwcvyvooyki0w7cw.jpg)

最终完美解密无花屏

### 总结

1.网页端逆向趋势已经从 js混淆 -> jsvmp -> wasm -> wasm vmp，逆向成本逐渐变高，本次分析还原总计耗时3-4天

2.jsvmp 或者 wasm vmp在反汇编时，不一定要直接还原到js，可以尝试生成中间产物，在通过中间产物分析，或者跟上潮流，将中间产物讲给Ai去分析结果

3.越来越多的视频网站开始从标准的整体加密（或者仅加密key）进化为pes层或者es层的加密，甚至可能针对不同的nalu进行加密，或者自定义nalu的结构
