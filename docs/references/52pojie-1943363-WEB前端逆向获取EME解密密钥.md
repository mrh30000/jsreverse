# WEB前端逆向获取EME解密密钥

> **作者**: scz | **发布时间**: 2024-07-12 15:17:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4736 / 16
> **原文**: [https://www.52pojie.cn/thread-1943363-1-1.html](https://www.52pojie.cn/thread-1943363-1-1.html)

---

```
创建: 2024-07-12 14:39
```

看了这篇，学了些新知识:

某瓜视频文件解密 - xifangczy [2024-07-01]

```
https://www.52pojie.cn/thread-1939664-1-1.html
```

本文在原作者基础上进一步技术探讨。

```
mp4info video.mp4
```

这一步，我没看到Bento4的信息，倒是用其他手段看到了，试举三例:

```
strings video.mp4 | grep Handler
```

---

```
exiftool -HandlerDescription video.mp4
```

---

```
ffprobe -v quiet -select_streams v:0 -show_entries stream_tags=handler_name -of default=noprint_wrappers=1:nokey=1 video.mp4
```

原作者注意到play\_licenses的响应中出现BASE64编码过的数据，假设js会用atob解码，拦截atob，断点命中后找到还原解密密钥的代码。原文写得很清楚，各步骤可以实际追随练手，推荐。

在此基础上，我多想了一些。

假设js解码密钥时，未用atob，用了自实现的BASE64解码函数，拦截atob无法命中。

假设目标服务器返回密钥时未用BASE64，比如用字节流的16进制表示，也能以可打印字符返回，解码时用自实现函数。

假设目标页面未用atob，且做了JS混淆，无法搜索特征字符串。

总之，把困难想得多一些，有无其他逆向工程手段？

考虑特定情形，假设目标网站用了DRM、EME、CDM这类技术:

```
DRM(Digital Rights Management)  数字版权管理
EME(Encrypted Media Extensions) 受保护的媒体扩展
CDM(Content Decryption Module)  内容解密模块
```

此时用油猴脚本直接拦截如下标准API:

```
navigator.requestMediaKeySystemAccess
MediaKeys.createSession
MediaKeySession.addEventListener
```

在调用栈回溯中或可直接找到eme.keys，即最终解密密钥。

就原作者所给示例而言，用油猴脚本注入如下代码:

```
(function() {
    let orig        = MediaKeySession.prototype.addEventListener;
    let func        = function () {
        if ( arguments.length === 2 && arguments[0] === "message" ) {
            debugger;
        }
        let ret = orig.apply( this, arguments );
        return ret;
    };
    func.prototype  = orig.prototype;
    func.toString   = orig.toString.bind( orig );
    MediaKeySession.prototype.addEventListener
                    = func;
})();
```

addEventListener命中时，在上一层栈帧中查看o.keys，即最终解密密钥。

本文并未否定原作者技术思路，只是进一步技术探讨，若谁碰上其他EME网站，不妨一试，方便的话，也请告诉我URL，便于验证、修正前述方案。
