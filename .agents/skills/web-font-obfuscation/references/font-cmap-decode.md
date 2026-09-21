# 字体反爬：cmap 两层映射、稳定性判定与轮廓指纹

> 目录
> 1. 字体文件里到底存了什么
> 2. 四类映射模板（按稳定性分类）
> 3. 稳定性判定流程（含命令）
> 4. 轮廓指纹：让映射表自动跟着字体轮换走
> 5. 真实案例：抖音（单层）与 58 同城（两层）
> 6. 校验清单与常见坑（**字体文件层面的坑，唯一权威源**）
> 7. 真值到底藏在哪：glyphName 的四种形态、gid 顺序表、渲染+OCR 兜底、同站多族分层

---

## 1. 字体文件里到底存了什么

反爬用到的只有三张表，知道它们的作用就够了：

| 表 | 作用 | 反爬里的意义 |
| --- | --- | --- |
| `cmap` | 码位（Unicode）→ 字形索引 gid | **第一层映射**，也是 HTML 里看到的那些乱码的来源 |
| `glyf` + `loca` | gid → 真实轮廓点 | **字形的真身**；同一形状在任何字体版本里轮廓都一样 |
| `post` | gid → 字形名（如 `glyph00010`） | **第二层映射的锚点**，但只在 `post` 版本 2.0 时存在 |

`loca` 是偏移表：`glyf[loca[gid] : loca[gid+1]]` 就是该字形的字节段。`head.indexToLocFormat` 决定 `loca` 项是 2 字节（值 ×2）还是 4 字节。

`cmap` 里可以有多个子表（platformID/encodingID 组合），实际有用的通常是 **format 4**（BMP）与 **format 12**（含增补平面）。解析时取条目最多的那个子表。

容器形态：`sfnt`（`.ttf`/`.otf`，签名 `\x00\x01\x00\x00` / `OTTO`）、`WOFF1`（签名 `wOFF`，逐表 zlib 压缩）、`WOFF2`（需 brotli，本仓库脚本不支持）、`TTC`（签名 `ttcf`，多字面共用表，**表偏移相对整个文件而不是相对字面头**——这是最容易写错的地方）。

---

## 2. 四类映射模板（按稳定性分类）

判定完稳定性后，落到下面四类之一。

### 模板 A：单层稳定（code → 真值）
字体固定、cmap 固定。直接把人工读出的对应关系写成常量表。

```
{0xe602: '1', 0xe603: '0', 0xe604: '3', ...}
```
注意：**同一真值可能对应多个码位**。抖音就给每个数字准备了 3 个码位（`0xe602/0xe60e/0xe618` 都画成 `1`），目的是让静态表失效。所以模板 A 的键必须允许一对多。

### 模板 B：单层随机（code → 真值，每次变）
`code→glyphName` 每次刷新都变，且 `post` 表没有真名。此时只能：
- 每次请求实时导出映射，再靠**一次人工校准**（渲染字形图看一眼）或**轮廓指纹**对齐到历史校准表。

### 模板 C：两层（code → glyphName → 真值）
`glyphName` 稳定、`code` 随机。建表分两步：
1. 从 `cmap` 拿 `code → glyphName`；
2. 人工校准一份 `glyphName → 真值`（只做一次）；
3. 运行时 `真值 = glyphNameMap[cmapMap[code]]`。

### 模板 D：两层随机（code 和 gid 都变）
最恶劣的情况。唯一可靠锚点是 **glyf 轮廓**：见第 4 节。

> 判断技巧：把两次抓取的映射做 diff。`by_codepoint` 差异大、但 `by_glyph`（glyphName → 码位集合）的形状一致，就是模板 C。

---

## 3. 稳定性判定流程

```bash
# 同一页面、间隔一次刷新，抓两份字体
python skills/web-font-obfuscation/scripts/font_cmap_dump.py dump run1.ttf -o run1.json
python skills/web-font-obfuscation/scripts/font_cmap_dump.py dump run2.ttf -o run2.json
python skills/web-font-obfuscation/scripts/font_cmap_dump.py diff run1.json run2.json
```

