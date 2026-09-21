# 无描述表解码与误判清单（零依赖路线）

> 场景：**拿不到生成 JS，或生成 JS 被压得读不出结构**，手上只有字节流。
> 目标：先把 wire 结构（字段号 + wire type + 值）弄出来，再逐步补语义。

## 1. 零依赖解码器

**本技能的** `scripts/pb_decode_raw.py` 是 `protoc --decode_raw` 的离线替代（本机无 protoc / 无 google.protobuf 时唯一可用）：

```bash
python scripts/pb_decode_raw.py --input body.bin --frame grpc-web --pretty
python scripts/pb_decode_raw.py --b64 "CgZQZXJpb2RpY2Fs" --pretty --typedef
python scripts/pb_decode_raw.py --hex "0a 0a 50 65 72 ..." --frame len4be --raw
python scripts/pb_decode_raw.py --input resp.bin --roundtrip   # 核心 oracle
python scripts/pb_decode_raw.py --input resp.bin --strict       # 解出 0 个字段即失败（脚本/CI 用）
python scripts/pb_decode_raw.py --selftest
```

输出里 `field_occurrences` 是**判断 repeated 的第一手证据**：同一字段号出现 N>1 次 ⇒ `repeated`（或 packed 里的一个元素）。

### 核心 oracle：`--roundtrip`

**解码必须可逆。** 解码器把字节流拆成"字段号 → 值"的字典，但 protobuf **允许任意字段顺序**，
一旦按字段号重组字典，顺序信息就丢了——此时"解析成功"是假象。

`--roundtrip` 做的是：解码 → 按原始顺序重编码 → 与原始字节逐字节比对。
不一致就退出码 1。**这是唯一能证明"解码无损"的手段。** 用法：

```bash
# 单次校验
python scripts/pb_decode_raw.py --input body.bin --frame grpc-web --roundtrip
# 自检里已内置 10 个 round-trip 用例（含非 UTF-8 bytes、10 字节 varint、fixed32/64 混合、空载荷）
python scripts/pb_decode_raw.py --selftest     # 42 项
```

判定标准写死为**逐字节相等**，不是"字段值对得上"。这一条不要放宽。

## 2. 五个必然误判点

无描述表解码时，以下五处**一定**会猜错，必须人工确认：

### 2.1 string vs bytes vs 嵌套 message（同属 wire type 2）

三者 wire 格式完全相同，**无法从字节区分**。`pb_decode_raw.py` 的判定顺序：

1. 能**恰好**解析完且至少 1 个字段 → 按嵌套 message 展开
2. 否则像 UTF-8 文本 → `string`
3. 否则 → `{"$bytes": "<hex>"}`

**唯一否决项**：整段是"干净文本"（合法 UTF-8 且除 `\t\n\r` 外无控制字符）→ 判 `string`，**不展开**。

为什么必须有这条：`Periodical` 的字节恰好是 `0a 0a`（字段 1、长度 10）——**能被 decode_message 完整吃掉**，
但它是文本。没有这条守卫就会把 `"Periodical"` 拆成 `{1: "\nPeriodical"}`。

反向的坑：**二进制 protobuf 里几乎必然出现 < 0x20 的控制字节**（长度前缀、tag 低字节），
所以这条否决不会挡住正常的嵌套 message。自检里 `text-not-nested` / `nested-msg` 两项就是钉这两侧。

**人工确认方法**：看该字段的取值集合。若取值都是可读短语 → `string`；若取值长度离散且内容随机 → 可能是 `bytes`。

### 2.2 int32 / int64 / uint32 / uint64 / sint / enum（同属 wire type 0）

wire 0 只表示"变长整数"，**不携带符号性与宽度**。解码器一律给正整数。三个常见后果：

| 现象 | 真实类型 | 处理 |
| --- | --- | --- |
| 出现巨大正整数（如 `18446744073709551615`） | `int32` 负数被按 64 位 varint 读成无符号 | 负数 int32 = 该值截断到 32 位后按补码解释 |
| 负数应为 `-1` 却读成 `1` | 真实类型是 `sint32`（zigzag） | `n = (v >>> 1) ^ -(v & 1)` |
| 取值只有 0/1/2/3 且语义像分类 | `enum` | 走 `dialect-matrix.md` §3 |

**判据来源只能是生成 JS 的 `read*` 函数名。** 没有生成 JS 时，用值域反推：
字段取值恒在 `[-2^31, 2^31)` 且出现负数 ⇒ 大概率 `int32` 或 `sint32`。

### 2.3 repeated 的单值形态

字段只出现 1 次时，**无法区分 `T x = 1` 和 `repeated T x = 1`**。

- 判据：`field_occurrences` 里该字段号 > 1 → `repeated`；否则**不确定**，标为待定。
- packed repeated（wire 2 里塞多个同型值）解码出来是**一个** length-delimited 字段，
  看起来像 `bytes`——判据：内容是 varint 序列且能被完整切分。生成 JS 里的 `readPacked*` 是确定证据。

