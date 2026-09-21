#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import wabtFactory from 'wabt';

function printHelp() {
  console.log(`
wasm-disassemble.js - 将 WebAssembly (.wasm) 文件反汇编为标准 WAT 文本格式

用法:
  node wasm-disassemble.js --input <file.wasm> [选项]

选项:
  -i, --input <path>         .wasm 文件路径 [必需]
  -o, --output <path>        输出的 .wat 文件路径（若未指定则输出至标准输出）
      --max-chars <n>        终端输出最大字符数 [默认: 5000]
      --json                 以 JSON 格式输出结果
  -h, --help                 显示帮助信息

示例:
  node wasm-disassemble.js -i ./module.wasm
  node wasm-disassemble.js -i ./module.wasm -o ./module.wat
`);
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        input: {type: 'string', short: 'i'},
        output: {type: 'string', short: 'o'},
        'max-chars': {type: 'string', default: '5000'},
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

  const outputPath = values.output;
  const maxChars = parseInt(values['max-chars'], 10) || 5000;
  const isJson = Boolean(values.json);

  try {
    const bytes = Uint8Array.from(await readFile(path.resolve(inputPath)));
    const wabt = await wabtFactory();

    const module = wabt.readWasm(bytes, {
      readDebugNames: true,
      check: true,
      mutable_globals: true,
      sat_float_to_int: true,
      sign_extension: true,
      simd: true,
      threads: true,
      function_references: true,
      multi_value: true,
      tail_call: true,
      bulk_memory: true,
      reference_types: true,
      annotations: true,
      code_metadata: true,
      gc: true,
    });

    let wat;
    try {
      module.generateNames();
      module.applyNames();
      wat = module.toText({
        foldExprs: false,
        inlineExport: false,
      });
    } finally {
      module.destroy();
    }

    if (outputPath) {
      await writeFile(path.resolve(outputPath), wat, 'utf-8');
    }

    const lineCount = wat.split('\n').length;
    const truncated = wat.length > maxChars;
    const preview = truncated
      ? `${wat.slice(0, maxChars)}\n;; ... (总共 ${wat.length} 字符，已截断) ...`
      : wat;

    if (isJson) {
      console.log(
        JSON.stringify(
          {
            success: true,
            inputPath: path.resolve(inputPath),
            outputPath: outputPath ? path.resolve(outputPath) : null,
            size: bytes.byteLength,
            lineCount,
            wat: outputPath ? undefined : preview,
          },
          null,
          2,
        ),
      );
    } else {
      if (outputPath) {
        console.log(
          `✅ WAT 反汇编文件已写入: ${path.resolve(outputPath)} (共 ${lineCount} 行)`,
        );
      } else {
        console.log(preview);
      }
    }
  } catch (error) {
    if (isJson) {
      console.log(
        JSON.stringify({success: false, error: error.message}, null, 2),
      );
    } else {
      console.error(`❌ 反汇编失败: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
