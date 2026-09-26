# 在 Node / Python 里复现 wasm 运行时（唯一权威源）

> **本文件是「把 wasm 跑起来 / 补胶水层 / 环境探针 / 内存视图」相关结论的唯一权威源**。
> 覆盖来源：`52pojie-1487959`（bilibili，cargo-web）、`52pojie-1556027` / `52pojie-1581887`（wasm-bindgen、数值/闭包导入）、
> `52pojie-1773515`（wasm 内存视图注入）、`52pojie-1862975`（Go-wasm + Proxy 探针）、
> `52pojie-2063345`（荔枝网，Node 环境骨架）、`52pojie-2062825`（pywasm + 解释器复现）、
> `52pojie-2037819`（wasmer 直接调）、`52pojie-1013338`（环境识别开关）、`52pojie-1549711`（Emscripten 产物调用四步）。
>
> 目录
> 1. 判「胶水层家族」——决定你要补多少东西
> 2. 通用四步
> 3. Node 直接实例化骨架（含 `delete process` 的取舍）
> 4. Go-wasm 专用：`wasm_exec.js` + Proxy 环境探针
> 5. wasm-bindgen（Rust）导入表
> 6. cargo-web / stdweb（Rust）导入表
> 7. Emscripten 导入表
> 8. Python 侧：wasmer / pywasm
> 9. 环境识别开关：`try/catch + eval('process')`
> 10. 浏览器内内存视图注入与搜索
> 11. 排错表

---

## 1. 判「胶水层家族」——决定你要补多少东西

**同一个「逆向 wasm」任务，工作量差异可能有 100 倍**，全部由这一件事决定：**模块有多少 import、属于哪个家族**。

```bash
node skills/wsam-reverse/scripts/wasm-inspect.js -i ./target.wasm --glue-family
```

| 家族 | 导入命名指纹 | 典型导入数量 | 复现难度 |
| --- | --- | --- | --- |
| **无 import**（纯计算模块） | —— | 0 | ★ 直接 `instance.exports.fn(...)` |
| **cargo-web / stdweb**（Rust） | `env.__cargo_web_snippet_<40 位 hex>` | 几十 | ★★★ 要自己实现一整套引用表桥（§6） |
| **wasm-bindgen**（Rust + bundler） | `wbg.__wbg_*`、`__wbindgen_*` | 几十~上百 | ★★★ 逐个按 JS 侧实现（§5） |
| **Emscripten**（C/C++） | `env.*`（`getTotalMemory`、`nullFunc_*`、`__syscall*`、`_lock`、`_emscripten_memcpy_big`） | 几十 | ★★ 大量 `nullFunc_*` 直接 `NULL`，少数按 JS 写死（§7） |
| **Go**（`wasm_exec.js`） | `env.*` + `gojs.*` + `syscall/js.*` | 几十 | ★★ **不要手工补**，直接复用 Go 官方 `wasm_exec.js`（§4） |

> **口径**：本节家族指纹与 `references/wasm-toolchain-and-decompilation.md` §8 是**同一张表**，
> 以 §8 为准（那边同时服务「选哪个 wasm」的定位需求）；本节从「补多少东西」的角度复述差异，**不另立新口径**。

---

## 2. 通用四步

不管哪个家族，顺序都是这四步——**顺序不要换**：

```
① 定「要拿什么」：目标导出函数名？还是 wasm 往宿主对象上挂的那个函数？
② 补 import：按家族补（§4–§7）；判断标准只有一个 ——「跑起来不崩」
③ 提供宿主对象：window / document / location / navigator / self / globalThis ...
④ 调用 + 与浏览器结果逐字节比对
```

**关键判据：第 ③ 步的验收标准是「和浏览器结果完全一致」，不是「跑起来了」。**
实测原文的收尾句都是「得出的结果与浏览器结果对比完全一致」——
**没有做这步比对的，一律视为未完成**（环境差异会静默改变结果，见 §9）。

**第 ② 步的通用手法**（本库已确立）：**报错什么补什么**。
先准备一个全 `NULL` / 全 `noop` 的 importObject，跑一遍看第一个栈帧落在哪个导入名上，补它，再跑。
比「通读 `.h` 逐个分析」快一个数量级。

---

## 3. Node 直接实例化骨架（含 `delete process` 的取舍）

实测可用的最小宿主环境骨架（`2063345`，Rust/wasm-bindgen 产物）：

