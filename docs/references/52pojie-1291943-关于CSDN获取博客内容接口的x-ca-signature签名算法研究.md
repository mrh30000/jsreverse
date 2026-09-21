# 关于CSDN获取博客内容接口的x-ca-signature签名算法研究

> **作者**: wshuo | **发布时间**: 2020-10-27 12:00:00 | **版块**: 『编程语言区』 | **查看/回复**: 2498 / 3
> **原文**: [https://www.52pojie.cn/thread-1291943-1-1.html](https://www.52pojie.cn/thread-1291943-1-1.html)

---

#### 前言

[源码下载](https://wwx.lanzoux.com/i27Hfhrynub)
不知道怎么就不通过了，这篇文章放出去几个月了，然后突然告诉我不行了，所以我打算换个平台（至少不能在一棵树吊死），垃圾审核
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201027104324481.png#pic_center)
我最初想直接获取html博客，然后保存在本地，最后发布到别的博客平台，但是html直接爬取样式布局方面很不协调，所以我决定寻早我原始的markdown格式（我都是用markdown写的，而不是用富文本编辑器）

#### 接口

简单调试得到 `https://bizapi.csdn.net/blog-console-api/v3/editor/getArticle?id=109204774&model_type=` 这个接口
内容：
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201027105711103.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2Nob3V6aG91OTcwMQ==,size_16,color_FFFFFF,t_70#pic_center)
返回内容是`json`, 其中 `markdowncontent` 字段就是 **markdown**原始数据，简单访问一下，发现访问失败，但是我在请求头和响应头中发现了门道：
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201027110527832.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2Nob3V6aG91OTcwMQ==,size_16,color_FFFFFF,t_70#pic_center)
很明显是请求头中少东西了，经过研究，请求头中应带
![](https://img-blog.csdnimg.cn/20201027110710861.png#pic_center)
这几个东西，简单调试**js**发现`x-ca-key` 和 `x-ca-signature-headers`是一个常量，而通过名字也能明白，`x-ca-nonce`是每一次请求都需要从新生成的, 而 `x-ca-signature` 是一个经过`x-ca-nonce`和`url`结合的后加密后得到的，具体如何调试**js**我就不说了（比较复杂费时间），直接上代码

```
import hashlib
import hmac
from base64 import b64decode,b64encode
import random
import requests
import http.cookiejar as cookielib
from urllib.parse import urlparse

from get_all_article import get_all
import re

def createUuid():
    text = ""
    char_list = []
    for c in range(97,97+6):
        char_list.append(chr(c))
    for c in range(49,58):
        char_list.append(chr(c))
    for i in "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx":
        if i == "4":
            text += "4"
        elif i == "-":
            text += "-"
        else:
            text += random.choice(char_list)
    return text

def get_sign(uuid,url):
    s = urlparse(url)
    ekey = "9znpamsyl2c7cdrr9sas0le9vbc3r6ba".encode()
    to_enc = f"GET\n*/*\n\n\n\nx-ca-key:203803574\nx-ca-nonce:{uuid}\n{s.path+'?'+s.query[:-1]}".encode()
    sign = b64encode(hmac.new(ekey, to_enc, digestmod=hashlib.sha256).digest()).decode()
    return sign

def getArticleDetail(url):
    uuid = createUuid()
    sign = get_sign(uuid,url)
    headers = {}
    headers['x-ca-key'] = "203803574"
    headers['x-ca-nonce'] = uuid
    headers['x-ca-signature'] = sign
    headers['x-ca-signature-headers'] = "x-ca-key,x-ca-nonce"
    session = requests.session()

    session.cookies = cookielib.LWPCookieJar(filename='.cookie/csdn.txt')
    session.cookies.load()
    data = session.get(url,headers=headers).json()
    return data
```

这个代码主要看 `createUuid()` 和 `get_sign()` 俩函数，而他们分别对应的是请求头中的`x-ca-nonce`，`x-ca-signature` 字段，值得一提的是 `createUuid()`这个函数主要的格式正确，而不是特别严格的，我没有严格的按照js的算法去写，另外请求这个接口的时候需要带有 登陆后的**cookie**

#### 其他

我也写了微信扫码登陆自动保存**cookie**的脚本，还要获取所有文章**url**的脚本，我打包成压缩包了，有需要的可以下载
[源码](https://wwx.lanzoux.com/i27Hfhrynub)
你要使用的话需要先登陆，`login_csdn_qrcode.py` 为登陆脚本，`get_article_detail.py` 为下载**markdown**脚本
