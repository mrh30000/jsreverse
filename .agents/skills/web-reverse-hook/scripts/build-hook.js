#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 生成可直接注入页面的 hook 脚本。
 *
 * 这些 hook 原本是 4 个 MCP 工具（hook_cryptojs / hook_jsencrypt / hook_smcrypto /
 * hook_jsvmp_interpreter）里的 JS 字符串。工具下线后，脚本改成纯本地生成：
 * 本脚本只做确定性拼装，注入仍由 browsercli 的通用工具完成
 * （evaluate_script 一次性注入，或 inject_hook --persistent 跨导航保留）。
 * （compare_env 是环境采集而非 hook，归到 skills/web-reverse-env/scripts/compare-env.js。）
 *
 * 用法：
 *   node build-hook.js cryptojs --algorithms AES,MD5 --out hook.js
 *   node build-hook.js jsvmp-proxy --script-url app.js --json | browsercli call inject_hook --stdin
 */

import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

import {
  installCryptoJSHook,
  installJSEncryptHook,
  installSMCryptoHook,
} from './hooks/crypto-libs.js';
import {
  installJsvmpProxyHook,
  installJsvmpTransparentHook,
} from './probes/jsvmp.js';

const PRESETS = {
  cryptojs: {
    hookId: 'hook_cryptojs',
    install: installCryptoJSHook,
    description: '拦截 CryptoJS 的 AES/DES/MD5/SHA/HMAC 加解密入参与密文',
  },
  jsencrypt: {
    hookId: 'hook_jsencrypt',
    install: installJSEncryptHook,
    description: '拦截 JSEncrypt RSA 的公私钥、明文与密文',
  },
  smcrypto: {
    hookId: 'hook_smcrypto',
    install: installSMCryptoHook,
    description: '拦截国密 SM2/SM3/SM4',
  },
  'jsvmp-proxy': {
    hookId: 'jsvmp_probe',
    install: installJsvmpProxyHook,
    description:
      'JSVMP proxy 探针：代理全局对象、Function.prototype 与 Reflect（覆盖面广，可被检测）',
  },
  'jsvmp-transparent': {
    hookId: 'jsvmp_transparent',
    install: installJsvmpTransparentHook,
    description: 'JSVMP transparent 探针：只替换原型 getter，痕迹更小',
  },
};

/** JSVMP 探针默认代理的全局对象，与原工具保持一致。 */
const DEFAULT_PROXY_OBJECTS = [
  'navigator',
  'screen',
  'history',
  'localStorage',
  'sessionStorage',
  'performance',
];

const DEFAULT_MAX_ENTRIES = 10_000;

/**
 * 把 install 函数序列化成表达式。
 *
 * 两点约束，改动时都要守住：
 * 1. install 函数体内不允许引用模块级变量（见 hooks/ 与 probes/ 顶部注释），
 *    否则 `toString()` 出来的脚本在页面里会抛 ReferenceError。
 * 2. 结尾**不能有分号**。evaluate_script 会把 `function` 参数整体包进括号再求值
 *    （`((<脚本>))`），带分号会变成 `(...;)` 直接 SyntaxError。
 */
export function buildHookScript(preset, options = {}) {
  const entry = PRESETS[preset];
  if (!entry) {
    throw new Error(
      `未知 preset "${preset}"，可选：${Object.keys(PRESETS).join(', ')}`,
    );
  }

  const config = resolveConfig(preset, options);
  const hookId = entry.hookId + (config.idSuffix ?? '');
  const {idSuffix, ...serialized} = {...config, hookId};
  return {
    hookId,
    description: entry.description,
    script: `(${entry.install.toString()})(${JSON.stringify(serialized)})`,
  };
}

function resolveConfig(preset, options) {
  const logFormat = options.logFormat ?? 'compact';
  const algorithms = options.algorithms ?? ['all'];
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;

  if (preset === 'cryptojs') {
    return {algorithms, logFormat};
  }
  if (preset === 'jsencrypt') {
    return {logFormat};
  }
  if (preset === 'smcrypto') {
    return {algorithms, logFormat};
  }

  const scriptUrl = options.scriptUrl ?? '';
  // 与原工具一致：同一个 URL 作用域重复注入时保持幂等（探针内部也会再判一次）。
  const idSuffix = `:${scriptUrl || 'all'}`;
  if (preset === 'jsvmp-transparent') {
    return {scriptUrl, maxEntries, idSuffix};
  }
  return {
    scriptUrl,
    maxEntries,
    idSuffix,
    trackCalls: options.trackCalls ?? true,
    trackProps: options.trackProps ?? true,
    trackReflect: options.trackReflect ?? true,
    proxyObjects: options.proxyObjects ?? DEFAULT_PROXY_OBJECTS,
  };
}

