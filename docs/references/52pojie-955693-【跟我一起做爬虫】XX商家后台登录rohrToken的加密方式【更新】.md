# 【跟我一起做爬虫】XX商家后台登录rohrToken的加密方式【更新】

> **作者**: 帝都小爬虫 | **发布时间**: 2019-05-14 14:00:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 15715 / 39
> **原文**: [https://www.52pojie.cn/thread-955693-1-1.html](https://www.52pojie.cn/thread-955693-1-1.html)

---

*本帖最后由 帝都小爬虫 于 2021-2-11 03:05 编辑*

上周五临近下班，本想美滋滋的回家愉快的看电视、撸串，同事跟我说以前负责爬虫的同事的一个功能挂了，想着一起解决一下，没想到跌进一个坑中。

直奔主题，本来以为是之前同事的代码是不是因为网站后台登录改版，换了地址而已，用Fiddler抓包后对比以前的爬虫登录，发现提交的登录参数明显数量差了好几个，现在的Form里面明显多了一个RohrToken

![](https://attach.52pojie.cn/forum/201905/14/135927ebz7jrojl9ydrk7r.png)

心想，有什么难度啊，估计可能就藏在那个页面里

5分钟后，坐在办公室和同事点了根烟，思考究竟是哪里出了问题

简单总结一下页面

![](https://attach.52pojie.cn/forum/201905/14/135852aqicqczc8dqzyso2.png)

初步发现页面的内容都是经过JS渲染上去的，所以但从Chrome的开发人员看不出太多内容来，但是这时候就差不多知道这个站点一定用到了大量的JS
点开筛选器，只显示JS，搜索"登录"这个词

![](https://attach.52pojie.cn/forum/201905/14/135827egz2s3cg3a92a57c.png)

仔细观察了一遍，发现没有什么有用的信息，不过也间接的多学习了JS的技术。
打开调试，点击登录按钮，发现根据JS动态生成了一个弹窗，新加载了一些js和css，从这里入手看一下。

![](https://attach.52pojie.cn/forum/201905/14/135808cee8588l8821jbw8.png)

这么多东西我们无法一个接着一个看，所以，根据抓包的内容中，rohrtoken进行搜索。

![](https://attach.52pojie.cn/forum/201905/14/135747zzqt5y5quuu5uoc2.png)

发现有两个JS还有一个html涉嫌跟这个rohr有关系，逐一排查一下。
先将html的代码复制出来，用bejson的js/html格式化功能进行格式化，放到sublime中方便我们查看。
在sublime中搜索rohr关键字，得到结果

![](https://attach.52pojie.cn/forum/201905/14/135606zvi1v020ca6cgc4l.png)

继续看另外两个
Rohr.js里有不少代码操作了Rohr

![](https://attach.52pojie.cn/forum/201905/14/135654rqllqjq0wverqarq.png)

![](https://attach.52pojie.cn/forum/201905/14/135708fa5xrqii8csrqqcc.png)

大概找到了入手点，开发人员工具中点开Sources，进行调试。
发现这里面操作了ip这个对象，我们在var iP处加上断点，刷新页面后发现此处在页面加载时被执行过。逐步分析，在iP.reload处加上断点,刷新页面，点击登录按钮，随意输入账号密码点击登录。

![](https://attach.52pojie.cn/forum/201905/14/135628bs049sh459d5h9gh.png)

Emmmm ，是不是觉得胜利就在眼前了呢，我当时也是这么想的。
根据惯例，我们发现jv的值其实是基本固定的，取出备用。
那么我们可以直接调用这个ip.reload函数么，因为返回的jw就是我们想要的值，其实是可以的，下面我们单独写一个html页面，将下列我们在html页面中发现的内容粘贴到我们的html中。

然后调用Rohr\_Opt.reload()这个函数。
为什么要调用Rohr\_Opt.reload,因为我们在前面的途中发现了ip被赋给了Rohr\_Opt，因为我们定义Rohr\_Opt为Object,并且在js中有如下判断

[JavaScript] *纯文本查看*

```
if (typeof (Rohr_Opt) === _$_543c[2]) {
                    iP.bindUserTrackEvent();
                    Rohr_Opt.reload = iP.reload;
                    Rohr_Opt.sign = iP.sign;
                    Rohr_Opt.clean = iP.decrypt
                })
```

简单检查下代码，执行我们自己的html，如果没什么问题的话，你会显示出来一段Token，但是这个Token其实是有问题的，我们放到下面说。

这时候我们可以用PostMan测试一下我们的Token，不出意外的话应该会显示如下的响应。

![](https://attach.52pojie.cn/forum/201905/14/135547kkptybjbn6hj6ffu.png)

到这里我们要开始反思，究竟是哪里不对。
现在根据我们的计算jw = iI(iP)这个方法的参数iP来对照正常提交的参数。
这是我通过浏览器正常操作的iP

![](https://attach.52pojie.cn/forum/201905/14/135527m9aaazpqxgxpqprf.png)

下图为我们自己html的iP

![](https://attach.52pojie.cn/forum/201905/14/135514xitifii3iq8kh5v5.png)

可以发现，我们与正常操作的变量多少有一些区别，缺少aT、kT、mT，另外bI也与正常的不同，我们看一下bI的代码是怎么加载的。
bI是通过iL()函数来赋值的.

[JavaScript] *纯文本查看*

```
var iL = function() {
                    var jb = document.referrer;
                    var ja = window.location.href;
                    return [ja, jb]
                };
```

可以看到这个数组里的内容，但是我们知道document.referrer是只读属性，无法更改，那我们有什么办法来更改呢，试过了很多方法，最后觉得还是直接改js来的快一些。我们将整个rohr.js下载下来，直接赋值jb和ja的值。

[JavaScript] *纯文本查看*

```
var iL = function() {
                    var jb = "https://e.maoyan.com/user/login?next=%2F";
                    var ja = "https://epassport.meituan.com/account/unitivelogin?bg_source=6&service=movie&continue=https://e.maoyan.com/backend/account/user/entry/merchant";
                    return [ja, jb]
                };
```

更改下html代码，将js放到同等目录下。

[HTML] *纯文本查看*

```
<!DOCTYPE html>
<html>
 <head>
  <title>Rohr_Token计算</title>
  <script>
        window.Rohr_Opt = new Object;
        window.Rohr_Opt.Flag = {
                flag: 100043
        };
        window.Rohr_Opt.LogVal = "rohrdata";
</script>
  <script src="rohr.js">
</script>
  <script type="text/javascript">
        var data = 'https://epassport.meituan.com/api/account/login?loginContinue=https://e.maoyan.com/backend/account/user/entry/merchant&&only_auth=undefined';
        var n = void 0;
        n = window.Rohr_Opt.reload(data)
        onload = function() {
                divd = document.createElement("div");
                divd.id = 'Rohr_Token';
                divd.innerHTML = n;
                document.body.appendChild(divd);
        }
</script>
 </head>
 <body></body>
</html>
```

再次实验token的有效性，结果发现还是需要滑块验证。

那么，我们需要对另外三个参数进行研究。

这块具体怎么实施就不做赘述了。还是调试就行。

这三个参数其实就是对我们的键盘按键进行一个类似于特征分析的记录器。

这一部分可以自己手动写死或者随机写几组值进去。

再次实验，如果我们记错的话应该就是可以通过验证，返回成功了。

![](https://attach.52pojie.cn/forum/201905/14/135429xpdo9ps9jdop0wmw.png)

那么，我们就已经可以正确的得到rohrToken的取值方法了。

至于如何使用这个html，我的方案是使用phantomjs去加载页面执行js。

但是这里又遇到一个问题，用电脑的浏览器打开html页面取得token是可以通过验证的，但是phantomjs的还是需要滑块验证。由此，我分析应该在代码中有webdriver的检测，搜索js代码果然发现了几处地方有webdriver的检测，另外，还有phandomjs检测，就在我们最开始截图中，定义iP的地方有一个aM = ik方法，直接赋值空字符串就可以解决。

另外，我也使用chrome headless模式去试过这个网站，但是发现无法切换driver至登录窗口从而无法获得控件，如果有做过的小伙伴可以指点一下。

ps:小小的吐槽一下，没有草稿箱么。。。我好几次苹果鼠标误触返回手势然后这个帖子我写了4次。。。

-------------------------------------更新一波------------------------------------

如果在生产环境已经记得给webdriver开端口

针对phantomjs在CentOS环境下的部署不多做阐述，网上很多，但是有几点要注意的，在2.X版本的selenium中，生产环境一般会报错，因为有防火墙，所以注意指定端口。

但是在3.X版本的selenium里，报错不会提示你端口问题，而是提示你Can not connect ，所以大家还是要注意一下。

另外，我是用的Django做的接口获取登录后的cookie，但是必须需要做一个接口去响应我们之前写的html，也就是做一个跳转，再用phantomjs去请求这个接口加载页面。

因为我发现在Django里的views里直接用phantomjs去读取本地文件是不会触发渲染的，所以请务必切记这一点。
