# case · Discord Gateway：OP 状态机 + zstd-stream + 双 TLS 栈

> **抽象自** `52pojie-2119947`（Discord Android 协议逆向 → Windows 协议 DLL）。
> **适用**：标准化的**事件网关型** WS 协议（`OP` 码 + `t`/`d` 信封 + 心跳 + IDENTIFY + READY），
> 且服务端用**连续流压缩**。Discord 只是最典型的样本；同族还有不少自建网关。
> **不适用**：帧内是 protobuf 的 WS ⇒ `case-websocket-protobuf.md`；帧内是定长头 + 压缩的 ⇒ `case-cocos2djs-ws-packet.md`。

---

## §1 三层结构（先分层，再动手）

```text
① 传输层：WSS（`wss://gateway.discord.gg/?encoding=json&v=9&compress=zstd-stream`）
② 压缩层：Server→Client **连续 zstd 流**（不是每帧独立）；Client→Server **不压缩（TEXT 帧）**
③ 协议层：JSON 信封 `{"op": N, "d": {...}, "t": "事件名", "s": 序号}`
```

> ★★★ **判据**：**"能解出第一帧、后面全是乱码"** ⇒ 99% 是**连续流压缩**，
> 不是加密、也不是密钥错（详见 `../../../protocol-reverse/references/multi-magic-and-compression.md` §3）。
> ★★ **Client→Server 压缩被拒（`CLOSE code=4002`）时，第一选择是"客户端干脆不压缩"**，
> 不要继续调压缩 level / API。

---

## §2 ★★ 抓不到帧时：hook 点选在哪

源文实测的两层问题，**在别的 App 上会原样重演**：

| 问题 | 现象 | 处置 |
| --- | --- | --- |
| **React Native 桥 hook 不到** | hook `WebSocketModule.send` **拿不到 `OP2 IDENTIFY`** | ★★ 业务层走的是 **OkHttp 的 WebSocket 接口**，**绕过了 RN 桥** ⇒ 改 hook **`okhttp3.WebSocket.send`** |
| **代理抓不到 REST** | Charles/Fiddler 看不到 `POST /api/v9/auth/login` | ★★★ **双 TLS 栈**：REST 走 Rust `rustls`（**不信任用户 CA**），WSS 走 Java OkHttp（走系统代理）⇒ **别在 MITM 上耗，改 hook** |
| **二进制帧看不到内容** | 只能看到 `Binary Frame` | hook 解压模块（源文 hook 了 `CompressionModule`）或自己按 §1 解流 |

```text
推荐 hook 组合：
  com.facebook.react.modules.websocket.WebSocketModule.sendEvent   ← 接收帧
  okhttp3.WebSocket.send                                           ← 发送帧（★ 关键）
  <App 的 zstd 解压模块>                                            ← 解压
```

---

## §3 ★★★ 握手时序（可直接当模板对号入座）

```text
C→S  WS-CONNECT   wss://…/?encoding=json&v=9&compress=zstd-stream
S→C  OP10 HELLO   {"op":10,"d":{"heartbeat_interval":41250}}          ← 拿心跳间隔
C→S  OP2  IDENTIFY{"op":2,"d":{"token":"…","properties":{…},"presence":{…},"compress":true}}
S→C  OP0  DISPATCH{"t":"READY","d":{"user":{…},"guilds":[…],"private_channels":[…],
                                     "session_id":"…","relationships":[…]}}
     ↕   OP1 心跳 / OP11 心跳 ACK（按 heartbeat_interval 周期发）
S→C  OP0  DISPATCH{"t":"MESSAGE_CREATE", …} / {"t":"SESSIONS_REPLACE", …}
```

> ★★ **判据**：**"先 HELLO 拿间隔，再 IDENTIFY 带 token，然后 READY 带全量初始状态"**
> 是事件网关的**通用骨架**；`session_id` + `s`（序号）用于 **RESUME**。
> ⇒ 复现时**照这个顺序实现状态机**，比逐条读抓包快。
> ★★ **`IDENTIFY` 的 `properties` 与 HTTP 的 `X-Super-Properties` 是同一份东西**
> （`os` / `browser` / `device` / `os_version` / `release_channel` / `design_id` / `client_version` …）
> —— **两处必须一致**，否则容易被识别。

---

## §4 ★★ 设备指纹伪装（本 case 的副产物）

```text
X-Super-Properties: Base64( JSON 指纹 )   ← 每个 HTTP 请求都带
同一份 JSON 也出现在 IDENTIFY payload 里
```

| 字段 | Android | iOS（iPad 伪装） |
| --- | --- | --- |
| `os` | `Android` | `iOS` |
| `browser` | `Discord Android` | `Discord iOS` |
| `device` | 机型 | `iPad13,4` |
| `os_version` | 版本号 | `17.5.1` |
| `release_channel` | — | `appleRelease` |
| `design_id` | `2` | **`1`** |
| `device_vendor_id` | — | 随机 UUID |
| `client_build_number` / `client_version` | — | `332012` / `332.12` |
| `system_locale` | — | `zh-Hans-CN` |
| `User-Agent` | — | `Discord-iOS/332012;RNA` |

> ★★ **判据**：**"改 User-Agent 不够，`X-Super-Properties` 里还有一份"** ——
> 这类"双份指纹"结构在其它平台同样常见（HTTP 头 + 握手 payload）。
> ★ 源文实测：**只改这两处即可通过认证并正常收发消息** ⇒ 说明服务端主要看这份 JSON 的一致性。

---

## §5 协议落成独立产物时的两个线程坑

源文把协议实现成 DLL（`curl` + `zstd` + 事件队列）时踩到：

| 坑 | 现象 | 处置 |
| --- | --- | --- |
| **跨线程回调崩溃** | WS 线程直接调 Python `ctypes` 回调，17KB 的 READY JSON **marshaling 崩** | 改**事件队列**：WS 线程 push（临界区保护）→ 主线程 `PollEvent` 轮询 |
| **状态读取拿到旧值** | WS 线程置 `state=ONLINE(2)`，主线程读到 **`0`** | 状态字段加 **`volatile`**（编译器把它缓存到寄存器了） |
| **GET 带 `Content-Type`** | 服务端报 `50109`（把 GET 当成"有 body 但解析为空"） | **只在 body 非空时**加 `Content-Type` |

> ★★ 这三条与"WS 逆向"本身无关，但**做 WS 长期监听/协议产物时一定会遇到** ⇒ 提前按此设计。

---

## §6 来源表

| 源文 | 贡献 |
| --- | --- |
| `52pojie-2119947` Discord Android → Windows 协议 DLL | §1 三层结构、§2 hook 点选择与双 TLS 栈、§3 OP 时序、§4 双份指纹、§5 线程与 header 坑 |
