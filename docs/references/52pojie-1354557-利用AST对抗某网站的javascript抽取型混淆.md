# 利用AST对抗某网站的javascript抽取型混淆

> **作者**: 漁滒 | **发布时间**: 2021-01-19 21:27:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5190 / 8
> **原文**: [https://www.52pojie.cn/thread-1354557-1-1.html](https://www.52pojie.cn/thread-1354557-1-1.html)

---

因为网站比较敏感，所以省略的一部分内容，主要讲逻辑部分
python中处理js代码需要用到slimit这个库，使用pip install slimit即可安装
首先对网站源代码进行分析，，发现需要的js代码在script标签中，并且用flashvars开头的变量储存

![](https://attach.52pojie.cn/forum/202101/19/204924mhjlw18ll6jhlfsw.jpg)

首先将这段js代码拿出来

[Python] *纯文本查看*

```
    requests = requests_html.HTMLSession()
    response = requests.get(shareurl, headers=headers)
    for script in response.html.xpath('//script[@type="text/javascript"]'):
        script = script.xpath('//text()')[0]
        if 'flashvars' in script:
            # 此时可以获取script内所有的js代码
```

这里都比较简单，就不多说了,拿到这段js代码后，格式化先看一下

![](https://attach.52pojie.cn/forum/202101/19/210702ezbhrlovg0bef1ob.jpg)

这里可以看到，所有的视频地址都被抽取出来了，继续往后面看

![](https://attach.52pojie.cn/forum/202101/19/210835wlfaxli5tlo5aoql.jpg)

经过一段拼接后，重新形成正确的视频地址，接下来就是要使用ast来还原这个地址

[Python] *纯文本查看*

```
            # 转化为ast结构树
            tree = Parser().parse(script)
```

通过Parser类可以将js代码转换为ast结构树
获取到结构树后，需要自己通过继承ASTVisitor类来编写自定义访问者来遍历节点
这里我首先还原被抽取的mediaDefinitions列表

[Python] *纯文本查看*

```
flashvars = []

class VarStatement_Visitor(ASTVisitor):
    # 自定义访问者，重写VarStatement节点访问逻辑
    def visit_VarStatement(self, node):
        Identifier, Object = node.children()[0].children()
        # 获取flashvars定义的节点
        if 'flashvars' in Identifier.value:
            for each in Object.properties:
                left, right = each.children()
                # 找到mediaDefinitions数组
                if left.value == '"mediaDefinitions"':
                    # 还原每一个字典
                    for item in right.items:
                        data = {}
                        for key in item.properties:
                            keyleft, keyright = key.children()
                            if isinstance(keyright, ast.Array):
                                datalist = [i.value for i in keyright.items]
                                data[keyleft.value[1:-1]] = datalist
                            else:
                                if keyright.value == '"defaultQuality"':
                                    data[keyleft.value[1:-1]] = keyright.value
                                else:
                                    data[keyleft.value[1:-1]] = keyright.value[1:-1]
                        flashvars.append(data)
```

其中类名可以自定义，必须继承于ASTVisitor，然后重写【visit\_+类型】这个方法，来指定在什么类型的节点进入函数
例如我这里定义的是visit\_VarStatement方法，那就是访问所有的VarStatement节点，运行代码后可以得到还原的mediaDefinitions数组

![](https://attach.52pojie.cn/forum/202101/19/211841fd8uu89c94fz004k.jpg)

接着就是继续编写访问者，来还原视频地址

[Python] *纯文本查看*

```
class media_Visitor(ASTVisitor):

    def __init__(self, i, *args, **kwargs):
        # 视频所在的序号
        self.i = i
        # 用于添加映射关系
        self.identifier = {}
        # 用于添加映射顺序
        self.identifiers = []
        super(*args, **kwargs)

    # 递归获取映射顺序
    def get_Identifier(self, node, identifierlist):
        left, right = node.children()
        identifierlist.append(self.identifier[right.value])
        if isinstance(left, ast.BinOp):
            self.get_Identifier(left, identifierlist)
        else:
            identifierlist.append(self.identifier[left.value])

    def visit_VarStatement(self, node):
        Identifier, BinOp = node.children()[0].children()
        # 函数地址的映射顺序
        if 'media_'+str(self.i) == Identifier.value:
            # 计算真实视频地址
            self.get_Identifier(BinOp, self.identifiers)
            # 填充视频地址
            flashvars[self.i]['videoUrl'] = ''.join(self.identifiers[::-1])
        # 映射的定义
        elif isinstance(BinOp, ast.String) or (len(BinOp.children()) == 2 and isinstance(BinOp.children()[0], ast.String) and isinstance(BinOp.children()[1], ast.String)):
            if isinstance(BinOp, ast.String):
                self.identifier[Identifier.value] = BinOp.value[1:-1]
            else:
                self.identifier[Identifier.value] = ''.join([i.value[1:-1] for i in BinOp.children()])
```

这里进入的节点依然是VarStatement
因为视频地址的公式是由多个变量拼接得到的，我们并不知道会有多少个变量，所以定义了递归方法get\_Identifier来获取完整的拼接公式
运行后可以看到，所有被抽取的视频地址都已经还原回去（图片就不放了）
下面是完整代码

[Python] *纯文本查看*

```

import requests_html
# 将js代码转换为ast结构树
from slimit.parser import Parser
# 用于创建自定义访问者
from slimit.visitors.nodevisitor import ASTVisitor
from slimit import ast

flashvars = []

class VarStatement_Visitor(ASTVisitor):
    # 自定义访问者，重写VarStatement节点访问逻辑
    def visit_VarStatement(self, node):
        Identifier, Object = node.children()[0].children()
        # 获取flashvars定义的节点
        if 'flashvars' in Identifier.value:
            for each in Object.properties:
                left, right = each.children()
                # 找到mediaDefinitions数组
                if left.value == '"mediaDefinitions"':
                    # 还原每一个字典
                    for item in right.items:
                        data = {}
                        for key in item.properties:
                            keyleft, keyright = key.children()
                            if isinstance(keyright, ast.Array):
                                datalist = [i.value for i in keyright.items]
                                data[keyleft.value[1:-1]] = datalist
                            else:
                                if keyright.value == '"defaultQuality"':
                                    data[keyleft.value[1:-1]] = keyright.value
                                else:
                                    data[keyleft.value[1:-1]] = keyright.value[1:-1]
                        flashvars.append(data)

class media_Visitor(ASTVisitor):

    def __init__(self, i, *args, **kwargs):
        # 视频所在的序号
        self.i = i
        # 用于添加映射关系
        self.identifier = {}
        # 用于添加映射顺序
        self.identifiers = []
        super(*args, **kwargs)

    # 递归获取映射顺序
    def get_Identifier(self, node, identifierlist):
        left, right = node.children()
        identifierlist.append(self.identifier[right.value])
        if isinstance(left, ast.BinOp):
            self.get_Identifier(left, identifierlist)
        else:
            identifierlist.append(self.identifier[left.value])

    def visit_VarStatement(self, node):
        Identifier, BinOp = node.children()[0].children()
        # 函数地址的映射顺序
        if 'media_'+str(self.i) == Identifier.value:
            # 计算真实视频地址
            self.get_Identifier(BinOp, self.identifiers)
            # 填充视频地址
            flashvars[self.i]['videoUrl'] = ''.join(self.identifiers[::-1])
        # 映射的定义
        elif isinstance(BinOp, ast.String) or (len(BinOp.children()) == 2 and isinstance(BinOp.children()[0], ast.String) and isinstance(BinOp.children()[1], ast.String)):
            if isinstance(BinOp, ast.String):
                self.identifier[Identifier.value] = BinOp.value[1:-1]
            else:
                self.identifier[Identifier.value] = ''.join([i.value[1:-1] for i in BinOp.children()])

def geturl(shareurl, headers):
    requests = requests_html.HTMLSession()
    response = requests.get(shareurl, headers=headers)
    for script in response.html.xpath('//script[@type="text/javascript"]'):
        script = script.xpath('//text()')[0]
        if 'flashvars' in script:
            # 转化为ast结构树
            tree = Parser().parse(script)
            # 自定义访问者，访问VarStatement节点
            VarStatement_Visitor().visit(tree)
            for i in range(len(flashvars)):
                media_Visitor(i).visit(tree)
            break
    print(flashvars)
```
