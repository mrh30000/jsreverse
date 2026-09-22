# 极验协议矩阵（v3 / v4 / 点选 / 九宫格）

本文件是 `references/provider-execution-notes.md` 极验小节的下沉细节。
算法层（AES/RSA 四元组、变体编码、PoW 模板）不在这里重复维护，见
`../../web-reverse-algorithm/references/08-mixed-crypto-segmentation.md`。
本文件只回答三件事：**链路怎么走、字段怎么来、有没有版本陷阱**。

---

## 零、先判代际（做错这一步，后面全白干）

| 判据 | v3 | v4 |
| --- | --- | --- |
| 身份参数 | `gt` + `challenge`（32 位 hex，第 5 步后带 2 位尾巴） | `captcha_id`（32 位 hex）+ `challenge`（UUID v4） |
| 主域名 | `api.geetest.com` | `gcaptcha4.geetest.com` |
| SDK 资源 | `fullpage.*.js` / `slide.*.js` / `click.*.js` / `gct.js` | `gcaptcha4.js` + `gct4.js` |
| 票据四件套 | `c` / `s` / `validate` / `seccode` | `lot_number` / `payload` / `process_token` / `pt` |
| `w` 的编码层 | **自有 base64 变体**（码表尾 `()`，补 `.`） | **小写 hex**（`ArrayToHex`） |
| `w` 里有什么 | 提交内容 + 环境串 `i` + 轨迹 `aa` | 提交内容 + PoW + 动态键名防篡改块 + `td_sign` |
| 轨迹去哪了 | 混进 `w` 的明文 | 独立参数 `td`（明文走 query），`w` 里只有 `td_sign` |
| 版本号字段 | `get.php` 返回里的 `ep.v`、SDK 文件名 | `load` 返回的 `static_path`、`ep.v` |

> **版本号不是"参考信息"，是必读参数**：`static_path` 变了，字符串表索引、防篡改块切片下标、
> 固定键值对都可能整体漂移。报结论时一并记版本号与取证日期。

### 零.1 初代 / 二代（在线 / 离线）判据（与 v3/v4 并列的第三、第四种形态）

| 形态 | 判据（一眼可辨） | 票据怎么来 |
| --- | --- | --- |
| **初代**（⚠️ **来源作者口径**：文章标题写"初代"，正文自己说明"实为二代离线模式""真正的初代产品无从分析" ⇒ 这一行与下一行"二代·离线"**同源同一篇**，不要当成两个独立样本） | 脚本是 `geetest.0.0.0.js` + `offline.*.js`；**全流程没有 `get.php` / `ajax.php`**，图片路径由本地 JS 生成（两段 MD5） | `validate` 由**本地**算：`A(距离, challenge) + "_" + A(b("rand0", ts), challenge) + "_" + A(b("rand1", ts), challenge)`（`ts` = 13 位时间戳）；**轨迹会被采集但不校验** |
| **二代·在线** | `netWebServlet.json` 返回 `gt`/`challenge` → `get.php` 返回**新的 challenge** → `ajax.php` → **再回 `netWebServlet.json`** 拿业务字段 | `ajax.php` 返 `validate`；后续业务请求要带上第 2 步的**新 challenge** + `validate` |
| **二代·离线** | 同初代：`register` 只有 `challenge`/`gt`，其余全本地 | 见上表初代行；图片乱序还原与三代同源，**但图宽不同**，照抄三代的 260 会错 |

> **要点**：初代/二代的"离线"形态**没有 `w`**，只有一个 `validate`。
> 若你把这一族当成 v3 去逆 `w`，会一直在 JS 里找不到 `"w"` —— 先按本表判代际。

---

## 一、v3 七步交互链

| # | 接口 | 关键返回 / 入参 |
| --- | --- | --- |
| 1 | 业务方 `register-slide`（或 `/doget.json`） | → `gt`、`challenge` |
| 2 | `api.geetest.com/gettype.php?gt=` | → 各类型脚本路径与 `type`（`fullpage` / `slide`） |
| 3 | `api.geetest.com/get.php?gt=&challenge=` | ← 传 **w①**；→ `c`、`s`（**新界面 `w` 不可置空**） |
| 4 | `api.geetest.com/ajax.php?...` | ← 传 **w②**；→ `{"result":"slide"}` 定题型（**也必须带 w**） |
| 5 | `api.geetest.com/get.php?is_next=true&type=slide3` | → `bg` / `fullbg` / `slice` / `xpos` / `ypos`、**c2 / s2**、**新 challenge（多 2 位尾巴）** |
| 6 | `api.geetest.com/ajax.php?...`（提交） | ← 传 **w③**；→ `validate`、`score`、`success` |
| 7 | 业务方登录接口 | ← `geetest_challenge` / `geetest_validate` / `geetest_seccode` |

- 实测**不必模拟全部接口**：直接指定滑块题型，走 `1 → 3 → 5 → 6 → 7` 即可；
  但 `3 / 4 / 6` 三处的 `w` 都必须真实有效。
- **三个 `w` 相互关联，只逆最后一个会被判 `forbidden`** —— 这是"以前能过、现在过不去"的头号原因。
- 第 7 步的绑定：
  - `geetest_challenge` = **第 5 步的新 challenge**（不是第 1 步的）；
  - `geetest_validate` = 第 6 步返回的 `validate`；
  - `geetest_seccode` = `validate + "|" + 固定后缀`（后缀随站点不同，从页面里搜）。

---

## 二、v3 的三个 `w` 分别是什么

三个 `w` 都是「**密文段 + RSA 段**」两段直接拼接，只是变量名不同：

```text
① get.php  首包     : w = i + r     # i = 密文段（AES 变体 base64），r = RSA 段
② ajax.php 题型确认 : w = h + u     # h = 密文段，u = RSA 段；走无感（fullpage）路线
③ ajax.php 提交     : w = h + u     # 同上结构，明文才是滑块业务数据
```

