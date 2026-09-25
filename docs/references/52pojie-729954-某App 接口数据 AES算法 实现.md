# 某App 接口数据 AES算法 实现

> **作者**: Vvvvvoid | **发布时间**: 2018-04-23 14:11:00 | **版块**: 『移动安全区』 | **查看/回复**: 13001 / 28
> **原文**: [https://www.52pojie.cn/thread-729954-1-1.html](https://www.52pojie.cn/thread-729954-1-1.html)

---

偶然发现一快很犀利的app,
想自己去用Java调用实现
抓包一看 发现响应数据全被加密了
responseBody 全是英文数字一大堆

![](https://attach.52pojie.cn/forum/201804/23/134442u317blr3cwocuccc.png)

jadx 打开apk, 搜索接口名getVersion
找到这个class

![](https://attach.52pojie.cn/forum/201804/23/134501c4ghmueehm44nseg.png)

搜索引用这个变量的地方

![](https://attach.52pojie.cn/forum/201804/23/134522ykuzb1sxkkz117sl.png)

看起来 就是这个 接着 跟进去 , 进入 这个方法

![](https://attach.52pojie.cn/forum/201804/23/134553p9hs9geeccscsssg.png)

果然 ,AES加密 ,Constant 是个常量类,  点进去 就可以看到 AES加密 所需要的 密文 跟 偏移了

![](https://attach.52pojie.cn/forum/201804/23/134553hpzbxwppupxkpyiu.png)

因为android 跟 java 的互通性
把apk中 AesEncryptionUtil 这个类 直接复制倒java里 稍微改改 就可以用了

![](https://attach.52pojie.cn/forum/201804/23/134842b8vh3bvvhcchhjhh.png)

解密过程 也简单 ,AES 之后 将byte集合 转换为16进制 然后 toString(), 所以 结果看起来 全是 英文字母

接下来就是 java的实现了

![](https://attach.52pojie.cn/forum/201804/23/135159pqkau52fpckcfpb3.png)

解密 成功 , 之后就可以 接口 一个一个的抓包 并 实现了
