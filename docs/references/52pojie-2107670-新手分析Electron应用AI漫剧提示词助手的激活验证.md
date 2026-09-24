# 新手分析Electron应用AI漫剧提示词助手的激活验证

> **作者**: a3341736201 | **发布时间**: 2026-05-14 13:08:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 2004 / 21
> **原文**: [https://www.52pojie.cn/thread-2107670-1-1.html](https://www.52pojie.cn/thread-2107670-1-1.html)

---

*本帖最后由 a3341736201 于 2026-5-15 19:40 编辑*

我是小白，大家看个乐子，今天在一个公众号看到有人写了吸引人的标题“小白也能快速入门做ai漫剧”
点进去一看，要钱，而且是会员制，并api还是用的中转，费用还挺贵的，于是我打开逆向环境虚拟机 开干！

![](https://attach.52pojie.cn/forum/202605/14/122315syuqcwve48pq6qqd.png)

我们看整体的包结构，很明显就是Electron的产物，特别是在\resources 里面 有他app.asar

![](https://attach.52pojie.cn/forum/202605/14/122435cf559hf8h88fe58j.png)

所以我可以很明确的确定 他就是Electron的产物
Electron 应用打包后，核心代码都压缩在一个叫 `app.asar` 的文件里（405MB）。这个 asar 其实就是个特殊格式的压缩包，用官方工具一行命令就能解开。
我们先解包

安装npm（至于如何安装，网上教程很多，不赘述）
帮我安装这个：npm install --engine-strict asar
安装好npm后执行命令安装asar：npm install asar -g
然后目录下 就解包出源文件了

![](https://attach.52pojie.cn/forum/202605/14/122651gcmlygssqfmw0log.png)

然后我们看package.json

"name": "ai-manju-prompt-helper",
"version": "1.10.0",
"private": true,
"description": "AI漫剧提示词助手 - Electron + Vue desktop app",
"main": "electron/main.js",
"type": "module",
"dependencies": {
"@element-plus/icons-vue": "^2.3.2",
"archiver": "^5.3.2",
"axios": "^1.15.0",
"builder-util-runtime": "^9.2.4",
"electron-updater": "^6.8.3",
"element-plus": "^2.13.7",
"jimp": "^1.6.1",
"three": "^0.184.0",
"vue": "^3.5.13"

可以看到 "main": "electron/main.js", 这里就是我们的入口文件，我们重点看这里
然后我们就搜索 http

async function lt(e, t = "") {
if ((Ce("loadRendererWindow:start", { isDev: ue, search: t }), ue))
return (
await e.loadURL(`http://localhost:5173${t}`),
e.webContents.openDevTools({ mode: "detach" }),
void Ce("loadRendererWindow:dev-loaded")
);
const r = new URL("../dist/index.html", import.meta.url);
((r.search = t.startsWith("?") ? t.slice(1) : t),
Ce("loadRendererWindow:loading-url", r.toString()),
await e.loadURL(r.toString()),
//e.webContents.openDevTools(),
Ce("loadRendererWindow:loaded"));
}

这里的这里的代码意思呢 就是 看以下ai的回答

// 定义一个异步函数 lt，接收两个参数：
// e = Electron 窗口对象（BrowserWindow）
// t = 路由/查询参数（默认空字符串）
async function lt(e, t = "") {

// 1. 埋点日志：记录开始加载渲染窗口
Ce("loadRendererWindow:start", { isDev: ue, search: t });

// 2. 判断是否是【开发环境】（ue = isDev，开发环境标识）
if (ue) {
// 开发环境走这里：
await e.loadURL(`http://localhost:5173${t}`); // 加载本地 Vite 开发服务器
e.webContents.openDevTools({ mode: "detach" }); // 自动弹出独立的开发者工具
Ce("loadRendererWindow:dev-loaded"); // 埋点：开发环境加载完成
return; // 结束函数
}

// 3. 非开发环境 = 生产环境，走这里
// 拼接打包后的 HTML 文件路径：项目根目录/dist/index.html
const r = new URL("../dist/index.html", import.meta.url);

// 给文件 URL 拼接查询参数（比如 ?id=123）
r.search = t.startsWith("?") ? t.slice(1) : t;

// 埋点日志：正在加载生产环境页面
Ce("loadRendererWindow:loading-url", r.toString());

// 真正加载本地打包好的 HTML 文件
await e.loadURL(r.toString());

// 埋点日志：生产环境页面加载完成
Ce("loadRendererWindow:loaded");
}

ok既然知道意思，那就很简单，因为我们要调试嘛，肯定要正式环境页面，那就要开调试模式，我们用到
e.webContents.openDevTools()

你们看代码我已经贴了上去，然后重新打包回去替换 ，我们运行看看

![](https://attach.52pojie.cn/forum/202605/14/123555lugz5ivuxkv1mkik.png)

调试模式已经打开了，现在就很好做啦
然后我们重点关于俩个文件：
`index-BGUn5-\_A.js` — 前端所有逻辑，包括验证判断都在里面
- `electron/licensing.js` — 后端的授权模块
进去后
代码很多，12w行，肯定不可能一行的看，然后我就打开调试工具
利用关键词定位大法，他既然提示失败 我就看提示失败代码

async function Kw() {
var V, ue, Le;
if (
!(
(V = window.desktopAPI) != null && V.getUnifiedActivationStatus
) &&
!((ue = window.desktopAPI) != null && ue.getActivationStatus)
) {
((S.loading = !1), (S.activated = !0));
return;
}
S.loading = !0;
const O =
(Le = window.desktopAPI) != null && Le.getUnifiedActivationStatus
? await window.desktopAPI.getUnifiedActivationStatus()
: await window.desktopAPI.getActivationStatus();
((S.source = O.source || ""),
(S.reason = O.reason || "not\_activated"),
(S.entryMode =
O.activationEntryMode || S.entryMode || "license\_key"),
(S.registrationCode =
O.registrationCode || S.registrationCode || ""),
(S.licenseKeyMasked = O.licenseKeyMasked || ""),
(S.expiresAtMs = O.expiresAtMs || 0),
(S.activated = !!O.activated),
(S.locked = O.reason === "time\_tampered"),
(S.usingOfflineCache = O.usingOfflineCache === !0),
(S.lastOnlineCheckSucceeded = O.lastOnlineCheckSucceeded === !0),
!S.activated &&
S.source === "license\_key" &&
(S.entryMode = "license\_key"),
An(
O.activated
? ""
: O.message ||
(S.entryMode === "license\_key"
? "请输入卡密完成激活。"
: "请复制注册码并输入与你的授权时长匹配的激活码。"),
),
(S.loading = !1),
S.activated && (await sp()));
}

然后审查代码：
第1段：检查 API 是否存在

Javascript

if (!(window.desktopAPI?.getUnifiedActivationStatus) &&
    !(window.desktopAPI?.getActivationStatus))
如果两个激活检测 API 都不存在（比如 preload 没注入），直接设置 loading=false, activated=true，当作已激活放行
第2段：调用 API 获取激活状态

Javascript

S.loading = true;  // 显示加载中
const O = await window.desktopAPI.getUnifiedActivationStatus()  // 优先用统一激活接口
        ?? await window.desktopAPI.getActivationStatus();         // 回退到旧接口
第3段：解析返回结果

Javascript

S.source = O.source || ""              // 激活来源
S.reason = O.reason || "not\_activated" // 未激活原因
S.entryMode = O.activationEntryMode    // 激活方式：卡密 or 注册码
S.registrationCode = O.registrationCode // 注册码
S.licenseKeyMasked = O.licenseKeyMasked // 卡密（脱敏显示）
S.expiresAtMs = O.expiresAtMs || 0     // 过期时间
S.activated = !!O.activated            // 是否已激活（核心字段）
S.locked = O.reason === "time\_tampered" // 时间被篡改则锁定
第4段：处理未激活提示

Javascript

if (!S.activated && S.source === "license\_key")
    S.entryMode = "license\_key";

An(O.activated ? "" : O.message ||
    S.entryMode === "license\_key"
    ? "请输入卡密完成激活。"
    : "请复制注册码并输入与你的授权时长匹配的激活码。");
未激活时显示对应提示文案
第5段：激活成功后

Javascript

if (S.activated) await sp();  // 执行激活成功后的逻辑
一句话总结：检查激活状态 → 显示加载 → 拿结果 → 判断激活/未激活 → 显示对应 UI。

翻译成大白话就是：

1. 先检查有没有验证方法 → 没有就直接当已激活（搞笑吧）
2. 有的话调用 API → 问服务器"这个用户激活了没？
3. 根据返回结果→ `S.activated = !!O.activated`，一句话决定你的命运
4. 最后 → 只有 `S.activated` 为 true 才加载用户数据（设置、库、项目等）
ok知道逻辑了 Kw() 是核心验证函数
找的时候  顺藤摸瓜，找到在线定时验证，
找到 $g() 函数（定时器调度）

找到 $g() 函数（定时器调度）

```
function $g() {
  Fg();                    // 清除上一个定时器
  const O = hL();          // 获取随机间隔时间
  C = window.setTimeout(async () => {
    try {
      await mL();          // 执行在线验证
    } finally {
      S.activated && $g(); // 如果还是激活状态，继续安排下一次验证
    }
  }, O);
}
```

就是个 `setTimeout` 递归调用，每隔一段时间执行一次 `mL()`。

javascript
async function mL() {
var V, ue, Le, it, Ye;

// 检查有没有在线验证的 API 方法
if (
!(
(V = window.desktopAPI) != null && V.verifyActivationStatusOnline
) &&
!(
(ue = window.desktopAPI) != null && ue.getUnifiedActivationStatus
) &&
!((Le = window.desktopAPI) != null && Le.getActivationStatus)
)
return;

// 调用在线验证（三种 API，哪个有就用哪个）
const O =
(it = window.desktopAPI) != null && it.verifyActivationStatusOnline
? await window.desktopAPI.verifyActivationStatusOnline()
: (Ye = window.desktopAPI) != null &&
Ye.getUnifiedActivationStatus
? await window.desktopAPI.getUnifiedActivationStatus()
: await window.desktopAPI.getActivationStatus();

if (
((S.source = O.activated
? O.source || S.source
: String(O.source || "").trim()),
(S.reason = O.reason || "not\_activated"),
(S.entryMode = V.activated
? V.activationEntryMode || S.entryMode || "license\_key"
: jw(V)),
(S.registrationCode =
V.registrationCode || S.registrationCode || ""),
(S.licenseKeyMasked = V.licenseKeyMasked || ""),
(S.expiresAtMs = V.expiresAtMs || 0),
(S.activated = !!V.activated),              // ← 又是这句！直接覆盖本地状态
(S.locked = V.reason === "time\_tampered"),
(S.usingOfflineCache = V.usingOfflineCache === !0),
(S.lastOnlineCheckSucceeded =
V.lastOnlineCheckSucceeded === !0),
!V.activated)
) {
// 验证失败 → 设为未激活，踢回登录页
((S.activated = !1),
(S.locked = O.reason === "time\_tampered"),
An(O.message || "授权已失效。"),
);
return;
}
// 验证成功
((S.activated = !0), (S.locked = !1));
}

#### 找到 uL() 函数（手动触发的在线验证）

```
async function uL() {
  var O;
  if ((O = window.desktopAPI) != null && O.verifyActivationStatusOnline)
    try {
      const V = await window.desktopAPI.verifyActivationStatusOnline();
      ((S.source = V.activated
        ? V.source || S.source
        : String(V.source || "").trim()),
        (S.reason = V.reason || "not_activated"),
        (S.entryMode = V.activated
          ? V.activationEntryMode || S.entryMode || "license_key"
          : jw(V)),
        (S.registrationCode =
          V.registrationCode || S.registrationCode || ""),
        (S.licenseKeyMasked = V.licenseKeyMasked || ""),
        (S.expiresAtMs = V.expiresAtMs || 0),
        (S.activated = !!V.activated),            // ← 同样直接覆盖
        (S.locked = V.reason === "time_tampered"),
        (S.usingOfflineCache = V.usingOfflineCache === !0),
        (S.lastOnlineCheckSucceeded =
          V.lastOnlineCheckSucceeded === !0),
        // 未激活时的处理逻辑...
        An(
          V.activated
            ? ""
            : V.message || "激活状态校验失败，请重新登录。"
        ),
        V.activated && (await sp()));
    } catch (V) {
      An(V instanceof Error ? V.message : "激活状态校验失败，请重新登录。");
    }
}
```

以上就是找的流程，并且我使用ai注释了 ，反正大体要学会看代码，然后我们就开始手动改啦，下面是我的踩坑过程
因为我打开了调试模式，
Console 里输入：

```javascript
S.activated = true;
sp();
```

报错了：

```
Uncaught ReferenceError: S is not defined

![](https://attach.52pojie.cn/forum/202605/14/125441dzlim3o2jaikxjkt.png)

好吧，不懂换 ！
ps：事后找资料复盘，为什么？因为这个 JS 是用 `type="module"` 加载的，`S` 是模块内部的变量，Console 在全局作用域，访问不到。

> 这不是什么安全措施，只是 ES Module 的特性。模块里的 `var`、`const`、`let` 都不会挂到 `window` 上。
那就改源码！我们流程就是这样：从asar 里解出 JS ---改 JS---改 JS---重新打包成 asar---替换原来的 asar

好的，流程理清楚了
开始改

第 1 处：Kw() 函数 — 跳过启动验证\*\*

```
// ===== 修改前 =====
async function Kw() {
  var V, ue, Le;
  if (
    !(...

// ===== 修改后 =====
async function Kw() {
  ((S.loading = !1), (S.activated = !0)); return;    // ← 加了这一行
  var V, ue, Le;
  if (
    !(...
```

效果：函数一进来就设 `activated = true` 然后 `return`，后面的验证逻辑全都不执行。

第二处：

**第 2 处：uL() 函数 — 跳过手动在线验证**

```
// ===== 修改前 =====
async function uL() {
  var O;
  if ((O = window.desktopAPI) != null && O.verifyActivationStatusOnline)

// ===== 修改后 =====
async function uL() { return;    // ← 加了这一行
  var O;
  if ((O = window.desktopAPI) != null && O.verifyActivationStatusOnline)
```

**第 3 处：mL() 函数 — 跳过定时轮询验证**

```
// ===== 修改前 =====
async function mL() {
  var V, ue, Le, it, Ye;
  if (

// ===== 修改后 =====
async function mL() { return;    // ← 加了这一行
  var V, ue, Le, it, Ye;
  if (
```

把修改后的 JS 复制进去覆盖原文件，源文件记得备份

然后我们开始运行看看 ！

![](https://attach.52pojie.cn/forum/202605/14/130243r0k37cg6chleb7hy.png)

其实我觉得这个只是把相关提示词写灵活了，也算辅助，但是者github 不是有很多吗，这都要圈钱，ai生成费用还是单独另算的.......
{:301\_1010:}
有点黑 圈小白
总结：花了俩小时学习的，我太菜了 也是第一次发帖希望得到各位师傅的指教，软件就不放了，就是很简单的提示，ai还是用别人中转的，咱们就不要给别人引流消费，，谢谢各位老师，希望能得到各位的评分！！
