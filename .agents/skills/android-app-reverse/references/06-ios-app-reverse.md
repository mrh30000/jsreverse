# 06 · iOS 侧 App 逆向（载体判据 → 定位 → 加密资源字典 → 风控 SDK）

> 本文件是 `SKILL.md` 的 iOS 分册。**三条铁律同样适用**（出口倒推 / 先看输出形状 / 三种证据吻合）；
> 这里只写 **iOS 与 Android 的差异面**，重合部分不重复。
> 归一化后先读 `01-recon-and-carriers.md`（载体判据）与 `03-signature-and-packet-families.md`（签形态）。

---

## §0 什么时候是 iOS 题

| 信号 | 说明 |
| --- | --- |
| 目标只有 `.ipa` / `Payload/xxx.app/`，没有 `classes.dex` | iOS |
| 加密调用在 `CCCrypt(...)` / `SecKeyEncrypt` / `CCHmac` | iOS（系统库，**不是**厂商自研） |
| 抓包拿到 `X-Super-Properties` / `plist` 响应 / `sign-sap-setup-*` | 苹果或 iOS 侧 SDK |
| 类名形如 `XXReserveRequest` / `XXLoginViewController`（Objective-C 前缀式） | iOS |
| 需要"砸壳"才能反编译 | iOS（App Store 包带 `FairPlay` 加密） |

> ★ 与 Android 的**最大差别不在算法，而在"定位手段"**：
> Android 靠 jadx 搜字符串 + `System.loadLibrary` 定 so；
> iOS 靠 **Objective-C runtime 的类/方法名** + **`frida-trace` 的 `-m` 通配**，
> 算法实体往往直接落在**系统库函数**（`CCCrypt` / `CCHmac`）里 ⇒ **先拦系统函数，再回溯调用者**。

---

## §1 取件与脱壳

```text
① 越狱设备 + frida-ios-dump：frida-ios-dump -u -H <host> <bundleId>   ⇒ 拿到解密后的 .ipa
② 未越狱：从越狱设备/第三方站点取已解密包；`.ipa` 直接改后缀为 `.zip` 解出 Payload
③ 反编译：IDA Pro / Hopper 打开 Mach-O；类与方法名靠 Objective-C runtime 元数据自动还原
④ 依赖库：`otool -L` 看链接了哪些 dylib（含 `libMobileSubstrate` 之类即"被注入"信号）
```

> ★ `xapk` / `split APK` 那套是 Android 的（见 `01-recon-and-carriers.md`）；
> iOS 侧的等价物是 **`Payload/<App>.app/Frameworks/`**（Swift 动态库、Flutter `App.framework`）。

---

## §2 ★★★ 启动 / 登录闪退处置（三件套）

源文实测：**签名被改过 ⇒ 启动闪退 + 登录按钮点了没反应**。处置顺序：

### §2.1 启动闪退：`SVC` 反调试

```text
IDA 搜 "SVC" ⇒ 得到一批 svc #0x80 调用（ptrace / sysctl 反调试）
对 `sub_xxx` 的**最后一行汇编 NOP 掉** ⇒ App 正常启动
```

> 判据：`svc` 出现在 `__text` 里且紧邻 `exit()` ⇒ 99% 是反调试/反越狱分支。
> **不要逐行读懂**，先 NOP 再看行为变化（口诀：**改变观察，而不是读懂**）。

### §2.2 登录无反应：`exit(0)` 的条件变量

```objc
void -[XXLoginViewController login](XXLoginViewController *self, SEL a2) {
    if ( qword_100F492E0 )   // ← 这个全局量是"环境不安全"的缓存标志
        exit(0);
}
```

```text
① 在 IDA 里对 qword_100F492E0 做交叉引用，找到**赋值处**（如 sub_1002F52F44）
② 把赋值处涉及的每条检测**逐条绕过**（不要只看一处 —— 见 §9 坑表）
③ 重签名的产物会多出 `embedded.mobileprovision` ⇒ hook 它返回 0：
```

```text
// frida：让"路径查询"看不到 embedded.mobileprovision
{ onEnter(log, args, state) { this.fileName = new ObjC.Object(args[2]); },
  onLeave(log, retval, state) {
      if (this.fileName.toString().toLowerCase().indexOf("embedded") != -1) retval.replace(0x0);
  } }
```

> ★★ **`exit(0)` 型防御的通用处置**：**别去改 `login`，去改"谁把它置 1"**。
> 置 1 的地方通常有多个（签名 / 越狱 / 调试器 / 代理 / 模拟位置），**逐个处理完才不漏**。

