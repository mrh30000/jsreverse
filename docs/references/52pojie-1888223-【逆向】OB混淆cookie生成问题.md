# 【逆向】OB混淆cookie生成问题

> **作者**: hybpjx | **发布时间**: 2024-02-05 15:43:00 | **版块**: 『悬赏问答区』 | **查看/回复**: 2292 / 13
> **原文**: [https://www.52pojie.cn/thread-1888223-1-1.html](https://www.52pojie.cn/thread-1888223-1-1.html)

---

## 目标网站

> aHR0cHM6Ly9xaXllLm9iZWkuY29tLmNuL3dlYi16b25lL2J3enkvcHJvY3VyZW1lbnQuaHRtbA==

## 分析

页面刷新有两个请求。
请求需要携带三个cookie才能请求到数据。

1. csrfToken
2. HKIIUU9O618PPTHKM ———————— 短cookie
3. HKIIUU9O618PPTHPM ———————— 长cookie

先一个一个分析

### csrfToken

这个值是定死的。需要写死并且要会话保持才能一直请求。
值得注意的是headers中有个值x-csrf-token 这个值 要和cookie中的csrfToken绑定。

### HKIIUU9O618PPTHKM

短cookie获取的方式很简单。不牵扯到逆向。
这里分成以下四个步骤：

1. 获取主页 ——————> 正则提取 script 的外链JS
2. 补全刚刚获取的外链JS ——————> 请求
3. 拿到刚刚请求好的源码再次写一个正则获取另一个外链的JS
4. 请求刚刚再次获取到的JS。拿到set\_cookie。

值得注意的是这里有两个cookie 好就是HKIIUU9O618PPTHKM 和 HKIIUU9O618PPTHPM。
这两个Cookie就是获取倒的cookie
然而 事实是你直接请求。是请求不到的。
会抛出来一个页面。显示403无权访问。

### HKIIUU9O618PPTHPM

这个长cookie的获取方式。其实就是上文所说的第三步的那个JS。
这个JS是一个OB混淆。
本文生成cookie的函数为`_$j2()`

```
function _$j2() {
    var _0x4d67a0 = _$Ir(48);
    _0x4d67a0 = _$Hj1["call"](_0x4d67a0["substr"](13), "");
    var _0xbea349 = Math.floor(new Date()["getTime"]() / 1000);
    _0xbea349 = _$Hj1["call"](_0xbea349["toString"](), "");
    var _0x267f92 = _$Vm();
    var _0x40e786 = _$v7(_0x267f92[0], _0x267f92[1], _0x267f92[2], _0x267f92[3], reguLiu, "yes", "yes", asourceWP, "");
    for (var _0x3da7dc = 0; _0x3da7dc < timeArr["length"]; _0x3da7dc++) {
        _0x4d67a0[timeArr[_0x3da7dc]] = _0xbea349[_0x3da7dc];
    }
    var _0x310b05 = _$Ir(18);

    _$rad = _0x310b05["substr"](13);

    var _0x37628e = xazxBase64["decode"](_0x40e786);

    _0x37628e = _0x37628e["substr"](0, _0x37628e["length"] - 1);
    _0x37628e += ",\"post_md5\":\"" + _$rad + "\"}";

    _0x4d67a0 = xazxBase64["encode"](_0x4d67a0["join"]("") + _0x37628e);
    var _0x6382ae = ["3", "7", "10", "12", "15", "18", "20", "23", "35", "40"];

    _0x4d67a0 = _$Cc(_0x4d67a0, _0x6382ae);
    return _0x4d67a0;
}
```

简单分析一下生成原理。

1. *$Ir(48) 生成一个48位的随机字符串 开头是时间戳 下文* $Ir(18)也一样。括号里填多少就生成多少位。
2. 并将生成好的字符串（除时间戳）转换为一个一个的列表
3. 生成一个时间戳并且转化成列表。
4. 将两个列表利用浏览器的一些特性再次生成一个新的值
5. 解码 并且加上一些特定字符串 从而将生成的那个列表值转换成字符串进而加密。
6. 然后再次进行打乱生成 HKIIUU9O618PPTHPM。

中间要传入cookie才能生成cookie。但是加了之后还是不对。有没有大佬帮忙看看
