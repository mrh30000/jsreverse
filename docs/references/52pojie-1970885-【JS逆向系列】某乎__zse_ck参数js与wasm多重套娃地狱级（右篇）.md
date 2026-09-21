# 【JS逆向系列】某乎_zse_ck参数js与wasm多重套娃地狱级（右篇）

> **作者**: 漁滒 | **发布时间**: 2024-10-09 18:01:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 7786 / 32
> **原文**: [https://www.52pojie.cn/thread-1970885-1-1.html](https://www.52pojie.cn/thread-1970885-1-1.html)

---

@[TOC](https://www.52pojie.cn/%E3%80%90JS%E9%80%86%E5%90%91%E7%B3%BB%E5%88%97%E3%80%91%E6%9F%90%E4%B9%8E__zse_ck%E5%8F%82%E6%95%B0js%E4%B8%8Ewasm%E5%A4%9A%E9%87%8D%E5%A5%97%E5%A8%83%E5%9C%B0%E7%8B%B1%E7%BA%A7%EF%BC%88%E5%8F%B3%E7%AF%87%EF%BC%89)

### wasm层vm分析

既然wasm暂时无法搜索到结果，那么先返回js继续分析分析

从之前的版本可以猜测到，wasm中肯定调用了很多js层的环境内容，那么这里肯定就会调用各个导入函数，但是胶水代码又是在jsvmp中，没有办法直接下断点。

而在上一篇中反汇编的代码可以看到，胶水代码会被绑定到window.Go上面，那么就可以在胶水代码执行完成之后，wasm加载之前下断点

![](https://attach.52pojie.cn/forum/202410/09/175847x7klzkjw595wr1nc.jpg)

就可以通过window.Go看到里面的内容

![](https://attach.52pojie.cn/forum/202410/09/175851lqwzhhz3hhhqwhhq.jpg)

![](https://attach.52pojie.cn/forum/202410/09/175855kl02uf2znf5noslx.jpg)

往下拉在【syscall/js.valueGet】函数内下一个断点，就可以大概看到从js获取了什么内容

![](https://attach.52pojie.cn/forum/202410/09/175900ddiml5wiwvdkaalm.jpg)

多次调用后，会发现堆栈中不断出现【(\*main.VM)】前缀的函数

![](https://attach.52pojie.cn/forum/202410/09/175904p10kpia110q3okip.jpg)

那么不排除wasm中存在一个自己实现的vm

那么在wasm中查看首次断下的【runtime.run$1$gowrapper】函数

![](https://attach.52pojie.cn/forum/202410/09/175909dxxxjsxmuiccjsx3.jpg)

这里出现了两次【syscall/js.valueGet】，与网页断点调试出现的堆栈信息是一致的

![](https://attach.52pojie.cn/forum/202410/09/175913wqbrqgj4j48w9rjf.jpg)

再往下，出现了一个base64解码的函数，地址是0x11428，长度是15160，从wasm中查看这部分内存

![](https://attach.52pojie.cn/forum/202410/09/175917bacf6ael3bzhcefz.jpg)

这部分进行base64解码之后，发现还是一堆乱码。那么很大概率这里就是wasm中vm的字节码了

继续根据wasm的逻辑，就是进行这部分字节码的解析，解析部分与js层的vmp非常类似

![](https://attach.52pojie.cn/forum/202410/09/175922tyfyntgfmf7ffefb.jpg)

最终可以得到一个2329长度的大数组，以及一个90长度的字符串数组

那么解析部分与js层类似，那么运行逻辑会不会也是类似呢？

分析后发现【runtime.run$1$gowrapper】函数就是主循环函数，【(\*main.VM)】前缀的函数就是子函数组，子函数里面的每一个case就是具体逻辑

但是wasm中的每一个case运行的内容与js相比明显难理解一些

所以无论是编写解释器难度会变高，想在里面插桩分析，自然难度也一样变高

搞不定就喊爹，经过某群聊大佬【Code】的帮助，才成功对整个流程进行反汇编

![](https://attach.52pojie.cn/forum/202410/09/175926hp6ojexoffy9p0ei.jpg)

前面部分还是在不断的进行环境校验，并设置假的ck

后面new了一个非常长的Function，然后里面居然还是一个jsvmp，好家伙，搁着套娃呢

为什么说非常长，反汇编发现大数组长度达到了8000+，而且里面所有的代码均为环境检测

![](https://attach.52pojie.cn/forum/202410/09/175931pak21mkph1x18tjm.jpg)

![](https://attach.52pojie.cn/forum/202410/09/175935m9jdkted92xakda2.jpg)

最后将加密后的环境信息绑定到\_\_g.r进行返回

![](https://attach.52pojie.cn/forum/202410/09/175939hjgljqbijkbqd3kj.jpg)

内容主要分为6部分，并使用"\xE2\x80\x8D"进行分割

wasm中vm后面的逻辑就是拿到这部分加密的环境信息，然后解密，再在vm内进行一些检测，取一部分作为明文

接着vm再做一些其他的环境检测（jsvmp中没有的），也作为明文的一部分

最后再取ua的crc32与前面两项拼接，作为最终的明文

![](https://attach.52pojie.cn/forum/202410/09/175944iv6z07009a3h6j79.jpg)

明文的拼接与上一个版本格式上是一模一样的，只是环境部分的值不一样

sub\_988就是最终的加密函数，与之前一样，框架上也是使用的sm4，但是一样是经过了不同程度的魔改，然后经过一个魔改过得base64编码，形成了最终的ck

整理一下思路如下图

![](https://attach.52pojie.cn/forum/202410/09/175948chc9x6jxhzj944hi.jpg)

使用python还原出所有算法测试

![](https://attach.52pojie.cn/forum/202410/09/175953i5bmqs557qk4z6zu.jpg)

中文没有乱码完美

### 其他

之前版本只是使用了wasm，而更新后甚至在wasm中玩起了vm，也有的wasm出现了不同程度的混淆。按照这么发展，web逆向也是越来越难

搞不动了，去注册骑手了！！
