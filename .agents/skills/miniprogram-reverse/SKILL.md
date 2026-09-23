---
name: miniprogram-reverse
description: 微信 / 抖音 / 支付宝小程序（含小游戏、云开发）的逆向与数据采集技能：**从包出发**而不是从抓包硬啃。当目标不是普通网页而是小程序——`wxapkg`、`__APP__.wxapkg`、`V1MMWX`、`ttpkg.js`、`TPKG`、`nebula`、`app-service.js`、`app.json`、`project.config.json`、`subPackage`、`unveilr`、`wxappUnpacker`、`wxapkg-convertor`、`UnpackMiniApp`、`wx.request`、`wx.getStorageSync`、`wx.login`、`wx.cloud.callFunction`、`openid`/`unionid`/`session_id`、`x-clienttraceid`/`Nonce`/`Curtime`/`Checksum`、`X-Sign`/`x-sign`、`xmSign`/`tokenSign`、`paramsMD5`、`getHmacSha256`、`X-HMAC-SIGNATURE`、`x-evone-signature`、`constant-obfuscated.js`、`app-key` 出现时使用。覆盖：包落点（PC `WeChat Files\Applet` / 新版 `xwechat\radium\Applet\packages` / 安卓 `appbrand/pkg` / 抖音 `bdp/launchcache`）与「全删再打开」定位法、PC 加密包解密（`V1MMWX` + PBKDF2(`saltiest`,1000) + AES-256-CBC(`the iv: 16 bytes`) + `wxid[-2]` 异或，含 `<2` 位兜底 `0x66`）、安卓/抖音/支付宝包无需解密、`TPKG` 明文索引（**大端**、12 字节间隔、第 9–12 字节为名字长度）、支付宝 `nebulaInstallApps` tar 源码包、解包后修复清单（`componentFramework`→`glass-easel`、`ignoreUploadUnusedFiles`、删 `plugins`、不校验合法域名）、分包解包、**常量表爆破**（AES key+iv 双遍历、md5 盐爆破、int32 大端掩码异或）、sign 五族（排序拼接+盐 / 固定前缀+大写 / HmacSHA256 / 时间戳+client_key / 62 字符表乱序）、双层 AES（内层 key/iv 在第一次解密结果里）、国密 sm2/sm3/魔改 sm4、RSA 私钥前端签名、URL-safe base64 与自实现字符表、`padEnd(key,16,"0")`、**哪些参数不可纯算复现**（`wx.login` 的 `code`）、云函数重打包 + frida 掰直 MD5 校验 + `wx.cloud.callFunction` 探针 + websocket RPC、开发者工具 / `debugxweb`+`chrome://inspect` / `WeChatOpenDevTools` / x64dbg 附加带小程序标题的 `WeChatAppEx.exe`、安卓 `com.tencent.mm:appbrand0-4` 必须指定 pid（**模拟器登录微信会封号**）、MITM 改存档与改响应、`cert.json`/`sign.json` 完整性校验导致改包失效、以及「同一小程序跨版本常量会轮换、文章里的常量不可照抄」的判据。用户提到小程序逆向、小程序解包、反编译小程序、wxapkg 解密、微信小程序签名、小程序 sign、小程序抓包、小程序云函数、小程序源码获取、小程序改数值、ttkg/ttpkg 解包、校友邦 / 某迪汽车 / 绝味鸭脖 / 泡泡玛特 / 葫芦娃 / 洗衣 / 咖啡 / 充电桩一类小程序接口、或说「小程序抓包抓不到、小程序代码看不懂、小程序包解密失败、解包后打不开、改了包没用」时都应使用本技能。
---

# 小程序逆向：包 → 算法 → 运行时

一句话：**小程序的前端就是网页前端，难点不在算法，在"入口"。**

这一族 80% 的时间浪费在两件事上：
① **不知道包在哪 / 拿到包却解不开**（PC 包要解密、分包要合并、解包后工程跑不起来）；
② **盯着抓包硬啃算法**——而包里那几行 `sign` 代码，读 30 秒就有答案。

