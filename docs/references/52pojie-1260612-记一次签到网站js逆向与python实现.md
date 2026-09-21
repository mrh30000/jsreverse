# 记一次签到网站js逆向与python实现

> **作者**: kiseyzed | **发布时间**: 2020-09-04 12:23:00 | **版块**: 『编程语言区』 | **查看/回复**: 9142 / 19
> **原文**: [https://www.52pojie.cn/thread-1260612-1-1.html](https://www.52pojie.cn/thread-1260612-1-1.html)

---

*本帖最后由 kiseyzed 于 2020-9-4 12:24 编辑*

## 分析笔记

### 背景

高校开学在即，防疫工作或将成为常态，校要求早7点前必须在平台上完成打卡签到，奈何有时贪恋床榻之欢，未能及时打卡，实乃生平憾事。

**不提倡不推荐使用非正常方式打卡，响应国家号召，做好防疫工作是我们公民的本职。**

> 填报系统地址：
>
> <http://wxyqfk.zhxy.net/#/poster>

### 登陆分析

#### 数据分析

Chrome浏览器进入填报系统，选择对应学校，来到登陆界面。

打开Chrome开发者工具（快捷键F12），模拟手机端。

![](https://attach.52pojie.cn/forum/202009/04/115756lofukopuwx4qmobw.png)

同时切换到Network一栏，分别填写信息：

![](https://attach.52pojie.cn/forum/202009/04/115803z0hg5nw3nug6l65n.png)

111111

222222

333333

点击登陆，分析网络数据包。

![](https://attach.52pojie.cn/forum/202009/04/115759zrxrzzvkyo8s8rzw.png)

表单有四个必需字段：

* 身份（UserType）
* 学号（XGH）
* 姓名（Name）
* 密码（PassWord）

一个隐藏字段：

* 院校代码（YXDM）

请求正文：

![](https://attach.52pojie.cn/forum/202009/04/115801ulcy1jsllyuamuq4.png)

我们发现PassWord字段被加密了（其实不难猜出这就是32位的Md5），这里简单分析下。

#### 加密分析

回到请求页面，点这个调用方（大概叫这个名儿）

![](https://attach.52pojie.cn/forum/202009/04/115805z1rc1abr1t12kbib.png)

![](https://attach.52pojie.cn/forum/202009/04/115807umx1tluu7oytcuon.png)

打上断点，再次点击登陆

![](https://attach.52pojie.cn/forum/202009/04/115809t00douyw9wsww0d0.png)

可以看到我们提交的参数

![](https://attach.52pojie.cn/forum/202009/04/115813krj97bnnnivozqgn.png)

网页将请求正文封装在`f`中通过`XMLHttpRequest`的方式提交。

![](https://attach.52pojie.cn/forum/202009/04/115816hfxp7a3dk8wa4ydj.png)

关键数据在`t`中作为参数传递，再次回溯

![](https://attach.52pojie.cn/forum/202009/04/115818rhdkz7ckrdxbjwrk.png)

到这之前，数据都是在`t`中作为参数传递，中间的过程大概就是取出数据重新拼接成请求正文。

这里将提交的参数封装到`p`中传递，加密就是在这里进行的，打个断点，再次点击登陆，断点断下。

![](https://attach.52pojie.cn/forum/202009/04/115820ivfnr4e7c2zpmltp.png)

单步步过：

![](https://attach.52pojie.cn/forum/202009/04/115822ao7r7r7ncm9gifoz.png)

`p`中PassWord的值已经被加密了。

选中o["a"]，来到函数定义处：

![](https://attach.52pojie.cn/forum/202009/04/115825bhtv9w3wfkftveoe.png)

![](https://attach.52pojie.cn/forum/202009/04/115827kr3brx8bkf11r17p.png)

打上断点，再次点击登陆，断点断下。

![](https://attach.52pojie.cn/forum/202009/04/115829zm49s96o2fobfzt7.png)

真是喜欢套娃，又去`r()`函数的定义处吧。

进去首先断点，登陆，断下，凶手找到了：

![](https://attach.52pojie.cn/forum/202009/04/115831v0xj0hh8xmy5sy0m.png)

![](https://attach.52pojie.cn/forum/202009/04/115833ipeln52k2kn0nig1.png)

其中`a(t,n)`是真正的加密函数，`t`是被加密的文本，`n`没有用到，返回加密后的结果存放到一个`Array`中，再转换成字节数组，取16进制值，即为最终加密结果。

`a()`部分定义：

![](https://attach.52pojie.cn/forum/202009/04/115835k1dzmiaaes63rs23.png)

看到下面那些挺整齐的代码（line 9683 - line ~）一眼就知道是Md5了。

这里我们直接复制下来，简单改造下：

```
function bytesToString(t) {
    for (var e = [], n = 0; n < t.length; n++) e.push(String.fromCharCode(t[n]));
    return e.join("")
}
function bytesToWords(t) {
    for (var e = [], n = 0, r = 0; n < t.length; n++, r += 8) e[r >>> 5] |= t[n] << 24 - r % 32;
    return e
};
function wordsToBytes(t) {
    for (var e = [], n = 0; n < 32 * t.length; n += 8) e.push(t[n >>> 5] >>> 24 - n % 32 & 255);
    return e
};
function stringToBytes(t) {
    for (var e = [], n = 0; n < t.length; n++) e.push(255 & t.charCodeAt(n));
    return e
};
function bytesToHex(t) {
    for (var e = [], n = 0; n < t.length; n++) e.push((t[n] >>> 4).toString(16)),
        e.push((15 & t[n]).toString(16));
    return e.join("")
}

function rotl(t, e) {
    return t << e | t >>> 32 - e
};
function endian(t) {
    if (t.constructor == Number) return 16711935 & rotl(t, 8) | 4278255360 & rotl(t, 24);
    for (var e = 0; e < t.length; e++) t[e] = endian(t[e]);
    return t
};

function a(t, n) {
    t.constructor == String ? t = n && "binary" === n.encoding ? o.stringToBytes(t) : stringToBytes(t) : i(t) ? t = Array.prototype.slice.call(t, 0) : Array.isArray(t) || (t = t.toString());
    for (var s = bytesToWords(t), u = 8 * t.length, c = 1732584193, l = -271733879, f = -1732584194, p = 271733878, h = 0; h < s.length; h++) s[h] = 16711935 & (s[h] << 8 | s[h] >>> 24) | 4278255360 & (s[h] << 24 | s[h] >>> 8);
    s[u >>> 5] |= 128 << u % 32,
        s[14 + (u + 64 >>> 9 << 4)] = u;
    var d = function (t, e, n, r, i, o, a) {
        var s = t + (e & n | ~e & r) + (i >>> 0) + a;
        return (s << o | s >>> 32 - o) + e
    },
        v = function (t, e, n, r, i, o, a) {
            var s = t + (e & r | n & ~r) + (i >>> 0) + a;
            return (s << o | s >>> 32 - o) + e
        },
        m = function (t, e, n, r, i, o, a) {
            var s = t + (e ^ n ^ r) + (i >>> 0) + a;
            return (s << o | s >>> 32 - o) + e
        },
        g = function (t, e, n, r, i, o, a) {
            var s = t + (n ^ (e | ~r)) + (i >>> 0) + a;
            return (s << o | s >>> 32 - o) + e
        };
    for (h = 0; h < s.length; h += 16) {
        var y = c,
            b = l,
            _ = f,
            w = p;
        c = d(c, l, f, p, s[h + 0], 7, -680876936),
            p = d(p, c, l, f, s[h + 1], 12, -389564586),
            f = d(f, p, c, l, s[h + 2], 17, 606105819),
            l = d(l, f, p, c, s[h + 3], 22, -1044525330),
            c = d(c, l, f, p, s[h + 4], 7, -176418897),
            p = d(p, c, l, f, s[h + 5], 12, 1200080426),
            f = d(f, p, c, l, s[h + 6], 17, -1473231341),
            l = d(l, f, p, c, s[h + 7], 22, -45705983),
            c = d(c, l, f, p, s[h + 8], 7, 1770035416),
            p = d(p, c, l, f, s[h + 9], 12, -1958414417),
            f = d(f, p, c, l, s[h + 10], 17, -42063),
            l = d(l, f, p, c, s[h + 11], 22, -1990404162),
            c = d(c, l, f, p, s[h + 12], 7, 1804603682),
            p = d(p, c, l, f, s[h + 13], 12, -40341101),
            f = d(f, p, c, l, s[h + 14], 17, -1502002290),
            l = d(l, f, p, c, s[h + 15], 22, 1236535329),
            c = v(c, l, f, p, s[h + 1], 5, -165796510),
            p = v(p, c, l, f, s[h + 6], 9, -1069501632),
            f = v(f, p, c, l, s[h + 11], 14, 643717713),
            l = v(l, f, p, c, s[h + 0], 20, -373897302),
            c = v(c, l, f, p, s[h + 5], 5, -701558691),
            p = v(p, c, l, f, s[h + 10], 9, 38016083),
            f = v(f, p, c, l, s[h + 15], 14, -660478335),
            l = v(l, f, p, c, s[h + 4], 20, -405537848),
            c = v(c, l, f, p, s[h + 9], 5, 568446438),
            p = v(p, c, l, f, s[h + 14], 9, -1019803690),
            f = v(f, p, c, l, s[h + 3], 14, -187363961),
            l = v(l, f, p, c, s[h + 8], 20, 1163531501),
            c = v(c, l, f, p, s[h + 13], 5, -1444681467),
            p = v(p, c, l, f, s[h + 2], 9, -51403784),
            f = v(f, p, c, l, s[h + 7], 14, 1735328473),
            l = v(l, f, p, c, s[h + 12], 20, -1926607734),
            c = m(c, l, f, p, s[h + 5], 4, -378558),
            p = m(p, c, l, f, s[h + 8], 11, -2022574463),
            f = m(f, p, c, l, s[h + 11], 16, 1839030562),
            l = m(l, f, p, c, s[h + 14], 23, -35309556),
            c = m(c, l, f, p, s[h + 1], 4, -1530992060),
            p = m(p, c, l, f, s[h + 4], 11, 1272893353),
            f = m(f, p, c, l, s[h + 7], 16, -155497632),
            l = m(l, f, p, c, s[h + 10], 23, -1094730640),
            c = m(c, l, f, p, s[h + 13], 4, 681279174),
            p = m(p, c, l, f, s[h + 0], 11, -358537222),
            f = m(f, p, c, l, s[h + 3], 16, -722521979),
            l = m(l, f, p, c, s[h + 6], 23, 76029189),
            c = m(c, l, f, p, s[h + 9], 4, -640364487),
            p = m(p, c, l, f, s[h + 12], 11, -421815835),
            f = m(f, p, c, l, s[h + 15], 16, 530742520),
            l = m(l, f, p, c, s[h + 2], 23, -995338651),
            c = g(c, l, f, p, s[h + 0], 6, -198630844),
            p = g(p, c, l, f, s[h + 7], 10, 1126891415),
            f = g(f, p, c, l, s[h + 14], 15, -1416354905),
            l = g(l, f, p, c, s[h + 5], 21, -57434055),
            c = g(c, l, f, p, s[h + 12], 6, 1700485571),
            p = g(p, c, l, f, s[h + 3], 10, -1894986606),
            f = g(f, p, c, l, s[h + 10], 15, -1051523),
            l = g(l, f, p, c, s[h + 1], 21, -2054922799),
            c = g(c, l, f, p, s[h + 8], 6, 1873313359),
            p = g(p, c, l, f, s[h + 15], 10, -30611744),
            f = g(f, p, c, l, s[h + 6], 15, -1560198380),
            l = g(l, f, p, c, s[h + 13], 21, 1309151649),
            c = g(c, l, f, p, s[h + 4], 6, -145523070),
            p = g(p, c, l, f, s[h + 11], 10, -1120210379),
            f = g(f, p, c, l, s[h + 2], 15, 718787259),
            l = g(l, f, p, c, s[h + 9], 21, -343485551),
            c = c + y >>> 0,
            l = l + b >>> 0,
            f = f + _ >>> 0,
            p = p + w >>> 0
    }
    return endian([c, l, f, p])
};

function getMd5(t) {
    var r = wordsToBytes(a(t));
    return bytesToHex(r);
}
```

```
console.log(getMd5("333333"));//测试
```

本地使用node调试下

![](https://attach.52pojie.cn/forum/202009/04/115837giyfd2f2p2xgdp2d.png)

结果正确。

#### 验证提交

```
import requests
import json
import execjs

headers = {'content-type': 'application/json',
           'user-agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:22.0) Gecko/20100101 Firefox/22.0'}

# 获取js算法
f = open("citrus.js", 'r', encoding='utf-8')
line = f.readline()
citrus_js_file = ''
while line:
    citrus_js_file += line
    line = f.readline()
f.close()
citrus_js = execjs.compile(citrus_js_file)

def checkUser(name, password, userType, XGH, YXDN):
    url = "https://yqfkapi.zhxy.net/api/User/CheckUser"
    data = {'Name': name, 'PassWord': citrus_js.call("getMd5", password), 'UserType': userType, 'XGH': XGH,
            'YXDM': YXDN}
    r = requests.post(url=url,
                      headers=headers,
                      data=json.dumps(data)
                      )
    return r
```

```
response = checkUser("111111", "222222", "1", "10000", "10000")
print(response.text)//测试
```

![](https://attach.52pojie.cn/forum/202009/04/115839veh0bhhmb8zmbdkm.png)

啊咧，出问题了，在控制台里面也确认过提交的参数是没有问题的，这是怎么一回事呢？

我们回到浏览器，提交登录请求。

其实这种非法访问提示大多是因为参数异常，要么没提交全，要么没提交对。

我们多提交几次登录请求，比较之间的异同。

经过我的比对，发现每次请求是协议头（RequestHeader）里面的这三个参数每次都会发生变化，于是乎：

![](https://attach.52pojie.cn/forum/202009/04/115841dz1f7v5iyfv79df7.png)

直接搜索！

我这里选择搜索的是`sign`参数，因为看起来好欺负。

快捷键Ctrl+F，输入sign，回车：

![](https://attach.52pojie.cn/forum/202009/04/115846hg9nzgwenx921xww.png)

![](https://attach.52pojie.cn/forum/202009/04/115848rbndiek5qndude7i.png)

发现一个很可疑的函数，做个记录。

重新搜索`getSign()`出来两个结果：

![](https://attach.52pojie.cn/forum/202009/04/115850sjsr560t8rr0gy93.png)

发现了关键信息：

![](https://attach.52pojie.cn/forum/202009/04/115852pyxxobyo7gt2zkv5.png)

看看调用：

![](https://attach.52pojie.cn/forum/202009/04/115854jm8b1yu1bxdf1m26.png)

![](https://attach.52pojie.cn/forum/202009/04/115856knzhg1xcs6mltsxs.png)

选择一个不是chunk的js文件，跳转到Source栏下。

下断点，点击登陆，断下。

![](https://attach.52pojie.cn/forum/202009/04/115858cs9epo9zt1yspty1.png)

单步执行到`return`语句，

![](https://attach.52pojie.cn/forum/202009/04/115901l4ddyeeuoc44m4oq.png)

真相大白。

`t`是硬编码的一个key字符串，`n`是生成11位的随机字符串并转换大写，`a`为时间戳，`c`是通过拼接`n`、`a` 、`t`得到的字符串取Md5并转换大写。

`getSign()`返回一个包含了Header所需参数的对象。

代码copy下来，再稍微改改。

#### 工具实现

这里使用**Python3.6**做请求模拟，推荐使用**PyCharm Community Edition**作为IDE，免费。

又抓了几个请求包，分别是取用户信息`getInfo()`和保存签到状态`save()`的，还有一个查询签到状态`isCheckIn()`。

修改后js文件（-m 定义了一个`getSign()`函数）:

```
function bytesToString(t) {
    for (var e = [], n = 0; n < t.length; n++) e.push(String.fromCharCode(t[n]));
    return e.join("")
}
function bytesToWords(t) {
    for (var e = [], n = 0, r = 0; n < t.length; n++, r += 8) e[r >>> 5] |= t[n] << 24 - r % 32;
    return e
};
function wordsToBytes(t) {
    for (var e = [], n = 0; n < 32 * t.length; n += 8) e.push(t[n >>> 5] >>> 24 - n % 32 & 255);
    return e
};
function stringToBytes(t) {
    for (var e = [], n = 0; n < t.length; n++) e.push(255 & t.charCodeAt(n));
    return e
};
function bytesToHex(t) {
    for (var e = [], n = 0; n < t.length; n++) e.push((t[n] >>> 4).toString(16)),
        e.push((15 & t[n]).toString(16));
    return e.join("")
}

function rotl(t, e) {
    return t << e | t >>> 32 - e
};
function endian(t) {
    if (t.constructor == Number) return 16711935 & rotl(t, 8) | 4278255360 & rotl(t, 24);
    for (var e = 0; e < t.length; e++) t[e] = endian(t[e]);
    return t
};

function a(t, n) {
    t.constructor == String ? t = n && "binary" === n.encoding ? o.stringToBytes(t) : stringToBytes(t) : i(t) ? t = Array.prototype.slice.call(t, 0) : Array.isArray(t) || (t = t.toString());
    for (var s = bytesToWords(t), u = 8 * t.length, c = 1732584193, l = -271733879, f = -1732584194, p = 271733878, h = 0; h < s.length; h++) s[h] = 16711935 & (s[h] << 8 | s[h] >>> 24) | 4278255360 & (s[h] << 24 | s[h] >>> 8);
    s[u >>> 5] |= 128 << u % 32,
        s[14 + (u + 64 >>> 9 << 4)] = u;
    var d = function (t, e, n, r, i, o, a) {
        var s = t + (e & n | ~e & r) + (i >>> 0) + a;
        return (s << o | s >>> 32 - o) + e
    },
        v = function (t, e, n, r, i, o, a) {
            var s = t + (e & r | n & ~r) + (i >>> 0) + a;
            return (s << o | s >>> 32 - o) + e
        },
        m = function (t, e, n, r, i, o, a) {
            var s = t + (e ^ n ^ r) + (i >>> 0) + a;
            return (s << o | s >>> 32 - o) + e
        },
        g = function (t, e, n, r, i, o, a) {
            var s = t + (n ^ (e | ~r)) + (i >>> 0) + a;
            return (s << o | s >>> 32 - o) + e
        };
    for (h = 0; h < s.length; h += 16) {
        var y = c,
            b = l,
            _ = f,
            w = p;
        c = d(c, l, f, p, s[h + 0], 7, -680876936),
            p = d(p, c, l, f, s[h + 1], 12, -389564586),
            f = d(f, p, c, l, s[h + 2], 17, 606105819),
            l = d(l, f, p, c, s[h + 3], 22, -1044525330),
            c = d(c, l, f, p, s[h + 4], 7, -176418897),
            p = d(p, c, l, f, s[h + 5], 12, 1200080426),
            f = d(f, p, c, l, s[h + 6], 17, -1473231341),
            l = d(l, f, p, c, s[h + 7], 22, -45705983),
            c = d(c, l, f, p, s[h + 8], 7, 1770035416),
            p = d(p, c, l, f, s[h + 9], 12, -1958414417),
            f = d(f, p, c, l, s[h + 10], 17, -42063),
            l = d(l, f, p, c, s[h + 11], 22, -1990404162),
            c = d(c, l, f, p, s[h + 12], 7, 1804603682),
            p = d(p, c, l, f, s[h + 13], 12, -40341101),
            f = d(f, p, c, l, s[h + 14], 17, -1502002290),
            l = d(l, f, p, c, s[h + 15], 22, 1236535329),
            c = v(c, l, f, p, s[h + 1], 5, -165796510),
            p = v(p, c, l, f, s[h + 6], 9, -1069501632),
            f = v(f, p, c, l, s[h + 11], 14, 643717713),
            l = v(l, f, p, c, s[h + 0], 20, -373897302),
            c = v(c, l, f, p, s[h + 5], 5, -701558691),
            p = v(p, c, l, f, s[h + 10], 9, 38016083),
            f = v(f, p, c, l, s[h + 15], 14, -660478335),
            l = v(l, f, p, c, s[h + 4], 20, -405537848),
            c = v(c, l, f, p, s[h + 9], 5, 568446438),
            p = v(p, c, l, f, s[h + 14], 9, -1019803690),
            f = v(f, p, c, l, s[h + 3], 14, -187363961),
            l = v(l, f, p, c, s[h + 8], 20, 1163531501),
            c = v(c, l, f, p, s[h + 13], 5, -1444681467),
            p = v(p, c, l, f, s[h + 2], 9, -51403784),
            f = v(f, p, c, l, s[h + 7], 14, 1735328473),
            l = v(l, f, p, c, s[h + 12], 20, -1926607734),
            c = m(c, l, f, p, s[h + 5], 4, -378558),
            p = m(p, c, l, f, s[h + 8], 11, -2022574463),
            f = m(f, p, c, l, s[h + 11], 16, 1839030562),
            l = m(l, f, p, c, s[h + 14], 23, -35309556),
            c = m(c, l, f, p, s[h + 1], 4, -1530992060),
            p = m(p, c, l, f, s[h + 4], 11, 1272893353),
            f = m(f, p, c, l, s[h + 7], 16, -155497632),
            l = m(l, f, p, c, s[h + 10], 23, -1094730640),
            c = m(c, l, f, p, s[h + 13], 4, 681279174),
            p = m(p, c, l, f, s[h + 0], 11, -358537222),
            f = m(f, p, c, l, s[h + 3], 16, -722521979),
            l = m(l, f, p, c, s[h + 6], 23, 76029189),
            c = m(c, l, f, p, s[h + 9], 4, -640364487),
            p = m(p, c, l, f, s[h + 12], 11, -421815835),
            f = m(f, p, c, l, s[h + 15], 16, 530742520),
            l = m(l, f, p, c, s[h + 2], 23, -995338651),
            c = g(c, l, f, p, s[h + 0], 6, -198630844),
            p = g(p, c, l, f, s[h + 7], 10, 1126891415),
            f = g(f, p, c, l, s[h + 14], 15, -1416354905),
            l = g(l, f, p, c, s[h + 5], 21, -57434055),
            c = g(c, l, f, p, s[h + 12], 6, 1700485571),
            p = g(p, c, l, f, s[h + 3], 10, -1894986606),
            f = g(f, p, c, l, s[h + 10], 15, -1051523),
            l = g(l, f, p, c, s[h + 1], 21, -2054922799),
            c = g(c, l, f, p, s[h + 8], 6, 1873313359),
            p = g(p, c, l, f, s[h + 15], 10, -30611744),
            f = g(f, p, c, l, s[h + 6], 15, -1560198380),
            l = g(l, f, p, c, s[h + 13], 21, 1309151649),
            c = g(c, l, f, p, s[h + 4], 6, -145523070),
            p = g(p, c, l, f, s[h + 11], 10, -1120210379),
            f = g(f, p, c, l, s[h + 2], 15, 718787259),
            l = g(l, f, p, c, s[h + 9], 21, -343485551),
            c = c + y >>> 0,
            l = l + b >>> 0,
            f = f + _ >>> 0,
            p = p + w >>> 0
    }
    return endian([c, l, f, p])
};

function getMd5(t) {
    var r = wordsToBytes(a(t));
    return bytesToHex(r);
}

function getSign() {
    var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 5,
        s = "Q9y1Vr5sbjGwR8gekNCzELhZioQb9UZw",
        n = Math.random().toString(36).substr(2).toLocaleUpperCase(),
        t = Date.parse(new Date) / 1e3 + 60 * e;
    var c = getMd5("".concat(n).concat(t).concat(s)).toLocaleUpperCase();
    return { "noncestr": n, "timestamp": t, "sign": c }
}

//console.log(getSign().sign);
```

agm.py（协议集）

```
import requests
import json
import execjs

headers = {'content-type': 'application/json',
           'user-agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:22.0) Gecko/20100101 Firefox/22.0'}

# 获取js算法
f = open("citrus.js", 'r', encoding='utf-8')
line = f.readline()
citrus_js_file = ''
while line:
    citrus_js_file += line
    line = f.readline()
f.close()
citrus_js = execjs.compile(citrus_js_file)

def getSign():
    return citrus_js.call("getSign")

def getInfo(YXDM, userType):
    url = "https://yqfkapi.zhxy.net/api/School/GetInfo"
    sign = getSign()
    headers.update({
        'noncestr': sign['noncestr'],
        'timestamp': str(sign['timestamp']),
        'sign': sign['sign']})
    params = {'YXDM': YXDM, 'UserType': userType}
    r = requests.get(url=url,

                     headers=headers,
                     params=params)
    return r

def checkUser(name, password, userType, XGH, YXDN):
    url = "https://yqfkapi.zhxy.net/api/User/CheckUser"
    sign = getSign()
    headers.update({
        'noncestr': sign['noncestr'],
        'timestamp': str(sign['timestamp']),
        'sign': sign['sign']})
    data = {'Name': name, 'PassWord': citrus_js.call("getMd5", password), 'UserType': userType, 'XGH': XGH,
            'YXDM': YXDN}
    r = requests.post(url=url,
                      headers=headers,
                      data=json.dumps(data)
                      )
    return r

def isCheckIn(uid, usertype, yxdm):
    url = "https://yqfkapi.zhxy.net/api/ClockIn/IsClockIn"
    sign = getSign()
    headers.update({
        'noncestr': sign['noncestr'],
        'timestamp': str(sign['timestamp']),
        'sign': sign['sign']})
    params = {'uid': uid, 'usertype': usertype, 'yxdm': yxdm}
    r = requests.get(url=url,
                     headers=headers,
                     params=params)
    return r

def getApply(uid, usertype=1):
    url = "https://yqfkapi.zhxy.net/api/BackSchool/GetApply"
    sign = getSign()
    headers.update({
        'noncestr': sign['noncestr'],
        'timestamp': str(sign['timestamp']),
        'sign': sign['sign']})
    params = {'uid': uid,
              'usertype': usertype}
    r = requests.get(url=url,
                     headers=headers,
                     params=params)
    return r

def save(uid):
    url = "https://yqfkapi.zhxy.net/api/ClockIn/Save"
    sign = getSign()
    headers.update({
        'noncestr': sign['noncestr'],
        'timestamp': str(sign['timestamp']),
        'sign': sign['sign']})
    data = {"UID": uid,
            "UserType": 1,
            "JWD": "***",# 此处改为自己打卡地的经纬度
            "ZZDKID": 0,
            "A1": "正常",
            "A4": "无",
            "A2": "全部正常",
            "A3": "***",# 打卡地址
            "YXDM": "***",# 此处改为自己的院校代码
            "version": "v1.2.9"}
    r = requests.post(url=url,
                      headers=headers,
                      data=json.dumps(data))
    return r

# 验证sign参数
# sign = getSign()
# print(sign['noncestr'])
# print(sign['timestamp'])
# print(sign['sign'])
```

其中打卡`save()`可以自己抓一个请求包，然后替换掉data数据，一直提交同一个就可以完成打卡了。

*PS：每个请求都需要RequestHeader里面包含Sign参数，否则视为非法访问。*

测试结果：

![](https://attach.52pojie.cn/forum/202009/04/115903gjk44kfykdjn9ofk.png)

### 结语

无对抗无混淆，比较简单，适合练手。

python作为一门新兴语言，并且有普及的趋势，掌握是非常有必要的。灵活运用，能节省非常多的时间。

想到再写……
