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

## 6. 排错速查

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
