# 药某局 webpack js逆向扣代码

> **作者**: 就往丶 | **发布时间**: 2025-03-08 00:28:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 10249 / 84
> **原文**: [https://www.52pojie.cn/thread-2012536-1-1.html](https://www.52pojie.cn/thread-2012536-1-1.html)

---

*本帖最后由 就往丶 于 2025-3-8 10:15 编辑*

## 什么是webpack

Webpack 是一个现代 JavaScript 应用程序的模块打包器。它的主要作用是将你项目中的各种资源（JavaScript、CSS、图片等）打包成少数几个文件（通常是一个或几个 JavaScript 文件），使得前端页面加载更快，并且优化开发过程。

在webpack里面会有一个加载器，在网页加载的时候把函数都加载在里面 ，然后通过键值或者列表索引来调用 他是一个自执行函数

如下的两种格式

```
// 列表
!function(参数){[函数体，模块1，模块2，...]}

  // 键值对
!function(参数){"K1":"模块1", "K2":"模块2"}
```

加载器的格式

先通过下面的参数把函数传递进去,把函数存储起来,后面就可以通过把索引直接调用函数

```
window = global;

!(function (e) {
    var t = {}; // 用来存储模块的对象

    // 定义模块加载函数 n
    function n(r) {
      // 如果模块已经加载过，则直接返回该模块的 exports
      if (t[r]) return t[r].exports;

      // 如果没有加载过，则创建一个新的模块
      var o = t[r] = {
        i: r,        // 模块标识符
        l: false,    // 是否已加载
        exports: {}  // 导出的内容
      };

      // 加载并执行模块的代码
      e[r].call(o.exports, o, o.exports, n);

      // 返回模块的 exports
      return o.exports.exports;
    }

    // 模块加载器或执行环境
    window.loader = n;

    // 示例：调用模块
    // nc("1002"); // 此行被注释，表示不执行

})([function () {
    console.log("function1")
},function () {
    console.log("function2")
}])

//第二种传参  键值对的方式
// ({"fun1": function () {
//     console.log("function1")
// },"fun2":function () {
//     console.log("function2")
// }})

window.loader(0)
```

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_12_7_8_10_11_41_1741362127586-f15232c0-70c5-4449-b908-8eba82b20813.png)

调用执行

```
window.loader(0)
// 第二种调用
window.loader("fun1")
```

结果

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_14_59_1741362226051-cb366fb3-ee77-43a6-9d1f-57261fd3d11a.png)

## 实战

网站：aHR0cHM6Ly9mdXd1Lm5oc2EuZ292LmNuLw==

位置：定点查询

---

### 接口分析

接口地址：queryFixedHospital

encData 是加密参数

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_12_9_1741362645580-558a7caa-e771-49c6-b4f5-63d50dcfaab7.png)

### 查找加密的位置

用json hook技术

```
var my_stringify = JSON.stringify;
JSON.stringify = function (params) {
  // 这里可以添加其他逻辑比如

  console.log("json_stringify params:",params);
  debugger
  return my_stringify(params);
};
var my_parse = JSON.parse;
JSON.parse = function (params) {
  // 这里可以添加其他逻辑比如

  console.log("json_parse params:",params);
  debugger
  return my_parse(params);
};
```

控制台下hook

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_12_27_1741363024736-5ede6cbb-cdd1-402d-9522-dc6e79506508.png)

跳过三个不是完成解密的位置，在完成解密之后的地方停住向上跟站

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_12_28_1741363090401-1675a45b-f783-4086-bf53-5594b6a02b6c.png)

这里有一个很明显的关键词 decrypt

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_12_30_1741363116763-583267dc-e831-4abf-8b4b-26ecbc6cab42.png)

可以在return这个位置下个断点看看是不是真的数据，可以看到他前面通过一些处理变成列表然后在转换字符串

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_12_38_1741363248177-9fe323aa-7015-406b-85c0-fd75985d2ea9.png)

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_12_39_1741363189050-4c07c630-7564-40fa-b8c8-d635797ee6cd.png)

