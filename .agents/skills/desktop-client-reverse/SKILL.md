---
name: desktop-client-reverse
description: 桌面 / 打包型前端逆向技能（Electron / Tauri / WebView2 / 浏览器扩展 CRX / 油猴 / nw.js / Node.js 打包产物 / V8 与 Mozjs 字节码 / Cocos2d-JS）。当「前端」不在浏览器标签页里、而在装了壳的产物里时用：`app.asar`、`resources/app`、`OnlyLoadAppFromAsar`、`@electron/fuses`/`flipFuses`、`EnableEmbeddedAsarIntegrityValidation`、`ipcMain`/`ipcRenderer`、`electron.net.request`、`electron.protocol.handle`、`webContents.openDevTools`、`--inspect`/`--debug`、`.jsc`、`bytenode`、`d8`、`0xC0DE0687`、`jsc2js`/`view8`、`jsc-decompile-mozjs-34`、`node:sea`/`Node.js pkg` exe、`WebView2`、`EmbeddedBrowserWebView.dll`、`Cocos2d-JS`、`xxtea`、`Can't decrypt code for %s`、`asar extract/pack`、`netstat -na`、`declarativeNetRequest`、`manifest.json`、`chrome://extensions`、`service worker`、`content script`、`_locales`、`nwjc`/`is_nwjc`/`*.min.bin`、pkg `!1`/`!0` patch、`console.log` 埋点法。用户说「Electron 逆向 / asar 解包报错 / 打不开开发者工具 / 改了 JS 程序自动退出 / 完整性校验 / jsc 反编译 / 字节码看不懂 / V8 版本对不上 / 这个是 exe 不会逆 / 桌面程序抓包 / WebView2 资源提取 / 小游戏客户端 / PC 客户端协议 / Chrome 插件破解 / 浏览器扩展逆向 / 油猴脚本注入 / nw.js 打包 / 会员校验」时用本技能。
---

# 桌面客户端逆向：壳 → 入口 → 运行时

一句话：**桌面端的"网页"只是被装进了一个可执行文件。** 先判断装的是哪种壳，
再决定是"解包读源码"还是"只能劫持运行时"。

这一族的时间消耗几乎全在三件事上：
① 分不清 `.jsc` 是 **Cocos 的 xxtea 密文** 还是 **V8 字节码**，于是往错的方向使劲；
② 解包成功但**内容全是垃圾**（asar 偏移错位），却以为"加密了"；
③ 改完 `app/` 目录程序起不来，却在 JS 里翻找原因（其实是 fuse / 完整性校验 / 加载优先级）。

> 壳层判据、asar 结构与偏移修复、fuse 与完整性校验、IPC 与网络劫持 → `references/electron-asar-and-fuses.md`
> **浏览器扩展（CRX）/ 油猴 / nw.js（`nwjc`）/ Electron 埋点法** → `references/extension-and-nwjs.md`
> `.jsc` 三类形态、Cocos xxtea 密钥取证、V8 字节码阅读、**Mozjs 字节码就地补丁**、pkg/bytenode 字节补丁 → `references/jsc-and-v8-bytecode.md`
> WebView2 / Cocos 资源目录 / 原生桥、反调试与插件覆盖、本地端口入口 → `references/desktop-runtime-surfaces.md`
> 本文只给**分流判据、执行顺序、坑表与反例**。

## 分流判据（30 秒定位）

