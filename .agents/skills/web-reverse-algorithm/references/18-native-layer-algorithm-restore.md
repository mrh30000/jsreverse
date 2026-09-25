# 18 · 页面 JS 之外的算法还原（so / native / Java / APK 资源包）

> **定位**：本文件处理一类**根本不在页面 JS 里**的算法 —— 参数由 Android/iOS 客户端、
> so 动态库、Java 层工具类、或随包下发的资源包产出。
> **它不替代 `02-algorithm-families.md`**：那里按「平台/题型」列站点模式（其中
> `§一 得物 newSign（so 层 AES-ECB）` 就是本大类的第一个样本）；本文件按「载体类型」给**总纲与判据**。
> 页面内的算法题（含打包成 bundle 的）走 `01-decision-tree.md` → `15-call-site-locating-playbook.md`。

---

## §0 三十秒判据：这题到底在不在页面里

| 现象 | 判断 | 去哪一节 |
| --- | --- | --- |
| 抓包里有个**长度固定、无业务含义**的 header（如 `sign` / `x-gorgon` / `X-APPLE-HC`），页面 JS 里全局搜**搜不到**参数名 | **客户端 native / Java 层** | §2 / §3 |
| 同一个参数名在页面里能搜到，但值是「调了一个 `window.xxx` 桥」 | 混合（页面调 native） | §2.4 |
| 目标 App 会**下载一个加密压缩包**（zip/7z），解压要密码 | **APK 内资源包 / 下发资源包** | §4 |
| 请求体是「一长串十六进制」，解出来是 JSON | **Java 层 AES → hex 编码** | §3.4 |
| 只有 `.so` / `lib*.so`，且 `ida` 能识别导出符号 | **native 层** | §2 |
| 有 `.so`，但 `ida` 的 `Exports` **搜不到**那个方法名 | **动态注册**（`RegisterNatives`） | §2.5 |
| 参数在页面 JS 里能搜到，但代码被 uglify + 字符串加密 | **不是本文件**，走 `../../ast-deobfuscation/` | — |
| 逐删参数只报「缺少 xxx」，**从不报「签名错误」** | **服务端只校验「参数存在性 + 格式」，无签名层** | §3.9 |

> ★ **反向判据（省时间）**：先在页面里**全局搜参数名**（不是搜 `sign` 这个词，是搜**逐字**的那个参数名）。
> 搜得到 ⇒ 页面里至少有一层；搜不到 ⇒ 大概率整条链都在客户端。
> `15-call-site-locating-playbook.md` §0 的 **J1「消失点比出现点更好用」**（跟栈找参数）在客户端题上**会静默失败**，不要因此判定「没有」。

---

## §1 分流表：五种载体与首选动作

| 载体 | 你手上有什么 | 第一个动作 | 成本 |
| --- | --- | --- | --- |
| **so / native** | `.so` 文件 + 导出函数名 | 先看**导出符号名是否自描述**（如 `AES_128_ECB_PKCS5Padding_Encrypt`）⇒ 按名字直译；否则 `ida` 静态 + `unidbg` 动态 | 高 |
| **Java 层** | `apk` | `jadx` 打开 → **搜接口名**（不是搜 `encrypt`）→ 找 Util 类 → **整类搬到 Java 工程** | 低 |
| **APK 内资源包** | 加密 zip + 一个密码生成函数 | `frida` **直接调用 App 自己的那个方法**拿到口令 | 低 |
| **打包产物**（asar / jsc / 字节码） | 一个 exe / 目录 | 走 `../../desktop-client-reverse/SKILL.md` | 中 |
| **wasm** | `.wasm` | 走 `../../wsam-reverse/SKILL.md` | 中 |

> ★ **选路铁律**：**能从高层拿到就不要下沉。**
> Java 层能整类搬走就不要去 unidbg；能在 App 内直接调用就不要还原算法。
> 只有当上层确实没有（真 native、被 VMP 掉）时才下沉。

---

## §2 so / native 层

### §2.1 ★★ 签名版本选择器（`sv`）：同一个参数名，随机走不同算法

**来源** `52pojie-1355674`（某东 `libjdbitmapkit.so` 的 sign）。

链路本身是常规的：

```text
字符串拼接 → sub_126AC（自定义字节处理）→ sub_18B8(base64) → sub_227C(md5) → sign
```

真正的坑在 `sub_126AC` 的入参上：源文 hook 出来是
`(jni 指针, 明文, 明文长度, 随机数 v26, 随机数 v27)`，
而 `v26 / v27` 先经过 `sub_12640` 得到 **`sv`（signVersion，签名版本）**，
再由 `sv` 决定走哪个 `case` —— **不同的版本号对应不同的签名算法**。

> ★★ **判据**：只要在 so 里看到「**用随机数算出一个版本号，再按版本号分支**」，
> 就**不要试图还原所有分支** —— 把随机数**写死成一个已知值**，只跟一个分支。
> 源文原话：「故动态调试的时候，固定一种算法分析即可」。
> 具体动作：在 `sub_126AC` 里**把 `a5`/`a6`（即 v26/v27）改掉**，固定走 `case 0`。

**两条配套判据**：

1. **`ida` 认不出函数 ≠ 没函数**：源文遇到的那段「`ida` 没办法识别函数，因为此函数被加密过」——
   处置是在**调用点下断点跟着进去**，进去后手动 `p`（转成代码）再 `F5`。
2. **`unk_D02565AC` 这类名字是「未定义数据被当函数调用」的典型**：它出现在高位地址段，
   与低位 `.text` 里的 `sub_126AC`/`sub_18B8`/`sub_227C` 不在同一区域。
   ⇒ **别在 `.text` 里找它**，要在**动态调试时跟进去**。

> ⚠️ **本条的边界**：源文是**纯截图帖**（正文只有 132 行、其中 20 张图），
> `sub_126AC` / `unk_D02565AC` 的内部算法**没有给出**。
> 本节只立「`sv` 分支要固定」与「ida 认不出时怎么办」两条判据，
> **不得据此推断某东 sign 的具体算法**（该参数的完整算法不在本库的收录范围内）。

### §2.2 ★★★ 密钥是「派生」的，而且被藏在密文里（某程 `encode`）

**来源** `52pojie-2005163`（某程 so 层 `ctrip_enc`）。这是本批最完整的一份 so 层还原，
链路六段、每一段都有可机械核对的判据：

```text
① 随机 key（时间派生）           ── random_key
② 随机 key + 固定 IV → encrypt_one → 真实 AES key
③ 真实 key + 另一个固定 IV → AES-CBC 加密明文
④ 把「随机 key」按规则插进密文   ── encrypt_two
```

**① 填充：先认 PKCS7 的 C 语言等价形态**

源文的两段计算看着绕，其实是标准 PKCS7：

```text
if ((input_len & 0xF) != 0) input_len_10 = (input_len + 16) & 0xFFFFFFF0;
else                        input_len_10 = input_len + 16;

if ((input_len & 0xF) != 0) v8 = 16 - (input_len & 0xF);
else                        v8 = 16;

memset(&input_[input_len], v8, v8);
```

> ★★ **判据**：`(len + 16) & ~0xF` 与 `16 - (len & 0xF)` 同时出现 ⇒ **就是 PKCS7，没魔改**。
> 注意 `len` 恰为 16 倍数时补 **16** 而不是 0（这两行 `else` 分支就是为它写的）。

**② 真实 key 是派生的 ⇒ 看到 `aes_setkey_enc(CTX, X, 0x80)` 才能定 X 是 key**

`encrypt_one(randomkey, iv, &out)` 里做的是：

