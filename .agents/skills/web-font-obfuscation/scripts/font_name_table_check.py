#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""font_name_table_check.py —— 「字形名 → 真值」手工校准表的机械校验

为什么要有这个脚本（B43 蒸馏结论，`52pojie-1465475` 起点）：
    字体反爬里最常见的落地形态是「手工校准一张 `glyph名 → 真值` 的表」（模板 A/C）。
    这类表**抄错一个字符不会报错**，只会让某一类字静默变成另一个字。
    源文那张表里就真有一处手误：

        mima = {'eight':'8', ..., 'one':'8', ...}     # 'one' 应为 '1'，与 'eight' 撞值

    ⇒ 两个名字映射到同一个数字，**不是双射**。本脚本把这类错误变成一条会失败的断言。

校验四项（每项都能单独用）：
    1. 单射（无撞值）：同一个真值被两个字形名映射到 ⇒ 必有一处抄错
    2. 值域完整：数字类站点，值集合必须**恰好**覆盖期望值集（默认 '0'..'9'）
    3. 基数对得上：表长 vs `--expect-count`（或 vs `--cmap` 里的字形名集合）
    4. 索引类名字的换算：`glyphNNNNN` 走 `int(name[-2:]) - offset`，越界/负值必须报出来

零依赖：仅用 Python 标准库（json / argparse / re）。
自检：python font_name_table_check.py --selftest
"""

import argparse
import io
import json
import os
import re
import sys

DIGITS = [str(i) for i in range(10)]
# 数字类站点常见的非数字真值（小数点、单位、符号）—— 显式白名单，不要靠猜
DIGIT_ALLOWED_EXTRA = [".", "-", "+", "w", "k", "m"]


def check_table(table, expect_values=None, expect_count=None, cmap_names=None,
                allow_extra=None):
    """校验一张 `字形名 → 真值` 表，返回结构化报告（不抛错，让调用方决定）。"""
    rep = {
        "size": len(table),
        "value_set": sorted(set(table.values())),
        "collisions": {},
        "missing_values": [],
        "extra_values": [],
        "count_ok": None,
        "cmap_only_in_table": [],
        "cmap_only_in_cmap": [],
        "index_names": [],
        "index_bad": [],
        "ok": True,
        "problems": [],
    }
    if not table:
        rep["ok"] = False
        rep["problems"].append("表为空")
        return rep

    # 1) 单射：同值多名 ⇒ 抄错
    by_val = {}
    for name, val in table.items():
        by_val.setdefault(val, []).append(name)
    for val, names in sorted(by_val.items()):
        if len(names) > 1:
            rep["collisions"][val] = sorted(names)
    if rep["collisions"]:
        rep["ok"] = False
        rep["problems"].append(
            "非单射：%d 个真值被多个字形名映射（必有一处抄错）" % len(rep["collisions"]))

    # 2) 值域
    if expect_values is not None:
        exp = list(expect_values)
        got = set(table.values())
        rep["missing_values"] = sorted(set(exp) - got)
        allowed = set(exp)
        if allow_extra is not None:
            allowed |= set(allow_extra)
        rep["extra_values"] = sorted(got - allowed)
        if rep["missing_values"]:
            rep["ok"] = False
            rep["problems"].append("值域缺 %s" % rep["missing_values"])
        if rep["extra_values"]:
            rep["ok"] = False
            rep["problems"].append("值域多出未登记的值 %s" % rep["extra_values"])

    # 3) 基数
    if expect_count is not None:
        rep["count_ok"] = (len(table) == expect_count)
        if not rep["count_ok"]:
            rep["ok"] = False
            rep["problems"].append("表长 %d != 期望 %d（漏替换或多替换都会静默发生）"
                                   % (len(table), expect_count))
    if cmap_names is not None:
        tset, cset = set(table.keys()), set(cmap_names)
        rep["cmap_only_in_table"] = sorted(tset - cset)
        rep["cmap_only_in_cmap"] = sorted(cset - tset)
        if rep["cmap_only_in_table"] or rep["cmap_only_in_cmap"]:
            rep["ok"] = False
            rep["problems"].append(
                "与 cmap 字形名集合不一致（表多 %d / cmap 多 %d）"
                % (len(rep["cmap_only_in_table"]), len(rep["cmap_only_in_cmap"])))

    # 4) 索引类名字
    for name in sorted(table.keys()):
        m = re.fullmatch(r"(?:glyph|uni)?(\d+)", name)
        if m:
            rep["index_names"].append(name)
    return rep


def index_from_name(name, offset=1, tail_len=2):
    """`glyphNNNNN` 的「尾部索引」换算：真值 = int(尾 N 位) - offset。

    ⚠️ 只对「索引恰好 tail_len 位」的名字成立；位数一变（字形数 ≥ 100）整表错位，
    故返回值同时给出 `ambiguous`，让调用方**显式决定**而不是静默沿用。
    """
    m = re.fullmatch(r"(?:glyph|uni)?(\d+)", name)
    if not m:
        raise ValueError("名字 %r 不含纯数字索引" % name)
    digits = m.group(1)
    # ⚠️ 判「歧义」要看**有效位数**（去前导零后），不能看原始长度：
    #    `glyph00010` 的数字部分 5 位（"00010"），但有效位只有 2 位 ⇒ 不歧义；
    #    `glyph00100` 的有效位是 3 位 ⇒ 与 tail_len=2 不符 ⇒ 歧义（整表会错位）。
    significant = digits.lstrip("0") or "0"
    tail = digits[-tail_len:]
    val = int(tail) - offset
    return {
        "name": name,
        "digits": digits,
        "significant": significant,
        "tail": tail,
        "value": val,
        "ambiguous": len(significant) != tail_len,
        "out_of_range": not (0 <= val <= 9),
    }


def _selftest():
    ok = [0]
    bad = []

    def chk(name, cond, extra=""):
        if cond:
            ok[0] += 1
        else:
            bad.append("%s %s" % (name, extra))

    # --- 1) 源文那张含手误的表：必须被「非单射」抓住 ---
    src_table = {"eight": "8", "period": ".", "two": "2", "seven": "7", "four": "4",
                 "three": "3", "six": "6", "five": "5", "zero": "0", "one": "8",
                 "nine": "9"}
    rep = check_table(src_table, expect_values=DIGITS, allow_extra=DIGIT_ALLOWED_EXTRA)
    chk("源文表必须被判为不通过", rep["ok"] is False)
    chk("源文表的撞值在 '8' 上", list(rep["collisions"].keys()) == ["8"], str(rep["collisions"]))
    chk("撞值的两个名字是 eight / one", rep["collisions"]["8"] == ["eight", "one"])
    chk("源文表被报出「缺 '1'」", rep["missing_values"] == ["1"], str(rep["missing_values"]))
    chk("源文表值域不额外多值（'.' 在允许白名单里）", rep["extra_values"] == [],
        str(rep["extra_values"]))

    # --- 2) 修好之后必须通过 ---
    fixed = dict(src_table)
    fixed["one"] = "1"
    rep2 = check_table(fixed, expect_values=DIGITS, expect_count=11,
                       allow_extra=DIGIT_ALLOWED_EXTRA)
    chk("修正 'one'→'1' 后通过", rep2["ok"] is True, "; ".join(rep2["problems"]))
    chk("修正后无撞值", rep2["collisions"] == {})
    chk("修正后值集合 = 0-9 + '.'", rep2["value_set"] == sorted(DIGITS + ["."]),
        str(rep2["value_set"]))

    # --- 3) 基数校验：漏一项必须报出来 ---
    rep3 = check_table(fixed, expect_count=12, allow_extra=DIGIT_ALLOWED_EXTRA)
    chk("表长与期望不符必须报错", rep3["ok"] is False and rep3["count_ok"] is False)

    # --- 4) 与 cmap 名字集合对账 ---
    rep4 = check_table(fixed, cmap_names=list(fixed.keys()) + ["glyph00099"],
                       allow_extra=DIGIT_ALLOWED_EXTRA)
    chk("cmap 多出的名字必须报出来", rep4["cmap_only_in_cmap"] == ["glyph00099"])
    chk("对账不一致 ⇒ 不通过", rep4["ok"] is False)

    # --- 5) 索引换算：58 同城口径（tail 2 位，offset 1） ---
    a = index_from_name("glyph00010")
    chk("glyph00010 → 9（int('10') - 1）", a["value"] == 9, str(a))
    chk("glyph00010 不是歧义名（尾 2 位即全部数字）", a["ambiguous"] is False)
    b = index_from_name("glyph00001")
    chk("glyph00001 → 0", b["value"] == 0, str(b))
    chk("glyph00009 → 8（'09' → 9-1）", index_from_name("glyph00009")["value"] == 8)

    # --- 6) 索引越界/位数变化必须被显式标出，而不是静默沿用 ---
    c = index_from_name("glyph00100")
    chk("glyph00100 被标为歧义（尾 2 位 '00' ≠ 全部数字）", c["ambiguous"] is True, str(c))
    chk("glyph00100 的换算值越界（-1）", c["out_of_range"] is True and c["value"] == -1, str(c))
    chk("glyph00010 的 offset 可参数化（offset=0 时 → 10，越界）",
        index_from_name("glyph00010", offset=0)["value"] == 10
        and index_from_name("glyph00010", offset=0)["out_of_range"] is True)

    # --- 7) 汉字表（非数字真值）也能用同一套校验 ---
    han = {"uni2FAF": "面", "uni5584": "善", "uni4E16": "世", "uni5BB3": "害", "uni2F83": "自"}
    rep5 = check_table(han, expect_count=5)
    chk("汉字表：无撞值、基数对 ⇒ 通过", rep5["ok"] is True, "; ".join(rep5["problems"]))
    chk("汉字表不做值域白名单校验（expect_values=None 时跳过）", rep5["missing_values"] == [])
    rep6 = check_table({"uniA": "面", "uniB": "面"}, expect_count=2)
    chk("汉字表撞值同样被抓", rep6["ok"] is False and rep6["collisions"] == {"面": ["uniA", "uniB"]})

    # --- 8) 空表 ---
    rep7 = check_table({})
    chk("空表必须报错（不能静默返回「全部通过」）", rep7["ok"] is False and "表为空" in rep7["problems"][0])

    # --- 9) 索引类名字能被识别出来（供人工复核用） ---
    rep8 = check_table({"glyph00010": "9", "glyph00011": "0"}, expect_count=2)
    chk("索引类名字被登记进 index_names", rep8["index_names"] == ["glyph00010", "glyph00011"],
        str(rep8["index_names"]))

    # --- 10) 非数字名的 offset 换算必须抛错，而不是猜 ---
    try:
        index_from_name("uni2FAF")
        chk("非数字索引名必须抛错", False, "没有抛错")
    except ValueError:
        chk("非数字索引名必须抛错", True)

    total = ok[0] + len(bad)
    print("font_name_table_check.py --selftest")
    print("  PASS %d / %d" % (ok[0], total))
    for x in bad:
        print("  FAIL " + x)
    if bad:
        return 1
    print("  全部通过（断言数以此实跑输出为准，不要在文档里手抄）")
    return 0


def main(argv=None):
    if argv is None:
        argv = sys.argv[1:]
    ap = argparse.ArgumentParser(
        description="「字形名 → 真值」手工校准表的机械校验（单射 / 值域 / 基数 / 索引换算）",
        epilog="示例：\n"
               "  python font_name_table_check.py --table table.json\n"
               "  python font_name_table_check.py --table table.json --expect-digits\n"
               "  python font_name_table_check.py --table table.json --cmap cmap.json\n"
               "  python font_name_table_check.py index --name glyph00010 --offset 1\n"
               "  python font_name_table_check.py --selftest\n")
    ap.add_argument("--selftest", action="store_true", help="跑内置自检")
    ap.add_argument("--table", help="JSON 文件：{字形名: 真值}")
    ap.add_argument("--expect-digits", action="store_true",
                    help="值域必须恰好覆盖 '0'..'9'（可配 --allow-extra）")
    ap.add_argument("--allow-extra", default="",
                    help="允许的额外真值，逗号分隔（如 '. , w'）")
    ap.add_argument("--expect-count", type=int, help="期望表长（应与 cmap 条目数一致）")
    ap.add_argument("--cmap", help="font_cmap_dump.py dump 出来的 JSON，用它的字形名集合对账")
    ap.add_argument("--json", action="store_true", help="只输出 JSON 报告")

    # ★ `index` 子命令必须在 argparse 之前拦下：主 parser 不认识它，
    #   直接 ap.parse_args 会以 "unrecognized arguments" 退出（而不是走到子命令分支）。
    if argv and argv[0] == "index":
        sub = argparse.ArgumentParser(prog="font_name_table_check.py index",
                                      description="单算一个索引类名字的换算")
        sub.add_argument("index")
        sub.add_argument("--name", required=True)
        sub.add_argument("--offset", type=int, default=1)
        sub.add_argument("--tail-len", type=int, default=2)
        sub.add_argument("--json", action="store_true")
        a = sub.parse_args(argv)
        r = index_from_name(a.name, offset=a.offset, tail_len=a.tail_len)
        if a.json:
            print(json.dumps(r, ensure_ascii=False, indent=2))
        else:
            print("%s → 真值 %d（有效位 %s，尾 %r，offset %d）%s%s"
                  % (r["name"], r["value"], r["significant"], r["tail"], a.offset,
                     "  ⚠️ 有效位数与 tail-len 不符 ⇒ 换算不可信" if r["ambiguous"] else "",
                     "  ⚠️ 结果越界（不在 0-9）" if r["out_of_range"] else ""))
        return 0 if not (r["ambiguous"] or r["out_of_range"]) else 2

    args = ap.parse_args(argv)

    if args.selftest or not args.table:
        if args.selftest:
            return _selftest()
        ap.print_help()
        return 0

    with io.open(args.table, encoding="utf-8") as f:
        table = json.load(f)
    cmap_names = None
    if args.cmap:
        with io.open(args.cmap, encoding="utf-8") as f:
            dump = json.load(f)
        # font_cmap_dump.py 的产物里，by_codepoint 是 {码位: 字形名}
        by_cp = dump.get("by_codepoint") or dump.get("cmap") or {}
        cmap_names = sorted(set(by_cp.values()))
    allow_extra = [x for x in args.allow_extra.split(",") if x] if args.allow_extra else None
    rep = check_table(table,
                      expect_values=DIGITS if args.expect_digits else None,
                      expect_count=args.expect_count,
                      cmap_names=cmap_names,
                      allow_extra=allow_extra if allow_extra is not None else DIGIT_ALLOWED_EXTRA)
    if args.json:
        print(json.dumps(rep, ensure_ascii=False, indent=2))
    else:
        print("表长 %d · 值集合 %s" % (rep["size"], "".join(rep["value_set"])))
        print("单射：%s" % ("是" if not rep["collisions"] else "否 → " + json.dumps(rep["collisions"], ensure_ascii=False)))
        if rep["missing_values"]:
            print("值域缺：%s" % rep["missing_values"])
        if rep["extra_values"]:
            print("值域多：%s" % rep["extra_values"])
        if rep["index_names"]:
            print("索引类名字 %d 个（用 index 子命令复核换算）" % len(rep["index_names"]))
        print("结论：%s" % ("通过" if rep["ok"] else "不通过 → " + "；".join(rep["problems"])))
    return 0 if rep["ok"] else 2


if __name__ == "__main__":
    sys.exit(main())
