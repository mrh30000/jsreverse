# 某音平台某浪新版key解密 play_licenses

> **作者**: baswcss | **发布时间**: 2023-03-01 12:38:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 9971 / 72
> **原文**: [https://www.52pojie.cn/thread-1752497-1-1.html](https://www.52pojie.cn/thread-1752497-1-1.html)

---

如果需要浏览器登录，请替换4511.9ebd881e.js中返回内容，把===q.M5.DESKTOP替换成！==q.M5.DESKTOP即可实现浏览器登录，

![](https://attach.52pojie.cn/forum/202303/01/123615asr2vhfetxa1eg62.png)

这样好方便抓包测试
JS如何替换请搜索其它教程，论坛很多。

某浪此次更新只更新了KEY算法，之前直接是M3U8地址中返回，
此次更新了M3U8中的key直接从此 https://i.snssdk.com/video/drm/v1/play\_licenses经过POST后返回的数据中解密得出，
如返回
{"play\_licenses":{"v02b01g10000ce1uus3c17ubg7pcona0":{"6391ef701c39fcb11f2cc5d40102b01b":"muZOqFO3H6hTiHKVa9t3xGvYcZub"}},"base\_resp":{"code":0,"message":"success"}}

![](https://attach.52pojie.cn/forum/202303/01/123820t4g8hgwwzygy8a4n.png)

需要的是muZOqFO3H6hTiHKVa9t3xGvYcZub解密成16位即可，因版权原因具体算法不能公开发布，所以自行调试得出。
