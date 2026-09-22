# Python反反爬之访问逻辑-推心置腹

> **作者**: Java_S | **发布时间**: 2020-12-31 18:33:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 9010 / 14
> **原文**: [https://www.52pojie.cn/thread-1341502-1-1.html](https://www.52pojie.cn/thread-1341502-1-1.html)

---

## 写在前面

Python反反爬系列

1. [JS混淆---源码乱码](https://www.52pojie.cn/thread-1337317-1-1.html)
2. [JS混淆---动态Cookie](https://www.52pojie.cn/thread-1339239-1-1.html)

这次的题目相比于前两次的题目简单一些,话不多说,我们直接开整

### 题目

![](https://syjun.vip/usr/uploads/2020/12/2477449326.jpg)
题目网址,[点我去刷题](http://match.yuanrenxue.com/match/3)
抓取下列5页商标的数据，并将出现频率最高的申请号填入答案中

### 分析网页

老规矩,我们还是首先打开刷题网站,接着打开谷歌调试工具
查看【XHR】里面的内容
![](https://syjun.vip/usr/uploads/2020/12/2023583190.jpg)
跟前两道题是一样的,数据都是通过ajax传递的,我们也不用去打开这个网址了
经过前面两道题的经验,直接打开肯定是不行的
我们来到【ALL】里面,查看一下所有的请求
![](https://syjun.vip/usr/uploads/2020/12/3966772207.jpg)
我们可以看到有两个名为【3】的请求,但是这两个是不一样的
第一个的url是:[http://match.yuanrenxue.com/match/3,也就是题目的这个网址](http://match.yuanrenxue.com/match/3%2C%E4%B9%9F%E5%B0%B1%E6%98%AF%E9%A2%98%E7%9B%AE%E7%9A%84%E8%BF%99%E4%B8%AA%E7%BD%91%E5%9D%80)
第二个的url是:[http://match.yuanrenxue.com/api/match/3,是网页数据来源的网址](http://match.yuanrenxue.com/api/match/3%2C%E6%98%AF%E7%BD%91%E9%A1%B5%E6%95%B0%E6%8D%AE%E6%9D%A5%E6%BA%90%E7%9A%84%E7%BD%91%E5%9D%80)
根据我们第二题的经验可能会去对比两个名字相同的请求,但是在这道题里面,可比性不大

那么就点击数据来源的网址,看看请求的一些信息
![](https://syjun.vip/usr/uploads/2020/12/55395977.jpg)
可以发现有一条【Set-Cookie】的信息,很特别

查看前面的几条请求,可以发现,只有红色方框请求有这个值,连第一个名为【3】的请求也没有
![](https://syjun.vip/usr/uploads/2020/12/3398747645.jpg)

那么,我们就可以推测,是不是这个名为【logo】的请求动了什么手脚
我们点击页面的下一页,看看有没有新的变化
![](https://syjun.vip/usr/uploads/2020/12/3159082667.jpg)
可以发现,名为【logo】的请求又出现了,而且每次都是在网页数据来源请求之前
那么,这道题目的逻辑就很清楚了,要想正常的拿到网页数据,就必须先访问【logo】这个请求

### 【logo】到底做了什么

![](https://syjun.vip/usr/uploads/2020/12/2432555906.jpg)
我们查看【logo】这个请求,也没有发现JS的代码,平平无奇
所以,我们可以大胆的做这个猜测

1. 首先访问http://match.yuanrenxue.com/logo，在响应头中取得sessionid的值
2. 接着再去访问网页数据来源的网址

### 验证猜想

```
import requests

# 实例化session
session = requests.session()

# 设置请求头,必须这么写,不然会请求失败,
# 具体原因我也不是很知道,如果有大佬知道的话,可以分享一下
headers = { 'Connection': 'keep-alive',
            'User-Agent': 'yuanrenxue.project',
            'Accept': '*/*',
            'Origin': 'http://match.yuanrenxue.com',
            'Referer': 'http://match.yuanrenxue.com/match/3',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'zh-CN,zh;q=0.9,en-GB;q=0.8,en;q=0.7',
           }
# 名为【logo】请求的url
url = 'http://match.yuanrenxue.com/logo'
# 设置请求头数据
session.headers = headers
# 使用session发起请求
response = session.post(url=url)

url_api = f'http://match.yuanrenxue.com/api/match/3'
res = session.get(url=url_api).json()
# 成功获取到数据,猜想成功
print(res)
#{'status': '1', 'state': 'success',
# 'data': [{'value': 2838}, {'value': 7609}, {'value': 8717},
# {'value': 6923}, {'value': 5325}, {'value': 4118}, {'value': 8884},
# {'value': 8717}, {'value': 2680}, {'value': 3721}]}
```

通过这样的方式,我们如愿以偿地拿到了数据,我们就可以愉快地写Python代码解答题目啦

### 解出答案

```
# @BY     :Java_S
# @Time   :2020/12/31 15:45
# @Slogan :够坚定够努力大门自然会有人敲,别怕没人赏识就像三十岁的梵高

import requests
import pandas as pd

def get_data(page_num):
    session = requests.session()

    headers = { 'Connection': 'keep-alive',
                'User-Agent': 'yuanrenxue.project',
                'Accept': '*/*',
                'Origin': 'http://match.yuanrenxue.com',
                'Referer': 'http://match.yuanrenxue.com/match/3',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'zh-CN,zh;q=0.9,en-GB;q=0.8,en;q=0.7',
               }
    url = 'http://match.yuanrenxue.com/logo'
    session.headers = headers
    response = session.post(url=url)

    url_api = f'http://match.yuanrenxue.com/api/match/3?page={page_num}'
    res = session.get(url=url_api).json()
    data = [i['value']for i in res['data']]
    return data

if __name__ == '__main__':
    data = []
    for i in range(1,6):
        data_list = get_data(i)
        data.extend(data_list)
    count = pd.value_counts(data)
    print(count)
```

![](https://syjun.vip/usr/uploads/2020/12/3790940.jpg)

这次的题目是:统计出现频率最高的申请号,因为我之前学过Pandas,所以直接用了里面的函数得出答案

最后提前祝大家新年快乐,这个系列,明年继续更新!
