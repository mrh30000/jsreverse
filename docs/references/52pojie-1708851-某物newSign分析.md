# 某物newSign分析

> **作者**: 胡凯莉 | **发布时间**: 2022-11-06 21:05:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3723 / 1
> **原文**: [https://www.52pojie.cn/thread-1708851-1-1.html](https://www.52pojie.cn/thread-1708851-1-1.html)

---

**newSign****目标获取评论**

* 抓包
  + ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106151525178.png)
  + 抓包是有一个坑的
  + 在安卓开发时，OkHttp发送请求，设置 Proxy.NO\_PROXY，基于系统代{过}{滤}理都是抓不到包。OkHttpClient client = new OkHttpClient.Builder().proxy(Proxy.NO\_PROXY).build();

**寻找请求头的加密参数X-Auth-Token**

* 一般app是不用看cookie的 直接看发携带的参数 和 请求头携带的参数
* 请求头的参数
* GET /sns-itr/v1/reply/detail-page-reply-list?contentId=88730162&contentType=0&num=6&hotNum=2&childNum=2&anchorReplyId=0&scene=single&newSign=cb40dc27fd3b860e2aaaaa53ba92ca0a HTTP/1.1
  app\_build   5.3.1.10
  ipvx    58.247.135.94
  cookieToken
  webua   Mozilla/5.0 (Linux; Android 10; Redmi Note 7 Build/QKQ1.190910.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/81.0.4044.138 Mobile Safari/537.36/duapp/5.3.1(android;10)
  duplatform  android
  appId   duapp
  duchannel   du
  humeChannel
  duv 5.3.1
  duloginToken
  dudeviceTrait   Redmi+Note+7
  dudeviceBrand   xiaomi
  timestamp   1667718286410
  shumeiid    20221022160857ca5a2e5c1131aba30df6bbf1e29e07f0018ad5a0c9b0f364
  oaid    85c47b431f52a2d3
  User-Agent  duapp/5.3.1(android;10)
  X-Auth-Token    Bearer eyJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE2NjY0NDI3NDMsImV4cCI6MTY5Nzk3ODc0MywiaXNzIjoiNmZjM2UyOTUyMjZmNTYxMiIsInN1YiI6IjZmYzNlMjk1MjI2ZjU2MTIiLCJ1dWlkIjoiNmZjM2UyOTUyMjZmNTYxMiIsInVzZXJJZCI6MTI1MzU3MDU5NSwiaXNHdWVzdCI6dHJ1ZX0.CDXk5qXei\_Rkl7tcjmdjJ4IO8fafeWlkr-lGJ0VfGibdKLLPnNt4VP82kw5g3yTp\_FEPBeDuEvt2YzSISFRofK9bEV4\_E3HWxzWSOYbBBIyoeewRBF0DSBvwkMKj7ke\_-1qjiCcOxs62V7HUuZiudb7IID4VmPZSCr\_BS0Pht9oTKwaQKxyYYgPOOc-LPCE2HDIXQuaRB0oO0GLfHpEje7x2DNu-4DlpbSna2bUZNHsB4NvncFnTt-63QQmv4ArNpOGrgsmCeWLwQ5bfQ-5n3JR52Oj4EJjIuM9fQCLapyjcJ0NKsIelPjljRS0vaTTdNXDHxFGk4ya7ciQB-qT\_RA
  isRoot  0
  emu 0
  isProxy 0
  SK  9JmwKVKaeRAA6AUl7dLuacdPZsSNsUdO0Pr5azmlnanFG2s8Xgjth8YPoq6XGqZD9ertSEdiXgOAHz3vCB9JYYQVpA1x
  x-dus-token 1667718286410;2CycLMYQQ2FoGdY2Zj59l5mInQM8
  ducodeid
  duproductid 1489D12C382602787663FDA932798830BDFE24914A4EEF24D4D5C25559243BDD
  dps 1
  sks 0,adw2
  Host    app.dewu.com
  Connection  Keep-Alive
  Accept-Encoding gzip
* 参数很多 利用charles的重放发包测试只要带下面这几个参数就可以发包成功
* ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106152607458.png)
* 所以现在确定只有**X-Auth-Token**是要我们进行逆向的

