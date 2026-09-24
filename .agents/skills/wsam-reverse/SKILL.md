---
name: wsam-reverse
description: WebAssembly 模块逆向时使用，覆盖 捕获 → 反编译/反汇编 → 离线执行 → VMP 追踪 全链路。既包含依附活体浏览器的在线抓取与追踪（collect_wasm / wasm_dump / wasm_vmp_trace），也提供无需浏览器的 100% 离线 CLI 工具链（wasm-decompile / wasm-disassemble / wasm-inspect / wasm-run）。当用户在 wasm 里遇到读不懂的内存寻址（i32.load/i32.store、小端、offset 寻址、HEAPU8、131072 分块搬运）、C++ / Emscripten 修饰符号名（__ZN...Itanium mangling、c++filt）、想走 wasm2c + wasm-rt 把 wasm 翻译成 C 供任意语言调用、需要识别导出函数签名与内存分配约定（__wbindgen_malloc / passStringToWasm0），想先用内存 dump / 地址差法直接把写死的 key 与常量捞出来（HEAPU8、`Module.HEAPU8.subarray`、`_emscripten_run_script`、`$crypto/aes.NewCipher`、`$crypto/cipher.newCBC`、`$runtime.stringFromBytes`）、或目标页带 F12 反调试（debugger 循环、pushState 刷地址栏、DevTools 检测覆写页面）导致 worker 卡死时，也使用本技能，或目标产物是**拆分模块**（`wasm_split` / 函数名是一串 `j<数字>` / dump 工具给的地址搜不到函数）、来自 Unity IL2CPP 导出的 WebGL 或小游戏（`.unityweb` / `wasmcode` / `import.wasm` / brotli 压缩的 `.br`）时，也使用本技能。
---

# Wasm 逆向

WebAssembly 模块常用于：图像处理、加密算法（替代 JS 实现以提速）、反混淆（VMP）、核心算法保护。提供从**捕获 → 反编译 → 离线执行**的完整链路。

> **核心心法**：**反编译 > 反汇编**（默认）。除非你想看原始 WAT 指令，否则 `wasm-decompile` 的"函数摘要 + 可疑模式"能节省 80% 阅读时间。

---

## 离线 CLI 工具（免启动浏览器）

对于已下载到本地的 `.wasm` 文件，推荐直接使用 `skills/wsam-reverse/scripts/` 中的独立 Node.js ESM 脚本，无需启动 Chromium 或连接 worker：

```bash
# 1) 二进制结构检查与字符串扫描（快速建立全局观）
node skills/wsam-reverse/scripts/wasm-inspect.js --input ./target.wasm
node skills/wsam-reverse/scripts/wasm-inspect.js -i ./target.wasm --json

# 2) 高可读性反编译（带函数特征分析与可疑模式识别）
node skills/wsam-reverse/scripts/wasm-decompile.js --input ./target.wasm
node skills/wsam-reverse/scripts/wasm-decompile.js -i ./target.wasm -o ./target.wat --json

# 3) 反汇编为标准 WAT 文本
node skills/wsam-reverse/scripts/wasm-disassemble.js --input ./target.wasm -o ./target.wat

# 4) 脱机调用导出函数（优先 Node 原生 WebAssembly，支持 wasmtime / wasmer）
node skills/wsam-reverse/scripts/wasm-run.js --input ./target.wasm --invoke sign --args 10,20
node skills/wsam-reverse/scripts/wasm-run.js -i ./target.wasm --invoke encrypt --runtime node --json

# 5) Wasm 离线转译为纯 JavaScript / Asm.js（免 Wasm 引擎环境纯算路线）
node skills/wsam-reverse/scripts/wasm2js.js --input ./target.wasm -o ./target.asm.js
```

---

## browsercli 在线捕获与追踪前置

`browsercli` 侧只保留 4 个 wasm MCP 工具：`collect_wasm`（捕获）、`wasm_dump`（导出）、`wasm_vmp_trace`（跨边界追踪）、`wasm_memory_inspect`（线性内存检查）。反编译 / 反汇编 / 离线执行全部由本仓库的离线脚本完成，不再作为 MCP 工具提供。

对于运行在线上网页中的 Wasm 模块，通过 browsercli 进行活体捕获与追踪：

