# 某程token  jsvmp算法分析

> **作者**: q8917749 | **发布时间**: 2025-05-28 23:18:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 6536 / 22
> **原文**: [https://www.52pojie.cn/thread-2034891-1-1.html](https://www.52pojie.cn/thread-2034891-1-1.html)

---

**接口:  batchSearch?
目标参数：token**

**1.插桩apply函数**
一路调试 ， 定位到加密参数生成的位置

![](https://attach.52pojie.cn/forum/202505/28/144055zdtft5fwtv95x5ry.jpg)

进去后调试跟个几步发现是个VMP
既然是个VMP  第一步直接无脑插桩**apply函数**即可，目的是分析大致流程

排除用于函数绑定的apply，需要插桩的就这一处

![](https://attach.52pojie.cn/forum/202505/28/145338k722yjrsrabj2skh.png)

把代码重写一下方便打印

[JavaScript] *纯文本查看*

```

var applyThis = "undefined" == typeof h._unknown_cb2b9 ? _unknown_4ba74 : h._unknown_cb2b9;

console.log('[DEBUG] i:', i, '| thisArg:', applyThis, '| args:', g)                var applyReturn = i.apply(applyThis, g);
console.log('[return] i:', i, '| thisArg:', applyThis, '| args:', g, "i.apply() returned:", applyReturn);
```

日志大概一万多行
一开始代码 提取了时间戳 UA等参数 ，又随机了一个UUID

然后来到第一处加密的地方

![](https://attach.52pojie.cn/forum/202505/28/151432viimv1oozjxx1zxe.jpg)

可以看到加密参数就是 时间戳+UA+UUID
看到第一个函数返回值是一个数组，估计就是分块后的结果，末尾一个1288，看样子像是长度，把长度放在末尾的，大概就是个hash算法了
然后往下看
[1732584201, 4023233415, 2562383102, 271733878, 942946097, 7, 3614090360]
变为16进制 也就是
[0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0x38514731, 7, 0xD76AA478]
有经验的小伙伴可以一眼看出这是个MD5算法了吧 ，并且魔改了几个数
当然看不出的也可以把这些特征值一个一个拿去谷歌搜

去网上找个js版的MD5算法抠下来
照着日志检查一下特征数
然后改一改，最后发现魔改的不多，改一下这个就行了

[JavaScript] *纯文本查看*

```
    //原版:
    // var a = 1732584193
    // var b = -271733879
    // var c = -1732584194
    // var d = 271733878

    var a = 1732584201
    var b = 4023233415
    var c = 2562383102
    var d = 271733878
```

接下来就是对
加密后的sign
时间戳
""（空字符串）
cookie的\_bfa中的部分值
以及uuid

进行前面拼3个字符 后面拼3个字符的操作
如图：

![](https://attach.52pojie.cn/forum/202505/28/160331cuustolxgmmmas2d.jpg)

那么这三个字符哪里来的呢
根据日志看到 是同个Math.random 然后再经过某个运算 得到一个数 再fromcharcode得到的字符
那这个某种运算 是什么呢？先不急，我们现在先分析整体流程，等接下来分析 具体运算的时候再看
往下走

![](https://attach.52pojie.cn/forum/202505/28/161823o0286ck6v8b8cggm.png)

可以看到 canavas  还调用了 toDataURL
这很明显是在获取设备指纹
然后对着canavas生成的图片数据进行base64解码

解码完成后
得到一个3a2d7925  然后再对这个生成的字符串  进行前面拼3个字符 后面拼3个字符的操作
可以合理怀疑 3a2d7925  是一个canavas 的指纹
经过多次打印 发现结果不变，加入一点canavas噪音，发现结果改变，基本确定这是canavas 的指纹

随后还对以下字符进行  前面拼3个字符 后面拼3个字符的操作"24" // 固定值,猜测屏幕颜色深度
Win32'// navigator.platform
-480' // 时区
"zh-CN" // navigator.language
"1536x864"// 屏幕尺寸大小
"1536x816"//  减去浏览器上边缘后的尺寸

最后将所有拼接结果  （包括MD5的结果 时间戳 uuid等）  全部拼接起来  用#分割 得到一大串字符 作为明文
然后不停的对明文的每个字符编码进行parseint

然后就到了最后密文生成的地方

![](https://attach.52pojie.cn/forum/202505/28/173038mxcwesyu0demexes.png)

上面的红色是已知的地方
蓝色的就是未知的地方
[120, 'o084z.....................] returned: 8T
['eIrWRYiEJwyjvxK', 8]   returned: J

这个8T 和J 就是用于最后 拼接密文的字符

120 就是上面那一大串明文 的第一个字符编码
然后对着 每个明文的字符编码  做类似上图的操作

现在需要搞清楚

['S9mHXtfaMsZ6DNkgTnL5F0dzpb1lPAocQ8BGh47UqO3', 9]  的9是哪来的

['eIrWRYiEJwyjvxK', 8] 的8是哪来的

***2.插桩具体运算***
VMP要搞清楚具体运算
最重要的是要找到 加减乘除异或等操作
当你找到这些操作之后  找到这些操作的 参数以及返回结果 的必经之路  在这里插桩即可

比如在这里 我直接搜^符号就能找到 异或操作的位置

![](https://attach.52pojie.cn/forum/202505/28/203716rgqogd9udo8tuup9.png)

可以看到无论是异或还是下面的减法操作
运算的参数都是  \_unknown\_ef9cb 的返回值
运算的结果 都是 \_unknown\_86876的第一个参数
我们只需要在  \_unknown\_ef9cb  和 \_unknown\_86876 插桩
就能打印每一个小操作的 参数和返回值

为了防止卡顿  我们先断在某个合适的 apply函数执行完毕之后 再插桩
回顾一下
第一个问题：['S9mHXtfaMsZ6DNkgTnL5F0dzpb1lPAocQ8BGh47UqO3', 9]  的9是哪来的

![](https://attach.52pojie.cn/forum/202505/28/204948rq5zt5uzs01oudy5.jpg)

当我们添加新的插桩点的时候 现在变成了
['S9mHXtfaMsZ6DNkgTnL5F0dzpb1lPAocQ8BGh47UqO3', 8]
与第一次插桩时候不同的地方在于 9变成了8

究其原因，加密的时间不同 随机数也不同 ，random的uuid也不同 得到不同的值情有可原
不管是8是9  我们就观察一下这第二个参数怎么来的吧

我们观察这个8最近出现的地方
arg 13983  arg 43   result 8

我们的插桩已经细化到了每一个加减乘除异或等操作的 参数以及返回值，从13983 和43 得到8  只经过了一个运算
显然13983%43=8
然后43是一个突然出现的值，多次打印的结果一样，可以认为是一个固定值

那么13983是哪来的呢？ 往上看arg 13889  arg 94  result 13983
显然13889+94=13983
那么13983是一个累加值，同理往上看13889也是一个累加得到的值

回想之前对明文的每个字符编码进行parseInt，猜想 这就是明文的累加值吧

那么94应该就是明文最后一个字符的charcode得到的结果 ，果然 明文的最后一个字符编码正是94

![](https://attach.52pojie.cn/forum/202505/28/211125kejzfeuj11ulf8fz.png)

但是最后将明文的字编码所有的值都相加，发现结果不对 ，那只能继续翻看日志查找问题了
最后定位到问题  存在一个100+i 干扰了累加

[JavaScript] *纯文本查看*

```
let sum = 0;
for (let i = 0; i < input.length; i++) {
    sum += input.charCodeAt(i) > 100 + i
        ? input.charCodeAt(i) - 100 - i
        : input.charCodeAt(i);
}
```

那么我们成功解决了第一个问题
['S9mHXtfaMsZ6DNkgTnL5F0dzpb1lPAocQ8BGh47UqO3', 8]
8=sum % 43

回到第二个问题
['eIrWRYiEJwyjvxK', arg1] 的arg1是哪来的
这个很简单  我用a,b,c,d作为变量名说一下吧
arg1=a%15
往上跟a=b%d  总结归纳
b是input*(明文取的值)
d=c+i (i是明文索引)， c怎么说呢 来张图吧  ，
c是上一步得的值    ，c就是图中 绿颜色的那个中间值

![](https://attach.52pojie.cn/forum/202505/28/230434szjd51h2s5uipeic.jpg)

然后就是不停的循环，最后得出密文

还有一个地方 ，就是拼三个字符那里 跟随机数有什么关系 ，这个不重要，因为随机数 经过某些运算得出的终究也是个随机数，按感觉控制下范围直接写成随机数也都可以
具体分析方法跟上面类似 就直接告诉答案了
randomcharcode =String.fromCharCode(math.ceil(math.random()\*94)+36)

**验证结果**
最后hook 一下 math.random  crypto.randomUUID  以及时间戳 把随机值控制成固定值
确保 自己写的代码跟 浏览器环境执行的结果一样即可*
