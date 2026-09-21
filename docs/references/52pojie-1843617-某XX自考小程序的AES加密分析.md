# 某XX自考小程序的AES加密分析

> **作者**: Do_zh | **发布时间**: 2023-10-12 16:21:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3232 / 33
> **原文**: [https://www.52pojie.cn/thread-1843617-1-1.html](https://www.52pojie.cn/thread-1843617-1-1.html)

---

**某XX自考小程序的AES加密分析**
**前言**
本人主要是报了自考在这个小程序上面做题，就研究了一下这个接口本文仅供学习交流使用，请勿随意传播。
**如有侵犯你的权益及时联系我删除。**

**工具：**主要用到这位小哥的 devtools 工具。![](https://static.52pojie.cn/static/image/smiley/default/17.gif)https://www.52pojie.cn/forum.php?mod=viewthread&tid=1842912&highlight=%D0%A1%B3%CC%D0%F2

**一、抓包分析**
打开小程序，打开devtools 工具，这里就不啰嗦，直接上过程。

![](https://attach.52pojie.cn/forum/202310/12/160038ge77nhk46hpu003e.png)

![](https://attach.52pojie.cn/forum/202310/12/155821n0566ma2j4zje5m6.png)

点击initiator，

![](https://attach.52pojie.cn/forum/202310/12/160305nm8pdkdpg3rpr88n.png)

点击红框进入 。
一般的加解密的关键字都是decrypt，encrypt ，反正各种关键字使劲搜就完事了 。
我这里搜的是解密的关键词 decrypt 。。找到好多处。下断点测试 。

![](https://attach.52pojie.cn/forum/202310/12/160600nkw8ibjrkh21l1ir.png)

此处下断点 。

![](https://attach.52pojie.cn/forum/202310/12/160726uw87hr5w17uefh7t.png)

可以看到加密方式是AES加密的 。其实他这里用到的是 CryptoJS 的前端解密的 。加密方式是 CBC-128 。

**二、结束**
CryptoJS 是一个三方的JS库。写一段代码证明一下。

[JavaScript] *纯文本查看*

```
 function cryptoDecrypt_(e) {
var t = n.crpytoConfig.AES_IV
, o = n.crpytoConfig.AES_KEY
, c = e.replace(/\_/g, "/").replace(/\-/g, "+")
, a = CryptoJS.enc.Utf8.parse(o)
, u = CryptoJS.enc.Utf8.parse(t)
, p = CryptoJS.enc.Base64.parse(c)
, f = CryptoJS.enc.Base64.stringify(p);
return CryptoJS.AES.decrypt(f, a, {
iv: u,
mode: CryptoJS.mode.CBC,
padding: CryptoJS.pad.Pkcs7
}).toString(CryptoJS.enc.Utf8).toString()
}

console.log(cryptoDecrypt_(str));
```

得到了明文。

![](https://attach.52pojie.cn/forum/202310/12/161423sqeheiiqmzt3sqff.png)

加密的方式也是一样的。整体来说还是比较简单的。

第一次发逆向JS的帖子。都不知道咋编辑的好。各位看官见谅哈。

如果有违规，可以删除。