| 现象 | 判断 | 先做什么 |
| --- | --- | --- |
| 目录里有 `resources/app.asar` | Electron | `asar_offset_repair.py identify` → `check` → `extract` 或 `fix` |
| `asar extract` 报错 / 解出来**首部有乱码** | **偏移错位**（不是加密） | `check` 看 delta，`fix --out` 修（`references/electron-asar-and-fuses.md` §1） |
| `resources/app/` 存在但程序仍读 `app.asar` | `OnlyLoadAppFromAsar` fuse | `flipFuses` 关掉该开关（`references/electron-asar-and-fuses.md` §2） |
| 改了 `app/` 里的 JS → 程序**几秒后自己退出** | **完整性校验** | 劫持 `fs.promises.readFile` 重定向到备份（`references/electron-asar-and-fuses.md` §3） |
| 目标用 `--inspect` / `--debug` 启动就报错退出 | 反调试（检测启动参数） | 别硬刚启动参数，走"解包 + 改入口 + DevTools" |
| 界面是网页但只有一个 exe，加载了 `EmbeddedBrowserWebView.dll` | **WebView2** | 改虚表把 `Navigate` 指向 `OpenDevToolsWindow`（`references/desktop-runtime-surfaces.md` §1） |
| 有本地 `127.0.0.1:xxxxx` 监听端口 | Electron/本地服务 | 直接当网页调（`netstat -na` 找端口，`references/desktop-runtime-surfaces.md` §4） |
| 文件后缀 `.jsc`，同在 `assets/src` | **Cocos2d-JS** | `jsc_xxtea_tool.py identify`（`references/jsc-and-v8-bytecode.md` §2） |
| `.jsc` 被 `require` 进来（`launch.dist.js` 里） | **V8 字节码（Node 模块）** | **别解字节码**：劫持 Node/Electron API（`references/jsc-and-v8-bytecode.md` §5） |
| Cocos 游戏的 `.jsc`，**xxtea 怎么也解不出像 JS 的东西** | **Mozjs（SpiderMonkey）字节码**（不是密文） | 先反编译拿到「地图」，再**就地改一个字节**（`references/jsc-and-v8-bytecode.md` §10） |
| `.jsc` 首 4 字节以 `C0 DE` 开头（实测 `C0DE0687`） | **V8 code cache**（且没有额外加壳） | 先读 V8 版本；要**看懂**走 §5.3 的三条现成路线，要**拿逻辑**仍走 §5.2 |
| 单个大 exe（几十 MB），内嵌 JS 常量仍是明文 | **Node.js pkg 打包** | `strings` 定位 → `byte_flag_patch.py`（`references/jsc-and-v8-bytecode.md` §6） |
| 目录里有 `manifest.json` + `_locales/` + `background.js`（或 `service_worker`） | **浏览器扩展（CRX / 解压目录）** | 按 `references/extension-and-nwjs.md` §1：先找 `Extensions/<ID>/<版本号>` |
| 有个扩展点开就弹「试用到期 / 解锁高级功能」 | **扩展的许可校验** | 文案 → 语言文件 → 变量名 → 逻辑文件（`references/extension-and-nwjs.md` §1.2），改**判断**不改字符串 |
| 目标扩展的付费判断就写在它自己的前端 JS 里（如 `controller/setting.js` 的 `useContext` 返回值） | 扩展的**前端权限对象** | 直接改本地扩展文件、注入伪造 `roles`，**改完刷新页面**（`references/extension-and-nwjs.md` §1.7） |
| popup 弹窗**选不中元素 / 没法自动化**；点一下就变成应用窗口 | **popup 本质是网页** | 直接开 `chrome-extension://{id}/<default_popup>`；「点一下换窗口形态」= 有 `window.open` ⇒ 断 `click` 找调用点（`references/extension-and-nwjs.md` §1.8） |
| 启动器是 `nw.exe` / `index.html` 里有 `is_nwjc` / 加载 `*.min.bin` | **nw.js + `nwjc` 二进制** | 换回源码再谈（`references/extension-and-nwjs.md` §2）—— **它是编译不是加密** |
| nw.js：换回源码后**闪退** | **文件校验**（不是算法问题） | 把 MD5 摘要判断改 `false`，**同时恢复「加载完成」检测**（`references/extension-and-nwjs.md` §2.3） |
| asar 已解包、代码压缩、格式化后无法重打包 | — | `console.log` **顺序埋点法** + Debugtron（`references/extension-and-nwjs.md` §3） |
| 扣出来的代码跑出来**结果不对** | 往往还有一层 | 先怀疑「还有一次调用 / 一层编码」，**不要**先怀疑扣错（`references/extension-and-nwjs.md` §3.3） |
| HTTP 响应里带平台签名 / 客户端 ID | 协议层 | 套本仓库其它技能（见末尾边界） |

## 工作流