```bash
# 连接浏览器（headless 默认），并确认 worker 状态
browsercli browser connect
browsercli status

# 可用性自检：列出工具并过滤 wasm 族（应只剩上述 4 个）
browsercli list-tools --json | jq -r '.[].name' | grep -E '^(collect_wasm|wasm_)'

# 工具调用通用形式（连字符↔下划线自动转换：wasm-memory-inspect ⇄ wasm_memory_inspect）
browsercli call <tool-name> [--param value] [--data '{"k":"v"}'] [--file params.json]
```

**参数约定**：

- 数组参数：`--args '["a","b"]'`（JSON 字面量）或 `--args a,b`（逗号拆分）
- 对象参数：`--data '{"key":"value"}'`，或复杂参数写入文件 `--file params.json`
- 反编译 / 离线执行这类参数多的调用，优先 `--file params.json`，避免 PowerShell/bash 转义

---

## 工作流

```bash
# 1) 捕获模块（wasm_dump 的前置！重新导航目标页，抓网络加载 + 运行时创建的 wasm）
browsercli call collect_wasm --url https://target.com/path

# 2) 导出模块（从浏览器抓到 .wasm）
browsercli call wasm_dump --moduleIndex 0 --outputPath ./target.wasm

# 3) 使用离线脚本检查与反编译（推荐）
node skills/wsam-reverse/scripts/wasm-inspect.js --input ./target.wasm
node skills/wsam-reverse/scripts/wasm-decompile.js --input ./target.wasm

# 4) 离线单步执行与算法验证
node skills/wsam-reverse/scripts/wasm-run.js --input ./target.wasm --invoke <functionName> --args <arg1,arg2>

# 5) 在线内存 / 运行时追踪
browsercli call wasm_memory_inspect --offset 0 --length 1024 --format hex --searchPattern "deadbeef"
browsercli call wasm_vmp_trace --maxEvents 100 --filterModule <name>
```

---

## 关键决策

### 反编译 vs 反汇编

| 场景                     | 选                                                       | 原因                     |
| ------------------------ | -------------------------------------------------------- | ------------------------ |
| 快速理解模块结构         | `node .../wasm-decompile.js -i ./target.wasm`            | 函数级摘要，可疑模式标记 |
| 看具体指令（VMP opcode） | `node .../wasm-disassemble.js -i ./target.wasm`          | 原始 WAT，每条指令可追   |
| 函数太多要快速定位       | `wasm-decompile.js -i ./target.wasm --inline-export true` | 展开 export 链           |
| 调试器单步               | `node .../wasm-run.js -i ./target.wasm --invoke <fn>`    | 不用启动完整运行时       |
| 优化后再看               | `wasm-opt -O2` → 再 `wasm-decompile.js`                  | 常量折叠后逻辑更直白     |

### 段信息 vs 直接反编译

`node skills/wsam-reverse/scripts/wasm-inspect.js` 适合：

- 知道模块有 N 个函数但不知道哪个是入口 → 看 export 段
- 怀疑有内嵌字符串 / URL / 域名 → `--include-strings`（默认开启）
- 想知道内存布局 → 看 Memory 段

**不要**先反编译再段信息。反编译对超大模块（>10k 函数）很慢。

### 路线选择：扣 JS / 手写算法 / wasm2c / wasm2js

四条路各有明确边界，**先按「要拿到输出」还是「要搞懂算法」选路，再动手**——选错会白干一天：

| 路线 | 何时选 | 代价 |
| --- | --- | --- |
| 扣 JS | 需长期稳定复现、调用次数多 | 需 wasm 运行时；导入函数要全扣对 |
| 手写算法 | 算法简单（单轮异或、固定查表） | 耗时最长；VMP 类走不通 |
| **wasm2c** | **不想读算法、只要能调用**；导出签名清晰 | 需 C 工具链；首次搭建约半天 |
| **wasm2js** | **环境无 Wasm 引擎**（轻量沙箱/JS引擎）或**需打断点/AST分析** | 依赖 `binaryen`；对超大模块生成 JS 体积偏大 |

- **选了 wasm2c 后**：`wasm2c app.wasm -o app.c` → `gcc -shared -fPIC -O2 app.c wasm-rt-impl.c -o app.dll`。完整路线、`wasm-rt-impl.c` 位置、跨语言「分配→写入→调用→读出」四步、非 ASCII 传参被静默截断的坑，读 `references/wasm2c-and-memory-semantics.md`。
- **选了 wasm2js 后**：使用 `binaryen.readBinary(...).emitAsmjs()` 将 `.wasm` 离线转译为纯 Asm.js / JavaScript。脱离 WebAssembly 运行时直接调用，完整 Node.js 脚本与浏览器实时转译配方，读 `references/wasm-to-js-transpilation.md`。

