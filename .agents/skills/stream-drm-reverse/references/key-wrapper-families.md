# key 二次构造 / 包装层（W 族）—— 唯一权威源

> **本文是「m3u8 key URI 拿到的不是真 key」这一族判据与还原法的唯一权威源。**
> 具体厂商的 ip 级配方仍归 `vendor-key-schemes.md`；本文只讲**结构族**与**机械判据**。
> 可执行实现：`scripts/key_wrapper.py`（自带 `--selftest`）。
> 结构化结论来源：B14 蒸馏（21 篇），其中 3 个族做到了**与文章原样 JS 逐字节对拍**。

## §1 为什么要有这一层（以及不做的代价）

`#EXT-X-KEY:METHOD=AES-128,URI="..."` 返回的 16 字节**经常不是真 key**。
站点在服务端先做一层「包装」，浏览器里由播放器 JS 还原。

现象与代价：

| 现象 | 误判 | 真实原因 |
| --- | --- | --- |
| 下载器报「填充错误 / key 长度不对」 | 「key 抓错了」 | 抓到的是**包装后**的 key（W 族） |
| 拿到 47 位 / 32 位 / 64 位「key」 | 「不是 AES-128」 | 是 base64 文本、hex 文本或拼接串，**长度本身就是判据** |
| 解出来是垃圾，但字节数正确 | 「算法不对」 | 包装还原方向或口径错（最常见：少做/多做一次 base64） |
| 换了个视频就解不开了 | 「站点改了」 | 包装是**会话相关**的（含 UID / 时间戳），必须每次重新派生 |

> **硬判据**：AES-128 的真 key 一定有且只有 **16 字节**。
> 拿到的值长度不是 16 ⇒ 100% 还有一层包装，**不要**先去怀疑算法或 IV。

## §2 五族总表（30 秒分流）

| 族 | 结构签名（看什么） | 典型长度 | 还原命令 |
| --- | --- | --- | --- |
| **W1** 重复密钥 XOR | 响应是 **base64 文本**，JS 里有 `charCodeAt(i) ^ token[i % d]` | 与明文等长 | `key_wrapper.py xor --mode b64-xor-b64` |
| **W2** 字符表滚动 + 前缀标记 + 噪声 | 密文**首字符**与**末 3 字符**「不参与」解码；末 3 的中间位是**个位数** | 明文 b64 长度 + 1 + 3 + 噪声 | `key_wrapper.py xiaoe` |
| **W3** 字符表滚动 + 定长正文 + hex/标记串 | 整个响应是 **hex**，还原后含固定**标记串**与**前后各 13 位数字** | 固定（本族实测正文 **60** 字符） | `key_wrapper.py xm` |
| **W4** 两半异或 | 响应里**同时**给两段等长串（常各 16 字节） | 2 × 16 | `key_wrapper.py xor-halves` |
| **W5** 字母表守卫 | 「自定义 base64 表」类 | — | `key_wrapper.py alpha-check` |

**先跑 W5，再谈 W1–W4**：表错的时候，后面所有推导都是白做。

## §3 W1 重复密钥 XOR

实测形态（`52pojie-1624279`）：

```js
function strdecode(a, token) {          // token = md5(md5(格式化时间戳/1000 + key))
  a = Base64.decode(a);                 // ① 外 base64 解码
  for (var i = 0; i < a.length; i++)    // ② 与 token 循环异或
    e += String.fromCharCode(a.charCodeAt(i) ^ token.charCodeAt(i % d));
  return Base64.decode(e)               // ③ ★ 第二次 base64 解码
}
```

★ **三段链**：`b64( xor( b64(明文), token ) )`。
**少做或多做一次 base64 都会得到「看着像乱码的合法字节」而不报错** —— 本族最典型的静默错。
故 `key_wrapper.py` 同时提供 `w1_encode_b64_xor_b64` / `w1_decode_b64_xor_b64`，
并在自检里加了一条**反向断言**：少做一次解码必须**得不到**明文（防止把三段链误写成两段）。

判据：

