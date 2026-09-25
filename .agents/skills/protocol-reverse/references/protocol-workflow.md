# Protocol reverse 速查

> 适用：`protocol-reverse` skill · 2026-07-18

## 常见布局模式

| 模式 | 特征 | 提示 |
|------|------|------|
| 定长头+体 | 前 2/4 字节长度 | 注意是否包含头长 |
| 魔数 | 固定 `0xDEAD` 等 | 便于流再同步 |
| TLV | type-length-value 重复 | type 枚举即消息字典 |
| Protobuf | 字段号 varint | **转 `protobuf-reverse`**（本机无 protoc，用其零依赖 `pb_decode_raw.py` + `--roundtrip`） |
| 加密帧 | 熵高、无明文 URL | 先找 nonce/IV 邻域 |

## 最小 Python 骨架

```python
import struct
def parse_frame(buf: bytes):
    magic, length, msg_type = struct.unpack_from(">IHI", buf, 0)
    body = buf[10:10+length]
    return {"magic": magic, "type": msg_type, "body": body}
```

## PCAP 提取 TCP payload

```bash
tshark -r cap.pcap -Y "tcp.port==4433" -T fields -e tcp.payload | head
```

## 帧头里的 FourCC：反汇编里是「小端立即数」

> 来源 `52pojie-2120549`（极域 V6.0 投屏/远控协议）。**本族最容易白找半小时的一条。**

老式 C/C++ 网络库常把 FourCC 写成 **32 位立即数**。文件里的字节顺序是人眼可读的，
反汇编里却变了样（x86 小端）：

```text
wire bytes: 53 48 43 4F  -> "SHCO"
IDA imm32 : 0x4F434853

wire bytes: 54 4B 50 43  -> "TKPC"
IDA imm32 : 0x43504B54
```

> **判据：只在 Strings 窗口搜 `SHCO` 很可能什么也找不到，
> 必须同时搜对应的立即数，然后看交叉引用。**

实测有效的一组锚点（可当模板）：

| 线索 | 作用 |
|------|------|
| `0x4F434853` | 定位 UMSP channel 选择包 `SHCO` |
| `0x43504B54` | 定位 UMSP 数据包 `TKPC` |
| `0x46524848` / `0x46524A48` | 定位 `HHRF`(H.264) / `HJRF`(JPEG) 桌面记录 |
| `MCMD` / `SPUC` | 定位模式切换结构 / 光标状态记录 |
| `0x2321347C` | 定位模拟输入包分发器 |
| 常量 `4806`、channel `10` | 从通用传输库缩小到桌面通道 |

## 流缓冲区重组：**不要依赖 TCP segment 边界**

**同源** `52pojie-2120549`。一次 `recv` 可能拿到**半个**包，也可能一次拿到**多个**包。

```text
正确做法：维护流缓冲区；只有当缓冲区
  ① 至少有 12 字节头，且
  ② 达到 12 + payload_len
才取出一包。
```

> 典型 UMSP 帧头 = **版本 + magic + payload length（12 字节）**，payload 的首个 `u32` 是 channel id。
> **判据：按「长度字段」切包，不按抓包工具的「一次收发」切包。**

## 单变量差分：用实验定字段，不用猜

**同源** `52pojie-2120549`。把一次操作拆成单变量实验，一次只改一件事：

```text
① 只打开「观看」不移动鼠标
② 只切到「远程控制」不输入
③ 只移动一次鼠标
④ 只按一次左键
⑤ 只按一个普通字母键
⑥ 分别停止控制和停止观看
```

Wireshark 初始过滤器：

```text
udp.port == 4705 || udp.port == 5512 || tcp.port == 4806
tcp.stream eq <n>
```

**字段命名按证据逐步升级**（不要跳级）：

```text
unknown_08
  -> changes_with_x
  -> normalized_x
  -> normalized_x_u16_range_in_u32
```

> **两条铁律**：
> ① **不要因为某次值恰好等于屏幕像素就立即命名为 `pixel_x`** —— 本协议鼠标坐标实际用
> `0..65535` 归一化范围，窗口尺寸和远端编码尺寸只是**映射输入**；
> ② **必须跟到系统调用边界** —— 看到 UDP `recvfrom` **并不表示控制已经生效**，
> 要确认后续是否构造 `INPUT`、是否调用 `SendInput`、调用发生在哪个 Windows Session/desktop。

## 端口混用陷阱

**同源** `52pojie-2120549`。参数块里的端口**不要**直接当成对端服务端口：

> 「不要把参数块里的端口直接当成学生端 `4806/TCP`。其中两个端口属于**教师会话/桌面监控端点**；
> 学生端的 TCP 服务端口是**另一层连接目标**。这两个概念混用，会构造出**长度正确但状态错误**的请求。」

> **判据：同一个数字在不同层里可以是不同端口 —— 先把「会话端点 / 通道端点 / 服务端口」三层画开。**
