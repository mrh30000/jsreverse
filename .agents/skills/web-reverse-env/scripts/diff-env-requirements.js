#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';

const CAPABILITY_RULES = [
  {
    capability: 'window',
    patterns: [
      'window is not defined',
      "cannot read properties of undefined (reading 'window')",
      'self is not defined',
    ],
    reason: '目标脚本依赖浏览器全局 Window 顶层对象。',
    priority: 100,
    patchCode:
      'globalThis.window = globalThis;\nglobalThis.self = globalThis;\nglobalThis.top = globalThis;\nglobalThis.parent = globalThis;',
  },
  {
    capability: 'document',
    patterns: [
      'document is not defined',
      "cannot read properties of undefined (reading 'cookie')",
      "cannot read properties of undefined (reading 'createelement')",
      "cannot read properties of undefined (reading 'getelementbyid')",
      "cannot read properties of undefined (reading 'queryselector')",
    ],
    reason: '目标脚本执行了 DOM 节点创建、查找或 Cookie 读取。',
    priority: 95,
    patchCode: `globalThis.document ??= {
  cookie: '',
  location: globalThis.location || { href: 'https://localhost/' },
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
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
};`,
  },
  {
    capability: 'navigator',
    patterns: [
      'navigator is not defined',
      "cannot read properties of undefined (reading 'useragent')",
      "cannot read properties of undefined (reading 'webdriver')",
      "cannot read properties of undefined (reading 'platform')",
      'cannot set property navigator of #<object> which has only a getter',
    ],
    reason:
      '目标脚本读取浏览器指纹（UA、platform、languages 等），注意 Node 21+ 必须使用 Object.defineProperty。',
    priority: 90,
    patchCode: `Object.defineProperty(globalThis, 'navigator', {
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
});`,
  },
  {
    capability: 'location',
    patterns: [
      'location is not defined',
      "cannot read properties of undefined (reading 'href')",
      "cannot read properties of undefined (reading 'host')",
      "cannot read properties of undefined (reading 'protocol')",
      "cannot read properties of undefined (reading 'pathname')",
    ],
    reason: '目标脚本通过 location 获取当前网页 URL 地址或协议域名。',
    priority: 85,
    patchCode: `globalThis.location ??= {
  href: 'https://example.com/api',
  protocol: 'https:',
  host: 'example.com',
  hostname: 'example.com',
  port: '',
  pathname: '/api',
  search: '',
  hash: '',
  origin: 'https://example.com',
  reload: () => {},
  replace: () => {},
};`,
  },
  {
    capability: 'localStorage',
    patterns: [
      'localstorage is not defined',
      "cannot read properties of undefined (reading 'getitem')",
    ],
    reason: '目标脚本尝试从本地持久化 Storage 读写键值。',
    priority: 80,
    patchCode: `globalThis.localStorage ??= {
  _store: new Map(),
  getItem(k) { return this._store.has(String(k)) ? this._store.get(String(k)) : null; },
  setItem(k, v) { this._store.set(String(k), String(v)); },
  removeItem(k) { this._store.delete(String(k)); },
  clear() { this._store.clear(); },
  key(i) { return Array.from(this._store.keys())[i] ?? null; },
  get length() { return this._store.size; },
};`,
  },
  {
    capability: 'sessionStorage',
    patterns: ['sessionstorage is not defined'],
    reason: '目标脚本尝试从 SessionStorage 读写会话键值。',
    priority: 75,
    patchCode: `globalThis.sessionStorage ??= {
  _store: new Map(),
  getItem(k) { return this._store.has(String(k)) ? this._store.get(String(k)) : null; },
  setItem(k, v) { this._store.set(String(k), String(v)); },
  removeItem(k) { this._store.delete(String(k)); },
  clear() { this._store.clear(); },
  key(i) { return Array.from(this._store.keys())[i] ?? null; },
  get length() { return this._store.size; },
};`,
  },
  {
    capability: 'crypto',
    patterns: [
      "reading 'subtle'",
      'crypto is not defined',
      'getrandomvalues is not a function',
      "cannot read properties of undefined (reading 'getrandomvalues')",
    ],
    reason:
      '目标脚本调用了 Web Cryptography API (crypto.getRandomValues 或 crypto.subtle)。',
    priority: 88,
    patchCode: `import nodeCrypto from 'node:crypto';
globalThis.crypto ??= nodeCrypto.webcrypto || {
  getRandomValues: (arr) => nodeCrypto.randomFillSync(arr),
  subtle: nodeCrypto.webcrypto?.subtle || {},
};`,
  },
  {
    capability: 'atob_btoa',
    patterns: ['atob is not defined', 'btoa is not defined'],
    reason: '目标脚本使用了浏览器原生的 Base64 编解码方法。',
    priority: 70,
    patchCode: `globalThis.atob ??= (str) => Buffer.from(str, 'base64').toString('binary');
globalThis.btoa ??= (bin) => Buffer.from(bin, 'binary').toString('base64');`,
  },
  {
    capability: 'addEventListener',
    patterns: [
      "cannot read properties of undefined (reading 'addeventlistener')",
      'window.addeventlistener is not a function',
    ],
    reason: '目标脚本注册了全局事件监听器 (如 load, scroll, resize)。',
    priority: 65,
    patchCode: `globalThis.addEventListener ??= () => {};
globalThis.removeEventListener ??= () => {};
globalThis.dispatchEvent ??= () => true;`,
  },
];

