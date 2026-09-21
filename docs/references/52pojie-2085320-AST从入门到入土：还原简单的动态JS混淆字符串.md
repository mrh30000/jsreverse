# AST从入门到入土：还原简单的动态JS混淆字符串

> **作者**: mysticz | **发布时间**: 2026-01-09 09:24:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3050 / 12
> **原文**: [https://www.52pojie.cn/thread-2085320-1-1.html](https://www.52pojie.cn/thread-2085320-1-1.html)

---

*本帖最后由 mysticz 于 2026-1-14 15:46 编辑*

##### 声明

###### 本文写于2026年1月8日,仅做技术学习交流。**⚠️ 重要提示：** 本文章中所有内容仅供学习交流使用，不用于其他任何目的，不提供完整代码，抓包内容、敏感网址、数据接口等均已做脱敏处理，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关！

---

##### 一、前言

在网页开发中，我们经常会遇到网站使用动态混淆JS的情况，每次请求返回的JS代码都不一样，增加了逆向分析的难度。

例如吾爱的waf系统，本次我们就以吾爱的waf为例

上一次我们是手动还原，本次探讨动态js的自动字符串还原

`aHR0cHM6Ly93d3cuNTJwb2ppZS5jbi9ob21lLnBocD9tb2Q9dGFzayZkbz1hcHBseSZpZD0yJnJlZmVyZXI9XiVeMkY=`

##### 二、分析动态规律

动态混淆的JS代码看似每次都不同，但实际上必然存在规律，否则无法与后端进行有效的数据校验。因此，我们需要先找出其动态变化的规律。

###### 1. JS代码结构分析

通过多次请求对比，我们可以发现每次返回的JS代码都由以下几部分组成：

* 一个自执行函数
* 一个字符串数组
* 两个解密函数

![](https://attach.52pojie.cn/forum/202601/09/092257h3p77p51d735d0ap.png)

###### 2. AST节点类型识别

通过AST解析工具分析，我们可以确定这些函数对应的AST节点类型：

* 自执行函数：`ExpressionStatement`类型
* 解密函数：`FunctionDeclaration`类型

##### 三、使用AST还原混淆

###### 1. 匹配关键函数

我们可以使用AST遍历，匹配出这些关键函数：

```
all_eval = []
traverse(ast, {
  ExpressionStatement(path) {
      let {callee, arguments} = path.node.expression
      try {
          if(types.isIdentifier(arguments[0]) && types.isNumericLiteral(arguments[1])) {
              all_eval.push(path)
          }
      } catch(e) {}
  },
  FunctionDeclaration(path) {
    let {body} = path.node
    let bodylist = body.body
    let jsdata = path.toString()

    if(types.isVariableDeclaration(bodylist[0]) && types.isReturnStatement(bodylist[2])) {
        all_eval.push(path)
    }

    if(jsdata.includes('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=')) {
        all_eval.push(path)
    }
  }
})
```

###### 2. 提取解密函数

匹配到关键函数后，我们将它们转换为可执行代码：

```
let codes = []
for (const p of all_eval) {
    codes.push(generator(p.node).code)
}
let hy_codes = generator(parser.parse(codes.join('\n\n')), {compact: true}).code
```

###### 3. 识别解密调用

接下来，我们需要识别JS代码中的解密调用，例如：

```
function ij(b, x) {
    return n(x - -'0x24a', b)
}
function uL(b, x) {
    return ij(b, x - -'0x11e')
}
function ux(b, x) {
    return uL(b, x - '0x202')
}
```

我们可以通过遍历AST识别这些解密函数：

```
let smcodes = []
traverse(ast, {
    FunctionDeclaration(path) {
        let {body} = path.node
        let bodylist = body.body

        if(bodylist.length !== 1) {
            return
        }

        if(!types.isReturnStatement(bodylist[0])) {
            return
        }

        smcodes.push(path.node)
    }
})
```

###### 4. 执行解密并替换

最后，我们遍历所有的`CallExpression`节点，执行解密函数并替换原表达式：

```
traverse(ast, {
    CallExpression(path) {
        let {callee, arguments} = path.node

        if(arguments.length !== 2) {
            return
        }

        if(types.isIdentifier(arguments[0])) {
            return
        }

        try {
           let data = eval(path.toString())
            path.replaceWith(types.valueToNode(data))
        } catch (e) {}
    }
})
```

##### 四、还原效果

通过以上步骤，我们可以成功还原动态混淆的JS代码，得到清晰可读的原始代码：

![](https://attach.52pojie.cn/forum/202601/09/092327smrsqrv2vhjjn8rt.png)

##### 五、总结

本文介绍了如何使用AST技术还原简单的动态JS混淆字符串，主要步骤包括：

1. 分析JS代码的动态规律
2. 使用AST匹配关键解密函数
3. 提取并转换解密函数为可执行代码
4. 识别解密调用并执行
5. 替换原表达式为解密结果

这种方法适用于大多数简单的动态JS混淆，可以帮助我们理解和分析网站的加密逻辑。对于更复杂的混淆，可能需要结合更多的技术手段，如动态调试、污点分析等。

签到脚本放到github上了：

`https://github.com/jwmycz/py52pojie`

签到完成示例

![](https://attach.52pojie.cn/forum/202601/09/092342ti95gxvnl5v2895v.png)

---

###### 本文章未经许可禁止转载，禁止任何修改后二次传播，擅自使用本文讲解的技术而导致的任何意外，作者均不负责，若有侵权，请联系作者立即删除！
