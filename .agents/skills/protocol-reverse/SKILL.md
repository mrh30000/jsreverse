---
name: protocol-reverse
description: Use for authorized reverse engineering of custom binary protocols, Protobuf/gRPC, WebSocket frames, and PCAP-driven protocol recovery.
---

# Protocol Reverse Engineering

## ACTION REQUIRED（读完后立刻执行）

> **路径说明（本仓库内必读）**：下面第 1/3/4 条里的 `<parent-repo>/field-journal/`、
> `<parent-repo>/scripts/case-init.ps1`、`<parent-repo>/tool-index.md` 属于**父级独立仓库
> `open-source/reverse-skill/` 的布局**，在本仓库 `D:\work\jsreverse` 下**不存在**。
> 这里一律写成 `<parent-repo>/...` 占位形式（机械校验约定：含 `<...>` 的路径不是具体引用），
> 本仓库只保留本 SKILL.md 的方法论部分，不要把这些路径当作本仓库流程，也不要去创建它们；
> 需要授权/边界约定时按本仓库 `AGENTS.md` 与用户确认。

1. `NOW`: ~~读取 `<parent-repo>/field-journal/precedent-reverse.md`~~ — 该文件不在本仓库；改为：确认授权与常规操作边界（与用户明确 scope）
2. `NOW`: 确认任务是否为**协议/流量/序列化格式**逆向（非纯 Web 参数签名 → 转 `js-reverse/`）
3. `NOW`: 若有目标网络交互 → ~~`<parent-repo>/scripts/case-init.ps1`~~ 该脚本不在本仓库；改为：手工与用户确认 scope，`auth` 未 granted 禁止对目标 ACT
4. `NEXT`: ~~读取 `<parent-repo>/tool-index.md`~~ 该文件不在本仓库；改为：按需在本仓库 `AGENTS.md`「工具链」段确认可用工具（tshark/wireshark 等可能需手动 bootstrap）
5. `ACT`: 进入工作流 Phase 1，产出帧布局或消息字典草稿

## 适用场景

- 自定义 TCP/UDP 二进制协议
- Protobuf / gRPC / FlatBuffers / MessagePack
- WebSocket / MQTT / 私有 RPC
- PCAP / PCAPNG 还原字段与状态机
- 客户端-服务端校验、序列号、加密帧头

## 不走本 skill

| 情况 | 去哪 |
|------|------|
| 仅 HTTP 参数签名 / JS 加密 | Web 参数类 → `web-reverse-algorithm` / `web-verify-patcher` |
| 仅 TLS 证书问题 | 浏览器代理 / 抓包工具（`browsercli` 系列） |
| 固件内协议栈深挖 + 仿真 | 本仓库未收录；先按 `AGENTS.md` 确认 scope 与工具可用性 |
| **载荷是 Protobuf / gRPC-Web（含 google-protobuf、protobufjs、厂商自研 protobuf 实现）** | **`protobuf-reverse`** —— 方言判据、零依赖 wire 解码、从生成 JS 抽 `.proto`、两级逐字节验收都在那里。**本 skill 不重复维护 protobuf 细节。** |
| 载荷是 WebSocket 上的 protobuf | `websocket-reverse`（消息分组 / 心跳 / `payloadType` 路由）→ 再转 `protobuf-reverse` |
| 载荷是 Wasm 编码 / 自实现 VM | `wsam-reverse` / `ast-deobfuscation` |

## 工作流

### Phase 1 — 采集与分诊

```text
□ 拿到样本：PCAP / 代理导出 / 客户端日志 / 二进制
□ 标记方向：C→S / S→C；是否有握手、心跳、重连
□ 固定头？魔数？长度字段？TLV？定长？
□ 是否压缩（zlib/gzip/lz4）或加密（AES/ChaCha 帧内）
□ tshark -r cap.pcap -T fields -e frame.number -e ip.src -e tcp.payload
```

### Phase 2 — 帧布局还原

