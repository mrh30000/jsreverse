# JS逆向之EVAL加密初體驗

> **作者**: QingYi. | **发布时间**: 2021-07-21 11:29:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3396 / 10
> **原文**: [https://www.52pojie.cn/thread-1479508-1-1.html](https://www.52pojie.cn/thread-1479508-1-1.html)

---

*本帖最后由 QingYi. 于 2021-7-21 12:03 编辑*

首先打開我們的網址：<https://passport.kongzhong.com/>

登錄之後 抓包，看見response是這個東西，先不用去管，點開我們的headers信息 看post加密的有什麼東西

![](https://attach.52pojie.cn/forum/202107/21/111026p634puq0oigcg36y.png)

看到是ajax請求，加密的只有密碼，我們去搜索

![](https://attach.52pojie.cn/forum/202107/21/111110zoffoi96je4li6zv.png)

我就不帶大家去找了，自己告訴你們是在login-handle這邊，其實也見名知意啦

![](https://attach.52pojie.cn/forum/202107/21/111315lbwh2ni266h6iitc.png)

這個大家知道是什麼嗎。

應該是混淆，我們把我們Chrome裡面的東西設置一下看看

![](https://attach.52pojie.cn/forum/202107/21/111525jj1v0qfv3e1m0q3e.png)

勾選它

![](https://attach.52pojie.cn/forum/202107/21/111548c2hubcflun4b2ufg.png)

Make sure 'Search in anonymous and content scripts' is checked in the DevTools Preferences (F1). This will return results from within iframes and HTML inline scripts:

但是 我們還是不知道password在哪兒加密呀
我們再來搜索一下看看

![](https://attach.52pojie.cn/forum/202107/21/111712cnyooe042035ngkn.png)

再來搜索一下password 有四個，不確定是password就要打斷點，我已經知道是那個了，所以我就不演示了

![](https://attach.52pojie.cn/forum/202107/21/111949nrbbi228bpz6in8j.png)

好 斷點下來了，密碼也是明文，我們把這個摳出來看看

![](https://attach.52pojie.cn/forum/202107/21/112110mkjghv5ihsohvai5.png)

好，我們點進去

![](https://attach.52pojie.cn/forum/202107/21/112141nn9nvvcteewwed9o.png)

其實就是在同一個文件下面，我們全部拿出來，進行改寫吧

![](https://attach.52pojie.cn/forum/202107/21/112341qouihiz1zxdxu64o.png)

然後它告訴我們這個沒定義，不知道是什麼東西，

![](https://attach.52pojie.cn/forum/202107/21/112522nrafzra0fa6fy70a.png)

這個你們自己去思考，我已經有提示過了，我就直接把值拿過來了

在我搞定上面那個數據之後，又告訴我說，好像不行，沒有定義

![](https://attach.52pojie.cn/forum/202107/21/112654zwylknezbcaban5t.png)

咋回事啊？

我們看到這個是this調用的，而且前面是login方法， 之前是不是看見一個encrypt方法？ 那最外面那層函數是什麼呢？

![](https://attach.52pojie.cn/forum/202107/21/112806fuuu7t7oboqx7o7q.png)

是它

![](https://attach.52pojie.cn/forum/202107/21/112827hdyauyuwrm0ywfyf.png)

完美

![](https://attach.52pojie.cn/forum/202107/21/112903kugfu3zs93zdola3.png)

每天花半個小時 或者一個小時來給大家寫一些東西，希望大家也能學習一些新東西。
