# 02 · native 层动态追踪：静态/动态注册 · unidbg 工程化 · 出口倒推

> **定位**：把「一段 ARM 汇编」变成「一个可离线复现的算法」。本文件的顺序就是**动作顺序**：
> §1 找入口 → §2 把 unidbg 跑起来 → §3 从出口倒着走 → §4 分段 hook → §5 输出形状优先 →
> §6 工具是变量 → §7 调用约定与结构体。

---

## §1 进 so 的第一分钟：静态注册还是动态注册

| 现象 | 结论 | 第一个动作 |
| --- | --- | --- |
| Java 侧有 `public static native …` + `static { System.loadLibrary("x"); }` | 静态注册 | `ida` → `Exports` 搜 `Java_<包>_<类>_<方法>` |
| `Exports` 搜不到、`Functions` 也搜不到 | **动态注册**（**不是「函数不存在」**） | 去找 `JNI_OnLoad` |
| Java 侧连 `native` 声明都没有 | 不在 so 里 | 回 SKILL.md §1 判据 |

动态注册的契约：

```c
jint RegisterNatives(jclass clazz, const JNINativeMethod* methods, jint nMethods);
typedef struct { const char* name; const char* signature; void* fnPtr; } JNINativeMethod;
/* fnPtr ← 这才是你要找的实现地址 */
```

### §1.1 ★★★ 「从 `RegisterNatives` 反推入口」优于「在汇编里猜哪个函数像加密」

**来源** `52pojie-2122819`（`ttEncrypt`）。`libEncryptor.so` 的动态符号很少、能直接看到
`JNI_OnLoad`，但**看不到 `Java_com_..._ttEncrypt`**。往下看碰到一段**长度固定的 XOR 循环**：

```asm
mov     w11, #0x73
decode_loop:
ldrb    w13, [x10, x9]
eor     w13, w13, w11        ; 逐字节与 0x73 异或
strb    w13, [x12, x9]
add     x9, x9, #1
cmp     x9, #0x30            ; 0x30 = 48 字节
b.ne    decode_loop
```

解出来是类名 `com/bytedance/frameworks/encryptor/EncryptorUtil`，后面的注册表只有一条：

```text
name      = ttEncrypt
signature = ([BI)[B      ; [B byte[] · I int · [B byte[]  ← Java 与 native 的对应关系
```

> ★★★ **判据**：`JNI_OnLoad` 里出现「**定长 XOR 循环 → 结果交给类查找**」⇒ 那就是被加密的类名，
> **别急着下「符号被裁光了」的结论**（同族：`52pojie-1724211` 的 `JNINativeMethod`
> `name/signature/fnPtr` 静态全是 0，要先找「谁在 `RegisterNatives` 之前解密了它」）。

### §1.1b ★★ `JNI_OnLoad` 里出现 `VX+XXX` 假指针时的两步修复

**来源** `52pojie-1715751`（某 App `_sign`，`libblackBox.so`）。源文按 `Exports` 搜 `getInterfaceSign`
**搜不到** ⇒ 进 `JNI_OnLoad` 看注册表，`F5` 后伪代码里出现大量 `vX + XXX` 形式的**非法指针表达式**：

```text
① 鼠标点上去、按 `Y` 把该位置**重新定义为指针**（IDA 的 "Force 类型"）
② 回到 `JNINativeMethod` 表（`name / signature / fnPtr` 三列）⇒ fnPtr 指向的就是实现
③ 用 Java 侧的名字与**参数个数**对表：源文靠「`getInterfaceSign` 只有一个参数」
   在注册表里定到 `sub_49268`
```

