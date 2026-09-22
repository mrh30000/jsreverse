# wasm 工具链选型与反编译路线（唯一权威源）

> **本文件是「工具链 / 反编译 / 移植」相关结论的唯一权威源**；其它文件只引用、不复制这些表。
> 覆盖来源：`52pojie-962068`（2019 静态分析法）、`52pojie-1461335`（2021 IQIYI 字幕）、
> `52pojie-1493082` / `52pojie-1556027` / `52pojie-1581887`（2021–2022 wasm2c 三连）、
> `52pojie-2044904`（2025 spa14）、`52pojie-2107193`（2026 反 CFF）、`52pojie-2094419`（2026 解题）。
>
> 目录
> 1. 开工先量三件事
> 2. 工具选型矩阵
> 3. `wasm2c → .o → IDA` 路线（4 篇独立来源互证）
> 4. wasm2c 符号命名与「按可读尾部匹配」
> 5. 补导入函数的三板斧
> 6. `wasm2c → C → DLL/exe → Python`
> 7. Emscripten asm.js（`WASM=0`）与「没有 .wasm 文件的 wasm」
> 8. 「JS 层函数名 ≠ wasm 导出名」
> 9. 排错表

---

## 1. 开工先量三件事

拿到 `.wasm` 后**先回答三个问题**，答案决定后面走哪条路。用本技能自带脚本一次量完：

```bash
node skills/wsam-reverse/scripts/wasm-inspect.js -i ./target.wasm \
     --glue-family --crypto-constants --signatures
```

`--signatures` 会把 Type / Function 段接上导出表，直接打出**每个导出函数的
`(参数) -> 返回值` 签名**——这正是写 C / Python 包装层最需要、而 `module.exports()` 给不了的信息
（`--signatures` 默认开启）。

> **实测三源互证**（`project/yuanrenxue/match30/core.wasm`，696 字节）：
> 本脚本输出 `encrypt (Function #4) (i32, i32) -> ()`；
> Node 运行时 `WebAssembly.Module.exports()` + `inst.exports.encrypt.length === 2` + 调用返回 `undefined`；
> 仓库内手写 `core.wat` 为 `(func $encrypt (param $offset i32) (param $length i32)`。
> **三者一致**——签名解析（含「导入函数占用索引」这一最易错点）已被端到端验证。

| 要量什么 | 为什么它决定路线 |
| --- | --- |
| **有没有 import**（有几个、哪一类） | 0 个 import ⇒ 可以直接 `instance.exports.fn(...)` 调，不需要补环境；几十个 `__wbindgen_*` / `__cargo_web_snippet_*` / `env.*` ⇒ 必须选一条「补环境」路线 |
| **导出表里有没有目标函数** | 有 ⇒ 「能调用就行」；没有（比如 Go 只用 `syscall/js` 往 `window` 上挂函数）⇒ 必须把 wasm 跑起来，从宿主对象取函数 |
| **胶水层家族**（emscripten / wasm-bindgen / cargo-web / Go / 纯 C） | 决定补的是「少量 C 导入」还是「一整套 JS 运行时桥」。家族指纹表见 §8 与 `references/wasm-runtime-reproduction.md` §1 |

> **判据优先于工具**：一篇文章里作者用 `wasmer` 两行调通，是因为那个模块 import 数为 0；
> 另一篇花了半天补 `__wbg_*`，是因为模块有 100+ 个 wasm-bindgen 导入。
> **同一个问题不要复盘两次，先量再选。**

---

## 2. 工具选型矩阵

