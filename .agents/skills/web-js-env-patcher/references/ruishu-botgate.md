# 瑞数（Botgate）挑战页补环境族谱

当目标站点出现「首访返回 202 / 412 + 单独一个 JS 文件 + 再次请求页面 + 后续请求带动态后缀」这条链路，且 JS 变量名形如 `_$xx`、控制流密集时读取本文件。

本文件只描述**证据特征、资源依赖、环境矩阵和排错顺序**，用于授权范围内的 Node.js 补环境。不提供可运行的风控绕过成品，不用于绕过登录、验证码或访问控制。

## 执行次序（避免新人跳过前置确认）

1. 先按 `SKILL.md` 硬规则 1 / 主流程 A 完成 intake 确认（目标页、目标 API、取证模式、是否允许请求）。
   挑战页路由只是「读到本文件」，**不等于**可以跳过 intake。
2. 再抓取一次完整的 412 / 202 → 外链 JS → 重请求页面序列，保存原始字节。
3. 然后才跑资源抽取与补环境，不要先写 env 再回头找资源。

## 代际判不出时怎么办

- 不要硬套某一代。先补齐证据：响应码、Cookie 命名（含端口）、入口 `call` 形态、`$_ts` 结构四类里**至少凑三条**。
- 若仍无法收敛，按**最高代**（结构超集）处理并明确记录「代际未定」，不要按最低代做——低代模板会缺字段。
- 证据不足时暂停并说明缺哪条证据，不要靠猜继续推进。

配合阅读：`cookie-generation-analysis.md`（Cookie 分类与四层链路）、`multi-pass-cookie-generation.md`（多趟生成）、`ruishu-vmp-structure.md`（**结构常量与可复现性，含独立实现交叉验证**）、`dynamic-resource-freshness.md`（三件套保鲜）、`high-strength-browser-detection.md`（失败排查顺序）。

---

## 1. 代际判据（多条件交叉，不要只看一条）

单个特征都不足以定代，**必须组合判断**。至少取三条互证。

| 判据 | 3 代 | 4 代 | 5 代 | 6 代 |
|---|---|---|---|---|
| 首访响应码 | 202 | 202 | 412 | 412 |
| Cookie 名后缀 | `...80T`/`...80S` | `...80T`(http) / `...443T`(https)，配 `S` | `...T`+`...S`；部分变体是 `O`/`P`，**不再带端口号** | `...T`/`...S` |
| 入口 call 形态 | `_$c6[_$l6()](_$wc,_$mo)`，call 也混淆 | `ret = _$DG.call(_$6a,_$YK)`，有 `ret`，call 明文 | 三种：类 4 代有 `ret`；无 `ret` 的 `_$j5.call(...)`；全混淆的 `_$mP[_$nU[15]](...)`（call 从数组取） | 412 页面 script 内 `if($_ts.cd){...}` / `if($_ts.lcd)$_ts.lcd();`，搜 `call` 定位 |
| 是否生成假 Cookie | 有 | 有 | **无** | 无 |
| `$_ts` | 跑完可取 | 跑完可取 | 跑完后被**清空** | 含校验字段 `cd`/`cp` |
| 备注 | 老站点为主 | 控制流编号（如 747/768） | 引入 localStorage 指纹与位运算 | 引入 jsvmp + 三目；结构最复杂 |

### 1.1 两条**已证伪**的判据（不要再使用）

| 被证伪的判据 | 反证 | 结论 |
|---|---|---|
| 「Cookie 值首位数字 = 代际」（如 `4a...` 为 4 代） | 独立实现的 Cookie 组装为 `'0' + numarr2string(...)`，首位是常量 `'0'`，与 4 代样例的 `4a...` 冲突 | **禁用该判据**。代际靠响应码 + 命名 + 入口形态 + `$_ts` 结构交叉 |
| 「`T`=JS 生成 / `S`=服务端下发；`O`=服务端 / `P`=JS 生成」 | 实现里后缀字母来自**站点适配配置项 `lastWord`**，`T` 与 `P` 分属不同站点 | 后缀字母只能识别**适配族**，不能推断**谁生成的** |

证据细节见 `ruishu-vmp-structure.md` §6。

补充信号：

