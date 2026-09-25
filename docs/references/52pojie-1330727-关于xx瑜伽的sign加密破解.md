# 关于xx瑜伽的sign加密破解

> **作者**: 北美大鱼 | **发布时间**: 2020-12-16 16:42:00 | **版块**: 『移动安全区』 | **查看/回复**: 2140 / 3
> **原文**: [https://www.52pojie.cn/thread-1330727-1-1.html](https://www.52pojie.cn/thread-1330727-1-1.html)

---

我在对于这个软件进行逆向希望能够获得sign加密方式，以爬取一些评论进行研究。我获得了加密方式，但是生成的码与原本的码基本不一样，请问有大佬可以解惑吗？

package com.zhouyou.http.interceptor;

import android.text.TextUtils;
import com.adjust.sdk.Constants;
import com.google.b.a.a.a.a.a;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map.Entry;
import java.util.TimeZone;

public class CustomSignInterceptor extends BaseDynamicInterceptor<CustomSignInterceptor> {
private static final String GOOGLEKEY = "AIzaSyBJvlD3dqnz42r9obhEClc2dEJAdXt9IK8";
private static final String SIGNKEY = "signkey";
private static final String SIGNKEYVALUE = "2f57cc785fa56cff2449de2938f2dec2";

```
private String formatOffset(int i) {
    int i2 = i / Constants.ONE_HOUR;
    float f = (float) ((i % Constants.ONE_HOUR) / 60000);
    if (f < 0.0f) {
        f *= -1.0f;
    }
    return i2 + "." + ((int) ((f / 60.0f) * 100.0f));
}

private String getTimeZone() {
    try {
        TimeZone timeZone = Calendar.getInstance().getTimeZone();
        boolean inDaylightTime = timeZone.inDaylightTime(new Date());
        StringBuilder stringBuilder = new StringBuilder();
        stringBuilder.append(formatOffset((inDaylightTime ? timeZone.getDSTSavings() : 0) + timeZone.getRawOffset()));
        return stringBuilder.toString();
    } catch (Throwable e) {
        a.a(e);
        return "";
    }
}

private LinkedHashMap<String, String> orderHashMapByOldMap(LinkedHashMap<String, String> linkedHashMap) {
    ArrayList arrayList = new ArrayList();
    for (Entry key : linkedHashMap.entrySet()) {
        arrayList.add(key.getKey());
    }
    Collections.sort(arrayList);
    LinkedHashMap<String, String> linkedHashMap2 = new LinkedHashMap();
    int i = 0;
    while (true) {
        int i2 = i;
        if (i2 >= arrayList.size()) {
            return linkedHashMap2;
        }
        String str = (String) arrayList.get(i2);
        String str2 = (String) linkedHashMap.get(str);
        if (!(str.equals("device_model") || str.equals("Country") || str.equals("keyword"))) {
            linkedHashMap2.put(str, str2);
        }
        i = i2 + 1;
    }
}

private String sign(LinkedHashMap<String, String> linkedHashMap) {
    try {
        LinkedHashMap orderHashMapByOldMap = orderHashMapByOldMap(linkedHashMap);
        StringBuilder stringBuilder = new StringBuilder();
        for (Entry entry : orderHashMapByOldMap.entrySet()) {
            stringBuilder.append(((String) entry.getKey()) + "=" + ((String) entry.getValue())).append("&");
        }
        stringBuilder.append("signkey=2f57cc785fa56cff2449de2938f2dec2");
        return strToMD5(stringBuilder.toString());
    } catch (Throwable e) {
        a.a(e);
        return "";
    }
}

private String strToMD5(String str) {
    try {
        byte[] digest = MessageDigest.getInstance(Constants.MD5).digest(str.getBytes("UTF-8"));
        StringBuilder stringBuilder = new StringBuilder(digest.length * 2);
        for (byte b : digest) {
            if ((b & 255) < 16) {
                stringBuilder.append("0");
            }
            stringBuilder.append(Integer.toHexString(b & 255));
        }
        return stringBuilder.toString();
    } catch (Throwable e) {
        a.a(e);
        return null;
    } catch (Throwable e2) {
        a.a(e2);
        return null;
    }
}

public LinkedHashMap<String, String> dynamic(LinkedHashMap<String, String> linkedHashMap) {
    String str = (String) linkedHashMap.get("key");
    if (TextUtils.isEmpty(str) || !str.equals(GOOGLEKEY)) {
        if (isTimeStamp()) {
            linkedHashMap.put("time", String.valueOf(System.currentTimeMillis() / 1000));
            linkedHashMap.put("timezone", getTimeZone());
        }
        if (isSign()) {
            linkedHashMap.put("sign", sign(linkedHashMap));
        }
    }
    return linkedHashMap;
}
```

}

这是我逆向的加密方式，但是我根据这个对于加密法方式再次编写了一个程式，但是结果却完全不同。我通过fiddler获取到了url，对于这个url之前的        params = {"sid": "dc696f42279aa88fd57786383fdf2f64",
                  "uid": "126740757", "deviceId": "3fc3ae5e2d21d1233577139567462403fc3ae5e2d21d123", "type": "1",
                  "channel": "100004", "channels": "100004", "version": "8.3.0.4",
                  "dyei": "177B1013089E6CE8C2D6065826DAA58BFB3FECD03B5B2F424CF65F1A3231899B", "c\_width": "810",
                  "c\_height": "1440", "c\_network": "WiFi", "c\_model": "MuMu", "os\_version": "6.0.1",
                  "android\_id": "3fc3ae5e2d21d123", "c\_brand": "Android", "partner\_list\_page": "1",
                  "partner\_list\_size": "20", "time": "1607603296", "timezone": "8.0",
                  # "sign": "dbd1b4561c1db5a332fafaaef3a5d05f"}
                  "sign":"dbd1b4561c1db5a332fafaaef3a5d05f"}
参数进行计算，获得的结果却完全不同。请问这个可能是什么原因？
