# QQ音乐API签名算法分析

> **作者**: 初亦泽 | **发布时间**: 2020-12-21 17:50:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 14744 / 71
> **原文**: [https://www.52pojie.cn/thread-1334257-1-1.html](https://www.52pojie.cn/thread-1334257-1-1.html)

---

*本帖最后由 初亦泽 于 2021-1-3 16:44 编辑*

## 1、背景

不知道什么时候开始，各家音乐APP都开始对API进行加密，最近一段时间对六大音乐平台的加密算法进行了研究，逆向了网页端、安卓端等等，已经掌握了各家的加密算法。

| 平台 | 加密算法 | 非加密接口 | 专属资源 | 海外IP支持 |
| --- | --- | --- | --- | --- |
| QQ | MD5 | 存在，可完全替代加密接口 | 需要绿钻Cookie | 不支持，需要国内IP代{过}{滤}理 |
| KW | DES | 存在，可完全替代加密接口 | 不需要额外信息 | 支持 |
| KG | MD5 | 存在，不能完全替代加密接口 | 需要豪华会员Cookie | 不支持，需要国内IP代{过}{滤}理，或者在请求url后面加上area\_code=0 |
| WY | AES、RSA、MD5 | 存在，少数接口不能使用未加密接口，如登录 | 需要黑胶Cookie | 不支持，但可通过设置X-Real-IP规避 |
| MG | MD5 | 存在，可完全替代加密接口 | 不需要额外信息 | 支持 |
| XM | MD5 | 存在，可完全替代加密接口 | 不需要额外信息 | 不支持，需要国内IP代{过}{滤}理 |

## 2、QQ音乐sign计算

首先说明，所有加密接口都有非加密的替代接口，但是以后肯定是向加密接口发展，两个最基础的API是

```
https://u.y.qq.com/cgi-bin/musicu.fcg  支持加密和非加密
https://u.y.qq.com/cgi-bin/musics.fcg 仅支持加密
```

具体的下面的分析写在PDF里，可以从附件下载。

也可以看看在线版：<https://blog.csdn.net/qq_23594799/article/details/111477320>

![](https://static.52pojie.cn/static/image/filetype/zip.gif)

[QQ音乐API分析之-加密参数分析(sign计算).zip](https://www.52pojie.cn/forum.php?mod=attachment&aid=MjE2MjQ4N3xiNTlkNzA5MHwxNzg5ODkzMDQ2fDIzMjM3Mjd8MTMzNDI1Nw%3D%3D)
*(1.42 MB, 下载次数: 317)*
