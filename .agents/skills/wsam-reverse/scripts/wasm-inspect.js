#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';

const SECTION_NAMES = [
  'Custom',
  'Type',
  'Import',
  'Function',
  'Table',
  'Memory',
  'Global',
  'Export',
  'Start',
  'Element',
  'Code',
  'Data',
  'DataCount',
];

const EXPORT_KINDS = ['Function', 'Table', 'Memory', 'Global'];

const VALTYPES = {
  0x7f: 'i32',
  0x7e: 'i64',
  0x7d: 'f32',
  0x7c: 'f64',
  0x7b: 'v128',
  0x70: 'funcref',
  0x6f: 'externref',
};

/**
 * 标准密码学常量的字节指纹。
 * 全部按「在 wasm 二进制里实际出现的字节序」列出：
 *   - SHA-1 / SHA-256 / SM4 的常量在源码里是大端书写的，data 段里也是大端；
 *   - MD5 的 IV / T 表在 C 源码里是小端 u32 数组，data 段里是小端。
 * 只有长度 >= 8 的指纹才用于「反向断言」（防止探针退化成「什么都能认」）。
 */
function buildCryptoFingerprints() {
  const be32 = v => [
    (v >>> 24) & 0xff,
    (v >>> 16) & 0xff,
    (v >>> 8) & 0xff,
    v & 0xff,
  ];
  const le32 = v => [
    v & 0xff,
    (v >>> 8) & 0xff,
    (v >>> 16) & 0xff,
    (v >>> 24) & 0xff,
  ];
  const cat = arrs => [].concat(...arrs);
  const hex = s =>
    (s.match(/../g) || []).map(x => parseInt(x, 16) & 0xff);

  // CRC32 (poly 0xEDB88320) 表的前 8 项，由公式生成（不抄表）
  const crc32Table = [];
  for (let i = 0; i < 8; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc32Table.push(c >>> 0);
  }

  return [
    {
      name: 'SHA-256 IV (H0..H3)',
      bytes: cat([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a].map(be32)),
      note: 'SHA-256 初始向量；命中即高度确认 SHA-256',
    },
    {
      name: 'SHA-256 K[0..3]',
      bytes: cat([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5].map(be32)),
      note: 'SHA-256 轮常量；魔改 MD5 常被误认，用它区分',
    },
    {
      name: 'SHA-1 IV (H0..H4)',
      bytes: cat(
        [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0].map(be32),
      ),
      note: 'SHA-1 初始向量',
    },
    {
      name: 'MD5 IV',
      bytes: cat(
        [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476].map(le32),
      ),
      note: 'MD5 初始向量（小端存储）',
    },
    {
      name: 'MD5 T[0..3]',
      bytes: cat(
        [0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee].map(le32),
      ),
      note: 'MD5 轮常量 sin 表；魔改常从改这几项开始',
    },
    {
      name: 'AES S-box (前 16 字节)',
      bytes: hex('637c777bf26b6fc5300167 2bfed7ab76'.replace(/\s/g, '')),
      note: 'AES 替代表；只在明文查表实现里出现（S 盒内联）',
    },
    {
      name: 'SM4 FK',
      bytes: cat([0xa3b1bac6, 0x56aa3350, 0x677d9197, 0xb27022dc].map(be32)),
      note: 'SM4 系统参数 FK',
    },
    {
      name: 'SM4 CK[0..1]',
      bytes: cat([0x00070e15, 0x1c232a31].map(be32)),
      note: 'SM4 固定参数 CK，由 (28i+7j)&0xFF 生成',
    },
    {
      name: 'CRC32 表 (poly 0xEDB88320, 前 8 项)',
      bytes: cat(crc32Table.map(le32)),
      note: 'zlib/gzip 风格 CRC32 查表实现',
    },
    {
      name: '标准 Base64 字母表',
      bytes: Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', c =>
        c.charCodeAt(0),
      ),
      note: '标准 Base64 表；与「自定义表」对比即可看出是否换表',
    },
  ];
}

const CRYPTO_FINGERPRINTS = buildCryptoFingerprints();

/** 反向断言用的短指纹集合：随机数据不得命中这些。 */
const MIN_FINGERPRINT_LEN_FOR_REJECTION = 12;

