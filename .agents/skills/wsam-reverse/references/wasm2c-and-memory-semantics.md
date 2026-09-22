# wasm2c 快速逆向、内存语义与 C++ 符号还原

> 目录
> 1. 三条路线的选择判据
> 2. wasm2c + wasm-rt 完整路线
> 3. Wasm 内存语义（读 WAT 的唯一铁律）
> 4. 内存布局类目标的三个抓手
> 5. C++ / Emscripten 符号名还原（Itanium mangling）
> 6. 调试注入：把导出函数挂到 window
> 7. 反例黑名单

---

## 1. 三条路线的选择判据

**先用下面的判据选路，再动手**——选错路会白干一天。

| 路线 | 做法 | 何时选 | 代价 |
| --- | --- | --- | --- |
| 扣 JS | 把 `initSync` + 导入函数 + `.wasm` 一起搬到 Node | 需要长期稳定复现、目标算法调用次数多 | 需要 wasm 运行时；导入函数要全扣对，漏一个就崩 |
| 手写算法 | 读 WAT 还原成 Python/C | 算法简单（单轮异或、固定查表）、对性能不敏感 | 耗时最长；VMP 类基本走不通 |
| **wasm2c** | `wasm2c` 把 wasm 翻成 C，编译成 dll/so，任意语言调用 | **不想读算法、只要能调用**；导出函数签名清晰 | 需要 C 工具链；首次搭建约半天 |

判据一句话：**目标是「拿到正确输出」还是「搞懂算法」**。前者走 wasm2c 或扣 JS，后者才手写。

---

## 2. wasm2c + wasm-rt 完整路线

```bash
# 1) 拿到 .wasm（浏览器另存 / curl / browsercli wasm_dump）
curl -s -o app.wasm 'https://target.com/static/app.wasm'

# 2) 翻译成 C + 头文件（需要 wabt 工具包）
wasm2c app.wasm -o app.c            # 产出 app.c 与 app.h

# 3) 编译成动态库：必须一起编译 wasm-rt 运行时
gcc -shared -fPIC -O2 app.c wasm-rt-impl.c -I<wabt>/wasm2c -o app.dll
# Linux 用 -shared -fPIC -o app.so；Windows MSVC 用 cl /LD
```

要点：

- `wasm-rt-impl.c` / `wasm-rt.h` 来自 **wabt 源码包的 `wasm2c/` 目录**，不是随包安装的。缺它一定报未定义符号。
- 导出名形如 `w2c_<module>_<exportName>`。**先读 `app.h` 里的声明确定参数与返回类型**，不要凭 JS 侧调用猜。
- 内存导出为 `w2c_<module>_memory`，C 侧直接当指针用。
- 跨语言调用的固定四步（对应 JS 侧的 `__wbindgen_malloc` + `passStringToWasm0`）：
  `分配 → 写入 → 调用 → 读出`。
- **非 ASCII 传参会崩**：JS 侧 `passStringToWasm0` 逐字符 `charCodeAt`，遇到 `> 127` 直接 `break`，即该模块只接受 ASCII。需要 UTF-8 时在 C 侧按字节写内存，不要走这条路径。
- 返回值若通过「内存地址 + 长度」返回（JS 侧常见 `getInt32Memory0()[2]` 取地址、`[3]` 取长度），在 C 侧读同样的偏移即可，偏移量（8/12 字节处）从 JS 包装函数里抄。

---

## 3. Wasm 内存语义（读 WAT 的唯一铁律）

wasm 操作内存**只有** `i32.load` / `i32.store` 及其变体（`i32.load8_s`、`i64.load16`、带 `offset=` 的寻址）。读懂内存 = 会做两件事：

1. **地址来自栈顶**。执行 `i32.load` 前，`i32.const 104472` 之类的常量已经压栈。取这个值去查内存。
2. **小端存储**。低字节在低地址。

真实案例（不要跳过这个推演）：

```
内存 104472 处四字节：152, 196, 98, 0
bits: 0 | 1100010 | 11000100 | 10011000
    = 0b011000101100010010011000
    = 6472856
```

所以 `i32.load` 取出的是 `6472856`，**不是**把四字节当十进制数相加。任何内存地址推导都要走一遍这个步骤。

---

## 4. 内存布局类目标的三个抓手