- 打开开发者工具依次出现**两个**无限 debugger。但**并非总是出现**——有实测案例在 Edge 下未触发，不能把「没看到 debugger」当作「不是瑞数」。
- 外部 JS 直接下载打开是**乱码**；202/412 页面的内联自执行脚本负责把它还原成 VM 代码（约 1w+ 行）。
- 后续业务请求的 Query 或 Header 里有瑞数动态后缀（如 `MmEwMD=`），后缀名每站不同，值每次变化。

## 2. 三件套：必须同会话、同一次刷新拿到

补环境的输入永远是这三样，**它们是一套的，不能跨请求混用**：

| # | 名称 | 来源 | 说明 |
|---|---|---|---|
| 1 | `meta.content` | 202/412 页面的 meta 标签 | 每次刷新都变；有的站 meta 有 id，有的只有 content |
| 2 | `$_ts` | 202/412 页面的**内联**自执行脚本 | 同时负责外链 JS 的还原逻辑；VM 里全程使用 |
| 3 | 外链 JS | HTML 里引用的 `<域名片段>.<hash>.js` | 直接打开是乱码；同一站同一页面内容基本稳定，但**文件名会变** |

取值方式因站而异，必须实际跟栈确认，不要照抄：

- `meta.content`：多数站走 `document.getElementsByTagName('meta')`；**cqvip 那类走 `document.getElementById(...)` 返回 meta 对象**，照抄 `getElementsByTagName` 会导致取值失败。
- 定位方式建议「先按 `$_ts` 键名反查，再按出现位置兜底」。某站 `$_ts` 的 `cd` 来自页面 script，`cp[1]`/`cp[3]` 是**代码校验值**（850 个参数名与 VM 代码每隔一段距离的 `charCodeAt` 之和）。

### 2.1 格式是硬约束（准确口径）

- 外链 JS 与内联脚本必须与**浏览器取到的原始字节逐字节一致**。瑞数会校验代码内容与格式，重新格式化、重排或被编辑器重新编码都会失败。
- **不是「必须单行」**：真实样本的 VM 代码实测为 195,355 字符 / 5 行（其中 2 行有内容）。
  判据是「字节一致」，不是「一行」；脚本里的 `singleLine` 只是「疑似被重新格式化」的启发式提示。
- 机制：`$_ts.jf` 承载格式校验标志，且 `codeUid` 直接由代码内容派生（见 `ruishu-vmp-structure.md` §8）。
- 证据一律存 `.orig` 后缀，与本仓库既有约定一致（见 `AGENTS.md`「环境坑」）。
- 落地路径：`case/sources/rs.rs6.js.orig`、`case/sources/rs.rs6_enter.js.orig`，运行时再读取，不要内联进 env 源码。

### 2.2 用脚本抽取三件套

```bash
node scripts/extract_challenge_bundle.js <412页面.html> --status 412 --cookies <Set-Cookie串或文件> --out case/notes/challenge-bundle.json --markdown
```

`--status` 支持 `202` 与 `412`（3/4 代为 202，5/6 代为 412），按实际响应填。
输出含三件套的 sha256、格式体检、外链 JS 落地匹配（精确 → 哈希片段 → 主体名 → 唯一候选）与代际信号。
外链文件名每次刷新都会变，脚本会自动降级匹配并**留下告警**，降级结果必须人工确认。

## 3. 入口定位

1. 页面级：对 202/412 页面下 Script 断点（选「第一条语句时断下」）或直接搜 `call`。
2. 搜到 `eval.call(window, 长字符串)` 形态即是 VM 入口。`eval` 本身常被别名化（`_$c6`/`_$DG`/`_$mP`/`_$te`/`_$ug`）。
3. Cookie 写入点：Hook `document.cookie` setter，断下后**向上跟栈**，能看到组装 Cookie 的位置和它所在的控制流编号（4 代两次、5 代 `(772,1)`、6 代 `(947,1)`）。
4. 本地固定一套代码（浏览器 Overrides / ReRes / Fiddler AutoResponder 替换），在自执行脚本开头手插 `debugger`，后续跟栈成本会显著下降。

### 3.1 取 `$_ts` / VM 代码的最小骨架

```js
var eval_js = "", rs_ts = "";
window = { $_ts: {}, eval: function (data) { eval_js = data; } };
// location / document 从浏览器控制台 copy 后原样粘贴
```

- 4 代：跑完直接读 `window.$_ts`。
- 5 代：跑完会被清空 → 删掉清空逻辑，或在 call 处把 `$_ts` 导出到全局（`rs_ts = window.$_ts`）。
- 6 代：把 412 页面的内联脚本单独存成文件 require 进来，再 require 外链 JS。