1. **先定壳**（决定后面所有动作）—— 现在是**四类**：Electron / WebView2·Cocos 等原生壳 / **浏览器扩展** / **nw.js**。
   ```bash
   S=.agents/skills/desktop-client-reverse/scripts
   python $S/asar_offset_repair.py identify "…/resources/app.asar"
   ```
   - 是 asar ⇒ 走 `references/electron-asar-and-fuses.md` §1/§2；是 WebView2 / WebView 小游戏 ⇒ 走 `references/desktop-runtime-surfaces.md` §1/§2；是 Cocos / 字节码 ⇒ 走 `references/jsc-and-v8-bytecode.md` §2/§5。
   - `identify` 报"有 N 字节前缀"就先 `strip-prefix`，**不要**拿带前缀的文件直接 extract。
   - 目录里是 `manifest.json` 而不是 `app.asar` ⇒ 走 `references/extension-and-nwjs.md` §1：`chrome://extensions/` 看 ID → `chrome://version` 拿个人资料路径 → `Extensions/<ID>/<版本号>/`。
   - 有 `is_nwjc` / `*.min.bin` ⇒ 走 `references/extension-and-nwjs.md` §2：**先把加载二进制的代码换成源码**，再处理文件校验。
2. **拿到可读源码**：`check` 定偏移 → `fix --out app-fixed.asar` → 标准 `asar extract`。
   **🔴 CHECKPOINT · 偏移不自洽（`inconsistent`）时停下来问三个问题**：
   ① 是否被加了前缀？② 每段数据自身是否还有一层包装？③ 目录 JSON 是否被改过？
   这三问都排除之前（见 `references/electron-asar-and-fuses.md` §1.4），不要动手改 offset 数字。
3. **让它按你的方式加载**（Electron 的顺序）：
   `resources/app/` 优先级 > `app.asar` ⇒ 把 asar 改名备份、把解包目录改名成 `app`。
   起不来就依次检查：`OnlyLoadAppFromAsar` fuse（`references/electron-asar-and-fuses.md` §2）→ 完整性校验（`references/electron-asar-and-fuses.md` §3）→ 入口文件名是否与
   `package.json` 的 `main` 一致。
4. **🔴 CHECKPOINT · 改代码之前先开 DevTools 与日志**。
   在入口文件（`.jsc` 加载之前）注入：`app.quit` 拦截 + `browser-window-created` 里
   `openDevTools({mode:'detach'})` + `fs` 重定向 + IPC 日志（骨架见 `references/electron-asar-and-fuses.md` §4）。
   **顺序必须是"劫持先于业务代码"**，否则完整性校验已经把你踢掉了。
5. **按"能力面"逐个接管**（而不是读遍全部分代码）：
   | 你要的东西 | 接管点 |
   | --- | --- |
   | 业务请求的 URL / header / body | `electron.net.request` / `electron.protocol.handle('https')` |
   | 主进程与渲染进程之间的数据 | `ipcMain.handle` / `ipcRenderer.invoke` |
   | 本地文件 / 配置读取 | `fs` / `fs.promises` |
   | 授权 / 许可判定 | `crypto.publicDecrypt` 等**返回值**（用 `Proxy` 观察怎么被消费） |
   | 原生桥（WebView2 / JNI） | 虚表 / JNI 符号（`references/desktop-runtime-surfaces.md` §1） |
6. **`.jsc` 只有两条路，先分类再选路**：
   - Cocos xxtea 系 ⇒ `jsc_xxtea_tool.py decrypt`，密钥从 `libcocos*.so` 取（`references/jsc-and-v8-bytecode.md` §4）。
   - V8 字节码 / bytenode ⇒ **默认不解字节码**：d8 打补丁反汇编（只为了"看懂"）或
     直接在 Node/Electron 环境里 `require` 它 + 劫持它调用的 API（`references/jsc-and-v8-bytecode.md` §5）。
   - **要看懂时的顺序（`2115726`）**：① 先开调试读 **V8 版本**（这步最重要，版本不符 `Deserialize` 必失败）；
     ② 用现成的 `jsc2js` / `d8 … loadjsc(...)` + `view8` 反编译；③ 需要更高可读性时用 AI + CDP 动态调用，
     但它**只覆盖被触发的函数**（`references/jsc-and-v8-bytecode.md` §5.3）。
     **拿业务逻辑仍优先走劫持** —— §5.3 只是"看懂"。
7. **等长字节补丁（可选，最快的一条路）**：
   `!1`→`!0` 这类布尔判定在二进制里是**明文等长**的，可用
   `byte_flag_patch.py scan/patch`（默认干跑 + `--expect` 前置断言）直接翻。