**寻找请求参数中的加密参数newSign**

* ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106152821558.png)
* 多次发包发现只有这newSign是变化的

**找X-Auth-Token**

* 版本5.3.1 使用Jadx反编译一下
* ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106154713707.png)
  + 找不到啥有用的信息
  + ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106154912855.png)
  + 想一想这个x-auth-token在请求头上携带的   肯定很多接口都要用  肯定在过滤器中有相关信息  搜一下 interceptor 拦截器
    - ps 内存炸了没搜出来当我没说
* ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106155007969.png)
  + 这样还是可以找到的
  + hashMap.put("X-Auth-Token", ServiceManager.d().getJwtToken())
    - 这样的Jwt类似的应该是美团的热加载 应该没有什么有用的信息
* 没找到  换个思路 是不是其他请求发过来的 然后携带这个就ok了 这个值应该是不会变的吧？ 去抓包搜搜  注意看是不是刚启动的时候生成的，或者是要清除数据
* ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106155730096.png)
* 果然是某个请求返回的  在响应头中！ 看一下这俩一样不
  + Bearer eyJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE2Njc3MjEzOTQsImV4cCI6MTY5OTI1NzM5NCwiaXNzIjoiNmZjM2UyOTUyMjZmNTYxMiIsInN1YiI6IjZmYzNlMjk1MjI2ZjU2MTIiLCJ1dWlkIjoiNmZjM2UyOTUyMjZmNTYxMiIsInVzZXJJZCI6MTI1MzU3MDU5NSwiaXNHdWVzdCI6dHJ1ZX0.pDxj\_ENTuFQOtO4Gh6DGRVeT\_BzAqFidCd4mCt\_m0zaohX7ZwdF7aiReK68qin3\_-Af1fD23nDMEJXhpZ4XQ0uFRa\_ZMW9upeG2c5hjgJy\_-XPP3L5cipHRMHznukbNK\_tUHV5ok5drc0EJPTIegLpTBlXAQHYTpvSpgiezj9A9OVm6B3HF6L6dUNiB2T6S4N0bBuCoXymQVWLAaoqZyZQkqh\_BgvV47x2Yxrge9fBdKlqcQspg3UXuRFxjwAaqIlu4hcMNJjeuOZHD\_5QIP0qg58cPMzDlc0-wexo5DMkiS6Wn83BYujB7SneBTd60hwNWJ2XKlzKs7vx9uFkEu8A
    &#8203;
    Bearer eyJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE2Njc3MjEzOTQsImV4cCI6MTY5OTI1NzM5NCwiaXNzIjoiNmZjM2UyOTUyMjZmNTYxMiIsInN1YiI6IjZmYzNlMjk1MjI2ZjU2MTIiLCJ1dWlkIjoiNmZjM2UyOTUyMjZmNTYxMiIsInVzZXJJZCI6MTI1MzU3MDU5NSwiaXNHdWVzdCI6dHJ1ZX0.pDxj\_ENTuFQOtO4Gh6DGRVeT\_BzAqFidCd4mCt\_m0zaohX7ZwdF7aiReK68qin3\_-Af1fD23nDMEJXhpZ4XQ0uFRa\_ZMW9upeG2c5hjgJy\_-XPP3L5cipHRMHznukbNK\_tUHV5ok5drc0EJPTIegLpTBlXAQHYTpvSpgiezj9A9OVm6B3HF6L6dUNiB2T6S4N0bBuCoXymQVWLAaoqZyZQkqh\_BgvV47x2Yxrge9fBdKlqcQspg3UXuRFxjwAaqIlu4hcMNJjeuOZHD\_5QIP0qg58cPMzDlc0-wexo5DMkiS6Wn83BYujB7SneBTd60hwNWJ2XKlzKs7vx9uFkEu8A
  + 一样的  说明请求这俩链接都一样  看一下如何请求这俩链接
