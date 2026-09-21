# 爬虫之巧用BurpSuite获取m3u8视频真实mp4地址

> **作者**: txq0211 | **发布时间**: 2022-04-05 13:42:00 | **版块**: 『编程语言区』 | **查看/回复**: 7882 / 23
> **原文**: [https://www.52pojie.cn/thread-1616797-1-1.html](https://www.52pojie.cn/thread-1616797-1-1.html)

---

*本帖最后由 txq0211 于 2022-4-5 14:47 编辑*

帮别人下载视频，一看m3u8的，被分割成2MB，如果按照网上别的视频下载方式，100多段视频有点麻烦。

![](https://attach.52pojie.cn/forum/202204/05/132257ebrcpi9tbri8pzci.png)

作为菜鸟，逆向学习有点难。
于是尝试着用BurpSuite抓抓包试试，果然发现了惊喜。
**[BurpSuite2022.2.2汉化和谐便携版本-多系统Windows Linux Mac免装](https://www.52pojie.cn/thread-1580837-1-1.html)**（声明：这个工具有点刑，慎用，burp学得好，牢饭吃到饱）
此方法仅用于学习，不能用于其他用途。
于是，通过使用【代{过}{滤}理】和【重放器】，将post请求拦截再重放，发现了这个。

![](https://attach.52pojie.cn/forum/202204/05/132842g69c6yhpnx9yftho.png)

![](https://attach.52pojie.cn/forum/202204/05/132845rrjj577d7blh73m6.png)

第三幅图，我们可以发现关键性的pre\_view\_url里面有个东东有点像视频下载链接，
但是没有链接的/，里面的%2F如果换成/倒是像极了下载地址，如是，把%2F替换成/，%3A替换成：
然后吧furl=后面的https开始那一段复制到迅雷，果然行。
可以直接解析出MP4视频，那m3u8哪有MP4方便。
post参数resourceIdInt可以从第一个post请求的返回值得到。
链接里面有一个关键词id，不同是视频只需替换id即可

![](https://attach.52pojie.cn/forum/202204/05/135854wvzq2xghm9it1zzz.png)

于是，便有了。

![](https://attach.52pojie.cn/forum/202204/05/134157cyzxypjb6yoputyj.png)

（如有不当处，请大神指教）

[Python] *纯文本查看*

```
import requests
import json
from tqdm import tqdm

data_id = {'id':'45bdd13e-82aa-11ea-a664-fa163e216734'}
url = 'http://114.116.94.253/sjjx/web/mslt/view'
href = 'http://114.116.94.253/dsideal_yy/sjjx/web/base/resourceInfo/view'
title = '%s.mp4'%json.loads(requests.post(url, data=data_id).text)["data"][0]["title"]
resource_id = json.loads(requests.post(url, data=data_id).text)["data"][0]["resource_id"]
mp4_url = json.loads(requests.post(href, data={'resourceIdInt':resource_id}).text)["list"]["pre_view_url"].split('furl=')[1].replace('%3A',':').replace('%2F','/')
print(title)
print(mp4_url)
response = requests.get(mp4_url, stream=True)
with open(title,'wb') as f:
    for i in tqdm(response.iter_content(chunk_size=1024)):
        f.write(i)
```
