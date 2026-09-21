# 分帧与传输层（帧头 / 长度前缀 / 包装）

> 目标：**先把"哪些字节是 protobuf"切出来，再谈解码。**
> 90% 的"解出来是乱码"不是算法错，是没去帧头或没切成单条消息。

## 1. gRPC-Web 的 5 字节帧头

**结构：`[flag:1B][length:4B 大端][payload]`**，`flag = 0` 表示未压缩。

真实样例（万方数据请求体，`content-type: application/grpc-web+proto`）：

```
00000000  00 00 00 00 1b 0a 0a 50 65 72 69 6f 64 69 63 61   ...Periodica
00000010  6c 12 0d 77 6c 78 62 32 30 32 33 30 31 30 30 31   l  wlxb202301001
```

| 偏移 | 字节 | 含义 |
| --- | --- | --- |
| 0 | `00` | flag：0 = 未压缩（**不是 protobuf 字段**） |
| 1–4 | `00 00 00 1b` | 载荷长度 27，**大端** |
| 5 | `0a` | 第一个 tag：字段 1，wire 2 |
| 6 | `0a` | 长度 10 |
| 7–16 | `50 65 ...` | `"Periodical"` |
| 17 | `12` | 字段 2，wire 2 |
| 18 | `0d` | 长度 13 |
| 19–31 | `77 6c ...` | `"wlxb202301001"` |

**两个来源互证**：一篇用「拆 4 字节长度 + 首字节补 0」手写（`f=[0,0,0,0]; for(s=3;s>=0;s--){f[s]=n%256;n>>>=8}`），
另一篇直接写 `bytes([0, 0, 0, 0, len(form_data)])`。两者等价，都说明：

- 长度字段是**大端 4 字节**（长度 < 256 时前 3 字节为 0，看起来"只用了 1 字节"，**别据此以为长度只有 1 字节**）
- 第 0 字节（flag）**不属于长度**

### 常见踩坑

| 坑 | 现象 | 判据 / 处理 |
| --- | --- | --- |
| 把 5 字节整体当大端整数读 | `int.from_bytes(content[:5],'big')` 在 flag=0 时**恰好**等于长度，于是"看起来能用" | 只在 flag=0 时偶然成立。一旦 flag≠0（压缩帧）就错。**显式写成 `int.from_bytes(content[1:5],'big')`** |
| 忘了校验 `5 + length == len(content)` | 截断/多帧时静默少解 | 必须断言；`scripts/pb_decode_raw.py --frame grpc-web` 会直接报错退出 |
| 多帧响应只取第一帧 | 流式响应（server streaming）数据缺失 | `application/grpc-web-text` 是 **base64 编码的帧序列**，需先 base64 再逐帧切 |
| 压缩帧 | 解出乱码 | `flag=1` ⇒ 载荷是 gzip。判据：`0x1f 0x8b` 开头。带 `grpc-encoding: gzip` 响应头 |

## 2. 其他分帧形态

| 形态 | 判据 | 剥离方式 |
| --- | --- | --- |
| 裸 protobuf | 首字节就是合法 tag | `--frame none` |
| 4 字节大端长度前缀 | 前 4 字节 ≠ 合法 tag，且 `4+len == 总长` | `--frame len4be` |
| 2 字节大端长度前缀 | 同上，宽度 2 | `--frame len2be` |
| base64 整段 | 全 ASCII、`=` 结尾、`[A-Za-z0-9+/_-]` | `--frame base64`（宽容模式处理 URL-safe / 换行 / 缺填充） |
| WebSocket 单帧 | 每条消息一个 WS frame | 直接对每条 frame 的 payload 解码（见 `websocket-reverse`） |
| TCP 长连接多消息 | 帧头 + 消息交替 | 循环剥离，不要一次全喂给解码器 |

**不要相信"看起来像长度"的数字。** 判据只有一条：**剥离后剩余字节能被完整解析成至少一个合法字段**
（字段号 ≠ 0、长度不越界、恰好消耗完）。`--frame auto` 就是按这条判据依次试。

## 3. 包装层：base64 / URL-safe / 转义

抓包/文章/日志里的 protobuf 常被套一层文本编码，形态比想象中乱：

| 形态 | 例 | 处理 |
| --- | --- | --- |
| 标准 base64 | `input_protobuf_encoded=CAIiBQiKARAI` | 直接解 |
| URL-safe base64 | 含 `-` `_` | `-`→`+`、`_`→`/` 后再解 |
| 缺 `=` 填充 | 被截断或去掉了尾部 `=` | 补到 4 的倍数再解 |
| JSON 里的 `\/` 转义 | `...IgUI\/gEQAy...` | 先去掉 `\` |
| 日志换行 | 每 76 字符换行 | 去空白 |

`scripts/pb_decode_raw.py` 的 `--frame base64` **先严格、再宽容**，并把走了哪条路写进输出的 `frame` 字段。
宽容路径只做"可逆且不改字节语义"的规范化，失败仍报错——**不允许静默接受垃圾**。

## 4. 响应/请求是"半结构化"的情况

有的目标把 protobuf 拼在别的东西后面，或把别的东西拼在 protobuf 前面：

| 现象 | 判据 | 处理 |
| --- | --- | --- |
| 找到 `content-type: application/grpc-web+proto` 但 body 明显更长 | 多帧或 trailer | 逐帧剥；gRPC-Web 的 trailer 帧 `flag=0x80` |
| 同一字段里塞了一段 JSON 字符串 | wire 2 + 内容是合法 UTF-8 JSON | 该字段类型是 `string`，**不是嵌套 message**（见 `blackbox-and-pitfalls.md` §2 的文本优先规则） |
| 字段里塞的是 gzip | `0x1f 0x8b` | 该字段是 `bytes`，先 gunzip 再当下一层 protobuf 解 |
| 字段里塞的是另一套自定义序列化 | 递归解析失败且不是文本 | 该字段是 `bytes`，转 `protocol-reverse` 的方法论 |

## 5. 提交侧：怎么把请求造回去

逆向的终点通常是**自己构造请求体**。顺序：

1. `protoc --python_out=. <recovered>.proto` 生成 pb2（需本机有 protoc，见 SKILL.md「环境前提」）
2. 按 `.proto` 填字段 → `SerializeToString()` 得到裸载荷
3. **补帧头**（照抄来源：gRPC-Web 就 `b"\x00" + len(payload).to_bytes(4, "big") + payload`）
4. 需要时再套 base64
5. 用逐字节 diff 验证：**自己构造的请求体 与 浏览器发出的请求体 必须一致**
   —— 这是本技能的核心验收标准，不是"服务器返回 200"

Python 侧填值的语法差异（易错）：

| 场景 | 写法 |
| --- | --- |
| 单值字段 | `msg.field = value` 直接赋 |
| `repeated` 标量/枚举 | `msg.list.append(v)` 或 `msg.list.extend([...])` |
| `repeated` message | `sub = msg.list.add(); sub.x = 1`（**先 `add()` 拿到对象再赋**） |
| `map` 字段 | `msg.mymap["k"] = v` |
| 超范围枚举值 | protobuf 允许赋任意整数；打印时会回落成数字 |

JS 侧（自写复现时）注意 `repeated` 的四种访问器：
`getXxxList()` / `setXxxList(arr)`（**必须是数组**）/ `addXxx(v)`（追加单值）/ `clearXxxList()`。
