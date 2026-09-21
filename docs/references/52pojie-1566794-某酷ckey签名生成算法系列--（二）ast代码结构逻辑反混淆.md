# 某酷ckey签名生成算法系列-（二）ast代码结构逻辑反混淆

> **作者**: 漁滒 | **发布时间**: 2021-12-24 22:15:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5223 / 9
> **原文**: [https://www.52pojie.cn/thread-1566794-1-1.html](https://www.52pojie.cn/thread-1566794-1-1.html)

---

@[TOC](https://www.52pojie.cn/%E6%9F%90%E9%85%B7ckey%E7%AD%BE%E5%90%8D%E7%94%9F%E6%88%90%E7%AE%97%E6%B3%95%E7%B3%BB%E5%88%97--%EF%BC%88%E4%BA%8C%EF%BC%89ast%E4%BB%A3%E7%A0%81%E7%BB%93%E6%9E%84%E9%80%BB%E8%BE%91%E5%8F%8D%E6%B7%B7%E6%B7%86)

首先格式化一下代码看看

![](https://attach.52pojie.cn/forum/202410/11/172439mogg6p7g6px3dz7d.png)

这里面的代码混淆的老母亲都不认得了。有多个switch，非常长的三元表达式，逗号表达式等等，使得即使手动单部调试，也非常的难以进行。那么这时就需要对源代码进行一些处理，使得它能够方便调试，同时更加容易阅读。

此时就需要用到AST了，来对源代码进行反混淆，并且替换本地js进行调试，ast的相关说明文章
1.[《JavaScript AST其实很简单》一、相关基础知识与环境配置](https://www.52pojie.cn/thread-1332822-1-1.html)
2.[《JavaScript AST其实很简单》二、Step1-函数调用还原](https://www.52pojie.cn/thread-1335042-1-1.html)
3.[《JavaScript AST其实很简单》三、Step2-对象调用还原](https://www.52pojie.cn/thread-1337494-1-1.html)
4.[《JavaScript AST其实很简单》四、Step3-分支流程判断](https://www.52pojie.cn/thread-1340194-1-1.html)
5.[《JavaScript AST其实很简单》五、Step4-平坦化控制流](https://www.52pojie.cn/thread-1341603-1-1.html)

本系列文章反混淆使用的是nodejs中的babel库，亲测相当之好用

![](https://attach.52pojie.cn/forum/202410/11/172441vjj5p2317pak2m13.png)

最开始看到的就是这种超级长的三元表达式，我们知道最简单的三元表达式类似于下面的样子

```
a > b ? c : d
```

他是在前面条件成立时执行c部分的代码块，否则执行d部分的代码块。这与if判断的逻辑极为相似，如果把上面的代码改一下，变成if的语句，看起来将会相对简单点

```
if(a > b){
        c;
}else{
        d;
}
```

此时代码可以说是一目了然。当形如上面多个三元表达式嵌套的时候，如果改成if的形式，会不会使得代码看起来相对好阅读一点呢，来尝试一下使用ast还原这种三元表达式

![](https://attach.52pojie.cn/forum/202410/11/172443m45ol53wrx4xwtoz.png)

还原后的代码看上去有了规律可循，不再是一行直接执行完成，连调试都没有办法进行。那么还原了这个就可以进行调试了吗？实际上还是很难调试的，还需要继续反混淆和优化

![](https://attach.52pojie.cn/forum/202410/11/172445c9djjyw0jykr4kyw.png)

可以看到代码中有一些try的代码块，在网页端调试的时候，一般情况下只需要注意try里面的部分，catch的部分不需要，那么就可以将try中的代码提取出来，减少代码的数量

![](https://attach.52pojie.cn/forum/202410/11/172447mhdevs0zjaz9i0be.png)

这时代码看起来更加简洁了。这时进行调试的话，代码会不断反复横跳，导致心跳爆炸，那么还需要想办法继续来反混淆这个js，再回来看看直接反混淆出来的if语句

![](https://attach.52pojie.cn/forum/202410/11/172449nwf9kyu2avknw2by.png)

仔细观察可以发现，每一个if判断的AI值（每一个函数的变量名不一样）都有一个与之唯一对应的执行语句。那么这种语法结构就和switch的结构非常相似。

```
****省略代码******
if (12 == Ai) {
  N = Se[vo],Q = N[Z](), li = Q ? 11460 : 1475;
} else {
  if (12 > Ai) {
    if (5 == Ai) {
      li = 8804;
    } else {
****省略代码******
```

那么按照上面的逻辑，可以改写为下面的形式

```
****省略代码******
switch (Ai) {
        case 12:
                N = Se[vo],Q = N[Z](), li = Q ? 11460 : 1475;
        case 5:
                li = 8804;
****省略代码******
```

继续尝试还原一下看看

![](https://attach.52pojie.cn/forum/202410/11/172451w9wwc9r9mv9d44m1.png)

这是看起来，感觉更加有规律找了，调试起来到switch的时候，也可以快速知道它执行的是哪一行的代码

![](https://attach.52pojie.cn/forum/202410/11/172453nxn1i4sxhgmtsche.png)

此时代码还有很多这种没有参数的立即执行函数，但是有一些函数又没有这个立即执行函数，为了使代码更加相似，方便后续的还原，这里需要去掉这些立即执行函数，直接把所有的立即执行函数的函数内容抽出来就可以

![](https://attach.52pojie.cn/forum/202410/11/172455ve66sv7hav7ahbhe.png)

这时的代码一致性更加高，使得后续捕获特征更加容易了

![](https://attach.52pojie.cn/forum/202410/11/172457fpl45mlkeb3tbeye.png)

但是经过上面的操作，使得原本两层的switch变成了三层，函数结构貌似变得更加复杂了。如果可以把多层的switch全部变成一层，那么调试起来就方便多了，将在下一章继续讲解。
