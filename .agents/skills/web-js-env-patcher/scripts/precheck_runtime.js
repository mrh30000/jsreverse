#!/usr/bin/env node
'use strict';

const crypto = require('crypto');

function parseArgs(argv) {
  const args = { json: false, markdown: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--markdown') args.markdown = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`未知参数：${a}`);
  }
  if (!args.json && !args.markdown) args.markdown = true;
  return args;
}

function usage() {
  return `用法：
  node scripts/precheck_runtime.js --markdown
  node scripts/precheck_runtime.js --json

说明：输出 Node.js 侧纯计算预检结果；浏览器侧需运行同类片段后人工比对。`;
}

function collect() {
  const emoji = '中文🙂𠮷';
  const params = new URLSearchParams();
  params.append('b', '2');
  params.append('a', '1 2');
  params.append('emoji', '🙂');
  const encoder = new TextEncoder();
  const bytes = Array.from(encoder.encode(emoji));
  const random = new Uint8Array(8);
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') globalThis.crypto.getRandomValues(random);
  else random.set(crypto.randomBytes(8));
  return {
    node: { version: process.version, platform: process.platform, arch: process.arch, v8: process.versions.v8 },
    math: {
      imul: Math.imul(0x7fffffff, 31),
      fround: Math.fround(0.1),
      pow: Math.pow(2, 53) - 1,
      trig: Number(Math.sin(Math.PI / 6).toFixed(12)),
    },
    stringUnicode: {
      sample: emoji,
      length: emoji.length,
      codePoints: Array.from(emoji).map(ch => ch.codePointAt(0).toString(16)),
      normalized: emoji.normalize('NFC'),
    },
    arrayObject: {
      sort: ['10', '2', '1'].sort(),
      numericSort: [10, 2, 1].sort((a, b) => a - b),
      jsonOrder: JSON.stringify({ b: 2, a: 1, 1: 'one', 0: 'zero' }),
      keys: Object.keys({ b: 2, a: 1, 1: 'one', 0: 'zero' }),
    },
    dateTimezone: {
      timezoneOffset: new Date('2020-01-02T03:04:05Z').getTimezoneOffset(),
      iso: new Date(1577934245000).toISOString(),
      locale: new Date(1577934245000).toString(),
    },
    encoding: {
      textEncoderBytes: bytes,
      urlSearchParams: params.toString(),
      encodeURIComponent: encodeURIComponent(emoji),
      btoaAscii: Buffer.from('abc123', 'binary').toString('base64'),
      atobAscii: Buffer.from('YWJjMTIz', 'base64').toString('binary'),
    },
    random: {
      mathRandomType: typeof Math.random(),
      cryptoBytesSample: Array.from(random),
      note: '随机值只用于确认 API 可用；正式 fixtures 应固定随机源。',
    },
  };
}

function renderMarkdown(result) {
  const lines = ['# Node.js 纯计算预检结果', '', `- Node.js：${result.node.version}`, `- 平台：${result.node.platform}-${result.node.arch}`, `- V8：${result.node.v8}`];
  for (const [section, value] of Object.entries(result)) {
    if (section === 'node') continue;
    lines.push('', `## ${section}`);
    for (const [k, v] of Object.entries(value)) lines.push(`- ${k}：${Array.isArray(v) ? JSON.stringify(v) : String(v)}`);
  }
  lines.push('', '## 下一步');
  lines.push('- 在浏览器控制台运行同类预检片段，保存为 `notes/runtime-precheck-browser.json`。');
  lines.push('- 若 Node 与浏览器基础计算一致，再继续排查环境对象、初始化参数和样本差异。');
  return lines.join('\n') + '\n';
}

try {
  const args = parseArgs(process.argv);
  if (args.help) { console.log(usage()); process.exit(0); }
  const result = collect();
  if (args.json) console.log(JSON.stringify(result, null, 2));
  if (args.markdown) process.stdout.write(renderMarkdown(result));
} catch (err) {
  console.error(err.message || String(err));
  console.error(usage());
  process.exit(1);
}
