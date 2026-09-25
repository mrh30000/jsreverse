---
name: android-app-reverse
description: 客户端 App（Android / iOS）接口签名与封包加解密逆向技能，工具面 frida / unidbg / jadx / IDA / 算法助手。当目标参数「不在网页里」而在 App 里时用：jadx 全局搜参数名搜不到、请求体是一长串 hex、响应体是密文、`System.loadLibrary` / `JNI_OnLoad` / `RegisterNatives` 动态注册、`libxxx.so` / `libmetasec_ml.so` / `libsscronet.so` / `libEncryptor.so` / `libtoken.so`、frida hook 入参 / spawn / attach / 主动调用 / `NewStringUTF`、unidbg 补环境 / `traceWrite` / hook `memcpy` / 固定输出、X-Gorgon / x-argus / x-ladon / x-khronos / x-ss-stub / x-medusa / x-soter、newSign / sDjcSign / G-Auth-Sign / X-Ca-Signature / ttEncrypt / appSign / requestTag / sDjcSign、梆梆 / 爱加密 / 360 / 百度壳 / 伪百度 / 脱壳 / fart / dump so、算法助手 / Inspeckage / jnitrace / `frida_hook_libart` / 魔改 RC4 / 魔改 DES / 白盒 SM4、Flutter 逆向 / blutter / reFlutter / Doldrums / libapp.so / libflutter.so、split APK / xapk 取 so、RPC 化 / NanoHTTPD / 不可还原算法的远程调用。用户说「App 逆向 / 安卓逆向 / 抓不到包 / 这个签名怎么算 / 加固脱壳 / so 分析 / frida hook 不到 / unidbg 跑不起来 / Flutter 反编译 / 客户端协议」时用本技能。
---

# 客户端 App 逆向：载体 → 出口 → 逐字节

一句话：**参数不在页面里，就先判「它在哪个载体上算的」，再从「最终写出去的那一个字节」
倒着往回走。**

这一族的时间几乎全烧在三件事上：

1. **判错载体**（以为是页面 JS / 以为是标准算法），于是往错方向使劲；
2. **在整函数里硬读反汇编**，而不是先看**输出形状**、再**分段 hook**；
3. **把「能读到」当成「能生成」**，于是把服务端的东西当成客户端算法去还原。

---

## §0 分工边界（先读，避免与邻居技能打架）

| 目标在哪 | 去哪 |
| --- | --- |
| 浏览器页面里的 JS / bundle | `../web-reverse-algorithm/SKILL.md`（本技能**不**处理页面题） |
| 微信小程序包 | `../miniprogram-reverse/SKILL.md` |
| Electron / Tauri / nw.js / 浏览器扩展 / Node 打包 / V8 字节码 / **Cocos2d-JS `.jsc`** | `../desktop-client-reverse/SKILL.md` |
| 桌面软件的**自定义二进制协议**（PCAP / 帧切片 / FourCC） | `../protocol-reverse/SKILL.md` |
| 目标数据走 WebSocket 帧 | `../websocket-reverse/SKILL.md` |
| 验证码 / 滑块 / 风控 challenge | `../web-verify-patcher/SKILL.md` |
| 已知成熟平台签名蓝图的**离线查询**（抖音 a_bogus、京东 h5st…） | `../reverse-knowledge/SKILL.md` |
| **App 里算出来的 sign / 加密请求体 / 加密响应体** | **本技能** |

> ★★ **迁移提示**：`../web-reverse-algorithm/references/18-native-layer-algorithm-restore.md`
> 是本技能的**前身**（历史上 App 端样本被并入 web 技能）。它保留了「得物 so 层 AES-ECB」
> 等**早期样本**与 `sv` 签名版本选择器、`JNI` 反向调用 Java 等判据；**新的 App 端工作流全部落在本技能**。
> 两边判据若冲突，以本技能为准（它按载体组织，不按「平台」组织）。

---

## §1 三十秒分流表：手上有什么 → 第一个动作

