# 某q音乐sign逆向-多角度

> **作者**: utf8 | **发布时间**: 2025-04-08 16:39:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8718 / 75
> **原文**: [https://www.52pojie.cn/thread-2022463-1-1.html](https://www.52pojie.cn/thread-2022463-1-1.html)

---

## 某q音乐sign逆向-多角度

> 目标网站：aHR0cHM6Ly95LnFxLmNvbS9uL3J5cXEvc29uZ0RldGFpbC8wMDJxVTVhWTNRdTI0eQ==

***本文仅供学习交流，因使用本文内容而产生的任何风险及后果，作者不承担任何责任，一起学习吧***

### 逆向分析

#### 定位加密点

查看带有`sign`参数的接口，查看调用堆栈，你可以发现基本都是`vendor.chunk...`这个文件，那么直接进入这个文件。

还是一样的，先进行搜索，简单搜索`sign:`,很快就可以定位到，两处都打上断点。

这里我们还是简单分析一下 `sign` 的值就是 `i` 的值，那么我们简单去看一下 `i` 又是上面那个三元表达式生成的。那么目标就很明确了，在这里打上断点。刷新页面，确认唯一加密入口。

#### 参数生成分析

逐行分析代码：

```
var i, o = n(350).default;
i = "GET" === t.type.toUpperCase() ? o(t.data.data) : o(t.data)
// "GET" === t.type.toUpperCase() --> false --> i = o(t.data)
```

既然找到了入口，那么让我们简单***多次***运行一下这个函数：

```
// o(t.data) --> 'zzc801bff23inniav1jfzf9nzjutynzqhlwaof7812674'
```

你会发现结果一致，那么这个就很方便我们进行后续的分析。我们先记录一组值，方便后续结果验证`o('12345')='zzca873dd41zwq69wr8hrqun6rvk1b5srwqncdc4c4d03'`,。那么加密函数可以确定为这个 `o函数` 那么这个函数是什么呢，我们向上看看这个函数。很容易找到`o = n(350).default`。那么这个n又是上面呢，简单输出一下，你会发现：

```
n = function d(t) {
        if (a[t])
            return a[t].exports;
        var r = a[t] = {
            i: t,
            l: !1,
            exports: {}
        };
        return e[t].call(r.exports, r, r.exports, d),
        r.l = !0,
        r.exports
    }
```

很明显的一个`webpack`，如果你对这部分不是很熟悉你可以上网搜一下，我这边简单讲解一下

##### webpack技术

> 快速入门文章：<https://blog.csdn.net/weixin_46714216/article/details/140741361>

webpack 技术其实就是一个前端模块打包技术，它可以将多个模块按照依赖关系进行静态分析，并生成一个或多个打包后的文件。

**核心概念:** entry（入口）、output（输出）、loader（加载器）和plugin（插件）

逆向的关键点在于找到加载器，在此之前我们先了解一下几个核心的函数：

###### call 方法

* `call` 是 `Function` 的方法，**用来改变函数的 `this` 指向**，并**立即执行**。
* 语法：`func.call(thisArg, arg1, arg2, ...)`

举例：

```
function greet(greeting, punctuation) {
  // this.name 来自于外部传入的对象
  console.log(greeting + ', ' + this.name + punctuation);
}

const person = {
  name: 'Alice'
};

// 使用 call 调用 greet 函数，把 this 指向 person 对象
greet.call(person, 'Hello', '!');  // 输出：Hello, Alice!
```

###### apply 方法

* apply 和 call 功能类似，也是改变函数的 this 指向并立即执行。
* 区别在于：apply 接收参数是以数组形式传入的。
* 语法：func.apply(thisArg, [arg1, arg2, ...])

举例：

```
function greet(greeting, punctuation) {
  // 与 call 示例相同，只是换用 apply
  console.log(greeting + ', ' + this.name + punctuation);
}

const person = {
  name: 'Bob'
};

// 使用 apply 调用 greet 函数，参数作为数组传入
greet.apply(person, ['Hi', '.']);  // 输出：Hi, Bob.
```

##### webpack技术

在学习完上面的内容之后，我们来简单举几个例子，希望你有更深刻的理解：

```
// 1. 使用感叹号将函数声明转为表达式，立即执行该函数并传入一个对象参数
!function(e) { // 形参 e 接收传入的对象 {1:fn,5:fn}
    // 2. 初始化模块缓存对象 t
    t = {};

    // 3. 定义模块加载函数 n
    function n(r) { // r 是模块ID（此处调用时为 '1'）
        // 4. 检查模块是否已加载
        if (t[r]) return t[r].exports; // 已缓存则直接返回exports

        // 5. 初始化新模块容器
        var i = t[r] = { // 同时写入缓存对象 t
            exports: {} // 模块的导出对象
        };

        // 6. 执行模块代码（核心步骤）
        // e[r] 获取模块函数（此处是 e['1'] 对应的函数）
        // 使用 call 方法，将模块函数的 this 指向 i.exports
        // 参数顺序：模块对象, exports对象, 加载函数
        e[r].call(i.exports, i, i.exports, n);

        // 7. 返回模块的导出结果
        return i.exports
    };

    // 8. 触发模块加载：加载ID为'1'的模块
    n('1')
}({
    // 9. 传入的模块定义对象（模拟Webpack的模块集合）
    1: function(){console.log(1)}, // 模块ID为'1'的函数
    5: function(){console.log(5)}  // 模块ID为'5'的函数（未使用）
})
```

#### 参数逆向分析--方法1--补环境

好，回到原来的代码，让我们逐行分析这个代码：

```
n = function d(t) {
        if (a[t])  // 如果模块 a[t] 已经被加载过了（缓存存在），直接返回它的 exports（模块导出内容）
            return a[t].exports;

        // 否则开始加载模块：创建模块对象 r
        var r = a[t] = {
            i: t,       // 模块 id
            l: !1,      // 模块是否已经加载，false 表示还没加载
            exports: {} // 用来存放模块导出的内容
        };

        return e[t].call(r.exports, r, r.exports, d),// 执行模块函数 e[t]，绑定 this 为 r.exports，传入参数：模块对象 r、模块的 exports 和 require 函数 d（自己）
        r.l = !0,  // 标记模块为已加载
        r.exports  // 返回模块的 exports
    }

// ------------------------------------------------------------------------------------------------
// 简单改写一下，清晰结构

function d(t) {

    console.log('调用模块---> ',t)  // 如果你理解了上面的代码，那么我们就可以实现webpack自吐模块了
    var a = {};     // 初始化模块缓存对象
    // 如果模块 a[t] 已经被加载过了（缓存存在），直接返回它的 exports（模块导出内容）
    if (a[t])
        return a[t].exports;

    // 否则开始加载模块：创建模块对象 r
    var r = a[t] = {
        i: t,         // 模块 id
        l: !1,        // 模块是否已经加载，false 表示还没加载
        exports: {}   // 用来存放模块导出的内容
    };

    // 执行模块函数 e[t]，绑定 this 为 r.exports --> 很明显模块是缺失的需要我们自己找
    // 传入参数：模块对象 r、模块的 exports 和 require 函数 d（自己）
    e[t].call(r.exports, r, r.exports, d);

    // 标记模块为已加载
    r.l = !0;

    // 返回模块的 exports
    return r.exports;
}
webpack_output = d //全局暴露 ps:这个导出变量名字最好特殊别被其他变量覆盖咯
```

先从简单的还原webpack开始吧(补环境),直接将一整个加载器完全扣下来

```
var n;

!function(e) {
    function t(t) {
        for (var a, n, d = t[0], c = t[1], i = t[2], l = 0, b = []; l < d.length; l++)
            n = d[l],
            Object.prototype.hasOwnProperty.call(o, n) && o[n] && b.push(o[n][0]),
            o[n] = 0;
        for (a in c)
            Object.prototype.hasOwnProperty.call(c, a) && (e[a] = c[a]);
        for (u && u(t); b.length; )
            b.shift()();
        return f.push.apply(f, i || []),
        r()
    }
    function r() {
        for (var e, t = 0; t < f.length; t++) {
            for (var r = f[t], a = !0, n = 1; n < r.length; n++) {
                var c = r[n];
                0 !== o[c] && (a = !1)
            }
            a && (f.splice(t--, 1),
            e = d(d.s = r[0]))
        }
        return e
    }
    var a = {}
      , n = {
        21: 0
    }
      , o = {
        21: 0
    }
      , f = [];
    function d(t) {

    console.log('调用模块---> ',t)  // 如果你理解了上面的代码，那么我们就可以实现webpack自吐模块了
    var a = {};     // 初始化模块缓存对象
    // 如果模块 a[t] 已经被加载过了（缓存存在），直接返回它的 exports（模块导出内容）
    if (a[t])
        return a[t].exports;

    // 否则开始加载模块：创建模块对象 r
    var r = a[t] = {
        i: t,         // 模块 id
        l: !1,        // 模块是否已经加载，false 表示还没加载
        exports: {}   // 用来存放模块导出的内容
    };

    // 执行模块函数 e[t]，绑定 this 为 r.exports --> 很明显模块是缺失的需要我们自己找
    // 传入参数：模块对象 r、模块的 exports 和 require 函数 d（自己）
    e[t].call(r.exports, r, r.exports, d);

    // 标记模块为已加载
    r.l = !0;

    // 返回模块的 exports
    return r.exports;
    }
    webpack_output = d //全局暴露
    d.e = function(e) {
        var t = [];
        n[e] ? t.push(n[e]) : 0 !== n[e] && {
            1: 1,
            3: 1,
            4: 1,
            5: 1,
            6: 1,
            7: 1,
            8: 1,
            9: 1,
            10: 1,
            11: 1,
            12: 1,
            13: 1,
            14: 1,
            15: 1,
            16: 1,
            17: 1,
            18: 1,
            19: 1,
            20: 1,
            22: 1,
            23: 1,
            24: 1,
            25: 1,
            26: 1
        }[e] && t.push(n[e] = new Promise((function(t, r) {
            for (var a = "css/" + ({
                1: "common",
                3: "album",
                4: "albumDetail",
                5: "album_mall",
                6: "category",
                7: "cmtpage",
                8: "download_detail",
                9: "index",
                10: "msg_center",
                11: "mv",
                12: "mvList",
                13: "mv_toplist",
                14: "notfound",
                15: "player",
                16: "player_radio",
                17: "playlist",
                18: "playlist_edit",
                19: "profile",
                20: "radio",
                22: "search",
                23: "singer",
                24: "singer_list",
                25: "songDetail",
                26: "toplist"
            }[e] || e) + "." + {
                1: "092d215c4a601df90f9f",
                3: "5cf0d69eaf29bcab23d2",
                4: "798353db5b0eb05d5358",
                5: "df4c243f917604263e58",
                6: "20d532d798099a44bc88",
                7: "e3bedf2b5810f8db0684",
                8: "559f0a2e11f1f5800b13",
                9: "2573d208d34ff3d682f0",
                10: "020422608fe8bfb1719a",
                11: "8bdb1df6c5436b790baa",
                12: "47ce9300786df1b70584",
                13: "4aee33230ba2d6b81dce",
                14: "e6f63b0cf57dd029fbd6",
                15: "1d2dbefbea113438324a",
                16: "d893492de07ce97d8048",
                17: "9484fde660fe93d9f9f0",
                18: "67fb85e7f96455763c83",
                19: "5e8c651e74b13244f7cf",
                20: "3befd83c10b19893ec66",
                22: "b2d11f89ea6a512a2302",
                23: "c7a38353c5f4ebb47491",
                24: "df0961952a2d3f022894",
                25: "4c080567e394fd45608b",
                26: "8edb142553f97482e00f"
            }[e] + ".chunk.css?max_age=2592000", o = d.p + a, f = document.getElementsByTagName("link"), c = 0; c < f.length; c++) {
                var i = (u = f[c]).getAttribute("data-href") || u.getAttribute("href");
                if ("stylesheet" === u.rel && (i === a || i === o))
                    return t()
            }
            var l = document.getElementsByTagName("style");
            for (c = 0; c < l.length; c++) {
                var u;
                if ((i = (u = l[c]).getAttribute("data-href")) === a || i === o)
                    return t()
            }
            var b = document.createElement("link");
            b.rel = "stylesheet",
            b.type = "text/css",
            b.onload = t,
            b.onerror = function(t) {
                var a = t && t.target && t.target.src || o
                  , f = new Error("Loading CSS chunk " + e + " failed.\n(" + a + ")");
                f.code = "CSS_CHUNK_LOAD_FAILED",
                f.request = a,
                delete n[e],
                b.parentNode.removeChild(b),
                r(f)
            }
            ,
            b.href = o,
            0 !== b.href.indexOf(window.location.origin + "/") && (b.crossOrigin = "anonymous"),
            document.getElementsByTagName("head")[0].appendChild(b)
        }
        )).then((function() {
            n[e] = 0
        }
        )));
        var r = o[e];
        if (0 !== r)
            if (r)
                t.push(r[2]);
            else {
                var a = new Promise((function(t, a) {
                    r = o[e] = [t, a]
                }
                ));
                t.push(r[2] = a);
                var f, c = document.createElement("script");
                c.charset = "utf-8",
                c.timeout = 120,
                d.nc && c.setAttribute("nonce", d.nc),
                c.src = function(e) {
                    return d.p + "js/" + ({
                        1: "common",
                        3: "album",
                        4: "albumDetail",
                        5: "album_mall",
                        6: "category",
                        7: "cmtpage",
                        8: "download_detail",
                        9: "index",
                        10: "msg_center",
                        11: "mv",
                        12: "mvList",
                        13: "mv_toplist",
                        14: "notfound",
                        15: "player",
                        16: "player_radio",
                        17: "playlist",
                        18: "playlist_edit",
                        19: "profile",
                        20: "radio",
                        22: "search",
                        23: "singer",
                        24: "singer_list",
                        25: "songDetail",
                        26: "toplist"
                    }[e] || e) + ".chunk." + {
                        1: "071ff4c93a36213b8e52",
                        3: "62fa0b6e13bdae5565df",
                        4: "ac1634a6cb1398f5f52f",
                        5: "c165da78f8e281d22b0f",
                        6: "8fbd80e377e3e8e81d2a",
                        7: "d1c1a21bc6d2234edcfd",
                        8: "094e227aa4af23758b7f",
                        9: "25deb3bc649fea321e4e",
                        10: "53237e74c6bc8294affc",
                        11: "1741b53500e75aa199dd",
                        12: "ece15e2e69d60159285f",
                        13: "8bbf72e90588993598fc",
                        14: "6eb4f1aeb6ba0b64b608",
                        15: "f4cd83bb066b3fae0a82",
                        16: "c48f9e6437253f47aedd",
                        17: "b02b0c36e514eacc9804",
                        18: "279d53770728d6d8071f",
                        19: "e1cbac4bc67bc66f7505",
                        20: "07641382e662e56a4bd9",
                        22: "2037125a09567d65d8ac",
                        23: "9e448e13e293aa03a267",
                        24: "fd0f2c1dd1b1dc00ce3e",
                        25: "d340acd4929cab481128",
                        26: "b759d290f5c1376e403c"
                    }[e] + ".js?max_age=2592000"
                }(e),
                0 !== c.src.indexOf(window.location.origin + "/") && (c.crossOrigin = "anonymous");
                var i = new Error;
                f = function(t) {
                    c.onerror = c.onload = null,
                    clearTimeout(l);
                    var r = o[e];
                    if (0 !== r) {
                        if (r) {
                            var a = t && ("load" === t.type ? "missing" : t.type)
                              , n = t && t.target && t.target.src;
                            i.message = "Loading chunk " + e + " failed.\n(" + a + ": " + n + ")",
                            i.name = "ChunkLoadError",
                            i.type = a,
                            i.request = n,
                            r[1](i)
                        }
                        o[e] = void 0
                    }
                }
                ;
                var l = setTimeout((function() {
                    f({
                        type: "timeout",
                        target: c
                    })
                }
                ), 12e4);
                c.onerror = c.onload = f,
                document.head.appendChild(c)
            }
        return Promise.all(t)
    }
    ,
    d.m = e,
    d.c = a,
    d.d = function(e, t, r) {
        d.o(e, t) || Object.defineProperty(e, t, {
            enumerable: !0,
            get: r
        })
    }
    ,
    d.r = function(e) {
        "undefined" !== typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, {
            value: "Module"
        }),
        Object.defineProperty(e, "__esModule", {
            value: !0
        })
    }
    ,
    d.t = function(e, t) {
        if (1 & t && (e = d(e)),
        8 & t)
            return e;
        if (4 & t && "object" === typeof e && e && e.__esModule)
            return e;
        var r = Object.create(null);
        if (d.r(r),
        Object.defineProperty(r, "default", {
            enumerable: !0,
            value: e
        }),
        2 & t && "string" != typeof e)
            for (var a in e)
                d.d(r, a, function(t) {
                    return e[t]
                }
                .bind(null, a));
        return r
    }
    ,
    d.n = function(e) {
        var t = e && e.__esModule ? function() {
            return e.default
        }
        : function() {
            return e
        }
        ;
        return d.d(t, "a", t),
        t
    }
    ,
    d.o = function(e, t) {
        return Object.prototype.hasOwnProperty.call(e, t)
    }
    ,
    d.p = "/ryqq/",
    d.oe = function(e) {
        throw e
    }
    ;
    var c = window.webpackJsonp = window.webpackJsonp || []
      , i = c.push.bind(c);
    c.push = t,
    c = c.slice();
    for (var l = 0; l < c.length; l++)
        t(c[l]);
    var u = i;
    r()
}({});
```

运行看看缺啥，补环境就是缺啥补啥。

ok,缺少`window`。补上 `window = globalThis`和模块导出代码(自己好好想想，这个太简单了),再次运行。
缺少模块模块 350 ，那我们直接去导出看看，发现模块350是`l()`函数，但是记住，`webpack`模块要全扣，把这个一整个大函数(`function(e, t, n)`)扣下来，补入我们的加载器中。这里代码我就不贴出来，自己去思考一下，才可以进步。继续执行，发现缺少模块 80,浏览器输出一下，一看是个window对象，那么我们只需要把这个模块函数返回值设为`window`即可(**这里很坑，你需要注意作用域的问题**，建议直接把n(80)该为window)。再次执行，发现如下报错：

```
throw c ? c(b, d, i) : b;
^
TypeError: Cannot set properties of undefined (setting '_getSecuritySign')
```

这种非模块报错，一般就是被检测环境了，你可以联调测试，一步步去补充缺少的值。这里快速分析，我们直接挂上代理。缺啥补啥。这里比较简单就直接跳过了,简单提一嘴，一般补环境最好把异常捕获给删了，不然有些网站很折磨人。

代理放在这里

```
function getEnvs(proxyObjs) {
    for (let i = 0; i < proxyObjs.length; i++) {
        const handler = `{
      get: function(target, property, receiver) {
        console.log("方法:", "get  ", "对象:", "${proxyObjs[i]}", "  属性:", property, "  属性类型：", typeof property, ", 属性值：", target[property], ", 属性值类型：", typeof target[property]);
        return target[property];
      },
      set: function(target, property, value, receiver) {
        console.log("方法:", "set  ", "对象:", "${proxyObjs[i]}", "  属性:", property, "  属性类型：", typeof property, ", 属性值：", value, ", 属性值类型：", typeof target[property]);
        return Reflect.set(...arguments);
      }
    }`;
        eval(`try {
            ${proxyObjs[i]};
            ${proxyObjs[i]} = new Proxy(${proxyObjs[i]}, ${handler});
        } catch (e) {
            ${proxyObjs[i]} = {};
            ${proxyObjs[i]} = new Proxy(${proxyObjs[i]}, ${handler});
        }`);
    }
}

proxyObjs = ['window', 'document', 'location', 'navigator', 'history', 'screen']
getEnvs(proxyObjs);
```

简单补上环境我们就成功拿到了结果，验证是正确的。

#### 参数逆向分析--方法2--插桩

~~补环境确实简单，其实纯算也不难~~

单纯研究这个vmp，故直接修改补环境的代码。

既然我们找到了，参数生成的入口，函数o，那我们就去看看这个函数到底做了什么。

一般插装的方法的重点在于call,apply,和各种各样的运算符的位置。那么简单的在这些位置上插装吧(~~巨麻烦~~)。具体插装，我直接放到代码里面了。插桩不是一次就可以成功的，自己可以多试试，***注意指针！！！***

日志一般是倒着看（确定逆向目标，分布击破），我这边讲解就顺着讲了。~~看别人不如自己写一写~~

日志最开始就是一堆初始化，而且大头都是sha1的摘要计算。为什么是sha1，这个就需要你对这个算法比较熟悉了，这部分我基本上看到这几个魔法值就确定这个算法。

我贴出关键日志

```
[case 67] 准备调用: d[12].call(d[11], d[15])
    => 函数 theFunc =  [Function: l]
    => this = d[11] =  l {
  blocks: [
    0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0,
    0, 0, 0
  ],
  h0: 1732584193,
  h1: 4023233417,
  h2: 2562383102,
  h3: 271733878,
  h4: 3285377520,  --> sha1
  hBytes: 0,
  bytes: 0,
  start: 0,
  block: 0,
  hashed: false,
  finalized: false,
  first: true
}
    => 参数1 = d[15] =  12345  --> 入参
```

这里简单讲一下这个技巧

| 算法 | 状态变量数<br>(如：`h0 ~ h3`) | 初始魔法值个数 | 魔法值（十六进制） | 魔法值（十进制） | 总长度（比特） |
| --- | --- | --- | --- | --- | --- |
| **MD5** | 4 <br>`(h0 ~ h3)` | 4 | `h0=0x67452301`<br>`h1=0xEFCDAB89`<br>`h2=0x98BADCFE`<br>`h3=0x10325476` | `h0=1732584193`<br>`h1=4023233417`<br>`h2=2562383102`<br>`h3=271733878` | 128 bits |
| **SHA-1** | 5 <br>`(h0 ~ h4)` | 5 | 同上 +<br>`h4=0xC3D2E1F0` | 同上 +<br>`h4=3285377520` | 160 bits |

简单验证一下 `12345` sha1 --> `8CB2237D0679CA88DB6464EAC60DA96345513964`  完全没问题。那么接着看另一部分加密

日志如下：

```
[case 67] 准备调用: d[127].call(d[95], d[38])
    => 函数 theFunc =  [Function: map]
    => this = d[95] =  [
  23, 14, 6, 36,
  16, 40, 7, 19
]  --> 循环列表
    => 参数1 = d[38] =  [Function: l]
执行到--》 37
执行到--》 28
[Hook] case 28 start, g= 3498
[Hook] key1 = n[3499] = 16
[Hook] key2 = n[3500] = 14
[Hook] key3 = n[3501] = 0
[Hook] d[16] = d[14][0] = 8CB2237D0679CA88DB6464EAC60DA96345513964   sha1 字符串
[Hook] case 28 end, d[16] => 8CB2237D0679CA88DB6464EAC60DA96345513964
执行到--》 28
[Hook] case 28 start, g= 3502
[Hook] key1 = n[3503] = 9
[Hook] key2 = n[3504] = 12
[Hook] key3 = n[3505] = 0
[Hook] d[9] = d[12][0] = true
[Hook] case 28 end, d[9] => true
执行到--》 47
执行到--》 77
执行到--》 78
[Hook] case 78 start, g = 257
[Hook] key1 = n[258] = 18
[Hook] key2 = n[259] = 16
[Hook] key3 = n[260] = 8
[Hook] subKey = d[8] => 23
[Hook] rightVal = d[16][23] => A
[Hook] d[18] now => A
[Hook] case 78 end
执行到--》 1
执行到--》 37
执行到--》 28
[Hook] case 28 start, g= 3498
[Hook] key1 = n[3499] = 16
[Hook] key2 = n[3500] = 14
[Hook] key3 = n[3501] = 0
[Hook] d[16] = d[14][0] = 8CB2237D0679CA88DB6464EAC60DA96345513964
[Hook] case 28 end, d[16] => 8CB2237D0679CA88DB6464EAC60DA96345513964
执行到--》 28
[Hook] case 28 start, g= 3502
[Hook] key1 = n[3503] = 9
[Hook] key2 = n[3504] = 12
[Hook] key3 = n[3505] = 0
[Hook] d[9] = d[12][0] = true
[Hook] case 28 end, d[9] => true
执行到--》 47
执行到--》 77
执行到--》 78
[Hook] case 78 start, g = 257
[Hook] key1 = n[258] = 18
[Hook] key2 = n[259] = 16
[Hook] key3 = n[260] = 8
[Hook] subKey = d[8] => 14
[Hook] rightVal = d[16][14] => 8
[Hook] d[18] now => 8
[Hook] case 78 end
执行到--》 1
执行到--》 37
执行到--》 28
[Hook] case 28 start, g= 3498
[Hook] key1 = n[3499] = 16
[Hook] key2 = n[3500] = 14
[Hook] key3 = n[3501] = 0
[Hook] d[16] = d[14][0] = 8CB2237D0679CA88DB6464EAC60DA96345513964
[Hook] case 28 end, d[16] => 8CB2237D0679CA88DB6464EAC60DA96345513964
执行到--》 28
[Hook] case 28 start, g= 3502
[Hook] key1 = n[3503] = 9
[Hook] key2 = n[3504] = 12
[Hook] key3 = n[3505] = 0
[Hook] d[9] = d[12][0] = true
[Hook] case 28 end, d[9] => true
执行到--》 47
执行到--》 77
执行到--》 78
[Hook] case 78 start, g = 257
[Hook] key1 = n[258] = 18
[Hook] key2 = n[259] = 16
[Hook] key3 = n[260] = 8
[Hook] subKey = d[8] => 6
[Hook] rightVal = d[16][6] => 7
[Hook] d[18] now => 7
[Hook] case 78 end
执行到--》 1
执行到--》 37
执行到--》 28
[Hook] case 28 start, g= 3498
[Hook] key1 = n[3499] = 16
[Hook] key2 = n[3500] = 14
[Hook] key3 = n[3501] = 0
[Hook] d[16] = d[14][0] = 8CB2237D0679CA88DB6464EAC60DA96345513964
[Hook] case 28 end, d[16] => 8CB2237D0679CA88DB6464EAC60DA96345513964
执行到--》 28
[Hook] case 28 start, g= 3502
[Hook] key1 = n[3503] = 9
[Hook] key2 = n[3504] = 12
[Hook] key3 = n[3505] = 0
[Hook] d[9] = d[12][0] = true
[Hook] case 28 end, d[9] => true
执行到--》 47
执行到--》 77
执行到--》 78
[Hook] case 78 start, g = 257
[Hook] key1 = n[258] = 18
[Hook] key2 = n[259] = 16
[Hook] key3 = n[260] = 8
[Hook] subKey = d[8] => 36
[Hook] rightVal = d[16][36] => 3
[Hook] d[18] now => 3
[Hook] case 78 end
执行到--》 1
执行到--》 37
执行到--》 28
[Hook] case 28 start, g= 3498
[Hook] key1 = n[3499] = 16
[Hook] key2 = n[3500] = 14
[Hook] key3 = n[3501] = 0
[Hook] d[16] = d[14][0] = 8CB2237D0679CA88DB6464EAC60DA96345513964
[Hook] case 28 end, d[16] => 8CB2237D0679CA88DB6464EAC60DA96345513964
执行到--》 28
[Hook] case 28 start, g= 3502
[Hook] key1 = n[3503] = 9
[Hook] key2 = n[3504] = 12
[Hook] key3 = n[3505] = 0
[Hook] d[9] = d[12][0] = true
[Hook] case 28 end, d[9] => true
执行到--》 47
执行到--》 77
执行到--》 78
[Hook] case 78 start, g = 257
[Hook] key1 = n[258] = 18
[Hook] key2 = n[259] = 16
[Hook] key3 = n[260] = 8
[Hook] subKey = d[8] => 16
[Hook] rightVal = d[16][16] => D
[Hook] d[18] now => D
[Hook] case 78 end
执行到--》 1
执行到--》 37
执行到--》 28
[Hook] case 28 start, g= 3498
[Hook] key1 = n[3499] = 16
[Hook] key2 = n[3500] = 14
[Hook] key3 = n[3501] = 0
[Hook] d[16] = d[14][0] = 8CB2237D0679CA88DB6464EAC60DA96345513964
[Hook] case 28 end, d[16] => 8CB2237D0679CA88DB6464EAC60DA96345513964
执行到--》 28
[Hook] case 28 start, g= 3502
[Hook] key1 = n[3503] = 9
[Hook] key2 = n[3504] = 12
[Hook] key3 = n[3505] = 0
[Hook] d[9] = d[12][0] = true
[Hook] case 28 end, d[9] => true
执行到--》 47
执行到--》 77
执行到--》 78
[Hook] case 78 start, g = 257
[Hook] key1 = n[258] = 18
[Hook] key2 = n[259] = 16
[Hook] key3 = n[260] = 8
[Hook] subKey = d[8] => 40
[Hook] rightVal = d[16][40] => undefined
[Hook] d[18] now => undefined
[Hook] case 78 end
执行到--》 1
执行到--》 37
执行到--》 28
[Hook] case 28 start, g= 3498
[Hook] key1 = n[3499] = 16
[Hook] key2 = n[3500] = 14
[Hook] key3 = n[3501] = 0
[Hook] d[16] = d[14][0] = 8CB2237D0679CA88DB6464EAC60DA96345513964
[Hook] case 28 end, d[16] => 8CB2237D0679CA88DB6464EAC60DA96345513964
执行到--》 28
[Hook] case 28 start, g= 3502
[Hook] key1 = n[3503] = 9
[Hook] key2 = n[3504] = 12
[Hook] key3 = n[3505] = 0
[Hook] d[9] = d[12][0] = true
[Hook] case 28 end, d[9] => true
执行到--》 47
执行到--》 77
执行到--》 78
[Hook] case 78 start, g = 257
[Hook] key1 = n[258] = 18
[Hook] key2 = n[259] = 16
[Hook] key3 = n[260] = 8
[Hook] subKey = d[8] => 7
[Hook] rightVal = d[16][7] => D
[Hook] d[18] now => D
[Hook] case 78 end
执行到--》 1
执行到--》 37
执行到--》 28
[Hook] case 28 start, g= 3498
[Hook] key1 = n[3499] = 16
[Hook] key2 = n[3500] = 14
[Hook] key3 = n[3501] = 0
[Hook] d[16] = d[14][0] = 8CB2237D0679CA88DB6464EAC60DA96345513964
[Hook] case 28 end, d[16] => 8CB2237D0679CA88DB6464EAC60DA96345513964
执行到--》 28
[Hook] case 28 start, g= 3502
[Hook] key1 = n[3503] = 9
[Hook] key2 = n[3504] = 12
[Hook] key3 = n[3505] = 0
[Hook] d[9] = d[12][0] = true
[Hook] case 28 end, d[9] => true
执行到--》 47
执行到--》 77
执行到--》 78
[Hook] case 78 start, g = 257
[Hook] key1 = n[258] = 18
[Hook] key2 = n[259] = 16
[Hook] key3 = n[260] = 8
[Hook] subKey = d[8] => 19
[Hook] rightVal = d[16][19] => 4
[Hook] d[18] now => 4
[Hook] case 78 end
执行到--》 1
    => 调用结束，赋值 d[139] =  [ 'A', '8', '7', '3', 'D', undefined, 'D', '4' ]  --> A873DD4  DC4C4D03也是同理，但是前面的循环列表不一样，自己去找找吧
```

这部分日志很简单。就是循环列表在sha1串里面取字符

还原代码如下：

```
function extractByIndexArray(key_str, indexArray) {
  return indexArray.map(i => key_str[i]).join('');
}
const indices1 = [23, 14, 6, 36 ,16 , 40, 7, 19];
const result1 = extractByIndexArray(sha1, indices1);
console.log('result1:', result1);  // => A873DD4
```

接下来这部分这个核心加密点，需要你日志点输出准确，不然确实不太好看

核心日志如下:

```
[Hook]77 assignment start, g = 5037
[Hook] key1 = n[5038] = 87
[Hook] key2 = n[5039] = 38
[Hook] d[87] = d[38] => [
   89,  39, 179, 150, 218,  82,
   58, 252, 177,  52, 186, 123,
  120,  64, 242, 133, 143, 161,
  121, 179
]
[Hook]77 assignment end
执行到--》 28
[Hook] case 28 start, g= 5040
[Hook] key1 = n[5041] = 38
[Hook] key2 = n[5042] = 67
[Hook] key3 = n[5043] = 0
[Hook] d[38] = d[67][0] = true
[Hook] case 28 end, d[38] => true
执行到--》 47
执行到--》 56
执行到--》 27
执行到--》 77
[Hook]77 assignment start, g = 440
[Hook] key1 = n[441] = 48
[Hook] key2 = n[442] = 18
[Hook] d[48] = d[18] => []
[Hook]77 assignment end
执行到--》 27
执行到--》 77
[Hook]77 assignment start, g = 446
[Hook] key1 = n[447] = 181
[Hook] key2 = n[448] = 144
[Hook] d[181] = d[144] => 0
[Hook]77 assignment end
执行到--》 7
执行到--》 48
执行到--》 47
执行到--》 60
执行到--》 21
case21 乘法运算: 0 * 2 = 0，写入 d[186]
执行到--》 78
[Hook] case 78 start, g = 5210
[Hook] key1 = n[5211] = 95
[Hook] key2 = n[5212] = 38
[Hook] key3 = n[5213] = 186
[Hook] subKey = d[186] => 0
[Hook] rightVal = d[38][0] => 8
[Hook] d[38] = "8CB2237D0679CA88DB6464EAC60DA96345513964"
[Hook] d[95] now => 8
[Hook] case 78 end
执行到--》 78
[Hook] case 78 start, g = 5214
[Hook] key1 = n[5215] = 186
[Hook] key2 = n[5216] = 85
[Hook] key3 = n[5217] = 95
[Hook] subKey = d[95] => 8
[Hook] rightVal = d[85][8] => 8
[Hook] d[85] = {"0":0,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"A":10,"B":11,"C":12,"D":13,"E":14,"F":15}
[Hook] d[186] now => 8
[Hook] case 78 end
执行到--》 27
执行到--》 21
case21 乘法运算: 8 * 16 = 128，写入 d[38]
执行到--》 28
[Hook] case 28 start, g= 5225
[Hook] key1 = n[5226] = 95
[Hook] key2 = n[5227] = 43
[Hook] key3 = n[5228] = 0
[Hook] d[95] = d[43][0] = 8CB2237D0679CA88DB6464EAC60DA96345513964
[Hook] case 28 end, d[95] => 8CB2237D0679CA88DB6464EAC60DA96345513964
执行到--》 21
case21 乘法运算: 0 * 2 = 0，写入 d[186]
执行到--》 34 加法运算: 0 + 1 = 1，写入 d[134]
执行到--》 78
[Hook] case 78 start, g = 5237
[Hook] key1 = n[5238] = 186
[Hook] key2 = n[5239] = 95
[Hook] key3 = n[5240] = 134
[Hook] subKey = d[134] => 1
[Hook] rightVal = d[95][1] => C
[Hook] d[95] = "8CB2237D0679CA88DB6464EAC60DA96345513964"
[Hook] d[186] now => C
[Hook] case 78 end
执行到--》 69
[Hook] case 69 start, g = 5241
[Hook] s1_leftKey = n[5242] = 134
[Hook] s1_baseKey = n[5243] = 85
[Hook] s1_subKeyIndex = n[5244] = 186
[Hook] s1_subKey = d[186] => C
[Hook] s1_rightVal = d[85][C] => 12
[Hook] s1_rightVal = d[85] = {"0":0,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"A":10,"B":11,"C":12,"D":13,"E":14,"F":15}
[Hook] d[134] = 12
[Hook] s2_leftKey = n[5245] = 186
[Hook] s2_rightKey1 = n[5246] = 38
[Hook] s2_rightKey2 = n[5247] = 134
[Hook] s2_val1 = d[38] => 128
[Hook] s2_val2 = d[134] => 12
[Hook] s2_result = 128 + 12 => 140
[Hook] d[186] = 140
[Hook] case 69 end
执行到--》 77
[Hook]77 assignment start, g = 5248
[Hook] key1 = n[5249] = 37
[Hook] key2 = n[5250] = 186
[Hook] d[37] = d[186] => 140
[Hook]77 assignment end
执行到--》 78
[Hook] case 78 start, g = 5251
[Hook] key1 = n[5252] = 186
[Hook] key2 = n[5253] = 87
[Hook] key3 = n[5254] = 181
[Hook] subKey = d[181] => 0
[Hook] rightVal = d[87][0] => 89
[Hook] d[87] = [89,39,179,150,218,82,58,252,177,52,186,123,120,64,242,133,143,161,121,179]
[Hook] d[186] now => 89
[Hook] case 78 end
执行到--》 77
[Hook]77 assignment start, g = 5255
[Hook] key1 = n[5256] = 140
[Hook] key2 = n[5257] = 186
[Hook] d[140] = d[186] => 89
[Hook]77 assignment end
执行到--》 38
执行到--》 4
执行到--》 51 异或运算: 140 ^ 89 = 213，写入 d[186]
执行到--》 67
case67
[case 67] 准备调用: d[134].call(d[48], d[186])
    => 函数 theFunc =  [Function: push]
    => this = d[48] =  []
    => 参数1 = d[186] =  213
    => 调用结束，赋值 d[28] =  1
执行到--》 47
执行到--》 77
[Hook]77 assignment start, g = 4053
[Hook] key1 = n[4054] = 38
[Hook] key2 = n[4055] = 181
[Hook] d[38] = d[181] => 0
[Hook]77 assignment end
执行到--》 66
执行到--》 22
执行到--》 7
执行到--》 47
执行到--》 60
执行到--》 21
case21 乘法运算: 1 * 2 = 2，写入 d[186]
执行到--》 78
[Hook] case 78 start, g = 5210
[Hook] key1 = n[5211] = 95
[Hook] key2 = n[5212] = 38
[Hook] key3 = n[5213] = 186
[Hook] subKey = d[186] => 2
[Hook] rightVal = d[38][2] => B
[Hook] d[38] = "8CB2237D0679CA88DB6464EAC60DA96345513964"
[Hook] d[95] now => B
[Hook] case 78 end
执行到--》 78
[Hook] case 78 start, g = 5214
[Hook] key1 = n[5215] = 186
[Hook] key2 = n[5216] = 85
[Hook] key3 = n[5217] = 95
[Hook] subKey = d[95] => B
[Hook] rightVal = d[85][B] => 11
[Hook] d[85] = {"0":0,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"A":10,"B":11,"C":12,"D":13,"E":14,"F":15}
[Hook] d[186] now => 11
[Hook] case 78 end
执行到--》 27
执行到--》 21
case21 乘法运算: 11 * 16 = 176，写入 d[38]
执行到--》 28
[Hook] case 28 start, g= 5225
[Hook] key1 = n[5226] = 95
[Hook] key2 = n[5227] = 43
[Hook] key3 = n[5228] = 0
[Hook] d[95] = d[43][0] = 8CB2237D0679CA88DB6464EAC60DA96345513964
[Hook] case 28 end, d[95] => 8CB2237D0679CA88DB6464EAC60DA96345513964
执行到--》 21
case21 乘法运算: 1 * 2 = 2，写入 d[186]
执行到--》 34 加法运算: 2 + 1 = 3，写入 d[134]
执行到--》 78
[Hook] case 78 start, g = 5237
[Hook] key1 = n[5238] = 186
[Hook] key2 = n[5239] = 95
[Hook] key3 = n[5240] = 134
[Hook] subKey = d[134] => 3
[Hook] rightVal = d[95][3] => 2
[Hook] d[95] = "8CB2237D0679CA88DB6464EAC60DA96345513964"
[Hook] d[186] now => 2
[Hook] case 78 end
执行到--》 69
[Hook] case 69 start, g = 5241
[Hook] s1_leftKey = n[5242] = 134
[Hook] s1_baseKey = n[5243] = 85
[Hook] s1_subKeyIndex = n[5244] = 186
[Hook] s1_subKey = d[186] => 2
[Hook] s1_rightVal = d[85][2] => 2
[Hook] s1_rightVal = d[85] = {"0":0,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"A":10,"B":11,"C":12,"D":13,"E":14,"F":15}
[Hook] d[134] = 2
[Hook] s2_leftKey = n[5245] = 186
[Hook] s2_rightKey1 = n[5246] = 38
[Hook] s2_rightKey2 = n[5247] = 134
[Hook] s2_val1 = d[38] => 176
[Hook] s2_val2 = d[134] => 2
[Hook] s2_result = 176 + 2 => 178
[Hook] d[186] = 178
[Hook] case 69 end
执行到--》 77
[Hook]77 assignment start, g = 5248
[Hook] key1 = n[5249] = 37
[Hook] key2 = n[5250] = 186
[Hook] d[37] = d[186] => 178
[Hook]77 assignment end
执行到--》 78
[Hook] case 78 start, g = 5251
[Hook] key1 = n[5252] = 186
[Hook] key2 = n[5253] = 87
[Hook] key3 = n[5254] = 181
[Hook] subKey = d[181] => 1
[Hook] rightVal = d[87][1] => 39
[Hook] d[87] = [89,39,179,150,218,82,58,252,177,52,186,123,120,64,242,133,143,161,121,179]
[Hook] d[186] now => 39
[Hook] case 78 end
执行到--》 77
[Hook]77 assignment start, g = 5255
[Hook] key1 = n[5256] = 140
[Hook] key2 = n[5257] = 186
[Hook] d[140] = d[186] => 39
[Hook]77 assignment end
执行到--》 38
执行到--》 4
执行到--》 51 异或运算: 178 ^ 39 = 149，写入 d[186]
执行到--》 67
case67
[case 67] 准备调用: d[134].call(d[48], d[186])
    => 函数 theFunc =  [Function: push]
    => this = d[48] =  [ 213 ]
    => 参数1 = d[186] =  149
    => 调用结束，赋值 d[28] =  2
执行到--》 47
执行到--》 77
[Hook]77 assignment start, g = 4053
[Hook] key1 = n[4054] = 38
[Hook] key2 = n[4055] = 181
[Hook] d[38] = d[181] => 1
[Hook]77 assignment end
执行到--》 66
执行到--》 22
执行到--》 7
执行到--》 47
执行到--》 60
执行到--》 21
case21 乘法运算: 2 * 2 = 4，写入 d[186]
执行到--》 78
[Hook] case 78 start, g = 5210
[Hook] key1 = n[5211] = 95
[Hook] key2 = n[5212] = 38
[Hook] key3 = n[5213] = 186
[Hook] subKey = d[186] => 4
[Hook] rightVal = d[38][4] => 2
[Hook] d[38] = "8CB2237D0679CA88DB6464EAC60DA96345513964"
[Hook] d[95] now => 2
[Hook] case 78 end
执行到--》 78
[Hook] case 78 start, g = 5214
[Hook] key1 = n[5215] = 186
[Hook] key2 = n[5216] = 85
[Hook] key3 = n[5217] = 95
[Hook] subKey = d[95] => 2
[Hook] rightVal = d[85][2] => 2
[Hook] d[85] = {"0":0,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"A":10,"B":11,"C":12,"D":13,"E":14,"F":15}
[Hook] d[186] now => 2
[Hook] case 78 end
执行到--》 27
执行到--》 21
case21 乘法运算: 2 * 16 = 32，写入 d[38]
执行到--》 28
[Hook] case 28 start, g= 5225
[Hook] key1 = n[5226] = 95
[Hook] key2 = n[5227] = 43
[Hook] key3 = n[5228] = 0
[Hook] d[95] = d[43][0] = 8CB2237D0679CA88DB6464EAC60DA96345513964
[Hook] case 28 end, d[95] => 8CB2237D0679CA88DB6464EAC60DA96345513964
执行到--》 21
case21 乘法运算: 2 * 2 = 4，写入 d[186]
执行到--》 34 加法运算: 4 + 1 = 5，写入 d[134]
执行到--》 78
[Hook] case 78 start, g = 5237
[Hook] key1 = n[5238] = 186
[Hook] key2 = n[5239] = 95
[Hook] key3 = n[5240] = 134
[Hook] subKey = d[134] => 5
[Hook] rightVal = d[95][5] => 3
[Hook] d[95] = "8CB2237D0679CA88DB6464EAC60DA96345513964"
[Hook] d[186] now => 3
[Hook] case 78 end
执行到--》 69
[Hook] case 69 start, g = 5241
[Hook] s1_leftKey = n[5242] = 134
[Hook] s1_baseKey = n[5243] = 85
[Hook] s1_subKeyIndex = n[5244] = 186
[Hook] s1_subKey = d[186] => 3
[Hook] s1_rightVal = d[85][3] => 3
[Hook] s1_rightVal = d[85] = {"0":0,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"A":10,"B":11,"C":12,"D":13,"E":14,"F":15}
[Hook] d[134] = 3
[Hook] s2_leftKey = n[5245] = 186
[Hook] s2_rightKey1 = n[5246] = 38
[Hook] s2_rightKey2 = n[5247] = 134
[Hook] s2_val1 = d[38] => 32
[Hook] s2_val2 = d[134] => 3
[Hook] s2_result = 32 + 3 => 35
[Hook] d[186] = 35
[Hook] case 69 end
执行到--》 77
[Hook]77 assignment start, g = 5248
[Hook] key1 = n[5249] = 37
[Hook] key2 = n[5250] = 186
[Hook] d[37] = d[186] => 35
[Hook]77 assignment end
执行到--》 78
[Hook] case 78 start, g = 5251
[Hook] key1 = n[5252] = 186
[Hook] key2 = n[5253] = 87
[Hook] key3 = n[5254] = 181
[Hook] subKey = d[181] => 2
[Hook] rightVal = d[87][2] => 179
[Hook] d[87] = [89,39,179,150,218,82,58,252,177,52,186,123,120,64,242,133,143,161,121,179]
[Hook] d[186] now => 179
[Hook] case 78 end
执行到--》 77
[Hook]77 assignment start, g = 5255
[Hook] key1 = n[5256] = 140
[Hook] key2 = n[5257] = 186
[Hook] d[140] = d[186] => 179
[Hook]77 assignment end
执行到--》 38
执行到--》 4
执行到--》 51 异或运算: 35 ^ 179 = 144，写入 d[186]
```

简单讲解如下：

```
// key_str = 8CB2237D0679CA88DB6464EAC60DA96345513964
// 乘法运算是：

// 一轮
// 乘法运算: 0 * 2 = 0，写入 d[186]  --> key_str[0]  --> 8
// dict['8'] --> 8
// 乘法运算: 8 * 16 = 128
// key_str[1]  --> C --> dict['C'] --> 12
// 128 + 12 = 140
// 140 ^ key_list[0] --> 140 ^ 89 = 213

// 二轮
// 乘法运算: 1 * 2 = 2，写入 d[186] --> key_str[2] --> B
// dict['B'] --> 11
// 乘法运算: 11 * 16 = 176，写入 d[38]
// key_str[3] --> 2 --> dict['2'] --> 2
// 176 + 2 = 178
// 178 ^ key_list[1] --> 178 ^ 39 = 149
function decodeKeyToNumberArray(key_str) {
    const dict = {
     看看日志你也可以做出来的
    };

    const key_list = [
      看看日志你也可以做出来的
    ];

    const numberArray = [];

    for (let i = 0; i < key_list.length; i++) {
      const highChar = key_str[2 * i];
      const lowChar  = key_str[2 * i + 1];

      const highVal = dict[highChar];
      const lowVal  = dict[lowChar];

      const byteVal = highVal * 16 + lowVal;
      const xored   = byteVal ^ key_list[i];

      numberArray.push(xored);

      // 可选日志输出
      console.log(
        `Pair #${i}: "${highChar}${lowChar}" => (${highVal}*16 + ${lowVal} = ${byteVal})` +
        ` ^ ${key_list[i]} = ${xored}`
      );
    }

    return numberArray;
  }
