# 运行时的全局导出与宿主侧整包复用

> 定位：本文件是「**包尾把加载器挂到全局（`window.X = <加载器>`）**」与
> 「**不抠模块、把整包 + 一个薄调用壳交给 JS 引擎**」这两条路的唯一权威源。
> 判族与三对象模型见 `bundler-identification.md`；怎么把模块扣出来见 `harvest-routes.md`；
> 抠出来之后怎么在 node 里跑见 `node-reuse-and-env-handoff.md`。
> 样本来源：`docs/references/52pojie-2036327-得物网页端首页推荐物品信息获取.md`（2025-06，得物 PC 首页推荐 `sign`）。

一句话：**先看 IIFE 尾部有没有 `window.X = <加载器>`。有就直接用，不必自己造加载器、也不必先跑 `loader-export`。**

## 一、样本形态：得物首页推荐 `sign` 的整包结构

整包是标准的 **webpack-inline-iife**（模块表与加载器同文件），
唯一特别之处是**模块 id 不是数字，而是 4 字符可读串**：

```
e = { "pickRuleId": 644443, "pageNum": 1, "pageSize": 24, "filterUnbid": true, "showCspu": true }
var window = {}                      // ← 抠包人手写的一行「最小环境」
!function sign(e) {
    var n = {}                       // ① 模块缓存表
    function a(r) {                  // ② 加载器（即 __webpack_require__）
        if (n[r]) return n[r].exports;
        var t = n[r] = { i: r, l: !1, exports: {} }, o = !0;
        try { e[r].call(t.exports, t, t.exports, a), o = !1 }
        finally { o && delete n[r] }
        return t.l = !0, t.exports
    }
    window.b = a                     // ★ ③ 把 require 直接挂到全局
    a.e = function (e) { ... }       // ④ 懒加载 chunk 加载器（o[e] promise 表 + document.createElement("script")）
    a.m = e, a.c = n, a.d = ..., a.r = ..., a.t = ..., a.n = ..., a.o = ..., a.p = "", a.oe = ...
}({
    cnSC: function (t, e) { ... },   // whatwg-fetch 之类 polyfill
    ODXe: function (e, t, n) { ... },// _slicedToArray
    aCH8: function (t, e, r) { ... },// blueimp-md5（见 §七）
    BsWD: function (e, t, n) { ... },
    a3WO: function (e, t, n) { ... },
    aCH8: function (t, e, r) { ... },// ← 同名重复键（见 §八）
    ANhw: function (t, e) { ... },   // bytesToWords / wordsToBytes / bytesToHex
    mmNF: function (t, e) { ... },   // utf8 / bin 编解码
    BEtg: function (e, t) { ... }    // isBuffer
})

a = (window.b("cnSC"), window.b("ODXe"), window.b("aCH8"))   // 逗号表达式 → 取最后一个
u = window.b.n(a)                                            // .n() 是 __esModule interop 包装
function cxx(t) {
    return u()("".concat(<按键名升序拼出来的串>, ""), "048a9c4943398714b356a696503d2d36")
}
console.log(cxx(e))
```

要核对的结构点（**顺序就是排查顺序**）：

| 结构点 | 样本里的样子 | 说明 |
| --- | --- | --- |
| 缓存表 | `var n = {}` | 与 `bundler-identification.md` 的 `__webpack_module_cache__` 同义 |
| 加载器 | `function a(r) { … e[r].call(t.exports, t, t.exports, a) … }` | 第三个实参 `a` 即「模块体内的 require」 |
| **全局导出** | `window.b = a` | ★ 判据来源，见 §二 |
| 异步 chunk 加载器 | `a.e = function (e) { … o[e] … i.src = a.p + "static/chunks/" + … }` | `o[e]` 是 promise 表；**只要目标模块不依赖异步 chunk 就不会被调用** |
| 模块表 | IIFE 的实参对象，key 是 4 字符串 | id 形态可读 ≠ 源码可读，仍要按模块图看待 |
| 尾部调用壳 | `window.b("cnSC")` … `window.b.n(a)` → `cxx()` | **这个壳是「包外」的**，源文把它和整包贴在了一起 |

