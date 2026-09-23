#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""check_verify_docs_consistency.py —— web-verify-patcher 的「验证码类型清单」三处一致性校验

为什么需要它
------------
同一份「验证码类型清单」在本技能里被维护了三处：

  1. `references/captcha-types.md` 的**判断表**（权威源，文件末尾已声明）
  2. `SKILL.md` 的「## 分类标签」列表（总是加载进上下文，方便随手取用）
  3. `references/solution-playbooks.md` 的**类型小节**（`## \\`<type>\\``）

物理合并（只留一处）会牺牲渐进式披露：`SKILL.md` 需要一份轻量索引，
`solution-playbooks.md` 需要按类型的方案小节。所以正确做法不是"删掉两处"，
而是**把三处的一致性变成机械可校验的不变量**——这也是本脚本存在的全部理由。

历史：这条结构性收敛从 B5 一路挂账到 B19（15 轮），本轮（B20）落地为可执行断言。

校验内容
--------
A. 三处清单的**集合一致**（不多不少）；
B. 三处的**顺序一致**（列表顺序即分类优先级，顺序漂移会让报告口径不一致）；
C. 任意一处**无重复项**；
D. `captcha-types.md` 里存在「唯一权威源」声明；
E. `SKILL.md` 的清单块**显式声明自己不是权威源**并指向本脚本；
F. 清单规模 ≥ 20（防止解析器失效后"校验通过"的假绿）；
G. **判断表 ↔ 类型说明小节一一对应**（`captcha-types.md` 自己的两半也不能漂移）；
H. **`captcha_variant` 取值封闭**：文档/脚本里出现的字面量取值必须都在
   `captcha-types.md` 的「`captcha_variant` 取值表」里（占位值 `null`/`str` 等不计）；
I. **厂商标签一致**：`SKILL.md` 的「使用这些固定厂商标签」列表与
   `provider-products.md` 的厂商信号表**集合相同**（厂商清单**顺序无语义**，故只比集合不比顺序）。

用法
----
    python scripts/check_verify_docs_consistency.py --markdown
    python scripts/check_verify_docs_consistency.py --selftest

