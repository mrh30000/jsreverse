# 响应体改写与定位型 Hook 配方

一句话：**「响应体改写」用最小的副作用把页面判断按下去；「定位型 hook」不追求绕过，
只追求在密文 / VM 里找到「这段代码在哪、这个值从哪来」。**

本文件是 `references/page-unlock-and-userscript-recipes.md`（前端限制解除）与
`references/anti-hook-detection-and-bypass.md`（反 hook 检测）的**同族补充**：
那两篇分别讲「怎么解锁页面自己的限制」和「怎么不被页面发现你在 hook」，
本篇讲两件更基础的事——**怎么在响应层改数据**、**怎么用 hook 定位算法入口**。

> 何时用：① 页面判断读的是某个接口的响应字段，改响应体比改 UI 判断稳；
> ② 要抓 `document.cookie` 的写入但不知道时机；
> ③ 响应体是密文、找不到解密入口；
> ④ 被 JSVMP 里的无限 `debugger` 挡住、文件又不好改。

---

## 1. `ajaxHooker` 改写响应体

来源 `52pojie-1722262`（畅玩空间 SVIP 解锁，涛之雨）。源文的核心只有几行，但**范式很通用**。

### 1.1 油猴头部（源文逐字，关键三行）

```js
// ==UserScript==
// @name         wan-SVIP
// @namespace    svip.wo1wan.taozhiyu.gitee.io
// @version      0.1
// @description  一直解锁一直爽
// @AuThor       涛之雨
// @match        https://play.wo1wan.com/*
// @Icon         https://static.wo1wan.com/headimg/s1/svip/1.gif
// @require      https://greasyfork.org/scripts/455943-ajaxhooker/code/ajaxHooker.js?version=1124435
// @grant        unsafeWindow
// @run-at       document-start
// @license      WTFPL
// ==/UserScript==
```

三行缺一不可：

| 头 | 作用 | 少了会怎样 |
| --- | --- | --- |
| `@require` | 引入 `ajaxHooker` 库 | `ajaxHooker is not defined` |
| `@run-at document-start` | 抢在页面发起请求前装上 hook | 装晚了，响应已经被页面读走 |
| `@grant unsafeWindow` | 拿到页面真实 `window` | 操作的是沙箱 `window`，可能对不上 |

### 1.2 改写逻辑（源文逐字）

```js
/* global ajaxHooker*/
(function() {
    'use strict';
    // cxxjackie 牛逼
    ajaxHooker.hook(request => {
        if (request.url.endsWith('userinfo')) {
            request.response = res => {
                const a=JSON.parse(res.responseText);
                a.info.LevelInfo.VipLevel=10;
                a.info.LevelInfo.Svip=1;
                res.responseText=JSON.stringify(a);
            };
        }
    });
})();
```

- `ajaxHooker.hook(fn)` 注册一个「请求过滤器」；`fn` 里按 `request.url` 判断**要不要管这一次请求**。
- 命中后给 `request.response` 赋一个**处理函数** `res => { … }`：在函数里读 `res.responseText`、
  改字段、再写回 `res.responseText` ⇒ **页面拿到的是被改过的响应**。
- 这里只改了两个字段（`VipLevel`、`Svip`），页面自己就会把「有权限」的状态渲染出来。

### 1.3 ★ 判据：改「响应体」比改「页面状态」稳

源文只改响应体，**没有去找任何 UI 判断点**。原因是：

- **页面自己会去读接口结果** ⇒ 把接口结果改成「有权限」，所有消费者（UI、逻辑、后续请求）一起变；
- 反过来，若去改某个具体的 UI 判断 / Vuex 状态，就要**逐个找到所有读这个状态的地方**，
  站点一改渲染路径就失效（这与 `references/page-unlock-and-userscript-recipes.md` §4 的
  「去水印三路线」结论同源：**改数据流 > 改标签 / 改生成代码**）。

⇒ **判据**：目标功能由**某个接口响应**驱动时，**优先改响应体**，而不是找 UI 判断点。

### 1.4 边界

- **前端解锁只在服务端不复核时有效**（源文金句「几乎没有什么是油猴做不到的。。。如果有，那就是服务器功能了」，
  见 `references/page-unlock-and-userscript-recipes.md` §8）。改响应体让页面**显示**有权限，
  但服务端若在**写操作**时再次校验，照样失败。
- 源文自陈解锁项里「解锁皮肤（似乎没效果？）」——即**并非所有改响应都生效**，
  要看页面是否真的以该字段为准。
- `ajaxHooker` 是第三方库；落成油猴前按 `web-malware-forensics` 的清单审一遍（别引入回传面）。

---

## 2. `document.cookie` 的 `defineProperty` hook 模板 + hook 时机三档

