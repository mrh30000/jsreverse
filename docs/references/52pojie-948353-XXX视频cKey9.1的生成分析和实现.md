# XXX视频cKey9.1的生成分析和实现

> **作者**: ZSAIm | **发布时间**: 2019-05-05 17:09:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 44837 / 122
> **原文**: [https://www.52pojie.cn/thread-948353-1-1.html](https://www.52pojie.cn/thread-948353-1-1.html)

---

*本帖最后由 Kido 于 2019-6-6 18:13 编辑*

## 腾讯视频cKey9.1的生成分析和实现

### 说明：

#### 这文章并不是对算法的分析，而仅仅是为了实现cKey9.1（因为有Nodejs了，所以就不需要担心JS脚本的运行)。

#### 而其中的算法就是取自于腾讯视频的9.1加密版本的cKey，所以本文章仅仅是对腾讯视频cKey生成算法的提取。

### 项目实现

* ***<https://github.com/ZSAIm/iqiyi-parser>***
* ***<https://github.com/ZSAIm/iqiyi-parser/blob/master/js/tencent.js>***

### 前提

#### 建议

###### 在阅读本文章之前先阅读我的上一篇文章 [爱奇艺视频H5解析分析过程](https://www.52pojie.cn/thread-792958-1-1.html) ，因为这一文章将基于默认已知上一篇的一些使用操作方法的前提下进行。

###### 这文章只对cKey生成的实现和分析，其他所需提交的参数不会在这里分析说明。

#### 预备知识

以下所需要的知识不需要精通，只需要了解和知道基本的语法即可。

* JavaScript
* **WebAssembly**

### 正文

#### 关于腾讯视频cKey

* 腾讯视频的cKey是解析视频直接地址的核心关键，只有通过该算法的加密才能够请求到要解析的数据。
* 目前我所知的腾讯算法有8.1和9.1两个版本，8.1版本是为了兼容不支持WebAssembly的那一部分用户。所以实际上这两者在PC网页端里面所做的工作基本一致。因为8.1版本的cKey基本上和爱奇艺那一部分算法的分析过程差不多所以我就不在这里分析了（腾讯视频cKey的那一部分解析可能要繁琐一些）。
* 所以这文章将对9.1版本进行分析实现。

#### 关于工具

* 这一文章将不使用Fiddler来抓包，而是全程使用chromium核的开发者工具进行分析。
* 一说到chromium，可能大家第一反应就是使用谷歌浏览器。但是很遗憾，在这里不使用谷歌浏览器，因为谷歌浏览器所用到的cKey是8.1版本的。（我这里的浏览器版本是74.0.3729.131， 以后的版本可能会使用9.1）
* 除了谷歌浏览器外还有很多使用chromium核的浏览器，360浏览器(未知)，搜狗浏览器(ckey8.1)，，我这里将使用百分浏览器(ckey9.1)，并且在腾讯视频解析里面他使用到的是cKey9.1版本。这正是我们所要分析的对象。
* 下面将以https://v.qq.com/x/cover/bzfkv5se8qaqel2/j002024w2wg.html 为分析例子。

#### 初次分析

* F12打开开发者工具。
* 打开链接：`https://v.qq.com/x/cover/bzfkv5se8qaqel2/j002024w2wg.html` 。
* 切换Network查看抓包。
* 搜索proxyhttp，找到两项 `https://vd.l.qq.com/proxyhttp` 。（这里搜proyhttp是因为前面省略了从视频到解析链接的寻找过程，如果不知道怎么做，就先看上文的前提建议）
* 既然知道了请求视频的链接是proxyhttp，那么在proxyhttp发送前中断如何？

  + 转到`Sources`页面，在`XHR/fetch Breakpoints`的`+`进行添加条件断点 `proxyhttp`，意思就是在包含proxyhttp字串的请求链接时进行中断。
  + [图1.1]
    ![](https://attach.52pojie.cn/forum/201905/05/170310trz9zbxjxn38dqss.png)
  + 按F5刷新，等待中断发生。
  + [图1.2]
    ![](https://attach.52pojie.cn/forum/201905/05/170311jmim3amndhim9194.png)
  + 之后看到右边的调用栈信息`Call Stack`,可以看到调用函数的右边表明了被调用函数所在的JS链接。
  + [图1.3]
    ![](https://attach.52pojie.cn/forum/201905/05/170311gll4x47thlyd64lz.png)
  + 为什么要看这些呢，因为对于一个具有庞大的JS脚本链接的视频网站来说，找准加密所在的JS算法所在的链接是第一步。首先要知道的是，在POST`https://vd.l.qq.com/proxyhttp`之前肯定先需要先收集所要发送的data，所以必然这将调用到获取data的函数，而获取部分必然会与加密部分有联系，所以可以通过这样的方式来找到加密部分。
  + （事实上你可以直接在Network页面搜索`proxyhttp`来定位到目标链接（注意这不是一定的），但是由于在爱奇艺分析过程中使用了这一方法，我在这里用一下别的方法来解决。）
  + 由[图1.3]可以知道的是`tvx.core.js`是用来对发送请求的。所以大概可以估计这文件就是对请求函数的集合，既然已经到了发送的地步了，那么data肯定是已经获取完成了。
  + 第二个JS文件`pecker.js`，点击他，然后往下滚看到`Scope`项，看到e,f两项就是要发送的请求的所有数据，展开发现data中cKey已经存在，所以这里`Call Stack`往上走（往上一层调用走）。
  + [图1.4]
    ![](https://attach.52pojie.cn/forum/201905/05/170311lgik7kfrp1712568.png)
    [图1.5]
    ![](https://attach.52pojie.cn/forum/201905/05/170312m0w1sggzgdq6qqau.png)
    [图1.6]
    ![](https://attach.52pojie.cn/forum/201905/05/170312oiuxsssjl7sjeski.png)
  + 到`e.requestPostCgi`位于`htmlframe.......`（关于Call Stack看图1.3），粗看函数名似乎就是提交data的获取。将其作为重点深找一下。
  + 进入`e.requestPostCgi`后往下滚看到`Scope`，下图，本地变量`c`就是要提交的data，图1.7的中间红框部分就是本地变量`c`的获取，发现`vinfoparam`是由`62455行`生成的数据。`f.param(b.vinfoparam)`，发现该函数传入了参数`b.vinfoparam`，鼠标停在该参数出现了数据cKey。所以可以断定重点在于`b.vinfoparam`，而不是函数`f.param`。
  + [图1.7]
    ![](https://attach.52pojie.cn/forum/201905/05/170313twfuafgwgdfxudld.png)
  + 发现`b.vinfoparam`中的变量b是调用`e.requestPostCgi`时传入的参数（位于`62446`）
  + 既然这样，看【图1.3】Call Stack，往上一层调用栈走，进入调用栈`c`。
  + [图1.8]
    ![](https://attach.52pojie.cn/forum/201905/05/170313h25kkr9k2fnkkkjk.png)
  + 传入的是

    ```
    {
    vinfoparam: g,
    adparam: e,
    domain: v,
    method: w
    }
    ```
  + 我们关注的对象是`vinfoparam: g`，往前找g的生成代码。看【图1.8】的`62742`进入函数`f.getInfoConfig`。却没有发现`cKey`的踪迹，既然我们无法直接知道，不如放个断点走一走。
  + [图1.9]
    ![](https://attach.52pojie.cn/forum/201905/05/170314no05hazz9z98xono.png)
    [图1.10]
    ![](https://attach.52pojie.cn/forum/201905/05/170314nizfrh651vv5nwvh.png)
    [图1.11]
    ![](https://attach.52pojie.cn/forum/201905/05/170315q798wpb04j2jpvab.png)
  + 看上图1.11，我们进入了`getInfoConfig`的调试中。
  + [图1.12]
    ![](https://attach.52pojie.cn/forum/201905/05/170315yd2yh2ygp2g3byaa.png)
    [图1.13]
    ![](https://attach.52pojie.cn/forum/201905/05/170316uw6nw1zn1mnmzbqz.png)
  + 一直往下走【看图1.12、图1.13】都发现cKey还没获取，一直到了`e(h)`。【图1.14】【图1.15】
  + [图1.14]
    ![](https://attach.52pojie.cn/forum/201905/05/170317rii3odvvlo2kze1v.png)
    [图1.15]
    ![](https://attach.52pojie.cn/forum/201905/05/170317xogoeqgq1a2lejot.png)
  + `a.cKey = b || ""`这就是cKey生成的地方。就是变量`b`，也就是

  ```
  f ? (a.encryptVer = "9.1",
          b = f(a.platform, a.appVer, a.vids || a.vid, "", a.guid, a.tm)) : (a.encryptVer = "8.1",
          b = i(a.vids || a.vid, a.tm, a.appVer, a.guid, a.platform)),
          a.cKey = b || ""
  ```

  + 从这里可以看到8.1版本和9.1版本的控制是由`f()`参数控制的。但这不是我们的重点，既然我们分析的是9.1版本，那么进入函数`f()`。

##### 重点分析

```
function i(a, b, c, d, e) {
      // 注意下面的函数k(a, b)是函数f(a)里面的k函数，为了方便起见直接在合起来写了
      function k(a, b) {
          if (0 === b || !a)
              return "";
          for (var c, d = 0, e = 0; ; ) {
              if (g(a + e < db),
              c = Ga[a + e >> 0],
              d |= c,
              0 == c && !b)
                  break;
              if (e++,
              b && e == b)
                  break
          }
          b || (b = e);
          var f = "";
          if (d < 128) {
              for (var h, i = 1024; b > 0; )
                  h = String.fromCharCode.apply(String, Ga.subarray(a, a + Math.min(b, i))),
                  f = f ? f + h : h,
                  a += i,
                  b -= i;
              return f
          }
          return m(a)
      }

      function f(a) {
          return "string" === b ? k(a) : "boolean" === b ? Boolean(a) : a
      }
      var i = h(a)
        , j = []
        , l = 0;
      if (g("array" !== b, 'Return type should not be "array".'),
      d)
          for (var m = 0; m < d.length; m++) {
              var n = $a[c[m]];
              n ? (0 === l && (l = Ub()),
              j[m] = n(d[m])) : j[m] = d[m]
          }
      var o = i.apply(null, j);
      return o = f(o),
      0 !== l && Tb(l),
      o
  }
```

* 由上面找到的【图1.15】开始。
* 断点继续往下走，进入【图2.1】【图2.2】
  + [图2.1]
    ![](https://attach.52pojie.cn/forum/201905/05/170407vcc21oa1a15agca2.png)
    [图2.2]
    ![](https://attach.52pojie.cn/forum/201905/05/170408on6f1px54ef416sz.png)
    [图2.3]
    ![](https://attach.52pojie.cn/forum/201905/05/170408emahu741ok1aiooo.png)
  + 返回的是变量`o`，那么我们重点关注他，走到`o`，`64084行`，进去，【图2.3】看到`ua._getckey`，可以知道看来是找对地方了。

```
ua._getckey = function() {
    return g(ib, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)"),
    g(!jb, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)"),
    ua.asm._getckey.apply(null, arguments)
}
```

* 进去`ua.asm._getckey.apply(null, arguments)`，??????????什么鬼【图2.4】
* [图2.4]
  ![](https://attach.52pojie.cn/forum/201905/05/170408hcx0frnye6c006nr.png)
  [图2.5]
  ![](https://attach.52pojie.cn/forum/201905/05/170409pidhtzdidqn6xu5q.png)
  + 这函数名怎么是个数字？？？而且发现也进不去，而且提示的是`native code`，这说明了这不是JS的原生代码，可能是其他语言实现的方法。
  + 事实上这是`WebAssembly`，这是一种JS的一种可以理解成是交叉编程的一种方式，目的是为了提高JS运行效率，这是由C或者其他编程语言生成的代码，生成\*.wasm然后交给WebAssembly加载处理运行。
  + 可以通过【图2.5】看到加载的wasm文件，而其中的函数名29就是对应`wasm-0005098e-29`，你点进去查看就看反汇编到具体的指令。
  + 好了，基本说明了这一种JS的技术，如果要了解更多就百度谷歌把。
* 那么重要的是要找到这被加载的`wasm`文件。
* 一个最简单的方法就是直接在`Sources`页面搜索`wasm`就能找到加载的wasm文件。
* [图2.6]
  ![](https://attach.52pojie.cn/forum/201905/05/170409sqq7dtm5imy7ryx3.png)
* 对于找wasm也可以使用其他方法实现，但是既然是请求GET到的，当然能抓包到了，所以这里就偷懒不通过代码分析了。（不然篇幅会很长）
  + 要知道的是，我们虽然得到了wasm文件，但是任何交叉编程类的东西，都需要有接口，而这些接口或者必须提供的，所以我们还需要找到wasm接口部分，但这里先放一边，待会再进行。
* 通过【图2.4】可以看到的是传了参数`arguments`，虽然我们得到了wasm，但是我们还是需要知道参数`arguments`才能实现算法。
* 而`arguments`就是前面【图2.3】传递的参数`j`，我们要得到`j`。
* 看【图2.2】进入函数`Ub()`和`n()`，而`n()`是由`var n = $a[c[m]];`提供的。所以我们F5刷新下页面在【图2.2】重新断点。为的就是单步执行，找所需。
* [图2.7]
  ![](https://attach.52pojie.cn/forum/201905/05/170409d50trtztrtbu7eoz.png)
* 由【图2.7】出单步走，你会发现有两种`n`，一种是`undefined` 和

```
stringToC: function(a) {
    var b = 0;
    if (null !== a && void 0 !== a && 0 !== a) {
        var c = (a.length << 2) + 1;
        b = Sb(c),
        o(a, b, c)
    }
    return b
}
```

* 往下一直找能找到`Sb()`， `o()`， `n()`，其中包括了循环中的`Ub`还有`f()`函数中的`k()`然后你能整理出来

```
Ub = function() {
   return g(ib, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)"),
   g(!jb, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)"),
   ua.asm.stackSave.apply(null, arguments)
}

Sb = function() {
     return g(ib, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)"),
     g(!jb, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)"),
     ua.asm.stackAlloc.apply(null, arguments)
 }

function o(a, b, c) {
  return g("number" == typeof c, "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!"),
  n(a, Ga, b, c)
}

function n(a, b, c, d) {
    if (!(d > 0))
        return 0;
    for (var e = c, f = c + d - 1, g = 0; g < a.length; ++g) {
        var h = a.charCodeAt(g);
        if (h >= 55296 && h <= 57343) {
            var i = a.charCodeAt(++g);
            h = 65536 + ((1023 & h) << 10) | 1023 & i
        }
        if (h <= 127) {
            if (c >= f)
                break;
            b[c++] = h
        } else if (h <= 2047) {
            if (c + 1 >= f)
                break;
            b[c++] = 192 | h >> 6,
                b[c++] = 128 | 63 & h
        } else if (h <= 65535) {
            if (c + 2 >= f)
                break;
            b[c++] = 224 | h >> 12,
                b[c++] = 128 | h >> 6 & 63,
                b[c++] = 128 | 63 & h
        } else if (h <= 2097151) {
            if (c + 3 >= f)
                break;
            b[c++] = 240 | h >> 18,
                b[c++] = 128 | h >> 12 & 63,
                b[c++] = 128 | h >> 6 & 63,
                b[c++] = 128 | 63 & h
        } else if (h <= 67108863) {
            if (c + 4 >= f)
                break;
            b[c++] = 248 | h >> 24,
                b[c++] = 128 | h >> 18 & 63,
                b[c++] = 128 | h >> 12 & 63,
                b[c++] = 128 | h >> 6 & 63,
                b[c++] = 128 | 63 & h
        } else {
            if (c + 5 >= f)
                break;
            b[c++] = 252 | h >> 30,
                b[c++] = 128 | h >> 24 & 63,
                b[c++] = 128 | h >> 18 & 63,
                b[c++] = 128 | h >> 12 & 63,
                b[c++] = 128 | h >> 6 & 63,
                b[c++] = 128 | 63 & h
        }
    }
    return b[c] = 0,
    c - e
}
```

* 大家应该发现了上面的函数`o(a, b, c)`调用了方法`n(a, Ga, b, c)`，其中`a, b,c` 我们都知道，但是`Ga`是什么东西？
* 既然在Locan变量无法找到，那么网上一级找。看下图2.8
* [图2.8]
  ![](https://attach.52pojie.cn/forum/201905/05/170409oui4re9ujeqw5wuv.png)
  [图2.9]
  ![](https://attach.52pojie.cn/forum/201905/05/170410e83i6ootttsi2nu8.png)
* 发现上一级有`Ga`,所以，我们找到他了,看【图2.9】
* 既然知道了要找`Ga`的缘由，那么把所有对于给`Ga`赋值的东西联系起来。
* 这将是个漫长的过程。

```
// 只要知道ArrayBuffer的都知道这将导致下面的 Fa,Ha, Ja, Ga, Ia, Ka, La, Ma绑在了Ea下
// 也就是说Ea是数据，而Fa,Ha, Ja, Ga, Ia, Ka, La, Ma就是描述这个数据的方式，所有的改变只是对Ea操作。所以对其中一个改变都会改变我们的目标Ga
function w() {
    Fa = new Int8Array(Ea),
        Ha = new Int16Array(Ea),
        Ja = new Int32Array(Ea),
        Ga = new Uint8Array(Ea),
        Ia = new Uint16Array(Ea),
        Ka = new Uint32Array(Ea),
        La = new Float32Array(Ea),
        Ma = new Float64Array(Ea);
}

function d(a) {
    var b = Oa;
    return Oa = Oa + a + 15 & -16,
        b
}
function e(a, b) {
    b || (b = Da);
    var c = a = Math.ceil(a / b) * b;
    return c
}

var Da = 16;

var Ea, Fa, Ga, Ha, Ia, Ja, Ka, La, Ma, Na, Oa, Pa, Qa, Ra, Sa, Ta, Ua, Va = {
    "f64-rem": function(a, b) {
        return a % b
    },
    "debugger": function() {}
}, Wa = (new Array(0), 1024) ;

Na = Oa = Qa = Ra = Sa = Ta = Ua = 0,
    Pa = !1;
var cb = 5242880 , db = 16777216, ab = 65536;

var wasmMemory = new WebAssembly.Memory({
    initial: db / ab,
    maximum: db / ab
});
Ea = wasmMemory.buffer;

w();
Ja[0] = 1668509029;
Ha[1] = 25459;

var eb = []
    , fb = []
    , gb = []
    , hb = []
    , ib = !1
    , jb = !1;

Na = Wa,
    Oa = Na + 6928,
    fb.push();

Oa += 16;

Ua = d(4),
Qa = Ra = e(Oa),
Sa = Qa + cb,
Ta = e(Sa),
Ja[Ua >> 2] = Ta,
Pa = !0;
```

* 以上解决了`Ga`的初始化。
* 目前为止解决了循环这一部分了。

```
for (var m = 0; m < d.length; m++) {
    var n = $a[c[m]];
    n ? (0 === l && (l = Ub()),
    j[m] = n(d[m])) : j[m] = d[m]
}
```

* 那么下一部分就是

```
var o = i.apply(null, j);
              return o = f(o),
              0 !== l && Tb(l),
              o
```

* 前面我们已经说了`i.apply(null, j);`，他的代码位于wasm中。
* 所以目前我们需要的是正确加载wasm，只要完成这一步，所以函数都可以串起来实现cKey了。
* 我们先看下如下代码

```
var ub = ua.asm(ua.asmGlobalArg, ua.asmLibraryArg, Ea)

var Cb = ub._getckey;
ub._getckey = function() {
    return g(ib, "you need to wait for the runtime to be ready (e.g. wait for main() to be called)"),
    g(!jb, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)"),
    Cb.apply(null, arguments)
}
```

* 也就是说，我们先知道`ub`也就是`ua.asm(ua.asmGlobalArg, ua.asmLibraryArg, Ea)`。
* 调试进去，找到以下代码。

```
ua.asm = function(a, b, c) {
    if (!b.table) {
        var d = ua.wasmTableSize;
        void 0 === d && (d = 1024);
        var f = ua.wasmMaxTableSize;
        "object" == typeof WebAssembly && "function" == typeof WebAssembly.Table ? void 0 !== f ? b.table = new WebAssembly.Table({
            initial: d,
            maximum: f,
            element: "anyfunc"
        }) : b.table = new WebAssembly.Table({
            initial: d,
            element: "anyfunc"
        }) : b.table = new Array(d),
        ua.wasmTable = b.table
    }
    b.memoryBase || (b.memoryBase = ua.STATIC_BASE),
    b.tableBase || (b.tableBase = 0);
    var h;
    return h = e(a, b, c),
    g(h, "no binaryen method succeeded. consider enabling more options, like interpreting, if you want that: http://kripken.github.io/emscripten-site/docs/compiling/WebAssembly.html#binaryen-methods"),
    h
}
```

* 这里面就是对wasm的加载了。而这一切加载的前提是知道参数`a,b,c`，所以再回到`ua.asm(ua.asmGlobalArg, ua.asmLibraryArg, Ea)`
* 也就是`ua.asmGlobalArg, ua.asmLibraryArg, Ea`，而其中`Ea`我们已经在前面说过了，跟`Ga`有关系。
* 很容易找到

```
ua.wasmTableSize = 99,
        ua.wasmMaxTableSize = 99,
        ua.asmGlobalArg = {},
ua.asmLibraryArg = {
    abort: sa,
    assert: g,
    enlargeMemory: B,
    getTotalMemory: C,
    abortOnCannotGrowMemory: A,
    abortStackOverflow: z,
    nullFunc_ii: ca,
    nullFunc_iiii: da,
    nullFunc_v: ea,
    nullFunc_vi: fa,
    nullFunc_viiii: ga,
    nullFunc_viiiii: ha,
    nullFunc_viiiiii: ia,
    invoke_ii: ja,
    invoke_iiii: ka,
    invoke_v: la,
    invoke_vi: ma,
    invoke_viiii: na,
    invoke_viiiii: oa,
    invoke_viiiiii: pa,
    __ZSt18uncaught_exceptionv: Q,
    ___cxa_find_matching_catch: S,
    ___gxx_personality_v0: T,
    ___lock: U,
    ___resumeException: R,
    ___setErrNo: ba,
    ___syscall140: V,
    ___syscall146: X,
    ___syscall54: Y,
    ___syscall6: Z,
    ___unlock: $,
    _abort: _,
    _emscripten_memcpy_big: aa,
    _get_unicode_str: P,
    flush_NO_FILESYSTEM: W,
    DYNAMICTOP_PTR: Ua,
    tempDoublePtr: rb,
    STACKTOP: Ra,
    STACK_MAX: Sa
};

var ub = ua.asm(ua.asmGlobalArg, ua.asmLibraryArg, Ea)
```

* 可以看到wasm的加载连接了很多接口，但是我在这里只说其中比较重要的方法`P`，也就是`_get_unicode_str: P,`中的`P`，对应如下

```
function P() {
    function a(a) {
        return a ? a.length > 48 ? a.substr(0, 48) : a : ""
    }
    function b() {
        var b = document.URL
          , c = window.navigator.userAgent.toLowerCase()
          , d = "";
        document.referrer.length > 0 && (d = document.referrer);
        try {
            0 == d.length && opener.location.href.length > 0 && (d = opener.location.href)
        } catch (e) {}
        var f = window.navigator.appCodeName
          , g = window.navigator.appName
          , h = window.navigator.platform;
        return b = a(b),
        d = a(d),
        c = a(c),
        b + "|" + c + "|" + d + "|" + f + "|" + g + "|" + h
    }
    var c = b()
      , d = p(c) + 1
      , e = Pb(d);
    return o(c, e, d + 1),
    e
}
```

* 为什么这个重要呢？当你把刚开始重点分析后面的那一个函数单步走一遍你就会发现了，当在执行`_getckey()`的时候，他会`call 20`，也就是wasm文件中的`编号20的函数`，但是你仔细看【图2.5】会发现缺少缺少了`20号`函数，这是因为他会上面在链接接口的时候链接了函数`P()`，而函数`P()`就是`20号`函数。
* 而除此之外其他的函数对我们来说用处不大，所以你大可以使用空函数来链接。
* 所以我如下处理了接口链接和wasm环境的配置

```
var fun_ = function(){};

wasm_env = {
    abort: fun_,
    assert: fun_,
    enlargeMemory: fun_,
    getTotalMemory: C,
    abortOnCannotGrowMemory: fun_,
    abortStackOverflow: fun_,
    nullFunc_ii: fun_,
    nullFunc_iiii: fun_,
    nullFunc_v: fun_,
    nullFunc_vi: fun_,
    nullFunc_viiii: fun_,
    nullFunc_viiiii: fun_,
    nullFunc_viiiiii: fun_,
    invoke_ii: fun_,
    invoke_iiii: fun_,
    invoke_v: fun_,
    invoke_vi: fun_,
    invoke_viiii: fun_,
    invoke_viiiii: fun_,
    invoke_viiiiii: fun_,
    __ZSt18uncaught_exceptionv: fun_,
    ___cxa_find_matching_catch: fun_,
    ___gxx_personality_v0: fun_,
    ___lock: fun_,
    ___resumeException: fun_,
    ___setErrNo: fun_,
    ___syscall140: fun_,
    ___syscall146: fun_,
    ___syscall54: fun_,
    ___syscall6: fun_,
    ___unlock: fun_,
    _abort: fun_,
    _emscripten_memcpy_big: fun_,
    _get_unicode_str: P,              // function 20( ) => P( )
    flush_NO_FILESYSTEM: fun_,
    DYNAMICTOP_PTR: 7968,               //Ua
    tempDoublePtr: 7952,                //rb
    STACKTOP: 7984,                     //Ra
    STACK_MAX: 5250864,                 //Sa

    memoryBase: 1024,
    tableBase: 0,
    memory: wasmMemory,
    table: new WebAssembly.Table({
        initial: 99,
        maximum: 99,
        element: "anyfunc"
    })
};

var importObject = {
    'env': wasm_env,
    'asm2wasm': {
        "f64-rem": function(a, b) {
            return a % b
        },
        "debugger": function() {}
    },
    'global': {
        NaN: NaN,
        Infinity: 1 / 0
    },
    "global.Math": Math,
    // "parent": {};

};
```

* 到目前为止，已经完成了对接口的链接，也就是可以进行加载wasm了，再然后就可以对cKey进行测试了。
* 注意前面花了很大篇幅来再次回顾了对变量或函数的定位方法，所以后面很大一部分我会省略这一步骤，只是直接一步带过，直说个结果。

#### 结束分析

##### 因为本来这篇幅就很长，所以完整的ckey代码不会在这里列出来。如果要看JS实现代码可以进入 *<https://github.com/ZSAIm/iqiyi-parser/blob/master/js/tencent.js>* 。

### 最后

* Github项目链接: [点这](https://github.com/ZSAIm/iqiyi-parser)
* 本文章仅用于技术交流。
