# 警惕，后门病毒在chm/vbe内嵌入GadgetToJScript生成的恶意js/vbs下载白加黑远控木马

> **作者**: ahov | **发布时间**: 2023-11-04 17:46:00 | **版块**: 『病毒分析区』 | **查看/回复**: 12734 / 39
> **原文**: [https://www.52pojie.cn/thread-1852696-1-1.html](https://www.52pojie.cn/thread-1852696-1-1.html)

---

## 警惕，后门病毒在chm/vbe内嵌入GadgetToJScript生成的恶意js/vbs下载白加黑远控木马

### 一、背景

近期捕获到大量使用 chm/vbe 的后门病毒下载器广泛传播。
根据现有情报，该后门病毒最初使用 chm 和 exe 传播，目前捕获到最早的 chm 样本可能于 2023 年 9 月份出现，且在 2023年 10 月下旬开始出现使用 vbe 传播的变种，目前存在 chm/vbe 同时传播的现象。该后门病毒异常活跃，更新频率频繁，仅在几个月间变化多次，国内多家安全厂商发布预警——
火绒安全：《[黑客发起钓鱼攻击可远控电脑，针对金融行业](https://huorong.cn/safe/16981185211083.html)》
腾讯电脑管家：《[田马组织使用CHM对财务等人员进行钓鱼攻击活动](https://mp.weixin.qq.com/s/PqZfqtvZoeyOSqqnc_QFUA)》
本文可以作为相关安全厂商报告的说明、补充与更正，将对第一层下载器样本所使用的开源工具进行更明确的确定，并将对该家族样本的变化始终贯穿其中。

### 二、样本分析

#### I. 第一层下载器

##### （一）概况

传播的 chm/vbe 即第一层下载器

分析方式：
chm：使用 7-Zip 等工具解压缩后得到嵌入了恶意js的html文件对其进行分析
vbe：即编译后的 vbs 代码 可以使用开源工具进行解密得到 vbs 代码对其进行分析

以下将分别呈现得到的第一层下载器的 js vbs(10月27日发现样本) vbs(11月1日发现样本) 代码：

js代码，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/172310cjh6vcpkdq363ook.png)

vbs(10月27日发现样本)代码，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/172320jitypivv25twx32r.png)

![](https://attach.52pojie.cn/forum/202311/04/172334jvnjjta3hmmkazmh.png)

vbs(11月1日发现样本)代码，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/172354wdnmzpwjjcydjdxg.png)

此处之所以分别呈现10月27日与11月1日发现样本的vbs代码，是因为不难发现第一层下载器的一处微不足道的更新之处：样本的 Base64 转换函数名发生了变化——由字符串"Base64ToStream"变化为"Base64sTsosSstsrsesasms"，可能是为了绕过防病毒软件对其的静态检测特征。

我们可以发现，第一层样本的 stage 变量内容均为 Base64 字符串，并由样本的Base64 转换函数进行处理。

##### （二）第一层下载器使用的开源工具

在火绒安全的分析报告中提到：“其为开源工具 DotNetToJScript 的修改版本，用于从内存加载 .NET 程序集”，但此处需要说明的是准确而言第一层样本实际上使用的是基于开源工具 DotNetToJScript 的又一开源工具——GadgetToJScript
因此，第一层下载器使用的是开源工具 GadgetToJScript 生成恶意 js/vbs，用于直接在内存当中加载 .NET 程序集。
以下进行详细说明：
首先，对 stage\_1 变量内容进行 Base64 解码，可得到一个 XML 文件，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/172420cjkmbnwmghvqkqbb.png)

这是用来绕过 .Net 4.8+ 阻止 Assembly.Load 的 XML 代码，也就是说 stage\_1 的作用就是用来绕过 .Net 4.8+ 阻止 Assembly.Load，而这与 GadgetToJScript 的特性一致，使用 DotNetToJScript 生成的脚本并无该特征。相关介绍，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/172431bprf0m0ui66fhuzf.png)

其次，脚本内容存在 GadgetToJScript 独特的反序列化执行调用链。以生成 vbs 为例，分别使用 DotNetToJScript 与 GadgetToJScript 生成 vbs，并与样本使用的 vbs 代码进行对比，其反序列化执行调用链与 GadgetToJScript 并无太大差异 几乎无明显变化。
DotNetToJScript 生成的 vbs 代码，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/172450kn4rmoo4tn4ttm0k.png)

GadgetToJScript 生成的 vbs 代码，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/172500gadiaizabzeokhik.png)

通过对比可以发现，第一层下载器的 vbs 代码与 GadgetToJScript 生成的 vbs 代码在各方面均高度相似。

#### II. 第二层下载器 (stage\_2 stage\_3)