输出里关注两行：

- `code->glyphName 稳定: N` —— 若 N ≈ 交集大小，说明 code 稳定（模板 A/B）。
- `code->glyphName 变化: M` —— 若 M 占多数，再看 `by_glyph`：glyphName 集合相同 → 模板 C；glyphName 集合也不同 → 模板 D。

补充判定：如果 `run1` 与 `run2` 的 `by_codepoint` **完全无交集**，说明字体是按请求随机生成的子集，必须每次实时导出。

---

## 4. 轮廓指纹：让映射表自动跟着字体轮换走

核心洞察：**同一个数字的字形轮廓，在任何字体版本里都是同一份点序列**。

```bash
python skills/web-font-obfuscation/scripts/font_glyph_fingerprint.py fingerprint run1.ttf -o fp1.json
python skills/web-font-obfuscation/scripts/font_glyph_fingerprint.py fingerprint run2.ttf -o fp2.json
python skills/web-font-obfuscation/scripts/font_glyph_fingerprint.py crosswalk fp1.json fp2.json -o cross.json
```

`crosswalk` 输出 `code_run2 → code_run1` 对照表。**只要人工校准过一次 run1，之后所有 run2 都能自动对齐**。

指纹算法（脚本内实现）：

1. 单轮廓简单字形：取 `numberOfContours`、`endPtsOfContours`、以及**绝对坐标点序列**（含 on-curve 标志），拼成规范串后取 md5。
   - 坐标必须从增量还原成绝对值，否则同一字形因编码方式不同（`X_SHORT`/`X_SAME` 组合）会产生不同指纹。
2. 复合字形：退化为整段 `glyf` 字节的 md5。
3. 同一指纹对应多个 gid（如空格、`.notdef`、形状相同的字母）时标记为不唯一，`crosswalk` 会跳过，不猜。

若站点连轮廓都做了微扰动（罕见），退路是**渲染位图后做感知 hash**：用 `PIL.ImageFont` 把每个字形渲染成固定尺寸灰度图，取 dHash/pHash 做锚点。

---

## 5. 真实案例

### 抖音个人主页（单层 + 一对多 + 单位占位）

- 定位：Network 里 `iconfont_9eb9a50.woff`；页面用 `<i class="icon iconfont follow-num">` 承载每个数字。
- 结构：单层。码位是私有区 `0xe6xx`，每个数字有 3 个等价码位。
- 两个必须处理的细节：
  1. **空格补位**：源码里数字之间夹着空格，原帖用 `content.replace(' ', '0')` 先把空格当 0；更稳的做法是先切出数字区间再替换。
  2. **万位单位**：末尾的 `w` 是「万」，原帖用 `str(float(x) / 10) + 'w'` 再 `× 10000`。注意 `/10` 是因为展示只保留一位小数，实际值要按站点规则校准，不要照抄。
- 教训：原帖那张 `regex_list` 是 2020 年的一次快照。字体轮换后**不会报错**，只会静默输出错数字。

### 58 同城租房列表（两层 + base64 内嵌）

- 定位：**没有任何字体请求**。CSS 里有 `fangchan-secret` 字段，其 `src` 是 `data:application/font-ttf;charset=utf-8;base64,...`。
- 结构：两层。`cmap` 里 `<map code="0x9476" name="glyph00010"/>`，而 `glyph00010` 稳定对应数字 `9`；`code` 每次刷新都变。
- 关键结论（原帖反复刷新验证）：**code ↔ glyphName 变，glyphName ↔ 数字不变**。
- 原帖的替换写法有个坑：
  ```python
  _keys = json.loads(json.dumps(self.keys).replace("0x", "").replace('":', ';":'))
  ```
  这是把 `{'0x9476': '9'}` 改造成 `{'9476;"': '9'}` 去匹配 HTML 里的 `&#x9476;`。它依赖 HTML 恰好写成 `&#x9476;` 这种形式；**更稳的做法是 `html.unescape()` 之后按真实字符替换**，可以同时覆盖 `&#x9476;` / `&#9476;` / 直接内嵌字符三种写法。

