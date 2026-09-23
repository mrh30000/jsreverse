# 某Excel全栈解决方案 逆向分析【前端组件篇】+JSHook

> **作者**: pjy612 | **发布时间**: 2023-04-12 18:43:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3689 / 67
> **原文**: [https://www.52pojie.cn/thread-1772986-1-1.html](https://www.52pojie.cn/thread-1772986-1-1.html)

---

*本帖最后由 pjy612 于 2025-11-13 22:39 编辑*

#### 前情提要

Σ(っ °Д °;)っ 上一篇被H大加精了？！
那必须整点干货庆祝庆祝了！
书接上回，既然是全栈解决方案 那么肯定还有前端部分
那么咱们这次来操刀一下前端组件吧~

上文回顾：[某Excel全栈解决方案 逆向分析【后端组件篇】](https://www.52pojie.cn/thread-1771932-1-1.html)

#### 嘉宾介绍

`aHR0cHM6Ly93d3cuZ3JhcGVjaXR5LmNvbS9zcHJlYWRqcw==`

不过这东西我没具体用过，只是研究研究 看着功能挺厉害的

#### 准备工作

当然先看 文档 和 Demo 啦！
文档地址：
`aHR0cHM6Ly93d3cuZ3JhcGVjaXR5LmNvbS9zcHJlYWRqcy9kb2NzL2dldHN0YXJ0ZWQvdHJpYWxfU3ByZWFkSlM=`

因为通过文档 你至少能很快知道 有哪些限制（明面上的）和 入口点在哪。

然后就是下载完整包了。
当然因为咱不是前端工程师，所以那些`vue react nodejs` 啥的咱也弄不懂，直接从原生js入手。
可能没导包那么方便，但是 就分析而言 就从完整体入手吧~

下载好解压后，简单看看目录结构，有个 `samples`

![](https://attach.52pojie.cn/forum/202304/12/183100y1wmarwq25eywsj2.png)

排除掉那些明显框架名的就两个看着是原生版...
选一个吧...

![](https://attach.52pojie.cn/forum/202304/12/183104jknqgkn9f4x5g9n5.png)

能看 有明显痕迹 那么可以开始动工了！

#### 开始分析

根据文档 咱们知道 注册码是通过 启动前 对 `GC.Spread.Sheets.LicenseKey` 赋值来触发的。

```
//Please provide valid license key.
//GC.Spread.Sheets.LicenseKey = "Your key";
```

那么我们先来看看能不能找到这个对象或字段。

![](https://attach.52pojie.cn/forum/202304/12/183107hchwzpcwcehpj3aw.png)

![](https://attach.52pojie.cn/forum/202304/12/183110oz66xgp7ix76ydmo.png)

啊这。。。一点线索都不给啊。。。
那怎么办呢？
别急，.Net里面不是可以给对象设置属性 然后还可以给属性设置 get 和 set 吗？
js 里面也有类似的 既然我们要 看到底哪儿读了 这个 `LicenseKey` 我们就可以这样赋值。

```
var lic = 'Your key';
Object.defineProperty(GC.Spread.Sheets, 'LicenseKey', {
  get() {
    //咱们给这个LicenseKey写成 get 的形式
    //然后在里面埋个debugger断点，这样devTools 发现脚本内 有 debugger 关键词就会触发断点
    //被访问的话就会断下来啦~
    debugger
    return lic;
  },
  configurable : true
});
```

![](https://attach.52pojie.cn/forum/202304/12/183113x45b3bg3wqvblbkg.png)

![](https://attach.52pojie.cn/forum/202304/12/183117um1tys1d4911o94o.png)

在这儿我们能看到
有一个 四位字符 `ZCTW`，在后端篇里面出现过类似的 可以留意一下。
有 "公钥" (我盲猜他是...这么长的 base64 不是RSA密钥就是AES或者别的啥密钥，问就是直觉...错了也不赌5毛)
然后 还有个 `B1`  Mark 一下。

当然 我们顺手在 j 函数 中间和末尾都打上断点吧~
万一里面太乱的话...(保险起见)

![](https://attach.52pojie.cn/forum/202304/12/183120v78pxax0518z5x7d.png)

继续单步走起

![](https://attach.52pojie.cn/forum/202304/12/183124eve9yegftihkzxvc.png)

![](https://attach.52pojie.cn/forum/202304/12/183127cjxttckpxjc836p6.png)

![](https://attach.52pojie.cn/forum/202304/12/183130meq0uzevwvwu4ox3.png)

生成一个新码然后来跑跑看

![](https://attach.52pojie.cn/forum/202304/12/183133qa991rg24qv0rffx.png)

不错耶~ 解码过了~
因为 我们的url协议是 file 不是 https 所以走的 q 函数
那我们来看看 那个 `g.H` 的算法吧

```
function C(a) {
    var b, c, d, e = 0, f = 5381, g = 0;
    for (b = a.length - 1; b >= 0; b--)
        c = a.charCodeAt(b),
        e = c + (e << 6) + (e << 16) - e,
        f = c + ((f << 5) + f),
        g = c + ((g << 5) - g),
        g &= g;
    return d = e ^ f ^ g,
    d < 0 && (d = ~d),
    d.toString(16).toUpperCase()
}
```

我们可以先让他算好 然后我们直接在对象里面改，我们也可以拿 C# 自己实现一下。
因为是单向的 我就当他是jsHash吧~

```
internal static string ToJsHash(this string a)
{
    int b, c, d, e = 0, f = 5381, g = 0;
    for (b = a.Length - 1; b >= 0; b--)
    {
        c = a[ b ];
        e = c + (e << 6) + (e << 16) - e;
        f = c + ((f << 5) + f);
        g = c + ((g << 5) - g);
        g &= g;
    }

    d = e ^ f ^ g;
    if (d < 0) d = ~d;
    return d.ToString("X").ToUpperInvariant();
}
```

生成注册码的函数里面加一段

```
if (step == "#B1")
{
    string jsonD = JsonConvert.SerializeObject(dict["D"]);
    string signTemp = $"{name}{step}{jsonD}";
    dict["H"] = signTemp.ToJsHash();
}
```

再生成一个跑跑看看

![](https://attach.52pojie.cn/forum/202304/12/183136mw1y9jfg5zdyy42g.png)

Nice F8 放行！

![](https://attach.52pojie.cn/forum/202304/12/183139c1p0710q2072kqp5.png)

啊这... QAQ 看来后面还有别的验证...

![](https://attach.52pojie.cn/forum/202304/12/183141lcj4pshc9dq4t4ud.png)

![](https://attach.52pojie.cn/forum/202304/12/183144m61b9a6d5y6gj9o1.png)

`U`函数应该是判断是否为本地使用，晚点得弄http容器测。
`i`函数 如下

![](https://attach.52pojie.cn/forum/202304/12/183146rksrnnh00vnkvzkt.png)

那么我们得把 `ZCTW` 加到 Prd 里面再跑一次

![](https://attach.52pojie.cn/forum/202304/12/183149qgpgqzyl6kepo5qv.png)

Nice 水印没有了，那我们换 http 和 https 试试？

![](https://attach.52pojie.cn/forum/202304/12/183151bpe1c7x4xx7px7p1.png)

不过 Https 还是出问题了，毕竟RSA部分咱们还没实现，那么怎么改呢~

有几种方案

一个是 自己生一对密钥 自己Sign 然后把公钥替换掉。（改动最小）
一个是 直接把 RSA那段逻辑删掉 替换成 `return e(g.D)` 改的多甚至连 jsHash 那步都可以省略。

至于具体怎么实现就留给有兴趣的小伙伴 当课后作业咯~

#### 注意事项

仅限于学习交流，请勿用于商业或非法用途

#### 附录

从 文档中 看到 还有一个 授权叫 `Pivot Table Add-on`

![](https://attach.52pojie.cn/forum/202304/12/183153k0x4zqj1qddnqg1v.png)

那么咱们怎么找到并使用呢？

咱们可以通过 Demo 找到对应的功能演示
`aHR0cHM6Ly93d3cuZ3JhcGVjaXR5LmNvbS9zcHJlYWRqcy9kZW1vcy9mZWF0dXJlcy9waXZvdC10YWJsZS9vdmVydmlldy9wdXJlanM=`

然后 咱们在控制台输入
`GC.Spread.Sheets.LicenseKey`
当当！

![](https://attach.52pojie.cn/forum/202304/12/183156s7gesrblonztdz9l.png)

有内部Key哟~ (＾Ｕ＾)ノ~ＹＯ
咱们可以通过在本地调试时找到的特征 直接在 demo 里面 调试 远端的js。
然后看看 授权的对象有哪些差别，自己生成的时候 加上去就好了~
这个也当成课后作业吧~

#### 补充

先在网上简单找了下js hook的文章，弄完后 发现论坛里面其实也有，而且内容也一样 就贴一下 有兴趣的可以看看
[0基础入门通杀型 js hook(出处: 吾爱破解论坛)](https://www.52pojie.cn/thread-1519457-1-1.html)

然后将代码微调了一下后

```
//js hook 优化
//提供伪造 native code 的函数
(() => {
    const $toString = Function.toString
    const myFunction_toString_symbol = Symbol('('.concat('', ')_', (Math.random()) + '').toString(36))
    const myToString = function (){
        return typeof this === 'function' && this[myFunction_toString_symbol] || $toString.call(this)
    }
    function set_native(func, key, value){
        Object.defineProperty(func, key, {
            enumerable: false,
            configurable: true,
            writable: true,
            value: value
        })
    }
    delete Function.prototype.toString
    set_native(Function.prototype, "toString", myToString)
    set_native(Function.prototype.toString, myFunction_toString_symbol, "function toString() { [native code] }")
    globalThis.func_set_native = (func) => {
        set_native(func, myFunction_toString_symbol, `function ${func.name || ''}() { [native code] }`)
    }
}).call(this);
//hook函数
//onEnter 执行前（不写则默认打印）
//onLeave 执行后（不写则默认打印）
//context 上下文对象（默认 window）
//funcName Hook的函数名（默认 当前函数名）
//flagName 自定义名称 用于将原始函数存于全局hooker对象中 避免同名函数Hook
Function.prototype.hook = function(onEnter, onLeave, context, funcName , flagName){
    window.hooker = window.hooker || {};
    if (!onEnter){
        onEnter = function (warpper){
            var args = warpper.args;
            console.log(args);
        }
    }
    if (!onLeave){
        onLeave = function (retval){
            console.log(retval);
        }
    }
    var _context = context || window;

    var funcName = this.name || funcName;
    flagName = flagName || funcName;
    if (!funcName){
        console.error("hook function name is empty!");
        return false;
    }
    if(!window.hooker[flagName]) window.hooker[flagName] = this;
    _context[funcName] = function (){
        //debugger
        var args = Array.prototype.slice.call(arguments,0);
        var _this = this;
        var warpper = {
            args
        }
        var pre_val = onEnter.call(_this, warpper);
        if(pre_val){
            return pre_val;
        }
        var retval = window.hooker[flagName].apply(this, warpper.args);

        var hook_retval = onLeave.call(_this, retval);
        if (hook_retval){
            return hook_retval;
        }
        return retval;
    }
    Object.defineProperty(_context[funcName], "name", {
        get: function (){
            return funcName;
        }
    })
    func_set_native(_context[funcName]);
}
```

```
//那么我们可以尝试直接对浏览器内置的鉴权函数进行Hook
SubtleCrypto.prototype.verify.hook(
    //onEnter
    function(){
        //因为原始对象返回值 为 Promise
        //我们 强制伪造一个 Promise 并默认返回 true
        return new Promise(function(resolve, reject){
            resolve(true);
        });
    },
    null,
    SubtleCrypto.prototype,
    'verify',
    'SubtleCrypto.prototype.verify'
);

//当然也可以最简单直接进行一个替换...
if(!SubtleCrypto.prototype.original_verify)
{
    SubtleCrypto.prototype.original_verify = SubtleCrypto.prototype.verify;
}
SubtleCrypto.prototype.verify = function(){
//let arg = arguments;
//return SubtleCrypto.prototype.original_verify.apply(this,arguments);
return new Promise(function(resolve, reject){
    resolve(true);
});
}
```
