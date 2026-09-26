# 关于京XApp的分析

> **作者**: fanfan491 | **发布时间**: 2018-05-10 12:08:00 | **版块**: 『移动安全区』 | **查看/回复**: 8890 / 25
> **原文**: [https://www.52pojie.cn/thread-737499-1-1.html](https://www.52pojie.cn/thread-737499-1-1.html)

---

*本帖最后由 mengzhenhai 于 2018-5-10 12:49 编辑*

        之前发表过一片过于淘宝的分析,其实京东跟淘宝也差不多，唯一不同的是京东不像淘宝做了双验证

![](https://attach.52pojie.cn/forum/201805/10/110825i777xay5s2w2w25x.png)

       还是通过关键字login
        看到了是这个SO,然后把他解压
         解压之后用jeb  打开

![](https://attach.52pojie.cn/forum/201805/10/111308nmxmlhmmiummcwf4.png)

   LoginActivity 这个
    当然你可以通过adb shell dumpsys activity   查看是否是这个activity

![](https://attach.52pojie.cn/forum/201805/10/111714bj5dr8r8tepzppb8.png)

     这边都是登陆的布局  控件的绑定   很简单
      可以去查这个资源文件的 login\_activity\_tab

![](https://attach.52pojie.cn/forum/201805/10/112642hnivp8df0iifdjjd.png)

看到这里 有2个fragment 用于附加在activity上面的

![](https://attach.52pojie.cn/forum/201805/10/113222zwgwbc5wo3mdww2m.png)

![](https://attach.52pojie.cn/forum/201805/10/113222xgyakcy6kkh9ym6z.png)

  你会发现他的接口都是通过这个SDK 去实现的
  后来懒得找了  直接跟踪栈

![](https://attach.52pojie.cn/forum/201805/10/120550sq5iwf9ccyyzznfs.png)

![](https://attach.52pojie.cn/forum/201805/10/120551yyhv9d9i8x9y97tg.png)

   上面的是刚才分析的点击事件, 最后这个是调用的SDK, 刚好

![](https://attach.52pojie.cn/forum/201805/10/120705v8cbcxtjxc31h36n.png)

  这个图片可以看出来是登陆的算法了 ,抓包我就不抓了,大家可以自己抓,后续会告诉你后面的加密怎么弄
   有什么不懂的加 禁止留联系方式
