# 从生成 JS 还原 .proto（工作流与校验纪律）

> 前置：先用 `dialect-matrix.md` §1 认准方言。方言认错，后面全错。

## 1. 定位：三个必搜锚点

在 Sources 面板全局搜（**不要搜字段名，字段名在压缩后基本不可用**）：

| 搜索词 | 命中意味着 | 下一步 |
| --- | --- | --- |
| `deserializeBinaryFromReader` | 方言 A（jspb） | 该函数的**左值全路径**就是 package + message 名 |
| `.decode = function` / `>>> 3` | 方言 B（protobufjs full） | 函数体里的 `switch` 就是字段表 |
| `sm_m` / `br:` | 方言 D（自研轻量） | `sm_m` 里那张表就是字段表 |

**先搜 `deserializeBinary`，再看调用栈**是更稳的入口：XHR/fetch 断点 → 向上跟栈，
找到 `deserializeBinaryFromReader` 或 `deserializeBinary` 的调用点，
那里同时给出了**响应体的哪一段是 protobuf**（常见是 `response[5:]`）。

响应侧同理：搜 `getResponseMessage` / `deserializeBinaryFromReader`，
跟着栈一层层进去——**每进一层就是一个嵌套 message**，这是最省力的展开方式。

## 2. 机械抽取（首选）

```bash
# 方言 A/B 自动识别
node scripts/pb_proto_from_js.js --input bundle.js --out schema.proto --pretty

# 只要一种方言（更快，避免误命中）
node scripts/pb_proto_from_js.js --input bundle.js --mode jspb --out schema.proto
node scripts/pb_proto_from_js.js --input bundle.js --mode pbfull --field-case keep --pretty

# 抽到 0 个 message 直接失败，适合放进脚本
node scripts/pb_proto_from_js.js --input bundle.js --out schema.proto --strict
```

选项语义：

| 选项 | 作用 |
| --- | --- |
| `--mode jspb\|pbfull\|auto` | `auto` 两种都跑，按「message 名 + 字段序列」去重 |
| `--field-case flat` | 默认。`setResourcetype` → `resourcetype`（保留生成器的原样） |
| `--field-case snake` | `resourceType` → `resource_type` |
| `--field-case keep` | 原样。**pbfull 方言下推荐**，因为那里的属性名就是真实字段名 |
| `--pretty` | 额外在 stderr 打印每个 message 的字段明细（含字段号），便于肉眼核对 |
| `--strict` | 抽到 0 个 message 时退出码 1 |

### 抽取器不猜的东西（刻意的）

| 情况 | 行为 | 为什么 |
| --- | --- | --- |
| `map<K,V>` 字段（无 `set`/`add` 访问器） | **跳过**，不产出该字段 | 造一个错的 `repeated Xxx y = N` 比少一个字段危险得多 |
| enum 取值名 | 只产出 `enum X { X_0 = 0; }` 占位 | 生成 JS 里已丢失（见 `dialect-matrix.md` §3） |
| 模块别名类型（`new n.Resource`） | 用**尾段唯一匹配**换回完整 message 名；匹配不到就**保留原名 + 写备注** | 不许臆造类型名 |
| 未知 reader 方法 | 类型写成 `unknown_<方法名>` | 让"没覆盖"显式可见，而不是伪装成已知类型 |

## 2b. ★★ 手算模式：`encode` 函数体里的 `uint32(N)` 就是「tag 的十进制值」

**来源** `52pojie-1926836` —— 源文是一条**求助帖**，作者贴出了生成代码却「看不太懂」。
而那段 `encode` 其实是一份**完整的字段表**，只是把 tag 写成了十进制。