> 包与解包（含 PC 解密算法、`TPKG` 结构、修复清单）→ `references/unpack-and-decrypt.md`
> sign / 加解密 / 常量表爆破 / 参数来源矩阵 → `references/request-crypto-and-sign.md`
> 开发者工具与远程调试、云函数、原生层、MITM、改包失效 → `references/runtime-and-debug.md`
> 本文只给**分流判据、执行顺序、坑表与反例**。

## 分流判据（30 秒定位）

| 现象 | 判断 | 先做什么 |
| --- | --- | --- |
| 目标在小程序里，还没拿到包 | **入口层** | 目录**全删** → 打开小程序点遍页面 → `everything` 搜 `*.wxapkg` 倒序取新（§1） |
| 包首 6 字节是 `V1MMWX` | PC 微信加密包 | `wxapkg_tool.py decrypt --wxid <appid>` |
| 包首字节 `0xBE`、第 6 字节 `0xED` | 明文 wxapkg（安卓/已解密） | 直接解包 |
| 首 4 字节 `TPKG` | 抖音小程序包（**明文**） | 用 `ttpkgUnpacker`；手抠时**整数按大端** |
| tar 归档 | 支付宝小程序源码包 | `nebulaInstallApps/<tinyAppId>/` → `adb pull` → 解压 |
| 解包后进开发者工具报错 | 工程修复 | 见 `unpack-and-decrypt.md` §5 逐条修 |
| 包**解出来缺 `app.json`** | 站点加固 | 别死磕静态，直接走远程调试 / MITM |
| 抓包有 sign / `Checksum` | **③ 只签名** | 按 URL 片段全局搜 → 顺到 `request` 封装 |
| body 是 base64 长串（尾部 `==`） | **② 只加密** | 先试纯 base64；不行再 AES（`request-crypto-and-sign.md` §3） |
| 数据**不走普通 HTTPS**（云开发） | **云函数** | 改包 + 重打包 + frida + RPC（`runtime-and-debug.md` §3） |
| 参数里有个死不掉的 `code` | **`wx.login` 一次性 code** | **不可纯算**；只复用它**不参与签名**的场景 |
| `key`/`iv`/盐全在一个混淆数组里 | **常量表** | **别读代码，去爆破**（§4） |
| 小程序小游戏 / 存档数值 | 客户端信任 | MITM 改 JSON 即可，**不必碰包** |
| 改完包放回去小程序又自己拉资源 | `cert.json`/`sign.json` 校验 | 改成 MITM 改写响应（§6） |
| 目标站同一 App 在多平台上架 | **可换赛道** | 去微信搜同名小程序（解包套路更成熟） |
| 只是网页站的 JS 加密参数 | 不是本技能 | `web-reverse-algorithm` |
| 只是缺浏览器环境要补 | 不是本技能 | `web-js-env-patcher` |

## 工作流

1. **拿包**（决定后面一切的效率）。
   - Android 包**不用解密**；**PC 包必须解密**（`V1MMWX`）。
   - 分包一起拿：主包之外每个 `.wxapkg` 都是分包，**分别解密、分别解包**。
   - 拿不准是哪个 appid 目录 ⇒ 目录清空 + 重开小程序。
2. **解密 + 解包 + 修复**：`wxapkg_tool.py identify/decrypt/list/extract` → 再 `unveilr`（自动合并分包）。
   进开发者工具报错就按修复清单删/改，**目标是"能跑起来 + 能下断点"，不是"跑得对"**。
3. **🔴 CHECKPOINT · 先定位到"生成参数的那一行"，再看算法。**
   拿抓包到的 **URL 片段**全局搜（不要从 `app-service.js` 顶部读）；找不到就搜参数名，再搜算法名。
   文件名是强线索：`header.js` / `encrypt.js` / `godsigndata.js` / `constant-obfuscated.js`。
   ```bash
   S=.agents/skills/miniprogram-reverse/scripts
   python $S/wxapkg_tool.py extract app.wxapkg -o unpacked/     # 得到可全文检索的工程
   ```
