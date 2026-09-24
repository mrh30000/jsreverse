# 【Fiddler为所欲为第三篇】封包逆向必备知识

> **作者**: 狂暴补师亚丝娜 | **发布时间**: 2019-01-28 14:13:00 | **版块**: 『编程语言区』 | **查看/回复**: 26010 / 34
> **原文**: [https://www.52pojie.cn/thread-859813-1-1.html](https://www.52pojie.cn/thread-859813-1-1.html)

---

*本帖最后由 狂暴补师亚丝娜 于 2019-1-28 14:16 编辑*

首先，大家如果还没看过之前两篇教程，可以顺便看看哦。
为所欲为第一篇：<https://www.52pojie.cn/thread-854434-1-1.html>
为所欲为第二篇：<https://www.52pojie.cn/thread-858631-1-1.html>

> 导语：
> > 小A同学：会抓包有什么好学习的，不就用一个工具设置个wifi代{过}{滤}理就OK了嘛，还不是很多做不了。不如学习安卓逆向。
> > didi科学家：不好意思，抓包可以为所欲为。
>
> 其实学习抓包，完完全全和OD是一模一样的逻辑，尤其是封包逆向。使用OD需要知道jmp等指令是什么意思，而抓包也是一样的逻辑！

一、封包字段的含义

![](https://attach.52pojie.cn/forum/201901/28/135039covgodhuu3o88boo.png)

如图所示，Fiddler的整个界面就是这样，那么这些字段究竟是什么意思呢？这里给大家说一下：
Result：HTTP状态码
Protocol：请求使用的协议，如HTTP/HTTPS/FTP等
HOST：请求地址的主机名或域名
URL：请求资源的位置
Body：请求大小
Caching：请求的缓存过期时间或者缓存控制值
Content-Type：请求响应的类型
Process：发送此请求的进程ID
Comments：备注
Custom：自定义值

二、Request区域
Request区域如图所示：

![](https://attach.52pojie.cn/forum/201901/28/135450gqpqw51wm2rarnaw.png)

那么每一个数据都是什么意思呢？
请求方式：GET/POST等
协议： HTTP/1.1（通常都是这个）
1. Cache 头域
　　if-Modified-since：缓存
　　if-None-Match：可提高性能（在Response中添加ETag信息，客户端再次请求资源，Request中加入if-None-Match（ETag的值），服务器验证ETag，若没改变返回状态码304，有改变，返回状态码200）
　　Pragma：防止页面被缓存
　　Cache-Control：Response—Request遵循的缓存机制
　　public：可以被任何缓存所缓存
　　private:内容只缓存在私有缓存中
　　no-cache：所有内容都不会被缓存
2. Client 头域
　　User-Agent: 告知服务器客户端使用的操作系统与浏览器的名称和版本
　　Accept: 浏览器端可以接受的媒体、文件类型
　　Accept-Encoding: 指定压缩方法，是否支持压缩，支持什么压缩方法（gzip、deflate）
　　Accept-Language: 浏览器申明自己的接收语言
　　Accept-chareset：浏览器申明自己接收的字符集。如gb2312，UTF\_8
3. Cookies 头域
　　有的请求不发送Cookies,有的请求有Cookies。
　　目的：将cookie值发送给服务器
 4. Entity头域
　　Content-Length：发送给HTTP服务器的数据长度
　　Content-Type：决定文件接收方将以什么形式、什么编码读取此文件
5. Security 头域：
　　Upgrade-Insecure-Requests: 1（默认，这个是自己协商的）
6. Transport 头域：
　　Host: 发送请求时，该报头域是必需的。主要用于指定被请求资源的Internet主机和端口号，通常从HTTP URL 中提取出来
　　Proxy-Connection: 当网页打开完成后，客户端和服务器之间用于传输HTTP数据的TCP连接是否关闭。keep-alive表示不会关闭，客户端再次访问这个服务器上的网页，会继续使用这一条已经建立的连接；close表示关闭，客户端再次访问这个服务器上的网页，需要重新建立连接。
　　connection：Keep—alive            TCP连接不会关闭
　　connection：close                     一个Request完成后，TCP连接关闭
7. Miscellaneous头域
　　Referer：提供了Request的上下文信息，告诉服务器我是从哪个链接过来的
　　A------>B（B的服务器从Referer中统计有多少用户是从A过来的）

三、Response
Response如图所示：

![](https://attach.52pojie.cn/forum/201901/28/135912nv971av7gz7zhz87.png)

1. Cache头域
　　Date：生成消息的具体时间和日期
　　Expires：浏览器在指定过期时间内使用本地缓存
2. Cookie/Login头域
　　P3P：用户跨域设置cookie，可以解决iframe跨域访问cookie的问题
　　Set-Cookie：重要的header，用于把cookie发送到客户端浏览器，每一个写入cookie都会生成一个set-cookie
3. Entity头域
　　ETag：与if-None-Match配合使用
　　Last-Modified：用于指示资源的最后修改日期和时间
　　Content-Type：Web服务器告知浏览器自己响应对象的类型和字符集
　　Content-Length：指明实体正文长度，以字节方式存储的十进制数字表示。在数据下行中，要预先在服务器中缓存所有数据，然后所有数据一并发给客户端
　　Content-Encoding：Web服务器表明自己用了什么压缩方式（gzip、deflate）压缩响应中的对象
　　Content-Language：服务器告知浏览器自己响应的对象语言
4. Miscellaneous头域
　　Server：指明HTTP服务器的软件信息
　　X-Powered-By：表明网站是用什么技术开发的
　　X-AspNet-Version：如果网站是用Asp/Net开发的，这个header用来表明Asp/Net的版本
5. Transport头域
　　connection：Keep—alive            TCP连接不会关闭
　　connection：close                     一个Request完成后，TCP连接关闭
6. Location头域
　　Location：用于重定向一个新的位置，包括新的URL地址

四、HTTP认证过程
　　1. 客户端发送HTTP Request给服务器；
　　2. Request中未包含Authorization header，服务器会返回一个401错误给客户端，且在Response中的header“www-Authenticate”中添加信息；
　　3. 客户端将用户名和密码以base64加密后，放在Authorization中发送给服务器，认证成功；
　　4. 服务器将Authorization header中的用户名和密码去除，进行验证。如果验证通过，将根据请求发送资源给客户端；
　　HTTP OAuth认证：OAuth对于http来说，就是放在Authorization header中的不是用户名密码，而是一个token（令牌）。
　　客户端的使用：客户端若要跟“使用基本认证的网站”进行交互，将用户名密码加载Authorization header中即可。

五、Fiddler常见图标的含义

![](https://attach.52pojie.cn/forum/201901/28/140158gnv8bl6hlo7uul3v.png)

本文部分转载：<https://www.cnblogs.com/Nick1994/p/8491631.html>
另有部分是收集于网络。

**预告：**
1、下篇为所欲为教大家如何抓取直播源。
2、橙色直播手机版：口袋电视即将推出，以及绿色无广告，无购物频道~~~（年前发布哟）