| 工具 | 产出 | 什么时候选 | 已知边界 |
| --- | --- | --- | --- |
| `wasm-objdump -j Export -x m.wasm` | 导出表 / 段清单 | 第一眼确认「导出函数叫什么」 | 只需段信息时最快 |
| `wasm2wat m.wasm -o m.wat` | 文本 WAT | 要看**每条指令的栈式语义**（逐条解释常量、位移、表查找） | 人读极慢，但**语义无歧义**，是解决公式争议的终审证据 |
| `wasm2c m.wasm -o m.c` | C + H | **目标是「能调用」**；或要借 `gcc -c` + IDA 的符号/Findcrypt 能力 | 产出**不是给人读的**：中型模块几百万字符，大型模块几十万行；实测 emscripten 产物「两千多万字符」 |
| `wasm-decompile m.wasm -o m.dcmp` | 人类较易读的伪代码 | **目标是「读懂算法」**且无法进 IDA | 抽象层级仍低，代码量巨大；先跳过前面巨大的 `data` 段找主逻辑 |
| `wasm2js`（binaryen） | Asm.js / JS | **环境没有 Wasm 引擎**，或要在 JS 层打断点 / 走 AST | 超大模块生成体积大；与 Emscripten 自带的 `WASM=0` 产物是两回事（见 §7） |
| IDA / Ghidra | 反编译伪 C | 新版 IDA 已支持 wasm 架构，但**对较新 wasm 版本可能直接报错** | 报错时退到 `wasm-decompile`，或走 §3 的 `.o` 路线 |

**一句话选路**：`能调用` → `wasm2c`（或直接实例化）；`要读懂` → 先 `wasm-decompile`，读不动再 `gcc -c` 进 IDA。

> `wasm2c` 的一个反直觉价值：它最大的用处不是「翻成人能读的 C」，而是**把 wasm 变回 IDA / angr 能处理的 `.o`**
> ——「以前觉得 wasm2c 没啥大用，现在看来，用于反 CFF 倒是不错」（`2107193`）。详见
> `references/wasm-cff-restoration.md`。

---

## 3. `wasm2c → .o → IDA` 路线（4 篇独立来源互证）

这是本族**出现频率最高、跨 7 年未变**的一条路线。四篇互不引用的文章给出了**完全一致**的步骤：

```bash
# 1) 下载 .wasm 到本地
# 2) 转 C（同时得到 m.c / m.h）
wasm2c m.wasm -o m.c
# 3) 把 wabt 仓库里的 3 个运行时文件拷到同目录
#    wasm-rt.h / wasm-rt-impl.c / wasm-rt-impl.h
# 4) 只编译，不链接（关键！很多导入函数没有实现，直接 gcc 会报错）
gcc -c m.c -o m.o
# 5) m.o 丢进 IDA：Functions window → 双击目标函数 → F5
```

| 来源 | 年份 | 场景 | 是否用了 `.o` 路线 |
| --- | --- | --- | --- |
| `52pojie-962068` | 2019 | CTF defcon quals | ✅ `gcc -c wasm.c -o wasm.o` → IDA |
| `52pojie-1461335` | 2021 | IQIYI 字幕解密 | ✅ 并提到「逍遥一仙」的一键工具 |
| `52pojie-2044904` | 2025 | scrape spa14 sign | ✅ 一键转 `.o` 工具（52pojie thread 1438499） |
| `52pojie-2107193` | 2026 | 反 CFF | ✅ 且**明确说明为什么**要做这一步 |

**为什么值得多绕一层**（`2107193` 的原话改写）：从 `.c` 到 `.o` 再反编译**不会带来新信息，反而可能丢信息**；
绕这一圈的唯一目的是**借 IDA 的能力**——符号改名、交叉引用、Findcrypt / Signsrch 插件。
正是靠这些插件，作者才注意到目标函数里是 **TEA**。

**关键细节**

- **必须 `gcc -c`，不要 `gcc -o`**：只编译不链接，因为关心的只是逻辑，不需要真能跑起来的 ELF。
- **编译用 `gcc` 而不是 MSVC**：`wasm2c` 的产物本来就是按 gcc 思路写的，用 VS 会报一大片错。
- **IDA 参数类型识别常常不准**：`F5` 出来后右键函数 → 「设置项目类型」，按 JS 侧实际传参手工改正，
  再改名（`2107193`/`1461335` 都做了这一步）。
- **函数数量大**（实测 200+）：**先从 JS 侧确定调用的是哪个函数**，再回来重点分析，不要一个个看。
- ⚠️ **`wasm2c` 输出跨版本会变**：`2107193` 实测 1.0.34 与 1.0.36 的输出**有差别**
  （虽然它关心的那个 `w2c_..._vodplay` 完全一样）。**不要把 `wasm2c` 的输出文本写进断言**，
  断言要锚在「函数语义」上。

