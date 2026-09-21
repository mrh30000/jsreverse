# 某音直播弹幕web端js逆向分析-protobuf实战及工具介绍

> **作者**: prince_cool | **发布时间**: 2023-01-20 23:12:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 16917 / 101
> **原文**: [https://www.52pojie.cn/thread-1737925-1-1.html](https://www.52pojie.cn/thread-1737925-1-1.html)

---

*本帖最后由 prince\_cool 于 2024-1-13 11:22 编辑*

## 某音直播弹幕web端js逆向分析----protobuf实战及工具介绍

## 声明

**本文章中所有内容仅供学习交流，相关链接做了脱敏处理，若有侵权，请联系我立即删除！**

## 一、前言

```
   前面的文章应该可以让大家掌握好protobuf吧，只要抓住关键词就行了。前面文章我也提到了某音直播弹幕也是采用protobuf格式传输的，那我们这篇文章就来看看，实战一下能不能获取到信息。同时我也会放出我写好的ast工具，对基本的protobuf格式应该都能做到处理，大佬们也可以在我这个基础上修改，或者推出更适合的工具。
```

## 二、前情提要

一般的直播弹幕都采用websocket协议传输数据，因为要实时传输，ws协议只用一次建立握手连接，就可持续实时通信。

![](https://s2.loli.net/2023/05/18/JbmZohUzeQV35IT.png#id=icSxp&originHeight=390&originWidth=898&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

基于这点，我们可以很容易的就找到我们要的地址，我们开始分析吧！

## 三、目标网站

任意直播间

## 四、开始分析

如果你不信我的前情提要，觉得太虚了，有没有可能走http协议呢，那我们可以打开f12，打开fiddler抓包工具（为后面分析ws连接做准备），然后输入我们的目标网站地址（只需https:// live.\*\*\*.com/数字），抓包看看吧。

获取到弹幕的一瞬间，我们的fiddler就可以关了。我们看看浏览器的f12内容，进度条一直在跑，因为数据很多嘛.

![](https://s2.loli.net/2023/05/18/ANpmKHTg8desiS6.png#id=SU9Tu&originHeight=121&originWidth=1196&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

弹幕数据肯定是那些零星的，蓝色分散的点，我们括一小段看看

![](https://s2.loli.net/2023/05/18/fzlEugI6jHRLvUY.png#id=zulxQ&originHeight=668&originWidth=1206&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

我们看到数据类型大多是图片，不是我们需要的啊，唯独websocket类型数据是一直贯穿的，即使暂停了直播，弹幕还是会有，webscoket传输的数据还是没停下来。所以我们要找的就是websocket协议传输的数据。

![](https://s2.loli.net/2023/05/18/QMU2szYHJfmgNwK.png#id=QdSsL&originHeight=736&originWidth=1205&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

点到ws，然后看到唯一链接wss开头，这就是websocket协议的。

知识点：（**绿色表示客户端消息发给服务器，红色表示服务器下发数据给客户端**）

我们可以从堆栈入手，找到发包点。

![](https://s2.loli.net/2023/05/18/3joa8UXbHDyz7FP.png#id=BqsyQ&originHeight=844&originWidth=463&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

其实我们从名字也大概可以猜到可能是这两个，我一开始是直接看这两个的也能找到点，我们还是从最后一个发包栈（m）看起吧。

![](https://s2.loli.net/2023/05/18/TMyBUJ9P386fuYS.png#id=fDAMt&originHeight=384&originWidth=916&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

我们去搜索一下,学习一下这个是怎么一回事，t参数是什么意思。

来到mdn网站，强烈推荐：<https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket>

```
            WebSocket 对象提供了用于创建和管理 WebSocket 连接，以及可以通过该连接发送和接收数据的 API。

                                    使用 WebSocket() 构造函数来构造一个 WebSocket。

                                    WebSocket(url ，protocols（可选）)

                                    返回一个 `WebSocket` 对象。
```

所以说这个t是一个url链接，应该就是我们看到的那个wss链接了，我们下个断点，来分析分析。

![](https://s2.loli.net/2023/05/18/vxl8zwaeQTBZKFc.png#id=tLFKG&originHeight=450&originWidth=1652&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

确实是。我们回到原来那个mdn网站，可以往下看，可以看到事件这个栏目。

![](https://s2.loli.net/2023/05/18/7nVjguLBNJqcU2O.png#id=msZBH&originHeight=627&originWidth=1019&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

我们断点下方不正是有这几个事件关键词吗，我们如果刷新界面，它刚开始连接时，如果成功，应该会触发open事件，我们都可以下个断点看看，主要先看看open，**这几个关键词要记住，解websocket协议的核心**。

我们可以看到它先走了onmessage，我们在mdn查一下 addEventListener：addEventListener（type,listener）其中 listener是对象，相当于监听它。我们跟过去看看这个对象，函数。

![](https://s2.loli.net/2023/05/18/nV1AmySExJuwocj.png#id=epMsn&originHeight=522&originWidth=933&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

相当于每个都是监听里面这一堆东西，各种判断处理，先给创建的websocket对象绑定好了各种方法，再来处理数据。

所以他绑定的方法我们要跟过去下断点，都绑定后后，我们发现，他来到了onopen，就是我们最开始提到的，连接成功要处理的事件。

![](https://s2.loli.net/2023/05/18/H7iZT4meX1vwEYy.png#id=a2toD&originHeight=187&originWidth=931&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

核心是这个 this.ping()，其他都是一些赋值操作，我们跟进ping函数

![](https://s2.loli.net/2023/05/18/gOBTj9JMi1UsEyR.png#id=llWr6&originHeight=247&originWidth=892&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

是不是看到了我们protobuf格式的老熟人关键词：**serializeBinary**，然后通过socket的send发给服务器。

代码分析：

```
 const e = Math.max(1e4, Number(this.heartbeatDuration)); 得到e是10000。

if (this.client && 1 === this.client.socket.readyState) {   //readyState准备状态，一开始是1嘛，可以理解，成立
                    const e = new p.PushFrame;    //实例化proto对象
                    e.setPayloadType("hb"),       //设置属性值
                    this.client.socket.send(e.serializeBinary())    //序列化后发送
    }
 this.pingTimer = window.setTimeout((()=>{
                    this.pingStarted && this.ping()
                }
 ), e)  //setTimeout：超时就执行ping，毫秒。相当于这里就是10秒ping一次嘛
```

![](https://s2.loli.net/2023/05/18/hvLbVnlwN5j7uoR.png#id=Fyj2S&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

可能是太久了，他发了两次，对吧，所以说这里就是一个点，我们要构造ping值，然后连接成功时候发一下，然后就能得到服务器返回的值了。

![](https://s2.loli.net/2023/05/18/WLfMmFSjq695BDU.png#id=oLM2I&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

我们回到这里，先搞定这里再分析onmessage的，构造这个proto文件吧。

![](https://s2.loli.net/2023/05/18/z7RbilvgAFkrdC9.png#id=EWZ9R&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

搜索 **proto.pushproto.PushFrame.deserializeBinary**

![](https://s2.loli.net/2023/05/18/rfoYEcVDk9R4GQK.png#id=JXOUS&originHeight=674&originWidth=937&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

当然可以一个个慢慢扣，这里比较少。

#### ①js转proto文件工具分享（只可解标准protobuf）：

这里我采用我自己写的ast工具进行处理，把js尽可能转成proto文件，这里是我想分享的一点。

因为之前不是用渔歌的ast脚本加个try，逻辑改一下就搞定某方了，我就想，我能不能自己写一个呢，然后小学了一下ast，用的最基础的语法，我直接放出来吧，供大家使用，改良；你们写的肯定比我好。

```
//babel库及文件模块导入
const fs = require('fs');

//babel库相关，解析，转换，构建，生产
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const types = require("@babel/types");
const generator = require("@babel/generator").default;
//读取文件
let encode_file = "./test.js", decode_file = "./decode_result.proto"; //自己可以调整路径
if (process.argv.length > 2) {
    encode_file = process.argv[2];
}
if (process.argv.length > 3) {
    decode_file = process.argv[3];
}
//some function code
//判断类型
function get_id_type(id_type) {
    switch (id_type) {
        case "readString":
            id_type = "string";
            break;
        case "readDouble":
            id_type = "double";
            break;
        case "readInt32":
            id_type = "int32";
            break;
        case "readInt64":
            id_type = "int64";
            break;
        case "readFloat":
            id_type = "float";
            break;
        case "readBool":
            id_type = "bool";
            break;
        case "readPackedInt32":
            id_type = "int32";
            break;
        case "readBytes":
            id_type = "bytes";
            break;
        case "readEnum":
            id_type = "readEnum";
            break;
        case "readPackedEnum":
            id_type = "readPackedEnum";
            break;
        case "readUint64String":
            id_type = "uint64";
            break;
        case "readInt64String":
            id_type = "int64";
            break;
        case "readUint32":
            id_type = "uint32";
            break;
        case "readUint64":
            id_type = "uint64";
            break;

    }
    return id_type
}

//首字母大写,处理
function titleCase(str) {
    newStr = str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();
    return newStr;
}

//读取文件
let jscode = fs.readFileSync(encode_file, {encoding: "utf-8"});
//转换为ast树
let ast = parser.parse(jscode);
// console.log(ast)
text = 'syntax = "proto3";\n'
//处理message插件
const visitor =
    {
        //TODO  write your code here！
        AssignmentExpression(path, scope) {
            // 外面大模型是没问题了，主要是里面细节
            if (path.node.left.property) {
                if (path.node.left.type == 'MemberExpression' &&
                    path.node.left.property.type == 'Identifier' &&
                    path.node.left.property.name == 'deserializeBinaryFromReader') {
                    //处理message名字
                    object_name = path.node.left.object.property.name
                    left_node = path.node.left
                    codename_list = generator(left_node).code.split('.');
                    codename_list.shift()
                    codename_list.pop()
                    object_name = codename_list.join('_');
                    // console.log(object_name);
                    text = text + 'message ' + object_name + '{\n'
                    //处理switch语句
                    if (path.node.right.type == 'FunctionExpression') {
                        path.traverse({
                                SwitchStatement(path2) {
                                    //case语句
                                    cases_list = path2.node.cases
                                    // console.log(generator(path2.node).code);
                                    // try {
                                    for (i = 0; i < path2.node.cases.length - 1; i++) {
                                        location = cases_list[i].test.value
                                        if (cases_list[i].consequent.length) {
                                            if (cases_list[i].consequent[0].type == 'VariableDeclaration') {
                                                //遇到new对象处理
                                                if (cases_list[i].consequent[0].declarations[0].init.type == 'NewExpression') {
                                                    //获得type
                                                    node_code = cases_list[i].consequent[0].declarations[0].init
                                                    // console.log(generator(node_code).code)
                                                    node_code_list = generator(node_code).code.split('.')
                                                    node_code_list.shift()
                                                    id_type = node_code_list.join('_').replace('()', '')
                                                    // console.log(id_type);
                                                    //获得name，这部分有点问题，大家可以自行修改
                                                    try {
                                                        id_name = cases_list[i].consequent[2].expression.callee.property.name

                                                    } catch (e) {
                                                        id_name = cases_list[i].consequent[1].expression.expressions[1].callee.property.name
                                                    }

                                                    // console.log(id_name);
                                                    if (id_name.startsWith("set")) {
                                                        id_st = "";
                                                    } else if (id_name.startsWith("add")) {
                                                        id_st = "repeated";
                                                    } else {
                                                        // map类型暂时没处理，可自行补充完善
                                                        continue
                                                    }
                                                    id_name = id_name.substring(3, id_name.length).toLowerCase();
                                                    // console.log(id_name)
                                                    text = text + id_st + ' ' + id_type + ' ' + id_name + '=' + location + ';' + '\n'

                                                }
                                                //其他情况处理
                                                else {
                                                    if (cases_list[i].consequent[0].declarations[0].init.callee)
                                                        id_type = cases_list[i].consequent[0].declarations[0].init.callee.property.name
                                                    if (cases_list[i].consequent[0].declarations[0].init.consequent || cases_list[i].consequent[0].declarations[0].init.alternate)
                                                        id_type = cases_list[i].consequent[0].declarations[0].init.consequent.callee.property.name
                                                    id_type = get_id_type(id_type)
                                                    // console.log(id_type);
                                                    if (cases_list[i].consequent[1].type == 'ForStatement')
                                                        id_name = cases_list[i].consequent[1].body.body[0].expression.callee.property.name
                                                    else if (cases_list[i].consequent[1].type == 'ExpressionStatement') {
                                                        if (cases_list[i].consequent[1].expression.expressions)
                                                            id_name = cases_list[i].consequent[1].expression.expressions[cases_list[i].consequent[1].expression.expressions.length - 1].callee.property.name
                                                        else
                                                            id_name = cases_list[i].consequent[1].expression.callee.property.name
                                                    }

                                                    if (id_name.startsWith("set")) {
                                                        id_st = "";
                                                    } else if (id_name.startsWith("add")) {
                                                        id_st = "repeated";
                                                    } else {
                                                        // map类型暂时没处理，可自行补充完善
                                                        continue
                                                    }
                                                    id_name = id_name.substring(3, id_name.length);
                                                    // console.log(id_name)
                                                    if (id_type == 'readEnum') {
                                                        text = text + 'enum ' + titleCase(id_name) + ' {\n' + id_name + '_0=0;\n}\n' + id_st + ' ' + titleCase(id_name) + ' ' + id_name.toLowerCase() + '=' + location + ';' + '\n'
                                                    } else if (id_type == 'readPackedEnum') {
                                                        id_st = 'repeated'
                                                        text = text + 'enum ' + titleCase(id_name) + ' {\n' + id_name + '_0=0;\n}\n' + id_st + ' ' + titleCase(id_name) + ' ' + id_name.toLowerCase() + '=' + location + ';' + '\n'
                                                    } else
                                                        text = text + id_st + ' ' + id_type + ' ' + id_name.toLowerCase() + '=' + location + ';' + '\n'

                                                }
                                            }
                                            if (cases_list[i].consequent[0].type == 'ExpressionStatement') {
                                                //一般处理
                                                if (cases_list[i].consequent[0].expression.right.type == 'CallExpression') {
                                                    id_type = cases_list[i].consequent[0].expression.right.callee.property.name
                                                    // console.log(id_type)
                                                    id_type = get_id_type(id_type)
                                                    // console.log(id_type);
                                                    if (cases_list[i].consequent[1].type == 'ForStatement')
                                                        id_name = cases_list[i].consequent[1].body.body[0].expression.callee.property.name
                                                    else if (cases_list[i].consequent[1].type == 'ExpressionStatement') {
                                                        if (cases_list[i].consequent[1].expression.expressions)
                                                            id_name = cases_list[i].consequent[1].expression.expressions[cases_list[i].consequent[1].expression.expressions.length - 1].callee.property.name
                                                        else
                                                            id_name = cases_list[i].consequent[1].expression.callee.property.name
                                                    }
                                                    // console.log(id_name);
                                                    if (id_name.startsWith("set")) {
                                                        id_st = "";
                                                    } else if (id_name.startsWith("add")) {
                                                        id_st = "repeated";
                                                    } else {
                                                        // map类型暂时没处理，可自行补充完善
                                                        continue
                                                    }
                                                    id_name = id_name.substring(3, id_name.length).toLowerCase();
                                                    // console.log(id_name)
                                                    if (id_type == 'readEnum') {
                                                        text = text + 'enum ' + titleCase(id_name) + ' {\n' + id_name + '_0=0;\n}\n' + id_st + ' ' + titleCase(id_name) + ' ' + id_name.toLowerCase() + '=' + location + ';' + '\n'
                                                    } else if (id_type == 'readPackedEnum') {
                                                        id_st = 'repeated'
                                                        text = text + 'enum ' + titleCase(id_name) + ' {\n' + id_name + '_0=0;\n}\n' + id_st + ' ' + titleCase(id_name) + ' ' + id_name.toLowerCase() + '=' + location + ';' + '\n'
                                                    } else
                                                        text = text + id_st + ' ' + id_type + ' ' + id_name.toLowerCase() + '=' + location + ';' + '\n'

                                                }
                                                //遇到new对象处理
                                                if (cases_list[i].consequent[0].expression.right.type == 'NewExpression') {
                                                    //转化成字符串对象处理
                                                    node_code = cases_list[i].consequent[0].expression.right.callee
                                                    node_code_list = generator(node_code).code.split('.')
                                                    node_code_list.shift()
                                                    id_type = node_code_list.join('_')
                                                    // console.log(id_type);

                                                    //获得name
                                                    id_name = cases_list[i].consequent[1].expression.expressions[1].callee.property.name
                                                    // console.log(id_name);
                                                    if (id_name.startsWith("set")) {
                                                        id_st = "";
                                                    } else if (id_name.startsWith("add")) {
                                                        id_st = "repeated";
                                                    } else {
                                                        // map类型暂时没处理，可自行补充完善
                                                        continue
                                                    }
                                                    id_name = id_name.substring(3, id_name.length).toLowerCase();
                                                    // console.log(id_name)
                                                    if (id_type == 'readEnum') {
                                                        text = text + 'enum ' + titleCase(id_name) + ' {\n' + id_name + '_0=0;\n}\n' + id_st + ' ' + titleCase(id_name) + ' ' + id_name.toLowerCase() + '=' + location + ';' + '\n'
                                                    } else if (id_type == 'readPackedEnum') {
                                                        id_st = 'repeated'
                                                        text = text + 'enum ' + titleCase(id_name) + ' {\n' + id_name + '_0=0;\n}\n' + id_st + ' ' + titleCase(id_name) + ' ' + id_name.toLowerCase() + '=' + location + ';' + '\n'
                                                    } else
                                                        text = text + id_st + ' ' + id_type + ' ' + id_name.toLowerCase() + '=' + location + ';' + '\n'

                                                }

                                            }

                                        }

                                    }

                                },
                                ////某音有的结构，遇到其他网站可以注释
                                IfStatement(path3) {
                                    location = path3.node.test.left.value
                                    if (path3.node.consequent.type === 'BlockStatement') {
                                        if (path3.node.consequent.body[0].type === 'VariableDeclaration') {
                                            // console.log(generator(path3.node).code)
                                            //遇到new对象处理
                                            if (path3.node.consequent.body[0].declarations[0].init.type == 'NewExpression') {
                                                //获得type
                                                node_code = path3.node.consequent.body[0].declarations[0].init
                                                // console.log(generator(node_code).code)
                                                node_code_list = generator(node_code).code.split('.')
                                                node_code_list.shift()
                                                id_type = node_code_list.join('_').replace('()', '')
                                                // console.log(id_type);
                                                //获得name，这部分有点问题，大家可以自行修改
                                                try {
                                                    id_name = path3.node.consequent.body[0].expression.callee.property.name

                                                } catch (e) {
                                                    id_name = path3.node.consequent.body[1].expression.expressions[1].callee.property.name
                                                }

                                                // console.log(id_name);
                                                if (id_name.startsWith("set")) {
                                                    id_st = "";
                                                } else if (id_name.startsWith("add")) {
                                                    id_st = "repeated";
                                                } else {
                                                    // map类型暂时没处理，可自行补充完善
                                                }
                                                id_name = id_name.substring(3, id_name.length).toLowerCase();
                                                // console.log(id_name)
                                                text = text + id_st + ' ' + id_type + ' ' + id_name + '=' + location + ';' + '\n'

                                            } else {
                                                id_type = path3.node.consequent.body[0].declarations[0].init.callee.property.name
                                                id_type = get_id_type(id_type)
                                                id_name = path3.node.consequent.body[1].expression.callee.property.name
                                                if (id_name.startsWith("set")) {
                                                    id_st = "";
                                                } else if (id_name.startsWith("add")) {
                                                    id_st = "repeated";
                                                } else {
                                                    // map类型暂时没处理，可自行补充完善
                                                }
                                                id_name = id_name.substring(3, id_name.length).toLowerCase();
                                                // console.log(id_name)
                                                text = text + id_st + ' ' + id_type + ' ' + id_name + '=' + location + ';' + '\n'
                                            }
                                        }
                                    }
                                    if (path3.node.consequent.type === 'ForStatement') {
                                        id_type = path3.node.consequent.init.declarations[0].init.consequent.callee.property.name
                                        id_type = get_id_type(id_type)
                                        id_name = path3.node.consequent.body.expression.callee.property.name
                                        // console.log(id_name);
                                        if (id_name.startsWith("set")) {
                                            id_st = "";
                                        } else if (id_name.startsWith("add")) {
                                            id_st = "repeated";
                                        } else {
                                            // map类型暂时没处理，可自行补充完善
                                        }
                                        id_name = id_name.substring(3, id_name.length).toLowerCase();
                                        // console.log(id_name)
                                        text = text + id_st + ' ' + id_type + ' ' + id_name + '=' + location + ';' + '\n'

                                    }

                                }
                            }
                        )

                    }
                    text = text + '}\n'
                }

            }

        }
    }

//处理enum对象插件
const visitor2 = {
    AssignmentExpression(path) {
        if (path.node.right.type === 'ObjectExpression' && path.node.left.type === 'MemberExpression' && path.node.right.properties.length) {
            left_node = path.node.left
            left_code = generator(left_node).code.split('.')
            word = left_code.shift()
            if (word === 'proto') {
                enum_name = left_code.join('_')
                // console.log(enum_name)
                right_object_list = path.node.right.properties
                right_str = ''
                for (i = 0; i < right_object_list.length; i++) {
                    // console.log(right_object_list[i].key.name)
                    objet_name = right_object_list[i].key.name
                    objet_value = right_object_list[i].value.value
                    right_str = right_str + enum_name + '_' + objet_name + '=' + objet_value + ';\n'
                }
                text = text + 'enum ' + enum_name + '{\n' + right_str + '}' + '\n'
                // console.log(right_code)

            }

        }
        // console.log(generator(path.node).code)
    }
}

//调用插件，处理源代码

// traverse(ast, visitor2)
// console.log('enum部分完成！！！')
// fs.writeFile('douyin_test_enum完成.proto', text, (err) => {});

traverse(ast, visitor);
console.log('message部分完成！！！')
// // fs.writeFile('douyin_test_message完成.proto', text, (err) => {});
//
//
// // console.log(text);
//
fs.writeFile(decode_file, text, (err) => {});
```

首先，为什么能写出这个插件，我基于的是之前文章讲过的：（**不要编辑它**）

![](https://s2.loli.net/2023/05/18/Bg3YoOZCEsaVSNT.png#id=JE2YJ&originHeight=700&originWidth=1773&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

所以我就看了一下原始创建的js和某方和某音的结构，发现有相同点：

![](https://s2.loli.net/2023/05/18/8XpVZIhbSNDkCy2.png#id=UFY9N&originHeight=631&originWidth=708&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

```
proto.SearchService.SearchResponse.deserializeBinaryFromReader = function(e, t) {
  for (; t.nextField() && !t.isEndGroup(); ) {
    switch (t.getFieldNumber()) {
      case 1:
        var r = t.readBool();
        e.setStatus(r);
        break;
      case 2:
        r = t.readString();
        e.setMessage(r);
        break;
      case 3:
        r = t.readInt64();
        e.setCount(r);
        break;
      case 4:
        r = new s.Resource;
        t.readMessage(r, s.Resource.deserializeBinaryFromReader),
          e.addResources(r);
        break;
      default:
        t.skipField()
    }
  }
  return e
}
proto.pushproto.PushHeader.deserializeBinaryFromReader = function(e, t) {
  for (; t.nextField() && !t.isEndGroup(); ) {
    switch (t.getFieldNumber()) {
      case 1:
        var i = t.readString();
        e.setKey(i);
        break;
      case 2:
        i = t.readString();
        e.setValue(i);
        break;
      default:
        t.skipField()
    }
  }
  return e
}
```

我们放到网站上看看他们的结构：<https://astexplorer.net/>

![](https://s2.loli.net/2023/05/18/Ox2eqdHjPwKYt9y.png#id=Sms1r&originHeight=635&originWidth=866&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

发现都是 AssignmentExpression类型对象，然后有左：MemberExpression类型节点，它调用的方法名是**deserializeBinaryFromReader**

**定位**：我就是先以这个确定message对象：

![](https://s2.loli.net/2023/05/18/IyuCf6Tshpt95z2.png#id=oDYBe&originHeight=447&originWidth=911&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

**处理**：然后再处理细节，展开后：

![](https://s2.loli.net/2023/05/18/xDsFmAyPXk8Uip7.png#id=NPFQJ&originHeight=335&originWidth=817&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

先把message名字搞定：

用babel库的generator将左节点转成字符串源码，然后以"."分割去掉头(proto)尾(deserializeBinaryFromReader)

然后用"\_"拼接，就搞定了message对象名字。我拿text变量来连接这些数据，下面就是处理右边的function了。

![](https://s2.loli.net/2023/05/18/MntZgOKHauyv7DE.png#id=YV4BY&originHeight=307&originWidth=845&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

直接通过babel库的traverse定位到switch语句块，里面又有好几种情况，大家可以自行分析，我们可以通过慢慢调试，发现缺少的就慢慢补充起来，我基本上把可能的情况都写上去了，可是有个地方需要大家帮忙修改或者采用更好的方法优化一下吧。

![](https://attach.52pojie.cn/forum/202401/12/223934ynt3nhh5iikmz50k.png)

如果报错可以在pycharm，debugger下看到报错细节，然后再进行调整，我发的基本上解决了。

下面是一些特殊情况，因为没保存之前的截图，临时找了一下:

![](https://s2.loli.net/2023/05/18/Sx9HlzKimLGCfFN.png#id=YXFRW&originHeight=629&originWidth=920&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

其实下面也写了处理enum类型的模块，因为本身转化成js后是不可逆的，只能尽量还原，不可逆的点就是这个enum类型对象，你可以看回转化后的js，是没有一一对应关系的，所以无法关联到枚举类型变量，所以我就关了，没使用，想看枚举类型也能打开来看。

![](https://s2.loli.net/2023/05/18/AJn6aCS9FTrsQYK.png#id=yYy9s&originHeight=538&originWidth=919&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

对了，上面有封装了一个函数，是处理数据类型的，如果你遇到了我这工具没有的类型，你自己可以添加到case语句里面，一看就懂。

![](https://s2.loli.net/2023/05/18/GnldhkJifyYbTIj.png#id=sl9eD&originHeight=412&originWidth=560&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

代码大概介绍了一下，我们就拿上面拿出来的某方，某音的列子来试试效果。

![](https://s2.loli.net/2023/05/18/OEJd4NGqm2SrfRI.png#id=oUh4z&originHeight=396&originWidth=738&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

一下子就处理完成，效果蛮好的，红色报错之前文章也说过原因，也教过怎么找这个对象，可以看回之前的文章。

#### ②回到某音ping分析的地方：

![](https://s2.loli.net/2023/05/18/nQ2Iho1vcMrkH7Z.png#id=I0wK6&originHeight=491&originWidth=968&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

我们跟进了那个方法的js文件，我们直接复制下来，丢到工具里面：

![](https://s2.loli.net/2023/05/18/Om5JwZhQDioCI6X.png#id=YE3U8&originHeight=688&originWidth=1415&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

发现我们要的其实就是我圈起来的这两个，我们可以单独拿出来。

```
syntax = "proto3";
message pushproto_PushHeader{
 string key=1;
 string value=2;
}
message pushproto_PushFrame{
 uint64 seqid=1;
 uint64 logid=2;
 uint64 service=3;
 uint64 method=4;
repeated pushproto_PushHeader headers=5;
 string payloadencoding=6;
 string payloadtype=7;
 bytes payload=8;
}
```

然后试试能不能得到想要的结果。（python语句看回我补充篇）

![](https://s2.loli.net/2023/05/18/JTb239M4LEKroed.png#id=lf9f1&originHeight=663&originWidth=1144&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

可以看到我们发过去后，服务器给我们发送了一个数据，猜测应该会在onMessage收到，然后处理，放行，果然来了。

![](https://s2.loli.net/2023/05/18/JhkfFZtUVYHjiBS.png#id=FtNOs&originHeight=349&originWidth=1231&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

我们跟过去看看吧：

![](https://s2.loli.net/2023/05/18/TJefNt4FX1DVvSn.png#id=y0srd&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

又看到了我们的老朋友：反序列化的函数（deserializeBinary），所以我们可以采取构造proto文件处理，也可以使用python库blackboxprotobuf处理。因为我写了工具，就直接使用第一种方式，构造proto文件，也更直观。

我们先大概分析一下代码，再用工具去构造吧：

先看第一个语句:

```
 const i = p.PushFrame.deserializeBinary(e.data) //反序列化得到数组对象
        , o = r.Response.deserializeBinary(
  //自执行
  function(e) {
      for (const t of Object.values(e.getHeadersList()))
          //判断是否有compress_type和gzip值在i里面
          if ("compress_type" === t.getKey() && "gzip" === t.getValue())
              return !0; //返回真
      return !1   //返回假
  }(i)
 //选择表达式，如果真就走第一个，假就走后面那个，得到的值再反序列化得到o，这里应该都是压缩过的，所以都会走第一个
 ? (0,n.ec)(i.getPayload()) : i.getPayload_asU8());
```

第二段：

```
//如果需要ack做的事情 自行百度什么是websocket的ack
if (o.getNeedAck()) {
     let e = o.getInternalExt()
     , t = o.getCursor();
     (i.getHeadersList() || []).forEach((i=>{
   "im-internal_ext" === (null == i ? void 0 : i.getKey()) && (e = null == i ? void 0 : i.getValue()),
   "im-cursor" === (null == i ? void 0 : i.getKey()) && (t = null == i ? void 0 : i.getValue())
                        }
                        )),
    this.internalExt = e,
    this.cursor = t;
    //下面才是核心
    const a = new p.PushFrame;
    a.setPayloadType("ack"),
    a.setPayload(
    //自执行：相当于把internalext传进去处理然后当成是payload的值
    function(e) {
           const t = [];
           for (const i of e) {
           const e = i.charCodeAt(0);
           e < 128 ? t.push(e) : e < 2048 ? (t.push(192 + (e >> 6)),
           t.push(128 + (63 & e))) : e < 65536 && (t.push(224 + (e >> 12)),
           t.push(128 + (e >> 6 & 63)),
           t.push(128 + (63 & e)))
      }
       return Uint8Array.from(t)
    }(e)
    ),
    a.setLogid(i.getLogid()),
    this.client.socket.send(a.serializeBinary())
}
```

最后

```
if ("msg" === i.getPayloadType() && (this.info("fetchSocketServer socket response: ", (()=>o.toObject())),
                this.emit(o)),//这里就是把值展示出来了，里面处理值
                "close" === i.getPayloadType())
                return t(new Error("close by payloadtype"))
}
```

大概理清楚了onmessage的思路，先反序列化得到我们要的数据给后面展示，o就是我们要的数据对象，然后如果需要ack就发，最后通过emit函数处理展示值。

我们看看实际情况：

![](https://s2.loli.net/2023/05/18/i6gXWON5oB8uyQY.png#id=KcY3J&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

所以先通过n.ec函数处理，然后再来反序列化。

我们复制刚刚返回的，也能得到这个序列。

![](https://s2.loli.net/2023/05/18/TCzSxDjnkXgKqJs.png#id=R8c3r&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

![](https://s2.loli.net/2023/05/18/pztSkAN3X5ULwlx.png#id=RtWWW&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

我们进去n.ec函数，然后移到最上面，发现是webpack打包的，然后我们可以看到

![](https://s2.loli.net/2023/05/18/aqvMALj5JWKSgF1.png#id=so3fC&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

![](https://s2.loli.net/2023/05/18/AI2HPZb1ELp3vkB.png#id=clPzP&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

刚刚好Qe就是我们进来的位置，也就是这个函数，其实名字已经暴露了是解压，我们也可以把代码扣下来使用。

去掉开头结尾就好了：

```
function i(t) {
    let e = t.length;
    for (; --e >= 0; )
        t[e] = 0
}
const n = 256
  , r = 286
  , s = 30
  , l = 15
  , o = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0])
  , h = new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13])
  , d = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7])
  , _ = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15])
  , f = new Array(576);
i(f);
const c = new Array(60);
i(c);
const u = new Array(512);
i(u);
const w = new Array(256);
i(w);
const b = new Array(29);
i(b);
const g = new Array(s);
function m(t, e, a, i, n) {
    this.static_tree = t,
    this.extra_bits = e,
    this.extra_base = a,
    this.elems = i,
    this.max_length = n,
    this.has_stree = t && t.length
}
let p, k, v;
function y(t, e) {
    this.dyn_tree = t,
    this.max_code = 0,
    this.stat_desc = e
}
i(g);
const x = t=>t < 256 ? u[t] : u[256 + (t >>> 7)]
  , z = (t,e)=>{
    t.pending_buf[t.pending++] = 255 & e,
    t.pending_buf[t.pending++] = e >>> 8 & 255
}
  , A = (t,e,a)=>{
    t.bi_valid > 16 - a ? (t.bi_buf |= e << t.bi_valid & 65535,
    z(t, t.bi_buf),
    t.bi_buf = e >> 16 - t.bi_valid,
    t.bi_valid += a - 16) : (t.bi_buf |= e << t.bi_valid & 65535,
    t.bi_valid += a)
}
  , E = (t,e,a)=>{
    A(t, a[2 * e], a[2 * e + 1])
}
  , R = (t,e)=>{
    let a = 0;
    do {
        a |= 1 & t,
        t >>>= 1,
        a <<= 1
    } while (--e > 0);
    return a >>> 1
}
  , Z = (t,e,a)=>{
    const i = new Array(16);
    let n, r, s = 0;
    for (n = 1; n <= l; n++)
        i[n] = s = s + a[n - 1] << 1;
    for (r = 0; r <= e; r++) {
        let e = t[2 * r + 1];
        0 !== e && (t[2 * r] = R(i[e]++, e))
    }
}
  , U = t=>{
    let e;
    for (e = 0; e < r; e++)
        t.dyn_ltree[2 * e] = 0;
    for (e = 0; e < s; e++)
        t.dyn_dtree[2 * e] = 0;
    for (e = 0; e < 19; e++)
        t.bl_tree[2 * e] = 0;
    t.dyn_ltree[512] = 1,
    t.opt_len = t.static_len = 0,
    t.last_lit = t.matches = 0
}
  , S = t=>{
    t.bi_valid > 8 ? z(t, t.bi_buf) : t.bi_valid > 0 && (t.pending_buf[t.pending++] = t.bi_buf),
    t.bi_buf = 0,
    t.bi_valid = 0
}
  , D = (t,e,a,i)=>{
    const n = 2 * e
      , r = 2 * a;
    return t[n] < t[r] || t[n] === t[r] && i[e] <= i[a]
}
  , O = (t,e,a)=>{
    const i = t.heap[a];
    let n = a << 1;
    for (; n <= t.heap_len && (n < t.heap_len && D(e, t.heap[n + 1], t.heap[n], t.depth) && n++,
    !D(e, i, t.heap[n], t.depth)); )
        t.heap[a] = t.heap[n],
        a = n,
        n <<= 1;
    t.heap[a] = i
}
  , T = (t,e,a)=>{
    let i, r, s, l, d = 0;
    if (0 !== t.last_lit)
        do {
            i = t.pending_buf[t.d_buf + 2 * d] << 8 | t.pending_buf[t.d_buf + 2 * d + 1],
            r = t.pending_buf[t.l_buf + d],
            d++,
            0 === i ? E(t, r, e) : (s = w[r],
            E(t, s + n + 1, e),
            l = o[s],
            0 !== l && (r -= b[s],
            A(t, r, l)),
            i--,
            s = x(i),
            E(t, s, a),
            l = h[s],
            0 !== l && (i -= g[s],
            A(t, i, l)))
        } while (d < t.last_lit);
    E(t, 256, e)
}
  , L = (t,e)=>{
    const a = e.dyn_tree
      , i = e.stat_desc.static_tree
      , n = e.stat_desc.has_stree
      , r = e.stat_desc.elems;
    let s, o, h, d = -1;
    for (t.heap_len = 0,
    t.heap_max = 573,
    s = 0; s < r; s++)
        0 !== a[2 * s] ? (t.heap[++t.heap_len] = d = s,
        t.depth[s] = 0) : a[2 * s + 1] = 0;
    for (; t.heap_len < 2; )
        h = t.heap[++t.heap_len] = d < 2 ? ++d : 0,
        a[2 * h] = 1,
        t.depth[h] = 0,
        t.opt_len--,
        n && (t.static_len -= i[2 * h + 1]);
    for (e.max_code = d,
    s = t.heap_len >> 1; s >= 1; s--)
        O(t, a, s);
    h = r;
    do {
        s = t.heap[1],
        t.heap[1] = t.heap[t.heap_len--],
        O(t, a, 1),
        o = t.heap[1],
        t.heap[--t.heap_max] = s,
        t.heap[--t.heap_max] = o,
        a[2 * h] = a[2 * s] + a[2 * o],
        t.depth[h] = (t.depth[s] >= t.depth[o] ? t.depth[s] : t.depth[o]) + 1,
        a[2 * s + 1] = a[2 * o + 1] = h,
        t.heap[1] = h++,
        O(t, a, 1)
    } while (t.heap_len >= 2);
    t.heap[--t.heap_max] = t.heap[1],
    ((t,e)=>{
        const a = e.dyn_tree
          , i = e.max_code
          , n = e.stat_desc.static_tree
          , r = e.stat_desc.has_stree
          , s = e.stat_desc.extra_bits
          , o = e.stat_desc.extra_base
          , h = e.stat_desc.max_length;
        let d, _, f, c, u, w, b = 0;
        for (c = 0; c <= l; c++)
            t.bl_count[c] = 0;
        for (a[2 * t.heap[t.heap_max] + 1] = 0,
        d = t.heap_max + 1; d < 573; d++)
            _ = t.heap[d],
            c = a[2 * a[2 * _ + 1] + 1] + 1,
            c > h && (c = h,
            b++),
            a[2 * _ + 1] = c,
            _ > i || (t.bl_count[c]++,
            u = 0,
            _ >= o && (u = s[_ - o]),
            w = a[2 * _],
            t.opt_len += w * (c + u),
            r && (t.static_len += w * (n[2 * _ + 1] + u)));
        if (0 !== b) {
            do {
                for (c = h - 1; 0 === t.bl_count[c]; )
                    c--;
                t.bl_count[c]--,
                t.bl_count[c + 1] += 2,
                t.bl_count[h]--,
                b -= 2
            } while (b > 0);
            for (c = h; 0 !== c; c--)
                for (_ = t.bl_count[c]; 0 !== _; )
                    f = t.heap[--d],
                    f > i || (a[2 * f + 1] !== c && (t.opt_len += (c - a[2 * f + 1]) * a[2 * f],
                    a[2 * f + 1] = c),
                    _--)
        }
    }
    )(t, e),
    Z(a, d, t.bl_count)
}
  , N = (t,e,a)=>{
    let i, n, r = -1, s = e[1], l = 0, o = 7, h = 4;
    for (0 === s && (o = 138,
    h = 3),
    e[2 * (a + 1) + 1] = 65535,
    i = 0; i <= a; i++)
        n = s,
        s = e[2 * (i + 1) + 1],
        ++l < o && n === s || (l < h ? t.bl_tree[2 * n] += l : 0 !== n ? (n !== r && t.bl_tree[2 * n]++,
        t.bl_tree[32]++) : l <= 10 ? t.bl_tree[34]++ : t.bl_tree[36]++,
        l = 0,
        r = n,
        0 === s ? (o = 138,
        h = 3) : n === s ? (o = 6,
        h = 3) : (o = 7,
        h = 4))
}
  , F = (t,e,a)=>{
    let i, n, r = -1, s = e[1], l = 0, o = 7, h = 4;
    for (0 === s && (o = 138,
    h = 3),
    i = 0; i <= a; i++)
        if (n = s,
        s = e[2 * (i + 1) + 1],
        !(++l < o && n === s)) {
            if (l < h)
                do {
                    E(t, n, t.bl_tree)
                } while (0 != --l);
            else
                0 !== n ? (n !== r && (E(t, n, t.bl_tree),
                l--),
                E(t, 16, t.bl_tree),
                A(t, l - 3, 2)) : l <= 10 ? (E(t, 17, t.bl_tree),
                A(t, l - 3, 3)) : (E(t, 18, t.bl_tree),
                A(t, l - 11, 7));
            l = 0,
            r = n,
            0 === s ? (o = 138,
            h = 3) : n === s ? (o = 6,
            h = 3) : (o = 7,
            h = 4)
        }
}
;
let B = !1;
const I = (t,e,a,i)=>{
    A(t, 0 + (i ? 1 : 0), 3),
    ((t,e,a,i)=>{
        S(t),
        i && (z(t, a),
        z(t, ~a)),
        t.pending_buf.set(t.window.subarray(e, e + a), t.pending),
        t.pending += a
    }
    )(t, e, a, !0)
}
;
var C = (t,e,a,i)=>{
    let r, s, l = 0;
    t.level > 0 ? (2 === t.strm.data_type && (t.strm.data_type = (t=>{
        let e, a = 4093624447;
        for (e = 0; e <= 31; e++,
        a >>>= 1)
            if (1 & a && 0 !== t.dyn_ltree[2 * e])
                return 0;
        if (0 !== t.dyn_ltree[18] || 0 !== t.dyn_ltree[20] || 0 !== t.dyn_ltree[26])
            return 1;
        for (e = 32; e < n; e++)
            if (0 !== t.dyn_ltree[2 * e])
                return 1;
        return 0
    }
    )(t)),
    L(t, t.l_desc),
    L(t, t.d_desc),
    l = (t=>{
        let e;
        for (N(t, t.dyn_ltree, t.l_desc.max_code),
        N(t, t.dyn_dtree, t.d_desc.max_code),
        L(t, t.bl_desc),
        e = 18; e >= 3 && 0 === t.bl_tree[2 * _[e] + 1]; e--)
            ;
        return t.opt_len += 3 * (e + 1) + 5 + 5 + 4,
        e
    }
    )(t),
    r = t.opt_len + 3 + 7 >>> 3,
    s = t.static_len + 3 + 7 >>> 3,
    s <= r && (r = s)) : r = s = a + 5,
    a + 4 <= r && -1 !== e ? I(t, e, a, i) : 4 === t.strategy || s === r ? (A(t, 2 + (i ? 1 : 0), 3),
    T(t, f, c)) : (A(t, 4 + (i ? 1 : 0), 3),
    ((t,e,a,i)=>{
        let n;
        for (A(t, e - 257, 5),
        A(t, a - 1, 5),
        A(t, i - 4, 4),
        n = 0; n < i; n++)
            A(t, t.bl_tree[2 * _[n] + 1], 3);
        F(t, t.dyn_ltree, e - 1),
        F(t, t.dyn_dtree, a - 1)
    }
    )(t, t.l_desc.max_code + 1, t.d_desc.max_code + 1, l + 1),
    T(t, t.dyn_ltree, t.dyn_dtree)),
    U(t),
    i && S(t)
}
  , H = {
    _tr_init: t=>{
        B || ((()=>{
            let t, e, a, i, n;
            const _ = new Array(16);
            for (a = 0,
            i = 0; i < 28; i++)
                for (b[i] = a,
                t = 0; t < 1 << o[i]; t++)
                    w[a++] = i;
            for (w[a - 1] = i,
            n = 0,
            i = 0; i < 16; i++)
                for (g[i] = n,
                t = 0; t < 1 << h[i]; t++)
                    u[n++] = i;
            for (n >>= 7; i < s; i++)
                for (g[i] = n << 7,
                t = 0; t < 1 << h[i] - 7; t++)
                    u[256 + n++] = i;
            for (e = 0; e <= l; e++)
                _[e] = 0;
            for (t = 0; t <= 143; )
                f[2 * t + 1] = 8,
                t++,
                _[8]++;
            for (; t <= 255; )
                f[2 * t + 1] = 9,
                t++,
                _[9]++;
            for (; t <= 279; )
                f[2 * t + 1] = 7,
                t++,
                _[7]++;
            for (; t <= 287; )
                f[2 * t + 1] = 8,
                t++,
                _[8]++;
            for (Z(f, 287, _),
            t = 0; t < s; t++)
                c[2 * t + 1] = 5,
                c[2 * t] = R(t, 5);
            p = new m(f,o,257,r,l),
            k = new m(c,h,0,s,l),
            v = new m(new Array(0),d,0,19,7)
        }
        )(),
        B = !0),
        t.l_desc = new y(t.dyn_ltree,p),
        t.d_desc = new y(t.dyn_dtree,k),
        t.bl_desc = new y(t.bl_tree,v),
        t.bi_buf = 0,
        t.bi_valid = 0,
        U(t)
    }
    ,
    _tr_stored_block: I,
    _tr_flush_block: C,
    _tr_tally: (t,e,a)=>(t.pending_buf[t.d_buf + 2 * t.last_lit] = e >>> 8 & 255,
    t.pending_buf[t.d_buf + 2 * t.last_lit + 1] = 255 & e,
    t.pending_buf[t.l_buf + t.last_lit] = 255 & a,
    t.last_lit++,
    0 === e ? t.dyn_ltree[2 * a]++ : (t.matches++,
    e--,
    t.dyn_ltree[2 * (w[a] + n + 1)]++,
    t.dyn_dtree[2 * x(e)]++),
    t.last_lit === t.lit_bufsize - 1),
    _tr_align: t=>{
        A(t, 2, 3),
        E(t, 256, f),
        (t=>{
            16 === t.bi_valid ? (z(t, t.bi_buf),
            t.bi_buf = 0,
            t.bi_valid = 0) : t.bi_valid >= 8 && (t.pending_buf[t.pending++] = 255 & t.bi_buf,
            t.bi_buf >>= 8,
            t.bi_valid -= 8)
        }
        )(t)
    }
};
var M = (t,e,a,i)=>{
    let n = 65535 & t | 0
      , r = t >>> 16 & 65535 | 0
      , s = 0;
    for (; 0 !== a; ) {
        s = a > 2e3 ? 2e3 : a,
        a -= s;
        do {
            n = n + e[i++] | 0,
            r = r + n | 0
        } while (--s);
        n %= 65521,
        r %= 65521
    }
    return n | r << 16 | 0
}
;
const K = new Uint32Array((()=>{
    let t, e = [];
    for (var a = 0; a < 256; a++) {
        t = a;
        for (var i = 0; i < 8; i++)
            t = 1 & t ? 3988292384 ^ t >>> 1 : t >>> 1;
        e[a] = t
    }
    return e
}
)());
var j = (t,e,a,i)=>{
    const n = K
      , r = i + a;
    t ^= -1;
    for (let s = i; s < r; s++)
        t = t >>> 8 ^ n[255 & (t ^ e[s])];
    return -1 ^ t
}
  , P = {
    2: "need dictionary",
    1: "stream end",
    0: "",
    "-1": "file error",
    "-2": "stream error",
    "-3": "data error",
    "-4": "insufficient memory",
    "-5": "buffer error",
    "-6": "incompatible version"
}
  , Y = {
    Z_NO_FLUSH: 0,
    Z_PARTIAL_FLUSH: 1,
    Z_SYNC_FLUSH: 2,
    Z_FULL_FLUSH: 3,
    Z_FINISH: 4,
    Z_BLOCK: 5,
    Z_TREES: 6,
    Z_OK: 0,
    Z_STREAM_END: 1,
    Z_NEED_DICT: 2,
    Z_ERRNO: -1,
    Z_STREAM_ERROR: -2,
    Z_DATA_ERROR: -3,
    Z_MEM_ERROR: -4,
    Z_BUF_ERROR: -5,
    Z_NO_COMPRESSION: 0,
    Z_BEST_SPEED: 1,
    Z_BEST_COMPRESSION: 9,
    Z_DEFAULT_COMPRESSION: -1,
    Z_FILTERED: 1,
    Z_HUFFMAN_ONLY: 2,
    Z_RLE: 3,
    Z_FIXED: 4,
    Z_DEFAULT_STRATEGY: 0,
    Z_BINARY: 0,
    Z_TEXT: 1,
    Z_UNKNOWN: 2,
    Z_DEFLATED: 8
};
const {_tr_init: G, _tr_stored_block: X, _tr_flush_block: W, _tr_tally: q, _tr_align: J} = H
  , {Z_NO_FLUSH: Q, Z_PARTIAL_FLUSH: V, Z_FULL_FLUSH: $, Z_FINISH: tt, Z_BLOCK: et, Z_OK: at, Z_STREAM_END: it, Z_STREAM_ERROR: nt, Z_DATA_ERROR: rt, Z_BUF_ERROR: st, Z_DEFAULT_COMPRESSION: lt, Z_FILTERED: ot, Z_HUFFMAN_ONLY: ht, Z_RLE: dt, Z_FIXED: _t, Z_DEFAULT_STRATEGY: ft, Z_UNKNOWN: ct, Z_DEFLATED: ut} = Y
  , wt = 258
  , bt = 262
  , gt = 103
  , mt = 113
  , pt = 666
  , kt = (t,e)=>(t.msg = P[e],
e)
  , vt = t=>(t << 1) - (t > 4 ? 9 : 0)
  , yt = t=>{
    let e = t.length;
    for (; --e >= 0; )
        t[e] = 0
}
;
let xt = (t,e,a)=>(e << t.hash_shift ^ a) & t.hash_mask;
const zt = t=>{
    const e = t.state;
    let a = e.pending;
    a > t.avail_out && (a = t.avail_out),
    0 !== a && (t.output.set(e.pending_buf.subarray(e.pending_out, e.pending_out + a), t.next_out),
    t.next_out += a,
    e.pending_out += a,
    t.total_out += a,
    t.avail_out -= a,
    e.pending -= a,
    0 === e.pending && (e.pending_out = 0))
}
  , At = (t,e)=>{
    W(t, t.block_start >= 0 ? t.block_start : -1, t.strstart - t.block_start, e),
    t.block_start = t.strstart,
    zt(t.strm)
}
  , Et = (t,e)=>{
    t.pending_buf[t.pending++] = e
}
  , Rt = (t,e)=>{
    t.pending_buf[t.pending++] = e >>> 8 & 255,
    t.pending_buf[t.pending++] = 255 & e
}
  , Zt = (t,e,a,i)=>{
    let n = t.avail_in;
    return n > i && (n = i),
    0 === n ? 0 : (t.avail_in -= n,
    e.set(t.input.subarray(t.next_in, t.next_in + n), a),
    1 === t.state.wrap ? t.adler = M(t.adler, e, n, a) : 2 === t.state.wrap && (t.adler = j(t.adler, e, n, a)),
    t.next_in += n,
    t.total_in += n,
    n)
}
  , Ut = (t,e)=>{
    let a, i, n = t.max_chain_length, r = t.strstart, s = t.prev_length, l = t.nice_match;
    const o = t.strstart > t.w_size - bt ? t.strstart - (t.w_size - bt) : 0
      , h = t.window
      , d = t.w_mask
      , _ = t.prev
      , f = t.strstart + wt;
    let c = h[r + s - 1]
      , u = h[r + s];
    t.prev_length >= t.good_match && (n >>= 2),
    l > t.lookahead && (l = t.lookahead);
    do {
        if (a = e,
        h[a + s] === u && h[a + s - 1] === c && h[a] === h[r] && h[++a] === h[r + 1]) {
            r += 2,
            a++;
            do {} while (h[++r] === h[++a] && h[++r] === h[++a] && h[++r] === h[++a] && h[++r] === h[++a] && h[++r] === h[++a] && h[++r] === h[++a] && h[++r] === h[++a] && h[++r] === h[++a] && r < f);
            if (i = wt - (f - r),
            r = f - wt,
            i > s) {
                if (t.match_start = e,
                s = i,
                i >= l)
                    break;
                c = h[r + s - 1],
                u = h[r + s]
            }
        }
    } while ((e = _[e & d]) > o && 0 != --n);
    return s <= t.lookahead ? s : t.lookahead
}
  , St = t=>{
    const e = t.w_size;
    let a, i, n, r, s;
    do {
        if (r = t.window_size - t.lookahead - t.strstart,
        t.strstart >= e + (e - bt)) {
            t.window.set(t.window.subarray(e, e + e), 0),
            t.match_start -= e,
            t.strstart -= e,
            t.block_start -= e,
            i = t.hash_size,
            a = i;
            do {
                n = t.head[--a],
                t.head[a] = n >= e ? n - e : 0
            } while (--i);
            i = e,
            a = i;
            do {
                n = t.prev[--a],
                t.prev[a] = n >= e ? n - e : 0
            } while (--i);
            r += e
        }
        if (0 === t.strm.avail_in)
            break;
        if (i = Zt(t.strm, t.window, t.strstart + t.lookahead, r),
        t.lookahead += i,
        t.lookahead + t.insert >= 3)
            for (s = t.strstart - t.insert,
            t.ins_h = t.window[s],
            t.ins_h = xt(t, t.ins_h, t.window[s + 1]); t.insert && (t.ins_h = xt(t, t.ins_h, t.window[s + 3 - 1]),
            t.prev[s & t.w_mask] = t.head[t.ins_h],
            t.head[t.ins_h] = s,
            s++,
            t.insert--,
            !(t.lookahead + t.insert < 3)); )
                ;
    } while (t.lookahead < bt && 0 !== t.strm.avail_in)
}
  , Dt = (t,e)=>{
    let a, i;
    for (; ; ) {
        if (t.lookahead < bt) {
            if (St(t),
            t.lookahead < bt && e === Q)
                return 1;
            if (0 === t.lookahead)
                break
        }
        if (a = 0,
        t.lookahead >= 3 && (t.ins_h = xt(t, t.ins_h, t.window[t.strstart + 3 - 1]),
        a = t.prev[t.strstart & t.w_mask] = t.head[t.ins_h],
        t.head[t.ins_h] = t.strstart),
        0 !== a && t.strstart - a <= t.w_size - bt && (t.match_length = Ut(t, a)),
        t.match_length >= 3)
            if (i = q(t, t.strstart - t.match_start, t.match_length - 3),
            t.lookahead -= t.match_length,
            t.match_length <= t.max_lazy_match && t.lookahead >= 3) {
                t.match_length--;
                do {
                    t.strstart++,
                    t.ins_h = xt(t, t.ins_h, t.window[t.strstart + 3 - 1]),
                    a = t.prev[t.strstart & t.w_mask] = t.head[t.ins_h],
                    t.head[t.ins_h] = t.strstart
                } while (0 != --t.match_length);
                t.strstart++
            } else
                t.strstart += t.match_length,
                t.match_length = 0,
                t.ins_h = t.window[t.strstart],
                t.ins_h = xt(t, t.ins_h, t.window[t.strstart + 1]);
        else
            i = q(t, 0, t.window[t.strstart]),
            t.lookahead--,
            t.strstart++;
        if (i && (At(t, !1),
        0 === t.strm.avail_out))
            return 1
    }
    return t.insert = t.strstart < 2 ? t.strstart : 2,
    e === tt ? (At(t, !0),
    0 === t.strm.avail_out ? 3 : 4) : t.last_lit && (At(t, !1),
    0 === t.strm.avail_out) ? 1 : 2
}
  , Ot = (t,e)=>{
    let a, i, n;
    for (; ; ) {
        if (t.lookahead < bt) {
            if (St(t),
            t.lookahead < bt && e === Q)
                return 1;
            if (0 === t.lookahead)
                break
        }
        if (a = 0,
        t.lookahead >= 3 && (t.ins_h = xt(t, t.ins_h, t.window[t.strstart + 3 - 1]),
        a = t.prev[t.strstart & t.w_mask] = t.head[t.ins_h],
        t.head[t.ins_h] = t.strstart),
        t.prev_length = t.match_length,
        t.prev_match = t.match_start,
        t.match_length = 2,
        0 !== a && t.prev_length < t.max_lazy_match && t.strstart - a <= t.w_size - bt && (t.match_length = Ut(t, a),
        t.match_length <= 5 && (t.strategy === ot || 3 === t.match_length && t.strstart - t.match_start > 4096) && (t.match_length = 2)),
        t.prev_length >= 3 && t.match_length <= t.prev_length) {
            n = t.strstart + t.lookahead - 3,
            i = q(t, t.strstart - 1 - t.prev_match, t.prev_length - 3),
            t.lookahead -= t.prev_length - 1,
            t.prev_length -= 2;
            do {
                ++t.strstart <= n && (t.ins_h = xt(t, t.ins_h, t.window[t.strstart + 3 - 1]),
                a = t.prev[t.strstart & t.w_mask] = t.head[t.ins_h],
                t.head[t.ins_h] = t.strstart)
            } while (0 != --t.prev_length);
            if (t.match_available = 0,
            t.match_length = 2,
            t.strstart++,
            i && (At(t, !1),
            0 === t.strm.avail_out))
                return 1
        } else if (t.match_available) {
            if (i = q(t, 0, t.window[t.strstart - 1]),
            i && At(t, !1),
            t.strstart++,
            t.lookahead--,
            0 === t.strm.avail_out)
                return 1
        } else
            t.match_available = 1,
            t.strstart++,
            t.lookahead--
    }
    return t.match_available && (i = q(t, 0, t.window[t.strstart - 1]),
    t.match_available = 0),
    t.insert = t.strstart < 2 ? t.strstart : 2,
    e === tt ? (At(t, !0),
    0 === t.strm.avail_out ? 3 : 4) : t.last_lit && (At(t, !1),
    0 === t.strm.avail_out) ? 1 : 2
}
;
function Tt(t, e, a, i, n) {
    this.good_length = t,
    this.max_lazy = e,
    this.nice_length = a,
    this.max_chain = i,
    this.func = n
}
const Lt = [new Tt(0,0,0,0,((t,e)=>{
    let a = 65535;
    for (a > t.pending_buf_size - 5 && (a = t.pending_buf_size - 5); ; ) {
        if (t.lookahead <= 1) {
            if (St(t),
            0 === t.lookahead && e === Q)
                return 1;
            if (0 === t.lookahead)
                break
        }
        t.strstart += t.lookahead,
        t.lookahead = 0;
        const i = t.block_start + a;
        if ((0 === t.strstart || t.strstart >= i) && (t.lookahead = t.strstart - i,
        t.strstart = i,
        At(t, !1),
        0 === t.strm.avail_out))
            return 1;
        if (t.strstart - t.block_start >= t.w_size - bt && (At(t, !1),
        0 === t.strm.avail_out))
            return 1
    }
    return t.insert = 0,
    e === tt ? (At(t, !0),
    0 === t.strm.avail_out ? 3 : 4) : (t.strstart > t.block_start && (At(t, !1),
    t.strm.avail_out),
    1)
}
)), new Tt(4,4,8,4,Dt), new Tt(4,5,16,8,Dt), new Tt(4,6,32,32,Dt), new Tt(4,4,16,16,Ot), new Tt(8,16,32,32,Ot), new Tt(8,16,128,128,Ot), new Tt(8,32,128,256,Ot), new Tt(32,128,258,1024,Ot), new Tt(32,258,258,4096,Ot)];
function Nt() {
    this.strm = null,
    this.status = 0,
    this.pending_buf = null,
    this.pending_buf_size = 0,
    this.pending_out = 0,
    this.pending = 0,
    this.wrap = 0,
    this.gzhead = null,
    this.gzindex = 0,
    this.method = ut,
    this.last_flush = -1,
    this.w_size = 0,
    this.w_bits = 0,
    this.w_mask = 0,
    this.window = null,
    this.window_size = 0,
    this.prev = null,
    this.head = null,
    this.ins_h = 0,
    this.hash_size = 0,
    this.hash_bits = 0,
    this.hash_mask = 0,
    this.hash_shift = 0,
    this.block_start = 0,
    this.match_length = 0,
    this.prev_match = 0,
    this.match_available = 0,
    this.strstart = 0,
    this.match_start = 0,
    this.lookahead = 0,
    this.prev_length = 0,
    this.max_chain_length = 0,
    this.max_lazy_match = 0,
    this.level = 0,
    this.strategy = 0,
    this.good_match = 0,
    this.nice_match = 0,
    this.dyn_ltree = new Uint16Array(1146),
    this.dyn_dtree = new Uint16Array(122),
    this.bl_tree = new Uint16Array(78),
    yt(this.dyn_ltree),
    yt(this.dyn_dtree),
    yt(this.bl_tree),
    this.l_desc = null,
    this.d_desc = null,
    this.bl_desc = null,
    this.bl_count = new Uint16Array(16),
    this.heap = new Uint16Array(573),
    yt(this.heap),
    this.heap_len = 0,
    this.heap_max = 0,
    this.depth = new Uint16Array(573),
    yt(this.depth),
    this.l_buf = 0,
    this.lit_bufsize = 0,
    this.last_lit = 0,
    this.d_buf = 0,
    this.opt_len = 0,
    this.static_len = 0,
    this.matches = 0,
    this.insert = 0,
    this.bi_buf = 0,
    this.bi_valid = 0
}
const Ft = t=>{
    if (!t || !t.state)
        return kt(t, nt);
    t.total_in = t.total_out = 0,
    t.data_type = ct;
    const e = t.state;
    return e.pending = 0,
    e.pending_out = 0,
    e.wrap < 0 && (e.wrap = -e.wrap),
    e.status = e.wrap ? 42 : mt,
    t.adler = 2 === e.wrap ? 0 : 1,
    e.last_flush = Q,
    G(e),
    at
}
  , Bt = t=>{
    const e = Ft(t);
    var a;
    return e === at && ((a = t.state).window_size = 2 * a.w_size,
    yt(a.head),
    a.max_lazy_match = Lt[a.level].max_lazy,
    a.good_match = Lt[a.level].good_length,
    a.nice_match = Lt[a.level].nice_length,
    a.max_chain_length = Lt[a.level].max_chain,
    a.strstart = 0,
    a.block_start = 0,
    a.lookahead = 0,
    a.insert = 0,
    a.match_length = a.prev_length = 2,
    a.match_available = 0,
    a.ins_h = 0),
    e
}
  , It = (t,e,a,i,n,r)=>{
    if (!t)
        return nt;
    let s = 1;
    if (e === lt && (e = 6),
    i < 0 ? (s = 0,
    i = -i) : i > 15 && (s = 2,
    i -= 16),
    n < 1 || n > 9 || a !== ut || i < 8 || i > 15 || e < 0 || e > 9 || r < 0 || r > _t)
        return kt(t, nt);
    8 === i && (i = 9);
    const l = new Nt;
    return t.state = l,
    l.strm = t,
    l.wrap = s,
    l.gzhead = null,
    l.w_bits = i,
    l.w_size = 1 << l.w_bits,
    l.w_mask = l.w_size - 1,
    l.hash_bits = n + 7,
    l.hash_size = 1 << l.hash_bits,
    l.hash_mask = l.hash_size - 1,
    l.hash_shift = ~~((l.hash_bits + 3 - 1) / 3),
    l.window = new Uint8Array(2 * l.w_size),
    l.head = new Uint16Array(l.hash_size),
    l.prev = new Uint16Array(l.w_size),
    l.lit_bufsize = 1 << n + 6,
    l.pending_buf_size = 4 * l.lit_bufsize,
    l.pending_buf = new Uint8Array(l.pending_buf_size),
    l.d_buf = 1 * l.lit_bufsize,
    l.l_buf = 3 * l.lit_bufsize,
    l.level = e,
    l.strategy = r,
    l.method = a,
    Bt(t)
}
;
var Ct = {
    deflateInit: (t,e)=>It(t, e, ut, 15, 8, ft),
    deflateInit2: It,
    deflateReset: Bt,
    deflateResetKeep: Ft,
    deflateSetHeader: (t,e)=>t && t.state ? 2 !== t.state.wrap ? nt : (t.state.gzhead = e,
    at) : nt,
    deflate: (t,e)=>{
        let a, i;
        if (!t || !t.state || e > et || e < 0)
            return t ? kt(t, nt) : nt;
        const n = t.state;
        if (!t.output || !t.input && 0 !== t.avail_in || n.status === pt && e !== tt)
            return kt(t, 0 === t.avail_out ? st : nt);
        n.strm = t;
        const r = n.last_flush;
        if (n.last_flush = e,
        42 === n.status)
            if (2 === n.wrap)
                t.adler = 0,
                Et(n, 31),
                Et(n, 139),
                Et(n, 8),
                n.gzhead ? (Et(n, (n.gzhead.text ? 1 : 0) + (n.gzhead.hcrc ? 2 : 0) + (n.gzhead.extra ? 4 : 0) + (n.gzhead.name ? 8 : 0) + (n.gzhead.comment ? 16 : 0)),
                Et(n, 255 & n.gzhead.time),
                Et(n, n.gzhead.time >> 8 & 255),
                Et(n, n.gzhead.time >> 16 & 255),
                Et(n, n.gzhead.time >> 24 & 255),
                Et(n, 9 === n.level ? 2 : n.strategy >= ht || n.level < 2 ? 4 : 0),
                Et(n, 255 & n.gzhead.os),
                n.gzhead.extra && n.gzhead.extra.length && (Et(n, 255 & n.gzhead.extra.length),
                Et(n, n.gzhead.extra.length >> 8 & 255)),
                n.gzhead.hcrc && (t.adler = j(t.adler, n.pending_buf, n.pending, 0)),
                n.gzindex = 0,
                n.status = 69) : (Et(n, 0),
                Et(n, 0),
                Et(n, 0),
                Et(n, 0),
                Et(n, 0),
                Et(n, 9 === n.level ? 2 : n.strategy >= ht || n.level < 2 ? 4 : 0),
                Et(n, 3),
                n.status = mt);
            else {
                let e = ut + (n.w_bits - 8 << 4) << 8
                  , a = -1;
                a = n.strategy >= ht || n.level < 2 ? 0 : n.level < 6 ? 1 : 6 === n.level ? 2 : 3,
                e |= a << 6,
                0 !== n.strstart && (e |= 32),
                e += 31 - e % 31,
                n.status = mt,
                Rt(n, e),
                0 !== n.strstart && (Rt(n, t.adler >>> 16),
                Rt(n, 65535 & t.adler)),
                t.adler = 1
            }
        if (69 === n.status)
            if (n.gzhead.extra) {
                for (a = n.pending; n.gzindex < (65535 & n.gzhead.extra.length) && (n.pending !== n.pending_buf_size || (n.gzhead.hcrc && n.pending > a && (t.adler = j(t.adler, n.pending_buf, n.pending - a, a)),
                zt(t),
                a = n.pending,
                n.pending !== n.pending_buf_size)); )
                    Et(n, 255 & n.gzhead.extra[n.gzindex]),
                    n.gzindex++;
                n.gzhead.hcrc && n.pending > a && (t.adler = j(t.adler, n.pending_buf, n.pending - a, a)),
                n.gzindex === n.gzhead.extra.length && (n.gzindex = 0,
                n.status = 73)
            } else
                n.status = 73;
        if (73 === n.status)
            if (n.gzhead.name) {
                a = n.pending;
                do {
                    if (n.pending === n.pending_buf_size && (n.gzhead.hcrc && n.pending > a && (t.adler = j(t.adler, n.pending_buf, n.pending - a, a)),
                    zt(t),
                    a = n.pending,
                    n.pending === n.pending_buf_size)) {
                        i = 1;
                        break
                    }
                    i = n.gzindex < n.gzhead.name.length ? 255 & n.gzhead.name.charCodeAt(n.gzindex++) : 0,
                    Et(n, i)
                } while (0 !== i);
                n.gzhead.hcrc && n.pending > a && (t.adler = j(t.adler, n.pending_buf, n.pending - a, a)),
                0 === i && (n.gzindex = 0,
                n.status = 91)
            } else
                n.status = 91;
        if (91 === n.status)
            if (n.gzhead.comment) {
                a = n.pending;
                do {
                    if (n.pending === n.pending_buf_size && (n.gzhead.hcrc && n.pending > a && (t.adler = j(t.adler, n.pending_buf, n.pending - a, a)),
                    zt(t),
                    a = n.pending,
                    n.pending === n.pending_buf_size)) {
                        i = 1;
                        break
                    }
                    i = n.gzindex < n.gzhead.comment.length ? 255 & n.gzhead.comment.charCodeAt(n.gzindex++) : 0,
                    Et(n, i)
                } while (0 !== i);
                n.gzhead.hcrc && n.pending > a && (t.adler = j(t.adler, n.pending_buf, n.pending - a, a)),
                0 === i && (n.status = gt)
            } else
                n.status = gt;
        if (n.status === gt && (n.gzhead.hcrc ? (n.pending + 2 > n.pending_buf_size && zt(t),
        n.pending + 2 <= n.pending_buf_size && (Et(n, 255 & t.adler),
        Et(n, t.adler >> 8 & 255),
        t.adler = 0,
        n.status = mt)) : n.status = mt),
        0 !== n.pending) {
            if (zt(t),
            0 === t.avail_out)
                return n.last_flush = -1,
                at
        } else if (0 === t.avail_in && vt(e) <= vt(r) && e !== tt)
            return kt(t, st);
        if (n.status === pt && 0 !== t.avail_in)
            return kt(t, st);
        if (0 !== t.avail_in || 0 !== n.lookahead || e !== Q && n.status !== pt) {
            let a = n.strategy === ht ? ((t,e)=>{
                let a;
                for (; ; ) {
                    if (0 === t.lookahead && (St(t),
                    0 === t.lookahead)) {
                        if (e === Q)
                            return 1;
                        break
                    }
                    if (t.match_length = 0,
                    a = q(t, 0, t.window[t.strstart]),
                    t.lookahead--,
                    t.strstart++,
                    a && (At(t, !1),
                    0 === t.strm.avail_out))
                        return 1
                }
                return t.insert = 0,
                e === tt ? (At(t, !0),
                0 === t.strm.avail_out ? 3 : 4) : t.last_lit && (At(t, !1),
                0 === t.strm.avail_out) ? 1 : 2
            }
            )(n, e) : n.strategy === dt ? ((t,e)=>{
                let a, i, n, r;
                const s = t.window;
                for (; ; ) {
                    if (t.lookahead <= wt) {
                        if (St(t),
                        t.lookahead <= wt && e === Q)
                            return 1;
                        if (0 === t.lookahead)
                            break
                    }
                    if (t.match_length = 0,
                    t.lookahead >= 3 && t.strstart > 0 && (n = t.strstart - 1,
                    i = s[n],
                    i === s[++n] && i === s[++n] && i === s[++n])) {
                        r = t.strstart + wt;
                        do {} while (i === s[++n] && i === s[++n] && i === s[++n] && i === s[++n] && i === s[++n] && i === s[++n] && i === s[++n] && i === s[++n] && n < r);
                        t.match_length = wt - (r - n),
                        t.match_length > t.lookahead && (t.match_length = t.lookahead)
                    }
                    if (t.match_length >= 3 ? (a = q(t, 1, t.match_length - 3),
                    t.lookahead -= t.match_length,
                    t.strstart += t.match_length,
                    t.match_length = 0) : (a = q(t, 0, t.window[t.strstart]),
                    t.lookahead--,
                    t.strstart++),
                    a && (At(t, !1),
                    0 === t.strm.avail_out))
                        return 1
                }
                return t.insert = 0,
                e === tt ? (At(t, !0),
                0 === t.strm.avail_out ? 3 : 4) : t.last_lit && (At(t, !1),
                0 === t.strm.avail_out) ? 1 : 2
            }
            )(n, e) : Lt[n.level].func(n, e);
            if (3 !== a && 4 !== a || (n.status = pt),
            1 === a || 3 === a)
                return 0 === t.avail_out && (n.last_flush = -1),
                at;
            if (2 === a && (e === V ? J(n) : e !== et && (X(n, 0, 0, !1),
            e === $ && (yt(n.head),
            0 === n.lookahead && (n.strstart = 0,
            n.block_start = 0,
            n.insert = 0))),
            zt(t),
            0 === t.avail_out))
                return n.last_flush = -1,
                at
        }
        return e !== tt ? at : n.wrap <= 0 ? it : (2 === n.wrap ? (Et(n, 255 & t.adler),
        Et(n, t.adler >> 8 & 255),
        Et(n, t.adler >> 16 & 255),
        Et(n, t.adler >> 24 & 255),
        Et(n, 255 & t.total_in),
        Et(n, t.total_in >> 8 & 255),
        Et(n, t.total_in >> 16 & 255),
        Et(n, t.total_in >> 24 & 255)) : (Rt(n, t.adler >>> 16),
        Rt(n, 65535 & t.adler)),
        zt(t),
        n.wrap > 0 && (n.wrap = -n.wrap),
        0 !== n.pending ? at : it)
    }
    ,
    deflateEnd: t=>{
        if (!t || !t.state)
            return nt;
        const e = t.state.status;
        return 42 !== e && 69 !== e && 73 !== e && 91 !== e && e !== gt && e !== mt && e !== pt ? kt(t, nt) : (t.state = null,
        e === mt ? kt(t, rt) : at)
    }
    ,
    deflateSetDictionary: (t,e)=>{
        let a = e.length;
        if (!t || !t.state)
            return nt;
        const i = t.state
          , n = i.wrap;
        if (2 === n || 1 === n && 42 !== i.status || i.lookahead)
            return nt;
        if (1 === n && (t.adler = M(t.adler, e, a, 0)),
        i.wrap = 0,
        a >= i.w_size) {
            0 === n && (yt(i.head),
            i.strstart = 0,
            i.block_start = 0,
            i.insert = 0);
            let t = new Uint8Array(i.w_size);
            t.set(e.subarray(a - i.w_size, a), 0),
            e = t,
            a = i.w_size
        }
        const r = t.avail_in
          , s = t.next_in
          , l = t.input;
        for (t.avail_in = a,
        t.next_in = 0,
        t.input = e,
        St(i); i.lookahead >= 3; ) {
            let t = i.strstart
              , e = i.lookahead - 2;
            do {
                i.ins_h = xt(i, i.ins_h, i.window[t + 3 - 1]),
                i.prev[t & i.w_mask] = i.head[i.ins_h],
                i.head[i.ins_h] = t,
                t++
            } while (--e);
            i.strstart = t,
            i.lookahead = 2,
            St(i)
        }
        return i.strstart += i.lookahead,
        i.block_start = i.strstart,
        i.insert = i.lookahead,
        i.lookahead = 0,
        i.match_length = i.prev_length = 2,
        i.match_available = 0,
        t.next_in = s,
        t.input = l,
        t.avail_in = r,
        i.wrap = n,
        at
    }
    ,
    deflateInfo: "pako deflate (from Nodeca project)"
};
const Ht = (t,e)=>Object.prototype.hasOwnProperty.call(t, e);
var Mt = function(t) {
    const e = Array.prototype.slice.call(arguments, 1);
    for (; e.length; ) {
        const a = e.shift();
        if (a) {
            if ("object" != typeof a)
                throw new TypeError(a + "must be non-object");
            for (const e in a)
                Ht(a, e) && (t[e] = a[e])
        }
    }
    return t
}
  , Kt = t=>{
    let e = 0;
    for (let i = 0, n = t.length; i < n; i++)
        e += t[i].length;
    const a = new Uint8Array(e);
    for (let i = 0, n = 0, r = t.length; i < r; i++) {
        let e = t[i];
        a.set(e, n),
        n += e.length
    }
    return a
}
;
let jt = !0;
try {
    String.fromCharCode.apply(null, new Uint8Array(1))
} catch (oa) {
    jt = !1
}
const Pt = new Uint8Array(256);
for (let ha = 0; ha < 256; ha++)
    Pt[ha] = ha >= 252 ? 6 : ha >= 248 ? 5 : ha >= 240 ? 4 : ha >= 224 ? 3 : ha >= 192 ? 2 : 1;
Pt[254] = Pt[254] = 1;
var Yt = t=>{
    if ("function" == typeof TextEncoder && TextEncoder.prototype.encode)
        return (new TextEncoder).encode(t);
    let e, a, i, n, r, s = t.length, l = 0;
    for (n = 0; n < s; n++)
        a = t.charCodeAt(n),
        55296 == (64512 & a) && n + 1 < s && (i = t.charCodeAt(n + 1),
        56320 == (64512 & i) && (a = 65536 + (a - 55296 << 10) + (i - 56320),
        n++)),
        l += a < 128 ? 1 : a < 2048 ? 2 : a < 65536 ? 3 : 4;
    for (e = new Uint8Array(l),
    r = 0,
    n = 0; r < l; n++)
        a = t.charCodeAt(n),
        55296 == (64512 & a) && n + 1 < s && (i = t.charCodeAt(n + 1),
        56320 == (64512 & i) && (a = 65536 + (a - 55296 << 10) + (i - 56320),
        n++)),
        a < 128 ? e[r++] = a : a < 2048 ? (e[r++] = 192 | a >>> 6,
        e[r++] = 128 | 63 & a) : a < 65536 ? (e[r++] = 224 | a >>> 12,
        e[r++] = 128 | a >>> 6 & 63,
        e[r++] = 128 | 63 & a) : (e[r++] = 240 | a >>> 18,
        e[r++] = 128 | a >>> 12 & 63,
        e[r++] = 128 | a >>> 6 & 63,
        e[r++] = 128 | 63 & a);
    return e
}
  , Gt = (t,e)=>{
    const a = e || t.length;
    if ("function" == typeof TextDecoder && TextDecoder.prototype.decode)
        return (new TextDecoder).decode(t.subarray(0, e));
    let i, n;
    const r = new Array(2 * a);
    for (n = 0,
    i = 0; i < a; ) {
        let e = t[i++];
        if (e < 128) {
            r[n++] = e;
            continue
        }
        let s = Pt[e];
        if (s > 4)
            r[n++] = 65533,
            i += s - 1;
        else {
            for (e &= 2 === s ? 31 : 3 === s ? 15 : 7; s > 1 && i < a; )
                e = e << 6 | 63 & t[i++],
                s--;
            s > 1 ? r[n++] = 65533 : e < 65536 ? r[n++] = e : (e -= 65536,
            r[n++] = 55296 | e >> 10 & 1023,
            r[n++] = 56320 | 1023 & e)
        }
    }
    return ((t,e)=>{
        if (e < 65534 && t.subarray && jt)
            return String.fromCharCode.apply(null, t.length === e ? t : t.subarray(0, e));
        let a = "";
        for (let i = 0; i < e; i++)
            a += String.fromCharCode(t[i]);
        return a
    }
    )(r, n)
}
  , Xt = (t,e)=>{
    (e = e || t.length) > t.length && (e = t.length);
    let a = e - 1;
    for (; a >= 0 && 128 == (192 & t[a]); )
        a--;
    return a < 0 || 0 === a ? e : a + Pt[t[a]] > e ? a : e
}
;
var Wt = function() {
    this.input = null,
    this.next_in = 0,
    this.avail_in = 0,
    this.total_in = 0,
    this.output = null,
    this.next_out = 0,
    this.avail_out = 0,
    this.total_out = 0,
    this.msg = "",
    this.state = null,
    this.data_type = 2,
    this.adler = 0
};
const qt = Object.prototype.toString
  , {Z_NO_FLUSH: Jt, Z_SYNC_FLUSH: Qt, Z_FULL_FLUSH: Vt, Z_FINISH: $t, Z_OK: te, Z_STREAM_END: ee, Z_DEFAULT_COMPRESSION: ae, Z_DEFAULT_STRATEGY: ie, Z_DEFLATED: ne} = Y;
function re(t) {
    this.options = Mt({
        level: ae,
        method: ne,
        chunkSize: 16384,
        windowBits: 15,
        memLevel: 8,
        strategy: ie
    }, t || {});
    let e = this.options;
    e.raw && e.windowBits > 0 ? e.windowBits = -e.windowBits : e.gzip && e.windowBits > 0 && e.windowBits < 16 && (e.windowBits += 16),
    this.err = 0,
    this.msg = "",
    this.ended = !1,
    this.chunks = [],
    this.strm = new Wt,
    this.strm.avail_out = 0;
    let a = Ct.deflateInit2(this.strm, e.level, e.method, e.windowBits, e.memLevel, e.strategy);
    if (a !== te)
        throw new Error(P[a]);
    if (e.header && Ct.deflateSetHeader(this.strm, e.header),
    e.dictionary) {
        let t;
        if (t = "string" == typeof e.dictionary ? Yt(e.dictionary) : "[object ArrayBuffer]" === qt.call(e.dictionary) ? new Uint8Array(e.dictionary) : e.dictionary,
        a = Ct.deflateSetDictionary(this.strm, t),
        a !== te)
            throw new Error(P[a]);
        this._dict_set = !0
    }
}
function se(t, e) {
    const a = new re(e);
    if (a.push(t, !0),
    a.err)
        throw a.msg || P[a.err];
    return a.result
}
re.prototype.push = function(t, e) {
    const a = this.strm
      , i = this.options.chunkSize;
    let n, r;
    if (this.ended)
        return !1;
    for (r = e === ~~e ? e : !0 === e ? $t : Jt,
    "string" == typeof t ? a.input = Yt(t) : "[object ArrayBuffer]" === qt.call(t) ? a.input = new Uint8Array(t) : a.input = t,
    a.next_in = 0,
    a.avail_in = a.input.length; ; )
        if (0 === a.avail_out && (a.output = new Uint8Array(i),
        a.next_out = 0,
        a.avail_out = i),
        (r === Qt || r === Vt) && a.avail_out <= 6)
            this.onData(a.output.subarray(0, a.next_out)),
            a.avail_out = 0;
        else {
            if (n = Ct.deflate(a, r),
            n === ee)
                return a.next_out > 0 && this.onData(a.output.subarray(0, a.next_out)),
                n = Ct.deflateEnd(this.strm),
                this.onEnd(n),
                this.ended = !0,
                n === te;
            if (0 !== a.avail_out) {
                if (r > 0 && a.next_out > 0)
                    this.onData(a.output.subarray(0, a.next_out)),
                    a.avail_out = 0;
                else if (0 === a.avail_in)
                    break
            } else
                this.onData(a.output)
        }
    return !0
}
,
re.prototype.onData = function(t) {
    this.chunks.push(t)
}
,
re.prototype.onEnd = function(t) {
    t === te && (this.result = Kt(this.chunks)),
    this.chunks = [],
    this.err = t,
    this.msg = this.strm.msg
}
;
var le = {
    Deflate: re,
    deflate: se,
    deflateRaw: function(t, e) {
        return (e = e || {}).raw = !0,
        se(t, e)
    },
    gzip: function(t, e) {
        return (e = e || {}).gzip = !0,
        se(t, e)
    },
    constants: Y
};
var oe = function(t, e) {
    let a, i, n, r, s, l, o, h, d, _, f, c, u, w, b, g, m, p, k, v, y, x, z, A;
    const E = t.state;
    a = t.next_in,
    z = t.input,
    i = a + (t.avail_in - 5),
    n = t.next_out,
    A = t.output,
    r = n - (e - t.avail_out),
    s = n + (t.avail_out - 257),
    l = E.dmax,
    o = E.wsize,
    h = E.whave,
    d = E.wnext,
    _ = E.window,
    f = E.hold,
    c = E.bits,
    u = E.lencode,
    w = E.distcode,
    b = (1 << E.lenbits) - 1,
    g = (1 << E.distbits) - 1;
    t: do {
        c < 15 && (f += z[a++] << c,
        c += 8,
        f += z[a++] << c,
        c += 8),
        m = u[f & b];
        e: for (; ; ) {
            if (p = m >>> 24,
            f >>>= p,
            c -= p,
            p = m >>> 16 & 255,
            0 === p)
                A[n++] = 65535 & m;
            else {
                if (!(16 & p)) {
                    if (0 == (64 & p)) {
                        m = u[(65535 & m) + (f & (1 << p) - 1)];
                        continue e
                    }
                    if (32 & p) {
                        E.mode = 12;
                        break t
                    }
                    t.msg = "invalid literal/length code",
                    E.mode = 30;
                    break t
                }
                k = 65535 & m,
                p &= 15,
                p && (c < p && (f += z[a++] << c,
                c += 8),
                k += f & (1 << p) - 1,
                f >>>= p,
                c -= p),
                c < 15 && (f += z[a++] << c,
                c += 8,
                f += z[a++] << c,
                c += 8),
                m = w[f & g];
                a: for (; ; ) {
                    if (p = m >>> 24,
                    f >>>= p,
                    c -= p,
                    p = m >>> 16 & 255,
                    !(16 & p)) {
                        if (0 == (64 & p)) {
                            m = w[(65535 & m) + (f & (1 << p) - 1)];
                            continue a
                        }
                        t.msg = "invalid distance code",
                        E.mode = 30;
                        break t
                    }
                    if (v = 65535 & m,
                    p &= 15,
                    c < p && (f += z[a++] << c,
                    c += 8,
                    c < p && (f += z[a++] << c,
                    c += 8)),
                    v += f & (1 << p) - 1,
                    v > l) {
                        t.msg = "invalid distance too far back",
                        E.mode = 30;
                        break t
                    }
                    if (f >>>= p,
                    c -= p,
                    p = n - r,
                    v > p) {
                        if (p = v - p,
                        p > h && E.sane) {
                            t.msg = "invalid distance too far back",
                            E.mode = 30;
                            break t
                        }
                        if (y = 0,
                        x = _,
                        0 === d) {
                            if (y += o - p,
                            p < k) {
                                k -= p;
                                do {
                                    A[n++] = _[y++]
                                } while (--p);
                                y = n - v,
                                x = A
                            }
                        } else if (d < p) {
                            if (y += o + d - p,
                            p -= d,
                            p < k) {
                                k -= p;
                                do {
                                    A[n++] = _[y++]
                                } while (--p);
                                if (y = 0,
                                d < k) {
                                    p = d,
                                    k -= p;
                                    do {
                                        A[n++] = _[y++]
                                    } while (--p);
                                    y = n - v,
                                    x = A
                                }
                            }
                        } else if (y += d - p,
                        p < k) {
                            k -= p;
                            do {
                                A[n++] = _[y++]
                            } while (--p);
                            y = n - v,
                            x = A
                        }
                        for (; k > 2; )
                            A[n++] = x[y++],
                            A[n++] = x[y++],
                            A[n++] = x[y++],
                            k -= 3;
                        k && (A[n++] = x[y++],
                        k > 1 && (A[n++] = x[y++]))
                    } else {
                        y = n - v;
                        do {
                            A[n++] = A[y++],
                            A[n++] = A[y++],
                            A[n++] = A[y++],
                            k -= 3
                        } while (k > 2);
                        k && (A[n++] = A[y++],
                        k > 1 && (A[n++] = A[y++]))
                    }
                    break
                }
            }
            break
        }
    } while (a < i && n < s);
    k = c >> 3,
    a -= k,
    c -= k << 3,
    f &= (1 << c) - 1,
    t.next_in = a,
    t.next_out = n,
    t.avail_in = a < i ? i - a + 5 : 5 - (a - i),
    t.avail_out = n < s ? s - n + 257 : 257 - (n - s),
    E.hold = f,
    E.bits = c
};
const he = 15
  , de = new Uint16Array([3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0])
  , _e = new Uint8Array([16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78])
  , fe = new Uint16Array([1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0])
  , ce = new Uint8Array([16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64]);
var ue = (t,e,a,i,n,r,s,l)=>{
    const o = l.bits;
    let h, d, _, f, c, u, w = 0, b = 0, g = 0, m = 0, p = 0, k = 0, v = 0, y = 0, x = 0, z = 0, A = null, E = 0;
    const R = new Uint16Array(16)
      , Z = new Uint16Array(16);
    let U, S, D, O = null, T = 0;
    for (w = 0; w <= he; w++)
        R[w] = 0;
    for (b = 0; b < i; b++)
        R[e[a + b]]++;
    for (p = o,
    m = he; m >= 1 && 0 === R[m]; m--)
        ;
    if (p > m && (p = m),
    0 === m)
        return n[r++] = 20971520,
        n[r++] = 20971520,
        l.bits = 1,
        0;
    for (g = 1; g < m && 0 === R[g]; g++)
        ;
    for (p < g && (p = g),
    y = 1,
    w = 1; w <= he; w++)
        if (y <<= 1,
        y -= R[w],
        y < 0)
            return -1;
    if (y > 0 && (0 === t || 1 !== m))
        return -1;
    for (Z[1] = 0,
    w = 1; w < he; w++)
        Z[w + 1] = Z[w] + R[w];
    for (b = 0; b < i; b++)
        0 !== e[a + b] && (s[Z[e[a + b]]++] = b);
    if (0 === t ? (A = O = s,
    u = 19) : 1 === t ? (A = de,
    E -= 257,
    O = _e,
    T -= 257,
    u = 256) : (A = fe,
    O = ce,
    u = -1),
    z = 0,
    b = 0,
    w = g,
    c = r,
    k = p,
    v = 0,
    _ = -1,
    x = 1 << p,
    f = x - 1,
    1 === t && x > 852 || 2 === t && x > 592)
        return 1;
    for (; ; ) {
        U = w - v,
        s[b] < u ? (S = 0,
        D = s[b]) : s[b] > u ? (S = O[T + s[b]],
        D = A[E + s[b]]) : (S = 96,
        D = 0),
        h = 1 << w - v,
        d = 1 << k,
        g = d;
        do {
            d -= h,
            n[c + (z >> v) + d] = U << 24 | S << 16 | D | 0
        } while (0 !== d);
        for (h = 1 << w - 1; z & h; )
            h >>= 1;
        if (0 !== h ? (z &= h - 1,
        z += h) : z = 0,
        b++,
        0 == --R[w]) {
            if (w === m)
                break;
            w = e[a + s[b]]
        }
        if (w > p && (z & f) !== _) {
            for (0 === v && (v = p),
            c += g,
            k = w - v,
            y = 1 << k; k + v < m && (y -= R[k + v],
            !(y <= 0)); )
                k++,
                y <<= 1;
            if (x += 1 << k,
            1 === t && x > 852 || 2 === t && x > 592)
                return 1;
            _ = z & f,
            n[_] = p << 24 | k << 16 | c - r | 0
        }
    }
    return 0 !== z && (n[c + z] = w - v << 24 | 64 << 16 | 0),
    l.bits = p,
    0
}
;
const {Z_FINISH: we, Z_BLOCK: be, Z_TREES: ge, Z_OK: me, Z_STREAM_END: pe, Z_NEED_DICT: ke, Z_STREAM_ERROR: ve, Z_DATA_ERROR: ye, Z_MEM_ERROR: xe, Z_BUF_ERROR: ze, Z_DEFLATED: Ae} = Y
  , Ee = 12
  , Re = 30
  , Ze = t=>(t >>> 24 & 255) + (t >>> 8 & 65280) + ((65280 & t) << 8) + ((255 & t) << 24);
function Ue() {
    this.mode = 0,
    this.last = !1,
    this.wrap = 0,
    this.havedict = !1,
    this.flags = 0,
    this.dmax = 0,
    this.check = 0,
    this.total = 0,
    this.head = null,
    this.wbits = 0,
    this.wsize = 0,
    this.whave = 0,
    this.wnext = 0,
    this.window = null,
    this.hold = 0,
    this.bits = 0,
    this.length = 0,
    this.offset = 0,
    this.extra = 0,
    this.lencode = null,
    this.distcode = null,
    this.lenbits = 0,
    this.distbits = 0,
    this.ncode = 0,
    this.nlen = 0,
    this.ndist = 0,
    this.have = 0,
    this.next = null,
    this.lens = new Uint16Array(320),
    this.work = new Uint16Array(288),
    this.lendyn = null,
    this.distdyn = null,
    this.sane = 0,
    this.back = 0,
    this.was = 0
}
const Se = t=>{
    if (!t || !t.state)
        return ve;
    const e = t.state;
    return t.total_in = t.total_out = e.total = 0,
    t.msg = "",
    e.wrap && (t.adler = 1 & e.wrap),
    e.mode = 1,
    e.last = 0,
    e.havedict = 0,
    e.dmax = 32768,
    e.head = null,
    e.hold = 0,
    e.bits = 0,
    e.lencode = e.lendyn = new Int32Array(852),
    e.distcode = e.distdyn = new Int32Array(592),
    e.sane = 1,
    e.back = -1,
    me
}
  , De = t=>{
    if (!t || !t.state)
        return ve;
    const e = t.state;
    return e.wsize = 0,
    e.whave = 0,
    e.wnext = 0,
    Se(t)
}
  , Oe = (t,e)=>{
    let a;
    if (!t || !t.state)
        return ve;
    const i = t.state;
    return e < 0 ? (a = 0,
    e = -e) : (a = 1 + (e >> 4),
    e < 48 && (e &= 15)),
    e && (e < 8 || e > 15) ? ve : (null !== i.window && i.wbits !== e && (i.window = null),
    i.wrap = a,
    i.wbits = e,
    De(t))
}
  , Te = (t,e)=>{
    if (!t)
        return ve;
    const a = new Ue;
    t.state = a,
    a.window = null;
    const i = Oe(t, e);
    return i !== me && (t.state = null),
    i
}
;
let Le, Ne, Fe = !0;
const Be = t=>{
    if (Fe) {
        Le = new Int32Array(512),
        Ne = new Int32Array(32);
        let e = 0;
        for (; e < 144; )
            t.lens[e++] = 8;
        for (; e < 256; )
            t.lens[e++] = 9;
        for (; e < 280; )
            t.lens[e++] = 7;
        for (; e < 288; )
            t.lens[e++] = 8;
        for (ue(1, t.lens, 0, 288, Le, 0, t.work, {
            bits: 9
        }),
        e = 0; e < 32; )
            t.lens[e++] = 5;
        ue(2, t.lens, 0, 32, Ne, 0, t.work, {
            bits: 5
        }),
        Fe = !1
    }
    t.lencode = Le,
    t.lenbits = 9,
    t.distcode = Ne,
    t.distbits = 5
}
  , Ie = (t,e,a,i)=>{
    let n;
    const r = t.state;
    return null === r.window && (r.wsize = 1 << r.wbits,
    r.wnext = 0,
    r.whave = 0,
    r.window = new Uint8Array(r.wsize)),
    i >= r.wsize ? (r.window.set(e.subarray(a - r.wsize, a), 0),
    r.wnext = 0,
    r.whave = r.wsize) : (n = r.wsize - r.wnext,
    n > i && (n = i),
    r.window.set(e.subarray(a - i, a - i + n), r.wnext),
    (i -= n) ? (r.window.set(e.subarray(a - i, a), 0),
    r.wnext = i,
    r.whave = r.wsize) : (r.wnext += n,
    r.wnext === r.wsize && (r.wnext = 0),
    r.whave < r.wsize && (r.whave += n))),
    0
}
;
var Ce = {
    inflateReset: De,
    inflateReset2: Oe,
    inflateResetKeep: Se,
    inflateInit: t=>Te(t, 15),
    inflateInit2: Te,
    inflate: (t,e)=>{
        let a, i, n, r, s, l, o, h, d, _, f, c, u, w, b, g, m, p, k, v, y, x, z = 0;
        const A = new Uint8Array(4);
        let E, R;
        const Z = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
        if (!t || !t.state || !t.output || !t.input && 0 !== t.avail_in)
            return ve;
        a = t.state,
        a.mode === Ee && (a.mode = 13),
        s = t.next_out,
        n = t.output,
        o = t.avail_out,
        r = t.next_in,
        i = t.input,
        l = t.avail_in,
        h = a.hold,
        d = a.bits,
        _ = l,
        f = o,
        x = me;
        t: for (; ; )
            switch (a.mode) {
            case 1:
                if (0 === a.wrap) {
                    a.mode = 13;
                    break
                }
                for (; d < 16; ) {
                    if (0 === l)
                        break t;
                    l--,
                    h += i[r++] << d,
                    d += 8
                }
                if (2 & a.wrap && 35615 === h) {
                    a.check = 0,
                    A[0] = 255 & h,
                    A[1] = h >>> 8 & 255,
                    a.check = j(a.check, A, 2, 0),
                    h = 0,
                    d = 0,
                    a.mode = 2;
                    break
                }
                if (a.flags = 0,
                a.head && (a.head.done = !1),
                !(1 & a.wrap) || (((255 & h) << 8) + (h >> 8)) % 31) {
                    t.msg = "incorrect header check",
                    a.mode = Re;
                    break
                }
                if ((15 & h) !== Ae) {
                    t.msg = "unknown compression method",
                    a.mode = Re;
                    break
                }
                if (h >>>= 4,
                d -= 4,
                y = 8 + (15 & h),
                0 === a.wbits)
                    a.wbits = y;
                else if (y > a.wbits) {
                    t.msg = "invalid window size",
                    a.mode = Re;
                    break
                }
                a.dmax = 1 << a.wbits,
                t.adler = a.check = 1,
                a.mode = 512 & h ? 10 : Ee,
                h = 0,
                d = 0;
                break;
            case 2:
                for (; d < 16; ) {
                    if (0 === l)
                        break t;
                    l--,
                    h += i[r++] << d,
                    d += 8
                }
                if (a.flags = h,
                (255 & a.flags) !== Ae) {
                    t.msg = "unknown compression method",
                    a.mode = Re;
                    break
                }
                if (57344 & a.flags) {
                    t.msg = "unknown header flags set",
                    a.mode = Re;
                    break
                }
                a.head && (a.head.text = h >> 8 & 1),
                512 & a.flags && (A[0] = 255 & h,
                A[1] = h >>> 8 & 255,
                a.check = j(a.check, A, 2, 0)),
                h = 0,
                d = 0,
                a.mode = 3;
            case 3:
                for (; d < 32; ) {
                    if (0 === l)
                        break t;
                    l--,
                    h += i[r++] << d,
                    d += 8
                }
                a.head && (a.head.time = h),
                512 & a.flags && (A[0] = 255 & h,
                A[1] = h >>> 8 & 255,
                A[2] = h >>> 16 & 255,
                A[3] = h >>> 24 & 255,
                a.check = j(a.check, A, 4, 0)),
                h = 0,
                d = 0,
                a.mode = 4;
            case 4:
                for (; d < 16; ) {
                    if (0 === l)
                        break t;
                    l--,
                    h += i[r++] << d,
                    d += 8
                }
                a.head && (a.head.xflags = 255 & h,
                a.head.os = h >> 8),
                512 & a.flags && (A[0] = 255 & h,
                A[1] = h >>> 8 & 255,
                a.check = j(a.check, A, 2, 0)),
                h = 0,
                d = 0,
                a.mode = 5;
            case 5:
                if (1024 & a.flags) {
                    for (; d < 16; ) {
                        if (0 === l)
                            break t;
                        l--,
                        h += i[r++] << d,
                        d += 8
                    }
                    a.length = h,
                    a.head && (a.head.extra_len = h),
                    512 & a.flags && (A[0] = 255 & h,
                    A[1] = h >>> 8 & 255,
                    a.check = j(a.check, A, 2, 0)),
                    h = 0,
                    d = 0
                } else
                    a.head && (a.head.extra = null);
                a.mode = 6;
            case 6:
                if (1024 & a.flags && (c = a.length,
                c > l && (c = l),
                c && (a.head && (y = a.head.extra_len - a.length,
                a.head.extra || (a.head.extra = new Uint8Array(a.head.extra_len)),
                a.head.extra.set(i.subarray(r, r + c), y)),
                512 & a.flags && (a.check = j(a.check, i, c, r)),
                l -= c,
                r += c,
                a.length -= c),
                a.length))
                    break t;
                a.length = 0,
                a.mode = 7;
            case 7:
                if (2048 & a.flags) {
                    if (0 === l)
                        break t;
                    c = 0;
                    do {
                        y = i[r + c++],
                        a.head && y && a.length < 65536 && (a.head.name += String.fromCharCode(y))
                    } while (y && c < l);
                    if (512 & a.flags && (a.check = j(a.check, i, c, r)),
                    l -= c,
                    r += c,
                    y)
                        break t
                } else
                    a.head && (a.head.name = null);
                a.length = 0,
                a.mode = 8;
            case 8:
                if (4096 & a.flags) {
                    if (0 === l)
                        break t;
                    c = 0;
                    do {
                        y = i[r + c++],
                        a.head && y && a.length < 65536 && (a.head.comment += String.fromCharCode(y))
                    } while (y && c < l);
                    if (512 & a.flags && (a.check = j(a.check, i, c, r)),
                    l -= c,
                    r += c,
                    y)
                        break t
                } else
                    a.head && (a.head.comment = null);
                a.mode = 9;
            case 9:
                if (512 & a.flags) {
                    for (; d < 16; ) {
                        if (0 === l)
                            break t;
                        l--,
                        h += i[r++] << d,
                        d += 8
                    }
                    if (h !== (65535 & a.check)) {
                        t.msg = "header crc mismatch",
                        a.mode = Re;
                        break
                    }
                    h = 0,
                    d = 0
                }
                a.head && (a.head.hcrc = a.flags >> 9 & 1,
                a.head.done = !0),
                t.adler = a.check = 0,
                a.mode = Ee;
                break;
            case 10:
                for (; d < 32; ) {
                    if (0 === l)
                        break t;
                    l--,
                    h += i[r++] << d,
                    d += 8
                }
                t.adler = a.check = Ze(h),
                h = 0,
                d = 0,
                a.mode = 11;
            case 11:
                if (0 === a.havedict)
                    return t.next_out = s,
                    t.avail_out = o,
                    t.next_in = r,
                    t.avail_in = l,
                    a.hold = h,
                    a.bits = d,
                    ke;
                t.adler = a.check = 1,
                a.mode = Ee;
            case Ee:
                if (e === be || e === ge)
                    break t;
            case 13:
                if (a.last) {
                    h >>>= 7 & d,
                    d -= 7 & d,
                    a.mode = 27;
                    break
                }
                for (; d < 3; ) {
                    if (0 === l)
                        break t;
                    l--,
                    h += i[r++] << d,
                    d += 8
                }
                switch (a.last = 1 & h,
                h >>>= 1,
                d -= 1,
                3 & h) {
                case 0:
                    a.mode = 14;
                    break;
                case 1:
                    if (Be(a),
                    a.mode = 20,
                    e === ge) {
                        h >>>= 2,
                        d -= 2;
                        break t
                    }
                    break;
                case 2:
                    a.mode = 17;
                    break;
                case 3:
                    t.msg = "invalid block type",
                    a.mode = Re
                }
                h >>>= 2,
                d -= 2;
                break;
            case 14:
                for (h >>>= 7 & d,
                d -= 7 & d; d < 32; ) {
                    if (0 === l)
                        break t;
                    l--,
                    h += i[r++] << d,
                    d += 8
                }
                if ((65535 & h) != (h >>> 16 ^ 65535)) {
                    t.msg = "invalid stored block lengths",
                    a.mode = Re;
                    break
                }
                if (a.length = 65535 & h,
                h = 0,
                d = 0,
                a.mode = 15,
                e === ge)
                    break t;
            case 15:
                a.mode = 16;
            case 16:
                if (c = a.length,
                c) {
                    if (c > l && (c = l),
                    c > o && (c = o),
                    0 === c)
                        break t;
                    n.set(i.subarray(r, r + c), s),
                    l -= c,
                    r += c,
                    o -= c,
                    s += c,
                    a.length -= c;
                    break
                }
                a.mode = Ee;
                break;
            case 17:
                for (; d < 14; ) {
                    if (0 === l)
                        break t;
                    l--,
                    h += i[r++] << d,
                    d += 8
                }
                if (a.nlen = 257 + (31 & h),
                h >>>= 5,
                d -= 5,
                a.ndist = 1 + (31 & h),
                h >>>= 5,
                d -= 5,
                a.ncode = 4 + (15 & h),
                h >>>= 4,
                d -= 4,
                a.nlen > 286 || a.ndist > 30) {
                    t.msg = "too many length or distance symbols",
                    a.mode = Re;
                    break
                }
                a.have = 0,
                a.mode = 18;
            case 18:
                for (; a.have < a.ncode; ) {
                    for (; d < 3; ) {
                        if (0 === l)
                            break t;
                        l--,
                        h += i[r++] << d,
                        d += 8
                    }
                    a.lens[Z[a.have++]] = 7 & h,
                    h >>>= 3,
                    d -= 3
                }
                for (; a.have < 19; )
                    a.lens[Z[a.have++]] = 0;
                if (a.lencode = a.lendyn,
                a.lenbits = 7,
                E = {
                    bits: a.lenbits
                },
                x = ue(0, a.lens, 0, 19, a.lencode, 0, a.work, E),
                a.lenbits = E.bits,
                x) {
                    t.msg = "invalid code lengths set",
                    a.mode = Re;
                    break
                }
                a.have = 0,
                a.mode = 19;
            case 19:
                for (; a.have < a.nlen + a.ndist; ) {
                    for (; z = a.lencode[h & (1 << a.lenbits) - 1],
                    b = z >>> 24,
                    g = z >>> 16 & 255,
                    m = 65535 & z,
                    !(b <= d); ) {
                        if (0 === l)
                            break t;
                        l--,
                        h += i[r++] << d,
                        d += 8
                    }
                    if (m < 16)
                        h >>>= b,
                        d -= b,
                        a.lens[a.have++] = m;
                    else {
                        if (16 === m) {
                            for (R = b + 2; d < R; ) {
                                if (0 === l)
                                    break t;
                                l--,
                                h += i[r++] << d,
                                d += 8
                            }
                            if (h >>>= b,
                            d -= b,
                            0 === a.have) {
                                t.msg = "invalid bit length repeat",
                                a.mode = Re;
                                break
                            }
                            y = a.lens[a.have - 1],
                            c = 3 + (3 & h),
                            h >>>= 2,
                            d -= 2
                        } else if (17 === m) {
                            for (R = b + 3; d < R; ) {
                                if (0 === l)
                                    break t;
                                l--,
                                h += i[r++] << d,
                                d += 8
                            }
                            h >>>= b,
                            d -= b,
                            y = 0,
                            c = 3 + (7 & h),
                            h >>>= 3,
                            d -= 3
                        } else {
                            for (R = b + 7; d < R; ) {
                                if (0 === l)
                                    break t;
                                l--,
                                h += i[r++] << d,
                                d += 8
                            }
                            h >>>= b,
                            d -= b,
                            y = 0,
                            c = 11 + (127 & h),
                            h >>>= 7,
                            d -= 7
                        }
                        if (a.have + c > a.nlen + a.ndist) {
                            t.msg = "invalid bit length repeat",
                            a.mode = Re;
                            break
                        }
                        for (; c--; )
                            a.lens[a.have++] = y
                    }
                }
                if (a.mode === Re)
                    break;
                if (0 === a.lens[256]) {
                    t.msg = "invalid code -- missing end-of-block",
                    a.mode = Re;
                    break
                }
                if (a.lenbits = 9,
                E = {
                    bits: a.lenbits
                },
                x = ue(1, a.lens, 0, a.nlen, a.lencode, 0, a.work, E),
                a.lenbits = E.bits,
                x) {
                    t.msg = "invalid literal/lengths set",
                    a.mode = Re;
                    break
                }
                if (a.distbits = 6,
                a.distcode = a.distdyn,
                E = {
                    bits: a.distbits
                },
                x = ue(2, a.lens, a.nlen, a.ndist, a.distcode, 0, a.work, E),
                a.distbits = E.bits,
                x) {
                    t.msg = "invalid distances set",
                    a.mode = Re;
                    break
                }
                if (a.mode = 20,
                e === ge)
                    break t;
            case 20:
                a.mode = 21;
            case 21:
                if (l >= 6 && o >= 258) {
                    t.next_out = s,
                    t.avail_out = o,
                    t.next_in = r,
                    t.avail_in = l,
                    a.hold = h,
                    a.bits = d,
                    oe(t, f),
                    s = t.next_out,
                    n = t.output,
                    o = t.avail_out,
                    r = t.next_in,
                    i = t.input,
                    l = t.avail_in,
                    h = a.hold,
                    d = a.bits,
                    a.mode === Ee && (a.back = -1);
                    break
                }
                for (a.back = 0; z = a.lencode[h & (1 << a.lenbits) - 1],
                b = z >>> 24,
                g = z >>> 16 & 255,
                m = 65535 & z,
                !(b <= d); ) {
                    if (0 === l)
                        break t;
                    l--,
                    h += i[r++] << d,
                    d += 8
                }
                if (g && 0 == (240 & g)) {
                    for (p = b,
                    k = g,
                    v = m; z = a.lencode[v + ((h & (1 << p + k) - 1) >> p)],
                    b = z >>> 24,
                    g = z >>> 16 & 255,
                    m = 65535 & z,
                    !(p + b <= d); ) {
                        if (0 === l)
                            break t;
                        l--,
                        h += i[r++] << d,
                        d += 8
                    }
                    h >>>= p,
                    d -= p,
                    a.back += p
                }
                if (h >>>= b,
                d -= b,
                a.back += b,
                a.length = m,
                0 === g) {
                    a.mode = 26;
                    break
                }
                if (32 & g) {
                    a.back = -1,
                    a.mode = Ee;
                    break
                }
                if (64 & g) {
                    t.msg = "invalid literal/length code",
                    a.mode = Re;
                    break
                }
                a.extra = 15 & g,
                a.mode = 22;
            case 22:
                if (a.extra) {
                    for (R = a.extra; d < R; ) {
                        if (0 === l)
                            break t;
                        l--,
                        h += i[r++] << d,
                        d += 8
                    }
                    a.length += h & (1 << a.extra) - 1,
                    h >>>= a.extra,
                    d -= a.extra,
                    a.back += a.extra
                }
                a.was = a.length,
                a.mode = 23;
            case 23:
                for (; z = a.distcode[h & (1 << a.distbits) - 1],
                b = z >>> 24,
                g = z >>> 16 & 255,
                m = 65535 & z,
                !(b <= d); ) {
                    if (0 === l)
                        break t;
                    l--,
                    h += i[r++] << d,
                    d += 8
                }
                if (0 == (240 & g)) {
                    for (p = b,
                    k = g,
                    v = m; z = a.distcode[v + ((h & (1 << p + k) - 1) >> p)],
                    b = z >>> 24,
                    g = z >>> 16 & 255,
                    m = 65535 & z,
                    !(p + b <= d); ) {
                        if (0 === l)
                            break t;
                        l--,
                        h += i[r++] << d,
                        d += 8
                    }
                    h >>>= p,
                    d -= p,
                    a.back += p
                }
                if (h >>>= b,
                d -= b,
                a.back += b,
                64 & g) {
                    t.msg = "invalid distance code",
                    a.mode = Re;
                    break
                }
                a.offset = m,
                a.extra = 15 & g,
                a.mode = 24;
            case 24:
                if (a.extra) {
                    for (R = a.extra; d < R; ) {
                        if (0 === l)
                            break t;
                        l--,
                        h += i[r++] << d,
                        d += 8
                    }
                    a.offset += h & (1 << a.extra) - 1,
                    h >>>= a.extra,
                    d -= a.extra,
                    a.back += a.extra
                }
                if (a.offset > a.dmax) {
                    t.msg = "invalid distance too far back",
                    a.mode = Re;
                    break
                }
                a.mode = 25;
            case 25:
                if (0 === o)
                    break t;
                if (c = f - o,
                a.offset > c) {
                    if (c = a.offset - c,
                    c > a.whave && a.sane) {
                        t.msg = "invalid distance too far back",
                        a.mode = Re;
                        break
                    }
                    c > a.wnext ? (c -= a.wnext,
                    u = a.wsize - c) : u = a.wnext - c,
                    c > a.length && (c = a.length),
                    w = a.window
                } else
                    w = n,
                    u = s - a.offset,
                    c = a.length;
                c > o && (c = o),
                o -= c,
                a.length -= c;
                do {
                    n[s++] = w[u++]
                } while (--c);
                0 === a.length && (a.mode = 21);
                break;
            case 26:
                if (0 === o)
                    break t;
                n[s++] = a.length,
                o--,
                a.mode = 21;
                break;
            case 27:
                if (a.wrap) {
                    for (; d < 32; ) {
                        if (0 === l)
                            break t;
                        l--,
                        h |= i[r++] << d,
                        d += 8
                    }
                    if (f -= o,
                    t.total_out += f,
                    a.total += f,
                    f && (t.adler = a.check = a.flags ? j(a.check, n, f, s - f) : M(a.check, n, f, s - f)),
                    f = o,
                    (a.flags ? h : Ze(h)) !== a.check) {
                        t.msg = "incorrect data check",
                        a.mode = Re;
                        break
                    }
                    h = 0,
                    d = 0
                }
                a.mode = 28;
            case 28:
                if (a.wrap && a.flags) {
                    for (; d < 32; ) {
                        if (0 === l)
                            break t;
                        l--,
                        h += i[r++] << d,
                        d += 8
                    }
                    if (h !== (4294967295 & a.total)) {
                        t.msg = "incorrect length check",
                        a.mode = Re;
                        break
                    }
                    h = 0,
                    d = 0
                }
                a.mode = 29;
            case 29:
                x = pe;
                break t;
            case Re:
                x = ye;
                break t;
            case 31:
                return xe;
            default:
                return ve
            }
        return t.next_out = s,
        t.avail_out = o,
        t.next_in = r,
        t.avail_in = l,
        a.hold = h,
        a.bits = d,
        (a.wsize || f !== t.avail_out && a.mode < Re && (a.mode < 27 || e !== we)) && Ie(t, t.output, t.next_out, f - t.avail_out),
        _ -= t.avail_in,
        f -= t.avail_out,
        t.total_in += _,
        t.total_out += f,
        a.total += f,
        a.wrap && f && (t.adler = a.check = a.flags ? j(a.check, n, f, t.next_out - f) : M(a.check, n, f, t.next_out - f)),
        t.data_type = a.bits + (a.last ? 64 : 0) + (a.mode === Ee ? 128 : 0) + (20 === a.mode || 15 === a.mode ? 256 : 0),
        (0 === _ && 0 === f || e === we) && x === me && (x = ze),
        x
    }
    ,
    inflateEnd: t=>{
        if (!t || !t.state)
            return ve;
        let e = t.state;
        return e.window && (e.window = null),
        t.state = null,
        me
    }
    ,
    inflateGetHeader: (t,e)=>{
        if (!t || !t.state)
            return ve;
        const a = t.state;
        return 0 == (2 & a.wrap) ? ve : (a.head = e,
        e.done = !1,
        me)
    }
    ,
    inflateSetDictionary: (t,e)=>{
        const a = e.length;
        let i, n, r;
        return t && t.state ? (i = t.state,
        0 !== i.wrap && 11 !== i.mode ? ve : 11 === i.mode && (n = 1,
        n = M(n, e, a, 0),
        n !== i.check) ? ye : (r = Ie(t, e, a, a),
        r ? (i.mode = 31,
        xe) : (i.havedict = 1,
        me))) : ve
    }
    ,
    inflateInfo: "pako inflate (from Nodeca project)"
};
var He = function() {
    this.text = 0,
    this.time = 0,
    this.xflags = 0,
    this.os = 0,
    this.extra = null,
    this.extra_len = 0,
    this.name = "",
    this.comment = "",
    this.hcrc = 0,
    this.done = !1
};
const Me = Object.prototype.toString
  , {Z_NO_FLUSH: Ke, Z_FINISH: je, Z_OK: Pe, Z_STREAM_END: Ye, Z_NEED_DICT: Ge, Z_STREAM_ERROR: Xe, Z_DATA_ERROR: We, Z_MEM_ERROR: qe} = Y;
function Je(t) {
    this.options = Mt({
        chunkSize: 65536,
        windowBits: 15,
        to: ""
    }, t || {});
    const e = this.options;
    e.raw && e.windowBits >= 0 && e.windowBits < 16 && (e.windowBits = -e.windowBits,
    0 === e.windowBits && (e.windowBits = -15)),
    !(e.windowBits >= 0 && e.windowBits < 16) || t && t.windowBits || (e.windowBits += 32),
    e.windowBits > 15 && e.windowBits < 48 && 0 == (15 & e.windowBits) && (e.windowBits |= 15),
    this.err = 0,
    this.msg = "",
    this.ended = !1,
    this.chunks = [],
    this.strm = new Wt,
    this.strm.avail_out = 0;
    let a = Ce.inflateInit2(this.strm, e.windowBits);
    if (a !== Pe)
        throw new Error(P[a]);
    if (this.header = new He,
    Ce.inflateGetHeader(this.strm, this.header),
    e.dictionary && ("string" == typeof e.dictionary ? e.dictionary = Yt(e.dictionary) : "[object ArrayBuffer]" === Me.call(e.dictionary) && (e.dictionary = new Uint8Array(e.dictionary)),
    e.raw && (a = Ce.inflateSetDictionary(this.strm, e.dictionary),
    a !== Pe)))
        throw new Error(P[a])
}
function Qe(t, e) {
    const a = new Je(e);
    if (a.push(t),
    a.err)
        throw a.msg || P[a.err];
    return a.result
}
Je.prototype.push = function(t, e) {
    const a = this.strm
      , i = this.options.chunkSize
      , n = this.options.dictionary;
    let r, s, l;
    if (this.ended)
        return !1;
    for (s = e === ~~e ? e : !0 === e ? je : Ke,
    "[object ArrayBuffer]" === Me.call(t) ? a.input = new Uint8Array(t) : a.input = t,
    a.next_in = 0,
    a.avail_in = a.input.length; ; ) {
        for (0 === a.avail_out && (a.output = new Uint8Array(i),
        a.next_out = 0,
        a.avail_out = i),
        r = Ce.inflate(a, s),
        r === Ge && n && (r = Ce.inflateSetDictionary(a, n),
        r === Pe ? r = Ce.inflate(a, s) : r === We && (r = Ge)); a.avail_in > 0 && r === Ye && a.state.wrap > 0 && 0 !== t[a.next_in]; )
            Ce.inflateReset(a),
            r = Ce.inflate(a, s);
        switch (r) {
        case Xe:
        case We:
        case Ge:
        case qe:
            return this.onEnd(r),
            this.ended = !0,
            !1
        }
        if (l = a.avail_out,
        a.next_out && (0 === a.avail_out || r === Ye))
            if ("string" === this.options.to) {
                let t = Xt(a.output, a.next_out)
                  , e = a.next_out - t
                  , n = Gt(a.output, t);
                a.next_out = e,
                a.avail_out = i - e,
                e && a.output.set(a.output.subarray(t, t + e), 0),
                this.onData(n)
            } else
                this.onData(a.output.length === a.next_out ? a.output : a.output.subarray(0, a.next_out));
        if (r !== Pe || 0 !== l) {
            if (r === Ye)
                return r = Ce.inflateEnd(this.strm),
                this.onEnd(r),
                this.ended = !0,
                !0;
            if (0 === a.avail_in)
                break
        }
    }
    return !0
}
,
Je.prototype.onData = function(t) {
    this.chunks.push(t)
}
,
Je.prototype.onEnd = function(t) {
    t === Pe && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = Kt(this.chunks)),
    this.chunks = [],
    this.err = t,
    this.msg = this.strm.msg
}
;
var Ve = {
    Inflate: Je,
    inflate: Qe,
    inflateRaw: function(t, e) {
        return (e = e || {}).raw = !0,
        Qe(t, e)
    },
    ungzip: Qe,
    constants: Y
};
```

里面写了几种算法，扣下来可以学习，备着以后用。看大站，可以学习很多。

因为使用python，我这里做了点处理，先把byte转base64然后再处理

![](https://s2.loli.net/2023/05/18/WuBb5fDMmAxUY24.png#id=xaJnA&originHeight=774&originWidth=1711&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

所以js这样处理

![](https://s2.loli.net/2023/05/18/ezXnAtIHjYLFa9p.png#id=W7ePM&originHeight=256&originWidth=686&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

python：

![](https://s2.loli.net/2023/05/18/8siUArKvwfOq7xo.png#id=AfvJG&originHeight=728&originWidth=1806&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

现在数据都处理好了，就剩r.Response这个proto文件了，就能解析了。

![](https://s2.loli.net/2023/05/18/oYPxilv1fJ69DyM.png#id=SHefD&originHeight=553&originWidth=901&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

跟进去，发现是一个地方。我们刚刚不是处理过吗，找一下文件里面的，拿出来：

```
message webcast_im_Response{
repeated webcast_im_Message messages=1;
 string cursor=2;
 int64 fetchinterval=3;
 int64 now=4;
 string internalext=5;
 int32 fetchtype=6;
 int64 heartbeatduration=8;
 bool needack=9;
 string pushserver=10;
 string livecursor=11;
 bool historynomore=12;
}
message webcast_im_Message{
 string method=1;
 bytes payload=2;
 int64 msgid=3;
 int32 msgtype=4;
 int64 offset=5;
 bool needwrdsstore=6;
 int64 wrdsversion=7;
 string wrdssubkey=8;
}
```

编译一下，看效果：

网站上：

![](https://s2.loli.net/2023/05/18/7cUuRtz4NdBaoQJ.png#id=WkhWb&originHeight=718&originWidth=1077&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

python：

![](https://s2.loli.net/2023/05/18/ySr4mq7MGQox3zC.png#id=aVfNf&originHeight=743&originWidth=1794&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

一致，本来第一项列表是有数据，可以看到里面消息类型的，刚刚不小心跳过断点了，然后直播结束了，没消息了....尴尬。但是暂时不影响分析，我们把ack也完成就换个直播间。

#### ③ack处理：

因为这里needack是true，所以需要发一个包：

![](https://s2.loli.net/2023/05/18/8iexz5jtBT3R9Sv.png#id=uXQ5t&originHeight=760&originWidth=1631&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

可以看到，我们构造没问题。

代码：

```
#ack处理
internalext=webcast_im_Response.internalext
payload_base64=ctx.call('get_ackpayload',internalext)
payload_byte=base64.b64decode(payload_base64)
ack_pushproto_PushFrame=new_pb2.pushproto_PushFrame()
ack_pushproto_PushFrame.payloadtype='ack'
ack_pushproto_PushFrame.payload=payload_byte
ack_pushproto_PushFrame.logid=pushproto_PushFrame.logid
ack_payload=ack_pushproto_PushFrame.SerializeToString()
print(base64.b64encode(ack_payload).decode())
```

我们到现在还是没看到弹幕数据，因为他在下面emit函数处处理了，我们先别急，我换一个直播间再继续分析。

#### ④最后数据处理emit函数：

![](https://s2.loli.net/2023/05/18/AeKc2rmR3aYFnwX.png#id=mFXE5&originHeight=708&originWidth=1078&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

![](https://s2.loli.net/2023/05/18/ozgf8LsthJY6C2d.png#id=j4pNU&originHeight=780&originWidth=1172&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

猜测应该是payload里面是弹幕信息，我们进到emit函数里面看看吧。

```
            emit(e) {
                const t = e.getMessagesList(); //得到刚刚的message列表
                //forEach() 方法对数组的每个元素执行一次给定的函数。
                //这里相当于遍历每一个message，然后做处理。
                t.length && t.forEach((e=>{
                    const t = e.getMethod()
                      , a = "RoomMessage" === t ? t : e.getMsgId();
                    this.messageIdsForDistinct.has(a) || (this.messageIdsForDistinct.add(a),
                    //
                    this.runAllEvents(t, e))
                }
                ))
            }
```

我们下个断点，断下时，看看值，这里应该是message列表第一个：

![](https://s2.loli.net/2023/05/18/cPsIoBaNDeK1jkW.png#id=JcReH&originHeight=166&originWidth=1134&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

我们可以看到，没错，是第一个WebcastMemberMessage，然后把这message列表第一个对象扔进了这个runAllEvents函数处理：

![](https://s2.loli.net/2023/05/18/ADh48erkHtVJ7jS.png#id=B8maS&originHeight=421&originWidth=779&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

进入runAllEvents函数，我们又看到了熟悉的关键词：

![](https://s2.loli.net/2023/05/18/B7S2DGsLvrXtkWV.png#id=SZunq&originHeight=411&originWidth=1050&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

大概猜测这里就能得到我们想要的数据了，下断点，运行到这看s值。

![](https://s2.loli.net/2023/05/18/FwSnzXIyGudtamY.png#id=J2FUo&originHeight=699&originWidth=1036&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

果然显示了用户名还有一些信息。

代码分析:

```
            runAllEvents(e, t) {
                var a;
                //this.eventsMap.entries()里面包含所有事件模块
                for (const [o,i] of this.eventsMap.entries()) {
                    const a = this.messageModules[o]; //创建模块
                    //if判断传进来的名字是否匹配模块
                    if (i && a && this.isCorrectEventName(o, e)) {
                        //匹配就执行相应代码
                        const r = t.getPayload_asU8()
                          , s = a.deserializeBinary(r); //可以在这里下断点找到a对象对应的反序列化对象，模块
                        return this.info(`emit Message Type: ${e} ${o}`),
                        this.info("emit Message Payload:", (()=>s.toObject())),
                        void i.forEach((e=>{
                            e(s, t, r)
                        }
                        ))
                    }
                }
                const r = null !== (a = this.messageNotUseCache.get(e)) && void 0 !== a ? a : [];
                r.length > o.ej && r.shift(),
                r.push(t),
                this.messageNotUseCache.set(e, r)
            }
```

至此，基本上分析完了全部逻辑，一共解析了3次payload，他是遍历第二次得到的payload数据中的message列表，根据不同message类型，找到不同类型对应的proto文件对象，然后再解析。

## 五、用工具，得到基本proto文件，遇到proto文件报错解决方法

跟前面得到的proto文件类似，进入到解析对象的js里面，然后复制js到工具处理。

因为很多，而且webpack打包很分散，我讲一下我的处理方法吧：

![](https://s2.loli.net/2023/05/18/6xdsTnuWLRI4cNr.png#id=Di8mK&originHeight=733&originWidth=1173&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

相似报错可以直接同一值替换（可能不太严谨，但是跟了很多都是同一个），我们可以把这个直接全部复制到一个大proto文件中，比如说我们最开始那个，折叠起来，然后慢慢把报错解决。

我演示Common的处理，其他类似就好：

![](https://s2.loli.net/2023/05/18/6wrDymh9vBp1dkC.png#id=DHAu6&originHeight=542&originWidth=945&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

跟进去，直接定位Common，因为p对象，所以代码无法体现是谁，所以处理会报错。

跟进去后直接复制js到工具（记得创建自己要处理的文件js），直接处理。

![](https://s2.loli.net/2023/05/18/kFX1ENtYZ592lTO.png#id=SfdZW&originHeight=551&originWidth=745&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

将补充的补充到下面，标注一下，说不定其他模块也要用，反正我们都复制下来。

我这里采用nodepad++全体Common替换成 webcast\_im\_Common

![](https://s2.loli.net/2023/05/18/PG3gzunhIRMBDvj.png#id=pzADB&originHeight=887&originWidth=1859&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

这里就解决了

![](https://s2.loli.net/2023/05/18/9RUVd1fI6qyO4sT.png#id=YCobk&originHeight=896&originWidth=1843&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

然后后面的也接着一样操作来，直到补全完整的proto文件，基本上就出来了，很多要有耐心，可能一开始错会很多，但是补到后面，你补其他message类型的时候就很轻松了。

把大的Image，User，common，Text补完，基本上就剩一点点了。

Text  =====> webcast\_data\_Text

Image =====> webcast\_data\_Image

User   =====> webcast\_data\_User

Common =====> webcast\_im\_Common

Room =====> webcast\_data\_Room

![](https://s2.loli.net/2023/05/18/JPw4QFd7mv5L2Vb.png#id=w1YeF&originHeight=860&originWidth=1020&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

补到后面会发现3个map类型的数据，因为工具没处理（大佬可以帮忙添加一下处理map类型的方法），我们注释掉里面的内容就好

![](https://s2.loli.net/2023/05/18/rtuZPvRsheXDy7V.png#id=T5slf&originHeight=91&originWidth=619&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

20分钟左右补完了，经历了3个webpack，都是上w行代码的js。

![](https://s2.loli.net/2023/05/18/Br1ASPIqj3U4DVL.png#id=QSi7e&originHeight=771&originWidth=1239&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

很清楚的就得到刚刚那个WebcastMemberMessage类型数据的结构了，其他message类型（应该有6种）也是一样步骤，慢慢补充，就可以得到完整的proto文件，就能使用了。

![](https://s2.loli.net/2023/05/18/ULQrXdaZwvxGiNP.png#id=Zr6Gk&originHeight=328&originWidth=722&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

最后这个不常见，刚刚好关播给我抓到了。

## 六、python连接websocket一些注意点

上面我们已经分析了数据处理方面的东西，现在我们来用python连接websocket地址，然后实现open，onmessage事件等功能，然后获取我们想要的数据，我这里讲一些注意点吧。

#### ①连接需要cookie

在fd搜索：

![](https://s2.loli.net/2023/05/18/oRCJvMzy2feHZVI.png#id=Avr7W&originHeight=426&originWidth=482&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

发现原始请求头我们要什么数据：

![](https://s2.loli.net/2023/05/18/h4OnDgJpUHGqLK3.png#id=fDorf&originHeight=287&originWidth=635&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

需要一个cookie，搜索ttwid就能看到cookie是怎么生成的，发现是刚开网页服务器发过来的。

#### ②网址signature分析

![](https://s2.loli.net/2023/05/18/s9znMcRpmvDAFTW.png#id=hEkRV&originHeight=317&originWidth=965&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

从最开始，我们知道，网址是这里的t，然后进入u方法。

![](https://s2.loli.net/2023/05/18/mtMsAa9cC7DJZLl.png#id=QLWmt&originHeight=669&originWidth=970&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

这里就是我们要的signature，可以看出是从p来的。

```
const s = {
    "X-MS-STUB": g()(n.substring(1))
         };
let p = {};
return
//这一串是问号表达式（三元表达式），":"前面是false就走":"后面的，否则走前面的
window.byted_acrawler && (p = null ===
(o = null === window || void 0 === window ?
void 0 : window.byted_acrawler
)
|| void 0 === o
? void 0 : o.frontierSign(s)),
//会进这个o.frontierSign(s)方法里面，大家可以自己调试
   {
     signature: null !== (a = p["X-Bogus"]) && void 0 !== a ? a : ""
   }
```

里面全扣下来，然后补环境可以解决，有轻微混淆吧。

![](https://s2.loli.net/2023/05/18/HF4xCzahejBpXWG.png#id=DuP0q&originHeight=330&originWidth=1655&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

![](https://s2.loli.net/2023/05/18/focDU5sKlNEFhZq.png#id=jtoOl&originHeight=760&originWidth=1642&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

只是可能js代码和node版本问题，警告了，不过没什么事。

其实这个参数目前还不会校验，删掉不携带也可以获得响应，不排除以后校验的可能。

## 七、效果展示

![](https://s2.loli.net/2023/05/18/fRBwbHm4y62WA3v.png#id=MFBGI&originHeight=518&originWidth=1112&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

因为有些数据可能敏感，就放这张效果图了。

## 八、代码及总结

代码地址：<https://github.com/Prince-cool/dy_protobuf>

希望大家能给个star支持一下，哈哈哈哈哈，写的真的好辛苦啊！！！！

总结：这几天过节，也到处去玩，所以都是抽空慢慢补齐内容的，可能会有点跳跃，请见谅，因为如果要讲太细，可能篇幅太长了，文字也说不清楚，一共60多张图片。如果有机会，想要我录视频的，可以留言，我找机会录制一下，或者开个腾讯会议一起交流。希望这篇文章对你有益，感谢，也祝大家新年快乐，心想事成！
