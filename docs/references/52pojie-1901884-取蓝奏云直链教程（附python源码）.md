# 取蓝奏云直链教程（附python源码）

> **作者**: baipiao520 | **发布时间**: 2024-03-17 09:15:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 19443 / 277
> **原文**: [https://www.52pojie.cn/thread-1901884-1-1.html](https://www.52pojie.cn/thread-1901884-1-1.html)

---

*本帖最后由 baipiao520 于 2024-3-22 23:40 编辑*

## 准备工作

浏览器
python环境

#### 所需的库

* **request** 用于发送请求
* **json** 用于解析json格式的response
* **re** 用于正则提取response中的参数

## 开始分析

访问我们的网盘分享链接，
浏览器打开F12元素
直接看下载按钮的属性，

![](https://attach.52pojie.cn/forum/202403/17/081830cudp0qazjuwnnnn9.png)

会发现直接包含了下载直链，我们尝试直接request，看看能不能直接获取这个直链

```
import requests
url = "https://wwt.lanzouu.com/icuiF1o31f8d"
headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
    }
response = requests.get(url, headers=headers)
print(response.text)
```

运行后会发现没有我们刚刚找到的直链，但是发现了另外一个链接跟网页中格式是相同的

![](https://attach.52pojie.cn/forum/202403/17/082700v7i3y48rgrppr44y.png)

![](https://attach.52pojie.cn/forum/202403/17/082752y7szxt5u6euzd8xu.png)

所以我们就要先从这个链接入手，看看他返回什么，
我们打开浏览器的网络调试，发现他确实访问了这个网页

![](https://attach.52pojie.cn/forum/202403/17/082953sk73x17c7r3523x2.png)

点开response查看响应，发现了下载地址来源于一个ajax脚本

![](https://attach.52pojie.cn/forum/202403/17/083142bstxlnoul9nce55k.png)

我们把这个ajax扔到chatgpt

![](https://attach.52pojie.cn/forum/202403/17/083340b0ahjma5u66aaeae.png)

发现其实是一个post请求，将data中包含的几个值post到指定网页，我们在网络调试中也可以看到
——————
说了这么多程序还不能匹配这个网页，我们先给程序加上正则

```
import re
iframe_pattern = re.compile(r'<iframe\s+class="ifr2"\s+name="\d+"\s+src="([^"]+)"\s+frameborder="0"\s+scrolling="no"></iframe>')
matches = iframe_pattern.findall(response.text)
```

这样matches[1]就是我们要的网页了。
再次request这个网页。

```
response2 = requests.get(matches[1], headers=headers)
print(response2.text)
```

运行发现……竟然报错了！

![](https://attach.52pojie.cn/forum/202403/17/084021gdcsfhyzsygotsvi.png)

原来是忘记把域名加上了，这里我们可以直接添加

```
response2 = requests.get(f"https://wwt.lanzouu.com{matches[1]}, headers=headers)
```

也可以写一个函数正则匹配我们的url的域名

```
def re_domain(url):
    pattern_domain = r"https?://([^/]+)"
    match = re.search(pattern_domain, url)
    if match:
        domain = match.group(1)
        return domain
    else:
        return None
```

发现确实能取回这个ajax脚本，那不就好办了

![](https://attach.52pojie.cn/forum/202403/17/084544adub5p7crtj2pu4r.png)

多试几次发现只有sign是变化的，剩下的几个data都是固定的
所以正则匹配我们需要的sign和下一步post的url

```
pattern = r"'sign'\s*:\s*'([^']+)'"
match = re.search(pattern, response2.text)
pattern2 = r"url\s*:\s*'([^']+)'"
match2 = re.search(pattern2, response2.text)
print(match[0], match2[0])
```

```
'sign':'VTMHOVloBjcEDVRrCzsAPFQ_aBTZSPgMwBzFXYwVsW29SYVUkAClSOwViVjdUMQEwVzsFMwRtADQCMVBk' url : '/ajaxm.php?file=163112553'
```

取出了sign和url就好办了，直接写下一个post
注意这里的sign和url都不是str类型，而是Match类型，我们要先用group(1)方法取回str
（有的人会说为啥不直接post这个固定网页还要进行前面的操作？
因为sign值是会变化的，只有通过第二次访问我们才能知道这个sign值是多少）

```
data = {
    'action': 'downprocess',
    'signs': '?ctdf',
    'sign': match.group(1),
    'websign': '',
    'websignkey': 'bL27',
    'ves': 1
}
response3 = requests.post(f"https://{re_domain(url)}{match2.group(1)}", headers=headers, data=data)
print(response3.text)
```

```
{"zt":1,"dom":"https:\/\/down-load.lanrar.com","url":"?VDJVaw08BzYBCFdvAjdTP1JtADhfTVESCkxXtFGdUtcB5gb2CNgFuAPCBf0AvVX2V5VXugX9CqsG5FHRXbJXsFTCVbsNtgfyAd9XNQJ4U2FSJgBgX3hRNgorVzdRZFI\/AWQGDgg8BTUDaAViAGJVZ1c8V2MFaAo9BjRRZF0nVzBUJ1U\/DWEHawFmVzkCYFNgUjwAI19wUSMKMFdjUT1SYQE1Bn4IZQVjA3oFYgBmVXtXaFdnBWsKMAZiUWFdMldkVGJVZw02B2YBZFdkAjdTMFJsAGNfYVEwCj1XNFE6UjEBZAZmCGAFYwMwBTcAbVVjVyNXNwUiCm0GJ1EiXXJXM1QmVWsNNAduAWZXNwJvU2dSMAA9XzVRdQp5VzhRYFI2AWcGbAhkBWEDZQVjAGRVelcjV3QFPApkBnZRal0wV2FUZVUyDWUHagFiVzgCYFNrUi4AcF9wUSQKMFdgUTpSYwE2BmYIZgVjA2UFYgBmVXJXeFc7BSoKNQY0UW9dL1dgVGZVLA1hB2ABYlcvAmdTZw==","inf":0}
```

取回的text是json格式的，那么我们就要用json解析它

```
import json
data = json.loads(response3.text)
```

通过上面的ajax脚本我们会发现他下载链接的拼接方式为dom + "/file/" + url

```
dom = data['dom']
url = data['url']
full_url = dom + "/file/" + url
print(full_url)
```

打印这个url后发现，不管是我们用python request还是浏览器访问这个网页，都显示错误400
查看浏览器的网络调试，原来是访问的时候协议头有一个来源

![](https://attach.52pojie.cn/forum/202403/17/090102ya5mgbate31emumx.png)

这个挺关键的，我们把它加到post的协议头中

```
headers2 = {
    "Referer": matches[1],
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
}
response3 = requests.post(f"https://{re_domain(url)}{match2.group(1)}", headers=headers2, data=data)
```

重新运行得到新的直链，打开发现就能正常下载了
但是我们观察浏览器，发现其实这个直链还进行了一次重定向，那么我们也进行一次重定向再获取重定向后的网页

```
headers = {
"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
"accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
"sec-ch-ua": "\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Microsoft Edge\";v=\"122\"",
"sec-ch-ua-mobile": "?0",
"sec-ch-ua-platform": "\"Windows\"",
"sec-fetch-dest": "document",
"sec-fetch-mode": "navigate",
"sec-fetch-site": "none",
"sec-fetch-user": "?1",
"upgrade-insecure-requests": "1",
"cookie": "down_ip=1"
}
response = requests.get(full_url, headers=headers, allow_redirects=False)
print(response.headers['Location'])
```

运行后终于找到了最终的直链

![](https://attach.52pojie.cn/forum/202403/17/090901og417az10sba33a1.png)

## 完整程序

```
import requests
import re
import json
def re_domain(url):
    pattern_domain = r"https?://([^/]+)"
    match = re.search(pattern_domain, url)
    if match:
        domain = match.group(1)
        return domain
    else:
        return None
url = "https://wwt.lanzouu.com/icuiF1o31f8d"
domain = re_domain(url)
headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
    }
response = requests.get(url, headers=headers)
iframe_pattern = re.compile(r'<iframe\s+class="ifr2"\s+name="\d+"\s+src="([^"]+)"\s+frameborder="0"\s+scrolling="no"></iframe>')
matches = iframe_pattern.findall(response.text)
response2 = requests.get(f"https://{domain}{matches[1]}", headers=headers)
pattern = r"'sign'\s*:\s*'([^']+)'"
sign = re.search(pattern, response2.text).group(1)
pattern2 = r"url\s*:\s*'([^']+)'"
url2 = re.search(pattern2, response2.text).group(1)
data = {
    'action': 'downprocess',
    'signs': '?ctdf',
    'sign': sign,
    'websign': '',
    'websignkey': 'bL27',
    'ves': 1
}
headers = {
    "Referer": matches[1],
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
}
response3 = requests.post(f"https://{domain}{url2}", headers=headers, data=data)
data = json.loads(response3.text)
full_url = data['dom'] + "/file/" + data['url']
headers = {
"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
"accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
"sec-ch-ua": "\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Microsoft Edge\";v=\"122\"",
"sec-ch-ua-mobile": "?0",
"sec-ch-ua-platform": "\"Windows\"",
"sec-fetch-dest": "document",
"sec-fetch-mode": "navigate",
"sec-fetch-site": "none",
"sec-fetch-user": "?1",
"upgrade-insecure-requests": "1",
"cookie": "down_ip=1"
}
response4 = requests.get(full_url, headers=headers, allow_redirects=False)
print(response4.headers['Location'])
```

## 传送门

[取蓝奏云直链教程2（含密码）（附python源码）](https://www.52pojie.cn/thread-1904710-1-1.html)