* 1  . POST /api/v1/app/user\_core/users/getVisitorUserId HTTP/1.1
  + 先看一下请求头
  + app\_build

    5.3.1.10

    ipvx
    cookieToken
    webua
    duplatformandroid
    appIdduapp
    duchannel
    humeChannel
    duv5.3.1
    duloginToken
    dudeviceTraitRedmi+Note+7
    dudeviceBrandxiaomi
    timestamp1667721396908
    shumeiid20221106155636775d6ee8a5c68f7a92f424f12ea81a2800188c553201a9b1
    oaid
    User-Agentduapp/5.3.1(android;10)
    X-Auth-Token
    isRoot0
    emu0
    isProxy0
    SK
    duimei
    duproductid1489D12C382602787663FDA932798830BDFE24914A4EEF24D4D5C25559243BDD
    dps1
    sks0,adw2
    Content-Typeapplication/json; charset=utf-8
    Transfer-Encodingchunked
    Hostapp.dewu.com
  + 测试发包发现 进行不下去  去看一下请求参数
  + ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106160505373.png)
  + 进行不下去了  直接有newSign  只能先去分析newSign

**找newSign**

* 这个newSign一直都在变化 肯定不是某个地方返回的了  大概率是app内部生成的  直接反编译搜一下吧
* file://C:/Users/%E6%9D%8E%E4%B8%96%E6%9E%97/AppData/Roaming/Typora/typora-user-images/image-20221106160804795.png?lastModify=1667739911
  + 搜不到啊
  + 去看看某个utils里面的拦截器interceor有没有什么信息
  + com.shizhuang.duapp.common.utils  去翻翻
  + ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106161336474.png)
  + 不知道有用没用  找不到 就这样毁灭吧
  + com.shizhuang.duapp.common.helper.net.interceptor  去翻翻
  + ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106163535748.png)
* 换个思路  去搜一下url
  + - newSign
    - url
    - 其他参数
  + 找不到 毁灭吧
  + 换个版本看看吧 4.70.0
  + ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106170318702.png)
