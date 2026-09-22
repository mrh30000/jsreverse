# wasm / 白盒密码 / VMP 路线（F 层）

> 本文件是 **F 层（加密逻辑在 wasm 或 wasm2js 产物里）** 的唯一权威源。
> 通用 wasm 反编译、内存语义、wasm2c 工具链见技能 `../../wsam-reverse/SKILL.md`；本文件只写**媒体加密这一族特有的打法**。

**目录**

- [1. 四条路线的选择判据](#1-四条路线的选择判据)
- [2. 路线一：`importObject` 代理补环境，直接调用](#2-路线一importobject-代理补环境直接调用)
- [3. 路线二：wasm2js 白盒 AES + DFA](#3-路线二wasm2js-白盒-aes--dfa)
- [4. 路线三：wasm VMP 反汇编成 IR](#4-路线三wasm-vmp-反汇编成-ir)
- [5. 路线四：AI 补环境 + worker 消息重放](#5-路线四ai-补环境--worker-消息重放)
- [6. 排错速查](#6-排错速查)

---

## 1. 四条路线的选择判据

**先花 5 分钟判路线，再动手**——选错的代价是 3~4 天（CCTV 那条链路作者实测耗时 3~4 天）。

| 判据 | 路线 | 代价 |
| --- | --- | --- |
| 只需**拿到输出**（加密/解密结果），不需要算法 | **一：`importObject` 代理 + 直接调用** | 半天；环境补不齐时反复试错 |
| 产物是 **wasm2js 生成的 JS**（能直接 `node` 跑），且想搞懂算法 | **二：单步 + DFA** | 1 天；需要看懂轮函数 |
| 导出函数都是**短壳**、都调用同一个巨型函数（switch 巨多） | **三：反汇编成 IR** | 3~4 天；但**不依赖浏览器** |
| 链路依赖**会话状态 / worker**，且允许少量不完美 | **四：AI 补环境 + 消息重放** | 1~2 天；结果可能局部花屏 |

**通用心法**：**「拿到输出」与「搞懂算法」是两条路**。SKILL.md 的分层表判到 F 层后，
如果目标只是「把视频解出来」，**优先路线一或路线四**；只有需要长期批量、脱离浏览器时才走二/三。

---

## 2. 路线一：`importObject` 代理补环境，直接调用

### 2.1 定位初始化点（两个必找参数）

wasm 的初始化 API 只有三种，**只要搜到 `WebAssembly` 就够了**（`instantiate` 可能被混淆，`WebAssembly` 通常不会）：

```js
new WebAssembly.Instance(new WebAssembly.Module(bytes), importObject)   // 同步
WebAssembly.instantiate(bytes, importObject)                            // 异步（Promise）
WebAssembly.instantiateStreaming(fetch(url), importObject)              // 异步（流式）
```

- **`bytes`**：模块字节。注意常见伪装——**以 `.jpg` 后缀返回，真实内容就是 wasm**；直接下回来改后缀。
- **`importObject`**：JS 侧给 wasm 的环境。**这是环境检测的唯一入口**。

### 2.2 Go 编译的 wasm 有个固定坑

`importObject` 长这样（`new Go()` 下面一堆方法）：

```js
const importObject = { ... };
const go = new Go();
WebAssembly.instantiateStreaming(fetch('app.jpg'), go.importObject).then(r => {
  go.run(r.instance);      // ← 网页靠这一句把 encrypt / decrypt 挂到全局
});
```

- **文件底部通常有一段「命令行自执行」代码**（`if (isNode) { ... }` / 直接 `go.run(...)`）。
  **必须删掉它**，否则本地 `require` 时会自动跑起来，`new Go()` 拿不到对象。
- 删掉后 `new Go()` 才有对象；`go.run(instance)` 之后 `window.encrypt` / `window.decrypt` 才存在。

### 2.3 环境检测只能靠 `importObject`，所以代理 `global` 就够

**核心结论**：wasm 内部**无法自己读取浏览器环境**，它只能调用 `importObject` 里由 JS 传进来的函数。
因此「wasm 环境检测」在实现上只能是「**校验 JS 传进来的值**」——这使代理法几乎通杀。

```js
function myProxy(obj, name) {
  return new Proxy(obj, {
    get(target, propKey, receiver) {
      let temp = Reflect.get(target, propKey, receiver);
      if (typeof temp === 'object' && temp !== null) temp = myProxy(temp, name + '=>' + propKey.toString());
      console.log(`${name}->get ${propKey.toString()} return ->${temp}`);
      return temp;
    },
    set(target, propKey, value, receiver) {
      console.log(`${name}->set ${propKey.toString()} value ->${value}`);
      return Reflect.set(target, propKey, value, receiver);
    },
  });
}
```

**按报错顺序补，不要预判**。本例的实际顺序是：

```
global 取不到 location  → 补 location
→ 缺 document           → 补 document
→ 缺 window             → 补 window
→ 报核心业务函数错       → 搜该函数名（如 toStatus），发现它返回 { url, fingerprint }
                          ⇒ 补一个返回固定值的桩即可（fingerprint 任意值都能过）
```

**补环境清单的经验值**（媒体类 wasm 高频取值）：
`location.href/origin/pathname`、`document.*`、`window.*`、`navigator.*`、`performance.now()`、
`Date.now()`、`new Date()`、`Worker`（blob worker 的 `href/pathname/protocol`）、以及一个**业务回调**（返回 url/fingerprint 的那类）。

### 2.4 验收判据

- 调一次加密函数能出值，且**多次调用的结果只有尾部在变** ⇒ 说明**尾部是时间戳**，其余是确定性的（本例正是如此）。
- 这一点非常有用：**「只有尾部变」直接告诉你算法是确定性的 + 有一个时间戳输入**，可以据此把输入拆成「固定部分 + 时间戳」再验证。

### 2.5 若要走「搞懂算法」

wasm 内函数名未必混淆。**先看函数名**：

- Go 编译的模块常保留 `crypto/md5.digest`、`crypto/aes.NewCipher`、`crypto/cipher.newCBC` 这类名字
  ⇒ 直接读名字就知道是 AES-CBC。
- 在这些关键函数上下断点，**看内存里的入参**：
  - `crypto/aes.NewCipher` 处入参里 **16 字节的就是 key**；
  - `crypto/cipher.newCBC` 处入参里的是 **IV**；
  - `CryptBlocks` 处的是**明文/密文**。

```js
// 在 DevTools 里直接看内存
viewChar = (addr, size = 16) =>
  String.fromCharCode.apply(null, new Uint8Array(memories[0].buffer.slice(addr, addr + size)));
```

---

## 3. 路线二：wasm2js 白盒 AES + DFA

### 3.1 判据：这是 wasm2js 产物

- 是**纯 JS 文件**，能在本地 `node` 直接跑；没有 `.wasm` 请求。
- 大量 `HEAP8` / `HEAP32` / `HEAPU8`、`FUNCTION_TABLE[...]`、`$1`~`$N` 编号函数、`label$N:` 标签。
- 开头全是「初始化」，真正逻辑在**很后面**才执行第一行有效代码。

### 3.2 逆向步骤（按性价比排序）

| 目标 | 找法 | 本例结果 |
| --- | --- | --- |
| **入口与模式** | 搜导出名（如 `doAesCbc`）；看它第一段分支 | `if (0 == parseInt(inMode)) encrypt else decrypt` |
| **IV** | 在 `xxx_encrypt_base64` 里**直接出现的常量** | 直接就是 IV，**未做额外处理** |
| **Key** | 找「把常数写进变量」的调用，如 `$3(402432 \| 0, var)`，然后看**那个地址上的值** | 该地址上 16 字节即 key |
| **填充模式** | 找填充函数（本例 `$14`）+ 初始化函数（`$40` 把变量置为传入常数） | 用 **0** 填充 ⇒ **PKCS7** |
| **轮函数** | 找 `while` 条件**恒为 10** 的那个循环 | AES 的 10 轮 |
| **sbox** | 形如 `((HEAPU8[a+i]<<8) + HEAPU8[b+i]) + 1024` 的查表 | 标准 sbox，**顺序被打乱但未魔改**（逐值核对过） |
| **memcpy** | 一堆 `break` 之后**藏着连续赋值**的函数 | 别因为开头是 break 就整段跳过 |

> **反例警告**：`$10` 里开头全是 `break` 的段落是**参数校验**，可以跳过；
> 但 `$39` 开头也是 `break`，**后面却藏着整个 memcpy**。**「开头是 break」不足以判定整段无用**，要拉到函数尾看一眼。

### 3.3 DFA 故障注入

```js
// 在倒数第二轮（或倒数第二轮的轮函数入口）注入单字节故障
const faultIndex = getRandomInt(0, 16);
const faultValue = getRandomInt(-128, 128);
HEAP8[$6_1 + 32 + faultIndex] = faultValue;

// 收集 100 组
for (var i = 0; i < 100; i++) doAesCbc("123456", "0");
```

→ 导出故障密文 → `phoenixAES` 恢复倒数第二轮的状态 → `aes_keyschedule` 反推 key。

**两个前提**（缺一不可）：

1. **已经定位到轮函数**（`while` 次数恒为 10 的那个大循环）。
2. **能稳定重复调用**（本地 `node` 跑，不能依赖浏览器）。

**若 key/iv 是写死的**：先试**差分法**（`references/license-and-key-hierarchy.md` §8）——只要一组已知明文密文即可，
比 DFA 快得多；DFA 是差分法不适用时（key 随会话变、或拿不到明文）的退路。

---

## 4. 路线三：wasm VMP 反汇编成 IR

### 4.1 判据

- 随便打开几个导出函数，**代码几乎一样**，都只是「把入参放到指定位置，然后调用同一个特殊函数」。
- 那个特殊函数**极大**（几百行），有一个大循环 + 大量 `case`，每个 `case` 很短**且会重复运行**。
  ⇒ 这就是**自定义解释器**，那个特殊函数是 `dispatch`。
- **字节码不在 wasm 里**：JS 层用几段很长的数组、按某个**基址**写入内存
  （如 `eb = 申请 682576 字节`，而数组总长度**恰好等于 682576`）——把这段数组存下来就是字节码。

### 4.2 做法：不要直接还原 JS，先做 IR

```
wasm2c app.wasm -o app.c → 编译成 .o → 丢进 IDA → 逐个 case 反汇编
    ↓
写一个反汇编器：从函数基址开始扫字节码
    ↓
输出 IR 三元组：[pc, opcode, "r21 = r22 + 48"]
```

例：

```
[519712, 2,   "r21 = -1212248019"]
[519736, 136, "r24 = g7"]
[519748, 25,  "r24 = r24 + 48"]
[519752, 137, "g7 = r24"]
```

**为什么是 IR 而不是 JS**：字节码里有**大量运行时跳转**，直接还原成 JS 需要同时处理字节码语义与跳转语义，
难度呈爆炸式增长；IR 只需回答「**每条指令做了什么**」，跳转留给人工/AI 在 IR 上走。

### 4.3 交叉验证（必做）

还原出的片段**必须与已知参照物结构比对**：本例把 VMP 还原出的代码与**旧版 wasm2js 产物**逐段对比，
发现结构高度相似 ⇒ 反汇编正确。**没有这个参照物时，至少要能复现同一组输入输出**。

> 原作者的总结值得抄进笔记：**网页端保护演进路线是 `js 混淆 → jsvmp → wasm → wasm vmp`，
> 逆向成本逐级上升**；并且**视频站正从「整片加密 / 只加密 key」进化为 PES 层或 ES 层加密，
> 甚至逐 NALU 加密、自定义 NALU 结构**。

---

## 5. 路线四：AI 补环境 + worker 消息重放

当链路同时具备「wasm + VMP + 会话状态机 + worker」时（CCTV 那类），**允许不完美**：

**判据（这类目标的验收标准，不是「完全一致」）**：

- ✅ 拿到 m3u8 → 本地解密 → 分段 mux → concat → 输出**可播放的 mp4**；
- ⚠️ 允许**局部花屏 / 异常帧 / 短暂画面瑕疵**（浏览器里仍有部分状态未对齐）。

**补环境清单**（实测需要逐个喂）：

```
mediaTagID · Date.now() · new Date() · performance.now()
pageHref · workerHref · location.origin
blob worker 的 href / pathname / protocol
```

**关键动作：把 worker 主线程的 `postMessage` 序列抓下来，在本地按顺序重放。**

> 这背后的判断是：这类目标**真正难的不是某个函数**，而是
> 「这个函数在什么环境下运行 / 前面推进了多少步状态 / 浏览器真实会话里传了什么参数」。
> 先补环境让本地能播，再 `wasm2js` 把 wasm 转成 js 替换调用链，最后自动插桩逼近算法——**顺序不要颠倒**。

**边界**：`vmpTag` 这类依赖会话状态的量，浏览器与本地**本来就可能不一致**；
**判据是本地解出的分片能重封装**，不是「与浏览器逐字节相同」。

---

## 6. 媒体解密器的内存取证与文件头解密（emcc / Go 产物）

路线一~四解决「**怎么把算法跑出来**」；这一节解决「**跑出来了，key 在哪、文件头怎么回写**」。
素材来自两类真实产物：Emscripten（emcc）编译的播放器模块，与 Go 编译的解密模块。

### 6.1 断点打不上：先看它是不是在 worker 里

Emscripten 产物常把解密跑在 **Web Worker** 里 ⇒ **在页面对 JS 下断点不会停**（那是另一个执行上下文）。
三个处置，按性价比排：

1. **对 wasm 里的 `_malloc` 下断点**（在 DevTools 的 wasm 源码视图里），一定能停住，再沿栈回看。
2. **改代码插 `debugger`**：把 worker 脚本里那个 `t = function(){...}` 的开头插一行 `debugger`，
   刷新即停（原文的做法）。
3. 直接改走 6.3 的内存取证路线 —— 很多时候**根本不需要断点**。

### 6.2 emcc 的字符串/常量都在内存里：**先 dump，再搜**

Emscripten 会把源码里的字符串与数组初始化为「编译期分配空间 + 启动时写内存」。
所以：**把整个 `HEAPU8` 下载下来，用记事本直接搜**，比读代码快一个数量级。

```js
// 一行拿到整块内存（HEAPU8 可能有几十 MB，够用）
blob = new Blob([new Uint8Array(Module.HEAPU8)], {type: 'application/octet-stream'});
objectUrl = URL.createObjectURL(blob);
```

搜什么（按价值排序）：

| 搜什么 | 命中含义 |
| --- | --- |
| 已知字符串（URL、字段名、`eval` 里的片段） | 定位常量区与初始化写入点 |
| `63 7c 77 7b f2 6b 6f c5` | **AES S 盒**（`0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5`）⇒ **逐值核对是否被魔改** |
| RSA/大数常量、`0123456789abcdef` 变体 | 编码表 / 密钥材料 |
| 长 hex / base64 串 | 写死的 key、IV、盐 |

**序列化数组要转成 C 代码再看**：字符串能直接搜，但 `uint8_t x[] = {...}` 这类数组
在内存里是裸字节，只能先 dump 出来再解析。

### 6.3 「地址差法」：不读算法直接拿下 key

**这是本类产物最省力的一招**。wasm 的 JS 胶水层总会把结果从内存取出来：

```js
p = Module.ccall("get", "number", [...], [d.byteOffset, h.byteOffset, u, s.byteOffset, l, e, r.byteOffset, a]);
A = Module.HEAPU8.subarray(p, p + u);          // p = 解密后的 ts 内容地址，u = 长度
```

⇒ **key 常常就躺在 `p` 附近**。做法：

1. dump 内存 → 在记事本里找到 key 的明显特征（如 32 个 hex）→ 记下**它的地址**；
2. 与 `p` 相减，得到一个**稳定偏移**（实测一例是 **`-304`**）；
3. 直接取 `Module.HEAPU8.subarray(p - 304, p - 304 + 16)`。

**偏移是常量、但不保证跨版本**：升级后要重新量一次。判据是「解出来的 key 能解出一个能播的分片」。

### 6.4 环境检测来自 wasm 调 JS：给 `eval` 出口打桩

Emscripten 里 `_emscripten_run_script*` 系列最终调 JS 的 `eval`。wasm 内部用 `' ? 1 : 0'`
这样的字符串拼检查表达式 ⇒ 报错点在 **JS 侧**，不在 wasm 里。

```js
// 需要返回值的那种（返回 int 给 wasm）
function _emscripten_run_script_int(ptr) {
    const str = UTF8ToString(ptr);
    if (str.indexOf('location') !== -1) return 1;   // 环境检测：按「合格」放行
    return 0 | eval(str);
}
// 不需要返回值的那种：只要能跑通，返回值无所谓
function _emscripten_run_script(ptr) { eval('1'); }
```

**判据**：报错栈落在 `_emscripten_run_script*` 上 ⇒ 不要去读 wasm，直接打桩。

**`Module["" + i] = a` 这种写法**：把「token 的 UTF-8 字节长度」挂到模块对象上，
后面 wasm 侧的某些检查会读它。**从内存里删/改它之前先想清楚有没有人被依赖**。

### 6.5 ts 内容**不能置空**：key 的生命周期绑在后续处理上

带 ffmpeg 封装的大模块（v13 那类，wat 近 30 MB）有个反直觉行为：

> 它先解出 key，**但如果后续处理 ts 失败，会主动释放那段 key 内存**。

所以「把 ts 传空字符串、只想要 key」这条路会**拿不到 key**（读到的是已释放内存）。
处置（按代价排）：

1. **传一个真实的（哪怕很小的）ts 分片**进去 —— 最省事，原文的结论；
2. 改 wat 代码，在处理 ts 之前就返回 key 地址 —— 30 MB wat 改起来极复杂，**不推荐**。

### 6.6 文件头解密（v13 式）：长度对齐与 188 的倍数

有些站点对每个分片加密它的**文件头**，而不是整片。实测形态：

```
头大小 = ((分片序号 % 5) + 1) * 1024 | 16      # 1024/2048/... 再或上 0x10
IV     = 固定字节数组（如 [0,8,2,7,1,9,1,4,1,2,1,3,12,1,3,1]）
解密长度 = 真实长度 | 0x10                     # 或 0x10 是「补到 16 的倍数」的填充
memcpy 时只用真实长度（填充那部分不能拷进去）
```

解密之后还有两步**易漏**：

1. 对紧接着的 16 字节做一次**简单异或**还原；
2. **把 `v47 | 0x10` 之后的数据整体前移 16 字节**（因为前面多写的填充要抹掉）。

最后一步是 JS 胶水层做的事，**很容易被忽略**：

```js
m = r.Module.HEAPU8.subarray(g, g + p - p % 188);   // 188 = TS 包长，必须对齐
```

⇒ **回写 TS 时长度必须是 188 的整数倍**；不对齐的尾巴要么是填充要么是残留，
剩下的一步交给 `../scripts/ts_repack.py`（`--extract-es` / `--es` / `--check`）。

### 6.7 NALU 级 wasm 解密（央视 h5e 型）的会话状态

调用形态：

```
settle: InitPlayer() → (等 json) → 每次解密前 UpdatePlayer() 取 vmpTag
派发  : vmpTag 中落在 "0123456" 的字符决定调 _CNTV_jsdecVOD{7-i}(mediaTag, buf, len, hostLen)
会话串: 普通包 mediaTagID；特殊包 "mediaTagID##<dts>##<seeked>"
NALU  : type 25 的 payload[0] 决定 shouldDecrypt；type 1/5 才解密
```

**把它当 oracle 用**：不必还原 wasm 算法，只要在页面里持有这个会话，
把本地拿到的分片喂进去、拿回明文，再交给 `ts_repack.py` 回写。
**这条路的前提是「能稳定复现一次会话」**，见 §5 路线四。

**注意模块是「有状态」的**：`InitPlayer` / `UpdatePlayer` / `UnInitPlayer` 必须成对，
重复初始化会失败（原文的 TS 实现里用 `sessionBegin` 守着这一点）。

### 6.8 Go 编译的 wasm：`encrypt/decrypt` 可能**只能调用一次**

Go 侧 `crypto/cipher` 的流对象是**有状态**的（`Stream` 内部维护 offset）。
现象：第一次 `encrypt('1')` 有值，**同一个实例再调就返回 `null` / 空**。

处置：

1. **判据先立住**：想复用就「每次进页面重新加载模块」，或干脆一次调用取一组样本；
2. 调 `decrypt` 来看**明文里到底加了什么盐**（原文靠 `decrypt` 发现明文被塞了 `timeout` + `fingerprint`，
   这也解释了「同一个输入每次结果不同」）；
3. 打断点位置：`$crypto/aes.NewCipher`（**入参是 key**）、`$crypto/cipher.newCBC`（**入参是 iv**）、
   `$runtime.stringFromBytes`（看字符串）。

---

## 7. 排错速查

| 现象 | 首查 | 次查 |
| --- | --- | --- |
| 下载的 `.wasm` 是 HTML / 404 | 后缀伪装（`.jpg` 返回真 wasm） | 需要带 Referer / 会话 Cookie |
| `new Go()` 拿不到对象 | 文件底部命令行自执行块没删 | 模块还没 `go.run(instance)` |
| 加密函数存在但调用即崩 | 环境取值缺项，用 Proxy 打印后按报错补 | 业务回调桩（返回 url/fingerprint）没补 |
| 多次调用结果只有尾部变 | **这是正常现象**（尾部是时间戳） | 说明算法确定性 + 一个时间戳输入 |
| wasm2js 里找不到 `instantiate` | 直接搜 `WebAssembly` | 搜 `HEAP8` / `FUNCTION_TABLE` |
| 单步调试跳过了关键逻辑 | 「开头是 break」不等于「整段无用」 | 拉到函数尾看是否有赋值（memcpy） |
| DFA 恢复不出 key | 故障注入点不在倒数第二轮 | key 是写死的 ⇒ 改用 CTR 差分法 |
| VMP 字节码长度对不上 | 数组被日志截断 / 分多段写入 | 与 `eb` 申请长度（如 682576）核对 |
| 还原出的 IR 看不懂 | 正常；IR 只是比字节码可读 | 与旧版 wasm2js 产物比对结构 |
| 本地与浏览器结果不完全一致 | 会话状态（`vmpTag`）未对齐 | 抓 worker `postMessage` 序列重放；接受局部瑕疵 |
| 对页面 JS 下断点不停 | 解密跑在 **Worker** 里 | 改对 `_malloc` 下断点，或改代码插 `debugger` |
| 报错栈停在 `_emscripten_run_script*` | 环境检测是 wasm 调 JS `eval` | 给这两个导出打桩（`location` 直接返回 1） |
| key 拿到手但取出来是垃圾 | key 地址靠「与返回地址的固定偏移」估算 | dump 内存搜特征串重新量偏移（不保证跨版本） |
| 把 ts 传空只想要 key，结果拿不到 | 后续处理失败会**释放 key 内存** | 必须传一个真实的小分片进去 |
| 明文长度对但 ffmpeg 报 NALU size | 解密后 ES 长度变了，TS 包布局失效 | 走 `../scripts/ts_repack.py` 重新封装 |
| `encrypt` 第二次调用返回 null | Go 的 cipher 流**有状态** | 每次重新加载模块；用 `decrypt` 反查明文里加的盐 |
| 头部解完还是花屏 | 漏了「异或还原」或「数据前移 16 字节」 | 尾巴必须对齐到 **188** 的整数倍 |
