# 网马解密大讲堂——网马解密中级篇005(Shellcode篇)

> **作者**: roxiel | **发布时间**: 2009-08-20 11:16:00 | **版块**: 『病毒分析区』 | **查看/回复**: 9972 / 8
> **原文**: [https://www.52pojie.cn/thread-31101-1-1.html](https://www.52pojie.cn/thread-31101-1-1.html)

---

by kongzi

一. 什么是shellcode

      1996年，Aleph One在Underground发表了著名论文《SMASHING THE STACK FOR FUN AND PROFIT》，其中详细描述了Linux系统中栈的结构和如何利用基于栈的缓冲区溢出。在这篇具有划时代意义的论文中，Aleph One演示了如何向进程中植入一段用于获得shell的代码，并在论文中称这段被植入进程的代码为“shellcode”。
      后来人们干脆统一用shellcode这个专用术语来通称缓冲区溢出攻击中植入进程的代码。这段代码可以是出于恶作剧目的的弹出一个消息框，也可以是出于攻击目的的删改重要文件、窃取数据、上传木马病毒并运行，甚至是出于破坏目的的格式化硬盘等等。请注意本章讨论的shellcode就是这种广义上的植入进程的代码，而不是狭义上的仅仅用来获得shell的代码。

> Shellcode网马特征：以相同分隔符（一般为%u）分隔的4位一组的十六进制字符串。

解密方法：

1.对于直接使用%u来分隔的shellcode，通过两次esc可以直接解密出网马地址。
2.对于通过类shellcode形式加密的网马，可以通过将代码进行适当处理（将代码替换为分隔符%u），再进行两次esc解密

接下来我们还是以详细的实例讲解以shellcode加密的网马，如何使用freshow工具来解密:

> Game54EBGame758BGame8B3CGame3574Game0378Game56F5Game768BGame0320Game33F5Game49C9GameAD41GameDB33Game0F36Game14BEGame3828Game74F2GameC108Game0DCBGameDA03GameEB40Game3BEFGame75DFGame5EE7Game5E8BGame0324Game66DDGame0C8BGame8B4BGame1C5EGameDD03Game048BGame038BGameC3C5Game7275Game6D6CGame6E6FGame642EGame6C6CGame4300Game5C3AGame2e55Game7865Game0065GameC033Game0364Game3040Game0C78Game408BGame8B0CGame1C70Game8BADGame0840Game09EBGame408BGame8D34Game7C40Game408BGame953CGame8EBFGame0E4EGameE8ECGameFF84GameFFFFGameEC83Game8304Game242CGameFF3CGame95D0GameBF50Game1A36Game702FGame6FE8GameFFFFGame8BFFGame2454Game8DFCGameBA52GameDB33Game5353GameEB52Game5324GameD0FFGameBF5DGameFE98Game0E8AGame53E8GameFFFFGame83FFGame04ECGame2C83Game6224GameD0FFGame7EBFGameE2D8GameE873GameFF40GameFFFFGameFF52GameE8D0GameFFD7GameFFFFGame7468Game7074Game2f3aGame682fGame6f61Game6978Game3161Game2e38Game6f63Game2f6dGame6978Game2f61Game3566Game632eGame7373Game0000

上述代码实际上是一个典型的shellcode，
我们先来简单分析一下，根据shellcode特征：以相同分隔符（一般为%u）分隔的4位一组的十六进制字符串。
我们看到上述代码有很多的Game这个单词，每个Game之间的字符都是4位，刚好符合shellcode的特征，那么我们先尝试将Game替换为%u后再进行解密。

我们先将上述代码复制粘贴在freshow的上操作区域，利用freshow工具的Replace功能进行字符串的替换，具体操作方法，详见下列截图：
在这里我们在过滤选项选择Replace，此时filter右边的两个方框为编辑状态，我们要替换的内容输入，点击filter按钮进行替换操作。

![](https://attach.52pojie.cn/forum/month_0908/0908201116535617035c941e8e.jpg)

点击filter替换后，
将下操作区域的替换后的代码，点击up按钮上翻至上操作区域，进行两次的esc操作，解出网马的下载地址，详细操作见下列截图：

![](https://attach.52pojie.cn/forum/month_0908/09082011163a82305a93d6d882.jpg)

![](https://attach.52pojie.cn/forum/month_0908/0908201116274ad2f727ad3551.jpg)

附 Malzilla方法

![](https://attach.52pojie.cn/forum/month_0908/09082011163a522e9fbfdc798c.jpg)

![](https://attach.52pojie.cn/forum/month_0908/09082011162e7704823862f65a.jpg)

![](https://attach.52pojie.cn/forum/month_0908/0908201116f2d4e16eb25b2d01.jpg)
