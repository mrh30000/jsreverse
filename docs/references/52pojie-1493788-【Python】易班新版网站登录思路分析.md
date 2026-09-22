# 【Python】易班新版网站登录思路分析

> **作者**: TheLord | **发布时间**: 2021-08-14 11:28:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 9717 / 33
> **原文**: [https://www.52pojie.cn/thread-1493788-1-1.html](https://www.52pojie.cn/thread-1493788-1-1.html)

---

#### 0x0 起因

小弟我大一被学长一顿夜宵就给骗去了易班，不过因为我们学院的易班指导老师人挺好，一直受照顾，就留了下来，现在留主席了。因为我们学校的校易班那边每个月都有省上给的活动经费，然后申请经费的方法就是去做轻应用的数据，于是就自己写了一个小脚本去刷数据~~（EGPA和轻应用数据这些）~~
今年暑假之前易班网站通知说要升级，当时没太在意，以为只是前端稍作修改（新版本看着确实比老版本舒服的多），然后昨天寻思教一下小干事脚本怎么用，想着提前先试试看更新之后能不能用，一打开，果然GG了。

#### 0x1 分析问题

~~第一次发帖，本人非计算机专业，以下分析纯属瞎蒙，有不专业的地方还请轻点喷，文中小括号很多，求生欲非常旺盛~~
老规矩，先康康登录表单是不是变了，我们进到易班[登录页面](https://www.yiban.cn/login)，F12打开控制台，输入自己账号，点击登录。

![](https://attach.52pojie.cn/forum/202108/14/093743acqhlo34polooolo.png)

这里注意到表单中的password部分，肉眼可见这是把密码进行了加密（以前登录的时候表单里面的密码是不强制要求加密的，可以直接post密码明文）。看密文样子，不太像Base64（原谅我才疏学浅，第一时间就想的是base64{:1\_907:} ）拿去试着解密了一下，嗯，不出意外的是一串乱码。不是Base64那稍微常用的就是RSA了，再细看一下密文，确实像是RSA加密出来的。那么RSA的话，就需要去找到他的Public Key。说实话这一步挺曲折的，由于眼瞎（电子竞技不需要视力），当时想着先看看页面元素能不能找到能用的信息，Ctrl shift c找到密码框，就在那一个劲的研究，就是没看见他头上那么大一个Key{:1\_937:}

![](https://attach.52pojie.cn/forum/202108/14/102400f4dkdmqnrrkzdkd4.png)

最后我是怎么找到的，当时想着密文好歹得有Public Key，于是直接在请求里面搜，然后，就看到了头顶上的key。当时很兴奋啊，以为公钥是不变的（因为看他写在页面里面），然后因为抓登录表单的时候断了一下网，那个登录按钮一直转圈圈，就寻思刷新一下，结果刷新之后发现公钥变了。
[img=280,320][https://gimg2.baidu.com/image\_search/src=http%3A%2F%2Fpic.962.net%2Fup%2F2018-11%2F15414747135749220.jpg&refer=http%3A%2F%2Fpic.962.net&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=jpeg?sec=1631500363&t=3667f5d3f483c3ffd42170672837f403[/img](https://gimg2.baidu.com/image_search/src%3Dhttp%3A//pic.962.net/up/2018-11/15414747135749220.jpg%26refer%3Dhttp%3A//pic.962.net%26app%3D2002%26size%3Df9999%2C10000%26q%3Da80%26n%3D0%26g%3D0n%26fmt%3Djpeg?sec=1631500363&t=3667f5d3f483c3ffd42170672837f403[/img)]
有点小慌张，但是仔细看发现下头有个时间戳，再次抓登录表单，发现表单中的时间戳和页面的对得上号，那么易班的思路就是登录的时候服务器生成好公钥和验证码，然后根据时间戳验证。

#### 0x2 尝试解决

其实到这里就比较简单了，已经找到了公钥，那就直接对密码加密就行了。当时我在想的时候还饶了一个弯路，想去找到生成公钥的函数，寻思直接调用函数，找了半天也不知道是不是方法不对还是他公钥就是在服务器生成的，没找到对应函数，就放弃了，跑去打了一把吸AssGO，思路一下就开阔了，我直接抓一个登录页面不就有公钥了嘛，还要啥自行车。用request和bs4几行就实现了，代码如下

```
import requests
from bs4 import BeautifulSoup as bs

URL = 'https://www.yiban.cn/login?go=https%3A%2F%2Fwww.yiban.cn%2F'

res = requests.get(url=URL).text
soup = bs(res, 'html.parser')

keys = soup.find("ul", attrs={"class": "login-pr"})['data-keys']
keys_time = soup.find("ul", attrs={"class": "login-pr"})['data-keys-time']
print(keys)
print(keys_time)
```

![](https://attach.52pojie.cn/forum/202108/14/104641r9ww6q6qw81ycq6q.png)

公钥和时间戳到手，然后就是对密码进行加密，然后放表单里面试着post一下能不能登录成功。

```
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
import base64

def encrypt(text, cipher):
    ciphertext = cipher.encrypt(text.encode('utf8'))
    encode_text = base64.b64encode(ciphertext).decode('ascii')
    return encode_text

def encrypt_password(pub_key, password):
    rsa = RSA.importKey(pub_key)
    cipher = PKCS1_v1_5.new(rsa)
    ciphertext = encrypt(password, cipher)
    return ciphertext

pwd = encrypt_password(keys, 'zyr520')
print(pwd)
```

有了密码，似乎一切问题都解决了，丢脚本里面尝试登录一下。

![](https://attach.52pojie.cn/forum/202108/14/110243tgfhhxtzox9x6hb2.png)

果然报错了，不报错都觉得奇怪，仔细看一下是以前写的调用session的方法出了点小问题，讲道理一般的cookie抓出来都长这样（至少我在我浅薄的认识里面都是这样的）

![](https://attach.52pojie.cn/forum/202108/14/110555ddqctdjdzaiajdq3.png)

然后之前写出来的处理cookie的方法也是按照这种格式去处理的，但是似乎更新之后就GG了，尝试在网页上直接get，获取到的就是上图这种格式的cookie，但是用request去get，得到的确是这种格式的cookie

```
{"cookie": "{'YB_SSID': '02523d04f852720e55ad5b68****aff4', 'https_waf_cookie': '9efffdd7-5d71-4e72368ad8a93599a4463767eb3ec****731'}"}
```

我是没见过，感觉和记忆中的cookie样子差了一些，但是好像不太影响功能，试着手动拼接了一下，能用，管他咋来的的，能跑起来就成（实用主义者）
上面的这条cookie还是比较好处理的，我写的方法比较笨，用的正则表达式去匹配引号里面的内容，然后一个for循环写到cookielist里面最后返回出去给session用。

```
import urllib
import re

def DealCookiestr(cookie_str):
    pattern = re.compile('\'(.*?)\'')
    devided_cookie = pattern.findall(cookie_str)
    cookielist = []
    if cookie_str == "{}":
        return cookielist
    cookie = {}
    for i in range(len(devided_cookie)):
        if i%2 == 0:
            item = devided_cookie[int(i)]
            cookie['item'] = item
        else:
            item_value = devided_cookie[i]
            cookie['value'] = urllib.parse.unquote(item_value)
            cookielist.append(cookie)
    return cookielist

temp_cookie =str('{\'YB_SSID\': \'33a7a9807c0c877030a3f385****3060\', \'https_waf_cookie\': \'a3015c02-3486-44ad355f9ae09b1d5a9fb4df3a7b****3743\'}')

print(DealCookiestr(temp_cookie))
```

![](https://attach.52pojie.cn/forum/202108/14/111632qovmi9o1ljmj1mhp.png)

处理好cookie，重新运行一下。噫，他好了！:loveliness:

![](https://attach.52pojie.cn/forum/202108/14/112427qswxpdw5zxvcs5rw.png)

#### 0x3 小结

这次易班升级的地方不是很多，我目前发现的就是登录表单和返回的cookie这两处，其他的签到、发布投票、参与投票、点赞、评论等功能的接口均未发生变化（摸摸鱼，大家都好）。还是可以愉快的刷轻应用和EGPA的。