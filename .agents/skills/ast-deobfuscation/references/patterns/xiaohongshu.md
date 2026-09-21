# 小红书

当样本属于小红书，或属于同一 OB 家族（obfuscator.io 派生：字符串数组 + 旋转 + 别名链 + 包装字典 + `while/switch` 平坦化）时，使用这份规则。

验证依据：仓库根相对路径 `docs/references/2100076-xhs-4.3.2-ob-deobfuscate.验证报告.md`（从本文件出发为 `../../../../../docs/references/2100076-xhs-4.3.2-ob-deobfuscate.验证报告.md`）；样本 `_verify2100076/fixtures/`（`xhs_64_payload.cooked.js`、`xhs_ds_loader.js`）；复现脚本 `_verify2100076/check_ast.js`（字符串/字典/平坦化命中数）、`check_cff_order.js`（顺序陷阱）、`check_adapter_gaps.js`（适配器覆盖缺口，证据 `evidence.adapter-gaps.json`）。

## 识别信号

内容层（不依赖文件名/hint）：

- ds 脚本以 `function getdss() { return '<13 位数字>'; }` 开头，末尾有超大十六进制字符串 `var __$c = '<hex>'`，再 `glb['<解密键>'](__$c, [...])`。
- bundle 样本没有明文 ob 代码：webpack 模块 `signV2Init` 里是 `String.raw(templateObject_1 || (templateObject_1 = __makeTemplateObject([A, B])))` 后接 `eval(code)`，其中 `A`、`B` 是同一份源码的两个字符串副本（一个已求值转义、一个保留字面 `\xNN`/`\"` 文本，两者长度不同）。ob 源是**字符串**，必须先从 AST 里取 `__makeTemplateObject` 的元素、选**能直接 parse 的那一份**（转义已求值的那份）落盘，另一份直接 parse 会报 Unicode escape 类错误。
- 字符串字面量里混用同形字：拉丁 `I`(U+0049) 与希腊 `Ι`(U+0399)，形如 `'IΙΙ'`、`'ΙII'`、`'IIΙ'`（两个样本各有 5 个不同键、4–6 处 `['…']` 属性访问）。这类键只做属性名/比较值，**不要做 Unicode 归一化**，否则会改变语义。

结构层（AST 命中任一即可确认家族）：

- `var _0xA = [ …184/194 项字符串… ]`。
- `var _0xB = function (a, b) { a = a - 0x0; var _0xC = _0xA[a]; return _0xC; }`（第二参数未使用；朴素查表，无额外解密运算）。
- `(function (arr, checksum) { … while (!![]) { … parseInt(dec(0x9f)) + -parseInt(dec(0x30)) * … arr['push'](arr['shift']()); } }(_0xA, 0x4f5f9))` —— **第二个实参是校验和目标值，不是旋转次数**。实测：载荷样本 `0x4f5f9`(325113) 实际旋转 57 次；ds 样本 `0xbbb67`(768871) 实际旋转 160 次。用第二个数当 shiftCount 会算错；把校验式里的 `dec(…)` 当作常量折叠也会得到一个假值（只影响旋转是否提前结束）。
- 别名链很密：载荷样本 44 条 `_0x… <- _0x…` 别名边（另有 1 条 `_0x… <- arguments`）、从解码器可达的闭包 40 个名字、`dec(0x..)` 形式调用 297 处；ds 样本 53 条边、闭包 50 个名字、335 处。**对解码函数的直接调用为 0**。
- 5 个"字符串键 → 函数"的包装字典（载荷 164 个属性、ds 159 个）：约 6/7 是 `return p0 OP p1` 二元代理（载荷 121、ds 110），其余主要是 `return f(...)` 调用代理（载荷 22、ds 20），另有少量字符串/未使用属性。
- 顶层导出形如 `glb[dec(0x73)] = function (a, b, c) {…}`，同一条语句用 `dec(0x1a) == typeof window ? global : window` 选宿主；该全局键名经解密才可见（载荷样本 `_AUuXfEG27Xa3x`，ds 样本 `_BHjFmfUMEtxhI`），不要假设它一定是 `mnsv2`。

控制流层：

