# JS逆向 房天下登录RSA

> **作者**: Samuel2h3 | **发布时间**: 2020-02-21 13:16:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6458 / 27
> **原文**: [https://www.52pojie.cn/thread-1111948-1-1.html](https://www.52pojie.cn/thread-1111948-1-1.html)

---

### 0x01 目标网址

> aHR0cHM6Ly9wYXNzcG9ydC5mYW5nLmNvbS8NCg==

### 0x02 定位js

1.随变输入账号和密码，点击登录，查看提交的参数

![](http://mingyang920.com/blog/img/Snipaste_2020-02-21_11-13-05.png)

2. 我们可以看到， 密码进行了加密，接下来我们搜索参数 pwd

![](http://mingyang920.com/blog/img/Snipaste_2020-02-21_11-16-17.png)

3.点击跟进去，然后进行代码格式化，在pwd处打上断点

![](http://mingyang920.com/blog/img/Snipaste_2020-02-21_11-18-51.png)

### 0x03 分析js

1.打上断点之后，我们再次点击登录，停在了我们打断点的地方

![](http://mingyang920.com/blog/img/Snipaste_2020-02-21_11-30-06.png)

2.我们跟进去加密函数，代码格式化，RSA.min.js，明显就是 RSA算法，我们把所有的 js拷贝出来

![](http://mingyang920.com/blog/img/Snipaste_2020-02-21_11-32-06.png)

3.我们分析`key_to_encode`，我们全局搜索一下，可以搜索到，我们复制下来

![](http://mingyang920.com/blog/img/Snipaste_2020-02-21_11-35-28.png)

4.仿照上面的方式，我们写一个加密函数

```
function getPwd(password) { // password 我们输入的明文密码
    var pwd = encryptedString(key_to_encode, password);
    return pwd
}
```

### 0x04 Python代码

```
#!/usr/bin/env python
# -*- coding: utf-8 -*-
# !/usr/bin/env python
# -*- coding: utf-8 -*-
import requests
import execjs

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0; DUK-AL20 Build/HUAWEIDUK-AL20; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.132 MQQBrowser/6.2 TBS/044353 Mobile Safari/537.36 MicroMessenger/6.7.3.1360(0x26070333) NetType/WIFI Language/zh_CN Process/tools',
    'Referer': 'https://passport.fang.com/'
}

class FangJS(object):
    def __init__(self, username=None, password=None):
        self.url = 'https://passport.fang.com/'
        self.login_url = 'https://passport.fang.com/login.api'
        self.username = username
        self.password = password
        self.ctx = None
        self.data = {
            'Service': 'soufun-passport-web',
            'AutoLogin': '1',
            'uid': self.username
        }

    def get_pwd(self):
        """
        执行js 获取pwd
        """
        if self.ctx is None:  # 复用ctx 如果ctx为空才创建
            with open('./fang.js', 'r', encoding='utf-8') as f:
                self.ctx = execjs.compile(f.read())
        print(self.password)
        pwd = self.ctx.call('getPwd', self.password)
        print(pwd)
        self.data['pwd'] = pwd  # data中的pwd参数重新赋值

    def login(self):
        resp = requests.post(self.login_url, headers=HEADERS, data=self.data)
        print(resp.json())

if __name__ == '__main__':
    fang_js = FangJS('房天下账号', '房天下密码')
    fang_js.get_pwd()
    print(fang_js.data)
    fang_js.login()
```

### 0x05 调用测试

![](http://mingyang920.com/blog/img/Snipaste_2020-02-21_12-02-02.png)

以上就是今天的内容了，本文仅供学习交流使用，如有任何利益问题请联系笔者删除，祝大家学习愉快
