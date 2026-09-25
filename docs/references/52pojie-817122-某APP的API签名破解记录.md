# 某APP的API签名破解记录

> **作者**: 王小劣 | **发布时间**: 2018-11-06 17:37:00 | **版块**: 『移动安全区』 | **查看/回复**: 19858 / 43
> **原文**: [https://www.52pojie.cn/thread-817122-1-1.html](https://www.52pojie.cn/thread-817122-1-1.html)

---

*本帖最后由 王小劣 于 2018-11-6 19:09 编辑*

最近因为要去除一些常用 APP 丧心病狂的切屏广告所以接触了一下 iOS 逆向,正巧群里有人问怎么破解某APP的API签名,就拿来练练手.

#### 准备工作

* 某APP砸壳后的.ipa文件
* MonkeyDev
* IDA Pro
* class-dump 头文件

#### 查找分析定位相关函数

* 通过搜索常用的加密关键词 "md5" "sign" 以及 API 相关函数名很容易定位到了一个叫`XYAPIEncodeSign`的类
* 查看该类的头文件为

  ```
  +(id)md5:(id)arg1 useLower:(_Bool)arg2;
  +(id)URLencodeSpacetoPlus:(id)arg1;
  +(id)signWithQueryItems:(id)arg1;
  ```
* 编写代码 hook `+ (id)signWithQueryItems:(id)arg1;` 方法

  ```
  CHDeclareClass(XYAPIEncodeSign)
  CHClassMethod1(id, XYAPIEncodeSign, signWithQueryItems,id,arg1){
  id result = CHSuper1(XYAPIEncodeSign, signWithQueryItems, arg1);
  NSLog(@"XYAPIEncodeSign signWithQueryItems ---result:%@",result);
  return result;
  }
  ```

运行后其中一次的打印结果(非真实打印)为

```
XYAPIEncodeSign signWithQueryItems ---result:c347e5dfd0af7ace125b959f621ab268
```

可以看到会直接返回一个 md5 加密后的32位sign`c347e5dfd0af7ace125b959f621ab268`,通过和网络抓包对比结果一致,说明这个类方法确实是我们想要的签名生成方法.

#### 查看类方法的实现

* 把.app 拖入 IDA 解析完毕后,搜索`signWithQueryItems`,按 F5 可以得到伪代码(部分)如下

  ```
  id __cdecl +[XYAPIEncodeSign signWithQueryItems:](XYAPIEncodeSign_meta *self, SEL a2, id a3)
  {

  v24 = objc_msgSend(v23, "URLencodeSpacetoPlus:", v14);
  v25 = (void *)objc_retainAutoreleasedReturnValue(v24);
  v26 = objc_msgSend(v25, "mutableCopy");
  objc_release(v14);
  objc_release(v25);
  v28 = (void *)objc_retain(v49, v27);
  v29 = objc_msgSend(&OBJC_CLASS___NSMutableString, "new");
  v30 = v26;
  if ( objc_msgSend(v26, "length") )
  {
    v52 = v29;
    v31 = 0LL;
    do
    {
      v32 = (unsigned __int64)objc_msgSend(v26, "characterAtIndex:", v31);
      v33 = (unsigned __int64)objc_msgSend(v28, "length");
      v34 = (unsigned __int64)objc_msgSend(v28, "characterAtIndex:", v31 - v31 / v33 * v33);
      v35 = objc_msgSend(&OBJC_CLASS___NSString, "stringWithFormat:", CFSTR("%i"), v34 ^ v32);
      v36 = objc_retainAutoreleasedReturnValue(v35);
      objc_msgSend(v52, "appendString:", v36);
      objc_release(v36);
      ++v31;
    }
    while ( (unsigned __int64)objc_msgSend(v26, "length") > v31 );
    v22 = v51;
    v29 = v52;
  }
  v37 = objc_msgSend(v22, "class");
  v38 = objc_msgSend(v37, "md5:useLower:", v29, 1LL);
  v39 = (void *)objc_retainAutoreleasedReturnValue(v38);
  v40 = objc_msgSend(v22, "class");
  v41 = objc_msgSend(v39, "stringByAppendingString:", v28);
  v42 = objc_retainAutoreleasedReturnValue(v41);
  v43 = v42;
  v44 = objc_msgSend(v40, "md5:useLower:", v42, 1LL);
  v45 = (void *)objc_retainAutoreleasedReturnValue(v44);
  }
  ```
* 通过查看伪代码我们发现该方法内调用了类方法`URLencodeSpacetoPlus`,那么就先 hook 一下这个方法看看它做了什么

  ```
  CHClassMethod1(id, XYAPIEncodeSign, URLencodeSpacetoPlus,id,arg1){
  id result = CHSuper1(XYAPIEncodeSign, URLencodeSpacetoPlus, arg1);
  NSLog(@"XYAPIEncodeSign URLencodeSpacetoPlus ----arg1:%@ ---result:%@ " ,arg1,result);
  return result;
  }
  ```

  打印结果为(非真实数据)`"deviceId%3DF88CEADF-0D03-XXXX-XXXX-846D2E0A021Cdevice_fingerprint%3D201711130033453bdc3fad93e398c2cdfecd28355c732f01b633f31603a881device_fingerprint1%3D201711130033453bdc3fad93e398c2cdfecd28355c732f01b633f31603a881lang%3Dzhpath%3D/api/sns/v1/recommend/user/statusplatform%3DiOSsid%3Dsession.1540012876934309754t%3D1540028140"`,因为可以一眼看出来这个是传入参数根据 key 排列后的字符串进行了UrlEncode编码得到的,就不需要再去查看其具体实现了.
* 接下来我们可以直接从`URLencodeSpacetoPlus`后进行分析可以看出 sign 的计算代码为

  ```
  if ( objc_msgSend(v26, "length") )
  {
    v52 = v29;
    v31 = 0LL;
    do
    {
      v32 = (unsigned __int64)objc_msgSend(v26, "characterAtIndex:", v31);
      v33 = (unsigned __int64)objc_msgSend(v28, "length");
      v34 = (unsigned __int64)objc_msgSend(v28, "characterAtIndex:", v31 - v31 / v33 * v33);
      v35 = objc_msgSend(&OBJC_CLASS___NSString, "stringWithFormat:", CFSTR("%i"), v34 ^ v32);
      v36 = objc_retainAutoreleasedReturnValue(v35);
      objc_msgSend(v52, "appendString:", v36);
      objc_release(v36);
      ++v31;
    }
    while ( (unsigned __int64)objc_msgSend(v26, "length") > v31 );
    v22 = v51;
    v29 = v52;
  }
  v37 = objc_msgSend(v22, "class");
  v38 = objc_msgSend(v37, "md5:useLower:", v29, 1LL);
  v39 = (void *)objc_retainAutoreleasedReturnValue(v38);
  v40 = objc_msgSend(v22, "class");
  v41 = objc_msgSend(v39, "stringByAppendingString:", v28);
  v42 = objc_retainAutoreleasedReturnValue(v41);
  v43 = v42;
  v44 = objc_msgSend(v40, "md5:useLower:", v42, 1LL);
  v45 = (void *)objc_retainAutoreleasedReturnValue(v44);
  objc_release(v43);
  ```

#### 还原代码

* 这部分很简单就不说具体的还原方法了,直接上代码.如下

  ```
  NSString *v26 = @"deviceId%3DF88CEADF-0D03-XXXX-XXXX-846D2E0A021Cdevice_fingerprint%3D201711130033453bdc3fad93e398c2cdfecd28355c732f01b633f31603a881device_fingerprint1%3D201711130033453bdc3fad93e398c2cdfecd28355c732f01b633f31603a881lang%3Dzhpath%3D/api/sns/v1/recommend/user/statusplatform%3DiOSsid%3Dsession.1540012876934309754t%3D1540028140";
  NSString *v28 = @"F88CEADF-0D03-XXXX-XXXX-846D2E0A021C";
  NSMutableString *v52 = [NSMutableString new];
  for (int i = 0; i < v26.length;i++) {
      unichar v32=[v26 characterAtIndex:i];
      NSInteger v33 = v28.length;
      unichar v34 = [v28 characterAtIndex:i-i/v33*v33];
      NSString *v35 = [NSString stringWithFormat:@"%i",v32^v34];
      [v52 appendString:v35];
  }
  NSString *v38 = [self getMD5WithString:v52];
  NSString *v41 = [v38 stringByAppendingString:v28];
  NSString *v44 = [self getMD5WithString:v41];
  NSLog(@"sign--------------%@",v44);
  ```
