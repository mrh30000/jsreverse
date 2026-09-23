# 对webview2 客户端资源爬取

> **作者**: 少年持剑 | **发布时间**: 2024-05-08 23:50:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 7954 / 29
> **原文**: [https://www.52pojie.cn/thread-1921927-1-1.html](https://www.52pojie.cn/thread-1921927-1-1.html)

---

*本帖最后由 少年持剑 于 2024-5-8 23:58 编辑*

某款软件代码和资源的提取，软件是基于webview2 的，网上没有看到webview2相关逆向的教程，所以发个贴记录一下。

**简单分析**

软件安装后只有一个exe文件，软件打开后界面风格很像一个网页

![](https://attach.52pojie.cn/forum/202405/08/233807ejhw3l7yhgn5ljf7.png)

X64dbg附加软件后，发现它加载了一个edge的dll

![](https://attach.52pojie.cn/forum/202405/08/233843j5k1ki244b5opf5z.png)

搜索后发现是使用webview2 后会使用的一个EmbeddedBrowserWebView.dll。

**WebView2**

WebView2控件使用微软的Edge作为渲染引擎，WebView2允许你在本地App里面嵌入web相关的技术（例如HTML，CSS和JavaScript）。

既然是web就要看能不能打开开发者工具了，进入微软webview2开发者文档，可以看到提供了一个[**OpenDevToolsWindow**](https://learn.microsoft.com/zh-cn/microsoft-edge/webview2/how-to/debug-devtools?tabs=win32cpp)函数来打开开发者工具

![](https://attach.52pojie.cn/forum/202405/08/233950xax6ulyvgxgsyfft.png)

Ida 打开EmbeddedBrowserWebView.dll ，加载符号文件，查看OpenDevToolsWindow，可以看到它是embedded\_browser\_webview\_current下的一个虚函数

![](https://attach.52pojie.cn/forum/202405/08/234031shzhmml9bkzukq5h.png)

查看微软提供的webview2的代码示例[Win32\_GettingStarted](https://github.com/MicrosoftEdge/WebView2Samples/blob/main/GettingStartedGuides/Win32_GettingStarted/HelloWebView.cpp)，可以看到它调用了一个Navigate函数来访问页面

![](https://attach.52pojie.cn/forum/202405/08/234210mldff9dlt6dk2l68.png)

Navigate函数也是embedded\_browser\_webview\_current下的一个虚函数，这里我通过修改虚表中Navigate的地址指向,
EmbeddedBrowserWebView.dll text段末尾空闲位置调用OpenDevToolsWindow

![](https://attach.52pojie.cn/forum/202405/08/234251yw8qabiqzziqv1wd.png)

X64dbg 打上补丁 ，替换dll
这时候开发者工具就会弹出来了。

![](https://attach.52pojie.cn/forum/202405/08/234519hbsn2m4rt2g0nn4r.png)

代码和资源提取

在开发者工具的源代码tab 导出所有的js文件和其它资源文件

![](https://attach.52pojie.cn/forum/202405/08/234705v1xz2ekkvnkwcvfc.png)

并记下它的虚拟域名

**环境搭建**

在之前的Win32\_GettingStarted gitclone下来，使用SetVirtualHostNameToFolderMapping设置虚拟域名并Navigate调用

![](https://attach.52pojie.cn/forum/202405/08/234906y74ii4lh56cd65lc.png)

编译运行后开发者工具中会有几个报错。根据工具报错的提示，到正常软件的开发者工具获取正常环境就行了。

![](https://attach.52pojie.cn/forum/202405/08/235841zvdkkr4gqvz2qgvo.png)

与开发者的工具的本地覆盖相比，提取出代码后js更容易修改和稳定，而且c++提供的操作也会更灵活。

EmbeddedBrowserWebView.dll 文件位于 **C:\Program Files (x86)\Microsoft\EdgeWebView\Application\124.0.2478.80\EBWebView\x64**  目录下，不同版本应该不通用

![](https://static.52pojie.cn/static/image/filetype/zip.gif)

[EmbeddedBrowserWebView.7z](https://www.52pojie.cn/forum.php?mod=attachment&aid=MjY5NDY3MXxhNTc3NmUxZXwxNzkwMTQwOTAzfDIzMjM3Mjd8MTkyMTkyNw%3D%3D)
*(1.58 MB, 下载次数: 143)*
