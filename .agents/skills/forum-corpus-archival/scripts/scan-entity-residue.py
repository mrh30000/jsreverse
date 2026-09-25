#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HTML 命名实体「无分号」解码残留的语料扫描器。

背景（坑 105）
--------------
论坛/博客页面在浏览器里渲染时，`&timestamp=` 这类查询串会被 HTML 解析器按
**HTML5 legacy named reference（不带分号的写法）** 吃掉前缀：

    &timestamp=1  ->  ×tamp=1          # &times;  = U+00D7
    &params=1     ->  ¶ms=1            # &para;   = U+00B6
    &section=1    ->  §ion=1           # &sect;   = U+00A7
    &notify=1     ->  ¬ify=1           # &not;    = U+00AC

归档器抓的是「浏览器渲染后的文本」，于是语料里**逐字**留下 `×tamp=` / `¶ms=` / `§ion=`。
后果是：任何「从语料抄请求串」的下游步骤都会**静默**拿到一个错的参数名
（症状通常是「签名/校验一直不过，但两边看着都对」）。

只盯 `×`（&times;）是不够的 —— 本轮（B38）扫描实测 `&para;` / `&sect;` 各有多处真命中。
本脚本把**整张 legacy 实体表**都纳入扫描。

用法
----
    python scan-entity-residue.py --ref docs/references            # 人类可读报告
    python scan-entity-residue.py --ref docs/references --json      # 机器可读
    python scan-entity-residue.py --ref <dir> --min-suffix 2        # 只要「字符+>=2 个字母」
    python scan-entity-residue.py --selftest                        # 自检（含阳性/阴性夹具）
    python scan-entity-residue.py --ref <dir> --fail-on-hit         # 有命中即退出码 1（可做门禁）

口径
----
* **只报「字符后紧跟 ASCII 字母（可再跟字母/数字/下划线）=」的形态**，即
  「本该是 `&name...` 的位置」。单独的 `×`（乘号）、`§ 1.2`（章节号）等**不报**。
* 命中 ≠ 一定是缺陷：`§` 也可能是作者手写的章节符。因此输出**带上下文**，
  由人一眼判定（本脚本的目标是「把候选缩到几十条」，不是「替人裁决」）。