* 果然啊 在这个拦截器里面  去新版本对应一下看看
* 新版本直接写进vmp里面了啥也看不见
  + host.addQueryParameter("newSign", RequestUtils.c(hashMap2, currentTimeMillis));
  + 跟进这个c函数进去看看
  + ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106170840130.png)
  + 应该就是加密的地方了
  + hook打开frida进行hook 注意去看看新版本是不是也有这个方法package com.shizhuang.duapp.common.utils.RequestUtils;是在这个地方的
  + 发现方法名都是一样的没什么变化 直接hook即可   里面有三个方法都是返回的加密的newsign  都hook一下 看一下评论的包走哪个函数
  + import frida
    import sys
    &#8203;
    &#8203;
    rdev = frida.get\_remote\_device()
    &#8203;
    #session = rdev.attach("com.shizhuang.duapp")
    session = rdev.attach("得物")
    &#8203;
    src = """
    Java.perform(function () {
        var RequestUtils = Java.use("com.shizhuang.duapp.common.utils.RequestUtils");

         RequestUtils.a.overload('java.util.Map', 'long').implementation = function(map,j){
            var res = this.a(map,j);
            console.log("a-->newSign=", res);
            return res;
        }
    &#8203;
    &#8203;
         RequestUtils.b.overload('java.util.Map', 'long').implementation = function(map,j){
            var res = this.b(map,j);
            console.log("b-->newSign=", res);
            return res;
        }
    &#8203;
    &#8203;
        RequestUtils.c.overload('java.util.Map', 'long').implementation = function(map,j){
            var res = this.c(map,j);
            console.log("c-->newSign=", res);
            return res;
        }
    });
    """
    script = session.create\_script(src)
    &#8203;
    script.load()
    sys.stdin.read()#运行，当执行到read=sys.stdin.read()会阻塞，等待我们输入
  + 走的c函数 分析c函数即可
  + ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106172021944.png)
  + 函数的参数和内部做了哪些事呢？
    - 参数map 【重点】
    - 再添加5个参数 【重点】
    - 排序拼接
    - 传递给encode方法加密，疑似AES加密【重点】
    - 再调用f加密，md5加密
    - public static String f(String str) {
              PatchProxyResult proxy = PatchProxy.proxy(new Object[]{str}, null, changeQuickRedirect, true, 8541, new Class[]{String.class}, String.class);
              if (proxy.isSupported) {
                  return (String) proxy.result;
              }
              try {
                  MessageDigest messageDigest = MessageDigest.getInstance("MD5");
                  messageDigest.update(str.getBytes());
                  byte[] digest = messageDigest.digest();
                  StringBuilder sb = new StringBuilder();
                  for (byte b : digest) {
                      String hexString = Integer.toHexString(b & 255);
                      while (hexString.length() < 2) {
                          hexString = "0" + hexString;
                      }
                      sb.append(hexString);
                  }
                  return sb.toString();
              } catch (NoSuchAlgorithmException e) {
                  e.printStackTrace();
                  return "";
              }
          }
      &#8203;
  + 字典的值为-> {hotNum=2, childNum=2, num=6, contentId=91596960, anchorReplyId=0, contentType=0, scene=single}
    --> anchorReplyId0childNum2contentId91596960contentType0hotNum2loginTokennum6platformandroidscenesingletimestamp1667727230932uuid6fc3e295226f5612v5.3.1
    --> lBYrp9G5PAMDk5gfqU13oxTskDjzkWz44n2W2n6czxMJBIhdpD4TQCkisyZqhVEBH01PYsJYC3pdehwfHSNgCdagiG7I8ulV+uaA70u0ZrK2BG6Rt6i3l61cZcI/tlHJwdqy/u/v2XKSlg2zj4tMx9yVILWX1j11NyFh0Yt+7I5NTeCUh5SovtToEQnfIB8EbuAM89Hab8mebNCzjqx1ew==
    &#8203;
  + v=4.84.0
    timestamp=1660649735904
    uuid=0d9686a78e2aa975      -> ?
    platform=android
    loginToken=
  + 时间戳好解决 uuid是要随机生成测试模拟生成  记得完事后要排序然后才送到加密逻辑里面
  + import random
    def create\_android\_id(size):
        data\_list = []
        for i in range(1,size):
            part = "".join(random.sample("0123456789ABCDEF",2))
            data\_list.append(part)
        return "".join(data\_list).lower()
    &#8203;
    print(create\_android\_id(8))