```js
e.encode = function (e, t) {
    return t || (t = l.create()),
        null != e.packInfo       && Object.hasOwnProperty.call(e, "packInfo")       && t.uint32(10).string(e.packInfo),
        null != e.userType       && Object.hasOwnProperty.call(e, "userType")       && t.uint32(18).string(e.userType),
        null != e.areaName       && Object.hasOwnProperty.call(e, "areaName")       && t.uint32(26).string(e.areaName),
        null != e.deviceId       && Object.hasOwnProperty.call(e, "deviceId")       && t.uint32(34).string(e.deviceId),
        null != e.clientverison  && Object.hasOwnProperty.call(e, "clientverison")  && t.uint32(40).int32(e.clientverison),
        null != e.invitePlayerId && Object.hasOwnProperty.call(e, "invitePlayerId") && t.uint32(50).string(e.invitePlayerId),
        null != e.channelName    && Object.hasOwnProperty.call(e, "channelName")    && t.uint32(58).string(e.channelName),
        t
}
```

**手算规则（protobufjs 的 `writer` 约定）：`uint32(N)` 里的 `N` = `field_number << 3 | wire_type`。**

| `N` | `N >> 3` | `N & 7` | wire | 方法 | 字段 |
| --- | --- | --- | --- | --- | --- |
| 10 | **1** | 2 | 2（LEN） | `.string()` | `packInfo` = `string` **1** |
| 18 | **2** | 2 | 2 | `.string()` | `userType` = `string` **2** |
| 26 | **3** | 2 | 2 | `.string()` | `areaName` = `string` **3** |
| 34 | **4** | 2 | 2 | `.string()` | `deviceId` = `string` **4** |
| 40 | **5** | **0** | 0（VARINT） | `.int32()` | `clientverison` = `int32` **5** |
| 50 | **6** | 2 | 2 | `.string()` | `invitePlayerId` = `string` **6** |
| 58 | **7** | 2 | 2 | `.string()` | `channelName` = `string` **7** |

相当于：

```proto
message X {
  string packInfo       = 1;
  string userType       = 2;
  string areaName       = 3;
  string deviceId       = 4;
  int32  clientverison  = 5;   // ★ 源文拼写如此（少一个 's'），逐字保留
  string invitePlayerId = 6;
  string channelName    = 7;
}
```

★★ **可迁移的三条判据**：

1. **「十进制 `N` 突然跨到 8 的倍数区间」就是字段号跳档的信号**：`40 = 5<<3 | 0` 是**唯一 wire 0** 的字段，
   所以 `>> 3` 之后**顺序仍然连续**（1..7）—— **不要凭 `N` 的绝对大小估字段号**（58 看着像「字段 58」，
   实际是**字段 7**）。
2. **`Object.hasOwnProperty.call(e, "x")` 这种「既判 `!= null` 又判 hasOwnProperty」的写法，
   说明生成器开了「可选字段」模式** ⇒ 字段一律可省，**不要按 required 处理**。
3. **比读 `decode` 更省**：`encode` 直接给出「JS 字段名 ↔ tag」的双向映射，而 `decode` 只给 tag；
   两者都在时**以 `encode` 为准抄名字、以 `decode` 为辅核类型**。

> ⚠️ 本例的 `encode` 只覆盖了**请求**那一个 message。响应侧（11886 字节那条）解出来是
> `{1: id, 2: [{1: id, 2: id, 3: <中文名>, ...}]}` 这类**另一套**字段号 —— 两套 schema 不是同一个
> message，**不要混用**。响应侧的字段名源文未给，本库**不臆造**。

---

## 3. 校验纪律：三源互证

**只用生成 JS 一个来源是不够的**——抽取器会忠实复制生成 JS 里的错误，
而生成 JS 本身可能被改写、被裁剪、或作者在文章里抄漏了行。

### 3.1 双来源互证（同一方言内）

方言 B 的 `encode` 与 `decode` 是**两个独立来源**，字段号两边都能读到：

```js
// encode：tag 是字面量
e.uint32(8).int32(t.gameType)      // 8  = 1<<3 | 0  → 字段 1
e.uint32(34).fork()                // 34 = 4<<3 | 2  → 字段 4（length-delimited）

// decode：switch 分支
switch (a >>> 3) { case 1: n.gameType = t.int32(); ... }
```

**逐个字段对照两边的 (字段号, 类型)**，不一致就说明抽错了。
两边都一致的字段，置信度远高于单边。

### 3.2 与 wire 结构互证（跨来源）

