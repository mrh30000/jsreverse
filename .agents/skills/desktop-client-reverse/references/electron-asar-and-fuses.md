# Electron / asar：壳层、加载优先级、完整性校验与运行时接管

> **来源**：`52pojie-2084047`（Typora v1.12.4 反反调试与激活劫持）、`52pojie-2085249`（同题的代码整理，
> **独立第二来源**）、`52pojie-2005677`（asar 加密包偏移修复）、`52pojie-1553861`（asar unpack 细节）、
> `52pojie-1926574`（Electron CrackMe）、`52pojie-1664417`（Electron 逆向实战）。
> 凡"两篇都写了"的结论都标了 **双源**。

## 1. asar 结构与偏移错位

### 1.1 布局（**先记住这个公式**）

```
[0:4)   u32le = 4                （固定值，用来识别"这确实是 asar"）
[4:8)   u32le = header_size      （= align4(4 + json_len)）
[8:12)  u32le = json_len
[12:12+json_len)  JSON 目录（files 树，每个叶子带 size 与 offset）
[8+header_size : …)  数据段 —— 各文件内容按 offset 排列

数据段起点 data_start = 8 + header_size
某文件内容位置        = data_start + offset
```

**关键认识**：`offset` 是相对 `data_start` 的，而 `data_start` 是由长度字段**算**出来的。
所以「整体偏 d 字节」⇔「`header_size` 少了/多了 d 字节」。**修长度字段就够了，不用搬字节**。

### 1.2 偏移错位的两种成因（`2005677` 实测）

| 现象 | 成因 | 处置 |
| --- | --- | --- |
| `asar extract` 直接报错（大小超额） | 归档**前面**多了字节（实测 25 字节），或包头长度虚高 | `strip-prefix --bytes 25` / `fix` |
| extract 成功但**每个文件首部都有同样一段垃圾** | 数据段起点整体偏了（`header_size` 与实际不符） | `check` 量 delta → `fix --out` |
| 只有 `package.json` 有垃圾、其他文件正常 | 只偏了一处 ⇒ **不可能是单一常数** | 回 §1.4 三问 |

原文中的手工处置：用 010Editor 删掉 archive 里那 25 字节（因为 `package.json` 是第一个文件，
删掉它前面的垃圾会让**后续所有文件偏移同时归位**），然后 `asar extract` 就正常了。
核心洞察是 **"第一个文件的偏移错 = 全体错"** —— 这正是本技能的 `check` 能用"抽样 n/n 命中"
推断单一 delta 的原因。

### 1.3 常用命令

```bash
npm i -g asar                     # 或 npx asar（无需全局安装）
asar list app.asar                # 看目录
asar extract app.asar app         # 解包
asar pack app app.asar            # 回包
```
`1553861` 的实践口径：解包/回包在 **Linux 上比 Windows 稳**（该帖的做法是 Ubuntu 虚拟机里操作）；
回包之后要重新处理完整性校验（§3）。

### 1.4 🔴 偏移不自洽时的三问（不要猜）

1. 归档前面是否加了前缀？（`identify` 会报）
2. 数据段里**每个文件自身**是否还有一层包装（另一种 magic/长度前缀）？
3. JSON 目录是否被改过（offset 被重写过，不可信）？

三问都排除后再考虑"单文件级"的偏移。**不允许"就近取一个 delta 试到能用"** ——
那相当于在未知结构上乱改，会制造"看起来能用、其实截断"的产物。

## 2. 加载优先级与 Electron Fuses

### 2.1 优先级（**双源**）

Electron 默认：`resources/app/`（目录）**优先于** `resources/app.asar`。
所以"把 `app.asar` 解包成 `app/` 目录、并把 `app.asar` 改名备份"就是最省事的落地手段 ——
改完直接跑你的代码，不必回包。

