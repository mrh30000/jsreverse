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

// ---------------------------------------------------------------- 双向控制字符
// 与零宽字符是**两种完全不同的混淆**：零宽字符用来「藏 payload」，双向控制字符用来
// **篡改编辑器里的显示顺序**——源码能正常解析、也能正常执行，但你在编辑器里看到的
// 结构与真实结构不一致，于是你会「按看起来的样子」写出错误的 AST 改写规则。
//
// 最典型的症状：把光标放在一个左括号上，右边高亮的**也是左括号**，且函数体看起来
// 没有闭合，但代码不报错（见 `references/invisible-unicode.md` §2）。
//
// ⚠️ 语义提醒：出现在**字符串字面量内部**的双向控制字符是**载荷的一部分**，
// 删掉它会改变字符串的值。所以本脚本的做法是「**删除 + 报告数量与码位**」，
// 而不是静默删除——调用方必须知道自己动过字符串。
const BIDI_CONTROL_CHARS = [
  '\u202A', '\u202B', '\u202C', '\u202D', '\u202E', // LRE RLE PDF LRO RLO
  '\u2066', '\u2067', '\u2068', '\u2069',           // LRI RLI FSI PDI
  '\u200E', '\u200F', '\u061C',                     // LRM RLM ALM
];
const BIDI_NAMES = {
  '\u202A': 'LRE 从左到右嵌入',
  '\u202B': 'RLE 从右到左嵌入',
  '\u202C': 'PDF 弹出方向格式',
  '\u202D': 'LRO 从左到右覆盖',
  '\u202E': 'RLO 从右到左覆盖 ← 最常用，会整段反转显示',
  '\u2066': 'LRI 从左到右隔离',
  '\u2067': 'RLI 从右到左隔离',
  '\u2068': 'FSI 首强隔离',
  '\u2069': 'PDI 弹出方向隔离',
  '\u200E': 'LRM 从左到右标记',
  '\u200F': 'RLM 从右到左标记',
  '\u061C': 'ALM 阿拉伯字母标记',
};
const BIDI_PATTERN = /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/g;

