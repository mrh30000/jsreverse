# 某招投标服务平台AST详细解析

> **作者**: mysticz | **发布时间**: 2025-09-27 11:06:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6356 / 26
> **原文**: [https://www.52pojie.cn/thread-2062927-1-1.html](https://www.52pojie.cn/thread-2062927-1-1.html)

---

##### 一、前言

网站：

`aHR0cHM6Ly9idWxsZXRpbi5jZWJwdWJzZXJ2aWNlLmNvbS94eGZiY21zZXMvc2VhcmNoL2J1bGxldGluLmh0bWw/ZGF0ZXM9MzAwJmNhdGVnb3J5SWQ9ODgmcGFnZT0xJnNob3dTdGF0dXM9MSZ0aW1lX18yNjUyPW40angyRGNEQmpEJTNEJTNEREtEc1RxQklLN0kxS09XRFJtWU9ZRA==`

适合AST学习

##### 二、定位参数

抓包可以看到`time__2652`参数是加密的，每一页都是不同的

![](https://attach.52pojie.cn/forum/202509/27/105914magggjbgsg9svesv.png)

不带这个参数的话会返回一个ob混淆的js。

通过调用栈可以定位到核心代码

```
V = m[lK(GF.m)](m[lK(GF.G)](m[lK(GF.k)](m[lK(GF.Q)](m[lK(GF.t)](L[lK(GF.b)](O), '|'), m[lK(GF.Y)](r)), '|'), new Date()[lK(GF.u)]()), '|1')
O = F['ua'](V, !(-0x1c67 + 0x544 + 0x1723))
```

O即为`time__2652`参数，但是混淆的太多，不利于我们扣代码。因此需要先解混淆

##### 三、还原数字数组

我们先看一下代码结构

![](https://attach.52pojie.cn/forum/202509/27/105945eokxb3oo8ybzo9eg.png)

可以看到是由一个字符串大数组和许多十六进制小数组组成。

在加密代码中`m[lK(GF.m)]`，由最里面的两个小数组在嵌套外面的大数组组成。因此我们先要还原`lK(GF.m)`两个十六进制小数组。

通过解析，可以看到都是`VariableDeclarator`类型初始化是`ObjectExpression`

![](https://attach.52pojie.cn/forum/202509/27/110004d6ijj7bzcuvc1r86.png)

因此先用type类型判断下

```
traverse(ast, {
    VariableDeclarator(path) {
        if (types.isObjectExpression(path.node.init)) {
        }
    }});
```

接着取id里面的name参数就是赋值参数，然后查找参数的绑定函数

```
let bingname = path.scope.getBinding(path.node.id.name);
let arrbd = bingname.referencePaths;
for (let i = 0; i < arrbd.length; i++) {
}
```

接下来找绑定函数的父对象。

```
arrbd[i].parentPath
```

即如下函数

![](https://attach.52pojie.cn/forum/202509/27/110028y33vqntjqjuv0qqd.png)

解析如下

![](https://attach.52pojie.cn/forum/202509/27/110051s6q8d6gg1b82qkmd.png)

接下来判断下类型是否是`MemberExpression`，并取其中的name参数

```
if (mempath.isMemberExpression()) {
    let propname = mempath.node.property.name
}
```

我们现在有了值，接下来返回前面把数组我们保存下来

![](https://attach.52pojie.cn/forum/202509/27/110116vipcucura5upe77i.png)

我们取`init`里面的`properties`，把`key`和`value`保存到一个数组里面。

```
let props = path.node.init.properties;
let obj = {};
for (let i = 0; i < props.length; i++) {
    obj[props[i].key.name] = props[i].value;
}
```

然后在下面匹配这个数组,并替换。

```
 if (types.isNumericLiteral(obj[propname])) {
     mempath.replaceWith(obj[propname])
 }
```

可以看到还原后的代码已经变灰，没有调用了.

![](https://attach.52pojie.cn/forum/202509/27/110135o02tb55p0ox05o9v.png)

##### 四、还原字符串数组

接下来我们还原第二层，字符串的数组还原

![](https://attach.52pojie.cn/forum/202509/27/110153sgak6wqh9gawswhp.png)

可以看到如图，e赋值到l0调用。而e调用了M和e函数进行偏移解密。

先判断类型，这时我们要限定一下name是e

```
traverse(ast, {
    VariableDeclarator(path) {
        if (types.isIdentifier(path.node.init, {name: 'e'})) {
        }
    }
});
```

然后继续找他的绑定函数

```
let bingname = mempath.scope.getBinding(mempath.node.id.name);
let arrbd = bingname.referencePaths;
for (let i = 0; i < arrbd.length; i++) {
    let mempath = arrbd[i].parentPath;
}
```

接下来判断下是否是`CallExpression`类型，并取arguments

![](https://attach.52pojie.cn/forum/202509/27/110216cho9lcbjibjkuiop.png)

```
if (mempath.isCallExpression()) {
    let argu = mempath.get('arguments') + '';
}
```

我们把e函数剪切出来放到最上面，并且把检测函数去掉。

```
b['prototype']['LdIFdg'] = function() {
    var Y = new RegExp(this['JbuAMo'] + this['DNmxyA'])
        , u = Y['test'](this['UULPjk']['toString']()) ? --this['OEswPC'][0x75d * 0x5 + -0x17ee + -0xce2] : --this['OEswPC'][0x26fb + 0x191 * -0x10 + -0xdeb];
    return this['MxGFtc'](u);
}
//改为
b['prototype']['LdIFdg'] = function() {
var Y = new RegExp(this['JbuAMo'] + this['DNmxyA'])
    , u = --this['OEswPC'][0x75d * 0x5 + -0x17ee + -0xce2];
return this['MxGFtc'](u);
}
```

然后直接调用替换即可

```
let vl = e(argu)
mempath.replaceWith(types.stringLiteral(vl))
```

最后可以看到混淆代码嵌套调用，**因此要进行判断循环**。

![](https://attach.52pojie.cn/forum/202509/27/110232hqxucgz9mml1mgxi.png)

##### 五、还原字符串大数组

接下来剩最后一个m数组。因为包含字符串和函数，我们最后处理。

![](https://attach.52pojie.cn/forum/202509/27/110251c6js16b26bj1kd1s.png)

跟上面一样，先判断类型，在查找绑定，最后写入数组进行查询替换。

```
VariableDeclarator(path) {
    if (types.isObjectExpression(path.node.init)) {
        let props = path.node.init.properties;
        let obj = {};
        for (let i = 0; i < props.length; i++) {
            obj[props[i].key.value] = props[i].value;
        }
        let bingname = path.scope.getBinding(path.node.id.name);
        let arrbd = bingname.referencePaths.reverse();
        for (let i = 0; i < arrbd.length; i++) {
            let mempath = arrbd[i].parentPath;
            if(mempath.isMemberExpression()){
                let arg=mempath.node.property.value
                if(types.isStringLiteral(obj[arg])){
                    mempath.replaceWith(obj[arg])
                }
            }
        }
    }
}
```

因为这个数组的`FunctionExpression`类型下有`CallExpression`和`BinaryExpression`两个类型。因此我们要分开处理

![](https://attach.52pojie.cn/forum/202509/27/110310ojs3ouwwzoocuwsk.png)

继续在`if(types.isStringLiteral(obj[arg]))`下写判断。

我们先判断是否是函数类型。接着取函数的body。然后对`CallExpression`和`BinaryExpression`两个类型进行判断。

当为`CallExpression`类型时取参数和调用，写入到原来的path替换

当为`BinaryExpression`类型时取left，right和operator，写入到原来的path替换

```
else if(types.isFunctionExpression(obj[arg])){
    let bd=obj[arg].body.body
    if(bd.length===1&&types.isReturnStatement(bd[0])){
        let argu=bd[0].argument;
        if(types.isCallExpression(argu)){
            let argus=mempath.parent.arguments;
            let calleename=argus[0];
            let newcall=types.callExpression(calleename,argus.slice(1))
            mempath.parentPath.replaceWith(newcall)
        }else if(types.isBinaryExpression(argu)){
            let argus=mempath.parent.arguments;
            let left=argus[0];
            let right=argus[1];
            let newcall=types.binaryExpression(argu.operator,left,right)
            mempath.parentPath.replaceWith(newcall)
        }
    }
}
```

至此我们就完成了大部分还原

![](https://attach.52pojie.cn/forum/202509/27/110341sbi9ss7lmx7x2f92.png)

##### 六、参数`time__2652`生成

还原后我们就可以很明显看到核心代码了

```
let data=sig(O) + '|' + r() + '|' + new Date()["getTime"]() + '|1'
console.log(ua(data))
```

![](https://attach.52pojie.cn/forum/202509/27/110626bfgfo25y549v79yt.png)

只有46行

##### 总结

网站难度不高，就是嵌套的很繁琐。有兴趣的朋友可以试试。
