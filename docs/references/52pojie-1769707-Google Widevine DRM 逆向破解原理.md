# Google Widevine DRM 逆向破解原理

> **作者**: 48325619 | **发布时间**: 2023-04-04 22:35:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2362 / 35
> **原文**: [https://www.52pojie.cn/thread-1769707-1-1.html](https://www.52pojie.cn/thread-1769707-1-1.html)

---

本人业余爱好，文章写的不够完善望大佬指导，轻喷哦，我会努力学习~
一、介绍
Google Widevine DRM 是谷歌旗下数字版权加密(DRM)解决方案，于2010年收购Widevine!Widevine DRM是一套完整的的数字版权加密系统，为各大厂商免费提供Widevine drm系统，用户端主要内置于Android系统以及各大浏览器，Android等，用于加密音视频资源流媒体传输，以达到视频不被传播，即使下载也无法正常观看，常见传输协议DASH、HLS、MSS以及CENC和CMAF~ 更多信息参考base64：aHR0cHM6Ly93d3cud2lkZXZpbmUuY29tLw==

二、原理
Widevine DRM分为三个级别的等级，分别为L3、L2、L1,其中L3最不安全，也是网络上存在[破解](https://www.52pojie.cn)工具最多的！
下面以L3介绍：
服务端在谷歌，当厂商使用Widevine DRM加密视频后会生成视频mpd文件，视频分片、kid与key、并创建许可证代{过}{滤}理服务器，mpd文件是XML格式，内包含视频信息以及请求时所需要的PSSH!

下面就是随机一个MPD文件内的pssh：

![](https://attach.52pojie.cn/forum/202304/04/220358d5ddj5ibdufn7u7s.png)

[XML] *纯文本查看*

```
<cenc:pssh>
      AAAAQHBzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAACAIARIQ8npD5kgfRJ21xDjHEqF34hoEa2t0diIEa2t0dg==
 </cenc:pssh>
```

当用户在播放器播放视频时会通过设备cdm device\_client\_id\_blob与device\_private\_key创建初始化信息，携带pssh生成验证令牌向代{过}{滤}理服务器请求，代{过}{滤}理服务器将请求发送Widevine许可证服务器，~
通过则返回解密视频所需要的key，即可正常解密观看视频~
浏览器请求代{过}{滤}理许可证服务器：

![](https://attach.52pojie.cn/forum/202304/04/221157a2k10z110hk308hs.png)

最终用python 模拟还原请求结果：

![](https://attach.52pojie.cn/forum/202304/04/220937i6g6a00xk60aat1a.png)

大家有疑问可以评论区留言，我会看的~
