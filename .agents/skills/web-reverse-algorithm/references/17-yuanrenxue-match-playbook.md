# 猿人学爬虫攻防赛：题型索引与可迁移判据集

> **来源**：`docs/references/52pojie-1288315`（漁滒，2020-10-21，第 1–9 题逐题讲解，含第 9 题反混淆后整份 JS）、
> `docs/references/52pojie-1469419`（天空宫阙，2021-07-02，第 6 题 node 补环境 + express/execjs 两种调用）、
> `docs/references/52pojie-1487946`（天空宫阙，2021-08-03，第 16 题 btoa 重写蜜罐）。
>
> **本文的定位**：`01-decision-tree.md` 解决「这题属哪族」，`15-call-site-locating-playbook.md` 解决
> 「加密发生在哪一行」，`16-ciphertext-structure-diagnostics.md` 解决「只有一段密文时先读什么」。
> 本文解决的是**跨题复用**：把「猿人学 1–9 / 16 题」当作**题型样本集**，抽出**题型 → 定位手法 → 算法 →
> 可迁移判据**这张索引表，让「遇到同型现象时该先做哪一步」变成可查的清单，而不是逐题流水账。
>
> **一句话**：**先按「请求侧 / 响应侧 / 环境侧」把题定位到一条线，再套对应判据；判据的复用价值远大于任何一题的具体答案。**

---

## §0 何时用本文

出现下列任一信号时，先翻本文再动手：

- 目标是**比赛题 / 练习靶场**（猿人学、攻防赛一类），题面已按「js 混淆 / 字体反爬 / 验证码 / 访问逻辑」分好类；
- 抓到包里出现**一个突兀的加密参数**（`m` / `q` / `RM4hZBv0dDon443M` / `window.f` / cookie 名 `m`），
  想知道它属于「拼接串」「整体加密」还是「累积历史」；
- 页面**首访返回一段 script**（无 `Set-Cookie`、`Preview` 为空）而后续请求凭空多出一个 cookie；
- 接口参数**平平无奇**，但抓下来的 HTML 里数字是图 / 是乱码 / 数量对不上；
- 一段 JS **只用自己产出的值做校验**，本地能跑、喂回服务端却不认（疑似蜜罐）。

**与其它文档的分工**（不要重复读）：

| 你卡在 | 读哪份 |
| --- | --- |
| 这题属哪族 / 阻塞点判断 | `./01-decision-tree.md` |
| 「加密发生在哪一行」还没钉死 | `./15-call-site-locating-playbook.md`（唯一权威源） |
| 手上只有一段密文，先读什么 | `./16-ciphertext-structure-diagnostics.md`（唯一权威源） |
| 具体算法族（AES/RSA/MD5 变体）怎么复算 | `./02-algorithm-families.md`、`./12-login-and-account-params.md` |
| 动态字体 / 雪碧图的完整还原方法 | `../../web-font-obfuscation/SKILL.md` |
| 图文点选 / 坐标换算 / 成功样本基线 | `../../web-verify-patcher/SKILL.md` |
| 补环境补到什么程度 | `../../web-js-env-patcher/SKILL.md` |
| OB 混淆（含 jsjiami v5）识别与变体还原 | `../../ast-deobfuscation/references/ob-variant-taxonomy.md` |

> **本文不复制**上面这些文档的表格，只登记「在猿人学这一族里，哪条判据被反复验证过」。

---

## §1 主表：题型 → 定位手法 → 算法 → 可迁移判据

> 覆盖源文正文可复算的题：第 1/2/3/4/5/6/7/8/9 题（源文 `52pojie-1288315`）+ 第 16 题（源文 `52pojie-1487946`）。
> 「算法」一列写的是**源文给出的复算口径**；「判据」列指向本文 §2 的条目。

| 题 | 源文题型标注 | 定位手法（源文） | 算法 / 机制（复算口径） | 判据 |
| --- | --- | --- | --- | --- |
| 1 | 接口-查询参数-值加密 | 全局搜 `api/match/1` → 格式化该 `<script>` → 找 `oo0O0`；控制台跑 `atob(window['b'])` | `m = MD5(ms 时间戳) + '丨' + 秒时间戳`（`oo0O0` 返回空串，值全由 `window.f` 决定） | §2.1、§2.2 |
| 2 | 接口-请求头-值加密（动态 cookie 1） | 无痕 + `Preserve log`；带 / 不带 cookie 各访问一次 | cookie `m = MD5(ms 时间戳) + '\|' + ms 时间戳`，`ts = Date.parse(new Date())` | §2.3、§2.4 |
| 3 | 访问逻辑 | 无痕 + `Preserve log`；全局搜 `sessionid` → 来自 `POST /logo` 的 `Set-Cookie` | 服务端校验 `Accept-Language` / `Cookie(sessionid)` / `Referer` 三个头 | §2.5 |
| 4 | 响应-字体反爬-CSS反爬 | 源文原话：「接口没有设置任何反爬，直接获取数据即可」 | 响应侧：`class` 里 32 位 hex = `MD5(btoa(key+value).replace(/=/g,''))` 标记隐藏图；`style:left` 定序；base64 `src` → 数字字典 | §2.6 |
| 5 | 接口-查询参数+请求头-值加密 | 搜 `RM4hZBv0dDon443M` 无果 → 格式化主页 → OB 反混淆 → 在三处 `eval` 前下断点取解密后代码 | 查询 `m`/`f`；cookie `RM4hZBv0dDon443M = base64(AES-ECB/PKCS7(逗号拼 5 个值))`，**key = base64(m 去掉末位)** | §2.7、§2.8 |
| 6 | 接口-查询参数-值加密（js 混淆-回溯） | 全局搜 `api/match/6` → 断在 `t` 生成处 → 进 `r` → `pf.js` | `m = encodeURIComponent(RSA(count + "\|" + 时间戳))`；`q` 累积 `count-时间戳\|` | §2.9、§2.10 |
| 7 | 响应-字体反爬-字体映射文件 | 直接抓接口（无请求侧反爬） | 响应带 base64 `woff`；`cmap`(code→name) + `glyf`(轮廓首点→数字) | §2.11 |
| 8 | 接口-验证码-文字点选 | f12 抓包；`sessionid` 来自 `Set-Cookie` | 图片上是 30×30 个 `div`，每个对应一个序号；答案 `0\|310\|…` | §2.12 |
| 9 | 接口-请求头-值加密（动态 cookie 2） | Fiddler 抓第一次响应（不带 cookie 时返回 script） | `m = "2" + res`，`res = decodeURIComponent(RSA(1603414848))`；RSA 实现在外部 `udc.js` | §2.4、§2.13 |
| 16 | （题名「window 蜜罐」） | XHR 断点关键词 `/api/match/16`，往前追几个栈 | `m = btoa(ms 时间戳)`，但 **`btoa` 被重写**（自洽蜜罐） | §2.13 |