function printHelp() {
  console.log(`
diff-env-requirements.js - 根据 Node.js 运行报错智能推断缺失的浏览器环境与最小补丁

用法:
  node diff-env-requirements.js [选项]

选项:
  -e, --error <string>     Node 运行时报错信息（如 "ReferenceError: window is not defined"）
  -f, --file <path>        包含报错堆栈日志的文本文件路径
      --json               以 JSON 格式输出匹配结果与补丁代码
  -h, --help               显示帮助信息

示例:
  node diff-env-requirements.js --error "ReferenceError: window is not defined"
  node diff-env-requirements.js -f ./error.log --json
`);
}

export function inferMissing(errorMessage) {
  const norm = errorMessage.toLowerCase();
  const matched = [];

  for (const rule of CAPABILITY_RULES) {
    if (rule.patterns.some(p => norm.includes(p.toLowerCase()))) {
      matched.push(rule);
    }
  }

  return matched.sort((a, b) => b.priority - a.priority);
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        error: {type: 'string', short: 'e'},
        file: {type: 'string', short: 'f'},
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

  let errorText = values.error || positionals.join(' ');
  if (values.file) {
    try {
      errorText = await readFile(path.resolve(values.file), 'utf-8');
    } catch (err) {
      console.error(`读取文件失败: ${err.message}`);
      process.exit(1);
    }
  }

  if (!errorText || errorText.trim().length === 0) {
    console.error('错误: 请通过 --error "..." 或 --file <path> 提供报错信息');
    printHelp();
    process.exit(1);
  }

  const isJson = Boolean(values.json);
  const matches = inferMissing(errorText);

  if (matches.length === 0) {
    if (isJson) {
      console.log(
        JSON.stringify(
          {success: true, matchedCount: 0, recommendations: []},
          null,
          2,
        ),
      );
    } else {
      console.log(
        '🔍 未能在当前报错日志中精准匹配到常见内置浏览器环境缺失特征。',
      );
      console.log('   报错原内容:\n   ' + errorText.slice(0, 300));
    }
    return;
  }

  const result = {
    success: true,
    matchedCount: matches.length,
    recommendations: matches.map(m => ({
      capability: m.capability,
      reason: m.reason,
      patchCode: m.patchCode,
    })),
  };

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`💡 检测到 ${matches.length} 处浏览器能力缺失推断:`);
    console.log(
      '============================================================\n',
    );
    for (const m of matches) {
      console.log(`📌 缺失能力: [${m.capability}]`);
      console.log(`   原因: ${m.reason}`);
      console.log(`   建议补丁 (写入 env.js 或 polyfills.js):`);
      console.log(
        '------------------------------------------------------------',
      );
      console.log(m.patchCode);
      console.log(
        '------------------------------------------------------------\n',
      );
    }
  }
}

main();
