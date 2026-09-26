# xhs小红书shield算法逆向分析记录 小红书新版shield逆向

> **作者**: HONGLINCHEN | **发布时间**: 2021-09-14 09:58:00 | **版块**: 『移动安全区』 | **查看/回复**: 10274 / 13
> **原文**: [https://www.52pojie.cn/thread-1512461-1-1.html](https://www.52pojie.cn/thread-1512461-1-1.html)

---

&#8203;本次逆向xhs版本:7.6.0版本。
小红书的shield参数的算法计算是在libshield.so中，所以我们要从这个so文件分析。
先抓个包看看。
![](https://img-blog.csdnimg.cn/20210913151821699.png?x-oss-process=image/watermark,type_ZHJvaWRzYW5zZmFsbGJhY2s,shadow_50,text_Q1NETiBAQW5kcm9pZC3pgIblkJE=,size_20,color_FFFFFF,t_70,g_se,x_16)![](http://data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)&#8203;
用ida加载libshield.so文件，通过Jni\_load 找到函数偏移**1、 通过Jni\_load 找到函数偏移**
&#8203; 定位到jni\_load 函数，跟踪函数sub\_A654。如图
![](https://img-blog.csdnimg.cn/img_convert/8eae0a5aae0a04b9ffd43a8e449311b7.png)&#8203;![](http://data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)
其中sub\_2e1f4 是对app的签名进行验证，直接nop，sub\_736B0 是通过jni调用java的okhttp类的一些方法。sub\_7306 是动态注册的函数。
![](https://img-blog.csdnimg.cn/img_convert/db1afe615be34d27b81c67f19038884c.png)&#8203;![](http://data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)
找到地址off\_8E0D0，各个函数地址如图所示。
![](https://img-blog.csdnimg.cn/img_convert/c43c8412fdf42352e5aa7303bd6af263.png)&#8203;![](http://data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)**2、分析各个函数的作用**
2.1 initializeNative函数
![](https://img-blog.csdnimg.cn/img_convert/916c4af67fbeb2d48c2c9fa73620cc46.png)&#8203;![](http://data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)
initializeNative函数是对jni调用java方法的一些类进行初始化操作，建议对变量进行改名，类用c*开头，方法用m*开头便于后续分析。
2.2 initialize 函数
![](https://img-blog.csdnimg.cn/img_convert/686a41d3ce69c6f00a806474c957ef30.png)&#8203;![](http://data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)
initialize 函数是从s.xml文件中读取key为main\_hmac的值value。
![](https://img-blog.csdnimg.cn/img_convert/729d21e0e38d6d7016d49e07bc1ef59d.png)&#8203;![](http://data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)
把读取的value使用sub\_AAAC函数进行传参， sub\_AAAC 函数的主要功能是对value和device\_id 进行aes得到一个key，把key存入ptr + 0x28C 处， 如果sub\_AAAC返回值为1，则使用新版的shield算法，反之则使用旧版的s1-s12算法。**2.3 intercept函数**
intercept 是shield算法的逻辑部分，
![](https://img-blog.csdnimg.cn/img_convert/15d3a02a35a3f84d853255f3e33e0b79.png)&#8203;![](http://data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)
通过ptr+650的值来判断使用哪种算法，sub\_ABB8为新版，sub\_AD14为旧版。
![](https://img-blog.csdnimg.cn/img_convert/236d66163bf2fd0859eb895df8560534.png)&#8203;![](http://data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)
sub\_1fbb0函数对sub\_AAAC 函数的key进行异或0x36和0x5c，这里大胆猜测shield使用的是hmacmd5算法，sub\_1fbb0是对key进行初始化，sub\_1fc52是对url进行md5，sub\_1fc7e是对前面两步进行收尾工作计算出真正的shield。
![](https://img-blog.csdnimg.cn/img_convert/83d9434d831f8693a512c7af936c31a3.png)&#8203;![](http://data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)
像这种a1+12 是一个函数指针我是通过动态调试得到函数地址。使用的是魔改的md5。
3、算法还原
3.1 算法流程
1、result = md5((key ^ 0x36) + param)
2、shield = md5((key ^ 0x5c) + result)
aes部分的算法暂时没进行还原，md5的部分使用c语言进行了还原，本来想移植到python的，但是python没有无符号等数据类型，每一次操作都要进行&0xFFFFFFFF，心态有点爆炸，所以编译了一个shield.so供python调用，最终完成图如下：
md5的参数为(urlpath+xy-common-params+xy-platform-info) (ps:urlpath 需要去掉? 比如urlpath为： /api/sns/v6/homefeed?oid=homefeed\_recommend，传入的为/api/sns/v6/homefeedoid=homefeed\_recommend)
**最后花了很大功夫 转成了python源代码。**
**最终结果如下图**
![](https://img-blog.csdnimg.cn/20210913152731868.png?x-oss-process=image/watermark,type_ZHJvaWRzYW5zZmFsbGJhY2s,shadow_50,text_Q1NETiBAQW5kcm9pZC3pgIblkJE=,size_20,color_FFFFFF,t_70,g_se,x_16)![](http://data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==)&#8203;
欢迎一起交流学习！&#8203;
