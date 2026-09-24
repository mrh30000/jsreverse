# CC视频cmf分析

> **作者**: ling02123 | **发布时间**: 2023-02-21 10:54:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6563 / 12
> **原文**: [https://www.52pojie.cn/thread-1748730-1-1.html](https://www.52pojie.cn/thread-1748730-1-1.html)

---

* **demo    aHR0cHM6Ly9zdHVkeS55YXh1ZXhpYW8uY29tL3Rlc3QvZGVtby5odG0=**

* **具体改版细节：**

* **.m3u8后缀名改为 .cmf**
* ****key\_url 增加后缀参数 fpi****
* ****.cmf 文件解密后 ts 链接后缀改为 cts 后缀****

* ****浏览器抓包分析cmf****

F12 过滤发现 cmf 文件 返回数据为字节流 ，设置个 XHR 断点跟踪其回调函数

![](https://attach.52pojie.cn/forum/202302/21/104349urviw0w7xztnvhfx.png)

然后跟踪到 decryptCmf 函数 仔细观察这个函数

![](https://attach.52pojie.cn/forum/202302/21/104542rte26eskbdak6vs4.png)

其实就是一个简单的 AES-CBC解密方法 ，只不过用了浏览器自带的解密原生解密函数参考文档 : SubtleCrypto - Web API 接口参考 | MDN (mozilla.org) 既然知道了是 CBC 解密，直接找 key iv 套库即可。第一步：**取出 32位 Vid 取前面 16 位 作为  AES-iv**第二步：**固定 AES-key 为 "@!#^$$YHG&^<)&=["**第三步：**AES解密操作***具体代码如下：*

[Python] *纯文本查看*

```
def decrypt_cmf(url):
    iv = url.split('.cmf')[0].split('/')[-1][:16]
    key = "@!#^$$YHG&^<)&=["
    cryptor = AES.new(key=key.encode(), mode=AES.MODE_CBC, iv=iv.encode())
    res = requests.get(url).content
    return unpad(cryptor.decrypt(res)).decode()
```

即可正常解密

* **key\_url 参数分析**

![](https://attach.52pojie.cn/forum/202302/21/104907mckm2wchoiiinmic.png)

跟栈可以定位到 参数生成这里第一步：    **声明一个时间戳字符串校验时间  '****"t":1676945454,"a":1' , 然后把这个 20 位字符串转化成数组**第二步里有几个函数：    **f.enc :  对第一步生成的数组操作；**    **v.encodeInt8Array ： base64 url\_encode  就是换了码表的base64****v.binToStr: 字节到文本**这里就 f.enc 繁琐一点，具体代码如下：

[Python] *纯文本查看*

```
def enc(l: str):[/size][/font][/color]    l = ord(l)
    if l < 0:
        l = 128 | (l & 127)
    return s_box[l]
s_box = 'Y3x3e/Jrb8UwAWcr/terdsqCyX36WUfwrdSir5ykcsC3/ZMmNj/3zDSl5fFx2DEVBMcjwxiWBZoHEoDi6yeydQmDLBobblqgUjvWsynjL4RT0QDtIPyxW2rLvjlKTFjP0O+q+0NNM4VF+QJ/UDyfqFGjQI+SnTj1vLbaIRD/89LNDBPsX5dEF8Snfj1kXRlzYIFP3CIqkIhG7rgU3l4L2+AyOgpJBiRcwtOsYpGV5HnnyDdtjdVOqWxW9Opleq4IunglLhymtMbo3XQfS72LinA+tWZIA/YOYTVXuYbBHZ7h+JgRadmOlJseh+nOVSjfjKGJDb/mQmhBmS0PsFS7Fg=='
s_box = list(base64.b64decode(s_box))
enc_data = [enc(i) for i in txt]  #
```

然后在key\_url后面直接添加这段校验值 就可以直接解密

key解密代码如下:

[Python] *纯文本查看*

```
def decrypt_Bokecc_key(enc_key=None, bokecc_vid=None):
    if isinstance(enc_key, bytes):
        enc_key = list(enc_key)

    v0 = 'Uglq1TA2pTi/QKOegfPX+3zjOYKbL/+HNI5DRMTe6ctUe5QypsIjPe5MlQtC+sNOCC6hZijZJLJ2W6JJbYvRJXL49mSGaJgW1KRczF1ltpJscEhQ/e252l4VRlenjZ2EkNirAIy80wr35FgFuLNFBtAsHo/KPw8Cwa+9AwETims6kRFBT2fc6pfyz87wtOZzlqx0IuetNYXi+TfoHHXfbkfxGnEdKcWJb7diDqoYvhv8Vj5LxtJ5IJrbwP54zVr0H92oM4gHxzGxEhBZJ4DsX2BRf6kZtUoNLeV6n5PJnO+g4DtNrir1sMjruzyDU5lhFysEfrp31ibhaRRjVSEMfQ=='
    v1 = 'Y1UhDH1SCWrVMDalOL9Ao56B89f7fOM5gpsv/4c0jkNExN7py1R7lDKmwiM97kyVC0L6w04ILqFmKNkksnZboklti9Elcvj2ZIZomBbUpFzMXWW2kmxwSFD97bnaXhVGV6eNnYSQ2KsAjLzTCvfkWAW4s0UG0Cwej8o/DwLBr70DAROKazqREUFPZ9zql/LPzvC05nOWrHQi5601heL5N+gcdd9uR/EacR0pxYlvt2IOqhi+G/xWPkvG0nkgmtvA/njNWvQf3agziAfHMbESEFkngOxfYFF/qRm1Sg0t5Xqfk8mc76DgO02uKvWwyOu7PINTmWEXKwR+unfWJuFpFA=='
    v2 = 'c5asdCLnrTWF4vk36Bx1325H8RpxHSnFiW+3Yg6qGL4b/FY+S8bSeSCa28D+eM1a9B/dqDOIB8cxsRIQWSeA7F9gUX+pGbVKDS3lep+TyZzvoOA7Ta4q9bDI67s8g1OZYRcrBH66d9Ym4WkUY1UhDH1SCWrVMDalOL9Ao56B89f7fOM5gpsv/4c0jkNExN7py1R7lDKmwiM97kyVC0L6w04ILqFmKNkksnZboklti9Elcvj2ZIZomBbUpFzMXWW2kmxwSFD97bnaXhVGV6eNnYSQ2KsAjLzTCvfkWAW4s0UG0Cwej8o/DwLBr70DAROKazqREUFPZ9zql/LPzvC05g=='
    v0 = list(base64.b64decode(v0))
    v1 = list(base64.b64decode(v1))
    v2 = list(base64.b64decode(v2))

    dd = [v0, v1, v2]
    ver = enc_key[0]

    l = [ord(i) for i in bokecc_vid]
    t = enc_key[1:]
    m = [None for i in range(20)]
    for y in range(20):
        T = t[y]
        T = T ^ (l[y % 32])
        if T < 0:
            T = 128 | (T & 127)
        m[y] = dd[ver][T]

    key = base64.b64encode(bytearray(m[:16])).decode('utf-8')

    return key
```

* **cts 分析**

 实测发现 cts 跟 ts 并无差异，仅仅是修改后缀名，链接返回字节并无差异，解密可正常播放。

![](https://attach.52pojie.cn/forum/202302/21/105214omrbb1r7ebphzw0h.png)

![](https://attach.52pojie.cn/forum/202302/21/105231b4sz442kzkczd84a.png)

* **总结**

   现在 cmf 仅仅套了一层壳子 ，感觉后续会更新 cts 的解密方法 ， 就目前而言，碰到.cmf链接 可以直接魔改,cmf链接为.m3u8链接 ，即替换cmf为m3u8即可拿到正常的m3u8文件，不需要繁琐的解密。再补充key\_url后缀参数即可正常拿到解密的key，一般解密的key数组第一位为解密版本，目前只有0 ，1，2（具体见上面解密函数），如果不加后参数解密版本往往会溢出 。