### 2.4 map 字段被误当嵌套 message

`map<K,V>` 在 wire 上是 `repeated <entry message>`，entry 是 `{1: key, 2: value}`。

- 现象：解出 `{"1": [{1: "k1", 2: "v1"}, {1: "k2", 2: "v2"}]}`。
- 判据：**同一字段号重复出现、且每个子消息都只有 1/2 两个字段**，几乎一定是 map。
- 生成 JS 里的确定证据：`getXxxMap()` + `a.Map.deserializeBinary(...)`，且**没有 `set`/`add` 访问器**。
- `pb_proto_from_js.js` 对这类字段的行为是**跳过**（不产生坏字段），这是刻意设计——
  宁可少一个字段并在人工确认时补上，也不要造出一个错误的 `repeated Xxx y = 156`。


### 2.4b 「解出 0 个字段」不要当成成功

空字节序列在协议上确实是合法的空 message，所以工具**默认**只发一条 stderr 警告并以 0 退出。
但实践中 0 字段几乎总是「传错了文件」：空文件、被截断、帧头没剥干净。
**判据**：`field_occurrences` 是 `{}` 就不要往下走。脚本/CI 里加 `--strict` 让它直接失败。
### 2.5 字段号跳跃

真实 `.proto` 的字段号常常跳跃（跳过的号是"已删除字段"的保留位）。
例：某方的 `Periodical` 里出现 `57/58/59/61/62/66/.../150/155/156/157/158/159`，
**不要假设字段号连续**，也不要把跳号当成"解析漏了"。判据：解析恰好消耗完全部字节。

## 3. blackboxprotobuf 的适用边界

`pip install blackboxprotobuf` 适合"先看个大概"，返回 `(data, typedef)` 二元组：

```python
import blackboxprotobuf
data, typedef = blackboxprotobuf.protobuf_to_json(response.content)
```

| 用 | 不用 |
| --- | --- |
| 快速看字段号分布、确认是不是 protobuf | 作为最终产物交付 |
| 生成 typedef 草稿，再人工改名 | 依赖它的类型判定（同样受 §2 五个误判点影响） |
| —— | **不能直接对带帧头的 body 用**（必须先 `[5:]` 或 `[1:5]` 剥离） |

三条已知限制：

1. **依赖较低版本的 protobuf**，与新版 protobuf 同装易冲突。
2. 对带帧头的响应直接调用会报错，必须先剥帧。
3. 输出是"字段号 → 值"，**没有字段名**——字段名永远只能从生成 JS 或业务语义来。

## 4. 转 `.proto` 与编码闭环（含**无 protoc** 时的等价实现）
> **本机通常没有 protoc**（见 SKILL.md「环境前提」）。本节第 2 条验收给了两条等价路线：
> 有 protoc 用 pb2 序列化；没有 protoc 就从 `pb_decode_raw.py --raw` 的
> `{field, wire, payload_hex}` 三元组手工拼字节。**两条路线的验收标准完全相同**——逐字节相等。


拿到 wire 结构 + 从生成 JS 抽出的 schema 后：

```bash
# 从生成 JS 机械抽取（本技能脚本，零依赖）
node scripts/pb_proto_from_js.js --input <bundle.js> --out schema.proto --pretty

# 有 protoc 时生成语言绑定。**没有 protoc 不影响下面的第 1 条校验**（它零依赖）。
protoc --python_out=. schema.proto     # 需 protoc；本机若无则见 SKILL.md「环境前提」
```

**编码闭环验收（缺一不可）**：

```bash
# 1) 解码无损（结构层）—— 零依赖，不需要 protoc
python scripts/pb_decode_raw.py --input <captured.bin> --frame grpc-web --roundtrip

# 2) 自造请求体 与 浏览器实际请求体 逐字节一致（业务层）
#    有 protoc → 用 pb2（下例）；
#    没有 protoc → 用 pb_decode_raw.py --raw 的输出手工拼字节，
#                  或按 dialect-matrix.md §2 的类型表手写编码。两条路都做得成第 2 条校验。
python - <<'PY'
import schema_pb2                      # 由 protoc 生成；无 protoc 时见上方说明
m = schema_pb2.SearchRequest()
m.commonrequest.SearchWord = "爬虫"
mine = b"\x00" + len(m.SerializeToString()).to_bytes(4, "big") + m.SerializeToString()
captured = open("<captured_request.bin>", "rb").read()
assert mine == captured, (mine.hex(), captured.hex())
print("BYTE-EXACT OK", len(mine), "bytes")
PY
```

第 2 条不过就不要往下走——**"服务器返回了数据"不能替代逐字节一致**，
因为 protobuf 允许字段省略与乱序，服务端宽容度很高，字节不一致但能跑通的情况大量存在
（一旦站点做签名或指纹绑定就会立刻失效）。