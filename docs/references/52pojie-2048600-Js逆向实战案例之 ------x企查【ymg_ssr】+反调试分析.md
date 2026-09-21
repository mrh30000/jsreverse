# Js逆向实战案例之-x企查【ymg_ssr】+反调试分析

> **作者**: zhnn | **发布时间**: 2025-07-25 16:49:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3428 / 24
> **原文**: [https://www.52pojie.cn/thread-2048600-1-1.html](https://www.52pojie.cn/thread-2048600-1-1.html)

---

网站:
aHR0cHM6Ly9haXFpY2hhLmJhaWR1LmNvbS8=

目标拿到数据
分析：
1. 这个网站有一个反调试，只要打开开发者工具就会清除控制台，然后返回about:blank

![](https://attach.52pojie.cn/forum/202507/25/163732n0gqd40vqi9milv9.png)

![](https://attach.52pojie.cn/forum/202507/25/163749t1r1b20nrbed61dp.png)

2.那我们怎么办，它的代码里面肯定有一段代码是检测我们的浏览器调试工具的，我们的思路就是找到并把那段代码置空，燃火就不会影响我们调试了，所以打个脚本断点试试看，看看能不能断住

![](https://attach.52pojie.cn/forum/202507/25/163842zz1ve2hiskokaz1s.png)

可以看到是可以断住的，大家一定不要等它加载完成，不然就过了，并且还能搜到这段话，所以进去看看，它里面的逻辑是什么样的

![](https://attach.52pojie.cn/forum/202507/25/164057ix4ppn7y9kr9rrkv.png)

它跑到这里执行了这个e方法，然后进去看看

![](https://attach.52pojie.cn/forum/202507/25/164125s8ett4b212trlt8b.png)

![](https://attach.52pojie.cn/forum/202507/25/164149btuzuneq6qndxlt7.png)

兄弟们，怎么样，是不是就是这里， 就是window.close(),window.history.back()这两个在里面作怪，里面有一个f,h方法，就是控制检测调试的，所以我们把 这两个方法置空就行

![](https://attach.52pojie.cn/forum/202507/25/164250yyymcc9pdweyfvip.png)

现在就可以抓到包了，不过这也只是刚刚开始，今天我们来看看里面的ymg\_ssr参数，看看他的生成逻辑，学习一下他的加密方式先搜关键字看看有没有

![](https://attach.52pojie.cn/forum/202507/25/164325l63brh22a5bzh510.png)

有一个，应该就是了，过去看看

![](https://attach.52pojie.cn/forum/202507/25/164407caj4fzhh6jzbjb7f.png)

果然是，在进去看看，这个参数是由两段时间戳加上一个加密字符串生成的

![](https://attach.52pojie.cn/forum/202507/25/164457owmr7c7ep5y8z6hr.png)

兄弟们，这个是什么，这个是不是就是我们要的加密字符串，跟栈分析一下他就出来了，传一个内容两个参数这个是什么加密，我也忘了，不懂就问ai吧

![](https://attach.52pojie.cn/forum/202507/25/164551n7cvvafezr95h47e.png)

大家看看，熟不熟悉，就是一个AES加密，还是标准的，所以接下来就很简单了，让ai帮我们用nodejs模拟出来就可以了

![](https://attach.52pojie.cn/forum/202507/25/164639lnrsuu11sakkxtzn.png)

到这里，我们今天的分析也就差不多了，会用工具就是快，代码大概30行，还是非常简单

![](https://attach.52pojie.cn/forum/202507/25/164755uog82fntsftwau09.png)

最后我们验证一下结果,看看能不能拿到数据

![](https://attach.52pojie.cn/forum/202507/25/164828ehd5s0dsquus3f5z.png)

还是没问题，响应200其实用dp也就20来行代码，还非常简单，大家喜欢哪一种方式呢？
