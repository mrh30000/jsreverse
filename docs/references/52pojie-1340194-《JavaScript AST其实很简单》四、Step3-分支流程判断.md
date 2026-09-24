# 《JavaScript AST其实很简单》四、Step3-分支流程判断

> **作者**: 漁滒 | **发布时间**: 2020-12-29 21:12:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3141 / 0
> **原文**: [https://www.52pojie.cn/thread-1340194-1-1.html](https://www.52pojie.cn/thread-1340194-1-1.html)

---

### 分支流程判断

上一章讲到，我们已经将

```
if (_0x1468d1['KYTBP']('OWFLT', _0x1468d1['imVvW']))
```

替换为

```
if ('OWFLT' !== 'OWFLT')
```

这篇内容的分支流程判断就是这里，可以很明显的看到
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201229203312331.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
可以看到'OWFLT' !== 'OWFLT'必定为假，那么真部分的代码就是永远不会执行的，相当于废代码，而实际有用的就是假部分的代码
接着就是复制一段代码做语法分析
例如下面的代码

```
if ('JOSTK' !== 'JOSTK') {
    function _0x74959b() {
        var _0x25def5;
        try {
            _0x25def5 = capJun['YwhOk'](_0x87e8de, capJun['JnPpa'](capJun['nUheI'](capJun['EXptI'], capJun['NiQEl']), ');'))();
        } catch (_0x8fd90a) {
            _0x25def5 = _0x4844c7;
        }
        return _0x25def5;
    }
} else {
    if (_0x17aefa) {
        var _0x46d4c7 = _0x17aefa['apply'](_0x502843, arguments);
    }
}
```

![在这里插入图片描述](https://img-blog.csdnimg.cn/20201229205611683.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
这里可以看到这是一个IfStatement的节点，这个节点下有三个子节点，分别为test（判断的内容），consequent（真时执行的代码），alternate（假时执行的代码）
知道这些之后，就可以和之前一个递归遍历所有节点，找到节点的类型是IfStatement。再判断test里面是不是字符串比较，也就是之前说的类型是BinaryExpression，都符合的话，说明这个节点就是需要替换的节点。
然后获取符号以及符号左右的值，通过python判断结果是真还是假，分别替换为consequent或者alternate即可。第三步是所有步骤里面最简单的一步。

运行替换后格式化一下代码
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201229210553555.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
这里可以看到，前面的if判断都被反混淆掉了
**备注：源文件见最下方附件内的ob\_step3.txt**
