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

function printHelp() {
  console.log(`
wasm-inspect.js - 纯离线解析 WebAssembly 二进制节区段表、导入/导出符号与内嵌字符串

用法:
  node wasm-inspect.js --input <file.wasm> [选项]

选项:
  -i, --input <path>            .wasm 文件路径 [必需]
      --include-strings         扫描并输出内嵌可读常量字符串 [默认: true]
      --mask-sensitive          脱敏可能敏感的秘钥/Token/凭证字符串 [默认: false]
      --max-strings <n>         最多显示的内嵌字符串数量 [默认: 100]
      --json                    以 JSON 格式输出完整解析结果
  -h, --help                    显示帮助信息

示例:
  node wasm-inspect.js -i ./module.wasm
  node wasm-inspect.js -i ./module.wasm --json
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
  return {value: result, bytesRead};
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

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        input: {type: 'string', short: 'i'},
        'include-strings': {type: 'string', default: 'true'},
        'mask-sensitive': {type: 'boolean', default: false},
        'max-strings': {type: 'string', default: '100'},
        json: {type: 'boolean', default: false},
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

  try {
    const buffer = Uint8Array.from(await readFile(path.resolve(inputPath)));

    // 检查 Magic Number (0x00 0x61 0x73 0x6D)
    if (
      buffer.length < 8 ||
      buffer[0] !== 0x00 ||
      buffer[1] !== 0x61 ||
      buffer[2] !== 0x73 ||
      buffer[3] !== 0x6d
    ) {
      throw new Error(
        '不是合法的 WebAssembly 二进制文件（Magic Number 不匹配）',
      );
    }

    const version =
      buffer[4] | (buffer[5] << 8) | (buffer[6] << 16) | (buffer[7] << 24);

    const sections = [];
    let exportsList = [];
    let importsList = [];
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
        size: sectionSize,
      });

      if (sectionId === 7) {
        // Export
        exportsList = parseExports(buffer, payloadOffset, sectionSize);
      } else if (sectionId === 2) {
        // Import
        importsList = parseImports(buffer, payloadOffset, sectionSize);
      }

      offset += sectionSize;
    }

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
      version,
      sectionCount: sections.length,
      sections,
      imports: importsList,
      exports: exportsList,
      strings: includeStrings ? strings : undefined,
    };

    if (isJson) {
      console.log(JSON.stringify({success: true, data: result}, null, 2));
    } else {
      console.log('🔬 WebAssembly 二进制结构检查报告');
      console.log(
        '============================================================',
      );
      console.log(`   文件: ${path.resolve(inputPath)}`);
      console.log(`   大小: ${buffer.length} 字节 | 版本: ${version}`);
      console.log(
        `   节区: ${sections.length} 个 | 导入: ${importsList.length} 项 | 导出: ${exportsList.length} 项`,
      );

      console.log('\n📂 节区清单 (Sections):');
      for (const s of sections) {
        console.log(
          `   - [ID ${s.id.toString().padStart(2, ' ')}] ${s.name.padEnd(12, ' ')} 偏移: 0x${s.offset.toString(16).padStart(6, '0')} | 大小: ${s.size} 字节`,
        );
      }

      if (exportsList.length > 0) {
        console.log('\n📤 导出符号表 (Exports):');
        for (const exp of exportsList) {
          console.log(`   * ${exp.name} (${exp.kind} #${exp.index})`);
        }
      }

      if (importsList.length > 0) {
        console.log('\n📥 导入依赖表 (Imports):');
        for (const imp of importsList) {
          console.log(`   * ${imp.module}.${imp.field} (${imp.kind})`);
        }
      }

      if (includeStrings && strings.length > 0) {
        console.log(`\n🔤 内嵌常量字符串 (前 ${strings.length} 个):`);
        for (const s of strings.slice(0, 20)) {
          console.log(
            `   [0x${s.offset.toString(16).padStart(5, '0')}] ${s.string}`,
          );
        }
        if (strings.length > 20) {
          console.log(
            `   ... 还有 ${strings.length - 20} 个字符串未展开（使用 --json 查看完整列表）`,
          );
        }
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
