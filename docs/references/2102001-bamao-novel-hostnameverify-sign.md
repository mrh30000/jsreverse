# 八猫付费小说逆向-hostnameVerify&sign

> **作者**: LiXieZengHui | **发布时间**: 当前离线 | **版块**: 『移动安全区』 | **查看/回复**: 10090 / 167
> **原文**: [https://www.52pojie.cn/thread-2102001-1-1.html](https://www.52pojie.cn/thread-2102001-1-1.html)

---

* 本帖最后由 LiXieZengHui 于 2026-4-16 16:45 编辑 *

文章中所有内容仅供学习交流使用，不用于其他任何目的，抓包内容、敏感网址、数据接口均已做脱敏处理。严正声明禁止用于商业和非法用途，否则由此产生的一切后果与作者本人无关。

## 抓包

使用真机抓包没有问题，但是使用网关模式或者流量转发到电脑无法正常抓包，表现如下⬇️

进入首页后开启流量转发并抓包，提示”网络异常，请稍后再试”，点击某本书后显示“获取章节失败”

![image](https://attach.52pojie.cn/forum/202604/08/224551khb1ti7r0c3r97cw.png)

![image](https://attach.52pojie.cn/forum/202604/08/224420huy9y219y99u9yff.png)

### java层定位

我们通过搜索“获取章节失败”，可以定位到

![image](https://attach.52pojie.cn/forum/202604/08/224423ql8g38qugq8jk483.png)

这里可以看到拼接了

```
errorCode
```

，我们的

```
errorCode
```

是

```
202208
```

，这里没有。。。

我们全局搜索

```
202208
```

![image](https://attach.52pojie.cn/forum/202604/08/224425amga24uuqdqjh4wq.png)

跳转过去并查看调用

![image](https://attach.52pojie.cn/forum/202604/08/224427icv74fixzatuaeah.png)

我们观察第二处调用

![image](https://attach.52pojie.cn/forum/202604/08/224430faomf54rzjw85p4k.png)

我们直接hook这个a方法看看

![image](https://attach.52pojie.cn/forum/202604/08/224433fz9ptaufuz2ugf88.png)

有点意思，直接检测到了我们的抓包工具

```

```

y.a is called: th=javax.net.ssl.SSLPeerUnverifiedException: Hostname api-ks.wtzw.com not verified:
certificate: sha256/gHoFtvKJgYjc3SawgnV9S3n/wWvQvwY+RKCJPuyMNbA=
DN: ST=Delaware,CN=Proxyman CA,O=Proxyman LLC,L=Wilmington,C=US
subjectAltNames: [101.200.36.194, 101.200.36.194]

```

```

嗯哼，接下里啊我们有俩切入点，第一个自然就是打印出调用堆栈

第二个我们直接搜索

```
hostname
```

，这个值大概率是写死在Ap内部的，我们尝试搜索一下

![image](https://attach.52pojie.cn/forum/202604/08/224435b77rx7r88ir757fn.png)

我们定位到了返回白名单的位置，但是不怎么好修改。。。

我们还是老老实实看是谁调用了a吧

![image](https://attach.52pojie.cn/forum/202604/08/224437vif89stsmo98nmo7.png)

```

```

public /*bridge */ /* synthetic*/ void accept(Throwable throwable) throws Exception {
if (PatchProxy.proxy(new Object[]{throwable}, this, changeQuickRedirect, false, 55473, new Class[]{Object.class}, Void.TYPE).isSupported) {
return;
}
a(throwable);
}

```

```

hook了一下，看到接受的参数就是a函数接受的参数

然后看调用，一大堆，基本上每个网络请求都会做校验，挨个修改肯定不现实

我们在这上面做文章，看代码基本上就是校验通过直接return，校验失败就调用a抛出异常

看if的判断也是一个函数，我们直接hook这个函数试试

![image](https://attach.52pojie.cn/forum/202604/08/224438rxprrqrznpqpyp7x.png)

*

日志

```

```

[BND AL10::七猫免费小说 ]-> PatchProxy.proxy is called: objArr=>>>>> Dispatching to Handler (android.os.Handler) {2c0920d} com.qimao.qmad.util.RecommendInstallNoticeUtil$a@d592c81: 0, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=23, clsArr=class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@74d7126
PatchProxy.proxy is called: objArr=, obj=com.qimao.qmad.util.RecommendInstallNoticeUtil$a@d592c81, changeQuickRedirect=null, z=false, i=44906, clsArr=, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@dd6f167
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=80333, clsArr=, cls=boolean
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@ebc5b14
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=80336, clsArr=, cls=int
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@f6b0fbd
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=77005, clsArr=, cls=class en9
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@88f79b2
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=80894, clsArr=, cls=int
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@dd73d03
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=80909, clsArr=, cls=class com.qimao.qmad.qmsdk.model.AdInit
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@c8e1480
PatchProxy.proxy is called: objArr=com.qimao.qmad.util.RecommendInstallNoticeUtil$a$a@dbdeab9, obj=null, changeQuickRedirect=null, z=true, i=80330, clsArr=interface bx3, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@b777efe
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=80173, clsArr=, cls=boolean
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@106a65f
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=79988, clsArr=, cls=class ar7
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@2fff8ac
PatchProxy.proxy is called: objArr=bc8$a@5c97975, obj=ar7@f488d0a, changeQuickRedirect=null, z=false, i=79993, clsArr=interface di4, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@c99497b
PatchProxy.proxy is called: objArr=bc8$a@5c97975, obj=ar7$b@1c9f398, changeQuickRedirect=null, z=false, i=79985, clsArr=interface di4, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@ac537f1
PatchProxy.proxy is called: objArr=ar7$b@1c9f398, obj=y65@26a6fd6, changeQuickRedirect=null, z=false, i=80032, clsArr=interface di4, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@ae90257
PatchProxy.proxy is called: objArr=y65$a@a36b144, obj=com.qimao.ad.inhousesdk.download.AppDownloadManagerImpl@1e4622d, changeQuickRedirect=null, z=false, i=85762, clsArr=interface com.qimao.ad.inhousesdk.ads.KMGetAppCallback, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@ff5b362
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=85802, clsArr=, cls=class com.qimao.ad.inhousesdk.download.QMDownloadManagerProxy
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@8116cf3
PatchProxy.proxy is called: objArr=1,com.qimao.ad.inhousesdk.download.AppDownloadManagerImpl$5@58f9db0, obj=com.qimao.ad.inhousesdk.download.QMDownloadManagerProxy@651f429, changeQuickRedirect=null, z=false, i=85809, clsArr=int,interface u81, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@9ffa3ae
PatchProxy.proxy is called: objArr=<<<<< Finished to Handler (android.os.Handler) {2c0920d} com.qimao.qmad.util.RecommendInstallNoticeUtil$a@d592c81, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=23, clsArr=class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@648e4dc
PatchProxy.proxy is called: objArr=<<<<< Finished to Handler (android.os.Handler) {2c0920d} com.qimao.qmad.util.RecommendInstallNoticeUtil$a@d592c81,8904186,8904262,72,8903842,4655,616, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=24, clsArr=class java.lang.String,long,long,long,long,long,long, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@eca9e5
PatchProxy.proxy is called: objArr=>>>>> Dispatching to Handler (android.os.Handler) {6f0d350} com.qq.e.comm.plugin.ch$b@4cc8949: 0, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=23, clsArr=class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@ca64cba
PatchProxy.proxy is called: objArr=<<<<< Finished to Handler (android.os.Handler) {6f0d350} com.qq.e.comm.plugin.ch$b@4cc8949, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=23, clsArr=class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@b876b
PatchProxy.proxy is called: objArr=<<<<< Finished to Handler (android.os.Handler) {6f0d350} com.qq.e.comm.plugin.ch$b@4cc8949,8904274,8904277,3,8904262,4763,617, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=24, clsArr=class java.lang.String,long,long,long,long,long,long, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@fed72c8
PatchProxy.proxy is called: objArr=>>>>> Dispatching to Handler (android.os.Handler) {5e8691c} ks7$g$b@fc2ff61: 0, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=23, clsArr=class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@5dc7a86
PatchProxy.proxy is called: objArr=[], obj=com.qimao.ad.inhousesdk.download.AppDownloadManagerImpl$5@58f9db0, changeQuickRedirect=null, z=false, i=85715, clsArr=interface java.util.List, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@5d92f47
PatchProxy.proxy is called: objArr=[], obj=y65$a@a36b144, changeQuickRedirect=null, z=false, i=80024, clsArr=interface java.util.List, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@1caf374
PatchProxy.proxy is called: objArr=[], obj=ar7$b@1c9f398, changeQuickRedirect=null, z=false, i=79986, clsArr=interface java.util.List, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@94f309d
PatchProxy.proxy is called: objArr=[], obj=ar7$b@1c9f398, changeQuickRedirect=null, z=false, i=79987, clsArr=interface java.util.List, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@df5b912
PatchProxy.proxy is called: objArr=[], obj=bc8$a@5c97975, changeQuickRedirect=null, z=false, i=80329, clsArr=interface java.util.List, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@5ef78e3
PatchProxy.proxy is called: objArr=[], obj=null, changeQuickRedirect=null, z=true, i=80332, clsArr=interface java.util.List, cls=class bo
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@5dd2e0
PatchProxy.proxy is called: objArr=, obj=com.qimao.qmad.util.RecommendInstallNoticeUtil$a$a@dbdeab9, changeQuickRedirect=null, z=false, i=44905, clsArr=class bo, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@7733999
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=44914, clsArr=class bo, cls=boolean
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@cf2545e
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=44918, clsArr=, cls=class android.app.Activity
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@796c03f
PatchProxy.proxy is called: objArr=, obj=p5@97d3d0c, changeQuickRedirect=null, z=false, i=44218, clsArr=, cls=class android.app.Activity
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@634d655
PatchProxy.proxy is called: objArr=0, obj=p5@97d3d0c, changeQuickRedirect=null, z=false, i=44219, clsArr=int, cls=class android.app.Activity
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@88b586a
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=48860, clsArr=, cls=interface mi4
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@441215b
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=48860, clsArr=, cls=interface mi4
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@f471df8
PatchProxy.proxy is called: objArr=, obj=h64@23982d1, changeQuickRedirect=null, z=false, i=1475, clsArr=, cls=int
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@6fe9136
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=72855, clsArr=, cls=class com.qimao.qmsdk.app.AppManager
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@667837
PatchProxy.proxy is called: objArr=class com.kmxs.reader.home.ui.HomeActivity, obj=com.qimao.qmsdk.app.AppManager@5cc21a4, changeQuickRedirect=null, z=false, i=72872, clsArr=class java.lang.Class, cls=boolean
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@3027b0d
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=72855, clsArr=, cls=class com.qimao.qmsdk.app.AppManager
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@29a8ac2
PatchProxy.proxy is called: objArr=class com.kmxs.reader.home.ui.HomeActivity, obj=com.qimao.qmsdk.app.AppManager@5cc21a4, changeQuickRedirect=null, z=false, i=72860, clsArr=class java.lang.Class, cls=class android.app.Activity
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@62060d3
PatchProxy.proxy is called: objArr=, obj=com.kmxs.reader.home.ui.HomeActivity@1fb58bd, changeQuickRedirect=null, z=false, i=2394, clsArr=, cls=int
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@f7bb410
PatchProxy.proxy is called: objArr=, obj=com.kmxs.reader.home.ui.HomeActivity@1fb58bd, changeQuickRedirect=null, z=false, i=2432, clsArr=, cls=class com.kmxs.reader.home.viewmodel.HomeMainViewModel
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@ce8bb09
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=48860, clsArr=, cls=interface mi4
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@a0a910e
PatchProxy.proxy is called: objArr=, obj=h64@23982d1, changeQuickRedirect=null, z=false, i=1516, clsArr=, cls=boolean
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@d86372f
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=72855, clsArr=, cls=class com.qimao.qmsdk.app.AppManager
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@450013c
PatchProxy.proxy is called: objArr=class com.kmxs.reader.home.ui.HomeActivity, obj=com.qimao.qmsdk.app.AppManager@5cc21a4, changeQuickRedirect=null, z=false, i=72860, clsArr=class java.lang.Class, cls=class android.app.Activity
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@6d8fec5
PatchProxy.proxy is called: objArr=, obj=com.kmxs.reader.home.ui.HomeActivity@1fb58bd, changeQuickRedirect=null, z=false, i=2437, clsArr=, cls=boolean
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@962b01a
PatchProxy.proxy is called: objArr=, obj=com.kmxs.reader.home.view.HomePopupView@7501937, changeQuickRedirect=null, z=false, i=2573, clsArr=, cls=class ag7
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@ec9174b
PatchProxy.proxy is called: objArr=, obj=com.kmxs.reader.home.ui.HomeActivity@1fb58bd, changeQuickRedirect=null, z=false, i=73260, clsArr=, cls=class com.qimao.qmres.dialog.KMDialogHelper
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@fb9f528
PatchProxy.proxy is called: objArr=, obj=com.qimao.qmres.dialog.KMDialogHelper@fcfc241, changeQuickRedirect=null, z=false, i=70948, clsArr=, cls=boolean
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@7ebb3e6
PatchProxy.proxy is called: objArr=<<<<< Finished to Handler (android.os.Handler) {5e8691c} ks7$g$b@fc2ff61, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=23, clsArr=class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@a0fdd27
PatchProxy.proxy is called: objArr=<<<<< Finished to Handler (android.os.Handler) {5e8691c} ks7$g$b@fc2ff61,8904288,8904364,69,8904277,4776,618, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=24, clsArr=class java.lang.String,long,long,long,long,long,long, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@14d3bd4
PatchProxy.proxy is called: objArr=>>>>> Dispatching to Handler (android.os.Handler) {6f0d350} com.qq.e.comm.plugin.ch$b@4cc8949: 0, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=23, clsArr=class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@15417d
PatchProxy.proxy is called: objArr=<<<<< Finished to Handler (android.os.Handler) {6f0d350} com.qq.e.comm.plugin.ch$b@4cc8949, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=23, clsArr=class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@6af2872
PatchProxy.proxy is called: objArr=<<<<< Finished to Handler (android.os.Handler) {6f0d350} com.qq.e.comm.plugin.ch$b@4cc8949,8904375,8904377,3,8904364,4855,619, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=24, clsArr=class java.lang.String,long,long,long,long,long,long, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@11324c3
PatchProxy.proxy is called: objArr=, obj=jz9$c@c2c4140, changeQuickRedirect=null, z=false, i=22, clsArr=, cls=boolean
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@2397879
PatchProxy.proxy is called: objArr=>>>>> Dispatching to Handler (android.os.Handler) {d330e39} com.kmxs.reader.home.ui.HomeActivity$b@134316c: 0, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=23, clsArr=class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@fd02335
PatchProxy.proxy is called: objArr=, obj=com.kmxs.reader.home.ui.HomeActivity$b@134316c, changeQuickRedirect=null, z=false, i=2452, clsArr=, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@fe8f858
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=175, clsArr=, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@a214204
PatchProxy.proxy is called: objArr=nf5$a@55e83ed, obj=dib@8f6c4b3, changeQuickRedirect=null, z=false, i=73915, clsArr=interface java.lang.Runnable, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@6727a70
PatchProxy.proxy is called: objArr=, obj=nf5$a@55e83ed, changeQuickRedirect=null, z=false, i=166, clsArr=, cls=void
PatchProxy.proxy is called: objArr=, obj=q32$a@145e17, changeQuickRedirect=null, z=false, i=118, clsArr=, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@2ac71e9
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=94034, clsArr=, cls=long
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@8ef90f
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@157ae6e
PatchProxy.proxy is called: objArr=<<<<< Finished to Handler (android.os.Handler) {d330e39} com.kmxs.reader.home.ui.HomeActivity$b@134316c, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=23, clsArr=class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@d5ccd9c
PatchProxy.proxy is called: objArr=, obj=com.qimao.qmapp.monitor.time.QMSignpostEntity@754437a, changeQuickRedirect=null, z=false, i=165, clsArr=, cls=class java.lang.String
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@5cc172b
PatchProxy.proxy is called: objArr=1775318821302,0.093,0.35799998, obj=q32@9b77521, changeQuickRedirect=null, z=false, i=112, clsArr=long,float,float, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@1531d46
PatchProxy.proxy is called: objArr=LaunchTimeMonitor,过滤掉的数据：key = app_task_time_shumei_use value = {"cost":0,"endTime":1775318813583,"startTime":1775318813583}, obj=null, changeQuickRedirect=null, z=true, i=73945, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@d72fb07
PatchProxy.proxy is called: objArr=LaunchTimeMonitor,上报的数据：{traceinfo={"app_home_inflate":{"cost":727,"endTime":1775318811467,"startTime":1775318810740},"app_task_time_ad_use":{"cost":1368,"endTime":1775318810384,"startTime":1775318809016},"app_application_create":{"cost":839,"endTime":1775318809188,"startTime":1775318808349},"app_loading_transactionFlow":{"cost":1241,"endTime":1775318810649,"startTime":1775318809408},"app_task_time_statistics_use":{"cost":129,"endTime":1775318809014,"startTime":1775318808885},"app_task_time_all_use":{"cost":638,"endTime":1775318809164,"startTime":1775318808526},"app_task_time_uemng_use":{"cost":29,"endTime":1775318809088,"startTime":1775318809059},"app_task_time_security_use":{"cost":8,"endTime":1775318808557,"startTime":1775318808549},"app_home_activity_create":{"cost":256,"endTime":1775318810996,"startTime":1775318810740},"launch_time":{"cost":4010,"endTime":1775318812359,"startTime":1775318808349},"app_task_time_qmlog_use":{"cost":12,"endTime":1775318808569,"startTime":1775318808557},"app_task_time_fresco_use":{"cost":145,"endTime":1775318808771,"startTime":1775318808626},"app_home_resume_ad_show":{"cost":1312,"endTime":1775318812359,"startTime":1775318811047},"app_start_mainactivity":{"cost":165,"endTime":1775318810740,"startTime":1775318810575},"app_task_time_qmid_use":{"cost":204,"endTime":1775318808777,"startTime":1775318808573},"ad_cold_splash_request_time":{"cost":1992,"endTime":1775318812360,"startTime":1775318810368},"app_task_time_upgrade_use":{"cost":2,"endTime":1775318808573,"startTime":1775318808571},"app_task_time_bugly_use":{"cost":108,"endTime":1775318808885,"startTime":1775318808777}}}, obj=null, changeQuickRedirect=null, z=true, i=73945, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@db3434
PatchProxy.proxy is called: objArr=launch_time_#*use,{traceinfo={"app_home_inflate":{"cost":727,"endTime":1775318811467,"startTime":1775318810740},"app_task_time_ad_use":{"cost":1368,"endTime":1775318810384,"startTime":1775318809016},"app_application_create":{"cost":839,"endTime":1775318809188,"startTime":1775318808349},"app_loading_transactionFlow":{"cost":1241,"endTime":1775318810649,"startTime":1775318809408},"app_task_time_statistics_use":{"cost":129,"endTime":1775318809014,"startTime":1775318808885},"app_task_time_all_use":{"cost":638,"endTime":1775318809164,"startTime":1775318808526},"app_task_time_uemng_use":{"cost":29,"endTime":1775318809088,"startTime":1775318809059},"app_task_time_security_use":{"cost":8,"endTime":1775318808557,"startTime":1775318808549},"app_home_activity_create":{"cost":256,"endTime":1775318810996,"startTime":1775318810740},"launch_time":{"cost":4010,"endTime":1775318812359,"startTime":1775318808349},"app_task_time_qmlog_use":{"cost":12,"endTime":1775318808569,"startTime":1775318808557},"app_task_time_fresco_use":{"cost":145,"endTime":1775318808771,"startTime":1775318808626},"app_home_resume_ad_show":{"cost":1312,"endTime":1775318812359,"startTime":1775318811047},"app_start_mainactivity":{"cost":165,"endTime":1775318810740,"startTime":1775318810575},"app_task_time_qmid_use":{"cost":204,"endTime":1775318808777,"startTime":1775318808573},"ad_cold_splash_request_time":{"cost":1992,"endTime":1775318812360,"startTime":1775318810368},"app_task_time_upgrade_use":{"cost":2,"endTime":1775318808573,"startTime":1775318808571},"app_task_time_bugly_use":{"cost":108,"endTime":1775318808885,"startTime":1775318808777}}}, obj=null, changeQuickRedirect=null, z=true, i=4013, clsArr=class java.lang.String,class java.util.HashMap, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@b75425d
PatchProxy.proxy is called: objArr=<<<<< Finished to Handler (android.os.Handler) {d330e39} com.kmxs.reader.home.ui.HomeActivity$b@134316c,8905048,8905094,28,8904377,4868,620, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=24, clsArr=class java.lang.String,long,long,long,long,long,long, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@c13c7d2
PatchProxy.proxy is called: objArr=EventStatistic, obj=null, changeQuickRedirect=null, z=true, i=73943, clsArr=class java.lang.String, cls=interface km7
PatchProxy.proxy is called: objArr=, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=25, clsArr=, cls=class java.lang.String
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@9ba40a3
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@5115fa0
PatchProxy.proxy is called: objArr={traceinfo={"app_home_inflate":{"cost":727,"endTime":1775318811467,"startTime":1775318810740},"app_task_time_ad_use":{"cost":1368,"endTime":1775318810384,"startTime":1775318809016},"app_application_create":{"cost":839,"endTime":1775318809188,"startTime":1775318808349},"app_loading_transactionFlow":{"cost":1241,"endTime":1775318810649,"startTime":1775318809408},"app_task_time_statistics_use":{"cost":129,"endTime":1775318809014,"startTime":1775318808885},"app_task_time_all_use":{"cost":638,"endTime":1775318809164,"startTime":1775318808526},"app_task_time_uemng_use":{"cost":29,"endTime":1775318809088,"startTime":1775318809059},"app_task_time_security_use":{"cost":8,"endTime":1775318808557,"startTime":1775318808549},"app_home_activity_create":{"cost":256,"endTime":1775318810996,"startTime":1775318810740},"launch_time":{"cost":4010,"endTime":1775318812359,"startTime":1775318808349},"app_task_time_qmlog_use":{"cost":12,"endTime":1775318808569,"startTime":1775318808557},"app_task_time_fresco_use":{"cost":145,"endTime":1775318808771,"startTime":1775318808626},"app_home_resume_ad_show":{"cost":1312,"endTime":1775318812359,"startTime":1775318811047},"app_start_mainactivity":{"cost":165,"endTime":1775318810740,"startTime":1775318810575},"app_task_time_qmid_use":{"cost":204,"endTime":1775318808777,"startTime":1775318808573},"ad_cold_splash_request_time":{"cost":1992,"endTime":1775318812360,"startTime":1775318810368},"app_task_time_upgrade_use":{"cost":2,"endTime":1775318808573,"startTime":1775318808571},"app_task_time_bugly_use":{"cost":108,"endTime":1775318808885,"startTime":1775318808777}}}, obj=null, changeQuickRedirect=null, z=true, i=4014, clsArr=interface java.util.Map, cls=class java.lang.String
PatchProxy.proxy is called: objArr=, obj=sq5@72afb83, changeQuickRedirect=null, z=false, i=26, clsArr=, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@948a759
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@ec28f1e
PatchProxy.proxy is called: objArr=, obj=jz9$c@c2c4140, changeQuickRedirect=null, z=false, i=22, clsArr=, cls=boolean
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@fa643ff
PatchProxy.proxy is called: objArr=com.kmxs.reader.app.MainApplication@b2371d1,launch_time*#*use,{traceinfo={"app_home_inflate":{"cost":727,"endTime":1775318811467,"startTime":1775318810740},"app_task_time_ad_use":{"cost":1368,"endTime":1775318810384,"startTime":1775318809016},"app_application_create":{"cost":839,"endTime":1775318809188,"startTime":1775318808349},"app_loading_transactionFlow":{"cost":1241,"endTime":1775318810649,"startTime":1775318809408},"app_task_time_statistics_use":{"cost":129,"endTime":1775318809014,"startTime":1775318808885},"app_task_time_all_use":{"cost":638,"endTime":1775318809164,"startTime":1775318808526},"app_task_time_uemng_use":{"cost":29,"endTime":1775318809088,"startTime":1775318809059},"app_task_time_security_use":{"cost":8,"endTime":1775318808557,"startTime":1775318808549},"app_home_activity_create":{"cost":256,"endTime":1775318810996,"startTime":1775318810740},"launch_time":{"cost":4010,"endTime":1775318812359,"startTime":1775318808349},"app_task_time_qmlog_use":{"cost":12,"endTime":1775318808569,"startTime":1775318808557},"app_task_time_fresco_use":{"cost":145,"endTime":1775318808771,"startTime":1775318808626},"app_home_resume_ad_show":{"cost":1312,"endTime":1775318812359,"startTime":1775318811047},"app_start_mainactivity":{"cost":165,"endTime":1775318810740,"startTime":1775318810575},"app_task_time_qmid_use":{"cost":204,"endTime":1775318808777,"startTime":1775318808573},"ad_cold_splash_request_time":{"cost":1992,"endTime":1775318812360,"startTime":1775318810368},"app_task_time_upgrade_use":{"cost":2,"endTime":1775318808573,"startTime":1775318808571},"app_task_time_bugly_use":{"cost":108,"endTime":1775318808885,"startTime":1775318808777}}}, obj=null, changeQuickRedirect=null, z=true, i=93311, clsArr=class android.content.Context,class java.lang.String,class java.util.HashMap, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@8bcd5cc
PatchProxy.proxy is called: objArr=com.kmxs.reader.app.MainApplication@b2371d1,launch_time*#*use,{traceinfo={"app_home_inflate":{"cost":727,"endTime":1775318811467,"startTime":1775318810740},"app_task_time_ad_use":{"cost":1368,"endTime":1775318810384,"startTime":1775318809016},"app_application_create":{"cost":839,"endTime":1775318809188,"startTime":1775318808349},"app_loading_transactionFlow":{"cost":1241,"endTime":1775318810649,"startTime":1775318809408},"app_task_time_statistics_use":{"cost":129,"endTime":1775318809014,"startTime":1775318808885},"app_task_time_all_use":{"cost":638,"endTime":1775318809164,"startTime":1775318808526},"app_task_time_uemng_use":{"cost":29,"endTime":1775318809088,"startTime":1775318809059},"app_task_time_security_use":{"cost":8,"endTime":1775318808557,"startTime":1775318808549},"app_home_activity_create":{"cost":256,"endTime":1775318810996,"startTime":1775318810740},"launch_time":{"cost":4010,"endTime":1775318812359,"startTime":1775318808349},"app_task_time_qmlog_use":{"cost":12,"endTime":1775318808569,"startTime":1775318808557},"app_task_time_fresco_use":{"cost":145,"endTime":1775318808771,"startTime":1775318808626},"app_home_resume_ad_show":{"cost":1312,"endTime":1775318812359,"startTime":1775318811047},"app_start_mainactivity":{"cost":165,"endTime":1775318810740,"startTime":1775318810575},"app_task_time_qmid_use":{"cost":204,"endTime":1775318808777,"startTime":1775318808573},"ad_cold_splash_request_time":{"cost":1992,"endTime":1775318812360,"startTime":1775318810368},"app_task_time_upgrade_use":{"cost":2,"endTime":1775318808573,"startTime":1775318808571},"app_task_time_bugly_use":{"cost":108,"endTime":1775318808885,"startTime":1775318808777}}}, obj=com.kmmartial.MartialCenterApi@5047f2a, changeQuickRedirect=null, z=false, i=93341, clsArr=class android.content.Context,class java.lang.String,class java.util.HashMap, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@625211b
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=93950, clsArr=, cls=class com.qimao.nativestatics.NativeStatics
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@3c782b8
PatchProxy.proxy is called: objArr=launch_time*#*use,{"traceinfo":"{\"app_home_inflate\":{\"cost\":727,\"endTime\":1775318811467,\"startTime\":1775318810740},\"app_task_time_ad_use\":{\"cost\":1368,\"endTime\":1775318810384,\"startTime\":1775318809016},\"app_application_create\":{\"cost\":839,\"endTime\":1775318809188,\"startTime\":1775318808349},\"app_loading_transactionFlow\":{\"cost\":1241,\"endTime\":1775318810649,\"startTime\":1775318809408},\"app_task_time_statistics_use\":{\"cost\":129,\"endTime\":1775318809014,\"startTime\":1775318808885},\"app_task_time_all_use\":{\"cost\":638,\"endTime\":1775318809164,\"startTime\":1775318808526},\"app_task_time_uemng_use\":{\"cost\":29,\"endTime\":1775318809088,\"startTime\":1775318809059},\"app_task_time_security_use\":{\"cost\":8,\"endTime\":1775318808557,\"startTime\":1775318808549},\"app_home_activity_create\":{\"cost\":256,\"endTime\":1775318810996,\"startTime\":1775318810740},\"launch_time\":{\"cost\":4010,\"endTime\":1775318812359,\"startTime\":1775318808349},\"app_task_time_qmlog_use\":{\"cost\":12,\"endTime\":1775318808569,\"startTime\":1775318808557},\"app_task_time_fresco_use\":{\"cost\":145,\"endTime\":1775318808771,\"startTime\":1775318808626},\"app_home_resume_ad_show\":{\"cost\":1312,\"endTime\":1775318812359,\"startTime\":1775318811047},\"app_start_mainactivity\":{\"cost\":165,\"endTime\":1775318810740,\"startTime\":1775318810575},\"app_task_time_qmid_use\":{\"cost\":204,\"endTime\":1775318808777,\"startTime\":1775318808573},\"ad_cold_splash_request_time\":{\"cost\":1992,\"endTime\":1775318812360,\"startTime\":1775318810368},\"app_task_time_upgrade_use\":{\"cost\":2,\"endTime\":1775318808573,\"startTime\":1775318808571},\"app_task_time_bugly_use\":{\"cost\":108,\"endTime\":1775318808885,\"startTime\":1775318808777}}"}, obj=com.qimao.nativestatics.NativeStatics@dc363f6, changeQuickRedirect=null, z=false, i=93953, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@aeab3f7
PatchProxy.proxy is called: objArr=, obj=com.qimao.nativestatics.NativeStatics$2@eb07ccd, changeQuickRedirect=null, z=false, i=93949, clsArr=, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@ab9c982
PatchProxy.proxy is called: objArr=launch_time_#_use,{"traceinfo":"{\"app_home_inflate\":{\"cost\":727,\"endTime\":1775318811467,\"startTime\":1775318810740},\"app_task_time_ad_use\":{\"cost\":1368,\"endTime\":1775318810384,\"startTime\":1775318809016},\"app_application_create\":{\"cost\":839,\"endTime\":1775318809188,\"startTime\":1775318808349},\"app_loading_transactionFlow\":{\"cost\":1241,\"endTime\":1775318810649,\"startTime\":1775318809408},\"app_task_time_statistics_use\":{\"cost\":129,\"endTime\":1775318809014,\"startTime\":1775318808885},\"app_task_time_all_use\":{\"cost\":638,\"endTime\":1775318809164,\"startTime\":1775318808526},\"app_task_time_uemng_use\":{\"cost\":29,\"endTime\":1775318809088,\"startTime\":1775318809059},\"app_task_time_security_use\":{\"cost\":8,\"endTime\":1775318808557,\"startTime\":1775318808549},\"app_home_activity_create\":{\"cost\":256,\"endTime\":1775318810996,\"startTime\":1775318810740},\"launch_time\":{\"cost\":4010,\"endTime\":1775318812359,\"startTime\":1775318808349},\"app_task_time_qmlog_use\":{\"cost\":12,\"endTime\":1775318808569,\"startTime\":1775318808557},\"app_task_time_fresco_use\":{\"cost\":145,\"endTime\":1775318808771,\"startTime\":1775318808626},\"app_home_resume_ad_show\":{\"cost\":1312,\"endTime\":1775318812359,\"startTime\":1775318811047},\"app_start_mainactivity\":{\"cost\":165,\"endTime\":1775318810740,\"startTime\":1775318810575},\"app_task_time_qmid_use\":{\"cost\":204,\"endTime\":1775318808777,\"startTime\":1775318808573},\"ad_cold_splash_request_time\":{\"cost\":1992,\"endTime\":1775318812360,\"startTime\":1775318810368},\"app_task_time_upgrade_use\":{\"cost\":2,\"endTime\":1775318808573,\"startTime\":1775318808571},\"app_task_time_bugly_use\":{\"cost\":108,\"endTime\":1775318808885,\"startTime\":1775318808777}}"}, obj=null, changeQuickRedirect=null, z=true, i=93966, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@90c9893
PatchProxy.proxy is called: objArr=launch_time_#_use,{traceinfo={"app_home_inflate":{"cost":727,"endTime":1775318811467,"startTime":1775318810740},"app_task_time_ad_use":{"cost":1368,"endTime":1775318810384,"startTime":1775318809016},"app_application_create":{"cost":839,"endTime":1775318809188,"startTime":1775318808349},"app_loading_transactionFlow":{"cost":1241,"endTime":1775318810649,"startTime":1775318809408},"app_task_time_statistics_use":{"cost":129,"endTime":1775318809014,"startTime":1775318808885},"app_task_time_all_use":{"cost":638,"endTime":1775318809164,"startTime":1775318808526},"app_task_time_uemng_use":{"cost":29,"endTime":1775318809088,"startTime":1775318809059},"app_task_time_security_use":{"cost":8,"endTime":1775318808557,"startTime":1775318808549},"app_home_activity_create":{"cost":256,"endTime":1775318810996,"startTime":1775318810740},"launch_time":{"cost":4010,"endTime":1775318812359,"startTime":1775318808349},"app_task_time_qmlog_use":{"cost":12,"endTime":1775318808569,"startTime":1775318808557},"app_task_time_fresco_use":{"cost":145,"endTime":1775318808771,"startTime":1775318808626},"app_home_resume_ad_show":{"cost":1312,"endTime":1775318812359,"startTime":1775318811047},"app_start_mainactivity":{"cost":165,"endTime":1775318810740,"startTime":1775318810575},"app_task_time_qmid_use":{"cost":204,"endTime":1775318808777,"startTime":1775318808573},"ad_cold_splash_request_time":{"cost":1992,"endTime":1775318812360,"startTime":1775318810368},"app_task_time_upgrade_use":{"cost":2,"endTime":1775318808573,"startTime":1775318808571},"app_task_time_bugly_use":{"cost":108,"endTime":1775318808885,"startTime":1775318808777}}}, obj=null, changeQuickRedirect=null, z=true, i=93298, clsArr=class java.lang.String,interface java.util.Map, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@58bf0d0
PatchProxy.proxy is called: objArr=launch_time_#_use,{traceinfo={"app_home_inflate":{"cost":727,"endTime":1775318811467,"startTime":1775318810740},"app_task_time_ad_use":{"cost":1368,"endTime":1775318810384,"startTime":1775318809016},"app_application_create":{"cost":839,"endTime":1775318809188,"startTime":1775318808349},"app_loading_transactionFlow":{"cost":1241,"endTime":1775318810649,"startTime":1775318809408},"app_task_time_statistics_use":{"cost":129,"endTime":1775318809014,"startTime":1775318808885},"app_task_time_all_use":{"cost":638,"endTime":1775318809164,"startTime":1775318808526},"app_task_time_uemng_use":{"cost":29,"endTime":1775318809088,"startTime":1775318809059},"app_task_time_security_use":{"cost":8,"endTime":1775318808557,"startTime":1775318808549},"app_home_activity_create":{"cost":256,"endTime":1775318810996,"startTime":1775318810740},"launch_time":{"cost":4010,"endTime":1775318812359,"startTime":1775318808349},"app_task_time_qmlog_use":{"cost":12,"endTime":1775318808569,"startTime":1775318808557},"app_task_time_fresco_use":{"cost":145,"endTime":1775318808771,"startTime":1775318808626},"app_home_resume_ad_show":{"cost":1312,"endTime":1775318812359,"startTime":1775318811047},"app_start_mainactivity":{"cost":165,"endTime":1775318810740,"startTime":1775318810575},"app_task_time_qmid_use":{"cost":204,"endTime":1775318808777,"startTime":1775318808573},"ad_cold_splash_request_time":{"cost":1992,"endTime":1775318812360,"startTime":1775318810368},"app_task_time_upgrade_use":{"cost":2,"endTime":1775318808573,"startTime":1775318808571},"app_task_time_bugly_use":{"cost":108,"endTime":1775318808885,"startTime":1775318808777}}}, obj=com.km.app.app.performance.tasks.InitQMFocusTask$run$4@cbefbce, changeQuickRedirect=null, z=false, i=1674, clsArr=class java.lang.String,interface java.util.Map, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@d5e2aef
PatchProxy.proxy is called: objArr=er9{Active}@60749fc,er9{Active}@60749fc, obj=Function2<w22, yz1<? super kotlin.Unit>, java.lang.Object>, changeQuickRedirect=null, z=false, i=1596, clsArr=class java.lang.Object,interface yz1, cls=interface yz1
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@48c870b
PatchProxy.proxy is called: objArr=kotlin.Unit, obj=Continuation at com.km.app.app.performance.tasks.InitQMFocusTask$run$4$onEvent$1$1$1.invokeSuspend(InitQMFocusTask.kt), changeQuickRedirect=null, z=false, i=1595, clsArr=class java.lang.Object, cls=class java.lang.Object
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@5b21801
PatchProxy.proxy is called: objArr=com.qimao.eventtrack.core.a@e7d09e8,SENSORS, obj=vx4$d@93459f5, changeQuickRedirect=null, z=false, i=1691, clsArr=class com.qimao.eventtrack.core.a,class java.lang.String, cls=void
PatchProxy.proxy is called: objArr=launch_time*#_use,{"traceinfo":"{\"app_home_inflate\":{\"cost\":727,\"endTime\":1775318811467,\"startTime\":1775318810740},\"app_task_time_ad_use\":{\"cost\":1368,\"endTime\":1775318810384,\"startTime\":1775318809016},\"app_application_create\":{\"cost\":839,\"endTime\":1775318809188,\"startTime\":1775318808349},\"app_loading_transactionFlow\":{\"cost\":1241,\"endTime\":1775318810649,\"startTime\":1775318809408},\"app_task_time_statistics_use\":{\"cost\":129,\"endTime\":1775318809014,\"startTime\":1775318808885},\"app_task_time_all_use\":{\"cost\":638,\"endTime\":1775318809164,\"startTime\":1775318808526},\"app_task_time_uemng_use\":{\"cost\":29,\"endTime\":1775318809088,\"startTime\":1775318809059},\"app_task_time_security_use\":{\"cost\":8,\"endTime\":1775318808557,\"startTime\":1775318808549},\"app_home_activity_create\":{\"cost\":256,\"endTime\":1775318810996,\"startTime\":1775318810740},\"launch_time\":{\"cost\":4010,\"endTime\":1775318812359,\"startTime\":1775318808349},\"app_task_time_qmlog_use\":{\"cost\":12,\"endTime\":1775318808569,\"startTime\":1775318808557},\"app_task_time_fresco_use\":{\"cost\":145,\"endTime\":1775318808771,\"startTime\":1775318808626},\"app_home_resume_ad_show\":{\"cost\":1312,\"endTime\":1775318812359,\"startTime\":1775318811047},\"app_start_mainactivity\":{\"cost\":165,\"endTime\":1775318810740,\"startTime\":1775318810575},\"app_task_time_qmid_use\":{\"cost\":204,\"endTime\":1775318808777,\"startTime\":1775318808573},\"ad_cold_splash_request_time\":{\"cost\":1992,\"endTime\":1775318812360,\"startTime\":1775318810368},\"app_task_time_upgrade_use\":{\"cost\":2,\"endTime\":1775318808573,\"startTime\":1775318808571},\"app_task_time_bugly_use\":{\"cost\":108,\"endTime\":1775318808885,\"startTime\":1775318808777}}"}, obj=com.qimao.focus.QMFocus@efa88e7, changeQuickRedirect=null, z=false, i=93090, clsArr=class java.lang.String,class org.json.JSONObject, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@cdc94
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@f27333d
PatchProxy.proxy is called: objArr=, obj=null, changeQuickRedirect=null, z=true, i=176, clsArr=, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@37b9732
PatchProxy.proxy is called: objArr=INFO,[Ljava.lang.String;@65ccc83, obj=ow4$a@3d8c639, changeQuickRedirect=null, z=false, i=1659, clsArr=class com.tencent.bugly.proguard.mw,class [Ljava.lang.String;, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@8c7f47e
PatchProxy.proxy is called: objArr=BuglyLogProxy.eup,Native Crash Happen v2, obj=null, changeQuickRedirect=null, z=true, i=73932, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@115addf
PatchProxy.proxy is called: objArr=INFO,[Ljava.lang.String;@aaf2a2c, obj=ow4$a@3d8c639, changeQuickRedirect=null, z=false, i=1659, clsArr=class com.tencent.bugly.proguard.mw,class [Ljava.lang.String;, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@5768cf5
PatchProxy.proxy is called: objArr=BuglyLogProxy.eup,Extra message[0]: ExceptionThreadName=proxyScheduleTh, obj=null, changeQuickRedirect=null, z=true, i=73932, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@ceada8a
PatchProxy.proxy is called: objArr=INFO,[Ljava.lang.String;@f5148fb, obj=ow4$a@3d8c639, changeQuickRedirect=null, z=false, i=1659, clsArr=class com.tencent.bugly.proguard.mw,class [Ljava.lang.String;, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@6fabd18
PatchProxy.proxy is called: objArr=BuglyLogProxy.eup,Extra message[1]: ExceptionProcessName=com.kmxs.reader, obj=null, changeQuickRedirect=null, z=true, i=73932, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@6f00371
PatchProxy.proxy is called: objArr=INFO,[Ljava.lang.String;@fa41556, obj=ow4$a@3d8c639, changeQuickRedirect=null, z=false, i=1659, clsArr=class com.tencent.bugly.proguard.mw,class [Ljava.lang.String;, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@de179d7
PatchProxy.proxy is called: objArr=BuglyLogProxy.eup,Extra message[2]: SysLogPath=/data/user/0/com.kmxs.reader/app_bugly/sys_log_1775318808851.txt, obj=null, changeQuickRedirect=null, z=true, i=73932, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@f6a92c4
PatchProxy.proxy is called: objArr=INFO,[Ljava.lang.String;@b065ad, obj=ow4$a@3d8c639, changeQuickRedirect=null, z=false, i=1659, clsArr=class com.tencent.bugly.proguard.mw,class [Ljava.lang.String;, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@ae430e2
PatchProxy.proxy is called: objArr=BuglyLogProxy.eup,Extra message[3]: JniLogPath=, obj=null, changeQuickRedirect=null, z=true, i=73932, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@ad9dc73
PatchProxy.proxy is called: objArr=WARN,[Ljava.lang.String;@3e01730, obj=ow4$a@3d8c639, changeQuickRedirect=null, z=false, i=1659, clsArr=class com.tencent.bugly.proguard.mw,class [Ljava.lang.String;, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@c9aafa9
PatchProxy.proxy is called: objArr=BuglyLogProxy.eup,bad extraMsg JniLogPath=, obj=null, changeQuickRedirect=null, z=true, i=73932, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@518792e
PatchProxy.proxy is called: objArr=INFO,[Ljava.lang.String;@7ebcccf, obj=ow4$a@3d8c639, changeQuickRedirect=null, z=false, i=1659, clsArr=class com.tencent.bugly.proguard.mw,class [Ljava.lang.String;, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@ee7765c
PatchProxy.proxy is called: objArr=BuglyLogProxy.eup,Extra message[4]: HasPendingException=false, obj=null, changeQuickRedirect=null, z=true, i=73932, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@5c59d65
PatchProxy.proxy is called: objArr=DEBUG,[Ljava.lang.String;@c36fa3a, obj=ow4$a@3d8c639, changeQuickRedirect=null, z=false, i=1659, clsArr=class com.tencent.bugly.proguard.mw,class [Ljava.lang.String;, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@68266eb
PatchProxy.proxy is called: objArr=BuglyLogProxy.eup,Name of crash process: com.kmxs.reader, obj=null, changeQuickRedirect=null, z=true, i=73932, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@5a39c48
PatchProxy.proxy is called: objArr=DEBUG,[Ljava.lang.String;@7f7aae1, obj=ow4$a@3d8c639, changeQuickRedirect=null, z=false, i=1659, clsArr=class com.tencent.bugly.proguard.mw,class [Ljava.lang.String;, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@58a8006
PatchProxy.proxy is called: objArr=BuglyLogProxy.eup,crash thread name:proxyScheduleTh tid:31138, obj=null, changeQuickRedirect=null, z=true, i=73932, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@99e86c7
PatchProxy.proxy is called: objArr=WARN,[Ljava.lang.String;@a7a34f4, obj=ow4$a@3d8c639, changeQuickRedirect=null, z=false, i=1659, clsArr=class com.tencent.bugly.proguard.mw,class [Ljava.lang.String;, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@ae3141d
PatchProxy.proxy is called: objArr=BuglyLogProxy.eup,no remote but still store!, obj=null, changeQuickRedirect=null, z=true, i=73932, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@e3e9692
PatchProxy.proxy is called: objArr=INFO,[Ljava.lang.String;@972c863, obj=ow4$a@3d8c639, changeQuickRedirect=null, z=false, i=1659, clsArr=class com.tencent.bugly.proguard.mw,class [Ljava.lang.String;, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@e7fac60
PatchProxy.proxy is called: objArr=BuglyLogProxy.eup,Read system log from native record file(length: 1072 bytes): /data/user/0/com.kmxs.reader/app_bugly/sys_log_1775318808851.txt, obj=null, changeQuickRedirect=null, z=true, i=73932, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@521d519
PatchProxy.proxy is called: objArr=DEBUG,[Ljava.lang.String;@8ab89de, obj=ow4$a@3d8c639, changeQuickRedirect=null, z=false, i=1659, clsArr=class com.tencent.bugly.proguard.mw,class [Ljava.lang.String;, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@4bf87bf
PatchProxy.proxy is called: objArr=BuglyLogProxy.eup,Add this record file to list for cleaning lastly., obj=null, changeQuickRedirect=null, z=true, i=73932, clsArr=class java.lang.String,class java.lang.String, cls=void
PatchProxy.proxy result=com.meituan.robust.PatchProxyResult@da32e8c

```

```

[sys_log_1775318808851.txt](%E4%B8%83%E7%8C%AB%E5%85%8D%E8%B4%B9%E5%B0%8F%E8%AF%B4/sys_log_1775318808851.txt)

嗯，分析了半天也没分析出来😐，我们改变一下思路

还是老老实实的打印堆栈吧，我们在已知的最上层打上堆栈

```

```

y["accept"].implementation = function (throwable) {
console.log(`y.accept is called: throwable=${throwable}`);
var Log = Java.use("android.util.Log");
var Exception = Java.use("java.lang.Exception");
var stackTrace = Log.getStackTraceString(Exception.$new());
console.log(stackTrace);
this["accept"](throwable);
};

```

```

得到

```

```

y.accept is called: throwable=javax.net.ssl.SSLPeerUnverifiedException: Hostname api-ks.wtzw.com not verified:
certificate: sha256/g1B9+RAckZKxLyxCeZNQv12EvmTTtnUwPHTJHrq5JQQ=
DN: ST=Delaware,CN=Proxyman CA,O=Proxyman LLC,L=Wilmington,C=US
subjectAltNames: [101.200.36.194, 101.200.36.194]
java.lang.Exception
at qx6$y.accept(Native Method)
at io.reactivex.internal.observers.LambdaObserver.onError(SourceFile:14)
at io.reactivex.internal.operators.observable.ObservableObserveOn$ObserveOnObserver.checkTerminated(SourceFile:48)
at io.reactivex.internal.operators.observable.ObservableObserveOn$ObserveOnObserver.drainNormal(SourceFile:13)
at io.reactivex.internal.operators.observable.ObservableObserveOn$ObserveOnObserver.run(SourceFile:9)
at io.reactivex.android.schedulers.HandlerScheduler$ScheduledRunnable.run(SourceFile:3)
at android.os.Handler.handleCallback(Handler.java:907)
at android.os.Handler.dispatchMessage(Handler.java:105)
at android.os.Looper.loop(Looper.java:216)
at android.app.ActivityThread.main(ActivityThread.java:7625)
at java.lang.reflect.Method.invoke(Native Method)
at com.android.internal.os.RuntimeInit$MethodAndArgsCaller.run(RuntimeInit.java:524)
at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:987)

```

```

嗯，也是一无所获，问了一下AI，说是因为异步的原因，所以看不到发起者

我们还是回到报错信息上，看到有一个固定的

```
not verified
```

，我们试着搜索一下

![image](https://attach.52pojie.cn/forum/202604/08/224438dx9jzu0ad52a46k4.png)

![image](https://attach.52pojie.cn/forum/202604/08/224438nknw7hnhdvadp3ne.png)

![image](https://attach.52pojie.cn/forum/202604/08/224439sw215z2kjj2h4wcw.png)

这里我们一眼就能够锁定

![image](https://attach.52pojie.cn/forum/202604/08/224439oos1s1f5iissawb0.png)

```

```

Java.perform(function () {
var OkHostnameVerifier = Java.use("okhttp3.internal.tls.OkHostnameVerifier");
OkHostnameVerifier.verify.overload("java.lang.String", "javax.net.ssl.SSLSession")
.implementation = function (host, session) {
console.log("verify:", host);
return true;
};
})

```

```

啧啧啧，ez

![image](https://attach.52pojie.cn/forum/202604/08/224440qtchm4d4himc0mdm.jpg)

### 详细分析校验逻辑

```

```

if (address.hostnameVerifier().verify(address.url().host(), session)) {
address.certificatePinner().check(address.url().host(), handshake.peerCertificates());
String selectedProtocol = connectionSpecConfigureSecureSocket.supportsTlsExtensions() ? Platform.get().getSelectedProtocol(sSLSocket2) : null;
this.socket = sSLSocket2;
this.source = Okio.buffer(Okio.source(sSLSocket2));
this.sink = Okio.buffer(Okio.sink(this.socket));
this.handshake = handshake;
this.protocol = selectedProtocol != null ? Protocol.get(selectedProtocol) : Protocol.HTTP_1_1;
Platform.get().afterHandshake(sSLSocket2);
return;
}
List<Certificate> listPeerCertificates = handshake.peerCertificates();
if (listPeerCertificates.isEmpty()) {
throw new SSLPeerUnverifiedException("Hostname " + address.url().host() + " not verified (no certificates)");
}
X509Certificate x509Certificate = (X509Certificate) listPeerCertificates.get(0);
throw new SSLPeerUnverifiedException("Hostname " + address.url().host() + " not verified:\n    certificate: " + CertificatePinner.pin(x509Certificate) + "\n    DN: " + x509Certificate.getSubjectDN().getName() + "\n    subjectAltNames: " + OkHostnameVerifier.allSubjectAltNames(x509Certificate));

```

```

我们观察一下

最开始一个if判定

```
address.hostnameVerifier().verify(address.url().host(), session)
```

这个并不是判断证书是否可信，而是判断

域名是否在白名单内，我们可以hook一下看看

但是这里有一个很有意思的现象，我们不能使用jadx自动生成对应的代码，在

```
verify
```

上是没有反应的。这是为什么呢？？？但是我们直接点击前面的

```
hostnameVerifier
```

，自动进行了跳转，但是

![image](https://attach.52pojie.cn/forum/202604/08/224440gozoqprw9roczop9.png)

![image](https://attach.52pojie.cn/forum/202604/08/224440ntipi9tzg5og6h74.png)

我们看到这个类来细雨Android/Java的系统库，不再APK的dex中，jadx自然无法生成对应的hook代码

我们来看一下这里的Address类，我们在上面看到这个类中有一个名为

```
hostnameVerifier
```

的方法，直接返回了自身的

```
hostnameVerifier
```

，那么我们看一下他的构造函数

```

```

public Address(String str, int i, Dns dns, SocketFactory socketFactory, @Nullable SSLSocketFactory sSLSocketFactory, @Nullable HostnameVerifier hostnameVerifier, @Nullable CertificatePinner certificatePinner, Authenticator authenticator, @Nullable Proxy proxy, List<Protocol> list, List<ConnectionSpec> list2, ProxySelector proxySelector) {

```

```

可以看到在接受的参数中有一个

```
hostnameVerifier
```

，这也就是为什么jadx无法生成hook代码了，毕竟jadx是静态分析

我们来hook一下这个构造函数，看看传入的参数能不能给我们一些启示

![image](https://attach.52pojie.cn/forum/202604/08/224441ctgettabinwg2tdk.jpg)

好吧，失去所有力气和手段

我们询问了AI，知道了默认的实现来自

```
OkHostnameVerifier
```

，我们直接hook这个类中的

```
verify
```

方法即可。

## sign

相对而言，我们所需要关注的就是

![image](https://attach.52pojie.cn/forum/202604/08/224444gzvutvittqtztuqi.png)

也就是params中的sign，我们直接关键字搜索

![image](https://attach.52pojie.cn/forum/202604/08/224446fnon27su87f7g77d.png)

![image](https://attach.52pojie.cn/forum/202604/08/224448t4u5a6sxex4x55h6.png)

frida hook一下

![image](https://attach.52pojie.cn/forum/202604/08/224451x0jhtmjdhetlei5t.png)

没毛病。就是这里，我们继续看这个sign是如何生成的

![image](https://attach.52pojie.cn/forum/202604/16/164536x4mrdgiu4ze4rejd.png)

但是神奇的是我们直接hook发现不输出

我们继续追踪，发现sign来自native方法

![image](https://attach.52pojie.cn/forum/202604/08/224456qo68x6mj6jom64ma.png)

但是没有找到加载的是哪个so文件

额，那么我们就要考虑这个函数是动态注册的，还是静态注册的了。。。

那么咋办呢？

我们当然可以通过frida-trace方法来查找

*

通过frida-trace进行查找

```
frida-trace -U -f <包名> -I "[libnative-lib.so](http://libnative-lib.so/)" -i "Java_*sign*"
```

```
frida-trace -U -f <包名> -i "Java_*sign*"
```

想要同时携带脚本，使用

```
-S
```

```
frida-trace -U -f com.kmxs.reader -i "Java_*sign"  -S 1_tmp.js
```

但是这样会覆盖frida-trace的自动脚本，可能会导致无法输出，所以我们在启动App之后使用⬇️

```
frida-trace -UF  --decorate -i "Java_*sign”
```

![image](https://attach.52pojie.cn/forum/202604/08/224459zrqwkfwhmhgqzmj8.jpg)

```

```

OK，现在我们就知道这个函数是来自`libcommon_encryption`这个so文件了

```

```

我们还可以使用grep来查找静态注册的方法

*

```
grep -r 'Java_com_km_encryption_api_Security_sign' *
```

![image](https://attach.52pojie.cn/forum/202604/08/224955zleezkspk4kglasc.png)

但是，我们也可以通过hook JNI来查看静态注册了哪些函数

当然，最不希望的就是动态注册，我们需要hook RegisterNatives

我们先考虑静态注册的函数

我们直接在整个进程中枚举所有的静态注册函数

有代码

```

```

function hookAllStaticJNI(keyword) {
console.log(" start hook static JNI");
Process.enumerateModules().forEach(function (module) {
let exports = module.enumerateExports();
exports.forEach(function (exp) {
if (exp.type === "function" && exp.name.startsWith("Java_") && exp.name.includes(keyword)) {
console.log("[JNI]", module.name, exp.name, exp.address);
Interceptor.attach(exp.address, {
onEnter: function (args) {
console.log(">>> call:", exp.name);
},
onLeave: function (retval) {
console.log("<<< return:", retval);
}
}
);
}
});
});

}

setImmediate(hookAllStaticJNI, "sign");

```

```

OK，我们找到了这个函数所在的位置

![image](https://attach.52pojie.cn/forum/202604/08/224505ddkkvujjdqsq7skj.png)

```

```

libcommon-encryption.so Java_com_km_encryption_api_Security_sign 0x77584c1430

```

```

[显然处于](http://显然处于libcommon-encryption.so)

```
libcommon-encryption.so
```

这个so库中

我们使用IDA进行查看

![image](https://attach.52pojie.cn/forum/202604/08/224507kvdullvujlqv0uyf.png)

![image](https://attach.52pojie.cn/forum/202604/08/225035r33rksmjfhksgfd7.png)

```
// Alternative name is 'Java_com_km_encryption_api_Security_token’
```

我们看开头，这里是可选名称，可能是IDA进行了某些优化？？？

几乎可以确定的就是这个函数

我们可以hook一下返回，看看最后的返回值和java层是否相同

有代码

```

```

function hook_sign() {
var encrModel = Process.findModuleByName("libcommon-encryption.so")
console.log("libcommon-encryption.so addr =>", encrModel.base)
var secur_sign_addr = encrModel.findExportByName("Java_com_km_encryption_api_Security_sign")
console.log("secur_sign_func addr =>", secur_sign_addr)
Interceptor.attach(secur_sign_addr, {
onEnter: function (args) {
this.env = args[0]
this.jstr = args[2]
const jniEnv = Java.vm.getEnv();
const input = jniEnv.getStringUtfChars(this.jstr, null).readCString();
console.log("input =>", input)
},
onLeave: function (retval) {
const jniEnv = Java.vm.getEnv();
const output = jniEnv.getStringUtfChars(retval, null).readCString();
console.log("[sign return]", output);
}
})
}

setImmediate(hook_sign)

```

```

简单输出了一下入参和结果

![image](https://attach.52pojie.cn/forum/202604/08/224512dtttsbtvtv7bobuv.jpg)

![image](https://attach.52pojie.cn/forum/202604/08/224514urgdp0hg2na20k2j.png)

没毛病，就是在这里参与运算的，我们接下来就是修正一下入参的显示格式

额，貌似这个输入并不是什么可见字符

我们看了半天没看出来，那么接下来我们还是老老实实分析so文件吧

那么既然是分析如何生成，我们自然是倒着往上看

我们从最后的return开始分析

![注意，在末尾添加0是v10[v9] = 0]

![image](https://attach.52pojie.cn/forum/202604/08/224521hg7z3g7m2dp7mxxd.png)

注意，在末尾添加0是v10[v9] = 0

```

```

(*env)->GetByteArrayRegion(env, input, 0, v9, v10);
// 参数：env, 数组对象, 起始偏移0, 复制长度v9, 目标地址v10

memcpy(目标地址, 源地址, 拷贝长度)

```

```

我们先来了解一下MD5

这个是一个消息摘要算法，服务器保存重要数据的时候，不存储明文信息，只存储MD5消息摘要

这样可以避免密码明文泄漏

然后为了避免彩虹表碰撞，产生了加盐

服务器端存储盐值和MD5结果

当用户登陆的时候，发送明文密码

服务端获取密码之后拼接盐值，然后MD5，将结果与数据库中存储的MD5进行对比，相同则放行

我们现在看一下剩下的代码

![image](https://attach.52pojie.cn/forum/202604/08/224523g3hjprhdt6w3grgd.png)

![image](https://attach.52pojie.cn/forum/202604/08/224528akbv0lkokz0t5vzd.png)

分析完了代码，我们准备开始hook

显然最简单的就是hook v14，这里存储了拼接完成的数据

![image](https://attach.52pojie.cn/forum/202604/08/224530s94zxabejqcjk8qt.png)

我们将其转换为汇编看一下，直接戳内存是比较划算且省力的

```

```

.text:000000000002A54C                 BL              .memcpy ; 内存拷贝
.text:000000000002A550                 ADD             X0, X21, X23 ; 计算dest地址，并保存到X0寄存器
.text:000000000002A554                 MOV             X1, X24 ; 将源地址移动到X1寄存器
.text:000000000002A558                 MOV             X2, X22 ; 将上方计算得到的长度移动到X2寄存器

我可以直接baseAddr+0x2A54C，Intercept到memcpy上，然后通过this.context.x1获取key的地址，然后hexdump this.context.x2长度的数据

```

```

上面的说法广义上是没有问题的，但是硬纠的话，其实我们并不是hook了memcpy，这里对应的指令是BL，也就是跳转，所以我们对这个地址进行hook，实际上并不是hook了这个函数，而是在这个地址这里下了一个钩子，也就是说在进入CPU进入这个地址之后，frida按下了暂停键，然后开始执行我们的onEnter逻辑

所以其实intercept并不是针对函数进行操作，而是针对地址进行操作，到了这个地址，就开始执行我们的代码

那么我们继续观察，我们知道BL指令对应的地址是0x2A54C，然后我们要查看的内存起始位置是X1，地址长度为X2

虽然这里大概率是字符串，但是保险起见我们还是采用hexdump来进行查看，因为有些时候不一定是字符串，可能是不可见字符。

大乌龙，并不是先memcpy再准备数据，而是先准备数据再memcpy，我说怎么分析起来这么奇怪呢

![image](https://attach.52pojie.cn/forum/202604/08/224534f52xhhz544bc5tdd.png)

所以有代码

![image](https://attach.52pojie.cn/forum/202604/08/224537xnz28k86j19kn7i7.png)

很好，全都出来了，现在我们知道这个sign值是怎么来的了

这里还碰到一个很神奇的问题，我们每次运行

```

```

// frida -UF -l sign_native.js
function hook_data_sign() {
var encrModel = Process.findModuleByName("libcommon-encryption.so")
console.log("libcommon-encryption.so addr =>", encrModel.base)

// 查看data
Interceptor.attach(encrModel.base.add(0x2A54C), {
onEnter: function (args) {
const dataPtr = this.context.x1;
const dataLen = this.context.x2.toInt32();
console.log("Data is ", dataPtr.readUtf8String(dataLen))
}
});
// 查看盐
Interceptor.attach(encrModel.base.add(0x2A55C), {
onEnter: function (args) {
const saltPtr = this.context.x1;
const saltLen = this.context.x2.toInt32();
console.log("Salt is ", saltPtr.readUtf8String(saltLen))
}
});
// 查看sign
Interceptor.attach(encrModel.findExportByName("Java_com_km_encryption_api_Security_sign"), {
onLeave: function (retval) {
const jniEnv = Java.vm.getEnv();
const output = jniEnv.getStringUtfChars(retval, null)
console.log("\n[sign return]", output.readCString());
}
});
}

setImmediate(hook_data_sign)

```

```

App一定会崩溃，也是非常的离谱

我们使用

```
adb logcat
```

看一下

嗯。log中也显示

![image](https://attach.52pojie.cn/forum/202604/08/224541o3f7ss1idnassvj3.png)

嗯哼，我们就算在代码中添加了

```
try/catch
```

逻辑，还是会崩溃。。。这是为什么呢？因为

```
try/catch
```

只能兜住代码逻辑上的错误，但是扛不住底层的错误，所以底层一旦出现异常崩溃，frida进程跟着就结束了。我们搜索了一下这个错误，程序试图访问内存地址

```
0x1
```

，但这个地址不允许访问，于是系统把它拦住了。

我们如何修复呢？？？每次访问之前先检查一下这个指针的大小，如果太小我们就不访问，输出错误即可。这样只能避免一部分，我们还是会崩溃

其根本原因在于访问我们使用this.context.x1来访问寄存器中实时值，这就有可能导致访问到野指针，然后App崩溃。所以我们应该采用更安全的写法，args，在frida开始hook的瞬间，寄存器中的值已经被保存到args中了，不会像直接读 this.context.x1 那样每次都去访问当前寄存器的实时值，因而不会触发未初始化的指针/寄存器导致的崩溃。

测试了一下，还是有问题。。。

AI回答说是可能是因为两个脚本hook同一个函数，导致Frida出现错误

我们试试看使用hookMD5方法来获取结果，因为我们的CStr最终还是要转换成Java字符串

我们就找之前的那一瞬间hook就好了

因此有代码

```

```

function hook_sign(baseAddr, offset) {
Interceptor.attach(baseAddr.add(offset), {
onEnter: function (args) {
var pV20 = args[1];
try {
var v20Str = pV20.readUtf8String();
console.log("sign ->", v20Str);
} catch (e) {
console.log("can't read,use hexdump UTF8: " + e);
console.log(hexdump(pV20, { length: 32 }));
}
}
});
}

```

```

整体代码为

```

```

// frida -UF -l sign_native.js
function hook_memcpy(baseAddr, offset) {
Interceptor.attach(baseAddr.add(offset), {
onEnter(args) {
const dataPtr = args[1];
const dataLen = args[2].toInt32();
console.log("Data is", dataPtr.readUtf8String(dataLen));
}
});
}
function hook_data_salt_sign() {
var encrModel = Process.findModuleByName("libcommon-encryption.so")
console.log("libcommon-encryption.so addr =>", encrModel.base)
// 查看data
hook_memcpy(encrModel.base, 0x2A54C);
// 查看salt
hook_memcpy(encrModel.base, 0x2A55C);
// 查看sign
hook_sign(encrModel.base, 0x2A634)
}

function hook_sign(baseAddr, offset) {
Interceptor.attach(baseAddr.add(offset), {
onEnter: function (args) {
var pV20 = args[1];
try {
var v20Str = pV20.readUtf8String();
console.log("sign ->", v20Str);
} catch (e) {
console.log("can't read,use hexdump UTF8: " + e);
console.log(hexdump(pV20, { length: 32 }));
}
}
});
}

setImmediate(hook_data_salt_sign)

```

```

OK，我们这样就可以开始联合调试了

在native层输出 MD5前的输入和MD5结果

在Java层输出URL和对应的sign

这样我们就能够知道详情页的加密内容了

![image](https://attach.52pojie.cn/forum/202604/08/224545lkjockthc9jpxmd9.jpg)

OK，ez
