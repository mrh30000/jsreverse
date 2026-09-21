# 小小爬虫之突破反爬虫限制重写javascript函数

> **作者**: 罂粟花 | **发布时间**: 2016-12-29 14:29:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5503 / 3
> **原文**: [https://www.52pojie.cn/thread-568846-1-1.html](https://www.52pojie.cn/thread-568846-1-1.html)

---

交流交流爬取网站碰到的坑~
废话少说直接上代码

[Python] *纯文本查看*

```
import requests
from lxml import etree
import base64

url = 'http://www.cool-proxy.net/proxies/http_proxy_list/sort:score/direction:desc'

response = requests.get(url).content

root = etree.HTML(response)
proxys = root.xpath('//*[@id="main"]/table/tr[position()>1 and position()<23]')
def func(a):[color=#ff0000]#同等javascript的function str_rot13，javascript函数请看图片[/color]
    if a.isdigit():
        return a
    if a.lower() < 'n':
        return chr(ord(a) + 13)[color=#ff0000]#chr()和ord()这两个函数百度吧~，很详细[/color]
    else:
        return chr(ord(a) - 13)
for i in proxys:
    try:
        ip = i.xpath('./td[1]/script/text()')
        if not ip:
            continue
        ports = i.xpath('./td[2]/text()')
        if not ports:
            continue
        port = ports[0]
        ip = ip[0].replace('document.write(Base64.decode(str_rot13("','').replace('")))','')
        ip = ''.join(map(func,ip))
        ip = base64.b64decode(ip).strip(' I')[color=#ff0000]#莫名其妙的解码后后缀会有“ I”，没仔细看哪的问题~所以用strip过滤[/color]
        print ip
    except Exception,e:
        print e
```
