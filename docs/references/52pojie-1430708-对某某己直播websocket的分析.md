# 对某某己直播websocket的分析

> **作者**: nws0507 | **发布时间**: 2021-04-30 11:10:00 | **版块**: 『移动安全区』 | **查看/回复**: 9282 / 38
> **原文**: [https://www.52pojie.cn/thread-1430708-1-1.html](https://www.52pojie.cn/thread-1430708-1-1.html)

---

*本帖最后由 nws0507 于 2021-4-30 15:14 编辑*

## 本文章只是出于对分析的记录和分享，不提供对应样本，请勿用于商业、违法用途

坛里对这个app的协议分析的很透彻了，但是没有发现对websocket的分析，这篇文章试着对websocket进行分析，了解他弹幕和广播等一些内容的传递。

### 脱壳

用葫芦娃大佬的[FRIDA-DEXDump](https://github.com/hluwa/FRIDA-DEXDump)进行脱壳，获取到源码。

### 查找关键类

因为我们要对websocket进行分析，因此全局搜索websocket，这里可以通过脱壳获取的源码直接搜索，也可以利用objection进行查找，两者结合效果更佳。
[![20210430014554916_2662.png](https://img.maocdn.cn/img/2021/04/30/20210430014554916_2662.png)](https://img.wang/image/5i6WM)
经过一番查找，终于找到了一个疑似类`com.qennnsad.aknkaksd.data.websocket.wsmanager.WsManager$2`
[![20210430014756853_15839.png](https://img.maocdn.cn/img/2021/04/30/20210430014756853_15839.png)](https://img.wang/image/5iTRl)

### 分析流程

因为之前抓包可以获得websocket的请求和响应，请求是明文的，很好分析。我们重点看一下响应包，响应包是字节码（**之后编写脚本发现并不是不可解析。。。**）
经过一番hook，响应message的处理重点在这几行
[![20210430015224486_21624.png](https://img.maocdn.cn/img/2021/04/30/20210430015224486_21624.png)](https://img.wang/image/5iGDV)

#### 第一步

这里的`hex()`是okio.ByteString.hex(),因为java没怎么接触过，大概意思好像是把okhttp3的响应转成字符串
[![20210430015539085_20180.png](https://img.maocdn.cn/img/2021/04/30/20210430015539085_20180.png)](https://img.wang/image/5i1gK)

#### 第二步

之后利用`com.facebook.common.util.Hex.decodeHex`这个方法把字符串转成字节数组。这一步的结果看得很蒙，但是我转化成python后发现很简单。。。
[![20210430015804544_29110.png](https://img.maocdn.cn/img/2021/04/30/20210430015804544_29110.png)](https://img.wang/image/5iBOD)
这是我转化后的python代码

```
def cut(obj, sec):
    return [obj[i:i+sec] for i in range(0, len(obj), sec)]

def hexdecode(arg):
    arg_arr = cut(arg, 2)
    # print(arg_arr)
    bt_arr = []
    for i in arg_arr:
        s = '0x'+i
        bt = int(s, 16)
        if bt >= 128:
            bt = bt-256
        bt_arr.append(bt)
    print(bt_arr)
```

转化的时候因为没怎么接触过java，`b = DIGITS[charAt])`一直没明白，按源代码直接翻译写，一直运行不成功，最后一对比输入`0b57020080aaaaaaea`和输出`11, 87, 2, 0, -128, -86, -86, -86, -22`才发现，就是把16进制转成了10进制，大于等于128的减去256。。。

#### 第三步

这一步卡了很久，`extractJsonDecompression`方法就在这个类里面
[![20210430020401865_11740.png](https://img.maocdn.cn/img/2021/04/30/20210430020401865_11740.png)](https://img.wang/image/5ih85)
这里的`BrotliInputStream`应该就是关键
[![20210430020502855_15097.png](https://img.maocdn.cn/img/2021/04/30/20210430020502855_15097.png)](https://img.wang/image/5i8dN)
经过百度后发现这是谷歌的一个新的压缩算法，主要用来优化html，js，css。
一开始我是还以为是原生的加密方法，盯了半天代码，结果一百度直接有实现方法。。。
网上copy的不知名demo

```
import brotlicffi as brotli
def press_demo():
    data = '{"type":"ping"}'.encode("utf-8")
    print(f"Compressing data: {data}")

    compressor = brotli.Compressor(mode=brotli.MODE_TEXT)
    compressed = compressor.process(data) + compressor.finish()
    print(f"Compressed data: {compressed}")

    decompressor = brotli.Decompressor()
    decompressed = decompressor.process(compressed) + decompressor.finish()
    print(f"Decompressed data: {decompressed}")
```

到这里，整个响应包的转化流程就分析完了，开始用py模拟websocket连接

### 白费功夫

在写完py代码才发现，这个响应包只是app又是解压，又是转码才能解析，事实上浏览器完全是明文，根本用不到上面的解密方法。。。
下面是实现的结果
[![20210430013810155_25602.png](https://img.maocdn.cn/img/2021/04/30/20210430013810155_25602.png)](https://img.wang/image/5iKt1)

### 总结

总共费了小半天功夫，结束时回想一下，走了很多弯路，对java的不熟悉浪费了很多时间，没有最开始直接用过浏览器模拟看看。当然也学到了很多，了解了br压缩算法，这里看了很久，发现这个app的ws没有限制权限，收费和密码房的ws也可以连接，虽然没什么卵用。
最后放一下py实现的源码吧，只需要设置一下自己的jwt\_token,user\_id和user\_name，填一下房间号就ok，具体获取方法就不细说了，翻翻之前坛子里的大佬们的文章应该就可以。代码只是一个demo，有bug就自己补补吧。
下载地址:
<https://wwa.lanzouj.com/ifn8wonva8b> 密码:6o0z