```js
// ⚠️ 见下方「取舍」：这两行会让你的脚本自己也失去 process / global
delete process
delete global

function Window() {}
window = new Window()
self = window
self.self = window                       // wasm 会取 self.self

function Location() {}
Location.prototype = {
  ancestorOrigins: {},
  href:   'https://www.gdtv.cn/channels/2',
  origin: 'https://www.gdtv.cn',
  protocol: 'https:',
  host:     'www.gdtv.cn',
  hostname: 'www.gdtv.cn',
  port: '',
  pathname: '/channels/2',
  search: '',
  hash: '',
}
location = new Location()
window.location = location
document = { location: window.location }
window.document = document

const fs = require('fs')
const wasm_code = fs.readFileSync('target.wasm')
// ... 补 importObject，然后 WebAssembly.instantiate
```

**⚠️ `delete process` / `delete global` 的取舍（原文没写、但必然会踩）**

- **为什么要删**：wasm 会主动嗅 `process` / `global` 来判断「我在不在 Node 里」；不删就永远过不了环境校验。
- **代价**：你自己的脚本**也**失去了 `process`（`process.exit`、`process.argv`）和 `global`。
- **正确做法**：在删之前把要用的东西提到局部变量：

  ```js
  const _fs = require('fs');           // 先留住
  const _argv = process.argv.slice();  // 先留住
  delete process; delete global;       // 再删
  ```

> **这条与 §4 的 Go 路线冲突**：Go 路线**不能**删 `global`（要给它套 Proxy），
> 而是**换一种方式**——把 `global` 重新赋成一个 Proxy。两条路线的处置不同**不是矛盾**，
> 取决于 wasm 是「嗅到就报错」还是「读属性来决定行为」。**先按 §1 判家族，再选处置**。

---

## 4. Go-wasm 专用：`wasm_exec.js` + Proxy 环境探针

Go 编译的 wasm**不要手工补导入**——它自带整套运行时桥，官方文件叫 `wasm_exec.js`
（文章里把它叫 `go_js_wasm_exec`）。**把它拷到本地 `require` 进来即可**。

```js
const fs = require('fs')
require('./go_js_wasm_exec')            // = Go 官方 wasm_exec.js，定义全局 Go

async function readAndInstantiate(file, importObject) {
  const buffer = fs.readFileSync(file)
  const wasmModule = new WebAssembly.Module(buffer)
  return WebAssembly.instantiate(wasmModule, importObject)
}

const go = new Go()
go['importObject']['env']['syscall/js.finalizeRef'] = () => { }   // 常见空实现

readAndInstantiate('main.wasm', go.importObject).then(instance => {
  go.run(instance)                       // 开始跑 wasm
  console.log(hxm_encrypt('123456'))     // wasm 内部把函数挂到 window ⇒ 全局可访问
})
```

### 4.1 Go-wasm 的两个形态特征

1. **导出表里可能没有业务函数**。Go 用 `syscall/js` 的 `js.Global().Set('hxm_encrypt', ...)`
   把函数**挂到宿主对象上**——所以补完环境后直接 `hxm_encrypt(...)` 就能调。
   （这也是 §2 第 ① 步「要拿什么」的第二种形态。）
2. **报错的根因永远是「缺导入」**。原文：「wasm 还无法和浏览器直接交互，
   需要经过 js 导入相关内容」；**导入的入口就是 `WebAssembly.instantiate()` 的第 2 个参数**。

### 4.2 用 Proxy 找出 wasm 到底访问了宿主的什么

不要猜。套两层 Proxy 打日志：

```js
// 内层：window 的代理
let _window = new Proxy(window, {
  get(t, p) { console.log(`window Getting ${p}: ${t[p]}`); return t[p] },
  set(t, p, v) { console.log(`window Setting ${p}=${v}`); return t[p] = v },
  apply(t, thisArg, args) { console.log(`window call ${t}(${args})`); return t.apply(thisArg, args) },
})

// 外层：global 的代理（关键：把 global.window 换成 _window）
let _global = global
global = new Proxy(_global, {
  get(t, p) {
    if (p === 'window') return _window        // 只在这一处替换
    console.log(`global Getting ${p}: ${t[p]}`)
    return t[p]
  },
})
```

🔴 **必须避开的坑：不能用 `global.window = xx` 赋值**。
原文原话：「`global` 自身就是 `window`，哪有自己修改自己的？？就像 `window.window = 1` 是没有效果的。」
**唯一正确的做法是「重新赋值 `global` 本身为 Proxy」**，在 `get` 里拦截 `'window'`。

