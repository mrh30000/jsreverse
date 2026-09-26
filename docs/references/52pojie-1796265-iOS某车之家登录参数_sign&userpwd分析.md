# iOS某车之家登录参数_sign&userpwd分析

> **作者**: andyhah | **发布时间**: 2023-06-12 00:57:00 | **版块**: 『移动安全区』 | **查看/回复**: 5543 / 4
> **原文**: [https://www.52pojie.cn/thread-1796265-1-1.html](https://www.52pojie.cn/thread-1796265-1-1.html)

---

#### 前言

“男人一年逛两次，海澜之家”
“男人的衣柜，海澜之家”

“衣” 有海澜之家，“行”就得\*车之家了，哈哈哈哈🤣
这次分享一个iOS端\*车之家的登陆接口的参数分析（仅供学习，严禁干坏事=。=）。本文为新手项，大佬请跳过。

#### 准备

* iOS 12.5.5
* frida 14.0.0
* ipa 5rG96L2m5LmL5a62 11.33.5（爱思助手下载）

#### 抓包

1. 抓包使用 charles，请自行安装并配置证书
2. 抓取登陆接口，点击账号登陆。使用假账密测试抓包 123456 / 123456，能够抓包成功

[![pCZQ3E6.png](https://s1.ax1x.com/2023/06/11/pCZQ3E6.png)](https://imgse.com/i/pCZQ3E6)

#### 分析

1. 登录页面需要输入3个信息，分别是账号 / 密码 / 验证码，对应字段 logincode / userpwd / validcode

   * logincode为一个字符串，是输入账号加一个 *%3* 做前缀。
   * userpwd是一个加密字符串，需要待分析
   * validcode是验证码原文
2. 经过多次抓包分析，其他字段为一些设备信息，可以保持不变。\_timestamp是一个10位的时间戳，\_sign参数每次均改变，需要待分析
3. 分析前将包含 Mach-O文件的，后缀名为 *.app*的文件夹从爱思助手导出

   [![pCZlEqI.png](https://s1.ax1x.com/2023/06/11/pCZlEqI.png)](https://imgse.com/i/pCZlEqI)
4. 检查Mach-O文件是否需要脱壳

   * 找到Mach-O文件

   ```
   file Payload/Autohome.app/* | grep Mach-O

   Payload/Autohome.app/Autohome: Mach-O 64-bit executable arm64
   ```

   * 使用otool查看是否脱壳。1: 未脱壳；0: 脱壳；

   ```
   % otool -l Payload/Autohome.app/Autohome | grep crypt

       cryptoff 16384
       cryptsize 28295168
       cryptid 1
   ```

   * 使用 [frida-ios-dump](https://github.com/AloneMonkey/frida-ios-dump)砸壳。

     + 需要app完全启动才能砸，如果砸壳中遇到阻塞请重试。
     + 砸完会生成一个 ipa，直接解压即可
   * 再次使用otool检测会发现 cryptid 1 变为 cryptid 0，即砸壳完成。
5. 开始分析userpwd参数。用ida将Mach-O文件 Autohome 打开，搜索字符串 userpwd

   [![pCZl4QH.png](https://s1.ax1x.com/2023/06/11/pCZl4QH.png)](https://imgse.com/i/pCZl4QH)
6. 点击第一个进入，tab键转换伪代码.

   ```
   void __cdecl -[LOGThirdBindService bindThirdLogincode:userpwd:platformid:token:tokensecret:orginalname:openid:unionId:position:](LOGThirdBindService *self, SEL a2, id a3, id a4, int a5, id a6, id a7, id a8, id a9, id a10, int a11)
   {
     id v11; // x23
     id v12; // x22
     id v13; // x21
     int v14; // w27
     id v15; // x20
     LOGThirdBindService *v16; // x25
     __int64 v17; // x1
     void *v18; // x20
     __int64 v19; // x1
     __int64 v20; // x21
     __int64 v21; // x1
     __int64 v22; // x1
     __int64 v23; // x1
     __int64 v24; // x1
     void *v25; // x0
     int v26; // w19
     NSMutableDictionary *v27; // x19
     void *v28; // x0
     __int64 v29; // x0
     NSMutableDictionary *v30; // x19
     void *v31; // x0
     void *v32; // x0
     NSMutableDictionary *v33; // x28
     void *v34; // x0
     NSMutableDictionary *v35; // x19
     void *v36; // x0
     NSMutableDictionary *v37; // x19
     void *v38; // x0
     NSMutableDictionary *v39; // x19
     __int64 v40; // x0
     __int64 v41; // x0
     __int64 v42; // x27
     void *v43; // [xsp+20h] [xbp-90h]
     __int64 v44; // [xsp+50h] [xbp-60h]
     char v45; // [xsp+58h] [xbp-58h]

     v11 = a8;
     v12 = a7;
     v13 = a6;
     v14 = a5;
     v15 = a4;
     v16 = self;
     v43 = (void *)objc_retain(a3, a2);
     v18 = (void *)objc_retain(v15, v17);
     v20 = objc_retain(v13, v19);
     objc_retain(v12, v21);
     objc_retain(v11, v22);
     objc_retain(a9, v23);
     objc_retain(a10, v24);
     sub_1016C6940((void *)v16->postDataDic);
     v25 = sub_1016769C0(&OBJC_CLASS___AHUserSettings);
     objc_retainAutoreleasedReturnValue(v25);
     v26 = sub_1016978E0();
     objc_release();
     if ( v26 )
     {
       v27 = v16->postDataDic;
       v28 = sub_1016769C0(&OBJC_CLASS___AHUserSettings);
       objc_retainAutoreleasedReturnValue(v28);
       v29 = sub_10167D700();
       objc_retainAutoreleasedReturnValue(v29);
       sub_1017025E0((void *)v27);
       objc_release();
       objc_release();
     }
     v30 = v16->postDataDic;
     v31 = sub_101728CE0(v43);
     objc_retainAutoreleasedReturnValue(v31);
     sub_1017025E0((void *)v30);
     objc_release();
     v32 = -[LPNode count]_0(v18);
     v33 = v16->postDataDic;
     if ( v32 )
     {
       v34 = sub_10162E040(&OBJC_CLASS___AHMD5);
       objc_retainAutoreleasedReturnValue(v34);
       sub_1017025E0((void *)v33);
       objc_release();
     }
     else
     {
       sub_1017025E0((void *)v16->postDataDic);
     }
     v35 = v16->postDataDic;
     v36 = sub_1016AAC00(&OBJC_CLASS___NSNumber);
     objc_retainAutoreleasedReturnValue(v36);
     sub_1017025E0((void *)v35);
     objc_release();
     if ( !v20 )
       objc_release();
     sub_1017025E0((void *)v16->postDataDic);
     sub_1017025E0((void *)v16->postDataDic);
     sub_1017025E0((void *)v16->postDataDic);
     sub_1017025E0((void *)v16->postDataDic);
     if ( v14 == 26 )
       sub_1017025E0((void *)v16->postDataDic);
     v37 = v16->postDataDic;
     v38 = sub_1016AAC00(&OBJC_CLASS___NSNumber);
     objc_retainAutoreleasedReturnValue(v38);
     sub_1017025E0((void *)v37);
     objc_release();
     sub_1017025E0((void *)v16->postDataDic);
     v39 = v16->postDataDic;
     v40 = sub_1016CB900(&OBJC_CLASS___AHAppSettings);
     objc_retainAutoreleasedReturnValue(v40);
     sub_1017025E0((void *)v39);
     objc_release();
     objc_initWeak(&v45, v16);
     v41 = sub_10172F720(v16);
     v42 = objc_retainAutoreleasedReturnValue(v41);
     objc_copyWeak(&v44, &v45);
     sub_10167B600(v42);
     objc_release();
     objc_destroyWeak(&v44);
     objc_destroyWeak(&v45);
     objc_release();
     objc_release();
     objc_release();
     objc_release();
     objc_release();
     objc_release();
     objc_release();
   }
   ```
7. 分析发现有MD5字样，疑似为大写md5，用[md5在线网站](https://www.sojson.com/encrypt_md5.html)测试一下，果然是原滋原味的md5大写，未做任何魔改。那\_sign字符串与userpwd的“样子”相似，可能也是md5。ios的md5使用的是 CC\_MD5，那咱就直接用frida对CC\_MD5进行hook了

   ```
   // hook CC_MD5
       let cc_md5 = Module.findExportByName(null, "CC_MD5");
       console.log(`CC_MD5 addr>> ${cc_md5}`)
       Interceptor.attach(cc_md5, {
           onEnter: function(args){
               // 获取传入 CC_MD5 函数的参数
               const data = args[0];
               const len = args[1];
               const output = args[2];

               console.log(`md5>> ${data.readCString()} | ${parseInt(len, 16)} |  ${output}`)
               console.log("\nBacktrace:\n\t" + Thread.backtrace(this.context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress).join('\n\t') + '\n');

           }
       })
   ```
8. hook CC\_MD5后，分析打印日志, 在userpwd md5日志下发现一个可以日志。是一个312位字符串，放到在线网站中测试一下，加密后果然是\_sign的值。

   ```
   md5>> @7U$aPOE@$Version1_appidapp.iphone_timestamp1686474400autohomeuaiPhone  12.5.5  autohome    11.33.5 iPhonefPosition10004isCheckModeratorsRemote1isapp1logincode%3123456platform3reffersPosition1000405sessionid744ec98679b59e66a1fdc2deb77e7ee610812039showmob1userpwdE10ADC3949BA59ABBE56E057F20F883Evalidcodezbzt@7U$aPOE@$ | 312 |  0x16f6cd528

   Backtrace:
       0x1069566cc AHLoginServicesFramework!+[AHLoginServicesMD5 MD5WithString:]
       0x1069515e4 AHLoginServicesFramework!__128-[AHLoginAccountLoginService accountLoginWidthUserName:PassWord:deviceToken:verifyCode:infoexpand:infoclub:sPosition:fPosition:]_block_invoke
       0x1061ee424 AHBusinessFramework!-[AHServerTimeStampManager getServerTimeStampWithBlock:]
       0x1069514a8 AHLoginServicesFramework!-[AHLoginAccountLoginService accountLoginWidthUserName:PassWord:deviceToken:verifyCode:infoexpand:infoclub:sPosition:fPosition:]
       0x1069537b4 AHLoginServicesFramework!-[AHLoginAccountLoginManager loginWidthUserName:PassWord:deviceToken:verifyCode:infoexpand:infoclub:sPosition:fPosition:success:fail:]
       0x100b13e9c Autohome!0x3e3e9c
       0x1aebe9300 UIKitCore!-[UIApplication sendAction:to:from:forEvent:]
       0x1ae692424 UIKitCore!-[UIControl sendAction:to:forEvent:]
       0x101584aa4 Autohome!0xe54aa4
       0x1ae692744 UIKitCore!-[UIControl _sendActionsForEvents:withEvent:]
       0x1ae6917b0 UIKitCore!-[UIControl touchesEnded:withEvent:]
       0x1aec205c4 UIKitCore!-[UIWindow _sendTouchesForEvent:]
       0x1aec217ec UIKitCore!-[UIWindow sendEvent:]
       0x1aec0185c UIKitCore!-[UIApplication sendEvent:]
       0x1aecc79d4 UIKitCore!__dispatchPreprocessedEventFromEventQueue
       0x1aecca100 UIKitCore!__handleEventQueueInternal
   ```
9. 再分析生成\_sign的字符串，发现是由抓包中的各参数拼接成的，拼接代码如下。至此\_sign参数分析结束。

   ```
   import time
   import hashlib

   """
   @7U$aPOE@$Version1_appidapp.iphone_timestamp1686473693autohomeuaiPhone  12.5.5  autohome    11.33.5 iPhoneisCheckModeratorsRemote1isapp1logincode%3123456reffersessionid744ec98679b59e66a1fdc2deb77e7ee610812039showmob1userpwdE10ADC3949BA59ABBE56E057F20F883Evalidcodeiaeh@7U$aPOE@$
   A40B768AA55F204329C7769C98BB1C69
   """
   usn = "123456"
   pwd = "123456"

   en_md5 = lambda x: hashlib.md5(x.encode()).hexdigest()

   def gen_sign(params):
       s = f"@7U$aPOE@$Version{params['Version']}_appid{params['_appid']}_timestamp{params['_timestamp']}autohomeua{params['autohomeua']}isCheckModeratorsRemote{params['isCheckModeratorsRemote']}isapp{params['isapp']}logincode{params['logincode']}reffer{params['reffer']}sessionid{params['sessionid']}showmob{params['showmob']}userpwd{params['userpwd']}validcode{params['validcode']}@7U$aPOE@$"
       return en_md5(s).upper()

   if __name__ == "__main__":
       params = {
           "Version": 1,
           "_appid": "app.iphone",
           # "_timestamp": int(time.time()),
           "_timestamp": "1686473693",
           "autohomeua": "iPhone   12.5.5  autohome    11.33.5 iPhone",
           "isCheckModeratorsRemote": 1,
           "isapp": 1,
           "logincode": f"%3{usn}",
           "reffer": "",
           "sessionid": "744ec98679b59e66a1fdc2deb77e7ee610812039",
           "showmob": 1,
           "userpwd": en_md5(pwd).upper(),
           "validcode": "iaeh"
       }
       _sign = gen_sign(params)
       print(f"{params=}\n{_sign=}")
   ```

#### 小结

登录接口的 userpwd 和 \_sign 已经分析完了。比较简单，就一个大写md5，还没有任何魔改，熟悉算法的佬应该很快就反应过来的。可惜俺不是🤣，俺开始还用Reveal查找登录视图，再hook视图分析堆栈，徒耗时间，后面才反应过来，哈哈哈哈（对算法敏感度不够，后知后觉）。
