# AST自动插桩jsvmp的简单实现

> **作者**: buluo533 | **发布时间**: 2025-12-10 21:13:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5341 / 28
> **原文**: [https://www.52pojie.cn/thread-2079058-1-1.html](https://www.52pojie.cn/thread-2079058-1-1.html)

---

本文章中所有内容仅供学习交流使用，不用于其他任何目的，不提供完整代码，抓包内容、敏感网址、数据接口等均已做脱敏处理，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关.本文章未经许可禁止转载，禁止任何修改后二次传播，擅自使用本文讲解的技术而导致的任何意外，作者均不负责

项目地址：https://github.com/buluo533/vmp\_demo
工作上有对vmp的需求，动态vmp手动插桩效率太低，听说大佬有ast的一键插桩，自己找了一个demo捣鼓了一下，没想到成了。

**一、环境配置**

[JavaScript] *纯文本查看*

```
npm install @babel/parsernpm install @babel/traverse
npm install @babel/generator
npm install @babel/types
```

[JavaScript] *纯文本查看*

```
let parse = require("@babel/parser").parse;let traverse = require("@babel/traverse").default;
let generator = require("@babel/generator").default;
let fs = require("fs");
let type = require("@babel/types");

let js_code = fs.readFileSync("vmpdemo2.js", encoding = "utf-8");
let ast = parse(js_code)

// 核心代码逻辑

let code = generator(ast).code
fs.writeFileSync("./vmp_demo2插桩后.js", code, "utf-8");
```

**二、样本vmp代码逻辑**
   需要对vmp有基本的了解，vmp的插桩点主要是在各种运算符和通过call和apply进行的函数调用，某皮的vmp同时带有控制流的混淆处理，需要先解混淆再进行插桩。以简单结构的vmp作为测试案例，分析vmp动态插桩的实现方案。

**1、前置处理**

![](https://attach.52pojie.cn/forum/202512/10/205503bysm2mwxlniicjyu.png)

   jsvmp通过拆分运算，通过伪字节码的形式实现运算，在加解密的过程中，异或加减运算都是算法的核心实现。所以我们需要对运算符进行插桩（有时间搓一个vmp案例），插桩效果如下：

![](https://attach.52pojie.cn/forum/202512/10/205645sgjld2g5egag35x6.png)
      建议不了解vmp的大佬可以看看app的vmp项目或者windows的，效果更佳直观     首先是对计算形式的改变，k值在实现上动态的，需要根据计算的情况，推算k值的真实值，从左到右递减。其次是构造console.log节点插桩分析。
**（1）console.log节点构造**

![](https://attach.52pojie.cn/forum/202512/10/205821g2h7lfbd2t7mtstf.png)

      根据ast的解析，console.log本质上是两个Identifier节点组成的MemberExpression再进行调用，形成了CallExpression，参数部分是CallExpression的arguments数组填充。根据bebal官方文档直接进行节点构造。

![](https://attach.52pojie.cn/forum/202512/10/210050tz6w6666iuuz44wa.png)

![](https://attach.52pojie.cn/forum/202512/10/210106lozptoj5uamk50a0.png)

![](https://attach.52pojie.cn/forum/202512/10/210133ces6aceb07w45a8o.png)

           代码实现：

```
function insert_log(log_arguments) {
  if (!log_arguments instanceof Array) {
    Error("入参应该是数组类型")
  }
  let object_name = "console"
  let property_name = "log"
  let property_create = type.identifier(property_name)
  let object_create = type.identifier(object_name)
  // MemberExpression构建
  let MemberExpression_create = type.memberExpression(object_create, property_create)
  // callExpression
  let callExpression_create = type.callExpression(MemberExpression_create, log_arguments)
  return callExpression_create
}
```

    多次调用需要，封装成函数

**（2）动态k值处理实现**
         动态k值的处理涉及到插桩的核心逻辑变化，我是先改变原有的代码，使代码是需要的插桩形式，将插桩代码存入内存后，再还原之前的代码逻辑。首先是对自增节点的处理UpdateExpression对应的是++k的自增节点，定位节点特征父节点是SwitchCase，后兄弟节点是BreakStatement是这个语句的特点，再通过深度遍历，提取UpdateExpression节点出现次数用做真实动态值计算。

```
traverse(ast, {
  ExpressionStatement: function (path) {
    let {node, parentPath, getNextSibling} = path;
    if (!type.isSwitchCase(parentPath) && !type.isBreakStatement(getNextSibling)) return;
    let {expression} = node;
    if (!type.isAssignmentExpression(expression)) return;
    let updateExpressions = [];
    path.traverse({
      UpdateExpression(_path) {
        updateExpressions.push(_path);
      }
    });
    updateExpressions.reverse().forEach((_path, index) => {
      let countValue = index; // 或者 total - 1 - index
      let binaryExpression_create = type.binaryExpression(
        "-",
        type.identifier("k"),
        type.numericLiteral(countValue)
      );
      _path.parentPath.node.property = binaryExpression_create;
    });
  }
})
```

**2、插桩处理**
      首先 ast 实现的一个核心是对关键代码的一个定位，因为这个和 k 值的自增定位逻辑上是类似的，不过多赘述

```
let {node, parentPath, getNextSibling} = path;
if (!type.isSwitchCase(parentPath) && !type.isBreakStatement(getNextSibling)) return;
let {expression} = node;
if (!type.isAssignmentExpression(expression)) return;
let {left, right, operator} = expression;
if (!type.isMemberExpression(left)) return;
let return_string = "返回值===>"
let return_string_create = createSafeStringLiteral(return_string)
// 存在一个+=的计算
if (operator !== "=") return;
```

    当然代码存在一些遗漏和不足的地方，到时候 todo 啦{:301\_998:}
      首先是处理运算符计算的插桩逻辑

```
if (type.isBinaryExpression(right)) {
  let operator_list = ["+", "-", "*", "/", "%", "==", "===", "<", "<=", ">", "<<", ">>", "<<<", ">>>", "|", "^", "&", ">="]
  let in_right = type.cloneNode(right.right);
  let in_left =  type.cloneNode(right.left);
  let in_operator =right.operator;
  if (!operator_list.includes(in_operator)) return;
  let create_stringLiteral = "运算===>"
  let stringLiteral_create = createSafeStringLiteral(create_stringLiteral)
  let binaryExpression_create = type.binaryExpression(in_operator, in_left, in_right)
  let info_argument = [stringLiteral_create, binaryExpression_create, return_string_create,  type.cloneNode(left)]
  let call = insert_log(info_argument)
  keep_map.set(num, call)
  path.node.flag = type.NumericLiteral(num);
  num++;
```

首先是进行类型的判断提取BinaryExpression 表达式，因为在这里的运算符很明确，为了稳定可以判断一下是否包含，接下来就是构造 log 需要打印的内容，因为目前节点是已经变了，我们应该在还原节点之后再插入内容，我们在当前节点插入一个 flag，标记是我们要插桩的节点，同时用一个自增的 num 来存储 对应 map 结构
同理完成 函数调用 call 和 apply 的插桩逻辑

```
else if (type.isCallExpression(right)) {
      // call apply 函数调用插桩处理
      if (!type.isMemberExpression(right.callee)) return;
      let in_object =  type.cloneNode(right.callee.object);
      let in_property_name = right.callee.property.name;
      let in_arguments = right.arguments;
      if (in_property_name === "apply") {
        let first_string = "func ===>"
        let first_stringLiteral_create = createSafeStringLiteral(first_string)
        let this_string = "this===>"
        let this_string_create = createSafeStringLiteral(this_string)
        let this_argument =  type.cloneNode(in_arguments[0])
        const value = type.cloneNode( in_arguments[1]);
        let insert_index = `参数===>`
        let insert_index_create = createSafeStringLiteral(insert_index)
        let apply_argument = [first_stringLiteral_create, in_object, this_string_create, this_argument, insert_index_create, value, return_string_create, type.cloneNode(left)]
        let apply_log = insert_log(apply_argument)
        keep_map.set(num, apply_log)
        path.node.flag = type.NumericLiteral(num);
        num++;
      } else if (in_property_name === "call") {
        let first_string = "func ===>"
        let first_stringLiteral_create = createSafeStringLiteral(first_string)
                let this_string = "this===>"
                let this_string_create = createSafeStringLiteral(this_string)
                let this_argument =  type.cloneNode(in_arguments[0])
                let call_arguments = [first_stringLiteral_create, in_object, this_string_create, this_argument]
                if (in_arguments.length > 1) {
                    for (let index = 1; index < in_arguments.length; index++) {
                        let call_argument = in_arguments[index]
                        let index_string_create = createSafeStringLiteral(`参数${index}====>`)
                        call_arguments.push(index_string_create)
                        call_arguments.push( type.cloneNode(call_argument))
                    }
                }
                call_arguments.push(return_string_create)
                call_arguments.push( type.cloneNode(left))
                let call_log = insert_log(call_arguments)
                keep_map.set(num, call_log)
                path.node.flag = type.NumericLiteral(num);
                num++;
            }
        }
```

**3、代码还原**
        在对 ++k 自增逻辑处理后，需要同理进行还原，直接遍历梭哈，构造节点

```
traverse(ast, {
  ExpressionStatement: function (path) {
    let {node, parentPath, getNextSibling} = path;
    if (!type.isSwitchCase(parentPath) && !type.isBreakStatement(getNextSibling)) return;
    let {expression} = node;
    if (!type.isAssignmentExpression(expression)) return;
    let operator = "++"
    let in_argument = type.identifier("k")
    path.traverse({
      BinaryExpression(_path) {
        _path.parentPath.node.property = type.updateExpression(operator, in_argument, true)
      }
    });
  }
})
```

**4、提取插桩代码实现**

然后就是 map 的存在 map 里的结构提取出来，塞到要插桩的位置

```
traverse(ast, {
  ExpressionStatement: function (path) {
    let {node} = path;
    if (!node.flage) return
    let insert_path = keep_map.get(node.flage.value)
    path.insertAfter(insert_path)
  }
})
```

三、总结
              相比于解混淆，插桩难点主要是在特征定位，还有就是插桩时二次调用函数或者结果导致走向错误分支（大佬提醒我的），感谢小伙伴在我卡点对我的指导，还有沙琪玛大佬提供的vmp样本。ast代码写的比较丑陋，最终目的还是实现功能。学ast还得是蔡老板，最后看一下效果，项目已经开源，大佬们可以玩玩。

![](https://attach.52pojie.cn/forum/202512/10/211257n8qr776h8r2x63eb.png)

![](https://attach.52pojie.cn/forum/202512/10/211324gbpzbhypdb2oeqap.png)