> ★★ **搜入口的另一条线索：`toupper` / `tolower` 循环**。
> 源文顺 `sub_F39A8` 看到 `while (strlen(a3) > v4) { a3[v4] = toupper(a3[v4]); ++v4; }`
> 紧跟一个哈希调用 ⇒ **判据：输出是「32 位大写 hex」时，先找这个大小写转换循环**，
> 它通常就贴在哈希调用的前后（本库形态 6 / 形态 10 / 形态 21 都是这一族）。
> ★ 挂钩时注意 **arm32 要 `+1`**（Thumb）：源文的 `get_func_addr()` 里
> `if (Process.arch == 'arm') return func_addr.add(1)`。
> ★ **frida 特征被检测 ⇒ App 直接闪退**（源文实测）⇒ 换「去特征版 frida」；
> 与 `52pojie-2057659` 的 `libmsaoaidsec.so` 三方案（线程暂停 / 函数 patch / 去特征工具）互相印证。

### §1.2 定位入口的其它四条路（按成本排序）

| 手法 | 来源 | 备注 |
| --- | --- | --- |
| `jnitrace -l libxxx.so <包名> -i RegisterNatives` | `1572670` | 看动态注册；★ 实测在**别人 App** 上 `attach` 常**无输出**（原因未明，别死磕） |
| `frida_hook_libart` 的 `hook_art.js` hook **`NewStringUTF`** | `1332557` | ★★ **加「字符串长度 > 50」过滤**再打堆栈 ⇒ 定位 `libshield.so+0x93fa8`；`sub_939D8` 在 IDA 里按 **`X`** 找调用者 ⇒ Java `intercept`（`okhttp3/Interceptor`） |
| 搜 `System.loadLibrary` 找 so 名 | `1388335` | ★ 若 so 名被**索引化**（`StubApp.getString2("17534")`）⇒ hook `getString2` 还原 |
| 静态扫描 + 字符串直接搜 | `2031450` / `2047651` | ★ 抓包里字段名带**业务语义**（`c=applaunch`）⇒ 直接搜该字符串 |
| **hook `HashMap.put` 打堆栈** | `2074694`（手法 1） | ★★ 最通用的一招：`put` 是参数汇聚点，**打堆栈即得业务入口**。**变体**：只对**特定 key** 打（`if (a.equals("username")) showStacks()`）⇒ 直接定位登录函数（`2014961`） |
| **hook `System.loadLibrary`** | `1388335` | 同上（so 名被索引化时的兜底） |
| **hook `memcpy`** | `2073893` | ★★ 源文原话：「**是分析前的好习惯**」—— 后续配合 `emulator.traceWrite` 追溯来源 |

---

## §2 ★★★ unidbg 工程化四步

把 `unidbg` 跑起来有四个固定动作，缺一个就会得到「跑起来了但结果不对」：

### §2.1 第一步：先让**固定输入**产生**固定输出**

**来源** `52pojie-2107248`（X-Gorgon）、`2073103`（快对）、`2070898`（南银消金）。
原话：「补完环境正常输出固定七神之后（**除了美杜莎其他全固定**）」。

> ★★ **判据**：**如果同一份输入两次跑出不同结果，先解决随机源，不要开始分析算法。**
> 动作：hook / 固定随机数（见 §2.3）。

### §2.2 第二步：**主动调用**代替「在屏幕上点击」

```java
// unidbg 侧
public void call_target() {
    List<Object> list = new ArrayList<>(10);
    list.add(vm.getJNIEnv());
    list.add(0);
    list.add(vm.addLocalObject(vm.resolveClass("android/content/Context").newObject(null)));
    list.add(vm.addLocalObject(new StringObject(vm, "E0DA888804E90201780A9C0D17D0B050|0")));
    Number ret = module.callFunction(emulator, 0xd14 + 1, list.toArray()); // ★ +1 = Thumb
    System.out.println("result-->>" + vm.getObject(ret.intValue()));
}
```

```js
// frida 侧（同样思路）
Java.perform(function () {
  let C = Java.use("com.xxx.DefenseTower");
  console.log(C.epj1(str1, str2));      // 直接调，不点界面
});
```

> ★★ **收益**：`52pojie-2070898` 原话——「**不需要再去屏幕上点击会更加方便**」；
> 且**修 bug 时不用重走整个 UI 流程**。
> ★★ **副产品**：**主动调用本身就是一个对拍工具** —— `2073893` 用它验证「unidbg 结果 ≠ 抓包结果」
> 到底是「顺序错」还是「少了初始化」。