#### 动手前先做四件事（做过一次能省半天）

1. **量三件事定路线**：`node .../wasm-inspect.js -i ./target.wasm --glue-family --crypto-constants --signatures`
   —— 一次拿到「有几个导入 / 属哪个胶水层家族 / 导出函数签名 / 内嵌标准加密常量」。
   `--signatures` 给的是**写 C/Python 包装层最需要的参数与返回值类型**。
   判据与选型矩阵见 `references/wasm-toolchain-and-decompilation.md` §1–§2。
2. **分清 CFF 还是 VMP**（选错路线会白干一天）：伪代码里是「大量 `while` + 状态变量魔法常量」⇒ CFF；
   「一个超长字节码数组 + 一个分发器、多数函数都汇进同一个函数」⇒ VMP。
   判据表与各自路线见 `references/wasm-cff-restoration.md` §11.2。
3. **能不能不反编译就把 wasm 跑起来**：`references/wasm-runtime-reproduction.md` 给了 Node（含
   `delete process/global` 的取舍、Go 的 `wasm_exec.js`、Proxy 环境探针）与 Python（wasmer / pywasm）
   两套骨架。**能跑通就别读算法**——这条在本族里成功的比例最高。
4. **函数名是不是一串 `j<数字>` / dump 工具给的地址搜不到？**
   ⇒ 这是**拆分产物**（如 Unity 小游戏的 `wasm_split`），符号名要**重算**：
   `j${getRedirIndex(addr) & 0xFFFFFFF}`，索引函数在导出 `__wasm_split_getRedirIndex` 的那个模块里
   （常是 `import.wasm`）。见 `references/wasm-toolchain-and-decompilation.md` §11。
   **不重算就永远搜不到目标函数。**

### Wasm 内存语义（读 WAT 的唯一铁律）

`i32.load` / `i32.store` 是操作内存的唯一手段，读懂它只要两条：

1. **地址来自栈顶**——执行前 `i32.const 104472` 之类已压栈，拿这个值去查内存。
2. **小端存储**——低字节在低地址。

```
内存 104472 处四字节：152, 196, 98, 0
bits: 0 | 1100010 | 11000100 | 10011000  =  6472856
```

所以取出的是 `6472856`，**不是**四字节十进制相加。任何地址推导都要走一遍这个步骤。

内存布局类目标（加密视频流、二进制处理）再抓三件事：内存基址与栈上界（`abortStackOverflow` 触发点）、JS→wasm 写入入口 `stringToUTF8(e, stackAlloc(i), i)`、**131072（128 KB）** 分块搬运常量。地址推演全流程、**从已知明文反推密钥**、字节流还原配方见 `references/wasm2c-and-memory-semantics.md` §3–§4。

🔴 **在开始读 WAT 之前，先花 5 分钟做一次内存取证**：`new Blob([new Uint8Array(Module.HEAPU8)])` 把整块内存
dump 下来搜特征串（AES S 盒 `63 7c 77 7b`、写死的 key/IV、编码表），或用「已知返回地址 + 固定偏移」直接
把 key 取出来。Emscripten 与 Go 产物都适用，命中即省半天到一天。
做法、地址差法、`_emscripten_run_script` 打桩、以及「输入不能置空 / 实例只能调一次」两个反直觉坑，
见 `references/wasm2c-and-memory-semantics.md` §7。

---

## VMP 场景

如果 wasm 是**代码保护器**（如某些商业 VMP 用的 wasm 壳），反编译可能输出大量无意义指令（`i32.const` / `local.get` / `i32.xor` 循环）。这时：

> 🔴 **先分清「CFF」和「VMP」再选路**：CFF 是**控制流被打散**（指令集不变），VMP 是**指令集被替换**
> （自建字节码解释器）。判据与各自路线见 `references/wasm-cff-restoration.md` §11.2–§11.3；
> **VMP 场景下在 C/JS 转换产物上补环境基本走不通**，正确退路是「不动 wasm、直接扣原 JS 补环境」。

