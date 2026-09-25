# xhs  x-s x-s-common b1 算法

> **作者**: wxwyumu | **发布时间**: 2024-11-13 19:47:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6641 / 30
> **原文**: [https://www.52pojie.cn/thread-1981410-1-1.html](https://www.52pojie.cn/thread-1981410-1-1.html)

---

*本帖最后由 wxwyumu 于 2024-11-13 20:14 编辑*

**新人混个脸熟，我知道这个已经烂大街了，下次更新全网基本没有的，某书 web的 b1 和 profileData（gid）的教程**

**a1算法**
cookie我们发现，只需要里面a1+web\_session有值就能正常请求，先看看a1在哪里生成；搜索a1一个个去找，最后是在一个js文件里面，我们点击进去

![](https://attach.52pojie.cn/forum/202411/13/201100ns1scq09yynkyjp3.png)

然后发现a1是一个常量，我们直接搜这个常量，发现有set方法

![](https://attach.52pojie.cn/forum/202411/13/201108rvsusbz99kk8ukjh.png)

![](https://attach.52pojie.cn/forum/202411/13/201111w3qa4se0o4zkerpq.png)

然后就是把这个算法贴到本地，这个算法很简单就一些随机数啥的，直接运行本地js，发现差不多。调用接口也没问题。

![](https://attach.52pojie.cn/forum/202411/13/201113khsl5cdl5z11oxl0.png)

**x-s算法**
也是搜索，发现里面是调用了window.\_webmsxyw，是一个windos函数。

![](https://attach.52pojie.cn/forum/202411/13/201115hklwo28zylr2l81j.png)

从函数点进去，发现是一个被混淆的js，这个算法依赖三个参数，一个是请求url，一个是body，一个是a1；有两种处理方式，一种是补环境，一种是长链接调用。两种都试过，推荐还是用补环境的方式，长链接调用的方式a1是写死拓展性差。
第一步点进去直接把源码复制过去
第二步补环境即可

[JavaScript] *纯文本查看*

```
window = global;
delete global;
delete Buffer;

window.sdt_source_init = true
window.external = {}
window.Window = function () {
}
window.Image = function () {
}

canvas = {

    innerHTML: "",
    tagName: "",
    className: "",
    nodeName: {},
    contentWindow: {},
    getContext: function (arr) {
    },
    remove: function (arr) {
    },
    style: {
        position: {}, left: {}, fontSize: {}, fontStyle: {}, fontWeight: {}, letterSpacing: {}, lineBreak: {}, lineHeight: {},
        textTransform: "", textAlign: {}, textDecoration: {}, textShadow: {}, whiteSpace: {}, wordBreak: {}, wordSpacing: {}, fontFamily: {}
    },
    appendChild: function (arr) {
    },
    offsetWidth: function (arr) {

    },
    offsetHeight: function (arr) {
    },
}
document = {
    createElement: function (arr) {
        return canvas
    },
    documentElement: {},
    querySelectorAll: function () {
    },
    cookie: "a1"
}

navigator = {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) xxxx",
    platform: "Win32",
    webdriver: false,
}
screen = {}
localStorage = {
    getItem: function () {
    }
}
location = {
    host: "www.xxxxx.com"
}
history = {};
```

这是补环境的代码，把x-s那段混淆的js贴到下面就可以运行了

![](https://attach.52pojie.cn/forum/202411/13/201117i2a1y27sz73mpnab.png)

**x-s-common算法**
x-s-common就是对v值进行了加密编码等操作，v里面又有 x1~x10等等属性。这个跟a1一样扣算法就行了，就是比较难点

![](https://attach.52pojie.cn/forum/202411/13/201119up5qc88zcpnfaxxr.png)

![](https://attach.52pojie.cn/forum/202411/13/201125vxcx6qh9s06tddgz.png)

这样就完成了
