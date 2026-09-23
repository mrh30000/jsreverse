# WEB前端逆向JS RPC简介

> **作者**: scz | **发布时间**: 2024-08-29 14:54:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5469 / 19
> **原文**: [https://www.52pojie.cn/thread-1959338-1-1.html](https://www.52pojie.cn/thread-1959338-1-1.html)

---

创建: 2024-08-28 17:08

```
目录:

    ☆ 背景介绍
    ☆ JsRpcDemo
        1) Chrome访问目标URL
        2) 定制config.yaml
        3) 启动wsserver
        4) 准备wsclient环境
        5) 创建wsclient
        6) 查看当前连接的wsclient
        7) execjs接口远程执行js代码
        8) go接口远程调用预注册API
            8.1) 在wsclient中预注册API
            8.2) 其他组件远程调用预注册API
        9) JS RPC大致框架
       10) Mixed Content安全策略
    ☆ spa2.scrape.center
        1) execjs接口远程执行js代码
    ☆ 某TS PES NALU解密案例
```

☆ 背景介绍

本文以三个示例从易到难地演示一种名为JS RPC的技术。

参看

```
js逆向之远程调用(rpc)免去抠代码补环境
https://github.com/jxhczhl/JsRpc
https://github.com/jxhczhl/JsRpc/releases/download/v1.071/linux_amd64
https://github.com/jxhczhl/JsRpc/releases/download/v1.071/window_amd64.exe
https://github.com/jxhczhl/JsRpc/blob/main/config.yaml
https://github.com/jxhczhl/JsRpc/blob/main/resouces/JsEnv_Dev.js
```

☆ JsRpcDemo

完整测试用例打包

```
https://scz.617.cn/web/202408281708.txt
https://scz.617.cn/web/202408281708.7z
```

1) Chrome访问目标URL

```
python3 -m http.server -b 192.168.65.25 8080
http://192.168.65.25:8080/JsRpcDemo.html
```

Chrome访问URL，测试JsRpcDemo.html，F12确认一切正常。

JsRpcDemo.html中有个weird()函数，源自JsRpcDemo.wasm。本例不做wasm逆向工程，不猜weird()内部实现，假设内部实现复杂，现尝试用JS RPC技术远程调用之。

2) 定制config.yaml

```
#
# 侦听IP、PORT
#
BasicListen: "192.168.65.25:40080"
HttpsServices:
  #
  # 启用HTTPS/wss服务
  #
  IsEnable: true
  HttpsListen: "192.168.65.25:40443"
  PemPath: "192.168.65.25.crt"
  KeyPath: "flask.key"

#
# 当执行端(Chrome)没有返回值时，以秒为单位的等待超时
#
DefaultTimeOut: 30
#
# 关闭一些日志
#
CloseLog: false
#
# 关闭Web服务访问的日志
#
CloseWebLog: false
#
# release/debug/test，三种版本
#
Mode: release
#
# 开启CorsMiddleWare中间件
#
Cors: false
```

上面是我测试用的配置。启用wss时，需提供适当私钥、证书文件，许多人不想折腾这一步，但建议别怕麻烦。缺省配置未启用wss，只启用ws，侦听127.0.0.1:12080。若不想侦听127.0.0.1，又只启用ws，这种组合实战时不适用，涉及浏览器安全策略，后面还会提及。

3) 启动wsserver

```
wget https://github.com/jxhczhl/JsRpc/releases/download/v1.071/linux_amd64
chmod +x linux_amd64
./linux_amd64 -c config.yaml
```

启动wsserver，同时启用ws、wss。双击window\_amd64.exe启动wsserver，本质一样，只是用缺省配置。我习惯可控，显式指定配置文件启动wsserver。

许多教程用Windows版wsserver，不显式指定config.yaml，侦听127.0.0.1，有利有弊，根据自身水平、实际场景做选择，不勉强。即使用127.0.0.1，也可结合端口转发工具，比如Windows自带的netsh。

4) 准备wsclient环境

F12 Console中Copy/Paste输入JsEnv\_Dev.js内容。

若遭遇错误提示

Identifier XXX cannot be declared with var in current evaluation scope, consider trying let instead

可将XXX函数改成如下形式

```
XXX = function ...;
```

即Copy/Paste输入JsEnv\_Dev\_other.js内容。

5) 创建wsclient

F12 Console执行

```
/*
 * HTTP
 */
wsclient    = new Hlclient( "ws://192.168.65.25:40080/ws?group=somegroup&clientId=someclientid" );
```

---

```
/*
 * HTTPS
 */
wsclient    = new Hlclient( "wss://192.168.65.25:40443/ws?group=somegroup&clientId=someclientid" );
```

这一步会与wsserver建立通信。从应用层讲，HTTP与HTTPS的区别只在于ws、wss。group、clientId参数值任意，这里指定成什么，将来就用什么，匹配即可。

