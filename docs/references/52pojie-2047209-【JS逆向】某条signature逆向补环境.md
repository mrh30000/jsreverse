# 【JS逆向】某条signature逆向补环境

> **作者**: ShriyGo | **发布时间**: 2025-07-21 20:58:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3794 / 29
> **原文**: [https://www.52pojie.cn/thread-2047209-1-1.html](https://www.52pojie.cn/thread-2047209-1-1.html)

---

*本帖最后由 ShriyGo 于 2025-7-22 11:34 编辑*

本文中所有内容仅供学习交流使用，不用于其他任何目的，不提供完整代码，抓包内容、敏感网址、数据接口等均已做脱敏处理，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关.本文章未经许可禁止转载，禁止任何修改后二次传播，擅自使用本文讲解的技术而导致的任何意外，作者均不负责

站点：aHR0cHM6Ly9zby50b3V0aWFvLmNvbS9zZWFyY2g/ZHZwZj1wYyZzb3VyY2U9dHJlbmRpbmdfY2FyZCZrZXl3b3JkPSVFNyVCRSU4RSVFNSU5QiVCRCVFNiVCNCU5QiVFNiU5RCU4OSVFNyU5RiVCNiVFNCVCOCU4MCVFOCVCRCVBNiVFOCVCRSU4NiVFNSU4NiVCMiVFNiU5MiU5RSVFNCVCQSVCQSVFNyVCRSVBNA==

视频：[视频教程](https://www.bilibili.com/video/BV1MhgTzrETQ)

## 1. 逆向目标

先访问站点，发现有2次请求，且第一次请求的响应内容空白。第1次请求后紧接的第2次请求就是渲染的页面。可见第1次请求必然做了什么事情，这也是典型的动态cookie场景。

![](https://attach.52pojie.cn/forum/202507/21/205455pk1zitdii412z7q0.png)

**观察第1次**请求的响应头：有一些setcookie等字段

![](https://attach.52pojie.cn/forum/202507/21/205457wmffmxfuhizxfz7m.png)

再看看**第2次**请求成功：
url、参数并没有区别，只不过带了个cookie，其中`__ac_nonce`来自于第1次请求返回，而多的这个`__ac_signature`就要处理了。

![](https://attach.52pojie.cn/forum/202507/21/205459nv7n8rzrxjn7ztzl.png)

此时利用postman发一次包看第1次请求响应内容究竟是什么：

![](https://attach.52pojie.cn/forum/202507/21/205501ztlfmqf5wyve5z5n.png)

是一大段JS，拿出来看：显然是个`jsvmp`，且能找到生成的函数是：

```
__ac_signature=window.byted_acrawler.sign("",__ac_nonce);
```

![](https://attach.52pojie.cn/forum/202507/21/205504o54jaq6zhj5h0hhf.png)

而`__ac_nonce`已经可以从第1次请求拿到，接下来就看怎么让这个调用能够完成。

## 2. 补环境

**由于是个大jsvmp，简单做法直接补环境处理。**
先尝试运行代码看看：报错防盗链。。。

![](https://attach.52pojie.cn/forum/202507/21/205506b5vjzayc2ydvaa12.png)

那常规操作，先补几个基础dom对象，再祭出Proxy直接挂！

提一嘴，`watch`方法来自于B站up主：**无名的Coder**，主页：[up主页](https://space.bilibili.com/376969345)

```
function watch(obj, name) {
    return new Proxy(obj,{
        get: function(target, property, receiver) {
            try {
                if (typeof target[property] === "function") {
                    console.table([`对象 => ${name} ,读取属性:`, property + `,值为:` + 'function' + `,类型为:` + (typeof target[property])]);
                } else {
                    console.table([`对象 => ${name} ,读取属性:`, property + `,值为:` + target[property] + `,类型为:` + (typeof target[property])]);
                }
            } catch (e) {}
            return target[property];
        },
        set: function(target, property, newValue, receiver) {
            try {
                console.table([`对象 => ${name} ,设置属性:`, property + `,值为:` + newValue + `,类型为:` + (typeof newValue)]);
            } catch (e) {}
            return Reflect.set(target, property, newValue, receiver);
        }
    });
}

window = global;

document= {
};
location= {
};
navigator= {
};

window = watch(window, "window");
location = watch(location, "location");
document = watch(document, "document");
navigator = watch(navigator, "navigator");

require("./bdm.js")

var sign = window.byted_acrawler.sign("","123");
console.log(sign);
```

运行打印看看：

* sessionStorage和localStorage

  ![](https://attach.52pojie.cn/forum/202507/21/205508uvuce2i0hhff8dhh.png)
* cookie

  ![](https://attach.52pojie.cn/forum/202507/21/205510o1m6ko1jw4mw41jd.png)
* referer

  ![](https://attach.52pojie.cn/forum/202507/21/205513g23rlwt1w1ztl843.png)
* location

  ![](https://attach.52pojie.cn/forum/202507/21/205515uvgutjt4ptgrp8dz.png)

**行，那就全补上**

```
document= {
    referrer:'https://xx.xx.xx/search?dvpf=pc&source=trending_card&keyword=%E5%B7%A6%E6%B0%A7%E6%B0%9F%E6%B2%99%E6%98%9F%E2%80%9C%E6%94%BB%E5%87%BB%E2%80%9D%E8%82%8C%E8%85%B1%E7%9A%84%E6%A6%82%E7%8E%87',
};
location= {
    "ancestorOrigins": {},
    "href": "https://xx.xxx.xx/search?dvpf=pc&source=trending_card&keyword=%E5%B7%A6%E6%B0%A7%E6%B0%9F%E6%B2%99%E6%98%9F%E2%80%9C%E6%94%BB%E5%87%BB%E2%80%9D%E8%82%8C%E8%85%B1%E7%9A%84%E6%A6%82%E7%8E%87",
    "origin": "https://xx.com",
    "protocol": "https:",
    "host": "xx.com",
    "hostname": "xx.com",
    "port": "",
    "pathname": "/search",
    "search": "?dvpf=pc&source=trending_card&keyword=%E5%B7%A6%E6%B0%A7%E6%B0%9F%E6%B2%99%E6%98%9F%E2%80%9C%E6%94%BB%E5%87%BB%E2%80%9D%E8%82%8C%E8%85%B1%E7%9A%84%E6%A6%82%E7%8E%87",
    "hash": ""
};
navigator= {
    userAgent: "自己找"
};

Storage = function(){}
localStorage = {}
sessionStorage = {}

Object.setPrototypeOf(localStorage, Storage.prototype)
Object.setPrototypeOf(sessionStorage, Storage.prototype)
```

再来试试：只剩这个关键函数，提示undefined

![](https://attach.52pojie.cn/forum/202507/21/205517k1isb116c6odf611.png)

回头看看那个vmp，其中有一些检测点：

![](https://attach.52pojie.cn/forum/202507/21/205519tm3cq6o7cuz6u3jf.png)

```
"undefined"!=typeof exports?exports:void 0
```

在node环境下，这个表达式包返回Object，但是浏览器环境并没有exports，结果是undefined。所以必须让这个表达式的结果也是undefined，这样修改下再运行：

```
"undefined"==typeof exports?exports:void 0
```

![](https://attach.52pojie.cn/forum/202507/21/205521m2s3smqy2yqqbmsf.png)

**直接出值，成功！**
并且长度也没问题，代入请求中去测试能通过。

## 3. 思考

目前这个值请求通搜索接口没问题，不过有些场景的话，这个长度还不够，例如评论接口：

![](https://attach.52pojie.cn/forum/202507/21/205523uirq9zh0f60zg0m9.png)

实际长度有147，但搜索接口补完出的值仅有47。所以补的环境不够，还差一部分。

这个就留给大伙自己补来看看哈哈

**入门补环境，大佬请忽略**
