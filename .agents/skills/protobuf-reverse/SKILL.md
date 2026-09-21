---
name: protobuf-reverse
description: "Protobuf / gRPC-Web 二进制协议逆向技能。当目标是 protobuf、protobufjs、google-protobuf、jspb、gRPC、gRPC-Web、序列化二进制协议，或遇到「响应是一堆乱码二进制」「请求参数是一长串 base64」「application/grpc-web+proto」「application/x-protobuf」「没有 .proto 文件怎么解析」「protoc --decode_raw 解出来只有数字没有字段名」「字段号/字段类型怎么确定」「生成 JS 里 deserializeBinaryFromReader / reader.readString / switch (tag >>> 3) 是什么意思」「wire type / varint / length-delimited 怎么读」「怎么把请求体造回去」「map 字段解不出来」「repeated 判断不了」「int32 解成了巨大数字」这类问题时使用。覆盖四种方言（jspb、protobufjs full、protobufjs 静态描述表、厂商自研轻量实现）的判据与类型映射、gRPC-Web 5 字节帧头与长度前缀剥离、从生成 JS 机械抽取 .proto、无描述表时的零依赖 wire-format 解码与误判清单，并强制要求「解码→重编码逐字节一致」与「自造请求体与浏览器请求体逐字节一致」两级验收。"
---

# Protobuf 逆向

Protobuf 逆向的真正难点**不在加密，在"没有描述表"**。字节流本身是自描述的（字段号 + wire type），
但**字段名、符号性、嵌套边界、枚举取值**都不在字节里。所以工作分两半：

- **结构层**：从字节流解出字段号 / wire type / 值 —— 这层可以完全机械化，且有可判定的正确性（逐字节可逆）。
- **语义层**：字段叫什么、是不是 repeated、wire 0 到底是 int32 还是 sint —— 这层只能从生成 JS 或业务数据来。

**别把两半混着做。** 先证结构层无损，再补语义；顺序反了会在"乱码"上耗掉大部分时间。

## 环境前提

- **本机没有 protoc、没有 `google.protobuf`**。所以本技能的两个脚本都是**零依赖**：
  - `scripts/pb_decode_raw.py`：Python 标准库，`protoc --decode_raw` 的离线替代
  - `scripts/pb_proto_from_js.js`：Node 标准库，纯文本扫描，**不需要 `@babel/*`**
- 只有在"最终要生成 pb2 交付物"时才需要 protoc（`protoc --python_out=.`）。
  没有 protoc **不影响交付**：用 `pb_decode_raw.py` 出结构 + 按 `dialect-matrix.md` §2 的类型表手写解析即可。
- 两个脚本都自带 `--selftest`，离线可跑，是改脚本后的第一道回归。

## 工作流

### 第 1 步：判断是不是 protobuf，剥掉帧头

按 `references/framing-and-transport.md` 的判据表认帧形态（gRPC-Web 5 字节 / 长度前缀 / 裸 / base64）。
**不要靠肉眼看"像不像长度"**，用脚本的 `--frame auto`：它按"剥完能否完整解析"来选。

```bash
# 结构层：解出字段号 + wire type + 值，并做无损校验
# --input 必须是**你自己实际抓到的那个 .bin**；下面用 <captured.bin> 占位。
# 手上还没有样本时，先用 --hex / --b64 直接喂一段试跑。
python scripts/pb_decode_raw.py --input <captured.bin> --frame auto --roundtrip --pretty

# 拿不到文件时直接喂 hex / base64
python scripts/pb_decode_raw.py --hex "00 00 00 00 1b 0a 0a 50 65 72 69 6f 64 69 63 61 6c 12 0d 77 6c 78 62 32 30 32 33 30 31 30 30 31" --frame grpc-web --pretty
python scripts/pb_decode_raw.py --b64 "CAMiBQiKARAI" --typedef --pretty
# ⚠️ --b64 / --hex 已经是"取字节"的入口，**不要再叠 --frame base64**：
#    那会把已经解出来的字节再当 base64 解一次，必然失败。
#    --frame 是给 **--input / --stdin 读到的原始文件** 用的（文件里才是带帧的字节流）。
```