> **变量名别记，记结构**：同一套逻辑在不同版本/不同 JS 文件里的变量名完全不一样
> （`i/r`、`h/u`、`_/u`、`c/u`、`p/u` 都出现过），RSA 段那半永远是"用 RSA 加密的 AES key"。
> 判据：**后段长度恰好 256 个 hex**（RSA-1024），前段长度是 16 字节的整数倍。

| w | 密文段明文（要点） | 备注 |
| --- | --- | --- |
| ① | 一个**环境/配置对象**：`gt`、`challenge`、`offline`、`new_captcha`、`product`、`width`、`https`、`api_server`、`type`、`static_servers`、各脚本路径、`aspect_radio`、`cc`、`ww`、`i`（**这里是"环境串"这个长字符串**）、`$_FFW:{pt:0}` | 直接构造即可，**不需要跟栈**；搜 `\u0077` 就能定位 |
| ② | 无感路线的**行为/环境对象**：`lang` / `type:"fullpage"` / `tt` / `light` / `s` / `h` / `hh` / `hi` / `vip_order` / `ct` / `ep`（含 `fp`/`lp` 鼠标首末点、`em` 探针、`tm` 性能时间）/ `passtime` / `rp` / `captcha_token` / `gdyf`（或 `otpj`，每天变，可固定） | 搜不到 `\u0077`，**必须跟栈**（位置常在 `var n = {};` 附近） |
| ③ | 滑块业务数据：`lang` / `userresponse` / `passtime` / `imgload` / `aa`（轨迹）/ `ep`（含 `ca` 点击序列）/ `rp` / `h9s9` / 条件性带 `i`（**这里是"裸滑动距离"这个数字**） | 搜 `\u0077` 能回到这里 |

> ⚠️ **两个同名但完全不同的 `i`**（极易混淆，踩过的人不少）：
> - w① 的 `i` 是**环境串**（`!!` 分隔的长字符串，见 §五）；
> - w③ 的 `i` 是**裸滑动距离**（数字，且只在某个开关为真时才带）。
> 看到字段名相同就当成同一个东西，是排查 `w` 对不上时的常见弯路。

### 2.1 w③ 的字段来源

| 字段 | 生成 | 是否每轮必算 |
| --- | --- | --- |
| `userresponse` | `H(滑动距离, challenge)`：读 challenge 里 2 个 hex 字符得到基数 `n = 36*r[0]+r[1]`，再 `distance + n`；然后按 `[1,2,5,10,50]` 的**找零法**随机拆成 challenge 字符拼成的串 | ✅ |
| `passtime` | 从加载 JS 到提交的毫秒数 | ✅ |
| `imgload` | 图片加载耗时（可固定） | ⚠️ 可固定 |
| `aa` | 轨迹编码（见 §四） | ✅ |
| `ep` | 环境汇总（见 §五） | ⚠️ 部分可固定 |
| `rp` | `MD5(gt + challenge 前 32 位 + passtime)` | ✅ |
| `h9s9` | `gct.js` 里对若干函数源码做 djb hash 得到的**代码签名**（每天/每版变，可固定） | ⚠️ 可固定 |
| `i` | 裸滑动距离（仅当开关为真时带） | ⚠️ 条件 |

> **challenge 取哪两位要按样本定**：早期实现取 `slice(32)` 起的 2 位（初版 challenge 是 32 位）；
> 新版 challenge 尾部多了 2 位随机，代码改成取 `slice(-2)`（即末尾 2 位）。
> **抄公式前先打印 challenge 长度**，否则 `userresponse` 一定错，而它错了只会表现为"验证失败"。
>
> 排查顺序建议：先把 challenge 原样打印出来，与 `w` 解密后的 `userresponse` **在同一轮**里比对 ——
> 这样能立刻区分「取位规则抄错」和「找零法随机性导致对不上」（后者本来就不会逐字节相同，
> 只要**数值基数** `distance + n` 一致即可）。

---

## 三、v3 底图还原（52 片、2 行、260×160）

极验 v3 的乱序**不是 2×13 的常规网格**，几何必须照抄：

```text
画布 260 × 160；52 片 = 26 列 × 2 行
每片：宽 10、高 80
源坐标：x = seq[i] % 26 * 12 + 1      # stride 12（块 10 + 间隙 2），左偏移 +1
        y = 80 if seq[i] > 25 else 0
目标坐标：x = i % 26 * 10
          y = 80 if i > 25 else 0
```

- 语义是 **`target-to-source`**：循环下标 `i` 是目标槽位，`seq[i]` 是来源槽位。
  与顶象同向、与智慧酒店（tuyacn）反向 —— 见 `references/tile-scramble-and-coordinate-mapping.md` §一。
- 顺序来源是 **C 类"前端常量数组"**：JS 里一个 `SEQUENCE()` 函数按固定公式把
  一个 13 元素的盐数组展开成 52 元素置换：

  ```js
  function SEQUENCE() {
    var e = "6_11_7_10_4_12_3_1_0_5_2_9_8".split("_");
    for (var t, n = [], r = 0; r < 52; r++) {
      t = 2 * parseInt(e[parseInt(r % 26 / 2)]) + r % 2;
      parseInt(r / 2) % 2 || (t += r % 2 ? -1 : 1);
      t += r < 26 ? 26 : 0;
      n.push(t);
    }
    return n;
  }
  ```

  那个盐水字符串在 `slide.*.js` 里是**运行时从 `decodeURI` 长字符串里按下标取的**（不是明文），
  所以换 SDK 版本要重新取；不过它长期稳定，可作为常量缓存。
  **盐数组的 13 个元素必须都落在 `0..12`**（`2*max+1+26 = 51`），越界会展开成非法置换 ——
  脚本会直接拒绝并报 `gt3_salt_invalid`，不会产出一张错位的底图。
  另有一批文章直接给出**等价的 52 元素硬编码表**（`[39,38,48,49,41,40,46,47,35,34,...]`），
  它与默认盐展开结果**逐元素相同**（脚本 `--selftest` 用例 9 就是这条交叉验证），
  两种记法指的是同一个置换 —— 以自己抓包版本的 `SEQUENCE()` 输出为准。