- 对 `randomkey` 逐字节 **S-box 替换**（源文把那一大串 16 行的 `LOBYTE(v10) = *(sbox + v10)`
  归纳成 6 行：`data[i] = SBOX[data[i]]`）；
- **行移位**：4 字节一组，分别循环左移 **1 / 2 / 3 / 4** 位（第 4 组移 4 位 = 不动）
  —— 源文实测：`D4 3F 8B 24 | 1A 5E 7E 9D | 24 14 7E C6 | 49 7F DB 9E`
  → `3F 8B 24 D4 | 7E 9D 1A 5E | C6 24 14 7E | 49 7F DB 9E`；
- **列移位**：实测是**字节置换**而不是标准列混淆的有限域乘，
  源文同样用「执行前后打印同一缓冲区」给出前后值；
- 对 **IV** 再做一轮 S-box 替换；
- `v26 = 2` ⇒ 上述行移位+列移位**只跑两轮**。

> ★★★ **本节最值钱的动作：用「执行前后打印同一块内存」反推算法语义。**
> 源文的做法是在 `unidbg` 里对 `row_rotation` / `column_rotation` 的**入参缓冲区**
> 在调用前后各打一次，然后**用「前后字节的对应关系」反推**它在做什么，
> **而不是读汇编**。四个字节循环左移 1/2/3/4 这个规律，就是这么看出来的。
> ⇒ **凡是遇到「名字像变换、代码看着头大」的函数，先做一次前后差分，再决定要不要读代码。**
> 判据：源文对 S-box 是**逐字节对比 256 项**后确认「从头到尾，一个个对比过了，没毛病，一个字没动」
> ⇒ **标准部件复用当 KDF**，不是魔改 AES。

**③ `0x80` 就是位宽**

`aes_setkey_enc(CTX, v20, 0x80u)` ⇒ **`0x80 = 128` ⇒ AES-128**。
两个固定 IV 分别是 `xmmword_112D4`（派生真实 key 用）与 `xmmword_112C4`（CBC 用）：

```text
xmmword_112C4 = 69 D2 55 B8 32 9E AC D4 0C 2A 9C 8B 68 75 87 05
```

> ★ **判据**：`ida` 里 `xmmword_*` + `DCB` 列表**恰好 16 字节** ⇒ 基本就是 IV/密钥候选。

**④ 密文尾部插入了随机 key ⇒ 解密时先把随机 key 抽出来**

`encrypt_two` 把 `random_key` 的每个字节，按 `i = (i + v11) % (v32 + input_len) + 1`
算出的位置**插入密文并右移后续字节**，最终输出 `ivlen + input_len` 长度。

> ★★ **形态归属**：这是 `08-mixed-crypto-segmentation.md` §八「密钥包装的另外四种形态」
> 之外的**第四种**：**密钥不是被加密，而是被「插进」密文里**。
> ⇒ 解密顺序必须**反着来**：先从密文抽出随机 key → 用 `encrypt_one` + IV 算出真实 key
> → 再用另一个固定 IV 做 AES-CBC 解密。
> **判据：密文长度比明文长度长且不是块对齐的整数倍**（这里是 `+ ivlen`）⇒ 先怀疑尾部藏了东西。

### §2.3 ★★ 签名结果由内存地址派生 ⇒ 每次都不一样，且**不可纯算**

**来源** `52pojie-1610506`（海外某音 `x-gorgon`）。

源文的结论一句话：「**xg 值的计算结果都是由 malloc 出来的地址来决定的，所以每次都不一样**」。

结构自洽性核对（源文给的数字**恰好能对上**）：

```text
malloc(0x1A)          = 26 字节缓冲
[0..1]  04 01         固定头
[2..3]  malloc 地址低 16 位（第 1 字节 = 地址最低位，第 2 字节 = (地址>>8) 最低位）
[4..23] 20 字节参数（= 0x14，第二次计算循环 0x14 次）
```

⇒ **`4 + 2 + 20 = 26`**，三段恰好填满。

> ★★ **两条可迁移判据**：
> 1. **「同一明文两次结果不同」不一定是时间戳/随机数** —— 也可能是**内存地址**（ASLR）。
>    判别动作：看两次结果的**差异位数**是否随进程/分配器变化，而不是随时间。
> 2. **这类签名往往服务端不做逐字节校验**（它自己都复现不出来），
>    校验的是**结构与设备画像字段**。源文原话：开头 4 字节 `04010000`，
>    **`0000` 是正常设备，被检测到就变成其他数字**（源文实测自己的手机是 `1081`）。
>    ⇒ **这几个字节是风控画像位，不是校验位**，采集时要如实带上自己环境的真实值。

> ⚠️⚠️ **必须登记的边界（源文未说明、本库不裁决）**：
> - 源文是**原理叙述**，源码在**附件**里，正文**没有给出任何代码**；
> - 源文说的「26 字节」与公开的 `x-gorgon`（另一代、长度大得多）**不是同一实现**，
>   源文自称是「**去年逆的海外版某音 1474 版本**」⇒ **不得把本条与 `douyin-a-bogus` 混为一谈**；
> - `1081` 的字节序（`10 81` 还是 `81 10`）源文未给 ⇒ 只登记「它是 2 字节画像位」这一事实。
>
> 详见蓝图 `../../reverse-knowledge/data/blueprints/tiktok-x-gorgon/`（本批新建）。

### §2.4 native 与页面混合：判据

页面里出现 `window.xxx` 桥、`window.webkit.messageHandlers`、
`window.AndroidFunction`、或 `plus.*`（H5+）时，参数由原生回填。
⇒ **不要试图在页面里纯算**，走 `../../web-reverse-hook/references/response-rewrite-and-locating-hooks.md`
的「定位调用点」路线，或直接在客户端侧做 RPC。

### §2.5 ★★ 进 so 的第一分钟：**静态注册** 还是 **动态注册**

**来源** `52pojie-1238131`（快手 `sig` ← `libcore.so` 的 `CPU.getClock`）、
`52pojie-1724211`（某免费小说 `hash2` ← `libUiControl.so`）、`52pojie-1803699`（无壳 App）。

三条路线的分流（**先在 Java 侧确认，再进 `ida`**）：

| 现象 | 结论 | 第一个动作 |
| --- | --- | --- |
| Java 里能看到 `public static native String f(...)`，且有一个 `static { System.loadLibrary("x"); }` | **静态注册** | `ida` 打开 → **`Exports` 页搜方法名** `Java_<包>_<类>_<方法>` |
| `Exports` 里搜不到，`Functions` 里搜 `f` 也搜不到 | **动态注册**（不是「函数不存在」） | 去找 **`JNI_OnLoad`** |
| Java 侧连 `native` 声明都没有 | 不在 so 里 | 回 §0 判据 |

> ★★ **可迁移判据（本节核心）：`ida` 里搜不到函数名，第一反应必须是「静态注册还是动态注册」，
> 不是「这个函数不存在」。** 动态注册的行为是：`JNI_OnLoad` → `GetEnv` → **`RegisterNatives`**，
> 函数名只以**字符串常量**的形式存在于数据段，`ida` 不会给它建符号。

`RegisterNatives` 的契约（源文 `1724211` 贴了定义）：

```c
jint RegisterNatives(jclass clazz, const JNINativeMethod* methods, jint nMethods);

typedef struct {                 /* JNINativeMethod */
    const char* name;            /* 函数名 */
    const char* signature;       /* 函数签名，如 (I[B)Ljava/lang/String; */
    void*       fnPtr;           /* 真正的实现地址 ← 这才是你要找的 */
} JNINativeMethod;
```

`fnPtr` 就是目标函数指针（源文 `1724211` 实测：`sub_877EC` = `hash`、`sub_87324` = `hash2`）。

