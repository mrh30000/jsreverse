# 投屏捕获：把自己伪装成接收端拿媒体地址（DLNA / UPnP）

> **本文解决什么问题**：目标平台的视频**只能在 App 内看**，网页端不提供；
> 但 App 有「投屏」按钮。**不去破播放接口，而是扮演目标设备的「接收端」**，
> 让 App 主动把**已经是明文的播放地址**交到我们手上。
>
> **不是脱壳/解密**：本文全程不解密任何东西 —— 拿到的 `CurrentURI` 就是明文地址。
> 属于 §0 地址还原层（与 `playback-address-interfaces.md` 同级，但介质是**局域网协议**）。

---

## §1 ★★ 一句话判据：投屏给的是**地址**，不是画面

「投屏」这个词有歧义，先分清：

| 叫法 | 实际协议 | 传的东西 | 对采集有用吗 |
| --- | --- | --- | --- |
| **屏幕镜像**（Miracast / AirPlay 镜像 / 华为多屏协同） | 私有镜像协议 | **实时画面像素** | ❌ 拿不到地址 |
| **媒体投送**（DLNA DMR / Chromecast / AirPlay 播放） | DLNA / DIAL 等 | **一个 URL** | ✅ **地址就是我们的目标** |

> ★★ **判据**：**点击投屏后电视/盒子是「从头开始播这个视频」，而不是「显示手机屏幕」** ⇒ 是媒体投送
> ⇒ 地址必然有一次**明文传输**，抓它就完了。

---

## §2 ★★★ 冒充 DMR：DLNA 五个角色与我们要做的两个服务器

DLNA 的全部角色（看懂这张表就知道该冒充谁）：

| 角色 | 含义 | 本场景中的实例 |
| --- | --- | --- |
| **DMS** Digital Media Server | 存储并提供媒体 | B 站/爱奇艺的**服务器** |
| **DMR** Digital Media Renderer | 接收并播放 DMC 推来的媒体 | **智能电视 / 音箱** ← **我们要冒充它** |
| **DMC** Digital Media Controller | 遥控器：找媒体、指定 DMR 播放 | 手机上的 **App** |
| DMP | ≈ DMR + DMC | 一体机 |
| DMPr | 打印机 | 无关 |

> ★ **关键**：地址是**DMC（App）发给 DMR（我们）的**，不是 DMS 发的。
> 所以**只要让 App 认为我们是 DMR，它就会把地址发过来**。

**DMR 由两个服务器组成**（缺一不可）：

```text
① SSDP 服务器（UDP）      : 让 App「发现」我们
② HTTP 服务器（TCP）      : 托管设备描述文件 + 接收并解析控制指令
```

---

## §3 SSDP：基于 UDP、报文结构与 HTTP 一模一样

> 源文原话：「除了它使用 UDP 外，其它方面，例如报文结构，和 HTTP 不能说十分相似，只能说一模一样」。

- **组播地址** `239.255.255.250`（IPv4 D 类，首字节 `0xEF`）**端口 `1900`**；
- 经典广播长这样：

```text
NOTIFY * HTTP/1.1
Host: 239.255.255.250:1900
NT: upnp:rootdevice
NTS: ssdp:alive
Location: http://192.168.14.122:2869/upnphost/udhisapi.dll?content=uuid:04f976f9-...
USN: uuid:04f976f9-...::upnp:rootdevice
Cache-Control: max-age=1800
Server: Microsoft-Windows/10.0 UPnP/1.0 UPnP-Device-Host/1.0
```

**让 DMC 知道我们存在的两条途径**：

| 途径 | 方法 | 主/被动 | 关键字段 |
| --- | --- | --- | --- |
| 广播 | `NOTIFY` | **主动** | `NTS: ssdp:alive`、`NT`、`USN`、`Location` |
| 应答 | 对 `M-SEARCH` 回 `HTTP/1.1 200 OK` | **被动** | 同上 |