### §2.3 第三步：补环境 + 固定随机源

| 症状 | 处置 | 来源 |
| --- | --- | --- |
| `clock_gettime` 系统调用未实现 | 自行补（`unidbg` 已实现一部分，看它缺哪个 id）；★ 也可临时返回常量，**但要记得恢复** | `2073103` |
| `lrand48` / `srand48` 随机 | `hookZz.wrap(module.findSymbolByName("lrand48"))` → `postCall` 里 `ctx.setR0(1)` 固定 | `2073103` |
| Key/IV 动态生成 | **在生成点下断点，`mem_write` 一段假 key** 把它固定 | `1546549` |
| `srand(time(NULL))` + `rand()` | 见 §5.3（种子只有**秒级**精度，这是可利用的） | `2122819` |
| 需要 `JNIEnv` / `Context` 等等 | `AndroidResolver` + `AbstractJni` 补；★ **报错先怀疑 hook 时机，再怀疑环境** | `2073103` / `2073893` |

### §2.4 第四步：控**时机**（比环境更容易出错的一步）

| 手法 | 用途 | 来源 |
| --- | --- | --- |
| hook `android_dlopen_ext`，在目标 so 加载**之后**再挂 hook | 目标函数在 so 初始化期就被调用过 | `2070898` / `2073893` |
| hook `JNI_OnLoad` 之后再挂 | 要**足够早**（原话：「常规 hook 没输出就要考虑自己 hook 的时机是不是够早了」） | `2073103` |
| 清数据 / 重装 App，hook 全部函数**看调用顺序** | 判「谁先执行」 | `2073103` |
| **hook 首次启动**（结果被缓存时） | 见 §2.5 | `2070898` |

### §2.5 ★★★ 初始化依赖：三种「结果不对」的真因

App 端签名**几乎都有初始化依赖**，表现都是「算法看起来没错，但对不上」。三种实测形态：

| 形态 | 现象 | 处置 | 来源 |
| --- | --- | --- | --- |
| **顺序依赖** | `init` → `setToken` → `getSign`，只调最后一个是错的 | 按 hook 出来的顺序**逐级主动调用** | `2073103` |
| **必须初始化** | 不调 `initImp(context, str)` 结果就是不对 | 主动调用 `init`（`0x62688 + 2`），`str` 是设备相关固定串 | `2073893` |
| **结果被缓存** | RSA hook **根本不触发** | 伪代码里 `data_xxxx` 保存启动后结果，用 **flag 决定「重新生成」还是「直接取」** ⇒ **必须 hook 首次启动** | `2070898` |

---

## §3 ★★★ 出口倒推法：从「写出去的那一个字节」往回走

**来源** `52pojie-2107248`（X-Gorgon）、`2073893`（得到 App）、`2073103`（快对）。

### §3b ★★★ 更省的一条路：hook「解密函数的产物」，而不是还原算法

> **判据**：目标把**明文**在某个函数里**当作参数/缓冲区交付出去**（不是"算出来后加密发走"）
> ⇒ **不用还原任何算法，直接把那一刻的缓冲区 dump 下来**。
> 这条路的成本通常**低于**"解出格式/算法"，且**不会因为版本升级而失效**（见下面的 offset 坑）。

| 载体 | hook 点 | 拿到 | 来源 |
| --- | --- | --- | --- |
| **PC 微信小程序包** | `WeChatAppHost.dll!EncryptBufToFile`（`onEnter` 记 `args[0]` appId、`args[1]` 落盘路径、**`args[2]/args[3]` = 未加密缓冲**） | **未加密的 `.wxapkg`**（直接落盘即得源码包，不必还原 `V1MMWX` 算法） | `52pojie-1335742` |
| **AutoJS 加密脚本** | `com.stardust.autojs.script.StringScriptSource.$init` 的 **`(String,String)` 重载** | **解密后的 JS 源码**（第 2 个参数） | `52pojie-1189150` |

