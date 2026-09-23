# 某小程序修复及发送参数，header头和返回参数加解密逆向

> **作者**: mysticz | **发布时间**: 2025-09-05 14:21:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3106 / 8
> **原文**: [https://www.52pojie.cn/thread-2058182-1-1.html](https://www.52pojie.cn/thread-2058182-1-1.html)

---

前言
小程序：54m55p2l55S1

今天我们看一个小程序的解密。大体流程跟js逆向一样。

小程序修复
我们先解包小程序，解包就用网上开源的解包插件即可。

小程序位置位于微信文件下的Applet处

![](https://attach.52pojie.cn/forum/202509/05/141637xdrcyrtpdudtallb.png)

小程序位置
即相对上图的

D:\ToolInstall\Wechat File\WeChat Files\Applet

解包后打开微信开发者工具导入。

![](https://attach.52pojie.cn/forum/202509/05/141705qvi3l8b8vvxmi388.png)

错误
可以看到在图处报了一个错误componentFramework字段，应为exparser。

"componentFramework": {
    "allUsed": [
      "exparser"
    ],
    "default": "exparser"
  }
原因是这段写法是旧版的，我们按说明改成新版就行。

"componentFramework":"glass-easel",
接下来报了网络错误

![](https://attach.52pojie.cn/forum/202509/05/141725gyjyl7r7hyd9ui6w.png)

网络错误
此时我们勾选上，不校验合法域名。再次编译

发现此时页面空白，并显示[获取文件失败] 以下文件已被配置忽略打包上传，模拟器无法获取

我们进入project.config.json文件。在"setting"中添加

"ignoreUploadUnusedFiles": false,
"ignoreDevUnusedFiles": false

![](https://attach.52pojie.cn/forum/202509/05/141747onx8lhlgttbw28kh.png)

添加
添加保存完后。我们关闭开发者工具箱，在重新启动。

进来后就可以看到修复好的小程序了。

返回参数解密

![](https://attach.52pojie.cn/forum/202509/05/141809l5q0cz2hv44vcvfu.png)

加密参数
我们可以看到页面往下拉，只有这一个api在返回数据。

并且返回的data是个加密的参数。

我们看他的调用栈

![](https://attach.52pojie.cn/forum/202509/05/141826h9x1b9u44b3xb79c.png)

调用栈
点进去最后一个，发现是R点出来的send函数。那么我们可以看出来R就是XMLHttpRequest。我们直接在当前文件下的R.response处下断点。点击执行，就断到了加密参数返回处

![](https://attach.52pojie.cn/forum/202509/05/141857rimimy6bv191z4ss.png)

加密参数返回处
我们往下跟栈。跟到他的回调处。可以看到代码取了数据里面的data参数

c = l.encrypt.aes.teldAESDecrypt({
    data: o.data,
    aType: r.url.aType
}
看表意应该是aes解密。我们点进去函数。

AESDecrypt: function(e) {
    var t = e.data
      , r = e.key
      , n = e.iv
      , a = e.aType
      , i = void 0 === a ? this.aType.token : a
      , p = this.getKI(i);
    return r && (p.key = this.padEnd(r.toString(), 16, "0")),
    n && (p.iv = n),
    p.key = c.CryptoJS.enc.Utf8.parse(p.key),
    p.iv = c.CryptoJS.enc.Utf8.parse(p.iv),
    c.CryptoJS.AES.decrypt(t, p.key, {
        iv: p.iv,
        mode: c.CryptoJS.mode.CBC,
        padding: c.CryptoJS.pad.Pkcs7
    }).toString(c.CryptoJS.enc.Utf8)
}
teldAESDecrypt: function(e) {
    var t = e.data
      , r = (e.key,
    e.iv,
    e.aType)
      , n = y.encrypt.aes.AESDecrypt({
        data: t,
        aType: r
    })
      , a = JSON.parse(n);
    return n = y.encrypt.aes.AESDecrypt({
        data: a.Data,
        key: a.UTS,
        iv: a.UVER,
        aType: r
    }),
    n = JSON.parse(n)
}
可以看到取了加密值，在取了一个aType类型值。然后传入了一个AESDecrypt函数，在函数里，对aType进行了一次判断，并取出key,iv。最终传入decrypt取值。

再把计算后的值JSON话，在取里面的UTS和UVER做key和iv，在进行一轮解密得出解密值。

那么思路理清了，我们就在nodejs中写。

我们直接导入库,并调用

const CryptoJS = require('crypto-js');
key = CryptoJS.enc.Utf8.parse(key)
iv = CryptoJS.enc.Utf8.parse(iv);
data=CryptoJS.AES.decrypt(data, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
}).toString(CryptoJS.enc.Utf8)
JSON.parse(data)
可以看到第一次解密已经成功

![](https://attach.52pojie.cn/forum/202509/05/141919i03sj9bmnwg66oy9.png)

第一次解密
我们在进行第二次解密，把UTS和UVER赋值key和iv

key = CryptoJS.enc.Utf8.parse(UTS)
iv = CryptoJS.enc.Utf8.parse(UVER);
data=CryptoJS.AES.decrypt(data, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
}).toString(CryptoJS.enc.Utf8)
JSON.parse(data)
解密完，在解压缩，此时就可以看到完整的数据

![](https://attach.52pojie.cn/forum/202509/05/141935rcsxqc7cimsbs1il.png)

完整的数据
headers及参数加密
接下来，我们接着看发送的数据包及header头

![](https://attach.52pojie.cn/forum/202509/05/141948c3s2z8z35riuuh38.png)

加密参数
可以看到header里面有Teld-RequestID参数是加密的

数据包里面有UTS，UVER，Data，X-Token，STS，SVER,SSDI七个加密参数

我们通过参数大概看一下Teld-RequestID参数是SSDI加时间戳及一个文本而来。UTS，UVER，Data参数是我们刚才解密时候用到的一样。

我们搜索.SVER

![](https://attach.52pojie.cn/forum/202509/05/142003i10hoo7o4x8nnlnh.png)

SVER
可以看到只有一个结果，我们点进去，打上断点。

![](https://attach.52pojie.cn/forum/202509/05/142021ha94fnfafdfe20rz.png)

原始数据
可以看到，原始数据是一个json数组，里面传入了一个经度和纬度，然后代码获取设备id。在传入aes加密得到Data参数。

SVER是一个固定文本和时间戳，传入aes加密后取0到16位字符得到的。

STS就是时间戳。SSDI就是设备id，我们随便伪造一个即可。

X-Token参数是数据返回的值。

至此我们所有参数都明确了从何而来。那么直接写代码调用。

我们传入经纬度及伪造的设备id。输出加密数据

![](https://attach.52pojie.cn/forum/202509/05/142038mjtt6tji8j2r5248.png)

输出加密数据
发送加密数据。可以看到返回正确的响应数据。

![](https://attach.52pojie.cn/forum/202509/05/142054o542serl422cv252.png)

响应数据