## 4. 生成逻辑分层（要跟栈确认，不要跨代套用）

### 4.1 4 代：假 Cookie → 真 Cookie

- **假 Cookie**：搜 `(5)` 定位；用 `meta.content` 生成 725 位数组 `_$PV`，`join('')` 得值；写入 `document.cookie` 与 `localStorage.$_ck`。
- **真 Cookie**：入口 `_$ZN(768, 1)`，主体在 747 号控制流。
  - 709 号：取回假 Cookie → 数组。
  - 268 → 154 号：自动化检测，结果变量不通过为 `1`。无自动化时可固定为 `false`，但要在阶段报告记录这是**有意固定**，不是观测值。
  - 668 号：16 位数组 + 取自 `$_ts` 的 4 个值 = **20 位数组，后 4 位是核心**，映射错就请求不通过。
  - 另有 7 处取 `$_ts`，位置固定在**第 2/3/4/15/16/17/19 位**。

### 4.2 核心 4 值的动态替换（4 代 / 5 代通用套路）

4 个核心值在 VM 里被**二次处理**，形如：

```js
_$sX._$Xb = _$sX[_$sX._$Xb](_$BH, _$DP);   // 先取 $_ts 里的「变量名」，再拿它当键取「方法」
```

等价于 `_$sX._$Xb = _$1k(_$BH, _$DP);`。变量名、方法名每次都变，**实现逻辑不变**。替换步骤：

1. 正则匹配出 4 个值，例如 `[_$sX._$Xb, _$sX._$oI, _$sX._$EN, _$sX._$D9]`。
2. 正则匹配 VM 代码开头的 20 条赋值语句 `_$sX._$RH = _$wI; _$sX._$i5 = _$n5; ...`。
3. 用 `$_ts` 取这 4 个值对应的中间名（如 `_$Rm`）。
4. 在 20 条赋值里定位 `_$sX._$Rm = _$1k;` 的**索引**（如 7）。
5. 按索引在本地已扣的代码里做同名替换。

20 条赋值语句的**索引序列**是这一代的结构常量，索引 → 方法映射可写死；名字必须每次动态匹配。

> **升级路径（优先采用）**：独立实现表明变量名由 `$_ts.nsd` **确定性决定**，可重算而不必正则匹配。
> 先用 `node scripts/ruishu_keynames.js --extract-keyname-num <vm.js>` 拿池长度，再
> `--nsd <nsd> --keyname-num <n>` 重算变量名数组，即可把「动态替换」降级为「按索引取值」。
> 详见 `ruishu-vmp-structure.md` §2。

### 4.3 5 代：一次生成，但依赖 localStorage 状态

入口 `(772, 1)` → 742 号控制流 → 279 号控制流产出 **128 位大数组**。

- 703 号：生成两个时间戳，并**改写 `$_ts` 的某个值**（该值属于核心 4 位之一）。
- 157 号：自动化检测。
- 695 号：`$_ts` 一个值 → 16 位数组；`$_ts` 四个值 → 20 位数组。
- 8 位数组来自 777 → 10 → 657 → 96 号控制流，其中取 `window.localStorage.$_YWTU`。
- 10 号小控制流取 `window.localStorage.$_cDro` 并转 int。
- 58 号控制流取 `window.localStorage.$_fb`：**有值才生成 20 位数组并加入，为空则不加**。
- 后续若干步分别用 `$_f0` / `$_fh0` / `$_f1` / `$_fr` / `$_fpn1` / `$_vvCI` / `$_JQnh`，**同样「为空则不往数组里加」**。
- 611 号：检测 `navigator.connection.type` 是否属于 `bluetooth/cellular/ethernet/wifi/wimax`，正常返回 0。
- 30/31 步：`https:443` 这个字符串的长度参与运算。
- 第 12 位先留 `undefined`，第 33 步再用 4 位数组回填。
- **最终只取有值的前 21 位**再展平——数组长度本身受 localStorage 影响。

742 号后续：32 位数组、与 `$_ts` 某值合并、4 位数组、时间戳 16 位数组、异或、转字符串，最后 `_$bd[274]` 这类**定值视为版本号**参与拼装。

**指纹与「短/长 Cookie」**：localStorage 里的值由 canvas 等指纹派生。只访问单个 HTML 时通常不校验指纹，短 Cookie 就能过；访问数据接口会触发 `load` 事件向 Cookie 追加指纹，Cookie 变长。因此**不同接口对 Cookie 长度的要求不同**，不能用「主页能过」推断「接口能过」。

