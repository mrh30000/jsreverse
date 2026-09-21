#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../');
const BLUEPRINTS_DIR = path.join(
  REPO_ROOT,
  'docs/knowledge/parameter-blueprints',
);

function printHelp() {
  console.log(`
query-blueprint.js - 离线检索与查看平台逆向算法蓝图 (JD h5st, 抖音 a_bogus, 快手 falcon 等)

用法:
  node query-blueprint.js [选项]

选项:
  -l, --list             列出所有已收录的算法蓝图概览
      --id <id>          按蓝图 ID 或别名查看详细结构、parts 分解与工作流 (如 jd-h5st, a_bogus)
  -q, --query <text>     根据关键词或自然语言描述模糊推荐最匹配的蓝图
      --json             以 JSON 格式输出结果
  -h, --help             显示帮助信息

示例:
  node query-blueprint.js --list
  node query-blueprint.js --id jd-h5st
  node query-blueprint.js -q "抖音 resource list 签名"
  node query-blueprint.js --id douyin-a-bogus --json
`);
}

async function loadIndex() {
  const indexPath = path.join(BLUEPRINTS_DIR, 'index.json');
  const raw = await readFile(indexPath, 'utf-8');
  return JSON.parse(raw);
}

async function loadBlueprintDetail(relPath) {
  const bpDir = path.join(BLUEPRINTS_DIR, relPath);
  const metadataPath = path.join(bpDir, 'metadata.json');
  const partsPath = path.join(bpDir, 'parts.json');
  const mutationsPath = path.join(bpDir, 'mutations.json');
  const workflowPath = path.join(bpDir, 'workflow.md');

  const metaRaw = await readFile(metadataPath, 'utf-8');
  const metadata = JSON.parse(metaRaw);

  let parts = null;
  try {
    const partsRaw = await readFile(partsPath, 'utf-8');
    parts = JSON.parse(partsRaw);
  } catch {
    // optional
  }

  let mutations = null;
  try {
    const mutRaw = await readFile(mutationsPath, 'utf-8');
    mutations = JSON.parse(mutRaw);
  } catch {
    // optional
  }

  let workflow = null;
  try {
    workflow = await readFile(workflowPath, 'utf-8');
  } catch {
    // optional
  }

  return {
    metadata,
    parts,
    mutations,
    workflow,
  };
}

