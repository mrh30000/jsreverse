/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');

const INVISIBLE_CHARS = ['\u200B', '\u200C', '\u200D', '\u2060', '\uFEFF'];

// \u7F16\u7801\u6620\u5C04\u89C1 references/invisible-unicode.md\uFF1A\u524D 2 \u4E2A\u5B57\u7B26\u4E3A\u5355\u6BD4\u7279\uFF0C
// \u540E 3 \u4E2A\u4E3A\u53CC\u6BD4\u7279\u524D\u7F00\u7801\uFF0C\u6309 8 \u4F4D\u4E00\u7EC4\u8FD8\u539F\u5B57\u8282\u3002
// \u6CE8\u610F\uFF1A\u8BE5\u6620\u5C04\u975E\u524D\u7F00\u65E0\u5173\uFF08'\u200D'\u2192'00' \u4E0E\u4E24\u4E2A '\u200B'\u2192'0' \u51B2\u7A81\uFF09\uFF0C
// \u4EC5\u5BF9\u4F7F\u7528\u6B64\u7EA6\u5B9A\u7684\u6837\u672C\u53EF\u5F80\u8FD4\uFF1B\u6DF7\u7528\u4E0D\u540C\u7F16\u7801\u5668\u7684\u6837\u672C\u9700\u6309\u5B9E\u9645\u7F16\u7801\u5668\u8C03\u6574\u3002
const CHAR_TO_BIT = {
  '\u200B': '0',
  '\u200C': '1',
  '\u200D': '00',
  '\u2060': '01',
  '\uFEFF': '10',
};

function detectInvisibleUnicode(code) {
  return INVISIBLE_CHARS.some(char => code.includes(char));
}

function decodeInvisibleUnicode(code) {
  const invisiblePattern = /[\u200B\u200C\u200D\u2060\uFEFF]+/g;

  // 单次 replace 直接作用于原始 code：避免「match 取自 code、替换作用在已
  // 变更的 decoded」导致的位置错乱。长度不足 8 或非 8 整数倍的连续串无法
  // 按当前映射还原，视为孤立零宽字符直接剔除。
  return code.replace(invisiblePattern, match => {
    let binary = '';
    for (const char of match) {
      binary += CHAR_TO_BIT[char] || '';
    }

    if (binary.length < 8 || binary.length % 8 !== 0) {
      return '';
    }

    let text = '';
    for (let i = 0; i < binary.length; i += 8) {
      const byte = binary.slice(i, i + 8);
      text += String.fromCharCode(parseInt(byte, 2));
    }
    return text;
  });
}

function decodeStringCalls(ast) {
  let changed = false;

  traverse(ast, {
    CallExpression(pathNode) {
      const callee = pathNode.node.callee;

      // 1. String.fromCharCode(...)
      if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.object, {name: 'String'}) &&
        t.isIdentifier(callee.property, {name: 'fromCharCode'})
      ) {
        const allNumbers = pathNode.node.arguments.every(arg =>
          t.isNumericLiteral(arg),
        );
        if (allNumbers && pathNode.node.arguments.length > 0) {
          const chars = pathNode.node.arguments.map(arg => arg.value);
          // 分块拼接：fromCharCode 展开超长数组会触发
          // RangeError: Maximum call stack size exceeded。
          let decoded = '';
          const CHUNK = 4096;
          for (let i = 0; i < chars.length; i += CHUNK) {
            decoded += String.fromCharCode(...chars.slice(i, i + CHUNK));
          }
          pathNode.replaceWith(t.stringLiteral(decoded));
          changed = true;
          return;
        }
      }

      // 2. atob("...")
      if (
        t.isIdentifier(callee, {name: 'atob'}) &&
        pathNode.node.arguments.length === 1 &&
        t.isStringLiteral(pathNode.node.arguments[0])
      ) {
        const base64Str = pathNode.node.arguments[0].value;
        // Buffer 的 base64 解码是宽松的（忽略非法字符而非抛错），因此显式
        // 校验输入字符集，避免把垃圾输入解码成看似有效的结果。
        if (/^[A-Za-z0-9+/]*={0,2}$/.test(base64Str)) {
          const decoded = Buffer.from(base64Str, 'base64').toString('utf8');
          // 可打印校验保留 ASCII 与常用 CJK；其他多字节文本（如日/韩文）
          // 会被跳过而不是产出乱码。
          if (/^[\x20-\x7E\r\n\t一-龥]+$/.test(decoded)) {
            pathNode.replaceWith(t.stringLiteral(decoded));
            changed = true;
          }
        }
      }
    },
    StringLiteral(pathNode) {
      if (pathNode.node.extra && /\\[ux]/i.test(pathNode.node.extra.raw)) {
        delete pathNode.node.extra;
        changed = true;
      }
    },
  });

  return changed;
}

function stripInvisibleUnicode(code) {
  let cleaned = code;
  if (detectInvisibleUnicode(cleaned)) {
    cleaned = decodeInvisibleUnicode(cleaned);
  }

  try {
    const ast = parser.parse(cleaned, {
      sourceType: 'unambiguous',
      plugins: ['jsx'],
    });

    decodeStringCalls(ast);

    return {
      success: true,
      code: generator(ast, {
        compact: false,
        comments: false,
        jsescOption: {minimal: true},
      }).code,
    };
  } catch (err) {
    return {
      success: false,
      code: cleaned,
      error: err.message,
    };
  }
}

if (require.main === module) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    process.stderr.write(
      'Usage: node strip-invisible-unicode.js <input.js> <output.js>\n',
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
  const result = stripInvisibleUnicode(raw);
  if (!result.success) {
    process.stderr.write(
      `Warning: AST parsing failed (${result.error}), writing pre-cleaned code.\n`,
    );
  }
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), {recursive: true});
  fs.writeFileSync(path.resolve(outputPath), result.code, 'utf8');
}

module.exports = {
  stripInvisibleUnicode,
  detectInvisibleUnicode,
  decodeInvisibleUnicode,
};
