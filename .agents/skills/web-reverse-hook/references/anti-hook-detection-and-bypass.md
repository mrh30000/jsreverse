# 反 Hook 检测、Closed Shadow DOM 与页面限制解除

一句话：**hook 装上了、逻辑也没错，页面却还在报「异常脚本」、内容依旧拿不到 ⇒ 先查两件事：
「页面是不是在检测你 hook 了原生方法」和「目标内容是不是根本不在开放 DOM 里」。**

> 反调试四件套（无限 `debugger` / console / 窗口尺寸 / 强退 / iframe 原生借用）见 `../SKILL.md` 的 `antidebug` 预设；
> 本文补的是它**没有覆盖**的四类：
> ① **hook 被 `Function.prototype.toString` 白名单比对发现**（§1–§4）；
> ② **closed shadow DOM**（§5–§6）；
> ③ **页面自己施加的「禁止复制 / 弹登录」限制**（§7）；
> ④ **cookie 写入点的 hook、被实证的一批 cookie 名、以及「进 debugger 即被反制」**（§8–§9）。
> 本文只给**思路与片段**，尚未做成 `build-hook.js` 预设（见文末「未实现项」）。

---

## 1. 指纹一：`Function.prototype.toString` 白名单比对

**现象**：你只 hook 了 `Element.prototype.attachShadow`，页面立刻提示「异常脚本」。
**先做什么**：全局搜异常文案（本例搜「异常脚本」）定位上报点，再顺着它找「检测函数」。

源文（`52pojie-1650555`，智慧树）的检测入口长这样（逐字摘自正文代码块）：

```text
// 检测入口汇总：把「若干原生函数」逐个丢进 a() 做白名单比对
function l() {
    return a(window.XMLHttpRequest) && a(window.XMLHttpRequest.prototype.open) && (!S.a.state.globalProperty.supportShadom || a(document.body.attachShadow)) && !window.OCS
}

// 白名单比对本体：t 是 typeof；函数走 ne.test(ee.call(e))
function a(e) {
    var t = void 0 === e ? "undefined" : _()(e);
    return "function" == t ? ne.test(ee.call(e)) : e && "object" == t && Y.test(toString.call(e)) || !1
}
```

**判读**（源文正文口径）：

- `ee` = **取函数源码**（等价于 `Function.prototype.toString`，源文写作 `ee.call(e)`）；
- `ne` = **一个正则**，用来匹配「标准原生函数源码」的特征串（含 `function` / `native code` 字样）（源文推断：正则字面量在截图里，正文只说「判断是否出现了 nativecode 的字样」）；
- 逻辑 = **白名单遍历**：白名单里每一个函数都必须是「未被改过的原生函数」；**任一不匹配即异常上报**。

**关键判据**：页面报「异常脚本」，而你的 hook 逻辑本身没问题 ⇒ **先找有没有 `toString` 比对**，
而不是继续怀疑自己的拦截代码。

**检测入口本身就是一组指纹**（源文 `l()` 逐条列出，照抄即用）：

| 入口 | 含义 |
| --- | --- |
| `window.XMLHttpRequest` / `window.XMLHttpRequest.prototype.open` | 原生 XHR 是否被包过 |
| `document.body.attachShadow` | 原生 `attachShadow` 是否被包过 |
| `!window.OCS` | **页面把「某个特定全局变量存在」当成「装了脚本」的指纹**（源文正文调侃「OCS 作者榜上有名」） |

⇒ **反向纪律**：自己的脚本 / 管理器**别把变量挂到 `window` 全局**（用 IIFE 包住），否则等于自报家门。

---

## 2. 绕过一（源文主推）：不打 `toString`，改短路「上报动作」

**为什么不在 `toString` 上做文章**：源文说得很直白 ——
「这里在启动的时候**已经获取了 `Function.toString`** 了，所以我们很难对其进行函数字符化的劫持」。
取源码的引用可能被页面**提前缓存**，你再去改 `Function.prototype.toString` 已经晚了。

**换个更便宜的目标**：源文发现「代码就是一个校验、一个上报，而 `f.r` 也只有这一处」，
并且上报是通过 **`setInterval` / `setTimeout` 定时调用**某个函数触发的（源文里函数名 `checkoutNotTrustScript`）。
⇒ **不碰 `toString`，直接掐掉「上报」这一次调用**。

