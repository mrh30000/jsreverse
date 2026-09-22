# 反调试与自动化指纹：完整分类与绕过决策

> `07-antidebug-and-live-patching.md` 讲的是**无限 debugger 的处置与响应改写**（mitmproxy 闭环）。
> 本文补它没覆盖的三块：
> ① 反调试的**完整分类**（不止 debugger）② **不受 hook 影响的检测点**（原生 API 的取回）
> ③ **自动化框架自身**留下的指纹（这一块最容易被忽略，因为它不在目标 JS 里）。
>
> 两份文件按需读：处置 `debugger` 走 `07-*`；本文用于"找不到是哪一层在拦我"以及"补了环境还是被抓"。

---

## 1. 反调试分类总表（先定位是哪一类）

| 类 | 典型实现 | 判据 | 处置 |
| --- | --- | --- | --- |
| **1. 裸 `debugger`** | 函数体里直接一句 `debugger` | 断住时看调用栈最上层 | 右键"一律不在此处暂停"；或响应改写注释调用点（`07-*` §2） |
| **2. 定时器循环** | `setInterval(()=>{debugger}, 500)` | 断点反复触发、间隔固定 | hook `setInterval`；**必须在定时器首次执行前 hook** |
| **3. `eval` 内** | `eval("debugg"+"er")`（字符串拼接躲搜索） | 搜 `debugger` 搜不到但仍在断 | 搜 `eval`；hook `eval` 并替换其中的 `debugger` |
| **4. 构造函数** | `(function(){}["constructor"]("debugger"))()` ≡ `Function("debugger")()` | 堆栈里出现匿名函数 + `constructor` | 重写 `Function.prototype.constructor`（§2） |
| **5. 窗口尺寸** | `window.outerHeight - window.innerHeight > 400` ⇒ 判定 DevTools 打开 | 断在 `window.close` / `resize` 回调 | 用 `Object.defineProperty` 固定 `innerHeight/innerWidth/outerHeight/outerWidth` 为标准分辨率（如 1366×660、1400×760） |
| **6. console 探测与 table 耗时差** | 靠 `console.log` 对象求值或 `console.table` 渲染大量对象产生的同步卡顿（50~200ms）测出 DevTools | 断在 `console.clear` / `console.table` 附近 | `console.clear = ()=>{}; console.table = ()=>{}`，并通过 Proxy 保护 `console.log/trace` 只读（见 §3.2） |
| **7. 跳转/关闭/清 DOM** | `window.open()`、`location.href=`、`history.back()`、`body.innerHTML=''`、注入 `blur(20px)` 样式 | 打开 DevTools 后页面被刷新/变空/模糊 | 阻断 `window.close` / `history.go/back`；通过 `window.onbeforeunload` 埋断点抓重定向源头（见 §4） |
| **8. 内存/CPU 压制（内存炸弹）** | 循环构造 `1000×1000` 对象、`setInterval` 里 `new Array(1e4).fill('x')` | 页面卡死、内存飙升 | 只拦该定时器（按调用栈白名单），**不要全局禁 `setInterval`** |
| **9. 原生方法完整性校验** | `/[native code]/.test(fn.toString())` | 一旦你 hook 过某个 API 就会被判为篡改 | 见 §2（**这是 hook 方案最大的敌人**） |
| **10. 焦点/可见性伪造检测** | 抢前台后仍报 `hasFocus()===true && visibilityState==='visible'` | 见 §5 | 关掉自动化框架的焦点仿真 |

**定位顺序**：先判断是哪一类（上表判据列），再动处置。
跳过判据直接改代码，会改到不生效的分支上（`07-*` §8 反例黑名单已记录这个坑）。

---

## 2. 不受 hook 影响的检测：隐藏 iframe 取「干净原生 API」

### 2.1 机制

目标创建一个**隐藏 iframe**，从 `iframe.contentWindow` 上取原生方法：

