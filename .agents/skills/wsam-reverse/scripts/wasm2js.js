#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * WebAssembly 离线转译 Asm.js / 纯 JavaScript 脚本
 * 蒸馏自 v_jstools (wasm2js_demo.js) 纯算转译路线：
 * 使用 Binaryen 引擎将 .wasm 二进制模块离线发射为可直接在普通 JS 引擎中运行的 Asm.js 语法文本。
 *
 * 用法:
 *   node wasm2js.js -i <file.wasm> [选项]
 *
 * 选项:
 *   -i, --input <path>      .wasm 文件路径 [必需]
 *   -o, --output <path>     输出的 .js / .asm.js 文件路径
 *   -h, --help              显示帮助
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

function printHelp() {
  console.log(`
wasm2js.js - 离线将 WebAssembly (.wasm) 转译为纯 JavaScript / Asm.js 代码

用法:
  node wasm2js.js --input <file.wasm> [选项]

选项:
  -i, --input <path>         .wasm 文件路径 [必需]
  -o, --output <path>        输出的 JavaScript 文件路径 (默认: <input>.asm.js)
  -h, --help                 显示帮助信息

示例:
  node wasm2js.js -i ./module.wasm
  node wasm2js.js -i ./module.wasm -o ./module.asm.js
`);
}

async function loadBinaryen() {
  const possiblePaths = [
    'binaryen',
    path.join(process.cwd(), 'node_modules/binaryen'),
    'C:/Users/Administrator/node_modules/binaryen',
    'D:/work/Reverser-CLI/node_modules/binaryen',
  ];

  for (const p of possiblePaths) {
    try {
      const mod = await import(p);
      return mod.default || mod;
    } catch (_) {}
  }
  return null;
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string', short: 'i' },
      output: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help || !values.input) {
    printHelp();
    process.exit(values.help ? 0 : 1);
  }

  const inputPath = path.resolve(values.input);
  const outputPath = values.output
    ? path.resolve(values.output)
    : inputPath.replace(/\.wasm$/i, '.asm.js');

  if (!fs.existsSync(inputPath)) {
    console.error(`[-] 错误: 输入文件不存在: ${inputPath}`);
    process.exit(1);
  }

  const binaryen = await loadBinaryen();
  if (!binaryen) {
    console.error(`
[-] 提示: 未检测到 binaryen 模块。
    转译 Wasm 至 JavaScript 依赖 binaryen 库，请先通过 npm 安装:
      npm install -g binaryen
    或在项目根目录运行:
      npm install binaryen
    
    如需在浏览器控制台中直接免安装转译，请参考:
      .agents/skills/wsam-reverse/references/wasm-to-js-transpilation.md
`);
    process.exit(1);
  }

  console.log(`[*] 读取 Wasm 模块: ${inputPath}`);
  const wasmBuffer = fs.readFileSync(inputPath);

  try {
    const mod = binaryen.readBinary(new Uint8Array(wasmBuffer));
    console.log(`[*] 正在通过 Binaryen 发射 Asm.js 代码...`);
    const jsText = mod.emitAsmjs();
    fs.writeFileSync(outputPath, jsText, 'utf8');
    mod.dispose();
    console.log(`[+] 转译成功! 输出代码已保存至: ${outputPath}`);
  } catch (err) {
    console.error(`[-] 转译失败: ${err.message}`);
    process.exit(1);
  }
}

main();