- token 通常是 **32 位 hex 字符串**（md5 结果当字节用），长度恰好 32 ⇒ 与 16 字节 key 的异或只用到前 16 位。
- token 里常含**时间**（`new Date(...).getTime()/1000`）⇒ 有时效窗口，必须一次跑完「取 token → 解 key → 解分片」。
- 同一个 token 也可能同时用于**多个字段**（URL、body），别重复派生两次。

## §4 W2 字符表滚动变换（xiaoe 式）

实测全码见 `52pojie-1833748`。结构拆解：

```
密文 = [首字符 o][正文...][末 3 字符 t0 t1 t2]
  · o          → s = 表.indexOf(o)，同时决定滚动窗口的**起点** s % 8
  · t1         → 噪声间隔 n（`+t.substr(-3)[1]`，一个字符 ⇒ 只能 0..9）
  · 正文        → 表内字符与噪声字符**混排**，每个真字符后跟 n 个噪声字符
  滚动窗口 c = hexMD5( hexMD5(salt) + o ).substr(s % 8, s % 8 + 7) 的 ASCII 码
  正文第 h 位:  idx = 表.indexOf(正文[h]);  l = idx - f - c[f++];  while (l<0) l += 65
```

### §4.1 三个必须机械校验的结构常量

1. **`substr` 的第二参数是「长度」不是「终点」** ⇒ 窗口长度 **`(s % 8) + 7 ∈ [7,14]`，随首字符变化**。
   误按 `substring(start, end)` 语义实现时，`s % 8 != 0` 的样本会**整体错位**，
   而解出来的东西**仍然是一串合法 base64 字符**（不报错）。
   自检里有一条断言逐项核对 8 个 `s % 8` 的窗口长度。
2. **`e = hexMD5(salt)` 得到的 32 位 hex 是「字符串」再参与 `hexMD5(e + o)`** ——
   不是把 digest 当字节用。两层做错一层，`o` 与 `s` 的关系就全乱。
3. **加法是模 65 不是模 64**（表含填充符 `=`，共 65 字符）。
   写 `% 64` 会让 `=` 永远解不出来；写 `% 65` 但表只有 64 字符则最后一个字符永远取不到。

### §4.2 ★ 噪声字符的「三侧宽容度矩阵」（本族最隐蔽的不可移植行为）

原码这一句把噪声字符**也拼进了 base64 串**：

```js
u += t.slice(h + 1, h + 1 + n)   // ← 噪声不是"丢弃"，是"塞进 base64"
```

语义上它依赖 `atob` 忽略非法字符。但**三侧解码器的宽容度互不相同**（B14 实测）：

| 噪声字符 | Python `b64decode(validate=False)` | Node `atob` / `Buffer` | 浏览器 `atob`（forgiving-base64） |
| --- | --- | --- | --- |
| `!` `*` `.` `~` `%` | **忽略** | **忽略** | **抛 InvalidCharacterError** |
| `-` `_` | **忽略** | **静默吃进产物**（当 base64url） | **抛错** |
| `+` `/` `=` 与 `A-Za-z0-9` | **吃进产物** | **吃进产物** | **吃进产物** |
| `\t` `\n` `\r` ` `（ASCII 空白） | **忽略** | **忽略** | **忽略** |

⇒ **结论：三侧都忽略的字符只有 ASCII 空白。**

- `n == 0` 的样本**永远暴露不出这个问题**（噪声不存在 ⇒ 三侧行为一致）。
- 所以「原文代码能跑通」**不能**作为「噪声字符选得对」的证据。
- 实测反例：`atob('YQxx==') → "a\fq"`（不是 `"a"`）；`atob('YQ--==') → "a\u000f¾"`。
  两者**都不抛错**、产物长度还对。

判据写法：`key_wrapper.py noise-check --enforce` 会逐字符给出三侧判定
（`safe` / `silent-change` / `eaten` / `throws`），非 `safe` 一律以退出码 2 拒绝。

### §4.3 拒绝路径（必须报错，不能静默）

