# 【JS逆向系列】某乎_zse_ck参数js与wasm多重套娃地狱级（左篇）

> **作者**: 漁滒 | **发布时间**: 2024-09-30 00:22:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 15052 / 114
> **原文**: [https://www.52pojie.cn/thread-1968832-1-1.html](https://www.52pojie.cn/thread-1968832-1-1.html)

---

@[TOC](https://www.52pojie.cn/%E3%80%90JS%E9%80%86%E5%90%91%E7%B3%BB%E5%88%97%E3%80%91%E6%9F%90%E4%B9%8E__zse_ck%E5%8F%82%E6%95%B0js%E4%B8%8Ewasm%E5%A4%9A%E9%87%8D%E5%A5%97%E5%A8%83%E5%9C%B0%E7%8B%B1%E7%BA%A7%EF%BC%88%E5%B7%A6%E7%AF%87%EF%BC%89)

### 前言

本片文章在一部分内容中会关联其他文章，建议优先阅读

[【JS逆向系列】某乎x96参数与jsvmp初体验](https://www.52pojie.cn/thread-1619464-1-1.html)

[【JS逆向系列】某乎x96参数3.0版本与jsvmp进阶](https://www.52pojie.cn/thread-1686683-1-1.html)

### 最外层js逆向分析

先下一个脚本断点，然后当使用浏览器无痕模式访问某乎提问题的主页时，并不会直接返回网页源代码，而是返回一个验证的中间页面

![](https://attach.52pojie.cn/forum/202409/30/002112oda2nvz9xz5z9fv9.jpg)

这个中间页面非常简单，仅仅只加载了一个js文件

![](https://attach.52pojie.cn/forum/202409/30/002117czix033tta1bbxxf.jpg)

这个js主要分成四部分，首先是来了一个常见的ob混淆

![](https://attach.52pojie.cn/forum/202409/30/002121ykztujppjfnffuu7.jpg)

这里只看重要的jsvmp和wasm两个部分，jsvmp部分的代码与上一篇的\_\_zse\_ck完全一样，但是字节码部分却很奇怪，解码之前字符串有一万多的长度

由之前可知执行每一步都会通过【>> 19】来计算进入哪一组函数，所以在这里下断点，断下是已经解析好字节码

![](https://attach.52pojie.cn/forum/202409/30/002126wv3k3ozsssm999or.jpg)

因为代码有ob混淆，所以搜索【>> 0x13】下断点，此时就可以查看this的数据

![](https://attach.52pojie.cn/forum/202409/30/002130xgj1gnsxx6tvjjhy.jpg)

可以看到大数组只有80的长度，字符串数组只有16的长度。不对劲，这么长的解析出来怎么可能只有80步这么短

而经过分析才发现，字符串数组下标13的字符串长度居然高达7094

![](https://attach.52pojie.cn/forum/202409/30/002135alp0ltz9ip0xp40g.jpg)

也就是说这段jsvmp的流程可能是非常短，只是有一个非常大的字符串

还是用之前的方法对这段jsvmp进行反汇编

```
function sub_0() {
  __g["ck"] = "003_bdxEeEnJYUXwWmFo0zxaCPNgpkh1+HL9yQr4ya6AXXDDOOQXoausGBAnGBSUqjXGqpIyQJjZ7C2Su/UzpZZCx6xsxiIj/kqzZN/YjmBxgx+=";
  stack_0 = 63;
  let var_0 = __g["z"]["toString"]();
  stack_1 = var_0;
  register_0 = stack_1;
  let var_1 = register_0["indexOf"]("nsol");
  if (var_1 > -1) {
    register_0 = stack_0;
    stack_2 = register_0 + 40;
  }
  if (!(var_1 > -1)) {
    stack_2 = 64;
  }
  let var_2 = document["querySelector"]("script[data-assets-tracker-config]");
  stack_3 = var_2;
  register_0 = stack_3;
  stack_4 = register_0 + "";
  register_0 = stack_4;
  let var_3 = register_0["indexOf"]("HTMLScriptElement");
  if (var_3 == -1) {
    register_0 = stack_2;
    stack_2 = register_0 + 41;
  }
  register_0 = stack_2;
  if (register_0 < 100) {
    __g["ck"] = "003_bse0VGIjj3tceHDd8dBC73LrG7T3+wPFX/XU+QZ69kG8R9/JoHdLt9xKdmxP6LEBeW4N9MZWmS36rLXN81hQSdiWDIqzuoVj9RJHBJU8Qdoi";
  }
  let var_4 = window["eval"]("(function(){const encoder=new window.TextEncoder(\"utf-8\");const decoder=new w /* 代码太长忽略*/");
}
```

流程确实很短，前面是一些环境检测，检测不通过的话就会设置一个默认的ck值，但是这个值拿去请求的话，是会返回乱码的内容。

最重要的就是最后一句，eval了一段非常长的js，所以上面忽略的部分代码，下面将这部分js复制出来格式化

![](https://attach.52pojie.cn/forum/202409/30/002139bwl67g1y6kl6ylmv.jpg)

可以看到这是一个很标准的胶水代码，那么就是为了后续加载wasm做准备。到这里对真实的ck还没开始，那么继续往下看

### 最外层js加载wasm

二进制wasm文件直接用base64编码写在了源代码中

![](https://attach.52pojie.cn/forum/202409/30/002143zzn10gclgxo0nodf.jpg)

当加载完wasm后直接调用了run的标准初始化函数，这个run函数就是在前面eval的胶水代码里面。

![](https://attach.52pojie.cn/forum/202409/30/002148vhhm4qfqyqhyfm7z.jpg)

这里面也是标准函数，然后突然就生成好了ck。咦！！！是不是少了什么步骤？

之前加载完wasm后，明确了是调用【\_encrypt】函数后才获取到ck，但是现在没有了。 接下来就只能是下载wasm文件，然后转o文件用ida分析

![](https://attach.52pojie.cn/forum/202409/30/002153kw7y8ot7d7kyco6s.jpg)

但是此时无论是搜索【encrypt】或者是【sm4】都没有结果

![](https://attach.52pojie.cn/forum/202409/30/002157wkj1tl8z2dib82qk.jpg)

突然间逆向好像陷入了僵局，不知道后面应该怎么进行下去！