`--roundtrip` 不过就**不要继续**——它证明的是"解码无损"，是后面所有结论的地基。

### 第 2 步：认方言

在生成 JS 里搜锚点，对照 `references/dialect-matrix.md` §1 的判据表落到 A/B/C/D 之一：

| 搜到的锚点 | 方言 | 抽取方式 |
| --- | --- | --- |
| `deserializeBinaryFromReader` | A jspb | `pb_proto_from_js.js --mode jspb` |
| `.decode = function` / `>>> 3` | B protobufjs full | `pb_proto_from_js.js --mode pbfull` |
| `protobuf.roots['a.b.c']` + `{1:["name", fn, id]}` | C protobufjs 静态表 | 脚本不覆盖，见 `dialect-matrix.md` §4 |
| `sm_m` + `{n:1, br:…, bw:…}` | D 厂商自研轻量 | 脚本不覆盖，见 `dialect-matrix.md` §4 |

**方言 A 与 B 的字段定义形式完全不同**，用错判据会得出"这不是 protobuf"的错误结论。

### 第 3 步：机械抽取 .proto

```bash
node scripts/pb_proto_from_js.js --input bundle.js --out schema.proto --pretty --strict
node scripts/pb_proto_from_js.js --input bundle.js --mode pbfull --field-case keep --pretty
```

抽取器**刻意不猜**的三件事（`references/schema-recovery-from-js.md` §2 有完整清单）：
map 字段跳过、enum 取值名只占位、模块别名类型解析不到时保留原名并写备注。
这不是缺陷——**造一个错字段比少一个字段危险得多**。

字段数超过约 15 个时**不要手抄**：真实案例里单个 message 有 80+ 字段，
手写版会出现"想当然的层级错误"（见下）。

### 第 4 步：三源互证

`references/schema-recovery-from-js.md` §3 定义了三级校验，**至少做前两级**：

1. **同方言双来源**：方言 B 的 `encode`（tag 字面量 `uint32(8)`）与 `decode`（`switch (tag >>> 3)`）
   是独立来源，逐个字段对照 `(字段号, 类型)`。
2. **与 wire 结构对照**：抽取的字段号集合必须覆盖真实样本里出现的字段号；
   `repeated` 字段在样本里应出现多次；基础类型必须与解出的值形态相容。
3. **与第二来源对照**：有文章/他人结论时逐字段比对。

> **实测案例（本技能建立时抓到）**：某方数据的 `Periodical`，
> 文章手写版把 `case 45` 的 `readString()` 写成了嵌套 message `Issn issn = 45;`，
> 而它自己贴出的生成 JS 明确是 `r = t.readString(); e.setIssn(r);`。
> 机械抽取产出 `string issn = 45;`，与生成 JS 一致。
> 旁证：手写版的解码结果里 `"issn": {}` 是空对象——按 message 解 string 必然解空。
> **两者冲突时默认信生成 JS。**

### 第 5 步：两级验收（缺一不可）

**两级都要做，但第二级不依赖 protoc** —— 有无 protoc 只是"怎么造出那段字节"的实现差别：

| 级 | 验什么 | 需要 protoc 吗 |
| --- | --- | --- |
| **① 结构层** | 解码 → 重编码，与原始字节**逐字节相等** | **不需要**（`pb_decode_raw.py` 零依赖） |
| **② 业务层** | 自造的**请求体**与浏览器实际发出的请求体**逐字节相等** | **不需要**。有 protoc 就用 pb2 序列化；没有就从 `--raw` 的输出按 `dialect-matrix.md` §2 的类型表手工拼字节 |