## 失败模式与一线修复

| 触发条件 | 一线修复 | 仍失败兜底 |
| --- | --- | --- |
| `asar extract` 报错 / 解出文件首部乱码 | `check` 量出 delta，`fix --out` 重排（只改长度字段） | delta 不自洽 ⇒ 回 `references/electron-asar-and-fuses.md` §1.4 三问，别改 offset |
| 解包产物**每个文件**都多同样一段垃圾 | 典型"数据段起点偏了" | 用 `check` 的"抽样 n/n 命中"确认是**单一常数**型 |
| 归档带 `integrity` 字段 | 修好偏移也会被拒 | 同时处理 `EnableEmbeddedAsarIntegrityValidation` |
| 解包目录改名 `app` 后程序**无反应** | fuse `OnlyLoadAppFromAsar` 开着 | `flipFuses` 置 false（会改 exe 哈希，先备份） |
| 改了 JS 程序**过几秒**退出 | 完整性校验（4 个文件比对 hash） | 劫持 `fs.promises.readFile` 重定向到 `app.bak/`；再拦 `app.quit`/`app.exit`/`process.exit` |
| `app.quit` 劫持后**关不掉程序** | 正常现象 | 用任务管理器结束；调完记得移除该劫持 |
| DevTools 打不开（`F12`/`ctrl+shift+I` 无效） | 被 `preventDefault` 了 | 菜单里点"开发者工具"；或改源码破坏 `('debu'+'gger')` |
| JS 里反复 `debugger` 停不下来 | `setInterval` 里的反调试 | 控制台置空相关函数 / **插件 `declarativeNetRequest` 覆盖整个脚本** |
| `--inspect` 启动即退出 | 反调试检测启动参数 | 不碰启动参数，改走"解包 + 注入 + DevTools" |
| `crypto.publicDecrypt` 返回未知结构 | 需要黑盒推导消费方 | 返回 `Proxy(Buffer)` 记录 `toString/get/length`，再 `Proxy(JSON.parse 结果)` 看读了哪些键 |
| 激活成功但重启失效 | 还有**联网复核** | `electron.protocol.handle('https')` 里对该 URL 直接返回成功响应 |
| 激活当时成功、**下次续期又掉** | 只拦了 `activate`，漏了配对的 `renew` | 两个端点都伪造，**字段形状按端点分别给**（`references/electron-asar-and-fuses.md` §5.2.1） |
| 注入之后**原本正常的激活反而失效** | 注入代码在同目录写了/删了业务状态文件（如 `id`） | 调试日志写独立目录，**别碰业务状态**（§5.2.1） |
| WebView2 无法右键检查 | 没暴露 DevTools 入口 | 虚表把 `Navigate` 指向 `OpenDevToolsWindow` |
| Cocos `.jsc` 解出乱码 | key 或 xor_key 不对 | 回 so 里取证：搜 `decrypt` 符号 / 搜 `Can't decrypt code for %s` 的引用 |
| `.jsc` 用 xxtea 解不出任何东西 | 它可能是 **V8 字节码** | 别再试算法；改走"环境内 require + 劫持 API" |
| 字节补丁后程序崩 | 改了非判定用途的同名常量 | 用 `--expect` 限定数量、逐处确认；`--max` 防盲改 |
| 扩展改完加载报「清单文件缺失 / 无效」 | 改 `manifest.json` 时漏了必需字段或 JSON 语法坏了 | 用 JSON 校验器过一遍；**先备份再改** |
| 扩展「加载已解压的扩展程序」失败 | Chrome 74+ 未开**开发者模式** | 打开开发者模式再加载（`references/extension-and-nwjs.md` §1.1） |
| 扩展改完**新旧版本共存**、设置丢失 | 分享的是解压版、没带 `key` 重打包 | 先打包再改后缀，让系统认成「同一插件更新」（`references/extension-and-nwjs.md` §1.5） |
| 扩展断点打不上 / 找不到代码 | 走错了「屏」（popup / content script / service worker 三个上下文） | 按 `references/extension-and-nwjs.md` §1.4 的三面对应开；MV3 里 background 是 **service worker** |
| nw.js 关掉 `nwjc`/`nwjs` 开关仍黑屏 | 还有文件校验与「加载完成」检测 | 两处一起改（`references/extension-and-nwjs.md` §2.3）；有 steam 类购买检测也一并去 |
| nw.js 资源图全是乱码 | 走的是 `decryptImg` 一类变换 | **别逆算法**：找调用点，改输出目录跑一遍批量导出（`references/extension-and-nwjs.md` §2.4） |
| 埋点法跑完控制台没输出 | 没开 Electron 调试入口 | 用 Debugtron 之类的「强制开调试」工具（`references/extension-and-nwjs.md` §3.2） |

