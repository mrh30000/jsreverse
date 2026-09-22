#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 生成可直接注入页面的 hook 脚本。
 *
 * 支持预设：
 * - cryptojs: 拦截 CryptoJS 对称加解密与 Hash/HMAC finalize
 * - jsencrypt: 拦截 JSEncrypt RSA（支持全局与 Webpack 闭包特征嗅探）
 * - smcrypto: 拦截国密 SM2/SM3/SM4（支持全局与 Webpack 模块试算探测）
 * - jsvmp-proxy / jsvmp-transparent: JSVMP 虚拟机探针
 * - antidebug: 反调试综合防御（debugger清除、console保护、窗口尺寸伪造、强退拦截、反Hook/iframe原生借用阻断）
 * - dataflow: 数据流追踪（Promise resolve回调追踪、Cookie写入、Storage存储、网络请求、时间随机数固定）
 * - spa-vue: Vue 2/3 动态路由深度提取、导航守卫解除、强跳阻断
 * - spa-react: React Fiber 树与 Router 动态路由提取
 *
 * 用法：
 *   node build-hook.js antidebug --out hook-antidebug.js
 *   node build-hook.js spa-vue --out hook-vue.js
 *   node build-hook.js dataflow --targets promise,cookie --keyword token --out hook-dataflow.js
 *   node build-hook.js cryptojs --algorithms AES,MD5 --out hook-cryptojs.js
 */

import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

import {
  installAntidebugHook,
} from './hooks/antidebug.js';
import {
  installCryptoJSHook,
  installJSEncryptHook,
  installSMCryptoHook,
} from './hooks/crypto-libs.js';
import {
  installDataflowHook,
} from './hooks/dataflow.js';
import {
  installSpaReactHook,
  installSpaVueHook,
} from './hooks/spa-router.js';
import {
  installJsvmpProxyHook,
  installJsvmpTransparentHook,
} from './probes/jsvmp.js';

