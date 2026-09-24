# 蓝奏云Python真实地址解析

> **作者**: lzx8888 | **发布时间**: 2019-12-19 20:26:00 | **版块**: 『编程语言区』 | **查看/回复**: 7163 / 26
> **原文**: [https://www.52pojie.cn/thread-1076756-1-1.html](https://www.52pojie.cn/thread-1076756-1-1.html)

---

*本帖最后由 lzx8888 于 2019-12-24 09:45 编辑*

花了两个小时分析了一下直链解析，无密码蓝奏链接解析，废话不多说直接放码，大家多多捧场

[Python] *纯文本查看*

```
import requests
import re
import json
from bs4 import BeautifulSoup

def lanzou_download(url):
    headers = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36 Edg/79.0.309.51',
        'origin': 'https://www.lanzous.com'
        }
    # 请求下载页面
    strhtml = requests.get(url, headers=headers)
    soup = BeautifulSoup(strhtml.text)
    # 拿到iframe地址
    data = soup.select('body > div.d > div.d2 > div.ifr > iframe')
    dowhtml = requests.get('https://www.lanzous.com'+data[0]['src'], headers=headers)
    soup = BeautifulSoup(dowhtml.text)
    # 拿到ajax请求脚本
    data = soup.select('body > script')
    # 正则取签名
    searchObj = re.findall( r'\tdata(.*)\'sign\':\'(.*?)\'', data[0].text, re.M|re.I)
    # 请求ajax获取跳转地址
    dowjsonStr = requests.post('https://www.lanzouj.com/ajaxm.php',data={'action':'downprocess','sign':searchObj[0][1],'ves':'1'},headers={
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36 Edg/79.0.309.51',
        'referer': 'https://www.lanzouj.com/fn?' + searchObj[0][1],
        })
    dowjson = json.loads(dowjsonStr.text)
    # 请求跳转地址获取真实地址
    oragin = requests.get(dowjson['dom'] + '/file/' + dowjson['url'],allow_redirects=False ,headers={
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36'
    })
    # 拿到302跳转地址
    downUrl = oragin.next.url
    return downUrl

# 调用
print(lanzou_download('https://www.lanzouj.com/i84v18h'))
```

执行脚本

环境
python3

安装依赖
pip install requests
pip install bs4

调用
python .\crawler.py

目前已整合到本人的开源工具ZTool中

![](https://attach.52pojie.cn/forum/201912/23/131849rumazpim5aa0a1n0.gif)

开源地址
https://github.com/lzx8589561/ZTool
