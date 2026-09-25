# 页面功能解锁与资源捕获配方集（油猴 / userscript）

一句话：**页面把「能不能用」写在了前端判断里；要做的不是对抗检测，而是让那个判断读到的值变成「有权限」。**

本文是 `references/anti-hook-detection-and-bypass.md` 的**同族扩展** —— 那篇讲「怎么不被页面发现你在 hook」，
本文只讲「**怎么把页面自己施加的限制按下去、把页面自己已经拿到的资源捞出来**」。
需要 hook 检测对抗（`toString` 白名单 / closed shadow / 禁止复制）时回那篇，本文不重复。

> **何时用**：页面弹「升级会员 / 解锁高级功能 / 试用到期」、内容被水印盖住、
> 视频被锁倍速或切屏即暂停、电子书只让看不让导出、
> **内容被「关注公众号 / 回复密码」挡住** —— 而你**能拿到页面 JS 的运行环境**
> （DevTools 控制台 / 油猴 / 本技能注入）。
> 先按 §8 分清「限制在前端」还是「校验在服务端」；本文各配方都是**前端层**手段。
> 与既有预设的分工见 §9。

---

## 1. ★ 控制台断点条件注入法（临时验证）

来源 `52pojie-1598299`（gitbook 会员「定制(customize)」功能）。源文自述这是其自创手法：
「我反正是这么称呼的，似乎这个方法也是我第一个发出来的」。

**定位链条**（源文的走法，可复用到同类 SPA）：

1. 从**界面文案**入手：看到红色的 `Upgrade!` ⇒ `F12` 搜 `Upgrade!`，命中的地方就是判断点；
2. 判断处可见变量 `c` 是关键 ⇒ **向上找 `c` 的赋值 / 最后一次修改的位置**；
3. 顺藤摸瓜找函数定义（源文搜 `Kr` 定义，勾选区分大小写，只有 21 处，找到唯一定义）；
4. 看不懂就**在函数第一行下断点动态调试**：源文观察到调用时第二个参数为 `customization`，
   `s` 变量的值是字符串 `"personal"`，结合控制台打印结果得到 **`d[s]` 是 `false`**（正好对应「没有权限」）。

**★ 做法（源文原样）**：在 DevTools Sources 的目标行加**条件断点**，条件写成：

```
d[s]===false&&(d[s]=true),false
```

**技巧要点：逗号表达式 + 恒假尾项。**

- 逗号表达式**从左到右求值，返回最后一项**；
- 前半段 `d[s]===false&&(d[s]=true)` 负责**执行副作用**（把 `false` 改成 `true`）；
- 最后一项恒为 `false` ⇒ **断点判定永远为假、永不停下**，但**每次执行到这一行都会自动改值**。

**★ 为什么赋值型条件断点「必须」补 `,false`（因果，`52pojie-1485179`）**：
**赋值表达式的返回值就是被赋的值** —— `d.userInfo.isSVip=true` 求值结果一定是 `true`
⇒ 如果你只写赋值、不补尾巴，条件断点**每次执行到这一行都会断下**（要点无数次「继续」）。
源文原话：「所有的赋值都一定是成功的，所以 `d.userInfo.isSVip=true` 的返回值一定是 `true`，
因此每次运行到这里，条件断点都会在这里断下」；补 `,false` 后「**就可以实现利用控制台不断进行自动注入**」。
⇒ 「逗号表达式 + 恒假尾项」里的**恒假尾项不是可选装饰，是这手法成立的前提**。

**③ 条件断点 vs ④ 日志断点**：DevTools 右键行号有 ③「表达式为 `true` 时断下」与 ④「到这里就打印表达式」两档。
**用 ③，不要用 ④** —— ④ 是**每经过必打印**，源文指出「巨大数量的打印日志会增加浏览器的负担导致卡顿」；
③ 只在布尔值为真时才停，成本低得多。

**★ 真机校验（B34 用 browsercli 在真 Chrome 上实跑所得，两条都已坐实）**：

| 断言 | 实测结果 |
| --- | --- |
| `eval("(d.isVip = true), false")` | 返回 **`false`**，且 `d.isVip === true`（副作用生效） |
| `eval("(e.isVip = true)")`（不补尾巴） | 返回 **`true`**（⇒ 条件断点每次都会断下，印证上面的因果） |
| `new Function("var d={}; const c = (d.x = 1), false;")` | 抛 **`SyntaxError`** |

> ⚠️ **最后一行是必须点破的书写边界**：`..., false` 只能出现在**表达式位置**。
> 写成 `const c = (d.x = 1), false;` 会被解析成「`const` 的**第二个声明符**」，`false` 不是合法标识符 ⇒ **直接语法错**。
> DevTools 的条件断点字段**本身就是按表达式求值**的，所以在那里合法；
> 一旦你想把这招搬进脚本（例如 `evaluate_script`）或写进 `let`/`const` 声明，就必须显式用 `eval("…")` 包成表达式 —— 本批首次实跑就踩在这上面。

**判据**：手改一次内存**不够** —— 页面一刷新（或重新初始化）就失效；
条件断点的价值恰恰在于「**每次执行到这一行都自动改**」。

**边界（必须标注）**：这是**临时验证手段**（刷新即失效，源码换行也会失效）。
要正式产物，走 §2 的**原型 / 内置方法重写**。

### 1.1 从「判断点」顺到「真实副作用」：搜赋值函数名 → 搜 `watch`（`52pojie-1485179`）

上面 1598299 的链条走到「找到函数定义」就停了；1485179 的题是**函数定义里只有一行赋值、
真正的副作用在别处**，它给出的顺藤摸瓜三步很通用（尤其 Vue 站）：

1. **从界面文案搜到判断点**（源文搜 `开通VIP可继续复制`，全站只命中一处）—— 与上面链条第 1 步同源；
2. **搜「赋值函数名」**：从事件监听的 `clickCopy()` 里看到 `this.setIsCopyActivated(!0)`，
   直接全局搜 `setIsCopyActivated`。源文判据：**「一般没有人会定义两个同样名称的函数」** ⇒ 搜到就是它：

   ```
   setIsCopyActivated: function(t, e) {
       t.isCopyActivated = e
   },
   ```