```text
□ 对齐多个同类消息，找不变字节 / 自增序列号
□ 长度字段：大端/小端、含头/不含头
□ 校验：CRC16/32、checksum、HMAC 位置
□ 画出状态机：Connect → Auth → Ready → Request/Response → Close
□ 工具：Wireshark 自定义 dissector 草稿 / ImHex / 010 Editor 模板 / Kaitai Struct
```

### Phase 3 — 序列化与加密

```text
□ Protobuf：→ 转 protobuf-reverse 技能（本机无 protoc / 无 google.protobuf，用它的零依赖脚本）
   - 先剥帧（gRPC-Web 5 字节 / 长度前缀 / base64），再 pb_decode_raw.py --roundtrip 证无损
   - 认方言（jspb / protobufjs full / 静态描述表 / 厂商自研轻量），再 pb_proto_from_js.js 抽 .proto
   - 字段名只能从生成 JS 或业务语义来；enum 取值名在生成代码里已丢失
□ gRPC：HTTP/2 headers + protobuf body（/包名.服务名/方法名 形式）
□ 加密：找密钥派生（客户端 so/dll/JS）→ 转对应逆向技能
□ 重放：仅在授权 scope 内；先无害字段再敏感操作
```

**判据：只要载荷能被识别为 protobuf，就不要在本 skill 里手工拆 wire 结构** ——
那正是 `protobuf-reverse` 已经工具化且带自检的部分。

### Phase 4 — 产物

```text
MUST 产出：
- 消息类型表（name / opcode / fields）
- 至少 1 条可复现的解码命令或脚本
- Evidence：原始 hex 摘录 + 解码结果（脱敏）
```

## 工具链

| 工具 | 必需 | 用途 | 自举 |
|------|------|------|------|
| tshark / Wireshark | 强烈建议 | PCAP 解析 | 手动 / winget |
| Python3 | 是 | 解码脚本 | 系统 |
| blackboxprotobuf | 可选 | 未知 protobuf | pip |
| ImHex / 010 | 可选 | 结构模板 | 手动 |
| IDA / r2 / Ghidra | 按需 | 客户端序列化函数 | 见对应 skill |

## 参考

- `references/protocol-workflow.md` — 帧布局速查（**其中 Protobuf 细节已抽到 `protobuf-reverse`，本文件只保留指针**）
- `references/multi-magic-and-compression.md` — **帧切开之后的"额外一层"**：同一连接多 magic 分派、
  SIMD(NEON) 批量异或翻译、**连续流压缩（zstd-stream / permessage-deflate）不能每帧 reset**、
  **双 TLS 栈导致一部分请求抓不到**、TLV 固定字段表、字节集反转、CRC "对谁算"、
  PC 端条件断点定位、地址池/抗拦截结构
- `references/private-binary-packet-families.md` — **客户端自研二进制封包族**：「长度字段是唯一允许明文的一段」、「传输密钥 +1 再 ^4」这类**密钥变换**、**会话中换钥**（种子在包尾定长字段）、**资源体 XOR 密钥 = 文件名**、封包头里的**偏移/排序表**、逐字段标注法（`长度前缀+数据`）、**「倒着逆」**、**CrossBridge/FlasCC 产物判据**（AS 里是 C 编译出来的 ⇒ 读解密侧求逆）
- 相关技能（本仓库内）：`protobuf-reverse`（protobuf / gRPC-Web）、`websocket-reverse`（WS 帧与分组）、
  `wsam-reverse`（Wasm）、`ast-deobfuscation`（生成 JS 被混淆时）、
  `android-app-reverse`（协议实现在 App/so 里时）

## 路由上下文

**上游**: `MASTER-ROUTING` R21 · `routing.md`  
**下游**: 需客户端算法 → `ida-reverse`/`js-reverse`；需利用重放 → `pentest-tools`/`api-security`  
**同级**: `malware-analysis`（C2 协议）、`digital-forensics`（流量取证）

## 任务完成自检

- [ ] 是否还原了消息布局或状态机（而非只贴 hex）？
- [ ] 是否有可复现解码命令？
- [ ] 是否遵守 scope / 脱敏？
- [ ] 若载荷是 protobuf：是否做了 **round-trip 逐字节一致** 校验？（只"看着对"不算）
- [ ] 是否回写报告 Checklist？