---
name: webpack-bundle-extraction
description: 打包产物（webpack 4/5、browserify、vite/rollup 直出）的目标模块抠取与在 node 里复用技能。当目标站的加密/签名函数被 webpack 打包、扣函数要一路跟下去或"缺哪个补哪个"补不完，或页面与产物里出现 `webpackJsonp`、`webpackChunk`、`self["webpackChunkapp"]`、`__webpack_require__`、`__webpack_module_cache__`、`__webpack_modules__`、`__webpack_require__.d/.e/.t`、`n("3452")` 这类「一元加载器 + 模块表」结构，或出现 `app.f24d08e9.js` / `chunk-vendors.bb13f90f.js` / `runtime.62249a5.js` 这类文件名、或报错 `Cannot read property 'call' of undefined` / `Cannot read properties of undefined (reading 'call')`、或想在 nodejs 里 require 浏览器打包结果、或要判断"这个文件到底是打包产物还是混淆产物"时使用。覆盖打包器家族识别、加载器/缓存表/模块表三对象定位、静态闭包计算、运行时半自动模块采集（条件断点与记录器）、`__exposedWebpackRequire` 全局导出、push 注册形态重建、动态导出（`.d()` getter）语义、异步 chunk（`.e()`）处置、node 复用 prelude 与最小环境自吐、以及 RPC/无头/WASM 三条免抠路线与"该不该抠"决策。用户提到 webpack 扣代码、webpack 改写、半自动抠 webpack、AST 自动扣 webpack、扣加载器、补模块、`loader-export`、jsdom 复用打包代码、`Cannot read property 'call' of undefined`、webpack 补环境时都应使用本技能。用户提到「缓存表里有 id 但字段 undefined」「循环依赖只拿到空 exports」「模块初始化顺序不对」「__webpack_module_cache__ 何时写入」时也应使用本技能。
---

# 打包产物抠取与 node 复用

一句话：**先把「这是什么打包器、加载器在哪、模块表长什么样」定下来，再扣模块；扣完必须做端到端数值对拍。**

这一族最大的坑不是难，而是**错得静默**：模块少扣一个时产物**照样能加载**，
只在第一次调用时抛 `Cannot read properties of undefined (reading 'call')`；
读成 `Node.js/22` 的 UA 会让嗅 UA 的分支全走错边而**不报任何错**。
所以本技能自带两类强断言：**实跑产物对拍**与**必须被拒绝**。

> 家族识别与结构常量在 `references/bundler-identification.md`，
> 抠取流程在 `references/harvest-routes.md`，
> 复用与补环境交接在 `references/node-reuse-and-env-handoff.md`，
> 运行时的全局导出（`window.X = <加载器>`）与「整包交给 JS 引擎」在 `references/webpack-runtime-export-and-host-reuse.md`，
> 免抠路线在 `references/no-harvest-routes.md`。本文只给分流判据与执行顺序。

## 判族（30 秒分流）

| 一眼看到什么 | 家族 | 加载器在哪 | 下一步 |
| --- | --- | --- | --- |
| `(self.webpackChunk<名> = … \|\| []).push([[chunk],{…},[[入口]]])` | webpack5-push | **另一个文件**（runtime.js） | 对 runtime 跑 `loader-export`，对 chunk 跑 `closure`/`emit` |
| `(window.webpackJsonp = … \|\| []).push([[242],{…}])` | webpack4-jsonp | runtime.js | 同上 |
| `!function(t){ … function e(s){…} … }({ 10:function(t,e,n){…} })` | webpack-inline-iife | 本文件 | `emit` 一次出产物 |
| 有加载器、没有模块表 | webpack-runtime-only | 本文件 | 这是 runtime，去别的 chunk 上跑 `closure` |
| `[function(require,module,exports){…}` | browserify | 无独立加载器 | 按 CommonJS 边界切，见 `../ast-deobfuscation/references/webcrack-bundle-unpack.md` |
| 顶层 `import`/`export`、无加载器 | esm-bundler | 无 | 走源码级处理或 `../sourcemap-reverse/SKILL.md` |
| 找不到任何上述特征 | unknown | — | 先确认没抓错文件；仍不行则先反混淆再回来 |

先把文件存到本地，然后：

```bash
node .claude/skills/webpack-bundle-extraction/scripts/detect-bundler.js <bundle.js>
```

**退出码 `2` 不是失败，是结论**：「这个文件不是打包产物」。
**先跑它，不要先读 JS** —— 判错族会让你得出「这个站没有加载器」这种错误结论。

## 工作流

