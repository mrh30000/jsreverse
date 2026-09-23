# 某网站captcha 机器人检测原理分析

> **作者**: happyBread | **发布时间**: 2022-03-19 23:46:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4541 / 9
> **原文**: [https://www.52pojie.cn/thread-1606904-1-1.html](https://www.52pojie.cn/thread-1606904-1-1.html)

---

*本帖最后由 happyBread 于 2022-3-19 23:48 编辑*

感谢开放注册让我有机会加入论坛，所以来发个贴混脸熟

看到一个网站上的滑块机器人检测，就好奇它的原理到底是怎样的

![](https://attach.52pojie.cn/forum/202203/19/232054ppmm3ror45aosmmp.png)

打开f12 控制台查看网站源码，发现在提交表格时会触发以下代码进行检测，

![](https://attach.52pojie.cn/forum/202203/19/232358hb8bf0e2gevsfv98.png)

打开captcha的js 文件发现没有混淆，根据以上信息查找options.onSuccess
发现e.verified 及e.spliced 为真时触发onSuccess callback

![](https://attach.52pojie.cn/forum/202203/19/234754vxyfyyrpcc8x47cv.png)
而e 来自n.verify()
所以继续跟进n.verify

![](https://attach.52pojie.cn/forum/202203/19/233845e9l7ffbnf7977m87.png)

这里verified 可以根据设置是否使用远程服务器验证鼠标轨迹，或者本地验证，这个网站只用了本地的。

本地的验证基本上就是记录鼠标event的clientY， 然后计算出鼠标 y 坐标的标准差，如果不为0 就放行。
spliced 则是首先在onload 里随机生成正确坐标点，然后在verify里判断滑块是否滑倒正确的范围内， options.offset是允许的误差范围。

![](https://attach.52pojie.cn/forum/202203/19/233901zoosgscscr6dw22g.png)