## 反例黑名单（不要做的事）

- **不要把"解包报错/内容乱码"当成"被加密"**。asar 偏移错位是**结构问题**：先量 delta，再谈解密。
- **不要用生成的"新 offset"去改目录 JSON**。偏移整体偏 d 字节 ⇔ `header_size` 少了/多了 d，
  只改长度字段即可；改 offset 数字是破坏性操作。
- **不要忽略 `integrity` 字段**。修完偏移、加载照样被拒，因为校验的是**文件哈希**；fuse 与校验是两件事。
- **不要在 `app/` 目录里改完就以为生效**。先确认加载优先级（fuse `OnlyLoadAppFromAsar`），再看完整性校验。
- **不要花力气"反编译 V8 字节码拿源码"**。字节码级别的源码复原不是本仓库的路线（不可靠且不必要）；
  **入口是 `require` ⇒ 永远可以劫持它调用的 Node/Electron API**。d8 打补丁只用于"看懂"。
- **不要用 xxtea 去解 V8 字节码**，也不要拿字节码去试 `xxtea_decrypt` 的密钥 —— 先分类。
- **不要只改展示层**。改了界面上的数值但业务逻辑仍用原值（要跟到真正参与计算的那一层）。
- **不要盲改二进制里的同名常量**。同一个 `!1` 可能出现在 15 处（含与你无关的分支）；
  用 `scan` 看数量 → `--expect` 断言 → 再 `--apply`，并且**永远留备份**。
- **不要在没有备份的情况下 `flipFuses` / 打补丁**。fuse 会改变可执行文件哈希，且不可逆地影响签名状态。
- **不要假设"客户端 ID / 设备指纹"可以随便伪造**。它常被服务端校验并与授权绑定；
  伪造前先确认它是**参与签名**还是**仅作展示**。
- **不要把本地 `127.0.0.1` 端口当黑盒**。它多数情况下就是本程序的 HTTP 接口，直接当公开 API 调更快。
- **不要把打包当加密（B28）**。`nwjc` 是**编译**成二进制、扩展 `.crx` 是**带签名的压缩包**、asar 是**归档** —— 三者都不是密码学意义上的加密，「解密」这条路本身就走错了。
- **不要改「展示层的字符串」当解锁（B28）**。把「支付失败」改成「支付成功」不会改变控制流；原文作者明确吐槽过这一点。**要改的是判断与赋值处**。
- **不要只绕过校验、不恢复被自己关掉的检测（B28）**。nw.js 那次的「黑屏」就是只绕了文件校验、忘了把「加载完成」检测放回来。**改一处就要想「我关掉了什么」**。
- **不要在扩展上盲改后不备份（B28）**。扩展「私钥即身份」、改坏即失去设置；原文连写三个「注意！备份」就是这个原因。
- **不要逐行逆 `decryptImg` 这类资源变换（B28）**。有可跑的源码时，**找调用点直接跑**比逆算法快一个数量级；对方删了调用代码时，从**产物形态**（文件名 = 摘要、目录 = 分类）反推。

## 命令入口

