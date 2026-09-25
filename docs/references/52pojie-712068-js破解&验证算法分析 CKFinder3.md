# js破解&验证算法分析: CKFinder3

> **作者**: Ganlv | **发布时间**: 2018-03-17 17:46:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 44803 / 151
> **原文**: [https://www.52pojie.cn/thread-712068-1-1.html](https://www.52pojie.cn/thread-712068-1-1.html)

---

[ 本帖最后由 Ganlv 于 2018-3-26 16:24 编辑 ]\n\n[ 本帖最后由 Ganlv 于 2018-3-26 16:22 编辑 ]\n\n

这篇文章以 JavaScript 为例讲解了破解的一些通用方法。

> 你甚至可以将本文章作为学习 Chrome DevTools 的教学文章。

### 样本

官方网站：<https://ckeditor.com/ckeditor-4/ckfinder/>

本次样本：[CKFinder 3.4.2（PHP版）](https://download.cksource.com/CKFinder/CKFinder%20for%20PHP/3.4.2/ckfinder_php_3.4.2.zip)

#### 破解目的

[下载页面](https://ckeditor.com/ckeditor-4/download/#ckfinder)

> All downloads are full versions with just a few features locked. Use your license key to unlock complete CKFinder functionality, with no need to download a separate package. Try it for a limited period of time and buy it when you are ready. We prepared easy licensing options for your development purposes.
>
> 所有下载都是完整版，只有少数功能被锁定。使用您的许可证密钥解锁完整的CKFinder功能，无需下载单独的软件包。尝试一段有限的时间，并在准备就绪时购买。 我们为您的开发目的准备了简单的许可选项。

上面说了，下载到的这个文件是完整版本，只是有一些功能被锁定了。当然自己使用的话完全没什么影响，给别人的话有些麻烦。

其实没什么锁定，就是上面会有一个 Demo 的字样，每 5 分钟会弹出 Demo 版提示框，其他功能都是全的。（破解完我才发现 Demo 版不能删除文件）

[CKFinder 许可协议（CKFinder License Agreement）](https://ckeditor.com/sales/license/ckfinder)

> Unlicensed Copies
>
> If You did not pay the License Fee, You may use unlicensed copies of the Software for the exclusive purpose of demonstration. In this case You will be using the Software in “demo mode”. Without derogating from the forgoing, You may not use the Software in “demo mode” for any of your business purposes. The Software in “demo mode” shall only be used for evaluation purposes and may not be used or disclosed for any other purposes, including, without limitation, for external distribution. You may not remove the demo notices, if any, from the user interface of the Software nor disable the ability to display such notices nor otherwise modify the Software. Product support, if any, is not offered for the Software in “demo mode”.
>
> 未经许可的副本
>
> 如果您没有支付许可证费用，您可以仅以演示目的使用本软件的未经许可副本。在这种情况下，您将以“演示模式”使用本软件。 在不违背上述规定的前提下，您不得以任何商业目的在“演示模式”下使用本软件。“演示模式”中的软件仅用于评估目的，不得用于任何其他目的，包括但不限于外部分发。 您不能从软件的用户界面中删除演示提示（如有），也不能禁用显示此类通知或修改软件的功能。产品支持（如果有的话）不以提供给“演示模式”软件。

本教程仅供学习交流使用，请勿用于其他用途。

### 过程

#### 运行软件

在代码的根目录下执行

```
php -S 127.0.0.1:8000
```

开启 php 内置服务器，然后访问 <http://127.0.0.1:8000/ckfinder.html> 即可。

![](https://attach.52pojie.cn/forum/201803/17/174235hxoqpx4w3kfkjp4n.jpg)

#### 如何填写许可证信息？

在 `config.php` 中有以下内容

```
$config['licenseName'] = '';
$config['licenseKey']  = '';
```

然后我们就使用 PHPStorm 强大的全局搜索功能吧。

![](https://attach.52pojie.cn/forum/201803/17/174236ovioogivbvzozbob.jpg)

![](https://attach.52pojie.cn/forum/201803/17/174236qv998mb8icvez0nn.jpg)

我们会发现，`./src/CKSource/CKFinder/Command/Init.php` 中有一写相关代码，然后就下断点分析一下原理吧。

#### 分析 php 部分

> 这里调试 php 需要 `xdebug` 的支持，安装 xdebug 步骤请参照 [官方文档](https://xdebug.org)，这里不作具体介绍。

```
$ln = '';
$lc = str_replace('-', '', ($config->get('licenseKey') ?: $config->get('LicenseKey')) . '                                  ');
$pos = strpos(CKFinder::CHARS, $lc[2]) % 5;

if ($pos == 1 || $pos == 2) {
    $ln = $config->get('licenseName') ?: $config->get('LicenseName');
}

$datacommandObject = $ln;
$data->c = trim($lc[1] . $lc[8] . $lc[17] . $lc[22] . $lc[3] . $lc[13] . $lc[11] . $lc[20] . $lc[5] . $lc[24] . $lc[27]);
// 此处省略其他代码
return $data;
```

似乎并没有什么有用的信息，就是把 `licenseKey` 和 `licenseName` 转换了一下，然后就返回给浏览器了。

#### 分析 js 与 php 交互

我们发现，php 断点停住以后，Chrome 开发者工具 Network 选项卡中有一个请求的状态一直处于 `pending` 状态。

![](https://attach.52pojie.cn/forum/201803/17/174237mz88zamj1znnhwaw.jpg)

我们直接跟踪到 XmlHttpRequest 的调用点。

![](https://attach.52pojie.cn/forum/201803/17/174237eerzpz46pa6rtm42.jpg)

下个断点？先格式化代码再说吧。

#### 代码格式化

这一步没什么多说的，什么工具都可以，在 Chrome 开发者工具中打开 Source 标签，点击左下角的 `{}` 按钮，然后再复制粘贴到 `ckfinder.js` 中就行了。一般来说这样 uglify 的代码应该不会有文件校验吧。

#### 解码

我们看到代码中有很多的 `S('...')` 的东西，我猜是字符串解码函数，应该是作者为了避免字符串搜索。

直接在断点停住时在 Chrome 控制台中把那个表达式粘贴上，执行一次试试。解码成功了，看样子不算太麻烦。

![](https://attach.52pojie.cn/forum/201803/17/174238igjuaju5rsig5b3g.jpg)

> Chrome 断点停住时，控制台的上下文是断点语句处的上下文，可以访问局部变量，所以断点处调用了 `S('...')` 的语句，你在控制台执行的话，`S` 函数也一定存在。

#### 自动解码

因为 JavaScript 的字符串太特殊了，使用字符串匹配的话很麻烦，我这里选择分析 AST（抽象语法树），针对 AST 进行替换。

首先安装 `acorn` 语法分析器和 `escodegen` 代码构造器，一个用来从代码生成 AST，一个用来把 AST 转换回代码。

```
npm install acorn escodegen
```

下面是我写的替换代码，判断了一下字符串和三元运算符

```
const acorn = require('acorn');
const walk = require('acorn/dist/walk');
const escodegen = require('escodegen');
const fs = require('fs');
const path = require('path');

function S(e) {
    for (var t = '', n = e.charCodeAt(0), i = 1; i < e.length; ++i)
        t += String.fromCharCode(e.charCodeAt(i) ^ i + n & 127);
    return t;
}

function recursiveDecode(node) {
    if (node.type === 'Literal') {
        node.value = S(node.value);
        // console.log(node.value);
    } else if (node.type === 'ConditionalExpression') {
        recursiveDecode(node.consequent);
        recursiveDecode(node.alternate);
    } else {
        console.log('Node type is neither Literal nor ConditionalExpression. ' + node.start);
    }
}

// 这里改成你的代码位置
var inputFile = path.join(__dirname, 'ckfinder/ckfinder.min.js');
var outputFile = path.join(__dirname, 'ckfinder/ckfinder.js');

fs.readFile(inputFile, {encoding: 'utf-8'}, function (err, data) {
    if (err) {
        console.log(err);
        return;
    }
    var ast = acorn.parse(data);
    walk.simple(ast, {
        CallExpression: function (node) {
            if (node.callee.type === 'Identifier' && node.callee.name === 'S' && node.arguments.length === 1) {
                var arg0 = node.arguments[0];
                recursiveDecode(arg0);
                if (arg0.type === 'Literal') {
                    node.type = arg0.type;
                    node.value = arg0.value;
                } else if (arg0.type === 'ConditionalExpression') {
                    node.type = arg0.type;
                    node.test = arg0.test;
                    node.consequent = arg0.consequent;
                    node.alternate = arg0.alternate;
                }
            }
        }
    });
    var code = escodegen.generate(ast);
    fs.writeFile(outputFile, code, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log('The file was saved!');
    });
});
```

使用方法

```
node decode_ckfinder.js
```

##### 分析过程

我们用 PHPStorm 打开 `ckfinder.js`，使用 PHPStorm 的代码定位直接找到 `S` 函数。

![](https://attach.52pojie.cn/forum/201803/17/174238f3k3cnhbj4ccbvh4.jpg)

然后我们就找到了解码方法，这段代码已经嵌入我的解码代码中了。

```
function S(e) {
    for (var t = "", n = e.charCodeAt(0), i = 1; i < e.length; ++i)
        t += String.fromCharCode(e.charCodeAt(i) ^ i + n & 127);
    return t
}
```

##### 运行结果

```
var CKFinder = function () {
    function __internalInit(e) {
        return e = e || {}, e['demoMessage'] = 'This is a demo version of CKFinder 3', e['hello'] = 'Hello fellow cracker! We are really sad that you are trying to crack our application - we put lots of effort to create it. ' + 'Would you like to get a free CKFinder license? Feel free to submit your translation! http://docs.cksource.com/ckfinder3/#!/guide/dev_translations', e['isDemo'] = !0, e;
    }
// 后面省略了
```

哈哈，作者发现我们破解了他的软件了。

> 你好，你们这些破解者！我们真的很伤心，您正试图破解我们的应用程序——我们付出了很多努力来创建它。你想获得免费的 CKFinder 许可证吗？放心地提交您的翻译！<http://docs.cksource.com/ckfinder3/#!/guide/dev_translations>

其实很多软件作者挺有意思的。这可能是最简单的暗桩吧，就是一个提醒字符串。

#### 继续分析 js

`This is a demo version of CKFinder 3` 这句话就是我们要找的。

后面还有一句 `e['isDemo'] = !0`，就是 `e['isDemo'] = true`，莫非我改成 `false` 就 OK 了？

在 Chrome 中下个断点，看看什么情况。

根本就没断下来，看来作者跟我们开了个玩笑。不过想想也对，怎么能这么容易就让你破解了呢。

#### 尝试 DOM 断点

现在我们的线索断了，不过我们有个笨方法。在 XHR 的调用点断下之后，下 DOM 断点（当 DOM 节点修改的时候会断下），然后运行，直到插入的 node 就是那个 `This is a demo version of CKFinder 3` 的标题的时候，我们再继续分析。

![](https://attach.52pojie.cn/forum/201803/17/174239ajjhavj6qz16jqoz.jpg)

这个过程可能比较枯燥，就是不断的继续运行，继续运行，直到那个被添加的 node 是 h2 的时候。

![](https://attach.52pojie.cn/forum/201803/17/174239iogrugjngin9gnd0.jpg)

非常抱歉，我没找到......

#### 新的想法？

为什么我们不能直接搜索到 `This is a demo version of CKFinder 3` 呢？因为肯定是被加密了啊，那么我们直接找出所有乱码字符串就行了。

我在 `decode_ckfinder.js` 中加了一行 `console.log(node.value);`（就是上面注释掉的那一行） 这一行会打印所有的一次解码之后的字符串，然后我们就排查一下吧，反正才 6246 行，不到五分钟差不多就能看完。

还真让我找到了。

![](https://attach.52pojie.cn/forum/201803/17/174240mlw44dzl7tlmddd2.jpg)

![](https://attach.52pojie.cn/forum/201803/17/174240ch5sh53htt09ke9k.jpg)

![](https://attach.52pojie.cn/forum/201803/17/174240sa1zgp73njpg9ya1.jpg)

直接在代码中搜索其中一个字符串，定位到附近，下断点，执行一次。

![](https://attach.52pojie.cn/forum/201803/17/174241asc1wi96bb2306c6.jpg)

这个就是我们要找的了，断点之后单步运行，把这句话运行完，然后修改一下 `t['message']` 的值，看看效果。

![](https://attach.52pojie.cn/forum/201803/17/174241cdyzn0ze00xz54nq.jpg)

看来可行，然后我们就逆着调用栈找，找到判断语句。

![](https://attach.52pojie.cn/forum/201803/17/174242w6oymd3tyqthrm33.jpg)

#### 类比推理

![](https://attach.52pojie.cn/forum/201803/17/174242fjnz42se7eo5lzz7.jpg)

似乎，所有的加密都有 `String.fromCharCode`，我们直接搜索一下这个语句，应该就能找到所有的字符串加密，他们周围有其他验证的判断语句，直接 `if (false)` 掉。

> `if (false)` 这种方法在汇编语言里怎么表示？
>
> 一种方法是 `jnz` 变成 `jmp` 或 `nop`，另一种是 `jnz xxx` 变成 `jnz 00`。

#### 内存断点

上面这种方式好麻烦啊，我们还要猜原来作者是怎么想的。有没有方法直接在读取 `$data->c`（就是返回给 js 的那个许可证） 的时候断下来。

这个东西不就是内存断点嘛，只不过 Chrome 不支持（据说 Firefox 是支持的），不过 `StackOverflow` 上的朋友们已经给出了解决方案。

> 我是用 Bing 搜索 `chrome var changed breakpoint` 搜到的。

<https://stackoverflow.com/questions/11618278/how-to-break-on-property-change-in-chrome/38646109#38646109>

<https://github.com/paulirish/break-on-access>

![](https://attach.52pojie.cn/forum/201803/17/174243uzo8gs0saj1qq081.jpg)

在 `Source` `Snippets` `New snippet` 中粘贴下列代码，然后右键运行。（如果没有 `Snippets` 注意一下 `>>` 这个按钮）

```
function breakOn(obj, propertyName, mode, func) {
    // this is directly from https://github.com/paulmillr/es6-shim
    function getPropertyDescriptor(obj, name) {
        var property = Object.getOwnPropertyDescriptor(obj, name);
        var proto = Object.getPrototypeOf(obj);
        while (property === undefined && proto !== null) {
            property = Object.getOwnPropertyDescriptor(proto, name);
            proto = Object.getPrototypeOf(proto);
        }
        return property;
    }

    function verifyNotWritable() {
        if (mode !== 'read')
            throw "This property is not writable, so only possible mode is 'read'.";
    }

    var enabled = true;
    var originalProperty = getPropertyDescriptor(obj, propertyName);
    var newProperty = { enumerable: originalProperty.enumerable };

    // write
    if (originalProperty.set) {// accessor property
        newProperty.set = function(val) {
            if(enabled && (!func || func && func(val)))
                debugger;

            originalProperty.set.call(this, val);
        }
    } else if (originalProperty.writable) {// value property
        newProperty.set = function(val) {
            if(enabled && (!func || func && func(val)))
                debugger;

            originalProperty.value = val;
        }
    } else  {
        verifyNotWritable();
    }

    // read
    newProperty.get = function(val) {
          if(enabled && mode === 'read' && (!func || func && func(val)))
            debugger;

        return originalProperty.get ? originalProperty.get.call(this, val) : originalProperty.value;
    }

    Object.defineProperty(obj, propertyName, newProperty);

    return {
      disable: function() {
        enabled = false;
      },

      enable: function() {
        enabled = true;
      }
    };
};
```

> `debugger;` 这条语句可以让调试器直接断在这个位置处，配合数据绑定（给一个对象的属性设置 getter 和 setter），就可以做到内存断点了。然后在调用栈向上找一层，就是断点触发的位置了。
>
> 注意：断点断在数据修改之前。

![](https://attach.52pojie.cn/forum/201803/17/174243lmrwm0rp1spso01w.jpg)

在下方控制台执行

```
breakOn(o, 'c', read);
```

这样，任何代码在访问许可证秘钥信息的时候就会断下，然后在调用栈往上找一层就可以了。

#### 注​册 机

单步跟踪一下程序的流程就会找到验证函数，可以尝试分析一下算法，然后写一个注册机，这里暂时告一段落，毕竟能爆破何必注册。有兴趣的同学可以自己尝试做一个注册机。

![](https://attach.52pojie.cn/forum/201803/17/174244s3klckvj3jtjbb32.jpg)

![](https://attach.52pojie.cn/forum/201803/17/174244enwvjztvtp2155zk.jpg)

### 验证算法分析

然后，枯燥的东西就来了。我们借助 PHPStorm 强大的静态分析能力，我们可以追踪到全部与这个有关的代码，然后综合在一起分析一下验证算法。

这类加密算法在代码中有很多处，这里以页面上方的 `This is a demo version of CKFinder 3` 为例。

爆破非常简单，把 `if (!(u && a && d && l) || c)` 改成 `if (false)` 就行了，但是注册机的话，我们要研究明白这里的 `u a d l c` 都代表什么，怎么算。我们的目的就是，找到算法，使 `u a d l` 均为 `true`，使 `c` 为 `false`。

#### u

```
u = e(s.config.initConfigInfo.c, f(10));
```

这里的 `s.config.initConfigInfo.c` 来自后端传来的许可证。然后继续追查 `f`。

```
f = f || function(e) {
    return function(t) {
        return e.charCodeAt(t);
    };
}(o(s.config.initConfigInfo.c));
```

继续追查 `o`。

```
function o(e) {
    var t, n, i;
    for (i = '',
    t = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ',
    n = 0; n < e.length; n++)
        i += String.fromCharCode(t.indexOf(e[n]));
    return o = void 0,
    i;
}
```

这里的 `o` 似乎是个一次性函数，在 `return` 之前它把自己给变成了 `undefined`（就是 `void 0`），似乎为了隐藏什么东西。

编译之后的 js 全是各种奇怪的闭包，我们得好好分析一下。

`o` 的参数是后端传来的许可证，把许可证字符串的每一字节映射一下，比如输入许可证是 `'ABCD'`，就会返回 `'\u0009\u000a\u000b\u000c'`。

然后这个返回值被传给了生成 `f` 的一个闭包，`f` 的作用很简单，`charCodeAt` 与 `fromCharCode` 用途正好相反，`o` 的作用是 ASCII 码转字符，`f`的作用就是字符转 ASCII 码。比如 `f(10)` 就会返回许可证的第 `11` 个字符在 `'123456789ABCDEFGHJKLMNPQRSTUVWXYZ'` 中的位置。

> 注意：这里说 ASCII 只是针对英文来说的，准确的说，javascript 中 `charCodeAt` 与 `fromCharCode` 使用的是 Unicode 编码，在 0 - 127 的范围二者相同。

我们可以简化一下 `f`。

```
function f(t) {
    return '123456789ABCDEFGHJKLMNPQRSTUVWXYZ'.indexOf(s.config.initConfigInfo.c[t]);
}
```

然后继续研究 `e` 函数。

```
function e(e, t) {
    for (var n = 0, i = 0; i < 10; i++)
        n += e.charCodeAt(i);
    for (; n > 33; ) {
        var r = n.toString().split('');
        n = 0;
        for (var o = 0; o < r.length; o++)
            n += parseInt(r[o]);
    }
    return n === t;
}
```

参数 1 是许可证，参数 2 是刚刚分析的 `f(10)`。

`n` 为许可证前 10 个字符的 ASCII 码加和，然后把这个数字的每一位加和，再把结果每一位加和，直到结果小于 `33`，只要这个结果等于 `f(10)` 的话，返回值就是 `true`。

为什么是 `33` 呢？因为这个映射列表 `'123456789ABCDEFGHJKLMNPQRSTUVWXYZ'` 的长度是 `33`。

我们已经解决一个字符了，我们知道了第 11 位由前 10 位生成的算法了。

化简一下这个函数

```
function e(licenseKey, f10) {
    var tmp = 0;
    for (var i = 0; i < 10; i++) {
        tmp += licenseKey.charCodeAt(i);
    }
    while (tmp > 33) {
        var tmp1 = tmp.toString().split('');
        tmp = 0;
        for (var i = 0; i < tmp1.length; i++) {
            tmp += parseInt(tmp1[i]);
        }
    }
    return tmp === f10;
}
```

#### a

```
!function() {
    var e = f(4) - f(0);
    f(4) - f(0),
    0 > e && (e = f(4) - f(0) + 33),
    a = e < 4;
}()
```

分析一下

```
var e = (f(4) - f(0) < 0) ? (f(4) - f(0) + 33) : (f(4) - f(0));
a = e < 4;
```

再化简一下就是

```
a = (f(4) - f(0) + 33) % 33 < 4;
```

`%` 是求余数，前面加 33 是因为负数求余数并不会变成正数。

现在，我们知道了许可证第 5 位和第 1 位的约束关系，第 5 位必须在第 1 位之后的 4 个字符以内，比如第 1 位是 `A`，第 5 位必须是 `A B C D` 之一。

#### d

```
d = t(f(7), e(f(4), f(0)), s.config.initConfigInfo.s);
```

```
function e(e, t) {
    var n = e - t;
    return 0 > n && (n = e - t + 33),
    n;
}
```

化简一下

```
d = t(f(7), (f(4) - f(0) + 33) % 33, s.config.initConfigInfo.s);
```

分析 `t` 函数

```
function t(e, t, n) {
    var i = window.opener ? window.opener : window.top
        , r = 0
        , o = i['location']['hostname'].toLocaleLowerCase();
    if (0 === t) {
        var s = '^www\\.';
        o = o.replace(new RegExp(s), '');
    }
    if (1 === t && (o = ('.' + o.replace(new RegExp('^www\\.'), '')).search(new RegExp('\\.' + n + '$')) >= 0 && n),
    2 === t)
        return !0;
    for (var a = 0; a < o.length; a++)
        r += o.charCodeAt(a);
    return o === n && e === r + -33 * parseInt(r % 100 / 33, 10) - 100 * ('' + r / 100 >>> 0);
}
```

化简一下

```
function t(f7, f4_f0, licenseName) {
    var hostname = window.opener.location.hostname.toLocaleLowerCase();
    if (0 === f4_f0) {
        hostname = hostname.replace(new RegExp('^www\\.'), '');
    }
    if (1 === f4_f0) {
        hostname = hostname.replace(new RegExp('^www\\.'), '');
        if (('.' + hostname).search(new RegExp('\\.' + licenseName + '$')) >= 0) {
            hostname = licenseName;
        } else {
            hostname = false;
        }
    }
    if (2 === f4_f0) {
        return true;
    }
    var tmp = 0;
    for (var i = 0; i < licenseName.length; i++) {
        tmp += licenseName.charCodeAt(i);
    }
    return hostname === licenseName && f7 === tmp % 100 % 33;
}
```

很明显，这个是检查域名的。

* 如果 `f(4) - f(0) === 0` 则只会把最前面的 `www.` 去掉。
* 如果 `f(4) - f(0) === 1` 则会把最前面的 `www.` 去掉，然后检查是否以 `n` 结尾，不是则 `o = false`，是则 `o = n`，就是那个结尾。
* 如果 `f(4) - f(0) === 2` 直接返回 `true`，这个正合我们的想法。

然后如果 `f(4) - f(0) !== 2` 的话，计算替换完 `o` 的 ASCII 码加和，赋值给 `r`，把 `r` 的百位数去掉，然后取 `33` 的余数，如果这个等于 `f(7)` 则这一条符合。另一条是判断 `o === n`。两条同时符合则返回 `true`。

这里的第 8 位是受域名约束的，不过我们直接 `f(4) - f(0) === 2` 就好了。

#### l

```
function() {
    var e = f(5) - f(1);
    0 > e && (e = f(5) - f(1) + 33),
    l = e - 1 <= 0;
}()
```

没什么说的，我们已经很熟练了。

```
l = (f(5) - f(1) + 33) % 33 <= 1;
```

#### c

```
c = !e(f(8), f(9), f(0), f(1), f(2), f(3));
```

```
function e(e, n, i, r, o, s) {
    for (var a = window['Date'], l = 33, u = i, c = r, d = o, f = s, c = l + (u * f - c * d) % l, d = u = 0; d < l; d++)
        1 == c * d % l && (u = d);
    c = e,
    d = n;
    var h = 10000 * (225282658 ^ t.m);
    return f = new a(h),
    12 * ((u * s % l * c + u * (l + -1 * r) % l * d) % l) + ((u * (33 + -1 * o) - 33 * ('' + u * (l + -1 * o) / 33 >>> 0)) * c + u * i % 33 * d) % l - 1 >= 12 * (f['getFullYear']() % 2000) + f['getMonth']();
}
var t = {
    s: function(e) {
        for (var t = '', n = 0; n < e.length; ++n)
            t += String.fromCharCode(e.charCodeAt(n) ^ 255 & n);
        return t;
    },
    m: 92533269
};
```

看到 `Date` 了，这个肯定是限制日期的。

> 我们之前已经用到了 `f(0), f(1), f(4), f(5), f(7), f(10)`，加上这个验证的 `f(0), f(1), f(2), f(3), f(8), f(9)`，除了 `f(6)` 都用到了，看样子快结束。

先化简一下吧，化简这段算法可能需要点数学水平。

```
function e(f8, f9, f0, f1, f2, f3) {
    var c = 33 + (f0 * f3 - f1 * f2) % 33,
        u = 0;
    for (var d = 0; d < 33; d++)
        if (1 == c * d % 33) {
            u = d;
        }
    var _f1 = 33 - f1,
        _f2 = 33 - f2;
    return 12 * (
            (
                  u *  f3 % 33 * f8
                + u * _f1 % 33 * f9
            ) % 33
        ) + (
              u * _f2 % 33 * f8
            + u *  f0 % 33 * f9
        ) % 33
        >= 211;
}
```

化简完之后，发现这个其实不是限制日期的，而是一个同余问题的验证算法。或许是可解的，但是我比较笨，只能穷举了。（如何穷举后面会讲）

#### 还有 php 的部分

```
$ln = '';
$lc = str_replace('-', '', ($config->get('licenseKey') ?: $config->get('LicenseKey')) . '                                  ');
$pos = strpos(CKFinder::CHARS, $lc[2]) % 5;

if ($pos == 1 || $pos == 2) {
    $ln = $config->get('licenseName') ?: $config->get('LicenseName');
}

$data->s = $ln;
$data->c = trim($lc[1] . $lc[8] . $lc[17] . $lc[22] . $lc[3] . $lc[13] . $lc[11] . $lc[20] . $lc[5] . $lc[24] . $lc[27]);
?>
```

可以看到，php 代码并没有把全部的许可证信息都传递给浏览器，只传递了 `$lc` 的 `1, 8, 17, 22, 3, 13, 11, 20, 5, 24, 27` 这几位，另外检测了 `$lc[2]` 许可证域名类型。

也就是说这个证书至少 28 位，并且只有其中的一部分是有用的，`*???-*?**-?**?-*?**-*?**-?*?*-?**?` 这里面 `*` 表示任意字符，`?` 表示需要我们计算的地方。

#### 总结一下算法

php 反向转换函数

```
function lc(c) {
    var map = [1, 8, 17, 22, 3, 13, 11, 20, 5, 24, 27];
    var key = '*???-*?**-?**?-*?**-*?**-?*?*-?**?'.replace(/-/g, '').split('');
    for (var i = 0; i < map.length; ++i) {
        key[map[i]] = c[i];
    }
    var result = [];
    for (var i = 0; i < key.length; i += 4) {
        var result_part = '';
        for (var j = i; j < i + 4 && j < key.length; ++j) {
            result_part += key[j];
        }
        result.push(result_part);
    }
    return result.join('-');
}
```

基本转换函数

```
function c(f) {
    var map = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    var result = '';
    for (var i = 0; i < f.length; ++i) {
        result += map[f[i]];
    }
    return result;
}
```

`f10` 由 `f0 ~ f9` 生成

```
function f10(c) {
    var tmp = 0;
    for (var i = 0; i < 10; ++i) {
        tmp += c.charCodeAt(i);
    }
    while (tmp > 33) {
        var tmp1 = tmp.toString().split('');
        tmp = 0;
        for (var i = 0; i < tmp1.length; ++i) {
            tmp += parseInt(tmp1[i]);
        }
    }
    return tmp;
}
```

`f4` 与 `f0` 相关，分三种情况：

* 单域名许可证：`www.example.com` 和 `example.com` 可用
* 含通配符域名许可证：`*.example.com` 和 `example.com` 可用
* 不限制域名许可证：任意域名均可使用。
* 其实还有第四种，就是真正的单域名，完全匹配许可证：仅 `foo.example.com` 可用

单域名许可证

```
f4 = f0;
```

含通配符域名许可证

```
f4 = (f0 + 1) % 33; // 或 f0 = (f4 - 1 + 33) % 33;
```

不限制域名许可证

```
f4 = (f0 + 2) % 33; // 或 f0 = (f4 - 2 + 33) % 33;
```

完全匹配域名许可证

```
f4 = (f0 + 3) % 33; // 或 f0 = (f4 - 3 + 33) % 33;
```

如果是不限制域名许可证则不验证 `f7`，如果是单域名许可证或含通配符域名许可证，算法如下

```
function f7(licenseName) {
    var tmp = 0;
    for (var i = 0; i < licenseName.length; ++i) {
        tmp += licenseName.charCodeAt(i);
    }
    return tmp % 100 % 33;
}
```

然后是 `f5` 与 `f1` 的制约关系

```
f5 = f1;
// 或
f5 = (f1 + 1) % 33; // 或 f1 = (f5 - 1 + 33) % 33;
```

然后就是这个麻烦的算法，`f8, f9, f0, f1, f2, f3` 这些变量相互制约。这是一个六元一次同余不等式，没有常规方法解出所有组整数解，只有穷举法。还好，这六个变量都不会受到其他不等式的制约。

假设我们已经求出一组 `f0, f1, f2, f3, f8, f9`，由 `f0` 得到 `f4`，由 `f1` 得到 `f5`，由域名得到 `f7`，随机生成一个 `f6`，再由他们生成 `f10`，再由 `f` 函数反推出原始许可证的每一位。这就是我们生成许可证的算法。

#### 穷举法

现在就差这个穷举这个六元不等式了。不过看起来这个不等式的解是非常多的，任意给定一组 `f0, f1, f2, f3`，穷举 `f8, f9` 即可（这些数字的取值集合都是 `0 ~ 32` 的整数）。

这里提供一个穷举法的例子，只要 `f0, f1, f2, f3` 不取得过于极端（比如 `0, 0, 0, 0` 或 `1, 1, 2, 2`），基本上都有上百组 `f8, f9` 的解。

```
function f8f9(f0, f1, f2, f3) {
    var c = 33 + (f0 * f3 - f1 * f2) % 33;
    var u = 0;
    for (var i = 0; i < 33; ++i) {
        if (1 == c * i % 33) {
            u = i;
        }
    }
    var _f1 = 33 - f1, _f2 = 33 - f2;
    for (var f8 = 0; f8 < 33; ++f8) {
        for (var f9 = 0; f9 < 33; ++f9) {
            if (12 * ((u * f3 % 33 * f8 + u * _f1 % 33 * f9) % 33) + (u * _f2 % 33 * f8 + u * f0 % 33 * f9) % 33 >= 211) {
                return [f8, f9];
            }
        }
    }
    return null;
}
```

#### 成果

最终的注册机可以在文末下载附件。

### 社工方法

在我做到一半的时候，我突发奇想看看官网上的演示页面，然后发现官网上的演示页面用的竟然不是演示版本。

![](https://attach.52pojie.cn/forum/201803/26/161844kgwqjg11xxo1c5ng.jpg)

然后抓包看到了他的秘钥 `8EB6AF82KAF`，并且这个许可证还是不限域名的许可证，根据上面的算法分析还原得到原来的许可证为 `*8?A-*K**-E**8-*F**-*B**-2*6*-A**F`，域名随意。

![](https://attach.52pojie.cn/forum/201803/25/204122qlg565mgdmm7o7ol.jpg)

试了一下结果真的可以，看来官方并没有意愿去防止破解。

### 总结

我们来分析一下破解软件的通用流程，不只是 JavaScript 破解。

#### 这次的 JavaScript 破解

* 我们首先找 `licenseKey` 这个字符串，然后追查到了 XmlHttpRequest。
* 然后因为破解的需要，找到了 `S` 函数，然后解码了字符串加密。
* 然后找到了 `This is a demo version of CKFinder 3` 这个字符串，发现被作者骗了。
* 再之后，我们使用 XHR 断点和 DOM 断点，找到了真正写入这个字符串的位置，通过调用栈找到了另一个解码函数。
* 然后，我们分析了程序逻辑，直接将 `if` 判断改成 `if(false)`。
* 接着，我们使用类比法找到了所有含 `String.charCodeAt` 的位置，把这些位置的判断都去掉了。
* 我们换了另一种套路，内存断点，轻松地找到了验证函数的位置。

#### 通用思路

* 字符串搜索
* 找到通用的API入口下断点（在 Windows 下就是跨模块调用，Javascript 中就是 XHR 断点或 DOM 断点）
* 断下之后下内存断点（比如 OD 左下角的内存区域）
* 其他语言或编译器的特性（比如易语言的按钮、窗口特征等）
* 单步运行推理逻辑（比如 OD 左上角的汇编指令区域）同时结合上下文变化分析（比如 OD 右上角的寄存器区域）
* 沿着调用栈向上找（比如 OD 右下角的堆栈区域）
* 类比推理

### 附件

#### 去除字符串加密的版本

![](https://static.52pojie.cn/static/image/filetype/zip.gif)

[ckfinder.js.zip](https://www.52pojie.cn/forum.php?mod=attachment&aid=MTA4NjQyMHxkMTFiZjRmYnwxNzkwMzA5OTg4fDIzMjM3Mjd8NzEyMDY4)
*(142.83 KB, 下载次数: 59)*

这里提供一个经过字符串解密之后的版本，有兴趣的同学可以尝试破解这个，字符串解密之后，字符串搜索就变得简单了。

#### 注册机

![](https://static.52pojie.cn/static/image/filetype/zip.gif)

[ckfinder\_licenser.zip](https://www.52pojie.cn/forum.php?mod=attachment&aid=MTA4OTQ1OHw0MmJjZDE4NHwxNzkwMzA5OTg4fDIzMjM3Mjd8NzEyMDY4)
*(1.98 KB, 下载次数: 130)*

可以选择四种许可证之一，填好所需的域名，然后生成即可。查看网页源代码就可以看到生成算法了。

![](https://attach.52pojie.cn/forum/201803/26/161845z5ehpbce00b0tc2t.jpg)