### 3.1 用脚本还原

本技能的 `scripts/restore_slices.py` 内置了这条几何（`--model gt3`），
**不必自己写图片切块代码**：

```bash
# 默认盐：6_11_7_10_4_12_3_1_0_5_2_9_8
python scripts/restore_slices.py --model gt3 --input bg.png --out bg.restored.png --pretty

# 换 SDK 版本后盐变了：直接传字符串
python scripts/restore_slices.py --model gt3 --gt3-salt "6_11_7_10_4_12_3_1_0_5_2_9_8" \
    --input bg.png --out bg.restored.png

# 已有实测置换（例如从浏览器里直接 dump 的数组）
python scripts/restore_slices.py --model gt3 --order "39,38,48,49,41,40" \
    --input bg.png --out bg.restored.png
```

`--input` 的图片必须是**(缺口底图, 和 完整底图)分别还原**：`bg` 与 `fullbg` 用**同一套顺序**。

### 3.2 缺口定位

还原后按 `references/tile-scramble-and-coordinate-mapping.md` §五 的递进表选算法：

- 边缘法（最常用）：灰度 → `cv2.Canny(gray, 255, 255)` → `matchTemplate(TM_CCOEFF_NORMED)`；
- `ddddocr`：`slide_match(slice, bg, simple_target=True)` 或 `slide_comparison`；
- 极验的 `ypos` 可以用来**交叉验证**自己算出的 y 是否合理。

---

## 四、v3 轨迹编码 `aa`

`aa` 是纯编码、不是加密，但字符表与流程都是自有的，**必须照抄**：

```text
① 差分：把 [[x,y,t], ...] 变成步进序列 [[dx,dy,dt], ...]；
   连续静止点（dx=dy=0）合并、把静止时长累加到下一个有效步
② 9 方向查表：[[1,0],[2,0],[1,-1],[1,1],[0,1],[0,-1],[3,0],[2,-1],[2,1]] → 映射到 "stuvwxyz~"
③ 未命中方向表的步（dx/dy 不在表内）：dx、dy 分别用自定义数值编码
   字符表 = "()*,-./0123456789:?@ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqr"
   负数前缀 "!"，进位前缀 "$"（即 |v| 超过表长时用「高位字符 + 低位字符」两位表示）
④ 三段用 "!!" 拼接：方向串 + dy 串 + dt 串        # dt 一定单独成段
⑤ 插入式混淆：用第 5 步返回的 (c, s) 逐字符插入重排
```

**⑤ 的插入公式**（`$_BGDl` / `$_BBED`）：

```python
# c = 接口返回的数组（至少 5 个元素，取 c[0], c[2], c[4]）
# s = 接口返回的 hex 字符串，每 2 位一字节
i = 0
o = 编码后的轨迹串
while True:
    r = s[i:i+2]
    if not r: break
    i += 2
    ch = chr(int(r, 16))
    pos = (c[0] * ch_ord * ch_ord + c[2] * ch_ord + c[4]) % len(o)   # 多项式决定插入位置
    o = o[:pos] + ch + o[pos:]
```

- **`c` / `s` 来自第 5 步的 `get.php`**，与图片同一次返回；用错一次必失败。
- 三个 `w` 里的 `aa` 与 `tt` 都是这套编码的产物，`tt` 用的是**整段验证过程**的鼠标事件。

---

## 五、v3 的环境串与 `ep`

两条环境线，都要分开对待：

1. **`i`（`!!` 分隔的 75 项数组）**：窗口/屏幕尺寸、`navigator` 各字段、字体列表、
   `performance.timing` 序列、WebGL/canvas 指纹、插件、时区等。
   页面内容相对固定时**整串取固定值**即可（这是最省事的做法）。
2. **`ep` 对象**：`v`（版本号）、`te`/`me`（touch/mouse 支持）、`ven`/`ren`（WebGL 的
   UNMASKED_VENDOR / RENDERER）、`fp`/`lp`（首末鼠标事件）、`em`（自动化探针位）、
   `tm`（20 项 `performance.timing`）、`ca`（点击序列，点选题用）。

`em` 探针的位含义（`0`/`1` 表示"有没有"）：

| 位 | 检测目标 |
| --- | --- |
| `ph` | `window.phantom` |
| `cp` | `window.callPhantom` |
| `ek` | 遍历 `TypeError` 对象的属性列表（`line`/`column`/`lineNumber`/`columnNumber`/`fileName`/`message`/`number`/`description`/`sourceURL`/`stack`），存在则 1，得到一个二进制串再用 hex 表示 |
| `wd` | `window.webdriver === true` |
| `nt` | `window.__nightmare` |
| `si` | `document._webdriverscriptfn` |
| `sc` | `document.$cdc_asdjflasutopfhvcZLmcfl_`（ChromeDriver 特征） |

`captcha_token` 与 `h9s9` 都是**代码签名**（djb hash 部分函数源码），
含义是"这几个函数有没有被改过" ⇒ 补环境/扣代码时如果动了它们，必须重算或直接从真实样本抄。

---

## 六、v4 链路：只有两个请求

```text
1. GET /load   ? callback(geetest_+13位时间戳) & captcha_id & challenge(UUID) & client_type=web & risk_type=slide & lang
      ← lot_number / slice / bg / ypos / pow_detail{version,bits,datetime,hashfunc} /
        payload / process_token / pt / payload_protocol / static_path / (guard)
2. GET /verify ? callback & captcha_id & client_type & lot_number & risk_type &
                 payload & process_token & payload_protocol=1 & pt=1 & w & td
      ← {"status":"success","data":{"result":"success","seccode":{...},"score":"1"}}
```

- 两个都是 **JSONP 风格的 GET**：URL 带 `callback=geetest_xxx`，响应体是 `geetest_xxx({...})`。
  **Python 侧必须先正则剥壳再 `json.loads`**，否则直接报解析错。