---

## §3 ★★★ 定位：`frida-trace` 四种用法

| 用法 | 命令 | 拿到什么 |
| --- | --- | --- |
| 枚举"当前在哪个类" | `frida-trace -UF -m "-[UIViewController viewDidAppear:]"` | 页面类名（进入页面再返回即可看到） |
| 跟踪一个类的全部方法 | `frida-trace -UF -m "-[*LoginViewController *]"` | 该类被调用的方法名序列（**看调用顺序**） |
| 拦请求体的最终形态 | `frida-trace -U -f <bundleId> -m "*[NSMutableURLRequest setHTTPBody:]"` | **body 明文 + 调用堆栈**（← 最高价值） |
| 拦系统加密函数 | `frida-trace -U -f <bundleId> -i CCCrypt` | key / iv / 明文 / 密文 / 模式（← 一步到算法） |

**从 `setHTTPBody:` 的堆栈反推结构**（源文实测）：

```text
-[NSMutableURLRequest setHTTPBody:] ← AFJSONRequestSerializer
  ← AFHTTPRequestSerializer ← AFHTTPSessionManager
  ← XXBaseRequest startWithSuccess:
  ← XXReserveViewController reserve       ← 业务入口（从这里往上找 Request 类）
```

```text
拿到业务 Request 类名后再 `-m "*[XXReserveRequest *]"` ⇒ 一次打印出
setShopId: / setSessionId: / requestParams / ydToken / requestHeader / …
⇒ **参数清单与算法入口同时暴露**（比读反汇编快一个数量级）
```

> ★★ **"参数是 base64 时先拦 `base64EncodedStringWithOptions` 或 `CCCrypt`"**——
> 源文原话：运气好时能**直接定位到加密算法**。同理，Android 侧等价动作是全局 hook
> `MessageDigest.update/digest`（见 `02-native-dynamic-tracing.md` §7）。

---

## §4 ★★★ `CCCrypt` 参数语义表（iOS 的"一眼判算法"）

```objc
CCCrypt(op, alg, options, key, keyLength, iv, dataIn, dataInLength, dataOut, dataOutAvailable, dataOutMoved)
```

| 参数 | 取值 → 含义 |
| --- | --- |
| `op` | `0` = 加密，`1` = 解密 |
| `alg` | `0` = AES128，`1` = DES，`2` = 3DES，`3` = CAST，`4` = RC4，`5` = RC2，`6` = Blowfish |
| `options` | `1` = ECB，`2` = CBC，`3` = CFB，`4` = CTR，`5` = OFB，`6` = CFB8；再 `| 0x1000` 表示 PKCS7 填充 |
| `keyLength` | **`0x20` = 32 字节是 AES-256 的密钥长度**（⚠️ 与 `alg=0` 的"AES128"命名不冲突，实际按 keyLength 走） |
| `iv` | 传的地址非零 ⇒ 读 `keyLength` 个字节（**常只填 16 字节，其后是 0**） |

实测样本（`1752900`）：`op=0, alg=0, options=1, keyLength=0x20, iv=2018534749963515`，
输出 base64 与接口 `actParam` 一致 ⇒ **AES-256-ECB，key 为 32 字节固定串，iv 实际不参与（ECB）**。

> ★★ **不要把 `iv` 非零当成 CBC**：ECB 时 App 也会传 `iv` 指针，**判模式只看 `options`**。
> ★ **输出长度是 `dataOutMoved` 指向的一个 `size_t`**，hook `onLeave` 时用
> `Memory.readUInt(this.dataOutMoved)` 读，不要读 `dataInLength`（那是输入）。

---

## §5 ★★★ 加密资源文件当"密钥字典"（本批最重的范式）

**形态**：App 内置一张加密图片（`.PIC` / `.PNG`），解密后是 **zlib 压缩的 JSON**，
里面**装着后续所有环节的 key**（`k1..k6`、`a0..a11`）。链路完整还原（`1537322`）：

