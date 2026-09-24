# 捕获层工具与盲区（Fiddler Classic 时代）

> **本文回答一件事**：**「这个包到底能不能抓到？抓不到时，是哪一层断的？」**
>
> 它是 `references/traffic-purifier.md` 的**上游一层**：那份规则回答「**已经抓到的流量**怎么提纯、怎么裁字段」，
> 本文回答「**流量凭什么能被抓到**、抓不到时该怀疑哪一层」。
>
> **何时用**：抓包工具里空无一物 / 只有 `Tunnel to` 443 / 客户端报证书错 / 程序一设代理就无法联网；
> 或者反过来——你想**主动改包**（改 Request 骗服务器、改 Response 骗客户端），而不只是「看」。
>
> 本簇源文为 **2019 年**的 Fiddler Classic 形态（`52pojie-854434` / `858631` / `859813` / `962784` / `976016` / `976142`）。
> 工具会过时，**判据不会**：代理生效条件、域名在哪一层解析、自带 CA bundle 的证书盲区、`CONNECT` 的形式，
> 换成 mitmproxy / browsercli 一样成立（见 §12 边界与口径）。

---

## 1. 代理式抓包模型：抓包 = 让流量经过你

Fiddler 的原理**不是「窃听」而是「当代理」**：它以 **web 代理服务器**的形式工作，代理地址 `127.0.0.1`，端口默认 `8888`（可改）。
数据流是 **客户端 ↔ 代理 ↔ 服务端**：客户端先把请求发出去，代理**拦截**数据包，再**冒充客户端**把数据发给服务器；响应回来同样被拦截后再返回客户端（源文原话：「代{过}{滤}理服务器会将数据包进行拦截，代{过}{滤}理服务器再冒充客户端发送数据到服务器」）。

推论（也是全文的根）：**只要流量不经过它，它就什么都抓不到**；「抓不到」绝大多数时候不是工具坏了，而是**流量绕过了代理**。

- 能力面：**Fiddler 可以抓取支持 http 代{过}{滤}理（代理）的任意程序的数据包**。
- HTTPS：**必须先安装证书**；解密原理是**中间人攻击**——「对客户端声称自己是服务端，对服务端声称自己是客户端，两头欺骗」，
  前提是**客户端信任 Fiddler 的根证书**：Fiddler 中 `Actions → Trust Root Certificate`（源文 976016 称这一步「是 HTTPS 抓包解密的关键」）。
- 全局开关：点击左下角两个小图标让 Fiddler 进入抓包状态、作用于 `[All Processes]`；「实际上这相当于给 windows 设置了一个 HTTP/HTTPS 代{过}{滤}理」，
  等价于在 IE 的 `[Internet 选项] → [连接] → [局域网设置] → [高级]` 中设置代{过}{滤}理 `127.0.0.1:8888`，
  Fiddler 在 `8888` 端口提供 HTTP/HTTPS 代{过}{滤}理服务。

> **不止「看」**：Fiddler 还可以一键重发 HTTP 请求、修改请求内容并重发、拦截修改数据包、返回预设的欺骗性内容，以及写脚本自动化。
> 附带能力：`Rules → Performances → Simulate Modem Speeds` 模拟低速网路，速率由 `CustomRules.js` 里的
> `m_SimulateModem: boolean = true` 与 `oSession["request-trickle-delay"] = "500"`（500 毫秒/KB，上传）/
> `oSession["response-trickle-delay"] = "150"`（150 毫秒/KB，下载）控制（源文 858631）。

## 2. FiddlerScript：把「改包」做成规则（CustomRules.js）

「Fiddler 包含了一个脚本文件可以自动修改 Http Request 和 Response。这样我们就不需要手动地下『断点』去修改了」——
脚本文件是 `CustomRules.js`（Fiddler 内 `Rules → Customize Rules...` 打开），语言是 **JScript.NET**。

**判据（源文的核心动机）**：脚本方式比手捅断点强在**「不用抢手速、不会超时」**。源文场景 2 原话：
「我想要修改 request 的 Body 里面的部分参数，每次下完断点，修改完再提交，总会网络超时或者 APP 超时。这该怎么办？难道只能靠手速？」

5 类场景与关键调用（逐字）：