## 二、判据：包尾有没有 `window.X = <加载器>`

**有些包会把 require 直接暴露到全局**。这条判据能在 30 秒内省掉一整套 `loader-export` 流程。

- **做法**：滚到 IIFE 的**尾部**（加载器函数体右括号之后、IIFE 实参之前/之后），
  搜 `window.` / `self.` / `globalThis.` / `global.`，看有没有把加载器赋给某个属性
  （这里叫 `window.b`，也可能是 `window.webpackRequire` / `window.__require` 之类）。
- **有 ⇒ 直接用**：宿主侧 `require_ = window.b`，然后 `require_("<模块id>")`。
  **不必**自己造加载器、**不必**跑 `loader-export`。
- **没有 ⇒ 回到常规路线**：`loader-export`（`harvest-routes.md` §一 A3）。
- ⚠️ **全局名是无意义的短标识符**（`b` / `a` / `t`），**不要按名字猜**，要看「赋值右侧是不是那个一元加载器函数」。
- ⚠️ 本样本是**源码里就写死的** `window.b = a`；若是打包器版本差异导致没有这行，
  判据不成立，不要硬凑。

## 三、宿主侧复用：整包 + 薄调用壳交给 JS 引擎

源文的交付形态**不是**「把算法翻译成 Python」，而是**把整包 JS 交给 JS 引擎执行**：

```python
with open('得物.js', 'r', encoding='utf-8') as f:
    ctx = execjs.compile(f.read())

first_page_data = {"pageNum": 1, "pageSize": 20}
first_page_sign = ctx.call('cxx', first_page_data)     # ← 直接调包外的壳函数
first_page_data['sign'] = first_page_sign
# …
sign = ctx.call('cxx', data)                           # 每次请求现算
```

三个必须一起带上的东西（缺一个都跑不起来）：

1. **整包 JS 全文**（`!function sign(e){…}({…})` 那一整段）；
2. **尾部调用壳**（`a = (window.b("cnSC"), …)`、`u = window.b.n(a)`、`function cxx(t){…}`）——
   它是「包外」的，不在模块表里，必须和整包一起贴；
3. **一行最小环境** `var window = {}`（源文写在整包之前）。
   这是「让包以为自己在浏览器里」的最小手段；`a.e` 里的 `document` 只要不被调用就不需要补。

**判据（什么时候该用这条路线）**：**包体大、算法深在模块图里、而你只需要少量参数**。
源文正是这种：只想拿一个 `sign`，而 `sign` 的实现埋在第 3 层模块（`cxx` → `aCH8` → `ANhw`/`mmNF`）。

**与 §二 的关系**：`window.b` 让「薄调用壳」这一层几乎零成本
（一行 `require_("aCH8")` 就够，连模块表都不用抄），所以**先查 §二、再决定要不要走 §三**。

## 四、入参形态：签名函数吃「对象」而不是「字符串」

```python
first_page_sign = ctx.call('cxx', first_page_data)   # 传的是 dict
sign = ctx.call('cxx', data)                          # 传的是 dict
```

`cxx(t)` 里对 `t` 做的是 `Object.keys(t).sort().reduce(...)`，
所以**入参必须是「对象」**：`execjs` 的 `ctx.call` 会把 Python dict 自动转成 JS 对象。

- **必须保持同样的入参形态**：**不要自己先 `JSON.stringify`** 再传进去 ——
  那样 `t` 变成字符串，`Object.keys("…")` 得到的是下标数组，拼出来的串完全不同、且**不报错**。
