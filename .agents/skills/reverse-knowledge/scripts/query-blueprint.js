#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 *
 * query-blueprint.js - 离线检索平台签名参数蓝图库
 *
 * 数据目录解析顺序（第一个存在的胜出，可用 --where 查看实际命中）：
 *   1. --data <dir>
 *   2. $REVERSE_KNOWLEDGE_DATA
 *   3. <skill-root>/data/blueprints            （自包含，推荐）
 *   4. <repo-root>/docs/knowledge/parameter-blueprints （历史兼容）
 *   5. <cwd>/docs/knowledge/parameter-blueprints
 *
 * 退出码：0 正常 / 1 数据缺失或未命中 / 2 用法错误
 */

import {readFile, mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/** 技能根目录（本文件位于 <skill>/scripts/） */
const SKILL_ROOT = path.resolve(__dirname, '..');
/** 仓库根目录（<skill> 位于 <repo>/.claude/skills/ 或 <repo>/.agents/skills/） */
const REPO_ROOT = path.resolve(SKILL_ROOT, '..', '..', '..');

const CANDIDATES = [
  {from: 'flag', dir: null},
  {from: 'env', dir: process.env.REVERSE_KNOWLEDGE_DATA || null},
  {from: 'skill', dir: path.join(SKILL_ROOT, 'data', 'blueprints')},
  {
    from: 'repo-docs',
    dir: path.join(REPO_ROOT, 'docs', 'knowledge', 'parameter-blueprints'),
  },
  {
    from: 'cwd-docs',
    dir: path.join(process.cwd(), 'docs', 'knowledge', 'parameter-blueprints'),
  },
];

function printHelp() {
  console.log(`
query-blueprint.js - 离线检索与查看平台逆向算法蓝图（抖音 a_bogus、京东 h5st、知乎 x-zse-96 …）

用法:
  node query-blueprint.js [选项]

选项:
  -l, --list             列出所有已收录的算法蓝图概览
      --id <id>          按蓝图 ID 或别名查看详细结构、parts 分解与工作流（如 jd-h5st, a_bogus）
  -q, --query <text>     根据关键词或自然语言描述模糊推荐最匹配的蓝图
      --data <dir>       显式指定蓝图库目录（覆盖自动发现）
      --where            只打印实际命中的蓝图库目录
      --selftest         跑内置自检（含失败分支），打印断言通过数
      --json             以 JSON 格式输出结果
  -h, --help             显示帮助信息

示例:
  node query-blueprint.js --list
  node query-blueprint.js --id jd-h5st
  node query-blueprint.js -q "抖音 resource list 签名"
  node query-blueprint.js --id douyin-a-bogus --json
`);
}

/** 解析蓝图库目录；全部候选都不存在时抛可读错误。 */
function resolveDataDir(explicit) {
  if (explicit) {
    if (!existsSync(explicit)) {
      throw new Error(
        `--data 指定的目录不存在: ${explicit}\n` +
          '  提示：蓝图库目录内必须含 index.json 与各蓝图的 metadata.json',
      );
    }
    return {dir: explicit, from: 'flag'};
  }
  const tried = [];
  for (const c of CANDIDATES) {
    if (!c.dir) continue;
    tried.push(c);
    if (existsSync(path.join(c.dir, 'index.json'))) {
      return {dir: c.dir, from: c.from};
    }
  }
  const lines = tried.map(c => `  - [${c.from}] ${c.dir}`).join('\n');
  throw new Error(
    '蓝图库数据目录未找到（以下候选均无 index.json）：\n' +
      lines +
      '\n  修复：确认技能目录下 data/blueprints/index.json 存在，或用 --data 指定。',
  );
}

async function readJson(p) {
  return JSON.parse(await readFile(p, 'utf-8'));
}

async function loadIndex(dataDir) {
  const index = await readJson(path.join(dataDir, 'index.json'));
  if (!index || !Array.isArray(index.blueprints)) {
    throw new Error(
      `index.json 结构不合法：缺少顶层 blueprints 数组（${path.join(dataDir, 'index.json')}）`,
    );
  }
  return index;
}

async function readOptional(p) {
  try {
    return await readFile(p, 'utf-8');
  } catch {
    return null;
  }
}

async function loadBlueprintDetail(dataDir, relPath) {
  const bpDir = path.join(dataDir, relPath);
  const metadata = await readJson(path.join(bpDir, 'metadata.json'));
  const partsRaw = await readOptional(path.join(bpDir, 'parts.json'));
  const mutRaw = await readOptional(path.join(bpDir, 'mutations.json'));
  const workflow = await readOptional(path.join(bpDir, 'workflow.md'));
  return {
    metadata,
    parts: partsRaw ? JSON.parse(partsRaw) : null,
    mutations: mutRaw ? JSON.parse(mutRaw) : null,
    workflow,
  };
}

function scoreBlueprint(item, queryLower) {
  let score = 0;
  const tokens = queryLower.split(/[\s,，/]+/).filter(Boolean);
  if (item.id.toLowerCase() === queryLower) score += 100;
  if (item.id.toLowerCase().includes(queryLower)) score += 40;
  for (const alias of item.aliases || []) {
    const a = alias.toLowerCase();
    if (a === queryLower) score += 90;
    else if (a.includes(queryLower) || queryLower.includes(a)) score += 35;
    else if (tokens.some(t => t.length > 1 && a.includes(t))) score += 12;
  }
  for (const kw of item.keywords || []) {
    const k = kw.toLowerCase();
    if (k === queryLower) score += 80;
    else if (queryLower.includes(k) || k.includes(queryLower)) score += 30;
    else if (tokens.some(t => t.length > 1 && (k.includes(t) || t.includes(k)))) {
      score += 20;
    }
  }
  if (item.summary && item.summary.toLowerCase().includes(queryLower)) score += 25;
  return score;
}

function findByIdOrAlias(blueprints, targetId) {
  const q = targetId.toLowerCase().trim();
  return blueprints.find(
    b =>
      b.id.toLowerCase() === q ||
      (b.aliases || []).some(a => a.toLowerCase() === q),
  );
}

function renderList(blueprints, dataDir, isJson) {
  if (isJson) {
    console.log(
      JSON.stringify(
        {success: true, dataDir, count: blueprints.length, blueprints},
        null,
        2,
      ),
    );
    return;
  }
  console.log(`📋 已收录逆向算法蓝图库 (共 ${blueprints.length} 个)  ← ${dataDir}`);
  console.log('------------------------------------------------------------');
  for (const b of blueprints) {
    console.log(`🔹 [${b.id}] (${b.category} | ${b.status})`);
    console.log(`   简介: ${b.summary}`);
    if (b.aliases && b.aliases.length > 0) {
      console.log(`   别名: ${b.aliases.join(', ')}`);
    }
    console.log('');
  }
}

function renderDetail(detail, isJson) {
  if (isJson) {
    console.log(JSON.stringify({success: true, data: detail}, null, 2));
    return;
  }
  const m = detail.metadata;
  console.log(`📖 算法蓝图详情: ${m.title} (${m.id})`);
  console.log(`   分类: ${m.category} | 状态: ${m.status} | 版本: ${m.version}`);
  console.log(`   描述: ${m.summary}`);
  if (m.aliases && m.aliases.length) {
    console.log(`   别名: ${m.aliases.join(', ')}`);
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
      for (const mu of muts) {
        console.log(`   * ${mu.name || mu.rule || mu.description}`);
      }
    }
  }
  if (detail.workflow) {
    console.log('\n📝 逆向排查工作流:');
    console.log(
      detail.workflow.slice(0, 800) +
        (detail.workflow.length > 800 ? '\n... (完整内容见该蓝图的 workflow.md)' : ''),
    );
  }
}

