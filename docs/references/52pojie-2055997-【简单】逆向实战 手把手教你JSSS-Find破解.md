# 【简单】逆向实战 手把手教你JSSS-Find破解

> **作者**: YIXIN3 | **发布时间**: 2025-08-26 16:53:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4904 / 23
> **原文**: [https://www.52pojie.cn/thread-2055997-1-1.html](https://www.52pojie.cn/thread-2055997-1-1.html)

---

## 【简单】逆向实战 手把手教你JSSS-Find破解

这里破解的是比较早一些的3.9.9版本，网上已经有破解版了，本教程仅供学习。

#### 工具介绍

JSSS-Find：一款自动化 JavaScript 分析和安全审计工具
JSSS-Find 是一款功能强大的命令行工具，专为开发者和安全研究人员设计，用于自动分析和测试 Web 应用程序的安全性。其核心功能是从给定的 URL 或本地目录提取并仔细检查 JavaScript (JS) 文件，以发现潜在的漏洞。

JSSS-Find 的核心功能是自动发现可能嵌入在 JavaScript 代码中的端点、API 和敏感信息。通过解析 JS 文件，它可以绘制应用程序的结构，识别潜在的攻击面。

#### 开始逆向

开始逆向之前先打开软件是什么样子的。
（逆向的核心就是对程序的了解程度）

![](https://attach.52pojie.cn/forum/202508/26/164651tsvszbj2fd2k7k8j.png)

`可以发现程序运行后，需要输入授权密钥`
输错3次后就退出程序。对程序有了2.5分的了解，坤够了。

#### 进入ida

ida 打开，直接选择JSSS-find。

![](https://attach.52pojie.cn/forum/202508/26/164730pfrm8nj342vfjvyv.png)

找到万能入口 `main` 函数

很好，映入眼帘的就是想要的函数。

![](https://attach.52pojie.cn/forum/202508/26/164733eczv4hcz24bhl82e.png)

`main_authCheck`   用屁股想都能知道是认证函数
`os_Exit`     用屁股想都能知道是退出函数
而且程序是输入3次就退出的。
当输入3次错误就执行到了 os\_Exit函数。

woo  形成了闭环。

#### 打断点

![](https://attach.52pojie.cn/forum/202508/26/164735gkken4un747t2vke.png)

`F2`在
`jbe     loc_A28B9E`
`call    main_authCheck`
`jnz     short loc_A278B3`
打上断点方便调试。

#### 动态运行

`F9` 开始执行

![](https://attach.52pojie.cn/forum/202508/26/164737g2z82izonj4kc06m.png)

再次按F9，让程序运行到
`call    main_authCheck`

为什么？因为要进到认证函数里面看。

F7  步入函数。

![](https://attach.52pojie.cn/forum/202508/26/164741cs5mydymhob7i3o9.png)

F8  进行执行

当程序走了分支点这，打个断点。
为什么？因为前路我摸过，没路。

#### 修改函数

将jnz 改为  jz

jnz  的意思是 不为0
jz 的意思是 为0

![](https://attach.52pojie.cn/forum/202508/26/164743jqs5jccqyrojy10y.png)

改成jz 为0 ，就能走图中箭头的分支了。

进行F8走。

![](https://attach.52pojie.cn/forum/202508/26/164745eoof44b5voojroos.png)

终于到这了， `os_Exit`

需要绕过  `os_Exit`

这次   ikun 们   懂了吧？

![](https://attach.52pojie.cn/forum/202508/26/164747yfhkm4rf3iffkyk3.png)

将 jz 改为  jnz
为0改为不为0

绕过   `os_Exit`

进行`F8`  大步向前走

![](https://attach.52pojie.cn/forum/202508/26/164750wo4j40qrrqeo4fkz.png)

看看程序
好像出来了，`露头了`

#### 露头就秒

试试，就修改这两处，打补丁。

![](https://attach.52pojie.cn/forum/202508/26/164752kdsdrfjqbjwnlzj4.png)

`完美` 运行。nice

![](https://attach.52pojie.cn/forum/202508/26/164809t508f51fdtd00r30.png)
