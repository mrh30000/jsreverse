#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""order_restore.py —— 零依赖「语序还原」求解 CLI（点选验证码的第三阶段）

用途
----
语序点选验证码的题面给的是一组**乱序**汉字（或数字/字母），要求"按正确语序依次点击"。
检测 + 文字识别只能告诉你"这几个字在图上的哪个位置"，**顺序**要额外算出来。
本脚本用「离线词频表 + n-gram 打分」在候选字的**所有排列**里挑最像人话的那个。

打分公式（关键就在这个公式）
--------------------------
    对每个出现在词频表里的子串 sub：  score += len(sub)² × log(freq(sub) + 1)

* `len²` 让长词"分数爆炸"式胜出：`物理系`(3) = 9 分权重，
  而 `物理`(2) + `系`(1) 加起来才 4 + 1 —— 没有这一项，语序会稳定判错。
* `freq + 1` 是为了兜底：词频表里 `freq = 0` 很常见，`log(1) = 0` 会让整条候选白算。

为什么不用 jieba
---------------
jieba 分词对"先分词再判断顺序"这类任务效果差（实测口径），不要作为主路线。
要更高准确率就用统计语言模型：`pycorrector` 提供小/中/大三种 KenLM 模型
（大模型约 3 GB），取 `perplexity` 最小 / `score` 最大。

用法
----
    # 1) 只给乱序字，用内置小词典（仅用于自检/演示，正式使用请给 --dict）
    python order_restore.py --chars "性适应" --pretty

    # 2) 带外部词频表 + 同时回填坐标
    python order_restore.py --chars "地天冰雪" --dict dict_mini.txt \
        --coords "12,34;56,78;90,12;30,44" --pretty

    # 3) 自检（内置词典 + 合成用例，零外部依赖）
    python order_restore.py --selftest

词频表格式（每行一个词，空格/Tab 分隔，容错）
--------------------------------------------
    <词> <词频> [词性]        # 三列都认
    <词>                      # 只有词，词频按 1 处理
    词频列不是数字时按 1 处理；`freq <= 0` 一律强制成 1。