#### 4.3.1 5 代补环境实战：两份公开求助帖的共同失败模式

B24 精读了两篇 5 代补环境求助帖（`docs/references/52pojie-1981831`、`52pojie-1985027`，
两人都是「补来补去 Cookie 就是不对」）。它们**没有算法增量**，但把「5 代补环境失败长什么样」固定下来了：

**① 代码形态（逐项已回源核对；**两篇不是同一份构建**，别把特征混着用）**

| 观察点 | 第一篇 | 第二篇 |
|---|---|---|
| 外层结构 | 多层嵌套 `if/else` + `_$` 变量族：`_$ri`（指令指针，71 次）、`_$0c`、`_$P4`（常量表，83 次）、`_$K_`（栈，55 次）、`_$TL(...)`（调度，10 次）、`_$Cz` | 同样是嵌套 `if/else`，但**没有** `_$P4` / `_$K_` / `_$TL(` 这套命名 |
| **文件尾部** | 直接以 `...}())(` 结束（**没有**元数据数组） | 以 **`)([], [[1, 2, 10, …], [19, 50, 42, …], [23, 38, 52, …], [28, 33, 22, …]])`** 结束：第一个实参是空数组，后面**若干个纯数字数组是元数据**（跳转表 / 操作数表 / 常量索引） |
| 用法 | — | 这类元数据**随代际与站点变化，不是可硬编码的算法常量** ⇒ 可把「元数据数组的**个数与长度**」当作**同一代不同构建**的比对指纹 |
| 起手式 | `delete __dirname` / `delete __filename`（该变量在 CJS 包装函数里天然存在，`typeof` 一测即暴露 ⇒ 见 `node-leakage-and-silent-failure.md`） | — |

**② 两位作者共同踩的坑：缺没有定位手段**

两篇的 stub 集（**逐项已回源核对，不要当成「两份都一样」**）：

| 只出现在第一篇 | **两篇都有** | 只出现在第二篇 |
|---|---|---|
| `window.ActiveXObject`、`HTMLFontElement` | `window.top` / `self`、`addEventListener`、`XMLHttpRequest`、`setInterval`、`localStorage`（裸对象 + `getItem`/`setItem`/`removeItem` 三个方法） | `window.DOMParser`、`indexedDB`、`MutationObserver`、`Request`、`sessionStorage`、`chrome`、`open`、`name` |

**问题不在缺哪一项，而在「缺了之后靠肉眼猜」。**

⇒ 正确姿势是**先取证再补**：用代理 / Proxy 把所有属性访问记下来（`references/env-debug-loop.md`、
`references/high-intensity-env-diff.md`，或 ruyi 的 trace 通道），按**访问序列**补，
而不是「改一点、跑一次、看对不对」。这也解释了为什么两篇帖子耗时很久仍没收敛。
（第二篇作者已经搭了 `_$_obj(...)` + `logger(...)` 的代理框架，但**发帖时把这两个方法的实现删掉了**
（原文自述「是我写的两个代{过}{滤}理方法，那块的代码我删了」）⇒ **无法判断他是否用它做过访问序列取证**。）

**③ 两篇的编码风格不同 ⇒ 不要用「变量名 / 分支风格」判代际**

| | 第一篇 | 第二篇 |
|---|---|---|
| 变量族 | `_$ri`（71 次）、`_$0c`、`_$P4` … | `_$_obj`（29 次）、`_$dq`、`_$bJ`、`_$a1` … |
| 分支条件写法 | **算术恒等式**：`104+_$0c===113`、`_$0c-48===-40`、`-2===-12+_$0c`、`_$0c-3>0&&416>52*_$0c` | **朴素等式**：`_$a1 === 0` / `=== 1` / `=== 2` … |
| `if` 数量 | 724 | 416 |

⇒ 同一代（5 代）内部就有至少两种「编码风格」，且变量名每次刷新都变。
**判代际只看既有的三条件交叉判据**（`ruishu-botgate.md` §1），
用变量名前缀或分支风格判代际会踩与 §1.1 那两条被证伪判据同型的坑。

**④ 他们用的判据恰好是对的**