- **判定必须显式断言 `data.result == "success"`**：
  失败时 HTTP 照样 200、外层 `status` 照样 `success`，只看这两个一定会误判成功。
- **失败也会下发新票据**：`data` 里带新的 `payload` / `process_token`，
  拿它们走一次 `load(...&pt=1&payload=...&lot_number=...)` 换题（注意 `lang` 会从 `zh` 变成 `zho`）。
  直接重发旧 `payload` 会无限 fail；而且 `fail_count` 是累计的，狂重试会把风控等级拉高。
- 最终产物是 `seccode.captcha_pass_token` / `captcha_output` / `gen_time` / `lot_number` 四件，
  交给业务后端做二次校验。

---

## 七、v4 `data` 字段分桶表（照着桶处理，别逐字段猜）

| 桶 | 字段 | 处理方式 |
| --- | --- | --- |
| **每轮必须更新** | `setLeft`、`userresponse`、`passtime`、`lot_number`、`pow_msg`、`pow_sign`、防篡改块三层键与值 | 由 `lot_number` / 识别结果 / `pow_detail` 驱动 |
| **每轮签名** | `td_sign` | 用同轮 `lot_number` + 同一条 `td` 计算 |
| **可写死（demo 级别）** | `device_id:""`、`geetest:"captcha"`、`lang`、`ep`、`biht`、`em` 整块 | SDK 版本相关，**升级时必须复查** |
| **版本相关形态** | 固定键值对：`dQFB:"BoHp"` + `gee_guard` 整块 **vs** `fX1g:"Uq0E"` 且无 `gee_guard` | 两种形态服务端都收；批量 fail 且其他都排查过时，回头查这里 |

`userresponse = setLeft / 1.0059466666666665 + 2`（分母是滑轨有效长度与容器宽度的固定比例）。

---

## 八、v4 里三个"活"的东西

### 8.1 PoW（`pow_msg` / `pow_sign`）

```
pow_msg  = version | bits | hashfunc | datetime | captcha_id | lot_number || <16 位 hex 随机串>
pow_sign = HASH(pow_msg)        # HASH ∈ {md5, sha1, sha256}，由 pow_detail.hashfunc 决定
```

> ⚠️ **两处曾经写错、照做必失败的细节**（B16 依 `52pojie-1779592` 的原文 JS 逐行复核后修正）：
> 1. **不是恒定的 SHA256**：哈希函数从 `pow_detail.hashfunc` 读（实测见到 `md5` / `sha1` / `sha256`），
>    照抄官方 demo 的 `md5` 写法在别的站点会失败。
>    ⚠️ **该失败现象与具体错误码的对应关系，来源文章没有给出**（原文只说"某些网站不能通过"）——
>    本文档把它与 `error_03` / `-50002` 并列，属**按字段位置推断**（PoW 在 AES 密文内，服务端解不开就会报这一类），
>    **不要当成已证实的定论**。
> 2. **难度判据不是「`int(sign,16) < 2**(256-bits)`」**：那是 SHA256 专属的等价式。
>    原文的通用判据是 **前导零 hex + 半个 nibble 上界**：
>
>    ```
>    u = bits // 4 ; a = bits % 4
>    前 u 位必须全是 "0"
>    a == 0 → 通过
>    a != 0 → int(sign[u], 16) <= {1: 7, 2: 3, 3: 1}[a]
>    ```
>
>    **原语对照（照抄原文时别抄错）**：原 JS 用的是 `p.indexOf(c) === 0`（`c` = `u` 个 `"0"` 组成的串）
>    ＋ **JS 的字符串比较** `d <= f`（`d = p[u]`，`f` 依次为 7/3/1）——对十六进制数字而言
>    与上面的整数比较**等价**（`"7" <= 7` 为真、`"a" <= 7` 为假）；本仓 `geetest_pow.py` 用整数比较实现，
>    `--selftest` 对 `bits = 1/2/3/5/6/7` 六个分支都做了断言。
>
>    （`bits=6` ⇒ 首位 `0` 且第二位 ≤ 3；`bits=4` ⇒ 首位 `0`。）
>    ⚠️ **方向别写反**：`2 ** (256 - bits)` 只对 **sha256** 成立；套到 md5（128 位）/ sha1（160 位）上，
>    阈值恒大于摘要取值域 ⇒ **判据恒成立（等于完全没校验）**，而不是「永远不成立」。

- `pow_detail` 是 `load` 响应里的字段：`{version, bits, datetime, hashfunc}`，**四个都要读**；
- 末尾的 `||` 是空段（原文里那个恒为空的 `o`），**后面才接 16 位 hex 随机串**；
- PoW 的随机串与 `w` 里 AES/RSA 用的 16 位随机串**是两次独立的随机**，不要复用；
- **可执行实现**：`scripts/geetest_pow.py`（零依赖，`--selftest` 41 项，含三条哈希 / 全部 `bits%4` 分支 /
  拒绝路径断言）：

  ```bash
  S=skills/web-verify-patcher/scripts   # 基准 = 技能库父目录（先 cd .claude 或 cd .agents）
  python $S/geetest_pow.py solve --from-load load.json --json      # 直接吃 load 响应
  python $S/geetest_pow.py solve --pow-detail '{"bits":6,"hashfunc":"sha256","version":"1","datetime":"..."}' \
      --captcha-id <id> --lot-number <lot>
  python $S/geetest_pow.py check  --from-load load.json --pow-msg <msg> --pow-sign <sign>   # 独立复算校验
  ```

### 8.2 动态防篡改块（最阴的一招）

`data` 里有一个嵌套字典，**外层键、中层键、内层键、内层值全部由 `lot_number` 按下标切片拼出**：

```text
外层键(6) = lot[5:8] + lot[7:10]        # 两段切片在下标 7 处重叠！
中层键(8) = lot[20:28]                  # 连续切片
内层键(4) = lot[10] + lot[12] + lot[3] + lot[7]     # 散点下标拼接
内层值(8) = lot[7:15]
```

