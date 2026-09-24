# 【Fiddler为所欲为第二篇】像OD一样调试

> **作者**: 狂暴补师亚丝娜 | **发布时间**: 2019-01-25 12:45:00 | **版块**: 『编程语言区』 | **查看/回复**: 28611 / 53
> **原文**: [https://www.52pojie.cn/thread-858631-1-1.html](https://www.52pojie.cn/thread-858631-1-1.html)

---

*本帖最后由 狂暴补师亚丝娜 于 2019-1-25 13:27 编辑*

首先，如果大家没有看过第一篇，可以先看看第一篇，了解Fiddler script的脚本哦。
传送门：<https://www.52pojie.cn/thread-854434-1-1.html>

> 导语：
> 其实Fiddler隐藏的功能太多太多，其调试功能也是异常强大，可以说是抓包界的“[OllyDbg](https://www.52pojie.cn/thread-350397-1-1.html)”并不为过。接下来，教大家如何使用Fiddler进行调试、解析，甚至封包“逆向”！

**一、像OD一样定制菜单**

    1.1定制rule菜单的子菜单
> > >     // 定义名为52pj的子菜单
> > >     RulesString("&52pj", true);
> > >     // 生成52pj子菜单的radio选项
> > >     RulesStringValue(0,"安卓8.0", "52pj&狂暴补师亚丝娜&k=52pj")
> > >     RulesStringValue(1,"安卓9.0", "52pj&610100&k=52pj")
> > >     RulesStringValue(2,"安卓10.0", "52pj&didi科学家&k=52pj")
> > >     RulesStringValue(3,"安卓11.0", "52pj&CrazyNut&k=52pj")
> > >     RulesStringValue(4,"&Custom...", "%CUSTOM%")
> > >     public static var s52pj: String = null;
> >
> > > }
>
>
> 还需要在OnBeforeRequest函数中加入：

>    if (null != s52pj) {
>      oSession.oRequest["52pj"] = s52pj;

![](https://attach.52pojie.cn/forum/201901/25/122553e3cqsscluu81cd8q.png)

效果图：

![](https://attach.52pojie.cn/forum/201901/25/122449x5588avmamylllcv.png)

1.2定制tool菜单的子菜单

> > > public static ToolsAction("我是子菜单")
> > > function DoManualYules(){
> >
> > //子菜单的功能
> >      FiddlerObject.alert("我是子菜单"); // 根据需要定制
> > }

![](https://attach.52pojie.cn/forum/201901/25/122803pn9gan9rnfvgcf1n.png)

1.3定制右键菜单

> public static ContextAction("我是右键菜单")
> function DoOpenInIE(oSessions: Fiddler.Session[]){
>      FiddlerObject.alert("我是右键菜单"); // 根据需要定制
> }

右键菜单不好截图，就不截图啦~~~~
子菜单和右键菜单自己新建一个类就OK了。

**二、限速**
fiddler提供了一个功能，让我们模拟低速网路环境。启用方法如下：Rules → Performances → Simulate Modem Speeds。勾选之后，你会发现你的网路瞬间慢下来了很多。至于慢下来后网络速度是多少，则由CustomRules.js 中如下程序控制的：

> var m\_SimulateModem: boolean = true;
> ...
> if (m\_SimulateModem) {
>     // 500毫秒/KB（上传）
>      oSession["request-trickle-delay"] = "500";
> // 150毫秒/KB（下载）
>      oSession["response-trickle-delay"] = "150";
> }

**三、AutoResponder （自动替换功能）**
方法是点下Fiddler 右上的AutoResponder ，勾选Enable automatic responses 和Unmatched requests passthrough ，按下右边的Add ；再将下方的Rule Editor 第一行修改为线上档案位址（线上档案位址也可以使用Regular Expression ，开头加上regex: 即可。）
按下Rule Editor 第二行右边的箭头，选择Find a file ... ；选择要替换成的本机端档案，按下右边的SAVE ，大功告成！
![](http://static.oschina.net/uploads/img/201504/12015848_MAKK.png)
将线上档案替换成另一个线上档案，步骤几乎[一模一样](https://www.baidu.com/s?wd=%E4%B8%80%E6%A8%A1%E4%B8%80%E6%A0%B7&tn=24004469_oem_dg&rsv_dl=gh_pl_sl_csd)，差别仅在Rule Editor 第二行填入的是另一线上档案位址：
![](http://static.oschina.net/uploads/img/201504/12015848_Wiqd.png)
更多AutoResponder的说明请参考Fiddler官方文件- AutoResponder Reference 。
（PS：AutoResponder 这个网上有比较多的教程，我直接复制的了。）

**四：命令调试（和OD的命令调试操作基本相同）**
4.1替换 Request Host。
关键函数：urlreplace
比如：urlreplace [www.baidu.com](http://www.baidu.com) [www.360.com](http://www.360.com)
按下Enter ，所有原先发到百度的HTTP Request 就转发到360 了。

![](https://attach.52pojie.cn/forum/201901/25/123822ksgz891tprtwb5t4.png)

要清除转发，请在同一位置输入：urlreplace

另外script也可以做到：

> if ( oSession . HostnameIs ( 'www.baidu.com' ) )
>    oSession . hostname = 'www.360.com' ;

4.2 下断点（和OD、VS调试一样的哦）

> 命令介绍：
> bpu在请求开始时中断,
> bpafter在响应到达时中断,
> bps在特定http状态码时中断,
> bpv/bpm在特定请求method时中断。

如：
bpu [www.baidu.com/52pj/](http://www.baidu.com/52pj/)狂暴补师亚丝娜
这样既可在访问这个网址的时候自动下断点哦。

4.3Fiddler其他内置命令(4.3为转载）

* secret

> 选择所有相应类型（指content-type）为指定类型的HTTP请求，如选择图片，使用命令select image.而select css则可以选择所有相应类型为css的请求，select html则选择所有响应为HTML的请求（怎么样，是不是跟SQL语句很像？）。

* allbut

> allbut命令用于选择所有响应类型不是给定类型的HTTP请求。如allbut image用于选择所有相应类型不是图片的session(HTTP请求)，该命令还有一个别名keeponly.需要注意的是，keeponly和allbut命令是将不是该类型的session删除，留下的都是该类型的响应。因此，如果你执行allbut xxxx（不存在的类型），实际上类似与执行cls命令（删除所有的session, ctrl+x快捷键也是这个作用）

* ?text

> 选择所有 URL 匹配问号后的字符的全部 session

* >size 和 <size命令

> 选择响应大小大于某个大小（单位是b）或者小于某个大小的所有HTTP请求

* =status命令

> 选择响应状态等于给定状态的所有HTTP请求。

例如，选择所有状态为200的HTTP请求：=200

* @host命令

> 选择包含指定 HOST 的全部 HTTP请求。例如：@csdn.net

**五、“逆向”**
这里只能简单提及一下，当你发现下断点的网址过后，可以使用ctrl+F的方式，就行搜索该网址，既可看是什么接口返回的该地址，也就是简单的逆向！

最后：
熟练掌握Fiddler，能够[破解](https://www.52pojie.cn)爱奇艺、优酷等永久不失效的接口，也可薅羊毛（饿了么等），具体就要看大家的掌握程度了！破解游戏啥的就不说了。
**请记住：**
**抱歉，Fiddler玩得好，真的可以为所欲为！**