**但**：应用可以把这个顺序锁死。`2084047` 里 `package.json` 的 `main` 指向 `launch.dist.js`，
该文件只在 `app.asar` 里；只解包成 `app/` 时程序**无反应**，还原 `app.asar` 就恢复正常
⇒ 说明加载优先级被限制住了。

### 2.2 八个 Fuse（`2084047` 实测配置，`@electron/fuses`）

```
Fuse Version: v1
  RunAsNode is Disabled
  EnableCookieEncryption is Disabled
  EnableNodeOptionsEnvironmentVariable is Enabled
  EnableNodeCliInspectArguments is Disabled
  EnableEmbeddedAsarIntegrityValidation is Disabled
  OnlyLoadAppFromAsar is Enabled            ← 这就是"只准从 asar 启动"的开关
  LoadBrowserProcessSpecificV8Snapshot is Disabled
  GrantFileProtocolExtraPrivileges is Enabled
```

```js
// 临时 .cjs 文件（Node 环境执行）
const { flipFuses, FuseV1Options, FuseVersion } = require('@electron/fuses');
const fs = require('fs');
const fullPath = 'C:\\Program Files\\<App>\\<App>.exe';
fs.copyFileSync(fullPath, `${fullPath}.bak`);          // 先备份：fuse 会改哈希
flipFuses(fullPath, {
  version: FuseVersion.V1,
  [FuseV1Options.OnlyLoadAppFromAsar]: false,
});
```

**两个必须点破的坑**：
* `flipFuses` 会**改变可执行文件哈希**，所以"改 fuse"和"完整性校验"是**两件事**；
* fuse 关闭之后应用**仍可能**因为完整性校验失败而退出（见 §3），不要以为关掉 fuse 就完事。

## 3. 完整性校验与绕过（**双源**）

### 3.1 症状

改 `app/` 里的任何文件后程序能启动、**但几秒后自动退出**。
（"延迟几秒"本身就是判据：校验逻辑在 JS/字节码里，不在 exe 里 —— exe 里会立即退出。）

### 3.2 校验点（`2084047` 实测：`fs/promises.readFile` 读四个文件比对 hash）

```
resources/app/package.json
resources/app/launch.dist.js
resources/app/../page-dist/license.html
resources/app/../page-dist/static/js/LicenseIndex.<hash>.js
```

任何一处不匹配 ⇒ `app.quit()`。

### 3.3 绕过骨架：把 `resources\app\` 的读取重定向到备份目录

```js
// 注入到入口文件里、require 基础模块之后、加载 .jsc 之前
const fsPathFrom = /resources[\\/]app[\\/]/i;
const fsPathTo   = 'resources\\app.bak\\';
const fsHook = {};
['readFileSync','readFile','statSync','stat','Stats','StatsFs','open','openSync'].forEach((p) => {
  fsHook[p] = fs[p];
  fs[p] = function (filePath, ...args) {
    if (typeof filePath === 'string' && fsPathFrom.test(filePath)) {
      return fsHook[p].call(this, filePath.replace(fsPathFrom, fsPathTo), ...args);
    }
    return fsHook[p].call(this, filePath, ...args);
  };
});
const fspHook = {};
['readFile','open','stat'].forEach((p) => {
  fspHook[p] = fs.promises[p];
  fs.promises[p] = async function (filePath, ...args) {
    if (typeof filePath === 'string' && fsPathFrom.test(filePath)) {
      return fspHook[p].call(this, filePath.replace(fsPathFrom, fsPathTo), ...args);
    }
    return fspHook[p].call(this, filePath, ...args);
  };
});
```

**为什么能成**：校验方与被校验方**用的是同一个 `fs` 对象**（Node 模块 `require` 后有缓存，
再次 `require` 拿到同一对象）⇒ 只要在业务代码之前替换掉 `fs.promises.readFile`，
校验读到的就是"原件"。**注意 `fs/promises` 与 `fs.promises` 是同一个对象**，两条路径都要接。

