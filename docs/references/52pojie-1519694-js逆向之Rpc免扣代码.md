# js逆向之Rpc免扣代码

> **作者**: jxhczzz | **发布时间**: 2021-09-26 16:20:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 11252 / 45
> **原文**: [https://www.52pojie.cn/thread-1519694-1-1.html](https://www.52pojie.cn/thread-1519694-1-1.html)

---

*本帖最后由 jxhczzz 于 2021-9-27 09:44 编辑*

JsRpc
**js逆向之远程调用(rpc)免去抠代码**

**基本介绍**
    JsRpc是啥玩意？
    在网站的控制台新建一个WebScoket客户端链接到服务器通信，调用服务器的接口 服务器会发送信息给客户端
    客户端接收到要执行的方法执行完js代码后把获得想要的内容发回给服务器 服务器接收到后再显示出来

代码地址：https://github.com/jxhczhl/JsRpc

**目录结构**
    -- main.go (服务器的主代码) 编译后可食用
    -- JsEnv.js (客户端-网页上的js环境)

    -- win64-http-localhost.exe  我给你们编译好的文件 直接可以用 http本地版用这个
    -- win64-https-need-certificate.exe 我给你们编译好的文件 需要配证书使用 证书放当前路径(zhengshu.pem和zhengshu.key)就能用了
     那两个exe在releases中下载

    先把服务打开(编译后的go文件)

    粘贴JsEnv环境到网站控制台
    注入ws 控制台粘贴

[JavaScript] *纯文本查看*

```
var demo = new Hlclient("ws://127.0.0.1:12080/ws?group=test&name=test")
```

    注册一个方法 第一个参数hello为方法名，第二个参数为函数，resolve里面的值是想要的值，param是可传参参数，可以忽略

[JavaScript] *纯文本查看*

```
demo.regAction("hello", function (resolve,param) {
            var c="好困啊"+param

        resolve(c);

    })
```

**实现**
    说明：本方法可以https证书且支持wss  ,本地跑可以用ws 127.0.0.1

    在https的网站新建WebSocket连接如果是连接到普通的ws可能会报安全错误，好像连接本地(127.0.0.1)不会报错~ 可以用本地和wss 你自己看着玩

    1.无https证书者。直接编译main.go 我试了一下，发现使用本地ip(127.0.0.1)可以在https的网站直接连接ws使用 默认端口12080

    2.有https证书者。修改main.go文件 把r.Run()注释掉，把r.RunTls注释取消掉 并且参数设置证书的路径 直接输入名字就是当前路径 默认端口：12443

    另外的题外话，有域名没证书不会搞的 或者有域名有公网(非固定IP的)都可以搞成的，自己研究研究

食用方法

    打开编译好的go文件，开启服务

![](https://attach.52pojie.cn/forum/202109/26/160512hi9okomrolt6yhl0.png)

    有3个接口:
        /list是查看当前连接的ws服务
        /ws是浏览器注入ws连接的接口
        /go是获取数据的接口 (数据格式json: {"group":"hhh","hello":"好困啊yes","name":"baidu","status":"200"} )

    说明：接口用group和name来区分，我也不知道我为啥要抄两个名字来区分
    ws://127.0.0.1:12080/ws?group={}&name={}" //注入ws的例子 group和name都可以随便
    http://127.0.0.1:12080/go?group={}&name={}&action={}&#182;m={} //group和name填写上面注入时候的，action是注册的方法名,param是可选的参数

    步骤一：粘贴js环境

![](https://attach.52pojie.cn/forum/202109/26/160645whp9igsnp1imwcbo.png)

    步骤二：注入ws和方法

![](https://attach.52pojie.cn/forum/202109/26/160827hlg2if0lyzd0d946.png)

    步骤三：访问接口就能获得数据

![](https://attach.52pojie.cn/forum/202109/26/160901yrrj0ab6ax0xjbax.png)

    {"group":"hhh","hello":"好困啊yes","name":"baidu","status":"200"} 其中 hello是会变的 是action名字。 用代码访问的时候要注意这个名字

食用案例-爱锭网15题

    本题解是把它ajax获取数据那一个函数都复制下来，然后控制台调用这样子~

    1.f12查看请求，跟进去 找到ajax那块，可以看到call函数就是主要的ajax发包 输入页数就可以，那我们复制这个函数里面的代码备用

![](https://attach.52pojie.cn/forum/202109/26/160942syzg7ruzz8iy2zvi.png)

    2.先在控制台粘贴我的js环境，再注入一个rpc链接 注册一个call方法，名字自定义 第二个参数粘贴上面call的代码，小小修改一下
       先定义num=param 这样就传参进来了，再定义一个变量来保存获取到的数据，resolve(变量) 就是发送。完了就注入好了，可以把f12关掉了

![](https://attach.52pojie.cn/forum/202109/26/160945gwr0chwuwgwvjz0v.png)

    3.调用接口就完事了，param就是传参页数

![](https://attach.52pojie.cn/forum/202109/26/160947u05tc33wr3wz7ttp.png)

控制台可以关，但是注入的网页不要关哦
