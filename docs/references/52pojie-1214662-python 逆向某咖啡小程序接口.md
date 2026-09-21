# python 逆向某咖啡小程序接口

> **作者**: frankyxu | **发布时间**: 2020-07-07 11:38:00 | **版块**: 『编程语言区』 | **查看/回复**: 8606 / 17
> **原文**: [https://www.52pojie.cn/thread-1214662-1-1.html](https://www.52pojie.cn/thread-1214662-1-1.html)

---

## 文章来由

### 心血来潮突然想逆向一下某小程序，于是便有了这篇文章

## 逆向工具

### wxappUnpacker

用来解压和欢迎小程序

### pycharm

编写python代码

## 原理

用android版本登录后打开小程序，然后通过手机把源码传到电脑，导入到开发者工具，然后对源码进行调试即可，一般来说，小程序端的加密会比其他客户端简单很多

## 关键代码

### 加密代码

```
var e = require("../@babel/runtime/helpers/interopRequireDefault"), i = e(require("../@babel/runtime/helpers/typeof")), o = e(require("../service/baseService/login.js")), t = e(require("./../store/store.js")), n = require("./promise/es6-promise.min.js"), a = require("./crypto.js"), r = require("../config/config.js"), s = require("./storage"), d = function(e) {
    return new n(function(o, n) {
        if (!e) return "";
        e.data || (e.data = {});
        var d = r.api.code + "" + r.api.version, u = r.api.key, l = r.api.replaceSpecial, p = "object" === (0,
        i.default)(e.data) ? JSON.stringify(e.data) : e.data, c = a.aes.en(p, u, l), f = [ "cid=".concat(d), "q=".concat(c) ], g = t.default.data.configure.uid || s.getStore("uid");
        g && g.length > 0 && f.push("uid=".concat(g)), o({
            cid: d,
            q: c,
            sign: a.md5(f.sort().join(";") + u),
            uid: g
        });
    });
};
```

### 解密代码

```
success: function(n) {
                        e.options && !1 === e.options.loading || wx.hideLoading();
                        var d = null;
                        if (n.data && "string" == typeof n.data && (d = a.aes.de(n.data, r.api.key, r.api.replaceSpecial),
                        d = JSON.parse(d)), r.api.debug && console.log("请求参数：", e, "返回结果", d), d && (t.default.data.configure.uid = d.uid,
                        s.setStore("uid", d.uid)), 5 !== d.code) if ("BASE101" !== d.BASE101) if (7 !== d.code) 1 === d.code ? i && i(d) : wx.showToast({
                            title: d.msg,
                            icon: "none",
                            duration: 2e3
                        }); else if (e.options && !0 === e.options.needOriginResult) i(d); else {
                            var u = d.msg || "业务处理错误";
                            wx.showToast({
                                title: u,
                                icon: "none",
                                duration: 2e3
                            });
                        } else wx.navigateTo({
                            url: "/pages/member/supplement/supplement"
                        }); else {
                            if (o.default.setLoginStatus(!1), e.options && !1 === e.options.needLogin) return;
                            o.default.loginRouter();
                        }
                    },
```

## 核心源码

```
var r = require("./cryptojs/cryptojs.js").Crypto, e = 128, t = function(r) {
    for (var t = function(r) {
        for (var e, t, n = [], a = 0; a < r.length; a++) {
            e = r.charCodeAt(a), t = [];
            do {
                t.push(255 & e), e >>= 8;
            } while (e);
            n = n.concat(t.reverse());
        }
        return n;
    }(r), n = new Array(), a = e / 8, s = 0; s < a; s++) t.length > s ? n.push(t[s]) : n.push(0);
    return n;
}, n = function(r, e) {
    return (255 & r[e]) << 24 | (255 & r[e + 1]) << 16 | (255 & r[e + 2]) << 8 | 255 & r[e + 3];
}, a = {
    en: function(e, n, a) {
        var s = new r.mode.ECB(r.pad.pkcs7), o = r.charenc.UTF8.stringToBytes(e), c = (r.charenc.UTF8.stringToBytes(n),
        r.AES.encrypt(o, t(n), {
            iv: "",
            mode: s,
            asBpytes: !0
        }));
        return a && (c = c.replace(/\+/g, "-").replace(/\//g, "_")), c;
    },
    de: function(e, n, a) {
        a && (e = e.replace(/-/g, "+").replace(/_/g, "/"));
        var s = new r.mode.ECB(r.pad.pkcs7), o = r.util.base64ToBytes(e);
        r.charenc.UTF8.stringToBytes(n);
        return r.AES.decrypt(o, t(n), {
            asBpytes: !0,
            mode: s,
            iv: ""
        });
    },
    md5: function(e) {
        var t = r.MD5(e, {
            asBytes: !0
        });
        if (16 !== t.length) throw new Error("MD5加密结果字节数组错误");
        var a = Math.abs(n(t, 0)), s = Math.abs(n(t, 4)), o = Math.abs(n(t, 8)), c = Math.abs(n(t, 12));
        return a.toString() + s.toString() + o.toString() + c.toString();
    }
};

module.exports = {
    aes: a,
    md5: function(e) {
        var t = r.MD5(e, {
            asBytes: !0
        });
        if (16 !== t.length) throw new Error("MD5加密结果字节数组错误");
        var a = Math.abs(n(t, 0)), s = Math.abs(n(t, 4)), o = Math.abs(n(t, 8)), c = Math.abs(n(t, 12));
        return a.toString() + s.toString() + o.toString() + c.toString();
    }
};

 var d = "230101",
     u = "GBEHvhyjW7ReK5Uw8LzS",
     l = true,
     p = "{\"Width\":1125,\"Height\":2436,\"source\":2,\"displayLocation\":0,\"miniversion\":\"3820\"}"
     c = a.en(p, u, l);
     f = [ "cid=".concat(d), "q=".concat(c), "uid=".concat("fa5ee657-658b-4337-8fc8-aaff6b83ef681594088412273") ],
     // g = t.default.data.configure.uid || s.getStore("uid"),
    sign = a.md5(f.sort().join(";") + u);
 console.log(c)
 console.log(sign)

data = 'znq6Ob4SNy9KAkGnKq34SRVAHT1Yn126aLkgMzrwwMW1DypsOMixRkMbYQI__LNNVHok4dK84qGXX1zFEG7PD6llecC8WmkPUJo4AmBsdiTUcqivS8BRxy4BuPWKSvq9L3gKR0XXYfWe0MPt572Amrkcd3tirK47xY_0djMKU8OGO7HTHeZFkEqx8swU2LyM-R8pstmpVxXIbyi-nrTzpZvqsqBh51I136EJPbuApRSDiJ4sU69Oxh-FQuZ1Zhcit4w9qq5wpP_M73GRVtbUOHJWmLs9g-NxGqwwW-RumvcI1UCy4FTi5cEYOi8K7cnbfYuHK3t4SfCe4QnwYrkZAgurb_UtDGRSbvGs489WVfj72sYRJMahv7GpBIn0cHe7su0j4D5DAPAG7RHGTvMY5Up0LfHOp3HEfACEubj59BxJbkhzWxd49qjCBWUczPQhDbcObMIzdiQTCeuGwO9cKFmTlJUmpLnoDyZqbLPDT9rymZFTTdcLlCf9NjDF1KOmiBEf7dvLq4OLFsg-vSMMC7oCNA56kFNNmc1G7B3g3uwdP3tr8CLyk7gDXH0c9ysJnOODXdKbuO7b7jrKOKKZ9W0AgS1-UIDpAKhjERk5fJmWGZ1AnkcS1gdCZA0Ddg9PSUCxYRoqiM5HvKf2zVBs7CaxgzPKPu2J3_yAEbBc0V54RidIFx6MoWJjfx8A4L6rqSa9NolPLhKSg9Tz9B0ZWN2GH-_d0EllJHZHqvXzqk5huQ40k4N3ZbSTYaTngSP6Sf8kHji7vgStDq0I64TG23dNodUKHT-Vc_sBZusX7T8TK9TwrIL6o90rj1ijaX07S_d7Owtgirjbq8SavjJgiGU6EmlWlbApKOdocUjMBb6uqeEir9QziYPWU4kPwMbB0GTrWXmf-wt0TVOaJ53PucLF3kaRUReHaavfzp4ay5pXeBRa9gnqGDBPIZ7pSjUbSJ_AUQX2cVlbeANkLtKZl1Um_TvUB6CmAjJW602GIY9gZrlsj0CARQec6AdKfFK-8S66KVvPTQaEGzD9DKdgX81ACwuBEbMZPrpIpPg8NutBmA0lPmGURdzFUMPwY5AbHL4UK-OqH3A89wbUcF4NSVuOwGDlVXE38E-dJQUB_WH9eqyzGbVaPr_obRg9pxuQt-BkYLsaoNITyZevWwtrIqHqNxSQxzJe8zH-i20pzzAAT4kh5r8nQdI3qkexDNJhoOOp1v1OMEY7YWKpFRrveCaq-ggBxbnSZgc-pLRLvlVveBbhDiec2S5lvMrhkxhQP2_b-UpqA7scI2R0CY1XS14sEk9vNh88eyLy9XqqADqQiifNSNAg_cz5g6duZSyCD7dx6YaYFbVrWSmecBS0LBCTjUn6nWZ64fMJ9CR4iVclmY88njnRu9uC6cJOzlGZuT2Zlww1WhlXPQwnbYbeHvOJxEu78ukfx5ZUfvyG4U4YJSsfQVENHRcs90Df4u5mzlOFghu783Ke5gYyMVq0EtN3buCrc-oQWb7DVFZdUBMZ5rZtnzBTeLtHu1z-tkHMoxdxQbPifzPJXyjAh9QR7PtZDxNDoHLP9enTjt3vBkIqRSC-Oa-FaigYouBHqcJphNWKGLFhOEnprt0Q85yJ0eqhqLkZF4-vrgI4yDruFivbnppEwB1nkoz5ukO08TM81nuxTEaHAX6NpoiyUUY_DD1qRfb9rZSUAK4CFU5K6TCR3WkafV5yeP6Vr9cUu60FicBDOwtCJ1I9wiewdlz4XdbO7id91Xkl-RTezb2L0ibd8d3c5dJ_kmpKDP_BQZ03-ZVZY9P8nynUyD6DJOwfHiDPz8xoA2SudAdNdS2nAfdx1D5ftnsIzBL5Ugl6f4dHuIqNziUsJwJzZnexU1EjtEGiA4lvWYDwuz8ebfcrJML--DVQCOuZdZfJtmYTINqNVZlxR6oi4XZrJV6sFC2quYvXW3oSxYGEfZGksmlm_7HnFgmleZAQ2ArXZjkMvLJBAa6uaYHfQqufMPtLNNEUY0K3WHjeh9ulV0rFY3Y9SNwHuk1QdAY5RGbyQlsJ1ZpA03du4Ktz6hBZvsNUVl1QExnmtm2fMFN4u0e7XP62QcyjF3FBs-J_M8lfKMCH1BHs-1kPE0Ogcs_16dOO3e8GQipFIL45r4VqKBii4EepwmmE1YoYsWE4Semu3RDznInRGDmaDKyyG27Sd39LDzTEqX88m_-QepN8APkA0X8qpGWmwLVJOO3B6CRCJkXxL1uVRc6yXAdYgZaIP2cagWjDf9aqWQMF0snwxIxRolDr6c5fzGowq5-mEpVIsASoqeEdHuWKvP78eNxjIveRi50Xy2abPHRfYFzqMIMdIJc6d92Y3BPJ9d0gdsnIanTR4pMCf1Yfn3kiey1jbIxOxDeDSaFFht25-348GzETN4qAUTkkYdFrW2gbakotIF3JRuqgdZ9c3KuNRrURsZSwjgn4AU4qyiFC3dbI98nlOBoBXTeeGEYISAU8ljYa6yBUeK8KHlyTg5DUVYKjQ0bYCDBR6PtP9sYq8nWit6UXoDM2giZqRLNyVwWgCLdLWcpsHeOL_SIiE6N1CTTnJ0BxhCcndFR6JOHSvOKhl19cxRBuzw-pZXnAvFppD1CaOAJgbHYk1HKor0vAUccuAbj1ikr6vdJGk8yXQTOxT3F4fHOy9wWg4_oA_TKOxYRKxXSLkqw2ed5mrmFpQthsTGmZNYk88XTkeEynPFaSYAcF7WHmApF9P9IMJ2ahbjvzuVDu-SVXEoBDlFJw6-i7XZDGp5jxjSpFIL45r4VqKBii4EepwmmyXAbEFdAU0-tx49EKqp_SU-E6E0LZ_gyaNccyhNSMLQnjqUDNYzPJcNhxuj79dHLoLDMwC_QZ-HSKSozujdpeJRLRt7aj13he9bz_1QqrlR215gVDzQHA-p5IX6djdM-fVM5X_IOsSZi4zvi_LOvOFyVAz4PxUYAPawIURmLJy0VTpXa_1pfWxqIH2Kv1DgVmkcRWeKXA3FpUtaHhbx28wIxmiYkSK9-9-EdKXtlZldRoV0ZZUsCKXq8QWv3S_LgaT2bXvpUpBJe2trtP2-DaWhr8TidlH2UjpiaeIpdvVHdNodUKHT-Vc_sBZusX7T-xamd0DfKiivuY8sS9TK7Wp3JuussdS7EzuOs2UMekrbB3UsH4eYJtkoDdGiTnj_CmwLVJOO3B6CRCJkXxL1uVRc6yXAdYgZaIP2cagWjDf9aqWQMF0snwxIxRolDr6c5fzGowq5-mEpVIsASoqeEdHuWKvP78eNxjIveRi50Xy2abPHRfYFzqMIMdIJc6d92Y3BPJ9d0gdsnIanTR4pMCf1Yfn3kiey1jbIxOxDeDSVcRdUOEcGndY31mVJoYnvlVjPpPtiIkg94Ff6MqSqQKDSLRP9MOxwjGfe-FCR5QdU4qyiFC3dbI98nlOBoBXTeeGEYISAU8ljYa6yBUeK8KmQVvwIwBzrGavZ6CUqVTF7dlSDtCn7adwvU8c4Athe8eN56og2IHwJJkuM6f3rxZU_CVLNFA7YOuG4MuGpcVC7kix9olj1fws5QZ-avXbx6ecnybdvZkCRK7RyuI8fkfntdz0T9SsjtMDY1E1-SpuXuiVC-PnwhO7OD-jIwgK9A71k4622Y3zSqKfBnqbP4EJcESFx0okbQ4tZazL6PuQ8NHhAKx3psl-m7USQTD7uLVzduLylOsNvdM7z6e9TImpYYeHcg6QPu1mCH-vllKfgUrYSLQa9GOEx61IhDvbAC4O8D-HBMfK_ex3AUug8FLXikf3sn8NvOOYx9cV6knkXTkeEynPFaSYAcF7WHmApF9P9IMJ2ahbjvzuVDu-SVXEoBDlFJw6-i7XZDGp5jxjSpFIL45r4VqKBii4EepwmmyXAbEFdAU0-tx49EKqp_SU-E6E0LZ_gyaNccyhNSMLQnjqUDNYzPJcNhxuj79dHLoLDMwC_QZ-HSKSozujdpeiCCzna2Av2s3K7nM4W044i0nBYL8f9XN_dOdsVAx_RFLlAsNA4k52FHwWgPYyZHOFyVAz4PxUYAPawIURmLJy2uqYJ9vwB-Fz6nE7g38LAwj76CH8YAbcSLNFha9AFlVwIxmiYkSK9-9-EdKXtlZlUdItyhXSvzd-dtmt-ljFKXr6nSBgk1J33TXvbL8Qf8JvMZ013pPBbhxCauHQFE5gzDF6Gfz0UTZqYG00lODDSwwW3H3I-bpSEO2nIjt2rNM7orIAcEH3IcNMdVJvpKG6Ty5Eb8frTOaeP816tff301GGCIkaD4uYF_49g_Gb4yoCCgQde9mROa-KQqOgxHioA=='

var result = a.de(data,u,l);
 console.log(result)
```

## python代码（非完整代码，仅供学习使用）

```
import requests

headers = {
    'Pragma': 'no-cache',
    'Sec-Fetch-Site': 'cross-site',
    'Origin': 'http://127.0.0.1:64433',
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1 wechatdevtools/1.02.1910120 MicroMessenger/7.0.4 Language/zh_CN webview/',
    'content-type': 'application/x-www-form-urlencoded',
    'Accept': '*/*',
    'Cache-Control': 'no-cache',
    'Sec-Fetch-Dest': 'empty',
    'Referer': 'https://servicewechat.com/wx320c13777fb3443d/devtools/page-frame.html',
    'Sec-Fetch-User': '?F',
    'Connection': 'keep-alive',
}

data = {
  'cid': '230101',
  'q': 'sY9NqpIBOPCmlF8Xc7Xd5oYDqzSQ3aUezMpgSp4RuYRaAHJ_Nu67z-UFU7M4Q891QooDqZx-s_CGYrW0ITN4o5TU2yMyW_MXwykUqD3iNgg=',
  'sign': '111847979720550523108734027961242945837',
  'uid': 'xxx'
}

response = requests.post('https://capi.xxx.com/resource/core/v1/product/list', headers=headers, data=data)
```

## 感谢阅读