**一句话读表法**：第 1/2/5/6/9 题都在**请求侧**（参数或 cookie），第 4/7 题在**响应侧**，第 8 题在**交互侧**，
第 16 题在**环境侧**。**先判线，再套判据** —— 第 4 题就是「把请求侧翻遍也找不到算法」的典型，因为算法根本不在请求侧。

---

## §2 可迁移判据详解

### §2.1 ★ `m` 参数里的分隔符 `丨`（U+4E28）：先按「拼接串」拆，别按「整体加密」读

第 1 题原文（骨架，已截断）：

```javascript
var timestamp = Date.parse(new Date());
var m = oo0O0(timestamp.toString()) + window.f;
var list = {
        "page": window.page,
        "m": m + '丨' + timestamp / 1000
};
```

- `oo0O0(...)` 的返回值是**空串**（源文明说「oo0O0 函数的返回值是一个空值，也就是说 m 的值完全由 window.f 决定」）；
- 最终 `m = window.f + '丨' + timestamp/1000`，而 `window.f = hex_md5(mwqqppz)`，`mwqqppz` 被替换成传入的时间戳字符串；
- 所以 **`m` = `MD5(毫秒时间戳)` + `丨` + `秒时间戳`**，两段用 **`丨`（U+4E28，CJK 竖线）** 拼接。

**判据**：**参数里出现竖线类分隔符（`丨` / `|` / `｜`）时，先按「拼接串」拆成
`[前半段：密文/哈希] + [分隔符] + [后半段：常为明文时间戳]`，而不是把它当成一整段密文去解。**
拆完之后两段各自处置：前半段找算法（这里退化成 `MD5`），后半段直接是输入。

**同族对照（跨题验证）**：

| 题 | 拼接形态 | 分隔符 | 前半段 | 后半段 |
| --- | --- | --- | --- | --- |
| 1 | 查询参数 `m` | `丨` U+4E28 | `MD5(ms)` | 秒时间戳 |
| 2 | cookie `m` | `\|` ASCII | `MD5(ms)` | ms 时间戳 |
| 6 | RSA 明文 `i` | `\|` ASCII | `count` | 时间戳（顺序在 `encode` 里是 `time + "\|" + pwd`） |

> **⚠️ 别把 `丨`（U+4E28）当成 ASCII `|`**：两者字形相近、码位不同。抄串时若把 `丨` 写成 `|`，
> 服务端校验必失败，且报错信息通常只显示「参数错误」。与 `15-*` §8 的「抄串先搜 `&#` 实体」同族——
> **语料/页面渲染会骗你的眼睛，抄串先确认码位。**

### §2.2 ★ 属性名拼接混淆：成员访问方括号里是「加法表达式」

第 1 题 `oo0O0` 的循环体（骨架，已截断）：

```javascript
for (var i = 0, len = window.a.length; i < len; i++) {
        window.b += String[document.e + document.g](window.a[i][document.f + document.h]() - i - window.c)
}
```

- `String[document.e + document.g](...)`：属性名 `fromCharCode` 被拆成 **`document.e + document.g`** 两段相加；
- `window.a[i][document.f + document.h]()`：方法名 `charCodeAt` 同理被拆成 `document.f + document.h`；
- `window.c` 是一个数字偏移。

**识别信号**：**成员访问的方括号里不是字面量，而是一个加法表达式**（`obj[expr + expr]`）。
这类混淆不改变语义，只让「搜字符串」失效——你搜 `fromCharCode` 搜不到，因为源码里根本没有这个词。

**处置**：**先把 `document.<x>` / `window.<y>` 这类「常量变量」还原，再读代码。**
在控制台逐个打印 `document.e`、`document.f`、`document.g`、`document.h`、`window.c`、`window.a`，
把 `obj[document.e + document.g]` 手写成 `obj["fromCharCode"]`。
> ⚠️ 源文对这几个常量的**具体取值只给了截图、正文未复算** ⇒ 本文件登记「是属性名拼接混淆、处置是先还原常量」，
> **不登记它们的取值**。

**同族：内联 RC4 字符串表**。同一题的 `oo0O0` 里还有一段：

```javascript
var U = ['W5r5W6VdIHZcT8kU', 'WQ8CWRaxWQirAW=='];
var J = function(o, E) { o = o - 0x0; var N = U[o]; /* … 256 轮 KSA + charCodeAt ^ T[…] … */ };
// …
eval(atob(window['b'])[J('0x0', ']dQW')](J('0x1', 'GTu!'), '\x27' + mw + '\x27'));
```

- `J(o, E)` 是**字符串表解密器**：`U` 是密文数组，`E` 是 RC4 密钥，`o` 是索引；
- 源文做法：**把 `J` 那段整段贴进控制台，再逐个调用 `J('0x0', ']dQW')` / `J('0x1', 'GTu!')`**，
  直接读出明文 `"replace"` / `"mwqqppz"`，从而把 `eval(...)` 还原成
  `eval(atob(window['b']).replace("mwqqppz", "'" + mw + "'"))`。

