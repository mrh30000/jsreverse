# reese84 及_utmvc 逆向流程分析

> **作者**: hybpjx | **发布时间**: 2024-04-12 12:35:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 9837 / 12
> **原文**: [https://www.52pojie.cn/thread-1912763-1-1.html](https://www.52pojie.cn/thread-1912763-1-1.html)

---

## 声明

本文章中所有内容仅供学习交流，抓包内容、敏感网址、数据接口均已做脱敏处理，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关，若有侵权，请联系我立即删除！

## 目标网站

> aHR0cHM6Ly93d3cuZmx5c2Nvb3QuY29tL3po

## 前言

随便搞搞。。自己也是一知半解的。这里做个记录。

这里主要搞一下 \_\_\_utmvc 和 reese84的cookie流程分析

## \_\_\_utmvc

### 生成详解

对了 很多网站还附带一个\_\_\_utmvc cookie的生成。流程这里在前言讲一下。

如下图 抛给一个这样的js。 然后我们把z 给复制出来。

![](https://attach.52pojie.cn/forum/202410/12/161206joqcuc2bkkmk6vqv.png)

![](https://attach.52pojie.cn/forum/202410/12/161208e8lg2lgxjyy11jxf.png)

然后是一段ob。给他解出来。用ast去解就行了。

so easy 这里写下部分代码（本人也不太会 大佬勿喷）。

首先是是字符串解码

```
function decry_str(ast) {
    traverse(ast, {
        'StringLiteral|NumericLiteral|DirectiveLiteral'(path) {
            delete path.node.extra;
        },
    });
    return ast;
}
```

其次合并大数组 完成大数组解密

不通用。改下name就行。反正就一个数组需要eval

```
const callToString = {
    CallExpression(path) {
        let {callee, arguments} = path.node;
        if (!types.isIdentifier(callee, {"name": "_0x5764"})) {
            return;
        }
            // 这里可以加下字面量判定

        let value = eval(path.toString());
        path.replaceWith(types.valueToNode(value))
    }
}
```

到这一步已经解的差不多了。还有一些函数的还原的ast

等全部解混淆之后，难度就低很多了。找到cookie生成的地方 慢慢扣吧。

有些变量需要动态替换。

最后生成 \_\_utmv

![](https://attach.52pojie.cn/forum/202410/12/161210hx5ixpf5z010i0w5.png)

## reese84

### 生成逻辑分析

这里有很多小伙伴好奇什么是reese84，其实简言之就是个cookie。

只有带着这个cookie才能去请求页面。

如下图所示

![](https://attach.52pojie.cn/forum/202410/12/161213l4ooemv5fomh6m55.png)

那这个值怎么得到的。

靠hook是不行的。这个值是从接口返回的。

重新刷新页面 `ctrl+F5`

然后过滤链接 直接搜索`g-Then-And-meeting-beding` 然后发现有两个链接。

![](https://attach.52pojie.cn/forum/202410/12/161215gmgb9v0mnw11g0k1.png)

如上图两个链接 带上d=的 就是这个reese84的值生成地方。

![](https://attach.52pojie.cn/forum/202410/12/161217zgmdr7y957vpjsvj.png)

而这个负载里面的东西就是我们所要逆向的值了。

![](https://attach.52pojie.cn/forum/202410/12/161219e4yyy6kawr9wwt09.png)

可以看到 这个p 有很多信息啊。

而这个p 就是上个 **..-Quarre-allowt-** 这个请求生成的地方。

### 流程分析

其实像这种呢 就需要ast的知识去脱他的混淆了。

当然也可以不考ast。直接打断点慢慢跟也行 就是麻烦了点。

这里我就不写跟栈具体流程了。

这里直接告诉大家定位点： invokeTask 方法入栈。

直接搜索如下代码

```
return this._invokeTaskZS ? this._invokeTaskZS.onInvokeTask(this._invokeTaskDlgt, this._invokeTaskCurrZone, t, e, n, r) : e.callback.apply(n, r)
```

这里重新打开无痕。然后搜索这个代码。

断点打在 `e.callback.apply(n, r)`上。

然后跳大概5个栈吧。进到这个（字母）\<computed>的下一个匿名栈。

![](https://attach.52pojie.cn/forum/202410/12/161221ko6r6yro262xxv6x.png)

然后就到达生成算法的地方了。

![](https://attach.52pojie.cn/forum/202410/12/161223o1f8hdfb1bfrp5bn.png)

找到这个地方 好了。你已经有了挑战这个的入门券了。

### 扣代码分析

断点断到这个地方。

![](https://attach.52pojie.cn/forum/202410/12/161225kyw4m7q51owm8or4.png)

然后我们进栈。

这里先别忙着去单步调试。

看看这个 `NV`是什么鬼东西。

可以看到这个 `NV` 是由19个方法构成的应该数组Arry

![](https://attach.52pojie.cn/forum/202410/12/161227ipaargygxyamoaig.png)

然后我们看看下面的代码。

```
CN[wm.substr(1613, 13)](wm.substr(234, 1) + Dp9);
MN9();
CN[wm.substr(1694, 12)](wm.substr(234, 1) + Dp9);
Dp9 += 1;
window[qO.substr(1498, 10)](te1, 0);
```

明显是 上层执行循环 每次循环往一个大数组里加值 然后最后通过编码重新生成一个值。

最后这个值再经过加密 生成上文 大本文的 `p`

这里先进几个栈看看。

这里重点关注一下 最外层的这个Hw

![](https://attach.52pojie.cn/forum/202410/12/161229nw0m1lw9w1bwmj11.png)

这里发现

![](https://attach.52pojie.cn/forum/202410/12/161231gumuu1mczuj8jjo1.png)

然后就发现 进到这19个方法里面。

把这19个方法全扣下来。

![](https://attach.52pojie.cn/forum/202410/12/161233mer1lrprr9sjqi6r.png)

最后搜索一下这个 `window.JSON.stringify(Hw` 看看 最后反序列化的地方在哪。

找到这个地方。发现也进行了很多处理。

![](https://attach.52pojie.cn/forum/202410/12/161235kh4pzwjuf9fj3hlp.png)

最后经过了一层base64加密

![](https://attach.52pojie.cn/forum/202410/12/161237pwo2mbdlw725hdlw.png)

最终结果 就拿到了这个p。 可以自己去对比一下

![](https://attach.52pojie.cn/forum/202410/12/161239cqfha9y9dfk9f5zz.png)
