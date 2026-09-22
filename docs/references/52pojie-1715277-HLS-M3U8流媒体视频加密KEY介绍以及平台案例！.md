# HLS-M3U8流媒体视频加密KEY介绍以及平台案例！

> **作者**: 48325619 | **发布时间**: 2022-11-18 23:51:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 9321 / 11
> **原文**: [https://www.52pojie.cn/thread-1715277-1-1.html](https://www.52pojie.cn/thread-1715277-1-1.html)

---

*本帖最后由 48325619 于 2022-11-19 07:37 编辑*

**首先介绍M3U8(M3U)**

M3U8其实是 HTTP Live Streaming（缩写为 HLS） 协议的部分内容，而 HLS (HTTP Live Streaming)是Apple的动态码率自适应技术。主要用于PC和Apple终端的音视频服务。包括m3u(8)的索引文件，TS媒体分片文件和key加密串文件。

M3U8文件内链接地址又分为绝对地址与相对地址，绝对地址即完整地址，相对地址依赖当前文件目录地址！媒体分片文件与key加密串文件有N多种，例如常见码流分片格式ts、m4s、bbts、mp4等，常见key加密串：key文件、网址、明文，同时部分key对应有IV值，增加加密强度！

以M3U8文件加密Ts码流分片为例：

```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-ALLOWCACHE:1
#EXT-X-KEY:METHOD=AES-128,URI="域名/e775250b62/4/e775250b62d01c179fb6370ae3759a34_1.key",IV=0x864267cc19f34ec1066e016e0da856ee
#EXTINF:10.000000,
https://域名/e775250b62/0/1234567890123/4/75/9a/34_1/e775250b62d01c179fb6370ae3759a34_1_0.ts?pid=1668781305998X1650713&device=desktop
```

其中#EXT-X-KEY:METHOD=AES-128,表示TS加密类型为AES-128,其中加密参数链接为”域名/e775250b62/4/e775250b62d01c179fb6370ae3759a34\_1.key”，对应IV为"0x864267cc19f34ec1066e016e0da856ee"
一般加密为JS混淆或wasm，通过上面M3U8文件内加密KEY参数进行逆向解密得到base64 key：vTXHSbdTixwRuG6ydfoD3A==

**加密算法模式：**

```
   ECB: 电码本模式（Electronic Codebook Book）
    CBC: 密码分组链接模式（Cipher Block Chaining）
    CTR: 计算器模式（Counter）
    CFB: 密码反馈模式（Cipher FeedBack）
    OFB: 输出反馈模式（Output FeedBack）
```

AES的工作模式体现在把明文块加密成密文块的过程中！

**AES填充方式：**

```
1.NoPadding
2.PKCS7Padding
3.ZeroPadding
4.AnsiX923
5.Iso10126
6.Iso97971
```

AES明文块拆分的长度固定为128bit，当一段长度不足128bit，或者超过128bit，但不是其倍数时，就没法把明文按128bit长度分成等长的明文块，这时候就需要对明文块进行填充，将其补齐为128bit！

**常见M3U8数字版权保护加密：**

**普通JS混淆、Wasm、Apple  FairPlay Drm、****优酷 Copyright DRM、Marlin DRM、爱奇艺BBTS、Google widevine、****vdocipher drm等等。。。**

```
Apple  FairPlay Drm：#EXT-X-KEY:METHOD=SAMPLE-AES,URI="skd://5652421",KEYFORMAT="com.apple.streamingkeydelivery",KEYFORMATVERSIONS="1"

保利威 Drm：#EXT-X-KEY:METHOD=AES-128,URI="网址/e775250b62/4/e775250b62d01c179fb6370ae3759a34_1.key",IV=0x864267cc19f34ec1066e016e0da856ee

气球云 Drm：#EXT-X-KEY:METHOD=AES-128,URI="网址/sdk_api/video/hls_clef/sd?resNo=2c531c09106e46469dd0ac6d00ab9d6a&token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJsZXZlbCI6InNkIiwicGxheUF1ZGlvIjpudWxsLCJubyI6IjJjNTMxYzA5MTA2ZTQ2NDY5ZGQwYWM2ZDAwYWI5ZDZhIiwianRpIjoiNmE0MTJkNWUtYzRhMC00MSIsInRpbWVzIjoxLCJleHAiOjE2Njg3OTIwNjcsImVuY3J5cHQiOjMsIm5hdGl2ZSI6MCwiaGxzQ2xlZkVuY3J5cHRWZXJzaW9uIjozfQ.I37KD6P3AbmUVzTZT9UWPdt49MZ9KCNozZVIwJ7aevU&ssl=1",IV=0xfe99ec584abfaae7ec901b2820b162b5

阿里云 Drm：#EXT-X-KEY:MEATHOD=AES-128,URI="Njk2NTAzZGEtOGMxZS00NjJkLWI5NTItMGQ3M2M4MDQzMjU5dW9wdlFNVGVxekxvTkJKOEhCQTVUa2REd0MvN3U1ZEJBQUFBQUFBQUFBQS9WcTJ2dTZXbGd4RkQwZEZYa3FCd2Q3Q1FjS1VHZEl0ZDF1YjdFVDRLQUZGMHlncDM2cVBF"

腾讯视频 Google Widevine Drm：#EXT-X-KEY:METHOD=SAMPLE-AES-CTR,URI="data:text/plain;base64,AAAANnBzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAABYaB3RlbmNlbnQiC3owMDMyMWd1YmNq",KEYID=0x02DF301A8F3051D172B3695532391EA7,KEYFORMATVERSIONS="1",KEYFORMAT="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed"
```

本文不讨论解密key，仅做学习研究，禁止任何违反法律与道德的行为！欢迎各位大佬交流指点~