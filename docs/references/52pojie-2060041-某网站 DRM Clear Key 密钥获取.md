# 某网站 DRM Clear Key 密钥获取

> **作者**: xifangczy | **发布时间**: 2025-09-14 03:45:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4523 / 12
> **原文**: [https://www.52pojie.cn/thread-2060041-1-1.html](https://www.52pojie.cn/thread-2060041-1-1.html)

---

*本帖最后由 xifangczy 于 2025-9-14 06:08 编辑*

网址: aHR0cHM6Ly93d3cubWlzc2V2YW4uY29tL3NvdW5kL3BsYXllcj9pZD0xMTU5MTc0NA==
网站的新内容开始使用drm对媒体进行保护

通过猫抓获得媒体文件 无法正常播放

![](https://attach.52pojie.cn/forum/202509/14/020824sqsshz1s023xcchs.png)

mp4info 工具查看文件获信息

[Plain Text] *纯文本查看*

```

[ENCRYPTED]      Coding:         enca
      Scheme Type:    cbcs
      Scheme Version: 65536
      Scheme URI:
```

看来是有drm的存在。

直接F12 查看网络 按照习惯 从m4s文件开始往上看。

![](https://attach.52pojie.cn/forum/202509/14/021751aexxh303r1300x73.png)

bilidrm文件内容

![](https://attach.52pojie.cn/forum/202509/14/021913w88999fz770vgt72.png)

有公钥和bilidrm文件 说明是明文drm 这还有救 应该能找到key

有兴趣的可以去看看相关文档
https://www.w3.org/TR/encrypted-media-2/#clear-key

查看公钥的调用堆栈

![](https://attach.52pojie.cn/forum/202509/14/023306h5m9m7a5wwxhf1h9.png)

就不多废话了
第一个是 包装了一层fetch的函数
第二个 \_callee2$ 才是真正的fetch调用

点击\_callee2$ 进入到一个getKeyInfo函数中

![](https://attach.52pojie.cn/forum/202509/14/024001fott0yhn88p8reb8.png)

代码甚至还有注释很容易读，也可以丢给AI 让AI解释。

case 2: 通过公钥生成SPC

case 6: 通过SPC 请求许可CKC

case 12: 通过CKC获得解密KEY

在case 12的return地方下断点

![](https://attach.52pojie.cn/forum/202509/14/024545srsg87st7mn8mtdw.png)

到此，解密媒体所需的 kid 和 key 都有了

实际上kid的值 使用mp4dump在加密的媒体文件中可以找到，命令示例：

[Bash shell] *纯文本查看*

```
(.\mp4dump.exe a.mp4 | findstr /i "KID") -replace '.*\[(.*)\].*', '$1' -replace '\s', ''
```

但代码直接给出来了那就省了这一步。

如果使用ffmpeg解密 可以省略找kid这一步

[Bash shell] *纯文本查看*

```
ffmpeg -decryption_key <key> -i "a.mp4" output.mp4
```

key还需要从base64转为hex 这里让AI写一个函数就行

[JavaScript] *纯文本查看*

```

function base64ToHexString(base64) {
    const binaryData = atob(base64);
    let hexString = '';
    for (let i = 0; i < binaryData.length; i++) {
        const hex = binaryData.charCodeAt(i).toString(16);
        hexString += hex.length === 1 ? '0' + hex : hex;
    }
    return hexString;
}
base64ToHexString("W2DWP4mgRSmF8jtTAqFh4A==");
```

获得 5b60d63f89a0452985f23b5302a161e0

使用 mp4decrypt工具

[Bash shell] *纯文本查看*

```
mp4decrypt --key a4f8dc6f83df4de0ab3faa4562f7bddd:5b60d63f89a0452985f23b5302a161e0 _000010z6hpy6k4wal27ha70pqgahr9b-128k.mp4 a.mp4
```

生成 a.mp4文件 成功播放。

至于biliDRMSDKModule的分析，如何解密的以及wasm内容这里就不深入进行了。可以参考本论坛对 biliDRM 研究的其他帖子。