# 利用fiddler在浏览器打开微信网页链接,并进行js断点调试解密

> **作者**: 打字的小强 | **发布时间**: 2020-10-07 17:23:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 20203 / 109
> **原文**: [https://www.52pojie.cn/thread-1280130-1-1.html](https://www.52pojie.cn/thread-1280130-1-1.html)

---

*本帖最后由 打字的小强 于 2020-10-7 18:01 编辑*

**一.前言**
最近在调试一个前后端分离的网站，接口被加密了，原先都是未加密的。就是这个结果json中的message。一堆乱码。肯定是需要解密js的。

![](https://attach.52pojie.cn/forum/202010/07/112941zcd2o2fcds0vdd4s.png)

**二.浏览器打开需要微信授权登录的网页**
第一步就是卡住了。这个网页是需要在微信里面才能打开。怎么才能在chrome浏览器中打开呢。收集了一些资料。发帖的时候忘了资料来源了，这里说说我自己做的详细的步骤吧，很简单的。
这里测试一下某个链接，随便百度的：
http://www.weijuju.com/mobile/game/miraclepan/pan.jsp?panId=2881&wuid=243430
直接用PC浏览器打开会被拦截识别。

![](https://attach.52pojie.cn/forum/202010/07/143910cm5zk5lzp4kkik9g.png)

第一步打开fiddler拦截所有的请求,打开PC版的微信。用PC微信端打开这个链接

![](https://attach.52pojie.cn/forum/202010/07/154518v6170pahapsa6w4a.png)

点击同意，然后查看fiddler，如图所示操作。（把第一个open.weixin开头的网页直接在PC浏览器打开貌似也可以。）这种方法可能导致某些功能无法使用或者浏览器控制台报错。

![](https://attach.52pojie.cn/forum/202010/07/173353ulz8r1282gem8m68.png)

接下来在PC默认的浏览器就可以看到了授权提示，点击授权过后就可以自由的在浏览器调试微信网页了。

![](https://attach.52pojie.cn/forum/202010/07/173355l1xotrxqicpedeor.png)

**三.简单的js调试。**
首先我没有看过系统的教程，只看过一些简单的文章之类的。只用了一点chrome控制台调试打断点的功能，不是很复杂。
最开头的图片那个接口是访问一个页面渲染数据的接口。json数据中的message的键值肯定是需要解密的东西，这就要查看js代码哪里动了那个message。进入目标页面就会加载一个单独的js.名为126.js

![](https://attach.52pojie.cn/forum/202010/07/150418wl4q4rhwks9jqwxf.png)

接下来。找下这个js文件里面哪里动了这个message,接下来看图操作

![](https://attach.52pojie.cn/forum/202010/07/151128b1uc1crux3pxrxgj.png)

这时候断点打好了，浏览器里面返回再进入这个页面，这个js就会在这里中断。鼠标悬浮在断点的地方会有提示。点击提示，进入断点调用的相关的代码。

![](https://attach.52pojie.cn/forum/202010/07/151449pvzf8bxkjcjqbv2q.png)

这时候如下图所示点击悬浮出来的地方，wybzd这个地方。看调用了哪里的代码怎么处理这个message。

![](https://attach.52pojie.cn/forum/202010/07/160849utiryy9un9nwwez5.png)

![](https://attach.52pojie.cn/forum/202010/07/152446jwrwlnsq3ccw0n6r.png)

![](https://attach.52pojie.cn/forum/202010/07/152511njqtkkeko6fkk9o6.png)

处理message的js代码到这里就差不多出来了。采用AES加解密，一种对称加解密，加解密都用一个密码。
t就是密码了，this.BVDCVojLpQEGLytM 就是调用这个函数传进来的参数。找到这个变量的值就是最开始找到处理message的地方，应该只用到了第一个密钥。其他密钥我就不知道哪里用了

![](https://attach.52pojie.cn/forum/202010/07/161027y1c199z2191b10jt.png)

密钥就是："8NONwyJtHesysWpM"
接下来我们来验证一下这个密钥是否正确。
随便百度一个AES在线加解密的网站。把密钥,密文,解密方式填进去计算
ECB模式,pkcs7padding填充,结果字符集utf-8。最后结果如图，解密完成。教程到此结束。

![](https://attach.52pojie.cn/forum/202010/07/161524j5z8yaj7eeppeweb.png)

**四.总结**
微信网页OAuth 2.0授权登录可以看看官方文档和阮一峰网络日志。
http://www.weijuju.com/mobile/game/miraclepan/pan.jsp?panId=2881&wuid=243430 访问这个网页的时候后端有一个处理会检查请求来源是否在微信浏览器里面。如果不是就是提示请在微信客户端打开链接。如果在微信客户浏览器就会显示让用户主动授权。我们用fiddler直接跳过了判断客户环境是否在微信客户端浏览器，直接提示用户授权。授权之后，后端也就被我们欺骗了。就真的以为在客户端浏览器环境了，接下来就可以畅通无阻了，但是实际环境并不是微信客户端环境，通过jssdk调用的功能都可能会收到限制，我并没有经过测试。
js混淆加密这次真的很简单，处理message只有一个地方。还单独加载了一个文件，只有一层的调用关系，加密方式也不是很复杂，但这些东西只有接触长了会有一些敏感的直觉，哈哈，我现在才刚刚开始，挺有意思的，就总结一下。
