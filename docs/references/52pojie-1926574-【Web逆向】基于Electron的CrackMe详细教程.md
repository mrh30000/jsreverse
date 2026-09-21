# 【Web逆向】基于Electron的CrackMe详细教程

> **作者**: hualy | **发布时间**: 2024-05-21 13:01:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 9504 / 71
> **原文**: [https://www.52pojie.cn/thread-1926574-1-1.html](https://www.52pojie.cn/thread-1926574-1-1.html)

---

*本帖最后由 hualy 于 2024-5-21 13:07 编辑*

在教程开始之前，感谢**[collinchen1218](https://www.52pojie.cn/home.php?mod=space&uid=1905578)****提供的CrackMe，感谢****[cattie](https://www.52pojie.cn/home.php?mod=space&uid=672652)****的指导**[CrackMe地址](https://www.52pojie.cn/thread-1925941-1-1.html)
1、双击打开下载好的文件
![](https://attach.52pojie.cn/forum/202405/21/130220i4ya5zv60gnhi4l4.png)
会弹出一个界面，借助大佬的经验进行操作：electron嘛，肯定会在本地设置一个服务器。直接利用netstat -na看本地端口连接情况
![](https://attach.52pojie.cn/forum/202405/21/130222ue0l1exhd8wziaad.png)
2、找出本地服务器打开任务管理器，找到相关进程，在这其实可以看出是Electron框架（应该把前端页面搞成exe文件的）做的，然后点击下面的第一个，右键打开菜单，转到详细信息
![](https://attach.52pojie.cn/forum/202405/21/130225jfmn4dnnm1i82i4s.png)
这样子就可以看到PID是多少了
![](https://attach.52pojie.cn/forum/202405/21/130228trbixgub7vi8digb.png)
这四个如何选择呢？答案是选第一个，也就是CrackMe的运行跳转到的那个，其他的会没反应
![](https://attach.52pojie.cn/forum/202405/21/130230tm504c844c2uc7lu.png)

* TCP：表示这是基于TCP协议的连接。
* 127.0.0.1:49790：这是本地主机的IP地址和端口号。127.0.0.1 是本地回环地址，通常用于本地主机与本地主机之间的通信。49790 是源端口号。
* 127.0.0.1:49789：这是另一个本地主机的IP地址和端口号，作为连接的目标。49789 是目标端口号。
* ESTABLISHED：这表示连接已经建立，正在进行数据传输。
* 17400：这是与此连接相关的进程的标识符，通常是操作系统分配给该进程的一个数字。

而我们要打开的则是127.0.0.1:49789，相当于本机访问百度那样，而我们实际是本机访问本机的一个程序
![](https://attach.52pojie.cn/forum/202405/21/130232yxizppupx4i4daph.png)
这样子就可以开心愉快的进行调试啦但是却发现F12、ctrl+shift+i快捷键打不开开发者工具只能够点击打开自定义及控制--更多工具--开发者工具来打开开发者工具
![](https://attach.52pojie.cn/forum/202405/21/130234p6nc5bt557k5knh2.png)
然后进行以下操作：
![](https://attach.52pojie.cn/forum/202405/21/130237exe30jqsx0yv97ry.png)
下断点进行动态调试，下完断点后刷新页面
![](https://attach.52pojie.cn/forum/202405/21/130239psh24cywkwf3s3hw.png)

发现debugger
![](https://attach.52pojie.cn/forum/202405/21/130241hf0qppq1vpxesqwp.png)
解决debugger尝试1：下断点后修改断点为false,然后回车确认，测试了好多遍，时行时不行，就相当于是不行！
![](https://attach.52pojie.cn/forum/202405/21/130244jpb5j9is49ziki55.png)

![](https://attach.52pojie.cn/forum/202405/21/130246zokoazhrkh8ojk30.png)

![](https://attach.52pojie.cn/forum/202405/21/130248eikxz79t18fmfza7.png)
尝试2：替换调用的js，解决不了问题就解决制作问题的代码
![](https://attach.52pojie.cn/forum/202405/21/130250k4hk03j5wuz4it39.png)
找到制作问题的代码：
![](https://attach.52pojie.cn/forum/202405/21/130253yhmuaz1zjlfl1thh.png)
解决制作问题的代码：         }[\_0x17a01d(0xc2)]('debu' + 'gger')[\_0x17a01d(0x100)]('action'));这一行代码，如何让它不能正常运行呢？增删改都可以，反正就是破坏原本的代码结构使其失效增：
![](https://attach.52pojie.cn/forum/202405/21/130256xafxkxkdgfaxfmpg.png)
改：
![](https://attach.52pojie.cn/forum/202405/21/130258favymm8fmvovno1j.png)
删:
![](https://attach.52pojie.cn/forum/202405/21/130301bx0zuplblpeqau2e.png)
上面那几个虽然可以跳过debugger，但是可能会有一些奇奇怪怪的bug【不是】（我踩过的坑，希望有人也踩一下），所以，最好改一下[\_0x17a01d(0xc2)]('debu' + 'gger')[\_0x17a01d(0x100)]('action'));中的('debu' + 'gger')，比如去掉一个“g”
找到启动的js
![](https://attach.52pojie.cn/forum/202405/21/130303azojs4sl4e4gwrsk.png)
开始调试
![](https://attach.52pojie.cn/forum/202405/21/130306z0scooy0ra9cc3zs.png)

![](https://attach.52pojie.cn/forum/202405/21/130309yt4gowttrm7umc4j.png)

![](https://attach.52pojie.cn/forum/202405/21/130311mzudei4hpmzcqhwm.png)
分析代码：

[JavaScript] *纯文本查看*

```
document.addEventListener('keydown', function(event) {    if (event.ctrlKey && event.shiftKey && event.key === 'I') {        event.preventDefault()    }});document.addEventListener('keydown', function(event) {    if (event.key === 'F12') {        event.preventDefault()    }});var fl1 = "flag{";var fl2 = "pj52}";var pa1 = "collinchen1218";var pa2 = "crackme_";var nu1 = 5555 * 5555;var pa3 = nu1 + "_";var nu2 = 8888 * 8888;var pa4 = nu2 + "_";var nu3 = 5222 * 5222;var pa5 = nu3 + "_";var pa6 = "cm_";var pa7 = "horry_";var pa8 = "52pojie_";var pa9 = "magic_";var rd1 = fl1 + pa2 + pa3 + fl2;var rd2 = fl1 + pa7 + pa2 + fl2;var rd3 = fl1 + pa8 + pa6 + fl2;var rd4 = fl1 + pa9 + pa7 + fl2;var rd5 = fl1 + pa8 + pa1 + fl2;var rd6 = fl1 + pa4 + pa8 + fl2;var rd7 = fl1 + pa6 + pa5 + fl2;var rd8 = fl1 + pa8 + pa1 + fl2;var rd9 = fl1 + pa4 + pa9 + fl2;var rd10 = fl1 + pa5 + pa4 + fl2;function verifyPassword() {    var inputPassword = document.getElementById("inputPassword").value;    var correctPassword = "flag{52pojie_Ha5py_M8y_cr6ckme_qwer56uiop_ht01_N9w@2024}";    var correctPassword2 = "flag{52p0ji5_Ha58y_M8y_cr6c1me_qwer56ulkp_ht01_N9w@2024}";    if (inputPassword === "flag{asdedfgh_cm_9999}") {}    if (inputPassword === rd7 + rd3) {        document.getElementById('editable-div').innerHTML = "密码正确"    } else {        document.getElementById('editable-div').innerHTML = "密码错误"    }}
```

看到以下代码就可以知道判断逻辑了

[JavaScript] *纯文本查看*

```
if (inputPassword === rd7 + rd3) {        document.getElementById('editable-div').innerHTML = "密码正确"    } else {        document.getElementById('editable-div').innerHTML = "密码错误"    }
```

在控制台输入 rd7 + rd3,就可以看到flag了

![](https://attach.52pojie.cn/forum/202405/21/130314m0t99d8fkfwgd9lh.png)
输入flag{cm\_27269284\_pj52}flag{52pojie\_cm\_pj52}验证一下，密码正确

![](https://attach.52pojie.cn/forum/202405/21/130316p9z9uc9gcipc99ce.png)
