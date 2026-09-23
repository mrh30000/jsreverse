# 边缘 WAF / CDN 准入 Cookie 的离线求解

当目标「**首访拿不到正常页面，必须先算出一个 clearance cookie 才能进站**」，
且需要把其中的**可离线部分**做成纯算实现时读取本文件。

**本文件是该族「可离线求解」部分的唯一权威源。**
判层、准入链路、环境一致性绑定、排错顺序在 `../../web-js-env-patcher/references/edge-waf-cookie-challenge.md`，
本文件不复述，只给算法与 oracle。

可执行入口（零依赖，自带 `--selftest`）：

```bash
# 路径相对本技能根（.claude/skills/web-reverse-algorithm/）
python scripts/waf_clearance_solver.py --selftest
python scripts/waf_clearance_solver.py classify --html page.html --status 521
```

| 子命令 | 覆盖 |
|---|---|
| `classify` | 从 HTML / 状态码 / Set-Cookie 定族与判层（**Node 版 `classify_edge_challenge.js` 的 Python 兜底**，二者判据同源；有 Node 时优先用 Node 版） |
| `jsl-first` | 加速乐第一趟 `document.cookie=...` 表达式求值 |
| `jsl` | 加速乐第二趟 `go({...})` 双字符补位暴力 |
| `acw-table` | 阿里 acw_sc__v2 的 RC4 字符串表（标定旋转量 + 按索引反查） |
| `acw-v2-old` | 阿里 acw_sc__v2 旧版 `unsbox` + `hexXor` |
| `cf-decode` | Cloudflare 响应体 rayId 派生 XOR 解码 |
| `cf-strtable` | Cloudflare 字符串表按恒等式枚举旋转量 |
| `pow-drop` | Cloudflare Drop 时间锁 PoW（检查点链） |
| `pow-bigint` | Cloudflare Turnstile 的 BigInt 模幂 PoW |
| `leichi` | 雷池（SafeLine）：`seed` 前导零**比特** PoW（`salt`）+ AES-128-CBC 请求体 |
| `qrator` | qrator：`nonce` 前导零 hex 的循环哈希计数（`pow`） |

---

## 0. 本族「可离线」的边界

| 可离线 | 必须真浏览器 |
|---|---|
| 内联 JS 里的纯算变换（置换 / XOR / RC4 表 / LCG / 洗牌） | 环境校验（校验点数量与**顺序随机**） |
| 响应体的加解密（rayId 派生 XOR / base64 分层） | `isTrusted` 事件（鼠标/触摸/键盘） |
| PoW（模幂 / SHA-256 链） | 必须发出的旁路请求（图片 / canvas / 预置 GET） |
| 常量表旋转量还原（数论恒等式自校验） | 行为生物特征（轨迹、节奏、时序） |
| 参数补位暴力（哈希前缀/后缀匹配） | — |

**结论**：先穷尽左列，再把右列交给真实浏览器；不要把右列当成「算法没还原完」继续硬啃。

**退出码（实测，与 Node 版定族器口径一致）**：

| 码 | 含义 | 怎么办 |
|---|---|---|
| `0` | 成功 | — |
| `1` | 没给子命令（打印帮助） | 加子命令 |
| `2` | 参数用法错误（argparse） | 看 usage |
| `3` | **求解失败 / 结果不可信** | 看 stderr 原因：rayId 取错、补位无命中、枚举不到旋转量、定族歧义 |

**看到 `3` 不要当崩溃**：它是「算法走到了但没有可信结果」。`--selftest` 里有一组
「CLI 误用与退出码」断言专门钉死这张表（含「目录当文件传」「JSON 写坏」等高频误用的可读报错）。

---

## 1. 加速乐（jsl）两趟 521

### 1.1 第一趟：表达式求值

响应体里的 `document.cookie=...` 右侧是**纯字面量拼接**（JSFuck 化算术），无需解混淆，直接求值。

```bash
# 整页 521 原文直接喂进去（脚本自己抽 `document.cookie=` 右侧那段）
python scripts/waf_clearance_solver.py jsl-first --html <521页面.html>
# 已经手工抠出表达式时
python scripts/waf_clearance_solver.py jsl-first --expr "<右侧表达式>"
```

