# 方言判据与类型映射（唯一权威源）

> **本文件是 protobuf 方言与类型映射的唯一权威源。** 其他文件只允许引用，不得重排这张表。
> 目的：避免同一张映射表在多个文件里各自漂移（B4 教训）。

## 0. 先做的三件事

拿到一个疑似 protobuf 的目标，**按这个顺序做**，不要跳：

1. **看 Content-Type / 端点形状**——决定是不是 protobuf，以及有没有自己的帧头。
   | 观察到 | 结论 |
   | --- | --- |
   | `content-type: application/grpc-web+proto` | gRPC-Web；每个 body 前 5 字节是帧头（见 `framing-and-transport.md`） |
   | URL 形如 `/包名.服务名/方法名`（如 `/SearchService.SearchService/search`） | gRPC-Web，同上 |
   | `application/x-protobuf` / `application/protobuf` | 裸 protobuf，无帧头 |
   | 参数值是一长串 base64（如 `input_protobuf_encoded`） | protobuf 被 base64 包了一层 |
   | `application/octet-stream` + 首字节常见 `0x08/0x0A/0x12` | 裸 protobuf 或 length-prefixed |
   | WebSocket 二进制帧 | 可能是 protobuf，也可能是自定义 framed（先看 `websocket-reverse`） |

2. **搜锚点函数名**——决定是哪种方言，也直接给出抽取入口。
   在 Sources 里依次搜：`deserializeBinaryFromReader`、`.decode = function`、`sm_m`、`protobuf.roots`。
   命中哪一个，就落到下面哪一行。

3. **能用机械手段就别手抄**。字段数超过约 15 个时手抄必错（真实案例单个 message 有 80+ 字段）。
   直接上 `scripts/pb_proto_from_js.js`，再人工确认可疑项。

---

## 1. 四种方言的判据表

| 方言 | 典型生成器 | 锚点特征 | 字段定义长什么样 | 抽取方式 |
| --- | --- | --- | --- | --- |
| **A. jspb**（google-protobuf） | `protoc --js_out=import_style=commonjs,binary` | `proto.<a>.<b>.C.deserializeBinaryFromReader = function(msg, reader)`；`jspb.Message.getFieldWithDefault` | `switch (reader.getFieldNumber()) { case 1: reader.readString(); msg.setName(v) }` | `pb_proto_from_js.js --mode jspb` |
| **B. protobufjs(full)**（带 encode/decode 函数） | `pbjs` 静态生成（reflection 版） | `<holder>.decode = function(reader, length)`；体内 `switch (tag >>> 3)` | `msg.gameType = reader.int32()`；encode 侧 `writer.uint32(8).int32(v)` | `pb_proto_from_js.js --mode pbfull` |
| **C. protobufjs(light/静态描述表)** | `pbjs -t static-module`（无 encode 函数体） | `protobuf.roots['a.b.c']`；类型描述是**对象字面量** | `{1:["field_name", <decoder>, <id>]}` | 需 AST 或正则扫描述表；`pb_proto_from_js.js` **不覆盖**，见 §4 |
| **D. 自研轻量实现**（例：Valve/Steam） | 厂商自写 | `sm_m` 惰性缓存；字段表形如 `{n:1, br: reader.readString, bw: writer.writeString, d: 默认值, c: 子类型}` | `br`/`bw` 才是读写函数；`d` 是默认值；`c` 是嵌套类型 | `pb_proto_from_js.js` **不覆盖**，见 §4 |

**关键结论：不要假设"protobuf 逆向 = google-protobuf"。** 四个方言的字段定义形式完全不同，
用错的判据会导致"搜 `deserializeBinaryFromReader` 搜不到 → 以为不是 protobuf"这种误判。

### 方言 A 的字段命名规则（`set` / `add` 决定单值还是数组）

jspb 生成器把字段名塞进访问器名里，所以**名字要从访问器反解**：

| 生成代码 | .proto |
| --- | --- |
| `e.setId(r)` | `string id = 1;` |
| `e.addTitle(r)` + `.push(` | `repeated string title = 2;` |
| `e.getXxxList()` / `e.addXxx()` / `e.clearXxxList()` | 三者同时出现 ⇒ 该字段一定是 `repeated` |
| `new s.Resource; reader.readMessage(r, ...)` + `e.addResources(r)` | `repeated Resource resources = 4;` |
| `reader.isDelimited() ? reader.readPackedEnum() : [reader.readEnum()]` | `repeated <Enum> x = N;`（packed） |
| `msg.getXxxMap()` + `a.Map.deserializeBinary(...)` | `map<K,V> xxx = N;` —— **没有 `set`/`add` 访问器** |

### 方言 B 的字段号读法（比 A 更可靠）

protobufjs 的 `encode` 函数里，tag 是**预先算好的字面量**：

