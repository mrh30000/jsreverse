# 实战某东APP submit 过程中的 jwData 加密 并附java简单算法实现

> **作者**: anliou | **发布时间**: 2021-01-16 12:30:00 | **版块**: 『移动安全区』 | **查看/回复**: 9046 / 26
> **原文**: [https://www.52pojie.cn/thread-1352135-1-1.html](https://www.52pojie.cn/thread-1352135-1-1.html)

---

起因：
最近seckill貌似很火，不过看分享的大多是 网页版，所以想着分析下app看能否实现，在某东app 抓包过程中发现 submitOrder 过程中有一处加密是 jwData ，现在简单的进行定位分析，

![](https://attach.52pojie.cn/forum/202101/16/121514d4vy3jzyyyphpdep.png)

看加密格式，明显是 base64编码过后的，现在先定位下关键字

![](https://attach.52pojie.cn/forum/202101/16/121713b65xc52iz5ns6vcn.png)

![](https://attach.52pojie.cn/forum/202101/16/121853kse57mkersksjndl.png)

定位到拼接明文的地方，格式是 lng + "\_" + lat + "\_" + networkType + "\_null"   之后再传入下层处理

![](https://attach.52pojie.cn/forum/202101/16/122114fqvvdxewxfeew4be.png)

可以看到加密算法应该就是 Des了  上面一串应该是秘钥，继续进入下一层

![](https://attach.52pojie.cn/forum/202101/16/122429l9wtkduxzz9duyd9.png)

定位到这里基本都清楚了，明文秘钥以及IV  最终自己使用Java进行简单实现：

[Java] *纯文本查看*

```
private static final String DES = "DESede";
public static final byte[] IV_BYTES = {0, 0, 0, 0, 0, 0, 0, 0};
private static final String PADDING = "DESede/CBC/PKCS5Padding";

public static byte[] encrypt(byte[] bArr, byte[] bArr2, byte[] bArr3) throws Exception {
if (bArr3 == null) {
bArr3 = IV_BYTES;
}
SecretKey generateSecret = SecretKeyFactory.getInstance(DES).generateSecret(new DESedeKeySpec(bArr2));
IvParameterSpec ivParameterSpec = new IvParameterSpec(bArr3);
Cipher instance = Cipher.getInstance(PADDING);
instance.init(1, generateSecret, ivParameterSpec);
return instance.doFinal(bArr);
}
```

![](https://attach.52pojie.cn/forum/202101/16/122613orhhaaok6akk25ia.png)

结果是：0ZFXGMj9AdZz/7Lh5gug5gJcT8vKYzxULXnWwrYlh8Q=  和 抓包得到的 jwData一致，至此，完美搞定此加密参数

首发：吾爱
