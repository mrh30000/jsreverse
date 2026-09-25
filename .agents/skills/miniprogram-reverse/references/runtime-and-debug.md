# 运行时调试、云函数与原生层（唯一权威源）

一句话：**静态解包能解决 80%，剩下 20% 必须让代码跑起来。**
剩下那 20% 的典型长相是：**云函数**（`wx.cloud.callFunction`）、**参数在原生桥生成**（`wx.login` 的 `code`）、
**包里被加固到解不出 `app.json`**、**校验文件导致改包失效**。

> 包与解包见 `unpack-and-decrypt.md`；请求签名见 `request-crypto-and-sign.md`。

---

## 1. 三条调试入口（按代价从低到高）

| 入口 | 适用 | 做法 | 代价 |
| --- | --- | --- | --- |
| **微信开发者工具** | 工程能跑起来 | 导入解包目录 → 修好编译错误（`unpack-and-decrypt.md` §5）→ 直接打断点/看 Storage | 低，但要先修工程 |
| **远程调试（真机/PC 微信）** | 工程修不出来、要打真机 | 真机微信里打开 `http://debugxweb.qq.com/?inspector=true`，PC 上 `chrome://inspect/#devices` 或 `edge://inspect/#devices`；工具方案 `WeChatOpenDevTools` | 中；PC 端最省事 |
| **原生层（x64dbg / frida / Xposed）** | 云函数、原生桥、GCM 加密体 | 附加 `WeChatAppEx.exe`（PC）或 `com.tencent.mm:appbrandN`（安卓） | 高，但覆盖最后 20% |

**PC 端 x64dbg 一条有用经验**：`WeChatAppEx.exe` 会**同时起多个进程**，
必须附加**标题里有小程序名字**的那个（"找有小程序标题的那个附加"），否则断点永远不触发。

---

## 2. 断点套路：sign 与 body 各断在哪

1. **先抓包拿到 URL 与参数名**，再全局搜。**不要从 `app-service.js` 顶部往下读。**
2. **`sign` 在请求头** ⇒ 断在 `XMLHttpRequest.setRequestHeader`（或站点自己的拦截器封装）；
   **`sign` 在 body** ⇒ 搜字段名，断在赋值那一行。
   常用一手：搜索 `xhr` / `send` / `open` / `.setRequestHeader`；找到站点自己的 `request` 封装往往一步到位。
3. **响应体加密** ⇒ 按调用栈回到**回调**：常见形态是 `R.response` 处断（`R` 就是 `XMLHttpRequest`），
   或在 `success` 回调里断，再跟栈到 `AESDecrypt` / `decrypt`。
4. **断点打不上的处理**：同一个关键词搜出 5 处，**前几处打不上是正常的**（其他页面/未执行的打包模块）——
   打最后一个、刷新页面，能断下来说明就是它。**不要因为"打不上"就换关键词。**
5. **"页面点不动也照样能逆"**：sign 多数**在本地生成**（时间戳 + 本地常量 + 缓存 token），
   所以即便请求被合法域名校验拦下、页面报网络错误，**在生成处断点依然能拿到完整入参**。
   实测确证：搜索接口触发不了，改点其它页面/搜索框就触发了。

**常用关键词优先级**：接口路径片段 > 参数名（`sign`/`nonceStr`/`Checksum`/`x-*`）> 算法名（`encrypt`/`decrypt`/`aes`/`md5`/`hmac`）。

---

## 3. 云函数（`wx.cloud.callFunction`）：抓包拿不到结果

**症状**：走云开发（`app.js` 里能确认）的小程序，抓包**看不到业务数据**，因为数据不走普通 HTTPS 接口，
而是走微信自身的云通道。⇒ 只能**改包 + RPC**。

标准流水线：