**抽取这一步不要自己用正则 `[^;]+` 抠**：表达式里**本身就会出现 `;`**（cookie 属性被逐字符拼出来，
形如 `...+(';')+('m')+('a')+('x')...`），一刀切会在中间断掉，得到的是一段语法不完整的表达式。
脚本里按「括号深度 + 引号状态」扫描，只在**顶层、引号外**的 `;` 截断（自检里有这条断言）。

表达式结构：`('_')+('_')+...+(expr)+('|')+('-')+((+true)+'')+...`，
其中 `(expr)` 是 `-~{}+''`、`(1+[2])/[2]+''`、`(([2]+0>>2)+'')`、`(~~[]+'')`、`(-~[5]+'')` 这类小算术。

**求值口径**（必须按 JS 语义，不能用 Python 的算术）：

| 表达式 | JS 结果 | 原因 |
|---|---|---|
| `1+[2]` | `"12"` | 数组 ToPrimitive 成字符串 ⇒ `+` 变拼接 |
| `"12" >> 2` | `3` | 位移先 ToInt32 |
| `~~[]` | `0` | `~ToInt32([])` = `~0` = `-1`，再来一次 = `0` |
| `-~{}` | `1` | `~{}` = `~ToInt32({})` = `~0` = `-1`，一元 `-` 得 `1` |
| `+!+[]` | `1` | `+[]`=0 → `!0`=true → `+true`=1 |
| `1+[0]-(1)` | `9` | `1+[0]`=`"10"` → `"10"-1`=9 |
| `(1+[2])/[2]` | `6` | `"12"` / `2` |

`waf_clearance_solver.py jsl-first` 内置了一个**白名单递归下降求值器**（按 `ToPrimitive` /
`ToNumber` / `ToInt32` 实现），**不调用任何 JS 引擎**；遇到标识符 / 属性访问 / 函数调用一律拒绝。

**验证**：两组真实表达式的期望值由 `node -e "eval(expr)"` 独立求出，作为差分 oracle。

### 1.2 两趟的结构常量（跨文章互证）

| | 第一趟（521 页内联表达式） | 第二趟（`go({...})` 的 `bts[0]`） |
|---|---|---|
| 形态 | `<unix_ts>.<ms>\|<flag>\|<urlenc-base64>` | 同左 |
| `flag` | 实测 **`-1`** | 实测 **`0`** |
| 第三段 | 20 字节 base64（`%` 编码） | **2~4 字符**（不定长；或 20 字节 base64，因站而异） |

同一次会话内两趟的 `<unix_ts>` 相同、毫秒不同（实测 `.059` → `.167`，间隔约 100ms）。
`jsl-first` 会把这三段拆出来输出，便于和第二次请求的 `bts[0]` 对拍。

### 1.3 第二趟：双字符补位暴力

```js
go({
  "bts": ["<ts>|<n>|<3字符>", "<URL编码的 base64>"],
  "chars": "<22 ~ 24 个字符>",
  "ct": "<十六进制哈希>",
  "ha": "md5|sha1|sha224|sha256|sha384|sha512|sha3",
  "is": true, "tn": "__jsl_clearance_s", "vt": "3600", "wt": "1500"
})
```

```
for i in 0..len(chars)-1:
  for j in 0..len(chars)-1:
    cand = bts[0] + chars[i] + chars[j] + bts[1]
    if HASH_ha(cand) == ct:  →  cand 即 __jsl_clearance_s
```

枚举量 `len(chars)²`：**本脚本自带 4 组真实 oracle 实测全为 22 ⇒ 484**；文章样本出现过 23 ⇒ 529。（**没有观测到 24 字符的样本**，别按 576 预算。）**四个坑**：

1. **`bts[1]` 保持 URL 编码原样**。`rLB%2FdFGil%2FWSDtvv5CSWRc%3D` 里的 `%2F` / `%3D` 是哈希输入的一部分；
   `unquote` 之后**枚举全表也不会命中**（自检里有这条反例断言）。