6) 查看当前连接的wsclient

新开Chrome或"curl -k"访问

```
http://192.168.65.25:40080/list
https://192.168.65.25:40443/list
```

应该看到响应

```
{"data":{"somegroup":["someclientid"]},"status":200}
```

7) execjs接口远程执行js代码

创建wsclient后，其他组件可通过JS RPC execjs接口在wsclient中执行js代码，比如:

```
weird('scz')
```

用CyberChef/URL Encode处理成

```
weird%28%27scz%27%29
```

新开Chrome访问

```
http://192.168.65.25:40080/execjs?group=somegroup&clientId=someclientid&code=weird%28%27scz%27%29
https://192.168.65.25:40443/execjs?group=somegroup&clientId=someclientid&code=weird%28%27scz%27%29
```

或

```
curl -k -X POST https://192.168.65.25:40443/execjs \
-H "Content-Type: application/json" \
-d '{
    "group"     : "somegroup",
    "clientId"  : "someclientid",
    "code"      : "weird(\"scz\")"
}'
```

应该看到响应

```
{"data":"da26...1c17","group":"somegroup","name":"someclientid","status":"200"}
```

execjs接口同时支持GET、POST

8) go接口远程调用预注册API

创建wsclient后，其他组件可通过JS RPC go接口远程调用在wsclient中预注册的API

8.1) 在wsclient中预注册API

F12 Console执行

```
wsclient.regAction( "weird", function ( resolve, param ) {
    let ret = weird( String( param ) );
    resolve( ret );
});
```

不少人将这几步混在一起演示

```
. 准备wsclient环境
. 创建wsclient
. 在wsclient中预注册API
```

实际上它们是不同阶段的不同概念。有些场景用execjs接口即可，预注册API只与go接口相关。换句话说，不是所有场景都得预注册API。

8.2) 其他组件远程调用预注册API

新开Chrome访问

```
http://192.168.65.25:40080/go?group=somegroup&clientId=someclientid&action=weird&param=scz
https://192.168.65.25:40443/go?group=somegroup&clientId=someclientid&action=weird&param=scz
```

或

```
curl -k -X POST https://192.168.65.25:40443/go \
-H "Content-Type: application/json" \
-d '{
    "group": "somegroup",
    "clientId": "someclientid",
    "action": "weird",
    "param": "scz"
}'
```

应该看到响应

```
{"data":"da26...1c17","group":"somegroup","name":"someclientid","status":"200"}
```

go接口同时支持GET、POST

9) JS RPC大致框架

```
F12 Console (wsclient) - linux_amd64 (中间件/wsserver) - Other WWW Client
```

F12通过ws/wss与linux\_amd64通信，其他WWW客户端通过HTTP/HTTPS与linux\_amd64通信。linux\_amd64扮演中间件或wsserver角色，其他WWW客户端与F12之间通过中间件建立通信。其他WWW客户端通过execjs或go接口在wsclient侧执行任务，execjs接口将js直接发往wsclient执行，go接口调用在wsclient中预注册的API。任务结果经中间件返回其他WWW客户端。

有预编译好的Linux、Windows版中间件。config.yaml指定中间件侦听的IP、PORT，是否支持HTTPS/wss，超时时间等。

new Hlclient会生成wsclient，wsserver即中间件。JsEnv\_Dev.js提供wsclient所需环境。

10) Mixed Content安全策略

若目标URL用HTTPS

```
https://192.168.65.25:8080/JsRpcDemo.html
```

"python3 -m http.server"不提供HTTPS支持，想测此情形，需自行提供HTTPS服务。

创建wsclient时必须用wss，不能用ws，后者会报错:

Mixed Content: The page at '<https://192.168.65.25:8080/JsRpcDemo.html>' was loaded over HTTPS, but attempted to connect to the insecure WebSocket endpoint 'ws://192.168.65.25:40080/ws?group=somegroup&clientId=someclientid'. This request has been blocked; this endpoint must be available over WSS.

这是浏览器安全策略所致。现实世界中，目标URL大概率是HTTPS，此时wsclient用wss肯定可行，要求中间件相应启用HTTPS/wss，需提供适当私钥、证书文件。

若中间件不方便启用HTTPS/wss，可用localhost绕过Mixed Content安全策略。假设目标URL是HTTPS，只要ws目标IP是127.0.0.1，就不必用wss。几乎所有演示都是这种，省事呗。

☆ spa2.scrape.center

推荐一本书

```
《Python 3网络爬虫开发实战(第二版)_崔庆才》
```

2024年3月时我还是WEB小白，从这本书开始接触WEB前端逆向的，没有捷径，跟着学一遍就是捷径。作者提供了不同知识点的练习站，相当于靶场，本节使用其中一个。