**退路**：即使重定向失败，也可以拦住"主动退出"：
```js
Object.defineProperty(electron.app, 'quit', {
  value() { /* 记日志但不退出 */ }, writable: true, configurable: true,
});
// 同类：app.exit / process.exit / process.kill 视情况一并拦
```
代价：**用户也关不掉程序**（要用任务管理器），调完必须移除。

## 4. 入口注入骨架（顺序即正确性）

注入位置 = **`require` 基础模块之后、加载 `.jsc` 之前**，否则核心逻辑已经跑完：

```js
const LOG = '.\\hook.log';
const fs = require('fs');
const log = (...a) => fs.appendFileSync(LOG, '[' + new Date().toLocaleString() + '] ' + a.join(' ') + '\n');

const electron = require('electron');
Object.defineProperty(electron.app, 'quit', { value() { log('[拦截] app.quit()'); }, writable: true, configurable: true });
electron.app.on('browser-window-created', (_e, win) => {
  // 必须等 dom-ready：否则第一个窗口可能打不开 DevTools
  win.webContents.once('dom-ready', () => win.webContents.openDevTools({ mode: 'detach' }));
});
```

**判据**：日志里出现"检测到 BrowserWindow 实例化 + 打开 DevTools"，说明注入**早于**业务初始化。
若 DevTools 一直不弹，第一嫌疑是"注入晚了"或"完整性校验把你踢了"，**不要**先去怀疑 DevTools 参数。

## 5. 运行时接管面（按需求选，不要通读代码）

### 5.1 IPC 全量日志（`ipcMain.handle`）

```js
const skip = ['document.addSnapAndLastSync', 'document.setContent'];   // 高频噪音频道
const orig = electron.ipcMain.handle;
electron.ipcMain.handle = function (channel, listener) {
  const quiet = skip.includes(channel);
  return orig.call(this, channel, async (event, ...args) => {
    if (!quiet) log(`[IPC 请求] ${channel}`, JSON.stringify(args));
    try {
      const r = await listener(event, ...args);
      if (!quiet) log(`[IPC 响应] ${channel}`, JSON.stringify(r));
      return r;
    } catch (err) { if (!quiet) log(`[IPC 错误] ${channel}`, err); throw err; }
  });
};
```
**要点**：`invoke` ↔ `handle` 是两个方向；只打一处会漏掉返回值（返回值往往才是"判定结果"）。

### 5.2 网络：`electron.net.request` 与 `protocol.handle`

Typora 的实测结论：**核心请求几乎都走 `electron.net.request`**（而不是 `fetch`/XHR），
所以 Web 侧的 hook 打法在这里**不适用**。

```js
electron.app.whenReady().then(() => {
  electron.protocol.handle('https', async (request) => {
    log(`[net] ${request.method} ${request.url}`);
    try {
      const body = await request.clone().text();
      if (body) log('[net body]', body);
    } catch {}
    if (request.url === '<被拦截的校验 URL>') {
      return new Response(JSON.stringify({ success: true }),
        { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const response = await electron.net.fetch(request, { bypassCustomProtocolHandlers: true });
    const clone = response.clone();
    clone.text().then((t) => log(`[net resp] ${response.status} ${request.url}`, t.slice(0, 500))).catch(() => {});
    return response;    // 原样转发
  });
});
```
**坑**：转发时**必须** `bypassCustomProtocolHandlers: true`，否则会自己调自己（死循环）。

#### 5.2.1 激活类请求：**是一对端点，字段形状要对齐**（`52pojie-2109138`）

同一目标（Typora 激活劫持）在该篇里给出了**可直接对照的两段实现**，补上了本节骨架缺的三件事：

1. **要拦的是一对端点，不是一条**：`api/client/activate`（激活）+ `api/client/renew`（续期）。
   只伪造 `activate` ⇒ 当时激活成功、**下次续期又掉**（该篇 v1.0 的修复项之一正是"一段时间后掉激活"）。