来源 `52pojie-1492463`（js hook 初学笔记，lihu5841314）。源文给出了「get/set 双方法 + 内部暂存」的经典模板。

### 2.1 模板（源文逐字）

```js
(function(){
    var aaa = "";
    Object.defineProperty(document, 'cookie', {
        set:function(val){
            debugger;
            console.log(val)
            aaa = val;
            return val;
        },
        get:function(){
            return aaa;
        }
    });
})()
```

- `set`：命中写入时 `debugger` + 打印，然后把值存进闭包变量 `aaa`。
- `get`：返回 `aaa`。
- 这是**「拦截 + 观测」**的最小骨架，用于抓「谁在什么时候写了 cookie、写的是什么」。

### 2.2 ★ hook 时机三档

`document.cookie` 的写入**发生在页面早期**，装晚了就抓不到首次写入。源文给了两档，本仓补第三档：

| 档 | 手段 | 时机 | 源文 / 出处 |
| --- | --- | --- | --- |
| ① | **控制台注入** | **刷新即失效** | 源文原话「在控制台注入的 hook，刷新网页就失效了」；需**在网页加载的第一个 JS 的位置下断点**，然后**再控制台手动注入** hook |
| ② | **FD / Fiddler 替换响应** | **时机比较靠前** | 源文原话「FD 就是个代理，让网页数据都从 FD 过，然后就是拦截 + 注入 + 放过」——在**响应层**把 hook 塞进去，比控制台早 |
| ③ | **油猴 `@run-at document-start`** | 抢在页面代码前 | 本仓油猴路线的对应档（源文未提）；配合 Tampermonkey 的 *Userscript API Dynamic* 才最稳，见 `../SKILL.md`「注入与生效时机」 |

- 源文还留了一句边界：「**有可能在注入有些站点的时候时机会晚一点**」⇒ 装完发现抓不到首次写入，
  先怀疑**时机**，不是模板写错。
- 「断点暂停后手动注入」这一招的完整操作序列（Network 勾 `Preserve log` → 第一个请求 → 脚本顶端下断点 →
  刷新停住 → 粘贴 → 放行）见 `../SKILL.md` §「断点暂停」= 最可靠的注入时机。

### 2.3 ⚠️ 源文写法的两个缺陷（如实登记，不美化）

| # | 源文写法 | 问题 | 后果 |
| --- | --- | --- | --- |
| 1 | `set` 里 `aaa = val; return val;` | `set` 访问器**不应该有返回值**（返回值被忽略），`return val` 是多余写法 | 无害但会误导新手以为要 return |
| 2 | `get: function(){ return aaa; }` | **只返回「最后一次写入的串」**，把 cookie 当成单值维护 | **毁掉整站**：站点之前写入的会话 / 风控 cookie 全被 `get` 吞掉，症状是「hook 装上后页面不正常」（详见 `../SKILL.md` §「Cookie hook：三个『一定有』的坑」坑 2） |
| 3 | 既没 `Object.getOwnPropertyDescriptor` 保护，也没 `toString` 伪装 | **裸 hook 会被页面检出**：页面用 `Object.getOwnPropertyDescriptor(document,'cookie').get.toString()` 一看不是 `native code`，就知道被 hook 了 | 见 `references/anti-hook-detection-and-bypass.md` §1（`Function.prototype.toString` 白名单比对） |

**正确姿势**（本仓 `dataflow` 预设的做法，见 `../SKILL.md` 坑 2 与 `scripts/hooks/dataflow.js`）：
先沿原型链取**原生描述符**，`get` / `set` 都**转发给原生**，只做观测：

```js
const d = Object.getOwnPropertyDescriptor(document, 'cookie')
       || Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
Object.defineProperty(document, 'cookie', {
  configurable: true,
  get() { return d.get ? Reflect.apply(d.get, this, []) : ''; },
  set(v) { /* 只观测 */ ; return Reflect.apply(d.set, this, [String(v)]); },
});
```

⇒ **判据**：**装完之后页面还正常，才是合格的观测 hook**。凡是把 `get` 换成「自己维护的字符串」的写法，
都属于**改写**而非观测。要抓「谁在写」用**条件断点**（`../SKILL.md` 坑 3，`--cookie-match`）而不是无条件 `debugger`。

---

## 3. `JSON.parse` 断点定位解密入口

来源 `52pojie-1477905`（关于遇到加密数据怎么提取的一些案例，QingYi.）。
场景：**响应体是密文**，直接抓下来看不懂，要找到「密文在哪被解密」。

### 3.1 步骤（源文流程）

1. **全局搜 `JSON.parse`** —— 源文原话「遇见这种直接定位 `JSON.parse`」；
   该样本**两处都命中**，源文「它两个地方都有，都可打个断点看看」；