> ★★★ **三条纪律（本批踩出来的，全部与"时序/重载"有关）**：

```text
① 【必须精确匹配重载】Java 类常有多个同名构造函数（源文原话："看上去有 2 个构造函数…进行了重载"）
   ⇒ 写 `Cls.$init.overload("java.lang.String","java.lang.String").implementation = ...`
   只写 `Cls.$init.implementation` 会**命中错的那一个**（不报错，只是不触发）。

② 【解密只发生一次 ⇒ 必须 spawn 注入】源文原话：
   "原 APK 的解密函数只在程序刚开始启动的时候调用。如果 APK 启动之后再注入脚本，
    是获取不到解密的 StringScriptSource() 方法的"
   ⇒ 必须 `frida -U -l hook.js -f <pkg> --no-pause`（`-f` = spawn + `--no-pause`）
   **attach 模式在这类目标上 100% 空手而归**，且**不会报错**（表现为"hook 装了但没打印"）。

③ 【别写死偏移】PC 微信的 `EncryptBufToFile` 在 `WeChatAppHost.dll` 上，
   前人脚本用 `baseAddr.add(0x1800F)` —— **微信一升级就失效**。
   改成 `Module.findExportByName('WeChatAppHost.dll', 'EncryptBufToFile')`
   ⇒ **跨版本稳定**（源文原话："但升级又会失效，翻阅了 frida 的 api 发现个 findExportByName 函数"）。
```

> ★★ **可迁移判据**：**「有解密函数名可搜（且导出符号在）」优先于「有算法可还原」**；
> **「导出名可查」优先于「写死偏移」**；**「只调用一次的解密」必须 spawn**。
> ★ 找不到导出符号 / 是内部函数时，退回 §1（动态注册）与 §3（出口倒推）。

### §3.1 四步动作

```text
① 找到「数据真正写进最终缓冲区」的那次调用
     —— hook memcpy / memmove，打印 (dest, src, len)
② 拿 src 地址
③ emulator.traceWrite(src, src + len)
     —— 内存写监控：「谁在什么时候往什么地址写了什么」
④ 从写入日志反推「谁写了哪几个字节」→ 定位写指令 → IDA 跳过去
     —— 若还不是生成点，继续套娃（常态）
```

### §3.2 两条必备判据

> ★★★ **「逐字节不是一次性写入」是常态。**
> `52pojie-2107248` 实测 26 字节 X-Gorgon 的拆分：
> ```text
> 26 bytes = 前 4(0x84 0x04 0x40 0xCA) + 2(0x00 0x00) + 后 20(魔改 RC4 输出)
> 20 bytes = 前 8 + 后 12
>  前 8 = MD5(url)[0:4] + 请求头 x-ss-stub[0:4]
>  后 12 = 4(固定 0) + 4(初始化时 strdup 写进去的版本号) + 4(秒级时间戳)
> ```
> ⇒ **不要假设存在一个「一次算完 26 字节」的函数**。

> ★★ **`std::string` / 结构体返回值要读「第 3 个字段」。**
> - `52pojie-2073893`：打印出来 `0x31`（标志位）+ `0x28`（实际大小）+ 地址
>   ⇒ **`std::string` 布局，要读第 3 个字段指向的内存**；
> - `52pojie-2073103`：`DES` 返回结构体形如
>   `struct { DWORD size; DWORD size_copy; DWORD* data; }`
>   ⇒ **前两个字段是长度，第三个才是数据指针**。
>
> ⇒ **`hook` 到「返回值看着不像结果」时，先怀疑是结构体 / `std::string`，读第三个字段再试。**

### §3.3 逐字节溯源的两个省力技巧

| 技巧 | 说明 | 来源 |
| --- | --- | --- |
| **`hook memcpy` 是「分析前的好习惯」** | 一开始就挂上，后面所有「谁生成了这段字节」都能直接查 | `2073893` 原话 |
| **把海量 trace 日志丢给 AI** | `traceWrite` 常产生 1w+ 行；配合 `IDA Pro MCP` 让模型回答「这 26 字节分别在哪几个函数写入」 | `2107248`（原话：「人工看日志很慢所以直接丢给 ai」） |