> ★★ **两条可迁移判据**：
> 1. **DMR 注册了多个服务，必须分别广播多次**（源文的实现里至少有
>    `RenderingControl` / `AVTransport` / `ConnectionManager`，外加 `rootdevice` /
>    `uuid:<uuid>` / `device type` 这几类 `NT`）⇒ **只广播一次是发现不了的**。
> 2. **`Location` 指向我们自己的 HTTP 服务器**（源文是 `http://<本机IP>:<HTTP_PORT>/DeviceSpec`）
>    ⇒ 地址里**必须是可以被局域网内其它设备访问到的 IP**，不能是 `127.0.0.1`。
>    源文用 `socket.gethostbyname(socket.gethostname())` 取本机局域网 IP。

> ⚠️ **做 dummy DMR 可以偷懒**：源文原话「只要看到 `M-SEARCH` 消息就回应，
> 而不必处理它的搜索目标是不是我们的 DMR」⇒ 生产上够用，但**在多设备局域网会有额外回包**。

---

## §4 HTTP 侧：三个关键路由

| 路由 | `GET` | `POST` |
| --- | --- | --- |
| `/DeviceSpec` | **设备描述 XML**（设备类型/名称/制造商/序列号/UUID/服务清单） | 不支持 |
| `/AVTransport` | 该服务的**服务描述 XML** | **调用动作**（改播放内容/进度/循环模式/开始/暂停/停止） |
| `/RenderingControl` | 该服务的服务描述 XML | 调用动作（静音/音量） |

> ★ **`/DeviceSpec` 里定义的服务**决定了后两个路由 —— 所以**先有设备描述，才有服务路由**。
> 源文从仓库模板取这三份 XML（`DeviceSpec.tmpl.xml` / `AVTransport.xml` / `RenderingControl.xml`）。

---

## §5 ★★★ 地址就在这里：`SetAVTransportURI` 的 `CurrentURI`

App 让「电视」开始播放时，发的就是一个 SOAP `POST`：

```text
POST /AVTransport HTTP/1.1        ← 我们托管的那个路由
<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"
            xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
    <s:Body>
        <u:SetAVTransportURI xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
            <InstanceID>0</InstanceID>
            <CurrentURI>http://example.com/sample.mp4?param1=a</CurrentURI>
            <CurrentURIMetaData/>
        </u:SetAVTransportURI>
    </s:Body>
</s:Envelope>
```

> ★★★ **目标字段逐字是 `CurrentURI`**，它在 `SetAVTransportURI` 动作里，`InstanceID` 固定为 `0`，
> `CurrentURIMetaData` 通常为空。
> ⇒ **不需要实现任何播放逻辑**，只要：
> ① 把收到的 XML body **原样落到日志**；
> ② 从 `CurrentURI` 里取出 URL；
> ③ **做一次 XML 实体解码** —— 源文特别提示「注意解码」：
>    query 串里的 `&` 在 XML 里会写成 `&amp;`（源文的示例在 Markdown 渲染后显示成 `¶m2=b`）。

### §5.1 手工路线（零代码，先验证可行性）

不想写代码时，用 **Windows Media Player 当 DMR**（源文完整步骤）：

1. 控制面板 → 网络共享中心 → **媒体流式处理选项** → **启用媒体流**；
   - 若报「媒体流未启用」⇒ 去「Windows 服务管理工具」启用
     **Windows Media Player Network Sharing Service**（启动类型设「自动」）；
   - 若报 **错误 1068（依赖服务或组无法启动）** ⇒ 先启动它的 5 个依赖服务：
     **Windows Search**、**Background Tasks Infrastructure Service**、**Remote Procedure Call (RPC)**、
     **DCOM Server Process Launcher**、**RPC Endpoint Mapper**，然后**重新进入**媒体流选项；
   - 在所有网络中允许访问共享媒体。
2. 打开 **Windows Media Player** → 「媒体流」→ 勾选 **允许远程控制我的播放器**。
   ⚠️ **这一步之后不能关闭 WMP**，否则后面找不到设备。
3. 手机连**同一局域网** → 打开支持 DLNA 的 App → 播放视频 → 点投屏 → 选你的电脑。
4. 右键画面 → **显示播放列表** → 找到刚投的那个 → 右键 → **属性** → **文件**选项卡 →
   里面的**文件**就是视频 URL（鼠标从头到尾选中复制）。

> ★★ **判据**：**「能播」就已经证明「我们拿到了正确地址」**，不需要再验证一遍。
> ⇒ 手工路线的价值是**先花 5 分钟确认「这条路走得通」**，再决定要不要写代码。
> ⇒ 反过来：**如果 WMP 能播而你的代码拿不到地址，问题在 SSDP/设备描述，不在地址本身。**

