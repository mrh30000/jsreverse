# 某大厂waf逆向 - 用AST还原加强ob混淆壳

> **作者**: q8917749 | **发布时间**: 2025-05-27 22:17:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8732 / 31
> **原文**: [https://www.52pojie.cn/thread-2034613-1-1.html](https://www.52pojie.cn/thread-2034613-1-1.html)

---

*本帖最后由 q8917749 于 2025-5-27 22:37 编辑*

**前言：**
对于非标准OB的强混淆，有些时候硬着头皮去调试，往往把自己搞晕。 说起AST呢，以前我也不太爱用这个东西，因为觉得用起来还不如我直接调试。
但是没办法，现在的混淆绕的弯越来越大，硬着头皮调试其实还不如用一下 AST，AST往往就能起到事半功倍的效果 。
本文就讲一下 AST去混淆的一些小技巧。

**混淆**
长话短说，这边AST用的是js babel， 所以直接把一整份源码抠出来放到VS中
可以观察到 某个风控指纹的生成地方 长这样：

![](https://attach.52pojie.cn/forum/202505/27/223526sfehnhygf529kpfe.png)

**1.****首先我们去除一些静态计算的数值混淆** 比如 ：0x42e \* -0x6 +0x25c8 + -0xcb4 核心的api就是
**const {confident, value } = path.evaluate();**
path.evaluate() 是 Babel 的静态求值方法，value就是返回值
如果confident为true 说明了 表达式里面都是静态值，没有动态值 、变量。是可以安全得到结果的
然后进行替换

[JavaScript] *纯文本查看*

```

traverse(ast, {
  BinaryExpression(path) {
    // 尝试计算表达式（支持数值、字符串、布尔值等）
    const { confident, value } = path.evaluate();

    if (confident) {
      // 如果是字符串，替换为 StringLiteral
      if (typeof value === "string") {
        path.replaceWith(t.stringLiteral(value));
      }
      // 如果是数值，替换为 NumericLiteral
      else if (typeof value === "number") {
        path.replaceWith(t.numericLiteral(value));
      }
      // 其他类型（如布尔值）可以类似处理
    }
  }
});
```

**2.****去除数组引用混淆**
最典型的

[JavaScript] *纯文本查看*

```
T9['BT'])(B[ci(Pm.B)], TW ? TB['BS'](B[ci(Pm.T)](B[ci(Pm.A)](B[ci(Pm.E)](B[ci(Pm.x)](B[ci(Pm.c)](B[ci(Pm.M)](TY[ci(Pm.s)]('^'), 'M'), Tn[ci(Pm.j)]), '^'), TJ[ci(Pm.j)]), '^'), TQ[ci(Pm.H)])) : TB['BS'](B[ci(Pm.k)](B[ci(Pm.y)](B[ci(Pm.X)](B[ci(Pm.U)](B[ci(Pm.K)](B[ci(Pm.S)](TY[ci(Pm.s)]('^'), 'P'), Tg[ci(Pm.H)]), '^'), Tb[ci(Pm.P)]), '^'), TQ[ci(Pm.H)])), Ax, TG),
```

 你可以看到  ci函数里面 都是一些静态数组的值
比如 Pm.B  Pm.T 他们都是数组里面的整数值
这里处理起来也很简单
**1.****收集数组定义** **2.****替换成具体的值即可**

按照思路 我们可以让AI帮我们写一份代码即可：

[JavaScript] *纯文本查看*

```

traverse(ast, {
    VariableDeclarator(path) {
        const { id, init } = path.node;
        if (t.isIdentifier(id) && t.isObjectExpression(init)) {
            const arrayName = id.name;
            init.properties.forEach(prop => {
                if (
                    t.isObjectProperty(prop) &&
                    t.isIdentifier(prop.key) &&
                    t.isNumericLiteral(prop.value) // 仅处理数值属性
                ) {
                    const fullKey = `${arrayName}.${prop.key.name}`;
                    numberMap[fullKey] = prop.value.value; // 记录数值
                }
            });
        }
    }
});

// 3. 替换所有 MemberExpression（如 Pm.B -> 2）
traverse(ast, {
    MemberExpression(path) {
        const { object, property } = path.node;
        if (
            t.isIdentifier(object) &&
            t.isIdentifier(property) &&
            numberMap[`${object.name}.${property.name}`] !== undefined
        ) {
            const fullKey = `${object.name}.${property.name}`;
            path.replaceWith(t.numericLiteral(numberMap[fullKey])); // 替换为数值
        }
    }
});

```

 **3.****主动调用字符串解密函数**经过前面两步，混淆已经变成了这个样子了：

![](https://attach.52pojie.cn/forum/202505/27/223601gyos0f8y1gy6ff6o.jpg)

大部分都是 类似
xxx 是一个数字
dT(xxx)  ci(xxx)   的样式
其实不管dT 还是 ci  还是其他 func(xxx) 这样形式的函数
通过静态分析和动态调试验证都可以发现 他们指向共同的一个函数 B3

我是直接把代码压缩一下放在补环境框架下，把B3导出，在AST解析出参数的时候 ，把参数放进去主动调用即可得到 字符串解密的结果
当然也可以不需要放到补环境框架，直接通过playwright 这些框架， 直接在原界面 浏览器环境下调用B3函数就可以了

所以思路如下
1.寻找所有引用B3的函数 ，把这些函数名 变回B3
2.对所有B3函数进行RPC主动调用 还原值

按照这份思路写一份代码 如下：

[JavaScript] *纯文本查看*

```
traverse(ast, {
    VariableDeclarator(path) {
        if (t.isIdentifier(path.node.init) && path.node.init.name === 'B3') {
            const binding = path.scope.getBinding(path.node.id.name);

            // 确保变量是常量且确实被引用了
            if (binding && binding.constant && binding.references > 0) {
                // 替换所有引用
                binding.referencePaths.forEach(ref => {
                    ref.replaceWith(t.identifier('B3'));
                });

                // 移除变量声明
                if (path.parent.declarations.length === 1) {
                    path.parentPath.remove(); // 整个 var 语句
                } else {
                    path.remove(); // 从多变量声明中移除单个声明
                }
            }
        }
    }
});

var B3=myExports.B3

traverse(ast, {
    CallExpression(path) {
      // 检查是否是 dT(数字) 这种调用
      if (t.isIdentifier(path.node.callee, { name: 'B3' }) &&
          path.node.arguments.length === 1 &&
          t.isNumericLiteral(path.node.arguments[0])) {

        const argValue = path.node.arguments[0].value;
        const result = B3(argValue);

        // 只替换dT调用部分，保留外部的成员表达式结构
        if (typeof result === 'string') {
          path.replaceWith(t.stringLiteral(result));
        } else if (typeof result === 'number') {
          path.replaceWith(t.numericLiteral(result));
        } else if (typeof result === 'boolean') {
          path.replaceWith(t.booleanLiteral(result));
        }
      }
    }
});
```

还原后发现存在一些静态字符串拼接的情况，类似第一步的情况，把字符串结果也一起静态计算出来

**4.****还原****B****函数混淆**

![](https://attach.52pojie.cn/forum/202505/27/223627pcdwutc6dpqemmdl.jpg)

现在所有的混淆就剩下了B["xxx"]这个混淆了

截取一部分B函数，他大概长这样

[JavaScript] *纯文本查看*

```
[/size]B = {
        'wccbh': function(c, M, s) {
            return c(M, s);
        },
        'trPRA': function(c, M) {
            return c + M;
        },
        'MoDGs': function(c, M) {
            return c(M);
        },
        'alnwk': function(c, M) {
            return c(M);
        },
        'WJPpE': function(c, M) {
            return c(M);
        },
        'LWatF': "acw_sc__v2",
        'IymRT': "[15,35, 29, 24, 33, 16, 1, 38, 10, 9, 19, 31, 40, 27, 22, 23, 25, 13, 6,11,39,18,20,8, 14, 21, 32, 26, 2, 30, 7, 4, 17, 5, 3, 28, 34, 37, 12, 36]",
        'wpbEy': "3000176000856006061501533003690027800375",
        'nSGQU': function(c, M) {
            return c < M;
        },
        'DSwHf': function(c, M) {
            return c == M;
        },
        'wICbM': function(c, M) {
            return c + M;
        },
        'ZJLgP': function(c, M) {
            return c ^ M;
        },
        'lPpIn': function(c, M, s) {
            return c(M, s);
        }[size=10.5pt],
```

B函数有字符串，有函数调用，也有一个表达式
当然我们希望还原的效果

B["wICbM"](a,b) ==>  a+b
B["LWatF"]   ==>"acw\_sc\_\_v2",B["lPpIn](a,b,c)==>a(b,c);

思路大概如下：
第一次遍历 收集B对象的所有的属性定义
根据类型（比如字符串、函数、表达式）分类存储到BMap中

然后第二次遍历
根据分类 替换所有B[...]的引用

思路明确了 剩下就是交给AI帮我们写一份代码了

[JavaScript] *纯文本查看*

```
const BMap = new Map();

traverse(ast, {
  // 处理变量声明（如 const B = {...}）
  VariableDeclarator(path) {
    // 检查是否是 B 对象的定义
    if (
      t.isIdentifier(path.node.id, { name: 'B' }) && // 变量名是 B
      t.isObjectExpression(path.node.init)          // 值是一个对象 {...}
    ) {
      // 遍历 B 对象的所有属性
      path.node.init.properties.forEach((prop) => {
        // 获取属性名（如 'wccbh'）
        const key = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value;

        // 情况1：属性值是字符串（如 'LWatF': "acw_sc__v2"）
        if (t.isStringLiteral(prop.value)) {
          BMap.set(key, {
            type: 'string',
            value: prop.value.value // 存储字符串值
          });
        }
        // 情况2：属性值是函数（如 'wccbh': function(c, M, s) {...}）
        else if (t.isFunctionExpression(prop.value) || t.isArrowFunctionExpression(prop.value)) {
          const body = prop.value.body;

          // 检查函数体是否是 return 语句（如 return c(M, s);）
          if (t.isBlockStatement(body) && body.body.length === 1 && t.isReturnStatement(body.body[0])) {
            const returnExpr = body.body[0].argument;

            // 子情况1：函数返回的是调用表达式（如 return c(M, s)）
            if (t.isCallExpression(returnExpr)) {
              BMap.set(key, {
                type: 'call',
                args: returnExpr.arguments.map(arg => arg.name) // 提取参数名 [c, M, s]
              });
            }
            // 子情况2：函数返回的是二元运算（如 return c + M）
            else if (t.isBinaryExpression(returnExpr)) {
              BMap.set(key, {
                type: 'binary',
                operator: returnExpr.operator // 提取运算符（如 '+'）
              });
            }
          }
        }
      });
    }
  },
});

// 5. 第二次遍历 AST，替换所有 B["xxx"] 的引用
traverse(ast, {
  // 1. 处理函数调用（如 B["wccbh"](a, b, c)）
  CallExpression(path) {
    const { callee } = path.node;

    // 防御性检查：确保 callee 合法
    if (!callee || !t.isMemberExpression(callee)) return;

    // 检查是否为 B["xxx"] 或 B.xxx 的形式
    if (
      t.isIdentifier(callee.object, { name: 'B' }) &&
      (t.isStringLiteral(callee.property) || t.isIdentifier(callee.property))
    ) {
      const key = t.isStringLiteral(callee.property)
        ? callee.property.value
        : callee.property.name;
      const mapping = BMap.get(key);
      if (!mapping) return;

      // 情况1：替换为直接调用（如 c(M) → func(args)）
      if (mapping.type === 'call') {
        // 确保至少有一个参数（函数）
        if (path.node.arguments.length < 1) return;

        const func = path.node.arguments[0];
        // 取第一个参数之后的所有参数
        const args = path.node.arguments.slice(1);

        path.replaceWith(t.callExpression(func, args));
      }
      // 情况2：替换为运算符（如 a + b）
      else if (mapping.type === 'binary' && path.node.arguments.length >= 2) {
        const [left, right] = path.node.arguments;
        path.replaceWith(t.binaryExpression(mapping.operator, left, right));
      }
    }
  },

  // 2. 处理属性访问（如 B["LWatF"]）
  MemberExpression(path) {
    const { object, property } = path.node;

    // 确保是 B 对象的属性访问
    if (!t.isIdentifier(object, { name: 'B' })) return;

    let key;
    if (t.isStringLiteral(property)) {
      key = property.value;
    } else if (t.isIdentifier(property)) {
      key = property.name;
    } else {
      return; // 非字符串或标识符属性不处理
    }

    const mapping = BMap.get(key);
    if (mapping?.type === 'string') {
      path.replaceWith(t.stringLiteral(mapping.value));
    }
  },
});
```

**5****完结**

至此大部分混淆已经去除 如图

![](https://attach.52pojie.cn/forum/202505/27/223647masw9dtfvqsawztx.png)

其实很多混淆壳 大多大同小异，AST也不必学到精益求精，学会几个常见的处理方式，帮我们把代码简化到大致能看的地步就好了
