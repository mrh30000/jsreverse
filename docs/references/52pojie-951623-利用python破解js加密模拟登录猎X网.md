# 利用python破解js加密模拟登录猎X网

> **作者**: frankyxu | **发布时间**: 2019-05-09 11:02:00 | **版块**: 『编程语言区』 | **查看/回复**: 7765 / 24
> **原文**: [https://www.52pojie.cn/thread-951623-1-1.html](https://www.52pojie.cn/thread-951623-1-1.html)

---

*本帖最后由 wushaominkk 于 2019-6-6 21:07 编辑*

## python模拟登录猎聘

### 好久没写python相关的教程了，这次给大家带来的是python模拟登录猎聘，这次主要用到的技术就是python模拟执行js，分析js请求，调用python库，执行js

## 原理

### 利用python的requests包模拟正常请求，拿到登录cookie，其中会遇到js加密解密

## 代码

```
# -*- coding: utf-8 -*-
# @Time    : 2019/5/8 下午1:53
# @AuThor  : xuzongyuan
# @site    : guapier.github.io
# @file    : login.py
# @Software: PyCharm
# @Function: 模拟登录猎聘
import time
import requests
import execjs
import re
import json
import hashlib

headers = {
    'Referer': 'https://www.liepin.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) '
                  'Chrome/73.0.3683.103 Safari/537.36',
    'DNT': '1',
}

def loads_jsonp(_jsonp):
    """
    解析jsonp数据格式为json
    :return:
    """
    try:
        return json.loads(re.match(".*?({.*}).*", _jsonp, re.S).group(1))
    except:
        raise ValueError('Invalid Input')

def get_token(username):
    """
    获取用户token和加密js
    :param username: 用户名
    :return:
    """
    params = (
        ('sign', username),
        ('callback', 'jQuery171029989774566236793_' + timestamp),
        ('_', timestamp),
    )

    response = requests.get('https://passport.liepin.com/verificationcode/v1/js.json', headers=headers, params=params)
    print(response.text)
    return loads_jsonp(response.text)

def login(username, password):
    """
    登录
    :param username: 用户名
    :param password: 密码
    :return:
    """
    result = get_token(username)
    token = result.get('data').get('token')
    js = result.get('data').get('js')
    print(token, js, sep='\n')

    ctx = execjs.compile(js)
    value = ctx.call('encryptData', username)

    m = hashlib.md5()
    m.update(password.encode('utf-8'))

    params = (
        ('callback', 'jQuery17108618602708711502_'+timestamp),
        ('login', username),
        ('pwd', m.hexdigest()),
        ('token', token),
        ('value', value),
        ('url', ''),
        ('_bi_source', '0'),
        ('_bi_role', '0'),
        ('_', timestamp),
    )

    response = requests.get('https://passport.liepin.com/account/individual/v1/login.json', headers=headers,
                            params=params)
    print(response.text)

if __name__ == '__main__':
    timestamp = str(int(time.time() * 1000))
    login('用户名', '密码')
```

## 思路

### 分析请求，会发现第一个请求会返回来token和加密的js，用于第二个请求，计算value值，密码采用md5加密，然后构造请求，最后拿到返回结果

## 谢谢大家