**实测收益**：靠这套探针定位到关键属性是 `window.Domain`，补上即可跑通。

> 这套 Proxy 手法与 `../../web-js-env-patcher/SKILL.md` 的「Proxy 吐环境」是同一族技术。
> 区别：那边探的是 **JS 混淆代码**要的环境，这边探的是 **wasm 要的宿主对象**；
> **需要补全的环境模型与 native 保护规则，以 `../../web-js-env-patcher/references/env-object-model.md`
> 与 `../../web-js-env-patcher/references/env-native-protection.md` 为唯一权威源**，本文件不重复。

---

## 5. wasm-bindgen（Rust）导入表

导入模块名可能是 `wbg`（浏览器直出）或 `./index_bg.js`（bundler 打包）。
**实现方式：打开 JS 侧的 `initSync` / `importObject` 字面量，逐个照抄**。

实测可直接写死的实现（`1556027` / `1581887`）：**「从未执行过的导入，一律 `NULL`」**。

| 导入 | JS 侧语义 | C 侧写死实现 |
| --- | --- | --- |
| `__wbindgen_is_undefined` | `void 0 === getObject(i)` | `return 0;` |
| `__wbg_self_...` | 返回全局 self 的引用号 | `return 36;` |
| `__wbindgen_object_clone_ref` | 引用计数 +1 | `return p0i32 + 1;` |
| `__wbg_instanceof_Window_...` | `getObject(i) instanceof Window` | `return 1;` |
| `__wbg_document_...` / `__wbg_body_...` | 取 `document` / `document.body` | `return p0i32 + 1;` |
| `__wbindgen_object_drop_ref` | `takeObject(A)`（出栈） | `{}` 空实现 |
| `__wbg_new_...` + `__wbg_stack_...` | 维护一个引用栈，`new Error` 入栈 / 取 `.stack` | 自建栈：`new` 返回栈索引，`stack` 从栈里取 |
| `__wbindgen_throw` | `throw new Error(getStringFromWasm0(A, i))` | `NULL`（或打印后 abort） |

### 5.1 wasm-bindgen 的「二级指针」返回约定

导出函数常返回**指向指针的指针**：真正结果地址放在栈上 `retptr` 起始的 16 字节里，**前 4 字节小端**。
调用范式：

```js
const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
wasm.sign(retptr, ptr, len)
const out = getInt32Memory0()[retptr / 4 + 0]      // ← 再取一级才是地址
```

**C 侧的对照实现见 `references/wasm-toolchain-and-decompilation.md` §6.2。**

---

## 6. cargo-web / stdweb（Rust）导入表

**指纹**：导入名是 `env.__cargo_web_snippet_<40 位 hex>`（sha1）。**语义由 JS 侧的
`STDWEB_PRIVATE` 决定**，只看名字是看不懂的——**必须回 JS 侧抄**。

要自己实现的桥（原文的完整 `importObject` 里反复出现这几个）：

| 桥函数 | 作用 |
| --- | --- |
| `to_js(refId)` | 把引用号还原成 JS 对象 |
| `from_js(slotPtr, value)` | 把 JS 对象装进引用表并返回新引用号 |
| `acquire_js_reference(refId)` | 取引用（不增减计数） |
| `decrement_refcount(refId)` | 引用计数 −1 |
| `serialize_array(targetPtr, arrayRef)` | 把数组写回 wasm 内存 |

**引用表的初始化**：`id_to_ref_map = {}`、`last_refid = 1`；
注意**表前部有一段固定占位**（实测 `new Array(128).fill(void 0)` 再 `push(void 0, null, true, false)`，
所以真实对象从索引 ~132 起）——这一段**必须照抄**，否则引用号会整体错位。

**要提供的宿主对象（实测足够的最小集）**：

```js
window = { location: { host, hostname, href, origin, pathname, protocol } }
document = { body: { childNodes: [0] } }
```

**补法**：跑起来 → 看第一个报错的访问（`t.origin` / `t.host` / `t.protocol` / `t.pathname` / `t.body` / `t.childNodes`）
→ 补上 → 再跑。原文原话：**「对 bom 和 dom 都有检测，这个问题不大，简单的补头就可以解决，报错什么就补什么」**。

---

## 7. Emscripten 导入表

实测一份完整清单（`1581887` 案例二，腾讯视频 ckey）：

