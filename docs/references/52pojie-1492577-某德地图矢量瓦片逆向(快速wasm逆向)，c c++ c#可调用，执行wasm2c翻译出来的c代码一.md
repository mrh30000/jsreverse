# 某德地图矢量瓦片逆向(快速wasm逆向)，c/c++/c#可调用，执行wasm2c翻译出来的c代码一

> **作者**: Frhvjhhv | **发布时间**: 2021-08-12 06:00:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 15599 / 38
> **原文**: [https://www.52pojie.cn/thread-1492577-1-1.html](https://www.52pojie.cn/thread-1492577-1-1.html)

---

本文仅供学习交流使用，如有侵权，联系我删除。
由于篇幅过长，本篇分析wasm的网页加载流程，下一篇分析如何

执行wasm2c翻译出来的c代码

一般来说对于webassmebly的逆向，有两种选择，一个是扣js在nodejs等含有wasm运行时的环境中运行（缺点需要wasm运行时），另一种就是分析算法，自己写算法（缺点是耗时时间长）。那么有没有一种不用分析算法且可以脱离wasm运行时的快速逆向方法呢？当然是有的。即执行wasm2c翻译出来的c代码，快速wasm逆向，c/c++/c#/python可调用，
我们打开高德地图，

![](https://attach.52pojie.cn/forum/202108/12/055528sosa4uwyra4wha7s.png)

看到如图所示的url，即矢量瓦片：

[Asm] *纯文本查看*

```
https://vdata04.amap.com/nebula/v3?key=bfe31f4e0fb231d29e1d3ce951e2c780&msg=7188355d0c44c5dabfd17b014f888bbf2321f2116e4354556cf52a9d7782368fadbd71091671a8ef05353af85941de664fc42793f4791a5029cb4a2342f3f7a3dc4b4432685cb09c6504dd1bd958c96d8f61f1098710c56cea2a50cac26c1a58&p=2
```

经过跟踪可以看到关键点：

[JavaScript] *纯文本查看*

```
b.prototype.bw = function(g, A, I, t, B, i, Q, C, e, o, E, h, a) {
            a = A.join(";"),
            a = this.parent.PW.transform('["' + a + '","' + E + '"]'),
            g = g + ("?key=" + this.parent.key) + "&msg=" + a，
        return g += "&p=2",
        makeFetchRequest(this.parent.Uh, g, function(A, i) {
            A ? h(A) : setTimeout(function() {
                l.pQ(i, B, I, C, e, Q, t, o, h, g)
            }, 10)
        })
    }
```

关键的句子是his.parent.PW.transform('["' + a + '","' + E + '"]'),即把经纬度坐标经过加密，然后访问url。跟进去

![](https://attach.52pojie.cn/forum/202108/12/055627psynzd13nsfzqukt.png)

就可以发现他是如何初始化wasm以及调用wasm的。
首先把那一大串base64编码的的字符串解码成buffer，然后调用

[JavaScript] *纯文本查看*

```
function initSync(A) {
        var i = {
            wbg: {}
        };
        return i.wbg.__wbg_new_59cb74e423758ede = function() {
            return addHeapObject(new Error)
        }
        ,
        i.wbg.__wbg_stack_558ba5917b466edd = function(A, i) {
            var g = passStringToWasm0(getObject(i).stack, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
              , i = WASM_VECTOR_LEN;
            getInt32Memory0()[A / 4 + 1] = i,
            getInt32Memory0()[A / 4 + 0] = g
        }
        ,
        i.wbg.__wbg_error_4bb6c2a97407129a = function(A, i) {
            try {
                console.error(getStringFromWasm0(A, i))
            } finally {
                wasm.__wbindgen_free(A, i)
            }
        }
        ,
        i.wbg.__wbindgen_object_drop_ref = function(A) {
            takeObject(A)
        }
        ,
        i.wbg.__wbindgen_throw = function(A, i) {
            throw new Error(getStringFromWasm0(A, i))
        }
        ,
        i = loadSync(A, i).instance,
        wasm = i.exports
    }
```

来加载wasm。其中i是wasm的导入函数，直接扣即可。
加载wasm之后调用了RSAPublicKeyPair函数，跟进去可以发现调用了wasm里面的rsapublickeypair\_new函数

![](https://attach.52pojie.cn/forum/202108/12/055826xtle5i6lu6q226jq.png)

紧接着执行了this.instance.init(),即调用了wasm里面的$rsapublickeypair\_init函数

![](https://attach.52pojie.cn/forum/202108/12/055759o4acy3mma8caql8y.png)

这上面均是RSA算法初始化的过程，即-加载wasm同时加载导入函数-初始化-加载RSA公钥

分析过RSA算法初始化的过程之后。我们来看看他是如何加密的‘

[JavaScript] *纯文本查看*

```
 function passStringToWasm0(A, i, g) {//A是待加密字符串,i是wasm里面的函数，g是前面rsapublickeypair_new函数返回的内存地址
        if (void 0 === g) {
            var I = cachedTextEncoder.encode(A)
              , t = i(I.length);
            return getUint8Memory0().subarray(t, t + I.length).set(I),
            WASM_VECTOR_LEN = I.length,
            t
        }
        for (var B = A.length, Q = i(B), C = getUint8Memory0(), e = 0; e < B; e++) {
            var o = A.charCodeAt(e);
            if (127 < o)
                break;
            C[Q + e] = o
        }
```

首先他把字符串变成了ascll格式，然后调用了i函数\_\_wbindgen\_malloc：

![](https://attach.52pojie.cn/forum/202108/12/055910s4mibpbggwwkgwzg.png)

从函数名字\_\_wbindgen\_malloc就可以看出，为待加密的字符串分配内存空间
然后C[Q + e] = o直接把加密的字符串写入内存。
之后调用了wasm.rsapublickeypair\_encode(8, this.UW, i, g)函数进行加密。参数 this.UW是前面rsapublickeypair\_new函数返回的内存地址，i是待加密的字符串分配内存空间的地址，g是加密的字符串长度

[JavaScript] *纯文本查看*

```
    up.prototype.encode = function(A) {
        try {
            var i = passStringToWasm0(A, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
              , g = WASM_VECTOR_LEN;
            return wasm.rsapublickeypair_encode(8, this.UW, i, g),
            getStringFromWasm0(I = getInt32Memory0()[2], t = getInt32Memory0()[3])
        } finally {
            var I = getInt32Memory0()[2]
              , t = getInt32Memory0()[3];
            wasm.__wbindgen_free(I, t)
        }
    }
```

加密之后取了uint8array内存地址为8和12处（对应 I=getInt32Memory0()[2], t = getInt32Memory0()[3])）的数，然后跟踪可以发现I,也就是内存地址8处的数即为加密后字符串的内存地址，内存12处即为加密后字符串的长度，有地址和长度，加密的字符串就出来了。。

接下来的流程可以不要，如果你是扣代码或者分析算法可以走，便于分析，如果执行wasm2c翻译出来的c代码,就不需要。
没有什么好说的，直接扣就行了。

如上图，扣完之后写了一个html，输入待价密字符串，点击按钮，就会在页面上写出加密的内容，为了便于调试，我们在wasm加载完成之后直接注入一些脚本

![](https://attach.52pojie.cn/forum/202108/12/055933ve0qlrr0veul4zlz.png)

这样在wasm的调试页面就直接可以搜索了，非常方便（这里感谢@jixun66）大神在我上个帖子评论区[https://www.52pojie.cn/forum.php ... 379690&pid=37592798](https://www.52pojie.cn/forum.php?mod=redirect&goto=findpost&ptid=1379690&pid=37592798)指出

![](https://attach.52pojie.cn/forum/202108/12/055958a93ss00ti4iuwhsl.png)