| 场景 | 关键调用（逐字） |
| --- | --- |
| ① 改**响应体**（例：把付费 `false` 改成 `true`） | `oSession.GetResponseBodyAsString()` → `Fiddler.WebFormats.JSON.JsonDecode(...)` → 改 `responseJSON.JSONObject['付费']` → `Fiddler.WebFormats.JSON.JsonEncode(...)` → `oSession.utilSetResponseBody(...)`；入口判断 `oSession.fullUrl.Contains("http://www.baidu.com")` |
| ② 改**请求体** | `oSession.GetRequestBodyAsString()` → `strBody.replace("false","true")` → `FiddlerObject.alert(strBody)`（弹框自查）→ `oSession.utilSetRequestBody(strBody)`；入口判断 `oSession.uriContains(...)` |
| ③ 改 **Cookie** | `oSession.HostnameIs('www.baidu.com')` + `oSession.uriContains('pagewithCookie')` + `oSession.oRequest.headers.Contains("Cookie")` → `var sCookie = oSession.oRequest["Cookie"]` → `sCookie.Replace("付费=false", "付费=true")` → `oSession.oRequest["Cookie"] = sCookie` |
| ④ 高亮可疑请求 | `if (oSession.HostnameIs("www.baidu.com")) { oSession["ui-color"] = "red"; }` |
| ⑤ 响应**落盘** | `oSession.utilDecodeResponse()`（「消除保存的请求可能存在乱码的情况」）→ `new ActiveXObject("Scripting.FileSystemObject")` → `fso.OpenTextFile("D:\\Sessions.txt",8 ,true, true)` → `file.writeLine("Response body: " + oSession.GetResponseBodyAsString())` → `file.close()` |

> ⑤ 的路径 `D:\Sessions.txt`、`OpenTextFile(...,8,true,true)` 逐字保留；它靠 `ActiveXObject` 写盘 ⇒ 这是 **Windows + 旧 Fiddler** 的形态，
> 别指望跨平台照搬（现代等价物是 mitmproxy 的 `addons` 落盘 / browsercli 的响应导出）。
>
> 入口判断的三种写法各有取值：`oSession.fullUrl.Contains(...)`（全 URL）、`oSession.uriContains(...)`（URI）、`oSession.HostnameIs(...)`（主机名）。
> **别混用语义**：`HostnameIs` 只比主机名，拿它去匹配路径永远不成立。

同一篇源文（858631）还给了三种菜单定制（`RulesString("&52pj", true)` + `RulesStringValue(0,"安卓8.0","52pj&狂暴补师亚丝娜&k=52pj")`、`ToolsAction`、`ContextAction`），
radio 选项通过 `OnBeforeRequest` 里的 `if (null != s52pj) { oSession.oRequest["52pj"] = s52pj; }` 生效。**本文只登记其存在，不展开**（与抓包判据无关）。

## 3. AutoResponder：不写脚本的「线上 ↔ 本地 / 线上 ↔ 线上」替换

操作路径（逐字）：点 Fiddler 右上的 **AutoResponder** → 勾选 **Enable automatic responses** 和 **Unmatched requests passthrough** → 按 **Add** →
将下方 **Rule Editor** 第一行修改为线上档案位址（**线上档案位址也可以使用 Regular Expression，开头加上 `regex:` 即可**）→
按下第二行右边的箭头，选 **Find a file ...**，选择要替换成的本机端档案 → 按 **SAVE**。

- **线上 → 本地文件**：如上，把线上资源换成自己写的本地文件。
- **线上 → 线上**：步骤「几乎一模一样」，「差别仅在 Rule Editor 第二行填入的是另一线上档案位址」。
- ★ **两个勾必须同时具备**：`Enable automatic responses` 负责打开替换；`Unmatched requests passthrough` 保证**没命中的请求照常放行**。
  少勾后者会把整站资源拦死，页面表现为「莫名其妙地坏了」——**这类故障极易被误判成反爬**。
- `regex:` 只在第一行开头生效（是**前缀标记**，不是普通字符串的一部分）。替换目标同时支持**本地文件**与**另一个线上地址**。

## 4. 命令调试：像 OD 一样在 Fiddler 里干活

源文定位：「其实学习抓包，完完全全和 OD 是一模一样的逻辑，尤其是封包逆向」；Fiddler 的调试功能「可以说是抓包界的 OllyDbg 并不为过」。

### 4.1 替换（改 Host）

- `urlreplace www.baidu.com www.360.com`：按下 Enter，**所有原先发到百度的 HTTP Request 就转发到 360 了**；
  要清除转发，「请在同一位置输入：`urlreplace`」（不带参数复位）。
- 脚本等价写法：`if ( oSession.HostnameIs('www.baidu.com') ) oSession.hostname = 'www.360.com';`

### 4.2 断点（逐字）

| 命令 | 中断时机 |
| --- | --- |
| `bpu` | 在**请求开始时**中断（请求前） |
| `bpafter` | 在**响应到达时**中断（响应后） |
| `bps` | 在**特定 http 状态码**时中断 |
| `bpv` / `bpm` | 在**特定请求 method** 时中断 |