```
env.enlargeMemory            env.getTotalMemory           ← 定值：return 16777216
env.abortOnCannotGrowMemory  env.abortStackOverflow
env.nullFunc_ii / _iiii / _v / _vi / _viiii / _viiiii / _viiiiii   ← 全部 NULL
env._lock  env._unlock  env._setErrNo
env.__syscall140  env.__syscall146  env.__syscall54  env.__syscall6
env._abort  env._emscripten_memcpy_big
env.memoryBase  env.tableBase  env.DYNAMICTOP_PTR  env.tempDoublePtr  env.STACKTOP  env.STACK_MAX
global.NaN  global.Infinity
```

**处置规律**：

1. **`nullFunc_*` 一族永远 `NULL`**（它们是 Emscripten 为「不可能被调用」准备的占位）。
2. **`*Base` / `DYNAMICTOP_PTR` / `STACKTOP` 这类是「导入数值」**：先全部 `NULL`，
   再按编译报错处**改成实际引用值**（`1581887` 的「导入数值处理」）。
3. **`getTotalMemory` 回一个定值**（JS 侧就是常量）。
4. **带环境读数的用「曲线赋值」**：见 `references/wasm-toolchain-and-decompilation.md` §5 的 `set_url()` 配方。

### 7.1 Emscripten 产物的调用四步（JS 侧）

即使不补 C，理解 JS 包装层也要记住这四步（`1549711` 实测顺序）：

```
1. 算参数长度
2. 申请「长度 + 1」的内存（末尾要留 \0）
3. 把参数复制进内存 → 调 wasm 层函数
4. 释放参数内存 → 从内存读出结果 → 释放结果内存
```

**「长度 +1」和「用完释放」是这一族最常被漏掉的两点**：
漏 `+1` ⇒ 静默少一个字节；漏释放 ⇒ 长跑内存爆。

---

## 8. Python 侧：wasmer / pywasm

**wasmer（JIT，推荐）**：

```python
from wasmer import Instance, Store, engine, Module
from wasmer_compiler_cranelift import Compiler

store = Store(engine.JIT(Compiler))
module = Module(store, open('spa14.wasm', 'rb').read())
instance = Instance(module)
sign = instance.exports.encrypt(n, math.ceil(time.time()))     # 直接调
```

**pywasm（纯 Python，无原生依赖）**：

```python
import pywasm

runtime = pywasm.core.Runtime()
m = runtime.instance_from_file('./encrypt.wasm')
r = runtime.invocate(m, 'encrypt', [num, ts])
return r[0]                                                     # 注意返回的是元组
```

| 选择 | 判据 |
| --- | --- |
| **wasmer** | 模块 import **为 0** 或很少；要性能 | 
| **pywasm** | 不能装原生扩展（本机/CI 限制）；模块小、调用次数少 |

⚠️ **两者都只适合「模块自包含」的场景**。一旦模块有几十个 import，
Python 侧补 importObject 的体验远差于 Node（`wasmer` 的 `Instance(module, import_object)` 需要逐项构造），
**此时优先在 Node 里跑通，再把 Node 脚本当子进程调用**。

> **真正的最快路径常常是「根本不用 Python 补环境」**：先在 Node 里跑通（§3–§7），
> 然后 `child_process` / `os.popen` 桥接。本库既有结论一致：
> 「浏览器辅助生成参数 + requests 采集」优于「纯 Python 复现」。

---

## 9. 环境识别开关：`try/catch + eval('process')`

**这是「本地跑得出结果、但和浏览器不一样」的第一号根因**（§2 第 ④ 步的比对就是用来抓它的）。

**实现形态**（`1013338` 实测，cmd5x）：

```js
// 伪代码形态
try { t = eval('process;') } catch (e) { /* 浏览器抛异常 */ }
// 浏览器：抛 ReferenceError → catch → 赋不同值 → 走另一条算法分支
// Node  ：不抛 → 不给 catch 机会 → 走错误的算法分支（且不报错）
```

同类开关还有：`eval('require')`、`document.domain`、`window.screen.clientWidth`、`window.screen.clientHeight` …

🔑 **可执行的搜索判据**：**搜「被 `try` / `catch` 包住的 `eval` / `Function` 字符串调用」**——
原文原话：「从 `process` 和 `require` 这些的检测，我们知道它都是可以经过异常捕获来进行浏览器端和非浏览器端的判断，
**这就可以让我们通过搜索被 `try` `catch` 的代码来分析是否存在这样的识别问题**。」

**两种处置**：

