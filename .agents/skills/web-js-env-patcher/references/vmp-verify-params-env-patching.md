# 接口下发 VM / 混淆代码的「补环境跑参数」族谱

当目标站点的请求参数 / Cookie **不是本地静态 JS 直接算出来的**，而是走这条流水线时读本文件：

> **服务端（或接口）下发一段 VM 代码 / 混淆代码 → 本地把它跑起来（补环境或插装）→ 产出参数 / Cookie → 提交。**

本文件把三个公开样本（`___utmvc`、reese84、testab）**按同一条流水线归并**，
只描述**证据特征、观测点、补环境顺序与排错口径**，用于授权范围内的 Node.js 补环境。
不提供可运行的风控绕过成品，不用于绕过登录、验证码或访问控制。

配合阅读：`case-patterns.md`（案例形态提示）、`ruishu-botgate.md`（同为「挑战页自举 Cookie」但走代际判据）、
`cookie-generation-analysis.md`（Cookie 分类与多趟链路）、`env-debug-loop.md`（访问序列取证）、
`high-intensity-env-diff.md`（环境差异定位）、`node-leakage-and-silent-failure.md`（Node 泄漏与静默失败）。

## 执行次序（避免新人跳过前置确认）

1. 先按 `../SKILL.md` 硬规则完成 intake 确认（目标页、目标参数、取证模式、是否允许请求）。
2. 抓一次**完整链路**并保存原始字节，先回答「**这段代码从哪来**」：
   外链 JS？响应体内联？还是**接口响应体里带回来的**？——这决定了要不要走补环境（见 §1）。
3. 先判断走哪条路线：**补环境**（跑原代码）还是**纯算**（扣出算式）。两条路线证据不同，不要混着推进。
4. 再定位**观测点**：`Function.prototype.apply`（VM 入口）/ `window.JSON.stringify`（序列化前）/ `document.cookie` setter（产物落点）。
5. 补环境或插装，**端到端对拍**（本地产物 vs 浏览器产物逐字节比）。

---

## 1. 共同结构判据：三个样本同一条流水线

| 样本 | 代码从哪来 | 产物 | 关键观测点 | 路线 |
| --- | --- | --- | --- | --- |
| `___utmvc` | 服务端抛一段 **OB**（混淆 JS），复制出来 | `__utmv`（Cookie） | AST 解字符串表后找 cookie 生成处 | 补环境 / 扣代码 |
| reese84 | **Cookie 值由接口返回**（不是 JS 本地算）；请求负载里的 `p` 由 JS 生成 | `p`（请求负载）→ 换回 reese84 cookie | `invokeTask` → `e.callback.apply(n, r)` | 扣代码 |
| testab | **请求响应里返回 VM 代码** | `testab`（一串 hex） | VM 的 `apply` 调用处（打印 `args`） | 补环境 + 纯算 |

**共同结构判据（可迁移）**：

- **「接口下发代码」这一条要先用抓包确认**：如果 JS 文件里搜不到目标算法，但某个接口响应体里有一大段
  可执行字符串 / 一个长数组，那算法就是**接口下发的**——此时「静态扣文件」路线直接作废，
  必须按运行时（补环境或插装）处理。
- **VM 的观测入口几乎总是 `Function.prototype.apply` / `.call`**：VM 用一个调度函数统一调用各个 opcode 处理函数，
  断在 apply/call 处就能看到「这次调用的是哪个方法、参数是什么」。三样本里有两个（reese84、testab）都靠它。
- **产物落点先确定再动手**：`document.cookie`（`__utmv`、reese84）、请求负载字段（`p`、`testab`）、
  请求 Query/Header。落点决定「用补环境（让代码自己写）还是纯算（自己拼）」。

## 2. reese84：Cookie 由接口返回，`p` 由 19 方法数组循环填值

**先记住一条最容易走错的路**：源文原话「**靠 hook 是不行的。这个值是从接口返回的**」——
reese84 的 **Cookie 值本身**是服务端在某个接口响应里给的，**不要在 JS 里翻找 cookie 生成算法**。
要逆的是**为了让那个接口返回正确值，请求负载里的 `p`**。

**链路（源文步骤）**：

1. 刷新页面（`ctrl+F5`），过滤链接，搜索动态路径关键字（本例 `g-Then-And-meeting-beding`，形态与
   `../../web-verify-patcher/references/provider-execution-notes.md` §「F5 Shape / Reese84」记录的同族关键字一致）；
2. 命中两个链接，**带 `d=` 的那个**就是 reese84 值生成的地方；
3. 该请求**负载里的 `p`** 就是要逆向的值；而 `p` 又是**上一个请求**生成的。

### 2.1 ★ 定位法：`invokeTask` → `apply` → 跳约 5 个栈

