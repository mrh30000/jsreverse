# 《JavaScript AST其实很简单》五、Step4-平坦化控制流

> **作者**: 漁滒 | **发布时间**: 2020-12-31 22:09:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 7725 / 12
> **原文**: [https://www.52pojie.cn/thread-1341603-1-1.html](https://www.52pojie.cn/thread-1341603-1-1.html)

---

### 平坦化控制流

上一篇我们说到去除了if判断下的废代码，那么本篇文章为本阶段的最后一篇，可能平坦化控制流不知道是什么，那么直接看看下面截图就知道了
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201231210658414.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
可以看到，这里代码的都是有用的代码，不同于上一篇存在废代码，但是代码的执行顺序并不是按照一般的从上到下执行，这对代码阅读并不友好。

```
var _0x51adbe = '3|4|0|5|1|2'['split']('|'), _0x50da1a = 0;
while (!![]) {
    switch (_0x51adbe[_0x50da1a++]) {
    case '0':
        var _0x89f607 = _0x5c99f5[_0x55b3ce] || _0x527778;
        continue;
    case '1':
        _0x527778['toString'] = _0x89f607['toString']['bind'](_0x89f607);
        continue;
    case '2':
        _0x5c99f5[_0x55b3ce] = _0x527778;
        continue;
    case '3':
        var _0x527778 = _0x5a83cd['constructor']['prototype']['bind'](_0x5a83cd);
        continue;
    case '4':
        var _0x55b3ce = _0x5b4bc9[_0x13a6aa];
        continue;
    case '5':
        _0x527778['__proto__'] = _0x5a83cd['bind'](_0x5a83cd);
        continue;
    }
    break;
}
```

先看一下上面代码的规律，可以看到先定义了一个字符串，并且使用split切割，作为代码执行的顺序，再定义一个临时变量。跟着就是一个while循环，下面就是我们需要的代码了。
看起来好像是最困难的，但是经过分析后发现，其实只是比上一篇难一点点，属于第二简单的。将上面代码做一下语法的分析
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201231213036251.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
可以看到，这部分的代码块包含两部分。一部分是VariableDeclaration节点，一部分是WhileStatement节点。前面VariableDeclaration节点就是定义字符串的部分，所以我们要首先遍历所有BlockStatement（代码块）的节点，找到第一个节点的类型是VariableDeclaration，第二个节点是WhileStatement，并且VariableDeclaration节点一次定义了两个变量，且第一个变量的的属性赋值是一个CallExpression
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201231215801236.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
那么我们就可以递归遍历找到所有这类型的代码块，然后我们最终也是要返回一个代码块的，那么我们就创建一个空列表，用来保存每一个case下的代码。获取第一个变量的字符串，可以直接在python里面的split函数切分，得到一个顺序的列表
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201231220146527.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
这里可以看到，case部分的代码在cases节点下是按顺序的，那么就可以按照前面切分得到列表的顺序来遍历case，将里面的代码部分添加到前面我们新建的空列表里面。当所有case遍历完以后，也得到我们最终的代码块数组，将原本整个节点部分的的代码块替换为后面添加了代码的列表。这时就完成了平坦化控制流。

运行替换后格式化一下代码
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201231220704440.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)

可以看到代码已经完成反混淆的工作，此时阅读代码已经不再困难了。
**备注：源文件见最下方附件内的ob\_decrypt.txt**