/**
 * 决定本次调用的动作。抽成纯函数是为了能在 --selftest 里断言路由本身
 * （B17 实测踩过：`--data <不存在的目录>` 既不校验也不报错，
 *   因为「无动作 ⇒ 打 help」的判断排在 `--data` 之前，会静默吞掉坏参数）。
 * @returns {'help'|'where'|'list'|'id'|'query'}
 */
function decideAction(values, positionals) {
  if (values.help) return 'help';
  if (values.list) return 'list';
  if (values.query) return 'query';
  if (values.id) return 'id';
  if (values.where) return 'where';
  if (positionals.length > 0) return 'id';
  // 只给了 --data：当作 where（校验目录可达性并打印），不要静默打 help
  if (values.data) return 'where';
  return 'help';
}

/* ------------------------------------------------------------------ */
/* selftest                                                            */
/* ------------------------------------------------------------------ */

let assertions = 0;
const failures = [];
function assert(cond, label) {
  assertions += 1;
  if (!cond) failures.push(label);
}

async function makeFixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'rk-blueprint-'));
  const bp = path.join(dir, 'demo-platform');
  await mkdir(bp, {recursive: true});
  await writeFile(
    path.join(dir, 'index.json'),
    JSON.stringify({
      schemaVersion: 1,
      blueprints: [
        {
          id: 'demo-sign',
          path: 'demo-platform',
          title: '演示签名',
          category: 'platform-signature',
          status: 'active',
          summary: '演示用蓝图，仅存在于 selftest 夹具中',
          aliases: ['demo', 'demo_aliases'],
          keywords: ['演示', 'demo', 'sign'],
        },
      ],
    }),
    'utf-8',
  );
  await writeFile(
    path.join(bp, 'metadata.json'),
    JSON.stringify({
      id: 'demo-sign',
      title: '演示签名',
      category: 'platform-signature',
      status: 'active',
      version: '1.0.0',
      summary: '演示用蓝图',
      aliases: ['demo'],
    }),
    'utf-8',
  );
  await writeFile(
    path.join(bp, 'parts.json'),
    JSON.stringify({parts: [{name: 't', description: '时间戳'}]}),
    'utf-8',
  );
  await writeFile(
    path.join(bp, 'mutations.json'),
    JSON.stringify({mutations: [{name: '时间戳单位', rule: '毫秒'}]}),
    'utf-8',
  );
  await writeFile(path.join(bp, 'workflow.md'), '# 演示\n1. 打开页面\n', 'utf-8');
  return dir;
}