#### 三条与 `ida` 打交道的硬判据

1. **`JNIEnv*` / `JavaVM*` 的类型没设对 ⇒ `JNI` 调用全显示成「指针加偏移」，不可读。**
   `ida` 里表现为 `(*(_DWORD*)(v9 + 0x2C))(...)` 这类形态。改类型的两个锚点：
   - `JNI_OnLoad(JavaVM* vm, void* reserved)` 的**第一个参数是 `JavaVM*`**；
     `GetEnv` 的**输出是 `JNIEnv*`**（源文实测：源文一开始把 `v26` 改成 `JNIEnv*` 后，
     `GetEnv` 才显示出来）；
   - ★★ **不要凭「名字像」就改**：源文把 `sub_78EEC` 惯性改成 `JNIEnv*` 得到的是
     **`FindClass`**（明显不对，`FindClass` 不产出 `JNIEnv*`）——
     **交叉引用（xref）到 `JNI_OnLoad` 才发现它其实是 `JavaVM*`**。
     ⇒ **判据：改类型前先看 xref；得到的函数名与语义矛盾时，类型就是错的。**
2. **`methods` 数组可能是加密数据。** 源文 `1724211` 的 `methods` 三个字段在静态视图里全是空数据，
   要**先经 `sub_78F54` 解密**。解密逻辑（源文原话归纳）：
   **取三位一组转成十进制数，与 `v12` 异或**；`v12` 是字符串 `"8080"`，
   即密钥字节循环 `[56, 48]` = `ord('8') / ord('0')`；
   `v8 - (v10 & 0xFFFFFFFC)` 等价于 `v8 & 3`（只取末两位）。
   ⇒ **判据：`JNINativeMethod` 的 `name/signature/fnPtr` 静态全是 0 时，
   先找「谁在 `RegisterNatives` 之前解密了它」**，别急着下「数据段被清空」的结论。
3. ★★ **同一 App 常带多种 ABI 的 so ⇒ 反编译观感差时先换 ABI，不要硬啃。**
   源文原话：「一开始分析的是 `arm64` 的 so 文件，反编译的结果不是很好分析，头脑有点迷糊
   没有对上哪个函数指针对应哪个函数……后面换了 32 位的 so 文件才发现反编译效果好的太多了，
   不仅 `methods` 数组各个参数排列的很整齐，甚至 `hash2` 函数名的符号表都还在」。
   ⇒ 落地动作：`apk` 解开后看 `lib/arm64-v8a`、`lib/armeabi-v7a`、`lib/x86` 各有什么，
   **优先挑反编译质量好的那一份**（源文另一例：`arm` 反编译有问题而 `x86` 非常清晰）。

#### 常量池里的「地址」在运行时是「基址 + RVA」

源文 `1238131` 的做法值得当作模板：`ida` 伪代码里出现 `v12` 来自 **`6074`**（即 `dword_6074`），
`frida` 侧的动作是 **`so 基址 + 0x6074` → `Memory.readByteArray`**。

> ★★ **判据**：`ida` 假名里的 `loc_` / `dword_` / `byte_` / `off_` + 十六进制，
> **全都是 RVA（相对虚拟地址）**，frida 里必须加模块基址才能读；
> 直接 frida 搜模块不会命中，因为那是加载后才有的绝对地址。
> 配套：快手那条链是 `j_cpu_clock_start → j_cpu_clock_x → j_cpu_clock_end`
> —— 三个函数的前缀 `j_` 表示 `ida` 已识别为 `JNI` 函数，**`_start/_x/_end` 三件套本身就是
> 「初始化 → 运算 → 收尾」的路标**，源文据此直接锁定加密逻辑所在。

#### 「看着像 MD5」时，最省的确认动作

源文 `1238131` 原话：「结合之前的代码来看，有点 MD5 的感觉，**上代码验证下可发现**，
确实是加 salt 之后的 md5」。⇒ **判据：伪代码像某个已知标准算法时，
不要先去逐条比对常数，直接用同一份输入跑一遍标准实现做 diff**（成本一次调用）。

---

## §3 Java 层（`jadx`）

### §3.1 ★★ 入口是**接口名**，不是 `encrypt`

**来源** `52pojie-729954`。源文的定位顺序逐字是：

```text
抓包发现 responseBody 全是英文数字 → jadx 打开 apk
→ 搜接口名 getVersion → 找到这个 class
→ 搜索引用这个变量的地方 → 跟进去 → 果然，AES 加密
```

> ★★ **判据**：**Java 层的入口是「业务接口名」，不是加密关键字**。
> 因为 `jadx` 里 `encrypt` 会被无数无关代码命中，而**接口名是唯一的**。
> 这与 `15-call-site-locating-playbook.md` §0 **J1「消失点比出现点更好用」**是同一思路的客户端版本：
> **搜一个唯一的东西，而不是搜一个常见的东西。**

### §3.2 ★★ 能整类搬走就不要还原

源文原话：「因为 **android 跟 java 的互通性**，把 apk 中 `AesEncryptionUtil` 这个类
**直接复制到 java 里，稍微改改就可以用了**」。

> ★★ **这是 Java 层最大的成本优势**：不需要 unidbg、不需要符号还原，
> 把类搬过去、补齐 `import` 与常量类即可。
> ⇒ **判据：只要加密代码在 Java 层（不是 JNI 进 so），就先试「整类搬移」，失败再谈还原。**

### §3.3 密钥与 IV 通常在 `Constant` 常量类里

源文：「`Constant` 是个常量类，点进去就可以看到 AES 加密所需要的**密文**跟**偏移**了」。

> 注：源文这里的「密文」是**笔误**，指的是 **key**（它后面自己说「AES 加密所需要的密文跟偏移」= key 与 IV）。
> ⇒ **登记为源文表述瑕疵**，不影响结论。

### §3.4 ★ 密文是「十六进制字符串」，所以看起来「全是英文字母」

源文原话：「解密过程也简单，AES 之后将 byte 集合转换为 **16 进制** 然后 `toString()`，
所以结果看起来全是英文字母」。

> ★ **判据**：`responseBody` 是**纯 `[0-9a-f]` 且长度为偶数**的长串 ⇒ 先按 **hex 解码**再解；
> 若长度是 4 的倍数且含 `+/=` ⇒ 按 **base64**。
> 两者混淆的症状是「解密不报错但全是乱码」——
> 见 `16-ciphertext-structure-diagnostics.md`。

### §3.5 ★★ JNI 反向调用 Java 算法：四步固定骨架（可与 `Frida` 正交互证）

**来源** `52pojie-1724211`（某免费小说 `hash2` ← `libUiControl.so`）、
`52pojie-1803699`（无壳 App 的 `sign` ← `privateKey` + `SHA1WithRSA`）。

JNI 层不自己实现密码学、而是**回调 Java 的 `java.security`** 时，`ida` 伪代码就是这四步：

```text
1. FindClass        → 拿到类对象（如 Signature / KeyFactory）
2. NewObjectV       → 构造实例（带构造参数）
3. GetMethodID      → 拿到要调用的 method ID
4. CallObjectMethodV / CallVoidMethodV → 调用，取回结果
```

> ★★ **判据：看到这四步的固定节奏，就直接判「算法体在 Java 标准库里」，不用读 `sub_`。**
> 源文 `1724211` 把它翻译回 Java 只有 8 行（`PKCS8EncodedKeySpec` → `KeyFactory("RSA")`
> → `Signature("SHA1WithRSA")` → `initSign` → `update` → `sign`），随后 **`Base64` 一下就是 `sign` 参数**。
> 与 §3.2 是同一成本逻辑：**算法在标准库里 ⇒ 还原成本≈0，别去扣 so。**

