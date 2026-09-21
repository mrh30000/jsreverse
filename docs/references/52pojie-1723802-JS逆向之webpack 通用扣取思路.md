# JS逆向之webpack 通用扣取思路

> **作者**: cenjy9 | **发布时间**: 2022-12-07 12:39:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 7380 / 20
> **原文**: [https://www.52pojie.cn/thread-1723802-1-1.html](https://www.52pojie.cn/thread-1723802-1-1.html)

---

<table><tr><td bgcolor=orange>本文所有教程及源码、软件仅为技术研究。不涉及计算机信息系统功能的删除、修改、增加、干扰，更不会影响计算机信息系统的正常运行。不得将代码用于非法用途，如侵立删！</td></tr></table>

---

#### 标题

> `环境`
>
> * win10
> * chrome106

目标站：aHR0cHM6Ly93d3cuZ205OS5jb20v
加密参数 password: K6YEmQrNy%2FQgdnacXhdIZ1upCj4UU562IW89oOZquLkZ%2F16JDNyMqEU7pGVemvQzjfAlOzh7nSOLPkJp3kxbTm8XtWrHp9K%2BmMClOmmhkbdjAyax5xLBWC6PJiD6o8H

随便输入一些信息，触发登录，抓包找到接口
![在这里插入图片描述](https://img-blog.csdnimg.cn/e18e2294641e4078ab3911ead850fd45.png)
全局搜索password，没有找到明显的有用信息，使用xhr堆栈随便找个疑似位置打个断点跟进去![在这里插入图片描述](https://img-blog.csdnimg.cn/da2ace6222cd43ab9d9de37535558e44.png)
明显分析出a.encode就是加密方法
，查看结构可以看出是webpack结构![在这里插入图片描述](https://img-blog.csdnimg.cn/9bc632ed0b0c412695ff35a5e5923479.png)

#### 1.定位加载模块的方法（加载器）

webpack必有一个加载模块的方法：call或apply，找到加载器先抠出来
![在这里插入图片描述](https://img-blog.csdnimg.cn/14e7de3871c04a318eab6b36c774092c.png)

```
function e(s) {
    if (i[s])
        return i[s].exports;
    var n = i[s] = {
        exports: {},
        id: s,
        loaded: !1
    };
    return t[s].call(n.exports, n, n.exports, e),
}
```

#### 2.构造成自执行方法

在控制台调试一下缺什么补什么

```
!function(t) {
    function e(s) {
        var i = {};
        if (i[s])
            return i[s].exports;
        var n = i[s] = {
            exports: {},
            id: s,
            loaded: !1
        };
        return t[s].call(n.exports, n, n.exports, e),
    }
}()
```

#### 3.定位并扣除调用的加密方法

在a.encode处下断点，跟进去找到最终的加密方法
分析得知jsencrypt.encrypt就是最终的加密方法
![在这里插入图片描述](https://img-blog.csdnimg.cn/0b75a99c346e405f835275444bdfdcc8.png)
将jsencrypt.encrypt的方法整段扣出来，然后作为参数填入自执行加载器中，然后在将调用jsencrypt.encrypt的方法也抠出来
![在这里插入图片描述](https://img-blog.csdnimg.cn/a37a1219b7d74601bc83192c0f38f8f7.png)

代码太长就不贴了，最终的格式就是下面的样子，

```
!(function(t) {
    var i = {};
    function e(s) {
        if (i[s]) return i[s].exports;
        var n = i[s] = {
            exports: {},
            id: s,
            loaded: !1
        };
        return t[s].call(n.exports, n, n.exports, e), n.loaded = !0, n.exports
    }
    _e = e;
})({
    encrypt: function(t, e, i) {},
    diaoyong: function(t, e, i) {}
});
```

#### 4.导出加密方法

```
var _e;
!(function(t) {
    var i = {};
    function e(s) {
        if (i[s]) return i[s].exports;
        var n = i[s] = {
            exports: {},
            id: s,
            loaded: !1
        };
        return t[s].call(n.exports, n, n.exports, e), n.loaded = !0, n.exports
    }
    _e = e;
})({
    encrypt: function(t, e, i) {},
    diaoyong: function(t, e, i) {}
});
```

#### 5.编写自定义方法 按照流程加密

```
function getkey(pass, time) {
    var diaoyong= _e("diaoyong");
    //这儿需要new一下调用方法，不然获取不到方法属性
    var new_diaoyong = (new diaoyong);
    return new_diaoyong.encode(pass, time)
}
```

#### 效果

![在这里插入图片描述](https://img-blog.csdnimg.cn/27295c68cde94145a9b04a1493355b00.png)

---

<table><tr><td bgcolor=orange>本文仅供学习交流使用，如侵立删！</td></tr></table>

---