```js
null != t.gameType && ... && e.uint32(8).int32(t.gameType),
null != t.mapSeed && ... && e.uint32(24).int32(t.mapSeed),
null != t.stepInfoList && t.stepInfoList.length) for (...) 
    c.protocol.MatchStepInfo.encode(t.stepInfoList[o], e.uint32(34).fork()).ldelim();
```

- `uint32(N)` 里的 `N` 就是 `(字段号 << 3) | wire_type`
  - `8  = 1<<3 | 0` → 字段 1，wire 0（varint）
  - `16 = 2<<3 | 0` → 字段 2，wire 0
  - `24 = 3<<3 | 0` → 字段 3，wire 0
  - `34 = 4<<3 | 2` → 字段 4，wire 2（length-delimited ⇒ 嵌套 message 或 string）
- **`decode` 与 `encode` 是互相独立的两个来源**：字段号两边都能读到 ⇒ 做**逐字段互证**，
  不一致就说明抽错了（见 `schema-recovery-from-js.md` §5）。
- `t.skipType(7 & a)` 是 default 分支，**不是字段**。

---

## 2. 类型映射表

### 2.1 方言 A：reader 方法名 → proto 类型

**这张表来自 `52pojie-1737925`（某音直播弹幕）给出的映射；再由 `pb_proto_from_js.js --selftest` 断言固化。**

> ⚠️ **不要把它和 `52pojie-1692444` 混为一谈**：那篇是 protobufjs(full)（方言 B）的示例，
> 全篇**没有任何 `read*` 方法**，因此**不构成本表的第二佐证**。它的价值是提供了方言 B 的
> `MatchPlayInfo` fixture（`pb_proto_from_js.js --selftest` 的 fixture B 即取自该文）。

| 生成代码里的 reader 方法 | .proto 类型 | 备注 |
| --- | --- | --- |
| `readString` | `string` | |
| `readBytes` | `bytes` | wire 2，与 string 同型；靠方法名区分 |
| `readBool` | `bool` | |
| `readDouble` / `readFloat` | `double` / `float` | |
| `readInt32` / `readInt64` | `int32` / `int64` | varint；**负数用 int 编码效率低**，看到负数优先怀疑应为 `sint` |
| `readUint32` / `readUint64` | `uint32` / `uint64` | |
| `readSint32` / `readSint64` | `sint32` / `sint64` | zigzag |
| `readFixed32` / `readFixed64` | `fixed32` / `fixed64` | 定长，wire 5 / wire 1 |
| `readSfixed32` / `readSfixed64` | `sfixed32` / `sfixed64` | |
| `readEnum` | `enum` | **取值名不可还原**，见 §3 |
| `readInt64String` | `int64` | 语义是 int64，JS 侧用 string 承载（避免精度丢失） |
| `readUint64String` | `uint64` | 同上 |
| `readMessage` | 嵌套 message | 类型名取 `new <X>(...)` 里的 X |
| `readPackedInt32` / `readPackedEnum` / … | 基类型同名前缀，**且隐含 `repeated`** | packed 只改编码，不改类型 |

**wire type 速查**（写手工解析器时用）：

| wire | 名字 | 载荷 | 常见 proto 类型 |
| --- | --- | --- | --- |
| 0 | varint | 变长整数 | int32/64、uint32/64、sint32/64、bool、enum |
| 1 | fixed64 | 8 字节小端 | fixed64、sfixed64、double |
| 2 | length-delimited | 长度 + 字节 | string、bytes、嵌套 message、packed repeated |
| 3 / 4 | start/end group | 已废弃 | —— |
| 5 | fixed32 | 4 字节小端 | fixed32、sfixed32、float |

### 2.2 方言 B：reader 方法名 → proto 类型

protobufjs 的方法名就是 proto 类型名本身（无 `read` 前缀）：
`string` / `bytes` / `bool` / `double` / `float` / `int32` / `int64` / `uint32` / `uint64` /
`sint32` / `sint64` / `fixed32` / `fixed64` / `sfixed32` / `sfixed64` / `enum`。

- 嵌套 message：`reader` 侧表现为 `new pkg.Type()` 或 `pkg.Type.decode(reader, reader.uint32())`
- `repeated`：体内有 `.push(...)` 或 `if (!msg.x || !msg.x.length) msg.x = []`
- **`uint32()` 单独出现时是读 tag，不是字段**——判定方法：它出现在 `switch (x >>> 3)` 之前、
  且结果直接喂给 switch。

### 2.3 方言 D：`br` / `bw` 组合 → proto 类型（steam 例）

字段表形如（下面全部取自**同一个** message：登录请求 `CAuthentication_Login_Request`）：

