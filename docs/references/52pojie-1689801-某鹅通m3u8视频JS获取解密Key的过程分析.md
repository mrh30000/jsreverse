# 某鹅通m3u8视频JS获取解密Key的过程分析

> **作者**: pengsx01 | **发布时间**: 2022-09-19 10:56:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 37617 / 271
> **原文**: [https://www.52pojie.cn/thread-1689801-1-1.html](https://www.52pojie.cn/thread-1689801-1-1.html)

---

*本帖最后由 pengsx01 于 2022-10-28 18:58 编辑*

前言

近期网页更新，m3u8链接也发生了变化，以前的很多工具都无法直接下载视频了，下面和大家分享一下新的m3u8文件获取AES加密key的过程。
本文下面描述部分链接会脱敏处理，不展示实际链接。
其m3u8的文件的链接特征如下：
**https://pri-cdn-tx.xiaoeknow.com/app\*\*\*\*\*193/private\_index/16630\*\*\*\*\*cxyn0.m3u8?sign=bd76\*\*\*\*\*57c6763&t=6326d139**

---

工具环境

**m3u8下载工具：**N\_m3u8DL-CLI (https://github.com/nilaoda/N\_m3u8DL-CLI)

---

分析过程

首先我们还是先拿到m3u8文件，有很多方法都能拿到m3u8文件，如图用控制台抓包获取链接

![](https://attach.52pojie.cn/forum/202209/19/101611jlj7kqzqlqakxkjq.png)

下载得到的m3u8文件的内容如下：

![](https://attach.52pojie.cn/forum/202209/19/101705n8src933z53lt00b.png)

用工具直接下载时会出现报错，这时分片信息的链接还不完整，ts分片的链接从控制台可以抓到，
样例URL是：**https://encrypt-k-vod.xet.tech/97\*\*\*\*\*26/18\*\*\*\*\*18/drm/v.f421220\_0.ts?start=276384&end=427551&type=mpegts&sign=e3\*\*\*\*\*\*c6&t=63\*\*\*96&us=nh\*\*\*sc&whref=v.\*\*\*\*\*.cn**，
将m3u8文件中ts分片的链接信息补充完整，样例如图：

![](https://attach.52pojie.cn/forum/202209/19/101707d45k5vyrvqq4vv4v.png)

用m3u8工具尝试下载视频，会再次出现报错，如图：

![](https://attach.52pojie.cn/forum/202209/19/101710ogq2kzqq153727bh.png)

从上面的报错中能发现，密钥获取失败。从文件的信息可以知道，加密方法是：**AES-128**，
KEY的获取URL是：**https://app.xiaoe-tech.com/xe.basic-platform.material-center.distribute.vod.pri.get/1.0.0?app\_id=app\*\*\*\*\*93&mid=m\_G\*\*\*\*\*MLH&urld=e29\*\*\*\*\*7f9**，
IV是：**0x00000000000000000000000000000000**。
这里是GET方式，我们尝试直接请求URL链接获取KEY，得到的结果如下：

![](https://attach.52pojie.cn/forum/202209/19/102420haija7nzn2b2piji.png)

到这里发现这个链接应该是缺少什么参数，打开控制台对源码搜索分析了一波，
搜索关键词：**xe.basic-platform.material-center.distribute.vod.pri.get**，
找到如下代码：

![](https://attach.52pojie.cn/forum/202209/19/102253zoppe2piwpjwe9w8.png)

上图能看出在发请求时在链接后拼接了一个&uid=windows.USERID，
这里windows.USERID的值是什么呢，由于是全局的常量，这里在控制台打印一下。
如图：

![](https://attach.52pojie.cn/forum/202209/19/102423qyt4gu4916l1ygol.png)

发现这个USERID就是我们看视频在那里飘来飘去的一串字符串。

这时候我们手动将上面的链接拼接完整，
示例为：**https://app.xiaoe-tech.com/xe.basic-platform.material-center.distribute.vod.pri.get/1.0.0?app\_id=app\*\*\*\*\*93&mid=m\_G\*\*\*\*\*MLH&urld=e29\*\*\*\*\*7f9&uid=u\_5f\*\*\*\*6f\_oR\*\*\*\*i5**，
放到浏览器试一下，结果如图：

![](https://attach.52pojie.cn/forum/202209/19/102425idn8rerwder0dhel.png)

看到这里看起来像是正常的响应了，下面写个简单的python脚本验证一下，代码如下：

[Python] *纯文本查看*

```
import requests

url = 'https://app.xiaoe-tech.com/xe.basic-platform.material-center.distribute.vod.pri.get/1.0.0?app_id=app*****93&mid=m_G*****MLH&urld=e29*****7f9&uid=u_5f****6f_oR****i5'
response = requests.get(url=url)
key = response.content
print(key)
print(list(key))
print(len(key))
```

控制台打印结果如下：

![](https://attach.52pojie.cn/forum/202209/19/102427k8anw6ovdhvrovto.png)

请求返回结果长度是16字节的bytes，看起来就是我们需要的key，那将m3u8文件里面的url拼上uid参数，再次放到下载工具测试一波。

![](https://attach.52pojie.cn/forum/202209/19/102429u03u13uxw94031uu.png)

看到这里发现，这事果然没那么简单。按网上的一些教程用python写了一个解密方法，对单独下载的一个ts分片进行解密，下面贴一下方法代码，

[Python] *纯文本查看*

```
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

def aes_decrypt(data, key, iv):
    new_data = pad(data_to_pad=data, block_size=AES.block_size)
    aes_d = AES.new(key, AES.MODE_CBC, iv)
    return aes_d.decrypt(new_data)
```

接口请求返回的这16字节长度的KEY依然无法解密视频，那这KEY应该是二次加密了。

那我们只能继续从源码去分析了。

经过几天的研究（不得不说混淆后的源码真难懂），搜索关键词**decryptdata**，在其下一步，如下地方打上断点（别问我怎么找到的，经过了很多次尝试），如图：

![](https://attach.52pojie.cn/forum/202209/19/102431tpkz8t6puurpktjt.png)

在这里发现了疑似解密的KEY和IV，将其复制出来，用上面描述的解密方法对下载的ts分片进行了解密测试，发现解密之后能正常播放。
由此得出结论：这里的bytes才是真实的解密KEY，上面接口请求得到的bytes确实经过二次加密。

[Python] *纯文本查看*

```
# 接口得到的KEY
[84, 108, 181, 86, 126, 236, 204, 25, 141, 70, 27, 121, 123, 48, 187, 33]
# 源码打断点得到的KEY
[33, 51, 128, 48, 28, 218, 170, 47, 233, 39, 120, 29, 78, 6, 221, 126]
```

看到这里大家就很好奇了，这个真实的KEY是怎么得到的呢！！！

我当时就挺难受的，还真的是二次加密了，抓了好多视频的两组KEY拿来做对比观察，发现没有明显的规律。

好吧，那只能继续看一堆混淆的代码去研究了。

这里再次回到上面说到的关键词**xe.basic-platform.material-center.distribute.vod.pri.get**，这里请求之后在某个地方肯定会对获得的结果进行处理，
在如下地方打上断点：

![](https://attach.52pojie.cn/forum/202209/19/102434ppsjroyrgrynlo9n.png)

打上断点之后需要刷新一下网页让代码停在断点处，单步跟进第一个断点，发现这里是发送请求的过程，请求接口得到KEY的值，这里的值会在下面使用，如图：

![](https://attach.52pojie.cn/forum/202209/19/102436ozo55e52uz45865e.png)

继续单步调试，这里能看出对USERID处理后得到了d的值，从代码来看，这一步其实就是将USERID字符串转成bytes字节数组，如图：

![](https://attach.52pojie.cn/forum/202209/19/102438xnnfv7mmue87iq3x.png)

继续跟进，发现调用了一个ccall函数，并且将两个数组都当参数传入了，我们继续跟进代码，分析其逻辑是创建一个很长的数组，
将传入的参数进行处理之后放进去，再利用方法反向操作取出对应的值，这里的f值就是一个初始的偏移量。
这应该是混淆对我们的干扰。如下：

![](https://attach.52pojie.cn/forum/202209/19/102440u8jgh0mntgggt2mg.png)

回顾上面传入的两个字节数组，
[84, 108, 181, 86, 126, 236, 204, 25, 141, 70, 27, 121, 123, 48, 187, 33]，
[117, 95, 53, 102, 98, 54, 102, 54, 100, 97, 99, 100, 53, 54, 102, 95, 111, 82, 98, 80, 122, 89, 53, 114, 105, 53]，
我们跟进代码发现在堆栈中，其取出了两个数组的第一个值，如图：

![](https://attach.52pojie.cn/forum/202209/19/102443v25ys6dis5npi57b.png)

看到这里猜测其应该是某种字节码注入技术，我对前端不是太懂，欢迎大佬评论区补充。
回到正题，这里取出之后做了一个i32.xor操作，然后得到了33的值，
如图：

![](https://attach.52pojie.cn/forum/202209/19/102445z11x7e7ipzcknz37.png)

细心的小伙伴们肯定已经发现了一点什么，
我们实际来解密的KEY是
[33, 51, 128, 48, 28, 218, 170, 47, 233, 39, 120, 29, 78, 6, 221, 126]，
上面得到的结果就是33！！！
是不是我们想的那样呢，我们继续跟进验证想法，如图：

![](https://attach.52pojie.cn/forum/202209/19/102447i1r5z8qvy8s5sivi.png)

![](https://attach.52pojie.cn/forum/202209/19/102449xffiqyy44yqy4qoi.png)

没错，就是我们想的那样子，这里的操作就是对两个数组进行循环，将两个数组取出来的值进行一个i32.xor操作就能得到我们需要的结果值。
查了一波i32.xor发现是**异或**操作，为了验证，写波代码测试一下，代码如下：

[Python] *纯文本查看*

```
url_key = [84, 108, 181, 86, 126, 236, 204, 25, 141, 70, 27, 121, 123, 48, 187, 33]
userid_bytes = [117, 95, 53, 102, 98, 54, 102, 54, 100, 97, 99, 100, 53, 54, 102, 95,
                111, 82, 98, 80, 122, 89, 53, 114, 105, 53]
# 目标:[33, 51, 128, 48, 28, 218, 170, 47, 233, 39, 120, 29, 78, 6, 221, 126]
result_key = []
for i in range(0, len(url_key)):
    result_key.append(url_key[i] ^ userid_bytes[i])
print(result_key)
```

---

结论

M3U8文件中的URL获取到的16位长度字节数组，与用户ID转化得到的字节数组的前16位依次做**异或**操作即可得到真实的解密KEY。
Python实现的通过URL获取解密KEY的代码如下：

[Python] *纯文本查看*

```
import requests
import base64

def get_key_from_url(url: str, userid: str) -> str:
    """
    通过请求m3u8文件中的key的url,获取解密视频key的base64字符串密钥
    :param url: m3u8文件中获取key的url
    :param userid: 用户id，放视频时飘动的那一串
    :return: key的base64字符串
    """
    # url拼接uid参数
    url += f'&uid={userid}'
    # 发送get请求
    rsp = requests.get(url=url)
    rsp_data = rsp.content
    if len(rsp_data) == 16:
        userid_bytes = bytes(userid.encode(encoding='utf-8'))
        result_list = []
        for index in range(0, len(rsp_data)):
            result_list.append(
                rsp_data[index] ^ userid_bytes[index])
        print(result_list)
        return base64.b64encode(bytes(result_list)).decode()
    else:
        print(f"获取异常，请求返回值：{rsp.text}")
        return ''

if __name__ == '__main__':
    _url = 'https://app.xiaoe-tech.com/xe.basic-platform.material-center.distribute.vod.pri.get/1.0.0?app_id=app****3&mid=m_G****t_3****H&urld=e****f9'
    _uid = 'u_5****f_o****5'
    base64_key = get_key_from_url(url=_url, userid=_uid)
    print(base64_key)
```

将获取到的密钥填入工具即可下载成功，如图：

![](https://attach.52pojie.cn/forum/202209/19/102452h7hb1151dd85by4l.png)

---

写在最后
**本文仅供研究学习使用，请勿用于非法用途。如有侵权，请联系管理员删除！
注：若转载请注明来源（本贴地址）与作者信息。**
