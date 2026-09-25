# Discord Android 协议逆向实战 —— 从 APK 反编译到 Windows 协议 DLL 全流程

> **作者**: jiemiao | **发布时间**: 2026-07-28 17:28:00 | **版块**: 『移动安全区』 | **查看/回复**: 1607 / 7
> **原文**: [https://www.52pojie.cn/thread-2119947-1-1.html](https://www.52pojie.cn/thread-2119947-1-1.html)

---

一、项目背景

Discord 是一个广泛使用的即时通讯和语音软件，不少游戏社区和开发团队都在用。由于网络环境原因，国内用户通常需要通过代理访问。
本文记录了我从 Discord Android APK 入手，经过静态分析、动态抓包、协议还原，最终实现一个可在 Windows 上调用的协议 DLL 的完整过程。
最终成果是一个约 154KB 的 DLL 文件，支持登录、消息收发、好友管理、Guild 操作，附带 iPad 协议指纹伪装，可通过 Python、易语言、C++ 等语言调用。
使用的工具链:
  JADX (Java 反编译)
  IDA Pro (SO 静态分析)
  Frida (动态 Hook)
  ProxyPin (HTTPS 抓包)
  Visual Studio 2022 (MSVC 编译)
二、APK 静态分析 -- JADX 阶段
2.1 整体架构还原
用 JADX 打开 Discord 的 base.apk (v332.12 Stable)，首先查看 AndroidManifest.xml。发现主 Activity 是 com.discord.main.MainActivity，继承自 ReactActivity，说明这是一个 React Native 应用。
进一步查看 lib 目录下的 SO 文件，整理出核心架构:
  Hermes JS Bundle (67MB)        -- 业务逻辑、API 端点、认证流程
  React Native JSI Bridge        -- JS 与 Native 通信层
  liblibdiscore-rn-jsi-module.so -- Rust 编写的核心协议库 (10MB)
     包含: reqwest+hyper (HTTP)、rustls (TLS)、tokio (异步)
  libdiscord.so                  -- WebRTC + DAVE/MLS 加密 (语音/视频)
  libkv\_storage.so               -- 本地 KV 存储
关键发现: Discord 的 HTTP API 调用和 WebSocket 网关连接逻辑都在 Hermes JS Bundle 中，Native 层只提供基础的网络能力。
2.2 FastConnectModule -- OP2 IDENTIFY 发送路径
在 JADX 中搜索 FastConnectModule，找到了 WebSocket 网关握手的关键代码。该类通过 OnOpenHandler 回调接住 WebSocket 连接成功事件，然后调用 prepareIdentify 方法构造并发送 OP2 IDENTIFY 消息。
关键代码路径:
  JS 层构造完整 OP2 JSON 字符串
    -> FastConnectModule.prepareIdentify(userId, payload, socketId, dbVersion)
    -> IdentifyPayload.withGuildVersions() 注入 guild 版本信息
    -> webSocket.send(modifiedPayload)
这解释了为什么用 Frida hook ReactNative 的 WebSocketModule.send 方法抓不到 OP2 帧 -- 因为 FastConnectModule 直接使用的是 OkHttp 的 WebSocket 接口，绕过了 ReactNative 桥。

![](https://attach.52pojie.cn/forum/202607/28/170011zyao5aa37vb0nznv.png)

![](https://attach.52pojie.cn/forum/202607/28/170040xoaa2rll7pa0o5lr.png)

三、Rust SO 分析 -- IDA 阶段
3.1 liblibdiscore-rn-jsi-module.so 逆向
用 IDA Pro 加载 liblibdiscore-rn-jsi-module.so (10MB)，从字符串表可以还原出技术栈:
  网络:    reqwest, hyper, hyper\_util, rustls
  异步:    tokio, futures\_core
  数据库:  rusqlite (SQLite)
  序列化:  serde (JSON)
  日志:    tracing
通过分析 Rust mangled symbols (比如 \_ZN17libdiscore\_common4core4http...)，定位到关键的 JSI 桥接函数:
  httpRequest          -- HTTP 请求入口
  fluxApi              -- Flux 状态管理 API
  connectStore         -- 连接数据仓库
  dispatchAction       -- 派发 Flux Action
这些函数通过 register\_libdiscore\_jsi 注册到 Hermes JS 引擎，供 JavaScript 层调用。
同时确认了 Discord 的 Flux Action 类型列表:
  LOGOUT, RESET\_SOCKET, CONNECTION\_OPEN, GUILD\_CREATE,
  GUILD\_UPDATE, GUILD\_DELETE, BACKGROUND\_SYNC, CACHE\_LOADED 等
3.2 libdiscord.so 分析
这个 SO (11MB) 主要包含 WebRTC 引擎和 Discord 自研的 DAVE/MLS 语音加密协议。通过字符串分析发现有:
  discord\_common/native/dave/               -- DAVE 协议
  discord\_common/native/dave/mls/           -- MLS 密钥协商
  discord\_common/native/dave/boringssl\_cryptor -- BoringSSL 加密
3.3 证书校验的结论
Discord 使用了两套 TLS 实现:
  REST API (HTTPS)   -> Rust rustls (不走系统证书)
  WebSocket (WSS)    -> Java OkHttp (走系统代理)
这也是 Charles/Fiddler 抓不到部分 HTTPS 请求的原因 -- rustls 不信任用户安装的 CA 证书。解决方案是使用 Frida hook 底层函数而非依赖 MITM 代理。

![](https://attach.52pojie.cn/forum/202607/28/170104jy7r0f5g6wm6r4g4.png)

四、网络协议还原 -- 抓包 + Frida 阶段
4.1 ProxyPin HTTPS 抓包
在手机上安装 ProxyPin 并配置代理，启动 Discord App 登录，抓取 REST API 请求。登录接口如下:
POST /api/v9/auth/login
Headers:
  X-Super-Properties: eyJvcyI6IkFuZHJvaWQi...  (Base64 编码的设备指纹 JSON)
  X-Discord-Locale: zh-CN
  X-Discord-Timezone: Asia/Shanghai
  X-Debug-Options: bugReporterEnabled
  User-Agent: Discord-Android/5758;RNA
  Content-Type: application/json
Body:
  {"login":"+66xxxxxxxxxx","password":"xxxxxxxx","undelete":false}
Response 200:
  {"token":"MTUxNjA...","user\_id":"1516084107329798336","user\_settings":{...}}
解码 X-Super-Properties 的 Base64 得到完整的设备指纹 JSON 结构，包含 os、browser、device、os\_version、device\_vendor\_id 等字段。这是后续构造 iPad 指纹的关键参考。

![](https://attach.52pojie.cn/forum/202607/28/170215lvlwnpihjiaojvc5.png)

4.2 Frida Hook -- Gateway 协议
ProxyPin 只能抓到 REST API，无法解密 WebSocket 帧（因为使用了 zstd-stream 压缩 + OkHttp 内部 WebSocket 实现）。于是编写 Frida 脚本，直接 hook:
  com.facebook.react.modules.websocket.WebSocketModule.sendEvent   -- 接收帧
  okhttp3.WebSocket.send  -- 发送帧
  CompressionModule  -- zstd 解压
成功捕获了完整的 Gateway 握手流程:
WS-CONNECT: wss://gateway.discord.gg/?encoding=json&v=9&compress=zstd-stream
OP10 HELLO:
  {"op":10,"d":{"heartbeat\_interval":41250}}
OP2 IDENTIFY (客户端发送):
  {"op":2,"d":{"token":"...","properties":{...},"presence":{...},"compress":true}}
OP0 DISPATCH READY (服务器返回):
  {"t":"READY","d":{"user":{...},"guilds":[...],"private\_channels":[...],
    "session\_id":"...","relationships":[...]}}
同时也捕获到了 MESSAGE\_CREATE 事件、心跳帧 (OP1/OP11)、会话状态变更 (SESSIONS\_REPLACE) 等。

![](https://attach.52pojie.cn/forum/202607/28/170530j0laxuwual0dzlad.png)

五、DLL 设计与实现
5.1 架构
  ┌──────────────────────────────
  │ 调用层 (Python / 易语言 / C++)
  │ DLL 导出: Discord\_Login, Discord\_SendMsg
  ├──────────────────────────────
  │ 会话管理 (多账号独立 Token + WS 连接)
  ├──────────────────────────────
  │ HTTP 模块 (libcurl 动态加载)
  │   - 登录/认证
  │   - 消息/好友/Guild API
  │   - X-Super-Properties 构造
  ├──────────────────────────────
  │ Gateway 模块 (libcurl WS API)
  │   - OP2 IDENTIFY / Heartbeat / Resume
  │   - 事件处理 (推入队列)
  ├──────────────────────────────
  │ zstd 模块 (libzstd 动态加载)
  │   - DStream 流解压 (Server 至 Client)
  ├──────────────────────────────
  │ 事件队列 (环形缓冲, 线程安全)
  └──────────────────────────────
5.2 技术栈选型
  网络层: 全部使用 libcurl 动态加载
    -- HTTP: curl\_easy API (GET/POST/PUT/PATCH)
    -- WebSocket: curl\_ws\_send / curl\_ws\_recv (libcurl 8.x 原生支持)
    -- TLS: 跟随 libcurl (schannel / OpenSSL 自适应)
  压缩: libzstd 动态加载
    -- Server->Client: ZSTD\_createDStream + ZSTD\_decompressStream (流 API)
    -- Client->Server: 不压缩 (Discord 允许客户端发送 TEXT 帧)
  编译: Visual Studio 2022 MSVC
    -- /MT 静态链接 CRT, 无运行时依赖
    -- /utf-8 源码编码
  分发文件 (仅 3 个):
    discord\_protocol.dll (154KB)
    libcurl.dll (3.5MB)
    libzstd.dll (1.2MB)

![](https://attach.52pojie.cn/forum/202607/28/170255di8j7f4vjba4f828.png)

六、关键技术难点与解决记录
6.1 zstd 流解压 -- 连续流不能 reset
Discord Gateway 使用 compress=zstd-stream, 这是一种连续流压缩格式。所有 Server 发来的二进制帧拼接成一个 zstd 流。
最初使用了 ZSTD\_decompressDCtx (简单单帧解压 API), 结果 OP10 HELLO 帧可以解码, 但后续 READY 帧全是乱码。排查后发现两个问题:
问题 A: 选错了 API。ZSTD\_decompressDCtx 只能处理独立帧, 无法处理连续流。
  解决: 改用 ZSTD\_createDStream + ZSTD\_initDStream + ZSTD\_decompressStream。
问题 B: 每帧解压后错误地调用了 ZSTD\_initDStream 重置流状态。
  解决: 去掉每帧后的重置调用, 只在流创建时初始化一次。
6.2 Client->Server 压缩兼容性问题
用一个独立帧的 zstd 压缩输出发给 Server, Server 返回 CLOSE code=4002 (Error while decoding payload)。尝试了多种方案: ZSTD\_compressCCtx、ZSTD\_compressStream2 + ZSTD\_e\_end、不同的压缩级别 -- 全部 4002。
最终确认: Discord 允许客户端不压缩发送。将 Client->Server 改为 TEXT 帧 (不压缩), Server 正常接受。Server->Client 的解压保持流 API 不变。
6.3 跨线程 Python 回调崩溃
最初的设计是 WS 线程收到消息后直接调 Python ctypes 回调函数。这对于 17KB 的 READY JSON 数据来说, ctypes 的 marshaling 在跨线程场景下会崩溃。
  解决: 改用事件队列模式。WS 线程收到事件后 push 到环形缓冲区 (CRITICAL\_SECTION 保护), 主线程通过 Discord\_PollEvent 轮询取出。消除了跨线程直接调用的风险。
6.4 volatile 修饰符缺失导致状态读取异常
WS 线程将 session->state 设置为 SESSION\_ONLINE (2) 后, 主线程通过 Discord\_GetStatus 读取到的值始终为 0。原因是编译器对非 volatile 变量的优化导致主线程读到了寄存器缓存的旧值。
  解决: 将 state 字段声明为 volatile int。
6.5 GET 请求不该带 Content-Type
http.c 最初对所有请求都加了 Content-Type: application/json 头。Discord API 对 GET 请求看到这个头就以为有 JSON Body, 解析为空后报 50109 错误。
  解决: 只在 body 不为 NULL 时 (POST/PUT/PATCH) 加 Content-Type 头。

七、iPad 协议指纹
从 ProxyPin 抓包解码得到的 X-Super-Properties 结构后, 修改为 iPad 值实现伪指纹:
  os:                    iOS
  browser:               Discord iOS
  device:                iPad13,4
  os\_version:            17.5.1
  release\_channel:       appleRelease
  design\_id:             1 (iOS 为 1, Android 为 2)
  device\_vendor\_id:      随机 UUID
  client\_build\_number:   332012
  client\_version:        332.12
  system\_locale:         zh-Hans-CN
  User-Agent:            Discord-iOS/332012;RNA
该 JSON 经 Base64 编码后作为 X-Super-Properties 头随每次 HTTP 请求发送, IDENTIFY payload 中也包含相同字段。
实测验证: 使用 iPad 指纹成功通过 Discord 认证, 正常收发消息。

![](https://attach.52pojie.cn/forum/202607/28/170327t3sxt3zvvadb393f.png)

八、公开 API 接口
DLL 导出以下函数供外部调用 (stdcall, C ABI):
生命周期:
  Discord\_Init()              -- 初始化 (加载 libcurl/libzstd)
  Discord\_Destroy()           -- 清理
会话管理 (多账号并发):
  Discord\_CreateSession(name) -- 创建会话, 返回 sessionId
  Discord\_DestroySession(sid)
  Discord\_GetStatus(sid)      -- 0=离线 1=连接中 2=在线
登录:
  Discord\_Login(sid, user, pass)         -- 账号密码登录
  Discord\_LoginWithToken(sid, token)      -- Token 直接登录
  Discord\_Logout(sid)
消息:
  Discord\_SendMessage(sid, chid, content)
  Discord\_GetMessages(sid, chid, limit, before, out, size)
DM 频道:
  Discord\_GetPrivateChannels(sid, out, size)
  Discord\_CreateDM(sid, userId, out, size)
好友:
  Discord\_GetFriends(sid, out, size)
  Discord\_SearchFriend(sid, username, out, size)
  Discord\_AddFriend(sid, username)
  Discord\_AcceptFriend(sid, userId)
Guild (服务器/群聊):
  Discord\_GetGuilds(sid, out, size)
  Discord\_GetGuildChannels(sid, guildId, out, size)
事件轮询 (线程安全):
  Discord\_PollEvent(sid, &eventType, out, size)
    -- eventType: -1=断开, 0=READY, 1=消息
验证码:
  Discord\_GetCaptchaSiteKey(sid, out, size)
  Discord\_SubmitCaptcha(sid, captchaKey)

![](https://attach.52pojie.cn/forum/202607/28/170344wcy40ih04vvh40vu.png)

![](https://attach.52pojie.cn/forum/202607/28/170358zxaaq787wah5zqdl.png)

![](https://attach.52pojie.cn/forum/202607/28/170739k7psc4jshh7bhzof.png)

九、Python 调用示例
import ctypes, time, threading
dll = ctypes.WinDLL("discord\_protocol.dll")
dll.Discord\_Init()
sid = dll.Discord\_CreateSession(b"main")
// 登录
dll.Discord\_Login(sid, b"+66xxxxxxxxxx", b"password")
// 等待上线
while dll.Discord\_GetStatus(sid) != 2:
    time.sleep(1)
// 发送消息
dll.Discord\_SendMessage(sid, b"频道ID", b"Hello from DLL")
// 事件轮询 (可在独立线程中运行)
buf = ctypes.create\_string\_buffer(65536)
evt = ctypes.c\_int()
while dll.Discord\_PollEvent(sid, ctypes.byref(evt), buf, 65536) == 1:
    if evt.value == 1:
        print(f"[MSG] {buf.value.decode()}")
    time.sleep(0.2)
dll.Discord\_Logout(sid)
dll.Discord\_Destroy()
易语言调用方式:
.版本 2
.DLL命令 登录, 整数型, "discord\_protocol.dll", "Discord\_Login"
    .参数 sid, 整数型
    .参数 user, 文本型
    .参数 pass, 文本型
.DLL命令 发消息, 整数型, "discord\_protocol.dll", "Discord\_SendMessage"
    .参数 sid, 整数型
    .参数 chid, 文本型
    .参数 content, 文本型

![](https://attach.52pojie.cn/forum/202607/28/170425g7cfshmmymygppaf.png)

十、源码结构
dll\_project/
  include/
    discord\_protocol.h       -- 公开 API 头文件
  src/
    discord\_internal.h       -- 内部数据结构
    http.c                   -- libcurl HTTP 封装 (动态加载)
    ws.c                     -- libcurl WebSocket + zstd 压缩解压
    ws\_gateway.c             -- Gateway 协议处理
    auth.c                   -- 登录认证
    fingerprint.c            -- iPad 指纹伪装
    event\_queue.c            -- 线程安全事件队列
    session.c                -- 多账号会话管理
    friends.c                -- 好友操作
    messages.c               -- 消息收发
    guild.c                  -- Guild 操作
    captcha.c                -- 验证码处理
    utils.c                  -- JSON 解析 / Base64 / Snowflake
    export.c                 -- DLL 导出函数
    exports.def              -- MSVC 导出表
  demo/
    discord\_demo\_v2.py       -- Python Demo
  build.bat                  -- MSVC 编译脚本
编译方法:
  1. 打开 x64 Native Tools Command Prompt for VS 2022
  2. cd 到 dll\_project 目录
  3. 运行 build.bat
  4. 产物在 build\ 目录下
分发时, 将 discord\_protocol.dll, libcurl.dll, libzstd.dll 三个文件放在同一目录即可。

十一、后续可完善功能
  Guild 接口的实战验证
  打码平台自动验证码集成 (capsolver/2captcha)
  代理配置接口 (HTTP\_PROXY/HTTPS\_PROXY)
  调试日志静默开关
  易语言 Demo

十二、声明
本文仅供安全研究和学习交流之用。
Discord 是 Discord Inc. 的注册商标。
请遵守目标平台的使用条款。
代码和思路仅供参考, 请勿用于违规用途。

源码 & Demo 获取：
蓝奏云下载地址：https://wwbqw.lanzouv.com/iueEe3z8f4fg
访问密码：xiaohei1
编译依赖说明：
编译工程需要 libcurl.dll、libzstd.dll，请自行前往官方渠道获取；
项目配套头文件全部打包在源码压缩包中，无需另行下载。
免责声明：资源仅供个人学习研究使用，禁止未经授权二次分发、商用，产生一切后果由使用者自行承担。
================================================================================
  END
================================================================================
