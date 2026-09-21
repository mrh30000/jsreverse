# 某网课平台m3u8 key解密算法分析以及python实现

> **作者**: Zizz | **发布时间**: 2023-10-20 17:01:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 15739 / 141
> **原文**: [https://www.52pojie.cn/thread-1846708-1-1.html](https://www.52pojie.cn/thread-1846708-1-1.html)

---

*本帖最后由 Zizz 于 2023-10-26 17:58 编辑*

目标：aHR0cHM6Ly9kYXRhbmcwMS55dW54dWV0YW5nLmNuLw==

播放任意一个视频，F12开发者工具找到keyurl的请求，响应结果中有一个encryptedVideoKey，应该是加密后的key

![](https://attach.52pojie.cn/forum/202310/20/160612s4szm5ru5t6h3msq.png)

然后来看一下js，不出意外应该是这个了。

![](https://attach.52pojie.cn/forum/202310/20/161151om0lccpu1humtqpq.png)

点进去搜索ctrl+F 搜索关键词decrypt，发下有90多个结果

![](https://attach.52pojie.cn/forum/202310/20/161643up4n9rm4rmm4697z.png)

一个个看太费劲了，搜prototype.decrypt（别问为什么搜这个，问就是 经验......）

![](https://attach.52pojie.cn/forum/202310/20/161844hsbub5lrw3snbham.png)

这样就舒服多了。

![](https://attach.52pojie.cn/forum/202310/20/162348hdlddhc7qq5qjkd5.png)

ModeOfOperationCBC.prototype.decrypt 这个方法比较像，最后返回的plaintext可能就是解密后的key。
所以在return plaintext处打个断点，然后刷新网页重新播放视频。

但是却没有像预期的那样断下来。显然不是这个并不是解密方法。

那我们就把所有的xxxx..prototype.decrypt方法都打上。重新刷新网页

![](https://attach.52pojie.cn/forum/202310/20/163836zpsn59wt1t11msup.png)

这一次在ModeOfOperationECB.prototype.decrypt处断了下来。

![](https://attach.52pojie.cn/forum/202310/20/164312rqxyj13j41i2yd54.png)

验证下plaintext是不是解密。
这里使用python将uint8Array转为十六进制字符串，代码如下

[Python] *纯文本查看*

```
Uint8Array = [113, 108, 67, 89, 72, 112, 78, 115, 88, 65, 70, 112, 102, 84, 51, 122]
hex_string = bytes(Uint8Array).hex() # 716c435948704e73584146706654337a
```

然后使用N\_m3u8DL下载：

![](https://attach.52pojie.cn/forum/202310/20/165530hqwi1o3u2jj5qqw8.png)

（这里十六进制key会被N\_m3u8DL自动Base64编码）

可以下载。

key解密位置已经找到。下面来分析一下key的具体解密算法以及如何使用python实现（便于批量下载）

![](https://static.52pojie.cn/static/image/hrline/1.gif)

回到刚才，我们看下调用堆栈紧挨着的这个匿名函数

![](https://attach.52pojie.cn/forum/202310/20/171438qsheobvelloljbb4.png)

点击进去：

![](https://attach.52pojie.cn/forum/202310/20/172536xstffcifsqqa7x6t.png)

这里我们看到了一些熟悉的东西，videoKeyId ， playerId，encryptedVideoKey。也就是keyurl返回的那些，
很显然，这段js代码就是整个加密key到解密key的算法。

下面来分析代码逻辑：
       var \_encryptedVideoKey = \_response.encryptedVideoKey;
       将keyrul返回的encryptedVideoKey取出来
       var \_key = \_aes2["default"].utils.utf8.toBytes("72Fhskjglp8qjpqx")
       将"72Fhskjglp8qjpqx"传给\_aes2["default"].utils.utf8.toBytes()方法生成\_key
       var \_aesEcb = new \_aes2["default"].ModeOfOperation.ecb(\_key)
       创建一个AES.ECB模式的加密器\_aesEcb，使用\_key进行初始化。
       var \_bbb = []
       for (var i = 0; i < \_encryptedVideoKey.length; i += 2) {
             \_bbb.push(parseInt(\_encryptedVideoKey *+ \_encryptedVideoKey[i + 1], 16)*
        }
       创建空数组\_bbb，将十六进制字符串encryptedVideoKey转为字节数组添加到\_bbb中
       var \_decryptedBytes = \_aesEcb.decrypt(\_bbb)
       使用\_aesEcb.decrypt方法对\_bbb解密得到解密后的key

这一段代码使用python实现：

写累了................
以为发布了可以设置成仅自己自己可见，好像并不行，那就先这样吧，有时间再继续写。
第一次写文章，真累![](https://static.52pojie.cn/static/image/smiley/laohu/laohu10.gif)

![](https://static.52pojie.cn/static/image/hrline/1.gif)

接着来看这部分代码：

[JavaScript] *纯文本查看*

```
var _encryptedVideoKey = _response.encryptedVideoKey;
// 将keyrul返回的encryptedVideoKey取出来

var _key = _aes2["default"].utils.utf8.toBytes("72Fhskjglp8qjpqx");
/* 将"72Fhskjglp8qjpqx"传给_aes2["default"].utils.utf8.toBytes()方法生成_key
   其实也就是将字符串72Fhskjglp8qjpqx转为字节 */

var _aesEcb = new _aes2["default"].ModeOfOperation.ecb(_key);
// 创建一个AES.ECB模式的加密器_aesEcb，使用_key进行初始化。

var _bbb = [];
for (var i = 0; i < _encryptedVideoKey.length; i += 2) {
     _bbb.push(parseInt(_encryptedVideoKey + _encryptedVideoKey[i + 1], 16)}
/* 创建空数组_bbb，将十六进制字符串encryptedVideoKey转为字节数组添加到_bbb中
   其实就是将十六进制字符串key切片成每两个字符一组，再将每组字符转为十六进制整数*/

var _decryptedBytes = _aesEcb.decrypt(_bbb);
var _decryptedText = _aes2["default"].utils.utf8.fromBytes(_decryptedBytes);
/* 调用刚刚的生成的加_aesEcb下的decrypt方法将_bbb解密。得到解密后的key。
   这个decypt方法也就是刚刚我们断下的ModeOfOperationECB.prototype.decrypt方法 */
```

python实现：

[Python] *纯文本查看*

```
_encryptedVideoKey  = '848e11b61279fd861d0b7d4805906ce4'
_key = list(b'72Fhskjglp8qjpqx')
aesEcb = ModeOfOperation(_key)
_bbb = []
for j in range(0,len(enc_key),2):
    _bbb.append(int(enc_key[j:j+2],16))
key_intArray = aesEcb.decrypt(_bbb)
decypt_key_str = bytes(key_intArray).decode('utf-8') # qlCYHpNsXAFpfT3z
```

缺什么找什么，
我们进入\_aes2["default"].ModeOfOperation.ecb方法(进入方法如下图，鼠标选中这个方法在弹出的页面点击FunctionLocation后面的链接)

![](https://attach.52pojie.cn/forum/202310/26/174742yzzalxednf0gleff.png)

可以看到它是一个类

![](https://attach.52pojie.cn/forum/202310/26/174904ld8xyf2efybmtzd4.png)

也就是我们我们刚刚代码里提到的，\_key实例化了这个ModeOfOperationECB类。然后又调用了ModeOfOperationECB类下的decrypt方法对\_bbb去解密。
我们先用python写一下相关代码，然后再去分析下一步。
此处python代码实现：

[Python] *纯文本查看*

```
class ModeOfOperation：
    def __init__(self,key):
        self.key=key
        self.aes =AES(self.key) # 这里的aes是另外一个类的实例化

    def decrypt(self,ciphertext):
        plaintext = [0] * len(ciphertext)
        block = [0] * 16
        for i in range(0, len(ciphertext), 16):
            copy_array(ciphertext, block, 0, i, i + 16)
            block = self.aes.decrypt(block)
            copy_array(block, plaintext, i)
        return plaintext

    def encrypt(self,ciphertext):
        pass
        # 用不到，不做分析

```

我们继续进入AES这个类内部。需要先在this.\_aes = new AES(key)处打个断点，再用上文的进入方法

![](https://attach.52pojie.cn/forum/202310/26/175104oiqyiwtb4qy0qzya.png)

AES内部：

![](https://attach.52pojie.cn/forum/202310/26/175148l475n1jf73nhb0pe.png)

![](https://attach.52pojie.cn/forum/202310/26/175222ef25q66qmefpiei6.png)

AES类下同样有很多方法\_prepare() ，encrypt ，decrypt等，其中只有一部分我们需要用到。

如：\_prepare()就是它的实例化方法（实际上它的作用就是生成this.\_Kd和this.\_Ke，后续解密需要用得到这两个参数），
         decrypt()方法实际上在ModeOfOperationECB类下的decrypt方法被调用。此处不贴图了，可以回头看一下上面的图片。

接下来就是用python去写AES类，过程太复杂，这里直接贴代码了。
其中涉及到的S，Si，T1-T8，U1-U4等常量，由于长度原因这里不贴出来了，js里都有。

[Python] *纯文本查看*

```
class AES:
    def __init__(self,key):
        self.key = key
        self.Ke = []
        self.Kd = []
        self.prepare()

    def prepare(self):
        key_len = len(self.key)
        rounds = 10
        for i in range(11):
            self.Ke.append([0, 0, 0, 0])
            self.Kd.append([0, 0, 0, 0])
        roundKeyCount = 44
        kc = 4
        tk = convert_to_int32(self.key)
        index = None
        for i in range(kc):
            index = i >> 2
            self.Ke[index][i % 4] = tk[i]
            self.Kd[rounds - index][i % 4] = tk[i]
        rconpointer = 0
        t = kc
        tt = None
        while t < roundKeyCount:
            tt = tk[kc - 1]
            tk[0] ^= S[tt >> 16 & 255] << 24 ^ S[tt >> 8 & 255] << 16 ^ S[tt & 255] << 8 ^ S[tt >> 24 & 255] ^ rcon[rconpointer] << 24
            rconpointer += 1
            if kc != 8:
                for _i in range(1, kc):
                    tk[_i] ^= tk[_i - 1]
            else:
                for _i2 in range(1, kc // 2):
                    tk[_i2] ^= tk[_i2 - 1]

                tt = tk[kc // 2 - 1]
                tk[kc // 2] ^= S[tt & 255] ^ S[tt >> 8 & 255] << 8 ^ S[tt >> 16 & 255] << 16 ^ S[tt >> 24 & 255] << 24

                for _i3 in range(kc // 2 + 1, kc):
                    tk[_i3] ^= tk[_i3 - 1]

            i = 0
            r = None
            c = None

            while i < kc and t < roundKeyCount:
                r = t >> 2
                c = t % 4
                self.Ke[r][c] = tk[i]
                self.Kd[rounds - r][c] = tk[i]
                i += 1
                t += 1
        for r in range(1, rounds):
            for c in range(4):
                tt = self.Kd[r][c]
                self.Kd[r][c] = U1[tt >> 24 & 255] ^ U2[tt >> 16 & 255] ^ U3[tt >> 8 & 255] ^ U4[tt & 255]
        # 这里字节序原因会导致与js生成的结果不一致，但是不影响最终计算

    def decrypt(self,ciphertext):
        rounds = len(self.Kd) - 1
        a = [0, 0, 0, 0]
        t = convert_to_int32(ciphertext)

        for i in range(4):
            t[i] ^= self.Kd[0][i]

        for r in range(1, rounds):
            for i in range(4):
                a[i] = T5[t[i] >> 24 & 255] ^ T6[t[(i + 3) % 4] >> 16 & 255] ^ T7[t[(i + 2) % 4] >> 8 & 255] ^ T8[t[(i + 1) % 4] & 255] ^ self.Kd[r][i]
            t = a[:]

        result = [0] * 16
        tt = None

        for i in range(4):
            tt = self.Kd[rounds][i]
            result[4 * i] = (Si[t[i] >> 24 & 255] ^ tt >> 24) & 255
            result[4 * i + 1] = (Si[t[(i + 3) % 4] >> 16 & 255] ^ tt >> 16) & 255
            result[4 * i + 2] = (Si[t[(i + 2) % 4] >> 8 & 255] ^ tt >> 8) & 255
            result[4 * i + 3] = (Si[t[(i + 1) % 4] & 255] ^ tt) & 255

        return result
```

最终结果验证：

![](https://attach.52pojie.cn/forum/202310/26/175751gimn0skeeeekcc8w.png)
