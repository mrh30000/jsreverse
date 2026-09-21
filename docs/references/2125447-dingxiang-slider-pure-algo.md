# 某象滑块纯算逆向分析

> **作者**: jhdgff | **发布时间**: 当前离线 | **版块**: 『脱壳破解区』 | **查看/回复**: 1068 / 15
> **原文**: [https://www.52pojie.cn/thread-2125447-1-1.html](https://www.52pojie.cn/thread-2125447-1-1.html)

---

前言

兄弟们，我又来了，最近离职了有空研究下弱点，滑块这些，最近看论坛这些真是日新月异，ai直接都把web端相当于全破了，我看了下如果没有别人逆完写好流程的skill，你就要自己懂流程一步步引导他做下去，没有那么神，但是确实很强了，想吃这碗饭还是要多坚持手戳，用ai也要自己多看看流程，我估计后期ai有策略不允许进行这部分分析，再走下去估计都要私人化搭建llm辅助逆向，我感觉是轮不到我们这些小卡拉米哈，所以兄弟们还是要多努力啊，我也好躲在论坛偷偷学习，本来想使用md写，导入图片没弄清楚，所以还是使用这个写，写的不好，大家多担待啊，废话不多说，我们开始进入正题吧。

声明

本文章中所有内容仅供学习交流使用，不用于其他任何目的，不提供完整代码，严禁用于商业用途和非法用途，否则由此产生的一切后果均与作者无关. 本文章未经许可禁止转载，禁止任何修改后二次传播，擅自使用本文讲解的技术而导致的任何意外，作者均不负责，若有侵权，请联系作者立即删除.

正文

那么，让我们开始吧

网址：aHR0cHM6Ly93d3cuaGI1Ni5jb20vTG9naW4uYXNweD90eXBlPXB3

我接下来的流程都是先图片后说明啊

![image](https://attach.52pojie.cn/forum/202608/30/082414rhc40hz6cwyc6gcn.png)

首先是debugger，我之前玩的时候还没有，这个vm中的断点不用我教吧？

![image](https://attach.52pojie.cn/forum/202608/30/082803c8vw20vho4cju48j.png)

说说吧，这个vm代码基本都是string代码载入运行的，所以去除debugger就不影响代码，嫌麻烦直接string置空，能运行下去行，不行再使用前面的思路

过完了，我们就来分析流程吧

第一步分析需要的协议

![image](https://attach.52pojie.cn/forum/202608/30/084322iupee0qe0oc1mogm.png)

总共就这个4步

1.获取滑块参，o、sid、p1背景、p2滑块、type、y值这些

2.获取认证设备需要的lid

3.认证设备得到的token，就是后面的c

4.就是过滑块得到认证的token了

知道了大概的流程，我们就可以开始看代码调试了

第二步ast解混淆

我的ast非常烂，用的少，只有需要的时候去复习拿来用下就不丢人现眼了，哈哈

流程大概就是解混淆变量参，unicode解码，合并switch语句，我复习了ast半天，就解了混淆变量参，你们凑合看看下哈

第三步解1协议

![image](https://attach.52pojie.cn/forum/202608/30/085944m9bjnlj0396o3jrn.png)

第一步需要的参数就是aid、ak、_r，其中aid、_r是随机变量，ak是滑块请求需要的key是死值

先解aid

![image](https://attach.52pojie.cn/forum/202608/30/090750cmgiz2ou9rqh3nhi.png)

![image](https://attach.52pojie.cn/forum/202608/30/090755a2ked6h0ujbsxb96.png)

aid为undefined，则运行u（x）进去就是aid生成，dx-加13位时间戳-加随机8位数字-加t，这个t大概都是1，不信可以去搜搜idx，我看过代码初始为0，往下运行有加1，所以t=1，邪一点就多重复几次请求就知道不会变

![image](https://attach.52pojie.cn/forum/202608/30/092322tjijcwd7wwwbizvc.png)

_r就是(0,1)之间的随机数，这东西就是熟能生巧，见多了都不用找这个代码，多重复几次就知道这个代码如何伪造了

![image](https://attach.52pojie.cn/forum/202608/30/093335lrfg5gzc2kvie2jm.png)

这些就是第一步生成需要的参数了，我说说，o是还原滑块需要的顺序参，sid认证参数后续有参与算法的，p1，p2请求图片的url，type判断滑块是否有距离的参数，y滑块最后位置的距离这样第一步协议就请求完了

这是我解释给你们听的，自己玩请求成功就可以走下一步了，后续需要什么参，再回头来看返回的参数什么对得上懂吗。

第四步解2协议

造完第一步请求就是解第二步请求

![image](https://attach.52pojie.cn/forum/202608/30/094144mrcqzxsusnc0buzr.png)

我们看这个协议只有一个param需要伪造，然后就是调试找param如何生成，跟你们说个思路像这种字母数字_+-=这些就先默认base64，因为我们知道加密之后其实都是字节，要显示都是要转换的，md5，sha1这些都是固定长度，还有一个就是16进制显示，都是字母加数字，其他一大串加密显示不是字母加数字=16进制的，一律默认base64显示。

然后我们开始调试

![image](https://attach.52pojie.cn/forum/202608/30/100727r5g9qbblug9gnzk4.png)

我们知道这个a进去就生成param参了，所以我们现在要先解了a

![image](https://attach.52pojie.cn/forum/202608/30/101122boby33881x6lfxh3.png)

a中lid就是13位时间戳+makeLocalID函数生成string继续跟进这个makeLocalID方法

![image](https://attach.52pojie.cn/forum/202608/30/101125sel8g3aljx683atz.png)

我们知道就是32位y字符串，造好lid之后进入t.XuRhstZ

![image](https://attach.52pojie.cn/forum/202608/30/101818m66f2se8qqf93d4f.png)

这个a除了lid之后，就是appKey之前要的ak，知道了a怎么造之后看我标的这个，像不像base64编码表，普通base64编码表ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=，我们先把这个编码表放到base64中替换普通编码表再去解现在生成的param，看看能不能解，不能解在看XuRhstZ这个算法怎么实现，通过代码测试其实就是普通base64编码，只是换了编码表，代码都没有魔改，我最开始还是直接去解算法走了弯路，没法解生成的param，只能通过a去加密看算法是否和生成的param一样，这个协议就算解完了。

第五步解3协议

看第3步协议其实和第2步协议没区别，只是param更长了，我们知道了param怎么生成，去解param，只要伪造解开param的string就行了

![image](https://attach.52pojie.cn/forum/202608/30/103608t7dhzhbcdx28ur89.png)

XuRhstZ通过之前断过的方法回调位置，我们知道o就是1前面生成的【init，getlid】生成的，而lid是不是就是第二步请求返回的data，而init和getlid拼参就生成了f，而分析这个f，得到要解的参数大概就是cpt、mts、rp、web，这些看到这个长度和字母数字大概就是md5，还有ct会变，其他多走几次，看看大概都是不会变的

![image](https://attach.52pojie.cn/forum/202608/30/105152bjpfsjtuissp0kpf.png)

跟进init其中，看到了吗，只要needHash为true，就进入下面的t["processValue"]进行加密，看到needHash需要hash也能猜到不是md5就是sha1，这个长度32大概就是md5了

![image](https://attach.52pojie.cn/forum/202608/30/110121mhuxhx8xkpxk2own.png)

你看跟进这个t["processValue"]进去调试，把n变成123456计算不就是md5吗，你实在不放心那就再跟进

![image](https://attach.52pojie.cn/forum/202608/30/110417xp8m3zphddee3s2x.png)

看到这个，拿去问问gpt这些，很明显的md5算法了，我们知道了needHash为true，就把value拿去md5，所以，我们只要伪造cpt、mts、rp、web这几个拿去md5就行了

![image](https://attach.52pojie.cn/forum/202608/30/111351h5o99t1lyvohkvl9.png)

mimeTypes、canPlayType，这两个string应该都是死值，直接使用算出来的md5直接拿来用就好了，plugins这个你有能力去改可以变动，没有用死值就行，webgl这个画布工具特殊，每个浏览器的img都不一样，随机生成32位16进制吧

![image](https://attach.52pojie.cn/forum/202608/30/111353fvpk0vp4jvgdvgsp.png)

然后就是这个ct，就是结束时间-进来这个init的时间，这没什么问题好说的了，然后这个请求就结束了

第六步解4协议

接下来就是解最后一个协议了，也是最难得部分了，这一部分坑巨多，主要算法也在这边，要注意了

![image](https://attach.52pojie.cn/forum/202608/30/113438yynpprxtpdz4k55j.png)

这个协议分析请求参数，其实就只有ac需要解，ak、sid、aid、y都是已知的、c就是之前第三步返回的data，x距离需要计算的，不是直接算初始位置和缺口长度，他有个初始长度，不是为0，还有变量长倍数speed，还有还原背景图，都要在这边完成，因为有些算法是异步先生成的，我会大概整理下顺序，先来图片还原吧

![image](https://attach.52pojie.cn/forum/202608/30/134236dzpg7j8x3d18ijdg.png)

根据设置画布断点，js在还原图片的时候会调到这个方法断住，这个方法就是还原图片的代码了，我们就是不知道这个o列表是怎么来的，可以先还原算法，要注意这个图片还原之后宽150长300，你用py根据o列表还原32份图片，最后只有291这样长，会丢失小数部分的图片，后面计算x值会不准，一定要ai还原清楚才行，之后就是调试o列表如何实现，但是方法是异步的，前面的方法找不到上层调用栈，我们需要重新定位上层方法找到调用栈，重新刷新页面

![image](https://attach.52pojie.cn/forum/202608/30/135501qqkamamqobt6aa3a.png)

找到这个方法我们知道t就是第一步请求返回的o，这个算法就是32个字符一个个转为十进制除以32取余，列表是否存在这个值，不存在放入，存在就循环十进制+1除以32取余，判断这个值存在不存在列表，不存在列表放入才跳出循环，算出32个值就是图片还原顺序

![image](https://attach.52pojie.cn/forum/202608/30/113440eszkk8krwh9q01ws.png)

然后就是speed值计算，取【0.9,1.2】之间的值，后面计算x长度需要这个倍数，这个完就只剩下ac如何实现了

![image](https://attach.52pojie.cn/forum/202608/30/142409a0w8trsrrb6r6z37.png)

跟进这个getUA，我们看到下面的代码this["ua"] = ""，说明这边的代码就是ua的初始化，我们断点刷新就能跟进ua的生成了

![image](https://attach.52pojie.cn/forum/202608/30/140925zbtkfw07gwaugmvt.png)

跟进ua的init方法，我们知道sid传入初始化ua算法，我们跳到这个初始化代码中，这个ac实现有两个部分，一部分是设备效验，一部分开启监听鼠标移动，这边是滑块，我们先跟进设备效验看如何实现代码

![image](https://attach.52pojie.cn/forum/202608/30/143347gl7ooicl7g5v0nv5.png)

先跟进看getTM方法，先是运行1中的代码块，在运行2的代码块，先调试1中的代码

![image](https://attach.52pojie.cn/forum/202608/30/144548g2xlb8rttoppt2vp.png)

这边开始就是都是字节转换非常麻烦，时间戳传入，这代码分别转换高32位整数和低32位整数，我也看不懂这个换算，我也是用gpt改的代码

![image](https://attach.52pojie.cn/forum/202608/30/144551b2h206rrz2ll69lr.png)

之后就是高、低32位整数转换成大端序的4字节数组，这两部分代码合在一起其实就是时间戳转8字节的大端序数组

![image](https://attach.52pojie.cn/forum/202608/30/145408o1x2179k6n29xukx.png)

然后进入process方法，把数组转为字节拼接

![image](https://attach.52pojie.cn/forum/202608/30/150052he16nsh6ck99m6cs.png)

再把拼接的字节传入Ve["encrypt_*]方法中，1这个就是字节位移运算了，这东西省不了，只能自己用gpt还原，2这些getBR、getCF最后的字节运算都是这些Ve["encrypt_*]，自己用ai还原，都是位运算，也没有什么好讲的

![image](https://attach.52pojie.cn/forum/202608/30/151129rzhlxg86fqggx8gl.png)

最后进入app方法拼接字节这也有两部分，这些getBR、getCF最后的字节运算都是这些Ve["encrypt_*]得到的方法都是进入这个方法，根据传入的t做标记，后续他好通过1-10这样序列还原代码，1步骤里面的代码就是根据字节t+Ve["encrypt_*]长度转为2字节的大端字节+Ve["encrypt_*]运算的结果字节，这些getBR、getCF运算出来都是ua += t+Ve["encrypt_*]长度转为2字节的大端字节+Ve["encrypt_*]运算的结果字节，在ua后面相加知道吧，2部分其实可以等设备号+轨迹全都转换成字节再去运算，只不过他这边每次运行app相加都要运行下

![image](https://attach.52pojie.cn/forum/202608/30/152458dfa94qamj3gzzdma.png)

2部分的代码，就是base64换了个编码，我之前不是说走了弯路，直接硬写代码以为魔改的，后面看到这个我才反应过来，会不会只是变了编码根本都不需要重写代码

![image](https://attach.52pojie.cn/forum/202608/30/153936d9w9noj4xtlw5tw6.png)

像这个getBR，他这个就是转为2字节的大端数组，后面那个(0, Le["bss"])(c)就是字符串转字节，后面几个设备参数都是用之前这两种算法运算，后面app方法中Ve["encrypt_*]每个都不一样，这个要自己去写了，没什么好讲的了

getTM设置时间戳

getBR读取哪个平台的浏览器、和浏览器版本

getLO读取href、referrer

getCF读取js代码，这只能写死，你本身ast就转换了一波，或者他js版本变了也会变

getDI检测开发者tool是否开启

getEM检测是否开启自动化

getJSV检查jsv版本

getTK检查sid

getSC检查屏幕参数

ua要按照这个顺序拼接字节啊

之后就是鼠标轨迹了

![image](https://attach.52pojie.cn/forum/202608/30/155653h0zoy567mttvo54l.png)

这个轨迹有两个坑，一个是1红框鼠标移动范围到点击滑块，是一个轨迹，2滑块移动又是一个轨迹，还有一个3这个图片是有初始距离的，10px，它是根据type为0，+10px，不为0不加

先说轨迹，一个思路如果我是手机滑动呢？是不是就只要滑块移动一个轨迹

![image](https://attach.52pojie.cn/forum/202608/30/160705u0883990abu3oa49.png)

这个就是红框鼠标移动范围到点击滑块，我之前以为就是这个监听鼠标，我想怎么滑动滑块没有轨迹，调试了半天，才知道还有一个轨迹，这个轨迹字节加载在设备字节之后

![image](https://attach.52pojie.cn/forum/202608/30/161822zggbj4ijgu7nib77.png)

滑块移动的这边bindDomEvents里面的b["isMouseDown"] && b["recordSA"](e)鼠标点击触发

![image](https://attach.52pojie.cn/forum/202608/30/162936dtqd669963rd9dd6.png)

这个轨迹是时间、x、y计算字节加在鼠标移动范围到点击滑块字节之后

![image](https://attach.52pojie.cn/forum/202608/30/162938cme0oycm6o9tt3n3.png)

看到这个知道了没，我记录的是l就是鼠标实际滑动距离161，而真正距离还是要*speed才行

![image](https://attach.52pojie.cn/forum/202608/30/164245il06ekklzpz8kk0k.png)

他这边步骤1中判断type是否为0,0就加10px，真正上传的x是实际滑动距离+10，但是真正我们计算出来的只是初始0到缺口滑块，所以我们计算的（disx-10）//speed才能得到实际滑块移动距离，如果要上传x还要在+10才行，上传数据是实际滑动距离+10，而轨迹滑动距离x差值是实际滑动距离，不要用计算出来的只是初始0到缺口滑块的距离啊

步骤2就是传入x和speed运算字节加入轨迹之后，这样ac就完成了

轨迹算法自己找找或者伪造吧，轨迹算法要自己观察下规律，我上次随便找的一个1/10成功率很低，调试了老半天才发现是轨迹的问题

这个滑块算法就这样结束了，写这东西又一天去掉了，我还以为一早上就能结束，没想到写第四个协议都写了半天，那就这样了，下次见。
