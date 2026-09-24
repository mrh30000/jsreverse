# 小白hook网站cookie步骤详解

> **作者**: liuzhik | **发布时间**: 2024-03-14 11:45:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 5266 / 39
> **原文**: [https://www.52pojie.cn/thread-1900424-1-1.html](https://www.52pojie.cn/thread-1900424-1-1.html)

---

*本帖最后由 liuzhik 于 2024-3-14 11:48 编辑*

#### 前言

```
小白，想要爬取目标网站：aHR0cHM6Ly93d3cuZW1zLmNvbS5jbi8=
但是不想要用selenium等图形化方式，就开始研究怎么通过接口方式获取信息。
但是网上一些教程对纯小白来说还是太高深了，hook很多都是一笔带过，这边试验过后，记录下前期的一些基础操作
```

#### hook脚本

```
// 定义 hook 脚本，这样，代码读写cookie的时候，就会断点停下来，方便分析了
Object.defineProperty(document, 'cookie', {
        get: function() {
            debugger;
            return "";
        },
        set: function(value) {
            debugger;
            return value;
        },
});
```

#### 插入过程

1. 清空目标网站 cookie

   ![](https://attach.52pojie.cn/forum/202403/14/114224wdrf1l8edwirw7no.png)

   算了，不打码了
2. 在目标网站界面，按F12打开network, 选中Preserve log, 保留每个请求

   ![](https://attach.52pojie.cn/forum/202403/14/114226vdhoipb681n08ybo.png)

找到第一个请求, 右键点击open in sources panel, 在源码顶端加上断点

![](https://attach.52pojie.cn/forum/202403/14/114228j3np1pi1pfppv2zl.png)

3. 在初始界面打上断点后，回到Cosole, 粘贴hook脚本

   ![](https://attach.52pojie.cn/forum/202403/14/114230ie118ev8o7erl8ee.png)
4. 继续运行, 成功找到设置cookie的位置

   ![](https://attach.52pojie.cn/forum/202403/14/114232mccnt99wnv3of9it.png)

#### TODO 继续分析

再往后貌似抠代码了，学习中...
