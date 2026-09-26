# 某东到家 app so signkeyV1 参数分析

> **作者**: qinless | **发布时间**: 2021-11-12 14:14:00 | **版块**: 『移动安全区』 | **查看/回复**: 14082 / 76
> **原文**: [https://www.52pojie.cn/thread-1542726-1-1.html](https://www.52pojie.cn/thread-1542726-1-1.html)

---

*本帖最后由 qinless 于 2021-11-12 18:49 编辑*

## 前言

> ***京东到家 app signKeyv1 参数分析，版本 8.14.0***

## charles 抓包

![](https://attach.52pojie.cn/forum/202111/12/140436iamlglz9s0leomsm.png)

就是 `djencrypt` 这个参数，是一个加密串，分析一下

## java 层分析

![](https://attach.52pojie.cn/forum/202111/12/140439lcu7tccvk7f1cr0c.png)

全局搜索定位到这个函数 `base.net.volley.BaseStringRequest.getParams`，跟进 `DaojiaAesUtil.encrypt` 看看

![](https://attach.52pojie.cn/forum/202111/12/140441h9spd6su9o9nuu3o.png)

在跟进 `AesCbcCrypto.encrypt` 这个函数

![](https://attach.52pojie.cn/forum/202111/12/140444t4tfazz0yfofonq4.png)

里面写的还是比较清楚的，加密方式是 `AES/CBC/PKCS5Padding` 使用 `cyberchef` 解密试试

![](https://attach.52pojie.cn/forum/202111/12/140447xc17gf8ii8i8d8nn.png)

解密成功，主要是分析这个 `signKeyV1` 参数，看长度是 `64`，猜测是 `sha256` 加密，分析一下

![](https://attach.52pojie.cn/forum/202111/12/140451ez1v54wy38hf48if.png)

全局搜索定位到这里，调用 `k2 native` 函数获取的，在 `libjdpdj.so` 文件里

![](https://attach.52pojie.cn/forum/202111/12/140453dhfd5vt1ao7u34fx.png)

打开 `so` 进入 `JNI_OnLoad` 函数，这里是动态注册的，点击 `off_117004`

![](https://attach.52pojie.cn/forum/202111/12/140459e1xxa0ubxb0zbra6.png)

这里看到，函数注册列表，点进 `gk2` 函数

![](https://attach.52pojie.cn/forum/202111/12/140502i3kyrr3tr4fkp3s3.png)

前面是一些数据处理，下面有个 `j_hmac_sha256` 函数，可以确实是用的 `hmac sha256` 算法

![](https://attach.52pojie.cn/forum/202111/12/140505n4kbz4s2col4lb4b.png)

这里的符号都没去掉，`init update final` 函数都能看到，这里应该是标准的算法，因为使用的是 `openssl` 库，先写个 `frida hook` 一下

## frida hook

```
function hook() {
    var javaString = Java.use('java.lang.String');
    var zCls = Java.use('jd.net.z');

    zCls.k2.implementation = function (a) {
        console.log('zCls.k2.a: ', javaString.$new(a));

        var res = this.k2(a);
        console.log('zCls.k2.res: ', res);

        return res;
    }
}
```

这里 `hook java k2` 函数的输入输出

```
function hookSo1() {
    var hmac_sha256 = Module.findExportByName('libjdpdj.so', 'hmac_sha256')
    var HMAC_CTX_init = Module.findExportByName('libjdpdj.so', 'HMAC_CTX_init')
    var HMAC_Update = Module.findExportByName('libjdpdj.so', 'HMAC_Update')
    var HMAC_Init_ex = Module.findExportByName('libjdpdj.so', 'HMAC_Init_ex')

    Interceptor.attach(hmac_sha256, {
        onEnter: function (args) {
            console.log('hmac_sha256 参数 1: ', hexdump(args[0]));
            console.log('hmac_sha256 参数 2: ', hexdump(args[1]));
            console.log('hmac_sha256 参数 3: ', hexdump(args[2]));
            console.log('hmac_sha256 参数 4: ', hexdump(args[3]));
        },
        onLeave: function (retValue) {
        }
    })

    Interceptor.attach(HMAC_CTX_init, {
        onEnter: function (args) {
            console.log('HMAC_CTX_init 参数 1: ', hexdump(args[0]));
        },
        onLeave: function (retValue) {
        }
    })

    Interceptor.attach(HMAC_Update, {
        onEnter: function (args) {
            console.log('HMAC_Update 参数 1: ', hexdump(args[0]));
            console.log('HMAC_Update 参数 2: ', hexdump(args[1], {length: 1200}));
            console.log('HMAC_Update 参数 3: ', hexdump(args[2]));
        },
        onLeave: function (retValue) {
        }
    })

    Interceptor.attach(HMAC_Init_ex, {
        onEnter: function (args) {
            console.log('HMAC_Init_ex 参数 1: ', hexdump(args[0]));
            console.log('HMAC_Init_ex 参数 2: ', hexdump(args[1]));
            console.log('HMAC_Init_ex 参数 3: ', hexdump(args[2]));
            console.log('HMAC_Init_ex 参数 4: ', hexdump(args[3]));
            console.log('HMAC_Init_ex 参数 5: ', hexdump(args[4]));
        },
        onLeave: function (retValue) {
        }
    })
}
```

这里在 `hook` 一些 `so` 函数，`hamc` 会有个 `key` 一般在 `init` 的时候初始化

```
function main() {
    Java.perform(function () {
        hook();
        hookSo1();
    })
}
```

启动脚本 `frida -UF -l hook.js | tee hook.log`

![](https://attach.52pojie.cn/forum/202111/12/140508kjz9htfdqsbtqxv3.png)

`k2` 函数的输入是请求参数

![](https://attach.52pojie.cn/forum/202111/12/140511v24284zk488oj382.png)

`HMAC_Init_ex so` 函数的参数二，长度 `32` 猜测是 `hamc key`

![](https://attach.52pojie.cn/forum/202111/12/140515ksscn9zew7n799co.png)

`HMAC_Update` 函数是请求参数

![](https://attach.52pojie.cn/forum/202111/12/140517neb9fu2f3k8aeufi.png)

最后的加密结果 `ae07cde50402ef91660dea93dc196f7f82e7bc04322baf4022dc2879434f3fae` 是这个，来验证一下

![](https://attach.52pojie.cn/forum/202111/12/140520mxe0igvbjnh0jx1v.png)

使用 `cyberchef` 加密，结果一样，正是 `hmac sha256`

***Tips: 下面在使用 unidbg 跑起来，毕竟多掌握一些工具总有用处***

## unidbg

```
package com.xiayu.jingdongdaojia;

import com.github.unidbg.AndroidEmulator;
import com.github.unidbg.LibraryResolver;
import com.github.unidbg.Module;
import com.github.unidbg.debugger.Debugger;
import com.github.unidbg.debugger.DebuggerType;
import com.github.unidbg.linux.android.AndroidEmulatorBuilder;
import com.github.unidbg.linux.android.AndroidResolver;
import com.github.unidbg.linux.android.dvm.*;
import com.github.unidbg.linux.android.dvm.array.ByteArray;
import com.github.unidbg.memory.Memory;

import java.io.File;
import java.io.IOException;

public class SignKeyV1Test extends AbstractJni {
    private final AndroidEmulator emulator;
    private final Module module;
    private final VM vm;

    public String apkPath = "apk path";
    public String soPath = "so path";

    private static LibraryResolver createLibraryResolver() {
        return new AndroidResolver(23);
    }

    private static AndroidEmulator createARMEmulator() {
        return AndroidEmulatorBuilder.for32Bit().build();
    }

    public SignKeyV1Test() {
        emulator = createARMEmulator();
        final Memory memory = emulator.getMemory();
        memory.setLibraryResolver(createLibraryResolver());
        vm = emulator.createDalvikVM(new File(apkPath));
        vm.setVerbose(true);

        DalvikModule dm = vm.loadLibrary(new File(soPath), false);
        vm.setJni(this);

        dm.callJNI_OnLoad(emulator);
        module = dm.getModule();
    }

    public void callGetSignKeyV1() {
        DvmClass zClass = vm.resolveClass("jd/net/z");

        DvmObject<?> strRc = zClass.callStaticJniMethodObject(
                emulator,
                "k2([B)Ljava/lang/String;",
                new ByteArray(vm, "参数".getBytes())
        );

        System.out.println("callGetSignKeyV1: " + strRc.getValue());
    }

    public static void main(String[] args) throws IOException {
        SignKeyV1Test signKeyV1 = new SignKeyV1Test();

        signKeyV1.callGetSignKeyV1();
        signKeyV1.destroy();
    }

    private void destroy() throws IOException {
        emulator.close();
    }
}
```

代码写完跑起来

![](https://attach.52pojie.cn/forum/202111/12/140522n90pf2b9pnffguf0.png)

这报错了，缺少函数 `jd/utils/StatisticsReportUtil->getSign()Ljava/lang/String;` 调用的是京东到家 `apk` 的 `java` 代码

![](https://attach.52pojie.cn/forum/202111/12/140526v1uffvlgpyaeuary.png)

点进来看一下，打开逻辑是获取 `apk` 的签名之类的，这里的依赖比较多，不是很好补，一般签名啥的都是固定，直接 `frida call` 一下，获取返回值

```
function callGetSign() {
    var StatisticsReportUtil = Java.use('jd.utils.StatisticsReportUtil');

    var res = StatisticsReportUtil.getSign();
    console.log(res)
}
```

运行成功，获取返回值

![](https://attach.52pojie.cn/forum/202111/12/140528zz63dlx5lmd4j6k6.png)

`unidbg` 补一下，直接写死字符串

![](https://attach.52pojie.cn/forum/202111/12/140531t6jey8lp2kuzz87l.png)

再次运行结果出来了，结果相同

***Tips: 后面在打算学习学习 ida gdb 动态调试，暂时留空***

## IDA 动态调试

// TODO

## GDB 动态调试

// TODO