**判据**：异常上报往往只有**一处**。先「搜异常文案 → 找到上报函数 → 看它由谁定时调用」，
通常比死磕 `toString` 便宜得多。

### debugger 的代价分级（B39：当「断一下」本身有代价）

来源 `docs/references/52pojie-1906023`（**求助帖，发帖人自己没解决**）。其**被实证的现象**是：
在 cookie 写入的 `set` 里进入 `debugger` 的瞬间，页面就执行「**删除 debugger + 刷新页面**」，
随后所有请求返回 **403**。（源文同段还写「应该是检测到我在 debugger」—— ⚠️ 那是**源文推测，未复核**；
「删 debugger + 刷新 + 后续请求全部 403」才是被观测到的事实。）

⇒ 设断点前先认清自己在赌哪一档：

| 档 | 现象 | 依据 |
| --- | --- | --- |
| 1 · 只是卡住 | 断点反复触发，页面还能继续走 | 无限 `debugger` 类（`antidebug` 预设） |
| 2 · 页面被刷新 / 清空 | 打开 DevTools 后页面跳走或变空 | `../../web-reverse-algorithm/references/09-antidebug-and-automation-fingerprint.md` §1 类 7 / §4 |
| **3 · 断一下即被反制** | **删 debugger + 刷新 + 后续请求全部 403** | **`52pojie-1906023`（本文新收）** |

★★ **第 3 档的落地动作（本节相对 §2 的增量）**：
**第一条 `debugger` 不要设在「反调试检测代码自己」上** —— 一进去就被判定，反制往往是不可逆的
（刷新 + 后续全 403）。**要先设在上报 / 校验动作上**（即 §2 说的「短路对象」），
用 §3 的 `stack` 过滤在**不真正进入调试器**的前提下把调用链取出来。

> **这与 §2 是同一个结论的两面**：§2 说「别在检测器本体上硬碰」，本节补的是「**碰了要付什么代价**」。

---

## 3. 绕过二 ★：用 `new Error().stack` 做「调用方过滤」（选择性劫持）

这是本文最值得搬走的一条。源文给的做法（逐字摘自 `52pojie-1650555` 正文代码块）：

```js
let oldset=window.setInterval
let oldout=window.setTimeout
window.setInterval=function(...args){
    let err= new Error('大赦天下');
    if(err.stack.indexOf('checkoutNotTrustScript')!==-1){
        return
    }
    return oldset.call(this,...args)
}
window.setTimeout=function(...args){
    let err= new Error('大赦天下');
    if(err.stack.indexOf('checkoutNotTrustScript')!==-1){
        return
    }
    return oldout.call(this,...args)
}
```

**它做的事**：在 `setInterval` / `setTimeout` 的包装里构造一个 `Error` 取 `stack`，
**只掐掉「来自检测函数」的定时器注册，其它一律放行**。（`'大赦天下'` 只是错误信息标记，随便写。）

### 通用范式：选择性劫持（selective hijack）

> **在 wrapper 里构造 `Error` 取 `stack`，按「调用者函数名 / 文件名」决定放行还是拦截。**

适用场景：**不想整段禁用某个 API**，只想掐掉来自某一处的调用（本例：只掐检测函数的定时器，
页面自己的正常定时器照跑）。抽象成可复用的包装器：

```js
// 只在「调用栈里出现 deniedCaller」时拦截，其余原样放行
function selectiveWrap(api, deniedCaller, onBlocked) {
  const raw = api;
  return function (...args) {
    const stack = (new Error('probe').stack || '');
    if (stack.indexOf(deniedCaller) !== -1) {
      if (onBlocked) onBlocked(stack);
      return undefined;               // 掐掉本次注册：不调用原生 API
    }
    return raw.apply(this, args);
  };
}
window.setInterval = selectiveWrap(window.setInterval, 'checkoutNotTrustScript');
window.setTimeout = selectiveWrap(window.setTimeout, 'checkoutNotTrustScript');
```

**代价（一定要知道）**：

| 代价 | 说明 |
| --- | --- |
| **强依赖函数名** | `stack` 里要有可识别的函数名。**代码被压缩 / 混淆掉了函数名就失效** |
| 匿名 / 箭头 / 异步回调 | 名字可能是 `<anonymous>` 或干脆不出现 ⇒ 过滤不中 |
| `Error.prepareStackTrace` | 页面自定义了它 ⇒ stack 格式可能完全变样 |
| `Error.stackTraceLimit` | 被改小（如 3）⇒ 调用者可能不在栈里 |

