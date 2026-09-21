# Python反反爬之JS混淆-源码乱码 (  详细教程 )

> **作者**: Java_S | **发布时间**: 2020-12-25 17:56:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 13732 / 23
> **原文**: [https://www.52pojie.cn/thread-1337317-1-1.html](https://www.52pojie.cn/thread-1337317-1-1.html)

---

## 写在前面

很早之前在吾爱破解论坛上看见了【猿人学】Web端爬虫攻防大赛,当时进入他们官网的时候,比赛已经结束了。看着那些题目还挺有意思的,但由于各种原因一直没有机会去做那些题目。最近比较闲,就去把猿人学官网打开看了一下,尝试着完成了第一道题目---JS混淆[源码乱码],当然我也去看了两位大佬的讲解,一位是吾爱论坛的[漁滒](https://www.52pojie.cn/forum.php?mod=viewthread&tid=1288315&extra=page%3D3%26filter%3Dtypeid%26typeid%3D29),另一位是B站的[暗螟蛉](https://www.bilibili.com/video/BV1yz4y1o7Ex?t=165)

由于这是一篇迟到的教程,所有我写比较详细,希望对大家有所帮助
文章原链接<https://syjun.vip/archives/278.html>
![](https://syjun.vip/usr/uploads/2020/12/4144543834.png)

### 题目

![](https://syjun.vip/usr/uploads/2020/12/918756882.jpg)

抓取所有（5页）机票的价格，并计算所有机票价格的平均值，填入答案。
题目看着挺简单,就是抓取机票的价格,并算出平均值,但是当我们打开开发者调试工具的时候,就会遇到第一个坑

### 关闭断点

当我们打开调试工具的时候,会弹出这么一个页面
![](https://syjun.vip/usr/uploads/2020/12/3562585465.jpg)
这是一个debug断点,会阻拦我们后面的操作,但是并没有什么关系,很简单就能把它关闭
![](https://syjun.vip/usr/uploads/2020/12/2985411999.jpg)

### 查看数据来源

接着,我们点击【Network】,按ctrl+f5刷新网页,又会出现阻拦的操作,我们依然点击刚才箭头符号,就可以解决
![](https://syjun.vip/usr/uploads/2020/12/2781103109.jpg)
![](https://syjun.vip/usr/uploads/2020/12/2777508551.jpg)

接着,我们回到【Network】,点击【XHR】,就会发现多了一条信息
至于,为什么要去点击【XHR】而不是点击其他的地方;其实也很简单,你稍微去检测一下这个网页,就会发现,机票的价格是通过XHR请求获取到的
有些小伙伴可能就要问了,什么是XHR请求,你可以去这篇文章看看[XHR 请求](https://www.w3cschool.cn/ajax/ajax-xmlhttprequest-send.html)
回过头来,我们来看看多出来的那条信息
![](https://syjun.vip/usr/uploads/2020/12/3872596651.jpg)
查看这条信息的Header,发现它的URL很有意思,特别是画蓝色下划线的地方,这里我们先不管,我们接着看一下Preview
这就更有意思了,如我们所预料的,机票的价格都包含在这里面
![](https://syjun.vip/usr/uploads/2020/12/370892615.jpg)

### 分析URL

链接和数据都找了,我们去访问一下刚刚的链接(间隔了一段时间),理所当然的报错了

```
{"error": "token failed"}
```

我们看一下这条链接
> <http://match.yuanrenxue.com/api/match/1?m=f289e3140053a9320c137b67e8723ba3%E4%B8%A81608971657>

经常写爬虫的同学就会发现,后面的数字串【1608971657】,一定是一个时间戳
也就是说,要想正常的访问这条链接拿到数据,一定要有正常的时间戳
那么,何为正常的时间戳,一定和前面的字符串有关(m=f289e3140053a9320c137b67e8723ba3%E4%B8%A8)

我们继续刷新页面,发现【m=...】里面的字符串随着时间的推移都在进行变化,唯独[%E4%B8%A8]没变

[%E4%B8%A8],这个我想大家只要用过百度搜索就应该很熟悉吧,它是经过UrlEncode处理得到的,我们只需要反解码就能知道[%E4%B8%A8]到达是个什么东东
我们来到,[站长工具](http://tool.chinaz.com/tools/urlencode.aspx),将它进行解码
![](https://syjun.vip/usr/uploads/2020/12/1432527186.jpg)
很容易的,我们得到了它的值------> **丨**  (没错就是这么一个中文符号)

### 寻找丨符号

根据题目的提示[js混淆 源码乱码],我们可以想到一个很清晰的思路,就是去源码当中查找 **丨**
回到页面,点击鼠标右键,点击[查看网页源代码]
按crtl+F ,搜索**丨** 符号,会找到唯一的一处代码
仔细地查看代码,发现它是写在script标签里面的
我们将整个script标签复制下来,到notepad++里面打开

```
<script>window.url='/api/match/1';request=function(){var timestamp=Date.parse(new Date()) + 100000000;var m=oo0O0(timestamp.toString())+window.f;var list={"page":window.page,"m":m+'丨'+timestamp/1000};$.ajax({url:window.url,dataType:"json",async:false,data:list,type:"GET",beforeSend:function(request){},success:function(data){data=data.data;let html='';let us_sign=`<div class="b-airfly"><div class="e-airfly"data-reactid=".1.3.3.2.0.$KN5911.0"><div class="col-trip"data-reactid=".1.3.3.2.0.$KN5911.0.0"><div class="s-trip"data-reactid=".1.3.3.2.0.$KN5911.0.0.0"><div class="col-airline"data-reactid=".1.3.3.2.0.$KN5911.0.0.0.0"><div class="d-air"data-reactid=".1.3.3.2.0.$KN5911.0.0.0.0.0:$0"><div class="air"data-reactid=".1.3.3.2.0.$KN5911.0.0.0.0.0:$0.0"><span data-reactid=".1.3.3.2.0.$KN5911.0.0.0.0.0:$0.0.1">中国联合航空</span></div><div class="num"data-reactid=".1.3.3.2.0.$KN5911.0.0.0.0.0:$0.1"><span class="n"data-reactid=".1.3.3.2.0.$KN5911.0.0.0.0.0:$0.1.0">KN5911</span><span class="n"data-reactid=".1.3.3.2.0.$KN5911.0.0.0.0.0:$0.1.1">波音737(中)</span><noscript data-reactid=".1.3.3.2.0.$KN5911.0.0.0.0.0:$0.1.2"></noscript></div></div><noscript data-reactid=".1.3.3.2.0.$KN5911.0.0.0.0.1"></noscript></div><div class="col-time"data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1"><div class="sep-lf"data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1.0"><h2 data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1.0.0">13:50</h2><p class="airport"data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1.0.1"><span data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1.0.1.0">大兴国际机场</span><span data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1.0.1.1"></span></p></div><div class="sep-ct"data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1.1"><div class="range"data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1.1.0">3小时40分钟</div><div class="line"data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1.1.1"></div></div><div class="sep-rt"data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1.2"><noscript data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1.2.0"></noscript><h2 data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1.2.1">17:30</h2><p class="airport"data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1.2.2"><span data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1.2.2.0">宝安机场</span></p></div><noscript data-reactid=".1.3.3.2.0.$KN5911.0.0.0.1.3"></noscript></div></div></div><div class="col-price"data-reactid=".1.3.3.2.0.$KN5911.0.1"><p class="prc"data-reactid=".1.3.3.2.0.$KN5911.0.1.0"><span data-reactid=".1.3.3.2.0.$KN5911.0.1.0.0"><i class="rmb"data-reactid=".1.3.3.2.0.$KN5911.0.1.0.0.0">¥</i><span class="fix_price"data-reactid=".1.3.3.2.0.$KN5911.0.1.0.0.1"><span class="prc_wp"style="width:48px">price_sole</span></span></span></p><div class="vim"data-reactid=".1.3.3.2.0.$KN5911.0.1.1"><span class="v dis"data-reactid=".1.3.3.2.0.$KN5911.0.1.1.$0"></span></div></div><div class="col-fold"data-reactid=".1.3.3.2.0.$KN5911.0.2"><p class="fd"data-reactid=".1.3.3.2.0.$KN5911.0.2.0">收起</p></div></div><noscript data-reactid=".1.3.3.2.0.$KN5911.1"></noscript></div>`;let choice=['中国南方航空','吉祥航空','奥凯航空','九元航空','长龙航空','东方航空','中国国际航空','深圳航空','海南航空','春秋航空','上海航空','西部航空','重庆航空','西藏航空','中国联合航空','云南祥鹏航空','云南英安航空','厦门航空','天津航空','山东航空','四川航空','华夏航空','长城航空','成都航空有','北京首都航空','中华航空','意大利国家航空公司','印度百捷航空','越南航空','远东航空','印度航空公司','印度捷特航空有限公司','以色列航空公司','意大利航空','伊朗航空公司','印度尼西亚鹰航空公司','英国航空公司','西方天空航空','西捷航空','西班牙欧洲航空公司','西班牙航空公司','中国南方航空','吉祥航空','奥凯航空','九元航空','长龙航空','东方航空','中国国际航空','深圳航空','海南航空','春秋航空','上海航空','西部航空','重庆航空','西藏航空','中国联合航空','云南祥鹏航空','云南英安航空','厦门航空','天津航空','山东航空','四川航空','华夏航空','长城航空','成都航空有','北京首都航空','中华航空','意大利国家航空公司','印度百捷航空','越南航空','远东航空','印度航空公司','印度捷特航空有限公司','以色列航空公司','意大利航空','伊朗航空公司','印度尼西亚鹰航空公司','英国航空公司','西方天空航空','西捷航空','西班牙欧洲航空公司','西班牙航空公司'];let op=1; let jic=['北京首都国际机场','上海虹桥国际机场','上海浦东国际机场','天津滨海国际机场','太原武宿机场','呼和浩特白塔机场','沈阳桃仙国际机场','大连周水子国际机场','长春大房身机场','哈尔滨阎家岗国际机场','齐齐哈尔三家子机场','佳木斯东郊机场','厦门高崎国际机场','福州长乐国际机场','杭州萧山国际机场','合肥骆岗机场','宁波栎社机场','南京禄口国际机场','广州白云国际机场','深圳宝安国际机场','长沙黄花机场','海口美亚机场','武汉天河机场','济南遥墙机场','青岛流亭机场','南宁吴墟机场','三亚凤凰国际机场','重庆江北国际机场','成都双流国际机场','昆明巫家坝国际机场','昆明长水国际机场','桂林两江国际机场','西安咸阳国际机场','兰州中川机场','贵阳龙洞堡机场','拉萨贡嘎机场','乌鲁木齐地窝堡机场','南昌向塘机场','郑州新郑机场','北京首都国际机场','上海虹桥国际机场','上海浦东国际机场','天津滨海国际机场','太原武宿机场','呼和浩特白塔机场','沈阳桃仙国际机场','大连周水子国际机场','长春大房身机场','哈尔滨阎家岗国际机场','齐齐哈尔三家子机场','佳木斯东郊机场','厦门高崎国际机场','福州长乐国际机场','杭州萧山国际机场','合肥骆岗机场','宁波栎社机场','南京禄口国际机场','广州白云国际机场','深圳宝安国际机场','长沙黄花机场','海口美亚机场','武汉天河机场','济南遥墙机场','青岛流亭机场','南宁吴墟机场','三亚凤凰国际机场','重庆江北国际机场','成都双流国际机场','昆明巫家坝国际机场','昆明长水国际机场','桂林两江国际机场','西安咸阳国际机场','兰州中川机场','贵阳龙洞堡机场','拉萨贡嘎机场','乌鲁木齐地窝堡机场','南昌向塘机场','郑州新郑机场'];if(window.page){}else{window.page=1}$.each(data,function(index,val){html+=us_sign.replace('price_sole',val.value).replace('中国联合航空',choice[op*window.page]).replace('大兴国际',jic[parseInt(op*window.page/2)+1]).replace('宝安机场',jic[jic.length-parseInt(op*window.page/2)-1]);op+=1});$('.m-airfly-lst').text('').append(html)},complete:function(){},error:function(){alert('数据拉取失败。可能是触发了风控系统，若您是正常访问，请使用谷歌浏览器无痕模式，并且校准电脑的系统时间重新尝试');alert('生而为虫，我很抱歉，请刷新页面，查看问题是否存在');$('.page-message').eq(0).addClass('active');$('.page-message').removeClass('active')}})};request()</script>
```

粘贴到notepad++,你会发现全部的代码都浓缩成一行了
不要慌,我们可以使用notepad++自带的插件JSTool里面的JSFormat,即可将JS的代码格式化,得到如下结果
(如果没有JSTool插件,可以在notepad++里面安装一下)
![](https://syjun.vip/usr/uploads/2020/12/4080832717.jpg)

ajax里面的内容可以不用管,我们删除多余的代码,可以得到简化后的代码

```
<script>
request = function () {
    var timestamp = Date.parse(new Date()) + 100000000;
    var m = oo0O0(timestamp.toString()) + window.f;
    var list = {
        "page": window.page,
        "m": m + '丨' + timestamp / 1000
    };
};
request()
</script>
```

var list  里面的内容,也可以不用管,这里面主要就是包含页码,和m值,于是我们可以再次精简

```
var timestamp = Date.parse(new Date()) + 100000000;
var m = oo0O0(timestamp.toString()) + window.f;
```

这里的变量m,是不是很熟悉,我们再来看一下之前的链接
 > <http://match.yuanrenxue.com/api/match/1?m=f289e3140053a9320c137b67e8723ba3%E4%B8%A81608971657>
大胆的猜测一下,m后面的值肯定是通过这里的代码实现的
我们先来看一下var m 后面的内容

* **oo0O0()**,肯定是一个函数
* **timestamp.toString()**,有一点编程基础的同学应该能猜到,这是将时间戳的一串数字转化成字符串类型
* **window.f**,窗口这个对象调用了f,至于f是什么东东,我们先不管

很显然,我们又有了一个新的突破口,**oo0O0()**函数

### 分析oo0O0()函数

我们回到包含网页源码的页面,搜索[oo0O0]
会找到两处代码,一处肯定是定义此函数的代码,而另一处就是调用函数的代码
我们将定义此函数的代码复制下来

```
function oo0O0(mw) {
    window.b = '';
    for (var i = 0, len = window.a.length; i < len; i++) {
        console.log(window.a[i]);
        window.b += String[document.e + document.g](window.a[i][document.f + document.h]() - i - window.c)
    }
    var U = ['W5r5W6VdIHZcT8kU', 'WQ8CWRaxWQirAW=='];
    var J = function (o, E) {
        o = o - 0x0;
        var N = U[o];
        if (J['bSSGte'] === undefined) {
            var Y = function (w) {
                var m = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=',
                T = String(w)['replace'](/=+$/, '');
                var A = '';
                for (var C = 0x0, b, W, l = 0x0; W = T['charAt'](l++); ~W && (b = C % 0x4 ? b * 0x40 + W : W, C++ % 0x4) ? A += String['fromCharCode'](0xff & b >> (-0x2 * C & 0x6)) : 0x0) {
                    W = m['indexOf'](W)
                }
                return A
            };
            var t = function (w, m) {
                var T = [],
                A = 0x0,
                C,
                b = '',
                W = '';
                w = Y(w);
                for (var R = 0x0, v = w['length']; R < v; R++) {
                    W += '%' + ('00' + w['charCodeAt'](R)['toString'](0x10))['slice'](-0x2)
                }
                w = decodeURIComponent(W);
                var l;
                for (l = 0x0; l < 0x100; l++) {
                    T[l] = l
                }
                for (l = 0x0; l < 0x100; l++) {
                    A = (A + T[l] + m['charCodeAt'](l % m['length'])) % 0x100,
                    C = T[l],
                    T[l] = T[A],
                    T[A] = C
                }
                l = 0x0,
                A = 0x0;
                for (var L = 0x0; L < w['length']; L++) {
                    l = (l + 0x1) % 0x100,
                    A = (A + T[l]) % 0x100,
                    C = T[l],
                    T[l] = T[A],
                    T[A] = C,
                    b += String['fromCharCode'](w['charCodeAt'](L) ^ T[(T[l] + T[A]) % 0x100])
                }
                return b
            };
            J['luAabU'] = t,
            J['qlVPZg'] = {},
            J['bSSGte'] = !![]
        }
        var H = J['qlVPZg'][o];
        return H === undefined ? (J['TUDBIJ'] === undefined && (J['TUDBIJ'] = !![]), N = J['luAabU'](N, E), J['qlVPZg'][o] = N) : N = H,
        N
    };
    eval(atob(window['b'])[J('0x0', ']dQW')](J('0x1', 'GTu!'), '\x27' + mw + '\x27'));
    return ''
}
```

先不着急研究里面的代码,先看看函数的返回值,居然是个空字符串
那么,这就意味着 [ var m = window.f ]

```
var m = oo0O0(timestamp.toString()) + window.f;
var m = window.f
```

所有,m就只跟window.f有关了,那么window.f是什么呢,去那里找呢?

### 寻找window.f

怎么找到[window.f],首先我们能想到的,就是去源码中搜索,但是结果并没有那么理想,只出现了一处代码,也就是刚刚那一处代码

在源码中找不到,但是又使用了[window.f],肯定是通过间接的方式定义赋值的,那么它又在在那里定义的呢?

我们再来看一下这行代码

```
var m = oo0O0(timestamp.toString()) + window.f;
```

oo0O0函数执行了,但是却返回的空值;而且oo0O0()里面却有很多代码,开发者肯定不会这么闲吧
也不排除,开发者写这些没有的代码误导我们,但是这里面肯定是有内容的

经常做逆向的同学,肯定熟悉eval()函数,而这个函数也出现在了oo0O0()里面
JS中的 eval() 函数可计算某个字符串，并**执行其中的的 JavaScript 代码**
我们再来看一下,oo0O0()函数中的eval()部分

```
eval(atob(window['b'])[J('0x0', ']dQW')](J('0x1', 'GTu!'), '\x27' + mw + '\x27'));
```

而eval()里面还调用了一个函数atob()
atob() 方法用于解码使用 base-64 编码的字符串
我们将 【atob(window['b'])】复制下来,在调试工具的Console运行一下,可以得到了下列代码
![](https://syjun.vip/usr/uploads/2020/12/1460446615.jpg)
我们将这些代码复制下来,在notepad++里面格式化一下,就可以得到md5加密的算法,我这里展示一下部分代码
![](https://syjun.vip/usr/uploads/2020/12/2718377210.jpg)
可以很清楚的看到,【window.f】出现了,通过调用hex\_md5()来实现赋值;但是又出现了一个新的问题,【mwqqppz】是什么呢?

### 寻找mwqqppz

我们再来看一下刚刚提到的eval代码片段

```
eval(atob(window['b'])[J('0x0', ']dQW')](J('0x1', 'GTu!'), '\x27' + mw + '\x27'));
```

可以看到eval函数里面除了atob(window['b'],还有

* **J('0x0', ']dQW')**
* **J('0x1', 'GTu!')**
* **'\x27' + mw + '\x27'**

我们再到调试工具的Console运行一下上面列出来的代码
![](https://syjun.vip/usr/uploads/2020/12/3163345088.jpg)
工具给出了报错提示,[没有找到J]
这是因为oo0O0()函数里面还有一些代码段没有执行
我们先把oo0O0()函数里面eval函数上面的所有代码复制,然后去Console中运行一下

运行完后,可能会输出一些内容,我们可以不管,接着再次运行**J('0x0', ']dQW')**,就可以得到结果
![](https://syjun.vip/usr/uploads/2020/12/4002060050.jpg)
接着,我们依次运行**J('0x1', 'GTu!')**  ,  **'\x27' + mw + '\x27'**,可以得到下列结果
![](https://syjun.vip/usr/uploads/2020/12/1679361391.jpg)

熟悉的 mwqqppz 是不是出现了呢

但是,工具又报了一个错,[ mw没有找到 ]
这是因为[ mw ]是oo0O0()函数的一个形参
我们回顾一起前面的代码,就知道了

```
var timestamp = Date.parse(new Date()) + 100000000;
var m = oo0O0(timestamp.toString()) + window.f;
function oo0O0(mw) {
...
}
```

这样大家就能理解了,[ mw ] 就是传进来的一个字符串时间戳

那么,[ '\x27'  ]是什么呢,我们只需要在Console运行一下就知道了
'\x27' = '  (没错就是单引号)

### 翻译eval()函数

知道eval()函数里面的奇怪符号的意义后,我们就可以翻译一下eval()代码片段

```
eval(atob(window['b'])[J('0x0', ']dQW')](J('0x1', 'GTu!'), '\x27' + mw + '\x27'));

eval(atob(window['b'])["replace"]("mwqqppz",'mw'));
```

可能还是有些小伙伴看不懂这行代码,我用Python的语法规则,写一下这行代码,你肯定能懂

```
eval(atob(window['b']).replace("mwqqppz",'mw'));
```

其实,很好理解,就是将【atob(window['b'])】里面的【mwqqppz】替换成【mw】
也就是,将【mwqqppz】替换成字符串的时间戳

### 明白window.f的值从何而来

读到这里的小伙伴,相信你们大致明白了window.f的值从何而来

```
var timestamp = Date.parse(new Date()) + 100000000;
var m = oo0O0(timestamp.toString()) + window.f;
var m = window.f;
var m = hex_md5(mwqqppz);
var m = hex_md5(timestamp);
```

通过上面的代码,逻辑已经很清晰了(当面你要从头看到这)
现在我们就通过鬼鬼JS调试工具测试一下,我们的分析对不对

### 验证答案

首先,我们将【atob(window['b'])】在调试工具Console中运行得到的代码,复制到鬼鬼调试工具中
写一个验证答案的函数

```
function get_cipher(){
    timestamp = '1608971657000';
    f = hex_md5(timestamp);
    return f;
}
```

这里面的时间戳,来源于文章开头的链接

> <http://match.yuanrenxue.com/api/match/1?m=f289e3140053a9320c137b67e8723ba3%E4%B8%A81608971657>

运行代码,可以看到加密后的时间戳与链接中的密文一模一样
现在,我们就可以愉快的编写Python代码爬取网页数据啦!
![](https://syjun.vip/usr/uploads/2020/12/4197663994.jpg)

### 最后的爬虫和解出答案

通过上面的一顿操作,我们可以编写一个JS文件,用于生成链接后面的密文
在Python代码中可以通过第三方库execjs,执行这个JS文件,得到密文

(由于代码有点多,我就不展示了,下面以文件的方式给大家)

话不到多,直接上爬虫代码,很简单,写了一些注释,我就不详细赘述了

```
# @BY     :Java_S
# @Time   :2020/12/25 9:10
# @Slogan :够坚定够努力大门自然会有人敲,别怕没人赏识就像三十岁的梵高

import requests
import execjs
import time

def get_md5_value():
    # 导入JS,读取需要的js文件
    with open(r'JS/jsConfuse.js',encoding='utf-8',mode='r') as f:
        JsData = f.read()
    # 加载js文件,使用call()函数执行,传入需要执行函数即可获取返回值
    psd = execjs.compile(JsData).call('get_cipher')
    psd = psd.replace('丨','%E4%B8%A8')
    return psd

def get_data(page_num,md5):
    url = f'http://match.yuanrenxue.com/api/match/1?page={page_num}&m={md5}'
    headers = {
        'Host':'match.yuanrenxue.com',
        'Referer':'http://match.yuanrenxue.com/match/1',
        'User-Agent':'yuanrenxue.project',
    }
    response = requests.get(url,headers=headers)
    return response.json()

if __name__ == '__main__':

    sum_num = 0
    index_num = 0

    for page_num in range(1,6):
        info = get_data(page_num,get_md5_value())
        price_list = [i['value'] for i in info['data']]
        print(f'第{page_num}页的价格列表{price_list}')
        sum_num += sum(price_list)
        index_num += len(price_list)
        time.sleep(1)

    average_price = sum_num / index_num
    print(f'机票价格的平均值:{average_price}')
```

![](https://syjun.vip/usr/uploads/2020/12/196389383.jpg)

---