---

## 6. 校验清单与常见坑

替换前后各做一次，缺一不可：

- [ ] **抽样校验**：至少 3 个字段与原页面肉眼比对。数字类错误不会抛异常。
- [ ] **反向校验**：把替换结果里的数字再映射回码位，确认能还原成原 HTML（证明映射是双射或至少单向一致）。
- [ ] **作用域校验**：只替换目标 DOM 区域，不碰 `<style>` / `<script>` / JSON 配置里的同码位字符。
- [ ] **缓存校验**：映射表的缓存 key 用「字体 URL + 字体内容 md5」，不要只用 URL——同一 URL 的字体内容可能按 session 变。

常见坑：

| 坑 | 症状 | 处理 |
| --- | --- | --- |
| 只匹配 `0x9476` 而 HTML 里是 `&#x9476;` | 替换 0 处，静默 | 先 `html.unescape` |
| 数字被当成整数解析 | 前导 0 丢失 | 全流程按字符串处理 |
| `cmap` 有多个子表 | 只解析出部分字符 | 取条目最多的子表（脚本已处理），或按 `unicode-range` 拆字体 |
| TTC 表偏移理解错 | 报「缺少 cmap 表」 | 表偏移相对**整个文件**；脚本 `--face N` |
| 用 `saveXML` 人眼比对 | 无法回归、无法 diff | 落 JSON 映射，纳入版本管理 |
| 字体 URL 带 hash 就以为映射不变 | 偶发错数据 | 每次请求重建映射，或指纹对齐 |

---

## 7. 真值到底藏在哪：glyphName 的四种形态与一条兜底

第 2 节的模板 A–D 是按**稳定性**分类的。实战里更快的判据是按 **glyphName 的形态**分，
因为它直接决定「能不能直接解出来」：

| 形态 | 例子 | 真值来源 | 处置 |
| --- | --- | --- | --- |
| `uniXXXX` 且 `XXXX ≠ 码位` | `cmap[0x6C5F] = 'uni653F'` | **字形名本身就是真值码位** | `chr(int(name[3:],16))` —— **直接解，不需要 OCR、不需要校准** |
| `uniXXXX` 且 `XXXX == 码位` | `cmap[0xE800] = 'uniE800'` | 名字不携带信息 | **先别下结论**，见下方「恒等命名」两条分支 |
| 英文语义名 | `one/two/three/zero/period` | 名字是英文数字 | 建一张 10+2 项的表（`period` 是小数点） |
| `glyphNNNNN` / `cidNNNN` | `glyph00010` | **gid 顺序**或轮廓 | 见下方「gid 顺序表」 |
| 真名（`.notdef`/`space`/汉字名） | — | 名字即真值 | 直接用 |

> **先做这一步再决定后面所有事**。`uniXXXX` 命中「且不等」的那一类，整条链路就退化成一行 `chr()`。

#### 恒等命名（`XXXX == 码位`）的两个分支 —— 判据是「字体是否固定」，不是「名字等不等」

**这一类只说明「字形名不携带信息」，不能推出「图元被换」。** 两个真实站点都命中它：

| 站点 | 现象 | 真值来自 | 处置 |
| --- | --- | --- | --- |
| 潇湘书院 | 私有区码位 `&#xE800;`，`cmap[0xE800]='uniE800'`，字体文件**固定** | 一次性人工校准的静态字典（`{'uniE800':'的', …}`） | **模板 A**：校准一次即可，别去找官方字体 |
| 超星学习通 | `cmap[0x6408]='uni6408'`，但 `glyf` 里是**别的字的轮廓** | 官方字体的图元 | **F 族**：`font_template_diff.py` |

**判据（按顺序做，不要跳）**：

1. **先看页面显示与源码字义是否一致**。一致 → 只是码位被搬到了私有区（模板 A/B），
   用一次校准或轮廓指纹即可；不一致（源码 `搈`、屏幕 `争`）→ 才可能是 F 族。