| 处置 | 做法 | 代价 |
| --- | --- | --- |
| **改名法（首选）** | 把 `process` → `process1`、`require` → `require1`：**两边都抛异常**，行为一致 | 极低；原文明确推荐 |
| **补环境法** | 真的把 `document.domain` / `screen.*` 按浏览器值补上 | 要逐项对齐，容易漏 |

> **为什么「改名法」对**：这一族的检测**只关心「抛不抛异常」**，不关心异常内容。
> 让环境差异**消失**比**伪装**更彻底。
> **推广**：凡是「用异常存在性做特征」的检测，**制造同样的异常**比「造一个能用的替身」稳得多。

---

## 10. 浏览器内内存视图注入与搜索

**用途**：不反编译，直接在运行时从 wasm 内存里把明文/密钥/结果捞出来。

**注入时机**：在 wasm 加载处下断点，让页面重新加载 wasm，然后注入：

```js
wasm = i.instance.exports
memories = [wasm.memory]

const u8 = (addr, size) => new Uint8Array(memories[0].buffer.slice(addr, addr + size))

viewDWORD   = (addr) => new Uint32Array(memories[0].buffer.slice(addr, addr + 16))
viewChar    = (addr, size = 16) => String.fromCharCode.apply(null, u8(addr, size))
viewHEX     = (addr, size = 16) => Array.from(u8(addr, size), x => x.toString(16).padStart(2, '0')).join(' ')
viewHexCode = (addr, size = 16) => Array.from(u8(addr, size), x => '0x' + x.toString(16).padStart(2, '0')).join(', ')
dumpMemory  = (addr, size = 16) => u8(addr, size)

// 明文串读取：遇 0 即止（这是读 C 字符串的唯一正确方式）
viewString = (addr, size = 16) => {
  const a = u8(addr, size)
  let max = size
  for (let i = 0; i < size; i++) if (a[i] === 0) { max = i; break }
  return String.fromCharCode.apply(null, a.slice(0, max))
}

// 全内存扫描：找子串的出现位置（上限 10,000,000 字节）
search = function (s) {
  const m = new Uint8Array(memories[0].buffer)
  const k = Array.from(s, c => c.charCodeAt())
  const match = j => k.every((b, i) => m[i + j] === b)
  const max = Math.min(10_000_000, m.byteLength || m.length)
  for (let i = 0; i < max; i++) if (match(i)) console.info(i)
  console.info('done')
}
```

**三个使用要点**：

1. **读 C 字符串必须「遇 `0` 即止」**，不要按固定长度截 `String.fromCharCode`（尾部垃圾会让比对失败）。
2. **`search()` 返回的是内存偏移**，配合 `viewString(offset, n)` 看内容；
   偏移可比对「两次运行之间是否稳定」来判断它是不是固定地址常量。
3. **`memories[0].buffer` 在内存增长（`memory.grow`）后会失效**——
   长跑场景每次扫描前重新取 `wasm.memory`。

> **与既有内存取证的关系**：本节的浏览器内版本与 `references/wasm2c-and-memory-semantics.md` §7
> 的 **HEAPU8 dump / 地址差法**是同一目标的两条实现（一个在页面里、一个在 Node 里）。
> **先做取证，再决定要不要反编译**——命中即省半天到一天。

---

## 10.5 ★★ 黑盒探针：不动 wasm 也能把「算法」定下来（B43 新增）

> 来源 `52pojie-1484457`（某直播网站在线心跳签名）。作者原话把这条路叫「瞎猫碰死耗子」，
> 并给了它的适用理由：**wasm 的静态/动态工具都不成熟**（`wabt` 翻成 C 也读不动）
> ⇒ **「能不能先只靠黑盒把结论逼出来」是值得先试的一手**。

**五步探针（每步都只改一个输入，看输出怎么变）**：

| 步 | 动作 | 观察到什么 ⇒ 推出什么 |
| --- | --- | --- |
| ① | 传**正常参数** | 返回值与线上一致 ⇒ **没有非对称加密、没有随机密钥**（否则每次不同） |
| ② | **逐项删减对象字段** | 某字段删了没影响（本例 `ua`）⇒ 该字段**不参与签名** |
| ③ | **改字段顺序** | 结果不变 ⇒ 内部**自己做了格式化/排序**（不要再去猜 JS 侧的拼接顺序） |
| ④ | **改 value** / **改 key** | 改 value 有变化、**改 key 直接报错** ⇒ 内部**按固定键名取值**（不是通用 JSON 序列化） |
| ⑤ | **改「第二个参数」这个数组** | 见下 —— 本批最值钱的一步 |