1. **内存基址与栈**：先找 `global.get $globalN` 的初值（常见如 `107696`）。栈指针的增长方向与栈上界（如 `5350544`）决定溢出检查 `abortStackOverflow` 的触发点。
2. **JS → wasm 的数据入口**：导入函数里的 `stringToUTF8(e, t = stackAlloc(i), i)` 就是「把 JS 字符串写进 wasm 内存」的地方。`stackAlloc` 是 wasm 导出函数，实现 `global9 += size` 后按 16 字节对齐。**凡是「内存里的值不固定」的参数，几乎都是从这里写进去的**——想找它，就反查这个入口。
3. **分块搬运**：数据段常被逐块处理，形态固定为
   ```js
   this.mem || (this.mem = r._malloc(131072));        // 128 KB 缓冲
   var o = Math.min(n - a, 131072);
   r.HEAPU8.set(t.slice(a, a + o), this.mem);         // 写入
   this._processSegment(e, this.mem, i + a, o);       // 处理
   t.set(r.HEAPU8.slice(this.mem, this.mem + o), a);  // 读回
   ```
   **131072 这个数字就是线索**：看到它，就知道后面是「原地异或/解密」类处理。

### 字节流还原：从已知明文反推密钥

若处理是「每 8 字节一组，逐字节与一个 8 字节密钥异或」，不必把密钥的生成逻辑读通：

1. 在**处理前**的断点处把缓冲区 dump 出来（如 `t`）。
2. 在**处理后**的断点处 dump 同一缓冲区。
3. 观察尾部：视频/图片容器有大量固定的填充字节（如 `0xFF`）。若解密后第 24 字节起全是 `255`，则
   `key[j] = 密文[24+j] ^ 255`，直接得到 8 字节密钥。
4. 用 `key` 对整个流做异或即可还原，**不需要知道密钥怎么生成的**。

```js
var array = Array.from(t);
var key = [24,25,26,27,28,29,30,31].map(i => array[i] ^ 255);
var out = new Uint8Array(array.length);
for (var i = 0; i < array.length; i += 8)
  for (var j = 0; j < 8; j++) out[i + j] = array[i + j] ^ key[j];
// out 即还原后的文件字节流
```

---

## 5. C++ / Emscripten 符号名还原（Itanium mangling）

C++ 编译出的 wasm，函数名是 **Itanium ABI 修饰名，不是乱码**。看到 `__ZNSt3__26__treeINS_12__value_typeIi14nup2p_secret_tEENS_19__map_value_compareIiS3_NS_4lessIiEELb1EEENS_9allocatorIS3_EEE4findIiEENS_15__tree_iteratorIS3_PNS_11__tree_nodeIS3_PvEElEERKT_` 就按规则解：

| 片段 | 含义 |
| --- | --- |
| `__ZN` | nested name 开始 |
| `St3__2` | `std::__2`（libc++ 内联命名空间） |
| `6__tree` | `__tree`（长度前缀 `6`） |
| `I...E` | 模板参数列表 |
| `14nup2p_secret_t` | 长度 14 的标识符 `nup2p_secret_t` |
| `4find` | 成员函数 `find` |
| `IiE` | 模板实参 `<int>` |

上例即 `std::__2::__tree<...>::find<int>(...)`。

**先解符号名再读指令**：它常常直接告诉你「这是一个 `std::map` 的查找」，比逐条读 `i32.load` 快十倍。工具：`c++filt`（binutils）、`llvm-cxxfilt`。

反汇编器选择：JEB 对 wasm 的可读性最好，但**导入函数多、频繁操作内存时会报错**；此时换 IDA。两者都不行时退回 `wasm-disassemble.js` 看原始 WAT，配合 <https://github.com/sunfishcode/wasm-reference-manual> 查指令。

---

## 6. 调试注入：把导出函数挂到 window

wasm 调试页里搜索函数名很不方便（名字在实例化后才存在）。**在 `loadSync` 返回后立刻注入一段脚本**，把导出对象挂到 `window`，之后就能在控制台直接搜索与调用：

```js
// 在 initSync 的 `wasm = i.exports` 之后追加
window.__wasm = wasm;
Object.keys(wasm).forEach(k => { window['__w_' + k] = wasm[k]; });
```

配合「先扣 JS + 本地 HTML 页面」，就能在页面上直接输入待加密字符串并打印结果，比在目标站上反复下断点快得多。

---

## 7. 内存取证：不读算法直接拿 key / 常量（emcc 与 Go 产物通用）

很多目标的性价比最优解不是「还原算法」，而是「**把内存 dump 出来搜特征**」。
这一节是 §3~§5 的**省力替代路线**：能取证就别反编译。

### 7.1 先 dump 整块内存，再搜

Emscripten 会把源码里的字符串与数组做成「编译期分配 + 启动时写入内存」，
所以**内存里就有一份可读的常量副本**：

```js
blob = new Blob([new Uint8Array(Module.HEAPU8)], {type: 'application/octet-stream'});
objectUrl = URL.createObjectURL(blob);       // 下载下来，用记事本 / grep 直接搜
```

