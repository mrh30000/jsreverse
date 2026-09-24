# 关注公众号cookie验证删除和请求接口获取

> **作者**: TES286 | **发布时间**: 2021-09-01 11:20:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5193 / 10
> **原文**: [https://www.52pojie.cn/thread-1503959-1-1.html](https://www.52pojie.cn/thread-1503959-1-1.html)

---

## 0x01 分析

首先,先请求followedCheck,然后一个showqrcode,后面一大堆重复的getFollowState,如图

![](https://attach.52pojie.cn/forum/202109/01/111848wqhfq2ofk8so8klq.png)

看这架势,就是要知道你关注为止

## 0x02 法一: 分析请求

先看followedCheck, 翻译就是"检测关注", 看看这个请求

![](https://attach.52pojie.cn/forum/202109/01/111850go1fz7llidzllv7o.png)

返回了三个信息, 第一个pass, 顾名思义猜测是是否通过, qrPath返回的是一个微信的链接, 明显是二维码获取的链接, 最后一个ticket也不重要, 用来验证身份的

那一长串的getFollowState检测关注状态, 只返回一个状态, 如图

![](https://attach.52pojie.cn/forum/202109/01/111853tgz1v2vgsn2njokg.png)

使用reres将本请求移到本地即可, 用python的flask写一个简单的后端, ok

```
import flask
app = flask.Flask(__name__)
@app.route('/gongzhong/follow/getFollowState')
def fixCheck(path='/'):
  return '{followState: 0}', 200
app.run(port=80)
```

## 0x03 法二: 分析js

通过按钮找到单击监听的地方, 是一个闭包函数里面

![](https://attach.52pojie.cn/forum/202109/01/111855trm735u33vd9vevv.png)

大概是调用followCheck, 参数是一个函数, 主要是JQuary的Ajax, 看看followCheck

![](https://attach.52pojie.cn/forum/202109/01/111857drfeffbvz48ffzrv.png)

可以看到, 就是一大串的校验, 如果通过, 就执行callback, 不行就弹出二维码

使用以下js脚本就可以解决

```
_followCheck = followCheck;
function followCheck(callback){
  callback();
}
```

## 0x04 抓取调用url

在第三部分的按钮监听那里, 可以看到Ajax的请求参数, 可以简单的将其添加到爬虫里面

```
import requests

URL = 'SOME_URL'
toFormat = 'FORMAT'

r = requests.get(HOST + PATH + '?url={0}&toFormat={1}'.format(URL, toFormat))
if r.json()['status'] == 'error':
  print(r.json()['errorMsg'])
else:
  print(URL_ROT + r.json()['identification'])
```

> 这个网站反爬真的不行, 连ua都没验证, 最开始测试时忘记伪装ua, 后来还成功了, 很长时间之后才发现没改ua
