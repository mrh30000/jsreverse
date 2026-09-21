# 某视频解析网站js逆向分析——学会wasm文件类型逆向

> **作者**: prince_cool | **发布时间**: 2024-03-14 22:20:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 13292 / 99
> **原文**: [https://www.52pojie.cn/thread-1900845-1-1.html](https://www.52pojie.cn/thread-1900845-1-1.html)

---

## 某视频解析网站js逆向分析——学会wasm文件类型逆向

## 声明

​    **本文章中所有内容仅供学习交流，相关链接做了脱敏处理，若有侵权，请联系我立即删除！**

### 一、目标网站

aHR0cHM6Ly9qeC5qc29ucGxheWVyLmNvbS9wbGF5ZXIvP3VybD1odHRwczovL3d3dy5pcWl5aS5jb20vdl9tNG1qbDhtbzhrLmh0bWw=

### 二、过检测，然后找到所需加密参数位置

![](https://attach.52pojie.cn/forum/202403/14/220753lx6jjuap221uxupz.png)

​ 打开网站，按f12会发现debugger，然后你继续运行，他就会在网址后面一直加数值，导致浏览器崩掉。

​ 要过这个确实很简单，这个网站的作者其实算留了一点小破绽吧，可能也算是他自己要调试设置检测点所以遗留下来的小破绽，就是debugger后面的if判断。

![](https://attach.52pojie.cn/forum/202403/14/220755p4heku8cehzzuf7h.png)

我们只要把if后面条件变成false。就能过第一个检测的地方了，这个网站还有哦。

![](https://attach.52pojie.cn/forum/202403/14/220758cjq7vwm5lem9qle0.png)

跟栈:原来是eval代码来的，那代码怎么来的呢？其实可以在某一返回里面看到。

![](https://attach.52pojie.cn/forum/202403/14/220800dxwb6cwrszxsxbfx.png)

再跟一层。

![](https://attach.52pojie.cn/forum/202403/14/220802qfzat04f70wnc4wt.png)

我的处理方式是：我直接把这一行给注释掉，这样操作可能会导致视频不播放，但是发包是正常的，我只要加密解密就好了，视频不需要播放。

刷新网页，运行。然后又遇到一个debugger，这个就是我说的返回的js代码。

![](https://attach.52pojie.cn/forum/202403/14/220805sk69dbn9tzmtnad1.png)

相同步骤，if后面改false。

然后刷新网页，你就会发现：都让他运行。

第一次修改：

![](https://attach.52pojie.cn/forum/202403/14/220807jy7w343zjyzz2y57.png)

第二次修改：

![](https://attach.52pojie.cn/forum/202403/14/220809hwzbyqkbmzsmbcdk.png)

成功发包：

![](https://attach.52pojie.cn/forum/202403/14/220811m8s8acc9axckxmqk.png)

需要逆的参数：params

跟第二个进去：

![](https://attach.52pojie.cn/forum/202403/14/220813n55dwcaf8wdcm83m.png)

![](https://attach.52pojie.cn/forum/202403/14/221713yy14i77ig88c0fla.png)

可以看到很清晰的encrypt，下个断点吧，然后目标位置已找到

![](https://attach.52pojie.cn/forum/202403/14/220923pad4rdi000ld9l89.png)

### 三、两种方式解决文件类型wasm

#### ①使用node自带WebAssembly初始化wasm文件，调相应算法

##### 关键点：初始化函数api  找传入bytes，和传入对象importObject

```
WebAssembly.Instance(module, importObject);  同步  module=new WebAssembly.Module(bytes)
WebAssembly.instantiate(bytes, importObject)  异步
WebAssembly.instantiateStreaming(bytes, importObject) 异步
```

所以我们可以搜索关键词WebAssembly，来找初始化的地方，调用wasm文件的关键。

这个网站有混淆，可能你不能直接找到instantiate啊之类的关键词，但是WebAssembly是可以完全搜索到的，

![](https://attach.52pojie.cn/forum/202403/14/220925dvidc99c5qc95qws.png)

其实看到fetch大概率能猜到是第二个了，经验吧。

![](https://attach.52pojie.cn/forum/202403/14/220933hwq447qawwkqal28.png)

这里采用的是instantiateStreaming异步方式初始化。

![](https://attach.52pojie.cn/forum/202403/14/220935fgeis24dvgegv5t8.png)

居然还把它以.jpg后缀伪装成图片，其实你直接访问链接下载的，真实后缀就是.wasm。

所以到这里传入的关键点一：bytes我们就拿到了。

接下来就是第二个参数importObject

![](https://attach.52pojie.cn/forum/202403/14/220938fy2u85gn58jvggfy.png)

展开随便进一个函数，发现里面是go编译的，没做什么处理，可以发现其实用这个算法的人也不太熟悉，不敢随便改动，直接拿生成的就来用了。

直接复制下来，然后我们找到要的importObject是new .Go下面的

![](https://attach.52pojie.cn/forum/202403/14/220940nkarz0yrc820jcyl.png)

直接运行不行啊，因为最底下是命令行调用形式，所以把底下这一块删掉，就可以直接运行这个自执行了。

![](https://attach.52pojie.cn/forum/202403/14/220942pdy090x9xdpsd083.png)

然后new就有这个对象啦！！！

![](https://attach.52pojie.cn/forum/202403/14/220944jhzhq2030fqufnrh.png)

接下来就是初始化了，文件我们已经下载下来了。我这里采用同步的形式，返回就是instance了，同步后期好调用一点。

![](https://attach.52pojie.cn/forum/202403/14/220946gg2cn82wkg99qsgf.png)

然后网页调用了run方法就在全局加载了encrypt，decrypt函数。

![](https://attach.52pojie.cn/forum/202403/14/220949ceogol6hjyll7zt4.png)

我们也来模拟一下吧

![](https://attach.52pojie.cn/forum/202403/14/221055z8ndn87ddsyd7g3n.png)

那么，它环境是怎么检测的呢，通过什么呢？

##### 其实就是通过第二个参数importObject中的js方法拿浏览器环境中的值。

我们可以代{过}{滤}理全局global，看看它是不是取了什么东西，也就是对应网站的window。

以下是简单的挂代{过}{滤}理函数：

```
function myProxy(obj,name){
    return new Proxy(obj,{
    get(target, propKey, receiver)
    {
        let temp =Reflect.get(target,propKey,receiver);
        if  (typeof temp == 'object'){
            temp=myProxy(temp,name+'=>'+propKey.toString())
        }
        console.log(`${name}->get ${propKey.toString()}  return ->${temp}`)
        return temp;
    },
    set(target, propKey, value, receiver)
    {
        let temp = Reflect.set(target,propKey,value);
        console.log(`${name}->set ${propKey.toString()}  value ->${value}`)
        return temp;
    }
})
}
```

![](https://attach.52pojie.cn/forum/202403/14/221058tzmzx27sji7ydxjj.png)

可以发现它全局取不到location就导致了报错，所以我们补一个location

![](https://attach.52pojie.cn/forum/202403/14/221101gd40dh4hd6d5b47g.png)

又缺了东西，按照报错来补。补document，window，然后又报了一个核心函数错。

![](https://attach.52pojie.cn/forum/202403/14/221103ftkk9118qtdc6w94.png)

一搜索关键词（toStatus）就能搜索到：

![](https://attach.52pojie.cn/forum/202403/14/221105zsiufee11evfzheg.png)

原来返回了一个url，一个指纹，经过测试，只要fingerprint任意值都可以。

所以我们就直接

![](https://attach.52pojie.cn/forum/202403/14/221107xu5c4i7l2egx0hpp.png)

成功补好，运行就有加密函数了

![](https://attach.52pojie.cn/forum/202403/14/221110czo2wo2lckit21dd.png)

运行加密函数，成功出值，多试几次，可以发现只有后面一部分会变，我们用第二种方法解就会知道是什么原因了。至此，第一种文件调用基的方案就是这样了，基本上文件调用的都可以这样通杀吧。

![](https://attach.52pojie.cn/forum/202403/14/221112ymb3smmissjm53s7.png)

#### ②分析wasm文件拿算法（这个较难）

###### 1.针对wasm函数名字隐藏的   用工具反编译成.c文件，然后再用ida静态分析结合网站动态分析。（这种方式需要对汇编，算法等很熟悉，有点像解app的so层算法）

###### 2.针对wasm函数名字暴露的   根据暴露的函数名在wasm文件关键位置下断点，找到加密参数，关键key和iv（需要一些算法经验）

我们来看看这个网站是什么情况？

进入wasm内部

![](https://attach.52pojie.cn/forum/202403/14/221115yobz6sy8y86c2zcb.png)

我们主要关注两个地方，functions和memory，tables也可以看看，tables里面是wasm和js都可以访问和更改的对象。

**展开functions：**

![](https://attach.52pojie.cn/forum/202403/14/221119hx5qib3wtzqbxtsi.png)

可以发现并没有函数名混淆，应该是调了go某个库里面的东西，有很多函数。

```
crypto/md5.digest
crypto/aes.NewCipher
crypto/cipher.newCBC
....
```

有很多其他crypto库，其实根据上面加密后的结果，可以大胆猜测是AES加密。

在这里，我找了一下go的AES加密有关的文章：

<https://www.jianshu.com/p/47e8c137ecd4>

![](https://attach.52pojie.cn/forum/202403/14/221210gdpdj60kd7e6rv2j.png)

其实就可以找到关键的地方了。

**$crypto/aes.NewCipher**下加载了key

**$crypto/cipher.newCBC**下加载了iv

**$interface:{BlockSize:func:{}{basic:int},CryptBlocks**里面加载了加密参数

**我们可以在这些关键函数位置下断点，然后看内存中的数据是什么：**

![](https://attach.52pojie.cn/forum/202403/14/221234zgzwel54lgkja5jj.png)

点击后输入地址就能看对应内存的内容了。

第一个位置$crypto/aes.NewCipher：

![](https://attach.52pojie.cn/forum/202403/14/221237w47b4icn4cb4incs.png)

每一个入参你都搜索一下，就能看到加密key了。

![](https://attach.52pojie.cn/forum/202403/14/221240iitjtlrigf9gzlga.png)

16位就是key了。

第二个位置一样的操作：

![](https://attach.52pojie.cn/forum/202403/14/221242cpvnjn5nv2txf66f.png)

第三个位置：

![](https://attach.52pojie.cn/forum/202403/14/221245b0cji5kjuuvw0a00.png)

明文清清楚楚的。我们当然可以把明文显示到控制台：

```
viewChar = (addr, size = 16) =>{
    const arr = new Uint8Array(memories[0].buffer.slice(addr, addr + size));
    return String.fromCharCode.apply(null, arr);
};
```

![](https://attach.52pojie.cn/forum/202403/14/221247mrdbdnicgiwgftdi.png)

可以看到一直变动的就是时间戳。

解密也是同理，至此，这个网站的逆向基本上结束了。

### 四、总结

​ 对wasm文件类型的网站逆向，基本上掌握第一种方式就可以完全解决，因为wasm只能通过js importobject获取浏览器的值，无法在里面做环境检测；wasm环境检测也只能是值的校验。所以通过代{过}{滤}理等方式，在js层把传进去的东西都捕获到，只要补齐对应值就能完成逆向调用。

​ 重点还是找初始化的**bytes**和**importobject**，如果有不对的地方，请大佬们多多指正~~

### 五、相关练习案例网站

视频网站1：        aHR0cHM6Ly9qeC55YW5ndHUudG9wLz91cmw9aHR0cHM6Ly93d3cuaXFpeWkuY29tL3ZfMXZuN3ZpMm9vZGMuaHRtbA==

视频网站2：

aHR0cHM6Ly9nYXplLnJ1bi9wbGF5Lzc0NmIxZTBiM2E5MjcyNTU1ZDkzYTZiOWQ4NTIzNzBh

视频网站3：

aHR0cHM6Ly93d3cuZ2R0di5jbi90dlByb2dyYW1z

某数藏登录：（请求头Secc-Fetch-Hash-Key）

aHR0cHM6Ly9kYy5tYXl0ZWsuY24vIy9Mb2dpbkJveA==