### 10.5.1 ★★★ 「算法选择器数组」：一个入口枚举一族算法

本例第一个参数是待签数据（JSON），**第二个参数是一个整数数组**（原值 `[2, 1, 4, 5]`）。
把数组换成**单元素**逐个试：

```
[0] → HMAC-MD5      [1] → HMAC-SHA1     [2] → HMAC-SHA256
[3] → HMAC-SHA244（源文原写法，疑为 SHA-224 之误）  [4] → HMAC-SHA512   [5] → HMAC-SHA384
[6] → 返回**非 hex 字符串**（越界 / 另一条分支）
```

- ★ **判据：只要「某个入参是整数数组、改它输出形状就变」，先假设它是「算法/模式选择器」，
  用 0..N 逐个试**。这比读 wasm 快一个数量级。
- ★ 选出的算法名靠**输出长度**确认（见下），**不要靠肉眼认**。

### 10.5.2 ★★ HMAC 输出长度反查表（真机 WebCrypto 实测，B43）

`hmac-*` 一族的 hex 输出长度是**固定**的 ⇒ **长度本身就能反查算法**：

| 算法 | hex 长度 | 字节 |
| --- | --- | --- |
| HMAC-MD5 | 32 | 16 |
| HMAC-SHA1 | **40** | 20 |
| HMAC-SHA224 | **56** | 28 |
| HMAC-SHA256 | **64** | 32 |
| HMAC-SHA384 | **96** | 48 |
| HMAC-SHA512 | **128** | 64 |

> 真机复核（`b43-browsercli-validate.js` G6 组 6/6）：`crypto.subtle.sign('HMAC', …)` 对
> `SHA-1 / SHA-256 / SHA-384 / SHA-512` 分别产出 **40 / 64 / 96 / 128** 位 hex。
> ⇒ 源文写的 `SHA244` 那个槽位，**若长度是 56 就是 SHA-224**；本库只给复核法，**不判因**。
> ⚠️ 反过来不成立：**长度相同 ≠ 算法相同**（MD5 与「16 字节的其他摘要/截断」长度一样）。

---

## 11. 排错表

| 症状 | 根因 | 处置 |
| --- | --- | --- |
| `LinkError: Import #N ... is not a function` | 导入名对不上 / 类型不对 | 名字按**可读尾部**匹配（见工具链文件 §4）；类型看 `Z_...Z_<sig>` 签名 |
| 跑起来但结果和浏览器不同，**且不报错** | 环境识别开关（§9）；或某个导入返回了错的定值 | 先搜 `try{catch}` + `eval('process'/'require')`（§9）；再核对每个被命中的导入的返回值 |
| `TypeError: Cannot read properties of undefined (reading 'apply')` | **异步加载的 asm/wasm 还没赋值就被调用** | 抓 Emscripten 的 `WASM_ASYNC_COMPILATION`；或改成 `await` 实例化后再调 |
| `RuntimeError: unreachable` / `abortStackOverflow` | 参数写入位置不对 / 长度少了 `\0` | 长度 `+1`（§7.1）；检查 `stackAlloc` 是否在写之前 |
| 只跑了第一次，第二次结果不同 | wasm 内部有**跨调用状态** | 每次调用前重新 `instantiate`；或显式调 reset 型导出 |
| `delete global` 之后自己的脚本崩 | 删过头了（§3） | 删前把 `fs` / `argv` 等**提到局部变量** |
| Go-wasm 里 `global.window = x` 没生效 | `global` 自身就是 `window`（§4.2） | 改成**重新赋值 `global` 为 Proxy** |
| 传参在 wasm 里只剩第一个字节 | 非 ASCII 直接写入 | 先 `TextEncoder().encode()` |
| 长跑后内存爆 | 忘了释放 wasm 侧内存 | 按 §7.1 第 4 步成对 `free` |

---

## 参见

- 工具链 / 反编译 / `wasm2c → .o → IDA` / C→DLL→Python：`references/wasm-toolchain-and-decompilation.md`
- 反 CFF（含 VMP 场景下的**正确退路**：不动 wasm、直接扣 JS 补环境）：`references/wasm-cff-restoration.md` §11.3
- 内存语义与内存取证：`references/wasm2c-and-memory-semantics.md` §3–§4、§7
- 转 Asm.js / 纯 JS：`references/wasm-to-js-transpilation.md`
- 宿主环境模型与 native 保护（本文件不重复）：`../../web-js-env-patcher/references/env-object-model.md`、`../../web-js-env-patcher/references/env-native-protection.md`
