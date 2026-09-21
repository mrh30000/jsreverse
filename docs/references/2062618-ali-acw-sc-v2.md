# 某里新版acw_sc_v2算法分析

> **作者**: LiSAimer | **发布时间**: 2025-09-25 20:31:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6125 / 19
> **原文**: [https://www.52pojie.cn/thread-2062618-1-1.html](https://www.52pojie.cn/thread-2062618-1-1.html)

---

### 声明

本文章中所有内容仅供学习交流使用，不用于其他任何目的，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关！若有侵权，请联系作者删除。

### 逆向目标

目标网站：
aHR0cHM6Ly9odW5hbi56Y3lnb3YuY24vbHViYW4vYW5ub3VuY2VtZW50L2xpc3Q=

### 抓包分析

打开抓包工具
抓包完成后，过滤url包含queryPage的请求，这个是获取数据的接口
发现有两次post请求
第一次post请求响应如下

![](https://attach.52pojie.cn/forum/202509/25/202848podbjoujq1uj8rd6.png)

熟悉的arg1
上个版本也是用的这个去生成的acw\_sc\_\_v2
响应体中也一样有个关键js代码
应该就是这个 PxjRjE 方法了

![](https://attach.52pojie.cn/forum/202509/25/202913if9i6m9m9rvwabvn.png)

第二次post请求响应如下

![](https://attach.52pojie.cn/forum/202509/25/202928t81lwwawwmmkl338.png)

cookie中有了acw\_sc\_\_v2
响应体中也有了我们想要的数据

### 无限debugger分析

进浏览器分析看看
清缓存刷新页面立马就给端上个无限debugger

![](https://attach.52pojie.cn/forum/202509/25/202931aubsspizq29zpy72.png)

往上跟栈看看哪里触发进来的
进入了个混淆过的js环境
代码拉到最顶部
果然，是这个 PxjRjE 方法里了

![](https://attach.52pojie.cn/forum/202509/25/202934ilitzcscavtc5s5q.png)

回到debugger触发的位置

```
(b = H[ye(oe.u)][ye(oe.K)][ye(oe.Q) + 'r']('s', 'i', t[ye(oe.x)](t[ye(oe.O)](t[ye(oe.B)](x), z), t[ye(oe.W)])))(A[z], z))
```

还原下代码分析下咋触发的

```
(b = window.Math.random.constructor('s', 'i', window.Math.random() + z +"; debugger;return s['charCodeAt'](0);"))(A[z], z)
```

1. 获取Function构造函数
   window.Math.random 是一个函数
   函数的 constructor 属性指向 Function 构造函数
   这是一种绕过直接使用 Function 关键字的技巧
2. 动态创建函数

   ```
   Function('s', 'i', window.Math.random() + z + "; debugger;return s['charCodeAt'](0);")
   ```

   第一个参数 's' 是函数的第一个形参
   第二个参数 'i' 是函数的第二个形参
   第三个参数是函数体字符串

关键点：函数体的构建
window.Math.random() 生成一个0-1之间的随机数（如：0.123456789）
z 是一个变量（从上下文看应该是数字）
拼接后形成类似："0.1234567895; debugger;return s['charCodeAt'](0);"

3. 函数调用 (A[z], z)
   使用逗号操作符，返回最后一个表达式 z
   实际上传递给函数的参数是：s = A[z], i = z

分析完了总结一下
动态创建的函数体包含 debugger; 语句
当这个函数被调用时，执行流程会遇到 debugger 语句
如果浏览器开发者工具处于打开状态，代码执行会在此处暂停
主要逻辑是返回 s['charCodeAt'](0) 的执行结果

正常要绕过的话我们可以进行一个替换
在debugger处回到上一个断点

![](https://attach.52pojie.cn/forum/202509/25/202936cn166kj7076k6rkh.png)

在控制台输入

```
t[ye(oe.W)] = t[ye(oe.W)].replace('debugger;', '')
```

这样我们继续调试就不会触发debugger了
但是！但是！
在这个js案例中，是会校验这个debugger字符串的
如果我们删掉了虽然不会影响流程但是会影响结果
最终生成的值是无法通过校验的

那么如何既能绕过debugger又能不影响结果呢
后文再说

### JS分析

绕过debugger后继续分析终于找到生成的位置
最终计算的P值就是我们想要的结果了

![](https://attach.52pojie.cn/forum/202509/25/202938f20kr2kzwg3uz90p.png)

将js代码拿到本地开始分析
（没时间解混淆了，时间紧任务重，直接硬刚！！）
执行调试后报错了
没有window对象，补上

![](https://attach.52pojie.cn/forum/202509/25/202851u1ss5yx8so2576br.png)

再跑一遍发现直接卡死了
陷入了某个死循环
这时候只能对着浏览器一步步看哪块不对了
聪明的我们很快就发现了不对劲的地方

![](https://attach.52pojie.cn/forum/202509/25/202853ucp48unc45oc87b5.png)

在本地我们的值和浏览器不一样
浏览器中这个值恒为 594

![](https://attach.52pojie.cn/forum/202509/25/202855p0g7fscomjv8z210.png)

分析这个方法有三个入参
PxjRjE函数的toSting转化和两个固定字符串
进入方法看看

![](https://attach.52pojie.cn/forum/202509/25/202857m30muu6y0fo5zh5z.png)

发现在找一些字符串的索引位置和提取然后做计算
那聪明的我们马上想到了

浏览器中PxjRjE函数toString后字符串是压缩一行的
而我们本地弄下来的是格式化后的
所以找索引根本对不上

知道原因了那么也很少处理，直接修改结果即可

![](https://attach.52pojie.cn/forum/202509/25/202900gtt5o6to65bftt65.png)

再重新跑一遍这回不卡死了报错了
缺少arg1

![](https://attach.52pojie.cn/forum/202509/25/202902hw1vnpw88571sov7.png)

开头给随便补上一个

![](https://attach.52pojie.cn/forum/202509/25/202904plk3k39pc39u99tx.png)

再执行又会进一个try-catch报错
这里不用管直接跳过，浏览器中也是会进catch的

![](https://attach.52pojie.cn/forum/202509/25/202906c1pfk2xuuixz5fxd.png)

然后就又到前面说的触发debugger的地方了
进行校验影响结果的地方就在一块

![](https://attach.52pojie.cn/forum/202509/25/202909bffck32yfw345jhf.png)

还原一下看看代码

```
Y || (R = T + (-1 === b.toString()["indexOf"]("debugger") || new RegExp('\\{[\\s\\S]*[/\\*]{2}[\\s\\S]*\\}', 'gm')["test"](b.toString())))
```

如果把debugger字符串删了
虽然绕过了debugger但是这块代码找索引就找不到了
R值结果就会不对后面用R的地方就有问题了

也很好解决只要找空就行

```
b.toString()["indexOf"]("")
```

这样就既绕过debugger又能不影响结果了
然后就直接到 P 值生成位置了

![](https://attach.52pojie.cn/forum/202509/25/202911o5mmocjrzqtfc0mr.png)

### 算法分析

从 P 值生成位置往上分析

这里使用了一个自定义的线性同余生成器（LCG）替换JavaScript 原生的 Math.random() 函数，使其每次调用都返回一个可预测的、基于固定种子的伪随机数序列

![](https://attach.52pojie.cn/forum/202509/25/202915p84929ab99fpmmqp.png)

接着下面又魔改了 fill 方法，让数组按照它的规则打乱重组返回

![](https://attach.52pojie.cn/forum/202509/25/202917uw0pasv5ayv995sz.png)

![](https://attach.52pojie.cn/forum/202509/25/202920ujz0vhh7rv879v1h.png)

再使用类似于Fisher-Yates 洗牌算法，接受一个十六进制字符串，使用预定义的打乱顺序将每个十六进制字符映射到另一个十六进制字符

![](https://attach.52pojie.cn/forum/202509/25/202922sy2yk7l7m37997y5.png)

最后拼接一些字符串再转小写就结束了

![](https://attach.52pojie.cn/forum/202509/25/202924mo3ag8n9bwoytob0.png)

### 结果验证

用python写出算法后实际代码都不足30行

![](https://attach.52pojie.cn/forum/202509/25/202926qv7az6flf0fgfpjg.png)
