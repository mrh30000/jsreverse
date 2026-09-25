# 某企业办公APP逆向TCP协议分析

> **作者**: 不甘被强煎的蛋 | **发布时间**: 2019-08-19 08:04:00 | **版块**: 『移动安全区』 | **查看/回复**: 53530 / 121
> **原文**: [https://www.52pojie.cn/thread-1010585-1-1.html](https://www.52pojie.cn/thread-1010585-1-1.html)

---

*本帖最后由 不甘被强煎的蛋 于 2019-8-19 08:21 编辑*

**一、概述**
前些天在看到多益云APP，遂决定分析一下。同样的拖延症，今天终于想起来写一下过程以及心得体会。
在登陆时，该APP首先通过HTTP确认检查登录账号并且获取服务器信息。接着通过TCP协议获取并计算得到后续会话加密KEY，得到KEY之后完成登录认证，通过认证的情况下进行后续获取好友信息以及发送消息等操作。发送数据首先也是进行了一定的格式化，该格式化比较简单，后续进行详细讲解，格式化完毕之后，进行加密操作，加密大概为置换操作。随后在包头添加命令号以及包头等信息，发送。返回数据一样的道理，逆向考虑就ok。
本次使用到的工具：
JEB、GDA、IDA、fiddler、wireshark、eclipse、雷电模拟器、多益云APP。
**二、寻找切入点**
        在我前面的文章（《[原创]某直播APP逆向TCP协议分析》）中提到，在首次拿到app的情况下，我选择**首先查看日志**，因为很多app在编译的时候，还是会残留一些日志信息。对于有混淆的app来讲，尤其是TCP协议，哪怕app完全没有混淆，定位关键函数都比较麻烦。因此需要借助日志中的关键信息来帮忙定位。当然，在日志中的关键信息无法准确定位的情况下，选择 **android monitor**或者**查看堆栈信息**也都是一些切入点。
        在输出日志的情况下，开启fiddler以及wireshark，运行该app，查看日志发现了一些有意思的信息：

[C++] *纯文本查看*

```

Line 2313: D/duoyi_inc( 2213): startRespond cmd: 0x199
Line 2315: I/duoyi_inc( 2213): 0x199 onRespond
Line 2317: I/duoyi_inc( 2213): LoginOp(genLogin) Cipher rsa DECRYPT_MODE begin
Line 2319: I/duoyi_inc( 2213): LoginOp(genLogin) Cipher rsa DECRYPT_MODE end
Line 2321: I/duoyi_inc( 2213): debugTest : LoginOp(genLogin) parse key length: 16
Line 2323: I/duoyi_inc( 2213): LoginOp(genLogin) hexStringToByte begin
Line 2325: I/duoyi_inc( 2213): LoginOp(genLogin) hexStringToByte end
Line 2327: D/duoyi_inc( 2213): sendCmd0x200
Line 2329: I/duoyi_inc( 2213): CCProtocolHandler,startHandle 0 , 60
Line 2331: D/duoyi_inc( 2213): protocolInfo : CCProtocolHandler(handle), pos 0 , 0 fill:60 en index 0
Line 2333: D/duoyi_inc( 2213): CCProtocolHandler,handleCmd cmd= 200 , 60
Line 2335: I/duoyi_inc( 2213): protocolInfo : ReadBuffer(clear),net: false
Line 2337: D/duoyi_inc( 2213): startRespond cmd: 0x200
Line 2339: I/duoyi_inc( 2213): loginInfo : 0x200, respond, info=time=1565762801, uid=0, digitID=, result =0 _notice=帐号错误,请重新输入
Line 2341: D/duoyi_inc( 2213): protocolInfo : CCNodeServer(disconnect) : start clear data
Line 2343: I/duoyi_inc( 2213): protocol_info : BaseLoopThread(run) :onThreadLoopFinish
```

LoginOp，即为登录操作。搜索相关信息，定位在了此处：

[Java] *纯文本查看*

```

        try {
            aa.d("LoginOp(genLogin) Cipher rsa DECRYPT_MODE begin");
            Cipher v5 = Cipher.getInstance("RSA");
            v5.init(2, ((Key)v1_1));
            v10 = v5.doFinal(new Decoder.a().a(v0_4));
            aa.d("LoginOp(genLogin) Cipher rsa DECRYPT_MODE end");
            v6 = 0;
            v5_1 = 0;
            v0_12 = 0;
            v1_2 = ((byte[])v4);
            goto label_93;
        }
```

emmm这儿我插一句，JEB在处理多次循环嵌套的情况下，goto这种标签跳转特别多，很影响分析，GDA在这方面处理的比JEB要好，但是GDA处理分包情况不如JEB。因此我选择 JEB 结合 GDA 进行分析。
上面只是列出了一小段代码，纵观这段代码所处的函数，可以确信登录就是在这一块儿完成的：

[Java] *纯文本查看*

```

         this.g.r_();
         aa.d("new start login");
         aa.d("keyPairGenerator generateKeyPair creat begin");
         v0_1 = KeyPairGenerator.getInstance("RSA");
         v0_1.initialize(512);
         v1 = v0_1.generateKeyPair();
         aa.d("keyPairGenerator generateKeyPair creat end");
         v0_2 = v1.getPublic();
         v1_1 = v1.getPrivate();
         dp.Auto_setValue(0);
         if (dp.a(this.a.f(), new StringBuilder().append(v0_2.getModulus()).append(",").append(v0_2.getPublicExponent()).toString())) {
             aa.c("YGD LoginOP, genLogin, 0x199 is time out");
             this.a.k().c = -10;
             this.a.k().d = "";
             this.f.d();
             v2 = false;
         }else {
             aa.d("LoginOp(genLogin) Cipher rsa DECRYPT_MODE begin");
             v5 = Cipher.getInstance("RSA");
             v5.init(2, v1_1);
             v1.Null_<init>();
             v10 = v5.doFinal(v1.a(this.a.k().t));
             aa.d("LoginOp(genLogin) Cipher rsa DECRYPT_MODE end");
             v6 = 0;
             v5 = 0;
             v0 = 0;
             v1 = v4;
             while ((v6 < v10.length())) {
                 if (v0) {
                     v1[v5]=v10[v6];
                     v5++;
                 }
                 if ((!v10[v6])&&(!v0)) {
                     v1_2 = new byte[((v10.length()-v6)-1)];
                     aa.d("debugTest", new StringBuilder().append("LoginOp(genLogin) parse key length: ").append(v1_2.length()).toString());
                     v0 = v2;
                 }
                 v6++;
             }
             if (!v1) {
                 aa.a("debugTest", "LoginOp(genLogin) :key is null error ");
                 v2 = false;
             }else {
                 aa.d("LoginOp(genLogin) hexStringToByte begin");
                 v0_3 = j.a(v1);
                 aa.d("LoginOp(genLogin) hexStringToByte end");
                 this.a.k().t = "";
                 m.a().a(v0_3);
                 d.a().a(v0_3);
                 ba.Auto_setValue(0);
                 if (ba.a(this.d)) {
                     this.a.k().c = -10;
                     this.a.k().d = "";
                     this.f.d();
                     v2 = false;
......
```

接下来就是耐心的进行分析各个参数的含义以及具体的流程了。与此同时，我在观察目录结构的时候发现一个类：com.duoyiCC2.jni.CCJNI，包括了加密以及解密在内的5个native方法，猜想这儿就是加密解密的关键地方，于是根据前面的代码找到日志函数，把没有输出的日志函数hook一遍，加密解密等jni函数hook一遍，进一步加快了我对该app的分析进度。后续的分析基本流程和上述一样，通过日志定位关键函数，分析关键行为，此处不再赘述。
**三、通讯密钥获取及生成0x119**
**发送组包/解包类**：com.duoyiCC2.protocol.dp
前面的抓包中，在wireshark中发现第一条**发送**数据包为：

[Asm] *纯文本查看*

```

00b0019900000000000000000000a131323534393531393534383237393638323936313236323539343730333237393934313238333336393734323737343236333839383635363731363432353031323931313434313936393130313431343134393739363437343432393637313736313038343431323535373139363938393038313736333130323537363733303438303637373936383337383639373931353633353230343636372c3635353337
```

解析如下：

[C++] *纯文本查看*

```

00 b0 //length
01 99 //cmd
00 00 00 00 //固定
00 00 00 00 //固定
00 //固定
00 a1 //length
31323534393531393534383237393638323936313236323539343730333237393934313238333336393734323737343236333839383635363731363432353031323931313434313936393130313431343134393739363437343432393637313736313038343431323535373139363938393038313736333130323537363733303438303637373936383337383639373931353633353230343636372c3635353337 //str:12549519548279682961262594703279941283369742774263898656716425012911441969101414149796474429671761084412557196989081763102576730480677968378697915635204667,65537,65537
```

研究java代码，可知本地生成RSA公钥与私钥，随后将公钥与公钥指数发送给服务器，相关代码如下：

[Java] *纯文本查看*

```
        try {
            aa.d("keyPairGenerator generateKeyPair creat begin");
            KeyPairGenerator v0_2 = KeyPairGenerator.getInstance("RSA");
            v0_2.initialize(0x200);
            KeyPair v1 = v0_2.generateKeyPair();
            aa.d("keyPairGenerator generateKeyPair creat end");
            PublicKey v0_3 = v1.getPublic();
            v1_1 = v1.getPrivate();
            v0_4 = ((RSAPublicKey)v0_3).getModulus() + "," + ((RSAPublicKey)v0_3).getPublicExponent();
        }
```

**服务器返回**：

[Asm] *纯文本查看*

```
006c019900000000000000000000584469544c6357534e79786e48655a72433868686c67496557616e4d6a446c422b2b4b6a4c2b727230417a4b656f5036756855497a655470314a674f6e686e683851354773706b47755663334c65366f3454366b4957773d3d5d5956d600
```

解析：

[C++] *纯文本查看*

```
00 6c
01 99
00 00 00 00
00 00 00 00
00
00 58
4469544c6357534e79786e48655a72433868686c67496557616e4d6a446c422b2b4b6a4c2b727230417a4b656f5036756855497a655470314a674f6e686e683851354773706b47755663334c65366f3454366b4957773d3d //str:DiTLcWSNyxnHeZrC8hhlgIeWanMjDlB++KjL+rr0AzKeoP6uhUIzeTp1JgOnhnh8Q5GspkGuVc3Le6o4T6kIWw==
5d5956d6 //timestamp
00
```

将str进行BASE64解码，使用前面得到的RSA私钥进行加密，取密文后八位，即得到了后续加密所使用的关键参数，调用native层SetKeyN，将该结果传入到native层，具体实现代码如下：

[Java] *纯文本查看*

```
       try {
            aa.d("LoginOp(genLogin) Cipher rsa DECRYPT_MODE begin");
            Cipher v5 = Cipher.getInstance("RSA");
            v5.init(2, ((Key)v1_1));
            v10 = v5.doFinal(new Decoder.a().a(v0_4));
            aa.d("LoginOp(genLogin) Cipher rsa DECRYPT_MODE end");
            v6 = 0;
            v5_1 = 0;
            v0_12 = 0;
            v1_2 = ((byte[])v4);
            goto label_93;
        }
```

来看SetKeyN究竟做了什么事情？
打开IDA，载入libccjni.so，查看SetKeyN函数：

[C++] *纯文本查看*

```
int __fastcall Java_com_duoyiCC2_jni_CCJNI_SetKeyN(JNIEnv *a1, jobject a2, int a3, char *a4)
{
  result = ((*a1)->GetArrayLength)();
  if ( result == 8 )
  {
    v8 = ((*v6)->GetByteArrayElements)(v6, v5, 0);
    CEncryptor::SetKey((&en + 12 * v4), v8);
    result = ((*v6)->ReleaseByteArrayElements)(v6, v5, v8, 0);
  }
  return result;
}
```

进入SetKey函数：

[C++] *纯文本查看*

```
int __fastcall CEncryptor::SetKey(CEncryptor *this, char *key)
{
  memcpy(this + 4, key, 8u);
  index = 0;
  v4 = 0;
  do
  {
    v5 = this + index;
    result = index << 8;
    LOBYTE(v4) = CEncryptor::s_keybox[256 * index + (v4 ^ *(this + index + 4))];
    ++index;
    *(v5 + 4) = v4;
  }
  while ( index != 8 );
  return result;
}
```

emmm我不太习惯看这个伪代码，直接看指令比较容易懂，当然其实这个伪代码也好懂,我去除了不重要的代码，重命名了部分变量，应该还是简单易懂的。本质上就是使用s盒中的数据进行代换。
至此，密钥获取以及生成完成。
**四、0x200数据包**
**发送组包/解包类：**com.duoyiCC2.protocol.ba
199命令数据包完毕接着为0x200数据包，该数据包上传了用户帐号以及生成的设备ID，返回了用户uid以及一个时间戳，猜想可能与快速登录有关。具体分析如下：
**发送明文**：

[C++] *纯文本查看*

```
00 43
02 00 //cmd
00 00 00 00
00 00 00 00
00
03 1e //固定，不知道什么情况，标识符？反正代码中写死的
00 07 //length
38 37 33 37 30 38 34 //用户帐号
00 00
00 20 //length
65 34 36 30 39 30 36 38 34 39 34 62 36 31 65 30 33 35 38 30 34 37 33 32 31 32 30 63 33 65 65 33 //设备ID：e4609068494b61e035804732120c3ee3
00 00 00 00
00 03
00
```

随后该数据调用加密算法，随后给出加密解密算法。首先来分析设备ID如何生成：

[C++] *纯文本查看*

```
设备ID为一串设备信息的MD5：
设备ID=MD5("865166023795217pd8633666688247ee4ec0a6604c85b300:81:f2:9e:68:ecnull")
865166023795217为imei
pd8633666688247算法：
"pd" + Build.BOARD.length() % 10 + Build.BRAND.length() % 10 + Build.DEVICE.length() % 10 + Build.HOST.length() % 10 + Build.ID.length() % 10 + Build.MANUFACTURER.length() % 10 + Build.MODEL.length() % 10 + Build.PRODUCT.length() % 10 + Build.TAGS.length() % 10 + Build.TYPE.length() % 10 + Build.USER.length() % 10;
ee4ec0a6604c85b3为android_id
00:81:f2:9e:68:ec为网卡地址
```

**返回解密得到明文**：

[C++] *纯文本查看*

```
00 37
02 00
00 00 00 00 00 00 00 00 00
00 10 35 63 30 64 30 36 30 33 37 33 30 65 32 35 35 62 //未知字符串，客户端直接舍弃该字符串
5d 57 9a a6 //时间戳
01 35 56 2b //用户uid
00 07 38 37 33 37 30 38 34 //用户帐号
00 00 00 00 00 00 00
```

接下来就是登陆数据包，其实从这一个数据包大家可以看出该APP的组包方式，对于字符串，长度+内容，对于整数型或者其他类型数据，emmm写的很懒散没有一定的规章，所以单独对每个数据包进行了onSend和OnResponse处理。也就是说，每个数据包都得自己手动解包，很是麻烦。emm感觉是一个四不像，既不是纯粹的直接json格式或者xml之类格式的字符串直接转byte[]发送，也不是纯粹的谷歌或者别的变形的protobuf，也不是别的一些数据格式，杂凑起来的。。这样开发工作量很大，而且对于安全来说，也并没有提高安全性。
**五、登录0x201数据包**
**发送组包/解包类：** com.duoyiCC2.protocol.da
**发送明文：**

[C++] *纯文本查看*

```
00 ab
02 01
01 35 56 2b //uid
00 00 00 00
00
00 20 34 66 33 66 39 64 35 35 32 30 32 33 36 30 32 36 64 37 61 32 62 36 37 30 66 66 33 35 37 64 62 65 //MD5(password)
01 03
00 06 32 2e 34 2e 32 37 //版本号2.4.27
00 70
00 34 68 61 72 64 77 61 72 65 3a 20 78 69 61 6f 6d 69 20 36 3b 6f 73 3a 20 61 6e 64 72 6f 69 64 20 35 2e 31 2e 31 3b 63 6f 6d 70 75 74 65 72 3a 78 69 61 6f 6d 69 //设备信息hardware: xiaomi 6;os: android 5.1.1;computer:xiaomi
00
00 30 7b 22 63 6c 69 65 6e 74 5f 69 64 22 3a 22 65 34 36 30 39 30 36 38 34 39 34 62 36 31 65 30 33 35 38 30 34 37 33 32 31 32 30 63 33 65 65 33 22 7d //{"client_id":"e4609068494b61e035804732120c3ee3"}
00 02 7b 7d //{}
00 00 00
```

**返回解密明文：**

[C++] *纯文本查看*

```
00 62
02 01
00 00 00 00
00 00 00 00
00
00 00 //result，是否登录成功
00
00 36 ......
```

不同的result对应情况如下：

[C++] *纯文本查看*

```
       switch(result) {
            case 0: {
                arg8.d();
                arg8.k();
                arg8.k();
                int v2 = arg8.d();
                aa.c("personalAccount", "NsLogin(onRespond): " + v2);
                this.m_service.k().y = v2;
                this.mProtocolHandler.setCurState(1);
                break;
            }
            case 8450: {
                this.m_service.k().c = -13;
                arg8.k();
                v2_1 = arg8.j();
                aa.g("测试", "NsLogin(onRespond): 2102->" + v2_1 + "(" + arg8.j() + ")");
                this.m_service.k().p = v2_1;
                break;
            }
            case 8454: {
                this.m_service.k().d = arg8.k();
                this.m_service.k().c = -12;
                break;
            }
            case 8456: {
                arg8.k();
                arg8.j();
                arg8.j();
                v2_1 = arg8.j();
                aa.d("mirror_zh", "NsLogin:onRespond:137:cellPhone=" + v2_1);
                this.m_service.k().j = v2_1;
                this.m_service.k().c = -24;
                break;
            }
            case 8457: {
                this.m_service.k().d = arg8.k();
                this.m_service.k().c = v4;
                break;
            }
            default: {
                this.m_service.k().d = arg8.k();
                this.m_service.k().c = v4;
                break;
            }
        }
```

至此，登录流程分析完毕，随后的其他操作均类似于上述情况，不再进行赘述
**六、加密与解密**
数据包的加密与解密操作类似，因此只分析一种情况，以加密为例：

[C++] *纯文本查看*

```
int __fastcall Java_com_duoyiCC2_jni_CCJNI_EncryptRangeN(JNIEnv *env, jobject thiz, jint object, jint position, jint length, jbyteArray *data)
{
  obj = object;
  pos = position;
  v8 = env;
  if ( data + length > ((*env)->GetArrayLength)() )
    return _android_log_print(6, "duoyi_cc", "Encrypt range fail");
  v9 = ((*v8)->GetByteArrayElements)(v8, pos, 0);
  CEncryptor::EncryptRange(&en + 12 * obj, v9, length, data);
  return ((*v8)->ReleaseByteArrayElements)(v8, pos, v9, 0);
}
```

查看EncryptRange

[C++] *纯文本查看*

```
int __fastcall CEncryptor::EncryptRange(int result, char *ele, jint length, char *data)
{
  v4 = &data[length];
  if ( length < v4 )
  {
    v5 = &ele[length];
    v6 = *result;
    v7 = 0;
    do
    {
      v7[v5] = CEncryptor::s_encryptbox[256 * v6 + (v7[v5] ^ *(result + v6 + 4))];
      ++v7;
      v6 = (*result + 1) & 7;
      *result = v6;
    }
    while ( v7 != &v4[-length] );
  }
  return result;
}
```

不如直接看关键指令吧，加上注释结合伪代码，应该还是很容易懂的：

[Asm] *纯文本查看*

```
loc_156A
ADDS    R2, R0, R5
LDRB    R2, [R2,#4]     ; 加载一个密钥
LSLS    R5, R5, #8
MOV     R12, R2
LDRB    R2, [R1,R4]     ; 加载一个明文字符
MOV     R3, R12
EORS    R2, R3          ; 密钥与明文字符异或得到R2
ADDS    R5, R5, R2      ; R2与R5相加得到偏移R5
LDRB    R2, [R5,R7]     ; 在密钥表中找到偏移为R5的字符R2
STRB    R2, [R1,R4]     ; R2放入结果中
LDR     R5, [R0]
ADDS    R4, #1
ADDS    R5, #1
ANDS    R5, R6
STR     R5, [R0]
CMP     R4, R8
BNE     loc_156A
```

解密也是一样的道理。

至此，这个app最核心的部分已经分析完毕。
回顾一下流程，从日志入手找到关键代码，结合网络抓包数据，对照代码进行分析每个字节的含义，以代码推断数据包不同字节的含义，以数据包来推断代码中部分属性/变量的含义，抽丝剥茧，整个app在我们眼里便成了透明的。hook的作用也不容忽视，有时候经常遇到断层，无法找到调用函数，这个时候可以反向分析，已经知道加密解密函数的情况下，反向寻找调用函数，也会取得意想不到的效果。

欢迎大家私信交流，也欢迎大家批评指正！
