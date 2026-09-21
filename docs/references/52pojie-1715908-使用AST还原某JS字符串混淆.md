# 使用AST还原某JS字符串混淆

> **作者**: hlrlqy | **发布时间**: 2022-11-20 14:14:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 7907 / 30
> **原文**: [https://www.52pojie.cn/thread-1715908-1-1.html](https://www.52pojie.cn/thread-1715908-1-1.html)

---

背景：

在分析某站点接口时发现以前发现漏洞的JS修复后进行了强混淆，看起来十分抽象

![](https://attach.52pojie.cn/forum/202211/20/141321ye4y1yh11xnypi7p.png)

于是乎搁置在一边没有继续分析，直到前几日在图书馆发现了小肩膀大佬写的爬虫混淆AST对抗，书中描述的几种混淆方式与该站点使用的十分相似，遂尝试使用AST对该JS进行一定程度的还原

本篇针对该JS中的字符串混淆进行还原

#### 字符串是如何混淆的

##### 解密方式

想要对字符串反混淆就要先分析该样本是如何对字符串进行混淆的

以一个字符串的解密为例子，可以发现他将字符串解密拆分成一串函数调用并对立即数进行减法操作来防止通用解密

![](https://attach.52pojie.cn/forum/202211/20/141323xd7dqcf4c866lke2.png)

而处于全局作用域的`_0x1f1a68`实际上也是对另一个函数的调用

```
function _0x1f1a68(_0x1be822, _0x79fd7, _0x340561, _0x170aa8, _0x35407a) {
    return _0x4903(_0x35407a - 0x252, _0x340561);
}
```

经过在`VSCode`中对每个字符串解密函数查找定义，发现所有的字符串解密最终都是调用的`_0x4903`

由于每个函数的调用时机跟作用域都不同，获取每一个字符串解密函数的结果是不明智的

于是这里需要实现的第一个功能就是将每一个字符串的解析还原成对`_0x4903`的调用，也就是将不同字符串解密函数的调用替换成对最根本的解密函数`_0x4903`的幂等形式

#### 还原

##### 函数调用还原实现

举个例子

```
function _0x3cb10b(_0x9056d3, _0xd6da67, _0x4e8aa3, _0x575cfa, _0x50067e) {
     return _0x1f1a68(_0x9056d3 - 0x1ca, _0xd6da67 - 0x97, _0x4e8aa3, _0x575cfa - 0x13c, _0xd6da67 - 0x119);
 }
function _0x362f86(_0xeb8495, _0x2bb06b, _0x3bc6ce, _0x59c29b, _0x141499) {
    return _0x3cb10b(_0xeb8495 - 0x1a0, _0xeb8495 - -0x370, _0x3bc6ce, _0x59c29b - 0x19c, _0x141499 - 0x120);
}
function _0x1f1a68(_0x1be822, _0x79fd7, _0x340561, _0x170aa8, _0x35407a) {
    return _0x4903(_0x35407a - 0x252, _0x340561);
}
```

我们的目标是将

`_0x362f86(0x9a3, 0xef2, '1vkx', 0x369, 0xb40)`

转换成

`_0x3cb10b(0x9a3- 0x1a0, 0x9a3 - -0x370, '1vkx', 0x369 - 0x19c, 0xb40 - 0x120);`

继而转换成

`_0x1f1a68(0x9a3- 0x1a0 - 0x1ca, 0x9a3 - -0x370 - 0x97, '1vkx', 0x369 - 0x19c - 0x13c, 0x9a3 - -0x370 - 0x119);`

最终转换成

`_0x4903(0x9a3 - -0x370 - 0x119 - 0x252, '1vkx');`

![](https://attach.52pojie.cn/forum/202211/20/141325aa4zd8qggknq8qnq.png)

![](https://attach.52pojie.cn/forum/202211/20/141328sqi7d00mli4gl012.png)

那么如何使用AST实现呢，为了尽可能实现上下文无关减少状态，这里采用像示例中的一样一层一层的处理

在代码实现上我将其分为了多个部分

```
function replaceArgsToIndex(funcargs, arg) {
        if (arg.type == "BinaryExpression") {
            return replaceArgsToIndex(funcargs, arg.left);
        }
        if (arg.name.startsWith("arg")) {
            return true;
        }
        for (let i = 0; i < funcargs.length; i++) {
            if (funcargs[i].name == arg.name) {
                arg.name = "arg" + i;
                return true;
            }
        }
        console.log("not found arg " + arg.name + " at " + arg.loc?.start.line);
        return false;
}
```

第一步是将函数内的参数名转换成参数下标，这样就可以从`CallExpression`中直接用下标获取对应的参数进行表达式替换，这里处理了`BinaryExpression`是因为参数中存在减法表达式的情况，但变量永远在第一位，所以递归到最左面的变量再进行处理，同时如果参数已经被转化成argN的形式便不做处理。

这里放一下关于二值表达式的表示

![](https://attach.52pojie.cn/forum/202211/20/141330qy0gz784ai8i4y27.png)

如图，每个红框都是一个二值表达式，外层的二值表达式将内层的二值表达式作为左值，所以当变量为

`xxx - 0x123 -0x456 -0x789`

形式时我们要递归的获取左值。

转换后的形式为：

```
function _0x1f1a68(_0x1be822, _0x79fd7, _0x340561, _0x170aa8, _0x35407a) {
    return _0x4903(arg4 - 0x252, arg2);
}
```

这样就可以检测所有对`0x1f1a68`的调用，获取其中的第5个参数和第三个参数并把其放入`_0x4903`调用的对应位置，然后将`0x1f1a68`替换为`_0x4903`

将参数下标替换成参数的代码如下

```
function convertIndexToArg(funcargs, arg) {
        if (arg.type == "BinaryExpression") {
            return btypes.binaryExpression(arg.operator, convertIndexToArg(funcargs, arg.left), arg.right);
        }
        if (arg.name.startsWith("arg")) {
            let index = parseInt(arg.name.substr(3));
            if (index < funcargs.length) {
                return funcargs[index];
            } else {
                console.log("not found arg index with name " + arg.name + " at " + arg.loc?.start.line);
            }
        } else {
            return arg;
        }
}
```

其中`funcargs`为`CallExpression`中的参数,该函数同样递归处理二值表达式

实现函数展开只需要遍历所有的函数定义，判断是否满足混淆函数的格式，然后通过binding寻找他的调用表达式进行处理，下面为代码实现

```
let doFlatten = {
        FunctionDeclaration(path) {
            let refBinding = path.scope.getBinding(path.node.id?.name);
            if (!refBinding.referenced) {
                path.remove(); //如果函数没有被引用则直接删除并更新作用域
                path.scope.crawl();
                return;
            }
            if (path.node.body.body.length != 1) return;
            let body = path.node.body.body[0];
            if (!btypes.isReturnStatement(body)) return;
            let callExp = body.argument;
            if (!btypes.isCallExpression(callExp)) return;
            //以上三个判断是否满足混淆函数的格式
            let calleeArgs = callExp.arguments; //混淆函数里面调用函数的参数
            let funcArgs = path.node.params; //混淆函数的参数
            for (let arg of calleeArgs) {
                let type = arg.type;
                switch (arg.type) {
                    case "BinaryExpression":
                        replaceArgsToIndex(funcArgs, (arg as btypes.BinaryExpression).left as btypes.Identifier); //这里可以不case,已经在replaceArgsToIndex中实现了递归，这里case是为了防止有未预期的形式，但是经过测试不存在该情况
                        break;
                    case "Identifier":
                        replaceArgsToIndex(funcArgs, arg as btypes.Identifier);
                        break;
                    default:
                        console.log("callee arg not recognizable at line: " + path.node.loc?.start.line);
                        return;
                }
            }

            let { id } = path.node;
            let binding = path.scope.getBinding((id as btypes.Identifier).name);
            for (let refer_path of binding!.referencePaths) {
                //获取所有调用
                if (!btypes.isCallExpression(refer_path.parent)) {
                    console.log("abnormal reference at line: " + refer_path.node.loc?.start.line);
                    continue;
                }
                let args = (refer_path.parent as btypes.CallExpression).arguments;
                let newArgs: btypes.Expression[] = []; //重组的表调用参数
                let argExp: btypes.Expression;
                for (let arg of calleeArgs) {
                    let type = arg.type;
                    switch (arg.type) {
                        case "BinaryExpression":
                            argExp = convertIndexToArg(args, (arg as btypes.BinaryExpression).left as btypes.Identifier);
                            let exp = btypes.binaryExpression((arg as btypes.BinaryExpression).operator, argExp, (arg as btypes.BinaryExpression).right)
                            newArgs.push(exp);
                            //处理重组，按照嵌套二值表达式的方式组装并把变量参数放在最左边
                            break;
                        case "Identifier":
                            argExp = convertIndexToArg(args, arg as btypes.Identifier);
                            newArgs.push(argExp);
                            break;
                    }
                }
                let newCallExp = btypes.callExpression(callExp.callee, newArgs);
                refer_path.parentPath.replaceWith(newCallExp);//替换callExpression
            }
            path.parentPath.scope.crawl();
            //console.log("modified code: " + codegen["default"](path.node).code);
            //path.remove();
        }
    };
    traverse["default"](root, doFlatten);
```

由于每次我们仅处理一层，所以这里多次处理，这样就不必为先后顺序发愁

```
for (let level = 0; level < 3; level++) {
  removeConstFunc(root)
}
```

##### 字符串函数调用

上一步中我们将字符串混淆替换成了形似`_0x4903(0x9a3 - -0x370 - 0x119 - 0x252, '1vkx');`的调用，这一步中我们要将对该函数的调用还原为字符串。

以下为`_0x4903`的实现

```
function _0x4903(_0x41f1e9, _0x3130bc) {
    var _0x5e7ec4 = _0x8976();

    return _0x4903 = function (_0x899a2d, _0x5835f7) {
      _0x899a2d = _0x899a2d - 109;
      var _0x3e8c46 = _0x5e7ec4[_0x899a2d];

      if (_0x4903.HfpBsi === undefined) {
        var _0x1cbb5e = function (_0x50d26d) {
          var _0x5a42a9 = '',
              _0x12cc8d = '',
              _0x5f42a1 = _0x5a42a9 + _0x1cbb5e;

          for (var _0x2829d6 = 0, _0x49459b, _0x390f91, _0x46a986 = 0; _0x390f91 = _0x50d26d.charAt(_0x46a986++); ~_0x390f91 && (_0x49459b = _0x2829d6 % 4 ? _0x49459b * 64 + _0x390f91 : _0x390f91, _0x2829d6++ % 4) ? _0x5a42a9 += _0x5f42a1.charCodeAt(_0x46a986 + 10) - 10 !== 0 ? String.fromCharCode(255 & _0x49459b >> (-2 * _0x2829d6 & 6)) : _0x2829d6 : 0) {
            _0x390f91 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='.indexOf(_0x390f91);
          }

          for (var _0x42631c = 0, _0x4ab4be = _0x5a42a9.length; _0x42631c < _0x4ab4be; _0x42631c++) {
            _0x12cc8d += '%' + ('00' + _0x5a42a9.charCodeAt(_0x42631c).toString(16)).slice(-2);
          }

          return decodeURIComponent(_0x12cc8d);
        };

        var _0x6b448 = function (_0x1b5efd, _0x1ba8dd) {
          var _0x45d44d = [],
              _0xd3ad3a = 0,
              _0x1e5c57,
              _0x567392 = '';

          _0x1b5efd = _0x1cbb5e(_0x1b5efd);

          var _0x579ae7;

          for (_0x579ae7 = 0; _0x579ae7 < 256; _0x579ae7++) {
            _0x45d44d[_0x579ae7] = _0x579ae7;
          }

          for (_0x579ae7 = 0; _0x579ae7 < 256; _0x579ae7++) {
            _0xd3ad3a = (_0xd3ad3a + _0x45d44d[_0x579ae7] + _0x1ba8dd.charCodeAt(_0x579ae7 % _0x1ba8dd.length)) % 256, _0x1e5c57 = _0x45d44d[_0x579ae7], _0x45d44d[_0x579ae7] = _0x45d44d[_0xd3ad3a], _0x45d44d[_0xd3ad3a] = _0x1e5c57;
          }

          _0x579ae7 = 0, _0xd3ad3a = 0;

          for (var _0x577b0d = 0; _0x577b0d < _0x1b5efd.length; _0x577b0d++) {
            _0x579ae7 = (_0x579ae7 + 1) % 256, _0xd3ad3a = (_0xd3ad3a + _0x45d44d[_0x579ae7]) % 256, _0x1e5c57 = _0x45d44d[_0x579ae7], _0x45d44d[_0x579ae7] = _0x45d44d[_0xd3ad3a], _0x45d44d[_0xd3ad3a] = _0x1e5c57, _0x567392 += String.fromCharCode(_0x1b5efd.charCodeAt(_0x577b0d) ^ _0x45d44d[(_0x45d44d[_0x579ae7] + _0x45d44d[_0xd3ad3a]) % 256]);
          }

          return _0x567392;
        };

        _0x4903.MMnWus = _0x6b448, _0x41f1e9 = arguments, _0x4903.HfpBsi = !![];
      }

      var _0x22abc4 = _0x5e7ec4[0],
          _0x244987 = _0x899a2d + _0x22abc4,
          _0x238d8e = _0x41f1e9[_0x244987];

      if (!_0x238d8e) {
        if (_0x4903.CBAcVv === undefined) {
          var _0xdfbdcc = function (_0xacf633) {
            this.kDnxVr = _0xacf633, this.IoBPQs = [1, 0, 0], this.wpMLDB = function () {return 'newState';}, this.kJPlqW = '\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*', this.YBMSQk = '[\x27|\x22].+[\x27|\x22];?\x20*}'; //这是正则表达式
          };

          _0xdfbdcc.prototype.NgtXeG = function () {
            var _0x18c3d0 = new RegExp(this.kJPlqW + this.YBMSQk),
                _0xa664a8 = _0x18c3d0.test(this.wpMLDB.toString()) ? --this.IoBPQs[1] : --this.IoBPQs[0]; //这里检测函数文本是否满足正则，实际上是检测JS有没有被格式化，在这里将wpMLDB手动的改回了最小化的格式绕过检测

            return this.vbKnou(_0xa664a8);
          }, _0xdfbdcc.prototype.vbKnou = function (_0x561c7b) {
            if (!Boolean(~_0x561c7b)) return _0x561c7b;
            return this.DtzlIA(this.kDnxVr); //检测到被格式化，调用该函数溢满内存
          }, _0xdfbdcc.prototype.DtzlIA = function (_0x386581) {
            for (var _0x2adaa0 = 0, _0x5245a5 = this.IoBPQs.length; _0x2adaa0 < _0x5245a5; _0x2adaa0++) {
              this.IoBPQs.push(Math.round(Math.random())), _0x5245a5 = this.IoBPQs.length;
            }

            return _0x386581(this.IoBPQs[0]);
          }, new _0xdfbdcc(_0x4903).NgtXeG(), _0x4903.CBAcVv = !![];
        }

        _0x3e8c46 = _0x4903.MMnWus(_0x3e8c46, _0x5835f7), _0x41f1e9[_0x244987] = _0x3e8c46;
      } else _0x3e8c46 = _0x238d8e;

      return _0x3e8c46;
    }, _0x4903(_0x41f1e9, _0x3130bc);
  }

  (function (_0x4dbad8, _0x3b7f07) {
    var _0x37755d = _0x4dbad8();

    while (!![]) {
      try {
        var _0x39c0da = parseInt(_0x4903(4069, 'u]yp')) / 1 * (parseInt(_0x4903(2125, 'Jx@]')) / 2) + parseInt(_0x4903(140, 'kFVy')) / 3 + -parseInt(_0x4903(2566, 'j1TD')) / 4 + parseInt(_0x4903(3272, 'a*Xk')) / 5 + -parseInt(_0x4903(2587, 'EnP@')) / 6 + -parseInt(_0x4903(743, '5h*C')) / 7 + parseInt(_0x4903(5102, 'dVlJ')) / 8;

        if (_0x39c0da === _0x3b7f07) break;else _0x37755d.push(_0x37755d.shift());
      } catch (_0x696156) {
        _0x37755d.push(_0x37755d.shift());
      }
    }
  })(_0x8976, 214580); //字符串数组顺序还原，_0x8976为一个返回全局数组的函数，数组太长了就不放上来了
```

这里不关心她如何实现，只要能够调用就好了，不过也进行了分析写在注释中

绕过其中的检测后就可以放到文件里然后直接引入该js执行了

为其添加导出

```
module.exports = {
  _0x4903
}
```

```
import { _0x4903 } from './strdeec'
function evalDecryptStr(root){
    traverse["default"](root, {
        CallExpression(path) {
            let { callee } = path.node;
            if (btypes.isIdentifier(callee) && callee.name == "_0x4903") { //判断是否为字符串解密函数
                //console.log(codegen["default"](path.node).code,"loc:",path.node.loc?.start.line);
                let args = path.node.arguments;
                if(!btypes.isNumericLiteral(args[0]) || !btypes.isStringLiteral(args[1])) return;
                let str = (args[0] as btypes.NumericLiteral).value;
                let key = (args[1] as btypes.StringLiteral).value; //获取函数调用表达式的参数
                //console.log("decrypt str: " + str + " with key: " + key);
                let result = _0x4903(str, key); //调用解密JS
                path.replaceWith(btypes.stringLiteral(result)); //将函数调用替换成返回的字符串
            }
        }
    });
}
```

#### 效果

##### 原JS

```
var _0x36ac29 = {
        'NaqJs': function(_0x23b608, _0x3b3abb) {
            return _0x23b608 + _0x3b3abb;
        },
        'UJTOv': _0x174a07(0xf38, 'LzP4', 0xfd8, 0x636, 0x1585),
        'KunTi': _0x513b7d(0x130c, 0xeca, 0x876, 'lsex', 0x51b),
        'qCfPd': _0x513b7d(-0x735, 0x161, 0x4cf, 'KFQS', 0x9d0) + 'n',
        'CGJyE': _0x3b7723(-0x374, 'k2r*', 0xc46, 0x41c, 0x16c) + _0x1c1190(0xef5, 'Dvut', 0x841, 0x960, 0xae9) + _0x3b7723(-0x165, 'a*Xk', -0x5d6, 0x3a5, 0x743) + ')',
        'aXujP': _0x174a07(0x5b9, 'a*Xk', 0x976, 0xf31, 0x697) + _0x1c1190(0xb61, 'Jx@]', 0x10c9, 0x7cb, 0x8db) + _0x1c1190(0x3e4, '5h*C', 0x39f, 0x36d, 0xc81) + _0x139616(0xd98, 0x90e, '[q9T', 0x1244, 0x4e3) + _0x174a07(0xfc6, '$TWJ', 0x1020, 0xbef, 0xbc5) + _0x174a07(0x801, 'mPMe', 0xcce, 0x8d3, 0xbb) + _0x513b7d(0x605, 0x1d, -0x31c, '[q9T', -0x3c5),
        'MTufy': function(_0x43fade, _0x361ab2) {
            return _0x43fade(_0x361ab2);
        },
        'cqyFN': _0x513b7d(0x6c5, 0xcb7, 0x1631, 'A$dO', 0xc76),
        'ITrER': function(_0x7d61e2, _0x18ffb2) {
            return _0x7d61e2 + _0x18ffb2;
        },
        'mYpth': _0x3b7723(0x3f8, 'vrb1', 0x487, 0xa64, 0x32f),
        'ySBMh': _0x174a07(0x10a4, 'LzP4', 0x10fb, 0x1589, 0xc04),
        'fhGPp': function(_0x10918e) {
            return _0x10918e();
        },
        'BPPTg': function(_0xbea0a9, _0xf05a6b) {
            return _0xbea0a9 === _0xf05a6b;
        },
        'aFUAX': _0x1c1190(0x1105, 'DZK9', 0xa48, 0x101f, 0x17c1),
        'YkQUD': function(_0x3d394f, _0x304d01) {
            return _0x3d394f !== _0x304d01;
        },
        'XUKwk': _0x1c1190(0x53c, 'u]yp', 0x1b9, 0xa84, 0x7fb),
        'hGUML': _0x174a07(0xbc5, '[Kpm', 0xb6a, 0x3bd, 0xa68),
        'FZvDE': function(_0x3899f7, _0x4782b9) {
            return _0x3899f7 === _0x4782b9;
        },
        'LCVgl': _0x1c1190(0x925, 's*!&', 0x2f8, 0x4d4, -0x3e5),
        'FFifH': _0x174a07(0x1437, 'Thp]', 0x17dc, 0x1c99, 0x1031)
    };
```

##### 还原后

```
var _0x36ac29 = {
    'NaqJs': function (_0x23b608, _0x3b3abb) {
      return _0x23b608 + _0x3b3abb;
    },
    'UJTOv': "debu",
    'KunTi': "gger",
    'qCfPd': "action",
    'CGJyE': "function *\\( *\\)",
    'aXujP': "\\+\\+ *(?:[a-zA-Z_$][0-9a-zA-Z_$]*)",
    'MTufy': function (_0x43fade, _0x361ab2) {
      return _0x43fade(_0x361ab2);
    },
    'cqyFN': "init",
    'ITrER': function (_0x7d61e2, _0x18ffb2) {
      return _0x7d61e2 + _0x18ffb2;
    },
    'mYpth': "chain",
    'ySBMh': "input",
    'fhGPp': function (_0x10918e) {
      return _0x10918e();
    },
    'BPPTg': function (_0xbea0a9, _0xf05a6b) {
      return _0xbea0a9 === _0xf05a6b;
    },
    'aFUAX': "WrmJg",
    'YkQUD': function (_0x3d394f, _0x304d01) {
      return _0x3d394f !== _0x304d01;
    },
    'XUKwk': "SBXpo",
    'hGUML': "GJQSO",
    'FZvDE': function (_0x3899f7, _0x4782b9) {
      return _0x3899f7 === _0x4782b9;
    },
    'LCVgl': "spaxN",
    'FFifH': "QeYEB"
  };
```

至此成功还原字符串加密，此部分结束。
