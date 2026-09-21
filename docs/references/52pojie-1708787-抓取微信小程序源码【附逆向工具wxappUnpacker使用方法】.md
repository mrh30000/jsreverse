# 抓取微信小程序源码【附逆向工具wxappUnpacker使用方法】

> **作者**: why3316 | **发布时间**: 2022-11-06 18:29:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 47546 / 447
> **原文**: [https://www.52pojie.cn/thread-1708787-1-1.html](https://www.52pojie.cn/thread-1708787-1-1.html)

---

*本帖最后由 why3316 于 2023-4-9 15:45 编辑*

**文章目录**

* 前言
* 一、工具准备（免费）
  + 1 解密工具
  + 2 逆向工具
* 二、解密小程序
  + 1.确认小程序包位置
  + 2.打开一个小程序
  + 3.解密小程序包
* 三、逆向小程序
  + 1、检查nodejs
  + 2、安装依赖
  + 3、正式逆向

**前言**
想成为一名微信小程序的开发者，**前端思路的学习和安全意识是非常有必要的**，故**务必掌握小程序反编译技能。**这里用到了2个工具《解密》与《逆向》（非原创，均来自网上的大佬），**特别适合新手，而且都是免费的！都是****免费的！都是免费的！**第一次操作可能会慢一些，熟练了之后，**3秒抓取一个小程序源码！** **一、工具准备（免费）** **1、解密工具**

![](https://attach.52pojie.cn/forum/202211/06/183913y444xqkm6oq22iio.png)

小程序包解密
https://www.aliyundrive.com/s/y7LbrRvgHKS
点击链接保存，或者复制本段内容，打开「阿里云盘」APP ，无需下载极速在线查看，视频原画倍速播放。 **2、逆向工具**
目前用的是：wxappUnpacker

![](https://attach.52pojie.cn/forum/202211/06/183941gkl7xgn4nx61zzlg.png)

这个是一个大神开发的，之前可以在github下载，不过截止今天，大神已经关闭了下载，具体原因……你懂得。不过，开源是趋势，就像这个世界是不会停止开放的，因此我们还是有很多渠道可以获取，你可以通过自己的渠道获取，或者用我为你准备好的：

小程序逆向编译
https://www.aliyundrive.com/s/6YRjqatfSGY
点击链接保存，或者复制本段内容，打开「阿里云盘」APP ，无需下载极速在线查看，视频原画倍速播放。
**二、解密小程序**网上有很多教程，是分苹果和安卓的，还要用到模拟器，其实不用那么麻烦，直接用微信PC客户端就可以了。
 **1.建议修改微信PC端默认的小程序包位置**默认是在C盘，太占内存，建议修改

![](https://attach.52pojie.cn/forum/202211/06/184005a3tffs837stj5t8f.png)

**2.打开一个小程序**在pc端打开一个小程序，尽可能点开所有的页面，让本地自动生成一个本地包，在刚刚设置好的文件夹里：

![](https://attach.52pojie.cn/forum/202211/06/184007tn9j1y29h932x082.png)

不过里面的是加密过的文件：\_\_APP\_\_.wxapkg就需要用到我们前面的解密软件。
 **3.解密小程序包**软件长这样：

![](https://attach.52pojie.cn/forum/202211/06/184009yw1xush1ssz77u03.png)

**选择加密小程序包**

![](https://attach.52pojie.cn/forum/202211/06/184011k6karzzzh63yzn6g.png)

0.1秒解密成功：

![](https://attach.52pojie.cn/forum/202211/06/184013j777y7m7577x79q9.png)

**解密之后的文件名是：**

[Asm] *纯文本查看*

```
wx4f110483368dc766.wxapkg
```

**会存放在wxpack文件夹：**

![](https://attach.52pojie.cn/forum/202211/06/184016er7wcrwdzcwo6tzr.png)

**三、逆向小程序**正式用到大神开发的【wxappUnpacker】了。下面的操作，都是在cmd命令窗口中操作的，需要强调的是，必须在wxappUnpacker路径里才可以，简易方法是，直接在【wxappUnpacker】文件夹的地址栏里输入cmd即可。

![](https://attach.52pojie.cn/forum/202211/06/184018sriaronz88iuumr8.png)

**如果跟我一样放在桌面，出来的就是这样：**

![](https://attach.52pojie.cn/forum/202211/06/184020g26zr6hw5r0680z2.png)
 **1、检查nodejs**输入node -v检查是否已安装nodejs

![](https://attach.52pojie.cn/forum/202211/06/184022tzssy0ll6z885lvd.png)

如果没有安装nodejs，请先安装。下载地址：<https://nodejs.org/en/>安装nodejs一直点击下一步安装即可。
 **2、安装依赖**依次输入下面7个npm install，分别一个一个安装

[Asm] *纯文本查看*

```
npm install
npm install esprima
npm install css-tree
npm install cssbeautify
npm install vm2
npm install uglify-es
npm install js-beautify
```

![](https://attach.52pojie.cn/forum/202211/06/184024b2fcz2r7axzrirpq.png)

 **3、正式逆向**输入：

[Asm] *纯文本查看*

```
bingo.bat 主包路径（可以直接拖入）
```

![](https://attach.52pojie.cn/forum/202211/06/184026nlsxn8htssgrgrnl.png)

编译后的文件，保存在和【wx4f110483368dc766.wxapkg】同一个文件夹中，自动以wx4f110483368dc766命名。

![](https://attach.52pojie.cn/forum/202211/06/184028bs4jghes4fgxfj1j.png)

OK，编译完成，接下来直接使用微信开发工具打开，即可学习前辈们的前端设计了，骚年。
 **4、可能的错误** **①、如果在执行编译命令时报**

[Asm] *纯文本查看*

```
this package is a subPackage which should be unpacked with -s=<MainDir>.
```

说明这个是分包，打开小程序时生成了两个.wxapkg文件，编译另一个文件即可，编译分包和主包的命令是不一样的：

[Asm] *纯文本查看*

```
node ./wuWxapkg.js 分包路径 -s=主包路径
```

 **②、如果生成的文件里不包含app.json文件**说明你找的小程序，是大神开发的，已经做了反编译的安全措施，所以解密失败，这也是我发这篇文章的目的。
**不过这种大神目前还是比较少见的，你会成为未来的那一个吗？加油，骚年，欧力给！**

![](https://attach.52pojie.cn/forum/202211/06/184030ov7fidgxysh1ex71.png)
 **四、结束语**好了，微信小程序反编译教程+解包教程+解包工具的使用，已经为大家分享完毕；
**PS：**喜欢这个帖子的，动动你发财的贵手，点击 “评分” 按钮给个**免费**评分，**觉得这个帖子对你有用的，点击评分旁边的 “有用” 按钮，让更多人看到，谢谢！**
