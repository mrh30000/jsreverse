# Python学习通（一）手机号POST登录

> **作者**: 7c丶陪你 | **发布时间**: 2024-05-29 21:23:00 | **版块**: 『编程语言区』 | **查看/回复**: 4247 / 15
> **原文**: [https://www.52pojie.cn/thread-1929548-1-1.html](https://www.52pojie.cn/thread-1929548-1-1.html)

---

之前用selenium的Edge写过一个脚本，评论区说定位方式不好，后面闲着无聊又对学习通做了研究研究。
帐密随便输入，浏览器F12抓包得到下面：

![](https://attach.52pojie.cn/forum/202405/29/205426q9svyz11teio3vle.png)

参数：

![](https://attach.52pojie.cn/forum/202405/29/205542v2804i5myzggaw77.jpg)

通过看提交的表单，直白的看出：uname和password 一个是账号一个是密码，最直白的是后面的password。  看到（==）盲猜base64加密了，直接搜base64

![](https://attach.52pojie.cn/forum/202405/29/210246vvtc8cuxiv3ztuce.jpg)

得到这个JS也比较直白login.js      还有一个//pwd=xxxxxxx的明显字样，那这个JS就八九不离十了。

![](https://attach.52pojie.cn/forum/202405/29/210533qizx0v7jmou7zm0j.jpg)

从这里看到 pwd  用了encryptByAES加密，key是"u2oh6Vu^HWe4\_AES" 但是这里只看到了 password的加密，而uname的呢？其实定位到这个位置，往上拉一下，JS就有备注【//手机号+密码登录 function loginByPhoneAndPwd()】那uname的加密可能就在附件不远了，因为我们就是手机号+密码登录，往下找一找，可以直接看到POST参数的构成。

![](https://attach.52pojie.cn/forum/202405/29/211246sw00tw8q827hhr2w.jpg)

确认了Uname和Password都是encryptByAES加密，加密的key是"u2oh6Vu^HWe4\_AES" ，那么现在就需要去看看encryptByAES进行了怎么操作。

![](https://attach.52pojie.cn/forum/202405/29/211613hlnhh19f93czueqc.jpg)

接下来就是敲代码环节了。

[Python] *纯文本查看*

```

from Crypto.Cipher import AES
import base64

uname="手机号码"
password="密码"
TransferKey="u2oh6Vu^HWe4_AES"

def EncryptAES(TransferKey, Encryptcontent):
    AesKey = TransferKey.encode('utf-8')
    Iv = TransferKey.encode('utf-8')
    Encrypttext = Encryptcontent.encode('utf-8')
    EncryptMode = AES.MODE_CBC
    Cipher = AES.new(key=AesKey, mode=EncryptMode, IV=Iv)
    EncrData = Cipher.encrypt(pad(Encrypttext, 16, 'pkcs7'))
    Data = base64.b64encode(EncrData).decode('utf-8')
    return Data

def LoginXXT(Username, Userpassword, TransferKey):
    username = EncryptAES(TransferKey, Username)
    userpassword = EncryptAES(TransferKey, Userpassword)
    Url = 'https://passport2.chaoxing.com/fanyalogin'
    header = Get_Header()
    header.update({'Host': 'passport2.chaoxing.com'})
    Data = {
        'fid': '-1',
        'uname': username,
        'password': userpassword,
        'refer': 'http://i.chaoxing.com',
        't': 'true',
        'forbidotherlogin': '0',
        'validate': '',
        'doubleFactorLogin': '0',
        'independentId': '0',
        'independentNameId': '0'
    }
    respones = re.post(url=Url, headers=header, data=Data)
    if respones.status_code == 200:
        JsonData = respones.json()
        Cause = JsonData['status']
        if Cause:
            Cookies = respones.cookies
            Cookie = re.utils.dict_from_cookiejar(Cookies)
            UserId = Cookie['_uid']
            return Cookie, UserId
        else:
            Cause = JsonData['msg2']
            print(f'登录失败，原因：{Cause}')
            return "", ""
    else:
        print(f'登录失败，POST错误代码：{respones.status_code}')
        return "", ""
```

登录后获取cookie和userid,为后面的操作做准备。
太久没写贴了，忘记怎么写了，如果违规请版主或管理员指正修改。