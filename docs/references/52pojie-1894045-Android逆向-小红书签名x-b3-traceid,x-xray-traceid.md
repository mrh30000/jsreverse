# Android逆向-小红书签名x-b3-traceid,x-xray-traceid

> **作者**: shanel | **发布时间**: 2024-02-27 15:46:00 | **版块**: 『移动安全区』 | **查看/回复**: 12948 / 29
> **原文**: [https://www.52pojie.cn/thread-1894045-1-1.html](https://www.52pojie.cn/thread-1894045-1-1.html)

---

*本帖最后由 shanel 于 2024-4-19 14:34 编辑*

**某书在高版本添加了一些新签名，不过难度不大，适合新手入门学习，开始分析。**

* **抓包**

![](https://attach.52pojie.cn/forum/202402/27/153422tirnpzrp9irirkf7.png)

* 使用的抓包工具是charles，window推荐使用fillder抓包；
* 可以发现相比于之前版本，签名添加了x-b3-traceid，x-xray-traceid；

* **反编译APK**

               把小红书APK拖到jadx-gui中进行反编译并搜索两个字段值，如下：

![](https://attach.52pojie.cn/forum/202402/27/153841fv886468ynsxgm4s.png)

               可以发现搜索就能直接找到这两个字段值，那么它大概率就是在java层中生成的，双击代码查看具体逻辑:

![](https://attach.52pojie.cn/forum/202402/27/154104wdzo77wj9dk76zz7.png)

            这里的代码逻辑就是判断header中的x-xray-traceid是否为空，如果是空的话，就通过

[Java] *纯文本查看*

```
String format = String.format("%016x%016x", Arrays.copyOf(new Object[]{Long.valueOf(jArr[0]), Long.valueOf(jArr[1])}, 2));
```

来创建一个新的，那么，我们在本地代码实现如下：

![](https://attach.52pojie.cn/forum/202402/27/154400oa438o9otw797ks7.png)

             结果如下：

![](https://attach.52pojie.cn/forum/202402/27/154433e2k2yfttkfkrbqdy.png)

* **总结**

这个相比较于其他签名比较简单，非常简单，甚至不需要使用frida进行动态调试，只需要根据代码逻辑就可实现，适合新手入门练习；