源文给的定位点（**唯一但高价值**）：`invokeTask` 方法入栈 ⇒ 全局搜下面这一行：

```js
return this._invokeTaskZS ? this._invokeTaskZS.onInvokeTask(this._invokeTaskDlgt, this._invokeTaskCurrZone, t, e, n, r) : e.callback.apply(n, r)
```

⇒ 断点打在 `e.callback.apply(n, r)` 上 ⇒ 命中后**往上跳约 5 个栈**，进到「（字母）`<computed>` 的下一个匿名栈」
⇒ 到达算法生成处。

> ★ **登记判据**：`Zone.js` 的 `invokeTask` 是 **Angular 系站点里「回调链最后一跳」的通用入口**。
> 遇到「异步回调进不去 / 栈里全是框架内部帧」的 Angular 站，先找 `invokeTask`，
> 再从 `e.callback.apply(n, r)` 往上跳，比在业务代码里盲搜快得多。
> （源文原话：「这里我就不写跟栈具体流程了」，只给了这一个定位点——它是这篇的核心抓手。）

### 2.2 ★ 扣代码三条

断到生成算法处后，源文的三条可复用观察：

1. **`NV` 是「19 个方法」构成的数组**：进栈先看 `NV`，它是 19 个方法组成的数组 ⇒ **把这 19 个方法整段扣下来**。
2. **「字符串切片当属性名」的调用 ⇒ 循环填大数组**：源文代码如下（逐字）：

   ```js
   CN[wm.substr(1613, 13)](wm.substr(234, 1) + Dp9);
   MN9();
   CN[wm.substr(1694, 12)](wm.substr(234, 1) + Dp9);
   Dp9 += 1;
   window[qO.substr(1498, 10)](te1, 0);
   ```

   形态是 `容器[<字符串切片>](<字符串切片> + 递增计数)`——**明显是上层循环每次往一个大数组里加值**，
   最后再经编码重组成一个值。⇒ 判据：**看到 `x.substr(...)` 出现在属性名位置，就是「名字被藏进字符串」**，
   不要逐字符硬啃，直接按切片长度还原出真实方法名。
3. **最终 `window.JSON.stringify(Hw)` 之后还走一层 base64**：搜 `window.JSON.stringify(Hw` 找到序列化点，
   序列化结果**不是终点**，源文实测「最后经过了一层 base64 加密」⇒ 要拿到最终 `p` 必须补上这一层。

### 2.3 登记

| # | 条目 | 类型 |
| --- | --- | --- |
| 1 | 源文只给截图与片段，**未给完整的 19 个方法实现** | **源文未展开** |
| 2 | 源文作者自陈「随便搞搞。。自己也是一知半解的」 | **可信度偏低** |
| 3 | 本样本记为 **19 个方法**；`../../web-verify-patcher/references/provider-execution-notes.md` §「F5 Shape / Reese84」记为 **22 个函数** ⇒ **数量随版本 / 站点变，不要硬编码数量** | **跨源不一致（登记）** |
| 4 | 动态路径关键字每几小时轮换（同族记录） | **时效** |

## 3. `___utmvc`：服务端抛 OB，AST 解字符串表

**流程（源文）**：服务端抛给一段 JS（源文图中变量名 `z`）⇒ 复制出来 ⇒ 发现是一段 **OB（混淆）** ⇒
**用 AST 解** ⇒ 找到 cookie 生成的地方慢慢扣 ⇒ 最后生成 `__utmv`。

### 3.1 AST 解混淆两步（源文代码，逐字）

**第 1 步 · 字符串解码**（去掉字面量的 `extra`，还原被转义的字符串）：

```js
function decry_str(ast) {
    traverse(ast, {
        'StringLiteral|NumericLiteral|DirectiveLiteral'(path) {
            delete path.node.extra;
        },
    });
    return ast;
}
```

**第 2 步 · 合并大数组（完成大数组解密）**：

```js
const callToString = {
    CallExpression(path) {
        let {callee, arguments} = path.node;
        if (!types.isIdentifier(callee, {"name": "_0x5764"})) {
            return;
        }
            // 这里可以加下字面量判定

        let value = eval(path.toString());
        path.replaceWith(types.valueToNode(value))
    }
}
```

⇒ 判据：字符串表型 OB 的标准两步 = **① 去掉 `extra` 让字面量变回真实值；② 把「取字符串」的调用
（这里 callee 名 `_0x5764`）`eval` 出来直接替换成字面量**。第二步的名字**每份样本都不同**，
源文自陈「不通用。改下 name 就行。反正就一个数组需要 eval」。

解完之后「还有一些函数还原的 AST」，全部解完后**难度就低很多**，找到 cookie 生成处慢慢扣；
**有些变量需要动态替换**（与 `ruishu-botgate.md` §4.2 的「核心值动态替换」是同一类工作）。