```bash
# ① 结构层：解码 → 重编码 → 逐字节相等（零依赖，任何环境都能跑）
python scripts/pb_decode_raw.py --input <captured.bin> --frame grpc-web --roundtrip

# ② 业务层：两种等价实现，按本机是否有 protoc 选一种
#    2a) 有 protoc：用生成的 pb2 序列化后比对
#    2b) 无 protoc：用 pb_decode_raw.py --raw 输出的 field/wire/payload_hex 手工拼字节后比对
#    完整可跑脚本与两种实现见 references/blackbox-and-pitfalls.md §4
```

**"服务器返回了 200"不能替代逐字节一致。** protobuf 允许字段省略与乱序，服务端宽容度很高，
字节不一致但能跑通的情况大量存在；一旦站点做签名或指纹绑定就会立刻失效。

## 关键决策

| 情况 | 走哪条路 |
| --- | --- |
| 页面直接下发 `.proto` 文件 | **直接下载编译，不要逆向**（判据：请求里有 `*.proto`） |
| 有生成 JS、字段数多 | 机械抽取（第 3 步）+ 三源互证 |
| 有生成 JS、但被混淆到读不出 | 先做字符串/控制流还原（`ast-deobfuscation`），再抽取 |
| 没有生成 JS、只有字节流 | `pb_decode_raw.py` 出结构 → `blackbox-and-pitfalls.md` 的五个误判点逐个确认 |
| 字段名完全拿不到 | 用业务语义反推命名；**不要用 `field1/field2` 交付**，至少标成 `unknown_field_1` |
| 解出来是 gzip | 该字段是 `bytes`；先 gunzip 再当下一层 protobuf |
| 同一字段里是 JSON 文本 | 该字段是 `string`，不是嵌套 message |

## 输出产物建议

| 文件 | 内容 |
| --- | --- |
| `<target>.proto` | 还原出的描述表（含"哪些字段是猜的"的注释） |
| `<target>.bin` | **原始字节**样本（不要存 hex 文本，重编码校验要用） |
| `<target>_decode.json` | `pb_decode_raw.py` 的输出，含 `field_occurrences` 与 `roundtrip` 结果 |
| `README.md` / 报告 | 方言判据、字段号来源（生成 JS 的哪一行）、已证与未证部分 |

## 反例黑名单

- **不要用 `int.from_bytes(content[:5], 'big')` 读 gRPC-Web 长度。** 它在 `flag=0` 时**恰好**等于长度，
  于是"看起来能用"；一旦是压缩帧（`flag=1`）就错。写 `content[1:5]`。
- **不要假设字段号连续。** 跳号是删除字段的保留位，不是解析漏了。
- **不要把"能解析"当"解析对了"。** 五个误判点（string/bytes/message、wire 0 的符号性、repeated 单值、map、enum）
  都会**静默**给出看似合理的结果。
- **不要在没有 `--roundtrip` 通过的情况下写结论。** 字典重排会丢顺序，而"解析成功"的假象极具欺骗性。
- **不要手抄超过 15 个字段的 schema。** 真实案例证明手写会引入层级错误。
- **不要对带帧头的 body 直接调 blackboxprotobuf。** 先剥帧，否则报错或解出垃圾。
- **不要把枚举编号顺序编出来。** 生成 JS 里只剩数字；编号错了比留占位更糟。
- **不要因为"脚本抽不出 message"就断定不是 protobuf。** 先回 `dialect-matrix.md` §1 重认方言。

## 关联

- 生成 JS 本身被混淆（特殊 unicode 变量名、双层字符串混淆、控制流平坦化）→ `ast-deobfuscation`
- 帧内是自定义二进制而非 protobuf（魔数、CRC、状态机）→ `protocol-reverse` 的方法论
- WebSocket 上的 protobuf（消息分组、心跳）→ `websocket-reverse`
- 需要把"扣 JS"变成可复跑的 CLI → `web-reverse-algorithm` 的工程化章节
