# 取蓝奏云直链教程2（含密码）（附python源码）

> **作者**: baipiao520 | **发布时间**: 2024-03-22 23:33:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 14450 / 64
> **原文**: [https://www.52pojie.cn/thread-1904710-1-1.html](https://www.52pojie.cn/thread-1904710-1-1.html)

---

*本帖最后由 baipiao520 于 2024-3-23 09:47 编辑*

## 前情回顾

第一期传送门：[取蓝奏云直链教程（附python源码）](https://www.52pojie.cn/thread-1901884-1-1.html)
上次我们分析了一个无访问密码的单文件分享链接。
上次主要运用了re库，也就是正则表达式来取出网页中的参数，有人推荐我用bs4来提取参数，但是bs4不太适用于JavaScript，所以本文还是使用正则来提取。

## 准备工作

浏览器
python环境

## 开始分析

有了上次的经验，我们直接访问一个带密码的分享链接并查看浏览器
未输入密码前：

![](https://attach.52pojie.cn/forum/202403/22/223006j0tywqfhfzotbz6w.png)

输入密码后：

![](https://attach.52pojie.cn/forum/202403/22/222856ttt9afpa862pq46a.png)

同时查看网络调试：

![](https://attach.52pojie.cn/forum/202403/22/223222s4zkozxxe47v7lk6.png)

发现这次的网页反而没有套娃式请求，而是一步到位。
那我们也直接开始request。

```
import requests
url = "https://wwt.lanzouu.com/iW5jF1s99k6j"
password = 6666
headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
    }
response = requests.get(url, headers=headers)
print(response.text)
```

我们观察取回来的网页，发现和上次很相似

![](https://attach.52pojie.cn/forum/202403/22/223647ie9l3zx8vcboxemd.png)

![](https://attach.52pojie.cn/forum/202403/22/223753q7e9j7ditpe8d724.png)

只不过这次的ajax脚本在一个down\_p()函数中
相比上次还节省了好几步
那我们直接开始提取参数吧！

```
url_pattern = re.compile(r"url\s*:\s*'(/ajaxm\.php\?file=\d+)'")
url_match = url_pattern.search(response.text).group(1)
skdklds_pattern = re.compile(r"var\s+skdklds\s*=\s*'([^']*)';")
skdklds_match = skdklds_pattern.search(response.text).group(1)
print(url_match, skdklds_match)
```

考虑到Match类型我们只需要用到group(1)方法，这次我在定义变量时就直接使用group(1)方法，也方便后续调用。文末我会给出这次和上次的优化后的代码。
接下来是模拟post请求

```
data = {
    'action': 'downprocess',
    'sign': skdklds_match,
    'p': password,
}
headers = {
    "Referer": url,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
}
response2 = requests.post(f"https://{re_domain(url)}{url_match}", headers=headers, data=data)
print(response2.text)
```

password可以是str类型，也可以是int类型，因为在转换为data时都会自动转为str类型，这里看个人喜好。
有了上次的教训，别忘记在协议头中加入Referer。
后面就和之前的一模一样了

```
import json
data = json.loads(response2.text)
dom = data['dom']
url = data['url']
full_url = dom + "/file/" + url
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
response3 = requests.get(full_url, headers=headers, allow_redirects=False)
print(response3.headers['Location'])
```

### 完整程序（带密码）

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
url = "https://wwt.lanzouu.com/iW5jF1s99k6j"
password = "6666"
headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
    }
response = requests.get(url, headers=headers)
url_pattern = re.compile(r"url\s*:\s*'(/ajaxm\.php\?file=\d+)'")
url_match = url_pattern.search(response.text).group(1)
skdklds_pattern = re.compile(r"var\s+skdklds\s*=\s*'([^']*)';")
skdklds_match = skdklds_pattern.search(response.text).group(1)
print(url_match, skdklds_match)
data = {
    'action': 'downprocess',
    'sign': skdklds_match,
    'p': password,
}
headers = {
    "Referer": url,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
}
response2 = requests.post(f"https://{re_domain(url)}{url_match}", headers=headers, data=data)
data = json.loads(response2.text)
dom = data['dom']
url = data['url']
full_url = dom + "/file/" + url
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
response3 = requests.get(full_url, headers=headers, allow_redirects=False)
print(response3.headers['Location'])
```

## 如何区分是否需要密码

其实这两个网页的区别还是很大的，也有很多方法可以区分：

1. 有密码的`<title>文件</title>`，没密码的`<title>文件名 - 蓝奏云</title>`
   具体方法

   ```
   if "<title>文件</title>" in response.text:
   print("包含密码")
   else:
   print("无密码")
   ```
2. 有密码的包含很多的`<style>`，没密码的没有
   具体方法

   ```
   if "<style>" in response.text:
   print("包含密码")
   else:
   print("无密码")
   ```
3. 还有后面的很多函数都是只有有密码的才有，这里就不做演示了。

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
def getwithp(url, password):
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
    }
    response = requests.get(url, headers=headers)
    url_pattern = re.compile(r"url\s*:\s*'(/ajaxm\.php\?file=\d+)'")
    url_match = url_pattern.search(response.text).group(1)
    skdklds_pattern = re.compile(r"var\s+skdklds\s*=\s*'([^']*)';")
    skdklds_match = skdklds_pattern.search(response.text).group(1)
    data = {
        'action': 'downprocess',
        'sign': skdklds_match,
        'p': password,
    }
    headers = {
        "Referer": url,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
    }
    response2 = requests.post(f"https://{domain}{url_match}", headers=headers, data=data)
    data = json.loads(response2.text)
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
    response3 = requests.get(full_url, headers=headers, allow_redirects=False)
    return response3.headers['Location']
def getwithoutp(url):
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
    return response4.headers['Location']
url = "https://wwt.lanzouu.com/iW5jF1s99k6j"
password = "6666"
domain = re_domain(url)
headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
    }
response = requests.get(url, headers=headers)
if "<title>文件</title>" in response.text:
    print("包含密码")
    result = getwithp(url, password)
else:
    print("无密码")
    result = getwithoutp(url)
print(result)
```

## 结语

本教程仅供参考学习思路，网页随时会变，并非永久可用。
多文件（文件夹）分享下期再讲。