**判据**：看到「一个数组 + 一个按下标取数组元素、并用第二参数做 RC4 解密」的函数 ⇒ 是字符串表。
**不要静态读 RC4，直接在控制台逐项调用**（与 `../../ast-deobfuscation/references/string-array-and-minimal-eval.md` 同族）。
还原后即可看清 `eval` 到底在 eval 什么 —— 本例中 `atob(window['b'])` 是一整份 **MD5 实现**，
末尾一句 `window.f = hex_md5(mwqqppz)` 才是 `window.f` 的真身。

**★ 两个实现细节（B37 补，源文 §2.2 未展开）**：

1. **密文在进 RC4 之前先过了「自定义 base64」+ 一次 `decodeURIComponent` 往返**（源文 `Y()` 与 `t()` 逐字）：

   ```javascript
   w = Y(w);                                             // Y = 自定义 base64 解码
   for (var R = 0x0, v = w.length; R < v; R++)
       W += '%' + ('00' + w.charCodeAt(R).toString(0x10)).slice(-0x2);
   w = decodeURIComponent(W);                            // ★ 这一句最容易漏
   ```

   ⇒ **`%XX` 往返 = 「把每个字节重新按 UTF-8 解释一遍」**。
   移植到 Python 时**不能只做 base64 解码**，还要补
   `urllib.parse.unquote(bytes(...).decode('latin-1'))` 这一步。
   ⚠️ **漏掉的症状是「RC4 解出来全是乱码、也不报错」**。
2. **`J` 的两个实参都是密钥**（`J('0x0', ']dQW')` / `J('0x1', 'GTu!')`）⇒
   **同一个 `J` 能解出多组不同明文**，所以不能给 `J` 硬编码一个 key。

### §2.2b ★★★ 源文附录的 MD5 实现**有 6 处常数抄错**（B37 复算，会失败的断言）

第 1 题的最终算法是 `window.f = hex_md5(时间戳)`，而 `hex_md5` 的源码就在源文附录里
（完整 64 步 + `md5_vm_test()` 自检）。**直接照抄会算错。**

**本库机械比对的结果**（脚本 `artifacts/skill-evolution/tools/b37-md5-const-check.js`，
判据用**源文自己那行 `md5_vm_test()`**）：

| 步序 `i` | 源文字面量 | 标准 MD5 `T[i]` | 差值 |
| --- | --- | --- | --- |
| 0（`md5_ff` 第 1 步） | `-680976936` | `-680876936` (`0xD76AA478`) | **−100000**（多写一个 `0`） |
| 12 | `1804660682` | `1804603682` (`0x6B901122`) | +57000 |
| 31 | `-1921207734` | `-1926607734` (`0x8D2A4C8A`) | +5400000 |
| 42 | `-722881979` | `-722521979` (`0xD4EF3085`) | −360000 |
| 49 | `11261161415` | `1126891415` (`0x432AFF97`) | **多一位数字，已 > 2^32** |
| 53 | `-1894446606` | `-1894986606` (`0x8F0CCC92`) | +540000 |

**实测结论（两版各跑一次源文自带的锚点）**：

```text
标准常数版 hex_md5("abc") = 900150983cd24fb0d6963f7d28e17f72   ← 锚点通过
源文常数版 hex_md5("abc") = 215292d4f5aa7b84352e7c928c1dc7a6   ← ✗ 不是锚点值
```

> ★★★ **三条可迁移判据（这是本节最值钱的部分）**：
> 1. **长数字抄录错误是「合法 JS」且「静默的」**：`11261161415` 已超 `2^32`，
>    但 JS 里它**照样参与运算**（`safe_add` 会把它当浮点/大整数继续算），
>    **不抛错、不警告，只是结果变成另一个 32 位 hex**。
>    ⇒ **判据：凡是源文贴出的算法里出现「明显超出位的常数」，立刻按「抄写错误」处理。**
> 2. **源文自己带了自检断言（`md5_vm_test()`），但它贴的常数通不过自己的断言。**
>    ⇒ **可迁移动作：拿到任何「源文附带的完整算法实现」，
>    第一步先跑它自带的自检/样例；没有自检就自己造一个已知输入（这里 `"abc"` 是 MD5 的经典向量）。**
>    这一步成本是零，能直接判死活。
> 3. **标准常数表可以「按公式重算」而不必背**：`T[i] = floor(2^32 * |sin(i+1)|)`。
>    ⇒ **不要手抄 64 个常数**；从公式生成，或从任一可信实现拷。
>
> ⚠️ **登记口径**：本条**不改变第 1 题的结论**（`m = MD5(ms时间戳) + '丨' + 秒时间戳` 仍成立），
> 只说明**源文附录那份实现不能直接用**；实际复现走
> `hashlib.md5(str(ms_timestamp).encode()).hexdigest()` 即可。

### §2.3 ★ 动态 cookie 的定位入口不是 cookie 本身

**固化步骤（第 2 / 9 题共同验证）**：

1. 用**无痕模式**（避免旧 cookie 干扰）+ 勾 `Preserve log`；
2. **带 cookie 访问一次**，再**清 cookie 访问一次**；
3. 观察：**第一条请求的响应头没有 `Set-Cookie`、`Preview` 为空**，但后续请求凭空多了 cookie；
4. ⇒ 结论：**cookie 由页面内 script 写的**（第 2 题 `_0x165f49` 里就是
   `document["cookie"] = "m" + … + "|" + … + "; path=/"; location["reload"]();`）；
5. ⇒ 回退到**用 Fiddler / 代理抓「第一次那个响应体」**（DevTools 里它可能被 `location.reload()` 冲掉），
   对这段 script 做 OB 反混淆，再取算 cookie 的函数。

**判据**：**动态 cookie 的定位入口不是 cookie 本身，而是「不带 cookie 时服务端返回的那段 script」。**
只要确认「无 `Set-Cookie` + `Preview` 空 + cookie 却出现了」，就不要再盯着 cookie 值找生成点，
直接去抓首访响应体。

