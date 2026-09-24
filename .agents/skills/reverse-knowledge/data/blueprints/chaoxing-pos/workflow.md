# 超星考试 pos 参数破译 —— 作业手册

> ⚠️ **源文自称是练习站**：源文开头即声明「这里的超星考试指本人的原创单机游戏【超级星星V.666】单词大考验关卡，并非通俗意义超星」。
> 本手册记录的是**可复算的算法形态**（LCG + 逐字符异或 + hex 尾），**不是真实超星生产站点的签名口径**。

## 一、入口与传输

- 生成位置: 考试页内联脚本；`enc` 由闭包函数 `getEncData(posData, userId, questionId, randomNum, rd)` 生成（源文 line 187-231 的抽离版）。
- 触发时机: 源文未给出确切触发点，只给了各参数的取值来源（`value` 取鼠标事件、`qid` 取隐藏域、`rd` 取 `Math.random()`）。
- 传输方式: 源文未给出完整请求样例；已知参数名为 `pos` / `qid` / `rd` / `enc` / `_edt`，其中 `_edt` 以 `"&_edt="` 形式拼接 ⇒ 至少 `_edt` 是 query 参数。
- 参数来源:
  - `pos` = `"(" + Math.ceil(x) + "|" + Math.ceil(y) + ")"`，`x = pageX || clientX + scrollLeft`，`y = pageY || clientY + scrollTop`；
  - `qid` = `document.getElementById('questionId').value`；
  - `rd` = `Math.random()`；
  - `enc` = `getEncData(pos, userId, questionId, randomNum, rd)`；
  - `_edt` = `_0x408603 + randomNumA`，`randomNumA = Math.floor(10 * Math.random())`。

## 二、排查步骤

1. 从「点击考试预览」追到目标脚本（源文原话：点击考试预览可以追到 AST 部分），先确认它是 **ob 混淆 + 字符串转义**。
2. **先解字符串转义**（不是先解字符串表）：用
   `generator(ast, {minified: true, jsescOption: {minimal: true}})` 输出一遍，把转义串压回普通字符串。
3. **再解字符串表**：把解密函数（本例是 `_0x56bc`）整段复制到 node 里单独跑。
   **一跑就卡死/OOM 说明命中了内存爆破** ⇒ 先做 §五 的两步处置，**不要**先去调算法。
4. 解出字符串表后，用 §六 的手法批量替换调用点，得到可读代码。
5. 按 §三 定位 `value` / `qid` / `rd` / `enc` / `_edt` 五个参数，把 `getEncData` 整段抽出来。
6. 用 §四 的锚点对拍你的实现（`enc` 长度必须是 `2*len(posData)+8`）。
7. 环境检测（`abcdx` 一类）在还原阶段直接 `return true`（见 mutations.json 对应条目）。

## 三、算法口径

- 家族: `custom`
- 细节（`enc`，逐行）:
  1. `s = userId + "_" + questionId + "|" + randomNum`；`s` 为空或长度 ≤ 0 返回 `null`；
  2. `d` = 对 `s` 逐字符 `charCodeAt().toString()` **直接首尾相接**（十进制、无分隔符）；
  3. `m = Math.floor(d.length / 5)`；`k = parseInt(d.charAt(m) + d.charAt(2m) + d.charAt(3m) + d.charAt(4m))`；
  4. `if (k < 2) return null;`
  5. `r = Math.round(1e9 * rd) % 1e8`；`d += r`（数字转字符串后追加）；若 `d.length > 10` 则 `d = parseInt(d.substring(0,10)).toString()`；
  6. LCG：`M = Math.pow(2,31) - 1`；`a = Math.ceil(s.length / 2)`；`seed = (k * d + a) % M`；
  7. 对 `posData` 逐字符：`x = parseInt(posData.charCodeAt(i) ^ Math.floor((seed / M) * 255))`；`x < 16` 时 `"0" + x.toString(16)`，否则 `x.toString(16)`；每轮末尾 `seed = (k * seed + a) % M`；
  8. 把 `r.toString(16)` 左补 `"0"` 到 8 位追加到末尾。
  ⇒ **输出长度 = 2 * len(posData) + 8**。
