# 《JavaScript AST其实很简单》一、相关基础知识与环境配置

> **作者**: 漁滒 | **发布时间**: 2020-12-19 14:54:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6389 / 8
> **原文**: [https://www.52pojie.cn/thread-1332822-1-1.html](https://www.52pojie.cn/thread-1332822-1-1.html)

---

*本帖最后由 漁滒 于 2020-12-19 14:57 编辑*

抽象语法树（abstract syntax code，AST）是源代码的抽象语法结构的树状表示，树上的每个节点都表示源代码中的一种结构，这所以说是抽象的，是因为抽象语法树并不会表示出真实语法出现的每一个细节，比如说，嵌套括号被隐含在树的结构中，并没有以节点的形式呈现。抽象语法树并不依赖于源语言的语法，也就是说语法分析阶段所采用的上下文无文文法，因为在写文法时，经常会对文法进行等价的转换（消除左递归，回溯，二义性等），这样会给文法分析引入一些多余的成分，对后续阶段造成不利影响，甚至会使合个阶段变得混乱。因些，很多编译器经常要独立地构造语法分析树，为前端，后端建立一个清晰的接口。

## 一、相关基础知识与环境配置

### 1.Python相关知识

整个开发过程98%以上都是使用python编写的，所以需要有小小的python入门基础
1）递归函数：解析语法使用递归是必不可少的，因为我们无法预先知道的镶嵌深度，只能使用递归的方法一层一层去解析。
2）字典与列表：整个解析过程可以说是对字典和列表的各种增删改查的操作，熟练操作字典与列表必不可少。
3）json：主要是json的序列化和反序列化，用于与node教程编程

### 2.JavaScript相关知识

JavaScript需要有基本了解，能读懂一般的js代码就可以。需要了解函数、对象、if语句和while语句等，这些都是后面必要的步骤。
在这基础上需要慢慢了解ast的节点类型和源代码中的对应关系。例如ast中的【VariableDeclaration】类型就表示【声明一个变量】，至于用什么声明，变量名是什么，声明成什么就要继续往后看。
更多内容可以查看[JavaScriptAST](https://github.com/NightTeam/JavaScriptAST)

### 3.开发环境配置

1）python：我是用的是3.7.0版本，并需要设置环境变量
2）PyCharm：集成环境的编辑器，2019.3.3版本
3）nodejs：13.9.0版本，并需要设置环境变量
4）node三方库：esprima和escodegen，分别是将js代码转换为AST和将AST转换为js代码
5）pythn三方库：execjs用于在python中调用js代码，需要使用pip install PyExecJS安装

### 4.已知问题及其解决方法

execjs模块可能会出现编码问题，根据[Python使用 execjs 出现 gbk报错的问题记录和解决](https://blog.csdn.net/eggsound/article/details/105263225)的帖子，可以在【python的安装目录\lib\subprocess.py】，用文本打开，修改637行的构造函数，将参数的encoding=None改为encoding="utf-8"，保存关闭即可。

```
   def __init__(self, args, bufsize=-1, executable=None,
                 stdin=None, stdout=None, stderr=None,
                 preexec_fn=None, close_fds=True,
                 shell=False, cwd=None, env=None, universal_newlines=None,
                 startupinfo=None, creationflags=0,
                 restore_signals=True, start_new_session=False,
                 pass_fds=(), *, encoding="utf-8", errors=None, text=None):
        """Create new Popen instance."""
        _cleanup()
```
