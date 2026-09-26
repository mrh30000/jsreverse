# 仅需10行代码，使用 Frida 完成 AutoJS脚本解密

> **作者**: SQLite | **发布时间**: 2020-05-29 11:41:00 | **版块**: 『移动安全区』 | **查看/回复**: 14055 / 47
> **原文**: [https://www.52pojie.cn/thread-1189150-1-1.html](https://www.52pojie.cn/thread-1189150-1-1.html)

---

本站 longhong 的帖子《 [autojs加密脚本的解密xposed模块，支持360加固](https://www.52pojie.cn/thread-1112407-1-1.html)》提出了AutoJS解密的新姿势，并且用 Xposed 写出了解密插件。但我目前的手机锁了boot ，既无法安装 Xposed ，也不能使用 EDxposed ，所以我沿用了作者的思路，使用了 Frida 来完成解密。相比 Xposed 来讲，如果安装过 Frida 的话，操作起来可能会更简便一些。限于篇幅，本文默认你已经安装好了 Frida ,并了解它的使用。
【如需 Frida 安装及操作教程，可移步<https://www.52pojie.cn/thread-1167681-1-1.html>(简明扼要) 或者 https://www.freebuf.com/articles/system/190565.html （内容详细）】

      如下图所示，涉及js解密的代码中，com.stardust.autojs.script.StringScriptSource 这个Java类很关键：看上去有 2 个构造函数 StringScriptSource（），这是因为其进行了“重载”，即相同的函数名，通过传入不同的参数列表来实现不同的功能。根据分析，我们重点要 Hook 第二个 StringScriptSource() 。我们写出 JS 代码，用Frida注入进去，就可获取解密后的代码了。

![](https://attach.52pojie.cn/forum/202005/29/113918kfiofiz9cfot3meh.png)

        话不多说，都在代码和注释里：

[JavaScript] *纯文本查看*

```

//用来保存解密后的js脚本
function write_file(full_path, data) {
    var f = new File(full_path, 'w')
    f.write(data)
    f.close()
}

Java.perform(function () {
    var ClassName = Java.use('com.stardust.autojs.script.StringScriptSource');//Hook上文所说的Java类

    // $init 表示是该类的 构造函数
    // overload("java.lang.String","java.lang.String")表示进行带两个 string 参数的重载
//第一个参数param_1是待解密的文件名,第二个参数param_2是解密后的代码,我们要的就是这个。
    ClassName.$init.overload("java.lang.String","java.lang.String").implementation=function(param_1,param_2){

//将param_2的内容写入手机内部存储，这个要根据各自的手机具体设置，我的手机的路径为/storage/emulated/0/main_dump.js
        write_file("/storage/emulated/0/main_dump.js", param_2)

        // 让函数继续其正常的工作
        var ret =  this.$init(param_1,param_2);
        return ret;
    }
});
```

代码写完后保存到  D:\myhook.js ,要注意，原APK的解密函数只在程序刚开始启动的时候调用。如果APK启动之后再注入脚本，是获取不到解密的StringScriptSource()方法的。所以要再cmd窗口输入如下命令：
**frida -U -l D:/myhook.js -f com.example.script --no-pause**

其中-f 即spwan，在程序最先启动的时候注入。--no-pause表示是不暂停。如图：

![](https://attach.52pojie.cn/forum/202005/29/113954cgkj32bgpq3j82wz.png)

这样就可以在手机内部存储的根目录中找到名为 main\_dump.js 的解密后的脚本啦。