```js
W || (W = document.createElement("iframe"), W.style.display = "none", document.body.appendChild(W));
return W.contentWindow[t];   // ← 这里拿到的是**未被主窗口 hook 的原生方法**
```

**后果**：只在主窗口 `window` 上做 hook 的方案**全部失效**。
这是"我明明 hook 了却还是被抓"的第一大原因。

### 2.2 处置：拦截 iframe.contentWindow 的 原生借用 (现代最佳实践)

过去常尝试在 `appendChild` / `insertBefore` 上逐个挂载拦截，但这容易漏掉通过其他 DOM 操作插入的 iframe。

**更直接、彻底的方案**：直接对 `HTMLIFrameElement.prototype.contentWindow` 的属性描述符（getter）下套，将其返回的子窗口包一层 Proxy：

```js
const desc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
if (desc && desc.get) {
  const rawGet = desc.get;
  Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
    configurable: true,
    enumerable: true,
    get() {
      const win = Reflect.apply(rawGet, this, []);
      if (!win) return win;

      return new Proxy(win, {
        get(target, prop, receiver) {
          // 当目标试图从 iframe 借用未被主窗口 hook 的干净原生方法时，回流给主窗口保护版本
          if (typeof prop === 'string') {
            if (prop === 'eval' || prop === 'Function') {
              return window[prop];
            }
            if (prop === 'console') {
              return window.console;
            }
          }
          const val = Reflect.get(target, prop, target);
          if (typeof val === 'function') {
            return val.bind(target);
          }
          return val;
        },
      });
    },
  });
}
```

**优势**：
1. **无需关心创建与挂载时机**：无论是 `document.createElement('iframe')` 还是静态 HTML 里的 iframe，在其 `.contentWindow` 被读取的瞬间即刻生效。
2. **免除漏挂**：不依赖 `appendChild`、`insertBefore`、`replaceChild` 等 DOM 插入入口。
3. **干净原生借用彻底落空**：目标在拿到 `iframe.contentWindow.Function` 或 `iframe.contentWindow.eval` 时，依旧是已经被主窗口过滤掉 `debugger` 的受控函数。
### 2.3 原生完整性校验（第 9 类）的对抗

目标会检查"方法还是不是原生的"：

```js
n && /\[native code\]/.test(n.toString()) ? ok = true : ok = false;
```

注意它**同时**试了主窗口和 iframe 两条路（`J(t)` 那个 helper）。

对抗要点：

1. **`toString` 必须被一起 patch**。hook 后把 `toString` 改成返回带 `[native code]` 的字符串：
   ```js
   const rawToString = Function.prototype.toString;
   Function.prototype.toString = function () {
     if (patched.has(this)) return `function ${this.name || ''}() { [native code] }`;
     return rawToString.call(this);
   };
   ```
2. **同时保留 `fn.name` / `fn.length`**，否则尺寸类校验会命中。
3. **不要在 hook 里用箭头函数**（`name` 与 `length` 会变）。
4. **注意 `Function.prototype.toString` 本身也会被查** ⇒ 它自己不能在 `patched` 集合里。

**判据**：如果目标**只是**做完整性校验而**不**做行为检测，那"别 hook"往往比"hook 得更像"更省事
——改用响应改写（`07-*` §3）直接去掉校验逻辑。**先判断它拿到校验结果后做什么**。

---

## 3. 用 `location` / `console` 做拦截时不能照抄的写法

### 3.1 `location` 的属性与方法不可直接覆写

浏览器禁止直接给 `location.href` 或 `window.location` 重新赋值一个普通函数，直接置空没有任何效果。

⇒ 最佳处置路径：
1. **通用断点捕获方案：`onbeforeunload` 埋断点（推荐）**
   当网站尝试通过 `location.href = ...`、`location.replace(...)` 或 `window.location = ...` 强行跳出时，浏览器必定触发 `beforeunload` 事件。在此处埋设 `debugger`，页面将瞬间断在即将卸载前，此时调用栈完全保留：
   ```js
   window.onbeforeunload = function () {
     debugger;
     return false;
   };
   ```
   从 DevTools 的 Call Stack 最上层即可一秒定位到底是哪段混淆代码触发了重定向。