---

## 4. wasm2c 符号命名与「按可读尾部匹配」

`wasm2c` 会把 wasm 名字转义成合法 C 标识符。实测样本（下表全部来自上面列出的来源文章）：

| wasm 侧原名 | `wasm2c` 产物 | 说明 |
| --- | --- | --- |
| 导出 `sign` | `w2c_sign` | 导出函数加 `w2c_` 前缀 |
| 导出 `encrypt` | `w2c_encode` / `w2c_encrypt` | 前缀 + 原名 |
| 内部函数 #50 | `w2c_f50` | 无名字的函数按序号 |
| `(import "wbg" "__wbg_new_59cb74e423758ede")` | `Z_wbgZ___wbg_new_59cb74e423758edeZ_iv` | 模块 `Z_` 字段 `Z_` 签名 |
| `(import "wasi_snapshot_preview1" "proc_exit")` | `Z_wasi_snapshot_preview1Z_proc_exitZ_vi` | 同上 |
| `(import "env" "getTotalMemory")` | `Z_envZ_getTotalMemoryZ_iv` | 同上 |
| `(import "./index_bg.js" "__wbg_instanceof_Window_xxx")` | `Z_Z2EZ2Findex_bgZ2EjsZ___wbg_instanceof_Window_xxxZ_ii` | `.`→`Z2E`、`/`→`Z2F` |
| 模块 `h5.worker` 的 `_vodplay_` | `w2c_h50x2Eworker_0x5Fvodplay_0` | 另一套 `0xNN` 转义风格 |

**可用的两条结论**

1. **导入符号的形状是稳定的**：`Z_<模块>Z_<字段>Z_<类型签名>`。
   类型签名是 wasm 的简写（`i`=i32、`v`=void、`d`=f64 …），**签名是校验符号是否补对的最强线索**：
   实参个数 / 返回值个数对不上，链接或运行就会崩。
2. **转义规则本身不要写死**：`.`→`Z2E`、`/`→`Z2F` 与 `.`→`0x2E`、`_`→`0x5F` 两套风格都在真实产物里出现过，
   且 `wasm2c` 版本会改。**正确做法是「按可读尾部匹配」**——`m.h` 已经把全部导入/导出符号列好了，
   你只需要扫一眼尾部那段人类可读的 `__wbg_xxx` / `proc_exit` / `vodplay`，
   用「包含可读尾部」的方式定位即可，**不要去实现一个转义解码器**。

> `m.h` 的正确用法：**当目录看**。它按 import / export 分块，一屏就能看出「这个模块要补哪些东西、
> 能调哪些东西」；`m.c` 则只当 `.o` 的原料。

---

## 5. 补导入函数的三板斧

导入函数在 `.h` 里是**未定义符号**，`gcc` 一定会报错。按下面的顺序补，**不要一上来逐个分析**：

**第一斧：先置 `NULL`，让它过编译。**

```c
void (*Z_envZ_abortZ_vv)(void) = NULL;          // 没见过它被调用 ⇒ 直接 NULL
u32  (*Z_envZ_getTotalMemoryZ_iv)(void) = NULL;
```

**第二斧：真跑起来，哪个崩就补哪个。**

`1581887` 的原话思路：**「最粗暴的方法是在所有的导入函数下断点，哪个运行到了就补哪一个」**——
在浏览器里对着 wasm 的 import 逐个下断点，跑一遍正常业务，只有被命中的那些才需要实现。
**从来没执行过的，一律 `NULL`。**

**第三斧：按 JS 侧逻辑写死返回值。**

导入函数就是「JS 提供给 wasm 用」的函数，**它的实现就在你手上的 JS 里**，照抄即可：

| 导入函数 | 直接抄 JS 得到的 C 实现 | 来源 |
| --- | --- | --- |
| `__wbindgen_is_undefined` | `return 0;` | `1581887` |
| `__wbg_self_...` | `return 36;` | `1581887` |
| `__wbindgen_object_clone_ref` | `return p0i32 + 1;` | `1581887` |
| `__wbg_instanceof_Window_...` | `return 1;` | `1581887` |
| `__wbg_new_...`（把 new Error 入栈） | 维护一个引用栈，返回栈索引 | `1493082` |
| `env.getTotalMemory` | `return 16777216;`（JS 里是定值） | `1581887` |
| 环境检测类导入 | 按「让检测通过」的值写死（实例：`aU()` 返回 `6`） | `1836908` |

