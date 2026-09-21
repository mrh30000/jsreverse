# 如何使用AST还原某音的jsvmp

> **作者**: sergiojune | **发布时间**: 2023-03-01 20:54:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 15083 / 80
> **原文**: [https://www.52pojie.cn/thread-1752755-1-1.html](https://www.52pojie.cn/thread-1752755-1-1.html)

---

###### 1. 什么是JSVMP

vmp简单来说就是将一些高级语言的代码通过自己实现的编译器进行编译得到字节码，这样就可以更有效的保护原有代码，而jsvmp自然就是对JS代码的编译保护，具体的可以看看[H5应用加固防破解-JS虚拟机保护方案](https://blog.ntan520.com/article/11179)。

如何区分是不是jsvmp？看代码里面有没有很长的一串字符串或者是数组，并且代码里面没有具体的逻辑，还有就是有一个循环不断地在跑，里面的就是一些指令，比如x乎，x音，x讯滑块等等都是jsvmp，也都是基于堆栈的栈式虚拟机实现的。

这是某乎的：

![x乎](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228140826220.png)

这是某音的，还原了一些算术混淆、三目运算和if else控制流混淆的：

![x音](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228152035413.png)

![x音](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228152122811.png)

这是某讯滑块的：

![函数](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228152702801.png)

###### 2. 如何去还原JSVMP

1. 调试vmp代码，分析循环代码里面每个操作数对应的代码的意义
2. 修改源代码中的vmp解释器，添加AST的对应代码
3. 运行代码，生成最终代码。

​

###### 3. 分析具体网站

样品网站：aHR0cHM6Ly90cmVuZGluc2lnaHQub2NlYW5lbmdpbmUuY29tL2FyaXRobWV0aWMtaW5kZXgvYW5hbHlzaXM/a2V5d29yZD0lRTklODAlODYlRTUlOTAlOTEmc291cmNlPW9jZWFuZW5naW5lJmFwcE5hbWU9YXdlbWU=

这个网站要找的是**X-Bogus**和**\_signature**这两个参数的生成，怎么定位的这里不说了，

很容易就可以看到这个函数就是在通过操作码去运行逻辑

![某讯的](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228165426165.png)

所以我们要分析下这个函数，看到有算术混淆和一些逗号混淆，不方便调试，可以使用AST写个逻辑去掉 这个很简单，还原效果如下：

![分析if](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228170124168.png)

可以看到，逻辑清晰了很多，但是因为是if else混淆，里面还有一些中间变量，如果调试的话会需要点击多几次才能到目标语句，所以我们可以考虑将这个if else转换为switch语句，这样调试的时候直接一步到位。

![转换为switch](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228171030473.png)

上图可以看到每次都从操作码中读取两个字符，并且是十六进制的，所以**\_0x1383c7**这个变量的范围就是0-255，这样switch的条件就有了，可以编写代码从0迭代到255，就可以得到每个指令对应的代码了。最后还原结果如下：

![还原一](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228205932340.png)

可以看到逻辑很清晰了，但是有个问题是0-255的case里面有些是重复的，需要删除，可以继续使用AST，在每个case的第一行插入**june.push(case\_num)**，如这样：

![image-20230228210840409](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228210029184.png)

然后映射文件到网站上，运行一次，获取june数组里面的值，保存到代码里，继续编写AST代码，读取case条件值，将不在数组中存在的case值全部删除掉，最后就可以愉快地分析了！

通过调试分析出，该函数的每个参数意义如下：

| 参数 | 意义 |
| --- | --- |
| \_0x307ee4 | 字节码 |
| \_0x5b7220 | 函数起始位置 |
| \_0x237dce | 函数长度 |
| \_0x3f8a47 | 不知道干啥，不影响分析 |
| \_0x4372f0 | 内外部变量区，存储了当前函数的参数、定义的变量和外部变量 |
| \_0x264fdc | 函数调用对象 |
| \_0x1f863f | 无意义 |
| \_0xb80186 | vmp分支，混淆分析的 |

不过我们只需要知道哪个参数是存储变量的，和栈变量即可，其他的不影响分析。

我们要想还原出逻辑，就要找到对变量的定义，赋值，然后将其转为对应的语句即可。

调试代码：

![image-20230228210241897](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228210241897.png)

![june](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228210552953.png)

这个就是在获取变量区**$0**的变量，**$0**代表的是本函数内定义的变量，**$1**就代表上一层，**$2**就继续往上推等等，但是其最外面的也会是本函数内的变量，所以需要需注意(这个如果有误，望赐教)

继续跑下去，可以看到

![image-20230228210744705](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228210744705.png)

![image-20230228211622842](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228210840409.png)

他将刚在获取的变量区index为24的值push进了栈，是一个函数参数，继续往下看

![image-20230228211025621](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228211003816.png)

通过分析可知，**\_0x9ac2c2**为栈，此处是将字符串**dfp**入栈，而我们要还原语句的话，入栈就不能这个了，需要改为对应的ast语句，将字符串**dfp**直接放上这网站[astexplorer](https://astexplorer.net/)

![image-20230228210552953](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228211025621.png)

可以看到对应的ast结构，所以此处代码改为：

![image-20230228211003816](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228203448530.png)

继续往下调试：

![image-20230228203448530](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228211130788.png)

这里是将刚才两个入栈的数据进行属性获取，对应语句为这样： yyy["dfp"]   (这里yyy 为乱写的，方便大家看的)

所以我们需要将源代码改为对应的ast代码：

![image-20230228212326941](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228211429676.png)

![image-20230228211429676](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228211622842.png)

接下来继续遇到一些常量进栈的，和上面的做法一样的，就不继续说了，说下变量定义：

![image-20230228212358585](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228212326941.png)

上面这个就是变量赋值，这里面获取的是变量区的值，如下：

![image-20230228211130788](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228212344156.png)

![image-20230228212344156](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228212358585.png)

可以看到 index 26的位置还没有，所以可以判断这是一个新变量，第一次赋值，所以语句为这个：var a = "xxx";

![image-20230228212519504](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228212519504.png)

如果当前这个“26”已经存在的话，就不需要定义变量了，而是赋值就行，语句是这样：a = "xxx";

![image-20230228214525607](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228212649932.png)

所以我们需要判断下这个语句是否存在，修改代码如下：

![image-20230228213408256](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228213408256.png)

可以看到入栈的数据是一个**Identifier**类型的变量，这个就是变量名了，之后代码需要操作的话，就获取这个变量就行，而不是获取直接的值。

最后记得将盖语句push进body，因为赋值就是一个完整的语句了，需要还原成代码。

理解了上面的剩下的就没什么问题了，就可以边调试边改对应的case，有些case是不需要操作的，比如上面的第一步获取变量区**$0**

**小技巧**：在每一个case前面添加一个语句：throw Error("未更改")；然后直接运行代码，抛出异常的就是未处理的case，然后在浏览器调试看该case的作用并修改代码即可，运行到没有异常就代表没啥问题了！

另外说下if else和for这种语句怎么还原：

![image-20230228212649932](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228214525607.png)

上面这个就是进行判断的，可以看到**\_0x9ac2c2[\_0x47144c--]**的结果不一样，**\_0x1383c7**就不一样，即为下一个运行的指令不一样

我的处理思路：

1. 进入这个分支就直接生成**if**判断，
2. 然后保存当前栈，当前栈指针，以及当前函数所有参数变量的值，和当前指令位置**\_0x1383c7**，
3. 将else分支的**\_0x1383c7**作为if分支的结束值，因为当if分支的指令值大于或者等于else分支的指令值的时候 证明两个分支运行的语句已经一致了(不过如果遇到三目语句，这种情况又需要另外讨论了)

然后直接调用当前函数，返回语句后将 if 结束后返回的指令值**\_0x1383c7**作为else语句的结束指令，最后用else分支保存的函数进行调用

![image-20230228224253177](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228223920208.png)

最后就是判断循环了，循环的也会进入上面这个case，只需要在进入的时候判断当前的指令值和if语句的起始指令值是否相同，相同即为循环，就可以修改之前保存的if分支为循环，我这里修改为while循环，比较好改

![image-20230228223920208](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228224253177.png)

最后一个就是vmp内的函数定义，调试代码分析知道这个就是定义vmp函数的：

![image-20230228225055831](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228225055831.png)

我是在他定义完了之后直接调用该函数进行还原，这样可以防止他只定义没有调用到，不好的地方在于参数个数不知道，所以这个需要在代码还原之后手动优化下，问题不大，如果你有更好的方法，希望能指导下。

![image-20230228225622013](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228225349309.png)

###### 4. 开始编写AST代码

由于该网站的vmp只是部分vmp，而我们还原代码是在原有的解释器上修改的，如果直接整完整代码进行运行，需要补一定的环境，这个不行，所以我这里将这个**\_$webrt\_1670312749**函数扣下来修改即可

首先导入我们需要用到的库：

```
const escodegen = require('escodegen');  // 用于将ast转为代码的
const esprima = require('esprima');  // 将代码转为ast
const estraverse = require('estraverse');  // 遍历ast的，这里用不到，用到了下面这个常量值
const Syntax = estraverse.Syntax;
var funs = {};  // 记录vmp函数的，可以方便调用
```

![image-20230228225349309](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228225622013.png)

然后在这个函数里面修改传过来的函数参数，将他改为ast代码的格式，而不是一个字面量，因为真正程序调用的时候，传到这里表面就是个变量了，当然也可以在**\_0x207ec8**这个循环函数内修改，但是不好确定哪些是函数参数，所以我在他上一个函数这里修改了

接下的就是按照上面第三步的分析开始写代码即可，如有不懂，可以在评论区讨论。

还原jsvmp代码这个第一次需要耐心点，等你熟悉起来了，后面的就会越来越快，里面主要就是一些ast代码的定义，需要传入栈的数据和存在变量区的值，最后就是函数定义和判断分支的实现，判断分支会比较难，处理好判断分支，剩下的就不是问题了。

如果觉得这个太难，可以试试这个大佬写的编译器：[给"某音"的js虚拟机写一个编译器](https://bbs.kanxue.com/thread-261414.htm)

可以编译自己的代码或者里面例子的代码，然后试着还原也不错！

###### 5. 分析生成后的代码

```
function _0x5b7a61_vmp(args_0, args_1, args_2, args_3, args_4, args_5, args_6, args_7, args_8, args_9, args_10, args_11, args_12, args_13, args_14, args_15, args_16, args_17, args_18, args_19, args_20, args_21, args_22) {
        var var_233 = 'X-Bogus';
        var var_24 = '_signature';
        var var_25 = window['XMLHttpRequest']['prototype'];
        var var_26 = var_25['open'];
        var var_27 = var_25['setRequestHeader'];
        var var_28 = var_25['send'];
        var var_29 = var_25['overrideMimeType'];
        if (var_25['_ac_intercepted']) {
            return;
        }
        var_25['_ac_intercepted'] = !0;
        var_25['setRequestHeader'] = function (args_0, args_1) {
            if (!this['_send']) {
                var var_9999 = new window['Object']();
                var_9999['func'] = 'setRequestHeader';
                var_9999['arguments'] = arguments;
                this['_byted_intercept_list']['push'](var_9999);
                if (_0xc5dbaf(window['RegExp'], _0x1a373c(['^content-type$', 'i']))['test'](args_0)) {
                    this['_byted_content'] = args_1['toString']()['toLowerCase']()['split'](';')[0];
                }
            }
            return var_27.apply(this, arguments);
        };
        var_25['overrideMimeType'] = function () {
            this['_overrideMimeTypeArgs'] = arguments;
            return var_29.apply(this, this['_overrideMimeTypeArgs']);
        };
        var_25['open'] = function (args_0, args_1, args_2) {
            this['_byted_intercept_list'] = [];
            var var_10000 = new window['Object']();
            var_10000['func'] = 'open';
            var_10000['arguments'] = arguments;
            this['_byted_intercept_list']['push'](var_10000);
            this['_byted_method'] = args_0['toUpperCase']();
            this['_byted_url'] = args_1;
            return var_26.apply(this, arguments);
        };
        var var_30 = [
            'onabort',
            'onerror',
            'onload',
            'onloadend',
            'onloadstart',
            'onprogress',
            'ontimeout'
        ];
        var var_31 = [
            'GET',
            'POST'
        ];
        var_25['send'] = function fun_4(args_0) {
            var var_6 = var_31['indexOf'](this['_byted_method']) !== 0 - 1;
            if (args_2(this['_byted_url'])) {
                if (var_6) {
                    if (this['_byted_url']['indexOf']('_signature=') > 0 - 1) {
                        return var_28(this, arguments);
                    }
                    this['_byted_body'] = args_0;
                    var var_7 = this['onreadystatechange'];
                    var var_8 = this['onabort'];
                    var var_9 = this['onerror'];
                    var var_10 = this['onload'];
                    var var_11 = this['onloadend'];
                    var var_12 = this['onloadstart'];
                    var var_13 = this['onprogress'];
                    var var_14 = this['ontimeout'];
                    var var_15 = new window['Object']();
                    var var_50 = 0;
                    while (var_50 < var_30['length']) {
                        var_15[var_30[var_50]] = this['upload'][var_30[var_50]];
                        ++var_50;
                    }
                    var var_16 = args_3['msStatus'];
                    var var_17 = args_3['__ac_testid'];
                    if (var_17 == '') {
                        var var_18 = ['msToken', args_3['msToken']];
                    } else {
                        var_18 = ['msToken', args_3['msToken'], '__ac_testid', var_17];
                    }
                    var var_19 = args_4(args_5(this['_byted_url']), var_18);
                    var var_20 = args_6(var_19);
                    var var_21 = args_7(var_20, this['_byted_body']);
                    var var_22 = args_4(var_19, [var_233, var_21]);
                    var var_23 = '';
                    if (args_8['v']) {
                        var_23 = var_22;
                    } else {
                        var var_10002 = new window['Object']();
                        var_10002['url'] = args_9(null, var_22);
                        var var_100 = var_10002;
                        if (this['_byted_method'] === 'POST') {
                            if (args_10(this['_byted_content'])) {
                                args_11(var_100, this['_byted_content'], this['_byted_body']);
                                var var_101 = args_12(var_100, args_13, 'forreal');
                                var_23 = args_4(var_22, [var_24, var_101]);
                            } else {
                                var_23 = var_22;
                            }
                        } else {
                            var var_251 = args_12(var_100, args_13, 'forreal');
                            var_23 = args_4(var_22, [var_24, var_251]);
                        }
                    }
                    if (this['_byted_intercept_list']) {
                        if (this['_byted_intercept_list'][0]['func'] !== 'open') {
                            return null;
                        }
                    }
                    var var_244 = this['_byted_intercept_list'];
                    var var_182 = 0;
                    while (var_182 < var_244['length']) {
                        if (var_182 === 0) {
                            var_244[var_182].arguments[1] = var_23;
                            this['_send'] = !0;
                            var_26.apply(this, var_244[var_182].arguments);
                        } else {
                            this[var_244[var_182]['func']].apply(this, var_244[var_182].arguments);
                        }
                        ++var_182;
                    }
                    if (this['_overrideMimeTypeArgs']) {
                        this['overrideMimeType']();
                    }
                    delete this['_byted_intercept_list'];
                    if (args_8['sdi']) {
                        this['setRequestHeader'](args_14['secInfoHeader'], args_15());

                    }
                    this['onreadystatechange'] = var_7;
                    this['onabort'] = var_8;
                    this['onerror'] = var_9;
                    this['onload'] = function () {
                        var var_6 = 0;
                        if (!this['responseURL']) {
                            if (!this['_byted_url']) {
                                var var_7 = '';
                                if (args_16(var_7)) {
                                    var_6 = 1;
                                }
                                if (var_7['indexOf'](window['location']['host']) !== 0 - 1) {
                                    var_6 = 2;
                                }
                                if (var_6 > 0) {
                                    var var_8 = this['getResponseHeader']('x-ms-token');
                                    if (var_8) {
                                        var var_9 = args_17(this['_byted_url']);
                                        if (var_9 === args_18['sec']) {
                                            args_3['msToken'] = var_8;
                                            args_3['msStatus'] = var_9;
                                            args_19('msToken', var_8);
                                            args_20(var_8);
                                            if (var_9 > var_16) {
                                                if (args_3['msNewTokenList']['length'] > 0) {
                                                    args_21(args_22, 2);
                                                }
                                            }
                                        } else if (var_16 >= args_3['msStatus']) {
                                            args_3['msToken'] = var_8;
                                        }
                                        if (var_16 === args_18['init']) {
                                            if (args_3['msNewTokenList']['length'] < 10) {
                                                args_3['msNewTokenList']['push'](var_8);
                                                if (args_3['msNewTokenList']['length'] === 1) {
                                                    args_20(var_8);
                                                    args_19('msToken', var_8);
                                                }
                                            }
                                        }
                                    }
                                }
                                if (var_10) {
                                    var_10(args_0);
                                }
                                return;
                            } else {
                                var_7 = this['_byted_url'];
                                if (args_16(var_7)) {
                                    var_6 = 1;
                                }
                                if (var_7['indexOf'](window['location']['host']) !== 0 - 1) {
                                    var_6 = 2;
                                }
                                if (var_6 > 0) {
                                    var_8 = this['getResponseHeader']('x-ms-token');
                                    if (var_8) {
                                        var_9 = args_17(this['_byted_url']);
                                        if (var_9 === args_18['sec']) {
                                            args_3['msToken'] = var_8;
                                            args_3['msStatus'] = var_9;
                                            args_19('msToken', var_8);
                                            args_20(var_8);
                                            if (var_9 > var_16) {
                                                if (args_3['msNewTokenList']['length'] > 0) {
                                                    args_21(args_22, 2);
                                                }
                                            }
                                        } else if (var_16 >= args_3['msStatus']) {
                                            args_3['msToken'] = var_8;
                                        }
                                        if (var_16 === args_18['init']) {
                                            if (args_3['msNewTokenList']['length'] < 10) {
                                                args_3['msNewTokenList']['push'](var_8);
                                                if (args_3['msNewTokenList']['length'] === 1) {
                                                    args_20(var_8);
                                                    args_19('msToken', var_8);
                                                }
                                            }
                                        }
                                    }
                                }
                                if (var_10) {
                                    var_10(args_0);
                                }
                            }
                        } else if (!this['responseURL']) {
                            var_7 = '';
                            if (args_16(var_7)) {
                                var_6 = 1;
                            }
                            if (var_7['indexOf'](window['location']['host']) !== 0 - 1) {
                                var_6 = 2;
                            }
                            if (var_6 > 0) {
                                var_8 = this['getResponseHeader']('x-ms-token');
                                if (var_8) {
                                    var_9 = args_17(this['_byted_url']);
                                    if (var_9 === args_18['sec']) {
                                        args_3['msToken'] = var_8;
                                        args_3['msStatus'] = var_9;
                                        args_19('msToken', var_8);
                                        args_20(var_8);
                                        if (var_9 > var_16) {
                                            if (args_3['msNewTokenList']['length'] > 0) {
                                                args_21(args_22, 2);
                                            }
                                        }
                                    } else if (var_16 >= args_3['msStatus']) {
                                        args_3['msToken'] = var_8;
                                    }
                                    if (var_16 === args_18['init']) {
                                        if (args_3['msNewTokenList']['length'] < 10) {
                                            args_3['msNewTokenList']['push'](var_8);
                                            if (args_3['msNewTokenList']['length'] === 1) {
                                                args_20(var_8);
                                                args_19('msToken', var_8);
                                            }
                                        }
                                    }
                                }
                            }
                            if (var_10) {
                                var_10(args_0);
                            }
                            return;
                        } else {
                            var_7 = this['responseURL'];
                            if (args_16(var_7)) {
                                var_6 = 1;
                            }
                            if (var_7['indexOf'](window['location']['host']) !== 0 - 1) {
                                var_6 = 2;
                            }
                            if (var_6 > 0) {
                                var_8 = this['getResponseHeader']('x-ms-token');
                                if (var_8) {
                                    var_9 = args_17(this['_byted_url']);
                                    if (var_9 === args_18['sec']) {
                                        args_3['msToken'] = var_8;
                                        args_3['msStatus'] = var_9;
                                        args_19('msToken', var_8);
                                        args_20(var_8);
                                        if (var_9 > var_16) {
                                            if (args_3['msNewTokenList']['length'] > 0) {
                                                args_21(args_22, 2);
                                            }
                                        }
                                    } else if (var_16 >= args_3['msStatus']) {
                                        args_3['msToken'] = var_8;
                                    }
                                    if (var_16 === args_18['init']) {
                                        if (args_3['msNewTokenList']['length'] < 10) {
                                            args_3['msNewTokenList']['push'](var_8);
                                            if (args_3['msNewTokenList']['length'] === 1) {
                                                args_20(var_8);
                                                args_19('msToken', var_8);
                                            }
                                        }
                                    }
                                }
                            }
                            if (var_10) {
                                var_10(args_0);
                            }
                        }
                    };
                    this['onloadend'] = var_11;
                    this['onloadstart'] = var_12;
                    this['onprogress'] = var_13;
                    this['ontimeout'] = var_14;
                    var var_216 = 0;
                    while (var_216 < var_30['length']) {
                        this['upload'][var_30[var_216]] = var_15[var_30[var_216]];
                        ++var_216
                    }
                }
                return var_28.apply(this, arguments);
            }
        };
    }
```

上面代码是在vmp还原后经过手动小优化的，因为分支处理不够好，会有重复分支，手动删除即可。

上面代码不调试，直接看，逻辑也都很清晰了，加密是在**send**函数里面，这一小段：

![image-20230228231843061](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228231843061.png)

![image-20230228232448073](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228232448073.png)

![image-20230228232656708](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228232656708.png)

浏览器上也是可以得到结果的，证明是没问题的

最后我也将还原的代码将算法扣出来，然后用python，去请求也没问题

![image-20230228233415067](https://sergiojune.oss-cn-guangzhou.aliyuncs.com//img/image-20230228233415067.png)

从还原的代码来看，对环境的检测也挺多的，检测了一些dom操作，还检测了一堆异步对象，都是获取设备的一些信息的。

###### 6. 参考文章

[**给"某音"的js虚拟机写一个编译器**](https://bbs.kanxue.com/thread-261414.htm)

[**某乎x96参数与jsvmp初体验**](https://www.52pojie.cn/thread-1619464-1-1.html)
