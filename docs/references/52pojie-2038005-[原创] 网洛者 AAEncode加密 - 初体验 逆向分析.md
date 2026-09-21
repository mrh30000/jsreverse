# [原创] 网洛者 AAEncode加密 - 初体验 逆向分析

> **作者**: ZenoMiao | **发布时间**: 2025-06-11 12:26:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2844 / 6
> **原文**: [https://www.52pojie.cn/thread-2038005-1-1.html](https://www.52pojie.cn/thread-2038005-1-1.html)

---

本次分析网站为aHR0cHM6Ly93YW5nbHVvemhlLmNvbS9jaGFsbGVuZ2UvMw==

![](https://attach.52pojie.cn/forum/202506/11/112051bjtas77ar7ustvsr.png)

开撸!!!

打开网站打开F12抓包, 然后进行翻页. 发现请求参数\_signature是加密参数, 然后直接全局搜索\_signature

![](https://attach.52pojie.cn/forum/202506/11/112633x8liqqmsu8fvqjw3.png)

发现一个名为get\_sign的函数入口, 应该就是加密函数了

![](https://attach.52pojie.cn/forum/202506/11/112821pssmjm26qmmmcmm7.png)

进去之后发现一大堆进行AAEncode的代码, 处理方法也很简单, 复制下来删除最后一对括号然后在console运行一下即可, JJEncode处理方法是一样的

处理完之后发现一堆代码就只有这一部分的代码是有用的, 他首先以时间戳为key, 构建了一个encrypted对象, 然后再用message + "|" + 13位时间戳的字符串进行DES加密去, message为请求的链接

![](https://attach.52pojie.cn/forum/202506/11/113526ewy4b41b8xexjzhx.png)

直接撸代码
先导入包然后构建crypto对象, key那边切片是因为des的key是八位数的所以要切片

[Python] *纯文本查看*

```

from Crypto.Cipher import DESfrom Crypto.Util.Padding import pad

    _time = int(time.time()) * 1000
    crypto = DES.new(key=str(_time)[:8].encode(), mode=DES.MODE_ECB)
```

然后进行加密对比一下跟网站的结果是否一样

[Python] *纯文本查看*

```

_signature = crypto.encrypt(pad(f'要加密的内容'.encode(), DES.block_size)).hex()
```

![](https://attach.52pojie.cn/forum/202506/11/114741qhy0f8nzzl6ryiy6.png)

![](https://attach.52pojie.cn/forum/202506/11/114803a0lwxb0t9w0kd25t.png)

结果一样就行了

打完收工!!!! 核心代码已经贴出来了, 其余代码自己撸哦

![](https://attach.52pojie.cn/forum/202506/11/122630gej7e3yecrpanore.png)