**导入「数值 / 全局」也要当符号处理**：`env.*Base`、`global.NaN`、`global.Infinity` 这类导入是**指针变量**，
先全部置 `NULL`，编译报错的地方再逐个按引用改成实际值（`1581887` 的做法）。

**带闭包 / 带环境读数的导入函数要用「曲线赋值」**：
`_get_unicode_str` 在 JS 里是 `document.URL + navigator.userAgent + ...` 的拼接。
能写死的写死，**只有 `document.URL` 这类必须进参的，用一个 C 全局变量在调用前赋值**：

```c
char *url;
void set_url(char *s) { url = s; }
u32 envZ__get_unicode_strZ_iv(void) {
    int n = (int)strlen(url);
    u32 p = w2c__malloc(n + 75);
    memcpy(w2c_memory.data + p, url, n);
    memcpy(w2c_memory.data + p + n, "|mozilla/5.0 (windows nt 10.0; wow64) applewebkit||Mozilla|Netscape|Win32", 73);
    return p;
}
```

> **回到 JS 里找答案**：导入函数 100% 在 JS 侧有实现。**不要猜返回值**——
> 去 `initSync` / `importObject` 那一坨里搜函数名，逻辑照抄。

---

## 6. `wasm2c → C → DLL/exe → Python`

把 §3–§5 拼成一个可交付件时，注意下面这些**只在真实编译里才会出现**的坑。

### 6.1 导出函数的调用骨架（字符串往返四步）

```c
#include <stdio.h>
#include <stdlib.h>
#include "m.c"                        // wasm2c 的产物

extern void init_wasm(void);
extern char* encode(char*, char*);

void init_wasm() {                    // 顺序固定，别改
    init_func_types();
    init_globals();
    init_memory();
    init_table();
    init_exports();
}

char* encode(char* a1, char* a2) {
    u32 n1 = strlen(a1) + 1;                    // 1) 长度要含结尾 \0
    u32 p1 = w2c_stackAlloc(n1);                // 2) 在 wasm 内存里分配
    memcpy(w2c_memory.data + p1, a1, n1);       // 3) 写进去
    u32 n2 = strlen(a2) + 1;
    u32 p2 = w2c_stackAlloc(n2);
    memcpy(w2c_memory.data + p2, a2, n2);

    u32 out = w2c_encrypt(p1, p2);              // 4) 调用；返回值是**内存里的地址**
    char* r = (char*)malloc(512);
    memcpy(r, w2c_memory.data + out, 512);      //    再从内存读出来
    return r;
}
```

**字符串以 `\0` 结尾，长度必须 `+1`**——漏掉这 1 字节是最常见的静默错（能跑，结果差一位）。

### 6.2 二级指针：wasm 返回的是「装着结果的地址」

Rust `wasm-bindgen` 风格的导出函数**返回的不是字符串指针，而是指向指针的指针**，
返回值放在栈上 `retptr` 起始的 16 字节里，**前 4 字节小端**才是真正的出参地址：

```c
u32 retptr = w2c___wbindgen_add_to_stack_pointer(-16);
w2c_sign(retptr, content_ptr, content_len);
int out = 0;
out += (w2c_memory.data + retptr)[0];
out += (w2c_memory.data + retptr)[1] << 8;      // 小端！
out += (w2c_memory.data + retptr)[2] << 16;
out += (w2c_memory.data + retptr)[3] << 24;
char* s = (char*)malloc(33); s[32] = 0;
memcpy(s, w2c_memory.data + out, 32);
```

**判据**：JS 侧是 `getInt32Memory0()[r/4 + 0]` 这种「取两级」的写法 ⇒ 就是二级指针，不要直接当字符串用。

### 6.3 编译与跨语言调用

