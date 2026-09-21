# 某电子商务生态链平台登陆 Form Data 加密逻辑分析

> **作者**: xianyucoder | **发布时间**: 2021-08-19 08:51:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8487 / 55
> **原文**: [https://www.52pojie.cn/thread-1496415-1-1.html](https://www.52pojie.cn/thread-1496415-1-1.html)

---

*本帖最后由 xianyucoder 于 2021-8-19 08:57 编辑*

### 今日网站

aHR0cHM6Ly9wYXNzcG9ydC5nb2pveS5jb20vbG9naW4=

#### 反调试

这个站分析的是页面提交的参数加密逻辑，所以先打开开发者工具抓包

打开抓包，会提示进入 debugger

![](http://tc.xianyucoder.cn/blog20210803111752.png)

绕过这个 debugger 得方法比较多，右键设置 Never Pause Here 就行了

![](http://tc.xianyucoder.cn/blog20210803111954.png)

设置完就像下面这样

![](http://tc.xianyucoder.cn/blog20210803112011.png)

然后点击右边的蓝色箭头就可以了

#### 加密定位

通过 debugger 之后输入手机和密码提交，可以在`Network`下看到如下的请求

![](http://tc.xianyucoder.cn/blog20210803112238.png)

虽然提交的是`Form Data`但是没有关键词，搜索是没办法搜索了，用`xhr`和分析调用栈的法子都可以定位。

点开`Initiator`

![](http://tc.xianyucoder.cn/blog20210803112648.png)

从第一个进去之后打上断点，然后再提交一次数据

可以看到这里的`l`已经生成好了

![](http://tc.xianyucoder.cn/blog20210803112817.png)

所以继续向上一步的堆栈进行分析，分析直到下面这个位置

![](http://tc.xianyucoder.cn/blog20210803112942.png)

这里是我们提交参数的地方，不过这里的`t`里包含了需要提交的参数，所以在这里打上断点

![](http://tc.xianyucoder.cn/blog20210803113034.png)

放开断点，重新提交，会断在`post`这行上

这个时候，t 中是没有生成好的数据的，`s`则是页面上提交的数据

![](http://tc.xianyucoder.cn/blog20210803113354.png)

所以接下来才会生成加密，所以从这里一步步往下调试，大概的位置是单步调试之后再往下一步几次之后的位置

你会发现下面的逻辑

![](http://tc.xianyucoder.cn/blog20210803142126.png)

这里的`interceptors`我之前的文章讲过，很多 request 前的组包操作都悄咪咪的在这里面做的

所以在下面这个位置下断

![](http://tc.xianyucoder.cn/blog20210803142315.png)

![](http://tc.xianyucoder.cn/blog20210803142244.png)

然后直接下一步断在`750`这一行

我们看看运行的结果

![](http://tc.xianyucoder.cn/blog20210803142420.png)

所以加密的逻辑就在这个`Q`中

![](http://tc.xianyucoder.cn/blog20210803142537.png)

跟进来就是这个`s`函数

#### 加密分析

进入到`Q`函数当中，代码就比较难看了，所以先复制这个代码到本地，看看整体的结构

![](http://tc.xianyucoder.cn/blog20210803142803.png)

可以看到`s`是包在一个`!function(){}()`里面的，这是一个自执行的函数列表

所以我们需要单独把这一部分拿来运行

我们尝试在本地直接运行这段自执行的代码，但是提示错误

![](http://tc.xianyucoder.cn/blog20210803143047.png)

在代码里捕获了错误，但是具体为什么报错我们并不知道，所以直接去掉这个`try...catch`看看是哪里报错

再次运行提示`this.b`不是一个方法

![](http://tc.xianyucoder.cn/blog20210803143353.png)

所以需要进一步调试，发现在代码中调用的时候，传入`this.b`中的`a`是如下的一串的字符串

![](http://tc.xianyucoder.cn/blog20210803143639.png)

这个字符串格式是不是很熟悉，很明显这里的`this.b`是 window 中的`atob` ，所以需要在这里补齐`this.b`的逻辑，在某乎的文章里我已经给大家列举过了如何补齐，大家可以点下方回顾一下

<https://www.52pojie.cn/thread-1495847-1-1.html>

我们直接复制粘贴一下逻辑

将代码修改为

```
# this.abv = [this]["filter"]["constructor"]("return this")()[this.b](a || b >> d)
this.abv = xazxBase64.decode(a || b >> d)
```

![](http://tc.xianyucoder.cn/blog20210803144838.png)

再次运行，这里就不报错了，提示`domain`未定义

`domain`大家都知道是啥吧，在`document`下标识当前的站点的

![](http://tc.xianyucoder.cn/blog20210803150026.png)

直接拿了一个通用的环境头过来，运行一下

![](http://tc.xianyucoder.cn/blog20210803150441.png)

出结果了，但是好像有点小毛病，代码一直停住没有结束

我们继续分析，找到下面这个位置

![](http://tc.xianyucoder.cn/blog20210803150558.png)

这里使用了`setInterval`调用了`debugger`

> 在窗口和工作接口上提供的setInterval()方法重复调用函数或执行代码片段，每次调用之间有固定的时间延迟。

直接删掉这段代码，运行就正常了

![](http://tc.xianyucoder.cn/blog20210803151429.png)

补环境大法好啊~

通用环境头是什么样呢？

其实就是定义好了`window、document、location`这些环境的代码，比如`window = global`，`location.href = 'www.baidu.com'`

可以把上面的一坨代码看成一个黑盒子，我们运行代码可以获得提示，根据提示把黑盒子需要的环境补齐就可以了，至于黑盒子内部运行了什么内容，我们不需要关心。

现在就有人问我不会补环境，这样要怎么搞？

那我们回到刚刚 domain 的检测位置

![](http://tc.xianyucoder.cn/blog20210803151718.png)

找到报错的位置，可以看到这个代码逻辑是在一个大大的`for`循环表达式里的

伪代码如下

```
for(var i = 0, o = 18; i<【一坨代码】;i++){
        方法体
}
```

所以只能断点一步步调试了

![](http://tc.xianyucoder.cn/blog20210803152247.png)

![](http://tc.xianyucoder.cn/blog20210803152306.png)

有点恶心，这里还有`debugger`

![](http://tc.xianyucoder.cn/blog20210803152421.png)

直接删掉，继续调试

之后就一直提示`domain`未定义，现在要怎么补齐呢？

我在网页上调试发现这段代码的结果为一个固定值，如下

![](http://tc.xianyucoder.cn/blog20210803154635.png)

可是如果替换为固定的`18`，这个`for`循环就会变为下面这样

```
for(var i = 0, o = 18; i < 18; i++){
    方法体
}
```

这个方法体里面就是我们的检测，包含`debugger`还有`domain`

那我们为啥不直接跳过这段代码，里面的逻辑我们理清楚了也没有相关的加密逻辑全是检测

这里直接将循环的判断逻辑判断条件改为

```
for(var i = 0, o = 18; i < 0; i++){
    方法体
}
```

让代码直接跳过不就行了

照着我们上面的思路，修改一下，就可以看到结果的输出了

ps：记得将`setInterval`注释

![](http://tc.xianyucoder.cn/blog20210803160540.png)

好了，以上就是本次的全部内容了，我们下次再会~
