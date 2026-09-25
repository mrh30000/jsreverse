#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 *
 * blueprint-lint.js - 平台签名参数蓝图库的结构与溯源校验器
 *
 * 校验内容：
 *   1. index.json 结构（schemaVersion / blueprints 非空 / id 唯一 / path 存在）
 *   2. 每个蓝图的 metadata.json 必填字段与枚举值，且与 index 条目一致
 *   3. parts.json / mutations.json 的字段完整性（存在即校验）
 *   4. workflow.md 非空且含编号步骤
 *   5. 目录孤儿（存在于磁盘但未被 index 引用）与悬空引用（index 指向不存在的目录）
 *   6. 来源可追溯：metadata.sources[].file 必须真实存在于 --repo 下
 *   7. 来源行号：sources[].line 若给出，必须是正整数
 *
 * 退出码：0 通过（可有 warn）/ 1 存在 error / 2 用法错误
 */

import {readFile, readdir, mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILL_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SKILL_ROOT, '..', '..', '..');

const CATEGORIES = new Set([
  'platform-signature',
  'platform-token',
  'platform-request-params',
  'platform-protocol',
  'platform-antibot',
  'generic',
]);
const STATUSES = new Set(['active', 'historical', 'unknown', 'partial']);
const ALGO_FAMILIES = new Set([
  'hash',
  'hmac',
  'symmetric',
  'asymmetric',
  'national',
  'table',
  'xor',
  'custom',
  'none',
  // 'unknown' 是合法值：源文章（尤其截图型）常只给定位不给算法，
  // 如实标 unknown 比硬归到某一族更负责。
  'unknown',
]);

const errors = [];
const warns = [];
function err(where, msg) {
  errors.push(`${where}: ${msg}`);
}
function warn(where, msg) {
  warns.push(`${where}: ${msg}`);
}

async function readJsonOrNull(p) {
  try {
    return JSON.parse(await readFile(p, 'utf-8'));
  } catch {
    return null;
  }
}

