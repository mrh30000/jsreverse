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
wasm-decompile.js - 离线反编译 WebAssembly (.wasm) 文件并生成高可读性函数摘要与特征分析

用法:
  node wasm-decompile.js --input <file.wasm> [选项]

选项:
  -i, --input <path>         .wasm 文件路径 [必需]
  -o, --output <path>        输出的 .wat 文件路径
      --fold-exprs           折叠表达式块以提升可读性 [默认: true]
      --inline-export        将导出函数名直接内联到函数定义中 [默认: true]
      --max-wat-chars <n>    控制台预览时 WAT 文本截断最大字符数 [默认: 3000]
      --json                 以 JSON 格式输出完整结构与函数摘要
  -h, --help                 显示帮助信息

示例:
  node wasm-decompile.js -i ./module.wasm
  node wasm-decompile.js -i ./module.wasm -o ./module.wat --json
`);
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function parensDelta(line) {
  return countMatches(line, /\(/g) - countMatches(line, /\)/g);
}

function parseFunctionBlocks(wat) {
  const lines = wat.split('\n');
  const blocks = [];
  let inFunc = false;
  let depth = 0;
  let currentLines = [];
  let signatureLine = '';
  let currentName = 'func';
  let funcCounter = 0;

  const finishBlock = () => {
    blocks.push({
      name: currentName,
      index: funcCounter - 1,
      lines: [...currentLines],
      signatureLine,
    });
    inFunc = false;
    currentLines = [];
    signatureLine = '';
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inFunc && trimmed.startsWith('(func')) {
      inFunc = true;
      currentLines = [line];
      signatureLine = trimmed;
      const nameMatch = trimmed.match(/^\(func\s+(\$\S+)/);
      currentName = nameMatch ? nameMatch[1] : `func_${funcCounter}`;
      funcCounter += 1;
      depth = parensDelta(line);
      if (depth <= 0) {
        finishBlock();
      }
      continue;
    }

    if (inFunc) {
      currentLines.push(line);
      depth += parensDelta(line);
      if (depth <= 0) {
        finishBlock();
      }
    }
  }

  return blocks;
}

const VALUE_TYPES = 'i32|i64|f32|f64|v128';
const MEMORY_LOAD_PATTERN = new RegExp(
  `\\b(?:${VALUE_TYPES})\\.(?:load|load8|load16|load32)`,
  'g',
);
const MEMORY_STORE_PATTERN = new RegExp(
  `\\b(?:${VALUE_TYPES})\\.(?:store|store8|store16|store32)`,
  'g',
);
const CALL_PATTERN = /\bcall\b(?!_indirect)/g;
const CALL_INDIRECT_PATTERN = /\bcall_indirect\b/g;
const LOCAL_ACCESS_PATTERN = /\blocal\.(?:get|set|tee)\b/g;
const CRYPTO_NAME_PATTERN =
  /(sign|hash|encrypt|decrypt|token|nonce|sha|aes|sm3|sm4|md5)/i;

function summarizeFunction(block) {
  const text = block.lines.join('\n');
  const paramCount = countMatches(block.signatureLine, /\(param\b/g);
  const resultCount = countMatches(block.signatureLine, /\(result\b/g);
  const memoryLoadCount = countMatches(text, MEMORY_LOAD_PATTERN);
  const memoryStoreCount = countMatches(text, MEMORY_STORE_PATTERN);
  const callCount = countMatches(text, CALL_PATTERN);
  const indirectCallCount = countMatches(text, CALL_INDIRECT_PATTERN);
  const localAccessCount = countMatches(text, LOCAL_ACCESS_PATTERN);
  const instructionCount = block.lines
    .map(l => l.trim())
    .filter(
      l => l.length > 0 && !l.startsWith('(func') && !l.startsWith(')'),
    ).length;

  const suspiciousTags = [];
  if (memoryLoadCount + memoryStoreCount >= 8)
    suspiciousTags.push('memory-heavy');
  if (indirectCallCount > 0) suspiciousTags.push('indirect-call');
  if (CRYPTO_NAME_PATTERN.test(block.name)) suspiciousTags.push('crypto-name');
  if (callCount >= 8) suspiciousTags.push('dispatcher-like');
  if (paramCount >= 2 && resultCount <= 1 && memoryStoreCount > 0)
    suspiciousTags.push('ptr-len-transform');

  return {
    name: block.name,
    index: block.index,
    paramCount,
    resultCount,
    instructionCount,
    callCount,
    indirectCallCount,
    memoryLoadCount,
    memoryStoreCount,
    localAccessCount,
    suspiciousTags,
    preview: block.lines.slice(0, 8).map(l => l.trim()),
  };
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        input: {type: 'string', short: 'i'},
        output: {type: 'string', short: 'o'},
        'fold-exprs': {type: 'string', default: 'true'},
        'inline-export': {type: 'string', default: 'true'},
        'max-wat-chars': {type: 'string', default: '3000'},
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
  const foldExprs = values['fold-exprs'] !== 'false';
  const inlineExport = values['inline-export'] !== 'false';
  const maxWatChars = parseInt(values['max-wat-chars'], 10) || 3000;
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
      memory64: true,
      extended_const: true,
      relaxed_simd: true,
    });

    let wat;
    try {
      module.generateNames();
      module.applyNames();
      wat = module.toText({
        foldExprs,
        inlineExport,
      });
    } finally {
      module.destroy();
    }

    if (outputPath) {
      await writeFile(path.resolve(outputPath), wat, 'utf-8');
    }

    const blocks = parseFunctionBlocks(wat);
    const functionSummaries = blocks
      .map(summarizeFunction)
      .sort(
        (a, b) =>
          b.memoryLoadCount +
          b.memoryStoreCount +
          b.callCount +
          b.indirectCallCount -
          (a.memoryLoadCount +
            a.memoryStoreCount +
            a.callCount +
            a.indirectCallCount),
      );

    const importCount = countMatches(wat, /^\s*\(import\b/gm);
    const exportCount = countMatches(wat, /\(export\s+"/g);

    const data = {
      inputPath: path.resolve(inputPath),
      outputPath: outputPath ? path.resolve(outputPath) : null,
      size: bytes.byteLength,
      lineCount: wat.split('\n').length,
      functionCount: functionSummaries.length,
      importCount,
      exportCount,
      functionSummaries,
      watPreview:
        wat.length > maxWatChars
          ? `${wat.slice(0, maxWatChars)}\n;; ... (剩余 ${wat.length - maxWatChars} 字符已截断) ...`
          : wat,
    };

    if (isJson) {
      console.log(JSON.stringify({success: true, data}, null, 2));
    } else {
      console.log('⚡ WebAssembly 反编译完成:');
      console.log(
        `   文件: ${path.resolve(inputPath)} (${bytes.byteLength} 字节)`,
      );
      console.log(
        `   函数: ${functionSummaries.length} 个 | 导入: ${importCount} 个 | 导出: ${exportCount} 个`,
      );
      if (outputPath) {
        console.log(`   WAT 文件已保存至: ${path.resolve(outputPath)}`);
      }

      console.log('\n🔍 核心/高负载函数列表 (按复杂度排序):');
      functionSummaries.slice(0, 10).forEach(fn => {
        const tags =
          fn.suspiciousTags.length > 0
            ? ` [${fn.suspiciousTags.join(', ')}]`
            : '';
        console.log(
          `   - ${fn.name}: 指令 ${fn.instructionCount} 条, 内存读写 ${fn.memoryLoadCount + fn.memoryStoreCount}, 调用 ${fn.callCount}${tags}`,
        );
      });

      console.log('\n📄 WAT 代码片段预览:');
      console.log(
        '------------------------------------------------------------',
      );
      console.log(data.watPreview);
    }
  } catch (error) {
    if (isJson) {
      console.log(
        JSON.stringify({success: false, error: error.message}, null, 2),
      );
    } else {
      console.error(`❌ 反编译失败: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