const PRESETS = {
  cryptojs: {
    hookId: 'hook_cryptojs',
    install: installCryptoJSHook,
    description: '拦截 CryptoJS 的 AES/DES/MD5/SHA/HMAC 加解密入参与密文（含 finalize）',
  },
  jsencrypt: {
    hookId: 'hook_jsencrypt',
    install: installJSEncryptHook,
    description: '拦截 JSEncrypt RSA 的公私钥、明文与密文（支持全局与 Webpack 闭包）',
  },
  smcrypto: {
    hookId: 'hook_smcrypto',
    install: installSMCryptoHook,
    description: '拦截国密 SM2/SM3/SM4（支持全局与 Webpack 试算探测）',
  },
  antidebug: {
    hookId: 'antidebug_suite',
    install: installAntidebugHook,
    description: '反调试综合防御：debugger清除、console保护、窗口尺寸伪造、强退拦截、反Hook/iframe原生借用阻断',
  },
  dataflow: {
    hookId: 'hook_dataflow',
    install: installDataflowHook,
    description: '数据流观测：Promise resolve/回调追踪、Cookie写入、Storage操作、XHR/Fetch及固定时间/随机数',
  },
  'spa-vue': {
    hookId: 'spa_vue_router',
    install: installSpaVueHook,
    description: 'Vue 2/3 动态路由深度提取、导航守卫解除、强跳阻断',
  },
  'spa-react': {
    hookId: 'spa_react_router',
    install: installSpaReactHook,
    description: 'React Fiber 树与 Router 动态路由扫描与候选提取',
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
 * 两点约束：
 * 1. install 函数体内不允许引用模块级外部变量。
 * 2. 结尾不能有分号。
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

  if (preset === 'antidebug') {
    return {
      bypassDebugger: options.bypassDebugger ?? true,
      consoleGuard: options.consoleGuard ?? true,
      windowDimensions: options.windowDimensions ?? true,
      navGuard: options.navGuard ?? true,
      redirectTrap: options.redirectTrap ?? false,
      antiAntiHook: options.antiAntiHook ?? true,
      fixedWidth: options.fixedWidth ?? 1366,
      fixedHeight: options.fixedHeight ?? 660,
      fixedOuterWidth: options.fixedOuterWidth ?? 1400,
      fixedOuterHeight: options.fixedOuterHeight ?? 760,
    };
  }

  if (preset === 'dataflow') {
    return {
      targets: options.targets ?? ['all'],
      keyword: options.keyword ?? '',
      cookieMatch: options.cookieMatch ?? '',
      limitPerApi: options.limitPerApi,
      logAt: options.logAt ?? true,
      fixedTime: options.fixedTime,
      fixedRandom: options.fixedRandom,
      logFormat,
    };
  }

  if (preset === 'spa-vue') {
    return {
      clearGuards: options.clearGuards ?? true,
      blockRedirects: options.blockRedirects ?? false,
      pollInterval: options.pollInterval ?? 300,
      maxTries: options.maxTries ?? 10,
    };
  }

  if (preset === 'spa-react') {
    return {
      pollInterval: options.pollInterval ?? 400,
      maxTries: options.maxTries ?? 10,
    };
  }

  const scriptUrl = options.scriptUrl ?? '';
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
    .map(([name, entry]) => `  ${name.padEnd(20)} ${entry.description}`)
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

antidebug options:
  --bypass-debugger=false 关闭 eval/Function debugger 绕过
  --console-guard=false   关闭 console 保护与 console.clear/table 抑制
  --window-dimensions=false 关闭 1366x768 窗口尺寸伪造
  --nav-guard=false       关闭 window.close 与 history 强退拦截
  --redirect-trap         开启 onbeforeunload 跳转拦截断点（用于定位重定向代码）
  --anti-anti-hook=false  关闭 Function.toString 伪装与 iframe contentWindow 原生借用阻断
  --fixed-width <n>       伪造 innerWidth (默认 1366)
  --fixed-height <n>      伪造 innerHeight (默认 660)

dataflow options:
  --targets <list>      promise,cookie,storage,network,freeze-time,builtins 逗号分隔（默认 all）
  --keyword <str>       关键词过滤（匹配 cookie 名、storage key、URL、编解码入参）
  --cookie-match <str>  对包含该字符串的 Cookie 写入下条件断点 (debugger)
  --limit-per-api <n>   单类别/单接口最大日志打印限额 (默认 50，防止无限循环卡死)
  --log-at=false        关闭调用源堆栈 (文件名与行号) 打印
  --fixed-time <n>      固定 Date.now() 时间戳
  --fixed-random <n>    固定 Math.random() 返回值 (默认 0.5)

spa-vue / spa-react options:
  --clear-guards=false  spa-vue: 不自动清除 beforeEach / beforeResolve 守卫
  --block-redirects     spa-vue: 清空 router.push/replace/go 阻断页面跳转
  --max-tries <n>       扫描尝试次数 (默认 10)

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
  node build-hook.js antidebug --out hook-antidebug.js
  node build-hook.js spa-vue --block-redirects --out hook-vue.js
  node build-hook.js dataflow --targets promise,cookie --keyword token --out hook-data.js
  node build-hook.js cryptojs --algorithms AES,MD5 --out hook-cryptojs.js
`);
}

const BOOL_FLAGS = [
  'track-calls',
  'track-props',
  'track-reflect',
  'bypass-debugger',
  'console-guard',
  'window-dimensions',
  'nav-guard',
  'redirect-trap',
  'anti-anti-hook',
  'clear-guards',
  'block-redirects',
  'log-at',
];

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
      targets: {type: 'string'},
      keyword: {type: 'string'},
      'cookie-match': {type: 'string'},
      'limit-per-api': {type: 'string'},
      'fixed-time': {type: 'string'},
      'fixed-random': {type: 'string'},
      'fixed-width': {type: 'string'},
      'fixed-height': {type: 'string'},
      'fixed-outer-width': {type: 'string'},
      'fixed-outer-height': {type: 'string'},
      'max-tries': {type: 'string'},
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
    targets: values.targets ? parseList(values.targets) : undefined,
    keyword: values.keyword,
    cookieMatch: values['cookie-match'],
    limitPerApi: values['limit-per-api'] ? Number(values['limit-per-api']) : undefined,
    logAt: boolFlags.values['log-at'],
    fixedTime: values['fixed-time'] ? Number(values['fixed-time']) : undefined,
    fixedRandom: values['fixed-random'] ? Number(values['fixed-random']) : undefined,
    fixedWidth: values['fixed-width'] ? Number(values['fixed-width']) : undefined,
    fixedHeight: values['fixed-height'] ? Number(values['fixed-height']) : undefined,
    fixedOuterWidth: values['fixed-outer-width'] ? Number(values['fixed-outer-width']) : undefined,
    fixedOuterHeight: values['fixed-outer-height'] ? Number(values['fixed-outer-height']) : undefined,
    maxTries: values['max-tries'] ? Number(values['max-tries']) : undefined,
    bypassDebugger: boolFlags.values['bypass-debugger'],
    consoleGuard: boolFlags.values['console-guard'],
    windowDimensions: boolFlags.values['window-dimensions'],
    navGuard: boolFlags.values['nav-guard'],
    redirectTrap: boolFlags.values['redirect-trap'],
    antiAntiHook: boolFlags.values['anti-anti-hook'],
    clearGuards: boolFlags.values['clear-guards'],
    blockRedirects: boolFlags.values['block-redirects'],
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
