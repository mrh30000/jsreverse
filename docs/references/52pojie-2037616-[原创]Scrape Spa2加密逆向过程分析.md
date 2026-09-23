# [原创]Scrape Spa2加密逆向过程分析

> **作者**: ZenoMiao | **发布时间**: 2025-06-10 00:57:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2757 / 8
> **原文**: [https://www.52pojie.cn/thread-2037616-1-1.html](https://www.52pojie.cn/thread-2037616-1-1.html)

---

本题链接为aHR0cHM6Ly9zcGEyLnNjcmFwZS5jZW50ZXIv

打开网站翻页看浏览器抓包进行分析发现请求参数中有一个键为token的参数疑似加密参数

![](https://attach.52pojie.cn/forum/202506/10/004239oee5vevx6c0ejv23.png)

通过打XHR断点后跟盏发现参数获取的地方, 然后单步进去发现加密位置.

![](https://attach.52pojie.cn/forum/202506/10/004704ih8cdu35ofadn5fl.png)

![](https://attach.52pojie.cn/forum/202506/10/004747pzjzeenjqkz9nh51.png)

这里可以发现把t push进了r, t为时间戳 r[0]是固定的, r[1]应该是offset. 然后下面把拥有3个参数的r 用join方法转换为字符串后进行了疑似SHA1的加密

![](https://attach.52pojie.cn/forum/202506/10/004840w6lihy9cevc0hcn6.png)

至于是否标准算法, 我们测试一下即可, 既然要测试 看到下面关键词未Base64也顺便测试是否标准算法吧. 如果是标准算法就懒得扣了

![](https://attach.52pojie.cn/forum/202506/10/005230mgoo02godngoktw2.png)

![](https://attach.52pojie.cn/forum/202506/10/005250jjnbrjthtbodnrdy.png)

验证完了是标准算法后开始撸代码, 已知r[0]是固定的 r[1]是请求参数的offset, r[2]是时间戳. join一个","然后进行sha1加密

[Python] *纯文本查看*

```

 for i in range(1,11):
        offset = (i - 1) * 10
        t = int(time.time())
        r = ['/api/movie', offset, t]
        o = hashlib.sha1(','.join(str(i) for i in r).encode()).hexdigest()
```

把o加密出来之后还要进行c的加密, c的加密涉及到o和t, 跟上面一样 组一个[o, t]的数组, 然后用join转换成字符串后进行b64加密即可

[Python] *纯文本查看*

```
c = base64.b64encode(','.join(str(i) for i in [o, t]).encode()).decode()
```

完整代码如下:

[Python] *纯文本查看*

```
import base64
import hashlib
import time

import requests_html

requests = requests_html.HTMLSession()

def main():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
    }
    url = f'https://spa2.scrape.center/api/movie/'
    for i in range(1,11):
        offset = (i - 1) * 10
        t = int(time.time())
        r = ['/api/movie', offset, t]
        o = hashlib.sha1(','.join(str(i) for i in r).encode()).hexdigest()
        c = base64.b64encode(','.join(str(i) for i in [o, t]).encode()).decode()
        params = {
            'limit': 10,
            'offset': offset,
            'token': c
        }
        response = requests.get(url, params=params, headers=headers).json()
        print(response)

if __name__ == '__main__':
    main()
```