**★★★ 本节最值钱的动作：用 `frida` 直接打印「入参 / 返回值」，一步拿到全部输入输出。**

源文 `1803699` 的 `frida` 输出（**在逆向之前**就拿到了完整契约）：

```text
getRSAParams is called, params: {password=d8578edf8458ce06fbc5bb76a58c5ca4, os=android,
                                 mobile=15536263522, version=2.2.3}
getRSAParams ret value is {data=eyJwYXNzd29yZCI6...fQ==,
                           sign=DmxjCCvf8aJnZNve4BQkcy6turIGzkE13DkIu9JSnJF7...,
                           timestamp=1687264102}
```

⇒ 三个可直接抄进判据的事实：
① `data` 是 **`Base64(JSON)`**（解开头即 `{"password":...}`），不是加密；
② `sign` 的**签名原文是 `data=<base64>&timestamp=<秒>`**（hook `sign` 时打印 `content` 得到）；
③ `timestamp` 是**秒级**（10 位）。

> ★★ **判据（可迁移）：hook 的打印内容本身就是最强的规格说明。**
> `called/ret value` 两条日志把「入参 → 出参」钉死，剩下的只是**用 Python 复现同一函数**
> ——不需要扣代码、不需要补环境。源文 `1724211` 走的是同一条路
> （先 `hash2` 的函数契约，再用 `PYTHON-RSA` 复现，最后「计算得到的 `sign` 值和抓包得到的一致」）。
> ⚠️ **但「能调用」不等于「能交付」**：最终产物仍要落到离线复算（见 §4.1 判据 2）。

**★★ 与「同型双源互证」：两份独立源文各自给出同一族算法，应当直接合并成一条模式。**

`1724211`（`PKCS8EncodedKeySpec` + `SHA1WithRSA` + `Base64`）与
`1803699`（`MD5(密码)` → `Base64(JSON)` → `SHA1WithRSA(data&timestamp)` → `Base64`）
**是同一个模式的不同站点实例**：`SHA-1 with RSA` 签名 + Base64 传输 + 排序或定序拼串。
⇒ **判据：看到 `SHA1WithRSA` / `SHA256WithRSA` 出现在 Java 层，就按「拼串 → RSA 签 → Base64」三件套直接落地**，
不用再逐函数跟。

**⚠️ 密钥材料的取证点**：源文 `1724211` 的私钥不是硬编码字符串，而是
`type`（`hash2` 的第一个参数，源文实测传入固定值 **`2`**）→ `off_3BFC50 + 1 = unk_2F5477`，
源文说其长度为 **`0x279`**。

> ★★ **判据**：**`PKCS8EncodedKeySpec(key)` 的 `key` 来自「常量偏移 + 1」时，
> `+1` 通常是在跳过 DER 的首字节**（`30 82 xx xx` 的 `0x30`）。
> ⇒ 取证动作是「把常量偏移处的字节按长度 dump 出来，试 `base64` / 试 `latin-1`」，
> **不要尝试去算私钥**（不可能）。

### §3.6 ★★★ `RSA` 签名的长度必须现算：**`k` 是 bit，不是 byte**

**来源** `52pojie-1803699` 的 Python 复现片段（源文原样）：

```python
k = 1024                    # 源文注释：「RSA 的密钥长度为 1024 位」
em_len = k // 4             # ⚠️ 这里把「位」当成了「十六进制字符数」
h_len  = 20                 # SHA-1 摘要 20 字节
t_len  = 3
s_len  = em_len - h_len - t_len - 1
signature_value = pkcs1_15.new(key).sign(hash_value)[:s_len]
```

**本库复算（本批新增，源文未察觉）**：

| 量 | 源文算法 | 正解 | 实测对照 |
| --- | --- | --- | --- |
| 1024 位 RSA 的模长 | — | `1024/8` = **128 字节** | 源文 hooks 出的 `sign` Base64 解出 = **128 字节** ✓ |
| `em_len` | `k//4` = **256** | 256 **字节** 只对应 **2048 位** | ✗ |
| `s_len` | `256-20-3-1` = **232** | 若真要截断应为 `128-20-3-1` = **104** | ✗ |
| 输出长度 | 232 字节 ⇒ Base64 **312** 字符 | Base64 **312** 字符 | 实测 Base64 长度 = **172** 字符 ✗ |

> ★★★ **判据：`k` 的单位是「位」时，第一步动作是 `/8` 得到字节；`PKCS#1 v1.5` 的
> `s_len = k/8 - h_len - t_len - 1`，`h_len` 由摘要算法决定（SHA-1 = 20、SHA-256 = 32）。**
> ⇒ **机械自检**：`len(base64.b64decode(sign))` 必须等于 `k/8`。
> 源文那份代码**靠 `[:s_len]` 截断「掩盖」了单位错误**才跑出与抓包一致的结果，
> 属于「**结果对、算式错**」——照抄到别的密钥长度上必然翻车
> （⚠️ 同时说明：**`[:s_len]` 这种「截断以对齐」的写法必须警惕**，
> 它会让长度断言**恒真**，是典型「**恒亮的检查等于没有检查**」，见记忆规则）。
> 源文对外表现是「计算得到的 `sign` 和抓包得到的 `sign` 一致」——
> **成功的复现不代表公式正确，只代表端点对齐**。

### §3.7 ★ `SHA1WithRSA` 在 Python 侧的三条对应

| Java | Python（`pycryptodome`） | 坑 |
| --- | --- | --- |
| `Signature.getInstance("SHA1WithRSA")` | `Crypto.Signature.pkcs1_15.new(key).sign(SHA.new(content))` | **`pkcs1_15` ≠ `PKCS1_v1_5`**（前者是新版模块名，后者是 `Crypto.Signature.PKCS1_v1_5` 旧名，同一算法） |
| `KeyFactory.getInstance("RSA").generatePrivate(PKCS8EncodedKeySpec)` | `RSA.import_key(pkcs8_bytes)` | ⚠️ 源文 `1724211` 的 `private_key` 直接写 `RSA.importKey(private_key)`（**无 base64 解码**），而 `1803699` 的写 `RSA.import_key(base64.b64decode(private_key))` ⇒ **两者不可能都对，取决于排包时拿到的是 PEM 还是 DER** |
| `signature.sign()` 返回 `byte[]` | `signer.sign(hash)` | **Java 默认 PKCS#1 v1.5**（不是 PSS） |

> ★ **判据**：`import_key` 报 `RSA key format is not supported` ⇒ **先试 `base64.b64decode` 一次，
> 再试直接喂**。这两条路覆盖 99% 的排包结果。

### §3.8 ★★ 客户端 App 签名的三种落地模式（三源同型，可直接套）

**来源** `52pojie-1238131`（快手 `sig`）、`52pojie-1724211`（免费小说）、
`52pojie-1803699`（无壳 App）。三篇的算法细节不同，但**落地面是同三种**：

| 模式 | 形态 | 源文实例 |
| --- | --- | --- |
| **模式 A · 稳态裸算** | 盐与密钥全在客户端 ⇒ **纯 Python 可复现** | `1238131`：`MD5(拼接串 + FANS_SALT)`，`FANS_SALT = "382700b563f4"` |
| **模式 B · 挑战-应答** | 先请求接口拿 `publickey_mod/exp`（或 `token`），再算密文 ⇒ **两段式** | `1463849`：`getrsakey` 拿 `mod/exp` → `RSA.encrypt(密码, getPublicKey(mod, exp))` |
| **模式 C · 硬编码私钥签名** | 私钥写在客户端/常量段 ⇒ **能复现，但等于拿到了一把可伪造的钥匙** | `1724211` / `1803699`：`SHA1WithRSA` |