/** 捕获 console.log 输出 */
function capture(fn) {
  const lines = [];
  const orig = console.log;
  console.log = (...a) => lines.push(a.join(' '));
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      return r.then(v => {
        console.log = orig;
        return {value: v, out: lines.join('\n')};
      });
    }
    console.log = orig;
    return Promise.resolve({value: r, out: lines.join('\n')});
  } catch (err) {
    console.log = orig;
    return Promise.reject(err);
  }
}

async function selftest() {
  const dir = await makeFixture();
  try {
    // 1) 自动发现：夹具不在默认候选里 ⇒ 必须靠 --data 命中
    const r1 = await capture(() =>
      resolveDataDir(dir),
    );
    assert(r1.value.from === 'flag', 'S1 --data 命中且 from=flag');
    assert(r1.value.dir === dir, 'S1 目录等于传入值');

    // 2) 不存在的 --data ⇒ 抛错（失败分支）
    let threw = null;
    try {
      resolveDataDir(path.join(dir, 'nope'));
    } catch (e) {
      threw = e;
    }
    assert(threw !== null, 'S2 不存在的 --data 必须抛错');
    assert(
      threw && /不存在/.test(threw.message),
      'S2 错误信息可读（含"不存在"）',
    );

    // 3) 候选全空 ⇒ 抛错并列出所有候选（失败分支）
    const origEnv = process.env.REVERSE_KNOWLEDGE_DATA;
    delete process.env.REVERSE_KNOWLEDGE_DATA;
    let threw2 = null;
    try {
      resolveDataDir(null);
    } catch (e) {
      threw2 = e;
    }
    if (origEnv === undefined) delete process.env.REVERSE_KNOWLEDGE_DATA;
    else process.env.REVERSE_KNOWLEDGE_DATA = origEnv;
    assert(
      threw2 !== null || existsSync(path.join(SKILL_ROOT, 'data', 'blueprints')),
      'S3 无数据目录时必须抛错（除非技能自带 data/blueprints）',
    );

    // 4) index 结构校验：缺 blueprints 数组必须抛错（失败分支）
    const badDir = await mkdtemp(path.join(os.tmpdir(), 'rk-bad-'));
    await writeFile(path.join(badDir, 'index.json'), '{"workflows":[]}', 'utf-8');
    let threw3 = null;
    try {
      await loadIndex(badDir);
    } catch (e) {
      threw3 = e;
    }
    assert(threw3 !== null, 'S4 index.json 缺 blueprints 数组必须抛错');
    await rm(badDir, {recursive: true, force: true});

    // 5) 索引与详情可读
    const index = await loadIndex(dir);
    assert(index.blueprints.length === 1, 'S5 index 解析出 1 个蓝图');
    const detail = await loadBlueprintDetail(dir, index.blueprints[0].path);
    assert(detail.metadata.id === 'demo-sign', 'S5 metadata.id 正确');
    assert(detail.parts.parts.length === 1, 'S5 parts 可读');
    assert(detail.mutations.mutations.length === 1, 'S5 mutations 可读');
    assert(detail.workflow.includes('演示'), 'S5 workflow.md 可读');

    // 6) 可选文件缺失不报错
    const bareDir = await mkdtemp(path.join(os.tmpdir(), 'rk-bare-'));
    await mkdir(path.join(bareDir, 'x'), {recursive: true});
    await writeFile(
      path.join(bareDir, 'x', 'metadata.json'),
      JSON.stringify({id: 'x', title: 'x', category: 'c', status: 'unknown', version: '0', summary: 's'}),
      'utf-8',
    );
    const bare = await loadBlueprintDetail(bareDir, 'x');
    assert(bare.parts === null && bare.workflow === null, 'S6 缺失 parts/workflow 返回 null 不抛错');
    await rm(bareDir, {recursive: true, force: true});

    // 7) 检索：id / 别名 / 关键词
    const bps = index.blueprints;
    assert(findByIdOrAlias(bps, 'demo-sign') !== undefined, 'S7 按 id 命中');
    assert(findByIdOrAlias(bps, 'demo') !== undefined, 'S7 按别名命中');
    assert(findByIdOrAlias(bps, 'DEMO-SIGN') !== undefined, 'S7 大小写不敏感');
    assert(findByIdOrAlias(bps, 'nope') === undefined, 'S7 未命中返回 undefined（失败分支）');
    assert(scoreBlueprint(bps[0], 'demo-sign') >= 100, 'S7 精确 id 得分 ≥100');
    assert(scoreBlueprint(bps[0], '演示') > 0, 'S7 中文关键词命中');
    assert(
      scoreBlueprint(bps[0], '演示 sign 参数') > 0,
      'S7 多词自然语言命中（分词）',
    );
    assert(scoreBlueprint(bps[0], 'zzzz') === 0, 'S7 无关词得分为 0（反例）');

    // 7.5) 路由决策（回归：--data 坏路径必须走到 where ⇒ 由 resolveDataDir 报错，
    //       而不是因为"没有动作"静默打 help 并 exit 0）
    assert(decideAction({}, []) === 'help', 'S9 无参数 ⇒ help');
    assert(decideAction({help: true}, []) === 'help', 'S9 --help ⇒ help');
    assert(decideAction({data: 'x'}, []) === 'where', 'S9 仅 --data ⇒ where（不得静默 help）');
    assert(decideAction({where: true}, []) === 'where', 'S9 --where ⇒ where');
    assert(decideAction({list: true, data: 'x'}, []) === 'list', 'S9 --list 优先于 --data');
    assert(decideAction({query: 'q', id: 'i'}, []) === 'query', 'S9 --query 优先于 --id');
    assert(decideAction({id: 'i'}, []) === 'id', 'S9 --id ⇒ id');
    assert(decideAction({}, ['a_bogus']) === 'id', 'S9 位置参数 ⇒ id');
    assert(
      decideAction({list: true, query: 'q'}, []) === 'list',
      'S9 --list 优先于 --query',
    );

    // 8) 渲染不抛错且含关键字段
    const out1 = await capture(() => renderList(bps, dir, false));
    assert(out1.out.includes('demo-sign'), 'S8 list 文本含 id');
    const out2 = await capture(() => renderDetail(detail, false));
    assert(out2.out.includes('演示签名'), 'S8 detail 文本含标题');
    assert(out2.out.includes('时间戳'), 'S8 detail 文本含 parts');
    const out3 = await capture(() => renderList(bps, dir, true));
    assert(JSON.parse(out3.out).count === 1, 'S8 list --json 是合法 JSON');
  } finally {
    await rm(dir, {recursive: true, force: true});
  }

  if (failures.length) {
    console.error(`❌ selftest 失败 ${failures.length}/${assertions}`);
    for (const f of failures) console.error(`   - ${f}`);
    process.exit(1);
  }
  console.log(`✅ selftest 通过 ${assertions}/${assertions}`);
}