| 输入 | 原码行为 | 本脚本 |
| --- | --- | --- |
| 末 3 字符的中间位**不是数字** | `+t.substr(-3)[1]` = `NaN` ⇒ `n && (...)` 为假 ⇒ 噪声一个不跳 | 报错并说明原因 |
| 首字符 / 正文含**表外字符** | `indexOf` 返回 -1 ⇒ 产物变成 `undefined` 拼串 | 报错并给出下标 |
| 输入短于 `1 + 3` | 切片越界，解出空 | 报错 |

## §5 W3 字符表滚动变换（定长正文 + hex 标记串）

实测形态（`52pojie-2021915`，含评论区的完整复现）：

```
响应 = hex( <13 位随机数字> + "TG:@XMFLV" + urlencode([首字符][定长正文]) + <13 位随机数字> )
窗口 = MD5(secret + 首字符).substr(首字符下标 % 8, 7)     ← ★ 长度常量 7，与 W2 不同
正文第 i 位: out = 表[(首字符下标 + 表.indexOf(正文[i]) + 窗口[hi++].charCodeAt(0)) % 64]
```

与 W2 的**关键差异**（抄混了必然出错）：

| | W2（xiaoe 式） | W3（虾m 式） |
| --- | --- | --- |
| 窗口长度 | `(s % 8) + 7`，**随下标变化** | 常量 **7** |
| 取模基数 | **65**（表含 `=`） | **64** |
| 正文长度 | 跟随明文 | **硬编码 60** ⇒ 明文**恰好** 45 字节 |
| 偏移符号 | 解码**减**、`while(l<0) l+=65` | 解码减、`% 64` |
| 外层包装 | 首 1 + 末 3 字符 | hex + 前后各 13 位数字 + 9 字符标记串 |

### §5.1 两处「录入错」——必须自己算，不能照抄

1. **标记串与密钥字面量互相矛盾**：
   `signCoen` 用的标记是 `TG:@XMFLV`（9 字符），而 `secret_key = '54473a584d464c56'`
   解出来是 `TG:XMFLV`（**少了 `@`**）。**必有一处是录入错。**
   做法：两版各跑一次（盐只影响窗口，不影响结构），以能对上真实密文的那版为准。
   本脚本遇到标记串不匹配时会**直接把这条矛盾打印出来**，而不是丢一个「格式错误」。
2. **字符表缺 `/`、多了 `-`**：原文表是 `…789-=+`（65 元），而**编码侧用的是标准 `btoa`**
   ⇒ 只要明文 base64 里出现 `/`，`indexOf` 就返回 -1、`% 64` 落到一个**看似合法**的下标，
   **产物是错的不报错**。见 §6。

### §5.2 定长正文的两个静默边界

- **明文超长**：原码只跑 60 轮 ⇒ 多余明文**静默丢弃**（不报错）。
- **明文不足**：`input_string[i]` 是 `undefined` ⇒ `indexOf(undefined) == -1` ⇒ 产物全错不报错。

`xm_encode` 对两种情况都**报错**，`--allow-pad` 只留给「明知在造畸形夹具」的场景。

## §6 W5 字母表守卫（**先跑它**）

`key_wrapper.py alpha-check --table "<表>" --enforce`

四条判据（任一不满足即**不可用**，不要靠试）：

1. **长度必须是 65**（64 个字 + 1 个填充符）。用 `% 64` 与填充分不开。
2. **必须覆盖 `btoa` 输出空间** `A-Z a-z 0-9 + / =`。缺一个就必然出现 `indexOf == -1`。
3. **字符必须互不相同**（否则解码侧无法唯一还原）。
4. **下标 ≥ 64 的字符在 `% 64` 下会回绕到 0** —— 只要明文可能出现该字符，产物就不可逆。

### §6.1 实测案例

| 表 | 判定 | 说明 |
| --- | --- | --- |
| `…789+/=` | ✅ 同构 | 标准表 |
| `…789-=+`（文章原样） | ❌ `missing=['/']`、`extra=['-']` | 尾三字符被改写；与标准 `btoa` 不配套 |
| `…ABC**D**E**D**G…`（某 IR 的 base64 表） | ❌ `dup=['D']` | **单射性**被独立证伪（与 B13 同源教训） |