- 同理，宿主侧**不要**替它做「按键名排序」：排序是它内部做的，你排序反而多此一举。
- 推论（可当回归断言）：**签名只依赖对象的内容，不依赖你传 dict 时的键序**；
  但**请求 body 的序列化仍会保留你的插入序**（源文用 `json.dumps(data, separators=(',', ':'))`）。
  两者是两件事，别混。

## 五、与 `node-reuse-and-env-handoff.md` 的分工

两条路都在「node/JS 引擎里跑打包产物」，差别在**你搬了多少东西过去**：

| 维度 | 本文件（整包复用） | `node-reuse-and-env-handoff.md`（抠取后复用） |
| --- | --- | --- |
| 搬什么 | **整包 + 壳**（几 MB 也照搬） | **闭包内的模块 + 最小 prelude** |
| 引擎 | 任何 JS 引擎（源文用 Python `execjs`） | 必须是 node（产物依赖 node 内置模块） |
| 入口 | 包外的壳函数（`cxx`） | `globalThis.__exposedWebpackRequire` |
| 前置动作 | 只要 `window = {}` 一行 | `loader-export` + prelude + `run.js` 骨架 |
| 缺模块的症状 | 不会出现（整包都在） | `Cannot read properties of undefined (reading 'call')` |
| 闭包完整性验收 | **不适用**（没有闭包） | **必须看** `closure` 的 `missing` / `wrap` 的 `null` |
| 环境自吐 | 不适用 | `env-shim.js --print --trace` |

**选择判据**：

- **要长期稳定、并发高、要进 CI** ⇒ 走 `node-reuse-and-env-handoff.md`（抠取）；
- **一次性取数、包体巨大、算法深、只取少量参数** ⇒ 走本文件（整包复用），先拿到结果再说；
- **两条路可以先后用**：先用整包复用**取 oracle**（拿几组「输入 → 正确输出」），
  再用抠取版本**做实现**，最后逐字节对拍。这条组合打法的验收标准见
  `harvest-routes.md` §四「三个必须做的断言」。

⚠️ **不要在同一次任务里既整包复用又抠取** —— 两者混做的后果是
「跑不出结果」的原因不可判（是没抠全，还是壳写错了）。

## 六、代价与适用边界

整包复用的代价是**结构性的**，不是「慢一点」：

| 代价 | 具体表现 | 边界 |
| --- | --- | --- |
| **耦合 JS 引擎** | 需要 `execjs`（或其等价物）+ 一个可用的 JS 运行时 | 环境迁移时最容易断的一环 |
| **并发受限** | `execjs` 每次 `call` 都可能重新编译整包，或需自己维护常驻进程 | 高 QPS 场景不要用这条 |
| **必须带全包** | 产物体积 = 整包体积，站点每次改版都要重新抓一份 | 无「最小化」可言 |
| **改版即失效且无信号** | 模块 id（这里是 `cnSC`/`aCH8` 这类 4 字符串）会整体漂移 | 与 `node-reuse-and-env-handoff.md` §七「产物固化」同一问题 |
| **异步 chunk 是暗雷** | 一旦某个调用路径走到 `a.e`，就需要 `document` / `Promise` 环境 | 目标模块**不依赖异步 chunk** 时才安全 |
| **不产生知识** | 拿到的是可复用黑盒，不是「算法已还原」 | 要还原算法，走 `../../web-reverse-algorithm/SKILL.md` |

**一句话判据**：**当「扣模块的成本 > 每次多跑几 MB JS 的成本」时，才用整包复用。**

## 七、本流水线读码所得：`cxx` 的算式（⚠️ 源文未展开，不是源文结论）

源文**通篇没有分析 `cxx`**，交付形态就是「整包 + Python 壳」。
但**源文贴出的整包里已经含有完整算法**，本流水线读码得到（**未独立执行验证**）：

- `cxx(t) = md5( <按键名升序拼出来的串> + "048a9c4943398714b356a696503d2d36" )`，
  输出是 blueimp-md5 的 `bytesToHex`（**小写 32 位 hex**）；
