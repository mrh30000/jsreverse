# 这也太酷炫了！python爬虫直接干翻美团

> **作者**: 24WOK | **发布时间**: 2023-04-08 08:39:00 | **版块**: 『编程语言区』 | **查看/回复**: 12271 / 60
> **原文**: [https://www.52pojie.cn/thread-1771094-1-1.html](https://www.52pojie.cn/thread-1771094-1-1.html)

---

*本帖最后由 wushaominkk 于 2023-4-8 09:21 编辑*

# 找接口------>network 界面搜索   直接定位

[Python] *纯文本查看*

```
import requests
import base64
import zlib
import js2py
import time

def request_dada(token):
    url = "https://bj.meituan.com/meishi/api/poi/getPoiList?"

    headers = {
    "Cookie": "你的"
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36"
    }

    params = {
        "cityName": "北京",
        "cateId": "0",
        "areaId": "0",
        "sort": "",
        "dinnerCountAttrId": "",
        "page": "1",
        "userId": "2633738848",
        "uuid": "57616f518847495ab4d6.1680748526.1.0.0",
        "platform": "1",
        "partner": "126",
        "originUrl": "https://bj.meituan.com/meishi/",
        "riskLevel": "1",
        "optimusCode": "10",
        "_token": token
    }

    res = requests.get(url, headers=headers, params=params).text
    print(res)
time1 = js2py.eval_js("new Date().getTime();")

data_sign = 'eJwljc1tAyEQhXvxgSML+8OSSBwinyJZuaUAbLA9yQKrYbCUHnJPE6nA9Th9ZCyf3qen97PxGP1rcEocPMUHAH29+RTd3/fP7forAuQccVtaphci5IwoK0FqdVtCdFqJgnCC/I6LOxOt9bnr9h8yRaDmszyU1DHXM3Ri9ScusCDxpNO9Eevi6VgwsY1QP3fxEhfmWpCcaDXe/3ozDPNg7WhFaxDcNBttjpNmZx6fJr8fg5HaWDWPduoZpZJq8w9HVEky'
data_jw = "eJx1T8lugzAQ/Rdfi4INicG5USAlNAvZSEqVA5g1LUvABGjVf68rpVIvlUZ6yzw9zXyCeh6CKYKQQCiAW1SDKUAjOMJAAKzhG6xCZYIkMsaYCID+8WSoQCQJIKhdA0xfxzIWFAmef4wt169oMiaCqkhn4U4l+SxIYz4/mTmPgJSxqpmKYnAZ5VHGWr8Y0TIXOW/STOQn/BMAvCHf8waOb3f078h+9ZK/wiuaLCk4i+zu/UIR0wZzk55ufbJbLh7U9W732GXFYHutf9CChUaGzXP9EugHq7AdExca2afE04dYvkYFUZz+yUE1NUvqLA+WZknkYbsPZTF2lListXZDqcv8KqXZZN6Vz3B2DV2mh7OrnRS6Ls7xYt2vGQmKmqTqsPWNvPkYDsiwTkt5m5EdbRvd6KvVmpjRLcNu0jUvaOPIcW+mcX6sdOobp0iUyw/DWSXKMZ35vUFXj4xdqlXu9Ti2azVOJpZ/NI5O2JZe5dlXtSOWa74N4OsbXg6YQw=="
token_decode = base64.b64decode(data_jw)
token_string = zlib.decompress(token_decode)
str1 =str(token_string, "utf-8")
# sign 是请求参数
sign = eval(str1)
sign['ts'] = int(time.time()*1000)
sign['cts'] = time1
info = str(sign).encode()
token = base64.b64encode(zlib.compress(info)).decode()
request_dada(token)
```

写在后面：简单的做了一个美团商品爬取过程的token,本身并不复杂，耐得住性子处理才最重要，希望52各位学爬虫的小伙伴继续加油！！！