```

结果和日志一样，这里就不展示了`[213,149,144,235,220,43,240,116,106,80,222,145,190,77,91,230,202,240,64,215]`。

后面一部分将这个数组转化为字符串，看到这个 `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=`,基本就可以猜一下`base64`。

```
const byteArray = new Uint8Array([213,149,144,235,220,43,240,116,106,80,222,145,190,77,91,230,202,240,64,215]);
const base64 = btoa(String.fromCharCode(...byteArray));
console.log(base64); //--> 1ZWQ691L8HRqUN6Rvk1b5srwQNc=
```

果不其然就是这个，只不过是把最后结果 --> `.replace(/[\/+=]/g, '')`

那么这一部分算法也就完成了。

最后将前面的字符串拼接就是最后的结果：

```
zzc(定死) + A873DD4 + 1ZWQ691L8HRqUN6Rvk1b5srwQNc + DC4C4D03  --toLowerCase--> zzca873dd41zwq69wr8hrqun6rvk1b5srwqncdc4c4d03
```

纯算就完成了,完整代码就不写了，看着上面都是可以推出来的。

#### 参数逆向分析--方法3--反汇编

~~你知道你很急，但是先别急~~。这部分我要想想怎么用通俗的语言讲~~画大饼~~。静待佳音吧。
