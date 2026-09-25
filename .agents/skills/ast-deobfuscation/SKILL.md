---
name: ast-deobfuscation
description: 使用 Babel AST 对 JavaScript 做分层、可回退的定向反混淆。适用于 `_0x` 标识符、字符串表、自执行解码包装、`["$_x"].concat(fn)` + `shift()` 形式的别名族、dispatcher 对象、虚假常量分支、`while/for + switch` 控制流平坦化、`if (literal === opcode)` 分发链、OB 混淆变体（数组元素掺非字符串、去自执行、打乱 base64 码表、解密函数多重赋值分身、字典混淆、外衣函数嵌套）、多入口多层 switch，以及 Sojson（v4/v5/v6 定向解密与自毁反调试清理）、JSFuck 纯算符号递归折叠等场景。需要按 obfuscator.io 默认输出的「函数调用还原 → 对象调用还原 → 分支流程判断 → 平坦化控制流」四步链手工推进（含同一配置自造样本、拿原码做端到端 diff 的 oracle 法），或需要通过 browsercli 从页面定位、导出或运行时验证混淆脚本，以及用户明确提到 decodeObfuscator、sojson、jsfuck、reese84、顶象、极验（v3 的 `$_` 前缀变量族与 v4 的 guarded-switch）、同花顺、网易易盾、小红书、BOSS 直聘/zp_stoken、OB 变种或类似站点适配时也使用本 skill。JSVMP 场景下同样适用于：反汇编产物（IR）的常量折叠 / 死 case 消除 / 短路还原 / CFG 回译成 JS、指令集与 opcode 位域还原、助记符表对齐、插桩日志常量取证。
---

# AST 反混淆

优先使用分层入口，而不是继续把站点特有逻辑堆进通用脚本。

## 工作流

1. 输入来自浏览器页面时，先按 `references/browsercli-tools.md` 定位并导出目标脚本；已有本地 JS 文件时跳过此步。
2. 运行 `scripts/detect-patterns.js <input.js> [hint]` 做模式检测。
3. 只读取命中的站点或混淆家族规则文档。
4. 运行 `scripts/run-pipeline.js <input.js> <output-dir> [hint]` 执行选中的流水线。
5. 对照参考产物、BrowserCLI 运行时证据或原始混淆症状，判断是否还需要新增专用适配脚本。

## 设计规则

- 通用脚本只保留低风险、可复用的改写，例如结构标准化、虚假分支清理、dispatcher 内联、控制流拍平和 `if -> switch`。
- 一旦某个模式明显是站点特有的，就同时补齐四部分：规则文档、检测器命中项、专用适配脚本、流水线配置项。
- 对于高开销步骤，优先按家族跳过或重排，不要强行要求所有样本走同一套顺序。像 `reese84` 这种大样本，如果太晚执行 `inline-literals`，很容易卡住。
- 专用适配脚本应当保持窄而准。如果某条规则没有在多个无关样本中复用，不要急着回灌到通用脚本。
- 结构性改写后要重新 parse，并保证每一阶段都可以独立运行和排查。

## 入口脚本

- `scripts/deobfuscate.js`
  自包含一体化反混淆脚本。整合了通用解包（Packer / AAEncode / URLEncode）、十六进制/Unicode 字符串解码、字符串数组沙箱求值内联、AST 常量折叠与逻辑化简、虚假分支消除以及 while-switch 控制流拍平。支持单文件直接 CLI 执行（`node scripts/deobfuscate.js <input.js> [output.js]`）或模块导入。
- `scripts/deobfuscate-jsfuck.js`
  JSFuck 纯算与深层符号表达式自动递归折叠（蒸馏自 v_jstools）。将 Unary / Binary / Member 符号树在受控环境中求值并就地还原为 String/Number/Boolean 字面量。
- `scripts/deobfuscate-sojson.js`
  Sojson v4/v5/v6 混淆专项还原与反调试自毁防护清理（蒸馏自 v_jstools）。抽取大数组与移位解密函数并在安全沙箱中求值，批量内联调用点，彻底剔除注入的定时器 debugger 与防格式化检测死循环。