> 口诀：**「字母表 / 映射表 / 置换表」类常量，先跑一次单射性 + 覆盖性检查。**
> 两处独立来源一致也**不能**替代机械判据 —— 数学约束比「两篇文章都这么写」强。

## §7 坑表（「不报错但结果错」专区）

| 坑 | 症状 | 判据 / 修法 |
| --- | --- | --- |
| 少做/多做一次 base64 | 解出的是合法字节的乱码，长度还对 | W1 必须成对提供 encode/decode；自检加反向断言 |
| `substr` 当成 `substring` | 只有部分样本错，错的样本解码结果仍是合法 base64 字符 | 逐项核对 8 个下标下的窗口长度 |
| `% 64` vs `% 65` | 填充符永远解不出来 / 最后一个字符取不到 | 表长即模数 |
| 噪声字符落在 base64 表内 | 静默改字节（`atob('YQxx==') → 'a\fq'`） | `noise-check`；只在**目标运行时**里实测 |
| 噪声字符是 `-` / `_` | Python 忽略、Node **吃进产物** —— 同一份代码两个结果 | 同上；跨语言对拍必须以**同一运行时**为准 |
| md5 的口径 | 非 ASCII 上算出另一把 key | `hexMD5`（`charCodeAt&0xff`）= **latin-1**；`CryptoJS.MD5(str)` = **utf-8**。同一份代码里两个库可能混用 |
| 空 XOR 密钥 | 静默原样返回 | 显式拒绝 |
| 明文长度与原码硬编码不符 | 超长静默丢弃 / 不足产物全错 | 两侧都报错 |
| 「看着像魔改、其实等价于标准」 | 白费时间读代码 | **先按标准算法跑一次**（B12 教训复用） |

## §8 复跑命令

```bash
S=.claude/skills/stream-drm-reverse/scripts

# 0) 自检（含三侧宽容度矩阵、字母表守卫、往返与拒绝路径；断言数以下面实跑输出为准）
python $S/key_wrapper.py --selftest

# 1) ★先跑字母表守卫
python $S/key_wrapper.py alpha-check --table "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-=+" --enforce
python $S/key_wrapper.py alpha-check --table "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="

# 2) 噪声字符三侧宽容度
python $S/key_wrapper.py noise-check --enforce
python $S/key_wrapper.py noise-check --chars "-_! " --json

# 3) W2 xiaoe（密文 = [xiaoe] 前缀之后的部分）
python $S/key_wrapper.py xiaoe --input "<密文>" --salt appbgzjnopv1917
#    造夹具（与 JS 原码对拍用）
python $S/key_wrapper.py xiaoe-encode --input hello --prefix-idx 5 --noise 2

# 4) W3 虾m（输入是完整 hex 串）
python $S/key_wrapper.py xm --input "<signCoen 的 hex 串>"
python $S/key_wrapper.py xm-encode --input "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJK" --prefix-idx 3
#    若报「标记串不匹配」，脚本会把「标记串 vs hex 字面量」的矛盾直接打印出来

# 5) W1 三段链 XOR
python $S/key_wrapper.py xor --mode b64-xor-b64 --input "<base64 密文>" --key "<token>"

# 6) W4 两半异或
python $S/key_wrapper.py xor-halves --input-hex <32位hex> --raw
```

## §9 与其它文档的边界

- **厂商级 ip 配方**（腾讯云 `overlayKey`、百度 `tokenVideoKey`、`signter`、央视 h5e…）→ `vendor-key-schemes.md`
- **拿到的「解出来是 JSON」的接口层密文** → SKILL.md 的 D 层
- **自定义 METHOD（`AES-128-PES` / `AES-128-ECB`）与播放器改造** → `player-and-live-capture.md`
- **key 拿到之后怎么写回播放列表** → `scripts/m3u8_rewrite.py`（`--key-hex` / `--key-file`）
