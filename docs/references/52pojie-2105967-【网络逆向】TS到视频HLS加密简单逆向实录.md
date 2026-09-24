# 【网络逆向】TS到视频HLS加密简单逆向实录

> **作者**: JiGuro | **发布时间**: 2026-05-03 14:08:00 | **版块**: 『移动安全区』 | **查看/回复**: 2512 / 15
> **原文**: [https://www.52pojie.cn/thread-2105967-1-1.html](https://www.52pojie.cn/thread-2105967-1-1.html)

---

*本帖最后由 JiGuro 于 2026-5-3 14:18 编辑*

很久没发关于技术的帖子了，因为最近深陷 Java 的泥潭无法自拔，一直在开发我的 BetterVia 模块，所以就把实战放下了![](https://static.52pojie.cn/static/image/smiley/default/4.gif)
最近，这个软件点燃了我心中残存的火种，虽然思路非常简单，但是我还是想将思路整理成文章发出来，提供给逆向和网安小白学习借鉴，大佬勿喷。

开篇严正声明：本文仅用于学习逆向、网络安全相关技术，未掺杂任何不良目的。文中的软件已对其名字、图标及相关敏感信息做了模糊处理，本人也不会提供软件原包样品，内容仅作学习交流使用！

让我们进入正题。某一天深夜，我无意间 (实际并非无意![](https://static.52pojie.cn/static/image/smiley/default/10.gif)) 下载并打开了这个软件：“某心[破解](https://www.52pojie.cn)版”

![](https://attach.52pojie.cn/forum/202605/03/134602b4888g8ojkjutnud.png)

找到一个视频，刚想看看，发现竟然要VIP，要不然不给看，感情它“破解”了个寂寞，这简直就是对我的侮辱！![](https://static.52pojie.cn/static/image/smiley/default/huffy.gif)于是，我准备挑战该软件。

但是，在动手之前，有一道难题摆在我们面前，我们可以看到播放页面，视频下方进度条展现的视频总秒数仅有10秒，结合弹窗给出的信息，很显然这10秒钟就是视频软件提供给我们的预览片段，这一条视频也不可能只有10秒钟的时长。
这里有两种可能：
1、软件请求服务器，服务器返回完整视频，软件检测到用户不是VIP，于是本地只展示视频的10秒切片；
2、软件请求服务器，服务器验证用户并非VIP，于是只返回10秒切片，软件也就理所应当只获取到了10秒视频。

我们当然希望，实际情况是第1种，因为这样完全可以通过逆向的方式让软件强制展示完整视频。而现实中，这种软件大多都是套壳软件，往往多个软件共用同一个服务器资源，所以一般都会采取第1种方式，这也就大大增加了破解成功的希望。然而，也有少数软件采取第2种方式，平时如果我们遇到第2种情况，都会直接放弃，因为这种情况叫做“服务器验证”，除非你是黑客![](https://static.52pojie.cn/static/image/smiley/default/10.gif)，能黑进服务器中修改用户信息，要不然几乎无解。

想清楚这些后，开始动手。先用 MT 提取安装包，如图：

![](https://attach.52pojie.cn/forum/202605/03/134626je6bnve9s5wb9n5n.jpg)

查看详细信息，一看包名就知道这是典型的 flutter 架构，一般这种类型的软件都会使用 flutter ，以达到批量套壳生产的目的。
热的心凉了半截，flutter 也代表着逆向难度指数级升高，抱着死马当做活马医的心态，我们尝试打开 UN管理器 ，使用其中的 flutter 应用分析功能瞅两眼：

![](https://attach.52pojie.cn/forum/202605/03/134629s9yljq04lfjjzlyl.png)

好嘛，完了，竟然还被混淆了![](https://static.52pojie.cn/static/image/smiley/default/sweat.gif)

![](https://attach.52pojie.cn/forum/202605/03/134631i3zrpaerg7afjg3z.png)

尝试在常量中寻找类似 VIP 、会员 的字样，不出意料，一无所获。只能看见一堆乱码，没有任何价值。

看来这还是个硬茬，难道就这样放弃吗？不，还有招数！我们的目标是什么？不一定要破解会员，只要能看到完整视频就行。这又回到我们一开始提出的两种猜测，如何验证该软件使用的是哪一种方案呢？此时很多大佬应该都想到了，那就是——抓包。

关于抓包和SSL证书的问题，我之前已经提过了，还有不懂的可以参阅我之前的帖子：https://www.52pojie.cn/thread-2063949-1-1.html (【解密实战】简单的图片加密分析 )

同样，我们使用军哥的 JustTrustMe++ 模块，对某心破解版的 SSL 证书检查机制进行 Hook ，使其能够信任我们的证书。(因为手机没有 Root ，这里使用 LSPatch 对该软件进行修补)

![](https://attach.52pojie.cn/forum/202605/03/134634kpuphtfqzt8cihih.png)

![](https://attach.52pojie.cn/forum/202605/03/134636ovii99yuurlgkzz8.png)

在做完这步之后，我们就可以开始抓包了。
这里使用大家熟知的 小黄鸟(HttpCancry) 进行抓包，打开小黄鸟，并设置目标软件为某心破解版，如图：

![](https://attach.52pojie.cn/forum/202605/03/134639t4j5uknll40wkmbu.jpg)

我们点击右下角按钮，使小黄鸟进入小窗模式，并打开该软件，重新加载之前需要VIP的视频。

回到小黄鸟，在排除很多无关数据包后，我们可以很清楚地看到抓取到的 M3U8 视频链接，详细信息如下：

![](https://attach.52pojie.cn/forum/202605/03/134622d6b0im2fz6a6uujs.png)

![](https://attach.52pojie.cn/forum/202605/03/134619mrq0prm2j5z5q1mw.png)

但是，刚看到链接的一瞬间，悬着的心终于还是死了![](https://static.52pojie.cn/static/image/smiley/default/tongue.gif) 从链接中我们就可以看到：

![](https://attach.52pojie.cn/forum/202605/03/134617ywwtwxw28qkwatz2.png)

该链接的形式为：

> https://xxx.com/video/2024-08-02/18/1819323645960531968/9db974a1f1604e7192ece82052f8f227\_preview.m3u8?t=69f62d81&us=2050613724956127235&sign=cf0c146e9ecafcebb86a16b537ed196102fb9955

我们可以很清楚的看到：一长串字符后面跟着 **\_preview** 这个后缀，翻译成中文就是预览的意思。这意味着，我们好巧不巧的碰到了上述第2种情况——由服务器判断用户是否是会员，然后再根据判断结果返回相应的视频。这意味着，逆向破解软件的思路彻底封死了，就算真有水平能够破解，那么也过不了服务器验证，最终获取的视频还是10秒。当然，肯定有很多同学会想能不能把 **\_preview** 后缀去掉，说不定你就能获取完整的视频流。这种方法我已经替你们试过了，是没用的。

相信很多同学到了这里就肯定会放弃了![](https://static.52pojie.cn/static/image/smiley/default/cry.gif)，但是搞技术靠的就是灵活的思维和应变能力。再继续往下看之前，我觉得有必要给各位普及一下 M3U8 这个格式。

M3U8 本质上并不是视频，而是纯文本索引文件，核心作用是告诉播放器：按什么顺序、用什么密钥、取哪些切片。

先从链接分析，链接后跟着一长串字符，这是典型的CDN 防盗链签名：

![](https://attach.52pojie.cn/forum/202605/03/134604ck3kr3zqszktb37q.png)

该签名的意义在于，即使你知道 M3U8 的路径结构，没有正确的 sign 参数，CDN 会返回  403 Forbidden

再看 M3U8 内容，我们可以在小黄鸟中看到 M3U8 文件的原文：

```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:11
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-KEY:METHOD=AES-128,URI="/keyhome/video.key",IV=0x4ff43fb9b8921a8f12fb0f3a08570689
#EXTINF:10.759233,
https://xxx.com/.../xxx.ts
#EXT-X-ENDLIST
```

我们可以一行一行分析：

![](https://attach.52pojie.cn/forum/202605/03/134641a1cinf1eoj18ui6n.png)

所以，M3U8 并不是视频的本质所在，真正能被播放器解码的是上面看到的 TS 文件。
TS（Transport Stream）是 MPEG-2 标准定义的容器格式，设计初衷是抗丢包、抗干扰，适合有线电视广播。TS 的优势在于：
**1、TS 是流式容器，不需要像 MP4 那样先读取 moov 头
2、可以在任意位置切割，不需要重新编码
3、每个 TS 切片包含完整的 PES 包，可以单独播放**

一个 TS 文件由固定大小的 188 字节包（Packet） 组成，每个包以  0x47  开头：

```
[4字节 Transport Stream Header][184字节 Payload]
```

Payload 里封装的是：
**PAT**（Program Association Table）：PMT 包的信息
**PMT**（Program Map Table）：视频流、音频流的 PID
**PES**（Packetized Elementary Stream）：实际的 H.264/H.265 视频帧、AAC 音频帧

我们可以尝试下载该片段的 TS 文件，理论上该文件可以直接被播放器解码。但是，当我们用 MT 管理器打开该 TS 文件时，却报了错：

![](https://attach.52pojie.cn/forum/202605/03/134643qu719374hr93zhxy.png)

显然，该 TS 被加密了。这就要引入 HLS 加密技术 了。HLS 规范（RFC 8216）定义了两种加密方式，分别为：

**AES-128：**

```
#EXT-X-KEY:METHOD=AES-128,URI="...",IV=...
```

算法参数：
算法：AES-128-CBC（128 位密钥，CBC 模式）
密钥长度：16 字节（128 位）
块大小：16 字节
填充方式：PKCS#7（如果原始数据不是 16 字节整数倍，末尾补填充字节）

**SAMPLE-AES：**

```
#EXT-X-KEY:METHOD=SAMPLE-AES,URI="...",IV=...
```

这是苹果推出的部分加密方案，不加密整个 TS 包，只加密视频中的关键样本（如 H.264 的 NAL 单元），需配合 FairPlay DRM 使用，需要硬件级解密支持，普通工具无法处理。

我们抓取到的显然是第一种加密，这导致播放器无法正确处理，因为 TS 文件实际上已经经过一层加密。
加密流程如下：

> 明文 TS 文件
>     ↓
> 分块（每块 16 字节）
>     ↓
> 第一块 + IV → AES 加密 → 密文块 1
>     ↓
> 密文块 1 + 明文块 2 → AES 加密 → 密文块 2
>     ↓
> ... 以此类推
>     ↓
> 加密后的 TS 文件

我们可以注意到，M3U8 文件中存在着 IV 定义：

```
IV=0x4ff43fb9b8921a8f12fb0f3a08570689
```

IV 是 16 字节（32 个 hex 字符），它的作用是让相同的明文加密后产生不同的密文。

同时，M3U8 文件中也存在着 Key 定义：

```
URI="/keyhome/video.key"
```

这是一个相对路径。所以我们完全可以根据这个相对路径拼接出 key 的绝对地址：

> M3U8: https://xxx.com/video/2024-08-02/18/.../xxx.m3u8
> Key:  https://xxx.com/keyhome/video.key

当然，我们也可以在抓包软件中看到 key 响应：

![](https://attach.52pojie.cn/forum/202605/03/134615tv4lp5fhbv1f41pb.png)

![](https://attach.52pojie.cn/forum/202605/03/134612x19l94tklrlk1bhh.png)

> Content-Length: 16
> Body: sdj3nxuuw3koukvs（16 字节二进制）

虽然终端显示看起来像字符串，但 HTTP Body 是原始二进制数据。sdj3nxuuw3koukvs 这 16 个字符正好是 16 字节，直接作为 AES-128 的密钥使用。

为了验证以上推理，我们可以通过 Python 脚本对加密的试看 TS 进行解密：

```
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os

try:
    from Cryptodome.Cipher import AES
    from Cryptodome.Util.Padding import unpad
except ImportError:
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import unpad

def decrypt_ts_file(input_path, output_path, key_bytes, iv_bytes):
    """
    解密单个 TS 文件
    :param input_path: 加密 TS 文件路径
    :param output_path: 解密后输出路径
    :param key_bytes: 16 字节密钥
    :param iv_bytes: 16 字节 IV
    """
    with open(input_path, "rb") as f:
        encrypted_data = f.read()

    cipher = AES.new(key_bytes, AES.MODE_CBC, iv=iv_bytes)
    decrypted = cipher.decrypt(encrypted_data)

    # 移除 PKCS7 填充
    try:
        decrypted = unpad(decrypted, AES.block_size)
    except ValueError:
        # 如果填充异常，手动移除末尾填充字节
        pad_len = decrypted[-1]
        if 1 <= pad_len <= 16:
            decrypted = decrypted[:-pad_len]

    with open(output_path, "wb") as f:
        f.write(decrypted)

    print(f"解密完成: {output_path} ({len(decrypted)} bytes)")

def decrypt_ts_bytes(data: bytes, key_bytes: bytes, iv_bytes: bytes) -> bytes:
    """
    解密字节流（适合内存处理）
    :return: 解密后的明文 bytes
    """
    cipher = AES.new(key_bytes, AES.MODE_CBC, iv=iv_bytes)
    decrypted = cipher.decrypt(data)

    try:
        return unpad(decrypted, AES.block_size)
    except ValueError:
        pad_len = decrypted[-1]
        if 1 <= pad_len <= 16:
            return decrypted[:-pad_len]
        return decrypted

if __name__ == "__main__":

    # 字符串密钥（16 字符）
    key_str = "sdj3nxuuw3koukvs"
    key = key_str.encode("utf-8")

    # IV（32 位 hex）
    iv = bytes.fromhex("4ff43fb9b8921a8f12fb0f3a08570689")

    # 文件路径
    input_file = "2024-08-0268.ts"      # 加密的 TS 文件
    output_file = "2024-08-0268_dec.ts" # 解密后的输出
   
    if len(sys.argv) >= 3:
        input_file = sys.argv[1]
        output_file = sys.argv[2]

    if not os.path.exists(input_file):
        print(f"[错误] 文件不存在: {input_file}")
        sys.exit(1)

    if len(key) != 16:
        print(f"[警告] 密钥长度 {len(key)} 字节，AES-128 需要 16 字节")

    decrypt_ts_file(input_file, output_file, key, iv)
```

运行脚本：

![](https://attach.52pojie.cn/forum/202605/03/134645g1mnxr0nuzrzwuuu.png)

![](https://attach.52pojie.cn/forum/202605/03/134647krv49thv7yhp8939.png)

TS 成功解密，可以直接使用播放器播放！

清楚了以上内容，再经过一系列抓包的检验，我们就可以推测出这套机制的安全漏洞：
1、静态密钥
Key 文件长期不变 (经过测试多个视频可知) ，一次泄露永久失效
2、密钥无鉴权
video.key  可以匿名下载，不校验请求者身份
3、IV 可能固定
试看版使用固定 IV，且其他视频试看版 IV 与该视频也相同，完整版极大可能复用相同 IV
4、签名仅保护索引
TS 和 Key 直链无签名，绕过 M3U8 也能直接访问
5、试看版参数泄露
xxx\_preview.m3u8  极有可能与完整版同源同密钥，成为信息泄露通道 (同上 IV 固定漏洞)

当然，有以上信息肯定还不够。我们仍然无法获取完整的 M3U8 文件或完整的分片文件。我们还需要找到临门一脚的关键漏洞。相信看到这里有眼尖的同学已经明白了。我们之前说过，M3U8 本质上就是个索引，索引的是 TS 文件。仔细观察 TS 文件链接：

> https://xxx.com/video/2024-08-02/18/1819323645960531968/2024-08-0268.ts

不难发现，链接的组成方式为：

> https://xxx.com/video/年-月-日/18(未知)/1819323645960531968(类似ID)/年-月-日68.ts

最显眼的冗余元素就是最后的**“68”**。由于很多 M3U8 索引的 TS 文件都是按编号从小到大按顺序依次排列的，我们可以大胆猜想，最后的**“68”**数字指的就是第**“68”**号分片文件。
我们可以在浏览器中将最后的**“68”**改成其他二位数字，发现可以成功下载到 TS 文件，这证明我们的猜想大概率是对的！

所以，此时我们找到了最大的一个漏洞：**切片名可预测**
2024-08-02N.ts  理论上顺序递增，结合前面的加密分析和其他漏洞，我们完全可以写一个 Python 脚本进行遍历暴力下载解码：
https://share.weiyun.com/vAQM2wsp
(由于代码太长和文章长度限制，这里附上源码链接，各位也可以在文末下载到)

大概逻辑就是，从 M3U8 中获取 IV 和 Key，然后根据试看 TS 从编号“0”开始遍历 TS 文件，如果连续遇到三个 404 ，那么就代表分片已经结束，然后调用 ffmpeg 合并即可。

![](https://attach.52pojie.cn/forum/202605/03/134607blb93jfessbsctlz.png)

![](https://attach.52pojie.cn/forum/202605/03/134653y934a6b2hlrha2rr.png)

可以看到，经过一系列解析，已经下载下来了非常多的 TS 分段

![](https://attach.52pojie.cn/forum/202605/03/134650lyryn3suznzcnyr1.png)

![](https://attach.52pojie.cn/forum/202605/03/134658r7vvpwvbfbpk7mq7.png)

最后，一条 300多MB 的 VIP 视频就被这样下下来了，可以完整不卡顿地观看。可以看到最后实际视频时长为：23分52秒，甚至还比一开始软件中展示的视频时长多了10秒 (后来看多出来的10秒钟应该是下集预告)![](https://static.52pojie.cn/static/image/smiley/default/lol.gif)

![](https://attach.52pojie.cn/forum/202605/03/134559efwehtqwrj5sow8w.jpg)

感谢你能看到这里！当最后一个 TS 片段被解密、当 ffmpeg 的进度条走到 100%、当播放器里终于出现完整的画面——此刻带来的满足感，远不止“下载了一个视频”那么简单。
回顾整个过程，我们从一条孤零零的 M3U8 链接出发，像拼图一样还原出整套 HLS 加密体系的轮廓：解析 M3U8 的索引逻辑、理解 AES-128-CBC 的加密原理、发现静态密钥分发的脆弱性、绕过  **\_preview**  的访问控制、在 Termux 中重建完整视频，最终用 143 个明文切片拼出完整的视频流。
技术层面的收获是具体的：你掌握了 HLS 协议的结构、AES 加密在流媒体中的实际应用、以及如何用 Python 在移动端完成密码学操作。
但更深层的价值在于思维方式的训练——面对一个封闭系统，如何从最小信息切入，逐层剥离其安全假设，找到设计与实现之间的缝隙。这种“单点突破、体系还原”的能力，从流媒体安全延伸到 Web 渗透、逆向工程、物联网固件分析，本质上是同一套方法论。

这也给各位站长们一个启示：平台方应把 L0 的静态密钥升级到 L3 的动态鉴权，把可预测的切片名替换为随机 UUID，把试看版与完整版的密钥彻底隔离。

我希望各位不止带走了一段能运行的 Python 脚本，更带走了一个问题：下一次当你看到一个 .m3u8 、一个 .mpd 、甚至一个 WebSocket 推流地址时，作为一个技术爱好者，你的第一反应不再是“视频有多好看”，而是“我是否能理解播放和解析的原理？”
答案往往是：能。而且通常比你想象的更容易。

码字不易，点赞可有？![](https://static.52pojie.cn/static/image/smiley/default/mad.gif)
理论上这种方法对于涉及以上未动态分链鉴权漏洞的网站或APP都有效果 (其实60~70%的这类软件都存在这个漏洞，别问我是怎么知道的![](https://static.52pojie.cn/static/image/smiley/default/10.gif))。如果有实力的话，甚至可以将这个方案内置进安装包中，直接请求完整视频。
帖子内所有工具都已放在下面，可供大家练手，评论自取。
最后，恭祝各位劳动节快乐！

Python脚本 + 工具：
https://jiguro.lanzouw.com/iiOMO3ol52de