- 密钥/常量: `M = 2147483647`；`a = ceil(s.length/2)`；`k` 由 `d` 四个位置拼出；`1e8 = 100000000`；hex 小写、字符位不足 16 补 `0`、尾 8 位左补 `0`。
- 输出编码: hex（小写；字符级异或流 + 8 位 hex 尾）
- 输出长度: `2 * len(posData) + 8`

## 四、自算核对（源文章数字重算结果）

- **输出长度核算**：每字符 2 位 hex + 尾 8 位 ⇒ `2*len(posData)+8`；锚点 `posData="(1890|22)"`（9 字符）算得 **26 位**。
- **常量同一性核算**：源文 line 213 的 `100000000` 与文档里的 `1e8` **是同一个数**（`1e8 === 100000000`），不是两个常量 —— 登记为易误读点。
- **中间量核算（锚点用）**：`s="12345_67890|265"`（长 15）⇒ `d` 长 31、`m=6`、`k=5554`、`a=8`、`r=83675271`；`k ≥ 2` 故不返回 `null`。
- **★ 本流水线独立复算锚点**（源文未给示例值，**不能当作「与源文一致」的证据**，只作回归对拍）：
  `posData="(1890|22)"`、`userId="12345"`、`questionId="67890"`、`randomNum=265`、`rd=0.7836752714778081`
  ⇒ **`enc=46a214f06a86eb133e04fcc887`**（26 位；尾 8 位 `04fcc887` = `83675271` 的 hex 左补 0 到 8 位）。
- **源文示例无法对拍**：源文 line 234 的调用里 `userId` / `questionId` 写的是中文占位符（「用户id」「试卷id」），
  不是真值；截图里的「官方数据」不可机械核对 ⇒ **enc 无法与源文对拍**。
- **随机性提示**：`rd` 是 `Math.random()`、`randomNum` 来源未说明 ⇒ **enc 每次请求都不同**，
  不能用「同一个 enc 复现两次」做验收。

## 五、OB 字符串表的「内存爆破」处置（★ 源文实测）

**症状**：把解密函数复制到 node 里一跑就**卡死 / OOM**（源文原话「首先测试一下，发现卡死了，多半是正则爆破」）。

**根因**：解密函数里 `RvZSqA` 用正则 + 三元做判定：

```
_0x4337b4.prototype.RvZSqA = function () {
  var _0x403f16 = new RegExp(this["MTxJBI"] + this["FMdsHI"]);
  var _0x55e9af = _0x403f16["test"](this["ZxBleI"]["toString"]())
    ? --this["pNCgln"][1]
    : --this["pNCgln"][0];
  return this["AfmIcA"](_0x55e9af);
};
```

`test(...)` 跑出 **false** 时走 `--this["pNCgln"][0]`，进而落到 `ebdBfN` 的
`for (…) this["pNCgln"]["push"](Math.round(Math.random()));` ⇒ **死循环 push（内存爆破）**。

**处置（两步，缺一不可）**：

1. **先把三元强制成第一个分支**（源文：直接强制改成 `--this["pNCgln"][1]`）：
   `var _0x55e9af = --this["pNCgln"][1]`
2. **再把「第一个分支设 false、第二个设 true」**（源文原话：「直接将第一个设为false，第二个设为true」），然后才跑解密函数。

⚠️ **只做第 1 步仍会内存爆破**（源文实测：改完再跑「发现还是存在内存爆破」，向上才找到分支污染与内存爆破）。

**配套**：`abcdx` 一类环境检测（`navigator.webdriver` / `$cdc_` / `PhantomJS` / `callPhantom`）
在还原阶段**直接改成 `return true`** —— 否则函数在 node 里一律 `return undefined`。