2. **`ha` 每次都可能换**，不要写死 md5。实测同站出现过 `md5` / `sha1` / `sha256`。
3. **`chars` 里有重复字符时会有多个 `(i,j)` 命中同一个候选串** —— 去重后取 `distinct_solutions`，
   不要因为 `match_count > 1` 就以为算法错了。
4. **`wt` 只是延时字段**（`delay = wt > elapsed ? wt - elapsed : 500`），纯请求路线直接写 cookie。

**oracle**：本批 4 组真实 `go({...})` 参数（`md5` / `sha1`×2 / `sha256`）全部命中，见 `--selftest`。

### 1.4 512 / `__jsluid_h` 命名变体：算法同、cookie 名不同

| 项 | 521 形态 | **512 变体** |
|---|---|---|
| 首访状态码 | 521 | **512**（前两趟都是） |
| 第一趟会话 cookie | `__jsluid_s` | **`__jsluid_h`** |
| clearance cookie 名 | `__jsl_clearance_s` | **`__jsl_clearance`**（**不带 `_s`**） |
| 第二趟参数对象 | `go({bts, chars, ct, ha, is, tn, vt, wt})` | **同结构**（`tn` 字段会写成实际的 cookie 名） |

- **算法按同族推断可复用**（`jsl-first` → `jsl`），但**不能照抄 521 的 cookie 名**：取错名字的表现是
  「值算出来了、请求也发了，页面还是挑战页」。
  ⚠️ **该变体的 `go({...})` 对象原文从未打印**（只写了「JS 脚本是动态的、每次 hash 算法可能都不一样」）⇒
  上表的「同结构」是**推断**：`jsl` 无命中即说明推断不成立，别硬套。
- 变体判定见 `../../web-js-env-patcher/scripts/classify_edge_challenge.js`（族名 `jsl-2pass-512`）与
  `edge-waf-cookie-challenge.md` §2.1.1。
- **三趟必须同一 session**；第二趟 JS 的混淆数组与变量名**每次刷新都变**，`go({...})` 对象必须**每次现抽**。

---

## 2. 阿里 acw_sc__v2

两代**输出同名 cookie**，算法完全不同。判据是**内联 JS 的形态**。

### 2.1 旧版：`unsbox` + `hexXor`

```js
// 固定 40 元置换表（1..40 的一个排列）
unsbox(): T = [15,35,29,24,33,16,1,38,10,9,19,31,40,27,22,23,25,13,6,11,
               39,18,20,8,14,21,32,26,2,30,7,4,17,5,3,28,34,37,12,36];
          out[T[k]-1] = src[k]          // 把第 k 个字符搬到 T[k]-1 位

// 固定 40 位 hex（20 字节）的 key 串
hexXor(key = "3000176000856006061501533003690027800375"):
          out += pad2(parseInt(a[2k:2k+2],16) ^ parseInt(b[2k:2k+2],16))

acw_sc__v2 = unsbox(arg1).hexXor(KEY)
```

- `arg1` 是**40 位 hex**，藏在页面内联的隐藏 `<textarea>` 里，**每次访问都变** ⇒ 必须每次从新响应体正则提取。
- `unsbox` 是**双射**（置换表是 1..40 的排列）⇒ 输入输出等长、字符多重集相同、可逆。
- `hexXor` 自逆 ⇒ `hexXor(结果, KEY) == unsbox(arg1)`。
- 实跑样例（`arg1 = F5552FD53D7DEE57A54020812B92605A1D2314C4`）：
  `unsbox` → `526117F4D34549082EF7C505E2AB50D5A252D1D3`，`hexXor` → `62610094d3c0290e28e2c456d2a839d585d2d2a6`。
  自检覆盖「置换表是 1..40 的排列」「双射」「自逆」「超长输入必须拒绝」「非 hex 必须拒绝」。

### 2.2 新版：LCG + 洗牌

形态判据（与旧版的硬区别）：

1. `Math.random` 被替换成**自定义 LCG**（种子写死 ⇒ 序列可预测）。
2. `Array.prototype.fill` 被**魔改**（按自定义规则打乱重组）。
3. 出现 **Fisher–Yates 式十六进制洗牌**（按预定义顺序把 hex 字符映射到另一个 hex 字符）。
4. 出现 **`ox` 形式的 XOR 字符串常量表**，带固定下标偏移（原文样本记为 `m(466) === ox[0]`；偏移量随版本变，别照抄 466）。
5. 末尾拼字符串后转小写。

