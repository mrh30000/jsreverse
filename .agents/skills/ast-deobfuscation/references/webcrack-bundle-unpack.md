# Webcrack 与 Webpack/Browserify 打包器拆包 (Bundle Unpacker)

## 与 `webpack-bundle-extraction` 的分工（先看这一段，别重复维护）

打包产物这一族有两个**目标完全不同**的子任务，各自的权威源如下：

| 子任务 | 你要的产出 | 权威源 |
| --- | --- | --- |
| **拆包落盘 + unminify**：把 bundle 按模块边界切成多文件、变量名还原、方便**读代码** | 一堆可读的模块文件 | 本文件 + `scripts/unpack-webcrack.js` |
| **抠取 + 在 node 里复用**：只取目标模块及其闭包、全局导出加载器、产出可**直接调用**的最小产物 | 可跑的 `one_bundle.js` + `run.js` | `../../webpack-bundle-extraction/SKILL.md` |

**判据：目标是「读懂」走本文件；目标是「跑出结果」走 `webpack-bundle-extraction`。**
两者可以串联，但**不要同时做**——混做之后「跑不出结果」的原因会变得不可判
（是模块没抠全，还是反混淆改了语义？）。

交接点只有一个：`webpack-bundle-extraction` 的 `closure`/`wrap` 会明确报出
「引用了但本文件里没有的模块」，那份清单正是本文件拆包结果要对照的东西。

## 概述

现代前端应用与反爬防御脚本往往被 Webpack、Browserify 或 Rollup 打包成单文件巨大 Bundle。在进行深入的逆向或算法提取前，若能将其按照原生模块边界（Module ID / Path）切分拆解，反混淆与逆向难度将呈指数级下降。

## 核心能力

1. **Bundle 自动探测与解构**：
   - 识别 Webpack 2+、Webpack 4/5 `__webpack_require__`、`webpackJsonp`、`webpackChunk` 引导结构。
   - 识别 Browserify `(function e(t,n,r){...})` 依赖字典结构。
2. **模块切分与落盘 (Save to Directory)**：
   - 将各个独立模块剥离，并按其真实逻辑路径或 `module_<id>.js` 存储到指定目录。
   - 识别主入口模块（`isEntry: true`）并建立索引清单。
3. **Unminify 与 Mangle 还原**：
   - 还原变量名作用域，展开压缩代码为清晰易读的语法树。
   - 支持 JSX / 模板字面量反编译。
4. **AST 原生备用解包 (AST Fallback)**：
   - 当上游环境或超大文件无法直接运行 Webcrack 时，脚本内置基于 Babel AST 的 Webpack 模块数组/对象直接提取器作为稳健兜底。

## 脚本入口

- `scripts/unpack-webcrack.js <input.js> <output-dir> [--save-modules]`
- 支持模块导出：

  ```javascript
  const {unpackWithWebcrack} = require('./unpack-webcrack');

  const result = await unpackWithWebcrack(code, {
    outputDir: './dist/unpacked',
    saveModules: true,
  });
  console.log(
    `Unpacked ${result.modulesCount} modules from ${result.bundleType}`,
  );
  ```