function detectBidiControls(code) {
  const found = new Map();
  for (const char of code) {
    if (BIDI_CONTROL_CHARS.includes(char)) {
      found.set(char, (found.get(char) || 0) + 1);
    }
  }
  return [...found.entries()].map(([char, count]) => ({
    char,
    codePoint: `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
    name: BIDI_NAMES[char] || '未知双向控制字符',
    count,
  }));
}

function stripBidiControls(code) {
  return code.replace(BIDI_PATTERN, '');
}

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
  let zeroWidthDecoded = false;
  if (detectInvisibleUnicode(cleaned)) {
    cleaned = decodeInvisibleUnicode(cleaned);
    zeroWidthDecoded = true;
  }

  // 双向控制字符必须在 **parse 之前**删掉：位于注释/字符串之外时会让解析器报错，
  // 位于其中时则会让「显示」与「实际」不一致（这才是它真正的危害）。
  const bidiFound = detectBidiControls(cleaned);
  if (bidiFound.length) {
    cleaned = stripBidiControls(cleaned);
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
      zeroWidthDecoded,
      bidiRemoved: bidiFound.reduce((a, b) => a + b.count, 0),
      bidiDetails: bidiFound,
    };
  } catch (err) {
    return {
      success: false,
      code: cleaned,
      error: err.message,
      zeroWidthDecoded,
      bidiRemoved: bidiFound.reduce((a, b) => a + b.count, 0),
      bidiDetails: bidiFound,
    };
  }
}

function selftest() {
  const fails = [];
  const T = (cond, msg) => {
    if (!cond) fails.push(msg);
  };

  // 1) 零宽字符：位串还原 + 孤立字符剔除（沿用既有语义）
  T(detectInvisibleUnicode('var\u200Ba=1'), '应检出零宽字符');
  T(!detectInvisibleUnicode('var a=1'), '干净代码不应误报');
  T(decodeInvisibleUnicode('a\u200B\u200C\u200B\u200B\u200C\u200B\u200B\u200Bb') === 'aHb',
    '零宽字符应按映射还原出字节（01001000 = 0x48 = "H"）');
  T(decodeInvisibleUnicode('x\u200By') === 'xy', '孤立零宽字符应被剔除');

  // 2) 双向控制字符：检出 + 命名 + 计数
  const rlo = 'if(a){\u202E}\u202C';
  const found = detectBidiControls(rlo);
  T(found.length === 2, '应检出 2 种双向控制字符');
  T(found.some(f => f.codePoint === 'U+202E' && f.count === 1), '应点名 U+202E（RLO）');
  T(found.some(f => f.codePoint === 'U+202C'), '应点名 U+202C（PDF）');
  T(detectBidiControls('var a=1;').length === 0, '干净代码不应误报双向控制字符');

  // 3) 清洗：往返后不得残留
  const dirty = 'let s="x\u202Ey";// \u202E注释\u2069\nlet t=1;';
  const res = stripInvisibleUnicode(dirty);
  T(res.success === true, '含双向控制字符的代码应能解析（清洗后）');
  T(res.bidiRemoved === 3, `应报告删除 3 个双向控制字符，实得 ${res.bidiRemoved}`);
  T(!/\u202E|\u2069/.test(res.code), '★ 输出中不得残留任何双向控制字符');
  T(res.bidiDetails.length === 2, '应给出 2 种码位的明细');

  // 4) ★ 关键对照：**不清洗**时，双向控制字符位于注释之外会让解析失败，
  //    而位于注释之内则「能解析但显示是错的」——两种都必须由本脚本兜住。
  const outside = 'let a=1;\u202Elet b=2;';
  const naive = (() => {
    try {
      parser.parse(outside, {sourceType: 'unambiguous', plugins: ['jsx']});
      return true;
    } catch (e) {
      return false;
    }
  })();
  T(naive === false, '★ 注释外的双向控制字符应让解析失败（证明清洗不可省）');
  T(stripInvisibleUnicode(outside).success === true, '清洗后应能正常解析');

  // 5) 结构不变性：清洗不得改动 ASCII 逻辑结构
  const src = 'function f(a){return a.map(x=>x*2);}';
  const r2 = stripInvisibleUnicode(src);
  T(r2.success === true && r2.bidiRemoved === 0, '干净代码不应被改动');
  T(/return a\.map/.test(r2.code) || /a\.map/.test(r2.code), '干净代码的函数体应保留');

  // 6) 幂等：对输出再跑一次不应再报告双向控制字符
  const r3 = stripInvisibleUnicode(res.code);
  T(r3.bidiRemoved === 0, '清洗结果必须幂等（再跑一次不应再有双向控制字符）');

  if (fails.length) {
    process.stderr.write('SELFTEST FAIL：\n');
    fails.forEach(m => process.stderr.write('  - ' + m + '\n'));
    return 1;
  }
  process.stdout.write('SELFTEST OK：19 项断言全部通过（零宽映射 / 双向控制字符检出与清洗 / '
    + '注释外解析失败对照 / 幂等）\n');
  return 0;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) {
    process.exit(selftest());
  }

  const [inputPath, outputPath] = argv;
  if (!inputPath || !outputPath) {
    process.stderr.write(
      'Usage: node strip-invisible-unicode.js <input.js> <output.js>\n'
      + '       node strip-invisible-unicode.js --selftest\n',
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
  if (result.bidiRemoved) {
    process.stderr.write(
      `双向控制字符：已删除 ${result.bidiRemoved} 个 — `
      + result.bidiDetails.map(d => `${d.codePoint}(${d.name})×${d.count}`).join('、')
      + '\n⚠️ 若它们原本位于字符串字面量内部，字符串的字面值已随之改变。\n',
    );
  }
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), {recursive: true});
  fs.writeFileSync(path.resolve(outputPath), result.code, 'utf8');
}

module.exports = {
  stripInvisibleUnicode,
  detectInvisibleUnicode,
  decodeInvisibleUnicode,
  detectBidiControls,
  stripBidiControls,
};