2. **两处都下断点，刷新页面** —— 看到「加密的 `data` 来了」，判断这里可能是入口；
3. **断住后能看到真实数据**（明文）；
4. **回看这个函数** —— 源文看到**右上角的名称是 `des`**，「可以推测它是 des 加密，**实质上就是 des 加密**」；
5. **扣代码 + 处理** —— 源文「这是经过特殊处理的，代码抠出来，处理一下就可以用了」；
6. 落地到 Python：**`execjs` 调 JS**（源文「可以用 Python 去做 execjs」）。

### 3.2 ★ 判据

- **「解密入口 = 密文进入业务代码的第一个函数」** —— 密文从网络层进来后，
  业务代码第一件事往往是把它 `JSON.parse` 成对象（或先 `JSON.parse` 再解字段）。
  **在 `JSON.parse` 下断点，就是截在「密文刚刚变成对象」的那一刻**，往上看调用栈即见解密函数。
- **`JSON.parse` 是绝大多数站点的那个点** ⇒ 密文场景的**第一顺位断点**，成本最低、命中率最高。
- **函数名提示可信度高**：源文仅凭调试器右上角显示 `des` 就判定 DES 且**实测正确**。
  ⇒ 断在解密函数里时，**先看函数名 / 变量名**，往往比读代码快（同 `../../web-verify-patcher/references/provider-execution-notes.md`
  §「数美 / 树美」的「搜解密后的可读变量名比搜 `_0x` 有效」）。

> 与既有预设的关系：本仓 `dataflow` 预设内置了 `JSON.parse` / `JSON.stringify` / `atob` / `btoa` 拦截
> （见 `../SKILL.md` 预设能力表），可直接用；本节补的是**「密文场景下 `JSON.parse` 作为解密入口」这条判据**。
> 密文结构诊断（编码层、分段、填充）见 `../../web-reverse-algorithm/references/16-ciphertext-structure-diagnostics.md`。

### 3.3 边界

- 该样本是**算法层**（DES 纯算法），扣出来 `execjs` 即可；若密文是**环境绑定**的（含指纹），
  单扣算法跑不出正确结果，要走补环境线。
- 源文自陈「关于有人说可以用 Selenium 去抓，当然可以」——即**绕过定位、直接读渲染结果**也是一条路，
  但只解决「取数据」，不解决「理解算法」。

---

## 4. ★ 按 `this.toString()` 精确 hook `apply` 掐掉无限 `debugger`

来源 `52pojie-1851890`（文心一言开发者控制台调试破解，李恒道）。
场景：一打开就是**标准无限 `debugger`**，往上一层发现是 **jsvmp** ⇒「这样替换文件相对来说就不太好搞」。

### 4.1 配方（源文逐字）

```js
// ==UserScript==
// @name         WXYY Crack Debugger
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  try to take over the world!
// @author       You
// @match        https://yiyan.baidu.com/*
// ==/UserScript==
const apply = Function.prototype.apply
Function.prototype.apply = function (thisArg, argsArray=[]) {
    if(this.toString()==='function anonymous(\n) {\ndebugger\n}'){
        return
    }
    return this.call(thisArg, ...argsArray)
}
```

**它做的事**：劫持全局 `Function.prototype.apply`；**当被调用的函数其 `toString()` 恰好等于
`'function anonymous(\n) {\ndebugger\n}'` 时直接 `return`**（不执行），其余一律放行。
`'function anonymous(\n) {\ndebugger\n}'` 正是 `new Function('debugger')` 的 `toString()` 形态。

### 4.2 ★ 与既有手法的区别（必须写清楚）

本仓既有的无限 `debugger` 处置分几条路，**本手法与它们都不同**：

| 手法 | 层 | 前提 | 适用 |
| --- | --- | --- | --- |
| **静态改文件**（注释 `debugger` / `return;` 前置 / 注释 `eval` 调用） | 改源码 | **必须能改文件** | 外链静态 JS |
| `antidebug` 预设（清空 `eval`/`Function`/`constructor` 字符串里的 `debugger`） | 清字符串 | 注入得早；**只治动态构造形态** | 动态构造的 debugger |
| 条件断点 / *Never pause here* | 调试器 | 临时、刷新可能失效 | 内联写死、改不了文件 |
| **本手法（`apply` 劫持 + `toString()` 精确匹配）** | 运行时 | 注入得早；函数**经 `apply` 调用** | **代码在 JSVMP 里、文件不好改** |

- 源文原话点出了前提：「往上一层可以发现是 **jsvmp**，这样**替换文件相对来说就不太好搞**」
  ⇒ 正因为**改文件不好搞**，才转到**运行时按函数源码文本精确匹配**。
