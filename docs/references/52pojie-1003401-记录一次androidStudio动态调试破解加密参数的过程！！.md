# 记录一次androidStudio动态调试破解加密参数的过程！！

> **作者**: z5487693 | **发布时间**: 2019-08-05 20:48:00 | **版块**: 『移动安全区』 | **查看/回复**: 10321 / 16
> **原文**: [https://www.52pojie.cn/thread-1003401-1-1.html](https://www.52pojie.cn/thread-1003401-1-1.html)

---

先说点废话！！我是做python爬虫的一个程序员，因为新工作要爬app，再爬取的过程中遇见很多加密的参数sign,token等等！！为了工作也是接触到了android逆向，在52[破解](https://www.52pojie.cn)论坛学习到很多有帮助的东西！第一次发帖！！有不对的地方大佬们请轻喷指正！！！
今天说的是一个小说app，直接charles抓包结果看到两个加密参数requestId和rqid！

![](https://attach.52pojie.cn/forum/201908/05/200303acdnj55sjtttvhu6.png)

看着这两个参数直接就androidkiller搜索一波，先搜这个requestId。

![](https://attach.52pojie.cn/forum/201908/05/200429h10z1e0y9a2as0k3.png)

可以结合到java代码来对照的分析

![](https://attach.52pojie.cn/forum/201908/05/200646z87sz15h3h5zhwhz.png)

![](https://attach.52pojie.cn/forum/201908/05/200808cux1biikmhxkbbmm.png)

![](https://attach.52pojie.cn/forum/201908/05/200831grrcclsfw4ln9qxs.png)

![](https://attach.52pojie.cn/forum/201908/05/200856gygq6dnqpdd880qq.png)

requestId这个值分析得差不多了，直接搜索rqid，因为我搜索出来的rqid有很多，但是都在一个smali文件里所以我就不在这去看smali带了，等会儿调试的时候每一个出现rqid的位置都打上断点看程序走的哪一个就ok了

![](https://attach.52pojie.cn/forum/201908/05/200549dx8nycbz8c5bxhb5.png)

分析到这，咱们就可以把dedug模式加上回编译apk然后安装到模拟器里面了。

![](https://attach.52pojie.cn/forum/201908/05/201357tlpezbpi5z7qile8.png)

在拷smali代码的时候就拷加密smali所在的文件就可以，不用管smali2

![](https://attach.52pojie.cn/forum/201908/05/201436nz2ww2wadanqaolf.png)

这一步做完了，接着就去配置androidStudio里面的内容先导入smali拷贝的文件然后按图操作就行

![](https://attach.52pojie.cn/forum/201908/05/201721wmrvdwujf60m9mwt.png)

![](https://attach.52pojie.cn/forum/201908/05/201744gquwnssa6ntrasbt.png)

![](https://attach.52pojie.cn/forum/201908/05/202127y5d1t32ays7kx3t5.png)

这配置完接着配置端口信息

![](https://attach.52pojie.cn/forum/201908/05/202202nsax7bdrw95pe8rw.png)

![](https://attach.52pojie.cn/forum/201908/05/202210nzry595y5hshhsyr.png)

这些都搞定了后就可以开始输入调试命令了adb shell am start -D -n 包名/入口，我调试的这个应用是adb shell am start -D -n com.dudiangushi.dudiangushi/com.flood.tanke.ActLoading

![](https://attach.52pojie.cn/forum/201908/05/202441d41ai8bu5lvb7urg.png)

模拟器跑起来出现这个界面就别管它了，然后在androidStudio运行debug

![](https://attach.52pojie.cn/forum/201908/05/202636e65k44d8j4054wk6.png)

![](https://attach.52pojie.cn/forum/201908/05/202714iojxsx1xorg4r68g.png)

现在在androidStudio导入的smali代码找到刚才我们发现requestId加密拼接字符串的位置进行断点

![](https://attach.52pojie.cn/forum/201908/05/202915gq869q96q9h82t2c.png)

明显可以看出这个requestId现在看来就没什么卵用啊，md5又不可逆，它这个后台也没法验证啊，所以接下来这个rqid才是它这个请求的重点，开始分析的时候也说了rqid很多，就不去分析smali代码了直接在这些rqid的字符串处全部打上断点，运行看程序走的哪一个就可以了！！

![](https://attach.52pojie.cn/forum/201908/05/203053jn7tzbr79vje3jvo.png)

结果分析java层看着更头痛，再换一个思路，断点后可以让程序一步一步执行，虽然麻烦点，但是谁让咱java没看明白呢

![](https://attach.52pojie.cn/forum/201908/05/203243d4wudbngcdx5dyg2.png)

因为这已经找到了rqid是怎么来的了，只需要在赋值之前调用方法的位置打个断点然后一步一步执行就行了

![](https://attach.52pojie.cn/forum/201908/05/203407y7ttoecpex5pewhk.png)

这个一步一步的执行需要看右下角寄存器值的变化，这里就不说一步一步的过程了，直接说找到字符串拼接的位置

![](https://attach.52pojie.cn/forum/201908/05/203635b88jikxc8dxj4hwx.png)

![](https://attach.52pojie.cn/forum/201908/05/203528l5ppx8m91p4zotw8.png)

![](https://attach.52pojie.cn/forum/201908/05/203716g3hju4xda4dhafcd.png)

我调试这个位置的时候直接找的搜索位置，这样跟更帮助找到加密位置。

![](https://attach.52pojie.cn/forum/201908/05/203828a0v0bre2fevwjfv0.png)

![](https://attach.52pojie.cn/forum/201908/05/203859j6866xz7qz57p162.png)

![](https://attach.52pojie.cn/forum/201908/05/203941nkla9u8ultrrujxo.png)

到此这两个加密参数咱们就破解出来了！！然后就可以愉快的发请求去拿数据了！！分享到这吧~~~app我就挂7天的百度云！！！！练手抓点紧哦！！！
链接：https://pan.baidu.com/s/1GoTX6di3OU1JdPqa226Bew 提取码：7slg

然后再说点废话，目前我遇见加壳和so加密层次的，我就拉闸了！！目前还在一步步学习！！希望大神们多分享点实操帖子，让我们这些刚接触逆向分析的小白学习一哈哈！！！磕头了！！咚咚咚~~~~