```bash
gcc -o m main.c wasm-rt-impl.c                       # 可执行文件
"D:/MinGW64/bin/gcc" -shared -Os -s -o m.dll main.c wasm-rt-impl.c   # 动态库
```

```python
import ctypes
dll = ctypes.windll.LoadLibrary('m.dll')
dll.init_wasm()
dll.encode.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
dll.encode.restype = ctypes.c_char_p
print(dll.encode(b"a", b"b").decode())
```

| 症状 | 根因 | 处置 |
| --- | --- | --- |
| `LoadLibrary` 报「找不到模块」，但文件就在同目录 | **32/64 位不匹配**：用了 32 位 gcc 编的 dll 在 64 位 Python 里加载 | 换 `x86_64-w64-mingw32` / `MinGW64` 的 gcc 重编；Python 位宽要和 gcc 一致 |
| 同样报「找不到模块」，位宽也对 | MinGW 运行时依赖缺失（实测缺 `libgcc_s_sjlj-1.dll`） | 用 **Depends** 看依赖，把缺的 dll 从 `<gcc>/x86_64-w64-mingw32/lib` 拷到同目录 |
| 不想折腾 dll 加载 | —— | 走**命令行 exe**：`main()` 里 `printf` 结果，Python 用 `os.popen('m "arg"')` 读回来。实测比修 dll 更快 |

> 命令行 exe 路线是**被验证过的逃生口**：`1581887` 先卡在 dll 加载，改 exe 立刻拿到正确结果，
> 之后才在评论区补上 dll 的根因。排错时**先用 exe 确认算法对错**，再回头修 dll。

---

## 7. Emscripten asm.js（`WASM=0`）与「没有 .wasm 文件的 wasm」

**症状**：JS 里逻辑明显是 wasm（`i32.load` / `HEAP32[...]` / 大片 `case` 分发），
但 Network 里**找不到任何 `.wasm` 请求**，也没有 base64 内嵌的二进制。

**根因**：Emscripten 用 `-s WASM=0` 把 wasm **编译成了 asm.js / 纯 JS**，逻辑全在 JS 里。

```bash
emcc main.cpp -s WASM=1 -o main.js     # 默认：产出 main.wasm + 胶水 JS
emcc main.cpp -s WASM=0 -o main.js     # 关键：不产出 .wasm，全塞进 JS
emcc main.cpp -s WASM_ASYNC_COMPILATION=0 ...   # 常见伴生开关：改同步加载
```

| 现象 | 含义 / 处置 |
| --- | --- |
| `TypeError: Cannot read properties of undefined (reading 'apply')` | **异步加载的 asm 还没赋值就被调用** ⇒ Emscripten 的 C 导出函数与 JS 还没完成交互。抓包确认是 `WASM_ASYNC_COMPILATION=0` 还是需要等 Promise |
| 反混淆后看到 `HEAP32` / `global$N` / `$NN(...)` | 就是 asm.js 产物。走 AST 反混淆（大数组 → 恒真假分支 → `break`/`return` 后死代码）即可读 |
| 另有一条：真 wasm 但被**编译进 JS** | 用 base64 内嵌。取法：`globalThis.getWasmBuffer()` 拿字节 → `new Blob([bytes],{type:'application/wasm'})` → `URL.createObjectURL` + `<a download>` 存成 `.wasm` |

> **asm.js 的还原优先级**：先确认「有没有独立 .wasm 文件」再决定要不要装 wasm 工具链。
> 没有文件的时候，`wasm2c` / `wasm-decompile` 全都用不上，直接进 JS 反混淆流程。

---

## 8. 「JS 层函数名 ≠ wasm 导出名」

**最容易走弯路的一步**。JS 里看到的 `call` 参数 / 函数名（例如 `monalisa_get_line_number`、
`gowasm.sp`、`r.spyder`）**只是 JS 侧的包装名**，在 wasm 函数窗口里**搜不到**。

**正确做法（三步）**：

1. 在 **JS 文件内部**搜这个名字，找到它的定义处，看它**绑定的 wasm 导出函数**是谁
   （实测：`monalisa_get_line_number` → wasm 导出 `v`；`r.spyder` → 某个导出签名函数）。
