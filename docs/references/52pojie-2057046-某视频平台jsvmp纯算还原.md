# 某视频平台jsvmp纯算还原

> **作者**: 无名 | **发布时间**: 2025-08-31 20:07:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4359 / 30
> **原文**: [https://www.52pojie.cn/thread-2057046-1-1.html](https://www.52pojie.cn/thread-2057046-1-1.html)

---

*本帖最后由 无名 于 2025-9-15 16:26 编辑*

声明
**本文章中所有内容仅供学习交流使用，不用于其他任何目的，不提供完整代码，抓包内容、敏感网址、数据接口等均已做脱敏处理，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关.本文章未经许可禁止转载，禁止任何修改后二次传播，擅自使用本文讲解的技术而导致的任何意外，作者均不负责。**

网址：
aHR0cHM6Ly9jdWJlLnNjYnV5b3VyZW4uY29tL0FiemtKbw==

当前js版本：
aGxzLm1pbi4xLjEuNi5qcw0KdGNwbGF5ZXIudjQuNy4yLm1pbi5qcw==

目的：
把请求到的加密key解密成原始key

方法：
插桩

说明：
该网址有登录有效期，过了有效期后重新粘贴该网址刷新即可（若要登录，请登录）
文章中数据可能不一致，因为这是多次调试的结果，看流程就行了。
即使我最后发现之前的部分分析没有必要，但我仍然会按照我开始的流程进行分析。

插桩日志太多了，放到文章中影响美观，我只会截取一点点到文章中。（完整日志会放在附件和蓝奏云链接中）

这是我第1次搞jsvmp，如有错误，还请各位坛友指出。

**一、确定位置（得到真正的key）**
首先抓包找到.m3u8，
发现其中有
key的网址和iv
正常情况下，直接用该key和iv即可愉快的下载视频了。
但是这个却失败了，因此我猜测这个key应该是加密了的。
既然是加密的，那一定要解密，因此根据devtools的启动器出现的文件，我向其中搜索decrypt，然后将一些可能的地方全下断点（别问我为什么不通过启动器找，反正很麻烦，只能取巧了），查看被断住的地方的变量的值，最后确定将请求到的加密key解密成原始key的函数，如图：（下面的分析，我都保持了这个断点，免得影响分析）

![](https://attach.52pojie.cn/forum/202508/31/194633sxpoofeixl6ooy87.png)

然后在console中执行btoa(String.fromCharCode.apply(null,e))就可以得到原始key的base64了，再调用N\_m3u8DL-CLI的命令行就可以下载了。本文结束，不是

![](https://attach.52pojie.cn/forum/202508/31/200030t5iiutn68yzi5utw.png)

**二、找到是如何将加密key解密成原始key的**

通过调用堆栈向下找，发现很可能的解密的key和iv，如图：

![](https://attach.52pojie.cn/forum/202508/31/194635hafh756zoc25jv07.png)

![](https://attach.52pojie.cn/forum/202508/31/194637igdd1dpy9vz11jz1.png)

将其复制出来，在线上网站（<https://the-x.cn/zh-cn/cryptography/Aes.aspx>）中测试

最后，确定它是通过aes-cbc,zero,128bits将加密key解密成原始key的

**三、寻找xxZxxZ...转换成解密加密key的key和iv逻辑**

通过上面分析，你可能会疑惑key和iv是怎么得到的，这里通过插桩确定算法（生成key和iv的位置被vm了）。
vm函数：

[JavaScript] *纯文本查看*

```
function T(t, e, r, i, n, a, s, o) {

            var l, u = !i, h = (t = +t,

            e = e || [0],

            i = i || [[this], [{}]],

            n = n || {},

            []), d = null;

            function c() {

                return function(t, e, r) {

                    return new (Function.bind.apply(t, e))

                }

                .apply(null, arguments)

            }

            Function.prototype.bind || (l = [].slice,

            Function.prototype.bind = function(t) {

                if ("function" != typeof this)

                    throw new TypeError("bind101");

                var e = l.call(arguments, 1)

                  , r = e.length

                  , i = this

                  , n = function() {}

                  , a = function() {

                    return e.length = r,

                    e.push.apply(e, arguments),

                    i.apply(n.prototype.isPrototypeOf(this) ? this : t, e)

                };

                return this.prototype && (n.prototype = this.prototype),

                a.prototype = new n,

                a

            }

            );

            for (var f = [function() {

                var r = e[t++];

                i[r] = void 0 === i[r] ? [] : i[r]

            }

            , function() {

                i.push([e[t++]])

            }

            , function() {

                i.push(!i.pop())

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] >> i.pop()

            }

            , function() {

                var t = i.pop();

                n[t] || (r[t] = r[t](),

                n[t] = 1),

                i.push([r, t])

            }

            , function() {

                i[i.length - 1].length ? i.push(i[i.length - 1].shift(), !0) : i.push(void 0, !1)

            }

            , function() {

                i[i.length - 1] = r[i[i.length - 1]]

            }

            , function() {

                var t = i.pop()

                  , e = i.pop();

                i.push([e[0][e[1]], t])

            }

            , function() {

                var t = i[i.length - 2];

                t[0][t[1]] = i[i.length - 1]

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] < i.pop()

            }

            , function() {

                throw i[i.length - 1]

            }

            , function() {

                var t = i[i.length - 2]

                  , e = Object.getOwnPropertyDescriptor(t[0], t[1]) || {

                    configurable: !0,

                    enumerable: !0

                };

                e.get = i[i.length - 1],

                Object.defineProperty(t[0], t[1], e)

            }

            , function() {

                i.push("")

            }

            , function() {

                i.push(void 0)

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] % i.pop()

            }

            , function() {

                var t, e = [];

                for (t in i.pop())

                    e.push(t);

                i.push(e)

            }

            , function() {

                i.push(i[e[t++]][0])

            }

            , function() {

                i.pop()

            }

            , function() {}

            , function() {

                for (var l = i.pop(), u = e[t++], h = [], d = e[t++], c = e[t++], f = [], g = 0; g < d; g++)

                    h[e[t++]] = i[e[t++]];

                for (g = 0; g < c; g++)

                    f[g] = e[t++];

                var v = function() {

                    var t = h.slice(0);

                    t[0] = [this],

                    t[1] = [arguments],

                    t[2] = [v];

                    for (var i = 0; i < f.length && i < arguments.length; i++)

                        0 < f[i] && (t[f[i]] = [arguments[i]]);

                    return T(u, e, r, t, n, a, s, o)

                };

                v.toString = function() {

                    return l

                }

                ,

                i.push(v)

            }

            , function() {

                var r = e[t++]

                  , n = i[i.length - 2 - r];

                i[i.length - 2 - r] = i.pop(),

                i.push(n)

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] & i.pop()

            }

            , function() {

                var n = e[t++]

                  , a = n ? i.slice(-n) : [];

                i.length -= n,

                i.push(i.pop().apply(r, a))

            }

            , function() {

                var t = i[i.length - 2]

                  , e = Object.getOwnPropertyDescriptor(t[0], t[1]) || {

                    configurable: !0,

                    enumerable: !0

                };

                e.set = i[i.length - 1],

                Object.defineProperty(t[0], t[1], e)

            }

            , function() {

                i.push(null)

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] >>> i.pop()

            }

            , function() {

                var r = (n = e[t++]) ? i.slice(-n) : []

                  , n = (i.length -= n,

                i.pop());

                i.push(n[0][n[1]].apply(n[0], r))

            }

            , function() {

                i[i[i.length - 2][0]][0] = i[i.length - 1]

            }

            , function() {

                for (var l = e[t++], u = [], h = e[t++], d = e[t++], c = [], f = 0; f < h; f++)

                    u[e[t++]] = i[e[t++]];

                for (f = 0; f < d; f++)

                    c[f] = e[t++];

                i.push((function t() {

                    var i = u.slice(0);

                    i[0] = [this],

                    i[1] = [arguments],

                    i[2] = [t];

                    for (var h = 0; h < c.length && h < arguments.length; h++)

                        0 < c[h] && (i[c[h]] = [arguments[h]]);

                    return T(l, e, r, i, n, a, s, o)

                }

                ))

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] - i.pop()

            }

            , function() {

                i[i[i.length - 1][0]] = void 0 === i[i[i.length - 1][0]] ? [] : i[i[i.length - 1][0]]

            }

            , function() {

                var t = i.pop();

                n[t] || (r[t] = r[t](),

                n[t] = 1),

                i.push(r[t])

            }

            , function() {

                i.push(i[i.length - 1])

            }

            , function() {

                i.push(typeof i.pop())

            }

            , function() {

                d = null

            }

            , function() {

                i.length = e[t++]

            }

            , function() {

                var t = i.pop();

                i.push([i[i.pop()][0], t])

            }

            , function() {

                i[i.length - 1] += String.fromCharCode(e[t++])

            }

            , function() {

                var t = i.pop();

                i.push(delete t[0][t[1]])

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] ^ i.pop()

            }

            , function() {

                i.push(~i.pop())

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] > i.pop()

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] >= i.pop()

            }

            , function() {

                h.pop()

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] === i.pop()

            }

            , function() {

                i[i.length - 2] = i[i.length - 2]instanceof i.pop()

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] / i.pop()

            }

            , function() {

                var r = e[t++];

                i[i.length - 1] && (t = r)

            }

            , function() {

                return !0

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] + i.pop()

            }

            , function() {

                i.push([i.pop(), i.pop()].reverse())

            }

            , function() {

                i[i.length - 1] = e[t++]

            }

            , function() {

                i.length -= e[t++]

            }

            , function() {

                i.push([r, i.pop()])

            }

            , function() {

                i.push(!1)

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] << i.pop()

            }

            , function() {

                t = e[t++]

            }

            , function() {

                var r = e[t++]

                  , n = r ? i.slice(-r) : [];

                i.length -= r,

                n.unshift(null),

                i.push(c(i.pop(), n))

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] == i.pop()

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] * i.pop()

            }

            , function() {

                i.push(e[t++])

            }

            , function() {

                h.push([e[t++], i.length, e[t++]])

            }

            , function() {

                var r = (n = e[t++]) ? i.slice(-n) : []

                  , n = (i.length -= n,

                r.unshift(null),

                i.pop());

                i.push(c(n[0][n[1]], r))

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] <= i.pop()

            }

            , function() {

                var t = i.pop();

                i.push(t[0][t[1]])

            }

            , function() {

                return !!d

            }

            , function() {

                i[i.length - 2] = i[i.length - 2]in i.pop()

            }

            , function() {

                i.push(i[i.pop()[0]][0])

            }

            , function() {

                i.push(!0)

            }

            , function() {

                i[i.length - 2] = i[i.length - 2] | i.pop()

            }

            ]; ; )

                try {

                    for (var g = !1; !g; )

                        g = f[e[t++]]();

                    if (d)

                        throw d;

                    return u ? (i.pop(),

                    i.slice(3 + T.v)) : i.pop()

                } catch (e) {

                    var v = h.pop();

                    if (void 0 === v)

                        throw e;

                    d = e,

                    t = v[0],

                    i.length = v[1],

                    v[2] && (i[v[2]][0] = d)

                }

}
```

先观察函数T,发现一个特殊的函数：

[JavaScript] *纯文本查看*

```
function() {

        i[i.length - 1] += String.fromCharCode(e[t++])

}
```

这个下日志点，如图：

![](https://attach.52pojie.cn/forum/202508/31/194639k7wrk532x0x3r50l.png)

再将含apply的函数下日志点（logpoint）（我当时是从上往下一个个下，一个个试的）

经过确定，发现这个是有用的，如图：

![](https://attach.52pojie.cn/forum/202508/31/194641acjbv0r9rbnnjf9c.png)

*这里说一下，为什么用JSON.stringify(r)。
因为你直接用r的话保存为文件时，数组不会展开。*

对这两个地方添加完日志点，再次刷新网页，此时console输出了大量日志，右键->另存为，保存为文件，在用文本编辑器查看，注意：*日志是从下往上看的*。

部分日志如下：

[Asm] *纯文本查看*

```
hls.min.1.1.6.js:1 apply: r= ["33",25] n[0]= (4) ['33z30z2nz2nz2ozoz30z14z2oz32zoz30z32z31z2oz15z2hz31z2mz11z2mz14z14z2gz16z2mz2oz34z30z31z34z31', &#402;, &#402;, &#402;]

hls.min.1.1.6.js:1 字符串： f 233

hls.min.1.1.6.js:1 字符串： fr 235

hls.min.1.1.6.js:1 字符串： fro 237

hls.min.1.1.6.js:1 字符串： from 239

hls.min.1.1.6.js:1 字符串： fromC 241

hls.min.1.1.6.js:1 字符串： fromCh 243

hls.min.1.1.6.js:1 字符串： fromCha 245

hls.min.1.1.6.js:1 字符串： fromChar 247

hls.min.1.1.6.js:1 字符串： fromCharC 249

hls.min.1.1.6.js:1 字符串： fromCharCo 251

hls.min.1.1.6.js:1 字符串： fromCharCod 253

hls.min.1.1.6.js:1 字符串： fromCharCode 255

hls.min.1.1.6.js:1 apply: r= [53] n[0]=

hls.min.1.1.6.js:1 字符串： p 268

hls.min.1.1.6.js:1 字符串： pu 270

hls.min.1.1.6.js:1 字符串： pus 272

hls.min.1.1.6.js:1 字符串： push 274

hls.min.1.1.6.js:1 apply: r= ["5"] n[0]= []

hls.min.1.1.6.js:1 字符串： l 173

hls.min.1.1.6.js:1 字符串： le 175

hls.min.1.1.6.js:1 字符串： len 177

hls.min.1.1.6.js:1 字符串： leng 179

hls.min.1.1.6.js:1 字符串： lengt 181

hls.min.1.1.6.js:1 字符串： length 183

hls.min.1.1.6.js:1 apply: r= ["30",25] n[0]= (4) ['33z30z2nz2nz2ozoz30z14z2oz32zoz30z32z31z2oz15z2hz31z2mz11z2mz14z14z2gz16z2mz2oz34z30z31z34z31', &#402;, &#402;, &#402;]

hls.min.1.1.6.js:1 字符串： f 233

hls.min.1.1.6.js:1 字符串： fr 235

hls.min.1.1.6.js:1 字符串： fro 237

hls.min.1.1.6.js:1 字符串： from 239

hls.min.1.1.6.js:1 字符串： fromC 241

hls.min.1.1.6.js:1 字符串： fromCh 243

hls.min.1.1.6.js:1 字符串： fromCha 245

hls.min.1.1.6.js:1 字符串： fromChar 247

hls.min.1.1.6.js:1 字符串： fromCharC 249

hls.min.1.1.6.js:1 字符串： fromCharCo 251

hls.min.1.1.6.js:1 字符串： fromCharCod 253

hls.min.1.1.6.js:1 字符串： fromCharCode 255

hls.min.1.1.6.js:1 apply: r= [48] n[0]=

hls.min.1.1.6.js:1 字符串： p 268

hls.min.1.1.6.js:1 字符串： pu 270

hls.min.1.1.6.js:1 字符串： pus 272

hls.min.1.1.6.js:1 字符串： push 274

hls.min.1.1.6.js:1 apply: r= ["0"] n[0]= ['5']

hls.min.1.1.6.js:1 字符串： l 173

hls.min.1.1.6.js:1 字符串： le 175

hls.min.1.1.6.js:1 字符串： len 177

hls.min.1.1.6.js:1 字符串： leng 179

hls.min.1.1.6.js:1 字符串： lengt 181

hls.min.1.1.6.js:1 字符串： length 183

hls.min.1.1.6.js:1 apply: r= ["2n",25] n[0]= (4) ['33z30z2nz2nz2ozoz30z14z2oz32zoz30z32z31z2oz15z2hz31z2mz11z2mz14z14z2gz16z2mz2oz34z30z31z34z31', &#402;, &#402;, &#402;]

hls.min.1.1.6.js:1 字符串： f 233

hls.min.1.1.6.js:1 字符串： fr 235

hls.min.1.1.6.js:1 字符串： fro 237

hls.min.1.1.6.js:1 字符串： from 239

hls.min.1.1.6.js:1 字符串： fromC 241

hls.min.1.1.6.js:1 字符串： fromCh 243

hls.min.1.1.6.js:1 字符串： fromCha 245

hls.min.1.1.6.js:1 字符串： fromChar 247

hls.min.1.1.6.js:1 字符串： fromCharC 249

hls.min.1.1.6.js:1 字符串： fromCharCo 251

hls.min.1.1.6.js:1 字符串： fromCharCod 253

hls.min.1.1.6.js:1 字符串： fromCharCode 255

hls.min.1.1.6.js:1 apply: r= [50] n[0]=

hls.min.1.1.6.js:1 字符串： p 268

hls.min.1.1.6.js:1 字符串： pu 270

hls.min.1.1.6.js:1 字符串： pus 272

hls.min.1.1.6.js:1 字符串： push 274

hls.min.1.1.6.js:1 apply: r= ["2"] n[0]= (2) ['5', '0']

hls.min.1.1.6.js:1 字符串： l 173

hls.min.1.1.6.js:1 字符串： le 175

hls.min.1.1.6.js:1 字符串： len 177

hls.min.1.1.6.js:1 字符串： leng 179

hls.min.1.1.6.js:1 字符串： lengt 181

hls.min.1.1.6.js:1 字符串： length 183

hls.min.1.1.6.js:1 apply: r= ["2n",25] n[0]= (4) ['33z30z2nz2nz2ozoz30z14z2oz32zoz30z32z31z2oz15z2hz31z2mz11z2mz14z14z2gz16z2mz2oz34z30z31z34z31', &#402;, &#402;, &#402;]

hls.min.1.1.6.js:1 字符串： f 233

hls.min.1.1.6.js:1 字符串： fr 235

hls.min.1.1.6.js:1 字符串： fro 237

hls.min.1.1.6.js:1 字符串： from 239

hls.min.1.1.6.js:1 字符串： fromC 241

hls.min.1.1.6.js:1 字符串： fromCh 243

hls.min.1.1.6.js:1 字符串： fromCha 245

hls.min.1.1.6.js:1 字符串： fromChar 247

hls.min.1.1.6.js:1 字符串： fromCharC 249

hls.min.1.1.6.js:1 字符串： fromCharCo 251

hls.min.1.1.6.js:1 字符串： fromCharCod 253

hls.min.1.1.6.js:1 字符串： fromCharCode 255

hls.min.1.1.6.js:1 apply: r= [50] n[0]=

hls.min.1.1.6.js:1 字符串： p 268

hls.min.1.1.6.js:1 字符串： pu 270

hls.min.1.1.6.js:1 字符串： pus 272

hls.min.1.1.6.js:1 字符串： push 274

hls.min.1.1.6.js:1 apply: r= ["2"] n[0]= (3) ['5', '0', '2']
```

通过日志，可以发现，

[Asm] *纯文本查看*

```
apply: r= ["2n",25] n[0]= (4) ['33z30z2nz2nz2ozoz30z14z2oz32zoz30z32z31z2oz15z2hz31z2mz11z2mz14z14z2gz16z2mz2oz34z30z31z34z31', &#402;, &#402;, &#402;]
```

这种都是r= ["xx",25]
那么，就不难写条件断点，如图：

![](https://attach.52pojie.cn/forum/202508/31/194643mxx2btw0acdbhbnb.png)

再F5刷新，
通过单步调试，确定算法：（如34Z...)

[JavaScript] *纯文本查看*

```
parseInt("34",25)==79

79^123=52

String.fromCharCode(52)==‘4’
```

就可将其转换成解密加密key的key和iv

它的逆运算：

[JavaScript] *纯文本查看*

```
('4'.charCodeAt(0) ^ 123).toString(25)
```

**四、寻找xxZxxZ...的生成逻辑**

发现这又被vm了，思路仍然一样，对刚刚插桩的函数插桩（在不同js文件中的，有部分函数发生了变化，还好这两个关键函数没有变）

部分日志：

[Asm] *纯文本查看*

```
tcplayer.v4.7.2.min.js:8 apply_tcp: r= ["o"] n[0]= (30) ['2h', '2m', '2m', '11', '16', '34', '31', '11', '34', '16', '2m', '33', '32', '11', '16', '2o', '14', '33', '34', '32', '2n', '32', '34', '30', '11', '2o', '2g', '2g', '33', '2n']

tcplayer.v4.7.2.min.js:8 tcp字符串: l

tcplayer.v4.7.2.min.js:8 tcp字符串: le

tcplayer.v4.7.2.min.js:8 tcp字符串: len

tcplayer.v4.7.2.min.js:8 tcp字符串: leng

tcplayer.v4.7.2.min.js:8 tcp字符串: lengt

tcplayer.v4.7.2.min.js:8 tcp字符串: length

tcplayer.v4.7.2.min.js:8 tcp字符串: c

tcplayer.v4.7.2.min.js:8 tcp字符串: ch

tcplayer.v4.7.2.min.js:8 tcp字符串: cha

tcplayer.v4.7.2.min.js:8 tcp字符串: char

tcplayer.v4.7.2.min.js:8 tcp字符串: charC

tcplayer.v4.7.2.min.js:8 tcp字符串: charCo

tcplayer.v4.7.2.min.js:8 tcp字符串: charCod

tcplayer.v4.7.2.min.js:8 tcp字符串: charCode

tcplayer.v4.7.2.min.js:8 tcp字符串: charCodeA

tcplayer.v4.7.2.min.js:8 tcp字符串: charCodeAt

tcplayer.v4.7.2.min.js:8 apply_tcp: r= [31] n[0]= 833ad47a4d356ad1f5462640a19952cc

tcplayer.v4.7.2.min.js:8 tcp字符串: t

tcplayer.v4.7.2.min.js:8 tcp字符串: to

tcplayer.v4.7.2.min.js:8 tcp字符串: toS

tcplayer.v4.7.2.min.js:8 tcp字符串: toSt

tcplayer.v4.7.2.min.js:8 tcp字符串: toStr

tcplayer.v4.7.2.min.js:8 tcp字符串: toStri

tcplayer.v4.7.2.min.js:8 tcp字符串: toStrin

tcplayer.v4.7.2.min.js:8 tcp字符串: toString

tcplayer.v4.7.2.min.js:8 apply_tcp: r= [25] n[0]= 24

tcplayer.v4.7.2.min.js:8 tcp字符串: p

tcplayer.v4.7.2.min.js:8 tcp字符串: pu

tcplayer.v4.7.2.min.js:8 tcp字符串: pus

tcplayer.v4.7.2.min.js:8 tcp字符串: push

tcplayer.v4.7.2.min.js:8 apply_tcp: r= ["o"] n[0]= (31) ['2h', '2m', '2m', '11', '16', '34', '31', '11', '34', '16', '2m', '33', '32', '11', '16', '2o', '14', '33', '34', '32', '2n', '32', '34', '30', '11', '2o', '2g', '2g', '33', '2n', 'o']
```

通过日志，这时发现key和iv是先本地生成（我一开始以为是从服务器中得到，因为一 中加密key的网址其实有JWT（要替换它的~为.），解析后里面有cipheredOverlayKey和cipheredOverlayIv，至于为什么确定是本地生成，请看五），再转为xxzxxz...（在数组每个元素间加z），最后在另外的js中还原（也就是说，第三点其实是不需要分析的，直接就可以知到它的生成方法，逆运算即可）

**五、确定key和iv的本地生成方法**

四中生成的部分日志：

[Asm] *纯文本查看*

```
tcplayer.v4.7.2.min.js:8 tcp字符串: b

tcplayer.v4.7.2.min.js:8 tcp字符串: ba

tcplayer.v4.7.2.min.js:8 tcp字符串: bas

tcplayer.v4.7.2.min.js:8 tcp字符串: base

tcplayer.v4.7.2.min.js:8 tcp字符串: base6

tcplayer.v4.7.2.min.js:8 tcp字符串: base64

tcplayer.v4.7.2.min.js:8 tcp字符串: base64T

tcplayer.v4.7.2.min.js:8 tcp字符串: base64To

tcplayer.v4.7.2.min.js:8 tcp字符串: base64ToH

tcplayer.v4.7.2.min.js:8 tcp字符串: base64ToHe

tcplayer.v4.7.2.min.js:8 tcp字符串: base64ToHex

tcplayer.v4.7.2.min.js:8 tcp字符串: e

tcplayer.v4.7.2.min.js:8 tcp字符串: en

tcplayer.v4.7.2.min.js:8 tcp字符串: enc

tcplayer.v4.7.2.min.js:8 tcp字符串: encr

tcplayer.v4.7.2.min.js:8 tcp字符串: encry

tcplayer.v4.7.2.min.js:8 tcp字符串: encryp

tcplayer.v4.7.2.min.js:8 tcp字符串: encrypt

tcplayer.v4.7.2.min.js:8 apply_tcp: r= ["94644c3eb5c19b619234ee8731c49e79"] n[0]= t {default_key_size: 1024, default_public_exponent: '010001', log: false, key: e}
```

因此，在字符串生成的那个关键函数下条件断点，在}那加的表达式为：i[i.length - 1]=="encrypt"
F5刷新，
一路单步调试，找到函数：

[JavaScript] *纯文本查看*

```
                function i() {

                            for (var t = "", e = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"], n = 0; n < 32; n++) {

                                t += e[r(0, 15)]

                            }

                            return t

                        }

                        function r(t, e) {

                            return Math.floor(Math.random() * (e - t + 1) + t)

                        }
```

哦，原来是随机生成的key和iv

**六、确定key和iv是如何传递的**
因为解密加密key的key和iv是本地随机生成的，那么服务器给的加密key肯定是要知道本地生成的这些内容，通过查看抓包内容发现了这个：

![](https://attach.52pojie.cn/forum/202508/31/194645kfakrwald944k2r2.png)

其中重要数据是：
cipheredOverlayKey
cipheredOverlayIv
发现其是256位的，结合四中生成的日志（日志文件的最上面），知道它是利用rsa公钥加密向服务器传递，
部分日志：

[Asm] *纯文本查看*

```
tcplayer.v4.7.2.min.js:8 tcp字符串: MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC3pDA7GTxOvNbXRGMi9QSIzQEI+EMD1HcUPJSQSFuRkZkWo4VQECuPRg/xVjqwX1yUrHUvGQJsBwTS/6LIcQiSwYsOqf+8TWxGQOJyW46gPPQVzTjNTiUoq435QB0v11lNxvKWBQIZLmacUZ2r1APta7i/MY4Lx9XlZVMZNUdUywIDAQAB
```

那么就不难想到，它是先本地随机生成一组key和iv，再利用rsa公钥加密，向服务器传递加密的数据，再从服务器得到用这组key和iv加密得到的key，然后在在另一个js中用key和iv解密得到原始key。

**七、验证**
用python写了个rsa公钥加密数据的py，
代码：

[Python] *纯文本查看*

```
from Crypto.PublicKey import RSA

from Crypto.Cipher import PKCS1_v1_5

import base64, re

raw = """MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC3pDA7GTxOvNbXRGMi9QSIzQEI

+EMD1HcUPJSQSFuRkZkWo4VQECuPRg/xVjqwX1yUrHUvGQJsBwTS/6LIcQiSwYsO

qf+8TWxGQOJyW46gPPQVzTjNTiUoq435QB0v11lNxvKWBQIZLmacUZ2r1APta7i/

MY4Lx9XlZVMZNUdUywIDAQAB"""

if "-----BEGIN" not in raw:

    raw = re.sub(r'\s+', '', raw)

    lines = [raw[i:i+64] for i in range(0, len(raw), 64)]

    raw = "-----BEGIN PUBLIC KEY-----\n" + "\n".join(lines) + "\n-----END PUBLIC KEY-----"

pub_key = RSA.import_key(raw)

cipher = PKCS1_v1_5.new(pub_key)

plain = b"6b840e233f9703079db495bf1e029a11"

crypted = cipher.encrypt(plain)

print(crypted.hex())
```

将得到的数据填入cipheredOverlayKey和cipheredOverlayIv中，请求得到

[Asm] *纯文本查看*

```
"drmToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9~eyJ0eXBlIjoiRHJtVG9rZW4iLCJhcHBJZCI6MTUwMDAyNDU0OSwiZmlsZUlkIjoiMzU2MDEzNjYyNDkxMTY3MzA1NiIsImN1cnJlbnRUaW1lU3RhbXAiOjAsImV4cGlyZVRpbWVTdGFtcCI6MjE0NzQ4MzY0NywicmFuZG9tIjowLCJvdmVybGF5S2V5IjoiIiwib3ZlcmxheUl2IjoiIiwiY2lwaGVyZWRPdmVybGF5S2V5IjoiNDRiN2Q5M2NlNWRlM2JkZDhlODY2NmJkOTZlOWRmMzhiN2IyZDVjNDQzYTk2Y2JiMmFjYjU2ZTRmOTc2M2JiNzVhMTYwMWJhNTRjYWFiNDBmMmU3ODY1NTAwZDQzNjBiOTBhNGNkZjdiZjkzM2YzNzU2MDBmMTY5YTkwMDQxMDk5ZTlkNmQzOTk0MWE4NDQ2MWYyM2Q5M2M5N2ZiY2Q2Yjc2OGY4ZGEyMDBhNzI1MDk2NGJmMDg3OGIxODQ2ZDE2ZGQwZTE3ODcwYTA0MjM5ZDNlYzVlMGZmY2RhZDM4OTk0MGYxZWQzNDJhNmZhYWYzMzE0NmMxYzRjYjA3NjIwZSIsImNpcGhlcmVkT3ZlcmxheUl2IjoiNDRiN2Q5M2NlNWRlM2JkZDhlODY2NmJkOTZlOWRmMzhiN2IyZDVjNDQzYTk2Y2JiMmFjYjU2ZTRmOTc2M2JiNzVhMTYwMWJhNTRjYWFiNDBmMmU3ODY1NTAwZDQzNjBiOTBhNGNkZjdiZjkzM2YzNzU2MDBmMTY5YTkwMDQxMDk5ZTlkNmQzOTk0MWE4NDQ2MWYyM2Q5M2M5N2ZiY2Q2Yjc2OGY4ZGEyMDBhNzI1MDk2NGJmMDg3OGIxODQ2ZDE2ZGQwZTE3ODcwYTA0MjM5ZDNlYzVlMGZmY2RhZDM4OTk0MGYxZWQzNDJhNmZhYWYzMzE0NmMxYzRjYjA3NjIwZSIsImtleUlkIjoxLCJzdHJpY3RNb2RlIjowLCJwZXJzaXN0ZW50IjoiIiwicmVudGFsRHVyYXRpb24iOjAsImZvcmNlTDFUcmFja1R5cGVzIjpudWxsfQ~D4ZyESfSAlVA1WAKAQsqelN9tn4GG33gk9NWVa-YAds"
```

再将其作为token请求得到响应体，ctrl+a，右键复制为base64(我用的reqable)
成功得到解密后的原始key

![](https://attach.52pojie.cn/forum/202508/31/194648an17g77xf8l6f6f6.png)

日志：
<https://wwjn.lanzout.com/iB43H351so3a>
