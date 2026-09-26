# PC下frida注入30行代码让你拥有百万小程序未加密代码包

> **作者**: daimaguo | **发布时间**: 2020-12-23 17:02:00 | **版块**: 『编程语言区』 | **查看/回复**: 5003 / 13
> **原文**: [https://www.52pojie.cn/thread-1335742-1-1.html](https://www.52pojie.cn/thread-1335742-1-1.html)

---

*本帖最后由 daimaguo 于 2020-12-23 17:06 编辑*

本帖知识：frida注入，x32dbg简单应用，小程序包解密，小程序解包
系统环境及软件：
win764位
Python3.7
frida 14.2.2
x32dbg.exe
pc微信3.0.0.47
**鲁迅说：伟大的代码来自抄袭，不，是借鉴！**

![](https://attach.52pojie.cn/forum/202012/23/163652tgi52t5tngt9mtgn.jpg)

既然是要借鉴，那能拿到源码当然是最好的，今天就来分享下pc端如何获取微信小程序包，借鉴下别人是如何开发小程序的。
目前较多的方法是手机端获取，但需要root,也可以电脑安装模拟器搞，既然pc端支持小程序打开，并且拿到包后还需要在电脑上解包，为何不直接在电脑上获取更为方便（这段貌似很啰嗦）。
**但不巧的是PC端微信把小程序包给加密了**
当然可以直接写解密算法，既然鲁迅又说过：**所有加密都伴随着解密**。

![](https://attach.52pojie.cn/forum/202012/23/163849mqkjhz2ujz7fz7qk.jpg)

那何不直接获取到未加密的小程序包，所以便产生使用frida注入微信获取未加密小程序包的方法：
经过分析发现小程序包的加密算法在WeChatAppHost.dll 中的 EncryptBufToFile函数，那我们就来hook他，拿到未加密的源代码包。
这里发现前人早已造好了轮子：https://github.com/kksanyu/frida\_with\_wechat\_applet，但可惜的是偏移写死了，不支持目前的版本，也不知道源码里用的是哪个版本的微信，
这里我们可以借助x32dbg对微信进行分析，获取函数地址：

![](https://attach.52pojie.cn/forum/202012/23/164156w4mxdd7aqyqaxmuk.png)

但升级又会失效，翻阅了frida的api发现个findExportByName函数，因此我们需要对代码改造一番：
var EncryptBufToFile = baseAddr.add(0x1800F);
更改为：var EncryptBufToFile = Module.findExportByName('WeChatAppHost.dll','EncryptBufToFile');
完整hook代码如下：

[JavaScript] *纯文本查看*

```
/*
 *#Name 微信小程序PC版 wxapkg提取
 *#AuThor 代码果 基于 kksanyu 版修改
*/
var baseAddr = Module.findBaseAddress('WeChatAppHost.dll');
console.log('WeChatAppHost.dll baseAddr: ' + baseAddr);
if (baseAddr) {
        var EncryptBufToFile = Module.findExportByName('WeChatAppHost.dll','EncryptBufToFile');
    console.log('EncryptBufToFile 函数地址: ' + EncryptBufToFile);
    Interceptor.attach(EncryptBufToFile, {
        onEnter: function (args) {
            this.appId = ptr(args[0]).readPointer().readAnsiString();
            this.apkgFilePath = ptr(args[1]).readPointer().readAnsiString();
            this.originalData = Memory.readByteArray(args[2], args[3].toInt32());
        },
        onLeave: function (retval) {
            console.log('文件解密成功', this.apkgFilePath);
            var f = new File(this.apkgFilePath, 'wb');
            f.write(this.originalData);
            f.flush();
            f.close();
            delete this.appId;
            delete this.apkgFilePath;
            delete this.originalData;
        }
    });
} else {
    console.log('WeChatAppHost.dll 模块未加载, 请先打开界面中的小程序面板');
}
```

**我们来测试验证一下，安装frida这里啰嗦一下：** pip  install frida  pip install frida-tools 安装后我们hook下微信，先运行微信，点一下小程序面板，注意注入前清空下C:\Users\Administrator\Documents\WeChat Files\Applet目录。
cmd下运行 frida WeChat.exe -l hook.js，然后随便选一个你想学习的小程序，就可以看到结果了。

![](https://attach.52pojie.cn/forum/202012/23/164600lyy41zg6eafgng1a.png)

![](https://attach.52pojie.cn/forum/202012/23/164817mexdvmf2zdexawfk.png)

发现完美获取未加密的包，函数地址也和我们用x32dbg查看的一样。接下来就是解包的事情了，解包的教程方法很多，比如GitHub上xuedingmiaojun的解包版本，本帖就不再讨论了。
为了方便使用我搞了个工具，在cmd下运行是这个样子的，结果是一样：

![](https://attach.52pojie.cn/forum/202012/23/165127b25p2cd8gkizid88.png)

最后：听鲁迅的话，好好学习，别搞破坏！
