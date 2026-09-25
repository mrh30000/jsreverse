# 非 Electron 壳层：WebView2、Cocos2D-JS 资源包、插件覆盖反调试

> **来源**：`52pojie-1921927`（WebView2 客户端资源爬取）、`52pojie-1657066`（PC 移植安卓的
> WebView 小游戏）、`52pojie-1307664` + `52pojie-1362276`（Cocos2D-JS 的 `assets/src` 布局）、
> `52pojie-1859296`（用浏览器插件屏蔽小游戏网站的反调试）、`52pojie-1926574`（Electron 的本地端口入口）。
> 这一族目标**没有 `app.asar`**，所以判据与处置完全不同：**它不用"解包"，它要"把前端抠出来"或"把调试口打开"**。

## 1. WebView2（`EmbeddedBrowserWebView.dll`）

### 1.1 判据

* 安装后**只有一个 exe**，界面风格是网页；
* x64dbg 附加后可见它加载了 **`EmbeddedBrowserWebView.dll`**（微软 Edge WebView2 运行时）；
* 该 dll 位于 `C:\Program Files (x86)\Microsoft\EdgeWebView\Application\<版本>\EBWebView\x64\`
  —— **不同版本不通用**（原文特别标注），要按目标机器上的版本取。

### 1.2 打开 DevTools：改虚表（原文做法）

`WebView2` 控件是 COM 运行时对象，文档给出的入口是 `OpenDevToolsWindow()`：

1. IDA 打开 `EmbeddedBrowserWebView.dll` + 加载符号，找到
   `embedded_browser_webview_current` 的虚函数 `OpenDevToolsWindow`；
2. 参考微软官方示例（`MicrosoftEdge/WebView2Samples` 的 `Win32_GettingStarted/HelloWebView.cpp`），
   看到初始化时会调 `Navigate`（**也是同一虚表里的虚函数**）；
3. **把虚表中 `Navigate` 的地址改成 `OpenDevToolsWindow`**，实现"启动即开工具"；
4. 在 dll 的 `.text` 段**末尾空闲区**写入跳转代码/补丁，x64dbg 打上补丁、替换 dll ⇒ DevTools 弹出。

**要点与风险**：
* 这是**版本绑定**的做法：换一个 WebView2 版本，虚表布局/地址会变，补丁全部失效；
* 原文的做法是"运行时打补丁 + 替换 dll"，**务必先备份原 dll**；
* 拿到 DevTools 后，直接在 **Sources 面板导出全部 JS 与资源**（比静态抠 dll 快几个数量级）。

### 1.3 抠出来之后怎么跑：虚拟域名 + 本地复现

原文的完整闭环（值得照抄的工程思路）：

1. 在 DevTools 的 Sources 里导出资源，**并记下它的虚拟域名**
   （WebView2 用 `SetVirtualHostNameToFolderMapping` 把本地目录映射成一个 http(s) 域名）；
2. 把官方示例 `Win32_GettingStarted` clone 下来，用 `SetVirtualHostNameToFolderMapping`
   把**虚拟域名映射到你导出的目录**，再 `Navigate` 过去；
3. 控制台报错就"回正常软件的 DevTools 里取正常环境值"逐条对齐；
4. 之后就能用 C++ 侧更灵活地改请求/注入 —— 原文的结论是：
   **比在 DevTools 里做本地覆盖更稳定**（本地覆盖会随应用重启丢失）。

## 2. WebView 类小游戏 / Cocos2D-JS 资源包

### 2.1 通用判据

`1657066` 的流程（PC 移植安卓的单机小游戏）几乎是这一族的**标准开局**：

1. 拖进 jadx → 检查加固 → 发现是 **WebView 组件**（不是原生游戏）；
2. 去 `assets/` 目录看 → 直接解压出来；
3. 解压后**直接双击跑不起来**（`file://` 与相对路径/跨域限制）；
4. **起一个 HTTP 服务**再访问就正常了：

```bash
python3 -m http.server 8088        # 然后在浏览器开 http://127.0.0.1:8088
```

5. 一旦在浏览器里跑起来 ⇒ **它就是网页游戏**，源码全文可搜，按 Web 逆向打（F12 断点、搜关键字）。

**Cocos 系的目录特征**（`1307664` + `1362276`）：
业务脚本在 `assets/src/`，后缀 `.jsc`（xxtea 密文，解密见
`references/jsc-and-v8-bytecode.md` §2）；`.luac` 也常出现（同一套 xxtea 思路）。

