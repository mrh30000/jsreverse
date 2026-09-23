# 塔科夫市场API逆向【tarkov-market.com】

> **作者**: DeathMeeting | **发布时间**: 2023-06-30 13:58:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 13779 / 75
> **原文**: [https://www.52pojie.cn/thread-1803311-1-1.html](https://www.52pojie.cn/thread-1803311-1-1.html)

---

新人发帖，请多指教

## 前情提要

最近在研究塔可夫的DMA辅+++助，想要直观显示游戏内各种垃圾的每日平均价格，又不想直接逆向游戏内市场的繁杂逻辑（懒，且并不是要获取实时价格），遂在UC上一通搜索找到了tarkov-market.com这个网站。

想着利用这个网站的数据搞个脚本每天缓存一遍平均价格存储在本地以供使用。

一番摸索发现此网站提供官方API但是要收费，5刀每月，还不能试用。

![](https://attach.52pojie.cn/forum/202306/30/134518untwzwcddvitbz6z.png)

本着先体验后付费的精神（白嫖），本次逆向就开始了。

## 正篇

### 查未公开接口

先进页面，往下滚动发现是滚动刷新，判别是瀑布流加载。

![](https://attach.52pojie.cn/forum/202306/30/134528w2ggy7oj00gtf2ji.png)

按F12呼出控制台，切换到Network并点上Preserve log和
Disable Cache，然后清空一下刷新页面。

![](https://attach.52pojie.cn/forum/202306/30/134530asl0sva2qzslvsul.png)

搜索一下12.7的弹药

![](https://attach.52pojie.cn/forum/202306/30/134522ezcjr50ljc2jml5r.png)

哦豁，什么都没有，可能是加密了。直接点选XHR。

![](https://attach.52pojie.cn/forum/202306/30/134534tbgo5oigljhjhbio.png)

有点眉目，看看里面啥样

没有验签，舒服！

![](https://attach.52pojie.cn/forum/202306/30/134536tevuejj81j86j8eo.png)

数据加密了

![](https://attach.52pojie.cn/forum/202306/30/134538njrk00o8rjyk7h7r.png)

末尾是=符号，有可能是base64加密

![](https://attach.52pojie.cn/forum/202306/30/134540dhjyp3xdy2k20oek.png)

找个在线解密碰碰运气，个人常用：[Base64在线加解密](https://www.base64decode.org/)；

什么鬼，看来是处理过的。也有可能不是base64加密，扒代码！

![](https://attach.52pojie.cn/forum/202306/30/134544sdhur5vu6llru21j.png)

复制一下链接，不用复制后面的两个参，（已经回返的数据条数和每次返回的数据条数）

![](https://attach.52pojie.cn/forum/202306/30/134548u3jykyg87rzkllkl.png)

请求接口没有验签，不用回溯这个调用逻辑，直接对XHR下断点

![](https://attach.52pojie.cn/forum/202306/30/134546x0tcaswcqca2n1s6.png)

![](https://attach.52pojie.cn/forum/202306/30/134550krwi2r5hd5smoood.png)

搞定

![](https://attach.52pojie.cn/forum/202306/30/134552ifls1sv8881ghlem.png)

往下滚动网页加载数据，网页断下

![](https://attach.52pojie.cn/forum/202306/30/134557j4jctiamy9bla4wv.png)

还在请求部分，跳出当前函数，Shift+F11，

![](https://attach.52pojie.cn/forum/202306/30/134559y10y529ihil0o2iz.png)

跳到这里

![](https://attach.52pojie.cn/forum/202306/30/134603xrt7lblucl6ll5km.png)

下面开始看参数（回传的乱码）变化进行单步 F9

1. 一次F9

   ![](https://attach.52pojie.cn/forum/202306/30/134605n3319ck7z9bfvd42.png)
2. 二次F9

   ![](https://attach.52pojie.cn/forum/202306/30/134607s5o7okk0112ozmo5.png)
3. 三、四、五次F9

   ![](https://attach.52pojie.cn/forum/202306/30/134609qio0z4h5oirsz5ga.png)
4. 六次F9

   ![](https://attach.52pojie.cn/forum/202306/30/134612roxxea16zurxgav1.png)
5. 七次F9

   ![](https://attach.52pojie.cn/forum/202306/30/134614uhjryq0szj292272.png)

有点东西了，下面的看起来像是处理Json的部分，我们重点看看

![](https://attach.52pojie.cn/forum/202306/30/134616zwwfsyzsdqfxhxws.png)

把XHR断电移除，在这里下个断

![](https://attach.52pojie.cn/forum/202306/30/134618v67unmvgxuxjumjx.png)

往下滚动网页加载数据，网页断下，这里就是解密的部分

![](https://attach.52pojie.cn/forum/202306/30/134621libz1fh8blf8vbq1.png)

看起来不难，就不扣JS代码，直接搞逻辑然后用Python重写, 我就在下面的代码上进行注释了（自下而上进行回溯）,断点不要释放

```
const xa = String[mi(375)]
  , km = xa(100 - 3) + xa(110 + 6) + xa(105 + 6) + xa(105 - 7)
  , Tv = ()=>[(31 - 6) / (30 * 100 >> 9), parseInt(window[km](mi(385))), 36]
  , Dv = e=>e.substring(...Tv().reverse()[mi(372)](1))
  , bv = e=>{
    const s = mi
      , r = {
        acjba: function(i, o) {
            return i + o
        },
        GAVPm: function(i, o) {
            return i << o
        }
    };
    let n = null;
    try {
        let i = e;
        i = r[s(378)](Dv(i), i[s(383)](r[s(384)](3, 2) - 2)),
        // 3. r是 {acjba: function(i, o), GAVPm: function(i, o)}, r[s(378)]是 "acjba"， i[s(383)]是substring()， r[s(384)]是(i,o){return i<<o}，r[s(384)](3, 2) - 2是个固定值=10；
        // 4. Dv(i)这个函数可以看到前面进行了一系列处理，带入一下就是i.substring(...Tv().reverse()[mi(372)](1)); 继续简化；
        // 5. 其中的Tv()是个固定值， 结果为[5, 0, 36]。mi(372)是"slice"；
        // 6. 综合一下就是[5, 0, 36].reverse()["slice"](1)，输出就是一个列表[0, 5],则Dv(i)=i.substring(0, 5)
        // 7. 则i= r["acjba"](i.substring(0, 5)， i.substring(10))。由于r["acjba"]等于拼接两个传入字符串，进一步简化i= i.substring(0, 5) + i.substring(10)
        i = window[km](i), // 2.  window[km]在控制台打一下发现是atob()，不用太纠结看前面的代码；
        n = JSON[s(379)](decodeURIComponent(i)) // 1. s(379)是parse，先使用decodeURIComponent()对i进行解码，然后json解析；
    } catch {}
    return n
```

至此，已经逆向完成，我们简化一下。

1. 取得接口返回的Json里面的items字符串e
2. i = e
3. i = i.substring(0, 5) + i.substring(10)
4. i = atob(i)
5. n = Json.parse(decodeURIComponent(i))

最终的n就是我们要获取的已经解密的json内容，下面用Python代码转写一下。不会的可以扔进ChatGpt，下面直接放Python代码：

```
import urllib.parse
import base64

def decrypt(input_string):
    decrypt_text = None
    try:
        i = input_string[0:5] + input_string[10:]
        i = base64.b64decode(i)
        i = urllib.parse.unquote(i)
        decrypt_text = loads(i)
    except:
        print('[-] ERROR When Parse')
        pass
    # print(decrypt_text)
    return decrypt_text
```

### 逆向/Python重写JS解密逻辑

实际写爬虫进行爬取的时候发现网站有反爬机制，直接使用Python Request请求是搞不定的。具体机制请参考下面的链接，这里不再赘述。
[反爬虫SSL TLS指纹识别和绕过JA3算法](https://zeo.cool/2022/02/18/%E5%8F%8D%E7%88%AC%E8%99%ABSSL%20TLS%E6%8C%87%E7%BA%B9%E8%AF%86%E5%88%AB%E5%92%8C%E7%BB%95%E8%BF%87JA3%E7%AE%97%E6%B3%95.md/)；

秉承着能懒就懒的原则，我给出两种方案：
--- 使用Selenium来请求，然后正则把加密内容给搞下来，代码如下（仅展现处理一页）：

```
import undetected_chromedriver as uc
from time import sleep
from json import loads
from re import findall

import urllib.parse
import base64

def decrypt(input_string):
    decrypt_text = None
    try:
        i = input_string[0:5] + input_string[10:]
        i = base64.b64decode(i)
        i = urllib.parse.unquote(i)
        decrypt_text = loads(i)
    except:
        print('[-] ERROR When Parse')
        pass
    # print(decrypt_text)
    return decrypt_text

def main():
    options = uc.ChromeOptions()
    # options.add_argument( '--headless' )
    driver = uc.Chrome(options=options)

    driver.get(url='https://tarkov-market.com/api/be/items?lang=en&search=&tag=&sort=change24&sort_direction=desc&trader=&skip=40&limit=20')

    temp_text = driver.find_element('tag name', 'body').text

    if len(temp_text)>= 300 and len(findall("\"result\":\"ok\"", temp_text)) >= 1:
        with open('TarkovItemPrice.json', 'w', encoding='utf-8') as f:
            f.write(decrypt(loads(temp_text)['items']))
    else:
        print("[-] Request failed...")
    print("[+] Exit...")
    _wait = input()

if __name__ == "__main__":
    main()
```

--- 使用curl\_cffi里魔改过TLS指纹的Request来请求,代码如下（仅展现处理一页）：

```
import urllib.parse
import base64

from json import loads, dumps
from curl_cffi import requests

def decrypt(input_string):
    decrypt_text = None
    try:
        i = input_string[0:5] + input_string[10:]
        i = base64.b64decode(i)
        i = urllib.parse.unquote(i)
        decrypt_text = loads(i)
    except:
        print('[-] ERROR When Parse')
        pass
    # print(decrypt_text)
    return decrypt_text

def main():
    url = "https://tarkov-market.com/api/be/items?lang=en&search=&tag=&sort=change24&sort_direction=desc&trader=&skip=20&limit=20"

    headers = {
    'authority': 'tarkov-market.com',
    'accept': '*/*',
    'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8',
    'cache-control': 'no-cache',
    'dnt': '1',
    'pragma': 'no-cache',
    'referer': 'https://tarkov-market.com/',
    'sec-ch-ua': '"Google Chrome";v="110", "Chromium";v="110", "Not-A.Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
    }

    temp_text = requests.get(url=url, headers=headers, impersonate="chrome110").text

    temp_json = loads(temp_text)

    with open('TarkovItemPrice.json', 'w', encoding='utf-8') as f:
                f.write(dumps(decrypt(temp_json['items'])))
    print("[+] Exit...")
    _wait = input()

if __name__ == "__main__":
    main()
```

## 总结

综合来说这个网站难度较低，逆向出了解密代码就可以写个遍历获取所有的数据了，可以设置个计划任务每天跑一遍就可以拿到最新的商品价格以供使用了。
