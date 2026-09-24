# 【Chrome插件】Chrome插件修改教程（一款GitHub的插件为例，附样品）

> **作者**: 涛之雨 | **发布时间**: 2020-07-08 17:50:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 59576 / 600
> **原文**: [https://www.52pojie.cn/thread-1215596-1-1.html](https://www.52pojie.cn/thread-1215596-1-1.html)

---

*本帖最后由 涛之雨 于 2020-10-12 17:17 编辑*

2020年10月12日补：
当前最新版已混淆，关键词和流程均有大改动，
需要动态调试（本文中有教程）
可以下载比较

> [Chrome插件]GitHub插件 Octotree修改版 V6.1.1
> https://www.52pojie.cn/thread-1282835-1-1.html
> (出处: 吾爱破解论坛)

（本文的样本存在严重bug！请使用上述新版）
当然。。研究学习修改插件是没问题的

长文警告！全文共3736个汉字（不包含非MD部分，56张图片。）
![](https://i.loli.net/2020/07/08/4RyIXNKdCvasM9E.png)
Gitee分会场：<https://taozhiyu.gitee.io/Chrome_tutorial>
还是推荐在gitee看吧。

* gitee一开始有生成目录，由于目录过长，吾爱左边的目录显示不全（仅电脑端有）。
* 图床由【[gitee](https://www.52pojie.cn/gitee.com)】提供，虽然他不知道。（2020年7月10日23:17:26已全局改为吾爱本地图片，防断链）
* 编辑&预览由【[马克飞象](https://maxiang.io/)】辅助，虽然他也不知道。
* PDF打包及后期编辑由【[Typora](https://typora.io/)】生成，虽然他还是不知道。
* Chrome 开发者模式屏蔽由【[耍下](https://tools.shuax.com/chrome/)】提供“Chrome++插件”，虽然他依然不知道。

## 准备工作

因为很多人需要，而且没有在`吾i` `破解` `论坛`都没有找到
那就我来抛砖引玉吧。

### 需要使用的工具

1. 脑子。
   > 当然不是说大脑，是思维。
   > 举个例子吧，之前有人问我，为什么把`支付失败`的**字符串**改成`支付成功`后，
   > 只弹出成功，没有效果。。。这个问题比较深奥，我无法解释。（当时我就说我不会。）
2. `正确的`上网方式（非必须）
   > 你改插件，总不能改二手的吧。。。
3. `js`，`HTML(H5)`，`CSS`基础(\*)
   > 这些很重要！巧妇难为无米之炊，万丈高楼平地起，离不开。。。
   > 吾爱。
   > 咳咳
4. 习惯用的编辑器。
   > 一个好的编辑器可以让你`事半功倍`
   > 当然理论上`notepad`也成，就是太费眼。
   > 这里我推荐的两款是`notepad++`和`sublime`
   > 咳咳，至于前者，本来挺喜欢的（只对软件本身），后来事情发生了就果断卸载。。。
   > 如果你确定满足并且想一起研究的话，就继续吧。

正式开始。

### 插件安装与提取

#### 从谷歌商店提取

因为我是Chrome的用户（曾经的某6某忠实粉丝hhh劝退）
理论上`Chromium`内核的浏览器插件修改起来应该都差不多吧。

目标：`Octotree`
官网：[octotree.io](https://octotree.io)
`Chrome`插件下载地址（谷歌商店）：[链接太长。。点我访问](https://chrome.google.com/webstore/detail/octotree/bkhaagjahfmjljalopjnoealnfndnagc)

##### 下载&安装

谷歌商店一键安装。

![](https://attach.52pojie.cn/forum/202007/10/225356rivtymff0iv1wx2y.png)

安装

![](https://attach.52pojie.cn/forum/202007/10/225426uiiwk366kii7k4zz.png)

安装完成（感觉这几张都是废图。。。）

![](https://attach.52pojie.cn/forum/202007/10/225440rj9oophzpz9zp4jh.png)

##### 提取插件安装包

`chrome://extensions/`管理页面中，查看刚才安装后的插件的`ID`

![](https://attach.52pojie.cn/forum/202007/10/225455vmt23ztwz36mlcm0.png)

如图所示，本例的`ID`是`bkhaagjahfmjljalopjnoealnfndnagc`（只需要看首尾就足够了。）

好吧，我不知道`Chrome`下载的`crx`文件。。。放在哪里（可能是安装后自动删掉了？）
有知道的朋友可以回复告知一下。
访问`chrome://version`

![](https://attach.52pojie.cn/forum/202007/10/225508yxaa1g5av5lf81af.png)

找到`个人资料路径`，计算机里打开路径。
插件所在文件夹在Chrome资料文件夹下的`Extensions`文件夹

比如本例：
看首几位为：`bkha`

![](https://attach.52pojie.cn/forum/202007/10/225520zprlu4ryo2uwdomu.png)

找到插件文件夹了。
打开该文件夹，

![](https://attach.52pojie.cn/forum/202007/10/225533wgza07c0zkqjpbzq.png)

里面这个版本号所在的文件夹才是真正的插件文件夹（插件是需要打包才能成为`crx`文件的，本质上就是有经过签名压缩文件，后面会说怎么签名打包）

复制这个版本号文件夹出来。

##### 安装提取插件安装包（新增教程）

因为crx是经过打包的，Chrome在74版之后禁止了离线安装未经认证的插件（旧版本或修改版本的朋友请忽略，但是打包还是要打开开发者模式）

> 注：`未经认证的插件`是指插件的签名未在Chrome备案企业版，
> 大佬们可以尝试hook或是劫持Chrome的认证，实现离线安装未经认证的插件。

因此需要在右上角打开开发者模式

> 注：如果一直弹窗提醒不安全很烦，可以考虑使用【耍下】的扩展（前言部分有提到）
> chrome去提示插件`version.dll`
> 下载:<https://taozhiyu.lanzouj.com/ib16jzc>
> 密码:hgjbxa
> 使用方法：
> 下载完直接扔到`Chrome.exe`根目录重启浏览器就行

![](https://attach.52pojie.cn/forum/202007/10/233735gnipxpt33x05dj7t.png)

把解压后的插件所在`文件夹`拖进来就行

> 如果不行就点击`加载未封装的扩展应用`，选择插件所在文件夹然后点击`选择文件夹`

#### 直接下载crx

有些浏览器或某些插件可以直接下载到`crx`或`未封装的插件`

下载后直接解压就好。

#### 注意事项！！！

**注意！**和爆破exe一样！最重要的就是勤备份！
注意！**和爆破exe一样！**最重要的就是勤备份！
注意！和爆破exe一样！**最重要的就是勤备份！**
不然一失足成千古恨。。。

## 修改--解锁高级功能

获取到目标文件的解压文件就可以开始着手了

### 分析区别

破解功能自然是因为功能上有差异。找到这个差异。
比如

![](https://attach.52pojie.cn/forum/202007/10/225547ut44zu53zup5jiu9.png)

> 试用会员过期提示升级的提示（源码里称之为`广告`）

或是

![](https://attach.52pojie.cn/forum/202007/10/225556nwm5bx7j86m0hnxn.png)

> 剩余会员试用时间的显示

亦或是

![](https://attach.52pojie.cn/forum/202007/10/225614ellmptjvepkbp7ub.png)

> 仅会员可以使用的提示。
> 当然还有很多情况，比如只有会员才会显示的按钮（官方示意图可能会有关键词）

### 定位判断代码及修改

推荐`notepad++`和`sublime`之一的原因就是他们支持文件夹中搜索关键词（好吧，everything好像也可以，不过那不是编辑器。。）

例如`试用会员还剩多长时间过期`的提示
关键词：`remained`，文件夹内搜索，发现只有`content.js`里有。

![](https://attach.52pojie.cn/forum/202007/10/225628uy0dwzg70lkl6kwi.png)

打开继续搜索

![](https://attach.52pojie.cn/forum/202007/10/225635j385xvk89mmq8wd3.png)

发现只有一处（巧了，看一下前后文，应该是的`day(s)`也有了）
向前找判断
这里因为打包的时候压缩了，建议在新窗口美化一下（当然也可以直接修改。或是直接保存美化后的代码。个人喜欢原汁原味）
当然有些lj网站美化后的代码会出现问题。。比如

![](https://attach.52pojie.cn/forum/202007/10/225743vcjqjfoxcjxz9jbg.png)

这样。
因为瞎换行，把人家的字符串给拆了。。。

![](https://attach.52pojie.cn/forum/202007/10/225754v1lylqfzrqqftq5q.png)

格式化后看起来就很（相对）清爽了。
一个方法，里面是判断。
根据判断找到
`this._state === t.SUBSCRIPTION_OK`
此处其实可以使用全局替换，把`this._state === t.SUBSCRIPTION_OK`改成`true`。
此处选择方法分析，尽可能少改动。
搜索调用（这个没有混淆，很方便找。如果混淆了一般都会动态调试，下面有动态调试的方法，可以参考一下）

![](https://attach.52pojie.cn/forum/202007/10/225803mmnjl9g6jf6eemxv.png)

这里一样，因为很轻松就能知道`SUBSCRIPTION_OK`、`SUBSCRIPTION_EXPIRED`、`TRIAL_EXPIRED`是什么意思，直接改就行了。如果混淆了，需要动态调试。

搜索后得知`_getTrialRemainingDays`只有一处调用，因此直接赋值就好，不会有问题。

```
const a = this._getTrialRemainingDays(_);
```

改成

```
const a = 0;//此处改成0（试用剩余0天,试用期间有购买Pro的广告）
```

接着是改`this._state`，因为多次调用该代码，因此溯源。找`this._state`赋值的位置。
就在上面一行（格式化后的）

![](https://attach.52pojie.cn/forum/202007/10/225816d4s3s3933s31l3o3.png)

```
async _verifySubscription(e) {
const i = e || await extStore.get(a),
    o = this._decodeTokenPayload(i);
let s = t.UNAUTHENTICATED;
if (o) {
    const { expiredAt: e, subscriptionStatus: a, trialDays: i, createdAt: n } = o;
    if (Date.now() < e)
        if (a) switch (a) {
            case "EXPIRED":
                s = t.SUBSCRIPTION_EXPIRED;
                break;
            case "ACTIVE":
            case "CANCELLED":
                s = t.SUBSCRIPTION_OK
        } else s = Math.ceil((Date.now() - n) / 864e5) <= i ? t.SUBSCRIPTION_OK : t.TRIAL_EXPIRED
}
return s === t.UNAUTHENTICATED && await extStore.remove(a), s
}
```

老规矩，可以把判断改掉。
我这里把除了`SUBSCRIPTION_OK`的赋值全都改了。

```
async _verifySubscription(e) {
const i = e || await extStore.get(a),
    o = this._decodeTokenPayload(i);
let s = t.UNAUTHENTICATED;
if (o) {
    const { expiredAt: e, subscriptionStatus: a, trialDays: i, createdAt: n } = o;
    if (Date.now() < e)
        if (a) switch (a) {
            case "EXPIRED"://把下面两行过期的跳转删掉
            case "ACTIVE":
            case "CANCELLED":
                s = t.SUBSCRIPTION_OK
        } else s = Math.ceil((Date.now() - n) / 864e5) <= i ? t.SUBSCRIPTION_OK : t.SUBSCRIPTION_OK//这里把判断前后改成一样的就成
}
return s === t.UNAUTHENTICATED && await extStore.remove(a), s
}
```

当然全都删掉然后改成

```
return t.SUBSCRIPTION_OK
```

也是可以的。
我个人习惯基于原代码修改。

### 测试是否成功

把上面的代码在原文件里对应修改。
保存后点击

![](https://attach.52pojie.cn/forum/202007/10/225825ocscswwo61oscsks.png)

重新加载插件就修改完成了。

> 这里是成功破解了高级功能。
> 如果不成功返回继续
> 如果报错见`出现错误的处理方法`

## 修改--汉化

### 分类

上一次修改的时候对代码进行了汉化，这次也不例外。
汉化的情况有多重。

1. 语言是写死的（类似这次，是只有单一语言的）
2. 有多重语言包可以选择，就是没有中国的（差评）
3. 有`中文`的选项，但是只有部分是汉语，而且还有好多是错的。

一般来说，
`1`是因为没做多语言配置，在`js`里直接修改就好
`2`相对来说好改一点，找到语言包，修改就行（一般是`json`文件或是`js`内的`json`，且多为谷歌语言包，在插件目录下的`_locales`文件夹下，有对应语言的语言包）
`3`一般和`2`情况类似，补充翻译即可。（推荐`BCompare 4`，对比很方便，其他某插件的示意图如下图）

![](https://attach.52pojie.cn/forum/202007/10/225834rzwwej52ei4fr4po.png)

本插件是最不方便修改的写死在js里的类型。一般需要所见即需译，就是看到需要翻译的，就去翻译，而且翻译的过程最好从特征词句到一般词语。
有强烈特征的一句话或是一个不常见的单词先翻译。比如`settings`，一般只要有设置的插件里会反复出现。这就不好定位了。

### 例子一：汉化提示语并自定义

举个例子

![](https://attach.52pojie.cn/forum/202007/10/225845tjbqce3foatateir.png)

第一次安装完后打开会有如下提示，一句话，就很方便搜索到

![](https://attach.52pojie.cn/forum/202007/10/225853yv6400440kx8gsck.png)

那就直接修改好了。注意不要修改到关键词，或是其他代码，或是单双引号，亦或是`%1`、`$1`、`{1}`这类的替换字符。

翻译替换进去就行，这里我选择[谷歌翻译](https://translate.google.cn/)，可能是日常习惯用谷歌搜索吧，而且比较喜欢`Material Design`风格吧。

![](https://attach.52pojie.cn/forum/202007/10/225904vnfn1fyt1ssggvzx.png)

虽然都是简单的句子，我还是选择机译+校准。因为打字没有复制粘贴快（**所以码教程是最痛苦的，不接受反驳**）

当然，你也可以随手扔一个`“版权”`之类的。。。虽然破解版只是技术的产物，是没有版权可验的。

修改完：

![](https://attach.52pojie.cn/forum/202007/10/225930m7dcvl1k8l79ehz9.png)

效果图：

![](https://attach.52pojie.cn/forum/202007/10/225936qga77g2o8bsap2qa.png)

### 例子二：汉化部分设置

再举个例子

![](https://attach.52pojie.cn/forum/202007/10/225944tmmmlmpupxpumqga.png)

因为我刚才卸载了，提示我要登录。
改之，老规矩，搜索上面的关键词`unlock:`

![](https://attach.52pojie.cn/forum/202007/10/230002k5gpuv1pp1aun165.png)

搜索后发现并没有解锁的列表，在`${s}`和`${n}`里。

向上翻一下，找到了该列表。

![](https://attach.52pojie.cn/forum/202007/10/230014c9nxfafl58nr8ttb.png)

既然是破解版，那就可以随心所欲的翻译了。。。比如我是这么做的

![](https://attach.52pojie.cn/forum/202007/10/230022u4qh45tvi88cy6nt.png)

对应的代码部分：

![](https://attach.52pojie.cn/forum/202007/10/230124wd7uoulgt5eus8ls.png)

### 例子三：重复部分汉化

汉化`Settings`设置的标题部分。有很多搜索项

![](https://attach.52pojie.cn/forum/202007/10/230032d21k32akark3f913.png)

可以

1. 勾选`Aa`区分大小写。
2. 使用正则表达式，排除前后没有的字符比如使用

   ```
       \WSettings\W
   ```

   ```
   匹配前后都是非字母和数字的`Settings`

   ![](https://attach.52pojie.cn/forum/202007/10/230043qprwp3n3hwhzaqyy.png)

   (这9处除了一个夜间模式匹配字符的正则表达式，其余的都是要汉化的)
   ```
3. 审查元素，找到前后文（包括`类名`、`ID`）
   比如

   ![](https://attach.52pojie.cn/forum/202007/10/230052uoc9bbvbbv4dbdl9.png)

   ```
   很方便就可以精准定位到汉化的位置。

   ![](https://attach.52pojie.cn/forum/202007/10/230059i5dn50d6mqdr7m6q.png)
   ```

### 其他汉化例子展示

请下载插件（同时提供了修改后的和未修改的版本）

## 修改--布局

布局一般修改是`CSS`，`JS`甚至`HTML`，因此要都有所了解。

### 给作者填坑

老bug了。。无法滚动的bug修复了，但是界面还是不正常（左侧多余，右侧溢出）

![](https://attach.52pojie.cn/forum/202007/10/230139bw8y20w3ur6pupf2.png)

在`Chrome`的控制台里一通摸索(瞎改)，

> 一般为`CSS`或`CLASS`的修改居多，需要有`HTML`、`CSS`等基础

发现是

![](https://attach.52pojie.cn/forum/202007/10/230149vwk2nke0pvn9y2z8.png)

把`transform`和`left`属性强制删除，设置就行（`unset`）
在下面的class里找到设置右侧属性的类（本例中见下图）

![](https://attach.52pojie.cn/forum/202007/10/230202ldwdpctcdpwd07hu.png)

因为是`!important`强制属性，所以只需要改一个就行。
修改部分如图所示：

![](https://attach.52pojie.cn/forum/202007/10/230213j11eq71mby7sqqiw.png)

> 注：
>
> 1. 改法不唯一，只要能实现目的，且简洁方便快捷实用，就是好方法。
> 2. 本方法因为没有使用`transform`属性，移动动画会丢失。
>    不想加`animation`动画，又没想到更好的方法。。。
>    凑活用吧，反正主要不是看动画的。

### 强迫症患者

![](https://attach.52pojie.cn/forum/202007/10/230224nz9ucnce6nyc196j.png)

`tip`竟然出现在左边。。。
好难受看我改到下（上）面
分析`class`，`tooltipped-w`是左边显示，因此猜测`w`是指西边。

![](https://attach.52pojie.cn/forum/202007/10/230316kxs9sffv3xjvdvwx.png)

观察到上面`Git`部分有想要的样式，
同理，炮制出`tooltipped-sw`（西南），改动前后的对比

![](https://attach.52pojie.cn/forum/202007/10/230236u4hcyiqe4q1gyc3i.png)

> 注：`Chrome`在标签上右键`Force State`可以设置当前状态

改完代码发现在右侧的时候显示正常，但是左侧的时候就变了。
查看代码发现因为有页面方向的变换，对`class`进行了动态改变。
改`js`代码吧。给每一个加上单独的类（这里我使用的是`tao`）

![](https://attach.52pojie.cn/forum/202007/10/230257akro23ch88jkj2cd.png)

效果（注：图经过处理，为了方便看效果，部分间距增加了）

![](https://attach.52pojie.cn/forum/202007/10/230243hlq9uljl1l19wilp.png)

左右均正常。

### 其他修改（瞎改）

![](https://attach.52pojie.cn/forum/202007/10/230304uih8ompe4zaiwhea.png)

咳咳，反正`html`、`css`或`js`呗。
看着改好了。。。

## 修改--杂项

还有一些乱七八糟的东西可以修改，具体可以参考附录中的第二个教程
比如右键，第一个是官网。
可以点击后弹一个咱们的`唔愛论坛`官网，改改作者、简介啥的

![](https://attach.52pojie.cn/forum/202007/10/230418jb4wb7zd4dtetqe4.png)

**注！上述截图因为方便说名，仅把更新链接删掉了。真正操作的时候请删除**

或是卸载后再弹一下`5爱`的官网（下图第一个框）
当然也可以像我上个版本一样，第一次安装的时候弹一下。

![](https://attach.52pojie.cn/forum/202007/10/230428o2nmo3z2ydm2qm54.png)

效果：

> 第一次安装有弹窗：
>
> ![](https://attach.52pojie.cn/forum/202007/10/230443cnbngl3myhntjyqt.png)
>
> 同时点击确定后有吾爱网站弹出
>
> ![](https://attach.52pojie.cn/forum/202007/10/230455gndxqq1n2dzlw1xq.png)

## 修改--动态调试

动态调试是最方便找到出问题的位置以及原因的办法（虽然不一定能想到怎么解决。比如下图）。

![](https://attach.52pojie.cn/forum/202007/10/230504hz8qaqetwtdcaoq8.png)

亦或是代码被混淆的很厉害，又抽取了结构，平流抽象化了（AST）

> 注：AST又被称为js预编译，可以参考[这里](https://blog.csdn.net/huangpb123/article/details/84799198)的介绍

还是以`Octotree`为例
假如我故意（一不小心）出了一个未知错误。

![](https://attach.52pojie.cn/forum/202007/10/230331nzcsffzhzezffsls.png)

插件的错误也十分“委婉”，而且因为压缩了，不方便看错误位置。
动态调试吧。
这里要分情况查看。

### popup（弹出页面）

就是点击插件的按钮，会有窗口弹出的。类似于下图的`ADblock插件`

![](https://attach.52pojie.cn/forum/202007/10/230408e65tx6y288ej07yi.png)

插件上`右键`-`审查弹出窗口`-`(格式化)下断点`-`重新加载`

> 注：重新加载可以在`console`里输入
>
> ```
> location.reload(true)
> ```
>
> 重新加载。

![](https://attach.52pojie.cn/forum/202007/10/230348rla20l8x5um8ljl8.png)

### 植入到页面的js

可以直接在`console`-`Content Script`-`页面的位置（如果有iframe的话）`-`插件名`中格式化，下断点等等。

![](https://attach.52pojie.cn/forum/202007/10/230400g1hz3akyhhcfwahw.png)

> 注：推荐一个我刚发现的功能（可能有朋友早就知道了了吧。。）
> 在上图蓝色箭头所示的方框的位置，是异常前下断点，
> 系统会在出现异常并且没有被捕捉的地方，在报错前断下。堆栈，数据都保存着，而且有报错的信息，可以方便调试。

## 出现错误的处理方法

![](https://attach.52pojie.cn/forum/202007/10/230527o9z267yp33fzj7n4.png)

最简单的办法就是：

> 一直撤销到不报错为止，然后重做。
> 如果不行的话，请退回到备份版本。

如果重复好几次，还是感觉没问题，就需要动态调试了（参上文）。

## 打包

该改的都改完了，该填的坑也都填好了。
需要打包发布了（如果有账号的话）
点击上方的“`打包扩展程序`”，输入扩展所在的文件夹
点击`打包扩展程序`即可。
至于`私钥`如果你不是第一次打包，上一次打包后会自动生成一个私钥。你可以用这个私钥重新打包（本质就类似安卓的签名）

![](https://attach.52pojie.cn/forum/202007/10/230658outuww0isuuy5wm9.png)

> 补充：
>
> 1. 每个私钥都标志这一个独立的插件，如果不同的插件用同一个私钥签名，会导致覆盖。（惨痛教训）
> 2. 因为Chrome的特性，无法直接安装没有在谷歌商店中发行的插件（除非签名经过官方许可，并且有第三方进行安装，比如下面的区别示意图）
>
>    ![](https://attach.52pojie.cn/forum/202007/10/230703yev6qa5rc1zery9b.png)

如果是分享`zip`版未打包的插件，推荐先打包后再重命名。
这样可以保证插件数据不会丢失
更新的时候，因为有`key`系统会认为是在更新插件，不会导致多个版本共存
（5555我才知道，所以现在。。）

![](https://attach.52pojie.cn/forum/202007/10/230700w6jhfsz28ic9h9jz.png)

新版本旧版本共存了。。。也就是说旧版本的设置需要手动转移到新版本（气哭）

## 参考资料

有问题或是遇到奇怪的`API`可以查阅。

| 内容 | 链接 | 作用 |
| --- | --- | --- |
| GitHub翻译版 | [点我](https://github.com/facert/chrome-extension-guide) | 咳咳，不一定是最新的。<br/>至少比英文原版方便吧 |
| 某网站分享的经验和教程 | [点我](https://huajiakeji.com/dev/2018-11/1628.html) | 偏实战吧，比较详细<br/>（虽然是转的，但是原作者图片都没了） |
| 图灵的图书版 | [点我](http://www.ituring.com.cn/book/1421) | emmm没啥特别的 |
| 官方教程 | [点我](https://developer.chrome.com/extensions) | 最权威的官方教程<br/>（纯英语、`正确的上网`方式警告） |
| 360汉化版(超级旧的版本) | [点我](http://open.chrome.360.cn/html/dev_doc.html) | 旧版本，很多图都挂了 |

## 修改样本

原`crx`

> `Chrome`插件下载地址（谷歌商店）：
> [链接太长。。点我访问](https://chrome.google.com/webstore/detail/octotree/bkhaagjahfmjljalopjnoealnfndnagc)

下载：

云盘：
189云盘：

> <https://cloud.189.cn/t/r2MJ3yaMVV3e>
> 访问码：03ts
> 【原包】即为未修改版本，后缀改成zip即可
> 【样品】即为修改后的版本，后缀改成zip即可
> 【教程】为PDF教程，后缀改成pdf即可
> 【crx】为修改打包后的crx样本，后缀改成crx即可

蓝奏云：

> 样品：
> <https://www.lanzoux.com/ihR3eef0yyh>
> 密码:ezpf
>
> 原包（zip）
> <https://www.lanzoux.com/itEFfef0z3c>
> 密码:b0ip
>
> 本教程PDF
> <https://www.lanzoux.com/iOkeHef0zti>
> 密码:c0cb
>
> CRX版样品
> <https://www.lanzoux.com/iAl1fef1c8f>
> 密码:hhy6
>
> 小站：
> 样品：[Octotree\_cracked by 吾爱破解：涛之雨V5.2.1\_0.zip](https://gitee.com/taozhiyu/taozhiyu/raw/master/Chrome_tutorial/Octotree_cracked%20by%20%E5%90%BE%E7%88%B1%E7%A0%B4%E8%A7%A3%EF%BC%9A%E6%B6%9B%E4%B9%8B%E9%9B%A8V5.2.1_0.zip)
> CRX版样品：[Octotree\_cracked by 吾爱破解：涛之雨V5.2.1.crx](https://gitee.com/taozhiyu/taozhiyu/raw/master/Chrome_tutorial/Octotree_cracked%20by%20%E5%90%BE%E7%88%B1%E7%A0%B4%E8%A7%A3%EF%BC%9A%E6%B6%9B%E4%B9%8B%E9%9B%A85.2.1.crx)
> 原版zip：[Octotree](https://gitee.com/taozhiyu/taozhiyu/raw/master/Chrome_tutorial/RAW5.2.1_0.zip)
> 本教程PDF（最后的下载部分有改动，未同步）[download.pdf](https://gitee.com/taozhiyu/taozhiyu/raw/master/Chrome_tutorial/download.pdf)