| 搜什么 | 命中含义 |
| --- | --- |
| 已知字符串（URL、字段名、`eval` 片段） | 定位常量区与初始化写入点 |
| `63 7c 77 7b f2 6b 6f c5` | **AES S 盒**（`0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5`）⇒ 逐值核对是否被魔改 |
| 编码表（`0123456789abcdef` 及其变体）、长 hex / base64 串 | 写死的 key、IV、盐、码表 |

> 字符串可以直接搜；`uint8_t x[] = {...}` 这类**数组**在内存里是裸字节，
> 只能先 dump 再解析（或按已知长度切出来）。

### 7.2 地址差法：由「已知返回地址」倒推 key 地址

JS 胶水层总要把结果从内存取出来，那个地址（下例的 `p`）是现成的锚点：

```js
p = Module.ccall("get", "number", [...], [d.byteOffset, h.byteOffset, u, s.byteOffset, l, e, r.byteOffset, a]);
A = Module.HEAPU8.subarray(p, p + u);        // p = 结果地址，u = 长度
```

做法：dump 内存 → 找到 key 的特征串 → 记下**它的地址** → 与 `p` 相减得到**固定偏移**
（实测一例为 `-304`）→ 之后直接 `subarray(p - 304, p - 304 + 16)`。

**偏移是常量但不保证跨版本**；升级后重新量一次。判据是「取出的 key 能产出正确结果」。

### 7.3 环境检测来自 wasm 调 JS `eval`：给出口打桩

报错栈落在 `_emscripten_run_script*` 上 ⇒ **不要读 wasm**，直接打桩：

```js
function _emscripten_run_script_int(ptr) {          // 需要返回 int 的
    const str = UTF8ToString(ptr);
    if (str.indexOf('location') !== -1) return 1;   // 环境检测：按「合格」放行
    return 0 | eval(str);
}
function _emscripten_run_script(ptr) { eval('1'); } // 不需要返回值的：跑通即可
```

**判据**：wasm 内部把检查表达式拼成字符串（如 `' ? 1 : 0'`）交给 JS `eval`，
所以**修 JS 就能过检测**，改 wasm 是白费力气。

### 7.4 Go 编译的产物：符号名 + 流对象有状态

- 符号名常保留 `$crypto/aes.NewCipher`、`$crypto/cipher.newCBC`、`$crypto/md5.*`、`$runtime.stringFromBytes`。
  打断点看入参：**`NewCipher` 的入参是 key，`newCBC` 的入参是 IV**。
- `$runtime.stringFromBytes` 适合用来「把内存里的字节当字符串看」。
- 🔴 **`crypto/cipher` 的流对象是有状态的**：同一个实例**第二次调用可能返回 `null` / 空**。
  ⇒ 想多取样本就**每次重新加载模块**；或干脆一次调用只取一组，用 `decrypt` 反查明文里被加了什么盐。

### 7.5 结果内存的生命周期：别把输入置空

大模块（尤其内嵌 ffmpeg 的）有个反直觉行为：**后续处理失败时会主动释放已经算出来的 key 内存**。
所以「把输入传空、只想要输出」这条路会拿到**已释放内存**（表现为垃圾或 `null`）。
⇒ **必须传一个真实的（哪怕很小的）输入**。

---

## 8. 反例黑名单

- **不要在没确认「只要能调用」还是「要搞懂算法」之前就开读 WAT**。选错路是最大的浪费。
- **不要跳过内存取证直接反编译**。dump 一次 + 搜特征串，往往 5 分钟拿到 key（§7）。
- **不要把 `i32.load` 的四字节当十进制相加**。必须按小端还原（§3）。
- **不要为了还原字节流去啃密钥生成逻辑**。用已知明文（填充字节）反推密钥更快且更可靠（§4）。
- **不要相信「符号名是乱码」**。先 `c++filt` 一次。
- **不要漏编译 `wasm-rt-impl.c`**。缺它是 wasm2c 最常见的失败原因。
- **不要对含非 ASCII 参数的导出函数直接用 `passStringToWasm0` 传中文**。会静默截断。
- **不要依赖 DOM 交互工具去触发带反调试页面的 wasm**。会挂起并永久占用 worker（`HTTP 409 WORKER_BUSY`），见 SKILL.md「实战警示」。
- **不要以为「同一个实例能反复调用」**。Go 的 cipher 流、带会话状态的模块都可能只能用一次（§7.4 / §7.5）。
- **不要在拿到 key 就收工**。偏移是常量但不保证跨版本，**换一个样本再验一次**才算完成。
