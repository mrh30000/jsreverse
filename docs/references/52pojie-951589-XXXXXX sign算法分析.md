# XXXXXX sign算法分析

> **作者**: 案首梦 | **发布时间**: 2019-05-09 10:35:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 50870 / 175
> **原文**: [https://www.52pojie.cn/thread-951589-1-1.html](https://www.52pojie.cn/thread-951589-1-1.html)

---

*本帖最后由 案首梦 于 2019-6-27 19:59 编辑*

## 前言

最近在玩一款微信小游戏，叫做消灭病毒，是我老妹分享给我的，点了个链接就随便玩了一会，不得不说还是挺有意思的，基本上就是像雷电一样的打飞机类游戏，游戏体验还不错，机制也很简单，打怪，攒钱，升武器，打更厉害的怪，攒更多的钱，继续升武器，过程十分漫长。但是这个游戏不提供充钱的渠道（本来也没打算充钱），获取钻石、金币的途径也就只有看广告一条路，一个广告15秒，升级实在是太慢了。于是就想搞一搞事情。

对于微信小程序这种，我们可以简单理解为HTML+CSS+JS，只不过JS是微信JS而已。

所以在这个场景下，我们的思路就是找到小程序源码，看看JS里面有没有什么能利用的东西，对网络传输进行抓包，试试有没有漏洞。

关于这个游戏论坛上和网络其他位置已经有很多工具和教程了，本篇文章不会留工具，纯技术讨论，想要工具的可以直接关掉本文去搜索论坛内其他文章了，本篇文章是纯技术流程，授人以鱼不如授人以渔！
如果你了解这个过程之后，其他的类似游戏也是一个道理！

## 一、配置抓包环境

手机是 OPPO R9s Plus，电脑 windows10，抓包软件 Fiddler，配置过程简单叙述一下：

在Fiddler中设置端口，允许远程连接，开启https抓包及解密，重启软件。

将手机连接到与电脑同一网络中，指定IP地址及端口，安装Fiddler的证书。

需要注意的是，在OPPO中安装证书时，用处选择VPN和应用，选wlan那个还是抓不到。

如果在这一步遇到了问题，可以在搜索引擎上获得大量资料，比较简单。

## 二、微信小程序源码获取

获取办法：在已经ROOT的手机上使用RE文件管理器查看微信源码目录，并复制导出到电脑中。

微信小程序源文件保存在/data/data/com.tencent.mm/MicroMsg/.../appbrand/pkg/这个目录下，中间的“...”是一串32位的16进制字符串名文件夹。

如果有很多不确定是哪个的情况下，我的解决办法是删掉所有这样的目录，在微信中删掉小程序重新添加，就可以看到新创建的目录。找到指定目录并拷贝至电脑上，我们就获得了微信小程序的源代码，在我的手机上有两个wxapkg文件，不清楚是哪个，先都拷贝出来。

![](https://attach.52pojie.cn/forum/201906/27/195019nlkkx73a9iau9l76.png)

下一步是反编译源文件，用大佬写的 wxappUnpacker，Github地址：<https://github.com/qwerty472123/wxappUnpacker>

我们首先安装nodejs环境：<https://nodejs.org/en/>

装一下依赖：

* npm install esprima
* npm install css-tree
* npm install cssbeautify
* npm install vm2
* npm install uglify-es
* npm install js-beautify
* npm install escodegen

最后使用这个命令进行反编译源文件：node wuWxapkg.js filepath，例如我的是：

```
node wuWxapkg.js E:\wx\_-404367246_53.wxapkg
```

![](https://attach.52pojie.cn/forum/201906/27/195022aba1zgalaldnagaa.png)

这样就得到了程序源码，在code.js中，我们可以看到长达43231行的JS代码，是游戏的全部主逻辑代码。

## 三、抓取网络流量

打开微信小游戏，在Fiddler中查看流量，在此过程中尽量关闭其他的应用程序，避免流量混杂带来的数据分析困难，在游戏的过程中，我们发现消灭病毒这款微信小游戏使用了chiji-h5.com这个域名，子域名包括commcdn、wxwyjh、jsonconfig 等几个子域名。

我们从下载资源，打开游戏，玩一局游戏，死一次，领取游戏奖励，打开排行榜，这样将小程序功能走一遍之后，回头来看抓取的流量，其中通过名称发现了一些端倪。

通过协议排序，我们看到一些操作如登录认证、获取信息、邀请好友等等业务功能都是访问wxwyjh这个子域名。

![](https://attach.52pojie.cn/forum/201906/27/194900rloz82txhszshptp.png)

我们对这个子域名进行额外查看，发现一个POST请求的数据包

![](https://attach.52pojie.cn/forum/201906/27/195017lpx1qdadaf81apa2.png)

请求地址为 /api/archive/upload

在请求中，发现了一些跟用户相关的敏感数据，我们现在将这个数据包单提出来如下（敏感数据以\*\*\*显示）：

```
POST https://wxwyjh.chiji-h5.com/api/archive/upload HTTP/1.1
charset: utf-8
Accept-Encoding: gzip
referer: https://servicewechat.com/wxa2c324b63b2a9e5e/53/page-frame.html
content-type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Linux; Android 6.0.1; OPPO R9s Plus Build/MMB29M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/73.0.3683.90 Mobile Safari/537.36 MicroMessenger/7.0.4.1420(0x27000439) Process/appbrand0 NetType/WIFI Language/zh_CN
Content-Length: 1178
Host: wxwyjh.chiji-h5.com
Connection: Keep-Alive

{"plat":"wx","v":1,"record":"{\"v\":\"***\",\"uid\":\"***\",\"isPingJiaed\":false,\"isSoundOff\":true,\"isShackOff\":false,\"GMTimeG\":-1,\"GMTimeP\":-1,\"shareTime\":-1,\"level\":134,\"levelMax\":134,\"lDamage\":121,\"lCount\":121,\"lJiaZhi\":133,\"lRiChang\":133,\"curFu\":6,\"levelFuCount\":[3,1,1,1,1,1,1,1,1,1],\"levelFuDamage\":[22,20,1,1,1,1,1,1,1,1],\"getTime\":\"0\",\"bgIndex\":5,\"bgmIndex\":1,\"money\":\"810429\",\"tipFU\":false,\"G1\":false,\"G2\":false,\"tiLi\":68,\"tiLiBackTime\":1556441780825,\"today\":28,\"playCount\":2,\"shareCount\":0,\"videoCount\":1,\"isGuanZhu\":0,\"isShouCang\":true,\"tryFuCount\":1,\"pos\":\"北京,北京\",\"posUpdate\":28,\"zuanShi\":0,\"teQuanTime\":-1,\"isTeQuaned\":false,\"jiFenId\":[\"\"],\"getTime2\":1556440949083,\"teQuanShowed\":false,\"teQuanGetTime\":-1,\"loginTime\":0,\"EM_isFirst\":true,\"EM_score\":0,\"EM_localRank\":0,\"EM_refreshRankTime\":0,\"nickName\":\"\",\"mode\":1,\"wjCount\":0,\"ID\":***,\"s\":\"***\"}","time":1556441812478,"openid":"***","sign":"***"}
```

看到这个数据包的时候，简直是美滋滋，这个数据包上传了用户几乎全部的信息，这些数据讲道理是存在服务端的，正常的逻辑就是将用户ID加一些校验传过去，获取这些数据再加载到本地，在数据有变化后将变化的数据分不同的接口上传，服务端校验，再改数据库。

像这种一次传全部数据的，基本可以确定我们能够搞事情了。

通过命名，我们可以知道一些信息：

isPingJiaed/isSoundOff/isShackOff/GMTimeG/GMTimeP/shareTime：一些基本的配置信息或标识信息

level/levelMax：等级

lDamage/lCount:主武器伤害和射速

lJiaZhi/lRiChang：金币价值和日常收益

curFu/levelFuCount/levelFuDamage：目前使用的副武器/副武器射速/副武器伤害

money/zuanShi：金币/钻石数量

剩余的都是一些用于描述用户行为或者画像的东西，我们不做研究

我们直接修改一些参数值并提交，发现服务器返回了code 1000，这并不是正常的情况，在正常情况下，服务器应返回0，这说明服务器端还是有校验的。

![](https://attach.52pojie.cn/forum/201906/27/194937tpy88i4s33urcr5u.png)

我们还发现，在数据包尾部，有名为sign的键值对，这可能是按照某种逻辑对上传数据包进行校验的签名，在这种情况下，我们需要查看源代码，找到签名的逻辑，按照逻辑将自己修改后的数据包重新进行计算，这样才能在服务器端校验成功。

## 四、校验算法回顾

为了保证数据在通信时的安全性，可以采用参数签名的方式来进行相关验证。这种方式的基本原理就是将传递的数据加一些参数做MD5，并跟随数据包一起进行传递，在服务器端进行再次验证，将计算得到的MD5与收到的MD5进行比对，如果不同，则说明数据包被篡改过。

这个过程就是为了防止数据包在传递过程中遭到篡改的一种校验算法。

Sign签名的方式能够在一定程度上防止信息被篡改和伪造，但是对于微信小程序来说，逻辑都写在 JS 中，而 JS 源码是能够逆出来的，我们能够通过查看源代码得知程序逻辑，再更改数据包之后，我们自行组织逻辑，算出MD5，一同发送至服务器，就可以绕过校验。

我们目前面对的就是一个典型的web应用中前端sign逻辑校验情况，是存在安全问题的。

## 五、分析小程序源码

由于不懂JS，只能努力的看下逻辑，参考了很多网上的教程，但是程序更新周期很短，这种教程和分析的技术文章很有时效性，方法全部失效了，所以我们需要自己分析，重新发掘手段。

核心代码在 code.js 文件中，主逻辑都在这个文件中，我们对其进行分析。

首先查看发送数据包的部分，通过搜索URL部分关键字找到uploadRecord方法：

![](https://attach.52pojie.cn/forum/201906/27/194931exfgxww665x1z6cw.png)

可以看到一个addEvent，名为saveServer，调用uploadRecord，到这一步我们更加坚定，我们上传的数据包可以更改服务器端的数据。

![](https://attach.52pojie.cn/forum/201906/27/194929i56j3j5tkkrbbw15.png)

sendPost函数负责发送数据包：

!
![](https://attach.52pojie.cn/forum/201906/27/194927sxoto20w2poejo7o.png)

我们大概明白了发送数据的流程，中间经过一个十分重要的 this.sign 算法，跟到这个sign值的生成算法，通过搜索sign、hash等关键字找到关键函数sign。

此处有两处sign，一个一个看，第一处sign：

![](https://attach.52pojie.cn/forum/201906/27/194907xrqky2fczykif27s.png)

这处的sign接了两个参数，我们可以看到第二个参数e，实际上就是True和False的判断，这是为了和下面的第二个sign做区分。

我们来看一下这个代码的逻辑，定义了空数组i（python 中的空列表），空字符串 s，t 是 uploadRecord 中传入的对象（python中的字典），又加了一些新的键值对 openid, wx\_appid, wx\_secret，使用sort进行排序，然后使用for循环将键值对编程 url 参数形式，拼接为字符串，在return中，将对象 t  中的 wx\_appid , wx\_secret 键值对删掉，这两个参数仅用作 sign 计算，不会发送。

第二处sign：

![](https://attach.52pojie.cn/forum/201906/27/194933wn77y4syrsmeu975.png)

这处的 sign 只接一个参数，在t中添加新的键值对，s:kunpo，然后将 json 对象转为字符串，再加上一个字符 d ，最后将 t.s 替换为算完的 hash 值。这部分 sign 是对单独对数据部分进行校验的，代码比较简单。对应的值就是数据包里 result 里面的 s 。

两处 sign 算法都调用了 Js.I.hash 方法计算，跟到hash算法实现部分，最终都是调用了windows.md5，就是普通的MD5算法。

![](https://attach.52pojie.cn/forum/201906/27/194909xtofee4no8si4a8n.png)

逻辑和算法都弄清楚之后，我们发现还有wx\_appid, wx\_secret这两个值我们没有，跟到相应的位置，凭代码看不出来什么：

![](https://attach.52pojie.cn/forum/201906/27/194922i3dls7oex6ledd5o.png)

通过动态调试获得了自己的 appID，secret 和 secret1 等参数值，

![](https://attach.52pojie.cn/forum/201906/27/194924g3xvc9xts0eq382e.png)

OK，到了这步，我们基本上就搞定了程序完整的一些逻辑。

## 六、校验机制还原

我们先看第一个校验，就是数据包里的 s 签名值，我们把主要逻辑拿出来，走一遍就可以，代码如下：

```
<script src='md5.min.js'></script>
<script>

var t={"uid":"***","isPingJiaed":false,"isSoundOff":true,"isShackOff":false,"GMTimeG":-1,"GMTimeP":-1,"shareTime":-1,"level":237,"levelMax":237,"lDamage":740,"lCount":360,"lJiaZhi":550,"lRiChang":550,"curFu":8,"levelFuCount":[3,1,1,1,1,1,1,1,33,1],"levelFuDamage":[22,20,1,1,1,1,1,1,722,1],"getTime":"0","bgIndex":6,"bgmIndex":2,"money":"2589626","tipFU":false,"G1":false,"G2":false,"tiLi":80,"tiLiBackTime":1556499997717,"today":29,"playCount":5,"shareCount":0,"videoCount":0,"isGuanZhu":0,"isShouCang":true,"tryFuCount":0,"pos":"北京,北京","posUpdate":28,"zuanShi":0,"teQuanTime":-1,"isTeQuaned":false,"jiFenId":[""],"getTime2":1556500058658,"teQuanShowed":false,"teQuanGetTime":-1,"loginTime":0,"EM_isFirst":true,"EM_score":0,"EM_localRank":0,"EM_refreshRankTime":0,"nickName":"","mode":1,"wjCount":0,"ID":***}
        t.s = "kunpo";
        var e = JSON.stringify(t) + String.fromCharCode(100);
        console.log(e)
        t.s = md5(e)
        console.log(t.s)
        console.log(t)
</script>
```

其实很简单，就是拿到数据包部分，注意，前面有一个 v 字段不参与校验，写入 's':'kunpo' ，做MD5，再把值填回去，跟我们抓包得到的MD5值相同，说明校验成功。

再来看第二个校验，这次校验是针对整个数据包部分做的校验。

```
<script src='md5.min.js'></script>
<script>

var e = []
var i = "";
var t = {
        plat:"wx",
        v:'1',
        record:数据,
        time:1556598662284,
        openid:"***",
        wx_appid:"***",
        wx_secret:"***",
        }
        for (var s in t){
                e.push(s);
        }
        console.log(e)
        e.sort(function(t, e) {
                return t > e ? 1 : t < e ? -1 : 0
    });
        var n;
        for (n in e) i += (s = e[n]) + "=" + t[s] + "&";
        console.log(i.substring(0, i.length - 1));
        console.log(md5(i.substring(0, i.length - 1)));
</script>
```

其他接口调用的都是第二个校验，调取不同的接口就把不同的数据扔进record中就可以了。

在调用我们所关注的 /api/archive/upload 接口时，传入的数据格式为：

```
"{\"v\":\"***\",\"uid\":\"***\",\"isPingJiaed\":false,\"isSoundOff\":true,\"isShackOff\":false,\"GMTimeG\":-1,\"GMTimeP\":-1,\"shareTime\":-1,\"level\":1161,\"levelMax\":1161,\"lDamage\":1200,\"lCount\":360,\"lJiaZhi\":622,\"lRiChang\":621,\"curFu\":8,\"levelFuCount\":[3,1,1,1,1,1,1,1,33,1],\"levelFuDamage\":[22,20,1,1,1,1,1,1,1200,1],\"getTime\":\"0\",\"bgIndex\":5,\"bgmIndex\":3,\"money\":\"18147188\",\"tipFU\":false,\"G1\":false,\"G2\":false,\"tiLi\":80,\"tiLiBackTime\":1556615771635,\"today\":30,\"playCount\":5,\"shareCount\":0,\"videoCount\":0,\"isGuanZhu\":0,\"isShouCang\":true,\"tryFuCount\":0,\"pos\":\"北京,北京\",\"posUpdate\":28,\"zuanShi\":0,\"teQuanTime\":-1,\"isTeQuaned\":false,\"jiFenId\":[\"\"],\"getTime2\":1556615812623,\"teQuanShowed\":false,\"teQuanGetTime\":-1,\"loginTime\":0,\"EM_isFirst\":true,\"EM_score\":0,\"EM_localRank\":0,\"EM_refreshRankTime\":0,\"nickName\":\"\",\"mode\":1,\"wjCount\":0,\"ID\":***,\"s\":\"***\"}"
```

实际上就是我们之前校验好的数据包，在前面添加了v。

OK，我们先简单修改一下金币，将金币改为12345，看看效果。

可以看到返回是成功的，接下来我们将小程序删除，重新添加，为了避免本地数据再次更新到服务器上，重新加载游戏后发现修改成功。

## 七、代码实现

每次去执行这个流程并手动计算是重复性劳动，并且在这几天网上搜集资料的时候竟然发现淘宝还有卖这东西的。

按照这样的流程，使用你会的语言写出来就可以了，我使用的是python。

![](https://attach.52pojie.cn/forum/201906/27/194942twwwk5waoef3ys31.png)

可以看到我们把副武器和主武器的伤害加到1200（满级），射速调到32，金币改到了 999999，级别调成了996。

下面是截图：

![](https://attach.52pojie.cn/forum/201906/27/195006nz5006bd6axtal5u.png)

完成~撒花~收工~

此处有几个需要注意的点是：

* 第一，这个数据中 money（金币）参数的值是字符串类型，而不是数字型的；
* 第二，在调取不同接口时由于传参的不同，使用的 wx\_secret 不同，需要区别对待（这个位置坑了我很长时间）。具体哪处调用了哪处可以参考我的代码，里面都是写死的；
* 第三，数据是有上限的，部分数据会牵扯到游戏中的一些算法，比如病毒生成等等，改太高会出错的，一旦你数据在拉回本地解析出现问题，将会弹窗报错，并 upload 成初始化等级，只不过是从头再来；
* 第四，经过多个账号测试，不同渠道的游戏版本更迭不同，校验方式不一样，有的来源使用的是老版本的校验，有的来源是新版本的，因此校验方法是不通用的！！！不通用的！！！不通用的！！！我这个只对应安卓微信新版本的校验，老版本的网上都有很多教程和工具了。至于是哪个版的判断一下 archive/get 接口返回的数据就好了。
* 先执行登录操作，再执行获取数据，否则服务器返回的 loginTime 值为 null，本地解析也会产生问题。

到这里就结束了，欢迎大家讨论，新人发文不易，希望大家多多支持。。
