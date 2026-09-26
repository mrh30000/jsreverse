# 某云机so层aes key少了一位数

> **作者**: cure888 | **发布时间**: 2025-02-09 10:09:00 | **版块**: 『移动安全区』 | **查看/回复**: 992 / 2
> **原文**: [https://www.52pojie.cn/thread-2004752-1-1.html](https://www.52pojie.cn/thread-2004752-1-1.html)

---

*本帖最后由 cure888 于 2025-3-5 18:53 编辑*

**app下载链接(控制台atob)**

[JavaScript] *纯文本查看*

```
aHR0cHM6Ly9zeXN0YXRpYy5zaGFuZ3NoaXdsLmNvbS9oNXdlYi9jbG91ZHBob25lX2xhbmRfcGFnZS9pbmRleC5odG1sP2NoYW5uZWw9c3N5c2xfMjI4Ml8zOF8zNDAyXzM1MzBfOTY2NDk1X2Fk
```

java层路径: com.sswl.sdk.safe.SswlJNIUtils.aesEncrypt

![](https://attach.52pojie.cn/forum/202502/09/094034suvssquq2sumvbe2.png)

so文件名称 : libopensslSafeLib.so
方法偏移 : 88368

![](https://attach.52pojie.cn/forum/202502/09/100040zzoui46gi2onnom5.png)

![](https://attach.52pojie.cn/forum/202502/09/100644siimubmys35immsb.png)

key少了一位数，不知道什么原因，so层这个解密结果也打印不出来(技术不够)

[JavaScript] *纯文本查看*

```
function hook_native() {
    var libsswlcrypto = Module.findBaseAddress("libopensslSafeLib.so");
    var hsAddr = libsswlcrypto.add(0x88368);
    Interceptor.attach(hsAddr, {
        onEnter: function (args) {
            console.log("args[0]: " + args[0].readCString());
            console.log("args[1]: " + args[1].readCString());
            console.log("args[2]: " + args[2].readCString());
            console.log("args[3]: " + args[3].toInt32());
            console.log("args[4]: " + args[4].readCString());

        },
        onLeave: function (retval) {
        }
    });
}
```
