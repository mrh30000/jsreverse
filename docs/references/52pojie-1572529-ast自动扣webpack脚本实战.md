# ast自动扣webpack脚本实战

> **作者**: 漁滒 | **发布时间**: 2022-01-07 00:25:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 13061 / 47
> **原文**: [https://www.52pojie.cn/thread-1572529-1-1.html](https://www.52pojie.cn/thread-1572529-1-1.html)

---

*本帖最后由 漁滒 于 2022-1-7 00:30 编辑*

@[TOC](https://www.52pojie.cn/ast%E8%87%AA%E5%8A%A8%E6%89%A3webpack%E8%84%9A%E6%9C%AC%E5%AE%9E%E6%88%98)

### webpack是什么

webpack是一个现代 JavaScript 应用程序的静态模块打包器(module bundler)，通俗来讲，我的理解就是把你在加解密过程中要调用的模块打包成为一个JS文件，然后引入它，自动展现出你要引入的资源。可能我这里说的不是很清楚，可以推荐一篇文章：<https://www.cnblogs.com/Eeyhan/p/10584014.html>

![在这里插入图片描述](https://img-blog.csdnimg.cn/271912f4f9a34d8a851ba0d08e037276.png?)

### 前置阅读

本文章主要是讲述脚本的使用方式，而js的分析过程在本文中会省略。文章中实战的来源于下方网址，请先阅读下方网站中的分析过程，再尝试阅读本文，会更加清晰。

阅读地址：[用3个实战案例带你理解webpack](https://mp.weixin.qq.com/s/c4nU1oSGvH1pJHPC8bsZMQ)

### webpack自动扣代码脚本

项目地址: [渔滒 / webpack\_ast](https://gitcode.net/zjq592767809/webpack_ast)

使用命令行的方式

node webpack\_mixer.txt -l runtime.62249a5.js -m app.597640f.js -o webout.js

参数说明：

-l 加载器的js路径

加载器的js特征：

1.以自执行函数开头

2.定义导出函数，类似 return e[n].call(r.exports, r, r.exports, d), r.l = !0, r.exports

3.为导出函数添加多个方法，类似d.e，d.m，d.n等等

-m 函数模块的js路径

函数模块的js特征：

1.一般以(window.webpackJsonp开头

-o 输入结果的js路径

备注：如果js本身有检测等，需要自行补头或者其他处理

### 实战内容

文章中的第一个网站是猿人学的webpack，因为这个不是一个常规的，所以这里不适用，直接从第二个开始

从文章中可以知道，加密的方法来自于home.min.js这个js文件，那么直接将这个文件下载下来，这个文件就是一个加载器

![在这里插入图片描述](https://img-blog.csdnimg.cn/d4f3e8b425a84adfbd79a4aa39afd16d.png#pic_center)

下载完成后，把脚本文件webpack\_mixer.js放到同一目录，并执行

```
node webpack_mixer.js -l home.min.js -o webpack_out.js
```

可以得到webpack\_out.js这个已经扣取完成的文件，自己在同目录创建一个test.js的测试文件，直接导入文件

![在这里插入图片描述](https://img-blog.csdnimg.cn/9a5a63fe970947c2b54438cc86aaf91f.png?)

可以正常获取到所有的导出函数

![在这里插入图片描述](https://img-blog.csdnimg.cn/b50d3648c7004f8d82b5143ef50c9b73.png?)

当调用加密的时候，缺少环境。那么直接导入jsdom

![在这里插入图片描述](https://img-blog.csdnimg.cn/0bb84c645f974e7abbbf2230de3c15b4.png?)
继续运行发现ASN1未定义，主要是因为浏览器和node环境不同导致的，在下面三个位置前面加上window来调用就可以

![在这里插入图片描述](https://img-blog.csdnimg.cn/1340435cd7e94d32809920e3d057d609.png?)

再次运行得到加密结果

![在这里插入图片描述](https://img-blog.csdnimg.cn/954278ff05564ed8af6bf5d6ce476570.png?)
继续来到第三个实战

根据文章中的分析，密码的加密调用到了login.5170f665.js这个文件，但是这个文件只是一个模块，还要找到它的加载器app.f24d08e9.js一起下载下来

```
node webpack_mixer.js -l app.f24d08e9.js -m login.5170f665.js -o webpack_out.js
```

尝试对密码进行加密

![在这里插入图片描述](https://img-blog.csdnimg.cn/bd468bfa66c8405e99e1f8e1b4e28ffb.png?)

出现这个错误，那么一定就是还是缺少需要的模块，经过查找是缺少了chunk-vendors.bb13f90f.js这个模块，那么继续下载这个模块放到一起

```
node webpack_mixer.js -l app.f24d08e9.js -m login.5170f665.js -m chunk-vendors.bb13f90f.js -o webpack_out.js
```

![在这里插入图片描述](https://img-blog.csdnimg.cn/8d1f2ddaa9eb4b8bbf31dc9f4d591cd6.png?)
此时密码加密已经完成，还差一个请求体的加密，发现是调用另外一个文件DCSAPPClientAPI-0.0.0.7.js进行加密的，也下载下来

![在这里插入图片描述](https://img-blog.csdnimg.cn/61280c0da4df4df1b7b100da01a6476e.png?)

通过导入文件，就可以实现全部的加密了，至此实战完成