- **下标规则本身也是版本相关的**：老教程里的 `[14:20]` / `[3]+[8]+[12]+[0]` 在现行 SDK 上已对不上；
  对不上时别怀疑算法，抓两组新样本重新回归。
- v1.9.x 可直接在控制台执行 `window.lib._abo` 打印当前切片规则。
- 外层键是"两段重叠切片"，**单段切片永远解释不了键名里的重复字符** —— 这是识别它的特征。

### 8.3 `td` / `new_track` 与 `td_sign`（明密文绑定）

```text
① 轨迹 payload → gzip → base64url(无填充) → 字符串 new_track
② appendTrack 把 new_track 挂到 data 上
③ 组装 verify 时：
     a. 取出 data.new_track
     b. delete data.new_track            ← 从 data 上删掉！
     c. data.td_sign = HMAC-SHA256(key = lot_number, msg = new_track)
④ 然后才走 AES 加密生成 w
⑤ 被删掉的本体以明文形式放进 verify 的 query，改名 td
```

- **`w` 的解密结果里永远找不到轨迹本体**，这是刻意的 —— 明文轨迹走 query、签名进密文，
  服务端用同一轮 `lot_number` 算一遍 HMAC 对拍。想分开篡改都没门。
- 轨迹 payload 结构：`{m, w, h, s, e, p}`，
  `p` 的每个点是 `[t, x/width, y/height, typeCode]`（**比例不是百分比**，保留 4 位小数），
  `typeCode` 映射 `{start:0, move:1, end:2, down:3}`；`width`/`height`/`source` 上提到顶层
  变成 `w`/`h`/`m`，`pressure` 丢弃。
- 采集器自带的**明文配置**可直接搜到（比解字符串表快）：`maxPoints:150`、`percentPrecision:4`。
- 服务端按"可选增强信号"校验：带且自洽 ⇒ 过；不带 ⇒ 跳过。
  **建议带上**（成本一次 HMAC），否则哪天开强校验就会被动翻车。

---

## 九、九宫格（`icon` / 文字点选）

### 9.1 协议

- 请求仍是 `load` → `verify` 两条；要逆的只有 `w`（含 `pow_msg` / `pow_sign`），
  其余参数从 `load` 返回原样带回或为固定值。
- `load` 返回：`ques`（问题小图标）、`imgs`（九宫格大图）—— **两张图都没有被乱序**，
  不像 v3 需要一个还原步骤。
- `w` 结构与滑块 v4 完全同构：`hex(AES-CBC-PKCS7(data, key, iv="0000000000000000"))` +
  `hex(RSA-1024-PKCS1v15(key))`，`key` 仍是 4×4 位 hex 拼接。
- 解混淆工具链（可省掉大量手工）：`deobfuscate.io` 初步解 → `UglifyJS Online`
  勾 `beautify: true` + `toplevel: true` 换掉离谱变量名 → DevTools 的 **Override content** 替换 `gcaptcha4.js` 并在本地断点。
  然后靠 `console.log(arguments)` 在 `encrypt` 处批量埋点找入口。

### 9.2 九宫格识别（**不是分类，是特征相似度**）

这类题的九宫格内容几乎每轮都不同，做分类不现实。可行路线是**特征提取 + 余弦相似度**：

```text
① 把九宫格切成 3×3（顺序：从左到右、从上到下），小图标单独一张
② 统一 resize(224,224) + ImageNet 标准化
③ 用 ResNet18 backbone（`fc` 可换成新的 Linear，也可以直接取 512 维特征）批量推理
④ 小图标的特征向量与 9 张子图逐一算余弦相似度，取 top-3 的位置作为答案
```

- 训练到"能把同类图标聚在一起"即可，**不需要高分类准确率**；
  实测 500 张左右样本 + 50 epoch 就够（损失收敛判据与工程细节见 `references/captcha-model-training.md`）。
- 导出 ONNX 后推理只依赖 `onnxruntime`，不装 torch。
- 数据集**先去重**（按文件 md5），重复图会明显拉偏。
- 标注：做一个几十行的 Tkinter 小工具，输入同类标签回车即归档，比通用标注工具快。
- 详细的切图/去重/训练/ONNX 代码骨架见 `references/captcha-model-training.md` §八。

---

## 十、v3 点选（`click.*.js`）与 v4 的差异点

- 点选题的**第三个 `w`** 由 `click.*.js` 生成，字段结构与滑块不同：

| 字段 | 含义 |
| --- | --- |
| `o.a` | 点击坐标串：`Math.round(相对 x * 100) + "_" + Math.round(相对 y * 100)`，多个点击用 `,` 连接 |
| `o.tt` | 整个验证过程的鼠标事件编码（move/down/up） |
| `o.ep.ca` | 点击序列 `[{x, y, t, dt}, ...]`，**最后一个元素是点确认按钮** |
| `o.ep.tm` | 同滑块的 20 项 `performance.timing` |
| `o.pic` | 题目图片路径 |
| `o.h9s9` | `gct.js` 代码签名（同滑块） |

- **`pic` 只是图片路径**，识别点选题要自己去下载题目图并按语序解读（文字点选 / 图标点选）。

---

## 十一、v4 的"验证通过却登录失败"

现象：本地参数能拿到 `result:"success"`，但业务接口报验证码错误；用页面自己生成的参数却正常。

原因：极验 v4 在 JS 里生成一个**固定的键值对**（"异常标记"），服务端会校验它；
键值对**与 `gcaptcha4.js` 版本绑定**。

处置：

1. 该键值对在生成 `w` 的 `e` 变量里，位置形如
   `re.findall(r"!=typeof global\?global:this(.*?)\(\)", gt4_js)` → 再取 `{...}` →
   键是 `"..."` 字符串（需 `unicode_escape` 还原），值是用**文件开头那 4 个函数中的第 3 个**解出来的。
