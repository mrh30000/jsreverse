# 某一卡通app免密盗刷，Sign值算法以及支付二维码计算方法分析

> **作者**: 你好，再见 | **发布时间**: 2024-11-09 01:50:00 | **版块**: 『移动安全区』 | **查看/回复**: 7773 / 65
> **原文**: [https://www.52pojie.cn/thread-1979662-1-1.html](https://www.52pojie.cn/thread-1979662-1-1.html)

---

*本帖最后由 你好，再见 于 2025-1-3 19:41 编辑*

感谢评论区大佬的指点让我发现了这个一卡通app的免密盗刷漏洞还有信息泄露的问题，这个帖子必须得锁定一段时间。
因为修复这个漏洞需要同时升级门禁刷卡机还有刷卡app，工程量比较大学校处理速度很慢，所以我11月份发的帖子一直锁定到1月份才发出来。
另外请不要在评论区发布任何敏感信息噢。
![](https://static.52pojie.cn/static/image/smiley/laohu/laohu20.gif)**前情提要：**
最近买了一块watch，买东西能刷微信，坐车能刷NFC，唯独学校的一卡通二维码刷不了，商店里没有app的手表版本下载。其实很久之前我就想过一卡通的二维码有没有办法通过手机的快捷指令获取，但是我没有接触过ios或者安卓逆向，JAVA也只是跟着学校的课程简单学习了一下，当时就放弃了。最近在一个交流群里看到有人在询问jadx相关的问题，我发现这软件反编译出来的代码非常清晰，我居然能看懂大概的逻辑，于是就萌生出了分析学校一卡通app的想法。
**注意：**
楼主第一次做安卓逆向，相关代码分析可能不太准确，某些技术用词可能会按照楼主自己的理解来写导致文章比较别扭，有错误欢迎大佬们指出。另外我一开始没打算写这篇文章，因为我压根不知道我能不能分析出来，所有内容是我按照记忆重新走的一遍流程，可能不太完整请见谅。
**开始！**
想要分析二维码的计算过程，首先必须得从网络下手，app究竟访问了什么网站来获取相关参数？我使用fiddler来抓取app的网络请求，解密https流量必须同时在windows和模拟器当中安装抓包工具的证书。

![](https://attach.52pojie.cn/forum/202411/09/010704k007t6lrt8a6ail2.png)

我使用mumu模拟器，模拟器设置中勾选“开启网络桥接模式”。大部分学校的校园网禁止桥接，请务必连接手机热点，否则模拟器无法访问主机网络。

![](https://attach.52pojie.cn/forum/202411/09/010723su3ocpuiluwmgkuh.png)

打开模拟器的诊断信息，可以看到模拟器的ip为172.20.10.3，网关地址是172.20.10.1，很显然windows的ip应该为172.20.10.2。
我们首先在模拟器中配置好网络代{过}{滤}理，然后再在浏览器中打开fiddler监听端口的地址。

如果打不开的话请暂时关闭windows防火墙。点击下载证书并在设置中安装。

![](https://attach.52pojie.cn/forum/202411/09/010925bsyjccdd9c39xjcy.png)

![](https://attach.52pojie.cn/forum/202411/09/010936rjavdzlsbcl69vq6.png)

准备好之后就可以开始了，打开一卡通app并登录

![](https://attach.52pojie.cn/forum/202411/09/010952gxmuz71bf1xiu11i.png)

首先分析第一个链接，app.xxxxxxx.edu.cn/easytong\_app//GetVersionInfo
程序向该链接POST了两个参数Time和Sign，很显然Time的格式为“年月日时分秒”，Sign值则是一串md5，我尝试将这串md5放到cmd5网站中查询，没有查询结果说明计算Sign值的原始文本有可能不是根据Time计算得到，也有可能是被“加盐”了。
我反复尝试POST该链接，均得到正常响应，一旦改变Sign或者Time参数则会出错，这证明Time参数是不是当前时间并不重要，重要的是Sign与Time必须匹配。

![](https://attach.52pojie.cn/forum/202411/09/011007vwjpkzwj2jlmzfpw.png)

![](https://attach.52pojie.cn/forum/202411/09/011015zb1vjda2ssk08tu3.png)

接下来分析<http://cas.xxxxxx.edu.cn/v1/tickets>。
这玩意儿逆天了，不仅使用不安全的http链接，用户名和密码居然也是以明文方式发送，我所有的网络账号都是用的这个密码，这下我得把我所有的密码全部更换一遍，开发者完全不把用户的数据安全放在眼里，我推测服务器数据库里保存的密码估计也是明文。
回到正题，返回的内容当中出现了一个链接：<http://cas.xxxxxx.edu.cn/v1/tickets/TGT-321598-QRkrQr1d5aL0aeloecNf2YuOGsgpd3w3el609VHiFnOukTuKFy-sso.test.com>
程序POST一个service参数，返回值作为Ticket

![](https://attach.52pojie.cn/forum/202411/09/011029qy5j7meo2y2gnxon.png)

OK我们登录成功了，程序访问<http://cas.xxxxx.edu.cn/serviceValidate>，获得了accNum，和loginName(学号)。

![](https://attach.52pojie.cn/forum/202411/09/011045wp5bpg8zzpgbry86.png)

后面的链接我们暂时跳过，直接来到获取二维码的链接。
<https://app.xxxxx.edu.cn/easytong_app//GetQRCode>
我们已经获得了AccNum，还需要一个CardAccNum，搜索可得该参数最简单的方法是访问此链接获取
<https://app.xxxxx.edu.cn/easytong_app//GetAccInfo>
另外这个信息显示有一点问题，楼主是本科生不是博士哈哈

![](https://attach.52pojie.cn/forum/202411/09/011059b0l66vcewtuwcwlj.png)

![](https://attach.52pojie.cn/forum/202411/09/011107yaaqeijregv5vsde.png)

至此网络部分已经分析完毕，我们拿到了所有生成二维码所需的参数Time,Sign,AccNum,CardAccNum

接下来需要分析Sign值的计算过程我随便找了个程序查壳，我也不知道哪个好用，还好没有壳，要不然我可能就止步于此了

![](https://attach.52pojie.cn/forum/202411/09/011120zjrz7zzhrmu7dmnl.png)

将apk拖入jadx中打开，全局搜索学校的名字，找了半天没找到Sign计算函数，可能是我眼拙，直接搜索Sign

![](https://attach.52pojie.cn/forum/202411/09/011136zyt6wyz09s11b1u6.png)

![](https://attach.52pojie.cn/forum/202411/09/011143s0barid8m5z0w45a.png)

![](https://attach.52pojie.cn/forum/202411/09/011150cqzokzed9qah9zp1.png)

在我标注的那一行，Sign作为一个单独字符串出现了！这很有可能是Sign计算函数，我们双击跟进。

![](https://attach.52pojie.cn/forum/202411/09/011203gccjcd88c46i16qg.png)

strArr5很显然是参数Time，strArr3包含字符串”Time”和”Sign”，这两个变量同时被传入了EncodeParams(重命名过)

![](https://attach.52pojie.cn/forum/202411/09/011216cwtgbwxlucc673tb.png)

![](https://attach.52pojie.cn/forum/202411/09/011223w75ikik2ffwdkiy9.png)

传入的两个变量strArr和strArr2又被传入了S()，非常可疑，我们跳到函数声明看看sb.append("ok15we1\*\*\*\*8x5afd@");

在sb的末尾追加了一串字符，然后调用了g.calcMD5(重命名)

![](https://attach.52pojie.cn/forum/202411/12/223950era449aawv09ppr6.png)

很明显了吧，传入的str计算MD5并返回

![](https://attach.52pojie.cn/forum/202411/09/011253itiuli5o43noomzm.png)

我收集了所有相关的代码，然后让gpt帮助我们分析逻辑

[Java] *纯文本查看*

```
    private static String S(String[] strArr, String[] strArr2) {        int length = strArr.length - 1;
        String[] strArr3 = new String[length];
        for (int i = 0; i < strArr.length; i++) {
            if (i == 0) {
                strArr3[i] = strArr[i];
            }
            if (i > 1) {
                strArr3[i - 1] = strArr[i];
            }
        }
        String[] strArr4 = new String[length];
        System.arraycopy(strArr3, 0, strArr4, 0, length);
        Arrays.sort(strArr4);
        StringBuilder sb = new StringBuilder();
        for (int i2 = 0; i2 < length; i2++) {
            String str = strArr4[i2];
            int i3 = 0;
            while (true) {
                if (i3 >= length) {
                    break;
                }
                if (str.equals(strArr3[i3])) {
                    sb.append(strArr2[i3] + "|");
                    break;
                }
                i3++;
            }
        }
        sb.append("ok15we1****8x5afd@");
        return g.calcMD5(sb.toString());
    }

    private static StringBuilder EncodeParams(String[] strArr, String[] strArr2) {
        StringBuilder sb;
        StringBuilder sb2 = new StringBuilder();
        String S = S(strArr, strArr2);
        for (int i = 0; i < strArr.length; i++) {
            if (i == 0) {
                try {
                    sb = new StringBuilder();
                    sb.append("&");
                    sb.append(strArr[i]);
                    sb.append("=");
                    sb.append(URLEncoder.encode(strArr2[i], "UTF-8"));
                } catch (UnsupportedEncodingException e) {
                    e.printStackTrace();
                }
            } else if (i == 1) {
                sb = new StringBuilder();
                sb.append("&");
                sb.append(strArr[i]);
                sb.append("=");
                sb.append(URLEncoder.encode(S, "UTF-8"));
            } else {
                sb = new StringBuilder();
                sb.append("&");
                sb.append(strArr[i]);
                sb.append("=");
                sb.append(URLEncoder.encode(strArr2[i - 1], "UTF-8"));
            }
            sb2.append(sb.toString());
        }
        return sb2;
    }

    private static String j(String[] strArr, String... strArr2) {
        String[] strArr3;
        if (strArr == null) {
            strArr3 = new String[2];
        } else {
            String[] strArr4 = new String[strArr.length + 2];
            System.arraycopy(strArr, 0, strArr4, 2, strArr.length);
            strArr3 = strArr4;
        }
        strArr3[0] = "Time";
        strArr3[1] = "Sign";
        int length = strArr2.length + 1;
        String[] strArr5 = new String[length];
        strArr5[0] = getTime();
        if (length > 1) {
            System.arraycopy(strArr2, 0, strArr5, 1, strArr2.length);
        }
        StringBuilder EncodeParams = EncodeParams(strArr3, strArr5);
        EncodeParams.deleteCharAt(0);
        String sb = EncodeParams.toString();
        n.F(sb);
        return sb;
    }

    public static String Y(String str, String str2) {
        return j(new String[]{"AccNum", "EPID"}, str, str2);
    }
```

> 根据代码，我们可以看到 "AccNum" 和 "EPID" 是作为参数传递给 j() 方法的。在 j() 方法中，它们被组成一个字符串数组 strArr3，并与其他参数一起传递给 EncodeParams() 方法。
>
> 在 EncodeParams() 方法中，strArr3 数组被与 strArr5 数组（包含当前时间和 str、str2 参数）一起进行编码和加密。
>
> 为了举例说明，我们假设当前时间为 "2023-07-26 14:30:00"，str 参数为 "123456"，str2 参数为 "abcdef"。
>
> 那么，strArr3 数组将为 ["Time", "Sign", "AccNum", "EPID"]，strArr5 数组将为 ["2023-07-26 14:30:00", "123456", "abcdef"]。
>
> 在 EncodeParams() 方法中，会调用 S() 方法对参数进行加密。S() 方法将 strArr3 数组和 strArr5 数组进行排序、拼接和加密。
>
> 首先，S() 方法将 strArr3 数组的第一个元素 "Time" 赋值给 strArr4 数组的第一个元素。然后，将 strArr3 数组的其余元素（从第二个元素开始）赋值给 strArr4 数组的对应元素，但索引减 1。
>
> 因此，strArr4 数组将为 ["Time", "AccNum", "EPID"]。
>
> 接下来，S() 方法将 strArr4 数组进行排序。排序后的 strArr4 数组将为 ["AccNum", "EPID", "Time"]。
>
> 然后，S() 方法将 strArr4 数组的元素与 strArr5 数组的元素进行拼接和加密。具体来说，会将 strArr4 数组的每个元素与 strArr5 数组的对应元素进行拼接，并追加一个 "|" 字符。
>
> 因此，拼接后的字符串将为 "AccNum|123456|EPID|abcdef|Time|2023-07-26 14:30:00|"。
>
> 最后，S() 方法将追加一个固定字符串 "ok15we1\*\*\*\*8x5afd@" 到拼接后的字符串中，并进行 MD5 加密。
>
> 因此，最终的加密结果将为 MD5("AccNum|123456|EPID|abcdef|Time|2023-07-26 14:30:00|ok15we1\*\*\*\*8x5afd@")。
>
> 这个加密结果将作为 "Sign" 参数的值，返回给 j() 方法，并最终返回给 Y() 方法。
>
> 因此，我们可以看到 "AccNum" 和 "EPID" 是作为参数传递给 j() 方法的，并在 EncodeParams() 方法中被与其他参数一起进行编码和加密。最终的加密结果将作为 "Sign" 参数的值返回。

大体上分析正确，我们尝试手动计算Sign值，大功告成！
接下来就是分析二维码的计算过程了，还记得前文提到过计算二维码需要哪些参数吗？Time,Sign,AccNum,CardAccNum，我们全文搜索AccNum，找到只需要传入两个参数AccNum和CardAccNum的函数

![](https://attach.52pojie.cn/forum/202411/09/011418d1dnnmzsn2wgh88u.png)

![](https://attach.52pojie.cn/forum/202411/09/011427j9pd6t77fqqg9fgj.png)

![](https://attach.52pojie.cn/forum/202411/09/011434c41ozmnck1t0n22i.png)

我选第二个然后来到这里，分析了半天是扫码不是生成二维码，主要是有个GetQRCode很迷惑人，虽然前面节点里写的Scan但我还是硬着头皮分析了。
二维码分为两部分，以逗号隔开900288FCEED13A790F4D52324FF7648532703FCD62891C595F9AC4176C5113D1CAC691942E81007E39E46DD25FF2CCD063887E7FFC39B9A463EB95010B6256FFAA86ED3E459071D6BB6ABAE65936D5CA,12351
首先eqLength经过计算校验QRCODE前后两部分是否相等，f1123a是一个整型数组

[Java] *纯文本查看*

```
import java.util.Scanner;import java.util.Arrays;

public class Test {
    public static final int[] f1123a = {0, 4129, 8258, 12387, 16516, 20645, 24774, 28903, 33032, 37161, 41290, 45419, 49548, 53677, 57806, 61935, 4657, 528, 12915, 8786, 21173, 17044, 29431, 25302, 37689, 33560, 45947, 41818, 54205, 50076, 62463, 58334, 9314, 13379, 1056, 5121, 25830, 29895, 17572, 21637, 42346, 46411, 34088, 38153, 58862, 62927, 50604, 54669, 13907, 9842, 5649, 1584, 30423, 26358, 22165, 18100, 46939, 42874, 38681, 34616, 63455, 59390, 55197, 51132, 18628, 22757, 26758, 30887, 2112, 6241, 10242, 14371, 51660, 55789, 59790, 63919, 35144, 39273, 43274, 47403, 23285, 19156, 31415, 27286, 6769, 2640, 14899, 10770, 56317, 52188, 64447, 60318, 39801, 35672, 47931, 43802, 27814, 31879, 19684, 23749, 11298, 15363, 3168, 7233, 60846, 64911, 52716, 56781, 44330, 48395, 36200, 40265, 32407, 28342, 24277, 20212, 15891, 11826, 7761, 3696, 65439, 61374, 57309, 53244, 48923, 44858, 40793, 36728, 37256, 33193, 45514, 41451, 53516, 49453, 61774, 57711, 4224, 161, 12482, 8419, 20484, 16421, 28742, 24679, 33721, 37784, 41979, 46042, 49981, 54044, 58239, 62302, 689, 4752, 8947, 13010, 16949, 21012, 25207, 29270, 46570, 42443, 38312, 34185, 62830, 58703, 54572, 50445, 13538, 9411, 5280, 1153, 29798, 25671, 21540, 17413, 42971, 47098, 34713, 38840, 59231, 63358, 50973, 55100, 9939, 14066, 1681, 5808, 26199, 30326, 17941, 22068, 55628, 51565, 63758, 59695, 39368, 35305, 47498, 43435, 22596, 18533, 30726, 26663, 6336, 2273, 14466, 10403, 52093, 56156, 60223, 64286, 35833, 39896, 43963, 48026, 19061, 23124, 27191, 31254, 2801, 6864, 10931, 14994, 64814, 60687, 56684, 52557, 48554, 44427, 40424, 36297, 31782, 27655, 23652, 19525, 15522, 11395, 7392, 3265, 61215, 65342, 53085, 57212, 44955, 49082, 36825, 40952, 28183, 32310, 20053, 24180, 11923, 16050, 3793, 7920};

    public static void main(String[] args) {
        System.out.println(g(115084,116438));
        System.out.println(f(("900288FCEED13A790F4D52324FF7648532703FCD62891C595F9AC4176C5113D1CAC691942E81007E39E46DD25FF2CCD063887E7FFC39B9A463EB95010B6256FFAA86ED3E459071D6BB6ABAE65936D5CA").getBytes(),160));
        System.out.println(g((655361 >> 8) & 65535,655361 & 255));

    }

    public static byte[] g(int i, int i2) {
        byte[] bArr = new byte[16];
        bArr[0] = (byte) (i2 & 255);
        bArr[1] = (byte) (i & 255);
        bArr[2] = (byte) ((i >> 8) & 255);
        bArr[3] = 0;
        for (int i3 = 4; i3 < 8; i3++) {
            bArr[i3] = (byte) (~bArr[i3 - 4]);
        }
        for (int i4 = 8; i4 < 12; i4++) {
            bArr[i4] = (byte) (bArr[i4 - 8] ^ bArr[(16 - i4) - 1]);
        }
        bArr[12] = (byte) (bArr[8] ^ 161);
        bArr[13] = (byte) (bArr[9] ^ 27);
        bArr[14] = (byte) (bArr[10] ^ 193);
        bArr[15] = (byte) (bArr[11] ^ 29);
        byte[] bArr2 = new byte[24];
        System.arraycopy(bArr, 0, bArr2, 0, 16);
        System.arraycopy(bArr, 0, bArr2, 16, 8);
        return bArr2;
    }

    public static int f(byte[] Code, int length) {
        int i = 0;
        for (int i2 = 0; i2 < length; i2++) {
            i = f1123a[((i >> 8) ^ Code[i2]) & 255] ^ (i << 8);
        }
        return 65535 & i;
    }

}
```

计算结果12351，符合QRCODE后半部分

![](https://attach.52pojie.cn/forum/202411/09/011543r3az7s11z9ayscyr.png)

![](https://attach.52pojie.cn/forum/202411/09/011549xl4419jusu1ou99d.png)

![](https://attach.52pojie.cn/forum/202411/09/011556i15i1dvsoomzojo1.png)

然后通过对ClientID(前面抓包可以获取我忘记说了)进行处理，与QRCODE[0]一起传入DES函数

![](https://attach.52pojie.cn/forum/202411/09/011611j6jwludodwoduuoo.png)

函数g再次对i,i2进行处理，然后调用DES()函数加密，ecb nopadding

![](https://attach.52pojie.cn/forum/202411/09/011625r4tttifimj2z20zi.png)

然后我到这里才发现我分析的扫码函数，大无语
不过没关系，前面我们已经找到了QRCODE的后半部分是由eqLength函数计算出来，所以我们全文搜索eqLength。
第一个是扫描二维码，那么第二个肯定就是生成二维码，我们跟进去看看。

![](https://attach.52pojie.cn/forum/202411/09/011642sdoj6s2s80db5o90.png)

![](https://attach.52pojie.cn/forum/202411/09/011648r4dyyd0ewq44ooyj.png)

不难发现高亮处就是二维码图片生成函数，QRCODE前半部分是由DES3函数得到

[Java] *纯文本查看*

```
    private void j0() {        try {
            g0();
            String DES3 = l.DES3(Integer.parseInt(this.t), Integer.parseInt(this.u), "1,1," + this.u + "," + this.t + "," + this.z + "," + this.CardNo + "," + getAccName() + "," + this.w + "," + this.AuthNum + "," + this.C + "," + this.I + "," + e.m());
            if (DES3 == null) {
                return;
            }
            byte[] bytes = DES3.getBytes(StringUtils.GB2312);
            Bitmap encodeAsBitmap = new QRCodeEncoder(this, DES3 + "," + l.eqLength(bytes, bytes.length)).encodeAsBitmap();
            this.A = encodeAsBitmap;
            this.y.setImageBitmap(encodeAsBitmap);
            BigQrCode bigQrCode = this.B;
            if (bigQrCode == null || !bigQrCode.b()) {
                return;
            }
            this.B.c(this.A);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
```

逐一右键查找查找用例，可得明文格式为：

[Asm] *纯文本查看*

```
"1,1,"+clientID & 255+","+(clientID >> 8) & 65535+","+AccNum+","+CardNo+","+"AccName"+","+PersonID+","+"AuthNum"+","+"CardAccNum"+","+ TimeStamp+EPID
```

所有的数据均可通过抓包获取。

![](https://attach.52pojie.cn/forum/202411/09/011800w1v3b1nu3btqvdzz.png)

最后就是计算最终结果了，出了一点小插曲把AuthNum搞错了，我们使用计算的密钥直接解密QRCODE前半部分，这是密钥计算代码

[Java] *纯文本查看*

```
import java.util.Formatter;import java.util.Scanner;
import java.util.Arrays;

public class Test {
    public static final int[] f1123a = {0, 4129, 8258, 12387, 16516, 20645, 24774, 28903, 33032, 37161, 41290, 45419, 49548, 53677, 57806, 61935, 4657, 528, 12915, 8786, 21173, 17044, 29431, 25302, 37689, 33560, 45947, 41818, 54205, 50076, 62463, 58334, 9314, 13379, 1056, 5121, 25830, 29895, 17572, 21637, 42346, 46411, 34088, 38153, 58862, 62927, 50604, 54669, 13907, 9842, 5649, 1584, 30423, 26358, 22165, 18100, 46939, 42874, 38681, 34616, 63455, 59390, 55197, 51132, 18628, 22757, 26758, 30887, 2112, 6241, 10242, 14371, 51660, 55789, 59790, 63919, 35144, 39273, 43274, 47403, 23285, 19156, 31415, 27286, 6769, 2640, 14899, 10770, 56317, 52188, 64447, 60318, 39801, 35672, 47931, 43802, 27814, 31879, 19684, 23749, 11298, 15363, 3168, 7233, 60846, 64911, 52716, 56781, 44330, 48395, 36200, 40265, 32407, 28342, 24277, 20212, 15891, 11826, 7761, 3696, 65439, 61374, 57309, 53244, 48923, 44858, 40793, 36728, 37256, 33193, 45514, 41451, 53516, 49453, 61774, 57711, 4224, 161, 12482, 8419, 20484, 16421, 28742, 24679, 33721, 37784, 41979, 46042, 49981, 54044, 58239, 62302, 689, 4752, 8947, 13010, 16949, 21012, 25207, 29270, 46570, 42443, 38312, 34185, 62830, 58703, 54572, 50445, 13538, 9411, 5280, 1153, 29798, 25671, 21540, 17413, 42971, 47098, 34713, 38840, 59231, 63358, 50973, 55100, 9939, 14066, 1681, 5808, 26199, 30326, 17941, 22068, 55628, 51565, 63758, 59695, 39368, 35305, 47498, 43435, 22596, 18533, 30726, 26663, 6336, 2273, 14466, 10403, 52093, 56156, 60223, 64286, 35833, 39896, 43963, 48026, 19061, 23124, 27191, 31254, 2801, 6864, 10931, 14994, 64814, 60687, 56684, 52557, 48554, 44427, 40424, 36297, 31782, 27655, 23652, 19525, 15522, 11395, 7392, 3265, 61215, 65342, 53085, 57212, 44955, 49082, 36825, 40952, 28183, 32310, 20053, 24180, 11923, 16050, 3793, 7920};

    public static void main(String[] args) {
        int clientID = 655361;
        System.out.println(g(115084,116438));
        System.out.println(f(("900288FCEED13A790F4D52324FF7648532703FCD62891C595F9AC4176C5113D1CAC691942E81007E39E46DD25FF2CCD063887E7FFC39B9A463EB95010B6256FFAA86ED3E459071D6BB6ABAE65936D5CA").getBytes(),160));
        System.out.println(g((clientID >> 8) & 65535,clientID & 255));
        byte[] bb = g((clientID >> 8) & 65535,clientID & 255);
        Formatter formatter = new Formatter();
        for (byte b : bb) {
            formatter.format("%02x", b);
        }
        System.out.println(formatter.toString());

        System.out.println((655361 >> 8) & 65535);
        System.out.println(655361 & 255);

    }

    public static byte[] g(int i, int i2) {
        byte[] bArr = new byte[16];
        bArr[0] = (byte) (i2 & 255);
        bArr[1] = (byte) (i & 255);
        bArr[2] = (byte) ((i >> 8) & 255);
        bArr[3] = 0;
        for (int i3 = 4; i3 < 8; i3++) {
            bArr[i3] = (byte) (~bArr[i3 - 4]);
        }
        for (int i4 = 8; i4 < 12; i4++) {
            bArr[i4] = (byte) (bArr[i4 - 8] ^ bArr[(16 - i4) - 1]);
        }
        bArr[12] = (byte) (bArr[8] ^ 161);
        bArr[13] = (byte) (bArr[9] ^ 27);
        bArr[14] = (byte) (bArr[10] ^ 193);
        bArr[15] = (byte) (bArr[11] ^ 29);
        byte[] bArr2 = new byte[24];
        System.arraycopy(bArr, 0, bArr2, 0, 16);
        System.arraycopy(bArr, 0, bArr2, 16, 8);
        return bArr2;
    }

    public static int f(byte[] Code, int length) {
        int i = 0;
        for (int i2 = 0; i2 < length; i2++) {
            i = f1123a[((i >> 8) ^ Code[i2]) & 255] ^ (i << 8);
        }
        return 65535 & i;
    }

    private boolean h0(byte[] bArr) {
        int i = 0;
        for (int i2 = 0; i2 < 8; i2++) {
            if ((bArr[i2] & 255) > 127) {
                i++;
            }
        }
        return i % 2 == 0;
    }
}
```

![](https://attach.52pojie.cn/forum/202411/09/011831xi0idu69qwcdhi0x.png)

“01000a00fefff5fffef5f5fe5fee34e301000a00fefff5ff”就是密钥，我们扫描二维码看看

![](https://attach.52pojie.cn/forum/202411/09/011844ttdd006qusv1qn6u.png)

![](https://attach.52pojie.cn/forum/202411/09/011853cy72vf40j47v72az.png)

结果完全正确！打码部分是我的名字和学号。

接下来就可以编写快捷指令生成付款二维码了。以下为 key 值，DES 加密以及长度校验值计算脚本，均由 GPT 生成并部署在 Vercel 上。有一个比较坑的点是编码问题，加密前的内容中包含中文姓名，而快捷指令里提交的编码方式只能是 UTF-8，所以部署在服务端上的脚本必须将传入数据编码转换为 GBK。

[JavaScript] *纯文本查看*

```
import CryptoJS from 'crypto-js';
import iconv from 'iconv-lite';

const f1123a = [0, 4129, 8258, 12387, 16516, 20645, 24774, 28903, 33032, 37161, 41290, 45419, 49548, 53677, 57806, 61935, 4657, 528, 12915, 8786, 21173, 17044, 29431, 25302, 37689, 33560, 45947, 41818, 54205, 50076, 62463, 58334, 9314, 13379, 1056, 5121, 25830, 29895, 17572, 21637, 42346, 46411, 34088, 38153, 58862, 62927, 50604, 54669, 13907, 9842, 5649, 1584, 30423, 26358, 22165, 18100, 46939, 42874, 38681, 34616, 63455, 59390, 55197, 51132, 18628, 22757, 26758, 30887, 2112, 6241, 10242, 14371, 51660, 55789, 59790, 63919, 35144, 39273, 43274, 47403, 23285, 19156, 31415, 27286, 6769, 2640, 14899, 10770, 56317, 52188, 64447, 60318, 39801, 35672, 47931, 43802, 27814, 31879, 19684, 23749, 11298, 15363, 3168, 7233, 60846, 64911, 52716, 56781, 44330, 48395, 36200, 40265, 32407, 28342, 24277, 20212, 15891, 11826, 7761, 3696, 65439, 61374, 57309, 53244, 48923, 44858, 40793, 36728, 37256, 33193, 45514, 41451, 53516, 49453, 61774, 57711, 4224, 161, 12482, 8419, 20484, 16421, 28742, 24679, 33721, 37784, 41979, 46042, 49981, 54044, 58239, 62302, 689, 4752, 8947, 13010, 16949, 21012, 25207, 29270, 46570, 42443, 38312, 34185, 62830, 58703, 54572, 50445, 13538, 9411, 5280, 1153, 29798, 25671, 21540, 17413, 42971, 47098, 34713, 38840, 59231, 63358, 50973, 55100, 9939, 14066, 1681, 5808, 26199, 30326, 17941, 22068, 55628, 51565, 63758, 59695, 39368, 35305, 47498, 43435, 22596, 18533, 30726, 26663, 6336, 2273, 14466, 10403, 52093, 56156, 60223, 64286, 35833, 39896, 43963, 48026, 19061, 23124, 27191, 31254, 2801, 6864, 10931, 14994, 64814, 60687, 56684, 52557, 48554, 44427, 40424, 36297, 31782, 27655, 23652, 19525, 15522, 11395, 7392, 3265, 61215, 65342, 53085, 57212, 44955, 49082, 36825, 40952, 28183, 32310, 20053, 24180, 11923, 16050, 3793, 7920];

export default function handler(req, res) {
    if (req.method === 'POST') {
        const { clientID, DES, key, code, length } = req.body;

        if (clientID) {
            const result = calculateClientIDResult(clientID);
            res.status(200).json({ result });
        } else if (DES && key) {
            const result = performTripleDESEncryption(DES, key);
            res.status(200).json({ result });
        } else if (code && length) {
            const gbkEncodedCode = iconv.encode(code, 'gbk');
            const result = f(gbkEncodedCode, length);
            res.status(200).json({ result });
        } else {
            res.status(400).json({ error: 'Invalid input' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

function calculateClientIDResult(clientID) {
    const bb = g((clientID >> 8) & 65535, clientID & 255);
    return Array.from(bb).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function g(i, i2) {
    let bArr = new Uint8Array(16);
    bArr[0] = i2 & 255;
    bArr[1] = i & 255;
    bArr[2] = (i >> 8) & 255;
    bArr[3] = 0;
    for (let i3 = 4; i3 < 8; i3++) {
        bArr[i3] = ~bArr[i3 - 4];
    }
    for (let i4 = 8; i4 < 12; i4++) {
        bArr[i4] = bArr[i4 - 8] ^ bArr[15 - i4];
    }
    bArr[12] = bArr[8] ^ 161;
    bArr[13] = bArr[9] ^ 27;
    bArr[14] = bArr[10] ^ 193;
    bArr[15] = bArr[11] ^ 29;
    let bArr2 = new Uint8Array(24);
    bArr2.set(bArr.slice(0, 16), 0);
    bArr2.set(bArr.slice(0, 8), 16);
    return bArr2;
}

function performTripleDESEncryption(text, key) {
    const keyHex = CryptoJS.enc.Hex.parse(key);
    const gbkEncodedText = iconv.encode(text, 'gbk');

    // Convert GBK encoded buffer to WordArray
    const messageHex = CryptoJS.enc.Hex.parse(gbkEncodedText.toString('hex'));

    // Ensure message length is a multiple of 8 bytes
    const paddedMessage = messageHex.clone();
    const extraBytes = messageHex.sigBytes % 8;
    if (extraBytes !== 0) {
        const paddingBytes = 8 - extraBytes;
        paddedMessage.concat(CryptoJS.lib.WordArray.create([], paddingBytes));
    }

    const encrypted = CryptoJS.TripleDES.encrypt(paddedMessage, keyHex, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.ZeroPadding
    });
    return encrypted.ciphertext.toString(CryptoJS.enc.Hex);
}

function f(Code, length) {
    let i = 0;
    for (let i2 = 0; i2 < length; i2++) {
        i = f1123a[((i >> 8) ^ Code[i2]) & 255] ^ (i << 8);
    }
    return 65535 & i;
}

function stringToUint8Array(str) {
    const arr = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i);
    }
    return arr;
}
```

![](https://attach.52pojie.cn/forum/202501/03/190954ww62f16uu2apppp0.png)

![](https://attach.52pojie.cn/forum/202501/03/191002wbmzb449s9q404s5.png)

二维码是可以拿到食堂刷的哦，不过需要注意的是快捷指令生成的二维码右下角定位点会被 iOS 的文本识别按钮挡住，必须旋转一下才行。

![](https://static.52pojie.cn/static/image/hrline/2.gif)

我最初的目的已经达成了，不用打开一卡通 app 就可以刷卡，但是 “http 明文传输”“账号密码未加密传输”“无加固无混淆的 app”，这个系统是否还存在着更大的漏洞呢？我们重新复盘整个分析过程，账号密码的作用仅仅是获取一个 AccNum，而后的所有信息都可以通过这个 AccNum 获取。。ok 整个数据库都可以被拖出来，接口无任何速率限制，姓名学号专业身份证卡内余额全部都可以获取，我测试大约有十二万条数据，这意味着利用漏洞可以免密码无感盗刷任意校园卡（正常情况下一卡通登录会请求一个接口将其他设备踢下线，我们不请求就行）

![](https://attach.52pojie.cn/forum/202501/03/191043ulzsv8rbbiv08vsr.png)

我联系了学校网信办的老师并讨论漏洞解决方案，讨论中提到企业微信的工作台中也可以刷校园卡，停止使用一卡通 app 改用企业微信是否会避免这些安全问题呢？一方面二维码算法分析全部都是基于逆向一卡通 app 得到，另一方面企业微信使用 token 鉴权理论上可以完全避免密码安全问题。但事实不是这样的。。

通过抓包企业微信工作台，可以发现这是一套新的接口，个人信息部分使用 ehall\_token 鉴权

![](https://attach.52pojie.cn/forum/202501/03/191328lg85fm9vfv454s5v.png)

二维码信息部分也是另一个新接口，Headers 中存在 authorization 字段（采用 JWT 方式）鉴权，并且 Body 中的 AccNum,Time 和 Sign 参数也必须匹配上。

![](https://attach.52pojie.cn/forum/202501/03/191405b2e0ztdv080mu5u1.png)

二维码直接由服务器生成，这就避免了通过逆向 app 分析相应算法的可能。不过这个 authorization 怎么越看越熟悉啊，噢原来是老朋友，调用一卡通 app 接口用 AccNum 就可以获取到，之前的种种鉴权方式根本没用哈哈哈。

![](https://attach.52pojie.cn/forum/202501/03/192004gdzibpb6uzynl4tw.png)

另外 Sign 值算法全都在 js 当中写出来了，这比逆向 app 来得更直接

![](https://attach.52pojie.cn/forum/202501/03/191517oe5466x6rm55o99z.png)

![](https://attach.52pojie.cn/forum/202501/03/191510chuznuuuhv266u7v.png)

分析了这个企业微信之后发现盗刷反而简单了很多很多。。只用访问三个接口，同样只需要 AccNum，获取版本号，获取 token，然后获取二维码，这下算是解决了我刷卡等半天的问题，真 “一卡通极速版”，不用再傻乎乎等半天刷卡了。

![](https://static.52pojie.cn/static/image/hrline/1.gif)
另外考虑到一卡通使用到老版接口会被关掉，所以我还分析了企业微信版本的一卡通登录方式![](https://static.52pojie.cn/static/image/smiley/laohu/laohu32.gif)

网页端分析很简单，就这几个 js，直接查找关键词就行。Sign 值计算方式没变，依然是 MD5 (data1|data2|salt)，登录密码的加密方式为 3DES。

![](https://attach.52pojie.cn/forum/202501/03/192329yhf6f2oo9ohb0ohb.png)

首先请求 “<https://app.xxxxxx.edu.cn/easytong_app/GetRandomNumber>”，提交表单包含 Time 和 Sign 两个参数，返回一个 random 值，同时注意到相应 Cookie 中有一个 JSESSIONID。

![](https://attach.52pojie.cn/forum/202501/03/192359mszbgbzgwcz7fbsg.png)

![](https://attach.52pojie.cn/forum/202501/03/192419o069mhanr6l000tm.png)

将 random 补齐到 24 位作为加密 key，偏移量为 12347890，使用 3DES 方式加密，以 Hex 格式输出，最后标准 base64 编码就可以。

![](https://attach.52pojie.cn/forum/202501/03/192508kwp3ohob7ifomwvf.png)

![](https://attach.52pojie.cn/forum/202501/03/192506ufrmef40faqt7jjg.png)

![](https://attach.52pojie.cn/forum/202501/03/192504zjj89gm3zh8nu8nj.png)

请求接口 “<https://app.xxxxxx.edu.cn/easytong_app/H5Login>”，五个参数。

![](https://attach.52pojie.cn/forum/202501/03/192551ap3iki7cvouujc8i.png)

![](https://attach.52pojie.cn/forum/202501/03/192553h88pue04zxru0taz.png)

有了 token 之后所有信息都可以获取到，请求 “<https://app.xxxxxx.edu.cn/easytong_app/getH5QRCode>”，AccNum,Time,Sign，需要两个 cookie，etToken 和 JSESSIONID

![](https://attach.52pojie.cn/forum/202501/03/192637di8xpx2fbbkkw00v.png)

![](https://static.52pojie.cn/static/image/hrline/1.gif)

新系统默认使用学号 + 身份证后 6 位登录（企业微信工作台不会提示修改默认密码），只有通过 <https://app.xxxxxx.edu.cn/easytong_webapp/#/home/index> 登录才会提示。所以仍然可以随便盗刷。我一个普通学生随手一翻就是一堆身份证号，有心之人想要获取这些信息不是手到擒来？所以大家在上网的过程中一定要注意保护自己的个人信息还有密码安全。

![](https://attach.52pojie.cn/forum/202501/03/192749s7777dbawd8hdb98.png)

文章篇幅很长，我用word写的所以排版可能有点乱，后续有时间调整。
一卡通app涉及到我的学校所以不可以发布出来，这也导致文章有点难看，不明白的地方可以在评论区提出，我尽可能补充。
另外请不要在评论区回复任何敏感信息噢。
完结撒花，谢谢各位能看到这里。![](https://static.52pojie.cn/static/image/smiley/laohu/laohu28.gif)
