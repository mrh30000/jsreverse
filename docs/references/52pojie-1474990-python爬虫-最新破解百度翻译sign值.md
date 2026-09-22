# python爬虫-最新破解百度翻译sign值

> **作者**: Timelessyu | **发布时间**: 2021-07-13 00:19:00 | **版块**: 『编程语言区』 | **查看/回复**: 6901 / 36
> **原文**: [https://www.52pojie.cn/thread-1474990-1-1.html](https://www.52pojie.cn/thread-1474990-1-1.html)

---

开门见山，直入主题：

![](https://attach.52pojie.cn/forum/202107/12/234622mf0i9xjyva40998a.png)

可以通过不同的请求发现，只有sign是不断变化的，直接全局搜索；

![](https://attach.52pojie.cn/forum/202107/12/234841yuudq22d6jzqzs76.png)

全局搜索可能会出现许多结果，可以在关键词后面加上特殊符号，例如sign :或者sign=减少一些无效的结果，
直接进入文件查看源代码

![](https://attach.52pojie.cn/forum/202107/12/235311b206h67jh0jhsajr.png)

进行局部搜索sign:，看到有多个结果，如果觉得这个结果可疑，针对性的给这些存在可惜的结果下断点
打完断点，重新请求下，看看代码停留在哪里

![](https://attach.52pojie.cn/forum/202107/12/235602bjq1rmjpsocz8xgc.png)

最后代码停留到了这里：

![](https://attach.52pojie.cn/forum/202107/12/235849b2xb907b8cgphbb0.png)

看到sign又函数L生成，且里面的参数就是我们需要翻译的内容，直接进入查看此函数

![](https://attach.52pojie.cn/forum/202107/13/000043xulnssvgyut9kzzu.png)

看到函数内容，直接把它放到js调试工具里面进行调试

![](https://attach.52pojie.cn/forum/202107/13/000227doqqk70xamb07odm.png)

看的有一个i没有定义，这种情况到源代码附件找找看

![](https://attach.52pojie.cn/forum/202107/13/000343gv1hs8zhzrhfhqru.png)

看到i是一个值，这种情况首先就查看i这个值是否可变的；
重新请求一下发现，i是不变的，直接把i定义到代码里面去,
再次调试发现，确实一个函数n，再到源代码附件找找：

![](https://attach.52pojie.cn/forum/202107/13/000839xxccw1q8slqcxs21.png)

把它放到代码里面，最后调试，成功：

![](https://attach.52pojie.cn/forum/202107/13/000957l6x6cjk6prxwwpf5.png)

--------------------------------------------------------------------------------------------------------------------------------------------------

最后说一下，本人爬虫小白，正努力寻找各大网站受虐；

在这个项目之中，有一个问题，最后被我强行解决了

在调试过程中，在没有加入r函数的情况下，调试会报一个错：

![](https://attach.52pojie.cn/forum/202107/13/001320rhkz78wc8scl7lej.png)

对于这种内置对象，我一般都会赋值this或者赋值成空字典，但是还有会报错

![](https://attach.52pojie.cn/forum/202107/13/001411d4xz9yy6l5eey5xd.png)

怎么都调试不好，最后都是我挨着代码读，把缺少的补全，才运行成功，但是这个问题也没有得到完美的答案；
希望大佬为我解惑，可以的话，分析一下个人的逆向思路
第一次个人写贴，如有不好的地方，请指正
