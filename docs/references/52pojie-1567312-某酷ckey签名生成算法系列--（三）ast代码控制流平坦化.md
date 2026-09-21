# 某酷ckey签名生成算法系列-（三）ast代码控制流平坦化

> **作者**: 漁滒 | **发布时间**: 2021-12-26 13:39:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5828 / 9
> **原文**: [https://www.52pojie.cn/thread-1567312-1-1.html](https://www.52pojie.cn/thread-1567312-1-1.html)

---

@[TOC](https://www.52pojie.cn/%E6%9F%90%E9%85%B7ckey%E7%AD%BE%E5%90%8D%E7%94%9F%E6%88%90%E7%AE%97%E6%B3%95%E7%B3%BB%E5%88%97--%EF%BC%88%E4%B8%89%EF%BC%89ast%E4%BB%A3%E7%A0%81%E6%8E%A7%E5%88%B6%E6%B5%81%E5%B9%B3%E5%9D%A6%E5%8C%96)

![](https://attach.52pojie.cn/forum/202410/11/172644trt90yl64elyd407.png)

观察三个switch的值分别是Ci、mi和Ai。而这三个值又因为li的确定而确定的。也就是说已知li的值，就可以分别计算出Ci、mi和Ai，就可以确定执行的是哪一条语句。那么反过来，如果已知Ci、mi和Ai三个值，也可以反向计算出li的值了。

那么按照这个思路。就可以把多重的case的值计算出其对应最上一层的值，变成最简单的switch结构，形如下面

```
******省略代码******
for (var li = 16996; void 0 !== li;) {
    var Ci = 31 & li,
        fi = li >> 5,
        mi = 31 & fi,
        bi = fi >> 5,
        Ai = 31 & bi;

    switch (Ci) {
      case 0:
        switch (mi) {
          case 0:
            switch (Ai) {
              case 0:
                Dn.push(0), li = 11522;
                break;
              case 1:
                L = mo, li = 24641;
                break;
******省略代码******
```

上面这样的代码，应该被压缩成下面

```
******省略代码******
for (var li = 16996; void 0 !== li;) {
        switch (li) {
              case 0:
                Dn.push(0), li = 11522;
                break;

              case 1024:
                L = mo, li = 24641;
                break;
******省略代码******
```

使得原来需要处理三个变量的结构，直接变成只需要处理一个变量，调试上去会变得简单很多。

![](https://attach.52pojie.cn/forum/202410/11/172646aw5bfwzszwwz11yl.png)

接着下来调试发现，一条语句里面是一个逗号表达式，一次就执行完了，没有办法一句一句的分析，所以想把这些逗号表达式都分开，更加清晰的来分析

![](https://attach.52pojie.cn/forum/202410/11/172648xuf3j2muzafzmyjt.png)

这里用蔡老板的代码直接搞定，这一步相对是简单的，就不太详细说了，看看效果对比

![](https://attach.52pojie.cn/forum/202410/11/172650t9qcy9cvqxqv94z9.png)

此时可以看到，所有的逗号表达式都变成了一条一条的语句了，为后面的去除控制流平坦化提供了可能。

这时即使调试代码，依然会发现运行过程中，代码一直上下跳转，而不是从上往下的执行，需要想办法把这种跳来跳去的情况去除。

![](https://attach.52pojie.cn/forum/202410/11/172652bt02266tbohct6tt.png)

仔细观察可以发现，每一个case的最后一句，总是指向他的下一个case，那么如果把每一个case，按照这样拼接起来，那么函数执行的时候，不就不会再跳来跳去的了

```
******省略代码******
  case 0:
        Dn.push(0);
        li = 11522;
        break;
******省略代码******
```

拼接一次变成

```
******省略代码******
  case 0:
        Dn.push(0);
        li = z ? 8833 : 15362;
        break;

******省略代码******
```

经过非常多次拼接后，使得每一个switch仅仅只有一个case。

![](https://attach.52pojie.cn/forum/202410/11/172654sj3imhqif7mkch4f.png)

switch中只有一个case，不是相当于没有这个结构吗，最后直接去掉这个switch结构，仅仅保留函数内容

![](https://attach.52pojie.cn/forum/202410/11/172656dvfimprqmpdp6gpz.png)

这个时候控制流平坦化已经去除完成，整个代码已经是从上往下的执行了。但是代码中的字符串还是被混淆的，形如下面。下一章尝试还原这些字符串

![](https://attach.52pojie.cn/forum/202410/11/172658himwib1jzw1ii1tn.png)
