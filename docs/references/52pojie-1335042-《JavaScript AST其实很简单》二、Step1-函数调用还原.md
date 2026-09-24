# 《JavaScript AST其实很简单》二、Step1-函数调用还原

> **作者**: 漁滒 | **发布时间**: 2020-12-22 18:14:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6304 / 13
> **原文**: [https://www.52pojie.cn/thread-1335042-1-1.html](https://www.52pojie.cn/thread-1335042-1-1.html)

---

*本帖最后由 漁滒 于 2020-12-25 22:01 编辑*

### 前言

本系列所有反混淆内容都是基于开源项目[JavaScript Obfuscator Tool](https://obfuscator.io)进行的。
打开网站后，使用如下配置对js源码进行混淆
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222170942418.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
下载混淆后的js文件，进行格式化后大概是这样的
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222171444703.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
**备注：源文件见最下方附件内的ob.txt**

可以看到第一个节点定义了一个大数组\_0x101c，第二和第三是一个立即执行函数和一个函数，这两个顺序不一定。从上图中可以看到，被混淆后的js代码中，存在非常多的相同的函数调用，那么第一步就是要将这个函数调用的结果还原回去。

### 1.语法分析

要反混淆第一步就是对现有的代码做分析，找到其加密的规律，然后按照这个规律进行还原
首先将混淆后的代码复制到[AST explorer](https://astexplorer.net)，其中使用的解析器是esprima，我用用node的模块也是这个
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222172821519.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
可以看到很快就可以将源代码转换成抽象语法树，然后随便点击一个\_0x166e函数调用的地方
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222173201327.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
可以看到，其中的类型为CallExpression，那么现在就可以找所有的CallExpression了，但是并不是所有的函数调用都是需要还原的，只有名称为\_0x166e的才需要。

但是并不能将这个函数名写死，因为这个函数名是随机的，所以要先确定函数名。由前面可知，函数的定义一定会出现在第二或者第三个节点，那么只要查找第二和第三个节点，看看哪个是函数定义，就可以知道函数名了。只知道函数名还不够，还需要里面的参数。

![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222173755663.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
在CallExpression的子节点在有一个arguments的节点，里面就有函数调用的参数了。此时就已经获取了函数名和所有调用的参数

### 2.函数调用计算

我们首先编写一个node的命令行文件，用于将js代码转换为json,保存为文件：js2jsonyuge.js

```
const fs = require('fs');
const esprima = require('esprima')
const escodegen = require('escodegen')

var inputtext = process.argv[2];
var outputtext = process.argv[3];

var data = fs.readFileSync(inputtext);
var ast = esprima.parseScript(data.toString());
var ast_to_json = JSON.stringify(ast);
fs.writeFileSync(outputtext, ast_to_json);
```

再编写一个相反的，将json转换为js代码,保存为文件：json2jsyuge.js

```
const fs = require('fs');
const esprima = require('esprima')
const escodegen = require('escodegen')

var inputtext = process.argv[2];
var outputtext = process.argv[3];

var data = fs.readFileSync(inputtext);
var ast = JSON.parse(data.toString());
var code = escodegen.generate(ast, {
    format: {
        compact: true,
        escapeless: true
    }
});
fs.writeFileSync(outputtext, code);
```

先读取转换的json，并将前3个节点输出，用于后面计算结果

```
    inputfile = 'ob'
    os.system('node js2jsonyuge '+inputfile+'.js '+inputfile+'.json')
    with open(inputfile+'.json', 'r', encoding='utf-8') as f:
        data = f.read()

    # 删除缓存
    os.remove(inputfile+'.json')
    data = json.loads(data)

    # 定义替换函数的json
    tempstep1 = {
        'type': 'Program',
        'body': data['body'][:3],
        'sourceType': 'script'
    }

    # 写出第一步替换的函数体
    with open(inputfile+'_step1.json', 'w', encoding='utf-8') as f:
        f.write(json.dumps(tempstep1, ensure_ascii=False, separators=(',', ':')))
    os.system('node json2jsyuge '+inputfile+'_step1.json '+inputfile+'_step1.js')
```

运行后会得到一个ob\_step1.json和ob\_step1.js，打开ob\_step1.js并在第二行输入

```
console.log(_0x166e('0x305'));
```

保存后在命令行中运行

```
node ob_step1.js
```

如果可以显示【return (function()】，说明正常计算。
而在python中需要用到execjs模块

```
with open('ob_step1.js', 'r', encoding='utf-8') as f:
    ctx = execjs.compile(f.read())
resul = ctx.call('_0x166e', '0x305', '')
print(resul)
```

此时一样可以得到【return (function()】

### 3.递归还原

此时就可以递归获取所有名称为\_0x166e的CallExpression节点，然后计算结果，基本的递归格式我是如下编写的。
填写核心逻辑后，就可以递归获取所有参数，并进行调用还原，还原的结果要怎么塞回去呢？继续进行分析，可以看到所有的返回值都是字符串，那么字符串的类型就是Literal，那么就可以自己构建一个Literal节点，然后将源节点替换掉即可

```
def diguiyangli(node, Functionname, ctx):
    if type(node) == list:
        if node:
            for i in range(len(node)):
                diguiyangli(node[i], Functionname, ctx)
    elif type(node) == dict:
        for key in node.keys():
            if node[key]:
                if not type(node[key]) in [str, bool, int]:
                    for eachkey in node[key].keys():
                        if type(node[key][eachkey]) == dict:
                            if 'type' in node[key][eachkey].keys():
                                if node[key][eachkey]['type'] == 'CallExpression':  # 获取类型为CallExpression的节点
                                    if 'name' in node[key][eachkey]['callee'].keys():
                                        if node[key][eachkey]['callee']['name'] == Functionname:  # 获取指定函数调用名的节点
                                            if len(node[key][eachkey]['arguments']) == 2:  # 获取函数调用的参数
                                                arg1, arg2 = node[key][eachkey]['arguments']
                                                arg1 = arg1['value']
                                                arg2 = arg2['value']
                                            else:
                                                arg1 = node[key][eachkey]['arguments'][0]['value']
                                                arg2 = ''
                                            value = ctx.call(Functionname, arg1, arg2)
                                            # 创建一个Literal节点
                                            returnobject = {'type': 'Literal', 'value': value}
                                            # 替换原来节点
                                            node[key][eachkey] = returnobject
                    diguiyangli(node[key], Functionname, ctx)
```

经过一系列的调用还原后，输出js代码，并将其格式化如下图
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222180824933.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
可以看到，原来的

```
'VlwGE': _0x166e('0x305')
```

已经被替换为

```
'VlwGE': 'return (function() '
```

此时第一步已经完成，那么前三个节点已经没有用了，将前三个节点删除后，就是第一步反混淆的最终结果.
**备注：源文件见最下方附件内的ob\_step1.txt**

附件地址：<https://www.lanzoux.com/b0101ok4b>