**没有 `unsbox` 表** ⇒ 在新版上搜 `unsbox` 必然零命中。

#### 两个「不按套路就必错」的点

**(a) `Function.prototype.toString()` 的内容参与计算 ⇒ 绝不能格式化源码**

```js
oO = <主函数源码>.indexOf('fc1e53')          // 源码偏移
Y || (R = T + (-1 === b.toString()['indexOf']('debugger')
             || new RegExp('\\{[\\s\\S]*[/\\*]{2}[\\s\\S]*\\}', 'gm')['test'](b.toString())))
```

- **本地格式化源码 → 索引错位 → 卡死在 `while` 里（不报错，是死循环）**。必须用浏览器里那份**压缩一行**的原文，
  或把这些偏移量从 Console 取出来写死。原文的两处独立观察：
  ① `oO` = `PxjRjE` 源码里 `'fc1e53'` 的 `indexOf` 位置（另一篇文章：`发现oO的值不对，卡死在这个循环里`）；
  ② **另一个从源码里取出来的量在浏览器里恒为 `594`**，本地格式化后取不到。
- **`debugger` 字符串绝对不能删**（这是最容易做错的一步）。判断逻辑是：

  ```js
  R = T + (-1 === b.toString()['indexOf']('debugger') || new RegExp('\\{[\\s\\S]*[/\\*]{2}[\\s\\S]*\\}', 'gm')['test'](b.toString()))
  ```

  - 浏览器里 `b.toString()` 含 `debugger` ⇒ `indexOf` ≥ 0 ⇒ `-1 === …` 为 **false** ⇒ 由后面的正则决定 `R`。
  - **一旦把它 `replace('debugger;', '')` 删掉**，`indexOf` 返回 **-1** ⇒ `-1 === -1` 为 **true** ⇒ `R` 走另一分支
    ⇒ **流程能跑完，但算出的 cookie 过不了校验**（原文：`如果我们删掉了虽然不会影响流程但是会影响结果，最终生成的值是无法通过校验的`）。
  - **正确处置**：① 首选——**不改字符串**，用 DevTools 的「永不在此暂停 / ignore 这一断点」绕过无限 debugger
    （原文第一篇就是在 debugger 处 `回到上一个断点` 后继续）；
    ② 若确实要改字符串，必须**同时保持那个判断的结果不变**：把 `indexOf` 的**实参也换成空串**
    （`b.toString()['indexOf']('')` 恒返回 `0`，`-1 === 0` 仍为 false）——这才是原文给出的解法。
- 第二段正则 `\{\[\s\S]*[/\*]{2}[\s\S]*\}` 检测的是**函数体里有没有注释符号**（`[/\*]{2}` = 「连续两个字符都取自 `/` 或 `*`」，因此 `//`、`/*`、`*/`、`**` 都会命中），即「有没有被格式化过」。
  **这就是「格式化 JS 后提交必失败」的机制** —— 不是玄学，是一条可复算的正则。

**(b) 末尾随机数的奇偶性由 `T` 表决定，而 `T` 表读 `navigator`**

`T` 表通过读 `navigator`（含 `webdriver` 类判据）生成，决定最后生成 cookie 末尾随机数的奇偶性
（`true`=奇数 / `false`=偶数）。**处置：不要在本地重算，直接从浏览器把 `T` 表取出来内联成常量。**

### 2.3 RC4 字符串表（`_0x55f3`）

```js
_0x55f3(i, key):
  table = <一个大 base64 数组>
  启动时旋转 table：while(--n) push(shift())
  return RC4( decodeURIComponent(escape(atob(table[i]))), key )
```

**旋转次数的准确口径**（B7 曾在此踩坑，本批用 oracle 钉死）：

| 源码形态 | 有效旋转次数 | 出处 |
|---|---|---|
| `}(table, 347)` + 函数体 `while(--n){push(shift())}` | **347**（字面量） | 本批 `1822807`（acw_sc__v2 旧站样本） |
| `}(table, 0xee)` + 函数体 `while(--n)`，**调用点**写 `_f(++arg)` | **238**（= `0xee`，字面量） | 跨族通用口径，出处见 `../../ast-deobfuscation/references/string-array-and-minimal-eval.md`（**本批 17 篇里没有这一形态**） |

