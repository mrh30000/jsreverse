# js  hook初学笔记

> **作者**: lihu5841314 | **发布时间**: 2021-08-11 20:59:00 | **版块**: 『编程语言区』 | **查看/回复**: 2304 / 9
> **原文**: [https://www.52pojie.cn/thread-1492463-1-1.html](https://www.52pojie.cn/thread-1492463-1-1.html)

---

[Asm] *纯文本查看*

```

#Object.defineProperty() 方法会直接在一个对象上定义一个新属性，或者替换一个对象的现有属性，并返回此对象。
#属性里面存的可能是方法也可能是值   值有（setter，getter）两个方法
#Object.defineProperty(obj, prop, descriptor) 返回值 被传递给函数的对象obj
#3个参数  1.obj 要定义属性的对象。 2. 要定义或替换的属性的名称或 Symbol  3.descriptor 要定义或修改的属性描述符

(function(){
var  aaa = "";
       Object.defineProperty(document, 'cookie', {
                 set:function(val){
                         debugger;
                         console.log(val)
                         aaa = val;
                              return val;
                 },
                 get:function(){
                             return aaa;
                }
     });
})()

2.hook是有时机
1.在控制台注入的hook，刷新网页就失效了
   在网页加载的第一个js的位置下断点，然后再控制台手动注入hook
 （有可能在注入有些站点的时候时机会晚一点）
2.利用FD替换响应（时机比较靠前）
   FD就是个代{过}{滤}理，让网页数据都从FD过
   然后就是拦截 + 注入  +放过
```
