# 打包器识别与结构模型（判族 · 唯一权威源）

> 本文件是「**这是什么打包器、加载器在哪、模块表长什么样**」的唯一权威源。
> 抠取流程在 `harvest-routes.md`，复用与补环境交接在 `node-reuse-and-env-handoff.md`。
> 脚本：`scripts/detect-bundler.js`（零依赖，不执行输入代码）。

## 一、为什么「判族」必须先做

打包产物的抠取姿态与集成形式**一一对应**。判错族的代价不是报错，而是**找不到加载器**：

- 把 `webpackJsonp` 形态当成自执行 IIFE 找加载器 → 本文件里根本没有加载器（它在 runtime 文件里），
  于是得出「这个站没有加载器」的结论，转头去硬抠业务函数。
- 把 webpack 5 的 `push` 形态当成 webpack 4 → 会去找 `webpackJsonp`，实际名字是 `webpackChunk<应用名>`。

**判据：先跑 `detect-bundler.js`，拿到 `family` 再决定下一步。** 它不执行输入代码，纯结构扫描。

## 二、家族对照表（30 秒分流）

| 家族 | 一眼可辨的特征 | 加载器在哪 | 抠取姿态 |
| --- | --- | --- | --- |
| `webpack5-push` | `(self.webpackChunk<名> = self.webpackChunk<名> \|\| []).push([[chunkIds],{模块表},[[入口]])` | **另一个文件**（runtime.js） | 先对 runtime 跑 `loader-export`，再对 chunk 跑 `closure`/`emit` |
| `webpack4-jsonp` | `.push([[242],{...}])`，或 `webpackJsonp<名>(["chunk"],{...})`（直接调用注册，见本文件「模块注册的两种形态」一节） | 通常在 runtime.js | 同上 |
| `webpack-inline-iife` | `!function(t){ …function e(s){…}… }({ 10:function(t,e,n){…} })`，加载器与模块表**同文件** | 本文件内 | `emit` 一次出产物（自带加载器） |
| `webpack-runtime-only` | 有加载器、**没有模块表** | 本文件内 | 这是 runtime：把它留下，去别的 chunk 上跑 `closure` |
| `browserify` | `[function(require,module,exports){…}` 或 `typeof require=="function"&&require` | 由 `(function e(t,n,r){…})` 引导，**没有独立的 `__webpack_require__`** | 不适用 webpack 流程；按 CommonJS 模块边界切，见 `../../ast-deobfuscation/references/webcrack-bundle-unpack.md` |
| `esm-bundler` | 顶层 `import`/`export`，无加载器 | 无 | rollup/vite/esbuild 直出 ⇒ 没有模块表可抠，改走源码级处理或 `sourcemap-reverse` |
| `unknown` | — | — | 先确认没抓错文件；仍不行则可能被二次混淆，先走 `../../ast-deobfuscation/SKILL.md` 还原字符串表再回来 |

`detect-bundler.js` 的退出码：`0` 识别成功、`2` 无法识别（会说明）、`1` 用法/IO 错误。
**`2` 不是失败，是结论**——它明确告诉你「这个文件不是打包产物」。

## 三、三对象模型（webpack 的骨架，strip 过也成立）

无论 webpack 几代、无论变量名被压成什么，骨架永远是这三个东西：

| 角色 | 开发模式名 | 形态 | 判据 |
| --- | --- | --- | --- |
| 加载器（模块解析器） | `__webpack_require__` | 一元函数，体内「查缓存 → 取模块表 → `.call(...)` → 返回 exports」 | **一元形参 + `X[id]` 查表 + `.call(` + `.exports`** 四条同时成立 |
| 模块缓存 | `__webpack_module_cache__` | 普通对象，`{id: {exports}}` | 出现在「命中即 return」的那一行 |
| 模块表 | `__webpack_modules__` | `{moduleId: 模块函数}` 或 `[模块函数, …]` | key 是模块 id（**可以数字开头**，如 `10:` / `245:` / `"7d92":` / `"./src/foo.js":`） |

三种真实加载器写法（都能被 `detect-bundler.js` 认出来）：

```js
// ① 经典（webpack ≤ 4）
function e(s){ if(i[s]) return i[s].exports;
  var n=i[s]={exports:{},id:s,loaded:!1};
  return t[s].call(n.exports,n,n.exports,e), n.loaded=!0, n.exports; }

// ② 新版内联判 undefined（webpack 5，手写/小体积）
function n(e){ if(i[e]!==undefined) return i[e].exports;
  var r=i[e]={exports:{}}; t[e].call(r.exports,r,r.exports,n); return r.exports; }

// ③ webpack 5 官方 runtime（先取局部变量再判）
function n(e){ var r=i[e];
  if(r!==undefined) return r.exports;
  var o=i[e]={exports:{}}; t[e].call(o.exports,o,o.exports,n); return o.exports; }
```

