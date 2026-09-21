# Web逆向之VMP还原全流程

> **作者**: lichuntian00 | **发布时间**: 2025-06-22 22:22:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 10511 / 55
> **原文**: [https://www.52pojie.cn/thread-2040789-1-1.html](https://www.52pojie.cn/thread-2040789-1-1.html)

---

某歌邮箱注册参数f.req 还原过程。
trace不说了，试试自实现反编译器还原VMP吧！

注册参数如下：

![](https://attach.52pojie.cn/forum/202506/22/180416awbkplvpnn4wlzv4.png)

返回位置如下：

![](https://attach.52pojie.cn/forum/202506/22/180619q8ccpcddhp7sy9d7.png)

[虚拟机](https://www.52pojie.cn/thread-661779-1-1.html)解释器如下：

![](https://attach.52pojie.cn/forum/202506/22/213945nz9et93cmp22kde2.png)

开始分析VMP结构：

**一、VMP指令集**

![](https://attach.52pojie.cn/forum/202506/22/180911xoztkdgbmlolzdmj.png)

请求首页，302跳转下发js-challenge页面，有加密配置参数，里面包含指令集字符串（图片所示），很好拿到，后续调用atob解密，并 &255保留低8位，得到字节数组形式的指令集

**二、虚拟机上下文分析**

![](https://attach.52pojie.cn/forum/202506/22/185500hlz7pse4shoph46p.png)

这是分析vmp之后提取出来的虚拟机上下文，Z是虚拟寄存器集合，一共512个
其中关键的几个寄存器有，
36号PC寄存器，
336号内层虚拟机PC寄存器，
184号轮密钥种子寄存器
280  115 509  234 147  44 136 511 210 471 这些寄存器存放生成加密参数所需上下文
关键虚拟机函数有：

![](https://attach.52pojie.cn/forum/202506/22/190948aqnz2ll9o802nlwn.png)

N函数，写入寄存器函数

![](https://attach.52pojie.cn/forum/202506/22/183450qqh7kic8niiciq8o.png)

y函数 ，读取寄存器值

![](https://attach.52pojie.cn/forum/202506/22/184516a9puki7wep7lddl6.png)

C函数，从虚拟机字节码中读取指令并解码复杂指令集为不同的指令类型，分发给B8解密指令

![](https://attach.52pojie.cn/forum/202506/22/182408tr4xopg3lxra9oo3.png)

B8函数，读取指令并根据参数判断是否密钥变换表，使用当前字节块的轮密钥对指令进行解密

![](https://attach.52pojie.cn/forum/202506/22/182813b7bjpj7vr5xnjxtu.png)

hJ函数，生成8字节解密表，用于取指之后，对指令进行异或解密

**三、虚拟机执行逻辑分析**

1.先从PC寄存器取字节码索引，然后同步到内层虚拟机的PC寄存器，然后调用C函数解码

![](https://attach.52pojie.cn/forum/202506/22/183006cim066m3m6p6622z.png)

2.C函数将指令解码为长短指令等复杂指令集，函数体一共有5个分支，分别对应
1.(w | 48) == w 分支 往寄存器中存值
2.(w - 5 | 5) >= w && (w + 4 & 43) < w分支  生成整数值
3.(w >> 1 & 12) < 12 && w + 6 >> 4 >= 3分支  处理变长操作码  先读取1字节，判断高位是否为1，扩展为长指令
4.w + 5 >> 3 == 1 分支 将寄存器的值变为闭包变量

![](https://attach.52pojie.cn/forum/202506/22/210607sfg2s7fgmllljlz6.png)

5.(w + 7 ^ 27) < w && (w - 6 ^ 9) >= w 分支  操作码读取  读取8位并开启密钥变换，或者读取低7位，左移2位组成9位操作码

3.C函数解码完成之后，下发给B8函数，按照C的解码规则来读取指令，详情如下：

![](https://attach.52pojie.cn/forum/202506/22/211442yyii3c5i7oioz55g.png)

首先从36 PC寄存器取出指定位数，同时判断是否超出索引
判断现在解密的位数属于第几组解密块，如果是新的解密块，需要调用hj更新轮密钥变换表
对取到的字节和当前轮的轮密钥进行异或解密
计算已经解密的字节，并向前推进对应位数，对齐到字节最低位，提取结果，并更新PC寄存器值
B8返回操作码，并根据高位判断是否为长指令，如果是长指令需要扩展为对应的操作码

![](https://attach.52pojie.cn/forum/202506/22/214831ix88kkyi7327q3za.png)

4.C返回对应的操作码之后，调用y函数从寄存器取操作码对应的handler，
不同的操作码对应不同的handler，利用handler执行操作码，操作数是基于操作码计算得到的

5.每执行完一轮操作码之后，进行检测。然后跳出循环执行下一个取指解码操作

完整流程是：取索引下标（利用PC）————解码（C函数）————取指（B8）————执行（跳转到对应handler）————检测（js文件被我处理过，移除了反调试和检测函数）

**四、操作码分析**
1.生成数值型操作码

![](https://attach.52pojie.cn/forum/202506/22/184000e6d14a964gg9lg2t.png)

操作码 24  生成4字节数值

![](https://attach.52pojie.cn/forum/202506/22/215930ch8zaazypaa27844.png)

操作码66，生成1字节数值

![](https://attach.52pojie.cn/forum/202506/22/220019b15n1ozedyz9tcsn.png)

操作码105 ，生成双字节数值
不一一列举
这些操作码的作用都是生成对应字节数值，并存储到寄存器

2.生成字符串型操作码

![](https://attach.52pojie.cn/forum/202506/22/220250laxmfaghrf937zm0.png)

操作码304 生成字符串  （调试的时候忘了截图！！）
可以看出来操作数是基于操作码计算得到的

3.函数调用型操作码

![](https://attach.52pojie.cn/forum/202506/22/220549hwl1l2vw261dq4bn.png)

操作码302  进行函数调用

4.属性访问型操作码

![](https://attach.52pojie.cn/forum/202506/22/220805h9u1zzcu7qq9ea9p.png)

操作码495 访问浏览器对象下的属性

另外，
- \*\*操作码122\*\*：生成`eval`函数调用。
- \*\*操作码149、220、446\*\*：处理数组操作（增大数组`register\_280`）。
- \*\*操作码265、495\*\*：对象属性赋值。
- \*\*操作码319\*\*：生成数组。
- \*\*操作码477\*\*：创建新对象

**五、编写反编译器**
分析完了，开始写反编译器，流程如下：

1.初始化节点

![](https://attach.52pojie.cn/forum/202506/22/185343bmicf8iy6mcmg6zf.png)

2.创建空AST

![](https://attach.52pojie.cn/forum/202506/22/185426lxs7kyj1lzmxskjx.png)

3.模拟虚拟机执行环境

4.加载base64解码后的指令

![](https://attach.52pojie.cn/forum/202506/22/185538ovy93f3ih0tqyzxf.png)

5.指令处理循环  读取操作码  处理不同的操作码    解码操作码语义

![](https://attach.52pojie.cn/forum/202506/22/221129byb84e8ydpqbnt4t.png)

6. 类型推断生成ast 生成不同类型节点  根据值类型生成对应AST节点

![](https://attach.52pojie.cn/forum/202506/22/185711cu6abuqux8gumz5q.png)

7.ast生成  根据操作类型创建对应的AST节点   将节点添加到程序体

![](https://attach.52pojie.cn/forum/202506/22/185633qerzpo2lsgvsp2n7.png)

**六、输出虚拟化之前的js代码**

![](https://attach.52pojie.cn/forum/202506/22/185256avedtdjyvhd0p3kh.png)

一个变种白盒AES，一个变异的base64

web端协议参数生成

![](https://attach.52pojie.cn/forum/202506/22/221714emv3yrh2ooyd3oli.png)

app端webview参数生成

![](https://attach.52pojie.cn/forum/202506/22/221923el9zxmzd2dmu9r0m.png)
