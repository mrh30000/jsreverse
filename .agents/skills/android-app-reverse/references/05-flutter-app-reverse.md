# 05 · Flutter App 逆向

> **定位**：Flutter 的 Dart 代码被 **AOT 编译进 `libapp.so`**，没有 Java 业务代码、没有符号表，
> 常规 `jadx` 全局搜索**一定失败**。本文件给「先静态、静态不行就兜底」两条路线。
> **首批蒸馏自** `52pojie-1580675` / `2094241` / `2100363`（三篇，已构成稳定套路）。

---

## §1 三十秒判据

| 现象 | 结论 |
| --- | --- |
| `lib/arm64-v8a/` 下同时有 **`libapp.so` + `libflutter.so`** | **Flutter App**（`2100363`） |
| `jadx` 反编译后**没有业务代码**，只有 `kotlin` 之类的外壳 | Flutter（业务在 Dart AOT 快照里） |
| `lib/` 下**一个 so 都没有** | ★ 先怀疑 **split APK**，见 `01-recon-and-carriers.md` §5（`2094241` 的坑） |
| 抓包发现请求体 / 响应体是密文，且 App 是 Flutter | 走本文件 |

---

## §2 静态路线（优先尝试）

### §2.1 `blutter`（首选）

```bash
# 把 libapp.so 与 libflutter.so 放进 arm64-v8a/
python blutter.py arm64-v8a output
```

- 产出里有 **`asm/` 目录（还原出的 Dart 代码）**与一个**给 IDA 用的解析脚本**；
- ★★ **动作**：在 `asm/` 里**搜加密关键词**（`aes` / `md5` / `rsa` / `update`），
  找到后**向上找函数起点**，拿到函数名 + 地址；
- ★ 用 `blutter` 生成的脚本让 IDA 解析 `libapp.so` ⇒ **能看到函数名**（`2094241`）；
  「直接使用偏移，好像也不影响」。

> ★ 实测（`2094241`）：`asm` 里搜到 `RSA` ⇒ 后续「hook 追踪拿密钥」即可。

### §2.2 `reFlutter`（blutter 不行时）

`github.com/ptswarm/reFlutter`。★ 与 blutter 不同：它**不是反编译器**，
而是**重打包框架** —— 把目标 APK 的 `libflutter.so` **替换成打过补丁的版本**（从而打开调试面）。

### §2.3 `Doldrums`

`github.com/rscloura/Doldrums`：`python3 main.py libapp.so output`。
★ 实测用法（`1580675`）：**在输出里搜 `md5` / `update`** ⇒ 找到关键函数 ⇒ **frida hook 拿结果**。

> ★★ **三件工具都会失败，这是正常的。**`2100363` 原话：
> 「看来这两个反编译工具都无法成功处理这个 App」（blutter 报错、reFlutter 也不行）
> ⇒ **不要在这里死磕，转 §3。**

---

## §3 ★★★ 兜底路线：用「替身 App」的特征码比对定位入口

**来源** `52pojie-2100363`（本批最值钱的 Flutter 手法）。

### §3.1 思路

```text
① 静态反编译受阻
② 不再「从代码正向还原实现」，而是「从现有结果出发，反向推导它背后的逻辑」
③ 找一个**用了同一套加密库**、且**能反编译**的 Flutter App 作「替身」
④ Hook 替身的加密函数，提取**机器码特征序列**
⑤ 拿这串特征码回**目标 App 的 libapp.so 里 `Memory.scan` 搜索**
   ⇒ **绕过函数名混淆，直接定位加密函数入口**
```

### §3.2 提取特征码的动作

```text
IDA → Options → General → Number of opcode bytes (non-graph) = 4
⇒ 汇编视图里就能看到指令字节，抄下来即可
```

```js
function hook_aes() {
  Java.perform(function () {
    var addr = Process.findModuleByName("libapp.so");
    Memory.protect(ptr(addr.base), addr.size, 'rwx');
    var pattern = "FD 79 BF A9 FD 03 0F AA EF 81 00 D1 E4 03 02 AA " +
                  "A2 83 1E F8 E2 03 05 AA A5 03 1E F8 E5 03 01 AA A1 03 1F F8";
    Memory.scan(addr.base, addr.size, pattern, {
      onMatch: function (address, size) {
        console.log('[+] AESDecrypt found at: ' + address.toString());
        hookSo(address);
      },
      onComplete: function () { console.log('Hook AESDecrypt all done'); }
    });
  });
}
```

> ★★ **判据**：命中后日志里出现 **`PaddedBlockCipher.AES/CBC/PKCS7`** 这类**特征字符串**
> ⇒ 可以直接确认算法族。
> ★ **Flutter 必须同时 hook SSL**（原话：「因为他是 flutter 的 app，所以也要对 ssl 进行 hook」）。

### §3.3 同一函数「第一次调用 = 加密、第二次调用 = 解密」

`2100363` 实测同一个函数被调用两次，参数含义不同：

| 调用次序 | 观测 | 解释 |
| --- | --- | --- |
| 第 1 次 | `arg4` / `arg7` 携带明显明文（`{"user_name":"…","token":"…"}`），**返回值为空** | **请求载荷加密** |
| 第 2 次 | `arg3` 不再出现；**返回 `{"code":0,"msg":"成功",…}`** | **响应解密** |
| 两次 | `arg1`/`arg2` 基本一致，`arg5` 第一次 `0x0`、第二次是空内存 | `arg5` **很可能是区分加/解密的模式或上下文** |

> ★★ **可迁移判据**：**同一函数两次调用、一次「有明文入参无返回」、一次「有返回是明文」
> ⇒ 它是一个通用密码处理函数，靠一个「模式参数」分支。**
> ★ 同文：`key`/`iv` 硬编码在内存里可读（实测疑似 `u%*&o3ysPzEAhoB#`（iv）
> 与 `iVCoq#^3G5wqH2EUw&izT38W&ZtG=RY4`（key））⇒ 拿到后**用请求体/响应体密文试解**即可确认。

---

## §4 密文长度特征判据表

Flutter 题常常**没有符号**，靠长度先砍候选（完整表见
`02-native-dynamic-tracing.md` §5.4）：

| 实测（`2100363`） | 结论 |
| --- | --- |
| Base64 长度 **512** → 解码 **384 字节** | 384 **不是** RSA 固定长度（128/256/512）⇒ **排除 RSA**；384 是 16 的倍数 ⇒ **优先判 AES** |
| Base64 长度 **88** → 解码 **64 字节** | 同上 ⇒ **优先判 AES** |

> ★★★ **两条必背**：① **16 字节密文 AES 和 DES 都可能**；
> ② **同时满足 AES 和 DES 时优先判 AES**（现代接口约 95% 用 AES）。
> ★ 机器化：`scripts/app_cipher_shape.py`。

---

## §5 来源表

| 源文 | 贡献 |
| --- | --- |
| `52pojie-2100363` 某卡 Flutter 请求响应加密 | §1 判据、§2.3 工具失败的处理、§3 特征码比对兜底全套、§4 长度表 |
| `52pojie-2094241` flutter 逆向-某影视 app | §1 split APK 坑、§2.1 blutter + IDA 脚本 |
| `52pojie-1580675` 某 flutter app 参数分析与进阶 | §2.3 Doldrums、§1 判据 |
