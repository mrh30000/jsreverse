# 0基础入门通杀型 js hook

> **作者**: roysue | **发布时间**: 2021-09-26 10:44:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 12775 / 48
> **原文**: [https://www.52pojie.cn/thread-1519457-1-1.html](https://www.52pojie.cn/thread-1519457-1-1.html)

---

<!-- [@import](https://www.52pojie.cn/home.php?mod=space&uid=476974) "[TOC]" {cmd="toc" depthFrom=1 depthTo=6 orderedList=false} -->

<!-- code\_chunk\_output -->

* [js hook 入门](https://www.52pojie.cn/thread-1519457-1-1.html#js-hook-入门)
  + [js hook 基础](https://www.52pojie.cn/thread-1519457-1-1.html#js-hook-基础)
  + [js hook方法检测与过检测](https://www.52pojie.cn/thread-1519457-1-1.html#js-hook方法检测与过检测)
  + [proxy与浏览器](https://www.52pojie.cn/thread-1519457-1-1.html#proxy与浏览器)
  + [js一键快速hook框架](https://www.52pojie.cn/thread-1519457-1-1.html#js一键快速hook框架)

<!-- /code\_chunk\_output -->

### js hook 入门

#### js hook 基础

`js hook`非常的简单，具体步骤就是记录之前的函数，然后再重写当前函数即可原理如下图,而因为客户端拥有js的最高解释权所以任何代码都无法阻止hook，只能通过混淆来影响逆向人员分析

![](https://attach.52pojie.cn/forum/202109/26/104252u0h1m1fhzb071i4u.png)

测试demo如下

```
var _eval=eval
eval=function(arg){
console.log(arg)
    return _eval(arg)
}
```

结果如下图

![](https://attach.52pojie.cn/forum/202109/26/104239k0gzgz163a1gupg1.png)

hook 参数稍微不一样，需要用到`defineProperty`方法，例如下面这样的测试demo

```
var cookie = document.cookie;
document = Object.defineProperty(document, 'cookie', {
  get: function () {
    console.log('getter: ' + cookie);
    return cookie;
  },
  set: function (value) {
    console.log('setter: ' + value);
    cookie = value
  }
});
```

打开浏览器随便找一个网站测试一下

![](https://attach.52pojie.cn/forum/202109/26/104249afbu4b5nqawbnwv5.png)

#### js hook方法检测与过检测

这里检测就要用到hook的特性，或者说hook使用者根本注意不到的一些点（当然如果hooker使用代{过}{滤}理器就不好使了），第一个点就是hook之后toString会更改，如下图

```
console.log(eval+"");
var _eval=eval
eval=function(arg){
console.log(arg)
    return _eval(arg)
}
console.log(eval+"");
eval.toString()
```

![](https://attach.52pojie.cn/forum/202109/26/104241ax3i4tlgtna3dz3l.png)

可以看到从原来的`native code`变成了我们自己写的代码，这样防守方就能轻而易举的检测到我们使用了hook这种技巧。但是这种绕过也是很简单的，就是重写我们hook函数的toString方法就好了

```
var a=eval+""
var _eval=eval
eval=function(arg){
console.log(arg)
    return _eval(arg)
}
eval.toString=function(){return "function eval() { [native code] }"}
console.log(eval+"");
console.log(a===(eval+""))
```

![](https://attach.52pojie.cn/forum/202109/26/104243lbrep3eibpwbronp.png)

这种方式过于简单，而且能被代{过}{滤}理器检测到，所以还可以检测原型链上的toString方法

```
var a=eval+""
var _eval=eval
eval=function(arg){
console.log(arg)
    return _eval(arg)
}
eval.toString=function(){return "function eval() { [native code] }"}
console.log(eval+"");
console.log(a===(eval+""))
console.log(Function.prototype.toString.call(eval))
```

![](https://attach.52pojie.cn/forum/202109/26/104245pks7iufc8ye48y8n.png)

当然如果我们能够注意到这一点，那么这种检测方法也是很好绕过的,就是hook原型链上的方法

```
var a=eval+""
var _eval=eval
eval=function(arg){
console.log(arg)
    return _eval(arg)
}
eval.toString=function(){return "function eval() { [native code] }"}
var _old=Function.prototype.toString.call
Function.prototype.toString.call=function(arg){
    if(arg==eval)
    return "function eval() { [native code] }"
    return _old(arg);

}
console.log(Function.prototype.toString.call(eval))
```

![](https://attach.52pojie.cn/forum/202109/26/104247hp7n3u6nn036gnfi.png)

#### proxy与浏览器

proxy也可以用在浏览器中，测试demo如下

```
const handler = {
    get: function(obj, prop) {
        console.log(obj,prop)
        return prop in obj ? obj[prop] : 37;
    }
};

const p = new Proxy({}, handler);
```

![](https://attach.52pojie.cn/forum/202109/26/104254lhdgdw4eg6dg6hth.png)

但是我们为什么不在浏览器里面写Proxy而是只在nodejs里面写呢，因为在浏览器中window对象是不能重写的，自然就不能重写window的代{过}{滤}理器，所以我们只能在nodejs中使用Proxy，因为不能重写window就索然无味,但是我们可以监听新赋值的变量，例如有一些变量我们不知道他是什么时候生成的在哪里生成的我们就可以使用下面的这种技巧。

```
Object.defineProperty(window,"dta",
    {
        get:function (){
            return "hook dta"
        },
        set:function (){
            debugger;
        }
    }
    )
```

对window.dta进行赋值就会触发set方法，就会在debugger上停下来

![](https://attach.52pojie.cn/forum/202109/26/104257ntr4zs4ptbaph4g4.png)

#### js一键快速hook框架

首先举一个例子，我比较懒想要快速hook一个base64编码函数，但是又不想写冗长的代码怎么办呢，这里主要参考了珍惜大佬的js课程并进行了一定程度的修改，那么就需要写一个`hook`函数来帮助我们一劳永逸。首先要解决第一个问题就是如何让所有的对象都能访问到我们的hook方法呢，这里我们可以将hook方法定义在原型链上

```
Function.prototype.hook=function(){}
```

接下来时第二个问题，如何保存原方法，可以用下面这种形式

```
var _this=this ;
var Functionname=_this.name;
if(!Functionname)
{
    console.log("hook erro")
    return false;

}
window.dta[Functionname]=this;
```

最后直接重写方法即可

```
Function.prototype.hook=function (onEnter,onLeave,context) {
    var _this = this;
    window.dta={};
    var _context = context || window;
    var Functionname = _this.name;
    if (!Functionname) {
        console.log("hook erro")
        return false;

    }

    window.dta[Functionname] = this;
    _context[Functionname] = function () {
console.log(arguments)
        var args = Array.prototype.slice.call(arguments, 0);
        var _this = this;
        var warpper = {args}
        onEnter.call(_this, warpper);
        var result = window.dta[Functionname].apply(this, warpper.args);
       console.log(result)
        var retuenval = onLeave.call(_this, result)
        if (!retuenval) {
            return retuenval
        }
        return result;
    }
}
btoa.hook(function (warpper){
    var args=warpper.args;
    console.log(args)

    },function (retval){
    console.log(retval)
    return true
    }

)
```

![](https://attach.52pojie.cn/forum/202109/26/104259qbuz0b70vusvj0tk.png)

当然这只是最基础的hook方式我们还要过一些简单的检测，比如重写他的toString方法去掉他的一些修改特征，这种古老又有效的方法，最终成品如下

```
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
}).call(this)

window.dta = {}
Function.prototype.hook = function(onEnter, onLeave, context, Funcname){
    if (!onEnter){
        onEnter = function (warpper){
            var args = warpper.args;
            console.log(args)
        }
    }
    if (!onLeave){
        onLeave = function (retval){
            console.log(retval)
        }
    }

    // btoa.hook()
    var _context = context || window;
    var FuncName = this.name || Funcname;
    if (!FuncName){
        console.error("hook function name is empty!")
        return false
    }
    window.dta[FuncName] = this;

    _context[FuncName] = function (){
        var args = Array.prototype.slice.call(arguments,0)
        var _this = this
        var warpper = {
            args
        }

        onEnter.call(_this, warpper)
        // this -> window
        var retval = window.dta[FuncName].apply(this, warpper.args)

        var hook_retval = onLeave.call(_this, retval)
        if (hook_retval){
            return hook_retval
        }
        return retval
    }
    Object.defineProperty(_context[FuncName], "name", {
        get: function (){
            return FuncName
        }
    })
    func_set_native(_context[FuncName])
}

console.log("quick hook start")
```
