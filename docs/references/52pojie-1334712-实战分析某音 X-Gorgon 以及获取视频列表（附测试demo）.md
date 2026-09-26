# 实战分析某音 X-Gorgon 以及获取视频列表（附测试demo）

> **作者**: anliou | **发布时间**: 2020-12-22 11:38:00 | **版块**: 『移动安全区』 | **查看/回复**: 14176 / 58
> **原文**: [https://www.52pojie.cn/thread-1334712-1-1.html](https://www.52pojie.cn/thread-1334712-1-1.html)

---

*本帖最后由 anliou 于 2020-12-22 13:03 编辑*

目前分析的抖音版本是 11.8.0 想要获取到短视频数据必须要有 2个参数才行 分别是 X-Gorgon 和 X-Khronos ，下面进行分析：

step1：
首先进行抓包 我这边推荐使用 fiddler 也可以使用 charles 可以自动解析 protobuf （charles 貌似有协议头部位全部小写的bug）
![](https://img-blog.csdnimg.cn/20201221230508751.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dlaXhpbl80NTY5MTk2MQ==,size_16,color_FFFFFF,t_70)
![](https://img-blog.csdnimg.cn/20201221230508745.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dlaXhpbl80NTY5MTk2MQ==,size_16,color_FFFFFF,t_70)
![](https://img-blog.csdnimg.cn/20201221230508710.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dlaXhpbl80NTY5MTk2MQ==,size_16,color_FFFFFF,t_70)

step2：
之后打开jadx 定位关键点 寻找关键字 X-Gorgon 或 X-Khronos
![](https://img-blog.csdnimg.cn/20201221230606623.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dlaXhpbl80NTY5MTk2MQ==,size_16,color_FFFFFF,t_70#pic_center)

![](https://img-blog.csdnimg.cn/20201221230634157.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dlaXhpbl80NTY5MTk2MQ==,size_16,color_FFFFFF,t_70)
![](https://img-blog.csdnimg.cn/20201221230634143.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dlaXhpbl80NTY5MTk2MQ==,size_16,color_FFFFFF,t_70)
![](https://img-blog.csdnimg.cn/20201221230634114.png)

这样定位到 这个native方法 com.ss.sys.ces.a.leviathan()这个方法

三个参数 分别是 int int byte[]

step3：
对方法进行hook 可以知道 第一个参数固定是 -1 第二个参数就是10位时间戳的整数值了 第三个参数是 4个md5的拼接

通过分析可知道 第一个md5 是 URL截取参数部分 也就是 ? 后面的内容 的md5（如果有x-common-params-v2 参数 则也需要一起拼接）
第二个 是 post内容的 md5 ，如果为空 则是 32个0
第三个 是 完整cookie的 md5 ，如果为空 则是 32个0
第四个 是 登录后有一个 sessionid 的md5，如果为空 则是 32个0
最后拼接成 16进制在转 byte[] （也就是 易语言字节集） 传入 leviathan 进行加密 即可获取到最终的 X-Gorgon

step4:
加密所在的类和明文都找到了，就可以直接接口生成加密信息了，
我这里提供一个我的测试接口（接口仅供学习测试使用，所以有调用时间限制，介意请勿下载~）

链接：https://pan.baidu.com/s/14Maj1KgCjQQiVpcMP0-OLQ
提取码：n1wq

  ![](https://img-blog.csdnimg.cn/20201221230655303.png)
![](https://img-blog.csdnimg.cn/20201221230655304.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dlaXhpbl80NTY5MTk2MQ==,size_16,color_FFFFFF,t_70)

最后完美获取到抖音短视频列表返回数据内容

本人原创文章，转载请注明
