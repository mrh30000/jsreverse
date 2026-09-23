# LightningChart JS 去水印

> **作者**: 陌路无人 | **发布时间**: 2023-06-06 18:31:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6704 / 43
> **原文**: [https://www.52pojie.cn/thread-1794274-1-1.html](https://www.52pojie.cn/thread-1794274-1-1.html)

---

## LightningChart JS 去水印

### 前言

LightningChart作为使用WebGL绘制图表的Js库，加上属于商业版本，流畅和专业性毋庸置疑，JS版本还提供社区版，说是性能没有区别，只是右下角多了个水印（点击后跳转到官网）。

这个水印看着挺别扭的，看看能不能去掉。

### 步骤

作为JS库，能做的保护基本就是混淆了，其他方法又麻烦，兼容性也差，所以直接下载最新版本，去JS格式化网站格式化一下。

水印指向官网，说明有个链接，试试能不能搜到。

```
Wq = function() {
    return wr.open("https://www.arction.com/lightningchart-js/")
}
```

因为被混淆了，名字叫Wq，其他版本可能就是其他名字了，不过好在网站地址没有加密。

搜索看哪里调用了。

```
return u.sE = function() {
    o = wr.setTimeout((function() {
        h = i.Qr(t.MouseStyles.Point),
            void 0 !== u.cl && (u.cl.setMouseClickEventHandler(Wq), u.cl.setTouchEndEventHandler(Wq)),
            u.rE = !0,
            console.log(u),
            a(u)
    }), 500)
},
```

有个setMouseClickEventHandler方法，鼠标点击传递网站地址进去。不过是个事件注册，看看整个方法。

```
jq = function(i) {
        var n, e, r, s = function() {};
        // 定义logo图片 oY是灰度logo eY是彩色
        if (new wr.Image instanceof wr.HTMLImageElement) { (h = new wr.Image).src = oY,
            e = new uY({
                source: h,
                fitMode: t.ImageFitMode.Stretch
            });
            var o = new wr.Image;
            o.src = eY,
            r = new uY({
                source: o,
                fitMode: t.ImageFitMode.Stretch
            })
        } else if (wr.lcjs_setup) {
            var h; (h = new wr.Image).src = oY;
            var u = wr.lcjs_setup(h.naturalWidth, h.naturalHeight);
            u.getContext("2d").drawImage(h, 0, 0),
            e = new uY({
                source: u,
                fitMode: t.ImageFitMode.Stretch
            }),
            r = e
        } else e = new Ee({
            color: Fe("#00000000")
        }),
        r = e;
        var a = function(t) {
            var s = t.Rt.tn();
            if (t.cl && (t.rE && (r ? t.cl.$n(r) : wr.requestAnimationFrame((function() {
                return a(t)
            }))), t.rE || (e ? t.cl.$n(e) : wr.requestAnimationFrame((function() {
                return a(t)
            })))), t.cl) {
                var o = t.rE ? iY: rY,
                h = t.rE ? nY: sY,
                u = t.Rt.x.getInnerEnd() - (3 + o) * s.x,
                f = t.Rt.y.getInnerStart() + 3 * s.y;
                t.cl.ph({
                    x: u,
                    y: f
                }).oi({
                    x: o * s.x,
                    y: h * s.y
                })
                //Iq(0, 36, 1, 38, 5) 检测到篡改
            } ! 1 === t.rE && (2610 !== oY.length && Vq(Iq(0, 36, 1, 38, 5), i, !1), "M" !== oY[429] && Vq(Iq(0, 36, 1, 38, 5), i, !1)),
            !0 === t.rE && (3958 !== eY.length && Vq(Iq(0, 36, 1, 38, 5), i, !1), "2" !== eY[638] && Vq(Iq(0, 36, 1, 38, 5), i, !1)),
            n && n.xn()
        };
        return n = i.$v(Number.MAX_SAFE_INTEGER),
        function(r) {
            var o, h, u = {
                Rt: r,
                rE: !1
            };

            return u.sE = function() {
                o = wr.setTimeout((function() {
                    h = i.Qr(t.MouseStyles.Point),
                    void 0 !== u.cl && (u.cl.setMouseClickEventHandler(Wq), u.cl.setTouchEndEventHandler(Wq)),
                    u.rE = !0,
                    console.log(u),
                    a(u)
                }), 500)
            },
            u.oE = function() {
                wr.clearTimeout(o),
                i.ts(h),
                void 0 !== u.cl && (u.cl.setMouseClickEventHandler(s), u.cl.setTouchEndEventHandler(s)),
                u.rE = !1,
                a(u)
            },
            function(t) {
                t.cl && t.cl.dispose()
                // let mm = n.Pc(t.Rt);    // 划分图片区域
                // console.log(e)
                // console.log(e.Ft.ot['array'][0])    //图片base64
                // let m3 = mm.$n(e)       // 填充图片
                // let m4 = m3.Ys(ir)      // 消除边框?
                // console.log(n.Pc(t.Rt).$n(e).Ys(ir))
                //console.trace()
                n && (t.cl = n.Pc(t.Rt).$n(e).setMouseInteractions(!0).setMouseClickEventHandler(s).setTouchEndEventHandler(s).Ys(ir), t.sE && t.cl.setMouseEnterEventHandler(t.sE), t.oE && t.cl.setMouseLeaveEventHandler(t.oE), a(t))
                ///t.cl = void 0
            } (u),
            {
                Fe: function() {
                    return a(u)
                },
                ro: function() {
                    return function(t) {
                        t.cl && (t.cl.dispose(), t.cl = void 0, t.sE = function() {},
                        t.oE = function() {})
                    } (u)
                }
            }
        }
    },
```

混淆的太厉害了，直接看很难分析出逻辑是什么，所以加上console.log和trace判断变量信息以及调用堆栈。

看看是谁调用了Jq这个函数。用函数里加上console.trace()看看是谁调用。

```
        t.prototype.oy = function(t, i) {
            if (t) {
                //##########
                var n = t(i);               // 加载水印
                //console.log(n)
                //n.ro()
                this.onResize(n.Fe.bind(n)) // 界面调整时移动位置
                this.Gv = n.ro.bind(n)
                this.Hv = n.Fe.bind(n)  // 加载时获取位置
            }
        },
```

给t设置了一个属性，传进来的参数t就是Jq函数，然后执行并绑定事件，我们直接注释掉这个if就能够去水印了。

### 许可证验证流程

通过漫长的调试分析，记录一下分析出的许可证验证流程。

可以看到代码中有个license，而且我们使用时创建图表也是以lightningChart为入口并返回了多个图表类型，包括我们常用的ChartXY。

```
t.lightningChart = function(t, i) {
        var n = "object" == typeof t ? t.license: t,
        e = "object" == typeof t ? t.licenseInformation: i,
        r = "object" == typeof t ? t: void 0,
        s = new Pq;
        return s.e = n || "",
        Cq || (Cq = Hq(e)),
        function(t, i, n) {
            return {
                Dashboard: Uq(t, i, n),
                ChartXY: Zq(t, i, n),
                Spider: Kq(t, i, n),
                Polar: qq(t, i, n),
                Pie: Jq(t, i, n),
                UIPanel: Xq(t, i, n),
                Gauge: Qq(t, i, n),
                Funnel: $q(t, i, n),
                Pyramid: tJ(t, i, n),
                Chart3D: nJ(t, i, n),
                Map: iJ(t, i, n)
            }
        } (Cq, s.e, r)
    },
```

其中验证许可证的方法在函数Hq里。

```
// 验证证书并创建图表区
    Hq = function(t) {
        var i = !1,
        n = !1,
        e = !1,
        r = "",
        s = "";
        try
            if (Tq) {
                var o = function(t) {
                    if (t) {
                        var i = t.split("-");
                        return 4 === i.length ? i[1].startsWith("m") ? 2 : 1 : 0
                    }
                } (Tq);
                o = 1;
                1 === o ? (e = !
                function(t) {
                    switch (t.slice(0, 4)) {
                    case "0001":
                        // 取消证书验证
                        return Eq(t);
                        //return 1;
                    default:
                        throw new Error(Iq(0, 21, 1, 2, 1, 6, 1, 7, 1, 8, 1, 9, 1, 11, 1, 10, 5)) // Deployment key version is too new or old.
                    }
                } (Tq), i = !0) : 2 === o ? (Nq(Tq, t), n = !0) : (_q = !0,
                function(t) {
                    var i = t.slice(0, 4),
                    n = t.slice(5);
                    switch (i) {
                    case "0001":
                        n = n.replace(/-/g, "");
                        var e = Uint8Array.from(Rq(n, 2)),
                        r = e.slice(36, 40),
                        s = new Uint8Array(4),
                        o = function(t) {
                            for (var i, n = [], e = 0; e < 256; e += 1) {
                                i = e;
                                for (var r = 0; r < 8; r += 1) i = 1 & i ? 3988292384 ^ i >>> 1 : i >>> 1;
                                n[e] = i
                            }
                            for (var s = -1,
                            o = 0; o < t.length; o += 1) s = s >>> 8 ^ n[255 & (s ^ t[o])];
                            return ( - 1 ^ s) >>> 0
                        } (e.slice(0, 36));
                        new DataView(s.buffer).setUint32(0, o, !0);
                        for (var h = e.slice(28, 34), u = 0, a = h.length - 1; a > 0; a -= 1) u += h[a] * Math.pow(2, 8 * a);
                        if (u < (parseInt(Iq( - 3, 0), 10) || Number(parseInt(Iq( - 3, 0), 10)))) throw new Error(Iq(0, 0, 1, 2, 1, 3, 1, 4, 5));
                        if (r.every((function(t, i) {
                            return s[i] === t
                        }))) return;
                        break;
                    default:
                        throw new Error(Iq(0, 0, 1, 2, 1, 6, 1, 7, 1, 8, 1, 9, 1, 11, 1, 10, 5))
                    }
                    throw new Error(Iq(0, 0, 1, 2, 1, 7, 1, 12, 5))
                } (Tq))
            } else Oq = !0
        } catch(t) {
            r = t.message,
            console.error(t)
        }
        var h = !(r || Oq || i || n)
        // u = function() {
        //     var t = new(Dq[Iq( - 1, 0)]);
        //     //console.log('证书校验')
        //     return t.open(Iq(0, 26), Iq( - 2, 0)),
        //     t.setRequestHeader(Iq( - 1, 24), Iq( - 1, 25)),
        //     t.withCredentials = !0,
        //     t
        // } ();
        if (h) {
            var a = void 0;
            try {
                a = parseInt(Tq ? Tq.split("-")[1] : Math.floor(1e6 * Math.random()).toString(), 16)
            } catch(t) {
                a = Math.floor(1e6 * Math.random())
            }
            var f = Math.floor(1e6 * Math.random());
            s = (a ^ f).toString();
            var c = {},
            l = "",
            d = "",
            v = "";
            // Tq 许可证
            Tq = Tq || "";
            for (var y = Iq( - 4, 0), S = 0; S < Tq.length; S += 1) {
                var m = Tq.charCodeAt(S) ^ y.charCodeAt(S);
                l += String.fromCharCode(m)
            }
            for (var b = Iq( - 3, 0), g = 0; g < b.length; g += 1) d += String.fromCharCode(b.charCodeAt(g) ^ y.charCodeAt(g));
            for (var w = 0; w < s.length; w += 1) v += String.fromCharCode(s.charCodeAt(w) ^ y.charCodeAt(w));
            c[Iq( - 1, 3)] = Dq.btoa(l),
            c[Iq( - 1, 4)] = Dq.btoa(d),
            c.h = Dq.btoa(v),
            c.v = 2,
            c.s = Dq[Iq( - 1, 34)][Iq( - 1, 35)](Iq( - 1, 33)) || void 0
            //console.log("ss",c, Tq, b, g, y ,f ,s, w)
            //u.send(JSON.stringify(c))
        }
        // 创建绘图区域，并验证许可证
        return function(t, i) {
            return new GK(t, i);
            var n = new GK(t, i),
            o = function(t) {
                return;
                if (u.readyState === Dq[Iq( - 1, 0)].DONE) {
                    if (200 !== u.status) {
                        e = "";
                        try {
                            e = t && "loadend" !== t.type ? Iq(0, 0, 1, 23, 1, 32, 1, 24, 5) : JSON.parse(u[Iq( - 1, 23)]).message,//License validation request failed.
                            Gq(u, !1, a)
                        } catch(t) {
                            console.error(t)
                        }
                        throw Vq(e, n),
                        new Error(Iq(0, 0, 1, 2, 1, 7, 1, 12, 5) + e)   //License key is invalid.
                    }
                    var i = JSON.parse(u[Iq( - 1, 23)]);
                    if (!zq(s + Iq( - 3, 0), i.h)) {
                        var e = Iq(0, 0, 1, 27, 1, 28, 1, 29, 1, 30, 1, 31, 5);
                        throw Vq(e, n),
                        new Error(e)
                    }
                    Dq[Iq( - 1, 34)][Iq( - 1, 36)](Iq( - 1, 33), i.s),
                    _q = !1
                }
            },
            a = function(t) {
                o(t)
            };
            return Gq(u, !0, a),
            // h ? setTimeout((function() {
            //     //##2 1e4
            //     // console.log('1e3')
            //     // console.trace()
            //     _q && Vq(Iq(0, 25, 1, 23, 1, 32, 1, 24, 5), n)
            // }), 1e4) : Gq(u, !1, a),
            e ?
            function(t) {   // 屏幕中心画图？
                var i;
                _q = !1;
                var n = t.vi(),
                e = function() {
                    i && (t.fs(i.us()), i = void 0),
                    (i = t.$v()).$e(t.Rt).Jn(Iq(0, 34, 1, 33)).ph({
                        x: n.x / 2,
                        y: n.y / 2
                    }).lh(50).ne(13).$n(new Ee({
                        color: Ae(128, 128, 128, 100)
                    })).ah("Arial").yh(500).setMouseInteractions(!1).os()
                };
                t.io((function() {
                    e()
                })),
                setTimeout(e, 0),
                setInterval((function() {
                    i && i.us() < t.Js() - 1 ? e() : i || e()
                }), 1e3)
            } (n) : r ? Vq(r, n) : u.readyState === Dq[Iq( - 1, 0)].DONE && o(),
            n
        }
    },
```

代码很长，简单的分析就是验证许可证，最后返回绘图区域`GK(t, i)`，我们可以直接返回GK跳过验证。当然不输入许可证就不会进行验证，判断许可证为空直接绘制水印。其中Tq就是许可证的信息，`if(Tq)`或者`try{}`直接去掉也能跳过许可证，而且是直接授权。应该是`else Oq = !0`让后面的方法执行判断是社区版。

在看看ChartXY的函数`ChartXY: Zq(t, i, n),`

```
Zq = function(t, i, n) {
        return function(e) {
            var r = t(n, e),
            s = i ? jq(r) : void 0,
            o = new UU(r.ps, ZU(r)(0), er, r.ro.bind(r), s, e);
            return Yq(r, o),
            o
        }
    },
```

里面有个`Jq(r)`是不是很眼熟，就是绘制水印的函数，是否执行的传递进来的参数i判断的，因此可以强制所有i都是`false`

```
t.lightningChart = function(t, i) {
        var n = "object" == typeof t ? t.license: t,
        e = "object" == typeof t ? t.licenseInformation: i,
        r = "object" == typeof t ? t: void 0,
        s = new Pq;
        return s.e = n || "",
        //console.log(Cq),
        Cq || (Cq = Hq(e)),
        //console.log(Cq),
        function(t, i, n) {
            i = false;//去除水印
            return {
                Dashboard: Uq(t, i, n),
                ChartXY: Zq(t, i, n),
                Spider: Kq(t, i, n),
                Polar: qq(t, i, n),
                Pie: Jq(t, i, n),
                UIPanel: Xq(t, i, n),
                Gauge: Qq(t, i, n),
                Funnel: $q(t, i, n),
                Pyramid: tJ(t, i, n),
                Chart3D: nJ(t, i, n),
                Map: iJ(t, i, n)
            }
        } (Cq, s.e, r)
    },
```

### 后门

目前分析是没看出有什么恶意代码对付修改破解的人，不过还是发现几处有意思的点，去掉的话会保险一些。

#### 1 图片校验

首先加载的水印都是base64格式的，可能是怕别人直接搜索替换掉，就加了图片校验

```
eY = "data:image/png;base64,iVBORw0KGgoAAAANS..",
oY = "data:image/png;base64,iVBORw0KGgoAAA...";
```

在Jq函数里

```
//Iq(0, 36, 1, 38, 5) 检测到篡改
            } ! 1 === t.rE && (2610 !== oY.length && Vq(Iq(0, 36, 1, 38, 5), i, !1), "M" !== oY[429] && Vq(Iq(0, 36, 1, 38, 5), i, !1)),
            !0 === t.rE && (3958 !== eY.length && Vq(Iq(0, 36, 1, 38, 5), i, !1), "2" !== eY[638] && Vq(Iq(0, 36, 1, 38, 5), i, !1)),
```

对图片长度和其中一个字符进行判断是否被修改。Vq是被修改后执行的函数，判断许可证的地方都能看到这个函数被调用。

看看Vq函数

```
// 许可证不合法或者受到非法篡改等触发条件执行此方法，屏幕上显示红色文字提示，释放资源导致图表无法继续使用（未分析其他行为）
    Vq = function(t, i, n) {
        return;
        void 0 === n && (n = !0),
        _q = !1;
        for (var e = i.Js() - 1; e > 0;) i.fs(e),
        e = i.Js() - 1;
        var r = i.$v(),
        s = i.vi(),
        o = (t || "LICENSE_ERROR").toLowerCase().split("_").join(" ");
        o = (n ? Iq(0, 0, 1, 2, 1, 23, 1, 24, 25, 1) : "") + o.charAt(0).toUpperCase() + o.substr(1),
        r.Pc(i.Rt).$n(new Ee({
            color: Ae(0, 0, 0)
        })).Ys(ir).oi(s).ph(l(0, 0)),
        r.$e(i.Rt).Jn(o).ph({
            x: s.x / 2,
            y: s.y / 2
        }).lh(20).$n(new Ee({
            color: Ae(255, 0, 0)
        })),
        i.os(),
        Object.freeze(i),
        Object.freeze(qz)
    },``
```

实测就是释放图表资源，在中心区域显示红色字符提示你许可证错误之类的标语。但`i.os`还没分析，有没有其他手段还不知道，直接return最保险。

#### base64加密方法

有个Iq函数会解密base64字符作为方法函数来使用，其中像提示许可证不可用之类的字符串加密还能理解，其他就不知道要干什么了，特别是还有http相关的

```
// 解密函数
    Iq = function() {
        for (var t = [], i = 0; i < arguments.length; i++) t[i] = arguments[i];
        return t.slice(1).reduce((function(i, n) {
            return i + wr.atob(Lq[t[0]][n].toString())
        }), "")
    },
```

对Lq解密，Lq是个字典，-4可能是许可证加密密钥，-3不知道是什么，可能也是许可证相关的，-2是许可证的网站，我改成本地了，-1的第一个就是XMLHttpRequest，目前只分析出原来上传许可证，其他地方有没有调用不得而知，直接去掉。其他的加密字符都中规中矩，就不管了。

```
Lq = {
        // 0412d51e921aa338501a8df37ebe18557d5bbded85c948b7a2d00fe3adee27ccef70b1ee9b706c120a03d6ee3d6f2979ca64a37f7b687a5f9cef68617b55e9fbc0
        "-4": ["MDQxMmQ1MWU5MjFhYTMzODUwMWE4ZGYzN2ViZTE4NTU3ZDViYmRlZDg1Yzk0OGI3YTJkMDBmZTNhZGVlMjdjY2VmNzBiMWVlOWI3MDZjMTIwYTAzZDZlZTNkNmYyOTc5Y2E2NGEzN2Y3YjY4N2E1ZjljZWY2ODYxN2I1NWU5ZmJjMA=="],
        "-3": ["MTY0Mzc1MjgwMDAwMA=="],// 1643752800000
        //"-2": ["aHR0cHM6Ly9qc2xpY2Vuc2luZy5hcmN0aW9uLmNvbS9zZXNzaW9u"], // https://jslicensing.arction.com/session
        "-2": ["aHR0cDovLzEyNy4wLjAuMS9zZXNzaW9u"], // http://127.0.0.1/session
        //0:XMLHttpRequest 1:document 2:defaultView 3:a 4:b 5:license_expiration_date 6:location 7:hostname 8:test_domain 9:domains 10:crypto 11:Signature 12:ECDSA 13:SHA224withECDSA 14:alg 15:curve 16:secp256k1 17:addEventListener 18:removeEventListener 19:loadend 20:error 21:abort 22:timeout 23:responseText 24:Content-Type 25:application/json 26:MessageDigest 27:sha256 28:cryptojs 29:updateString 30:digest 31:company 32:appTitle 33:lcjs-session 34:localStorage 35:getItem 36:setItem
        "-1": ["", "ZG9jdW1lbnQ=", "ZGVmYXVsdFZpZXc=", "YQ==", "Yg==", "bGljZW5zZV9leHBpcmF0aW9uX2RhdGU=", "bG9jYXRpb24=", "aG9zdG5hbWU=", "dGVzdF9kb21haW4=", "ZG9tYWlucw==", "Y3J5cHRv", "U2lnbmF0dXJl", "RUNEU0E=", "U0hBMjI0d2l0aEVDRFNB", "YWxn", "Y3VydmU=", "c2VjcDI1Nmsx", "YWRkRXZlbnRMaXN0ZW5lcg==", "cmVtb3ZlRXZlbnRMaXN0ZW5lcg==", "bG9hZGVuZA==", "ZXJyb3I=", "YWJvcnQ=", "dGltZW91dA==", "cmVzcG9uc2VUZXh0", "Q29udGVudC1UeXBl", "YXBwbGljYXRpb24vanNvbg==", "TWVzc2FnZURpZ2VzdA==", "c2hhMjU2", "Y3J5cHRvanM=", "dXBkYXRlU3RyaW5n", "ZGlnZXN0", "Y29tcGFueQ==", "YXBwVGl0bGU=", "bGNqcy1zZXNzaW9u", "bG9jYWxTdG9yYWdl", "Z2V0SXRlbQ==", "c2V0SXRlbQ=="],
        //0:License 1:  2:key 3:has 4:expired 5:. 6:version 7:is 8:too 9:new 10:old 11:or 12:invalid 13:0001 14:Invalid 15:number 16:of 17:domains 18:deployment 19:in 20:domain 21:Deployment 22:domain 23:validation 24:failed 25:: 26:POST 27:server 28:responded 29:with 30:unexpected 31:value 32:request 33:TEST 34:DEPLOYMENT 35:Key 36:Tampering 37:been 38:detected 39:Missing 40:license 41:information
        0 : ["TGljZW5zZQ==", "IA==", "a2V5", "aGFz", "ZXhwaXJlZA==", "Lg==", "dmVyc2lvbg==", "aXM=", "dG9v", "bmV3", "b2xk", "b3I=", "aW52YWxpZA==", "MDAwMQ==", "SW52YWxpZA==", "bnVtYmVy", "b2Y=", "ZG9tYWlucw==", "ZGVwbG95bWVudA==", "aW4=", "ZG9tYWlu", "RGVwbG95bWVudA==", "ZG9tYWlu", "dmFsaWRhdGlvbg==", "ZmFpbGVk", "Og==", "UE9TVA==", "c2VydmVy", "cmVzcG9uZGVk", "d2l0aA==", "dW5leHBlY3RlZA==", "dmFsdWU=", "cmVxdWVzdA==", "VEVTVA==", "REVQTE9ZTUVOVA==", "S2V5", "VGFtcGVyaW5n", "YmVlbg==", "ZGV0ZWN0ZWQ=", "TWlzc2luZw==", "bGljZW5zZQ==", "aW5mb3JtYXRpb24="]
    },
```

最后一个就是有用到`XMLHttpRequest`的函数，传进来的t就是`new XMLHttpRequest`，因此直接return。

```
    // 疑似注册http上传服务，已确认的是通过XMLHttpRequestUpload上传许可证
    Gq = function(t, i, n) {
        //XMLHttpRequestUpload
        return;
        //console.log(t)
        i ? (t[Iq( - 1, 17)](Iq( - 1, 19), n), t[Iq( - 1, 17)](Iq( - 1, 20), n), t[Iq( - 1, 17)](Iq( - 1, 21), n), t[Iq( - 1, 17)](Iq( - 1, 22), n)) : (t[Iq( - 1, 18)](Iq( - 1, 19), n), t[Iq( - 1, 18)](Iq( - 1, 20), n), t[Iq( - 1, 18)](Iq( - 1, 21), n), t[Iq( - 1, 18)](Iq( - 1, 22), n))
        //console.log(t)
    },
```

到这边就差不多了，JS库就老老实实的当本地库，不要有什么非分之想。

当然分析的还不到位，最好不要传许可证进去，保不准还有什么验证机制，直接注释绘制水印代码，也没有校验代码被修改的机制，这样比较保险。

[成品](https://github.com/moll33er/lcjs.iife/tree/master)