```
① 解包（unveilr，可加 --no-parse 减少解析问题）
      unveiler wx --no-parse -f "__APP__.wxapkg"
② 找入口：在 app-service.js 里搜 "app.js"
③ 开 debug + 注入探针：注入到 onLaunch 回调
      - 打开 vConsole（方便看输出）
      - 直接包一层 wx.cloud.callFunction：
          const oldCloud = wx.cloud, oriCF = oldCloud.callFunction
          oldCloud.callFunction = function (config) {
            const _success = config.success
            config.success = function (res) { console.log('callFunction===>', res); _success(res) }
            oriCF(config)
          }
④ 重打包（加 -w 便于反复改）
      unveiler wx -wp "__APP__"
⑤ 重打包会失效 ⇒ 用 frida 把完整性校验比较点掰直（见下）
⑥ 重启小程序 ⇒ 云函数请求全部打出来；再接个 websocket 外发，就得到 RPC
```

**重打包后"加载失败"的根因与处置**：小程序会比对文件的 MD5/哈希（同 `unpack-and-decrypt.md` §6）。
- 处置是 **frida 附加 `WeChatAppEx.exe`，在"拿原始 MD5 与当前 MD5 比较"的地方把当前值覆盖成原始值**。
- 这类脚本**强依赖 `RadiumWMPF` 版本**（实测样本是 `RadiumWMPF = 6945`，脚本里写死了 RVA）。
  **换版本必须重新定位该点**，直接抄脚本大概率无效。
- 另一条更省事的路：**不改包**，直接 MITM 改响应（见 §5）。

---

## 4. 原生层：hook 小程序的网络/桥

### 4.1 安卓：必须指定小程序进程

- 小程序**以独立进程**运行：`com.tencent.mm:appbrand0` … `:appbrand4`（**最多 5 个**；开第 6 个会顶掉最久未用的）。
- ⇒ `frida -U com.tencent.mm -l x.js` 或 `objection -g com.tencent.mm explore` **会 hook 到主进程，什么也看不到**。
  **必须用 pid**（或按进程名匹配 `appbrandN`）。
- ⚠️ **模拟器登录微信会封号**（实测结论）⇒ 用 PC 版微信或真机。这条决定了"能静态度就不要上模拟器"。

### 4.2 安卓：`wx.*` API 的 Java 层对应物

- 原理：小程序由 **WebView + JSBridge** 承载，`wx.*` 由 `WxJsApiBridge` 提供，所以**可以 hook Java 层**。
- **`wx.request` 在 Java 层不叫 `request`**（`String NAME = "getLocation"` 这种直接搜得到的反而好找）。
  搜索思路：先定位 `com.tencent.mm.appbrand.commonjni.AppBrandJsBridgeBinding`，再 hook 该类看调用。
- 目标只是**要请求/响应数据**时：与其 hook Java，不如**MITM 或开发者工具**。

### 4.3 PC：抓 PC 端小程序的加密网络流

- 用 x64dbg **附加到带小程序标题的 `WeChatAppEx.exe`**，断 `recv`。
- 帧格式（实测）：`状态位(1B) + 协议类型(2B，小程序=0x0303) + content 长度(2B, 大端) + content`；
  状态位 `16/17` 是业务正常数据，`15` 是失败。
- 解析顺序：读前 5 字节 → 取后 2 字节当长度 → 再读 `buffer+5` 的 data；
  再从中取前 8 字节当 **head**、其余当 **body**；**body 过一次 AES-128-GCM 解密**后才是明文 JSON。
- 实用度：这条路**只在"MITM 也拿不到明文"时**才值得走。

---

### 4.4 非微信混合 App（Uniapp / Weex）：从原生渲染入口抠 `app-service.js`

`52pojie-2021863`（Uniapp 加固 App，**注意它不是小程序**）。

**为什么归到本文件**：这类 App 的 JS 入口**也叫 `app-service.js`**，
但**没有 `wxapkg` 可解**（它是个原生 App）⇒ 只能从**原生渲染入口**把 JS 抠出来。
判据：拿不到包、也没有 `__APP__.wxapkg`，但抓包/字符串里能看到 `app-service.js`。