**第 9 题同型**：源文「不带 cookie 的时候访问会返回一段 script，然后通过这段 script 代码计算出 cookie」——
与第 2 题同一入口，只是 script 结构更复杂（见 §2.13）。

### §2.4 服务端只校验固定头 + 一个下发 session（第 3 题）

源文口径：「服务器检验的请求头的三个参数【Accept-Language】【Cookie】【Referer】自行多次测试可以发现」。

- `Accept-Language` / `Referer` 是**固定值**；
- `Cookie` 里的 `sessionid` 来自 **`POST http://match.yuanrenxue.com/logo` 的 `Set-Cookie`**。

**判据**：**「自行多次测试」= 逐个头删掉重发，看哪个头删了才失败。**
把结果分成两类：**服务器下发**（`sessionid`，不能算）与**固定值**（`Accept-Language` / `Referer`，写死即可）。
这与 `12-login-and-account-params.md` 的「`formhash`/`csrf`/`execution` 是服务器下发、不要试图算」是同一条纪律。

### §2.5 「接口本身没有反爬」的题：把注意力从请求侧转到响应侧（第 4 题）

源文原话（值得原样记住）：**「第四题接口没有设置任何反爬，直接获取数据即可」**。

难点全在**响应侧**。源文给出的响应片段（骨架）：

```html
<td>
  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAd…" … />
  <img class="img_number 6c7ac088bd56d619f1bbcc2aee9facea" style="left: 11px;"  />
  <img class="img_number 6c7ac088bd56d619f1bbcc2aee9facea" style="left: -11px;" />
  <img class="img_number 6c7ac088bd56d619f1bbcc2aee9facea" style="left: 0px;"  />
</td>
```

对应前端 `success` 回调（原文）：

```
success: function(data) {
        datas = data.info;
        $('.number').text('').append(datas);
        var j_key = '.' + hex_md5(btoa(data.key + data.value).replace(/=/g, ''));
        $(j_key).css('display', 'none');
        $('.img_number').removeClass().addClass('img_number')
}
```

拆解出的三个机制：

1. **数量问题**：`class` 里的 32 位 hex = `MD5(btoa(key + value).replace(/=/g,''))`；与该 md5 相等的图片
   被 `$(j_key).css('display','none')` **隐藏**（即「多余的图」）；
2. **顺序问题**：`style: left` 有正有负 ⇒ 返回顺序 ≠ 显示顺序，**按 `left` 值重排**；
3. **数值问题**：每张图 `src` 是唯一 base64 ⇒ 建「base64 → 数字」静态字典。

**判据**：**参数平平无奇时，把注意力从请求侧转到响应侧。** 具体动作：
- 在页面里搜 `'display', 'none'`（或 `.css('display'`）找**隐藏逻辑**；
- 看到 `class` 里带 **32 位 hex** ⇒ 去 JS 里找它怎么算出来（这里又被套了一层 `MD5(btoa(...))`，见 §2.7）；
- 看到 `style: left/top` 带**正负偏移** ⇒ 先假设「返回顺序被 CSS 打乱」，按偏移重排。

> 这条判据的价值：**它阻止你在请求侧空转**。第 4 题若一开始就去「找加密参数」，会一无所获——
> 因为它压根没有加密参数。

### §2.6 乱码增强：查询参数 + 请求头**双加密**，且用同一值当密钥（第 5 题）

源文观测：cookie 有 **`m` 和 `RM4hZBv0dDon443M` 两个**加密参数，查询参数有 **`m` 和 `f`**（都像时间戳）。

复算口径（源文 Python）：

```text
m = str(int(time.time()*1000))          # 13 位毫秒时间戳
f = str(int(time.time()))+'000'         # 13 位（秒 + '000'）
# 5 个值：第 1 个 = b(f)，第 2–4 个 = b(比 f 大的数)，第 5 个 = b(m)
data = ",".join([...5 个值...])
key  = base64(m[:-1])                    # ← 去掉 m 最后一位再 base64
RM4hZBv0dDon443M = base64(AES_ECB_PKCS7(data, key))
cookie = 'm=' + b(m) + '; RM4hZBv0dDon443M=' + RM4hZBv0dDon443M
```

**★ 判据（本族最值钱的一条）**：**同一个值同时出现在「查询参数」与「cookie 密文的密钥来源」两处时，
先怀疑它是密钥材料。** 这里 `m`（13 位时间戳）去掉末位后 base64 就是 AES 的 key —— 也就是说
**查询参数 `m` 既是明文参数、又是 cookie 密文的密钥**。与 `15-*` §4.1「响应下发的 Cookie 既是加密输入、
又是请求头」是同一族问题：**一个值被两处消费时，先把它标成「会话/密钥」而不是「待算的密文」。**

**定位手法（源文）**：主页里有一段混淆代码，OB 反混淆后发现是三选一的 `eval`：

```javascript
function _$KS() {
  V();
  if (eval["toString"]() === "function eval() { [native code] }") {
    if ($_zw["length"] === 25) { /* 分支 A：charCodeAt() - (len+1)*3 - … */ }
    else                       { /* 分支 B：charCodeAt() - 78 - parseInt(h.toString().slice(0,1))*2 */ }
  } else                       { /* 分支 C：charCodeAt() - 2331 - … */ }
}
```

- **做法**：**在三个 `eval` 前各下一个断点**，刷新 → 断住后在控制台输入 `eval["toString"]()` 与 `$_zw["length"]`，
  判断当前走的是哪一支 → 再在控制台把该分支的 `for` 循环贴出来执行，**直接拿到解密后的 JS**；
- 得到明文 JS 后即可搜到 `RM4hZBv0dDon443M`；源文另用「控制台不断打印『世上无难事，只要肯放弃』」这条
  **可点击的字符串**反查到代码块位置。

**判据**：**多个分支的 `eval` ⇒ 先在每个 `eval` 前下断点，再用运行期值（`eval.toString()` / 某长度）判定走哪支**；
不要静态去猜分支。反混淆产物拿到后，**继续用「搜一个只属于业务的可读字符串」反查业务函数**（这里就是那句打印）。

