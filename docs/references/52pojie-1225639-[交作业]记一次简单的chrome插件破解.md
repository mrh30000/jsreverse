# [交作业]记一次简单的chrome插件破解

> **作者**: 大愛の向こう | **发布时间**: 2020-07-22 15:00:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 17580 / 79
> **原文**: [https://www.52pojie.cn/thread-1225639-1-1.html](https://www.52pojie.cn/thread-1225639-1-1.html)

---

*本帖最后由 大愛の向こう 于 2020-7-23 09:44 编辑*

前几天看到了 [@涛之雨](https://www.52pojie.cn/home.php?mod=space&uid=879080) 大佬的教程贴，想到自己刚好因为一个插件试用期到了，没办法使用在发愁，闲着也是闲着，就拿它来试了试。
插件为 modern scroll，一个美化滚动条的插件。
![](https://s1.ax1x.com/2020/07/22/UHAL7t.png)
插件支持试用7天，初次打开会让你打开一个*“show\_token”*页面获取试用token（令牌），试用到期后会提示购买并重新获取token；
![](https://s1.ax1x.com/2020/07/22/UHEt3D.png)

所以，因为有这个试用期满的弹窗，我的入手点便是在语言文件里找“Your trial period expired……”这句话对应的变量，然后查找它是由哪个函数弹出的，围绕这个函数进一步分析；
有了思路便开始行动吧，
在插件的详情中就可以找到这个插件的ID，然后到chrome的插件目录下找到这个ID的文件夹，将它复制到其他地方；

![](https://s1.ax1x.com/2020/07/22/UHAq0I.png)

使用notepad++在文件中查找“Your trial period expired“
顺利找到了对应的变量：*“trial\_expired”*

![](https://s1.ax1x.com/2020/07/22/UHAT6H.png)

然后在文件中查找“trial\_expired“，
发现除语言文件外，命中*”background.js”*,*”options.js”*,*”prefs.js”*三个文件，

![](https://s1.ax1x.com/2020/07/22/UHA7Xd.png)

先在*background.js*里面查看相关代码，非常幸运的发现它在一个名为*“verifyAndSaveLicens”*（验证并保存许可证）的函数中出现，
![](https://s1.ax1x.com/2020/07/22/UHAo1e.png)

分析这个函数，它也确实跟验证许可有关，第一个if是验证通过执行的代码，另外的if与试用和试用到期有关。
试着将第一个if的内容搬到if外，注释掉其他if，保存后到chrome里选择加载已解压的扩展，加载之后，打开扩展，提示输入许可的弹窗就消失了，

![](https://s1.ax1x.com/2020/07/22/UHedu4.png)

![](https://s1.ax1x.com/2020/07/22/UHA4fO.png)
各项功能也可以正常使用。
![](https://s1.ax1x.com/2020/07/22/UHAfk6.png)
[破解](https://www.52pojie.cn)这样就完成了，之后对语言文件进行汉化（原本的汉化有些过于机翻）汉化过程就不放了。
![](https://s1.ax1x.com/2020/07/22/UHAIpD.png)
之后为了稳定性，修改了一下*“manifest.json“*里的更新链接和版本号，也做了一些其他细节修改。
![](https://s1.ax1x.com/2020/07/22/UHA201.png)
![](https://s1.ax1x.com/2020/07/22/UHAhtK.png)
至此，破解跟补全汉化结束。
（因为用chrome打包后使用会报错，所以我就略去了打包步骤，反正是自己用的，也没多大影响(￣▽￣)"）
再次感谢 @涛之雨 大佬的教程。
PS：第一次发帖，没找到预览功能，也不知道发出去后排版如何，还请各位大佬见谅。

此插件的谷歌商店链接：https://chrome.google.com/webstore/detail/modern-scroll/ejonaglbdpcfkgbcnidjlnjogfdgbofp

GitHub链接：https://github.com/Christoph142/modern-scroll