例：`bpu www.baidu.com/52pj/狂暴补师亚丝娜` ——「这样既可在访问这个网址的时候自动下断点」。
（`bpu` 改的是「请求」，对应 §5 的**欺骗服务器**；`bpafter` 改的是「响应」，对应**欺骗客户端**。）

### 4.3 过滤器命令（逐字，注意语义）

| 命令 | 语义 |
| --- | --- |
| `select <type>` | 选择所有**响应类型（content-type）**为指定类型的请求，如 `select image` / `select css` / `select html`（`select html` 选的是「所有响应为 HTML 的请求」） |
| `allbut <type>` | 选择所有响应类型**不是**给定类型的请求，如 `allbut image`；**别名 `keeponly`** |
| `?text` | 选择所有 **URL 匹配问号后字符**的全部 session |
| `>size` / `<size` | 选择响应大小大于 / 小于某大小的所有 HTTP 请求（**单位是 b**） |
| `=status` | 选择响应状态等于给定状态的所有请求，如 `=200` |
| `@host` | 选择包含指定 HOST 的全部 HTTP 请求，如 `@csdn.net` |

> ★ **`allbut` / `keeponly` 的真实语义是「删掉非该类型」**（源文原话：「keeponly 和 allbut 命令是将不是该类型的 session 删除，留下的都是该类型的响应」）。
> 因此 `allbut xxxx`（不存在的类型）实际等同于 `cls`（删除所有 session，`ctrl+x` 快捷键也是这个作用）。
> **这是一条不可逆的「手滑清空」路径：用前先导出会话。**

### 4.4 「逆向」的最小闭环

「当你发现下断点的网址过后，可以使用 `ctrl+F` 的方式，搜索该网址，既可看是什么接口返回的该地址，也就是简单的逆向！」
—— 即 **从「哪一个请求/响应产生了这个地址」反向定位上游接口**，是「先抓包、再定位代码」的入口动作。

## 5. ★ 两种欺骗路线对照：改 Request 还是改 Response

本簇**迁移价值最高的判据表**。场景（源文 962784）：A 用户已付费并绑定了设备（序列号 `123456`），
B 用户（序列号 `654321`）也想用同一 APP。以「绑定手机」为例。

| | **欺骗服务器**（改 **Request**） | **欺骗客户端**（改 **Response**） |
| --- | --- | --- |
| 改哪里 | 在**达到服务器之前**就做欺骗工作，因此改 **Request**。例：下断点把 `udid:654321` 改成 `udid:123456`，再提交给服务器 | 同样在**返回给客户端之前**改，因此改 **Response**。例：把返回的 `staus:1` / `endtime:2019-05-23` 改成自己的值 |
| 优点 | ①「若服务器返回的 key 是一次性加密的，则无法做到欺骗客户端。但是服务器端返回的数据是合法的，因此可以直接破解」②「服务器数据不会异常，后台只会显示小米 9 一直在换着地方登陆，而不会有过多的猜想」 | ①「无需付费的设备即可破解，看返回的数据更容易修改」②「无需了解 APP 验证的业务逻辑，只看最后结果」 |
| 缺点 | ①「必须已经有一台付费的设备才可以，必须要付费」 | 「若为加密算法，绑定了其他的信息，则会破解失败」 |

**源文结论口径（逐字）**：「若服务器返回的 key 是一次性加密的，则无法做到欺骗客户端」
⇒ **一次性加密的 key 无法靠改 Response 欺骗客户端**（客户端拿到的是它自己算不出来的东西，改了就过不了校验）。

**怎么选**（源文口径：「以上两种破解方法各有特色，大家在破解的时候可以根据实际的情况来看」）：

- **有**付费设备 / 只想复用一次有效凭证 ⇒ 走**欺骗服务器**（改 Request）；代价是**必须先有一台付费设备**。
- **没有**付费设备 / 只想改「最后的结果」⇒ 走**欺骗客户端**（改 Response）；代价是**遇到加密且绑定了其它信息就失败**。
- 两条路都落地在 §2 的脚本里（改 Request 用 `utilSetRequestBody` / `oRequest["Cookie"]`，改 Response 用 `utilSetResponseBody`），
  或落地在 §4.2 的断点里（`bpu` 改请求、`bpafter` 改响应）。

## 6. 强制代理：给「不支持设置代理」的程序创造条件

全局代理只对一部分程序有效（§7）。对不支持设置代理的程序，源文给了两条路：

