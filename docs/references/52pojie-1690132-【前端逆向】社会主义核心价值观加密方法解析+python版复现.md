# 【前端逆向】社会主义核心价值观加密方法解析+python版复现

> **作者**: hans7 | **发布时间**: 2022-09-20 01:30:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8427 / 35
> **原文**: [https://www.52pojie.cn/thread-1690132-1-1.html](https://www.52pojie.cn/thread-1690132-1-1.html)

---

*本帖最后由 hans7 于 2022-9-20 01:36 编辑*

#### 引言

偶然发现了一种有趣的编码方法，这种方法的特点是：一个明文可能得到多个密文，但一个密文可以得到唯一的明文。于是我们希望把这种方法学会，并用python复现。我们要逆的网站：<http://z.duoluosb.com/> ，该网站没有特意做反调试，可以说难度很小。

**作者：[hans774882968](https://blog.csdn.net/hans774882968)以及[hans774882968](https://juejin.cn/user/1464964842528888)以及[hans774882968](https://www.52pojie.cn/home.php?mod=space&uid=1906177)**

本文52pojie：<https://www.52pojie.cn//thread-1690132-1-1.html>

本文juejin：<https://juejin.cn/post/7145144041741500447/>

本文csdn：<https://blog.csdn.net/hans774882968/article/details/126945146>

#### 本文主要工作

去看一下按钮绑定的click事件，并打下断点，很容易就能定位这些函数：

```
a.shzyhxjzgEncode = function(t) {
    return o(k(h(t)))
}

function h(t) {
    var u = /[A-Za-z0-9\-\_\.\!\~\*\'\(\)]/g
      , w = t.replace(u, function(z) {
        return z.codePointAt(0).toString(16)
    })
      , x = encodeURIComponent(w)
      , y = x.replace(/%/g, '').toUpperCase();
    return y
}

function k(t) {
    f('string' == typeof t);
    var u = []
      , _iteratorNormalCompletion2 = !0
      , _didIteratorError2 = !1
      , _iteratorError2 = void 0;
    try {
        for (var x, w = t[Symbol.iterator](); !(_iteratorNormalCompletion2 = (x = w.next()).done); _iteratorNormalCompletion2 = !0) {
            var y = x.value
              , z = Number.parseInt(y, 16);
            10 > z ? u.push(z) : g() ? (u.push(10),
            u.push(z - 10)) : (u.push(11),
            u.push(z - 6))
        }
    } catch (A) {
        _didIteratorError2 = !0,
        _iteratorError2 = A
    } finally {
        try {
            !_iteratorNormalCompletion2 && w.return && w.return()
        } finally {
            if (_didIteratorError2)
                throw _iteratorError2
        }
    }
    return u
}

function g() {
    return 0.5 <= Math.random()
}

// p = '富强民主文明和谐自由平等公正法治爱国敬业诚信友善'
function o(t) {
    return t.map(function(u) {
        return p[2 * u] + p[2 * u + 1]
    }).join('')
}

// h('这里输入明文') = E8BF99E9878CE8BE93E585A5E6988EE69687
```

这里catch块和finally块的内容都不是我们需要关注的。

`o`和`h`都不难。说说`k`。对于`10 <= v < 16`，`v - 10`和`v - 6`都小于10，所以解码时，读到10和11，我们可以借鉴汇编的概念，认为这是一个”opcode”，有唯一的解码方式。因此我们可以在这里加上一个巧妙的随机化，即`g`函数，于是一个明文可以得到多个密文，但一个密文对应唯一的明文。

接下来看怎么decode。后两步都是小模拟，我们只看看第一步的`h`函数：

```
    function j(t) {
        f('string' == typeof t, 'utfs Error');
        var u = t.length;
        f(0 == (1 & u));
        for (var w = [], x = 0; x < u; x++)
            0 == (1 & x) && w.push('%'),
            w.push(t[x]);
        return decodeURIComponent(w.join(''))
    }
```

为16进制串加上`'%'`再调用`decodeURIComponent`即可。

#### 完整代码

1. 根据参考链接1，`decodeURIComponent`和`encodeURIComponent`分别对应`urllib.parse.unquote`和`urllib.parse.quote`。

##### 编码

enc.py

```
from typing import List
from urllib import parse
import random
import re

def step3(inp: List[int]) -> str:
    VALUE = '富强民主文明和谐自由平等公正法治爱国敬业诚信友善'
    return ''.join(list(map(lambda v: VALUE[v << 1] + VALUE[v << 1 | 1], inp)))

def step2(inp: str) -> List[int]:
    ans = []
    for c in inp:
        v = int(c, 16)
        if v < 10:
            ans.append(v)
        elif random.random() < 0.5:
            ans.append(11)
            ans.append(v - 6)
        else:
            ans.append(10)
            ans.append(v - 10)
    return ans

def step1(inp: str) -> str:
    reg = re.compile(r'[A-Za-z0-9\-\_\.\!\~\*\'\(\)]')
    tmp = reg.sub(lambda g: hex(ord(g.group(0)))[2:], inp)
    return parse.quote(tmp).replace('%', '').upper()

def enc(inp: str) -> str:
    return step3(step2(step1(inp)))

if __name__ == '__main__':
    inps = [
        '全文搜索Hans774882968', '愛してます', '这里输入明文',
        'x64dbg\nIDA7.7\nuser', '%e', '我知道，我是一个美男子！'
    ]
    for inp in inps:
        e = enc(inp)
        print(e)
        from dec import dec
        d = dec(e)
        assert d == inp
```

##### 解码

dec.py

```
from typing import List
from urllib import parse

def step3(enc: str) -> List[int]:
    assert len(enc) % 2 == 0
    VALUE = '富强民主文明和谐自由平等公正法治爱国敬业诚信友善'
    ans = []
    for i in range(0, len(enc), 2):
        ans.append(VALUE.index(enc[i:i + 2]) >> 1)
    return ans

def step2(enc: List[int]) -> str:
    ans = ''
    i = 0
    while i < len(enc):
        if enc[i] < 10:
            ans += str(enc[i])
            i += 1
        elif enc[i] == 10:
            ans += hex(enc[i + 1] + 10)[2:]
            i += 2
        elif enc[i] == 11:
            ans += hex(enc[i + 1] + 6)[2:]
            i += 2
        else:
            raise f'step2 failed. 不合法数据{enc}'
    return ans

def step1(enc: str) -> str:
    tmp = ''
    for i in range(len(enc)):
        if not i % 2:
            tmp += '%'
        tmp += enc[i]
    return parse.unquote(tmp)

def dec(enc: str) -> str:
    return step1(step2(step3(enc)))

def test1():
    ans = step2([
        11, 8, 8, 10, 1, 11, 9, 9, 9, 11, 8, 9, 8, 7, 8, 10, 2,
        11, 8, 8, 10, 1, 10, 4, 9, 3, 11, 8, 5, 8, 5, 10, 0, 5,
        10, 4, 6, 9, 8, 8, 10, 4, 11, 8, 6, 9, 6, 8, 7
    ])
    assert ans == 'e8bf99e9878ce8be93e585a5e6988ee69687'
    ans = step1(ans)
    assert ans == '这里输入明文'

def test2():
    encs = [
        '友善爱国爱国诚信民主友善敬业敬业敬业诚信自由敬业爱国法治爱国诚信文明诚信自由爱国诚信民主诚信自由敬业和谐诚信自由平等爱国平等诚信富强平等诚信自由公正敬业爱国爱国诚信自由友善爱国公正敬业公正爱国法治',
        '诚信自由爱国诚信民主友善敬业敬业敬业友善爱国敬业爱国法治爱国友善公正友善爱国爱国诚信民主友善爱国敬业和谐友善爱国平等爱国平等友善自由平等友善爱国公正敬业爱国爱国友善爱国诚信自由公正敬业公正爱国法治']
    for enc in encs:
        assert dec(enc) == '这里输入明文'

def test3():
    encs = [
        '公正爱国公正民主公正友善爱国法治和谐文明富强公正民主公正和谐公正友善法治公正平等法治文明',
        '公正爱国公正民主公正诚信自由法治和谐文明富强公正民主公正和谐公正友善法治公正平等法治文明'
    ]
    for enc in encs:
        assert dec(enc) == 'hans acmer'

def test4():
    encs = [
        '友善爱国公正爱国爱国敬业民主友善爱国公正敬业爱国友善自由诚信平等公正爱国公正民主公正友善爱国法治和谐和谐法治和谐法治和谐自由和谐爱国和谐爱国和谐文明和谐敬业和谐公正和谐爱国',
        '友善爱国公正爱国爱国敬业民主友善爱国公正敬业爱国友善自由友善敬业公正爱国公正民主公正诚信自由法治和谐和谐法治和谐法治和谐自由和谐爱国和谐爱国和谐文明和谐敬业和谐公正和谐爱国']
    for enc in encs:
        assert dec(enc) == '我是hans774882968'

def test5():
    encs = [
        '友善爱国公正爱国自由敬业诚信民主友善爱国和谐爱国民主敬业法治诚信自由和谐爱国民主诚信富强公正诚信自由和谐爱国民主友善平等诚信自由友善爱国和谐爱国民主敬业敬业',
        '诚信自由公正爱国自由敬业诚信民主友善爱国和谐爱国民主敬业法治诚信自由和谐爱国民主诚信富强公正友善爱国和谐爱国民主友善平等友善爱国诚信自由和谐爱国民主敬业敬业']
    for enc in encs:
        assert dec(enc) == '愛してます'

if __name__ == '__main__':
    test1()
    test2()
    test3()
    test4()
    test5()
```

#### 参考资料

1. `decodeURIComponent(rv)`用python表达：<https://www.cnblogs.com/aotumandaren/p/14081685.html>