1. `browsercli call wasm_vmp_trace` 抓运行时事件（每次进入 / 退出函数 + 参数摘要）
2. 用 `node skills/wsam-reverse/scripts/wasm-run.js --input ./target.wasm --invoke <func>` 重放同一个输入多次，看哪条路径被命中
3. 关注 **dispatcher**（最外层 switch 调度函数）的输入输出

不要试图"完整还原 VMP" — 通常目标是**只提取目标算法**（如签名函数），其他外壳可以跳过。

### C++ 符号还原：先把修饰名解出来

C++（Emscripten）编译出的 wasm，函数名是 **Itanium ABI 修饰名，不是乱码**，而它常常直接告诉你「这是一个 `std::map` 的查找」，比逐条读 `i32.load` 快十倍：

```
__ZNSt3__26__treeINS_12__value_typeIi14nup2p_secret_tEENS_..._EEE4findIiEENS_..._EERKT_
   └ __ZN 嵌套名 │ St3__2 = std::__2 │ 6__tree │ I...E 模板参数 │ 4find 成员函数 │ IiE = <int>
```

工具：`c++filt`、`llvm-cxxfilt`。**先解名再读指令。**

反汇编器选择：JEB 可读性最好，但导入函数多、频繁操作内存时会报错；此时换 IDA。完整解码表与反汇编器取舍见 `references/wasm2c-and-memory-semantics.md` §5。

---

## 与 JS 边界

很多 wasm 模块不是独立运行，而是从 JS 侧被调用。Hook 路径：

```bash
# 1. 找 JS 侧加载代码
browsercli call list_scripts --filter "wasm|.wasm|WebAssembly"
browsercli call search_in_sources --query "WebAssembly.instantiate|compileStreaming"
# 找到 JS 调 wasm 的入口（search_in_sources 默认把命中脚本写入当前工作目录）

# 2. 用 hook 拦截 JS 侧的 import（传入 wasm 的 JS 函数）
browsercli call hook_function --target <importedFuncName>
# 看 JS 给 wasm 传了什么

# 3. 拦截 wasm 侧 export（wasm 调 JS）
browsercli call wasm_vmp_trace  # 看 wasm→JS 边界调用
```

### 调试注入：在 wasm 加载完成后注入可搜索的标记

wasm 调试页里搜索函数名很不方便（名字在实例化后才存在）。**在 `loadSync` 返回后立刻注入一段脚本**，把导出对象挂到 `window` 上，之后就能在控制台直接搜索与调用：

```js
// 在 initSync 的 `wasm = i.exports` 之后追加
window.__wasm = wasm;
Object.keys(wasm).forEach(k => { window['__w_' + k] = wasm[k]; });
```

配合「先扣 JS + 本地 HTML 页面」，可以在页面上直接输入待加密字符串并打印结果，比在目标站上反复下断点快得多。

---

## 实战警示：反调试页面

目标页若带反调试（如 jsjiami 混淆 + `setInterval` debugger 陷阱），**不要**依赖浏览器 DOM 交互工具（fill / click / screenshot）去触发 wasm——它们会挂起并永久占用 worker，后续所有命令（含 browser disconnect）全部返回 `HTTP 409 WORKER_BUSY`。

### F12 相关反调试的处置

| 形态 | 症状 | 处置 |
| --- | --- | --- |
| `debugger` 循环（`setInterval` / `Function("debugger")`） | 打开 DevTools 即断住，无法操作 | 覆盖原函数（注入脚本改写该函数体）或条件断点禁用 |
| `history.pushState` 刷地址栏 | 页面极卡、内存飙升 | Hook `history.pushState` 为空函数 |
| 检测 DevTools 后 `document.write` 覆写整页 | 页面被换成正则提示页 | 在覆写语句前插入 `return;` |
| `eval` 出来的监管脚本 | 断点落在 `eval` 里，堆栈看不到源头 | 注释掉该 `eval` 调用本身，而不是它内部 |

```bash
# 优先方案：HTTP 侧路 + 本地重建
# 1) 用 curl/fetch 直接拉目标 .wasm / 接口，不走浏览器页面
curl -s -o target.wasm 'https://target.com/static/app.wasm'
# 2) 本地 Node 实例化下载的 wasm 重建加密逻辑（WebAssembly API 内置于 Node）
node loader.js   # loader.js: WebAssembly.instantiate(fs.readFileSync('target.wasm')) → 调导出函数
# 或本地 Node 直接实例化（见上方离线脚本路线）
node skills/wsam-reverse/scripts/wasm-run.js -i ./target.wasm --invoke <exportFn> --args <a,b>

# worker 一旦被卡死：先试取消任务，不行只能重启 worker 进程
browsercli jobs list
browsercli jobs cancel <job-id>
```