const GLUE_FAMILY_RULES = [
  {
    family: 'wasm-bindgen (Rust)',
    test: (m, f) => /^__wbindgen_/.test(f) || /^__wbg_/.test(f),
   补什么:
      '逐项照抄 JS 侧的 initSync / importObject；从未执行过的导入直接置 NULL。' +
      '若出现 __wbindgen_add_to_stack_pointer，说明有导出函数走 retptr 二级取值。',
  },
  {
    family: 'cargo-web / stdweb (Rust)',
    test: (m, f) => /^__cargo_web_snippet_[0-9a-f]{20,}$/.test(f),
   补什么:
      '要自己实现引用表桥：to_js / from_js / acquire_js_reference / decrement_refcount / ' +
      'serialize_array；引用表前部有固定占位，必须照抄。',
  },
  {
    family: 'Go (wasm_exec.js)',
    test: (m, f) =>
      /^gojs$/.test(m) || /^syscall\/js/.test(m) || /^syscall\/js/.test(f) || /^go\./.test(f),
   补什么:
      '不要手工补导入——直接复用 Go 官方 wasm_exec.js（new Go() -> go.importObject -> go.run）。' +
      '业务函数常被挂到 window 上，补完环境后可直接调用。',
  },
  {
    family: 'Emscripten (C/C++)',
    test: (m, f) =>
      /^_emscripten_/.test(f) ||
      /^nullFunc_/.test(f) ||
      /^__syscall/.test(f) ||
      /^(getTotalMemory|enlargeMemory|abortStackOverflow|abortOnCannotGrowMemory)$/.test(f) ||
      /^(DYNAMICTOP_PTR|tempDoublePtr|STACKTOP|STACK_MAX|memoryBase|tableBase)$/.test(f),
   补什么:
      'nullFunc_* 一族永远 NULL；getTotalMemory 回定值；*Base/DYNAMICTOP_PTR/STACKTOP 属于「导入数值」，' +
      '先 NULL 再按编译报错处改成实际引用；带环境读数的（如 _get_unicode_str）用 C 全局变量曲线赋值。',
  },
  {
    family: '纯 C / wasm2c 直出',
    test: (m, f) => /^__linear_memory$/.test(f) || /^__indirect_function_table$/.test(f),
   补什么: '导入极少，通常可直接实例化调用。',
  },
];

const GLUE_FAMILY_PRIORITY = [
  'wasm-bindgen (Rust)',
  'cargo-web / stdweb (Rust)',
  'Go (wasm_exec.js)',
  'Emscripten (C/C++)',
  '纯 C / wasm2c 直出',
];

function classifyGlueFamily(imports) {
  if (imports.length === 0) {
    return {
      family: '无 import（自包含模块）',
      evidence: [],
      补什么: '可以直接 instance.exports.<fn>(...) 调用，不需要补任何环境。',
    };
  }
  const hitMap = new Map();
  for (const imp of imports) {
    for (const rule of GLUE_FAMILY_RULES) {
      if (rule.test(imp.module, imp.field)) {
        if (!hitMap.has(rule.family)) {
          hitMap.set(rule.family, {rule, evidence: []});
        }
        const bucket = hitMap.get(rule.family);
        if (bucket.evidence.length < 5) {
          bucket.evidence.push(`${imp.module}.${imp.field}`);
        }
      }
    }
  }
  if (hitMap.size === 0) {
    return {
      family: '未知 / 站点自建胶水层',
      evidence: [],
      补什么:
        '按「报错什么补什么」的迭代法：先给全 NULL 的 importObject，跑一遍看第一处报错的导入名，逐个补。',
    };
  }
  const ranked = GLUE_FAMILY_PRIORITY.filter(f => hitMap.has(f));
  const primary = ranked[0];
  return {
    family: primary,
    evidence: hitMap.get(primary).evidence,
    otherFamilies: ranked.slice(1),
    补什么: hitMap.get(primary).rule.补什么,
  };
}

