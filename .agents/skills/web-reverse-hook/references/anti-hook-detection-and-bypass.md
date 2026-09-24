# 反 Hook 检测、Closed Shadow DOM 与页面限制解除

一句话：**hook 装上了、逻辑也没错，页面却还在报「异常脚本」、内容依旧拿不到 ⇒ 先查两件事：
「页面是不是在检测你 hook 了原生方法」和「目标内容是不是根本不在开放 DOM 里」。**

> 反调试四件套（无限 `debugger` / console / 窗口尺寸 / 强退 / iframe 原生借用）见 `../SKILL.md` 的 `antidebug` 预设；
> 本文补的是它**没有覆盖**的三类：
> ① **hook 被 `Function.prototype.toString` 白名单比对发现**（§1–§4）；
> ② **closed shadow DOM**（§5–§6）；
> ③ **页面自己施加的「禁止复制 / 弹登录」限制**（§7）。
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

## 8. 与既有预设的分工表

| 场景 | 去处 |
| --- | --- |
| 无限 `debugger` | `antidebug` 预设 |
| console 检测 / 清空 / `table` 耗时探测 | `antidebug` 预设 |
| **hook 被 `toString` 白名单检测** | **本文 §1–§4** |
| **closed shadow root / `attachShadow` 拿不到** | **本文 §5–§6** |
| **页面禁止复制 / `user-select: none` / 弹登录框** | **本文 §7** |
| cookie 被 hook 写坏（读到的 cookie 残缺） | `../SKILL.md`「Cookie hook：三个『一定有』的坑」 |
| MSE 无直链（`src` 是 `blob:`） | `mse-capture` 预设 |

---

## 9. 来源表

| 主题 | 文章裸 id | 年份 | 关键字面量 |
| --- | --- | --- | --- |
| 反 hook 检测（`toString` 白名单）+ closed shadow DOM + 框架句柄逃逸 | 52pojie-1650555 | 2022 | `attachShadow`、`checkoutNotTrustScript`、`window.OCS`、`native code`、`__vue__.shadowDom` |
| 页面限制解除（禁止复制 / 登录弹窗） | 52pojie-1608506 | 2022 | `user-select`、`hljs.signin`、`execCommand('copy')` |

---

## 未实现项

本文给的是**思路与片段**，尚未做成 `build-hook.js` 预设 ——
如要做成预设，需在 `scripts/hooks/` 新增钩子文件并接进 `build-hook.js`（属于后续工作）。