3. **赋值函数只有一行赋值 ⇒ 去搜这个字段的 `watch`**：光赋值解释不了「谁在响应这次赋值」，
   源文顺着 `isCopyActivated` 搜到 `watch`，真正的副作用（弹 VIP 卡 + 上报）在这里，
   再往外牵出 `cannotCopy` → `formatedText` → `canCopy(t.length)`：

   ```
   watch: {
       isCopyActivated: function(t) {
           t && this.cannotCopy && (this.showVipGuideCard(), r.a.xsend(101643, { index: 1 }))
       },
       formatedText: function(t) {
           this.canCopy(t.length) ? (Object(o.a)(".".concat(this.copyBtnId)).attr("data-clipboard-text", t),
           this.cannotCopy = !1) : this.cannotCopy = !0
       }
   },
   ```

   ⇒ 一路牵到 `canCopy`：

   ```
   canCopy: function(t) {
       var e = this.getCountFromCookie() < 10;
       return t > 100 && !this.isVip && this.docBizType !== B.a.SECRET && (e = !1),
       this.isVip || e
   },
   ```

   —— **目标字段 `isVip` 就是在这里被读的**（下一步 §1.2 接着处置它）。

**判据**：**「赋值在哪」与「副作用在哪」常常不是一个地方** ——
赋值函数只有一行时，**去搜这个字段名**（`watch` / `computed` / getter）比在赋值函数里死磕快得多。

**已知边界（源文自陈）**：栈里 `this` → `setIsCopyActivated` → `[[TargetFunction]]` → `[[FunctionLocation]]`
这条路**并非总能点过去** —— 源文遇到「他被翻译成 native code 了」
（源文推测「其原因应该是与函数的影响的参数类型有关」）。
⇒ **`[[FunctionLocation]]` 点不动时，替代手段就是上面的「直接搜函数名」**，别卡在调用栈里。

> ★ **源文自评（`52pojie-1485179` 总结）**：「以前大家的代码都比较纯净，直接下个断点，
> 写完控制台转手复制到油猴直接注入就行，现在都是各种框架，各种打包，
> 大部分都是每个函数在自己独立的空间内通过参数传入绑定数据，不是很好写代码，
> **只能下断点-执行代码**」—— 这句就是本节（控制台断点注入法）存在的理由。

**附带用途（源文更新区）**：条件断点也能用来**中和疯狂 `debugger` 反调试**
（源文「就可以直接置空，防止断下」）。这与 `../SKILL.md` 的「注入与生效时机」一节里
「绕过无限 `debugger`」的档 ① 是同一条路。

### 1.2 属性只有 getter：`this.isVip = true` 报错 ⇒ 整体重定义成恒真 getter（`52pojie-1485179`）

顺着 §1.1 走到 `isVip`，源文在断点处控制台输入 `this.isVip=true` —— **报错**，
DevTools 的提示是「**没有分配 setter**」（源文补一句「isVip 定义了但是没有完全定义」）。

**原因**：这是个**只定义了 `get`、没有 `set` 的访问器属性** ⇒ 直接赋值必抛错
（普通数据属性不会有这个问题）。

**★ 正解：不要去找 setter，直接把这个属性整体重定义成「怎么读都返回目标值」的 getter**
（源文三步压缩，从展开写法一路压到一行）：

```js
Object.defineProperty(this,"isVip",{
    get: function() {
        return true
    }
})
```

用 lambda 语法糖压一次：

```js
Object.defineProperty(this,"isVip",{ get:()=>true })
```

> ⚠️ **源文这一段的缩写漏了一个 `)`**：源文写的是 `Object.defineProperty(this,"isVip",{ get:()=>true } })`
> （少一个右括号，**照抄会直接语法错**）。正确形态即上面的单行版。
> ⇒ 抄这类"逐步压缩"的教学片段时，**每一步都过一遍语法**，不要因为"它看着像压缩后的写法"就放过。
再压成一行、接上熟悉的条件断点尾巴（§1）：

```js
Object.defineProperty(this,"isVip",{get:()=>true}),false
```

源文原话：「**刚刚的属性定义，连系统中 native 的属性都可以重定义了，那我构造一个……**」
（指的是 §5.2 反面里平台用 `defineProperty` 重写 `video.playbackRate` 那套 —— 同一条路，反过来用。）

**判据**：控制台赋属性报「**没有分配 setter**」⇒ 别找 setter，**用 `Object.defineProperty` 重定义该属性的 `get`**；
末尾 `,false` 让它同时成为一条合格的条件断点（否则每次经过都断下，见上面的因果）。

**★ 真机校验（B34 用 browsercli 在真 Chrome 上实跑）**：只带 `get` 的访问器属性上，
**非严格模式**赋值是**静默失败**（读回来仍是原值），**严格模式**才抛 `TypeError`
（DevTools 控制台报的就是后者）；**再 `defineProperty` 一次**（哪怕与原来同形）即可让读取恒为 `true`。
⇒ 判据写「报错」时要区分两种语境，别把它当成"赋值一定抛错"。

---

## 2. ★ 原型 / 内置方法重写（从 native 层入手）

同一来源 `52pojie-1598299`。源文的判断点长这样（逐字摘自正文）：

```
let d = DDe.find(f=>f.key === e)
```

`DDe` 是**定义好的权限数组**，业务判断写在 `Array.prototype.find` 之下 ⇒ **重写 `find`**。

**★ 源文代码（逐字）**：

```js
[].constructor.prototype._find=[].constructor.prototype._find||[].constructor.prototype.find;
[].constructor.prototype.find=function(){return(JSON.stringify(this).includes('github-sync')?this.map(a=>{for(const i in a)a[i]===false&&(a[i]=true);return a}):this)._find(arguments[0],arguments[1])};
```

拆解：

- **第一行 = 先备份再重写**：把数组的 `find` 存到 `_find`（源文原话「不然就真没这个功能了」）。
  **不备份就把原生 `find` 永久覆盖掉了** —— 之后所有依赖 `find` 的代码都会走到你的函数上。
  用 `||` 做**幂等写入**：二次注入时不会把 `_find`（备份）也换成自己的版本。
- **第二行 = 用数组内容特征区分调用**：判断数组是否包含 `github-sync`
  （源文原话「理论来说任意一个不会在数组里重复定义的都可以」）——
  **命中**就把数组里所有 `key` 的 `false` 全改成 `true`，再委托原函数；
  **不命中**就直接委托原函数。
- `[].constructor` **与 `Array` 等价**。源文原话：「哦，这不是长显得专业么。。。你要是愿意，直接用 `Array` 也行。。。」

**判据**：**只要判断写在某个原生方法之下，就重写那个原生方法**，并用**入参内容特征**
（这里 `JSON.stringify(this).includes(...)`）把「该管的那次调用」和「别人的调用」分开 ——
命中才改，未命中直接委托，这样副作用面最小。

**坑**：

1. 特征串要选**不会在数组里重复出现**的（源文用 `github-sync` —— 源文原话「理论来说任意一个不会在数组里重复定义的都可以」），
   否则会误伤其它数组调用；
2. 重写要**保留原语义**（`_find(arguments[0], arguments[1])` 把原参数原样转发），
   否则页面别处对 `find` 的调用会一起坏掉；