> ★ **判据（`52pojie-2073893`）**：读内存日志要**从右往左、小端序、每 4 字节一组**，
> **别读多了**。

### §3.4 ★★ 跨 so 动态跳转：`BLR X?` 要读寄存器

`52pojie-2107248`：`libsscronet.so` 里的 `v73` 是**间接调用**（`BLR X23`），
静态看不出目标。做法：**hook 那条 `BLR` 指令**，`onEnter` 里读 `this.context.x23`
⇒ 得到真正的函数地址 ⇒ `Process.findModuleByAddress` 判它落在哪个 so
（实测落在 `libmetasec_ml.so!0x14DBF4`）。

> ★★ **判据**：hook 返回处（`MOV X21, X0` 这种）读 `x0` 就能拿到**最原始的返回值**。

---

## §4 ★★★ 分段 Hook 代替整函数硬读

**来源** `52pojie-2122819`。原话：「`ttEncrypt` 内部代码不算特别大，但直接从头翻 ARM64 仍然很费劲。
我最后采用的办法是**只 Hook 三类边界**。」

```text
① 随机字节生成函数
② SHA-512 函数
③ 分组加密封装
```

一次调用打印出来的是**主链骨架**（原样）：

```text
RANDOM   len=32
SHA512   len=32
SHA512   len=128
SHA512   len=3
CIPHER   key_len=16 plaintext_len=67 ciphertext_len=80
FINAL    len=118
```

> ★★★ **6 行日志把整个算法骨架暴露出来**，接下来只剩「确认每一次 SHA-512 的输入来源」。
> ⇒ **动作纪律：进一个陌生 native 函数，先列出「这条链上必须存在哪几类边界」，
> 给每一类各挂一个 hook，读骨架，再决定读哪段反汇编。**

★ 配套：不要只 hook **最终返回值**，而是**拆阶段**：

```text
输入规范化 → 记录构造 → 摘要或校验 → 块变换 → IV / nonce 生命周期 → 配置侧链 → 最终封装
```

### §4.1 ★★★ 目标用**标准库**时的现成锚点（openssl / CommonCrypto）

**来源** `52pojie-1542726`（京东到家 `signKeyV1`）。判据：**函数符号没被 strip**
（`hmac_sha256` / `HMAC_Init_ex` / `HMAC_Update` / `HMAC_CTX_init` 都在导出表里）
⇒ 不需要读反汇编，**按名字挂 hook 就能把 key 与消息都拿到**。

| 锚点 | 参数语义（实测） | 拿到什么 |
| --- | --- | --- |
| `hmac_sha256` | **一步式**封装 | 对照用（可与分步结果校验） |
| `HMAC_CTX_init` | `args[0]` = ctx | 确认进入这条链 |
| `HMAC_Init_ex` | ★★ **`args[1]` = key**（长度 `args[2]`）、`args[4]` = 摘要算法 | **HMAC 的 key**（本例 32 字节 ⇒ 印证 SHA-256 族） |
| `HMAC_Update` | ★★ **`args[1]` = 消息体**（长度 `args[2]`） | **参与签名的完整明文**（本例 = 请求参数） |

> ★★ **配套验证**：拿 hook 到的 key + 消息喂 CyberChef / Python `hmac`，
> 与 App 实际发出的密文**逐字节一致** ⇒ 收工。**这一步是 hook 路线的验收，不要跳。**
> ★ 与 §4「分段 hook」的关系：**§4 是自己重新划边界，§4.1 是直接用作者已经划好的边界**
> —— **先看符号表有没有现成的，再决定自己划**（成本从高到低）。

---

## §5 ★★★ 输出形状优先：不读算法也能砍掉 90% 的候选

**来源** `52pojie-2122819`、`2100363`。

### §5.1 打长度表

