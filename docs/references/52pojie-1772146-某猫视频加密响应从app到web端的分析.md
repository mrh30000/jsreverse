# 某猫视频加密响应从app到web端的分析

> **作者**: Arcticlyc | **发布时间**: 2023-04-10 21:56:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 9827 / 68
> **原文**: [https://www.52pojie.cn/thread-1772146-1-1.html](https://www.52pojie.cn/thread-1772146-1-1.html)

---

*本帖最后由 Arcticlyc 于 2023-4-12 13:50 编辑*

## 某猫视频加密响应从app到web端的分析

###### 本次分析仅作学习参考，别无他用，侵权即删。

### 4.12 更新

---

之前一直很疑惑为什么明明很简单的加密，却完全找不到一点蛛丝马迹。结果碰巧看到一篇文章，里面分析的app是h5套壳的，想到这个app同样有web端，是不是它的解密过程在某个 js 里面呢（虽然之前没发现）？
结果不出所料，在 ./assets/index.android.bundle 中存放了 js 代码，而且密钥就以明文方式展示。

![](https://attach.52pojie.cn/forum/202304/12/134935b89fma4rajlbcjn7.png)

### 1. 前言

---

最近接触到一款颜色app（我有一个朋友），由于其响应内容进行了未知加密，遂对其进行逆向分析。

### 2. 抓包响应结果

---

![](https://attach.52pojie.cn/forum/202304/10/215404cxxpvb99a8dfiaba.jpg)

![](https://attach.52pojie.cn/forum/202304/10/215402diedxngdaaz1fugz.jpg)

可以看到请求头和参数都十分简单，但是响应中的data是base64编码，解密后全是乱码，那么肯定进行加密了，先盲猜AES或DES吧。

![](https://attach.52pojie.cn/forum/202304/10/215406e5460g01pguh5pup.jpg)

### 3. app分析部分

---

首先使用已root的设备安装该app，使用算法助手并打开解密功能后启动app，捕获成功后返回算法助手并查看日志。

![](https://attach.52pojie.cn/forum/202304/10/215409mtaa49a5tt5a9net.jpg)

可以看到日志中确实捕获到了加密过程，然而这组密钥并非用于app解密响应，似乎只是在app初始化时使用。

接下来的过程，使用jadx分析app，通过搜索关键词查看是否能够找到解密方法。首先搜索请求中的关键字（clienttype，page，videolist等），但是根本搜索不到，再尝试搜索响应中的"data"，搜索到的结果依然没有用处。再尝试搜索一些解密可能用到的关键字（decrypt，AES等），确实搜索到了一些结果，但是通过查看堆栈发现只是我们之间使用算法助手捕获到的部分。一番分析后只得作罢，无法找到解密入口。

![](https://attach.52pojie.cn/forum/202304/10/215411pg44edlxd44idxi3.png)

但是在app内偶然看到其官网，于是在浏览器中打开，发现存在web端，抓包发现同样存在加密，那么可以尝试逆向web端，看看开发者是不是个懒虫（密钥一致）。

### 4. web端分析部分

---

web端就简单得多了，通过搜索请求中的关键字或者打xhr断点找到请求处，开始一步一步向下分析。

![](https://attach.52pojie.cn/forum/202304/10/215419usy2y2b4tnuhy63t.png)

![](https://attach.52pojie.cn/forum/202304/10/215415fkmm3ekeikt0er3y.png)

最初不知道怎么回事，不停f11直接给跑到了图片解密的地方，在此处捣腾一会后发现似乎响应早在之前就已经解密了，于是只能回到之前的断点处，按下尊贵的f9，一步一步看了。机械地按了一会，终于找到了关键之处，这地方一看就是解密方法了。

![](https://attach.52pojie.cn/forum/202304/10/215417nlloab1blasecrmi.png)

![](https://attach.52pojie.cn/forum/202304/10/215413ymhg4d4haddni7nl.png)

![](https://attach.52pojie.cn/forum/202304/10/215359td0o2o72opz19o1d.png)

好家伙，密钥就摆在这了，一看aes方法，先不管什么模式有没有iv了，试一试ECB，直接解出来结果了，那后面的分析就没必要再展示了。按捺不住小心脏，我们直接试试解密app的响应结果。

![](https://attach.52pojie.cn/forum/202304/10/215356gjccvie5bt5t8wtb.jpg)

解密成功

果然

是个懒虫……

果然

**大佬全凭技术，菜鸟全凭运气……**

### 总结

---

没有总结了，前面的话就是总结
