# 某查查sign和access_token分析

> **作者**: 小溪网络 | **发布时间**: 2023-05-14 13:35:00 | **版块**: 『移动安全区』 | **查看/回复**: 4979 / 14
> **原文**: [https://www.52pojie.cn/thread-1785274-1-1.html](https://www.52pojie.cn/thread-1785274-1-1.html)

---

*本帖最后由 小溪网络 于 2023-5-14 13:51 编辑*

一、抓包查看数据
1、在第一次打开app的时候，会自动生成一个deviceId、sign。并且服务器返回对应的access\_token
![](https://attach.52pojie.cn//forum/202305/14/135053nw22wemng2m7crnc.png?l)
2、多次清除app数据，重新打开app抓包。
①deviceId是会变化的，可以猜想是随机生成
②sign的格式均为32位数字后拼接||d,看起来像一个md5值

二、Jadx定位
1、通过地址中的关键字/getAccessToken进行搜索，可以成功定位到

![](https://attach.52pojie.cn/forum/202305/14/124752kxr2a4oz42bvx1jf.png)

2、其中参数2是我们要找的deviceId、参数8是sign值。向上查找调用源头

![](https://attach.52pojie.cn/forum/202305/14/125426v9w9kdcewll3z9kv.png)

3、其中：bIv就是deviceId、sign是由一个方法的返回值，其中参数1：deviceId、参数2：毫秒时间戳、参数三：向上查找发现如下是一个固定值：3b09g2ae9c34bb5af5d37d7c13ed033f645f50a4d

![](https://attach.52pojie.cn/forum/202305/14/130314cqn1vao4ko89kkva.png)

三、加密方法定位
参数分析完毕后，我们，继续向上寻找，这个方法的调用源头：
1、发现是一个抽象的方法

![](https://attach.52pojie.cn/forum/202305/14/130608rk6kje6zijarur9j.png)

2、我们继续分析，可以看到，有一个是叫EncryptImpl的类实现了这个方法，比较可疑

![](https://attach.52pojie.cn/forum/202305/14/130909vwciydiihiaphaae.png)

3、进入后发现是一个MD5加密，并且有日志输出，我们hook他的参数部分

![](https://attach.52pojie.cn/forum/202305/14/132419pz3dh4a9al2799u9.png)

（deviceId + 毫秒时间戳 + 3b09g2ae9c34bb5af5d37d7c13ed033f645f50a4d）

![](https://attach.52pojie.cn/forum/202305/14/132118d18f4i48nize0zge.png)

md5验证后，也是正确的，没有魔改

![](https://attach.52pojie.cn/forum/202305/14/135119hsbzdim1pizvu9di.png)

四、模拟请求
我们用python生成代码并且请求。其中设备ID随机生成即可。成功拿到access\_token

![](https://attach.52pojie.cn/forum/202305/14/133249ceg0ts9astszv1ag.png)