- `scripts/detect-patterns.js`
  根据文件路径、可选 hint 和源码症状判断最可能命中的站点或混淆家族。
- `scripts/run-pipeline.js`
  把样本复制到测试目录，执行选中的步骤，记录耗时并输出流水线报告。
- `scripts/collect-residue-metrics.js`
  统计仍未解开的症状，例如 `split('|')`、直接 `loop/switch` 平坦化、opcode `if` 链、dispatcher wrapper 和 `_0x` 标识符。
- `scripts/decode-obfuscator-pass.js`
  安全移植 decodeObfuscator 的字面量、常量、循环块和对象预处理；不执行输入源码，也不启用基于文本特征的删代码逻辑。
- `scripts/strip-invisible-unicode.js`
  零宽不可见字符（Zero-width Unicode）隐写解码、清理，**双向控制字符（Bidi Control，`U+202E` 一族）检测与清洗**，
  以及 `String.fromCharCode` / `atob` 常量表达式折叠。支持 `--selftest`（19 项）。
- `scripts/detect-obfuscator-types.js`
  综合混淆特征探测器，识别 JavaScript-Obfuscator、JSFuck、Packer、AAEncode、控制流平坦化、VM 保护及站点防护类型。
- `scripts/prune-opaque-predicates.js`
  消除数学与代数不透明谓词（数值比较、`x * 0 === 0`、`x - x === 0` 等恒等式），清理不可达死代码分支。
- `scripts/sandbox-evaluator.js`
  受控隔离的 Node.js `vm` 沙箱求值基础设施，支持前置 Prelude 语句自动执行与最小浏览器环境 Mock。
- `scripts/fold-wrappers.js`
  识别并就地折叠局部 Dispatcher 对象、二元/逻辑运算代理函数及多层嵌套包装器。
- `scripts/babelpack-enhancer-pass.js`
  BabelPack 深度增强流水线，包含 `keyToLiteral`、声明拆分、分散属性归并、反调试代码清理与 `callExpressToLiteral` 沙箱动态求值。
- `scripts/unpack-webcrack.js`
  集成 Webcrack 与 AST 兜底方案，对 Webpack / Browserify 等巨型 Bundle 进行自动化模块拆解、切分与落盘。
- `scripts/deobfuscate-vm-protection.js`
  虚拟机保护（VM Protection）结构识别、指令计数、组件提取与逆向分析报告生成。
- `scripts/deobfuscate-jsvmp.js`
  JSVMP 虚拟机专项反混淆分析，涵盖字节码数组、操作数栈、寄存器环境与 Dispatch 循环逆向。
- `scripts/analyze-jsvmp-vm.js`
  纯静态解剖 JSVMP 虚拟机骨架，提取 while-switch / index-dispatch 分派器结构、字节码数组来源、指令表空洞与 Opcode 语义分类，支持 `--json` 输出。
- `scripts/jsvmp-mnemonic-table.js`
  **跨版本稳定的助记符表**：把指令数组里每条指令的变量名归一化成 `#`，得到与"序号/变量名无关"的不变量。
  腾讯系 VM 的指令数组**每次请求都重排**，按序号识别指令必然失效，必须靠这张表。
  三态分开统计（`hole` 空槽 / `empty` 空体 / `instruction`），空洞与空体混算会让控制流整体错位。
  `--diff a.json b.json` 比对两次抓取是否同一指令集。与 `analyze-jsvmp-vm.js` 的分工见 `references/jsvmp-bytecode-and-decompiler.md` §2。
- `scripts/jsvmp-instrument.js`  **JSVMP 三层插桩器**（`call/apply` → 运算符 → 赋值），由内向外包装，插桩**只读不调用**
  （绝不二次调用被插桩函数，避免 `k++`/`pc` 之类有状态变量被多推进）。
  逻辑/一元/自增只记结果、不捕获操作数（保住短路语义、避免 `typeof` 未声明标识符抛错）。
  `--selftest` 自带合成 VM 夹具，覆盖**实跑对拍**、**节点数只增不减**、**重复插桩守卫**
  等 19 项断言。用法与判据见 `references/jsvmp-dynamic-instrumentation.md` §3。
