# ast-HOOK-for-js二次开发及修复

> **作者**: loopg | **发布时间**: 2023-02-10 17:38:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5488 / 9
> **原文**: [https://www.52pojie.cn/thread-1744420-1-1.html](https://www.52pojie.cn/thread-1744420-1-1.html)

---

*本帖最后由 loopg 于 2023-2-10 17:48 编辑*

## 简介

原项目地址: [ast-hook-for-js-RE](https://github.com/JSREI/ast-hook-for-js-RE)
话说，十次使用九次报错。但该说不说，绝对的利器，给予肯定。
最近用来测试某信视频平台，又报错webpack not defined. 导致页面空白不加载让人头大，于是乎看代码量不大决定研究一下。
原因无非几种，将hook注入到了不能注入的代码段。babel的版本太老了，导致ast后再还原就有了webpack not defined等问题。 顺便还想研究一下能不能有提升效率的方式。
先了解一下项目的原理和结构，后期再谈修复和增加功能的事情。毕竟是业余爱好，还要追寻诗与远方。

## 目录结构分析

```
├─api-server
│      api-server.js  ->  用 express 监控了端口 10010 创建了 /hook-js-code 接口 (将传进来的javascript代码使用 inject-hook.js 中的 injectHook 注入hook)，然后将结果返回
│
├─components
│  └─global-assign-hook-component
│      ├─core -> 逻辑核心目录
│      │      global-assign-hook-component-main.js  -> javascript文件缓存逻辑/ javascript文件注入hook逻辑(例如页面外部加载src和应用的js注入控制)
│      │      hook.js -> cc11001100_hook 函数接口全局暴露/定义了一个hookCallback列表，string-put-to-db-plugins.js丢入该列表，用作回调
│      │      inject-hook.js -> javascript文件AST解析及Hook注入和注入Hook后生成javascript代码(这里有四种注入hook 变量声明(VariableDeclaration)、赋值表达式(AssignmentExpression)、对象表达式(ObjectExpression)、函数形参(FunctionDeclaration))
│      │      plugins-manager.js -> 顾名思义 插件管理。这里把hook.js 和 同级目录 plugins 里(plugins-manager.js 中 pluginsNames 列表定义的) .js 文件内容注入到了页面里。
│      │
│      └─plugins -> 插件目录
│              eval-hook-plugins.js -> 顾名思义。 将eval函数劫持，eval执行的东西发到 api-server.js 创建的api 注入hook。
│              search-strings-db-plugins.js -> 顾名思义。 从本地db搜索字符串
│              string-put-to-db-plugins.js -> 顾名思义。 将字符串丢入本地db
│
├─proxy-server -> 代{过}{滤}理目录 - 启动入口文件在这呢
│      proxy-server.js -> 入口文件，用 anyproxy 创建了一个代{过}{滤}理网络(rules.js 路由定义) 目的是请求javascript文件的时候进行拦截，实现后面的注入hook。
│      rules.js -> anyproxy 路由定义
│
└─runtime-for-result -> 呃，感觉文件夹名称和里面的文件内容不相干
        cc11001100_hook.js -> 这个文件不清楚作用。内容是将 cc11001100_hook 直接返回value。 根据注释理解其目的可能是去除注入的hook函数后部分 cc11001100_hook 调用可能会出错，所以加了这么一个东西。 但并没有地方调用或加载它？？？？？？
        remove-hook-function.js -> 顾名思义，单独执行。移除指定.js文件注入的hook函数
```

## 原理

#### proxy-server.js 流程

1.使用 anyproxy 创建了一个代{过}{滤}理服务器进行浏览器的流量拦截。
2.定义beforeSendResponse(请求后的响应拦截)规则，将响应信息交给globalAssignHookComponent.process处理.=。
3.globalAssignHookComponent.process中判断是html还是javascript响应，并分别调用对应的注入hook方式(processHtmlResponse/processJavaScriptResponse)。
4.processHtmlResponse 将plugins-manager.js(插件管理器)pluginsNames 列表定义的 .js 文件内容读入并拼接为一个整体注入到页面上。
5.processHtmlResponse/processJavaScriptResponse会判断是否使用/已有本地缓存，避免重复AST注入hook代码。(processRealtime/processFromCache)
processRealtime 调用 injectHook 对javascript进行AST解析并注入hook代码，再还原成js文件。 将js文件url md5后作为缓存文件名称。
6.返回响应文件内容。

#### api-server.js

1.使用 express 监听10010端口，创建一个/hook-js-code接口。
2./hook-js-code 接收javascript源代码并返回注入hook后的javascript代码。
这里/hook-js-code接收的JavaScript代码来至插件目录(/plugins)下的eval-hook-plugins.js。 用途是将eval函数劫持并注入hook。

到这，ast-hook-for-js-RE 便分析差不多了。 相信现在可以自己实现一个类似的项目了。
休息一会继续第二章，更新ast-hook-for-js-RE项目引入的库。（直接更新会导致部分写法不兼容新版本库，目的是解决这些问题）。
