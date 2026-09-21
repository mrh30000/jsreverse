/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

const fs = require('node:fs');
const path = require('node:path');

function detectPacker(code) {
  return /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)/i.test(
    code,
  );
}

function detectAAEncode(code) {
  // AAEncode/JSEncode 载荷以 `ﾟωﾟﾉ` 开头、以 `(ﾟДﾟ)` 结尾调用；同时保留
  // 经典字符片段作为兜底。仅匹配零散片段会漏检变体，故优先用规范前缀。
  return (
    /ﾟωﾟﾉ/.test(code) ||
    /\(ﾟДﾟ\)/.test(code) ||
    code.includes('゜-゜') ||
    code.includes('ω゜') ||
    code.includes('o゜)')
  );
}

function detectURLEncode(code) {
  const matches = code.match(/%[0-9A-Fa-f]{2}/g);
  // 普通代码的正则/字符串也常含 `%20` 片段，仅当整体几乎被 %XX 覆盖时
  // 才判定为 URL 编码载荷。
  if (!matches) return false;
  const nonWhitespaceLength = code.replace(/\s/g, '').length;
  if (nonWhitespaceLength === 0) return false;
  return (matches.length * 3) / nonWhitespaceLength >= 0.85;
}

function detectInvisibleUnicode(code) {
  // \u4E0E strip-invisible-unicode.js \u7684 INVISIBLE_CHARS \u4FDD\u6301\u4E00\u81F4\uFF08u200B/C/D\u3001u2060\u3001uFEFF\uFF09\uFF1B
  // \u4E0D\u8981\u7EB3\u5165 u2028/u2029\uFF08JS \u884C\u5206\u9694\u7B26\uFF09\u4E0E u200E/u200F\uFF08bidi \u6807\u8BB0\uFF09\uFF0C\u5426\u5219\u8BEF\u62A5\u3002
  return /[\u200B\u200C\u200D\u2060\uFEFF]/.test(code);
}

function detectJSFuck(code) {
  // JSFuck 全文件仅由 []()!+ 组成；只检查前 200 字符会把普通 IIFE 误判进来，
  // 且旧正则漏掉了 `[`，导致真正的 JSFuck 反而识别不到。
  const trimmed = code.trim();
  return trimmed.length > 10 && /^[\[\]()!+\s]+$/.test(trimmed);
}

function detectObfuscationTypes(code) {
  const types = new Set();

  // 1. 打包器与传统编码
  if (detectPacker(code)) types.add('packer');
  if (detectAAEncode(code)) types.add('aaencode');
  if (detectURLEncode(code)) types.add('urlencoded');
  if (detectJSFuck(code)) types.add('jsfuck');
  if (detectInvisibleUnicode(code)) types.add('invisible-unicode');

  // 2. JavaScript-Obfuscator 家族特征
  if (code.includes('_0x')) {
    types.add('javascript-obfuscator');
  }

  // 字符串数组旋转洗牌
  if (
    /\(\s*function\s*\(\s*_0x[a-f0-9]+\s*,\s*_0x[a-f0-9]+\s*\).*?push\s*\(\s*.*?shift\s*\(\s*\)/is.test(
      code,
    )
  ) {
    types.add('string-array-rotation');
  }

  // 控制流平坦化
  if (
    /while\s*\([^)]*\)\s*\{?\s*switch\s*\(/i.test(code) ||
    /while\s*\(\s*!!\s*\[\s*\]\s*\)\s*\{?\s*switch/i.test(code)
  ) {
    types.add('control-flow-flattening');
  }

  // 不透明谓词与假条件
  if (
    /if\s*\(\s*typeof\s+\w+\s*[!=]==?\s*['"]undefined['"]\s*\)/i.test(code) &&
    code.includes('_0x')
  ) {
    types.add('opaque-predicates');
  }
  if (/if\s*\(\s*false\s*\)|if\s*\(\s*![1!]\s*\)/i.test(code)) {
    types.add('dead-code-injection');
  }

  // VM 虚拟机保护特征
  if (
    (code.includes('while') &&
      code.includes('switch') &&
      /\b(?:pc|opcode|stack|instruction)\b/i.test(code)) ||
    (/\w+\[\s*pc\+\+\s*\]/i.test(code) &&
      /stack\.push|stack\.pop/i.test(code)) ||
    /var\s+\w+\s*=\s*\[\s*\d+(?:\s*,\s*\d+){15,}\s*\]/i.test(code)
  ) {
    types.add('vm-protection');
  }

  // Webpack / 打包结构
  if (
    code.includes('__webpack_require__') ||
    code.includes('webpackJsonp') ||
    code.includes('webpackChunk')
  ) {
    types.add('webpack');
  }

  // 编码
  if (/\\x[0-9a-fA-F]{2}/.test(code)) {
    types.add('hex-encoding');
  }
  if (
    /atob\s*\(|btoa\s*\(/.test(code) &&
    /[A-Za-z0-9+/]{20,}={0,2}/.test(code)
  ) {
    types.add('base64-encoding');
  }

  // 3. 商业站点与防护产品
  if (/reese84/i.test(code)) types.add('reese84');
  if (/dingxiang/i.test(code)) types.add('dingxiang');
  if (/geetest/i.test(code)) types.add('geetest4');
  // 同花顺载荷含 `10jqka` 特征串；单独用 `|` 分裂字符会误报，故不纳入判据。
  if (/10jqka/i.test(code)) types.add('tonghuashun');
  if (/yidun/i.test(code)) types.add('yidun');
  if (/xiaohongshu/i.test(code) || /\bxhs\b/i.test(code))
    types.add('xiaohongshu');
  // BOSS 直聘：cookie 名 `__zp_stoken__` 与入口页 `security-check.html` 是稳定特征
  if (/__zp_stoken__|security-check\.html/i.test(code) || /zhipin\.com/i.test(code)) {
    types.add('zhipin');
  }

  // 未匹配到具体特征
  if (types.size === 0) {
    types.add('unknown');
  }

  return Array.from(types);
}

if (require.main === module) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath) {
    process.stderr.write(
      'Usage: node detect-obfuscator-types.js <input.js> [output.json]\n',
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
  const detected = detectObfuscationTypes(raw);
  const jsonResult = JSON.stringify(
    {file: path.resolve(inputPath), types: detected},
    null,
    2,
  );

  if (outputPath) {
    fs.mkdirSync(path.dirname(path.resolve(outputPath)), {recursive: true});
    fs.writeFileSync(path.resolve(outputPath), jsonResult, 'utf8');
  } else {
    process.stdout.write(jsonResult + '\n');
  }
}

module.exports = {
  detectObfuscationTypes,
};
