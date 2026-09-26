# 【iOS逆向与安全】某车之家sign签名分析

> **作者**: witchan | **发布时间**: 2023-03-03 11:19:00 | **版块**: 『移动安全区』 | **查看/回复**: 5238 / 15
> **原文**: [https://www.52pojie.cn/thread-1753513-1-1.html](https://www.52pojie.cn/thread-1753513-1-1.html)

---

#### 1.目标

分析某车之家sign签名算法的实现

#### 2.操作环境

* frida
* mac系统
* Charles抓包
* 越狱iPhone

#### 3.流程

##### 寻找切入点

通过Charles抓包获取到关键词为\_sign，这也就是我们的切入点：

![image-20220722100915402](https://witchan-1256170176.cos.ap-chengdu.myqcloud.com/b5c714bac2c5d84a08bf13d683636307.jpeg)

##### 静态分析

在静态分析前，我们先观察sign值的特征，比如32位就有可能是md5，数字加字母加+/然后以=号结尾的，就有可能是base64。

通过肉眼观察，发现sign签名的长度是32位大写，第一直觉就是MD5，接下来直接进入动态调试去hook md5函数，看看该加密是否为md5

##### 动态分析

使用frida工具的`frida-trace -UF -i CC_MD5`命令跟踪CC\_MD5函数，代码如下：

```
{
  onEnter(log, args, state) {
      log(`CC_MD5(${args[0].readUtf8String()})`);
  },
  onLeave(log, retval, state) {
    log(`CC_MD5()${hexdump(retval, {length:16})}`);
  }
}
```

执行`frida-trace -UF -i CC_MD5`后，点击登录按钮，日志输出如下：

```
witchan@witchandeAir ~ % frida-trace -UF -i CC_MD5
Instrumenting...
CC_MD5: Loaded handler at "/Users/witchan/__handlers__/libcommonCrypto.dylib/CC_MD5.js"
Started tracing 1 function. Press Ctrl+C to stop.
           /* TID 0x303 */
  6214 ms  CC_MD5(2222)
  6215 ms  CC_MD5()            0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F  0123456789ABCDEF
16f051548  93 4b 53 58 00 b1 cb a8 f9 6a 5d 72 f7 2f 16 11  .KSX.....j]r./..
  6216 ms  CC_MD5(@7U$aPOE@$Version1_appidapp.iphone_timestamp1658455619autohomeuaiPhone    12.5.5  autohome    11.25.0 iPhoneisCheckModeratorsRemote1isapp1logincode%31%31%31%31%31%31%31%31%31%31%31reffersessionida2b93cb5da721aa55ca1a87b2e919b3d3cd214e6showmob1userpwd934B535800B1CBA8F96A5D72F72F1611validcode3333@7U$aPOE@$)
  6216 ms  CC_MD5()            0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F  0123456789ABCDEF
16f051478  50 03 73 09 75 58 bb 53 72 80 20 54 b1 39 2b d4  P.s.uX.Sr. T.9+.
  6219 ms  CC_MD5(https://118.116.0.118/api/UserApi/StandardLoginAHLoginAccountLoginService)
  6219 ms  CC_MD5()            0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F  0123456789ABCDEF
16f051118  17 9a 87 99 d6 48 43 ab 69 a0 b8 62 1d d0 a8 0d  .....HC.i..b....
  6221 ms  CC_MD5(MGCopyAnswerDeviceName)
  6221 ms  CC_MD5()            0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F  0123456789ABCDEF
16f0504c8  ae 4a a5 c0 f7 11 1f 08 b1 63 88 1a a4 f8 da 9f  .J.......c......
  6221 ms  CC_MD5(MGCopyAnswerProductVersion)
  6221 ms  CC_MD5()            0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F  0123456789ABCDEF
16f0504c8  a8 d3 5d 76 55 0a f8 1f d8 96 8a 0d a3 29 b0 80  ..]vU........)..
  6222 ms  CC_MD5(MGCopyAnswerDeviceName)
  6222 ms  CC_MD5()            0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F  0123456789ABCDEF
16f0504c8  ae 4a a5 c0 f7 11 1f 08 b1 63 88 1a a4 f8 da 9f  .J.......c......
  6222 ms  CC_MD5(MGCopyAnswerProductVersion)
  6222 ms  CC_MD5()            0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F  0123456789ABCDEF
16f0504c8  a8 d3 5d 76 55 0a f8 1f d8 96 8a 0d a3 29 b0 80  ..]vU........)..
  6223 ms  CC_MD5(@7U$aPOE@$apisign1|a2b93cb5da721aa55ca1a87b2e919b3d3cd214e6|autohomebrush|1658455619@7U$aPOE@$)
  6223 ms  CC_MD5()            0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F  0123456789ABCDEF
16f050498  70 c0 71 0b 37 23 3a 29 d8 44 02 d7 f6 20 a5 0c  p.q.7#:).D... ..
  6227 ms  CC_MD5(MGCopyAnswerProductVersion)
  6227 ms  CC_MD5()            0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F  0123456789ABCDEF
16f0527b8  a8 d3 5d 76 55 0a f8 1f d8 96 8a 0d a3 29 b0 80  ..]vU........)..
  6228 ms  CC_MD5(MGCopyAnswerProductVersion)
  6228 ms  CC_MD5()            0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F  0123456789ABCDEF
16f052748  a8 d3 5d 76 55 0a f8 1f d8 96 8a 0d a3 29 b0 80  ..]vU........)..
           /* TID 0x552bf */
```

搜索 \_sign值500373097558BB5372802054B1392BD4后发现结果：

```
  6216 ms  CC_MD5(@7U$aPOE@$Version1_appidapp.iphone_timestamp1658455619autohomeuaiPhone    12.5.5  autohome    11.25.0 iPhoneisCheckModeratorsRemote1isapp1logincode%31%31%31%31%31%31%31%31%31%31%31reffersessionida2b93cb5da721aa55ca1a87b2e919b3d3cd214e6showmob1userpwd934B535800B1CBA8F96A5D72F72F1611validcode3333@7U$aPOE@$)
  6216 ms  CC_MD5()            0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F  0123456789ABCDEF
16f051478  50 03 73 09 75 58 bb 53 72 80 20 54 b1 39 2b d4  P.s.uX.Sr. T.9+.
```

##### 结果

sign就是一个简单的32位的大写MD5

入参：@7U$aPOE@$Version1\_appidapp.iphone\_timestamp1658455619autohomeuaiPhone   12.5.5  autohome    11.25.0 iPhoneisCheckModeratorsRemote1isapp1logincode%31%31%31%31%31%31%31%31%31%31%31reffersessionida2b93cb5da721aa55ca1a87b2e919b3d3cd214e6showmob1userpwd934B535800B1CBA8F96A5D72F72F1611validcode3333@7U$aPOE@$

逐个分析：

@7U$aPOE@$前缀

Version1版本

\_appidapp.iphone 应用标识

\_timestamp1658455619时间戳

autohomeuaiPhone    12.5.5  autohome    11.25.0 iPhone手机UA

isCheckModeratorsRemote1不晓得

isapp1是否为手机

logincode%31%31%31%31%31%31%31%31%31%31%31手机号，原始手机号为11111111111。当入参为00123456789时，该字段为00%3123456789，结论：string里的1替换为%31

reffer来源

sessionida2b93cb5da721aa55ca1a87b2e919b3d3cd214e6队列id

showmob1不晓得

userpwd934B535800B1CBA8F96A5D72F72F1611密码MD5

validcode3333验证码

@7U$aPOE@$ 后缀