喂几组**小输入**（1 / 3 / 15 / 16 / 17 / 31 / 32 / 1024 字节），记录输出长度：

| 输入长度 | 输出长度 |
| --- | --- |
| 1 | 118 |
| 3 | 118 |
| 15 | 118 |
| 16 | 134 |
| 17 | 134 |
| 31 | 134 |
| 32 | 150 |
| 1024 | 1142 |

> ★★ **判据**：**输出长度每跨过 16 字节边界就增加 16** ⇒ 这很像**带 PKCS#7 填充的分组密码**。
> ★★ **但固定开销不等于一个 IV** ⇒ 继续做 §5.2。

### §5.2 并排对比多次输出，把「固定头」与「变化尾」切开

```text
74 63 05 10 00 00 | 32 bytes changing data | 16-byte-aligned tail
└──── 6 bytes ────┘ └──────── 32 ─────────┘ └──── ciphertext ────┘

cipher_len = output_len - 6 - 32
```

`abc`：`118 - 6 - 32 = 80` = **5 个 AES 分组**。
★ 此时**仍不能宣布是 AES-CBC**（16 字节对齐只说明「像分组密码」，模式/Key/IV/明文都还没证据）。

### §5.3 ★★★ 「连续输出相同」= 缓存 还是 随机数？—— 两个对照实验

**来源** `52pojie-2122819`。同一个输入连续调用三次结果完全一致。**做两组对照：**

| 实验 | 操作 | 观测 | 结论 |
| --- | --- | --- | --- |
| ① | **同一秒内**调用**不同**输入 | 32 字节区域**相同**，密文区域**不同** | **排除「整个结果被缓存」** —— 函数确实重新处理了输入，只是**复用了同一批随机材料** |
| ② | 固定输入，每次间隔 **1150 ms** | 32 字节区域**全部不同** | 随机材料与**时间**相关 |

实测归因：

```text
srand(time(NULL))            ; 种子只有秒级精度
repeat 32 times: output[i] = rand() & 0xff
```

> ★★★ **金句**：「真正让我警觉的不是 `rand()` 本身，而是它**每次调用都按当前秒重新播种**。」
> ⇒ **判据**：同一秒内结果相同、跨秒不同 ⇒ 不是缓存，是**秒级种子**。
> （若只在进程启动播种一次，同一秒内连续调用也**不一定**重复 —— 所以「每次调用都重新播种」才是可复现的坑。）

### §5.4 密文长度特征表（不读代码即可排除算法）

**来源** `52pojie-2100363`。

| 算法 | 字节长度规则 | Base64 长度常客 |
| --- | --- | --- |
| AES | **16 的倍数** | 24 / 44 / 64 / 88 |
| DES / 3DES | **8 的倍数** | 12 / 24 / 32 / 44 |
| RSA | **固定 = 密钥长度字节** | 128→172 / 256→344 / 512→684 |

> ★★★ **两条必背判据**：
> 1. **16 字节密文 AES 和 DES 都可能 ⇒ 不能只看 16 字节就判 AES**；
> 2. **同时满足 AES 和 DES 的条件时，优先判 AES**（现代接口约 95% 用 AES；DES 已淘汰）。
>
> ★ 机器化：`scripts/app_cipher_shape.py` 把这张表做成了可复跑的诊断器（`--selftest` 内置断言）。

---

## §6 ★★ 反汇编 / 反编译的「工具是变量」

**同一样本，换工具/换版本会直接改变结论。**本批实测四种：

| 变量 | 实测 | 来源 |
| --- | --- | --- |
| **IDA 版本** | `9.0` 与 `9.2` 反编译都不理想 ⇒ 换 **Binary Ninja** 得到清晰伪代码（★ BN 基址 `0x400000`：`bn 00446aa0` = `ida 46AA0`） | `2070898` |
| **IDA 版本（另一向）** | 换另一版 IDA 才看到**交叉引用**（`byte_A0DC` 的赋值点） | `2073103` |
| **jadx 版本** | `1.4` 反编译 `b` 方法**失败**且**搜索定位到错的算法**；`1.5+` 正常 | `2074694` |
| **Java 反编译引擎** | `jadx` 反编译 `Base64Util` **逻辑恢复不正确** ⇒ 用 **Procyon** 在线反编译才拿到正确逻辑 | `1572670` |