### §2.7 修改常量版 MD5 / 32 位 hex 不等于裸 MD5（第 4、5 题）

- 第 4 题：`j_key = MD5(btoa(key + value).replace(/=/g,''))` —— **32 位 hex 是「btoa 去等号后再 MD5」**；
- 第 5 题：`b()` 函数是**改过常量的 MD5**。与标准 MD5 的差异（源文代码可见）：
  - 首轮常量写成 `513548`（标准是 `-680876936`）；
  - 用 `_$8K['_$6_']` 当某轮常量（有 `try/catch` 赋不同值：`8821003647` / `37885443` / `-389564586`）；
  - 有 `-1530992060 * (b64pad)` 这种「常量被变量乘过」的写法。

**判据**：**看到 32 位 hex 不要默认「裸 MD5」**，先按 `16-ciphertext-structure-diagnostics.md` §4 的四类 MD5 变体逐一排除：
加盐 / 双次 / 截断 / **常量被改**。第 5 题就是最后一类——**用标准 `hashlib.md5` 永远算不对**，
只能把改过的函数整段扣出来跑。

### §2.8 node 补环境路线：补到「值对齐」即止，两种调用形态（第 6 题）

第 6 题 `m = r(t, window.o)`，`r` → `z` → `JSEncrypt.encode(pwd, time)`：

```javascript
n.prototype.encode = function (t, e) {
    var i = e ? e + "|" + t : t;                  // ← 顺序：time + "|" + pwd
    return encodeURIComponent(this.jsencrypt.encrypt(i));
}
```

⇒ **`m = encodeURIComponent(RSA(count + "|" + 时间戳))`**，公钥是硬编码的 `-----BEGIN PUBLIC KEY-----MIGf…`。

**源文明确列出的四个坑**（逐条可迁移）：

1. **反混淆后发现 `window.o = 1`，但后面没用到 ⇒ 直接删**（混淆代码里的「死赋值」）；
2. **node 没有 BOM ⇒ `window` 用不了 ⇒ 在 JS 最前面加 `window = global;`**；
3. **中间有一句代码把第 2 步加的 `window` 重置掉 ⇒ 注释 / 删掉那一句**；
4. **`xe` 参数被混淆，控制台还原为 `false` ⇒ 换回 `false`**，否则 RSA 会报「内容长度太长」。

**★ 补到什么程度算够（判据）**：**值对齐即止。** 源文 06.js 的补环境只有三行：

```javascript
window = global;
window.o = 1;
navigator = { "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) … Chrome/91.0.4472.114 …" };
```

即：**让 `window.o` 的初值与浏览器一致、让 `navigator.userAgent` 有值**，其余靠 `global` 兜底。
不必上 `canvas`/`webgl`/完整 DOM —— 这类题不是环境检测题，是「加密函数依赖 `window` 这个名字」而已。

**两种调用形态（源文 1469419 给出，可对照选型）**：

| 形态 | 形态要点 | 源文实测限制（单样本，未复核） |
| --- | --- | --- |
| **express 服务** | `server06.js` 用 `express` + `body-parser`，`app.post('/encrypt')` 里调 `encparams.get_m(timestamp, count)`；Python 用 `requests.post('http://localhost:3000/encrypt', data={...})` | **每 5 次需要重启服务**才能拿到数据 |
| **execjs** | `getSign = execjs.compile(jstext)`；`getSign.call('get_m', timestamp, count)` | **有编码问题** |
| **os.popen** | `node 06 <ts> <count>` 读 stdout | **只有第一次能拿到数据** |

**判据（本族最值钱的一条）**：**魔改过的加密函数可能带「跨调用的隐藏状态」** ——
源文的三个限制（express 第 5 次失效 / `os.popen` 只第一次有效 / execjs 编码问题）指向同一件事：
**函数内部改了全局变量**（源文自述猜测「这个魔改版的 RSA 每次加密有改变全局变量，5 次后加密结果就不正确」）。
⇒ **批量调用时给「同一进程用几次就重启」设边界**；`express` 常驻进程反而**更快触发**这个上限。
源文自己写「如果有大佬知道为什么还请不吝赐教」⇒ **本条登记为「源文猜测、单样本、未复核」**。

**配套判据（源文学习笔记）**：
1. **爬虫尽可能模拟浏览器** —— 例如 `q` 的拼接（见 §2.9）；
2. **node 环境调试时，重点盯对 `window` / `global` 操作的地方，以及 `try...catch`** ——
   `try/catch` 是环境差异最常被藏身之处（第 16 题的蜜罐也在 `try...catch`，见 §2.13）。

### §2.9 累积历史参数 `q`：「回溯」型参数必须按请求顺序生成（第 6 题）

源文 Python：

```python
q = ''
for page in range(1, 6):
    count += 1
    timestamp = int(time.time()) * 1000
    m = get_m(timestamp, str(count))
    q += f'{str(count)}-{timestamp}|'
    params = {'page': page, 'm': m, 'q': q}
```

- `q` 是**逐页累积**的 `count-时间戳|` 串（第 1 页 `1-…|`，第 2 页 `1-…|2-…|`，依此类推）；
- 题目名「js 混淆 - 回溯」正是指这个**历史记录**；源文另注明 **「服务器端严格了 q 的校验」**。

**判据**：**参数形如 `a-b|c-d|…`（多段历史记录）时，它是会话级累积状态，必须按请求顺序生成，
不能每页独立算。** 与之配套：**`q` 里的时间戳必须与 `m` 里的时间戳同源**
（不要把 `q` 的 ts 和 `m` 的 ts 写成两次 `Date.now()`，跨毫秒就不一致 —— 同 `15-*` §4.2）。

### §2.10 动态字体「随风漂移」（第 7 题）→ 与字体技能分工

源文：**直接抓接口，请求时没有反爬**；响应里的值是以空格分隔的字符串，另有 **base64 的 woff 文件**。
还原思路（源文四步）：`TTFont('07.woff').saveXML('07.xml')` → `cmap` 给出「响应码位 → name」→
`glyf` 给出「name → 轮廓」→ **用轮廓的前几个点判定数字**（源文用 `pt[0]['@x']` 等硬编码阈值）。