3. 源文末尾把脚本丢在 greasyfork（`441008`）—— 从「验证」到「可分发」的一步之差就是把它落成油猴脚本。

---

## 3. ★ Vue 路由钩子注入（框架层监听路由）

来源 `52pojie-1625744`（李恒道）。**原理链（源文逐条给出，照这条链走）**：

1. vue-router 在**实例初始化**时建三个数组（源文贴了 `VueRouter` 构造函数）：

```js
this.beforeHooks = [];
this.resolveHooks = [];
this.afterHooks = [];
```

2. `afterEach` 就是往 `afterHooks` 里 push：

```js
VueRouter.prototype.afterEach = function afterEach (fn) {
    return registerHook(this.afterHooks, fn)
};
```

```js
function registerHook (list, fn) {
    list.push(fn);
    return function () {
        var i = list.indexOf(fn);
        if (i > -1) { list.splice(i, 1); }
    }
}
```

⇒ `registerHook` 的实质就是 **`list.push(fn)`**（返回值是一个「取消注册」的闭包）。

3. `$router` 是挂在 **Vue 原型**上的 getter（源文逐字）：

```js
Object.defineProperty(Vue.prototype, '$router', {
    get: function get () { return this._routerRoot._router }
});
```

⇒ **任何 vue 实例都能拿到 router**（它一路向上取根实例的 `_router`）。

4. 而 `#app` 上**通常就有 `__vue__`** ⇒ 目标达成。**★ 源文一行**：

```js
document.querySelector('#app').__vue__.$router.afterHooks.push(()=>{console.log('路由发生改变')})
```

**三种路由模式（源文区分）**：

| 模式 | 地址特征 | 源文例子 |
| --- | --- | --- |
| `history` | **不带 `#`**（历史路由） | `https://www.bilibili.com/video/BV16z4y1o7Mr/?...` |
| `hash` | **带 `#`** | `http://localhost:8082/#/` |
| `abstract` | —— | 源文原话「普通开发还不怎么常用，以后我们再跟大家聊」 |

**★ 判据：监听路由的两条路，先选对层。**

| 路线 | 抓手 | 能拿到什么 |
| --- | --- | --- |
| ① **原生层** | `history` 模式本质用 `history.pushState` 跳转（源文引 MDN `History/pushState`）⇒ **拦 `history.pushState`**；`hash` 模式通过 `addEventListener` 监听 `popstate` / `hashchange` | **只有字符串地址** |
| ② **框架层** | 注入 `afterHooks`（本节） | **`to` / `from` 结构化路由对象** |

源文给的标准写法是后置守卫：

```js
router.afterEach((to, from) => {
  sendToAnalytics(to.fullPath)
})
```

⇒ **要结构化路由信息就注入 `afterHooks`；只要「地址变了」这个信号，原生层更便宜。**

**与既有预设的分工**：本技能 `spa-vue` 预设做的是「读路由表 + 摘除 `beforeEach` / `beforeResolve` 守卫」，
本节做的是「**挂后置钩子做监听**」—— 一个摘、一个挂，互补（见 `../SKILL.md` 的预设能力表）。

**边界**：`#app` 上没有 `__vue__` 时（Vue 3 是 `__vue_app__`），先按 `spa-vue` 的 DOM BFS 方式定位根实例，
再从根实例上取 `$router`。

> ★ **实测补充（本批真机复现时先踩到的坑，源文未写）**：Vue 2 的 `$mount('#app')` 会把**宿主元素替换**成
> 根组件渲染出的元素 —— 因此 `#app` 能不能被 `querySelector` 查到，取决于**根组件自己的根元素带不带那个 `id`**。
> 自建最小复现时若 `render` 出的是 `<div>` 而没带 `id="app"`，`document.querySelector('#app')` 会返回 `null`，
> 表现为「文档里那行明明是对的，却报 `Cannot read properties of null`」。
> ⇒ **判据：`#app` 查不到不是"没有 Vue"，先看根元素的 id 还在不在**；
> 线上站点通常由根组件模板自带 `id="app"` 所以不踩，**自建/复现场景必踩**。
> 拿不到元素时改用等价入口：`el.__vue__.$router === router` 已由真机实测（Vue 2.7.16 + vue-router 3.6.5，
> `router.push('/b')` 后钩子确实被调用，拿到 `to=/b, from=/`）。

---

## 4. ★ 去水印：三条路线与选型

来源 `52pojie-1774430`（涛之雨），目标为「文心一言」背景水印。源文列出三条路并直接给出选型结论：

| # | 路线 | 源文原话与代价 |
| --- | --- | --- |
| ① | **识别对应的标签，删掉** | 「但是只要改一下特征值就直接失效」 |
| ② | **修改水印生成时的代码，劫持掉不让他生成** | 「问题同上」 |
| ③ | **在获取时修改水印内容** | 「**除非改接口，理论上通杀**」 |

**源文选 ③**，理由是**①②都挂在「水印的模样」上**（删标签依赖标签特征、劫持生成依赖生成代码位置），
站点一改特征或换生成路径即失效；而 ③ 挂在**数据流上**，只要水印内容仍经由同一个「获取」环节，
就还能改。源文自嘲「肯定选择最简单的办法：通过MITM实现供应链攻击（不是，其实就是第三个方案。。老劫持了）」——
即**在获取水印文本/图片的那个环节改它的内容**（而不是藏它、也不是拦它生成）。

**现场两条附带经验（源文原文）**：

1. 「顺便还实现了自定义水印，还顺便去了图片的水印」——交付形态是**双击右上角头像**输入框填内容，
   「框里输入的内容即为自定义水印内容」（占位文本前默认添加一个空格）。
2. 「（为了分析顺便还去掉了断点检测=\_=就不能出个新花样检测吗）」——
   断点检测的处置见 `references/anti-hook-detection-and-bypass.md`，本文不展开。

**源文未解（登记，不补解释）**：源文末尾说「尝试使用 css 伪元素 part 去直接隐藏的话好像不好用，
不知道是什么原因」。⇒ 这是**源文未解现象**，照实转述即可，**不要替它编一个原因**。

---

## 5. ★★ 媒体播放解锁：完整套路（网课 / 视频站）

来源 `52pojie-2099142`（Chehil，双平台：学堂在线 `*.xuetangx.com` + 中国大学 MOOC `*.icourse163.org`，
另含 B 站 `*.bilibili.com`）。源文动机是三条「霸王条款」：**切屏/画中画秒暂停、锁死最高 2.0x 倍速、
调进度条疯狂卡死**。这是本文技术密度最高的一节，逐条落地。

脚本头（源文原文）关键两行：

```js
// @grant        none
// @run-at       document-start
```

### 5.1 切屏 / 失焦秒暂停：从源头屏蔽失焦检测