**抓手是"渲染入口的第 2 个参数"，不是"文件落地"**：

1. 在 Java 层**全局搜字符串 `app-service.js`**（加固只保护 dex/资源，**Java 方法签名照样可 hook**）。
2. 落到 Weex 的渲染入口 —— `com.taobao.weex.WXSDKInstance`：

```java
// 重载 A：第 2 参是 String（JS 源码）
render(String url, String script, Map options, String jsonName, WXRenderStrategy strategy)
// 重载 B：第 2 参是 Script 对象，源码在它的 mContent 字段里
render(String url, Script script, Map options, String jsonName, WXRenderStrategy strategy)
```

3. frida 先**只做日志**（不改行为）确认是哪个重载、哪个参数是 JS：

```javascript
if (Java.available) {
  Java.perform(function () {
    var WX = Java.use("com.taobao.weex.WXSDKInstance");
    WX.render.overload('java.lang.String', 'java.lang.String', 'java.util.Map',
                       'java.lang.String', 'com.taobao.weex.common.WXRenderStrategy')
      .implementation = function (url, script, options, jsonName, strategy) {
        console.log('url=' + url + ' scriptLen=' + (script ? script.length : null)
                    + ' jsonName=' + jsonName);
        return this.render(url, script, options, jsonName, strategy);
      };
  });
}
```

   实测结论：**第 4 个参数是"JS 名"**（是一个 JSON，里面有 `Plus_InitURL`；
   `app-service.js` 就出现在这个字段里），**第 2 个参数才是 JS 内容**。
   ⇒ 用 `Plus_InitURL` 做**分流**（只处理 `app-service.js` 那一次），不要对所有渲染调用都动手。

4. Xposed 版本（读 → 改 → 回写）：

```java
Class<?> wx  = XposedHelpers.findClass("com.taobao.weex.WXSDKInstance", classLoader);
Class<?> scr = XposedHelpers.findClass("com.taobao.weex.Script", classLoader);
Class<?> st  = XposedHelpers.findClass("com.taobao.weex.common.WXRenderStrategy", classLoader);
XposedHelpers.findAndHookMethod(wx, "render", String.class, scr, Map.class, String.class, st,
  new XC_MethodHook() {
    protected void beforeHookedMethod(MethodHookParam p) throws Throwable {
      if (p.args[3] instanceof String) {
        String url = new JSONObject((String) p.args[3]).getString("Plus_InitURL");
        if (url.contains("app-service.js")) {
          String content = (String) XposedHelpers.getObjectField(p.args[1], "mContent");
          XposedHelpers.setObjectField(p.args[1], "mContent", content.replace("旧", "新"));
        }
      }
    }
  });
```

**要点**：
- **`Script` 重载的对象里有 `mContent` 字段 = JS 源码**；`getObjectField` 读、`setObjectField` 回写，
  **改完立即生效**（不需要重打包，也不碰签名校验）。
- 加固不影响这条路：**hook 的是宿主自己的公开方法**，与 dex 是否被加固无关。
- 与小程序的关系：Uniapp 也能编译成小程序（那时 `app-service.js` 在小程序包里）；
  **编译成 App 时没有包**，只能走本节。
  ⇒ 同一份业务代码可能同时有多端产物，**先判断目标形态再选路线**（第 1 行分流表已给判据）。

---

## 5. MITM 直接改包 / 改响应（成本最低的"改数据"）

适用：**客户端数值**（游戏存档、金币、任务状态）与**需回写的 JS**。

```python
# mitmproxy 骨架（改请求体 + 改响应体）
from mitmproxy import http
import json

def request(flow: http.HTTPFlow):
    if flow.request.url.endswith("/save") and flow.request.method == "POST":
        data = json.loads(flow.request.content)
        data["coins"] = "1E+100"                     # 改存档/RPG 数值
        flow.request.content = json.dumps(data, ensure_ascii=False).encode()

def response(flow: http.HTTPFlow):
    if "/api/xx" in flow.request.url:
        j = json.loads(flow.response.content)
        j["data"]["xx"] = "..."                      # 造"服务端返回的新值"
        flow.response.content = json.dumps(j, ensure_ascii=False).encode()
```