⇒ **先打印一次 `new Error().stack` 确认栈里真的有那个名字**，再定拦截条件；否则就是在瞎猜。

---

## 4. 绕过三（保留，但价值有限）：劫持 `RegExp.prototype.test`

源文的第三条路（逐字摘自 `52pojie-1650555` 正文代码块）——让白名单正则「对任何含
`function` / `native code` 的 source 都返回 `true`」：

```js
RegExp.prototype._test = RegExp.prototype.test;
RegExp.prototype.test = function (s) {
  if (this.source.includes('function') || this.source.includes('native code')) {
    return true;
  }
  return this._test(s);
};
```

**为什么价值有限（照抄源文结论）**：作者自己说「但是**那样就没啥意义了**」。理由有两条：

1. **拦掉检测 == 主动告诉对方你不正常**：让白名单正则一律返回 `true`，
   等于把「正常/异常」的区分整个抹平 —— 站点后续任何依赖这个正则的判断也一起被污染；
2. **`Function.toString` 可能已被提前缓存**（同 §2）：劫持正则只是打补丁，
   对方换个取源码的方式（预存的 `toString` 引用、`Function.prototype.toString.call`）就废掉。

**附带缺陷**：`RegExp.prototype._test = RegExp.prototype.test` 把 `_test` **挂在了全局原型上** ——
可被枚举、可被覆盖，属于污染原型链的写法（调试期临时用可以，别当交付）。

---

## 5. Closed shadow DOM 取证：包装 `attachShadow` 强制 `mode = 'open'`

**判据（30 秒确认遇到的是 closed shadow root）**：

| 现象 | 判断 |
| --- | --- |
| 页面上有内容，但 Elements 面板里对应节点**看不到子节点** | closed shadow root |
| `el.shadowRoot === null`（但页面上明明渲染了内容） | closed shadow root |
| `el.shadowRoot` 有值 | open，直接读 `.innerHTML` 即可，**不需要本节手段** |

**做法**：包装 `Element.prototype.attachShadow`，把 `mode` 强行改成 `'open'`（源文原始代码，逐字摘自 `52pojie-1650555`）：

```js
let old=Element.prototype.attachShadow
Element.prototype.attachShadow=function(...args){
    console.log('attach劫持',...args)
    args[0].mode='open'
    return old.call(this,...args)
}
```

⚠️ **源文代码的两个真实缺陷（如实标注，不美化）**：

1. `args[0].mode='open'` **没有做 `args[0]` 存在性判断** —— 若页面以 `attachShadow()`（无参）调用会直接抛错；
2. `args[0]` 是**调用方对象引用**，原地改 `mode` 会**把修改传导回调用方**（页面自己后续读到的 `args[0].mode` 也被改了）——
   更稳的写法是 `const init = Object.assign({}, args[0], { mode: 'open' })` 再传进去。

**时机**：`attachShadow` 是**页面早期调用**的 API ⇒ 这个 hook **必须注入在页面代码之前**（见 `../SKILL.md`「注入与生效时机」），
注入晚了页面已经建好 closed root，改 `mode` 也没用（已建成的 root 的 `mode` 是只读的）。

---

## 6. 框架句柄逃逸：从实例自有属性直接取内容（与 attachShadow 正交的第二条路）

有些组件**把引用自己存了起来**。源文实测（`52pojie-1650555`）：

```text
document.querySelector('.subject_describe > div > div').parentElement.__vue__.shadowDom.innerHTML
// 源文正文：「可以知道 this.shadowDom 是 attachShadow 的引用」
```

**判读**：组件在构造时写了一句 `this.shadowDom = this.attachShadow({ mode: 'closed' })` ——
**`attachShadow` 的返回值（那个 closed root）被保存到了 Vue 实例的自有属性上**。
⇒ 就算你**没拦到** `attachShadow`（DOM 层面也读不到），
顺着 `__vue__` 直接读**它自己保存的那个引用**，照样能把 `innerHTML` 拿出来。

**判据**：**只要组件把引用挂在了实例属性上，DOM 层面拦不到也能拿到。**

**与既有预设的分工**：

