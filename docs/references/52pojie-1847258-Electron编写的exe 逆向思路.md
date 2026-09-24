# Electron编写的exe 逆向思路

> **作者**: xiqing | **发布时间**: 2023-10-22 14:08:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 13608 / 13
> **原文**: [https://www.52pojie.cn/thread-1847258-1-1.html](https://www.52pojie.cn/thread-1847258-1-1.html)

---

### 可以看到post是加密的

csdn也是我自己 ,   俺是个新人欢迎交流。

![](https://attach.52pojie.cn/forum/202310/22/140314kn73j788bt0n700z.png)

---

### 我们看看这个应用的文件夹

![](https://attach.52pojie.cn/forum/202310/22/140501e2sqm54opmp2qy84.png)

看到了 app.asar 很明显是Electron编写的

## 一、Electron是什么？

> Electron 是一个使用 JavaScript、HTML 和 CSS 构建跨平台的桌面应用程序。它基于 Node.js 和 Chromium，被 Atom 编辑器和许多其他应用程序使用。

Electron 兼容 Mac、Windows 和 Linux，可以构建出三个平台的应用程序。

## 二、怎么逆？

Electron 类似小程序  ，打包之后可以解包  由js编写 命令如下

```
npm install asar -g
cd apps
asar extract app.asar app //解压拿到源码
asar pack app app.asar //重新打包
```

解包之后直接搜关键字

可以看到搜索到很多 ，但是编译后压缩了
但是可以通过进行格式化
<https://www.sojson.com/jsjiemi.html>
但是格式化之后代码红了 这样肯定是重新打包不了
不过无所谓了 ，方便看就行

![](https://attach.52pojie.cn/forum/202310/22/140603kiuoo5u5svmm0mmi.png)

怎么调试呢 猜肯定不行  有个简单粗暴的办法， 把可能出现的地方加上。

console.log("1");
console.log("2");
console.log("3");
console.log("4");
然后打包替换回去运行就行了。

问题来了  ，哪里输出打印结果呢
可以通过Debugtron

<https://github.com/pd4d10/debugtron>

Debugtron是什么 ，他可以强制打开Electron 的调试模式  ，     让他像浏览器f12一样 。

![](https://attach.52pojie.cn/forum/202310/22/140623zueizibgwppetj2y.png)

中间有个问题为什么不直接用Debugtron 直接像网页一样打断点。

问就是编译之后压缩了调试不方便。

根据通过打印找到关键的代码。

![](https://attach.52pojie.cn/forum/202310/22/140632hrvix4miez4dlzlh.png)

扣出来试试。

![](https://attach.52pojie.cn/forum/202310/22/140645h9vrjx9j7k27lzz9.png)

可以看到不对,  这是为什么呢， 也确实调用了，莫非调用之后， 还执行了别的?
那就继续加console.log接着找调用。

如下

![](https://attach.52pojie.cn/forum/202310/22/140751kbx59b5axbxit996.png)

可以看到确实又进行了一次 base64。
我们抠出代码再试试。

![](https://attach.52pojie.cn/forum/202310/22/140702xxxbwwsp5bkwkbp1.png)

完美！         csdn也是我自己 ,   俺是个新人欢迎交流。