- **判据：`Function.prototype.apply` 是 JSVMP 里 `debugger` 的必经之路** ——
  VM 用一个调度函数统一 `apply` 调用各 opcode 处理函数，`debugger` 函数也是被 `apply` 调起来的，
  所以在 `apply` 上做**按源码文本**的精确匹配就能只掐掉它、不影响别的调用。
- 与本仓既有的**条件断点路**是**两条不同的路，不是替代关系**：`../SKILL.md`「注入与生效时机」§4 记录了
  `52pojie-1909547` 在**同一个站点（文心一言）**用的是**条件断点 `false`**；
  本条（`52pojie-1851890`）用的是 **`apply` hook**。**同一目标可有多种处置，按「能不能改文件」选**。

### 4.3 ★ 风险与边界

| # | 风险 / 前提 | 说明 |
| --- | --- | --- |
| 1 | **字符串必须逐字符精确** | `\n` 与空格都要对上；`'function anonymous(\n) {\ndebugger\n}'` 里任一处不匹配（多一个空格、换行位置不同）就**不生效** |
| 2 | **劫持全局 `apply` 影响面大** | `Function.prototype.apply` 是全页面共享的；包装逻辑若写错会波及所有函数调用。**只在必要时用，调试完撤掉** |
| 3 | **源文的观察是选择该手法的前提** | 源文先测出「**如果卡在 `debugger` 就会跳转页面**，但是**放行 `debugger` 就可以正常使用**」，据此推断「**`debugger` 前后存在计时程序**」⇒ **正因为存在计时反调试**，才需要「瞬间掐掉 debugger」而不是慢慢单步。**没做这个观察就套用本手法，可能并不对症** |
| 4 | 反 hook 检测 | 劫持 `Function.prototype.apply` 本身可能被 `toString` 白名单检出，见 `references/anti-hook-detection-and-bypass.md` §1 |

---

## 5. 与既有预设 / 文档的分工表

| 场景 | 去处 |
| --- | --- |
| **改接口响应体把页面判断按下去** | **本文 §1** |
| 页面自己施加的限制（禁止复制 / 弹登录 / 水印 / 倍速 / 进度） | `references/page-unlock-and-userscript-recipes.md` |
| **抓 `document.cookie` 写入 + 时机三档** | **本文 §2** |
| cookie hook 把站点写坏的三个坑 | `../SKILL.md` §「Cookie hook：三个『一定有』的坑」 |
| **密文响应定位解密入口（`JSON.parse`）** | **本文 §3** |
| 密文结构诊断（编码层 / 分段 / 填充） | `../../web-reverse-algorithm/references/16-ciphertext-structure-diagnostics.md` |
| **JSVMP 里按 `toString()` hook `apply` 掐 debugger** | **本文 §4** |
| 无限 `debugger` 的常规三档（条件断点 / `antidebug` 预设 / Never pause here） | `../SKILL.md` §「注入与生效时机」 |
| 反调试静态改文件路线（改 `eval` 实参去 `debugger`） | `../../web-reverse-algorithm/references/07-antidebug-and-live-patching.md` §5.7 |
| 反调试与自动化指纹 | `../../web-reverse-algorithm/references/09-antidebug-and-automation-fingerprint.md` |
| hook 被 `toString` 白名单发现 / closed shadow root | `references/anti-hook-detection-and-bypass.md` |
| JSVMP 参数补环境 / 观测点 | `../../web-js-env-patcher/references/vmp-verify-params-env-patching.md` |

## 6. 来源表

| 主题 | 文章裸 id | 年份 | 关键面量 |
| --- | --- | --- | --- |
| `ajaxHooker` 改写响应体（油猴三行头 + 改 `responseText`） | 52pojie-1722262 | 2022 | `ajaxHooker.hook`、`request.response`、`res.responseText`、`userinfo`、`@require` / `@run-at document-start` / `@grant unsafeWindow` |
| `document.cookie` 的 `defineProperty` hook 模板 + hook 时机 | 52pojie-1492463 | 2021 | `Object.defineProperty(document,'cookie',…)`、`aaa`、`set` 里 `return val`、`get` 返回 `aaa`、控制台注入刷新失效、FD 替换响应 |
| 定位 `JSON.parse` 顺到 DES 解密 | 52pojie-1477905 | 2021 | `JSON.parse`（两处命中）、断点刷新看明文、右上角函数名 `des`、扣代码 + `execjs` |
| 按 `this.toString()` hook `apply` 掐无限 `debugger` | 52pojie-1851890 | 2023 | `Function.prototype.apply`、`'function anonymous(\n) {\ndebugger\n}'`、jsvmp 不好改文件、卡 debugger 跳转页 / 放行可用 |