通过对 stage\_2 stage\_3 进行 Base64 解码后可得到第二层下载器样本。
继上文 I，在第二层样本的 pdb 路径内也可发现"GadgetToJScript"字符串，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/172518mulriblkrqtyq7hu.png)

![](https://attach.52pojie.cn/forum/202311/04/172531z5yegh2hubbzor9w.png)

上文中提到，目前捕获到最早的 chm 样本可能于 2023 年 9 月份出现。因此此处分别查看了 2023 年 9 月与 2023 年 10/11 月的 stage\_2 第二层下载器的 pdb 路径，可以发现明显不断更新的痕迹——字符串从"v4.1.1"变化为"v4.2.0"、新增目录"CHM"（猜测可能与"VBE"相对）、由最初的"TestAssembly.pdb"变化为"strage\_1\_dotnet40.pdb"(stage\_3 的 pdb 路径则是"strage\_1\_dotnet35.pdb")。且与腾讯电脑管家的分析相一致，确实发现了"Tianma"字符串。

第二层下载器使用 .NET 编写，进行分析后可以发现下载“白加黑”的主要逻辑均在 Program 类的 Program 函数下，且多使用云服务器厂商对象存储作为服务器来下载。并且对比多个不同时间样本的第二层下载器，可以发现其在不断更新，不断切换、更换对象存储服务器及文件下载地址。
2023 年 9 月的第二层下载器，仍是"TestAssembly.dll"，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/172620dwylk9k42fz2krkf.png)

2023 年 10 月下旬的 stage\_2 第二层下载器，变化为了"strage\_1\_dotnet40.dll"；而 stage\_3 第二层下载器则为"strage\_1\_dotnet35.dll"，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/172637exo8h488y4jch48r.png)

![](https://attach.52pojie.cn/forum/202311/04/172659myp0r03g56zipiy1.png)

2023 年 11 月上旬的第二层下载器，更换了“白加黑”结构与分离式 ShellCode 的文件名，由原先的"libcef"更换为了"Foolish"，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/172721lxkbauppt3ysmtt5.png)

此外我们发现，在某一版本中，第二层下载器出现了一个名为 HideHH 的函数，而在早期版本中似乎并没有该函数（可直接从上图中观察到，2023 年 9 月的第二层下载器无该函数，而在2023 年 10 月下旬的第二层下载器已存在该函数，2023 年 11 月上旬的第二层下载器该函数部分的代码未变化）。该函数用于修改 IE 安全设置注册表 HKEY\_CURRENT\_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\0，其目的猜测可能是修改 ActiveX 安全设置从而为再次利用 chm 执行恶意行为或操作做准备，因此怀疑作者存在后续引入 chm 衍生物的可能，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/172756lpyvug8eyxe05mpb.png)

![](https://attach.52pojie.cn/forum/202311/04/172807wcp9aec93dkedkfa.png)

![](https://attach.52pojie.cn/forum/202311/04/172816xcm5tb4jblgsl5cn.png)

#### III. “白加黑” gh0st

通过第二层下载器下载，就可以得到一组“白加黑” gh0st

我们捕获到了多组该家族不同时间使用的不同版本的“白加黑”样本，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/172837h9ujozdqzvzq1v9o.png)

![](https://attach.52pojie.cn/forum/202311/04/172847c3eiwfkwwpkddk3d.png)

![](https://attach.52pojie.cn/forum/202311/04/172900upzoyzp8712pzov5.png)

我们将按照样本发现时间的先后依次进行分析，令时间最远的样本为01，时间最近的样本为06，共6组“白加黑”样本。通过分析可以发现黑 dll 中的导出函数均指向同一个解密函数。

01：

样本的导出函数均指向 sub\_10003150 处，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/172922x10xtezoszv3sq9c.png)

在此处就可以发现样本解密、执行 ShellCode ，部分“精彩片段”如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/173002jeim59m5fdpflw5n.png)

02：

同上，不再重复说明，均指向 sub\_10002499 处，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/173012x9hbbzwm1555dq5q.png)

![](https://attach.52pojie.cn/forum/202311/04/173026t08q8m8vb8n3q4nu.png)

03：

从 03 开始，与之前的样本发生了一些变化，不同的导出函数指向多个函数，但仔细观察发现它们之间共同指向同一处，那就是 sub\_100021E0，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/173038ioo9zttob88o5h9a.png)

![](https://attach.52pojie.cn/forum/202311/04/173048bbtemzw4utmfjow3.png)

![](https://attach.52pojie.cn/forum/202311/04/173058saq41a8rqa198zj1.png)

在 sub\_100021E0 处发现样本解密分离式 ShellCode 文件 libcef.png、执行 ShellCode 操作，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/173122bxsns4x1zye7p8xy.png)

![](https://attach.52pojie.cn/forum/202311/04/173809r22ntdlktp1stptk.png)

04：

导出函数均指向 sub\_10001EE0 处，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/174010kk5kosug1dl1qsq9.png)

![](https://attach.52pojie.cn/forum/202311/04/174022t58ply355o9z8yu9.png)

sub\_10001EE0 内，样本解密分离式 ShellCode 文件 libcef.png、执行 ShellCode 操作，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/174037psyhg2nsyr8sqhr5.png)

05：

导出函数仍然均指向 sub\_10001EE0，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/174107i7t22ftrjt2s1h2w.png)

