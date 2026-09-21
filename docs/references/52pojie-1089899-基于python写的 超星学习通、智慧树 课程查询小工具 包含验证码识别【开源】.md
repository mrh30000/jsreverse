# 基于python写的 超星学习通、智慧树 课程查询小工具  包含验证码识别【开源】

> **作者**: featmellwo | **发布时间**: 2020-01-12 21:24:00 | **版块**: 『编程语言区』 | **查看/回复**: 22462 / 87
> **原文**: [https://www.52pojie.cn/thread-1089899-1-1.html](https://www.52pojie.cn/thread-1089899-1-1.html)

---

说明
前段时间研究了下超星和智慧树的登录协议，并尝试写了一个自动登录并获取课程的程序。
包含了超星的验证码识别 ，准确率达到98%

![](https://static.52pojie.cn/static/image/hrline/1.gif)

**超星登录分析：**

![](https://attach.52pojie.cn/forum/202001/12/193123c9zgwa3v4fheewrg.png)

需要参数：学校 密码 验证码

首先抓了一下他的学校选择接口如下

[Asm] *纯文本查看*

```
https://passport2.chaoxing.com/org/searchUnis?filter=学校&product=44
```

返回一个带schoolid的json数据

![](https://attach.52pojie.cn/forum/202001/12/193457sn28knwgw2g2j6w8.png)

然后我们需要获取一下需要识别的验证码，并识别出验证码（本地识别库已打包）验证码接口GET：https://passport2.chaoxing.com/num/code
最后分析登录接口：POST

[Asm] *纯文本查看*

```
https://passport2.chaoxing.com/unitlogin
PSOT参数
'fid': 学校id
'numcode': 验证码
'password': 密码
'uname': 学号
```

登录成功后直接去课程页面获取课程即可GET**http://mooc1-2.chaoxing.com/visit/courses**

![](https://attach.52pojie.cn/forum/202001/12/205638fsncuusuwscxrs2e.png)

![](https://static.52pojie.cn/static/image/hrline/2.gif)
智慧树分析同样是学校 学号 密码（居然没有验证码？！）

![](https://attach.52pojie.cn/forum/202001/12/210015p7wg5zl5l5y0vglu.png)
按照上面的思路，先获取学校，抓包找一下学校最后很神奇的发现智慧树把所有学校都放在了一起

![](https://attach.52pojie.cn/forum/202001/12/210345wndehodpew4hphnp.png)

由于智慧树并不需要验证码所以我们直接抓登录的登录接口：POST

[Asm] *纯文本查看*

```
https://passport.zhihuishu.com/user/validateCodeAndPassword
'code':学号
'password':密码
'schoolId':学校
```

此接口获取的是加密后的密码 GET然后登录**https://passport.zhihuishu.com/login?pwd='** + 加密后的密码+**"&service=https://onlineservice.zhihuishu.com/login/gologin**登录成功后访问此网址获取uuid GET**https://onlineservice.zhihuishu.com/login/getLoginUserInfo****最后通过uuid获取课程****https://onlineservice.zhihuishu.com/student/getStudentNoCommitExam?uuid="**+uuid然后可以看到课程已经出现了，，，，
PS:由于之前抓的接口，也懒得贴具体返回信息了，大家可以自己去研究下源码

![](https://attach.52pojie.cn/forum/202001/12/211805h82rrz6zko3j6v8r.png)

![](https://static.52pojie.cn/static/image/hrline/2.gif)

源码+识别库打包↓链接：<https://pan.baidu.com/s/1v7wE3MLcC3q1mDJw8MZkqg>
提取码：fklu
复制这段内容后打开百度网盘手机App，操作更方便哦
