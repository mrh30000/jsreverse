# Uni-App逆向分析

> **作者**: .KK | **发布时间**: 2021-06-11 21:05:00 | **版块**: 『移动安全区』 | **查看/回复**: 16460 / 11
> **原文**: [https://www.52pojie.cn/thread-1457553-1-1.html](https://www.52pojie.cn/thread-1457553-1-1.html)

---

*本帖最后由 .KK 于 2021-6-12 11:37 编辑*

### Uni-App逆向分析

一般App数据加密分为Java层跟So层，但对于H5App来讲的话，它是界面里嵌入一个WebView，在WebView里显示网页，在网页里面用JS加密，在通过Java和JS交互，用Java提交数据或者直接用网页提交数据两种方式

#### 判断App是否为H5App

可以利用uiautomatorviewer.bat 来查看界面信息

![](https://attach.52pojie.cn/forum/202106/11/203137tlc5534idddkkkc5.png)

#### JS代码存放位置

大多数H5App的JS文件都存放在assets目录，少部分会存在res目录，存放在这两个地方获取比较方便，放在别的地方比如classes.dex的话获取比较麻烦，并且对classes.dex还要做一个处理

还有一个点就是JS文件是可以加密的，只要在加载到WebView之前进行一个解密就行

#### WebView相关的几个关键词

```
setWebContentsDebuggingEnabled        // 是否允许调试
// shouldInterceptRequest、WebResourceResponse
public WebResourceResponse shouldInterceptRequest(WebView p0,String p1)        // 拦截器 jadx会反编译不出来建议用jeb或者gda 里面可以对js文件做一些处理
WebResourceResponse shouldInterceptRequest(WebView webView, WebResourceRequest webResourceRequest)
WebResourceResponse shouldInterceptRequest(WebView webView, String str)
```

#### 远程调试 WebView

远程调试需要满足三个条件:

1. **Chrome WebView** 版本要大于手机端 **WebView** 版本 (chrome更新到最新版就能解决)
2. **inspect** 打开空白 则需要下载离线包
3. 如果连 **WebView** 下的一些信息都没显示出来则代表你没有调试权限 `setWebContentsDebuggingEnabled` 这个的值必须为`true`才有调试权限,App发布一般都会把这个值设置成假不让你调试,直接Hook掉就行

![](https://attach.52pojie.cn/forum/202106/11/203142toa27zgu3qloq3o2.png)

`setWebContentsDebuggingEnabled` 三个检测点:

![](https://attach.52pojie.cn/forum/202106/11/203139k82mpix08ot0ooi8.png)

1. chrome 浏览器调试 地址 **chrome://inspect**
2. **Devices**下两个选项都勾选上
3. 浏览器版本 > 手机端 **WebView** 版本
4. 点击 **WebView** 下方的 **inspect** 开始调试

PS: 由于手机端 **WebView** 版本不一致,所以第一次运行需要从谷歌站点下载一系列的离线包,否者打开 **DevTools** 就是空白界面 (科学上网会自动下载)

[Android远程调试WebView的方法](https://zhuanlan.zhihu.com/p/95740830)

[Android 设备WebView远程调试](https://blog.csdn.net/dong123dddd/article/details/70217248)

#### 逆向分析

##### 1. **Network** 能抓到数据(网页发包)

**inspect** 开始调试 , 切换到 **Network** 选项卡抓取数据 如果有抓取到数据也为网页发包 否则就是Java层发包 这个app是网页发包的

![](https://attach.52pojie.cn/forum/202106/11/203145rdgy55dry6drfdr0.png)

抓到的数据包 函数调用栈 接下来就是Js逆向分析 断点调试一顿分析就完事了

```
// 提交的数据
appid=quickdogrestful&mobile=139xxxxxxxx&password=a12345678&device_id=863254033385807%2C863254033385815&device_info=MI%206%20Xiaomi&app_version=1.0.3.4&nonce=a×tamp=1623410323.775&sign=573080b9042317ee8b30ab6411c9b56e
```

![](https://attach.52pojie.cn/forum/202106/11/203147hb6zruxb66664bfx.png)

![](https://attach.52pojie.cn/forum/202106/11/203149usosw5vob4w7spos.png)

##### 2. **Network** 无法抓到数据(不是网页发包)

这种大概率就是JS加密 然后Java发包的 就只能找参数静态分析了

```
// 抓包数据
POST //api/user/login.do HTTP/1.1
user-agent: Mozilla/5.0 (Linux; Android 9; MI 6 Build/PKQ1.190118.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/74.0.3729.136 Mobile Safari/537.36 uni-app Html5Plus/1.0 (Immersed/24.0)
Content-Type: application/x-www-form-urlencoded; charset=utf-8
Content-Length: 138
Host: app168.zhongjianlepai.com
Connection: Keep-Alive
Accept-Encoding: gzip
Cookie: aliyungf_tc=b05125519e32b58949efe39018fbd902f0c0c052f4429ff19bd0ba4172416ff6; JSESSIONID=A8B840C693E48003233EE93EED504656; eiis-sessionid=3f17f8ce-4735-4670-ad2f-6036da767e52

phoneNum=139xxxxxxxx&pwd=a12345678&isTakecookie=false&appVersion=1.2.2×tamps=1623410775656&signature=21549323b5116195020eee9808de314b
```

解压App一顿分析 **app-services.js**  定位关键函数

![](https://attach.52pojie.cn/forum/202106/11/203151avvz0vzqgzyo9wo0.png)

![](https://attach.52pojie.cn/forum/202106/11/203153wnq101iqpoxppzxl.png)

修改为下面代码保存Js文件 然后覆盖进apk文件里 功能->APK签名->安装 再抓包

跟之前的URL对比 就可以查看我们提交的参数

```
r.login = function(t, e, s) {
 t["appVersion"] = a.default.APP_VERSION,
 i.default.request("/api/user/login.do?"+ JSON.stringify(t) + JSON.stringify(e) + JSON.stringify(s) , "POST", t, e, s)}
```

![](https://attach.52pojie.cn/forum/202106/11/203155oydwoxjjlgrooh0z.png)

![](https://attach.52pojie.cn/forum/202106/11/203200z0xswdd0d60c9d5k.png)

![](https://attach.52pojie.cn/forum/202106/11/203202iifgwpx6ejbqh8jp.png)

```
POST //api/user/login.do?{%22phoneNum%22:%22139xxxxxxxx%22,%22pwd%22:%22a12345678%22,%22isTakecookie%22:false,%22showLoading%22:true,%22loaddingText%22:%22%E7%99%BB%E9%99%86%E4%B8%AD...%22,%22appVersion%22:%221.2.2%22}undefinedundefined HTTP/1.1

t  = {"phoneNum":"139xxxxxxxx","pwd":"a12345678","isTakecookie":false,"showLoading":true,"loaddingText":"登陆中...","appVersion":"1.2.2"}

e,s = undefined
```

这串数据提交还没有包含 `signature`  那就继续查找下一个关键点 全局搜索`signature` 查找关键函数 最后抓包对比

```
// 传进去的参数
{"phoneNum":"139xxxxxxxx","pwd":"a12345678","isTakecookie":false,"showLoading":true,"loaddingText":"登陆中...","appVersion":"1.2.2"}

// 经过排序加salt 放入n.default(i)处理MD5
appKey=syc0049ec3d91b9028&appVersion=1.2.2&phoneNum=139xxxxxxxx&pwd=a12345678×tamps=1623410775656&key=2e4dea7ba1dc4d1991cbcdd7756e548e

MD5：21549323b5116195020eee9808de314b

// 上面的抓包数据做对比
phoneNum=139xxxxxxxx&pwd=a12345678&isTakecookie=false&appVersion=1.2.2×tamps=1623410775656&signature=21549323b5116195020eee9808de314b
```

![](https://attach.52pojie.cn/forum/202106/11/203204loai58h5a50h8ag0.png)

![](https://attach.52pojie.cn/forum/202106/11/203210wzyu00px07ofgibe.png)

##### uni-app 核心请求

关键词 uni.request

![](https://attach.52pojie.cn/forum/202106/11/203212iq90xiu7ayn29jim.png)

最后总结一下: **Network** 能抓包的话可以动态调式  分析起来方便一点 不然的话就只能 静态分析 + 猜测  修改H5代码 签名App抓包来分析

第一次发帖 记录一下自己的学习过程，有不对的地方还请大佬指正
