# 小程序包：落点 → 解密 → 解包 → 修复（唯一权威源）

一句话：**小程序逆向的"入口"是包，不是抓包。** 拿到包 = 拿到全部前端代码 = 加密算法必然可读。

> 本文覆盖「包从哪来 / 要不要解密 / 怎么解包 / 解包后跑不起来怎么办」。
> 请求侧的 sign / header / body 加密见 `request-crypto-and-sign.md`；
> 运行时调试、云函数、原生层见 `runtime-and-debug.md`。

---

## 0. 平台 ↔ 包格式 ↔ 是否需要解密

| 平台 | 包格式 | 终端 | magic / 特征 | 要不要解密 |
| --- | --- | --- | --- | --- |
| 微信 | `.wxapkg` | **PC 微信** | 首 6 字节 `V1MMWX` | **要**（见 §1） |
| 微信 | `.wxapkg` | **安卓 / 手机** | `0xBE … 0xED` | **不要**（明文；直接解包） |
| 微信 | `.wxapkg` | PC，但站点已加固 | 解包后缺 `app.json` | 解包工具失败（见 §5） |
| 抖音 | `.pkg` / `.ttpkg.js` | 安卓 | 首 4 字节 `TPKG` | **不要**（明文，见 §3） |
| 抖音小游戏 | `asm` 一类 | 安卓 | 非 TPKG | 现行工具**解不了**（别在这耗） |
| 支付宝 | `.tar` | 安卓 | tar（`ustar`）+ 明文 JS | **不要**（见 §4） |

工具速查：`unveilr`（命令行、自动识别并合并分包、**首选**）、`wxappUnpacker`（老牌，需 node 与 7 个依赖）、
`wxapkg-convertor`（拖拽式）、`UnpackMiniApp`（只做 PC 解密）。本技能自带 `scripts/wxapkg_tool.py` 做**识别 + PC 解密 + 列举/提取**。

---

## 1. PC 微信加密包（`V1MMWX`）——解密算法

```bash
python scripts/wxapkg_tool.py identify "D:/WeChat Files/Applet/wxXXXX/58/__APP__.wxapkg"
python scripts/wxapkg_tool.py decrypt --in "…/__APP__.wxapkg" --out out.wxapkg --wxid wx1234567890abcdef
python scripts/wxapkg_tool.py list out.wxapkg        # 或 extract -o <目录>
```

算法（社区多份实现一致；`scripts/wxapkg_tool.py` 全部实现并自检）：

| 步骤 | 参数 |
| --- | --- |
| 文件布局 | `magic(6B "V1MMWX") + aesBlock(1024B) + xorBody(其余全部)` |
| key | `PBKDF2-HMAC-SHA1(passphrase = **wxid**, salt = "saltiest", iter = 1000, dkLen = 32)` |
| iv | 字面量 `"the iv: 16 bytes"`（**不是 16 个字符的随意串，就是这句话**） |
| 头部 | AES-256-CBC 解密 1024B；**PKCS7 填充后恰好 1024 ⇒ 真实头部 = 前 1023 字节**（pad 恒为 `0x01`） |
| 体部 | 从文件偏移 **1024**（magic 之后第 1025 字节）起，逐字节异或 `xorKey` |
| xorKey | `ord(wxid[-2])`（**倒数第 2 个字符**）；**`len(wxid) < 2` 时兜底 `0x66`（'f'）** |

### 判据与坑

- **每个坑的共同点：错了不报错。** wxid 错一个字符 ⇒ AES 仍然稳定吐出 1024 字节随机数据，xor 之后体部全乱，
  只有"解包时看不到文件"或"头部 magic 不对"才暴露。**先跑 `identify` 对 magic，再谈解包**（`decrypt` 已内置该校验并给出 `unpad_ok`）。
