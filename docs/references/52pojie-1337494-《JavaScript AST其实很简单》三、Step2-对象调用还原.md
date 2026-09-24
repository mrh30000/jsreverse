# 《JavaScript AST其实很简单》三、Step2-对象调用还原

> **作者**: 漁滒 | **发布时间**: 2020-12-25 23:08:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3810 / 4
> **原文**: [https://www.52pojie.cn/thread-1337494-1-1.html](https://www.52pojie.cn/thread-1337494-1-1.html)

---

### 对象调用还原

上一章讲到，我们已经将

```
'VlwGE': _0x166e('0x305')
```

还原为

```
'VlwGE': 'return (function() '
```

然后继续观察一下源代码
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201225221032361.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
这里可以看到，其定义了很多形如\_0x1468d1和\_0x118a14的对象，并在不断调用对象的方法来执行，那么首先要将这些对象选出来。
复制任意一个对象，例如\_0x118a14做语法分析
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201225221853644.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
可以看到，这是一个VariableDeclaration节点，这是它的第一个特点，然后继续往里面看
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201225222132836.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
可以看到，对象的所有键都是字符串，也就是类型是Literal，它的value总为5位。那么这是它的第二个特点。综合上面两点，按照上一章递归的方法，先找到所有VariableDeclarator的节点，再找到ObjectExpression里面必须所有的鍵都是字符串，且为5位数，就可以找到所有需要调用还原的对象了。

找到需要调用的对象以后，接下来就是要怎么调用后还原了，随便复制一个进行无法分析，例如

```
_0x118a14['jyyYA'](_0x541294, _0x5bcf0e, _0x53be6c)
```

![在这里插入图片描述](https://img-blog.csdnimg.cn/2020122522303610.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
可以看到它是一个CallExpression节点，并且它子节点callee的类型是一个MemberExpression，那么接下来就可以遍历所以符合这个条件的节点了，但是还漏了一点，还要判断其调用的object的名称是否是之前找到的，否则不应该进行还原。

那么其还原的类型就比较多了，我这里的话只列举一下
1.返回字符串（类型：Literal）
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201225224007457.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)

2.返回对象调用（类型：MemberExpression）
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201225224103813.jpg#pic_center)

3.返回二元表达式（类型：BinaryExpression）
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201225224242714.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
4.返回逻辑计算（类型：LogicalExpression）
因为这个文件没有，我就从其他地方截图
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201225224504443.jpg#pic_center)
5.返回函数调用（类型：CallExpression）
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201225224803833.jpg#pic_center)

对于1和2，比较简单，调用什么就直接将节点替换为调用的内容即可。对于3和4是类似的，都是由中间的符号和左右的标识组成，只要将调用时的第一个参数替换到符号的左边，第二个参数替换到符号的右边，然后将整个节点替换掉就可以。对于5，需要判断一下函数调用的参数个数和返回函数的参数个数，如下图
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201225225315388.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
此时就需要将调用函数的第一个参数变成返回函数的函数名，剩下的参数按顺序替换。如果调用函数和返回函数的参数数量是一样的，那么只需要按顺序替换参数即可，函数名不用变。最后将替换好的节点替换原来节点即可

当所有对象都调用替换完成后，那么这些对象就已经没有用了，也可以说已经是废代码。那么还是按照前面的方法，遍历找到这些定义的对象，全部删掉。这个和一开始查找对象的操作是一样的，只不过前面是查找到就记录下载，现在是查找到就删除。

再经过一系列的调用还原后，输出js代码，并将其格式化如下图
![在这里插入图片描述](https://img-blog.csdnimg.cn/2020122523025316.jpg?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3pqcTU5Mjc2NzgwOQ==,size_16,color_FFFFFF,t_70#pic_center)
可以看到很多地方都变得清晰可读了，例如上图中，已经将

```
if (_0x1468d1['KYTBP']('OWFLT', _0x1468d1['imVvW']))
```

替换为

```
if ('OWFLT' !== 'OWFLT')
```

这就是第二步反混淆的最终结果。
**备注：源文件见最下方附件内的ob\_step2.txt**