2. **原型 Setter Trap**：在 `Object.getPrototypeOf(window.location)` 上的 `href` 属性描述符上做拦截（见 §4）。
3. **改条件让代码走不到该分支**，或通过 mitmproxy 响应改写注释掉对应语句。
### 3.2 `console.log` 不要置空

很多站点用 `console.log` 的**对象求值副作用**判断 DevTools 是否打开。
把 `console.log` 置空看似干净，但会**破坏自己的调试能力**，且部分站点会因为"没有输出"而走另一条分支。

**更稳的顺序**：
1. 只置空 `console.clear` 与 `console.table`（这两个是纯探测用的）；
2. `console.log` 保留，改为**写入自己的缓冲区**（`myLog.push(args)`）供事后 dump；
3. 真的需要压掉时再置空，**并同步替换掉站点对 `console.*` 的引用路径**。

### 3.3 `setInterval` / `setTimeout` 不要无条件置空

`setInterval = function(){}` 会**一起干掉站点的正常轮询**（心跳、埋点、Vue 路由、渲染循环），
导致页面行为改变、结论失真。

**收敛到按调用栈/回调特征拦截**：

```js
const STACK_FLAG = /onDevToolOpen|XCID|noDebug|abFn|(?:^|\W)ot(?:\W|$)/i;
const CALLBACK_FLAG = /new Array\(1e4\)\.fill\(['"]x['"]\)|['"]x['"]\.repeat\(1e4\)/i;

function shouldBlockTimer(callback) {
  const stack = new Error('[trap] timer stack').stack;
  if (STACK_FLAG.test(stack)) return true;
  return CALLBACK_FLAG.test(String(callback && callback.toString ? callback.toString() : callback));
}
```

**判据**：`STACK_FLAG` 里放的符号名**必须来自你自己的栈追踪结果**，不要凭空写。
先用 §4 的 trap 抓一次真实栈，再把栈里的符号名填进去。

---

## 4. 「先抓 sink，再回栈对位」——定位反调试逻辑的标准方法

### 4.1 为什么不能直接在大包里搜

压缩/混淆后的 bundle 里搜 `debugger` / `close` / `innerHTML` 会命中成百上千处，
且**大部分不是生效的那条**。正确做法是**从副作用反推调用者**。

### 4.2 三步法

**第一步：只在 `document-start` 注入最小 trap，抓高价值 sink。**

| sink | 为什么它是高价值 |
| --- | --- |
| `window.open` | "清空页面前先开个空白页"这类组合拳的第一枪 |
| `location.assign/replace/reload`、`location.href` setter | 强制刷新/跳转 |
| `history.back/go/forward` | 把用户推走 |
| `document.body` 的 `innerHTML` setter | 清空页面 |
| `document.head.appendChild`（带可疑 CSS） | 注入 `blur`/`display:none` 遮蔽 |

```js
function trap(action, target) {
  const stack = new Error('[REDIRECT-TRAP] stack').stack;
  console.groupCollapsed(`[REDIRECT-TRAP] ${action}`);
  console.log('from:', location.href);
  console.log('to:', target);
  console.log(stack);
  console.groupEnd();
}

const rawOpen = window.open;
window.open = function (...args) { trap('open()', args[0]); return rawOpen.apply(this, args); };

const proto = Object.getPrototypeOf(window.location);
const hrefDesc = Object.getOwnPropertyDescriptor(proto, 'href');
Object.defineProperty(proto, 'href', {
  configurable: true, get: hrefDesc.get,
  set(url) { trap('location.href =', url); return hrefDesc.set.call(this, url); },
});
```

**第二步：从运行时栈直接读出关键链路。** 真实栈长这样：

```
at ht (app.80fffb17.js:54:43498)
at Et.onDevToolOpen (app.80fffb17.js:54:44611)
at Et.XCID (app.80fffb17.js:54:48576)
```