- `scripts/crypto-signature-id.js`
  **从「一组定值」反查标准算法并逐值列出魔改 diff**（零依赖）：命中 MD5/SHA-1/SHA-256/SM3/SM4-FK 的
  初始向量，逐位置给出 `实测 - 标准` 差值；MD5 与 SHA-1 共享前 4 个 IV 的**歧义会被显式标注**。
  `--file <日志>` 直接抽日志里所有 ≥4 元素的数组批量识别；`--padding <字节数>` 给出标准
  MD5/SHA-1 padding 的**预期值**（补几个 0、补完总长），用于回日志核对；
  `--selftest` 含断言若干（含「随机数组不得误报」「按错误公式补完必不整除 64」
  与「真哈希 IV 不得被判成 limb 大整数」三组**反向断言**；项数以实跑输出为准）。
  见 `references/jsvmp-dynamic-instrumentation.md` §6/§7。
- `scripts/jsvmp-ir-optimize.js`
  **JSVMP 反汇编产物的中间代码优化与 CFG 回译**（零依赖，即"反汇编之后"那一步）。
  `optimize` 全链**实测顺序**为 `prune-cases`（死 case 消除，**必须最先**：删 case 会改地址与 CFG）
  → `fold-const`（常量虚假指令表折叠）→ `restore-logic`（`&&`/`||` 还原）与
  `simplify-cfg`（常量传播 / 恒真假分支 / 不可达 / 单前驱单后继合并）**交替跑两趟**（不动点，
  第二趟才有新短路形态浮现）→ `emit-js`（**flat 保底** + **structured 可读**两个发射器，
  **两者结果必须一致**）；
  另含 `cfg` 导出 Graphviz。`--selftest` 用随机程序夹具做**解释器 / flat / structured 三方
  逐字节对拍**，并对每个优化步骤设**"真的做了优化"的下界断言**（否则"什么都没做"也会全绿）。
  见 `references/jsvmp-ir-and-optimization.md`（该阶段唯一权威源）；
  **pass 的执行顺序与"为什么这么排"以该文件 §2 为准**（`prune-cases` 必须最先、`restore-logic`↔`simplify-cfg` 要跑两趟）。
- `scripts/compare-with-reference.js`
  将最新流水线输出与 `decode.js` 对比，汇总剩余差距。

## 参考文档

- 从浏览器页面采集源码、补抓 Worker 脚本或验证运行时行为时，读 `references/browsercli-tools.md`，并使用 `browsercli` skill 获取完整命令契约。
- 新增或调整适配器时，先读 `references/pattern-layering.md`。
- **要用第三方「一键还原」框架（如 `sml2h3/ast_tools`）、或想看清「反混淆框架」的形态契约时，读 `references/ast-toolchain-frameworks.md`**：
  框架形态（`main.js` → `common_fix.fix` → `pro/demo1_fix.js` 的 **15 个各自独立的 pass + 一个主函数集中声明执行顺序**）、
  **判据「框架的价值在『函数独立 + 顺序显式』」**、与本仓 `pattern-layering.md` 分层管线的分工（内层纪律 vs 外层纪律）、
  使用前提（`npm install iconv-lite @babel/core`、输出默认 `demos/demo1/output.js`）与
  **验收标准（「控制流被还原 + 字符串被解出、可读性显著上升」，不是「100% 去混淆」）**。
  ⚠️ 源文**没有贴出那 15 个函数中的任何一个**，该文只写框架形态与选型判据；具体 pass 读 `references/decode-obfuscator.md` 与 `references/obfuscator-io-four-step-pipeline.md`。
