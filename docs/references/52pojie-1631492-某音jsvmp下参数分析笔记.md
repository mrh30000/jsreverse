# 某音jsvmp下参数分析笔记

> **作者**: 漁滒 | **发布时间**: 2022-05-04 22:43:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 13870 / 59
> **原文**: [https://www.52pojie.cn/thread-1631492-1-1.html](https://www.52pojie.cn/thread-1631492-1-1.html)

---

@[TOC](https://www.52pojie.cn/%E6%9F%90%E9%9F%B3jsvmp%E4%B8%8B%E5%8F%82%E6%95%B0%E5%88%86%E6%9E%90%E7%AC%94%E8%AE%B0)

在获取个人主页发布视频的时候，会有两个特别的参数

![在这里插入图片描述](https://img-blog.csdnimg.cn/b91d172d7aba44bcbb5948f3733143e5.png#pic_center)
X-Bogus和\_signature，但是在全局搜索的时候，却完全没有搜索到这两个关键字，按照以往的经验，字节的会重写XMLHttpRequest原型下的方法，当发出请求前，会经过一段加密逻辑，自己加上校验的参数，那么在网站上试一试

![在这里插入图片描述](https://img-blog.csdnimg.cn/55f2a6aeeda946088e5f1a487ad6ece9.png#pic_center)
果然XMLHttpRequest原型下的open方法被重写了，点进去后，发现在webmssdk.js这个里面，这个就是jsvmp的入口

![在这里插入图片描述](https://img-blog.csdnimg.cn/38c7edf189054a9da439919c0abf034d.png#pic_center)
下一个断点往下拉，当触发请求的时候，就会断下，可以看到open方法的三个参数，跟着单步往下走，就会进入\_0x20653b函数

![在这里插入图片描述](https://img-blog.csdnimg.cn/61a0d395b25947b6a33fbfe38ec1b2cd.png#pic_center)
这个函数带有8个参数，既然是jsvmp，那就用jsvmp的思路来看看这8个参数分别代表什么意思，经过多次对比，可以得到下方的表格

| 变量名 | 含义 |
| --- | --- |
| \_0x52f757 | 字节码 |
| \_0x1f5661 | 函数基址 |
| \_0xabd09a | 函数长度 |
| \_0x204c10 | 本地变量 |
| \_0x2bf5d9 | 闭包变量 |
| \_0x5cca65 | 函数调用者 |
| \_0x1a0d5a | 无意义 |
| \_0x4420e0 | 分支类型 |

知道变量的类型后，那么可以尝试根据字节码，来编写一个对应的解释器，根据函数基址为578，函数长度为71，生成open方法的伪代码如下

```
function open(){
    this["_byted_intercept_list"] = [];
    var local_var_0x0 = new window["Object"]();
    local_var_0x0["func"] = "open";
    local_var_0x0["arguments"] = argument_$2;
    this["_byted_method"] = argument_0["toUpperCase"].apply(argument_0, []);
    this["_byted_url"] = argument_1;
    return argument_$0[26].apply(this, argument_$2);
}
```

函数非常短，看起来不像是生成两个参数的，功能只是把设置了\_byted\_method和\_byted*url这两个属性，其中argument*$0[26]正是底层的open方法

既然不在open方法，那么很有可能就是在send方法了

![在这里插入图片描述](https://img-blog.csdnimg.cn/3446b97d393848458824b387dd67b03e.png#pic_center)
继续点进去

![在这里插入图片描述](https://img-blog.csdnimg.cn/f3d1db1fc70c4fc2aa285d249afbb873.png#pic_center)
可以看到send方法被绑定到这里了，继续单步调试，又来到了熟悉的地方

![在这里插入图片描述](https://img-blog.csdnimg.cn/99bd6317d9484bb78e980e1399c7aba3.png#pic_center)
继续往下单步调试，可以看到send方法的字节码以及函数基址等数值，继续尝试生成伪代码

```
function send()  {
  for (; this["_byted_url"]["indexOf"].apply(this["_byted_url"], ["_signature="]) > 0 - 1;) {
    return argument_$0[28].apply(this, argument_$2);
  }

  this["_byted_body"] = argument_0;
  argument_7 = this["onreadystatechange"];
  argument_8 = this["onabort"];
  argument_9 = this["onerror"];
  argument_10 = this["onload"];
  argument_11 = this["onloadend"];
  argument_12 = this["onloadstart"];
  argument_13 = this["onprogress"];
  argument_14 = this["ontimeout"];
  var local_var_0x0 = new window["Object"]();
  argument_15 = local_var_0x0;
  argument_50 = 0;

  for (; argument_50 < argument_$0[30]["length"];) {
    argument_15[argument_$0[30][argument_50]] = this["upload"][argument_$0[30][argument_50]];
    argument_50++;
    argument_50 = argument_50;
  }

  argument_16 = argument_$0[3]["msStatus"];
  *********省略代码****************
}
```

明显，这次的伪代码逻辑上存在问题，代码并不可信，但是还是能从中获取到一些逻辑，那么这些伪代码就可以作为辅助来还原算法。最终可以在send函数中分别找到X-Bogus和\_signature的生成函数，分别根据伪代码辅助，手动调试的方法，还原出python版本的算法。

使用还原的算法测试抖音弹幕的获取，可以正常获取。

![在这里插入图片描述](https://img-blog.csdnimg.cn/11766f8a6290427fbd8e8252f15a3dab.png#pic_center)

在深入研究发现，其实还有一些参数也是jsvmp中生成，但是并是在这个这同一个js，如\_\_ac\_signature和captchaBody。其中\_\_ac\_signature是从首次访问任何页面返回的

![在这里插入图片描述](https://img-blog.csdnimg.cn/1a5d534acdf2458b86df7a36a2213b32.png#pic_center)
而captchaBody则是从captcha.js文件中生成的，不过其中所有的文件中，字节码的魔数都是一样的，也就是说可以使用同一套解释器生成伪代码，从而辅助还原算法

![在这里插入图片描述](https://img-blog.csdnimg.cn/e903a86676524c988d6a12a57ee668ae.png#pic_center)

参考文献
[1.【JS逆向系列】某乎x96参数与jsvmp初体验](https://www.52pojie.cn/thread-1619464-1-1.html)
[2. [原创] 给"某音"的js虚拟机写一个编译器](https://bbs.pediy.com/thread-261414.htm)
[3.某音新版本逻辑分析](https://mp.weixin.qq.com/s/zSBH-NuLAZBjYP2ne2EUsw)
