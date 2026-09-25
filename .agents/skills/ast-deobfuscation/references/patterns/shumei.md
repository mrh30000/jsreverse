# 数美风控 SDK（`fpv2.js` / `smdata`）反混淆与结构笔记

> 抽象自 `52pojie-1104122`（2020-02，douyu 登录页引入的 `static.fengkongcloud.com/fpv2.js`）。
> **适用**：风控/设备指纹 SDK 的**前端 JS**（数美 `fpv2.js`、以及同构的"评分型风控 JS"）。
> **不适用**：验证码/滑块（⇒ `../../../web-verify-patcher/SKILL.md`）；把这段 JS 搬进 Node（⇒ `../../../web-js-env-patcher/SKILL.md`）。

---

## §1 文件结构（四段式，先按段落切）

```text
第一部分  变量名/字符串存储数组
  var _0x9beb = ['cG9UbmVlcmNz', 'eWRvYg==', …, 'WW5lZXJjU3Jlbm5Jem9t'];
  ★ 数组元素是 **base64**（不是 hex）⇒ 每个元素解一次 base64 再 decodeURIComponent 才是明文

第二部分  数组处理函数（数组移位）
  (function (_0x314a53, _0x280ed8) {
      var _0x1f958f = function (_0x59c3ce) { while (--_0x59c3ce) _0x314a53['push'](_0x314a53['shift']()); };
      _0x1f958f(++_0x280ed8);
  }(_0x9beb, 0xb5));
  ★★ 它把前 **(0xb5 + 1) = 182** 个元素搬到数组末尾 ⇒ **下标全部错位 182**，
     直接按原下标取值必然全错。**"移位步长 = 传入参数 + 1"**（这里是 `++0xb5`）。

第三部分  数组字符串处理函数（★ 它会**改写原生 `atob`**）
  见 §2

第四部分  核心逻辑（switch 平坦化 + 运算符字典）
  见 §3
```

---

## §2 ★★★ 第三部分改写了原生 `atob` —— 自定义码表

```text
var _0x5162cf = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
_0x50d0d8['atob'] || (_0x50d0d8['atob'] = function (s) { … 用 _0x5162cf 做 indexOf 解 … });
_0xb9be['base64DecodeUnicode'] = function (s) {
    var b = atob(s); var out = '';
    for (…) out += '%' + ('00' + b.charCodeAt(i).toString(16)).slice(-2);
    return decodeURIComponent(out);      // ← UTF-8 还原
};
```

> ★★★ **判据**：**"我自己写的 base64 解出来是对的，但和浏览器结果不一致"** ⇒
> 先去确认**这段脚本有没有把 `atob` 换掉**（源文自陈正是在这里踩了坑：
> 「最开始忘记在这里处理过了，调试的时候显示的都是对，自己写代码验证部分结果的时候出现了问题」）。
> ★ 本样本的码表**恰好是标准表**，但**实现是自写的** ⇒ **不要用"码表是不是标准"来判断"该不该自己实现"**。
> ★ 它同时会存一份 `_0xb9be['data']` 做**解码结果缓存**（`initialized` 标志）—— 复现时同步这个语义，
> 否则"调用次数敏感"的检测会看出来。

---

## §3 ★★★ 核心逻辑：`switch` 平坦化 + **运算符字典** + **`arguments` 顺序反转**

### §3.1 `switch` 平坦化的可读化模板

```text
var runLine = "4|1|0|5|3|2"["split"]('|'), step = 0;
while (!![]) {
    switch (runLine[step++]) { case '0': continue; … case '2': return operatorMap['op'](0); … }
    break;
}
```

> ★★ **`runLine` 字符串就是执行顺序**（`"4|1|0|5|3|2"` ⇒ 先跑 case 4，再 case 1，…）。
> ⇒ **把 `runLine` 展开成线性语句序列**是这类样本唯一必要的 AST 变换
> （与 `control-flow-and-opcode-patterns.md` / `control-flow-reduction-rules.md` 同族）。

### §3.2 运算符字典（`_0x3be3f8[...]`）

```js
var _0x3be3f8 = {
    'yZA': function (a, b) { return a === b; },   // 二元运算
    'NVz': function (a, b) { return a !== b; },
    'op' : function (params) { return params; },  // 也可能是"转发调用"
};
```

```text
★ 两类条目要分开处理（源文做法）：
  ① value 是 **二元运算** ⇒ `FunctionType(0, operator='===')`
     ⇒ 复现成 `(arg0) === (arg1)`（★ **必须加括号**，否则连续调用会有优先级问题）
  ② value 是 **函数调用/转发** ⇒ `FunctionType(1)` ⇒ 复现成 `fn(a, b, …)`
★ ★★ **字典是嵌套的**：字典里的条目又去查**上一层字典** ⇒
  **不要指望手改一遍就完事**；用 esprima 建 AST + 递归替换
  （源文脚本：`simple_obj_parse_tree_to_key_operator` + `ParseGrammar.replace_func`，
   含"嵌套括号用栈匹配"的 `match_bracket`）。
```

> ★ 源文对**多行函数体**的处理是**跳过**（`if '\n' in sub_content: continue`）——
> **这是有意的取舍**，因为嵌套解析器的复杂度会爆炸。**照抄这个边界**，别自己加码。

