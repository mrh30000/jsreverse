# python 3 实现js中JSEncrypt encrypt方法，rsa模块根据字符串公钥生成加密字符串

> **作者**: 窗雨树雪 | **发布时间**: 2018-12-13 15:06:00 | **版块**: 『编程语言区』 | **查看/回复**: 6232 / 6
> **原文**: [https://www.52pojie.cn/thread-838247-1-1.html](https://www.52pojie.cn/thread-838247-1-1.html)

---

```
# coding=utf-8
import base64
import rsa

__all__ = ['rsa_encrypt']

def _str2key(s):
    # 对字符串解码
    b_str = base64.b64decode(s)

    if len(b_str) < 162:
        return False

    hex_str = ''

    # 按位转换成16进制
    for x in b_str:
        h = hex(x)[2:]
        h = h.rjust(2, '0')
        hex_str += h

    # 找到模数和指数的开头结束位置
    m_start = 29 * 2
    e_start = 159 * 2
    m_len = 128 * 2
    e_len = 3 * 2

    modulus = hex_str[m_start:m_start + m_len]
    exponent = hex_str[e_start:e_start + e_len]

    return modulus, exponent

def rsa_encrypt(s, pubkey_str):
    '''
    rsa加密
    :param s:
    :param pubkey_str:公钥
    :return:
    '''
    key = _str2key(pubkey_str)
    modulus = int(key[0], 16)
    exponent = int(key[1], 16)
    pubkey = rsa.PublicKey(modulus, exponent)
    return base64.b64encode(rsa.encrypt(s.encode(), pubkey)).decode()
```

使用时直接调用`rsa_encrypt(s, pubkey_str)`方法就好了，第一个参数为待加密字符串，第二个参数为公钥，返回值为加密后的字符串

其中\_str2key(s)方法是在<https://www.cnblogs.com/masako/p/7660418.html>这篇文章的基础上做了细微改动，可能是由于python版本问题，原文章中的代码在python3.7中无法直接使用
