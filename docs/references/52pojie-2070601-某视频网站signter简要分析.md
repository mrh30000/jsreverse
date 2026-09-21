# 某视频网站signter简要分析

> **作者**: xiaoyangupup | **发布时间**: 2025-11-07 00:36:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2159 / 17
> **原文**: [https://www.52pojie.cn/thread-2070601-1-1.html](https://www.52pojie.cn/thread-2070601-1-1.html)

---

*本帖最后由 爱飞的猫 于 2025-11-9 21:45 编辑*

### 前言

本文将详细分析某在线教育平台（基于某利威视频服务）的signter值的逆向过程，涉及：

**声明**：本文仅供技术学习交流，请勿用于非法用途。

托管平台：aHR0cHM6Ly9rZS5zdWNjZXNza2FveWFuLmNvbS8=

### 第一步：抓包分析

![](https://attach.52pojie.cn/forum/202511/07/002425ygbzgjlixeemp9bi.png)

可以很明显的看到时某利威的加密，那我们只需要找到token的生成方式即可！因为单纯的解密，网上太多了！

![](https://attach.52pojie.cn/forum/202511/07/002645po2jy9n792b76z44.png)

可以看到这个请求的响应就是我们要的token，那么很简单复制curl用工具转python，代码如下：

```
import requests

headers = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'origin': 'https://ke.successkaoyan.com',
    'origin-url': 'https://ke.successkaoyan.com/course_watch/4/10/162',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': 'https://ke.successkaoyan.com/',
    'sec-ch-ua': '"Chromium";v="142", "Microsoft Edge";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'signter': 'c27490d081ee28734e0728494782f9bc-1762443099',
    'token': '1af5fce19d69bcb75ff8ca667f3fe79e',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
}

json_data = {
    'vid': '9c0bbf8af0caaa373efcf85a30b814d9_9',
}

response = requests.post('https://success-cloud.successkaoyan.com/home/course/ticket', headers=headers, json=json_data)
```

可以很明显的看到，里面有一个动态生成的signter，只需要把这个解决了，就可以实现批量了！那我们直接全局搜索一下！

![](https://attach.52pojie.cn/forum/202511/07/002935ilbz3g56b3lau5g5.png)

只有一个地方，并且很明显，就是这个位置，逻辑其实很简单！

```
var i = parseInt((new Date).getTime() / 1e3)  // 当前时间戳(秒)
var s = "";
Object.keys(t).sort().map((function(e) {
    (t[e] || 0 == t[e]) && (s += e + "=" + t[e] + "&")
})),
s = s.slice(0, s.length - 1) + "&" + i + "&dreamxiaobaoyyds";
var l = Object(r["md5"])(s)  // MD5加密
```

1. 获取当前时间戳(秒)
2. 参数按key排序并拼接
3. 添加时间戳和盐值 `"dreamxiaobaoyyds"`
4. MD5加密
5. 返回格式: `{md5值}-{时间戳}`

简单还原一下，拿到动态的signter，就可以拿到要的token！

那接下来是不是非常的简单，拿到课程目录的请求跟响应，响应里面肯定有VID，用VID去请求拿到token，然后进行解密下载？

```
import requests

headers = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'origin': 'https://ke.successkaoyan.com',
    'origin-url': 'https://ke.successkaoyan.com/course_info/4',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': 'https://ke.successkaoyan.com/',
    'sec-ch-ua': '"Chromium";v="142", "Microsoft Edge";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'signter': 'c51f427126723509db10869ff4bbbf54-1762443273',
    'token': '1af5fce19d69bcb75ff8ca667f3fe79e',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
}

json_data = {
    'id': '4',
}

response = requests.post('https://success-cloud.successkaoyan.com/home/course/detail', headers=headers, json=json_data)
```

接下来就可以完成很多功能了，单个/多个/全部批量下载，跳过，等等一系列的，如果不懂也可以直接扔给AI！

### 总结

本次逆向分析展示了Web加密视频的完整破解流程：

1. 抓包分析API请求
2. 逆向JS代码找到签名算法
3. 分析视频加密机制
4. 实现自动化下载工具

**技术收获**：

* MD5签名算法逆向
* AES-CBC加密解密
* HLS视频流处理
* Python异步编程

**法律声明**：本文仅供学习交流！
