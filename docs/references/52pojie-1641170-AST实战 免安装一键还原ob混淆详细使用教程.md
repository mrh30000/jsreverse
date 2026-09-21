# AST实战|免安装一键还原ob混淆详细使用教程

> **作者**: 悦来客栈的老板 | **发布时间**: 2022-05-26 09:48:00 | **版块**: 『编程语言区』 | **查看/回复**: 10869 / 26
> **原文**: [https://www.52pojie.cn/thread-1641170-1-1.html](https://www.52pojie.cn/thread-1641170-1-1.html)

---

*本帖最后由 正己 于 2022-5-26 15:51 编辑*

**一.项目地址**

免安装一键还原经Obfuscator混淆框架混淆过的js代码
[项目地址](https://github.com/Tsaiboss/decodeObfuscator)

**二.环境安装**

在nodejs官网下载最新稳定版并安装:

![](https://attach.52pojie.cn/forum/202205/26/093941ps9hn0rrp9hsnnqe.png)

下载地址:

nodejs官网下载
<https://nodejs.org/en/>

安装成功后，在命令行模式输入 node，如果有版本号显示，则表示安装成功。

![](https://attach.52pojie.cn/forum/202205/26/094225zhwybsfb698tyt8f.png)

**三.项目结构**

目录结构如下:

![](https://attach.52pojie.cn/forum/202205/26/094354h05ty8z00hyn1zvq.png)

* input文件夹，   存放ob混淆代码;
* output文件夹，存放还原后的代码;
* tools,存放打包的babel库以及部分还原的AST插件;
* main.js   运行主文件;

**四.运行看结果**

下载后解压，切换到 decodeObfuscator-main 目录，命令行模式下运行：

[JavaScript] *纯文本查看*

```
node main.js
```

运行时，会打印一些日志，结果文件在output文件夹，打开后是这样的:

![](https://attach.52pojie.cn/forum/202205/26/094605k9koqwj2qeq2zzwe.png)

至此，就将一段混淆非常严重的js代码，还原成了它原本的样子，做到了百分百还原。

希望各位大佬们不要吝惜你的star，帮忙点一个，感谢！
