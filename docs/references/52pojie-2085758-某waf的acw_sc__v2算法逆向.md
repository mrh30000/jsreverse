# 某waf的acw_sc_v2算法逆向

> **作者**: Ken0712 | **发布时间**: 2026-01-11 12:49:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2041 / 3
> **原文**: [https://www.52pojie.cn/thread-2085758-1-1.html](https://www.52pojie.cn/thread-2085758-1-1.html)

---

### 前言

本文章中所有内容仅供学习交流使用，不用于其他任何目的，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关

目标网站: 某商场品牌页面

正常访问发现数据在返回的html中，Python各种库请求无效；

### 分析

首先随便拿个库请求页面，发现返回的html不是正常页面：

![](https://attach.52pojie.cn/forum/202601/11/124713zkkqqedc9c7gdv7d.png)

从关键字可以发现这就是我们的目标。

可以发现reload函数设置了一个cookie之后刷新页面，猜测携带这个cookie可以正常访问。
用浏览器正常打开，F12的确可以发现这个cookie的值，接下来要做的就是去逆向这个cookie算法了。

一上来就是个隐藏textarea，写了一段arg1，这个arg1就是cookie生成的来源。
把arg1和下面的生成代码全部复制出来，丢到nodejs环境再说。

![](https://attach.52pojie.cn/forum/202601/11/124723g7j9s30hjgp79bq0.png)

稍微整理一下代码，发现里面全都是这种混淆之后的运算，肯定是没法看的。
于是装了个babel，配合babel-plugin-eval-when-possible插件做常量折叠

（别问我为什么不用工具处理，问就是第一次逆向js忘了（）

折叠之后这东西勉强能看了，但是还是得找到cookie计算的位置，于是上浏览器。

![](https://attach.52pojie.cn/forum/202601/11/124736ix4173on9734ocex.png)

打开Dev Tools之后一上来就是个无限debugger，从调用栈回溯可以找到这样一段动态构造function的代码:

![](https://attach.52pojie.cn/forum/202601/11/124743n48p35447775139b.png)

找到关键t[ye(oe.W)]=="; debugger;return s['charCodeAt'](0);"；
But，我直接在firefox里面ignore line解决。（这是个动态构造的函数，ignore之后千万别把文件关掉，要不然就再也打不开这个断点了）

![](https://attach.52pojie.cn/forum/202601/11/124749cnt5we47xq7x3368.png)

在setCookie里面下断点，回溯调用栈到这个位置，找到生成cookie的地方"P = ...""

接下来在本地js里面给P后面加一个console.log，把window换成global，补上arg1跑一遍。
好巧不巧，直接卡死；

![](https://attach.52pojie.cn/forum/202601/11/124755brsh3z9mkuu53ey3.png)

发现oO的值不对，卡死在这个循环里

![](https://attach.52pojie.cn/forum/202601/11/124801bjj4iig4oyiwo3z6.png)

这个函数在PxjRjE(cookie计算的主函数)的源码里面找字符串fc1e53的位置，我们把代码格式化了显然得到的偏移量是错的；

从浏览器Console直接运行oW，拿到oO的值写死，顺手把oW给内联了，这下nodejs跑出来的值就（看起来）对了（实际上还有一层干扰，这个跑出来的值是有问题的）

接下来就是非常无聊的手动反混淆，把一坨对象的值内联，比较有意思的是这一层混淆：

![](https://attach.52pojie.cn/forum/202601/11/124808dq6gq56nztrotnq4.png)

这个ox表其实是xor加密之后的字符串常量，可以用python脚本批量转换成window这种可读字符串，同时还带有466的偏移(m(466)==ox[0])

![](https://attach.52pojie.cn/forum/202601/11/124813ndf44s4d004v8d4b.png)

再回头看导致死循环的这段代码，是在把p(也就是ox)循环移位到满足某个条件；
显然懒得去分析这个巨大的X条件，直接丢到浏览器跑一遍拿到移位之后的ox，丢给python解密

![](https://attach.52pojie.cn/forum/202601/11/124822ysgf4ofktj5ffzj3.png)

接下来再去把m(0x111)这样的常量和巨大的操作表t内联了（同样python脚本解决），
基本上代码就没什么大问题了。

当然最后有几个反逆向的措施，需要一个一个纠正：

![](https://attach.52pojie.cn/forum/202601/11/124828tcxwu9zgzts6tczx.png)

这个y函数在调用一个不存在的函数，从调用栈里面匹配某些东西作为指纹。同样，在浏览器运行y，把y的返回值写死；

![](https://attach.52pojie.cn/forum/202601/11/124833yvmwxfnngfnnd2zf.png)

T表用于决定最后生成的cookie末尾随机数的奇偶性，true为奇数，false为偶数。这里通过读取navigator，判断webdriver之类的东西做反逆向。
同样在浏览器拿到这个表，替换为常量；

接下来的算法就很清楚了，用一个自定义的线性同余随机数和写死的种子生成字母序列，然后按照某个特定顺序遍历arg1，
用这个字母序列转换；
用Python写的话，整个逻辑不过10行解决

![](https://attach.52pojie.cn/forum/202601/11/124841feiberpqp9k999uk.png)

至此，算法逆向全部结束；