**错误做法（源文实测）**：拦截底层 `HTMLVideoElement.prototype.pause` 或 jQuery 的 `trigger('pause')` ——
「会导致播放器内部状态机错乱，引发网络请求节流相关的假死报错（`stalled` / `error.loader`）」。

**★ 正确做法：在 `@run-at document-start` 阶段屏蔽页面「感知失焦」的能力**（源文完整代码）：

```js
const blockEvents = ['visibilitychange', 'webkitvisibilitychange', 'blur', 'focusout', 'pagehide', 'mouseleave'];
const origAddEventListener = EventTarget.prototype.addEventListener;

EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (blockEvents.includes(type) && (this === document || this === window)) {
        return;
    }
    return origAddEventListener.apply(this, arguments);
};

const killSetter = (obj, prop) => {
    try {
        Object.defineProperty(obj, prop, { get: () => null, set: () => {}, configurable: true });
    } catch (e) {}
};

killSetter(window, 'onblur');
killSetter(window, 'onpagehide');
killSetter(window, 'onfocusout');
killSetter(window, 'onmouseleave');
killSetter(document, 'onvisibilitychange');

Object.defineProperties(document, {
    'hidden': { get: () => false, configurable: true },
    'visibilityState': { get: () => 'visible', configurable: true },
    'webkitHidden': { get: () => false, configurable: true },
});
Document.prototype.hasFocus = () => true;
```

**要点**：

- 拦截 `addEventListener` 时**只丢 `this === document || this === window` 这两个目标上的注册**，
  **别把全局 `addEventListener` 打死**（源文条件就是这么写的）；
- 老式 `onxxx` 属性用 `killSetter` 安置空 setter（`get: () => null, set: () => {}`）；
- 现代只读属性（`hidden` / `visibilityState` / `webkitHidden`）用 `Object.defineProperties` 顶掉；
- 最后补 `Document.prototype.hasFocus = () => true`。

**时机判据**：这一整套**必须在页面代码之前跑**（`@run-at document-start`）——
注入晚了，页面已经拿到真实的可见性状态。见 `../SKILL.md`「注入与生效时机」§3。

### 5.2 倍速被轮询重置：劫持 `setter`，用锁定开关丢弃平台写入

**现象（源文）**：平台前端存在**定时器**，不断轮询底层 `playbackRate`，
「若与 UI 菜单的值不符则**强制重置**」。

**★ 做法：先取原生描述符，再包一层 setter**（源文代码）：

```js
const origPlaybackRate = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
const origVolume = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');

let isLocked = false;
let mySpeed = 1.0;
let myVolume = 1.0;

if (origPlaybackRate && origPlaybackRate.set) {
    Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
        get: function() { return origPlaybackRate.get.call(this); },
        set: function(val) { origPlaybackRate.set.call(this, isLocked ? mySpeed : val); }
    });
}

if (origVolume && origVolume.set) {
    Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
        get: function() { return origVolume.get.call(this); },
        set: function(val) { origVolume.set.call(this, isLocked ? myVolume : val); }
    });
}
```

**判据（源文口径）**：设置一个「**锁定**」状态（`isLocked`）——**自己设定**时置位、
**丢弃平台发出的重置指令**（写进去的永远是自己记的 `mySpeed` / `myVolume`）。
`volume` 同理。**取原描述符**（`Object.getOwnPropertyDescriptor`）是前提：
不先拿到原始 `set`，就没法在「需要放行」时把值真正写下去。

**历史做法（已过时，仅留作判据，`52pojie-1485179`）**：某盘早期是 `setTimeout` **每隔 500ms**
调一次自己、把 `playbackRate` 改回设定值（非 VIP 写死 `1`，VIP 是 X）。当时的「解锁」是两条野路子 ——
① 用**更快的定时器**抢着重置（源文评价：「两个定时，一个比一个快……浏览器吃得消么？」）；
② 一条循环清掉**所有**延时定时器：

```
for(let k=0;k<99999;clearTimeout(k++));
```

（源文原话「确实还真的有奇效」）。
⇒ 两条都是**和平台对赌频率**；平台一改算法（换成下面这条 `defineProperty` 形态）就全部失效。
**现在的正解是上面的「取原描述符 + 锁定开关」。**

#### 反面：平台**先**用 `defineProperty` 劫持了宿主属性（`52pojie-1485179`）

**现象（源文）**：某盘**非 SVIP** 时，给 `video` 读速率得到「一堆看不懂的东西」，
**赋值则完全没效果**。

**根因（源文全页面搜 `playbackRate`、逐个 JS 排查后定位）**：站点在
「**非 SVIP + 有视频播放器 + 没有剩余试用次数**」时，对 `video.playbackRate` 做了一次
`Object.defineProperty` 重写：**`get` 里读自己**（⇒ 读取时不断递归，表现为爆栈 / 无意义值），
**`set` 是空行为**（⇒ 你写进去的速率被直接吞掉）。源文原话：
「读取速率时返回自己的速率，然后自己又会去读取自己，造成炸堆栈效果？而设置速率就改成空行为」。

⚠️ **这正是上面做法的「反面」**：上面讲的是**我们**劫持 setter 去丢弃平台的写入；
这条讲的是**平台先劫持了 setter**，于是**我们的赋值根本到不了原生属性** ——
「改了倍速没反应」的真凶常常是这一条，不是你改错了。

**判据与处置**：

- `Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate')` 的 `get` / `set`
  若不是 `[native code]`，说明**已经被重写过**；
- 定位手法可复用：**直接全页面搜属性名 `playbackRate`**（源文就是这么找到的），比翻调用栈快；
- 处置与上面同源：**先取平台当前的描述符、再包一层**（拿它的 `get` / `set` 当底座），绕开它的空 setter。

**★ 真机校验（B34，browsercli 真 Chrome）**：源文的两个症状都成立 ——
① `get(){return this.x} + set(){}` 的访问器上赋值 **被静默吞掉**（读回来仍是旧值）；
② `get(){return this.x}` **读一下就抛 `RangeError`**（自读递归 ⇒ 爆栈）。
两条合起来正是「读速率看不懂、写速率没反应」。用 `defineProperty` 抢回访问器后写入立刻生效。

**附带（`52pojie-1485179`）**：某盘的 `video` 标签被 `shadowRoot`（closed）封装，
`document.querySelector('video')` 拿不到 —— 但源文实测「**通过其他方式我们还是可以通过代码获取到这个标签的**，
控制倍速什么的也都是正常的」。shadow DOM 的取证与 `attachShadow` 改写见
`references/anti-hook-detection-and-bypass.md`。

### 5.3 ★★ `currentTime` 直改 ⇒ `DOMException: aborted`（本节核心坑）