- 恰有 1 处 `while (!![]) { switch (<arr>[<i>++]) { case '0': … } }`，顺序源是 `dec(0x3b)['split']('|')`（载荷 = `3|1|2|0|4|5`）或 `dec(0x92)['split']('|')`（ds = `3|5|0|4|1|2`）。
- 平坦化外层形态有两种：ds 样本直接位于函数体；载荷样本多包一层恒真 `if (dict['…'](dict['…'], dict['…'])) { … } else { … }`（死分支，可先折叠再展平）。

## 流水线建议

顺序不可交换，按此执行：

1. **解包 eval 载荷**：从 `__makeTemplateObject` 取 cooked 字符串落盘；ds 类样本本身就是源码，跳过。
2. **字符串表恢复**（必须早于第 5 步）：跑前导段（数组 + 解码器 + 旋转 IIFE）建最小沙箱 → 展开解码器别名闭包 → 用沙箱求值 `dec(0x..)` 内联。别名要**传递闭包**扩张，不能只看一跳（样本里闭包 40/50 个名字，一跳只有 6/7 条）。
3. **折叠包装字典**：二元代理就地改写为 `a OP b`，调用代理改写为 `f(args…)`。注意样本里 6/34 个调用代理是转发到另一字典（`return D2['k'](p0,…)`），按"args[0] 即被调用者"直接改写只在 `exit` 序遍历先把内层转发折平后才成立；否则要按 `returnArgument.callee` 是否等于形参决定内联 callee 还是取 `args[0]`。
4. **清理死分支/同名包装**：先折叠恒真 `if (…===…)`，再进入展平，否则 CFF 会被埋在分支里。
5. **展平 `while/switch`**：用第 2 步解出的 `'|'` 序列取 case；替换后删除承载顺序的兄弟声明。
6. 结构标准化、`if→switch`（若仍有 opcode 链）、再 parse 校验。

必须知道的两个顺序陷阱：

- **字符串恢复未完成就跑展平 = 静默毁代码**。展平器用 `value.includes('|')` 找顺序字符串，此时兄弟节点里先命中 `.split('|')` 的 `'|'`，取到长度 1 的假序列、重构 0 条语句，`replaceWithMultiple([])` 把整个循环删掉且不报错（见 `check_cff_order.js`）。展平前应要求 `sequenceArray.every(k => caseMap[k] !== undefined)`。
- **旋转 IIFE 必须真的执行**。只跑"数组 + 解码器"就建表，拿到的是未旋转数组，查表结果全是错的（实测 13 个长字符串参数中 11 个被内联成错误值，解码器校验表达式退化为 `NaN`）。

## 当前残留重点

现有 `scripts/patterns/xiaohongshu-wrapper-pass.js` 对本家族的覆盖不足，实测两个样本（`check_adapter_gaps.js`）：

- **前导段定位错位**：适配器写死"`body[1]` 是解码器声明、`body[0..2]` 即全部引导"。ds 样本 `body[1]` 是 `EmptyStatement`，判据不成立 → 解码器调用 0 命中、CFF 原样保留；载荷样本 `body[1]` 是解码器但旋转 IIFE 在 `body[3]`，于是"跳旋转建表"，13 个长字符串参数里 11 个被内联成错误值（如 `dec(0x9f)` 应为 `332372DdcVlf`，实际写入 `pYmTe`），解码器校验表达式退化为 `NaN`。
- **别名闭包只覆盖一跳**：载荷 44 条别名边 / 闭包 40 个名字（一跳仅 6 条），ds 样本 53 条边 / 闭包 50 个名字（一跳仅 7 条）。
- **跑完仍残留**：载荷输出仍有 1 处 `while(!![])` 平坦化、267 处未解的解码器调用、174 处悬空标识符引用；ds 样本 1 处、316 处、209 处。
- **内容特征缺失**：`pipeline-config.js` 的 xiaohongshu 项只有 `hintTokens` + `/xiaohongshu/i`、`/\bxhs\b/i`，真实载荷里这两个词一次都不出现。把文件放到中性路径（`/tmp/neutraldir/sample.js`）时，检测落到 `cn-bidding-ob`/`mps-ob`（并列 3 分）。建议补内容判据：`function getdss()`、`var __$c=`、`__makeTemplateObject` 双元素数组、`['push'](['shift'])` 旋转、`'IΙΙ'` 类同形字键。

展平后仍会留下的结构噪音（非本家族特有，按需处理）：同形字属性名、`['\xNN']` 转义键、`glb` 宿主选择三元、以及少量 `return p0 OP p1` 形态保留但已无调用点的残余字典声明。
