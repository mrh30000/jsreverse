# 超星学习通图书馆预约脚本 enc参数加密算法讨论 使用NodeJS用Socket与Python通信

> **作者**: Drzad | **发布时间**: 2023-08-31 19:19:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3374 / 4
> **原文**: [https://www.52pojie.cn/thread-1827947-1-1.html](https://www.52pojie.cn/thread-1827947-1-1.html)

---

**预约关键接口说明**

> GET http://office.chaoxing.com/data/apps/seatengine/submit?roomId=4283&startTime=19:30&endTime=20:00&day=2023-08-29&captcha=&seatNum=021&token=8fdfd1db4396475fb0078ae3369029d3&enc=938614f432712ffce57d4575a261cf21

参数说明：
　　roomId为自习室的id
　　startTime、endTime分别为预约起始时间、预约结束时间
　　day为预约的日期，格式如2023-08-29
　　captcha为空，可能为预留的验证码参数
　　seatNum为预约的座位号（3位数）
　　token为随机生成的字符串，在预约页面内可以抓到
　　enc为对以上7个字段处理后的校验字符串

**相关前端js代码**
　　预约页面主体js（附件内VerifyJS/[代码审计用]seat\_select\_third.js文件同）：https://office.chaoxing.com/staticreserve/js/src/front/apps/seatengine/submit/third/seat\_select\_third.js
　　加密算法js（附件内VerifyJS/submitVerify.min.js文件同）：https://office.chaoxing.com/staticreserve/js/src/front/apps/common/enc/min/submitVerify.min.js
　　其他依赖的requireJS及md5的js见附件

**接口调用分析过程**
**1.**对seat\_select\_third.js进行代码审计：

> 第1行：require(['jquery', 'Vue', 'appUtils', 'moment', 'popup', 'viewer', 'submitVerify', 'baseUtils', 'cxcaptcha', 'md5'], function ($, Vue, AppUtils, moment, popup, Viewer, submitVerify, BaseUtils) {

　　可以看到这里使用了AMD规范的requireJS库进行模块化调用，submitVerify是加密算法的模块

> 第27-35行：var paramObj = {
>       roomId: id,
>       day: \_this.chosedDay,
>       startTime: \_this.chosedTimeInfo.startTime,
>       endTime: \_this.chosedTimeInfo.endTime,
>       seatNum: \_this.chosedSeatNum,
>       captcha: \_this.captcha,
>       token: token
>     }
>
> 第44行：enc: submitVerify.verifyParam(paramObj)

　　这里通过submitVerify.verifyParam方法对paramObj进行加密，paramObj即为接口中的其余7个参数。**经测试，paramObj内参数顺序变化不影响最终加密结果**
**2.**对submitVerify.min.js进行代码审计：
　　开头和结尾都出现了“jsjiami.com”的域名，访问是一个js在线加密工具，根据工具网站描述，该加密方式绝对不可逆，故不考虑解密。

**需求及实现思路**
　　人生苦短，我用Python。本人想用Python实现全自动图书馆座位预约，故而需要在Python中使用enc加密算法。
　　首先想到的是在Python中调用能运行JavaScript的第三方库，因此我将主要代码从网站内抽离出来，**可见附件中的****VerifyJS文件夹，直接运行index.html即可运行**，在此过程中发现必须要引用requireJS库后调用submitVerify.min.js才可以使用加密函数，单独引用则无法调用。而这种方式无法在Python内运行，或许是因为必要的md5.js在单独运行时无法找到，本人才疏学浅，无法解决，故放弃了在Python中运行js脚本的念头。
　　然后想要使用Python打开html取网页内容来“调用”加密函数，但因为访问网页得到的都是html源代码，js执行后显示的内容读取较为麻烦且速度慢，故放弃了这种方式。
　　了解到Node.js&#174; 是一个开源、跨平台的 JavaScript 运行时环境，故开始接触学习NodeJS，搭建了一个基础的环境，并且能运行出结果，在搜索如何与Python进行结合时，发现了可以用Socket通信，**可见附件中的****Node For Verify文件夹，执行“node server.js”即可运行**。

**最终实现方式**
　　首先使用NodeJS运行起有加密算法的环境，NodeJS中作为TCP服务器端，监听9000端口。Python中自动成功登录后，初始化Socket通信客户端，连接本机9000端口，在进行预约请求时，将7个参数按照格式发送给TCP服务器，接收返回的字符串，再向学习通服务器发送数据。

**存在问题**
　　NodeJS在普通用户电脑上没有安装，Socket服务器的IP可能因路由器的DHCP服务导致变换等原因，导致在其他电脑上可能无法使用，不易分享传播，并且运行时同时要运行多个窗口，较为麻烦，想问问各路大神，如何能快速高效的调用这段加密算法呢？

**附件下载**
　　https://musetransfer.com/s/lp3xvncqp
　　其中包含HTML版的VerifyJS文件夹，NodeJS运行版的Node For Verify文件夹，还有配套可用的Python脚本，需自行安装支持库，适当修改main.py内常量，隐私数据已处理。同时webapi.py内有最新的学习通自动登录加密Python算法（由本人自行抓包逆向编写）