#### ★★ 模式 A 的定位轨迹：「先全体搜 → 再按引号收窄」

源文 `1238131` 的逐字记录：

```text
在 jadx 中搜索 sig        → 结果非常多
→ 换个思路：sig 很大可能是「"sig"」这样带引号的存在格式
→ 搜 "sig"（带引号）      → 只剩 5 条：2 条跟 view 相关、3 条跟 push 服务相关
→ 都不是 ⇒ 只剩第一条和最后一条 → 逐个进去看
```

> ★★★ **判据（零成本，优先做）：`jadx` 全局搜参数名命中过多时，改成搜「带引号的形式」。**
> 原因：业务代码里 `sign` / `sig` 会作为**子串**出现在无数标识符中
> （`assign`、`design`、`signal`…），而**作为字符串字面量出现的才是参数名**。
> 与 §3.1「搜接口名而不是搜 `encrypt`」是同一条原则的**两种收窄手段**：
> 先「搜唯一的东西」，若目标本身不唯一则「**加约束把它变唯一**」。
> ★ 收窄后仍需**按语义排除**（源文对 5 条里的 4 条做的是「跟 view 相关」「跟 push 相关」的语义剔除），
> 不是「留一条就是它」。

#### ★★ 拼接串里必须显式带分隔符

源文 `1238131` 的 `genSigSignature` 逐字：

```java
SortedMap<String,String> sortedMap = new TreeMap<>(params);   // 1. 字典升序
for (String key : keySet) {
    if (key.equals("sig") || key.equals("__NStokensig")) continue;   // ⚠️ 自指参数必须排除
    sb.append(key + "=" + URLDecoder.decode(value, "UTF-8"));        // 2. 逐对拼 key=value
}
String uriString = sb.toString() + salt;                     // 3. 追加固定盐
sign = md5(uriString);
return sign.toLowerCase();                                   // 4. 统一小写
```

> ★★ **判据：`key=value` 之间「不加 `&`」时，是**逐对直接连写**（`a=1b=2c=3`），
> 不是「漏了 `&`」**。这与 `1724211` 的 `getSortedParamStr`（`&` 连接）**是两种不同形态**，
> 症状是**签名字符串对不上但两边都「看着合理」**。
> ⇒ **必须去源文的示例串里数一遍分隔符**，不要按习惯默认加 `&`。
> ★ **配套三条**：① **`sig` 自身与 `__NStokensig` 必须从签名串里排除**（自指参数）；
> ② ⚠️ **`URLDecoder.decode(value, "UTF-8")` 是「先解码再参与签名」** ——
> 值里带 `%XX` 时，Python 侧要补 `unquote`，漏掉的症状是「签名不对但看不出哪里不对」；
> ③ **最后统一 `toLowerCase()`** ⇒ 拼串时的大小写**不影响结果**，不要为了大小写反复调参。

#### 模式 B 的固定两跳

源文 `1463849` 的链路是「**先拿公钥、再加密**」：

```text
POST getrsakey {donotcache: 毫秒时间戳, username}  →  {publickey_mod, publickey_exp}
→ RSA.getPublicKey(modulus_hex, exponent_hex)      // 两个参数都是 hex 字符串
→ RSA.encrypt(password, pubKey)
```

> ★ **判据**：接口名里带 `rsakey` / `getpubkey` / `challenge` 的，**几乎必然是挑战-应答**，
> **不要去找「密码怎么加密的」**——密码的密文本来就是一次性的。

#### ★★★ 模式 B 的 JS 实现只有一句：`Base64.encode(Hex.decode($data))`

源文 `1463849` 抄下来的 `rsa.js` 里，最"唬人"的一行是：

```js
$data = $data.toString(16);                                  // BigInteger → hex 字符串
if (($data.length & 1) == 1) $data = "0" + $data;            // 奇数长度前置补 0
return Base64.encode(Hex.decode($data));                     // hex 解码 → Base64
```

**本库复算（本批新增）**：对 1 / 8 / 16 / 17 / 32 / 64 / 128 字节的随机输入逐一验证，
`Base64.encode(Hex.decode(toString(16)))` **恒等于 `base64.b64encode(raw)`**。

> ★★★ **判据（直接删掉两行转换）：`Base64.encode(Hex.decode(X.toString(16)))` ≡ `Base64(X)`。**
> ⇒ Python 侧**不需要**写 `n.to_bytes()` → `hex()` → `bytes.fromhex()` → `b64encode()` 这一串，
> 直接 `base64.b64encode(pow(m, e, n).to_bytes(k//8, 'big'))`。
> ⚠️ **唯一的陷阱是「奇数长度补 0」**：`toString(16)` 丢掉前导零 ⇒
> **Python 侧必须用定长 `k/8` 字节（`'big'`）而不是 `minimal` 长度**，
> 否则密文会短一截、长度校验失败。这正好是 §3.6「长度必须按 `k/8` 现算」的第二个实例。
> ★ 配套：`pkcs1pad2` 的 `keysize = (modulus.bitLength() + 7) >> 3`
> —— **`+7 >> 3` 就是「向上取整到字节」，1024 位 → 128 字节**（同 §3.6 的 `/8`）。

#### ★ 模式 B 的「缺什么补什么」顺序（源文原样）

源文 `1463849` 复现时的三次报错与处置，顺序值得照抄：

```text
① 提示 BigInteger 未定义  → 搜到该函数有 100+ 处调用 ⇒ 「一个扣到啥时候」⇒ 直接全文件复制
② 提示 navigator 未定义   → 「navigator 为 js 内置函数 → 直接定义为 navigator = this;」
③ 普通未定义参数          → 「定义为空字典，例如 i = {}」
```

> ★ **判据**：**报错驱动补全，且按「内置对象 → 空对象 → 扣代码」的三级成本递增顺序试**。
> 与 `15-call-site-locating-playbook.md` §6.1 是同一纪律。
> ⚠️ 源文的 `navigator = this` 是**图省事的写法**，现代站点会检测 `navigator.userAgent`
> 等属性 ⇒ 只适用于**不依赖指纹**的老站点（本条的 `rsa.js` 恰好不依赖）；
> 需要指纹回放的走 `../../web-js-env-patcher/`。

---

### §3.9 ★★★ 负结论：先证明服务端根本不要签名，再决定要不要还原

**来源** `52pojie-2125273`（某米主题商店接口逆向，包名 `com.xxx.thememanager`，系统预装应用；
无加固但**代码大量混淆，类名只剩 `a/b/c` 这种单字母**；工具 Jadx 反编译 + Smali 阅读）。

> ★ **与 §3.8 的边界（先读这一句）**：§3.8 处理的是**已经确认有签名**之后的事（三种落地模式怎么还原）；
> 本节处理的是**还没确认有没有签名**之前的事（怎么尽早证明没有签名层）。
> **执行顺序：先跑本节。只有确认有签名，才进 §3.8。**（判无 ⇒ 直接结束，后面只剩照抄参数 + 拼 URL 的工程活。）

**(1) ★★★ 前置判据（本节最重要）：裸请求 → 逐步删参数 → 看报错是「缺参数」还是「签名错误」**

源文实测的失败形态：**裸请求一个参数都不带**，直接上 `/thm/download/v2/{id}?category=FONT`，
「服务端是**不认的**，要么返回空，要么直接报『**下载链接获取失败**』」；
作者「一开始……以为链接不对」，「后来对着抓包原样把参数补全才通」。

可执行动作（按顺序做，成本极低）：