2. **两个端点的响应字段不一样**，照抄一个会失败：

   | 端点 | 响应体（原文形态） |
   | --- | --- |
   | `…/api/client/activate` | `{"code":0,"retry":true,"msg":"${StandardLicenseMsg}"}` |
   | `…/api/client/renew` | `{"success":true,"code":0,"retry":true,"msg":"${StandardLicenseMsg}"}` |

   ⇒ **字段形状必须从客户端的消费方反推**（谁读了 `success`？谁读了 `retry`？），不要凭"看起来像"编。
   两段合并成一个 `if (includes(a) || includes(b))` 没问题，**但响应体要按端点分别给**。
3. **注入代码不要顺手改业务状态文件**：该篇 v1.0 明确修掉一个**自伤**行为 ——
   早期注入会在 `.md` 同目录生成调试日志与 `id` 文件，而**删掉 `id` 文件会导致激活失效**。
   ⇒ 注入点只做"拦 + 记"，**不要在同目录写/删业务文件**；调试日志写到独立目录。

两条工程口径（同篇版本记录，可直接当 checklist）：

- **要有回滚**：脚本应"检测到已激活 / 中途出错 ⇒ 回滚到备份"。
  一次失败留下半改状态，比不改更难查（也是"改完没反应"类问题的常见真因）。
- **依赖要锁版本**：Node 版脚本的 `chalk` 必须锁 `chalk@4`（新版不兼容）⇒
  复现他人脚本时**先锁依赖**，别把"依赖不兼容"误判成"思路错了"。

## 6. 黑盒推导"解密后应该长什么样"

拿到"解密函数"但不知道明文结构时的三步法（`2084047` 实测流程）：

1. **接管返回值**：`crypto.publicDecrypt = () => 假的 Buffer`，看程序怎么用它。
2. **观察消费方式**：用 `Proxy` 包住假返回值，先看是"直接比对 Buffer"（会调 `Buffer.compare/equals`）、
   "二次哈希"（会调 `crypto.verify/createHash`）、还是"转字符串"（`Buffer.toString('utf8')` + `.length`）。
3. **继续下钻**：转成字符串之后若仍不通过，就 `Proxy` 掉 `JSON.parse` 的产物，
   记录**读了哪些属性** —— 这一步直接给出字段清单：
   `deviceId / fingerprint / email / license / version / date / type`。

```js
return new Proxy(Buffer.from('test'), {
  get(t, p, r) {
    const v = Reflect.get(t, p, r);
    if (typeof v === 'function') {
      return new Proxy(v, { apply: (fn, thisArg, args) => Reflect.apply(fn, t, args) });
    }
    return v;
  },
});
```

**配套的"输入侧"取证**：界面上的 `Machine Code` 是 base64（`atob` 即得），
解出来是 `{"v":"win|1.12.4","i":"<指纹>","l":"<设备串>"}` ⇒ `v`=version、`i`=fingerprint、`l`=deviceId。
把这个映射回第 3 步得到的字段清单，激活码的**结构**就齐了（值可以是占位）。

> 这一节的方法论价值高于具体结论：**"拿不到私钥"不等于"做不了"** ——
> 只要判定发生在本地，接管"判定输入"或"判定输出"都能过。

## 7. 本地端口与反调试（`1926574` / `1664417`）

* **先看本地端口**：`netstat -na | findstr 127.0.0.1` ⇒ 找到 `ESTABLISHED` 的本地连接与 PID
  （任务管理器 → 详细信息），浏览器里直接访问那个 `127.0.0.1:<port>` 就是"目标程序自己的网页"。
  比在 exe 上硬啃快得多（`1926574` 就是这个入口）。
* **图标/进程有多个**（Electron 是多进程）：选"点开界面时出现的那一个"，其他进程没反应。
* **`F12` / `Ctrl+Shift+I` 打不开**：被 `document.addEventListener('keydown', …preventDefault())` 挡了；
  从菜单"更多工具 → 开发者工具"仍可打开。