两篇最后都用 `document.cookie` 的**长度**做粗判据（第一篇 `console.log(get_cookie().length)`，
第二篇 `document.cookie.length`）—— **长度是 5 代的正确第一步**
（长度不足 ⇒ 先怀疑趟数与 localStorage 预热，见 §7 第 5 条与 `multi-pass-cookie-generation.md`），
只是**长度过了之后必须立刻换成端到端对拍**，否则会在「长度对了但值错」上继续消耗。

### 4.4 6 代：结构最复杂，动态匹配是核心难点

> 本节出现的 `_$xx` 标识符均来自文章样本（来源：1846988），**变量名随样本变化**，
> 请按「等价逻辑 + 段号/索引」套用，不要在本站样本里搜同名变量。
> 结构常量（20 值表、CRC-32 表、锚点形态）才是可跨样本复用的部分。

- 入口 `(947, 1)`；最终 Cookie 长度示例为 **173 位**，由两段拼接。
- 16 位数组由 `_$Vg` 生成，参数取 `$_ts` 的某个键（其值如 `AMEExbhbQVYKGNjj8cTp.A`，在 JS 文件里可固定）。
- **4 位数组**：形态是 `_$5W[_$yx._$Go](_$Ke, _$tm)`。`_$5W` 是方法容器；容器内每个方法都长这样：

  ```js
  function _$Vk() { var _$pn = [249]; Array.prototype.push.apply(_$pn, arguments); return _$2W.apply(this, _$pn); }
  ```

  即**方法内部的一位数组值 ↔ 方法返回值**存在固定映射。实测映射表（`数组值 → 返回值`）：

  ```
  194→103  274→103  306→100  251→203  247→0    272→126  240→103  290→225
  285→203  249→102  283→102  298→181  281→11   256→224  264→181  266→108
  268→240  302→208  304→180  308→127  270→101
  ```

  所以不必理解方法内部，按映射取值即可。
- **8 位数组**：关键中间字符串（如 `zbOdssUZRkdTixew3tpf4WGN.rNLK_jWMTTqMIafmZV`）**可固定**；由 21 位数组经 `_$zW` 生成 8 位。
- 128 位数组第 12 位先留空后重填；切割保留有值部分得 18 位，再 `concat.apply` 展平。
- 32 位数组分支：`_$o9` 生成随机 37 位；`_$BW` 内部涉及 `_$PO()`（当前时间戳秒）、`_$0f`（数组转换）、`$_ts._$AX`。`_$BW` 的等价代码：

  ```js
  function _$BW(_$k4) {
      var _$dk = _$k4.slice(0);
      if (_$dk.length < 5) return;
      var _$jU = _$dk.pop(), _$I$ = 0, _$IM = _$dk.length;
      while (_$I$ < _$IM) _$dk[_$I$++] ^= _$jU;
      var _$j9 = _$dk.length - 4;
      var _$Ff = _$PO() - _$0f(_$dk.slice(_$j9))[0];
      if (_$Ff > _$rT) _$rT = _$Ff > 255 ? 255 : _$Ff;
      _$dk = _$dk.slice(0, _$j9);
      var _$df = parseFloat("11.678");
      var _$52 = Math.floor(Math.log(_$Ff / _$df + Math.floor("1.234")));
      var _$zi = _$dk.length, _$Pa = _$yx._$AX[_$ic];
      _$I$ = 0;
      while (_$I$ < _$zi) _$dk[_$I$++] = _$52 | (_$dk[_$I$] ^ _$Pa);
      return _$dk;
  }
  ```

- **6 代的动态匹配流程（推荐正则，不推荐 AST）**：

  1. 用**一个固定数字关键字**定位容器对象（原文用 `842,` 命中 `_$5W`；该数字是这一代的稳定锚点）。
  2. 用 `容器名[` 匹配出 4 个索引名（`$_ts._$Go` 等）。
  3. 按 `$_ts` 取索引值（如 `_$ym`）。
  4. 用 `._$ym` 反查真实方法名（如 `_$3$`）。
  5. 用 `function 方法名` 取到内部一位数组。
  6. 按映射表拿返回值。

  > **更稳的锚点**：`842` 是某一代的常量。跨代可复用的锚点是变量名池长度
  > （`_$xx=_$yy(0,<数字>,_$zz(`），且变量名本身可由 `nsd` 重算。见 `ruishu-vmp-structure.md` §2。
  >
  > **映射表的真相**：文章那张「数组值 → 返回值」表，本质是查一张**20 值常量表**
  > （`[103,0,102,203,224,181,108,240,101,126,103,11,102,203,225,181,208,180,100,127]`），
  > 值域跨代稳定、**键随版本变动**。所以按「值域 + `cp[1]` 索引」实现，不要硬编码键。
  > 详见 `ruishu-vmp-structure.md` §3。

