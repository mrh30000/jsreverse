/**
 * @license
 * Copyright 2026 Browser-CLI
 * SPDX-License-Identifier: Apache-2.0
 */

const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');

async function tryWebcrack(code, options = {}) {
  try {
    const {webcrack} = require('webcrack');
    const result = await webcrack(code, {
      unpack: options.unpack !== false,
      unminify: options.unminify !== false,
      mangle: options.mangle !== false,
      jsx: options.jsx !== false,
    });

    const bundleInfo = result.bundle
      ? {
          type: result.bundle.type,
          entryId: result.bundle.entryId,
          moduleCount: result.bundle.modules ? result.bundle.modules.size : 0,
        }
      : null;

    return {
      success: true,
      code: result.code,
      bundle: bundleInfo,
      rawResult: result,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

function unpackWebpackAstFallback(code) {
  try {
    const ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx'],
    });

    const modules = new Map();
    let detectedType = null;

    // 匹配: (function(modules) { ... })([function(module, exports) { ... }])
    traverse(ast, {
      CallExpression(pathNode) {
        if (modules.size > 0) return;
        const {callee, arguments: args} = pathNode.node;
        if (!t.isFunctionExpression(callee)) return;

        // 模块容器通常是第一个实参；webpack 包装器可能携带额外实参
        // （如 (function(modules, runtime){...})({...}, {...})），因此不限制
        // 实参个数，只从首个实参提取模块。
        if (args.length >= 1) {
          const arg = args[0];
          // 数组形式
          if (t.isArrayExpression(arg)) {
            detectedType = 'webpack-array';
            arg.elements.forEach((elem, idx) => {
              if (
                elem &&
                (t.isFunctionExpression(elem) ||
                  t.isArrowFunctionExpression(elem))
              ) {
                modules.set(
                  String(idx),
                  generator(elem, {compact: false}).code,
                );
              }
            });
          } else if (t.isObjectExpression(arg)) {
            // 对象形式
            detectedType = 'webpack-object';
            arg.properties.forEach(prop => {
              if (t.isObjectProperty(prop)) {
                let key;
                if (t.isStringLiteral(prop.key)) {
                  key = prop.key.value;
                } else if (t.isNumericLiteral(prop.key)) {
                  key = String(prop.key.value);
                } else if (t.isIdentifier(prop.key)) {
                  key = prop.key.name;
                } else {
                  return;
                }
                if (
                  t.isFunctionExpression(prop.value) ||
                  t.isArrowFunctionExpression(prop.value)
                ) {
                  modules.set(
                    key,
                    generator(prop.value, {compact: false}).code,
                  );
                }
              }
            });
          }
        }
      },
    });

    if (modules.size > 0) {
      return {
        success: true,
        type: detectedType,
        modules,
      };
    }

    return {success: false, error: 'No webpack module container found'};
  } catch (err) {
    return {success: false, error: err.message};
  }
}

async function unpackWithWebcrack(code, options = {}) {
  // 1. 优先尝试完整的 webcrack 库
  const wcResult = await tryWebcrack(code, options);
  if (wcResult.success) {
    let bundle = wcResult.bundle;
    if (!bundle) {
      const fallback = unpackWebpackAstFallback(code);
      if (fallback.success) {
        bundle = {
          type: fallback.type,
          moduleCount: fallback.modules.size,
        };
      }
    }

    const outputDir = options.outputDir;
    if (outputDir && wcResult.rawResult.save) {
      try {
        await wcResult.rawResult.save(outputDir);
      } catch (err) {
        return {
          success: false,
          error: `Webcrack save failed: ${err.message}`,
          code: wcResult.code,
        };
      }
    }
    return {
      success: true,
      engine: 'webcrack',
      code: wcResult.code,
      bundle,
    };
  }

  // 2. 备用 AST 提取
  const fallback = unpackWebpackAstFallback(code);
  if (fallback.success) {
    const outputDir = options.outputDir;
    if (outputDir) {
      fs.mkdirSync(outputDir, {recursive: true});
      for (const [id, modCode] of fallback.modules.entries()) {
        // id 来自不可信 bundle 内容，需消毒后再拼路径，避免目录穿越写入。
        const safeId = String(id).replace(/[^A-Za-z0-9_-]/g, '_');
        const modPath = path.join(outputDir, `module_${safeId}.js`);
        if (
          path
            .relative(path.resolve(outputDir), path.resolve(modPath))
            .startsWith('..')
        ) {
          continue;
        }
        fs.writeFileSync(modPath, modCode, 'utf8');
      }
    }
    return {
      success: true,
      engine: 'ast-fallback',
      code,
      bundle: {
        type: fallback.type,
        moduleCount: fallback.modules.size,
      },
    };
  }

  return {
    success: false,
    error: `Webcrack failed: ${wcResult.error}; AST fallback failed: ${fallback.error}`,
    code,
  };
}

if (require.main === module) {
  (async () => {
    const [, , inputPath, outputTarget] = process.argv;
    if (!inputPath) {
      process.stderr.write(
        'Usage: node unpack-webcrack.js <input.js> [output-dir-or-file]\n',
      );
      process.exit(1);
    }

    const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
    const isDir =
      outputTarget &&
      (!outputTarget.endsWith('.js') ||
        (fs.existsSync(outputTarget) &&
          fs.statSync(outputTarget).isDirectory()));

    const result = await unpackWithWebcrack(raw, {
      outputDir: isDir ? path.resolve(outputTarget) : undefined,
    });

    if (!result.success) {
      process.stderr.write(`Error: ${result.error}\n`);
      process.exit(1);
    }

    if (outputTarget && !isDir) {
      // AST 兜底只把模块另存到目录；文件模式下写出的仍是原始 bundle 源码。
      // 若不提示，使用者会误以为拿到了解包结果。
      if (result.engine === 'ast-fallback') {
        process.stderr.write(
          'Warning: webcrack failed; AST fallback extracted modules only. ' +
            'Output file contains the original bundle source, not merged deobfuscated code.\n',
        );
      }
      fs.mkdirSync(path.dirname(path.resolve(outputTarget)), {recursive: true});
      fs.writeFileSync(path.resolve(outputTarget), result.code, 'utf8');
      process.stdout.write(`Unpacked code written to ${outputTarget}\n`);
    } else if (isDir) {
      process.stdout.write(
        `Unpacked bundle written to directory ${outputTarget}\n`,
      );
    } else {
      process.stdout.write(result.code + '\n');
    }
  })().catch(err => {
    process.stderr.write(`Error: ${err.stack || err.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  unpackWithWebcrack,
  tryWebcrack,
  unpackWebpackAstFallback,
};