2. **每次 `load` 都检查返回的版本号**（`static_path` / `ep.v`），与本地缓存不一致就重新拉
   `gcaptcha4.js` 并重算键值对（正则即可，有条件的用 AST）。
3. 相关固定值：`ep` 长期为 `"123"`；`biht`（如 `"1426265548"`）由 `gct.js` 生成且与 `ep` 有关
   —— 可用「在 `gct.js` 里把内部函数挂到 `window` 上再 `execjs` 调用」的方式取。

---

## 十二、非纯算路线（自动化浏览器）的注意点

- 极验对 `Selenium` / `electron` 等有主动监测（见 §五 的 `em`），
  **协议路线更稳**；自动化只适合作为取证或短时验证。
- 用 DrissionPage 时：滑块图**不在 HTML 里**，必须用监听功能抓 `api.geetest.com` 的响应
  （`page.listen.start('api.geetest.com')` → 点击触发 → `page.listen.wait(count=2)`）。
- 轨迹函数坑：`1 - 2**(-10*sep)` 这类**缓动函数生成的是累积位置**。
  纯算（提交给 `aa`）直接用累积值；**浏览器自动化要用相邻差值**
  （`move(offset_x = cur - prev)`），否则实际位移与目标距离不符。
- **自动化只能覆盖"图像识别 + 轨迹生成"这两步**：`w` 仍由页面脚本生成，
  所以它解决的只是"手工拖不过去"，不是"免协议逆向"。
  站点若另做设备/环境指纹校验，自动化同样会失败 —— 判据见 §五 的 `em` 探针位。

---

## 十三、轨迹一致性三件套 + 采集下限

生成轨迹后必须自检这三个量，任何一项自相矛盾都是白给：

| 断言 | 说明 |
| --- | --- |
| `passtime ≈ 轨迹总时长` | 两者同量级（实测 600~1100ms 较稳） |
| `setLeft ≈ 轨迹终点位移` | 距离要落在识别结果上 |
| `ypos` 量级合理 | 用 `load` 返回的 `ypos` 交叉验证 y 坐标 |

采集器的硬性下限（自己造轨迹时别突破）：

- 距上一采样点**不足约 16.7ms（60fps 一帧）的移动点会被丢弃**；
- 位移 **< 2px 且间隔 < 80ms** 的"静止点"会被丢弃；
- 点数**超过 150 触发抽稀**（保首点、压尾段、保留 `end` 点）⇒ 自己生成控制在 150 以内；
- 轨迹是**鼠标指针的轨迹，不是滑块按钮的**（y 会全程自由抖动）；
- 速度曲线用四段式：慢起 → 加速 → 减速 → 末端微调。

v3 的年代统计口径（老版本更看行为分布）：

- **80%~90% 的采样点间隔在 15~20ms**，10%~15% 在 20ms 以上；
- 起点 x 为负数，取值约 `(-40, -18)`；第二个点是 `[0,0,0]`；
- `y` 多为 0，少量 `-1`，极少 `-2`/`+1`；
- 总耗时与距离正相关，但**老文章里给的数值自相矛盾**
  （注释写「距离 <100 约 1300~1900ms、>100 约 1700~2100ms」，代码实际取的是
  `random.uniform(500,1500)` / `random.uniform(1000,2000)`）⇒
  **以自己抓包的真实成功样本统计为准**，不要把这两个区间当硬指标；
- 位置曲线近似 `tanh` 与 `arctan` 的混合（快增段 + 末端微调）。

---

## 十四、排错清单（每条都是实测翻车点）

| # | 症状 | 原因 |
| --- | --- | --- |
| 1 | v3 一直 `forbidden` | 只逆了第三个 `w`，前两个是空的/错的 |
| 2 | 解密出来的明文是乱码 | IV 被当成 16 个 `\x00`，实际是 **16 个 ASCII `'0'`** |
| 3 | v4 偶发失败 | `pow_detail.bits` 写死；应动态读 + 整数比较 |
| 4 | 防篡改块对不上 | 抄了老教程的切片下标；下标是**版本相关**的 |
| 5 | `w` 解密后找不到 `new_track` | 它在 AES 加密前被 `delete` 了，只存在于两个断点之间 |
| 6 | 失败后无限 fail | 没跟重试链：要用失败响应里的**新** `payload`/`process_token` 走 `pt=1` 换题 |
| 7 | Python 解析响应报错 | JSONP 壳没剥（外层是 `geetest_xxx({...})`） |
| 8 | 本地 gzip 与浏览器字节不一致 | `fflate` 与 Python `gzip` 的 mtime/OS 字段不同，见 `../../web-reverse-algorithm/references/06-engineering-maintenance.md` §十三 |
| 9 | 明明返回了却判定失败 | 只看 HTTP 200 / 外层 `status`，必须断言 `data.result` |
| 10 | 自动化拖动算出负距离 | 选择器 `[class*="geetest_btn"]` 同时命中 svg 容器与按钮，先 `getBoundingClientRect` 确认 |
| 11 | v4 通过却登录失败 | 固定键值对（异常标记）与 SDK 版本不匹配，见 §十一 |
| 12 | v3 三个 `w` 的 key 不一致 | 同一文件/同一会话**只生成一次随机 key**，多处重新随机就废了 |
| 13 | 四代报 `param decrypt error` / `-50002`，但 `w` 公式明明对 | **PoW 没解出来**：哈希函数写死 md5、或难度用 `2**(256-bits)` 判 | 见 §8.1，用 `geetest_pow.py` |
| 14 | 三代无感"前面每一步都对，最后必挂" | `get.php` 的 `w` 漏带 ⇒ 拿到的 `s` 是**假值** | 见 §十五 |
| 15 | 消消乐/五子棋坐标"看着没错"却永远 `fail` | `ques` 是**按列**给的，按行理解会整体转置 | 见 §十七 |
| 16 | 点选类偶发 `duration short` | 生成 `w` 后没停留，流程太快 | 加 ~2s 随机 sleep；注意它在 `success` 壳里 |
---

