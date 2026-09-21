# 猿人学第 30 题: 隐算 - 简单算法，复杂构建

## 1. 题目背景与结构概述

- **目标网址**：`https://match.yuanrenxue.cn/match/30`
- **题目描述**：隐算 - 简单算法，复杂构建。第 30 题使用 WebAssembly 技术构建核心加密，外层包裹了一层自定义堆栈型 JSVMP 虚拟机。
- **任务目标**：解析并还原算法，采集 1 ~ 5 页的数据并计算所有数字之和。

---

## 2. 逆向工程与技术链路分析

整道题目的逆向链路呈现典型的 **“外壳 JSVMP -> 动态注入 DOM -> 嵌入 WebAssembly 字节码 -> 核心流式置换密码 -> 终端风控检测”**：

```
                    ┌────────────────────────────┐
                    │      match/30/js/30.js     │
                    │   (基于 JVM1 的自修改 JSVMP)  │
                    └──────────────┬─────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   ┌──────────────────────┐                  ┌──────────────────────┐
   │    DOM 混淆与注入     │                  │  嵌入式 Wasm 模块提取  │
   │  window["рɡхDеЬսɡ"]  │                  │   696 字节二进制模块   │
   │  .vvv = 1 (提供密钥)  │                  │  (core.wasm / WAT)   │
   └──────────┬───────────┘                  └──────────┬───────────┘
              │                                         │
              └────────────────────┬────────────────────┘
                                   ▼
                ┌─────────────────────────────────────┐
                │        明文参数构造与 Token 签名      │
                │   /api/question/30 + now + 30(!) + p│
                └──────────────────┬──────────────────┘
                                   ▼
                ┌─────────────────────────────────────┐
                │           第 5 页 UA 校验           │
                │        User-Agent: yuanrenxue       │
                └─────────────────────────────────────┘
```

### 2.1 JSVMP 虚拟机分析

主逻辑全部封装在 `match/30/js/30.js` 中：
- 采用魔数 `[74, 86, 77, 49]`（即 `JVM1`）标记字节码结构。
- 字节码前部包含字符串池（139 项）与函数入口表（25 个内部函数）。
- 解释器具备**自修改与动态重加密机制**：每个指令执行后会使用线性同余随机数重新混淆操作码。
- 核心指令映射：
  - `151`: PUSH_INT (i32)
  - `251`: PUSH_STR (从字符串表读取)
  - `32` / `27`: GET_GLOBAL / SET_GLOBAL
  - `165` / `84`: GET_PROP / SET_PROP
  - `222`: CLOSURE (创建子函数闭包)
  - `171`: CALL_FUNC (函数调用)
  - `221`: NEW_CONSTRUCTOR (构造调用)

### 2.2 WebAssembly 二进制提取与 Wasm 接口分析

在 JSVMP 的 `func_4`（IP 421 ~ 3915）中，直接通过数组硬编码了 696 个字节并传入 `new Uint8Array(696)`，随后调用 `new WebAssembly.Module()` 与 `new WebAssembly.Instance()` 实例化。

我们通过解析字节码，直接将该 696 字节完整提取为 `yuanrenxue/match30/core.wasm`。

#### Wasm 模块接口规范：
- **导入**：
  - `env.random_byte() -> i32`
- **导出**：
  - `memory`: 线性内存（初始 1 页，64KB）
  - `encrypt(offset: i32, length: i32) -> void`

### 2.3 `env.random_byte` 探秘与 DOM 障眼法

JSVMP 中在实例化 Wasm 时，将 `env.random_byte` 绑定为 `func_2`：
```js
function func_2() {
  return window["рɡхDеЬսɡ"].vvv & 255;
}
```
> **注意**：这里的 `"рɡхDеЬսɡ"` 并非英文字符 "pgxDebug"，而是包含了同形西里尔字母（Cyrillic homoglyphs）。
在 DOM 构建阶段，页面生成了此节点并计算其 `.vvv` 属性：
```js
local_10.vvv = (((local_9.vvv & 65535) >> 1) << 1) + 1; // 最终固定结果为 1
```
因此 `random_byte()` 的返回值恒定为 `1`。

### 2.4 Token 明文拼接规则

在 `func_6` 中：
```js
local_1 = "/api/question/30";
local_0 = now; // 来自 /api/getTime
counter = 30; // 内部全局计数器，每轮请求递增 1 并在结束后递减 1，恒为 30
window._$v = 0; // 经过 cyclic prototype 检测后未被删除，值为 0
page = 1 ~ 5;

// 明文拼接:
const payload = `/api/question/30${now}30(!)${page}`;
```