### 2.2 定位"要改哪一个值"

`1657066` 的做法值得复用（避免全量读代码）：

1. **先确定"我们要什么"**（灵石数量 / 金币 / 权限位），再去源码里**搜这个业务名词**；
2. 找到 `goldItemNumber` 这类**展示变量**后**不要就地改**，要**单步跟到真正参与消费的那一层**
   （原文原话：只改展示变量"仅仅展示变化，实际消费用不了"）；
3. 断点策略：`F11` 进函数（要看它怎么算）、`F10` 跳过（不关心）；
4. 字典型数据结构（`_items`）不知道 key 含义时，**三条快路**：
   ① 对照自己当前的数值猜 key；② 去配置文件里找该物品的 id 再对 key；
   ③ 继续跟解析逻辑（最费时，最后选）。
5. **搜索入口的选择**：从界面切入口（如"个人信息界面"）反查，比从代码顶部读起快。

## 3. 反调试小游戏站：插件覆盖而不是逐次手改

`1859296` 的场景：网页游戏站反调试，**只要开 DevTools 就无限触发断点**。
原文试过的三条路与结论：

| 做法 | 结果 |
| --- | --- |
| 在 `setInterval` 里下断点 + 控制台把相关函数置空 | **能用，但每次打开都要重做一遍** |
| 浏览器 DevTools 的 **override（本地覆盖）** | **失效**：脚本请求 URL 带随机数字，override 只能同名替换 |
| **浏览器插件 + `declarativeNetRequest`** | ✅ 一次配置长期有效 |

插件的文件结构（原文）：
```
manifest.json                       插件描述
rules_1.json                        declarativeNetRequest 规则（按 URL 匹配 → 重定向/替换）
AntiindulgenceDisableToolsUTF8.js   把原反调试脚本内容清空后的替身
service_worker.js                   后台脚本（命中规则时打日志，非必须）
```
规则命中后，网站的反调试脚本被替换为**空文件**，调试不再被打断。

**为什么这条路更优**：随机参数**打死了静态 override**，但打不死**在网络层重定向** ——
插件是在请求层改的，不关心 URL 里有没有随机数。

**审查提醒**：插件能力面很大（可改任意请求），只在你**明确知道目标与自己边界**时使用。

## 4. 本地监听端口：桌面客户端最便宜的入口（`1926574`）

很多桌面客户端（Electron、Tauri、WebView2）会起一个 **本地 HTTP 服务**：

```bash
netstat -na | findstr 127.0.0.1      # 找 ESTABLISHED 的本地连接
# 任务管理器 → 找到对应进程 → 详细信息 → 得到 PID，确认属于目标程序
```

拿到 `127.0.0.1:<port>` 后**直接用浏览器打开** ⇒ 就是"目标程序自己的那个网页"，
DevTools、断点、Sources 全都在，等价于 §1.3 的结果但**零成本**。
（`1926574` 的 CrackMe 就是这么开的：先 `netstat`，再选"点开界面时出现的那一个"进程，
其他 Electron 子进程打开没反应。）

**判断站内请求**：这类程序的业务请求往往发给自己这个本地服务；
如果请求确实发往远端，再回到"网络层接管"（
`references/electron-asar-and-fuses.md` §5.2）。

## 5. 客户端数值类目标的五条路线（按代价排序）

来自 `1657066` / `1926574` / `1859296` / `1307664` 的合并口径：

| # | 路线 | 适用 | 代价 |
| --- | --- | --- | --- |
| 1 | 本地端口 + DevTools 断点 | 有本地服务 | 极低 |
| 2 | 抠出前端资源 + 本地 HTTP 服务复现 | WebView/Cocos 静态资源 | 低 |
| 3 | 插件/代理在**网络层**改写脚本或响应 | 有反调试 / 随机 URL | 低 |
| 4 | 插件/代理改业务请求体（存档、数值） | 数值由服务端裁决 | 中 |
| 5 | 上原生调试（x64dbg / IDA / frida） | 无 JS 层、逻辑在原生 | 高 |

**优先级原则**：**先在浏览器/网络层解决，再上原生调试。** 原文的数次实测都表明：
能打开 DevTools 之后，所谓"加密"常常只是几行可读 JS。

## 6. 坑表