## 十五、一键通过（无感 / `risk_type=ai`）模式：**同一个流程里两个 `w`**

无感模式下用户不拖动，但**要发的 `w` 反而更多**，这是最容易漏的一步：

| 处 | 三代无感 | 四代无感 |
| --- | --- | --- |
| 第 1 个 `w` | `get.php`（取 `c`/`s`）**必须带 `w`** —— 不带也能拿到 `s`，但那是**假值**，最后一步必挂 | 无（四代只有 `load` / `verify` 两个请求） |
| 第 2 个 `w` | `ajax.php` 提交 | `verify` 提交 |
| 两次生成方式 | **不同**，必须分两次扣 | 同一条公式，只是 `data` 分桶不同 |

- 三代无感的第 2 个 `w` 不是"轨迹加密串"，而是**把浏览器环境值 + 鼠标移动数据拼成一个大字符串再 AES**：
  `ep.ven` / `ep.ren`（显卡）、`ep.fp` / `ep.lp`（首末鼠标位置）、`ep.tm`（`performance.timing`）、
  以及若干 `captcha_token` 类字段。实测样例里**这几个环境值置空也能过**，
  但**别默认所有站点都能置空**（"某些站点校验更严"——原文作者的原话）。
- 无感模式第 2 次 `get.php` 返回的 `s` 是**参与 `aa` 插入重排的服务端盐**（见 §四）；
  **不带 `w` 时它照样返回，但内容是假的** ⇒ **只有"最终失败"这一个症状**，
  没有任何报错指向它。判据：**只要是无感，就先去 `get.php` 检查 `w` 有没有带。**

---

## 十六、动态键值对（`h9s9` / `kqg5` / `f019` / `l0zs` / `xnbw` / `olbo`）

三四代 `w` 的 `data` 里总会多出一个**随机键值对**，键名与值都每隔一段时间（小时~天级）变化：

```text
三代：{h9s9: "1816378497"}      四代滑块：{kqg5: "1557244628"}
四代点选：{f019: "1024281898"}   四代无感：{l0zs: "53502544"}
深知 V2：{xnbw: "1158444372"} / {olbo: "1588069361"}
```

- 它由 `gct.js` / `gct4.js` 生成（路径在 `get.php` / `load` / `gettype` 的响应里给），
  **量少时写死也能过**，但**大量请求或校验严格的站点会翻车**；
