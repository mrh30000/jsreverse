# node 复用与补环境交接

> 本文件是「**抠出来之后怎么在 node 里稳定跑起来**」的唯一权威源，
> 并明确划出与 `../../web-js-env-patcher/SKILL.md` 的**交接判据**。
> 脚本：`scripts/env-shim.js`（最小 prelude + `--trace` 环境自吐）。

## 一、复用骨架（三段式）

```js
// run.js —— 顺序不能换
require('./env-shim-prelude');   // ① 环境（先补，后加载）
require('./runtime.exported.js'); // ② 运行时（含全局导出的加载器）
require('./one_bundle.js');       // ③ 模块（按 id 注册进模块表）

const require_ = globalThis.__exposedWebpackRequire;
const mod = require_('<入口模块id>');
console.log(mod.<目标方法>(...));
```

**为什么推荐这个顺序**：`push` 形态的产物是**加载即注册**——它把模块表交给
`self.webpackChunk*` 数组的 `push`。官方 runtime 与多数 webpack 4 runtime 会把数组里
**已有的条目回收一遍**（`chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(...))`），
所以「chunk 先、runtime 后」通常也能跑通（本技能夹具实测两种顺序结果一致）。

**真正会失效的是「不做回收」的 runtime**：它只覆盖 `push` 方法、不遍历既有条目，
此时 chunk 先加载就会把模块注册进**裸数组**，runtime 之后再也没机会收走 ——
症状是「模块表在、加载器也在，但模块一个都没注册」。
**判据**：先按 runtime → chunk 的顺序跑；只有当你在源码里确认 runtime **没有**
`forEach` / `for` 回收循环时，顺序才是硬约束。

`emit` 生成的 `run.js` 已经把这套骨架与 prelude 内联好了。

## 二、最小 prelude 只补四个东西

`scripts/env-shim.js --print` 产出：`self` / `window` / `navigator.userAgent` / `document` 空壳，
外加 `top` / `frames` / `location`，以及一段（默认不开启的）Proxy 自吐代码。
**前四条能覆盖绝大多数「纯算法模块」的复用需求。**

**必须用 `Object.defineProperty` 装全局**（本机实测 Node v22.22.2）：

```
globalThis.navigator 已存在，是**只有 getter、没有 setter** 的访问器属性：
  userAgent === 'Node.js/22'
  描述符 = { get: [Function], set: undefined, enumerable: true, configurable: true }
赋值行为取决于严格模式：
  非严格模式（CommonJS 默认）：globalThis.navigator = {...} **静默失败** —— 不抛错、不警告，读完仍是 'Node.js/22'
  严格模式（'use strict' / ESM）：抛 TypeError: Cannot set property navigator of #<Object> which has only a getter
```
两种模式的表现不同，但**结果一样：你以为补上了，其实没有**。

后果：抠出来的代码读到 `Node.js/22`，凡是嗅 UA 的分支全走错边，
而你的 prelude **看上去是写对了的**。`env-shim.js` 因此统一走 `defineProperty`，
并在 `--selftest` 里用**全新子进程**做了正向 + 反向断言
（正向：install 后读到自定义 UA；反向：直接赋值在全新进程里确实不生效）。

## 三、缺什么补什么 vs 环境自吐

| 场景 | 做法 |
| --- | --- |
| 报错是 `xxx is not defined` | 直接补那个名字，一轮一个，够快 |
| 报错是**业务异常**（不是 ReferenceError），或结果不对但不报错 | 用环境自吐：`env-shim.js --print --trace`，把 prelude 换上，看代码**真正碰过**哪些字段 |

`--trace` 的原理是 Proxy 拦 `get`/`set` 并把访问记进 `globalThis.__envTrace.hits`。
两个注意点：

- 只能代理 `navigator` / `document` / `location` 这类**普通对象**；
  某些宿主对象不可代理，`env-shim.js` 对此静默跳过（不影响主流程，但也就看不到日志）。
- **`--trace` 是发现手段，不是补环境方案**。看到清单之后仍然要按
  `../../web-js-env-patcher/SKILL.md` 的模块层级去补——那份技能里才有
  native 保护（`toString` 伪装的函数）、对象形状、字段权威清单。