- `xorKey` 取**倒数第 2 个**（`wxid[-2]`），不是最后一个、也不是第一个。取错时头部正常、**体部全是垃圾** ⇒ 「文件列表能读、文件内容打不开」就是这一条。
- **边界：`wxid` 长度 < 2 时不能取 `wxid[-2]`**，兜底 `0x66`。这一类分支在真实样本里永远遇不到，只能靠自检覆盖 —— 本技能把它写成显式断言。
- PC 加密包的**最小合法尺寸** = `6 + 1024 + xorBody`。造夹具时包必须 > 1023 字节，否则"头部 1023 字节"这一刀会把整包吃掉，round-trip 必然失败（自检里有这一条）。
- **分包**：主包 `__APP__.wxapkg` 之外的 `.wxapkg` 都是分包，**必须分别解密 + 分别解包**；只处理主包会缺页面。
- 用户目录里 `cert.json` / `sign.json` 一类文件是**文件完整性校验**：改包放回后小程序会重新拉取该文件（见 §6）。

---

## 2. 落点：包在哪

| 场景 | 路径 |
| --- | --- |
| PC 微信（老版 `WeChat`） | `%USERPROFILE%\Documents\WeChat Files\Applet\<wxid>\<版本号>\` |
| PC 微信（新版 `xwechat`/`radium`） | `%APPDATA%\Tencent\xwechat\radium\Applet\packages\<wxid>\<版本号>\` |
| 安卓（root） | `/data/data/com.tencent.mm/MicroMsg/<用户MD5>/appbrand/pkg/` |
| 安卓（新版，`general` 子目录） | `/data/data/com.tencent.mm/MicroMsg/appbrand/pkg/general/` |
| 抖音（root） | `/data/data/com.ss.android.ugc.aweme/files/bdp/launchcache/<appid>_*/ver_*/` |

**"找不到该拿哪个包"的标准处置**：把目标目录里已有的包**全删掉** → 重新打开小程序 → 通过所有要用的页面 →
目录里新出现的包就是它（分包会同时出现多个，`__APP__.wxapkg` 是主包）。

- 用 `everything` 搜 `*.wxapkg` 再按修改时间倒序，比记路径可靠。
- **`.meta` 文件里有小程序名称**，用于确认"这个 appid 目录确实是目标"（抖音包尤其需要）。
- 电脑端路径随机字符串那段就是 appid 目录名，`wx` 开头。
- **另一种强制"重新下载"的手法（`52pojie-832333`）**：**先分享小游戏/小程序 → 删除它 → 从分享卡片重新进入**
  ⇒ 触发**重新下载**，再按修改时间倒序就能锁定最新包（适合"不知道 appid 目录 / 目录里包太多"）。

---

## 3. 抖音 `TPKG` 包结构（明文，直接解析）

前 4 字节固定 `TPKG`，之后是「文件头 + 索引 + 文件内容」，**全部明文**（所以有大量可见路径字符串）。

社区实测的字段语义（`references` 级参考，非官方）：

| 位置 | 宽度 | 语义 |
| --- | --- | --- |
| 文件头 | — | 版本号、4 个空字节、**文件个数**、第一个文件名的长度 |
| 每条索引的空隙 | — | **每条记录之间有 12（`0x0C`）字节间隔**；其中**第 9–12 字节 = 文件名长度（大端）** |
| 每条索引 | 4B | 文件名之后紧跟 4 字节 = **文件内容起始偏移（大端）** |
| 数据区 | — | 按偏移 + 长度切片 |

判据与坑：
- **索引里的整数是大端**（`6F 25 00 00` 要读成 `00 00 25 6F`）。按小端读会得到一个"看着合理"的偏移，然后取出乱码。
- **`12` 是十六进制**（= 十进制 18），别按十进制理解。
- 该格式**只覆盖小程序，不覆盖抖音小游戏**（小游戏是 `asm` 格式）。花时间在 `asm` 上是浪费。
- 现成工具：`ttpkgUnpacker`（支持 `.pkg` 与 `.ttpkg.js`，可提取 `ttss` / `ttml`）。**先跑工具，工具挂了再手抠**。

---

## 4. 支付宝小程序（`nebula`）

两条独立的路，**先试第一条**：

1. **直接拿源码包**：`/data/user/0/com.eg.android.AlipayGphone/files/nebulaInstallApps/<tinyAppId>/`
   —— 里面是 **tar 包，不加密**（文件名就是 `tinyAppId`，抓包 `tinyAppId` 参数可对上）。`adb pull` 出来解压即得工程。
2. **只解 `index.worker.js`**：源码包打不开时（工具不兼容），主逻辑在 `index.worker.js`；html + 1~2 个 js 就是全部。

- **抓包前提**：Frida hook 时**必须选对小程序的进程**（如 `com.eg.android.AlipayGphone:lite1`），
  hook 主进程 `com.eg.android.AlipayGphone` 会"什么都没发生"。
- 证书校验在 `org.apache.http.conn.ssl.AbstractVerifier`（`BROWSER_COMPATIBLE_HOSTNAME_VERIFIER`），
  hook 它的 `verify(String, String[], String[], boolean)` 直接 `return` 即可放行；**`onReceivedSslError` 那条路实测调不到**。

---

## 5. 解包后进不了微信开发者工具：修复清单

解包产物**几乎必然**跑不起来，按报错逐条修（"什么报错删什么"）：

| 报错 / 现象 | 修法 |
| --- | --- |
| `this package is a subPackage which should be unpacked with -s=<MainDir>` | 这是分包：改用 `-s=<主包目录>` 解包（`wxappUnpacker`：`node ./wuWxapkg.js 分包路径 -s=主包路径`） |
| 缺 `app.json` | 站点做了反编译加固 ⇒ 换工具/换版本；仍不行就走**动态侧**（`runtime-and-debug.md` 的 hook / MITM，不必纠结静态） |
| `componentFramework` 字段报错（期望 `exparser`） | 项目配置是老版写法：`"componentFramework": "glass-easel"` |
| `[获取文件失败] 以下文件已被配置忽略打包上传，模拟器无法获取`（页面空白） | `project.config.json` 的 `setting` 里加 `"ignoreUploadUnusedFiles": false, "ignoreDevUnusedFiles": false` |
| 插件目录（`plugins/**`）报权限错误 | **整目录删掉**（没有调用插件应用的权限，留着必炸） |
| 渲染层提示请求域名不合法 | 勾选「不校验合法域名」；**参数往往在本地生成**，请求发不出去也不影响逆 sign |
| 编译后一堆无关报错、无从下手 | 先在本地设置里**关掉**「上传时压缩代码 / ES6 转 ES5」一类选项再编译 |
| `wx-scope` 一类字段（`wxml` / 配置里） | 全局替换 **`wx-scope` → `scope`**（解包产物把字段名写错；`52pojie-1872067`） |
| 编译/运行时报 `VM2_INTERNAL_STATE_DO_NOT_USE_OR_PROGRAM_WILL_FAIL.handleException(e)` | **全局替换整段为 `e`**（`handleException(t)` → `t`），工程才能跑；这是 `vm2` 残留（`52pojie-1872067`） |

> ⚠️ **`VM2_INTERNAL_STATE_...` 的两义（与 `web-js-env-patcher` 方向相反）**：该标识是 **`vm2` 沙箱**的内部状态对象
> （`vm2` 的 `transformer.js` 会把它追加到每个 `catch` 之后，见
> `../../web-js-env-patcher/references/node-leakage-and-silent-failure.md`）。
> 在**小程序侧**，处置是**把它整段删掉**（替换回原来的异常变量 `e` / `t`）；
> 在 `web-js-env-patcher` 里方向相反：**要识别并绕开**它，好让扣下来的代码在 Node（VM2 环境）里跑对。
> **同源（都来自 `vm2`）但方向相反，结论不要互相照搬**（源文未说明它为何出现在解包产物里）。

**"页面点不动但参数照算"这一点很关键**：sign / x-sign 常**在本地生成**（时间戳 + 本地常量 + 缓存 token），
所以哪怕请求被域名校验拦下，**在 `send` 处断点照样能拿到完整入参**。

> ⚠️ 解包出来的代码是**站点构建产物**：变量名全 `e/t/n`、`app-service.js` 是几万行单文件。
> 直接读不如先**格式化**（vscode 效果一般时用在线格式化），再**按抓到的 URL 反查文件名**（见 §7）。

---

### §5.1 工具「某一类产物解不出来」时的模式阶梯（PHM）

`wxappUnpacker` 系工具链把「解包」拆成 4 个**可单独执行**的阶段
（`wuConfig` / `wuJs` / `wuWxml` / `wuWxss`），每个阶段带一个 **PHM 解析模式**开关。
症状是**只解不出某一类文件**（其余产物正常）—— 做法是**按产物类型逐个换档**，不要整体推翻重来。

| 解不出来的产物 | 对应阶段 | 切到 |
| --- | --- | --- |
| `app.json` 一类 JSON（**插件项目尤其常见**） | `wuConfig.js` | PHM 2 |
| `.js`（`app-service.js`） | `wuJs.js` | PHM 3 |
| `.wxml`（`page-frame.js`） | `wuWxml.js` | PHM 4 |
| `.wxss` —— **有报错** | `wuWxss.js` | PHM 5 |
| `.wxss` —— **不报错但也没有产出** | `wuWxss.js` | PHM 6 |

**最后两行的区分是这张表的关键**：同样是"wxss 没出来"，
「报错」与「静默无产出」要切到**不同的档**（5 vs 6）—— 先看有没有报错，再选档。

两条纪律：

1. **分包要"先解包、再按阶段单跑"**（整链一把梭时中途失败会丢掉已成功的前序阶段）：
   ```bash
   node wuWxapkg.js <分包 wxapkg 绝对路径>          # 只做解包
   node wuJs.js    <解包路径>/app-service.js        # 复原 JS
   node wuWxml.js  <解包路径>/page-frame.js         # 复原 WXML
   node wuWxss.js  <解包路径>                       # 复原 WXSS
   ```
2. **解完必须手动拷回主包**：分包产物**不会自动并入主包目录**，
   要按**同一个相对路径**合并过去，否则开发者工具只认主包（这条与 §5 第 1 行的
   `-s=<MainDir>` 是**同一件事的两端**：解包时指定主包、解完后人工合并）。

> 边界：PHM 是**该工具链的实现细节**，不是小程序协议的一部分。
> `unveilr` / `wxapkg_tool.py` 没有这个开关 —— 换工具就是换一套失败模式，
> **别把「某工具解不出」当成「包有问题」**（先按 §0 的 magic 判据确认包本身完好）。

---

## 6. 改包回写：会失效，以及怎么办

「解包 → 改一行 → 重新打包 → 放回原位」这条路**大概率立刻失效**：目录里有
`cert.json` / `sign.json` 一类**完整性校验文件**，发现改动后会**重新从服务器拉取**该文件（抓包能看到 `.js` 被重新请求）。

**正确姿势**：不要回写磁盘，改成**在响应上改**（MITM auto-responder 返回改后的 JS）。
- charles / fiddler 的 AutoResponder、proxypin 的改写规则都行。
- 更稳的是**重打包 + 让校验失效**：见 `runtime-and-debug.md` §3（frida patch 掉 MD5 比较点）。

对「小程序小游戏」这类纯客户端数值（如存档 JSON）：
**不需要碰包**，直接在 MITM 里改请求体/响应体的 JSON 即可（`request()` / `response()` 两个钩子，改完 `content` 回填）。

---

## 7. 解包后怎么"读得动"

1. **不要在 `app-service.js` 里从头读**。拿抓包到的 **URL 片段**（如 `activity/function/task/get`、`archive/user`）
   全局搜 → 直接跳进 `request` 封装 → 顺藤摸到 `sign` / `encrypt`。
2. 关键词优先级：**接口路径片段 > 参数名（`sign`/`nonceStr`/`Checksum`/`x-*`）> 算法名（`encrypt`/`decrypt`/`aes`/`md5`/`hmac`）**。
3. 文件名是强线索：`header.js` / `encrypt.js` / `constant-obfuscated.js` / `*Utils*` 往往就是答案所在地
   （实测"文件名即功能"命中率很高，优先点开）。
4. **跨平台同名小程序可换赛道**：同一个 App 常在多平台上架（uni-app / taro 一套代码多端发布）。
   某个平台（如抖音）不熟时，**去微信搜同名小程序**，解包套路更成熟、社区更全。
5. 混淆常量表读不动 → **别硬读，去爆破**：`scripts/const_bruteforce.py`（见 `request-crypto-and-sign.md` §4）。
