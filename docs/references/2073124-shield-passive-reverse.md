# 某盾无感逆向分析

> **作者**: 中二 | **发布时间**: 2025-11-15 19:33:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5138 / 30
> **原文**: [https://www.52pojie.cn/thread-2073124-1-1.html](https://www.52pojie.cn/thread-2073124-1-1.html)

---

*本帖最后由 wangguang 于 2025-11-15 20:19 编辑*

## 声明

本文章中所有内容仅供学习交流使用，不用于其他任何目的，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关！若有侵权，请联系作者删除。

## 前言

除指纹参数之外其他都可取自官网验证码，直达链接aHR0cHM6Ly9kdW4uMTYzLmNvbS90cmlhbC9zZW5zZQ==，此文章仅记录验证码学习过程，内容仅供学习交流使用，内容均已脱敏，仅提供学习思路，若有侵权，请联系作者删除。

## 接口分析

先按顺序分析接口

![](https://attach.52pojie.cn/forum/202511/15/193358pgqp6zps3ra99go6.png)

up:

up接口直接请求返回了错误信息，说明有参数需要还原。看看返回数据包是否有有用的数据。

![](https://attach.52pojie.cn/forum/202511/15/193415efwb61qw4b8bebe4.png)

经分析，up的接口tk参数值就是get接口的irToken

![](https://attach.52pojie.cn/forum/202511/15/193427c733x1t1o73x33x4.png)

up接口总共需要逆向的参数就是n和d

![](https://attach.52pojie.cn/forum/202511/15/193438s6ub4s4gg9jsjj6p.png)

get:

get接口总共三处会变，irToken是从up接口获取的，callback就是回调ID，需要逆向的就是cb，其实fp参数也需要分析，这个参数最后写，属于指纹风控参数，这个参数写死也能过接口，但是大约百来次请求fp就失效了得更换了。

![](https://attach.52pojie.cn/forum/202511/15/193455jaku6pra0a3fp666.png)

check:

check的token是从get接口返回值获取的，data跟cb需要逆向分析。其余值写固定即可。

![](https://attach.52pojie.cn/forum/202511/15/193510ck3mdkovtc2i31es.png)

## up接口

进去接口搜索参数vk，先搜关键词看能不能找到关键位置。(找不到就找发包点跟栈，不晓得某些站会不会进行关键词混淆)

![](https://attach.52pojie.cn/forum/202511/15/193533ufo2offoo2mlomol.png)

搜索总共有16个vk出现的地方，均打上断点，刷新验证码，断点断住。可以看到p,v,vk都是对象字面量的属性赋值，而n,d是函数生成的。

![](https://attach.52pojie.cn/forum/202511/15/193546p52po15gha6xabfb.png)

n变量:

n变量是Y函数执行结果，进入到Y函数发现代码有字符串混淆。

![](https://attach.52pojie.cn/forum/202511/15/193600hi7da0owuow5t96d.png)

最近也学了些ast，开整！

replace是由f函数还原的，先对解密函数f进行分析

f函数扣下来执行，缺少K,K是一个大数组扣下来补齐就能还原了。

![](https://attach.52pojie.cn/forum/202511/15/193613t4frmrbghx26awkf.png)

简单分析分析f函数做了啥吧！就拿网站上f(70)还原成"replace"举个例子

```
function f(r, n) {
    //单步调试，此时r是70，n是undefined
    // r -= 0触发隐式的类型转换，r无论传的是什么，经过这步就会转换成数字。方便后续用作数组索引
            r -= 0;
            //从K数组中取出r对应的值
            var t = K[r];
            //f.YYzyEK是undefined,void 0 === f.YYzyEK就是true
            if (void 0 === f.YYzyEK) {
                //将函数赋值给变量u，看函数就是个base64，但是字符集是自定义的
                var u = function(r) {
                    for (var n, t, u = "nlpyectimwxkuzjdobhfvgqsarNLPYECTIMWXKUZJDOBHFVGQSAR0123456789+/=", i = "", c = 0, o = 0; t = r.charAt(o++); ~t && (n = c % 4 ? 64 * n + t : t, c++ % 4) ? i += String.fromCharCode(255 & n >> (-2 * c & 6)) : 0)
                        t = u.indexOf(t);
                    return i
                };
                //调用了u函数，进行自定义 Base64 解码
                f.HaJnNw = function(r) {
                    for (var n = u(r), t = [], i = 0, c = n.length; i < c; i++)
                        t += "%" + ("00" + n.charCodeAt(i).toString(16)).slice(-2);
                    return decodeURIComponent(t)
                }
                ,
                f.nhdbzs = {},
                f.YYzyEK = !0
            }
            //取大数组第一个值
            var i = K[0]
                //将下标跟大数组取的字符串拼接
              , c = r + i
              , o = f.nhdbzs[c];
            return void 0 === o ? (t = f.HaJnNw(t), f.nhdbzs[c] = t) : t = o, t
        }

console.log(f(70))
```

解密函数就是将下标传进函数，使用自定义 Base64 解码，对字符串进行解码并缓存结果,后续调用使用缓存解码。

![](https://attach.52pojie.cn/forum/202511/15/200304bshacswocvcasosl.png)

解密函数搞定之后就用ast解混淆。写的不好仅做记录，大佬勿喷多指教

将源代码转换成抽象语法树，好分析写插件

![](https://attach.52pojie.cn/forum/202511/15/200325gg1guzbp3mpugp54.png)

遍历所有节点类型为CallExpression，name不为f的不处理，参数类型不为数字字面量不处理。

```
const callTostring = {
  // 定义一个 Babel 插件的 visitor 对象，键为节点类型，这里是 CallExpression（函数调用表达式）
  CallExpression(path) {
    // 解构 path.node，获取 callee（被调用者）和 arguments（参数列表）
    let {callee, arguments} = path.node;
    // 如果 callee 不是一个名为 f 的标识符，则直接返回，不做处理
    if (!types.isIdentifier(callee, {name: 'f'})) { return; }
      // console.log(arguments)
    // 如果参数都不是数字字面量，则直接返回，不做处理
    if (!types.isNumericLiteral( arguments[0])) { return; }
    // 用 eval 执行当前 path 的源码字符串，获得运行结果
    let value = eval(path.toString());
    // 打印当前调用表达式的源码及其求值结果，方便调试
    console.log(path.toString(), "--->", value);
    // 用计算得出的 value 替换整个调用表达式节点（用一个字面量节点代替原有的调用）
    path.replaceWith(types.valueToNode(value));
  }
}
traverse(ast,callTostring);
```

还原之后的字符串f(70) ---> replace跟网页上一致

![](https://attach.52pojie.cn/forum/202511/15/200342ecbb777ebjbuzu7r.png)

把Y函数扣下来执行

![](https://attach.52pojie.cn/forum/202511/15/200354kmbmbxqut5robzlb.png)

直接执行返回了结果f4855cc276244f468be1c4b9ab7b6e23，函数就是生成随机字符串的代码。

```
function Y() {
    // 返回对字符串 "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx" 进行替换后的结果
    return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx"["replace"](
        /[xy]/g,  // 正则表达式，匹配字符串中的每个 'x' 或 'y'，/g 表示全局匹配
        function (r) {  // 替换函数，每遇到一个匹配字符就调用一次，参数 r 是当前匹配的字符（'x' 或 'y'）
            var n = 16 * Math["random"]() | 0;
            // Math.random() 生成 0 到 1 之间的随机数，乘以 16 放大到 0 到 16
            // 使用按位或 0（| 0）将结果取整，等价于向下取整（floor）
            // n 是 0 到 15 的随机整数
            // 根据 r 的值决定返回哪个数字的字符串：
            // 如果 r 是 'x'，就返回 n；否则返回 (3 & n) | 8
            // (3 & n) 是按位与，保留 n 的低 2 位（只保留 n 的第0和第1位）
            // | 8 是按位或，保证返回的数字的第4位是1（即十六进制的第3位为1）
            return ("x" === r ? n : 3 & n | 8)["toString"](16);
            // 将数字转换为16进制字符串返回
        }
    );
}
```

g函数：

扣到本地执行，缺啥补啥就行了，唯一注意的就是一个拼接之后的大数组。数组是变化的，可以深究也可以写固定。

![](https://attach.52pojie.cn/forum/202511/15/200410wnw31tt666wynrz8.png)

网页已经解混淆的g函数，扣到本地复现。

```
 g = function () {
        return function (r) {
          for (var n, t, u = (n = d("fd6a43ae25f74398b61c03c83be37449"), t = function () {
              for (var r = [], n = 0; n < 4; n++) r[n] = U(Qu["floor"](256 * Qu["random"]()));
              return r;
            }(), n = z(n = m(n), m(t)), [n = m(n), t]), i = u[0], c = u[1], o = d(function (r) {
              for (var n = [0, 1996959894, 3993919788, 2567524794, 124634137, 1886057615, 3915621685, 2657392035, 249268274, 2044508324, 3772115230, 2547177864, 162941995, 2125561021, 3887607047, 2428444049, 498536548, 1789927666, 4089016648, 2227061214, 450548861, 1843258603, 4107580753, 2211677639, 325883990, 1684777152, 4251122042, 2321926636, 335633487, 1661365465, 4195302755, 2366115317, 997073096, 1281953886, 3579855332, 2724688242, 1006888145, 1258607687, 3524101629, 2768942443, 901097722, 1119000684, 3686517206, 2898065728, 853044451, 1172266101, 3705015759, 2882616665, 651767980, 1373503546, 3369554304, 3218104598, 565507253, 1454621731, 3485111705, 3099436303, 671266974, 1594198024, 3322730930, 2970347812, 795835527, 1483230225, 3244367275, 3060149565, 1994146192, 31158534, 2563907772, 4023717930, 1907459465, 112637215, 2680153253, 3904427059, 2013776290, 251722036, 2517215374, 3775830040, 2137656763, 141376813, 2439277719, 3865271297, 1802195444, 476864866, 2238001368, 4066508878, 1812370925, 453092731, 2181625025, 4111451223, 1706088902, 314042704, 2344532202, 4240017532, 1658658271, 366619977, 2362670323, 4224994405, 1303535960, 984961486, 2747007092, 3569037538, 1256170817, 1037604311, 2765210733, 3554079995, 1131014506, 879679996, 2909243462, 3663771856, 1141124467, 855842277, 2852801631, 3708648649, 1342533948, 654459306, 3188396048, 3373015174, 1466479909, 544179635, 3110523913, 3462522015, 1591671054, 702138776, 2966460450, 3352799412, 1504918807, 783551873, 3082640443, 3233442989, 3988292384, 2596254646, 62317068, 1957810842, 3939845945, 2647816111, 81470997, 1943803523, 3814918930, 2489596804, 225274430, 2053790376, 3826175755, 2466906013, 167816743, 2097651377, 4027552580, 2265490386, 503444072, 1762050814, 4150417245, 2154129355, 426522225, 1852507879, 4275313526, 2312317920, 282753626, 1742555852, 4189708143, 2394877945, 397917763, 1622183637, 3604390888, 2714866558, 953729732, 1340076626, 3518719985, 2797360999, 1068828381, 1219638859, 3624741850, 2936675148, 906185462, 1090812512, 3747672003, 2825379669, 829329135, 1181335161, 3412177804, 3160834842, 628085408, 1382605366, 3423369109, 3138078467, 570562233, 1426400815, 3317316542, 2998733608, 733239954, 1555261956, 3268935591, 3050360625, 752459403, 1541320221, 2607071920, 3965973030, 1969922972, 40735498, 2617837225, 3943577151, 1913087877, 83908371, 2512341634, 3803740692, 2075208622, 213261112, 2463272603, 3855990285, 2094854071, 198958881, 2262029012, 4057260610, 1759359992, 534414190, 2176718541, 4139329115, 1873836001, 414664567, 2282248934, 4279200368, 1711684554, 285281116, 2405801727, 4167216745, 1634467795, 376229701, 2685067896, 3608007406, 1308918612, 956543938, 2808555105, 3495958263, 1231636301, 1047427035, 2932959818, 3654703836, 1088359270, 936918e3, 2847714899, 3736837829, 1202900863, 817233897, 3183342108, 3401237130, 1404277552, 615818150, 3134207493, 3453421203, 1423857449, 601450431, 3009837614, 3294710456, 1567103746, 711928724, 3020668471, 3272380065, 1510334235, 755167117], t = 4294967295, u = 0, i = r["length"]; u < i; u++) t = t >>> 8 ^ n[255 & (t ^ r[u])];
 return I(4294967295 ^ t)["map"](function (r) {
                var n;
                return "" + (n = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"])[r >>> 4 & 15] + n[15 & r];
              })["join"]("");
            }(r)), e = function (r) {
              if (r["length"] % 64 != 0) return [];
              for (var n = [], t = r["length"] / 64, u = 0, i = 0; u < t; u++) {
                n = [];
                for (var c = 0; c < 64; c++) n[c] = r[i++];
              }
              return n;
            }(function (r) {
              if (!r["length"]) return q(64, 0);
              var n = [],
                t = r["length"],
                u = t % 64 <= 60 ? 64 - t % 64 - 4 : 128 - t % 64 - 4;
              y(r, 0, n, 0, t);
              for (var i = 0; i < u; i++) n[t + i] = 0;
              return y(I(t), 0, n, t + u, 4), n;
            }([]["concat"](r, o))), a = []["concat"](c), g = i, s = 0, v = e["length"]; s < v; s++) {
            var K = z(function (r) {
              for (var n = [W, X, S, Q, Z, D, G], t = "037606da0296055c", u = 0, i = t["length"]; u < i;) {
                var c = t["substring"](u, u + 4),
                  o = A(c["substring"](0, 2)),
                  e = A(c["substring"](2, 4));
                r = n[o](r, e), u += 4;
              }
              return r;
            }(e), i);
            y(g = T(T(K = z(function (r, n) {
              void 0 === r && (r = []), void 0 === n && (n = []);
              for (var t = [], u = n["length"], i = 0, c = r["length"]; i < c; i++) t[i] = U(r[i] + n[i % u]);
              return t;
            }(K, g), g))), 0, a, 64 * s + 4, 64);
          }
          return R(a, "MB.CfHUzEeJpsuGkgNwhqiSaI4Fd9L6jYKZAxn1/Vml0c5rbXRP+8tD3QTO2vWyo"["split"](""), "7");
        }(P(function (r) {
          if ("array" !== i(r)) return [];
          for (var n, t, u = r["length"]; u;) t = Qu["floor"](Qu["random"]() * u--), n = r, r = r[t], r[t] = n;
          return r;
        }(n["concat"](e, a))));
      }
```

g函数返回值就是由下面这段函数返回的(此处已经省略各种扣代码的环节)

```
R(a, "MB.CfHUzEeJpsuGkgNwhqiSaI4Fd9L6jYKZAxn1/Vml0c5rbXRP+8tD3QTO2vWyo"["split"](""), "7")生成返回的。
```

![](https://attach.52pojie.cn/forum/202511/15/201755n8jp9b7zo7liz17b.png)

a就是一个超长数组。而我在本地复现，将拼接之后的大数组删掉之后，密文变短了，证明加密处用到了大数组，大数组具体在哪生成我没去深究。因为我分析那个大数组会执行的函数就是**打乱（洗牌）一个数组**（也就是 Fisher-Yates Shuffle 算法），具体其他的我没去深究，感兴趣的读者可以去研究究！我没去一步步调试数组，点跳步手都得麻了，我的思路就是直接把大数组删了看看对大数组or加密结果是否收到影响，实时证明当我删掉大数组之后加密结果和a都变短了。那么a的值跟加密值肯定是受大数组洗牌之后的影响生成的，既然他自己都打乱了数组顺序，干嘛要去深究这个大数组生成地方。

![](https://attach.52pojie.cn/forum/202511/15/200522bz956h59ra0tr3za.png)

```
n_concat=[1,2,3,4,5,6,7,8,9]
Qu = Math
    function i(r) {
        return null == r ? "" + r : {}["toString"]["call"](r)["slice"](8, -1)["toLowerCase"]();
      }
function P(r) {
        var n;
        return (n = [])["concat"]["apply"](n, []["concat"](r));
      }
z = P(function (r) {
                      if ("array" !== i(r)) return [];
                      for (var n, t, u = r["length"]; u;) t = Qu["floor"](Qu["random"]() * u--), n = r, r = r[t], r[t] = n;
                      return r;
                    }(n_concat))
console.log(z);
```

![](https://attach.52pojie.cn/forum/202511/15/200536m3e1n1q5i541qxie.png)

![](https://attach.52pojie.cn/forum/202511/15/200547k6a8z2o4zg004iag.png)

g函数扣代码全都能补全就差大数组生成地方，感兴趣的可以去找找生成地方。

### get接口

get接口总共fp跟cb参数，fp放最后写，先写cb参数吧

直接进入文件搜索'cb'，可以看到代码也是ob混淆。不知道是不是变种，没去试网上的通用ob解混淆，就简单的解了一下字符串。其实还有个字符串混淆的，但是这些参数没用到，就是fp那里用到了。

![](https://attach.52pojie.cn/forum/202511/15/200558ugl8la37oo3oo3zz.png)

![](https://attach.52pojie.cn/forum/202511/15/200622yhahvbk7g24hhyv9.png)

直接分析cb参数吧

进入生成cb参数的函数可以看到返回值是由\_0x58ee17加密而成的，先扣\_0x58ee17生成

![](https://attach.52pojie.cn/forum/202511/15/200930nqor7r2picpoj1fq.png)

\_0x58ee17函数就是生成长度为32的随机字符串，字符来源于数字+大小写字母，共62个字符

```
function _0x2b4c4d(_0x5aa56e, _0x3bfa37) {
    // 定义字符串数组，包含数字0-9，大写字母A-Z，小写字母a-z，共62个字符
    var _0x171c6a = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split(''),
        // 定义一个空数组，用于存放生成的字符
        _0xaa2517 = [],
        // 变量声明，后续用于循环计数
        _0x3a6676 = void 0;
    // 如果参数_0x3bfa37未传入，则默认等于字符数组长度62
    _0x3bfa37 = _0x3bfa37 || _0x171c6a.length;
    if (_0x5aa56e) {
        // 如果传入了第一个参数_0x5aa56e（期望生成的字符串长度）
        // 遍历从0到_0x5aa56e - 1
        for (_0x3a6676 = 0; _0x3a6676 < _0x5aa56e; _0x3a6676++) {
            // 生成一个0到_0x3bfa37-1之间的随机整数，取整
            // 用随机索引用于从字符数组中选取字符
            _0xaa2517[_0x3a6676] = _0x171c6a[0 | Math.random() * _0x3bfa37];
            // 这里0 | x 是位或操作，相当于 Math.floor(x)
        }
    } else {
        // 如果第一个参数_0x5aa56e未传入或者为假(0, null, undefined等)
        var _0x4fe738 = void 0;
        // 按 UUID v4 的格式给数组的第8、13、18、23位赋值‘-’
        _0xaa2517[8] = _0xaa2517[13] = _0xaa2517[18] = _0xaa2517[23] = '-';
        // 第14位固定赋值字符'4'，代表UUID的版本号
        _0xaa2517[14] = '4';
        // 遍历从0到35，构建36位UUID字符串
        for (_0x3a6676 = 0; _0x3a6676 < 36; _0x3a6676++) {
            // 如果当前位置还没赋值（不是 '-' 或 '4'）
            if (!_0xaa2517[_0x3a6676]) {
                // 生成0到15的随机整数
                _0x4fe738 = 0 | 16 * Math.random();
                // 位置19对应UUID的variant部分，需要特殊处理：
                // ((3 & _0x4fe738) | 8)确保第19位的二进制格式为10xx
                _0xaa2517[_0x3a6676] = _0x171c6a[19 === _0x3a6676 ? (3 & _0x4fe738) | 8 : _0x4fe738];
            }
        }
    }
    // 返回数组连接成的字符串
    return _0xaa2517.join('');
}
console.log(_0x2b4c4d(32));
```

接下来就剩\_0xb77ce加密函数了，就是各种的扣代码，缺啥补啥就好了

```
function _0xb77ce(_0x1b0494) {
    for (var _0x1c8e88 = _0x312bea(_0x1b0494), _0x45dc26 = _0x37afb7(),
             _0x9181b5 = _0x54d28b(_0x45dc26, 2),
             _0x51196b = _0x9181b5[0],
             _0x334cfd = _0x9181b5[1],
             _0x28b0cc = _0x312bea(_0x1f706f(_0x1c8e88)),
             _0x519a2a = _0x5dfb84([]['concat'](_0x121dbc(_0x1c8e88),
                 _0x121dbc(_0x28b0cc))),
             _0x5e1d80 = _0x541d79(_0x519a2a),
             _0x7fbfd6 = []["concat"](_0x121dbc(_0x334cfd)),
             _0x18fc8a = _0x51196b,
             _0x3ae677 = 0,
             _0x161154 = _0x5e1d80["length"]; _0x3ae677 < _0x161154; _0x3ae677++) {
        var _0x24a8ff = _0x54cf1d(_0x34ece2(_0x5e1d80[_0x3ae677]), _0x51196b)
          , _0x435af1 = _0x474f75(_0x24a8ff, _0x18fc8a);
        _0x24a8ff = _0x54cf1d(_0x435af1, _0x18fc8a),
        _0x18fc8a = _0x1556d2(_0x1556d2(_0x24a8ff)),
        _0x4cd5f2(_0x18fc8a, 0, _0x7fbfd6, 64 * _0x3ae677 + 4, 64);
    }
    return _0x491e42(_0x7fbfd6);
}
```

### check接口

check接口就是一个data参数跟cb参数,cb同上。

data照样先搜，搜不到再跟栈。

三个参数的函数参数都在上面生成，把有过关的代码都扣到本地执行就行了，加密没什么难度就是一直扣代码调试缺啥补啥就行了，如果出现不出值的情况就把所有的异常捕获删掉继续补就行了，咱就讲一下明文生成！

![](https://attach.52pojie.cn/forum/202511/15/200947bvympvgb7dpdsbs2.png)

\_0x40d0dc = '833dfd4682e44b6d93dbdc41d1ab5fb2' ，\_0x40d0dc是从get接口获取的token返回值，通过jsonp进行调用的。

```
_0x5695f9 = _0x24ab01["traceData"]['map'](function(_0x250334) {
                            return _0xc11b9d(_0x40d0dc, _0x250334);
                        });
_0x5ac398 = _0xc11b9d(_0x40d0dc, (void 0 !== _0x279159['clientX'] && void 0 !== _0x279159["clientY"] ? [Math["round"](_0x279159["clientX"] - _0x2661b7), Math['round'](_0x279159["clientY"] - _0x4e6cd6), _0x4c9492 - (_0x24ab01["beginTime"] || _0x4c9492), null == _0x279159['isTrusted'] ? 0 : _0x279159["isTrusted"] ? 1 : 2] : []) + '')
_0x40d0dc = '833dfd4682e44b6d93dbdc41d1ab5fb2'
data = JSON["stringify"]({
    'd': '',
    'm': _0x5278a6(_0x298055["sample"](_0x5695f9, 50)["join"](':')),
    'p': _0x5278a6(_0x5ac398),
    'ext': _0x5278a6(_0xc11b9d(_0x40d0dc, '1,' + _0x5695f9['length']))
})
```

\_0x250334就是轨迹坐标，通过get接口获取的token传入\_0xc11b9d函数进行加密生成的\_0x5695f9

![](https://attach.52pojie.cn/forum/202511/15/201001pjxy99b1y6yxqljx.png)

\_0x5695f9加密轨迹

```
[
    "/pAuvwFz",
    "iAcuvAXr\\p33",
    "//r0vOF7rp33",
    "ipcgnci8ngpgxcX3",
    "ipSincX8ngpgxcc3",
    "ipAincz8ngpkiAj3",
    "ipFNncprvvI1/p33",
    "ipmxncirvvIiip33",
    "ipmxncirv4r/ic33",
    "ipm/ncprv4r/xA33",
    "ipmUncSrv4rU/p33",
    "ipmUnczzngjx/cz3",
    "ipmUnczkngjx/pi3",
    "ipmUncz8ngjx/pc3",
    "ipm/ncz+ngjx/iq3",
    "ipm/nczCngjxxAp3",
    "ipm/ncz/ngjxxcz3",
    "ipmincz/ngj1iAN3",
    "ipmincX7ngj1iAc3",
    "ipmincXkngj1ipj3"
]
```

\_0x5ac398明文就是计算事件由 \_0x2661b7和\_0x4e6cd6提供的坐标偏移和触摸点击和松开时间间隔，将这些数据组装成一个数组，转成逗号分隔的字符串。然后再用get接口获取的token传入\_0xc11b9d函数进行加密

![](https://attach.52pojie.cn/forum/202511/15/201014g8z82mum2rb2rfui.png)

ext就是将鼠标收集的个数跟1,字符串拼接进行了加密。

![](https://attach.52pojie.cn/forum/202511/15/201026ffuvsu98h14x4bry.png)

data参数的加密就是扣扣扣代码，主要还是明文分析。

生成仿真鼠标轨迹数据轨迹代码，借鉴于网上资料。

```
def _generate_mouse_trace_enhanced( start_x=536, start_y=727, end_x=630, end_y=750,
                                   points_count=37, rect_left=404.3333435058594,
                                   rect_top=726.3333740234375, min_delay=2, max_delay=8,
                                   add_curve=True, curve_intensity=0.1):
    trace_data = []
    # 基于真实轨迹分析的参数调整
    total_distance = math.sqrt((end_x - start_x) ** 2 + (end_y - start_y) ** 2)
    # 真实轨迹显示：初期移动缓慢，中期加速，后期减速
    # 使用贝塞尔曲线的速度分布模拟
    def get_velocity_factor(progress):
        # 基于真实轨迹的速度分布：慢-快-慢
        if progress < 0.3:
            return 0.3 + progress * 2  # 慢启动
        elif progress < 0.7:
            return 0.9 + progress * 0.3  # 快速移动
        else:
            return 1.2 - (progress - 0.7) * 1.5  # 减速停止
    # 真实轨迹中的时间间隔分析（基于你的数据）
    real_intervals = [1, 2, 1, 1, 3, 2, 2, 14, 1, 11, 1, 4, 8, 0, 22, 30, 5, 9, 5, 4, 5, 3, 0, 8, 5, 9, 2, 3, 6, 11,
                      9, 4, 10, 7, 25, 259]
    current_time_offset = 0
    for i in range(points_count):
        progress = i / (points_count - 1)
        # 使用非线性进度模拟真实的加速度变化
        # 真实轨迹显示三段式速度：慢-快-慢
        if progress < 0.2:
            # 起始阶段：缓慢加速
            adjusted_progress = progress * progress * 2.5
        elif progress < 0.8:
            # 中间阶段：匀速或轻微加速
            adjusted_progress = 0.1 + (progress - 0.2) * 1.3
        else:
            # 结束阶段：减速
            remaining = (progress - 0.8) / 0.2
            adjusted_progress = 0.88 + remaining * remaining * 0.12
        # 基础坐标计算
        current_x = start_x + (end_x - start_x) * adjusted_progress
        current_y = start_y + (end_y - start_y) * adjusted_progress
        # 真实轨迹显示的微调模式
        if add_curve and i > 0 and i < points_count - 1:
            # 真实轨迹中存在轻微的非线性路径
            # 使用更自然的偏移模式
            phase = progress * math.pi * 2
            # 主路径偏移（基于真实轨迹的微小弯曲）
            path_deviation = math.sin(phase) * curve_intensity * total_distance * 0.3
            # 垂直于移动方向的偏移
            dx = end_x - start_x
            dy = end_y - start_y
            length = math.sqrt(dx * dx + dy * dy)
            if length > 0:
                # 垂直方向的单位向量
                perp_x = -dy / length
                perp_y = dx / length
                current_x += perp_x * path_deviation
                current_y += perp_y * path_deviation
        # 真实轨迹中的微颤模拟（更精细）
        if i > 0 and i < points_count - 1:
            # 基于真实数据的微调范围
            jitter_x = random.uniform(-0.3, 0.3)
            jitter_y = random.uniform(-0.3, 0.3)
            # 在移动过程中，颤抖会更小
            velocity = get_velocity_factor(progress)
            jitter_factor = max(0.2, 1.0 - velocity * 0.5)
            current_x += jitter_x * jitter_factor
            current_y += jitter_y * jitter_factor
        # 坐标取整
        current_x = round(current_x)
        current_y = round(current_y)
        # 计算相对坐标
        relative_x = round(current_x - rect_left)
        relative_y = round(current_y - rect_top)
        # 时间计算 - 基于真实轨迹的时间分布
        if i == 0:
            current_time = int(time.time() * 1000) - timestamp_ms
        else:
            # 使用真实轨迹的时间间隔分布
            if i - 1 < len(real_intervals):
                interval = real_intervals[i - 1]
            else:
                # 如果超出真实数据范围，使用统计特征
                if progress < 0.1:
                    interval = random.choice([1, 2, 3])  # 初期较慢
                elif progress < 0.8:
                    interval = random.choice([1, 2, 4, 5, 8, 9, 11])  # 中期变化
                else:
                    interval = random.choice([4, 7, 10, 25])  # 后期可能有停顿
            current_time_offset += interval
            current_time = int(time.time() * 1000) - timestamp_ms + current_time_offset
        # 添加轨迹点
        trace_point = f"{relative_x},{relative_y},{current_time}"
        trace_data.append(trace_point)
        # 延迟处理 - 使用更真实的时间间隔
        if i < points_count - 1:
            # 不在这里sleep，因为时间已经在current_time中处理了
            pass
    return trace_data[:50], [f"{relative_x},{relative_y},{current_time + 100},0"]
```

OK啊到这里参数都解决了也可以正常模拟发包了但是fp参数使用了百来遍就得更换用不了，也就上不了并发。

![](https://attach.52pojie.cn/forum/202511/15/201050jgd6mp7coa7vpdd7.png)

### fp参数

上网阅读了各种文章，视频，总结问题出现在了fp参数。开搞！

fp就是cookie，直接hook

![](https://attach.52pojie.cn/forum/202511/15/201107mb22pk5xxxqmbkc8.png)

```
var cookie_cache = document.cookie;
// 使用 Object.defineProperty 来劫持 document.cookie
Object.defineProperty(document, 'cookie', {
    get: function () {
        return cookie_cache;
    },
    set: function (val) {
        console.log(`[J] - cookie设置内容 -> ${val}`);
        // ****************** 查找特定的 cookie 对象值
        if (val.indexOf('gdxidpyhxdE') !== -1) {
            console.log(`[J] - cookie捕获到设置 已断点 -> ${val}`);
            debugger;
        }
        // 提取出 cookie 名和值
        const cookie = val.split(";")[0];
        const ncookie = cookie.split("=");
        console.log(`[J] - cookie设置 -> [${ncookie[0]}]==[${ncookie[1]}]`);
        // ****************** 处理是否更新或添加 cookie
        let flag = false;
        // 更新 cookie_cache，避免重复添加同一个 cookie
        const cache = cookie_cache.split("; ").map((item) => {
            const [key] = item.split("=");
            if (key === ncookie[0]) {
                flag = true;
                return cookie;  // 替换已有的 cookie
            }
            return item;  // 保持原有的 cookie
        });
        // 如果没有找到该 cookie，就将其添加到 cookie_cache
        if (!flag) {
            cache.push(cookie);
        }
        // 更新 cookie_cache，并合并所有 cookies
        cookie_cache = cache.join("; ");
        return cookie_cache;
    }
});
```

找到关键位置之后，逐步分析，看看fp具体怎么生成的

![](https://attach.52pojie.cn/forum/202511/15/201122es3473s0l0sd3955.png)

```
function _0x28c2a9() {
    _0xbec3fb(),
    window[_0x27b72d] = null;
    var _0x7265d3 = {};
    _0x7265d3['v'] = "v1.1";
    var _0x5f067c = !0
      , _0x548794 = _0x7265d3
      , _0x155fa5 = _0x1ab0f2();
    _0x155fa5 && (_0x548794["icp"] = _0x155fa5),
    _0x155fa5 = null,
    _0x548794["h"] = _0x1b7775;
    var _0x1d3f57 = new window["Date"]()["getTime"]() + _0x315b7e
      , _0x5a0e0d = _0x1d3f57 + 1000 * 60 * 60 * 24 * 30;
    _0x548794["u"] = _0x3f6f3f(3) + _0x1d3f57 + _0x3f6f3f(3);
    try {
        var _0x1b360a = {};
        _0x1b360a['b'] = !1,
        _0x1b360a['a'] = !1;
        var _0x5ecc4a = new _0x6ce9ea(_0x1b360a)['get']();
        null != _0x5ecc4a && void 0 != _0x5ecc4a && _0x5ecc4a["length"] > 0 ? _0x548794["fp"] = _0x5ecc4a["join"](",") : (_0x548794["fp"] = _0x32c3af("0", 10),
        _0x548794["ec"] = "1",
        _0x5f067c = !1);
    } catch (_0x36baf2) {
        _0x548794["fp"] = _0x32c3af("0", 10),
        _0x548794["ec"] = "1",
        _0x5f067c = !1;
    }
    try {
        var _0x11ee50 = _0x155fa5 = _0x1c8398(_0x548794);
        if (_0x548794 = _0x17d4df,
        null == _0x548794 || void 0 == _0x548794)
            throw Error("1008");
        null != _0x11ee50 && void 0 != _0x11ee50 || (_0x11ee50 = ""),
        _0x5ecc4a = _0x11ee50;
        var _0xd4eb7e = _0x24ddd4(null == _0x11ee50 ? [] : _0x4178ff(_0x11ee50))
          , _0x511709 = _0x4178ff(_0x5ecc4a + _0xd4eb7e)
          , _0x9a4441 = _0x4178ff(_0x548794);
        null == _0x511709 && (_0x511709 = []),
        _0xd4eb7e = [];
        for (var _0x17f108 = 0; _0x17f108 < _0x24d8dd; _0x17f108++) {
            var _0x462e32 = Math['random']() * 256;
            _0x462e32 = Math['floor'](_0x462e32),
            _0xd4eb7e[_0x17f108] = _0x10df53(_0x462e32);
        }
        if (_0x9a4441 = _0x34a415(_0x9a4441),
        _0x9a4441 = _0x314b89(_0x9a4441, _0x34a415(_0xd4eb7e)),
        _0x17f108 = _0x9a4441 = _0x34a415(_0x9a4441),
        _0x462e32 = _0x511709,
        null == _0x462e32 || void 0 == _0x462e32 || _0x462e32["length"] == 0)
            var _0x539a57 = _0x110e77(_0x492948);
        else {
            var _0x92b403 = _0x462e32["length"]
              , _0x51546e = _0x92b403 % _0x492948 <= _0x492948 - _0x2ac605 ? _0x492948 - _0x92b403 % _0x492948 - _0x2ac605 : _0x492948 * 2 - _0x92b403 % _0x492948 - _0x2ac605;
            _0x511709 = [],
            _0x6f77f5(_0x462e32, 0, _0x511709, 0, _0x92b403);
            for (var _0x162485 = 0; _0x162485 < _0x51546e; _0x162485++)
                _0x511709[_0x92b403 + _0x162485] = 0;
            var _0x28e797 = _0x538bb0(_0x92b403);
            _0x6f77f5(_0x28e797, 0, _0x511709, _0x92b403 + _0x51546e, _0x2ac605),
            _0x539a57 = _0x511709;
        }
        if (_0x92b403 = _0x539a57,
        null == _0x92b403 || _0x92b403['length'] % _0x492948 != 0)
            throw Error("1005");
        _0x539a57 = [];
        for (var _0x18d3ae = 0, _0x46092d = _0x92b403['length'] / _0x492948, _0x63c3c5 = 0; _0x63c3c5 < _0x46092d; _0x63c3c5++) {
            _0x539a57[_0x63c3c5] = [];
            for (var _0x3cbf3d = 0; _0x3cbf3d < _0x492948; _0x3cbf3d++)
                _0x539a57[_0x63c3c5][_0x3cbf3d] = _0x92b403[_0x18d3ae++];
        }
        _0x18d3ae = [],
        _0x6f77f5(_0xd4eb7e, 0, _0x18d3ae, 0, _0x24d8dd);
        for (var _0x2eadd2 = _0x539a57["length"], _0x514e6c = 0; _0x514e6c < _0x2eadd2; _0x514e6c++) {
            var _0x215aa7 = _0x539a57[_0x514e6c];
            if (null == _0x215aa7)
                var _0x19193b = null;
            else {
                var _0x56f8a1 = _0x10df53(37);
                _0x46092d = [];
                for (var _0x4d0061 = _0x215aa7['length'], _0x28c292 = 0; _0x28c292 < _0x4d0061; _0x28c292++)
                    _0x46092d['push'](_0x3346f1(_0x215aa7[_0x28c292], _0x56f8a1));
                _0x19193b = _0x46092d;
            }
            if (_0x46092d = _0x19193b,
            null == _0x46092d)
                var _0x2573f1 = null;
            else {
                var _0x4ade5a = _0x10df53(35);
                _0x63c3c5 = [];
                for (var _0x64e9a7 = _0x46092d['length'], _0x2f56a3 = 0; _0x2f56a3 < _0x64e9a7; _0x2f56a3++)
                    _0x63c3c5['push'](_0x3346f1(_0x46092d[_0x2f56a3], _0x4ade5a--));
                _0x2573f1 = _0x63c3c5;
            }
            if (_0x46092d = _0x2573f1,
            null == _0x46092d)
                var _0x74a09a = null;
            else {
                var _0x5de767 = _0x10df53(-44);
                _0x63c3c5 = [];
                for (var _0x415d4f = _0x46092d['length'], _0x55e5a8 = 0; _0x55e5a8 < _0x415d4f; _0x55e5a8++)
                    _0x63c3c5['push'](_0x2055e1(_0x46092d[_0x55e5a8], _0x5de767++));
                _0x74a09a = _0x63c3c5;
            }
            var _0x47be8c = _0x314b89(_0x74a09a, _0x9a4441);
            if (_0x46092d = _0x47be8c,
            _0x63c3c5 = _0x17f108,
            null == _0x46092d)
                var _0x13ad86 = null;
            else {
                if (null == _0x63c3c5)
                    _0x13ad86 = _0x46092d;
                else {
                    _0x3cbf3d = [];
                    for (var _0x16fc88 = _0x63c3c5["length"], _0x1493a1 = 0, _0x5f10f3 = _0x46092d['length']; _0x1493a1 < _0x5f10f3; _0x1493a1++)
                        _0x3cbf3d[_0x1493a1] = _0x10df53(_0x46092d[_0x1493a1] + _0x63c3c5[_0x1493a1 % _0x16fc88]);
                    _0x13ad86 = _0x3cbf3d;
                }
            }
            _0x47be8c = _0x314b89(_0x13ad86, _0x17f108);
            var _0x4d5154 = _0x45222a(_0x47be8c);
            _0x4d5154 = _0x45222a(_0x4d5154),
            _0x6f77f5(_0x4d5154, 0, _0x18d3ae, _0x514e6c * _0x492948 + _0x24d8dd, _0x492948),
            _0x17f108 = _0x4d5154;
        }
        if (null == _0x18d3ae || void 0 == _0x18d3ae)
            var _0x5a21c4 = null;
        else {
            if (_0x18d3ae['length'] == 0)
                _0x5a21c4 = "";
            else {
                var _0x343c93 = 3;
                try {
                    _0x2eadd2 = [];
                    for (var _0x49bcda = 0; _0x49bcda < _0x18d3ae['length']; ) {
                        if (!(_0x49bcda + _0x343c93 <= _0x18d3ae["length"])) {
                            _0x2eadd2["push"](_0x3d9f27(_0x18d3ae, _0x49bcda, _0x18d3ae['length'] - _0x49bcda));
                            break;
                        }
                        _0x2eadd2['push'](_0x3d9f27(_0x18d3ae, _0x49bcda, _0x343c93)),
                        _0x49bcda += _0x343c93;
                    }
                    _0x5a21c4 = _0x2eadd2['join']("");
                } catch (_0x3afc4a) {
                    throw Error("1010");
                }
            }
        }
        _0x155fa5 = _0x5a21c4;
    } catch (_0x3bcebb) {
        var _0x5bb07c = {};
        _0x5bb07c['ec'] = "2",
        _0x5bb07c['em'] = _0x3bcebb["message"],
        _0x155fa5 = _0x1c8398(_0x5bb07c),
        _0x5f067c = !1;
    }
    _0x155fa5 = _0x155fa5 + ":" + _0x1d3f57,
    _0x5a1052(_0x4d1cfd, _0x155fa5, _0x5f067c, _0x5a0e0d),
    _0x5f067c = _0x4d1cfd,
    _0x5a21c4 = _0x155fa5,
    _0x343c93 = _0x634fb1(_0x5f067c),
    null !== _0x343c93 && void 0 !== _0x343c93 && _0x343c93 !== "" || _0x5a1052(_0x5f067c, _0x5a21c4, !1),
    window[_0x27b72d] = _0x155fa5,
    window["setTimeout"] && window["setTimeout"](_0x28c2a9, _0x25de90);
}
```

先执行 `_0x1ab0f2()`，\_0x155fa5为\_0x1ab0f2()的返回值，也就是为null,\_0x155fa5为null后续的(\_0x548794["icp"] = \_0x155fa5)就不执行了。那么进去看看\_0x1ab0f2具体执行了什么操作。

![](https://attach.52pojie.cn/forum/202511/15/201141e9ktw49eo9o5cpn0.png)

\_0x1ab0f2调用了函数 \_0x454662，\_0x1ab0f2函数就是通过\_0x454662的返回值来检测判断环境中是否存在 PhantomJS 环境(自动化)或者window是否有context或者context.hashCode属性。

```
function _0x404950(_0x49c56a) {
    return null == _0x49c56a || void 0 == _0x49c56a;
}
function _0x1ab0f2() {
    // 调用函数 _0x454662()，并将返回值赋给变量 _0x47f837
    var _0x47f837 = _0x454662();
    // 判断 _0x47f837 是否“不合法”或“无效”（假设 _0x404950 是检测无效或空值的函数）
    // 如果 _0x404950(_0x47f837) 返回 false，表示 _0x47f837 有效，则返回 _0x47f837 对象的属性 'c'
    if (!_0x404950(_0x47f837))
        return _0x47f837['c'];
    // 进入try 块，尝试检测 window 对象中的 phantom 或 phantom.injectJs 是否“无效”
    try {
        // window.phantom 或 window.phantom.injectJs “无效”，_0x404950 返回 true，则 _0x47f837 赋值为 null
        // 调用 _0xa06d00 函数，传入 _0x14d460 和字符串 "phantom.injectJs"，结果赋值给 _0x47f837
        _0x47f837 = _0x404950(window["phantom"]) || _0x404950(window["phantom"]["injectJs"]) ? null : _0xa06d00(_0x14d460, "phantom.injectJs");
    } catch (_0x40c332) {
        // 如果上述访问 window.phantom 过程中抛出异常，捕获异常并将 _0x47f837 置为 null
        _0x47f837 = null;
    }
    // 检测 _0x47f837 是否无效，如果有效就返回它的属性 'c'
    if (!_0x404950(_0x47f837))
        return _0x47f837['c'];
    // 进入 try 块，尝试检测 window.context 或 window.context.hashCode 是否无效
    try {
        // window.context 或 window.context.hashCode 无效，则 _0x47f837 赋值为 null
        // 否则调用 _0xa06d00 函数传入 _0x14d460 和字符串 "context.hashCode"，将结果赋给 _0x47f837
        _0x47f837 = _0x404950(window["context"]) || _0x404950(window["context"]["hashCode"]) ? null : _0xa06d00(_0x14d460, "context.hashCode");
    } catch (_0x2c7063) {
        // 如果访问 window.context 抛异常，捕获异常并将 _0x47f837 置为 null
        _0x47f837 = null;
    }
    // 判断 _0x47f837 是否无效，如果无效则返回 null，否则返回 _0x47f837['c']
    return _0x404950(_0x47f837) ? null : _0x47f837['c'];
}
```

\_0x454662函数插个点，感觉这种可以用ast还原成平坦流，等ast进步了再回来研究一下还原。\_0x454662函数总共检测以下点

* 自动化工具/虚拟浏览器环境检测
* 检测`parseFloat`是否能正确解析小数
* 检测`parseFloat`解析非数字字符串时是否返回`NaN`
* 检测`parseInt`是否能正确解析整数
* 检测`parseInt`解析非数字字符串时是否返回`NaN`
* 检测`decodeURI`能否正确解码双引号的编码
* 检测`decodeURIComponent`能否正确解码`&`的编码
* 检测`encodeURI`能否正确编码双引号
* 检测`encodeURIComponent`能否正确编码`&`
* 检测`escape`能否正确编码`&`
* 检测`unescape`能否正确解码`%26`为`&`
* 检测`eval`能否正确执行并返回预期结果，说明JS执行环境是否正常

分两种情况

1. 通过检测时，函数返回 `null`。
2. 检测未通过时，返回调用 `_0xa06d00` 的结果或其它异常值。

这些代码主要就是做了检测,那咱们就按浏览器运行之后的结果null赋值就行了。

```
var _0x14d460 = [
    new _0xa2de97("window","0000"),
    new _0xa2de97("document","0001"),
    new _0xa2de97("navigator","0002"),
    new _0xa2de97("location","0003"),
    new _0xa2de97("history","0004"),
    new _0xa2de97("screen","0007"),
    new _0xa2de97("parent","0008"),
    new _0xa2de97("top","0009"),
    new _0xa2de97("self","0010"),
    new _0xa2de97("parseFloat","0100"),
    new _0xa2de97("parseInt","0101"),
    new _0xa2de97("decodeURI","0102"),
    new _0xa2de97("decodeURIComponent","0103"),
    new _0xa2de97("encodeURI","0104"),
    new _0xa2de97("encodeURIComponent","0105"),
    new _0xa2de97("escape","0106"),
    new _0xa2de97("unescape","0107"),
    new _0xa2de97("eval","0108"),
    new _0xa2de97("_phantom","0200",!1),
    new _0xa2de97("callPhantom","0201",!1),
    new _0xa2de97("phantom","0202",!1),
    new _0xa2de97("phantom.injectJs","0203",!1),
    new _0xa2de97("context.hashCode","0211",!1)
];
function _0x454662() {
    _0x45f85b: {
        var _0x253511 = _0x14d460; // 取出上面定义的数组赋给局部变量
        // 判断 _0x253511 是否通过函数 _0x404950 的检测
        // 这个检测函数的具体逻辑未知，但一般是判断对象有效性、完整性或某种状态
        if (!_0x404950(_0x253511))
            // 如果没有通过检测，则遍历数组中的每一个元素
            for (var _0x2693ce = 0; _0x2693ce < _0x253511['length']; _0x2693ce++) {
                var _0x48b557 = _0x253511[_0x2693ce]; // 取出当前元素

                // 判断当前元素是否有属性 'i' 且通过另一个检测函数 _0x564bbb 判断为 false（即不满足某条件）
                if (_0x48b557['i'] && !_0x564bbb(_0x48b557)) {
                    _0x253511 = _0x48b557; // 将 _0x253511 指向这个元素
                    break _0x45f85b; // 跳出整个带标签的代码块
                }
            }
        // 如果循环结束没有找到满足条件的元素，置为 null
        _0x253511 = null;
    }
    // 此时如果 _0x253511 通过 _0x404950 检测，则继续执行一系列的环境检测
    if (_0x404950(_0x253511)) {
        try {
            // 检测 parseFloat 函数是否正常：
            // parseFloat("1.01") 应该是数字 1.01
            // parseFloat("HELLO") 应该返回 NaN，使用 isNaN 判断
            var _0xe26d98 = window["parseFloat"]("1.01") === 1.01 && window['isNaN'](window["parseFloat"]("HELLO"));
        } catch (_0x5ca886) {
            _0xe26d98 = !1; // 如果调用 parseFloat 报错，判定位 false
        }
        // 如果 parseFloat 检测通过，继续检测 parseInt
        if (_0xe26d98) {
            try {
                // 检测 parseInt 函数：
                // parseInt("123") 应是数字 123
                // parseInt("HELLO") 应返回 NaN
                var _0x4cab62 = window['parseInt']("123") === 123 && window["isNaN"](window["parseInt"]("HELLO"));
            } catch (_0x52ef95) {
                _0x4cab62 = !1; // 报错判为失败
            }
            if (_0x4cab62) {
                try {
                    // 检测 decodeURI 函数：
                    var _0x132c08 = window['decodeURI']("%22") === "\"";
                } catch (_0x254abd) {
                    _0x132c08 = !1;
                }
                if (_0x132c08) {
                    try {
                        // 检测 decodeURIComponent 函数：
                        var _0x1a8535 = window['decodeURIComponent']("%26") === "&";
                    } catch (_0x262b6f) {
                        _0x1a8535 = !1;
                    }

                    if (_0x1a8535) {
                        try {
                            // 检测 encodeURI 函数：
                            var _0x1c788b = window['encodeURI']("\"") === "%22";
                        } catch (_0x1b644e) {
                            _0x1c788b = !1;
                        }

                        if (_0x1c788b) {
                            try {
                                // 检测 encodeURIComponent 函数：
                                var _0x4c9451 = window['encodeURIComponent']("&") === "%26";
                            } catch (_0x2612a3) {
                                _0x4c9451 = !1;
                            }

                            if (_0x4c9451) {
                                try {
                                    // 检测 escape 函数：
                                    var _0x2ba022 = window['escape']("&") === "%26";
                                } catch (_0x2b6c77) {
                                    _0x2ba022 = !1;
                                }

                                if (_0x2ba022) {
                                    try {
                                        // 检测 unescape 函数：
                                        var _0x5ccb0c = window['unescape']("%26") === "&";
                                    } catch (_0x5dffa9) {
                                        _0x5ccb0c = !1;
                                    }

                                    if (_0x5ccb0c) {
                                        try {
                                            // 检测 eval 函数：
                                            var _0x5e5add = window['eval']("(function(){return 123;})();") === 123;
                                        } catch (_0x42e250) {
                                            _0x5e5add = !1;
                                        }
                                        // 如果 eval 检测失败，调用 _0xa06d00（可能是错误处理或反调试函数）
                                        _0xe26d98 = _0x5e5add ? null : _0xa06d00(_0x14d460, "eval");
                                    } else
                                        _0xe26d98 = _0xa06d00(_0x14d460, "unescape");
                                } else
                                    _0xe26d98 = _0xa06d00(_0x14d460, "escape");
                            } else
                                _0xe26d98 = _0xa06d00(_0x14d460, "encodeURIComponent");
                        } else
                            _0xe26d98 = _0xa06d00(_0x14d460, "encodeURI");
                    } else
                        _0xe26d98 = _0xa06d00(_0x14d460, "decodeURIComponent");
                } else
                    _0xe26d98 = _0xa06d00(_0x14d460, "decodeURI");
            } else
                _0xe26d98 = _0xa06d00(_0x14d460, "parseInt");
        } else
            _0xe26d98 = _0xa06d00(_0x14d460, "parseFloat");
    } else
        // 如果一开始 _0x253511 不满足 _0x404950，则返回当前值（可能是null或无效）
        _0xe26d98 = _0x253511;
    // 返回最终结果，如果所有内置函数检测通过，结果为 null，否则为错误处理函数的返回值或无效对象
    return _0xe26d98;
}
```

其他的代码没啥可写的，就扣代码就行了加密也是一样扣代码就行了，最后分析一下环境数组吧。

![](https://attach.52pojie.cn/forum/202511/15/201208ny78bu5phbgzg32d.png)

\_0x5a7ee4代码也是一些环境检测跟一些环境值获取最后将值填到数组上,如果\_0x5ca0e8为真才收集这些环境信息，否则返回空数组，\_0x5ca0e8就是\_0x454662取值取反，\_0x454662就是刚刚那堆环境检测返回值，如果之前的环境检测没通过环境数组就不会生成。这就是为什么笔者要去分析那个\_0x454662函数的原因。

![](https://attach.52pojie.cn/forum/202511/15/201221vz4wbeyerrr454y1.png)

```
function _0x5a7ee4() {
    try {
        // 尝试访问 window.sessionStorage，并转换为布尔值返回
        // 如果存在且可访问，返回 true；否则返回 false
        return !!window["sessionStorage"];
    } catch (_0xa2ddcc) {
        // 如果访问过程中抛出异常（例如隐身模式下禁用），则返回 true
        // 这里返回 true 可能是为了默认认为支持，或者防止程序中断
        return !0;  // !0 即 true
    }
}
// 函数：检测浏览器是否支持 localStorage
function _0x58e450() {
    try {
        // 尝试访问 window.localStorage，并转换为布尔值返回
        return !!window["localStorage"];
    } catch (_0x3091e4) {
        // 如果访问时出现异常，返回 true（同上逻辑）
        return !0;  // !0 即 true
    }
}
function get_() {
    // 定义两个数组，用于存储不同类别的环境特征数据
    var _0x6f820c = [],   // 主要特征数组
        _0x1cb4a4 = [];   // 辅助特征数组
    // 判断一个标志变量 _0x5ca0e8 是否为真，若为假则跳过特征收集
    if (_0x5ca0e8) {
        // 向第一个数组添加第一个特征，调用函数 _0x5a7ee4() 并将结果入栈
        _0x6f820c["push"](_0x5a7ee4());
        // 向第一个数组添加第二个特征，调用函数 _0x58e450() 并将结果入栈
        _0x6f820c['push'](_0x58e450());
        // 向第一个数组添加是否支持 indexedDB 的布尔值（强制转成布尔）
        _0x6f820c['push'](!!window["indexedDB"]);
        // 判断文档对象是否存在 body 元素
        if (_0x27711e["body"]) {
            // body 存在则取其 addBehavior 属性（IE 特有），通过 _0x2ba902 处理后入栈
            _0x6f820c["push"](_0x2ba902(_0x27711e["body"]["addBehavior"]));
        } else {
            // body 不存在时，入栈字符串 "undefined"
            _0x6f820c['push']("undefined");
        }
        // 检测是否支持 WebSQL（window.openDatabase），用 _0x2ba902 处理并放入数组
        _0x6f820c["push"](_0x2ba902(window["openDatabase"]));
        // 读取浏览器的 CPU 类型（IE 特有属性 cpuClass），放入数组
        _0x6f820c["push"](_0x301a50["cpuClass"]);
        // 读取浏览器平台信息（如 Win32、MacIntel 等），放入数组
        _0x6f820c['push'](_0x301a50["platform"]);
        // 定义变量，稍后用来存放 canvas 支持状态
        var _0x49c4ff;
        // 判断标志 _0xdd8e4c['l'] 是否为真，表示是否进行 canvas 特征检测
        if (_0x49c4ff = _0xdd8e4c['l'])
            try {
                // 创建一个 canvas 元素
                var _0x3f3574 = _0x27711e["createElement"]("canvas");
                // 检测 canvas 是否支持 getContext 且支持 2d 渲染上下文
                _0x49c4ff = !(!_0x3f3574["getContext"] || !_0x3f3574["getContext"]("2d"));
            } catch (_0x47141f) {
                // 如果创建或检测过程中抛出异常，则表示不支持
                _0x49c4ff = !1;
            }
        // 如果 canvas 支持
        if (_0x49c4ff)
            try {
                // 调用函数 _0x2688e1() 获取 canvas 指纹数据，放入数组
                _0x6f820c["push"](_0x2688e1());
                // 如果标志 _0xdd8e4c['b'] 为真，调用 _0x52ab0f() 获取更多 canvas 相关数据并入栈
                _0xdd8e4c['b'] && _0x6f820c["push"](_0x52ab0f());
            } catch (_0x3b58f7) {
                // 如果获取 canvas 指纹异常，标记为 "canvas exception"
                _0x6f820c["push"]("canvas exception");
            }
        // 调用函数 _0x19c64d()，可能是收集字体、插件等信息，加入第一个数组
        _0x6f820c["push"](_0x19c64d());
        // 如果标志 _0xdd8e4c['a'] 为真，调用 _0x50a0aa() 收集额外特征，放入第二个数组
        _0xdd8e4c['a'] && _0x1cb4a4['push'](_0x50a0aa());
        // 把浏览器 userAgent 字符串加入第二个数组
        _0x1cb4a4['push'](_0x301a50["userAgent"]);
        // 把浏览器语言设置加入第二个数组
        _0x1cb4a4["push"](_0x301a50["language"]);
        // 把屏幕颜色深度加入第二个数组
        _0x1cb4a4["push"](window["screen"]["colorDepth"]);
        // 如果标志 _0xdd8e4c['o'] 为真，收集屏幕分辨率（高度 x 宽度）
        if (_0xdd8e4c['o']) {
            // 如果 window.screen 存在，取高宽组成数组，否则默认[0,0]
            _0x49c4ff = window["screen"] ? [window["screen"]["height"], window["screen"]["width"]] : [0, 0];
            // 判断 _0x49c4ff 是否未定义，并通过 _0x2ba902 进行处理，结果不是 "undefined" 即加入第二个数组
            if (('undefined' == typeof _0x49c4ff ? "undefined" : _0x2ba902(_0x49c4ff)) !== "undefined")
                _0x1cb4a4["push"](_0x49c4ff['join']("x"));  // 格式化成 "heightxwidth" 字符串入栈
        }
        // 加入当前时区偏移（分钟），例如中国是 -480
        _0x1cb4a4['push'](new Date()["getTimezoneOffset"]());
        // 加入 doNotTrack 设置，表示用户是否启用了“请勿跟踪”
        _0x1cb4a4['push'](_0x301a50["doNotTrack"]);
        // 调用 _0x43c5b9() 收集其他环境信息，加入第二个数组
        _0x1cb4a4["push"](_0x43c5b9());
    }
    // 最终准备输出的数组，重用变量名
    _0x49c4ff = [];
    // 根据标志 _0xdd8e4c['g'] 是否存在，决定用哪个函数对收集的特征进行哈希或编码处理
    if (_0xdd8e4c['g']) {
        // 使用 _0xdd8e4c['g'] 函数对第一个数组拼接字符串进行处理，再加入结果数组
        _0x49c4ff['push'](_0xdd8e4c['g'](_0x6f820c["join"]("###")));
        // 使用 _0xdd8e4c['g'] 函数对第二个数组拼接字符串进行处理，再加入结果数组
        _0x49c4ff['push'](_0xdd8e4c['g'](_0x1cb4a4["join"]("###")));
    } else {
        // 如果没有指定处理函数，使用默认的 _0x354f80 函数对拼接字符串进行处理，加入数组
        _0x49c4ff['push'](_0x354f80(_0x6f820c['join']("###")));
        _0x49c4ff["push"](_0x354f80(_0x1cb4a4['join']("###")));
    }
    // 返回包含两个处理结果的数组
    return _0x49c4ff;
}
```

canvas绘图结果：

![](https://attach.52pojie.cn/forum/202511/15/201246yd5szdbmodsddd1e.png)

## 结尾

每天进步一点点
