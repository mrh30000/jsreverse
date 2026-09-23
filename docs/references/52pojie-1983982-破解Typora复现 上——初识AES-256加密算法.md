# 破解Typora复现 上——初识AES-256加密算法

> **作者**: Pologue | **发布时间**: 2024-11-21 00:46:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 8075 / 99
> **原文**: [https://www.52pojie.cn/thread-1983982-1-1.html](https://www.52pojie.cn/thread-1983982-1-1.html)

---

### 目的

发表这篇帖子的目的主要是分享一些在破解Typora的AES加密过程中可能需要的背景知识和经验，希望能帮助一些和我一样的新手。

### 过程

#### 背景知识

* Typora采用的框架是Electron。
* 调试它的可执行文件还是得用上反汇编软件，例如IDA。
* asar是一种打包方式，可以直接用nodejs的asar提取出来，没有加密。
* AES是一种块加密，也就是把明文划分成相同大小的块再进行加密，加密用的密钥叫key。AES-128、192、256用到的key长度分别是16byte、24byte、32byte。这里Typora用到的是AES-256，所以key的长度是**32byte**。[^3][^4]

  ![](https://attach.52pojie.cn/forum/202411/21/003533fq1q3mzoveqdqo5d.jpg)

  ![](https://attach.52pojie.cn/forum/202411/21/004001sg4gpo6or22862ro.png)
* AES加密和解密会分别用到两个256byte的矩阵，叫SBox和InvBox。它们的值是固定的，所以可以通过IDA的FindCrypt插件找出来。
* 块加密有不同的模式，有CBC、ECB、CFB等等。其中ECB是每个明文块分别加密；CBC和CFB是把上一块的密文和当前块的明文做异或后再加密，区别是它们俩明文与密文做异或的时机不一样。在这里Typora用的是**CBC**模式。[^9]
* CBC这种加密方式需要在第一个加密的周期前面再加一个初始的“与明文做异或”的块，就叫iv(initial vector)。因为AES的块是一个4x4的格子，长度为16byte，所以iv的长度就是**16byte**。

#### 整体介绍

Typora通过app.asar里的main.node模块(实际为dll动态链接库文件)加载atom.js中关于验证license的代码，atom.js通过AES-256加密后用base64编码，以密文的形式存储。解密的过程就发生在main.node中。[^1][^2]

破解的思路是找到AES加密的key和iv，修改解密出来的验证license的代码，再将修改过的代码加密，替换掉原来的atom.js，再重新打包。所以整个过程大概可以分成两个部分：AES解密和patch JavaScript代码。因为不太熟悉后面这部分，估计还得花点时间搞，所以我打算下次再写。

听说还有一种更方便的方法是hook，不过我还没怎么搞明白。

#### 文件结构

在Typora的安装路径下，有Typora.exe可执行文件，它会使用resources/app.asar.unpacked中的main.node来动态加载app.asar，再解密里面的atom.js。我们自己打开app.asar后里面会3个文件，其他两个都不用管，重点关注这个atom.js就好了。

```
Typora
➜  tree -L 3
.
├── chrome_100_percent.pak
├── chrome_200_percent.pak
├── d3dcompiler_47.dll
├── DO NOT ADD FILES HERE
├── ffmpeg.dll
├── icudtl.dat
├── libEGL.dll
├── libGLESv2.dll
├── LICENSE
├── LICENSES.chromium.html
├── locales
│   ├── uk.pak
|   ...
│   ├── zh-CN.pak
│   └── zh-TW.pak
├── resources
│   ├── app.asar
│   ├── app.asar.unpacked
|   |   └── main.node
│   ├── appsrc
│   ├── assets
│   ├── conf.default.json
│   ├── Docs
│   ├── DO NOT ADD FILES HERE
│   ├── html
│   ├── lib.asar
│   ├── locales
│   ├── node_modules
│   ├── node_modules.asar
│   ├── package.json
│   ├── page-dist
│   ├── style
│   ├── updater
│   └── window.html
├── resources.pak
├── snapshot_blob.bin
├── Typora.exe
├── Typora.VisualElementsManifest.xml
├── unins000.dat
├── unins000.exe
├── v8_context_snapshot.bin
├── version
├── vk_swiftshader.dll
├── vk_swiftshader_icd.json
└── vulkan-1.dll
```

听说这个“chrome\_100\_percent.pak”“chrome\_200\_percent.pak”是Electron框架的一个特征。[^10](https://www.52pojie.cn/%5BElectron%E7%A8%8B%E5%BA%8F%E9%80%86%E5%90%91%EF%BC%88asar%E5%BD%92%E6%A1%A3%E8%A7%A3%E5%8C%85%EF%BC%89%5D%28https%3A/www.cnblogs.com/cc11001100/p/14290584.html%29)

简单提取一下：`npx asar extract app.asar app.asar.manual`

```
Typora/resources/app.asar.manual
➜  tree
.
├── atom.js
├── main.node
└── package.json
```

#### 步骤

1. 通过IDA打开main.node。IDA会自动识别文件类型，然后自动勾选一些选项。

   ![](https://attach.52pojie.cn/forum/202411/21/004101aiblpz8z8b7qkqlx.png)
2. `Shift+F12`打开字符串搜索，找到“./atom.js”，双击点进去，`F5`自动生成伪代码，估计就是用这个函数加载的密文。把函数名“sub\_xxxx”改成“load\_atomjs”这种方便理解的名字。点击函数名，按`N`即可修改，后面分析伪代码修改变量名也是这样。

   ![](https://attach.52pojie.cn/forum/202411/21/004104pd8778vitd14dk7n.png)

   ![](https://attach.52pojie.cn/forum/202411/21/004055o88k8lrsjjgf8x67.png)

   ![](https://attach.52pojie.cn/forum/202411/21/004057rnzn71xabl3lxrzf.png)
3. `Ctrl+Alt+F`使用FindCrypt插件，或者在工具栏Edit/Plugins/下点开，可以找到两个RijinDaelSBox和InvBox。第二个IDA的识别有一点错误，把后面的不相干的数据也划成InvBox的了，`小键盘*`修改Array的大小为256byte。我们要找解密的过程，所以要找用了InvBox的函数。双击InvBox进去，可以把函数重命名为“load\_invbox”。右边分号后面的是汇编代码的注释，可以看到“DATA XREF: sub\_xxxx”，这是IDA自动生成的，代表IDA找到的引用了这个数据的函数，可以双击点进去。

   ![](https://attach.52pojie.cn/forum/202411/21/004050ape8dssj8nwqjdje.png)

   ![](https://attach.52pojie.cn/forum/202411/21/004052fqhv4wz1s8tzk9v9.png)
4. 在汇编代码窗口按`X`查看当前函数的交叉引用，工具栏View/Graphs可以查看调用当前函数和当前函数调用的关系图。可以看到重命名后IDA自动把单纯调用“load\_invbox”的函数命名为了“j\_load\_invbox”。

   ![](https://attach.52pojie.cn/forum/202411/21/004106u5g234sxx2x2kc6c.png)
5. “load\_invbox”函数的伪代码的结构很像AES解密的流程[^8]，我们把其中的循环结构标记出来后就更清晰了。将伪代码中无意义的`v1`、`v2`的变量名重命名为有实际意义的变量名，以及通过`/`添加注释，可以降低理解代码的难度。

   ![](https://attach.52pojie.cn/forum/202411/21/004059fff0yun2iadb5hn2.png)
6. 找到表示密文的变量并重命名，下断点，动态调试，双击变量名。右键调试窗口的hex子窗口，synchronized with汇编窗口，再取消同步，多走几步可以看到数据一行一行地变为“require…”开头的明文。因为AES-256的key在做key expansion的时候，头两轮的key分别是原key的前后两段；而在解密中这两段key会用在最后两次AddRoundKey中。因为第一次找的时候我没找到key具体存放在哪里，所以我们可以异或密文和明文得到key来曲线救国。

   ![](https://attach.52pojie.cn/forum/202411/21/004047sxqzqttx593lqvtt.png)
7. 在旧版的Typora中，iv就是密文的前16byte，在1.9.5中已经不是了。奈何我实在没看懂iv到底是在哪里，所以我就求助于比较新的教程[^5](https://www.52pojie.cn/%5BTypora%E7%A0%B4%E8%A7%A3%E5%A4%8D%E7%8E%B0%5D%28https%3A/www.cnblogs.com/Here-is-SG/p/16749410.html%29)[^7](https://www.52pojie.cn/%5B%5B%E5%8E%9F%E5%88%9B%5D%E3%80%90%E6%9C%80%E6%96%B0%E3%80%91Typora%E6%9C%80%E6%96%B0%E7%89%88%E7%9A%84%E9%80%86%E5%90%91%E8%BF%87%E7%A8%8B%E5%88%86%E6%9E%90%5D%28https%3A/bbs.kanxue.com/thread-282319.htm%29)，把教程中标注为iv的变量标注为iv，动态调试得到它的值。
8. 在CyberChef中选择cbc模式解密失败，选择cbc/no padding模式成功了，但是明文的末尾有一串非ascii字符串。我猜测是CyberChef自动去除padding时不能判断哪里是padding。

#### 其他

* IDA的颜色

  1,2两篇教程的ida的theme都设置成了护眼的黑色，而非默认的米黄色，第2篇米黄色背景的软件是x64dbg
* CyberChef

  第1篇教程保存按钮的软件是notepad++，两篇都用到了[CyberChef](https://cyberchef.org/)（BAKE！）

### 参考链接

[^1]: [**[原创] Typora 授权解密与剖析**](https://www.52pojie.cn/thread-1553967-1-1.html)
[^2]: [**[原创] Typora 1.0.4版本破解复现**](https://www.52pojie.cn/thread-1968245-1-1.html)

[^4]: [CTF Wiki AES](https://ctf-wiki.org/crypto/blockcipher/aes/)
[^5]: [[原创]Typora 破解 之 逆向分析（上）](https://bbs.kanxue.com/thread-272538.htm)

[^8]: [从零实现 AES 加密算法](https://sxyz.blog/aes-from-scratch/)
[^9]: [Block cipher mode of operation Wiki](https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation)