```text
① 组合字符串 = BundleID + 常量串 + Info.plist 的 <key>ss</key>
   com.baobaoaichi.imaicai + "WU@TEN" + "885B25AAFD830249B81AF699187E5752"
② HMAC-SHA256( 该字符串 ) → 32 字节；取**前 0x10 字节**做 AES key
③ ★★ 但 key 不是直接用：**逐字节做一次"查表 + 低位清除"变换**
   k[i] = (k[i] & table[( k[i] 的两个偏移取模结果 ) *3 + 2]) & 0xFE
   ⇒ 生成后的 AES KEY：38 90 B6 70 76 74 00 C0 E6 4E 4A 02 98 80 8A 1C
④ AES-CBC，IV 固定 = 01 02 03 04 05 06 07 08（**前 8 字节，其余 0**）
⑤ zlib 解压 ⇒ JSON：
   {"a0":"sdk9...","a1":1,"a2":"<bundleId>","a3":"<32hex>","a4":5230,
    "k0":{"k1":"meituan1sankuai0","k2":"meituan0sankuai1","k3":"$MXMYBS@HelloPay",
          "k4":"Maoyan010iauknaS","k5":"34281a9dw2i701d4","k6":"X%rj@KiuU+|xY}?f"}, …}
⑥ 后续每个字段各取一个 k 做自己那一段的 AES key（见 §6）
```

> ★★★ **判据（本范式可迁移）**：只要看到
> ① App 里有一张**尺寸很小、内容看得出是加密数据**的资源（`.PIC` / `.dat` / 非标准 magic）；
> ② 读取它的函数附近有一个 **HMAC 调用 + 一段"按字节查表改低位"的循环**；
> ⇒ 就往"**资源 = 配置/密钥字典**"上靠。**先解出这张表，后面的题会自己变简单。**
> ★★ **注意"逐字节变换"未必是加密**：源文的 `& 0xFE` 只是**清最低位**，
> 目的是把某类字节规整成 key 空间 —— **不要当成某种密码算法去搜**。

---

## §6 风控 SDK（`SAKGuard` 族）与设备指纹采集面

**结构判据**：类名带 `SAKGuard*`（`SAKGuardDeviceFingerprint` / `SAKGuardLocalIDKeychainStorage` /
`SAKGuardCommon`），且 App 里能看到 `getFingerprintID` / `generateLocalXID` / `localID` / `sign:attachSiua:`。

**采集面（源文实测清单，按类归）**：

| 组 | 字段（节选） | 判读 |
| --- | --- | --- |
| 环境风险 | `m4`（注入的 dylib 名，`\n` 分隔）、`m5`/`m126`/`m134`/`m136`/`m304` = `unknown` | **"没取到"写 `unknown` 而不是空串** ⇒ 字段值本身是"证据形态" |
| 标识 | `m11`/`m12` = IDFA/IDFV、`m153`/`m249`/`m250` = 本地生成的 XID（**base64 长串**） | 本地 ID 走 keychain 存，**卸载重装不换** |
| 机型/系统 | `m151`/`m159`/`m160`/`m166`/`m140`（`arm64`）/`m147`（`Darwin`） | |
| 网络 | `m156`（IP）、`m162`（`WiFi`）、`m128`（`[{"bssid":..,"ssid":..}]`） | **BSSID 是强指纹** |
| 时间 | `m13`/`m148`/`m149`/`m150`/`m200` | 注意有**浮点秒**（`1634003530921.712`）与**整数毫秒**并存 |
| 越狱/工具 | `m294` 内嵌另一张 `{"7":"-","3":"-",…}` 的**逐项结果表** | **结果里再嵌一层结构** ⇒ 用 `.` 展开读，不要只看第一层 |
| 版本 | `m144`（App 版本）/`m152`（SDK 版本）/`m7`（SDK 版本号） | |

**风险扫描的"四类"取证面（iOS）**：

```text
① 文件路径：/Library/MobileSubstrate/DynamicLibraries/*.plist、/Applications/*.app、
            /usr/sbin/frida-server、/var/touchelf/scripts/、XXAssistant/Lua/…
② 进程内 dylib 名：hdfaker.dylib / RSTweak.dylib / Liberty.dylib / UnSub.dylib / …
③ Bundle ID：com.*.gpsmock / com.locaspriti.hw / …
④ 类+方法+镜像：UIDevice.systemVersion（查它"定义在哪个镜像"）—— ★★ **"查实现来源"比"查值"更难伪造**
```

> ★★★ **④ 是本族最值得抄的一条判据**：**不校验"值对不对"，而校验"这个对象的方法由哪个二进制实现"**。
> 补环境/godmode 类工具能改值，但很难把 `objc` 方法的实现镜像改成系统的。
> Android 侧的等价手法是查 `Class.getDeclaredMethod` 的 `declaringClass` / `ArtMethod` 归属。

---

## §7 签名与请求体：iOS 特有的两个拼装点

```text
① 请求体 = 明文 JSON，`actParam` / `sign` 等只是**另起字段** ⇒ 先解 sign，再拼 body（不要整包加密）
② 签名串 = "按 key 排序 → urlEncode → '&' 连接 → 拼 secret → MD5"
   （`1315172`：`signatureWithString:` = `string + secret` 后 MD5；response 段用另一个不同 secret）
```

