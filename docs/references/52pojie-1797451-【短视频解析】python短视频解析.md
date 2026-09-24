# 【短视频解析】python短视频解析

> **作者**: Huibq120 | **发布时间**: 2023-06-14 19:24:00 | **版块**: 『编程语言区』 | **查看/回复**: 1852 / 2
> **原文**: [https://www.52pojie.cn/thread-1797451-1-1.html](https://www.52pojie.cn/thread-1797451-1-1.html)

---

![](https://attach.52pojie.cn/forum/202306/14/192227vzn3934445lila6i.png)

> 为避免接口和谐过快，把接口信息做了隐藏，想写调用的自己解密嘿嘿。
> 溜了溜了。

[Asm] *纯文本查看*

```

#短视频解析下载

import json
import time
import hashlib
import requests
from Crypto .Cipher import AES
import base64
from datetime import datetime
z ='IpnyTFq8H8muzVh/5GzPV6LsbSOt2KSCgF0WxM/Mg0Q='
def m (OOOOOOO0OOO00OOOO ):
        OOOO0O00O0O00O000 =hashlib .md5 (OOOOOOO0OOO00OOOO .encode ())
        O0O0000OO0OOO00OO =OOOO0O00O0O00O000 .hexdigest ()
        return O0O0000OO0OOO00OO
s ='APW9nXaURlKYEYKcDHGEXPpNfUy04mei+DLwHjlA0o0='
def d (OOO00O0OO00O00O0O ,OO0OO00OOOOO0OO0O ):
    O000O0O0OO0OOO00O =AES .new (OOO00O0OO00O00O0O .encode ('utf8'),AES .MODE_CBC ,b'0000000000000000')
    OO0OO00OOOOO0OO0O =base64 .b64decode (OO0OO00OOOOO0OO0O .encode ('utf8'))
    OOO0O00O00OO0OO00 =O000O0O0OO0OOO00O .decrypt (OO0OO00OOOOO0OO0O )
    O000O0O000OO0O000 =OOO0O00O00OO0OO00 [-1 ]
    OOO0O00O00OO0OO00 =OOO0O00O00OO0OO00 [:-O000O0O000OO0O000 ]
    return OOO0O00O00OO0OO00 .decode ('utf8')
k ='gentGnetGnetgnet'
t ='EKbM8kz1LQzLP/INVCLKPvUrDY2xBYp0hOJXxRcl9Hs='
sign =d (k ,t )
def Analyse (OO00OOOO00O00OOO0 ):
    OO0OOO00000OOOOO0 ='VfT6fB1gh+PTjjQ8+qxnMqQXpdwvMk5VWQqH9W9MZtfJAQ1IQ17AsrrFoowE6fi2/VjFatENginBmLX0r05IhNYMAwmSwtPE7RzonrBTUVo='
    O00OOO0O000OOOO00 =d (k ,OO0OOO00000OOOOO0 )
    OO0OOO00000OOOOO0 =f'{O00OOO0O000OOOO00}={OO00OOOO00O00OOO0}'
    OO00O0OOO0O0O0O00 ={'Host':'','data':'','timestamp':'','accept':'Application/json','content-type':'Application/json;charset=utf-8','accept-Encoding':'gzip','user-agent':''}
    OO00O0OOO0O0O0O00 ['Host']=d (k ,s )
    OOOOOO000OO0OO00O =str (round (datetime .now ().timestamp ()*1000 ))
    OO00O0OOO0O0O0O00 ['timestamp']=OOOOOO000OO0OO00O
    O0OOO000O0OOOOOOO =OO00OOOO00O00OOO0 +OOOOOO000OO0OO00O +sign
    OO0OOO00OOOOOOO00 =m (O0OOO000O0OOOOOOO )
    OO00O0OOO0O0O0O00 ['data']=OO0OOO00OOOOOOO00
    OO00O0OOO0O0O0O00 ['user-agent']=d (k ,z )
    O000O0OO0OO0O0OO0 =requests .Session ()
    O000O0OO0OO0O0OO0 .headers .clear ()
    O000O0OO0OO0O0OO0 .headers .update (OO00O0OOO0O0O0O00 )
    time .sleep (0.5 )
    O0000O00O0000O0OO =O000O0OO0OO0O0OO0 .get (url =OO0OOO00000OOOOO0 ,timeout =15 ).json ()
    if O0000O00O0000O0OO ['code']==200:
        print ('\n')
        OO0O0O0000O0OOOOO =O0000O00O0000O0OO ['data']['content']['title']
        OOOOOO00O0OOO000O =O0000O00O0000O0OO ['data']['content']['url']
        O00O000O00OO0OO0O =O0000O00O0000O0OO ['data']['content']['cover']
        print (f'视频标题：{OO0O0O0000O0OOOOO}'+'\n'+'\n'+f'解析视频链接：{OOOOOO00O0OOO000O}'+'\n'+'\n'+f'视频封面图片：{O00O000O00OO0OO0O}'+'\n'+'\n')
        return None
    print ('解析出错')
    return None
prompt =input ("请输入要解析的视频链接:")
Analyse (prompt )
while True :
    try :
        print ('输入要解析的视频链接: | [输入886]退出程序 ')
        prompt =str (input ("请输入："))
        if prompt =='886':
            print ("bye!")
            break
        Analyse (prompt )
        continue
    except :
        print ('未知异常，请检查输入是否正确')
```