要点与坑：
- **改之前先清掉小程序的本地缓存**（`wxid_*/Applet/wx*`）！否则改的是"旧版本"的资源，改了没反应。
- 改完若"看起来没生效"，先确认**该请求是否被本地缓存短路**（清缓存后重试）。
- **"任务校验类"漏洞**：有的任务只校验"提交的 URL 页面里含指定关键词" ⇒ 把正常页面 HTML 存到自己的静态托管，
  提交这个自建 URL 即通过。这说明**判据在客户端可控的文本上**——这类校验永远不可信（防守方应当服务端直连抓取）。

---

## 6. 业务层"改权限位"的适用边界

部分小程序把**权限/会员位放在客户端信任的返回数据里**（如返回 `{"playInfo":{"userPermission":false}}`），
改包/MITM 把该字段置 `true` 就能静默通过。

**但必须清楚**：这**只在服务端不二次校验时**成立。
- 一旦服务端按 `openid` 复核权益，改了也拿不到真数据（表现是"界面变了但内容依然拿不到"）。
- 因此它属于**快速验证"校验发生在哪一侧"的探针**，不是通用解法；结论要落到"服务端是否复核"这一判据上。

---

## 7. 小程序 → App（多端应用模式）

微信开发者工具支持**多端应用模式**，可把解包后的工程直接跑成桌面/移动 App。
用途：**绕开"真机 / 模拟器"的限制**，在本地拿到完整运行时（配合 §1 第二、三条入口）。
局限：不影响任何**服务端**校验（签名、时效、云函数权限照旧）。

---

## 8. 排错速查

| 现象 | 一线修复 | 兜底 |
| --- | --- | --- |
| 全局搜 `wx.request` 搜不到 | 搜站点**自己的 request 封装**（`get:` / `post:` / `request:` / 拦截器） | 断 `XMLHttpRequest.prototype.send` |
| 断点打不上 | 换同一个关键词的**最后一处**（前几处属于未执行模块） | 在 `setRequestHeader` / `success` 回调处断 |
| 页面报网络错误、请求发不出去 | 参数**本地生成** ⇒ 照样能在生成处取到 | 打开"不校验合法域名" |
| 改包放回后小程序重新加载资源 | `cert.json`/`sign.json` 完整性校验 | 改走 MITM 响应改写；或 frida 覆盖 MD5 比较点 |
| 云函数抓不到业务数据 | 必须**改包 + 重打包 + RPC**（§3） | websocket 把数据外发 |
| frida 脚本"跑着没反应" | 进程选错了（主进程 vs `appbrandN`） | 用 pid 而非包名 |
| frida 重打包脚本无效 | `RadiumWMPF` 版本不同 ⇒ RVA 失效 | 重新定位比较点 |
| ★ 存储封装（`getStore`/`setStore`）**断不到** | 先确认断点是否落在**未被执行的模块**；若 `setStore` 断不到、`clearStore` 能断 | ★★ **改搜「哪里调用了 `setStore`」**，不要死磕断点；被读的值常是**闭包里的私有对象**（`t[e]`，非局部变量），往上找它的初始化处 |
| 模拟器上微信被封 | **模拟器登录微信会封号**（实测结论） | 用 PC 版微信；静态度优先 |
| 改了 JS 但行为没变 | 本地缓存命中 | 先清 `wxid_*/Applet/wx*` 再试 |
| 目标没有 `wxapkg`，但字符串里有 `app-service.js` | **不是小程序，是 Uniapp/Weex 混合 App** | 从原生渲染入口抠（§4.4），搜 `WXSDKInstance.render` |
| §4.4 里 frida 只打日志看不到内容 | 命中的是**另一个重载**（`Script` 对象版） | 换 `Script` 重载；内容在 `mContent` 字段里 |