- 拼接规则（`Object.keys(t).sort().reduce(...)`）：
  - `undefined` 的键**跳过**；`Number.isNaN(v)` 时把 `v` 当空串；
  - 数组：**先 `sort()`**，元素是对象则 `JSON.stringify`，用 `,` 连接；**空数组只拼键名**；
  - 对象：`键 + JSON.stringify(值)`；其余：`键 + 值.toString()`；
  - **键与值之间没有分隔符**，各项之间也没有分隔符。
- `aCH8` 是 blueimp-md5（四个初值 `1732584193 / -271733879 / -1732584194 / 271733878`
  = MD5 初始向量 `0x67452301 / 0xefcdab89 / 0x98badcfe / 0x10325476`，
  四个轮函数 `_ff/_gg/_hh/_ii`，`_blocksize=16`、`_digestsize=16`），
  依赖 `ANhw`（words/bytes 转换）、`mmNF`（utf8/bin）、`BEtg`（isBuffer）。

**这解释了「为什么源文要交付整包」**：算法本身是标准 MD5，但**拼接规则藏在
`Object.keys(...).sort().reduce(...)` 这个 20 行的壳里**，而 MD5 又在第 3 层模块 —— 抠比搬贵。

⚠️ **纪律**：以上是**读码结论**，不是源文结论，也**没有实跑对拍**。
源文未给任何 `sign` 示例值，因此**无法验证**。
若要用它，必须先按 `harvest-routes.md` §四做端到端数值对拍。

## 八、源文登记：缺陷、未复核与留白

**源文缺陷（不要照抄）**

- 🔴 **模块表里有重复键 `aCH8`**：第 589 行与第 738 行**逐字节相同**（119 行 ×2）。
  这是源文贴码产生的**重键**（JS 对象字面量重复键「后者生效」，此处两份相同所以无副作用），
  **不是运行时真有两套实现**。⇒ 用这份粘贴产物做实验时，别把它当成「两个模块」。
- 🔴 `names_to_find = ['精选','鞋类','女装','数码','美妆','家居','手表','包袋','配饰','潮玩','女装']`
  —— **`女装` 出现两次**（下标 2 与下标 10），所以提示语里的「2.女装 / 10.女装」是同一个类目。
  这是**业务枚举表的复制粘贴错误**，与逆向无关，但会影响「编号 → 类目」的映射。
- 🔴 `price = str(index['price'])[:-2]`：靠**砍掉最后两个字符**把「分」当「元」。
  源文未说明该字段的单位，属于**未复核的字段语义**。
- 🔴 CSV 表头判断 `first_line.strip() != ','.join('得物.csv')` 是把文件名当字段名拼，
  **永远为真**（`','.join('得物.csv')` = `得,物,.,c,s,v`），所以表头每次都会写。
  纯业务代码缺陷，登记备查。

**登记为「源文做法、与逆向无关」**

- **业务枚举表**：类目名 → 数字编号（0–10）→ 先请求
  `…/category-pick/mapping` 拿到 `checkRespDTOList`，按 `name` 匹配取 `pickId`，再当 `pickRuleId` 用。
  这是**两级映射**（本地编号 → 类目名 → 服务端 `pickId`），不是签名的一部分。

**未复核 / 留白（源文未给，不要臆测）**

- **没有任何 `sign` 示例值** ⇒ §七 的算式无法对拍。
- `048a9c4943398714b356a696503d2d36` 这个 32 位 hex 常量是**盐值**还是别的什么，源文未说明。
- `a.e` 引用的异步 chunk（`static/chunks/31.ecac32f99e0ca09d21e6.js`、`32.a463ab2b110615917c04.js`）
  在源文里**没有给出内容**；目标调用路径是否触达它们，未验证。
- `ltk` 请求头（源文给了示例值）的生成方式未说明；`ltk` 是否为必需，未验证。
- 源文未说明请求 `Referer`/`Origin` 是否必需（只给了值）。
