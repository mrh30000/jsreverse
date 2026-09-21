# 巨量算数response解密[jsvmp]

> **作者**: shanel | **发布时间**: 2023-12-05 19:41:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6914 / 48
> **原文**: [https://www.52pojie.cn/thread-1865657-1-1.html](https://www.52pojie.cn/thread-1865657-1-1.html)

---

*本帖最后由 shanel 于 2023-12-5 19:45 编辑*

众所周知。巨量现在的response大多数都是以加密后的数据在本地解析；
抓包：

![](https://attach.52pojie.cn/forum/202312/05/194245vnu3dw1y43xpusvx.png)

可以看到该接口的返回值是一串加密数据，那么开始解这条response。
调试过程省略。。。
最终定位到下面的代码中：

![](https://attach.52pojie.cn/forum/202312/05/194015o4w73p0pvww3b9tp.png)

可以看到这是一个vmp，但是和字节之前通用的vmp有点不一样，就叫他小vmp吧
从该vmp中分析得出解密过程：

![](https://attach.52pojie.cn/forum/202312/05/194410qu3xgh7v65585kvy.png)

结果：

![](https://attach.52pojie.cn/forum/202312/05/194426uj2xaocyxjf7r0k0.png)

逆向结束

总结：这个vmp虽然小，但是执行量巨大，我的电脑跑崩了无数次，所以调试的时候需要耐心点，清除无用的数据；