| 路径 | 抓手 | 适用 |
| --- | --- | --- |
| `spa-vue` / `spa-state` | `__vue__.$store` / 路由表 / 组件注册表 | 目标是**状态、路由、组件** |
| **本文 §6** | **任意实例自有属性**（`__vue__.任意字段`） | 目标是**组件自己存下来的某个引用 / 对象** |

⇒ 想不出字段名时：在 Console 里 `console.log(el.__vue__)` 看它身上挂了什么自有属性，往往一眼就找到那个句柄。

---

## 7. 页面限制解除：从「改样式」到「改函数」（`52pojie-1608506` 的通用配方）

### ① `user-select: none` 类「禁止选中」

源文写法（逐字摘自 `52pojie-1608506`）：

```js
document.querySelectorAll("code").forEach(function(item) {
    item.style = item.style + ";user-select: text !important;";
    return item;
})
```

**为什么有效**：**行内 `!important` 能压住作者样式表里的 `!important`**
（行内样式与样式表同属「作者来源」，判定同档时**行内特异性更高**，所以行内能赢）。

⚠️ **两个必须知道的前提**：

1. **只在「行内」生效** —— 它压不住更外层的、由 JS 动态设置的限制，
   对 **`::selection`、`pointer-events`、`-webkit-touch-callout`** 等**其它限制词不生效**，
   要**逐个补**（`::selection` 只能用样式表规则或 `CSSStyleSheet.insertRule`，行内写不进去）；
2. **源文那句 `item.style = item.style + "..."` 是「把声明拼成字符串再赋给 `style`」的写法** ——
   依赖 `style` 的 `[PutForwards=cssText]` 语义，可读性差；**更规范的等价写法**是：

```js
document.querySelectorAll("code").forEach(function (item) {
  item.style.setProperty("user-select", "text", "important");
});
```

### ② 重写站点自己的功能函数（而不是只改样式）

源文把「点按钮弹登录框」直接换成「全选该 `<pre>` 并复制」（逐字摘自 `52pojie-1608506`）：

```js
window.hljs.signin = e => {
    var preNode = e.path.filter(item => item.tagName == "PRE")[0];
    // 选中一段文字
    let selection = window.getSelection();
    let range = document.createRange();
    range.selectNode(preNode);
    selection.removeAllRanges();
    selection.addRange(range);
    // 执行复制命令
    document.execCommand('copy', false, null);
    e.target.dataset.title = "复制成功";
    setTimeout(() => {
        e.target.dataset.title = "复制全部";
    },1000);
}
```

⚠️ **源文代码的真实缺陷（如实标注，不美化）**：`e.path` **不是标准属性** ——
它只是早期 Chrome 的提案；**标准是 `e.composedPath()`**，Safari / Firefox 不认 `e.path`。
⇒ 迁移到自己脚本时改成 `e.composedPath().filter(item => item.tagName == "PRE")[0]`（或 `getSelection` 前先 `range.selectNode` 目标节点）。

**可运行的最小骨架**（`Range.selectNode` + `getSelection` + `execCommand("copy")`）：

```js
function copyNode(node) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNode(node);
  selection.removeAllRanges();
  selection.addRange(range);
  return document.execCommand("copy", false, null);   // 已废弃但仍是站内「复制」的通用实现
}
```

### ③ 判据：先看「点按钮时执行的是哪个函数」，再决定改样式还是改函数

**只改样式时按钮仍会弹窗** —— 源文正文亲口印证：「（有老哥反映有的页面点击按钮还是会弹出登录框……
我下午 4 点修改了下做了兼容）」⇒ 它**同时**改了样式（`user-select`）**和**函数（`hljs.signin`）才彻底。

| 你要达到的效果 | 该动哪一层 |
| --- | --- |
| 能选中 / 能右键 / 能拖拽 | **改样式**（行内 `!important`，注意 §7①的其它限制词） |
| 点某个按钮不再弹窗 / 不再跳走 | **改函数**（先定位按钮绑的是哪个函数，再替换它） |
| 两者都要 | 两处都改（源文最终就是这么做的） |

---

## 8. Cookie 写入点的 hook 与「按 cookie 名反查写入者」（B39）

来源 `docs/references/52pojie-1906023`（**求助帖，只登记被实证的现象与数字**）。
场景：**首页加载十几个 JS，这些 JS 向浏览器写入 cookie；后续请求都要带这些 cookie，
否则「参数错误」**（源文 line 10–11 逐字）。

### 8.1 改写与分流的铁律（先读这条，再抄下面的片段）

