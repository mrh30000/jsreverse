# Tk-验证码hashcash之answer参数详解

> **作者**: li083m | **发布时间**: 2025-05-15 20:20:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4317 / 13
> **原文**: [https://www.52pojie.cn/thread-2031712-1-1.html](https://www.52pojie.cn/thread-2031712-1-1.html)

---

*本帖最后由 li083m 于 2025-5-15 20:57 编辑*

### 前言

在游客状态下，访问用户主页，可能会有概率触发hashcash的旋转类型滑块，他与旋转(whirl)稍微不同，多了一个answer的函数，其他轨迹和参数值大致相同，此处分析answer参数，根据堆栈下断，最后得知是由jsvmp实现。

### 分析

千篇一律的，函数调用处(apply,call)插桩和运算符 `+ - * / % ^ * >> <<` 处插桩。

示例如下:

`"对象E: ", JSON.stringify(E,function(k, v) {if (v === window) {return 'window'} return v}), "函数w: ", w.toString(), "参数_: ", JSON.stringify(_,function(k, v) {if (v === window) {return 'window'} return v}), "结果k: ", k`

`'p[d]',p[d] ,'+=' ,'t',t`

将日志保存下来，随后观察日志发现

![image-20250515193956579](https://image.3001.net/images/20250515/1747309200_6825d2903ead4050711db.png)

发现首先创建了 `[0,0,0,0,0,0,0,0]`
然后 看到了一个 关键 `3773868340 >>> n 24  = 224`
接着 生成了8个随机数  `随机数*  9007199254740992(固定值) *=7147027398806892`接着调用取整函数`floor()`
最后在 `7147027398806892 %= 52(固定值) = 12`
下面逻辑也是同上。

对于上述固定值的结论，我们这里最好的是打印一份相同的日志，看看是否真的是一样的值，对比发现，是一样的，所以我们可以大胆确定就是固定的。也是最简单粗暴的方法了。

现在已知的得到了，未知的是什么呢，`3773868340?`
这里不卖官子，实际上这个值是get请求包中的`["data"]["challenges"][1]["question"]["stamp"]`值。

既然有数组中有8个元素，自然也是8次运算结果,最后得到了一个新的数组，且称为数组1.

`["data"]["challenges"][1]["question"]prefix` 且称为时间戳。

现在得到

```
数组1 = [12,4,44,23,33,28,12,51]
时间戳 = 1747284377
stamp = 3773868340
临界值=  stamp >>>  24 = 224
```

继续观察日志

![image-20250515195501570](https://image.3001.net/images/20250515/1747310102_6825d616a50b2da7ae3f6.png)

`码表 ="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"`
根据上面数组1 map 取 charAt 后得到 meSxHCmZ 这个值
然后在拼接时间戳得到 1747284377meSxHCmZ 现在经过一个匿名函数 得到 1192275636
这里直接去搜索然后把js抠出来即可。具体给出

```
const chars = currentArray.map(index => alphabet.charAt(index)).join('');
```

接着继续观察日志

![image-20250515200116145](https://image.3001.net/images/20250515/1747310477_6825d78d3931044756792.png)

```
现在根据 1192275636来观察
第一步
1192275636 >>>  24 = 71  24位固定值
71 ^  224 = 167  224是上述临界值 167结果无用，后续经过了一个log2函数，发现没用用到结果，暂时当作临界值判断。
现在取出 数组1第一位 12
12 +=  1 = 13    1为固定值
13 %= t 52 = 13  52为固定值
现在得到13 ,然后替换列表第一位得到一个新数组2

数组2 = [13,4,44,23,33,28,12,51] 接着继续浏览日志

发现数组2的操作同上,先是数组2 map后码表charAt后,得到 neSxHCmZ 拼接时间戳  1747284377neSxHCmZ 进入hashFunction得到  -912283305

-912283305 >>> 24 = 201  24位固定值
201 ^ 224 = 41  171是上述临界值
现在取出 数组2第一位 13
13 +=  1 = 14 1位固定值
14 %= t 52 = 14
```

发现接下来还说相同操作,这时候我们就要考虑,什么时候或者说符合什么样的条件才会让这个循环停止，这次我们倒推一下日志。

![image-20250515200836683](https://image.3001.net/images/20250515/1747310917_6825d945ce349762990b3.png)

我们发现两处重要运算

`-525809933 >>> 24= 224`

`224 ^ n 224 = 1`

根据上面的结论可以知道,当结果与匿名函数运算结果`>>> 24` 的结果与 临界值相等时,停止运算,且码表`charAt`的最后一轮拼接时间戳即为最后的结果。

和一个关键数组

`[10,7,44,23,33,28,12,51]`

发现他与数组2 `[13,4,44,23,33,28,12,51]`的不同是前2位,所以我们继续倒推

![image-20250515205329142](https://image.3001.net/images/20250515/1747313610_6825e3ca069914121e8ca.png)

发现当数组的第一位 等于 52 时候

即`[51,6,44,23,33,28,12,51]`第一位清0 即`[0,7,44,23,33,28,12,51]`

然后数组第二位加1  即`[1,7,44,23,33,28,12,51`然后继续重复运算。

理清楚上述逻辑，交给gpt完成代码。

![image-20250515151607512](https://image.3001.net/images/20250515/1747293368_682594b82ce03645bc279.png)

### 结果

![image-20250515201648497](https://image.3001.net/images/20250515/1747311410_6825db322353afea43823.png)

滑块结果

![image-20250515154719946](https://image.3001.net/images/20250515/1747295244_68259c0cd6e56b469aec3.png)

### 代码

```
/*
hashFunction 为匿名函数，希望各位小宝能够自己动手实现一下，也不枉费我写文章的目的，就不提供出来了。
*/

const timestamp = 1747291859;
const stamp = 1629880938;
function answer(timestamp, stamp) {
    const initialArray = [34,1,43,16,23,43,50,38];
    const critical = stamp >>> 24;
    const t = 52;
    let currentArray = [...initialArray];
    const alphabet = 'abcdefghijxxxxx(脱敏)xxxxxxNOPQRSTUVWXYZ';

    while (true) {
        // 生成当前字符串
        const chars = currentArray.map(index => alphabet.charAt(index)).join('');
        const str = String(timestamp) + chars;
        const hash = hashFunction(str);
        // 检查是否满足终止条件
        if ((hash >>> 24) === critical) {
            return chars;
        }
        // 递增数组（进位逻辑）
        let i = 0;
        while (i < currentArray.length) {
            currentArray[i] = (currentArray[i] + 1) % t;
            if (currentArray[i] !== 0) {
                break;
            }
            i++;
        }
    }
}
const result = answer(timestamp, stamp);
console.log(timestamp+result);
```