Chrome访问

```
https://spa2.scrape.center/
```

F12 Network/Fetch XHR，看到每一页Ajax都带token参数，形如:

```
https://spa2.scrape.center/api/movie?limit=10&offset=0&token=MjM2YmI2NzIzNzE2YzU1NzIyZjRjODYyYzFkODQ5NWYxOTU5MmE1OCwxNzI0NzMwMjE3
https://spa2.scrape.center/api/movie/?limit=10&offset=0&token=MjM2YmI2NzIzNzE2YzU1NzIyZjRjODYyYzFkODQ5NWYxOTU5MmE1OCwxNzI0NzMwMjE3
```

后者是前者的301。直接"curl -kLv"访问上述URL，得到401，服务端会校验token。

尝试通过XHR断点调用栈回溯找token如何生成:

```
F12 Sources XHR/fetch Breakpoints
Break when URL contains
?limit=10&offset=
```

断点命中时查看调用栈回溯。本例简单，注意到onFetchData()

```
/*
 * https://spa2.scrape.center/js/chunk-10192a00.243cb8b7.js
 */
onFetchData: function() {
    var t = this;
    this.loading = !0;
    //
    // this.page是页码，从1递增
    // this.limit等于10，一般不变
    // this.$store.state.url.index 是 '/api/movie'
    // a是offset，从0始，以limit步进
    // e即token
    //
    var a = (this.page - 1) * this.limit
      , e = Object(i["a"])(this.$store.state.url.index, a);
    //
    // 在此设断，命中后创建wsclient
    //
    this.$axios.get(this.$store.state.url.index, {
        params: {
            limit: this.limit,
            offset: a,
            token: e
        }
    }).then((function(a) {
        ...
    }
    ))
}
```

在onFetchData()中适当位置设断，命中后查看作用域中局部变量，e即token，由函数Object(i["a"])()生成，本例不分析该函数具体实现，假设该函数非常复杂，只知其in/out，现尝试用JS RPC技术远程调用Object(i["a"])()。

假设wsserver已启动，前述断点命中时，F12 Console中输入JsEnv\_Dev\_other.js内容，即将

function XXX ()

改成如下形式

```
XXX = function ...;
```

本例若不如此，可能遭遇如下错误提示

Identifier XXX cannot be declared with var in current evaluation scope, consider trying let instead

F12 Console执行

```
/*
 * HTTPS
 */
wsclient    = new Hlclient( "wss://192.168.65.25:40443/ws?group=somegroup&clientId=someclientid" );

wsclient.regAction( "PrivateGetToken", function ( resolve, param ) {
    let ret = Object(i["a"])( param.path, param.offset );
    resolve( ret );
});
```

regAction时无需将Object(i["a"])挂到全局对象window下，此非必要动作。

F12 Deactivate breakpoints (Ctrl-F8)，忽略所有断点
F12 Resume script execution (F8 或 Ctrl-)，继续执行

新开Chrome访问

```
http://192.168.65.25:40080/list
http://192.168.65.25:40080/go?group=somegroup&clientId=someclientid&action=PrivateGetToken&param={\"path\":\"/api/movie\",\"offset\":0}

https://192.168.65.25:40443/list
https://192.168.65.25:40443/go?group=somegroup&clientId=someclientid&action=PrivateGetToken&param={\"path\":\"/api/movie\",\"offset\":0}
```

或

```
curl -k -X POST https://192.168.65.25:40443/go \
-H "Content-Type: application/json" \
-d '{
    "group"     : "somegroup",
    "clientId"  : "someclientid",
    "action"    : "PrivateGetToken",
    "param"     : "{\"path\":\"/api/movie\",\"offset\":0}"
}'
```

本例PrivateGetToken()内部实现与时间戳相关，返回值每次都不同，要想实际爬取页面，必须编程实现，无法交互式测试，此处略。

1) execjs接口远程执行js代码

前述断点命中时，可不regAction，将来直接用execjs接口远程调用Object(i["a"])，只要创建wsclient即可。

新开Chrome访问

```
http://192.168.65.25:40080/execjs?group=somegroup&clientId=someclientid&code=Object(i["a"])("/api/movie",0)
https://192.168.65.25:40443/execjs?group=somegroup&clientId=someclientid&code=Object(i["a"])("/api/movie",0)
```

或

```
curl -k -X POST https://192.168.65.25:40443/execjs \
-H "Content-Type: application/json" \
-d '{
    "group"     : "somegroup",
    "clientId"  : "someclientid",
    "code"      : "Object(i[\"a\"])(\"/api/movie\",0)"
}'
```

将目标函数挂到全局对象window下，可换个好记的名字，除此之外，没啥实际意义。有人说TA碰上过作用域的问题，我未碰上过。原则是，非必要不外挂。

☆ 某TS PES NALU解密案例

