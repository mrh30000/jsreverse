# 某台葫芦娃小程序系列协议开源C++,QT6,X-HMAC-SIGNATURE算法,X-HMAC-DIGEST学习研究

> **作者**: Hacker-无心 | **发布时间**: 2023-06-09 18:54:00 | **版块**: 『编程语言区』 | **查看/回复**: 6934 / 27
> **原文**: [https://www.52pojie.cn/thread-1795558-1-1.html](https://www.52pojie.cn/thread-1795558-1-1.html)

---

*本帖最后由 Hacker-无心 于 2023-6-27 17:07 编辑*

C#winform刚转C++QT6的我,迫不及待的去继续写一些辣鸡小软件,,
**我提供的资料**

* 程序源码{[C++开发DLL],[QT6开发的界面(感觉可以忽略了,连半成品都达不到)]}–不提供vx Code获取
* 葫芦娃系列的所有商品信息
* 葫芦娃小程序反编译过后的文件

**项目规划(如下图readme.md):**这里是规划图:

![](https://attach.52pojie.cn/forum/202306/09/185206f7ofeje729j7eyjo.png)

**葫芦娃小程序配置信息:**

![](https://attach.52pojie.cn/forum/202306/09/185208kufupjfs6rdrc2tf.png)

**X-HMAC-SIGNATURE算法  X-HMAC-DIGEST算法**

![](https://attach.52pojie.cn/forum/202306/09/185210l00kt5852v7w81ff.png)

![](https://attach.52pojie.cn/forum/202306/09/185212oy0x093xj6oo3jdx.png)

**QT6界面(这个可以忽略了,没吊用了):**

![](https://attach.52pojie.cn/forum/202306/09/185214gz0qo7y67naa7xmt.png)

导出Dll实属…,毕竟第一次,后来我开发vx机器人(尚未开源)的时候,才发现将.h放入到导出的.cpp里,这样QT调用就不用复制辣么多头文件了
**我的总结**

上述内容仅供用于学习研究,不可用于商用以及违法用途,出现一切问题与本作者及本站无关,让大家提升自己,

,这次是C#winform转C++QT的第一次开发,相比较与上次的C#winform程序而言,我替换了请求的Host以及key之类的,代码少了很多,

,写的过程中才发现curl请求也可以全部浓缩一下,浓缩为一个,只需要替换一下url以及postdata就行,害将错就错吧,,感觉该踩的坑也都踩的差不多了,后续开发vx机qi人(尚未开源-处于测试阶段)代码也越来越工整了,

,这是第一次C++写的,代码很烂,如果看不下去的话建议Shift+Del,,

解压密码:www.52pojie.cn
