#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';

const RESERVED_WINDOWS_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
// eslint-disable-next-line no-control-regex
const INVALID_PATH_CHARACTER = /[\u0000-\u001f<>:"|?*]/g;

function printHelp() {
  console.log(`
reconstruct-tree.js - 从 SourceMap 还原原始项目前端代码树

用法:
  node reconstruct-tree.js --input <file.map|file.js> --output-dir <dir> [选项]

选项:
  -i, --input <path>       SourceMap 文件路径（.map）或包含内嵌 base64 SourceMap 的 js 文件 [必需]
  -o, --output-dir <dir>   还原文件保存的目标目录 [默认: ./reconstructed]
      --overwrite          允许覆盖已存在的文件 [默认: false]
      --json               以 JSON 格式输出结果
  -h, --help               显示帮助信息

示例:
  node reconstruct-tree.js -i ./dist/app.js.map -o ./src_reconstructed
  node reconstruct-tree.js -i ./bundle.js -o ./src --overwrite --json
`);
}

function normalizeInputPath(source) {
  const slashed = source.replace(/\\/g, '/');
  const protocolMatch = slashed.match(/^([a-zA-Z0-9_-]+):\/\//);
  if (protocolMatch) {
    return slashed.slice(protocolMatch[0].length);
  }
  if (/^[a-zA-Z]:\//.test(slashed)) {
    return slashed.slice(2);
  }
  return slashed;
}

export function normalizeSourcePath(source, index) {
  const parts = [];
  const cleaned = normalizeInputPath(source);
  for (const rawPart of cleaned.split('/')) {
    if (rawPart === '' || rawPart === '.') continue;
    if (rawPart === '..') {
      parts.pop();
      continue;
    }
    let part = rawPart
      .replace(INVALID_PATH_CHARACTER, '_')
      .replace(/[. ]+$/g, '');
    if (RESERVED_WINDOWS_NAME.test(part)) part = `_${part}`;
    if (part !== '') parts.push(part);
  }
  return parts.join('/') || `source-${index}.js`;
}

function extractSourceMapFromContent(content) {
  const dataUriRegex =
    /\/\/[#@]\s*sourceMappingURL=data:application\/json;(?:charset=utf-8;)?base64,([A-Za-z0-9+/=]+)/;
  const match = content.match(dataUriRegex);
  if (match) {
    const jsonStr = Buffer.from(match[1], 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  }
  return JSON.parse(content);
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        input: {type: 'string', short: 'i'},
        'output-dir': {type: 'string', short: 'o', default: './reconstructed'},
        overwrite: {type: 'boolean', default: false},
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

  const outputDir = path.resolve(values['output-dir']);
  const overwrite = Boolean(values.overwrite);
  const isJson = Boolean(values.json);

  try {
    const rawContent = await readFile(path.resolve(inputPath), 'utf-8');
    const mapData = extractSourceMapFromContent(rawContent);

    if (!mapData || typeof mapData !== 'object') {
      throw new Error('无效的 SourceMap 数据格式');
    }

    const sources = Array.isArray(mapData.sources) ? mapData.sources : [];
    const sourcesContent = Array.isArray(mapData.sourcesContent)
      ? mapData.sourcesContent
      : [];

    if (sources.length === 0) {
      throw new Error('SourceMap 中未包含任何 sources 源文件信息');
    }

    await mkdir(outputDir, {recursive: true});

    const writtenFiles = [];
    const skippedFiles = [];
    let totalBytes = 0;

    for (let i = 0; i < sources.length; i++) {
      const rawSource = sources[i];
      const relPath = normalizeSourcePath(rawSource, i);
      const targetPath = path.resolve(outputDir, relPath);

      // 安全检查：防止路径穿越超出 outputDir
      if (
        !targetPath.startsWith(outputDir + path.sep) &&
        targetPath !== outputDir
      ) {
        skippedFiles.push({
          source: rawSource,
          reason: 'Path traversal prevented',
        });
        continue;
      }

      const fileContent = sourcesContent[i];
      if (typeof fileContent !== 'string') {
        skippedFiles.push({
          source: rawSource,
          reason: 'sourcesContent is empty or null',
        });
        continue;
      }

      // 创建父级目录
      await mkdir(path.dirname(targetPath), {recursive: true});

      try {
        await writeFile(targetPath, fileContent, {
          flag: overwrite ? 'w' : 'wx',
          encoding: 'utf-8',
        });
        const bytes = Buffer.byteLength(fileContent, 'utf-8');
        totalBytes += bytes;
        writtenFiles.push({source: rawSource, relativePath: relPath, bytes});
      } catch (err) {
        if (err.code === 'EEXIST') {
          skippedFiles.push({
            source: rawSource,
            reason: 'File exists (use --overwrite)',
          });
        } else {
          skippedFiles.push({source: rawSource, reason: err.message});
        }
      }
    }

    const summary = {
      success: true,
      input: inputPath,
      outputDir,
      totalSources: sources.length,
      writtenCount: writtenFiles.length,
      skippedCount: skippedFiles.length,
      totalBytes,
      files: writtenFiles,
      skipped: skippedFiles,
    };

    if (isJson) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log('✅ SourceMap 源码树还原完成！');
      console.log(`   目标目录: ${outputDir}`);
      console.log(
        `   成功还原: ${writtenFiles.length} 个文件 (${(totalBytes / 1024).toFixed(2)} KB)`,
      );
      if (skippedFiles.length > 0) {
        console.log(`   跳过文件: ${skippedFiles.length} 个 (无内容或已存在)`);
      }
    }
  } catch (error) {
    if (isJson) {
      console.log(
        JSON.stringify({success: false, error: error.message}, null, 2),
      );
    } else {
      console.error(`❌ 还原失败: ${error.message}`);
    }
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(
      new URL(import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1'),
    )
) {
  main();
}