- 任何逻辑想放进通用脚本前，先读 `references/safe-rewrite-rules.md`。
- 处理字符串表、解码 stub、最小运行时求值时，读 `references/string-array-and-minimal-eval.md`；
  **极验系的「别名族 + 数组字面量」模板（真实形态是一条 `var` 带 3 个 declarator + 紧跟一条 `shift()`）
  必须整组先处理，否则字符串表永远还原不出来**，配方与两个坑（哨兵变量被误删、`shift()` 残留）见该文件「别名族」一节。
- **拿到的是 obfuscator.io / javascript-obfuscator 的默认输出、且想按「字符串还原 → 字典对象 → 假分支 → 平坦化」
  的顺序手工推进时，读 `references/obfuscator-io-four-step-pipeline.md`**：
  该文给**四步的顺序依赖表**（每步漏做的症状：S2 漏做 ⇒ `test` 两侧不是字面量，S3 漏做 ⇒ 顺序串定位被干扰）、
  S1「函数名不能写死」的顶层三节点结构、S2 的**5 类返回值替换表**、
  S3 **手写实现（Python / estraverse）的三个静默崩溃点**（`alternate === null`、父节点没有 `body`、`==` 当成 `===`），
  以及**最高性价比的一招：用同一份配置自己生成混淆样本、拿原码做端到端 diff**（原码在手 ⇒ 失败必然是 pass 错）。
  ⚠️ 判据只对**同一 shell** 有迁移性：先核对顶层结构（`_0x` 名 + 大数组 IIFE + 取值函数），不要按站点名套用。
- **用正则 / 文本把 `_getName(0x…)` 直接替换成字面量、结果「能 parse、脚本不报错但字符串全错」时，
  读 `references/static-index-replacement-pitfalls.md`**：这是「字符串表**旋转未还原**」的静默失败模式 ——
  三个未运行即可判的指纹（自检算式里出现 `parseInt("非数字串")`、`$("选择器")` 丢了 `#`、`type: "2774492jOaOCZ"` 这类常量位变成乱码）、
  替换脚本的三处根因（没做旋转 / 变量遮蔽 / 正则分不清「定义」与「调用」）、三条正确路线，以及「能 parse ≠ 对」的验收判据。
- 需要理解 decodeObfuscator 兼容能力和 `eval` 安全边界时，读 `references/decode-obfuscator.md`。
- 深入 BabelPack AST 变换与动态求值时，读 `references/babelpack-enhancer.md`。
- 零宽字符与特殊编码清洗时，读 `references/invisible-unicode.md`。
- **编辑器里「括号明明没配对、代码却不报错」、或同一段代码换编辑器就正常** ⇒ 先怀疑**双向控制字符**
  （`U+202A–202E` / `U+2066–2069`）；这类混淆**不改语义、只改显示**，照着「看起来的样子」写 pass
  会静默改坏程序。处置：**先清洗再格式化再做静态分析**，判据与码位表见 `references/invisible-unicode.md`。
- 混淆家族与加固手段全面特征检测时，读 `references/obfuscation-detector.md`。
- **检测结论是「仅 minify」（只短名化标识符，无控制流扁平化 / 字符串数组 / 不透明谓词）时，读 `references/rename-sequence-replay.md`**：走「改名变换序列回放」（`[遍历序号, 旧名, 新名]` 三元组 + Babel 作用域安全重命名，零结构改动、行为零变化），**不要**去跑控制流还原管线。
- 处理数学、代数恒等式与死分支时，读 `references/opaque-predicates.md`。
- 使用安全隔离沙箱求值前置环境时，读 `references/sandbox-evaluator.md`。
- 处理对象 Dispatcher 与复杂代理函数折叠时，读 `references/wrapper-folder.md`。
- 进行 Webpack/Browserify 模块打包器**拆包落盘与 unminify（目标是读懂代码）** 时，读 `references/webcrack-bundle-unpack.md`；
  若目标是**把目标模块抠出来在 node 里直接调用**，用 `../webpack-bundle-extraction/SKILL.md`（该文件开头有两者分工的唯一判据）。
