# 某APP的sDjcSign加密

> **作者**: 你就是我的阳光 | **发布时间**: 2024-03-07 10:08:00 | **版块**: 『移动安全区』 | **查看/回复**: 8193 / 40
> **原文**: [https://www.52pojie.cn/thread-1897636-1-1.html](https://www.52pojie.cn/thread-1897636-1-1.html)

---

*本帖最后由 你就是我的阳光 于 2024-3-7 10:24 编辑*

最近沉迷游戏，每天要兑换交易牌有时候也会忘搞的签到全勤都没有了，一气之下做个自动化去。
1.抓包，经过多次抓包以后得到sDjcSign每次加密结果都不一样，初步怀疑RSA

![](https://attach.52pojie.cn/forum/202403/07/101625q9mmzfvn4mbez4n8.png)

2.反编译搜索

![](https://attach.52pojie.cn/forum/202403/07/101654s555zxpghhhxu9rn.png)

这结果简单明了啊，就两个，那第一个remove肯定不是了，那就看看第二个。
3.正式开始逆向之旅

![](https://attach.52pojie.cn/forum/202403/07/101728eyepmmd6co6c5doy.png)

可以看到这个sb2是上面sb.toString得来的，那具体内容不知道是什么一会用frida看看，我们先看o.a(sb2, "se35d32s63r7m23m")这个函数是干什么的。

![](https://attach.52pojie.cn/forum/202403/07/101740lvmzaumy5zfvjvrr.png)

好消息，这就是一个aes加密，那我们先翻译一下代码，现在的代码不就是这样的么

[Java] *纯文本查看*

```
tVar.a("sDjcSign", o.b(o.a(AES(sb2, "se35d32s63r7m23m"))));
```

那还有两个参数不知道干什么的对不对，重复刚才的操作，接着看o.a

![](https://attach.52pojie.cn/forum/202403/07/101809q6dq7p4q6g9qwrnd.png)

这个o.a进来以后还调用了一个a，那就继续进这个a

![](https://attach.52pojie.cn/forum/202403/07/102002few7fyugehryw7ii.png)

果然啊，果然是RSA，就是从文件打开么，那就去找找这个文件

![](https://attach.52pojie.cn/forum/202403/07/102035f8fa7aa87q1qp1q5.png)

那这就很清晰明了了，现在的加密代码为

[Java] *纯文本查看*

```
tVar.a("sDjcSign", o.b(RSA(AES(sb2, "se35d32s63r7m23m"))));
```

就剩一个o.b了。最后一个了，继续往下看

![](https://attach.52pojie.cn/forum/202403/07/102101fzf2pu102i1wz2rp.png)

这个如果看不懂没关系，我们使用frida hook，正好这个sb2这个值也需要用frida去看一下对吧。

[JavaScript] *纯文本查看*

```
function b() {
  Java.perform(function() {
    var i = Java.use("com.tencent.djcity.util.o");
    i.b.overload('[B').implementation = function (arg1) {
      console.log('b.arg1 = ' + ByteString.of(arg1).hex())
      // console.log('arg2 = ' + arg2)
      var ret = this.b(arg1)
      console.log('b.ret = ' + ret)
      return ret
    }
  });

}
function AES() {
  Java.perform(function() {
    var i = Java.use("com.tencent.djcity.util.o");
    i.a.overload('java.lang.String','java.lang.String').implementation = function (arg1,arg2) {
      console.log('AES.arg1 = ' + arg1)
      console.log('AES.arg2 = ' + arg2)
      var ret = this.a(arg1,arg2)
      console.log('AES.ret = ' + ByteString.of(ret).hex())
      return ret
    }
  });

}

function main() {
  AES()
  b()
}

main()
```

[Java] *纯文本查看*

```

AES.arg1 = 8C571443167953BCC67294D143B97FDA+5d73310d28a1a02929aea12667e64edb0dd356c592261249d47bf75e134efe2a+1709772579610+148
AES.arg2 = se35d32s63r7m23m
AES.ret = 778e7eb1fbad4a871b360bf31dbc5502b3d3c8fcfe60f34b6d7d6f7f1a91fabd04132463e13bc07364588f7a84118593bdb207adefd92823c81d0483319b8b88009c2905303978d2c8fa58480957eb005a73d5cb79a338b9c43fafe0de6c06bde254f1d3ce9d09a723d30c2337be860cb144864c4c69eeb190f1f19b4b6f3196
b.arg1 = 20b7bf49b0c8979e04a41474bc74d5acf6efa672a06fe78ea2e415bb929ea20e25a14316f7706e870664b95ba116b35448628b75c776188546b7291c27e05d7d963375c8a8a22e95ab6833a957e75a0f515f1b012f9e1ae6bf49c815c9b09afa1aabea8bb8df1651c073bec595cb235b6f3c6e0f385f291d242c6e2fd185af8d4336b33c2a5d24f7239a4a5d9587dc53acc686e0a2ede36c1d892d804f65d540474256902eca1fd7847fee066c5e2d70371b4e99015afb3c69b7dddfbeac87cc311654dd71ec220b54b84e76ccd46b08b16c71fce279f32a1d9cdb761a00383a8b17b6bb7b36602ffcc4fb2dd1b705530bdb379c3532d2cb22b6fbd89f0aabfa
b.ret = 20b7bf49b0c8979e04a41474bc74d5acf6efa672a06fe78ea2e415bb929ea20e25a14316f7706e870664b95ba116b35448628b75c776188546b7291c27e05d7d963375c8a8a22e95ab6833a957e75a0f515f1b012f9e1ae6bf49c815c9b09afa1aabea8bb8df1651c073bec595cb235b6f3c6e0f385f291d242c6e2fd185af8d4336b33c2a5d24f7239a4a5d9587dc53acc686e0a2ede36c1d892d804f65d540474256902eca1fd7847fee066c5e2d70371b4e99015afb3c69b7dddfbeac87cc311654dd71ec220b54b84e76ccd46b08b16c71fce279f32a1d9cdb761a00383a8b17b6bb7b36602ffcc4fb2dd1b705530bdb379c3532d2cb22b6fbd89f0aabfa
```

我们先看AES.arg1这个是什么意思。这个要结合抓包看，当时我研究了很久这个是啥意思
8C571443167953BCC67294D143B97FDA，这个意思是openid，自己无法生成，系统生成给你的
5d73310d28a1a02929aea12667e64edb0dd356c592261249d47bf75e134efe2a，这个是你的sDeviceID，都是固定的。
1709772579610，这个很明显吧，时间戳148，这个嘛，忘记当时怎么找的了，但是测试的时候感觉所有都可以，那干脆就当他是随机数了。
在看b.arg1和b.ret，注意在frida的js文件中写的脚本，arg1是'[B'，ret是string，那这个函数就是byte2string函数。4.复现加密我们从前面知道了这个参数的各个意思，因为他经过了一个读文件进行rsa加密嘛，所以我选择直接用java写。

[Java] *纯文本查看*

```
public class test {
    private static PublicKey RSA() {
        String baseDir = System.getProperty("user.dir");
        byte[] bArr;
        Exception e;
        try {
            InputStream open = new FileInputStream(baseDir + "\\djc_rsa_public_key_new.der");
            try {
                bArr = new byte[open.available()];
                do {
                    try {
                    } catch (Exception e2) {
                        e = e2;
                        System.out.println("Got exception while is -> bytearr conversion: " + e);
                        return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(bArr));
                    }
                } while (open.read(bArr) != -1);
            } catch (Exception e3) {
                e = e3;
                bArr = null;
            }
            return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(bArr));
        } catch (Exception e4) {
            System.out.println("cuole");
            return null;
        }
    }

    public static byte[] AES(String str, String str2) throws Exception {
        if (str == null) {
            return null;
        }
        Cipher instance = Cipher.getInstance("AES/ECB/PKCS5Padding");
        instance.init(1, new SecretKeySpec(str2.getBytes(StandardCharsets.UTF_8), "AES"));
        return instance.doFinal(str.getBytes(StandardCharsets.UTF_8));
    }

    public static byte[] toRSA(byte[] bArr) throws Exception {
        Cipher instance = Cipher.getInstance("RSA/ECB/PKCS1Padding");
        instance.init(1, RSA());
        return instance.doFinal(bArr);
    }
    public static String bytesToHex(byte[] bytes) {
        StringBuilder buf = new StringBuilder(bytes.length * 2);
        for(byte b : bytes) { // 使用String的format方法进行转换
            buf.append(String.format("%02x", Integer.valueOf(b & 0xff)));
        }

        return buf.toString();
    }

    public static void main(){
         String time = String.valueOf(System.currentTimeMillis());
         System.out.println(bytesToHex3(toRSA(AES(openid + "+5d73310d28a1a02929aea12667e64edb0dd356c592261249d47bf75e134efe2a+" + time + "+" + new Random().nextInt(1000),"se35d32s63r7m23m"))));
    }
}
```

![](https://attach.52pojie.cn/forum/202403/07/102214ttx5ekyoxd8kqvp5.png)

这时候我们得到了一条加密因为存在RSA了，我们需要发包验证才行，先对比一下长度对不对吧。

![](https://attach.52pojie.cn/forum/202403/07/102223j7zwzr8rfck6rrrc.png)

经过做个对比，长度是一样的，那我们直接复现一下签到协议吧，看看对不对

![](https://attach.52pojie.cn/forum/202403/07/102240s9mq43k9ed11fmv9.png)

这个是签到包

[Java] *纯文本查看*

```
:method: POST
:path: /ams/ame/amesvr?ameVersion=0.3&sServiceType=dj&iActivityId=11117&sServiceDepartment=djc&set_info=newterminals&&appSource=android&appVersion=148&ch=10010&sDeviceID=5d73310d28a1a02929aea12667e64edb0dd356c592261249d47bf75e134efe2a&osVersion=Android-29&p_tk=1713520954&sVersionName=v4.7.2.0
:authority: comm.ams.game.qq.com
:scheme: https
user-agent: TencentDaojucheng=v4.7.2.0&appSource=android&appVersion=148&ch=10010&sDeviceID=5d73310d28a1a02929aea12667e64edb0dd356c592261249d47bf75e134efe2a&firmwareVersion=10&phoneBrand=Xiaomi&phoneVersion=MI+8&displayMetrics=1080 * 2115&cpu=AArch64 Processor rev 13 (aarch64)&net=wifi&sVersionName=v4.7.2.0&plNo=133
charset: UTF-8
referer: [url=https://daoju.qq.com/index.shtml]https://daoju.qq.com/index.shtml[/url]
content-type: application/x-www-form-urlencoded
content-length: 910
accept-encoding: gzip
cookie: djc_appSource=android; djc_appVersion=148; acctype=qc; appid=1101958653; openid=8C571443167953BCC67294D143B97FDA; access_token=1348438E26324A8A76C19222FF57A062

djcRequestId=5d73310d28a1a02929aea12667e64edb0dd356c592261249d47bf75e134efe2a-1709772046351-874&appVersion=148&sign_version=1.0&ch=10010&iActivityId=11117&sDjcSign=0ff184ac0b2b6b7c0ee76f7daf9c4f6bbafd7d1610d58eee92add748bd1af18e644ba8d2766393017c928e0f1193d19b8c5d7d08c2a6071e229c2a62cd8b0434ec5b0d068b9f0cbe880fb74580408632eb2f28f5daec685aa37d7685fd5b2cfb42bea5615d86396c9f128096292b10e4ad5077caaa6bd1642d03ebb5f1e8f9e9b982ec96415d24b335a73f5ad09d4859fb6af45b404e71db7a4fbda9e0a49862192a35935cdbab75612eea8707dafb2f2380f3e2a5e67587f162b2bb3456ca00a63c4b12c47d7ad59914d3910d4f83ca6462d48a4030a66ac695255d5f6de1bc2077383ec6bbe00f52f7a881365977228658401a0f256417b04e7785d258b1ee&sDeviceID=5d73310d28a1a02929aea12667e64edb0dd356c592261249d47bf75e134efe2a&p_tk=1713520954&month=202403&osVersion=Android-29&iFlowId=96939&sVersionName=v4.7.2.0&sServiceDepartment=djc&sServiceType=dj&appSource=android&g_tk=1842395457
```

返回结果

[Java] *纯文本查看*

```
{
        "flowRet": {
                "iRet": "0",
                "sMsg": "MODULE OK",
                "iAlertSerial": "0",
                "sLogSerialNum": "AMS-DJ-0307084047-hYkHMd-11117-96939"
        },
        "modRet": {
                "msg": "\u7b7e\u5230\u6210\u529f",
                "sMsg": "\u7b7e\u5230\u6210\u529f",
                "action_id": "7932",
                "ret": "0",
                "iRet": "0"
        },
        "ret": "0",
        "msg": ""
}
```

![](https://attach.52pojie.cn/forum/202403/07/102320vfsfe9n940ece6s0.png)

我们看这个包吧。先看post body

[Java] *纯文本查看*

```
djcRequestId=5d73310d28a1a02929aea12667e64edb0dd356c592261249d47bf75e134efe2a-1709772046351-874
&appVersion=148
&sign_version=1.0
&ch=10010
&iActivityId=11117
&sDjcSign=0ff184ac0b2b6b7c0ee76f7daf9c4f6bbafd7d1610d58eee92add748bd1af18e644ba8d2766393017c928e0f1193d19b8c5d7d08c2a6071e229c2a62cd8b0434ec5b0d068b9f0cbe880fb74580408632eb2f28f5daec685aa37d7685fd5b2cfb42bea5615d86396c9f128096292b10e4ad5077caaa6bd1642d03ebb5f1e8f9e9b982ec96415d24b335a73f5ad09d4859fb6af45b404e71db7a4fbda9e0a49862192a35935cdbab75612eea8707dafb2f2380f3e2a5e67587f162b2bb3456ca00a63c4b12c47d7ad59914d3910d4f83ca6462d48a4030a66ac695255d5f6de1bc2077383ec6bbe00f52f7a881365977228658401a0f256417b04e7785d258b1ee
&sDeviceID=5d73310d28a1a02929aea12667e64edb0dd356c592261249d47bf75e134efe2a
&p_tk=1713520954
&month=202403
&osVersion=Android-29
&iFlowId=96939
&sVersionName=v4.7.2.0
&sServiceDepartment=djc
&sServiceType=dj
&appSource=android
&g_tk=1842395457
```

djcRequestId：这个我们不就发现这不就是AES加密的时候那个参数么。在外面拼接一下Openid在做一层RSA不就得到sDjcSign。剩下的参数p\_tk同样也是根据openid还有access\_token得来的，我们要是想实现签到，那就先抓包，得到openid，access\_token，p\_tk。好像这几个有效期是三个月。再看url中的参数

[Java] *纯文本查看*

```
/ams/ame/amesvr?ameVersion=0.3
&sServiceType=dj
&iActivityId=11117
&sServiceDepartment=djc
&set_info=newterminals
&&appSource=android
&appVersion=148
&ch=10010
&sDeviceID=5d73310d28a1a02929aea12667e64edb0dd356c592261249d47bf75e134efe2a
&osVersion=Android-29
&p_tk=1713520954
&sVersionName=v4.7.2.0
```

url中没有什么特别的参数，就是p\_tk要跟post body中一致
终于到了最后一步，签到代码

[Java] *纯文本查看*

```
public class test {
    private static PublicKey RSA() {
        String baseDir = System.getProperty("user.dir");
        byte[] bArr;
        Exception e;
        try {
            InputStream open = new FileInputStream(baseDir + "\\djc_rsa_public_key_new.der");
            try {
                bArr = new byte[open.available()];
                do {
                    try {
                    } catch (Exception e2) {
                        e = e2;
                        System.out.println("Got exception while is -> bytearr conversion: " + e);
                        return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(bArr));
                    }
                } while (open.read(bArr) != -1);
            } catch (Exception e3) {
                e = e3;
                bArr = null;
            }
            return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(bArr));
        } catch (Exception e4) {
            System.out.println("cuole");
            return null;
        }
    }

    public static byte[] AES(String str, String str2) throws Exception {
        if (str == null) {
            return null;
        }
        Cipher instance = Cipher.getInstance("AES/ECB/PKCS5Padding");
        instance.init(1, new SecretKeySpec(str2.getBytes(StandardCharsets.UTF_8), "AES"));
        return instance.doFinal(str.getBytes(StandardCharsets.UTF_8));
    }

    public static byte[] toRSA(byte[] bArr) throws Exception {
        Cipher instance = Cipher.getInstance("RSA/ECB/PKCS1Padding");
        instance.init(1, RSA());
        return instance.doFinal(bArr);
    }
    public static String bytesToHex(byte[] bytes) {
        StringBuilder buf = new StringBuilder(bytes.length * 2);
        for(byte b : bytes) { // 使用String的format方法进行转换
            buf.append(String.format("%02x", Integer.valueOf(b & 0xff)));
        }

        return buf.toString();
    }
    public static String sendPost() {
//        获取年月
        Calendar instance = Calendar.getInstance();
        String year = String.valueOf(instance.get(Calendar.YEAR));
        int month = instance.get(Calendar.MONTH) + 1;
        String months = "";
        if (month<=9){
            months = "0" + month;
        }
        String months1 = String.valueOf(year + months);
        PrintWriter out = null;
        BufferedReader in = null;
        String result = "";
        try {
            String time = String.valueOf(System.currentTimeMillis());
            URL realUrl = new URL("https://comm.ams.game.qq.com/ams/ame/amesvr?ameVersion=0.3&sServiceType=dj&iActivityId=11117&sServiceDepartment=djc&set_info=newterminals&w_ver=20&w_id=149&appSource=android&appVersion=148&ch=10010&sDeviceID=36faffea6eade625598fd1074a63f01d4bdf26e4d42a62689277877f55428e0b&osVersion=Android-29&p_tk=" + p_tk +"&sVersionName=v4.7.2.0");
            // 打开和URL之间的连接
            URLConnection conn = realUrl.openConnection();
            // 设置通用的请求属性
            conn.setRequestProperty("user-agent", "TencentDaojucheng=v4.7.2.0&appSource=android&appVersion=148&ch=10010&sDeviceID=36faffea6eade625598fd1074a63f01d4bdf26e4d42a62689277877f55428e0b&firmwareVersion=10&phoneBrand=Xiaomi&phoneVersion=MI+8&displayMetrics=1080 * 2029&cpu=AArch64 Processor rev 13 (aarch64)&net=wifi&sVersionName=v4.7.2.0&plNo=133");
            conn.setRequestProperty("charset", "UTF-8");
            conn.setRequestProperty("content-type", "application/x-www-form-urlencoded");
            conn.setRequestProperty("cookie", "djc_appSource=android; djc_appVersion=148; acctype=qc; appid=1101958653; " + open_access);
            // 发送POST请求必须设置如下两行
            conn.setDoOutput(true);
            conn.setDoInput(true);
            // 获取URLConnection对象对应的输出流
            out = new PrintWriter(conn.getOutputStream());
            // 发送请求参数
            String param ="djcRequestId=36faffea6eade625598fd1074a63f01d4bdf26e4d42a62689277877f55428e0b-"+time+"-"+new Random().nextInt(1000)+"&appVersion=148&sign_version=1.0&ch=10010&iActivityId=11117&sDjcSign=" + bytesToHex3(toRSA(AES(openid + "+36faffea6eade625598fd1074a63f01d4bdf26e4d42a62689277877f55428e0b+" + time + "+" + new Random().nextInt(1000),"se35d32s63r7m23m"))) + "&sDeviceID=36faffea6eade625598fd1074a63f01d4bdf26e4d42a62689277877f55428e0b&p_tk=" + p_tk + "&month=" + months1 +"&osVersion=Android-29&iFlowId=96939&sVersionName=v4.7.2.0&sServiceDepartment=djc&sServiceType=dj&appSource=android&g_tk=1842395457";
//            System.out.println(param);
            out.print(param);
            // flush输出流的缓冲
            out.flush();
            // 定义BufferedReader输入流来读取URL的响应
            in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            String line;
            while ((line = in.readLine()) != null) {
                result += line;
            }
        } catch (Exception e) {
            System.out.println("发送 POST 请求出现异常！"+e);
            e.printStackTrace();
        }
        //使用finally块来关闭输出流、输入流
        finally{
            try{
                if(out!=null){
                    out.close();
                }
                if(in!=null){
                    in.close();
                }
            }
            catch(IOException ex){
                ex.printStackTrace();
            }
        }
        return result;
    }
    public static String unicodeDecode(String string) {
        Pattern pattern = Pattern.compile("(\\\\u(\\p{XDigit}{4}))");
        Matcher matcher = pattern.matcher(string);
        char ch;
        while (matcher.find()) {
            ch = (char) Integer.parseInt(matcher.group(2), 16);
            string = string.replace(matcher.group(1), ch + "");
        }
        return string;
    }

    public static void main(){
         System.out.println(unicodeDecode(sendPost()));
    }
}
```

![](https://attach.52pojie.cn/forum/202403/07/102346hkr5ggnue8gnnsh5.png)

我今天已经签到过了，所以提示签到过了，剩下的请求都是一样的，就是体力活搬砖，这个app没有涉及到so，没有涉及到抓包检测，反调试也没有，加密也不是那么难，很适合练手啊。