- 动态获取的固定套路（把 gct 脚本当纯函数导出）：

  ```python
  # 1) 从接口响应里取 gct.js 地址并下载
  # 2) 正则取它内部暴露出来的方法名（形如 `)){return <name>(`）
  function_name = re.findall(r"\)\)\{return (.*?)\(", gct_js)[0]
  # 3) 在 `return function(t){` 之前插入 `window.gct=<name>;`，再用 execjs/Node 调一次
  #    var e = {"lang": "zh", "ep": "test data"}; window.gct(e); delete e.lang; delete e.ep; return e;
  ```
  
  ⇒ 返回值即那个键值对（如 `{'h9s9': '1803797734'}`）。
- ⚠️ **口径边界**：§五 把 `h9s9` 记作"**djb 代码签名**"，而该机制说明**不来自本批 15 篇**
  （本批只证实"由 gct 生成、键与值随时段变化、量少时可写死"）⇒ 两者是**同值不同视角**，不要互相推导。
  实操结论不变：**改动过被签名的函数（含补环境改动）就必须重取**，不要复用旧值。

---

## 十七、题型 → `userresponse`（`data` 分桶）写法表

四代 `captcha_type` / `risk_type` 直接给题型，`userresponse` 的写法按题型分五种：

| 题型 | `captcha_type` / `risk_type` | `userresponse` | 附带字段 |
| --- | --- | --- | --- |
| 滑块 | `slide` | `setLeft / 1.0059466666666665 + 2`（**定值常量**，不是 1） | `setLeft`、`track`、`passtime` |
| 文字点选 | 四代 `captcha_type=word`；**三代是第一次 `ajax.php` 返 `type=click`**（不是 `captcha_type`） | 点选坐标（相对底图） | `ques` = 各文字图链接；三代用第二次 `get.php` 的 `pic_type` 细分 |
| 图标点选 | `icon` | 同上 | — |
| 语序点选 | `phrase` | 同上（顺序即答案） | — |
| 空间推理 | `space` | 同上（含箭头/方向语义） | — |
| 九宫格 | **本批 15 篇未给出独立的类型名**（只到"图标点选 `icon`"这一层） | 格子坐标 | 判据见 §九 |
| 消消乐 | `match` | **交换的两个坐标**，如 `[[0,1],[0,0]]` | `ques` = **3×3** 矩阵 |
| 五子棋 | `winlinze` | 同上 | `ques` = **5×5** 矩阵（`0` = 空位） |
| 无感 | `ai` | 见 §十五 | （`payload_protocol=1` / `pt=1` 是 **v4 的 verify 通用参数**，不只无感带） |

> 🔴 **消消乐的 `ques` 是"按列"给的**：`ques[0] / ques[1] / ques[2]` 分别对应**第 0 / 1 / 2 列**，
> 不是行。按行理解会把坐标整体转置 ⇒ 结果永远是 `fail`（且和"交换错了"同一个症状）。
> 五子棋要凑的是**同列 / 同行 / 对角线上的 5 个相同数字**；消消乐是 3 个同色成一行或一列。
> 判对坐标后**成功率 100%**（消消乐/五子棋实测，坐标判对即必过）；
> 滑块类约 **95%**（`52pojie-1749808` 实测「100 次大概 95% 的成功率」；`52pojie-1631496` 另测 100 次 89 次）
> —— 轨迹仍被评分，**不要按"必过"设计重试策略**。

---

## 十八、报错码 → 根因速查（照这个表读，别猜）

| 返回 | 根因 | 处置 |
| --- | --- | --- |
| `{"status":"error","error":"param decrypt error","error_code":"error_03"}` | `w` 解不开：①16 位随机串两次不一致 ②无感时 `get.php` 漏带 `w` ③PoW 用了错的哈希/难度 | 见 §十五 / §8.1；先查"随机串是否同一个" |
| `{"status":"error","error":"illegal challenge","error_code":"error_23"}` | 用了**第 1 次**的 challenge（三代滑块第 5 步会返回**多 2 位尾巴**的新 challenge） | 全程用新值 |
| `{"status":"error","error":"not proof","error_code":"error_21"}` | 没有轨迹 / 轨迹字段缺失 | 补 `track` 与 `passtime` |
| `{"success":0,"message":"fail"}` | ①challenge 用错 ②轨迹与缺口距离不匹配 ③题型坐标错（含消消乐行列转置） | 先核对 challenge 与坐标语义 |
| `{"success":0,"message":"forbidden"}` | ①用了第 1 次 `get.php` 的 `s`（要第 2 次的）②`passtime` 与轨迹末项时间不一致 | 两次 `c`/`s` 用**第二次**的；`passtime = track[-1][2]` |
| 四代 `{"status":"error","code":"-50002","msg":"param decrypt error"}` | 同 `error_03`（四代版） | 同上 |
| `{"status":"success","data":{"result":"fail","msg":["duration short"]}}` | **流程走太快**：三代点选类要求"生成 `w` 后随机停留 ~2 秒" | 加随机 sleep；注意这是 **success 壳里的 fail**，别只看外层 |
| 一直 `fail` 且响应里带**新的** `payload`/`process_token` | 失败后要换题重试（四代 `pt=1`） | 用新票据重走 `verify` |

> **两条读法**：① 失败信息**分成三种壳**：`{"status":"error",...}`（三代/四代）、`{"success":0,...}`（三代）、
> **`{"status":"success","data":{"result":"fail",...}}`（三代点选，例：`duration short`）**
> —— 只断言外层 `status` 会把"成功了但没通过"读成通过；
> ② `error_03` / `-50002` 是**唯一会被误诊成"`w` 算法写错"的一类**，真因常常是 PoW 或随机串。

---

## 十九、补环境两件高频缺失（三代 `slide` 实测位置）

1. `window.crypto.getRandomValues(buf)`：要照规范拒绝超限并带错误码，否则被尺寸/异常探针抓到。

   ```js
   // buf.length > 65536 时必须抛 QuotaExceededError（code=22）；
   // Uint16Array 上界 65535、Uint32Array 上界 4294967295，其余 [0,255]
   ```

2. `window.performance.timing`：**21 个字段**（来源文章的 `timing()` 示例与真实 `ep.tm` 样本都是 21 个），
   且必须满足**单调递增**关系
   （`navigationStart ≤ redirectStart ≤ redirectEnd ≤ fetchStart ≤ domainLookupStart ≤ … ≤ loadEventEnd`）。
   整串照真实浏览器抄或按 `Date.now()` 加固定偏移生成均可，但**不能随机乱序**
   （`web-reverse-env` 的 `03-special-cases.md` §5（`performance-module`）有同一份约束。）
   ⚠️ 来源文章给的那段 `timing()` 示例**只用来抄字段清单，本身并不单调**
   （`redirectStart=0`、`unloadEventStart=now+200` 早于 `fetchStart=now+100`）——照抄它会被时序一致性探针抓到。

---

## 二十、深知 V2（业务风控，不是验证码）：**无键名 payload** 的定位法

`risk_type` 之外的另一个产品线：`v2.sense.js`（带 `id`，即请求里的 `app_id`）+ `gettype`（返回 `gct.js` 路径）
+ `judge`（提交一个**超长、无键名的 `Request Payload`**，通过后返回 `session_id`）+ 业务接口（带 `session_id`）。

- **无键名 ⇒ 全局搜索关键字这条路直接失效**（搜不到任何字段名）：只能
  ① 跟栈（`sense.*.js` 里形如 `e + h[...]` 的拼接点）② 或直接下 **XHR 断点**；
- payload 的两段（**与 v3/v4 的 `w = 密文段 + RSA 段` 同构**）：
  `e`（**AES 密文段**，明文是 `NFeB` —— 里面同时含**浏览器环境指纹 `u`** 与业务 `data`/`id`/`insights`）
  `+` `h[AUJ_(1173)]`（**RSA 密钥段**，`h` 是 `{aeskey, rsa}` 两个字段）；
  拼接顺序按原文是 **`e + h[...]`**（`sense.*.js` 第 6144 行），另有一个 `{olbo: "…"}` 型动态键值对（见 §十六）；
- 判据与四代一致的无感特征：**页面加载即自动完成，不需要用户交互**。

---

## 二十一、复跑命令（本文件新增能力的可执行入口）

```bash
# 命令基准：`S=skills/web-verify-patcher/scripts` 以**技能库父目录**为基准（先 cd .claude 或 cd .agents）；
#   从仓库根执行请把 `skills/` 换成 `.claude/skills/`。
S=skills/web-verify-patcher/scripts

# PoW（§8.1）：求解 + 独立校验 + 自检（断言条数以实跑输出为准）
python $S/geetest_pow.py --selftest
python $S/geetest_pow.py solve --from-load load.json --json
python $S/geetest_pow.py check  --from-load load.json --pow-msg <msg> --pow-sign <sign>

# 底图还原（§三）：v3 = 26×2 片、源 stride 12、左偏移 1，312×160 → 260×160
# 注意：底图还原只吃 PNG（WebP 先用浏览器 canvas `toDataURL("image/png")` 转码），gt3 要求原图恰为 312×160
python $S/restore_slices.py --model gt3 --input bg.png --out bg.clear.png
python $S/restore_slices.py --selftest

# 缺口定位 / 坐标映射 / 轨迹
python $S/map_coordinates.py --help
python $S/generate_motion_track.py --mode slider --distance <d> --pretty > track.json
```

