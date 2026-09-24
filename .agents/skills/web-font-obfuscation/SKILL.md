---
name: web-font-obfuscation
description: 网页字体反爬（字体加密）与 CSS / 雪碧图 / 伪元素反爬的识别与还原技能。当页面显示正常但抓下来的 HTML 是乱码、生僻字、`&#x9fa4;`、`&#xe602;`、私有区码位，或页面正常而源码里的字「看着对但字义不对」、数字位置是空标签/背景图、文字莫名少几个字、接口返回一长串 `0-9A-Z` 定长串时使用。覆盖 `@font-face` 与 `data:application/font-ttf;base64,` 内嵌字体定位、`cmap`/`glyf`/`post` 表解析、`code→glyphName→明文` 两层映射判定、每次刷新字体变化的稳定性分析、用字形轮廓指纹抵抗字体轮换、用官方字体图元反推「cmap 正常但图元被换」的伪造字体、CSS `background-position` 雪碧图网格还原、`left` 偏移位移换序、`::before` 伪元素补字、定长分组自定义进制解码。用户提到字体反爬、字体加密、字体映射、fontTools、TTFont、saveXML、cmap、glyph、woff/woff2/ttf/eot、iconfont 数字、雪碧图、精灵图、background-position、CSS 反爬、伪元素、::before、content 补字、文字错位、文字缺失、base64 图片数字、58 同城/抖音/大众点评/猫眼/携程/汽车之家/超星学习通/实习僧/起点/优某愿一类数字或文字伪装、或说「爬下来数字是奇怪符号」「复制出来和网页显示不一样」时都应使用本技能。
---

# 网页字体反爬还原

字体反爬的本质只有一句话：**页面用自定义字体把「真值」画出来，但 HTML 里存的是「码位」**。还原 = 建立「码位 → 真值」这张表，再对文本做替换。

难点不在解析字体，而在判断**哪一层是稳定的**——很多站点字体每次刷新都换，硬编码映射表活不过一次刷新。

> 先读 `references/font-cmap-decode.md`（两层映射 / 真值形态判据 / 稳定性）。本文只给执行顺序。

## 适用判断（30 秒分流）

**先看 Network 有没有 `.woff/.ttf/.svg`。没有 → 直接走 B/C/D/E 族。**

| 现象 | 族 | 命令 / 去向 |
| --- | --- | --- |
| HTML 里是 `&#x9fa4;` / 生僻字 / 私有区 | A 字体 cMap | 走下面工作流 |
| 源码是**正常汉字**但字义不对（`搈` vs `争`） | **F 图元被换** | `font_template_diff.py` |
| 数字位置是 `<i class="iconfont">` 空标签 / 有 `background-position` | B 雪碧图 | `css_obfuscation_reverse.py offsets\|sprite` |
| 源码顺序对、**渲染顺序错**（`2941` 显示 `2914`） | C 位移换序 | `css_obfuscation_reverse.py order` |
| 文本**比页面少几个字**、不报错，有空的 `<span class="context_kwN">` | D 伪元素补字 | `css_obfuscation_reverse.py pseudo` |
| 接口返回一长串 `0-9A-Z` 定长分组 | E 打包编码 | `css_obfuscation_reverse.py pack` |
| 整页乱码且**没有**字体请求 | 不是字体反爬 | 先修 `response.encoding` |
| 数字正常但请求参数被签名 / 字体只出现在验证码里 | 不是本技能 | `web-reverse-algorithm` / `web-verify-patcher` |

> B/C/D/E/F 五族的判据、算法与陷阱统一收在 `references/css-and-sprite-obfuscation.md`。

## 工作流

1. **定位字体来源（三条线并行，不要只试一条）**
   - 网络线：DevTools Network 过滤 `Font`，或抓包找 `.woff/.woff2/.ttf/.otf/.eot`。
   - CSS 线：搜 `@font-face`，看 `src: url(...) format(...)` 的地址是不是同一域名。
   - 内联线：搜 `data:application/font-ttf;charset=utf-8;base64,` 或 `data:font/woff2;base64,`——很多站点把字体直接塞进 HTML/CSS，**没有任何字体请求**。
2. **落盘字体**：URL 直接下载；base64 先 `base64.b64decode` 再写 `.ttf`；HTML 实体先 `html.unescape`。
3. **导出映射**：
   ```bash
   python skills/web-font-obfuscation/scripts/font_cmap_dump.py dump font.ttf -o font.json
   python skills/web-font-obfuscation/scripts/font_cmap_dump.py dump font.woff --face 0 -o font.json
   python skills/web-font-obfuscation/scripts/font_cmap_dump.py --selftest   # 解析器自检
   ```
4. **🔴 CHECKPOINT · 判定稳定性（必做，不能跳过）**：同一页面**连续抓两次字体**，比对两次的映射：
   ```bash
   python .../font_cmap_dump.py diff run1.json run2.json
   ```
   - `code→glyphName` **不变** → 单层映射，直接 `code → 真值`，可缓存。
   - `code→glyphName` **每次都变** → 两层映射。此时 glyphName 是不变的锚点，必须再建立 `glyphName → 真值`，而这张表要靠**人工校准一次**或**字形轮廓指纹**自动生成（见 references）。
   - 两次 diff 完全无交集 → 字体是按请求随机生成的，**放弃静态表，改为每次请求实时导出**。
5. **建立「码位 → 明文」表**：按第 4 步的稳定性结论套进 `references/font-cmap-decode.md` 的四类模板之一。
6. **替换文本并抽样校验**：用 `font_cmap_dump.py text` 或自己的替换逻辑处理后，**至少抽 3 个字段与原页面肉眼比对**。校验不过 → 回第 4 步，不要继续往下写。
7. **工程化收尾**：映射表随响应一起生成、随字体一起缓存（按字体 URL 或字体 md5 做 key），不要跨请求复用。