1. **判族 + 定位三对象**：`detect-bundler.js` 给出 `loader{cacheIdent, modulesIdent}` 与模块表 id 列表。
2. **挑路线**（判据见 `references/harvest-routes.md` 开头「先选路线」一节）：
   - 模块表与加载器同文件 → **A 静态闭包**：
     ```bash
     node .../harvest-bundle.js emit <bundle.js> --entry <模块id> -o one_bundle.js
     ```
   - 分文件（webpack 4/5 常态）→ `closure` / `emit` 带 `--runtime <runtime.js>`，并对 runtime 跑 `loader-export`；
   - 静态扫不出依赖 → **B 运行时记录**：`loader-export --record` 或 `breakpoint`（生成真实变量名的断点表达式）；
   - 闭包过大 / 只要几个 oracle 值 → **免抠**，见 `references/no-harvest-routes.md`。
3. **🔴 CHECKPOINT · 端到端数值对拍（必做）**：同一个输入，**原产物与抠取产物的返回值必须逐字节相同**。
   只做「加载不报错」不算验收。
4. **补缺失**：`closure` 的 `missing` 与 `wrap` 的 `null` 条目就是待补清单（异步 chunk 居多）。
   **必须看到这份清单**，不要靠「跑起来没报错」判断。
5. **写 run.js**：`emit` 已生成骨架（内联 prelude），把「按站点真实调用方式取值」那行补完。

## 三条最容易踩的静默错误

| 错误 | 症状 | 判据 / 处置 |
| --- | --- | --- |
| 闭包用**加载器名**去匹配依赖 | 闭包只剩入口模块 | 模块体内的 require 是**模块函数第 3 个形参**（常是 `n`/`o`），不是加载器函数名 |
| 模块表识别用了**标识符正则** | 模块 id 全被漏掉，退化成把 `dbl:function(a){}` 当模块表 | 模块 id **可以数字开头**（`10:` / `245:`） |
| 用 `globalThis.navigator = {...}` 补 UA | 静默失败，读到 `Node.js/22` | Node ≥ 21 的 `navigator` 是惰性 getter，**必须 `Object.defineProperty`** |

## 术语（首次出现即此处定义，避免歧义）

| 术语 | 含义 | 别混用 |
| --- | --- | --- |
| **加载器**（`__webpack_require__`） | 一元函数：查缓存 → 取模块表 → `.call` → 返回 exports | 与「模块函数」区分；模块函数是模块表里的 value |
| **模块缓存**（`__webpack_module_cache__`） | `{id: {exports}}` 的实例缓存 | 本文档里简称「缓存表」，与「模块表」是两回事 |
| **模块表**（`__webpack_modules__`） | `{moduleId: 模块函数}` 或 `[模块函数,…]` | 简称与「字符串表 / 字典」区分，见 `references/bundler-identification.md` |
| **push 形态 / call 形态** | 注册语句的两种写法：`.push([[...],{…}])` / `LOADER(["chunk"],{…})` | 它们的**重建方式不同**，不能互相改写 |
| **闭包** | 从入口模块出发沿 require 可达的模块集合 | 不是 JS 语言意义上的闭包 |

**缓存表的语义：为什么「缓存里有这个 id」不等于「模块跑完了」**

加载器的形状是「查缓存 → 取模块表 → `.call` → 返回 exports」，而**缓存条目在模块体执行之前**就被写入：

```js
function require(id) {
  if (cache[id]) return cache[id].exports;              // ① 先查
  const module = cache[id] = {exports: {}};             // ② 立刻登记（此时 exports 还是空的）
  modules[id].call(module.exports, module, module.exports, require);  // ③ 再执行模块体
  return module.exports;
}
```

（源文里这个变量叫 `exportsInfo`，产物里叫 `__webpack_module_cache__` —— 同一套语义的两个名字。）

⇒ **循环依赖时，先拿到的那一方看到的 exports 是「对象地址正确、属性还没填」**
（对象是同一个引用，所以后续填上的属性也会出现在它身上 —— 这正是"记忆化搜索"能解开循环依赖的原因）。

三条与抠取直接相关的结论：

1. **不能用「缓存表里有这个 id」判断模块已执行完** —— 它在执行前就存在了。
   要判断"跑完了"只能自己打标记（在模块体末尾赋值一个哨兵）。
2. **模块初始化顺序决定字段可见性**：从入口 BFS 得到的到达顺序 **≠** 运行时执行顺序
   （循环边会让两者分叉）。在 Node 里复用产物时，字段是 `undefined` 常常是**顺序问题**，
   而不是"没抠到"—— 先怀疑顺序，再怀疑抠取。
3. **静态抠取可以安全忽略这一层**：依赖图（可达模块 + 依赖边）与执行顺序**无关**；
   只有**动态复用**（`references/node-reuse-and-env-handoff.md`）时才需要关心初始化顺序。

**唯一权威源**：家族判据与结构常量以 `references/bundler-identification.md` 为准；
本文的表格是速查版，两者冲突时改本文。
（`web-reverse-algorithm` / `ast-deobfuscation` 里只放**指针**，不复制判据表。）

