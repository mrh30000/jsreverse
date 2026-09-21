# nodejs 搭建某音web端_signature参数生成的服务（puppeteer+express）

> **作者**: 天空宫阙 | **发布时间**: 2020-03-18 17:40:00 | **版块**: 『编程语言区』 | **查看/回复**: 15232 / 126
> **原文**: [https://www.52pojie.cn/thread-1134741-1-1.html](https://www.52pojie.cn/thread-1134741-1-1.html)

---

*本帖最后由 天空宫阙 于 2020-3-20 19:09 编辑*

nodejs 搭建某音web端\_signature参数的服务（puppeteer+express）
核心思路照搬 <https://github.com/coder-fly/douyin-signature>
自己改的代码地址 <https://github.com/skygongque/douyin_signature>

改成puppeteer驱动chromium，并用express做成服务，这样就是纯js的。
核心逻辑是
1.得到uid请求源码得到tac
2.puppeteer驱动chromium在console中执行签名算法
3.返回signature

尝试过在node环境中计算signature奈何那段签名算法混淆太牛逼无法移除检测环境的代码

## 环境需求
### node puppeteer express superagent
自行npm 或 cnpm 安装

puppeteer安装如果出错自行百度

## 在本地搭建服务生成指定uid的signature
### 搭建完成后
另外启动服务后耐心等待几秒等初始化完毕再请求接口，毕竟要启动一个无头浏览器快不了，之后的响应还是很快的。
可请求接口

`
http://localhost:5000/user?uid=102064772608
`

返回内容示例

![](https://attach.52pojie.cn/forum/202003/18/172118jjfj88w4hhuhe8fu.png)

## 更进一步传入uid直接返回主页json数据
请求接口

`
http://localhost:5000/data?uid=102064772608
`

返回内容示例

![](https://attach.52pojie.cn/forum/202003/18/172223y17xyxs75rrn5ixr.png)

**核心服务代码**

[JavaScript] *纯文本查看*

```
const express = require('express');
const puppeteer = require('puppeteer');
const get_sign = require('./douyin_2');
const superagent = require('superagent');
// var bodyParser = require('body-parser');

const app = express();
// app.use(bodyParser());

var browser;
var page;

(async () => {
    // 初始化
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    page = await browser.newPage();
    // 去除webdriver
    await page.evaluateOnNewDocument(() => {
        const newProto = navigator.__proto__;
        delete newProto.webdriver;
        navigator.__proto__ = newProto;
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36');
    console.log('初始化完毕');
})();

// http://localhost:5000/user?uid=102064772608
app.get('/user', async function (req, res) {
    try {
        console.log(req.url);
        var uid = req.query.uid;
        // 特殊字符存在，代码请求的tac有问题
        var tac_ = '|ms g,)gk}ejo{\x7fcms!g,&Iebli\x7fms"l!,)~oih\x7fgyucmk"t (\x80,.jjvx|vDgyg}knbl"d"inkfl"v,.jjvx|vDgyg}knbmxl!,)~oih\x7fgyucgr&Objectn vuq%valuevfq(writable[#c}) %{s#t ,4KJarz}hrjxl@EWCOQDRB,3LKfs{}wsnqB{iAMWBP@,;DCj{}DSKUAWyTK[C[XrHZ^RFZ[[,7HGn\x7fyxowiES}PGWOW\\vL^BN,5JI`}{~iuk{m\x7fRAQMURxNG,3LKsnsjpl~nB{iAMWBP@,2MLpg\x7fa}kEnrjl~PQGG,5JI`}{~iuk{m\x7fTLTVDVWMM,1NMwf|`rjF\x7fm}qk~TD,4KJert|tripAjNVPBTUCC,4KJpo|ksmyoAjNVPBTUCC[+s#,)Vyn`h`fe|,,olbcCt~vz|cz,6ID}u\x7fuuhs@ieg|v@EHZMOY[#s$l$*%s%l%u&k4s&l$l&ms\'l l\'mk"t j\x06l#*%s%l%u&k?s&l#l&ms\'l ,(lfi~ah`{ml\'mk"t j\ufffbl ,(lfi~ah`{m*%s%l%u&kls&l&vr%matchxgr&RegExp$*\\$[a-z]dc_$ n"[!cvk:}l ,(lfi~ah`{ml&m,&efkaoTmk"t j\uffcef z[ cb|1d<,%Dscafgd"in,8[xtm}nLzNEGQMKAdGG^NTY\x1ckgd"inb<b|1d<g,&TboLr{m,(\x02)!jx-2n&vr$testxg,%@tug{mn ,%vrfkbm[!cb|'
        var _tac = await getTac(uid);
        // console.log(_tac)
        if (_tac == null) {
            res.send(`{"code":-1,"context":"Fail to get tac.","reason":"No such uid ${uid}.Try again if you sure uid is correct."}`);
        } else {
            tac = _tac + tac_;
            // console.log(tac)
            // var tac = 'i)6a5my560cs!i#158s"0y\u02a1g,&qnfme|ms g,)gk}ejo{\x7fcms!g,&Iebli\x7fms"l!,)~oih\x7fgyucmk"t (\x80,.jjvx|vDgyg}knbl"d"inkfl"v,.jjvx|vDgyg}knbmxl!,)~oih\x7fgyucgr&Objectn vuq%valuevfq(writable[#c}) %{s#t ,4KJarz}hrjxl@EWCOQDRB,3LKfs{}wsnqB{iAMWBP@,;DCj{}DSKUAWyTK[C[XrHZ^RFZ[[,7HGn\x7fyxowiES}PGWOW\\vL^BN,5JI`}{~iuk{m\x7fRAQMURxNG,3LKsnsjpl~nB{iAMWBP@,2MLpg\x7fa}kEnrjl~PQGG,5JI`}{~iuk{m\x7fTLTVDVWMM,1NMwf|`rjF\x7fm}qk~TD,4KJert|tripAjNVPBTUCC,4KJpo|ksmyoAjNVPBTUCC[+s#,)Vyn`h`fe|,,olbcCt~vz|cz,6ID}u\x7fuuhs@ieg|v@EHZMOY[#s$l$*%s%l%u&k4s&l$l&ms\'l l\'mk"t j\x06l#*%s%l%u&k?s&l#l&ms\'l ,(lfi~ah`{ml\'mk"t j\ufffbl ,(lfi~ah`{m*%s%l%u&kls&l&vr%matchxgr&RegExp$*\\$[a-z]dc_$ n"[!cvk:}l ,(lfi~ah`{ml&m,&efkaoTmk"t j\uffcef z[ cb|1d<,%Dscafgd"in,8[xtm}nLzNEGQMKAdGG^NTY\x1ckgd"inb<b|1d<g,&TboLr{m,(\x02)!jx-2n&vr$testxg,%@tug{mn ,%vrfkbm[!cb|'
            // await page.goto(`[url=https://www.iesdouyin.com/share/user/]https://www.iesdouyin.com/share/user/[/url]${uid}`);
            var result = await get_signature_for_get(uid, tac);
            res.send(result);
        }

    } catch (e) {
        res.send(e);
    }

})

app.get('/data', async function (req, res) {
    try {
        console.log(req.url);
        var uid = req.query.uid;
        var tac_ = '|ms g,)gk}ejo{\x7fcms!g,&Iebli\x7fms"l!,)~oih\x7fgyucmk"t (\x80,.jjvx|vDgyg}knbl"d"inkfl"v,.jjvx|vDgyg}knbmxl!,)~oih\x7fgyucgr&Objectn vuq%valuevfq(writable[#c}) %{s#t ,4KJarz}hrjxl@EWCOQDRB,3LKfs{}wsnqB{iAMWBP@,;DCj{}DSKUAWyTK[C[XrHZ^RFZ[[,7HGn\x7fyxowiES}PGWOW\\vL^BN,5JI`}{~iuk{m\x7fRAQMURxNG,3LKsnsjpl~nB{iAMWBP@,2MLpg\x7fa}kEnrjl~PQGG,5JI`}{~iuk{m\x7fTLTVDVWMM,1NMwf|`rjF\x7fm}qk~TD,4KJert|tripAjNVPBTUCC,4KJpo|ksmyoAjNVPBTUCC[+s#,)Vyn`h`fe|,,olbcCt~vz|cz,6ID}u\x7fuuhs@ieg|v@EHZMOY[#s$l$*%s%l%u&k4s&l$l&ms\'l l\'mk"t j\x06l#*%s%l%u&k?s&l#l&ms\'l ,(lfi~ah`{ml\'mk"t j\ufffbl ,(lfi~ah`{m*%s%l%u&kls&l&vr%matchxgr&RegExp$*\\$[a-z]dc_$ n"[!cvk:}l ,(lfi~ah`{ml&m,&efkaoTmk"t j\uffcef z[ cb|1d<,%Dscafgd"in,8[xtm}nLzNEGQMKAdGG^NTY\x1ckgd"inb<b|1d<g,&TboLr{m,(\x02)!jx-2n&vr$testxg,%@tug{mn ,%vrfkbm[!cb|'
        var _tac = await getTac(uid);
        if (_tac == null) {
            res.send(`{"code":-1,"context":"Fail to get tac.","reason":"No such uid ${uid}.Try again if you sure uid is correct."}`);
        } else {
            tac = _tac + tac_;
            var result = await get_signature_for_get(uid, tac);
            var data_json = await get_data(uid, result.signature);
            res.send(JSON.stringify(data_json));
        }
    } catch (e) {
        res.send(e);
    }

})

app.listen(5000, function () {
    console.log('启动服务端口5000')
})

async function get_signature_for_get(uid, tac) {
    console.log('prepare to get signature...')
    // await page.evaluate(`var uid ="${uid}"`);
    // var tac='i)6a5577mhvs!i#ds7s"0y\u02a1g,&qnfme|ms g,)gk}ejo{\x7fcms!g,&Iebli\x7fms"l!,)~oih\x7fgyucmk"t (\x80,.jjvx|vDgyg}knbl"d"inkfl"v,.jjvx|vDgyg}knbmxl!,)~oih\x7fgyucgr&Objectn vuq%valuevfq(writable[#c}) %{s#t ,4KJarz}hrjxl@EWCOQDRB,3LKfs{}wsnqB{iAMWBP@,;DCj{}DSKUAWyTK[C[XrHZ^RFZ[[,7HGn\x7fyxowiES}PGWOW\\vL^BN,5JI`}{~iuk{m\x7fRAQMURxNG,3LKsnsjpl~nB{iAMWBP@,2MLpg\x7fa}kEnrjl~PQGG,5JI`}{~iuk{m\x7fTLTVDVWMM,1NMwf|`rjF\x7fm}qk~TD,4KJert|tripAjNVPBTUCC,4KJpo|ksmyoAjNVPBTUCC[+s#,)Vyn`h`fe|,,olbcCt~vz|cz,6ID}u\x7fuuhs@ieg|v@EHZMOY[#s$l$*%s%l%u&k4s&l$l&ms\'l l\'mk"t j\x06l#*%s%l%u&k?s&l#l&ms\'l ,(lfi~ah`{ml\'mk"t j\ufffbl ,(lfi~ah`{m*%s%l%u&kls&l&vr%matchxgr&RegExp$*\\$[a-z]dc_$ n"[!cvk:}l ,(lfi~ah`{ml&m,&efkaoTmk"t j\uffcef z[ cb|1d<,%Dscafgd"in,8[xtm}nLzNEGQMKAdGG^NTY\x1ckgd"inb<b|1d<g,&TboLr{m,(\x02)!jx-2n&vr$testxg,%@tug{mn ,%vrfkbm[!cb|'
    // douyin_2 文件的函数
    var get_signature = get_sign.get_signature;
    // uid,tac
    var args = {
        "uid": uid,
        "tac": Buffer.from(tac, 'utf-8').toString('base64'),
    }
    args_str = JSON.stringify(args);
    // console.log(args_str);
    var signature = await page.evaluate(get_signature, args_str);
    console.log(signature)
    return signature;
};

async function getTac(uid) {
    console.log('getting tac...')
    try {
        var url = `[url=https://www.iesdouyin.com/share/user/]https://www.iesdouyin.com/share/user/[/url]${uid}`
        var res = await superagent.get(url)
            .set({
                'user-agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.116 Safari/537.36',
            })
            .timeout({
                response: 5000,  // Wait 5 seconds for the server to start sending,
                deadline: 10000, // but allow 10 seconds for the file to finish loading.
            })
            .retry(2);
        var result = res.text.match(/<script>tac=\'(.*?)\'<\/script>/g)[0];
        var tac = result.slice(13, result.length - 10);
        // 代码请求的完整Tac有错误，只取tac一小部分
        return tac.split('|')[0];
    } catch (e) {
        return null;
    }

}

async function get_data(uid, signature) {
    // console.log(signature);
    try {
        var url = `[url=https://www.iesdouyin.com/web/api/v2/aweme/post/?user_id=]https://www.iesdouyin.com/web/api/v2/aweme/post/?user_id=[/url]${uid}&sec_uid=&count=21&max_cursor=0&aid=1128&_signature=${signature}&dytk=df4a9c279a56fe0d2bca0d3d98d36320`
        // console.log(url);
        var res = await superagent.get(url)
            .set({
                'user-agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36',
                // 'accept': 'application/json',
                // 'accept-encoding': "gzip, br",
            })
            .timeout({
                response: 5000,  // Wait 5 seconds for the server to start sending,
                deadline: 10000, // but allow 10 seconds for the file to finish loading.
            })
            .retry(2);
        return res.body;
    } catch (e) {
        console.log(e)
        return null;
    }
}
```

**douyin\_2.js文件中的代码**

[JavaScript] *纯文本查看*

```
function get_signature(args_str) {
    var args = JSON.parse(args_str);
    var uid = args.uid;
    this.tac = decodeURIComponent(escape(window.atob(args.tac)));
    var mytest = {};
    this.navigator = {
        userAgent: "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36"
    }
    !function anonymous1() {
        function e(e, a, r) {
            return (b[e] || (b[e] = t("x,y", "return x " + e + " y")))(r, a)
        }
        function a(e, a, r) {
            return (k[r] || (k[r] = t("x,y", "return new x[y](" + Array(r + 1).join(",x[++y]").substr(1) + ")")))(e, a)
        }
        function r(e, a, r) {
            var n, t, s = {}, b = s.d = r ? r.d + 1 : 0;
            for (s["$" + b] = s,
                t = 0; t < b; t++)
                s[n = "$" + t] = r[n];
            for (t = 0,
                b = s.length = a.length; t < b; t++)
                s[t] = a[t];
            return c(e, 0, s)
        }
        function c(t, b, k) {
            function u(e) {
                v[x++] = e
            }
            function f() {
                return g = t.charCodeAt(b++) - 32,
                    t.substring(b, b += g)
            }
            function l() {
                try {
                    y = c(t, b, k)
                } catch (e) {
                    h = e,
                        y = l
                }
            }
            for (var h, y, d, g, v = [], x = 0; ;)
                switch (g = t.charCodeAt(b++) - 32) {
                    case 1:
                        u(!v[--x]);
                        break;
                    case 4:
                        v[x++] = f();
                        break;
                    case 5:
                        u(function (e) {
                            var a = 0
                                , r = e.length;
                            return function () {
                                var c = a < r;
                                return c && u(e[a++]),
                                    c
                            }
                        }(v[--x]));
                        break;
                    case 6:
                        y = v[--x],
                            u(v[--x](y));
                        break;
                    case 8:
                        if (g = t.charCodeAt(b++) - 32,
                            l(),
                            b += g,
                            g = t.charCodeAt(b++) - 32,
                            y === c)
                            b += g;
                        else if (y !== l)
                            return y;
                        break;
                    case 9:
                        v[x++] = c;
                        break;
                    case 10:
                        u(s(v[--x]));
                        break;
                    case 11:
                        y = v[--x],
                            u(v[--x] + y);
                        break;
                    case 12:
                        for (y = f(),
                            d = [],
                            g = 0; g < y.length; g++)
                            d[g] = y.charCodeAt(g) ^ g + y.length;
                        u(String.fromCharCode.apply(null, d));
                        break;
                    case 13:
                        y = v[--x],
                            h = delete v[--x][y];
                        break;
                    case 14:
                        v[x++] = t.charCodeAt(b++) - 32;
                        break;
                    case 59:
                        u((g = t.charCodeAt(b++) - 32) ? (y = x,
                            v.slice(x -= g, y)) : []);
                        break;
                    case 61:
                        u(v[--x][t.charCodeAt(b++) - 32]);
                        break;
                    case 62:
                        g = v[--x],
                            k[0] = 65599 * k[0] + k[1].charCodeAt(g) >>> 0;
                        break;
                    case 65:
                        h = v[--x],
                            y = v[--x],
                            v[--x][y] = h;
                        break;
                    case 66:
                        u(e(t[b++], v[--x], v[--x]));
                        break;
                    case 67:
                        y = v[--x],
                            d = v[--x],
                            u((g = v[--x]).x === c ? r(g.y, y, k) : g.apply(d, y));
                        break;
                    case 68:
                        u(e((g = t[b++]) < "<" ? (b--,
                            f()) : g + g, v[--x], v[--x]));
                        break;
                    case 70:
                        u(!1);
                        break;
                    case 71:
                        v[x++] = n;
                        break;
                    case 72:
                        v[x++] = +f();
                        break;
                    case 73:
                        u(parseInt(f(), 36));
                        break;
                    case 75:
                        if (v[--x]) {
                            b++;
                            break
                        }
                    case 74:
                        g = t.charCodeAt(b++) - 32 << 16 >> 16,
                            b += g;
                        break;
                    case 76:
                        u(k[t.charCodeAt(b++) - 32]);
                        break;
                    case 77:
                        y = v[--x],
                            u(v[--x][y]);
                        break;
                    case 78:
                        g = t.charCodeAt(b++) - 32,
                            u(a(v, x -= g + 1, g));
                        break;
                    case 79:
                        g = t.charCodeAt(b++) - 32,
                            u(k["$" + g]);
                        break;
                    case 81:
                        h = v[--x],
                            v[--x][f()] = h;
                        break;
                    case 82:
                        u(v[--x][f()]);
                        break;
                    case 83:
                        h = v[--x],
                            k[t.charCodeAt(b++) - 32] = h;
                        break;
                    case 84:
                        v[x++] = !0;
                        break;
                    case 85:
                        v[x++] = void 0;
                        break;
                    case 86:
                        u(v[x - 1]);
                        break;
                    case 88:
                        h = v[--x],
                            y = v[--x],
                            v[x++] = h,
                            v[x++] = y;
                        break;
                    case 89:
                        u(function () {
                            function e() {
                                return r(e.y, arguments, k)
                            }
                            return e.y = f(),
                                e.x = c,
                                e
                        }());
                        break;
                    case 90:
                        v[x++] = null;
                        break;
                    case 91:
                        v[x++] = h;
                        break;
                    case 93:
                        h = v[--x];
                        break;
                    case 0:
                        return v[--x];
                    default:
                        u((g << 16 >> 16) - 16)
                }
        }
        var n = this
            , t = n.Function
            , s = Object.keys || function (e) {
                var a = {}
                    , r = 0;
                for (var c in e)
                    a[r++] = c;
                return a.length = r,
                    a
            }
            , b = {}
            , k = {};
        return r
    }()
        ('gr$Daten Иb/s!l y&#850;y&#313;g,(lfi~ah`{mv,-n|jqewVxp{rvmmx,&effkx[!cs"l".Pq%widthl"@q&heightl"vr*getContextx$"2d[!cs#l#,*;?|u.|uc{uq$fontl#vr(fillTextx$$龘&#3601;&#3616;&#44221;2<[#c}l#2q*shadowBlurl#1q-shadowOffsetXl#$$limeq+shadowColorl#vr#arcx88802[%c}l#vr&strokex[ c}l"v,)}eOmyoZB]mx[ cs!0s$l$Pb<k7l l!r&lengthb%^l$1+s$jl  s#i$1ek1s$gr#tack4)zgr#tac$! +0o![#cj?o ]!l$b%s"o ]!l"l$b*b^0d#>>>s!0s%yA0s"l"l!r&lengthb<k+l"^l"1+s"jl  s&l&z0l!$ +["cs\'(0l#i\'1ps9wxb&s() &{s)/s(gr&Stringr,fromCharCodes)0s*yWl ._b&s o!])l l Jb<k$.aj;l .Tb<k$.gj/l .^b<k&i"-4j!+& s+yPo!]+s!l!l Hd>&l!l Bd>&+l!l <d>&+l!l 6d>&+l!l &+ s,y=o!o!]/q"13o!l q"10o!],l 2d>& s.{s-yMo!o!]0q"13o!]*Ld<l 4d#>>>b|s!o!l q"10o!],l!& s/yIo!o!].q"13o!],o!]*Jd<l 6d#>>>b|&o!]+l &+ s0l-l!&l-l!i\'1z141z4b/@d<l"b|&+l-l(l!b^&+l-l&zl\'g,)gk}ejo{cm,)|yn~Lij~em["cl$b%@d<l&zl\'l $ +["cl$b%b|&+l-l%8d<@b|l!b^&+ q$sign ', [Object.defineProperty(mytest, "__esModule", {
            value: !0
        })])
    // var nonce = "102064772608"
    var signature = mytest.sign(uid);
    return {
        "code": 0,
        "signature": signature,
        "userAgent": navigator.userAgent
    }
}

// var args_str =  '{"uid":"102064772608","tac":"aSk2YTVteTU2MGNzIWkjMTU4cyIwecqhZywmcW5mbWV8bXMgZywpZ2t9ZWpve39jbXMhZywmSWVibGl/bXMibCEsKX5vaWh/Z3l1Y21rInQgKMKALC5qanZ4fHZEZ3lnfWtuYmwiZCJpbmtmbCJ2LC5qanZ4fHZEZ3lnfWtuYm14bCEsKX5vaWh/Z3l1Y2dyJk9iamVjdG4gdnVxJXZhbHVldmZxKHdyaXRhYmxlWyNjfSkgJXtzI3QgLDRLSmFyen1ocmp4bEBFV0NPUURSQiwzTEtmc3t9d3NucUJ7aUFNV0JQQCw7RENqe31EU0tVQVd5VEtbQ1tYckhaXlJGWltbLDdIR25/eXhvd2lFU31QR1dPV1x2TF5CTiw1SklgfXt+aXVre21/UkFRTVVSeE5HLDNMS3Nuc2pwbH5uQntpQU1XQlBALDJNTHBnf2F9a0VucmpsflBRR0csNUpJYH17fml1a3ttf1RMVFZEVldNTSwxTk13ZnxgcmpGf219cWt+VEQsNEtKZXJ0fHRyaXBBak5WUEJUVUNDLDRLSnBvfGtzbXlvQWpOVlBCVFVDQ1srcyMsKVZ5bmBoYGZlfCwsb2xiY0N0fnZ6fGN6LDZJRH11f3V1aHNAaWVnfHZARUhaTU9ZWyNzJGwkKiVzJWwldSZrNHMmbCRsJm1zJ2wgbCdtayJ0IGoGbCMqJXMlbCV1Jms/cyZsI2wmbXMnbCAsKGxmaX5haGB7bWwnbWsidCBq77+7bCAsKGxmaX5haGB7bSolcyVsJXUma2xzJmwmdnIlbWF0Y2h4Z3ImUmVnRXhwJCpcJFthLXpdZGNfJCBuIlshY3ZrOn1sICwobGZpfmFoYHttbCZtLCZlZmthb1RtayJ0IGrvv45mIHpbIGNifDFkPCwlRHNjYWZnZCJpbiw4W3h0bX1uTHpORUdRTUtBZEdHXk5UWRxrZ2QiaW5iPGJ8MWQ8ZywmVGJvTHJ7bSwoAikhangtMm4mdnIkdGVzdHhnLCVAdHVne21uICwldnJma2JtWyFjYnw="}'
// console.log(get_signature(args_str))

module.exports = {
    get_signature
}
```

尝试获取代码获取完整tac并进行传递，但发现代码获取的tac与浏览器中的不同（原因可能是特殊字符的编码问题），所以只获取tac的前一小部分。
传递前用base64编码防止因特殊字符的存在产生各种问题。

总结一下两个未解决的问题
代码获取完整且编码正确的tac
去除签名算法中的环境监测使其可以在node环境运行并得到正确结果

再放一遍代码开源地址（求star）
<https://github.com/skygongque/douyin_signature/>

另外如果对你有帮助，免费评分吧
