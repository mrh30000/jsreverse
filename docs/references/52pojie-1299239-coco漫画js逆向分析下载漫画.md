# coco漫画js逆向分析下载漫画

> **作者**: Amd794 | **发布时间**: 2020-11-08 14:54:00 | **版块**: 『编程语言区』 | **查看/回复**: 9058 / 8
> **原文**: [https://www.52pojie.cn/thread-1299239-1-1.html](https://www.52pojie.cn/thread-1299239-1-1.html)

---

*本帖最后由 Amd794 于 2020-12-14 22:19 编辑*

* **网站分析**

打开目标网站：https://www.cocomanhua.com/， 随便打开一部漫画： https://www.cocomanhua.com/10330/1/205.htmlF12 打开工具开始分析
![](https://image.amd794.com/912700fd2806e18cc5afeb173b18fcd9.png)

![](https://image.amd794.com/912700fd2806e18cc5afeb173b18fcd9.png)
先直接发送GET请求看是否可以拿到图片的下载链接

![](https://attach.52pojie.cn/forum/202011/14/125424ml2e49wpp7oat5t2.png)

![](https://image.amd794.com/76fae2d132383d8c65df675781b45457.png)
继续查看源代码， 找到突破口

![](https://attach.52pojie.cn/forum/202011/14/125515pe888zlc89zr8chr.png)

![](https://attach.52pojie.cn/forum/202011/14/125629azgjgi1zgujwjk13.png)

![](https://attach.52pojie.cn/forum/202011/14/125649poy3nbyn7knldhln.png)

![](https://attach.52pojie.cn/forum/202011/14/125700adgfj8jgfjwp70ad.png)

![](https://attach.52pojie.cn/forum/202011/14/125711mi5sgvs5giz54g45.png)

![](https://attach.52pojie.cn/forum/202011/14/125721gjgwlg7gwwj7v19g.png)

![](https://attach.52pojie.cn/forum/202011/14/125731kzjldijeedj4ppxj.png)

![](https://image.amd794.com/13383bfdeaee3b049fda27157fdfa652.png)
![](https://image.amd794.com/adac43fae4f483992a26b405ab69659d.png)
![](https://image.amd794.com/80ea21b85348fdb49a1b8e615bb841b8.png)
![](https://image.amd794.com/4cc46b8c36c88d641cce226a783efe90.png)
![](https://image.amd794.com/e6c630f849680bd5786f9c8fc23230cf.png)
![](https://image.amd794.com/cc9412602fa017ca4c9e21c38c4347b9.png)
![](https://image.amd794.com/2870b61cb4fadbdf518b2cd75fc9c027.png)
一直重复解密，最后得到一个名为mh\_info 的json数据

[JavaScript] *纯文本查看*

```
mh_info = {
  startimg: 1,
  enc_code1: "aVp6aWlITE1XcGJmSllMd0Z2NFhIZz09",
  mhid: "10330",
  enc_code2: "dzNaUXJ5SXFUangvNFZDQzZPdjRFSGpsMEVyYzdtTFdNMUsyR2pXcHIzWVRuTGxqZlVYTkFwenhxWENDajVrYXlvS0ZOQkV1T0w3N0pDTDFneHhkblpobkwyWWx4ank3c0tCZ3ZDUk05c1k9",
  mhname: "未婚爸爸",
  pageid: 2823662,
  pagename: "二十几个壮汉",
  pageurl: "1/205.html",
  readmode: 3,
  maxpreload: 5,
  defaultminline: 1,
  domain: "img.cocomanhua.com",
  manga_size: "",
  default_price: 0,
  price: 0
};
```

然后又发现两个加密的东西enc\_code1和enc\_code2 ，这两个是啥？有什么用呢？
到这里线索好像就断了没什么头绪那怎么办？我们再往下看看，有没有新的发现。
![](https://image.amd794.com/4e8d6f3821d235e69840e0b962d2ee3b.png)
再打个断点调试一下看看，发现有段字符串好像看到过。
![](https://image.amd794.com/90c1522d792c20559c9ed8ece310aaa0.png)
![](https://image.amd794.com/ba36826882d82a8d19cbcec17941d025.png)
两个字符串一模一样， 其中mh\_info[\_\_Oxa17db[0x1c3]]和mh\_onfo联系起来了，好像有那么一点思路了。可以得到图片得地址就是：

[JavaScript] *纯文本查看*

```
' + mh_info['domain'] + '/comic/'+  __cdecrypt(_0xad15x7c, CryptoJS[__Oxa17db[0x4f]][__Oxa17db[0x52]][__Oxa17db[0x51]](mh_info[__Oxa17db[0x1c3]]).toString(CryptoJS[__Oxa17db[0x4f]].Utf8)) + 0001.jpg
```

我们点击翻页， 看一下下一张图片得url链接：
![](https://image.amd794.com/5dcb859b6b9d7267509db8d718477770.png)

[JavaScript] *纯文本查看*

```
//img.cocomanhua.com/comic/10330/Z2hWczlBTFBwQzE2OW1hV2F3UW1LcnBrUzJiLzE2Wkw3YVdjc3FlOTZvYz0=/0002.jpg
```

只有后面得0001.jpg 变成了 0002.jpg , 可以得到规律，下一张图片得链接就是变成0003.jpg
回头再看看刚才获得得mh\_info 里面的数据只有一个stratimg，但是发现并不知道每一章节漫画你一共有多少张图片？回到渲染好得页面看下， 找下突破口。
![](https://image.amd794.com/1c99602a3eff3f21a8e7fcaeb1fd2d94.png)
![](https://image.amd794.com/7c6258d3d471309bb3ea00e559fd8411.png)
![](https://image.amd794.com/f607320f2f899ca739cae1b3909390fc.png)
![](https://image.amd794.com/fd242074d1cf0beaf1efaaece224360a.png)
得到结论，总的图片页数就是

[JavaScript] *纯文本查看*

```
if (typeof mh_info[__Ox97c0e[0x0]] == __Ox97c0e[0x1]) {
                totalImageCount = mh_info[__Ox97c0e[0x2]]
            } else {
                totalImageCount = parseInt(eval(base64[__Ox97c0e[0x4]](__Ox97c0e[0x3])))
            }
```

**获取图片下载链接**
整理一下思路就是 详情页---->获取C\_DATA---->mh\_info， 通过enc\_code2 获取img\_path, 通过enc\_code1获取到totalImageCount
开始扒mh\_info的代码
![](https://image.amd794.com/0c3aa260f5d4a96f62b43d5a3ad82877.png)
按照分析时候的套路扒到底后得到以下代码

[JavaScript] *纯文本查看*

```
var __READKEY = 'fw12558899ertyui';
        var DECRIPT_DATA;
        try {
            DECRIPT_DATA = __cdecrypt(__READKEY, CryptoJS.enc.Base64.parse(C_DATA).toString(CryptoJS.enc.Utf8));
        } catch (error) {
            DECRIPT_DATA = __cdecrypt("JRUIFMVJDIWE569j", CryptoJS.enc.Base64.parse(C_DATA).toString(CryptoJS.enc.Utf8));
        }
        eval(DECRIPT_DATA);
```

![](https://image.amd794.com/7a2c81d4cb97e9d2c31018a636ef8d70.png)
整理一下得到最后的代码

[Python] *纯文本查看*

```

var __READKEY = 'fw12558899ertyui';

function __cdecrypt(key, word) {
  var key = CryptoJS.enc.Utf8.parse(key);
  var decrypt = CryptoJS.AES.decrypt(word, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  });
  return CryptoJS.enc.Utf8.stringify(decrypt).toString()
};

function decode_data(C_DATA, key, default_key) {
  C_DATA = CryptoJS.enc.Base64.parse(C_DATA).toString(
      CryptoJS.enc.Utf8);
  try {
    C_DATA = __cdecrypt(key || __READKEY, C_DATA);
  } catch (e) {
    C_DATA = __cdecrypt(
        typeof default_key === 'string' ? default_key
            : "JRUIFMVJDIWE569j", C_DATA);
  }
  return C_DATA;
}
var image_info = eval(decode_data(C_DATA));
```

安装一下node环境，安装缺少解密需要的库文件，运行看下结果
![](https://image.amd794.com/4739755d99b27242f77428e65529159e.png)
获取img\_path， 开始扒代码
![](https://image.amd794.com/483d1cc043f623de46c12d55d4a94f12.png)
上面的函数整理一下大概的意思就是

[JavaScript] *纯文本查看*

```
__cdecrypt( __READKEY,CryptoJS.enc.Base64.parse(enc_code2).toString(CryptoJS.enc.Utf8))
```

不难发现其实就是上面的decode\_data函数， 所以最后就是

[Python] *纯文本查看*

```
decode_data(mh_info.enc_code2, "fw125gjdi9ertyui", "")
```

最后再扒一下获取totalImageCount的代码结束分析， 开始爬漫画。
![](https://image.amd794.com/b46066561cc7d627b987428007c4d18d.png)

[JavaScript] *纯文本查看*

```
var __READKEY = 'fw12558899ertyui';
                        var DECRIPT_DATA;
                        try {
                            DECRIPT_DATA = __cdecrypt(__READKEY, CryptoJS.enc.Base64.parse(mh_info.enc_code1).toString(CryptoJS.enc.Utf8));
                        } catch (error) {
                            DECRIPT_DATA = __cdecrypt("JRUIFMVJDIWE569j", CryptoJS.enc.Base64.parse(mh_info.enc_code1).toString(CryptoJS.enc.Utf8));
                        }
                        eval(DECRIPT_DATA);
```

整理一下就是

[JavaScript] *纯文本查看*

```
decode_data(mh_info.enc_code1)
```

最后就是合成完整的图片路径

[JavaScript] *纯文本查看*

```
var base_URL = 'https://www.cocomanhua.com/'
var chapter_image_base_path = base_URL.replace(/:\/\/.+/, '://')
    + mh_info.domain + "/comic/" + encodeURI(chapter_data .imgpath);
chapter_data.image_list = [];

for (; image_NO <= chapter_data.totalimg; image_NO++) {
  var image_url = chapter_image_base_path + (Array(4).join("0") + image_NO).slice(-4) + ".jpg";
  mh_info.image_list.push(image_url);
}
```

封装js代码完整运行一下代码看下结果
![](https://image.amd794.com/f35d494c7528a4d40f5eef90f57b0e45.png)
**开始爬取漫画**

[Python] *纯文本查看*

```
# !/usr/bin/python3
# -*- coding: utf-8 -*-
# Time    : 2020/10/28 15:35
# Author  : Amd794
# Email   : [url=mailto:2952277346@qq.com]2952277346@qq.com[/url]
# Github  : https://github.com/Amd794

import re

import execjs

from threading_download_images import get_response

class CoCoManHua(object):
    @staticmethod
    def _cocomanhua(detail_url):
        response = get_response(detail_url)
        data = re.findall('var C_DATA.*?\'(.*?)\'', response.text)[0]
        ctx = execjs.get().compile(open('../js/_cocomanhua.js', encoding='utf-8').read(), cwd='../js/node_modules')
        images_url = ctx.eval(f'getArr("{data}")')
        return images_url

if __name__ == '__main__':
    print(CoCoManHua._cocomanhua('https://www.cocomanhua.com/11701/1/188.html'))
```

先运行下代码看下能不能得到链接
![](https://image.amd794.com/fbcec719c2511e70137dc12a79ab0b67.png)
最后整合到主程序中运行看下效果
![](https://image.amd794.com/641ac9c1c433c75172612a919632e766.png)
测试运行一下
![](https://image.amd794.com/17e1a5ff8b667bb1e1fb4d436670e6c1.png)
![](https://image.amd794.com/a75fd7ecea6f425b610e66321098d095.png)&#8203;
完整代码：https://github.com/Amd794/kanleying
图片加载不出来可以看下：https://blog.amd794.com/blog/detail/12
