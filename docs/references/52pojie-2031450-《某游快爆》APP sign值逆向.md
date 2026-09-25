# 《某游快爆》APP sign值逆向

> **作者**: sky9464 | **发布时间**: 2025-05-14 19:54:00 | **版块**: 『移动安全区』 | **查看/回复**: 4350 / 23
> **原文**: [https://www.52pojie.cn/thread-2031450-1-1.html](https://www.52pojie.cn/thread-2031450-1-1.html)

---

### 目录

* [目录](https://www.52pojie.cn/thread-2031450-1-1.html#目录)
* [前言](https://www.52pojie.cn/thread-2031450-1-1.html#前言)
* [一、抓包](https://www.52pojie.cn/thread-2031450-1-1.html#一抓包)
* [二、jadx反编译apk](https://www.52pojie.cn/thread-2031450-1-1.html#二jadx反编译apk)
* [三、idapro反编译libtokenso](https://www.52pojie.cn/thread-2031450-1-1.html#三idapro反编译libtokenso)
* [四、还原token生成算法](https://www.52pojie.cn/thread-2031450-1-1.html#四还原token生成算法)
* [五、结语](https://www.52pojie.cn/thread-2031450-1-1.html#五结语)

### 前言

本篇文章主要是为了介绍《某游快爆》APP sign 值的逆向分析过程，官方网站：aHR0cHM6Ly93d3cuMzgzOS5jb20vYXBwLmh0bWw=
最近刚入门Android逆向，看到自己日常使用的这个APP中有游戏时长统计功能（有正常的APP时长统计和本软件内部小游戏的时长统计），就想逆向一下练练手，废话不多说，直接开始~~~

![](https://attach.52pojie.cn/forum/202505/14/194528gm5w8crmcawam8hw.png)

### 一、抓包

那么好，想必大家已经能够猜测到了，这个时长统计功能肯定是通过调用系统底层API获取最近使用时长来实现的，那么作为小白的我第一步是看看有没有这个相关的文档。
通过搜索相关文档，我们发现，APP需要一个权限：PACKAGE\_USAGE\_STATS（包\_使用\_状态）~~(神人翻译，忽略)~~

![](https://attach.52pojie.cn/forum/202505/14/194530vll0fqfhvss5w3mq.png)

那么好，这个API用jio一猜就知道肯定是和包名挂钩的（参考：<https://blog.csdn.net/weixin_45951701/article/details/117486242>），所以上传到服务器端的时候肯定也是按照包名上传的，我们在抓包的时候只需要在众多包里面搜索我们一个游戏的包名即可。

我选择王者荣耀进行搜索吧，包名是：com.tencent.tmgp.sgame，然后直接一搜，果然！

![](https://attach.52pojie.cn/forum/202505/14/194532m4wfvm4njfwkdorf.png)

好了，已经知道这个API接口了，可以轻易发现，这里面有好多参数，其中长得最像签名sign值的就是这个t了：

![](https://attach.52pojie.cn/forum/202505/14/194534c219kjje6wfugii2.png)

当当当当~~~主角登场！！那么好——jadx，启动！

### 二、jadx反编译apk

刚才看到一个参数c是applaunch，好多包的这个字段不一样，参数名而且都差不多，所以我们可以直接搜索这个字符串：

![](https://attach.52pojie.cn/forum/202505/14/194536qmwv440661ki6qqe.png)

漂亮，gogogo~~~出发咯~~~（）

![](https://attach.52pojie.cn/forum/202505/14/194538mcbkjkpbz0hdpalp.png)

以上是我稍微给一些方法名重命名了一下，基本上都对上了，但是没看见t参数是哪儿来的，最后一个return倒是个可去之处（这里的generateParams也是我重命名好的，我发现这里确实是会生成基本的参数）
点开看看：

![](https://attach.52pojie.cn/forum/202505/14/194540awixwfwix5i360xk.png)

可以发现，这个t参数是Token.getToken()生成的。
这里重点来了，这个方法是将前面所有的参数的key和value分成了两个数组之中，然后传给这个方法，第一个上下文参数暂时不用管它。

![](https://attach.52pojie.cn/forum/202505/14/194542tmtxxmieqp3m7pxq.png)

emmmm，好的，是native方法，废话不说，找到libtoken.so，IDA启动！

### 三、IDAPro反编译libtoken.so

打开之后，直接搜索java，都对上了都对上了~

![](https://attach.52pojie.cn/forum/202505/14/194545olknz906nl5u5n1d.png)

可以看到参数也是对上了，那么好，直接F5启动看伪C代码(写了点儿注释)：

![](https://attach.52pojie.cn/forum/202505/14/194547chvg0tbr7r2h44rv.png)

```
jstring __fastcall Java_com_xmcy_hykb_data_Token_getToken(
        JNIEnv *env,
        jclass jobj,
        jobject contextObject,
        _jarray *jKeyArray,
        _jarray *jValueArray)
{
  __int64 v5; // x9
  __int64 v7; // [xsp+0h] [xbp-1B0h] BYREF
  void *v8; // [xsp+8h] [xbp-1A8h]
  jstring v9; // [xsp+10h] [xbp-1A0h]
  const unsigned __int8 *v10; // [xsp+18h] [xbp-198h]
  jclass v11; // [xsp+20h] [xbp-190h]
  jmethodID v12; // [xsp+28h] [xbp-188h]
  _JNIEnv *v13; // [xsp+30h] [xbp-180h]
  _JNIEnv *v14; // [xsp+38h] [xbp-178h]
  std::string *v15; // [xsp+40h] [xbp-170h]
  std::string *v16; // [xsp+48h] [xbp-168h]
  _BYTE *v17; // [xsp+50h] [xbp-160h]
  _BYTE *v18; // [xsp+58h] [xbp-158h]
  _QWORD *v19; // [xsp+60h] [xbp-150h]
  unsigned __int8 *v20; // [xsp+68h] [xbp-148h]
  int *v21; // [xsp+70h] [xbp-140h]
  unsigned __int8 *v22; // [xsp+78h] [xbp-138h]
  int *v23; // [xsp+80h] [xbp-130h]
  void *v24; // [xsp+88h] [xbp-128h]
  __int64 v25; // [xsp+90h] [xbp-120h]
  __int64 v26; // [xsp+A0h] [xbp-110h]
  jobject v27; // [xsp+A8h] [xbp-108h]
  _jmethodID *StaticMethodID; // [xsp+B0h] [xbp-100h]
  jclass Class; // [xsp+B8h] [xbp-F8h]
  __int64 v30; // [xsp+C0h] [xbp-F0h]
  int j; // [xsp+CCh] [xbp-E4h]
  _QWORD *v32; // [xsp+D0h] [xbp-E0h]
  const unsigned __int8 *v33; // [xsp+D8h] [xbp-D8h]
  jstring v34; // [xsp+E0h] [xbp-D0h]
  const unsigned __int8 *StringUTFChars; // [xsp+E8h] [xbp-C8h]
  jstring ObjectArrayElement; // [xsp+F0h] [xbp-C0h]
  const unsigned __int8 **v37; // [xsp+F8h] [xbp-B8h]
  jsize i; // [xsp+104h] [xbp-ACh]
  __int64 *v39; // [xsp+108h] [xbp-A8h]
  jsize v40; // [xsp+114h] [xbp-9Ch]
  jsize v41; // [xsp+118h] [xbp-98h]
  jsize ArrayLength; // [xsp+11Ch] [xbp-94h]
  jarray v43; // [xsp+120h] [xbp-90h]
  jarray array; // [xsp+128h] [xbp-88h]
  jobject contextObjecta; // [xsp+130h] [xbp-80h]
  jclass jobja; // [xsp+138h] [xbp-78h]
  JNIEnv *enva; // [xsp+140h] [xbp-70h]
  jobject v48; // [xsp+148h] [xbp-68h]
  std::allocator<char> v49; // [xsp+150h] [xbp-60h] BYREF
  std::string v50; // [xsp+158h] [xbp-58h] BYREF
  _BYTE v51[7]; // [xsp+160h] [xbp-50h] BYREF
  _BYTE v52[33]; // [xsp+167h] [xbp-49h] BYREF
  _DWORD v53[4]; // [xsp+188h] [xbp-28h] BYREF

  enva = env;
  jobja = jobj;
  contextObjecta = contextObject;
  array = jKeyArray;
  v43 = jValueArray;
  checkSign(env, jobj, contextObject); // 根据名字来看应该就是检查apk签名的，看看有没有被篡改，我们没改，不用管。
  ArrayLength = _JNIEnv::GetArrayLength(enva, array); // jKeyArray的长度，也就是其余参数的key组成的数组的长度（人话：其余参数的个数）
  v41 = _JNIEnv::GetArrayLength(enva, v43); // jValueArray的长度，和上面一样的
  if ( ArrayLength != v41 ) // 就是验证key和value数组的长度是不是一样，因为一会儿要进行排序
    return _JNIEnv::NewStringUTF(enva, (const unsigned __int8 *)"");
  v40 = ArrayLength + 1;  // key数组的长度+1
  v39 = &v7;
  i = 0;
  v25 = (__int64)&v7 - ((8LL * (unsigned int)(ArrayLength + 1) + 15) & 0xFFFFFFFF0LL);
  while ( i < ArrayLength ) // 当i（初始值为0）小于 数组长度+1  时，一直循环
  {
    v24 = operator new(0x20uLL);
    memset(v24, 0, 0x20uLL);
    v37 = (const unsigned __int8 **)v24;
    ObjectArrayElement = (jstring)_JNIEnv::GetObjectArrayElement(enva, (jobjectArray)array, i);  // 读取数组中的元素
    if ( ObjectArrayElement )
    {
      StringUTFChars = _JNIEnv::GetStringUTFChars(enva, ObjectArrayElement, 0LL); // 将Java字符串转换为C字符串（UTF-8格式）
      v37[2] = (const unsigned __int8 *)ObjectArrayElement; // 结构体第3个字段（v37[2]）保存原始jstring引用（用于后续释放）
      *v37 = StringUTFChars; // 结构体第1个字段（v37[0]）保存C字符串指针
    }
    else
    {
      *v37 = (const unsigned __int8 *)""; // 如果键为空，存储空字符串占位
    }
    v34 = (jstring)_JNIEnv::GetObjectArrayElement(enva, (jobjectArray)v43, i); // 从Java的jValueArray中获取第i个元素（值）
    if ( v34 )
    {
      v33 = _JNIEnv::GetStringUTFChars(enva, v34, 0LL);// 将Java字符串转换为C字符串（UTF-8格式）
      v37[3] = (const unsigned __int8 *)v34; // 结构体第4个字段（v37[3]）保存原始jstring引用
      v37[1] = v33; // 结构体第2个字段（v37[1]）保存C字符串指针
    }
    else
    {
      v37[1] = (const unsigned __int8 *)"";// 如果值为空，存储空字符串占位
    }
    // 将当前结构体指针（v37）存入动态分配的指针数组v25中
    // v25是栈上对齐分配的内存块，8LL * i计算第i个元素的偏移（64位指针大小）
    *(_QWORD *)(v25 + 8LL * i++) = v37;
  }
  v53[0] = 2;
  v53[1] = 9;
  v53[2] = 5;
  v53[3] = 6;
  v23 = v53;
  v22 = v51;
  memcpy(v51, "qlftg}", sizeof(v51));
  decodeStr(v22, v23); // 按照“2、9、5、6”的顺序解密 "qlftg}"
  v21 = v53;
  v20 = v52;
  memcpy(v52, "a8276l17g<d?2>=16j0?c=a>3h=2:?`g", sizeof(v52));
  decodeStr(v20, v21);  // 按照“2、9、5、6”的顺序解密 "a8276l17g<d?2>=16j0?c=a>3h=2:?`g"
  v19 = operator new(0x20uLL);
  v18 = v51;
  v17 = v52;
  memset(v19, 0, 0x20uLL);
  v32 = v19;
  *v19 = v18;
  v32[1] = v17;
  *(_QWORD *)(v25 + 8LL * (v40 - 1)) = v32;
  for ( i = 0; i < v40 - 1; ++i )
  {
    for ( j = 0; j < v40 - i - 1; ++j )
    {
      if ( (strcmp(**(const char ***)(v25 + 8LL * j), **(const char ***)(v25 + 8LL * (j + 1))) & 0x80000000) != 0 )
      {
        v5 = v25;
        v30 = *(_QWORD *)(v25 + 8LL * j);
        *(_QWORD *)(v25 + 8LL * j) = *(_QWORD *)(v25 + 8LL * (j + 1));
        *(_QWORD *)(v5 + 8LL * (j + 1)) = v30;
      }
    }
  }
  i = 0;
  std::allocator<char>::allocator(&v49);
  std::string::string(&v50, (const unsigned __int8 *)"", &v49);
  std::allocator<char>::~allocator(&v49);
  while ( i < v40 )
  {
    v16 = std::string::operator+=(&v50, *(const unsigned __int8 **)(*(_QWORD *)(v25 + 8LL * i) + 8LL));
    if ( i != v40 - 1 )
      v15 = std::string::operator+=(&v50, "|");
    ++i;
  }
  Class = _JNIEnv::FindClass(enva, "com/common/library/utils/MD5Utils");
  StaticMethodID = _JNIEnv::GetStaticMethodID(enva, Class, "md5", "(Ljava/lang/String;)Ljava/lang/String;");
  v14 = enva;
  v13 = enva;
  v12 = StaticMethodID;
  v11 = Class;
  v10 = std::string::c_str(&v50);
  v9 = _JNIEnv::NewStringUTF(v13, v10);
  v27 = _JNIEnv::CallStaticObjectMethod(v14, v11, v12, v9);
  while ( i < v40 )
  {
    v26 = *(_QWORD *)(v25 + 8LL * i);
    _JNIEnv::ReleaseStringUTFChars(enva, *(jstring *)(v26 + 16), *(const unsigned __int8 **)v26);
    _JNIEnv::DeleteLocalRef(enva, *(jobject *)(v26 + 16));
    _JNIEnv::ReleaseStringUTFChars(enva, *(jstring *)(v26 + 24), *(const unsigned __int8 **)(v26 + 8));
    _JNIEnv::DeleteLocalRef(enva, *(jobject *)(v26 + 24));
    v8 = (void *)v26;
    if ( v26 )
      operator delete(v8);
    ++i;
  }
  v48 = v27;
  std::string::~string(&v50);
  return (jstring)v48;
}
```

### 四、还原token生成算法

整体上的反编译大致就是，它会将加密的一个key（"qlftg}"）和它对应的value（"a8276l17g<d?2>=16j0?c=a>3h=2:?`g"）解密之后添加到刚才两个数组之中，然后按照key的大小排序（当然是ascii），然后用“|”拼接起来对应的value，然后MD5。所以目前就两件事：
①解出来新加的键值对
②复现排序算法，拼接好后进行MD5

关键在于**decodeStr**函数，我们得跳过去看看：

![](https://attach.52pojie.cn/forum/202505/14/194549tx7tdzf6djdrjjpv.png)

```
void __fastcall decodeStr(const char *pstr, int *pkey)
{
  int i; // [xsp+8h] [xbp-18h]
  int v3; // [xsp+Ch] [xbp-14h]

  v3 = strlen(pstr);
  for ( i = 0; i < v3; ++i )
    pstr[i] = decodeChar(pstr[i], pkey[i % 4]);
}
```

其中的pkey就是数组2、5、9、6的地址，pstr是 key的数组/value的数组 。
这个很简单就是便利执行**decodeChar**函数，我们过去瞅瞅：

![](https://attach.52pojie.cn/forum/202505/14/194551rzymfh0mhurrzh1t.png)

```
unsigned __int8 __cdecl decodeChar(unsigned __int8 c, int key)
{
  return c ^ key;
}
```

emmmm，太简单了，就是个相乘。

好了游戏结束，就是将所有的计算过程自己（AI ~~（纠正）~~ ）写一遍就行了，没什么难度。
但是我是让AI写的，稍微简化了一下：（其实还挺简单的）

```
import hashlib
def getToken(keys, values):
    secret_key = 'secret'  # "qlftg}"  的明文
    secret_value = 'c1714e41e5a907874c59a4d81a8486ea' # "a8276l17g<d?2>=16j0?c=a>3h=2:?`g" 的明文

    keys_copy = keys.copy()
    values_copy = values.copy()

    keys_copy.append(secret_key)
    values_copy.append(secret_value)

    sorted_pairs = sorted(zip(keys_copy, values_copy), key=lambda x: x[0])

    # 反转拼接顺序
    reversed_concatenated = '|'.join([pair[1] for pair in sorted_pairs][::-1])

    # 使用反转拼接的结果计算MD5
    md5 = hashlib.md5()
    md5.update(reversed_concatenated.encode('utf-8'))
    digest = md5.digest()

    # 十六进制转换
    hex_str = ''.join(f"{b & 0xff:02x}" for b in digest)

    return hex_str
```

### 五、结语

第一次逆一个正儿八经的APP(bushi)，写教程也有不足之道，刚入门逆向，还请各位大佬发现不足之处能够不吝指导！！！[抱拳]
