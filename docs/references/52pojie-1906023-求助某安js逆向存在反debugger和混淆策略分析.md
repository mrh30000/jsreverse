# 求助某安js逆向存在反debugger和混淆策略分析

> **作者**: yoin528 | **发布时间**: 2024-03-26 11:07:00 | **版块**: 『编程语言区』 | **查看/回复**: 4881 / 13
> **原文**: [https://www.52pojie.cn/thread-1906023-1-1.html](https://www.52pojie.cn/thread-1906023-1-1.html)

---

最近有个需求想抓取某安的一些公开数据，但该网站有较强的反爬策略，下面详细描述下该网站的一些技术点，希望各位大佬给出一些指点
过程如下：
1、该网站请求首页后会加载十几个js，这些js向浏览器写入cookie
2、后续的请求都要带着js写入的cookie放在请求头中向后台请求数据，如果检查不对则提示参数错误。
分析过程：
1、检查该网站发现大量js都是混淆过的，无法通过document.cookie搜索到，于是使用js对写cookie进行hook操作并进行debugger,hook代码如下：

[JavaScript] *纯文本查看*

```

var v = "";
Object.defineProperty(document, "cookie", {
    set: function(val) {
        // if(val.indexOf("sajssdk_2015_cookie_access_test") == -1) {
        //     debugger;
        // }
        if(val.indexOf("bnc-uuid") !== -1) {
            debugger;
        }
        if(val.indexOf("deviceId") !== -1) {
            debugger;
        }
        if(val.indexOf("se_gd") !== -1) {
            debugger;
        }
        if(val.indexOf("thx_guid") !== -1) {
            debugger;
        }
        if(val.indexOf("device-info") !== -1) {
            debugger;
        }
        v = val;
        return v;
    },
    get() {
        return v;
    }
})
```

2、通过对cookie的hook操作后，找到写cookie的代码位置，但代码存在大量的js混淆，查看了下应该是ob混淆，部署代码如下：

[JavaScript] *纯文本查看*

```
function x(W, X, Y, Z) {
                    var a0 = f['vtYVa'](f[b('0x172', ')e4a')](f[b('0x127', 'gT&1')](W + f[b('0x205', '&D7)')] + f[b('0x1a', '(LDe')], f[b('0x305', 'hDcC')](l, X)) + f[b('0xe7', '38E0')] + f[b('0x135', ')cY6')](l, Y ? Y : '') + b('0x1ef', 'J^06') + Z, b('0xa7', '39fF')), new n()[b('0xce', 'K%rA')]());
                    var a1 = new q();
                    a1[f['bsknu']] = a0;
                    g['_tmp'] = a1;
                }
                try {
                    var y = new n()['getTime']();
                    var z = c(0x4);
                    var A = z[0x0];
                    var B = z[0x1];
                    var C = z[0x2];
                    var D = z[0x3];
                    var E = f['EjXxV'](c, 0x1);
                    var F = f['EjXxV'](c, 0x2);
                    var G = '20231227';
                    var H = '';
                    var I = new n()['getTime']() - y;
                    function W(a1) {
                        var a2 = {
                            'WycGn': function(a8, a9) {
                                return v['WGXHb'](a8, a9);
                            }
                        };
                        function a3(a8) {
                            a8 = a2['WycGn'](a8, '');
                            if (a8['length'] >= 0xd) {
                                return a8['substring'](0x0, 0xd);
                            } else {
                                while (a8['length'] != 0xd) {
                                    a8 = '0' + a8;
                                }
                            }
                            return a8;
                        }
                        var a4 = a3(new n()['getTime']());
                        var a5 = v['LlNoU'](a1 + ':' + C['grs'](0x13), a4);
                        var a6 = 0x1;
                        var a7 = v['wqcyX'](v['MwWnU'](A, a5 + C['sph'](a5, 0x4)), a6);
                        return a7;
                    }
                    function X(a1, a2, a3) {
                        C['p_c'](a1, a2, a3);
                    }
                    function Y() {
                        return C['g_c']('se_gsd');
                    }
                    var J = '';
                    var K = [];
                    function Z(a1) {
                        if (!a1) {
                            return;
                        }
                        if (typeof a1 == 'string') {
                            K['push'](a1);
                        } else {
                            K = K['concat'](a1);
                        }
                        if (t[b('0x295', '5iUd')][b('0x88', '1ZL7')]) {
                            return ![];
                        }
                        var a2 = t[b('0x330', 'hDcC')][b('0x2fc', 'qLU3')];
                        t[b('0x308', '1l%J')][b('0x112', '1gou')] = function() {
                            if (arguments[b('0x2f8', 'm$jX')] > 0x1) {
                                this[b('0xa8', 'E*C!')] = arguments[0x1];
                            }
                            a2[b('0x228', 'Id4I')](this, arguments);
                        }
                        ;
                        var a3 = t[b('0xcb', 'JWd]')][b('0x309', 'J^06')];
                        t[b('0x10f', '1ZL7')][b('0x1d0', 'kqy6')] = function() {
                            try {
                                var a4 = this[b('0x121', 'OnhF')];
                                for (var a5 = 0x0; a5 < K[b('0xbd', 'G1Pr')]; a5++) {
                                    if (v[b('0xa', 'NjVu')](a4[b('0x1d5', 'Id4I')](K[a5]), -0x1)) {
                                        this[b('0x322', 'kqy6')](b('0x1ea', '4eNd'), J);
                                        this[b('0x1d3', 'v4sm')](v[b('0x299', 'G1Pr')], v[b('0xcf', ')cY6')](W, 'rd'));
                                        var a6 = '';
                                        try {
                                            a6 = v[b('0x218', '1l%J')](E, H);
                                        } catch (a7) {
                                            a6 = b('0x6c', 'zjpA');
                                        }
                                        this[b('0x8', 'P7rK')](b('0x152', 'NjVu'), a6);
                                        break;
                                    }
                                }
                            } catch (a8) {
                                x(w(), b('0x225', '1ZL7') + g[b('0x150', 'MUkU')][b('0x16e', ')e4a')], C[b('0x162', '4t#7')](a8), G);
                            }
                            a3[b('0x158', '4t#7')](this, arguments);
                        }
                        ;
                        t[b('0x50', 'j3]R')][b('0x3e', 'kqy6')] = !![];
                    }
                    function a0(a1) {
                        if (a1 && a1[b('0x2af', 'K%rA')]) {
                            try {
                                var a2 = a1[b('0x2a9', 'p2wb')][b('0x43', 'hDcC')]('')[b('0x7d', 'm20R')]()[b('0xac', 'v4sm')]('');
                                a2 = C['sr'](a2, f[b('0x1bd', ')cY6')](u, a2[b('0x2f8', 'm$jX')] / 0x5));
                                var a3 = a2[b('0x11a', '&D7)')](0x0, 0x1);
                                var a4 = a2[b('0x1d4', 'G1Pr')](0x1, 0xd);
                                if (a3 == '1') {
                                    H = a4;
                                } else {
                                    H = '';
                                }
                                if (a2[b('0x31e', '(LDe')] > 0xd) {
                                    var a5 = a2[b('0x22c', 'btdz')](0xd);
                                    f[b('0x9b', 'm20R')](X, f[b('0x154', 'Loej')], a5, f[b('0x214', 'G1Pr')](f[b('0xe9', ')cY6')](f[b('0x1a8', 'Id4I')](0x64, 0x16d), 0x18) * 0x3c, 0x3c) * 0x3e8);
                                }
                            } catch (a6) {
                                f[b('0x173', 'j3]R')](x, f[b('0x5d', 'OnhF')](w), f[b('0x208', 'p2wb')] + g[b('0x9', 'm3U9')][b('0x1c9', '1l%J')], C[b('0x159', 'v4sm')](a6), G);
                            }
                        }
                    }
                    J = f[b('0xfe', 'ouDj')](W, 'pd');
                    if (g[b('0x113', 't59c')] && g[b('0x1bb', 'P7rK')][b('0x242', 'u0BS')] && g[b('0x333', 'E*C!')][b('0x237', 'j3]R')]) {
                        f[b('0x2a1', '6VM3')](Z, g[b('0x15b', 'kne[')]);
                    }
                    var L = C['g_c'](f[b('0x1c6', 'MUkU')]);
                    if (!L) {
                        L = f[b('0x29c', '4eNd')](W, 'sd');
                        X(b('0x1d', 'ouDj'), L);
                    }
                    var M = C[b('0x202', 'MUkU')](f[b('0xa2', '1gou')]);
                    if (!M || f[b('0x2e8', 'p2wb')](f[b('0x167', 'kne[')](M[b('0x155', '1gou')], 0x4), 0x0)) {
                        M = f['EjXxV'](W, 'gd');
                        f[b('0xf0', 'FhgD')](X, 'se_gd', M, f[b('0xc2', 'G1Pr')](f[b('0x22a', 'T@lo')](0x64 * 0x16d * 0x18 * 0x3c, 0x3c), 0x3e8));
                    }
                    var N = Y();
                    var O = f[b('0x1e5', 'Id4I')](new n()[b('0x10b', 'zjpA')](), y);
                    var P = f[b('0x1e9', 'zjpA')](F);
                    var Q = new n()[b('0x11', 'j3]R')]() - y;
                    var R = {};
                    R[b('0x16a', 'm20R')] = J;
                    R[b('0x124', 'btdz')] = L;
                    R[b('0x2f', 'FhgD')] = M;
                    R[b('0x1a2', '1ZL7')] = N;
                    R[b('0x3c', 'JWd]')] = C[b('0x2a5', '4t#7')](b('0x30', 'Id4I'));
                    R[b('0xd', '38E0')] = C[b('0x84', 'gT&1')](b('0x15f', 'g^n3'));
                    R['ev'] = P;
                    R[b('0x314', 'm3U9')] = f[b('0x2', '5iUd')](I, '');
                    R[b('0xb', '&Lnf')] = O + '';
                    R[b('0x271', '38E0')] = f[b('0x2a4', 'm20R')](Q, '');
                    var S = f[b('0x2f1', 'NjVu')](f[b('0x174', 'ouDj')](w), f[b('0x2be', 'ouDj')]);
                    var T = A(JSON[b('0x29d', ')e4a')](R));
                    var U = {
                        'onSuccess': function(a1) {
                            f[b('0xd3', 'p2wb')](a0, a1);
                        },
                        'onError': function() {}
                    };
                    f[b('0x217', 'qLU3')](D, S, {
                        'c': T,
                        'sv': G,
                        't': new n()[b('0x83', 'm20R')]()
                    }, U);
                    return Z;
                } catch (a1) {
                    f[b('0x20d', '1l%J')](x, f[b('0x13b', 'J^06')](w), g[b('0x9', 'm3U9')][b('0x2db', 'P7rK')], C[b('0x2ab', 'btdz')](a1), G);
                    var V = function() {};
                    return V;
                }
            }));
```

2、本来想根据hook的位置对写入的cookie扣js代码返回回来用于后续请求时请求头cookie，但发现有十几个js文件在写cookie，且每个js都有几万行混淆代码，想要扣或还原比较困难。
3、分析最重要的登陆操作时，对于device-info的写入cookie操作时，发现在进入debugger的瞬间页面就进行了删除debugger操作并刷新页面，然后所有请求返回状态码为403的操作，应该是检测到我在debugger，后面所有请求都是403拒绝。

求助的问题如下：
1、使用python模拟请求时，反爬策略中请求首页时会同时下载十几个js进行cookie写入操作（有可能有些js没有作用只是混淆视听），每个js都进行了混淆，最大的js文件格式化后有九万行这么大（比较难还原），有什么办法找到主要能用的参数。
2、使用写cookie的hook操作debugger时，该网站使用了什么技术检测到我在debugger，又是怎么直接删除debugger使用无法打断点的，如何避免？
