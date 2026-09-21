# 解密m3u8文件 , ts文件解密 , hls 解密.

> **作者**: mr清扬 | **发布时间**: 2019-06-04 14:58:00 | **版块**: 『编程语言区』 | **查看/回复**: 60902 / 261
> **原文**: [https://www.52pojie.cn/thread-971265-1-1.html](https://www.52pojie.cn/thread-971265-1-1.html)

---

*本帖最后由 mr清扬 于 2019-6-4 16:01 编辑*

分析某视频网址时, 使用的是苹果hls协议,也就是ts切片.
现在很多付费视频也是使用协议,
然后利用aes加密.即使你下载了. 没有解密也看不了

![](https://attach.52pojie.cn/forum/201906/04/144046qe2er27rn5su1fc3.png)

手动下载文件,打开直接报错. ts文件是可以直接播放, 报错 肯定用了加密

![](https://attach.52pojie.cn/forum/201906/04/144120f521pjdpj1d5zro1.png)

查看 m3u8文件. 可以看到使用了 aes-cbc-128加密.
每个ts 文件都单独进行加密. 每播放一次ts文件都要 调用 aes 进行解密.
aes-cbc-128 文件解密很简单. 只需要 密钥(key) 和 (偏移量)iv
强调一次!!! 没有key 和 IV 你能解密 ts文件的话
清华北大 任你选
下载key文件, 丢winhex里, 查看16进制key.

![](https://attach.52pojie.cn/forum/201906/04/144117we2i9avvebvipkeb.png)

偏移量(IV) 在m3u8文件里.

![](https://attach.52pojie.cn/forum/201906/04/145026w2enee5kufjf827n.png)

linux下: 我把 待解密文件 丢系统根目录.
shell 命令: openssl aes-128-cbc -d -in 000.ts -out fileSequence0\_decrypto.ts -nosalt -iv 03db44e74c19e9df04f59c9ff45e7090 -K A0B104918D826543148C60B4365C4121
解密成功,没有任何提示.
然后打开 解密成功的 ts文件

![](https://attach.52pojie.cn/forum/201906/04/145441gj6hjouk9cubb77r.png)

可以看到解密成功.
这只是aes-128-cbc的第一步, 也是最简单的一步
剩下的其他步, 需要理解 aes-128-cbc 算法的原理, 然后再进行解密.
有点复杂, 需要写一个完整的算法...有空再写

好像挺多人需要解密软件. 需求大的话. 我再写个基于 c++界面的解密软件.
