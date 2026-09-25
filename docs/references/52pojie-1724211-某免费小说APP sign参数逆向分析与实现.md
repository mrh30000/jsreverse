# 某免费小说APP sign参数逆向分析与实现

> **作者**: S11ence | **发布时间**: 2022-12-08 10:41:00 | **版块**: 『移动安全区』 | **查看/回复**: 11941 / 72
> **原文**: [https://www.52pojie.cn/thread-1724211-1-1.html](https://www.52pojie.cn/thread-1724211-1-1.html)

---

*本帖最后由 S11ence 于 2022-12-8 10:47 编辑*

## Overview

闲来无事，随便下载了个免费小说软件，对其中的登录时的参数进行了分析

## Java层分析

### 抓包定位函数

在登录发送验证码时使用Charles抓包

![](https://attach.52pojie.cn/forum/202212/08/103008l0t858zgd188g295.png)

根据关键词在Java层搜索

![](https://attach.52pojie.cn/forum/202212/08/103010qyj47rgrrkksoi2p.png)

查找用例，定位到函数

![](https://attach.52pojie.cn/forum/202212/08/103005t6mwvax5xevs4s4i.png)

可以看到将一些参数存入`ArrayMap`中传入`j.addSign()`函数中，这里的`addSign`是我自己手动修改的名字

传入的`Key`值对照数据包中的参数也都能够对的上

![](https://attach.52pojie.cn/forum/202212/08/103003wifduusf3efwe74u.png)

### 跟进分析

继续跟进`addSign`函数中

![](https://attach.52pojie.cn/forum/202212/08/102933rtz6l6jmizkjv4k6.png)

又添加了一个时间戳键值对后，经过`getSortedParamStr`后传给`hash`得到`sign`值

![](https://attach.52pojie.cn/forum/202212/08/102940zyc3j03ykzfx3qj0.png)

`getSortedParamStr`将键值对按键进行排序后，转成字符串返回。不同键值对之间用`&`连接，键与值之间用`=`连接

比如，对如下键值对进行转换

```
arraymap = {
    "flag": "1",
    "channelId": "1240202",
    "imei": "____7548",
    "device": "Nexus 5X",
}

channelId=1240202&device=Nxus 5X&flag=1&imei=___7548
```

`Security`的`hash`函数调用了`JNISecurity`的`hash2`函数，参数有`Signature`的`SHA1WithRSA`、`KeyFactory`的`RSA`，字符串转成的字节

![](https://attach.52pojie.cn/forum/202212/08/103001dpuocuool8okcplk.png)

`JNISecurity`里的`hash2`是一个`native`函数，可以看到类里加载了`UiControl`库，大概率就在`libUiControl.so`里

![](https://attach.52pojie.cn/forum/202212/08/102947w1222sbpb4nprpin.png)

## So层分析

### 定位到动态注册函数

解压后在`lib`文件夹里找到`libUiControl.so`

先在`Function`搜索`hash2`，不出所料没有结果，所以这是动态注册的函数

![](https://attach.52pojie.cn/forum/202212/08/102959j369b6vddpe9m566.png)

那么应该分析`JNI_OnLoad`函数

![](https://attach.52pojie.cn/forum/202212/08/102942ipamns300nm2sh4m.png)

由`GetEnv`得知参数`v26`类型为`JNIEnv*`，另外看下面有调用固定常数偏移函数大概率都是`JNIEnv*`参数，重设类型后就能分析出`JNI`函数了

![](https://attach.52pojie.cn/forum/202212/08/102944vtqs446464xf4aoh.png)

往下分析，在`sub_7A5A8`函数中找到了调用了`RegisterNatives`函数，可能是我们要找的`hash`函数

![](https://attach.52pojie.cn/forum/202212/08/103016saea6iol5iuea8i8.png)

![](https://attach.52pojie.cn/forum/202212/08/103034sjk9ljy25fffqj8j.png)

由`RegisterNatives`的定义可知，

第一个参数`clazz`是注册的函数所在的类

第二个参数`methods`是`JNINativeMethod`类型，里面包含了函数名、函数签名以及函数指针

```
jint RegisterNatives(jclass clazz, const JNINativeMethod* methods,jint nMethods)
typedef struct {
    const char* name;
    const char* signature;
    void* fnPtr;
} JNINativeMethod;
```

不过这里的各个参数当前都是空的数据，需要先经过`sub_78F54`解密才能得到原本的数据。第二个参数是我们的结果

![](https://attach.52pojie.cn/forum/202212/08/103028wodaginb3p7gd730.png)

`sub_78F54`函数的逻辑也比较简单，主要运算的部分也就只有中间这一句而已

![](https://attach.52pojie.cn/forum/202212/08/102929kv8va449sez9mh14.png)

`v9`是第一个参数，结合具体值分析可以得到是取三位一组然后转成十进制数，和`v12`异或

`v12`是字符串`"8080"`

后面的`v8 - (v10 & 0xFFFFFFFC)`其实就相当于`v8&3`，只取了最后两位

可以得到一个简单的idapython解密脚本

```
def decrypt(start,size=0):
    if size == 0:
        size = get_item_end(start)-start
    data = get_bytes(start,size)
    key = [56,48]
    out = []
    for i in range(0,len(data),3):
        tmp  = data[i:i+3].decode()
        if tmp.startswith('\x00'):
            return out
        t = int(tmp)
        tmp = t^key[i//3%2]
        out.append(chr(tmp))
        s = ''.join(out)
    return s
addrs = [0x2F5008,0x2F5084,0x2F5130,0x2F513D,0x2F51EC]
for i in range(len(addrs)):
    if i !=len(addrs)-1:
        size = addrs[i+1]-addrs[i]
    else:
        size = 0x10

    s = decrypt(addrs[i])
    print(hex(addrs[i]),''.join(s))
```

输出结果发现果然是我们想要找到的`hash2`函数

![](https://attach.52pojie.cn/forum/202212/08/102937pbeczccb9wb1a1pe.png)

重命名参数后，可以知道`sub_877EC`是`hash`函数的函数指针

`sub_87324`是`hash2`函数的函数指针

![](https://attach.52pojie.cn/forum/202212/08/103036cgf6e0bl8ry4rell.png)

另外有个坑点，一开始分析的是`arm64`的so文件，可以看到反编译的结果不是很好分析，头脑有点迷糊没有对上哪个函数指针对应哪个函数

后面换了32位的so文件才发现反编译效果好的太多了，不仅`methods`数组各个参数排列的很整齐，甚至`hash2`函数名的符号表都还在:cry:

![](https://attach.52pojie.cn/forum/202212/08/103019rfkdfdpwkpifjmm4.png)

让我想到了之前打的一个比赛中，两个不同架构的so文件，`arm`的反编译有问题，反而`x86`反编译的结果非常清晰

### 分析hash2函数

点进来同样发现调用了指针加偏移的函数，估计也是`JNI`函数，不过还是跟进分析一下`sub_78EEC`函数

![](https://attach.52pojie.cn/forum/202212/08/103030gzpb5kbq97picq9u.png)

`sub_78EEC`也是这样的调用函数，惯性的改类型成`JNIEnv*`发现得到的是`FindClass`函数，显然不太对

![](https://attach.52pojie.cn/forum/202212/08/103021qolibb74q746beof.png)

`FindClass`显然得不到`JNIEnv*`类型的变量

![](https://attach.52pojie.cn/forum/202212/08/103023vv05enj0zqww9zzo.png)

交叉引用一下，发现在`JNI_OnLoad`里调用了这个变量，才发现原来是`JavaVM*`类型

![](https://attach.52pojie.cn/forum/202212/08/102957vz4w42l7jzpiflbp.png)

改成`JavaVM*`就得到了`GetEnv`函数

![](https://attach.52pojie.cn/forum/202212/08/103025iwqq7ri7ruiz21c1.png)

将`sub_87324`里的各个env变量修正后，`JNI`函数就都能正常显示了，

将其中的几个字符串写在了旁边的注释中

函数逻辑也比较清晰了

![](https://attach.52pojie.cn/forum/202212/08/103032lkc9dpvca2axggxm.png)

### 还原算法

比较常见的JNI层调用Java算法的过程

1. 先`FindClass`获取类对象
2. 用`NewObjectV`获取类的实例
3. 然后`GetMethodID`获取所要调用的`method`的`ID`
4. 调用`CallObjectMethodV`或`CallVoidMethodV`等函数来调用对应的方法

翻译成Java代码，一个比较常规的签名算法

```
byte[] key = new byte[]{};
byte[] bArr = str.getBytes(StandardCharsets.UTF_8);
PKCS8EncodedKeySpec pkcs8EncodedKeySpec =  new PKCS8EncodedKeySpec(key);

KeyFactory keyFactory = KeyFactory.getInstance("RSA");
PrivateKey privateKey = keyFactory.generatePrivate(pkcs8EncodedKeySpec);
Signature signature = Signature.getInstance("SHA1WithRSA");

signature.initSign(privateKey);
signature.update(bArr);
byte[] result = signature.sign();
retrun result;
```

`type`是`hash2`的第一个参数，传入的是固定的`2`，因此这里使用的私钥是`off_3BFC50+1=unk_2F5477`

![](https://attach.52pojie.cn/forum/202212/08/102953a5amommznk5ovmbb.png)

长度为`0x279`

![](https://attach.52pojie.cn/forum/202212/08/102935oc4a24icnaz2a4ai.png)

`hash2`签名后再`Base64`一下即为`sign`参数值

## 代码验证

使用`python`还原算法后验证，同时实现了发包请求

```
class DeJian:
    def __init__(self, phone):
        self.phone = phone
                self.logger = self.init_log()

    def init_log(self):

        # 创建logger实例
        logger = logging.getLogger('DeJian')
        # 设置日志级别
        logger.setLevel(logging.DEBUG)
        # 流处理器
        ch = logging.StreamHandler()
        ch.setLevel(logging.DEBUG)
        # 日志打印格式
        formatter = logging.Formatter('%(message)s')
        # 添加格式配置
        ch.setFormatter(formatter)
        # 添加日志配置
        logger.addHandler(ch)
        return logger

    def req(self, method, url, **kwargs):
        if kwargs.get("headers"):
            # 如果传递过来的请求有头信息，那么我们就在头信息中做追加
            kwargs["headers"].update = {
                "content-type": "application/x-www-form-urlencoded",
                "Host": "dj.palmestore.com",
                "user-agent": "Dalvik/2.1.0 (Linux; U; Android 8.1.0; Nexus 5X Build/OPM1.171019.011)"
            }
        else:
            # 如果传递过来的请求没有header
            kwargs["headers"] = {
                "content-type": "application/x-www-form-urlencoded",
                "Host": "dj.palmestore.com",
                "user-agent": "Dalvik/2.1.0 (Linux; U; Android 8.1.0; Nexus 5X Build/OPM1.171019.011)"
            }
        for k, v in kwargs["data"].items():
            kwargs["data"][k] = self.url_encode(v)
        kwargs["data"] = self.get_sorted_param_str(kwargs["data"])
        self.logger.debug(f"请求的参数为{method}，url为{url}， 其他参数为{kwargs}")
        r = requests.request(method=method, url=url, **kwargs)
        self.logger.info(f"响应内容为{r.json()}")
        return r.json()

    def url_encode(self, s):
        r = ['+', '/', '=']
        res = s
        for i in r:
            res = res.replace(i, '%' + hex(ord(i))[2:].upper())
        return res

    def sign(self, content):
             private_key = b""
        pri_key = RSA.importKey(private_key)
        signer = PKCS1_v1_5.new(pri_key)
        hash_obj = SHA1.new(content.encode())
        sig1 = signer.sign(hash_obj)
        signature = base64.b64encode(sig1).decode()
        res = self.url_encode(signature)
        return res

    def get_sorted_param_str(self, dic):
        content = ''.join([f'{k}={dic[k]}&' for k in sorted(dic)])[:-1]
        return content

    def sendSms(self):
        url = ''
        dic = {
            "versionId": "20005056",
            "device": "Nexus 5X",
            "flag": "1",
            "imei": "",
            "phone": self.phone,
            "times": "1",
            "sendType": "0",
            "channelId": "1240202",
            "timestamp": "1669439016670",
        }
        dic["sign"] = self.sign(self.get_sorted_param_str(dic))

        r = self.req('post', url, data=dic)
```

可以看到计算得到的`sign`值和抓包得到的`sign`值是一致的

![](https://attach.52pojie.cn/forum/202212/08/103012yboutwyska6yshha.png)

同时返回包也是成功

![](https://attach.52pojie.cn/forum/202212/08/103014qzufb4uacfc1xm2m.png)

手机上也是成功收到了短信

同样地该APP在登陆时的`sign`参数也是类似的逻辑

![](https://attach.52pojie.cn/forum/202212/08/102951e32jpnsj6n66j55l.png)

![](https://attach.52pojie.cn/forum/202212/08/102949fyqzbz3qh2bnhm1c.png)

将之前的代码添加了登录的功能，实现了从获取验证码到登录的过程

![](https://attach.52pojie.cn/forum/202212/08/102955y3em7kq0bw8iv3bv.png)
