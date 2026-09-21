#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {
  TraceMap,
  originalPositionFor,
  generatedPositionFor,
  GREATEST_LOWER_BOUND,
  LEAST_UPPER_BOUND,
} from '@jridgewell/trace-mapping';

function printHelp() {
  console.log(`
lookup-symbol.js - 在 SourceMap 中双向查找混淆生成坐标与原始源码坐标

用法:
  node lookup-symbol.js --input <file.map> --line <n> --column <n> [选项]

选项:
  -i, --input <path>         SourceMap 文件路径（.map） [必需]
  -l, --line <number>        行号 (1-based) [必需]
  -c, --column <number>      列号 (0-based) [必需]
  -d, --direction <dir>      映射方向: generated_to_original | original_to_generated [默认: generated_to_original]
  -s, --source <path>        原始源文件路径（original_to_generated 方向时必需）
  -b, --bias <bias>          偏差查找策略: greatest_lower_bound | least_upper_bound [默认: greatest_lower_bound]
      --json                 以 JSON 格式输出结果
  -h, --help                 显示帮助信息

示例:
  node lookup-symbol.js -i ./dist/bundle.js.map -l 1 -c 15234
  node lookup-symbol.js -i ./dist/bundle.js.map -l 42 -c 10 -d original_to_generated -s "src/crypto.ts"
`);
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        input: {type: 'string', short: 'i'},
        line: {type: 'string', short: 'l'},
        column: {type: 'string', short: 'c'},
        direction: {
          type: 'string',
          short: 'd',
          default: 'generated_to_original',
        },
        source: {type: 'string', short: 's'},
        bias: {type: 'string', short: 'b', default: 'greatest_lower_bound'},
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
    console.error('错误: 请提供 SourceMap 输入文件路径 (--input <file>)');
    printHelp();
    process.exit(1);
  }

  if (values.line === undefined || values.column === undefined) {
    console.error('错误: 必须提供 --line 与 --column 参数');
    printHelp();
    process.exit(1);
  }

  const line = parseInt(values.line, 10);
  const column = parseInt(values.column, 10);
  const direction = values.direction;
  const source = values.source;
  const biasStr = values.bias;
  const isJson = Boolean(values.json);

  if (isNaN(line) || line < 1) {
    console.error('错误: --line 必须是大于等于 1 的正整数');
    process.exit(1);
  }
  if (isNaN(column) || column < 0) {
    console.error('错误: --column 必须是大于等于 0 的整数');
    process.exit(1);
  }

  if (direction === 'original_to_generated' && !source) {
    console.error(
      '错误: 当方向为 original_to_generated 时，必须通过 --source 指定源文件路径',
    );
    process.exit(1);
  }

  const bias =
    biasStr === 'least_upper_bound' ? LEAST_UPPER_BOUND : GREATEST_LOWER_BOUND;

  try {
    const rawContent = await readFile(path.resolve(inputPath), 'utf-8');
    const mapData = JSON.parse(rawContent);
    const tracer = new TraceMap(mapData);

    let result;
    if (direction === 'generated_to_original') {
      const pos = originalPositionFor(tracer, {line, column, bias});
      result = {
        direction,
        query: {line, column},
        match: {
          source: pos.source,
          line: pos.line,
          column: pos.column,
          name: pos.name,
        },
      };
    } else {
      const pos = generatedPositionFor(tracer, {
        source,
        line,
        column,
        bias,
      });
      result = {
        direction,
        query: {source, line, column},
        match: {
          line: pos.line,
          column: pos.column,
        },
      };
    }

    if (isJson) {
      console.log(JSON.stringify({success: true, data: result}, null, 2));
    } else {
      console.log('🎯 SourceMap 符号坐标查询结果:');
      if (direction === 'generated_to_original') {
        console.log(`   生成坐标: 行 ${line}, 列 ${column}`);
        if (result.match.source) {
          console.log(`   原始源码: ${result.match.source}`);
          console.log(
            `   原始坐标: 行 ${result.match.line}, 列 ${result.match.column}`,
          );
          if (result.match.name) {
            console.log(`   原始符号名: ${result.match.name}`);
          }
        } else {
          console.log('   未找到对应的原始源码映射');
        }
      } else {
        console.log(`   原始源码: ${source} (行 ${line}, 列 ${column})`);
        if (result.match.line !== null) {
          console.log(
            `   生成坐标: 行 ${result.match.line}, 列 ${result.match.column}`,
          );
        } else {
          console.log('   未找到对应的生成代码映射');
        }
      }
    }
  } catch (error) {
    if (isJson) {
      console.log(
        JSON.stringify({success: false, error: error.message}, null, 2),
      );
    } else {
      console.error(`❌ 查询失败: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