* **无限 `debugger`**：定位到那行 `(_0x…('debu'+'gger'))(...)`，改法是**破坏表达式**而不是删整行：
  把 `'debu'+'gger'` 改成 `'debu'+'gge'`（`2084047` 的 CrackMe 实测）——
  直接删/注释那行会导致后续依赖它的代码进入奇怪分支（"时行时不行"）。
* **`--inspect` / `--debug` 启动即退出**：程序检测启动参数，属于反调试；不要硬刚参数，
  走"解包 + 注入 + 自己开 DevTools"。

## 8. 17 条坑表（本文件全部来源汇总）

| # | 坑 | 判据 / 处置 |
| --- | --- | --- |
| 1 | 解包报错=加密 | 先 `identify/check`：**结构问题不是加密问题** |
| 2 | 每个文件首部同样一段垃圾 | 数据段起点整体偏了 → `fix` |
| 3 | 只手改 JSON 的 offset | 只改 `header_size` 字段即可，改 offset 会破坏结构 |
| 4 | 忽略 `integrity` | 有该字段 ⇒ 必须同时处理 fuse，否则加载被拒 |
| 5 | 只解包不改加载顺序 | `OnlyLoadAppFromAsar` 开着时**必须** `flipFuses` |
| 6 | `flipFuses` 前没备份 | 会改 exe 哈希，不可逆（对签名有效性的影响要自己评估） |
| 7 | 改了 JS 程序 3 秒后退出 | 完整性校验：`fs.promises.readFile` 重定向到 `app.bak/` |
| 8 | 只拦 `fs.readFile` 没拦 `fs/promises` | 两条路径是同一对象，**都要接** |
| 9 | `app.quit` 拦住后关不掉程序 | 正常现象，调完移除 |
| 10 | DevTools 弹不出来 | 注入点太晚 / 未等 `dom-ready` / 校验已触发 |
| 11 | `protocol.handle` 转发死循环 | `bypassCustomProtocolHandlers: true` |
| 12 | 以为 Web 侧 hook 能用 | 该应用走 `electron.net.request`，与 `fetch`/XHR 无关 |
| 13 | 激活当时成功、**下次续期又掉** | 只拦了 `activate`，没拦 `renew`；两个端点都要伪造，且**字段形状按端点分别给**（§5.2.1） |
| 14 | 改完注入点后**原本正常的激活反而失效** | 注入代码在同目录写了/删了业务状态文件（如 `id`）⇒ 调试日志写独立目录，别碰业务状态（§5.2.1） |
| 15 | Web 端算法刚还原完就被热更新作废 | **同站多端时先逆「更新慢」的那一端**（§9 判据一） |
| 16 | 为了借壳加密模块，把整套会话态也搬了进来 | 借壳前提是「**加密模块不依赖 token/cookie/指纹**」；依赖则转补环境或纯算（§9 判据二） |
| 17 | 花大工夫重算一个指纹头 | **先翻 cookie / 本地存储**：服务端下发的画像值常常直接回带（§9 判据三） |

## 9. ★★★ 同站多端：**优先逆「更新慢」的那一端**（`52pojie-2031462`）

**来源** `52pojie-2031462`（某音频站，源文自陈「严格来说这不算真正的 js 逆向，算是捞了一次偏门」）。
源文的三个动作按顺序抄下来，就是本节的全部内容：

```text
1. 看接口：web 版和 windows 桌面版**用的是同一个接口**
2. 看更新节奏：**web 版更新频繁，windows 要比 web 更新慢**
3. 看一眼 windows 程序的结构 → 一眼 Electron → asar 解包
4. 解包后在 app 目录里找到 `X.X.X.js`（就是计算 `xm-sign` 的那个文件）
5. 主计算逻辑是「cid + kdf 两个参数 → 请求后台校验接口 → 返回结果再加密解密得到 sign」
   ⇒ 源文原话：「**太复杂太复杂，懒得搞**」
6. 处置：**「直接采用 js 的方式引用这个 x.x.x.js，修改修改调用方法完美解决」**
   —— 源文补了一句理由：**「因为 sign 加密不涉及 token 信息，不需要自己再重写加密方法」**
```