> ★★ **"请求与响应各用一个盐"**（`1315172` 实测）⇒ 拿 request 的盐去验 response 必然不对，
> **不要因此判定"算法没还原对"**（详见 `03-signature-and-packet-families.md` §2.3）。

---

## §8 非标准 base64 / 协议层收尾

| 形态 | 判据 | 依据 |
| --- | --- | --- |
| base64 变体 | 出现 `-` / `_` ⇒ URL-safe；出现 `B` 当填充 ⇒ 自定义表 | `2060153`（Android 侧同族） |
| protobuf 前置长度 | 密文/载荷**第 1 字节 = 后续 protobuf 长度**，且尾部用 rand 补到固定长度（如 `0xF0`） | `1707725` |
| "长度 + 摘要插入" | 明文整体 MD5 → **16 字节摘要插到最前面** → 再整体加密 | `1707725` |
| 多轮异或 | `for i in range(12)` 之类**轮数固定**的异或链 | `1707725` |

> `1707725`（admob ads）还给出一个可复用的**通用判据**：
> **`_ggu_gad_gwse` 这类"字段名自带下划线前缀"的返回值**，往往是"加密后的整体"，
> 先在**返回值写出点**下断，再往回走（与 `02` 的出口倒推同源）。
> 载荷是 protobuf ⇒ 转 `../../protobuf-reverse/SKILL.md`；是 WS 帧 ⇒ 转 `../../websocket-reverse/SKILL.md`。

---

## §9 坑表（iOS 侧，实测）

| 坑 | 表现 | 处置 |
| --- | --- | --- |
| **同一防御有多个触发点** | 改掉一处（如签名校验）后，登录又跳网页/进程退出 | **必须找全所有触发点**（`1889762` 的 `DetectUtils.a` 写死 1 是第二处） |
| **重签名产生新文件** | `embedded.mobileprovision` 存在即被判"非商店包" | hook `pathForResource` 返回 `0`（§2.1） |
| **`frida-trace -m "*[*ClassName *]"` 什么都没抓到** | 方法名猜错 / 类名带前缀 | 先用 `viewDidAppear:` 确认当前类；再抓**父类**（`-m "*[UIViewController *]"` 面太大，按页面名收窄） |
| **IDA F5 一直转 / 卡死** | 巨型函数（几百行以上）反编译超时 | 退回**汇编视图 + 只读关键基本块**；或换 Hopper / Binary Ninja（工具是变量，见 `02` §8） |
| **硬编码 key 看起来是"常量"** | 源文里 key 是明文字符串 | 先确认它**是否被人为改过**（如 `qbhajinldepmucsonaaaccgypwuvcjaa` 是**打乱过的字符集**，不是可读短语） |
| **`iv` 传了却没参与** | ECB 下 `iv` 指针非零 | 判模式只看 `options`（§4） |
| **`getFingerprintID` 返回空** | 首次运行 keychain 尚无值 | 它内部会 `generateLocalID` 再存 ⇒ **先跑一次真实 App 再读** |
| **`plist` / 证书类响应当作"数据"** | `sign-sap-setup-cert` 返回的是证书链 | 证书不是签名结果；**签名在下一个请求的 `sign-sap-setup-buffer`**（源文 `2022522` 未还原，登记为 gap） |

---

## §10 来源表

| 源文 | 贡献 |
| --- | --- |
| `52pojie-1537322` ppp买菜 iOS 设备风控 | §1 砸壳、§2.1/§2.2 反 F5 与跳转表混淆、§5 加密资源 PIC 字典全链、§6 SAKGuard 采集面与四类风险面、§7 双盐 |
| `52pojie-1752900` 某茅台 iOS | §2.2 `exit(0)` 处置与 `embedded.mobileprovision`、§3 `setHTTPBody:` 堆栈反推、§4 `CCCrypt` 参数表 |
| `52pojie-1707725` iOS admob ads | §8 前置长度 / 摘要插入 / 12 轮异或 / 自定义 base64 |
| `52pojie-2119947` Discord Android → Windows DLL | §7 请求体与签名分离（该文主战场在 `../protocol-reverse`） |
| `52pojie-2022522` iTunes 登录 | §9 证书类响应不是签名结果（**未还原，登记为 gap**） |
| `52pojie-817122` / `52pojie-1572670` | 前身技能已立：砸壳 + `class-dump` + MonkeyDev / CaptainHook（沿用） |
