# 某视频解析分析-AST反混淆与nodejs调用

> **作者**: 漁滒 | **发布时间**: 2021-05-31 22:01:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8195 / 27
> **原文**: [https://www.52pojie.cn/thread-1450900-1-1.html](https://www.52pojie.cn/thread-1450900-1-1.html)

---

*本帖最后由 漁滒 于 2021-5-31 22:05 编辑*

@[TOC](https://www.52pojie.cn/%E9%A2%9C%E4%BA%A6%E8%A7%A3%E6%9E%90%E5%88%86%E6%9E%90)

### 一、抓包并进行简单的静态分析

打开Fiddler，然后打开目标网址https://jsap.attakids.com/?url=<https://v.qq.com/x/cover/mzc0020002ka95z/k0036081njj.html>
![在这里插入图片描述](https://img-blog.csdnimg.cn/20210531211445654.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
这里可以看到请求了https://jsap.attakids.com/Api.php这个接口，其中还需要10个请求的参数。

接着继续看看主页的内容
![在这里插入图片描述](https://img-blog.csdnimg.cn/20210531211937913.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
这里可以看到，除了Sign和Token两个参数是实际有加密的，其他的参数都是直接在源代码中给出，使用正则匹配等方式提取即可。

下面还有一段ob混淆的js代码，将其先进行反混淆（关于ast的详细内容可以查看之前的帖子，这里就不做过长的解析。地址：[《JavaScript AST其实很简单》](https://www.52pojie.cn/thread-1332822-1-1.html)）
反混淆的js过程，下面只展示部分内容

```
function ajax_api() {
  $["cookie"]("uuid", Vkey + '-' + Key + '-' + Sign + '-' + Token);
  AccessToken = Vkey + '-' + Key + '-' + Sign + '-' + Token;

  if (isios) {
    ios = '1';
  } else {
    ios = '0';
  }

  if (isiPad) {
    wap = '1';
  } else {
    wap = '0';
  }

  $["ajax"]({
    'type': "post",
    'url': Api + "/Api.php",
    'dataType': "json",
    'headers': {
      'Token': Vkey,
      'Access-Token': AccessToken,
      'Version': Version
    },
    'data': {
      'url': Vurl,
      'wap': wap,
      'ios': ios,
      'host': Host,
      'key': Key,
      'sign': Sign,
      'token': Token,
      'type': Type,
      'referer': Ref,
      'time': Time
    },
    'success': function (_0x3040ec) {
      if (_0x3040ec["code"] == "200") {

        var _0x4acba7 = decode_url(_0x3040ec["url"], $["md5"](Host + Token));
        _0x3040ec["url"] = decodeURIComponent(_0x4acba7);

      }
    }
  });
}
```

此时，请求的逻辑就非常清晰了，但是还需要加密参数Sign和Token的算法。

### 二、网页断点动态分析

如果有一些实际的参数，会更好的分析。打开f12，然后重新加载网页
![在这里插入图片描述](https://img-blog.csdnimg.cn/20210531212942369.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)

直接出现反调试，无限debugger。从函数调用堆栈可以看出，是从jquery.md5.js中出来的。接着查看一下这个js
![在这里插入图片描述](https://img-blog.csdnimg.cn/20210531213211415.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)

可以看到大数组，又是一段ob混淆，继续进行反混淆，然后使用浏览器的Overrides功能，加载本地的js文件。(详细的Overrides功能教程可以参考鹅大的文章，地址：[基于Chrome Overrides和Initiator进行js分析](https://blog.weimo.info/archives/598/)）

设置好以后再次刷新，此时就不会出现无限debugger，可以自己设置断点

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210531214118894.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)

这里一共套了三层函数，分别为

| 函数名 |
| --- |
| $.md5 |
| lc |
| encode\_url |

$.md5函数是标准的md5函数，自己随便试一下就可以得知，接着跟进去lc函数

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210531214526651.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)

lc函数里面又套了4层函数，\_0x2f6ff0是加盐，在传入的字符串前加上固定的"17325841932717338791732584194271733878",然后另外三个函数共同组成一个标准的md5。

前面两个函数都比较简单，接着看看encode\_url

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210531214906695.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
![在这里插入图片描述](https://img-blog.csdnimg.cn/20210531215307335.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)

encode\_url函数的函数实体就是\_0x3c4b2e函数，里面主要是md5，字符串切分拼接，异或等运算。我这里就不做python的还原了，直接扣js出来用。那么三个函数搞定了，请求也应该顺理成章的搞定了。

### 三.扣取代码，使用python实现自动化请求

将\_0x3c4b2e函数扣出来，然后使用node运行，提示缺什么函数没有定义，就继续扣出来。这里没有涉及环境检测等问题，所以一直复制粘贴到不报错就可以了

最后增加一段自定义的代码来实现加密还是解密

```
var do_type = process.argv[2];
if (do_type === 'ENCODE'){
    console.log(_0x3c4b2e(process.argv[3], "ENCODE", process.argv[4], 0));
}else {
    console.log(_0x3c4b2e(process.argv[3], "DECODE", process.argv[4]));
}
```

为什么还有解密呢？再回到第一次解混淆的js。
![在这里插入图片描述](https://img-blog.csdnimg.cn/20210531215747171.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
当请求成功时，返回的url是加密的，需要解密后才是真实地址。下面是完整python代码

```
import requests
import os
import re
import hashlib
from urllib import parse

def main():
    url = 'https://jsap.attakids.com/?url=https://v.qq.com/x/cover/mzc0020002ka95z/k0036081njj.html'
    response = requests.get(url)
    salt = '17325841932717338791732584194271733878'
    Domain = re.findall('(?<=var Domain = ").+?(?=")', response.text)[0]
    Vurl = re.findall('(?<=var Vurl = ").+?(?=")', response.text)[0]
    Vkey = re.findall('(?<=var Vkey = ").+?(?=")', response.text)[0]
    Key = re.findall('(?<=var Key = ").+?(?=")', response.text)[0]
    Version = re.findall('(?<=var Version = ").+?(?=")', response.text)[0]
    Time = re.findall('(?<=var Time = )\d+', response.text)[0]
    sign_v2 = re.findall('var Sign = encode_url.+', response.text)[0]
    sign_v2 = re.findall("(?<=').{32}(?=')", sign_v2)[0]
    Token_v2 = re.findall('var Token = encode_url.+', response.text)[0]
    Token_v2 = re.findall("(?<=').{32}(?=')", Token_v2)[0]
    url = response.url
    Host = parse.urlparse(url).netloc

    Sign = Host+Time+Vurl+Key
    Sign = salt + hashlib.md5(Sign.encode()).hexdigest()
    Sign = hashlib.md5(Sign.encode()).hexdigest()
    nodejs = os.popen('node attakids ENCODE ' + Sign + ' ' + sign_v2)
    Sign = nodejs.read().replace('\n', '').replace('+', '-').replace('/', '_').replace('=', '.')
    nodejs.close()

    Token = Domain+Time+Vurl+Sign
    Token = salt + hashlib.md5(Token.encode()).hexdigest()
    Token = hashlib.md5(Token.encode()).hexdigest()
    nodejs = os.popen('node attakids ENCODE ' + Token + ' ' + Time + Token_v2)
    Token = nodejs.read().replace('\n', '').replace('+', '-').replace('/', '_').replace('=', '.')
    nodejs.close()

    headers = {
        'Token': Vkey,
        'access-token': Vkey + '-' + Key + '-' + Sign + '-' + Token,
        'Version': Version,
        'cookie': 'uuid=' + Vkey + '-' + Key + '-' + Sign + '-' + Token,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
    }

    data = {
        'url': Vurl,
        'wap': 0,
        'ios': 0,
        'host': Host,
        'key': Key,
        'sign': Sign,
        'token': Token,
        'type': '',
        'referer': '',
        'time': Time
    }

    url = 'https://jsap.attakids.com/Api.php'
    response = requests.post(url, headers=headers, data=data)
    if response.status_code == 200:
        response = response.json()
        print(response)
        title = response['title']
        print(title)
        enc_url = response['url'].replace('-', '+').replace('_', '/').replace('.', '=')
        nodejs = os.popen('node attakids DECODE ' + enc_url + ' ' + hashlib.md5((Host + Token).encode()).hexdigest())
        dec_url = nodejs.read().replace('\n', '')
        nodejs.close()
        dec_url = 'https://'+Host+parse.unquote(dec_url)
        print(dec_url)
        if response['type'] == 'hls':
            response = requests.get(dec_url)
            print(response.text)
    else:
        print(response.status_code)
        print(response.content)

if __name__ == '__main__':
    main()
```

js代码就不放出来了，有兴趣的可以自己尝试扣取js测试

最后结果图

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210531220508436.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