4. **🔴 CHECKPOINT · key/iv/盐 抠不出来就爆破，别硬读。**
   ```bash
   python $S/const_bruteforce.py aes-pair --ciphertext "<b64>" --array-file unpacked/constant-obfuscated.js --json-only
   python $S/const_bruteforce.py md5-salt --target "<sign>" --template "{salt}nonce1759127717" --array-file unpacked/header.js
   python $S/const_bruteforce.py xor-int32 --data "<b64>" --mask 3854078970,2917115795,3887476043,3350876132
   ```
   **判据只有一个：解出来是合法 JSON。**错误的 iv 也能解出"部分可读"的明文（见坑表）。
5. **纯算复现 + 三要素对拍**：同一组输入，**先让 JS 原函数跑一遍**，再让 Python 跑一遍，两者逐字符相同才动采集脚本。
   - 只对拍 sign 不够：**加密体 + sign + 请求头**三个都要对拍。
6. **参数来源归类**（决定能不能长期跑）：见 `request-crypto-and-sign.md` §6 矩阵。
   - 纯前端计算 ✅ / 缓存与接口下发 ✅（取一次）/ **原生桥 `code` ❌**。
7. **工程化**：把「取 token → 算 sign → 发请求」串成**一次执行**（token 常几分钟就过期）；
   需要"包内探针"或云函数时才上 §3/§4 的重打包 + RPC 路线。

## 失败模式与一线修复

| 触发条件 | 一线修复 | 仍失败兜底 |
| --- | --- | --- |
| PC 包解密后**文件列表能读、内容全是垃圾** | `xorKey` 取的是 **`wxid[-2]`**（倒数第 2 个字符），不是最后一个 | `wxid` 长度 < 2 时兜底 `0x66` |
| PC 包解密后**头 1023 字节就对不上** | `wxid` 用错了（**错一个字符也不报错**，且每字节都错） | 先 `identify` 对 magic；`decrypt` 的 `unpad_ok` 会报警 |
| 抖音包手抠出来是乱码 | 索引里的整数是**大端**（要逆序读） | 直接上 `ttpkgUnpacker` |
| 解包后**缺 `app.json`** / 页面全空 | 站点加固 | 放弃静态，走远程调试 / MITM |
| 开发者工具报 `componentFramework` | 改成 `"glass-easel"` | — |
| 页面空白 + `以下文件已被配置忽略打包上传` | `setting` 加 `"ignoreUploadUnusedFiles": false`、`"ignoreDevUnusedFiles": false` | — |
| 分包报 `should be unpacked with -s=<MainDir>` | 用 `-s=<主包目录>` 解该分包 | — |
| sign 长度对但服务端报"签名错误" | 逐字符核对**排序方式 / 剔除名单 / 分隔符**（三者错都只报这一句） | 用抓包值为 oracle 反解 |
| AES 解出"前 16 字节乱、后面全对" | **iv 错**（CBC 的 iv 只影响第一块） | 别当作算法错 |
| AES 解出"部分对、部分乱" | 你选错了 iv，**错误的 iv 也能吐出部分正确明文** | 用 JSON 判据筛（`aes-pair` 已排序） |
| `padding error` | 密文是 URL-safe base64 或缺 `=` | `-`→`+`、`_`→`/`、补 `=` |
| 换台设备/清缓存就失败 | token 在 `wx.getStorageSync` 里 | 调试前**备份缓存**，或重取 |
| 返回"请将手机时间调成北京时间" | `Curtime` 要用**当前真实时间戳**（独立于签名） | 别沿用抓包里的时间 |
| 请求正常但业务数据是假的 | `x-hash` / `x-of-rev` 一类**版本戳过期** | 这两个参数必须保持最新 |
| 抓包看不到云函数数据 | 数据不走普通 HTTPS | 改包 + 重打包 + frida + RPC |
| 重打包后加载失败 | 完整性校验（MD5 比较点） | frida 覆盖 MD5 值；或改走 MITM |
| frida 重打包脚本"跑了没反应" | `RadiumWMPF` 版本不同、脚本里 RVA 失效 | 重新定位；**别指望跨版本通用** |
| frida 挂上但断点不触发 | 挂到了**主进程**，小程序在 `appbrandN` | 用 pid；PC 端要附加**带小程序标题的进程** |
| 改了 JS 行为没变 | 本地缓存命中 | 先清 `wxid_*/Applet/wx*` |
| 要复现 `wx.login` 的 `code` | **做不到** | 见下表「不可纯算」 |

