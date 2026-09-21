# CSDN爬虫signature加密算法破解

> **作者**: dingallen216 | **发布时间**: 2021-09-12 14:00:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 9021 / 24
> **原文**: [https://www.52pojie.cn/thread-1511380-1-1.html](https://www.52pojie.cn/thread-1511380-1-1.html)

---

*本帖最后由 dingallen216 于 2021-9-13 12:58 编辑*

考研二战，看书看完一章，突然想爬个网页玩玩，就来到csdn，爬爬论坛数据。在设计好爬取的结构后，我开始观察网页内容：

![](https://attach.52pojie.cn/forum/202109/13/125458wmyq8u6m7u8gqf6y.png)

在每一个分类下，都有着一定数量的社区。通过分析，很容易知道进入这些社区的链接是通过js动态加载出来的，链接格式为：
https://bizapi.csdn.net/community-cloud/v1/homepage/community/by/tag?deviceType=PC&tagId=

![](https://attach.52pojie.cn/forum/202109/13/125652xpif10a8afvraiaa.png)

看到这，我便直接发送了get请求，可看到的只有400的响应码。我注意到，响应头里有这么个玩意：
x-ca-error-message: Header `X-Ca-Key` is Required
于是我回到之前请求成功的报文处查看，果然：

![](https://attach.52pojie.cn/forum/202109/13/125832dnjzjddj2nc7z2h4.png)

通过一阵翻找，终于找到了我想到的信息，链接如下：
https://csdnimg.cn/release/cmsfe/public/js/chunk/tpl/ccloud-bbs/index.6485c913.js
![](https://pic1.zhimg.com/v2-8f0fb92960c90a2d2cc439f2291290b8_b.png)
之后观察代码花了蛮长时间的，其实做了很多无用功，这还是源于经验不足，总之后来我想到了两个解决路径，这里说简单的那个。通过调试，在一关键步骤中我们能得到这样一个字符串：
![](https://pic4.zhimg.com/v2-9e2611c9fc43fe15d35acb81033c97ef_b.png)
这样一个字符串是极易拼接的，得到这样一个字符串后，观察代码得知将此字符串通过hmac-sha256算法+Base64编码后就能得到签名。
上一段爬取x-ca-key和hmac-sha256密码的代码：

[Python] *纯文本查看*

```
def get_keys(html):[/size]
[size=3]    index_url = re.search('https://csdnimg\.cn/release/cmsfe/public/js/chunk/tpl/ccloud-bbs/index\..*\.js',[/size]
[size=3]                          html).group()[/size]
[size=3]    index_js = requests.get(index_url).text[/size]
[size=3]    appSecret = re.search('''appSecret:"([a-zA-Z0-9]*)"''', index_js).group(1)[/size]
[size=3]    key = re.search('''e.headers\["X-Ca-Key"\]=([0-9]*),''', index_js).group(1)[/size]

[size=3]    return appSecret, key
```

输入的参数就是进入到的csdn的主界面的html text。
其实也就是课余玩一玩，后面爬成啥样我也不知道，但至少自此csdn已门户大开。
晒一晒爬到的论坛url：

[Python] *纯文本查看*

```
https://bbs.csdn.net/forums/CSharp
https://bbs.csdn.net/forums/C
https://bbs.csdn.net/forums/CPPLanguage
https://bbs.csdn.net/forums/DotNET
https://bbs.csdn.net/forums/JavaOther
https://bbs.csdn.net/forums/OL_Script
https://bbs.csdn.net/forums/ST_Arithmetic
https://bbs.csdn.net/forums/Apache
https://bbs.csdn.net/forums/ASM
https://bbs.csdn.net/forums/php
https://bbs.csdn.net/forums/VB
https://bbs.csdn.net/forums/BCBBase
https://bbs.csdn.net/forums/Qt
https://bbs.csdn.net/forums/HPDatabase
https://bbs.csdn.net/forums/python
https://bbs.csdn.net/forums/DelphiVCL
https://bbs.csdn.net/forums/ROR
https://bbs.csdn.net/forums/DotNET_Other
https://bbs.csdn.net/forums/golang
https://bbs.csdn.net/forums/swift
https://bbs.csdn.net/forums/Heterogeneous
https://bbs.csdn.net/forums/CUDA_Dev
https://bbs.csdn.net/forums/plugin
https://bbs.csdn.net/forums/regexp
https://bbs.csdn.net/forums/rust
https://bbs.csdn.net/forums/demo_university
https://bbs.csdn.net/forums/ideaplugin
https://bbs.csdn.net/forums/scratchfans
https://bbs.csdn.net/forums/sprbootComtion
https://bbs.csdn.net/forums/ChromiumApp
https://bbs.csdn.net/forums/0voice
https://bbs.csdn.net/forums/GamesDevelop
https://bbs.csdn.net/forums/GD_Unity3D
https://bbs.csdn.net/forums/GD_Cocos2d-x
https://bbs.csdn.net/forums/Gdesignoperation
https://bbs.csdn.net/forums/vr_git
https://bbs.csdn.net/forums/JavaScript
https://bbs.csdn.net/forums/HTMLCSS
https://bbs.csdn.net/forums/HTML5
https://bbs.csdn.net/forums/XMLSOAP
https://bbs.csdn.net/forums/IIS
https://bbs.csdn.net/forums/CGI
https://bbs.csdn.net/forums/ColdFusion
https://bbs.csdn.net/forums/vue
https://bbs.csdn.net/forums/kingwenfeng
https://bbs.csdn.net/forums/gishome
https://bbs.csdn.net/forums/hadoop
https://bbs.csdn.net/forums/ST_Security
https://bbs.csdn.net/forums/spark
https://bbs.csdn.net/forums/docker
https://bbs.csdn.net/forums/server
https://bbs.csdn.net/forums/CloudStorage
https://bbs.csdn.net/forums/ITID
https://bbs.csdn.net/forums/huaweicloud
https://bbs.csdn.net/forums/CloudFoundry
https://bbs.csdn.net/forums/lx
https://bbs.csdn.net/forums/hwfsdeveloper
https://bbs.csdn.net/forums/AWS
https://bbs.csdn.net/forums/tdengine
https://bbs.csdn.net/forums/GAE
https://bbs.csdn.net/forums/api
https://bbs.csdn.net/forums/BigdataPage
https://bbs.csdn.net/forums/dailycode
https://bbs.csdn.net/forums/ST_Image
https://bbs.csdn.net/forums/OpenCV
https://bbs.csdn.net/forums/tensorflow
https://bbs.csdn.net/forums/harix
https://bbs.csdn.net/forums/paddlepaddle
https://bbs.csdn.net/forums/daydayup
https://bbs.csdn.net/forums/vrar
https://bbs.csdn.net/forums/nlp
https://bbs.csdn.net/forums/OneFlow
https://bbs.csdn.net/forums/CVInstitute
https://bbs.csdn.net/forums/Tengine
https://bbs.csdn.net/forums/speechhome
https://bbs.csdn.net/forums/magichub.io
https://bbs.csdn.net/forums/aishelltech
https://bbs.csdn.net/forums/Redstone
https://bbs.csdn.net/forums/ST_Network
https://bbs.csdn.net/forums/Hardware_SwitchRouter
https://bbs.csdn.net/forums/ospf
https://bbs.csdn.net/forums/IP_Protocolconfiguration
https://bbs.csdn.net/forums/voip
https://bbs.csdn.net/forums/maintainmanage
https://bbs.csdn.net/forums/IR
https://bbs.csdn.net/forums/NetworkC_CDN
https://bbs.csdn.net/forums/kube-ovn
https://bbs.csdn.net/forums/WinCE
https://bbs.csdn.net/forums/HardwareUse
https://bbs.csdn.net/forums/Hardware_Computer
https://bbs.csdn.net/forums/VxWorks
https://bbs.csdn.net/forums/SmartHardware
https://bbs.csdn.net/forums/Hardware_Digital
https://bbs.csdn.net/forums/shumeipai
https://bbs.csdn.net/forums/aijishu
https://bbs.csdn.net/forums/edgerOS
https://bbs.csdn.net/forums/haas
https://bbs.csdn.net/forums/zigbee
https://bbs.csdn.net/forums/Android
https://bbs.csdn.net/forums/ios
https://bbs.csdn.net/forums/weixin
https://bbs.csdn.net/forums/MobileAD
https://bbs.csdn.net/forums/flutterdev
https://bbs.csdn.net/forums/SwiftCommunity
https://bbs.csdn.net/forums/Windows7
https://bbs.csdn.net/forums/VC_Basic
https://bbs.csdn.net/forums/WindowsSecurity
https://bbs.csdn.net/forums/Silverlight
https://bbs.csdn.net/forums/WindowsMobile
https://bbs.csdn.net/forums/WinNT2000XP2003
https://bbs.csdn.net/forums/NetworkConfiguration
https://bbs.csdn.net/forums/WindowsBase
https://bbs.csdn.net/forums/SE_Quality
https://bbs.csdn.net/forums/DesignPatterns
https://bbs.csdn.net/forums/CVS_SVN
https://bbs.csdn.net/forums/SE_Management
https://bbs.csdn.net/forums/autosar
https://bbs.csdn.net/forums/SoftwareEngineering
https://bbs.csdn.net/forums/shopxo
https://bbs.csdn.net/forums/aboutui
https://bbs.csdn.net/forums/Linux_Development
https://bbs.csdn.net/forums/WebAppServer
https://bbs.csdn.net/forums/Linux_Kernel
https://bbs.csdn.net/forums/harmonyos
https://bbs.csdn.net/forums/rtthread
https://bbs.csdn.net/forums/Xenomai
https://bbs.csdn.net/forums/OpenHarmony
https://bbs.csdn.net/forums/MySQL
https://bbs.csdn.net/forums/MSSQL_Basic
https://bbs.csdn.net/forums/Oracle_Develop
https://bbs.csdn.net/forums/Access
https://bbs.csdn.net/forums/MongoDB
https://bbs.csdn.net/forums/PostgreSQL
https://bbs.csdn.net/forums/gaussdb
https://bbs.csdn.net/forums/DataIntegration
https://bbs.csdn.net/forums/Greenplum
https://bbs.csdn.net/forums/neo4j
https://bbs.csdn.net/forums/ERP
https://bbs.csdn.net/forums/ExchangeServer
https://bbs.csdn.net/forums/intel
https://bbs.csdn.net/forums/qualcomm
https://bbs.csdn.net/forums/Xamarin
https://bbs.csdn.net/forums/JetBrains
https://bbs.csdn.net/forums/tcl
https://bbs.csdn.net/forums/zego
https://bbs.csdn.net/forums/chinaunicom
https://bbs.csdn.net/forums/atlassian
https://bbs.csdn.net/forums/fusioninsightdeveloper
https://bbs.csdn.net/forums/epubit
https://bbs.csdn.net/forums/cosmic
https://bbs.csdn.net/forums/digitalsail
https://bbs.csdn.net/forums/zichen
https://bbs.csdn.net/forums/602team
https://bbs.csdn.net/forums/SSTC
https://bbs.csdn.net/forums/Trainning_SPKS
https://bbs.csdn.net/forums/ccc
https://bbs.csdn.net/forums/jobdiscussion
https://bbs.csdn.net/forums/qiuzhao
https://bbs.csdn.net/forums/webdeve
https://bbs.csdn.net/forums/Ajax
https://bbs.csdn.net/forums/ASP
https://bbs.csdn.net/forums/DB2
https://bbs.csdn.net/forums/Flex
https://bbs.csdn.net/forums/vbScript
https://bbs.csdn.net/forums/SharePoint
https://bbs.csdn.net/forums/VC_ActiveX
https://bbs.csdn.net/forums/Symbian
https://bbs.csdn.net/forums/WebSphere
https://bbs.csdn.net/forums/Sybase
https://bbs.csdn.net/forums/VFP
https://bbs.csdn.net/forums/FlashDevelop
https://bbs.csdn.net/forums/VBA
https://bbs.csdn.net/forums/Informix
https://bbs.csdn.net/forums/BlackBerry
https://bbs.csdn.net/forums/PB_Basic
https://bbs.csdn.net/forums/FreeZone
https://bbs.csdn.net/forums/JBoss
https://studentclub.csdn.net
https://bbs.csdn.net/forums/SearchEngine
https://bbs.csdn.net/forums/placard
https://bbs.csdn.net/forums/GIS
https://bbs.csdn.net/forums/Middleware
https://bbs.csdn.net/forums/PaypalCommunity
https://bbs.csdn.net/forums/BlockchainTechnology
https://bbs.csdn.net/forums/Moderator
https://bbs.csdn.net/forums/sdwj
https://bbs.csdn.net/forums/dea
https://bbs.csdn.net/forums/littlepig
https://bbs.csdn.net/forums/geeknews
https://bbs.csdn.net/forums/openatomeedu
https://bbs.csdn.net/forums/FindWorks
https://bbs.csdn.net/forums/learnjava
https://bbs.csdn.net/forums/nsicdse
https://bbs.csdn.net/forums/hok
https://bbs.csdn.net/forums/fzuSoftwareEngineering2021
https://bbs.csdn.net/forums/MUEE308FZ
https://bbs.csdn.net/forums/csuft_swxy_C
https://bbs.csdn.net/forums/Ethereum
https://bbs.csdn.net/forums/starpool
https://bbs.csdn.net/forums/bitcoinsv
```
