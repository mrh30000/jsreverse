# Webpack改写实战案例（三）

> **作者**: QingYi. | **发布时间**: 2021-08-07 19:01:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4193 / 7
> **原文**: [https://www.52pojie.cn/thread-1490174-1-1.html](https://www.52pojie.cn/thread-1490174-1-1.html)

---

打开我们的网站抓包  aHR0cHM6Ly93d3cuamRqMDA3LmNvbS8=

![](https://attach.52pojie.cn/forum/202108/07/163151st21p2pjgd12jpzg.png)

追栈

![](https://attach.52pojie.cn/forum/202108/07/163308j5nl9gvbc5k2ij59.png)

我们可以看到这边打开了一个东西，可以看到里面的参数是带sign的

![](https://attach.52pojie.cn/forum/202108/07/165018u3s8t3n9thcnl1hn.png)

我们往上追，追到这边发现这里面的参数是不带sign的，可能是在这个区域块添加了一些奇奇怪怪的参数进去

![](https://attach.52pojie.cn/forum/202108/07/165206a88lyi513iizq1o1.png)

我们再回到上一个调用他的地方，发现没值，这下更加确定了我们的想法

![](https://attach.52pojie.cn/forum/202108/07/165435t3dj8rp1pcd6y38j.png)

其实他是在这边做了手脚

![](https://attach.52pojie.cn/forum/202108/07/165524n75t6nx77icyet6i.png)

点进来

![](https://attach.52pojie.cn/forum/202108/07/183654yiitn6z6fzfiimd6.png)

注意这个n i  a之间的关系

我们现在要拿到i，i又是n.n(a),a又是n(156)，所以我们先把n(156)拿出来

![](https://attach.52pojie.cn/forum/202108/07/183953fujr0sqhuq9zjlxw.png)

点进来看，顺带找到调用的函数的位置，提取出来

![](https://attach.52pojie.cn/forum/202108/07/184137o782vi20gzq9hhld.png)

我们可以看到这边call的地方是webpack，我们拿出来改写，顺带把刚刚那个抠出来的函数放进去

![](https://attach.52pojie.cn/forum/202108/07/184635dicoc1jfi9jzihbm.png)

改写完之后完美运行

![](https://attach.52pojie.cn/forum/202108/07/184831lsrbmmzrbmtb232r.png)

拿到浏览器里面看看

![](https://attach.52pojie.cn/forum/202108/07/185157iu55lcmv8g8m5cgm.png)

我们n拿到了，现在是不是就差这一块，我们先把157拿出来

![](https://attach.52pojie.cn/forum/202108/07/185258igqbpsztgsqig0gi.png)

找到

![](https://attach.52pojie.cn/forum/202108/07/185429fyyj22drnnxz2xsr.png)

修改一下，完成

![](https://attach.52pojie.cn/forum/202108/07/190047yd5majd1dwllymj5.png)

里面还有一些细节方面的东西，需要大家去注意。
