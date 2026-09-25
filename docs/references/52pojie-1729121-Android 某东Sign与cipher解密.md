# Android 某东Sign与cipher解密

> **作者**: 胡家二少 | **发布时间**: 2022-12-21 15:50:00 | **版块**: 『移动安全区』 | **查看/回复**: 19849 / 132
> **原文**: [https://www.52pojie.cn/thread-1729121-1-1.html](https://www.52pojie.cn/thread-1729121-1-1.html)

---

*本帖最后由 胡家二少 于 2022-12-21 17:13 编辑*

### Android 某东Sign与cipher解密

> 最近疫情原因，哎，又沦落到了抢抢抢的境地，洋洋洒洒的网页端一气呵成写了个小助手哈，想要买莲花清瘟，一看只能手机APP购买。我去！真无语！那么再拿手机端开个刀吧，作如下记录。
>
> 本人所发布的文章仅限用于学习和研究目的；不得将上述内容用于商业或者非法用途，否则，一切后果请用户自负。如有侵权请联系我删除处理。

主要功能涉及如下：

1.解密sign

2.解密cipher

#### 1.APP版本：

---

**For Android V11.3.2 build98450**

#### 2.工具

---

预先善其事，必先利其器！请先准备如下分析工具

1. [Jadx](https://github.com/skylot/jadx.git)
2. [IDA](https://hex-rays.com/IDA-pro/)
3. [Frida](https://frida.re/)
4. [unidbg](https://github.com/zhkl0228/unidbg)
5. [Charles](https://www.charlesproxy.com/)
6. [Pycharm](https://www.jetbrains.com/)(可选)
7. [Vscode](https://code.visualstudio.com/)（可选）

#### 3.分析

> 手机环境配置抓包请大家自己解决。下面演示购物车数据的抓取功能。从手机到PC端代码实现。

##### Charles抓包

打开手机app，然后再点击购物车功能

`https://api.m.*.com/client.action`

我们在Charles会看到很多这个地址的请求，我们可以找一下购物车的包，地址中包含 **functionid=cart** 的就是购物车的请求

![](https://attach.52pojie.cn/forum/202212/21/154814xmzsxg1bi01zrb1v.png)

我们详细的看一下这个请求所携带的数据如下：

![](https://attach.52pojie.cn/forum/202212/21/154816boimjzgjig5gxqjg.png)

经过多次抓包查看，发现这三个值是变化的。因此我们开始分析APP。

##### Sign-Jadx静态分析

把app导入到jadx，我们要追踪st，sign，sv这三个参数的来源，那么我们线搜索一下，大概找下sign的位置

![](https://attach.52pojie.cn/forum/202212/21/154818d88ctz848l1p61k1.png)

看到我标注的那个方法，**addQueryParameter** 翻译一下不就是添加sign参数嘛。点进去分析看看。

经过frida注入调试，分析出确实是这个方法 但是他是不进这个if的，不是这上半部分的代码，而是下半部分的代码

![](https://attach.52pojie.cn/forum/202212/21/154821vfobb8rofhht4fbl.png)

最终定位到是下面的这行代码生成的sign，而且还有其他的2个参数 st与sv

![](https://attach.52pojie.cn/forum/202212/21/154823g144eltkz3e2v4kk.png)

我们继续点击这个函数进去看一下发现是个接口。有接口必然有实现！

![](https://attach.52pojie.cn/forum/202212/21/154825jzlhlph4e3qove3j.png)

那么如何去找它的实现类呢？我们继续搜索搜索这个类的完整路径  `com.jingdong.jdsdk.d.c.s`

![](https://attach.52pojie.cn/forum/202212/21/154827whn6b59627kln2wg.png)

我们继续点击进去第一个，发现果真找到了接口的实现类如下：

![](https://attach.52pojie.cn/forum/202212/21/154829rnpxim4yyn51to0p.png)

最终我们看到sign是调用的so....白瞎了之前的一顿操作。至此分析结束。那么我们用frida来验证下是不是这样。

##### Sign-Frida注入验证

注意新版京东有检测frida的，需要改个进程名跟端口。

用frida注入如下函数  `BitmapkitUtils.getSignFromJni(context, str, str2, str3, str4, str5);`

```
function HookHandle(clazz) {
    clazz.getSignFromJni.implementation = function (a, b, c, d, e, f) {
        console.log("=======================================")
        var r = this.getSignFromJni(a, b, c, d, e, f);
        console.log("param1: ", a)
        console.log("param2: ", b)
        console.log("param3: ", c)
        console.log("param4: ", d)
        console.log("param5: ", e)
        console.log("param6: ", f)
        console.log("result: ", r)
        return r;
    }
    console.log("HookHandle ok")
}

Java.perform(function () {
    Java.choose("dalvik.system.PathClassLoader", {
        onMatch: function (instance) {
            try {
                var clazz = Java.use('com.jingdong.common.utils.BitmapkitUtils');
                HookHandle(clazz)
                return "stop"
            } catch (e) {
                console.log("next")
                console.log(e)
            }
        },
        onComplete: function () {
            console.log("success")
        }
    })
})
```

请使用上面这种注入方法，不然会发生找不到类的错误。

![](https://attach.52pojie.cn/forum/202212/21/154831u6pyn1t66khvz6nw.png)

如上，我们可以看出，st sign sv都是从so来的。

至此，sign的来源已理清。

但是我们还有一个body的加密字段

![](https://attach.52pojie.cn/forum/202212/21/154833cxxc57uhzxaz3nxi.png)

我们继续重复上面的分析。

##### cipher-Jadx静态分析

继续搜索”cipher“字段

![](https://attach.52pojie.cn/forum/202212/21/154835n7nxuknetbthsfez.png)

可以看到就一个类，那么就很简单的可以得出加密算法了

![](https://attach.52pojie.cn/forum/202212/21/154837a0ppug25b3ux8x88.png)

通过frida注入这个b函数会发现b参数==MODIFIED\_BASE64 就是进入的这个if，而且加密算法就在d.b()这个方法。直接用java还原就行了。

#### 4.调用

sign签名用[unidbg](https://github.com/zhkl0228/unidbg)模拟调用so就可以了。cipher这个直接复制d这个类就包含了加解密。然后模拟登录再请求购物车信息就ok啦。

结果展示获取购物车数据：

![](https://attach.52pojie.cn/forum/202212/21/154839z1cop9ocaozjdcao.png)