> ★★ **判据**：`ida` F5 结果「一派胡言乱语」或「参数没被用到」时，
> **第一步不是硬读汇编，是换工具/换版本**（再不行才回汇编）。

### §6.1 `ida` F5 不正常的两个固定动作

| 现象 | 动作 | 来源 |
| --- | --- | --- |
| F5 出来明显不正常（函数尾被截断 / 调用关系断裂） | **流程图模式 → `Remove function tail` → `Force BL call`** ⇒ 再 F5 就正常 | `574587` |
| `ida` 认不出函数（提示被加密 / 没有函数体） | 在**调用点下断点跟进去**，进去后手动 `p`（转代码）再 F5 | `../../web-reverse-algorithm/references/18-native-layer-algorithm-restore.md` §2.1 |
| 同一 App 有多个 ABI 的 so | **优先挑反编译质量好的那一份**（有时 `arm` 或 `x86` 明显更清晰） | `../../web-reverse-algorithm/references/18-native-layer-algorithm-restore.md` §2.5 |

---

## §7 调用约定与「返回值看着不像结果」

### §7.1 arm32

```text
参数 1~4 → R0~R3；超过 4 个 → 逐个压栈（小端）
函数入口通常先把所有参数存到栈上（便于回溯）
返回值 → R0
```

> ★ `52pojie-2073103` 原话：这一段「在逆向中很重要」，因为**unidbg 断点读参数时要知道去哪读**。

### §7.2 arm64

```text
参数 1~8 → x0~x7；返回值 → x0
```

> ★★ 实战用法：hook「调用指令之后的第一条指令」（如 `MOV X21, X0`），读 `x0` 拿原始返回值（`2107248`）。

### §7.3 Thumb 与「+1」

`hookZz.wrap(module.base + 0x00000b88 + 1, …)` —— **`+1` 是 Thumb 指令集的标志位**（`1572670`）。
`module.callFunction(emulator, 0xd14 + 1, …)` 同理（`2073103`）。

### §7.4 函数指针 ≠ 生成点

沿「谁调用了谁」回溯时，会连续遇到一堆**只做搬运**的函数：

```text
memcpy / memmove / strcat / strdup / hex 编码器（sub_109FB8 是「最终 hex 构造层」）
```

> ★★ **判据**：「hex 构造层」与「byte→hex 编码层」**都不是算法层**，要继续往上溯源
> （`2107248`：`sub_109FB8` = 最终 hex 构造层；`sub_77C90` = byte→hex 编码）。
> ★ 顺手判据：**写入一次字节就写一次 0** ⇒ 那是 hex 编码的高位补 0。

---

### §7.5 ★★ Go / cgo 编译出来的 so：调用约定完全不同

**来源** `52pojie-1691013`（xx度灰 App，`libsojm` 由 **Go** 写成，`cgo` 桥接）。

```text
① 导出函数名是常规静态注册：Java_com_qq_lib_EncryptUtil_encrypt(env, clazz, a3, a4)
② 但函数体只会做一件事：把参数塞进数组 → 调 **crosscall2(<fn>, <args>, <size>, <runtime>)**
   ★ 其中 size 传的是 20 = 5 * 4，而数组明明只放了 4 个元素
     ⇒ **多出来的那个槽位是"返回值的落点"**
③ 进入 cgoexp_xxx 后：**参数完全通过栈传递**，而且**同一个参数会被重复传多遍**
④ ★★ 结论（源文原话）："这个 so 库的调用约定与常规的不同，很可能是**全部通过栈**进行的，
   包括参数的传递以及返回值的传递" —— 返回后 **cgo 会把返回值写回参数数组之后的位置**
   （`*(_DWORD *)(a6 + 16) = v10;`）
```