⇒ **`XCID`（检测器）→ `onDevToolOpen`（触发点）→ `ht`（破坏动作执行者）**。
三个符号名一次拿全，接着回本地快照按符号定位即可，不用盲搜。

**第三步：回 bundle 对位并收敛规则。**
按符号/模式在快照里定位到具体行（含列号，`54:43498` 这种是 bundle 内的偏移），
确认调用链后**只拦这一条链**。

### 4.3 这套方法的价值

- **不用理解整包**。混淆代码里"哪条逻辑真正生效"是无法靠通读判断的，只能靠副作用反推。
- **规则可收敛**。第一版可以宽（拦所有跳转），确认链路后收紧到"只拦来自该栈的调用"，
  避免误伤正常业务（这一步是能否长期使用的关键）。
- **可迁移**。换一个站点，换的只是 sink 清单与符号名，方法不变。

---

## 5. 自动化框架自身留下的指纹（不在目标 JS 里）

这一类的特征是：**你已经把目标 JS 逆完了，却还是被抓**。因为问题在自动化框架。

### 5.1 焦点 / 可见性伪造（CDP 仿真开关）

**机制**：DrissionPage 在初始化每个 Chromium 页面时**无条件**下发：

```
Page.enable
DOM.enable
Emulation.setFocusEmulationEnabled(enabled=True)     ← 问题在这
```

`Emulation.setFocusEmulationEnabled({enabled:true})` 的作用是"让页面始终被视为 focused/active"。

| 真实世界 | 页面 JS 读到的世界（伪装开启时） |
| --- | --- |
| 标签页已切走 / 被弹窗抢前台 | `document.hasFocus()` 仍可能是 `true` |
| 页面已进入后台 | `document.visibilityState` 仍可能是 `"visible"` |
| 本该有 `blur` / `visibilitychange` | 可能迟迟不来 |

**检测逻辑**：先**制造真实失焦**，再看页面还敢不敢说自己在前台。

```js
async function detectFocusEmulation() {
  const w = window.open('about:blank', '_blank');
  if (!w) return { skipped: true, reason: 'popup_blocked' };
  await new Promise(r => setTimeout(r, 600));
  const report = { hasFocus: document.hasFocus(), visibilityState: document.visibilityState, hidden: document.hidden };
  w.close();
  const suspicious = report.hasFocus === true && report.visibilityState === 'visible';
  return { suspicious, report };
}
```

**判据（务必写对）**：**不能**写成"只要 `hasFocus()===true` 就是机器人"。
关键是**矛盾**：已经把页面挤到后台了，它还坚持 `focused + visible`。

**实测 A/B（DrissionPage 4.1.1.4）**：

| 场景 | hasFocus | visibilityState | 命中 |
| --- | --- | --- | --- |
| 默认（emulation ON）+ `window.open` 抢前台 | True | visible | ✅ 命中 |
| 默认 + CDP 新标签抢前台 | True | visible | ✅ 命中 |
| 手动关闭 emulation 后 | False | hidden | ❌ 表现正常 |
| 再次打开 emulation | True | visible | ✅ 命中 |

**规避**（自动化侧）：

```python
# 页面创建完成后立即关掉；每个新 tab/frame 初始化后都可能需要再关一次
page.run_cdp('Emulation.setFocusEmulationEnabled', enabled=False)
```

注意三点：① 框架在 `_driver_init` 里默认打开；② 关掉后后台运行会**真实失焦**，
部分依赖 focus 的前端逻辑可能变脆；③ 改 `site-packages` 一劳永逸但升级会被覆盖，
更稳的是**封装自己的启动函数统一关闭**。

**站点侧的合理用法**：作为**降权风险分特征**（先失焦 + 状态抽样 + 事件是否触发，组合判断），
不要做成一票否决——辅助功能、嵌入式场景也可能让焦点表现怪异。

### 5.2 其他框架指纹（检查清单）

