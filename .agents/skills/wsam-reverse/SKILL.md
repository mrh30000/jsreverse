---
name: wsam-reverse
description: WebAssembly 模块逆向时使用，覆盖 捕获 → 反编译/反汇编 → 离线执行 → VMP 追踪 全链路。既包含依附活体浏览器的在线抓取与追踪（collect_wasm / wasm_dump / wasm_vmp_trace），也提供无需浏览器的 100% 离线 CLI 工具链（wasm-decompile / wasm-disassemble / wasm-inspect / wasm-run）。当用户在 wasm 里遇到读不懂的内存寻址（i32.load/i32.store、小端、offset 寻址、HEAPU8、131072 分块搬运）、C++ / Emscripten 修饰符号名（__ZN...Itanium mangling、c++filt）、想走 wasm2c + wasm-rt 把 wasm 翻译成 C 供任意语言调用、需要识别导出函数签名与内存分配约定（__wbindgen_malloc / passStringToWasm0），或目标页带 F12 反调试（debugger 循环、pushState 刷地址栏、DevTools 检测覆写页面）导致 worker 卡死时，也使用本技能。
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
```

---

## proxycli 在线捕获与追踪前置

对于运行在线上网页中的 Wasm 模块，通过 proxycli 进行活体捕获与追踪：

```bash
# 连接浏览器（headless 默认），并确认 worker 状态
proxycli browser connect
proxycli status

# wasm 工具属于 full profile，workflow 下会报
# "Tool wasm_decompile is not available in profile workflow"
# → profile 是 worker 侧环境变量：在启动 worker 的进程里设置并重启 worker
JS_REVERSE_TOOL_PROFILE=full npm run start   # 或在你自己的 MCP host 环境里注入

# 可用性自检：列出工具并过滤 wasm 族
proxycli list-tools --json | jq -r '.[].name' | grep -E '^(collect_wasm|wasm_)'

# 工具调用通用形式（连字符↔下划线自动转换：wasm-capabilities ⇄ wasm_capabilities）
proxycli call <tool-name> [--param value] [--data '{"k":"v"}'] [--file params.json]
```

**参数约定**：

- 数组参数：`--args '["a","b"]'`（JSON 字面量）或 `--args a,b`（逗号拆分）
- 对象参数：`--data '{"key":"value"}'`，或复杂参数写入文件 `--file params.json`
- 反编译 / 离线执行这类参数多的调用，优先 `--file params.json`，避免 PowerShell/bash 转义

---

## 工作流

```bash
# 1) 捕获模块（wasm_dump 的前置！重新导航目标页，抓网络加载 + 运行时创建的 wasm）
proxycli call collect_wasm --url https://target.com/path

# 2) 导出模块（从浏览器抓到 .wasm）
proxycli call wasm_dump --moduleIndex 0 --outputPath ./target.wasm

# 3) 使用离线脚本检查与反编译（推荐）
node skills/wsam-reverse/scripts/wasm-inspect.js --input ./target.wasm
node skills/wsam-reverse/scripts/wasm-decompile.js --input ./target.wasm

# 4) 离线单步执行与算法验证
node skills/wsam-reverse/scripts/wasm-run.js --input ./target.wasm --invoke <functionName> --args <arg1,arg2>

# 5) 在线内存 / 运行时追踪
proxycli call wasm_memory_inspect --offset 0 --length 1024 --format hex --searchPattern "deadbeef"
proxycli call wasm_vmp_trace --maxEvents 100 --filterModule <name>
```

---

## 关键决策

### 反编译 vs 反汇编

| 场景                     | 选                                    | 原因                     |
| ------------------------ | ------------------------------------- | ------------------------ |
| 快速理解模块结构         | `wasm_decompile`                      | 函数级摘要，可疑模式标记 |
| 看具体指令（VMP opcode） | `wasm_disassemble`                    | 原始 WAT，每条指令可追   |
| 函数太多要快速定位       | `wasm_decompile --inlineExport true`  | 展开 export 链           |
| 调试器单步               | `wasm_offline_run`                    | 不用启动完整运行时       |
| 优化后再看               | `wasm_optimize` → 再 `wasm_decompile` | 常量折叠后逻辑更直白     |

### 段信息 vs 直接反编译

`wasm_inspect_sections` 适合：

- 知道模块有 N 个函数但不知道哪个是入口 → 看 export 段
- 怀疑有内嵌字符串 / URL / 域名 → `--includeStringScan true`
- 想知道内存布局 → 看 Memory 段

**不要**先反编译再段信息。反编译对超大模块（>10k 函数）很慢。

### 路线选择：扣 JS / 手写算法 / wasm2c

三条路各有明确边界，**先按「要拿到输出」还是「要搞懂算法」选路，再动手**——选错会白干一天：

| 路线 | 何时选 | 代价 |
| --- | --- | --- |
| 扣 JS | 需长期稳定复现、调用次数多 | 需 wasm 运行时；导入函数要全扣对 |
| 手写算法 | 算法简单（单轮异或、固定查表） | 耗时最长；VMP 类走不通 |
| **wasm2c** | **不想读算法、只要能调用**；导出签名清晰 | 需 C 工具链；首次搭建约半天 |

选了 wasm2c 后：`wasm2c app.wasm -o app.c` → `gcc -shared -fPIC -O2 app.c wasm-rt-impl.c -o app.dll`。完整路线、`wasm-rt-impl.c` 位置、跨语言「分配→写入→调用→读出」四步、非 ASCII 传参被静默截断的坑，读 `references/wasm2c-and-memory-semantics.md`。

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

---

## VMP 场景

如果 wasm 是**代码保护器**（如某些商业 VMP 用的 wasm 壳），反编译可能输出大量无意义指令（`i32.const` / `local.get` / `i32.xor` 循环）。这时：

1. `proxycli call wasm_vmp_trace` 抓运行时事件（每次进入 / 退出函数 + 参数摘要）
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
proxycli call list_scripts --filter "wasm|.wasm|WebAssembly"
proxycli call search_in_sources --query "WebAssembly.instantiate|compileStreaming"
# 找到 JS 调 wasm 的入口（search_in_sources 默认把命中脚本写入当前工作目录）

# 2. 用 hook 拦截 JS 侧的 import（传入 wasm 的 JS 函数）
proxycli call hook_function --target <importedFuncName>
# 看 JS 给 wasm 传了什么

# 3. 拦截 wasm 侧 export（wasm 调 JS）
proxycli call wasm_vmp_trace  # 看 wasm→JS 边界调用
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
# 或走 worker：proxycli call wasm_offline_run --file params.json

# worker 一旦被卡死：先试取消任务，不行只能重启 worker 进程
proxycli jobs list
proxycli jobs cancel <job-id>
```