/* ------------------------------------------------------------------ */

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        list: {type: 'boolean', short: 'l', default: false},
        id: {type: 'string'},
        query: {type: 'string', short: 'q'},
        data: {type: 'string'},
        where: {type: 'boolean', default: false},
        selftest: {type: 'boolean', default: false},
        json: {type: 'boolean', default: false},
        help: {type: 'boolean', short: 'h', default: false},
      },
      allowPositionals: true,
    });
  } catch (err) {
    console.error(`参数解析错误: ${err.message}`);
    process.exit(2);
  }

  const {values, positionals} = parsed;

  if (values.selftest) {
    await selftest();
    return;
  }

  const action = decideAction(values, positionals);
  if (action === 'help') {
    printHelp();
    return;
  }

  const isJson = Boolean(values.json);
  // 注意：resolveDataDir 在 where/list/id/query 四条路上都要先跑，
  // 这样 `--data <坏路径>` 在任何动作下都会以可读错误 exit 1，而不是静默打 help。
  const resolved = resolveDataDir(values.data);
  const dataDir = resolved.dir;

  if (action === 'where') {
    if (isJson) {
      console.log(JSON.stringify({success: true, dataDir, from: resolved.from}, null, 2));
    } else {
      console.log(`${dataDir}  (来源: ${resolved.from})`);
    }
    return;
  }

  const index = await loadIndex(dataDir);
  const blueprints = index.blueprints;

  if (action === 'list') {
    renderList(blueprints, dataDir, isJson);
    return;
  }

  const targetId = values.id || (action === 'id' ? positionals[0] : null);
  if (action === 'id' && targetId) {
    const matched = findByIdOrAlias(blueprints, targetId);
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
    const detail = await loadBlueprintDetail(dataDir, matched.path);
    renderDetail(detail, isJson);
    return;
  }

  if (action === 'query') {
    const q = values.query.toLowerCase().trim();
    const scored = blueprints
      .map(b => ({b, score: scoreBlueprint(b, q)}))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);
    if (scored.length === 0) {
      if (isJson) {
        console.log(
          JSON.stringify({success: false, message: '未找到匹配的蓝图'}, null, 2),
        );
      } else {
        console.log(
          `🔍 未找到与 "${values.query}" 相关的蓝图。可使用 --list 查看所有可用蓝图。`,
        );
      }
      return;
    }
    const best = scored[0].b;
    if (isJson) {
      const detail = await loadBlueprintDetail(dataDir, best.path);
      console.log(
        JSON.stringify(
          {
            success: true,
            bestMatch: best.id,
            matches: scored.map(s => ({id: s.b.id, score: s.score})),
            data: detail,
          },
          null,
          2,
        ),
      );
      return;
    }
    console.log(
      `✨ 针对 "${values.query}" 的最佳匹配蓝图: ${best.id} (匹配分: ${scored[0].score})`,
    );
    console.log(`   标题: ${best.title}`);
    console.log(`   简介: ${best.summary}`);
    if (scored.length > 1) {
      console.log(
        `   其它候选: ${scored
          .slice(1, 4)
          .map(s => `${s.b.id}(${s.score})`)
          .join(', ')}`,
      );
    }
    console.log(`   查看详情命令: node query-blueprint.js --id ${best.id}`);
  }
}

main().catch(err => {
  console.error(`❌ ${err && err.message ? err.message : err}`);
  process.exit(1);
});