## 反例黑名单（不要做的事）

- **不要一上来就抓包啃算法**。包里有完整前端代码；先解包，能省掉 80% 的猜测。
- **不要以为 Android 包也要解密**。只有 **PC 微信**的包是 `V1MMWX` 加密的；在安卓侧折腾解密算法是白费。
- **不要把"能解密"当成"解对了"**。PC 解密用错 `wxid` **不会抛异常**，只会给你一包"能读文件名、读不了内容"的垃圾；判据是 `identify` 的 magic 与 `unpad_ok`。
- **不要读混淆常量表去找密钥**。元素被拆散/拼接/乱序，读不出来；**遍历候选集 + JSON 判据**才是一次命中的方法。实测 AI 读出的候选值是**错的**。
- **不要照抄任何文章里的 key / iv / 盐**。同一小程序跨版本实测：`aes_key` 没变而 `appSecret` 换了 ⇒ 常量必然轮换，**只有结构可复用**。
- **不要用"能解出可读字符"判断 AES 解对了**。同 key 换 10 个 iv，大部分都能吐出**带部分正确明文**的串（CBC 逐块独立 + 填充校验会歪打正着）。**判据是 JSON 可解析。**
- **不要把 `hex` / `base64` / `url-safe` 混用**。签名是 hex 还是 base64、是否做了 `+→-` `/→_` 替换，**必须逐字符核对**：三者错一个，服务端只报"签名错误"。
- **不要漏抄"剔除字段名单"**。参与签名的字段常被显式排除（`sign`/`tokenId`/`ssid`/`content`/`file`/`openid`…），漏一个就全错且**无任何提示**。
- **不要把 `wx.login` 的 `code` 当可复现参数**。它一次性、由原生桥生成 ⇒ 纯算复现**不可能**；只能"复用不参与签名的那一份"或找 `updateCode` 类接口。
- **不要在模拟器里登录微信**（实测会封号）。静态度优先；必须动态就用 PC 版微信或真机。
- **不要对整包做"改文件 → 放回原位"**。有 `cert.json`/`sign.json` 完整性校验，会被重新拉取覆盖；改成 **MITM 改写响应**。
- **不要假设国密/自实现 base64 是标准的**。实测存在"名叫 sm4 但改过"与**自实现字符表**的 base64；不一致时以浏览器真实值为 oracle 逐轮对拍。
- **不要因为"断点打不上"就换关键词**。同关键词多处命中时，前面几处往往属于未执行模块，打最后一处即可。
- **不要把"页面能跑"当成"数据能拿"**。合法域名校验会拦住请求，但**参数常在本地生成** ⇒ 拦不住逆向。
- **不要把"改了客户端权限位"当成通用解法**。这只在服务端不复核时成立，属于**探针**而不是解法。

## 命令入口

