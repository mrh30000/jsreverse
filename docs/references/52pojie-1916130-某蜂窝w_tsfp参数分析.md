# 某蜂窝w_tsfp参数分析

> **作者**: kylin1020 | **发布时间**: 2024-04-21 18:46:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8318 / 30
> **原文**: [https://www.52pojie.cn/thread-1916130-1-1.html](https://www.52pojie.cn/thread-1916130-1-1.html)

---

*本帖最后由 kylin1020 于 2024-4-22 10:22 编辑*

## 某蜂窝w\_tsfp参数分析

### 声明

`本文章中所有内容仅供学习交流使用，不用于其他任何目的，不提供完整代码，抓包内容、敏感网址、数据接口等均已做脱敏处理，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关.本文章未经许可禁止转载，禁止任何修改后二次传播，擅自使用本文讲解的技术而导致的任何意外，作者均不负责，若有侵权，请联系作者立即删除.`

### 目标地址

```
aHR0cHM6Ly93d3cubWFmZW5nd28uY24v
```

### 参数来源分析

新建新的无痕窗口，打开devtools并浏览目标地址，浏览器停在了一处动态加载的debugger代码中, 该段js代码可以分析出由Function.constructor动态构造得到, 所以直接在console中hook掉debugger的构造函数，使其失效:

![](https://attach.52pojie.cn/forum/202404/21/182722p8dd3dd8d2kwduda.png)

![](https://attach.52pojie.cn/forum/202404/21/182751jlz4jzrijxybhqly.png)

```
Function.prototype.original_constructor= Function.prototype.constructor;
Function.prototype.constructor=function(){
    if (arguments && typeof arguments[0]==="string"){
        if (arguments[0]==="debugger")
            return;
    }
        return Function.prototype.original_constructor.apply(this, arguments);
};
```

![](https://attach.52pojie.cn/forum/202404/22/101040cejtc0hen3ncv1t1.png)

点击继续:

![](https://attach.52pojie.cn/forum/202404/22/101114l8ithkht0i8fpeia.png)

![](https://attach.52pojie.cn/forum/202404/22/101151k26ccis2c5t03csx.png)

查看网络请求可以知道，请求了两次目标地址，其中第一次请求只返回了一个空的`x-waf-captcha-referer`参数

![](https://attach.52pojie.cn/forum/202404/22/101231mzjwue450owouwe0.png)

两次目标地址请求间加载了一个`probe.js`文件，之后发起第二次请求, 此时携带了一个`w_tsfp`参数并且成功返回网页内容.

![](https://attach.52pojie.cn/forum/202404/22/101301h64l9l4ok458zozm.png)

![](https://attach.52pojie.cn/forum/202404/22/101400o39irvfr3y43h009.png)

由此可以基本断定`w_tsfp`参数在`probe.js`中生成.

### 解混淆

打开`probe.js`, 在js文件加载入口函数处打上断点, 然后对其进行分析.

![](https://attach.52pojie.cn/forum/202404/22/101431tuohu36m6ltoax3h.png)

可以知道该js文件进行了一些常规混淆, 例如大量使用了字符串函数(指调用了某个函数返回特定字符串的函数，该函数目的是为了隐藏字符串), 控制流平坦化等.

![](https://attach.52pojie.cn/forum/202404/22/101457mf9f9d9vdj2wmm9f.png)

![](https://attach.52pojie.cn/forum/202404/22/101515b7uzuibbztf9b3zu.png)

#### 1.1 还原字符串函数

通过分析可以发现，`probe.js`任意一个字符串函数都源自`a1i`根字符串函数并且参数都是透传的，没有加上任何偏移:

![](https://attach.52pojie.cn/forum/202404/22/101542lfjvyzjimvff90vg.png)

![](https://attach.52pojie.cn/forum/202404/22/101618tdmif3qqdwchiywl.png)

![](https://attach.52pojie.cn/forum/202404/22/101643pmzx0rc0sqxc9km2.png)

因此可以先使用babel遍历所有字符串函数，得到所有参数变化列表，之后在console中计算得到所有字符串值；根据这些字符串值再将原js中的字符串函数调用替换为对应字符串。

首先需要找到字符串函数调用的特征, 通过观察结构可以知道任何一个字符串函数调用都带有两个参数，其中第一个参数是一个十六进制数字，第二个参数是一个字符串，并且函数名长度很短, 总是2(除了`a1i`函数)。

![](https://attach.52pojie.cn/forum/202404/22/101710gdmdpzizp58mf8hj.png)

因此可以根据这些特征找到所有字符串函数调用:

```
const parser = require("@babel/parser");
const types = require("@babel/types");
const generator = require("@babel/generator").default;
const traverse = require("@babel/traverse").default;
const fs = require("fs");

const input_file = "probe.js";
const output_file = "probe.output.js";

const js_content = fs.readFileSync(input_file, "utf-8");
const ast = parser.parse(js_content);

const stringFuncItems = [];

traverse(ast, {
    CallExpression: {
        // 找出所有字符串函数调用并记录参数
        enter: function (path) {
            const { node } = path;

            // 只有两个参数的函数调用
            if (!types.isIdentifier(node.callee) || node.arguments.length !== 2) {
                return;
            }

            // 函数名长度不大于3
            if (node.callee.name.length > 3) {
                return;
            }

            const arg0 = node.arguments[0];
            const arg1 = node.arguments[1];

            // 第一个参数是数字，第二个参数是字符串
            if (!types.isNumericLiteral(arg0) || !types.isStringLiteral(arg1)) {
                return;
            }

            stringFuncItems.push([arg0.value, arg1.value]);
        }
    }
});

console.log(JSON.stringify(stringFuncItems));
```

![](https://attach.52pojie.cn/forum/202404/22/101750rc8au0c3tva5l3tt.png)

之后将结果拷贝到console中，断点停在js文件函数入口处或任意一处含有字符串函数的地方, 准备调用实际字符串函数得到每个参数对应的字符串:

![](https://attach.52pojie.cn/forum/202404/22/101819nmnmpnmn7msbh4pk.png)

```
words = {}
for (let [i, v] of items) {
    words[`${i}-${v}`] = a1i(i, v);
}
```

得到所有字符串:

![](https://attach.52pojie.cn/forum/202404/22/101842wedh3ir3fs8hiyeh.png)

将所有字符串拷贝到代码中，准备开始替换：

![](https://attach.52pojie.cn/forum/202404/22/101914h4ehif6fgi5piijj.png)

```
const parser = require("@babel/parser");
const types = require("@babel/types");
const generator = require("@babel/generator").default;
const traverse = require("@babel/traverse").default;
const fs = require("fs");

const input_file = "probe.js";
const output_file = "probe.output.js";

const js_content = fs.readFileSync(input_file, "utf-8");
const ast = parser.parse(js_content);

const words = {
  // 这里仅是示例，实际为上一步得到的所有字符串
 // 这里仅是示例，实际为上一步得到的所有字符串
};

traverse(ast, {
    CallExpression: {
        // 找出所有字符串函数调用并记录参数
        enter: function (path) {
            const { node } = path;

            // 只有两个参数的函数调用
            if (!types.isIdentifier(node.callee) || node.arguments.length !== 2) {
                return;
            }

            if (node.callee.name.length > 3) {
                return;
            }

            const arg0 = node.arguments[0];
            const arg1 = node.arguments[1];

            // 第一个参数是数字，第二个参数是字符串
            if (!types.isNumericLiteral(arg0) || !types.isStringLiteral(arg1)) {
                return;
            }

            // 得到字符串
            const value = words[`${arg0.value}-${arg1.value}`];
            if (!value) {
                return;
            }

            //替换
            path.replaceWith(types.stringLiteral(value));

            // 打印替换的结果
            console.log(`${generator(node).code} 替换为字符串: "${value}"`);
        }
    }
});

const {code} = generator(ast);

fs.writeFileSync(output_file, code);
```

![](https://attach.52pojie.cn/forum/202404/21/183418dopv0tqjfn77p057.png)

查看`probe.output.js`文件可以知道，字符串函数已经替换完成:

![](https://attach.52pojie.cn/forum/202404/21/183441vvazf2mvak6kpquq.png)

#### 1.2 MemberExpression常量传播

还原字符串函数之后, 可以看到有很多访问变量某个属性的情况且这些属性的值是不变的，可能是字符串或一些数字, 这些MemberExpression表达式可以替换为对应的字符串或数字，使得理解代码逻辑更简单些:

![](https://attach.52pojie.cn/forum/202404/21/183457zh5zyxgvuggt1jh2.png)

```
// 尝试获取获取常量
function tryGetConstant(value, scope, binding, targetPropertyName) {

    // 字符串类型直接返回值
    if (types.isStringLiteral(value)) {
        return value.value;
    }

    // 数字类型直接返回值
    if (types.isNumericLiteral(value)) {
        return value.value;
    }

    // 变量的话查找其初始值
    if (types.isIdentifier(value)) {
        binding = scope.getBinding(value.name);
        if (!binding) {
            return;
        }
        return tryGetConstant(binding.path.node.init, binding.scope, binding);
    }

    // memberExpression的话需要其object属性的变量初始值，如果初始值中有对应property的属性，则可以直接拿其属性，否则
    // 找所有赋值语句，看赋值语句中有没有property属性
    if (types.isMemberExpression(value)) {
        if (!types.isIdentifier(value.object)) {
            return;
        }
        binding = scope.getBinding(value.object.name);
        if (!binding) {
            return;
        }
        const objectInit = binding.path.node.init;
        targetPropertyName = targetPropertyName || value.property.value || value.property.name;
        if (types.isObjectExpression(objectInit)) {
            const properties = objectInit.properties;
            for (const pro of properties) {
                const key = pro.key.name || pro.key.value;
                if (key === targetPropertyName) {
                    return tryGetConstant(pro.value, binding.scope, binding);
                }
            }
            // 从赋值语句中查找
            for (const ref of binding.referencePaths) {
                if (!types.isAssignmentExpression(ref.parentPath.parent)) {
                    continue;
                }
                const assign = ref.parentPath.parent;
                if (!types.isMemberExpression(assign.left)) {
                    continue;
                }
                if (assign.left.object !== value.object) {
                    continue;
                }
                const property = assign.left.property;
                if (types.isIdentifier(property) && property.name === targetPropertyName) {
                    return tryGetConstant(assign.right, binding.scope, binding);
                }
            }
        } else if (types.isIdentifier(objectInit)) {
            // object是变量的话，继续找
            binding = scope.getBinding(objectInit.name);
            if (!binding) {
                return;
            }
            return tryGetConstant(binding.path.node.init, binding.scope, binding, targetPropertyName);
        }
    }
}

// 常量传播
function MemberExpressionConstantPropagation(path) {
    const { node } = path;

    // 只需要类似于 A["xxx"]这样的member expression, 其中xxx是一个字符串, 例如 A["AaWYl"]
    if (!types.isIdentifier(node.object) || !types.isStringLiteral(node.property)) {
        return;
    }
  // 赋值语句排除，例如: A["xxx"] = "hello"; 这种语句不需要替换。
    if (types.isAssignmentExpression(path.parent) && node === path.parent.left) {
        return;
    }
    const binding = path.scope.getBinding(node.object.name);
    const value = tryGetConstant(node, path.scope, binding);
    if (!value) {
        return;
    }
    path.replaceWith(types.valueToNode(value));
    console.log(`常量传播: ${node.object.name}["${node.property.value}"] -> "${value}"`);
}

traverse(ast, {
    MemberExpression: {
        exit: [
            MemberExpressionConstantPropagation
        ]
    }
});
```

![](https://attach.52pojie.cn/forum/202404/21/183516fppp69l09z37360l.png)

前后对比：

![](https://attach.52pojie.cn/forum/202404/21/183552ag6xb0ny3rrnb0yw.png)

#### 1.3 消除一句话函数

![](https://attach.52pojie.cn/forum/202404/21/183604ma777xii3advtljq.png)

![](https://attach.52pojie.cn/forum/202404/21/183618we2uhx7xylh7pynl.png)

可以看到js代码中很多上图这种函数调用，其函数代码中只有一句return 语句是有用的（通常只有一行return语句），这些函数作用是隐藏各种运算表达式，例如：

```
B = {
                // 其他函数

      'eViYz': function (M, i) {
        return M(i);
      }
    };

 // 函数调用
B["eViYz"](t, 0x0);
```

其中`B["eViYz"](t, 0x0)`应该简化为`t(0x0)`

![](https://attach.52pojie.cn/forum/202404/21/183632bj2fsye9efcj2tec.png)

![](https://attach.52pojie.cn/forum/202404/21/183651ykv2c268uvuuxv3b.png)

![](https://attach.52pojie.cn/forum/202404/21/183703n7pz31qpvp8yyy5p.png)

通过观察其函数特征可以知道这种函数其callee一般是MemberExpression并且函数的body只有一行或只有两行，其中一行是完全没用的变量定义，据此可以筛选出这些一句话函数并进行替换:

```
function tryGetFunction(v, scope, targetName, binding) {
    if (types.isIdentifier(v)) {
        binding = scope.getBinding(v.name);
        if (!binding) {
            return ;
        }
        if (binding.kind === "param") {
            return;
        }
        return tryGetFunction(binding.path.node.init, binding.scope, targetName, binding);
    }
    if (types.isObjectExpression(v)) {
        const properties = v.properties;
        for (const pro of properties) {
            const key = pro.key.name || pro.key.value;
            if (key === targetName) {
                return [pro.value, scope];
            }
        }

        if (!binding) {
            return ;
        }

        // 从赋值语句中查找
        for (const ref of binding.referencePaths) {
            if (!types.isAssignmentExpression(ref.parentPath.parent)) {
                continue;
            }
            const assign = ref.parentPath.parent;
            if (!types.isMemberExpression(assign.left)) {
                continue;
            }
            if ((assign.left.property.name || assign.left.property.value) === targetName) {
                return [assign.right, ref.parentPath.parentPath.scope];
            }
        }
    }
}

function handleSimpleCallExpression(path) {

    const {node} = path;
    if (!types.isMemberExpression(node.callee) || !types.isIdentifier(node.callee.object)) {
        return;
    }
    const calleeBinding = path.scope.getBinding(node.callee.object.name);
    if (!calleeBinding) {
        return;
    }
    let func = null;
    let funcScope = null;

    const targetName = node.callee.property.name || node.callee.property.value;
    const info = tryGetFunction(calleeBinding.path.node.init, calleeBinding.scope, targetName, calleeBinding.scope.getBinding(node.callee.object.name));
    if (Array.isArray(info)) {
        func = info[0];
        funcScope = info[1];
    }

    if (func === null || funcScope === null) {
        return;
    }
    if (!types.isFunctionExpression(func)) {
        return;
    }
    let returnStatement = null;
    // 只有一个return语句
    if (func.body.body.length === 1 && types.isReturnStatement(func.body.body[0])) {
        returnStatement = func.body.body[0];

    } else if (func.body.body.length === 2) {
        // 可能有一个return语句, 一个var语句, 例如:
        // FhNDr: function (t, r) {
        //                       return ut["AaWYl"](t, r);
        //                       var n, e, o, i;
        //                     },
        // eljBu: function (t, r) {
        //                       return ut["UlYjQ"](t, r);
        //                       var n, e;
        //                     }
        if (types.isReturnStatement(func.body.body[0]) && types.isVariableDeclaration(func.body.body[1])) {
            returnStatement = func.body.body[0];
        } else if (types.isReturnStatement(func.body.body[1]) && types.isVariableDeclaration(func.body.body[0])) {
            returnStatement = func.body.body[1];
        }
    }

      if (!returnStatement) {
        return;
    }

    if (!types.isCallExpression(returnStatement.argument) && !types.isBinaryExpression(returnStatement.argument) && !types.isLogicalExpression(returnStatement.argument)) {
        return;
    }
}

traverse(ast, {
    CallExpression: {
        exit: [
            handleSimpleCallExpression
        ]
    }
});
```

开始遍历替换:

```
function handleSimpleCallExpression(path) {
  // 其余代码...

  // 寻找function的path
    let funcPath = null;
    funcScope.path.traverse({
        FunctionExpression: function (mpath) {
            const {node: mnode} = mpath;
            if (mnode === func) {
                funcPath = mpath;
                mpath.skip();
            }
        }
    });

    if (funcPath === null) {
        return;
    }

    // 得到传入参数节点和函数参数节点的对应关系, 准备将return表达式中的所有设计这些函数参数的替换为实际的传入参数.
    const paramToArgument = {};
    for (let i = 0; i < func.params.length; i++) {
        const param = func.params[i];
        const argument = node.arguments[i];
        if (typeof argument === "undefined") {
            break;
        }
        paramToArgument[param.name] = argument;
    }

    const beforeCode = generator(node).code;

    // 替换先实现保留原来的function定义
    const originalFunc = types.cloneNode(func, true);

    // 遍历替换对应节点
    funcPath.traverse({
        Identifier: function (mpath) {
            const { node: mnode } = mpath;
            if (paramToArgument[mnode.name]) {
                mpath.replaceWith(paramToArgument[mnode.name]);
                mpath.skip();
            }
        }
    });

    const afterCode = generator(funcPath.node.body.body[0].argument).code;

    // 替换函数调用为return语句中的argument表达式
    path.replaceInline(returnStatement.argument);

    // 还原原来的function
    funcPath.replaceInline(originalFunc);

    console.log(`简化函数调用: ${beforeCode.slice(0, 30)}... -> ${afterCode.slice(0, 30)}...`);
}
```

![](https://attach.52pojie.cn/forum/202404/21/183726cmwgza3bcxa7akk9.png)

前后对比效果：

![](https://attach.52pojie.cn/forum/202404/21/183741f9a9cdw1lfzfwdfb.png)

然后再将BinaryExpression可以计算出常量的语句替换为常量，例如:

![](https://attach.52pojie.cn/forum/202404/21/183757srmd88swnpo5xdwo.png)

#### 1.4 BinaryExpression常量计算

针对一些可以直接得到结果的BinaryExpression表达式，使用babel path自带的evaluate计算得到值，在这里只应用字符串类型:

```
function BinaryExpressionConstantCalculation(path) {
    const { confident, value } = path.evaluate();
    if (!confident) {
        return;
    }
    // 只应用字符串类型
    if (typeof value !== "string") {
        return;
    }
    console.log(`常量计算: ${generator(path.node).code} -> ${value}`);
    path.replaceWith(types.valueToNode(value));
}
```

![](https://attach.52pojie.cn/forum/202404/21/183816o402y09jmmjkylm0.png)

![](https://attach.52pojie.cn/forum/202404/21/183827xk46jzax6hq45uzq.png)

此时阅读代码逻辑已经基本很清晰了，还有一些控制流混淆和一些无用代码没有使用babel 整理，但是都比较简单，基本不影响理解其代码逻辑，在此不展开了，感兴趣或想练手的朋友继续编写babel操作ast还原的代码。

### 参数分析

原本打算直接使用overwrite content替换为还原后的js代码进行断点分析，但是发现替换后会使得页面变为空白，不过这不影响，直接参照还原后的js找到对应的代码行进行断点分析即可。

![](https://attach.52pojie.cn/forum/202404/21/183852isbwxx6pibt46qzj.png)

代码中搜索关键词"w\_tsfp"得到15处搜索结果，找出其中可能有生成逻辑的代码：

![](https://attach.52pojie.cn/forum/202404/21/183904zjgnbmg77jbkenzn.png)

经过查找发现其中一处有诸多参数生成逻辑，极有可能是`w_tsfp`参数的生成逻辑代码:

![](https://attach.52pojie.cn/forum/202404/21/183917z8www5mwwgjii5w8.png)

![](https://attach.52pojie.cn/forum/202404/21/184035ytrct7xzcr7w4mzc.png)

之后找到原js中对应的代码段打上断点，如果有经过这里，基本敲定是这里生成的`w_tsfp`:

![](https://attach.52pojie.cn/forum/202404/21/184052wugqe0zud9usq7e4.png)

经过断点确认确实是这里，因此只需要分析这段代码的逻辑即可:

![](https://attach.52pojie.cn/forum/202404/21/184109un9ci71hli9zhclp.png)

#### 2.1 function(G, C)函数

先来看function(G, C)这个函数

![](https://attach.52pojie.cn/forum/202404/21/184121s9ffi6l6zwk00l1f.png)

很容易看出来是一个rc4加密算法，G是key，C是value, 其中key是固定的:

![](https://attach.52pojie.cn/forum/202404/21/184135fi4bnvdfn8kfckv8.png)

![](https://attach.52pojie.cn/forum/202404/21/184152vsm1b1kb8nacqnzb.png)

![](https://attach.52pojie.cn/forum/202404/21/184207fllgl0eh8llr22jr.png)

如果事先不知道rc4算法，导致不知道这段代码的做什么操作，也可以先将控制流手动还原下，把代码抠出来问下大模型即可:

![](https://attach.52pojie.cn/forum/202404/21/184221cznr6cfhl7xfon6h.png)

由于已知key，因此可以尝试将w\_tsfp解密出来校验下是不是真的是rc4算法:

![](https://attach.52pojie.cn/forum/202404/21/184236qjpj58gpam5umgmk.png)

#### 2.2 basets/loadts/timestamp

这3个参数全部来自`c = parseInt(new Date()["getTime"]()`

#### 2.3 fingerprint参数

核心代码, 其中c是`2.2`的timestamp

```
h = v(JSON["stringify"](window["pacus"]), c)
```

`window["pacus"]`可以在console中查看，有一大堆参数:

![](https://attach.52pojie.cn/forum/202404/21/184253msvwltv9wmng9gwr.png)

手动在console中执行下，发现每次都生成不同的32位字符串:

![](https://attach.52pojie.cn/forum/202404/21/184312l1lefp0v55if8s81.png)

先分析下v函数, 代码从return开始往回看，追踪相关代码:

![](https://attach.52pojie.cn/forum/202404/21/184325ausgs1gztztlnkos.png)

可以明显看出是一个md5算法，其中四个幻数和MD5 每轮需要加的常数也都对上了，似乎没有魔改。继续往上看:

![](https://attach.52pojie.cn/forum/202404/21/184336h8ray75r57j4vycv.png)

实际参与运算的是R变量，R变量由Z + J得到, Z和J都是传入进来的参数。

![](https://attach.52pojie.cn/forum/202404/21/184405io574z7raqi7gh45.png)

不过如果Z和J如果是固定的值，则md5值应该是不会变得，但是console中每次运算都会返回一个新的32位，因此要找下这两个参数是不是有哪一步被变更了:

![](https://attach.52pojie.cn/forum/202404/21/184416hotuvxtyyxdfxe0x.png)

![](https://attach.52pojie.cn/forum/202404/21/184427no8l1ekx9glue58g.png)

通过查看Z的引用可以看到当调用v函数时，如果传入的arguments没有第三个参数，则会给Z加上32位的随机字符串，因此在console中每次执行才会返回不同的32位字符串（只传入了两个参数），所以fingerprint实际上是随机的32位md5字符串。除此之后，还需要校验下md5有没有魔改，如果有魔改则需要找出魔改点并复现: 已知v函数传入三个参数可以不加32位随机字符串，因此可以在console中执行如下操作：

![](https://attach.52pojie.cn/forum/202404/21/184441zzamk4o545booop4.png)

![](https://attach.52pojie.cn/forum/202404/21/184452pi0fee6v4cvl7zmz.png)

可以看到此时的结果是固定的，而且实际参与运算的只有前两个参数, 其md5值与"12"的md5值完全一致, 因此v函数md5算法没有魔改.

#### 2.4 checksum参数

核心代码, 其中`J`是`window["location"]["href"]`, `h`是fingerprint参数

```
A["checksum"] = v(J + h, new Date()["getTime"]())
```

由于传入的参数只有两个，因此checksum参数也是随机32位md5值

#### 2.5 fingerprint和checksum二次加载分析

通过`2.3`和`2.4`的分析知道fingerprint和checksum都是随机的，这很令人疑惑. 经过继续查看网络请求可以知道，`probe.js`在第二次请求目标地址之后又重新加载了一次，此时的`probe.js`代码与第一次加载的`probe.js`稍有不同:

![](https://attach.52pojie.cn/forum/202404/21/184508en53ajg33kg5ggra.png)

第二次加载的`probe.js`混淆方式与第一次加载的大同小异，按照上述方法还原之后全文搜索`checksum`关键词:

![](https://attach.52pojie.cn/forum/202404/21/184522ibp0faa6bfupazub.png)

![](https://attach.52pojie.cn/forum/202404/21/184533vymmm45t64taum4i.png)

![](https://attach.52pojie.cn/forum/202404/21/184545ei1bpwz1pwewoooe.png)

可以知道，其中:

```
L["checksum"] = z(P, L["timestamp"], I)
```

传入了三个参数其中P是uri, I是localStorage中存的fingerprint（为第一次生成的随机fingerprint值）， `v`函数变为了`z`函数，`z`函数内部似乎也有一些不同，不过还是标准md5算法，只是多了一个参数N4(P和x是传入参数), 这个N4实际是fingerprint值.

### 感悟总结

`probe.js`混淆用到的都是很常见的方式，还原很容易，不过调试似乎有点麻烦。
