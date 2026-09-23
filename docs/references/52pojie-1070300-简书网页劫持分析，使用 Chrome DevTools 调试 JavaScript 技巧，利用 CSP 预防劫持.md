# 简书网页劫持分析，使用 Chrome DevTools 调试 JavaScript 技巧，利用 CSP 预防劫持

> **作者**: Ganlv | **发布时间**: 2019-12-09 06:26:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 71845 / 260
> **原文**: [https://www.52pojie.cn/thread-1070300-1-1.html](https://www.52pojie.cn/thread-1070300-1-1.html)

---

*本帖最后由 Ganlv 于 2019-12-10 01:24 编辑*

## 简书网页劫持分析，浏览器指纹信息，使用 Chrome DevTools 调试 JavaScript 技巧，Android Chrome 远程调试，利用 CSP 预防劫持

[![CC0 Mark](https://licensebuttons.net/p/mark/1.0/88x31.png)](http://creativecommons.org/publicdomain/mark/1.0/)
本作品没有已知的著作权限制。
本文可以随意转载，无需向我申请。有条件的话希望能注明原文链接，有任何问题可以回帖讨论。

### 摘要

最近，每天第一次打开简书都会跳转到一个恶意网页，它以浏览器错误问题引导用户下载一个安装包。这个安装包安全性未知。另外打开网页时还会自动向剪贴板中写入一个淘口令，打开淘宝的时候会自动打开一个红包。页面跳转似乎是同一个 IP 每天只有第一次会触发，自动复制淘口令每次都会触发。另外，恶意网页的域名隔一段时间会更换。

经过分析得出，此问题准确来说不算是网页劫持，而是简书自己的一个广告供应商的问题。恶意代码是直接嵌入正常业务代码的，排除了被劫持的可能。由于已经持续很长一段时间了，所以说不定是简书默许了这个行为。此外，CSDN 似乎某些情况下也有这个问题（不确定）。

文章末尾介绍了使用 CSP (Content Security Policy) 预防页面劫持的方法。

**关键词：** 简书 劫持 网页 广告 恶意跳转 分析 DevTools 调试 JavaScript 指纹 Canvas Fingerprint CSP Cookie webpack

**注意：** 如果想知道如何劫持 HTTPS 网页的，抱歉这里没有，目前也不太可能出现 HTTPS 网页劫持或证书劫持的问题。

### 问题引出

最近（其实已经很长时间了），每天第一次打开简书都会跳转到一个恶意网页，它以浏览器错误问题引导用户下载一个安装包。这个安装包安全性未知。另外打开网页时还会自动向剪贴板中写入一个淘口令，打开淘宝的时候会自动打开一个红包。

![](https://attach.52pojie.cn/forum/201912/09/061752phg5ztz43qr3v1kp.gif)

页面跳转似乎是同一个 IP 每天只有第一次会触发，自动复制淘口令每次都会触发。

因为用电脑访问并不会出现任何问题，所以我曾经一度以为是我的手机中病毒了。iOS 也不会触发，他们似乎仅针对 Android 手机。

所以我就用电脑对网页的脚本分析了一下，这里把分析过程分享给大家。说白了就是内嵌了一段 js 脚本（不过里面能发现很多有趣的东西）。这篇文章的主要目的也是介绍一些 JavaScript 的调试技巧。

### 目录

* 抓包
* 分析 js 代码依赖关系
* 格式化代码
* 分析代码逻辑与目的
* 为什么会出现这种问题
* 前端开发者如何预防这种问题
* 其他相关的思考与感想

### 抓包

打开 Chrome 浏览器，按 F12 打开 Chrome DevTools（Chrome 开发者工具），切换到 Network 标签中勾选 Preseve log，然后访问一个简书的网页。

> 网页是我在 Bing 上随便找到 [site:jianshu.com - 国内版 Bing](https://cn.bing.com/search?q=site%3Ajianshu.com)

等待页面加载完成。简单浏览一下域名，看看有没有外部脚本。

似乎 PC 端不太行，那个页面似乎只能在安卓端触发，这里采用一种方法模拟一下手机端。点击开发者工具左上角的手机图标，然后在网页上方多出的工具栏中选择一个 Android 机型，刷新页面再看看。

![](https://attach.52pojie.cn/forum/201912/09/061758xphmpv3vu3zr651g.png)

这里有一个小技巧，右键列表的表头，勾选 Domain。然后按照域名排序，你就可以轻松忽略大量相同域名的文件了。

![](https://attach.52pojie.cn/forum/201912/09/061802if2cb577fcbhn24f.png)

我们似乎有意外发现，来自非简书的域名

![](https://attach.52pojie.cn/forum/201912/09/061806zmmly3rc0erje1bt.png)

卧槽！这么多奇奇怪怪名字的域名，一看就不是什么好东西。这得有多少使用简书的人被这帮恶意脚本 X 啊。

### 分析 js 代码依赖关系

![](https://attach.52pojie.cn/forum/201912/09/061810w6536132ppb4z1z5.png)

我们可以看到文件是这样加载的

> 为了防止不必要的外链风险，文中所有的域名均使用下划线 `_` 代替了点 `.`

```
https://www_jianshu_com/p/bc916e388452
    https://cdn2_jianshu_io/asimov/2.c90dbb2ede007dc39cbf.js
        https://ox86_xu7b_com/m301650.js
            https://s9_cnzz_com/z_stat.php?id=1277879054&web_id=1277879054
            https://ws2_hbssjd_cn/ms/a.js?b=200473!301650!88!640!150!200&u=5!5.0!0!1!c20tZzkwMHA%3D!8!77.0.3865.75!1&c=1!0!x!6!4!1!24!640!360!0!5!0!x!1!d2luMzI%3D!1!0!0!0!0!1!3!x!d3d3LmppYW5zaHUuY29t!1!1!1!R29vZ2xlSW5jLn5BTkdMRShJbnRlbChSKUhER3JhcGhpY3M0NjAwRGlyZWN0M0QxMXZzXzVfMHBzXzVfMCk%3D!12!1!1!1!42!56!-1!-1!2585131335&f=83338
                https://s5_cnzz_com/z_stat.php?id=1277762915&web_id=1277762915
                https://vi12x_xcle_cn/sucnew/640x150/20190909sg150.png
        https://yun_lvehaisen_com/h5-mami/msdk/tmk.js
            https://engine_tuistone_com/api/v1/activity/get4web?request_id=2NQi3x8zovefyJ6WYcB8c8K2L1Zz8Jn3Haz5vKiixtlv8Swe1574800139758&app_key=2NQi3x8zovefyJ6WYcB8c8K2L1Zz&slotId=304277&device_id=8Jn3Haz5vKiixtlv8Swe1574800139758&callback=jsonp_0020308437386842737
            https://engine_tuistone_com/api/v1/activity/spm4web?slotId=304277&app_key=2NQi3x8zovefyJ6WYcB8c8K2L1Zz&device_id=8Jn3Haz5vKiixtlv8Swe1574800139758&activity_id=2000017418%2C923%2C923&sdk_type=JSSDK&sdk_version=3.3.1&sdk_source=jianshu.com&type=0&click_url=https%3A%2F%2Factivity.tuipear.com%2Factivity%2Findex%3Fid%3D17418%26slotId%3D304277%26login%3Dnormal%26appKey%3D2NQi3x8zovefyJ6WYcB8c8K2L1Zz%26deviceId%3D8Jn3Haz5vKiixtlv8Swe1574800139758%26dsm%3D1.304277.0.0%26dsm2%3D1.304277.2.17418%26tenter%3DSOW%26subActivityWay%3D48%26tck_rid_6c8%3D0acc3777k3fjua4n-4603223%26tck_loc_c5d%3Dtactivity-17418%26dcm%3D401.304277.0.923%26&data1=0acc3777k3fjua4n-4603223&data2=%7B%22clickUrl%22%3A%22%2Factivity%2Findex%3Fid%3D17418%26slotId%3D304277%26login%3Dnormal%26appKey%3D2NQi3x8zovefyJ6WYcB8c8K2L1Zz%26deviceId%3D8Jn3Haz5vKiixtlv8Swe1574800139758%26dsm%3D1.304277.0.0%26dsm2%3D1.304277.2.17418%22%2C%22materJson%22%3A%22%7B%5C%22content%5C%22%3A%5C%22%5B%7B%5C%5C%5C%22imageUrl%5C%5C%5C%22%3A%5C%5C%5C%22%2F%2Fyun.tuitiger.com%2Fmami-media%2Fimg%2Fqm1eti6pdn.gif%5C%5C%5C%22%2C%5C%5C%5C%22width%5C%5C%5C%22%3A150%2C%5C%5C%5C%22height%5C%5C%5C%22%3A150%2C%5C%5C%5C%22msItemId%5C%5C%5C%22%3A22%7D%5D%5C%22%2C%5C%22gmtCreate%5C%22%3A1503470517000%2C%5C%22gmtModified%5C%22%3A1565093474000%2C%5C%22id%5C%22%3A923%2C%5C%22md5%5C%22%3A%5C%22DVt9EZ6wUcKxAg6mAseK8n%5C%22%2C%5C%22msId%5C%22%3A22%2C%5C%22pictureGroup%5C%22%3A%5C%224%5C%22%2C%5C%22pictureSize%5C%22%3A21%2C%5C%22pictureType%5C%22%3A%5C%220%5C%22%2C%5C%22pictureVal%5C%22%3A%5C%22150*150%5C%22%2C%5C%22title%5C%22%3A%5C%22%E6%91%87%E4%B8%80%E6%91%87%5C%22%7D%22%2C%22materialId%22%3A923%2C%22sckFromType%22%3A%22null%22%2C%22sckId%22%3A923%7D&refer_host=www.jianshu.com&md=×tamp=&nonce=&signature=&connect_type=undefined&callback=jsonp_039959120667317904
            https://yun_tuitiger_com/mami-media/img/qm1eti6pdn.gif
```

万恶之源都是这个 `2.c90dbb2ede007dc39cbf.js`，它加载了 `m301650.js` 和 `tmk.js` 这两个文件，似乎 `tmk.js` 是用来加载页面右下角的广告的。而另一个就是跳转到骗人下载安装包那个页面。

![](https://attach.52pojie.cn/forum/201912/09/061814dh7le65h85vv7ovb.png)

这个 `m301650.js` 接入 cnzz 站长统计，看来访问量不小，都需要分析访客来源了。说不定分析之后还要针对性投放浏览器恶意下载页面呢。

### 分析代码

然后就是分析代码的目的了。

> 这种明知道被 X 了，却不知道对面在做什么的感觉很难受。我非得把它扒的一干二净不可。

我们需要分析一下 `m301650.js` `a.js` `tmk.js` 这三个文件，如果有需要的话也可以分析一下 `2.c90dbb2ede007dc39cbf.js`，看看恶意代码是怎样嵌入到项目主代码中的。

前方高能！想学技术的仔细瞧，吃瓜群众凑个热闹就行了。

#### 格式化代码

右键选择 Open in Sources panel。

![](https://attach.52pojie.cn/forum/201912/09/061817zn91tcglpcolg6lo.png)

点击代码编辑器左下角的格式化代码按钮。

![](https://attach.52pojie.cn/forum/201912/09/061820l0dkcpako0lmllmi.png)

#### 尝试分析代码

然而事情并没有那么简单，简单浏览一下就会发现，这里有很多加密后的常量，还有疑似的解码算法。

![](https://attach.52pojie.cn/forum/201912/09/061824b6f1bpffexr1sieo.png)

#### 解密字符串

这里有很多种方法，下断点是最容易的，依赖于 Chrome 强大的调试功能，轻松就能找到解密函数。

> 动态调试往往比静态分析要简单。动态调试你能获取到程序运行时的第一手资料，静态调试只能靠一层层的推断。不过动态调试可能被检测出来，静态调试则没有这个问题。

##### 方法 1：下断点调试

![](https://attach.52pojie.cn/forum/201912/09/061828wy2rxbf0zrfg6e0l.gif)

1. 先在被混淆函数 d 那一行下一个断点
2. 刷新页面，重新执行一次这个函数，触发断点
3. 直接在控制台输入被混淆的函数名 d，然后回车，调试工具会直接输出当前上下文环境中的 d 的值。

这样我们很容易就能找到这个解密代码。

##### 方法 2：尝试搜索所有动态语句

如果我们直接找不到某个变量或函数名，那么他应该是动态生成的。

1. 搜索 eval, new Function 动态执行语句
2. 查找 String.fromCharCode, String.charAt 等可能动态生成标识符的函数

先搜索 eval，这种加密虽然最简单，但对于大多数不懂的人也是足够有效的。

> 二八定律处处存在，可能这个加密只是最简单的那 20% 的加密方法，但他却能阻止 80% 的人破解代码。（比例不一定对，但是这种现象是经常存在的）

`m301650.js` 中只有一处 eval

```
eval(function(p, a, c, k, e, d) {
    e = function(c) {
        return c.toString(36)
    };
    if (!''.replace(/^/, String)) {
        while (c--) {
            d[c.toString(a)] = k[c] || c.toString(a)
        }
        k = [function(e) {
            return d[e]
        }];
        e = function() {
            return '\\w+'
        };
        c = 1
    };
    while (c--) {
        if (k[c]) {
            p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c])
        }
    }
    return p
}('6 d(b){5 a,c="";4(a=0;a<b.1;a+=2)c+=3.7(8(b.e(a,a+2),9));f c}', 16, 16, '|length||String|for|var|function|fromCharCode|parseInt|16|||||slice|return'.split('|'), 0, {}));
```

解密很简单，把 `eval(...)` 括号中的部分放到控制台执行就行了（注意括号对应关系），输出的内容就是被加密的代码原始的样子。

![](https://attach.52pojie.cn/forum/201912/09/061831xfv9y9mvydmn4jfk.gif)

> <https://tool.lu/js>，这个网站可以自动解密 eval 加密的 js 代码，把 `eval(...)` 粘贴进文本框，点击 `解密（Decrypt）` 即可解密到源码。你可以试试再点击 `加密（Encrypt）` 你会发现加密后的源码和我们之前看到的类似，看来这段代码的作者也是比较偷懒，直接用现成的加密方法了。

```
function d(b) {
        var a, c = "";
        for (a = 0; a < b.length; a += 2) c += String.fromCharCode(parseInt(b.slice(a, a + 2), 16));
        return c
}
```

这就是我们要找的那个 `d` 函数。这个代码很容易理解，就是一个 [hex2bin](https://www.php.net/manual/zh/function.hex2bin.php) 的功能，将十六进制字符串转换为二进制字符串。

> 对于 JavaScript 这种动态性极强的语言，尽量还是采用第一种方式。

比如 `d("7265676D6F64654669656C6431")`，先加载 `d` 函数，然后运行这条语句就行了。

![](https://attach.52pojie.cn/forum/201912/09/061834ft3a3hpbbp04d40v.png)

#### 批量解密字符串

上面知道了解密函数，但是我不想手动替换每一个加密的地方，我需要把所有 `d(...)` 自动解密。

上重量级武器——语法解析器！我使用了 [acorn](https://github.com/acornjs/acorn/tree/master/acorn) 这个解析器（Parser），将 js 代码转换成 AST（抽象语法树），使用 [acorn-walk](https://github.com/acornjs/acorn/tree/master/acorn-walk) 对 AST 中所有对 d 函数的调用都解码，最后再使用 [escodegen](https://github.com/estools/escodegen) 将 AST 转换回原来的代码。

> 注意：你的电脑必须安装了 [Node.js](https://nodejs.org/zh-cn/) 才可以执行下面的步骤

新建一个文件夹（例如附件的 `decoder/` 文件夹），进入这个文件夹。

首先安装依赖

```
npm install acorn acorn-walk escodegen
```

然后新建一个文件（例如 `index.js`），并编写代码

```
const fs = require('fs');
const acorn = require('acorn');
const walk = require("acorn-walk")
const escodegen = require('escodegen');

function d(b) {
    var a, c = "";
    for (a = 0; a < b.length; a += 2) c += String.fromCharCode(parseInt(b.slice(a, a + 2), 16));
    return c
}

const content = fs.readFileSync('../samples/m301650.js');
const ast = acorn.parse(content);
walk.simple(ast, {
    CallExpression(node) {
        if (node.callee.name === 'd' && node.arguments[0].type === 'Literal') {
            node.type = 'Literal';
            node.value = d(node.arguments[0].value);
        }
    }
});
const decodedContent = escodegen.generate(ast);
fs.writeFileSync('../samples/m301650.decoded.js', decodedContent);
```

执行脚本

```
node index.js
```

上面的脚本会自动读取原始代码 `../samples/m301650.js`，把解码后的代码写入 `../samples/m301650.decoded.js` 文件。

> `../samples/m301650.js` 是我从之前那些链接手动下载的。

#### 开始分析代码

代码总共不到 900 行，认真阅读一下就会理解。

> 这里谈谈一个我个人学习时的思想。学习可以大概分两种类型，第一种是教科书式学习，看教科书的目录就可以明白，它交给你所有的知识点，怎么组织知识结构由你自己来做。第二种是工具书式学习，用到什么查什么，没用到的东西虽然书上有，但是暂时不用去了解。在算法中，就类似于广度优先搜索和深度优先搜索。在数据缓存方面，就类似 eager load（饥饿）和 lazy load（懒加载）。在学校通常是第一种方式学习，在工作中通常是第二种方式学习。
>
> 这里的代码怎么阅读呢？也有两种方法，一个就是按照顺序读代码，了解各个函数的用途，然后再分析主程序。另外一个就是直接读主程序代码，先了解有哪些函数，但不需要看内容，然后分析主程序，主程序中调用了哪个函数，再去看那个函数。（放在 C 语言中，头文件就是存放那个函数声明的地方，其他语言中的 `include` `import` `require` `using` 也是做这个用的）
>
> 图灵机的思想就是“读取当前的状态→程序进行某种运算→最终写入新状态”。从这三个方面任意一方面开始像其他两方面展开分析都是可以的，但是从中间向两侧分析是最简单的。因为我们分析程序的目的就是了解程序究竟做了什么。（这个可以暂时不用理解，因为实战中多体会几次就会发现这样最方便）

分析代码时，我们通常想找出那些影响整个程序状态的代码。在通常意义的破解中，就是找出对系统 API 的调用（分析跨模块调用）。在 js 中就是对浏览器内置的函数的调用。

这里先去除到暂时不会改变状态的代码（声明性的代码），单纯的声明变量或函数对程序是没有影响的。程序的第一层大致是这样的。

```
(function (q, p) {
    function A() {
    }
    function B(b, a, c) {
    }
    function v(b, a, c, d) {
    }
    function C(b, a) {
    }
    var n = {
    };
    B.prototype = {
    };
    A.prototype = {
    };
    n.V = 'https://ewn.hfqxjx.cn/ms/g.js';
    n.N = '301650';
    C(navigator.userAgent);
    try {
    } catch (b) {
        n.l(b, 'f_1');
    }
    var F = new function (b, a) {
    }(navigator.userAgent, n);
    q = new B(q, p, n);
    p = '';
    try {
        p = 'u=' + F.J();
    } catch (b) {
        n.l(b, 'maCal_1');
    }
    try {
        var z = q.J('kwashhhh');
        p = p + '&c=' + z.pa;
    } catch (b) {
        n.l(b, 'maCal_2');
    }
    try {
        var t = n.u('kwashhhhfgp');
        if (!t && z) {
            t = new A().get(z.qa);
            var E = new Date();
            E.setHours(48, 0, 0, 0);
            n.v('kwashhhhfgp', t, E);
        }
        t && (p = p + '!' + t + '&f=' + Math.floor(100000 * Math.random() + 1));
    } catch (b) {
        n.l(b, 'macal_3');
    }
    try {
        var _hmt = _hmt || [];
        var oscr = document.createElement('script'), osdiv = document.createElement('div');
        oscr.src = 'https://s9.cnzz.com/z_stat.php?id=1277879054&web_id=1277879054';
        osdiv.style.display = 'none';
        osdiv.appendChild(oscr);
        document.body.appendChild(osdiv);
    } catch (b) {
        n.l(b, 'macal_4');
    }
    try {
        n.h('1', 'https://ewn.hfqxjx.cn/ms/a.js?b=200473!301650!88!640!150!200&' + p);
    } catch (b) {
        n.l(b, 'macal_5');
    }
})('kwashhhh', '301650'));
```

其中 `A` `B` `v` `C` 函数都是声明，没有执行，暂时不用分析。`n` `B.prototype` `A.prototype` 基本上不用分析，因为他们基本上只是定义变量，不会修改全局状态。`n.V =` `n.N =` 修改的是程序的局部变量，对全局不会造成影响。

`C(navigator.userAgent)` 是第一个需要分析的代码，后面的所有语句几乎都可能与全局状态有关，都需要分析。

等等！我们真的需要这么麻烦吗？上面的方法适用于静态分析，不过动态分析比静态分析要简单！我们只需要在程序的第一句话下断点，然后一直单步运行就可以走完程序的逻辑了。

#### 单步运行代码

> 在 Chrome DevTools 中 `F8` 是继续运行，`F10` 是单步步过，`F11` 是单步步入，`Shift + F11` 是执行跳出当前函数，更多快捷键可以在 `右上角的三点 > Settings > Shortcuts > Debugger` 看到。

##### m301650

我新建了一个 `m301650.html` 里面只有一句话 `<script src="m301650.decoded.js"></script>` 这样我们可以打开这个本地的网页就可以进行测试了，同时这样也不会有其他代码的干扰。

这个过程虽然不难，但是非常的枯燥，用文字叙述也十分麻烦，此处省略，直接给出分析结果。

这个脚本收集了 `window` `navigator` 对象提供的各种各样的信息，例如：计算机或手机品牌型号、计算机操作系统（Windows、Linux、Mac OS、Android、iOS）、版本、CPU 核心数、浏览器种类（Chrome、IE、Opera、Firefox、Edge、Safari、微信、QQ、360、小米、OPPO、百度）、版本、排版引擎（WebKit、Trident、Gecko）、WEBGL 渲染引擎版本、Canvas Fingerprint、屏幕宽度、高度、色彩深度、是否支持触摸、触控点数、是否开启 Cookie、是否支持 LocalStorage、SessionStorage、IndexedDB。

这个脚本最后会加载 `https://ewn_hfqxjx_cn/ms/a.js` 并附加上这些获取的参数。`a.js` 又会做一堆事情，我们继续分析。

##### a

这个 `a.js` 并没有做什么过分的事情，脚本会在页面某个位置添加一个图片，例如下面这个页面中间京东的广告。

![](https://attach.52pojie.cn/forum/201912/09/061837d28vy0ojmlx62458.png)

这个广告看上去像是简书自己添加的，不是什么恶意广告，只是域名让人看起来非常可疑。

不过，让我觉得很烦的是。到目前为止，我刚分析了 2 个 js 文件，就已经加载了 3 个 cnzz 的统计脚本了。我已经将 cnzz.com 加入我的屏蔽域名中了。

#### 反混淆工具

##### tmk

这个脚本也很复杂，也是单步调试慢慢看。在我心情烦躁时，我尝试搜索了一下 `Reverse uglify js`，我发现了 <http://jsnice.org> 这个网站，真的跟网站域名说的一样，Nice!

他可以自动推断值的类型，并据此来重命名变量，例入通过 `var a = document.createElement('script')`，会被转换成 `var script_element = document.createElement('script')`。他还会把 uglify 中常用的 `&&` 和 `||` 转换成 `if (xxx)` 或者 `if (!xxx)`，总之就是一个字：爽！

代码的内容并不复杂，`tmk.js` 只提供了一个 `TuiSDK` 类，真正调用的地方在 `2.c90dbb2ede007dc39cbf.js` 中

```
var t = document.createElement("div");
new TuiSDK({
    container: t,
    appKey: "2NQi3x8zovefyJ6WYcB8c8K2L1Zz",
    slotId: "304277"
});
```

这个广告使用 jsonp 返回数据，这个广告 SDK 只是根据这个返回值在网页上添加一个图标和一个链接，虽然这个广告图片特别像那种流氓网站（下面这张图片右下角的“送”字），但其实并没做什么过分的事情。

不过 jsonp 不仅仅可以返回数据，还是可以植入代码的，这个 SDK 是否可信我不太清楚，我测试的时候没有发现 jsonp 加载恶意代码的情况。

##### 2

到目前为止都并没有脚本修改跳转链接，也没有往剪贴板中写入数据，看来问题回到了最开始调用他们的 `2.js` 中，难道是简书出现了内鬼？我黑我自己？我们来分析 `2.js`

这个脚本没有混淆字符串，直接搜索链接就可以搜索出很多可以的网址。直接搜索 `//(.+?\.)+.+?/` 这个正则表达式。

* showTui: `//yun_lvehaisen_com/h5-mami/msdk/tmk.js`
* jumpTui: `https://engine_seefarger_com/index/activity?appKey=44oLpJM9AkUsZMnyoGDaEZQfADeo&adslotId=296981`
* clickShengyao: `https://cm_bilibili_com/mgk/page/284698023573377024/`
* insertGT: `https://ad_lflucky_com/janes/js/jans.js`
* goZhangxin: `http://newspool_zhangxinzhixun_com/waifangsspgrlm/s1/index.html?appKey=7271ef91d1d5113`
* insertAMC: `https://ox86_xu7b_com/m301650.js`
* fetchSoHoAd: `//statics_itc_cn/aap/prod/js/1.0.0/sohu_aap.js`
* `.gu-pao-ad`: `https://www_jianshu_com/p/428251ede1aa`

好多广告，包括最后一个站内链接也是广告，接广告没啥问题，主要是某些广告平台的跳转页面令人恶心，谁知道什么时候会下载一个病毒或流氓软件，感觉太不靠谱了。

#### 关于浏览器检测

##### jans

比如那个向剪贴板写入淘口令的就是 `https://ad_lflucky_com/janes/js/jans.js`。这么多淘口令，一天两个，不带重样的。

![](https://attach.52pojie.cn/forum/201912/09/061840qb0qbgon6qk6y4rb.png)

这个脚本里面也有用户隐私统计。不过值得注意的是，他甚至根据各种浏览器的特性（例如：电脑端不支持这个 UA 不可能拥有这个功能），判断出哪些浏览器信息是经过伪造的，然后上报这些伪造数据。

例如我用 PC 版 Chrome 模拟 Android Chrome 时，就会是下面这样的结果

```
navigator.platform
"Win32"
navigator.userAgent
"Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Mobile Safari/537.36"
```

统计脚本发现 `platform` 为 `Win32` 而 UA 中写的却是 Linux，则他会认为我是假的 OS，新建了一个 iframe，链接为 `https://ad_lflucky_com/janes/fk.html?fk=fakeOS`，这个 iframe 的内容很简单，就是一个 cnzz 的统计脚本。

> 这个想法很有意思，把 cnzz 当做一个计数器，自己都不需要动态的服务器，只需要部署静态文件就可以进行数据统计了。

此外他还会利用各种特性检测假浏览器、假信息、假语言、假分辨率。例如：

* `navigator.productSub` 在 IE 上时 `undefined`，在 Safari 类浏览器下为 `20030107`
* `eval.toString().length` 在不同浏览器上不同
* `object.toSource()` 仅在 Firefox 类浏览器上受支持。
* `screen.height` 不能比 `screen.availHeight` 小，因为前者是屏幕高度，后者是去除任务栏后的浏览器窗口可用的高度。

#### 远程调试

我其实很好奇为什么电脑端没有触发跳转到下载浏览器 apk 那个广告，我怀疑能是脚本对浏览器真伪进行了检测，只有真正的安卓端才会弹。

绕过方式也不难。Chrome 支持远程调试，我可以拿一台 Android 真机来运行 Chrome，这样就可以避免所有的检测。

##### 开启调试

接上 USB 线，打开开发者选项，打开 USB 调试。

![](https://attach.52pojie.cn/forum/201912/09/061843cv3hmy3wz06hqvim.png)

打开 [chrome://inspect](https://www.52pojie.cn/chrome%3A/inspect)

![](https://attach.52pojie.cn/forum/201912/09/061845dpprsklhzojhakoz.png)

正常的话直接点 `inspect` 就可以了。这里有个问题，如果无法访问 Google 的话，不能正常使用这个 inspect，Chrome 提供了一种备选方案，当 PC 端 Chrome 版本低于 Android Chrome 时，`inspect fallback` 会出现，我需要用些小技巧让他强制出现。

在这个页面打开 F12 开发者工具，在 Sources 中找到 Overrides，启用，然后选择一个本地文件夹保存文件（例如：我选择的是 `D:\Temp\chrome-local-override`）。

![](https://attach.52pojie.cn/forum/201912/09/061847c12m2errrqzvpnev.png)

切换到 Page，找到 `inspect.js`，搜索 `fallback`，找到这两行注释掉，然后 `Ctrl + S` 保存。你会发现文件图标上多了一个紫色的小点。

![](https://attach.52pojie.cn/forum/201912/09/061850e6fqny3z8639nrgn.png)

刷新页面，就会显示 inspect fallback 功能了。（Local Override 只会在开着 DevTools 时启用，关闭开发者工具之后，就会取消文件替换功能。）

![](https://attach.52pojie.cn/forum/201912/09/061852n4hmfx7zxyhdxy99.png)

##### 调试

![](https://attach.52pojie.cn/forum/201912/09/061854kgkgh5gui5ssgize.png)

看到这个加载记录，我们可以明确了 `m301650.js -> a.js -> d.js -> p7090z.html` 这一个过程了，

其中可以看到一堆 `d.js` 的加载，仔细看看都是 302 重定向。点开看详情，全都是各种 App 的跳转（网址域名中的点 `.` 已经替换成下划线 `_`）

```
openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://u_jd_com/UKBirM","keplerID":"0","keplerFrom":"1","kepler_param":{"source":"kepler-open","otherData":{"mopenbp7":"0"},"channel":"cedad4c0ad02455c9a818f1b3d98da1a"},"union_open":"union_cps"}

https://878928_xyz/2019llq_5/m.878928.xyz/7090.html

openapp.jdmobile://virtual?params={"category":"jump","des":"m","url":"https://u_jd_com/M7fTMi","keplerID":"0","keplerFrom":"1","kepler_param":{"source":"kepler-open","otherData":{"mopenbp7":"0"},"channel":"2de699902eec4131927c7b68871512b3"},"union_open":"union_cps"}

vipshop://goHome?tra_from=tra%3AC01V4m36ysoz00q7%3A%3Amig_code%3A1xx1%3Aac013b3kbkgv6tsf9mhia46zu7m1fufx

tbopen://m_taobao_com/tbopen/index.html?source=auto&action=ali.open.nav&module=h5&bootImage=0&spm=2014.ugdhh.2200612145320.219258-1604-32768&bc_fl_src=growth_dhh_2200612145320_219258-1604-32768&materialid=219258&h5Url=https%3A%2F%2Fh5.m.taobao.com%2Fbcec%2Fdahanghai-jump.html%3Fspm%3D2014.ugdhh.2200612145320.219258-1604-32768%26bc_fl_src%3Dgrowth_dhh_2200612145320_219258-1604-32768

tbopen://m_taobao_com/tbopen/index.html?source=auto&action=ali.open.nav&module=h5&bootImage=0&spm=2014.ugdhh.2200612145320.219272-1604-32768&bc_fl_src=growth_dhh_2200612145320_219272-1604-32768&materialid=219272&h5Url=https%3A%2F%2Fh5.m.taobao.com%2Fbcec%2Fdahanghai-jump.html%3Fspm%3D2014.ugdhh.2200612145320.219272-1604-32768%26bc_fl_src%3Dgrowth_dhh_2200612145320_219272-1604-32768

newsapp://startup/doc/EVLBFM6D0001899O?s=jixinkeji&spsug=ug&spsugdate=0&spsugextend=jixinkeji07

uclink://www_uc_cn/cc77796ca7c25dff9607d31b29effc07?action=open_url&src_pkg=sxmhx&src_ch=sxmhx133&src_scene=pullup&url=ext%3Ainfo_flow_open_channel%3Ach_id%3D100%26insert_item_ids%3D4556851981770947449%26type%3Dmultiple%26from%3D6001

uclink://www_uc_cn/cc77796ca7c25dff9607d31b29effc07?action=open_url&src_pkg=sxmhx&src_ch=sxmhx134&src_scene=pullup&url=ext%3Ainfo_flow_open_channel%3Ach_id%3D100%26insert_item_ids%3D4556851981770947449%26type%3Dmultiple%26from%3D6001
```

这里面的第二个就是那个恶意软件的页面，PC 版 Chrome 打开直接提示危险网页。

![](https://attach.52pojie.cn/forum/201912/09/061857hs2nj7xgsly92722.png)

不知道为什么，这些链接都没有成功打开。可能因为跳转到新页面，直接把 Pending 的 Response 都 Cancel 了。

##### 分析跳转流程

他们似乎对 IP 有检测，我再次访问这个链接时，并没有关于刚才那些链接的代码。

```
https://ewn_hfqxjx_cn/ms/a.js?b=200473!301650!88!640!150!200&u=5!8.1.0!3!1!bWltYXgz!8!78.0.3904.96!1&c=1!2!Y2VsbHVsYXI%3D!3!8!7!24!786!393!0!5!0!x!3!bGludXhhcm12OGw%3D!1!1!1!0!0!1!1!x!d3d3LmppYW5zaHUuY29t!1!1!1!UXVhbGNvbW1%2BQWRyZW5vKFRNKTUxMg%3D%3D!13!1!1!1!33!62!-1!-1!2276550266&f=90265
```

似乎重新换一个 IP 有用，并且也可能跟时间有关，可能是每 1 个小时刷新某些东西（这里不确定）。

![](https://attach.52pojie.cn/forum/201912/09/061900osn2d22ysszs9ss6.png)

这个 `a.js` 是动态生成的，里面的广告图片链接每次刷新都会变，跳转到恶意下载的那部分代码，通常时候是没有的，换 IP 之后会出现 1 次。

这个跳转流程并不复杂，就是根据 `d.js` URL 中的 `n=1157258&a=125977` 这个参数使用 `location.href` 跳转到各个不同的 URL。具体可以看上面的代码图片（或 `./samples/a.v2.js`）。

里面这个 `https://nw44_zmlled_cn/js/mob/sjas.js` 脚本又通过 iframe 引入了另外一个页面 `https://dqj77_bkyhq_cn/js/tmp/ImgTj.html`，这个页面包含大量 img 标签，可能都是用来进行访问统计的，真的恐怖，有必要搞这么多吗？

![](https://attach.52pojie.cn/forum/201912/09/061902ovvzvgn72rdnoenb.png)

##### 分析 URL 参数

我们可以具体明确一下 URL 中的那些参数都是哪些浏览器数据。生成这些数据的代码都在 `m301650.js`（因为 `a.js` 是从 `m301650.js` 发起的）。

```
b=200473!301650!88!640!150!200&u=5!8.1.0!3!1!bWltYXgz!8!78.0.3904.96!1&c=1!2!Y2VsbHVsYXI%3D!3!8!7!24!786!393!0!5!0!x!3!bGludXhhcm12OGw%3D!1!1!1!0!0!1!1!x!d3d3LmppYW5zaHUuY29t!1!1!1!UXVhbGNvbW1%2BQWRyZW5vKFRNKTUxMg%3D%3D!13!1!1!1!33!62!-1!-1!2276550266
```

`b=200473!301650!88!640!150!200` 是固定值，然后后面分为 `u` `c` `f` 三部分，`f` 是一个随机数。

我的浏览器 User Agent 是 `Mozilla/5.0 (Linux; Android 8.1.0; MI MAX 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.96 Mobile Safari/537.36` 你可以找到这些数据。

###### u

| 值 | 原始内容 | 说明 |
| --- | --- | --- |
| 5 |  | Windows = 1, Mac OS = 2, Linux, 模拟器 = 4, Android = 5 |
| 8.1.0 |  | 系统版本 |
| 3 |  | UA 包含 `mi` = 3 |
| 1 |  | 手机 = 1, 平板 = 2, iPod = 3, 模拟器 = 4, 桌面 = 5 |
| bWltYXgz | mimax3 | 设备制造商 |
| 8 |  | 浏览器种类：Safari = 1, AppleWebKit = 2, MSIE = 3, IEMobile 或 Windows CE 或 Windows Phone 或 WP7 = 4, Opera = 5, Namoroka = 5, Shiretoko = 5, Firefox = 6, Minefield = 6, Netscape = 7, Chrome = 8, chromeframe = 9, UCWEB = 10, QQBrowser 或 MQQBrowser = 11, 360EE = 12, MicroMessenger = 13, QQ = 14, 华为手机或其他 = 15, miuibrowser = 16, oppobrowser = 17, baiduboxapp = 18 |
| 78.0.3904.96 |  | 浏览器版本 |
| 1 |  | 渲染引擎：WebKit 或 AppleWebKit = 1, KHTML = 2, Gecko = 3, Presto = 4, Trident = 5 |

###### c

| 值 | 原始内容 | 说明 |
| --- | --- | --- |
| 1 |  | `document.cookieEnabled` 启用 Cookie = 1, 不启用 = 0, 获取出错 = -1 |
| 2 |  | `navigator.connection` 网络类型：Wi-Fi = 2, 移动网络 = 1, 其他 = 0 |
| Y2VsbHVsYXI%3D | cellular | `navigator.connection.type` 详细网络类型（Wi-Fi 或蜂窝网络 2G、3G、4G，未知 = x） |
| 3 |  | `history.length` 访问历史长度 |
| 8 |  | `navigator.hardwareConcurrency` CPU 线程数 |
| 7 |  | 如果 Cookie 有 `kwashhhhnrfr` 则直接返回，否则判断 Referer：未知 = 1, baidu.com = 2, .google. = 3, sogou.com = 4, so.com = 5, m.sm.cn = 6, bing.com = 7, 本站 = 8, 然后再将这些写入 Cookie |
| 24 |  | `screen.colorDepth` 色彩深度 |
| 786 |  | `screen.width` 屏幕的长边像素 |
| 393 |  | `screen.height` 屏幕的短边像素 |
| 0 |  | `window !== top` 是否被嵌入：被嵌入 = 1, 顶级页面 = 0 |
| 5 |  | `navigator.userAgent` 操作系统类型：windows = 1, mac = 2, linux = 3, iphone 或 ipad = 4, android = 5, windows phone = 6 |
| 0 |  | `navigator.oscpu` 操作系统和 CPU 类型：win = 1, mac = 2, linux = 3, 其他 = 11 |
| x |  | `navigator.oscpu` 具体值，没有 = x |
| 3 |  | `navigator.platform` 平台类型：win = 1, mac = 2, linux = 3, android = 3, pike = 3, ipad 或 ipod 或 iphone = 4, 其他 = 12, 如果不支持 `navigator.plugins` 并且 UA 不是 Windows 或 Windows Phone = 13 |
| bGludXhhcm12OGw%3D | `linuxarmv8l` | `navigator.platform` |
| 1 |  | `navigator.maxTouchPoints` 最大触摸点数 |
| 1 |  | 45 分钟新访客：在 Cookie 中设置一个 `kwashhhhuuxs` 记录从本周周一 0 点开始到现在的分钟数，如果不存在返回 1，超过 45 分钟再次访问或无法解析返回 2，否则返回 0 |
| 1 |  | 今日新访客：如果 Cookie `kwashhhhuuxx` 存在则返回 0，不存在设为 12 过期时间设为明天 0 点，返回 1 |
| 0 |  | 距离上次访问过去天数，使用 `kwashhhhudd` 记录 `访问时间 / 86400 * 86400,今年访问天数`，计算得出 |
| 0 |  | 今年访问天数，如果上两行的今日新访客为 1 则今年访问天数 + 1 |
| 1 |  | 1 |
| 1 |  | PV: 对当前 `location.href` 进行 Hash，然后在 Cookie 中记录访问次数 |
| x |  | x |
| d3d3LmppYW5zaHUuY29t | www.jianshu.com | `document.domain`，如果没有则用 `obj.referrer` 中的 host |
| 1 |  | `window.localStorage` 可用 |
| 1 |  | `window.sessionStorage` 可用 |
| 1 |  | `window.indexedDB` 可用 |
| UXVhbGNvbW1%2BQWRyZW5vKFRNKTUxMg%3D%3D | Qualcomm~Adreno(TM)512 | WEBGL\_debug\_renderer\_info `gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) + "~" + gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)` |
| 13 |  | `document.getElementsByTagName("script").length` |
| 1 |  | `navigator.maxTouchPoints` 最大触摸点数 |
| 1 |  | `document.createEvent("TouchEvent")` 是否支持触摸事件 |
| 1 |  | `"ontouchstart" in window` |
| 33 |  | `document.title.length`      标题长度 |
| 62 |  | `document.getElementsByTagName("div").length`  div 个数 |
| -1 |  | `document.getElementById('kwashhhh').offsetLeft` 嵌入的 div 被排版在什么位置 |
| -1 |  | `document.getElementById('kwashhhh').offsetTop` |
| 2276550266 |  | 由各种浏览器参数组成的 Hash，包括：localStorage sessionStorage indexedDB WEBGL\_debug\_renderer\_info `navigator.maxTouchPoints` `document.createEvent("TouchEvent")` `"ontouchstart" in window` oscpu platform userAgent `navigator.language` colorDepth 屏幕宽高 `document.body.addBehavior` openDatabase IE ActiveXObject `navigator.plugins` Canvas Fingerprint |

### 为什么会出现这种问题

引入未经验证的其他域的脚本

本案例中其他域的脚本不在自己网站的可控范围内，不论其是否可信，都应该尝试进行监控，避免对网站用户带来不必要的损失。

不知道法律上怎么判，但是假如用户通过简书页面加载的广告下载到了恶意 App，并造成了财产损失，简书肯定要承担责任，看就是看有没有人故意搞简书了。

只要使用 script 标签加载了其他域的脚本，当前网页就很难受你自己的控制了，他可以进行任何可能的操作，包括覆盖当前网页已有的比如 jQuery 库，甚至假如你的代码隔离不够，把某个 XHR 库暴露给全局了，他就可能拦截你所有的请求数据。

所以这种广告 SDK 尽量通过 CORS 跨域执行 XHR 请求，也不要盲目的使用 `<script>` 或 jsonp 加载不可控来源的脚本。

### 前端开发者如何预防这种问题

这里讲的是如何预防，而不是如何解决。解决掉这个问题的方法只能是把所有依赖的 package 或 SDK 亲自过一遍。

JavaScript 不支持反射，你没法在运行时对其他代码进行检测。（当然，幸亏他不支持反射，否则你的完美隔离的代码和数据也可以被外来脚本获取到了）

所以这里只讲如何预防，预防的方法很简单，但是处理起来很麻烦。

#### CSP (Content Security Policy 内容安全策略)

在 HTTP 返回头或 `<meta>` 中添加 `Content-Security-Policy`，即可限制资源来源，具体请参考 [Content Security Policy (CSP) - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)。

处理完之后，在较新的浏览器中访问你的网页时，任何外部脚本攻击均不能执行。这些请求头让浏览器仅加载受控域名下的资源，任何企图使用来自其他域名的资源的操作都会直接报错。禁止加载来自未知域名的 JS 脚本，禁止使用未知域名的 CSS 样式文件，禁止使用未知域名的图片，甚至也禁止未知域名的内嵌 iframe，以及被其他域名以 iframe 形式引入。

优点是，你所有的东西都来自自己可控的域名下，缺点是你必须把所有你有的域名都列出来，包括执行内嵌代码都需要显示指出。

##### 来自 MDN 的示例

一个网站管理者允许网页应用的用户在他们自己的内容中包含来自任何源的图片，但是限制音频或视频需从信任的资源提供者 (获得)，所有脚本必须从特定主机服务器获取可信的代码.

```
Content-Security-Policy: default-src 'self'; img-src *; media-src media1.com media2.com; script-src userscripts.example.com
```

在这里，各种内容默认仅允许从文档所在的源获取，但存在如下例外:

图片可以从任何地方加载 (注意 "\*" 通配符)。
多媒体文件仅允许从 media1.com 和 media2.com 加载 (不允许从这些站点的子域名)。
可运行脚本仅允许来自于 userscripts.example.com。

#### 其他

此外还有很多可用的安全选项。例如可以启用 HSTS 强制使用 HTTPS。声明 Cookie 为 HttpOnly 禁止 js 中获取 Cookie 内容。不过这些是防劫持用的而不是防止外部脚本的。

### 其他相关的思考与感想

#### 简书x百度

另外也不知道简书跟百度有什么交易，一个页面竟然加载了好几百个百度的资源。

![](https://attach.52pojie.cn/forum/201912/09/061906qnwekebkoeeanfie.gif)

#### 概率性 Bug

概率性的 Bug 往往让人捉摸不透。作为一名程序员，改 Bug 也是常有的事情，碰到那些无法复现的 Bug 极为头疼，不过这个问题真的没有什么好的调试办法，只能不断的调试找到代码中可能有错误的位置。

不过换个方向思考一下，如果这不是一个 Bug，而是一个故意设的陷阱呢？部分游戏反外挂使用概率性封号、延迟封号的方法，让外挂制作者不知道到底是哪个功能过检测失败了。也有一种“蜜罐”方法，正常玩家不可能执行到“蜜罐”中的方法，而外挂制作者可以看到这部分代码，好好组织代码结构，让他我以为这段代码有用，可实际上一旦这段代码被执行到了，他会向服务器报告这个人使用了外挂。

本例中，目标网站的脚本是动态生成的，必须换 IP 才能抓到 1 次，这篇文章前前后后花了大约 2 周零零散散的时间。真的直到我发这篇文章的前一天我才真正抓到那个恶意跳转的脚本。

这种概率性 Bug 真的很麻烦。比如各种游戏的抽卡，如果玩家想要测试卡池概率有没有问题，只能大量花钱，靠频率接近概率的方式测试。

#### Webpack

Webpack 通过 bundle 的方式增加了网页的加载效率，但是这种打包容易让一些毫无用处的代码一起加入发布的版本中，不过这些都没有隐藏恶意代码这个问题严重。应该不会有人去查看 bundle 的代码吧，最多利用 map 文件看看引入了哪些文件。没有 webpack 时我们很明确我们依赖了哪些 js 文件，但有了 webpack，我们没有再专注于代码安全，接入广告商的 SDK 直接打包进 bundle 了，甚至都不知道其中有恶意代码。

### 总结

简书移动端页面会加载一堆 webpack bundle 其中的 `2.js` 包含广告功能，其中一个广告功能的代码加载了一个外部脚本。这个外部脚本是动态生成的，他会判断访问者的 IP，同 IP 每天第一次访问会跳转到恶意下载页面，之后不会再跳转。这个广告还接入了大量统计平台，加载一次页面就有好几百的请求。还另外一个广告也引入了外部代码，其中嵌入了向剪贴板中写入淘口令的指令。

本文分析了恶意代码对外的表现，基本弄清简书接入的广告的问题，主要目的还是学习和分享各种 JavaScript 动态调试技能。

希望简书尽快解决这个问题吧。（会不会简书内部已知，并且默许呢？）

### 相关链接

* [Navigator.productSub - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/productSub)
* [Cross-Origin Resource Sharing (CORS) - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
* [Access-Control-Allow-Origin - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin)
* [Content Security Policy (CSP) - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
* [Content-Security-Policy - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)
* [Strict-Transport-Security - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
* [HTTP cookies - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)

### 附件

![](https://static.52pojie.cn/static/image/filetype/zip.gif)

[jianshu-hijacking.7z](https://www.52pojie.cn/forum.php?mod=attachment&aid=MTczNzIwMnw5MDg0MTNiOXwxNzkwMTY4ODMwfDIzMjM3Mjd8MTA3MDMwMA%3D%3D)
*(426.69 KB, 下载次数: 175)*

> 最后，我自己经常说的一句话：所有能插入中间操作的代码都可以被调试破解。
