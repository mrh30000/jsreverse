# 彻底解决前端无限debugger

> **作者**: 0xsdeo | **发布时间**: 2025-08-27 00:17:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 9994 / 147
> **原文**: [https://www.52pojie.cn/thread-2056072-1-1.html](https://www.52pojie.cn/thread-2056072-1-1.html)

---

*本帖最后由 0xsdeo 于 2025-8-27 00:31 编辑*

### 0x00 前言

在很久之前我发过一篇JS逆向系列14-Bypass Debugger，但是这篇文章写的还是不太全，我决定在本篇文章中一次性将所有可能遇到的情况都写出来，具体请看下文。

注：本文不涉及修改chrome内核绕过debugger。

### 0x01 正文

实现前端无限debugger的三种核心方式为：

```
1. eval
2. Function
3. Function.prototype.constructor
```

当然除了上面这三种方法外，也有别的方法可以实现，例如下面这种定时器：

![](https://attach.52pojie.cn/forum/202508/27/001155opocmz6z54mpgmhp.png)

图上的代码使用了setTimeout定时每0.05秒调用一次debuggerProtection方法，方法内部有个debugger，通过这种方式就能引起无限debugger。

这种显式的将debugger写到前端代码里用来实现无限debugger的方法我称之为**显式无限debugger**，这种是可以直接绕过的。我提供了三种解决方案供大家参考：

1. 条件断点
2. 替换
3. hook

前两个我都在之前的文章中讲过，现在我将那些内容搬到这篇文章中重新讲一遍。首先讲一下如何实现条件断点：右键执行debugger的那行代码的左侧，点击添加`条件断点`：

![](https://attach.52pojie.cn/forum/202508/27/001212i2e2r8rje126qwzq.png)

条件设置为false：

![](https://attach.52pojie.cn/forum/202508/27/001223cjjbn9jbbbm92nhg.png)

![](https://attach.52pojie.cn/forum/202508/27/001234vt2ja0odzkxcibda.png)

现在这个debugger就不会生效了，但是这东西只能生效一次，意思就是你刷新网站之后这个条件断点就没了，所以这时候就可以考虑使用替换或者hook的方式进行绕过，下面我继续讲一下该如何进行替换。

F12打开devtools后，点击源代码，左上方有一些板块：

![](https://attach.52pojie.cn/forum/202508/27/001244r6tqtopopgygtat0.png)

展开点击替换：

![](https://attach.52pojie.cn/forum/202508/27/001256lypldq14rvtyr4ty.png)

![](https://attach.52pojie.cn/forum/202508/27/001306pqvxtk29h1h5p5h6.png)

点击上面的`选择放置替换项的文件夹`，选择一个存放替换后的js文件的文件夹，并点击允许：

![](https://attach.52pojie.cn/forum/202508/27/001316seyekn17ykkn9kk9.png)

![](https://attach.52pojie.cn/forum/202508/27/001325s0zr7eirs8er70ey.png)

此时回到js中，找到执行debugger的位置：

![](https://attach.52pojie.cn/forum/202508/27/001341w59vg24k25q5g8ff.png)

![](https://attach.52pojie.cn/forum/202508/27/001351sqrzdivyvv34iqq6.png)

右键点击替换内容：

![](https://attach.52pojie.cn/forum/202508/27/001402bi18v3ri1pttzzvq.png)

此时删去debugger：

![](https://attach.52pojie.cn/forum/202508/27/001412g1nrnfdl5482f1lx.png)

然后再ctrl+s保存即可：

![](https://attach.52pojie.cn/forum/202508/27/001422zq5y5n534ahl5qg8.png)

文件名左边没有\*号就代表已经保存成功了，此时刷新就会加载我们替换过的JS：

![](https://attach.52pojie.cn/forum/202508/27/001435w7clbvtvtbmbl0be.png)

现在就不会再有debugger的干扰了。

这里我强调一下替换的两个注意事项：

1. `替换js后需要开着f12访问网站才会执行替换后的js，否则加载的还是原本服务端的js。`
2. 如果发现修改后网站依然没有我们想要的效果，此时可以在替换后的js打个断点，检验一下网站是否加载的是我们替换后的js。

针对第二点我可以举个例子，例如下面这种情况：

![](https://attach.52pojie.cn/forum/202508/27/001447pcpohj3zs5khhoh1.png)

可以看到目标网站的js文件名后都加了一个时间戳，这个时间戳是会影响到我们替换js的，例如我现在替换一下adb文件，删除该文件的debugger字段并重新进入网站：

![](https://attach.52pojie.cn/forum/202508/27/001458lkr9xdg75hdg1425.png)

可见网站并没有加载我们替换的js，依然弹出了debugger，原因很简单，就是因为网站导入js时往文件名后面加了个时间戳：

![](https://attach.52pojie.cn/forum/202508/27/001508jdnyum7uzq7nfxvv.png)

这就导致替换的js与刷新网站后加载的js文件名不一致，导致替换不成功。解决这种问题很简单，那就是删除`new Date().getTime()`：

![](https://attach.52pojie.cn/forum/202508/27/001519gv5ml55nppn7qqzd.png)

现在加载的js就不会带时间戳：

![](https://attach.52pojie.cn/forum/202508/27/001531cgf5g6apguea6pgn.png)

替换的时候就没问题了：

![](https://attach.52pojie.cn/forum/202508/27/001541hqnmkonqqm2qsbml.png)

成功加载了我们替换后的js。

我在上面还提供了一个方案，那就是hook，首先hook肯定能解决使用setTimeout引起无限debugger的问题，但是我这里就不提供相关hook脚本了，主要是因为我对hook setTimeout不太放心，有些开发者可能会利用此类方法去实现动画渲染或者其他用处，所以我担心hook此类方法后会造成不必要的异常，并且解决此类无限debugger也很简单，所以我在这里也就不提供相关代码了。

讲完使用定时器引起无限debugger的解决方案后，现在我就来讲讲如何绕过我文章中最开始所说的那三种引起无限debugger的核心方式(目前市面上的主流方式)，首先可以直接使用我的插件----AntiDebug\_Breaker：

![](https://attach.52pojie.cn/forum/202508/27/001552rptn4t8nmf0zptpy.png)

github地址：`https://github.com/0xsdeo/AntiDebug_Breaker`，该脚本可以绕过大部分存在无限debugger的网站，但是在某些网站可能会出现异常，例如下面这种情况：

![](https://attach.52pojie.cn/forum/202508/27/001602gwzzn99wzpsvfrrc.png)

像这种出现一大堆异常的只有一种原因，那就是因为**eval的作用域问题**，如有兴趣的读者朋友们可以去看一下我这篇文章：JS逆向系列15-深入探究Hook eval后存在的作用域问题，首先我先说明一下，这个问题**无解**，如果有人能解出，那么从代码层面上就能彻底解决无限debugger的问题了，但至少从我目前的视角来看，这种语法限制的问题绝对是解决不了的，至少我解决不了，所以如果遇到这种情况可以先开启下面这个设置：

![](https://attach.52pojie.cn/forum/202508/27/001613ndtufvuk8bby1kn3.png)

![](https://attach.52pojie.cn/forum/202508/27/001623jshmdz7xmxmxe4ps.png)

开启这个设置后就能彻底忽略掉由eval引起的无限debugger(注：**此时必须将插件开启的绕过无限debugger的脚本关闭**)，并且经实测，该选项也可忽略由Function实例的代码：

![](https://attach.52pojie.cn/forum/202508/27/001641rbo66jga2d6gusr2.png)

没有引起任何debugger，所以开启这个选项即可绕过我上述所说的那三种核心方式引起的无限debugger。

其实我这一年来一直都在致力于实现无感绕过无限debugger，之所以这样做是因为我在上文并没有提到的一个原因，那就是有些在vm中的代码也很重要，如果直接忽略掉来自eval和Function的匿名脚本，可能会影响到我们正常逆向，所以如果我们遇到了eval的作用域问题，不一定非要开启上面那个设置，也可以考虑使用下面这段备用脚本：

![](https://attach.52pojie.cn/forum/202508/27/001652nbf9i4mzmkhddzim.png)

github地址：`https://github.com/0xsdeo/Hook_JS/blob/main/hook_debugger/Bypass_Debugger/Bypass_Debugger(%E5%A4%87%E7%94%A8).js`，这段脚本只hook了Function和Function.prototype.constructor，没有hook eval，也就是说如果目标网站是由eval引起的无限debugger就没办法了，但是这样能过滤掉由Function和constructor引起的无限debugger，所以需要读者朋友们自行判断。

### 0x02 总结

| 类型 | 特征 | 解决方案 |
| --- | --- | --- |
| 显式无限debugger | 将debugger写死到代码中 | 1. 条件断点<br>2. 替换<br>3. hook |
| 虚拟机无限debugger<br>（eval/Function/<br>Function.prototype.constructor） | debugger在vm虚拟机中 | 1. 使用AntiDebug\_Breaker插件或在油猴中注入Bypass\_Debugger脚本<br>2. 如果发现报异常就开启chrome设置里的**来自eval或控制台的匿名脚本**或使用**Bypass\_Debugger(备用)**。前者可以直接绕过，但是看不到eval和Function实例的脚本；后者不能绕过由eval引起的debugger。 |

本文所涉及到的所有插件或脚本的github地址：

AntiDebug\_Breaker：`https://github.com/0xsdeo/AntiDebug_Breaker`
Bypass\_Debugger：`https://github.com/0xsdeo/Bypass_Debugger/blob/main/Bypass_Debugger.js`
Bypass\_Debugger(备用)：`https://github.com/0xsdeo/Bypass_Debugger/blob/main/Bypass_Debugger(%E5%A4%87%E7%94%A8).js`