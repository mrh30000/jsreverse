# Python爬取网易云音乐播放地址

> **作者**: bbbbbd | **发布时间**: 2017-09-24 10:51:00 | **版块**: 『编程语言区』 | **查看/回复**: 15719 / 49
> **原文**: [https://www.52pojie.cn/thread-646878-1-1.html](https://www.52pojie.cn/thread-646878-1-1.html)

---

*本帖最后由 bbbbbd 于 2017-9-25 12:13 编辑*

Python爬取网易云音乐播放地址
运行环境：Python2.7

![](https://static.52pojie.cn/static/image/hrline/1.gif)
一、分析目标网站
首先打开网易云音乐的官网，在搜索列表中随便搜索一首歌曲，打开开发者工具开始分析请求地址，进过分析是采用的ajax，如下所示一步一步找的我们需要的信息，发现是post方式提交的信息，哎~竟然提交的参数进行了加密

![](https://attach.52pojie.cn/forum/201709/24/193722q5cdcbkaddazm11q.png)

![](https://attach.52pojie.cn/forum/201709/24/193722q8ytdo9k5h8dh81y.png)

![](https://attach.52pojie.cn/forum/201709/24/193723f0kky7m0fykh6fn1.png)

好吧，我们还是接着分析吧，发现他是通过后面这个js文件进行加密的，然后找到这个js文件，点开简直不忍直视都是压缩过的~0.0

![](https://attach.52pojie.cn/forum/201709/24/193723htvh9uvuuklk6wuj.png)

![](https://attach.52pojie.cn/forum/201709/24/193723brp9zpbcycrybllt.png)

接下来我们点开sources找到js文件，如下图进行操作，把js里的内容复制下来存到本地（后面要进行js调试）

![](https://attach.52pojie.cn/forum/201709/24/193723aq134zxkd14otzoo.png)

![](https://attach.52pojie.cn/forum/201709/24/193724umyqg262yyzimym2.png)

打开刚才复制下来的js代码，对其进行分析查找我们需要的提交参数params和encSecKey

![](https://attach.52pojie.cn/forum/201709/24/193724cv6v3mrjxyhuvmjw.png)

这里就是我们需要的信息，发现他是通过上面asrsea方法处理后得到的加密参数，并且这个函数需要4个参数，在这个方法的上面我们加入自己的调试代码以便于能在控制台看清楚这4个参数的真实面貌 那么这个asrsea到底在哪里呢？好吧，我们继续通过搜索功能把他定位到d函数，原来d函数就是我们要找的真正的加密参数的函数，对它进行分析发现是两次的aes加密，好了到这里我们貌似看到了曙光，嘻嘻~

![](https://attach.52pojie.cn/forum/201709/24/193724cfrhe6q1fj1ehqxx.png)

我们再进一步分析d中的i，他是通过a获取的随机16为字符串，既然这样我们可以把他替换成任意的16个字母或数字，这里我把他替换成16个F（那么刚才所说的第2参数对于我们来时就是一个常量了，经过多次观察3,4参数也是固定的（没用））

![](https://attach.52pojie.cn/forum/201709/24/193724u6g9geee4i6iqpii.png)

好了，所有的分析工作到这里就基本上差不多了。 接下来，就是调试js了（我用的是Fiddler），打开Fiddler后回到网站刷新一次，在Fiddler中找到刚才花了很大一部分时间分析的那个js文件，用刚才我们修改说的本地js替换它，具体操作如下图所示

![](https://attach.52pojie.cn/forum/201709/24/193724g6lgqhhqp3knmpn3.png)

![](https://attach.52pojie.cn/forum/201709/24/193725qvnxiveziirzirov.png)

替换好js后，回到网站打开开发者工具到console里，刷新一下网站，神奇的事情发生了，刚才没有的参数都打印出来了，如下   我们只需要拿到参数1进行分析（其他3个都是固定的了）

![](https://attach.52pojie.cn/forum/201709/24/193725risyknk57f9ks05c.png)

由于刚才我们把随机生成的i进行了替换成固定了，也就是说encSecKey我们不用每次都进行加密了，直接用下图这个就行（i=“FFFFFFFFFFFFFFFF”），拿出来存起来

![](https://attach.52pojie.cn/forum/201709/24/193725h7dylqtlaojfsdyr.png)

然后随便点到一首歌的详情页中，类似的分析（没有那么麻烦了，只需要找到参数就行）就行，此处就省略了，参考下图

![](https://attach.52pojie.cn/forum/201709/24/193725ozf49c6afxfb9a6m.png)

![](https://attach.52pojie.cn/forum/201709/24/193725r0an9n7a4v4uvf59.png)

![](https://attach.52pojie.cn/forum/201709/24/193725pf55fmd2zcc1pxcf.png)

二、简单的代码实现（代码参数中默认是128kbps的，把128000改成320000就可以抓取320kbps了）

[Python] *纯文本查看*

```
# -*- coding:utf8 -*-
import sys
from Crypto.Cipher import AES
import base64
import requests
import json
reload(sys)
sys.setdefaultencoding( 'utf-8' )

#返回搜索列表的params
def get_music_list(keyword):
    first_param = '{"hlpretag":"","hlposttag":"","id":"","s":"' + keyword + '","type":"1","offset":"0","total":"true","limit":"100","csrf_token":""}'
    return get_params(first_param)

#返回每个歌曲的params
def get_music_url(id):
    first_param = '{ids: "[' + str(id) + ']", br: 128000, csrf_token: ""}'
    return get_params(first_param)

#返回加密后的POST参数params
def get_params(first_param):
    iv = '0102030405060708'
    first_key = '0CoJUm6Qyw8W8jud'
    second_key = 16 * 'F'
    h_encText = AES_encrypt(first_param, first_key, iv)
    h_encText = AES_encrypt(h_encText, second_key, iv)
    return h_encText

#返回加密后的POST参数encSecKey
def get_encSecKey():
    #encSecKey是固定的参数
    encSecKey = '257348aecb5e556c066de214e531faadd1c55d814f9be95fd06d6bff9f4c7a41f831f6394d5a3fd2e3881736d94a02ca919d952872e7d0a50ebfa1769a7a62d512f5f1ca21aec60bc3819a9c3ffca5eca9a0dba6d6f7249b06f5965ecfff3695b54e1c28f3f624750ed39e7de08fc8493242e26dbc4484a01c76f739e135637c'
    return encSecKey

#AES加密算法
def AES_encrypt(text, key, iv):
    pad = 16 - len(text) % 16
    text = text + pad * chr(pad)
    encryptor = AES.new(key, AES.MODE_CBC, iv)
    encrypt_text = encryptor.encrypt(text)
    encrypt_text = base64.b64encode(encrypt_text)
    return encrypt_text

#返回json数据
def get_json(url,params,encSecKey):
    data = {
        "params":params,
        "encSecKey": encSecKey
    }
    response = requests.post(url,data=data)
    return response.content

if __name__ == "__main__":
    search_url = 'http://music.163.com/weapi/cloudsearch/get/web?csrf_token='
    url = 'http://music.163.com/weapi/song/enhance/player/url?csrf_token='
    params = get_music_list('王菲')
    encSecKey = get_encSecKey()
    json_text = get_json(search_url, params, encSecKey)
    json_dict = json.loads(json_text)
    for item in json_dict['result']['songs']:
        p = get_music_url(item['id'])
        music = get_json(url,p, encSecKey)
        print '歌名：'+item['name'],'歌手：'+item['ar'][0]['name'],json.loads(music)['data'][0]['url']
```

效果图：

![](https://attach.52pojie.cn/forum/201709/24/193726g7229kzqzdpnnqid.png)