1. **程序自己就支持设置代理** —— 先「仔细查看软件设置」：有的第三方软件（源文点名 **百度网盘**）本身可以设置 HTTP/HTTPS 代{过}{滤}理，
   只要设置成 Fiddler 的代{过}{滤}理端口即可截获通讯内容。
2. **强行设置代理** —— 借助其它软件给任意程序设置代理，让它通过 HTTPS/SOCKS5 代理访问网络（逐字）：

| 工具 | 机制（逐字） | 稳定性 / 兼容性 |
| --- | --- | --- |
| **Proxifier**（推荐） | 「正规军，使用了 Windows 提供的正规接口，通过安装 **WinSock LSP 模块**过滤/转发 TCP/UDP 包」 | 「稳定性和兼容性更好」「当然此处还是推荐 Proxifier」 |
| **SocksCap64** | 「使用黑科技 **API HOOK** 技术，HOOK 了 Windows Sockets API，然后把所有的 TCP/UDP 包通过代{过}{滤}理转发」，依赖 **API HOOK 和 DLL 注入** | 「但不是所有程序都随便给你注入的，比如**腾讯 TP 保护下的游戏客户端**，所以兼容性和可用性不如 Proxifier」 |

- **Proxifier 是收费的商业软件**，但有 **30 天免费试用**（源文还顺带提到「网上随便一搜一大把的激活码」，此处不展开）。
- 落地：在 Proxifier 中添加 `[127.0.0.1:8888]` 这个 Fiddler 提供的 HTTPS 代{过}{滤}理服务器，再设置规则让目标程序（源文例子：网易有道词典）通过该代理访问网络。
- **判据**：**注入型方案（SocksCap64）会被反注入保护挡住**（腾讯 TP 就是实例）⇒ 遇到「注入不进去」先想到自保护，而不是配错。

## 7. 抓不到形态一：全局代理只对这几类程序有效

开启 `[All Processes]` 后，「有的 HTTP/HTTPS 包可以抓到，有的抓不到」。
**Fiddler 这种「设置全局代{过}{滤}理」的方式，只对以下几种情况有效**（源文逐字列了三条）：

- IE、Chrome 等浏览器；
- 程序使用 **WinInet** 库进行 HTTP/HTTPS 通信；
- 程序**内嵌 Webbrowser**（WebBrowser 控件）。

**反面（抓不到的根因）**：程序**没有**使用 Windows 提供的 WinInet 库，而是**自带了一个库**——
VC 程序使用 **libcurl**、JAVA 程序使用 JDK 中的 **URLConnection** 或第三方 **OkHttp**、C# 使用 **System.Net.Http** 等，
「这些库在程序内部实现了 HTTP 包的封装与拆解，那么最终他们将直接调用操作系统的 **socket api** 发送数据，
操作系统当然就没法给他们设置 HTTP/HTTPS 代{过}{滤}理了」。

- **例外（★ 最容易记反的一条）**：**Python 的 `requests`** —— 若用 Fiddler 设置了全局代{过}{滤}理，
  而 Python 程序用 requests 通信**且没有在代码里设置代{过}{滤}理**，则 requests **默认会使用系统全局代{过}{滤}理**通信，
  「从而能在 Fiddler 中看到 Python 程序的 HTTP 通信内容」。
  源文对其它语言/类库的态度是「由于没法一一去测试，还需要大家的反馈，汇集结果」⇒ **不要把这条例外推广成通则**。
- **两条判定动作**（逐字）：
  - 用 **`depends`** 工具查看程序是否依赖 **`WININET.DLL`** ——「如果依赖，它很有可能使用它进行 HTTP/HTTPS 通信」（源文例子：招商银行专业版 PC 网银客户端）。
  - 用 VisualStudio 自带的 **`spy++`** 查看是否**内嵌 Webbrowser 控件** ——「如果有内嵌，则 WebBrowser 中的内容可以用 Fiddler 抓包」。
- **处置**：不满足上述条件 ⇒ 走 §6 强制代理（Proxifier）。**先判定「它用哪套 HTTP 栈」，再决定「要不要强制代理」**，
  顺序反了会在「为什么抓不到」上耗掉一整轮。

## 8. ★ 一个易漏的关键设置：域名在哪一层解析

在 Proxifier 中：`[Profile] → [Name Resolution]` → 勾选 **`Resolve hostnames through proxy`**，
**让域名解析的工作交给代{过}{滤}理服务器，而不是在 Proxifier 上解析**。

- **不勾（默认）**：Proxifier 自行解析域名，比如 `www.baidu.com` 解析为 `180.97.33.108`，然后发请求给 Fiddler：

  ```
  CONNECT 180.97.33.108:443 HTTP/1.1
  ```

  「这样 Fiddler 并不知道它请求的是哪个域名，于是返回给客户端的伪造证书时，伪造的是为 `180.97.33.108` 颁发的证书，
  有的客户端会做校验，发现这个证书是颁发给 `180.97.33.108` 的，而不是颁发给 `www.baidu.com` 的，然后报错处理。」