```text
① 裸请求：只带最少参数（源文：/thm/download/v2/{资源ID}?category=FONT）
   · 返回空 / 报「下载链接获取失败」 ⇒ 服务端确实在挑参数，但**还不能**说是签名
② 逐个删参数：从抓包原样里一次删一个，看报错措辞
   · 「缺少 xxx」/「xxx 不能为空」        ⇒ **存在性校验**（少一个字段就不干活）
   · 「签名错误」/「验签失败」/「非法请求」⇒ 才可能是**签名校验**
   （⚠️ 上面两组措辞是**通用形态**，用于分诊；源文只实测到①那种失败形态）
③ 判定：若删任一参数都只报「缺少 xxx」，且**没有参数进入计算**
        （把它换成**任何常量**也照样通过）⇒ 风控层塌缩成「**照抄抓包参数**」，本节结束
```

> ★★★ **判据：报错形态是「缺参数」而不是「签名错误」⇒ 立刻把「还原算法」从预算里删掉。**
> 源文原话：「这些参数都只是『设备画像』，服务端校验的是**存在性和格式，不是严格签名**——
> 这也是为什么能脱离 App 用脚本模拟请求。」
> ⇒ ★ **本节的负结论**：**这一整题没有算法可还原**；工作量从「逆向 + 复现签名」降级成
> 「**缺哪个字段就补哪个字段**」。

**(2) ★★ 判据：怎么区分「设备画像参数」与「签名参数」**

| 特征 | 设备画像参数（不用算） | 签名参数（要还原） |
| --- | --- | --- |
| 能否逐个换成常量 | **能**（字段都在 ⇒ 全换成同一常量仍通过） | **不能**（改值即报签名错） |
| 是否含时间戳 / 随机数 | **不含** | 通常含，且每次都变 |
| 多次请求之间的取值 | **完全不变** | 每次都不同 |
| 处置 | **原样照抄抓包** | 进 §2 / §3 / §3.8 |

源文实测的那一串即典型画像参数（源文只「随便列几个」且以 `……` 省略 ⇒ **完整字段集未给全**）：

```text
device、region、isGlobal、system、version、miuiUIVersion、language、
capability、apk、devicePixel、hwVersion、deviceType、model、networkType……
```

> ★★ **三合一判据**：**「逐个换成常量不影响通过」+「不含时间戳/随机数」+「多次请求值不变」
> 三条同时成立 ⇒ 判为画像参数，照抄即可。**
> 反之，**删掉就报签名错、或改了值就报签名错**的那个参数，才是签名参数。

**(3) ★ `capability` 这类「能力串」：先怀疑是本地拼的能力集，别去反推哈希**

源文实测 `capability` 形如 `w,b,s,m,h5,a:2,v:7`，源文原话：「也是**本地拼出来的，不是哈希**，
就直接字符串拼凑。」

> ★ **形态判据**：**形如 `a,b,c:1,d:2`（顶层按 `,` 分隔、部分项是 `key:value`、值为小整数）的串，
> 先怀疑是「本地能力集 / 特性开关」，不要一上来当密文反推哈希或编码。**
> 识别动作：`split(",")` 后逐项看是否「短标识符」或「短标识符 + `:` + 小整数」——
> 是 ⇒ 本地能力集；不是（定长、字符集 `[0-9a-f]` 或 base64）⇒ 才按 §3.4 处理编码层。
> ⚠️ 源文**未给出各段含义与生成规则**（`w`/`b`/`s`/`m`/`h5`/`a`/`v` 各代表什么）⇒ **登记为源文缺口，不代填。**

**(4) ★★ 「同一站、不同分类」入口被限 ⇒ 先横向换分类，再纵向换参数（tag 旁路）**

源文实测：

- `/uipages/search/{TYPE}/index`，`TYPE ∈ {THEME, WALLPAPER, FONT, RINGTONE}`；
- **主题**带上全参数「能正常返回几十条」，**字体**「每次都是空」，「反复换参数、换设备 ID 都没用」；
- 旁路：`/uipages/search/tag?type=FONT&tag=行书&cardStart=0&cardCount=30` —— 「tag 接口对字体是敞开的」。

> ★★ **通用化判据**：**同一站点对「不同分类」可能有不同的准入策略**（实测字体被限、主题正常）。
> ⇒ **搜索接口返回恒空时，先「横向换分类」（换 `TYPE`）试一次，再「纵向换参数」**
> —— 否则会「一直在参数上打转」（源文原话：「不是你的请求写错了，是服务端对字体这个分类单独做了限制」）。
> ★ **`tag` / `keyword` / `category` 这类「语义更宽」的通道，常常是敞开的**（精确匹配被限时，放宽到标签/关键词）。

**把 fallback 写成代码，而不是靠人肉重试**（源文原话：「最后是做了个 **fallback**：先试 index 精确搜索，空了自动切到 tag 标签搜索」）：

```python
# 伪代码（结构照源文描述，非源文原文代码）
def search_uuids(type_, kw):
    items = index_search(type_, kw)      # ① 先走精确：/uipages/search/{TYPE}/index
    if not items:                        # ② 为空才降级，别一开始就用宽通道
        items = tag_search(type_, kw)    #    /uipages/search/tag?type={TYPE}&tag={kw}
    return items                         # 拿到的 uuid 再喂给详情 / 下载接口
```

> ★ **判据**：**先精确、后宽泛，且「降级」必须是代码里的自动分支。**
> ⚠️ **单样本**：源文只给一组分类实测（字体被限、主题正常）⇒ **「哪些分类会被限」源文只给一组，未复核**，换站需重测。

**(5) ★ 「详情接口自带直链」的优先序：详情接口 > 专门的下载接口**

源文实测：`GET /api/v9/products/{uuid}` **直接返回完整直链**（`downloadUrlRoot + downloadUrl` 一拼即可），
预览图 = `downloadUrlRoot + snapshotsUrl[i]` ⇒ 「连 `download/v2` 那步都省了」。
源文原话：「**能白嫖详情接口就别调 download/v2**」。

> ★ **排查顺序（少一步请求 = 少一个签名点）**：**先找 `/products/{id}` 这类详情接口；拿不到才退到专门的下载接口。**
> ★ 同理：**列表 / 详情已经返回的字段，不要再为了它多发一次请求。**

**(6) ★ 定位法（可迁移）：全局搜「接口路径字符串」⇒ 命中常量 ⇒ 反查调用关系 ⇒ 落到 Manager 类**

源文的定位轨迹：

```text
Jadx 全局搜字符串 "download/v2" → 命中一个常量
→ 反查调用关系（xref）→ 落到 ResourceDownloadManager（混淆后 com.xxx.t）
```

> ★ **判据：接口路径（`download/v2`、`/api/v9/products/`）比参数名更适合当搜索词** ——
> 它带 `/`，在代码里几乎只以**字符串常量**出现，一次命中。
> ★ 这与本文件 **§3.8 的模式 A 定位轨迹（先全体搜 → 再按引号收窄）是同一族**
> （都是给搜索词加约束让它变唯一：那里加引号，这里换成带 `/` 的路径）⇒ **同族判据见 §3.8，此处不重复。**
> ⚠️ 落到 `Manager` 类后类名已被混淆成 `com.xxx.t`（**源文混淆 / 脱敏形态，保留原样**）。
> 源文对这段逻辑只给了「**简化一下**」的改写（**非原文代码，不可当源码解析**）：

```text
// ⚠️ 源文简化改写（原文是混淆后的 Smali / 反编译结果）
// t.s() 返回最终下载 URL
String url = resource.getOnlinePath();   // 一般没有
if (url == null) {
    // 走 online/s.a9(onlineId) 拼出 /thm/download/v2/{id}
    RequestUrl req = new OnlineService(ctx).a9(onlineId, info);
    url = req.getFinalGetUrl();
}
```

