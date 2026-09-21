# 【JS逆向系列】某方数据获取，proto入门

> **作者**: 漁滒 | **发布时间**: 2022-03-27 17:24:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 15939 / 99
> **原文**: [https://www.52pojie.cn/thread-1611798-1-1.html](https://www.52pojie.cn/thread-1611798-1-1.html)

---

@[TOC](https://www.52pojie.cn/%E3%80%90JS%E9%80%86%E5%90%91%E7%B3%BB%E5%88%97%E3%80%91%E6%9F%90%E6%96%B9%E6%95%B0%E6%8D%AE%E8%8E%B7%E5%8F%96%EF%BC%8Cproto%E5%85%A5%E9%97%A8)

样品网址：aHR0cHM6Ly93d3cud2FuZmFuZ2RhdGEuY29tLmNuL2luZGV4Lmh0bWw=

打开网站后，随便搜索一个关键词，这里以【百度】为例，本次需要分析的是【SearchService.SearchService/search】这个接口

![](https://attach.52pojie.cn/forum/202410/11/171252lg5b59ra3v3ibgz7.png)

这里可以看到，请求体不再是表单或者json，而是一堆类似乱码的东西，再看看响应体

![](https://attach.52pojie.cn/forum/202410/11/171254lbkn9827q6i1b9ze.png)

也是一堆乱码，有的人可能就会想，会不会是有加密呢？当然不排除这个可能。接着再看看请求头，其中有一行是【content-type: application/grpc-web+proto】，这里指明了请求体的类型是proto。

所以这里的乱码并不是有加密，只是用proto这种格式序列化而已。那么接下来的流程就是编写proto文件，然后用protoc编译为对应语言可以调用的类文件。

首先下载protoc，到https://github.com/protocolbuffers/protobuf/下载最新的发行版工具，我这里下载的是win'64版本

![](https://attach.52pojie.cn/forum/202410/11/171256cq92tkxqv42to9ok.png)

下载解压后，将里面的bin目录添加到环境变量，然后在cmd窗口输入【protoc --version】，出现版本好即为成功

![](https://attach.52pojie.cn/forum/202410/11/171258lyryb3k36jkgbi5p.png)

因为我们分析的是【SearchService.SearchService/search】这个接口，所以先下一个XHR断点，刷新网页，在断点处断下，返回调用堆栈的上一层

![](https://attach.52pojie.cn/forum/202410/11/171300dqpxdzs022lpdp2q.png)

![](https://attach.52pojie.cn/forum/202410/11/171302azpznrzul0jdjwsn.png)

看到一个类似组包的函数，那么在前面加一个断点，再次刷新

![](https://attach.52pojie.cn/forum/202410/11/171304v83l34nopquluol8.png)

接着进入【r.a】

![](https://attach.52pojie.cn/forum/202410/11/171306q7bkzte0ruyueuol.png)

发现这是一个webpack打包的js，并且所有的信息序列化与反序列化的操作都在这个js里面，一般情况下，都是用的标准库的工具，所以首先直接搜索【.deserializeBinaryFromReader = 】，为什么搜索这个呢？这就好比json的数据会搜索【JSON.】是一样的。

![](https://attach.52pojie.cn/forum/202410/11/171308f8e4hsgeq46bzno3.png)

这里就获取到每个信息是如何解析的，也就是可以获取信息的结构

如果一个一个来写的话，那就有点麻烦了，而且还怕会出错，那么为了保证准确性，所以这次使用ast来生成proto文件，首先吧这个【app.1d44779a.js】下载到本地，并且执行下面代码

```
const parser = require("@babel/parser");
// 为parser提供模板引擎
const template = require("@babel/template").default;
// 遍历AST
const traverse = require("@babel/traverse").default;
// 操作节点，比如判断节点类型，生成新的节点等
const t = require("@babel/types");
// 将语法树转换为源代码
const generator = require("@babel/generator");
// 操作文件
const fs = require("fs");

//定义公共函数
function wtofile(path, flags, code) {
    var fd = fs.openSync(path,flags);
    fs.writeSync(fd, code);
    fs.closeSync(fd);
}

function dtofile(path) {
    fs.unlinkSync(path);
}

var file_path = 'app.1d44779a.js';
var jscode = fs.readFileSync(file_path, {
    encoding: "utf-8"
});

// 转换为AST语法树
let ast = parser.parse(jscode);
let proto_text = `syntax = "proto2";\n\n// protoc --python_out=. app_proto2.proto\n\n`;

traverse(ast, {
    MemberExpression(path){
        if(path.node.property.type === 'Identifier' && path.node.property.name === 'deserializeBinaryFromReader' && path.parentPath.type === 'AssignmentExpression'){
            let id_name = path.toString().split('.').slice(1, -1).join('_');
            path.parentPath.traverse({
                VariableDeclaration(path_2){
                    if(path_2.node.declarations.length === 1){
                        path_2.replaceWith(t.expressionStatement(
                            t.assignmentExpression(
                                "=",
                                path_2.node.declarations[0].id,
                                path_2.node.declarations[0].init
                            )
                        ))
                    }
                },
                SwitchStatement(path_2){
                    for (let i = 0; i < path_2.node.cases.length - 1; i++) {
                        let item = path_2.node.cases[i];
                        let item2 = path_2.node.cases[i + 1];
                        if(item.consequent.length === 0 && item2.consequent[1].expression.type === 'SequenceExpression'){
                            item.consequent = [
                                item2.consequent[0],
                                t.expressionStatement(
                                    item2.consequent[1].expression.expressions[0]
                                ),
                                item2.consequent[2]
                            ];
                            item2.consequent[1] = t.expressionStatement(
                                item2.consequent[1].expression.expressions[1]
                            )
                        }else if(item.consequent.length === 0){
                            item.consequent = item2.consequent
                        }else if(item.consequent[1].expression.type === 'SequenceExpression'){
                            item.consequent[1] = t.expressionStatement(
                                item.consequent[1].expression.expressions[1]
                            )
                        }
                    }
                }
            });
            let id_text = 'message ' + id_name + ' {\n';
            let let_id_list = [];
            for (let i = 0; i < path.parentPath.node.right.body.body[0].body.body[2].cases.length; i++) {
                let item = path.parentPath.node.right.body.body[0].body.body[2].cases[i];
                if(item.test){
                    let id_number = item.test.value;
                    let key = item.consequent[1].expression.callee.property.name;
                    let id_st, id_type;
                    if(key.startsWith("set")){
                        id_st = "optional";
                    }else if(key.startsWith("add")){
                        id_st = "repeated";
                    }else{
                        // map类型，因为案例中用不到，所以这里省略
                        continue
                    }
                    key = key.substring(3, key.length);
                    id_type = item.consequent[0];
                    if(id_type.expression.right.type === 'NewExpression'){
                        id_type = generator.default(id_type.expression.right.callee).code.split('.').slice(1).join('_');
                    }else{
                        switch (id_type.expression.right.callee.property.name) {
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
                                id_st = "repeated";
                                id_type = "int32";
                                break;
                            case "readBytes":
                                id_type = "bytes";
                                break;
                            case "readEnum":
                                id_type = "readEnum";
                                break;
                            case "readPackedEnum":
                                id_st = "repeated";
                                id_type = "readEnum";
                                break;
                        }
                    }
                    if(id_type === 'readEnum'){
                        id_type = id_name + '_' + key + 'Enum';
                        if(let_id_list.indexOf(id_number) === -1){
                            id_text += '\tenum ' + id_type + ' {\n';
                            for (let j = 0; j < 3; j++) {
                                id_text += '\t\t' + id_type + 'TYPE_' + j + ' = ' + j + ';\n';
                            }
                            id_text += '\t}\n\n';
                            id_text += '\t' + id_st + ' ' + id_type + ' ' + key + ' = ' + id_number + ';\n';
                            let_id_list.push(id_number)
                        }
                    }else{
                        if(let_id_list.indexOf(id_number) === -1){
                            id_text += '\t' + id_st + ' ' + id_type + ' ' + key + ' = ' + id_number + ';\n';
                            let_id_list.push(id_number)
                        }
                    }
                }
            }
            id_text += '}\n\n';
            proto_text += id_text
        }
    }
});

wtofile('app_proto2.proto', 'w', proto_text);
```

运行后可以得到一个【app\_proto2.proto】的文件，开后发现有少量报错

![](https://attach.52pojie.cn/forum/202410/11/171310uyjzxi6mwpbvjgb7.png)

在网页中搜索这个信息结构

![](https://attach.52pojie.cn/forum/202410/11/171312onzja9npf3a9h3zh.png)

这里的o省略了路径名，所以无法获取到完整路径就报错了，手动补充一下即可，往上查找o的来源

![](https://attach.52pojie.cn/forum/202410/11/171314a9ov1v0o956v47j6.png)

o是来自于【e348】，那么搜索这个

![](https://attach.52pojie.cn/forum/202410/11/171316pev40lp4f8r4fef0.png)

一直拉到最下面看看导出的名称是什么

![](https://attach.52pojie.cn/forum/202410/11/171319zmxzx19jmjy7jj7t.png)

接着补全一下路径

![](https://attach.52pojie.cn/forum/202410/11/171321yansnj7ajufsus9i.png)

其他的报错都可以如此类推解决，然后在当前目录打开cmd，输入指令编译出python可调用的类

```
protoc --python_out=. app_proto2.proto
```

此时就可以在当前目录的一个【app\_proto2\_pb2.py】文件

尝试使用这个生成的了进行数据序列化，使用proto文件前，需要先安装依赖库

```
pip install protobuf
```

![](https://attach.52pojie.cn/forum/202410/11/171323k93sd717dab9jbj1.png)

但是并不是直接序列化后就可以请求，这里可以看到对请求体还有一层包装，序列化的内容被设置到偏移5的位置，而偏移1的位置设置了【l】参数，这里的【l】参数就是后面数据的长度

那么尝试按照这个格式去生成一个请求体去试试能不能获取数据

```
import app_proto2_pb2
import requests_html
import struct

def main():
    requests = requests_html.HTMLSession()
    search_request = app_proto2_pb2.SearchService_SearchRequest()
    search_request.InterfaceType = app_proto2_pb2.SearchService_SearchRequest.SearchService_SearchRequest_InterfaceTypeEnum.Value('SearchService_SearchRequest_InterfaceTypeEnumTYPE_0')
    search_request.Commonrequest.SearchType = 'paper'
    search_request.Commonrequest.SearchWord = '百度'
    search_request.Commonrequest.CurrentPage = 1
    search_request.Commonrequest.PageSize = 20
    search_request.Commonrequest.SearchFilterList.append(app_proto2_pb2.SearchService_CommonRequest.SearchService_CommonRequest_SearchFilterListEnum.Value('SearchService_CommonRequest_SearchFilterListEnumTYPE_0'))
    data = search_request.SerializeToString()
    data = bytes([0]) + struct.pack(">i", len(data)) + data
    print(data)

    url = 'https://s.wanfangdata.com.cn/SearchService.SearchService/search'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4901.0 Safari/537.36',
        'Content-Type': 'application/grpc-web+proto',
    }

    response = requests.post(url, headers=headers, data=data)
    print(response.content)
    print(len(response.content))
```

![](https://attach.52pojie.cn/forum/202410/11/171325qcanjbknqhhq8z4p.png)

看起来返回的数据是正确了，那么接着尝试去反序列化数据

![](https://attach.52pojie.cn/forum/202410/11/171327h8moyn8ep4niyitv.png)

没有报错，非常好，说明编写的proto文件没有问题，本文结束，下面是完整代码

```
import app_proto2_pb2
import requests_html
import struct

def main():
    requests = requests_html.HTMLSession()
    search_request = app_proto2_pb2.SearchService_SearchRequest()
    search_request.InterfaceType = app_proto2_pb2.SearchService_SearchRequest.SearchService_SearchRequest_InterfaceTypeEnum.Value('SearchService_SearchRequest_InterfaceTypeEnumTYPE_0')
    search_request.Commonrequest.SearchType = 'paper'
    search_request.Commonrequest.SearchWord = '百度'
    search_request.Commonrequest.CurrentPage = 1
    search_request.Commonrequest.PageSize = 20
    search_request.Commonrequest.SearchFilterList.append(app_proto2_pb2.SearchService_CommonRequest.SearchService_CommonRequest_SearchFilterListEnum.Value('SearchService_CommonRequest_SearchFilterListEnumTYPE_0'))
    data = search_request.SerializeToString()
    data = bytes([0]) + struct.pack(">i", len(data)) + data
    print(data)

    url = 'https://s.wanfangdata.com.cn/SearchService.SearchService/search'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4901.0 Safari/537.36',
        'Content-Type': 'application/grpc-web+proto',
    }

    response = requests.post(url, headers=headers, data=data)
    data_len = struct.unpack(">i", response.content[1:5])[0]

    search_response = app_proto2_pb2.SearchService_SearchResponse()
    search_response.ParseFromString(response.content[5: 5 + data_len])
    print(search_response)

if __name__ == '__main__':
    main()
```

附加内容：对于较少的信息结构是，直接手动写也很快。但是多的时候，手动写重复的工作多，还很容易出错，ast的作用就体现出来了。对于web端可以proto文件自动还原可以使用ast，而在app的话，那该如何解决呢？可以参考下面文章使用frida解决

<https://github.com/SeeFlowerX/frida-protobuf>
