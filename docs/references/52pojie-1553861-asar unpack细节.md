# asar unpack细节

> **作者**: hx1314521 | **发布时间**: 2021-11-30 20:05:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4921 / 9
> **原文**: [https://www.52pojie.cn/thread-1553861-1-1.html](https://www.52pojie.cn/thread-1553861-1-1.html)

---

*本帖最后由 hx1314521 于 2021-11-30 20:07 编辑*

对于命令行操作，linux永远比windows好使
安装一台ubuntu2004[虚拟机](https://www.52pojie.cn/thread-661779-1-1.html)
第一步：安装asar

[C++] *纯文本查看*

```
npm install -g asar
```

第二步 解压缩asar e 解压的文件  解压目录

[Asm] *纯文本查看*

```
asar e app.asar ../abc
```

xxxx

第五不 打包asar p 打包的目录 打包后的文件

[Asm] *纯文本查看*

```
asar p ../abc app.asar
```

ps:我用的是python3所以跑@[iokeyz](https://www.52pojie.cn/home.php?mod=space&uid=873378)大侠的python脚本报错，
我修改了一下
cipher = Cipher(algorithms.AES(key), modes.CBC(iv),backend =default\_backend())

[Python] *纯文本查看*

```
import os
from base64 import b64decode
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
[color=#ff0000]from cryptography.hazmat.backends import default_backend[/color]

def dec(filename):
    with open(filename, 'rb') as file:
        fileb = b64decode(file.read())
        iv = fileb[:16]
        key = bytes.fromhex('4EE1B382949A024B802F52B4B4FE57F1BEF40853109256E2C20DECA3DD8DD56D')
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv)[color=#ff0000],backend =default_backend()[/color])
        decryptor = cipher.decryptor()
        filed = decryptor.update(fileb[16:]) + decryptor.finalize()
        dest = open(filename+'-dec.js', 'wb')
        unpadder = padding.PKCS7(128).unpadder()
        data = unpadder.update(filed) + unpadder.finalize()
        dest.write(data)
        dest.close()

point = os.walk('.')
for pwd, dirl, filel in point:
    for filename in filel:
        if filename.endswith('js'):
            dec(filename)
```