⇒ 源文结论：下载 URL = **固定模板 `download/v2/{id}` + 一堆参数**；`uuid`（资源 ID）来自前面的详情请求或搜索列表。

**(7) 源文的接口链（原样登记，含源文脱敏形态）**

```text
1. 搜索：/uipages/search/{TYPE}/index（精确）；失败则 /uipages/search/tag?type={TYPE}&tag={词}
2. 详情：/api/v9/products/{uuid}（自带 downloadUrlRoot + downloadUrl 直链、描述、预览图）
3. 下载直链：/thm/download/v2/{uuid}?category={TYPE}&device=... → 返回 downloadUrl
```

- 下载请求形如 `GET /thm/download/v2/{资源ID}?category=FONT&device=xxx&region=CN&...`（源文原文）。
  ★ **`{资源ID}` 与 `uuid` 是源文对同一对象的两个叫法**（源文自己混用：§四写 `{资源ID}`、§七写 `{uuid}`）⇒ **两个叫法都保留**。
- 下载接口返回（源文原文；域名与 `<hash>` 为源文脱敏）：

```json
{
  "apiCode": 0,
  "apiData": {
    "downloadUrl": "https://xxx.market.xxx.com/issue/ThemeMarket/<hash>/资源名.mtz",
    "fileHash": "...",
    "fileSize": 12345678
  }
}
```

- 详情接口返回（源文原文，字段名原样）：

```json
{
  "name": "××字体",
  "downloadUrlRoot": "https://xxx.market.xxx.com/download/",
  "downloadUrl": "ThemeMarket/<hash>",
  "snapshotsUrl": ["ThemeMarket/...", "..."],
  "description": "...",
  "score": 5.0,
  "downloads": 123456
}
```

> ⚠️ **登记（源文自相矛盾处，不抹平）**：两个接口的**同名字段 `downloadUrl` 形态不同** ——
> 下载接口给的是**完整 URL**（`https://xxx.market.xxx.com/issue/ThemeMarket/<hash>/资源名.mtz`），
> 详情接口给的是**相对路径**（`ThemeMarket/<hash>`，需拼 `downloadUrlRoot`）。
> ⇒ **判据：拿到 `downloadUrl` 先看是否以 `http` 开头**；不是就先拼 `downloadUrlRoot`。**源文未解释此差异。**
- 源文另一条事实：`.mtz` **本质是 zip**（里面装字体 `ttf`）。

**(8) 边界与登记**

- **与 §3.8 的边界**（重申）：§3.8 管的是**有签名时怎么还原**；本节管的是**先判有没有签名**。
- ⚠️ **源文用词混用（登记，不抹平）**：环境表把「**无加固**（代码大量混淆，类名就剩 `a/b/c` 这种单字母）」写在**同一行**
  ⇒ **混淆 ≠ 加固**，源文把两者混用。
- ⚠️ **抓包工具**：源文写「**手机小蓝鸟**抓取 HTTPS 流量」（**工具昵称，原样保留**）。
- ⚠️ **源文「印象深的坑」第 4 条**是「**自己玩可以，别拿去卖**」（原话：「接口是别人家的服务，批量爬或倒卖容易把口子堵死」）
  ⇒ 本库按研究口径登记，**不提供批量脚本**。

---

## §4 APK 内资源包 / 随包下发的数据文件

### §4.1 ★★ zip 解压口令 = `MD5(资源文件名 + 固定盐)`

**来源** `52pojie-1492740`（某题库 App）。源文的链路：

```text
选学科 → App 下载一个 zip（里面有 json，就是习题数据）→ 解压要密码
→ jadx 反编译 → 发现 apk 里自带两个 zip（测试用）⇒ 代码里必有密码生成痕迹
→ 按 zip 名在代码里搜 → 找到变量 → 搜调用方 → 找到方法
→ MD5Util.m16624a() 就是解压密码 → 点进去：把参数转成 md5 32 位小写
→ 再看参数的构造
```

`frida` 侧源文没有复现算法，而是**直接调用 App 自己的方法**：

```text
Java.perform(function () {
     var currentApplication = Java.use("android.app.ActivityThread").currentApplication();
     var dir = currentApplication.getApplicationContext().getFilesDir().getPath() + '/<uuid>.zip';
     var substring = dir.substring(dir.lastIndexOf("/") + 1);
     var md5_data = substring.replace(".zip", ".json") + "zsalt";
     var md5_util = Java.use('com.xxx.xxx.util.r');
     send(md5_util.a(md5_data));
});
```

> ★★★ **两条可迁移判据**：
> 1. **「apk 里自带测试样本」= 代码里留着密码生成痕迹** ——
>    源文的定位动作就是「**按自带 zip 的名字去搜代码**」。
>    ⇒ **拿到加密资源包时，第一步是去 apk 里找同名的测试文件，用它的名字当搜索词。**
> 2. **能调用就不要还原**：`frida` 里 `Java.use('<类>').<方法>(入参)` 一行拿到口令，
>    比读 `MD5Util` 快一个数量级。这与页面侧的「浏览器 RPC」是同一思想
>    （`14-browser-rpc-bridge.md`）。
>    ⚠️ 但**最终交付**仍要落到「能离线复算」的形式（源文也只是用 hook 来**确认**，
>    之后自己拼了 `文件名换后缀 + "zsalt"` 的 MD5）。

**口令构造（源文原样）**：`MD5( zip文件名.replace(".zip", ".json") + "zsalt" )`，
即 **32 位小写 hex**；盐是固定的 `zsalt`。

> ⚠️ 登记：`zsalt` 是源文站点的固定盐，**不是通用规律**；`com.xxx.xxx.util.r`
> 是 `jadx` 反混淆后的**重命名类**（`r` 是原混淆名），换个包就不同。

### §4.2 ★★ 「接口给的数据是错的」时，先怀疑随包下发的样本

源文自曝的两个坑（原话「城市套路深，我要回农村」）：

1. **解析 json 后与 App 数据对比，发现有 20% 的数据是错误的**，
   抓请求也拿不到正确的数据 —— 后来**用两个 json 里的 `id` 做关联**，
   发现**正确的数据就在 App 自带的那个 zip 里**；
2. **自带 zip 里 json 的 key 是会变动的**（上一条数据的 key 是 `key1`，下一条就变成 `keyN`）。

> ★★ **判据**：**接口返回的数据里有一部分对不上，且「对的那些」恰好能在另一个来源里找到**
> ⇒ 不要只盯着接口。**用主键（这里是 `id`）做两份数据的关联 diff**，把「接口缺/错」的部分补齐。
> ★ **第二条判据**：**字段名会变动时，禁止按固定 key 取值**，
> 要按「位置 / 结构」取值（源文这里表现为 `key1..keyN` 的序列）。
> 症状是「大部分解析成功、个别字段静默为 `None`」——**不报错**。

> ⚠️ 边界：源文的「20%」是**单站单次实测**，不是普遍比例；**不得**当成任何站点的先验。

---

## §5 通用排错表