### 3.2 登记

| # | 条目 | 类型 |
| --- | --- | --- |
| 1 | 章节名写 `___utmvc`，最终产物写 `__utmv` —— **两者名字不一致**，源文未解释 | **源文自相矛盾** |
| 2 | 源文作者自陈「本人也不太会 大佬勿喷」 | **可信度偏低** |
| 3 | 字符串表调用名 `_0x5764` 只对本样本有效 | **单样本** |
| 4 | AST 只给了两步骨架，函数还原部分未给 | **源文未展开** |

## 4. testab：请求返回 VM 代码，`apply` 处是观测点

**形态判据**：源文原话「就是一个**请求里返回出来的 VM 代码**」——
搜索目标参数 → 断点 → **进入一个 JSVMP** → 分析。目标站未点名（源文「懂得都懂」），参数名为 `testab`。

### 4.1 ★ 补环境清单与顺序（源文实测顺序，务必按序）

1. **先赋值 `self` / `top`**（源文原话「第一步就是要赋值」）：

   ```js
   self = top = window;
   window.self = window.top = window;
   ```

   源文注明：**到这一步就能生成一个「错误的值」了**（即环境已能跑通、但值不对）——
   说明「能跑出值」不等于「环境正确」，后面还要逐项对拍。

2. **往下走，把出现的一堆环境全部补上**。

3. **删 Node 检测**：源文「还有 process 检测。所以在开头也要删除掉 process」，
   「可以把 `global` `buffer` 的一些 Node 检测全部删除」。
   ⇒ 起手式里 `delete process` / `delete global` / `delete buffer`（同族机制见 `node-leakage-and-silent-failure.md`）。

4. **`appendChild` 先后问题**：源文原话——「**如果这个不会补。可以不补。你实现的乱七八糟可能不一定对。反正最后都是 `false`**」。
   ⇒ 这条**照实登记为「可不补」**：补得不对反而引入错误，源文实测不补也是 `false`。

5. **`createElement` 拿 CSS 标签值**：「这里应该也是创建一个标签 拿到 css 的标签值。这里也要对比」。

6. **原型链检测 + `toString()` 检测**：「还有一堆的原型链的检测 和 `toString()` 检测 其中包含
   `Image` / `Screen` / `HTML*` / `Window` 等…」。

**★ 验收判据（本样本最硬的一条）**：在 VM 的 `apply` 调用处**打印 `args`**，把传参值里的
**「64 位大数组」与浏览器里同一位置的 64 位大数组对比**，**值一致就代表补 OK 了**。
⇒ 这是「补环境是否成功」的**端到端对拍**，比「跑不报错」可靠得多。

### 4.2 ★ 纯算还原路线（源文自陈的笨办法，很有教学价值）

源文的定位与分析流程：

1. **先找出生成的某个值**；
2. **然后去看逻辑**；
3. **把逻辑处持续插装打值**；
4. **基于值分析**。

**定位点**：找到定位点后，**沿「返回的指令集索引」逐个对栈**（VM 的 opcode 索引就是线索）。

**产物形态**：最终是一串 **`String.fromCharCode` 的 char code 数组**（源文样本 64 个元素），
用 `map(String.fromCharCode).join('')` 拼回字符串：

```js
let last_arr = [
    51, 50, 98, 50, 56, 50, 55, 51, 52, 56, 54, 52,
    51, 97, 55, 51, 97, 48, 56, 49, 97, 49, 101, 101,
    100, 51, 53, 102, 99, 56, 54, 53, 49, 55, 100, 51,
    54, 52, 52, 54, 48, 102, 53, 97, 52, 56, 48, 53,
    97, 52, 55, 99, 57, 102, 101, 54, 57, 99, 49, 53,
    48, 99, 49, 100
]

const testab = last_arr.map(val => String.fromCharCode(val)).join('');

console.log(testab)
```

（该数组解出来是一个 **64 位 hex 串**，即 `testab` 的形态。）
源文补充：观察可得「**永远是外面一层大数组包着一个最后的值**，然后把最后一个值添加到里面的数组」，
「是又好几个数组生成，然后最终再生成这个 `testab`」（中间还有「转置」步骤）。

> ⚠️ **登记（必须点破）**：源文**只给了最终产物**（那 64 个 char code），**没有给出生成该数组的完整算式**。
> ⇒ 这条**不可直接复用**——照抄 `last_arr` 只能复现**这一个样本的这一个值**。
> 要复用必须按上面的「① 找值 → ② 看逻辑 → ③ 插装打值 → ④ 基于值分析」重新走一遍，
> 把「几个数组 → 转置 → 拼 char code」的**算式**扣出来。