| 类 | 检查点 | 说明 |
| --- | --- | --- |
| UA / `navigator.webdriver` | `navigator.webdriver === false` | 基础项，现代站点基本不再单独用 |
| 输入时序 | 输入间隔是否过于均匀 | 真人输入有方差 |
| 指针轨迹 | 是否只有 `moveTo` 无中间步 | 拖拽类必查 |
| 渲染 / WebGL | canvas 哈希、字体集 | 与焦点伪造是**不同类**，见 `web-reverse-env` 的指纹模块 |
| **运行时状态一致性** | 焦点、可见性、事件序 | **本文 §5.1 打的正是这一类**，换 UA / 关 webdriver 都挡不住 |

**判据**：`webdriver` / 渲染指纹 / 运行时状态一致性是**三类独立检测**。
补了前两类不代表第三类也过了（§5.1 的实测表就是证据）。

---

## 6. 反调试处置决策树

```
打开 DevTools 后有异常反应？
├─ 反复断在 debugger
│   ├─ 间隔固定 → 定时器类（§1 类 2）→ 在首次执行前 hook setInterval
│   ├─ 堆栈含 constructor → 构造函数类（§1 类 4）→ 重写 Function.prototype.constructor
│   └─ 搜不到 "debugger" → eval 内（§1 类 3）→ hook eval
├─ 页面被刷新 / 清空 / 模糊
│   └─ 走 §4 三步法（先抓 sink → 看栈 → 回 bundle 对位），不要盲搜
├─ 页面卡死 / 内存飙升
│   └─ 内存炸弹（§1 类 8）→ 按调用栈白名单拦定时器，不要全局禁
├─ hook 了但依然被抓
│   ├─ 有隐藏 iframe → §2.2 把防护注入 contentWindow
│   ├─ 有原生完整性校验 → §2.3（连 toString 一起 patch）或改用响应改写
│   └─ 都不是 → §5 查自动化框架自身的指纹
└─ 只想知道某个值 / 某段逻辑
    └─ 不要打这场仗：改用响应改写（07-*）或补环境（web-js-env-patcher）
```

---

## 7. 反例黑名单

- **不要置空 `location` 的任何属性/方法。** 浏览器禁止，且 `defineProperty` / `Proxy` 也无效；
  要改的是**判据**或**替换文件注释该段**。
- **不要无条件置空 `setInterval` / `setTimeout`。** 会一起干掉正常业务轮询，导致结论失真。
- **不要无条件置空 `console.log`。** 先只置空 `console.clear` / `console.table`，`log` 改为写入缓冲区。
- **不要在 bundle 里盲搜 `debugger` / `close` / `innerHTML`。** 走 §4 的 sink → 栈 → 对位。
- **不要只在主窗口 hook。** 隐藏 iframe 会取回未 hook 的原生方法（§2.1）。
- **不要用箭头函数做 hook。** `name` / `length` 会变，尺寸类与完整性校验会命中。
- **不要把「`hasFocus()===true`」单独当机器人判据。** 关键是"被挤到后台却仍报前台"的**矛盾**（§5.1）。
- **不要改了 `site-packages` 就以为一劳永逸。** 框架升级会被覆盖（§5.1 规避段）。
- **不要用 DevTools 的「Deactivate breakpoints」当作绕过**。它只影响当前会话，刷新即失效，且掩盖了失败分支的真实行为。
- **不要手打要替换的字符串**。必须从真实响应里复制（`07-*` §3）。
- **不要删掉反调试的整段逻辑**。它后面往往跟着正常业务分支，删了会导致页面行为改变、结论失真；只做最小干预（插入 `return;` / 注释调用点）。
- **不要在同一轮里既改请求体又改响应体**。出错时无法判断是上游还是下游。
- **不要把「能跑通一次」当作完成**。动态 JS 类目标的验收标准是「连续 N 次（N ≥ 3）跑通且中间不重新扣代码」。
- **不要在没确认授权的情况下改写第三方站点响应并提交数据。** 改写仅用于本地定位。