> ★★★ **判据一（选端）：同一个站点/服务同时提供 Web 与桌面（或 App）客户端、
> 且两者共用同一后端接口时，先逆「更新慢」的那一端。**
> 理由：逆向产物的寿命 = 目标端的更新周期。Web 端热更新、客户端发版慢 ⇒
> **同一份算法，在客户端上能用的时间更长**。这与 §1 的「先解包读源码」是同一个成本逻辑，
> 但**选端的收益更高**（决定的是「一次劳动能撑多久」）。
> 落地动作：先用同一接口在两端的抓包**逐字段比对**（源文用「同接口」三个字就完成了这一步），
> 确认参数名与结构一致后再决定逆哪端。

> ★★★ **判据二（借壳）：加密模块**不涉及会话态**时，直接 require 它的 JS 文件、改调用方式，
> 不要重写算法。**
> 源文原话的关键前提是「**sign 加密不涉及 token 信息**」——**这就是可借壳的判据**：
> - 模块**只依赖静态入参**（`cid` / `kdf` 这类站点常量）⇒ **可借壳**；
> - 模块依赖 `token` / cookie / 本地存储 / 设备指纹 ⇒ 借壳会连带搬来一整套环境，
>   **此时应转 `../../web-js-env-patcher/`**，或按 `web-reverse-algorithm` 的纯算路线还原。
>
> ⚠️ **借壳 ≠ 交付**：源文自己也只把它当"能跑就行"的偏门（且没有给完整代码）。
> 本仓的交付口径仍然是**「能离线复算」**（见 `../../web-reverse-algorithm/references/18-native-layer-algorithm-restore.md` §4.1 判据 2）：
> 借壳用于**先拿到可用的 sign 以打通链路**，之后再有选择地还原。

> ★★ **判据三（指纹头先翻 cookie，再谈重算）**：源文对 `wpf`（据称由浏览器/系统信息加密后
> 请求接口再加密得到）的处置是「**好在这个就直接在 cookie 里面就有，拿过来直接用**」。
> ⇒ **服务端下发的指纹/画像值，通常会以 cookie 形式回带**；
> 拿到一个"看起来要重算"的头时，**第一步是去 `document.cookie` / 请求头 / 本地存储里找有没有现成的**，
> 找不到再谈重算。这是「能拿现成的就不要算」在**头字段**上的特例。

> ⚠️ **本条的边界**：源文**没有给完整代码**（只有调用截图），也没有说明 `cid` / `kdf` 的取值来源
> （原话「自己去源码里找吧，很明显就能看到」）。⇒ 本库**只登记上述三条判据**，
> **不登记任何具体参数值或算法实现**。

## 10. 反例（不要做）

* ❌ 不要"先怀疑加密，再怀疑结构"。asar 场景里**结构问题**出现频率远高于加密。
* ❌ 不要只备份被改的那个文件就动手 —— 完整性校验比的是**一组**文件，要整目录备份（`robocopy app app.bak /E`）。
* ❌ 不要指望"改完源码回包"一步到位：回包会覆盖 asar 哈希，**又回到完整性校验**；
  先用"目录优先 + 重定向"跑通，再考虑回包。
* ❌ **不要预设桌面端一定有混淆 / 一定要反混淆**。有实测案例的结论就是
  「没有混淆、没有 AST，过程非常简单」（`52pojie-1664417`）——**先解包读源码，再决定要不要上反混淆**；
  预设「必须反混淆」会把简单任务做成大工程。
* ❌ 不要把 fuse 与完整性校验当成二选一：**先关 fuse（让目录生效），再骗过校验（让它不退出）**，
  两件事都做齐才能稳定调试。
