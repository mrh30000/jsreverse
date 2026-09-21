# 记一次海拍客母婴平台sign逆向js分析

> **作者**: TZ糖纸 | **发布时间**: 2023-11-07 09:51:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4798 / 34
> **原文**: [https://www.52pojie.cn/thread-1853640-1-1.html](https://www.52pojie.cn/thread-1853640-1-1.html)

---

*本帖最后由 TZ糖纸 于 2023-11-14 10:35 编辑*

![](https://attach.52pojie.cn/forum/202311/07/095129tuvkefwvn4b9befb.png)

![](https://attach.52pojie.cn/forum/202311/07/095131t3mmozow0ivyya0o.png)

[CSS] *纯文本查看*

```
function a(e, t) {
    var n = (65535 & e) + (65535 & t);
    return (e >> 16) + (t >> 16) + (n >> 16) << 16 | 65535 & n
}
function i(e, t, n, r, o, i) {
    return a((l = a(a(t, e), a(r, i))) << (c = o) | l >>> 32 - c, n);
    var l, c
}
function l(e, t, n, r, o, a, l) {
    return i(t & n | ~t & r, e, t, o, a, l)
}
function c(e, t, n, r, o, a, l) {
    return i(t & r | n & ~r, e, t, o, a, l)
}
function u(e, t, n, r, o, a, l) {
    return i(t ^ n ^ r, e, t, o, a, l)
}
function s(e, t, n, r, o, a, l) {
    return i(n ^ (t | ~r), e, t, o, a, l)
}
function f(e, t) {
    var n, r, o, i, f;
    e[t >> 5] |= 128 << t % 32,
        e[14 + (t + 64 >>> 9 << 4)] = t;
    var d = 1732584193
        , p = -271733879
        , h = -1732584194
        , m = 271733878;
    for (n = 0; n < e.length; n += 16)
        r = d,
            o = p,
            i = h,
            f = m,
            d = l(d, p, h, m, e[n], 7, -680876936),
            m = l(m, d, p, h, e[n + 1], 12, -389564586),
            h = l(h, m, d, p, e[n + 2], 17, 606105819),
            p = l(p, h, m, d, e[n + 3], 22, -1044525330),
            d = l(d, p, h, m, e[n + 4], 7, -176418897),
            m = l(m, d, p, h, e[n + 5], 12, 1200080426),
            h = l(h, m, d, p, e[n + 6], 17, -1473231341),
            p = l(p, h, m, d, e[n + 7], 22, -45705983),
            d = l(d, p, h, m, e[n + 8], 7, 1770035416),
            m = l(m, d, p, h, e[n + 9], 12, -1958414417),
            h = l(h, m, d, p, e[n + 10], 17, -42063),
            p = l(p, h, m, d, e[n + 11], 22, -1990404162),
            d = l(d, p, h, m, e[n + 12], 7, 1804603682),
            m = l(m, d, p, h, e[n + 13], 12, -40341101),
            h = l(h, m, d, p, e[n + 14], 17, -1502002290),
            d = c(d, p = l(p, h, m, d, e[n + 15], 22, 1236535329), h, m, e[n + 1], 5, -165796510),
            m = c(m, d, p, h, e[n + 6], 9, -1069501632),
            h = c(h, m, d, p, e[n + 11], 14, 643717713),
            p = c(p, h, m, d, e[n], 20, -373897302),
            d = c(d, p, h, m, e[n + 5], 5, -701558691),
            m = c(m, d, p, h, e[n + 10], 9, 38016083),
            h = c(h, m, d, p, e[n + 15], 14, -660478335),
            p = c(p, h, m, d, e[n + 4], 20, -405537848),
            d = c(d, p, h, m, e[n + 9], 5, 568446438),
            m = c(m, d, p, h, e[n + 14], 9, -1019803690),
            h = c(h, m, d, p, e[n + 3], 14, -187363961),
            p = c(p, h, m, d, e[n + 8], 20, 1163531501),
            d = c(d, p, h, m, e[n + 13], 5, -1444681467),
            m = c(m, d, p, h, e[n + 2], 9, -51403784),
            h = c(h, m, d, p, e[n + 7], 14, 1735328473),
            d = u(d, p = c(p, h, m, d, e[n + 12], 20, -1926607734), h, m, e[n + 5], 4, -378558),
            m = u(m, d, p, h, e[n + 8], 11, -2022574463),
            h = u(h, m, d, p, e[n + 11], 16, 1839030562),
            p = u(p, h, m, d, e[n + 14], 23, -35309556),
            d = u(d, p, h, m, e[n + 1], 4, -1530992060),
            m = u(m, d, p, h, e[n + 4], 11, 1272893353),
            h = u(h, m, d, p, e[n + 7], 16, -155497632),
            p = u(p, h, m, d, e[n + 10], 23, -1094730640),
            d = u(d, p, h, m, e[n + 13], 4, 681279174),
            m = u(m, d, p, h, e[n], 11, -358537222),
            h = u(h, m, d, p, e[n + 3], 16, -722521979),
            p = u(p, h, m, d, e[n + 6], 23, 76029189),
            d = u(d, p, h, m, e[n + 9], 4, -640364487),
            m = u(m, d, p, h, e[n + 12], 11, -421815835),
            h = u(h, m, d, p, e[n + 15], 16, 530742520),
            d = s(d, p = u(p, h, m, d, e[n + 2], 23, -995338651), h, m, e[n], 6, -198630844),
            m = s(m, d, p, h, e[n + 7], 10, 1126891415),
            h = s(h, m, d, p, e[n + 14], 15, -1416354905),
            p = s(p, h, m, d, e[n + 5], 21, -57434055),
            d = s(d, p, h, m, e[n + 12], 6, 1700485571),
            m = s(m, d, p, h, e[n + 3], 10, -1894986606),
            h = s(h, m, d, p, e[n + 10], 15, -1051523),
            p = s(p, h, m, d, e[n + 1], 21, -2054922799),
            d = s(d, p, h, m, e[n + 8], 6, 1873313359),
            m = s(m, d, p, h, e[n + 15], 10, -30611744),
            h = s(h, m, d, p, e[n + 6], 15, -1560198380),
            p = s(p, h, m, d, e[n + 13], 21, 1309151649),
            d = s(d, p, h, m, e[n + 4], 6, -145523070),
            m = s(m, d, p, h, e[n + 11], 10, -1120210379),
            h = s(h, m, d, p, e[n + 2], 15, 718787259),
            p = s(p, h, m, d, e[n + 9], 21, -343485551),
            d = a(d, r),
            p = a(p, o),
            h = a(h, i),
            m = a(m, f);
    return [d, p, h, m]
}
function d(e) {
    var t, n = "", r = 32 * e.length;
    for (t = 0; t < r; t += 8)
        n += String.fromCharCode(e[t >> 5] >>> t % 32 & 255);
    return n
}
function p(e) {
    var t, n = [];
    for (n[(e.length >> 2) - 1] = void 0,
        t = 0; t < n.length; t += 1)
        n[t] = 0;
    var r = 8 * e.length;
    for (t = 0; t < r; t += 8)
        n[t >> 5] |= (255 & e.charCodeAt(t / 8)) << t % 32;
    return n
}
function h(e) {
    var t, n, r = "0123456789abcdef", o = "";
    for (n = 0; n < e.length; n += 1)
        t = e.charCodeAt(n),
            o += r.charAt(t >>> 4 & 15) + r.charAt(15 & t);
    return o
}
function m(e) {
    return unescape(encodeURIComponent(e))
}
function v(e) {
    return function (e) {
        return d(f(p(e), 8 * e.length))
    }(m(e))
}
function g(e, t) {
    return function (e, t) {
        var n, r, o = p(e), a = [], i = [];
        for (a[15] = i[15] = void 0,
            o.length > 16 && (o = f(o, 8 * e.length)),
            n = 0; n < 16; n += 1)
            a[n] = 909522486 ^ o[n],
                i[n] = 1549556828 ^ o[n];
        return r = f(a.concat(p(t)), 512 + 8 * t.length),
            d(f(i.concat(r), 640))
    }(m(e), m(t))
}
function y(e, t, n) {
    return t ? n ? g(t, e) : h(g(t, e)) : n ? v(e) : h(v(e))
}
getSecretKey = function () {
    return "e54eecad4b2e7610637fed160679c948"
}
encryptSignV2 = function (e) {
    var t = e.appKey
        , n = e.data
        , r = e.t
        , o = e.os
        , l = e.token
        , c = (0,
            getSecretKey)();
    return (0,
        encrypt)({
            appKey: t,
            data: JSON.stringify(n),
            t: r,
            os: o,
            signType: "new",
            token: l
        }, c)
}
encrypt = function (e, t) {
    var n = JSON.parse(JSON.stringify(e));
    if (!t)
        throw Error("sign:secret \u5fc5\u9009");
    if (!n.t)
        throw Error("params.t \u5fc5\u9009");
    "object" === typeof n.data && (n.data = JSON.stringify(n.data));
    var r = Object.keys(n).sort()
        , a = "";
    return r.forEach((function (e) {
        a += e + n[e]
    }
    )),
        o.default(o.default(a + t) + t)
}
var o = {}
o.default = function (e, t, n) {
    return t ? n ? g(t, e) : h(g(t, e)) : n ? v(e) : h(v(e))
}
function aaaaa() {
    var d = {
        "pageNo": 6,
        "pageSize": 20,
        "searchSource": "key",
        "sortType": "3",
        "searchkey": "a2",
        "itemChildTypes": null,
        "itemSearchTypes": "",
        "dev": "prod"
    }
    var c = {
        "appKey": "1300",
        "os": "Chrome",
        "t": 1699258513623
    }
    console.log(p = (0,
        encryptSignV2)({
            appKey: c.appKey,
            data: d,
            t: c.t,
            os: c.os,
            osv: c.osv,
            model: c.model,
            token: undefined
        }))
}
```