**判据**：
- **响应体里出现 base64 的 `woff`/`ttf` ⇒ 立刻转字体线**，不要在请求侧找算法；
- **字体每次请求都变 ⇒ 不能用静态映射表**，要用**字形轮廓指纹**（与 `web-font-obfuscation` 的
  「稳定性分析 / 轮廓指纹抵抗轮换」一致）；
- 源文那套**首点阈值表**（`300`/`171`、`297`、`310`/`202` …）是**针对该题字体的经验值**，**不具备跨站迁移性** ⇒
  本文件只登记「用轮廓首点判定」的方法，**不复刻阈值**。

**分工**：识别、`cmap`/`glyf`/`post` 解析、两层映射、稳定性分析、雪碧图 / `background-position` 还原、
`left` 偏移位移换序的**完整方法**在 `../../web-font-obfuscation/SKILL.md`（先读其 `../../web-font-obfuscation/references/font-cmap-decode.md`）。
本文件只登记「第 7 题属于字体反爬、且随风漂移」这一句。

### §2.11 图文点选：先找「点击坐标 → 参数」的换算（第 8 题）→ 与验证码技能分工

源文要点：
- 需要点击的文字在**第二个 `div`**，验证码图片在**最后一个 `img`**；
- **图片上是 30×30 个 `div`，每个 `div` 代表一个序号** ⇒ 通过序号就知道点的是哪个地方；
- 源文「一律按照点击图片左上角第一个 `div`」——即**只取每个文字所在格子的左上角点**，是取巧而非通用换算；
- 答案形态 `0|310|…`（源文 `clicklist = [0, 10, 20, 300, 310, 320, 600, 610, 620]`）；
- `sessionid` 来自 `Set-Cookie`，提交时带上；源文用**图像预处理 + 腾讯云通用手写体 OCR** 识别
  （源文自述「题目要求不能用打码平台」，其个人少量需求用了腾讯云 OCR）。

**判据**：**点选类先找「点击坐标 → 提交参数」的换算**（这里是 30×30 网格序号），
把坐标参数的形态（`x|y|…`）先记下来，再谈识别。识别是后一步。

**分工**：验证码类型 / 厂商识别、坐标换算、**成功样本基线采集**、轨迹生成、打码平台请求模板、
失败复盘与方案切换的**完整流程**在 `../../web-verify-patcher/SKILL.md`。本文件只登记「第 8 题是图文点选、
坐标来自 30×30 网格序号」。

### §2.12 OB 三段 script 的结构（第 9 题）

源文：「这段代码由**三段 script 代码**组成，复制**第二段**代码到 ob 混淆专解测试版 V0.1」。
第二段里同时含三类东西（骨架，已截断）：

```javascript
// ① 反调试 / 自检：用 constructor 做正则自检
var _0x389c3c = _0x5d195(this, function () {
    var _0x4008ad = function () {
      var _0x2a79aa = _0x4008ad["constructor"]("return /\" + this + \"/")()["compile"]("^([^ ]+( +[^ ]+)+)+[^ ]}");
      return !_0x2a79aa["test"](_0x389c3c);
    };
    return _0x4008ad();
});
// ② 保活：定时器 + 死循环 debugger
setInterval(function () { $_0x1ffae4(); }, 4000);
function $_0x1ffae4(_0xb714e3) { /* … ("while (true) {}")["constructor"]… / "debugger" … */ }
// ③ 业务：写 cookie，值 = 定值 "2" + res
for (var _0x37c17b = 1; _0x37c17b <= 2; _0x37c17b++) { res = decrypt(1603414848); }
document["cookie"] = "m=" + (_0x37c17b - 1)["toString"]() + res + "; path=/";
```

- **业务值**：`m = "2" + res`（`(_0x37c17b - 1) = 2`，源文明说「前面的就是一个定值【2】」），
  `res = decrypt(1603414848)`；
- **`decrypt` 的实现不在本段**：源文「搜索 `decrypt` 函数，发现里面并没有实现方法」⇒
  回到页面看 `<script src>`，发现外部 **`…/match9/udc.js`**；该文件是 **v5 混淆**
  （`jsjiami.com.v5`），反混淆**耗时十多秒**；还原后是
  `encodeURIComponent(new JSEncrypt().setPublicKey(<固定公钥>).encrypt(x))`。

**判据**：
1. **一段 script 同时含「自检 + 定时器 + 写 cookie」⇒ 先跑 OB 反混淆工具，再读**（不要在混淆态硬啃）；
2. **反混淆产物可能有小 bug**：源文第 9 题修了一处 `_0x28fced` 初始化（补 `_0x198bd8 = 0`）。
   口径是 **「跑 → 报错 → 回浏览器对拍」**，而不是「相信反混淆器 100% 正确」；
3. **`decrypt` 搜不到实现 ⇒ 去页面看 `<script src>`**（与 §2.3 的「回退抓首访响应体」同族：**函数可能根本不在当前文件里**）。

**分工**：OB（含 jsjiami v5）的识别与变体还原在 `../../ast-deobfuscation/references/ob-variant-taxonomy.md`
与 `../../ast-deobfuscation/references/obfuscation-detector.md`。本文件只登记「第 9 题属于 OB 三段结构、
反混淆后是 JSEncrypt RSA」。
> ⚠️ 源文只说「由三段组成」并**只贴了第二段**，**未逐段标注每段职责** ⇒ 本文件按**该段实际含有的三类代码**
> （自检 / 保活 / 业务）描述，**不声称「第一段=反调试、第三段=业务」这种段号-职责映射**。

### §2.13 ★ 蜜罐判据：只用自己产出的值做校验 ⇒ 先怀疑它是蜜罐 / 纯装饰（第 16 题）

第 16 题定位：XHR 断点关键词 `/api/match/16`，往前追几个栈；`m` 由时间戳调 `btoa` 生成，
但源文原话：**「此处的 btoa 被重写，这大概就是为什么题目的名字叫 window 蜜罐」**。

