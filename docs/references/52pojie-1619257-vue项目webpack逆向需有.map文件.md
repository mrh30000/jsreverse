# vue项目webpack逆向需有.map文件

> **作者**: zhanghao521 | **发布时间**: 2022-04-09 21:24:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 10808 / 38
> **原文**: [https://www.52pojie.cn/thread-1619257-1-1.html](https://www.52pojie.cn/thread-1619257-1-1.html)

---

朋友有一个前后端分离的项目，想更换前端，发现之前的前端是经webpack加密了，分析后是用的vuecli工具创建生成的，目录为下：

![](https://attach.52pojie.cn/forum/202204/09/212019a04pc077dqzq30dd.png)

无奈本人没有原先的vue文件，想做项目更快点，需要查看到源文件各种vue内容，经过反复测试现研究结果如下：
第一步：全局安装：npm install --global shuji
第二步在目录终端运行：shuji  app.f2e0831f81bd3fda8015.js.map -o folder

![](https://attach.52pojie.cn/forum/202204/09/211940s7aowf3ax743wvo3.png)

这里的folder是生成文件的目录，最终生成的目录文件如下

![](https://attach.52pojie.cn/forum/202204/09/212156ikuyybgo7bnjcaug.png)

![](https://attach.52pojie.cn/forum/202204/09/212302xwwqqpheaomqrmaq.png)

生成的很完美！注意要以管理员身份运行vscode哈，特此发次教程分享，希望对大家有用。
