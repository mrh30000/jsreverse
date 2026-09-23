# 关于akamai中VM2的检测特征

> **作者**: lichuntian00 | **发布时间**: 2023-09-12 10:08:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 462 / 2
> **原文**: [https://www.52pojie.cn/thread-1832611-1-1.html](https://www.52pojie.cn/thread-1832611-1-1.html)

---

最近在看akamai，调试过程出现了一个问题。
下图是初始化生成 sensor\_data 的js文件，我们直接拿到之前补好的环境框架中去跑。

![](https://attach.52pojie.cn/forum/202309/12/085817tzjobnfnrnnojvoq.png)

运行结果如下图：

![](https://attach.52pojie.cn/forum/202309/12/090011r6cya58on5065na6.png)

看一下异常栈，是在XV[TV.Tx(JL,dPp)]中报错。
去浏览器跟栈看一下，结果如图：

![](https://attach.52pojie.cn/forum/202309/12/090342bu3xfo3kmofumnzc.png)

成功断住，控制台输出一下：

![](https://attach.52pojie.cn/forum/202309/12/090435cryl57vnrrnt77yg.png)

是个定时器，结果和我们的 js不一样，应该是被检测到了，所以运行了另一套代码逻辑。
从头跟栈看看：

![](https://attach.52pojie.cn/forum/202309/12/090734yoikzi6kv1iviowi.png)

首先检测了node。

![](https://attach.52pojie.cn/forum/202309/12/090851xtmzj2jznikzm2j1.png)

再对整个自执行函数进行了toString检测。

![](https://attach.52pojie.cn/forum/202309/12/091020lgezqxnhqalhhbzi.png)

检测指定字符串出现的位置。

![](https://attach.52pojie.cn/forum/202309/12/091258lai6m22amw762kos.png)

正确的返回值应该是211627，如果toString检测没过，这里返回的值就不对，就不会允许正常的逻辑。
在浏览器调试下我们的 js，如下图：

![](https://attach.52pojie.cn/forum/202309/12/091608juektvewkpg9ruu5.png)

结果是216917，toSring检测没过。检测没过，一般是2种原因，第一种是自己写的toString有问题，或者是写错了，或者是写了没有调用，回去检查一下代码，发现不是这个问题，第二种是格式化检测，把浏览器js代码复制
到自己环境中时给格式化了，这时候函数调用toString就会出现很多\r\n和空格，字符会变长，这种解决就是扣js代码的时候直接扣一行，千万不要格式化，调试的时候是可以的，回去检查代码是不是格式化了，发现没有格式化。
不是这2种原因，但是依然导致toString的结果不一样，那我们在控制台输出一下2个字符串看看：

![](https://attach.52pojie.cn/forum/202309/12/092555j5e757lzhkpq6ltb.png)

这是浏览器的

![](https://attach.52pojie.cn/forum/202309/12/092658fzy8vre183zi822b.png)

这是我们的。
可以看到，我们的比浏览器的要多出一些字符来，对比看看：

![](https://attach.52pojie.cn/forum/202309/12/092821xoa0ludq0ole1y31.png)

64处不同，多处都对比看一下，发现了多出来的字符串：

![](https://attach.52pojie.cn/forum/202309/12/092921wuubr6f5bbvrsu0e.png)

![](https://attach.52pojie.cn/forum/202309/12/092935onlj1oh3lz10zjjk.png)

![](https://attach.52pojie.cn/forum/202309/12/092951yg40aipr4q4krubz.png)

VM2相关的字符串，而且这串字符在js文件运行之前就存在，很容易想到这是VM2对我们的js代码进行编译加上去的东西。
我们在VM2的源码里搜索一下：

![](https://attach.52pojie.cn/forum/202309/12/093552rzsz3l3npln3imab.png)

在 transformer.js 里出现了，赋值给INTERNAL\_STATE\_NAME，查找调用：

![](https://attach.52pojie.cn/forum/202309/12/093555hnmwzjnwmzmieggn.png)

![](https://attach.52pojie.cn/forum/202309/12/093559zu1ou3xcee8n3ee2.png)

除去赋值，一共调用了8次。
我们来分析一下源码，看下它主要调用的逻辑：

![](https://attach.52pojie.cn/forum/202309/12/093601u7blgb3cbzgv7gvg.png)

这里是类似 AST语法树的一个结构，大概的意思就是说如果遇到节点类型为控制语句这种的，会往代码中添加我们之前看到的VM2字符串。
控制语句就是类型try catch，switch catch 等这种语句。我们之前的VM2字符串也是添加在这些语句的catch后面，看看被VM2编译过后的js文件：

![](https://attach.52pojie.cn/forum/202309/12/093604c20kscaa3zj2j5sv.png)

增加了70项VM2字符串，如果展开就能看到是添加在catch后面添加的。现在知道了原因，我们可以去修改VM2的源码，让它遇到控制节点的时候不添加这个字符串：

![](https://attach.52pojie.cn/forum/202309/12/094946a5fv1vyzdyv33239.png)

暂时给注释掉，这时候我们再次运行代码，结果如图：

![](https://attach.52pojie.cn/forum/202309/12/093608mll7laalawz3at7e.png)

![](https://attach.52pojie.cn/forum/202309/12/095426tpjss4cne5cjc7lc.png)

可以看到，没有VM2字符串了，而且返回的值也是211627，和浏览器一样。
最后，再说一下VM2这个特征的应用，主要有3点：
1. 如果你是反爬虫工程师，可以针对VM2字符串做检测，运行另一套不同的代码逻辑，返回看似正确的其实就差一个字符的结果。
2. 如果你是爬虫工程师，需要把环境框架里的 js代码打包在linux服务器上运行，如果不除去VM2字符串，非常容易抛出catch的语法错误，提示你VM2变量语法错误。
3. 如果以后再遇到toString检测没过，除了检查自写的toSring函数，检查格式化，还可以增加一项VM2的检查。