* String encode = AESEncrypt.encode(sb2);这个肯定就是AES加密了 跟进去看一下encode的函数
* ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106173747927.png)
* 写进了so层 而且使用的so层文件也被混淆了   去老版本看一下吧
* ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106182258052.png)
  + 得出信息  1.使用的so文件是JNIEncrypt
  + - 新版本的encode函数做的事情就是这个老版本b函数做的事情
    - 生成一串01代码，然后把01互换 最后把传入的参数和这个01代码传入encodeByte（）
    - NCall.IL 就是encodeByte
    - 可以hook一下这俩地方看一下关系 encodeByte（）
  + # com.shizhuang.duapp
    import frida
    import sys
    &#8203;
    rdev = frida.get\_remote\_device()
    session = rdev.attach("得物")
    &#8203;
    scr = """
    Java.perform(function () {
        var RequestUtils = Java.use("com.shizhuang.duapp.common.utils.RequestUtils");
        var AESEncrypt = Java.use("com.duapp.aesjni.AESEncrypt");
    &#8203;
        RequestUtils.c.overload('java.util.Map', 'long').implementation = function(map,j){
    &#8203;
            var Map = Java.use('java.util.HashMap');
            var args\_map = Java.cast(map, Map);
            console.log('c-->',args\_map.toString());
    &#8203;
            var res = this.c(map,j);
            console.log("c-->newSign=", res);
            return res;
        }
    &#8203;
        AESEncrypt.encode.implementation = function( str){
            console.log('-->',str);
            var res = this.encode(str);
            console.log('-->',res);
            return res;
        }
    &#8203;
         AESEncrypt.encodeByte.implementation = function(bArr, str){
            console.log('=======>',str);
            var res = this.encodeByte(bArr,str);
            console.log('=======>',res);
            return res;
        }
    });
    """
    script = session.create\_script(scr)
    &#8203;
    script.load()
    sys.stdin.read()c--> {hotNum=2, childNum=2, num=6, contentId=88443061, anchorReplyId=0, contentType=0, scene=single}
    encode--> anchorReplyId0childNum2contentId88443061contentType0hotNum2loginTokennum6platformandroidscenesingletimestamp1667731913643uuid6fc3e295226f5612v5.3.1
    encodeByte=======> 010110100010001010010010000011000111001011101010101000101110111010011010101101101010001000101100010110100010001010011010110011001111001011100010101000100100110010110010100010101011110010111100
    encodeByte=======> lBYrp9G5PAMDk5gfqU13oxTskDjzkWz44n2W2n6czxPiCt52EtMtR060zP4ejqWpH01PYsJYC3pdehwfHSNgCdagiG7I8ulV+uaA70u0ZrK2BG6Rt6i3l61cZcI/tlHJwdqy/u/v2XKSlg2zj4tMx9SX9gxyhuJOjh+erJxGrhJNTeCUh5SovtToEQnfIB8EbuAM89Hab8mebNCzjqx1ew==
    encode--> lBYrp9G5PAMDk5gfqU13oxTskDjzkWz44n2W2n6czxPiCt52EtMtR060zP4ejqWpH01PYsJYC3pdehwfHSNgCdagiG7I8ulV+uaA70u0ZrK2BG6Rt6i3l61cZcI/tlHJwdqy/u/v2XKSlg2zj4tMx9SX9gxyhuJOjh+erJxGrhJNTeCUh5SovtToEQnfIB8EbuAM89Hab8mebNCzjqx1ew==
    c-->newSign= ca22e23d706de27ba52e2d41901fcab4
  + 发现本质上encode也是调用encodeByte，最终生成结果。
    - 第一个参数转换为字节   第二个参数没有用一堆0101
  + 所以我们去找一下老版本中的so文件中的encodeByte方法
  + ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106190427390.png)
  + 打开IDA
  + ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106190753934.png)
  + 注意一个事情：
    - 这个so文件是静态注册还是动态注册？
      * 静态直接找这个方法名java开头的方法
      * 动态注册找JNI\_onload  找动态注册方法
    - ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106194815201.png)
    - ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106194834293.png)
    - * 去掉隐式转换
      * 类型转换 （加载头文件）
      * ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106195104081.png)
      * ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106195137848.png)
      * 更换类型![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106195317071.png)![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106195333907.png)
      * 做注册的大概就是这个函数 点进去
      * ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106195511254.png)
      * ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106195531080.png)
      * 继续点进去
      * ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106195547587.png)
      * 可以发现一路都是有参数传了进来  传进来的就是一个JNI对象
      * 转为JNI对象
      * ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106195725680.png)
      * 动态注册要传四个参数
      * ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106195817726.png)
      * ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106195952080.png)
      * 第三个参数传的是java中方法和C中的方法对应关系  第四个参数是存在多少个这样的参数
      * 所以重点看第三个参数
      * ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106200141217.png)
      * 类似于全局变量  把java中的方法和c中的方法列出来
      * ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106200259926.png)
      * ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106200342001.png)
      * 第一个地方 java中的方法  第二个是JNI类型签名  第三个是C中的方法
      * ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106200530077.png)
      * 所以encode就是java中encodeByte的具体实现
      * ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106200640989.png)
      * 第一个是JNI对象  ， 第二个是JClass  第三个是传入的对象  第四个是传入的0101代码
      * AES 传入KEY  IV 明文  这里可能是KEY和IV一样的 只用传KEY
      * ![](https://img-pool-own.oss-cn-shanghai.aliyuncs.com/img/image-20221106202122902.png)
      * 如果是一个AES加密：
        + key = iv 要么就是内部写死 key或iv
        + 要加密的明文如果我知道v10和v13的值分别是什么？ + Python实现加密算法。如果想要Hook C语言的代码应该怎么办？
      * hook这个C函数的参数得到KEY
      * # com.shizhuang.duapp
        import frida
        import sys
        &#8203;
        rdev = frida.get\_remote\_device()
        session = rdev.attach("com.shizhuang.duapp")
        &#8203;
        scr = """
        Java.perform(function () {
            //找到某个so文件的某个加密方法
            var addr\_func = Module.findExportByName("libJNIEncrypt.so", "AES\_128\_ECB\_PKCS5Padding\_Encrypt");

            Interceptor.attach(addr\_func, {

                onEnter: function(args){
                    console.log("-------------执行函数-------------");

                    console.log("-------------参数 1-------------");
                    console.log(args[0].readUtf8String())

                    console.log("-------------参数 2-------------");
                    console.log(args[1].readUtf8String());
                },
                onLeave: function(retValue){
                    console.log("-------------返回-------------");
                    console.log(retValue.readUtf8String());
                }

            })

        });
        """
        script = session.create\_script(scr)
        &#8203;
        &#8203;
        def on\_message(message, data):
            print(message, data)
        &#8203;
        &#8203;
        script.on("message", on\_message)
        script.load()
        sys.stdin.read()
        &#8203;
      * -------------执行函数-------------
        -------------参数 1-------------
        contentId88443061loginTokenplatformandroidsourcetimestamp1667737802005uuid6fc3e295226f5612v5.3.1
        -------------参数 2-------------
        d245a0ba8d678a61
        -------------返回-------------
        CYe6yAnmdx279ZbNBC5++ivyN6eJb2Pjdn8FvWBV9WgaenjfCyrqA/NpwdtNNPlyOKB56TTvInSsi+0vJX8kR6tMLW0ceqeOJzMPCqb3nhjTfhmDgJSnmLVodv2DUqR3Mg8LaPY4mwUowIH0fRcFdw==
        -------------执行函数-------------
      * KEY = "d245a0ba8d678a61"

* python验证
* from Crypto.Cipher import  AES
  &#8203;
  from Crypto.Util.Padding import pad
  import base64
  KEY = "d245a0ba8d678a61"
  IV = "d245a0ba8d678a61"
  &#8203;
  def aes\_encrypt(data\_string):
      aes = AES.new(
          key= KEY.encode('utf-8'),
          mode=AES.MODE\_ECB,
      )
  &#8203;
      raw = pad(data\_string.encode('utf-8'),16)
  &#8203;
      return aes.encrypt(raw)
  &#8203;
  data = aes\_encrypt("contentId88443061loginTokenplatformandroidsourcetimestamp1667737802005uuid6fc3e295226f5612v5.3.1")
  &#8203;
  &#8203;
  value = base64.encodebytes(data)
  &#8203;
  res = value.replace(b'\n',b'')
  print(res.decode('utf-8'))
* CYe6yAnmdx279ZbNBC5++ivyN6eJb2Pjdn8FvWBV9WgaenjfCyrqA/NpwdtNNPlyOKB56TTvInSsi+0vJX8kR6tMLW0ceqeOJzMPCqb3nhjTfhmDgJSnmLVodv2DUqR3Mg8LaPY4mwUowIH0fRcFdw==
  &#8203;
* 一样的
* 自此完成了newsign的加密 最后要记得进行md5的加密
* 现在也可以解决X-AuthToken的了
