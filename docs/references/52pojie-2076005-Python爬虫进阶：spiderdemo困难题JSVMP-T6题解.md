# Python爬虫进阶：spiderdemo困难题JSVMP-T6题解

> **作者**: mysticz | **发布时间**: 2025-11-27 12:36:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3949 / 37
> **原文**: [https://www.52pojie.cn/thread-2076005-1-1.html](https://www.52pojie.cn/thread-2076005-1-1.html)

---

##### 声明

###### 本文写于2025年11月27日,仅做技术学习交流。本文章中所有内容仅供学习交流使用，不用于其他任何目的，不提供完整代码，抓包内容、敏感网址、数据接口等均已做脱敏处理，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关！

##### 一、前言

今天看一下spiderdemo困难题JSVMP-T6题解

##### 二、发包

我们先用ast替换函数名后在替换网页的代码。

ast函数名替换我直接用的蔡老板的插件。

我们先观察下发包数据

![](https://attach.52pojie.cn/forum/202511/27/123415lbjqewh1e3b7sxia.png)

抛开protobuf不管，可以看到里面有两个参数是加密的

我们先在它的for循环下面打上日志断点

![](https://attach.52pojie.cn/forum/202511/27/123430ei799qfxt7z713qj.png)

保存下来日志后，我们搜索第一个加密参数

可以很明显看到是RSA加密

![](https://attach.52pojie.cn/forum/202511/27/123451kicaaaan4j70titz.png)

是把useragent加密成加密参数

```
const crypto = require("crypto");

const publicKey = `
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCHshK1NixnImx08tq3V6Vjvfwk
ARCOJbnPMZr4Ogh16ORkC45CFUB+2gu+IN2vjH3oJaY2e/6y0shD2fURMB3urxKE
3gewRZMm5/T7noAXs4DJTOxJGwAJFHFfd9Zp73vXEcac4DKrvItOkjLx9P5JkA39
47brgsMObYGdG3HOdwIDAQAB
-----END PUBLIC KEY-----
`;

function rsaEncrypt(data) {
    return crypto.publicEncrypt(
        {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        },
        Buffer.from(data, "utf8")
    ).toString("base64");
}

// 测试
console.log(rsaEncrypt("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"));
```

我们继续看第二个参数,日志如下

```
aT-->--> [8,"",[Function:concat],1764209708,[Function:now]]
aT-->--> [8,"1764209708_jsvmp_secret_key_2024",[Function:concat],19,[Function:now]]

aT-->--> [14,null,[Function:btoa],8,[Function:now]]
iE-->--> [[],[,[Function:nI]]]
dB-->--> [,[DOM:A],,,"-----BEGIN PUBLIC KEY-----
        MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCHshK1NixnImx08tq3V6Vjvfwk
        ARCOJbnPMZr4Ogh16ORkC45CFUB+2gu+IN2vjH3oJaY2e/6y0shD2fURMB3urxKE
        3gewRZMm5/T7noAXs4DJTOxJGwAJFHFfd9Zp73vXEcac4DKrvItOkjLx9P5JkA39
        47brgsMObYGdG3HOdwIDAQAB
        -----END PUBLIC KEY-----",,true,,"1764209708_jsvmp_secret_key_2024",,1764209708,,,true,,{default_key_size:1024,default_public_exponent:"010001",log:false,key:{n:{0:192007799,1:114825681,2:193118990,3:266222446,4:239702029,5:53419855,6:210456210,7:235088571,8:118605468,9:111081405,10:23033814,11:37191,12:216811803,13:188222612,14:194936855,15:40795983,16:128992659,17:19418592,18:1961647,19:228544787,20:47368259,21:57130987,22:233317798,23:232454343,24:168541728,25:22284269,26:67866178,27:123637318,28:184039944,29:194835225,30:17862181,31:199213632,32:123184483,33:122629547,34:208085612,35:19616610,36:34738,t:37,s:0},e:65537,d:null,p:null,q:null,dmp1:null,dmq1:null,coeff:null}},[Function:nI],,{},"jsvmp_secret_key_2024"]
aT-->--> [14,"MTc2NDIwOTcwOF9qc3ZtcF9zZWNyZXRfa2V5XzIwMjQ=",[Function:btoa],8,[Function:now]]
dB-->--> [,[DOM:A],,,"-----BEGIN PUBLIC KEY-----
        MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCHshK1NixnImx08tq3V6Vjvfwk
        ARCOJbnPMZr4Ogh16ORkC45CFUB+2gu+IN2vjH3oJaY2e/6y0shD2fURMB3urxKE
        3gewRZMm5/T7noAXs4DJTOxJGwAJFHFfd9Zp73vXEcac4DKrvItOkjLx9P5JkA39
        47brgsMObYGdG3HOdwIDAQAB
        -----END PUBLIC KEY-----",,true,,"1764209708_jsvmp_secret_key_2024",,1764209708,,,true,"MTc2NDIwOTcwOF9qc3ZtcF9zZWNyZXRfa2V5XzIwMjQ=",{default_key_size:1024,default_public_exponent:"010001",log:false,key:{n:{0:192007799,1:114825681,2:193118990,3:266222446,4:239702029,5:53419855,6:210456210,7:235088571,8:118605468,9:111081405,10:23033814,11:37191,12:216811803,13:188222612,14:194936855,15:40795983,16:128992659,17:19418592,18:1961647,19:228544787,20:47368259,21:57130987,22:233317798,23:232454343,24:168541728,25:22284269,26:67866178,27:123637318,28:184039944,29:194835225,30:17862181,31:199213632,32:123184483,33:122629547,34:208085612,35:19616610,36:34738,t:37,s:0},e:65537,d:null,p:null,q:null,dmp1:null,dmq1:null,coeff:null}},[Function:nI],,{},"jsvmp_secret_key_2024"]
aT-->--> [9,"L8WvaQM/y6iD/CbHkPO47W9b5L+r51lhcQx0JQTPf/Dx6WGnh6SrF0v2/dGNLld6+ar7NkWNBRYy9AdCZAdjR6hKp6ZjTiIdM6FpnmTVP5MKpgyGy/52RaIm/rNP/674szgBxdditwaJW3hjy/U2S7VlkHoKoWjJJCg2S/E5wX8=",[Function:anon],14,[Function:now]]
```

可以看到先用时间戳拼接了一个字符串，然后base64了一下，最后在用RSA加密

发包参数就这俩，剩下就是构造protobuf。我这就不讲了。

下来我们看下响应数据

##### 三、响应

可以看到响应数据里面，有css和一个base64加密的字符串

![](https://attach.52pojie.cn/forum/202511/27/123513vnshshlstobb3tbo.png)

我们先看base64的，可以看到

```
const b64 = "NTQsNTIsNTAsNTQsNTMsNTQsNTgsNTgsNTAsNTI=";

let decoded = atob(b64);
console.log(decoded);
54,52,50,54,53,54,58,58,50,52
```

解码后是一个数组，我们在日志搜索数组，可以看到经过一系列运算后，变成了css中缺失的一组数组

![](https://attach.52pojie.cn/forum/202511/27/123527e7x0bgb0da6457g7.png)

可以看到主要运算是这

```
[,,54,,,,52]
aT-->--> ["4",[Function:fromCharCode],6]
```

对数组中的第六位fromCharCode后就成为了我们需要的数字。

那么这第六位怎么来的？

经过观察日志，即可轻松得到结论。

当数字为奇数时减去4,为偶数时减去2.即可

我们把运算后的数字对比下

![](https://attach.52pojie.cn/forum/202511/27/123546xx5rextri5x9x4tx.png)

可以看到运算后，缺失的数字一模一样

###### 本文章未经许可禁止转载，禁止任何修改后二次传播，擅自使用本文讲解的技术而导致的任何意外，作者均不负责，若有侵权，请在公众号联系作者立即删除！