- **勾上**：Proxifier 会直接向 Fiddler 发送请求：

  ```
  CONNECT www.baidu.com:443 HTTP/1.1
  ```

  「这样 Fiddler 就知道客户端请求的是 `www.baidu.com`，从而返回客户端伪造的 `www.baidu.com` 证书，客户端不报错，Fiddler 才能顺利抓包解密。」

> ★ **判据**：**能连上但客户端报证书错误**，或 **Fiddler 里只有 IP 没有域名**（`Tunnel to` 的 host 是数字 IP）⇒ **先查这一项**，
> 再怀疑证书链 / 客户端信任问题。根因是「**证书是为谁签发的**」：域名必须在代理层可见，伪造证书才能签对名字。

## 9. 抓不到形态二：客户端自带 CA bundle（证书盲区）

**现象**：`HTTP 请求解析没有问题`，但某个第三方程序的 HTTPS 无法解析——
「表现为 Fiddler 中能看到 `Tunnel to` 443 端口，但是就没有下文了，同时，程序表现为无法联网，出错等提示，无法正常工作」。

**根因**：Fiddler 的中间人**要能成功实施，有一个前提条件，就是客户端信任 Fiddler 提供的根证书**。
`Actions → Trust Root Certificate` 后，「大部分浏览器以及基于 WinInet 库进行 HTTP 通信的程序」，都会信任操作系统中我们添加的 Fiddler 根证书；
但「如果第三方程序使用其它 HTTP 库进行通信，比如 VC 程序使用 libcurl，JAVA 程序使用 JDK 中的 URLConnection 或第三方 OkHttp，
C# 使用 System.Net.Http，Python 使用 requests，这些 HTTP 库**一般自带了一套可信任的 SSL 根证书**，
它们**不使用操作系统自带的 SSL 根证书**，更不会使用我们向操作系统中添加的 Fiddler 根证书，于是就验证出错了」。

源文用「**自己写一个程序，进行 HTTPS 请求，然后通过此方法抓自己的包**」复现（`import requests` / `requests.get("https://www.csdn.net")`），
异常直接点题：`OpenSSL.SSL.Error: [('SSL routines', 'tls_process_server_certificate', 'certificate verify failed')]`。
Python requests 官方文档可自证：「Requests bundled a set of root CAs that it trusted, **sourced from the Mozilla trust store**」。

**两条解法（源文自证，逐字）**：

1. **让 HTTP 客户端禁用证书验证**：`requests.get("https://www.csdn.net", verify = False)`；
2. **让 HTTP 客户端信任 Fiddler 根证书**：访问 `http://127.0.0.1:8888` 下载 Fiddler 根证书 →
   `openssl x509 -inform der -in FiddlerRoot.cer -out fiddler.pem` →
   `requests.get("https://www.csdn.net", verify = "./fiddler.pem")`。之后「Fiddler 就能顺利抓到该程序的 HTTPS 包并解密」。

**攻方落点（源文「有解」一节）**：目标程序不是你写的、你也没有它的代码，怎么办？——
「我们通过**反编译**目标程序，大致搞清楚目标程序使用的是什么 **HTTP Client 库**，**一般很少有程序会自行实现一个 HTTP Client**，
大多是使用语言标准库自带的或者第三方开源的 HTTP Client 库」（VC 一般使用 WinInet 或 WinHttp，C# 一般使用 System.Net.Http，Java 一般使用 URLConnection 或 OkHttp），
「再结合反编译确定下来以后，通常这些 HTTP Client 都是开源的，即使不开源，那 API 都是公开的，我们不难找到这个库如何**禁用 SSL 验证**、
如何**信任指定根证书**的方法。然后就可以通过**反编译、重编译，APIHook，Dll 注入，Shellcode** 等手段，
让目标程序禁用 SSL 验证或信任 Fiddler 根证书。」

> ⚠️ **标注**：源文这一步只给了**手段清单**，并预告「在后续文章中，我们将有针对性的举一些例子，来详解具体该怎么做」
> ⇒ **属源文推断 / 未展开**：方向（先判定 HTTP Client 库，再按其公开 API 处理）可信，具体操作需自行验证。

## 10. 抓不到形态三：本地服务器中转（源文未展开、无验证）

源文 854434 在「用了 trust me 过后，还是抓不到包」之后给出第三种形态：
**「他们就是利用了本地服务器中转，这样的话 Fiddler 是抓不了包的。比如著名 APP：麻花影视、电视家」**。

