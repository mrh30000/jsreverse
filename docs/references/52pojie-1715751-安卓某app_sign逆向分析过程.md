# 安卓某app_sign逆向分析过程

> **作者**: a976606645 | **发布时间**: 2022-11-20 04:53:00 | **版块**: 『移动安全区』 | **查看/回复**: 23360 / 163
> **原文**: [https://www.52pojie.cn/thread-1715751-1-1.html](https://www.52pojie.cn/thread-1715751-1-1.html)

---

### 开篇

> [安卓协议逆向之frida hook百例](https://www.52pojie.cn/forum.php?mod=viewthread&tid=1711668)
> 在看到大佬的这篇文章后，想动手跟着分析一波，在下载目标APP时没有注意版本号的问题，下载了新版本的，记录下分析的过程。

### 准备工具

```
1. root设备
2. BlackDex
3. frida
4. IDA
5. jadx
```

### 目标

目标是搞到sign的算法 看sign的长相跟长度 先盲猜一波MD5

![](https://attach.52pojie.cn/forum/202410/12/142048eccjawpjzl232jct.jpg)

### 开工

直接用BlackDex打开目标APP 获取到dex
拖入jadx开始分析
搜索接口名字 查找调用

![](https://attach.52pojie.cn/forum/202410/12/142051t3rz9yq7hm4to933.jpg)

发现有两处调用的地方，双击进去探探情况

![](https://attach.52pojie.cn/forum/202410/12/142053nab9s2s1lwqsolj2.jpg)

继续搜索一下定义的名称  查找调用

![](https://attach.52pojie.cn/forum/202410/12/142055e991p2x3emmavm44.jpg)

继续跟进 找到了关键点

![](https://attach.52pojie.cn/forum/202410/12/142057ypmpyp4py5341eoh.jpg)

![](https://attach.52pojie.cn/forum/202410/12/142059ip1z80e0l98pmffu.jpg)

![](https://attach.52pojie.cn/forum/202410/12/142101hnpjb5u2lg5uggpy.jpg)

![](https://attach.52pojie.cn/forum/202410/12/142103gf6dflxflqlhh6ba.jpg)

### 分析so

解压apk  找到lib下的 `libblackBox.so`  在IDA中打开
在IDA方法窗口中搜索`getInterfaceSign`  无果
推测方法为动态注册  到`JNI_OnLoad`入口找找看

![](https://attach.52pojie.cn/forum/202410/12/142105tmb2l42gpb9sodpv.jpg)

按下`F5`查看伪代码
看到`VX+XXX`这种格式的伪代码 鼠标点击定位到`VX`的位置 按`Y`键修复指针

![](https://attach.52pojie.cn/forum/202410/12/142107leu2bft5mi1t2ij5.jpg)

![](https://attach.52pojie.cn/forum/202410/12/142109db6zcu6ieez6fcau.jpg)

进入查看
找到了动态注册的方法 分析上面JAVA层调用的`getInterfaceSign`方法 只有一个参数 最终确定so层的函数为`sub_49268`

![](https://attach.52pojie.cn/forum/202410/12/142111i4sxskaahhkqs5oa.jpg)

继续跟进

![](https://attach.52pojie.cn/forum/202410/12/142113u3j7j16uj4utgjwj.jpg)

![](https://attach.52pojie.cn/forum/202410/12/142115o6tgrgbylhyry679.jpg)

```
鼠标点击定位到`a1`的位置 按`Y`键修复指针
一番寻找之后 发现所有的return里面 都有`a1`的参与
那现在目的就明确了 我们需要找到对`a1`有所改动的地方
但是没有发现直接对`a1`赋值的的语句
这说明`a1`是在某一个调用函数里面改变的值
接下来的重点就是调查里面的sub函数们
先着重调查了`a1`为参数的函数  没有找到有用的信息
```

![](https://attach.52pojie.cn/forum/202410/12/142117f3kbjgkix8kbyrkq.jpg)

在排查过程中  发现了这个函数 明文上没有`a1`参数的参与
但是把鼠标移动到`v34`上 弹出的提示信息中 有`a1`的存在 跟进一下

![](https://attach.52pojie.cn/forum/202410/12/142119xhh48dvvv4edv4wm.png)

![](https://attach.52pojie.cn/forum/202410/12/142122w5henv1lu1x4xv45.png)

![](https://attach.52pojie.cn/forum/202410/12/142124c6walbj6ln6m1za7.jpg)

终于 在`sub_F39A8`发现了关键点 一个小写转大写的函数过程

![](https://attach.52pojie.cn/forum/202410/12/142126m3s4y30ifq3by3fy.jpg)

这段代码中的`sub_4BBE4`就很可疑了，继续跟进

```
__int64 __fastcall sub_F39A8(__int64 a1, __int64 a2, const char *a3)
{
  __int64 v4; // x19

  if ( !a1 && !a3 )
    return 0xFFFFFFFFLL;
  v4 = 0LL;
  if ( sub_4BBE4() )
    return 0xFFFFFFFFLL;
  while ( (int)strlen(a3) > (int)v4 )
  {
    a3[v4] = toupper((unsigned __int8)a3[v4]);
    ++v4;
  }
  return 0LL;
}
```

在这里 发现了一个MD5关键函数
分析到这里 我们该验证一下了 已知该函数的偏移地址是：`0x4BBE4`

![](https://attach.52pojie.cn/forum/202410/12/142128i7vyi0rr0gk6rv36.jpg)

### frida hook so

> 我这里使用的是安卓真机 安装了去root特征的系统
> 我不确定目标APP有无root检测
> 如测试时启动APP有闪退的情况 还需要自行过一下root检测

接下来编写frida的hook脚本
将IDA分析的函数偏移地址填写进脚本

```
Java.perform(function () {
    function get_func_addr(module, offset) {
        var base_addr = Module.findBaseAddress(module);
        console.log("base_addr: " + base_addr);
        console.log(hexdump(ptr(base_addr), {
            length: 16, header: true, ansi: true
        }))
        var func_addr = base_addr.add(offset);
        if (Process.arch == 'arm') return func_addr.add(1);  //如果是32位地址+1
        else return func_addr;
    }

    var func_addr = get_func_addr('libblackBox.so', 0x4BBE4);//参数：so名称  偏移地址
    console.log('func_addr: ' + func_addr);
    console.log(hexdump(ptr(func_addr), {
        length: 16, header: true, ansi: true
    }))

    Interceptor.attach(ptr(func_addr), {
        onEnter: function (args) {//产生调用时hook输入的参数
            console.log("onEnter");
            console.log(args[0].readCString())
        }, onLeave: function (retval) {
            console.log(retval)
        }
    });
});
```

编写好脚本后 使用`adb shell`命令 启动手机上的`frida-server`  注入脚本

```
frida -U -f com.cxxx.xxxxx --no-pause -l hook3.js
```

注入后出现问题了  app直接闪退

![](https://attach.52pojie.cn/forum/202410/12/142130ucima0nj6fqnzmea.jpg)

说明app识别到了frida的特征 ~~自杀了属于是~~ 我们需要过frida检测
在这里使用了大佬编译的[去特征版本的strongR-frida](https://github.com/hzzheyang/strongR-frida-android/releases)
`adb push`到手机后 启动frida服务 重新注入 没有发生闪退情况
并且 可以看到`sub_4BBE4()`的参数被成功打印出来了

![](https://attach.52pojie.cn/forum/202410/12/142132uossc77fub1fi6vb.jpg)

在app里面的账号登录页面  请求一下login接口试试情况

果然能看到明文信息

![](https://attach.52pojie.cn/forum/202211/20/041044vkdu5nmwdz6ww5d7.png)

将明文复制出来 MD5加密一下 看看结果

![](https://attach.52pojie.cn/forum/202211/20/041443x7jaffyy7sj7d55d.png)

验证成功！！

### 后记

这是我第一次尝试分析so 整个过程收获了许多
希望对你也有所帮助
