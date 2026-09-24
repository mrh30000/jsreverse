# 【吾爱首发】“CCTV手机电视” APP请求直播源地址分析

> **作者**: 1595901624 | **发布时间**: 2021-02-27 23:31:00 | **版块**: 『移动安全区』 | **查看/回复**: 19984 / 58
> **原文**: [https://www.52pojie.cn/thread-1379263-1-1.html](https://www.52pojie.cn/thread-1379263-1-1.html)

---

*本帖最后由 1595901624 于 2021-2-28 09:14 编辑*

##### 0x00 开篇

2021-02-28 更新
刚开始发了三篇文章，现在已经合并为一篇

【CCTV手机电视】是一款可以在线观看电视的APP，拥有100个左右的频道。这篇文章将分析CCTV手机电视获取直播链接的请求过程以及加密方法。文章比较长，文笔也不是很好，大家见谅。APP 是爱加密加固，这篇文章不分析脱壳，只进行主要的请求体构造分析。**最后声明，我不会公开所有的加密，避免有不法份子随意使用该接口，请大家见谅**。

文章分析使用的手机是Android手机，所有的请求以Android为例。部分请求参数会有iOS对比。

好多坛友不清楚这个软件的情况，图标长这样：

![](https://gitee.com/haoyu3/photo_gallery/raw/master/52pojie/icon.jpg)

app长这样，APP是央视网全资子公司开发的，各频道基本都是秒开：

![](https://gitee.com/haoyu3/photo_gallery/raw/master/52pojie/app.jpg)

**转载请注明出处**

通过抓包分析，咱们可以看到主要的请求链接如下(POST方法请求)：

```
http://m.cctv4g.com/cntv/clt/programAuthAndGetPlayUrl.msp
```

具体请求头和请求体如下：

![request_header](https://gitee.com/haoyu3/photo_gallery/raw/master/52pojie/request_header.jpg)

![request_param](https://gitee.com/haoyu3/photo_gallery/raw/master/52pojie/request_param.jpg)

可以看到主要请求头有5个，请求体有20多个。

响应体如下：

![response](https://gitee.com/haoyu3/photo_gallery/raw/master/52pojie/response.jpg)

很明显，即使接口请求成功，发现playUrl也被加密了。。。接下来每一小节都会分析一个类。

##### 0x01 解密 SecretUtils

该类是请求时生成header和post params时使用。源码如下：

```
public class SecretUtils {
    private static final String UA_DES_KEY = "&*UJyu";
    private static final String VIDEO_HTTP_PARMAS_PRIVATE_KEY = "72116A";
    private static final String VIDEO_HTTP_PARMAS_PUBLIC_KEY = "cn";
    private static final String VIDEO_HTTP_URL_AES_KEY = "yich";

    public static String getParmasEasyPrivateKey() {
        Context appContext = YCTXApplication.getAppContext();
        return "72116AcB!94C" + appContext.getString(C1075R.string.player_http_secret_http_parmas_easy_private_key) + JNIUtils.oneFromJNI(appContext);
    }

    public static String getParmasEasyPublicKey() {
        Context appContext = YCTXApplication.getAppContext();
        return "cntv" + appContext.getString(C1075R.string.player_http_secret_http_parmas_easy_public_key) + JNIUtils.twoFromJNI(appContext);
    }

    /**
    * BuildConfig.UADES_KEY
    * public static final String UADES_KEY = "$#SD&*";
    */
    public static String getUaDesUaKey() {
        Context appContext = YCTXApplication.getAppContext();
        return UA_DES_KEY + appContext.getString(C1075R.string.player_http_secret_header_des_key) + BuildConfig.UADES_KEY + JNIUtils.threeFromJNI(appContext);
    }

    public static String getHeaderAesKey() {
        Context appContext = YCTXApplication.getAppContext();
        return "yichengt" + appContext.getString(C1075R.string.player_http_secret_video_url_aes_key) + JNIUtils.fourFromJNI(appContext);
    }
}
```

反编译源码如上所示：

1. 资源文件获取

上面的方法中需要用到string资源文件

![1614351320335](https://gitee.com/haoyu3/photo_gallery/raw/master/52pojie/string.png)

R.string.player\_http\_secret\_http\_parmas\_easy\_private\_key = 4\*4F89

R.string.player\_http\_secret\_http\_parmas\_easy\_public\_key = 20

R.string.player\_http\_secret\_header\_des\_key = i23DR%

R.string.player\_http\_secret\_video\_url\_aes\_key = ianx

2. so文件解密

要知道结果还需要so文件解密，one，two，three，four的方法如下图所示：

![so_one](https://gitee.com/haoyu3/photo_gallery/raw/master/52pojie/so_one.png)

![so_two](https://gitee.com/haoyu3/photo_gallery/raw/master/52pojie/so_two.png)

![so_three](https://gitee.com/haoyu3/photo_gallery/raw/master/52pojie/so_three.png)

![so_four](https://gitee.com/haoyu3/photo_gallery/raw/master/52pojie/so_four.png)

j\_a和j\_b方法，点进去发现只起到一个校验app签名的作用，我就不过多解释了。其实看到return也会发现，j\_a，j\_b根本不需要分析。刚开始分析时耽误了点儿时间。

3. 结果

因此得到如下结果：

getParmasEasyPrivateKey() = 72116AcB!94C4\*4F89#k76BdB

getParmasEasyPublicKey() = cntv201812

getUaDesUaKey() = &\*UJyui23DR%$#SD&\*56HJ3!

getHeaderAesKey() = yichengtianxia12

##### 0x02 分析 PhoneNetInfoUtils

该类用例获取当前网络状态，请求时生成header和post param时使用。**关键**源码如下：

* getMarketId

该方法主要用例获取友盟的channel，默认返回none，小米商店下载的则返回xiaomi。

```
private static final String MARKET_ID = "UMENG_CHANNEL";

public static String getMarketId(Context context) {
        String ret = "none";
        ApplicationInfo info = null;
        try {
            info = context.getPackageManager().getApplicationInfo(context.getPackageName(), 128);
        } catch (NameNotFoundException e) {
        }
        if (info.metaData != null) {
            ret = String.valueOf(info.metaData.get(MARKET_ID));
            if (TextUtils.isEmpty(ret)) {
                ret = "none";
            }
        }
        LogUtil.printStr("[getMarketId] ret:" + ret);
        return ret;
    }
```

* getAppVersion

该方法用来获取APP Version。现在解密的版本是3.5.3，因此将会返回3.5.3

```
    public static String getAppVersion(Context context) {
        try {
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            if (info == null) {
                return null;
            }
            String appVersion = info.versionName;
            if (TextUtils.isEmpty(appVersion)) {
                return "none";
            }
            return appVersion;
        } catch (NameNotFoundException e) {
            e.printStackTrace();
            return null;
        }
    }
```

* getAllNetworkType

以下几个方法，是用来获取网络类型的。最终会调用的方法是getAllNetworkType。

```
 public static int getConnectedTypeINT(Context context) {
        NetworkInfo net = getConnectivityManager(context).getActiveNetworkInfo();
        if (net == null) {
            return -1;
        }
        LogUtil.printStr("NetworkInfo: " + net.toString());
        return net.getType();
    }

/**
* 最终会调用的方法
*/
    public static String getAllNetworkType(Context context) {
        switch (getConnectedTypeINT(context)) {
            case 0:
            case 2:
            case 3:
            case 4:
            case 5:
                switch (getTelephonyManager(context).getNetworkType()) {
                    case 1:
                    case 2:
                    case 4:
                    case 7:
                    case 11:
                        return NetWorkType._2G.value;
                    case 3:
                    case 5:
                    case 6:
                    case 8:
                    case 9:
                    case 10:
                    case 12:
                    case 14:
                    case 15:
                        return NetWorkType._3G.value;
                    case 13:
                        return NetWorkType._4g.value;
                    default:
                        return NetWorkType.none.value;
                }
            case 1:
                return NetWorkType.Wifi.value;
            default:
                return NetWorkType.none.value;
        }
    }

/**
* 网络类型枚举
*/
    public enum NetWorkType {
        none("none"),
        Wifi(PhoneNetInfoUtils.WIFI),
        _2G(PhoneNetInfoUtils.G2),
        _3G(PhoneNetInfoUtils.G3),
        _4g(PhoneNetInfoUtils.G4);

        public String value;

        private NetWorkType(String value) {
            this.value = value;
        }
    }
    public static final String WIFI = "WIFI";

    public static final String G2 = "2G";

    public static final String G3 = "3G";

    public static final String G4 = "4G";
```

* getUUID

这个方法一目了然，获取UUID的，只是获取UUID之后保存了下，保存到SP的字段是userid（猜测以后可能会用到）。PS：我找到了这个文件看了下，已经被【爱加密】加密了，大家不用去看了。

```
public static final String SHARED_PREFERENCES_DATA_STATISTICS = "shared_preferences_data_statistics";

public static String getUUID(Context context) {
        SharedPreferences sp = context.getSharedPreferences(SHARED_PREFERENCES_DATA_STATISTICS, 0);
        String uuid = sp.getString("userid", null);
        if (uuid != null) {
            return uuid;
        }
        try {
            uuid = UUID.nameUUIDFromBytes((System.currentTimeMillis() + getRandom()).getBytes("UTF-8")).toString();
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        }
        if (TextUtils.isEmpty(uuid)) {
            return "none";
        }
        Editor editor = sp.edit();
        editor.putString("userid", uuid);
        editor.commit();
        return uuid;
    }

public static int getRandom() {
        return new Random().nextInt(1000);
    }
```

##### 0x03 分析 RequestParameter

感觉到这里还都比较简单，那咱们继续往下看看......希望不会太难~~

这个类也很简单，顾名思义，请求参数要用到，搞它。。完整源码如下：

```
public class RequestParameter {
    public static String OTHER_PARAMS;
    public static String PARAMS;
    public static Map PostParams = new HashMap();

    public static void initEnvironmentConfig(Context ctx) {
        String marketId = PhoneNetInfoUtils.getMarketId(ctx);
        String appVersion = PhoneNetInfoUtils.getAppVersion(ctx);
        String allNetworkType = PhoneNetInfoUtils.getAllNetworkType(ctx);
        String uuid = PhoneNetInfoUtils.getUUID(ctx);
        String channel = ctx.getResources().getString(C1075R.string.channel_name);
        PARAMS = ("?wdChannelName=" + marketId) + ("&wdVersionName=" + appVersion) + "&wdClientType=1" + "&wdAppId=3" + ("&wdNetType=" + allNetworkType) + ("&uuid=" + uuid) + ("&channel=" + channel);
        PostParams.put(PostParameter.CHANNELNAME, marketId);
        PostParams.put(PostParameter.VERSIONNAME, appVersion);
        PostParams.put("wdClientType", "1");
        PostParams.put(PostParameter.APPID, "3");
        PostParams.put(PostParameter.NETTYPE, allNetworkType);
        PostParams.put(PostParameter.UUID, uuid);
        PostParams.put("channel", channel);
        OTHER_PARAMS = ("&wdChannelName=" + marketId) + ("&wdVersionName=" + appVersion) + "&wdClientType=1" + "&wdAppId=3" + ("&wdNetType=" + allNetworkType) + ("&uuid=" + uuid) + ("&channel=" + channel);
    }
}
```

这个类中的变量都是静态公开公共的，后面会用到PostParams。（PS：变量起名不是很规范~~）那就分析这个PostParams吧，还记得咱们在第二节分析过`PhoneNetInfoUtils`，其实就是为它做铺垫。

先做个假设：现在是小米应用商店下载的`CCTV手机电视`,版本为`3.5.3`,且访问网络为`WiFi`。则将会有如下的结果：

marketId = xiaomi

appVersion = 3.5.3

allNetworkType = WiFi

uuid = 3709dd1f-1560-3745-896d-8503f7560487（随便生成了一个，IOS字母全大写）

channel = cctv （资源文件写死的，IOS同样也是cctv）

**PARAMS =?wdChannelName=xiaomi&wdVersionName=3.5.3&wdClientType=1&wdAppId=3&wdNetType=WiFi&uuid=3709dd1f-1560-3745-896d-8503f7560487&channel=cctv**

**OTHER\_PARAMS=&wdChannelName=xiaomi&wdVersionName=3.5.3&wdClientType=1&wdAppId=3&wdNetType=WiFi&uuid=3709dd1f-1560-3745-896d-8503f7560487&channel=cctv**

注：①上面的字段，如果是IOS，wdClientType=2

②PARAMS 和OTHER\_PARAMS的区别在于第一个符号不同，PARAMS 是？，OTHER\_PARAMS是&。

最后来看PostParams

中间插个源码，`PostParameter`接口类仅仅是变量声明。

```
public interface PostParameter {
        public static final String APPID = "wdAppId";
        public static final String APPOINTMENTTIME = "appointmentTime";
        public static final String APTID = "aptid";
        public static final String CHANNEL = "channel";
        public static final String CHANNELNAME = "wdChannelName";
        public static final String CLIENTID = "clientId";
        public static final String CLIENTINFO = "wdClientInfo";
        public static final String CLIENTTYPE = "wdClientType";
        public static final String CONTNAME = "contName";
        public static final String CREATETIME = "createTime";
        public static final String ENDTIME = "endTime";
        public static final String IMAGEURL = "imageurl";
        public static final String INFOLIST = "InfoList";
        public static final String NETTYPE = "wdNetType";
        public static final String OBJECTID = "objectId";
        public static final String OBJECTTYPE = "objectType";
        public static final String PUSH_PROVIDER = "pushProvider";
        public static final String TOKEN = "wdToken";
        public static final String UUID = "uuid";
        public static final String VERSIONNAME = "wdVersionName";
    }
```

真正的PostParams如下：

```
PostParams.put("wdChannelName", "xiaomi");
PostParams.put("wdVersionName", "3.5.3");
PostParams.put("wdClientType", "1");
PostParams.put("wdAppId", "3");
PostParams.put("wdNetType", "WiFi");
PostParams.put("uuid", "3709dd1f-1560-3745-896d-8503f7560487");
PostParams.put("channel", "cctv");
```

RequestParameter分析结束。

##### 0x04 分析 DES3 （DES加密）

这个文件没啥好分析的，就是单纯的DES加密，只是默认的DES加密key是咱们在第一节中提到的 getUaDesUaKey() = `&*UJyui23DR%56HJ3!`。当然，加密后肯定还要加一层base64咯。

我就不浪费时间了，直接上我修复过的代码吧，代码如下（需要Java 8及以上版本，Java 8以下版本自行修复base64编码）：

```
public class DES3 {
        private static final String Algorithm = "DESede";
        public static final String DES_KEY = "&*UJyui23DR%$#SD&*56HJ2!";
        private static final String TAG = "DES3";
        static final byte[] keyBytes = DES_KEY.getBytes();

    // getUaDesUaKey()
        private static final String UA_DES_KEY = "&*UJyui23DR%$#SD&*56HJ3!";

        public static String encryptMode(String src) {
                try {
                        SecretKey deskey = new SecretKeySpec(UA_DES_KEY.getBytes(), Algorithm);
                        Cipher c1 = Cipher.getInstance(Algorithm);
                        c1.init(1, deskey);
                        return byte2data(c1.doFinal(src.getBytes()));
                } catch (NoSuchAlgorithmException e1) {
                        e1.printStackTrace();
                } catch (NoSuchPaddingException e2) {
                        e2.printStackTrace();
                } catch (Exception e3) {
                        e3.printStackTrace();
                }
                return null;
        }

        public static String encryptMode(String src, String privateKey) {
                try {
                        SecretKey deskey = new SecretKeySpec(privateKey.getBytes(), Algorithm);
                        Cipher c1 = Cipher.getInstance(Algorithm);
                        c1.init(1, deskey);
                        return byte2data(c1.doFinal(src.getBytes()));
                } catch (NoSuchAlgorithmException e1) {
                        e1.printStackTrace();
                } catch (NoSuchPaddingException e2) {
                        e2.printStackTrace();
                } catch (Exception e3) {
                        e3.printStackTrace();
                }
                return null;
        }

        private static String byte2data(byte[] bytes) {
                return new String(Base64.getEncoder().encode(bytes));
        }

        public static String decryptMode(String src) {
                try {
                        SecretKey deskey = new SecretKeySpec(UA_DES_KEY.getBytes(), Algorithm);
                        Cipher c1 = Cipher.getInstance(Algorithm);
                        c1.init(2, deskey);
                        return new String(c1.doFinal(data2byte(src)));
                } catch (NoSuchAlgorithmException e1) {
                        e1.printStackTrace();
                } catch (NoSuchPaddingException e2) {
                        e2.printStackTrace();
                } catch (Exception e3) {
                        e3.printStackTrace();
                }
                return null;
        }

        public static String decryptMode(String src, String privateKey) {
                try {
                        SecretKey deskey = new SecretKeySpec(privateKey.getBytes(), Algorithm);
                        Cipher c1 = Cipher.getInstance(Algorithm);
                        c1.init(2, deskey);
                        return new String(c1.doFinal(data2byte(src)));
                } catch (NoSuchAlgorithmException e1) {
                        e1.printStackTrace();
                } catch (NoSuchPaddingException e2) {
                        e2.printStackTrace();
                } catch (Exception e3) {
                        e3.printStackTrace();
                }
                return null;
        }

        private static byte[] data2byte(String data) throws IOException {
                return Base64.getDecoder().decode(data.getBytes());
        }

        public static String byte2hex(byte[] b) {
                String hs = "";
                String stmp = "";
                for (int n = 0; n < b.length; n++) {
                        stmp = Integer.toHexString(b[n] & 255);
                        if (stmp.length() == 1) {
                                hs = hs + "0" + stmp;
                        } else {
                                hs = hs + stmp;
                        }
                        if (n < b.length - 1) {
                                hs = hs + ":";
                        }
                }
                return hs.toUpperCase();
        }
}
```

上面的代码我用的是Java 8自带的Base64编码包，如果是Android O（SDK 26）以上版本编译时没有问题。如果是低版本，我也不建议使用Android自带的base64编码（个人建议），建议使用`apache`的Base64编码。

##### 0x05 分析 EasyEncrypt

其实上面四个类的分析，最终都是为这个类来做铺垫的。这是一个加密解密工具类。这个类叫简单加密，加密算法确实常见，但是就是麻烦。

关键源码如下：

```
public class EasyEncrypt {
    private static String TAG = "EasyEncrypt";
    public static String TIMESTAMP;
    public static String USERID = "";
    public static String UUID;
    public static String WDNUMBER;
    private static String hexStr = "0123456789ABCDEF";
    private static Map mUAHeader = new HashMap();

    public static Map<String, String> getUaDesHeader() {
        return mUAHeader;
    }

    public static Map<String, String> addSecretParmas(Map<String, String> parmasMap) {
        if (parmasMap != null) {
            parmasMap.putAll(RequestParameter.PostParams);
            parmasMap.put("secretToken", getSecretToken());
            parmasMap.put("publickey", SecretUtils.getParmasEasyPublicKey());
            parmasMap.put("timestamp", TIMESTAMP);
            parmasMap.put("wdNumber", WDNUMBER);
            parmasMap.put(PostParameter.UUID, UUID);
            parmasMap.put("userId", USERID);
        }
        return parmasMap;
    }

    public static String getSecretToken() {
        Context appContext = YCTXApplication.getAppContext();
        TIMESTAMP = System.currentTimeMillis() + "";
        WDNUMBER = PhoneNetInfoUtils.getRandom() + "";
        UUID = PhoneNetInfoUtils.getUUID(appContext);
        int intTyPe = SPUtils.getIntTyPe(appContext, "userid");
        USERID = intTyPe != 0 ? intTyPe + "" : "";
        String secretToken = "timestamp=" + TIMESTAMP + "&wdVersionName=" + PhoneNetInfoUtils.getAppVersion(appContext) + "&wdChannelName=" + PhoneNetInfoUtils.getMarketId(appContext) + "&wdClientType=" + 1 + "&wdAppId=" + 3 + "&publickey=" + SecretUtils.getParmasEasyPublicKey() + "&wdNumber=" + WDNUMBER + "&uuid=" + UUID + "&userId=" + USERID;
        String desSecret = DES3.encryptMode(secretToken);
        mUAHeader.clear();
        mUAHeader.put("Play-Ua", desSecret);
        mUAHeader.put("Content-Type", HttpRequest.CONTENT_TYPE);
        String hmacMd5Str = HMacMD5.getHmacMd5Str(SecretUtils.getParmasEasyPrivateKey(), secretToken);
        LogUtil.printlnv(TAG, "加密前 :  " + secretToken);
        LogUtil.printlnv(TAG, "加密后 :  " + hmacMd5Str);
        return hmacMd5Str;
    }
```

看几个关键的方法

* ## getSecretToken

```
public static String getSecretToken() {
        Context appContext = YCTXApplication.getAppContext();
        TIMESTAMP = System.currentTimeMillis() + "";
        WDNUMBER = PhoneNetInfoUtils.getRandom() + "";
        UUID = PhoneNetInfoUtils.getUUID(appContext);
        int intTyPe = SPUtils.getIntTyPe(appContext, "userid");
        USERID = intTyPe != 0 ? intTyPe + "" : "";
        String secretToken = "timestamp=" + TIMESTAMP + "&wdVersionName=" + PhoneNetInfoUtils.getAppVersion(appContext) + "&wdChannelName=" + PhoneNetInfoUtils.getMarketId(appContext) + "&wdClientType=" + 1 + "&wdAppId=" + 3 + "&publickey=" + SecretUtils.getParmasEasyPublicKey() + "&wdNumber=" + WDNUMBER + "&uuid=" + UUID + "&userId=" + USERID;
        String desSecret = DES3.encryptMode(secretToken);
        mUAHeader.clear();
        mUAHeader.put("Play-Ua", desSecret);
        mUAHeader.put("Content-Type", HttpRequest.CONTENT_TYPE);
        String hmacMd5Str = HMacMD5.getHmacMd5Str(SecretUtils.getParmasEasyPrivateKey(), secretToken);
        LogUtil.printlnv(TAG, "加密前 :  " + secretToken);
        LogUtil.printlnv(TAG, "加密后 :  " + hmacMd5Str);
        return hmacMd5Str;
    }
```

TIMESTAMP =1614387718000 （写这篇文档的时间）当前时间戳

WDNUMBER = 115（[0,1000)的整数随机数,见第二节，IOS可能是[0,1000000)）

UUID = 3709dd1f-1560-3745-896d-8503f7560487 （见第二节）

USERID = "" (暂且为空字符串吧，我还清楚有啥作用，没有深究,之后如果用到再说)

secretToken -> timestamp=1614387718000&wdVersionName=3.5.3&wdChannelName=xiaomi&wdClientType=1&wdAppId=3&publickey=cntv201812&wdNumber=115&uuid=3709dd1f-1560-3745-896d-8503f7560487&userId=

desSecret = V/1c7v9PQ8qM8jymc7FNCHPxXeXETxsw6qMvF617qTeLpBqWArVQp+a+CYAcR7FIjN4/SivHIvjjJXr56s6mwZCHENT5G0OddovSf/ZhGzPg3HV0/oiLJ9TL/Isi5GM4V+BNssZjY/GQJSPoifyo0hsRbFeuzKw5j1g/uJVDIA/TFQ8KnVC0wa96LVlI0JPRHUYNk/zrkBAYlpllvdK6xnguTWkgoW2WkNtlxgNbKHg=（经过DES加密后的数据）

那么mUAHeader中的Play-Ua就计算出来了

mUAHeader.put("Play-Ua", "V/1c7v9PQ8qM8jymc7FNCHPxXeXETxsw6qMvF617qTeLpBqWArVQp+a+CYAcR7FIjN4/SivHIvjjJXr56s6mwZCHENT5G0OddovSf/ZhGzPg3HV0/oiLJ9TL/Isi5GM4V+BNssZjY/GQJSPoifyo0hsRbFeuzKw5j1g/uJVDIA/TFQ8KnVC0wa96LVlI0JPRHUYNk/zrkBAYlpllvdK6xnguTWkgoW2WkNtlxgNbKHg=");

HttpRequest.CONTENT\_TYPE是静态变量

mUAHeader.put("Content-Type", "application/x-www-form-urlencoded");

hmacMd5Str = 2B918F2C881C7DD2F314B7D6B9DB5382

这里hmacMd5Str 的加密算法我也不分析了，就是secretToken警告HmacMD5加密的数值，加密key是第一节的getParmasEasyPrivateKey()=`72116AcB!94C4*4F89#k76BdB`。这个HmacMD5算法大家可以自行百度搜索了，在线加解密也有，源码也有，这里我也不放源码了。记得最后结果转大写哟~~

* ## addSecretParmas

经过上面一坨的分享，得到的secretToken，仅仅是这个方法的一个变量而已。

该方法的作用也显而易见，就是添加请求的Header。

```
    public static Map<String, String> addSecretParmas(Map<String, String> parmasMap) {
        if (parmasMap != null) {
            parmasMap.putAll(RequestParameter.PostParams);
            parmasMap.put("secretToken", getSecretToken());
            parmasMap.put("publickey", SecretUtils.getParmasEasyPublicKey());
            parmasMap.put("timestamp", TIMESTAMP);
            parmasMap.put("wdNumber", WDNUMBER);
            parmasMap.put(PostParameter.UUID, UUID);
            parmasMap.put("userId", USERID);
        }
        return parmasMap;
    }
```

parmasMap先把第三节的PostParams添加进去，然后parmasMap.put("secretToken", "2B918F2C881C7DD2F314B7D6B9DB5382");
parmasMap.put("publickey", "cntv2018");

parmasMap.put("timestamp", "1614387718000");

parmasMap.put("wdNumber", "115");
parmasMap.put("uuid", "3709dd1f-1560-3745-896d-8503f7560487");
parmasMap.put("userId", "");

##### 0x06 最终请求类 OkHttpApi

经过上面一系列的解密，终于来到最终的请求类。仅有上面的一堆字段还不够，请求头中还要增加Afas和Filter。为了APP的安全起见，我不会公开这俩字段的算法，此类我将不会公开和分析。

其实只有这些字段还是不够的，我们还需要请求频道的信息，频道的信息用到的字段有nodeId，programId，contId。在请求中，nodeId=9000000000 代表的是cctv1。在这里就不多讲解了。

分析结束，我们模拟下请求测试下：

![](https://gitee.com/haoyu3/photo_gallery/raw/master/52pojie/request_success.png)

请求结果：

```
{
    "resultMsg": "处理成功",
    "systemTime": "0001112223334",
    "vedioPlayUrls": [],
    "status": "01",
    "audioPlayUrls": [],
    "resultCode": "0000",
    "playUrls": [
        {
            "definition": "",
            "errorinfo": "",
            "isvideo": "",
            "overstep": "",
            "playurl": "vUMlVPNVGWHT0CCRmQWNYbQcrWP1ONBBvRTiPVtFWE4p72i0Es4G8wbSPBt/56nUYO0MbsMDGe9zZxxxxxQT0xz5Bxxom0OeNsH9c0WnckNcnNzxGqtY6Il+qVRzqf7WMRM5FRR3naiHva5egdBs8w==",
            "resultcode": "0"
        }
    ],
    "isMemberProgram": "false"
}
```

成功！！！还记得我们开篇说的，即使请求成功了，但是返回的playUrl结果还是加密的（上面的playUrl已经被我修改了几个字母）

##### 0x07 结语

**还望大家见谅，最终的解密PlayUrl的方法我也不会公开。**

原因如下：app脱壳后Afas和Filter字段，很容易计算出来，毕竟现在脱壳工具泛滥，拖个壳也不是很难。解密PlayUrl方法被爱加密抽走了，即使脱壳反编译成功也无法找到源码。最后只能透露下，文章中列举的加解密方法依然不能解密PlayUrl，PlayUrl是用另外的算法加密的~~

分析这个APP的时候，脱壳后发现源码竟然没有被混淆，这大大降低了逆向分析的门槛。最后建议APP官方先混淆后再用爱加密加壳吧~~

**转载请注明出处**

**转载请注明出处**

**转载请注明出处**
