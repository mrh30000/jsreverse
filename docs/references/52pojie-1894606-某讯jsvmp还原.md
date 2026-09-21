# 某讯jsvmp还原

> **作者**: userkey | **发布时间**: 2024-02-28 17:01:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2345 / 19
> **原文**: [https://www.52pojie.cn/thread-1894606-1-1.html](https://www.52pojie.cn/thread-1894606-1-1.html)

---

*本帖最后由 userkey 于 2024-2-28 21:57 编辑*

## 0x00序言

最近在学习某小程序逆向时，发现解包后的代码还被加固了，用的是名为tencent\_vm\_chaos的jsvmp。找了下网上之前的帖子，虽然有相关的分析，但都是2021年前的了，和目前的vmp差距有点大。而且都是针对滑块验证的调试分析，没有直接可用的脱壳工具（[论坛大佬的分析贴](https://www.52pojie.cn/thread-1521480-1-1.html)）。所以当时也就只能自己耐着性子调试vmp，手动脱壳。
过年前后闲了一阵，就想着试试写个脱壳器吧，给自己练练手。效果勉强凑合，不过没有在别的小程序上实验过，源码肯定也不让放出来，就分享一下思路吧。最终效果如下：
**jsvmp代码(部分)：**

![](https://attach.52pojie.cn/forum/202402/28/165333qyzmgt9gmb7qr98e.png)

**加固后代码：**

![](https://attach.52pojie.cn/forum/202402/28/165335av8tck66dnqlkjk6.png)

**脱壳后的ir：** （截图中是无敏感信息的函数，大意是对请求返回值进行json.parse）

![](https://attach.52pojie.cn/forum/202402/28/165355ghpcccyflhc7innc.png)

**ir还原的js：** （截图中是无敏感信息的函数，大意是对请求返回值进行json.parse）

![](https://attach.52pojie.cn/forum/202402/28/165357pzpporf7wipputw4.png)

大致思路还是传统办法，先顺序运行jsvmp，将字节码转译成ir（中间语言），再将中间语言还原成js源码。
ir转js估计有很多现成的第三方库，当时想着练手，这部分也就自己实现了，效果不是太好，最后一张图里也能看出，还是有部分多余代码，略微影响可读性。

## 0x01 vmp分析

跟踪该vmp的运行过程，大致可以分为三个步骤：

1. 给vmp输入参数

| 参数 | 意义 |
| --- | --- |
| 密文 | 源代码被处理成字节码再加密后的样子 |
| 起始字节码的index | vmp从哪个位置开始运行 |
| 原生对象、方法 | 包含Object、Console、require这类js的原生对象、方法，也包含getApp、wx这类小程序的原生方法。后续在vmp内通过属性名的方式动态访问。我们用SysObj代指吧 |
| 关键词数组 | 包含这个小程序会用到的所有js关键词，我们用name\_array代指吧。后续在vmp中通过数组下标取得，再结合SysObj，就可以做到用<br>`name = name_array[x];target = SysObj[name];`<br>来动态获取任意的原生对象、方法，而不需要显式调用。<br>这样做的目的是将五花八门的函数调用全都统一成一类字节码 |

![](https://attach.52pojie.cn/forum/202402/28/165340a7g7zg77peuop7jp.png)

2. 密文解密为字节码
   继续跟踪vmp函数，发现密文被传入后先进入函数i，函数i又会调用b、d、e、c等函数进行解密，最终解密得到的j变量就是字节码。

   ![](https://attach.52pojie.cn/forum/202402/28/165353pck1rc2clf9o1a1e.png)
3. vmp运行字节码
   与传统vmp一样，这里也是通过一个while(true)循环，不断累加字节码index，从字节码中获取opcode，switch到具体的opcode处理case。

## 0x02 something new

与传统vmp不同，在手动调试这个vmp时，发现个比较有意思的设计。看下面4个opcode处理case：

1. 这两个case明显可以用一种opcode处理，为什么要分成两种opcode？

   ![](https://attach.52pojie.cn/forum/202402/28/165359ev1zqz1h8qpovbv7.png)

   ![](https://attach.52pojie.cn/forum/202402/28/165401vy3wp9clwlwzagmw.png)
2. case4的第一行和case9一模一样，为什么不把case4拆成两条opcode？

   ![](https://attach.52pojie.cn/forum/202402/28/165404ewjxiitzwfpifw87.png)

   ![](https://attach.52pojie.cn/forum/202402/28/165406yu7edo5fdjjddudz.png)

   我猜开发者设计vmp时，为了避免攻击者直接针对性地开发脱壳工具，拿到密文，直接解出源码。有意将最原始的字节码做了随机分段，将多条opcode合并为1条新的opcode，这样每次产生的vmp都是不一样的，程序A的脱壳器就脱不了程序B的壳，必须再分析一遍程序B的vmp，写个脱壳器才行。图示如下：

   ![](https://attach.52pojie.cn/forum/202402/28/165337tkfxp8w759z9z9mc.jpg)

   一份源码，可以处理成两种不同的字节码，需要对应的vmp才能脱壳

## 0x03 脱壳器第一部分：获得ir

知道了运行原理，就能很容易的得到字节码和ir。大致伪代码如下：

```
new_ast = 新建个ast用于存储解析出来的ir代码
crypt_text = 获取__TENCENT_CHAOS_VM的第一个参数
index = 获取__TENCENT_CHAOS_VM返回后的第一个参数
decrypt_func = 获取字节码解密函数
bytecodes = decrypt_func(crypt_text)
case_map = {opcode: case} // 解析vmp的switch，获得每个case对应opcode的map
while(true){
    opcode = bytecodes[++index]
    case = case_map[opcode]
    for(case_code in case){ // 遍历处理case里的每条语句
        ast = deal(case_code) // 初步处理，得到ir的ast
    }
}
write(new_ast) // 把ast转化为ir，写入临时文件，后面继续分析
```

`deal(case_code)`，如何处理case里的语句，这里举几个简单的例子:

1. 无条件跳转`k += j[++k]`：
   使opcode指针`k`加上当前opcode值`j[++k]`。我们可以直接计算出`k += j[++k]`，这就是下一个opcode的地址，在ir里简单记为`br xxxx`
2. 条件跳转`k += l[j[++k]] ? j[++k] : j[(++k, ++k)]`：
   如果`l[j[++k]]`为true，跳转`k+=j[++k]`, 否则跳转`k+=j[(++k, ++k)]`，由上面的例子，这个就好处理了，ir里简单记为`condbr aaa ? xxx : yyy`
3. 函数调用

   ```
   n = [];
   for (o = j[++k]; o > 0; o--) n.push(l[j[++k]]);
   l[j[++k]] = b(k + j[++k], n, e, h, i);
   ```

   遇到这三句，就不能拆成一句一句处理。这三句代表将参数存入数组`n`，传入vmp自身函数`b`，递归调用vmp去执行`k + j[++k]`下标的语句。
   我们可以在ir中定义一个函数，计算`k + j[++k]`得到该函数的入口语句下标xxx，函数名就定义为`func_xxx`

## 0x04 脱壳器第二部分：还原js代码

得到ir后，按照正常的套路，根据跳转还原条件分支和循环、简化取值操作、简化常量等等操作就能得到一般人可以看的js代码了（说的很简单，其实这才是最难的部分）。但在还原条件分支时，又遇到了一点问题，具体看一个例子，ir代码（已删除所有业务逻辑，只保留跳转）如下：

![](https://attach.52pojie.cn/forum/202402/28/165408vbfsijjbh5ssvyaq.png)

根据条件跳转condbr和直接跳转br，我们可以把这段代码拆成一个个block，用来构建cfg（控制流图），cfg如下图所示，每个block用该block第一条语句的字节码index表示：

![](https://attach.52pojie.cn/forum/202402/28/165410gzfrehlmodmzllok.png)

可以清楚看到5394这个block最后一句应该是ifelse条件分支，true就走5697，false就走208。但是5697和208这两个分支的走向居然是一样的，true都走6491，false都走4758。如果尝试把他表述成伪代码：

```
// 5394
if(){
   // 5697
   if(){
      // 6491
   }else{
      // 4758
   }
}else{
   // 208
   if(){
      // 6491
   }else{
      // 4758
   }
}
```

就会出现重复的代码块，导致还原的js代码异常冗余。我猜测开发者把所有的&&条件和||条件都拆成了单独的条件分支，在vmp代码中也没找到&&运算和||运算，也侧面印证了这个想法。将上面的代码按这个思路还原的话，应该是这样：

```
// 5394
// 得到条件a
// 5697
// 得到条件b
if(a && b){
   // 6491
}else{
   // 4758
}
```

block 208作为重复的花指令被舍弃，还原的代码就正常多了。
但是也还有一点小瑕疵，a&&b如果a为false，b就不应该被计算，意味着block 5697不应该提前运行，这里图方便就懒得改进了。

## 0x05 最后

最终代码只能说勉强能看，和ida的F5相比还是差距很大，还有很多的细节改进需要依靠系统性得学习程序分析。
