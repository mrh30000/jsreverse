# Android逆向之旅-分析某直播App的协议加密原理以及调用加密方法进行协议参数构造

> **作者**: jiangwei212 | **发布时间**: 2017-10-23 08:40:00 | **版块**: 『移动安全区』 | **查看/回复**: 42276 / 135
> **原文**: [https://www.52pojie.cn/thread-654477-1-1.html](https://www.52pojie.cn/thread-654477-1-1.html)

---

*本帖最后由 qtfreet00 于 2017-10-23 14:42 编辑*

**一、前言**随着直播技术火爆之后，各家都出了直播app，早期直播app的各种请求协议的参数信息都没有做任何加密措施，但是慢慢的有人开始利用这个后门开始弄刷粉关注工具，可以让一个新生的小花旦分分钟变成网红。所以介于这个问题，直播App开始对网络请求参数做了加密措施。所以就是本文分析的重点。逆向领域不仅只有[脱壳](https://www.52pojie.cn/forum-5-1.html)操作，一些加密解密操作也是很有研究的目的。
**二、抓包查看加密协议**本文就看一款直播app的协议加密原理，以及如何获取加密之后的信息，我们如何通过探针技术，去调用他的加密函数功能。首先这里找突破点，毋庸置疑，直接抓包即可，我们进入主播页面，点击关注之后，看Fiddler中的抓包数据：

![](http://img.blog.csdn.net/20170906152605500?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

我们会发现，请求参数中，有些重要信息，比如用户的id，设备的imei值等。不过最重要也是我们关心的就是s\_sg字段了，因为这个字段就是请求参数信息的一个签名信息。也是服务端需要进行比对的信息。如果发现不对或者没这个字段，那么就认为这次请求操作是非法的。所以我们只要得到这个字段的正确值，才能模拟访问此次操作的网络请求。
**三、分析加密流程**找到突破口了，就是这个字段s\_sg，用Jadx打开app的dex文件，打开dex文件之后，全局搜索s\_sg字符串：

![](http://img.blog.csdn.net/20170906153417690?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

这里看到只有一处出现了这个字段值，我们点进去查看：

![](http://img.blog.csdn.net/20170906153246139?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

看到这个方法，很兴奋，感觉就是加密协议的功能，而且字段都能对上，我们把这个加密方法直接拷贝出来，写一个demo之后模拟加密之后的信息，悲伤的是发现数据是对不上的，而且看看这个方法所在的类：

![](http://img.blog.csdn.net/20170906153511068?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

尽然是一个和网页交互的类，说明应该不是这个地方进行请求加密了。这个突破口就断了。**注意：这里说的是dex文件，不是apk文件，因为Jadx打开apk文件会解析资源文件，如果一个app有很多资源文件，那么Jadx打开就会卡死，所以很多同学问我为什么Jadx打开apk文件就出现卡死状态，主要是因为解析资源文件导致的。所以为了防止卡死，直接解压出dex文件，然后打开就不会卡死了。**

我们继续上面的抓包信息，就是请求的url地址，再去Jadx全局搜索：

![](http://img.blog.csdn.net/20170906153617663?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

找到了，点进去查看：

![](http://img.blog.csdn.net/20170906153634278?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

然后全局搜索这个"USER\_RELATION\_FOLLOW"字符串：

![](http://img.blog.csdn.net/20170906153708145?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

搜到结果，点进去进行查看：

![](http://img.blog.csdn.net/20170906153729701?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

这里看到了，用了注解方式来构造请求信息，而这里的核心类就是InkeDefaultBuilder，全局搜索这个类：

![](http://img.blog.csdn.net/20170906153813412?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

可惜没搜到，因为这个app进行拆包操作，有多个dex文件：

![](http://img.blog.csdn.net/20170906153906500?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

所以我们需要用Jadx继续打开他的第二个dex文件进行搜索：

![](http://img.blog.csdn.net/20170906153938957?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

果然，在第二个dex中找到了这个类。注意：这里需要注意，对于Jadx打开dex或者apk文件之后，跟踪发现找不到一些搜索内容的时候，需要有如下猜想：第一、是否包含多个dex文件，可以利用Jadx去打开其他dex文件进行搜索。第二、是否存在动态加载插件功能，全局搜索DexClassLoader找到插件加载位置，获取插件功能包，在用Jadx打开插件包进行搜索。第三、是否存在so文件中，可以利用IDA打开so文件，Shift+F12展示so中所有的字符串信息视图，然后进行搜索。第四、是否信息来源于网络请求返回，比如一些字符串信息展示，有可能是服务器返回的信息。
继续分析，点进去查看这个类的定义：

![](http://img.blog.csdn.net/20170906154417059?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

查看他的父类信息：

![](http://img.blog.csdn.net/20170906154618106?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

看到有一个url加密的方法，比较好奇。我们查看这个方法：

![](http://img.blog.csdn.net/20170906154646413?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

继续查看这个方法：

![](http://img.blog.csdn.net/20170906154701860?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)
这里发现有一个网络请求，会发现一些信息，然后设置到一个地方。我们继续看方法：

![](http://img.blog.csdn.net/20170906154747309?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

看到d变量的定义类型，一般我们看到不可点击的可能这个类不在这个dex文件中了，所以我们需要去另外一个dex文件进行查找，而本文案例就是来回这么折腾查找信息操作的，去另外一个dex文件中进行搜索：

![](http://img.blog.csdn.net/20170906154923597?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

查找到了，点进去查看：

![](http://img.blog.csdn.net/20170906154939183?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

这里又看到是一个a变量，看看他的定义：

![](http://img.blog.csdn.net/20170906155000798?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

看到，这里这个类又不可以点击，说明这个类不在这个dex文件中，去另外一个dex文件中进行搜索：

![](http://img.blog.csdn.net/20170906155039919?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

发现这个类的定义了，点进去进行查看：

![](http://img.blog.csdn.net/20170906155100599?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

原来是一个native的工具类，内部有很多native方法，包括了设置信息的方法，加密解密url方法等。看看他加载的so是什么：

![](http://img.blog.csdn.net/20170906155154407?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

原来是这三个so文件，看到crypto和ssl，弄过加密的知道，这个是openssl加密的库文件，这里猜想他在native层用了这个加密算法了。先不管，我们用IDA打开这个so文件，因为我们知道libcrypto和libssl这两个是库文件，所以直接打开它自己的libsecret文件吧，然后Shift+F12查看他的字符串信息页面，在之前不是想看看那个加密字段，这里搜索看看结果：

![](http://img.blog.csdn.net/20170906160315910?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

的确找到了，那个加密的字段了，我们点击进入查看：

![](http://img.blog.csdn.net/20170906160422697?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

然后点击X键，查看调用地方，不过可惜的是，跳转过去之后发现，那个汇编代码不是一般的多。这里先不去看了，回过头来，看看那个加密url的函数：

![](http://img.blog.csdn.net/20170906160522958?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

点击进去，然后按F5查看对应的C代码：

![](http://img.blog.csdn.net/20170906160544837?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

这时候就要开始怀疑人生了，IDA卡死了。然后简单看一下这个函数的汇编代码，简直蒙圈。太长了。如果靠静态分析，我是没这个耐心和能力了。动态调试？我觉得也够呛，搞不好还有反调试，各种跳转。不知道调试到猴年马月。
**四、获取加密内容**那么到这里，我大致分析这个直播app的请求协议有一个加密签名的字段s\_sg，这个值是在native层中进行加密操作的，采用openssl进行加密，但是加密函数非常长，分析难度加大。但是不能就这样放弃了。我们想要这个加密结果，用于我们自己构造参数之后获取正确的签名信息值。那么就需要转化思维了。我们或许只要结果，加密过程对我们来说并不那么重要。所以这里的一个思路：自己写一个程序调用它的so文件中的这个加密函数。
我们做过NDK开发的都知道，默认情况native方法在so中的JNI\_OnLoad函数自动注册，但是native中的函数必须按照这种格式：Java\_类名\_方法名，类似这样：

![](http://img.blog.csdn.net/20170906161044316?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

那么我们就可以在自己的程序中，把app的那个Secret类拷贝过去，不过一定要注意包名一定不能变：

![](http://img.blog.csdn.net/20170906161221040?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

然后在代码中直接调用native方法：

![](http://img.blog.csdn.net/20170906161238652?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

不过可惜的是，调用的结果，没有加密字段信息。所以这里我们会发现应该还缺少什么设置。我们回过头看看java层的代码：

![](http://img.blog.csdn.net/20170906172144319?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

这里有一个set方法，在之前分析已经发现了，他的调用地方：

![](http://img.blog.csdn.net/20170906172229362?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

这里有一个SecretDataModel类，应该是从网上请求获取到的数据，然后解析构造出这个类，看看这个类定义：

![](http://img.blog.csdn.net/20170906172315737?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

看到这里，发现已经用了第三方的json解析包，注解直接解析字段值。但是我们全局搜索这个类的话，跟踪太麻烦了，这里就采用另外一种方式跟踪代码，那就是利用Xposed拦截这个类的构造方法，然后在内部打印堆栈信息来查看方法的调用路径，这种方法我在之前已经用过了。本文能够更好的体现：

![](http://img.blog.csdn.net/20170906174613044?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

因为应用是多dex文件，所以hook必须先hook他的Application类的attach方法拿到正确的类加载器，正确加载需要hook的类信息，不然就报错了。这个已经讲了很多遍了。然后就是利用自动抛异常来打印方法的调用堆栈信息，安装运行，重启生效看日志：

![](http://img.blog.csdn.net/20170906174745986?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

这里看到了，他用google的gson库解析json数据的，看到了json数据是从下面这两个方法中传递过来的，查看这个类的方法：

![](http://img.blog.csdn.net/20170906175133869?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

点进去进行查看：

![](http://img.blog.csdn.net/20170906175145722?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

为了看到返回的json数据，我们在拦截这个方法，把返回的json数据打印出来看看是啥：

![](http://img.blog.csdn.net/20170906175237688?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

运行模块，重启生效，看日志信息：

![](http://img.blog.csdn.net/20170906175305954?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

看到这段json数据了，这时候，在返回去看看SecretDataModel那个调用set方法：

![](http://img.blog.csdn.net/20170906175403543?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

看到这四个参数值，第一个是Context不解释了，第二个是serverTime字段值，第三个是startCode字段值，第四个是runCode字段值。这三个字段都是可以在上面打印的json中找到的，我们把json格式化看看：

![](http://img.blog.csdn.net/20170906175606621?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

有了这三个值和Context变量，直接调用Secret的native方法set进行设置，看看能否正确获取到加密之后的字段值：

![](http://img.blog.csdn.net/20170906175851493?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

运行demo程序看看日志信息：

![](http://img.blog.csdn.net/20170906175907183?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

看到了，设置成功了，而且获取加密字段也成功了。到这里我们就成功的获取到加密字段s\_sg值了。
**五、获取加密配置信息**不过到这里还没有结束，因为我们发现那三个set值字段从网络获取，我们还需要知道是哪个url获取到的，这里从代码跟踪依然很困难，所以我们还需要利用hook来打印方法的堆栈信息来追踪代码，通过上面打印的获取json数据的堆栈信息：

![](http://img.blog.csdn.net/20170906180450640?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

看到是这个类访问获取json数据的，进去看看：

![](http://img.blog.csdn.net/20170906180917921?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

而传入的参数，在进行查看：

![](http://img.blog.csdn.net/20170906180937465?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

看到有一个getUrl方法，就是获取访问的url值，我们就可以这么来进行hook操作，打印这个url访问地址了：

![](http://img.blog.csdn.net/20170906181011654?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

运行模块，重启生效，看日志信息：

![](http://img.blog.csdn.net/20170906181039267?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

下面打印了那个我们想要的json数据，上面有几个url，我们在去Fiddler观察这几个url返回的数据，最后定位到这个是这个url返回的数据信息：

![](http://img.blog.csdn.net/20170906181129849?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvamlhbmd3ZWkwOTEwNDEwMDAz/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

**六、梳理加密流程**到这里我们就分析完了直播app的协议加密流程，下面来总结一下：第一步：通过/user/account/token\_v2接口获取加密前的配置信息第二步：通过native方法把第一步获取到的信息进行设置(set方法)。第三步：通过native方法将java层拼接参数的url值进行加密处理返回(encryUrl方法)那么我们可以这么做，自己协议demo程序，在Java层拼接好参数，然后调用so的native方法，返回还有加密字段的url，然后可以解析出这个字段就是加密信息了。我们就可以批量处理这种网络请求了。比如刷粉，观看直播，点赞等操作。当然有的同学会认为这次操作其实不是真正意义上的[破解](https://www.52pojie.cn)加密算法。的确不算，但是我们弄到我们想要的就好，过程其实没那么重要，而在这个操作过程中，我们又学习到了很多逆向技巧。
**七、逆向技巧总结**第一、在用Jadx打开apk卡死的时候，记得先解压出dex文件，在用Jadx打开dex文件即可。第二、对于多dex的应用，使用Xposed进行hook的时候，需要先拦截Application类的attach方法获取正确的类加载器。不然会报拦截失败。第三、当我们在使用Jadx进行全局搜索内容，发现没有搜索结果的时候，可能需要从以下几个方面考虑：1、是否包含多个dex文件，可以利用Jadx去打开其他dex文件进行搜索。2、是否存在动态加载插件功能，全局搜索DexClassLoader找到插件加载位置，获取插件功能包，在用Jadx打开插件包进行搜索。3、是否存在so文件中，可以利用IDA打开so文件，Shift+F12展示so中所有的字符串信息视图，然后进行搜索。4、是否信息来源于网络请求返回，比如一些字符串信息展示，有可能是服务器返回的信息。
> **第四、**在我们用Jadx进行代码跟踪非常困难的时候，记得还可以利用Xposed拦截指定方法，打印堆栈信息来跟踪代码，也是一种高效方法。第五、当你在使用Jadx右键一个方法看看调用路径，发现没有结果的时候，那么看看这个方法是否是该类实现的一个接口中的方法或者是抽象方法。去父类或者接口中的那个方法在右键看看调用路径。第六、在不关心过程，只关心结果的场景下，可以构造一个app来调用程序的so，获取我们想要的结果，这种方式一定要记住，后面很多场景都会用到。可以用它来嗅探so中一些函数的功能。比如通过调用so中的一个方法，输入规律数据，看输出结果是否符合一定规律，通过规律来破解加密算法。
> **八、总结**本文介绍的内容有点多，感谢该直播app开发者提供这么好的研究样本，当然最后需要说一句就是：安全防护策略不够，我们在本文可以看到我们利用调用他的so来获取加密信息，这个方法是可以用于很多app的，对于那些我们无需关心过程，只关心结果的内容，这种方法屡试不爽。那么作为开发者如何规避这种安全问题呢？很多人第一就想到了：在so的JNI\_OnLoad方法中判断签名信息是否正确，不正确就直接退出。这个的确可以防范。但是如果用我之前介绍的kstools工具原理，直接hook系统的PMS服务拦截获取签名信息方法，返回正确的应用签名信息，这种防护策略就失效了。所以说：安全不息，逆向不止。两者都在进步。
> 严重声明本文介绍的内容只是为了逆向技术探讨，绝对不允许不法分子进行恶意用途。如果带来任何法律问题均与本文作者无关，由操作者本人承担，而涉及到安全隐患，技术交流可以加入编码美丽技术圈
