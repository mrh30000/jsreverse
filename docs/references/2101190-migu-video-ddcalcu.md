# 【JS逆向系列】某咕视频ddCalcu参数分析

> **作者**: 漁滒 | **发布时间**: 2026-04-03 16:52:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6191 / 39
> **原文**: [https://www.52pojie.cn/thread-2101190-1-1.html](https://www.52pojie.cn/thread-2101190-1-1.html)

---

*本帖最后由 漁滒 于 2026-4-3 16:56 编辑*

@[TOC](https://www.52pojie.cn/%E3%80%90JS%E9%80%86%E5%90%91%E7%B3%BB%E5%88%97%E3%80%91%E6%9F%90%E5%92%95%E8%A7%86%E9%A2%91ddCalcu%E5%8F%82%E6%95%B0%E5%88%86%E6%9E%90)

### 流程逆向初步分析

目标地址：aHR0cHM6Ly93d3cubWlndXZpZGVvLmNvbS9wL2RldGFpbC83MjIyMDg2MTI=

首先明确目标，就是需要找到m3u8的请求，然后拿到m3u8后下载视频

播放视频后直接全局搜索【m3u8】,可以看到有很多结果，但是有一条链接为【playurl/v3/play/playurl】的请求就非常特别

响应中包含了视频详情，作者详情，也包括了最重要的m3u8地址，那么这个请求就是需要分析的接口

查看一下这个请求的可疑参数和可疑请求头

| 请求参数 | 取值 |
| --- | --- |
| contId | 722208612 |
| rateType | 4 |
| clientId | e5bb39ee-5aab-4dc5-9010-55154f575468 |
| timestamp | 1775181849072 |
| startPlay | true |
| devId | OHAwbW9hcmRtcjVvMXkxcN9PHSWoHxHxyljKygEksQPWmcdJEfcdCNf0XJlHtROik15aJ8GwlkaegkoPRepw4Q |
| ums | 1 |
| signN | d91b088700926ecd3a4b8c5d1ee01c3e |
| xh265 | true |
| chip | mgwww |
| channelId | 0132\_10010001005 |

| 请求头 | 取值 |
| --- | --- |
| appcode | miguvideo\_default\_www |
| appid | miguvideo |
| channel | H5 |
| support-pendant | 1 |
| terminalid | www |
| x-up-client-channel-id | 0132\_10010001005 |

有加密的值可能会存在于clientId、devId、signN、channelId这几个参数

接着全局搜索【playurl/v3/play/playurl】，会有两个结果，都下断点，刷新后断下，在断点下方就有一个请求逻辑

![](https://attach.52pojie.cn/forum/202604/03/164807tt7nn1wnce0cwuc2.jpg)

ht是一个固定的请求头，可以直接在js中搜索到
参数中的clientId是F参数，往前查找

![](https://attach.52pojie.cn/forum/202604/03/164813haz0ddpdplsalhqd.jpg)

里面实际就是一个uuid的生成逻辑，可以理解为clientId是一个随机数

继续往下走就可以看到devId是调用Base64AesCBCEncode函数获取的，signN函数是调用Md5Encode函数获取的

![](https://attach.52pojie.cn/forum/202604/03/164818oi3injzh0qoighjj.jpg)

按照顺序那就先看看Base64AesCBCEncode函数，跟到最后会发现进入到playurl-crypto.wasm，接着就是转为o文件用ida进行分析

![](https://attach.52pojie.cn/forum/202604/03/164823gt5mur5r5778bda4.jpg)

从函数名来看，加密算法就是aes-cbc，加密后用base64编码，那么就是要在wasm中寻找key和iv

第一个参数是 clientId
第二个参数是固定字符串 0e0f0cb703bb0f0c0e0cb0b00a0bbaba

那么很有可能第二个参数就是key，或者至少和key有关

直接找到wasm中的base64AesCBC\_encrypt函数，前面经过格式化入参以后，来到了f45函数

![](https://attach.52pojie.cn/forum/202604/03/164829q4dwk64j6k8e1e88.jpg)

通过动态调试，发现第二三个参数还是一开始的字符串，带一个参数在函数调用后得到了一个新的字符串 829a0f2989cc46dd

很有可能是里面做了一个解密，分析后发现主要逻辑如下

![](https://attach.52pojie.cn/forum/202604/03/164834tohqzkm7stjmy448.jpg)

这里有一个定值1048856，这是内存中一个固定数组的基址，循环在这个数组中取值然后或运算，得到一个新的数组

在尝试拿这个新的key解密devId的时候发现，devId进行base64解码后，前面有一段是可打印的字符串 8p0moardmr5o1y1p 就猜测会不会是iv

最后真的可以得到明文，总结一下加密过程就是

```
def wasm_crypt_key(data):
    table = [3, 5, 7, 0, 15, 10, 13, 1, 11, 14, 4, 6, 9, 12, 8, 2]
    key = bytearray()
    for each in data:
        key.append((table[each >> 4] << 4) | table[each & 0xf])
    return bytes(key)

def base64_aes_cbc_encrypt(message, key):
    iv = get_random_bytes(8).hex().encode()
    key = wasm_crypt_key(key)
    crypto = AES.new(key=key, mode=AES.MODE_CBC, iv=iv)
    return base64.urlsafe_b64encode(iv + crypto.encrypt(Padding.pad(message.encode(), AES.block_size))).decode().replace('=', '')
```

接着是Md5Encode函数，第一个入参是timestamp + cid + client\_id拼接，第二个参数是固定字符串 0cbb070e0c0f07020aba0e0cbb0aba01
最后还是进入到playurl-crypto.wasm

![](https://attach.52pojie.cn/forum/202604/03/164840h7zdz223md2gigfd.jpg)

这部分和前面的分析差不多，也是使用相同的解密固定字符串，然后将解密后的内容再拼接到最后取md5

然后其他的固定参数都可以从js中获取到

![](https://attach.52pojie.cn/forum/202604/03/164845wtvztrrcv44dm08r.jpg)

此时就可以向接口发送请求了

```
def main():
    cid = '722208612'
    client_id = str(uuid.uuid4())
    timestamp = str(int(time.time() * 1000))
    requests = requests_html.HTMLSession()
    data = {
        "contId": cid,
        "rateType": "4",
        "clientId": client_id,
        "timestamp": timestamp,
        "startPlay": "true",
        "devId": base64_aes_cbc_encrypt(client_id, bytes.fromhex('0e0f0cb703bb0f0c0e0cb0b00a0bbaba')),
        "ums": "1",
        "signN": MD5.new((timestamp + cid + client_id).encode() + wasm_crypt_key(bytes.fromhex('0cbb070e0c0f07020aba0e0cbb0aba01'))).hexdigest(),
        "xh265": "true",
        "chip": "mgwww",
        "channelId": "0132_10010001005"
    }
    headers = {
        'Support-Pendant': '1',
        'channel': 'H5',
        'appId': 'miguvideo',
        'terminalId': 'www',
        'X-UP-CLIENT-CHANNEL-ID': '0132_10010001005',
        'appCode': 'miguvideo_default_www'
    }
    response = requests.get('https://webapi.miguvideo.com/gateway/playurl/v3/play/playurl', params=data, headers=headers).json()['body']
    m3u8_url = response['urlInfo']['url'].replace('http://', 'https://')
    print(m3u8_url)
```

可以成功获取到m3u8链接，但是当直接请求m3u8的时候，发现返回的响应码不是200，而是661，同时响应体也没有任何内容

和网站上的url分析对比发现，网站请求的时候添加了ddCalcu、sv、crossdomain三个参数

继续全局搜索ddCalcu，可以发现是前面的CallInterface4函数生成，而仔细看前面还有很多类似的函数CallInterface7、CallInterface14等等

![](https://attach.52pojie.cn/forum/202604/03/164851rr8390rrj3ey8w33.jpg)

从最前面开始看，发现其获取了6个字符串，前5个字符串都比较直接，就是m3u8地址中的查询参数，最后一个是（暂时）固定的 J6XuCcCtPfVdSv6YUls4Jg==

那么往前找p参数的赋值，就找到下面内容

![](https://attach.52pojie.cn/forum/202604/03/164856dni2y5fuzii239h2.jpg)

为什么是这里？因为代码中的调试信息提示已经说明了一切，说明第六个字符串就是一个加密因子

继续进入前面的P函数查看

![](https://attach.52pojie.cn/forum/202604/03/164901r5uf2zhuz3puu34k.jpg)

发现其最后是从一条请求【/gateway/app-management/videox/staticcache/v2/factor/miguvideo/www】中获取的，继续进入到fetch函数

![](https://attach.52pojie.cn/forum/202604/03/164906h6lq7b28ue6bufl8.jpg)

调试发现这个接口返回的内容是加密的，但是在then后面直接就是已经解密后的结果，所以继续进入i.$\_axios.get函数

不断单步调试后会来到request函数

![](https://attach.52pojie.cn/forum/202604/03/164911l22oqquh2n4cz4n9.jpg)

继续进入request函数，因为其相应被加密了，所以需要查看响应的拦截器，也就是this.interceptors.response

![](https://attach.52pojie.cn/forum/202604/03/164917a4ee61e7xd8734md.jpg)

一共有9个，实际上第一个就是需要的解密函数，下断点后继续调试

![](https://attach.52pojie.cn/forum/202604/03/164922uw00bba0tf22t02j.jpg)

会出现两个特殊的函数decode和getKey，分别都在里面下断点，继续调试最后断在decode，里面是调用了gateway-crypto.wasm

![](https://attach.52pojie.cn/forum/202604/03/164927f3fczqcs0iuy3tcx.jpg)

继续使用ida分析，这次参数传入的key是一个空值，也就是说wasm内部可能有硬编码的key

前面部分的格式化入参都是一样的，当没有传入key的时候，会走下面的分支，会读取1049824的值，长度是44

![](https://attach.52pojie.cn/forum/202604/03/164933xc3zcsgaggdws0g7.jpg)

这就可以得到一个定值的key，然后key解密的逻辑和前面一样，得到明文key之后，就可以用aes ecb解密了

```
def gateway_decrypt(message):
    key = wasm_crypt_key(base64.b64decode('vwwLu7e6ug4HAQMAug8CsA8HD7oHDwuxAg4HAQG6DLA='))
    crypto = AES.new(key=key, mode=AES.MODE_ECB)
    return Padding.unpad(crypto.decrypt(base64.b64decode(message.encode())), AES.block_size).decode()

response = requests.get('https://v1-sc.miguvideo.com/app-management/videox/staticcache/v2/factor/miguvideo/www')
factor = json.loads(gateway_decrypt(response.content.decode()))['body']
```

这就能得到包含【"body":{"sv":"10011","factor":"J6XuCcCtPfVdSv6YUls4Jg==","tid":"www"}】的字符串了，这时6个字符串就都已经获取到了

接着就是一大串wasm函数的调用，调用的是mgprtcl.wasm，还是继续用ida分析

前面四个字符串分别是调用CallInterface10，CallInterface9，CallInterface8，CallInterface1都属于同一类的

都是将字符串记录到内存中，如果字符串为空则取默认值

例如CallInterface10

![](https://attach.52pojie.cn/forum/202604/03/164938o9v2fkwtjii0c0x9.jpg)

如果字符串为空，则设置为14个0x74，其他的就不继续列举了

直到CallInterface14，这里就是处理加密因子

函数前面是对base64校验和解码的逻辑，后面从基址9502处获取32长度的字符串

然后再往下看

![](https://attach.52pojie.cn/forum/202604/03/164943k6ezx4p8plrozp64.jpg)

这里只取了4次i32\_load，即只获取了16字节长度做密钥扩展，接着就是密钥逆序

![](https://attach.52pojie.cn/forum/202604/03/164949fk1dbqf8fvl1lhqq.jpg)

那就说明这里的算法是aes，密钥长度是16字节，还是在准备做解密运算，那么就很容易解密出来

```
crypto = AES.new(key=b'1ed7f236e8eedfe1c90ccad475b3ba19'[:16], mode=AES.MODE_CBC, iv=bytes.fromhex('00000000000000000000000000000000'))
seed = Padding.unpad(crypto.decrypt(base64.b64decode(factor['factor'].encode())), AES.block_size).decode()
```

解密得到的结果就是【5,2,2,8,2】

最后就是进入到CallInterface4函数

![](https://attach.52pojie.cn/forum/202604/03/164954w1t9kkz1g9ozhha1.jpg)

首先是做了简单的环境校验

![](https://attach.52pojie.cn/forum/202604/03/165000k52jt5r584eucrxt.jpg)

然后将加密因子通过逗号分隔，并转换为数值类型

![](https://attach.52pojie.cn/forum/202604/03/165005h6dfxauk8sdd3qs3.jpg)

然后是设置了4个常量值[101, 116, 99, 110]，并根据四个字符串来重置值

![](https://attach.52pojie.cn/forum/202604/03/165011vg7e3smbmsosjn4g.jpg)

然后就是ddCalcu参数算法和核心，分别从头尾取值，组成一个新的字符串，算法如其名称，可能是Double Direction Calculation的缩写

![](https://attach.52pojie.cn/forum/202604/03/165016naamh28mraanh1ja.jpg)

而魔改的地方就是会在特定的下标插入全面的4个常量值，并且在最后拼接一段定值【\_s002】

获取到ddCalcu后，拼接到m3u8后面，即可获取到真实的m3u8地址，可以下载视频了

完整代码如下

```
import json
import time
import uuid
import base64
import requests_html
from urllib import parse
from Crypto.Hash import MD5
from Crypto.Cipher import AES
from Crypto.Util import Padding
from Crypto.Random import get_random_bytes

def wasm_crypt_key(data):
    table = [3, 5, 7, 0, 15, 10, 13, 1, 11, 14, 4, 6, 9, 12, 8, 2]
    key = bytearray()
    for each in data:
        key.append((table[each >> 4] << 4) | table[each & 0xf])
    return bytes(key)

def gateway_decrypt(message):
    key = wasm_crypt_key(base64.b64decode('vwwLu7e6ug4HAQMAug8CsA8HD7oHDwuxAg4HAQG6DLA='))
    crypto = AES.new(key=key, mode=AES.MODE_ECB)
    return Padding.unpad(crypto.decrypt(base64.b64decode(message.encode())), AES.block_size).decode()

def base64_aes_cbc_encrypt(message, key):
    iv = get_random_bytes(8).hex().encode()
    key = wasm_crypt_key(key)
    crypto = AES.new(key=key, mode=AES.MODE_CBC, iv=iv)
    return base64.urlsafe_b64encode(iv + crypto.encrypt(Padding.pad(message.encode(), AES.block_size))).decode().replace('=', '')

def sign_url(m3u8_url, requests):
    response = requests.get('https://v1-sc.miguvideo.com/app-management/videox/staticcache/v2/factor/miguvideo/www')
    factor = json.loads(gateway_decrypt(response.content.decode()))['body']
    crypto = AES.new(key=b'1ed7f236e8eedfe1c90ccad475b3ba19'[:16], mode=AES.MODE_CBC, iv=bytes.fromhex('00000000000000000000000000000000'))
    seed = Padding.unpad(crypto.decrypt(base64.b64decode(factor['factor'].encode())), AES.block_size).decode()
    seed = list(map(lambda n: int(n), seed.split(',')))
    insert_table = [101, 116, 99, 110]
    qs = parse.parse_qs(parse.urlparse(m3u8_url).query)
    qs = {k: qs[k][0] for k in qs}
    userid = qs.get('userid') or 'eeeeeeeee'
    timestamp = qs.get('timestamp') or 'tttttttttttttt'
    program_id = qs.get('ProgramID') or 'ccccccccc'
    channel_id = qs.get('Channel_ID') or 'nnnnnnnnnnnnnnnn'
    pu_data = qs.get('puData')
    if 0 < seed[0] < len(userid):
        insert_table[0] = (((ord(userid[seed[0] - 1]) & seed[4]) >> 1) % 26) + 97
    if 0 < seed[1] < len(timestamp):
        insert_table[1] = (((ord(timestamp[seed[1] - 1]) & seed[4]) >> 1) % 26) + 97
    if 0 < seed[2] < len(program_id):
        insert_table[2] = (((ord(program_id[seed[2] - 1]) & seed[4]) >> 1) % 26) + 97
    if 0 < seed[3] < len(channel_id):
        insert_table[3] = (((ord(channel_id[seed[3] - 1]) & seed[4]) >> 1) % 26) + 97
    dd_calcu = ''
    for i in range(len(pu_data) // 2):
        dd_calcu += pu_data[-(i + 1)] + pu_data[i]
        if 1 <= i <= 4:
            dd_calcu += chr(insert_table[i - 1])
    dd_calcu += '_s002'
    return m3u8_url + '&ddCalcu=' + dd_calcu + '&sv=' + factor['sv'] + '&crossdomain=www'

def main():
    cid = '722208612'
    client_id = str(uuid.uuid4())
    timestamp = str(int(time.time() * 1000))
    requests = requests_html.HTMLSession()
    data = {
        "contId": cid,
        "rateType": "4",
        "clientId": client_id,
        "timestamp": timestamp,
        "startPlay": "true",
        "devId": base64_aes_cbc_encrypt(client_id, bytes.fromhex('0e0f0cb703bb0f0c0e0cb0b00a0bbaba')),
        "ums": "1",
        "signN": MD5.new((timestamp + cid + client_id).encode() + wasm_crypt_key(bytes.fromhex('0cbb070e0c0f07020aba0e0cbb0aba01'))).hexdigest(),
        "xh265": "true",
        "chip": "mgwww",
        "channelId": "0132_10010001005"
    }
    headers = {
        'Support-Pendant': '1',
        'channel': 'H5',
        'appId': 'miguvideo',
        'terminalId': 'www',
        'X-UP-CLIENT-CHANNEL-ID': '0132_10010001005',
        'appCode': 'miguvideo_default_www'
    }
    response = requests.get('https://webapi.miguvideo.com/gateway/playurl/v3/play/playurl', params=data, headers=headers).json()['body']
    m3u8_url = response['urlInfo']['url'].replace('http://', 'https://')
    print(m3u8_url)
    print(requests.get(m3u8_url).text)
    m3u8_url = sign_url(m3u8_url, requests)
    print(m3u8_url)
    m3u8_url = requests.get(m3u8_url).text.replace('\n', '')
    print(m3u8_url)
    print(requests.get(m3u8_url).text)

if __name__ == '__main__':
    main()
```
