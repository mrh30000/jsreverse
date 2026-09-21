---
title: "cloudflare 5s盾分析-CSDN博客"
source: "https://blog.csdn.net/qq_21050249/article/details/131571780?spm=1001.2014.3001.5501"
author:
  - "[[成就一亿技术人!]]"
  - "[[hope_wisdom 发出的红包]]"
published:
created: 2026-07-10
description: "文章浏览阅读1.3w次，点赞12次，收藏59次。文章详细分析了Cloudflare5s盾的验证过程，包括初始化页面、POST请求、normalHTML页面请求、环境校验以及获取cf_clearance的步骤。过程中涉及加密、解密以及特定环境变量的校验。成功通过验证后可获取cf_clearancecookie以访问网站。"
tags:
  - "clippings"
---
## 前言

工作中遇到了有这个的网站 所以来搞一下

欢迎关注我的公众号  
![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/da3811c4643c1203863bdcbd8ae0d4a4.png#pic_center)

### 分析请求

先看看整体的流程

![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/68d770d3450a6cab1e0ff500dab33799.png#pic_center)

拿到最后的 cf\_clearance cookie 就是验证通过了

#### 第一步 初始化页面

![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/598300ec78e089598050cce0ca956084.png#pic_center)

页面内容 需要获取 \_cf\_chl\_opt 这个中的部分值  
和 md 在最后一步post 请求中会用到md  
\_cf\_chl\_opt.cRay 拼接 要请求的JS 地址

```
self._js_1_url = f'***/cdn-cgi/challenge-platform/h/{cFPWv}/orchestrate/managed/v1?ray={cRay}'
1
```

大部分都是这个格式

#### 第二步

第一步的 JS 会发生一个 post 请求  
地址为

```
platform/h/g/flow/ov1/733297980:1688606447:HQv3MvVys5gnB9nrg2GMxuQz8eKvxSMvzd6FTHs5B0E/7e245d2bee981840/5efdbf7ebbe3f50
https://***/cdn-cgi/challenge-platform/h/g/flow/ov1/{js中的某个值}/cRay/{cHash}
12
```

发送数据为

```
{
    "chReq": "managed",
    "cNounce": "40056",
    "cvId": "2",
    "chC": 0,
    "chCAS": 0,
    "oV": 1,
    "cRq": {
        "ru": "aHR0cHM6Ly93d3cuYWxsZWdpYW50YWlyLmNvbS8=",
        "ra": "TW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTVfNykgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzExNC4wLjAuMCBTYWZhcmkvNTM3LjM2",
        "rm": "R0VU",
        "d": "KFSDJOFVmoj82BwR/FXAvmyHO7c0OIEUpTl6E7f8AtMMuXL+tcWhwUaEEI98z3C93JqXNA1QR+jWncGHtDEbC2d2g8m1nXikiEBO3waPXKbD+H1nSP/j6FYAqwl3gt7VP82rQuCrT/jbrLTmmcB/7QqpEVkVjLblzG3ZU91rJlT5Z7t9qS8mkh8TqpRS2589EJnLP52yxugQ8Uypom6B2WevozesJ0HHfqFwKj/n2rGekZMqaztprT09EDkog+C+d+sVTTe1JKfEgMFiLUDh4q2+kNFj2sGdGwnHmDFXFOHSmE0pV4+R115loViUuKy6Is3xk3uHM5r0r74KLXgCLcIiW2thrlFLCSe6EjLKV5hL0KKTygnMEyjvSVbNRriyzL747LwIH1HvpUx2+5BZxrIsZW6ehoBbalCipgy8qtdOTNGD2J9IsLdO0vApORMAoAX3ag8nwYE1XNnwWMPreAaPqLSmV9FG9ScOJcsc3eQW6lE30I515+QGfKodTrrXr2wv9vKcAJ/7bkNkq8aETDdWPFsMDwri0h522yC0dUIBiqU3G0K3rajfotir2yH3BHj9RVQg+Fu9nRyyXfgsbN8PPofxWwVRMqLiclJZszxhIkt/g1g237Sv6O1jmam3",
        "t": "MTY4ODYxMTM3NC44MDAwMDA=",
        "cT": 1688611374,
        "m": "kw/e2dwgtrWr9v84KaUNpllMVkA+9E5Bs7IfWyHDsWs=",
        "i1": "gZG6zyNbCiGlwncYw4DBaA==",
        "i2": "vbHMdj8uMdxJnpRkQs9y4g==",
        "zh": "Y3OoAsWGs8ShmcO7iHaBto+gGoelE8ZB/pf+9RpLrwo=",
        "uh": "xR8CtO7r16zI2pMrrz9IVIrV+K1oemYOymcQjo5KlbY=",
        "hh": "T0wGGEaOTl1FXca+/ZzlgBao5CR/fBMfjzoqcDV4/cw="
    },
    "ie": {
        "kd": 0,
        "pm": 0,
        "po": 0,
        "ts": 0,
        "mm": 0,
        "cl": 0,
        "t": 0
    },
    "wPr": {},
    "if": false,
    "ffs": false
}
12345678910111213141516171819202122232425262728293031323334
```

都是第一步提取的  
加密后 再发出去  
![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/3e415718c359759cc157e9f5e95ce898.png#pic_center)

name = v\_{cRay}  
因为返回的数据 需要用 cRay 解密  
每次post 数据格式都这样 就不过多说明了

#### 第三步 normal

需要请求一个 后缀为normal 的 html 页面

```
https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/g/turnstile/if/ov2/av0/rcv0/0/h4gmc/0x4AAAAAAADnPIDROrmt1Wwj/dark/normal

h4gmc 随机五位字符
0x4AAAAAAADnPIDROrmt1Wwj 为 网站的key  固定的
1234
```

![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/70f81471a4cf7a453fb7836a6506a59f.png#pic_center)

还是需要 cray 和 chash 和部分参数  
在根据 cray 请求第二次的js  
要加密的数据

```
{
    "chReq": "chl_api_m",
    "cNounce": "28481",
    "cvId": "2",
    "chC": 0,
    "chCAS": 0,
    "oV": 1,
    "cRq": {
        "ru": "aHR0cDovL2NoYWxsZW5nZXMuY2xvdWRmbGFyZS5jb20vY2RuLWNnaS9jaGFsbGVuZ2UtcGxhdGZvcm0vaC9nL3R1cm5zdGlsZS9pZi9vdjIvYXYwL3JjdjAvMC9qaHk2YS8weDRBQUFBQUFBRG5QSURST3JtdDFXd2ovZGFyay9ub3JtYWw=",
        "ra": "TW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTVfNykgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzExNC4wLjAuMCBTYWZhcmkvNTM3LjM2",
        "rm": "R0VU",
        "d": "iTfgNjLhgpaI0mwE+Hoyjm3sRdbCSqUZqoJQPIObCxGSElpFFhNCvf/xyPhECrj4Yo1sdMNMfnviK37oFIKrzN9+C6hHQPds4sGcrMlTGaf4cMmRFh1x9Jt1h3QGas0IVBVgqNDzBVv/s2dE3502O3CiVY2ruKe0fWPfrAl8TT7CtGUnOpK871hMeQKbbSg708DGaeDDiatz4lIgJxxFbVdcOEEAHXBGRF6s29RfMYM9pIb09K2AbaDO9ORxyrbddR7AbbcGgpXUA9Mnfz3bQvLp1P+QL4apvpC+2RPIDMucP5IgJDw4ytAW6cwfv9EHIJsrkZs69aEXuFZLqm/Bq/yEDPNrs9N0nSFERQmUwMsQ8xwkZTg+W/XMO9tK63mdkMEF9sExxw9sN2yFhkkBMOqECC/L8ZValqfKKKRhMfovcexhLi4TxBJ6eMLKF0ZSX5JI2bGOPQS1tKhLnhtYh+c5KiGPU4jA8xrQKLJVAkEJLieOpP3lIpXGXKD3nFqZAl1CgS6r+OawJxK/A88f4s3DpNGQlP4BI4QJ10P/32M=",
        "t": "MTY4ODYxMTQ0MC44NzE=",
        "m": "VS9+Gsyx7EPMX6/gVYBpyiwfLlVGmC7T38bmHs3RAhU=",
        "i1": "9k9pl1+0xD1jrTpl9UA/bw==",
        "i2": "hG8J/PtG3f4yyO74nwUikg==",
        "uh": "xR8CtO7r16zI2pMrrz9IVIrV+K1oemYOymcQjo5KlbY=",
        "hh": "WCiLdNo2uN2aXsfJJhG2HFkP3bOo0fw8tsFAppLisvs=",
        "zh": "9D+zbxCfwBPyr1pF5Wb5E9kRItcGU2xCgzO1zGTKToQ="
    },
    "ie": {
        "kd": 0,
        "pm": 0,
        "po": 0,
        "ts": 0,
        "mm": 0,
        "cl": 0,
        "t": 0
    },
    "wPr": {},
    "if": true,
    "ffs": false,
    "chlApivId": "0",
    "chlApiWidgetId": "jhy6a",
    "chlApiSitekey": "0x4AAAAAAADnPIDROrmt1Wwj",
    "chlApiAction": "managed",
    "chlApicData": "7e247f446c5b3ad6",
    "chlApiChlPageData": "3gAFo2l2MbhwV2FqUDdWcmMva2s3NXF1Zk0zVWRRPT2jaXYyuGwzcFdYcGJVSzV5Y3VIWnBWaFEvWXc9PaFk2gEsMVdTTzFCK3pkTG9JMEZ3eXRIVk9qNVFSRWZQOEd4RWRIMkcvMFdjL0c2ekt0WStBNnY0Y0dqczh2d3h5eUdUOHJzT1ltQUVtNjFDQWFQRVJvTGlxYjlpaGVUOHFXS3BBT1JSbkVlMHRxSmlwdjV0M0ZIVmJjcHJkRU5yekllbWpXaDIySjF2dWZoeFJKajVnSWtWNG5HOTBEK0dYNTArbDFZVWY2Ukdic3UwOWNHYW1TUGpTN1N1dEIvYWNlUHVzL0FqMmlxcUhKSzJlY0JJcHBybm92a2ExYXdLbkxwK0VNVy8xZkh0QlhseVA1Z3pNeks2bjliRk9Pd210ODZsZWpqUTIvdVFXRHg2aVdyMGpocjRzQzdjL3YyTFlVSFd5aDZUYnZKYU14d009oW3ZLDlyQjROb0NKOXo4Qmw0YXkzWmNZNUJiMnV0NWJmMlBmOE1OVjZZd2JZT2s9oXS0TVRZNE9EWXhNVFF6Tnk0NU1qZz0=",
    "chlApiACCH": "19b997cb",
    "chlApiUrl": "初始化地址",
    "chlApiOrigin": "初始化地址",
    "chlApiRcV": "1/fif1NcEDXIlC2ll"
}
pageData 是这步js 中的 
chlApicData 是第一步的cray 应该是要做关联的
123456789101112131415161718192021222324252627282930313233343536373839404142434445
```

加密后在发出 会返回 一个长字符串  
![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/d34aecf680892758187bd219e7c2fd22.png#pic_center)

一般长度会在 十几万到二十几万之间  
解密后 有两种分支 w.startsWith(‘window.\_’) 根据开头字符判断  
格式一 明文代码分支 这个就简单了  
格式二 vmp 分支 所有代码会进入vmp 中执行  
这步就是最难得步骤了 环境校验

#### 第四步 环境校验

拿到上面的代码后  
我是通过补环境的方式过的  
因为 经过测试 需要校验的环境 点和 顺序是不一样的 导致无法通过还原算法的方式执行  
也不排除有大神可以直接还原 反正我做不到…  
![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/8c66c7589a2376091b93e361ab8a0eda.png#pic_center)

基本上就是 十几个到二十个校验点  
其中只有第一个是固定的… 其他都会变化  
!\[\[pic.png\]\]  
值得注意的一点是 他会请求一张图片  
获取图片的宽高  
https://challenges. cloudflare .com/cdn-cgi/challenge-platform/h/g/img/7e245d3fd8b72bbd/1688609982279/SSIWaTPNMJAQEpP

如上 获取完环境数据 在和之前一样 进行加密发送  
也是有两种分支

1. 校验通过 返回的 字符串解密后长度在1000-5000内 可以获得token
2. 长度为10000以上 是需要进行再次的点击验证  
	![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/64ac01f584173ed858135918e05baaa3.png#pic_center)
	```
	点击验证就是在上面的 十几个环境后再加一个
	 然后再判断是否通过 
	 解密后字符串长度在1000内就是失败了
	123
	```

#### 第五步 获取 cf\_clearance

如果环境通过 拿到 token 后 需要在发送一次 获取 sh aw 三个参数  
![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/855dd875de85ef92038336df95b79cd6.png#pic_center)

再向初始化页面 post 四个参数  
![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/906789fa2e501bcc00f82c0bb7c4d3f2.png#pic_center)

就可以拿到  
![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/a4a7c233535bbb81c0791e74923d7243.png#pic_center)

和正常的页面代码了  
![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/d043c295e31e95ebe017de6c7616148a.png#pic_center)

至此 验证就结束了  
就可以拿着 cookie 去请求了

### 注意事项

目前这个网站测试的是 需要保持 ip tls ua 完全一致  
破解时使用什么 再次使用时就需要用完全一样的 ip tls 指纹和 ua

环境校验时 有一个 fetch 请求 和 图片请求 都需要发出  
图片请求不发 百分百失败

调试时 需要注意 他对于时间的控制 很严格 页面调试时 动不动就超时失败…