> 依赖动态生成、答案有效期短（如一分钟）的目标：写"计算 + 提交"一体化脚本保证时效。

---

## 输出产物

| 文件                      | 内容                          |
| ------------------------- | ----------------------------- |
| `target.wasm`             | 原始模块（从浏览器抓出）      |
| `target.decompiled.wat`   | 反编译输出                    |
| `target.disassembled.wat` | 反汇编输出（如果做了）        |
| `target.opt.O2.wasm`      | `wasm-opt -O2` 优化产物       |
| `target.sections.json`    | 段信息 + 字符串扫描           |
| `target.funcs.md`         | export 函数表（按可疑度排序） |
| `call-graph.md`           | 从 vmp_trace 提取的调用关系   |
| `evidence.md`             | task artifact 条目（Agent 直接写入） |

---

## 失败回退

| 现象                             | 解决                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| `wabt` 缺失（脚本报 `Cannot find package 'wabt'`） | `npm i -g wabt` 或 `apt install wabt`                                          |
| 离线执行报 wasmtime 缺失         | `curl https://wasmtime.dev/install.sh -sSf \| bash`                                         |
| `wasm-opt` 缺失                  | 装 Binaryen（`brew install binaryen` / `apt install binaryen`）                             |
| `wasm_dump` 报"未捕获任何 WASM 模块" | 先 `browsercli call collect_wasm --url <url>` 重新导航捕获                                    |
| `wasm-decompile.js` 输出过长 / 卡住 | 加 `--max-wat-chars 500000` 限制输出                                                     |
| 反编译输出看不懂                 | 改用 `wasm-disassemble.js -i ./target.wasm` 看原始 WAT；或 `wasm-run.js` 重放输入           |
| 找不到入口函数                   | 看 `wasm-inspect.js -i ./target.wasm` 的 export 段；用 skill `code-analysis` 辅助 JS 侧      |
| 二进制字符串扫描报敏感           | `wasm-inspect.js --mask-sensitive` 屏蔽，但记下索引回查                                    |
| 反编译 / 反汇编 / 离线执行不可用 | 这些已不是 MCP 工具，改用 `skills/wsam-reverse/scripts/` 下的离线脚本（需装 `wabt` / `binaryen`） |
| 页面反调试卡死 worker（409）         | 放弃 DOM 交互，走 curl 拉资源 + 本地 Node 重建；必要时 `browsercli jobs cancel` / 重启 worker |
| WAT 里全是 `__ZNSt3__2...` 看不懂    | 用 `c++filt` / `llvm-cxxfilt` 解修饰名，先知道它是什么再读指令                               |
| `i32.load` 出来的地址对不上          | 按小端逐字节还原（§Wasm 内存语义），不要把四字节当十进制相加                                 |
| 报错栈停在 `_emscripten_run_script*` | 环境检测是 wasm 调 JS `eval`；给这两个导出打桩（`location` 直接返回 1），不要去读 wasm      |
| key 就在内存里但取不到               | dump `HEAPU8` 搜特征串；或按「结果地址 ± 固定偏移」取（偏移不保证跨版本，换样本复验）        |
| `encrypt` 第二次调用返回 `null`      | Go 的 `crypto/cipher` 流对象**有状态**：每次重新加载模块，或一次调用只取一组样本             |
| 把输入传空只想取输出，结果拿到垃圾   | 大模块在后续处理失败时会**释放输出内存**；必须传一个真实的（哪怕很小的）输入                 |
| `wasm2c` 编译报缺符号                | 把 wabt 源码包里的 `wasm-rt-impl.c` / `wasm-rt.h` 一起编译；导出名形如 `w2c_<module>_<name>` |
| wasm2c 出来的函数传中文参数即崩      | 该模块 `passStringToWasm0` 只支持 ASCII（`< 127`）；改在 C 侧直接按字节写内存                |
| 目标页 `pushState` 把浏览器刷到卡死  | Hook `history.pushState` 为空函数后再抓包                                                    |

---

## 工具链要求

