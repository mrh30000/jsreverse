# Windows抓包指南②：Fiddler抓不到的包是怎么回事？

> **作者**: encoderlee | **发布时间**: 2019-06-16 18:54:00 | **版块**: 『精品软件区』 | **查看/回复**: 4254 / 2
> **原文**: [https://www.52pojie.cn/thread-976142-1-1.html](https://www.52pojie.cn/thread-976142-1-1.html)

---

#### 抓不住的HTTPS包

[《Windows抓包指南①：Proxifier+Fiddler对第三方程序强制抓包》](https://blog.csdn.net/CharlesSimonyi/article/details/90383486)

回顾上一篇文章，我们使用Proxifier将第三方程序的所有TCP流量导向Fiddler的HTTPS代{过}{滤}理，于是Fiddler便可以解析HTTP/HTTPS协议的通信内容，倒是在实际使用过程中，我们会发现HTTP请求解析没有问题，但是有的第三方程序，无法解析其HTTPS通信内容，表现为Fiddler中能看到Tunnel to 443端口，但是就没有下文了，同时，程序表现为无法联网，出错等提示，无法正常工作。

![](https://attach.52pojie.cn/forum/201906/16/185347td8qcnddo8n5yncc.png)

#### 分析原因

知己知彼，百战不殆。要搞清楚是怎么回事，最好的办法就是自己写一个程序，进行HTTPS请求，然后通过此方法抓自己的包，看看哪个地方出错。于是用最简单的Python代码进行测试：

```
import requests
requests.get("https://www.csdn.net")
```

然后用Proxifier+Fiddler对它强制抓包，发现Python程序抛出了异常，

> Traceback (most recent call last):
> File "C:\Python36\lib\site-packages\urllib3\contrib\pyopenssl.py", line 453, in wrap\_socket
> cnx.do\_handshake()
> File "C:\Python36\lib\site-packages\OpenSSL\SSL.py", line 1907, in do\_handshake
> self.\_raise\_ssl\_error(self.\_ssl, result)
> File "C:\Python36\lib\site-packages\OpenSSL\SSL.py", line 1639, in \_raise\_ssl\_error
> \_raise\_current\_error()
> File "C:\Python36\lib\site-packages\OpenSSL\_util.py", line 54, in exception\_from\_error\_queue
> raise exception\_type(errors)
> OpenSSL.SSL.Error: [('SSL routines', 'tls\_process\_server\_certificate', 'certificate verify failed')]

SSL证书验证错误，所以可以理解，其它第三方程序内部也应该抛出了异常，而无法正常联网，无法正常工作。之前说到，Fiddler之所以能抓到并解密HTTPS包的内容，是因为Fiddler使用了中间人攻击的手段，该手段要能成功实施，有一个前提条件，就是客户端信任Fiddler提供的根证书，之前我们通过 [Actions] — [Trust Root Certificate] 让系统信任Fiddler的根证书后，大部分浏览器以及基于WinInet库进行HTTP通信的程序，都会信任操作系统中我们添加的Fiddler根证书。但如果第三方程序使用其它HTTP库进行通信，比如VC程序使用libcurl，JAVA程序使用JDK中的URLConnection或第三方OkHttp，C#使用System.Net.Http，Python使用requests，这些HTTP库一般自带了一套可信任的SSL根证书，它们不使用操作系统自带的SSL根证书，更不会使用我们向操作系统中添加的Fiddler根证书，于是就验证出错了。
以Python为例，这一点可以在requests文档中得到证实：
<https://2.python-requests.org/en/master/user/advanced/#ca-certificates>

> Requests bundled a set of root CAs that it trusted, sourced from the Mozilla trust store. The certificates were only updated once for each Requests version.
>
> #### 解决办法
>
> 那么解决的办法有两种，一种是让HTTP客户端禁用证书验证：
>
> ```
> import requests
> requests.get("https://www.csdn.net", verify = False)
> ```
>
> 一种是让HTTP客户端信任Fiddler根证书

![](https://attach.52pojie.cn/forum/201906/16/185404jt90955e90cdw59s.png)

访问 <http://127.0.0.1:8888> 下载Fiddler根证书，用openssl转换成Python requests支持的格式：

> openssl x509 -inform der -in FiddlerRoot.cer -out fiddler.pem

让Python的HTTP客户端信任它：

```
import requests
requests.get("https://www.csdn.net", verify = "./fiddler.pem")
```

然后Fiddler就能顺利抓到该程序的HTTPS包并解密

#### 然并卵？

至此我们通过自己写程序，自己抓自己的包，搞清楚了为什么在抓第三方程序的时候，有的HTTPS包抓不到，也无法解密的原因，我们也找到了两种解决办法，一种是让目标程序禁用SSL验证，一种是让目标程序信任Fiddler根证书。
到这里，有的小伙伴就要吐槽了，我要抓的目标程序，又不是我写的，我也没有它的代码，怎么可能修改它，让它禁用SSL验证或者信任Fiddler根证书？

#### 有解

在分析目标程序的时候，我们通过反编译目标程序，大致搞清楚目标程序使用的是什么HTTP Client库，一般很少有程序会自行实现一个HTTP Client，大多是使用语言标准库自带的或者第三方开源的HTTP Client库。比如VC一般使用WinInet或WinHttp，C#一般使用System.Net.Http，Java一般使用URLConnection或OkHttp，基本都八九不离十，再结合反编译确定下来以后，通常这些HTTP Client都是开源的，即使不开源，那API都是公开的，我们不难找到这个库如何禁用SSL验证，如何信任指定根证书的方法。然后就可以通过反编译、重编译，APIHook，Dll注入，Shellcode等手段，让目标程序禁用SSL验证或信任Fiddler根证书。接下来就可以愉快的抓它的包，读它的心。

在后续文章中，我们将有针对性的举一些例子，来详解具体该怎么做。

本文由encoderlee发表于CSDN博客：<https://blog.csdn.net/CharlesSimonyi/article/details/90486208> 转载请注明出处
