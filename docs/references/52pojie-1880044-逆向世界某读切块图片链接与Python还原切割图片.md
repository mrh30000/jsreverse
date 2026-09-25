# 逆向世界某读切块图片链接与Python还原切割图片

> **作者**: T4DNA | **发布时间**: 2024-01-13 10:20:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4880 / 73
> **原文**: [https://www.52pojie.cn/thread-1880044-1-1.html](https://www.52pojie.cn/thread-1880044-1-1.html)

---

*本帖最后由 T4DNA 于 2024-1-13 15:28 编辑*

### 免责声明

1、本贴仅作为技术讨论，本人不会利用以下技术盈利、或从事任何侵害该网站的行为。
**2、如觉得此贴不妥，请联系本人将第一时间删除。**

### 背景

网站链接："aHR0cHM6Ly9hcHAucmVhZG9vci5jbi9hcHAvZHQvcGQvMTU2NTgzNzEzOT9zPTE="

背景：

该网站是某某电子书平台，展示的电子书效果是分割图片在前端页面还原，也是一个老生常谈的反爬措施了。

与龙X期刊的整齐5\*5方快，或是XX学堂5\*1乱序不同，该网站采用了新颖的（对我来说）不规则方块（乱序）。

![](https://attach.52pojie.cn/forum/202401/13/102017cxqh0e7we2q72z8x.png)

### 逆向过程

吸取了https://www.52pojie.cn/thread-1871407-1-1.html的教训，我们先盘逻辑，再谈解密。

#### 请求逻辑

刷新页面，查看图片，他是以Img标签载入HTML的，通过CSS排列位置，所以首要任务是拿到Img的src是如何生成与其对应的位置信息。

![](https://attach.52pojie.cn/forum/202401/13/100820nm61lhqi9cbfu9q3.png)

查看网络，第一个引人注意的是这个addPageToDom字面意思，是加载页面的函数。进入，下断点，在网页上进入下一页。

![](https://attach.52pojie.cn/forum/202401/13/100822p1f4310fzk036cee.png)

![](https://attach.52pojie.cn/forum/202401/13/100824hx5dv9bfif26255n.png)

可以看到rt\_page\_html\_array已经是写好准备创建的html对象，包含了所有图片链接，那么目标就是他如何生成，看到这儿我们可以发现这位非常老实，函数名和变量名都没有混淆，所以直接搜索即可。

![](https://attach.52pojie.cn/forum/202401/13/100827ncm2n2nmmn9k7dmn.png)

继续搜索rt\_addPage、rt\_getPageBlock直到打上断点后看到未经修饰的链接，说明你找到了

![](https://attach.52pojie.cn/forum/202401/13/100829njp369zznzw4weu7.png)

![](https://attach.52pojie.cn/forum/202401/13/100831z5sa5fkkpubhg55p.png)

名字太直白，显然第二个PAGE\_LEVEL\_HIGH是更高质量的分割图片获取，它们都调用了一个getPageURLForCutModel01，这也太直白了，就是获取1类分割图片的页面链接（这个帖子要变成英语翻译了）。

![](https://attach.52pojie.cn/forum/202401/13/100739pi662zq46fd44rb2.png)

![](https://attach.52pojie.cn/forum/202401/13/100742l0e60k44k745f4qa.png)

图片位置则是在pageCutMode01\_hJson\_arr中存储，而图片链接是crc32直接算出来的。

![](https://attach.52pojie.cn/forum/202401/13/100745tsisznj1afoxeeds.png)

![](https://attach.52pojie.cn/forum/202401/13/100748pt53vw8ivkziivwv.png)

最后就是一个pageCutMode01\_hJson\_arr了，是一个AES解密，bookjson获取到的数据就是加密后的。

![](https://attach.52pojie.cn/forum/202401/13/100750fla1r7020d50l55a.png)

![](https://attach.52pojie.cn/forum/202401/13/103544jz6vh49rla6hwm8u.png)

#### 流程

![](https://attach.52pojie.cn/forum/202401/13/100756giorbi3ubifliiz4.png)

### Python还原

#### AES解析BookInfo获取分割图片位置信息

```
var pageKey = book_json.book_identifier + book_json.company_identifier;
if (pageKey.length > 16) {
    pageKey = pageKey.substring(0, 16);
}
pageKey = CryptoJS.enc.Latin1.parse(pageKey);//密钥
var iv = CryptoJS.enc.Latin1.parse(pageKey);//与密钥保持一致
```

注意要把book\_identifier和company\_identifier拼接的Key削减为标准的16位，否则不是标准的AES key长度。

```
AESKey = response['book_identifier'] + response['company_identifier']
AESKey = AESKey[0:16] if len(AESKey) > 16 else AESKey
key_bytes = AESKey.encode('latin-1')
```

此处AES加密模式是CBC，ZeroPadding，Python一样写

![](https://attach.52pojie.cn/forum/202401/13/100758cycuuwsa6va3w99g.png)

```
from Crypto.Cipher import AES
cipher = AES.new(key_bytes, AES.MODE_CBC, iv=key_bytes)
decrypted = cipher.decrypt(base64.b64decode(ciphertext))
decrypted = ''.join([chr(i) for i in decrypted if i != 0 ])
```

然后我们就成功获得了坐标Json decrypted，当然要json.loads()一下，使其成为json对象。

![](https://attach.52pojie.cn/forum/202401/13/100800bx0yx3qndvdqpphn.png)

#### 非标准Crc获取分割图片链接

```
for (var iStr in infoJson) {
    if (iStr == "h" || iStr == "w") continue;
    pagePicsURLArray["pics"][iStr] = new Array();
    pagePicsURLArray["pics"][iStr]["url"] = picsBaseURL + crcForPageCutMode01(book_json.book_identifier + "_" + (level + 1) + "_" + pageNo + "_" + iStr) + ".jpg";
    pagePicsURLArray["pics"][iStr]["coordinate"] = infoJson[iStr];
}
```

level+1可以写死，最高等级,iStr是infoJson的每个Key，其实也就是分割的0、1、2、3、4、5几个数字。

![](https://attach.52pojie.cn/forum/202401/13/100802wdwcyj6ykcc23uc2.png)

首先断下一个Js的crcForPageCutMode01函数，看看在浏览器的表现如何。

![](https://attach.52pojie.cn/forum/202401/13/100807xwirir4xoxx35fzd.png)

Crc32是常见的hash算法，同样的输入不会出现两个结果，这个f03e3a2f就是我们的标准值。首先用Python内置的binascii库调用一下标准的Crc32。

![](https://attach.52pojie.cn/forum/202401/13/100804e330zzqxcz8yv5xv.png)

与浏览器不同，这说明可能使用了非标准的处理，我们进去crcForPageCutMode01与标准的Crc32对比看看。

```
function crcForPageCutMode01(Instr) {
    if (typeof (window.Crc32Table) == "undefined") {
        window.Crc32Table = new Array(256);
        var i, j;
        var Crc;
        for (i = 0; i < 256; i++) {
            Crc = i;
            for (j = 0; j < 8; j++) {
                if (Crc & 1)
                    Crc = ((Crc >> 1) & 0x7FFFFFFF) ^ 0xEDB88320;
                else
                    Crc = ((Crc >> 1) & 0x7FFFFFFF);
            }
            Crc32Table[i] = Crc;
        }
    }
    if (typeof Instr != "string") Instr = "" + Instr;
    Crc = 0xFFFFFFFF;
    for (i = 0; i < Instr.length; i++)
        Crc = ((Crc >> 8) & 0x00FFFFFF) ^ Crc32Table[(Crc & 0xFF) ^ Instr.charCodeAt(i)];
    Crc ^= 0xFFFFFFFF;
    Crc = (Crc ^ (-1)) >>> 0
    return (Crc).toString(16);
}
```

与标准的Crc32对比，其实就是多了一句Crc = (Crc ^ (-1)) >>> 0。

/>>>是Javascript的无符号右移运算符，在这儿>>> 0 将前面的数强制转为无符号32位整数，但是Python中没有直接的无符号右移。

我们可以使用& 0xffffffff 确保值在无符号32位整数范围内。

所以我们在标准的Crc32后，先进行这一步，再转成16进制字符串即可。

```
import binascii

a = '491721607cf2ca_2_1_0'
b = binascii.crc32(a.encode())
b = (b ^ (-1)) & 0xFFFFFFFF >> 0
b = format(b, 'x')
print(b)
```

获得目标值f03e3a2f，把它封装到Python的crcForPageCutMode01函数就可了。

![](https://attach.52pojie.cn/forum/202401/13/100809oen0mgfnev0gwg8m.png)

同时PageData中每一个整图片总大小w、h，分块的位置x，y后续拼接图片是需要的，那么我们都放入result中，最终获得了如图result。

```
for i in PageData.keys():
    result[i] = {}
    for j in PageData[i].keys():
        if j == 'w' or j == 'h':
            result[i][j] = PageData[i][j]
        else:
            result[i][j] = {
                'place': (PageData[i][j]['x'], PageData[i][j]['y']),
                'Link': picsBaseURL + crcForPageCutMode01(response['book_identifier'] + "_3_" + i + "_" + j) + ".jpg"
                }
```

![](https://attach.52pojie.cn/forum/202401/13/100811yn2io778nr5oao73.png)

#### Python分割图片的还原

终于我们获得了每个分割图片的链接、和图片在整个图片的位置，接下来我们用PIL实现分离图片的合并。

requests请求图片链接获取图片的二进制流，接下来要创建Image对象。因为Image.open()接受的是文件名，所以我们可以先把response.content存入字节流管道，再创建Image对象。

```
import requests
from PIL import Image
from io import BytesIO

response = requests.get(url, headers=headers).content
imageBlock = Image.open(BytesIO(response))
```

然后创建一个新的完整图片大小的空Image，也就是result中的h、w。

```
pic = Image.new("RGB", (data['w'], data['h']))
```

对每一个分块，用.paste方法加入pic指定位置中（也就是result中的place），最后保存到png中，最终获得完整、清晰的页面图片。

```
for j in data.keys():
    if j == 'w' or j == 'h':
        continue
    Link = data[j]['Link']
    imageData = getImage(Link)
    pic.paste(imageData, data[j]['place'])
pic.save(f'{bookid}/{i}.png')
```

![](https://attach.52pojie.cn/forum/202401/13/100814plewn7ncw9leu5bm.png)
