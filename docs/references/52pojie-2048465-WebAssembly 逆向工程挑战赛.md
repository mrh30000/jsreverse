# WebAssembly 逆向工程挑战赛

> **作者**: 漁滒 | **发布时间**: 2025-07-25 09:47:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4058 / 25
> **原文**: [https://www.52pojie.cn/thread-2048465-1-1.html](https://www.52pojie.cn/thread-2048465-1-1.html)

---

@[TOC](WebAssembly 逆向工程挑战赛)

### 前言

最近在群聊中有群友分享了一条连接，是github上创建的一个[WebAssembly 逆向工程挑战赛](https://juliendoutre.github.io/warec/index.html)

![](https://attach.52pojie.cn/forum/202507/25/094532b3082b222q8qeeit.jpg)

从主页中可以看到，题目全都是通过hash函数计算出了一个sha256的值，需要找到它的原始值，并且原始值都是flag{...}的格式，这是比较常规的格式

再查看一下网站的FAQ

![](https://attach.52pojie.cn/forum/202507/25/094536cal1tayqlww1abko.jpg)

可以看到作者允许公开发布答案，所以有了这一份水贴

### 第一题

打开f12，进入到第一题中，可以看到直接显示了sha256的结果

![](https://attach.52pojie.cn/forum/202507/25/094541slmks1golu2lzaao.jpg)

从网络请求中可以看到加载了一个wasm文件【level1.wasm】和对应的胶水代码【wasm\_exec.js】

根据胶水代码可以看出是使用go语言编写的

![](https://attach.52pojie.cn/forum/202507/25/094545tcgvgk8makqcg7gv.jpg)

然后多次刷新页面可以发现，得出的结果是不变的，同时在网页中也没有明确的提示为动态的flag，那么可以暂且认为这是一个静态的flag

既然题目是从摘要算法中找到原文，那么使用的摘要算法大概率也是标准算法，虽然不认识go，但是可以问问豆包go怎么计算sha256

![](https://attach.52pojie.cn/forum/202507/25/094549i46ygmzgrrlt4li2.jpg)

豆包给出了使用crypto/sha256这个包下的Sum256方法，那么就在wasm中搜索这个方法

![](https://attach.52pojie.cn/forum/202507/25/094553kvvdnfvmv5onnvzt.jpg)

可以搜索到4处，说明符号名没有被去除，直接在调用处下一个断点，然后刷新，可以成功在断点中断下

此时骚操作就来了，接下来就开始计算sha256了，那么明文基本就已经存在内存中，那么尝试直接从内存中查找flag

![](https://attach.52pojie.cn/forum/202507/25/094558ky94g9rkkyvfqgxv.jpg)

非常轻松的就找到flag为flag{plaintext\_secrets\_are\_the\_best}

此时计算一下找到的这个flag的sha256为edfc492f382f96b9f2a8838f911c11609585fd762fe4264dd18de26acf355462，与网页的一致，说明成功了

### 第二题

第二题的方法和第一题一模一样

![](https://attach.52pojie.cn/forum/202507/25/094603y77ddkr7c66dc5ek.jpg)

可以直接通过内存查找到flag为flag{doing\_crypto\_like\_a\_pro}，经过sha256后也与网页中的一致

### 第三题

第三题依然可以使用相同的方法，就是wasm文件比较大，等待时间会久一点

![](https://attach.52pojie.cn/forum/202507/25/094607d0lrjr0nrhihe70j.jpg)

找到的flag为flag{requesting\_urls\_be\_like}，经过sha256后也与网页中的一致

那么第三题有没有没那么卡的方法呢？那也是有的

在【wasm\_exec.js】的【syscall/js.copyBytesToGo】方法内下一个断点，刷新后很快就断下来了，此时的src就是原文flag

![](https://attach.52pojie.cn/forum/202507/25/094612tatai1ojebtqjtzi.jpg)

也可以直接看到flag

三题都水完了，结束！！！