function findFingerprints(buffer, fingerprints) {
  const hits = [];
  for (const fp of fingerprints) {
    const needle = Uint8Array.from(fp.bytes);
    let count = 0;
    let firstOffset = -1;
    for (let i = 0; i + needle.length <= buffer.length; i++) {
      let ok = true;
      for (let j = 0; j < needle.length; j++) {
        if (buffer[i + j] !== needle[j]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        count++;
        if (firstOffset === -1) firstOffset = i;
      }
    }
    if (count > 0) {
      hits.push({name: fp.name, count, firstOffset, note: fp.note});
    }
  }
  return hits;
}

function printHelp() {
  console.log(`
wasm-inspect.js - 纯离线解析 WebAssembly 二进制节区段表、导入/导出符号、函数签名、内嵌字符串与加密常量指纹

用法:
  node wasm-inspect.js --input <file.wasm> [选项]
  node wasm-inspect.js --selftest

选项:
  -i, --input <path>            .wasm 文件路径（--selftest 时不需要）
      --include-strings         扫描并输出内嵌可读常量字符串 [默认: true]
      --mask-sensitive          脱敏可能敏感的秘钥/Token/凭证字符串 [默认: false]
      --max-strings <n>         最多显示的内嵌字符串数量 [默认: 100]
      --signatures              解析 Type/Function 段，输出导出函数的 (参数) -> 返回值 签名 [默认: true]
      --glue-family             由导入命名判定胶水层家族（emscripten / wasm-bindgen / cargo-web / Go / 纯 C）
      --crypto-constants        扫描标准密码学常量指纹（MD5/SHA-1/SHA-256/AES/SM4/CRC32/Base64 表）
      --json                    以 JSON 格式输出完整解析结果
      --selftest                用内存内合成的 wasm 夹具自检（含反向断言），不读磁盘
  -h, --help                    显示帮助信息

示例:
  node wasm-inspect.js -i ./module.wasm --glue-family --crypto-constants
  node wasm-inspect.js -i ./module.wasm --json
  node wasm-inspect.js --selftest
`);
}

function readVaruint(buffer, offset) {
  let result = 0;
  let shift = 0;
  let bytesRead = 0;
  while (offset + bytesRead < buffer.length) {
    const byte = buffer[offset + bytesRead];
    bytesRead++;
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return {value: result >>> 0, bytesRead};
}

function readString(buffer, offset) {
  const len = readVaruint(buffer, offset);
  const start = offset + len.bytesRead;
  if (start + len.value > buffer.length) {
    return {value: '<invalid string>', bytesRead: len.bytesRead};
  }
  const str = Buffer.from(
    buffer.buffer,
    buffer.byteOffset + start,
    len.value,
  ).toString('utf-8');
  return {value: str, bytesRead: len.bytesRead + len.value};
}

function parseExports(buffer, payloadOffset, payloadLength) {
  const exports = [];
  let curr = payloadOffset;
  const end = payloadOffset + payloadLength;
  if (curr >= end) return exports;

  const countInfo = readVaruint(buffer, curr);
  curr += countInfo.bytesRead;

  for (let i = 0; i < countInfo.value && curr < end; i++) {
    const nameInfo = readString(buffer, curr);
    curr += nameInfo.bytesRead;
    if (curr >= end) break;
    const kind = buffer[curr++];
    const indexInfo = readVaruint(buffer, curr);
    curr += indexInfo.bytesRead;

    exports.push({
      name: nameInfo.value,
      kind: EXPORT_KINDS[kind] || `Unknown(${kind})`,
      index: indexInfo.value,
    });
  }
  return exports;
}

function parseImports(buffer, payloadOffset, payloadLength) {
  const imports = [];
  let curr = payloadOffset;
  const end = payloadOffset + payloadLength;
  if (curr >= end) return imports;

  const countInfo = readVaruint(buffer, curr);
  curr += countInfo.bytesRead;

  for (let i = 0; i < countInfo.value && curr < end; i++) {
    const modInfo = readString(buffer, curr);
    curr += modInfo.bytesRead;
    if (curr >= end) break;

    const fieldInfo = readString(buffer, curr);
    curr += fieldInfo.bytesRead;
    if (curr >= end) break;

    const kind = buffer[curr++];
    let typeIndex = null;
    if (kind === 0) {
      const typeInfo = readVaruint(buffer, curr);
      curr += typeInfo.bytesRead;
      typeIndex = typeInfo.value;
    } else if (kind === 1) {
      curr += 1;
      const lim = readVaruint(buffer, curr);
      curr += lim.bytesRead;
    } else if (kind === 2) {
      const lim = readVaruint(buffer, curr);
      curr += lim.bytesRead;
    } else if (kind === 3) {
      curr += 2;
    }

    imports.push({
      module: modInfo.value,
      field: fieldInfo.value,
      kind: EXPORT_KINDS[kind] || `Unknown(${kind})`,
      typeIndex,
    });
  }
  return imports;
}

/** 解析 Type 段：得到 [{params:[valtype...], results:[valtype...]}] */
function parseTypes(buffer, payloadOffset, payloadLength) {
  const types = [];
  let curr = payloadOffset;
  const end = payloadOffset + payloadLength;
  if (curr >= end) return types;

  const countInfo = readVaruint(buffer, curr);
  curr += countInfo.bytesRead;

  for (let i = 0; i < countInfo.value && curr < end; i++) {
    const form = buffer[curr++];
    if (form !== 0x60) {
      // 非函数类型（GC proposal 等）：记录并停止，避免把后续字节误读成函数类型。
      types.push({form: `0x${form.toString(16)}`, params: [], results: [], unknown: true});
      continue;
    }
    const paramCount = readVaruint(buffer, curr);
    curr += paramCount.bytesRead;
    const params = [];
    for (let p = 0; p < paramCount.value && curr < end; p++) {
      params.push(VALTYPES[buffer[curr++]] || `valtype_0x${buffer[curr - 1].toString(16)}`);
    }
    const resultCount = readVaruint(buffer, curr);
    curr += resultCount.bytesRead;
    const results = [];
    for (let r = 0; r < resultCount.value && curr < end; r++) {
      results.push(VALTYPES[buffer[curr++]] || `valtype_0x${buffer[curr - 1].toString(16)}`);
    }
    types.push({form: 'func', params, results});
  }
  return types;
}

/** 解析 Function 段：得到 [typeIndex...]（仅「本模块定义」的函数，不含导入） */
function parseFunctions(buffer, payloadOffset, payloadLength) {
  const funcs = [];
  let curr = payloadOffset;
  const end = payloadOffset + payloadLength;
  if (curr >= end) return funcs;

  const countInfo = readVaruint(buffer, curr);
  curr += countInfo.bytesRead;
  for (let i = 0; i < countInfo.value && curr < end; i++) {
    const idx = readVaruint(buffer, curr);
    curr += idx.bytesRead;
    funcs.push(idx.value);
  }
  return funcs;
}

function formatSignature(type) {
  if (!type) return '<未知类型>';
  if (type.unknown) return `<非函数类型 ${type.form}>`;
  const p = type.params.length ? type.params.join(', ') : '';
  const r = type.results.length ? type.results.join(', ') : '';
  return `(${p}) -> ${r || '()'}`;
}

/**
 * 把导出函数接到 Type 段，得到可读签名。
 * 索引空间：导入的函数先占号（0..numImportedFuncs-1），本模块定义的函数从 numImportedFuncs 起。
 */
function attachSignatures(exports, imports, types, definedFunctionTypeIndexes) {
  const numImportedFuncs = imports.filter(i => i.kind === 'Function').length;
  for (const exp of exports) {
    if (exp.kind !== 'Function') continue;
    const localIndex = exp.index - numImportedFuncs;
    if (localIndex < 0) {
      // 导出的是「转手导出」的导入函数。
      const importedFuncs = imports.filter(i => i.kind === 'Function');
      const imp = importedFuncs[exp.index];
      exp.signature = imp ? formatSignature(types[imp.typeIndex]) : '<未知类型>';
      exp.reExportedImport = imp ? `${imp.module}.${imp.field}` : null;
      continue;
    }
    const typeIndex = definedFunctionTypeIndexes[localIndex];
    exp.signature = formatSignature(types[typeIndex]);
    exp.typeIndex = typeIndex;
  }
  return exports;
}

function extractPrintableStrings(buffer, minLength = 4) {
  const strings = [];
  let start = -1;

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    const isPrintable = byte >= 32 && byte <= 126;

    if (isPrintable) {
      if (start === -1) start = i;
    } else {
      if (start !== -1) {
        const len = i - start;
        if (len >= minLength) {
          const str = Buffer.from(
            buffer.buffer,
            buffer.byteOffset + start,
            len,
          ).toString('ascii');
          strings.push({offset: start, length: len, string: str});
        }
        start = -1;
      }
    }
  }

  if (start !== -1 && buffer.length - start >= minLength) {
    const len = buffer.length - start;
    const str = Buffer.from(
      buffer.buffer,
      buffer.byteOffset + start,
      len,
    ).toString('ascii');
    strings.push({offset: start, length: len, string: str});
  }

  return strings;
}

function maskString(str) {
  if (/(token|secret|key|password|auth|sig)/i.test(str) && str.length > 8) {
    return str.slice(0, 3) + '****' + str.slice(-2);
  }
  return str;
}

/** 解析单个 wasm 二进制（供 CLI 与 selftest 复用）。 */
function parseWasm(buffer) {
  if (
    buffer.length < 8 ||
    buffer[0] !== 0x00 ||
    buffer[1] !== 0x61 ||
    buffer[2] !== 0x73 ||
    buffer[3] !== 0x6d
  ) {
    throw new Error('不是合法的 WebAssembly 二进制文件（Magic Number 不匹配）');
  }

  const version =
    buffer[4] | (buffer[5] << 8) | (buffer[6] << 16) | (buffer[7] << 24);

  const sections = [];
  let exportsList = [];
  let importsList = [];
  let types = [];
  let definedFunctionTypeIndexes = [];
  let offset = 8;

  while (offset < buffer.length) {
    const sectionId = buffer[offset++];
    const lenInfo = readVaruint(buffer, offset);
    offset += lenInfo.bytesRead;

    const sectionSize = lenInfo.value;
    const payloadOffset = offset;
    const sectionName = SECTION_NAMES[sectionId] || `Section_${sectionId}`;

    sections.push({
      id: sectionId,
      name: sectionName,
      offset: payloadOffset - lenInfo.bytesRead - 1,
      payloadOffset,
      size: sectionSize,
    });

    if (sectionId === 1) {
      types = parseTypes(buffer, payloadOffset, sectionSize);
    } else if (sectionId === 2) {
      importsList = parseImports(buffer, payloadOffset, sectionSize);
    } else if (sectionId === 3) {
      definedFunctionTypeIndexes = parseFunctions(buffer, payloadOffset, sectionSize);
    } else if (sectionId === 7) {
      exportsList = parseExports(buffer, payloadOffset, sectionSize);
    }

    offset += sectionSize;
  }

  return {
    version,
    sections,
    imports: importsList,
    exports: exportsList,
    types,
    definedFunctionTypeIndexes,
  };
}

// ---------------------------------------------------------------- selftest

function uleb(n) {
  const out = [];
  do {
    let byte = n & 0x7f;
    n >>>= 7;
    if (n !== 0) byte |= 0x80;
    out.push(byte);
  } while (n !== 0);
  return out;
}

function str(s) {
  const bytes = Array.from(Buffer.from(s, 'utf-8'));
  return [...uleb(bytes.length), ...bytes];
}

function section(id, payload) {
  return [id, ...uleb(payload.length), ...payload];
}

function vec(items) {
  return [...uleb(items.length), ...[].concat(...items)];
}

/** 造一个最小合法 wasm 模块。 */
function buildFixture({funcType = {params: [0x7f, 0x7f], results: [0x7f]}, imports = [], exportName = 'encrypt', data = []} = {}) {
  const parts = [
    0x00, 0x61, 0x73, 0x6d, // \0asm
    0x01, 0x00, 0x00, 0x00, // version 1
  ];

  // Type 段：1 个函数类型
  const typeEntry = [
    0x60,
    ...uleb(funcType.params.length),
    ...funcType.params,
    ...uleb(funcType.results.length),
    ...funcType.results,
  ];
  parts.push(...section(1, vec([typeEntry])));

  // Import 段
  if (imports.length) {
    const entries = imports.map(imp => [
      ...str(imp.module),
      ...str(imp.field),
      0x00,
      ...uleb(0),
    ]);
    parts.push(...section(2, vec(entries)));
  }

  // Function 段：1 个本模块定义的函数，用 type 0
  parts.push(...section(3, vec([[0x00]])));

  // Export 段：导出刚才那个函数（函数索引 = 导入函数个数 + 0）
  const numImportedFuncs = imports.length;
  parts.push(...section(7, vec([[...str(exportName), 0x00, ...uleb(numImportedFuncs)]])));

  // Code 段：local.get 0; local.get 1; i32.add; end
  const body = [0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b];
  parts.push(...section(10, vec([[...uleb(body.length), ...body]])));

  // Data 段（可选）
  if (data.length) {
    const seg = [0x00, 0x41, 0x00, 0x0b, ...uleb(data.length), ...data];
    parts.push(...section(11, vec([seg])));
  }

  return Uint8Array.from(parts);
}

function lcgBytes(seed, n) {
  const out = new Uint8Array(n);
  let s = seed >>> 0;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out[i] = s >>> 24;
  }
  return out;
}