function scoreWorkflow(item, queryLower) {
  let score = 0;
  if (item.id.toLowerCase() === queryLower) score += 100;
  if (item.id.toLowerCase().includes(queryLower)) score += 40;
  if (Array.isArray(item.aliases)) {
    for (const alias of item.aliases) {
      if (alias.toLowerCase() === queryLower) score += 90;
      else if (alias.toLowerCase().includes(queryLower)) score += 35;
    }
  }
  if (Array.isArray(item.keywords)) {
    for (const kw of item.keywords) {
      if (kw.toLowerCase() === queryLower) score += 80;
      else if (
        queryLower.includes(kw.toLowerCase()) ||
        kw.toLowerCase().includes(queryLower)
      )
        score += 30;
    }
  }
  if (item.summary && item.summary.toLowerCase().includes(queryLower)) {
    score += 25;
  }
  return score;
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        list: {type: 'boolean', short: 'l', default: false},
        id: {type: 'string'},
        query: {type: 'string', short: 'q'},
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
  if (
    values.help ||
    (!values.list && !values.id && !values.query && positionals.length === 0)
  ) {
    printHelp();
    process.exit(0);
  }

  const isJson = Boolean(values.json);
  const index = await loadIndex();
  const workflows = index.workflows || [];

  if (values.list) {
    if (isJson) {
      console.log(
        JSON.stringify(
          {success: true, count: workflows.length, workflows},
          null,
          2,
        ),
      );
    } else {
      console.log(`📋 已收录逆向算法蓝图库 (共 ${workflows.length} 个):`);
      console.log(
        '------------------------------------------------------------',
      );
      for (const wf of workflows) {
        console.log(`🔹 [${wf.id}] (${wf.category} | ${wf.status})`);
        console.log(`   简介: ${wf.summary}`);
        if (wf.aliases && wf.aliases.length > 0) {
          console.log(`   别名: ${wf.aliases.join(', ')}`);
        }
        console.log('');
      }
    }
    return;
  }

  const targetId = values.id || positionals[0];
  if (targetId && !values.query) {
    const queryLower = targetId.toLowerCase().trim();
    const matched = workflows.find(
      w =>
        w.id.toLowerCase() === queryLower ||
        (Array.isArray(w.aliases) &&
          w.aliases.some(a => a.toLowerCase() === queryLower)),
    );

    if (!matched) {
      if (isJson) {
        console.log(
          JSON.stringify(
            {success: false, error: `未找到 ID 或别名为 "${targetId}" 的蓝图`},
            null,
            2,
          ),
        );
      } else {
        console.error(
          `❌ 未找到 ID 或别名为 "${targetId}" 的蓝图。使用 --list 查看所有可用蓝图。`,
        );
      }
      process.exit(1);
    }

    const detail = await loadBlueprintDetail(matched.path);
    if (isJson) {
      console.log(JSON.stringify({success: true, data: detail}, null, 2));
    } else {
      console.log(
        `📖 算法蓝图详情: ${detail.metadata.title} (${detail.metadata.id})`,
      );
      console.log(
        `   分类: ${detail.metadata.category} | 状态: ${detail.metadata.status} | 版本: ${detail.metadata.version}`,
      );
      console.log(`   描述: ${detail.metadata.summary}`);
      if (detail.metadata.aliases?.length) {
        console.log(`   别名: ${detail.metadata.aliases.join(', ')}`);
      }
      if (detail.parts) {
        console.log('\n🧩 参数分解 (Parts):');
        const items = detail.parts.parts || detail.parts.items || detail.parts;
        if (Array.isArray(items)) {
          for (const p of items) {
            console.log(
              `   - [${p.name || p.id}]: ${p.description || p.summary || ''}`,
            );
          }
        } else {
          console.log(JSON.stringify(detail.parts, null, 2));
        }
      }
      if (detail.mutations) {
        console.log('\n⚡ 变异与排查规则 (Mutations):');
        const muts = detail.mutations.mutations || detail.mutations;
        if (Array.isArray(muts)) {
          for (const m of muts) {
            console.log(`   * ${m.name || m.rule || m.description}`);
          }
        }
      }
      if (detail.workflow) {
        console.log('\n📝 逆向排查工作流:');
        console.log(
          detail.workflow.slice(0, 500) +
            (detail.workflow.length > 500
              ? '\n... (详见 docs/knowledge/parameter-blueprints)'
              : ''),
        );
      }
    }
    return;
  }

  if (values.query) {
    const queryLower = values.query.toLowerCase().trim();
    const scored = workflows
      .map(wf => ({wf, score: scoreWorkflow(wf, queryLower)}))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      if (isJson) {
        console.log(
          JSON.stringify(
            {success: false, message: '未找到匹配的蓝图'},
            null,
            2,
          ),
        );
      } else {
        console.log(
          `🔍 未找到与 "${values.query}" 相关的蓝图。可使用 --list 查看所有可用蓝图。`,
        );
      }
      return;
    }

    const best = scored[0].wf;
    const detail = await loadBlueprintDetail(best.path);

    if (isJson) {
      console.log(
        JSON.stringify(
          {
            success: true,
            bestMatch: best.id,
            matches: scored.map(s => ({id: s.wf.id, score: s.score})),
            data: detail,
          },
          null,
          2,
        ),
      );
    } else {
      console.log(
        `✨ 针对 "${values.query}" 的最佳匹配蓝图: ${best.id} (匹配分: ${scored[0].score})`,
      );
      console.log(`   标题: ${detail.metadata.title}`);
      console.log(`   简介: ${detail.metadata.summary}`);
      console.log(`   查看详情命令: node query-blueprint.js --id ${best.id}`);
    }
  }
}

main();