function parseList(value) {
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function printHelp() {
  const presetLines = Object.entries(PRESETS)
    .map(([name, entry]) => `  ${name.padEnd(18)} ${entry.description}`)
    .join('\n');
  console.log(`
生成可注入页面的 hook 脚本。

用法:
  node build-hook.js <preset> [options]

preset:
${presetLines}

通用 options:
  --out <file>          写入文件（默认打印到 stdout）
  --json                输出 {"hookId","description","script"} JSON，便于管道传给 inject_hook --stdin
  --log-format <fmt>    compact（默认）| json | full（full 仅 CryptoJS 支持）

cryptojs / smcrypto:
  --algorithms <list>   逗号分隔，如 AES,MD5；默认 all

jsvmp-proxy / jsvmp-transparent:
  --script-url <str>    调用栈过滤的目标脚本 URL 子串；省略则不过滤
  --max-entries <n>     window.__mcp_jsvmp_log 上限，默认 ${DEFAULT_MAX_ENTRIES}
  --proxy-objects <list> proxy 模式代理的 window 属性，默认 ${DEFAULT_PROXY_OBJECTS.join(',')}

jsvmp-proxy 追踪开关（默认全开，用 =false 关闭）:
  --track-calls=false   关闭 apply/call/bind 与时间 API 追踪
  --track-props=false   关闭全局属性访问代理
  --track-reflect=false 关闭 Reflect 追踪

示例:
  node build-hook.js cryptojs --algorithms AES,MD5 --out hook-cryptojs.js
  browsercli call evaluate_script --file hook-cryptojs.js
  node build-hook.js jsvmp-proxy --script-url app.js --json | browsercli call inject_hook --stdin
`);
}

/**
 * 解析 `--flag` / `--flag=true|false` 形式的布尔开关，并把它们从 argv 中摘出去。
 *
 * node:util 的 parseArgs 既不接受 `--flag=false`，也不接受 `--no-flag`，
 * 所以这几个开关先手工解析再交给 parseArgs，避免为每个开关维护第二个 flag。
 * 摘除后剩余的 argv 才拿去 parseArgs，否则它会把这些 flag 当未知选项报错。
 */
const BOOL_FLAGS = ['track-calls', 'track-props', 'track-reflect'];

function extractBoolFlags(argv) {
  const rest = [];
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const name = BOOL_FLAGS.find(
      flag => arg === `--${flag}` || arg.startsWith(`--${flag}=`),
    );
    if (!name) {
      rest.push(arg);
      continue;
    }
    const inline = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : '';
    const next = argv[i + 1];
    if (inline === 'true' || inline === 'false') {
      values[name] = inline === 'true';
    } else if (next === 'true' || next === 'false') {
      values[name] = next === 'true';
      i += 1;
    } else {
      values[name] = true;
    }
  }
  return {rest, values};
}

function main() {
  const argv = process.argv.slice(2);
  const boolFlags = extractBoolFlags(argv);
  const {values, positionals} = parseArgs({
    args: boolFlags.rest,
    options: {
      out: {type: 'string'},
      json: {type: 'boolean', default: false},
      help: {type: 'boolean', short: 'h', default: false},
      'log-format': {type: 'string'},
      algorithms: {type: 'string'},
      'script-url': {type: 'string'},
      'max-entries': {type: 'string'},
      'proxy-objects': {type: 'string'},
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    printHelp();
    process.exit(values.help ? 0 : 1);
  }

  const result = buildHookScript(positionals[0], {
    logFormat: values['log-format'],
    algorithms: values.algorithms ? parseList(values.algorithms) : undefined,
    scriptUrl: values['script-url'],
    maxEntries: values['max-entries']
      ? Number(values['max-entries'])
      : undefined,
    proxyObjects: values['proxy-objects']
      ? parseList(values['proxy-objects'])
      : undefined,
    trackCalls: boolFlags.values['track-calls'] ?? true,
    trackProps: boolFlags.values['track-props'] ?? true,
    trackReflect: boolFlags.values['track-reflect'] ?? true,
  });

  // --json 的字段名刻意对齐 inject_hook 的 schema（hookId + script，不含 description），
  // 这样输出可以直接 `| browsercli call inject_hook --stdin`；多带字段会被它拒绝。
  const output = values.json
    ? JSON.stringify({hookId: result.hookId, script: result.script}, null, 2)
    : result.script;

  if (values.out) {
    writeFileSync(path.resolve(values.out), `${output}\n`, 'utf8');
    if (!values.json) {
      console.error(`[build-hook] ${result.hookId} → ${values.out}`);
    }
    return;
  }
  console.log(output);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