> 依赖动态生成、答案有效期短（如一分钟）的目标：写"计算 + 提交"一体化脚本保证时效。

---

## 输出产物

| 文件                      | 内容                          |
| ------------------------- | ----------------------------- |
| `target.wasm`             | 原始模块（从浏览器抓出）      |
| `target.decompiled.wat`   | 反编译输出                    |
| `target.disassembled.wat` | 反汇编输出（如果做了）        |
| `target.opt.O2.wasm`      | `wasm_optimize` 优化产物      |
| `target.sections.json`    | 段信息 + 字符串扫描           |
| `target.funcs.md`         | export 函数表（按可疑度排序） |
| `call-graph.md`           | 从 vmp_trace 提取的调用关系   |
| `record_reverse_evidence` | task artifact 条目            |

---

## 失败回退

| 现象                                 | 解决                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `wasm_capabilities` 报 wabt 缺失     | `npm i -g wabt` 或 `apt install wabt`                                                       |
| `wasm_capabilities` 报 wasmtime 缺失 | `curl https://wasmtime.dev/install.sh -sSf \| bash`                                         |
| `wasm_optimize` 报 wasm-opt 缺失     | 装 Binaryen（`brew install binaryen` / `apt install binaryen`）                             |
| `wasm_dump` 报"未捕获任何 WASM 模块" | 先 `proxycli call collect_wasm --url <url>` 重新导航捕获                                    |
| `wasm_decompile` 慢 / 卡住           | 加 `--maxWatChars 500000` 限制输出                                                          |
| 反编译输出看不懂                     | 改用 `wasm_disassemble` 看原始 WAT；或 `wasm_offline_run` 重放输入                          |
| 找不到入口函数                       | 看 `wasm_inspect_sections` 的 export 段；用 skill `code-analysis` 辅助 JS 侧                |
| 二进制字符串扫描报敏感               | `--maskSensitiveStrings true` 屏蔽，但记下索引回查                                          |
| 工具不可用（profile 报错）           | 在 worker 启动环境设置 `JS_REVERSE_TOOL_PROFILE=full` 并重启 worker                         |
| 页面反调试卡死 worker（409）         | 放弃 DOM 交互，走 curl 拉资源 + 本地 Node 重建；必要时 `proxycli jobs cancel` / 重启 worker |
| WAT 里全是 `__ZNSt3__2...` 看不懂    | 用 `c++filt` / `llvm-cxxfilt` 解修饰名，先知道它是什么再读指令                               |
| `i32.load` 出来的地址对不上          | 按小端逐字节还原（§Wasm 内存语义），不要把四字节当十进制相加                                 |
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

`wasm_capabilities` 返回各工具可用性。**全缺失**时仍可做段信息 + 反编译，但离线执行不可用。

---

## 关联

- `references/wasm2c-and-memory-semantics.md`：wasm2c 完整路线、内存语义与地址推演、字节流密钥反推、Itanium 符号解码表、调试注入。
- **加密媒体流 / DRM 场景**：如果这个 wasm 是用来解密 **ts / m3u8 / 视频内容**的（导出函数名像 `decrypt`、
  入参是 PES/NALU、旁边有 `EXT-X-KEY` 或 `GetLicense`），先切到 `../stream-drm-reverse/SKILL.md` ——
  那里有 F 层的四条路线选择（`importObject` 代理直接调用 / wasm2js + DFA / VMP 反汇编成 IR / AI 补环境重放），
  比从本技能一路读内存语义更省时间。
- 完整六阶段工作流（Observe / Capture / Rebuild / Patch / PureExtraction / Port）：`skills/proxycli-playbook/SKILL.md` + `docs/reference/reverse-workflow.md`
- 工具参数与 profile 门控：`skills/proxycli-playbook/references/tool-catalog.md` / `profile-tool-gating.md`
- 失败回退决策树：`skills/proxycli-playbook/references/fallbacks.md`
