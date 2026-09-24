# 【Typescript】解析斗鱼直播源

> **作者**: thepoy | **发布时间**: 2022-01-18 23:28:00 | **版块**: 『编程语言区』 | **查看/回复**: 8875 / 24
> **原文**: [https://www.52pojie.cn/thread-1577771-1-1.html](https://www.52pojie.cn/thread-1577771-1-1.html)

---

*本帖最后由 thepoy 于 2022-8-31 22:51 编辑*

想写一个支持多平台的解析，从斗鱼开始，嗯，当前也只支持斗鱼。
https://gitee.com/thepoy/live-stream
或
https://github.com/thep0y/live-stream

为什么写这个工具？
有人用 python 写了一个解析工具，但我扫了一眼，主要代码跟 python 无关，需要使用 pyexecjs 执行核心的构造请求参数的函数的代码。
这又是何必呢？
斗鱼的js代码是动态更新的，每次请求房间页面后生成的js代码可能都不同，每次生成的js代码都只能用几秒到十几秒的时间，过了这个时间就失效了，可能返回非法请求或返回403。
既然斗鱼的js无法用python重写，那就直接用js运行不就好了？
于是我就写了这个小工具。
仅供娱乐。
话说斗鱼是不是有病？直播源弄得跟多有价值的数据似的，也不跟人家B站学学，直播源都是明文，随便任何人调用。

## Live Stream

##### 介绍

斗鱼、B站直播源链接解析工具。

##### 安装教程

1. **安装依赖**

   克隆

   ```
   git clone https://gitee.com/thepoy/live-stream
   ```

   并进入项目目录后

   ```
   yarn
   # 或
   pnpm install
   ```
2. **编译安装**

   ```
   yarn build
   # 或
   pnpm build
   ```
3. **windows 中需注意**
   如果你在用 yarn，yarn 的命令目录可能不在 Path 中，也就是说编译安装后无法调用`live`命令，需要将 yarn 的 Scripts 目录放在用户环境变量的 Path 中。
   yarn 的 bin 目录路径请用下面的命令查看：

   ```
   yarn global bin
   ```

   将输出的目录添加到环境变量后重新打开`powershell`或`cmd`就可以执行`live`了。

##### 使用说明

当前只完成了斗鱼直播源的获取，因为我偶尔用斗鱼看看直播，其他平台暂无需求，留待以后更新。

编译安装后在 npm 的全局 bin 目录中会有一个`live`命令，传入房间号即可解析出直播源：

![1111.png](https://s2.loli.net/2022/08/31/x2DLSFG8B4wjmN1.png)
