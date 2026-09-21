# node与python同时使用ast还原2021春节番外篇的JSFuck

> **作者**: 漁滒 | **发布时间**: 2021-12-29 23:21:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5340 / 20
> **原文**: [https://www.52pojie.cn/thread-1569032-1-1.html](https://www.52pojie.cn/thread-1569032-1-1.html)

---

@[TOC](https://www.52pojie.cn/node%E4%B8%8Epython%E5%90%8C%E6%97%B6%E4%BD%BF%E7%94%A8ast%E8%BF%98%E5%8E%9F2021%E6%98%A5%E8%8A%82%E7%95%AA%E5%A4%96%E7%AF%87%E7%9A%84JSFuck)

题目地址：[【2021春节】解题领红包活动开始喽，解出就送论坛币！](https://www.52pojie.cn/thread-1369661-1-1.html)

下载出js后，全部都是形如下面的符号，代码完全没有可读性

```
([]+[])[([][[]]+[])[+!![]]+(!![]+[][(![]+[])[+[]]+(![]+[])[!![]+!![]]+(![]+[])[+!!
```

尝试直接使用node中的babel库进行还原

![在这里插入图片描述](https://img-blog.csdnimg.cn/091e12dcbe8e4141b3e5df5f4edf4d8c.png#pic_center)

这里提示超过了最大调用栈了，那么这种情况先想办法简化一点点代码，再使用babel库，可能就不会出现这个报错，那么python中比较方便修改最大的调用栈，那么就用python进行初步还原

在python中要分析js语法就要用到【slimit】这个库，之前曾经有另外一篇文章介绍过
[利用AST对抗某网站的javascript抽取型混淆](https://www.52pojie.cn/thread-1354557-1-1.html)

python部分的代码如下

```
from slimit.parser import Parser
from slimit.visitors.nodevisitor import ASTVisitor
from slimit import ast
import sys
sys.setrecursionlimit(100000)

class UnaryOp_Visitor1(ASTVisitor):
    # 自定义访问者，重写节点访问逻辑
    def visit_UnaryOp(self, node):
        child = node.children()[0]
        if isinstance(child, ast.UnaryOp):
            self.visit(child)
        else:
            for key in [i for i in filter(lambda n: not n.startswith("__") and not n == 'to_ecma' and not n == 'children', child.__dir__())]:
                if type(getattr(child, key)) != str and type(getattr(child, key)) != bool:
                    self.visit(getattr(child, key))

        if node.op == '!' and isinstance(node.children()[0], ast.UnaryOp) and node.children()[0].op == '!' and isinstance(node.children()[0].children()[0], ast.Array):
            node.value = ast.Boolean('false')
        elif node.op == '+' and isinstance(node.children()[0], ast.UnaryOp) and node.children()[0].op == '!' and node.children()[0].children()[0].value == 'false':
            node.value = ast.Boolean('true')

def main():
    with open('2021春节.js', 'r', encoding='utf-8') as f:
        script = f.read()
    tree: ast.Program = Parser().parse(script)
    UnaryOp_Visitor1().visit(tree)
    script = tree.to_ecma()
    print(script)
    with open('decrypt.js', 'w', encoding='utf-8') as f:
        f.write(script)

if __name__ == '__main__':
    main()
```

上面的主要作用是
把  !![]             还原为     !false
把  +!flase      还原为     +true

此时得到的代码形如

```
[+true] + (!false + [][(![] + [])[+[]] + (![] + [])[!false + !false]
```

然后就给node中babel库继续还原，主要是对一元表达式，二元表达式，成员表达式进行还原。其中需要注意的是代码中用到了atob和btoa这两个函数，所以需要先补了这两个函数。

js代码如下

```
const parser = require("@babel/parser");
const template = require("@babel/template").default;
const traverse = require("@babel/traverse").default;
const types = require("@babel/types");
const generator = require("@babel/generator");
const fs = require("fs");

function wtofile(path, flags, code) {
    var fd = fs.openSync(path,flags);
    fs.writeSync(fd, code);
    fs.closeSync(fd);
}

function dtofile(path) {
    fs.unlinkSync(path);
}

var file_path = '2021春节.js';
var jscode = fs.readFileSync(file_path, {
    encoding: "utf-8"
});

let ast = parser.parse(jscode);

global.Buffer = global.Buffer || require('buffer').Buffer;

if (typeof btoa === 'undefined') {
    global.btoa = function (str) {
        return new Buffer(str+"").toString('base64');
    };
}

if (typeof atob === 'undefined') {
    global.atob = function (b64Encoded) {
        return new Buffer(b64Encoded, 'base64').toString();
    };
}

traverse(ast, {
    UnaryExpression: {
        exit: [
            function (path) {
                if(path.node.operator === '!' && path.node.argument.type === 'BooleanLiteral' && path.node.argument.value === false){
                    path.replaceWith(types.booleanLiteral(true))
                }else if(path.node.operator === '!' && path.node.argument.type === 'ArrayExpression' && path.node.argument.elements.length === 0){
                    path.replaceWith(types.booleanLiteral(false))
                }else if(path.node.operator === '+' && path.node.argument.type === 'BooleanLiteral' && path.node.argument.value === true){
                    path.replaceWith(types.numericLiteral(1))
                }else if(path.node.operator === '+' && path.node.argument.type === 'ArrayExpression' && path.node.argument.elements.length === 0){
                    path.replaceWith(types.numericLiteral(0))
                }else if(path.node.operator === '+' && path.node.argument.type === 'ArrayExpression' && path.node.argument.elements.length === 1 && path.node.argument.elements[0].type === 'BooleanLiteral'){
                    path.replaceWith(types.identifier('NaN'))
                }else{
                    path.replaceWith(types.numericLiteral(eval(path.toString())))
                }
            }
        ]
    },
    BinaryExpression: {
        exit: [
            function (path) {
                if(path.node.operator === '+' && path.node.left.type === 'BooleanLiteral'){
                    if(path.node.right.type === 'BooleanLiteral'){
                        path.replaceWith(types.numericLiteral(eval(path.toString())))
                    }else if(path.node.right.type === 'ArrayExpression'){
                        path.replaceWith(types.stringLiteral(eval(path.toString())))
                    }else if(path.node.right.type === 'MemberExpression' && path.node.right.object.type === 'ArrayExpression' && path.node.right.property.type === 'StringLiteral' && path.node.right.property.value === 'flat'){
                        path.replaceWith(types.stringLiteral(eval(path.toString())))
                    }
                }else if(path.node.operator === '+' && path.node.left.type === 'NumericLiteral'){
                    if(path.node.right.type === 'BooleanLiteral'){
                        path.replaceWith(types.numericLiteral(eval(path.toString())))
                    }else if(path.node.right.type === 'ArrayExpression'){
                        path.replaceWith(types.stringLiteral(eval(path.toString())))
                    }else if(path.node.right.type === 'StringLiteral'){
                        path.replaceWith(types.stringLiteral(eval(path.toString())))
                    }else{
                        path.replaceWith(types.stringLiteral(eval(path.toString())))
                    }
                }else if(path.node.operator === '+' && path.node.left.type === 'StringLiteral' && path.node.right.type === 'StringLiteral'){
                    path.replaceWith(types.stringLiteral(eval(path.toString())))
                }else if(path.node.operator === '+' && path.node.left.type === 'StringLiteral' && path.node.right.type === 'NumericLiteral'){
                    path.replaceWith(types.stringLiteral(eval(path.toString())))
                }else if(path.node.operator === '+' && path.node.left.type === 'StringLiteral' && path.node.right.type === 'BooleanLiteral'){
                    path.replaceWith(types.stringLiteral(eval(path.toString())))
                }else if(path.node.operator === '+' && path.node.left.type === 'Identifier'){
                    path.replaceWith(types.stringLiteral(eval(path.toString())))
                }else if(path.node.operator === '+' && path.node.left.type === 'ArrayExpression'){
                    if(path.node.right.type === 'ArrayExpression'){
                        path.replaceWith(types.stringLiteral(eval(path.toString())))
                    }else if(path.node.left.elements.length === 1){
                        path.replaceWith(types.stringLiteral(eval(path.toString())))
                    }else if(path.node.right.type === 'MemberExpression' && path.node.right.object.type === 'ArrayExpression' && path.node.right.property.type === 'StringLiteral' && path.node.right.property.value === 'flat'){
                        path.replaceWith(types.stringLiteral(eval(path.toString())))
                    }else{
                        path.replaceWith(types.stringLiteral(eval(path.toString())))
                    }
                }else if(path.node.operator === '+' && path.node.right.type === 'ArrayExpression'){
                    if(path.node.left.type === 'CallExpression' && path.node.left.callee.type === 'MemberExpression'){
                        path.replaceWith(types.stringLiteral(eval(path.toString())))
                    }
                }else if(path.node.operator === '+' && path.node.left.type === 'StringLiteral' && path.node.right.type === 'Identifier'){
                    path.replaceWith(types.stringLiteral(eval(path.toString())))
                }else if(path.node.operator === '+' && path.node.left.type === 'StringLiteral' && path.node.right.type === 'MemberExpression'){
                    path.replaceWith(types.stringLiteral(eval(path.toString())))
                }else{
                    path.replaceWith(types.stringLiteral(eval(path.toString())))
                }
            }
        ]
    },
    MemberExpression: {
        exit: [
            function (path) {
                if(path.node.object.type === 'ArrayExpression' && path.node.property.type === 'ArrayExpression'){
                    path.replaceWith(types.identifier('undefined'))
                }else if(path.node.object.type === 'StringLiteral' && path.node.property.type === 'NumericLiteral'){
                    path.replaceWith(types.stringLiteral(eval(path.toString())))
                }else if(path.node.object.type === 'StringLiteral' && path.node.property.type === 'StringLiteral'){
                    if(!isNaN(parseInt(path.node.property.value))){
                        path.replaceWith(types.stringLiteral(eval(path.toString())))
                    }
                }
            }
        ]
    },
    CallExpression: {
        exit: [
            function (path) {
                if(path.node.callee.type === 'CallExpression' && path.node.callee.arguments.length === 1 && path.node.callee.arguments[0].type === 'StringLiteral' && path.node.callee.arguments[0].value === 'return statusbar'){
                    path.parentPath.replaceWith(types.stringLiteral("[object BarProp]"))
                }else if(path.node.callee.type === 'MemberExpression' && path.node.callee.object.type === 'NumericLiteral'){
                    path.replaceWith(types.stringLiteral(eval(path.toString())))
                }
            }
        ]
    }
});

let code = generator.default(ast, {
    compact: false
}).code;
wtofile('decrypt.js', 'w', code);
```

还原后可以得到最终容易阅读的代码

![在这里插入图片描述](https://img-blog.csdnimg.cn/5695ab227a26498ca4b5e564c7cfb5bf.png?)

接下来就可以做进一步需要的分析了。