| # | 坑 | 判据 / 处置 |
| --- | --- | --- |
| 1 | 解压出来双击跑不起来就放弃 | 起 `python3 -m http.server` 再访问（§2.1） |
| 2 | 把 WebView2 当原生程序硬啃 | 先找 `EmbeddedBrowserWebView.dll`，走虚表开工具 |
| 3 | 直接替换 WebView2 dll 不备份 / 跨版本套用 | 版本绑定；**先备份**，同版本才可能通用 |
| 4 | DevTools 的 override 替换不生效 | 脚本 URL 带随机参数 ⇒ 改走插件 `declarativeNetRequest` |
| 5 | 只改展示变量 | 跟到真正参与计算/消费的那一层 |
| 6 | 找不到本地端口 | 应用可能是多进程，逐个 PID 试"点开界面时新建的那个" |
| 7 | 抠出来的资源跑起来一片报错 | 记下**虚拟域名**并 `SetVirtualHostNameToFolderMapping` 对齐 |
| 8 | 反复手改反调试脚本 | 用插件/代理在网络层覆盖，一次配好长期有效 |

## 7. 反例（不要做）

* ❌ 不要把"没有 asar"当成"没有前端"：WebView2 / Cocos / WebView 三种壳都能把前端抠出来。
* ❌ 不要一上手就上原生调试器：**先 `netstat` 找本地端口**，往往一步到位。
* ❌ 不要用 DevTools 的"本地覆盖"去对抗**带随机参数的脚本 URL**（实测必失败）。
* ❌ 不要跨版本复用 WebView2 的虚表补丁（原文明确"不同版本应该不通用"）。
* ❌ 不要改完展示层就宣称"破解成功"——**要验证消费路径也走你的值**。

## 8. Bun standalone 原生 exe（内嵌 JS）

> **来源**：`52pojie-2129831`（`Clxxde Code` 2.1.252 解混淆脚本，作者 Shadione）。
> 出问题的是 **Bun standalone 打包的原生 exe**，**不是 Electron / NW.js / pkg**，所以判据与处置在前三类之外单列。

### 8.1 判据（**只有能确认的两条**）

源文对形态只交代了一句：「Bun standalone 打包的原生 exe，内部 JS 全部经过 minify（标识符短名化）」。
据此**能确认的只有**：

* **单文件原生 exe**（不是"目录 + `app.asar`"，也不是 `nw.exe` + `index.html` 那种）；
* **exe 内部含 JS**，且这些 JS **全部经过 minify（标识符短名化）**。

⚠️ 源文**没有**给出 Bun 运行时 / 加载器 / 段布局等更细的特征，
**不要把源文没说的特征写成结论**；要判"是不是 Bun 打包"需另行取证（不在本文范围）。

### 8.2 分工：这一种该去哪个文件

* 目录里有 `app.asar` / `resources/app` / fuse 相关 ⇒ **Electron**，去 `references/electron-asar-and-fuses.md`；
* 启动器是 `nw.exe` / 有 `is_nwjc` / 加载 `*.min.bin`，或目标是浏览器扩展 ⇒ 去 `references/extension-and-nwjs.md`；
* **都不是、只有一个自带 JS 的原生 exe（且不是已知的 Node pkg 形态）⇒ 才是本节这一种**，
  再按 §8.3 决定"要不要把 JS 取出来"。

### 8.3 可迁移动作：先判"要不要取 JS 出来"，再决定路线

Bun standalone 的 **JS 藏在 exe 里**，两条分支互斥、**先决定再动手**：

1. **JS 是被 minify 的明文**（只有短标识符，没有控制流扁平化 / 字符串数组 / 不透明谓词）
   ⇒ 取出来之后走**解混淆**：`../../ast-deobfuscation/references/rename-sequence-replay.md`
   （「改名变换序列回放」，零结构改动、行为零变化）。
2. **JS 是字节码**（不是可读文本，而是 V8 code cache 一类）
   ⇒ 不走解混淆，改走**字节码路线**：`references/jsc-and-v8-bytecode.md`
   （该文件 §6 有 Node pkg 单文件 exe 的对应处置）。

> 判据一句话：**"取出来是能读的 JS" ⇒ 解混淆；"取出来是字节码" ⇒ 字节码路线。**
> 与 §1 的 WebView2、`references/electron-asar-and-fuses.md` 的 Electron 一样，
> 共同目标都是"先拿到可读代码"，再谈算法。
