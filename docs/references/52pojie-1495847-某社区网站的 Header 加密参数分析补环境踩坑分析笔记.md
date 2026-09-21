# 某社区网站的 Header 加密参数分析补环境踩坑分析笔记

> **作者**: xianyucoder | **发布时间**: 2021-08-18 09:32:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6484 / 14
> **原文**: [https://www.52pojie.cn/thread-1495847-1-1.html](https://www.52pojie.cn/thread-1495847-1-1.html)

---

*本帖最后由 xianyucoder 于 2021-8-19 08:52 编辑*

### 今日网站

aHR0cHM6Ly93d3cuemhpaHUuY29tL3NlYXJjaD90eXBlPWNvbnRlbnQmcT0lRTYlQkIlQjQlRTYlQkIlQjQ=

#### 加密定位

需要分析的请求是下面这个

![](https://tc.xianyucoder.cn/blog20210717184811.png)

这个请求的 header  中带有加密的参数 `x-zse-96`

我们今天就是要分析这个参数的生成逻辑

简单的请求定位有三个方法，之前讲过了，可以找找之前的文章看看

这个 header 加密参数的名字比较特殊，我们可以直接全局检索这个名字的来定位参数

检索的结果如下

![](https://tc.xianyucoder.cn/blog20210717185533.png)

只有一个结果，在结果里再次检索有两个结果

![](https://tc.xianyucoder.cn/blog20210717185743.png)

分别是

![](https://tc.xianyucoder.cn/blog20210717185758.png)

![](https://tc.xianyucoder.cn/blog20210717185810.png)

全部打上断点，然后刷新请求可以看到断点断在下面这个位置

![](https://tc.xianyucoder.cn/blog20210717190248.png)

说明我们定位这个值赋值的位置了，接下来可以继续分析他的逻辑了。

#### 加密分析

上面我们找到了参数赋值的位置，接下来要看看怎么生成这个参数

由页面可以知道，这个参数的加密逻辑是这样的

```
T = (0,i.default)(t, b.body, {zse93: m,dc0: y,xZst81: E});
_ = T.signature;
v.set("x-zse-96", "2.0_" + _);
```

我们把断点打在 `T`上看看，我们需要的是`T.signature`

![](https://tc.xianyucoder.cn/blog20210717191029.png)

目前未知的参数/方法有`t`、`i.default`、`b.body`、`m`、`y`、`E`

下面一个一个分析

这里可以看到`y`是一串加密的乱码

```
var y = (0,r.getDC0Cookie)()
```

进一步分析可以得到，`y`是当前的`cookie`中 key 为`d\_c0的值

![](https://tc.xianyucoder.cn/blog20210717191205.png)

![](https://tc.xianyucoder.cn/blog20210717191128.png)

参数`t` 是当前请求的 url

![](https://tc.xianyucoder.cn/blog20210717191751.png)

参数`m` 是固定值

```
O = o.ZSE_83_VERSION.web
m = u + "_" + O
```

![](https://tc.xianyucoder.cn/blog20210717191932.png)

参数`E`的值是个`null`，`b.body`是个`undefine`

接下来就只剩下`i.default`未知了，所以单步进去分析可以看到在这个`i.default`方法中最终返回了`signature`，这个`signature`就是我们需要的加密值

![](https://tc.xianyucoder.cn/blog20210718150651.png)

这个`signature`的逻辑如下

```
 signature = (0,o.default)((0,r.default)(d))
```

这里传入的`d`就是上面的参数拼接起来的

这里又多了两个未知的方法，`o.default`与`r.default`

先看看第一个方法`r.default`

单步进去的逻辑如下

```
function m(e, t, n) {return t ? n ? O(t, e) : h(O(t, e)) : n ? v(e) : h(v(e))}
```

这里是一些三元表达式，最终返回的是`h(v(e))`

这个方法比较简单的，其实就是将上面的`d`取`md5` hash 的操作

得到`r.default`的结果后传入`o.default`

进入的是下面这个逻辑

```
var b = function(e) {return __g._encrypt(encodeURIComponent(e))};
```

![](https://tc.xianyucoder.cn/blog20210718151950.png)

这里用到了`r()`方法

![](https://tc.xianyucoder.cn/blog20210718152018.png)

分析这个方法我们可以自己慢慢把全部的逻辑抠出来，也可以像我一样把这个`js`文件复制到本地，会发现全部的逻辑都在一个`function`中。

![](https://tc.xianyucoder.cn/blog20210718152218.png)

把这段代码拿到浏览器中运行

![](https://tc.xianyucoder.cn/blog20210718154630.png)

是可以正常得到结果的，那我们要把这个代码在 node 中运行看看

#### 加密改写

在 node 里运行结果我改了改了，保证他可以运行不报错

首先直接将代码复制过来运行是会报错的

![](https://tc.xianyucoder.cn/blog20210718155154.png)

简单修改下，声明`window`，并把最后的`exports`修改为`window.exports`

修改后调用发现报错`atob`未定义

![](https://tc.xianyucoder.cn/blog20210718155527.png)

这个应该大家都会吧，其实就是 base64，补的方法有很多种

方法 1 ：

```
_keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function _utf8_encode (string) {
    var string = string.replace(/\r\n/g,"\n");
    var utftext = "";
    for (var n = 0; n < string.length; n++) {
        var c = string.charCodeAt(n);
        if (c < 128) {
            utftext += String.fromCharCode(c);
        } else if((c > 127) && (c < 2048)) {
            utftext += String.fromCharCode((c >> 6) | 192);
            utftext += String.fromCharCode((c & 63) | 128);
        } else {
            utftext += String.fromCharCode((c >> 12) | 224);
            utftext += String.fromCharCode(((c >> 6) & 63) | 128);
            utftext += String.fromCharCode((c & 63) | 128);
        }

    }
    return utftext;
}

function _utf8_decode (utftext) {
    var string = "";
    var i = 0;
    var c = 0;
    var c1 = 0;
    var c2 = 0;
    var c3 = 0;
    while ( i < utftext.length ) {
        c = utftext.charCodeAt(i);
        if (c < 128) {
            string += String.fromCharCode(c);
            i++;
        } else if((c > 191) && (c < 224)) {
            c2 = utftext.charCodeAt(i+1);
            string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            i += 2;
        } else {
            c2 = utftext.charCodeAt(i+1);
            c3 = utftext.charCodeAt(i+2);
            string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
        }
    }
    return string;
}

var xazxBase64 = {
    'decode': function (input){
        output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        i = 0;
        input = input.replace(/[^A-Za-z0-9+\/=]/g, "");
        while (i < input.length) {
            enc1 = _keyStr.indexOf(input.charAt(i++));
            enc2 = _keyStr.indexOf(input.charAt(i++));
            enc3 = _keyStr.indexOf(input.charAt(i++));
            enc4 = _keyStr.indexOf(input.charAt(i++));
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
            output = output + String.fromCharCode(chr1);
            if (enc3 !== 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 !== 64) {
                output = output + String.fromCharCode(chr3);
            }
        }
        output = _utf8_decode(output);
        return output;
    },

    'encode': function (input){
        output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        i = 0;
        input = _utf8_encode(input);
        while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
            output = output +
                _keyStr.charAt(enc1) + _keyStr.charAt(enc2) +
                _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
        }
        return output;
    }
};
```

方法 2 ：

```
global.Buffer = global.Buffer || require('buffer').Buffer;

if (typeof btoa === 'undefined') {
    global.btoa = function (str) {
        return new Buffer.from(str, 'binary').toString('base64');
    };
}

if (typeof atob === 'undefined') {
    global.atob = function (b64Encoded) {
        return new Buffer.from(b64Encoded, 'base64').toString('binary');
    };
}
```

方法 3 ：

```
var atob = function(r) {
    e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o = String(r).replace(/=+$/, "");
    if (o.length % 4 == 1)
        throw new t("'atob' failed: The string to be decoded is not correctly encoded.");
    for (var n, a, i = 0, c = 0, d = ""; a = o.charAt(c++); ~a && (n = i % 4 ? 64 * n + a : a,
    i++ % 4) ? d += String.fromCharCode(255 & n >> (-2 * i & 6)) : 0)
        a = e.indexOf(a);
    return d
}
```

##### jsdom 版生成正确加密值

这个是网上流传最多的版本，其实也没有毛病，直接用 jsdom 套个环境就完事了

使用方法也非常简单

```
npm install jsdom
```

在代码开头加上下面的代码

```
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
window = dom.window;
document = window.document;
XMLHttpRequest = window.XMLHttpRequest;
```

直接运行可以得到下面的结果

```
# 输入值
127927b6d4c1814afa22cdea9c7d7be9
# 正确结果
aHt0c6Lyn9Ox28S8K0OqNJuqb0FYoXYBG8F0b7uySRYf
# jsdom的结果
aHt0c6Lyn9Ox28S8K0OqNJuqb0FYoXYBG8F0b7uySRYf
```

#### node 版生成正确的加密值

如果要使用 node 结果生成的加密

推荐采用方法 2，可以直接得到结果，但是结果是不一样，多了最后的`4`位，偷懒一点直接截掉后四位就行了

```
# 输入值
c06829267e17d3941f5c4cf33db9d509
# 正确结果
aHt0c6Lyn9Ox28S8K0OqNJuqb0FYoXYBG8F0b7uySRYf
# 我们自己的结果
aHt0c6Lyn9Ox28S8K0OqNJuqb0FYoXYBG8F0b7uySRYf9Tuw
# 截掉后四位就完事了
```

想知道一步到位的方法就需要一点点分析分析他的加密了

如果不想分析的接下来的部分可以跳过

接下来主要会告诉你分析插桩的点在哪里

先看加密的入口

```
__g._encrypt(encodeURIComponent(e))
```

这里的`__g._encrypt`是`r()`

`r`是在下面这里调用的

![](https://tc.xianyucoder.cn/blog20210718170535.png)

这里用到了`o.v`这里的`o.v`是由`new G.v`生成的

就是代码里的一长串`base64`编码

![](https://tc.xianyucoder.cn/blog20210718170924.png)

传入这一串编码之后就在`G.prototype.D`和`G.prototype.v`来回跳转，并且在这两个方法做一些判断，移位的操作最后生成最后的结果

![](https://tc.xianyucoder.cn/blog20210718171105.png)

能插桩看到信息的点在哪里呢？

全局检索`var k`

![](https://tc.xianyucoder.cn/blog20210718171732.png)

在这里把`charCodeAt`的结果打印出来，得到的结果如下

```
__g
_encrypt
window
undefined
window
navigator
Object
name
nodejs
userAgent
headless
userAgent
toLowerCase
indexOf
callPhantom
_phantom
__phantomas
buffer
Buffer
emit
spawn
webdriver
domAutomation
domAutomationController
getOwnPropertyDescriptor
userAgent
getOwnPropertyDescriptor
webdriver
getOwnPropertyDescriptor
[native code]
getOwnPropertyDescriptor
Function
prototype
toString
call
indexOf

length

RuPtXwxpThIZ0qyz_9fYLCOV8B1mMGKs7UnFHgN3iDaWAJE-Qrk2ecSo6bjd4vl5
length
charCodeAt
..
charAt
...
charCodeAt
..
charAt
...
charCodeAt
..
charAt
...
charCodeAt
...
charAt
...
charCodeAt
...
charAt
...
charCodeAt
...
charAt
...
charCodeAt
...
charAt
...
charCodeAt
...
charAt
...
charCodeAt
...
charAt
...
charCodeAt
...
charAt
...
charCodeAt
...
charAt
...
```

除了这上面一个点外就是打印的`this.C`的值

![](https://tc.xianyucoder.cn/blog20210718172154.png)

这儿的值可以观察到是第几次循环遍历，有需要注意的值自己记录下来，下次自己加个判断`debugger`直接断在这个位置

除了上面的两个位置外还有两个位置需要注意，不需要断点在分析的时候要知道有这个存在

第一个是`eval`代码在的地方，这里会执行代码，那么执行的代码就需要注意了

就像开头的`__g`还有`window`还有`navigator`这些都经过了这里

![](https://tc.xianyucoder.cn/blog20210718172541.png)

如果你生成的值和页面生成的值完全不一样或者干脆就得出一个空串，恭喜你，这才是我写这个文章的目的。

知乎我一直以为是没有环境检测的，特别是我用上面的代码跑出了近乎一样的代码的时候我感觉这个加密也太简单了，之后当我认真研究的时候，我发现是我天真了。

第一个是运算得出的代码结果完全不一样

你需要关注的是`this.C`的值是`99`的时候

> 就是遍历到第 99 次的时候你可以打印 this.C 的值确认位置

会检测 window 对象是否有 Buffer 这个方法，没有的话就会跳过`101-105`，直接将`this.C`赋值为`106`

如果`window`中有 Buffer 对象会顺序执行`101-105`这几个步骤中会给传入的`hash`值的前方加上一个字符，这样传入的值都不一样了，得到的结果当然也不一样了

还有一个是输出是个空值，这个检测的比较多了

需要关注的点是这个方法代码检测了方法的 `toString`还有`getOwnPropertyDescriptor`

这个检测的比较宽泛，在`this.C`等于`106-199`之间都有

如果你嫌麻烦的话直接使用上面提示可以生成值的代码直接跑就可以了

以上就是今天的全部内容了，咱们下次再会~
