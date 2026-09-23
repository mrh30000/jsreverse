# Typora 1.x 加密密钥

> **作者**: Thomas717 | **发布时间**: 2021-11-28 14:00:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 16625 / 87
> **原文**: [https://www.52pojie.cn/thread-1552603-1-1.html](https://www.52pojie.cn/thread-1552603-1-1.html)

---

Typora 1.x版本开始收费了，多年以来我一直认为这个翻译都是社区支持的软件应该是开源软件。

asar unpack之后，文件被加密了，base64解码后去掉前16字节就是密文，密钥如下：

算法：AES-256 CBC模式
密钥：4EE1B382949A024B802F52B4B4FE57F1BEF40853109256E2C20DECA3DD8DD56D
IV：文件前16字节

可以使用openssl解密文件：

[Bash shell] *纯文本查看*

```
openssl enc  -aes-256-cbc -d -in enc.bin -out dec.js -iv xxxxxxxxxx -K 4EE1B382949A024B802F52B4B4FE57F1BEF40853109256E2C20DECA3DD8DD56D
```

最近超级忙，遇到了顺手做了一下分析，欢迎大家继续研究。
