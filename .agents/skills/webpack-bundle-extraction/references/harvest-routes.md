# 抠取三条路线（流程 · 唯一权威源）

> 本文件是「**怎么把目标模块从产物里扣出来**」的唯一权威源。
> 判族与结构模型见 `bundler-identification.md`，复用与补环境交接见 `node-reuse-and-env-handoff.md`。
> 脚本：`scripts/harvest-bundle.js`（`loader-export` / `breakpoint` / `closure` / `emit` / `wrap`）。

## 〇、先选路线（30 秒；本节是路线选择总闸）

| 现场条件 | 路线 | 一条命令 |
| --- | --- | --- |
| 模块表与加载器**在同一个文件**、模块数量不大 | **A 静态闭包** | `harvest-bundle.js emit <bundle.js> --entry <id> -o one_bundle.js` |
| 加载器在 runtime、模块在 chunk（webpack 4/5 常态） | **A' 静态闭包（分文件）** | `closure` / `emit` 带 `--runtime <runtime.js>` |
| 静态扫描**看不出依赖**（依赖是字符串拼的、被加密、或 `e()` 异步 chunk 满天飞） | **B 运行时记录** | `loader-export --record` + `breakpoint` 断点法 |
| 目标函数的依赖极多、闭包比整包还大 | **别抠** → 走免抠路线 | `no-harvest-routes.md` |
| 站点发布了 `.map` | **别抠** → 复原源码 | `../../sourcemap-reverse/SKILL.md` |

**判据：先跑 A，A 不完整再补 B。** A 的产出本身就是 B 的起点
（`closure` 会明确列出「引用了但本文件没有」的模块 id，那些就是要去页面里捞的）。

## 一、路线 A：静态闭包

### A1 找入口模块 id

入口不是「首页」，而是**你要调用的那个函数所在的模块**。定位顺序：

1. F12 在目标函数处断住 → 看调用栈上一帧的文件名与列位置；
2. 回到该文件，找到包住它的模块函数的 key —— 那就是 moduleId；
3. 找不到 key（动态导出/匿名 wrapper）时，改用运行时路线 B。
4. **要在模块表（或分发器）里按 id 找模块，不要从调用点单步进去** ——
   从调用点单步可能落到「调用者」而不是模块本身（同一 id 在多处被包装时尤其容易偏）。

### A2 静态求闭包

```bash
node scripts/harvest-bundle.js closure <bundle.js> --entry <id> --runtime <runtime.js>
```

输出四件事，**先看后两件**：

- `闭包模式`：`strict`（用模块第三形参名匹配，可信）/ `heuristic`（用「id 命中模块表」兜底，会误命中）/ `mixed`；
- `可达模块 N 个` + 依赖边列表；
- **`⚠ 引用了但本文件里没有的模块`** —— 这就是要去别处捞的清单（另一个 chunk / 异步加载 / 被 `e()` 拉取）；
- 若清单非空，退出码为 `2`（不是失败，是「闭包不完整」的明确信号）。

### A3 产出最小产物

```bash
# 自执行 IIFE 形态：一次出产物（自带加载器 + 全局导出）
node scripts/harvest-bundle.js emit <bundle.js> --entry <id> -o one_bundle.js

# push 注册形态：产物是 chunk，加载器要来自 runtime
node scripts/harvest-bundle.js emit <chunk.js> --entry <id> --runtime <runtime.js> -o one_bundle.js
node scripts/harvest-bundle.js loader-export <runtime.js> -o runtime.exported.js
```

`emit` 会同时写出 `run.js`（含内联 prelude 的调用骨架）。

## 二、路线 B：运行时记录（半自动的自动化版）

文章里的半自动法是「在加载器缓存检查那行下条件断点，把 `模块表[id]` 攒进一个对象」。
**本脚本把这套动作固化进 `loader-export --record`**，并用 `breakpoint` 生成
「贴到 DevTools 就能用」的表达式（含从你样本里读出来的**真实变量名**）。

### B1 生成断点表达式（推荐先看这个）

```bash
node scripts/harvest-bundle.js breakpoint <runtime.js>
```

输出是一份可直接照做的操作单：收集器初始化、**清空缓存**、条件断点表达式、logpoint 表达式、取回方式。
两个必须理解的点：

1. **清空模块缓存**（`<缓存表> = {}`）是为了让本次轨迹触发更多依赖加载。
   已经缓存过的模块不会再走一遍加载路径，其依赖也就收集不到。
2. **`...,false` 的逗号表达式**：条件断点的表达式求值结果必须为假，否则每次命中都会停下。
   `窗口对象[id]=模块表[id],false` 正好「赋值 + 不停」。

### B2 用记录器一次跑完（不用手工点断点）

```bash
node scripts/harvest-bundle.js loader-export <runtime.js> --record -o runtime.rec.js
node -e "
  require('./runtime.rec.js');            // 先装 runtime（含记录器）
  require('./chunk.js');                  // 再注册模块
  const req = globalThis.__exposedWebpackRequire;
  console.log(req('<入口id>').<目标方法>(...));   // 触发一次真实调用
  const obj = {};
  for (const [id, src] of globalThis.__wpHarvest.list) obj[id] = src;
  require('fs').writeFileSync('harvest.json', JSON.stringify(obj));
  console.log('null 条目（在别的 chunk 里）：', globalThis.__wpHarvest.list.filter(x=>x[1]===null).map(x=>x[0]));
"
node scripts/harvest-bundle.js wrap --harvest harvest.json --template <bundle.js> -o one_bundle.js
```