两形态都是**恰好等于那个字面量**：调用点的 `++` 与函数体的 `--` 相互抵消。

⚠️ **但字面量不等于「表要左移几位」**：`while(--n)` 是**绕环**执行的，表长 `N` 时左移 `L` 次
≡ 左移 `L mod N` 位。本批样本表长 **56**，字面量 **347** ⇒ 实际左移 **347 mod 56 = 11** 位。
**标定时枚举的是 `0..N-1`，不是 `0..347`** —— 这一条踩错就会「明明 oracle 对，脚本却找不到旋转量」。

**还原套路（不要读 RC4）**：

1. 从浏览器 Console 抓几组 `_0x55f3('0x3','jS1Y') === '3000176000856006061501533003690027800375'` 这样的对照；
2. 用它们**标定实际左移位数**（枚举 `0..len-1`，取**全部**命中的那个；命中不唯一就说明 oracle 不够或有误）；
3. 再按索引反查剩余字符串 —— 注意**每条表项的 key 不同**，`--lookup` 必须配 `--key`。

```bash
# 标定：oracle 至少要一条；--literal 传源码里那个字面量，工具会核对「字面量 mod 表长 == 枚举到的位数」
python scripts/waf_clearance_solver.py acw-table \
  --table table.json --literal 347 \
  --oracle "0x3=jS1Y=3000176000856006061501533003690027800375" \
  --oracle "0x19=Pg54=unsbox"
# 反查（必须带 --key，取自 Console 对照的第二个字段）
python scripts/waf_clearance_solver.py acw-table --table table.json \
  --oracle "0x3=jS1Y=3000176000856006061501533003690027800375" \
  --lookup 0x3 --key jS1Y
```

**oracle（独立复算过）**：本批 13 组对照，表长 56。
按字面量做 **347 次 `push(shift())`** ⇒ 等价左移 11 位 ⇒ **13/13 命中**；
左移 10 位或 12 位（即字面量 346 / 348）⇒ **0/13**。
`acw-table` 的 `--selftest` 会把这三件事全部钉住：**满命中旋转量恰有 1 个**、
它必须等于 `347 mod len`、**任何其它旋转量必须 0 命中**、以及「oracle 被篡改一位后满命中必须消失」。
差 1 位的结果**仍然是一串可打印字符**，不会报错 —— 这就是本族最典型的静默失败。

---

## 3. Cloudflare

### 3.1 响应体：rayId 派生 XOR

```js
function decodeResponse(encoded, rayId) {
  let key = 32;
  const seg = rayId + "_0";
  for (let i = 0; i < seg.length; i++) key ^= seg.charCodeAt(i);
  const bin = atob(encoded);
  let out = "";
  for (let i = 0; i < bin.length; i++)
    out += String.fromCharCode(((bin.charCodeAt(i) & 255) - key - (i % 65535) + 65535) % 255);
  return out;
}
```

- key 由 **`_cf_chl_opt.rayId`**（16 位 hex）派生，**不是** `challengeRayId`。
- **判别 rayId 对不对的机械指标：解出串的 base64 字母表占比。**
  **真实 rayId 必然是 `1.000`**（不是 0.99x，是精确 1.0）；rayId 只要错一位就掉到 0.8 以下。
  本仓两个真实响应体实测（同一 rayId `a393f8784a8dce7a`）：

  | 用的 rayId | `fo_stage2`（3336 字节） | `fo_stage1`（95420 字节） |
  |---|---|---|
  | 真值 | **1.000** | **1.000** |
  | 末位差 1 | 0.835 | 0.788 |
  | 全 0 假值 | 0.346 | 0.293 |

  **判据：占比 != 1.0 就是 rayId 取错了，不要往下走**（阈值定在 1.0，不要定在 0.9 —— 长样本的
  错误 rayId 也可能到 0.79，短样本更要小心）。
