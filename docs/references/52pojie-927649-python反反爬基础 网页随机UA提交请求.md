# python反反爬基础 网页随机UA提交请求

> **作者**: vsyour | **发布时间**: 2019-04-12 14:05:00 | **版块**: 『编程语言区』 | **查看/回复**: 7054 / 13
> **原文**: [https://www.52pojie.cn/thread-927649-1-1.html](https://www.52pojie.cn/thread-927649-1-1.html)

---

![](https://attach.52pojie.cn/forum/201904/12/140520n5x5zf5hd90d5ez0.png)

[Asm] *纯文本查看*

```
import urllib.request
from fake_useragent import UserAgent

ua = UserAgent()

def randomWeb():
    url = 'http://www.baidu.com'
    request = urllib.request.Request(url)
    # 增加随机请求头信息 user_agent
    request.add_header("User-agent", ua.random)
    # 加Referer
    request.add_header("Referer", 'https://tieba.baidu.com/index.html')
    # 请求URL
    response = urllib.request.urlopen(request)
    print('请求头部信息:', request.headers)
    # print('返回头部信息:',response.headers)

if __name__ == '__main__':
    randomWeb()
```