```bash
S=.agents/skills/miniprogram-reverse/scripts

# 0) 全脚本自检
python $S/wxapkg_tool.py --selftest
python $S/const_bruteforce.py --selftest

# 1) 包识别（V1MMWX / 0xBE-0xED / TPKG / tar / gzip 自动分流）
python $S/wxapkg_tool.py identify "__APP__.wxapkg" "sub1.wxapkg"
# → wechat-pc-encrypted / wxapkg-plain / douyin-pkg / tar / gzip / unknown

# 2) PC 加密包解密（wxid 必须精确；错一个字符不报错，靠 unpad_ok 与 magic 判）
python $S/wxapkg_tool.py decrypt --in "__APP__.wxapkg" --out app.wxapkg --wxid wx1234567890abcdef

# 3) 列举 / 提取文件（得到可全文检索的工程目录）
python $S/wxapkg_tool.py list app.wxapkg --json
python $S/wxapkg_tool.py extract app.wxapkg -o unpacked/

# 4) 常量表爆破（key+iv 双遍历 / 盐爆破 / int32 大端掩码）
python $S/const_bruteforce.py aes-pair --ciphertext "<b64 密文>" --array-file unpacked/constant-obfuscated.js --json-only
python $S/const_bruteforce.py md5-salt --target "<32位hex sign>" --template "{salt}nonce1759127717" --array-file unpacked/header.js
python $S/const_bruteforce.py xor-int32 --data "<b64 或 hex>" --mask 3854078970,2917115795,3887476043,3350876132
```

## 资源

- `references/unpack-and-decrypt.md`：**包层唯一权威源** —— 平台↔格式↔是否加密对照、
  PC 包解密算法全参数（PBKDF2 `saltiest`/1000/32、iv 字面量、1023 字节头部、`wxid[-2]` 与 `<2` 兜底）、
  六个落点路径表 + "全删再打开"定位法、`TPKG` 索引（大端 / 12 字节间隔 / 名字长度字段）、
  支付宝 `nebula` 双路与证书 hook 点、**解包后修复清单 7 条**、改包失效与 AutoResponder 处置、"解包后怎么读得动" 5 条。
- `references/request-crypto-and-sign.md`：**请求层唯一权威源** —— 抓包四分类、
  sign 五族（排序拼接+盐 / 固定前缀+大写 / HmacSHA256 / 时间戳+client_key / 62 字符表乱序）、
  加密四类（单层 AES / **双层自描述 AES** / RSA 私钥前端签名 / 国密与魔改）、
  key/iv/盐 **五个来源 + 爆破法**（`const_bruteforce.py` 三件套）、
  **"错误 iv 也能解出可读明文"的假阳性判据**、跨版本常量轮换双源实证、
  **参数来源矩阵（哪些不可纯算）+ 参数来源 diff 判据**、14 条"不报错但结果错"坑表。
- `references/runtime-and-debug.md`：**运行时唯一权威源** —— 三条调试入口代价表、
  断点五条套路（sign 位置↔断点、打不上怎么办、本地生成所以拦不住）、
  **云函数流水线（解包 → 探针 → 重打包 → frida 掰直 MD5 → RPC）**、
  安卓 `appbrand0-4` 进程与 `AppBrandJsBridgeBinding`、PC 端 `recv` 帧格式与 AES-128-GCM、
  MITM 改存档/改响应骨架与"清缓存"前置、权限位改法的适用边界、排错 9 条。
- `scripts/wxapkg_tool.py`：识别 / PC 解密 / 列举 / 提取，**零依赖**（PyCryptodome 缺失时自走纯 Python AES），
  `--selftest` **27 项**（NIST SP800-38A F.2.1 向量、加解密往返、`xorKey` 边界、错 wxid 必须被抓住、索引截断不静默）。
- `scripts/const_bruteforce.py`：常量表爆破三件套（`aes-pair` / `md5-salt` / `xor-int32`），
  `--selftest` **11 项**（复现两篇文章的真实数值、大端≠小端、假阳性可复现）。

## 与其它技能的边界

- 本技能覆盖**小程序这一"入口媒介"**特有的部分；**请求签名与加密算法本身的通用打法**
  （阻塞点排查、纯算还原顺序、CryptoJS / JSEncrypt / sm-crypto 的 Hook）仍走
  `web-reverse-algorithm` 与 `web-reverse-hook`。
- 需要把小程序 JS 搬进 Node 复现（补 `wx.*`、`getApp()`、`App()` 等宿主对象）时，
  补环境体系与 Trace 门禁走 `web-js-env-patcher`。
- 已知成熟平台的现成蓝图（如羊了个羊的协议签名）先查 `reverse-knowledge`。
- 批量归档论坛语料（标题规则、正文抽取）走 `forum-corpus-archival`。