退出码：0 一致；1 存在阻断；2 参数/读取错误。
"""

import argparse
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.normpath(os.path.join(HERE, ".."))
TYPES_DOC = os.path.join(SKILL_DIR, "references", "captcha-types.md")
PLAYBOOKS_DOC = os.path.join(SKILL_DIR, "references", "solution-playbooks.md")
PRODUCTS_DOC = os.path.join(SKILL_DIR, "references", "provider-products.md")
SKILL_MD = os.path.join(SKILL_DIR, "SKILL.md")

MIN_ENTRIES = 20

# `captcha_variant` 扫描时忽略的占位值（它们是"没有子类"，不是取值）
VARIANT_PLACEHOLDERS = {"null", "none", "true", "false", "str", "string", "variant", "captcha_variant"}


# --------------------------------------------------------------------------
# 三个解析器（都接受"文本 + 路径"以便自检注入合成文档）
# --------------------------------------------------------------------------

def parse_types_doc(text):
    """`references/captcha-types.md` 判断表：取 `## 判断表` 之后、下一个 `## ` 之前的
    表格行第一列（反引号包裹的类型名）。"""
    m = re.search(r"^##\s+判断表\s*$", text, re.M)
    if not m:
        return None, "未找到 `## 判断表` 小节"
    rest = text[m.end():]
    nxt = re.search(r"^##\s+", rest, re.M)
    body = rest[:nxt.start()] if nxt else rest
    out = []
    for line in body.split("\n"):
        mm = re.match(r"^\|\s*`([A-Za-z0-9_-]+)`\s*\|", line)
        if mm:
            out.append(mm.group(1))
    return out, None


def parse_skill_md(text):
    """`SKILL.md` 的 `## 分类标签` 列表：取 `- \\`<type>\\`：` 形态的条目。"""
    m = re.search(r"^##\s+分类标签\s*$", text, re.M)
    if not m:
        return None, "未找到 `## 分类标签` 小节"
    rest = text[m.end():]
    # 到「使用这些固定厂商标签」之前
    stop = re.search(r"^使用这些固定厂商标签", rest, re.M)
    body = rest[:stop.start()] if stop else rest
    out = []
    for line in body.split("\n"):
        mm = re.match(r"^-\s*`([A-Za-z0-9_-]+)`\s*[：:]", line)
        if mm:
            out.append(mm.group(1))
    return out, None


def parse_playbooks(text):
    """`references/solution-playbooks.md` 的类型小节：`## \\`<type>\\`` 标题。"""
    out = []
    for line in text.split("\n"):
        mm = re.match(r"^##\s+`([A-Za-z0-9_-]+)`\s*$", line)
        if mm:
            out.append(mm.group(1))
    return out, None


def parse_type_sections(text):
    """`captcha-types.md` 自己的类型说明小节：`### \\`<type>\\`` 标题。"""
    out = []
    for line in text.split("\n"):
        mm = re.match(r"^###\s+`([A-Za-z0-9_-]+)`\s*$", line)
        if mm:
            out.append(mm.group(1))
    return out, None


def parse_variant_table(text):
    """`captcha-types.md` 的「`captcha_variant` 取值表」：第一列反引号里的取值。

    ⚠️ 必须**跳过表头**：本表表头第一列写的就是 `` `captcha_variant` ``，
    直接按"第一列反引号"收集会把表头当成一个取值（实测踩过：取值表被数成 9 项、真实只有 8 项，
    且 `captcha_variant` 这个假取值会混进允许集）。
    处置：只收集 `| --- |` 分隔行**之后**的行。
    """
    m = re.search(r"^##\s+`captcha_variant`\s*取值表", text, re.M)
    if not m:
        return None, "未找到 `## \"`captcha_variant\" 取值表` 小节"
    rest = text[m.end():]
    nxt = re.search(r"^##\s+", rest, re.M)
    body = rest[:nxt.start()] if nxt else rest
    lines = body.split("\n")
    sep = None
    for i, line in enumerate(lines):
        if re.match(r"^\|[\s:-]*\|", line) and "-" in line:
            sep = i
            break
    if sep is None:
        return None, "取值表缺少 `| --- |` 分隔行，无法可靠区分表头与数据"
    out = []
    for line in lines[sep + 1:]:
        mm = re.match(r"^\|\s*`([A-Za-z0-9_-]+)`\s*\|", line)
        if mm:
            out.append(mm.group(1))
    return out, None


def parse_vendor_labels(text):
    """`SKILL.md` 的「使用这些固定厂商标签」行：反引号里的厂商 id。"""
    i = text.find("使用这些固定厂商标签")
    if i < 0:
        return None, "未找到 `使用这些固定厂商标签` 段落"
    seg = text[i:]
    m = re.search(r"^- (.*)$", seg, re.M)
    if not m:
        return None, "厂商标签行不是以 `- ` 开头"
    return re.findall(r"`([A-Za-z0-9_-]+)`", m.group(1)), None


def parse_vendor_signal_table(text):
    """`provider-products.md` 的厂商信号表：第一列反引号里的厂商 id。

    只取「## 厂商信号表」到下一个 `## ` 之前，避免把后面产品小节的其它表格算进来。
    """
    m = re.search(r"^##\s+厂商信号表\s*$", text, re.M)
    if not m:
        return None, "未找到 `## 厂商信号表` 小节"
    rest = text[m.end():]
    nxt = re.search(r"^##\s+", rest, re.M)
    body = rest[:nxt.start()] if nxt else rest
    out = []
    for line in body.split("\n"):
        mm = re.match(r"^\|\s*`([A-Za-z0-9_-]+)`\s*\|", line)
        if mm:
            out.append(mm.group(1))
    return out, None


VARIANT_RE = re.compile(r"captcha_variant[\"']?\s*[=:]=?\s*[\"']?([A-Za-z0-9_-]+)")


# 扫描时排除的文件：**校验器自己**不是 `captcha_variant` 的使用点，
# 它的自检夹具里必然出现"故意非法的取值"（否则没法验证"非法取值会被拦下"）。
# 不排除的话会自我阻断（实测踩过：`made-up` 被自己扫出来）。
VARIANT_SCAN_SKIP_FILES = {"check_verify_docs_consistency.py"}


def scan_variant_usages(skill_dir):
    """扫描技能内所有 md/js/py，找出 `captcha_variant` 的字面量取值。

    返回 [(相对路径, 行号, 取值)]，已剔除：
      * 占位值（`null` / `str` / 变量名自身等，见 VARIANT_PLACEHOLDERS）；
      * **函数调用形态**（`"captcha_variant": context_value(...)`）——
        值不是字面量，不能当取值校验（这是本扫描最容易误报的一类，必须有专门的用例）；
      * 校验器自身（见 VARIANT_SCAN_SKIP_FILES）。
    """
    hits = []
    for dp, dn, fn in os.walk(skill_dir):
        dn[:] = [d for d in dn if d not in ("node_modules", "__pycache__", ".git")]
        for f in fn:
            if not f.endswith((".md", ".js", ".py")) or f in VARIANT_SCAN_SKIP_FILES:
                continue
            p = os.path.join(dp, f)
            try:
                lines = io.open(p, encoding="utf-8", errors="replace").read().split("\n")
            except OSError:
                continue
            for no, line in enumerate(lines, 1):
                for mm in VARIANT_RE.finditer(line):
                    val = mm.group(1)
                    if val.lower() in VARIANT_PLACEHOLDERS:
                        continue
                    tail = line[mm.end():].lstrip()
                    if tail.startswith("("):
                        continue  # 函数调用，不是字面量取值
                    hits.append((os.path.relpath(p, skill_dir).replace(os.sep, "/"), no, val))
    return hits


# --------------------------------------------------------------------------
# 核心校验（纯函数，便于自检）
# --------------------------------------------------------------------------

def check(triples, min_entries=MIN_ENTRIES):
    """triples: [(名称, 列表, 解析错误)] → (blocking:list[str], warnings:list[str])

    `min_entries` 可调是为了**自检**：自检用 5 项合成清单，必须能把阈值降到 1，
    否则"清单过小"这一条会先触发、把其它断言全遮住（这正是"阈值逻辑的 bug
    不会让正例变红"的实例——必须有专门的边界用例）。
    """
    blocking = []
    warnings = []

    named = {}
    for name, lst, err in triples:
        if err:
            blocking.append("%s：解析失败（%s）" % (name, err))
            continue
        if len(lst) < min_entries:
            blocking.append("%s：清单只有 %d 项（< %d）。解析器可能失效，"
                            "这种「通过」是假绿，必须先修解析。" % (name, len(lst), min_entries))
            continue
        dupes = sorted({t for t in lst if lst.count(t) > 1})
        if dupes:
            blocking.append("%s：存在重复项 %s" % (name, dupes))
        named[name] = lst

    if len(named) < 3:
        return blocking, warnings

    names = list(named.keys())
    ref_name = names[0]
    ref = named[ref_name]
    ref_set = set(ref)
    for name in names[1:]:
        cur = named[name]
        missing = [t for t in ref if t not in set(cur)]
        extra = [t for t in cur if t not in ref_set]
        if missing:
            blocking.append("%s 缺少类型：%s（权威源 %s 里有）" % (name, missing, ref_name))
        if extra:
            blocking.append("%s 多出类型：%s（权威源 %s 里没有）" % (name, extra, ref_name))
        if not missing and not extra and cur != ref:
            blocking.append("%s 顺序与 %s 不一致（顺序即分类优先级，不能漂移）"
                            % (name, ref_name))

    return blocking, warnings


def check_declarations(types_text, skill_text):
    blocking = []
    if "唯一权威源" not in types_text:
        blocking.append("captcha-types.md 缺少「本文件是验证码类型的唯一权威源」声明")
    if "本清单不是权威源" not in skill_text:
        blocking.append("SKILL.md 的分类标签块缺少「本清单不是权威源」声明")
    if "check_verify_docs_consistency.py" not in skill_text:
        blocking.append("SKILL.md 未指向 check_verify_docs_consistency.py（读者不知道要跑它）")
    return blocking


def check_types_vs_sections(types_list, sections_list):
    """G) 判断表 ↔ 类型说明小节（同一个文件的两半也不能漂移）。"""
    blocking = []
    if sections_list == types_list:
        return blocking
    missing = [t for t in (types_list or []) if t not in (sections_list or [])]
    extra = [t for t in (sections_list or []) if t not in (types_list or [])]
    if missing:
        blocking.append("captcha-types.md 类型说明缺少小节：%s" % missing)
    if extra:
        blocking.append("captcha-types.md 类型说明多出小节：%s" % extra)
    if not missing and not extra:
        blocking.append("captcha-types.md 判断表与类型说明小节的**顺序**不一致")
    return blocking


def check_variant_closed(variants, usages):
    """H) `captcha_variant` 的字面量取值必须都在取值表里。"""
    blocking = []
    if variants is None:
        return ["captcha-types.md：未找到 `captcha_variant` 取值表（H 项无法校验）"]
    if not usages:
        # 有取值表却一处用法都扫不到 ⇒ 解析器失效，属于"假绿"，必须报出来
        return ["captcha_variant 扫描结果为空 —— 解析器可能失效（假绿），必须先修"]
    allowed = set(variants)
    bad = sorted({(v, f) for f, _n, v in usages if v not in allowed})
    for v, f in bad:
        blocking.append("captcha_variant 取值 `%s` 不在取值表里（出现在 %s）" % (v, f))
    return blocking


def check_vendor_sets(labels, vendors):
    """I) 厂商标签：SKILL.md ↔ provider-products.md 厂商信号表。

    厂商清单**顺序无语义**（provider-products 按产品族分组排布），因此只比集合。
    """
    blocking = []
    only_skill = [t for t in (labels or []) if t not in set(vendors or [])]
    only_products = [t for t in (vendors or []) if t not in set(labels or [])]
    if only_skill:
        blocking.append("provider-products.md 厂商信号表缺少：%s（SKILL.md 标签里有）" % only_skill)
    if only_products:
        blocking.append("SKILL.md 厂商标签缺少：%s（provider-products.md 里有）" % only_products)
    return blocking


def run(report_markdown=False, paths=None):
    types_doc, playbooks_doc, skill_md, products_doc = paths or (
        TYPES_DOC, PLAYBOOKS_DOC, SKILL_MD, PRODUCTS_DOC)
    try:
        types_text = io.open(types_doc, encoding="utf-8").read()
        play_text = io.open(playbooks_doc, encoding="utf-8").read()
        skill_text = io.open(skill_md, encoding="utf-8").read()
        if products_doc:
            products_text = io.open(products_doc, encoding="utf-8").read()
        else:
            products_text = None
    except OSError as exc:
        print(json.dumps({"error": "read_failed", "detail": str(exc)}, ensure_ascii=False))
        return 2

    types_list, e1 = parse_types_doc(types_text)
    skill_list, e2 = parse_skill_md(skill_text)
    play_list, e3 = parse_playbooks(play_text)
    sections_list, e4 = parse_type_sections(types_text)

    blocking, warnings = check([
        ("captcha-types.md 判断表", types_list, e1),
        ("SKILL.md 分类标签", skill_list, e2),
        ("solution-playbooks.md 类型小节", play_list, e3),
    ])
    blocking += check_declarations(types_text, skill_text)

    # G) 判断表 ↔ 类型说明小节（同一个文件的两半也不能漂移）
    if not e1 and not e4:
        blocking += check_types_vs_sections(types_list, sections_list)

    # H) captcha_variant 取值必须封闭在取值表里
    variants, e5 = parse_variant_table(types_text)
    if e5:
        blocking.append("captcha-types.md：%s" % e5)
    else:
        # 扫描目录跟随**被检查的 SKILL.md**，而不是写死的 SKILL_DIR：
        # 否则用 `paths=` 指向副本时仍在扫真实目录，故障注入式的阳性验证会静默漏检
        # （实测踩过：H 项的注入故障因此"看起来没生效"）。
        blocking += check_variant_closed(
            variants, scan_variant_usages(os.path.dirname(os.path.abspath(skill_md))))

    # I) 厂商标签：SKILL.md ↔ provider-products.md 厂商信号表（顺序无语义，只比集合）
    labels, e6 = parse_vendor_labels(skill_text)
    if e6:
        blocking.append("SKILL.md：%s" % e6)
    if products_text is None:
        warnings.append("未提供 provider-products.md，跳过厂商标签一致性检查")
    else:
        vendors, e7 = parse_vendor_signal_table(products_text)
        if e7:
            blocking.append("provider-products.md：%s" % e7)
        if not e6 and not e7:
            blocking += check_vendor_sets(labels, vendors)

    result = {
        "ok": not blocking,
        "counts": {
            "captcha-types.md 判断表": len(types_list or []),
            "SKILL.md 分类标签": len(skill_list or []),
            "solution-playbooks.md 类型小节": len(play_list or []),
            "captcha-types.md 类型说明": len(sections_list or []),
            "captcha_variant 取值表": len(variants or []),
            "厂商标签": len(labels or []),
        },
        "order": types_list or [],
        "variants": variants or [],
        "blocking": blocking,
        "warnings": warnings,
    }

    if report_markdown:
        lines = ["## 验证码类型清单一致性校验", ""]
        lines.append("- 权威源：`references/captcha-types.md`（判断表 + 类型说明 + `captcha_variant` 取值表）")
        lines.append("- 清单规模：" + " / ".join(
            "%s %d 项" % (k, v) for k, v in result["counts"].items()))
        lines.append("- 结论：**%s**" % ("一致" if result["ok"] else "不一致"))
        if blocking:
            lines.append("")
            lines.append("阻断项：")
            for b in blocking:
                lines.append("- " + b)
        else:
            lines.append("")
            lines.append("A 三处集合一致 · B 三处顺序一致 · C 无重复项 · D/E 权威源声明齐全 · "
                         "F 规模达标 · G 判断表 ↔ 类型说明一致 · H `captcha_variant` 取值封闭 · "
                         "I 厂商标签集合一致。")
        print("\n".join(lines))
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))

    return 0 if result["ok"] else 1


# --------------------------------------------------------------------------
# 自检：用合成文档验证解析器与断言真的会响
# --------------------------------------------------------------------------

def _fake_types(types, table_extra=""):
    rows = "\n".join("| `%s` | sig | ev | out |" % t for t in types)
    return ("# 验证码类型\n\n本文件是**验证码类型的唯一权威源**。\n\n## 判断表\n\n"
            "| 类型 | 主要信号 | 有用证据 | 应向用户输出 |\n| --- | --- | --- | --- |\n"
            + rows + table_extra + "\n\n## 类型说明\n\n### `text`\n\nx\n")


def _fake_skill(types, header_note="本清单不是权威源，权威源是 `references/captcha-types.md`；"
                                   "跑 `python scripts/check_verify_docs_consistency.py` 校验。\n\n"):
    items = "\n".join("- `%s`：说明。" % t for t in types)
    return ("# fake\n\n## 分类标签\n\n" + header_note + items
            + "\n\n使用这些固定厂商标签：\n\n- `custom-or-unknown`。\n")


def _fake_playbooks(types):
    return "\n".join("## `%s`\n\nx\n" % t for t in types)


def _fake_products(vendors):
    rows = "\n".join("| `%s` | sig | params | types |" % v for v in vendors)
    return ("# fake\n\n## 厂商信号表\n\n"
            "| 厂商 | 信号 | 参数 | 类型 |\n| --- | --- | --- | --- |\n" + rows + "\n")


def selftest():
    base = ["text", "math", "slider", "rotate", "unknown-custom"]
    checks = []

    def ck(name, cond):
        checks.append((name, bool(cond)))

    def case(types, skill, play, name, min_entries=1):
        b, _w = check([
            ("captcha-types.md 判断表", types, None),
            ("SKILL.md 分类标签", skill, None),
            ("solution-playbooks.md 类型小节", play, None),
        ], min_entries=min_entries)
        return name, b

    # 1) 三处一致 → 无阻断
    _, b = case(base, base, base, "consistent")
    ck("consistent-passes", not b)

    # 2) 少一个类型 → 阻断
    _, b = case(base, base[:-1], base, "missing")
    ck("missing-detected", any("缺少类型" in x for x in b))

    # 3) 多一个类型 → 阻断
    _, b = case(base, base + ["extra-type"], base, "extra")
    ck("extra-detected", any("多出类型" in x for x in b))

    # 4) 顺序漂移（集合相同）→ 阻断
    shuffled = base[:]
    shuffled[2], shuffled[3] = shuffled[3], shuffled[2]
    _, b = case(base, shuffled, base, "order")
    ck("order-drift-detected", any("顺序" in x for x in b))

    # 5) 重复项 → 阻断
    _, b = case(base + ["text"], base, base, "dup")
    ck("dup-detected", any("重复项" in x for x in b))

    # 6) 清单过小（解析器失效的假绿）→ 阻断
    small = ["text", "math"]
    _, b = case(small, small, small, "tiny", min_entries=3)
    ck("tiny-list-detected", any("假绿" in x for x in b))
    # 6b) 边界：正好等于阈值不得报错（阈值判据必须是 `<` 而不是 `<=`）
    edge = ["text", "math", "slider"]
    _, b = case(edge, edge, edge, "edge", min_entries=3)
    ck("threshold-boundary-inclusive", not b)

    # 7) 真解析器：表格里混入非类型行不应被当成类型
    txt = _fake_types(base, "\n| 其它 | x | y | z |")
    parsed, err = parse_types_doc(txt)
    ck("types-parser-ignores-non-backtick-row", err is None and parsed == base)

    # 8) 真解析器：`## 类型说明` 之后的表格行不应被计入
    txt2 = _fake_types(base).replace("### `text`\n\nx", "### `text`\n\n| `sneaky` | a | b | c |")
    parsed2, _ = parse_types_doc(txt2)
    ck("types-parser-stops-at-next-h2", parsed2 == base)

    # 9) 声明缺失 → 阻断
    b = check_declarations("（没有那句）", "（没有那句）")
    ck("declaration-missing-detected", len(b) == 3)

    # 10) 声明齐全 → 无阻断
    b = check_declarations(
        "本文件是**验证码类型的唯一权威源**",
        "本清单不是权威源\ncheck_verify_docs_consistency.py")
    ck("declaration-ok", not b)

    # 11) SKILL.md 分类标签解析：厂商标签块不得被当成类型
    parsed3, err3 = parse_skill_md(_fake_skill(base))
    ck("skill-parser-excludes-vendor-block", err3 is None and parsed3 == base)

    # 12) playbooks 解析只认 `## \`x\`` 形态
    parsed4, _ = parse_playbooks(_fake_playbooks(base) + "\n## 输出原则\n\nx\n")
    ck("playbooks-parser-only-backtick-headings", parsed4 == base)

    # ---- G) 判断表 ↔ 类型说明小节 ----
    secs, err_sec = parse_type_sections(_fake_types(base))
    ck("type-sections-parser", err_sec is None and secs == ["text"])  # 合成夹具只定义了 text 一节
    ck("G-consistent-passes", not check_types_vs_sections(base, base))
    ck("G-missing-section", any("缺少小节" in x for x in check_types_vs_sections(base, base[:-1])))
    ck("G-extra-section", any("多出小节" in x for x in check_types_vs_sections(base, base + ["x"])))
    ck("G-order-drift", any("顺序" in x for x in check_types_vs_sections(base, list(reversed(base)))))

    # ---- H) captcha_variant 取值封闭 ----
    types_with_variant = _fake_types(base) + (
        "\n## `captcha_variant` 取值表（本表是**唯一权威源**）\n\n"
        "| `captcha_variant` | 隶属主类型 | 判据要点 |\n| --- | --- | --- |\n"
        "| `gesture-draw` | `trace-draw` | x |\n| `tile-scramble` | `image-restore` | x |\n")
    vt, err_vt = parse_variant_table(types_with_variant)
    ck("variant-table-parser", err_vt is None and vt == ["gesture-draw", "tile-scramble"])
    # 回归：表头第一列写的也是 `captcha_variant`，绝不能被当成一个取值
    ck("variant-table-skips-header", "captcha_variant" not in (vt or []))
    ck("H-closed-passes", not check_variant_closed(vt, [("a.md", 1, "gesture-draw")]))
    ck("H-unknown-value", any("不在取值表" in x for x in
                              check_variant_closed(vt, [("a.md", 1, "made-up")])))
    ck("H-empty-usages-is-fake-green", any("假绿" in x for x in check_variant_closed(vt, [])))
    ck("H-missing-table", any("取值表" in x for x in check_variant_closed(None, [("a", 1, "x")])))
    # 扫描器：占位值与函数调用都必须被剔除（这两类是本扫描最容易误报的地方）
    import tempfile as _tempfile
    _tmp = _tempfile.mkdtemp(prefix="cvc-")
    try:
        io.open(os.path.join(_tmp, "a.md"), "w", encoding="utf-8", newline="\n").write(
            "补 `captcha_variant: gesture-draw`\n"
            "保持 `captcha_variant: null`\n")
        io.open(os.path.join(_tmp, "b.py"), "w", encoding="utf-8", newline="\n").write(
            'x = {"captcha_variant": "tile-scramble"}\n'
            'y = {"captcha_variant": context_value(a, b)}\n'
            'z = (captcha_variant == "made-up")\n'
            "def f(captcha_variant: str): pass\n")
        got = sorted(v for _f, _n, v in scan_variant_usages(_tmp))
        ck("H-scanner-values", got == ["gesture-draw", "made-up", "tile-scramble"])
    finally:
        import shutil as _shutil
        _shutil.rmtree(_tmp, ignore_errors=True)

    # ---- I) 厂商标签集合 ----
    ck("vendor-labels-parser", parse_vendor_labels(_fake_skill(base))[0] == ["custom-or-unknown"])
    ck("vendor-signal-parser", parse_vendor_signal_table(_fake_products(["a", "b"]))[0] == ["a", "b"])
    ck("I-consistent-passes", not check_vendor_sets(["a", "b"], ["b", "a"]))
    ck("I-missing-in-products", any("厂商信号表缺少" in x for x in check_vendor_sets(["a", "b"], ["a"])))
    ck("I-missing-in-skill", any("厂商标签缺少" in x for x in check_vendor_sets(["a"], ["a", "b"])))

    passed = sum(1 for _n, ok in checks if ok)
    print("check_verify_docs_consistency selftest: %d/%d 通过" % (passed, len(checks)))
    for n, ok in checks:
        if not ok:
            print("  ✗ " + n)
    return 0 if passed == len(checks) else 1


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    ap = argparse.ArgumentParser(
        prog="check_verify_docs_consistency.py",
        description="验证码类型清单三处一致性校验（captcha-types / SKILL.md / solution-playbooks）",
    )
    ap.add_argument("--markdown", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args(argv)
    if args.selftest:
        return selftest()
    return run(report_markdown=args.markdown)


if __name__ == "__main__":
    sys.exit(main())
