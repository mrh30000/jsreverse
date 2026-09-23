# H5游戏（一）登录某某首富H5游戏之WebSockets初涉

> **作者**: 闷骚小贱男 | **发布时间**: 2022-04-29 23:21:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 24387 / 129
> **原文**: [https://www.52pojie.cn/thread-1629782-1-1.html](https://www.52pojie.cn/thread-1629782-1-1.html)

---

*本帖最后由 闷骚小贱男 于 2022-5-7 14:21 编辑*

## H5游戏（二）给游戏做内挂

[H5游戏（二）给游戏做内挂](https://www.52pojie.cn/thread-1631515-1-1.html)

## 前景

H5游戏可跨平台（PC、平板、手机、电视机等都可运行）
实际上他就是一个网页。。所以能打开网页的地方就可能能打开H5游戏（当然了，还有APP嵌套SDK+网页实现的那种）
几年前的农场\*\*，不知道大家用过没有，那种只有一个界面就可以实现自动帮你玩游戏的软件，简直是一款神器。
所以我也想着针对这一款H5游戏，弄一款不用看游戏界面就可以自动帮你玩的小软件。
【备注：图中因为要调试很多信息，所以用到了F12中本地替换JS文件的做法，来打印各种信息等】

## 开始分析

### 从wss连接找到切入点

打开网页，登录帐号，打开F12开发者模式，进入游戏。
抓包页面能看到一个wss的连接地址和端口，消息中全部都是二进制数据

![](https://attach.52pojie.cn/forum/202204/29/231609wvnwqircee9zqzlc.png)

从启动器中，能看到第一个可能是发送登录游戏的函数在main.min.js的86844行

![](https://attach.52pojie.cn/forum/202204/29/231618w0pp6adnrnrppr4s.png)

我们断点这个函数，刷新网页之后调试一番

### 分析sendCheckAccount

然后我们看到了如果已经连接wss的话，会执行sendCheckAccount函数

![](https://attach.52pojie.cn/forum/202204/29/231623ze8c87926uu6f6ey.png)

![](https://attach.52pojie.cn/forum/202204/29/231632tp933eah1h72ee7e.png)

那我们去打断点，找到一个`this.getBytes()`

![](https://attach.52pojie.cn/forum/202204/29/231638y1alsoezayywb1en.png)

#### getBytes

鼠标放在`this.getBytes`上，查看这个函数是什么

![](https://attach.52pojie.cn/forum/202204/29/231643vzsxk3pmpnligppi.png)

e实际上是一个空白DataView，再

```
        var e = ObjectPool.pop(t.CLASSNAME);
        e.clear(),
        e.writeInt(t.DEFAULT_TAG),        //常量52462
        e.writeInt(0),
        e.writeShort(0),
        e.writeShort(t.DEFAULT_CRC_KEY),        //常量30301
        e.writeInt(this.pid++);                        //每次都会+1
```

我们再查看sendCheckAccount后续对i参数的操作

#### 分析sendCheckAccount后续

```
        var i = this.getBytes();        //刚才已经看过了
        i.writeCmd(255, 1),
        i.writeInt(this._serverId),
        i.writeString(t),
        i.writeString(e),
        this.sendToServer(i),
        console.log("发送登录账号密码")
```

跳转一下writeCmd

```
    e.prototype.writeCmd = function (t, e) {
        this.writeByte(t),
        this.writeByte(e)
    },
```

再跳转看一下sendToServer函数

```
    t.prototype.sendToServer = function (t) {
        this.send(t),
        //省略一些//
    },
```

再看send

```
    t.prototype.send = function (e) {
        return this._socketStatus == t.STATUS_COMMUNICATION ? (this.sendPack(e), !0) : (console.log("发送数据时没和服务连接或者未进入通信状态"), !1)
    },
```

如果是链接状态，则sendPack(e)

```
    t.prototype.sendPack = function (e) {//e实际上 在易语言中就是字节集
        if (null == e || 0 == e.length)
            throw new egret.error("创建客户端数据包时数据不能为空！");
        var i = t.HEAD_SIZE;        //常量12
        e.position = 4,                        //设置位置是4
        e.writeInt(e.length - i);//写整数e.length - i
        var n = Encrypt.getCRC16ByPos(e, i);
        e.position = 8,                        //设置位置是8
        e.writeShort(n);                //写短整数n
        var o = Encrypt.getCRC16(e, i);
        e.position = 10;                //设置位置是10
        e.writeShort(o);                //写短整数o
        Encrypt.encode(e, 8, 4);
        this.socket_.writeBytes(e)        //发送给wss服务器e数据
    },
```

又发现两个新的函数Encrypt.getCRC16ByPos和Encrypt.getCRC16，分别跳转一下可发现（这个是CRC16校验吗？）
他俩都调用了CRC16.update，但是传参有所不同

```
    t.getCRC16ByPos = function (t, e, i) {
        return void 0 === e && (e = 0),
        void 0 === i && (i = 0),
        CRC16.update(t, e, i)
    },
    t.getCRC16 = function (t, e) {
        return void 0 === e && (e = 0),
        CRC16.update(t, 0, e)
    },
```

因为CRC16几乎都用到了，所以我们分析CRC16

```
var CRC16 = function () {
    function t() {}
    return t.update = function (e, i, n) {
        console.error('update的参数：',e,i,n);//手动添加的打印
        void 0 === i && (i = 0),
        void 0 === n && (n = 0);
        var o = 0,
        a = 0;
        0 == n && (n = e.length),
        e.position = i;
        for (var r = i; n > r; ++r)
            a = 255 & t.CRCBitReflect(e.readByte(), 8) ^ o >> 8 & 16777215, a &= 255, o = t.CRCTable[a] ^ o << 8 & 4294967040//,console.error('r',r,'a',a,'o的结果：',o);//手动添加的打印
                console.error('update的结果：',65535 & (0 ^ t.CRCBitReflect(o, 16)));//手动添加的打印
        return 65535 & (0 ^ t.CRCBitReflect(o, 16))
    },
    t.makeCRCTable = function () {
        for (var e = 0, i = new Array(256), n = 0; 256 > n; ++n) {
            e = n << 8 & 4294967040;
            for (var o = 0; 8 > o; ++o)
                e = 32768 & e ? e << 1 & 4294967294 ^ t.POLYNOMIAL : e << 1 & 4294967294;
            i[n] = e
        }
        return i
    },
    t.CRCBitReflect = function (e, i) {
                //console.error('CRCBitReflect的参数：',e,i);//手动添加的打印
        var n = 0,
        o = 0;
        i--;
        for (var a = 0; i >= a; ++a)
            o = i - a, 1 & e && (n |= 1 << o & t.DropBits[o]), e = e >> 1 & 2147483647;
                //console.error('CRCBitReflect的结果：',n);//手动添加的打印
        return n
    },
    t.POLYNOMIAL = 4129,
    t.CRCTable = t.makeCRCTable(),
    t.DropBits = [4294967295, 4294967294, 4294967292, 4294967288, 4294967280, 4294967264, 4294967232, 4294967168, 4294967040, 4294966784, 4294966272, 4294965248, 4294963200, 4294959104, 4294950912, 4294934528],
    t
}
();
```

CRC16.update一目了然，那么接下来，就可以实现用易语言模拟H5游戏的登录了吧

## 利用易语言实现模拟登录游戏

### 用到的模块

1、Buffer模块（有模块守护、用来读写DataView，某易论坛下载）
2、精易模块

### 先固定几个写死的函数

1、`sendToServer`（其实是sendPack）
2、`this.getBytes`
3、`Encrypt.getCRC16ByPos`和`Encrypt.getCRC16`（也就是`CRC16.update`）

| JavaScript位运算符 | 易语言 |
| --- | --- |
| ^ | 位异或 |
| ~ | 位取反 |
| & | 位与 |
| | | 位或 |
| << | 左移 |
| >> | 右移 |

### 易语言实现makeCRCTable

因为易语言的脚本组件好像不能传参字节集所以用js重写了CRCBitReflect，然后用脚本组件运行函数

![](https://attach.52pojie.cn/forum/202204/29/231657k26zad1oy2506wwd.png)

![](https://attach.52pojie.cn/forum/202204/29/231702znqwtiqwagwswzfq.png)

### Buffer实现getBytes、writeCmd、sendToServer等

用Buffer的设置偏移、写字节、写双精度浮点数、写文本、写短整数、写整数等方法构造函数

![](https://attach.52pojie.cn/forum/202204/29/231706btf1v33fmfsv8u3e.png)

![](https://attach.52pojie.cn/forum/202204/29/231733ole4zm3vv48qgkqf.png)

![](https://attach.52pojie.cn/forum/202204/29/231727xrao93mv2hv2jy3t.png)

### 用e2ee的WebSocket客户端类，绑定事件并连接wss服务器

浏览器抓包那里，我们能看到服务器的域名和端口

![](https://attach.52pojie.cn/forum/202204/29/231738jru7bn67a33perer.png)

### 登录之\_检测账户-sendCheckAccount

这个一直有个问题，不清楚为什么要点3次才会收到服务器返回的数据

![](https://attach.52pojie.cn/forum/202204/29/231745nssmmoa44zljvszm.png)

### 无法登录游戏，发现并没有这么简单

莫名其妙的发送了3次sendCheckAccount请求之后，易语言无法实现登录游戏。
继续步进调试浏览器才发现后面还有doRoleList（获取角色列表）、sendEnterGame（进入游戏）2个函数

### 同样的断点分析补上doRoleList、sendEnterGame

![](https://attach.52pojie.cn/forum/202204/29/231751f2hiphlqdmvmzm11.png)

![](https://attach.52pojie.cn/forum/202204/29/231808ytx3z37umksb9smr.png)

### 同理，断点分析私聊

![](https://attach.52pojie.cn/forum/202204/29/231812f30rymyy141yy7wv.png)

## 最终实现

1、用软件连接wss并登陆游戏并持续私聊某人

![](https://attach.52pojie.cn/forum/202204/29/231825tbw5tvvvvioww282.gif)

## 结尾

要想像当年的QQ农场那样全自动操作应该也是可以实现的
但是对于我这种小白来说...还是有点困难的

收工，睡觉，以后应该还会有相关H5游戏的小帖

## 补充

一直在想一个问题，服务器发送给客户端的信息是怎么判断哪一条是干嘛的，后续又对游戏断点才发现了一个函数`processRecvPacket`，可判断收到的信息是什么类型。

![](https://attach.52pojie.cn/forum/202204/30/133250v3vl5l0w9l9xylhj.png)

这样问题就解决了，。可以根据processRecvPacket拿到的t和i判断收到的数据是什么类型的数据，然后再拿到不同的数据，再执行相应的操作即可

![](https://attach.52pojie.cn/forum/202204/30/133903ehu7ho7sso5uhvsa.png)

## 实现发送私聊+接受私聊

理论上能实现所有手动能操作的操作。不清楚各位有没有什么更好的方法。

![](https://attach.52pojie.cn/forum/202204/30/140725fmx6jm66hn6hjhpk.gif)
