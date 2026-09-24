# 【教程】Circle 阅读助手付费功能解锁

> **作者**: hualy | **发布时间**: 2024-07-03 11:20:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 7573 / 26
> **原文**: [https://www.52pojie.cn/thread-1940437-1-1.html](https://www.52pojie.cn/thread-1940437-1-1.html)

---

*本帖最后由 hualy 于 2024-7-5 16:13 编辑*

基于**[like御坂美琴](https://www.52pojie.cn/home.php?mod=space&uid=1377893)****[****javascript****][chrome插件]Circle 阅读助手 v3.1.2 逆向笔记**https://www.52pojie.cn/thread-1940297-1-1.html
具体思路可看上面那位大佬的文章
本文章教你如何在本地解锁付费功能打开扩展页面，找到Circle 阅读助手插件，点击详情

![](https://attach.52pojie.cn/forum/202407/03/111641nmhqamw4tut4r1wq.png)

复制ID：dhpfcgilccfkodnhbllpiaabofjbjcbg

![](https://attach.52pojie.cn/forum/202407/03/111644w0fz3fkbxon83kzk.png)

找到文件存储位置，我这里用Everything查找

![](https://attach.52pojie.cn/forum/202407/03/111646p6jqjwxz0jedqo3x.png)

找到controller下的setting.js文件

![](https://attach.52pojie.cn/forum/202407/03/111649d1b7v7s9ubxa1u7d.png)

打开文件，然后Ctrl+H替换内容，内容如下代码：

[JavaScript] *纯文本查看*

```

return (0, t.useContext)(i);
```

[JavaScript] *纯文本查看*

```

let temp = (0, t.useContext)(i);
        temp.app.user = {
          roles: ["premium", "member"],
        };
        return temp;
```

![](https://attach.52pojie.cn/forum/202407/03/111651ns33j49fa2pd2ifd.png)

保存后，即可成功解锁付费功能,效果如下

![](https://attach.52pojie.cn/forum/202407/03/111653azu8ufh9jzhpp0d7.png)

如果已经缓存页面了的，重新刷新页面即可