async function lintBlueprint(dataDir, entry, repoRoot, allIds) {
  const where = `blueprint[${entry && entry.id ? entry.id : '?'}]`;
  if (!entry || typeof entry !== 'object') {
    err(where, 'index 条目不是对象');
    return;
  }
  for (const f of ['id', 'path', 'title', 'category', 'status', 'summary']) {
    if (!entry[f] || typeof entry[f] !== 'string') err(where, `index 缺字段 ${f}`);
  }
  if (entry.id && !/^[a-z0-9][a-z0-9._-]*$/.test(entry.id)) {
    err(where, `id "${entry.id}" 应为小写字母数字与 . _ -`);
  }
  if (entry.category && !CATEGORIES.has(entry.category)) {
    err(where, `category "${entry.category}" 不在允许集合 ${[...CATEGORIES].join('/')}`);
  }
  if (entry.status && !STATUSES.has(entry.status)) {
    err(where, `status "${entry.status}" 不在允许集合 ${[...STATUSES].join('/')}`);
  }
  if (entry.path && (path.isAbsolute(entry.path) || entry.path.includes('..'))) {
    err(where, `path "${entry.path}" 必须是蓝图库内的相对路径`);
    return;
  }
  const bpDir = path.join(dataDir, entry.path || '');
  if (!existsSync(bpDir)) {
    err(where, `path 指向的目录不存在: ${entry.path}`);
    return;
  }

  const meta = await readJsonOrNull(path.join(bpDir, 'metadata.json'));
  if (!meta) {
    err(where, '缺少或无法解析 metadata.json');
  } else {
    for (const f of ['id', 'title', 'category', 'status', 'version', 'summary']) {
      if (!meta[f] || typeof meta[f] !== 'string') {
        err(where, `metadata 缺字段 ${f}`);
      }
    }
    if (meta.id !== entry.id) {
      err(where, `metadata.id "${meta.id}" 与 index.id "${entry.id}" 不一致`);
    }
    if (meta.category && !CATEGORIES.has(meta.category)) {
      err(where, `metadata.category "${meta.category}" 非法`);
    }
    if (meta.status && !STATUSES.has(meta.status)) {
      err(where, `metadata.status "${meta.status}" 非法`);
    }
    if (meta.aliases !== undefined && !Array.isArray(meta.aliases)) {
      err(where, 'metadata.aliases 必须是数组');
    }
    // ★★ 承 B38「下一批优先级 ④」：`dependencies` 此前是**已登记但未设防**的字段
    //   （在 schema 里写了，但 lint 既不查类型、也不查引用是否存在 ⇒ 写错会静默生效）。
    //   本批按 B38 定的两条最小校验落地，并配**会失败的夹具**（否则又是一条恒亮的检查）。
    if (meta.dependencies !== undefined) {
      if (!Array.isArray(meta.dependencies)) {
        err(where, 'metadata.dependencies 必须是数组');
      } else {
        const seenDep = new Set();
        for (let i = 0; i < meta.dependencies.length; i++) {
          const d = meta.dependencies[i];
          if (typeof d !== 'string' || !d.trim()) {
            err(where, `metadata.dependencies[${i}] 必须是非空字符串`);
            continue;
          }
          if (d === meta.id) {
            err(where, `metadata.dependencies[${i}] 不得自指（"${d}" == 本蓝图 id）`);
          }
          if (seenDep.has(d)) err(where, `metadata.dependencies 重复项: ${d}`);
          seenDep.add(d);
          // 引用必须是**已存在的蓝图 id**（allIds 来自 index.json；索引自身损坏时不误报）
          if (allIds && allIds.size && !allIds.has(d)) {
            err(where, `metadata.dependencies[${i}] 引用的蓝图 id 不存在: ${d}`);
          }
        }
      }
    }
    if (meta.algorithm !== undefined) {
      const fam = meta.algorithm && meta.algorithm.family;
      if (fam !== undefined && fam !== null && !ALGO_FAMILIES.has(fam)) {
        err(where, `metadata.algorithm.family "${fam}" 不在允许集合`);
      }
    }
    // 来源可追溯
    if (meta.sources !== undefined) {
      if (!Array.isArray(meta.sources) || meta.sources.length === 0) {
        err(where, 'metadata.sources 必须是非空数组');
      } else {
        for (const s of meta.sources) {
          if (!s || typeof s.file !== 'string' || !s.file) {
            err(where, 'sources[] 缺少 file');
            continue;
          }
          if (path.isAbsolute(s.file)) {
            err(where, `sources[].file 不能是绝对路径: ${s.file}`);
            continue;
          }
          if (repoRoot && !existsSync(path.join(repoRoot, s.file))) {
            err(where, `来源文件不存在: ${s.file}`);
          }
          if (s.line !== undefined && s.line !== null) {
            if (!Number.isInteger(s.line) || s.line < 1) {
              err(where, `sources[].line 必须是正整数，得到 ${JSON.stringify(s.line)}`);
            }
          }
        }
      }
    } else {
      warn(where, 'metadata 未提供 sources（来源不可追溯）');
    }
  }

  const parts = await readJsonOrNull(path.join(bpDir, 'parts.json'));
  if (parts) {
    const items = parts.parts || parts.items;
    if (!Array.isArray(items) || items.length === 0) {
      err(where, 'parts.json 必须含非空 parts 数组');
    } else {
      const seen = new Set();
      items.forEach((p, i) => {
        if (!p || typeof p.name !== 'string' || !p.name.trim()) {
          err(where, `parts[${i}] 缺 name`);
          return;
        }
        if (seen.has(p.name)) err(where, `parts 重复 name: ${p.name}`);
        seen.add(p.name);
      });
    }
  } else {
    warn(where, '缺少 parts.json');
  }

  const muts = await readJsonOrNull(path.join(bpDir, 'mutations.json'));
  if (muts) {
    const items = muts.mutations;
    if (!Array.isArray(items) || items.length === 0) {
      err(where, 'mutations.json 必须含非空 mutations 数组');
    } else {
      items.forEach((m, i) => {
        if (!m || typeof m.name !== 'string' || !m.name.trim()) {
          err(where, `mutations[${i}] 缺 name`);
        }
      });
    }
  } else {
    warn(where, '缺少 mutations.json');
  }

  let workflow = null;
  try {
    workflow = await readFile(path.join(bpDir, 'workflow.md'), 'utf-8');
  } catch {
    workflow = null;
  }
  if (workflow === null) {
    warn(where, '缺少 workflow.md');
  } else {
    if (!workflow.trim()) err(where, 'workflow.md 为空');
    const steps = workflow.split('\n').filter(l => /^\s*(\d+[.)]|[-*])\s+\S/.test(l));
    if (steps.length < 2) {
      warn(where, `workflow.md 只有 ${steps.length} 条步骤，建议 ≥2 条可执行步骤`);
    }
  }
}

