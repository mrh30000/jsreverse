# Cocos2DX-JS 加密逆向探究解密app实战

> **作者**: xieqing520 | **发布时间**: 2021-01-30 16:26:00 | **版块**: 『移动安全区』 | **查看/回复**: 9158 / 8
> **原文**: [https://www.52pojie.cn/thread-1362276-1-1.html](https://www.52pojie.cn/thread-1362276-1-1.html)

---

**什么是Cocos2D?**

> cocos2d [1]  是一个基于MIT协议的开源框架，用于构建游戏、应用程序和其他图形界面交互应用。可以让你在创建自己的多平台游戏时节省很多的时间。
> Cocos2D也拥有几个主要版本，包括Cocos2D-iPhone、Cocos2D-X，以及被社区普遍看好的Cocos2D-HTML5和JavaScript bindings for Cocos2D-X。同时也拥有了非常优秀的编辑器（独立编辑器），例如SpriteSheet Editors、Particle Editors 、Font Editors 、 Tilemap Editors。
> 另外，2012年发布的CocoStudio工具集是开源游戏引擎Cocos2d-x开发团队官方推出的游戏开发工具，目前已经进入稳定版。CocoStudio吸取了他们自己在游戏制作中的经验，为移动游戏开发者和团队量身定做，旨在降低游戏开发的门槛，提高开发效率，同时也为Cocos2D-X的进一步发展打下基础。以上信息来自于百度百科。

**Cocos2D和Cocos2Dx主要区别?**

> cocos2d是OC写的bai，cocos2dx是c++写的
> cocos2d只能在duios下运行，cocos2dx是跨平台的，zhiios和android平台都可以dao运行
> cocos2d是外国人搞zhuan的，cocos2dx是中国人搞的。shu
> cocos2dx是cocos2d的C++写法，但是游戏架构是一样的，都包含了精灵，导演，场景，动作等概念，他们是一脉相承的东西。你可以直接研究cocos2dx，没有什么障碍。虽然是有了cocos2d才有的cocos2dx，但是cocos2dx包含了cocos2d的主要思想，因此可以直接研究cocos2dx。
>
> 以上采纳于百度回答

**研究目标以及环境工具介绍**

* IDA Pro 7.0      - -----  交互式反汇编器专业版（Interactive Disassembler Professional），人们常称其为IDA Pro，或简称为IDA。是目前最棒的一个静态反编译软件，为众多0day世界的成员和ShellCode安全分析人士不可缺少的利器！
* **Frida环境**
* > Frida是一款基于Python + JavaScript 的Hook框架，本质是一种动态插桩技术，可以用于Android、Windows、iOS等各大平台。由于是基于脚本的交互，因此相比xposed来说更加便捷。
  >
  > &#8203; frida与xposed对比：frida适用于全平台，xposed只能用于Android平台；frida可Hook java层和native层，而xposed只能Hook java层；frida通过编写js代码实现，xposed必须编写插件(类似写Android app)；
  >
  > &#8203; 动态插桩技术：在程序运行时实时地插入额外代码和数据，对可执行文件没有任何永久性的改变。

4.一台Root的手机，模拟器理论上也可以使用frida，本次实践没有尝试:rggrg
**优秀文章**

> 半夜逆向一个Cocos2D-JS做的棋牌App,解密Jsc拿下Authorization算法
> https://www.52pojie.cn/thread-1307664-1-1.html
> (出处: 吾爱[破解](https://www.52pojie.cn)论坛)

本想就着发扬伸手党的伟大精神直接拿，可惜作者并不讲解关键具体经过以及成品代码提供下载，对于刚入门或不了解IDA的朋友提供的帮助聊胜于无~~~

**开始实践**首先百度一番jsc逆向为js，万一有呢;www

![](https://attach.52pojie.cn/forum/202101/30/154545f92tmpi255hp8xhi.png)

事实上，百度有，还挺多，不过文章千篇一律，你抄我我抄你。
最后踩了不少坑才了解，那些文章工具逆向解密指的都是coco2d中源代码依附于字节码中，按官方给定的规律提取出来。
而在coco2dx版本中，这项被禁用了，也就是根本用不了。

阅读一下上面的文章 、或者去研究一下官方提供的SDK，可以知道coco2dx生成的jsc并不是真正意义上的编译出来的字节码，仅仅只是做了一层xxtea加密而已。
那么我们就需要去解密，从而得到源码。

**开始找秘钥**
将某三国游戏apk中的 armeabi-v7a 的 libcocos2djs.so 拖进 IDA PRo
（为什么要是armeabi-v7a中的呢？因为我的手机就是这个架构的 = =，每个人都看自己手机CPU架构信息然后去拖对应的SO）

。。。。。。
。。。。。

。。。。
。。。。
(电脑有点卡，还在一直加载读取中。。。。)

。。。。
。。。。
。。。
（有点无聊。。。）

。。。。。

打开了，我们首先研究JNI\_OnLoad 函数，这个是加载so必定经过的位置，说不定秘钥就在这个地方定义了，那我们不就不用干啥了吗 {:1\_918:}
使用伪代码查看

![](https://attach.52pojie.cn/forum/202101/30/160354puprzlwepenk26v5.png)

然后发现有个 cocos\_jni\_env\_init 函数，一层一层追进去

![](https://attach.52pojie.cn/forum/202101/30/160627egzcvmcsz0e8bkgw.png)

额，尴尬了，啥也没有，不过没关系，直接祭出大招。
搜索 decrypt 关键词，来搜索Function 函数 (英语不好的人可以百度 = = ，这个是解密的意思啦)

![](https://attach.52pojie.cn/forum/202101/30/161156ijbdj9jupvisvmic.png)

ok，很幸运 ，一下子就定位到关键位置。
然后我们打开查看

![](https://attach.52pojie.cn/forum/202101/30/161255ngfigdw9mbx8llxz.png)

记住一下，此处的地址为 0x006672F8，这个地址是相对于这个so来说的

通过上面的文章或者百度xxtea\_decrypt算法，可以知道，该函数的声明为

[C++] *纯文本查看*

```
uint8_t* data = xxtea_decrypt((uint8_t*)fileData.getBytes(), (uint32_t)fileData.getSize(), (uint8_t*)xxteaKey.c_str(), (uint32_t)xxteaKey.size(), &dataLen);
```

那么我们需要hook一下这个第三个参数，就可以直接获取到秘钥了~~~

let go

打开编辑器，编辑一下frida代码

[Python] *纯文本查看*

```
# -*- coding: utf-8 -*-
# adb forward tcp:27043 tcp:27043
# adb forward tcp:27042 tcp:27042
import frida
import sys

def on_message(message, data):
    if message["type"] == 'send':
        print(u"[*] {0}".format(message['payload']))
    else:
        print(message)

device = frida.get_remote_device()

pid = device.spawn(["xxxxx某游戏的包名"])
session = device.attach(pid)
device.resume(pid)

jscode = open('hook.js', 'r',encoding='utf-8').read()
script = session.create_script(jscode)
script.on("message", on_message)
script.load()
sys.stdin.read()

```

hook.js的代码为

[JavaScript] *纯文本查看*

```
setTimeout(function(){
    Java.perform(function(){
        var baseAddress = Module.findBaseAddress("libcocos2djs.so");
        send("libcocos2djs.so baseAddress is: "+baseAddress)

        Interceptor.attach(baseAddress.add(0x6672f8),{
            onEnter: function(args) {
                console.log("Param:"+args[2].readCString());
            },
            onLeave: function(retval){
            }
        });
    });
},100)
```

这里说一下，上面找到的地址是相对于so来说的  ，是相对地址，也可以说是so的偏移地址，那么只需要找到so的入口地址  + 相对地址   = 在内存中的即时真实地址

然后运行，查看控制台信息

![](https://attach.52pojie.cn/forum/202101/30/162114lc3143pihzckp1y1.png)

(⊙o⊙)…，好像出来了。。。。。。

解密试试看？

这里贴上一份XXTea的算法，java版本（挺恨上面的作者，竟然不分享，晚上找的好多都不完善不能用）

[Java] *纯文本查看*

```
package com.Test;

import java.io.UnsupportedEncodingException;

public final class XXTEA {

    private static final int DELTA = 0x9E3779B9;

    private static int MX(int sum, int y, int z, int p, int e, int[] k) {
        return (z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4) ^ (sum ^ y) + (k[p & 3 ^ e] ^ z);
    }

    private XXTEA() {}

    public static final byte[] encrypt(byte[] data, byte[] key) {
        if (data.length == 0) {
            return data;
        }
        return toByteArray(
                encrypt(toIntArray(data, true), toIntArray(fixKey(key), false)), false);
    }
    public static final byte[] encrypt(String data, byte[] key) {
        try {
            return encrypt(data.getBytes("UTF-8"), key);
        }
        catch (UnsupportedEncodingException e) {
            return null;
        }
    }
    public static final byte[] encrypt(byte[] data, String key) {
        try {
            return encrypt(data, key.getBytes("UTF-8"));
        }
        catch (UnsupportedEncodingException e) {
            return null;
        }
    }
    public static final byte[] encrypt(String data, String key) {
        try {
            return encrypt(data.getBytes("UTF-8"), key.getBytes("UTF-8"));
        }
        catch (UnsupportedEncodingException e) {
            return null;
        }
    }
    public static final String encryptToBase64String(byte[] data, byte[] key) {
        byte[] bytes = encrypt(data, key);
        if (bytes == null) return null;
        return Base64.encode(bytes);
    }
    public static final String encryptToBase64String(String data, byte[] key) {
        byte[] bytes = encrypt(data, key);
        if (bytes == null) return null;
        return Base64.encode(bytes);
    }
    public static final String encryptToBase64String(byte[] data, String key) {
        byte[] bytes = encrypt(data, key);
        if (bytes == null) return null;
        return Base64.encode(bytes);
    }
    public static final String encryptToBase64String(String data, String key) {
        byte[] bytes = encrypt(data, key);
        if (bytes == null) return null;
        return Base64.encode(bytes);
    }
    public static final byte[] decrypt(byte[] data, byte[] key) {
        if (data.length == 0) {
            return data;
        }
        return toByteArray(
                decrypt(toIntArray(data, false), toIntArray(fixKey(key), false)), true);
    }
    public static final byte[] decrypt(byte[] data, String key) {
        try {
            return decrypt(data, key.getBytes("UTF-8"));
        }
        catch (UnsupportedEncodingException e) {
            return null;
        }
    }
    public static final byte[] decryptBase64String(String data, byte[] key) {
        return decrypt(Base64.decode(data), key);
    }
    public static final byte[] decryptBase64String(String data, String key) {
        return decrypt(Base64.decode(data), key);
    }
    public static final String decryptToString(byte[] data, byte[] key) {
        try {
            byte[] bytes = decrypt(data, key);
            if (bytes == null) return null;
            return new String(bytes, "UTF-8");
        }
        catch (UnsupportedEncodingException ex) {
            return null;
        }
    }
    public static final String decryptToString(byte[] data, String key) {
        try {
            byte[] bytes = decrypt(data, key);
            if (bytes == null) return null;
            return new String(bytes, "UTF-8");
        }
        catch (UnsupportedEncodingException ex) {
            return null;
        }
    }
    public static final String decryptBase64StringToString(String data, byte[] key) {
        try {
            byte[] bytes = decrypt(Base64.decode(data), key);
            if (bytes == null) return null;
            return new String(bytes, "UTF-8");
        }
        catch (UnsupportedEncodingException ex) {
            return null;
        }
    }
    public static final String decryptBase64StringToString(String data, String key) {
        try {
            byte[] bytes = decrypt(Base64.decode(data), key);
            if (bytes == null) return null;
            return new String(bytes, "UTF-8");
        }
        catch (UnsupportedEncodingException ex) {
            return null;
        }
    }

    private static int[] encrypt(int[] v, int[] k) {
        int n = v.length - 1;

        if (n < 1) {
            return v;
        }
        int p, q = 6 + 52 / (n + 1);
        int z = v[n], y, sum = 0, e;

        while (q-- > 0) {
            sum = sum + DELTA;
            e = sum >>> 2 & 3;
            for (p = 0; p < n; p++) {
                y = v[p + 1];
                z = v[p] += MX(sum, y, z, p, e, k);
            }
            y = v[0];
            z = v[n] += MX(sum, y, z, p, e, k);
        }
        return v;
    }

    private static int[] decrypt(int[] v, int[] k) {
        int n = v.length - 1;

        if (n < 1) {
            return v;
        }
        int p, q = 6 + 52 / (n + 1);
        int z, y = v[0], sum = q * DELTA, e;

        while (sum != 0) {
            e = sum >>> 2 & 3;
            for (p = n; p > 0; p--) {
                z = v[p - 1];
                y = v[p] -= MX(sum, y, z, p, e, k);
            }
            z = v[n];
            y = v[0] -= MX(sum, y, z, p, e, k);
            sum = sum - DELTA;
        }
        return v;
    }

    private static byte[] fixKey(byte[] key) {
        if (key.length == 16) return key;
        byte[] fixedkey = new byte[16];
        if (key.length < 16) {
            System.arraycopy(key, 0, fixedkey, 0, key.length);
        }
        else {
            System.arraycopy(key, 0, fixedkey, 0, 16);
        }
        return fixedkey;
    }

    private static int[] toIntArray(byte[] data, boolean includeLength) {
        int n = (((data.length & 3) == 0)
                ? (data.length >>> 2)
                : ((data.length >>> 2) + 1));
        int[] result;

        if (includeLength) {
            result = new int[n + 1];
            result[n] = data.length;
        }
        else {
            result = new int[n];
        }
        n = data.length;
        for (int i = 0; i < n; ++i) {
            result[i >>> 2] |= (0x000000ff & data[i]) << ((i & 3) << 3);
        }
        return result;
    }

    private static byte[] toByteArray(int[] data, boolean includeLength) {
        int n = data.length << 2;

        if (includeLength) {
            int m = data[data.length - 1];
            n -= 4;
            if ((m < n - 3) || (m > n)) {
                return null;
            }
            n = m;
        }
        byte[] result = new byte[n];

        for (int i = 0; i < n; ++i) {
            result[i] = (byte) (data[i >>> 2] >>> ((i & 3) << 3));
        }
        return result;
    }
}
```

然后 写上 一个解密的类

[Java] *纯文本查看*

```
package com.Test;

import org.json.JSONObject;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.math.BigInteger;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Map;
import java.util.zip.GZIPInputStream;

public class Coco2dx {
    public static void main(String[] args) throws Exception {
        String filePath = "C:\\Users\\清明\\Desktop\\某三国游戏\\assets";
        decode(new File(filePath));
    }

    private static void decode(File path){
        if (path.isDirectory()){
            File[] files = path.listFiles();
            for (File file:files) {
                decode(file);
            }
        }else{
            if (path.getAbsolutePath().indexOf(".jsc")>0){
                System.out.println("正在解密："+path);
                byte[] d = XXTEA.decrypt(FileIOUtils.readFile2BytesByChannel(path),"162a81f0-7b82-44");
                d = uncompress(d);
                FileIOUtils.writeFileFromBytesByStream(path.getAbsolutePath().replace("幻想三国2.0","幻想三国解密")
                        .replace(".jsc",".js"),d);
            }else{
                System.out.println(path);
            }
        }
    }

    public static byte[] uncompress(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return null;
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ByteArrayInputStream in = new ByteArrayInputStream(bytes);
        try {
            GZIPInputStream ungzip = new GZIPInputStream(in);
            byte[] buffer = new byte[256];
            int n;
            while ((n = ungzip.read(buffer)) >= 0) {
                out.write(buffer, 0, n);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }
}
```

最后运行，查看

![](https://attach.52pojie.cn/forum/202101/30/162546m8di5v5jsvdb5141.png)

objk了！！！
