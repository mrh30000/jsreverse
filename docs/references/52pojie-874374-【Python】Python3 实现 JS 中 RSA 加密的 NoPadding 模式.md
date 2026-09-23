# 【Python】Python3 实现 JS 中 RSA 加密的 NoPadding 模式

> **作者**: 辣丝丝小白菜 | **发布时间**: 2019-02-20 23:08:00 | **版块**: 『编程语言区』 | **查看/回复**: 7700 / 6
> **原文**: [https://www.52pojie.cn/thread-874374-1-1.html](https://www.52pojie.cn/thread-874374-1-1.html)

---

*本帖最后由 niie 于 2019-2-20 23:17 编辑*

### 前因后果之哗啦啦废话连篇：

这几天本人在 Python 做某网站登陆的时候，发现其登陆时用户名和密码被加密了

F12 仔细看了一下，发现是调用了一个 js 的 rsa 加密库，页面 dom 中有 rsa 公钥

于是乎，用了 3 分钟刷刷的潇洒的写了个 py 脚本，结果对比后傻眼了。。。

web 页面调用 js 库中的加密方式是 nopadding，也就是说，每次加密的结果都一样

而我的 py 脚本每次都不一样！！至于为什么会不一样，以及 padding 的作用请自行百度

于是乎，百度各种 python 库，也没有合适的解决方法

python 库 Crypto 倒是有一个网友给出了方法，但是安装这个库需要安装 **Microsoft Visual C++ Build Tools**

滚蛋，强行绑架的感觉，还是自己想办法搞定吧。

于是乎...

### 爆肝研究 RSA 大法

先分析了两个主要 js 文件，Bigint.js 、Barrett.js ，一脸懵逼，一头雾水，不知道再干嘛，仿佛在造一些轮子。。。暂且放过

然后找到了一篇介绍 rsa 加密中 padding 的文章：<https://blog.csdn.net/guyongqiangx/article/details/74930951>

主要知道了一个事情：

**"填充后数据" = "00" + "数据块类型" + "填充字符串" + "00" + "原始数据"**

然后又翻看了 python 的 rsa 库源码，其中有一个函数 `_pad_for_encryption()` ，很可疑，正是在做上述填充数据的事：

此函数位于 python 的 rsa 库 /pkcs1.py 文件中

```
def _pad_for_encryption(message, target_length):
    r"""Pads the message for encryption, returning the padded message.

    :return: 00 02 RANDOM_DATA 00 MESSAGE

    >>> block = _pad_for_encryption(b'hello', 16)
    >>> len(block)
    16
    >>> block[0:2]
    b'\x00\x02'
    >>> block[-6:]
    b'\x00hello'

    """

    max_msglength = target_length - 11
    msglength = len(message)

    if msglength > max_msglength:
        raise OverflowError('%i bytes needed for message, but there is only'
                            ' space for %i' % (msglength, max_msglength))

    # Get random padding
    padding = b''
    padding_length = target_length - msglength - 3

    # We remove 0-bytes, so we'll end up with less padding than we've asked for,
    # so keep adding data until we're at the correct length.
    while len(padding) < padding_length:
        needed_bytes = padding_length - len(padding)

        # Always read at least 8 bytes more than we need, and trim off the rest
        # after removing the 0-bytes. This increases the chance of getting
        # enough bytes, especially when needed_bytes is small
        new_padding = os.urandom(needed_bytes + 5)
        new_padding = new_padding.replace(b'\x00', b'')
        padding = padding + new_padding[:needed_bytes]

    assert len(padding) == padding_length

    return b''.join([b'\x00\x02',
                     padding,
                     b'\x00',
                     message])
```

重点看 return 的数据，和上面所述的填充方法完全一致。

既然是 nopadding，那就把填充的值全部设置为**\x00**，填充方式也选**\x00**，把上述方法关键位置给改掉

完事，重新运行代码，加密后的数据确实不变了，每次都一样，但是和 web 页面中 js 库的还是不一样

突然想到，去看看这个 js 库的官方文档！！

找了又找，终于找到：<http://www.ohdave.com/rsa/>

介绍中有一个带注释版本 js 文件：<http://www.ohdave.com/rsa/RSA.js>

里面开头就介绍了 padding 的填充方式：

```
*      Plaintext In
*      ------------
*
*      d5 d4 d3 d2 d1 d0
*
*
*      NoPadding
*      ---------
*
*      00 00 00 00 00 00 00 00 00 /.../ 00 00 d0 d1 d2 d3 d4 d5
```

果然有猫腻，这里的实现，是把需要加密的字符串反转，然后其他位全部填充\x00

既然知道了具体的填充方法，那就再改动一下 python 的 rsa 库`_pad_for_encryption()`函数

果然

加密的结果和 web 中的 js 库加密的结果一样（使用相同的公钥）

最后撤销对 python 的 rsa 库文件修改，导入 rsa 库中的相关函数，封装成自己的函数，直接调用自己函数即可

当然，既然 nopadding 模式的搞定了，也可以搞定其他方式的填充了，但是本人暂时用不到，就没有再继续研究

有兴趣的可以自行研究

至此结束。。

### 后续

py 文件，js 文件上传 github，需要的自己去看 <https://github.com/founddev/evething/tree/master/rsa>