| 你手上有什么 | 载体 | 第一个动作 | 成本 |
| --- | --- | --- | --- |
| 抓包有固定长度、无业务含义的 header，**jadx 里逐字搜参数名搜不到** | **native / so** | 搜 `System.loadLibrary` 定 so → `Exports` 找 `Java_<包>_<类>_<方法>`；搜不到就找 `JNI_OnLoad` | 高 |
| jadx 里搜得到参数名，函数是 `native` | Java + native | 先 hook 那个 `native` 方法**拿入参出参**，再决定要不要下沉 | 低 |
| 请求体是一长串 **hex**，解出来是 JSON | Java 层 AES → hex | 搜 `encrypt` / 接口名，**整类搬到 Java 工程** | 低 |
| 请求体 / 响应体是 **base64**，长度是 16 的倍数 | Java 层 AES/3DES | 先做**密文形状诊断**（`scripts/app_cipher_shape.py`）再搜代码 | 低 |
| 有 `.so`，但 `Exports` **搜不到**方法名 | **动态注册** | 去 `JNI_OnLoad` → `RegisterNatives` 恢复 `JNINativeMethod` 表 | 中 |
| 同一个参数**每次结果都不同** | 有随机源 | 先判「真随机 / 秒级随机 / 缓存」，见 `references/02-native-dynamic-tracing.md` §5 | 低 |
| App 是 **Flutter**（`libapp.so` + `libflutter.so`） | Flutter | 走 `references/05-flutter-app-reverse.md` | 中 |
| 静态全被抽空 / 类目录少得异常 | **加固** | 查壳 → 脱壳（`fart` / 在线 / `DITOR` / `dump_so.py`） | 中 |
| 算法确认**不可还原**（白盒 SM4 / VMP / 运行时自解密） | — | 走 `references/04-rpc-and-boundary.md`（RPC 化，别硬还原） | 低 |

> ★ **选路铁律（与 web 侧同源）**：**能从高层拿到就不要下沉。**
> Java 层能整类搬走就不要 unidbg；能在 App 内直接调用（frida RPC / Xposed RPC）就不要还原算法。

---

## §2 三条铁律（本技能的主判据）

### ★★★ 铁律一：从「出口」倒着走，不从「入口」顺着读

不要先啃 `sub_xxxx` 的伪代码。顺序是：

```text
① 找到「数据真正被写进最终缓冲区」的那一次调用（memcpy / memmove / 结构体赋值）
② 从它拿到「源地址」
③ emulator.traceWrite(src, src + len) 做内存写监控
④ 从写入日志反推「谁写了哪几个字节」→ 定位写指令 → IDA 跳过去
⑤ 若还不是生成点，继续套娃（这是常态，不是异常）
```

细节见 `references/02-native-dynamic-tracing.md` §3。

> ★★★ **「逐字节不是一次性写入」是常态**：一个 26 字节的签名可能是 `4 + 4 + 4 + 4 + 4 + 4 + 2`
> 由六七个不同函数**分段拼接**出来的。**不要假设存在一个「一次算完」的函数**。

### ★★★ 铁律二：先看输出形状，不要先读算法

在碰反汇编之前，先用**几组小输入**把函数的**输入长度 → 输出长度**表打出来，并并排对比多次输出。
这一步几乎零成本，却能直接把候选算法砍到一两种。细节见 `references/02-native-dynamic-tracing.md` §5。

### ★★★ 铁律三：判据要「三种证据互相吻合」，不能只看字符串

看到 `AES` / `RSA` / `SHA` 字符串 **≠** 发现自研算法；看到某个 `.so` 出现在
`/proc/<pid>/maps` **≠** 目标函数执行过。落地判据是三条同时成立：

1. **长度/轮数**符合（如 key 16 字节 + 10 轮 ⇒ AES-128）；
2. **静态结构**符合（如「当前块先与上一状态异或」⇒ CBC）；
3. **独立实现逐字节对拍**（`openssl enc -aes-128-cbc -K … -iv … -nosalt` 或本地复现）与 Native 输出一致。

---

## §3 参考文件导航

| 文件 | 讲什么 |
| --- | --- |
| `references/01-recon-and-carriers.md` | 侦察三件套、载体判据、加固与脱壳、**版本 delta（库级哈希差分）**、split APK 取 so、**证据纪律**（字段名≠结论 / Presence / 默认值误判 / 探针先脱敏） |
| `references/02-native-dynamic-tracing.md` | 静态 vs 动态注册、**unidbg 工程化四步**、**出口倒推法**、**分段 Hook**、**输出形状优先**、反汇编工具是变量、arm32/arm64 约定与结构体返回 |
| `references/03-signature-and-packet-families.md` | 签名串的六种拼装形态、多层嵌套与「会话密钥 + 公钥包裹」、**密钥/IV 的传递方式**、**魔改算法识别**、时间与随机源、返回形态判据、定位手法速查 |
| `references/04-rpc-and-boundary.md` | **不可还原 ⇒ RPC 化**的四条路线与选路判据、边界与伦理 |
| `references/05-flutter-app-reverse.md` | Flutter 判据、`blutter` / `reFlutter` / `Doldrums` 静态路线、**特征码比对兜底路线**、密文长度特征表 |
| `scripts/app_cipher_shape.py` | 零依赖**密文形状诊断器**：长度倍数 / AES·DES·RSA 候选 / base64 长度表 / 固定开销分解；`--selftest` 内置断言 |

---

## §4 来源表

本技能首批蒸馏自归档线**第四十一轮**（`docs/references/verified.md` 批次 B41）的
App / native 簇共 35 篇源文；各参考文件末尾附**逐条来源表**。