**现象（源文）**：最初用 `video.currentTime += 5` 绑快捷键 ——
「由于平台使用的是 **MSE (Media Source Extensions) 架构的播放器**，直接修改时间会**绕过其内部的缓冲管理器**，
导致状态机崩溃并抛出 `DOMException: aborted`」。
雪上加霜：「由于 **Webpack 的作用域隔离**，外部脚本**无法直接调用其内部封装的 jQuery API** 发送合规指令」。

**★ 解法：放弃 API 调用，改为「按进度条 DOM 物理尺寸算坐标 + 派发原生 `MouseEvent`」**，
让播放器**自己的缓冲逻辑**跑起来。源文代码：

```js
const progressBar = document.querySelector('.xt_video_player_progress') || // 学堂在线
                     document.querySelector('.progresswrap'); // 中国大学MOOC
if (progressBar) {
    const rect = progressBar.getBoundingClientRect();
    if (rect.width > 0) {
        const percentage = seekTargetTime / video.duration;
        const targetX = rect.left + (rect.width * percentage);
        const targetY = rect.top + (rect.height / 2);

        const dispatchMouse = (type) => {
            progressBar.dispatchEvent(new MouseEvent(type, {
                bubbles: true, cancelable: true, view: window,
                clientX: targetX, clientY: targetY
            }));
        };

        dispatchMouse('mousedown');
        dispatchMouse('mouseup');
        dispatchMouse('click');
    } else {
        video.currentTime = seekTargetTime;
    }
} else {
    video.currentTime = seekTargetTime;
}
```

**选择器（原样抄源文，是当时的类名，站点改版可能失效）**：

| 平台 | 进度条选择器 |
| --- | --- |
| 学堂在线 | `.xt_video_player_progress` |
| 中国大学 MOOC | `.progresswrap` |

> 保底分支：`getBoundingClientRect` 拿不到宽度、或找不到进度条时，退回直接写 `video.currentTime`
> （即**明知有崩风险也要保底**——这是源文的取舍，抄配方时一并带上）。

### 5.4 事件链路要派全（平台监听的可能不是 `click`）

**判据（源文）**：中国大学 MOOC 的进度条拖拽逻辑**监听的是 `mousedown` 而非 `click`**。
⇒ 所以「依次触发 `mousedown` -> `mouseup` -> `click`，以兼容不同平台的监听方式」。
只派 `click` 会在该类平台上**静默无效**。

### 5.5 ★ 400ms 防抖：连按只算一次

**现象（源文）**：「如果用户高频连续按键快进，会瞬间产生大量网络请求，再次导致 MSE 底层崩溃。」

**★ 解法**：引入 **400ms 防抖** —— 「连续按键期间**只更新 OSD 视觉提示**，
停止按键 400ms 后才执行**唯一一次**坐标点击运算」。源文机制：

```js
clearTimeout(seekTimer);
seekTimer = setTimeout(() => {
    /* 唯一一次坐标点击运算（§5.3） */
    seekTargetTime = null;
}, 400);
```

配套：连按时 `seekTargetTime` 在现有目标上累加
（`seekTargetTime = Math.max(0.1, Math.min(seekTargetTime + delta, video.duration - 0.1))`，
`delta = e.code === 'KeyD' ? 5 : -5`），OSD 立刻显示目标时间，**真正 seek 交给防抖尾巴**。

### 5.6 快捷键：焦点判断 + `preventDefault` + `stopImmediatePropagation`

**先判焦点**（否则做笔记时按键全被吃，源文代码）：

```js
const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
if (['input', 'textarea'].includes(activeTag) || document.activeElement.isContentEditable) return;
```

**再拦事件**：用 **`e.code`（不是 `e.key`）** 判别，命中键位列表就同时：

```js
e.preventDefault();
e.stopImmediatePropagation();
```

（`e.stopImmediatePropagation()` 会**阻止同一事件上的后续监听器**继续响应；源文在
`document.addEventListener('keydown', function(e){...}, true)` **捕获阶段**注册。）

源文键位表（`hotkeys = ['Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyX', 'KeyC', 'KeyZ']`）：

| 键（`e.code`） | 功能 |
| --- | --- |
| `W` / `S` | 音量 + / −（`myVolume = Math.min(video.volume + 0.1, 1)` / `Math.max(video.volume - 0.1, 0)`） |
| `A` / `D` | 后退 / 快进 **5 秒**（带 400ms 防抖） |
| `C` / `X` | 加速 / 减速（`Math.min(video.playbackRate + 0.25, 4.0)` / `Math.max(video.playbackRate - 0.25, 0.25)`）——**可突破 2.0x** |
| `Z` | 恢复 **1.0x** 并**解除底层锁定**（`isLocked = false`） |
| `Space` | 原生播放 / 暂停（`video.play()` / `video.pause()`） |

⚠️ **音量 / 倍速按键里都要 `isLocked = true`**（自设为「锁定态」，见 §5.2）；
**`Z` 是唯一的解锁出口**。两者必须成对，否则平台轮询会把值改回去或你的锁定再也解不开。

### 5.7 边界（源文自述，抄配方时必须连这条一起说）

> 「初次观看某些**有服务端强制校验**的课程时，建议谨慎使用过高倍速或拖拽功能，以免**进度无效**。复习时可正常使用。」

⇒ 本节所有手段都是**前端解锁**；**服务端强制校验会让进度无效**。这条与 §8 的收束判据是同一件事。

---

## 6. ★★ 资源捕获型油猴脚本（图片 / PDF）

来源 `52pojie-2051222`（Cristy，flbook 导出 PDF）。核心是**两个技术版本**，选错版本就抓不到东西。

### 6.1 先选版本：F12 网络面板看图片 URL

**★ 判据（源文给的判定步骤，照做）**：

1. `F12` 打开开发者工具，切到 **Network（网络）**；
2. **刷新电子书页面**，并随意翻几页；
3. 看图片请求的 URL 形态：

| 现象 | 结论 |
| --- | --- |
| 出现**完整、`https` 开头**的图片请求，URL 有规律（如**含一长串数字**） | 用 **URL 截取版** |
| **找不到清晰的图片 URL**，或只看到 **`blob:https://`** 开头的请求 | 图片数据是**动态处理后才显示的** ⇒ **必须用图片捕获版** |

### 6.2 URL 截取版：三通道网络监控 + 数字文件名

- **三通道同时监控** `Fetch` + `XHR` + `Performance API`
  （源文原话「确保不遗漏任何一种网络请求方式加载的图片」；
  `PerformanceObserver` 作为补充，捕获「一些通过 `<img>` 标签直接加载的资源」）。

```js
function startRequestMonitoring() {
    // 劫持 window.fetch
    const originalFetch = window.fetch;
    window.fetch = async function(...args) { /* ... */ };

    // 劫持 XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) { /* ... */ };

    // 启动 PerformanceObserver
    startPerformanceObserver();

    return () => { /* ... 恢复原始函数 ... */ };
}
```

