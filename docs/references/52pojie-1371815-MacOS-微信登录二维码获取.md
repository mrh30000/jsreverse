# MacOS-微信登录二维码获取

> **作者**: 胡家二少 | **发布时间**: 2021-02-17 10:55:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8154 / 29
> **原文**: [https://www.52pojie.cn/thread-1371815-1-1.html](https://www.52pojie.cn/thread-1371815-1-1.html)

---

### MacOS-微信登录二维码获取

#### 0.前言

---

> 本人所发布的文章仅限用于学习和研究目的；不得将上述内容用于商业或者非法用途，否则，一切后果请用户自负。如有侵权请联系我删除处理。

本篇文章将带领大家去获取微信登录的二维码，并保存为图片。

#### 1.微信版本

---

![](https://gitee.com/ekukuku/docimg/raw/master/20210217102642.png)

#### 2.分析

---

上篇文章已经演示了如何dump微信头文件，本篇不再赘述。

我们想要获取到登录二维码，还是跟上篇文章一样，我们需要用关键字进行定位分析，登录-Login 二维码QR，先筛选一遍试试看。

```
# n @ localhost in ~/vscodewsp/wechat/dump [10:31:34]
$ ll -l|grep Login|wc -l
      48
```

可以看到登录相关的文件有48个。那么继续把二维码QR也加上试试

```
# n @ localhost in ~/vscodewsp/wechat/dump [10:32:52]
$ ll -l|grep Login|grep QR|wc -l
      10

# n @ localhost in ~/vscodewsp/wechat/dump [10:33:00]
$ ll -l|grep Login|grep QR
-rw-r--r--  1 n  staff   1.7K  2 15 19:19 CheckLoginQRCodeRequest.h
-rw-r--r--  1 n  staff   1.0K  2 15 19:19 CheckLoginQRCodeResponse.h
-rw-r--r--  1 n  staff   2.8K  2 15 19:19 GetLoginQRCodeRequest.h
-rw-r--r--  1 n  staff   2.6K  2 15 19:19 GetLoginQRCodeResponse.h
-rw-r--r--  1 n  staff   3.1K  2 15 19:19 LoginQRCodeNotify.h
-rw-r--r--  1 n  staff   977B  2 15 19:19 LoginQRCodeNotifyPkg.h
-rw-r--r--  1 n  staff   2.2K  2 15 19:19 MMLoginQRCodeViewController.h
-rw-r--r--  1 n  staff   2.4K  2 15 19:19 QRCodeLoginCGI.h
-rw-r--r--  1 n  staff   982B  2 15 19:19 QRCodeLoginInfo.h
-rw-r--r--  1 n  staff   1.7K  2 15 19:19 QRCodeLoginLogic.h
```

可以看到就剩10个了。那么我们不确定到底是哪个文件怎么办？那么我们就继续把frida给启动起来进行分析，执行以下命令：

`frida-trace -m "-[*Login* *QR*]" 微信`

```
# n @ localhost in ~/vscodewsp/wechat [10:35:31]
$ frida-trace -m "-[*Login* *QR*]" 微信
Instrumenting...
-[MMLoginQRCodeViewController showLoadingQRCode]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginQRCodeViewController/showLoadingQRCode.js"
-[MMLoginQRCodeViewController updateQRCodeImage:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginQRCodeViewController/updateQRCodeImage_.js"
-[MMLoginStateMachine setStateLoadingQRCode:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/setStateLoadingQRCode_.js"
-[MMLoginStateMachine setStateWaittingRefreshQRCode:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/setStateWaittingRefreshQRCode_.js"
-[MMLoginStateMachine setStateShowingQRCode:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/setStateShowingQRCode_.js"
-[MMLoginStateMachine stateLoadingQRCode]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/stateLoadingQRCode.js"
-[MMLoginStateMachine stateWaittingRefreshQRCode]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/stateWaittingRefreshQRCode.js"
-[MMLoginStateMachine stateShowingQRCode]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/stateShowingQRCode.js"
-[MMLoginStateMachine setUseQRCodeLogin:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/setUseQRCodeLogin_.js"
-[MMLoginStateMachine setLoadQRCodeSucc:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/setLoadQRCodeSucc_.js"
-[MMLoginStateMachine setLoadQRCodeFailed:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/setLoadQRCodeFailed_.js"
-[MMLoginStateMachine setRefreshQRCode:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/setRefreshQRCode_.js"
-[MMLoginStateMachine setConfirmQRCodeLogIn:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/setConfirmQRCodeLogIn_.js"
-[MMLoginStateMachine useQRCodeLogin]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/useQRCodeLogin.js"
-[MMLoginStateMachine loadQRCodeSucc]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/loadQRCodeSucc.js"
-[MMLoginStateMachine loadQRCodeFailed]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/loadQRCodeFailed.js"
-[MMLoginStateMachine refreshQRCode]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/refreshQRCode.js"
-[MMLoginStateMachine confirmQRCodeLogIn]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginStateMachine/confirmQRCodeLogIn.js"
-[MMLoginViewController onRefreshQRLoginStateIfNeeded]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginViewController/onRefreshQRLoginStateIfNeeded.js"
-[MMLoginViewController setupQRCodeLogic]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginViewController/setupQRCodeLogic.js"
-[MMLoginViewController getQRCodeViewController]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginViewController/getQRCodeViewController.js"
-[MMLoginViewController setupQRCodeEvents]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/MMLoginViewController/setupQRCodeEvents.js"
-[QRCodeLoginCGI checkQRCodeTimer]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginCGI/checkQRCodeTimer.js"
-[QRCodeLoginCGI setCheckQRCodeTimer:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginCGI/setCheckQRCodeTimer_.js"
-[QRCodeLoginCGI stopCheckQRCodeTimer]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginCGI/stopCheckQRCodeTimer.js"
-[QRCodeLoginCGI stopQRCodeExpireTimer]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginCGI/stopQRCodeExpireTimer.js"
-[QRCodeLoginCGI checkLoginQRCode]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginCGI/checkLoginQRCode.js"
-[QRCodeLoginCGI didExpiredQRCodeLoginCGIBlock]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginCGI/didExpiredQRCodeLoginCGIBlock.js"
-[QRCodeLoginCGI didCancelQRCodeLoginCGIBlock]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginCGI/didCancelQRCodeLoginCGIBlock.js"
-[QRCodeLoginCGI didScannedQRCodeLoginCGIBlock]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginCGI/didScannedQRCodeLoginCGIBlock.js"
-[QRCodeLoginCGI didConfirmedQRCodeLoginCGIBlock]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginCGI/didConfirmedQRCodeLoginCGIBlock.js"
-[QRCodeLoginCGI getQRCodeWithCompletion:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginCGI/getQRCodeWithCompletion_.js"
-[QRCodeLoginCGI setDidScannedQRCodeLoginCGIBlock:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginCGI/setDidScannedQRCodeLoginCGIBlock_.js"
-[QRCodeLoginCGI setDidConfirmedQRCodeLoginCGIBlock:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginCGI/setDidConfirmedQRCodeLoginCGIBlock_.js"
-[QRCodeLoginCGI setDidCancelQRCodeLoginCGIBlock:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginCGI/setDidCancelQRCodeLoginCGIBlock_.js"
-[QRCodeLoginCGI setDidExpiredQRCodeLoginCGIBlock:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginCGI/setDidExpiredQRCodeLoginCGIBlock_.js"
-[QRCodeLoginLogic setupQRCodeCGI]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginLogic/setupQRCodeCGI.js"
-[QRCodeLoginLogic didScannedQRCodeLoginLogicBlock]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginLogic/didScannedQRCodeLoginLogicBlock.js"
-[QRCodeLoginLogic didConfirmQRCodeLoginLogicBlock]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginLogic/didConfirmQRCodeLoginLogicBlock.js"
-[QRCodeLoginLogic didCancelQRCodeLoginLogicBlock]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginLogic/didCancelQRCodeLoginLogicBlock.js"
-[QRCodeLoginLogic didExpiredQRCodeLoginLogicBlock]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginLogic/didExpiredQRCodeLoginLogicBlock.js"
-[QRCodeLoginLogic getQRCode]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginLogic/getQRCode.js"
-[QRCodeLoginLogic didGetQRCodeLoginLogicBlock]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginLogic/didGetQRCodeLoginLogicBlock.js"
-[QRCodeLoginLogic setDidGetQRCodeLoginLogicBlock:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginLogic/setDidGetQRCodeLoginLogicBlock_.js"
-[QRCodeLoginLogic setDidScannedQRCodeLoginLogicBlock:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginLogic/setDidScannedQRCodeLoginLogicBlock_.js"
-[QRCodeLoginLogic setDidConfirmQRCodeLoginLogicBlock:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginLogic/setDidConfirmQRCodeLoginLogicBlock_.js"
-[QRCodeLoginLogic setDidCancelQRCodeLoginLogicBlock:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginLogic/setDidCancelQRCodeLoginLogicBlock_.js"
-[QRCodeLoginLogic setDidExpiredQRCodeLoginLogicBlock:]: Loaded handler at "/Users/n/vscodewsp/wechat/__handlers__/QRCodeLoginLogic/setDidExpiredQRCodeLoginLogicBlock_.js"
Started tracing 48 functions. Press Ctrl+C to stop.
```

可以看到hook啦48个方法，那么我们将微信退出，然后登录获取二维码试试。

```
 15336 ms  -[QRCodeLoginCGI stopQRCodeExpireTimer]
 15336 ms  -[QRCodeLoginCGI stopCheckQRCodeTimer]
 15336 ms     | -[QRCodeLoginCGI checkQRCodeTimer]
 15336 ms     | -[QRCodeLoginCGI checkQRCodeTimer]
 15336 ms     | -[QRCodeLoginCGI setCheckQRCodeTimer:0x0]
 15336 ms  -[QRCodeLoginCGI setDidScannedQRCodeLoginCGIBlock:0x0]
 15336 ms  -[QRCodeLoginCGI setDidConfirmedQRCodeLoginCGIBlock:0x0]
 15336 ms  -[QRCodeLoginCGI setDidCancelQRCodeLoginCGIBlock:0x0]
 15336 ms  -[QRCodeLoginCGI setDidExpiredQRCodeLoginCGIBlock:0x0]
 15340 ms  -[MMLoginViewController getQRCodeViewController]
 15342 ms  -[MMLoginViewController getQRCodeViewController]
 15342 ms  -[MMLoginQRCodeViewController showLoadingQRCode]
 15342 ms  -[QRCodeLoginLogic getQRCode]
 15342 ms     | -[QRCodeLoginLogic setupQRCodeCGI]
 15343 ms     |    | -[QRCodeLoginCGI setDidScannedQRCodeLoginCGIBlock:0x7ffee1751f58]
 15343 ms     |    | -[QRCodeLoginCGI setDidConfirmedQRCodeLoginCGIBlock:0x7ffee1751f80]
 15343 ms     |    | -[QRCodeLoginCGI setDidCancelQRCodeLoginCGIBlock:0x7ffee1751f08]
 15343 ms     |    | -[QRCodeLoginCGI setDidExpiredQRCodeLoginCGIBlock:0x7ffee1751f30]
 15343 ms     | -[QRCodeLoginCGI getQRCodeWithCompletion:0x7ffee1752000]
 15343 ms     |    | -[QRCodeLoginCGI stopCheckQRCodeTimer]
 15343 ms     |    |    | -[QRCodeLoginCGI checkQRCodeTimer]
 15431 ms  -[QRCodeLoginLogic didGetQRCodeLoginLogicBlock]
 15431 ms  -[QRCodeLoginLogic didGetQRCodeLoginLogicBlock]
 15432 ms  -[MMLoginViewController getQRCodeViewController]
 15432 ms  -[MMLoginQRCodeViewController updateQRCodeImage:0x6000033a8dc0]
 15432 ms  -[QRCodeLoginCGI stopQRCodeExpireTimer]
 15432 ms  -[QRCodeLoginCGI stopCheckQRCodeTimer]
 15432 ms     | -[QRCodeLoginCGI checkQRCodeTimer]
 15432 ms  -[QRCodeLoginCGI setCheckQRCodeTimer:0x60000079f640]
```

可以看到很多方法都得到了响应，那么就要分析分析啦。**updateQRCodeImage** 经过一通分析这个方法很显眼啊！引起了我们的注意，于是我们就去修改这个方法进行hook。

```
console.log("Type of arg[2] -> " + new ObjC.Object(args[2]).$className)
console.log("Type of arg[2] -> " + new ObjC.Object(args[2]))
```

添加如上2行代码，查看下参数类型再次执行并重新退出微信看输出信息

`frida-trace -m "-[*Login* *QR*]" 微信`

得到以下输出

```
Type of arg[2] -> NSImage
Type of arg[2] -> <NSImage 0x6000033a8640 Size={185, 185} RepProvider=<NSImageArrayRepProvider: 0x60000079e3a0, reps:(
    "NSBitmapImageRep 0x600002db7e20 Size={185, 185} ColorSpace=(not yet loaded) BPS=8 BPP=(not yet loaded) Pixels=185x185 Alpha=YES Planar=NO Format=(not yet loaded) CurrentBacking=nil (faulting) CGImageSource=0x60000040cde0"
)>>
```

类型是NSImage，那么到这基本就结束了。他就是个图片对象，我们只需要把图片保存到本地就结束了。添加以下代码：

```
var nSImage = new ObjC.Object(args[2]);
var data = nSImage.TIFFRepresentation();
var qrfile = new File("/Users/n/Downloads/qr.png", "wb")
qrfile.write(Memory.readByteArray(data.bytes(), data.length()));
qrfile.flush();
qrfile.close();
```

然后再次运行看看能不能生成这个文件，如下。

![image-20210217104610795](https://gitee.com/ekukuku/docimg/raw/master/20210217104610.png)

#### 文章完结
