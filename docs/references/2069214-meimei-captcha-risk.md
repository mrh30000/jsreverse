# 某美验证码及风控浅析一

> **作者**: 中二 | **发布时间**: 2025-10-31 20:38:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6590 / 15
> **原文**: [https://www.52pojie.cn/thread-2069214-1-1.html](https://www.52pojie.cn/thread-2069214-1-1.html)

---

*本帖最后由 wangguang 于 2025-11-1 20:21 编辑*

## 声明

本文章中所有内容仅供学习交流使用，不用于其他任何目的，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关！若有侵权，请联系作者删除。

## 前言

记录一下逆向某登陆的总结!关键部分已做打码处理，网址敏感，暂不分享(笔者可不想再来一发！)，后续会提供分析样本，感谢理解。emmm，这次登录总共遇到了某美滑块验证码,某美指纹风控。接下来就进入正题吧老铁们！

## 接口分析

提交登录触发事件之后总共出现n个数据包。其中有用的就是验证码接口，风控接口和校验接口。先简单说一下吧，接口返回的顺序就是首先就是register接口，web接口，fverify接口，最后是verify接口。

### register接口

* organization：某美产品唯一标识
* callback：回调ID
* sdkver：标识版本
* captchaUuid：32位随机字符串
* model：模式，也就是这次要处理的验证码类型是滑块验证码
* 其他：都是固定的，不过有些值后续加密的时候会使用到。但是是固定的没必要深究，不过后续会稍微说一下的勒。

![](https://attach.52pojie.cn/forum/202510/31/194921qderw57wedlw0x48.png)

![](https://attach.52pojie.cn/forum/202510/31/195106s878s0778dm0ts6d.png)

### web接口

指纹的第一个加密的接口。

* callback：回调ID
* organization：某美产品唯一标识
* smdata：指纹加密
* os：他写的web，我估计是这个产品使用的是网站或是app。
* version：版本

![](https://attach.52pojie.cn/forum/202510/31/195129y7dm1447060ygp4c.png)

返回值是一个JSONP，看着参数不咋多勒，smCB\_\*` 函数后续会被调用，并且接收相应的 JSON 数据，完成跨域数据获取。换句话说就是这些返回值后续会直接当作指纹第二次加密的值。为什么前面接口的jsonp不说，这个接口的JSONP我会专门拿来说，就是因为遇到坑了后续会细说，特别是sign跟timestamp和len这三个值特别重要，卡了我很久。

![](https://attach.52pojie.cn/forum/202510/31/195150j3f7esk6anfnn9d0.png)

### fverify接口

fverify接口就是验证码校验接口

![](https://attach.52pojie.cn/forum/202510/31/195239g2eoh6yzx0bbqnze.png)

验证码返回值是pass就是通过，没通过就是REJECT。

### verify接口是校验接口

![](https://attach.52pojie.cn/forum/202510/31/195311nraaee0x1ye8bm89.png)

携带的参数有account，clientId，deviceId，keyPairId，pageToken，password，promotionId，rid，smDeviceId，state，type，uiaType。

account是网站加密之后的账号

password是网站加密之后的密码

其余参数除了固定之外的都在后续验证码跟指纹那块了。

![](https://attach.52pojie.cn/forum/202510/31/195332fjvbi2rj2wrmgmmk.png)

## 验证码

验证码相关的接口就只有register接口，fverify接口和verify接口。话不多说，直接开始逆向分析。

### register接口

![](https://attach.52pojie.cn/forum/202510/31/195419q0kctm8rcz98pbcz.png)

register就只有一个captchaUuid，不去刷新好像不变，参考了b站韭菜何某的教程说是固定的，但是刷新之后又是会变化的，依着知其然知其所以然的原则，我决定深究下去，于是我开始找各种文章，终于参考k佬的文章找出来了加密点，就浅析一下吧！

#### captchaUuid

![](https://attach.52pojie.cn/forum/202510/31/195437muxxhg7ekypvvhpx.png)

跟栈进去打断点刷新验证码获取，断点断住了

![](https://attach.52pojie.cn/forum/202510/31/195448kik5sjcajafjjdib.png)

搜索captchaUuid，可以看到captchaUuid在此文件总共出现了6次。全部打断点逐一分析。

![](https://attach.52pojie.cn/forum/202510/31/195514hj3jh3tq7c3qlnll.png)

这是所有断点唯一断住的地方，可以看到他是被\_0xda8467赋值的，直接搜索\_0xda8467，经过断点调试，此时captchaUuid早就被生成了，是从\_0x2b2937取的值。

![](https://attach.52pojie.cn/forum/202510/31/195534un7rmwn8zlv72gwv.png)

经此断定，captchaUuid生成的地方不在这个文件，想找到生成点，跟栈回溯也好，搜索也罢。我的习惯是先全局搜索，实在找不到再回溯跟栈。全局搜索之后，captchaUuid还出现在smcp.min.js。

![](https://attach.52pojie.cn/forum/202510/31/195546on0hgrafan6n6z0z.png)

在smcp.min.js搜索captchaUuid，发现他是由\_0x4954a5赋值的。此处只截图了一个赋值点，代码里面有蛮多的地方captchaUuid都是被\_0x4954a5赋值的。

![](https://attach.52pojie.cn/forum/202510/31/195600ijwdzxw02rruj2wr.png)

搜索\_0x4954a5很容易就找到了生成点，但是代码混淆了。咱们直接手动解混淆看看代码究竟写了什么。

![](https://attach.52pojie.cn/forum/202510/31/195620u2bjvqrrtmubbb21.png)

这里有个或运算，它会从左到右求值，返回第一个真值表达式的结果，如果从userConfig取不到captchaUuid，就是undefined，则运行后面的函数。如果userConfig里面有captchaUuid则一直没生成captchaUuid。这也就是为什么过验证码的时候captchaUuid一直没变，刷新之后就变了。而后面的函数就是生成captchaUuid的地方。

```
userConfig["captchaUuid"] || _0xe6a2fc["default"]['getCaptchaUuid']()
```

进入getCaptchaUuid函数之后下断点，看到返回值是由this['generateTimeFormat']的返回值和\_0x137599拼接返回的。

![](https://attach.52pojie.cn/forum/202510/31/195631sedc9zyq1xqkc2kc.png)

##### generateTimeFormat

代码上面是混淆的，我们本地扣代码解混淆分析一下。

![](https://attach.52pojie.cn/forum/202510/31/195646hf41ddmum54gamu8.png)

整段代码的功能是生成一个字符串，表示当前的日期和时间，并将其格式化为字符串。

```
// 做拼接字符串作用或者相加作用
function TJjfz(_0x1d97d9, _0x5746e8) {return _0x1d97d9 + _0x5746e8;}
// 做拼接字符串作用或者相加作用
function ILyVQ(_0x3c0747, _0x307d5d) {return _0x3c0747 + _0x307d5d;}
// 做拼接字符串作用或者相加作用
 function altdY(_0x698909, _0x575cf9) {return _0x698909 + _0x575cf9;}
// 做拼接字符串作用或者相加作用
function oNsRX(_0x18cf8d, _0x4b8189) {return _0x18cf8d + _0x4b8189;}
// 接受一个函数和一个参数，然后将该参数传递给该函数执行
 function CofcR(_0x5f1402, _0x199f18) {return _0x5f1402(_0x199f18);}
// 接受一个函数和一个参数，然后将该参数传递给该函数执行
 function RScUT(_0x4ccc7, _0x342ed6) {return _0x4ccc7(_0x342ed6);}
// 接受一个函数和一个参数，然后将该参数传递给该函数执行
 function qEwbX(_0x32f541, _0x24bc3f) {return _0x32f541(_0x24bc3f);}
 function generateTimeFormat() {
    //_0x1f0a51是解密函数，可以直接注释掉。
    //_0x44456c = _0x1f0a51
     //做拼接字符串作用或者相加作用
     var  _0x40efe2 = {
         'PKMWk': function (_0x37701e, _0x2a5aa7) {
             return _0x37701e + _0x2a5aa7;
         }
     }
     //创建当前日期和时间
         , _0x458925 = new Date()
         , _0x2dd4b5 = function _0x3e3a6b(_0x1d48dc) {
         // _0x5471是解密函数，可以直接注释掉。
         // var _0x15632e = _0x5471;
         return +_0x1d48dc < -0x1cab + -0x3 * -0x3f5 + 0x10d6 ? _0x40efe2["PKMWk"]('0', _0x1d48dc) : _0x1d48dc["toString"]();
     };
     return TJjfz(ILyVQ(ILyVQ(altdY(oNsRX(_0x458925['getFullYear']()["toString"](), CofcR(_0x2dd4b5, _0x458925["getMonth"]() + (0x55 * 0x21 + -0x5d9 * 0x1 + 0x1 * -0x51b))), CofcR(_0x2dd4b5, _0x458925["getDate"]())),RScUT(_0x2dd4b5, _0x458925["getHours"]())), _0x2dd4b5(_0x458925["getMinutes"]())), qEwbX(_0x2dd4b5, _0x458925["getSeconds"]()));
 }
```

##### \_0x137599

\_0x137599是在getCaptchaUuid生成的。那么分析一下getCaptchaUuid这个函数吧

![](https://attach.52pojie.cn/forum/202510/31/195659pmmagajkpkqphpp4.png)

因为是分析\_0x137599，所以代码只提取了\_0x137599的生成，与网站源码函数不一致，后续的getCaptchaUuid应该是generateTimeFormat返回值+ \_0x137599返回值。而\_0x137599就是一个随机生成字符串的作用。最终可得captchaUuid就是时间戳字符串+随机字符串！

```
// 做数字相乘作用
function WhasQ(_0x57e359, _0x5e58b4) {return _0x57e359 * _0x5e58b4;}
function _0x137599() {
    //_0x1f0a51是解密函数，可以直接注释掉。
    // _0x3c2d9e = _0x1f0a51
    // 先将_0x137599定义成一个字符串
    var  _0x137599 = ''
      , _0x57876b = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678"
      , _0x4ca917 = _0x57876b["length"];
    for (var _0x52c4a7 = 0xc2a + -0x1e0f + 0x11e5; _0x52c4a7 < -0x7b9 + 0x43 * 0x43 + -0x9be; _0x52c4a7++) {
        _0x137599 += _0x57876b["charAt"](Math["floor"](WhasQ(Math["random"](), _0x4ca917)));
    }
    return  _0x137599;
}
```

### fverify接口

![](https://attach.52pojie.cn/forum/202510/31/195718ocq9xxqc44c9hf58.png)

fverify接口就有很多加密参数，一看就很头疼，但是其中会变化的参数只有hg,callback,th,rid,gg。callback就是回调ID直接用py生产对应时间戳发包就行了，rid的话就是register接口的返回值，作用就是用来绑定数据包的，所以我们只需要分析三个会变的函数就行了。

![](https://attach.52pojie.cn/forum/202510/31/195729mbpqbfxqvv1prqq1.png)

![](https://attach.52pojie.cn/forum/202510/31/195740wlo01ugjs4rsz6sg.png)

进入代码打断点。

![](https://attach.52pojie.cn/forum/202510/31/195755sbmmy0eu28bl18vg.png)

此时明文已经被加密了

![](https://attach.52pojie.cn/forum/202510/31/203224xhl3p6md5b6ma9t3.png)

使用搜索大法~~~~

非常容易就找到了加密函数。

![](https://attach.52pojie.cn/forum/202510/31/195820mux7mormp4y17oop.png)

打印\_0x58b708对象，里面就是我们需要的参数，接下来就是分析\_0x58b708对象所有的值生成的加密函数与其对应的明文。

![](https://attach.52pojie.cn/forum/202510/31/195831bax3xw2zrdxx6fiw.png)

#### gg参数

```
_0x58b708['gg'] = this['getEncryptContent'](0 / 290, '5129c2c2')
```

看下面图片，可以非常的确定第一个参数的0是滑动距离了

![](https://attach.52pojie.cn/forum/202510/31/195844kftjqnpwff0jtjap.png)

而那个290就是渲染的大小了，第二个参数后续跟进getEncryptContent再去分析。

![](https://attach.52pojie.cn/forum/202510/31/195856rxkhh2yh7oxhcp9n.png)

#### hg参数

\_0x13468f 是一个数组

![](https://attach.52pojie.cn/forum/202510/31/195910pzj5i9e9otopa58o.png)

搜索\_0x13468f可以看到他是取的鼠标轨迹放到对象里面

![](https://attach.52pojie.cn/forum/202510/31/195922mvuck5453sk3ccnz.png)

```
var _0x488717 ={};
_0x488717['mouseData'] = [
    [
        0,
        12,
        0
    ]
];
var _0x13468f = _0x488717['mouseData'];
_0x58b708['hg'] = this['getEncryptContent'](_0x13468f, 'be221ccf');
```

#### th参数

他们走的都是同个加密函数，第二个参数照样还是字符串，先分析第一个传参\_0x5eae4a - \_0x4dc2d8

![](https://attach.52pojie.cn/forum/202510/31/195932lhi126a9a7bx16wa.png)

![](https://attach.52pojie.cn/forum/202510/31/195942p2qppwhm0mrwubbs.png)

\_0x5eae4a是取的结束时间，而\_0x4dc2d8是开始时间

![](https://attach.52pojie.cn/forum/202510/31/195951u1u4oo3cll22y8on.png)

![](https://attach.52pojie.cn/forum/202510/31/200010byysixytkfkuajst.png)

打印\_0x488717发现里面的所有值都跟滑块有关，估计可以猜测\_0x5eae4a是取的滑块松开结束时间，而\_0x4dc2d8是滑块触摸开始时间

![](https://attach.52pojie.cn/forum/202510/31/200022dn77f3zdn2iz42n7.png)

到这里，验证码所有会变的参数都已经分析完毕。emmm,都分析到这里了，还是把所有参数都分析一遍看看里面的明文是啥。

#### 其他参数

qt的第二个传参照样还是字符串，第一个传参是290，也就是渲染的宽。

![](https://attach.52pojie.cn/forum/202510/31/200049angp1yvwyr0n0z8g.png)

![](https://attach.52pojie.cn/forum/202510/31/200103tjkefddfbuebjkkj.png)

lf的第二个传参照样还是字符串，第一个传参是145，也就是渲染的高。

![](https://attach.52pojie.cn/forum/202510/31/200114wp1rsscpurupakcc.png)

![](https://attach.52pojie.cn/forum/202510/31/200207xs867gv5s67y69jr.png)

继续向下跟栈，就可以找到其他的参数

![](https://attach.52pojie.cn/forum/202510/31/200220vdo5gxpx2x859ixc.png)

fm参数

fm的明文是从某个对象里面取的，没去深究了，因为是固定的明文。

```
_0x58b708['fm'] = this['getEncryptContent'](_0x1758fe['default']['__userConf']['console'], 'a571b7e5')
```

![](https://attach.52pojie.cn/forum/202510/31/200233qlledyiqsyeyinst.png)

sl参数

sl的第一个参数是执行\_0x1758fe['default']['runBotDetection']的返回值，虽然是固定0的，不过可以去深究一下看看函数。

```
_0x58b708['sl'] = this['getEncryptContent'](_0x1758fe['default']['runBotDetection'](), '146ca9d6')
```

![](https://attach.52pojie.cn/forum/202510/31/200247ot0tvhsvn9z397ux.png)

![](https://attach.52pojie.cn/forum/202510/31/200257tk099595lp3hyh5u.png)

网站都是混淆代码，扣到本地解混淆之后分析。

这段代码就是综合了多种检测方法检测是否使用了自动化插件，以识别是否有自动化工具在使用浏览器访问网页。如果检测到任何自动化工具的特征，函数将返回1 ，否则返回0 ，所有我们固定0就好了，没试过固定1能不能过滑块，感兴趣的笔者可以自己测试。

```
function Azojs(_0x4ba685, _0x43ec98) {
                return _0x4ba685 != _0x43ec98;
            }
function runBotDetection() {
            //解密函数可以注释掉
            // var _0x3dfceb = _0x2820f1;
            try {
// __webdriver_evaluate: 这是一个用于检测 WebDriver 环境的标识符。在一些情况下，网站会检查这个标识符来判断是否通过 WebDriver 进行访问。
// __selenium_evaluate: 与 WebDriver 相似，这个标识符用于检测 Selenium 环境。
// __webdriver_script_function: 用于表示 WebDriver 脚本功能，可能与执行脚本相关。
// __webdriver_script_func: 可能是 __webdriver_script_function 的一个变体，功能相似。
// __webdriver_script_fn: 与前两个类似，可能是脚本执行的某种标识。
// __fxdriver_evaluate: 特定于 Firefox 的 WebDriver 的一个标识符，用于脚本执行。
// __driver_unwrapped: 指示当前是否有包装的 WebDriver 实例。
// __webdriver_unwrapped: 与 __driver_unwrapped 类似，通常用于检测 WebDriver 实例的状态。
// __driver_evaluate: 用于执行脚本或表达式的一个标识。
// __selenium_unwrapped: 检测当前 Selenium 环境的状态。
// __fxdriver_unwrapped: 与 Firefox WebDriver 相关，表示没有包装的状态。
// _phantom: 通常指 PhantomJS，一个无头浏览器，用于执行网页的脚本。
// __nightmare: Nightmare.js 是一个用于自动化网页的高层次无头浏览器工具，基于 Electron 构建。
// _selenium: 通常指 Selenium 自动化测试框架。
// callPhantom: 可能是 PhantomJS 中用于调用特定功能的函数。
// callSelenium: 用于 Selenium 自动化功能的调用。
// _Selenium_IDE_Recorder: 可能与 Selenium IDE 相关，这是一种用于录制用户在浏览器中的操作并生成测试脚本的工具。
var _0x488f33 = ['__webdriver_evaluate', '__selenium_evaluate', '__webdriver_script_function', '__webdriver_script_func', '__webdriver_script_fn','__fxdriver_evaluate', '__driver_unwrapped', '__webdriver_unwrapped','__driver_evaluate', '__selenium_unwrapped', '__fxdriver_unwrapped']
  , _0x3e3aa6 = ['_phantom', '__nightmare', '_selenium', 'callPhantom', 'callSelenium', '_Selenium_IDE_Recorder'];
// 遍历_0x3e3aa6数组，如果存在对应数据，则返回1，主要作用是检测当前浏览器环境中是否存在一些与自动化测试工具或无头浏览器相关的特征。如果检测到这些特征，代码将返回 1，这通常用于判断当前环境是否为自动化环境。
for (var _0x17026d in _0x3e3aa6) {
    var _0xee867d = _0x3e3aa6[_0x17026d];
    if (window[_0xee867d])
        return 1;
}
// 遍历_0x488f33数组，如果存在对应数据，则返回1，主要作用是检测当前浏览器环境中是否存在一些与自动化测试工具或无头浏览器相关的特征。如果检测到这些特征，代码将返回 1，这通常用于判断当前环境是否为自动化环境。
for (var _0x21e13b in _0x488f33) {
    var _0x20f547 = _0x488f33[_0x21e13b];
    if (window['document'][_0x20f547])
        return 1;
}
// 做了属性值匹配和属性值检查，都成立代码将返回 1
for (var _0x352101 in window['document']) {
    if (_0x352101['match'](/\$[a-z]dc_/) && window['document'][_0x352101]['cache_'])
        return 1;
}
// 检查window.external 是否存在，以及其 toString() 方法的返回值是否存在
if (window['external'] && window['external']['toString']() &&
    Azojs(window['external']['toString']()['indexOf']('Sequentum'), -(1)))
    return 1;
// 检查document.documentElement 是否有名为 'selenium' 的属性
if (window['document']['documentElement']['getAttribute']('selenium'))
    return 1;
// 检查document.documentElement 是否有名为 'webdriver' 的属性
if (window['document']['documentElement']['getAttribute']('webdriver'))
    return 1;
// 检查document.documentElement 是否有名为 'driver' 的属性
if (window['document']['documentElement']['getAttribute']('driver'))
    return 1;
// 检查window.navigator 中是否存在 webdriver 属性
if (window['navigator']['webdriver'])
    return 1;
//都没检测出来返回0
return 0;
    } catch (_0x5c3864) {
        // 报错也返回0
        return 0;
    }
}
```

bq参数

bq参数的第二个传参照样还是字符串，第一个传参是固定值-1

![](https://attach.52pojie.cn/forum/202510/31/200322oz78d9d8gloqppdl.png)

![](https://attach.52pojie.cn/forum/202510/31/200338mbvqzonwbwvnwgas.png)

剩下几个参数靠搜索大法一搜索就出来了，也都是一样，第二个传参是字符串，进入的都是同一个加密函数。

![](https://attach.52pojie.cn/forum/202510/31/200354tlnn3w4sw4nfwsl3.png)

ny参数

有个逗号运算符，逗号运算符允许在一个表达式中执行多个操作，并返回最后一个操作的值。也就是相当于将三个参数传入了\_0x27a1a9['default']函数。后续三个参数也都是一致的

```
//_0x2d4897 是字符串'default'，已替换
(0, _0x27a1a9['default'])(organization的值, 'ny', this['getEncryptContent']('default','c9c6928e'))
//_0x3acded是字符串'DEFAULT'，已替换
(0, _0x27a1a9['default'])(organization的值, 'to', this['getEncryptContent']('DEFAULT','539c5813'))
//_0x4d86d8是字符串'zh-cn'，已替换
(0, _0x27a1a9['default'])(organization的值, 'yh', this['getEncryptContent']('zh-cn','2b301f03'))
```

\_0x27a1a9['default']函数又有啥作用呢，估计猜测就是混淆代码,毕竟加密函数都出来了，他还能有个啥用呀。进去分析看看呗！

扣下来慢慢分析！

![](https://attach.52pojie.cn/forum/202510/31/200413nc1244ownoiohsze.png)

分析一波之后，发现确实就是个混淆代码，传入了三个参数之后进行了三元运行还有逗号运算，这么长的代码最后就是返回了\_0xf3677c这个参数。emmm,细心的读者可以看到笔者扣了default2这段函数，其实我一开始也以为就是逗号运算后运行default2这段函数，WACtj(\_0x19b59b, \_0xf3677c)这个检测第一个参数是否在第二个参数里面一直都是返回的true，所以走的就是：之前的函数，我也踩到坑了，可是通过返回值可以得到返回值就是\_0xf3677c这个传参，我才看到还有个逗号运算符在那里。(其实是笔者在default2下了断点，没有一个参数跳进去感觉到疑惑才后知后觉的)

```
function WACtj(_0x26067, _0x2a6070) {
                return _0x26067 in _0x2a6070;
            }
function default2(_0x10d166, _0x196db9, _0xe3636f) {
            var _0x27294e = _0x1817a5;
            return _0x2ceee1[_0x27294e(0x450)](_0x10d166, _0x196db9, _0xe3636f);
        }
function default2(_0xf3677c, _0x19b59b, _0x1a47c2) {
    //解密函数可以注释掉
    //         var _0x13bb2a = _0x4c708f;
            return WACtj(_0x19b59b, _0xf3677c) ? (0, default2)(_0xf3677c, _0x19b59b, {
                'value': _0x1a47c2,
                'enumerable': !![],
                'configurable': !![],
                'writable': !![]
            }) : _0xf3677c[_0x19b59b] = _0x1a47c2,
            _0xf3677c;
        }
```

![](https://attach.52pojie.cn/forum/202510/31/200426ob8c32wgw6n6lwcl.png)

default已经分析完毕，就是把传进去的参数返回回来的一个混淆函数，接下来分析一下三个值的明文从哪里获取的。

![](https://attach.52pojie.cn/forum/202510/31/200437l30w05w5466gvagl.png)

![](https://attach.52pojie.cn/forum/202510/31/200448omyggyi5bqgmqbmx.png)

![](https://attach.52pojie.cn/forum/202510/31/200459xfuf8eas3furte3v.png)

打印出\_0x54208f，可以很清晰的看到版本号，估测明文是从某接口获取的。

![](https://attach.52pojie.cn/forum/202510/31/200535fqhoox04ommo5i56.png)

去接口寻找了一下，那几个固定值的明文就是从register接口获取的值

![](https://attach.52pojie.cn/forum/202510/31/200545f9m9v9mz8cs0rrkw.png)

所有的值的传参明文都已经分析完毕了，现在来分析一下加密函数跟第二个传参字符串具体在函数里面充当了什么作用。

#### getEncryptContent

进入到函数里面，逐步分析，网站有混淆，扣到本地手动解混淆。

![](https://attach.52pojie.cn/forum/202510/31/200558lwd44w2w3t3w337f.png)

getEncryptContent函数就是加密函数，加密用的des加密，第一个参数是明文，第二个参数是加密密钥，进入到函数会取一个密钥，如果没传密钥就使用this['\_data']['\_\_key']。后续还做了代码格式化检查，如果换行大于了2密钥就会被替换成假密钥。其实前面的代码大多没啥用，有用的就是返回值那段代码。

```
function oytnG(_0x167ee3, _0x5d3108) {
    // 使用了逻辑或运算符 ||，如果 _0x167ee3 为真值，则返回 _0x167ee3；如果为假值（falsy），则返回 _0x5d3108
                return _0x167ee3 || _0x5d3108;
            }
function nnYEZ(_0x51a938, _0x5c3faf) {
                return _0x51a938 > _0x5c3faf;
            }
//检查格式化的，如果是一行的代码，没有格式化就返回真，格式化了行数大于2就返回假
function  isJsFormat() {
return nnYEZ("function _0x261de3(){return console['log']('1'),'a';}"['split']('\n')['length'], 2);
}
function getEncryptContent(_0x45fc77, _0x2b737e) {
            //解密函数，可以直接注释掉了
            //     _0x947d49 = _0x5b97b4
                var _0x359d06 = this['_data']['__key']
                  , _0x64cdde = oytnG(_0x2b737e, _0x359d06);
                //如果格式化了就会返回false,后续的_0x64cdde就会被'1761903470011.1182ishumei.com'赋值，就是一个混淆我们的代码，直接注释掉
                // isJsFormat() && (_0x64cdde = '1761903470011.1182ishumei.com');
                //判断传进来的明文是不是字符串，做了一个三元运算
                // ! 是逻辑非运算符（NOT），它会将其后面的表达式取反。[] 是一个空数组，在 JavaScript 中被视为“真值”，因为所有的对象（包括数组）都被视为 true。因此，![] 会将 true 取反，结果为 false。
                // !! 实际上是两个逻辑非运算符连用。第一个 ! 会将 [] 取反，得到 false。第二个 ! 会将 false 再次取反，结果为 true。所以，!![] 的结果为 true。
                var _0x1bd344 = typeof _0x45fc77 === 'string' ? !![] : ![],
                    //通过上面运行的结果
                    _0x37c790 = _0x1bd344 ? _0x45fc77 : _0x1758fe['default']['smStringify'](_0x45fc77)
                  , _0x437bde = '';
                //_0x37c790就是明文参数,而_0x64cdde就是密钥，如果没去看格式化代码的话就是用错密钥。
                return _0x437bde = _0x5b5da0['default']['DES'](_0x64cdde, _0x37c790, 0),
                _0x437bde = _0x5b5da0['default']['base64Encode'](_0x437bde),
                _0x437bde;
            }
getEncryptContent("zh-cn","727c3c8c")
```

py版本的DES加密代码

```
def zero_pad(s, block_size):
    pad_size = block_size - len(s) % block_size
    return s + (b'\x00' * pad_size)
def DESEncrypt(word, key) -> str:
    # 确保密钥为字节类型并且为8字节
    key_bytes = key.encode('utf-8')[:8]
    if len(key_bytes) < 8:
        key_bytes = key_bytes.ljust(8, b'\0')
    # 创建 DES 加密器
    cipher = DES.new(key_bytes, DES.MODE_ECB)
    # 将待加密的单词编码为字节类型并进行零填充
    srcs = word.encode('utf-8')
    padded_data = zero_pad(srcs, DES.block_size)
    # 加密
    encrypted_data = cipher.encrypt(padded_data)
    # 将加密后的数据转换为 Base64 字符串
    return base64.b64encode(encrypted_data).decode('utf-8')
```

欧克啊，到这里所有的参数都已经分析完毕了，接下来就是轨迹模拟跟图片识别了。这些个模型训练啊，图片识别啊都可以的，这些我都不是很会，都是参考了大佬们的文章搞定的。

#### 轨迹

```
def get_sm_track(distance):
    track_length = random.randint(4, 10)
    track = [[0, -2, 0]]
    m = distance % track_length
    e = int(distance / track_length)
    for i in range(track_length):
        x = (i + 1) * e + m + random.randint(20, 40)
        y = -2 + (random.randint(-1, 10))
        t = (i + 1) * 100 + random.randint(-3, 5)
        if i == track_length - 1:
            x = distance
            track.append([x, y, t])
        else:
            track.append([x, y, t])
    return track
```

#### 滑块缺口识别

背景图

![](https://attach.52pojie.cn/forum/202510/31/200625qlpfvhh1fvn7fpcm.png)

缺口图

![](https://attach.52pojie.cn/forum/202510/31/200635caa6ea6xwixiafa9.png)

```
def extract_slide(img):
    """
    从滑块图片中提取有效滑块区域（去除上下空白部分）
    参数:
        img: 输入的滑块图片(numpy数组格式，BGR三通道)
    返回值:
        img[start_r:end_r + 1, :, :]: 裁剪后的有效滑块区域
        start_r: 滑块起始行号(上边界)
        end_r: 滑块结束行号(下边界)
    """
    start_r = 0  # 初始化滑块起始行
    end_r = 0  # 初始化滑块结束行
    # 从上到下逐行扫描，寻找滑块的上边界
    for r in range(img.shape[0]):  # img.shape[0]是图片高度(行数)
        # 计算当前行所有像素值的和(判断是否有非零像素)
        if np.sum(img[r, :, :]) > 0:  # 如果当前行有非零像素
            start_r = r  # 记录滑块起始行
            # 从起始行继续向下扫描，寻找滑块的下边界
            for rr in range(r + 1, img.shape[0]):
                if np.sum(img[rr, :, :]) == 0:  # 遇到全零行(空白行)
                    end_r = rr  # 记录滑块结束行
                    break  # 找到下边界后退出循环
            break  # 找到上下边界后退出外层循环
    # 返回裁剪后的滑块区域和边界坐标
    return img[start_r:end_r + 1, :, :], start_r, end_r
def get_distance(fg_resp, bg_resp):
    """计算滑动距离"""
    with open('bg.png', 'wb') as f:
        f.write(bg_resp.content)
    with open('fg.png', 'wb') as f:
        f.write(fg_resp.content)
    # 读取背景图片和滑块图片
    # bg.jpg - 包含滑块缺口的背景图片
    # slide.png - 滑块图片
    bg = cv2.imread('bg.png')  # 读取背景图(BGR格式)
    slide = cv2.imread('fg.png')  # 读取滑块图(BGR格式)
    # 提取滑块有效区域(去除上下空白部分)
    # real_slide - 裁剪后的有效滑块区域
    # start_r - 滑块在原始图片中的起始行
    # end_r - 滑块在原始图片中的结束行
    real_slide, start_r, end_r = extract_slide(slide)
    # 裁剪背景图，使其高度与滑块匹配(只处理滑块可能出现的区域)
    # 这样可以减少计算量并提高匹配精度
    real_bg = bg[start_r:end_r + 1, :, :]
    # 边缘检测(使用Canny算法)
    # 参数说明:
    #   70 - 低阈值，用于边缘连接
    #   200 - 高阈值，用于强边缘检测
    canny_bg = cv2.Canny(real_bg, 70, 200)  # 背景图边缘检测
    canny_slide = cv2.Canny(real_slide, 70, 200)  # 滑块边缘检测
    # 模板匹配(在背景中寻找滑块位置)
    # cv2.TM_CCOEFF_NORMED - 使用归一化相关系数匹配方法
    res = cv2.matchTemplate(canny_bg, canny_slide, cv2.TM_CCOEFF_NORMED)
    # 获取匹配结果中的最佳匹配位置
    # min_val - 最小匹配值
    # max_val - 最大匹配值(最佳匹配分数)
    # min_loc - 最小匹配位置
    # max_loc - 最大匹配位置(最佳匹配位置)
    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)
    # 计算滑块在背景图中的位置
    x1, y1 = max_loc  # 最佳匹配位置的左上角坐标
    # 计算右下角坐标(加上滑块的宽度和高度)
    x2, y2 = x1 + real_slide.shape[1], y1 + real_slide.shape[0]
    cv2.rectangle(real_bg, (x1, y1), (x2, y2), (0, 0, 255), 2)
    cv2.imwrite("result_bg.jpg", real_bg)
    cv2.imwrite("result_slide.jpg", real_slide)
    return x1/2
```

返回的结果图：

![](https://attach.52pojie.cn/forum/202510/31/200649gqq57paqiqs3i779.jpg)

![](https://attach.52pojie.cn/forum/202510/31/200701fdz5y5odca46vu0p.jpg)

识别成功：

![](https://attach.52pojie.cn/forum/202510/31/200712ltgl9cptgdjpsmtl.png)

## 结尾：

第二篇跳转链接：<https://www.52pojie.cn/thread-2069385-1-1.html>。