### 2.5 核心 Wasm 加密算法纯算逆向 (100% 还原)

通过将 `core.wasm` 反汇编为 WAT（WebAssembly Text），完整还原为纯数学流式置换与代换算法：

1. **8 位循环左移 (`rol8`)**：
   ```python
   def rol8(val, shift):
       s = shift & 7
       return ((val << s) | (val >> (8 - s))) & 0xFF
   ```
2. **S-Box 代换表**：
   `TABLE = [55, 169, 92, 225, 130, 77, 22, 183]`
3. **单字节变换函数 (`transform_byte`)**：
   ```python
   def transform_byte(val, i, r):
       v = val ^ TABLE[(i + r) % 8]
       v = (v + 61 + i * 23 + r * 41) & 0xFF
       v = rol8(v, i + r + 3)
       v = (v ^ ((i * 49 + r * 71) & 0xFF))
       v = (v + (i ^ r) * 19) & 0xFF
       return v
   ```
4. **主加密流程 (`encrypt`)**：
   - 输入明文长度为 `len`，在头部补 1 字节 `random_byte = 1`，总长 `len + 1`。
   - **预处理 XOR**：`out[1 + i] ^= (i * 91 + 167) & 0xFF`（`i` 从 0 到 `len - 1`）。
   - **4 轮迭代 (`round` 从 0 到 3)**：
     - 每个字节执行 `out[1 + i] = transform_byte(out[1 + i], i, round)`。
     - **条件首尾双指针置换**：当 `(left + right + round) & 1 == 0` 时，交换 `out[1 + left]` 和 `out[1 + right]`。
   - **后处理 XOR**：所有数据字节异或 `random_byte`（`1`）。
   - 最终输出长度为 `len + 1` 字节（36 字节），转为 72 位 16 进制字符串即为 `token`。

### 2.6 第 5 页彩蛋与 UA 校验

在请求第 5 页时，如果使用默认的浏览器或 requests UA，服务端返回：
```json
{"data": ["请", "将", "UA", "改", "为", "yuan", "ren", "xue", "哦"]}
```
必须在请求头中将 `User-Agent` 设置为 `yuanrenxue`，方可获取到真实的第 5 页数据。

---

## 3. 运行与验证结果

### 3.1 各页数据明细

- **Page 1**: `[553184, 922498, 186135, 199084, 436880, 341653, 373026, 755140, 601275, 306056]` (求和: **4674931**)
- **Page 2**: `[533463, 509576, 744704, 513253, 598086, 367707, 913961, 989014, 926564, 904930]` (求和: **7001258**)
- **Page 3**: `[980049, 789144, 712025, 542538, 116581, 376606, 211416, 442804, 933467, 745717]` (求和: **5850347**)
- **Page 4**: `[346869, 596101, 510043, 542856, 678013, 890562, 332333, 465112, 649519, 238733]` (求和: **5250141**)
- **Page 5**: `[396253, 157115, 448601, 522531, 866059, 184732, 955136, 404911, 880276, 213090]` (求和: **5028704**)

### 3.2 最终计算答案

$$\text{Total Sum} = 4674931 + 7001258 + 5850347 + 5250141 + 5028704 = \mathbf{27805381}$$

---

## 4. 文件列表说明

| 文件名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `core.wasm` | 二进制 | 从 30.js 字节码中剥离出的原始 WebAssembly 模块 (696 字节) |
| `core.wat` | 文本 | `core.wasm` 的完整 WAT 汇编代码与指令注释 |
| `encrypt.py` | Python | 核心加密算法纯算还原（无任何外部依赖） |
| `encrypt.js` | Node.js | 核心加密算法纯算还原（Node.js 版） |
| `wasm_runner.js`| Node.js | 直接加载 `core.wasm` 并验证与纯算结果严格一致的执行器 |
| `crawler.py` | Python | 完整的自动抓取、分页解密、UA绕过与求和脚本，支持自动提交答案 |
| `crawler.js` | Node.js | 完整的自动抓取脚本（Node.js 版） |
| `README.md` | 文档 | 题解完整报告与逆向工程细节 |

---

## 5. 快速执行指令

### Python 运行：
```bash
# 执行完整采集与答案计算
python yuanrenxue/match30/crawler.py

# 携带个人 sessionid 并在计算完成后自动提交
python yuanrenxue/match30/crawler.py --sessionid "你的sessionid" --submit
```

### Node.js 运行：
```bash
# 纯算校验
node yuanrenxue/match30/encrypt.js

# Wasm 离线执行校验
node yuanrenxue/match30/wasm_runner.js

# 完整抓取与求和
node yuanrenxue/match30/crawler.js
```