重写实现要点（源文）：自定义字符表
`"U9876543210zyxwvutsrqpomnlkjihgfdecbaZXYWVUTSRQPONABHICESQWK2Fi+…"`，并调用 `windows.md5` 与 `d` 两个函数。

**源文踩坑全过程（这是本判据的来源）**：

1. 按「缺啥补啥」把 `md5` 和 `d` 都扣出来 ⇒ **能跑，但不能通过验证**；
2. 「需要进行**回溯**比较浏览器和 node 环境 `btoa` 的结果」⇒ 逐字符 diff；
3. 最后发现**是在 `try...catch` 的地方做了手脚**：

```
case 1:
    // try {
    // 注意 try catch 的地方
    false || c[t(246)](f[t(245)](i.pHtmC(2 & o, 3) | i.evetF(a, 4)))
    // n.g 浏览器返回有值 为 window
    // "WhHMm" === i[t(198)] || n.g && c[t(246)](f[t(245)](i.pHtmC(2 & o, 3) | i.evetF(a, 4)))
    // } catch (e) {
    //     c[t(246)](f[t(245)](i[t(229)](i.cVCcp(3 & o, 4), a >> 4)))
    // }
    break;
```

- 原始逻辑是 `"WhHMm" === i[t(198)] || n.g && c[…](…)`；**`n.g` 在浏览器里返回 window（有值）⇒ 走 `&&` 分支**；
- 在 node 里若**不补 `n.g`**，`n.g` 为 `undefined` ⇒ `&&` 短路 ⇒ 走了「另一条分支 / 什么也不做」⇒ 结果与浏览器不同；
- 源文的修复：把 `n.g` 补成「返回 `globalThis` / `this` / `window`」的那段（源文引用了他人的补法），
  或把 `false || …` 换回原式。

**★ 判据（本文核心之一）**：
**一段代码只用自己产出的值做校验、不依赖外部输入（表现为「算法自洽但结果喂不回服务端」）⇒ 先怀疑它是蜜罐 / 纯装饰。**

三个典型信号：

| 信号 | 说明 |
| --- | --- |
| **重写内置函数** | `btoa` / `atob` / `JSON.stringify` / `escape` 被覆写成「自洽闭环」（返回上一个真实值式的可逆变换） |
| **`try...catch` 的 `catch` 被注释、`\|\|` 左边被替换成 `false`** | 原逻辑依赖一个「环境探针」走不同分支，改造后让 node 侧走错支 |
| **存在一个环境探针决定分支** | `n.g` / `window` / `document` 的有无，决定走 `&&` 分支还是 `catch` 分支 |

**处置（回溯，而不是改算法）**：**同一输入在浏览器和 node 各跑一遍，逐字符 diff；
找到「两边分支不同」的那个探针，把 node 侧补成浏览器侧的值。**
这是「补环境」而不是「改算法」——与 §2.8 的「值对齐即止」同源。

> ⚠️ 源文对 `md5` / `d` 的**完整实现只贴了代码、未逐步复算**，且 `case 1` 的修复**以注释 + 截图给出** ⇒
> 本文件**只登记判据**（蜜罐的识别信号 + 回溯处置），**不复刻完整 `btoa`**。

---

## §3 跨题共性：定位开场与验收动作

### §3.1 三种「开场」几乎覆盖全族

| 开场 | 适用 | 源文出处 |
| --- | --- | --- |
| **全局搜接口路径 → 格式化该 `<script>` → 找混淆** | 参数在请求侧（第 1/5/6/9 题） | 第 1 题搜 `api/match/1`、第 6 题搜 `api/match/6` |
| **无痕 + `Preserve log`，带 / 不带 cookie 各访问一次** | 动态 cookie（第 2/3/9 题） | 第 2 题「为了避免其他 cookie 的影响，所以使用浏览器的无痕模式」 |
| **在可疑行 / `eval` 前下断点 → 刷新 → 控制台取值** | 混淆 + `eval`（第 5/6/9 题） | 第 5 题「在三个 `eval` 前面都点一下，然后刷新页面」 |

> 第 1 题的「打开题目后按 f12 会出现 `setInterval` 函数，直接禁用断点」是**反调试处置**，
> 完整分类见 `./07-antidebug-and-live-patching.md` 与 `./09-antidebug-and-automation-fingerprint.md`。

### §3.2 唯一验收动作：断点处的值 vs 最终请求 / 响应里的值**对拍**

这一族的每一题都靠它收口（与 `15-*` §3 同一条纪律）：

- 第 4 题：把本地算出的 `j_key` 与响应里 `class` 的 32 位 hex **对拍**，一致才说明「隐藏逻辑」判对了；
- 第 5 题：在控制台输入 `_$8K[_$pe('0x6', 'OCbs')].toString()` **取出 AES 的 key**，
  再与「查询参数 `m` 去掉末位」对拍 ⇒ 确认 key 来源；
- 第 6 / 16 题：**同一输入在浏览器与 node 各跑一遍**（第 6 题对 `m`、第 16 题对 `btoa`），
  逐字符 diff 找差异点。

**判据**：**不做「断点值 vs 最终值」逐字符对拍，等于没做完。**

---

## §4 登记纪律：未复核 / 单样本 / 源文未展开

> 凡是源文只给截图、只给代码、或作者自述未解释的，一律登记为「未复核」，**不伪装成算法结论**。

