# 以 aqistudy 为例的无限 debugger 反调试绕过演示（附视频）

> **作者**: xianyucoder | **发布时间**: 2021-08-17 14:34:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5701 / 6
> **原文**: [https://www.52pojie.cn/thread-1495421-1-1.html](https://www.52pojie.cn/thread-1495421-1-1.html)

---

*本帖最后由 xianyucoder 于 2021-8-19 09:24 编辑*

### 今日网站

aHR0cHM6Ly93d3cuYXFpc3R1ZHkuY24v

这个站是看到读者在其他群里问以为又改版了，所以打开瞅瞅

本篇文章只演示反调试的绕过，其他内容之前文章讲过了。

请自行翻阅

#### debugger 的绕过

最后附视频演示

打开网站，发现网站禁用了 F12 和 右键

![](https://tc.xianyucoder.cn/blog20210811110317.png)

![](https://tc.xianyucoder.cn/blog20210811110334.png)

这样的反调试可以通过 `Ctrl + Shift + i` 打开控制台

打开控制台之后看到提示`debugger`

![](https://tc.xianyucoder.cn/blog20210811110547.png)

这样的 debugger ，可以在堆栈里翻看上一层堆栈看看能否置空函数来防止进入 debugger

![](https://tc.xianyucoder.cn/blog20210811110924.png)

通过堆栈可以看到`txsdefwsw`这个方法调用了`debugger`

![](https://tc.xianyucoder.cn/blog20210811111039.png)

这个方法是在首页调用的，试了下`txsdefwsw = function(){}`

发现还是会出现调用，再看堆栈，发现原来还有`setInterval`循环调用了检测逻辑

![](https://tc.xianyucoder.cn/blog20210811111319.png)

![](https://tc.xianyucoder.cn/blog20210811111335.png)

可以看到上图的堆栈，最顶层是`city_realtime.php`

在这个堆栈里找到了两个`eval`

![](https://tc.xianyucoder.cn/blog20210811111826.png)

所以这个网站的整套逻辑我猜是下面这样的

```
1、请求目标网站
2、目标网站加载首页（首页中包含上图的两个 eval）
3、eval 中包含检测逻辑
4、访客打开控制台，被已经加载的检测逻辑检测，完成反调试
```

知道这个套路之后我们要这么反反调试？

1、本地代{过}{滤}理这个首页，替换首页的`eval`

这个法子的工具用 Fiddler 或者 Reres ，用规则匹配到这个页面然后替换就好了，网上的资料很多或参考之前的文章

2、使用如下视频的方法调试，可以在 vm 的生命周期内不用理会 debugger

链接：<https://pan.baidu.com/s/1mlIzTyLqDTYKF4fjViLqGQ> 提取码：c408

有读者试过视频中的方法，但是就是不行，这是为啥？

这里可能是忽略了一个小细节，这个可以在代码中找到答案

![](https://tc.xianyucoder.cn/blog20210811113041.png)

这里检测了 window 的内外长宽，当我们打开控制台，原有展示的页面就小了，所以只要把控制台调整成一个新的窗口就可以规避，接着使用视频展示的就可以了。

除此之外，还有读者好奇`eval`里面的`dxYKI84fjg`还有`d1JR0RXxxgp`逻辑在哪，进不到具体逻辑里

![](https://tc.xianyucoder.cn/blog20210811113403.png)

可以像我这样在控制台输入函数名，然后点击回显的内容就可以自动跳到对应的逻辑了，这个方法适用于没有重写过`toString`方法的函数。

关于 debugger 反调试的形式很多，但是检测的方法大同小异，重要的是理解他为什么会出现 debugger ，先知道原理才知道如何绕过。

以上，就是今天的全部内容了，我们下次再会~