## 命令入口

下面每条都标注了「能直接跑」还是「需要你自己的样本」；`<...>` 是占位符。
需要样本的命令，用自检夹具 `artifacts/skill-evolution/b11-run-20260921-1930/wpfixture/` 里的
`bundle.js` / `runtime.js` / `expect.json` 可以直接替换（`expect.json` 里 `entry=1001`、
`expectedClosure` 是生成器独立 BFS 出的期望闭包，可用来核对 `closure` 的输出）：

```bash
S=.claude/skills/webpack-bundle-extraction/scripts

# 0) 全部脚本自检（含「必须被拒绝」「实跑产物对拍」两类反向断言）
#    注意：**不要把断言条数写进文档**（手抄的数字必然漂移），以实跑输出为准。
node $S/detect-bundler.js --selftest
node $S/harvest-bundle.js --selftest
node $S/env-shim.js --selftest

# 1) 判族 + 定位加载器/模块表（`--json` 给机器读）
node $S/detect-bundler.js <bundle.js>
node $S/detect-bundler.js <bundle.js> --json

# 2) 半自动：生成「贴到 DevTools 就能用」的断点表达式（真实变量名 + 真实行号）
node $S/harvest-bundle.js breakpoint <runtime.js>

# 3) 静态闭包：可达模块 / 依赖边 / 缺失模块
#    退出码 2 有两种含义，看输出即可区分：① 闭包不完整（列了缺失模块 id）
#    ② 模块表未被佐证（拒绝执行）；0 = 正常
node $S/harvest-bundle.js closure <chunk.js> --entry <模块id> --runtime <runtime.js>

# 4) 产出最小产物 + run.js 骨架
#    emit 会顺手写出 runtime.exported.js（给 runtime 加全局导出），run.js 引用的是它，
#    所以不必先手工 loader-export。
node $S/harvest-bundle.js emit <chunk.js> --entry <模块id> --runtime <runtime.js> -o one_bundle.js
node $S/harvest-bundle.js loader-export <runtime.js> -o runtime.exported.js   # 想单独做也行
node $S/harvest-bundle.js loader-export <runtime.js> --record -o runtime.rec.js   # 带模块记录器

# 5) 运行时收集的 harvest.json → one_bundle.js
#    --template 提供「外壳」：用它原来的 chunk 名与注册形态（push / call）重建产物；
#    不给 --template 时产出一个通用的 webpackChunkHarvest push 语句（只适合自己写的运行时）。
node $S/harvest-bundle.js wrap --harvest harvest.json --template <bundle.js> -o one_bundle.js

# 6) node 复用：最小 prelude（`--trace` 打开环境自吐）
node $S/env-shim.js --print
node $S/env-shim.js --print --trace > prelude.js
node $S/env-shim.js --run <bundle.js>

# 7) 类真实回归夹具 + 端到端对拍（220 模块随机依赖图；生成器独立算 BFS 闭包做期望值）
#    --verify 会真的跑：模块数 / 闭包逐元素 / 每个入口的产物取值与体积，任一不成立退出码 1
node artifacts/skill-evolution/tools/make-webpack-fixture.js   --out artifacts/skill-evolution/wpfix --modules 220 --verify --entries 1001,1200
#    不带 --verify 时只生成夹具（bundle.js / runtime.js / expect.json），
#    再手动跑闭包：--entry 用 expect.json 里的 entry 字段（默认 1001）
node $S/harvest-bundle.js closure artifacts/skill-evolution/wpfix/bundle.js   --entry 1001 --runtime artifacts/skill-evolution/wpfix/runtime.js
```

**子命令一览**（`harvest-bundle.js`，共 5 个 + 自检）：
`detect`（等价 detect-bundler）/ `loader-export` / `breakpoint` / `closure` / `emit` / `wrap`。
另有开关：`--force`（跳过「模块表未被佐证」拦截）、`--any-call`（放弃按 require 形参名匹配，
改用「id 命中模块表」兜底）、`--as <表达式>`（加载器匿名时手工指定导出表达式）、
`--loader <名>`（手工指定模块体内 require 的标识符）、`--dir <目录>`（产物落盘目录）、
`--runtime <文件>`、`--template <文件>`、`--record`（注入模块记录器）。

## 失败模式与一线修复