- 源文**只给了方向性提示、没有给可操作步骤**，原话：「那么，有没有办法能抓到这种操作的包呢？当然是有的。
  **这边只能透露几点，不能正大光明地公布**，否则大量非法分子就可以破解非常多的 APP 了。」
- 唯一被透露的思路是反问式提示：「Fiddler 的本质其实就是代{过}{滤}理服务器，那么，如果是代{过}{滤}理服务器，所有的请求是不是都会走这台服务器呢？那是肯定的。」
- **处置口径**：只登记为**「已知盲区形态」**，**显式标注「源文未展开、无验证」**；**不要补编方法**。

> 同一篇里还有一条**前置盲区**（不是「抓不到」而是「抓到了也没用」）：很多 APP 会**检测你是否用了 wifi 代{过}{滤}理**——
> 「如果设置了，则 APP 无法正常使用。这样就会从根本上杜绝被抓包」；源文给的笨办法是用 Xposed 上的 `just trust me` hook 相关函数。
> **判据**：目标程序「一开代理就断网/异常」，先怀疑**代理检测**（客户端主动识别），而不是「包没走到代理」。

## 11. 封包字段与头部速查（源文 859813，含转载内容）

> 源文自述「本文部分转载」「另有部分是收集于网络」⇒ 本节是**二手整理**，定位为**读包时的命名对照表**，不作权威规范使用。

### 11.1 Fiddler 列表列（逐字）

`Result`（HTTP 状态码）、`Protocol`（请求使用的协议，如 HTTP/HTTPS/FTP 等）、`HOST`（请求地址的主机名或域名）、
`URL`（请求资源的位置）、`Body`（请求大小）、`Caching`（请求的缓存过期时间或者缓存控制值）、
`Content-Type`（请求响应的类型）、`Process`（**发送此请求的进程 ID**）、`Comments`（备注）、`Custom`（自定义值）。

> ★ `Process` 列 = **进程 ID**：这是回答「**这个包是哪个程序发的**」的入口，也是把抓到的包**归因到目标进程**的第一个判据。

### 11.2 Request 头域分组（逐字要点）

- **Cache**：`if-Modified-since`（缓存）；`if-None-Match`（「可提高性能（在 Response 中添加 ETag 信息，客户端再次请求资源，
  Request 中加入 if-None-Match（ETag 的值），服务器验证 ETag，若没改变返回状态码 304，有改变，返回状态码 200）」）；
  `Pragma`（防止页面被缓存）；`Cache-Control`（Response—Request 遵循的缓存机制：`public` 可以被任何缓存所缓存 / `private` 内容只缓存在私有缓存中 / `no-cache` 所有内容都不会被缓存）。
- **Client**：`User-Agent`（告知服务器客户端使用的操作系统与浏览器的名称和版本）、`Accept`（浏览器端可以接受的媒体、文件类型）、
  `Accept-Encoding`（指定压缩方法，是否支持压缩，支持什么压缩方法（`gzip`、`deflate`））、`Accept-Language`、`Accept-chareset`（**源文原拼写**，即 charset）。
- **Cookies**：目的「将 cookie 值发送给服务器」（有的请求不发送 Cookies）。
- **Entity**：`Content-Length`（发送给 HTTP 服务器的数据长度）、`Content-Type`（决定文件接收方将以什么形式、什么编码读取此文件）。
- **Security**：`Upgrade-Insecure-Requests: 1`（默认，这个是自己协商的）。
- **Transport**：`Host`（发送请求时该报头域**是必需的**，主要用于指定被请求资源的 Internet 主机和端口号，通常从 HTTP URL 中提取出来）、
  `Proxy-Connection`（当网页打开完成后，客户端和服务器之间用于传输 HTTP 数据的 TCP 连接是否关闭：`keep-alive` 不会关闭 / `close` 需要重新建立连接）、
  `connection`（`Keep—alive` = TCP 连接不会关闭；`close` = 一个 Request 完成后，TCP 连接关闭）。
- **Miscellaneous**：`Referer`（提供 Request 的上下文信息，告诉服务器我是从哪个链接过来的）。

### 11.3 Response 头域分组（逐字要点）

- **Cache**：`Date`（生成消息的具体时间和日期）、`Expires`（浏览器在指定过期时间内使用本地缓存）。
- **Cookie/Login**：`P3P`（用户跨域设置 cookie，可以解决 iframe 跨域访问 cookie 的问题）、
  `Set-Cookie`（重要的 header，用于把 cookie 发送到客户端浏览器，**每一个写入 cookie 都会生成一个 set-cookie**）。
