# 记一次web端jsjiami.v6的逆向思路

> **作者**: Creeper666 | **发布时间**: 2021-08-09 00:45:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 14231 / 31
> **原文**: [https://www.52pojie.cn/thread-1490744-1-1.html](https://www.52pojie.cn/thread-1490744-1-1.html)

---

*本帖最后由 Creeper666 于 2021-8-9 14:27 编辑*

* 在前几个月，某位热心的伙伴制作了一个网页，输入相应的密码，就能跳转到音乐播放器、小说、JS在线运行这三大页面。由于密码恶臭（114514，1919810），再加上js判断密码跳转部分没有加密，导致密码不久便被他人传开。于是这位热心伙伴修改了密码，并且使用了js加密v6，不出意外，防住了一大波白嫖使用党。我是其中白嫖大军中的一员，幻想着白嫖，却没有js基础，分析这个js加密简直是看天书。直到某一天，我心血来潮，于是就有了接下来的过程：

* 网页如下图，需要输入密码跳转

![](https://attach.52pojie.cn/forum/202108/09/000134lq9n3eaqq6tqe3nl.png)

* 如果输错了就会弹窗，叫你联系这位热心伙伴（没用的）

![](https://attach.52pojie.cn/forum/202108/09/000138xn91rgqs2n1ills1.png)

* F12看一下，有反调试机制

![](https://attach.52pojie.cn/forum/202108/09/000141weizeca7h7hcz87k.png)

* 看到js部分，被加密了

![](https://attach.52pojie.cn/forum/202108/09/000145ygguqgnmjlan2xja.png)

* 这里先把网页跟js存本地，js要格式化，方便接下来的调试

![](https://attach.52pojie.cn/forum/202108/09/001623wfdzqok8k88r1j84.png)

![](https://attach.52pojie.cn/forum/202108/09/001626vjmynyyhgi2u2suz.png)

* 打开保存好的本地网页，按F12，此时会因为反调试机制暂停。按F10步进函数，定位到如下图一行。我们打开本地的js文件，也定位到这行代码，然后删除

![](https://attach.52pojie.cn/forum/202108/09/000148kfu66m69p78m2bkl.png)

* 删除之后，刷新一下网页以加载修改后的JS。此时仍然有暂停，继续按F10步进函数，定位到某一行代码，打开本地的js文件，也定位到这行代码，删除。我在这里又重复了三次，终于不停止了

![](https://attach.52pojie.cn/forum/202108/09/001629dct2r258yzlta3zc.png)

![](https://attach.52pojie.cn/forum/202108/09/001631ihreh7uerbkrrf4u.png)

![](https://attach.52pojie.cn/forum/202108/09/001633qksowzt006thotaf.png)

* 看到HTML源码，发现button没有相应的点击事件。转去js看看

![](https://attach.52pojie.cn/forum/202108/09/001636qk05ppklw0h5ohlp.png)

* JS搜索button，定位到这里

![](https://attach.52pojie.cn/forum/202108/09/001638y815o6bj6a6mwiet.png)

* 这个函数下个断点看看

![](https://attach.52pojie.cn/forum/202108/09/001644brd7te7i50qy379d.png)

* 点击HTML页面里的按钮，由于刚刚下的断点暂停。再转到js这里，F10步进，可以看到密码跟网页都出来了。但是由于长度限制，只有前面一部分数据

![](https://attach.52pojie.cn/forum/202108/09/003136bynkifkiitjkutn4.png)

* 这里可以注释掉几行，剩下的密码和网址也就看得见了

![](https://attach.52pojie.cn/forum/202108/09/003139hmlnogtrmvkocguz.png)

![](https://attach.52pojie.cn/forum/202108/09/003141xmmvhvmeemqqwkgv.png)

最后整理可得，三个密码对应的三个网址也就真相大白了。输入密码，完美跳转！

![](https://attach.52pojie.cn/forum/202108/09/000226wqljq399scz838sz.png)

* **总结：**
* **1,利用其反调试的策略，F10步进到有关代码，删除，即可正常使用调试功能；**
* **2,自行下断点，利用开发者工具步进函数时的输出，获取解密后的密码信息**

**最后欢迎大家提出意见和建议！不确保适用所有jsjiami.v6，仅作为本人零基础着手调试的思路和过程分享！**
