# Windows抓包指南①：Proxifier+Fiddler对第三方程序强制抓包

> **作者**: encoderlee | **发布时间**: 2019-06-16 14:11:00 | **版块**: 『精品软件区』 | **查看/回复**: 23286 / 44
> **原文**: [https://www.52pojie.cn/thread-976016-1-1.html](https://www.52pojie.cn/thread-976016-1-1.html)

---

#### HOW & WHY

关于Fiddler抓包的文章在网上已经一搜一大把了，但大多数是讲对浏览器的抓包，主要用于分析WEB站点内容，而本文侧重于普通Windows桌面应用程序的HTTP/HTTPS抓包。

网上大部分文章，大多只告诉你How，没有告诉你Why。HTTPS不是加密的吗，为什么Fiddler还能抓到包？我按照网上的文章使用Fiddler抓包，为什么有的程序抓得到，有的程序抓不到？有的程序可以抓到，但是似乎只能抓到一部分，关键的HTTP请求都没有抓到，这是怎么回事？我们该怎么办？本文尽可能的把How和Why讲清楚，并通过后面不断的更新来完善它，在不断的学习和积累中，弄清楚更多东西，抓到更多的包。

#### 抓包的重要性

网络抓包，是软件逆向分析的重中之重，很多时候我们拿到一个软件，不知道从何入手分析，往往是从抓包开始，先弄清楚他与服务器通信的内容，如果一目了然，我们完全可以照搬，自行写一个程序来模拟，如果有一些加密字段和随机字段，也不用担心，我们可以从抓包中了解到一些关键的URL和session之类的信息，然后再分析代码的时候，这些字符串可以帮助我们更快的定位关键代码所在之处。

#### 趋势

现在的Windows桌面应用程序越来越喜欢直接在窗口上放一个Webbrowser或者CEF，直接使用HTML/CSS/Javascript构建用户界面，然后使用HTTP/HTTPS协议与服务器通信，如果该软件同时有WEB界面的话，更是可以直接复用同一个后端，这样使得客户端和服务端的开发效率大大提高，同时也有很好的移植型性。对于逆向分析者来说是好事，至少省去了自定义协议分析这一关，尤其是让人恶心的二进制协议。

#### Fiddler的使用

Fiddler简直是HTTP抓包分析的神器，比Chrome等浏览器自带的调试工具高不知道哪去了，浏览器自带的调试工具，基本只能查看包内容，而Fiddler除了查看，还可以针对不同类型的内容进行格式化，观赏效果真的不要太爽。除了“看”数据包，它还可以一键重发HTTP请求，修改请求内容并重发HTTP请求，拦截修改数据包，返回预设的欺骗性内容等，还可以编写脚本进行更高级的自动化处理。

废话不多说，到Fiddler官网下载安装：<https://www.telerik.com/fiddler>

![](https://attach.52pojie.cn/forum/201906/16/140651fknzz6ppupucbhk7.png)

对浏览器的抓包，就不再赘述，打开这个软件就一目了然了，本文主要讲对普通Windows桌面应用程序的抓包，点击左下角的两个小图标，让Fiddler进入抓包状态，而且作用于[All Processes]。实际上这相当于给windows设置了一个HTTP/HTTPS代{过}{滤}理，相当于在IE的 [Internet 选项] — [连接] — [局域网设置] — [高级] 中设置了代{过}{滤}理 [127.0.0.1:8888]，Fiddler在8888端口提供HTTP/HTTPS代{过}{滤}理服务。

![](https://attach.52pojie.cn/forum/201906/16/140713ivhz098lp6l3mepw.png)

接下来，我们要开启Fiddler的HTTPS抓包功能，否则只能看到HTTP请求的内容，而HTTPS请求则是密文。
在Fiddler中点击 [Tools] — [Options] — [HTTPS] 勾选如下设置：

![](https://attach.52pojie.cn/forum/201906/16/140732or991mlvflubbsy4.png)

点击 [Actions] — [Trust Root Certificate] 让系统信任Fiddler的根证书，这是HTTPS抓包解密的关键，Fiddler对HTTPS包解密的原理是中间人攻击，对客户端声称自己的服务端，对服务端声称自己的客户端，两头欺骗。当然要想欺骗成功，前提是让客户端信任自己的根证书。接下来就可以愉快的观看HTTPS请求明文内容了。

#### 抓包的条件

开启 [All Processes] 抓包后，我们运行第三方程序，会发现有的HTTP/HTTPS包可以抓到，有的抓不到，这是怎么回事？那是因为Fiddler的这种设置全局代{过}{滤}理的方式，只对以下几种情况有效：

* IE Chrome等浏览器
* 程序使用WinInet库进行HTTP/HTTPS通信
* 程序内嵌Webbrowser

这也很好理解，如果程序没有使用Windows提供的WinInet库进行HTTP通信，而是自带了一个库，比如VC程序使用libcurl，JAVA程序使用JDK中的URLConnection或第三方OkHttp，C#使用System.Net.Http等，这些库在程序内部实现了HTTP包的封装与拆解，那么最终他们将直接调用操作系统的socket api发送数据，操作系统当然就没法给他们设置HTTP/HTTPS代{过}{滤}理了。所以Fiddler在这里其实有很大局限性，但如果比较幸运，你要分析的第三方程序，使用WinInet通信或者内嵌了Webbrowser，你仍然可以这样对它进行HTTP/HTTPS抓包分析。

![](https://attach.52pojie.cn/forum/201906/16/140759a4w45g4r82rb8wvr.png)

一个典型的例子就是 [招商银行专业版] PC网银客户端，你可以用 [depends] 工具查看它是否依赖WININET.DLL，如果依赖，它很有可能使用它进行HTTP/HTTPS通信。

![](https://attach.52pojie.cn/forum/201906/16/140902dz3wuok3ww36t0dm.png)

也可以用VisualStudio自带的工具 [spy++] 查看是否内嵌Webbrowser控件，如果有内嵌，则Webbrowser中的内容可以用Fiddler抓包。

当然，有的程序也有例外，比如Python的requests包，如果你用Fiddler设置了全局代{过}{滤}理，而Python程序使用requests进行通信而没有在代码里设置HTTP/HTTPS代{过}{滤}理，则requests默认会使用系统全局代{过}{滤}理通信，从而能在Fiddler中看到Python程序的HTTP通信内容。至于其它编程语言和类库实现的程序，是否会被Fiddler设置的全局代{过}{滤}理影响，由于没法一一去测试，还需要大家的反馈，汇集结果。

#### 抓不到包怎么办

不满足上述条件的第三方程序，没法用Fiddler抓包，也许我们只能放弃。要知道有一句话叫“抓不住的流沙，学会放手，留不住的人心，学会忘记”。既然抓不住，说明她不属于你，那么无论你做什么事情都是无谓的，搞去搞来，最终你仅仅是感动了自己而已，对于她来说，你从头到尾什么都不是，无足轻重，也许离开你的她会更开心。但如果你确信她是你命中注定的那个包，就一定要把她抓住，没有条件就去创造条件，努力未必会成功，但不努力注定失败。那如何创造条件去抓住她的包呢？

#### 给它设置代{过}{滤}理

上面说到了，Fiddler抓包的原理是在本机的8888端口开启了HTTP/HTTPS代{过}{滤}理，任何通过Fiddler代{过}{滤}理的HTTP/HTTPS通信内容都会被解析，那么只要能给目标程序设置HTTP/HTTPS代{过}{滤}理，目标程序的HTTP通讯内容就会乖乖的出现在Fiddler里。

![](https://attach.52pojie.cn/forum/201906/16/140917i1zoo58g98h48ok9.png)

仔细查看软件设置，其实有些第三方软件比如 [百度网盘] 本身是可以设置HTTP/HTTPS代{过}{滤}理的，只要设置为Fiddler的代{过}{滤}理端口即可截获它的HTTP/HTTPS通讯内容。但是有的第三方软件就是没有代{过}{滤}理功能，怎么办？

#### 强行设置代{过}{滤}理

伟大领袖毛主席曾经说过：有条件要上，没有条件创造条件也要上！

既然它不支持设置代{过}{滤}理，我们就借助其它软件给它设置代{过}{滤}理，比如：
Proxifier： <https://www.proxifier.com>
SocksCap64：<https://www.sockscap64.com/sockscap64-official-homepage-chinese>

这两款软件都可以让任意程序通过HTTPS/SOCKS5代{过}{滤}理访问网络，其中SocksCap64使用黑科技API HOOK技术，HOOK了Windows Sockets API，然后把所有的TCP/UDP包通过代{过}{滤}理转发。而Proxifier则是正规军，使用了Windows提供的正规接口，通过安装WinSock LSP模块过滤/转发TCP/UDP包，当然此处还是推荐Proxifier，稳定性和兼容性更好。SocksCap64依赖API HOOK和DLL注入技术，但不是所有程序都随便给你注入的，比如腾讯TP保护下的游戏客户端，所以兼容性和可用性不如Proxifier。不过Proxifier是收费的商业软件，不过有30天免费试用，以及网上随便一搜一大把的激活码，你懂的。

接下来，我们拿 [网易有道词典] 开刀，强行给它设置代{过}{滤}理，看看它是怎么和服务器通讯的。

![](https://attach.52pojie.cn/forum/201906/16/140940juvbllldob3vpz8u.png)

在Proxifier中添加 [127.0.0.1:8888] 这个Fiddler提供的HTTPS代{过}{滤}理服务器

![](https://attach.52pojie.cn/forum/201906/16/140953t4g1vojg4g5wnr40.png)

设置Proxifier规则，让 [网易有道词典] 通过代{过}{滤}理访问网络

#### 一个重要的设置

![](https://attach.52pojie.cn/forum/201906/16/141106md8xk3r3pttjr8qw.png)

![](https://attach.52pojie.cn/forum/201906/16/141113bs2w2assswwszwww.png)

还有一点设置通常容易被忽略，就是在Proxifier中，设置 [Profile] — [Name Resolution] — 勾选 [Resolve hostnames through proxy]，让域名解析的工作交给代{过}{滤}理服务器，而不是在Proxifier上解析。默认情况下Proxifier自行解析域名，比如www.baidu.com解析为180.97.33.108，然后发请求给Fiddler：

> CONNECT 180.97.33.108:443 HTTP/1.1

这样Fiddler并不知道它请求的是哪个域名，于是返回给客户端的伪造证书时，伪造的是为180.97.33.108颁发的证书，有的客户端会做校验，发现这个证书是颁发给180.97.33.108的，而不是颁发给www.baidu.com的，然后报错处理。
修改Proxifier设置后，把域名解析的工作交给代{过}{滤}理服务器，Proxifier会直接向Fiddler发送请求：

> CONNECT www.baidu.com:443 HTTP/1.1

这样Fiddler就知道客户端请求的是 www.baidu.com，从而返回客户端伪造的www.baidu.com证书，客户端不报错，Fiddler才能顺利抓包解密。

#### 抓包效果

接下来就是对  [网易有道词典] 抓包的结果：

![](https://attach.52pojie.cn/forum/201906/16/141129b550xq1v7qqqmzjq.png)

#### Perfect！

所有HTTP通信内容历历在目，点击 [翻译] 按钮，它发送了什么内容，服务器返回什么内容清晰可见。接下来稍作分析，就可以用Python直接向这个URL发送HTTP请求，提交翻译文本，就可以拿到翻译结果了。

这下，你知道很多程序，官方没有提供API的情况下是怎么实现功能的了吧。当然有道翻译是提供了OpenAPI的，虽然API服务是收费的，但是并不贵。分析有道词典的通信协议其实意义并不大，但是分析其它各种各样的第三方软件呢，这么大的脑洞，就留给你来填吧，嘿嘿。。。

#### 未完待续

不要高兴得太早，如果所有程序都那么容易分析就好了，显示中你还会遇到各种各样莫名其妙的情况，有的第三方软件，你用这个方法去抓HTTP/HTTPS包，会出现一些意想不到的情况，比如程序表现为无法联网、功能不正常，Fiddler中抓到的HTTPS包仍然是加密的，无法解密，等等。这些问题需要根据情况一点一点去分析，在下一篇文章中，我们来讲一讲常见的一些无法抓包的异常情况，以及处理办法。。。

[《Windows抓包指南②：Fiddler抓不到的包是怎么回事？》](https://blog.csdn.net/CharlesSimonyi/article/details/90486208)

本文由encoderlee发表于CSDN博客：<https://blog.csdn.net/CharlesSimonyi/article/details/90383486> 转载请注明出处
