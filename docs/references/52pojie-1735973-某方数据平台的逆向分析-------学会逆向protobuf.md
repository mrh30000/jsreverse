# 某方数据平台的逆向分析-学会逆向protobuf

> **作者**: prince_cool | **发布时间**: 2023-01-13 13:12:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 18284 / 72
> **原文**: [https://www.52pojie.cn/thread-1735973-1-1.html](https://www.52pojie.cn/thread-1735973-1-1.html)

---

某方数据平台的逆向分析-------学会protobuf

## 声明

**本文章中所有内容仅供学习交流，相关链接做了脱敏处理，若有侵权，请联系我立即删除！**

## 一、前期准备：

### 1.1 了解protobuf协议：

Protobuf（Protocol Buffer）是 Google 开发的一套数据存储传输协议，为二进制序列化格式，可用作 JSON 或 XML 等格式的更有效替代方案。开发人员可以在 .proto 文件中定义消息格式，并使用 protobuf 编译器（protoc）按他们选择的语言生成消息处理程序。Protobuf 编码是二进制的，与 json、xml 不同，它不是可读的，也不容易手动修改。Protobuf 能够把数据压缩得很小，所以传输数据就比 xml 和 json 快几倍，使用其有利于提高效率，但同时增加了分析或修改数据的难度。

序列化 (Serialization) 是指将对象转换为字节序列的过程，在序列化期间，对象将其当前状态写入到临时或持久性存储区，以后，可以通过从存储区中读取或反序列化对象的状态，重新创建该对象。

protobuf知识补充见：<https://www.52pojie.cn/thread-1735975-1-1.html>

### 1.2 Protobuf 环境配置：

下载protoc文件：[找对应版本下载](https://github.com/protocolbuffers/protobuf/releases/tag/v21.12)

![](https://attach.52pojie.cn/forum/202305/18/173824m9vv4uv1cgxlgubg.png)

然后添加到环境变量，便于之后使用。

## 二、目标网站：

aHR0cHM6Ly9zLndhbmZhbmdkYXRhLmNvbS5jbi9wYXBlcj9xPSVFNyU4OCVBQyVFOCU5OSVBQg==

打开网站（以第2页为例），找到我们这次需要分析的包。

![](https://attach.52pojie.cn/forum/202305/18/173829q3zvnxd3v996x1f8.png)

返回数据也是乱码：

![](https://attach.52pojie.cn/forum/202305/18/173833hzaz23c1hh14t33z.png)

经过查资料，观察返回的content-type为application/grpc-web+proto 是以protobuf数据结构传输的。

![](https://attach.52pojie.cn/forum/202305/18/173836yceat5vlot55wxvv.png)

我们用fiddler抓包看看（黑色16进制数据是发送的数据，蓝色是请求头数据）

![](https://attach.52pojie.cn/forum/202305/18/173839myg66u28nprysghc.png)

我们右键将黑色请求数据（第6位开始括)部分保存下来，为bin格式后面分析时候有用，为什么从第6位开始，后面会分析。

## 三、开始分析：

我们下个xhr断点看看，看看数据是怎么来的。

可以看到数据是以字节集的形式发出的，与fd抓包的16进制数据是一一对应的。

![](https://attach.52pojie.cn/forum/202305/18/173843soo3hcjklgtl3jt2.png)

接下来，我们看看数据是怎么来的？跟e来到上一个栈，可以发现是a赋值给e的。

![](https://attach.52pojie.cn/forum/202305/18/173846bieuygj6rigejsjj.png)

我们在e赋值的地方下断点，看看a怎么来的，重新调试一次，主要看a怎么构成的。

![](https://attach.52pojie.cn/forum/202305/18/173849uppvr3zsqwf5s9vm.png)

发现其实核心就是9681行到9690行赋值这一段。

```
for(n = (e = (0,n.a)(e.getRequestMessage())).length,
    f = [0, 0, 0, 0],
    a = new Uint8Array(5 + n),
    s = 3; 0 <= s; s--)
    f[s] = n % 256,
        n >>>= 8;

if (a.set(new Uint8Array(f), 1),
    a.set(e, 5),
    e = a,
```

### 我们一句句分析：

#### 先for循环部分：

`e = (0,n.a) (e.getRequestMessage())`

![](https://attach.52pojie.cn/forum/202305/18/173853wa1nguw6tnnzuuu6.png)

得到的是一个unit8Array数组，刚刚好就是我们的数据从5开始往后数。

`n = (e = (0,n.a)(e.getRequestMessage())).length`

这里得到这个数组长度是26。

`f = [0, 0, 0, 0]``

这里类似设置了一个头，4位空数组

`a = new Uint8Array(5 + n)`

这里a的初始化，因为我们知道最后a是一个Uint8Array的数组，他的长度是5+n。

`s = 3; 0 <= s; s--`

这里可以确定整个循环的次数，4次。

因为js是以;为结束的，所以相当于下列语句循环了4次，那这步操作是干嘛的呢？

```
f[s] = n % 256,
n >>>= 8;
```

给f数组各位赋值的，刚刚好f数组就是4位。所以说先给f的第四位赋值相当于f[3]， 再 n进行>>>=移位操作

得到

```
f[3] =26%256=26    26 >>>8=0 =>n=0
f[2] = 0%256 =0    0  >>>8=0 =>n=0
f[1] = 0%256 =0    0  >>>8=0 =>n=0
f[0] = 0%256 =0    0  >>>8=0 =>n=0
```

`f=[0, 0, 0, 26]`

#### 后面就是给a赋值了：

`a.set(new Uint8Array(f), 1)`

a是数组，然后查mdn文档，可知set方法的作用：

<https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/set>

**`set()`** 方法用于从指定数组中读取值，并将其存储在类型化数组中。

有两个参数，typedarray，offset(可选，默认为 0)

typedarray对应  `new Uint8Array(f)`

offset  对应    1

相当于从下标1开始，给a数组插入值f。

所以得到

![](https://attach.52pojie.cn/forum/202305/18/173856i6hhqgyage6h6kni.png)

这里核心就是这个set方法，不懂查一下就理解了。

`a.set(e, 5)`

相当于从数组下标5开始把e的值赋值给a

![](https://attach.52pojie.cn/forum/202305/18/173859r8f8kn6mmomtkram.png)

ok，我们到这里已经把a怎么来的理解清楚了，也明白了前面5位是怎么来的。

但是，我们还是没接触到`protobuf`啊，只是知道了数据得到的大概过程。核心就在`(0,n.a)(e.getRequestMessage())`里面。

![](https://attach.52pojie.cn/forum/202305/18/173902iteepreb7m4g17pc.png)

发现了我们的要讲的核心，protobuf。

看文章，看官方文档可以知道要构造这个protobuf格式数据，就是刚刚我们得到的那个数组，我们要先写proto文件，然后生成对应语言的proto版本，然后发包。

## 四、写proto文件（核心）

跟进n.a方法

![](https://attach.52pojie.cn/forum/202305/18/173905bgeqdbnqyyg34v8n.png)

发现了写protobuf数据格式的关键函数：**`serializeBinary`**

跟进去

![](https://attach.52pojie.cn/forum/202305/18/173907a5j5jphj250hit63.png)

**关键点：**

**根据serializeBinaryToWriter关键函数，可以得到此结构分层，跟进去可以得到包含几个信息**

![](https://attach.52pojie.cn/forum/202305/18/173910v7rbdpbfptfr3679.png)

write + （信息类型）函数，第一个参数代表是第几个。（如下图圈主部分）

![](https://attach.52pojie.cn/forum/202305/18/173913w6m5q6xwo6qvuwoo.png)

看到writeMessage，后面有serializeBinaryToWriter关键函数，跟进去，就能再次得到此message的结构层次，一样分析，就能得出完整结构。

packedenum用repeated关键字表示。

一个个分析按顺序写proto文件

```
syntax = "proto3";

message SearchService {
    enum InterfaceType{
        A=0;
    }
    enum SearchScope{
        B = 0;
    }
    enum SearchFilter {
      C = 0;
   }

   enum Order{
        D=0;
    }

    message SearchSort{
        string Field =1;
        Order Order=2;
    }

    message SecondsList{
        string Field=1;
        string Value=2;
    }
    message Commonrequest{
        string SearchType=1;
        string SearchWord=2;
        SearchSort searchSort=3;
        repeated SecondsList secondslist=4;
        int32 CurrentPage=5;
        int32 PageSize=6;
        SearchScope searchscope=7;
        repeated SearchFilter searchFilter = 8;
        bool LanguageExpand=9;
        bool TopicExpand=10;

    }

    message SearchRequest {
        Commonrequest commonrequest = 1; // 任意变量名
        InterfaceType interfaceType = 2; // 任意变量名
    }
}
```

命令行生成可python操作的protobuf文件

```
protoc --python_out=. ./test.proto
```

数据分析：fd抓包下载bin，然后命令行 protoc --decode\_raw < 1.bin执行，解析protobuf数据结构

![](https://attach.52pojie.cn/forum/202305/18/173916sp8kbl4paie3bzk3.png)

然后对应上面的结构找到对应变量，用python赋值运行：

```
import test_pb2 as pb #导入包
SearchRequest= pb.SearchService.SearchRequest() #实例化对象
#按上面解析数据，按照对应的属性设置值
#字符串，数字型的都是直接赋值
SearchRequest.commonrequest.SearchType='paper'
SearchRequest.commonrequest.SearchWord='爬虫'
SearchRequest.commonrequest.CurrentPage=2
SearchRequest.commonrequest.PageSize=20
#repeated修饰的messsage类型和enum类型，则需要稍微多几个步骤
SearchRequest.commonrequest.searchFilter.append(0)
SearchRequest.interfaceType=1
form_data = SearchRequest.SerializeToString()
print(form_data)
#保存数据玮bin文件供后续对比使用
with open('me.bin', mode="wb") as f:
    f.write(form_data)
```

**注意：**

字符串，数字型的都是直接赋值

repeated修饰的messsage类型和enum类型，则需要稍微多几个步骤

```
# 可重复message类型，需要调用一个add方法，然后将对应字段赋值
seconds = search_request.commonrequest.Second.add()
seconds.field = "Type"
seconds.value = '"Thesis"'
# 可重复enum枚举类型
search_request.commonrequest.searchFilter.append(0)
```

自己构造的和上面对比，发现完全一致，说明分析正确。

![](https://attach.52pojie.cn/forum/202305/18/173918sv9n1fgxtzgcv8ol.png)

用python发包，根据上面的分析，发现需要补头5位

```
bytes_head = bytes([0, 0, 0, 0, len(form_data)])
```

完整代码（获得数据）：

```
import requests
import test_pb2 as pb
SearchRequest= pb.SearchService.SearchRequest()
SearchRequest.commonrequest.SearchType='paper'
SearchRequest.commonrequest.SearchWord='爬虫'
SearchRequest.commonrequest.CurrentPage=2
SearchRequest.commonrequest.PageSize=20
SearchRequest.commonrequest.searchFilter.append(0)
SearchRequest.interfaceType=1
form_data = SearchRequest.SerializeToString()
print(form_data)
# with open('me1.bin', mode="wb") as f:
#     f.write(form_data)
# print(SearchRequest.SerializeToString().decode())
bytes_head = bytes([0, 0, 0, 0, len(form_data)])
print(bytes_head+form_data)

headers = {
    "Accept": "*/*",
    "Accept-Language": "zh-CN,zh;q=0.9,zh-TW;q=0.8",
    "Content-Type": "application/grpc-web+proto",
    "Origin": "https://*********",
    "Referer": "https://*********/paper",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
}
url = "https://*********/SearchService.SearchService/search"
response=requests.post(url,headers=headers,data=bytes_head+form_data)
print(response.content)
```

这篇文章最重要的是要学会怎么构造proto文件，请求头怎么一一对应，下一节，我们将对响应进行处理，找出相应的proto文件。

## 五、下部分前言

上一节，我们构造了请求的proto文件，并成功用python发包获得了数据，但是得到的数据和f12得到的数据是一样的乱码如下图：

![](https://attach.52pojie.cn/forum/202305/18/173921bets8o8yik68ee68.png)

其实这个也是protobuf格式，发过去的是protobuf格式，收到的也是protobuf格式，只是它是以二进制序列化格式传输的，所以我们看上去像乱码。

那么我们要怎么让它变好看呢？或者怎样好处理呢？

接下来会带来两种方法：①便捷但不太直观，②直观但有点复杂。

大家因人而异选择处理就好，喜欢用哪个就用哪个。

## 六、介绍处理的两种方法

### 1.方法一：直接使用第三方库

直接使用python应对protobuf的第三方库：`blackboxprotobuf`

​        安装命令：`pip install blackboxprotobuf`

​        调用核心函数 ：`blackboxprotobuf.decode_message`(**Byte类型数据**)

​        进行解protobuf格式数据变成我们好理解，直观的数据。

​        返回值有两个：第一个是数据（和上一节用命令行解出来的那种格式类似，对应着proto文件的位置），第二个是对应位置的类型

这里我们传`response.content`进去就好了，但是你会发现报错了：

![](https://attach.52pojie.cn/forum/202305/18/173923nt9khs9sghxxrs3y.png)

因为返回值我们还没分析，它发过来的有一部分是头信息，不在protobuf格式里面，所以解析会报错。
我先展示一下正确结果，给大家看看效果，第二种方法的时候，我会详细讲整个过程：

![](https://attach.52pojie.cn/forum/202305/18/173926uugsudzuu2ksms10.png)

所以我们可以分析data的结构，找到我们需要的数据，然后取值。

取值就和取json数据一样：`对象[键名]` 这里就是 `data['2'] ===>爬虫`

取你想要的，当然要拿出来数据到json解析的网站解析一下，然后分析：

这里推荐网站：<https://spidertools.cn/>#/

![](https://attach.52pojie.cn/forum/202305/18/173928c0iip25l57qmmump.png)

你可以看到，虽然拿到了数据，只是位置序号加内容，我们其实要靠猜才能知道是什么。

这就是我所说的便捷但不直观。

当然，blackboxprotobuf库还有其他函数api接口，你们可以查阅其他文章了解使用。

### 2.方法二：写对应的响应的proto文件

写对应的响应的proto文件，和发包一样。当然可以和发包写在一起。

​        然后同样的用命令行编译成python版本的：

```
protoc --python_out=. ./test.proto
```

然后一样的创建实例对象，然后使用`.ParseFromString`(**Byte类型数据**)函数就能解析了

```
search_response = test_proto2_pb2.SearchService_SearchResponse()
search_response.ParseFromString(response.content[5:])
print(search_response)
```

这里用的是渔歌之前文章的例子做演示，我们看看效果：

![](https://attach.52pojie.cn/forum/202305/18/173930fjikjj4wiqnie9nk.png)

是不是直观了很多，但是核心还是写proto文件，也是难点。然后分析为什么这里是取部分数据做解析。接下来，我们讲怎么构造响应的proto文件，然后为什么数据是从第6位（数组下标5）开始取。

我们f12开始分析，响应其实是最难调试的点，定位也很难，所以我们可以从请求的过程堆栈入手，说不定可以有所启发，发现可疑位置。

下xhr断点，跟着堆栈走，主要看app开头的js，因为chunk开头的是基本库，很少在里面做手脚，一般都是在自写的js里面做加密或其他操作。

![](https://attach.52pojie.cn/forum/202305/18/173932oit4iipi4a4zkaa4.png)

可以发现h这里有点可疑，异步然后获得了值去.toObject,这个toObject就是proto文件转js的时候会产生的一个api函数接口，大家可以简单使用protoc去尝试转化成js看看。

> （下载低于3.21.0 的protoc版本，因为原项目已将它独立出来，下载最新版本的protoc，运行js\_out会缺少插件）

```
protoc --js_out=import_style=commonjs,binary:. 你的proto文件名.proto
```

然后下断点执行，你会看到下面数据如图：

![](https://attach.52pojie.cn/forum/202305/18/173935yv022ip89vkn2030.png)

发现和之前请求的是不是很像，其实这已经是解包好的了，所以应该在前面，但是异步我们不好跟了，或者我们在then那里下一个断点，然后单步跟，我就用另一种方式了，我们复制这一段，全局搜索一下：proto.SearchService.SearchResponse

会找到我这节要说的写响应，返回值proto文件的核心关键词：

**deserializeBinary------deserializeBinaryFromReader**（**重点核心**）

![](https://attach.52pojie.cn/forum/202305/18/173937q868uz83b6u35235.png)

其实和请求包的关键词很像，就前面加了de，相当于解的意思。这里要多亏了志远大佬的指导，因为其实找响应的时候没一点头绪，然后很多文章都没讲清楚解包的关键词，异步也不太好跟，然后他稍微指点了一下，然后下断点就能定位了。

我们下一个断点看看，放开，重新点击：

![](https://attach.52pojie.cn/forum/202305/18/173939s0xojx0zjmpks9h8.png)

我们成功来到这个位置，和fiddler数据对比一下：

![](https://attach.52pojie.cn/forum/202305/18/173941rikp569cevidfjfp.png)

发现是从第6位开始解包，所以就解决了上面我们的疑问，为什么从第6位开始取数据。

刚刚不是提到了两个关键词吗？

**deserializeBinary------deserializeBinaryFromReader**（**重点核心**）

![](https://attach.52pojie.cn/forum/202305/18/173943hz4zvnihc0inenx9.png)

和请求的一样理解，只是他现在变成了case语句来表示位置，read后面的类型来表示类型。

![](https://attach.52pojie.cn/forum/202305/18/173945da0u9aa22zu2it2i.png)

也是一层一层，慢慢的可以跟出来，当然，这个返回的数据量太大了，标号也特别的多，我们刚刚也看到了，所以有没有什么更好的方法得到proto文件呢？

那就是自写ast，然后用ast来处理这种switch语句。先安装babel解析库在当前目录下

```
npm install @babel/core --save-dev
```

我对ast还不是很熟悉，我就采用渔歌之前写好的（文末会附上链接），因为网站js也有小更新，之前的使用会报错。

按照文章，我们先把这一个js保存起来，我这里保存成1.js，运行

![](https://attach.52pojie.cn/forum/202305/18/173947cspthpgtckwkkyyk.png)

发现报错了，我稍微调试修改一下

原来的：

```
path.parentPath.node.right.body.body[0].body.body[2].cases.length
```

修改为：

```
path.parentPath.node.right.body.body[0].body.body[0].cases.length
```

还加了try处理，因为，有些是取不到length的，我也没太仔细分析原因，只是单纯从报错入手，然后小修改了一下。

proto2改成了proto3，optional关键字删除。

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

var file_path = '1.js'; //你要处理的文件
var jscode = fs.readFileSync(file_path, {
    encoding: "utf-8"
});

// 转换为AST语法树
let ast = parser.parse(jscode);
let proto_text = `syntax = "proto3";\n\n// protoc --python_out=. app_proto2.proto\n\n`;

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
            try{
                // console.log(path.parentPath.node.right.body.body[0].body.body[0].cases.length);
                for (let i = 0; i < path.parentPath.node.right.body.body[0].body.body[0].cases.length; i++) {
                    let item = path.parentPath.node.right.body.body[0].body.body[0].cases[i];
                    if(item.test){
                        let id_number = item.test.value;
                        let key = item.consequent[1].expression.callee.property.name;
                        let id_st, id_type;
                        if(key.startsWith("set")){
                            id_st = "";
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
            }catch(e){
            }

            id_text += '}\n\n';
            proto_text += id_text
        }
    }
});

wtofile('app_proto3.proto', 'w', proto_text);
```

这个ast代码单纯只是针对这个站点，其他站点也是类似分析。

运行完后，我们得到了app\_proto3.proto文件，打开来，我们发现了报错，如下图，渔歌文章也讲清楚了原因，因为对象调用`deserializeBinaryFromReader`方法的时候，ast代码处理对象无法确定，所以就没加载到。

![](https://attach.52pojie.cn/forum/202305/18/173949qi77g5zteqe8qgga.png)

我们在调试里面，搜索关键词ExportResponse.deserializeBinaryFromReader

就能找到位置，根据我上面说的上下级关系，然后跟进去

![](https://attach.52pojie.cn/forum/202305/18/173951ko6a5iw5sn5uubuu.png)

![](https://attach.52pojie.cn/forum/202305/18/173953ita44p2cct2octkk.png)

就能找到s代表的是什么了。

然后我们依次像这样把报错补好就行了。

得到了proto文件，基本上我们的任务就完成了，我们发包试试吧。

![](https://attach.52pojie.cn/forum/202305/18/173955czddk6pdjyu2krtt.png)

可以看到很直观，取值也方便。我们的protobuf之旅也基本上结束了！

完整代码：

```
import requests
import app_proto3_pb2 as pb
import blackboxprotobuf

search_request = pb.SearchService_SearchRequest()
search_request.InterfaceType = 1
search_request.Commonrequest.SearchType = 'paper'
search_request.Commonrequest.SearchWord = '爬虫'
search_request.Commonrequest.CurrentPage = 2
search_request.Commonrequest.PageSize = 20
search_request.Commonrequest.SearchFilterList.append(0)
form_data = search_request.SerializeToString()
# with open('me1.bin', mode="wb") as f:
#     f.write(form_data)
# print(SearchRequest.SerializeToString().decode())
bytes_head = bytes([0, 0, 0, 0, len(form_data)])
# print(bytes_head+form_data)

headers = {
    "Accept": "*/*",
    "Accept-Language": "zh-CN,zh;q=0.9,zh-TW;q=0.8",
    "Content-Type": "application/grpc-web+proto",
    "Origin": "https://**********",
    "Referer": "https://**********/paper",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
}
url = "https://**********/SearchService.SearchService/search"
response=requests.post(url,headers=headers,data=bytes_head+form_data)
# print(response.content)
# deserialize_data, message_type = blackboxprotobuf.decode_message(response.content[5:])
# data, message_type = blackboxprotobuf.decode_message(response.content[5:])
# print(data)
# print(message_type)
search_response = pb.SearchService_SearchResponse()
search_response.ParseFromString(response.content[5:])
print(search_response)
```

## 七、注意：

其实这段代码还有点问题，就是最后取的`response.content`的真实长度是多少，从第6位开始，一共有多长呢，我们只是刚刚好取完是正确的。我们在从fiddler的抓包分析，刚刚不是前面还有5位16进制数：`00 00 00 93 E7`吗?我们在网站解析一下

![](https://attach.52pojie.cn/forum/202305/18/173957nm7ygy77030ywxlc.png)

刚刚好就是我们断点时的

![](https://attach.52pojie.cn/forum/202305/18/173959r0fsnn0z6nqfelf7.png)

所以前5位十六进制代表的是我们需要的响应数据的长度。

处理方法：

```
data_len=int.from_bytes(response.content[:5], 'big') #bytes转int
search_response = pb.SearchService_SearchResponse()
search_response.ParseFromString(response.content[5:5+data_len])
```

希望我们的文章能让你们对protobuf类型网站的逆向有更深的理解，某音直播弹幕其实也是类似原理，抓住这节和上节说的关键词,相信大家都能解决。

**`deserializeBinary------deserializeBinaryFromReader`**（**重点核心**）

**`serializeBinary------serializeBinaryFromReader`**（**重点核心**）

有说的不够好的地方欢迎指出，希望你看了有所收获！感谢！

如果想我多出文章，就多点赞转发，谢谢啦，写一篇真的好累，好久啊........

## 八、参考文章

<https://blog.csdn.net/qq_35491275/article/details/111721639>

<https://mp.weixin.qq.com/s/DzCz66_Szc7vfG6bpl956w>

<https://bbs.kanxue.com/thread-265537.htm>
