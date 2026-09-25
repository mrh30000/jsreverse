# coco2djs手游封包协议分析jsc文件解密[客户虐我千百次,我待客户如初恋]

> **作者**: ai474427793 | **发布时间**: 2023-05-11 21:50:00 | **版块**: 『移动安全区』 | **查看/回复**: 13345 / 43
> **原文**: [https://www.52pojie.cn/thread-1784353-1-1.html](https://www.52pojie.cn/thread-1784353-1-1.html)

---

*本帖最后由 ai474427793 于 2023-5-11 21:53 编辑*

**前言**
**多图预警,流量提醒**
某鱼上面接了个单子,关于安卓手游逆向分析的.本来不想搞的,今天客户又联系我说看下,好吧,看在money的份上那就分析看看

![](https://attach.52pojie.cn/forum/202305/11/214542c225qvk2cdpf5pcc.png)

![](https://attach.52pojie.cn/forum/202305/11/214547pw8br28zf2wqyoyi.png)

**初步分析**下载安装app,没啥说的.像这种手游类型的,一般都是TCP的封包协议,有的是**websocket**,有的是纯粹的TCP,
那么就先抓包看看,我用的是**pixel3**,配置抓包环境就不详细展开了.打开**charles**,发现到登录服务器的时候会提示**连接不上服务器**.那就换**httpcanary**试试,

![](https://attach.52pojie.cn/forum/202305/11/214605lm3z3ubu9y00hz67.png)

![](https://attach.52pojie.cn/forum/202305/11/214611khfcwbcutthrko29.png)

可以明显看到是**websocket**的协议,先打开看看是否是明文显示的.

![](https://attach.52pojie.cn/forum/202305/11/214625jddrach77z7dtap0.png)

![](https://attach.52pojie.cn/forum/202305/11/214631fkzgguujnf6cfb6x.png)

可以看到发送包部分明文,再看看接收的包

![](https://attach.52pojie.cn/forum/202305/11/214649rhqqk3iktqwzhtuz.png)

![](https://attach.52pojie.cn/forum/202305/11/214716dqer4r4qz4belsyx.png)

有的有明文,有的却都是乱码,且乱码部分的数据都比较大.初步判断有做**压缩传输**.**APP分析**接下来就要去看下app里面的构造了,首先游戏类的app,因为要频繁更新,所以一般不存在**加固加壳**的情况,用压缩软件打开app目录,可以看到

![](https://attach.52pojie.cn/forum/202305/11/214656vclhmlpg5thyc3hs.png)

![](https://attach.52pojie.cn/forum/202305/11/214831umnwwwbmhg7vcctg.png)

cocos2d **jsc文件**,并且在**lib**目录看到了**cocos2djs.so**,确定这个游戏主要的逻辑应该都在这个**jsc文件**里面.
根据经验直接用mt管理器以十六进制文本打开cocos2djs.so,然后搜索ASCII字符main.js,

![](https://attach.52pojie.cn/forum/202305/11/214848lb0oehr3sobe0eb3.png)

![](https://attach.52pojie.cn/forum/202305/11/214854hr63b70giwii6tyt.png)

![](https://attach.52pojie.cn/forum/202305/11/214915sq9jzsjdgj696z66.png)

这个格式的 **0ed68e2d-8b2f-4a**就是jsc的解密密钥key**尝试解密**https://bbs.kanxue.com/thread-267920.htm#msg\_header\_h2\_1
根据这篇大佬的分析里面有提到的jsc解密v1.44工具,下载打开,输入key,然后拖入
**project.jsc**,**运气不错**,顺利的解开了.(ps:文件有点大,可能会卡一会儿,耐心等待)

![](https://attach.52pojie.cn/forum/202305/11/214925pvlwxba4xxmplldk.png)

接下来就找个工具把js代码格式化一下.然后关键词大法搜索一下"ws://","send","sendmessage","encrypt","encode",之类的.
顺利的定位到发包前的编码代码位置,先上**编码**的图

![](https://attach.52pojie.cn/forum/202305/11/214934lr83riagxga3uaix.png)

**然后是解码的**

![](https://attach.52pojie.cn/forum/202305/11/214943x4mwqd3tmmcqd54w.png)

编码的和解码的差不多,只是多了个**HashCode**,应该是服务器接收到客户端的数据后会根据这个hashcode来判断数据
是否是合法提交.**代码分析算法分析**重点看下解码的代码,
先读取前4个字节作为**headerFlag**来判断数据是否被压缩,如果是压缩的需要执行解压缩**inflate**操作
再读取4个字节是数据的长度,(ps:注意要做字节集反转,大小端网络字节序的转换)
然后一个字节作为**moduleEnum**
再一个字节作为**cmdEnum**
再两个字节作为**statusCode**
然后从下个字节开始到尾部刚好是与数据长度相等,那么这最后读取出来的**readBytes**就是最终的数据了.**算法还原解析数据**接下来根据前面的分析,来通过代码实现**数据的解析**,看看服务器返回的数据明文是什么东东

![](https://attach.52pojie.cn/forum/202305/11/214955dfzigefqgeiecbp9.png)

图上第一个包是发送的包,因为没有做hashcode的判断,导致前面多了两个字节,后面丢了两个字节
不过接收的包是可以看到完整信息的.至此封包分析结束,发送的包只要按照相同的逻辑做组包即可,记得带上hashcode.**总结**1.逆向分析的过程,上文取巧通过搜索main.js来直接定位到了key的位置.如果做适当的加密混淆可以避免这种情况,
那么就得像上贴大佬的方式去ida定位xxtea,然后frida来hook关键的位置提取key值.
2.这个游戏只是对数据做了压缩,且短数据直接没有做处理,没有做加密或者序列号的处理,不过考虑到游戏类对通讯的低延时要求,不做评价.
3.最后在附件贴上游戏文件,如有侵权,联系删除.**好了，到这里基本的分析记录也已经结束了，谈不上教程,只是把自己的学习分析过程记录一下.大家有什么好的方法和见解也欢迎交流，谢谢大家。**最后的最后,客户放我鸽子了,这也是这篇帖子会出现的原因,大家再见!
![](https://attach.52pojie.cn/forum/202305/11/215012kw0jnuj7jddwhjzg.png)

![](https://static.52pojie.cn/static/image/filetype/zip.gif)

[分析记录.zip](https://www.52pojie.cn/forum.php?mod=attachment&aid=MjYxNDEyOHxhM2MzYjY3ZHwxNzkwMTI2NDAyfDIzMjM3Mjd8MTc4NDM1Mw%3D%3D)
*(731 Bytes, 下载次数: 139)*
