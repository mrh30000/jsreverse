# 阿里系cookie之acw_sc_v2 逆向分析

> **作者**: 中二 | **发布时间**: 2023-08-18 16:51:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 12130 / 29
> **原文**: [https://www.52pojie.cn/thread-1822807-1-1.html](https://www.52pojie.cn/thread-1822807-1-1.html)

---

*本帖最后由 wangguang 于 2023-8-18 16:54 编辑*

## 前言

### 声明

**本文只作学习研究，禁止用于非法用途，否则后果自负，如有侵权，请告知删除，谢谢！**

### 目标

网址：aHR0cHM6Ly93d3cuY2R0LWVjLmNvbS9ob21lL21vcmUtenlnZy5odG1s

目标：分析 Cookie `acw_sc__v2` 的生成逻辑

阿里系cookie 参数**acw\_sc\_\_v2** 是一个风控的基础算法，大多网站触发风控的话会出现阿里滑块acw\_sc\_\_v3。这个网站算是比较简单的一个网站，有个vv购物网站只要打开了开发者工具请求接口就会触发阿里滑块风控，就不拿那个例子举例了，因为其算法都是一样通用的。

## 正文

### 发包逻辑分析

打开fidder抓个包，刷新页面抓到了两个数据包。第一个数据包有个服务器返回的cookie，而且他的内容是一段ob混淆的js代码。

![](https://attach.52pojie.cn/forum/202308/18/163206eirrgiu9tj0iww4t.png)

![](https://attach.52pojie.cn/forum/202308/18/163300ufmm8sznv77gbs1c.png)

第二个数据包有两个cookie参数，其内容返回正常

![](https://attach.52pojie.cn/forum/202308/18/163317x086cxqbd9aqdhbn.png)

![](https://attach.52pojie.cn/forum/202308/18/163332tfo7ueu45lqqlube.png)

第二个数据包的cookie参数acw\_sc\_\_v2总不可能无故产生的，猜测其生成的地方在第一个数据包里面，在第一个数据包里面搜索acw\_sc\_\_v2，搜到了。果然有！

![](https://attach.52pojie.cn/forum/202308/18/163348gwtjuettvdvtwiow.png)

### acw\_sc\_\_v2生成逻辑

把cookie参数acw\_sc\_\_v2删掉，打开控制台刷新。

![](https://attach.52pojie.cn/forum/202308/18/163403fnrtsn8i7bz1x1tj.png)

有个反调试无限debugger，有很多方法可以过掉这个无限debugger，我这次使用的是把关键函数置空的方法。堆栈回溯到关键调用的地方。

![](https://attach.52pojie.cn/forum/202308/18/163417jkzdmdnlnq710q1g.png)

在315和316行打断点，然后刷新。注意是刷新，不是跳到下一个断点。

![](https://attach.52pojie.cn/forum/202308/18/163445eg10mr81vt0zzmt8.png)

当断点断在315行的时候执行\_0x4db1c()函数置空的方法

```
_0x4db1c = ()=>{}
```

把断点从315行跳到316行，执行定时器置空的方法。

```
setInterval= ()=>{}
```

无限debugger过了之后，用hook的方法在生成cookie的地方断下来，我们之前分析数据包的时候就已经找到了设置cookie的地方，但是并不确定是不是在那里生成的cookie。

hook cookie代码：

```
cookie_cache = document.cookie;
Object.defineProperty(document, "cookie", {
        get: function () {
            console.log(cookie_cache);
        // 在获取document.cookie时，执行你想要的操作
        return cookie_cache; // 返回原始的cookie值
    },
    set: function(value) {
        // 在设置document.cookie时，执行你想要的操作
        if(value.includes('acw_sc__v2')){
           debugger;
        }

    }
});
```

cookie被hook到了

![](https://attach.52pojie.cn/forum/202308/18/163627uf2r2co7vevavrcv.png)

回溯堆栈看看cookie生成的代码在哪里，reload函数是设置cookie的函数，但是并不是生成cookie的函数。cookie x 是由上面传下来的，还得回溯上去寻找生成x的函数。

![](https://attach.52pojie.cn/forum/202308/18/163822mqj4sbmb6cphymcp.png)

异步跟栈到了一个定时器函数。2秒后执行vm里面的reload(arg2)，reload不就是我们设置cookie的函数嘛，那么arg2有可能就是实参！

![](https://attach.52pojie.cn/forum/202308/18/163846k7rn2mtr3yi08nct.png)

![](https://attach.52pojie.cn/forum/202308/18/163901hd4nv8nzmdqngvu4.png)

在控制台打印了arg2，还真是cookie的值

![](https://attach.52pojie.cn/forum/202308/18/163914sokrit6h9ktttozt.png)

把arg2生成的代码扣下来，

```
arg2 = _0x23a392[_0x55f3('0x1b', '\x7a\x35\x4f\x26')](_0x5e8b26);
```

![](https://attach.52pojie.cn/forum/202308/18/163934u7o9oy47p4554op4.png)

把\_0x23a392的定义代码扣下来

```
var _0x23a392 = arg1[_0x55f3('0x19', '\x50\x67\x35\x34')]();
```

运行报错arg1未定义。

![](https://attach.52pojie.cn/forum/202308/18/164117yqwoz12qq2dirgd5.png)

搜索arg1在页面上就有，这个arg1经测试是可变的，需要每次从新的js代码用正则提取出来。

![](https://attach.52pojie.cn/forum/202308/18/164132t7d6ii1srvjdfjvv.png)

报\_0x55f3未定义，在浏览器执行\_0x55f3('0x19', '\x50\x67\x35\x34')是字符串"unsbox"

![](https://attach.52pojie.cn/forum/202308/18/164148e7kderxe00deux9c.png)

![](https://attach.52pojie.cn/forum/202308/18/164200d0ng127g1gigkyyq.png)

去浏览器把函数扣下来吗，但是代码是混淆过的，运行报了很多错误。手动解混淆

![](https://attach.52pojie.cn/forum/202308/18/164217l6u6zsaawwu49s8x.png)

'\x70\x72\x6f\x74\x6f\x74\x79\x70\x65'—>"prototype"
\_0x55f3('0x14', '\x5a\x2a\x44\x4d')—>"unsbox"
'\x6c\x65\x6e\x67\x74\x68'—>"length"
\_0x55f3('0x16', '\x61\x48\x2a\x4e')—>"length"
'\x6a\x6f\x69\x6e'—>"join"

解完混淆后的代码

```
String["prototype"]["unsbox"] = function() {
    var _0x4b082b = [0xf, 0x23, 0x1d, 0x18, 0x21, 0x10, 0x1, 0x26, 0xa, 0x9, 0x13, 0x1f, 0x28, 0x1b, 0x16, 0x17, 0x19, 0xd, 0x6, 0xb, 0x27, 0x12, 0x14, 0x8, 0xe, 0x15, 0x20, 0x1a, 0x2, 0x1e, 0x7, 0x4, 0x11, 0x5, 0x3, 0x1c, 0x22, 0x25, 0xc, 0x24];
    var _0x4da0dc = [];
    var _0x12605e = '';
    for (var _0x20a7bf = 0x0; _0x20a7bf < this["length"]; _0x20a7bf++) {
        var _0x385ee3 = this[_0x20a7bf];
        for (var _0x217721 = 0x0; _0x217721 < _0x4b082b["length"]; _0x217721++) {
            if (_0x4b082b[_0x217721] == _0x20a7bf + 0x1) {
                _0x4da0dc[_0x217721] = _0x385ee3;
            }
        }
    }
    _0x12605e = _0x4da0dc["join"]('');
    return _0x12605e;
}
```

报\_0x55f3未定义，在浏览器执行\_0x55f3('0x1b', '\x7a\x35\x4f\x26')是字符串"hexXor"

![](https://attach.52pojie.cn/forum/202308/18/164237tiembz7w387bxm8p.png)

运行报错\_0x5e8b26未定义

![](https://attach.52pojie.cn/forum/202308/18/164252fm3efmzlmf2mqrrl.png)

\_0x5e8b26是一段字符串"3000176000856006061501533003690027800375"

![](https://attach.52pojie.cn/forum/202308/18/164305l9bxib9fbxy3nbn6.png)

\_0x23a392.hexXor函数未定义

![](https://attach.52pojie.cn/forum/202308/18/164327mtdy7lond7ev797n.png)

在控制台打印\_0x23a392.hexXor函数双击进入函数内部

![](https://attach.52pojie.cn/forum/202308/18/164346y7p8yymlpsyl6277.png)

代码是混淆过的，运行报了很多错误。手动解混淆

\_0x55f3('0x5', '\x6e\x5d\x66\x52')—>"prototype"
\_0x55f3('0x6', '\x50\x67\x35\x34')—>"hexXor"
\_0x55f3('0x8', '\x29\x68\x52\x63')—>"length"
\_0x55f3('0xb', '\x56\x32\x4b\x45')—>"slice"
\_0x55f3('0xd', '\x58\x4d\x57\x5e')—>"slice"
\_0x55f3('0xf', '\x57\x31\x46\x45')—>"toString"
\_0x55f3('0x11', '\x4d\x47\x72\x76')—>"length"
\_0x55f3('0xa', '\x6a\x45\x26\x5e')—>"length"

解完混淆后的代码：

```
String["prototype"]["hexXor"] = function(_0x4e08d8) {
    var _0x5a5d3b = '';
    for (var _0xe89588 = 0x0; _0xe89588 < this["length"] && _0xe89588 < _0x4e08d8["length"]; _0xe89588 += 0x2) {
        var _0x401af1 = parseInt(this["slice"](_0xe89588, _0xe89588 + 0x2), 0x10);
        var _0x105f59 = parseInt(_0x4e08d8["slice"](_0xe89588, _0xe89588 + 0x2), 0x10);
        var _0x189e2c = (_0x401af1 ^ _0x105f59)["toString"](0x10);
        if (_0x189e2c["length"] == 0x1) {
            _0x189e2c = '\x30' + _0x189e2c;
        }
        _0x5a5d3b += _0x189e2c;
    }
    return _0x5a5d3b;
}
```

再次运行结果出来了，拿去postman测试一下。

![](https://attach.52pojie.cn/forum/202308/18/164404h343bjxe01ccxxlh.png)

第一次请求

![](https://attach.52pojie.cn/forum/202308/18/164419m9obg8bgo989z5gc.png)

携带代码生成的cookie请求，网站正常显示出来了

![](https://attach.52pojie.cn/forum/202308/18/164432tg8f4b3egx53gvh8.png)

## 外传—>浅谈\_0x55f3解混淆函数算法还原

仅仅只是我在调试的时候的一些坑，这些都是外面文章没有的点。比如硬扣\_0x55f3，\_0x55f3我个人猜测是一个解混淆的一个函数。

在扣\_0x5e8b26我就进入到\_0x55f3去扣，复现一下步骤吧

把断点下到172那行，重新刷新页面过掉debugger,进入函数内部

![](https://attach.52pojie.cn/forum/202308/18/164538n22lu26hlukokcuk.png)

把代码扣下来执行，报了个不知道是什么的错。好像是溢出

![](https://attach.52pojie.cn/forum/202308/18/164554uq63bb9d3ovg28js.png)

把\_0x55f3解混淆之后可以看到他有几个分支，在浏览器看看她走的哪个分支。

![](https://attach.52pojie.cn/forum/202308/18/164616l9jwjtwcqqvtkjhk.png)

![](https://attach.52pojie.cn/forum/202308/18/164630ogfencjhoykojcnk.png)

前四个分支都是false，于是只走了\_0x48181e = \_0x55f3["data"][\_0x4c97f0];前面的分支都可以删掉了

在浏览器打印\_0x55f3["data"]是个大数组，而\_0x5e8b26传进去的\_0x4c97f0是3，而\_0x55f3["data"][3]刚刚好就是"3000176000856006061501533003690027800375"

![](https://attach.52pojie.cn/forum/202308/18/164647t7xpknh2pqf2d26x.png)

![](https://attach.52pojie.cn/forum/202308/18/164713u50yb43lw405rzv5.png)

那么再看看其他的，像上面的"unsbox"跟"hexXor"和"length"都在数组里面，最简单的方法就是取最后生成完的大数组，然后把坐标丢数组里面去取就完事了。

![](https://attach.52pojie.cn/forum/202308/18/164727mp2k93cr91492z1k.png)

以上就是初步分析(在\_0x5e8b26赋值的地方进入函数前四个分支都是false的情况)，还有第二种情况。

在204这行下断点。重新进入页面去掉无限debugger然后进入函数内部

![](https://attach.52pojie.cn/forum/202308/18/164743d3uaffsf7d22f3z2.png)

也跟之前一样看看进入哪个分支

![](https://attach.52pojie.cn/forum/202308/18/164756k3ja78i2jt7f6mtd.png)

这一次进入的是第四个分支，把前三个分支删了

![](https://attach.52pojie.cn/forum/202308/18/164807ymd6dmbbcqb6t779.png)

第四个分支的第一个分支也删了

![](https://attach.52pojie.cn/forum/202308/18/164821py3hh97fh6hidkl9.png)

解完混淆的代码只剩下这些了

![](https://attach.52pojie.cn/forum/202308/18/164834t82782b7hrzwm177.png)

在浏览器一直单步执行，准备进入\_0x55f3["rc4"]函数内部

![](https://attach.52pojie.cn/forum/202308/18/164848p8fy4q4w8uu42uyh.png)

\_0x55f3["rc4"]函数就是\_0x232678函数，把这个函数扣下来

![](https://attach.52pojie.cn/forum/202308/18/164903x33ia9plgd5daji6.png)

再把\_0x4818从浏览器扣下来然后把无关紧要的\_0x55f3["data"][\_0x4c97f0] = \_0x48181e删掉，因为我们直接调用就没必要把他存起来了。

然后解码函数\_0x55f3就可以调用了。因特殊原因，解密函数就不能分享给大家了，大家按照我的思路去走绝对可以还原出解密函数的。

![](https://attach.52pojie.cn/forum/202308/18/164920fkg77h0kgl0deygs.png)

## AST解密的js代码

```
var arg1 = "4CD777C77BD9A85B0A7911CE02E9D0D00B4D6694";
var _0x4818 = [
    "csKHwqMI",
    "ZsKJwr8VeAsy",
    "UcKiN8O/wplwMA==",
    "JR8CTg==",
    "YsOnbSEQw7ozwqZKesKUw7kwX8ORIQ==",
    "w7oVS8OSwoPCl3jChMKhw6HDlsKXw4s/YsOG",
    "fwVmI1AtwplaY8Otw5cNfSgpw6M=",
    "OcONwrjCqsKxTGTChsOjEWE8PcOcJ8K6",
    "U8K5LcOtwpV0EMOkw47DrMOX",
    "HMO2woHCiMK9SlXClcOoC1k=",
    "asKIwqMDdgMuPsOKBMKcwrrCtkLDrMKBw64d",
    "wqImMT0tw6RNw5k=",
    "DMKcU0JmUwUv",
    "VjHDlMOHVcONX3fDicKJHQ==",
    "wqhBH8Knw4TDhSDDgMOdwrjCncOWwphhN8KCGcKqw6dHAU5+wrg2JcKaw4IEJcOcwrRJwoZ0wqF9YgAV",
    "dzd2w5bDm3jDpsK3wpY=",
    "w4PDgcKXwo3CkcKLwr5qwrY=",
    "wrJOTcOQWMOg",
    "wqTDvcOjw447wr4=",
    "w5XDqsKhMF1/",
    "wrAyHsOfwppc",
    "J3dVPcOxLg==",
    "wrdHw7p9Zw==",
    "w4rDo8KmNEw=",
    "IMKAUkBt",
    "w6bDrcKQwpVHwpNQwqU=",
    "d8OsWhAUw7YzwrU=",
    "wqnCksOeezrDhw==",
    "UsKnIMKWV8K/",
    "w4zDocK8NUZv",
    "c8OxZhAJw6skwqJj",
    "PcKIw4nCkkVb",
    "KHgodMO2VQ==",
    "wpsmwqvDnGFq",
    "wqLDt8Okw4c=",
    "w7w1w4PCpsO4wqA=",
    "wq9FRsOqWMOq",
    "byBhw7rDm34=",
    "LHg+S8OtTw==",
    "wqhOw715dsOH",
    "U8O7VsO0wqvDvcKuKsOqX8Kr",
    "Yittw5DDnWnDrA==",
    "YMKIwqUUfgIk",
    "aB7DlMODTQ==",
    "wpfDh8Orw6kk",
    "w7vCqMOrY8KAVk5OwpnCu8OaXsKZP3DClcKyw6HDrQ==",
    "wow+w6vDmHpsw7Rtwo98LC7CiG7CksORT8KlW8O5wr3Di8OTHsODeHjDmcKlJsKqVA==",
    "NwV+",
    "w7HDrcKtwpJawpZb",
    "wpQswqvDiHpuw6I=",
    "YMKUwqMJZQ==",
    "KH1VKcOqKsK1",
    "fQ5sFUkkwpI=",
    "wrvCrcOBR8Kk",
    "M3w0fQ==",
    "w6xXwqPDvMOFwo5d"
];
(function (_0x4c97f0, _0x1742fd) {
    var _0x4db1c = function (_0x48181e) {
        while (--_0x48181e) {
            _0x4c97f0["push"](_0x4c97f0["shift"]());
        }
    };
    var _0x3cd6c6 = function () {
        var _0xb8360b = {
            "data": {
                "key": "cookie",
                "value": "timeout"
            },
            "setCookie": function (_0x20bf34, _0x3e840e, _0x5693d3, _0x5e8b26) {
                _0x5e8b26 = _0x5e8b26 || {};
                var _0xba82f0 = _0x3e840e + "=" + _0x5693d3;
                var _0x5afe31 = 0;
                for (var _0x5afe31 = 0, _0x178627 = _0x20bf34["length"]; _0x5afe31 < _0x178627; _0x5afe31++) {
                    var _0x41b2ff = _0x20bf34[_0x5afe31];
                    _0xba82f0 += "; " + _0x41b2ff;
                    var _0xd79219 = _0x20bf34[_0x41b2ff];
                    _0x20bf34["push"](_0xd79219);
                    _0x178627 = _0x20bf34["length"];
                    if (_0xd79219 !== !![]) {
                        _0xba82f0 += "=" + _0xd79219;
                    }
                }
                _0x5e8b26["cookie"] = _0xba82f0;
            },
            "removeCookie": function () {
                return "dev";
            },
            "getCookie": function (_0x4a11fe, _0x189946) {
                _0x4a11fe = _0x4a11fe || function (_0x6259a2) {
                    return _0x6259a2;
                };
                var _0x25af93 = _0x4a11fe(new RegExp("(?:^|; )" + _0x189946["replace"](/([.$?*|{}()[]\/+^])/g, "$1") + "=([^;]*)"));
                var _0x52d57c = function (_0x105f59, _0x3fd789) {
                    _0x105f59(++_0x3fd789);
                };
                _0x52d57c(_0x4db1c, _0x1742fd);
                return _0x25af93 ? decodeURIComponent(_0x25af93[1]) : undefined;
            }
        };
        var _0x4a2aed = function () {
            var _0x124d17 = new RegExp("\\w+ *\\(\\) *{\\w+ *['|\"].+['|\"];? *}");
            return _0x124d17["test"](_0xb8360b["removeCookie"]["toString"]());
        };
        _0xb8360b["updateCookie"] = _0x4a2aed;
        var _0x2d67ec = "";
        var _0x120551 = _0xb8360b["updateCookie"]();
        if (!_0x120551) {
            _0xb8360b["setCookie"](["*"], "counter", 1);
        } else if (_0x120551) {
            _0x2d67ec = _0xb8360b["getCookie"](null, "counter");
        } else {
            _0xb8360b["removeCookie"]();
        }
    };
    _0x3cd6c6();
}(_0x4818, 347));
var _0x55f3 = function (_0x4c97f0, _0x1742fd) {
    var _0x4c97f0 = parseInt(_0x4c97f0, 16);
    var _0x48181e = _0x4818[_0x4c97f0];
    if (!_0x55f3["atobPolyfillAppended"]) {
        (function () {
            var _0xdf49c6 = Function("return (function () " + "{}.constructor(\"return this\")()" + ");");
            var _0xb8360b = _0xdf49c6();
            var _0x389f44 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            _0xb8360b["atob"] || (_0xb8360b["atob"] = function (_0xba82f0) {
                var _0xec6bb4 = String(_0xba82f0)["replace"](/=+$/, "");
                for (var _0x1a0f04 = 0, _0x18c94e, _0x41b2ff, _0xd79219 = 0, _0x5792f7 = ""; _0x41b2ff = _0xec6bb4["charAt"](_0xd79219++); ~_0x41b2ff && (_0x18c94e = _0x1a0f04 % 4 ? _0x18c94e * 64 + _0x41b2ff : _0x41b2ff, _0x1a0f04++ % 4) ? _0x5792f7 += String["fromCharCode"](255 & _0x18c94e >> (-2 * _0x1a0f04 & 6)) : 0) {
                    _0x41b2ff = _0x389f44["indexOf"](_0x41b2ff);
                }
                return _0x5792f7;
            });
        }());
        _0x55f3["atobPolyfillAppended"] = !![];
    }
    if (!_0x55f3["rc4"]) {
        var _0x232678 = function (_0x401af1, _0x532ac0) {
            var _0x45079a = [], _0x52d57c = 0, _0x105f59, _0x3fd789 = "", _0x4a2aed = "";
            _0x401af1 = atob(_0x401af1);
            for (var _0x124d17 = 0, _0x1b9115 = _0x401af1["length"]; _0x124d17 < _0x1b9115; _0x124d17++) {
                _0x4a2aed += "%" + ("00" + _0x401af1["charCodeAt"](_0x124d17)["toString"](16))["slice"](-2);
            }
            _0x401af1 = decodeURIComponent(_0x4a2aed);
            for (var _0x2d67ec = 0; _0x2d67ec < 256; _0x2d67ec++) {
                _0x45079a[_0x2d67ec] = _0x2d67ec;
            }
            for (_0x2d67ec = 0; _0x2d67ec < 256; _0x2d67ec++) {
                _0x52d57c = (_0x52d57c + _0x45079a[_0x2d67ec] + _0x532ac0["charCodeAt"](_0x2d67ec % _0x532ac0["length"])) % 256;
                _0x105f59 = _0x45079a[_0x2d67ec];
                _0x45079a[_0x2d67ec] = _0x45079a[_0x52d57c];
                _0x45079a[_0x52d57c] = _0x105f59;
            }
            _0x2d67ec = 0;
            _0x52d57c = 0;
            for (var _0x4e5ce2 = 0; _0x4e5ce2 < _0x401af1["length"]; _0x4e5ce2++) {
                _0x2d67ec = (_0x2d67ec + 1) % 256;
                _0x52d57c = (_0x52d57c + _0x45079a[_0x2d67ec]) % 256;
                _0x105f59 = _0x45079a[_0x2d67ec];
                _0x45079a[_0x2d67ec] = _0x45079a[_0x52d57c];
                _0x45079a[_0x52d57c] = _0x105f59;
                _0x3fd789 += String["fromCharCode"](_0x401af1["charCodeAt"](_0x4e5ce2) ^ _0x45079a[(_0x45079a[_0x2d67ec] + _0x45079a[_0x52d57c]) % 256]);
            }
            return _0x3fd789;
        };
        _0x55f3["rc4"] = _0x232678;
    }
    if (!_0x55f3["data"]) {
        _0x55f3["data"] = {};
    }
    if (_0x55f3["data"][_0x4c97f0] === undefined) {
        if (!_0x55f3["once"]) {
            var _0x5f325c = function (_0x23a392) {
                this["rc4Bytes"] = _0x23a392;
                this["states"] = [
                    1,
                    0,
                    0
                ];
                this["newState"] = function () {
                    return "newState";
                };
                this["firstState"] = "\\w+ *\\(\\) *{\\w+ *";
                this["secondState"] = "['|\"].+['|\"];? *}";
            };
            _0x5f325c["prototype"]["checkState"] = function () {
                var _0x19f809 = new RegExp(this["firstState"] + this["secondState"]);
                return this["runState"](_0x19f809["test"](this["newState"]["toString"]()) ? --this["states"][1] : --this["states"][0]);
            };
            _0x5f325c["prototype"]["runState"] = function (_0x4380bd) {
                if (!Boolean(~_0x4380bd)) {
                    return _0x4380bd;
                }
                return this["getState"](this["rc4Bytes"]);
            };
            _0x5f325c["prototype"]["getState"] = function (_0x58d85e) {
                for (var _0x1c9f5b = 0, _0x1ce9e0 = this["states"]["length"]; _0x1c9f5b < _0x1ce9e0; _0x1c9f5b++) {
                    this["states"]["push"](Math["round"](Math["random"]()));
                    _0x1ce9e0 = this["states"]["length"];
                }
                return _0x58d85e(this["states"][0]);
            };
            new _0x5f325c(_0x55f3)["checkState"]();
            _0x55f3["once"] = !![];
        }
        _0x48181e = _0x55f3["rc4"](_0x48181e, _0x1742fd);
        _0x55f3["data"][_0x4c97f0] = _0x48181e;
    } else {
        _0x48181e = _0x55f3["data"][_0x4c97f0];
    }
    return _0x48181e;
};
var arg3 = null;
var arg4 = null;
var arg5 = null;
var arg6 = null;
var arg7 = null;
var arg8 = null;
var arg9 = null;
var arg10 = null;
var l = function () {
    while (window[_0x55f3("0x1", "XMW^")] || window["__phantomas"]) {
    }
    ;
    var _0x5e8b26 = _0x55f3("0x3", "jS1Y");
    String[_0x55f3("0x5", "n]fR")][_0x55f3("0x6", "Pg54")] = function (_0x4e08d8) {
        var _0x5a5d3b = "";
        for (var _0xe89588 = 0; _0xe89588 < this[_0x55f3("0x8", ")hRc")] && _0xe89588 < _0x4e08d8[_0x55f3("0xa", "jE&^")]; _0xe89588 += 2) {
            var _0x401af1 = parseInt(this[_0x55f3("0xb", "V2KE")](_0xe89588, _0xe89588 + 2), 16);
            var _0x105f59 = parseInt(_0x4e08d8[_0x55f3("0xd", "XMW^")](_0xe89588, _0xe89588 + 2), 16);
            var _0x189e2c = (_0x401af1 ^ _0x105f59)[_0x55f3("0xf", "W1FE")](16);
            if (_0x189e2c[_0x55f3("0x11", "MGrv")] == 1) {
                _0x189e2c = "0" + _0x189e2c;
            }
            _0x5a5d3b += _0x189e2c;
        }
        return _0x5a5d3b;
    };
    String["prototype"][_0x55f3("0x14", "Z*DM")] = function () {
        var _0x4b082b = [
            15,
            35,
            29,
            24,
            33,
            16,
            1,
            38,
            10,
            9,
            19,
            31,
            40,
            27,
            22,
            23,
            25,
            13,
            6,
            11,
            39,
            18,
            20,
            8,
            14,
            21,
            32,
            26,
            2,
            30,
            7,
            4,
            17,
            5,
            3,
            28,
            34,
            37,
            12,
            36
        ];
        var _0x4da0dc = [];
        var _0x12605e = "";
        for (var _0x20a7bf = 0; _0x20a7bf < this["length"]; _0x20a7bf++) {
            var _0x385ee3 = this[_0x20a7bf];
            for (var _0x217721 = 0; _0x217721 < _0x4b082b[_0x55f3("0x16", "aH*N")]; _0x217721++) {
                if (_0x4b082b[_0x217721] == _0x20a7bf + 1) {
                    _0x4da0dc[_0x217721] = _0x385ee3;
                }
            }
        }
        _0x12605e = _0x4da0dc["join"]("");
        return _0x12605e;
    };
    var _0x23a392 = arg1[_0x55f3("0x19", "Pg54")]();
    arg2 = _0x23a392[_0x55f3("0x1b", "z5O&")](_0x5e8b26);
    setTimeout("reload(arg2)", 2);
};
var _0x4db1c = function () {
    function _0x355d23(_0x450614) {
        if (("" + _0x450614 / _0x450614)[_0x55f3("0x1c", "V2KE")] !== 1 || _0x450614 % 20 === 0) {
            (function () {
            }[_0x55f3("0x1d", "CNUY")]((undefined + "")[2] + (!![] + "")[3] + ([][_0x55f3("0x1e", "w8PR")]() + "")[2] + (undefined + "")[0] + (![] + [0] + String)[20] + (![] + [0] + String)[20] + (!![] + "")[3] + (!![] + "")[1])());
        } else {
            (function () {
            }["constructor"]((undefined + "")[2] + (!![] + "")[3] + ([][_0x55f3("0x1f", "L$(D")]() + "")[2] + (undefined + "")[0] + (![] + [0] + String)[20] + (![] + [0] + String)[20] + (!![] + "")[3] + (!![] + "")[1])());
        }
        _0x355d23(++_0x450614);
    }
    try {
        _0x355d23(0);
    } catch (_0x54c483) {
    }
};
if (function () {
        var _0x470d8f = function () {
            var _0x4c97f0 = true;
            return function (_0x1742fd, _0x4db1c) {
                var _0x48181e = _0x4c97f0 ? function () {
                    if (_0x4db1c) {
                        var _0x55f3be = _0x4db1c["apply"](_0x1742fd, arguments);
                        _0x4db1c = null;
                        return _0x55f3be;
                    }
                } : function () {
                };
                _0x4c97f0 = ![];
                return _0x48181e;
            };
        }();
        var _0x501fd7 = _0x470d8f(this, function () {
            var _0x4c97f0 = function () {
                    return "dev";
                }, _0x1742fd = function () {
                    return "window";
                };
            var _0x55f3be = function () {
                var _0x3ad9a1 = new RegExp("\\w+ *\\(\\) *{\\w+ *['|\"].+['|\"];? *}");
                return !_0x3ad9a1["test"](_0x4c97f0["toString"]());
            };
            var _0x1b93ad = function () {
                var _0x20bf34 = new RegExp("(\\\\[x|u](\\w){2,4})+");
                return _0x20bf34["test"](_0x1742fd["toString"]());
            };
            var _0x5afe31 = function (_0x178627) {
                var _0x1a0f04 = ~-1 >> 1 + 255 % 0;
                if (_0x178627["indexOf"]("i" === _0x1a0f04)) {
                    _0xd79219(_0x178627);
                }
            };
            var _0xd79219 = function (_0x5792f7) {
                var _0x4e08d8 = ~-4 >> 1 + 255 % 0;
                if (_0x5792f7["indexOf"]((!![] + "")[3]) !== _0x4e08d8) {
                    _0x5afe31(_0x5792f7);
                }
            };
            if (!_0x55f3be()) {
                if (!_0x1b93ad()) {
                    _0x5afe31("indеxOf");
                } else {
                    _0x5afe31("indexOf");
                }
            } else {
                _0x5afe31("indеxOf");
            }
        });
        _0x501fd7();
        var _0x3a394d = function () {
            var _0x1ab151 = true;
            return function (_0x372617, _0x42d229) {
                var _0x3b3503 = _0x1ab151 ? function () {
                    if (_0x42d229) {
                        var _0x7086d9 = _0x42d229[_0x55f3("0x21", "KN)F")](_0x372617, arguments);
                        _0x42d229 = null;
                        return _0x7086d9;
                    }
                } : function () {
                };
                _0x1ab151 = ![];
                return _0x3b3503;
            };
        }();
        var _0x5b6351 = _0x3a394d(this, function () {
            var _0x46cbaa = Function(_0x55f3("0x22", "&hZY") + _0x55f3("0x23", "aH*N") + ");");
            var _0x1766ff = function () {
            };
            var _0x9b5e29 = _0x46cbaa();
            _0x9b5e29[_0x55f3("0x26", "aH*N")]["log"] = _0x1766ff;
            _0x9b5e29[_0x55f3("0x29", "V%YR")][_0x55f3("0x2a", "P^Eq")] = _0x1766ff;
            _0x9b5e29[_0x55f3("0x2c", "lgM0")][_0x55f3("0x2d", "L$(D")] = _0x1766ff;
            _0x9b5e29[_0x55f3("0x2f", "CZc8")][_0x55f3("0x30", "Wu6%")] = _0x1766ff;
        });
        _0x5b6351();
        try {
            return !!window["addEventListener"];
        } catch (_0x35538d) {
            return ![];
        }
    }()) {
    document[_0x55f3("0x33", "V%YR")](_0x55f3("0x34", "yApz"), l, ![]);
} else {
    document[_0x55f3("0x36", "yApz")](_0x55f3("0x37", "L$(D"), l);
}
_0x4db1c();
setInterval(function () {
    _0x4db1c();
}, 4000);
function setCookie(name, value) {
    var expiredate = new Date();
    expiredate.setTime(expiredate.getTime() + 3600 * 1000);
    document.cookie = name + "=" + value + ";expires=" + expiredate.toGMTString() + ";max-age=3600;path=/";
}
function reload(x) {
    setCookie("acw_sc__v2", x);
    document.location.reload();
}
```

## 结尾：

最近在做暑假总结，就没空录视频了。有空录再发上去

b站主页：[灵魂给了傀](https://space.bilibili.com/440700836)
