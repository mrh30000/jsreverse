# 新人第一次某头像app接口请求sign分析

> **作者**: slslsl | **发布时间**: 2023-02-28 15:29:00 | **版块**: 『移动安全区』 | **查看/回复**: 2756 / 5
> **原文**: [https://www.52pojie.cn/thread-1752032-1-1.html](https://www.52pojie.cn/thread-1752032-1-1.html)

---

*本帖最后由 slslsl 于 2023-3-2 16:42 编辑*

新人学习app逆向第一次尝试分析过程记录
分析对象：某头像app，界面如下

![](https://attach.52pojie.cn/forum/202302/28/150417s9icqa9c2fs5si9p.png)

首先通过模拟器抓包，成功抓取到其中的数据接口，发现其中带有sign参数

![](https://attach.52pojie.cn/forum/202302/28/150607moisr5fraa5hdqqd.png)

将其余参数修改后重新请求，返回签名失败，得出结论所有请求参数均参与了sign签名计算

![](https://attach.52pojie.cn/forum/202302/28/151037u1trkk2sveiv77v3.png)

根据特征盲猜sign的计算方法为请求参数排序后进行md5计算得出，于是乎尝试进行sign值计算还原，尝试了几种方案，均未成功还原出正确的sign值

开始尝试apk文件逆向，直接丢入工具中发现有加壳

![](https://attach.52pojie.cn/forum/202302/28/151355fpjss0whkpwkgkww.png)

那么尝试使用frida-dexdump进行[脱壳](https://www.52pojie.cn/forum-5-1.html)(具体过程就不放上来了)
完成脱壳后得到dex文件，并全部拖入jadx中进行分析

![](https://attach.52pojie.cn/forum/202302/28/151543cz2zmpfvvd4fdlvc.png)

直接文本搜索可能的值 "sign=" 得到结果如下

![](https://attach.52pojie.cn/forum/202302/28/151742z29636obrmbrody7.png)

![](https://attach.52pojie.cn/forum/202302/28/153144ynlrd9zrf99e92fv.png)

找到对应代码处，发现该sign值通过一个signTopRequest方法计算得出

其中传入了三个参数
treeMap应该为参数体，accessKeySecret为加密相关secret，signatureMethod为请求方法
参数对应下图具体方法实现

![](https://attach.52pojie.cn/forum/202302/28/152033mtwsgwsg4ti440wf.png)

返回上一层尝试查找具体accessKeySecret值，发现只定义了相关变量，以及get、set方法

![](https://attach.52pojie.cn/forum/202302/28/152539yykebdm67sk9dghb.png)

根据写法进行搜索setAccessKeySecret未找到调用位置。

目前卡在这里，望各位大佬指点后续逆向思路

附相关apk文件下载地址
http://www.51txapp.com/app/wygxw.apk

--------------------3月2号更新--------------------------

已成功解决

通过搜索其他接口中固定关键字，找到了一个setParams设置参数的方法

![](https://attach.52pojie.cn/forum/202303/02/163855e0axeq0eubee9m09.png)

可以看到sign的值由后面的formatUrlMap计算得出，继续跟进

![](https://attach.52pojie.cn/forum/202303/02/163857j080bps0sahpq0n9.png)

这里就很明显了，看到其中给返回值str赋值的部分
str = \*\*\*\*\*\*.APP\_KEY + sb.toString()

于是乎顺利找到最后一块拼图！

最终成功实现正确sign值计算。

感悟：思路灵活是最重要的，往往一条路容易走进死胡同，及时转变思路，寻找其他突破口，不经意间就会有收获！