注意
----
* 排列数是 n!，`--chars` 长度上限 8（8! = 40320，仍是秒级）；再长请改用语言模型路线。
* 只做离线顺序推断，不发起网络请求、不控制浏览器、不提交验证。
* **顺序错了不会报异常，只会静默失败** ⇒ 用 `--top` 看前几名，分差过小时按 `confidence: low` 处理。
"""

from __future__ import annotations

import argparse
import itertools
import json
import math
import re
import sys

MAX_CHARS = 8

# 内置极小词频表：只服务于 --selftest 与"没给 --dict 时给个能跑通的默认值"。
BUILTIN_DICT = {
    # 用例一：性 / 适 / 应  →  适应性
    "适应": 4200, "适应性": 5000, "适性": 1, "性适": 1,
    # 用例二：地 / 天 / 冰 / 雪  →  冰天雪地（"天地"是有竞争力的干扰项）
    "冰天": 800, "雪地": 900, "冰天雪地": 3000, "天地": 2000, "雪天": 300, "冰地": 5,
}


def configure_utf8_stdio() -> None:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")


configure_utf8_stdio()


def load_dict(path, max_word_len=6):
    """读词频表。返回 {词: 频次}，只保留长度 <= max_word_len 的词。"""
    table = {}
    bad_lines = 0
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = re.split(r"[ \t,]+", line)
            word = parts[0]
            if not word or len(word) > max_word_len:
                continue
            freq = 1
            if len(parts) > 1:
                try:
                    freq = int(float(parts[1]))
                except ValueError:
                    bad_lines += 1
                    freq = 1
            if freq <= 0:
                freq = 1
            # 同一词重复出现取较大值（词表常见多来源合并）
            table[word] = max(table.get(word, 0), freq)
    return table, bad_lines


def score(text, table):
    """Σ len(sub)² × log(freq + 1)，遍历所有子串。"""
    total = 0.0
    n = len(text)
    for i in range(n):
        for j in range(i + 1, n + 1):
            sub = text[i:j]
            freq = table.get(sub)
            if freq:
                total += (len(sub) ** 2) * math.log(freq + 1)
    return total


def solve(chars, table, top_k=5):
    """枚举去重后的所有排列，返回按分数降序的 [(word, score), ...]。"""
    seen = set()
    scored = []
    for perm in itertools.permutations(chars):
        word = "".join(perm)
        if word in seen:
            continue
        seen.add(word)
        scored.append((word, score(word, table)))
    scored.sort(key=lambda t: (-t[1], t[0]))
    return scored[:top_k]


def reorder_coords(chars, best_word, coords):
    """把 best_word 的顺序映射回原始 (字 → 坐标) 列表。重复字按出现顺序各取一次。"""
    pool = list(zip(chars, coords))
    out = []
    for ch in best_word:
        for idx, (c, xy) in enumerate(pool):
            if c == ch:
                out.append({"char": ch, "coord": xy, "order": len(out) + 1})
                pool.pop(idx)
                break
    return out


def main():
    ap = argparse.ArgumentParser(
        description="语序还原：词频表 + n-gram 打分，零依赖",
        formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--chars", help='乱序候选字，如 "性适应" 或 "性,适,应"')
    ap.add_argument("--dict", help="词频表路径（不给则用内置小词典，仅适合自检）")
    ap.add_argument("--coords", help="与 --chars 同序的坐标，用 ; 分隔，如 \"12,34;56,78\"")
    ap.add_argument("--top", type=int, default=5, help="输出前 N 个候选排列（默认 5）")
    ap.add_argument("--min-margin", type=float, default=2.0,
                    help="top1 与 top2 分差低于该值则 confidence=low（默认 2.0）")
    ap.add_argument("--pretty", action="store_true")
    ap.add_argument("--report", help="把 JSON 报告写入文件")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        return selftest()

    if not args.chars:
        ap.error("需要 --chars（或 --selftest）")
    chars = [c for c in re.split(r"[,\s]+", args.chars) if c]
    # 不给分隔符时按"每个字符一个候选"处理（"等烟天雨色青" 等价于 "等,烟,天,雨,色,青"）
    if len(chars) == 1 and len(chars[0]) > 1:
        chars = list(chars[0])
    if len(chars) < 2:
        ap.error("至少 2 个候选字才有排列意义")
    if len(chars) > MAX_CHARS:
        ap.error("候选字 %d 个超过上限 %d（n! 爆炸）；请改用 KenLM 语言模型路线，见文件头说明"
                 % (len(chars), MAX_CHARS))

    report = {"input_chars": chars, "warnings": []}
    if args.dict:
        table, bad_lines = load_dict(args.dict)
        report["dict_source"] = args.dict
        report["dict_size"] = len(table)
        if bad_lines:
            report["warnings"].append("词频表有 %d 行词频列不是数字，已按 1 处理" % bad_lines)
        if not table:
            report["warnings"].append("词频表为空，回退到内置小词典（结果不可信，请检查 --dict 路径）")
            table = dict(BUILTIN_DICT)
    else:
        table = dict(BUILTIN_DICT)
        report["dict_source"] = "builtin"
        report["warnings"].append(
            "未提供 --dict，使用内置小词典（只够跑通演示）；正式使用请提供百万级词频表并先按识别字表瘦身")

    ranked = solve(chars, table, top_k=max(2, args.top))
    best_word, best_score = ranked[0]
    runner_up = ranked[1] if len(ranked) > 1 else None
    margin = None if runner_up is None else best_score - runner_up[1]

    report.update({
        "best": best_word,
        "best_score": round(best_score, 4),
        "ranking": [{"word": w, "score": round(s, 4)} for w, s in ranked],
        "margin": None if margin is None else round(margin, 4),
        "confidence": "high" if (margin is not None and margin >= args.min_margin) else "low",
    })
    if report["confidence"] == "low":
        report["warnings"].append(
            "top1 与 top2 分差 < %.2f：顺序不可信，建议整轮丢弃重取，或用语言模型/人工复核"
            % args.min_margin)

    if args.coords:
        coords = [c.strip() for c in args.coords.split(";") if c.strip()]
        if len(coords) != len(chars):
            ap.error("--coords 项数(%d) 必须与 --chars 个数(%d) 一致" % (len(coords), len(chars)))
        report["ordered_points"] = reorder_coords(chars, best_word, coords)
    else:
        report["warnings"].append("未提供 --coords：只输出顺序，坐标需由调用方按字回查")

    report["next_step"] = (
        "按 best 的顺序取坐标后，仍需按 references/tile-scramble-and-coordinate-mapping.md §4 "
        "做视觉→提交坐标换算；顺序错了不会报异常，建议一次会话内 A/B 两种顺序各提一次")

    text = json.dumps(report, ensure_ascii=False, indent=2 if args.pretty else None)
    if args.report:
        with open(args.report, "w", encoding="utf-8") as f:
            f.write(text)
    print(text)
    return 0 if report["confidence"] == "high" else 1


# --------------------------------------------------------------------------- #
# 自检
# --------------------------------------------------------------------------- #
def selftest():
    failures = []
    checks = 0
    table = dict(BUILTIN_DICT)

    cases = [
        ("性适应", "适应性"),
        ("地天冰雪", "冰天雪地"),
    ]
    for chars, expect in cases:
        checks += 1
        got = solve(list(chars), table, top_k=1)[0][0]
        if got != expect:
            failures.append("语序还原 %s → 期望 %s，实得 %s" % (chars, expect, got))

    # len² 权重：同一个 3 字词，走 3-gram 必须比"2-gram + 单字"得分高
    checks += 1
    as_trigram = score("物理系", {"物理系": 100})
    as_split = score("物理系", {"物理": 100, "系": 100})
    if as_trigram <= as_split:
        failures.append("len² 权重未生效：3-gram 得分 %.4f 未超过 2-gram+1-gram 的 %.4f"
                        % (as_trigram, as_split))

    # freq=0 必须被强制成 1，否则 log(1)=0 会让候选白算
    checks += 1
    zero_dict = {"适应": 0, "适应性": 0}
    if score("适应性", {k: max(1, v) for k, v in zero_dict.items()}) <= 0:
        failures.append("freq=0 兜底失效")
    checks += 1
    if score("适应性", zero_dict) != 0.0:
        failures.append("未兜底时 freq=0 应得 0 分（用来验证兜底的必要性）")

    # 重复字：排列去重后数量应为 n!/重复数的阶乘
    checks += 1
    ranked = solve(list("金金针"), table, top_k=99)
    if len(ranked) != 3:  # 3!/2! = 3
        failures.append("重复字排列未去重：得到 %d 个（应为 3）" % len(ranked))

    # 坐标回填：顺序与 best 一致，且不丢不重
    checks += 1
    pts = reorder_coords(list("性适应"), "适应性", ["1,1", "2,2", "3,3"])
    if [p["char"] for p in pts] != ["适", "应", "性"] or len({p["coord"] for p in pts}) != 3:
        failures.append("坐标回填错误：%r" % (pts,))

    # 词频表解析容错：三列 / 单列 / 非数字词频
    checks += 1
    import tempfile, os
    fd, path = tempfile.mkstemp(suffix=".txt", text=True)
    os.close(fd)
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write("# 注释行\n适应性 5000 n\n适应\n应性 abc\n")
        t, bad = load_dict(path)
        if t.get("适应性") != 5000 or t.get("适应") != 1 or t.get("应性") != 1 or bad != 1:
            failures.append("词频表解析容错失败：%r bad=%d" % (t, bad))
    finally:
        os.unlink(path)

    print("自检项：%d，失败：%d" % (checks, len(failures)))
    for f in failures:
        print("  FAIL", f)
    if not failures:
        print("  PASS order_restore")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
