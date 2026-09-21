# SpiderDemo T3  protobuf混淆解析挑战题解

> **作者**: hy256 | **发布时间**: 2025-11-30 21:01:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2958 / 6
> **原文**: [https://www.52pojie.cn/thread-2076729-1-1.html](https://www.52pojie.cn/thread-2076729-1-1.html)

---

**一、声明**
本文仅作为仅做技术学习交流。本文章中所有内容仅供学习交流使用，不用于其他任何目的，严禁将本文讨论之技术用于商业用途和非法用途，否则由此产生的一切后果均与作者无关。如有侵权请联系删除。
虽然已经注册一段时间，今天第一次尝试分享心得，如果有不足或错误之处还请批评指正。
**二、分析**
aHR0cHM6Ly9zcGlkZXJkZW1vLmNuL2F1dGhlbnRpY2F0aW9uL3Byb3RvYnVmX2NoYWxsZW5nZS8/Y2hhbGxlbmdlX3R5cGU9cHJvdG9idWZfY2hhbGxlbmdl
**2.1、观察请求**

![](https://attach.52pojie.cn/forum/202511/30/193418qllw17c87lw7he7m.png)

随意点击一页，发现在请求发送之前先获取了一次challenge.proto文件，这一定程度上降低了逆向难度，像某ac站的弹幕protobuf已经被编译成了js代码，分析起来比较费力。

![](https://attach.52pojie.cn/forum/202511/30/194027qn7e8t5mv6aovxea.png)

![](https://attach.52pojie.cn/forum/202511/30/194125d9vtnvtsjnhsqeno.png)

观察到请求和响应均已被编码。
**2.2、分析调用栈**

![](https://attach.52pojie.cn/forum/202511/30/194302m5a8sj4jj3wy2rsk.png)

加密的核心逻辑在protobuf\_challenge.js中
**2.3、protobuf\_challenge.js分析**
**2.3.1、去除特殊unicode字符**

![](https://attach.52pojie.cn/forum/202511/30/194755s77yplyy9ydbhhb9.png)

![](https://attach.52pojie.cn/forum/202511/30/194837lqqnzzr6wjnz9jxq.png)

在源面板中打开protobuf\_challenge.js，发现文件被高度混淆，格式化后也无法阅读，此时应当考虑混淆时（在变量名等处）引入了特殊的unicode字符，导致文本编辑器无法正常显示，解决方案是去除特殊字符。这里使用了一种特殊的解决方法，将代码复制进在线的ob混淆工具，关闭所有混淆选项，变量名生成器调整至mangled模式，含特殊字符的变量名即可被自动去除

![](https://attach.52pojie.cn/forum/202511/30/200136njaaaaav4ah6qa2a.png)

处理完成后，代码可被正常格式化
**2.3.2、去除字符串混淆**
分析处理后的文件，发现js中的字符串被修改为函数调用的形式，且部分区域的字符串被包了两层

![](https://attach.52pojie.cn/forum/202511/30/200835g779qnng0nn0n8n7.png)

![](https://attach.52pojie.cn/forum/202511/30/200919di8guuz904iizh32.png)

为了图方便，这里使用了现成的反混淆工具,在去除第一层混淆后代码的可读性就足以进行分析了，部分核心函数需要去除第二层
**2.3.3、逻辑分析**
将解混淆后的js本地替换后进行分析，发现请求发送的核心逻辑在apiGetPageData中

![](https://attach.52pojie.cn/forum/202511/30/202935bq79mgk8bp7ttgtb.png)

请求体是一个由page、challengeType、timestamp、signature四个字段组成的对象经由名为authentication.ChallengeRequest的消息结构序列化生成的protobuf，其中page为请求页数，challengeType为编码后的挑战类型，timestamp为毫秒级时间戳，signature为时间戳经过哈希运算后的hex字符串。

![](https://attach.52pojie.cn/forum/202511/30/203759a151g7gc2n17gprz.png)

响应体使用位于同一proto文件中的authentication.ChallengeResponse消息结构体反序列化
**2.4、模拟请求**
**2.4.1、请求体生成**
page、timestamp不多说；challengeType虽然经过编码，而且编码函数很复杂，但结果是恒定的，可以在浏览器中拿到值后写死；signature生成算法是修改后的md5，好在其中没有包含环境监测，可以把这部分拿下来放到node里调用。
**2.4.2、请求体编码和响应体解码**
challenge.proto下下来之后，用protoc编译为python文件，即可用于请求编码和响应解码

[PowerShell] *纯文本查看*

```
protoc --python_out=. challenge.proto
```

**2.4.3、结果展示**

![](https://attach.52pojie.cn/forum/202511/30/205436nzsrcwgjxgxdscak.png)

**三、讨论**
虽然这个挑战js混淆很复杂，但作者还是在很多地方手下留情了，使得综合难度不是太高。如果把proto文件编译为js嵌入代码、将signature生成算法进一步混淆或加入环境监测代码，逆向难度会进一步升高。
