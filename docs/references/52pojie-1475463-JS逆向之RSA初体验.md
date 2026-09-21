# JS逆向之RSA初体验

> **作者**: QingYi. | **发布时间**: 2021-07-13 18:12:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4346 / 8
> **原文**: [https://www.52pojie.cn/thread-1475463-1-1.html](https://www.52pojie.cn/thread-1475463-1-1.html)

---

*本帖最后由 QingYi. 于 2021-8-26 11:25 编辑*

首先打开我们的网站：<http://login.shikee.com/>

打开开发者工具，抓包

![](https://attach.52pojie.cn/forum/202107/13/164350pgig5chbs5vbmnnm.png)

我们可以看到数据是加密的，我们全局搜索一下

我就不带大家去找了，就给大家直接定位到这边吧。 大家以后去找是需要一个一个去找的。

可以看到关键字眼 RSA  可以推测是是RSA加密

![](https://attach.52pojie.cn/forum/202107/13/170218ykrcfrrehcp5rtff.png)

打个断点看看 是什么玩意，我们可以看到 他在这边停下来了

![](https://attach.52pojie.cn/forum/202107/13/170315yo7zh322hf0io2uf.png)

我们可以看到，这边判断是password才进行加密，我们看看password是什么东西

![](https://attach.52pojie.cn/forum/202107/13/174550aaang0bfk4zedki4.png)

这边是把id为loginForm的内容序列化了

![](https://attach.52pojie.cn/forum/202107/13/174725s2gc3yvy8ooilcmr.png)

内容像不像我们表单里面的数据

![](https://attach.52pojie.cn/forum/202107/13/174808h63o68y11f66yfii.png)

表单里面的数据：

![](https://attach.52pojie.cn/forum/202107/13/174836y73zgz19gvf79jw7.png)

我们发现它通过这一段代码加密了密码，把key和 密码传进去进行加密了

![](https://attach.52pojie.cn/forum/202107/13/175013ibb7ricac7w8r7vz.png)

然后这个key 又是什么东东呢？

![](https://attach.52pojie.cn/forum/202107/13/175148c4o677v6vzmevo55.png)

我们可以看到key是这个东西，实例化出来一个，我们点进去函数看看

![](https://attach.52pojie.cn/forum/202107/13/175251lkdwoekqwklklkkf.png)

点进来之后是需要扣函数的，我就不扣函数了，我就直接全部复制出来了

然后我们看这个加密的密码 是不是在这边加密，我们来写一下

![](https://attach.52pojie.cn/forum/202107/13/175505smvehmzvti8s8ovh.png)

然后我们发现这个rsa\_n 不知道是什么东西，他在哪？

我们全局搜索一下可以发现他在这里

![](https://attach.52pojie.cn/forum/202107/13/175829dzl3llhmmzptajpe.png)

我们复制出来拿过来用

然后我们怎么得到密码呢，其实这个加密之后的函数返回的就是我们需要的东西了

![](https://attach.52pojie.cn/forum/202107/13/180149cjac5zoiddjwguv4.png)

拿过来改写一下

![](https://attach.52pojie.cn/forum/202107/13/180245lleln4z14l3kekwe.png)

格式化并加载一下 运行

\*这里必须先加一个这个：setMaxDigits(131);     本来想后面和大家讲的，只能先加过来了，不然会卡死\*

好 到这里教程就结束了