### 4.5 6 代第一趟 Cookie 的插桩视角（结构参考）

- 插桩锚点：搜 `<= 63`。
- 数组长度演化链：117 → 95 → 176 → 最终 Cookie。`117 位数组`前四位示例 `[1,0,33,128]`：前两位写死，第 3 位 `33` = `eval.toString().length`，第 4 位 `128` = `1 << 7`。
- 117 位里填充：UA、随机数、固定值、屏幕分辨率、时间、特定函数 `toString()`（完整 / 截取）、`fromCharCode` 生成的函数名映射值，最后补长度与默认值。
- 部分中间数组（如某 `tempArr`）**实测可写死**，但必须标注为「当前版本经验值」，版本更新后需复测。
- 结论倾向：这一代**不存在严格意义上的纯算**，抠代码 / 补环境是主路径——与本 skill 的能力边界一致。

## 5. 后缀生成

- 4 代 / 5 代一致：VM 内重写了 `XMLHttpRequest.open` 与 `send`。
- 在 `open` 下断点，`arguments[1]` 是原始 URL，处理后即带后缀。
- 4 代：`_$sd(arguments[1])` → 进入 779 号控制流，**复用 Cookie 的生成步骤**。
- 5 代：先生成 16 位数组 → `_$ZO` 生成第一个后缀（内含 32 位数组、50 位拼接，并再次走一遍 742 号控制流）；再由第一个后缀派生的 2 位字符串 + URL 参数经 `_$Nr` 得到第二个后缀。注意 5 代后缀可能同时出现在 Query 和 Header（如 `sign`）。
- 处理方式：补环境里把 `XMLHttpRequest.prototype.open/send` 实现为**记录改写后 URL 但不真发请求**，与 `xhr-fetch-semantics-audit.md` 的 audit-only/no-send 约束一致。

## 6. 环境矩阵（必备项，按站增删）

### window

`top`/`self` = window、`setTimeout`/`setInterval`、`addEventListener`、`attachEvent = undefined`、`ActiveXObject = null`、`name`、`innerWidth`/`innerHeight`/`outerWidth`/`outerHeight`、`TEMPORARY`、`MutationObserver`（含实例 `observe`）、`webkitRequestFileSystem`、`chrome`、`WebSocket`、`DOMParser`、`Request`、`fetch`、`open`、`XMLHttpRequest`、`history`（`length`/`state`/`scrollRestoration`/`replaceState`）、`screen`（含 `orientation`）、`localStorage`/`sessionStorage`/`indexedDB`。

### document

`createElement`（`div`/`a`/`form`/`input`）、`getElementsByTagName`、`getElementById`、`createExpression`、`appendChild`、`removeChild`、`addEventListener`、`documentElement`、`body`、`visibilityState`、`characterSet`/`charset`、`all`。

### navigator

`appCodeName`、`appName`、`appVersion`、`userAgent`、`platform`、`language`/`languages`、`product`/`productSub`、`vendor`/`vendorSub`、`cookieEnabled`、`hardwareConcurrency`、`deviceMemory`、`maxTouchPoints`、`onLine`、`doNotTrack`、`webdriver`、`connection.{downlink,effectiveType,rtt,saveData,type}`（`type` 参与 5 值匹配；`onchange` 不是匹配字段）、`getBattery()`（返回带 `then` 的对象，且电池对象需 `charging`/`chargingTime`/`dischargingTime`/`level`）、`webkitPersistentStorage`。

### 构造器与 canvas

`HTMLAnchorElement`、`HTMLFormElement`、`Document`/`HTMLDocument`/`Window` 原型链；`CanvasRenderingContext2D.prototype.getImageData`、`HTMLCanvasElement.prototype.toBlob`/`toDataURL`（`toString()` 必须返回 `[native code]`）。

### 6.1 经独立实现校正的字段清单（**与文章不同处必须按此**）

实现侧需要提供的字段路径如下，可直接当作环境自检清单：