- 分析商业 VM 保护与解释循环时，读 `references/vm-protection.md`。
- 深度逆向与还原 JSVMP 虚拟机时，读 `references/jsvmp-deobfuscation.md`。
- **要把 JSVMP 字节码"翻译回可读 JS"（而不是插桩硬看日志）时，读 `references/jsvmp-bytecode-and-decompiler.md`**：
  助记符表的必要性（腾讯指令数组每次重排，序号无意义）、VM 的两种最难理解的设计（变量 BOX 引用传递、
  成员引用是数组）、`used` 标记区分中间产物与完整语句、控制流与函数还原、以及"换一个 VM 要改什么"的迁移成本表。
  **判据：目标是"读懂"才写反编译器；目标是"跑出结果"就走补环境，成本低一个数量级。**
- **要把 JSVMP **插桩**（拿常量 / 一个公式）时，读 `references/jsvmp-dynamic-instrumentation.md`**（该路线唯一权威源）：
  三层插桩的顺序硬约束（call/apply → 运算符 → 赋值）、四种插桩实现选型、AST 自动插桩的两个坑
  （动态 `k` 值先改后还原、插桩代码二次调用导致分支错位）、日志采集与减量（固定密文 / hook 随机源 / 条件断点）、
  日志倒推法（先认长度、找拼接点、识别定值数组）、**标准算法识别四层证据**（长度 / 初始寄存器特征值 /
  轮函数结构 / padding 反推）、**魔改常量取证（标准 vs 实测逐值 diff）**、指纹类 VM 的噪声与字段边界陷阱。
  **判据：插桩解决"值是什么"，反编译器解决"结构是什么"。**
- **要构建 CFG、处理异常表、或走旁路 AST 时，读 `references/jsvmp-cfg-and-symbolic-paths.md`**：
  三条反编译路线选型（纯静态生成器 / 解释器改造为生成器 / 旁路 AST SDK）、
  CFG 构建四步（Leader → 基本块 → 边 → Graphviz）、**栈式 VM 指令语义表模板**（按栈效果记，
  含 `IrJfalse`/`IrJeq` 这类"只在一个分支弹栈"的高危指令）、异常表 `stateFlag` 1/2/3 与调用栈帧 8 项、
  PC 状态机与 **CFG bound 合并**（多入口 = 有控制流，不可合并）、寄存器式 VM 的差异、AI 辅助的分而治之、vmp 套 vmp。
  **判据：CFG 是插桩的地图。插桩点找不到时，先出图。**
- **已有的 IR / 反汇编产物乱得读不下去，或原文作者说"下一步要做常量折叠、常量传播、CFG 转 JS"时，
  读 `references/jsvmp-ir-and-optimization.md`**（该阶段唯一权威源）：
  五个 pass 的顺序与各自"为什么安全"（`fold-const` 的常量表判据与 `null` vs `0` 之争、
  `prune-cases` 靠**断点全覆盖探测**拿死 case 清单、`restore-logic` 的**短路还原语义代价**——
  被合并的第二个条件块**不得含副作用**、`simplify-cfg` 的"改完实跑结果一致"准出）、
  两套真实 opcode 编码（12 位家族 + 独立 opstr 表 / 3 字节家族 + 内联字符串表 + 两种异或解码变体）、
  腾讯 chaos 的**随机分段抗脱壳**（case 数 ≠ 语义 opcode 数不是 bug）、
  **"一串神秘整数"先判 bignum limb 再谈算法**、以及反汇编常量必须做**单射性机械校验**
  （实测某 IR 的 base64 字母表第 5 位错成 `D`，照抄会静默算错 sign）。
