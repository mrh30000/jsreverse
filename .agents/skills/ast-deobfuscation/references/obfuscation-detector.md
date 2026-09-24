# 通用混淆器与保护特征检测器

## 目标与作用

在执行针对性 AST 反混淆流水线之前，准确检测目标脚本中存在的多种复合混淆技术与加固家族，输出多标签特征集合，指导流水线编排工具选择针对性的 pass 或跳过无关 pass。

## 检测特征矩阵

1. **混淆工具家族**：
   - `javascript-obfuscator`：`_0x` 标识符、大数组定义与自执行位移函数。
   - `jsfuck`：代码仅由 `[]()+!` 六种字符组成。
   - `packer`：Dean Edwards 的 `eval(function(p,a,c,k,e,r)...)`。
   - `aaencode`：包含表情符号字符集 `(ﾟДﾟ) ['_']`、`o゜)` 等。
   - `urlencoded`：高密度 `%xx` URI 转义字符。
2. **混淆技术手段**：
   - `invisible-unicode`：零宽空格及隐藏 Unicode 编码。
   - `control-flow-flattening`：`while` 循环嵌套 `switch` 状态机。
   - `opaque-predicates`：恒真/恒假条件与数学/位运算不透明谓词。
   - `string-array-rotation`：大数组 IIFE 自执行洗牌函数（push/shift 循环）。
   - `hex-encoding`：大密度 `\x..` 十六进制字符串字面量。
   - `base64-encoding`：静态内联 base64 字符串结合 `atob`/自定义解码器。
   - `vm-protection`：包含字节码数组、程序计数器（pc）、栈操作（push/pop）及虚拟机分发解释循环。
   - `sequential-shortcircuit-chain`：**顺序表达式伪装** —— 整段逻辑写成一条短路链，
     反复出现 `&& ... && 0 || ...`（先执行副作用、再故意变 falsy 触发下一段）。
   - `webpack`：包含 `__webpack_require__` 或 `webpackJsonp` 打包结构。
3. **站点/商业防护产品**：
   - `reese84`, `dingxiang`, `geetest`, `tonghuashun`, `yidun`, `xiaohongshu`, `zhipin`, `ob-variant`, `jsdun`。

## 脚本入口

- `scripts/detect-obfuscator-types.js <input.js> [output.json]`
- 支持 CLI 命令与模块导出：

  ```javascript
  const {detectObfuscationTypes} = require('./detect-obfuscator-types');
  const types = detectObfuscationTypes(code);
  ```

## 命中之后读什么（分流表）

检测的终点不是"打上标签"，而是"决定下一步读哪份文档"。按下表分流，不要全部通读：

| 命中 | 说明 | 去读 |
| --- | --- | --- |
| `ob-variant`（`_0x` 命名 / 大数组 / 解密函数） | 是标准 OB，但在线站点只解开一部分 | `references/ob-variant-taxonomy.md`（变体分类 + 主动调用配方） |
| `javascript-obfuscator` + 结构干净 | 标准 OB，通用 pass 够用 | `scripts/decode-obfuscator-pass.js`；安全边界见 `references/decode-obfuscator.md` |
| `javascript-obfuscator` + **要按「字符串 → 字典 → 假分支 → 平坦化」手工分步推进 / 手写 pass** | 教学链视角（顺序依赖、5 类返回值、手写崩溃点、自造样本 oracle） | `references/obfuscator-io-four-step-pipeline.md` |
| `webpack` / `browserify` | 是打包，不是混淆 | `references/webcrack-bundle-unpack.md` |
| `control-flow-flattening` | 单层 `while+switch` 平坦化 | `references/control-flow-and-opcode-patterns.md` |
| `control-flow-flattening` + **switch 嵌套多层、起始 index 由调用传参** | 多入口多层 switch，**不是**单层 CFF | `references/multi-entry-switch-reduction.md`（先读，别直接 `flatten`） |
| `vm-protection` / `jsvmp` | VM 保护 | `references/vm-protection.md` / `references/jsvmp-deobfuscation.md` |
| `jsdun`（JS DUN PROTECT，虚拟方法表 `X.$`） | 国产 JSVMP 加固壳；**强度靠膨胀而非精巧**，13000 行级字节码 | `references/control-flow-and-opcode-patterns.md`（§虚拟方法表与顺序表达式伪装：先解析 opcode 映射，别直接啃字节码） |
| `sequential-shortcircuit-chain` | 顺序副作用伪装成短路链 | 同上 §顺序表达式伪装（**禁止按布尔语义化简**） |
| 站点标签（`reese84`/`dingxiang`/…） | 有专用适配 | `references/patterns/<site>.md`，只读命中的那一份 |

> 优先级提醒：**先判家族、再选文档**。把 OB 变体当成单层 CFF 去 `flatten`，
> 或者把多入口 switch 当成 OB 去跑 decodeObfuscator，都会产出"没报错但结果不可用"的输出。