* `--min-suffix` 默认 1；把它调到 2 可显著降噪（代价是漏掉 `&sect`+`=` 这类）。
"""

import argparse
import collections
import io
import json
import os
import re
import sys

# HTML5 legacy named references（不带分号也会被解析）中，会与「查询串/标识符」撞车的一批。
# key = 实体名，value = 解码后的字符
LEGACY_ENTITIES = {
    "times": "\u00d7",   # ×  ← &timestamp= / &tamps=
    "para": "\u00b6",    # ¶  ← &params= / &param=
    "sect": "\u00a7",    # §  ← &section=
    "not": "\u00ac",     # ¬  ← &notify= / &notice=
    "curren": "\u00a4",  # ¤  ← &currency=
    "copy": "\u00a9",    # ©
    "reg": "\u00ae",     # ®
    "deg": "\u00b0",     # °
    "divide": "\u00f7",  # ÷
    "plusmn": "\u00b1",  # ±
    "frac12": "\u00bd",  # ½
    "frac14": "\u00bc",  # ¼
    "frac34": "\u00be",  # ¾
    "sup2": "\u00b2",    # ²
    "sup3": "\u00b3",    # ³
    "micro": "\u00b5",   # µ
    "pound": "\u00a3",   # £
    "yen": "\u00a5",     # ¥
    "euro": "\u20ac",    # €
    "cent": "\u00a2",    # ¢
    "brvbar": "\u00a6",  # ¦
    "uml": "\u00a8",     # ¨
    "acute": "\u00b4",   # ´
    "cedil": "\u00b8",   # ¸
    "macr": "\u00af",    # ¯
    "laquo": "\u00ab",   # «
    "raquo": "\u00bb",   # »
    "iquest": "\u00bf",  # ¿
    "iexcl": "\u00a1",   # ¡
    "middot": "\u00b7",  # ·
    "bull": "\u2022",    # •
    "hellip": "\u2026",  # …
    "mdash": "\u2014",   # —
    "ndash": "\u2013",   # –
    "lsquo": "\u2018",
    "rsquo": "\u2019",
    "ldquo": "\u201c",
    "rdquo": "\u201d",
    "trade": "\u2122",
    "amp": "&",          # &amp=  ← 少见但同型
    "lt": "<",
    "gt": ">",
    "quot": '"',
    "nbsp": "\u00a0",
}

# 高信号子集（默认只扫这些）：
# 判据 = 「实体名恰好是常见查询参数名的前缀」 ∧ 「该字符在正常技术文本里几乎不会紧贴 ASCII 字母」。
# 这五个覆盖了实测的全部真命中：&timestamp / &params / &section / &notify / &currency
HIGH_SIGNAL = ("times", "para", "sect", "not", "curren")

# 永远排除：这些字符（或其解码结果）在正常文本/代码里太常见，做检测只会淹没结果
NEVER = {"amp", "lt", "gt", "quot", "nbsp", "apos"}

# 反查：字符 -> 实体名（一个字符可能对应多个实体，取最长实体名）
CHAR2NAME = {}
for _n, _c in LEGACY_ENTITIES.items():
    if _n in NEVER:
        continue
    if _c not in CHAR2NAME or len(_n) > len(CHAR2NAME[_c]):
        CHAR2NAME[_c] = _n

_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def scan_text(text, min_suffix=1, all_entities=False):
    """返回 [(字符, 实体名, 命中的原文, 上下文)]"""
    hits = []
    names = None if all_entities else set(HIGH_SIGNAL)
    for ch, name in CHAR2NAME.items():
        if names is not None and name not in names:
            continue
        # ⚠️ 后缀**必须以字母开头**：`×16`（乘号+数字）是高频误报，字母开头才可能是 `&times...` 的残留
        pat = re.compile(re.escape(ch) + r"([A-Za-z][A-Za-z0-9_]{0,11})(=?)")
        for m in pat.finditer(text):
            suffix = m.group(1)
            if len(suffix) < min_suffix:
                continue
            start = max(0, m.start() - 48)
            end = min(len(text), m.end() + 16)
            ctx = _CTRL.sub(" ", text[start:end]).replace("\n", " ")
            hits.append({"char": ch, "entity": name,
                         "hit": ch + suffix + m.group(2),
                         "context": ctx})
    return hits


def walk(root, exts=(".md", ".txt", ".json", ".js", ".py")):
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if d not in ("__pycache__", ".git")]
        for f in sorted(fn):
            if f.lower().endswith(exts):
                yield os.path.join(dp, f)


def report(root, min_suffix=1, as_json=False, all_entities=False):
    per_file = []
    by_entity = collections.Counter()
    by_file = collections.Counter()
    total = 0
    for p in walk(root):
        try:
            t = io.open(p, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        hits = scan_text(t, min_suffix=min_suffix, all_entities=all_entities)
        if not hits:
            continue
        rel = os.path.relpath(p, root).replace(os.sep, "/")
        by_file[rel] = len(hits)
        for h in hits:
            by_entity[h["entity"]] += 1
        total += len(hits)
        per_file.append({"file": rel, "count": len(hits), "hits": hits})

    if as_json:
        print(json.dumps({"root": root, "total": total,
                          "files": len(per_file),
                          "by_entity": dict(by_entity),
                          "detail": per_file}, ensure_ascii=False, indent=2))
        return total

    print("entity-residue 扫描: %s" % root)
    print("  命中 %d 处 / %d 个文件" % (total, len(per_file)))
    if total:
        print("  扫描范围: %s" % ("全表 --all" if all_entities else "高信号子集 times/para/sect/not/curren"))
        print("  按实体分布（实体名 = 解码后的字符）:")
        for name, n in by_entity.most_common():
            print("    &%-8s (%s)  %4d" % (name, CHAR2NAME.get(LEGACY_ENTITIES[name], "?"), n))
        print("  按文件 Top-20:")
        for rel, n in by_file.most_common(20):
            print("    %4d  %s" % (n, rel))
        print("  ⚠️ 命中不等于缺陷：请用下面的上下文人工裁决（`§ 1.2` / 单独的 `×` 是正常用法）:")
        for item in sorted(per_file, key=lambda x: -x["count"])[:5]:
            print("  --- %s ---" % item["file"])
            shown = 0
            for h in item["hits"]:
                if shown >= 3:
                    break
                print("      [%s] %s" % (h["hit"], h["context"][:120]))
                shown += 1
    return total


def selftest():
    """阳性 + 阴性夹具（可失败的断言）"""
    ok = 0
    fail = []

    def chk(cond, msg):
        nonlocal ok
        if cond:
            ok += 1
        else:
            fail.append(msg)

    # ① 机制：与 Python 自身的 html.unescape 行为一致
    import html as _html
    for src, want in [("&timestamp=1", "\u00d7tamp=1"),
                      ("&params=1", "\u00b6ms=1"),
                      ("&section=1", "\u00a7ion=1"),
                      ("&notify=1", "\u00acify=1"),
                      ("&tamps=1", "&tamps=1")]:   # `&tamps` 不是实体 ⇒ 不变
        chk(_html.unescape(src) == want, "unescape(%r) != %r" % (src, want))

    # ② 阳性：四条真实形态都必须被抓到
    pos = {
        "\u00d7tamp=": "\u00d7tamp=1",
        "\u00b6ms=": "\u00b6ms=1",
        "\u00a7ion=": "\u00a7ion=universal",
        "\u00acify=": "\u00acify=x",
    }
    for hit, txt in pos.items():
        got = scan_text(txt)
        chk(any(h["hit"] == hit for h in got),
            "阳性漏报: %r 应命中 %r，实得 %r" % (txt, hit, [h["hit"] for h in got]))

    # ③ 阴性：正常符号不得误报
    neg = [
        "\u00a7 1.2 \u8282\u53f7",          # 「§ 1.2 节号」——后面不是字母
        "3 \u00d7 4 = 12",                    # 乘号
        "\u00d7 2024 \u5e74",                 # 乘号 + 数字
        "a & b & c",                          # 裸 &
        "https://x.com/a?b=1&c=2",            # 正常查询串（&c 不是实体名）
    ]
    for txt in neg:
        got = [h for h in scan_text(txt) if h["char"] != "&"]
        chk(not got, "阴性误报: %r -> %r" % (txt, [h["hit"] for h in got]))

    # ④ 默认只扫高信号子集：`©` / `®` 这类默认不报，`--all` 才报
    chk(not scan_text("©JD®X"), "默认不应报 &copy;/&reg;")
    chk(bool(scan_text("©JD®X", all_entities=True)), "--all 应报 &copy;/&reg;")
    chk(not scan_text('"quoted" & ampersand <tag>'), "常文本字符误报（quot/amp/lt）")

    # ⑤ min_suffix 生效
    chk(not scan_text("\u00d7a=1", min_suffix=2), "min_suffix=2 未生效")
    chk(bool(scan_text("\u00d7ab=1", min_suffix=2)), "min_suffix=2 误杀 2 字母")

    print("scan-entity-residue --selftest: %d 项通过" % ok)
    if fail:
        for f in fail:
            print("  ❌ " + f)
        return 1
    print("  ✅ 全绿")
    return 0


def main():
    ap = argparse.ArgumentParser(description="HTML 命名实体解码残留扫描（坑 105）")
    ap.add_argument("--ref", help="语料目录")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--all", dest="all_entities", action="store_true",
                    help="扫描全表（含 © ® ° µ § 等低信号实体，噪声大，仅供人工排查）")
    ap.add_argument("--min-suffix", type=int, default=1)
    ap.add_argument("--fail-on-hit", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()

    if a.selftest:
        return selftest()
    if not a.ref:
        ap.error("需要 --ref <dir> 或 --selftest")
    total = report(a.ref, min_suffix=a.min_suffix, as_json=a.json, all_entities=a.all_entities)
    if a.fail_on_hit and total:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