| 症状 | 真因 | 处置 |
| --- | --- | --- |
| 页面全局搜参数名**搜不到** | 参数不在页面里 | 回 §0 判据，走客户端路线 |
| `ida` 认不出目标函数 | 那段代码是**运行时解密**出来的 | 在**调用点**下断点跟进去，进去后 `p` 成代码再 `F5` |
| 同一参数两次结果不同 | 可能是**内存地址派生**（§2.3），也可能是时间戳 | 先看差异是否随进程变化；再看是否有 `malloc` 参与 |
| 版本号驱动多分支算法 | `sv` 类选择器（§2.1） | **写死随机数**，只跟一个分支 |
| 密文长度比明文长且非块对齐整数倍 | 尾部可能**插了密钥**（§2.2 ④） | 先量长度差，再找插入规则 |
| 解出来「不报错但乱码」 | 编码层错（hex vs base64） | 见 `16-ciphertext-structure-diagnostics.md` |
| 解压包要密码 | 口令由**文件名派生**（§4.1） | 搜自带同名样本 → 定位生成函数 |
| 接口数据「有一小部分对不上」 | 另有权威来源（§4.2） | 用主键做两份数据的关联 diff |
| `ida` 搜不到目标函数名 | **动态注册**（§2.5） | 去 `JNI_OnLoad` 找 `RegisterNatives`，别判「不存在」 |
| `ida` 里 `JNI` 调用全是「指针 + 偏移」 | `JNIEnv*`/`JavaVM*` 类型没设（§2.5） | 用 `GetEnv`/`JNI_OnLoad` 的 xref 定类型，**不要凭名字猜** |
| `RegisterNatives` 的 `methods` 全是空数据 | 数组被加密（§2.5） | 找 `RegisterNatives` 之前的那次解密调用 |
| 同一 so 反编译质量差、函数指针对不上 | **ABI 选错**（§2.5） | 换 `armeabi-v7a` / `x86` 再试，别硬啃 |
| `JNI` 里出现 `FindClass`+`GetMethodID`+`Call*Method*` | **算法在 Java 层**（§3.5） | 停止读汇编，回 `jadx` 搜那个类名 |
| RSA 签名长度与抓包对不上 | `k` 的**单位**写错（§3.6） | `len(b64decode(sign))` 必须 `== k/8` |
| `RSA.import_key` 报格式不支持 | PEM / DER 混淆（§3.7） | 先试 `b64decode` 再试直喂 |
| 逐删参数只报「缺少 xxx」、**不报签名错** | 服务端只有**存在性校验**（§3.9(1)） | **负结论：无算法可还原**，照抄抓包参数即可 |
| 某参数的**值多次请求完全不变** | 「设备画像参数」，**不是签名**（§3.9(2)） | 照抄；只把「含时间戳/每次变」的当签名参数 |
| 搜索接口**恒空**但同参数搜别的分类正常 | 服务端对**该分类**单独限流（§3.9(4)） | **先横向换分类**，再走 `tag` / `keyword` 宽通道（代码级 fallback） |

---

## §6 源文缺陷与登记纪律（本批新收）

| # | 源文 | 缺陷 / 未展开 | 本库处置 |
| --- | --- | --- | --- |
| 1 | `52pojie-1355674` | 纯截图帖，`sub_126AC`/`unk_D02565AC` 的内部算法**未给出** | 只立「`sv` 分支要固定」判据，**不推断算法** |
| 2 | `52pojie-1610506` | 只有原理叙述，**源码在附件**；「26 字节」与公开实现不同代 | 只登记结构与「地址派生」判据，蓝图 `status: partial` |
| 3 | `52pojie-729954` | 把 **key** 写成「密文」（「AES 加密所需要的密文跟偏移」） | 已在本文件 §3.3 显式指出，不改写源文原话 |
| 4 | `52pojie-1492740` | 「20% 数据错误」是单站单次实测 | 只作判据、不作先验 |
| 5 | `52pojie-2005163` | 列移位（`column_rotation`）的**精确规则**源文只给了前后值、未给公式 | 本文件给前后值样本，**不代写公式** |
| 6 | `52pojie-1803699` | ★ **`em_len = k//4` 单位错**（把 bit 当 hex 字符数）；靠 `[:s_len]` 截断掩盖 | 已在本文件 §3.6 复算并给出「长度 = `k/8`」判据，**不照抄源文算式** |
| 7 | `52pojie-1724211` | ① 私钥 `RSA.importKey(private_key)` 未 `b64decode`，与 `1803699` 的写法**互相矛盾**；② `private_key = b""` 是占位空值（正文里未给真值） | 已在本文件 §3.7 立「两种写法二选一」判据；**不代填密钥** |
| 8 | `52pojie-1238131` | `SHA512/SHA` 两个方法**定义了但 `sig` 根本没用**（`genSigSignature` 用的是 `md5`）⇒ 死代码；`getMapFromStr` 在 `key` 无 `=` 时 `itemArr[1]` 越界 | 只登记 `sig` 的真实链路（§3.8 模式），**不把 SHA512 写进判据** |
| 9 | `52pojie-2125273` | ① 抓包工具写「**手机小蓝鸟**」（工具昵称，**原样保留**）；② 环境表把「**无加固**」与「代码大量混淆」写在**同一行**（**混淆 ≠ 加固**，用词混用）；③ 两接口**同名字段 `downloadUrl` 形态不一致**（下载接口给完整 URL、详情接口给相对路径），源文未解释；④ 设备参数以 `……` 省略 ⇒ **完整字段集未给全**；⑤ `capability` 各段含义 / 生成规则未给 | §3.9 只登记上述形态与判据；`downloadUrl` 差异**登记不抹平**；**不代填** `capability` 语义 |

---

## §7 边界与分工

- **wasm** → `../../wsam-reverse/SKILL.md`（不要在这里重复）。
- **Electron / asar / `.jsc` / nw.js / 浏览器扩展** → `../../desktop-client-reverse/SKILL.md`。
- **小程序 / 小游戏** → `../../miniprogram-reverse/SKILL.md`。
- **平台级签名蓝图**（抖音 `a_bogus`、京东 `h5st`、得物 `newSign`…）→
  `../../reverse-knowledge/`，本文件只给**载体层面的判据**。
- **页面内算法题**（含 uglify / 字符串加密）→ `15-call-site-locating-playbook.md` 与
  `../../ast-deobfuscation/`。

---

## §8 来源表

| 源文 | 落点 |
| --- | --- |
| `docs/references/52pojie-1355674-实战某东so层算法sign分析.md` | §2.1 |
| `docs/references/52pojie-2005163-某程 encode 算法分析.md` | §2.2 |
| `docs/references/52pojie-1610506-海外某音x-gorgon算法原理分析及算法源码公布.md` | §2.3、蓝图 `tiktok-x-gorgon` |
| `docs/references/52pojie-729954-某App 接口数据 AES算法 实现.md` | §3.1–§3.4 |
| `docs/references/52pojie-1492740-记录一次有趣的某题库逆向破解.md` | §4.1、§4.2 |
| `docs/references/52pojie-1238131-快手7.5版本sig参数逆向分析.md` | §2.5（导出符号 / `j_` 三件套 / RVA+基址）、§3.8（模式 A、带引号收窄、无分隔符拼接） |
| `docs/references/52pojie-1724211-某免费小说APP sign参数逆向分析与实现.md` | §2.5（**动态注册** / `JNIEnv*`×`JavaVM*` / 解密 `methods` / arm64↔arm32）、§3.5、§3.8（模式 C） |
| `docs/references/52pojie-1803699-小白入门，无壳app登录算法还原并实现发包（重发）.md` | §3.5（frida 双日志当规格）、§3.6（**`k` 单位错**）、§3.7、§3.8（模式 C） |
| `docs/references/52pojie-1463849-js逆向练手 starm ras 加密.md` | §3.8（模式 B、`Base64.encode(Hex.decode(x)) ≡ b64(x)`、补环境三级顺序） |
| `docs/references/52pojie-2125273-某米主题商店接口逆向分析.md` | §3.9（**负结论：先证「服务端不要签名」**、画像参数 vs 签名参数的判别、`capability` 能力串形态、分类级限流的 `tag` 旁路、详情接口 > 下载接口、搜接口路径定位） |
| `docs/references/52pojie-1708851`（既有） | `02-algorithm-families.md` §一「得物 `newSign`」 |
