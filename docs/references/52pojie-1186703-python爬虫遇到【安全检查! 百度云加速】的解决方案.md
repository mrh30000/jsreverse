# python爬虫遇到【安全检查! | 百度云加速】的解决方案

> **作者**: 漁滒 | **发布时间**: 2020-05-25 22:26:00 | **版块**: 『编程语言区』 | **查看/回复**: 5631 / 7
> **原文**: [https://www.52pojie.cn/thread-1186703-1-1.html](https://www.52pojie.cn/thread-1186703-1-1.html)

---

*本帖最后由 aiai 于 2020-5-25 22:31 编辑*

首先假设我们还不知道网站有百度云加速检查，先直接获取。网址因某些原因屏蔽，但是不影响整体思路

[Python] *纯文本查看*

```
    shareurl = 'https://************/**************************'
    headers = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
    }
    response = httpx.get(url=shareurl, headers=headers)
    print(response.text)
```

查看打印的结果，可以看到有【安全检查! | 百度云加速】

[JavaScript] *纯文本查看*

```
<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endif]-->
<!--[if IE 8]>    <html class="no-js ie8 oldie" lang="en-US"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js" lang="en-US"> <!--<![endif]-->
<head>
<title>安全检查! | 百度云加速</title>
<meta charset="UTF-8" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta http-equiv="X-UA-Compatible" content="IE=Edge,chrome=1" />
<meta name="robots" content="noindex, nofollow" />
```

那么通过打印的结果，要做的就很明显了，需要获取一些参数，以及验证码，最后一齐请求
首先是响应头中的参数

[Python] *纯文本查看*

```
cookie = response.headers['set-cookie'].split(';')[0]
ray = response.headers['cf-ray'].split('-')[0]
```

然后是响应体的参数

[Python] *纯文本查看*

```
            posturl = '/'.join(shareurl.split('/')[:3])+html.unescape(re.findall('(?<=action=").+?(?=")', response.text)[0])
            r = re.findall('(?<=value=").+?(?=")', response.text)[0]
```

最后还需要一个验证码，这里的pub参数多次抓包发现是不变的，所以就直接写死
首先获取一个用于获取验证码图片的参数session

[Python] *纯文本查看*

```
            url = 'https://captcha.su.baidu.com/session_cb?pub=377e4907e1a3b419708dbd00df9e8f79'
            headers = {
                'Host': 'captcha.su.baidu.com',
                'Referer': shareurl,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
            }
            response = httpx.get(url, headers=headers).text
            session = response.split('"')[-2]
```

此时通过session以及前面的pub可以获得验证码图片，保存到本地再手动输入

[Python] *纯文本查看*

```
            url = 'https://captcha.su.baidu.com/image?session='+session+'&pub=377e4907e1a3b419708dbd00df9e8f79'
            response = httpx.get(url, headers=headers).content
            with open('验证码.jpg', 'wb') as f:
                f.write(response)
            yanzhengma = input('请输入同目录下的验证码：')
```

最后构造请求头和请求体，发出请求即可得到目标网页数据

[Python] *纯文本查看*

```
            headers = {
                'content-type': 'application/x-www-form-urlencoded',
                'cookie': cookie,
                'referer': shareurl,
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
            }
            data = {
                'r': r,
                'id': ray,
                'captcha_challenge_field': session,
                'manual_captcha_challenge_field': yanzhengma,
            }
            response = httpx.post(posturl, headers=headers, data=data)
            print(response.text)
```

再次查看打印的内容，获取正确

![](https://attach.52pojie.cn/forum/202005/25/222602mb5hqeq3gqzhnhcx.jpg)

附上完整代码

[Python] *纯文本查看*

```
            shareurl = 'https://************/**************************'
            headers = {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
            }
            response = httpx.get(shareurl, headers=headers)
            cookie = response.headers['set-cookie'].split(';')[0]
            ray = response.headers['cf-ray'].split('-')[0]
            posturl = '/'.join(shareurl.split('/')[:3])+html.unescape(re.findall('(?<=action=").+?(?=")', response.text)[0])
            r = re.findall('(?<=value=").+?(?=")', response.text)[0]
            url = 'https://captcha.su.baidu.com/session_cb?pub=377e4907e1a3b419708dbd00df9e8f79'
            headers = {
                'Host': 'captcha.su.baidu.com',
                'Referer': shareurl,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
            }
            response = httpx.get(url, headers=headers).text
            session = response.split('"')[-2]
            url = 'https://captcha.su.baidu.com/image?session='+session+'&pub=377e4907e1a3b419708dbd00df9e8f79'
            response = httpx.get(url, headers=headers).content
            with open('验证码.jpg', 'wb') as f:
                f.write(response)
            yanzhengma = input('请输入同目录下的验证码：')
            headers = {
                'content-type': 'application/x-www-form-urlencoded',
                'cookie': cookie,
                'referer': shareurl,
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
            }
            data = {
                'r': r,
                'id': ray,
                'captcha_challenge_field': session,
                'manual_captcha_challenge_field': yanzhengma,
            }
            response = httpx.post(posturl, headers=headers, data=data)
            print(response.text)
```
