#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""font_template_diff.py —— 「同源字体换表」比对：用原版字体的图元反推加密字体。

解决什么问题（超星学习通式）：
    站点拿一份正版字体（如 SourceHanSansCN），**把 A 字码位挂到 B 字的字形数据上**。
    于是 `cmap` 看起来完全正常（`0x6408 -> uni6408`），
    但 `glyf` 里 uni6408 的轮廓其实是 `争`（官方 uni4E89）的轮廓。
    复制出来是 `搈`，屏幕上是 `争` —— **cmap 层没有任何异常**，
    所以只 dump cmap 的做法在这一族上 100% 失效且不报错。

解法：
    1. 拿**官方原版字体**做模板，对每个字形的轮廓算一个规范化指纹；
    2. 对目标字体算同样的指纹；
    3. 指纹相等 → 真值就是原版里那个名字对应的字。

    这正是 `font_glyph_fingerprint.py` 的算法，
    区别是 A 版与 B 版**不是同一次刷新**，而是「官方字库 vs 站点改造字库」。

能力：
    template <official.ttf> -o tmpl.json          建立官方模板指纹库
    apply <target.ttf> --template tmpl.json       目标字体 → {码位: 真值}
    --glyph-set <name> --assign <tplname=targetname> ...  重挂载（自检用）
    --selftest                                    合成官方字体 + 改造字体，往返还原

用法：
    python font_template_diff.py template SourceHanSansCN-Normal.ttf -o tmpl.json
    python font_template_diff.py apply enc.ttf --template tmpl.json -o map.json
    python font_template_diff.py --selftest

注：本脚本依赖 `font_cmap_dump.py` / `font_glyph_fingerprint.py` 同目录导入，
    全部零第三方依赖。
