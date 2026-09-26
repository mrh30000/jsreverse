# 某上市导购平台Android APP签到sign逆向分析并使用Python复写加密算法

> **作者**: 白水饮 | **发布时间**: 2023-01-11 22:19:00 | **版块**: 『移动安全区』 | **查看/回复**: 12294 / 63
> **原文**: [https://www.52pojie.cn/thread-1735462-1-1.html](https://www.52pojie.cn/thread-1735462-1-1.html)

---

*本帖最后由 cry980285208 于 2023-1-12 10:00 编辑*

导购平台网址：aHR0cHM6Ly93d3cuc216ZG0uY29tLw==

由于不想每天手动签到且经常忘记签到，于是便去Github搜索相关结果，果不其然，是有相关结果的，并且更新时间还是Last Month，但是在使用过程中发现，接口总是返回验证码错误，手动在WEB端签到，发现是有滑块验证码的，在APP端签到就没有验证。

本想偷懒，看下网上有没有现成的APP端签到源码之类的，搜了一圈，没有找到，只能自己动手了，于是便有了这篇文章。

首先，直接用小黄鸟抓包看一下，找到签到接口，接口地址https://user-api.smzdm.com/checkin，看下请求的参数：

![](https://attach.52pojie.cn/forum/202301/11/210137wor3ox4myl4lrg3u.jpg)

经过多次抓包，发现变化的值，只有sign和time，weixin，f，v，sk，token都是固定值，captcha和touchstone\_event为空

再然后直接使用Jadx打开apk安装包，搜索"sign"，如下图：

![](https://attach.52pojie.cn/forum/202301/11/210807xbk65euzr7fiiyx2.jpg)

上面的这些类看起来都是第三方SDK里面的相关内容，下面的这个混淆过的这个方法e.e.b.a.n.a.a.a，非常可疑，我们进去看看，分析下

![](https://attach.52pojie.cn/forum/202301/11/211241wlo5zsj5aoe5bjab.jpg)

在这里我们就可以看到签到接口传的f，v，weixin，time一些参数了，sign这个值，是由a方法生成，我们直接点击a方法，跳转至相关代码，再进行分析：

![](https://attach.52pojie.cn/forum/202301/11/211640cn7sonjt44tj89sp.jpg)

到了这里，可以看到这个a方法传入了一个map，并对其进行了排序遍历拼接，在最后还拼接了一个&key=，这个key的值是由ZDMKeyUtil.a().b()生成的，并且最终的返回值应该是经过F这个类中的a方法进行了加密，我们先跳转至ZDMKeyUtil这个类里面再进行分析

![](https://attach.52pojie.cn/forum/202301/11/212128lhyvzvafryc44y8g.jpg)

ZDMKeyUtil这个类里面应该是加载了一个固定的key，这里我也不太确定，后面我们再通过Xposed去Hook相关方法，打印log查看

然后我们再去分析F类中的这个a方法，直接点击跳转，如下图：

![](https://attach.52pojie.cn/forum/202301/11/212745fxr0l5creuautnze.jpg)

好家伙，这一看基本就可以确定是MD5加密了

通过上面的分析，我们来总结下：sign的值是由e.e.b.a.n.a.a这个类中的a方法生成的，a这个方法做了哪些事呢？传入了一个map，并对其排序遍历拼接，最终还通过ZDMKeyUtil生成了一个key拼接后面。接下来就是通过Fa这个类中的a方法，对上面拼接的这个字符串进行MD5加密，最终生成32位大写的sign值

那么我们怎么才能得到加密前的参数并且复写加密算法呢？

我的方法是通过Xposed Hook相关类和方法，获取传参和返回值：
1.通过hook e.e.b.a.n.a.a这个类中的a方法，获取传入的map和sign值，对比小黄鸟抓包抓到的参数和sign值，确定是否是我们需要找的签到接口，因为还有其他很多接口都调用了这个方法
2.通过hook ZDMKeyUtil这个类中的方法，获取最终拼接在后面的key参数
3.通过hook Fa这个类中的a方法，获取加密前的字符串和加密后的值，注意，这里加密后为小写的sign，需转为大写的32位

相关Hook代码如下图，代码很烂，仅供参考：

![](https://attach.52pojie.cn/forum/202301/11/215329x3pp2lgfb202pgg8.jpg)

分析Xposed Log文件，Log打印结果如下图：

![](https://attach.52pojie.cn/forum/202301/11/215843sz6o0okh08b6o6e6.png)

通过查看Xposed打印的log，我们可以得出加密前的字符串格式为f=android&sk=xxx&time={timestamp}000&token=xxx&v=9.9.12&weixin=1&key=xxx，其中拼接在最后的key为固定值，如图hook success5后面的即为key的值

有了加密的文本和加密的方法，接下来，就可以用python进行复写了

[Python] *纯文本查看*

```
# -*- coding: utf-8 -*-
import time
import random
import hashlib
import requests

# MD5加密
def md5(rawstr):
    # 创建md5对象
    hl = hashlib.md5()
    hl.update(rawstr.encode(encoding='UTF-8'))
    return hl.hexdigest().upper()

def checkin(cookie):
    signurl = "https://user-api.smzdm.com/checkin"
    zdmkey = 'apr1$AwP!wRRT$gJ/q.X24poeBInlUJC'
    zdmsk = '填写抓包抓到的sk值'
    zdmtoken = cookie[5:]
    timestamp = int(time.time())
    rawdata = f'f=android&sk={zdmsk}&time={timestamp}000&token={zdmtoken}&v=9.9.12&weixin=1&key={zdmkey}'
    sign = md5(rawdata)
    formdata = {
        "sk": zdmsk,
        "sign": sign,
        "weixin": "1",
        "v": "9.9.12",
        "captcha": "",
        "f": "android",
        "token": zdmtoken,
        "touchstone_event": "",
        "time": f"{timestamp}000"
    }
    headers = {
        "User-Agent": 'smzdm_android_V9.9.12 rv:683 (Redmi K20 Pro;Android11;zh)smzdmapp',
        "Cookie": cookie,
        "Accept-Encoding": 'gzip',
        "Connection": "Keep-Alive",
        "request_key": f"{random.randint(10000000, 99999999)}{timestamp}",
    }
    resp = requests.post(signurl, headers=headers, data=formdata).json()
    if resp["error_code"] == '0':
        resp_data = resp["data"]
        checkin_num = resp_data["daily_num"]
        gold = resp_data["cgold"]
        silver = resp_data["pre_re_silver"]
        point = resp_data["cpoints"]
        exp = resp_data["cexperience"]
        rank = resp_data["rank"]
        cards = resp_data["cards"]
        msg = f"""&#127941;签到成功\n&#127941;已连续签到{checkin_num}天\n&#127941;等级{rank}\n&#127941;补签卡{cards}\n&#127941;碎银{silver}\n&#127941;金币{gold}\n&#127941;积分{point}\n&#127941;经验{exp}"""
        print(msg)
    else:
        msg = f'签到失败！失败原因：{resp["error_msg"]}'
        print(msg)

if __name__ == "__main__":
    zdmcookie = "填写ZDMCookie"
    checkin(zdmcookie)
```

写在最后：签到接口中，headers中还有一个参数request\_key，通过Jadx分析APP源码，可以发现request\_key是由一个随机数拼接当前时间戳而成的，源代码如下：

![](https://attach.52pojie.cn/forum/202301/11/221217saa0w6akedjgwr1p.jpg)

sk参数为固定值，分析app源码，似乎是由Cookie中的sess，用户id等信息生成的，具体怎么生成的就不深究了，反正为固定值，直接用抓包中的值就行了
token参数也是固定值，也就是Cookie中的sess
感兴趣的可以将代码用云函数改写一下，每天定时签到，也可以加上server酱，钉钉，企业微信推送，我就不献丑了
