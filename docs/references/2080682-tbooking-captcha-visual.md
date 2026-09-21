# Tbooking验证码逆向分析

> **作者**: 中二 | **发布时间**: 2025-12-17 21:22:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3948 / 3
> **原文**: [https://www.52pojie.cn/thread-2080682-1-1.html](https://www.52pojie.cn/thread-2080682-1-1.html)

---

*本帖最后由 中二 于 2025-12-19 22:38 编辑*

#### 声明

本文章中所有内容仅供学习交流使用，不用于其他任何目的，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关！若有侵权，请联系作者删除。

## 前言

网址敏感暂不提供

## 解混淆

对混淆代码用ast进行解混淆，代码每次进入行数解混淆函数都会做赋值操作

![](https://attach.52pojie.cn/forum/202512/17/211307vhdh3553d543wdz7.png)

寻找别名映射替换解混淆

![](https://attach.52pojie.cn/forum/202512/17/211331vyl6brrgfzhyh66j.png)

ast代码

```
let aliasMap = new Map();
traverse(ast, {
  VariableDeclarator(path) {
    const {id, init} = path.node;
    if (init &&
        init.type === 'Identifier' &&
        init.name === '_0x5d48') {  // 只找映射到 _0x5d48 的别名
      if (id && id.type === 'Identifier') {
        console.log(`找到别名: ${id.name} = ${init.name}`);
        aliasMap.set(id.name, init.name);
      }
    }
  }
});
console.log(`\n共找到 ${aliasMap.size} 个别名映射\n`);
```

![](https://attach.52pojie.cn/forum/202512/17/211350uz2z2lxpbbh9n85b.png)

分析解混淆函数，当时没扣自执行函数，发现一直都是获取的错误的解值，后续经过调试发现会进入到IIFE自执行函数进行打乱操作，\_0xf740d4一直都是508965，每次值都是进去自执行打乱，当计算结果等于 508965 时停止，数组就会被打乱到"正确"的位置

```
function _0x5d48(_0x11a0d4, _0x5ce3a6) {
    // 调用 _0x1ca8() 获取字符串数组的引用
    var _0x1ca895 = _0x1ca8();
    // 重新定义 _0x5d48 函数（自修改）
    // 第一次调用后，_0x5d48 会被替换成这个新函数
    return _0x5d48 = function(_0x5d48ee, _0x35f2fc) {
        // 索引减去偏移量 0xa6 (166)
        _0x5d48ee = _0x5d48ee - 0xa6;
        // 从数组中取出对应索引的字符串
        var _0x582652 = _0x1ca895[_0x5d48ee];
        // 返回字符串
        return _0x582652;
    },

    // 立即用新函数调用自己，返回结果
    // 这样第一次调用就能返回正确的值
    _0x5d48(_0x11a0d4, _0x5ce3a6);
}
// ============ 第二部分：字符串数组函数 ============
function _0x1ca8() {
    // 定义包含所有混淆字符串的数组
    var _0x5556cb = [数组内容];
    // 重新定义 _0x1ca8 函数（自修改）
    // 之后调用 _0x1ca8() 直接返回数组，不会重新创建
    _0x1ca8 = function() {
        return _0x5556cb;
    };
    // 第一次调用返回数组
    return _0x1ca8();
}
// ============ 第三部分：数组打乱函数（IIFE 立即执行函数）============
(function(_0x51b7f0, _0xf740d4) {
    // _0x51b7f0 = _0x1ca8（数组函数）
    // _0xf740d4 = 0x7c425（目标值：508965）
    // 创建 _0x5d48 的别名
    var _0x3dc1b8 = _0x5d48,
        // 调用 _0x1ca8() 获取数组引用
        _0x4f7ff0 = _0x51b7f0();
    // 无限循环，直到数组旋转到正确位置
    while (!![]) {  // !![] 等于 true
        try {
            // 计算一个复杂的数值
            // 通过调用 _0x3dc1b8（即 _0x5d48）从数组中取值并计算
            var _0x360051 =
                -parseInt(_0x3dc1b8(0x29d)) / 0x1 +           // 索引 0x29d (661)
                parseInt(_0x3dc1b8(0x1b0)) / 0x2 +            // 索引 0x1b0 (432)
                -parseInt(_0x3dc1b8(0x203)) / 0x3 *           // 索引 0x203 (515)
                    (-parseInt(_0x3dc1b8(0xf1)) / 0x4) +      // 索引 0xf1 (241)
                -parseInt(_0x3dc1b8(0x275)) / 0x5 +           // 索引 0x275 (629)
                parseInt(_0x3dc1b8(0x1f9)) / 0x6 *            // 索引 0x1f9 (505)
                    (parseInt(_0x3dc1b8(0x1ec)) / 0x7) +      // 索引 0x1ec (492)
                -parseInt(_0x3dc1b8(0x232)) / 0x8 +           // 索引 0x232 (562)
                -parseInt(_0x3dc1b8(0x213)) / 0x9 *           // 索引 0x213 (531)
                    (-parseInt(_0x3dc1b8(0x11b)) / 0xa);      // 索引 0x11b (283)
            // 如果计算结果等于目标值 0x7c425 (508965)
            if (_0x360051 === _0xf740d4)
                break;  // 跳出循环，数组已经在正确位置
            else
                // 否则旋转数组：把第一个元素移到最后
                // shift() 移除并返回第一个元素
                // push() 把元素添加到末尾
                _0x4f7ff0['push'](_0x4f7ff0['shift']());
        } catch (_0x4433b6) {
            // 如果出错（比如 parseInt 失败），也旋转数组
            _0x4f7ff0['push'](_0x4f7ff0['shift']());
        }
    }
}(_0x1ca8, 0x7c425));  // 立即执行，传入 _0x1ca8 函数和目标值 0x7c425
```

## 接口分析

![](https://attach.52pojie.cn/forum/202512/17/211413cwc0tizg88bbi8gw.png)

![](https://attach.52pojie.cn/forum/202512/17/211428n7vt51to4z7zy264.png)

经分析，指纹脏了之后总共有两次验证码，第一次过了之后返回第二个验证码(可能是滑块，可能是点选)的信息，后面流程都一样，第一次验证码获取的接口参数不变直接固定，verify\_msg参数携带了部分浏览器指纹校验信息，也有其他接口会校验指纹信息(新的指纹只需要过一次验证码)，不方便写，就写verify\_msg参数与部分指纹分析。

![](https://attach.52pojie.cn/forum/202512/17/211441pbha4bbmp4h6biat.png)

#

## verify\_msg

verify\_msg就是\_0x2ea9b5进行url编码

![](https://attach.52pojie.cn/forum/202512/17/211457yvuwvksdy206u25u.png)

```
var _0x2ea9b5 = _0x29d880(_0xf5c62d["stringify"](_0x2a9ed4), 0x0);
```

\_0x2ea9b5是由\_0x2a9ed4对象序列化加密得到的

![](https://attach.52pojie.cn/forum/202512/17/211511qg8ygxy2g8689iag.png)

\_0x2a9ed4明文

![](https://attach.52pojie.cn/forum/202512/17/211531hu53twko5vlluevg.png)

加密函数\_0x29d880就是\_0x37644c函数，可以很清晰的看到encrypt和decrypt字符串，判断此处就是加密关键处。

![](https://attach.52pojie.cn/forum/202512/17/211545eremmoh2moamhxdd.png)

```
function _0x37644c(_0x478d1c, _0x1f975b) {
    // var _0x57d2af = _0x59d8ae,
    // 解混淆函数直接注释掉
    // 密钥（Key）：十六进制字符串
    _0x11a0cf = '69783956775867344e5853626b645431',
     // 迭代次数：0x3e8 = 1000（十进制）
    // 用于加密算法的迭代轮数
    _0x2862ea = 0x3e8,
    // 表示 128 位密钥
    _0x8969cb = 0x80,
    // 创建加密器实例
    _0x45e55d = new _0x1e1aef(_0x8969cb, _0x2862ea);
    // 三元运算符：根据模式参数决定加密还是解密
    // 加密的时候会传入_0x1f975b为0的值，区分调用这个函数是加密还是解密
    return _0x1f975b === 0x0
        // 如果 _0x1f975b === 0，执行加密
        ? _0x45e55d["encrypt"](_0x11a0cf, _0x478d1c)
         // 否则执行解密
        : _0x45e55d["decrypt"](_0x11a0cf, _0x478d1c);
}
```

encrypt和decrypt都是由\_0x1e1aef对象new出来的

![](https://attach.52pojie.cn/forum/202512/17/211604k2qls0db92c3v900.png)

进去\_0x1e1aef对象分析，加密算法一目了然，直接用算法库还原加密。

![](https://attach.52pojie.cn/forum/202512/17/211616nxow7a7m71h1miq5.png)

用加密库还原的加密算法。由于俺只要加密，只复现了加密算法！

```
const crypto = require('crypto');
function encryptAES(plaintext, keyHex, ivHex) {
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

function _0x29d880(_0x478d1c) {
  const ivHex = '69783956775867344e5853626b645431';
  const words = [-0x70dca43f, -0x353e85ba, 0x530c616f, -0xdcb4188];
  const keyBuffer = Buffer.alloc(16);
  for (let i = 0; i < words.length; i++) {
    keyBuffer.writeInt32BE(words[i], i * 4);
  }
  const keyHex = keyBuffer.toString('hex');
  return encryptAES(_0x478d1c, keyHex, ivHex);
}
```

### 明文分析

明文还算是有点意思，蛮多都是环境校验，如果是补环境过的就需要过各大检测点，不过咱是扣代码，直接分析代码拿到想要的值就行了。

```
_0x2a9ed4 = {
                'st': _0x477239,
                'slidingTime': _0x571647['timeDrop'],
                'display': _0x571647["scrW"] + 'x' + _0x571647["scrH"],
                'keykoardTrack': _0x571647['keyCodeList'],
                'jigsawKeyboardEventExist': _0x571647["keyboardEventExist"],
                'jigsawPicWidth': _0x3cf99d,
                'jigsawPicHeight': parseInt(_0x3cf99d / 0x2),
                'jigsawViewDuration': new Date()["getTime"]() - _0x34f7fa,
                'slidingTrack': _0x3fee21,
                'timezone': _0x571647["timeZone"],
                'flashState': _0x571647["flaState"],
                'language': _0x571647["currentLang"],
                'platform': _0x571647["platform"],
                'cpuClass': _0x571647["cpuClass"],
                'hasSessStorage': _0x571647["hasSessStorage"],
                'hasLocalStorage': _0x571647['hasLocalStorage'],
                'hasIndexedDB': _0x571647['hasIndexedDB'],
                'hasDataBase': _0x571647["hasDataBase"],
                'doNotTrack': _0x571647["doNotTrack"],
                'touchSupport': _0x571647['touchSupport'],
                'mediaStreamTrack': _0x571647['mediaStreamTrack'],
                'value': _0x8053bf
            };
```

分析了一下\_0x2a9ed4对象，除了st，jigsawViewDuration，jigsawPicWidth，jigsawPicHeight，slidingTrack和value以外其余值都是从\_0x571647对象里面取的。

st是由\_0x477239赋值的，\_0x477239就是获取当前时间戳（毫秒)

```
_0x477239 = new Date()["getTime"]()
```

![](https://attach.52pojie.cn/forum/202512/17/211642inqdv333hzledzdv.png)

jigsawPicWidth见名知意就是验证码宽度，而jigsawPicHeight则是验证码高度。

![](https://attach.52pojie.cn/forum/202512/17/211654naacj7hnay7ujffa.png)

![](https://attach.52pojie.cn/forum/202512/17/211707zbh9icv49a2y9b9m.png)

而jigsawViewDuration则是当前时间减去\_0x34f7fa，是两个函数的执行时间，见名知意就是验证码从头滑到尾的时长。

![](https://attach.52pojie.cn/forum/202512/17/211719amjc5qiwiwr5mlmi.png)

slidingTrack见名知意就是轨迹

![](https://attach.52pojie.cn/forum/202512/17/211733qzw2y4ezlz0w2t1e.png)

提取之后的轨迹代码

```
_0x3fee21 = [];
// 创建一个空数组，用于存储提取后的滚动轨迹坐标
for (var _0x1a2e70 = 0x0; _0x1a2e70 < _0x571647['scrollList']["length"]; _0x1a2e70++) {
    // for 循环遍历滚动列表
    // var _0x1a2e70 = 0x0;  → var i = 0; (初始化循环变量为0)
    // _0x1a2e70 < _0x571647['scrollList']["length"];  → i < data.scrollList.length; (循环条件：小于数组长度)
    // _0x1a2e70++  → i++ (每次循环后索引加1)
    _0x3fee21["push"]({
        // 向数组中添加一个新对象
        'x': _0x571647["scrollList"][_0x1a2e70]['x'],
        // 提取当前滚动点的 x 坐标
        'y': _0x571647["scrollList"][_0x1a2e70]['y']
        // 提取当前滚动点的 y 坐标
    });
}
```

\_0x571647对象分析

全局搜索\_0x571647，\_0x571647是由\_0x37f0ba["infoBox"]赋值得到的

![](https://attach.52pojie.cn/forum/202512/17/211806q49fpfc29o9y2p9o.png)

搜索\_0x37f0ba，jigsawVerificationMain的时候\_0x37f0ba["infoBox"]已经生成了，跟栈回溯。

![](https://attach.52pojie.cn/forum/202512/19/210908pbudaidfylnddn2b.png)

跟栈回溯，可以分析得到\_0x5e2060["infoBox"]是由\_0x4fe38e对象序列化得到。

![](https://attach.52pojie.cn/forum/202512/17/211839ebr377raa3svr7sr.png)

全局搜\_0x4fe38e，得到0x4fe38e是在jigsawVerification函数里初始化的

![](https://attach.52pojie.cn/forum/202512/19/211222r1zyez4tro4sm4r4.png)

将jigsawVerification函数扣下来复现，由于目的仅仅只是分析\_0x4fe38e的生成，很多函数对我们并没有作用，后续会对代码进行改写，仅分析提取有用的参数。

\_0x4fe38e["rms"]虽然不在验证码校验的参数，但是其与某指纹参数是有关的，既然属于\_0x4fe38e对象，那么就浅析一下吧。

![](https://attach.52pojie.cn/forum/202512/17/211904buf2jdsosozn8a9j.png)

\_0x4fe38e["rms"]被参数\_0xa70a18赋值，打断点跟栈回溯

![](https://attach.52pojie.cn/forum/202512/17/211916pmnjhlphj91jhbt2.png)

\_0xa70a18就是e.getRmsToken()函数执行的返回值

![](https://attach.52pojie.cn/forum/202512/17/211928akerbrr34i49arb8.png)

e.getRmsToken函数扣下来逐步分析

![](https://attach.52pojie.cn/forum/202512/17/211941fxgx777ci0x1g0cz.png)

```
function getRmsToken() {
    var e, t, n = "";
    try {
        window.__bfi.push(["_devTrace", "215858", {
            vid: this.vid,
            msg: "firstdata"
        }]);
        var o = navigator.userAgent.length > 300 ? navigator.userAgent.substring(0, 300) : navigator.userAgent;
        n = "fp=" + (this.fp ? this.fp : ""),
        n += "&vid=" + (this.vid ? this.vid : ""),
        n += "&pageId=" + (this.pageId ? this.pageId : "");
        var r = /\_RGUID=([a-z0-9\-]+)(;|$)/.exec(document.cookie)
          , i = /guid\_\_=([a-z0-9\-]+)(;|$)/.exec(document.cookie);
        r && r.length > 1 ? n += "&r=" + r[1].replace(/\-/g, "") : i && i.length > 1 ? n += "&r=" + i[1].replace(/\-/g, "") : n += "&r=" + window.CHLOROFP_STATUS;
        var s = window.CHLOROFP_IP;
        if (!s) {
            var d = /\_RF1=([0-9\.]+)(;|$)/.exec(document.cookie);
            d && d.length > 1 && (s = d[1])
        }
        isNaN(Number(s)) || (e = Number(s),
        (t = new Array)[0] = e >>> 24 >>> 0,
        t[1] = e << 8 >>> 24 >>> 0,
        t[2] = e << 16 >>> 24,
        t[3] = e << 24 >>> 24,
        s = String(t[0]) + "." + String(t[1]) + "." + String(t[2]) + "." + String(t[3])),
        s && (s = s.replace(/^\s+|\s+$/g, "")),
        n += "&ip=" + s,
        n += "&rg=" + window.RG_STA,
        n += "&kpData=" + a([h[2]]),
        n += "&kpControl=" + a([h[0], h[1]]),
        n += "&kpEmp=" + a(p),
        n += "&screen=" + screen.width + "x" + screen.height;
        var c = (new Date).getTimezoneOffset() / 60;
        n += "&tz=" + (c < 0 ? "+" : "-") + Math.abs(c),
        n += "&blang=" + navigator.language || navigator.userLanguage,
        n += "&oslang=" + navigator.language || navigator.systemLanguage,
        n += "&ua=" + encodeURIComponent(o);
        var u = /^https?:\/\/([a-zA-Z0-9.\-_]+)\/?/.exec(window.location);
        if (u && u.length > 1) {
            var f = u[1];
            n += "&d=" + encodeURIComponent(f)
        }
        return n += "&v=25",
        this.uuid && (n += "&rmsId=" + this.uuid),
        n += "&kpg=" + _.join("_"),
        n += "&adblock=" + function() {
            var e = document.createElement("div");
            e.style.cssText = "width:1px; height: 1px; position:absolute; top: -1000px; left: -1000px;",
            e.innerHTML = " ",
            e.className = "adsbox";
            var t = "F";
            try {
                document.body.appendChild(e),
                0 === document.getElementsByClassName("adsbox")[0].offsetHeight && (t = "T"),
                document.body.removeChild(e)
            } catch (e) {
                t = "F"
            }
            return t
        }(),
        n += "&cck=" + function() {
            if (w)
                return "T";
            var e = "F";
            try {
                window.cookieStatusInD && (e = "T")
            } catch (e) {}
            return e
        }(),
        n += "&ftoken=" + (this.forterToken ? this.forterToken : ""),
        window.__bfi.push(["_devTrace", "215858", {
            vid: this.vid,
            rmstoken: n
        }]),
        n
    } catch (e) {
        return window.__bfi.push(["_devTrace", "243111", {
            type: "getRmsTokenErr",
            msg: e.message
        }]),
        n
    }
}
```

无论代码怎么执行，正确与否window.\_\_bfi 都会被添加内容

![](https://attach.52pojie.cn/forum/202512/17/211958dplpk7tm7pmke1y8.png)

```
函数开始时（成功情况）：
window.__bfi.push(["_devTrace", "215858", {
    vid: this.vid,
    msg: "firstdata"
}]);
函数结束前（成功情况）：
window.__bfi.push(["_devTrace", "215858", {
    vid: this.vid,
    rmstoken: n
}]);
捕获异常时（失败情况）：
catch (e) {
    window.__bfi.push(["_devTrace", "243111", {
        type: "getRmsTokenErr",
        msg: e.message
    }]);
    return n
}
```

执行报navigator不存在，直接删掉异常捕获

![](https://attach.52pojie.cn/forum/202512/17/212012y2q4m4zc4u4q4hz8.png)

将navigator.userAgent补了

```
navigator.userAgent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
```

![](https://attach.52pojie.cn/forum/202512/17/212023wqqiigibfmgb0uzg.png)

补document和cookie

```
document={}
document.cookie='UBT_VID=1765596069776.caf8FqkOsXvR; GUID=09031028414664176921; _RGUID=b5622887-7d95-44ba-a244-34848d09ff94; cl=zh-CN; nfes_isSupportWebP=1; Session=smartlinkcode=U130026&smartlinklanguage=zh&SmartLinkKeyWord=&SmartLinkQuary=&SmartLinkHost=; Union=AllianceID=4897&SID=130026&OUID=&createtime=1765790770&Expires=1766395569852; _bfa=1.1765596069776.caf8FqkOsXvR.1.1765805455217.1765856168930.10.1.10650052332'
```

![](https://attach.52pojie.cn/forum/202512/17/212037z029q0prrfr9412z.png)

缺少a函数

```
function a(e) {
            for (var t = [], n = 0; n < e.length; n++)
                t.push(e[n].join("_"));
            return t.join("-")
        }
```

![](https://attach.52pojie.cn/forum/202512/17/212049ww6ao3zki92x6xwk.png)

把必须的值跟常用的函数补了之后分析一下代码

获取浏览器的用户代理字符串 `navigator.userAgent`，限制字数300

```
var o = navigator.userAgent.length > 300 ? navigator.userAgent.substring(0, 300) : navigator.userAgent;
```

判断当前对象的值是否存在某些属性，然后拼接成字符串

```
n = "fp=" + (this.fp ? this.fp : ""),
n += "&vid=" + (this.vid ? this.vid : ""),
n += "&pageId=" + (this.pageId ? this.pageId : "");
```

从 cookie 里优先提取 `_RGUID` 或 `guid__` 的值（只取小写字母、数字和“-”，并去除“-”），如果都没有，就用全局变量 `window.CHLOROFP_STATUS` 的值，然后以 `&r=xxx` 的形式拼接到参数字符串 `n` 后面

```
var r = /\_RGUID=([a-z0-9\-]+)(;|$)/.exec(document.cookie)
  , i = /guid\_\_=([a-z0-9\-]+)(;|$)/.exec(document.cookie);
r && r.length > 1 ? n += "&r=" + r[1].replace(/\-/g, "") : i && i.length > 1 ? n += "&r=" + i[1].replace(/\-/g, "") : n += "&r=" + window.CHLOROFP_STATUS;
```

这段代码就是收集ip，先从 `window.CHLOROFP_IP` 取 IP 地址，没有的话再去cookie 里读取 `_RF1` 字段提取ip。

```
var s = window.CHLOROFP_IP;
if (!s) {
    var d = /\_RF1=([0-9\.]+)(;|$)/.exec(document.cookie);
    d && d.length > 1 && (s = d[1])
}
isNaN(Number(s)) || (e = Number(s),
(t = new Array)[0] = e >>> 24 >>> 0,
t[1] = e << 8 >>> 24 >>> 0,
t[2] = e << 16 >>> 24,
t[3] = e << 24 >>> 24,
s = String(t[0]) + "." + String(t[1]) + "." + String(t[2]) + "." + String(t[3])),
s && (s = s.replace(/^\s+|\s+$/g, "")),
n += "&ip=" + s,
```

后续的代码就是各种字符串拼接，a函数之前已经扣了，h跟p都是固定数组

```
n += "&ip=" + s,
n += "&rg=" + window.RG_STA,
n += "&kpData=" + a([h[2]]),
n += "&kpControl=" + a([h[0], h[1]]),
n += "&kpEmp=" + ent(o)a(p)
```

h数组

```
[
    [
        0,
        0,
        0
    ],
    [
        0,
        0,
        0
    ],
    [
        0,
        0,
        0
    ]
]
```

p数组

```
[
    [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
    ],
    [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
    ],
    [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
    ]
]
```

后续还是获取一些浏览器信息,屏幕分辨率信息，获取当前时区与 UTC 之间的时间差，获取操作系统的默认语言设置，获取浏览器默认语言设置

```
// 屏幕分辨率信息，格式为 "&screen=宽度x高度"
n += "&screen=" + screen.width + "x" + screen.height;
// 获取当前时区与 UTC 之间的时间差（小时），getTimezoneOffset 返回分钟，除以 60 得小时
var c = (new Date).getTimezoneOffset() / 60;
// 根据时区差值 c，添加时区字符串到 n，正负号表示时区偏移方向，格式如 "&tz=+8" 或 "&tz=-5"
n += "&tz=" + (c < 0 ? "+" : "-") + Math.abs(c),
// navigator.language 是标准属性，navigator.userLanguage 是旧 IE 兼容，就是判断浏览器是不是旧IE
n += "&blang=" + navigator.language || navigator.userLanguage,
// navigator.language 是现代浏览器标准，navigator.systemLanguage 是旧 IE 兼容，就是判断浏览器是不是旧IE
n += "&oslang=" + navigator.language || navigator.systemLanguage,
// 添加编码后的用户代理字符串
n += "&ua=" + encodeURICompon
```

后续就是逗号运算符进行各个参数拼接返回n,添加了版本号，检测对象是否存在uuid,window.cookieStatusInD和forterToken，还检测了浏览器是否开启了广告拦截器

```
// 给 n 拼接一个版本参数，值为 25
return n += "&v=25",
// 如果this.uuid存在，拼接this.uuid
this.uuid && (n += "&rmsId=" + this.uuid),
// 在n后添加kpg参数值为_.join("_")
n += "&kpg=" + _.join("_"),
// 在 n 后添加 adblock 参数，检测浏览器是否开启了广告拦截器
n += "&adblock=" + function() {
    //创建一个div元素
    var e = document.createElement("div");
    //设置div的样式为1px*1px，绝对定位在页面外
    e.style.cssText = "width:1px; height: 1px; position:absolute; top: -1000px; left: -1000px;",
    //设置div内容为一个不换行空格
    e.innerHTML = " ",
    //设置div的class名为 "adsbox"
    e.className = "adsbox";
    // 默认 t 为 "F"（未检测到广告拦截）
    var t = "F";
    try {
        // 把 div 添加到 body 里
        document.body.appendChild(e),
        // 如果该 div 的高度是 0，则说明被广告拦截器隐藏，t 设为 "T"
        0 === document.getElementsByClassName("adsbox")[0].offsetHeight && (t = "T"),
        // 检查结束后移除这个 div
        document.body.removeChild(e)
    } catch (e) {
        // 如果出错，t 保持 "F"
        t = "F"
    }
    // 返回结果，"T" 表示有广告拦截，"F" 表示没有
    return t
}(),
// 在n后添加cck参数检测window.cookieStatusInD是否存在
n += "&cck=" + function() {
    //如果w存在直接返回 "T"
    if (w)
        return "T";
    var e = "F";
    try {
        window.cookieStatusInD && (e = "T")
    } catch (e) {}
    // 返回结果，"T" 表示可用，"F" 表示不可用
    return e
}(),
// 在n后添加ftoken参数如果 this.forterToken 存在就用它，否则用空字符串
n += "&ftoken=" + (this.forterToken ? this.forterToken : ""),
// 调用全局__bfi的push方法上传一些追踪信息包括vid和rmstoken（就是 n）
window.__bfi.push(["_devTrace", "215858", {
    vid: this.vid,
    rmstoken: n
}]),
// 返回最终的 n
n
```

rms值就分析完了

其余的值都在这两个函数生成的。进去函数分析各大明文都是如何生成的

![](https://attach.52pojie.cn/forum/202512/17/212117sjxtwnxyt1eoayt0.png)

### \_0x2578de函数

\_0x2578de函数就是传了个空对象进去收集浏览器指纹

* scrW收集了屏幕宽度
* scrH收集了 屏幕高度
* flaState->Flash状态（初始化为false）
* keyCodeList->键盘按键列表初始化
* userAgent->收集了用户代理字符串
* flaState->Flash是否启用，判断是否为 IE 浏览器的一个老技巧
* cookie->收集了cookie
* cookieEnabled->Cookie是否启用
* currentLang->兼容了旧版IE收集了浏览器的默认语言设置
* colorDepth->收集了显示屏每个像素使用的颜色位数
* timeZone->时区偏移
* cupClass->收集了用户计算机CPU的类型，仅支持早期IE
* platform->收集了操作系统平台
* hasSessStorage->是否支持SessionStorage
* hasLocalStorage->是否支持LocalStorage
* hasIndexedDB->是否支持IndexedDB
* hasDataBase->是否支持WebSQL Database
* doNotTrack->是否启用DoNotTrack
* touchSupport-> 是否支持触摸
* mediaStreamTrack->是否支持音频上下文（WebRTC相关）
* keyboardEventExist->键盘事件初始化为false

![](https://attach.52pojie.cn/forum/202512/17/212130mvke8885b7f8v5ym.png)

flaState 函数\_0xfdde6a分析

![](https://attach.52pojie.cn/forum/202512/17/212140og76nqvn3nv9k7nw.png)

```
function _0xfdde6a() {
  var _0x53ff91 = _0xff5547, _0x4df8a9;
  // 判断是否为 IE 浏览器的一个老技巧：
  // !-[0x1] 在 IE 浏览器中为 true，非 IE 为 false
  if (!-[0x1])
    try {
      // IE 浏览器中尝试创建 ActiveX 对象用于检测 Flash 插件
      new ActiveXObject("ShockwaveFlash.ShockwaveFlash"),
      // 成功执行，说明支持 Flash，将 _0x4df8a9 赋值为 true
      _0x4df8a9 = !![];
    } catch (_0x503272) {
      // 如果报错，说明不支持 Flash，赋值 false
      _0x4df8a9 = ![];
    }
  else
    try {
      // 非 IE 浏览器，尝试通过 navigator.plugins 检测 Flash 插件
      var _0x445090 = navigator["plugins"]["Shockwave Flash"];
      // 如果插件不存在，赋值 false，否则赋值 true
      _0x445090 == undefined ? _0x4df8a9 = ![] : _0x4df8a9 = !![];
    } catch (_0xe1f85) {
      // 如果访问 plugins 时报错，则认为不支持 Flash，赋值 false
      _0x4df8a9 = ![];
    }
  // 返回检测结果，true 表示支持 Flash，false 表示不支持
  return _0x4df8a9;
}
```

hasSessStorage值\_0x51a915检测函数

```
function _0x51a915(_0x1d7158, _0x5f3aa4) {
  // 返回表达式的结果：
  // 如果参数 _0x1d7158 有 own property 方法（hasOwnProperty），直接调用它，判断 _0x5f3aa4 是否为其自身属性
  // 否则，使用 Object.prototype.hasOwnProperty.call 方法调用，传入 _0x1d7158 和 _0x5f3aa4，进行判断
  return _0x1d7158['hasOwnProperty'] ? _0x1d7158['hasOwnProperty'](_0x5f3aa4) : Object["prototype"]['hasOwnProperty']['call'](_0x1d7158, _0x5f3aa4);
}
```

### \_0x28dcca函数

\_0x28dcca传入了刚刚\_0x2578de返回的指纹对象和\_0x28c5d2函数

![](https://attach.52pojie.cn/forum/202512/17/212157va0z3tiwa3a6al10.png)

\_0x28dcca函数

就是一些值初始化之后调用了一些函数，函数的传参都是固定的。将函数改写，获取验证码校验需要的值。

```
 function _0x28dcca(_0x40eb0c, _0x2bf1d8) {
      var _0x22771b = _0xff5547,
        _0x1dae6f = ![];
      _0x40eb0c["VID"] = null,
      _0x40eb0c['FP'] = null,
      _0x40eb0c["sVID"] = null,
      _0x40eb0c["sFP"] = null,
      _0x40eb0c['identify'] = null;
      if (typeof window["__bfi"] == "undefined")
      window["__bfi"] = [];
      window['__bfi'] && (window['__bfi']["push"](["_getStatus", function (_0x3bb4e8) {
        var _0x141c8c = _0x22771b;
        try {
          _0x3bb4e8 && _0x3bb4e8['vid'] && (_0x40eb0c["VID"] = _0x3bb4e8['vid']);
        } catch (_0x319296) {}
      }]
      ),
      window["__bfi"]["push"](['_getFP', function (_0x4f1909, _0x2bb838, _0x121040) {
        var _0x2c92bb = _0x22771b;
        try {
          _0x40eb0c['FP'] = _0x121040,
          _0x40eb0c["identify"] = _0x2bb838;
        } catch (_0x266b15) {}
      }]
      ),
      window['__bfi']["push"](['_getFP', function (_0x247fc6) {
        var _0x423a68 = _0x22771b;
        try {
          var _0x1096a7 = _0x373031["parse"](_0x247fc6);
          _0x40eb0c["sFP"] = _0x1096a7['securefp'],
          _0x40eb0c["sVID"] = _0x1096a7["vid"];
        } catch (_0x6f7b33) {}
        try {
          !_0x1dae6f ? (_0x1dae6f = !![],
          _0x2bf1d8()) : (_0x3bbca9['fp'] = _0x40eb0c['FP'],
          _0x3bbca9["vid"] = _0x40eb0c["VID"],
          _0x3bbca9["sfp"] = _0x40eb0c["sFP"],
          _0x3bbca9['identify'] = _0x40eb0c["identify"],
          _0x3bbca9["svid"] = _0x40eb0c["sVID"],
          _0xfd60a4 = _0x37644c(_0x373031["stringify"](_0x3bbca9), 0x0));
        } catch (_0x5cd2ce) {
          _0x2cd06a(_0x5cd2ce);
        }
      },
      !![]])),
      setTimeout(function () {
        try {
          !_0x1dae6f && (_0x1dae6f = !![],
          _0x2bf1d8());
        } catch (_0x2dac36) {
          _0x2cd06a(_0x2dac36);
        }
      }, 0x5dc);
    }
```

改写后的函数

```
 function _0x28dcca(_0x40eb0c, _0x2bf1d8) {
      var
        _0x1dae6f = false;
      _0x40eb0c["VID"] = null,
      _0x40eb0c['FP'] = null,
      _0x40eb0c["sVID"] = null,
      _0x40eb0c["sFP"] = null,
      _0x40eb0c['identify'] = null;
      __bfi = [];
      _0x3bb4e8 = {
    "vid": "1765596069776.caf8FqkOsXvR",
    "sid": 4,
    "pvid": 9,
    "pid": "10650052332"
}
          _0x3bb4e8 && '1765596069776.caf8FqkOsXvR' && (_0x40eb0c["VID"] = _0x3bb4e8['vid']);
          _0x40eb0c['FP'] = null,
          _0x40eb0c["identify"] = "";
          _0x40eb0c["sFP"] = undefined,
          _0x40eb0c["sVID"] = undefined;
          // _0x3bbca9['fp'] = _0x40eb0c['FP'],
          // _0x3bbca9["vid"] = _0x40eb0c["VID"],
          // _0x3bbca9["sfp"] = _0x40eb0c["sFP"],
          // _0x3bbca9['identify'] = _0x40eb0c["identify"],
          // _0x3bbca9["svid"] = _0x40eb0c["sVID"]
          return _0x40eb0c
          // _0xfd60a4 = _0x37644c(_0x373031["stringify"](_0x3bbca9), 0x0));

    }
```

## 结语

发量随风去，灵魂却愈发轻盈