- **Entity**：`ETag`（**与 if-None-Match 配合使用**）、`Last-Modified`（用于指示资源的最后修改日期和时间）、`Content-Type`、
  `Content-Length`、`Content-Encoding`（Web 服务器表明自己用了什么压缩方式（`gzip`、`deflate`）压缩响应中的对象）、`Content-Language`。
- **Miscellaneous**：`Server`（指明 HTTP 服务器的软件信息）、`X-Powered-By`（表明网站是用什么技术开发的）、`X-AspNet-Version`。
- **Transport**：`connection`（同 Request）。
- **Location**：`Location`（用于重定向一个新的位置，包括新的 URL 地址）。

### 11.4 缓存配对与 ★ 304 假象

- **源文明示的配对**：`if-None-Match` ↔ `ETag`（源文原话「ETag：与 if-None-Match 配合使用」）。
- **源文推断**：`if-Modified-since` ↔ `Last-Modified` 是同一套「时间戳协商」的两端——源文只**分别**定义了二者
  （`if-Modified-since` 归 Request 的 Cache 头域，`Last-Modified` 归 Response 的 Entity 头域），**未明说它们是配对关系**。
- ★ **判据（逆向高频坑）**：命中缓存时服务端返回 **304**，此时**响应体是空的**。
  **304 说明服务端认为你已有最新副本**（源文口径：若没改变返回状态码 304）——
  **把 304 的响应体当成「空数据 / 接口返回空」是很常见的假象**。
  遇到「接口明明正常过、现在响应体是空的」，**先看 `Result` 是不是 304**，再看请求里有没有带 `if-None-Match` / `if-Modified-since`。

### 11.5 HTTP 认证四步（逐字）与 OAuth

1. 客户端发送 HTTP Request 给服务器；
2. Request 中**未包含 `Authorization` header**，服务器会返回一个 **401** 错误给客户端，且在 Response 中的 header **`www-Authenticate`** 中添加信息；
3. 客户端将**用户名和密码以 base64 加密后，放在 `Authorization` 中**发送给服务器，认证成功；
4. 服务器将 `Authorization` header 中的用户名和密码去除，进行验证；如果验证通过，将根据请求发送资源给客户端。

- **OAuth 相对 HTTP 的差别**（逐字）：「OAuth 对于 http 来说，就是放在 `Authorization` header 中的**不是用户名密码，而是一个 token（令牌）**」。
- 客户端侧用法：「客户端若要跟『使用基本认证的网站』进行交互，将用户名密码加载 `Authorization` header 中即可」。
- ★ **迁移判据**：逆向时看到 `401 + www-Authenticate` **不是「失败」，而是认证握手的第一跳**；
  这一跳之后的那条请求里的 `Authorization`，才是你要复现的凭据（base64 用户名密码，或 token）。

## 12. 边界与口径

1. **时代**：本簇源文是 **2019 年**的 **Fiddler Classic** 形态（`52pojie-854434` 2019-01 / `858631` 2019-01 / `859813` 2019-01 /
   `962784` 2019-05 / `976016` 2019-06 / `976142` 2019-06）。今天同类能力可迁到 **mitmproxy / browsercli**，
   **不要把 Fiddler 当作现代栈的默认选择**。
2. **但下列判据是跨工具不变的**（换工具只换操作入口，不换判断）：
   代理生效条件（§7）、域名解析发生在哪一层（§8）、自带 CA bundle 的证书盲区（§9）、
   `CONNECT host:port` 的形式（§8）、304 的语义（§11.4）、401 是认证握手第一跳（§11.5）、
   「改 Request 骗服务器 vs 改 Response 骗客户端」的取舍（§5）。
3. **明确区分「源文实测」与「源文推断」**（本文已逐处标注，此处汇总）：
   - **源文实测 / 自证**：Fiddler 的代理模型与 `127.0.0.1:8888`（854434）；`Actions → Trust Root Certificate` 是 HTTPS 解密前提（976016）；
     `Resolve hostnames through proxy` 与两种 `CONNECT` 的对照（976016）；`certificate verify failed` 的复现 + 两条解法 + `Mozilla trust store` 引证（976142）；
     `allbut` / `keeponly` 「删掉非该类型」的语义（858631）；两种欺骗路线的优缺点（962784）；`Tunnel to` 443 等于「没有下文」（976142）。
   - **源文推断 / 未展开**：
     ①「反编译判定 HTTP Client 库 → 反编译/重编译、APIHook、Dll 注入、Shellcode」的攻方落点（976142，预告后续文章，**无实例**）；
     ②本地服务器中转的抓法（854434，「只能透露几点」，**无步骤**）；
     ③`if-Modified-since` ↔ `Last-Modified` 的配对（源文只分别定义，未明说配对）；
     ④「其它语言/类库是否受全局代理影响」（976016 明说「没法一一去测试，还需要大家的反馈」）。
