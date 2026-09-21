# Python分析破解js——AES加密

> **作者**: 老飞机 | **发布时间**: 2020-04-08 22:42:00 | **版块**: 『编程语言区』 | **查看/回复**: 4621 / 9
> **原文**: [https://www.52pojie.cn/thread-1151791-1-1.html](https://www.52pojie.cn/thread-1151791-1-1.html)

---

*本帖最后由 老飞机 于 2020-4-12 11:51 编辑*

  开头*空两格*![](https://static.52pojie.cn/static/image/smiley/default/10.gif)*讲究*。
           **用*Python*进行某龙猫网数据接口加密[破解](https://www.52pojie.cn)，*post*请求参数加密处理**

 进入正题：

    第一步：我们打开network找到短片的url模块

![](https://attach.52pojie.cn/forum/202004/08/215414ugb8yhwpubi8gbwg.png)

--------------------------------------------------------------------------------------------------------------

**第二步****：**可以看到，抓包抓到的响应数据是加密的，请求的**params**参数也是加密了para

![](https://attach.52pojie.cn/forum/202004/08/220130ebwkwhx4mzb09mh8.png)

--------------------------------------------------------------------------------------------------------------
**第三步：**现在摆在我们眼前的数据已近很明显了，接下来按住***ctrl+shift+f***调出全局搜索框。直接搜索它的网站后半截：**Shortfilm/lists**

![](https://attach.52pojie.cn/forum/202004/08/220645es8ppypoigsxzxxk.png)

--------------------------------------------------------------------------------------------------------------
第四步：进去js文件可以看到一大堆的接口文件，不知道它是干啥的

![](https://attach.52pojie.cn/forum/202004/08/221134x5v5o73fugn7grgf.png)

不管它，我们往上翻一点，惊喜的发现了key和iv

[PHP] *纯文本查看*

```
l =c.a.enc.Utf8.parse("625202f9149e061d")
 u=c.a.enc.Utf8.parse("5efd3f6060e20330");
加密方法：AES/CBC/Pkcs7Padding/Hex
```

![](https://attach.52pojie.cn/forum/202004/08/222822qqgwjj1qe5zzpcmj.png)

--------------------------------------------------------------------------------------------------------------
第五步：既然知道了秘钥和偏移，我们试试把params参数解密试试

[PHP] *纯文本查看*

```
加密前：0DB0A472B06172ED60E35371ABA83D8182AB92B58ADA52C1B746643210B40C883E568A3D29C202D1AE82952434E4029DE1C6121A29315B3815FEBCCAB4C06D8F

解密后：{"kind_id":"","page":1,"label_id":"","writer_id":"","date":""}
```

![](https://attach.52pojie.cn/forum/202004/08/222116vrd1ejsz6zro7661.png)

可以看到一点问题也没有。为了保险起见，我们打上断点。可以看到这个就是params参数的原型了

![](https://attach.52pojie.cn/forum/202004/08/222202m0qqe3mqjbf26xzx.png)

--------------------------------------------------------------------------------------------------------------
**第六步：**既然这样，我们用***Python*** 代码请求一下，也是没有问题

![](https://attach.52pojie.cn/forum/202004/08/222517ozzuq5hl8l9h58qs.png)

解密代码：

[Python] *纯文本查看*

```
from Crypto.Cipher import AES
from binascii import b2a_hex, a2b_hex
from cryptography.hazmat.primitives import padding
import requests, hashlib, json, jsonpath, re, codecs
from cryptography.hazmat.primitives.ciphers import algorithms

'''
AES/CBC/PKCS7Padding 加密解密
环境需求:
pip3 install pycryptodome
'''

class PrpCrypt(object):

    def __init__(self):
        self.key = '625202f9149e061d'.encode('utf-8')
        self.mode = AES.MODE_CBC
        self.iv = b'5efd3f6060e20330'
        # block_size 128位

    # 加密函数，如果text不足16位就用空格补足为16位，
    # 如果大于16但是不是16的倍数，那就补足为16的倍数。
    def encrypt(self, text):
        cryptor = AES.new(self.key, self.mode, self.iv)
        text = text.encode('utf-8')

        # 这里密钥key 长度必须为16（AES-128）,24（AES-192）,或者32 （AES-256）Bytes 长度
        # 目前AES-128 足够目前使用

        text = self.pkcs7_padding(text)

        self.ciphertext = cryptor.encrypt(text)

        # 因为AES加密时候得到的字符串不一定是ascii字符集的，输出到终端或者保存时候可能存在问题
        # 所以这里统一把加密后的字符串转化为16进制字符串
        return b2a_hex(self.ciphertext).decode().upper()

    @staticmethod
    def pkcs7_padding(data):
        if not isinstance(data, bytes):
            data = data.encode()

        padder = padding.PKCS7(algorithms.AES.block_size).padder()

        padded_data = padder.update(data) + padder.finalize()

        return padded_data

    # 解密后，去掉补足的空格用strip() 去掉
    def decrypt(self, text):
        #  偏移量'iv'
        cryptor = AES.new(self.key, self.mode, self.iv)
        plain_text = cryptor.decrypt(a2b_hex(text))
        # return plain_text.rstrip('\0')
        return bytes.decode(plain_text).rstrip("\x01"). \
            rstrip("\x02").rstrip("\x03").rstrip("\x04").rstrip("\x05"). \
            rstrip("\x06").rstrip("\x07").rstrip("\x08").rstrip("\x09"). \
            rstrip("\x0a").rstrip("\x0b").rstrip("\x0c").rstrip("\x0d"). \
            rstrip("\x0e").rstrip("\x0f").rstrip("\x10")

# 加解密
if __name__ == '__main__':
    pc = PrpCrypt()
    a = '{"kind_id":"","page":1,"label_id":"","writer_id":"","date":""}'
    print("加密前：%s" % a)
    b = pc.encrypt(a)
    print("加密后：%s" % b)
    print("大写变小写：%s" % b.lower())
    v = pc.decrypt('0DB0A472B06172ED60E35371ABA83D8182AB92B58ADA52C1B746643210B40C883E568A3D29C202D1AE82952434E4029DE1C6121A29315B3815FEBCCAB4C06D8F')
    print('解密后',v)
```

 ***最后，总结：***

[PHP] *纯文本查看*

```
加密方法：AES/CBC/PKCS7Padding/Hex

秘钥：625202f9149e061d

偏移： 5efd3f6060e20330
```

***爬虫代码在我的Github仓库：***
***https://github.com/zg10472580/Python-Chinchilla\_net***
