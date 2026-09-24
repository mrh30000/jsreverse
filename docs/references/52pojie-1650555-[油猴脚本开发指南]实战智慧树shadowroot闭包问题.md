# [油猴脚本开发指南]实战智慧树shadowroot闭包问题

> **作者**: 李恒道 | **发布时间**: 2022-06-17 14:35:00 | **版块**: 『编程语言区』 | **查看/回复**: 5997 / 24
> **原文**: [https://www.52pojie.cn/thread-1650555-1-1.html](https://www.52pojie.cn/thread-1650555-1-1.html)

---

*本帖最后由 李恒道 于 2022-6-17 14:42 编辑*

**开始**
最近**智慧树**玩上了shadowroot
说实话本来不想参与这些东西了
但是看到好多作者被折磨的欲死欲活
我的大刀又开始饥渴难耐了
不禁在此吟诗两首
社会摇中万人迷
唯有男神牌牌琦
社会摇中没有将与帅
只有实力这一块
摇！

![](https://attach.52pojie.cn/forum/202206/17/144213a3u1xd13ogq1b3ss.png)

**鸣谢**
在此感谢[@涛之雨](https://www.52pojie.cn/home.php?mod=space&uid=879080) 、cxxjackie对我的耐心教导之前曾辅导我将shadowroot的各种奇技淫巧将其倾囊相授
授了又授
授了还授
授了再授
那么废话不多说了
我们开始实战
**实战**

![](https://attach.52pojie.cn/forum/202206/17/143013q1fk4zyj44ii49jj.png)

我们的目标就是获取题目
首先查阅mdn文档
https://developer.mozilla.org/zh-CN/docs/Web/API/Element/shadowRoot
通常来说是使用attachShadow函数来挂载shadowroot函数
mdn可以查阅
https://developer.mozilla.org/zh-CN/docs/Web/API/Element/attachShadow
我们如果想要hook attachShadow
那么需要修改ELEMENT的原型链附加shadowroot

![](https://attach.52pojie.cn/forum/202206/17/143030jwfuxifetz1ux9th.png)

我们编写简易代码
我们编写简易代码

[JavaScript] *纯文本查看*

```
let old=Element.prototype.attachShadow
Element.prototype.attachShadow=function(...args){
    console.log('attach劫持',...args)
    return old.call(this,...args)
}
```

但是这时候智慧树提示了异常脚本
搜索一下文字找到了

![](https://attach.52pojie.cn/forum/202206/17/143100hcmsyd4qzxr9zry9.png)

先打印一下f.r是什么

[JavaScript] *纯文本查看*

```
        function l() {
            return a(window.XMLHttpRequest) && a(window.XMLHttpRequest.prototype.open) && (!S.a.state.globalProperty.supportShadom || a(document.body.attachShadow)) && !window.OCS
        }
```

OCS作者榜上有名，笑死
然后看a.i是啥

![](https://attach.52pojie.cn/forum/202206/17/143127zm8f5q55w1spgst4.png)

单纯的变量返回，那么核心问题在f.r上
我们观察代码
发现每一个都进行了
a(document.body.attachShadow)
我们继续往a函数里走

[JavaScript] *纯文本查看*

```
        function a(e) {
            var t = void 0 === e ? "undefined" : _()(e);
            return "function" == t ? ne.test(ee.call(e)) : e && "object" == t && Y.test(toString.call(e)) || !1
        }
```

因为是三元表达式
根据调试来看t在attachshadow基本情况是一个函数
所以我们走的 条件?结果1:结果2
只需要注意结果1就可以了
这个ne是一个正则表达式

![](https://attach.52pojie.cn/forum/202206/17/143151c37mue3pc670ero1.png)

而ee是获取一个函数的源代码

![](https://attach.52pojie.cn/forum/202206/17/143202w26qgptjfjtzuuu1.png)

那么逻辑基本通了
我们在hook之后
智慧树按一个 白名单的函数列表做遍历
然后判断是否出现了nativecode的字样
所以我们可以无限往里的函数追
一直追到了

![](https://attach.52pojie.cn/forum/202206/17/143212vnnnvzkvbzqrkezv.png)

这行打印了代码的字符串

![](https://attach.52pojie.cn/forum/202206/17/143225z75faxfaawmmnmxl.png)

但是因为这里在启动的时候
已经获取了Function.toString了
所以我们很难对其进行函数字符化的劫持
但是因为上层使用了正则
我们可以对正则劫持
可以劫持attachShadow之后再对正则进行二次劫持

[JavaScript] *纯文本查看*

```
RegExp.prototype._test = RegExp.prototype.test;
RegExp.prototype.test = function (s) {
  if (this.source.includes('function') || this.source.includes('native code')) {
    return true;
  }
  return this._test(s);
};
```

但是那样就没啥意义了
所以我们随便再玩两三种方法吧
智慧树出现了一个小小的失误
就是他基于框架写了代码
只要有一个对框架研究的还不错的人
就可以基于框架做核心级别的劫持
因为回调和显示是无法被代码控制的
所以只能急于救火，而如果对框架进行魔改的话
又会导致无法跟随框架进度更新
甚至公司要招一个专门的懂框架的人进行补丁式维护
(这里暗示招我招我招我，月薪三千好养活，楼下保安工资都比我高)
我们之前看到异常代码在

![](https://attach.52pojie.cn/forum/202206/17/143300sy47ytqqybiybzvy.png)

我们可以看到代码就是一个校验
一个上报
而f.r也只有这一处

![](https://attach.52pojie.cn/forum/202206/17/143314zhofo14o66hosyft.png)

我们可以看到，他在这里调用了，那问题很简单
我们对setinterval和settimeout做劫持

![](https://attach.52pojie.cn/forum/202206/17/143326dj2mm620seuz6ce2.png)

这里可以看到，他故意传入了一个特定参数，恶心心

![](https://attach.52pojie.cn/forum/202206/17/143338efjjdlpdnpjyld1y.png)

你以为这样我就拿捏不了了？
直接利用throw错误拿报错堆栈信息回溯堆栈干他

[JavaScript] *纯文本查看*

```
window.setInterval=function(...args){
    let err= new Error('大赦天下');
    console.log('setInterval大赦天下',err)
    return oldset.call(this,...args)
}
window.setTimeout=function(...args){
    let err= new Error('大赦天下');
    console.log('setTimeout大赦天下',err)
    return oldout.call(this,...args)
}
```

![](https://attach.52pojie.cn/forum/202206/17/143359zjhots2zqjn2oklo.png)

那么我们直接写代码

[JavaScript] *纯文本查看*

```
let oldset=window.setInterval
let oldout=window.setTimeout
window.setInterval=function(...args){
    let err= new Error('大赦天下');
    if(err.stack.indexOf('checkoutNotTrustScript')!==-1){
        return
    }
    return oldset.call(this,...args)
}
window.setTimeout=function(...args){
    let err= new Error('大赦天下');
    if(err.stack.indexOf('checkoutNotTrustScript')!==-1){
        return
    }
    return oldout.call(this,...args)
}

```

秒杀异常报告

![](https://attach.52pojie.cn/forum/202206/17/143422e53i3r5jh40mlt43.png)

然后我们编写劫持attachelemtn代码

[JavaScript] *纯文本查看*

```
let old=Element.prototype.attachShadow
Element.prototype.attachShadow=function(...args){
    console.log('attach劫持',...args)
    args[0].mode='open'
    return old.call(this,...args)
}
```

测试一下
已经拿捏

![](https://attach.52pojie.cn/forum/202206/17/143452zi9f71p7r1pnrlur.png)

你以为这里就结束了？
继续大赦天下
我们全局搜索attachShadow
只找到了一个closed
在

![](https://attach.52pojie.cn/forum/202206/17/143507mfw7qexbl1qin2sn.png)

可以知道this.shadowDom是attachShadow的引用
因为之前我们大量的调试知道是vue页面
直接爆框架
document.querySelector('.subject\_describe >div >div').parentElement.\_\_vue\_\_.shadowDom.innerHTML

![](https://attach.52pojie.cn/forum/202206/17/143526ipuup54iphvasvh5.png)

**结语**
今天浅聊三种方式拿捏
只要是基于框架的
都有无数种可能无数种方式让我们尝试注入，修改，破坏
从技术的角度是浪漫的
是矛与盾，刀与剑，周瑜与黄盖的罗曼蒂克史
但是从道德的角度上
我一直推荐大家仅仅用来刷公共课
刷专业课是无趣且无聊的
我是一名土木工程的毕业生
当初转计算机的时候
你们一脸鄙夷的网络选修课计算机教程
是我日日夜夜不断反复观看的资料
每当我想到这个事情的时候
总觉得无比的讽刺。
严肃性撒花
