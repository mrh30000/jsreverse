# [javascript][chrome插件]Circle 阅读助手 v3.1.2 逆向笔记

> **作者**: like御坂美琴 | **发布时间**: 2024-07-02 21:24:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5328 / 17
> **原文**: [https://www.52pojie.cn/thread-1940297-1-1.html](https://www.52pojie.cn/thread-1940297-1-1.html)

---

*本帖最后由 like御坂美琴 于 2024-7-2 21:35 编辑*

最终效果：仅本地替换资源

![](https://attach.52pojie.cn/forum/202407/02/212446y45u5sf5yk5nx1kn.png)

提示：先将影响调试的连接失败提示删掉

![](https://attach.52pojie.cn/forum/202407/02/212443kb394da3x3kbr9i8.png)

提示：请先将扩展插件下载到目录中后再进行操作
目标：寻找vip检测方式并篡改
随便一看，就找到了逆向切入点
从发送激活码激活的选项，观察网络界面，后台向服务器询问激活码

![](https://attach.52pojie.cn/forum/202407/02/212448gia5lbvzbzlyl44e.png)

![](https://attach.52pojie.cn/forum/202407/02/212451xo2vovhlv2n2eee1.png)

我在文件中搜索 user/regcode 并在 setting.js文件中搜索到了请求的源头

![](https://attach.52pojie.cn/forum/202407/02/212505ryyszzbzyaylkbka.png)

在根据then定位到l函数

![](https://attach.52pojie.cn/forum/202407/02/212454d1ttmmv15vt3uq1j.png)

敏锐地发现，Ct函数中const定义的几个变量都十分重要，所以都进行一个输出

![](https://attach.52pojie.cn/forum/202407/02/212456y9olz0ao969199yl.png)

可以看到user变量定义的就是当前用户的信息，果断注册了一个账号看看具体有什么
结构如此：

[JavaScript] *纯文本查看*

```

{
    uid: "1000",
    name: "Example",
    mail: "example@example.com",
    roles: [],
    is_logged_in: true,
    avatar: "",
    expire: ""
}[/size]
[size=2]
```

没有看到对vip的获取，也搜索不到有用信息，所以我回到html中查找线索。
一般作者代码的时候不会更改对一件事物的简称，我又从购买按钮的类上看到了“buy”的关键词，就到代码中搜索。果然，让我找到了判断vip的方式。

![](https://attach.52pojie.cn/forum/202407/02/212458gfxohzhmpph94iax.png)

这就简单了，往roles中添加member和premium的字符串就好了。
因为这是一个react程序，所有的数据都是要保存到app变量中的，我就每一次获取的时候都将user再次覆盖，发现只改表面不行，然后我又仿照获取用户登陆函数将用户数据同步，我就是“正经”vip用户了。

![](https://attach.52pojie.cn/forum/202407/02/212501i48zo64l65no2588.png)

![](https://attach.52pojie.cn/forum/202407/02/212503bcbo1zotdicittxx.png)

尊重原创，此文章仅供研究，请在下载修改插件后的24小时内删除

总用时一下午，正经逆向的时候还是走了点弯路，多花了半个小时读代码，有什么不懂得可以跟帖问，我看见就回
我主要玩vue和lithtml,对react的了解不深，所有这个修改的方法就是三板斧，但真好使
download：https://jjhxx.lanzn.com/iBlxN23co9wd
