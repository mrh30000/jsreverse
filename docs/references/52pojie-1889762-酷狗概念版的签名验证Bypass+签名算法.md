# 酷狗概念版的签名验证Bypass+签名算法

> **作者**: DreamFlyi | **发布时间**: 2024-02-14 14:34:00 | **版块**: 『移动安全区』 | **查看/回复**: 12739 / 66
> **原文**: [https://www.52pojie.cn/thread-1889762-1-1.html](https://www.52pojie.cn/thread-1889762-1-1.html)

---

**这次写一个酷狗概念版的签名验证Bypass**

酷狗概念版(com.kugou.android.lite) - 3.4.4 - 应用 - 酷安 (coolapk.com)
我这用的是酷安的原包

直接签名，打开安装，启动应用时会发现强制跳网页并结束进程，如图
![](https://s11.ax1x.com/2024/02/12/pF8ViAs.jpg)

猜测目标应用存在签名验证

根据对应用行为分析 发现目标应用的跳网页行为存在于C层libj.so
将libj.so拖入ida64中进行分析

在字串表中搜索目标网页
![](https://s11.ax1x.com/2024/02/12/pF8VejU.png)
查找交叉引用
![](https://s11.ax1x.com/2024/02/12/pF8VnuF.png)
可以发现应用通过Java Api的Intent创建一个HttpsActivity打开盗版网页

直接使用010 Editor删除字段
![](https://s11.ax1x.com/2024/02/12/pF8VG36.png)
![](https://s11.ax1x.com/2024/02/12/pF8VJgK.png)

将libj.so替换后，打包安装，发现进入app时不跳网页，点击登录又跳网页

跟进按钮控件的点击事件

```
com.kugou.common.useraccount.app.ShortMessageLoginFragment$$1.onClick
```

发现这个DetectUtils非常可疑，我们跟进去

```
com.kugou.framework.detect.DetectUtils
```

![](https://s11.ax1x.com/2024/02/12/pF8Vo80.png)

可以发现刚刚onClick中调用的b方法就是跳网页的实现
![](https://s11.ax1x.com/2024/02/12/pF8VqrF.png)

这一串数据解密之后就是盗版提示网页
![](https://s11.ax1x.com/2024/02/12/pF8VLb4.jpg)
我这里直接将dex解压出来添加到包中并直接弹窗显示数据
如果你有环境可以使用Frida或者Log Inject实现

分析之后可以发现关键在于DetectUtils.a方法，直接将其写死1即可绕过

至于这里签名校验的具体实现，就是通过PackageManager获取签名，再将其传入JNI接口进行判断
![](https://s11.ax1x.com/2024/02/12/pF8VzP1.png)
使用最简单的PMS代{过}{滤}理工具即可绕过

教程结束

最后
附上libyoung\_native.so的签名算法
https://www.123pan.com/s/yfCuVv-6W8Rd.html
将String a改成你的签名md5
运行并复制结果
打开libyoung\_native.so
选择
开始648（Hex）
长度20
粘贴从ASCII
即可绕过
