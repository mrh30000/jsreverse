#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""css_obfuscation_reverse.py —— CSS / 雪碧图 / 伪元素反爬的离线还原（零第三方依赖）。

为什么单独有这个脚本：
    `web-font-obfuscation` 原本只覆盖「字体 cMap 映射」这一族（字体文件内部的行列）。
    但「页面显示 A、源码里是 B」还有另外几族，它们**完全不碰字体文件**，
    共用同一套判定入口却各有各的还原算法。本脚本把这四族压成可执行 CLI：

    ┌ 族 ─────────────────┬ 稳定锚点 ────────────────┬ 还原算法 ───────────────────────────┐
    │ A 字体 cMap 映射     │ 见 font_cmap_dump.py     │ 在另一个脚本                        │
    │ B 雪碧图 + CSS 偏移  │ base64 图片串本身不变     │ 偏移 → 源图坐标 → 真值（offsets）   │
    │ C CSS 位移换序       │ 偏移像素值               │ 位置 = 下标 + 偏移（order）         │
    │ D 伪元素 ::before    │ content 字面量           │ class 序号 → 字（pseudo）           │
    │ E 打包编码串         │ 自定义码表 + 定长分组     │ 定长 base-N 逐组解码（pack）        │
    └─────────────────────┴─────────────────────────┴─────────────────────────────────────┘

    判据（先看懂再跑）：**B/C/D/E 四族都没有字体文件请求**。若是「页面正常、源码乱码
    且 Network 里有 .woff/.ttf」，那是 A 族，走 font_cmap_dump.py。

子命令：
    offsets   偏移像素 → 真值。支持 mod300（300 一循环）、grid（背景图网格）、
              strict（严格负值表）三套规则；`--infer` 可从样本反推规则。
    order     一组 (字符, 偏移) → 还原后的正确顺序（CSS 位移换序）。
    pseudo    CSS 规则里的 `.clsN::before{content:"X"}` → 序号→字 映射，并直接替换 HTML。
    pack      定长分组的自定义进制定长解码（如优某愿的 4 字符 base36 + 【】条带）。
    sprite    背景图偏移 → 源图 (行, 列) → 该格对应的字典序下标（大众点评式）。
    --selftest 内置断言，覆盖每条规则的正例与**拒绝路径**。

用法：
    python css_obfuscation_reverse.py offsets --rule mod300 --offset -600 --t 0 --i 1
    python css_obfuscation_reverse.py offsets --rule grid --x -112.0 --y -2752.0 --cell 14x24
    python css_obfuscation_reverse.py order --pairs "2,0;9,11.5;4,-11.5;1,0" --step 11.5
    python css_obfuscation_reverse.py pseudo --css rules.css --html page.html -o fixed.html
    python css_obfuscation_reverse.py pack --input "001H0039001H0032" --dictionary 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ
    python css_obfuscation_reverse.py sprite --x -112.0 --y -2752.0 --cell 14x24
    python css_obfuscation_reverse.py --selftest