**模块函数的形参顺序是 `(module, exports, __webpack_require__)`**：

- 第 1 个形参是 **module**（所以压缩后常见 `e.exports = {...}`，此处的 `e` 是 module 不是 exports）；
- 第 2 个形参是 **exports**（`exports.foo = …` 用的是它）；
- 第 3 个形参才是该模块体内的 **require**。

这条顺序有两个直接后果，两个都会**静默出错**：

1. **闭包算错**：模块体内的 require 名字是**模块函数第 3 个形参名**（常是 `n`/`o`/`r`），
   与加载器自己的函数名（常是 `e`/`n`/`s`）**不保证相同**。只按加载器名匹配 ⇒ 闭包只剩入口模块，
   产物能加载、一调用就 `Cannot read properties of undefined (reading 'call')`。
   `harvest-bundle.js` 因此对每个模块单独取第 3 个形参作候选名。
2. **手抄模块时写错**：把 `module.exports=…` 抄成 `exports.exports=…`（参数名对不上），
   表现是「加载成功、`Object.keys(mod)` 里只有 `exports`、方法一个都取不到」。

## 四、模块表的两处「看着对、其实全错」

### 4.1 模块 id 可以数字开头

`10:function(t,e,n){}` 是合法对象字面量。若用**标识符正则**（`[A-Za-z_$][\w$]*`）去扫模块表，
会**一条都匹配不到**，然后退化成「把模块体内的 `dbl:function(a){}` 当成模块表」——
条目数 1、id 是 `dbl`。**结果看起来是识别成功了，实际全错。**

### 4.2 模块体内的嵌套对象会长出假模块表

`e.exports = { fn: function(a,b){...} }` 会被当成一个 1 项的子表。
`detect-bundler.js` 的处理：按所属对象字面量分组 → 剔除「被别的候选整段包住」的嵌套对象 →
先比条目数、再比「形参个数 1~3 的条目占比」(`moduleLike`)。

**自检判据**：对真实样本跑一遍，模块表条目数应该 ≈ 站点实际的模块数。
若报出来的 id 里有 `fn`/`nested`/`txt` 这类**业务方法名**，说明识别错了。

## 五、模块注册的两种形态（都要认）

```js
// 形态 A：push（webpack 5 的 webpackChunk*，以及 webpack 4 的早期写法）
(self.webpackChunkapp = self.webpackChunkapp || []).push([["src_foo_js"],{ …模块表… },[[245]]]);
//                                               └─ chunk 名数组 ─┘ └ 模块表 ┘ └ 入口 id ┘

// 形态 B：直接调用（webpack 4 把 JSONP 数组**替换成函数**之后的写法）
webpackJsonpdxCaptcha(["basic-captcha-js"],{ …模块表… });
```

实测样本：`project/dingxiang/sources/basic-captcha-js.js.orig`（顶象 `captcha.js`）用的是形态 B，
且全局名带后缀。**只认 `.push(...)` 的实现会在这种站上整个失配，并被判成 `unknown`。**

四个必须知道的细节：

1. **实参是一个数组，不是一个列表**（形态 A）。`.push([[242],{...}])` 只有一个实参（外层数组），
   按「两个实参」去解析会一条都匹配不到。必须先取外层数组，再切它的元素。
   形态 B 则是真正的两个实参。**两种都要支持**，判据是「第一个实参是数组、第二个（或外层数组的第二个元素）是对象」。
   先匹配 `.push(` **和** `webpackJsonp*` / `webpackChunk*` 后跟 `(` 两种入口，再用实参形状过滤。
2. **全局名可能带后缀**：`webpackJsonpdxCaptcha`、`webpackChunkapp`。
   用 `\bwebpackJsonp\b` 这类**带词边界**的正则会一条都匹配不到（后面紧跟的是单词字符，那里没有词边界）。
   必须写成 `\bwebpackJsonp[A-Za-z0-9_$]*`。
3. **接收者通常是表达式**：`(window.webpackJsonp = window.webpackJsonp || []).push(...)`。
   按 `标识符.push(` 匹配会全部漏掉（`.push` 前面是 `)`）。
4. **chunk 名必须原样保留，注册形态也不能改写**。重建产物时若丢掉第一个元素、
   或把形态 B 改写成 `.push(...)`，产物的挂钩方式就变了——表现为「模块表在、加载器也在，但没人注册」。

## 模块表的「第二条证据」判据

只有一张「键: 函数」的表时，**它不一定是模块表**。