**归属**：这条同时是 `ast-deobfuscation` 的判据（「解密 stub 会自爆」这一形态），
具体 pass 的写法见 `../../../../ast-deobfuscation/references/decode-obfuscator.md` 与
`../../../../ast-deobfuscation/references/string-array-and-minimal-eval.md`；
安全边界（不执行输入源码、不按文本特征删代码）见 `../../../../ast-deobfuscation/references/safe-rewrite-rules.md`。

## 六、两个通用手法（字符串转义最小化 / 批量替换调用点）

**① 字符串转义最小化（先做）**

```js
const ast = parser.parse(code_js);
let code = generator(ast, {
  minified: true,
  jsescOption: { minimal: true },
}).code;
```

作用：把 `\x` / `\u` 转义串压回普通字符串，**让后面的字符串表看起来是人能读的**。
源文的顺序是「**先解决字符串转义部分**，然后解字符串」—— 顺序反了会得到「表解出来了、内容还是转义串」。

**② 批量替换调用点（用 `replaceInline`）**

```js
traverse(ast, {
  CallExpression(path) {
    if (path.node.callee.name === "_0x56bc") {
      let loc1 = path.node.arguments[0].value;
      let loc2 = path.node.arguments[1]?.value;
      let str_node = types.stringLiteral(_0x56bc(loc1, loc2));
      path.replaceInline(str_node);
    }
  },
});
```

- **判据**：`path.replaceInline(types.stringLiteral(解密结果))` 替换的是**整个调用节点**；
  只改 `path.node.arguments[0].value` 等于没解（调用点还在跑解密函数，还可能再次触发 §五 的内存爆破）。
- `arguments[1]?.value` 用了可选链：解密函数有单参/双参两种调用形态。

## 七、来源之间的矛盾

- 🔴 **源文对 `_edt` 的表述含糊（本蓝图最不确定的一处）**：源文给了
  `"&_edt=" + (_0x408603 + randomNumA)`（line 246-247），但**有两个同名 `_0x408603`**：
  line 209 的 `Math.ceil(userIdAndQuestionIdAndRandom.length / 2)` 与 line 270 的 `"" + new Date().getTime()`。
  源文自己点出「而另外一个603的变量则是时间」（line 265），**却没写清 `_edt` 用哪一个**。
  ⇒ 本蓝图**按 line 209 的 `ceil(s.length/2)` 记为主读法**，line 270 的时间戳读法一并登记为存疑。
- 🔴 **源文易误读点**：`Math.round(1000000000 * rd) % 100000000`（line 213）与 `1e8` 是**同一个数**；
  不要当成两个常量、也不要把 `1e8` 读成 `1e9`。
- 🔴 **源文示例不可对拍**：line 234 的 `getEncData("(1890|22)", 用户id, 试卷id, 265, 0.7836752714778081)`
  里 `用户id` / `试卷id` 是中文占位符；截图里的「官方数据」无法机械核对。
- 🔴 **练习站声明**：源文标题与开头都写明这是作者自己造的练习站，**不是真实超星站点**
  （判定：不是矛盾，是**来源性质**，必须随结论一起标注）。
- 本批只有**单源**（`52pojie-1790893`），**没有第二篇文章可互证**。

## 八、明确留白（原文未给出，不要臆测）

- 请求的完整形态（URL / method / 其它参数 / 是否存在签名校验）：未给出。
- `randomNum`（`getEncData` 第 4 参）的来源：未说明（源文示例里是 265，而 `randomNumA` 是 0~9 的随机数，二者不同源）。
- `pos` 与 `enc` 的 `posData` 是否恒等：源文示例的第一个实参形如 `pos`，但未明说二者是同一个值。
- OB 字符串表用到的常量（`MTxJBI` / `FMdsHI` / `ZxBleI` / `GRlANK` / `pNCgln` 初值）：源文未给取值。
- `_edt` 里 `_0x408603` 的归属：见 §七。
- `userId` / `questionId` 的真实取值与获取方式：未说明。
