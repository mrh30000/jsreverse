# 对某网站进行webpack改写

> **作者**: QingYi. | **发布时间**: 2021-07-02 10:47:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5031 / 17
> **原文**: [https://www.52pojie.cn/thread-1469095-1-1.html](https://www.52pojie.cn/thread-1469095-1-1.html)

---

续写昨天的网站：<https://www.52pojie.cn/thread-1468829-1-1.html>
网易云这边已经有热心人士帮我把图片加进去了：<https://www.52pojie.cn/thread-1453411-1-1.html>

对付这种网站有三种方式：1.抠函数（太麻烦）  2.直接调用加密函数（标准的才行） 3.webpack改写

今天我们来记录一下webpack改写：

我们先把断点打好，具体怎么操作看我昨天的帖子。

我们断到加密的地方，然后点进去这个看

![](https://attach.52pojie.cn/forum/202107/02/095747b94x4e4yqjyj5i52.png)

我们可以看到，这边函数调用无限多的函数，去扣函数是不可能的

![](https://attach.52pojie.cn/forum/202107/02/095947mp23z48dnwdpzxw8.png)

我们直接把这个js整个复制出来，浏览器去运行

![](https://attach.52pojie.cn/forum/202107/02/100039lvrgss48ef4gi8ex.png)

其实他是一个一个的数组，里面有很多的对象，但是对象里面都是 有参数的（e,t,n） 我们不知道这个参数是从哪里来的，猜测，这个不是入口，应该是有别的js调用了他

![](https://attach.52pojie.cn/forum/202107/02/100220yrdojehelr3epitp.png)

我们找到他有很多js，我们先看第一个 runtime 进去看看

![](https://attach.52pojie.cn/forum/202107/02/100428djogo4d2djc8jb5s.png)

进来之后我们在这边打个断点去刷新一下我们的页面，他会在这边断下

![](https://attach.52pojie.cn/forum/202107/02/100604ofcihg8zc7jjm778.png)

我们一步一步的单步调试

![](https://attach.52pojie.cn/forum/202107/02/101132vlkvqlljdb8vvkz4.png)

然后会跳到这边，我们直接在return这边打个断点，然后直接跳到这个断点来

![](https://attach.52pojie.cn/forum/202107/02/101256s1hhubl4no8t9bt8.png)

我们可以看到这个r里面的值是不是和我们之前的那些值好像大同小异啊

![](https://attach.52pojie.cn/forum/202107/02/101457asdgexcddhs0hq0e.png)

然后我们继续单步调试，看到这边有一个call我们断下来（不懂call的可以百度学习一下）

![](https://attach.52pojie.cn/forum/202107/02/101857cg2uqnpeehbrnq4e.png)

进入函数

![](https://attach.52pojie.cn/forum/202107/02/102244g85lb5bklcf6flld.png)

我们可以看到他这个e调用了这个模块，我们看看这个e是什么个东西 点进去

![](https://attach.52pojie.cn/forum/202107/02/102408auqqcadtcci1huad.png)

我们进来之后，让他走一步，发现这个函数就是入口，是他在暗中作祟

![](https://attach.52pojie.cn/forum/202107/02/102528cnn6zeaa5baxp6ox.png)

大家可以自己一步一步来 单步调试，我就不调试了。

根据上面的分析，我们发现，如果要引用别的模块的话，必须调用这个函数

[JavaScript] *纯文本查看*

```
  function f(r) {
        if (n[r])
            return n[r].exports;
        var t = n[r] = {
            i: r,
            l: !1,
            exports: {}
        };
        return e[r].call(t.exports, t, t.exports, f),
        t.l = !0,
        t.exports
    }
```

我们模块有了，再把这个runtime拿出来
我们把两个全部提取出来

![](https://attach.52pojie.cn/forum/202107/02/102853t7a39wemrrreere3.png)

我们要去想，这玩意是局部变量，我们要怎么把它拿出来

![](https://attach.52pojie.cn/forum/202107/02/103014n2kkkbuo32vb6sq2.png)

我们在代码的最上面写一个变量 ：    var lt = null;

然后就赋值一下

![](https://attach.52pojie.cn/forum/202107/02/103248worw5wr9wqbzojww.png)

ok,我们现在去试一下好不好使

![](https://attach.52pojie.cn/forum/202107/02/103557as8w3h335ysstb3s.png)

但是不知道填什么值，怎么办，我们去找一下--------发现他是p去调用的

![](https://attach.52pojie.cn/forum/202107/02/103933kcggz352crxzgx5z.png)

p在哪？在上面

![](https://attach.52pojie.cn/forum/202107/02/104003mtm23ny72777zwmf.png)

到这里，本次教程结束

![](https://attach.52pojie.cn/forum/202107/02/104043x6jn12wzxwk89ke0.png)

后面的大家可以自己去写函数使用

把这一段拿过来

[JavaScript] *纯文本查看*

```
 Encrypt: function(l) {
                        var n = p.enc.Utf8.parse("t171420100302rsa")
                          , t = p.enc.Utf8.parse("t171420100302rsa")
                          , e = p.enc.Utf8.parse(l)
                          , a = p.AES.encrypt(e, n, {
                            iv: t,
                            mode: p.mode.CBC,
                            padding: p.pad.Pkcs7
                        });
                        return p.enc.Base64.stringify(a.ciphertext)
                    }
```

封装成函数，放在同一个文件里面，把l拿到。就可以了，具体怎么操作看我昨天的帖子就行。

有感而发：之前做算法题的时候，有人说：“很多高手不愿意写题解，因为自己懂了之后就进入下一题。如果要把怎么做给大家说一说，就要花费十几个小时去做”
大致意思是这样，今天我总算体会到了（又吹嘘了自己一番hh）