样本解密分离式 ShellCode 文件 1.png Foolish.png、执行 ShellCode 操作，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/174128w6v56621s99n77i9.png)

![](https://attach.52pojie.cn/forum/202311/04/174143edurgzeexh5irk5r.png)

06：

与前面的样本又发生了一些变化，不过仍然是不同的导出函数指向多个函数，但仔细观察发现它们之间共同指向同一处：sub\_10003120((int)&savedregs)，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/174221w88ohkm2cfah2moo.png)

![](https://attach.52pojie.cn/forum/202311/04/174234c6q5y3zm5w62tunt.png)

![](https://attach.52pojie.cn/forum/202311/04/174303jqqguq220hhf1u8u.png)

解密分离式 ShellCode 文件 1.png Foolish.png，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/174330g4lzx4xf60kr08er.png)

字符串由先前的"fuckyou"更换为了"kyou"，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/174341upi7nwj5owr1lncu.png)

因此，我们将最新的样本进行进行对比后，发现样本最新的版本，对黑、白文件和分离式 ShellCode 文件名均发生了变化。其中，最新一个版本已将原先"fuckyou"字符串更换为"kyou"。

该组样本运行后，内存字符串数据与 gh0st 几乎吻合，可以确认确实为 gh0st 远控，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/174431uktzyd3f5zqtoys7.png)

![](https://attach.52pojie.cn/forum/202311/04/174442hwmgftoo5w1fnzkf.png)

![](https://attach.52pojie.cn/forum/202311/04/174450isvcujjf3ukk0juj.png)

![](https://attach.52pojie.cn/forum/202311/04/174506j0gfp1j0fg0cz0m0.png)

![](https://attach.52pojie.cn/forum/202311/04/174518snu2f9ua5qph622t.png)

![](https://attach.52pojie.cn/forum/202311/04/174530o05xblbt8gw809z1.png)

过父添加自启动项，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/174545d9888z8qoq8oqrsd.png)

同时，发现多个编译环境路径，如下图所示：

![](https://attach.52pojie.cn/forum/202311/04/174556jnk3rrha3z35etk7.png)

### 三、Ioc

（部分）
（1）目前捕获到最早的 chm 样本可能于 2023 年 9 月份出现。2023 年 9 月份出现的某个较早样本，Sha-256: 26a2c32196c3b5f1f7d2919e80be0ed7a62e0b6d0b4b7d824501905965e98b6f
（2）首个发现的 vbe 样本可能于 2023 年 10 月下旬出现。2023 年 10 月出现的某个较早样本，Sha-256: 6accbe029b175b6eb590606a8b80fd3dc95578a7e6dadf896a26e4c4b491b6b9
（3）VBE Sha-256:
4bef5bc5f786e0c655379c35ba1143c45e727d20493851abad98b06263f47ff6
551770e4449cd01fa13742ec6d25ee269c4c967f73c2b2a5ddd2185f06cf09dd
6accbe029b175b6eb590606a8b80fd3dc95578a7e6dadf896a26e4c4b491b6b9
5b121438f6215a7867bbd75b93c5b8672a9e01d716f951c65a9fb52284daf4be
64536869eb8453af0371f6e1e5787eb4c2e172aae88e05aa3f7913daf92807e8
44cd698fb468b0320ff30d1ab9a39b06ef128473180397093f19b86f07682601
3bfda84d115e2ff50173e7f515c605b0585a9ae799d59626b053ed1f921abd25
……
（4）“白加黑”中的黑 libcef.dll Sha-256:
33513b90bd5f166bb6a729d00bb0a953114c52514fdfd8ad1d84d7eae229657f
9c3cbec630eb954aa8e80dc28bdb930a1d47f2e10862e230985520e694629afc
5292b6b251360b677532290d1346d8e627a807c826ef25347f14db5c23a27c86
0197f33346f99eda1e0b29b67802fa474201f4ff834ec5f16b751736001ddbcf
1f3b60c0fe890e98d23fdb78dfe0a26b4d1d15b726d5fbbe659941823bad0b2a
6b5e9bfe4999b3de9a14cae6bd4e207bced1ae91b3624fb5223de37a8b92c572
……
（5）恶意软件制作者仍在频繁不断积极更新、开发其恶意软件。

### 四、防护建议

建议不要接收来路不明的可疑文件，及时更新、升级防病毒软件、病毒库。