| 字段 | 说明 |
|---|---|
| `window.navigator.maxTouchPoints` | 文章常漏；实测参与基础数组 |
| `window.eval.toString().length` | **必须为 33**（Chrome 系）。这就是文章里的魔法数字 33 |
| `window.navigator.platform` | 参与运算，如 `Win32` / `MacIntel` |
| `window.navigator.battery.{charging,chargingTime,dischargingTime,level}` | **文章只提 `getBattery().then`，实际需要 4 个字段**；不能返回空的带 `then` 对象 |
| `window.navigator.connection.{downlink,effectiveType,rtt,saveData,type}` | 5 个字段都要；**`type` 必须参与 5 值匹配**（`bluetooth`/`cellular`/`ethernet`/`wifi`/`wimax`）。只补 4 个字段会漏掉匹配项 |
| `window.innerHeight` / `innerWidth` / `outerHeight` / `outerWidth` | 四个都要，缺一即环境不一致 |
| `window.document.hidden` | **是 `hidden`，不是仅 `visibilityState`** |
| `window.name` | 承载 `$_YWTU=...&$_YVTX=...&vdFm=...`。**注意代际差异**：6 代实测放 `window.name`（文章 2010081）；5 代是从 `window.localStorage.$_YWTU` 取（文章 1743411）。**两处都要准备** |
| 时间戳三元组 | `currentTime`（毫秒）、`runTime`（秒）、`startTime`（秒，比 `runTime` 小 1~2） |
| `Math.random` 替代点 | 便于复现：把随机值从外部注入而不是真随机 |

**最容易踩的三条**：`document.hidden`、`battery` 四字段、`eval.toString().length === 33`。

#### 关于 `eval.toString().length === 33`

这一位会直接进入基础数组，因此**不能通过替换 `window.eval` 来破坏它**。§3.1 的骨架为了拿到 VM 代码把 `eval` 换成了普通函数，
其 `toString().length` 必然不是 33 —— 骨架只用于**离线提取代码**，不能作为最终环境。

两种正确做法，按优先级：

1. **不要覆盖 `window.eval`**：保留原生 `eval`，改用别的手段捕获 VM 代码
   （注入 debugger 断到 call 处后手工取出字符串，或用 VM 临时脚本单独导出）。
2. 必须覆盖时，覆盖后立刻把 `toString` 修饰回原生形态，并显式校验长度：

   ```js
   const nativeEval = window.eval;
   const captured = function (code) { /* 捕获 code */ return nativeEval(code); };
   Object.defineProperty(captured, 'toString', {
     value: () => 'function eval() { [native code] }',
     configurable: true,
   });
   // 自检：必须是 33
   if (captured.toString().length !== 33) throw new Error('eval.toString().length 必须为 33');
   window.eval = captured;
   ```

> `33` 是 Chrome 系 `function eval() { [native code] }` 的长度。换 UA 前先实测该值，不要照抄。

#### §3.1 骨架是「最小可跑」，不是「可交付环境」

骨架只补 `window` / `location` / `document` 三个裸对象，**不满足 §6 的字段清单**。
照骨架跑出 `_$hg[_$eg[49]] is not a function` 之类的错是正常的，按 §7 排错清单逐条补，
不要以为骨架已经够用。

### 6.2 有状态 DOM 细节（最容易漏，逐条实测）

| 调用 | 期望行为 |
|---|---|
| `div.getElementsByTagName('i')` | 返回对象需带 `length`（为 0），不能返回裸 `[]` 之外的形态差异 |
| `script.getAttribute('r')` | `'m'` |
| `script.parentElement.getAttribute('r')` | `'m'` |
| `meta.getAttribute('r')` | `'m'` |
| `meta.parentNode.removeChild(...)` | 返回 `{}` |
| `document.getElementsByTagName('script')` | **第一次**返回 2 个 script，之后返回 `[]`（有状态计数器） |
| `document.getElementsByTagName('base')` | `[]` |
| `document.createElement('input')` | 按调用次数依次返回 3 个**不同**对象 |
| `form.id`/`action`/`textContent`/`innerText` | 必须是成对 getter/setter；getter 要返回对应序号的 input 对象（顺序耦合） |
| `document.getElementById('root-hammerhead-shadow-ui')` | **必须返回 `null`**，返回非 null 会 400 |

最后一条是 TestCafe / hammerhead 注入痕迹检测，属于自动化痕迹面，详见 `high-strength-browser-detection.md`。

### `document.all`

两个可选路径：