"""

from __future__ import annotations

import argparse
import json
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from font_cmap_dump import (  # noqa: E402
    FontFormatError,
    _build_cmap_format4,
    _build_sfnt,
    parse_cmap,
    unpack_font,
)
from font_glyph_fingerprint import (  # noqa: E402
    _glyph_offsets,
    _parse_simple_glyph,
    _simple_glyph,
)


# --------------------------------------------------------------------------
# 指纹：与 font_glyph_fingerprint 完全同构（同一份算法，避免两处漂移）
# --------------------------------------------------------------------------


def _fingerprint_by_gid(tables: dict) -> dict[int, str]:
    import hashlib

    offs, glyf = _glyph_offsets(tables)
    out: dict[int, str] = {}
    for gid in range(len(offs) - 1):
        start, end = offs[gid], offs[gid + 1]
        if start >= end:
            out[gid] = "empty"
            continue
        blob = glyf[start:end]
        parsed = _parse_simple_glyph(blob)
        if parsed is None:
            out[gid] = "raw:" + hashlib.md5(blob).hexdigest()[:16]
            continue
        n, end_pts, pts = parsed
        canon = f"n={n};e={','.join(map(str, end_pts))};p=" + ";".join(
            f"{x},{y},{oc}" for x, y, oc in pts
        )
        out[gid] = "pts:" + hashlib.md5(canon.encode()).hexdigest()[:16]
    return out


def _glyphname_from_post(tables: dict) -> dict[int, str]:
    from font_cmap_dump import _parse_post_glyph_names

    return _parse_post_glyph_names(tables.get("post", b""))


def build_template(path: str, face: int = 0) -> dict:
    """官方字体 → {指纹: [glyphName...]}，并给出每个名字对应的真值（由 uniXXXX 推）。"""
    with open(path, "rb") as f:
        tables = unpack_font(f.read(), face_index=face)
    gid_fp = _fingerprint_by_gid(tables)
    names = _glyphname_from_post(tables)
    cmap = parse_cmap(tables)

    by_fp: dict[str, list[str]] = {}
    for gid, fp in gid_fp.items():
        by_fp.setdefault(fp, []).append(names.get(gid, f"gid{gid}"))

    # glyphName(uniXXXX) → 真值字符；供 --assign 与产物可读性使用
    name_to_char: dict[str, str] = {}
    for name in {n for ns in by_fp.values() for n in ns}:
        m = name if name.startswith("uni") else None
        if m and len(m) == 7:
            try:
                name_to_char[name] = chr(int(m[3:], 16))
            except ValueError:
                pass

    return {
        "source": path,
        "face_index": face,
        "num_glyphs": len(gid_fp),
        "fingerprints": len(by_fp),
        "by_fingerprint": by_fp,
        "name_to_char": name_to_char,
        "cmap_size": len(cmap),
    }


def apply_template(path: str, tmpl: dict, face: int = 0) -> dict:
    """目标字体 × 官方模板 → {码位: 真值}。

    唯一性口径：一个指纹在官方模板里对应多个名字时（如空格与 .notdef 同形），
    **标 ambiguous 并跳过**，不猜 —— 猜错的话输出仍然是「看着像字的字」，最危险。
    """
    with open(path, "rb") as f:
        tables = unpack_font(f.read(), face_index=face)
    gid_fp = _fingerprint_by_gid(tables)
    cmap = parse_cmap(tables)          # {codepoint: glyphName(目标字体自报的名字)}
    name_to_char = tmpl.get("name_to_char", {})
    by_fp = tmpl["by_fingerprint"]

    resolved: dict[int, str] = {}
    ambiguous: list[dict] = []
    unmapped: list[dict] = []
    unknown_fp: list[dict] = []

    # glyphName → gid（目标字体里名字是自报的，**不可信**，只用于回链）
    for cp, self_name in sorted(cmap.items()):
        gid = None
        m = self_name[3:] if self_name.startswith("gid") else None
        if m is not None:
            gid = int(m)
        else:
            gid = next((g for g, fp in gid_fp.items() if fp and
                        _glyphname_from_post(tables).get(g) == self_name), None)
        if gid is None or gid not in gid_fp:
            unmapped.append({"codepoint": f"0x{cp:04x}", "self_name": self_name})
            continue
        fp = gid_fp[gid]
        cands = by_fp.get(fp)
        if not cands:
            unknown_fp.append({"codepoint": f"0x{cp:04x}", "self_name": self_name,
                               "fingerprint": fp})
            continue
        # 同名去重后若仍多于一个真值 → 歧义
        chars = sorted({name_to_char[c] for c in cands if c in name_to_char})
        if len(chars) == 1:
            resolved[cp] = chars[0]
        elif len(chars) == 0:
            unmapped.append({"codepoint": f"0x{cp:04x}", "self_name": self_name,
                             "reason": "模板里该指纹的 glyphName 不是 uniXXXX 形式，无法推出真值"})
        else:
            ambiguous.append({"codepoint": f"0x{cp:04x}", "self_name": self_name,
                              "candidates": chars})

    return {
        "target": path,
        "template": tmpl["source"],
        "resolved": len(resolved),
        "ambiguous": len(ambiguous),
        "unknown_fingerprint": len(unknown_fp),
        "unmapped": len(unmapped),
        "by_codepoint": {f"0x{cp:04x}": ch for cp, ch in sorted(resolved.items())},
        "detail": {"ambiguous": ambiguous[:20], "unknown_fingerprint": unknown_fp[:20],
                   "unmapped": unmapped[:20]},
    }


def rebuild_with_assignment(official_path: str, assign: dict[str, str],
                            out_path: str, face: int = 0,
                            keep_cps: list[int] | None = None) -> dict:
    """自检用：按 `官方名=目标名` 重挂字形，产出一份「改造字体」。

    实现方式是把 glyph 数据整体按名字重排后重建 sfnt。
    本函数只为 selftest 合成样本服务，不用于真实站点（真实站点字体由服务端生成）。
    """
    with open(official_path, "rb") as f:
        tables = unpack_font(f.read(), face_index=face)
    offs, glyf = _glyph_offsets(tables)
    names = _glyphname_from_post(tables)
    cmap = parse_cmap(tables)
    name_of_gid = {g: names.get(g, f"gid{g}") for g in range(len(offs) - 1)}
    gid_of_name: dict[str, int] = {}
    for g, n in name_of_gid.items():
        gid_of_name.setdefault(n, g)

    # 新 gid 顺序 = 原 gid 顺序；把「目标名」对应 gid 的轮廓换成「官方名」对应 gid 的轮廓
    glyph_blobs = []
    for g in range(len(offs) - 1):
        src_g = g
        for off_name, tgt_name in assign.items():
            if name_of_gid.get(g) == tgt_name:
                src_g = gid_of_name[off_name]
                break
        glyph_blobs.append(glyf[offs[src_g]:offs[src_g + 1]])

    new_glyf = b""
    new_offs = [0]
    for blob in glyph_blobs:
        new_glyf += blob
        if len(new_glyf) % 2:
            new_glyf += b"\x00"
        new_offs.append(len(new_glyf))
    loca = b"".join(struct.pack(">I", o) for o in new_offs)
    head = bytearray(54)
    struct.pack_into(">h", head, 50, 1)
    maxp = bytearray(6)
    struct.pack_into(">H", maxp, 4, len(glyph_blobs))

    # cmap 保持原样（这正是该族的核心特征：cmap 完全没动）
    # 注意 parse_cmap 返回的是 {码位: glyphName}，要经 name->gid 换成 gid 才能重建 cmap
    pairs = [(cp, gid_of_name[n]) for cp, n in cmap.items() if n in gid_of_name]
    if keep_cps is not None:
        # 真实站点的加密字体只为"页面真正要显示的那几个码位"建 cmap，
        # 官方原字的码位通常**不在**表内 —— 自检必须复现这一点，否则测不出漏字。
        pairs = [(cp, g) for cp, g in pairs if cp in set(keep_cps)]
    if not pairs:
        raise FontFormatError("重建失败：官方字体 cmap 与 post 名对不上，无法复用 cmap")
    cmap_table = struct.pack(">HHHHI", 0, 1, 3, 1, 12) + _build_cmap_format4(pairs)

    sfnt_tables = {"head": bytes(head), "loca": loca, "maxp": bytes(maxp),
                   "glyf": new_glyf, "cmap": cmap_table}
    # post 表必须一起搬：gid 顺序未变，名字仍对齐；丢了 post 就退化成 gidN，
    # 而 gidN/simple-glyph 退化态**更容易悄悄错配**（新字体的 gid 分配由服务端决定）。
    if tables.get("post"):
        sfnt_tables["post"] = tables["post"]
    sfnt = _build_sfnt(sfnt_tables)
    with open(out_path, "wb") as f:
        f.write(sfnt)
    return {"out": out_path, "glyphs": len(glyph_blobs), "bytes": len(sfnt),
            "cmap_pairs": len(pairs)}


# --------------------------------------------------------------------------
# 子命令
# --------------------------------------------------------------------------


def cmd_template(args: argparse.Namespace) -> int:
    payload = build_template(args.font, args.face)
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"[ok] 模板 {payload['num_glyphs']} 字形 / {payload['fingerprints']} 唯一轮廓 "
              f"/ {len(payload['name_to_char'])} 个 uniXXXX 真值 -> {args.output}", file=sys.stderr)
    else:
        print(text)
    return 0


def cmd_apply(args: argparse.Namespace) -> int:
    with open(args.template, encoding="utf-8") as f:
        tmpl = json.load(f)
    payload = apply_template(args.font, tmpl, args.face)
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"[ok] 还原 {payload['resolved']} 个码位（歧义 {payload['ambiguous']} / "
              f"未知指纹 {payload['unknown_fingerprint']}）-> {args.output}", file=sys.stderr)
    else:
        print(text)
    return 0 if payload["resolved"] else 1


def cmd_rebuild(args: argparse.Namespace) -> int:
    assign = {}
    for item in args.assign or []:
        if "=" not in item:
            raise FontFormatError(f"--assign 需形如 官方名=目标名，收到 {item!r}")
        a, b = item.split("=", 1)
        assign[a] = b
    if not assign:
        raise FontFormatError("--rebuild 至少需要一个 --assign")
    keep = None
    if args.keep_cps:
        keep = [int(x, 16) for x in args.keep_cps.replace("0x", "").split(",") if x.strip()]
    print(json.dumps(
        rebuild_with_assignment(args.font, assign, args.output, args.face, keep),
        ensure_ascii=False))
    return 0


# --------------------------------------------------------------------------
# 自检
# --------------------------------------------------------------------------


def cmd_selftest(args: argparse.Namespace) -> int:
    """合成「官方字体」与「改造字体」，验证真值能被完整反推。

    官方字体：uni4E89 → 争的轮廓（方形）；uni6408 → 搈的轮廓（三角形）；
              uni5B57 → 字的轮廓（五边形）。cmap 把它们挂到各自码位。
    改造字体：**cmap 一字不动**，只把 uni6408 的 glyf 换成 uni4E89 的轮廓。
              正确的还原结果应是 `0x6408 -> 争`（而 cmap 自报 uni6408=搈）。
    """
    import tempfile

    tmpdir = tempfile.mkdtemp(prefix="font_tpl_")
    officialp = os.path.join(tmpdir, "official.ttf")
    tamperedp = os.path.join(tmpdir, "tampered.ttf")

    glyphs = {
        ".notdef": [(0, 0), (10, 0), (10, 10)],          # gid0 必须是 .notdef
        "uni4E89": [(0, 0), (100, 0), (100, 200), (0, 200)],
        "uni6408": [(0, 0), (50, 100), (100, 0)],
        "uni5B57": [(0, 0), (100, 0), (100, 100), (50, 150), (0, 100)],
    }
    names = list(glyphs)
    glyf = b""
    offs = [0]
    for n in names:
        glyf += _simple_glyph(glyphs[n])
        if len(glyf) % 2:
            glyf += b"\x00"
        offs.append(len(glyf))
    loca = b"".join(struct.pack(">I", o) for o in offs)
    head = bytearray(54)
    struct.pack_into(">h", head, 50, 1)
    maxp = bytearray(6)
    struct.pack_into(">H", maxp, 4, len(names))
    # post 2.0，自定义名区带 uni4E89 / uni6408 / uni5B57
    pascal = b"".join(bytes([len(n)]) + n.encode() for n in names)
    post = (struct.pack(">IIhhIIIII", 0x00020000, 0, 0, 0, 0, 0, 0, 0, 0)
            + struct.pack(">H", len(names))
            + b"".join(struct.pack(">H", 258 + i) for i in range(len(names)))
            + pascal)
    cps = {"uni4E89": 0x4E89, "uni6408": 0x6408, "uni5B57": 0x5B57}
    # 注意 gid0 是 .notdef，不进 cmap（cmap 里 gid==0 的项按规范视为"无字形"）
    pairs = [(cps[n], i) for i, n in enumerate(names) if n in cps]
    cmap_table = struct.pack(">HHHHI", 0, 1, 3, 1, 12) + _build_cmap_format4(pairs)
    tables = {"glyf": glyf, "loca": loca, "head": bytes(head), "maxp": bytes(maxp),
              "post": post, "cmap": cmap_table}
    with open(officialp, "wb") as f:
        f.write(_build_sfnt(tables))

    # 改造：cmap 一字不动，uni6408 借 uni4E89 的轮廓。
    # 且 cmap 里只保留页面真正显示的 0x6408 / 0x5B57 —— 官方原字码位 0x4E89 不在表内。
    rebuild_with_assignment(officialp, {"uni4E89": "uni6408"}, tamperedp,
                            keep_cps=[0x6408, 0x5B57])

    checks = 0
    tmpl = build_template(officialp)
    assert tmpl["source"].endswith("official.ttf")
    assert tmpl["num_glyphs"] == 4, tmpl["num_glyphs"]
    checks += 2

    # 先自证「只看 cmap 会得到错误结论」
    self_name = parse_cmap(unpack_font(open(tamperedp, "rb").read()))[0x6408]
    assert self_name == "uni6408", f"合成失败：目标字体 cmap 应仍自报 uni6408，实得 {self_name}"
    assert tmpl["name_to_char"]["uni6408"] == "搈", tmpl["name_to_char"].get("uni6408")
    checks += 2

    res = apply_template(tamperedp, tmpl)
    # 核心断言：cmap 自报 uni6408（=搈），但轮廓是 uni4E89 的 → 真值必须是 争
    got = res["by_codepoint"].get("0x6408")
    assert got == "争", f"应还原为 争（uni4E89 的轮廓），实得 {got!r}；full={res}"
    assert tmpl["name_to_char"]["uni6408"] == "搈", "模板里 uni6408 本身应解出搈"
    assert "0x4e89" not in res["by_codepoint"], "不得还原 cmap 里不存在的码位"
    assert res["resolved"] == 2, f"应为 2（0x6408 借形 + 0x5B57 本形），实得 {res['resolved']}"
    assert res["by_codepoint"].get("0x5b57") == "字"
    checks += 5

    # 反向：未改造时 0x6408 必须仍解析成 搈（否则说明算法在瞎认）
    res_ok = apply_template(officialp, tmpl)
    assert res_ok["by_codepoint"].get("0x6408") == "搈", res_ok["by_codepoint"]
    assert res_ok["by_codepoint"].get("0x4e89") == "争", res_ok["by_codepoint"]
    checks += 2

    # 歧义路径：造一个「官方里两名字同形」的模板，必须走 ambiguous 而不是猜
    tmpl2 = dict(tmpl)
    tmpl2["by_fingerprint"] = {k: list(v) for k, v in tmpl["by_fingerprint"].items()}
    # 让"被借过来的那个轮廓"在模板里对应两个不同的字 —— 真站点里这确实会出现
    # （例如 一 / ー 在部分中文字体里同形）。
    fp_sq = next(k for k, v in tmpl2["by_fingerprint"].items() if "uni4E89" in v)
    tmpl2["by_fingerprint"][fp_sq] = ["uni4E89", "uni5B57"]  # 人为制造同形两名
    tmpl2["name_to_char"] = dict(tmpl["name_to_char"])
    res2 = apply_template(tamperedp, tmpl2)
    assert res2["ambiguous"] >= 1, res2["detail"]["ambiguous"]
    assert "0x6408" not in res2["by_codepoint"], "歧义项不得被猜进结果"
    assert res2["detail"]["ambiguous"][0]["candidates"] == ["争", "字"], res2["detail"]
    checks += 3

    # 未知指纹路径：删掉指纹库，全部应进 unknown_fingerprint
    tmpl3 = dict(tmpl)
    tmpl3["by_fingerprint"] = {}
    res3 = apply_template(tamperedp, tmpl3)
    assert res3["resolved"] == 0 and res3["unknown_fingerprint"] >= 1, res3
    checks += 2

    for p in (officialp, tamperedp):
        try:
            os.remove(p)
        except OSError:
            pass
    try:
        os.rmdir(tmpdir)
    except OSError:
        pass

    print(f"[selftest] PASS  {checks} 项断言通过（模板建库 / 借形反推 / cmap 不可信自证 / "
          f"歧义不猜 / 未知指纹）")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="同源字体换表比对：用官方字体图元反推加密字体（零依赖）")
    ap.add_argument("--selftest", action="store_true")
    sub = ap.add_subparsers(dest="cmd")

    p = sub.add_parser("template", help="官方字体 → 轮廓指纹模板库")
    p.add_argument("font")
    p.add_argument("-o", "--output")
    p.add_argument("--face", type=int, default=0)
    p.set_defaults(func=cmd_template)

    p = sub.add_parser("apply", help="目标字体 × 模板 → {码位: 真值}")
    p.add_argument("font")
    p.add_argument("--template", required=True)
    p.add_argument("-o", "--output")
    p.add_argument("--face", type=int, default=0)
    p.set_defaults(func=cmd_apply)

    p = sub.add_parser("rebuild", help="（自检用）按 官方名=目标名 重挂字形合成字体")
    p.add_argument("font")
    p.add_argument("-o", "--output", required=True)
    p.add_argument("--assign", action="append")
    p.add_argument("--keep-cps", help="只保留这些十六进制码位（逗号分隔），模拟真实站点")
    p.add_argument("--face", type=int, default=0)
    p.set_defaults(func=cmd_rebuild)

    args = ap.parse_args(argv)
    if args.selftest:
        return cmd_selftest(args)
    if not getattr(args, "func", None):
        ap.print_help()
        return 2
    try:
        return args.func(args)
    except FontFormatError as e:
        print(f"FONT FAIL: {e}", file=sys.stderr)
        return 1
    except OSError as e:
        print(f"IO FAIL: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())