2. 到 `.wasm` 文本格式里搜该导出名（`wasm-objdump -j Export -x` 或 `wasm-inspect.js`）——
   **导出函数名一定会出现在二进制里**，这是「多个 wasm 里选哪一个」的最快判据。
3. 用 `.h` / IDA Functions window 定位后，再回浏览器在**同一个函数**下断点，核对实参个数与类型。

**胶水层家族指纹**（用于第 2 步「选哪个 wasm」）：

| 家族 | 导入名指纹 | 导出名指纹 |
| --- | --- | --- |
| Emscripten（C/C++） | `env.*`（`getTotalMemory`、`_emscripten_*`、`__syscall*`、`nullFunc_*`） | `_malloc` / `_free` / `stackAlloc` / `memory` |
| wasm-bindgen（Rust） | `wbg.__wbg_*`、`__wbindgen_*`、`__wbindgen_malloc` | 语义化名字（`sign`、`encrypt`）+ `__wbindgen_*` |
| cargo-web / stdweb（Rust） | `env.__cargo_web_snippet_<40 位 sha1>` | 应用函数名 |
| Go | `env.*` + `gojs.*` + `syscall/js.*`（`wasm_exec.js` 提供） | 少；业务函数常挂在 `window` 上 |
| 纯 C（wasm2c 可直出） | `env.__linear_memory` / `env.__indirect_function_table` | 业务函数名 |

---

## 9. 排错表

| 症状 | 根因 | 处置 |
| --- | --- | --- |
| `gcc m.c` 报一堆 `undefined reference` | 导入函数未实现 | 见 §5：先 `NULL`，再按命中补 |
| 用 VS 编译 `wasm2c` 产物报一大堆错 | MSVC 与 `wasm2c` 产物的 C 方言不合 | **改用 gcc** |
| `gcc -c m.c` 成功但 `.o` 进 IDA 后函数名全乱 | 没带符号；或 `wasm2c` 版本不同导致命名不同 | 用 `m.h` 对照函数清单；命名不稳定时改用 `wasm-decompile` |
| 反编译出来几千行 `while` + 状态变量 | **被做了控制流平坦化（CFF）** | 不要硬读，见 `references/wasm-cff-restoration.md` |
| 用 `wasm-decompile` 输出被 `data` 段淹没 | 字符串/常量在 data 段，量大 | 先跳过大段 `data`，直接找主逻辑函数；字符串用 `wasm-inspect.js --include-strings` 单独取 |
| 传中文 / 非 ASCII 参数，wasm 里只看到第一个字节 | wasm 只认字节流 | 先 `TextEncoder().encode(str)` 再写入内存 |
| 结果字符串尾部有垃圾 | 没按 `\0` 截断 | `viewString()` 式的「遇 `0` 即止」读法 |

---

## 10. 两篇来源给出不同公式时，以 WAT 为准（实测案例）

**背景**：`scrape.center` 的 spa14（`sign` 由 wasm 加密）有**两篇独立文章**，都在 2025 年、都成功了，
但**给出的复算口径不一致**：

| 来源 | 做法 | 给出的口径 |
| --- | --- | --- |
| `52pojie-2037819`（2025-06） | wasmer **直接调 wasm**（不解算法） | `sign = instance.exports.encrypt(n, math.ceil(time.time()))`；引用的 JS 源码是 `parseInt(Math.round((new Date).getTime() / 1e3).toString())` |
| `52pojie-2044904`（2025-07） | `.wasm → .o → IDA F5` + 逐步解释 WAT | IDA 给出 `return a3 / 3 + a2 + 16358`；作者写的 Python 是 `sign = math.ceil(time.time() / 3) + n + 16358` |

**终审证据是 WAT**（它没有歧义）：

```wat
(func $encrypt (;4;) (export "encrypt") (param $var0 i32) (param $var1 i32) (result i32)
    local.get $var0
    local.get $var1
    i32.const 3
    i32.div_s
    i32.add
    i32.const 16358
    i32.add
  )
```