function runSelfTest() {
  const assertions = [];
  const fail = [];
  const ok = (name, cond, detail = '') => {
    assertions.push({name, pass: Boolean(cond), detail});
    if (!cond) fail.push(`${name}${detail ? ' — ' + detail : ''}`);
  };

  // ---- 1) 解析与签名
  {
    const buf = buildFixture({exportName: 'encrypt'});
    const r = parseWasm(buf);
    ok('S1 无 import 的模块导入数为 0', r.imports.length === 0, `实际 ${r.imports.length}`);
    ok('S2 导出名解析正确', r.exports[0] && r.exports[0].name === 'encrypt');
    ok('S3 导出函数索引为 0', r.exports[0] && r.exports[0].index === 0);
    attachSignatures(r.exports, r.imports, r.types, r.definedFunctionTypeIndexes);
    ok(
      'S4 签名解析为 (i32, i32) -> i32',
      r.exports[0].signature === '(i32, i32) -> i32',
      `实际 ${r.exports[0].signature}`,
    );
    const family = classifyGlueFamily(r.imports);
    ok(
      'S5 自包含模块判为「无 import」',
      family.family.startsWith('无 import'),
      `实际 ${family.family}`,
    );

    // 导入函数会让本模块函数索引后移，签名必须仍能对上
    const buf2 = buildFixture({
      imports: [{module: 'wbg', field: '__wbindgen_malloc'}],
      exportName: 'sign',
    });
    const r2 = parseWasm(buf2);
    ok('S6 带 1 个导入时导入表解析正确', r2.imports.length === 1 && r2.imports[0].field === '__wbindgen_malloc');
    ok('S7 带 1 个导入时导出索引后移为 1', r2.exports[0].index === 1, `实际 ${r2.exports[0].index}`);
    attachSignatures(r2.exports, r2.imports, r2.types, r2.definedFunctionTypeIndexes);
    ok(
      'S8 索引后移后签名仍然正确（这是最容易错的一位）',
      r2.exports[0].signature === '(i32, i32) -> i32',
      `实际 ${r2.exports[0].signature}`,
    );
  }

  // ---- 2) 胶水层家族判定
  const familyCases = [
    {imports: [{module: 'wbg', field: '__wbindgen_object_drop_ref'}], want: 'wasm-bindgen (Rust)'},
    {imports: [{module: 'env', field: '__cargo_web_snippet_0d39c013e2144171d64e2fac849140a7e54c939a'}], want: 'cargo-web / stdweb (Rust)'},
    {imports: [{module: 'gojs', field: 'runtime.wasmExit'}], want: 'Go (wasm_exec.js)'},
    {imports: [{module: 'env', field: 'nullFunc_vii'}], want: 'Emscripten (C/C++)'},
    {imports: [{module: 'env', field: 'getTotalMemory'}], want: 'Emscripten (C/C++)'},
    {imports: [{module: 'env', field: '__linear_memory'}], want: '纯 C / wasm2c 直出'},
  ];
  for (let i = 0; i < familyCases.length; i++) {
    const c = familyCases[i];
    const got = classifyGlueFamily(c.imports).family;
    ok(`S9.${i + 1} 家族判定：${c.want}`, got === c.want, `实际 ${got}`);
  }
  // 优先级：同时出现 wasm-bindgen 与 emscripten 特征时，wasm-bindgen 优先
  {
    const got = classifyGlueFamily([
      {module: 'env', field: 'nullFunc_vii'},
      {module: 'wbg', field: '__wbindgen_malloc'},
    ]).family;
    ok('S9.7 家族冲突时按优先级取 wasm-bindgen', got === 'wasm-bindgen (Rust)', `实际 ${got}`);
  }

  // ---- 3) 加密常量指纹：正向断言（每个指纹都必须能被自己的字节命中原位）
  {
    for (const fp of CRYPTO_FINGERPRINTS) {
      const pad = lcgBytes(7, 32);
      const buf = Uint8Array.from([...pad, ...fp.bytes, ...lcgBytes(9, 16)]);
      const hits = findFingerprints(buf, [fp]);
      ok(
        `S10 指纹自命中：${fp.name}`,
        hits.length === 1 && hits[0].count === 1 && hits[0].firstOffset === pad.length,
        `实际 ${JSON.stringify(hits)}`,
      );
    }
  }

  // ---- 4) 反向断言：随机数据不得命中长指纹（防止探针退化成「什么都能认」）
  {
    const longOnes = CRYPTO_FINGERPRINTS.filter(
      fp => fp.bytes.length >= MIN_FINGERPRINT_LEN_FOR_REJECTION,
    );
    ok('S11 参与反向断言的长指纹数量 >= 8', longOnes.length >= 8, `实际 ${longOnes.length}`);
    let total = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      const noise = lcgBytes(seed, 8192);
      total += findFingerprints(noise, longOnes).length;
    }
    ok('S12 40960 字节随机数据命中长指纹数为 0', total === 0, `实际 ${total}`);
  }

  // ---- 5) 错误输入必须被拒绝（失败分支）
  {
    let threw = false;
    try {
      parseWasm(Uint8Array.from([0x7f, 0x45, 0x4c, 0x46, 1, 2, 3, 4]));
    } catch {
      threw = true;
    }
    ok('S13 非 wasm 魔数必须抛错', threw);
    let threwShort = false;
    try {
      parseWasm(Uint8Array.from([0x00, 0x61]));
    } catch {
      threwShort = true;
    }
    ok('S14 过短输入必须抛错', threwShort);
    let threwPeek = false;
    try {
      parseWasm(Uint8Array.from([]));
    } catch {
      threwPeek = true;
    }
    ok('S15 空输入必须抛错', threwPeek);
  }

  // ---- 6) 端到端：把 data 段塞进指纹，必须能在整模块里被找到
  {
    const sha256iv = CRYPTO_FINGERPRINTS.find(f => f.name.startsWith('SHA-256 IV'));
    const buf = buildFixture({data: sha256iv.bytes});
    const r = parseWasm(buf);
    const dataSection = r.sections.find(s => s.name === 'Data');
    ok('S16 夹具含 Data 段', Boolean(dataSection));
    const hits = findFingerprints(buf, [sha256iv]);
    ok('S17 整模块扫描能在 Data 段命中 SHA-256 IV', hits.length === 1 && hits[0].count === 1);
    ok(
      'S18 命中偏移落在 Data 段内',
      hits.length === 1 &&
        hits[0].firstOffset >= dataSection.payloadOffset &&
        hits[0].firstOffset < dataSection.payloadOffset + dataSection.size,
      hits.length === 1
        ? `命中 ${hits[0].firstOffset} / Data 段 ${dataSection.payloadOffset}..${dataSection.payloadOffset + dataSection.size}`
        : '',
    );
  }

  // ---- 7) 段偏移自洽：每个段的 payloadOffset+size 不得越界
  {
    const buf = buildFixture({data: lcgBytes(11, 64)});
    const r = parseWasm(buf);
    const bad = r.sections.filter(s => s.payloadOffset + s.size > buf.length);
    ok('S19 段偏移不自洽的段数为 0', bad.length === 0, JSON.stringify(bad));
    ok('S20 段数量 >= 4（Type/Function/Export/Code）', r.sections.length >= 4, `实际 ${r.sections.length}`);
  }

  const passed = assertions.filter(a => a.pass).length;
  console.log('🧪 wasm-inspect.js 自检');
  console.log('============================================================');
  for (const a of assertions) {
    console.log(`   ${a.pass ? '✓' : '✗'} ${a.name}`);
  }
  console.log('------------------------------------------------------------');
  console.log(`   断言: ${passed}/${assertions.length} 通过`);
  if (fail.length) {
    console.log('❌ 失败项:');
    for (const f of fail) console.log(`   - ${f}`);
    return 1;
  }
  console.log('✅ 全部通过');
  return 0;
}

