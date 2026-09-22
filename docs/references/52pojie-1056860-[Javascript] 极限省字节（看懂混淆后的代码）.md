# [Javascript] 极限省字节（看懂混淆后的代码）

> **作者**: Tairraos | **发布时间**: 2019-11-17 12:17:00 | **版块**: 『编程语言区』 | **查看/回复**: 7776 / 28
> **原文**: [https://www.52pojie.cn/thread-1056860-1-1.html](https://www.52pojie.cn/thread-1056860-1-1.html)

---

*本帖最后由 Tairraos 于 2020-10-25 15:52 编辑*

吾爱竟然没有Javascript类

帖子不长，但是收藏下来必然某天用得到。
喜欢请点击下方免费评分，谢谢
======================
还有几帖你一定会喜欢的：
Python资源大全：<https://www.52pojie.cn/thread-1081229-1-1.html>
Python tkinter UI指南 <https://www.52pojie.cn/thread-1290751-1-1.html>
原生 Javascript 实现 jQuery 的功能： <https://www.52pojie.cn/thread-1084552-1-1.html>
Chrome调试器Console的进阶用法 <https://www.52pojie.cn/thread-1156239-1-1.html>
Javascript 极限省字节（看懂混淆后的代码） <https://www.52pojie.cn/thread-1056860-1-1.html>
写JS必备，ESLINT配置说明 <https://www.52pojie.cn/thread-1290700-1-1.html>
======================

以下是我的笔记分享，大部分是自己看混淆代码的时候慢慢整理的，有一些笔记是网上看来的内容。

代码混淆工具除了会把作用域变量名方法名改名成单个字母，还会对表达式写法进行替换

当然，有时候如果有需要自己写代码的时候也可以使用这种省字节的写法

| 功能 | 省字节的字法 | 不省字节的写法 | 说明 |
| --- | --- | --- | --- |
| 变量赋初值 | `a=a｜｜b;` | `if(!a) { a = b; }` |  |
| 变量赋初值 | `b=a｜｜0;` | `if(a) { b = a; } else { b = 0; }` |  |
| 取整 | `~~a` 或者 `a｜0` | `parseInt(a, 10)` 或 `Math.floor(a)` 或 `a>>0` |  |
| 运算后取整 | `a+b｜0` | `parseInt(a+b,10)` 或 `Math.floor(a+b)` 或 `(a+b)>>0` 或 `~~(a+b)` |  |
| 四舍五入 | `a+.5｜0` | `Math.round(a)` |  |
| 除2并取整 | `a>>1` | `Math.floor(a/2)` |  |
| 除4并取整 | `a>>2` | `Math.floor(a/4)` | 其它2的整数次方类推 |
| 取时间戳 | `+new Date` | `(new Date()).getTime()` |  |
| 转布尔型 | `!!a` | `Boolean(a)` |  |
| 转数值型 | `+a` | `Number(a)` |  |
| `undefined` | `void 0` 或 `0[0]` | `undefined` | `void 0`快速，被频繁调用的方法使用`void 0`来定义`undefined` |
| `Infinity` | `1/0` | `Infinity` |  |
| 布尔值短写法 | `!0` | `true` |  |
| 布尔值短写法 | `!1` | `false` |  |
| 定义变量 | `function(a,b,c){...}` | `function(){var a,b,c;...}` |  |
| 定义变量 | `function(a,b){b=1;...}` | `function(a){var b=1;...}` |  |
| 测试方法参数个数 | `1 in arguments` | `arguments.length>1` |  |
| setInterval和setTimeout | `setInterval('console.log("z")',100);` | `setInterval(function(){console.log("z")},100);` |  |
| setInterval和setTimeout | `setInterval('console.log("z")');` | `setInterval('console.log("z")',1);` |  |
| 表达式可以做方法参数 | `if(a=this.localStorage){...}` | `a=this.localStorage;if(a){...}` |  |
| 表达式可以做方法参数 | `(b.pop(a=b.pop())+c)` | `((a=b.pop(),b.pop())+c)` |  |
| 表达式可以做方法参数 | `x(a=b,1)` | `a=b; x(a,1);` |  |
| 交换变量的值 | `a=[b,b=a][0];` | `c = a; a = b; b = c;` |  |
| 用for代替while | `for(i=10;i--;){...}` | `i=10; while(i--) {...}` |  |
| 常用for的简写 | `for(var i=x.length;i--;){ }` | `for(var i=0; i<x.length;i++){ }` |  |
| 数字简写 | `2e6` | `2*Math.pow(10,6)` 或 `2000000` |  |
| 数值比较 | `if(a^123){ }` | `if(a != 123) { }` |  |
| 随机数 | `new Date % 100` | `(Math.random() * 100)｜0` | 较小的随机数，不密集使用时，用时间戳省字节 |
| 字符串有link方法生成a标签 | `html=text.link(url);` | `html="<a href='"+url+"'>"+text+"</a>";` |  |
| 指定长度重复字符串 | `a=Array(33).join(0);` | `for(a="",i=32;i--;)a+=0;` |  |
| 判断类型 | `if(x.call){ }` | `if(typeof x==='function'){ }` |  |
| 判断类型 | `if(x.big){ }` | `if(typeof x==='string'){ }` |  |
| 判断类型 | `if(x.toFixed){ }` | `if(typeof x==='number'){ }` |  |
| 判断类型 | `if(x.pop){ }` | `if($.isArray(x)){ }` |  |
| 数组转字串会自带逗号 | `"rgb("+[x,y,z]+")"` | `"rgb("+x+","+y+","+z+")"` |  |
| 判断数组长度 | `if(array[1]){ }` | `if(array.length>1){ }` |  |
| 省略new | `r=RegExp(".",g);` | `r=new RegExp(".",g);` |  |
| 省略new | `l=Function("x","console.log(x)");` | `l=new Function("x","console.log(x)");` |  |
| 立即执行函数 | `!function(){...}()` | `(function(){...})()` | 比用括号省一个字节，混淆后的代码都会转成这种写法 |
| 省略的getElementById | `a.innerHTML = "foo";` | `document.getElementById('a').innerHTML = "foo";` | a没有被使用过的话 |

## 注

重复字串，在新浏览器里可以写成 `a="0".repeat(32);` //ES6的方法
在立即执行的顶层闭包中传入`void 0`目的是为了传入`undefined`值，这样可以避免代码被Hack。undefined不是保留字，可以被重新赋值。

喜欢请点击下方免费评分，谢谢
======================
还有几帖你一定会喜欢的：
Python资源大全：<https://www.52pojie.cn/thread-1081229-1-1.html>
Python tkinter UI指南 <https://www.52pojie.cn/thread-1290751-1-1.html>
原生 Javascript 实现 jQuery 的功能： <https://www.52pojie.cn/thread-1084552-1-1.html>
Chrome调试器Console的进阶用法 <https://www.52pojie.cn/thread-1156239-1-1.html>
Javascript 极限省字节（看懂混淆后的代码） <https://www.52pojie.cn/thread-1056860-1-1.html>
写JS必备，ESLINT配置说明 <https://www.52pojie.cn/thread-1290700-1-1.html>
======================