- **智能 URL 命名**（源文 `getNumericFilename`，逐字）：

```js
function getNumericFilename(url, contentType = 'image/jpeg') {
    // 查找所有长度超过5的数字序列
    const numberMatches = url.match(/\d{5,}/g);

    // 从contentType获取真实的文件后缀
    const extension = (contentType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');

    if (numberMatches && numberMatches.length > 0) {
        // 用连字符连接找到的数字，并附上后缀
        return `${numberMatches.join('-')}.${extension}`;
    }

    // --- 备用方案 ---
    // ...
}
```

  ⇒ 用 `\d{5,}` 提**≥5 位连续数字**当文件名，`join('-')` 连接；后缀从 `contentType.split('/')[1]`
  取、`jpeg → jpg`；提不到长数字时用「URL 的最后一部分或时间戳」做备用名。
- **URL 匹配模式可持久化**：用户自定义规则（源文例 `https://*.flbook.com.cn/*`）会自动保存，无需每次重设。

### 6.3 图片捕获版：`MutationObserver` + 生产者-消费者队列

- **DOM 监控**：`MutationObserver` 盯 `document.body` 的 `childList`（`subtree: true`），
  **命中 `div.pdfimg.move.rendered` 才入队**（源文代码）：

```js
const observerCallback = (mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') { // 监视新添加的节点
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.matches('div.pdfimg.move.rendered')) {
                    discoverAndQueueImage(node);
                }
            });
        }
    }
};

domObserver = new MutationObserver(observerCallback);
domObserver.observe(document.body, { childList: true, subtree: true });
```

- **★ 下载队列（生产者-消费者）**：源文三个状态量 ——
  `fetchQueue`（待办队列）、`processingUrls`（`new Set()`，**防重复处理**）、
  `isWorkerRunning`（**单飞标志**，一次只下一个）；下载完用 `setTimeout(processFetchQueue, 50)` 续跑：

```js
let fetchQueue = [];             // 待办队列
let processingUrls = new Set();  // 防止重复处理
let isWorkerRunning = false;     // 工作状态

async function processFetchQueue() {
    if (isWorkerRunning || fetchQueue.length === 0) return;

    isWorkerRunning = true;
    const item = fetchQueue.shift(); // 从队列头部取出一个任务
    statusDiv.textContent = `队列剩余: ${fetchQueue.length + 1} | 正在加载...`;

    try {
        // ...使用fetch下载图片...
        const blob = await response.blob();
        addCapturedItem({ /* ... 图片数据 ... */ });
    } catch (error) { /* ... 错误处理 ... */ }
    finally {
        isWorkerRunning = false;
        setTimeout(processFetchQueue, 50); // 处理下一个
    }
}
```

- **初始先扫一遍**：源文原话「脚本启动时，会首先扫描一次页面，将已经存在的图片直接加入捕获队列，不会错过任何内容」。
- **★ 页码顺序从元素 `data-page` 属性取**：源文原话「直接从图片所在的页面元素（`div`）的 `data-page` 属性中获取页码，
  并以此为依据进行默认排序，**确保图片顺序 100% 正确**」。（比按 URL 里的数字排序可靠 —— 数字可能只是资源 ID。）

### 6.4 两条工程纪律 + 已知边界（源文自述）

- **必须完整翻页**：「对于需要手动翻页才能加载新内容的网站，您必须完整翻阅一遍，
  否则脚本无法捕获到未加载的图片」。懒加载页面不翻就抓不全。
- **下载队列化**：「避免了因瞬间发起大量下载请求而导致浏览器卡顿或崩溃的问题」——并发大批量会把浏览器卡死。

已知边界（源文更新区，照实带上）：

- **不覆盖「前端组装型」电子书**：源文 2025-08-06 更新说明「该文章为获取图片资源后由前端组装成的电子书，
  这一类不在这个脚本的覆盖范围（脚本仅做了整页为图片的获取和拼接工作）」；
- **排序可能不适用**：2025-08-07 更新「有的书的图片名称不为排序标准。解决方法：手动调整顺序后再导出 PDF」；
  源文的排序逻辑是「截取 jpg 前面的数字，从左到右依次比数字，相同过、不同比大小停止」；
- **PDF 空白**：「两页合并」模式下书籍最后一页是单数时可能多出空白页（源文标注待优化）；
- **页面刷新**：某些网站上脚本启动后书籍内容加载不出来（一直转圈），「通常按 `F5` 多次刷新页面可以解决」；
- **跨域**：脚本**已内置方案尝试解决跨域（CORS）限制**，「能显著提高成功率，但不能保证 100% 成功」。

### 6.5 打印导出型：`window.print()` 当「网页长文 → PDF」的通用通道（`52pojie-1923373`）

**判据**：页面把「全文」藏在**前端门控**后面（关注后可见 / 未登录折叠），
而你要的是**一份能带走的文档**（PDF / 纸质件）⇒ **不必扣接口**：删掉遮罩 + 用它自带的打印。

**三步配方（源文原样）**：

| # | 动作 | 源文选择器 |
| --- | --- | --- |
| ① | **解除正文折叠**（折叠就是内联 `style` 上的 `max-height`） | `document.getElementById('article_content').removeAttribute('style')` |
| ② | **删遮罩与关注引导** | `.hide-article-box`（「关注后可阅读全文」浮层）；`document.querySelector('.follow-text').closest('[data-flag="follow"]')` |
| ③ | **展开被折叠的代码块 / 侧栏**（模拟点击），再 `window.print()` | `.hide-preCode-bt`、`.sidecolumn-hide` |

**★ 判据：「前端折叠」与「服务端截断」是两件事**。
先看**源码里有没有全文** —— 有 ⇒ 本节三步即可；没有 ⇒ 回 §7/§8 走接口，不要在这里使劲。

**★ 打印瞬间隐藏自己的 UI（源文技巧，很实用）**：

```js
window.matchMedia('print').addListener(mql => {
  buttons.forEach(b => { b.style.display = mql.matches ? 'none' : ''; });
});
```

⇒ **`matchMedia('print')` 是「进入 / 退出打印态」那一刻的钩子**（比 `@media print` 更可控：
不用改站点 CSS，只在自己的元素上动手）。与
`../../stream-drm-reverse/references/online-document-unlock.md` §9.9 的「删 `@media print`」是**反向**的两件事：
那边是**去掉站点加的限制**，这边是**给自己的按钮加限制**。

**⚠️ 源文缺陷登记（「AI 优化版」引入的真 bug，不要照抄）**：

源文后附的优化版把动作表写成

```js
{ name: '保存', action: window.print }   // ❌ 未绑定 this
```