### B3 三个必须知道的坑

| 坑 | 症状 | 处置 |
| --- | --- | --- |
| **在加载器入口设日志断点收集** | 收集到的模块数虚高、体积膨胀 | 用**按 id 去重的对象**收集（重复写入无副作用），或把断点放在 `.call` 行 |
| **一次调用收不全** | 报 `Cannot read property 'call' of undefined`，补上又能跑一段 | 这是**正常现象**：加载阶段的依赖与「调用某函数时才拉取」的依赖不是同一批。按报错 id 再跑一轮即可，不必追求一轮到位 |
| **`null` 条目** | harvest.json 里某些 id 的源码是 `null` | 该模块在页面里尚未加载/属于别的 chunk：到 Network 面板把对应 chunk 抓下来，或先触发一次会用到它的操作 |
| **整包拷回来一运行就执行了入口** | 拷下来的 runtime 末尾带着「加载 0 号模块」之类的自启动调用 | **把那行注释掉**再放进产物目录，否则 require 产物时就会先跑一遍站点逻辑（可能触发检测或抛错） |

`wrap` 遇到 `null` 条目会**明确列出来并返回退出码 2**，不会静默丢掉——静默丢掉的后果是
「产物看着完整、调用时才炸」，排查成本高得多。

## 三、路线 C：手抠（只在极小规模时用）

适用：目标模块只依赖 1~2 个模块，或你只想验证某个算式。

1. 把加载器整段抄出来，删掉模块表（先传空对象）；
2. 把自执行函数改造成「可导出加载器」的形态：在函数体后一行加 `globalThis.__exposedWebpackRequire = <加载器名>;`
   （`loader-export` 做的就是这件事，注入点选在加载器**函数体的右括号之后** ——
   该处仍在加载器所在的作用域内，所以直接引用名字是合法的，不需要把匿名函数改成具名）；
3. 把目标模块及其依赖的模块函数贴进那个空对象；
4. 写 run 脚本调用。

**不推荐**的原因：第 3 步漏一个模块就要重来一轮，而且漏掉时**不报错**（加载器返回 `undefined`）。
手抠只在「两三个模块」的场景下比脚本快。

## 四、验收：三个必须做的断言

抠取最大的风险是「**产物能加载、结果不对**」。所以必须做：

1. **端到端数值对拍**（最硬）：同一个输入，浏览器/原产物与抠取产物的返回值**逐字节相同**。
   本技能的 `--selftest` 与仓库内 `artifacts/skill-evolution/tools/make-webpack-fixture.js`
   生成的「220 模块随机依赖图」夹具都在做这件事（后者用生成器独立算出的 BFS 闭包当期望值）。
2. **无关模块不得混入**：产物里不应出现闭包外的模块 id（体积也应该明显更小）。
3. **闭包完整性的显式信号**：`closure` 的 `missing` 与 `wrap` 的 `null` 条目都必须被**看到**，
   不能只靠「跑起来没报错」判断——异步 chunk 的缺失往往在第一次调用后才暴露。

## 五、实现约定（改脚本前必读）

本族的静态扫描是「**掩码串定位 + 原文取内容**」两段式（原因见 `scripts/lib/bundle-scan.js` 的文件头）。
两者的分工一旦搞反，症状全部是**静默给出空值 / 错值**，不会报错。已经踩过的三处：

| 要取的东西 | 在哪读 | 搞反的症状 |
| --- | --- | --- |
| **chunk 名**（`["src_foo_js"]`） | **原文** | 掩码串上读会得到一串空格当 chunk 名，产物结构看着对、挂钩失效 |
| **模块 id / 闭包里的 `r("+OK6")` 实参** | **原文** | 掩码串上读会得到空格当 id ⇒ 闭包永远只剩入口模块，产物缺依赖 |
| **括号配对、函数体边界、`key:` 是否真代码** | **掩码串** | 原文上做会把字符串/注释里的括号算进去，边界整体错位 |

一句话：**偏移来自掩码串，文本来自原文**，「这个位置是不是真代码」用掩码串校验。

## 六、自动化替代品与边界

| 工具 | 形态 | 与本文的关系 |
| --- | --- | --- |
| `webpack_mixer`（社区脚本，`-l 加载器 -m 模块 -o 输出`） | AST 合并加载器与模块文件 | 等价于本技能 `emit` 的 A 路线；差别是它**不验证闭包完整性**，需要人工反复补模块 |
| `webcrack` | 拆包落盘 + unminify | 静态切分质量更高，但**不做「导出加载器给 node 用」这一步**，见 `../../ast-deobfuscation/references/webcrack-bundle-unpack.md` |
| 本技能 `harvest-bundle.js` | 识别 + 闭包 + 补丁 + 产物 + 骨架 | 有 `missing`/`null` 的显式信号，且自带实跑对拍 |

**边界声明**：本技能**不做**完整反混淆。字符串表、控制流平坦化、VMP 这些属于
`../../ast-deobfuscation/SKILL.md`。抠出来能跑通就已经达成目标——**不要顺手去反混淆**，
两个目标混在一起会把「跑不出结果」的原因变得不可判。
