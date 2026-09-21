#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {parseArgs} from 'node:util';

function printHelp() {
  console.log(`
wasm-run.js - 脱机执行 WebAssembly 导出函数 (优先原生 Node.js，支持 wasmtime / wasmer)

用法:
  node wasm-run.js --input <file.wasm> --invoke <functionName> [选项]

选项:
  -i, --input <path>           .wasm 文件路径 [必需]
      --invoke <name>          调用的导出函数名称 [必需]
      --args <arg1,arg2...>    传递给导出函数的参数（逗号分隔或单个数值） [默认: 无入参]
      --runtime <rt>           执行引擎: auto | node | wasmtime | wasmer [默认: auto]
      --json                   以 JSON 格式输出执行结果与耗时
  -h, --help                   显示帮助信息

示例:
  node wasm-run.js -i ./math.wasm --invoke add --args 10,20
  node wasm-run.js -i ./sign.wasm --invoke get_hash --runtime node
  node wasm-run.js -i ./target.wasm --invoke main --runtime wasmtime --json
`);
}

function probeCli(command) {
  try {
    const res = spawnSync(command, ['--version'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return res.status === 0;
  } catch {
    return false;
  }
}

async function runWithNode(bytes, functionName, args) {
  const start = performance.now();
  // 创建通用的 stub importObject
  const importObject = {
    env: new Proxy({}, {get: () => () => 0}),
    wasi_snapshot_preview1: new Proxy({}, {get: () => () => 0}),
  };

  const module = await WebAssembly.compile(bytes);
  const instance = await WebAssembly.instantiate(module, importObject);

  const fn = instance.exports[functionName];
  if (typeof fn !== 'function') {
    const available = Object.keys(instance.exports).filter(
      k => typeof instance.exports[k] === 'function',
    );
    throw new Error(
      `未在 Wasm 模块中找到导出函数 "${functionName}"。可用导出函数: ${available.join(', ') || '无'}`,
    );
  }

  // 尝试将参数转换为数字
  const parsedArgs = args.map(a => {
    const num = Number(a);
    return isNaN(num) ? a : num;
  });

  const result = fn(...parsedArgs);
  const durationMs = Number((performance.now() - start).toFixed(2));

  return {
    runtime: 'node',
    returnValue: typeof result === 'bigint' ? result.toString() : result,
    durationMs,
  };
}

function runWithCli(runtimeName, inputPath, functionName, args) {
  const start = performance.now();
  const cliArgs = [path.resolve(inputPath), '--invoke', functionName, ...args];
  const res = spawnSync(runtimeName, cliArgs, {
    encoding: 'utf-8',
    timeout: 30000,
  });

  const durationMs = Number((performance.now() - start).toFixed(2));

  if (res.error) {
    throw new Error(`${runtimeName} 启动失败: ${res.error.message}`);
  }

  if (res.status !== 0) {
    throw new Error(
      `${runtimeName} 执行失败 (退出码 ${res.status}): ${res.stderr || res.stdout}`,
    );
  }

  return {
    runtime: runtimeName,
    stdout: res.stdout.trim(),
    returnValue: res.stdout.trim(),
    durationMs,
  };
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        input: {type: 'string', short: 'i'},
        invoke: {type: 'string'},
        args: {type: 'string', default: ''},
        runtime: {type: 'string', default: 'auto'},
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

  const inputPath = values.input || positionals[0];
  if (!inputPath || !values.invoke) {
    console.error('错误: 必须提供 --input 与 --invoke 参数');
    printHelp();
    process.exit(1);
  }

  const functionName = values.invoke;
  const args = values.args ? values.args.split(',').map(s => s.trim()) : [];
  const requestedRuntime = values.runtime;
  const isJson = Boolean(values.json);

  try {
    const bytes = Uint8Array.from(await readFile(path.resolve(inputPath)));
    let result;

    if (requestedRuntime === 'node') {
      result = await runWithNode(bytes, functionName, args);
    } else if (
      requestedRuntime === 'wasmtime' ||
      requestedRuntime === 'wasmer'
    ) {
      if (!probeCli(requestedRuntime)) {
        throw new Error(`本地环境中未找到 CLI 工具 "${requestedRuntime}"`);
      }
      result = runWithCli(requestedRuntime, inputPath, functionName, args);
    } else {
      // auto: 优先 Node 原生执行，若需要复杂 WASI 则回退 wasmtime
      try {
        result = await runWithNode(bytes, functionName, args);
      } catch (nodeErr) {
        if (probeCli('wasmtime')) {
          result = runWithCli('wasmtime', inputPath, functionName, args);
        } else if (probeCli('wasmer')) {
          result = runWithCli('wasmer', inputPath, functionName, args);
        } else {
          throw nodeErr;
        }
      }
    }

    if (isJson) {
      console.log(
        JSON.stringify(
          {
            success: true,
            input: path.resolve(inputPath),
            functionName,
            args,
            ...result,
          },
          null,
          2,
        ),
      );
    } else {
      console.log(`🚀 WebAssembly 函数脱机执行成功！`);
      console.log(`   引擎: ${result.runtime} | 耗时: ${result.durationMs}ms`);
      console.log(`   函数: ${functionName}(${args.join(', ')})`);
      console.log(
        `   返回值: ${result.returnValue !== undefined ? result.returnValue : '(void)'}`,
      );
    }
  } catch (error) {
    if (isJson) {
      console.log(
        JSON.stringify({success: false, error: error.message}, null, 2),
      );
    } else {
      console.error(`❌ 执行失败: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
