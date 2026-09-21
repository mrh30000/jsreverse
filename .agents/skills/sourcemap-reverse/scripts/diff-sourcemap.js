#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {parseArgs} from 'node:util';

function printHelp() {
  console.log(`
diff-sourcemap.js - 对比两个 SourceMap 文件的文件集合与源码映射差异

用法:
  node diff-sourcemap.js --left <left.map> --right <right.map> [选项]

选项:
  -l, --left <path>          左侧 SourceMap 文件路径（旧版本/基准） [必需]
  -r, --right <path>         右侧 SourceMap 文件路径（新版本/目标） [必需]
  -m, --mode <mode>          比对模式: summary | sources | mappings [默认: summary]
      --max-changes <number> 最大输出变更数量 [默认: 200]
      --json                 以 JSON 格式输出结果
  -h, --help                 显示帮助信息

示例:
  node diff-sourcemap.js -l ./v1/app.js.map -r ./v2/app.js.map
  node diff-sourcemap.js -l ./v1/app.js.map -r ./v2/app.js.map -m sources --json
`);
}

function sha256(str) {
  if (typeof str !== 'string') return 'null';
  return createHash('sha256').update(str).digest('hex');
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        left: {type: 'string', short: 'l'},
        right: {type: 'string', short: 'r'},
        mode: {type: 'string', short: 'm', default: 'summary'},
        'max-changes': {type: 'string', default: '200'},
        json: {type: 'boolean', default: false},
        help: {type: 'boolean', short: 'h', default: false},
      },
      allowPositionals: true,
    });
  } catch (err) {
    console.error(`参数解析错误: ${err.message}`);
    process.exit(1);
  }

  const {values} = parsed;
  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (!values.left || !values.right) {
    console.error('错误: 必须同时提供 --left 和 --right 参数');
    printHelp();
    process.exit(1);
  }

  const leftPath = path.resolve(values.left);
  const rightPath = path.resolve(values.right);
  const mode = values.mode;
  const maxChanges = parseInt(values['max-changes'], 10) || 200;
  const isJson = Boolean(values.json);

  try {
    const [leftRaw, rightRaw] = await Promise.all([
      readFile(leftPath, 'utf-8'),
      readFile(rightPath, 'utf-8'),
    ]);

    const leftMap = JSON.parse(leftRaw);
    const rightMap = JSON.parse(rightRaw);

    const leftSources = Array.isArray(leftMap.sources) ? leftMap.sources : [];
    const rightSources = Array.isArray(rightMap.sources)
      ? rightMap.sources
      : [];

    const leftContents = Array.isArray(leftMap.sourcesContent)
      ? leftMap.sourcesContent
      : [];
    const rightContents = Array.isArray(rightMap.sourcesContent)
      ? rightMap.sourcesContent
      : [];

    const leftMapSet = new Map();
    for (let i = 0; i < leftSources.length; i++) {
      leftMapSet.set(leftSources[i], sha256(leftContents[i]));
    }

    const rightMapSet = new Map();
    for (let i = 0; i < rightSources.length; i++) {
      rightMapSet.set(rightSources[i], sha256(rightContents[i]));
    }

    const added = [];
    const removed = [];
    const modified = [];
    const unchanged = [];

    for (const [src, hash] of rightMapSet.entries()) {
      if (!leftMapSet.has(src)) {
        added.push(src);
      } else {
        const leftHash = leftMapSet.get(src);
        if (leftHash !== hash && (hash !== 'null' || leftHash !== 'null')) {
          modified.push(src);
        } else {
          unchanged.push(src);
        }
      }
    }

    for (const src of leftMapSet.keys()) {
      if (!rightMapSet.has(src)) {
        removed.push(src);
      }
    }

    const summary = {
      leftFile: leftPath,
      rightFile: rightPath,
      leftTotalSources: leftSources.length,
      rightTotalSources: rightSources.length,
      counts: {
        added: added.length,
        removed: removed.length,
        modified: modified.length,
        unchanged: unchanged.length,
      },
    };

    let result = {summary};
    if (mode === 'sources' || mode === 'mappings') {
      result.sourcesDiff = {
        added: added.slice(0, maxChanges),
        removed: removed.slice(0, maxChanges),
        modified: modified.slice(0, maxChanges),
      };
      if (leftMap.mappings !== rightMap.mappings) {
        result.mappingsChanged = true;
        result.leftMappingsLength = (leftMap.mappings || '').length;
        result.rightMappingsLength = (rightMap.mappings || '').length;
      } else {
        result.mappingsChanged = false;
      }
    }

    if (isJson) {
      console.log(JSON.stringify({success: true, data: result}, null, 2));
    } else {
      console.log('📊 SourceMap 比对报告');
      console.log(`   左基准: ${leftPath} (${leftSources.length} 文件)`);
      console.log(`   右目标: ${rightPath} (${rightSources.length} 文件)`);
      console.log('-------------------------------------------');
      console.log(`   ➕ 新增文件: ${added.length}`);
      console.log(`   ➖ 删除文件: ${removed.length}`);
      console.log(`   📝 修改文件: ${modified.length}`);
      console.log(`   ⚪ 未变文件: ${unchanged.length}`);

      if (mode === 'sources' || mode === 'mappings') {
        if (added.length > 0) {
          console.log('\n[新增文件 (前 10 项)]');
          added.slice(0, 10).forEach(f => console.log(`  + ${f}`));
        }
        if (removed.length > 0) {
          console.log('\n[删除文件 (前 10 项)]');
          removed.slice(0, 10).forEach(f => console.log(`  - ${f}`));
        }
        if (modified.length > 0) {
          console.log('\n[修改文件 (前 10 项)]');
          modified.slice(0, 10).forEach(f => console.log(`  ~ ${f}`));
        }
        if (mode === 'mappings') {
          console.log('\n[Mappings 状态]');
          console.log(
            `  是否变化: ${leftMap.mappings !== rightMap.mappings ? '是' : '否'}`,
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
      console.error(`❌ 对比失败: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