`window.print` 被**当值传递**后调用，`this` 不再是 `window` ⇒ Chrome 里抛
**`TypeError: Illegal invocation`**（与 `video.play()` / `document.write` 一类同型）。

> ⇒ **可迁移判据**：宿主方法**当值传递**（丢进数组、当回调）时必须包一层
> `() => window.print()` 或 `window.print.bind(window)`。
> **「能读到这个方法名」≠「能这么调用它」** —— 这类错误**不报错在写的时候，只在点下去的时候**。

**边界**：本法**只解决「展示 / 复制限制」**；打印拿到的通常是**渲染后的页面**（等同长截图），
**不是原始 PDF** —— 要原始件仍要走接口链路。

---

## 7. ★ 内容门控（关注 / 密码 / 关注回复）的三条通路

来源 `52pojie-1503959`（关注公众号后解锁下载）、`52pojie-1799911`、`52pojie-1801614`
（同型「公众号引流：关注后回复密码拿下载链接」）。
共同形态：页面把内容 / 下载链接藏起来，要求你**关注公众号**或**输入密码**。

**先分清哪一层在做判定**（与 §8 对齐）：这三例的门控判定**都在服务端** ——
`52pojie-1503959` 的 `followedCheck` 响应体里 `pass` 字段决定是否放行；
`52pojie-1799911` 的 `shortcodeapi` **返回值等于 `1`** 才显示隐藏的下载链接，否则弹「密码错误」。
⇒ 下面三条通路的实质都是**取得「服务端已经认可的输入」**（未过期的 ticket / 正确的密码 / 接口返回值），
**不是破解服务端校验**。

### 7.1 通路 1 · 把重复轮询的状态查询接口搬到本地（`52pojie-1503959`）

**现象**：抓包看到 `followedCheck` → `showqrcode` → **一大堆重复的 `getFollowState`**
（源文判断「看这架势，就是要知道你关注为止」）。`getFollowState` 每次只返回一个状态。

**做法**：用 **ReRes**（请求重定向扩展）把这个轮询请求**移到本地**，
用一个本地后端恒定返回「已通过」：

```python
import flask
app = flask.Flask(__name__)
@app.route('/gongzhong/follow/getFollowState')
def fixCheck(path='/'):
  return '{followState: 0}', 200
app.run(port=80)
```

⚠️ **源文原样如此**：返回体写的是 `'{followState: 0}'` —— **这不是合法 JSON**（key 没有引号）。
本文照实标注这是源文原样写法；复现时请按目标站点**真实的响应结构**返回，
**不要照抄这个字符串去 `json.loads`**（会抛错）。

**判据**：**重复轮询型门控**（页面每隔一会儿问一次「状态变了吗」）最省力的处置不是改前端判断，
而是**把这个「状态查询」的返回值钉死**在最底层 —— 前端拿到什么就渲染什么。

### 7.2 通路 2 · 重写校验函数（`52pojie-1503959`）

**定位**：从按钮的单击监听入手，事件处理是一个**闭包**，里面调用 `followCheck`，
参数是一个回调函数（主体是一段 jQuery Ajax）。看 `followCheck` 本体：
「就是一大串的校验，如果通过，就执行 callback，不行就弹出二维码」。

**★ 做法（源文逐字）**：

```
_followCheck = followCheck;
function followCheck(callback){
  callback();
}
```

**口诀：先存原引用，再同名顶掉。** 两行的顺序是关键，且有一个**函数提升陷阱**必须点破：

- 第一行 `_followCheck = followCheck` 把**原函数**存进变量，留作逃生口；
- 第二行 `function followCheck(...)` 是**函数声明**，会被**提升**到作用域顶部 ——
  于是「先赋值再声明」这个书写顺序**在运行时并不成立**：声明早已生效，
  第一行存下来的到底是原函数还是你自己的新函数，**取决于原 `followCheck` 定义在哪个作用域**。
  ⇒ 稳妥做法是**在控制台分两步执行**（先 `_followCheck = followCheck;` 回车，再粘贴新函数），
  或先确认原 `followCheck` 与你的声明不在同一作用域。源文是连续贴出的，照抄时要知道这个坑。
- 效果：`callback()` 直接放行 ⇒ 闭包内**整串校验被短路**，不再弹二维码。

**判据**：校验逻辑被包在一个**只调回调、不返回值**的函数里时，**整串顶掉这个函数**比逐条改判断便宜得多。

### 7.3 通路 3 · 找到最终下发接口，直接调用

**(a) 从按钮监听的 Ajax 拿下发接口（`52pojie-1503959`）**：
在按钮的事件监听处直接看到 Ajax 的请求参数，把它搬进爬虫 —— 接口形如
`?url=&toFormat=`，成功后返回 `identification` 字段，拼上站点前缀就是下载地址
（源文脚本逻辑：非 `error` 时输出 `URL_ROT + r.json()['identification']`，`URL_ROT` 为源文原样拼写）。

**(b) F12 全局搜界面文案，反查校验代码，再顺到下发接口（`52pojie-1801614`）**：
F12 里全局搜**界面文案** `验证失败，请重试！` 命中校验分支 → 往下读到
（`file.length > 10` 时调用 `getlink(file)`，否则 `setTimeout` 1 秒后重跑 `down()`）→
找到那一段真正的「取下载地址」接口 → **复制该接口到控制台直接执行**，拿到下载链接。

**(c) ★ 判据：看着像 token 的参数，可能是 base64（`52pojie-1799911`）**

源文的**核心教训**。提交参数里有个值**末尾带两个 `=`**，作者当时「觉得这个参数最后面有两个 `=` 很眼熟」，
却因「传一个 token 或者是加密的参数实在是太常见了」而**没有认真看**，转头去硬啃页面代码；
最后发现页面里的解码函数是：

```
function b64DecodeUnicode(a) {
    return decodeURIComponent(atob(a).split("").map(function(b) {
        return "%" + ("00" + b.charCodeAt(0).toString(16)).slice(-2)
    }).join(""))
}
```

`atob` + `decodeURIComponent` ⇒ 那个「token」**本来就是 base64**，直接解码就是结果。
源文自陈：「**错过了能快速解决问题的捷径**」。

⇒ **判据**：**参数以 `=`（或 `==`）结尾 + 参数名看着像 token / 加密串 ⇒ 先 `atob` 解一次看内容**，
再决定要不要啃代码。`b64DecodeUnicode`（`atob` → 逐字符拼 `%XX` → `decodeURIComponent`）
是这个族的固定写法，见到直接套。

**(d) 低成本站点指纹（`52pojie-1503959`，一行判据）**：
源文自陈「这个网站反爬真的不行，**连 ua 都没验证**，最开始测试时忘记伪装 ua，后来还成功了」。
⇒ **首条请求就能顺跑通时，先怀疑该站连 UA 都没校验**，不要一上来就补全套指纹。

