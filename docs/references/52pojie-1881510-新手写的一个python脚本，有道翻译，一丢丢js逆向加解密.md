# 新手写的一个python脚本，有道翻译，一丢丢js逆向加解密

> **作者**: fatlong | **发布时间**: 2024-01-17 11:43:00 | **版块**: 『编程语言区』 | **查看/回复**: 3859 / 9
> **原文**: [https://www.52pojie.cn/thread-1881510-1-1.html](https://www.52pojie.cn/thread-1881510-1-1.html)

---

[JavaScript] *纯文本查看*

```
import base64
import json
import time
import hashlib
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import requests

o = str(int(time.time()*1000))
def sign():
    # e = 'asdjnjfenknafdfsdfsd'
    # u = 'fanyideskweb'
    # d = 'webfanyi'
    q = 'client=fanyideskweb&mysticTime='+str(o)+'&product=webfanyi&key=fsdsogkndfokasodnaso'
    a = hashlib.md5(q.encode()).hexdigest()
    return a

def decrypt( decrypt_str,iv,key):
    key_md5 = hashlib.md5((key).encode('utf-8')).digest()
    iv_md5 = hashlib.md5((iv).encode('utf-8')).digest()
    aes = AES.new(key=key_md5, mode=AES.MODE_CBC, iv=iv_md5)
    code = aes.decrypt(base64.urlsafe_b64decode(decrypt_str))
    return unpad(code, AES.block_size).decode('utf8')

def get_data(q):
    headers = {
        'Host':'dict.youdao.com',
        'Origin':'https://fanyi.youdao.com',
        'Referer':'https://fanyi.youdao.com/',
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.61",
        'Cookie':'OUTFOX_SEARCH_USER_ID_NCOO=1918452785.9332309; OUTFOX_SEARCH_USER_ID=714488211@171.221.146.167;'
    }
    url = 'https://dict.youdao.com/webtranslate'
    data = {
        'i': q,
        'from': 'auto',
        'to': '',
        'domain': 0,
        'dictResult': 'true',
        'keyid': 'webfanyi',
        'sign': sign(),
        'client': 'fanyideskweb',
        'product': 'webfanyi',
        'appVersion': '1.0.0',
        'vendor': 'web',
        'pointParam': 'client,mysticTime,product',
        'mysticTime': str(o),
        'keyfrom': 'fanyi.web',
        'mid': 1,
        'screen': 1,
        'model': 1,
        'network': 'wifi',
        'abtest': 0,
        'yduuid': 'abcdefg'
    }
    res = requests.post(url,data=data,headers=headers)
    return res.text

def judge_language(text):
    for char in text:
        # 判断字符的 Unicode 范围
        if '\u4e00' <= char <= '\u9fff':
            return '中文'
        elif '\u0041' <= char <= '\u005a' or '\u0061' <= char <= '\u007a':
            return '英文'
    return '未知'

if __name__ == '__main__':
    print('请输入你需要翻译的字词:')
    q = input('')
    aesIv = "ydsecret://query/iv/C@lZe2YzHtZ2CYgaXKSVfsb7Y4QWHjITPPZ0nQp87fBeJ!Iv6v^6fvi2WN@bYpJ4"
    aesKey = "ydsecret://query/key/B*RGygVywfNBwpmBaZg*WT7SIOUP2T0C9WHMZN39j^DAdaZhAnxvGcCY6VYFwnHl"
    result = decrypt(get_data(q),aesIv,aesKey)
    # dictResult = result['dictResult']
    languge = judge_language(q)
    result = json.loads(result)
    print('翻译后的值为：')
    if languge == '中文':
        tran_value = result['dictResult']['ce']['word']['trs'][0]['#tran']
        print(tran_value)
    else:
        tran_value = result['dictResult']['ec']['word']['trs'][0]['tran']
        print(tran_value)
```
