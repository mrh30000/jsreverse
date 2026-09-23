# 某繁体的水果视频APP免VIP无限次观看+m3u8密文解密+小分析

> **作者**: 闷骚小贱男 | **发布时间**: 2021-05-07 17:08:00 | **版块**: 『移动安全区』 | **查看/回复**: 14457 / 160
> **原文**: [https://www.52pojie.cn/thread-1435118-1-1.html](https://www.52pojie.cn/thread-1435118-1-1.html)

---

## 前排提示！！！！！

多锻炼，多吃蛋白多读书，拒绝晃肚肚。
论坛禁止留联系方式！！
禁止求成品，也没有成品！
禁止求名字，也不会发。。

---

## 从某60极速浏览器拦截开始说起

前几天还有童鞋说要看分析贴,这不就来了...竟然有小老弟为了3天的免费看视频在传播这个..舅舅可忍叔叔不能忍
没走他的下线下载了这个APP 查看了一番
在打开网页的时候竟然提示我

![](https://attach.52pojie.cn/forum/202105/07/143325xrkkdba9wwwbr9pd.png)

提示就提示呗竟然还不给继续打开的连接？直接F12 输入forceOpenUrl() 回车 继续访问。。

## 更简单的方法

这类型的邀请APP，均可使用模拟器/vmos/多开/平行空间等一键换机，新用户填写邀请码的方式获的VIP天数
但是我还是喜欢复杂点的。。

---

## 关于log日志的插入(插眼)

未加固的APP，一般都能修改smail代码，所以想要看某个String变量的话，可以插入一段log
【PS：因为有一些参数以小弟的技术不太能拿得到，所以我经出会用到插入log，然后用aker看日志】

```
    public static String b(String str, String str2) {
        Log.w("解f.l.a.d.c.b1的参数", str);
        Log.w("解f.l.a.d.c.b1的参数", str2);
        ......此处省略部分
    }
```

以上java代码，smail其实是这样的

```
.method public static b(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    .registers 8
    const-string v0, "解f.l.a.d.c.b1的参数"
    invoke-static {v0, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I
    invoke-static {v0, p1}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I
.end method
```

p0和p1分别是两个String类型的变量，插入后即可查看日志得到他的值

![](https://attach.52pojie.cn/forum/202105/07/162308hlmgmm1ljzj4jsbz.png)

---

## 用到的工具

### 1.fiddler

以下简称为fd,Https抓包神器,具体的配置方法和连接方法请百度或论坛内搜索

### 2.jadx

（也可选择NP管理器或MT会员的可以不用这个）
最近看好多帖子都用这个jadx,所以下载了试了试,的确好使!github下载比较慢,论坛或百度均有各个版本的下载

### 3.Android Killer

用来查看APP的输出日志,当然也可以直接用他反编译

### 4.MT管理器

（可以用NP管理器代替MT和jadx，但是NP在模拟器上运行实在是慢。。。）
用来修改smali代码和查看内存卡中的文件

### 5.易安卓(e4a)

小弟不才,没学过JAVA,只能用用e4a的接口函数来调用某APP中的函数了.

---

## 查壳/抓包/反编译/插入log

### 1.查看是否加固

用MT查看APP的安装包是否加固,发现没有加固

![](https://attach.52pojie.cn/forum/202105/07/144348nkxtmv33o5302ztm.png)

### 2.用fd查看传送数据是否加密

![](https://attach.52pojie.cn/forum/202105/07/144548lap6o4gpon69nnnz.png)

### 3.先分析post的参数

#### 用jadx打开app(未反混淆)

因为post请求的参数都有sign，所以我们搜索"sign"

![](https://attach.52pojie.cn/forum/202105/07/145600i2jgi0pihto4coc6.png)

最后逐个寻找，找到f.c.a.i.c.a函数

```
    public static String a(String str) throws JSONException {
        long currentTimeMillis = System.currentTimeMillis();
        String b2 = f.l.a.d.c.b("ljhlksslgkjfhlksuo8472rju6p2od03", str);
        String a2 = a(b2, currentTimeMillis);//a函数是下面的return p.a(f.l.a.d.c.a("data=" + str + "×tamp=" + j2 + "kihfks3kjdhfksjh3kdjfs745dkslfh4"));
        JSONObject jSONObject = new JSONObject();
        jSONObject.put("timestamp", currentTimeMillis);
        jSONObject.put("data", b2);//b2是data密文
        jSONObject.put("sign", a2);//a2是sign
        return jSONObject.toString();
    }

    public static String a(String str, long j2) {
        return p.a(f.l.a.d.c.a("data=" + str + "×tamp=" + j2 + "kihfks3kjdhfksjh3kdjfs745dkslfh4"));
    }
```

由上图可得b2是由f.l.a.d.c.b进行了一系列的操作得出的，我们去看看f.l.a.d.c.b

#### data参数的解析,f.l.a.d.c.b函数

右键跳到声明

```
    public static byte[] a(byte[] bArr, byte[] bArr2) {
        byte[] bArr3 = new byte[(bArr.length + bArr2.length)];
        System.arraycopy(bArr, 0, bArr3, 0, bArr.length);
        System.arraycopy(bArr2, 0, bArr3, bArr.length, bArr2.length);
        return bArr3;
    }

    public static String b(String str, String str2) {
        try {
            Cipher instance = Cipher.getInstance("AES/CFB/NoPadding");
            byte[][] a2 = a(32, 16, null, str.getBytes("UTF-8"), 0);//a是对byte[]进行一系列的操作，代码比较长，这里就不贴了。。
            instance.init(1, new SecretKeySpec(a2[0], LitePalSupport.AES), new IvParameterSpec(a2[1]));
            return b(a(instance.getIV(), instance.doFinal(str2.getBytes("UTF-8"))));//b是把byte[]  toHexString拼接字符串为最后的密文
        } catch (Exception e2) {
            e2.printStackTrace();
            return null;
        }
    }
```

data=f.l.a.d.c.b("ljhlksslgkjfhlksuo8472rju6p2od03",明文)

#### sign参数的解析

由之前的代码

```
    public static String a(String str, long j2) {
        return p.a(f.l.a.d.c.a("data=" + str + "×tamp=" + j2 + "kihfks3kjdhfksjh3kdjfs745dkslfh4"));
    }
```

可得sign = p.a(f.l.a.d.c.a("data=" + b2 + "×tamp=" + 时间戳 + "kihfks3kjdhfksjh3kdjfs745dkslfh4"));

##### f.l.a.d.c.a

```
    public static String a(String str) {
        try {
            MessageDigest instance = MessageDigest.getInstance(AESCrypt.HASH_ALGORITHM);//这个AESCrypt.HASH_ALGORITHM 是 "SHA-256"
            instance.update(str.getBytes("UTF-8"));
            return a(instance.digest());
        } catch (NoSuchAlgorithmException e2) {
            e2.printStackTrace();
        } catch (UnsupportedEncodingException e3) {
            e3.printStackTrace();
        }
        return "";
    }
```

可得f.l.a.d.c.a就是把str参数进行了SHA-256运算

##### p.a

p.a代码如下,看起来应该是md5运算

```
    public static char[] f12470a = {'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'};
    public static String a(String str) {
        try {
            byte[] bytes = str.getBytes();
            MessageDigest instance = MessageDigest.getInstance("MD5");
            instance.update(bytes);
            byte[] digest = instance.digest();
            int length = digest.length;
            char[] cArr = new char[(length * 2)];
            int i2 = 0;
            for (byte b2 : digest) {
                int i3 = i2 + 1;
                cArr[i2] = f12470a[(b2 >>> 4) & 15];
                i2 = i3 + 1;
                cArr[i3] = f12470a[b2 & 15];
            }
            return new String(cArr);
        } catch (Exception e2) {
            e2.printStackTrace();
            return null;
        }
    }
```

##### sign参数的总结

由上综合可得出sign的由来：
sign = md5(sha-256(data=#data#×tamp=#timestamp#kihfks3kjdhfksjh3kdjfs745dkslfh4))

#### 参数小结

| post参数 | 值 |
| --- | --- |
| timestamp | 时间戳 |
| data | f.l.a.d.c.b("ljhlksslgkjfhlksuo8472rju6p2od03",明文) |
| sign | md5(sha-256(data=#data#×tamp=#timestamp#kihfks3kjdhfksjh3kdjfs745dkslfh4)) |

```
抓包时得到的一个例子，尝试一下
timestamp = "1620367028994"
data = "74BE4E705C1A059BEC92B06E6A47D2E6C5DB7B6112B254142564FC1FD701338646530C8F8FD43B74BC07691862CA83C82C67A4B302B9EC0584FA9F74A49F062D9EAC03E3A05DE890D07BE7D4B61E4060C453452D7E50CF3288EBCEB91F495B78FE7E3DEC5F9BAC5362E2A8F66E339284544B521F36E60264F0376A42A769BC3EAAC770D19E7DCB8546BB2036AFEA63848FDC23A8A32E0BD2F755465604A47CABBFD3A10004"
sign = md5(SHA-256("data=74BE4E705C1A059BEC92B06E6A47D2E6C5DB7B6112B254142564FC1FD701338646530C8F8FD43B74BC07691862CA83C82C67A4B302B9EC0584FA9F74A49F062D9EAC03E3A05DE890D07BE7D4B61E4060C453452D7E50CF3288EBCEB91F495B78FE7E3DEC5F9BAC5362E2A8F66E339284544B521F36E60264F0376A42A769BC3EAAC770D19E7DCB8546BB2036AFEA63848FDC23A8A32E0BD2F755465604A47CABBFD3A10004×tamp=1620367028994kihfks3kjdhfksjh3kdjfs745dkslfh4"));
sign = md5("70d28657325c6cbac99b211f6384e9766cbf2663c69b945c85f81f708d941752") = 187fd97a091ddbd840d6f3f8db7d7e20
```

拿到data和sign的构造之后，我们尝试解密下post返回内容中的data密文
sign/data和抓包的一模一样，说明算法是正确的

![](https://attach.52pojie.cn/forum/202105/07/154806hrzii2iww53po5ni.png)

### 4.用e4a实现水果APP的加解密算法

加解密算法\_成品，密码:c5cy下载:<https://wwa.lanzouj.com/i0bW6ow5qcj>
加解密算法\_e4a源码，密码:5nzw下载:<https://wwa.lanzouj.com/if8CRow74zc>

### 5.解密部分api接口

#### api/users/getBaseInfo 获取基本信息

post参数:token oauth\_id oauth\_type等
返回信息:用户名 邀请数 coin token isvv zbToken zbUid 还有zbInfo-直播信息等

#### api/home/getConfig 获取配置

新版本检测-活动等信息

#### api/mv/find\_feature        返回几部视频

视频name/id/m3u8地址/时长等信息
data密文解密后发现部分代码为乱码，可能是小弟技术不精导致

![](https://attach.52pojie.cn/forum/202105/07/161225eyrrrhyr85l3ud8l.png)

#### /api/mv/long 完整视频

| 密文post参数 | 值 | 说明 |
| --- | --- | --- |
| timestamp | 时间戳 | 空 |
| data | 明文进行一系列操作后得到的密文,下面有讲到 |
| sign | data和固定字符串进行一系列操作后得到的密文 | 空 |

data解密后{"id":"25927","token":"XXXX","oauth\_id":"XXXX","oauth\_type":"android","version":"2.1.0","new\_player":"fx"}        //ID是视频的id

#### api.php/api/mv/watching 简短视频

#### api/users/invitation  输入邀请码之后绑定

| 明文post参数 | 值 | 说明 |
| --- | --- | --- |
| token | 登录返回的token | 空 |
| oauth\_id | /cache/device/.info文件的值 | 每次打开app会根据这个值注册账号(可删除或修改达到新用户) |
| oauth\_type | android | 空 |

{"token":"41af78482d3a34f13f74a5a99cdcf589","oauth\_id":"290267e15543b00a2c05139a94c47502","oauth\_type":"android","aff":"aaaaa","version":"2.1.0","new\_player":"fx"}

### m3u8视频的解密

这里就用到了log日志的插入，没办法。技术不够，时间来凑。
从fd中可看出m3u8是类似之前的data的hex编码
而m3u8文件通常是由#EXTM3U开局.
所以我们可以搜索#EXTM3U

![](https://attach.52pojie.cn/forum/202105/07/162829w6p01sxcnh4c3nhp.png)

点进去看下代码

```
                            if (!stringWriter.toString().startsWith("#EXTM3U")) {        //搜索到的
                                String a3 = c.a(AppConfig.getInstance().getConfig().getPlayer_cfg().getDekey(), stringWriter.toString());
                                this.E = new ByteArrayInputStream(a3.getBytes());
                                this.H = (long) a3.getBytes().length;
                            } else {
                                this.E = byteArrayInputStream2;
                            }
```

咦,这个c.a 我们跳转一下,正好是f.l.a.d.c.a果然和data的加密是一样的,但是貌似不是固定的kihfks3kjdhfksjh3kdjfs745dkslfh4,而是AppConfig.getInstance().getConfig().getPlayer\_cfg().getDekey()
插个眼看一下.

![](https://attach.52pojie.cn/forum/202105/07/163218ypdz1p2n6sz1w1gg.png)

```
.method public getDekey()Ljava/lang/String;
    .registers 2
    const-string v0, "解getDekey-getDekey-getDekey"
    invoke-static {v0, v0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I
    .line 1
    iget-object v0, p0, Lcom/blmvl/blvl/bean/PlayerConfig;->dekey:Ljava/lang/String;
    invoke-static {v0, v0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I
    return-object v0
.end method
```

这个眼还行,看清楚了getDekey

![](https://attach.52pojie.cn/forum/202105/07/163448u50056uwxil0xzux.png)

我们用刚刚做好的成品app解密下密文，如下图：

![](https://attach.52pojie.cn/forum/202105/07/163719y3t7s3y3ttmyesyz.png)

得到m3u8明文。至此m3u8解密完成
【PS：多试了几次，key好像是固定的。。】

---

## 插眼拿到m3u8明文

刚才拿到getDekey的时候,突然想起来,可以试试插眼拿明文

```
  String a3 = c.a(AppConfig.getInstance().getConfig().getPlayer_cfg().getDekey(), stringWriter.toString());
  Log.e("解m3u8", a3 );
```

![](https://attach.52pojie.cn/forum/202105/07/165826ihdqv6jbeo9byvdv.png)

---

## 本地数据的修改

不知道你们注意到了没有，isvv好像是vip相关的。

```
  boolean isVV = jsonBean.isVV();
  AppUser.getInstance().getUser().setIs_vip(isVV ? 1 : 0);
```

搜相关代码可发现com.XXXX.XXXX.bean.UserBean中，可以修改本地显示的各种数据。。包括VIP

![](https://attach.52pojie.cn/forum/202105/07/170841zbfojffo6soo3bof.png)