源文 hook 的形态是：

```text
Object.defineProperty(document, "cookie", { set: function(val){...}, get(){ return v } })
```

⚠️ **该形态「只留最后一次写入的值」—— 正是 `../SKILL.md`「Cookie hook：三个『一定有』的坑」坑 2
所述会毁掉整站的写法**（`get` 返回自维护字符串 / 存放于 `document` 自身）。
⇒ **不要照抄这个 `get`**：要**观测**就走 `dataflow` 预设（转发原生描述符），
要**改写**就明确声明、并自行补齐 `k=v; ` 拼接与过期语义。
**本节只取它「按 cookie 名条件触发」的那一半**，转发部分的正确写法见上引章节。

### 8.2 条件 `debugger`：按 cookie 名触发（把观测收窄到要的那一次）

源文在 setter 里按名放行（源文对 `bnc-uuid` / `deviceId` / `se_gd` / `thx_guid` / `device-info`
分列了五个 `if (val.indexOf(...) !== -1) { debugger }`）：

```text
// 与 SKILL.md 坑 3 的 --cookie-match 同语义：只在命中时才 debugger
if (val.indexOf("bnc-uuid") !== -1) { debugger; }
if (val.indexOf("deviceId") !== -1) { debugger; }
```

- **与已有工具的关系**：本技能 `dataflow` 预设的 `--cookie-match <关键词>` 就是这条
  （**子串包含**匹配；关键词太短如 `a` 等于没有条件）。
  ⇒ 有 `dataflow` 时**不必手写**这段（`../SKILL.md` 坑 3）。
- ⚠️ **`debugger` 本身有代价**，见 §2「debugger 的代价分级」——
  本簇的源文正是在这一步被反制（进 debugger 即删 debugger + 刷新 + 403）。

### 8.3 ★★ 五个 cookie 名 = 一批风控 / 统计 SDK 的指纹清单（先试这五个）

源文 hook 点名了这五个名 —— **它们本身就是可迁移的「先查这几个名」启发式清单**：

| cookie 名 | 源文中的角色 |
| --- | --- |
| `bnc-uuid` | 条件 `debugger` 命中名之一 |
| `deviceId` | 同上 |
| `se_gd` | 同上；源文反混淆代码里另有 `se_gd` / `se_gsd` 的读写痕迹 |
| `thx_guid` | 同上 |
| `device-info` | 同上；**源文在此名写入时进入 debugger 并触发反制**（§2 第 3 档） |

> ★ **标注**：**这是单站观察，名单会变，用法是启发不是判据。**
> 含义是「遇到一批混淆 JS 写 cookie 时，可以先把这五个名当第一批 hook 关键词试」，
> **不能**当成「有这五个名就是同一套 SDK」的结论（单样本只登记不判因）。

### 8.4 ★ 判据：怎么定位「十几个混淆 JS 里哪个有用」（源文第 1 问的可执行版）

**不要读 JS，要读 cookie 的「谁写的」。**
源文第 1 问的难点是「十几个混淆 JS（最大的格式化后**九万行**），怀疑有些只是混淆视听」——
⇒ 通读 JS 不是答案，**用 8.2 的 hook 拿到「写入者调用栈」，按 cookie 名反查文件**：

```
① 装上 cookie hook（转发原生描述符）+ 按名条件 debugger，且用 §3 的 stack 过滤避免真进调试器
② 记下「每个 cookie 名 → 写入它的 (file, line)」这张映射表
③ 按 cookie 名反查文件：目标 cookie 是哪个文件写的，那个文件才值得读
   —— 而不是「按文件猜它可能产哪个参数」
```

**迁移性**：这是 `../../web-reverse-algorithm/references/15-call-site-locating-playbook.md` 的 **J1
「消失点比出现点更好用」的一个具体实例** —— cookie 的「值」到处可见（出现点），
但「**谁 set 它**」只有一个（写入点 = 生成点）。方法与判据本身见该手册，本节不重复。

**配套判据（「哪个 JS 是必要的」）**：逐个禁用候选 JS，看**哪一步 cookie 缺失导致后续失败** ——
缺失的那一个就是必要的。它与上面的「正查写入者」互证，且比单看代码可靠；
完整流程见 `../../web-js-env-patcher/references/cookie-generation-analysis.md` 的「多写者」一节
（**本仓已有，此处不重复**）。

