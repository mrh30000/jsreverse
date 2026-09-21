#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

import {mkdir, writeFile, readFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';

function printHelp() {
  console.log(`
export-rebuild-bundle.js - 导出独立的本地 Node.js 逆向复现脚手架工程 (含兼容 Node 21+ 的环境代理)

用法:
  node export-rebuild-bundle.js --output-dir <dir> [选项]

选项:
  -o, --output-dir <path>     脚手架输出目录 [必需]
  -t, --target-code <file>    目标逆向 JS 代码文件路径（放入 target.js）
      --entry-code <file>     自定义 entry.js 文件路径
      --env-code <file>       自定义 env.js 文件路径
      --overwrite             允许覆盖已存在的目录与文件 [默认: true]
      --json                  以 JSON 格式输出结果
  -h, --help                  显示帮助信息

示例:
  node export-rebuild-bundle.js -o ./my-rebuild
  node export-rebuild-bundle.js -o ./my-rebuild -t ./dist/extracted_sign.js
`);
}

const DEFAULT_ENV_CODE = `/**
 * env.js - 基础浏览器全局对象仿真 Shim
 * 注意：Node 21+ 环境下 navigator 为只读 getter，必须使用 Object.defineProperty
 */

globalThis.window = globalThis;
globalThis.self = globalThis;
globalThis.top = globalThis;
globalThis.parent = globalThis;

// 1. Navigator 指纹对象
Object.defineProperty(globalThis, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    appVersion: '5.0 (Windows NT 10.0; Win64; x64)',
    platform: 'Win32',
    vendor: 'Google Inc.',
    languages: ['zh-CN', 'zh', 'en'],
    language: 'zh-CN',
    webdriver: false,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    plugins: [],
  },
  writable: true,
  configurable: true,
  enumerable: true,
});

// 2. Location 对象
globalThis.location ??= {
  href: 'https://example.com/login',
  protocol: 'https:',
  host: 'example.com',
  hostname: 'example.com',
  port: '',
  pathname: '/login',
  search: '',
  hash: '',
  origin: 'https://example.com',
  reload: () => {},
  replace: () => {},
};

// 3. Document DOM 模拟
globalThis.document ??= {
  cookie: '',
  location: globalThis.location,
  createElement: (tag) => ({
    tagName: String(tag).toUpperCase(),
    setAttribute: () => {},
    getAttribute: () => null,
    style: {},
    appendChild: () => {},
    children: [],
  }),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  documentElement: { clientWidth: 1920, clientHeight: 1080 },
  body: { appendChild: () => {}, clientWidth: 1920, clientHeight: 1080 },
  addEventListener: () => {},
  removeEventListener: () => {},
};

// 4. Web Storage 模拟
globalThis.localStorage ??= {
  _store: new Map(),
  getItem(k) { return this._store.has(String(k)) ? this._store.get(String(k)) : null; },
  setItem(k, v) { this._store.set(String(k), String(v)); },
  removeItem(k) { this._store.delete(String(k)); },
  clear() { this._store.clear(); },
  key(i) { return Array.from(this._store.keys())[i] ?? null; },
  get length() { return this._store.size; },
};

globalThis.sessionStorage ??= {
  _store: new Map(),
  getItem(k) { return this._store.has(String(k)) ? this._store.get(String(k)) : null; },
  setItem(k, v) { this._store.set(String(k), String(v)); },
  removeItem(k) { this._store.delete(String(k)); },
  clear() { this._store.clear(); },
  key(i) { return Array.from(this._store.keys())[i] ?? null; },
  get length() { return this._store.size; },
};

// 5. 常见工具函数
globalThis.atob ??= (str) => Buffer.from(str, 'base64').toString('binary');
globalThis.btoa ??= (bin) => Buffer.from(bin, 'binary').toString('base64');
`;

const DEFAULT_POLYFILLS_CODE = `/**
 * polyfills.js - 扩展 API 补丁与动态插桩代理
 */
console.log('[Rebuild] polyfills.js initialized');
`;

const DEFAULT_TARGET_CODE = `/**
 * target.js - 目标逆向 JS 代码（请将扣取出的混淆核心代码粘贴至此处）
 */
export function sign(params) {
  // 示例占位函数
  return {
    params,
    ts: Date.now(),
    ua: navigator.userAgent,
    token: 'mock_signature_result'
  };
}
`;

const DEFAULT_ENTRY_CODE = `/**
 * entry.js - 本地 Node.js 脱机执行入口
 */
import './env.js';
import './polyfills.js';
import * as target from './target.js';

console.log('[Rebuild] All environments loaded. Running test invocation...');

try {
  if (typeof target.sign === 'function') {
    const res = target.sign({ id: 12345, query: 'test' });
    console.log('[Rebuild] sign() result:', res);
  } else {
    console.log('[Rebuild] target.js exports:', Object.keys(target));
  }
} catch (err) {
  console.error('[Rebuild] Execution failed:', err);
}
`;

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        'output-dir': {type: 'string', short: 'o'},
        'target-code': {type: 'string', short: 't'},
        'entry-code': {type: 'string'},
        'env-code': {type: 'string'},
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

  const outputDir = values['output-dir'] || positionals[0];
  if (!outputDir) {
    console.error('错误: 请通过 --output-dir <dir> 指定输出目录');
    printHelp();
    process.exit(1);
  }

  const targetDir = path.resolve(outputDir);
  const isJson = Boolean(values.json);

  try {
    await mkdir(targetDir, {recursive: true});

    let envCode = DEFAULT_ENV_CODE;
    if (values['env-code']) {
      envCode = await readFile(path.resolve(values['env-code']), 'utf-8');
    }

    let targetCode = DEFAULT_TARGET_CODE;
    if (values['target-code']) {
      targetCode = await readFile(path.resolve(values['target-code']), 'utf-8');
    }

    let entryCode = DEFAULT_ENTRY_CODE;
    if (values['entry-code']) {
      entryCode = await readFile(path.resolve(values['entry-code']), 'utf-8');
    }

    const packageJson = JSON.stringify(
      {
        name: 'rebuild-bundle',
        version: '1.0.0',
        type: 'module',
        scripts: {
          start: 'node entry.js',
        },
      },
      null,
      2,
    );

    const files = [
      {name: 'package.json', content: packageJson},
      {name: 'env.js', content: envCode},
      {name: 'polyfills.js', content: DEFAULT_POLYFILLS_CODE},
      {name: 'target.js', content: targetCode},
      {name: 'entry.js', content: entryCode},
    ];

    for (const f of files) {
      await writeFile(path.join(targetDir, f.name), f.content, 'utf-8');
    }

    if (isJson) {
      console.log(
        JSON.stringify(
          {
            success: true,
            outputDir: targetDir,
            files: files.map(f => f.name),
          },
          null,
          2,
        ),
      );
    } else {
      console.log('📦 本地 Rebuild 脱机工程已成功导出！');
      console.log(`   目标目录: ${targetDir}`);
      console.log('   生成文件:');
      files.forEach(f => console.log(`     - ${f.name}`));
      console.log('\n🚀 测试运行方式:');
      console.log(`   node ${path.join(targetDir, 'entry.js')}`);
    }
  } catch (error) {
    if (isJson) {
      console.log(
        JSON.stringify({success: false, error: error.message}, null, 2),
      );
    } else {
      console.error(`❌ 导出失败: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