async function lintDir(dataDir, repoRoot) {
  const indexPath = path.join(dataDir, 'index.json');
  const index = await readJsonOrNull(indexPath);
  if (!index) {
    err('index.json', `不存在或无法解析: ${indexPath}`);
    return;
  }
  if (typeof index.schemaVersion !== 'number') {
    warn('index.json', '缺少 schemaVersion（数字）');
  }
  if (!Array.isArray(index.blueprints) || index.blueprints.length === 0) {
    err('index.json', '必须含非空 blueprints 数组');
    return;
  }
  // ★ 两遍：先把**全集 id** 算出来（供每个蓝图的 `dependencies` 校验「引用的 id 是否存在」），
  //   再逐个 lint。重复 id / path 的报错仍在**原来那一次遍历**里发，保持报错顺序不变。
  const ids = new Set();
  const dupIds = new Set();
  for (const entry of index.blueprints) {
    if (entry && entry.id) {
      if (ids.has(entry.id)) dupIds.add(entry.id);
      ids.add(entry.id);
    }
  }
  for (const entry of index.blueprints) {
    if (entry && entry.id && dupIds.has(entry.id)) {
      err('index.json', `重复 id: ${entry.id}`);
      dupIds.delete(entry.id);
    }
  }
  const paths = new Set();
  for (const entry of index.blueprints) {
    if (entry && entry.path) {
      if (paths.has(entry.path)) err('index.json', `重复 path: ${entry.path}`);
      paths.add(entry.path);
    }
    await lintBlueprint(dataDir, entry, repoRoot, ids);
  }

  // 孤儿目录 / 孤儿文件
  let dirents = [];
  try {
    dirents = await readdir(dataDir, {withFileTypes: true});
  } catch {
    dirents = [];
  }
  for (const d of dirents) {
    if (d.isDirectory() && !paths.has(d.name)) {
      warn('index.json', `目录 "${d.name}" 存在于磁盘但未被 index 引用（孤儿）`);
    }
  }
}

/* ---------------------------- selftest ---------------------------- */

let assertions = 0;
const sFailures = [];
function assert(cond, label) {
  assertions += 1;
  if (!cond) sFailures.push(label);
}

