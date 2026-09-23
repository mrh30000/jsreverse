# 猫某票房逆向signKey参数mygsig参数全流程

> **作者**: PokerS429 | **发布时间**: 2026-03-12 17:37:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2322 / 16
> **原文**: [https://www.52pojie.cn/thread-2096141-1-1.html](https://www.52pojie.cn/thread-2096141-1-1.html)

---

**猫某票房逆向全流程**

────────

**免责声明**

> 本文章仅供学习交流，严禁用于任何商业和非法用途，未经许可禁止转载，禁止任何修改后二次传播，擅自使用本文讲解的技术而导致的任何意外，作者均不负责，如有侵权，可联系本文作者删除！

**网站地址：** aHR0cHM6Ly9waWFvZmFuZy5tYW95YW4uY29tL2kvZGFzaGJvYXJk

────────

**引言**

本次我们将使用扣代码的方式解决猫某票房逆向。所解决参数为 signKey 和 mygsig。

这个案例很适合新人入门，尽管我弄了很长时间，但不得不承认这个只是一个普通的 MD5 加密逻辑。唯一的难点在于分析和需要拥有一颗火眼金睛。话不多说，我们开干吧。

────────

**抓包分析**

![](https://fastly.jsdelivr.net/gh/bucketio/img16@main/2026/03/12/1773302252578-6ec215df-7b1f-448a-9b0a-7e69b464ed1b.png)

如图所示，我们的目标接口是箭头所指的地方。每隔三秒会有新的接口出现，且无翻页逻辑。响应内容有字体反爬，本文不做探讨。

![](https://fastly.jsdelivr.net/gh/bucketio/img1@main/2026/03/12/1773302379246-4c0d007f-3b7d-44eb-a241-de2c57b4df3a.png)

────────

**分析参数 signKey**

![](https://fastly.jsdelivr.net/gh/bucketio/img6@main/2026/03/12/1773302413206-0a94906d-0763-469f-be7c-0384f17ad200.png)

拿到参数之后我们会一一进行查看：

[JavaScript] *纯文本查看*

```

params = {
    'orderType': '0',
    'uuid': '19cb2ee24c2c8-0f422b082134e-26061c51-1bcab9-19cb2ee24c2c8',
    'timeStamp': '1773302182587',
    'User-Agent': 'TW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0NS4wLjAuMCBTYWZhcmkvNTM3LjM2',
    'index': '813',
    'channelId': '40009',
    'sVersion': '2',
    'signKey': 'bf77b6e23692076b22cf339c82b87043',
    'WuKongReady': 'h5',
}

```

为了让大家看的更清楚，我特意拿到了代码块当中，我们可以进行初步的猜测，也可以直接全局搜索关键参数名来看加密位置和加密逻辑。当然，欲速则不达，我们可以先想一想哪些是固定的，哪些是加密的。

在这里，我们通过查看多个接口参数得知，变化的只有：

&#8226; timeStamp（未知时间戳）
&#8226; index（未知数）
&#8226; signKey（未知加密）

那么只有这三个是变化的，那么我们只需要关注这三个即可。那么可能会有人要问，这个 UA 看起来也是加密的呀。

当然，如果您好奇，那就会像我一样带到 base64 在线编/解码网站去看看。你就会发现如图的样子。

![](https://fastly.jsdelivr.net/gh/bucketio/img19@main/2026/03/12/1773302848333-638eb652-d499-4729-82c5-2a4c3abfdacc.png)

作者在这里使用了全局搜索关键名的方式找到了 signkey 的函数入口，巧合的是所有参数逻辑都在这里，我们可以仔细的分析一下了。

![](https://fastly.jsdelivr.net/gh/bucketio/img7@main/2026/03/12/1773302991443-41e9da60-7518-4ab2-a5ff-78bc68b1c183.png)

![](https://fastly.jsdelivr.net/gh/bucketio/img14@main/2026/03/12/1773303071447-8c32688b-859f-4d1f-8060-eb461bca1cf8.png)

简单来看，signKey 是一个 MD5 加密，且 timestamp 是一个正常的时间戳，index 显然是一个随机数，那么毋庸置疑的，我们的目标只有 signkey 了。

────────

**第一步：查看加密函数入口的参数**

![](https://fastly.jsdelivr.net/gh/bucketio/img8@main/2026/03/12/1773303326154-6f0783ec-c374-4c9b-b340-84b04521213b.png)

可以看到这个参数是 d.replace(/\s+/g, ' ')，且鼠标停滞显示参数，看上去是将 o 对象里的那些参数值给拼接在了一起而已，而事实上也的确如此。

并且这里的 replace 也并没有起到作用，它的目的是把字符串中所有的连续空白字符（空格、制表符、换行符等）全部替换为一个普通的空格，所以我们此时固定参数，而后将参数中非固定的地方做出改动，即可完成加密函数入口参数的构造。

![](https://fastly.jsdelivr.net/gh/bucketio/img0@main/2026/03/12/1773303759992-328559dc-3d4c-41fd-adf3-bbab8f8b82a8.png)

然后就来到了扣代码环节，当然如果此时你好奇的使用了 MD5 加密库你会发现 signKey 的值直接出来了且准确无误，当然了，练习为主的我们还是扣一扣也是不错的选择。

────────

**第二步：加密函数之扣代码**

![](https://fastly.jsdelivr.net/gh/bucketio/img10@main/2026/03/12/1773303888195-c1a39654-68d1-4aaf-9c81-1cb962148956.png)

断点打到加密函数位置，我们点击进入函数。

![](https://fastly.jsdelivr.net/gh/bucketio/img9@main/2026/03/12/1773303998270-0f3eadf9-4284-4763-8c12-b04a3f048841.png)

发现了一个 webpack，不过我们不用管，直接继续进入函数。一直往下点，直到看到 md5。

![](https://fastly.jsdelivr.net/gh/bucketio/img18@main/2026/03/12/1773304114153-4f48ca86-e445-4d77-8190-ddc6078f1479.png)

![](https://fastly.jsdelivr.net/gh/bucketio/img10@main/2026/03/12/1773304165437-28692454-935e-47a7-9213-f501fa5894e7.png)

像这样扣下来，然后缺什么补什么。

![](https://fastly.jsdelivr.net/gh/bucketio/img13@main/2026/03/12/1773304531664-aaff02f6-dcee-412b-bdb8-8b1b96a4016c.png)

类似于这样。接下来的扣代码就不细讲了，相信您已经并不陌生了。

这个参数就到这里结束了，作者这时兴致勃勃的去模拟请求了一下，发现被拦截了下来，通过继续分析得知，请求头里还有一个参数是需要处理的。

────────

**分析参数 mygsig**

![](https://fastly.jsdelivr.net/gh/bucketio/img8@main/2026/03/12/1773305180871-d4bf657f-d7b7-4643-bf41-de1f832c58b0.png)

**第一步：确认其为动态参数**

多看几个接口就好了。

────────

**第二步：全局搜索参数名称寻找函数入口**

![](https://fastly.jsdelivr.net/gh/bucketio/img8@main/2026/03/12/1773305329658-21f9a3a6-9636-4b57-a7a4-43b8e7340bb5.png)

找到参数名称后简单看一下上下文，很快会发现关键名称。

![](https://fastly.jsdelivr.net/gh/bucketio/img7@main/2026/03/12/1773305401983-9ed8df1c-8480-41c5-bade-fce49c49537c.png)

但是这是个 ob 混淆，那么如果您会 AST 反混淆的话可以反混淆去看，如果不会的话也没关系，断点打好之后直接鼠标悬停进行分析。

看这个图，或者浏览器调试查看，会发现只有 ms1 是变化的，那么我们只关注 ms1 即可。

![](https://fastly.jsdelivr.net/gh/bucketio/img7@main/2026/03/12/1773306039525-9da4750f-c292-4775-a899-0320aff44ba7.png)

在这里，加密函数入口是：

![](https://fastly.jsdelivr.net/gh/bucketio/img19@main/2026/03/12/1773306459366-384d9f57-3a91-4398-89a5-cc630c2744f3.png)

[JavaScript] *纯文本查看*

```

var _0x3fa226 = _0x1caac1()(_0x405958)

```

至于怎么找到的函数入口，那肯定是打断点跟堆栈找到的，很简单的，您感兴趣的话自己尝试一下。

────────

**第三步：分析函数入口的参数**

![](https://fastly.jsdelivr.net/gh/bucketio/img9@main/2026/03/12/1773306602214-32442cc8-4f86-44df-956a-2cb6f51675ff.png)

![](https://fastly.jsdelivr.net/gh/bucketio/img2@main/2026/03/12/1773306580772-6e896526-13d5-4dbd-899a-63ef8b28a34e.png)

这里我放了两个参数的照片，第一张是入口的参数，可以看出还是一个固定的参数，且参数内容是由图二的参数组成的。这里我们使用对比大法，确认了什么是变化的什么是不变的。

直接给大家说结论，这个参数变化的和上一个参数变化的是一致的。不同的是这个参数组成还需要加密好的 signKey。最后再写一个时间戳的变量加入即可。

[JavaScript] *纯文本查看*

```

var payload = `581409236#40009_{index}</span>_0_/i/api/dashboard-ajax_<span class="hljs-subst">{data_key}_2_timestep</span>TW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0NS4wLjAuMCBTYWZhcmkvNTM3LjM219cb2ee24c2c8&#8722;0f422b082134e&#8722;26061c51&#8722;1bcab9&#8722;19cb2ee24c2c8h5{time_step}</span>_TW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0NS4wLjAuMCBTYWZhcmkvNTM3LjM2_19cb2ee24c2c8-0f422b082134e-26061c51-1bcab9-19cb2ee24c2c8_h5times&#8203;tep</span>T&#8203;W96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0NS4wLjAuMCBTYWZhcmkvNTM3LjM21&#8203;9cb2ee24c2c8&#8722;0f422b082134e&#8722;26061c51&#8722;1bcab9&#8722;19cb2ee24c2c8h&#8203;5${time_step_now}`
ms1 = decode(payload)

```

────────

**第四步：追进函数进行分析**

我们一点点追进去，看到了这么一个函数，大佬看到这个肯定知道这是 MD5，那么发给 AI，AI 也说看起来像是 MD5。

![](https://fastly.jsdelivr.net/gh/bucketio/img17@main/2026/03/12/1773306957751-0241edf8-4a11-407c-a928-d491f8ff1cb6.png)

那么不妨做个大胆的尝试，失败了再说，毕竟不浪费时间。

![](https://fastly.jsdelivr.net/gh/bucketio/img1@main/2026/03/12/1773307076923-ef8c098d-055c-4852-ae96-168b9bde01b5.png)

![](https://fastly.jsdelivr.net/gh/bucketio/img18@main/2026/03/12/1773307092232-b0b7d07b-1ace-44c9-b2a6-5e002272ca50.png)

固定参数使用标准 MD5 加密库进行尝试，会发现加密内容和实际加密内容一致。

当然如果不进行尝试的话，本 JS 代码可以通过反混淆再进行扣代码也是一样的，或者进行补环境处理，有的哥哥使用了补环境框架也很快就弄好了。方法还是很多的。我这算是取巧了。

此处我选择了带回到我刚才扣好的算法中，结果是一致的，此处就不做过多说明了。

────────

**最终的模拟请求与效果展示**

![](https://fastly.jsdelivr.net/gh/bucketio/img0@main/2026/03/12/1773307332635-5ff155e8-6169-4962-a17e-2fc80493331e.png)

![](https://fastly.jsdelivr.net/gh/bucketio/img16@main/2026/03/12/1773307444705-c0fec2d3-f95e-40a7-a4d8-9bb4e412575c.png)

────────

**留个小坑点**

大家可以尝试观察 mygsig 参数中的 ts1 是怎么来的，欢迎评论区讨论。

────────

**总结**

AST 代码如果大家需要的话我可以单独出一期。

由于爬虫逆向反混淆技术博大精深，本人水平有限，文中若有疏漏或理解偏差之处，恳请各位前辈大佬不吝赐教，我们评论区见。

**最后，愿我们在高处相见，亦或在深处重逢。**

────────
