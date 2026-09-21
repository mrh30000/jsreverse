# 零宽不可见字符与字符串编码混淆清洗

## 混淆特征

1. **不可见零宽字符隐写 (Invisible Unicode Obfuscation)**：
   混淆器利用零宽字符（如 `\u200B` 零宽空格、`\u200C` 零宽非连接符、`\u200D` 零宽连接符、`\u2060` 词连接符、`\uFEFF` 零宽非换行空格）将真实 Payload 编码成二进制位（例如 0 和 1），嵌入在变量名、注释或字符串中，绕过基于文本的静态检测与正则过滤。
2. **String.fromCharCode 动态拼接**：
   使用长序列的 `String.fromCharCode(104, 101, 108, 108, 111)` 隐藏敏感 API、密钥或函数调用。
3. **atob / Buffer 静态 Base64 编码**：
   通过 `atob("aHR0cHM6Ly8...")` 等隐藏请求 URL 或加密算法配置。

## 处理策略

1. **零宽字符解码与清理**：
   - 提取代码中的连续零宽字符序列。
   - 按照 5 种特征字符映射到二进制位（`\u200B` -> `0`，`\u200C` -> `1`，`\u200D` -> `00`，`\u2060` -> `01`，`\uFEFF` -> `10`）。
   - 将满 8 位的二进制还原为明文字符串并替换原始隐写段。
   - 剔除插入在标识符和关键字中间干扰分词的孤立零宽字符。
2. **AST 常量调用折叠**：
   - 遍历 AST `CallExpression`。
   - 识别 `String.fromCharCode(...)`，若参数均为数字字面量，直接求值并替换为 `StringLiteral`。
   - 识别 `atob("...")`，若参数为静态字符串且为合法 Base64，直接替换为明文字符串字面量。

## 脚本入口

- `scripts/strip-invisible-unicode.js <input.js> <output.js>`
- 支持模块导出：

  ```javascript
  const {
    stripInvisibleUnicode,
    detectInvisibleUnicode,
  } = require('./strip-invisible-unicode');
  ```