- **解密结果本身是 base64 字符串**（不是明文 JS）：完整链路是
  `响应体(base64) → rayId-XOR → base64 字符串 → base64 解码 → 字节码`。
  分支判据是 `startsWith("window._")`（明文脚本分支）还是走 VM；**不要用「像不像 base64」判**。

**oracle**：本仓 `cloudflare/xai-cloudflare/artifacts/` 两个真实 `fo` 响应体
（`fo_stage2` 4448→3336、`fo_stage1` 127228→95420）与对应 `.plain` **逐字节命中**；
自检另含合成往返 + 错误 rayId 占比必须下降的反例。

### 3.2 字符串表：按恒等式枚举旋转量

挑战脚本开头把字符串表旋转到满足一个**写死的数论恒等式**：

```js
for (xL = i, be = x(); ;) {
  try {
    if (bl = parseInt(xL(539))/1 + -parseInt(xL(2236))/2 + -parseInt(xL(1037))/3*(parseInt(xL(2421))/4)
           + -parseInt(xL(1247))/5*(parseInt(xL(2279))/6) + -parseInt(xL(1176))/7
           + -parseInt(xL(1797))/8*(-parseInt(xL(1532))/9) + parseInt(xL(2302))/10,
        F === bl) break;                 // F 是写死的 magic 值
    else be.push(be.shift());
  } catch (by) { be.push(be.shift()); }
}(V, 608776)
```

- 取表器 `i(n) = table[n - 基址]`；本批基址 **458**、表 **2050** 项、magic **608776** ⇒ 旋转 **434**。
- **另一 widget：基址 239、magic 520249** ⇒ **旋转量 / 基址 / magic 三者每版本都不同，必须现场枚举，不能硬编码。**
- 实现必须对齐 JS 语义，否则**静默找不到旋转量**：
  - `parseInt` 取**前导整数前缀**：表项形如 `'998842qYxftE'` → `998842`。
    用 Python 的 `float()` / `int()` 会直接抛错，一旦被 `try/except` 跳过，就永远搜不到。
  - 累加是 IEEE754 双精度、**从左到右**；比较是 JS 的 `===`（精确相等），不要用容差。
- **验证**：旋转 434 后 `table[1487-458] === 'document'`、`table[618-458] === 'BCkZA9'`、
  `table[1931-458] === '_cf_chl_opt'`，与仓内 `new_strtable_decoded.txt` 逐行一致。

### 3.3 PoW

**Turnstile 的 BigInt 模幂**：

```js
const seed = crypto.getRandomValues(new Uint8Array(128)); seed[0] = 0;
let base = BigInt(seed_bytes) % MODULUS;
let res = 1n, e = 65537n;                      // 逐位平方-乘
```

- 模数是**写死的 1024 bit 常量**，在文章 / 案例报告 / 真实脚本三处**逐字符一致** ⇒ 可跨版本复用。
- 指数固定 `65537`（`0x10001`）；结果按 128 字节填充后进入载荷。
- 自检用 Python 内置 `pow(a,b,m)` 作为独立实现核对，并做三来源常量一致性检查。

**Drop 的时间锁 PoW**：

```python
state = SHA256(base64url_decode(seed))
checkpoints = [state]
for _ in range(k):                 # 实测 k=1000
    for _ in range(g):             # 实测 g=2000
        state = SHA256(state)
    checkpoints.append(state)
solution = base64(concat(checkpoints))
```

- 总量 `(k+1) × g = 2,002,000` 次 SHA-256（约 2s）；**`s=16` 当前未参与计算**。
- **设计要点**：检查点链**可分段验证**（服务端每收一段验一段，不必重算整链）；
  SHA-256 链天然串行 ⇒ GPU / 多线程无法加速。
- 自检含分段验证 + 「`g` 改错必须验证失败」的反例 + 非法 `k`/`g` 必须拒绝。

---

## 4. 雷池（SafeLine）：前导零比特 PoW + AES-128-CBC

**可离线的部分**：`salt`（PoW）与 `inspect` 的请求体（AES-CBC）。**必须外呼一次**的是 `/seed`
（每趟都变），`once_id` 来自第一次 `list` 的响应体。链路见
`../../web-js-env-patcher/references/edge-waf-cookie-challenge.md` §2.8。