## 失败模式与一线修复

| 触发条件 | 一线修复 | 仍失败兜底 |
| --- | --- | --- |
| 替换了但数字全错 | 检查是不是把 HTML 实体 `&#x9fa4;` 当纯文本 `0x9fa4` 匹配了 | 先 `html.unescape(html)` 再匹配 |
| 刷新一次就失效 | 命中了「两层映射」或「随机字体」 | 改走 glyphName 锚点 + 轮廓指纹，或每次请求实时导出 |
| 字体文件层面的坑（WOFF2 / TTC / 多 cmap 子表 / post 3.0 / 部分还原） | 见 `references/font-cmap-decode.md` §6 常见坑表（唯一权威源） | — |
| **`cmap` dump 完全正常、原文也不是乱码** | 命中 F 族（图元被换），或 `uniXXXX` 的 XXXX == 码位（名字不带信息） | `font_template_diff.py`（先用官方字体建模板库） |
| 数字少了一位/多了个 0 | 页面用空格或 `w`（万）做单位占位，被一起替换了 | 先切出数字区间再替换，单位单独处理 |
| 数字对但顺序错 | 码位顺序 ≠ 显示顺序 | **先排除 C 族（CSS `left` 位移）**，再考虑「已知值反推」校准 |

## 反例黑名单（不要做的事）

- **不要把某一家的 `regex_list` 硬编码进通用代码**。抖音 2020 年那份 `0xe602/0xe60e/0xe618 → 1` 的表是一次抓样的快照；字体轮换后立刻全错，而错误是**静默**的（数字看起来仍然像数字）。
- **不要只用 `fontTools.saveXML` 人眼看图**。看图能出结论但不能回归；至少落一份 JSON 映射可 diff。
- **cmap 可用时不要用 OCR 代替解析 cmap**（多此一举且引入误差）；OCR 只是 cmap/轮廓都不可用时的兜底。
- **不要把「字体文件 URL 不变」当作「映射不变」**。URL 带 hash，但同 hash 的字体内容也可能按 session 变。
- **不要用「源码是正常汉字」或「cmap 正常」推断「没有字体反爬」**。F 族（图元被换）下
  `cmap`/`post` 都没动、源码也是正常汉字，只是字义不对——判据是**页面显示与复制/查看源码不一致**，
  只 dump `cmap` 会 100% 失效且**不报任何错**。
- **不要在没有抽样校验的情况下批量跑全站**。字体反爬的错误不会抛异常，只会静默产出错数据。
- **不要替换 `<style>`/`<script>` 内文本**。码位可能出现在 CSS 的 `content` 或 JSON 配置里，替换前先限定作用域。

## B/C/D/E/F 族：命令入口

A 族走上面 7 步；其余五族各一条命令，**判据/算法/oracle/陷阱见 `references/css-and-sprite-obfuscation.md`**：

前四条**可直接粘贴跑**（用的是文章里的真实数值）；后两条需要你自己的样本，参数名已标成 `<占位>`：

```bash
S=.claude/skills/web-font-obfuscation/scripts

# 可直接跑
python $S/css_obfuscation_reverse.py offsets --rule mod300 --offset -600        # B 偏移→真值
python $S/css_obfuscation_reverse.py sprite --x -112.0 --y -2752.0 --cell 14x24 # B 网格→字形
python $S/css_obfuscation_reverse.py order --pairs "2,0;9,0;4,11.5;1,-11.5"    # C 位移换序
python $S/css_obfuscation_reverse.py pack --input "001H0039001H0032"            # E 定长编码
python $S/css_obfuscation_reverse.py --selftest                                 # 全族自检

# 需要你的样本（跑前把 <占位> 换成真实文件名）
python $S/css_obfuscation_reverse.py pseudo --css <站点.css> --html <页面.html> -o fixed.html
python $S/font_template_diff.py template <官方原版.ttf> -o tmpl.json
python $S/font_template_diff.py apply <站点字体.ttf> --template tmpl.json -o map.json
```

## 资源

- `references/font-cmap-decode.md`：两层映射四类模板、**glyphName 四种形态判据**、gid 顺序表、
  稳定性判定、轮廓指纹自动化、渲染+OCR 兜底、真实案例（抖音 / 58 同城 / 起点 / 快手）。
- `references/css-and-sprite-obfuscation.md`：**B/C/D/E/F 五族分流判据、还原算法、oracle 清单、排错速查**。
- `references/glyph-ocr-and-rotation.md`：**cmap 查表走不通时的字形 OCR 路线**（三步判定 / OCR 选型实测 / 替换顺序自我污染与单趟逐位置映射 / 字体按请求动态下发）。
- `scripts/font_cmap_dump.py`：零依赖 cmap 导出/比对/替换 CLI（sfnt / WOFF1 / TTC），自带 `--selftest`。
- `scripts/font_glyph_fingerprint.py`：轮廓指纹与**跨版本**对齐（同一站点 A 版 ↔ B 版字体）。
- `scripts/font_template_diff.py`：**官方字体模板 → 伪造字体反推**（F 族），歧义不猜、未命中显式报告。
- `scripts/css_obfuscation_reverse.py`：CSS/雪碧图/伪元素/打包编码四族还原，六路规则含拒绝路径自检。
- 相关技能：参数签名 → `web-reverse-algorithm`；验证码字形题 → `web-verify-patcher`；
  常量串被 OB 混淆导致检索命不中 → `ast-deobfuscation`。