### 4.3 工具建议

源文：**「更方便的方法 直接用 `v-jstools` 吐一下，改一下 `process` 还有一些其他的环境值。一会儿就出来了」**。
⇒ 与手补相比，先用环境导出工具吐一份，再改 `process` 等 Node 泄漏项，成本最低。
导出后的差异定位见 `high-intensity-env-diff.md`。

### 4.4 登记

| # | 条目 | 类型 |
| --- | --- | --- |
| 1 | 纯算只给产物、**未给生成算式** | **源文未展开 / 不可直接复用** |
| 2 | 目标站未点名（「懂得都懂」） | **单样本 / 不可回源** |
| 3 | `appendChild` 源文说「可不补」 | **源文自陈边界** |
| 4 | 补环境成功判据 = 64 位大数组与浏览器一致 | **单样本（该站形态）** |

## 5. 跨样本排错清单

按此顺序排查，不要上来就改环境代码：

1. **值能生成但不对**（testab 的典型）：环境「能跑」只说明没报错；**必须做端到端对拍**
   （§4.1 的 64 位大数组 / §2 的 `p` 逐字节比），不要拿「有输出」当成功。
2. **`process` / `global` / `buffer` 未删** ⇒ Node 检测命中。**起手式就要删**，不要等报错。
3. **补环境「一步错 步步错」**（源文原话）⇒ 顺序敏感（`self`/`top` 必须先赋值）；
   出问题先回到**第一个错误值**的位置，而不是继续往下补。
4. **补了 `appendChild` 反而更乱** ⇒ 按 §4.1 第 4 条**先不补**，确认它是否真的参与判定。
5. **在 JS 里翻 reese84 cookie 值翻不到** ⇒ 它不是本地算的，**是接口返回的**（§2 开头）。
6. **扣代码只拿到「结果」拿不到「算式」** ⇒ 回到「① 找值 → ② 看逻辑 → ③ 插装打值 → ④ 基于值分析」，
   沿 **opcode / 指令集索引**逐个对栈（§4.2）。
7. **VM 里进不去、栈全是框架帧** ⇒ Angular 站找 `invokeTask`（§2.1）；
   其它站先找 `Function.prototype.apply` / `.call` 的劫持点，断在 VM 的调度处。
8. **字符串表解完还是看不懂** ⇒ 别硬啃 `substr` 切片，先按切片长度还原真实名字（§2.2 第 2 条），
   或按 `ast-deobfuscation` 的字符串表路线解（见 `../../ast-deobfuscation/references/string-array-and-minimal-eval.md`）。

## 6. 边界

- **本族不追求还原 VM 的 opcode**：目标是在授权范围内**跑出参数**（补环境）或**扣出算式**（纯算），
  不是重写一个 VM 解释器。VM 内部机制读 `../../web-reverse-algorithm/references/11-jsvmp-restoration-routes.md`。
- **动态资源保鲜**：reese84 的动态路径每几小时轮换、`___utmvc` 的 OB 与变量名每次变 ⇒
  本地快照不能长期复用，按 `dynamic-resource-freshness.md` 在入口运行时刷新。
- **`apply` 观测与无限 `debugger`**：testab / reese84 都在 `apply` 处观测，而 JSVMP 常伴无限 `debugger`；
  按函数源码文本精确 hook `apply` 掐掉 debugger 的配方见
  `../../web-reverse-hook/references/response-rewrite-and-locating-hooks.md` §4。
- **反调试静态路线**：`debugger` 在**动态构造**字符串里时的处置（改 `eval` 实参）见
  `../../web-reverse-algorithm/references/07-antidebug-and-live-patching.md` §5.7。

## 7. 来源表

| 样本 | 主题 | 文章裸 id | 年份 | 关键面量 |
| --- | --- | --- | --- | --- |
| `___utmvc` | 服务端抛 OB，AST 解字符串表后扣 cookie | 52pojie-1912763 | 2024 | `___utmvc`、`__utmv`、`_0x5764`、`decry_str`、`StringLiteral\|NumericLiteral\|DirectiveLiteral`、`delete path.node.extra` |
| reese84 | Cookie 由接口返回；`p` 由 19 方法数组循环填值 | 52pojie-1912763 | 2024 | `g-Then-And-meeting-beding`、`invokeTask`、`e.callback.apply(n, r)`、`NV`（19 方法）、`CN[wm.substr(1613, 13)](...)`、`window.JSON.stringify(Hw`、base64 |
| testab | 请求返回 VM 代码；`apply` 处观测；补环境 + 纯算 | 52pojie-1984407 | 2024 | `testab`、`self = top = window`、`delete process`、`appendChild`（可不补）、`v-jstools`、64 位大数组对拍、`String.fromCharCode` |