在向上跟栈看看有没有什么明显的地方

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_13_39_1741363354234-b8bc245e-b08e-40e2-acbb-23e7f19b24ad.png)

在（1）的位置是一个拦截器

在 **Axios** 中，`interceptors`（拦截器）用于拦截请求或响应，并在它们被处理之前执行某些操作。`response` 拦截器允许你在服务器返回响应之前，对响应数据进行处理或修改，或者在发生错误时执行某些操作。

（2）的位置就是刚刚通过把加密数据传递进去的变量

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_12_42_1741363402297-ad2f0db7-68b7-4c11-9d30-4675f007fe91.png)

加密函数是n.b,我们可以看看这个在哪里 往上面找一找 可以看到这里有很多像webpack格式的函数调用方式，我们可以推测这个是webpack框架，在这个位置下个断点刷新页面

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_12_44_1741363572781-458f288b-518e-4473-b7fd-0c70593626b3.png)

进入构造器

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_12_51_1741363656855-b4ef55b4-f5e0-47d5-9bd1-21408328eba4.png)

这个就是构造器了

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_12_52_1741363690087-ef7822c2-b4bf-4bcc-bcec-8ddd01e6699b.png)

在这里可以看到下面都是我上面说过的参数键值对的格式，我们可以直接把他们都扣下来

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_12_54_1741363742856-7d0070a5-c708-46ab-8788-6c9d80ca3e76.png)

### 改代码

扣完先运行看看 ，缺少window 直接在上面补

在浏览器中，`window` 是一个全局对象，代表浏览器的 **浏览器窗口** 或 **标签页**。它是浏览器环境中的顶级对象，提供了访问浏览器的多种功能，比如操作浏览器的历史记录、获取用户的浏览器信息、管理定时器、处理事件、访问浏览器的 `localStorage`、`sessionStorage` 等。

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_12_58_1741363851899-1e5c586d-2083-4788-8b89-ba2aa3c9cdba.png)

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_13_30_1741363915368-1a4b639a-e52a-4ae4-921e-3d7d0a0a8648.png)

可以运行成功了  但是我们如果想运行他里面的代码 是不是得需要使用到那个构造器，但是因为js的域不一样不能直接调用他，所以我们需要在外面添加一个全局变量来接收他们内部的参数

在构造器的参数下面添加全局变量接收这个,构造器函数o

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_13_3_1741364021335-9f45f8c7-db9e-44b8-a883-c087c5414515.png)

出现了环境测试的错误，在这个里面一般有一个检测环境的函数我们需要注释掉

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_13_7_1741364277294-79d55352-8a09-4351-b765-c0b8b334cf02.png)

把这个注释掉o.的那些函数都是为了做准备 可以忽视掉,直接看最后一行，是调用了某个函数所以这个是环境检测的函数

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_13_9_1741364323950-329b3028-7653-44b1-a676-32cf84e103ee.png)

直接打印这个对象可以发现里面拥有了我们需要的函数了

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_13_10_1741364121895-31027144-5dd7-4fb1-8ffa-bb8862d3c858.png)

在前面中我们看到了`Object(u.b)("SM4", e.data))`位置是解密的，里面的u.b又是从`u = n("7d92")`得到的，直接调用就可以得到里面的函数

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_13_13_1741364220797-cea20b2f-b11e-47dc-afc2-2001a0d1fd00.png)

定义一个变量来接收这个函数 ，e是加密的参数

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_13_15_1741364494858-2c0f2f44-26ca-4918-bc1f-a96bf3bf4c6e.png)

成功解密

![](https://gitlab.com/hansaes/aumanimage/-/raw/main/pictures/2025/03/8_10_13_18_1741364563967-2fabbe60-cebe-4674-bf65-669740d57e02.png)