| 触发条件 | 一线修复 | 仍失败兜底 |
| --- | --- | --- |
| `Cannot read properties of undefined (reading 'call')` | **闭包不完整**：看 `closure` 的 `missing` / `wrap` 的 `null`，补对应 chunk | 在浏览器里对缺失 id 再跑一轮记录器 |
| `xxx.call is not a function`（模块函数不是函数） | 模块表 key 与函数错位（把嵌套对象当模块表） | 用 `detect-bundler.js --json` 看 `tables[].ids` 是否含业务方法名（如 `nested`/`txt`） |
| `require_ is not a function` | runtime 没全局导出加载器 | 对 runtime 跑 `loader-export`，确认注入点在加载器函数体之后 |
| 产物加载成功但 `Object.keys(mod)` 只有一个 key | 模块函数 `module`/`exports` 形参抄错，或导出是 `.d()` getter | 见 `references/bundler-identification.md` §6 |
| `webpackChunk*` 是裸数组、模块没注册 | runtime 没拦截到注册（**未做回收**的 runtime 必须先把 runtime 加载进来） | 见 `references/node-reuse-and-env-handoff.md` §1 |
| 第一次调用对、第二次错 | **跨请求有状态变量**没回传 | 见 `references/node-reuse-and-env-handoff.md` §5 |
| 值结构对但数字不同 | 密文含时间戳/随机数 | 同一时刻、同一输入再比一次 |
| 报错落在风控 SDK 里 | 这已不是「复用」问题 | 切 `../web-js-env-patcher/SKILL.md` |
| `closure`/`emit` 报「模块表未被佐证」并 exit 2 | 该文件是二次混淆的字符串表，或抓错了文件 | 先跑 `detect-bundler.js`；确认真是打包产物时加 `--force` |

## 反例黑名单

- **不要用「跑起来没报错」验收。** 少一个模块时产物照样能加载，只在调用时炸。
- **不要跳过判族直接找加载器。** 白花半天之后你会得出「这个站没有加载器」。
- **不要在抠取过程中顺手反混淆。** 两个目标混做后，「跑不出结果」的原因不可判（`references/harvest-routes.md` §6）。
- **不要为了优雅去抠只调用一次的站点。** RPC 是分钟级，抠取是小时级。
- **不要把「抠出来能跑」当成「算法已还原」。** 前者是可复用黑盒，后者是 `../web-reverse-algorithm/SKILL.md` 的事。
- **不要格式化抠出来的产物。** 部分站点有「函数体被格式化即自校验失败」的判断（例如判断 `fn.toString()` 是否含换行），美化后**必然失败**。
- **不要在只有一组明文密文对时宣称复用成功。** 至少 3 组输入、且包含边界值。

## 资源

- `references/bundler-identification.md`：家族对照表、三对象模型、三种真实加载器写法、
  模块函数形参顺序、模块表两处「看着对其实全错」、push 注册三细节、静态/动态导出、异步 chunk、开发/生产模式差异、`.map` 路线。
- `references/harvest-routes.md`：三条抠取路线选型与完整步骤、断点表达式生成、
  运行时记录三个坑、手抠适用边界、**三个必须做的验收断言**、自动化替代品对照。
- `references/node-reuse-and-env-handoff.md`：三段式复用骨架、最小 prelude（含 `defineProperty` 陷阱）、
  缺什么补什么 vs 环境自吐、**与 `web-js-env-patcher` 的交接判据表**、跨请求有状态变量、其他对不上的原因。
- `references/webpack-runtime-export-and-host-reuse.md`：**`window.X = <加载器>` 的全局导出判据**、
  整包 + 薄调用壳交给 JS 引擎（`execjs`）的宿主复用、入参是对象不是字符串、
  与抠取路线（`node-reuse-and-env-handoff.md`）的分工表、代价与边界。
- `references/no-harvest-routes.md`：该不该抠的三个问题、无头浏览器 / RPC 桥 / WASM 三条免抠路线、
  三条路对照表、**「用免抠取 oracle + 用抠取做实现」的组合打法**。
- `scripts/detect-bundler.js`：家族识别 + 加载器/模块表定位（`--json`，退出码 2 = 不是打包产物）。
- `scripts/harvest-bundle.js`：`loader-export` / `breakpoint` / `closure` / `emit` / `wrap` 五个子命令。
- `scripts/env-shim.js`：最小环境 prelude 与 `--trace` 环境自吐（**不是补环境技能**，完整补环境见 `../web-js-env-patcher/SKILL.md`）。
- `scripts/lib/bundle-scan.js`：零依赖结构扫描库（掩码串 + 位置校验），供上述脚本复用。

## 校验

- 每个脚本都必须能独立通过 `node --check` 与 `--selftest`；新增断言要覆盖**失败分支**
  （非法输入必须被拒绝、缺失模块必须被报出、产物必须能实跑对拍）。
- 修改脚本后，按 `skill-creator` 的校验流程做结构校验（frontmatter 合法、`name` 与目录名一致、引用可达）。
  **不要写死某个机器的绝对路径**。
- 真实样本的产物、`harvest.json`、对拍结果都留在案例目录里，便于下一批复跑与判断站点是否改版。