参看

```
《WEB前端逆向TS PES NALU解密》
https://scz.617.cn/web/202408231518.txt
https://www.52pojie.cn/thread-1957747-1-1.html
```

Chrome访问

```
aHR0cHM6Ly9zcG9ydHMuY2N0di5jbi8yMDIwLzA5LzI3L1ZJREVHd3ZzZm9DbzhRbnplVFE5ZTUwbDIwMDkyNy5zaHRtbA==
```

已知vhs\_drm2.min.js中有解密函数XOR，进blob后生效。现尝试用JS RPC技术远程调用XOR。

```
/*
 * 调用XOR
 */
debugger;
switch (5 !== o.nalUnitTypeCode && 1 !== o.nalUnitTypeCode || u && "object" == typeof CNTVH5PlayerModule && (o.data = e.XOR(o.data, 1)),
```

Overrides vhs\_drm2.min.js，在switch前面加debugger，因为这段代码将来进blob执行，动态设断较麻烦，静态加debugger，省心。断点命中时，e.XOR即解密函数。

假设wsserver已启动，前述断点命中时，F12 Console中输入JsEnv\_Dev\_other.js内容。

准备好wsclient所需环境后，F12 Console执行

```
/*
 * HTTPS
 */
wsclient    = new Hlclient( "wss://192.168.65.25:40443/ws?group=somegroup&clientId=someclientid" );

wsclient.regAction( "PrivateXOR", function ( resolve, param ) {
    let buf = Uint8Array.from( atob( param ), c => c.charCodeAt(0) );
    let tmp = e.XOR( buf, 1 );
    let ret = btoa( String.fromCharCode( ...tmp ) );
    resolve( ret );
});
```

无需将e.XOR挂到全局对象window下

JS RPC是个概念上的RPC，没有负责序列化、反序列化的桩码，只能自己实现。为了远程传递Uint8Array，我用BASE64。

F12 Deactivate breakpoints (Ctrl-F8)，忽略所有断点
F12 Resume script execution (F8 或 Ctrl-)，继续执行

必须做上述两步，否则wsclient不能如期工作

新开Chrome访问

```
http://192.168.65.25:40080/list
http://192.168.65.25:40080/go?group=somegroup&clientId=someclientid&action=PrivateXOR&param=eQEBBgGgD3NVEBJO%2BHBJSuMyRRb%2FVnYa5EQkND9Kdmg%3D

https://192.168.65.25:40443/list
https://192.168.65.25:40443/go?group=somegroup&clientId=someclientid&action=PrivateXOR&param=eQEBBgGgD3NVEBJO%2BHBJSuMyRRb%2FVnYa5EQkND9Kdmg%3D
```

param值用CyberChef/URL Encode处理过，否则wsclient反序列化有问题。

或

```
curl -k -X POST https://192.168.65.25:40443/go \
-H "Content-Type: application/json" \
-d '{
    "group"     : "somegroup",
    "clientId"  : "someclientid",
    "action"    : "PrivateXOR",
    "param"     : "eQEBBgGgD3NVEBJO+HBJSuMyRRb/VnYa5EQkND9Kdmg="
}'
```

测试用的param是精心挑选过的，并非传任意值。一切正常的话，响应是

```
{"clientId":"someclientid","data":"eQEBBgGgD3NVEBJO+HBJSuMyRRb/VnYa5EQkND9Kdmg=","group":"somegroup","status":200}
```

表明，其他组件远程调用解密函数e.XOR成功。

之前提供过完整版ts\_decrypt.js，将其中的XOR()替换成相应的JS RPC实现，得到ts\_decrypt\_remote.js，不依赖本地wasm或h5.worker\_patch.js，较慢，但能用。

```
/*
 * 远程调用API
 *
 * buf即待解密数据，buf与ret都是Uint8Array，wsserver即
 *
 * https://192.168.65.25:40443/go
 */
async function PrivateXOR ( wsserver, buf ) {
    let param   = btoa( String.fromCharCode( ...buf ) );
    let data    = {
        "group"     : "somegroup",
        "clientId"  : "someclientid",
        "action"    : "PrivateXOR",
        "param"     : param,
    };
    data        = JSON.stringify( data );

    let headers = {
        'Cache-Control' : 'no-cache',
        'Content-Type'  : 'application/json',
    };

    let resp    = await post_html_k( wsserver, headers, data );
    let ret     = Uint8Array.from( atob( resp.data ), c => c.charCodeAt(0) );
    return ret;
}
```

目标函数形数、返回值是数字、字符串时，用execjs接口足矣。目标函数形参、返回值是复杂类型时，建议用go接口，需自己序列化、反序列化参数、返回值，比如前述XOR函数。理论上，仍可用execjs接口远程调用XOR，但几十KB的字符串，用execjs接口太不优雅了。