| 工具                    | 用途              | 安装                                                |
| ----------------------- | ----------------- | --------------------------------------------------- |
| `wabt`                  | WAT 汇编/反汇编   | `apt install wabt` / `brew install wabt`            |
| `binaryen` (`wasm-opt`) | 优化 + 二次反编译 | `brew install binaryen`                             |
| `wasmtime`              | 离线执行          | `curl https://wasmtime.dev/install.sh -sSf \| bash` |
| `wasmer`                | 备用运行时        | `curl https://get.wasmer.io -sSf \| sh`             |

`node skills/wsam-reverse/scripts/wasm-run.js --runtime auto` 会依次尝试 Node 原生 / wasmtime / wasmer；用 `--help` 或直接运行脚本可查看各离线脚本的参数。**全缺失**时仍可做段信息 + 反编译，但离线执行不可用。

---

## 关联

- `references/wasm-toolchain-and-decompilation.md`：**工具链选型与反编译路线的唯一权威源** ——
  开工先量三件事、`wasm2c/wasm2js/wasm-decompile/IDA` 取舍矩阵、`wasm2c → .o → IDA` 路线（4 篇独立来源互证）、
  `wasm2c` 符号命名与「按可读尾部匹配」、补导入函数的三板斧、`C → DLL/exe → Python`（含 MinGW 运行时缺失坑）、
  Emscripten asm.js（`WASM=0`）与「没有 .wasm 文件的 wasm」、**「JS 层函数名 ≠ wasm 导出名」**、
  **两篇来源公式冲突时以 WAT 为准（含实测复核）**。
- `references/wasm-cff-restoration.md`：**控制流平坦化（CFF）还原的唯一权威源** ——
  判据、四步法、有效块模板（`call i32_store`+`jmp` / `call i32_load`+`cmp`+`jz`）、
  ihelp vs 非 ihelp 的 angr hook 策略、**为什么不能用 `angr.options.CALLLESS`**、汇编 patch 的空间坑、
  AI 反 CFF 的定位、排错顺序，以及 **§11.2–§11.3「CFF vs VMP」判据与 VMP 的正确退路**。
  ⚠️ 全流程依赖 IDA + angr + keystone，**本技能不含可执行实现、也不声称能自动反 CFF**。
- `references/wasm-runtime-reproduction.md`：**在 Node/Python 里复现 wasm 运行时的唯一权威源** ——
  胶水层家族指纹、通用四步、Node 骨架（`delete process/global` 的取舍）、
  Go-wasm（`wasm_exec.js` + Proxy 环境探针 + `global` 不能自赋值）、wasm-bindgen 导入表与 retptr 二级取值、
  cargo-web/stdweb 引用表桥、Emscripten 导入表、wasmer/pywasm、**环境识别开关 `try/catch + eval('process')`**、
  浏览器内内存视图注入与全内存搜索、排错表。
- `references/wasm2c-and-memory-semantics.md`：wasm2c 完整路线、内存语义与地址推演、字节流密钥反推、Itanium 符号解码表、调试注入。
- **内存取证（先做这个）**：`references/wasm2c-and-memory-semantics.md` §7 —— HEAPU8 dump 搜常量、
  「结果地址 + 固定偏移」取 key、`_emscripten_run_script` 打桩、Go 产物符号名与流对象状态、
  结果内存生命周期。emcc 与 Go 编译的产物都适用。
- **加密媒体流 / DRM 场景**：如果这个 wasm 是用来解密 **ts / m3u8 / 视频内容**的（导出函数名像 `decrypt`、
  入参是 PES/NALU、旁边有 `EXT-X-KEY` 或 `GetLicense`），先切到 `../stream-drm-reverse/SKILL.md` ——
  那里有 F 层的四条路线选择（`importObject` 代理直接调用 / wasm2js + DFA / VMP 反汇编成 IR / AI 补环境重放），
  比从本技能一路读内存语义更省时间。
- 完整六阶段工作流（Observe / Capture / Rebuild / Patch / PureExtraction / Port）：项目根 `AGENTS.md`
- browsercli 命令契约与端到端最小流程：`../web-reverse-env/references/08-browsercli.md`
- 工具参数与 profile 门控：`../ast-deobfuscation/references/browsercli-tools.md`；
  门控现状用 `browsercli list-tools --json` 当场确认
- 失败回退决策树：见本文件上面的「失败回退」表