```js
device_friendly_name: { n: 1, br: n.FE.readString, bw: n.Xc.writeString }
account_name:         { n: 2, br: n.FE.readString, bw: n.Xc.writeString }
encrypted_password:   { n: 3, br: n.FE.readString, bw: n.Xc.writeString }
encryption_timestamp: { n: 4, br: n.FE.readUint64String, bw: n.Xc.writeUint64String }
remember_login:       { n: 5, br: n.FE.readBool,   bw: n.Xc.writeBool }
platform_type:        { n: 6, br: n.FE.readEnum,   bw: n.Xc.writeEnum }
persistence:          { n: 7, d: 1,         br: n.FE.readEnum, bw: n.Xc.writeEnum }
website_id:           { n: 8, d: "Unknown", br: n.FE.readString, bw: n.Xc.writeString }
device_details:       { n: 9, c: u }        // c = 子 message 类，没有 br/bw
guard_data:           { n: 10, br: n.FE.readString, bw: n.Xc.writeString }
language:             { n: 11, br: n.FE.readUint32, bw: n.Xc.writeUint32 }
qos_level:            { n: 12, d: 2,        br: n.FE.readInt32,  bw: n.Xc.writeInt32 }
```

> ⚠️ **同一站点不同 message 的字段号互不相干，绝不能跨 message 拼表。** 真实踩坑：
> steam 的 `account_name` 在**公钥请求**里是 `n:1`，在**登录请求**里是 `n:2`；
> 公钥**响应**里另有 `timestamp n:3 readUint64String`，与登录请求的 `n:3`（`encrypted_password`，string）
> 完全无关。把三个 message 的字段混进一张表，会得到一份编译得过、但语义全错的 `.proto`。
> **判据：每个字段表的 `n` 必须来自同一个函数体内的同一张表**（见 `schema-recovery-from-js.md` §1 的锚点法）。

| 键 | 含义 |
| --- | --- |
| `n` | 字段号 |
| `br` | reader 函数（读）—— 判类型看它 |
| `bw` | writer 函数（写）—— 应与 `br` 同名 |
| `d` | 默认值（**相当于 proto3 里能省略的默认值**；不代表字段必填） |
| `c` | 嵌套 message 的构造函数（无 `br`/`bw`） |

- 类型判定方法不变：取 `readXxx` 的名字查 §2.1 的表（`readUint64String` → `uint64`）。
- **子 message 的 `c:` 指向的那个类，就是你要继续展开的下一层**；它自己的字段表在同名 `sm_m` 里。
- 这套实现是**厂商自写**的，所以类名/字段名往往更难搜；改用「搜 `sm_m`」或「搜 `br:`」定位。

---

## 3. enum 为什么永远还原不全

生成代码里 enum 的**取值名已经丢失**：jspb 编译后只剩数字（`readEnum()` 返回值），
protobufjs 的 `decode` 也只存数字。能拿回来的只有**枚举成员名**（如果生成代码里保留了 `proto.X = {MAN:0, WOMAN:1}` 这样的对象字面量），
但**字段 → 枚举的对应关系**也常常断掉（尤其字段名被压缩后）。

务实做法：

1. 先按数字用（`.proto` 里声明 `enum X { X_0 = 0; }` 占位即可，能正常解析字节流）；
2. 需要语义时，**从业务数据反推**：抓一批响应，看该字段的实际取值集合
   （例：`coreperiodical` 取值 `EI/ISTIC/PKU/SCI` → 可命名为 `CORE_EI=0` 等，但**编号顺序仍需实测**）；
3. 不要编造编号顺序。宁可留 `X_0=0; X_1=1; ...` 也不要写错映射。

---

## 4. 本技能脚本未覆盖的方言怎么处理

`scripts/pb_proto_from_js.js` 只覆盖方言 A/B。C/D 以及"标识符被混淆改名"的场景：

| 情况 | 路线 |
| --- | --- |
| C：`protobuf.roots` + `{1:["name", decoder, id]}` 描述表 | 描述表本身**就是 schema**：`eval` 掉那段代码拿到 `protobuf.roots`，递归遍历 `constructor.decode.toString()`；或直接正则扫 `(\d+):\s*\[["']([^"']+)["']` |
| D：`{n, br, bw}` 表 | 直接正则扫 `n:\s*(\d+)` + `br:\s*\S*?read(\w+)` + `add`/`set`；子层顺着 `c:` 递归 |
| 标识符被混淆（`reader.nextField` 都不见了） | 换 AST 级抽取：`ast-deobfuscation` 的 pass 框架；或先做字符串/控制流还原再走本脚本 |
| 实在都没有（只有字节流） | 走 `blackbox-and-pitfalls.md`：先 `scripts/pb_decode_raw.py` 出 wire 结构，再人工补语义 |

**不要因为脚本抽不出来就放弃**——抽不出来的最常见原因不是"没法抽"，而是"方言认错了"。
回到 §1 的判据表重认一遍。
