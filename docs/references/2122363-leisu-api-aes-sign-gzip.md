# 【JS逆向实战】手撕雷速体育API：动态AES签名与魔改Gzip响应解密全解析

> **作者**: Chois | **发布时间**: 当前离线 | **版块**: 『脱壳破解区』 | **查看/回复**: 2659 / 33
> **原文**: [https://www.52pojie.cn/thread-2122363-1-1.html](https://www.52pojie.cn/thread-2122363-1-1.html)

---

>
>

**导读**：在爬虫工程师的日常工作中，经常会遇到一些加密手段颇为“讲究”的网站。今天，我们就以雷速体育的移动端 H5 页面为例，深入剖析其接口的加密逻辑。本文将带你完整走通从抓包分析到 Python 脚本实现的全过程，涉及 **动态密钥生成、AES-ECB 加密、自定义 Header 签名、以及魔改 Gzip 响应解密** 等硬核技术。

>

### 一、抓包与接口分析

目标地址：

```
https://m.leisu.com/data/zuqiu/team-10766
```

（以某球队比赛数据为例）。

打开浏览器开发者工具（F12），切换到 Network 面板，刷新页面。我们可以捕获到获取比赛数据的真实 API 接口：

```

```
<https://api-gateway.leisu.com/v1/web/match/database/football/team_info?team_id=10766&acw_sc__v2=1234cf0d46-ef895b588ed7ca477c625aee90e6c8948842d8602c5a2f030a>

```

```

观察其请求头，可以发现一个极其特殊的

```
accept
```

字段：

```

```

accept: application/json, text/plain, */*;;{加密后的签名Sign}

```

```

通常

```
accept
```

是标准的 MIME 类型，但雷速在这里硬生生塞入了一个签名串。这说明，**如果不破解这个签名，请求将被直接拒绝**。

![image](https://attach.52pojie.cn/forum/202608/11/105052b9wfhhq9it11vwhs.png)

同时，观察其返回的数据，并不是明文 JSON，而是类似这样的乱码结构：

![image](https://attach.52pojie.cn/forum/202608/11/105050ga3y0d94b1pd4tap.png)

```

```

{
"code": 111,
"data": "CnBgnO... (一长串Base64类似的字符)"
}

```

```

这表明响应数据也被加密了。

### 二、逆向分析：破解请求签名

#### 1. 寻找加密入口

在 Sources 面板中搜索关键字

```
;;
```

或者全局搜索

```
accept
```

，很容易定位到发送请求的核心代码块。

![image](https://attach.52pojie.cn/forum/202608/11/105048yzffsvmxejmibs4v.png)

![image](https://attach.52pojie.cn/forum/202608/11/105045j606a21wlz2fp1pa.png)

这里不做详细的断点截图，直接写结论。

通过断点调试，我们可以发现签名生成的核心逻辑如下：

- 生成时间戳

```
ts
```

和随机

```
uuid
```

。

- 拼接特定的盐值进行 MD5 加密，生成

```
auth_data
```

。

- 将包含

```
auth_data
```

的对象

```
acp
```

进行 AES 加密，得到最终 Sign。

#### 2. 动态密钥的生成逻辑

在 JS 中，AES 加密需要一个 Key。雷速并没有把 Key 写死，而是通过两个数组异或（XOR）动态生成：

```

```

// JS 原始逻辑简化版
var A = [91, 0, 37, 74, 111, 20, 57, 94, 3, 40, 77, 114, 23, 60, 97, 6];
var g = [48, 119, 101, 34, 69, 44, 94, 29, 74, 70, 105, 74, 79, 31, 5, 96];
// 密钥生成：对应位置异或后转字符
function getKey() {
return g.map((val, idx) => String.fromCharCode(val ^ A[idx])).join('');
}

```

```

**Python 还原：**

```

```

A = [91, 0, 37, 74, 111, 20, 57, 94, 3, 40, 77, 114, 23, 60, 97, 6]
g = [48, 119, 101, 34, 69, 44, 94, 29, 74, 70, 105, 74, 79, 31, 5, 96]

def get_key():
return "".join(chr(t ^ a) for t, a in zip(g, A))

```

```

#### 3. AES 加密生成 Sign

拿到密钥后，对

```
acp
```

对象进行 AES-ECB 加密，并进行 Base64 编码，最后去掉

```
=
```

填充符。

**Python 还原：**

```

```

import json
import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

def generate_sign(acp_dict, key_str):
key_bytes = key_str.encode('utf-8')

# 注意 separators 的作用是去除 json.dumps 默认的空格，保持与JS一致

plain_str = json.dumps(acp_dict, separators=(',', ':'), ensure_ascii=False)
plain_bytes = plain_str.encode('utf-8')

cipher = AES.new(key_bytes, AES.MODE_ECB)
encrypted_bytes = cipher.encrypt(pad(plain_bytes, AES.block_size, style='pkcs7'))

# URL safe base64 编码并去掉 = 号

b64_encoded = base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')
return b64_encoded.rstrip('=')

```

```

### 三、逆向分析：破解响应密文

当我们带着正确的 Sign 发起请求后，会得到

```
{"code": 111, "data": "密文"}
```

。

继续分析 JS 代码，发现响应解密分为三步：

- **凯撒密码移位**：对密文进行字母位移（偏移量通常在 1-25 之间）。

- **Base64 解码**。

- **Gzip 解压**：判断是否包含 Gzip 头部（

```
\x1f\x8b
```

），如果是则解压为明文 JSON。

**Python 还原：**

```

```

import gzip
import base64

def d(t, e=9):
"""凯撒密码移位"""
result = []
for i in map(ord, t):
if 65 <= i <= 90:  # 大写字母
i = (i - 65 - e + 26) % 26 + 65
elif 97 <= i <= 122:  # 小写字母
i = (i - 97 - e + 26) % 26 + 97
result.append(chr(i))
return "".join(result)

def S(t):
"""Gzip 解压"""
raw_bytes = base64.b64decode(t)
decompressed_bytes = gzip.decompress(raw_bytes)
return decompressed_bytes.decode('utf-8', errors='ignore')

```

```

由于我们不知道具体的偏移量

```
e
```

是多少，可以通过暴力循环 1-25，只要 Base64 解码后前两位是 Gzip 的魔术头

```
\x1f\x8b
```

，就说明找到了正确的偏移量。

### 四、最后代码运行截图

![image](https://attach.52pojie.cn/forum/202608/11/105247b9ldoiblyejb1gzu.png)

完整代码

```

```

import gzip
import hashlib
import time
import json
import base64
from http.client import responses
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import requests, uuid

def C(t, key_str):
"""
对应 JS 的 C(t) 函数
:param t: 要加密的字典或对象
:param key_str: JS 中 y() 函数返回的密钥字符串
:return: 特殊 Base64 编码的字符串
"""

# 1. 准备密钥和明文 (对应 u.a.enc.Utf8.parse)

key_bytes = key_str.encode('utf-8')
plain_str = json.dumps(t, separators=(',', ':'), ensure_ascii=False)
plain_bytes = plain_str.encode('utf-8')
cipher = AES.new(key_bytes, AES.MODE_ECB)
encrypted_bytes = cipher.encrypt(pad(plain_bytes, AES.block_size, style='pkcs7'))
b64_encoded = base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')
result = b64_encoded.rstrip('=')
return result

# 1. 定义生成密钥的数组和方法

A = [91, 0, 37, 74, 111, 20, 57, 94, 3, 40, 77, 114, 23, 60, 97, 6]
g = [48, 119, 101, 34, 69, 44, 94, 29, 74, 70, 105, 74, 79, 31, 5, 96]

def get_key():
return "".join(chr(t ^ a) for t, a in zip(g, A))

def generate_sign(acp_dict, key_str):
key_bytes = key_str.encode('utf-8')
plain_str = json.dumps(acp_dict, separators=(',', ':'), ensure_ascii=False)
plain_bytes = plain_str.encode('utf-8')
cipher = AES.new(key_bytes, AES.MODE_ECB)
encrypted_bytes = cipher.encrypt(pad(plain_bytes, AES.block_size, style='pkcs7'))
b64_encoded = base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')
return b64_encoded.rstrip('=')

def d(t, e=9):
result = []
for i in map(ord, t):
if 65 <= i <= 90:
i = (i - 65 - e + 26) % 26 + 65
elif 97 <= i <= 122:
i = (i - 97 - e + 26) % 26 + 97
result.append(chr(i))
return "".join(result)

def S(t):
raw_bytes = base64.b64decode(t)
decompressed_bytes = gzip.decompress(raw_bytes)
return decompressed_bytes.decode('utf-8', errors='ignore')

cookie = '_c_WBKFRo=bsl3Nj6wErks83CIcJjDifi5MZW2U8I7mmVcf2xt; cna=7439a436ec0f4fda8dd97d9f30178de7; Hm_lvt_63b82ac6d9948bad5e14b1398610939a=1784771444; acw_tc=0a0572bd17858336450991884e1a8335ef2bd1cf49e97c0535feea1799f71f; acw_sc__v2=1234cf0d46-99215f715d7cf8c5572a59d9969e3a2a0757dd446c500f3f06; ssxmod_itna=1-GuitPfx_xhOKi7f4AQ0=DO3FMDqQq0dGMADeq7tDRDFqAPQDH8_aKWqaSiK88DjxD=x57rrAxgD05wiDnqD8UDQeDv4g_YD7RZu_9Pd7_2bhw=3AagGh3rLI1ipfawKuS9X2dvzYQhDB3DbqDy8BNQB4GGf4GwDGoD34DiDDpfD03Db4D_nWrD7ORQMluokm4DQ4GyDitDKw_TxG3D08bP/g56IeGEDA3DG3bDmRb6DDN6FFdQW7fGDYpogW0FEBaDALxtaihox0tWDBdeKvHDGwCucbWtg9MAaf2aHPGuDG=Ocm0Hw2bbgoPP=VY5Qemi0PQmee0mK7w4ee6Dee3r6emq0KeWGiCDeBQN7hCm0rRPDneoVqH304qxZUv/IeVl5bRhC30CRoH8iK9P4/rrBBrn2DBhNe_HYTY97xebK/BYciYlu1Bo70AFRGP7RbdO52RrB_FeD; ssxmod_itna2=1-GuitPfx_xhOKi7f4AQ0=DO3FMDqQq0dGMADeq7tDRDFqAPQDH8_aKWqaSiK88DjxD=x57rrAxhDnWYD0e3vpIPC47pKYf_oLUEDBT2cjkLfYAPANavdSDz/e/dqSc5adD'
session = requests.Session()
response = session.get('<https://m.leisu.com/data/zuqiu/team-10766>', headers={
"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
"user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
"Cookie": cookie,
})
url = "<https://api-gateway.leisu.com/v1/web/match/database/football/team_matches?season_ids=[13959,13916,13874]&team_id=10766&acw_sc__v2=1234cf0d46-99215f715d7cf8c5572a59d9969e3a2a0757dd446c500f3f06>"
api = '/v1/web/match/database/football/team_matches'
ts = int(time.time())
uuid = str(uuid.uuid4()).replace("-", "")
md5_text = f'{api}-{ts}-{uuid}-0-uHhANonwd4UdpzOdsUqUsnl5PjurM877'
acp = {
"auth_data": f"{ts}-{uuid}-0-{hashlib.md5(md5_text.encode('utf-8')).hexdigest()}",
"source": "m_leisu"
}
secret_key = get_key()
sign = generate_sign(acp, secret_key)

headers = {
"accept": f"application/json, text/plain, */*;;{sign}",
"referer": "<https://m.leisu.com/data/zuqiu/team-10766>",
"user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
'cookie': cookie
}
try:
resp = session.get(url, headers=headers).json()
print(resp)
if resp['code'] == 111:
for e in range(1, 26):
try:
txt = d(resp['data'], e)
raw = base64.b64decode(txt)
if raw[:2] == b'\x1f\x8b':
print(f"正确的移位密钥是: {e}")
cc = json.loads(S(txt))
print(json.dumps(cc, ensure_ascii=False, indent=4))
break
except Exception as err:
print('雷速数据解密失败: ', err)
continue
else:
for e in range(1, 26):
try:
txt = d(resp['data'], e)
raw = base64.b64decode(txt)
if raw[:2] == b'\x1f\x8b':
print(f"正确的移位密钥是: {e}")
cc = json.loads(S(txt))
print(cc)
break
except Exception as err:
print('雷速数据解密失败: ', err)
except Exception as e:
print("雷速数据获取失败: ", e)

```

```

### 五、总结与避坑指南

在逆向雷速体育的过程中，有几个关键点需要注意：

- **

```
acw_sc__v2
```

的坑**：这是阿里云 WAF 的反爬标识，如果你的请求直接返回 403 或状态码异常，大概率是 Cookie 中的

```
acw_sc__v2
```

过期了。虽然可以通过执行 JS 拿到，但最简单的方式是先请求一次 HTML 页面让 Session 自动带上。

- **

```
json.dumps
```

的空格问题**：在 Python 中

```
json.dumps
```

默认会在逗号后加空格，而 JS 的

```
JSON.stringify
```

不带空格。还原 AES 明文时必须加上

```
separators=(',', ':')
```

，否则加密结果大相径庭。

- **Base64 的变体**：网站使用的是 URL-safe 的 Base64，并且去掉了

```
=
```

补位符，Python 中对应使用

```
urlsafe_b64encode
```

并执行

```
rstrip('=')
```

。

>
>

**免责声明**：本文仅供技术学习与交流，请勿用于商业用途或恶意爬取。大家在实战中也应遵循网站的

```
robots.txt
```

协议，文明爬虫。

>
