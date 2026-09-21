# 某老板直聘四层switch反混淆

> **作者**: woainixiang | **发布时间**: 2025-11-17 09:57:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6832 / 48
> **原文**: [https://www.52pojie.cn/thread-2073419-1-1.html](https://www.52pojie.cn/thread-2073419-1-1.html)

---

老板直聘作为另一类型的多层switch混淆的代表还是很有研究价值的，主要的特点就是switch起始index是不固定的，是调用的时候传参确定的，传不同的index，那么就运行不同的代码。
先上链接：aHR0cHM6Ly93d3cuemhpcGluLmNvbS93dWhhbi8/a2E9Y2l0eS1zaXRlcy0xMDEyMDAxMDA=，这个站chrome是抓不到包的，需要用fiddler抓包，先开启fiddler,然后打开网页直接找security-check.html这里是调用ABC生成cookie \_\_zp\_stoken\_\_的地方，先用fidder替换掉这个文件，然后在调用处加上debugger。

![](https://attach.52pojie.cn/forum/202511/17/094752p777hhzhj3wnp77q.png)

接着要找的第二个文件就是security-js文件夹下的js文件。后面的js文件名是一个随机的字符串，每天会变。

![](https://attach.52pojie.cn/forum/202511/17/094851vw4rppsxxbp34y8i.png)

将js文件复制出来就可以看到整个混淆过后的js代码了。初步分析整个代码，选每一层的第一个switch和第一个case展开后开始分析,最内层的case代码运行后会一层一层的break返回最外层，而不会在中间的某一层停留，同样的如果最内层有return，那么也会一层一层的返回到最外层，而不会在中间层处理。
那么可以认定整个switch由最外层的参数控制，可以将整个switch处理成只有最外层参数的一层switch.

![](https://attach.52pojie.cn/forum/202511/17/094928fmctxeatp76jxep6.png)

整个文件的操作思路和阿里的231一致，首先收集到所有w的值，然后在最内层的case中插入收集进入这个case时w的值的代码，最后删掉case中其他的语句，只留下插入的代码和break语句。首先收集W的值

![](https://attach.52pojie.cn/forum/202511/17/094948qlpq4sqj4s9pj40o.png)

然后插入代码

![](https://attach.52pojie.cn/forum/202511/17/095128fw1l74k4x4f4w9xy.png)

最后删掉多余代码

![](https://attach.52pojie.cn/forum/202511/17/095309ezn5t5mzhpzn0wh5.png)

将整个switch复制出去放在for循环中执行，得到每个case\_index\_X对应的w的值

![](https://attach.52pojie.cn/forum/202511/17/095023irdllr9hhhu0tq27.png)

得到映射结果。

![](https://attach.52pojie.cn/forum/202511/17/095401cniis4jij7s7chww.png)

根据映射结果将switch还原为一个switch.

![](https://attach.52pojie.cn/forum/202511/17/095444qi6easw68556556l.png)

删掉插入的代码，并将switch还原成顺序代码。

![](https://attach.52pojie.cn/forum/202511/17/095513rp2izsnj00ttj12o.png)

这只是还原了部分代码，后面还有一个函数也是同样的结构，当然也可以用同样的方法还原，需要注意的是后面函数的部分case index的值是在函数的call中的，只单纯收集函数内case index的值是不够的。

![](https://attach.52pojie.cn/forum/202511/17/095608o2b0u90usczuvsu0.png)

将函数内的swtich还原成一层switch后代码是没法运行的，替换原网页的代码后也会报错，原因也很简单，原来的多层switch将变量隔离的，当还原后变量的作用域提升了，导致变量污染。
当然解决这个问题也很简单，这样的多入口的switch本质是将多个函数融合在了一个函数中，然后用多层的switch将变量隔离开，要彻底还原这个switch只需要以每个入口的index作为起始值，用ast将switch遍历一遍，把每个经过的case取出来然后生成一个新的函数就可以了。
最后看一眼解开所有switch之后的结果

![](https://attach.52pojie.cn/forum/202511/17/095630n55y2mg525qo3gon.png)

懒得扣代码了，直接放将js带入网页的结果

![](https://attach.52pojie.cn/forum/202511/17/095655grmk0voxzmovrx4j.png)