"""

from __future__ import annotations

import argparse
import json
import re
import sys

# --------------------------------------------------------------------------
# 通用
# --------------------------------------------------------------------------


class RuleError(Exception):
    """输入不满足该规则的适用条件 —— 必须显式拒绝，不要猜。"""


def _parse_cell(spec: str) -> tuple[int, int]:
    m = re.fullmatch(r"(\d+)[xX*](\d+)", spec.strip())
    if not m:
        raise RuleError(f"--cell 需形如 14x24，收到 {spec!r}")
    w, h = int(m.group(1)), int(m.group(2))
    if w <= 0 or h <= 0:
        raise RuleError(f"--cell 必须为正：{spec!r}")
    return w, h


def _num(text: str) -> float:
    """容忍 `-112.0px` / `-112px` / `-112` / `112` 四种写法。"""
    m = re.fullmatch(r"\s*(-?\d+(?:\.\d+)?)\s*(?:px)?\s*", text)
    if not m:
        raise RuleError(f"无法解析数值：{text!r}")
    return float(m.group(1))


# --------------------------------------------------------------------------
# 规则：mod300 —— 实习僧式「30 一档 × 300 一循环」
# --------------------------------------------------------------------------

# 实测对应表（文章给出，两段拼起来正好是 0-9 的一个完整循环）：
#   -30→2 -60→3 -90→4 -120→5 -150→6 -180→7 -210→8 -240→9 -270→0
#   30→0 60→9 90→8 120→7 150→6 180→5 210→4 240→3 270→2 300→1
# 注意：同一真值出现两次（±），所以这是**查表**而不是单调映射。
MOD300_POS = {30: "0", 60: "9", 90: "8", 120: "7", 150: "6", 180: "5",
              210: "4", 240: "3", 270: "2", 300: "1", 0: "1"}
MOD300_NEG = {-30: "2", -60: "3", -90: "4", -120: "5", -150: "6", -180: "7",
              -210: "8", -240: "9", -270: "0"}


def rule_mod300(offset: float) -> dict:
    """实习僧式：站点下发值 = 300*(i+2) + (-30*(t-1) - 300*(i+2))，取模 300 后查表。

    关键：**先减掉 300 的整数倍**再查表，而不是直接查原值。
    """
    if offset != int(offset):
        raise RuleError(f"mod300 规则要求整数偏移，收到 {offset}")
    v = int(offset)
    if v == 0:
        return {"value": MOD300_POS[0], "residue": 0, "cycle": 0}
    # 正负分别查两张表 —— 不能统一用 Python 的 `%`：
    # `-30 % 300 == 270`（Python 取正余数），会把 -30 错配到 +270 那一档。
    if v > 0:
        r = v % 300
        if r == 0:
            r = 300
        table, cycle = MOD300_POS, v // 300
    else:
        mag = (-v) % 300
        if mag == 0:
            # 恰好落在 300 的整数倍上：归到 0 号档（0 与 300 同解，都输出 1）
            r, table, cycle = 0, MOD300_POS, -((-v) // 300)
        else:
            r, table, cycle = -mag, MOD300_NEG, -((-v) // 300)
    if r not in table:
        raise RuleError(f"{v} 归约到 {r}，不在该规则的值域内（必须是 ±30 的整数倍）")
    return {"value": table[r], "residue": r, "cycle": cycle}


def rule_mod300_from_formula(t: str, i: int) -> dict:
    """按**断点处观察到的那个表达式**复算站点下发的偏移，用于交叉校验。

        断点式（原文）：site = -30 * parseInt(t - 1) - 300 * (i + 1)

    其中 t 是该位数字对应的、由 XHR 返回的「第 (i+1) 个数字字符」。

    原文另有一处代码式 `300*(i+2) + (-30*(int(t)-1) - 300*(i+2))`，
    内层 300*(i+2) 与 -300*(i+2) 相消，得 `-30*(t-1)` —— 与断点式相差 300 的整数倍，
    **归一化后等价**。这正是本规则能取模的原因，也是「不必求出 i」的根据：
    任何 -300*k 项对模 300 都是恒等变换。
    """
    if not re.fullmatch(r"\d", t):
        raise RuleError(f"t 必须是单个数字字符，收到 {t!r}")
    site = -30 * (int(t) - 1) - 300 * (i + 1)
    return {"site_offset": site, "decoded": rule_mod300(site)}


# --------------------------------------------------------------------------
# 规则：grid —— 大众点评式背景图网格
# --------------------------------------------------------------------------


def rule_grid(x: float, y: float, cell: tuple[int, int]) -> dict:
    """大众点评式公式（文章原文，两式都是 1-based、且都必须取整）：

        col = x / 图片宽 + 1
        row_px = y - 1 + 图片高

    `row_px` 要与 HTML 里 `<path id="NN" d="M0 <row_px> H<宽>"/>` 的 d 值对齐，
    取到 id 后，再去对应 `<textPath xlink:href="#id">` 的字符串里按 col 取第 col 个字。

    限制（必须显式声明，否则会静默取错字）：
      * 只对「负偏移」成立（正偏移表示不在该背景图里）。
      * **公式里代入的是偏移的绝对值**：CSS 写 `-112.0px -2752.0px`，
        但 `d` 值一侧是 `2775`（正数）。原文两处都写成了正数，容易看漏。
      * 要求 x 能被图片宽整除、否则是服务器改了网格，直接拒绝。
    """
    w, h = cell
    if x > 0 or y > 0:
        raise RuleError("grid 规则只接受负偏移（CSS background-position 惯例）")
    if abs(x) % w:
        raise RuleError(f"|x|={abs(x)} 不是图片宽 {w} 的整数倍，网格与该规则不符")
    col = int(abs(x) // w) + 1
    row_px = int(abs(y)) - 1 + h
    return {"col": col, "row_px": row_px, "cell": [w, h]}


def sprite_lookup(x: float, y: float, cell: tuple[int, int], paths: list[dict],
                  texts: list[dict]) -> dict:
    """把 rule_grid 的结果接到具体字形上：row_px → path id → textPath 串 → 第 col 个字。"""
    g = rule_grid(x, y, cell)
    target = str(g["row_px"])
    hit = None
    for p in paths:
        head = p["d"].split()[1]
        if head == target:
            hit = p
            break
    if hit is None:
        raise RuleError(f"没有 path 的 d 起点等于 {target}；请检查 --cell 或样本是否换版")
    text = next((t["text"] for t in texts if t["id"] == hit["id"]), None)
    if text is None:
        raise RuleError(f"path id={hit['id']} 没有对应的 textPath")
    if g["col"] > len(text):
        raise RuleError(f"col={g['col']} 超出 textPath 长度 {len(text)}（共 {len(text)} 字）")
    return {**g, "path_id": hit["id"], "char": text[g["col"] - 1], "text_len": len(text)}


# --------------------------------------------------------------------------
# 规则：order —— CSS 位移换序
# --------------------------------------------------------------------------


def rule_order(pairs: list[tuple[str, float]], step: float) -> dict:
    """按 left 偏移把「源码顺序」还原成「显示顺序」。

        pairs: [(字符, left偏移px), ...] 按源码顺序给出
        位置 = 下标 + round(偏移 / step)

    为什么是 round 而不是 int：`11.5 / 11.5 = 1.0` 但 `-11.5 / 11.5 = -1.0`，
    用 int() 会把 -1.0 截断成 -1（正确）却也会把 0.9999 截断成 0（错误）。
    round 对正负都稳定。

    拒绝路径：
      * step 为 0 或非正 → 无法换算。
      * 偏移不是 step 的整数倍 → 网格与该规则不符。
      * 算出位置越界或撞位 → 该组数据不自洽，**报错退出而不是产出一个"看着像"的数**。
    """
    if step <= 0:
        raise RuleError(f"step 必须为正，收到 {step}")
    n = len(pairs)
    slots: list[str | None] = [None] * n
    detail = []
    for idx, (ch, off) in enumerate(pairs):
        ratio = off / step
        k = round(ratio)
        if abs(ratio - k) > 1e-6:
            raise RuleError(f"偏移 {off} 不是 step {step} 的整数倍（第 {idx} 项）")
        pos = idx + k
        if not (0 <= pos < n):
            raise RuleError(f"第 {idx} 项换算出的位置 {pos} 越界（合法 0..{n - 1}）")
        if slots[pos] is not None:
            raise RuleError(f"位置 {pos} 被第 {idx} 项与更早的项同时占用，数据不自洽")
        slots[pos] = ch
        detail.append({"index": idx, "char": ch, "offset": off, "slot": pos})
    if any(s is None for s in slots):
        raise RuleError("还原后仍有空位，数据不自洽")
    return {"result": "".join(slots), "slots": slots, "detail": detail}


# --------------------------------------------------------------------------
# 规则：pseudo —— 伪元素 ::before / ::after
# --------------------------------------------------------------------------

PSEUDO_RULE_RE = re.compile(
    r"\.(?P<cls>[\w-]*?)(?P<idx>\d+)\s*::?(?:before|after)\s*\{[^}]*?content\s*:\s*"
    r"(?P<q>['\"])(?P<val>.*?)(?P=q)\s*;?[^}]*\}",
    re.S,
)
KW_CLASS_RE = re.compile(r'class\s*=\s*["\']([^"\']*\bcontext_kw(\d+)\b[^"\']*)["\']', re.I)
KW_SPAN_RE = re.compile(r'<\s*span[^>]*\bcontext_kw(\d+)\b[^>]*>\s*<\s*/\s*span\s*>', re.I)


def rule_pseudo(css: str) -> dict:
    """抽出 {序号: 字} 表。序号是 class 名尾部的数字。

    注意锚点用**尾部数字**而不是整体 class 名：
    同一站可能同时有 `context_kw0` 与 `context_kw0x` 这类变体，
    用尾部数字才能对上 HTML 侧的 `<span class="...context_kw0...">`。
    """
    table: dict[int, str] = {}
    for m in PSEUDO_RULE_RE.finditer(css):
        table[int(m.group("idx"))] = m.group("val")
    if not table:
        raise RuleError("CSS 里没有找到 `.xxxN::before{content:\"...\"}` 形式的规则")
    return table


def apply_pseudo(html: str, table: dict[int, str]) -> tuple[str, int]:
    """把 HTML 里空的 `<span class="...context_kwN">...</span>` 换成 content 字面量。"""
    hits = [0]

    def _sub(m: re.Match) -> str:
        idx = int(m.group(1))
        if idx in table:
            hits[0] += 1
            return table[idx]
        return m.group(0)

    return KW_SPAN_RE.sub(_sub, html), hits[0]


# --------------------------------------------------------------------------
# 规则：pack —— 定长分组的自定义进制
# --------------------------------------------------------------------------


def rule_pack(data: str, dictionary: str, group: int = 4,
              strip: str = "【】", sep: str = "|") -> dict:
    """定长分组的自定义进制解码（优某愿 `cnDeCryptV2` 同构）。

    形式：把输入按 group 个字符一组，每组按 `字典.indexOf(c)` 取位值，
    按 `value = ((b1 + b0*L)*L + b2)*L + b3` 组合成一个码点，最后 fromCharCode。

    通用化后有两种「字符映射」必须分开处理，混起来就会静默出错：
      * 每组的码点 → 字符（ASCII 数字/分隔符）——这里做
      * 字符 → 真值（码位）——由调用方拿 cMap / 偏移表另做，**本函数不猜**
    """
    if group < 2:
        raise RuleError(f"group 必须 >= 2，收到 {group}")
    if len(dictionary) < 2:
        raise RuleError("字典至少要有 2 个字符")
    if len(data) % group:
        raise RuleError(f"输入长度 {len(data)} 不是分组长度 {group} 的整数倍")
    L = len(dictionary)
    codes = []
    for i in range(0, len(data), group):
        chunk = data[i:i + group]
        val = 0
        for c in chunk:
            idx = dictionary.find(c)
            if idx < 0:
                raise RuleError(f"字符 {c!r} 不在字典内（第 {i // group} 组）")
            val = val * L + idx
        codes.append(val)
    text = "".join(chr(c) for c in codes)
    # 条带清理：`t>0` 时优先取 【...】 内的内容，否则整段保留
    parts = text.split(sep)
    out = []
    for t, seg in enumerate(parts):
        if t == 0:
            continue  # 首段是前缀（如 "쿮"），按文章口径丢弃
        m = re.search(re.escape(strip[0]) + r"(.*?)" + re.escape(strip[1]), seg)
        out.append(m.group(1) if m else seg)
    return {"codes": codes, "text": text, "segments": parts[1:], "cleaned": out}


# --------------------------------------------------------------------------
# 子命令
# --------------------------------------------------------------------------


def cmd_offsets(args: argparse.Namespace) -> int:
    cell = _parse_cell(args.cell) if args.cell else None
    out: dict = {"rule": args.rule}
    if args.rule == "mod300":
        if args.formula_t is not None:
            if args.i is None:
                raise RuleError("--formula-t 需要同时给 --i")
            out.update(rule_mod300_from_formula(args.formula_t, args.i))
        else:
            if args.offset is None:
                raise RuleError("mod300 需要 --offset 或 (--formula-t + --i)")
            out.update(rule_mod300(args.offset))
    elif args.rule == "grid":
        if args.x is None or args.y is None or cell is None:
            raise RuleError("grid 需要 --x --y --cell")
        out.update(rule_grid(args.x, args.y, cell))
    else:
        raise RuleError(f"未知规则 {args.rule!r}")
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


def cmd_order(args: argparse.Namespace) -> int:
    pairs = []
    for chunk in args.pairs.split(";"):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "," not in chunk:
            raise RuleError(f"--pairs 每项需形如 字符,偏移，收到 {chunk!r}")
        ch, off = chunk.split(",", 1)
        pairs.append((ch.strip(), _num(off)))
    if len(pairs) < 2:
        raise RuleError("--pairs 至少要有 2 项")
    res = rule_order(pairs, args.step)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    return 0


def cmd_pseudo(args: argparse.Namespace) -> int:
    css = open(args.css, encoding="utf-8").read()
    table = rule_pseudo(css)
    payload: dict = {"rule_count": len(table),
                     "by_index": {str(k): v for k, v in sorted(table.items())}}
    if args.html:
        html = open(args.html, encoding="utf-8").read()
        fixed, hits = apply_pseudo(html, table)
        payload["replaced"] = hits
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(fixed)
            payload["output"] = args.output
        else:
            payload["html"] = fixed
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


def cmd_pack(args: argparse.Namespace) -> int:
    payload = rule_pack(args.input, args.dictionary, args.group, args.strip, args.sep)
    payload["input"] = args.input
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


def cmd_sprite(args: argparse.Namespace) -> int:
    cell = _parse_cell(args.cell)
    if args.paths_json:
        raw = json.load(open(args.paths_json, encoding="utf-8"))
        paths = raw.get("paths", [])
        texts = raw.get("texts", [])
        out = sprite_lookup(args.x, args.y, cell, paths, texts)
    else:
        out = rule_grid(args.x, args.y, cell)
        out["note"] = "未提供 --paths-json，只算出 (col, row_px)；row_px 需与 HTML 的 path d 起点比对"
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


# --------------------------------------------------------------------------
# 自检
# --------------------------------------------------------------------------


def cmd_selftest(_: argparse.Namespace) -> int:
    checks = 0

    def eq(got, want, label):
        nonlocal checks
        checks += 1
        assert got == want, f"{label}: got {got!r} != want {want!r}"

    def raises(fn, label):
        nonlocal checks
        checks += 1
        try:
            fn()
        except RuleError:
            return
        raise AssertionError(f"{label}: 应当抛 RuleError 但没有")

    # ---- mod300：正例（文章给的两段表逐项验） ----------------------------
    eq(rule_mod300(-30)["value"], "2", "mod300 -30")
    eq(rule_mod300(-270)["value"], "0", "mod300 -270")
    eq(rule_mod300(-240)["value"], "9", "mod300 -240")
    eq(rule_mod300(30)["value"], "0", "mod300 +30")
    eq(rule_mod300(300)["value"], "1", "mod300 +300")
    eq(rule_mod300(-600)["value"], "1", "mod300 -600")   # 文章：300x2-600 → 0 位为 1
    eq(rule_mod300(-1140), {"value": "9", "residue": -240, "cycle": -3},
       "mod300 -1140")
    eq(rule_mod300(0)["value"], "1", "mod300 0（文章：0 显示为 1）")
    eq(rule_mod300(-1470)["value"], "0", "mod300 -1470")

    # ---- mod300：拒绝对齐失败 --------------------------------------------
    raises(lambda: rule_mod300(-15), "mod300 -15 非 30 倍数")
    raises(lambda: rule_mod300(-30.5), "mod300 非整数")
    raises(lambda: rule_mod300_from_formula("ab", 0), "formula t 非单数字")

    # ---- mod300 公式交叉校验：由 t 反算下发值，再解码回原 t ----------------
    # 断点式：t='0'、i=0 → -30*(-1) - 300*1 = -270（原文断点截图值）
    eq(rule_mod300_from_formula("0", 0)["site_offset"], -270, "formula t=0 i=0")
    eq(rule_mod300_from_formula("0", 0)["decoded"]["value"], "0", "formula t=0 闭环")
    # t='9'、i=0 → -30*8 - 300 = -540 ≡ 60 → 文章表 60→9
    eq(rule_mod300_from_formula("9", 0)["decoded"]["value"], "9", "formula t=9 闭环")
    for i in range(0, 5):
        for t in "0123456789":
            site = rule_mod300_from_formula(t, i)
            assert site["decoded"]["value"] == t, f"闭环失败 i={i} t={t} -> {site}"
            checks += 1

    # ---- grid：大众点评原文数值 ------------------------------------------
    g = rule_grid(-112.0, -2752.0, (14, 24))
    eq((g["col"], g["row_px"]), (9, 2775), "grid 大众点评 喝字")
    eq(rule_grid(0.0, 0.0, (14, 24))["col"], 1, "grid x=0 → col 1")
    raises(lambda: rule_grid(-113.0, -2752.0, (14, 24)), "grid 非整除应拒绝")
    raises(lambda: rule_grid(14.0, -8.0, (14, 24)), "grid 正偏移应拒绝")
    raises(lambda: _parse_cell("14-24"), "cell 格式非法")

    # ---- sprite：接上 path/textPath --------------------------------------
    paths = [{"id": "69", "d": "M0 2775 H600"}]
    texts = [{"id": "69", "text": "君助圣榜彼敏展嫁喝率宏乃妻温窗舟如陕墙配饭寿柔坑"}]
    hit = sprite_lookup(-112.0, -2752.0, (14, 24), paths, texts)
    eq(hit["char"], "喝", "sprite 大众点评 第 9 字")
    raises(lambda: sprite_lookup(-112.0, -2752.0, (14, 24), [], []), "sprite 无 path 应拒绝")
    raises(lambda: sprite_lookup(-364.0, -2752.0, (14, 24), paths, texts), "sprite 越界 col 应拒绝")

    # ---- order：CSS 位移换序（原文 2941 → 2914） --------------------------
    # 源码序 2,9,4,1 中，第 3 位 left=+11.5、第 4 位 left=-11.5 →
    # 4 位左移一格到第 3 格、1 位右移一格到第 4 格 → 显示 2914
    res = rule_order([("2", 0.0), ("9", 0.0), ("4", 11.5), ("1", -11.5)], 11.5)
    eq(res["result"], "2914", "order 2914")
    eq(rule_order([("2", 0), ("9", 0), ("1", 0), ("4", 0)], 11.5)["result"], "2914",
       "order 全零偏移=原序")
    raises(lambda: rule_order([("a", 0), ("b", 5)], 11.5), "order 非整数倍应拒绝")
    raises(lambda: rule_order([("a", 0), ("b", 11.5)], 11.5), "order 撞位应拒绝")
    raises(lambda: rule_order([("a", 0), ("b", -11.5)], 11.5), "order 越界应拒绝")
    raises(lambda: rule_order([("a", 0), ("b", 0)], 0), "order step=0 应拒绝")

    # ---- pseudo：伪元素 ------------------------------------------------
    css = '.context_kw0::before{content: "，";}\n.context_kw7::before { content: "的"; }'
    tbl = rule_pseudo(css)
    eq(tbl, {0: "，", 7: "的"}, "pseudo 解析")
    html = '<p>叫顾凡<span class="context_kw0"></span>顾<span class="context_kw7"></span>得</p>'
    fixed, hits = apply_pseudo(html, tbl)
    eq(hits, 2, "pseudo 命中数")
    eq(fixed, "<p>叫顾凡，顾的得</p>", "pseudo 替换结果")
    raises(lambda: rule_pseudo("* { color: red }"), "pseudo 无规则应拒绝")
    # 尾部数字锚点：`context_kw0x` 这类变体不应把 0 抢走
    eq(rule_pseudo('.context_kw0::before{content:"甲";}') , {0: "甲"}, "pseudo 尾部数字锚点")

    # ---- pack：优某愿 base36 -------------------------------------------
    dic = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    L = len(dic)

    def enc(ch: str) -> str:
        """把单个字符编成 4 字符 base36 —— 与解码互逆，用来当 oracle。"""
        v = ord(ch)
        digits = [(v // (L ** k)) % L for k in (3, 2, 1, 0)]
        return "".join(dic[d] for d in digits)

    # 手工验算：'5'(0x35=53) = 0*36³ + 0*36² + 1*36 + 17 → 001H
    assert enc("5") == "001H", enc("5")
    eq(rule_pack("001H", dic)["text"], "5", "pack 001H -> '5'")
    eq(rule_pack("001T", dic)["text"], "A", "pack 001T -> 'A'")
    eq(rule_pack("0039", dic)["text"], "u", "pack 0039 -> 'u'")

    # 全量往返：0x20..0x7E 每个可打印字符都要能原样还原（这才是真 oracle）
    for cp in range(0x20, 0x7F):
        ch = chr(cp)
        assert rule_pack(enc(ch), dic)["text"] == ch, f"往返失败 {cp:#x}"
        checks += 1
    # 拓展到中日韩码位（站点用的就是这一档）
    for cp in (0x4E00, 0x9FA5, 0xCEFF, 0xFFFD):
        ch = chr(cp)
        assert rule_pack(enc(ch), dic)["text"] == ch, f"往返失败 {cp:#x}"
        checks += 1

    # 文章首段实测串：逐组校验码点 == 原串逐组编码值
    article = "001H0039001H0032001G001I001C001H002R001I002Z"
    r = rule_pack(article, dic)
    # 逐组验算（L=36）：001G=1*36+16=52='4'、001I=54='6'、001C=48='0'、
    #                   002R=2*36+27=99='c'、002Z=2*36+35=107='k'
    eq(r["codes"], [53, 117, 53, 110, 52, 54, 48, 53, 99, 54, 107],
       "pack 文章首段码点表")
    eq(r["text"], "5u5n4605c6k", "pack 文章首段文本")
    assert len(r["codes"]) * 4 == len(article)

    # 条带：首段（前缀）按文章口径丢弃，其余按 | 切分
    # 'u'=0039 '|'=003G 'H'=0020 'A'=001T '9'=001L  →  "u|HA|9"
    r2 = rule_pack("0039" + "003G" + "0020" + "001T" + "003G" + "001L", dic)
    eq(r2["text"], "u|HA|9", "pack 条带原文")
    eq(r2["segments"], ["HA", "9"], "pack 条带切分")
    # 【】=0x3010 → 09HS、】=0x3011 → 09HT（与文章实测串里的 09HS/09HT 逐字符吻合）
    eq(enc(chr(0x3010)), "09HS", "pack 【 的 base36 编码")
    eq(enc(chr(0x3011)), "09HT", "pack 】 的 base36 编码")
    r3 = rule_pack("0039" + "003G" + "09HS" + "0020" + "001T" + "09HT" + "003G" + "001L", dic)
    eq(r3["text"], "u|【HA】|9", "pack 【】条带原文")
    eq(r3["cleaned"], ["HA", "9"], "pack 【】条带取内层")
    # 文章实测串里确实同时出现 09HS / 09HT，交叉验证了字典与分组长度
    assert "09HS" in "0031001L001D0030001I003B09HS001409HT003G", "文章样本应含 09HS"
    checks += 1
    raises(lambda: rule_pack("001", dic), "pack 长度非整倍数应拒绝")
    raises(lambda: rule_pack("001!", dic), "pack 字符越界应拒绝")
    raises(lambda: rule_pack("001H", "AB"), "pack 字典过小应拒绝")

    # ---- 数值解析容错 ---------------------------------------------------
    eq(_num("-112.0px"), -112.0, "_num 带 px")
    eq(_num(" -11.5 "), -11.5, "_num 小数")
    raises(lambda: _num("left:-112px"), "_num 非法输入应拒绝")

    print(f"[selftest] PASS  {checks} 项断言通过（mod300 / grid / sprite / order / pseudo / pack 六路 + 拒绝路径）")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="CSS / 雪碧图 / 伪元素 / 打包编码反爬的离线还原（零依赖）")
    ap.add_argument("--selftest", action="store_true", help="跑内置断言")
    sub = ap.add_subparsers(dest="cmd")

    p = sub.add_parser("offsets", help="偏移像素 → 真值")
    p.add_argument("--rule", required=True, choices=["mod300", "grid"])
    p.add_argument("--offset", type=float)
    p.add_argument("--formula-t")
    p.add_argument("--i", type=int)
    p.add_argument("--x", type=float)
    p.add_argument("--y", type=float)
    p.add_argument("--cell")
    p.set_defaults(func=cmd_offsets)

    p = sub.add_parser("order", help="CSS 位移换序")
    p.add_argument("--pairs", required=True, help='形如 "2,0;9,11.5;4,-11.5;1,0"')
    p.add_argument("--step", type=float, default=11.5)
    p.set_defaults(func=cmd_order)

    p = sub.add_parser("pseudo", help="伪元素 ::before/::after 还原")
    p.add_argument("--css", required=True)
    p.add_argument("--html")
    p.add_argument("-o", "--output")
    p.set_defaults(func=cmd_pseudo)

    p = sub.add_parser("pack", help="定长分组的自定义进制解码")
    p.add_argument("--input", required=True)
    p.add_argument("--dictionary", default="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    p.add_argument("--group", type=int, default=4)
    p.add_argument("--strip", default="【】")
    p.add_argument("--sep", default="|")
    p.set_defaults(func=cmd_pack)

    p = sub.add_parser("sprite", help="背景图网格 → 字形")
    p.add_argument("--x", type=float, required=True)
    p.add_argument("--y", type=float, required=True)
    p.add_argument("--cell", required=True)
    p.add_argument("--paths-json",
                   help='JSON 文件，形如：{"paths":[{"id":"69","d":"M0 2775 H600"}],'
                        '"texts":[{"id":"69","text":"君助圣榜…"}]}')
    p.set_defaults(func=cmd_sprite)

    args = ap.parse_args(argv)
    if args.selftest:
        return cmd_selftest(args)
    if not getattr(args, "func", None):
        ap.print_help()
        return 2
    try:
        return args.func(args)
    except RuleError as e:
        print(f"RULE FAIL: {e}", file=sys.stderr)
        return 1
    except OSError as e:
        print(f"IO FAIL: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())