## 四、交接判据（什么时候必须切到 web-js-env-patcher）

**判据：看第一条报错的类型，而不是看它「难不难」。**

| 第一条报错 | 归属 | 处置 |
| --- | --- | --- |
| `ReferenceError: window is not defined` / `navigator is not defined` | 本技能 | run.js 里的 prelude 顺序或内容问题，2 分钟解决 |
| `TypeError: Cannot read properties of undefined (reading 'call')` | 本技能 | **模块闭包不完整**，去补 missing 模块，不是环境问题 |
| `TypeError: xxx is not a function` | 本技能 | 模块函数的 `module`/`exports` 形参抄错，或导出是 getter 需要 `.d()` 语义 |
| 结果**不报错但值与浏览器不同** | ⚠ 交界处 | 先怀疑**跨请求有状态变量**（见下节）；仍是不同 → 切补环境 |
| `xxxxx.getUndetectable is not a function` / `toString` 相关 / `webdriver` 探测 | **切 `web-js-env-patcher`** | 这是指纹与 native 保护，不是「复用」问题 |
| 报错来自风控 SDK（`window._xxxx` 一类）而非业务模块 | **切 `web-js-env-patcher`** | 抠代码的收益已经低于补环境 |

**不要在同一次任务里既抠代码又补环境。** 两条路混做会让「跑不出结果」的原因不可判：
是模块没抠全，还是环境不对？先抠全（用 `missing`/`null` 清单确认），跑出「结构正确但值不对」，
再判断是不是环境。

## 五、跨请求有状态变量：必须回传，不能重放

**这是本族最隐蔽的一类失败：单次调用完全正确，翻页/第二次调用开始算错。**

现象（典型）：模块里存在 `this['\x69']` / `this['\x6a']` / `this['\x53']` 这类
**每次请求都会变、且需要保持上一次值**的私有状态。抠出来之后：

- 每次 `require_("<id>")` 拿到的是**同一个** 模块实例（加载器有缓存），状态确实会被保持；
- 但**跨进程/跨批次**（例如 Python 每次调用启一个新的 node）状态就丢了；
- 应对：把这三个参数**作为输入回传**（从上一次响应里读出来，再传给下一次），
  而不是指望模块自己记住。

**判据：如果「第一页对、第二页错」，先查有没有这种随请求变化且需要持久化的字段，
再怀疑算法。**

## 六、复用之后仍然对不上的其他常见原因

| 现象 | 原因 | 判据 |
| --- | --- | --- |
| 值完全不同但结构对 | **密文里带了时间戳/随机数/序数** | 比较「同一时刻、同一输入」的两次结果；不要跨时刻比 |
| 每次都不同（浏览器也一样） | 上游有随机源，本来就不同 | 先确认浏览器里同输入两次是否也不同 |
| 差异只在一个字段 | 少传了一个上游字段（`token`/`nonce`/`sessionId`） | 逐字段对照请求体 |
| 产物在浏览器能跑、node 不能 | 用了 `document.createElement('canvas')` 做指纹 | 属于补环境，切 `web-js-env-patcher` |
| 格式化/美化后结果就变了 | 源码里有「判断函数体是否被格式化」的自校验（如判断 `m5.toString()` 是否含换行） | **不要格式化产物**，或把那处判断结果直接改成固定的 `false` |
| 值算对了但进程不退出 | 产物里有轮询定时器 / `setInterval` | 把定时器置空（`setInterval` 改成返回 0 的空实现），或在调用完显式 `process.exit` |

## 七、产物固化建议

1. **产物目录自带 `run.js`**：`emit` 已经写出骨架，把「按站点真实调用方式取值」那行补完即可复跑。
2. **不要提交 `node_modules`**：这套流程零依赖，产物的 `require` 只有 node 内置模块。
3. **`harvest.json` 与产物一起留档**：哪一批模块是在哪一次页面修订下抓的，
   在下一批开工前是判断「还要不要重抓」的唯一依据（站点改版后模块 id 会整体漂移）。
