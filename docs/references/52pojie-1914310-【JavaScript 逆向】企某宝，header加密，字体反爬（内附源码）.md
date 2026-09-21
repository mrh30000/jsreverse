# 【JavaScript 逆向】企某宝，header加密，字体反爬（内附源码）

> **作者**: Behind1 | **发布时间**: 2024-04-16 16:15:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8327 / 33
> **原文**: [https://www.52pojie.cn/thread-1914310-1-1.html](https://www.52pojie.cn/thread-1914310-1-1.html)

---

### 声明

> ​                **本文章中所有内容仅供研究、学习交流使用，不能用作其他任何目的，严禁用于商业用途和非法用途，否则一切后果自负，与作者无关。如有侵权请联系作者删除文章**

### 一、字体反爬

​        字体反爬是一种防止网站被爬虫程序正常解析和抓取数据的技术。在字体反爬中，网站的文本内容会被转换成图片，而这些图片的文本内容则使用特定的字体文件进行渲染。爬虫程序在抓取网站内容时无法直接解析这些图片中的文本，从而使得爬虫程序无法有效地获取网站的内容信息。这种技术通常被用于保护网站内容不被恶意抓取或盗用。通俗来说就是网页源代码显示的内容和网页上显示的内容不一样！无法直接通过解析html获取到正确的内容。

### 二、案例分析

> aHR0cHM6Ly93d3cucWl4aW4uY29tL2NvbXBhbnkvY2Q3ODQwNTAtOTgyOC00MzhjLWE3NmEtN2FlOGFlNTdlZWMx

![](https://attach.52pojie.cn/forum/202404/16/162058cdezkmmna0venmhz.png)

![](https://attach.52pojie.cn/forum/202404/16/162101tbk2lt88vn9bdtz9.png)

通过抓包对比数据发现在网页上显示正常,在源码里面看到的是其他字符。

再打开**网络字体** 可以看到请求了几个字体文件

![](https://attach.52pojie.cn/forum/202404/16/162103vpepg4me6e6g2fgh.png)

通过软件搜索我们发现，`政`字其实在浏览器源代码中显示的是`江`字，我们需要找到他的字体映射关系[b]。

![](https://attach.52pojie.cn/forum/202404/16/162105buh0hjkb5bxgkcji.png)

![](https://attach.52pojie.cn/forum/202404/16/162107w1nkedtkwe8yjxj4.png)

通过`fontTools`可以获取到解析出的字典，当然还可以输出xml进行查看。

`cmap`：是字符编码（ 如Unicode 编码）到字形索引的映射关系。

`glyf`:包含了字体中所有字形的具体轮廓数据,也就是在浏览器渲染的内容

```
from fontTools.ttLib import TTFont
font = TTFont('c.woff2')
font.saveXML('c.xml')
cmap = font["cmap"].getBestCmap()
print(cmap)
```

输出内容如下（`code`被解析成 10 进制的数值）：

```
{48: 'uni4E66', 49: 'uni7C7B', 50: 'uni6570', 51: 'uni67E5', 56: 'uni4F1A', 57: 'uni8FB9'.... 40857: 'uni5E38'}
```

通过对比发现这个网站的一些字体code与name相互对应的。

我们找到上面提到的政：

`政`字代表的 `code` 就是 `0x653f`（十六进制表示法，表示的是Unicode编码中的字符）

对应的 `name` 就是 `uni5C4B`  转码过后也就是`江`（其中 uni 表示它使用的是 Unicode 编码，`5C4B` 为编码值）

接下来我们就手写一个实现映射

### 三、获取映射

汉字转换的

```
def get_unicode_code(chinese_char, cmap):
    byte_code = chinese_char.encode('utf-16be')
    hex_code = byte_code.hex()
    num = int(hex_code, 16)
    try:
        return cmap[num]
    except:
        return

def get_chinese_char(unicode_code):
    return chr(int(unicode_code, 16))

def map_chinese(data: str, cmap: dict):
    """
    将字符串中的中文字符进行映射
    :param data: 需要映射的字符串
    :param cmap: Unicode编码的映射关系字典
    :return: 映射后的字符串
    """
    parse_data = ''
    for char in data:
        unicode_code = get_unicode_code(char, cmap=cmap)
        if unicode_code:
            unicode_code = unicode_code.replace("uni", "")
            char = get_chinese_char(unicode_code)

        parse_data += char
    return parse_data
```

还有一个数字的映射

```
def get_map_data(cmap: dict):
    """
    将字符串中的中文字符进行映射
    :param cmap: Unicode编码的映射关系字典
    :return: 映射后的字符串
    """
    map_data = {chr(k): chr(int(v.replace("uni", ""), 16)) for k, v in cmap.items()}
    return map_data

def map_num(res: str, camp: dict):
    map_data = get_map_data(camp)
    for i in res:
        if i in list(map_data.keys()):
            res = res.replace(i, map_data[i])
    return res
```

![](https://attach.52pojie.cn/forum/202404/16/162110zc8m048lmnw8423y.png)

**测试结果**：

![](https://attach.52pojie.cn/forum/202404/16/162112bbi3nhxh280a0whh.png)

> **这里说一下网站会动态生成 woff，导致我们不能固定一份字体映射关系，需要每次请求动态生成映射，所以每次都需要解析**

### 四、headers加密

涉及到翻页的接口都会有这个加密：

`key`和`value`都是加密的,不好搜索可以通过xhr断点中找堆栈，这里可以直接搜索`e.headers[`

![](https://attach.52pojie.cn/forum/202404/16/162114jz5l3k5sxc5ccxxt.png)

![](https://attach.52pojie.cn/forum/202404/16/162116bfu3f6vqzu5jvm4x.png)

找到位置基本就直接秒了，

这里的js我们直接用py还原

```
def rse(e, t):
    r = e.lower()
    n = r + r
    a = ""
    for i in range(len(n)):
        s = ord(n[i]) % t["n"]
        a += t["codes"][str(s)]
    # print(a)
    return a

def getKey(aa):
    # aa = "接口小写了"
    sse = {
        "createdTime": "2024-03-01T18:41:57+08:00",
        "n": 20,
        "codes": {
            "0": "u",
            "1": "6",
            "2": "y",
            "3": "4",
            "4": "U",
            "5": "M",
            "6": "X",
            "7": "P",
            "8": "N",
            "9": "L",
            "10": "v",
            "11": "t",
            "12": "S",
            "13": "i",
            "14": "s",
            "15": "V",
            "16": "p",
            "17": "i",
            "18": "C",
            "19": "E"
        }
    }
    return rse(aa, sse)
```

`Q3(a, s).toString()` 找到位置进行测试发现是标准加密。

![](https://attach.52pojie.cn/forum/202404/16/162118dsw0ty69vystw07c.png)

![](https://attach.52pojie.cn/forum/202404/16/162120jpji7tjzc2bfrkmt.png)

```
def get_header(url):
    key = getKey(url).encode('utf-8')
    message = url.encode('utf-8')
    key_ = hmac.new(key, message, hashlib.sha256).digest().hex()[:5]
    value_ = hmac.new(key, message + '{}'.encode('utf-8'), hashlib.sha256).digest().hex()
    return key_, value_
```

### 五、总结

![](https://attach.52pojie.cn/forum/202404/16/162122xk6k6v99bgj88e8s.png)

**本篇的字体反扒还是比较简单，有些不仅是编码变化，而且是字体形状也有变化，有些需要使用模型识别来还原字体加密等遇到了再说。
此刻大功告成！到这里本次分享就结束了，感谢大家的耐心阅读！如有讲解不到位或者讲解错误的地方,还请各位大佬在评论区多多指教,共同进步！**
