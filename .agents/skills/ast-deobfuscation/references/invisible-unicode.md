# 零宽不可见字符、双向控制字符与字符串编码混淆清洗

## 混淆特征

1. **不可见零宽字符隐写 (Invisible Unicode Obfuscation)**：
   混淆器利用零宽字符（如 `\u200B` 零宽空格、`\u200C` 零宽非连接符、`\u200D` 零宽连接符、`\u2060` 词连接符、`\uFEFF` 零宽非换行空格）将真实 Payload 编码成二进制位（例如 0 和 1），嵌入在变量名、注释或字符串中，绕过基于文本的静态检测与正则过滤。
2. **String.fromCharCode 动态拼接**：
   使用长序列的 `String.fromCharCode(104, 101, 108, 108, 111)` 隐藏敏感 API、密钥或函数调用。
3. **atob / Buffer 静态 Base64 编码**：
   通过 `atob("aHR0cHM6Ly8...")` 等隐藏请求 URL 或加密算法配置。

## 双向控制字符：不是「藏 payload」，是「骗你的眼睛」

与零宽字符**完全不同的混淆维度**。零宽字符用来藏数据；双向控制字符（Bidi Control）
用来**篡改编辑器里的显示顺序**——**源码能正常解析、也能正常执行，但你在编辑器里看到的结构
和真实结构不一致**，于是你会「按看起来的样子」写出错误的 AST 改写规则。

| 码位 | 名称 | 效果 |
| --- | --- | --- |
| `U+202E` | RLO 从右到左覆盖 | **最常用**：把它之后的整段文本**反转显示** |
| `U+202D` / `U+202B` / `U+202A` | LRO / RLE / LRE | 覆盖 / 嵌入方向 |
| `U+202C` | PDF 弹出方向格式 | 结束上面这些状态 |
| `U+2066`–`U+2069` | LRI / RLI / FSI / PDI | 隔离（较新的写法） |
| `U+200E` / `U+200F` / `U+061C` | LRM / RLM / ALM | 标记方向 |

### 识别信号（三条，命中任意一条就去查码位）

1. **把光标放在一个左括号上，右边高亮的还是左括号**；函数体看起来**没有闭合**，
   但代码**不报错、能跑**。同一段代码**复制出来换编辑器就正常**。
2. 编辑器里行号跳变、光标左右移动方向「反了」。
3. 双击选中一个标识符，选中的范围**与视觉不符**。

### 定位

```bash
grep -nP '[\x{202A}-\x{202E}\x{2066}-\x{2069}\x{200E}\x{200F}\x{061C}]' target.js
# 或看原始字节：RLO = e2 80 ae，RLE = e2 80 ab，PDI = e2 81 a9
xxd target.js | grep -n "e280ae\|e281a" | head
```

命令不可用时，用 `detectBidiControls(code)` 从脚本里查（返回码位与计数）。

### 处置与硬约束

- **先清洗，再格式化，再做静态分析**。**绝不要在原始视图上读结构**——
  你会把「看起来的括号配对」当成真的配对，然后写出一个「能跑、但语义被改掉」的 pass。
- ⚠️ **清洗会改变字符串字面量的值**：位于字符串**内部**的双向控制字符是载荷的一部分。
  所以正确做法是「**删除 + 显式报告数量与码位**」，而不是静默删除
  （见 `scripts/strip-invisible-unicode.js` 的 `bidiRemoved` / `bidiDetails` 返回值）。
- 与零宽字符的**顺序**：先做零宽解码（可能还原出新的字符），**再**剥双向控制字符，最后才 parse。
- ECMAScript 把 `U+200C/U+200D/U+FEFF` 视为合法的标识符部件，而
  `U+202A–U+202E` / `U+2066–U+2069` **只在注释与字符串里合法**。
  ⇒ 出现在注释之外的必然让 **parse 直接失败**，出现在其中的则「能解析但显示是错的」——
  两种都得由清洗兜住（脚本自检里就有这一组对照）。

## 处理策略

1. **零宽字符解码与清理**：
   - 提取代码中的连续零宽字符序列。
   - 按照 5 种特征字符映射到二进制位（`\u200B` -> `0`，`\u200C` -> `1`，`\u200D` -> `00`，`\u2060` -> `01`，`\uFEFF` -> `10`）。
   - 将满 8 位的二进制还原为明文字符串并替换原始隐写段。
   - 剔除插入在标识符和关键字中间干扰分词的孤立零宽字符。
2. **双向控制字符清理**：按上表整类删除，并**报告**删除数量与码位明细。
3. **AST 常量调用折叠**：
   - 遍历 AST `CallExpression`。
   - 识别 `String.fromCharCode(...)`，若参数均为数字字面量，直接求值并替换为 `StringLiteral`。
   - 识别 `atob("...")`，若参数为静态字符串且为合法 Base64，直接替换为明文字符串字面量。

## 脚本入口

- `node scripts/strip-invisible-unicode.js <input.js> <output.js>`
- `node scripts/strip-invisible-unicode.js --selftest`（19 项断言：零宽映射、双向字符检出/清洗、
  「注释外双向字符导致 parse 失败」的对照组、幂等性）
- 支持模块导出：

  ```javascript
  const {
    stripInvisibleUnicode,        // → {success, code, bidiRemoved, bidiDetails, ...}
    detectInvisibleUnicode,
    decodeInvisibleUnicode,
    detectBidiControls,           // → [{char, codePoint, name, count}]
    stripBidiControls,
  } = require('./strip-invisible-unicode');
  ```