逐条读栈：`push var0` → `push var1` → `push 3` → **`i32.div_s`（有符号整数除法，向零截断）** →
`i32.add`（`var0 + trunc(var1/3)`）→ `push 16358` → `i32.add`。
即 **`sign = var0 + trunc(var1 / 3) + 16358`**，其中 `var1` 已是**整数秒**。

**两处口径问题（都要按 WAT 纠正）**：

1. `2044904` 的 Python 写的是 `math.ceil(time.time() / 3)`，即 **`ceil(秒/3)`**；
   而 WAT 是 **`trunc(秒/3)`**。二者在秒数不是 3 的整数倍时**差 1**
   （例：`ts = 1751000000` → `trunc` 得 `583666666`，`ceil` 得 `583666667`）。
   正确写法：**`sign = n + int(seconds) // 3 + 16358`**（正数下 `//` 等价于 `trunc`）。
2. `2037819` 引用的 JS 源码用 `Math.round`，而它的示例代码用 `math.ceil`——**内部口径不一致**。
   二者只在秒的小数部分 ≥ 0.5 时不同，影响远小于第 1 条，但**不要照抄示例**。

**这段案例给出的可复用做法**：

- **不要因为「两篇都成功了」就认为两篇都等价**。第一篇成功是因为它**根本没算**（直接调 wasm），
  它的公式只是示意；第二篇的公式才是要复算的那个，而**它的 Python 与它自己贴出的 WAT 不一致**。
- **凡是源文章同时给了「伪代码/汇编」和「它自己写的复算代码」，以伪代码/汇编为准**，
  并**自己按语义重算一遍**（本库既有教训：源文章的数字与算式必须重算，不能照抄）。
- **`WAT` / `.o` 的反编译结果之所以是终审证据**，是因为它是**逐条指令**的，没有"作者理解"这一层；
  而"作者写的 Python"经过了两次转述（读代码 → 写代码）。
- **判断取舍的那一句**：直接调 wasm 的路线**天然正确且零风险**，但**不可移植**（换站点/换版本就废）；
  读 WAT 还原公式**可移植但必须自己验证**。**时间够就先走调用、要长期维护再还原公式。**

### 10.1 已实跑验证（可复现）

把上面那段 WAT **原样编译成 wasm 并真跑**，用「有区分力的输入」判定口径。
脚本落在**仓库的 `artifacts/` 下**（`artifacts/skill-evolution/b18-run-20260922/verify-spa14-wat.mjs`）——
它记录的是**本次实测证据的溯源路径，不是本技能自包含的资源**；技能被单独拷走时该路径会失效，
但结论（`n + trunc(sec/3) + 16358`）本身与任何仓库外文件无关，可照本文 §10 自行复算。

```
样本数: 24
trunc(sec/3) 口径不匹配的样本数（应为 0）: 0
有区分力的样本数（trunc 与 ceil 结果不同）: 15
  n=0 sec=1751000000: wasm=583683024  trunc公式=583683024  ceil公式=583683025
  n=0 sec=100:        wasm=16391      trunc公式=16391      ceil公式=16392
  n=10 sec=1751000000: wasm=583683034 trunc公式=583683034  ceil公式=583683035
✅ 结论成立：WAT 实现的是 n + trunc(sec/3) + 16358
```

**这条实测顺带验证了一个更重要的方法论——「区分性断言」**：
如果只拿 `sec = 3` 或 `sec = 102`（3 的整数倍）去测，`trunc` 与 `ceil` **结果完全相同**（24 个样本里有 9 个如此），
测试会**全绿地放过错误公式**。这正是 B8 记下的那条教训
（「往返自检抓不到对称的错误，必须补区分性断言」）在 wasm 场景的复现。

> **判据**：任何「两个候选口径」的甄别，**必须显式挑出使二者不相等的输入**，
> 并在断言里带上「候选 B 必须不匹配」。否则断言等于没写。

---

## 参见

- 运行期复现（Node / Python 里把 wasm 跑起来、补胶水层、环境探针）：`references/wasm-runtime-reproduction.md`
- 控制流平坦化还原：`references/wasm-cff-restoration.md`
- 内存语义与地址推演、内存取证：`references/wasm2c-and-memory-semantics.md`
- 转 Asm.js / 纯 JS：`references/wasm-to-js-transpilation.md`
