# 记自己的第一次完整Web逆向——【某人学】js混淆源码

> **作者**: ilovezll | **发布时间**: 2026-09-14 12:55:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 1588 / 21
> **原文**: [https://www.52pojie.cn/thread-2127930-1-1.html](https://www.52pojie.cn/thread-2127930-1-1.html)

---

*本帖最后由 ilovezll 于 2026-9-14 12:56 编辑*

**【前言】**
注册论坛好几年了，但是一直都没有发布过逆向帖子，实在惭愧
今天刷到了thesky大佬的帖子 猿人学第一题 js混淆-源码乱码https://www.52pojie.cn/thread-2127389-1-1.html (出处: 吾爱[破解](https://www.52pojie.cn)论坛)
本着学习和提升自己的心态，记录一下自己跟着逆向的帖子
话不多说，咱们直接开始

**一、题目简介**

![](https://attach.52pojie.cn/forum/202609/14/105207py89y39if3sbsyyw.png)

本题要求还是比较简单的，在刷新页面时，页面中部会出现若干个分页，每个分页会通过

[JavaScript] *纯文本查看*

```
/api/question/1
```

接口获取若干个数字，咱们的任务就是将所有获取到的数字进行简单求和并提交

**二、接口分析**

* F12打开开发者工具，F5刷新页面，发现有一个断点，右键改为永不执行条件断点进行跳过，也可以选择在此处永不暂停，（我也不知道那种方法更好，哈哈）

![](https://attach.52pojie.cn/forum/202609/14/110145kh2icfcwfxr8hix8.png)

* 根据题目提示（自行抓包也知道），该数字是由

  [JavaScript] *纯文本查看*

  ```
  /api/question/1
  ```

  接口返回，这里通过添加请求断点捕获它

![](https://attach.52pojie.cn/forum/202609/14/110538akhxkx5py8d85pdr.png)

* 随后F5刷新页面，发现该请求用的ajax；

![](https://attach.52pojie.cn/forum/202609/14/110826qqkurrg8q6qlluu6.png)

* i 为请求对象，m为payload中唯一加密参数，我们想要模拟请求，就需要找到参数m的生成方式

![](https://attach.52pojie.cn/forum/202609/14/111038dhpoqx55iicq1hxt.png)

* 在栈堆中向上追两层，找到了m的赋值表达式，粗略观察后，得知m = [加密部分] + “|” + 时间戳

![](https://attach.52pojie.cn/forum/202609/14/112620qlgp7wyjy5ui59pw.png)

* 再往上追一级，观察到上一步中 arguments 参数其实就是这里的变量 \_0xb89747，那么m变量就是\_0x5d83a3['\x6d']

![](https://attach.52pojie.cn/forum/202609/14/113156jq0fs440rnrzkke4.png)

* 再往上观察，m参数的拼接形式，\_0x57feae【变量1】 + '\u4e28'【字符串“|”】 + \_0x2268f9 / (-1 \* 3483 + -9059 + 13542)【变量2运算】，那么我们只用找到变量1和2即可；好在两者的生成函数就是上面几行

![](https://attach.52pojie.cn/forum/202609/14/122903jyymj1z4z79kgg77.png)

* 可以观察到：参数2明显是时间戳加了一个固定值 16798545 + -72936737 + 156138192 = 100000000；参数1是oo0O0()函数传入一个参数生成，通过观察，发现传入的正好就是 参数2 + window['f']，那么我们核心就是找到参数1

![](https://attach.52pojie.cn/forum/202609/14/124009qj97j7je86az759r.png)

* 参数1是oo0O0()函数生成，我们进入看看；观察后发现上面有window.a等全局变量，将该段代码抠下来，交给AI进行还原，即可获取生成函数

![](https://attach.52pojie.cn/forum/202609/14/124745onlsr91otoglqhfm.png)

* 细心的小伙伴可能观察到window.f与上文中的值明显不同，观察到ooo函数下面还有一个eval，估计是他修改了window.f的值，于是扣下来即可
* ![](https://attach.52pojie.cn/forum/202609/14/125131tzzkrntenmntoen8.png)

至此，参数已基本完全还原，剩下的就是写程序还原提交~

**【后记】**
这个web逆向过程，对于大佬来说可能只是牛刀小试，但我自己亲身完成之后，获取了极大的成就感和满足感。
逆向+发帖的过程陆陆续续写了一上午，希望后续自己能继续坚持下去，与大家一同进步！