用**本技能**的 `scripts/pb_decode_raw.py` 解一条真实响应，看 `field_occurrences`：

- 抽取出的字段号集合 **必须覆盖** 实际出现的字段号（允许 schema 比样本多，不允许少）
- 抽取出的 `repeated` 字段，在样本里应该出现多次（或 packed 一次）
- 抽取出的基础类型，解出的值形态必须相容：
  `string` 字段解出可读文本；`int32` 字段解出小整数；`fixed*` 字段的 wire type 必须是 1 或 5

不相容 ⇒ 回到 §1 重认方言，或回 §2 检查是否抄到了错行。

### 3.3 与人工/文章结论互证（有第二来源时必做）

真实案例（**本技能建立过程中实际抓到的**）：

- 某方数据的 `Periodical`，文章作者手写还原的 `.proto` 里写了
  `Issn issn = 45;` + `message Issn { string code = 6; }`。
- 但同一篇文章**自己贴出的生成 JS** 在 `case 45` 处是：
  ```js
  case 45:
      r = t.readString();
      e.setIssn(r);
      break;
  ```
  这是**纯 `string`，不是嵌套 message**。
- 机械抽取的产物写的是 `string issn = 45;` —— **与生成 JS 一致**。
- 旁证：作者自己的解码结果里 `"issn": {}` 是空对象，正是因为按嵌套 message 解一个 string 字段必然解空。

**结论：手写还原会引入"想当然"的层级错误，机械抽取不会。**
两者不一致时，**默认信生成 JS**，除非能指出生成 JS 被改写过的证据。

同理，`Resource.detail` 在生成 JS 里写的是 `new n.Resource`（`n` 是 webpack 模块别名），
机械抽取会用尾段匹配解析成 `com_wanfangdata_resource_Resource`；
手写版可能直接写成 `repeated Resource detail = 1;`（名字对但丢了包路径）。

## 4. 生成 JS 被混淆时的前置处理

生成代码本身也会被套混淆。判据与处理（源自真实案例）：

| 现象 | 判据 | 处理 |
| --- | --- | --- |
| 格式化后仍然乱码、无法阅读 | 变量名里被塞了**特殊 unicode 字符**，编辑器渲染不出 | 走 `ast-deobfuscation` 的 `strip-invisible-unicode`；或把代码丢进任意 OB 工具、**关闭全部混淆选项**、变量名生成器设为 `mangled`，让特殊字符被自动替换 |
| 字符串变成函数调用 | 字符串数组 + 解密函数 | 先做字符串还原，再抽 schema（`ast-deobfuscation`） |
| **同一段字符串被包了两层** | 解密函数套解密函数 | 需去两层；只去一层时"可读性足够"的错觉会让人漏掉核心函数 |
| `.proto` 文件是明文随页面下发的 | 请求里有 `*.proto` / `challenge.proto` | **直接下载编译，不要逆向**（真实案例：某题先请求 `challenge.proto` 再请求接口，逆向难度因此大降） |

**优先级：能拿到明文 `.proto` > 能从生成 JS 机械抽取 > 只能手工推断。** 别跳级。

## 5. 落地顺序（照着做）

1. 抓一条**真实响应**，存成 `artifacts/*.bin`（原始字节，不要存 hex 文本）
2. `pb_decode_raw.py --frame auto --roundtrip` —— 先把帧剥对、把无损性证出来
3. 定位生成 JS，认方言（`dialect-matrix.md` §1）
4. `pb_proto_from_js.js` 抽 `.proto`，`--pretty` 打印明细
5. 按 §3 三源互证，逐个确认可疑字段（别名类型、map、enum、wire 0 的符号性）
6. 补 `.proto` 里脚本抽不到的部分（map 字段手工写、enum 按 §3 的务实做法处理）
7. 有 protoc 就生成语言绑定；**没有 protoc 也能交付**——
   直接用 `pb_decode_raw.py` 出结构 + 手写 Python 解析（`dialect-matrix.md` §2 的类型表足够）
8. 验收：**自造请求体与浏览器实际请求体逐字节一致**（见 `blackbox-and-pitfalls.md` §4）