### §3.3 ★★★ `arguments` 被原地反转 —— 参数顺序不能按声明读

```js
// CASE 0：把每个字符串参数原地反转
for (i = 0; i < 766; i++) if (typeof arguments[i] === 'string') arguments[i] = arguments[i].split("").reverse().join("");
// CASE 3：把整个参数数组反转
for (i = 0; i < 766 / 2; i++) { var t = arguments[i]; arguments[i] = arguments[766 - i - 1]; arguments[766 - i - 1] = t; }
```

> ★★★ **判据**：**"传进去的参数明明对，函数里读到的却是错位的"** ⇒
> 找 `arguments` 的**原地改写**（反转 / 移位）。
> ⇒ **最省事的做法（源文原话）**：**在"处理完成之后的参数处下断点，直接抄 `arguments` 的值**，
> 而不是在调用点猜顺序。

---

## §4 反分析与"污染点"（复现时必须一并处理）

| 手段 | 表现 | 复现时的处置 |
| --- | --- | --- |
| **异常流控** | 部分逻辑写在 `catch` 里（源文：终值 `'W' + base64(des(smdata)) + ts` 是在 `catch` 中拼出来的） | **不要只读 `try` 块**；异常分支要当正常分支读 |
| **函数执行时间检测** | 用执行耗时判断"是否被外力干扰（调试/插桩）" | 补环境/纯算时**不要人为拖慢函数**；也不要为调试插 `console.log` 进关键路径 |
| **改写原生函数** | 替换 `atob`（§2）；也可能替换其它内置 | 全量搜 `= function` 对内置名的赋值 |
| **关键数据写多处缓存** | `deviceId` 同时写 cookie / local / session / flash / userData，key 是 `smidV2` | 复现时**同步所有落地**（见 `../../../web-js-env-patcher/references/fingerprint-baseline-consistency.md`） |
| **单次运行的 `deviceId` ≠ 实际上传的** | 每次运行都会**重新算一个** deviceId，但**上传的是缓存里的那个** | ★★ 判据：**"算了却不用"** ⇒ 先找"读缓存"的函数，别盯"生成"的函数 |

---

## §5 `smdata` 的字段构成（风控侧采集面）

`smdata` 是一个对象序列化后**zlib 压缩 → DES → base64 → 前置 `'W'` + 拼时间戳**的结果（源文口径）。
压缩前的字段（源文实测清单）：

| 字段 | 含义 | 备注 |
| --- | --- | --- |
| `channel` | 渠道 | 本样本 `undefined` |
| `deviceId` | 设备指纹 | **来自缓存**（§4），不是当次生成 |
| `plugins` | 浏览器插件列表 | 强指纹 |
| `ua` / `appVer` / `lang` / `userLang` / `browserLang` / `systemLang` / `langs` | 语言族 | 注意**四个语言字段各不同** |
| `canvas` | canvas 指纹 | |
| `timezone` / `time` | 时区 + **`time = now - start`（函数内耗时的毫秒数！）** | ★★ **`time` 是"这次执行花了多久"**，不是时刻 |
| `platform` / `url` / `referer` / `res` / `clientSize` | 环境 | |
| `status` | 状态信息（含 cookie 等） | |
| `appCodeName` / `appName` / `oscpu` / `area` | 浏览器族 | |
| `sid` / `version` / `subVersion` | SDK 版本族 | |

> ★★★ **最值钱的一条**：**`time` = 函数内部耗时**（源文里是 `var _0x4368e0 = (+new Date()) - _0x8d7b6d`）。
> ⇒ **这是 §4「执行时间检测」的落地实现**：SDK 把"自己跑了多久"**上报给服务端**，
> 服务端据此判"是否被 hook / 是否在真机"。
> ⇒ **复现时不能只对齐字段值，还要对齐"耗时量级"**（补环境跑得太快本身就是异常信号）。

---

## §6 上传方式：JSONP（不是 XHR）

```js
_0x53ca0f = "http://fp-it.fengkongcloud.com/v3/profile/web";
// GET: <url>?callback=smCB_<ts>&<urlencoded(params)>&_=<ts>
// 回调是挂在新 <script> 的 onload，参数 = {organization, smdata, os:"web", version:"2.0.0"}
```

> ★★ **判据**：**在 XHR/fetch 断点上下断点无效** ⇒ 换 **JSONP 视角**：
> 搜 `callback` / `createElement('script')` / `getElementsByTagName('head')`。
> （源文原话：「这里为什么采用字符串搜索大法，而不采用下 XHR/fetch 断点，在这里断点是没法生效的」。）
> ★ `organization` 是**站点标识**，从页面 JS 里读（源文在页面上找到了设置点）。

---

## §7 来源表

| 源文 | 贡献 |
| --- | --- |
| `52pojie-1104122` 数某风控 JS 算法分析 | §1 四段式与移位步长、§2 改写 `atob`、§3 switch 平坦化 + 运算符字典 + `arguments` 反转、§4 异常流控/耗时检测/多缓存、§5 `smdata` 字段与 `time` 语义、§6 JSONP 上传 |