4. **与上游 / 下游的分工**：本文是 `references/traffic-purifier.md` 的**上游**（回答「能不能抓到」）；
   抓到之后若**响应体/请求体是密文**，转 `../../web-reverse-algorithm/references/16-ciphertext-structure-diagnostics.md`（密文结构诊断）与
   `../../web-reverse-algorithm/references/01-decision-tree.md`（算法决策树）；
   若目标是**桌面程序**（该用哪个运行时 / HTTP 栈 / 如何定位进程），转 `../../desktop-client-reverse/references/desktop-runtime-surfaces.md`。
5. **伦理与边界**：源文多处声明「接下来的内容，公布过后，会涉及到技术滥用，因此，仅公布原理」「这边只能透露几点，不能正大光明地公布」。
   本文按同样口径处理：**只记录判据与方向，不补编可操作步骤**。

## 13. 来源表

| 主题 | 来源 | 年份 | 关键字面量 |
| --- | --- | --- | --- |
| 代理式抓包模型 + FiddlerScript 5 场景 + 本地服务器中转盲区 + wifi 代理检测 | `52pojie-854434` | 2019-01 | `127.0.0.1`、`8888`、`CustomRules.js`、`JScript.NET`、`GetResponseBodyAsString()`、`GetRequestBodyAsString()`、`Fiddler.WebFormats.JSON.JsonDecode`、`JsonEncode`、`utilSetResponseBody`、`utilSetRequestBody`、`oSession.oRequest["Cookie"]`、`oSession.fullUrl.Contains`、`oSession.uriContains`、`HostnameIs`、`ui-color`、`utilDecodeResponse()`、`ActiveXObject("Scripting.FileSystemObject")`、`D:\\Sessions.txt` |
| 菜单定制 + 限速 + AutoResponder + 命令调试 | `52pojie-858631` | 2019-01 | `RulesString`、`RulesStringValue`、`ToolsAction`、`ContextAction`、`m_SimulateModem`、`request-trickle-delay`、`response-trickle-delay`、`Enable automatic responses`、`Unmatched requests passthrough`、`regex:`、`urlreplace`、`oSession.hostname`、`bpu`、`bpafter`、`bps`、`bpv`、`bpm`、`select`、`allbut`、`keeponly`、`?text`、`>size`、`<size`、`=status`、`@host` |
| 封包字段 / 头部速查 + HTTP 认证 + OAuth | `52pojie-859813` | 2019-01 | `Result`、`Protocol`、`HOST`、`URL`、`Body`、`Caching`、`Content-Type`、`Process`、`Comments`、`Custom`、`if-None-Match`、`ETag`、`if-Modified-since`、`Last-Modified`、`304`、`401`、`www-Authenticate`、`Authorization`、`Set-Cookie`、`P3P` |
| 两种欺骗路线对照（改 Request 骗服务器 vs 改 Response 骗客户端） | `52pojie-962784` | 2019-05 | `udid:123456`、`udid:654321`、`staus:1`、`endtime:2019-05-23`、`Request`、`Response` |
| Proxifier / SocksCap64 强制代理 + 全局代理生效条件 + 域名解析位置 | `52pojie-976016` | 2019-06 | `Proxifier`、`SocksCap64`、`WinSock LSP`、`API HOOK`、`Actions → Trust Root Certificate`、`[All Processes]`、`Resolve hostnames through proxy`、`CONNECT 180.97.33.108:443`、`CONNECT www.baidu.com:443`、`WinInet`、`Webbrowser`、`libcurl`、`URLConnection`、`OkHttp`、`System.Net.Http`、`WININET.DLL`、`spy++`、`requests`、百度网盘、网易有道词典、招商银行专业版 |
| 自带 CA bundle 证书盲区（`Tunnel to` 443 + 无法联网）+ 两条解法 + 反编译落点 | `52pojie-976142` | 2019-06 | `Tunnel to`、`certificate verify failed`、`Mozilla trust store`、`verify = False`、`FiddlerRoot.cer`、`openssl x509 -inform der -in FiddlerRoot.cer -out fiddler.pem`、`verify = "./fiddler.pem"`、`http://127.0.0.1:8888` |

> 本表是**保真度锚点**：文中每条断言都应能指回这里的某一行；
> 标注「**源文推断 / 源文未展开**」的条目，**不得当作已验证结论使用**。