```bash
S=.agents/skills/desktop-client-reverse/scripts

# -1) 浏览器扩展 / nw.js：没有专用脚本，靠「判据 + 关键词定位 + 三面调试」（references/extension-and-nwjs.md）
#     扩展目录：chrome://extensions/ 看 ID → chrome://version 拿个人资料路径 → Extensions/<ID>/<版本号>/
#     文案 → 语言文件 → 变量名 → 逻辑文件（background.js / options.js / prefs.js / content.js）
#     nw.js：把加载 *.min.bin 的代码换成 x.js，再把 MD5 摘要校验的判断改 false，并恢复「加载完成」检测

# 0) 三个脚本的自检（22 + 29 + 15 项断言）
python $S/asar_offset_repair.py --selftest
python $S/jsc_xxtea_tool.py --selftest
python $S/byte_flag_patch.py --selftest

# 1) asar：结构体检 → 偏移反推 → 修复 → 剥离前缀
python $S/asar_offset_repair.py identify "C:/path/resources/app.asar"
python $S/asar_offset_repair.py check    "C:/path/resources/app.asar"      # 打印 delta / inconsistent
python $S/asar_offset_repair.py fix      "C:/path/resources/app.asar" --out app-fixed.asar
python $S/asar_offset_repair.py strip-prefix "C:/path/broken.asar" --bytes 25 --out fixed.asar
# 之后用标准工具：npx asar extract app-fixed.asar app

# 2) .jsc：分类 → 解密（Cocos xxtea / 网易 xor+xxtea / +gzip 自动分流）
python $S/jsc_xxtea_tool.py identify assets/src/xxx.jsc
python $S/jsc_xxtea_tool.py decrypt assets/src/xxx.jsc --key "Za810xwef83lsa0A" --out xxx.js --show-head
python $S/jsc_xxtea_tool.py decrypt assets/src/xxx.jsc --key "Za810xwef83lsa0A" \
    --xor-key "Wa810xwef83lsa0A" --out xxx.js      # 网易系：先剥 11 字节签名头再异或

# 3) 二进制等长补丁（默认干跑；--expect 是前置断言，不符不落盘）
python $S/byte_flag_patch.py scan  --in server.exe --pattern "activated:!1"
python $S/byte_flag_patch.py patch --in server.exe --pattern "activated:!1" \
    --replace "activated:!0" --expect 15 --apply --out server-patched.exe --backup server.exe.bak
```

## 资源

- `references/electron-asar-and-fuses.md`：**Electron 层唯一权威源** ——
  asar 三段布局与 `data_start = 8 + header_size` 公式、偏移错位的两种成因与"只改长度字段"的修复原理、
  前缀与 `integrity` 处置、`@electron/fuses` 八个开关与 `OnlyLoadAppFromAsar`、
  完整性校验的四个被校验文件与 `fs.promises.readFile` 重定向骨架、入口注入顺序（quit 拦截 /
  `browser-window-created` + `openDevTools` / `ipcMain.handle` 日志 / `electron.protocol.handle` 伪造响应）、
  **§5.2.1 激活类请求"一对端点 + 字段形状按端点分别给 + 注入别碰业务状态文件"**、
  `Proxy(Buffer)` + `Proxy(JSON.parse)` 黑盒推导激活码结构、本地端口与 `--debug` 反调试、
  **§9 同站多端三判据（先逆「更新慢」的一端 / 借壳复用它的 JS 而不重写 / 指纹头先翻 cookie）**、17 条坑表。
- `references/jsc-and-v8-bytecode.md`：**`.jsc` 三类形态的唯一权威源** ——
  Cocos 系（`ungzip(xxtea_decrypt())`、密钥取证三处落点、网易 `netease`+`01 01 01 EF` 签名头与
  重复密钥异或、`.luac` 类比）、V8 字节码系（bytenode、`CodeSerializer.Deserialize`、
  **首 4 字节 `C0 DE` 前缀判据**、d8 打补丁加 `Disassemble/LoadJSC` 的判据与代价、`SharedFunctionInfo` 递归反汇编的坑）、
  **§5.3 "看懂"的三条现成路线**（`jsc2js`/`view8`、`d8 … loadjsc` + `view8`、AI+CDP；含 V8 版本前置与覆盖边界）、
  **"字节码不进环境就别想调"** 的工程结论、pkg 单文件 exe 的 `strings` 定位与等长补丁、
  V8 侧**只读**知识点（Ignition / accumulator / `LdaSmi`·`Star`·`CallProperty` / 常量池）与它们的用途边界。
- `references/desktop-runtime-surfaces.md`：**非 Electron 壳层唯一权威源** ——
  WebView2 的 `EmbeddedBrowserWebView.dll` + 虚表改 `Navigate`→`OpenDevToolsWindow`（含版本绑定警告）、
  资源导出与"虚拟域名 + 本地复现"、Cocos2D-JS 安卓包 `assets/src` 与 `python3 -m http.server` 起服务、
  浏览器插件 `declarativeNetRequest` 覆盖反调试脚本（含随机参数导致的 override 失效）、
  本地监听端口（`netstat -na` + 任务管理器 PID）定位、客户端数值类目标的 5 条路线。