- 运用 LLM 大模型辅助代码清洗、语义命名推导、VM 结构分析与思维链去虚拟化时，读 `references/llm-deobfuscation-prompts.md`。
- 处理控制流平坦化、opcode 分发器和 VM 类 handler 时，读 `references/control-flow-and-opcode-patterns.md`；开始把状态机归约回 if/while/break/continue 前，先读 `references/control-flow-reduction-rules.md` 逐条核对前提。
- **CFF 还原前先读 `references/mba-and-dispatcher-reduction.md` §3**：`while+switch` 的还原依赖「字符串数组已还原」这一前置，顺序错了不报错、直接清空函数体。多层位切片 dispatcher（`Ci = 31 & li; mi = 31 & fi; ...`）与 MBA 混合布尔算术表达式的归约配方也在该文档。
- **在线反混淆网站只解开一部分时，读 `references/ob-variant-taxonomy.md`**：按「数组元素掺非字符串 / 去掉自执行 / 打乱 base64 码表 / 格式化检查语句 / 解密函数多重赋值分身 / 字典混淆（value 可为函数）/ 外衣函数嵌套」七类变体对号入座；含「导出目标函数 + AST 主动调用」的通用配方，可在完全不还原算法的前提下拿到结果。**B19 增补两节**：§八「伪 OB」——有大数组但**既没有数组移位、也没有解密函数**时（三条判据），直接按下标取值即可，**不要对浅壳走"主动调用"路线**；§九「可读产物 ≠ 可替换产物」——降层/格式化产物**只能用于阅读**，替换回浏览器必须用与原始字节同形态的版本（数美 `isJsFormat`、阿里 227 降层实测）。
- **`switch` 嵌套多层、起始 index 由调用传参决定时，读 `references/multi-entry-switch-reduction.md`**：三步还原法（收集 index → 最内层插探针 → 拖进 for 循环取映射），以及两个致命坑（case index 藏在调用点、还原后变量污染必须按入口拆回多个函数）。
- 处理逗号表达式、IIFE、语句提升与三元/短路语法展开时，读 `references/sequence-normalization.md`。
- 处理纯符号编码与表达式求值还原时，读 `references/jsfuck-reduction.md`。
- 检测器命中后，只读取对应的一份站点规则文档：
  - `references/patterns/sojson.md`（Sojson v4/v5/v6 架构特征、大数组提取、定时器 debugger 与自毁防篡改代码清理）
  - `references/patterns/reese84.md`
  - `references/patterns/dingxiang.md`
  - `references/patterns/geetest.md`（含「别名归一 → 字符串表 → 控制流」的**顺序硬约束**、
    可选的 `deobfuscate.io → UglifyJS → DevTools Override` 外部工具链及其代价与处置；
    **B20 新增 v3 顺序恒真状态机**：`for (; S !== <下标表达式>;) switch(S){case <下标表达式>: …; S = <下标表达式>; break;}`
    —— 状态值由 `$_DD()` / `$_DN()` 这类表函数给出且**同一数值会落在多个下标上**，
    因此"下一个执行哪个 case"必须**按值比较**，按源码顺序展开会静默错序；
    两种声明位置（for-init / 前一条语句）都要认。
    可执行件 `scripts/patterns/geetest3-state-machine-pass.js`（`--table` 给状态值表 / `--check` 顺序断言 /
    `--drop-unreachable` / `--selftest` 32 项；**退出码 3 = 状态表解析不全且不产出文件**；
    **状态变量逃逸出循环时会补终态赋值，无法保持语义时直接跳过并报 `state-var-escapes-loop`**），
    与 `geetest-guarded-pass.js` 的分工见该文件）
  - `references/patterns/tonghuashun.md`
  - `references/patterns/yidun.md`
  - `references/patterns/xiaohongshu.md`
  - `references/patterns/zhipin.md`
  - `references/patterns/cn-bidding-ob.md`
  - `references/patterns/mps-ob.md`

## 校验

- 每个新增或改过的 JavaScript 辅助脚本，在接入流水线前都要至少过一次 `node --check` 或等价的加载校验。
- 修改 skill 后，按 `skill-creator` 技能的校验流程做一次结构校验
  （frontmatter 合法、`name` 与目录名一致、脚本可加载、引用可达）。
  **不要写死某个机器的绝对路径**：`skill-creator` 的安装位置随环境变化，
  请从当前环境的 skill 目录动态解析，或直接复用本仓库 `docs/references/verified.md` 第八节的校验脚本片段。
- 测试案例时，把中间产物、检测结果、对比结果和流水线耗时都保留在案例目录里，方便定位慢步骤和失败步骤。
