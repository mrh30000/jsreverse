# 某条signature签名分析

> **作者**: 还是那个没头脑 | **发布时间**: 2021-04-18 20:59:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6423 / 17
> **原文**: [https://www.52pojie.cn/thread-1421125-1-1.html](https://www.52pojie.cn/thread-1421125-1-1.html)

---

通过全局搜\_signature定位到参数n

![](https://attach.52pojie.cn/forum/202104/18/204840illxw28nazhoaw4a.png)

打断点，一直F8到/api/pc/feed/，F11追进去

![](https://attach.52pojie.cn/forum/202104/18/205217shop82g498nhmxmk.png)

分析可知参数i为加密入口，i进行打断点追进入发现acrawler.js加密文件
全部复制到本地node环境进行Debug，补环境，缺什么补什么

接下来重点：
调试到sign一直报错，最后分析得知，acrawler.js的最后有一段其中
"undefined" != typeof exports ? exports : void 0
三目表达式进行了导出函数的校验，在浏览器环境和node环境分别进行 typeof exports 输出即可找到问题
只需改为 void 0 即可过掉导出函数的检测。
剩下就没什么难的了，相信小伙伴们都能搞定