> ★★★ **判据（三条，缺一不可）**：
> ① 反汇编里出现 **`crosscall2` / `cgo_wait_runtime_init_done` / `cgoexp_`** 前缀的符号；
> ② 函数体短得可疑，参数被**原样塞进数组**再转发；
> ③ **传入的 size 比参数个数多**。
> ⇒ **这种 so 不要按"标准 JNI"去读**；**优先按"输出形状"（`02` §5）与"分段 hook"（§4）来还原**，
> 或者直接走 **RPC 化**（`04-rpc-and-boundary.md`）。
> ★ 另一条同源判据：**它把 `go` 的 `crypto/cipher` 用起来了** ⇒
> 若在符号/字符串里看到 `crypto/cipher`、`newCipher`、`CFB` 等 Go 侧名字，
> **先按 Go 的默认参数复现，再与 Python 对拍**（源文实测：Go 的 CFB 与 Python 的 CFB
> **默认结果不同**，需要对上分段/移位口径）。

---

## §8 来源表

| 源文 | 贡献 |
| --- | --- |
| `52pojie-2122819` ttEncrypt 封包逆向 | §1.1 XOR 解密类名、§4 分段 hook 骨架、§5 输出形状全套、§5.3 缓存 vs 随机数、§7.1 |
| `52pojie-2107248` X-Gorgon（七神） | §3 出口倒推法、§3.4 `BLR` 读寄存器、§7.2/§7.4、§2.1 固定输出 |
| `52pojie-2073893` 得到 App（G-Auth-Sign） | §2.2 主动调用对拍、§2.5 必须初始化、§3 `std::string` 第 3 字段、§3.3 memcpy 习惯 |
| `52pojie-2073103` 快对 | §2.3 补环境、§2.5 顺序依赖、§5 `ECB vs CBC` 实验、§7.1、§7.3 |
| `52pojie-2070898` 南银消金 | §2.2 主动调用、§2.4 `dlopen` 控时机、§2.5 结果被缓存、§6 换 Binary Ninja |
| `52pojie-2074694` 他x星qiu | §6 jadx 版本差异 |
| `52pojie-1572670` 某应用 sign | §6 Procyon 引擎、§7.3 Thumb `+1`、§2.2 |
| `52pojie-574587` 某书签名 | §6.1 `Remove function tail` |
| `52pojie-1332557` 某种草电商 | §1.2 `NewStringUTF` 长度过滤 |
| `52pojie-1388335` 某咖啡 sign | §1.2 `System.loadLibrary` + 字符串索引化 |
| `52pojie-1546549` 最右 | §2.3 固定动态 key/iv |
| `52pojie-2031450` 某游快爆 | §1.2 搜业务字符串 |
| `52pojie-2047651` 某海外运营商 | §1.2 搜业务字符串 |
| `52pojie-2100363` 某卡 Flutter | §5.4 密文长度特征表 |
| `52pojie-2127692` 海外社交签名链 | §2.4（`JNI_OnLoad` 定位） |
| `52pojie-2014961` zcool 登录 | §1.2 按 key 打 `HashMap.put` 堆栈定登录函数 |
| `52pojie-1691013` xx度灰 | §7.5 Go/cgo so 的栈传参与返回值落点、Go CFB 与 Python 默认不同 |
| `52pojie-1542726` 京东到家 `signKeyV1` | §4.1 openssl HMAC 现成锚点（`HMAC_Init_ex` key / `HMAC_Update` 消息） |
| `52pojie-1335742` PC 微信小程序包 | §3b `EncryptBufToFile` 取未加密缓冲 + `findExportByName` 替代写死偏移 |
| `52pojie-1189150` AutoJS 脚本解密 | §3b `$init.overload` 精确匹配 + **只调用一次 ⇒ 必须 spawn 注入** |
| `52pojie-1715751` 某 App `_sign` | §1.1b `VX+XXX` 假指针 `Y` 修复、`toupper` 循环定位、去特征 frida、arm32 `+1` |
