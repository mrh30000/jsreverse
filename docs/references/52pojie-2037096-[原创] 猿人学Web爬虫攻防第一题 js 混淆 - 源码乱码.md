# [原创] 猿人学Web爬虫攻防第一题:js 混淆 - 源码乱码

> **作者**: ZenoMiao | **发布时间**: 2025-06-07 13:03:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3391 / 9
> **原文**: [https://www.52pojie.cn/thread-2037096-1-1.html](https://www.52pojie.cn/thread-2037096-1-1.html)

---

*本帖最后由 ZenoMiao 于 2025-6-7 13:05 编辑*

本次解题链接地址为: https://match.yuanrenxue.cn/match/1

打开浏览器F12后  看到了一个无限的debugger, 看到控制台有一堆打印出来的信息.

![](https://attach.52pojie.cn/forum/202506/07/120805ki1uyti8d97dkaik.png)

![](https://attach.52pojie.cn/forum/202506/07/120509xm9h7imm641w76mg.png)

为了防止他把浏览器刷爆, 打下script断点把console.log和setInterval给hook了

在翻页之后, 已知请求链接为:
https://match.yuanrenxue.cn/api/match/1?m=91bc2ee952717f069c4dded57aa16eab%E4%B8%A81749369641
https://match.yuanrenxue.cn/api/match/1?page=2&m=dccdf00ea9649eb81a75b9b912481c25%E4%B8%A81749369648
https://match.yuanrenxue.cn/api/match/1?page=3&m=945af4fe498b76666ed2369f0871e737%E4%B8%A81749369650

![](https://attach.52pojie.cn/forum/202506/07/121517effp766hv030cv6v.png)

根据链接的分析应该是一串暂时未知的加密+|+时间戳组成, 加密参数应该是跟后面的时间戳息息相关

重新刷新网页打上script断点一步步查看运行的js有没有可疑的地方

在打script断点的过程中. 发现有部分代码是通过eval执行的, 也打上断点

![](https://attach.52pojie.cn/forum/202506/07/122920dacn9ltnfepttkjw.png)

当进入到名为oo0O0的方法时, 查看他的形参mw发现是时间戳, 其时间戳跟请求参数m的时间戳极为相似,则跟堆栈看一下是哪里调用了他.

![](https://attach.52pojie.cn/forum/202506/07/123219uwwlv6jklwlqq6kj.png)

在方法oo0O0的返回前一行  发现又是一行eval的代码, 跟进去后发现是一个疑似md5的加密,

![](https://attach.52pojie.cn/forum/202506/07/125331pijbcqibrbtvqivr.png)

而底下的window.f调用了hex\_md5的参数是固定位时间戳的字符串

![](https://attach.52pojie.cn/forum/202506/07/125410snrdhzdvszhffrdf.png)

在控制台试一下是否标准md5加密

![](https://attach.52pojie.cn/forum/202506/07/125912ll240xu8x6tiit5u.png)

确认不是标准md5加密后  把js代码扣下来,然后对比一下跟浏览器运行结果是否一样

![](https://attach.52pojie.cn/forum/202506/07/125937zuzexvy5epfppxpf.png)

![](https://attach.52pojie.cn/forum/202506/07/130003huoz5yjljzyckuad.png)

确认一样之后, 加密代码就扣完了下面是撸Python代码的时候了

[Python] *纯文本查看*

```

import statistics
import subprocess
import time

import requests_html

requests = requests_html.HTMLSession()
def main():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Cookie': 'sessionid=自己的sessionid',
    }
    avg = list()
    for i in range(1, 6):
        _time = str(int(time.time()) * 1000 + 100000000)
        m = subprocess.Popen("node 1.js混淆-源码乱码 " + _time, encoding="utf-8", stdout=subprocess.PIPE)
        m = m.stdout.read().replace('\n', '') + '丨' + _time[:10]
        url = 'https://match.yuanrenxue.cn/api/match/1'
        params = {
            'page': i,
            'm': m
        }
        response = requests.get(url, params=params, headers=headers).json()
        for j in response['data']:
            avg.append(j['value'])
        print(response)
    print(avg)
    print(statistics.mean(avg))

if __name__ == '__main__':
    main()
```

运行后获得结果, 大功告成打完收工!

![](https://attach.52pojie.cn/forum/202506/07/130326x8kw3uf7w8m0xk9a.png)