---

## §6 工程实现要点（假 DMR 的最小骨架）

```text
[SSDP 线程]  UDP socket 绑 0.0.0.0:1900
             setsockopt SO_REUSEADDR + SO_BROADCAST
             IP_ADD_MEMBERSHIP 加入 239.255.255.250
             ├ 主动：周期性发若干条 NOTIFY（NTS: ssdp:alive）
             └ 被动：收到 M-SEARCH 就回 200 OK
[HTTP 线程]  起一个 HTTP server
             GET  /DeviceSpec        → 设备描述 XML（模板替换 UUID/名称/序列号）
             GET  /AVTransport       → 服务描述 XML
             POST /AVTransport       → ⭐ 打印/落盘 body，取 CurrentURI
             GET  /RenderingControl  → 服务描述 XML
             POST /RenderingControl  → 打印
```

> ★ **保活**：源文的 Rust 版 `KEEP_ALIVE_INTERVAL = 60s` 周期性重播 `ssdp:alive`；
> Python POC 用 `Cache-Control: max-age=1800`。
> ⇒ **不重播的后果是「一开始能发现，过几分钟设备列表里就没了」**（静默）。

- 源文的两份实现（Python POC / Rust）都托管在开源仓库 `PRO-2684/dlna-dmr`（GPL-3.0）。
- 源文自评 Python POC 的不足：**它把所有 `GET`/`POST` 都打出来，
  还得自己在一大堆日志里翻网址** ⇒ 落地时**直接对 `CurrentURI` 做提取**，不要人肉翻日志。

---

## §7 排错表

| 症状 | 真因 | 处置 |
| --- | --- | --- |
| App 的设备列表里**看不到**我们的假 DMR | SSDP 没广播 / 只广播了一种 `NT` / `Location` 指向 `127.0.0.1` | 逐项核对 §3：多 `NT` 分别广播、`Location` 用**局域网 IP** |
| 一开始能看到，**过几分钟消失** | 没做保活重播 | 加 `ssdp:alive` 周期重播（60s 或 `max-age` 内） |
| 能发现、点了投屏**没反应** | HTTP 侧路由缺失或 XML 不合规 | 核对 §4 三个路由；`/DeviceSpec` 必须返回**合法 XML** |
| 收到 `POST` 但**取不到 URL** | ① 字段认错 ② 没做 XML 实体解码 | 认 `SetAVTransportURI` 里的 **`CurrentURI`**；`&amp;` → `&` |
| 拿到 URL 但**播放器打不开** | 地址带**时效/来源校验**（`Referer`/`token`/`expire`） | 见 `live-source-longevity.md` §0/§1 与 `hls-and-ts-structure.md` |
| 电视上**能看到手机屏幕**（不是从头播） | 目标做的是**镜像**而不是媒体投送 | 回 §1：这条链路拿不到地址，换路线 |

---

## §8 边界与登记

- **本文只负责「拿到一个地址」**。地址拿到之后的时效、防盗链、分片、加密 → 分别见
  `live-source-longevity.md`、`hls-and-ts-structure.md`、`preview-gating-and-segment-enumeration.md`。
- **只在自己拥有的设备与局域网内做技术验证**；不要伪造他人设备的 UUID 去干扰别人的局域网。
- 源文自述的「投屏」在本文件里被限定为**媒体投送**（见 §1），镜像类协议不在本文范围。
- 源文给出的是**通用 DLNA 实现**（不针对某个具体平台），因此本文**不登记任何平台专属字段**；
  `CurrentURI` 的**具体形态随 App 而异**（可能是 `.mp4`、`.m3u8`、带签名的 URL），
  第一件事是**把它原样记下来**，再判形态。

---

## §9 来源表

| 源文 | 落点 |
| --- | --- |
| `docs/references/52pojie-2038686-[Python Rust] 基于 投屏 的视频抓包.md` | §1–§6（源文行 8–216 讲原理、218–460 是 Python POC、460+ 是 Rust 版） |
| 同上，开源实现 | `PRO-2684/dlna-dmr`（GPL-3.0，`src/template/` 下三份 XML 模板） |