async function makeLintFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rk-lint-'));
  const data = path.join(root, 'data');
  const repo = path.join(root, 'repo');
  await mkdir(path.join(repo, 'docs', 'references'), {recursive: true});
  await writeFile(path.join(repo, 'docs', 'references', 'ok.md'), '# ok\n', 'utf-8');

  const mk = async (name, meta, parts, muts, wf) => {
    const d = path.join(data, name);
    await mkdir(d, {recursive: true});
    if (meta) await writeFile(path.join(d, 'metadata.json'), JSON.stringify(meta), 'utf-8');
    if (parts) await writeFile(path.join(d, 'parts.json'), JSON.stringify(parts), 'utf-8');
    if (muts) await writeFile(path.join(d, 'mutations.json'), JSON.stringify(muts), 'utf-8');
    if (wf !== undefined && wf !== null) await writeFile(path.join(d, 'workflow.md'), wf, 'utf-8');
  };

  const goodMeta = {
    id: 'good',
    title: '好蓝图',
    category: 'platform-signature',
    status: 'active',
    version: '1.0.0',
    summary: '演示',
    aliases: ['g'],
    algorithm: {family: 'hash'},
    sources: [{file: 'docs/references/ok.md', line: 1, quote: 'x'}],
  };
  await mk('good', goodMeta, {parts: [{name: 't'}]}, {mutations: [{name: 'm'}]}, '1. 第一步\n2. 第二步\n');

  await mk(
    'badmeta',
    {id: 'mismatch', title: 'x', category: 'nope', status: 'nope', version: '1', summary: 's'},
    {parts: [{name: 'a'}]},
    {mutations: [{name: 'm'}]},
    '1. a\n2. b\n',
  );
  await mk(
    'badsources',
    {
      id: 'badsources',
      title: 'x',
      category: 'generic',
      status: 'unknown',
      version: '1',
      summary: 's',
      sources: [{file: 'docs/references/missing.md', line: 0}],
    },
    {parts: [{name: 'a'}, {name: 'a'}]},
    {mutations: []},
    '',
  );
  await mk('orphan', null, null, null, null);

  // ★★ B39 新增：`dependencies` 的**会失败**夹具（4 类错误各一个）
  //   badep1 = 非数组；badep2 = 自指 + 悬空 id + 重复项；badep3 = 合法依赖（阴性对照）
  const depBase = {
    title: '依赖演示',
    category: 'platform-signature',
    status: 'active',
    version: '1.0.0',
    summary: 's',
    sources: [{file: 'docs/references/ok.md', line: 1, quote: 'x'}],
  };
  await mk('badep1',
    {...depBase, id: 'badep1', dependencies: 'jd-env-params'},
    {parts: [{name: 'a'}]}, {mutations: [{name: 'm'}]}, '1. a\n2. b\n');
  await mk('badep2',
    {...depBase, id: 'badep2', dependencies: ['badep2', 'no-such-blueprint', 'good', 'good']},
    {parts: [{name: 'a'}]}, {mutations: [{name: 'm'}]}, '1. a\n2. b\n');
  await mk('badep3',
    {...depBase, id: 'badep3', dependencies: ['good']},
    {parts: [{name: 'a'}]}, {mutations: [{name: 'm'}]}, '1. a\n2. b\n');

  const index = {
    schemaVersion: 1,
    blueprints: [
      {id: 'good', path: 'good', title: '好蓝图', category: 'platform-signature', status: 'active', summary: '演示', aliases: ['g'], keywords: ['good']},
      {id: 'badmeta', path: 'badmeta', title: 'x', category: 'platform-signature', status: 'active', summary: 's'},
      {id: 'badsources', path: 'badsources', title: 'x', category: 'generic', status: 'unknown', summary: 's'},
      {id: 'ghost', path: 'does-not-exist', title: 'x', category: 'generic', status: 'unknown', summary: 's'},
      {id: 'badmeta', path: 'good', title: 'dup', category: 'generic', status: 'unknown', summary: 's'},
      {id: 'badep1', path: 'badep1', title: 'x', category: 'platform-signature', status: 'active', summary: 's'},
      {id: 'badep2', path: 'badep2', title: 'x', category: 'platform-signature', status: 'active', summary: 's'},
      {id: 'badep3', path: 'badep3', title: 'x', category: 'platform-signature', status: 'active', summary: 's'},
    ],
  };
  await writeFile(path.join(data, 'index.json'), JSON.stringify(index), 'utf-8');
  return {root, data, repo};
}

