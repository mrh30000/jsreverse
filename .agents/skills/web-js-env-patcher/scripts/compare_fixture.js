#!/usr/bin/env node
'use strict';

const fs = require('fs');

function parseArgs(argv) {
  const args = { fixture: '', actual: '', field: '', expectedPath: '', actualPath: '', json: false, markdown: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fixture') args.fixture = argv[++i] || '';
    else if (a === '--actual') args.actual = argv[++i] || '';
    else if (a === '--field') args.field = argv[++i] || '';
    else if (a === '--expected-path') args.expectedPath = argv[++i] || '';
    else if (a === '--actual-path') args.actualPath = argv[++i] || '';
    else if (a === '--json') args.json = true;
    else if (a === '--markdown') args.markdown = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`未知参数：${a}`);
  }
  if (!args.json && !args.markdown) args.markdown = true;
  return args;
}

function usage() {
  return `用法：
  node scripts/compare_fixture.js --fixture sample.fixture.json --actual node-output.json --field sign --markdown
  node scripts/compare_fixture.js --fixture sample.fixture.json --actual node-output.json --expected-path expected.sign --actual-path output.sign --json`;
}

function readJson(p, label) {
  if (!p) throw new Error(`必须提供 ${label}`);
  return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
}

function getPath(obj, p) {
  if (!p) return undefined;
  let cur = obj;
  for (const part of p.split('.').filter(Boolean)) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

function firstDefined(values) {
  for (const v of values) if (v !== undefined) return v;
  return undefined;
}

function normalize(v) {
  if (v === undefined) return undefined;
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

function compare(args) {
  const fixture = readJson(args.fixture, '--fixture');
  const actual = readJson(args.actual, '--actual');
  const field = args.field || fixture.param || '';
  const expectedPath = args.expectedPath || (field ? `expected.${field}` : 'expected');
  const actualPath = args.actualPath || '';
  const expected = firstDefined([getPath(fixture, expectedPath), field ? getPath(fixture, `expected.${field}`) : undefined, fixture.expectedValue]);
  const actualValue = actualPath ? getPath(actual, actualPath) : firstDefined([
    field ? getPath(actual, `output.${field}`) : undefined,
    field ? getPath(actual, field) : undefined,
    getPath(actual, 'output'),
    getPath(actual, 'result'),
  ]);
  const expectedText = normalize(expected);
  const actualText = normalize(actualValue);
  const pass = expected !== undefined && actualValue !== undefined && expectedText === actualText;
  return { pass, field, expectedPath, actualPath: actualPath || '(自动识别)', expected, actual: actualValue, expectedText, actualText, fixture: args.fixture, actualFile: args.actual };
}

function renderMarkdown(result) {
  const lines = ['# fixtures 对比结果', '', `- 结果：${result.pass ? '通过' : '失败'}`, `- 字段：${result.field || '未指定'}`, `- 期望路径：${result.expectedPath}`, `- 实际路径：${result.actualPath}`, `- 浏览器期望值：${result.expectedText === undefined ? '未找到' : result.expectedText}`, `- Node.js 实际值：${result.actualText === undefined ? '未找到' : result.actualText}`];
  return lines.join('\n') + '\n';
}

try {
  const args = parseArgs(process.argv);
  if (args.help) { console.log(usage()); process.exit(0); }
  const result = compare(args);
  if (args.json) console.log(JSON.stringify(result, null, 2));
  if (args.markdown) process.stdout.write(renderMarkdown(result));
  if (!result.pass) process.exit(2);
} catch (err) {
  console.error(err.message || String(err));
  console.error(usage());
  process.exit(1);
}
