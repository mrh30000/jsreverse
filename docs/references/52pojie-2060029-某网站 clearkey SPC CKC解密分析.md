# 某网站 clearkey SPC CKC解密分析

> **作者**: 我是不会改名的 | **发布时间**: 2025-09-13 23:24:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 7291 / 23
> **原文**: [https://www.52pojie.cn/thread-2060029-1-1.html](https://www.52pojie.cn/thread-2060029-1-1.html)

---

## 某网站 clearkey 分析

网站有两种 DRM：**Widevine** 和 **biliDRM（clearkey）**

---

### 1. 获取 Key

单纯拿 key 都很简单，下个插件，随便找个 L3 就能拿到 key。

项目地址：
<https://github.com/DevLARLEY/WidevineProxy2>

![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/1.png)

---

### 2. 分析过程

#### 2.1 关闭 Widevine DRM

在 `edge://flags/` 中关闭 Widevine DRM：
![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/2.png)

JS 不过多分析了，扣代码也很容易，基本直接用就行。

---

#### 2.2 定位加密位置

很容易定位到加密位置，请求和处理响应分别是：

* **biliDRMGenSPC**
* **biliDRMParseCKC**

![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/3.png)

---

#### 2.3 biliDRMGenSPC 分析

根据提示，传入分别是：

* kid
* 随机生成的 aeskey
* 服务器返回的公钥 <https://bvc-drm.bilivideo.com/cer/bilidrm_pub.key>

说明：

* **MB** = malloc（WASM 导出函数 C）
* **RB** = free（对应函数 z）

传入函数 `_biliDRMGenSPC`：

* kid 指针
* aeskey 指针
* 公钥指针、长度
* 返回值长度指针
* 返回值指针的指针

![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/4.png)

---

##### 2.3.1 wasm 层函数

WASM 层对应函数是 `x`，利用 [jeb 分析](https://www.52pojie.cn/thread-1992148-1-1.html) 导出全部函数。

> jeb 交叉引用不起作用，导出来用其他软件分析。

![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/5.png)

从后往前分析：

* **param0** 对应返回值
* **v51** = 长度

函数 **f44** 多次调用：

* 传入代码行号和返回值
* 不为 0 → 报错并返回 0
* 为 0 → 返回 1 继续执行

![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/6.png)
![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/7.png)

---

##### 2.3.2 函数 f131

函数 **f131** 多次调用，并带有日志。
稍微分析变化 → 得出是**内存拷贝**。

![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/24.png)
![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/8.png)
![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/9.png)

在 f131 下断点，打印每次传入参数大小，可以看出大致分为几段：

* 0–8
* 8–24
* 24–40
* 40–168
* 168–188
* 188–192
* 192–240

![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/10.png)

---

##### 2.3.3 各段数据分析

###### 0–8

固定的 **8 字节 "bilibili"**

###### 8–24

* 8–20 固定
* 20–24 写入时间戳

![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/11.png)
![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/12.png)

###### 24–40

随机 **16 字节**

某处调用是循环，很明显是随机生成。
![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/13.png)

###### 40–168

长度 128 + 公钥 → **RSA 加密后的内容**

加密前的内容可直接修改传入公钥，利用对应私钥解密。
调用 **f619** → 对 JS 随机生成的 aeskey 进行 RSA 加密。

![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/14.png)
![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/15.png)

###### 168–188

对公钥进行 **SHA1**

![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/16.png)
![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/17.png)

###### 188–192

后续数据长度

![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/18.png)
![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/19.png)

###### 192–240

倒推，最后调用 **f226**，明显是 **AES 加密**：

* key = 传入的 aeskey
* iv = 前面随机生成的 24–40 字节

![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/20.png)
![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/21.png)

密文由几部分组成，同样调用 f131 组合：

* **第一部分（16字节）**：目前固定值
  ![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/22.png)
* **第二部分（16字节）**：调用 f226（ECB 模式），加密 kid 前 16 字节
* **第三部分（16字节）**：kid 后 16 字节
  ![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/23.png)

---

总的组成如下结构

```
SPC = Struct(
    "bilibili" / Bytes(8),  # 固定 bilibili
    "header" / Bytes(12),   # 固定
    "time" / Int32ub,       # 时间戳
    "iv" / Bytes(16),       # 随机生成的 IV
    "cipher_key" / Bytes(128),  # RSA 加密后的 AES 密钥
    "sha" / Bytes(20),      # RSA 公钥的 SHA1 哈希值
    "contentKeyCtxSize" / Int32ub,  # AES 加密后的 KID 上下文长度
    "contentKeyCtx" / Bytes(this.contentKeyCtxSize),  # AES 加密后的 KID 上下文
)

KID = Struct(
    "salt" / Bytes(16),
    "enc_kid" / Bytes(16),  # 加密后的 kid 前 16 字节
    "kid" / Bytes(16),      # kid 后 16 字节
)
```

---

#### 2.3 biliDRMParseCKC 分析

biliDRMParseCKC搞定了上面就很简单了
主要就是aes解密

```
CKC = Struct(
    "header" / Bytes(12),
    "time" / Int32ub,
    "iv" / Bytes(16),
    "data_len" / Int32ub,
    "data" / Bytes(this.data_len),#第一次解密全部，第二次解密后16字节，转为hex就是key
)
```

![img.png](https://s3.cldisk.com/sv-w7/doc/87/f7/be/0339074f3b1e5817392d0b72d9d7c6ec/thumb/25.png)

### 3. 总结

总的来说并不难，很多符号和提示都给了，还用的openssl里面的库。
