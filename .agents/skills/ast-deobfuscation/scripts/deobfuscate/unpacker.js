/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

const vm = require('node:vm');

// ponytail: 上限防恶意 c 造成的长时间循环（正常 packer c 为小整数）；
// 超出范围说明不是该 packer 形态，宁可放弃解包也不静默截断出错误代码。
const PACKER_VAR_CAP = 1_000_000;

function detectPacker(code) {
  return /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)/i.test(
    code,
  );
}

function unpackPacker(code, maxIterations = 5) {
  let current = code;
  let iterations = 0;

  while (detectPacker(current) && iterations < maxIterations) {
    // ponytail: 非贪婪匹配在函数体内出现 `}(` 序列（如内嵌 IIFE）时会截断，
    // 此时 match 失败并 break，返回未修改输入（安全回退，不产出坏代码）。
    // 经典 Dean Edwards packer 体内无 `}(`，可正常解包。
    const match = current.match(
      /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)\s*{([\s\S]*?)}\s*\((.*?)\)\s*\)/,
    );
    if (!match || !match[2]) break;

    try {
      const params = vm.runInNewContext(`[${match[2]}]`, {}, {timeout: 500});
      if (!Array.isArray(params) || params.length < 4) break;

      const [p, a, c, k, e] = params;
      if (typeof p !== 'string' || !Array.isArray(k)) break;
      if (!Number.isInteger(a) || a < 2) break;
      if (!Number.isInteger(c) || c < 0 || c > PACKER_VAR_CAP) break;

      let eFn;
      if (typeof e === 'function') {
        eFn = e;
      } else {
        // 递归命名函数，避免 const 自引用在重构时踩到初始化顺序问题。
        eFn = function unbase(val) {
          return (
            (val < a ? '' : unbase(Math.floor(val / a))) +
            ((val %= a) > 35 ? String.fromCharCode(val + 29) : val.toString(36))
          );
        };
      }

      let unpacked = p;
      let count = c;
      // ponytail: c 上限 1e6 时逐次 new RegExp 可能耗时数十秒，加整体预算；
      // 超预算时放弃本次解包（返回原始 packed），不做半替换以免产出错误结果。
      const deadline = Date.now() + 5000;
      while (count-- > 0) {
        if (Date.now() > deadline) return current;
        if (k[count]) {
          const regex = new RegExp('\\b' + eFn(count) + '\\b', 'g');
          unpacked = unpacked.replace(regex, k[count]);
        }
      }

      if (!unpacked || unpacked === current) break;
      current = unpacked;
      iterations++;
    } catch {
      break;
    }
  }

  return current;
}

function detectAAEncode(code) {
  // 与 detect-obfuscator-types.js 的判据保持一致，避免检测认为可解包而这里
  // 判定为否；unpackAAEncode 在解包失败时会原样返回，多试不会产错。
  return (
    /ﾟωﾟﾉ/.test(code) ||
    /\(ﾟДﾟ\)/.test(code) ||
    code.includes('゜-゜') ||
    code.includes('ω゜') ||
    code.includes('o゜)')
  );
}

function unpackAAEncode(code) {
  if (!detectAAEncode(code)) return code;
  try {
    // ponytail: vm 不是安全边界，仅用于本地可信样本；超时防止死循环卡死进程。
    // AAEncode 载荷依赖 window/alert 落点，补最小 shim 让常见样本能解出结果。
    // 用哨兵区分「alert 未被调用」与「alert(undefined)」：后者应原样返回
    // undefined 字符串，而不是回退到 IIFE 的返回值。
    const NOT_CAPTURED = Symbol('not-captured');
    let captured = NOT_CAPTURED;
    const sandbox = {
      alert: value => {
        captured = value;
      },
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    const decoded = vm.runInContext(code, sandbox, {timeout: 1000});
    const result = captured !== NOT_CAPTURED ? captured : decoded;
    return typeof result === 'string' ? result : String(result);
  } catch {
    return code;
  }
}

function detectURLEncode(code) {
  const matches = code.match(/%[0-9A-Fa-f]{2}/g);
  // ponytail: 按密度判定而非出现次数 —— 普通代码里的正则/字符串也会出现
  // `%20` 之类片段，只有整体几乎被 %XX 覆盖才视为 URL 编码载荷。
  if (!matches) return false;
  const nonWhitespaceLength = code.replace(/\s/g, '').length;
  if (nonWhitespaceLength === 0) return false;
  return (matches.length * 3) / nonWhitespaceLength >= 0.85;
}

function unpackURLEncode(code) {
  if (!detectURLEncode(code)) return code;
  try {
    return decodeURIComponent(code);
  } catch {
    return code;
  }
}

function unpack(code) {
  let result = code;
  if (detectPacker(result)) {
    result = unpackPacker(result);
  }
  if (detectAAEncode(result)) {
    result = unpackAAEncode(result);
  }
  if (detectURLEncode(result)) {
    result = unpackURLEncode(result);
  }
  return result;
}

module.exports = {
  detectPacker,
  unpackPacker,
  detectAAEncode,
  unpackAAEncode,
  detectURLEncode,
  unpackURLEncode,
  unpack,
};
