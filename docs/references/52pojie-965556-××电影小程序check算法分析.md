# ××电影小程序check算法分析

> **作者**: xiaobiao | **发布时间**: 2019-05-27 15:18:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 63835 / 260
> **原文**: [https://www.52pojie.cn/thread-965556-1-1.html](https://www.52pojie.cn/thread-965556-1-1.html)

---

**前前言**
首先是先说明一下，本篇文章是基于的 [@案首梦](https://www.52pojie.cn/home.php?mod=space&uid=805015) [[微信消灭病毒sign算法分析](https://www.52pojie.cn/thread-951589-1-1.html)] 前提作为基础思路进行的搞事情，由于相关原理文字解释 @案首梦 写的较好，所以部分文段会直接摘抄，但走的思路完全是独立弄出，本文仅提供[破解](https://www.52pojie.cn)思路。

**前言**
最近得到了几张某达实体票，去看妇联的时候居然要使用四张兑换券才能换两张电影票！不得不感叹漫威粉们的狂热！

好了，扯远了~当时实体票是去到电影院兑换的座位，看了票背面其实是支持在线兑换座位，票上有两个大二维码，分别是下载APP和关注公众号，于是下载APP准备兑换剩下的券，然后进入钱包兑换券，当看到券码上的纯数字的卡号和密码，心中一记，看看能不能走撞裤，服务器挂个脚本自动去撞，免费的电影票唾手可得啊~理想很美好，那么就来试试![](https://note.youdao.com/yws/public/resource/f6f9314534bfa5789a272e90acc7d3e6/0F4F0CF3BB8E47D1B2E98AE1CDED639B)

试错二十几次后都提示兑换码不存在，感觉没有风控，于是就想搞一搞事情。

![](https://attach.52pojie.cn/forum/201905/27/160733rkyvopy33kioacy8.png)

**一、初步抓包**
测试手机为小米9，抓包软件各种各样，本机APP可以优先选择Packet Capture和HttpCanary，两种软件傻瓜式操作，如果要抓https都需要装个CA证书，推荐使用HttpCanary可扩展性高且样式较多

![](https://attach.52pojie.cn/forum/201905/27/155714q1c1rn1nnsk617ru.png)

在 HttpCanary 选择指定APP

![](https://attach.52pojie.cn/forum/201905/27/155717va7lrssigz77lrjw.png)

再打开APP开始抓包，可以看到我们抓到两个包

![](https://attach.52pojie.cn/forum/201905/27/155549y0muz5t6466mmh9u.png)

首先是第一个请求

![](https://attach.52pojie.cn/forum/201905/27/155610pkxmnxp6jpwpk6p5.png)

然后是第二个请求

大概可以猜测主请求为第二个，首先访问形式是get，参数都是放在header上面，由于水表问题打了一些码，可知主要参数为MX-API，格式如下（敏感数据以\*\*\*显示）：

{"ver":"6.5.1","cCode":"1\_2","sCode":"Wanda","appId":2,"\_mi\_":"\*\*\*","width":1280,"json":true,"check":"\*\*\*","Accept-Encoding":"gzip, deflate","ts":1550668891000,"heigth":720}

其中\_mi\_为固定长度字符串，猜测是身份id，check为加密串，ts为13位的unix时间戳，测试在同个码的情况下，ts和check码为动态变动，可知check是包含ts值的32位小写MD5，当然，由于动态，也意味着...

![](https://attach.52pojie.cn/forum/201905/27/155730mszsy15wz1yzw5g8.png)

常规md5库根本无从解答！

**二、再接再厉**

![](https://attach.52pojie.cn/forum/201905/27/155528e9slla2b23l9llsq.png)

本快要放弃了，突然想到他的第二个二维码，微信公众号，用小程序？想起前几天看到其他小程序算法分析的文章，立马动手起来

![](https://attach.52pojie.cn/forum/201905/27/155655ovyyxoyr82x2c68t.png)

测试的确是小程序没错，且界面都差不多，返回也一样，但是，HttpCanary抓包后显示ssl hand shake error异常，看来小程序https抓包是不行

![](https://attach.52pojie.cn/forum/201905/27/160745hrp7g5erepet0ex0.png)

通过404（谷歌）查询是知道从Android Nougat(7.0)开始，谷歌改变了网络安全策略。自签的CA证书将默认不被TLS/SSL连接信任，限制于一些策略，但是也有办法绕过，通过HttpCanary的开源github网址<https://github.com/MegatronKing/HttpCanary>可查询到好几种方式，这边是用下图方法后可以正常抓包

![](https://attach.52pojie.cn/forum/201905/27/155543wwkp2qcqzzt1gc5r.png)

但是，凡事讲究效率，小试之后我们直接祭出神器Burp Suite，需要电脑且需要提前配置，初步配置这里不再多说可以自行404，如果继续用HttpCanary也是可以完成下面抓包的

再次抓包，我们可以得到MX-API参数有所不同，但是check依旧存在，格式如下（敏感数据以\*\*\*显示）：

{"ver":"6.4.0","sCode":"Wanda","\_mi\_":"\*\*\*","width":1280,"json":true,"cCode":"XIAOCHENGXUGP","check":"\*\*\*","ts":1550668891000,"heigth":720,"appId":3}

**三、微信小程序源码获取**
获取办法：在已经ROOT的手机上使用RE文件管理器查看微信源码目录，并复制导出到电脑中。

微信小程序源文件保存在/data/data/com.tencent.mm/MicroMsg/.../appbrand/pkg/这个目录下，中间的“...”是一串32位的16进制字符串名文件夹。

如果有很多不确定是哪个的情况下，我的解决办法是删掉所有这样的目录，在微信中删掉小程序重新添加，就可以看到新创建的目录。找到指定目录并拷贝至电脑上，我们就获得了微信小程序的源代码，在我的手机上有两个wxapkg文件，不清楚是哪个，先都拷贝出来。

![](https://attach.52pojie.cn/forum/201905/27/155507l6jyigict62351ny.png)

下一步是反编译源文件，用大佬写的 wxappUnpacker，Github地址：<https://github.com/qwerty472123/wxappUnpacker>

我们首先安装nodejs环境：<https://nodejs.org/en/>

运行

![](https://attach.52pojie.cn/forum/201905/27/155719t26f3gtem523ft55.png)
进入刚下载的wxappUnpacker文件夹内，安装一下依赖：

npm install esprima
npm install css-tree
npm install cssbeautify
npm install vm2
npm install uglify-es
npm install js-beautify
npm install escodegen

最后使用这个命令进行反编译源文件：node wuWxapkg.js [-d] <files...> //files 就是你想要反编译的文件名

例如：我有一个需要反编译的文件 \_12345678\_123.wxapkg 已经解压到了D盘根目录下,那么就输出命令
node .\wuWxapkg.js D:\\_12345678\_123.wxapkg

![](https://attach.52pojie.cn/forum/201905/27/155538j0302eg2b7g21ysg.png)

这样我们就得到了某达小程序源码，对于微信小程序这种，我们可以简单理解为HTML+CSS+JS，只不过JS是微信JS而已。

所以在这个场景下，我们的思路就是找到小程序源码，看看JS里面有没有什么能利用的东西，对网络传输进行抓包，试试有没有漏洞。

关于这个游戏论坛上和网络其他位置已经有很多工具和教程了，本篇文章不会留工具，纯技术讨论，想要工具的可以直接关掉本文去404搜索其他文章了，本篇文章是纯技术流程！

**四、校验算法回顾**
为了保证数据在通信时的安全性，可以采用参数签名的方式来进行相关验证。这种方式的基本原理就是将传递的数据加一些参数做MD5，并跟随数据包一起进行传递，在服务器端进行再次验证，将计算得到的MD5与收到的MD5进行比对，如果不同，则说明数据包被篡改过。

这个过程就是为了防止数据包在传递过程中遭到篡改的一种校验算法。

sign签名的方式能够在一定程度上防止信息被篡改和伪造，但是对于微信小程序来说，逻辑都写在 JS 中，而 JS 源码是能够逆出来的，我们能够通过查看源代码得知程序逻辑，再更改数据包之后，我们自行组织逻辑，算出MD5，一同发送至服务器，就可以绕过校验。

我们目前面对的就是一个典型的web应用中前端sign逻辑校验情况，只不过这里不叫sign，叫做check，是存在安全问题的。

**五、分析小程序源码**

![](https://attach.52pojie.cn/forum/201905/27/155702gccyc85y65cyn75o.png)

首先我们先找check字符串，在四个文件都有，其中app-service.js最大，估计是程序主体，那么从这个开始

![](https://attach.52pojie.cn/forum/201905/27/155711eb0p7w10qibopmzw.png)

可能是为了压缩体积，部分代码直接连成一坨了，可以在<http://www.bejson.com/>重新格式化编码

![](https://attach.52pojie.cn/forum/201905/27/155658pya7zqp055rgjl9n.png)

经过初步查找找到我们的熟悉的代码块，但是app-service.js发现好几处这个代码块，同时vendor.js、MxApiHelper.js都有类似代码块

由于不懂JS，努力看了很久还是放弃了，app-service.js通过格式化校验已经近4w行，还没算这个js含有多个相同的代码块和其他js中相同的代码块，所以，我们决定弯道超车，通过微信开发小程序直接进行代码调试

**六、弯道超车**

![](https://attach.52pojie.cn/forum/201905/27/155522fe4o8eu8x66z656f.png)

安装最新版本微信web开发者工具，导入项目，AppID选择测试号即可

![](https://attach.52pojie.cn/forum/201905/27/155725yomzqrklmzwlx3xh.png)

编译提示报错，404得知这种情况去app.json把显示报错的全部去掉就行

![](https://attach.52pojie.cn/forum/201905/27/155727h4q9ftebp1ffh12b.png)

需要注意小程序走的是https，需要勾选不校验https，不然小程序跑不下去

![](https://attach.52pojie.cn/forum/201905/27/155634cps7sl7e77g7orrz.png)

倒腾一会，小程序终于活了，虽然与正常界面差别很多，不过毕竟是逆向，部分资源可能不完整，所以也没纠结，能找到check就行

![](https://attach.52pojie.cn/forum/201905/27/160748bwdn68xw8d6d7wgw.png)

![](https://attach.52pojie.cn/forum/201905/27/155621yelg58tkfttcftwi.png)

由于没有加载图片资源，显示为纯js，排版有些怪异，随意点击一个图片验证码，就发现我们心心念的check了（连请求个图片都要check也是没谁了）

然后我们修改可能是参数的代码块，比如width或者heigth参数，改成1、2、3这样排序，一是看这些参数是否影响check，二是看check到底在哪个代码块

最后我们可以确定刚才图片请求check来自MxApiHelper.js，打开区区100行（虽然还是看不懂），但是祭出开发工具最大杀器--断点调试，由于不知道哪里断点，就直接把100行代码全部断点了

![](https://attach.52pojie.cn/forum/201905/27/155732gi3andnnuupn7x4n.png)

可以看到点击获取图片后断点确实跳到这里，微信web开发工具调试最大的好处是你可以实时知道调试时各个参数的变量

![](https://attach.52pojie.cn/forum/201905/27/155722y6plpc8pxua9xxpx.png)

多步调试后，我们就可以看到即将要MD5的完整变量i参数（敏感数据以\*\*\*显示）：
WandaXIAOCHENGXUGP4906B2\*\*\*1550668891000/user/apply\_verify\_img\_code.apiphone=0&json=true

拆开来，可以看到是【sCode+cCode+4906B2\*\*\*+ts+请求api接口+未知参数】，暂不确定\_mi\_是否参加check计算

![](https://attach.52pojie.cn/forum/201905/27/155744gmbypyqpb2t72bua.png)

但是通过校验可加密出check参数，同时与调试产生的check相同，可知\_mi\_不在check的计算中

![](https://attach.52pojie.cn/forum/201905/27/155706gc53q3w3ffgcf38c.png)

其中4906B2\*\*\*一直不知道哪里产生的，直到后几次调试看到这个，才知道这是key

那么此时可以知道MD5前参数格式为【sCode+cCode+key+ts+请求api接口+未知参数】

之所以成为未知参数，是因为没有特定规律，比如获取一个验证码，后面的参数如下
/user/third\_mobile\_code.apithirdType=5&openId=undefined&mobile=0&json=true

苦于不会js（其实是代码太多不想看），寻求于404和各大论坛，但回想我们刚说过的算法回顾，这种方式的基本原理就是将传递的数据加一些参数做MD5，并跟随数据包一起进行传递，在服务器端进行再次验证，将计算得到的MD5与收到的MD5进行比对，所以，这些参数肯定请求url中！

![](https://attach.52pojie.cn/forum/201905/27/160743wucmom99oal3vm29.png)

通过各种尝试最后可以确定check格式为【sCode+cCode+key+ts+请求末尾完整url】

**七、最后挑战**
既然破解出通用check，一个成功的兑换除了票券编码，还有个密码，密码6位纯数字，最大也就是100w可能，没有风控接口可靠（连验证码都走check接口肯定冇问题的）多线程跑起一天不到的事。

我们用一个可以用的票券编码进入输入密码界面，进行抓包，得到如下请求（去除非必须header，敏感数据以\*\*\*显示）：：

![](https://attach.52pojie.cn/forum/201905/27/155554qu3i7zbj9ru6zxab.png)

GET /card/bind.api?card\_no=\*\*\*&password=\*\*\*&json=true HTTP/1.1
{"ver":"6.4.0","sCode":"Wanda","\_mi\_":"\*\*\*","width":1280,"json":true,"cCode":"XIAOCHENGXUGP","check":"\*\*\*","ts":1550668891000,"heigth":720,"appId":3}

但是我们这次发现，get请求的card\_no和password也有加密，而且card\_no是64位，password是32位，再将密码也填成和卡号一致，发现两个都是相同的64位加密，明显不是MD5的算法了

![](https://attach.52pojie.cn/forum/201905/27/160750o4erae9tr733sae1.png)

这就。。。比较尴尬了 ，由于微信开发工具拿到不太完整的源码，调试的小程序不能正常登录，所以也不能进入到测试密码界面来debug

怎么办，咱们可以先找下怎么得到这两个值在哪些文件有。

![](https://attach.52pojie.cn/forum/201905/27/155517ah3xftqqqtfddrwj.png)

通过搜索我们可以知道在app-service.js和index.js两个地方都有这两个字段，

然后我们再回想下刚才抓包每个api后面接的参数都是不一样，也就是我们一开始说的【未知参数】，但其实我们在app-service.js还是可以看出端倪

![](https://attach.52pojie.cn/forum/201905/27/155644y55o77b5d15p5hz5.png)

![](https://attach.52pojie.cn/forum/201905/27/155652py2jw2pyr0vyx2vr.png)

比如api后面的code=xxxx，其实在app-service.js还是能找到的

![](https://attach.52pojie.cn/forum/201905/27/155737ytccc3j18cb4zbi2.png)

![](https://attach.52pojie.cn/forum/201905/27/155559zkl7nfk76n23cb04.png)

在api后面的couponNo=xxxx，也可以找到

同理，我们也可以猜出，肯定有一段大概是这个样子的代码
var a = {
card\_no: b
password: c
};

![](https://attach.52pojie.cn/forum/201905/27/155640oj63hqznw8n75hb6.png)

找来找去，也就只有在index.js里面找出大概的字段，从代码可以知道是AES加密（不要问怎么知道的，上面写着AES）

![](https://attach.52pojie.cn/forum/201905/27/155742qxn48tnke89nju9n.png)

网上随意找了一个在线AES加密，下拉什么的可以看代码看出，加密模式是ECB，填充为pkcs7padding，数据块未知，偏移量未知，因为输出为纯小写字母和数字，没有base64标准的【==】标志，所以是hex，字符集未知

等等，有个密码？？？是的，AES加密其实是需要密码，类似与加盐后的MD5

最后实在没辙，在线请教大神，大神丢过来card\_no上面两行的一串字
n = t.default.clientKey.substr(0, 16);

![](https://attach.52pojie.cn/forum/201905/27/155533g6tsc3c3dbps6c3d.png)

也就是这行，大神解释说密码是n，n是这个变量的0-16位，clientKey？好像有点眼熟？

![](https://attach.52pojie.cn/forum/201905/27/155734dl07jcl6l4a600aa.png)

没错了，就是这个key前面的0-16位（key的二次复用）

这时我们把密码填成123456，抓包得到请求的password值就变为d48a93104ebcb43196ec847f60ef2cb2，由于数据块和字符集那些未知，都撞一下

![](https://attach.52pojie.cn/forum/201905/27/155513jgz17lqqiqll2ns7.png)

结果居然成了！

![](https://attach.52pojie.cn/forum/201905/27/155709k4sd72rr4qqc8tzc.png)

现在最后的问题是，怎么将这块加密转变为自己熟悉的语言

心细的同学可能发现有个o一直存在，和我们原来调试MxApiHelper.js有点异曲同工之处

![](https://attach.52pojie.cn/forum/201905/27/155630nssw9rsgr9msrz4n.png)

当输出加密前check的i值时，调用r，其实r就是调用了md5这个文件，也就是普通的MD5，只是js这里没有自带需要调用

![](https://attach.52pojie.cn/forum/201905/27/155604apzyp4yf4zwyqyl8.png)

同理，AES中的o也是如此，调用了aes/aes.js

自己平时用shell比较多，但是也不清楚AES和shell怎么转换，网上也没有现成的例子，那咱们就调用吧，把aes.js上传到咱们的Linux服务器，在服务器yum安装一个node，再写个js调用，把o和n重新定义下变量，在404找个传参的例子贴进来就可以直接用了。

![](https://attach.52pojie.cn/forum/201905/27/155626e3q369ulox73ljuo.png)

调用就能使用了

![](https://attach.52pojie.cn/forum/201905/27/155616vtllptp2htzzkp0z.png)

完成\~撒花\~收工\~

最后通过生成的card\_no和password再生成check，也能够正常校验，到这里就结束了，欢迎大家讨论。

**最后的最后**
最后的最后，我知道大家想问什么，其实都不说了，看图

![](https://attach.52pojie.cn/forum/201905/27/155648fkiw08k2qyy5j2g1.png)

那么就...

![](https://attach.52pojie.cn/forum/201905/27/160739rzmvjvrhw6wmmwb6.png)

其实当时试错和风控的距离，大概就是这样的情况

![](https://attach.52pojie.cn/forum/201905/27/160736z1ltbl5dtpq1kp33.png)

![](https://attach.52pojie.cn/forum/201905/27/155739v8typhhnitn1nd3t.png)

总结：破解的过程还是挺有趣的，尤其一些中间想到弯道超车的想法，当然本身不懂js的确是硬伤，也感谢大神强锅的指点和帮助，虽然免费电影票不行了，但是复联4咱们还是可以再多刷几次。

PS：Discuz!的图片处理真心不好搞~~~

============================================华丽的文章结束线======================================================