### 4.1 `salt`：前导零**比特** PoW

站点侧（已解混淆）：

```js
let a = function (e, t = 20) {
  const n = te;
  for (var r = 0; r < 1e8; r++) {
    const a = SHA256(e + "" + r)["toString"]();
    for (var i = 0, o = 0; o < a.length; o++) {
      if ("0" != a[o]) { i += 4 - parseInt(a[o], 16)["toString"](2)["length"]; break }
      i += 4
    }
    if (!(i < t)) return r
  }
  return 0
}(seed, 16);
```

计数口径：**每遇 hex 字符 `0` 记 4 bit；遇首个非零字符按 `4 - bit_length(该位)` 补足**。

> ⚠️ **必须按 bit 实现**。一个常见近似是「前导零 hex 位数 ≥ t/4」—— 它在 `t` 是 4 的倍数时**恰好等价**，
> 在 `t ∉ 4Z` 时**分叉**。实测（`seed=7NzPy5ID`）：
>
> | `t` | bit 口径 | 「前导零 hex 位数」口径 | 是否等价 |
> |---|---|---|---|
> | 16 | **20702** | 20702 | 等价 |
> | **18** | **154281** | 483624 | **分叉** |
> | 20 | **483624** | 483624 | 等价 |
>
> 两种口径给出的都是**合法的十进制数字**，不会被任何解析器拒绝 —— 属于本族最典型的静默失败。

**oracle（实测 1 组 + 同口径外推 2 组，均已独立复算）**：

| seed | t | salt |
|---|---|---|
| `7NzPy5ID` | 16 | **20702** ← **原文观测到的唯一一组** |
| `7NzPy5ID` | **18** | **154281**（外推；该哈希只有 **4** 个前导零 hex 字符：第 5 位是 `2`、bitlen=2 ⇒ `4×4+2=18`） |
| `7NzPy5ID` | 20 | **483624**（外推） |

自检除此之外还断言**最小性**（`r < salt` 的每一个 r 都不满足阈值，防「提前返回」类静默错）
与**单位判据**（`t=18` 必须给 `154281` 而不是 `483624` —— 这是唯一能把两种口径区分开的断言）。

### 4.2 请求体：AES-128-CBC（参数级事实）

| 项 | 值 | 说明 |
|---|---|---|
| key | `seed` 右侧补位到 16 字节；**补什么原文只写了「补 0」** | ⚠️ `'0'`(0x30) 与 `0x00` 两种读法都成立且**密文完全不同** ⇒ 用 `--pad char\|byte` 切换（默认 `char`）；密文对不上**先换它** |
| iv | ASCII `1234567890123456` | **固定值** |
| padding | **Pkcs7** | CryptoJS 默认（`n.pad.Pkcs7`） |
| 明文 | 环境对象 JSON | **只有 `salt` 变化**，其余字段写死即可 |
| 密文出口 | `n.ciphertext.toString()` | 调用点形如 `q[n(467)](JSON.stringify(e), i, {iv: o, padding: Q})` |

```bash
# salt + body 一次算完（--json 里没有 salt 会自动补上）
python scripts/waf_clearance_solver.py leichi --seed 7NzPy5ID --json '{"foo":"bar"}'
# 核对浏览器抓到的密文（hex 或 base64）；对不上先试另一种补位方式
python scripts/waf_clearance_solver.py leichi --seed 7NzPy5ID --decrypt <密文>
python scripts/waf_clearance_solver.py leichi --seed 7NzPy5ID --pad byte --json '<明文>' 
```

**AES 实现的自检 oracle 是官方向量**（不需要人工核对 S-box）：
FIPS-197 附录 B 的单分组向量，以及 NIST SP 800-38A F.2.1 的 CBC 向量
（CBC 前缀稳定 ⇒ 取密文前 64 字节比对即可，PKCS7 追加的第 5 组不影响前 4 组）。
另含两类反例：**key 长度不是 16 必须拒绝**、**用错 key 解密必须因 PKCS7 不合法而失败**
（不允许「手工截掉尾部」把错误掩盖过去）。

---

## 5. qrator：循环哈希前导零计数（`pow`）