**边界（与 §8 对齐，不重复）**：三条通路都建立在「服务端已经给出认可结果」之上 ——
通路 1 钉死的 `getFollowState` 状态、通路 3 调用的下发接口返回值，都是**服务端承认的状态**；
`shortcodeapi` 返回 `1` 才算密码正确，前端只是把隐藏链接显示出来。
⇒ 拿不到服务端认可的输入（正确密码 / 未过期 ticket）时，本节三条通路**都不成立** ——
这正是 §8 收束判据的同一件事：**前端解锁只在服务端不复核时有效**。

---

## 8. 边界与口诀：页面级解锁打不过服务端校验

**源文金句（`52pojie-1598299`）**：

> 「几乎没有什么是油猴做不到的。。。如果有，那就是服务器功能了。」

把它和另外三处证据收束成**一条判据**：

| 来源 | 原话 / 现象 | 含义 |
| --- | --- | --- |
| `52pojie-2099142` | 「有服务端强制校验的课程，过高倍速/拖拽可能**进度无效**」 | 前端改了，服务端不复核才算数 |
| `52pojie-1774430` | 去水印第 ③ 条「**除非改接口**，理论上通杀」 | 最终限制点在接口/服务端 |
| `52pojie-1940437` | 改**本地已安装扩展**文件（不碰服务器） | 只在该扩展把权限判断放在前端时有效（见 `../../desktop-client-reverse/references/extension-and-nwjs.md` §1.7） |

**★ 收束判据**：动手前**先分清「限制在前端」还是「校验在服务端」**——
前端解锁**只在服务端不复核时有效**。看到「进度无效 / 刷新后权限又没了 / 请求被服务端拒绝」
这类反馈，就别继续在前端加劲，那是服务端的题。

---

## 9. 与既有预设 / 文档的分工表

| 场景 | 去处 |
| --- | --- |
| hook 被 `Function.prototype.toString` 白名单发现 / closed shadow root / 禁止复制弹登录 | `references/anti-hook-detection-and-bypass.md` |
| 读 Vue 路由表、摘除 `beforeEach`/`beforeResolve` 守卫 | `../SKILL.md` 的 `spa-vue` 预设 |
| **挂后置钩子监听路由（拿 `to`/`from`）** | **本文 §3** |
| Vuex/Pinia 状态固化、组件注册表替换 | `../SKILL.md` 的两条范式（B28） |
| 无直链视频落盘（`src` 是 `blob:`、只有分片） | `../SKILL.md` 的 `mse-capture` 预设 |
| **视频交互解锁（倍速 / 失焦 / 进度）——不落盘** | **本文 §5** |
| **图片/PDF 资源捕获（含 `blob:` 图片）** | **本文 §6** |
| **网页长文 → PDF 导出（删 DOM 遮罩 + `window.print()` + `matchMedia('print')`）** | **本文 §6.5** |
| **改本地已安装扩展 JS（不重打包）** | `../../desktop-client-reverse/references/extension-and-nwjs.md` §1.7 |
| **内容门控（关注 / 密码 / 关注回复）的三条通路** | **本文 §7** |
| 判断「前端限制 vs 服务端校验」 | **本文 §8** |

---

## 10. 来源表

| 主题 | 文章裸 id | 年份 | 关键面量 |
| --- | --- | --- | --- |
| 控制台条件断点注入 + `Array.prototype.find` 重写 | 52pojie-1598299 | 2022 | `d[s]===false&&(d[s]=true),false`、`DDe.find`、`github-sync`、`[].constructor.prototype._find` |
| 条件断点注入的因果 + Vue 数据定位 + 只读 getter 重定义 + 平台劫持宿主属性 | 52pojie-1485179 | 2021 | `d.userInfo.isSVip=true`、`setIsCopyActivated`、`isCopyActivated`、`watch`、`cannotCopy`、`canCopy(t.length)`、`Object.defineProperty(this,"isVip",{get:()=>true}),false`、`for(let k=0;k<99999;clearTimeout(k++));`、`video.playbackRate` 的 get 读自己 / set 空行为、`[[FunctionLocation]]` 变 native |
| Vue 路由钩子注入 | 52pojie-1625744 | 2022 | `afterHooks`、`registerHook`、`this._routerRoot._router`、`__vue__.$router` |
| 去水印三路线选型 | 52pojie-1774430 | 2023 | 「除非改接口，理论上通杀」、自定义水印、`::part` 未解 |
| 内容门控三通路（关注 / 密码 / 关注回复） | 52pojie-1503959 | 2021 | `followedCheck`、`showqrcode`、`getFollowState`、`_followCheck = followCheck`、`{followState: 0}`（源文原样，非合法 JSON）、`identification` |
| 同上（F12 搜文案 + 控制台直接调下发接口） | 52pojie-1801614 | 2023 | `验证失败，请重试！`、`getlink(file)`、`file.length > 10` |
| 同上（★ 看着像 token 的参数其实是 base64） | 52pojie-1799911 | 2023 | `shortcodeapi`、`wxpass`/`wxshowyz`、末尾两个 `=`、`b64DecodeUnicode` |
| 媒体播放解锁（失焦/倍速/进度） | 52pojie-2099142 | 2026 | `blockEvents`、`killSetter`、`Document.prototype.hasFocus`、`DOMException: aborted`、`.xt_video_player_progress`、`.progresswrap`、`mousedown -> mouseup -> click`、400ms 防抖、`KeyA`–`KeyZ` |
| 图片/PDF 资源捕获 | 52pojie-2051222 | 2025 | `getNumericFilename`、`\d{5,}`、`startRequestMonitoring`、`div.pdfimg.move.rendered`、`fetchQueue`、`processingUrls`、`isWorkerRunning`、`data-page`、`blob:https://` |
| ★ 网页长文「打印成 PDF」+ DOM 门控绕过 + 打印态钩子 | 52pojie-1923373 | 2024 | `article_content`、`.hide-article-box`、`.follow-text`、`[data-flag="follow"]`、`.hide-preCode-bt`、`.sidecolumn-hide`、`window.matchMedia('print')`、`window.print`（**未绑定 `this` ⇒ `Illegal invocation`**，源文缺陷） |
| ★ 无直链视频：把抓取层从 URL 层下移到 MSE 层 | 52pojie-2077700 | 2026 | `captureFromStart`、`h5vodLastPostion`、`video.currentTime = 0`、`playbackRate = 10`、`iframe[sandbox]` 剥离、`streamSaver`、`addSourceBuffer.toString`（详见 `../../stream-drm-reverse/references/player-and-live-capture.md` §2.5） |