⚠️ **规模提醒**：源文自陈「最大的 js 文件格式化后有**九万行**」——
到这个量级时，「按 cookie 名反查写入者」（本节）**优先于**「通读 / 全量还原」。

---

## 9. 混淆形态登记：ob 混淆的「索引 + 第二参」双参调用

源文给出的混淆样本形态（逐字摘自 `52pojie-1906023`，**只登记形态，不判因**）：

```text
b('0x172', ')e4a')
f[b('0x127', 'gT&1')](...)
```

**形态特征**：`b(索引, 字符串)` —— **第一个参数是索引，第二个参数是一个字符串（看着像随机盐 / 密钥分片）**，
二者共同决定取出哪个成员。源文正文判定该样本为 **ob 混淆**（`obfuscator.io` 风格）。

> ⇒ 这类「**索引 + 第二参**」的双参取值调用，指向
> `../../ast-deobfuscation/references/ob-variant-taxonomy.md`（OB 变体分类与还原对策）与
> `../../ast-deobfuscation/references/obfuscation-detector.md`（判「是不是 OB」）：
> 先按第二参字符串分组，再把 `b(idx, salt)` 还原成成员名。
> **本文只登记形态特征**，反混淆本身不在本技能范围。

---

## 10. 与既有预设的分工表

| 场景 | 去处 |
| --- | --- |
| 无限 `debugger` | `antidebug` 预设 |
| console 检测 / 清空 / `table` 耗时探测 | `antidebug` 预设 |
| **hook 被 `toString` 白名单检测** | **本文 §1–§4** |
| **closed shadow root / `attachShadow` 拿不到** | **本文 §5–§6** |
| **页面禁止复制 / `user-select: none` / 弹登录框** | **本文 §7** |
| **cookie 写入点 hook / 按 cookie 名反查写入者 / 进 debugger 即被反制** | **本文 §2（代价分级）+ §8–§9** |
| cookie 被 hook 写坏（读到的 cookie 残缺） | `../SKILL.md`「Cookie hook：三个『一定有』的坑」 |
| MSE 无直链（`src` 是 `blob:`） | `mse-capture` 预设 |
| **多写者（十几个 JS 各写一部分 cookie）的取证** | `../../web-js-env-patcher/references/cookie-generation-analysis.md` |
| **跟栈定位生成点的方法论** | `../../web-reverse-algorithm/references/15-call-site-locating-playbook.md` |
| **ob 混淆（含「索引 + 第二参」双参形态）的反混淆** | `../../ast-deobfuscation/references/ob-variant-taxonomy.md` |

---

## 11. 来源表

| 主题 | 文章裸 id | 年份 | 关键字面量 |
| --- | --- | --- | --- |
| 反 hook 检测（`toString` 白名单）+ closed shadow DOM + 框架句柄逃逸 | 52pojie-1650555 | 2022 | `attachShadow`、`checkoutNotTrustScript`、`window.OCS`、`native code`、`__vue__.shadowDom` |
| 页面限制解除（禁止复制 / 登录弹窗） | 52pojie-1608506 | 2022 | `user-select`、`hljs.signin`、`execCommand('copy')` |
| cookie 写入点 hook + 五 cookie 名清单 + 进 debugger 即被反制 + ob 双参形态 | 52pojie-1906023 | 2024 | `bnc-uuid`、`deviceId`、`se_gd`、`thx_guid`、`device-info`、`sajssdk_2015_cookie_access_test`、403、九万行 |

---

## 未实现项

本文给的是**思路与片段**，尚未做成 `build-hook.js` 预设 ——
如要做成预设，需在 `scripts/hooks/` 新增钩子文件并接进 `build-hook.js`（属于后续工作）。

**B39 新增未落地项**（只落了文档，没有脚本入口）：

1. **「五个 cookie 名」清单**（§8.3）目前只是文档，**尚未做成 `dataflow` 预设的默认关键词集** ——
   若要落地，宜在 `build-hook.js` 的 `dataflow` cookie 分支加一个可选的「SDK 指纹名预设」，
   ⚠️ 但其命名须以「**单站观察、会变**」为前提，不要写成通用判据。
2. **「按 cookie 名反查写入者」的汇总表**（§8.4）目前靠人工记录 ——
   `dataflow` 预设已能打出 `logAt`（文件名 / 行号），但**没有自动汇总成「名 → 文件」映射**。