| # | 条目 | 状态 | 说明 |
| --- | --- | --- | --- |
| 1 | 第 1 题 `document.e/f/g/h/c`、`window.a` 的具体取值 | **源文以截图给出、未复算** | 正文只说「有一些小混淆」并给截图；本文件只登记「是属性名拼接混淆」 |
| 2 | 第 5 题 ob 三选一 `eval` 的分支判定 | **源文给分支、未给 `$_zw` 内容** | 登记「读运行期值判定走哪支」；不登记 `$_zw` 是什么 |
| 3 | 第 6 题 express「每 5 次需重启」/ execjs 编码问题 / `os.popen` 只第一次 | **单样本、源文自述、未复核** | 源文自写「如果有大佬知道为什么还请不吝赐教」；登记为「疑似跨调用隐藏状态」 |
| 4 | 第 1 题附录那份 `hex_md5` 的实现 | **有 6 处常数抄错（B37 机械比对坐实）** | 见 §2.2b：源文自带 `md5_vm_test()` 锚点，但**它贴的常数通不过自己的锚点** ⇒ 实际复现请用标准库，**不要照抄附录** |
| 4 | 第 7 题轮廓首点阈值表 | **源文以代码给出、未解释来源** | 登记「用轮廓首点判定」的方法，**不复刻阈值**（不可跨站迁移） |
| 5 | 第 8 题「一律按点击图片左上角第一个 div」 | **源文的取巧做法** | 登记为「取巧」，不是通用坐标换算 |
| 6 | 第 9 题「三段 script」的段号-职责映射 | **源文只说三段、只贴第二段** | 登记该段**实际含有的三类代码**，**不声称**段号-职责对应 |
| 7 | 第 16 题 `md5` / `d` 完整实现、`case 1` 的修复 | **源文只贴代码 / 注释 + 截图** | 只登记「蜜罐识别信号 + 回溯处置」 |
| 8 | 第 10–13 题 | **源文无正文内容** | 源文仅开头汇总表登记「第十题 仅答案 / 第十一~十三 已完成」；**本文件全文检索确认源文正文与文件尾部均无第 10–13 题内容** ⇒ 本文件不覆盖 |

> **注意**：本批素材里**没有**「回帖里别人给的第 10–13 题答案」——
> `52pojie-1288315` 尾部（第 9 题之后）是**第 9 题反混淆后整份 `udc.js` 的代码转储**，不是回帖。
> 若后续拿到含回帖的完整版，再按「来源为回帖、未复核」补登记。

---

## §5 相关技能与文档（相对路径，均已 `ls` 验证可达）

同技能 `references/`：

- `./01-decision-tree.md` —— 题型判断、阻塞点判断、请求链定位。
- `./02-algorithm-families.md` —— 标准签名 / 混合加密 / Cookie·Header / JSVMP / Wasm / 国密族。
- `./07-antidebug-and-live-patching.md` —— 无限 debugger 处置、响应改写与在线补丁、参数溯源三分类。
- `./09-antidebug-and-automation-fingerprint.md` —— 反调试完整分类表、隐藏 iframe 取原生 API。
- `./10-waf-clearance-cookie.md` —— 边缘 WAF / 准入 Cookie（与 §2.3 动态 cookie 同族的「先拿 cookie 再进站」）。
- `./12-login-and-account-params.md` —— 登录 / 账号体系参数三分类（服务器下发字段不要算，同 §2.4）。
- `./15-call-site-locating-playbook.md` —— 「加密发生在哪一行」的唯一权威源（跟栈五判据、对拍验收、条件断点）。
- `./16-ciphertext-structure-diagnostics.md` —— 「只有一段密文时先读什么」的唯一权威源（长度 / 字符集 / 公共子串）。
- `scripts/login_param_probe.py` —— `rsa-pubkey` 可解析第 6 / 9 题的硬编码公钥，`classify` 可判第 4 / 5 题的密文族。

跨技能：

- `../../web-font-obfuscation/SKILL.md` —— 第 7 题（动态字体 / 雪碧图）的完整还原方法（见 §2.10）。
- `../../web-verify-patcher/SKILL.md` —— 第 8 题（图文点选）的识别 / 坐标 / 成功样本基线（见 §2.11）。
- `../../web-js-env-patcher/SKILL.md` —— 补环境的完整口径（第 6 / 9 / 16 题，见 §2.8、§2.12、§2.13）。
- `../../ast-deobfuscation/references/ob-variant-taxonomy.md` —— OB 变体（含 jsjiami v5）的识别与还原（第 2 / 5 / 9 题）。
- `../../ast-deobfuscation/references/obfuscation-detector.md` —— 先判「是不是 OB」（第 5 / 9 题）。
- `../../ast-deobfuscation/references/string-array-and-minimal-eval.md` —— 字符串表 + 最小 eval 还原（第 1 题 §2.2）。
- `../../webpack-bundle-extraction/SKILL.md` —— 第 6 / 9 题 JSEncrypt 是 webpack 单文件时的模块抠取。

---

## §6 来源表

| 来源 | 标题 | 日期 | 覆盖题 | 贡献的判据 |
| --- | --- | --- | --- | --- |
| `52pojie-1288315` | 某网站Web端爬虫攻防大赛题目交流（作者 漁滒） | 2020-10-21（2020-11-15 最后编辑） | 第 1–9 题 | §2.1（`丨` 拼接）、§2.2（属性名拼接 / 内联 RC4 字符串表）、§2.3（动态 cookie 入口）、§2.4（固定头 + 下发 session）、§2.5（无请求侧反爬 ⇒ 转响应侧）、§2.6（双加密 + 同值当密钥）、§2.7（改常量 MD5）、§2.9（累积 `q`）、§2.10（动态字体）、§2.11（图文点选）、§2.12（OB 三段） |
| `52pojie-1469419` | 猿人学爬虫攻防赛 第6题（作者 天空宫阙） | 2021-07-02 | 第 6 题 | §2.8（node 补环境四坑 / 「值对齐即止」/ express·execjs·os.popen 三形态与实测限制） |
| `52pojie-1487946` | 猿人学爬虫攻防赛 第16题（作者 天空宫阙） | 2021-08-03 | 第 16 题 | §2.13（btoa 重写蜜罐：自洽闭环 + `try...catch` 环境探针 + 回溯处置） |

> 本表是**保真度锚点**：文中每条断言都应能指回这里的某一行；
> 凡属「未复核 / 单样本 / 源文未展开」的，已在 §4 单独登记，**不在正文里升格为结论**。