- **首选**：本 skill 的 addon `createUndetectable`（见 `addon-api.md`），在引擎层实现 HTMLDDA 语义。
- **零依赖 fallback**：用 V8 natives syntax 取 undetectable 对象。

  ```js
  const v8 = require('v8'), vm = require('vm');
  v8.setFlagsFromString('--allow-natives-syntax');
  const undetectable = vm.runInThisContext('%GetUndetectable()');
  v8.setFlagsFromString('--no-allow-natives-syntax');
  Object.defineProperty(Document.prototype, 'all', { configurable: true, enumerable: true, value: undetectable, writable: true });
  Object.defineProperty(document.all, 'length', { get() { return Object.keys(document.all).length; } });
  ```

  必须验证 `typeof document.all === 'undefined'` 且 `document.all !== undefined`。fallback 一律在阶段报告记录原因（`env-native-protection.md` 的 native-first 规则不变）。

## 7. 排错清单

按此顺序排查，不要上来就改环境代码：

1. `location` 缺失 / 值不对 → 从浏览器 console `copy(location)` 后原样粘贴。
2. `window.top` 缺失。
3. `_$hg[_$eg[49]] is not a function` → `document.createElement` 未补或返回形态不对。
4. 取不到 `meta.content` → **取法不对**（该站可能走 `getElementById`，不是 `getElementsByTagName`）。
5. Cookie 只有 ~219，浏览器却是 300+ → 只跑了**第一趟**，缺第二趟状态预热，见 `multi-pass-cookie-generation.md`。
6. `typeof document.all` 不是 `undefined` → 用了普通对象而非 undetectable。
7. 运行报错但代码看起来没错 → **文件格式被改动**（换行 / 编辑器重新编码）。按 §2.1 恢复浏览器取到的**原始字节**（从 `.orig` 还原或重新抓一次），**不要手工把代码重排成「单行」**——重排同样会改变字节与特征值。
8. 5 代拿不到 `$_ts` → 被清空逻辑清掉了。
9. 本地快照跑一次能过、过一会儿失败 → `meta.content` / 外链文件名 / 内联变量名每次刷新都变，按 `dynamic-resource-freshness.md` 在入口运行时刷新。
10. 主页能过、接口 400 → 接口校验指纹（长 Cookie），或 `root-hammerhead-shadow-ui` 返回了非 null。
11. 4 个核心值替换后仍不过 → 索引序列取错（要按 20 条赋值语句的**索引**定位，不是按名字）。
12. 变量名重算覆盖率达标但仍不过 → **覆盖率验证不了 `nsd`**（见 `ruishu-vmp-structure.md` §2.4）。
    覆盖率只能证明池长度/资源匹配，`nsd` 对不对必须靠端到端 Cookie 对拍。
13. **Cookie 长度对了但值不对** → 长度只是粗判据。此时不要继续改环境对象，改做**端到端对拍**：
    固定 `$_ts` 三件套与 localStorage 状态，逐段 diff 本地与浏览器的 Cookie（§4.3.1 第 ③ 条）。
14. **「改一点补一点」改了很久没收敛** → 说明缺少**访问序列取证**。先上代理/trace 记录所有属性访问，
    按序列补缺失项（`entry-point` 与 trace 通道见 `references/env-debug-loop.md`）；肉眼猜 stub 的路线
    已有两例公开样本证明会长期卡住（§4.3.1）。

## 8. 边界与替代路线

- 「让瑞数在真浏览器里跑，用中间人拦截拿到改写后的 URL 与 Cookie」是一种**兜底**方案：把代码逆向复杂度置换为架构复杂度。代价是异步通信（浏览器发包 → 代理存储 → 主程序轮询，需要本地文件/DB 或本地 API 做异步转同步），验收标准是重放返回 200。
- 但该路线**不得进入 `result/`**：本 skill 硬规则 18 要求最终交付不含浏览器自动化、临时 server/bridge、Hook 或 Profile。它只能作为取证或过渡手段，并在阶段报告写明。
- **其它运行时**：除 Node.js 补环境外，还有「在 C++ 层实现浏览器运行时的 Python 原生 V8 运行时」路线
  （如 iv8，见 `docs/references/2106217`）。它把 `[[IsHTMLDDA]]` 等引擎级语义在 V8 层做掉，代价是引入新依赖。
  本 skill 的流程与门禁以 Node.js 补环境为默认；选用其它运行时时，环境矩阵（§6）与「真实值必须来自同 baseline 采样」
  两条要求不变，且需在阶段报告说明运行时差异。
- 目标是运行原始网页 JS，不是重写算法；瑞数 VM 内部不强求还原 opcode（见 SKILL.md 能力边界）。