// ---------------------------------------------------------------- CLI

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        input: {type: 'string', short: 'i'},
        'include-strings': {type: 'string', default: 'true'},
        'mask-sensitive': {type: 'boolean', default: false},
        'max-strings': {type: 'string', default: '100'},
        signatures: {type: 'string', default: 'true'},
        'glue-family': {type: 'boolean', default: false},
        'crypto-constants': {type: 'boolean', default: false},
        json: {type: 'boolean', default: false},
        selftest: {type: 'boolean', default: false},
        help: {type: 'boolean', short: 'h', default: false},
      },
      allowPositionals: true,
    });
  } catch (err) {
    console.error(`参数解析错误: ${err.message}`);
    process.exit(1);
  }

  const {values, positionals} = parsed;
  if (values.help) {
    printHelp();
    process.exit(0);
  }
  if (values.selftest) {
    process.exit(runSelfTest());
  }

  const inputPath = values.input || positionals[0];
  if (!inputPath) {
    console.error('错误: 请提供 .wasm 输入文件路径 (--input <file>)');
    printHelp();
    process.exit(1);
  }

  const isJson = Boolean(values.json);
  const includeStrings = values['include-strings'] !== 'false';
  const maskSensitive = Boolean(values['mask-sensitive']);
  const maxStrings = parseInt(values['max-strings'], 10) || 100;
  const wantSignatures = values.signatures !== 'false';
  const wantGlue = Boolean(values['glue-family']);
  const wantCrypto = Boolean(values['crypto-constants']);

  try {
    const buffer = Uint8Array.from(await readFile(path.resolve(inputPath)));
    const r = parseWasm(buffer);

    if (wantSignatures) {
      attachSignatures(r.exports, r.imports, r.types, r.definedFunctionTypeIndexes);
    }

    let glue = null;
    if (wantGlue) glue = classifyGlueFamily(r.imports);

    let crypto = null;
    if (wantCrypto) crypto = findFingerprints(buffer, CRYPTO_FINGERPRINTS);

    let strings = [];
    if (includeStrings) {
      strings = extractPrintableStrings(buffer)
        .slice(0, maxStrings)
        .map(s => ({
          offset: s.offset,
          string: maskSensitive ? maskString(s.string) : s.string,
        }));
    }

    const result = {
      file: path.resolve(inputPath),
      size: buffer.length,
      version: r.version,
      sectionCount: r.sections.length,
      sections: r.sections,
      imports: r.imports,
      exports: r.exports,
      glueFamily: glue || undefined,
      cryptoConstants: crypto || undefined,
      strings: includeStrings ? strings : undefined,
    };

    if (isJson) {
      console.log(JSON.stringify({success: true, data: result}, null, 2));
      return;
    }

    console.log('🔬 WebAssembly 二进制结构检查报告');
    console.log('============================================================');
    console.log(`   文件: ${path.resolve(inputPath)}`);
    console.log(`   大小: ${buffer.length} 字节 | 版本: ${r.version}`);
    console.log(
      `   节区: ${r.sections.length} 个 | 导入: ${r.imports.length} 项 | 导出: ${r.exports.length} 项`,
    );

    console.log('\n📂 节区清单 (Sections):');
    for (const s of r.sections) {
      console.log(
        `   - [ID ${s.id.toString().padStart(2, ' ')}] ${s.name.padEnd(12, ' ')} ` +
          `偏移: 0x${s.offset.toString(16).padStart(6, '0')} | payload: ${s.payloadOffset}..${s.payloadOffset + s.size} | 大小: ${s.size} 字节`,
      );
    }

    if (r.exports.length > 0) {
      console.log('\n📤 导出符号表 (Exports):');
      for (const exp of r.exports) {
        const sig = wantSignatures ? `  ${exp.signature || ''}` : '';
        const re = exp.reExportedImport ? `  [转手导出 ${exp.reExportedImport}]` : '';
        console.log(`   * ${exp.name} (${exp.kind} #${exp.index})${sig}${re}`);
      }
    }

    if (r.imports.length > 0) {
      console.log('\n📥 导入依赖表 (Imports):');
      for (const imp of r.imports) {
        console.log(`   * ${imp.module}.${imp.field} (${imp.kind})`);
      }
    }

    if (glue) {
      console.log('\n🧩 胶水层家族 (Glue family):');
      console.log(`   ${glue.family}`);
      if (glue.evidence && glue.evidence.length) {
        console.log(`   证据: ${glue.evidence.join(' / ')}`);
      }
      if (glue.otherFamilies && glue.otherFamilies.length) {
        console.log(`   同时命中: ${glue.otherFamilies.join(' / ')}`);
      }
      if (glue['补什么']) {
        console.log(`   补什么: ${glue['补什么']}`);
      }
    }

    if (crypto) {
      console.log('\n🔐 加密常量指纹 (Crypto constants):');
      if (crypto.length === 0) {
        console.log('   （未命中任何已知标准常量指纹）');
      } else {
        for (const h of crypto) {
          console.log(
            `   * ${h.name} ×${h.count}  首个命中 @0x${h.firstOffset
              .toString(16)
              .padStart(6, '0')}`,
          );
          if (h.note) console.log(`       ↳ ${h.note}`);
        }
      }
    }

    if (includeStrings && strings.length > 0) {
      console.log(`\n🔤 内嵌常量字符串 (前 ${strings.length} 个):`);
      for (const s of strings.slice(0, 20)) {
        console.log(`   [0x${s.offset.toString(16).padStart(5, '0')}] ${s.string}`);
      }
      if (strings.length > 20) {
        console.log(
          `   ... 还有 ${strings.length - 20} 个字符串未展开（使用 --json 查看完整列表）`,
        );
      }
    }
  } catch (error) {
    if (isJson) {
      console.log(
        JSON.stringify({success: false, error: error.message}, null, 2),
      );
    } else {
      console.error(`❌ 检查失败: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