- `param` 来自 401 那趟下发的 cookie **`qrator_jsr`**；
  **`nonce` = `param` 按 `-` 切分的第 1 段，`qsessid` = 第 2 段**。
- `pow` = 「循环哈希到**前两位为 `00`** 的次数」。

> ⚠️ **两种读法都自洽，原文未写明**：`md5(nonce + str(i))`（每次独立）与 `md5(上一次的 hash)`（哈希链）。
> 工具**两种都实现**（`--mode index|chain`），并用 `--expect-pow <浏览器真实值>` 做机械校验。
> **不要把默认 mode 当结论**——先拿一条真实样本钉死它。

```bash
python scripts/waf_clearance_solver.py qrator --param <qrator_jsr 原值> --expect-pow <真实值>
```

自检断言的是**性质**而不是自算自比：返回值的哈希满足前缀条件、且**更早的每个 i 都不满足**
（最小性），chain 模式再用**另一种写法独立重放**整条链核对；另含
「`--expect-pow` 给错值必须失败」「非法 prefix / 无法切段的 `param` 必须被拒」两类反例。

**不属于本文件的部分**：`validate` 载荷里 40 个字段中除 `version` / `vx`（固定）外的 **38 个是环境派生**
（MD5 + base64），属环境拟合侧；同一份结果实测只能复用约 5 次。

---

## 6. 定位手法（跨族通用）

### 6.1 常量表 / 置换表的还原优先级

1. **先找自校验条件**（数论恒等式 / magic 值 / 校验和）→ 枚举出旋转量或基址。
2. **再用「已知索引 → 明文」反查**标定表（浏览器 Console 抓几组对照即可）。
3. **最后才读算法**（RC4 / XOR / 洗牌）。

**不要跳过第 1、2 步直接读 RC4**：本批 13 组 oracle 证明旋转量差 1 位就 0/13 全错，
而**错的结果仍然是一串可打印字符**，不会报错 —— 这是本族最容易静默失败的地方。

### 6.2 代码文本参与计算 ⇒ 任何重写都可能失败

| 族 | 机制 |
|---|---|
| 阿里 acw_sc__v2 | `Function.toString().indexOf(<子串>)` 取源码偏移；正则检测函数体里有没有 `/*` 注释 |
| Cloudflare | 字符串表旋转量由**写死的数论恒等式**约束（改一个字符就命中不了 magic） |
| 加速乐 | 第二趟 JS 每次返回不同，但**同一次内** `ct` 与 `chars` 必须成对使用 |
| 瑞数 | `cp[]` 是代码校验值（参数名与 VM 代码每隔一段距离的 `charCodeAt` 之和） |

⇒ 挑战页 JS 一律按**原始字节**保存与使用（本仓约定存 `.orig`）；不要格式化、不要过 linter/autofix、不要转码行尾。

### 6.3 何时不要做纯算

- 环境校验点**数量与顺序随机**（Cloudflare 十几个到二十几个；Akamai 环境段号数组）⇒ 纯算路线不成立。
- 需要 `isTrusted` 事件（鼠标 / 触摸 / 键盘）⇒ 纯算路线不成立。
- 目标载荷**分钟级轮换**（F5 Shape 的 token 有效期）⇒ 维护成本高于用真实浏览器。

**判据**：如果「同一份 JS 连跑两次，环境相关的输出不同」，就不要继续做纯算，改走补环境 / 真实浏览器。

---

## 7. 与相邻技能的边界

| 场景 | 归属 |
|---|---|
| 准入 Cookie 的**判层、链路、一致性绑定、排错** | `../../web-js-env-patcher/references/edge-waf-cookie-challenge.md` |
| 本文件：可离线求解的算法 + oracle + 定位手法 | 本文件 + `scripts/waf_clearance_solver.py` |
| 要把挑战页 JS 搬进 Node 里跑 | `../../web-js-env-patcher/SKILL.md` |
| 挑战页 JS 的混淆家族识别与 AST 还原 | `../../ast-deobfuscation/SKILL.md` |
| 有图 / 有交互的验证码识别与求解 | `../../web-verify-patcher/SKILL.md` |
| 业务参数签名（与准入无关） | `SKILL.md` 其它 references |