2. **再看字体文件是否每次刷新都变**。固定 → 一次性校准就够（模板 A）；
   每次变 → 需要轮廓指纹（`font_glyph_fingerprint.py`）或官方模板（`font_template_diff.py`）。
3. **F 族还要求「存在一份官方原版字体」**。若站点用的是**私有区自造字体**（如潇湘），
   `U+E800` 在官方字体里根本不存在，模板反查必然全进 `unknown_fingerprint` —— 这条路走不通，
   老老实实走第 1 步的校准。

> 换句话说：**恒等命名 + 显示/源码不一致 + 有官方原版字体**，三条同时成立才是 F 族。

### gid 顺序表（`getGlyphOrder()` 固定顺序）

有一类站点把字体**子集化后按固定顺序排列 gid**，每次刷新只改 `cmap`、不改 gid 顺序：

```python
font = TTFont(BytesIO(content))
code = font.getGlyphOrder()[1:]        # 去掉第 0 个 .notdef
nums = ['0','1','2','3','4','5','6','7','8','9','.','w','k','m','+']   # 固定明文顺序
temp = dict(zip(code, nums))           # gid → 真值
for k, v in font.getBestCmap().items():  # 码位 → gid
    key_map['&#x%x;' % k] = temp[v]
```

两个必须注意的点：

1. **`getGlyphOrder()[0]` 是 `.notdef`**，必须切掉；不切会让整张表错位一位（错误是静默的）。
2. 明文顺序表（`nums`）是**站点自己定的**，只对当前站点成立；顺序表里出现
   `'.'`/`'w'`（万）/`'k'`/`'m'`/`'+'` 这类单位与符号，说明它服务的是「粉丝数/播放量」这种复合数值。

### 兜底：渲染 + 识别（cmap 与轮廓都用不上时）

判据：`cmap` 为空或只有 `gidN`、`post` 表是 3.0（无名字）、轮廓又对不上任何官方模板。
此时只剩「把字形画出来认」。

1. **渲染**：`ImageFont.truetype(path, size)` 画到白底黑字画布，**字形居中并留白**
   （留白不足会显著降低识别率）；字号取画布的 0.7 倍左右；单通道图再 `convert('RGB')`
   （部分识别库只吃三通道）。
2. **识别**：`ddddocr`（`classification(img_bytes)`，单字符，数字/字母准）或 `cnocr`
   （`ocr_for_single_line(np.array(img))` 带 `score`，汉字更准）。
3. **分档复核**：给 `score` 设阈值（如 0.95），**低于阈值的必须落盘人眼复核**——
   实测低分不等于错（`了`/`一`/`孩` 这类笔画少的字分数天然低）。
4. **后处理映射表**：OCR 对数字符号有系统性误判，必须过一遍
   `十 → +`、`，/。 → .`、`O → 0`、`l/I → 1`。
5. **反向校验**：识别结果**必须**能通过「与 `cmap` 项数相等」+「抽 3 个字与渲染图肉眼一致」两道检查。

> 与反例黑名单里那条「不要用 OCR 代替解析 cmap」不冲突：
> 那条反对的是**cmap 明明可用却去 OCR**（多此一举且引入误差）。
> 这里说的是 **cmap/轮廓都不可用时的兜底**——两者是互斥场景，不要混。

### 同一站点可能同时命中多族

一个站点常把「字体反爬 + CSS 反爬 + 响应体加密」叠着用（例如先自研 base64 变体解响应，
再发现正文还套了一层字体映射）。**先把这三层分开判断**，不要一上来就扎进最外层：

| 层 | 判据 | 走哪里 |
| --- | --- | --- |
| 响应体加密 | 返回的是 `0-9A-Z` 定长串，解出来才像正常文本 | `css_obfuscation_reverse.py pack` |
| 文本层混淆 | 解出来是乱码码位 / 少字 / 顺序不对 | 本文档 + `css-and-sprite-obfuscation.md` |
| 参数签名 | 请求头/query 有签名参数 | `web-reverse-algorithm` |