- `references/extension-and-nwjs.md`：**第四类壳（浏览器扩展 / nw.js / Electron 埋点法）的唯一权威源** ——
  扩展目录定位与 CRX 解包、Chrome 74+ 的离线安装限制与开发者模式、
  **「文案 → 语言文件 → 变量名 → 逻辑文件」定位四步**、三种许可校验形态（状态枚举 / 令牌解码 / 校验函数）与改法、
  **§1.7 另一条路：直接改本地已安装扩展的 JS、注入伪造权限对象**（`controller/setting.js` 的
  `(0, t.useContext)(i)` 改成先取 `temp`、塞 `temp.app.user = { roles: ["premium","member"] }` 再返回；改完刷新页面）、
  三个调试面（popup / content script / service worker）与 MV2→MV3 差异、「异常前下断点」技巧、
  打包私钥即身份与「新旧版本共存」的坑；
  nw.js 的 `is_nwjc` / `*.min.bin` 判据、**「文件校验才是拦路虎、MD5 不是加密」**、资源解密「能跑就不要逆」；
  Electron 的 `console.log` **顺序埋点法**与 Debugtron、以及「扣出来不对先怀疑还有一层」这条判据；
  末尾给**六条跨壳通用纪律**（改判断不改字符串 / 改赋值处不改消费处 / 绕过校验要恢复检测 / 备份 / 能跑就不要逆 / 解包成功 ≠ 拿到逻辑）。
- `scripts/asar_offset_repair.py`：识别 / 体检 / 修复 / 剥前缀，**零依赖**，
  `--selftest` **22 项**（合成归档 + 四类故障注入：前缀 / 数据段后移 / 长度虚高 / 目录被改，
  以及"非 asar 必须被拒""integrity 必须被识别"）。
- `scripts/jsc_xxtea_tool.py`：分类 + 流水线解密，**零依赖**，`--selftest` **29 项**
  （**XXTEA 双实现互证**、换长往返、gzip 分支、错 xor/xxtea key 的**假阳性门禁**、CLI 退出码契约）。
- `scripts/byte_flag_patch.py`：等长字节替换，默认 dry-run，`--selftest` **15 项**
  （dry-run 不落盘、长短不等必拒、`--expect` 不符不落盘且不留产物、备份逐字节一致、幂等退出码）。

## 与其它技能的边界

- **Web 前端的加密参数 / 签名 / 混淆**：本技能只负责"把桌面壳拆开、拿到可读代码"。
  拿到之后一律走 `web-reverse-algorithm`（纯算还原）、`web-reverse-hook`（CryptoJS / JSEncrypt / sm-crypto 拦截）、
  `ast-deobfuscation`（OB / VMP / 混淆还原）。
- **需要把客户端里的 JS 搬进 Node 跑**（补 `window`/`document`/`navigator`）：走 `web-js-env-patcher`。
- **Cocos 自带的 WebAssembly / 原生加密模块**（`.wasm`、`readPixels` 类）：走 `wsam-reverse`。
- **WebSocket 帧承载的业务数据**：走 `websocket-reverse`；**私有二进制帧**走 `protocol-reverse`。
- **流媒体 / DRM（Widevine、ClearKey、`mp4decrypt`、`.wvd`）**：走 `stream-drm-reverse`。
- **小程序（微信 / 抖音 / 支付宝）**：那不是桌面壳，走 `miniprogram-reverse`。
- **扩展 / 油猴脚本的「恶意行为定性」**（劫持、回传、返利）：本技能只负责**拆包与改校验**；定性走 `web-malware-forensics`。
- **页面上运行时的 Hook 与状态篡改**（Vue/Vuex 状态、全局注册表替换）：走 `web-reverse-hook`；本技能只做「把壳拆开拿到可读代码」。
- **网盘 / 文件站的直链解析**：走 `cloud-drive-direct-link`（与本技能的「客户端形态」不同）。
- **已知平台的现成蓝图**（成熟厂商签名）：先查 `reverse-knowledge`。