真实反例：`project/dingxiang/sources/dx-captcha-index.js.orig` 里被扫出 110 项「模块表」，
键是 `+t5M` / `/8Uj` / `0` / `1Hmm` 这种 —— 那其实是**二次混淆的字符串解码字典**。
这个文件本身是 UMD 包裹的 runtime（`webpackJsonpdxCaptcha=function(t,e){...}`），
模块表在别处，而混淆让静态判定失效。

**判据（缺一不可）**：

- 存在**加载器**（一元函数 + `X[id]` 查表 + `.call(` + `.exports`），
  **或**存在一条**指向这张表的模块注册语句**；
- 二者都没有 ⇒ 表不可信。

`detect-bundler.js` 用 `tableCorroborated` 字段给出结论；`harvest-bundle.js` 的
`closure` / `emit` 在未被佐证时**直接拒绝执行**（exit 2），要跳过必须显式 `--force`。

**为什么必须拦**：不拦的后果是「闭包算得头头是道、产物生成成功，但 id 与源码整张都是错的」，
而且**不报任何错** —— 这正是本技能反复强调的静默失败家族里最贵的一种。

## 六、模块导出：静态导出 vs 动态导出

| 形态 | 源码 | 抠出来之后怎么取 |
| --- | --- | --- |
| 静态导出 | `module.exports = { fn: fn }` | `req("<id>").fn` |
| 动态导出（ESM 互操作） | `__webpack_require__.d(exports, { "fn": () => fn })` | 导出的是 **getter**：`req("<id>").fn` 仍可读，但**不能赋值**。`.d()` 的实现通常是 `Object.defineProperty(o, e, { enumerable: !0, get: d })` ⇒ **`Object.keys` 会列出该键**；只有某个实现省略了 `enumerable: !0` 时才不会列出 |
| 无导出 | 模块只是执行副作用 | 在模块函数体里手工补一行 `module.exports = { fn: fn }`（要保留原有逻辑，只加不删） |

**判据**：断在目标函数入口看调用栈——若目标函数**不在**任何导出对象里，就必须手工加导出。
`.d()` 的弱实现只支持一组 `key:value`（`c.d = function(o,e,d){ c.o(o,e)||Object.defineProperty(o,e,{enumerable:!0,get:d}) }`），
强实现支持多组。二者在抠取时**都当 getter 处理**。

## 七、异步 chunk（webpack 5）

```js
let foo_2 = await __webpack_require__.e("src_foo_2_js")
  .then(__webpack_require__.t.bind(__webpack_require__, "./src/foo_2.js", 23));
```

- `__webpack_require__.e(name)` 去**网络**加载 `name.chunk.js`（对应 `push([["name"],{...}])` 的第一元素）。
- **只要全局导出了 `__webpack_require__`，就只需要关心 moduleId，不需要关心 chunkId**：
  `e()` 的加载结果最终也是把模块注册进 `__webpack_modules__`。
- 但**本地复用时要自己把 chunk 文件也 require 进来**（`require('./808.chunk.js')`），
  否则 `e()` 会去发网络请求（node 里没有）。这也是「`Cannot read property 'call' of undefined`」最常见的成因。

## 八、开发模式 vs 生产模式（strip 过的）

| | 开发模式 | 生产模式 |
| --- | --- | --- |
| 符号名 | `__webpack_require__` / `__webpack_module_cache__` / `__webpack_modules__` | 短名（`n` / `i` / `t`），**骨架不变** |
| 模块 id | 路径字符串（`"./src/foo.js"`） | 数字（`245`）或短 hash（`"7d92"`） |
| chunk 名 | `src_foo_2_js` | 数字（`245` / `808`） |
| 定位加载器 | 直接搜符号名 | F12 从**模块函数第三形参**点进去；或静态按三对象模型找 |
| 注释/`//# sourceMappingURL` | 有 | 无（`.map` 也常常没发布） |

生产模式下的**静态搜索技巧**（不要乱加空格，打包产物非常紧凑）：

```
120:function     # 中间无空格
,42:function     # 前面是逗号
{3665:function   # 前面是左花括号
```

太短的 key 会在别处误命中；加 `,` 或 `{` 前缀能减少误命中，但可能漏掉「紧跟在 `[` 之后」的情况。

## 九、有 `.map` 时的另一条路

若站点发布了 `app.xxxx.js.map`，**先别抠代码**——直接复原源码更省事：

```bash
npm install --global shuji
shuji app.f2e0831f81bd3fda8015.js.map -o folder
```

这条路的适用判据与替代工具见 `../../sourcemap-reverse/SKILL.md`。
`.map` 存在时，`harvest` 仍然有用的场景只有一种：**源码复原了但构建产物里的运行时状态（模块 id 映射）对不上**。
