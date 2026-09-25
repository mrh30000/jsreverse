# 从 RegisterNatives 到逐字节复现：一次 Android `ttEncrypt` 封包逆向

> **作者**: bu^shan | **发布时间**: 2026-08-13 16:30:00 | **版块**: 『移动安全区』 | **查看/回复**: 916 / 0
> **原文**: [https://www.52pojie.cn/thread-2122819-1-1.html](https://www.52pojie.cn/thread-2122819-1-1.html)

---

## 从 RegisterNatives 到逐字节复现：一次 Android `ttEncrypt` 封包逆向

我先给 `ttEncrypt` 喂了三个字节：

```
61 62 63    # ASCII "abc"
```

返回值是 118 字节。

紧接着连续调用三次，三次结果完全一样；把每次调用间隔拉到一秒以上，结果又会
变化。更奇怪的是，无论输出怎么变，前 6 字节始终固定，后面的 32 字节和密文会
一起变化。

最开始我怀疑过缓存。但换成不同输入以后，32 字节区域仍然相同，后面的密文却会
跟着输入变化。这说明它不是简单缓存，更像是同一批随机材料在短时间内被重复使用。

这几个现象把问题缩小成了三部分：

```
固定的 6 字节是什么？
紧跟着的 32 字节从哪里来？
剩余内容是不是标准分组加密？
```

顺着这三个问题往下追，最后得到了一条可以离线编码、离线解包，并且与 Native
结果逐字节一致的完整数据流。

这篇记录的是整个定位过程，不涉及线上请求构造。文中的输入均为本地合成字节，
固定常量和版本偏移使用占位符；完整证据仍保留在仓库里，方便复核。

### 样本和环境

这次分析固定在下面这个样本上：

```
APP 版本：39.5.0
versionCode：390501
架构：arm64-v8a
APK 大小：352,046,739 bytes
SHA-256：76e609f25917358a334a85d62c7df957c7399df4f0aaad7528cb0f369b8cdd7e
设备：Android 13 / arm64
```

APK 的 v1、v2、v3 签名校验均通过。JADX 一共加载了 54 个 DEX，APK 中包含
274 个 arm64 Native 库。

后面所有静态地址和运行时偏移，都只对这个固定样本负责。

### 从 Java 入口开始

JADX 中的 Java 包装类并不复杂：

```
package com.bytedance.frameworks.encryptor;

public class EncryptorUtil {
    public static native byte[] ttEncrypt(byte[] data, int length);

    static {
        try {
            loadLibrary("Encryptor");
        } catch (UnsatisfiedLinkError ignored) {
        }
    }

    public static byte[] encrypt(byte[] data, int length) {
        if (data == null || length <= 0) return null;
        if (data.length != length) return null;
        return ttEncrypt(data, length);
    }
}
```

这里能确认几件事：

* 输入是原始字节数组，不是字符串；
* 第二个参数必须等于数组长度；
* 主要逻辑在 `libEncryptor.so`；
* Java 层没有额外处理输出结构。

继续看调用点，可以看到它并不只服务于一个接口：

* Retrofit raw byte 请求体；
* form-url-encoded 请求体；
* 加密后再 Base64 的部分字符串字段；
* 某些遥测或上报通道；
* 外部 Encryptor 不存在时的回退实现。

请求体路径还存在 102,400 字节的长度上限。这个调用范围说明它更像一个通用
客户端封包层，而不是只绑定某一个业务字段。

### 导出表里找不到 `ttEncrypt`

`libEncryptor.so` 的动态符号很少，能直接看到 `JNI_OnLoad`，但看不到
`Java_com_..._ttEncrypt` 这种静态 JNI 导出。

这通常意味着两种可能：

1. 函数名被隐藏，只保留内部跳板；
2. Native 方法通过 `RegisterNatives` 动态注册。

我从 `JNI_OnLoad` 往下看，很快碰到了一段长度固定的 XOR 循环：

```
mov     w11, #0x73

decode_loop:
ldrb    w13, [x10, x9]
eor     w13, w13, w11
strb    w13, [x12, x9]
add     x9, x9, #1
cmp     x9, #0x30
b.ne    decode_loop
```

它把一段 0x30 字节的数据逐字节与 `0x73` 异或，然后把结果交给 JNI 类查找。
解码后对应的类是：

```
com/bytedance/frameworks/encryptor/EncryptorUtil
```

后面的注册表只有一个 Native 方法：

```
name      = ttEncrypt
signature = ([BI)[B
```

JNI 签名拆开就是：

```
[B    byte[]
I     int
[B    byte[]
```

到这里，Java 方法和 Native 实现已经连起来了。相比在大段 ARM64 代码里猜哪个
函数“像加密”，从 `RegisterNatives` 反推入口可靠得多。

### 先不要读算法，先看输出形状

入口确定后，我没有马上啃完整反汇编，而是先用四组很小的输入调用它：

```
Java.perform(function () {
  const Encryptor = Java.use(
    'com.bytedance.frameworks.encryptor.EncryptorUtil'
  );

  const tests = [
    [0x41],
    [0x61, 0x62, 0x63],
    Array.from({ length: 16 }, (_, i) => i),
    Array.from({ length: 32 }, (_, i) => i)
  ];

  tests.forEach(function (input) {
    const signed = input.map(x => x > 127 ? x - 256 : x);
    const bytes = Java.array('byte', signed);
    const result = Encryptor.ttEncrypt(bytes, input.length);

    console.log(JSON.stringify({
      inputLength: input.length,
      outputLength: result.length
    }));
  });
});
```

得到的长度是：

| 输入长度 | 输出长度 |
| --- | --- |
| 1 | 118 |
| 3 | 118 |
| 16 | 134 |
| 32 | 150 |

后面又补了更多边界：

| 输入长度 | 输出长度 |
| --- | --- |
| 15 | 118 |
| 17 | 134 |
| 31 | 134 |
| 1024 | 1142 |

输出长度每次跨过 16 字节边界就增加 16，这个特征很像带 PKCS#7 填充的分组
密码。问题是固定开销并不是一个简单的 16 字节 IV。

把多次输出并排对比后，结构开始清楚：

```
74 63 05 10 00 00 | 32 bytes changing data | 16-byte-aligned tail
└──── 6 bytes ────┘ └──────── 32 ───────────┘ └──── ciphertext ────┘
```

前 6 字节固定为：

```
74 63 05 10 00 00
```

剩余密文长度可以写成：

```
cipher_len = output_len - 6 - 32
```

对于输入 `abc`：

```
118 - 6 - 32 = 80 bytes
```

80 正好是 5 个 AES 分组。

但这时还不能直接宣布它是 AES-CBC。16 字节对齐只能说明它很像分组密码，模式、
Key、IV 和实际明文都还没有证据。

### 连续输出相同，是缓存还是随机数问题

同一个输入连续调用三次，结果完全一致。

我先做了两组对照：

1. 同一秒内调用不同输入；
2. 固定输入，每次间隔 1150 ms。

第一组中，不同输入共享相同的 32 字节区域，但密文区域不同。这排除了完整结果
缓存：函数确实重新处理了输入，只是复用了同一批随机材料。

第二组中，四次调用的 32 字节区域全部不同。时间分别相隔约 1.15 秒。

结合反汇编和运行时调用，最终确认这 32 字节来自：

```
srand(time(NULL))

repeat 32 times:
    output[i] = rand() & 0xff
```

也就是说，种子只有秒级精度。

同一秒内重新执行 `srand(time(NULL))`，会从同一初始状态开始，于是 32 字节随机
材料完全相同。随机材料相同，后面派生出的 Key 和 IV 也会相同。

这里真正让我警觉的不是 `rand()` 本身，而是它每次调用都按当前秒重新播种。若只
在进程启动时播种一次，同一秒内连续调用也不一定重复；现在这种写法则会稳定复现。

### 用分段 Hook 代替整函数硬读

确认 32 字节区域后，我开始追它怎样进入密文计算。

`ttEncrypt` 内部代码不算特别大，但直接从头翻 ARM64 仍然很费劲。我最后采用的
办法是只 Hook 三类边界：

```
随机字节生成函数
SHA-512 函数
分组加密封装
```

为了避免文章里的脚本和某个版本偏移绑死，下面用占位符表示偏移。仓库探针中保存
了固定样本的实际值。

```
function hex(pointer, length) {
  const bytes = new Uint8Array(pointer.readByteArray(length));
  return Array.from(bytes)
    .map(x => ('0' + x.toString(16)).slice(-2))
    .join('');
}

const module = Process.getModuleByName('libEncryptor.so');

Interceptor.attach(module.base.add(RANDOM_OFFSET), {
  onEnter(args) {
    this.output = args[0].readPointer();
    this.length = args[0]
      .add(Process.pointerSize)
      .readU64()
      .toNumber();
  },
  onLeave() {
    console.log(
      'RANDOM len=' + this.length +
      ' hex=' + hex(this.output, this.length)
    );
  }
});

Interceptor.attach(module.base.add(SHA512_OFFSET), {
  onEnter(args) {
    this.input = args[0];
    this.length = args[1].toInt32();
    this.output = args[2];
  },
  onLeave() {
    console.log(
      'SHA512 len=' + this.length +
      ' output=' + hex(this.output, 64)
    );
  }
});

Interceptor.attach(module.base.add(CIPHER_OFFSET), {
  onEnter(args) {
    this.keyLength = args[1].toInt32();
    this.key = args[0];
    this.iv = args[2];
    this.plaintext = args[3];
    this.plaintextLength = args[4].toInt32();
    this.ciphertext = args[5];
    this.outputLength = args[6];
  },
  onLeave() {
    const length = this.outputLength.readU64().toNumber();
    console.log(
      'CIPHER key_len=' + this.keyLength +
      ' plaintext_len=' + this.plaintextLength +
      ' ciphertext_len=' + length
    );
  }
});
```

用 `abc` 跑一次，函数调用顺序非常干净：

```
RANDOM len=32
SHA512 len=32
SHA512 len=128
SHA512 len=3
CIPHER key_len=16 plaintext_len=67 ciphertext_len=80
FINAL len=118
```

这 6 行基本把主链骨架暴露出来了。接下来只要确认每一次 SHA-512 的输入来源。

### 三次 SHA-512，不是同一个用途

第一次 SHA-512 的输入正好是刚生成的 32 字节随机材料：

```
H1 = SHA-512(RANDOM32)
```

第二次 SHA-512 的输入长度是 128 字节。前 64 字节等于 `H1`，后 64 字节是一段
APK 内固定常量：

```
H2 = SHA-512(H1 || CONST64)
```

`H2` 的前 32 字节随后被拆成两部分：

```
KEY = H2[0:16]
IV  = H2[16:32]
```

加密封装报告的 Key 长度为 16 字节，AES key schedule 也报告 128 bit、10 轮。
这一步确认算法不是 AES-256，而是 AES-128。

第三次 SHA-512 的输入则是原始消息本身：

```
DIGEST = SHA-512(MESSAGE)
```

对于 `abc`，输入长度为 3，输出是标准 SHA-512：

```
ddaf35a193617aba...54ca49f
```

这个摘要没有拿去派生 Key，而是直接拼到了消息前面：

```
PLAINTEXT = SHA-512(MESSAGE) || MESSAGE
```

`abc` 的长度是 3，所以进入分组加密前的明文长度为：

```
64 + 3 = 67 bytes
```

PKCS#7 再补 13 个 `0x0d`，最后正好是 80 字节。这个长度与运行时捕获完全一致。

三次 SHA-512 到这里终于分工明确：

```
SHA512 #1    随机材料预处理
SHA512 #2    派生 AES Key 和 IV
SHA512 #3    原始消息完整性摘要
```

### 确认 AES-CBC，而不是“像 AES-CBC”

分组加密入口已经给出：

```
Key：16 bytes
IV：16 bytes
明文：67 bytes
输出：80 bytes
```

反汇编中的块处理逻辑符合 CBC：当前明文块先与上一状态异或，再进入 AES 加密，
输出同时成为下一块的状态。

为了避免把反汇编看错，我又用 OpenSSL 独立计算了一遍。

```
printf '%s' "$PLAINTEXT_HEX" \
  | xxd -r -p \
  | openssl enc -aes-128-cbc \
      -K "$KEY_HEX" \
      -iv "$IV_HEX" \
      -nosalt \
  | xxd -p -c 4096
```

这里不使用 `-nopad`，让 OpenSSL 按 PKCS#7 填充。输出的 80 字节与 Native 捕获
密文逐字节一致。

所以这一步的结论不是“看到 AES 字符串”，而是三种证据互相吻合：

* Key 长度和轮数符合 AES-128；
* 静态分组关系符合 CBC；
* OpenSSL 对相同 Key、IV、明文的输出逐字节相同。

### 完整封包结构

到这里，整个容器可以写成：

```
M       = 原始消息
R       = PRNG(32)
H1      = SHA-512(R)
H2      = SHA-512(H1 || CONST64)
KEY     = H2[0:16]
IV      = H2[16:32]
P       = SHA-512(M) || M
C       = AES-128-CBC-PKCS7(KEY, IV, P)

BLOB    = MAGIC6 || R || C
```

各区域长度：

```
MAGIC6    6 bytes
R        32 bytes
C        16-byte aligned
```

因此输出长度是：

```
len(BLOB) = 38 + len(PKCS7(SHA512(M) || M, 16))
```

这也解释了前面的边界表。只要 `64 + len(M)` 跨过 16 字节边界，最终输出就增加
16 字节。

### 离线解包器

解包不需要从设备读取密钥。原因很直接：

* `R` 明文保存在包内；
* KDF 使用的固定材料存在于 APK；
* Key 和 IV 都能由 `R` 重新推导。

下面是一个删去固定常量的离线结构。`CONST64` 由调用者提供，避免把文章变成某个
固定版本的直接套用脚本。

```
from __future__ import annotations

import hashlib
import secrets

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

MAGIC = bytes.fromhex("746305100000")

def derive(seed32: bytes, const64: bytes) -> tuple[bytes, bytes]:
    if len(seed32) != 32:
        raise ValueError("seed32 must be 32 bytes")
    if len(const64) != 64:
        raise ValueError("const64 must be 64 bytes")

    h1 = hashlib.sha512(seed32).digest()
    h2 = hashlib.sha512(h1 + const64).digest()
    return h2[:16], h2[16:32]

def unpack(blob: bytes, const64: bytes) -> bytes:
    if len(blob) < 54:
        raise ValueError("container is too short")
    if blob[:6] != MAGIC:
        raise ValueError("unexpected magic")
    if (len(blob) - 38) % 16 != 0:
        raise ValueError("ciphertext is not block aligned")

    seed32 = blob[6:38]
    ciphertext = blob[38:]
    key, iv = derive(seed32, const64)

    padded = AES.new(key, AES.MODE_CBC, iv).decrypt(ciphertext)
    plaintext = unpad(padded, 16)
    if len(plaintext) < 64:
        raise ValueError("plaintext is truncated")

    expected_digest = plaintext[:64]
    message = plaintext[64:]
    actual_digest = hashlib.sha512(message).digest()

    if not secrets.compare_digest(expected_digest, actual_digest):
        raise ValueError("SHA-512 check failed")
    return message

def pack(message: bytes, seed32: bytes, const64: bytes) -> bytes:
    key, iv = derive(seed32, const64)
    plaintext = hashlib.sha512(message).digest() + message
    ciphertext = AES.new(key, AES.MODE_CBC, iv).encrypt(
        pad(plaintext, 16)
    )
    return MAGIC + seed32 + ciphertext
```

这个实现只操作调用者提供的本地字节，不包含网络行为。

### 最后一次对拍

验证时我没有只检查“能解出一段可读文本”，而是做了两层对拍。

第一层使用 Native 捕获的一组 `abc` 样本：

```
captured_blob == reproduced_blob    true
unpacked_message                    61 62 63
sha512_valid                        true
```

离线重新封包与 Native 返回的 118 字节完全相同，不只是长度相等或前缀相同。

第二层覆盖输入长度边界：

| 输入长度 | 预期输出 | 实际输出 | 解包回环 | 摘要校验 |
| --- | --- | --- | --- | --- |
| 1 | 118 | 118 | 通过 | 通过 |
| 3 | 118 | 118 | 通过 | 通过 |
| 15 | 118 | 118 | 通过 | 通过 |
| 16 | 134 | 134 | 通过 | 通过 |
| 17 | 134 | 134 | 通过 | 通过 |
| 31 | 134 | 134 | 通过 | 通过 |
| 32 | 150 | 150 | 通过 | 通过 |
| 1024 | 1142 | 1142 | 通过 | 通过 |

到这里，格式、KDF、分组模式、填充方式、消息摘要和长度公式都能同时解释动态结果。

### 这条链里最容易看错的三个地方

#### 固定的 32 字节不是 AES Key

它只是随包携带的随机材料 `R`。真正的 Key 和 IV 要经过两次 SHA-512 才得到。
如果只在最终包上切片，很容易把 `R` 直接当成 AES-256 Key。

#### 消息前面的 SHA-512 不是 HMAC

摘要没有使用秘密 Key，只是：

```
SHA-512(MESSAGE)
```

它可以检查解包后的消息是否自洽，但不提供基于秘密的真实性证明。知道公开派生
流程的一方可以重新计算摘要和整个容器。

#### 同秒重复不是业务缓存

不同输入共享相同 `R`，但密文随输入改变，说明函数仍然执行了。真正的问题是每次
调用都使用秒级时间重新播种 PRNG。

这三个点如果没有运行时中间值，只看最终密文都很容易下错结论。

### 它到底算不算“加密”

从实现上说，它当然使用了 AES-128-CBC，也确实把原始消息变成了不可直接阅读的
字节。

但从密钥模型看，这一层并不持有服务端秘密：

* Key 和 IV 由包内公开的 `R` 与 APK 固定材料推导；
* 消息完整性使用普通 SHA-512，不是 HMAC；
* CBC 没有 AEAD tag；
* 同秒调用还会重复 `R`、Key 和 IV。

所以我更愿意把它叫作“可逆封包层”或“协议编码层”。它能增加静态观察成本，
也能让服务端统一检查格式和消息摘要，但真正的链路机密性仍然依赖 HTTPS/TLS。

这个判断比“它用了 AES，所以很安全”或者“它能解，所以毫无作用”都更准确。算法
是否标准是一回事，Key 从哪里来、攻击者能看到哪些材料，是另一回事。

### 版本边界

文章中的逐字节动态验证对应 39.5.0。

仓库对 39.5.0 和 39.7.0 的 Native 库做过哈希比较，`libEncryptor.so` 在两个
版本中逐字节相同，因此 Native 实现可以继承旧结论。不过这不自动证明所有 Java
调用点和服务端使用策略也完全没变。

迁移到新版本时，我至少会重新确认：

* APK 和 `libEncryptor.so` 的 SHA-256；
* `RegisterNatives` 类名和签名；
* Java 调用入口是否仍然存在；
* 固定输入的长度矩阵；
* 一组 Native 与离线逐字节对拍。

只要其中一项不一致，就应该建立新的版本基线，而不是继续沿用旧偏移。

### 回头看这次定位过程

真正节省时间的不是某个反编译器，而是分析顺序：

```
先固定小输入
  → 看输出长度和稳定区域
  → 从 RegisterNatives 找入口
  → 只 Hook 随机数、摘要和分组边界
  → 用 OpenSSL 独立确认模式
  → 写离线解包器
  → 做逐字节对拍和长度回归
```

如果一开始就顺着 580 行 ARM64 反汇编从头读，我很可能会在 AES 表和内存管理代码
里花掉大量时间。固定输入和阶段 Hook 先给出了数据关系，反汇编只需要回答剩下的
具体问题。

这也是这条链最值得留下来的地方：最后的公式并不复杂，难的是证明每个字段为什么
在那个位置、每次 SHA-512 分别做什么，以及同秒重复到底来自缓存还是 PRNG。
