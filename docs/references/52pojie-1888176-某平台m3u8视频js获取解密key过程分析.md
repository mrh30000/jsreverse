# 某平台m3u8视频js获取解密key过程分析

> **作者**: xdxgkxq | **发布时间**: 2024-02-05 13:20:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 17104 / 53
> **原文**: [https://www.52pojie.cn/thread-1888176-1-1.html](https://www.52pojie.cn/thread-1888176-1-1.html)

---

*本帖最后由 xdxgkxq 于 2024-2-5 13:30 编辑*

### 前言

机缘巧合之下侥幸免费获得某付费教程视频的观看权限，但期限只有一个多月。由于之前一些事情耽搁，等到有时间看已快到期限。于是打算下载本地留个备份。
先试试 IDM 自带的资源嗅探，寄

![](https://attach.52pojie.cn/forum/202402/05/130545ccvjrzws7hssi1wi.png)

### 开始

#### 抓`m3u8`

首先控制台抓包拿 m3u8 文件：

![](https://attach.52pojie.cn/forum/202402/05/130606v0csjo0otz1paut3.png)

#### 下载ts

然后下载 ts 文件：
简单写个 python 调用 IDM 爬一下

```
pip install idm
```

```
from idm import IDMan
downloader = IDMan()
fold_path = "D:\\video"
for i in range(0, xxx):
    i = str(i).zfill(4)
    url = f"https://略了/index_encrypt_00{i}.ts"
    downloader.download(url, fold_path)
```

#### 找key

从m3u8的文件信息中可知，使用的加密方法为**AES128**，获取key的url链接也知道

```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-ALLOW-CACHE:NO
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-KEY:METHOD=AES-128,URI="http://略/api/略?vod_id=略&app_id=略",IV=0x00000000000000000000000000000000
#EXTINF:4.000000,
略/index_encrypt_000000.ts
#EXTINF:4.000000,
略/index_encrypt_000001.ts
#EXTINF:4.000000,
略/index_encrypt_000002.ts
#EXTINF:4.000000,
略/index_encrypt_000003.ts
```

直接访问获取密钥的链接，得到以下内容：

> {"msg":"success","code":"200","data":{"cipher\_key":"MjEs**\*sN\*\*\*\*\***NT**MD************\*\***************U\***Us\*\*\*\***Y="}}

得到密钥是一串base64编码，在线解码即可：
[Base64 编码/解码 - 在线工具 (toolhelper.cn)](https://www.toolhelper.cn/EncodeDecode/Base64EncodeDecode)

![](https://attach.52pojie.cn/forum/202402/05/130608nguno8da7o2ez7i2.png)

手动新建一个`key.key`文件，用Hex编辑器将解码得到的16个数字填进去

![](https://attach.52pojie.cn/forum/202402/05/130611rzskmd492kdysazy.png)

*推荐使用vscode的扩展：`Hex Editor`*

![](https://attach.52pojie.cn/forum/202402/05/130613oynllmgnnq6l0wl9.png)

之后顺便把`index.m3u8`文件中这行：

```
#EXT-X-KEY:METHOD=AES-128,URI="http://略/api/略?vod_id=略&app_id=略",IV=0x00000000000000000000000000000000
```

改为：

```
#EXT-X-KEY:METHOD=AES-128,URI="key.key",IV=0x00000000000000000000000000000000
```

最后将下载到的所有`.ts`、`key.key`、`index.m3u8`文件都放在同一个文件夹内，在shell中执行下面的命令：

```
ffmpeg -allowed_extensions ALL -protocol_whitelist "file,http,crypto,tcp" -i index.m3u8 -c copy out.ts
```

*注：使用该命令需要下载ffmpeg，如果你装有`scoop`，可执行`scoop install ffmpeg`命令直接安装，其他下载方法我没尝试过，烦请自行搜索*
然后........

![](https://attach.52pojie.cn/forum/202402/05/130617m0z2573kee7920jk.png)

就寄了......悲
为什么呢，因为直接访问链接拿到的密钥是错的
然后只能看源码了
根据观察大佬们得来的经验，从ts的启动器入手：

![](https://attach.52pojie.cn/forum/202402/05/130619w3c2tnh5t96ttett.png)

进去之后，根据观察大佬们的经验，搜索`decryphtdata.key`之类的关键词
总共找到三个结果，打断点，发现原本播放的视频断了，所以一般而言，这个`this.decryphtdata.key`的值就应该是真的密钥了

![](https://attach.52pojie.cn/forum/202402/05/130624ccwqcwzqoj7zkmqk.png)

但是！！
AES128加密的密钥不应该是16位吗？这个密钥怎么是47位？？？

根据观察大佬的文章，判断这个key是被二次加密过，那就接着找解密key的代码
接着查看另外两个结果，发现下面这些相关代码：

![](https://attach.52pojie.cn/forum/202402/05/130622ubxz7djrkrdobz3d.png)

不懂直接问GPT：

> 这段代码是一个方法，名为"decryptBuffer"，接受两个参数e和t。在方法内部，调用了this.decrypter对象的decrypt方法，传入了e、this.decryptdata.key.buffer和this.decryptdata.iv.buffer作为参数。这个方法的作用是使用decrypter对象对e进行解密，使用this.decryptdata.key.buffer和this.decryptdata.iv.buffer作为解密所需的key和iv，将结果存储在t中。

然后我们搜索`decrypter`，找到这个：

![](https://attach.52pojie.cn/forum/202402/05/130627dr3x621kkbrrqbke.png)

问GPT：

> 这段代码是一个方法，名为"push"，接受多个参数。在方法内部，首先对参数进行一些判断和处理，然后调用了this.decrypter对象的decrypt方法，传入了e、t.key.buffer和t.iv.buffer作为参数。当解密完成后，触发了一个事件并调用了pushDecrypted方法，将解密后的数据和其他参数传入。如果不需要解密，直接调用了pushDecrypted方法，将原始数据和其他参数传入。这段代码主要实现了对数据进行解密和处理后推送到指定位置的功能。

那么这里应该是key的解密程序了，然后打断点查看值：

![](https://attach.52pojie.cn/forum/202402/05/130629a1wq1phwwnxlwnlv.png)

没错确实是16位，把值像前面一样写进`key.key`文件，

#### 解密

然后就是`ts`、`m3u8`、`key.key`放在一个文件夹下，执行命令：

```
ffmpeg -allowed_extensions ALL -protocol_whitelist "file,http,crypto,tcp" -i index.m3u8 -c copy out.ts
```

大功告成，耶（截图是后面补的）

![](https://attach.52pojie.cn/forum/202402/05/130632x8sxxs8o8xrod6xm.png)

### 参考文章

非常感谢一下大佬的文章，给了非常非常大的帮助，本文的也基本是仿照大佬写的

* [使用python+FFmpeg实现m3u8文件内的ts视频 解密、合并 && ffmpeg截取视频 - kongbursi - 博客园 (cnblogs.com)](https://www.cnblogs.com/kongbursi-2292702937/p/13553995.html)
* [某牛m3u8 key解密算法分析及实现 - 『脱壳破解区』 - 吾爱破解 - LCG - LSG |安卓破解|病毒分析|www.52pojie.cn](https://www.52pojie.cn/forum.php?mod=viewthread&tid=1857670&highlight=m3u8%2Bkey)
* [某鹅通m3u8视频JS获取解密Key的过程分析 - 『脱壳破解区』 - 吾爱破解 - LCG - LSG |安卓破解|病毒分析|www.52pojie.cn](https://www.52pojie.cn/thread-1689801-1-1.html)

### 写在最后

蒟蒻第一次心血来潮搞这个，网上找了好多教程，虽然自己写的找key的过程就几句话，实际做的过程中卡了好长时间，还是自己太菜了，比如一开始找到的key为什么是47位，其实是因为`base64`解码出来的一串数组，像下面这样：

> 28,99,99,08,03,00,99,99,99,99,99,99,99,99,99,54

它的带逗号的，$2\*16+15 =47$ ，这也是为什么这里44会反复出现

![](https://attach.52pojie.cn/forum/202402/05/130634ieazedqyaqwwd4id.png)

就想这种一个简单的问题卡了好长时间........

### 免责声明

本人仅仅用于个人学习。任何人不得将上述内容用于商业或者非法用途。