async function selftest() {
  const {root, data, repo} = await makeLintFixture();
  const savedErrors = errors.splice(0, errors.length);
  const savedWarns = warns.splice(0, warns.length);
  try {
    await lintDir(data, repo);
    const joined = errors.join('\n');
    assert(joined.includes('重复 id'), 'S1 抓到重复 id');
    assert(joined.includes('重复 path'), 'S1 抓到重复 path');
    assert(joined.includes('指向的目录不存在'), 'S2 抓到悬空 path');
    assert(joined.includes('metadata.id') && joined.includes('不一致'), 'S3 抓到 metadata.id 不一致');
    assert(joined.includes('metadata.category'), 'S4 抓到非法 category');
    assert(joined.includes('来源文件不存在'), 'S5 抓到来源文件不存在');
    assert(joined.includes('line 必须是正整数'), 'S6 抓到非法行号');
    assert(joined.includes('parts 重复 name'), 'S7 抓到 parts 重复 name');
    assert(joined.includes('必须含非空 mutations 数组'), 'S8 抓到空 mutations');
    assert(joined.includes('workflow.md 为空'), 'S9 抓到空 workflow');
    assert(
      warns.join('\n').includes('未被 index 引用'),
      'S10 抓到孤儿目录',
    );
    assert(errors.length > 0, 'S11 坏夹具必须产生 error（否则校验器形同虚设）');
    // ★★ B39 新增：`dependencies` 四类错误必须各自被抓到
    assert(joined.includes('dependencies 必须是数组'), 'S13a 抓到 dependencies 非数组');
    assert(joined.includes('不得自指'), 'S13b 抓到 dependencies 自指');
    assert(joined.includes('引用的蓝图 id 不存在'), 'S13c 抓到 dependencies 悬空 id');
    assert(joined.includes('dependencies 重复项'), 'S13d 抓到 dependencies 重复项');
    // ★ 阴性对照：合法依赖（badep3 → good，两者都存在）**不得**产生 dependencies 类 error
    assert(
      !errors.some(e => e.startsWith('blueprint[badep3]') && e.includes('dependencies')),
      'S13e 合法 dependencies 不得报错（否则该检查恒红）',
    );

    // 反例：全绿夹具必须零 error（防止"什么都能报错"）
    const {root: r2, data: d2, repo: rp2} = await makeLintFixture();
    errors.length = 0;
    warns.length = 0;
    await lintDir(d2, rp2);
    const goodOnly = errors.filter(e => !e.startsWith('blueprint[badmeta]') && !e.startsWith('blueprint[badsources]') && !e.startsWith('blueprint[ghost]') && !e.startsWith('blueprint[badep1]') && !e.startsWith('blueprint[badep2]') && !e.startsWith('index.json'));
    assert(goodOnly.length === 0, `S12 合法蓝图不得报 error，实际: ${goodOnly.join(' | ')}`);
    await rm(r2, {recursive: true, force: true});

    // 空目录 ⇒ 必须报错
    const emptyDir = path.join(root, 'empty');
    await mkdir(emptyDir, {recursive: true});
    errors.length = 0;
    warns.length = 0;
    await lintDir(emptyDir, repo);
    assert(errors.length > 0, 'S13 缺 index.json 必须报 error');

    errors.length = 0;
    warns.length = 0;
    await lintDir(path.join(root, 'nope'), repo);
    assert(errors.length > 0, 'S14 不存在的目录必须报 error');
  } finally {
    errors.length = 0;
    warns.length = 0;
    errors.push(...savedErrors);
    warns.push(...savedWarns);
    await rm(root, {recursive: true, force: true});
  }

  if (sFailures.length) {
    console.error(`❌ lint selftest 失败 ${sFailures.length}/${assertions}`);
    for (const f of sFailures) console.error(`   - ${f}`);
    process.exit(1);
  }
  console.log(`✅ lint selftest 通过 ${assertions}/${assertions}`);
}

/* ------------------------------- main ------------------------------ */

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        data: {type: 'string'},
        repo: {type: 'string'},
        json: {type: 'boolean', default: false},
        selftest: {type: 'boolean', default: false},
        help: {type: 'boolean', short: 'h', default: false},
      },
      allowPositionals: true,
    });
  } catch (e) {
    console.error(`参数解析错误: ${e.message}`);
    process.exit(2);
  }
  const {values} = parsed;
  if (values.help) {
    console.log(`
blueprint-lint.js - 蓝图库结构与溯源校验

用法:
  node blueprint-lint.js [--data <dir>] [--repo <repoRoot>] [--json] [--selftest]

默认 --data 为 <skill>/data/blueprints，默认 --repo 为仓库根。
退出码: 0 通过（可有 warn） / 1 有 error / 2 用法错误
`);
    return;
  }
  if (values.selftest) {
    await selftest();
    return;
  }

  const dataDir = values.data || path.join(SKILL_ROOT, 'data', 'blueprints');
  const repoRoot = values.repo || REPO_ROOT;
  await lintDir(dataDir, repoRoot);

  if (values.json) {
    console.log(
      JSON.stringify({success: errors.length === 0, errors, warns}, null, 2),
    );
  } else {
    console.log(`🔎 蓝图库校验: ${dataDir}`);
    console.log(`   仓库根（用于来源溯源）: ${repoRoot}`);
    if (warns.length) {
      console.log(`\n⚠️  warn ${warns.length} 条:`);
      for (const w of warns) console.log(`   - ${w}`);
    }
    if (errors.length) {
      console.log(`\n❌ error ${errors.length} 条:`);
      for (const e of errors) console.log(`   - ${e}`);
      console.log(`\n结果: 不通过（error ${errors.length} / warn ${warns.length}）`);
    } else {
      console.log(`\n✅ 结果: 通过（error 0 / warn ${warns.length}）`);
    }
  }
  process.exit(errors.length ? 1 : 0);
}

main().catch(e => {
  console.error(`❌ ${e && e.message ? e.message : e}`);
  process.exit(1);
});
