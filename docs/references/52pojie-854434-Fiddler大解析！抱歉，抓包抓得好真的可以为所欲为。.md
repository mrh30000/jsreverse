# Fiddler大解析！抱歉，抓包抓得好真的可以为所欲为。

> **作者**: 狂暴补师亚丝娜 | **发布时间**: 2019-01-16 13:41:00 | **版块**: 『编程语言区』 | **查看/回复**: 166001 / 567
> **原文**: [https://www.52pojie.cn/thread-854434-1-1.html](https://www.52pojie.cn/thread-854434-1-1.html)

---

*本帖最后由 狂暴补师亚丝娜 于 2019-1-16 13:48 编辑*

说起抓包，很多人以为就是用个工具，简简单单地抓一下就可以了。
昨天在面试一个安卓逆向，直接告诉我【抓包没有技术含量】。
在这里，我必须发一个教程，解析一下抓包神器——Fiddler。
Fiddler仅仅是一个抓包工具？不好意思，Fiddler用得好，真的可以为所欲为。

**Fiddler的作者**

* Fiddler 的作者是 Eric Lawrence 是个大师级的人物， 目前在微软总部西雅图工作。 他的博客是: <http://www.ericlawrence.com/Eric/>
* 博客中能看到他的简历，以及一些生活照.

**Fiddler的介绍**

* Fiddler是强大的抓包工具，它的原理是以web代{过}{滤}理服务器的形式进行工作的，使用的代{过}{滤}理地址是：127.0.0.1，端口默认为8888，我们也可以通过设置进行修改。
* 代{过}{滤}理就是在客户端和服务器之间设置一道关卡，客户端先将请求数据发送出去后，代{过}{滤}理服务器会将数据包进行拦截，代{过}{滤}理服务器再冒充客户端发送数据到服务器；同理，服务器将响应数据返回，代{过}{滤}理服务器也会将数据拦截，再返回给客户端。
* Fiddler可以抓取支持http代{过}{滤}理的任意程序的数据包，如果要抓取https会话，要先安装证书。

![](https://static.52pojie.cn/static/image/hrline/1.gif)
这两点，希望大家牢记。接下来，给大家介绍Fiddler超级强大的地方之一——Fiddler Script.
论坛有很多Fiddler的使用教程，这里就不多说了。但是，却没有一个人说到最强大的脚本功能！

> Fiddler 包含了一个脚本文件可以自动修改Http Request 和Response.这样我们就不需要手动地下"断点"去修改了，实际上它是一个脚本文件CustomRules.js
> 位于: C:\Documents and Settings\[your user]\My Documents\Fiddler2\Scripts\CustomRules.js 下，你也可以在Fiddler 中打开CustomRules.js 文件，  启动Fiddler, 点击菜单Rules->Customize Rules...
> Fiddler Script 的官方帮助文档必须认真阅读， 地址是：<http://www.fiddler2.com/Fiddler/dev/ScriptSamples.asp>

**小常识：Fiddler Script 是用JScript.NET语言写的**
![](https://static.52pojie.cn/static/image/hrline/1.gif)
那么Fiddler Script到底有什么用？我这里来列举一些大家肯定遇到过的问题：

场景1：一个付费验证，是否付费会返回一个json。里面有一个时间戳和一个false。如果时间戳和客户端不一致，则为[破解](https://www.52pojie.cn)失败。
那么你一定会这么想，有没有一个功能，可以只替换json里面部分参数，然后返回给客户端，而不是全部写死呢？于是，我们需要使用到script了！代码如下：如一个json是这个内容，baidu.com，返回了一个【name:[吾爱破解](https://www.52pojie.cn)，付费:false】

> if (oSession.fullUrl.Contains("http://www.baidu.com"))
>          {
>
>              // 获取Response Body、Request Body中JSON字符串，转换为可编辑的JSONObject变量
>              var responseStringOriginal =  oSession.GetResponseBodyAsString();
>              var responseJSON = Fiddler.WebFormats.JSON.JsonDecode(responseStringOriginal);
>              var requestStringOriginal=oSession.GetRequestBodyAsString();
>              var requestJSON = Fiddler.WebFormats.JSON.JsonDecode(requestStringOriginal);
>              ){ //请求参数中，若type为1，对返回值做如下修改
>
>                  responseJSON.JSONObject['付费'] = "true";
>                  // 重新设置Response Body
>                  var responseStringDestinal = Fiddler.WebFormats.JSON.JsonEncode(responseJSON.JSONObject);
>                  oSession.utilSetResponseBody(responseStringDestinal);
>              }
>          }
> }

通过以上代码，即可每次在baidu返回数据时，自动将付费改为true，从而达到了破解的效果。

场景2：我想要修改request的Body里面的部分参数，每次下完断点，修改完再提交，总会网络超时或者APP超时。这该怎么办？难道只能靠手速？

>     if(oSession.uriContains("http://www.baidu.com"))
>     {
>         var strBody=oSession.GetRequestBodyAsString();// 获取Request 中的body字符串
>         strBody=strBody.replace("false","true");// 用正则表达式或者replace方法去修改string，将false改为true
>         FiddlerObject.alert(strBody);// 弹个对话框检查下修改后的body
>         oSession.utilSetRequestBody(strBody);// 将修改后的body，重新写回Request中
>     }

场景3：我想要修改cookie，改成一个付费过的cookie，但是需要实时生成，不能靠手速。这该怎么办？

>   if (oSession.HostnameIs('www.baidu.com') && oSession.uriContains('pagewithCookie') && oSession.oRequest.headers.Contains("Cookie"))
>      {
> var sCookie = oSession.oRequest["Cookie"];
>      //  用replace方法或者正则表达式的方法去操作cookie的string
>      sCookie = sCookie.Replace("付费=false", "付费=true");
>      oSession.oRequest["Cookie"] = sCookie;

场景4：我想要知道他到底有没有请求具体哪个网址，用查找速度太慢了。过滤也很慢。

> if (oSession.HostnameIs("www.baidu.com")) {
>             oSession["ui-color"] = "red";
>         }

场景5：我想要自动保存某个接口的数据到本地，怎么才能实现？

> if (oSession.fullUrl.Contains("www.baidu.com/playurl/v1/") ){
>                         oSession.utilDecodeResponse();//消除保存的请求可能存在乱码的情况
>                         var fso;
>                         var file;
>                         fso = new ActiveXObject("Scripting.FileSystemObject");
>                         //文件保存路径，可自定义
>                         file = fso.OpenTextFile("D:\\Sessions.txt",8 ,true, true);
>                         //file.writeLine("Response code: " + oSession.responseCode);
>                         file.writeLine("Response body: " + oSession.GetResponseBodyAsString());
>                         file.writeLine("\n");
>                         file.close();
>                 }

——————————————————————————————————————————————————————————————————————
以上就是Fiddler script经常使用到的功能，免费奉献给大家。直接复制即可使用。

Fiddler的脚本介绍到这里，那么，说到底Fiddler还是只能抓包啊，即使基于xpoesd能抓到https的包，还是发现有很多包抓不到啊！！！等等，本文还没完呢！
（**接下来的内容，公布过后，会涉及到技术滥用，因此，仅公布原理。**）
首先来讲https，也就是安卓APP证书这一款，目前论坛上已经有不少的朋友发了相关的一些程序，大家可以去下载。
如：<https://www.52pojie.cn/thread-854170-1-1.html>

但是，我个人比较倾向于just trust me这个插件，这是最全能的。just trust me是hook了安卓框架验证机制，更加棒~

————————————————————————————————————————————————————————
首先，大家抓包会遇到一个问题，为什么即使绕过了APP证书验证，为什么还是抓不到包！难道不是http协议？
其实并不是，APP大多数还是走的http协议，那为什么抓不到优酷的视频？抓不到关键的访问——原因在于此，代{过}{滤}理！

> 目前有非常多的APP，都为了防止被抓包，不仅仅是只用了https这么简单。而使用fiddler抓不到包，本质原因在于wifi代{过}{滤}理！很多APP会检测你是否用了wifi代{过}{滤}理，如果设置了，则APP无法正常使用。这样就会从根本上杜绝被抓包

那么，我们要怎么做才能防止这种情况的发生呢？
比较笨的一种办法依旧是使用xposed上的just trust me，依旧hook相关函数，即可破解该策略。

—————————————————————————————————————————————————————————
等等，我发现用了trust me过后，还是抓不到包，这到底是怎么回事！！！
非常简单，他们就是利用了本地服务器中转，这样的话Fiddler是抓不了包的。比如著名APP：麻花影视、电视家

那么，有没有办法能抓到这种操作的包呢？当然是有的。
这边只能透露几点，不能正大光明地公布，否则大量非法分子就可以破解非常多的APP了。

> 提示：Fiddler的本质其实就是代{过}{滤}理服务器，那么，如果是代{过}{滤}理服务器，所有的请求是不是都会走这台服务器呢？那是肯定的。

——————————————————————————————————————————————————————————
最后，抓包除了破解APP以外，还有什么用？
第一：抓接口，可以将所有的视频点播类APP都抓下来！
如麻花视频：
————————
> GET [http://api.acgplusplus.com/api/a ... &time=1547183436020](http://api.acgplusplus.com/api/app/video/ver2/user/clickPlayVideo_tv/7/1450?videoId=53913&time=1547183436020) HTTP/1.1

> Content-Type: application/json

> Accept: application/json

> accessToken: 936b8872c4f81b6537eaa80f4e2e78c7807cebbcb02548d8d4da1e55c61c6509

> X-Client-NonceStr: FbWu9jFnpG

> X-Client-IP: 127.0.0.1

> X-Client-TimeStamp: 1543592259810

> X-Client-Version: 1.1.1

> X-Client-Sign: 61274de99728b3981041d657bec4528b416658cd651110f9cf950dd3fbc0b15f

> X-Auth-Token: mb\_token:25361603:1211f5511483be1def9af655c10ede12

> X-Client-Token:

> Host: api.acgplusplus.com

> Connection: Keep-Alive

> User-Agent: okhttp/3.10.0

> Accept-Encoding: identity

——————————————————————————————————

这个接口大家可以用用，永不失效的接口！返回出来的地址就是这样。（大家可以直接用，哈哈，本来麻花视频也是盗版的）

再比如优酷的播放接口：

> GET <https://ups.youku.com/ups/get.json?ckey=>不公布，免得被盗用
> User-Agent: Youku;7.5.0;Android;6.0.1;MuMu
> Host: ups.youku.com
> Connection: Keep-Alive
> Accept-Encoding: gzip, deflate

这些接口，全都是永久有效的！

拥有抓包技术，你就可以自己制作任何的视频APP，调用第三方的接口即可！！！

另外楼主尝试过支付宝等相关APP，依旧能抓到部分的包。所以——
**抱歉，抓包抓得好真的可以为所欲为。**
