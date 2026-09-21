#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""font_glyph_fingerprint.py —— 字形轮廓指纹：让字体轮换后映射表自动跟着走。

解决什么问题：
    很多站点的字体每次刷新都重排 cmap（码位变），甚至重排 gid。
    但「同一个数字」的字形轮廓是**同一份数据**。
    于是：用轮廓指纹当锚点，把 A 版字体与 B 版字体对齐，
    得到 code_B -> code_A 的对照表 —— 只需人工校准一次 A 版，之后全自动。

能力：
    fingerprint <font> [-o out.json]   导出 {fingerprint: [gid...]} + {gid: fingerprint}
    crosswalk <a.json> <b.json>        按指纹对齐两版字体，输出 code_b -> code_a
    --selftest                         自造 head/maxp/loca/glyf 往返校验

用法：
    python font_glyph_fingerprint.py fingerprint run1.ttf -o fp1.json
    python font_glyph_fingerprint.py fingerprint run2.ttf -o fp2.json
    python font_glyph_fingerprint.py crosswalk fp1.json fp2.json
    python font_glyph_fingerprint.py --selftest
"""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
import sys

from font_cmap_dump import FontFormatError, parse_cmap, unpack_font

ON_CURVE, X_SHORT, Y_SHORT, REPEAT, X_SAME, Y_SAME = 1, 2, 4, 8, 0x10, 0x20


def _u16(b: bytes, o: int) -> int:
    return struct.unpack_from(">H", b, o)[0]


def _i16(b: bytes, o: int) -> int:
    return struct.unpack_from(">h", b, o)[0]


def _u32(b: bytes, o: int) -> int:
    return struct.unpack_from(">I", b, o)[0]


def _glyph_offsets(tables: dict[str, bytes]) -> tuple[list[int], int]:
    """返回 (loca 偏移表, glyf 数据)。偏移是相对 glyf 起点的字节位置。"""
    head, loca, maxp = tables.get("head"), tables.get("loca"), tables.get("maxp")
    if head is None or loca is None or maxp is None:
        raise FontFormatError("缺少 head/loca/maxp，无法定位字形数据")
    num_glyphs = _u16(maxp, 4)
    long_format = _i16(head, 50)  # head.indexToLocFormat
    offs = []
    for i in range(num_glyphs + 1):
        if long_format:
            offs.append(_u32(loca, i * 4))
        else:
            offs.append(_u16(loca, i * 2) * 2)
    return offs, tables.get("glyf", b"")


def _parse_simple_glyph(data: bytes) -> tuple[int, list[int], list[tuple[int, int, int]]] | None:
    """返回 (numContours, endPts, [(x, y, on_curve)])；复合字形返回 None。"""
    if len(data) < 10:
        return None
    n = _i16(data, 0)
    if n < 0:
        return None  # 复合字形：不做点级归一，交给 raw 指纹
    end_pts = [_u16(data, 10 + i * 2) for i in range(n)]
    p = 10 + n * 2
    n_points = (end_pts[-1] + 1) if end_pts else 0
    if n_points == 0:
        return 0, [], []
    ins_len = _u16(data, p)
    p += 2 + ins_len
    flags: list[int] = []
    while len(flags) < n_points:
        if p >= len(data):
            return None
        f = data[p]
        p += 1
        flags.append(f)
        if f & REPEAT:
            if p >= len(data):
                return None
            rep = data[p]
            p += 1
            flags.extend([f] * rep)
    flags = flags[:n_points]

    xs: list[int] = []
    x = 0
    for f in flags:
        if f & X_SHORT:
            if p >= len(data):
                return None
            dx = data[p]
            p += 1
            x += dx if (f & X_SAME) else -dx
        elif not (f & X_SAME):
            x += _i16(data, p)
            p += 2
        xs.append(x)
    ys: list[int] = []
    y = 0
    for f in flags:
        if f & Y_SHORT:
            if p >= len(data):
                return None
            dy = data[p]
            p += 1
            y += dy if (f & Y_SAME) else -dy
        elif not (f & Y_SAME):
            y += _i16(data, p)
            p += 2
        ys.append(y)
    pts = [(xs[i], ys[i], 1 if flags[i] & ON_CURVE else 0) for i in range(n_points)]
    return n, end_pts, pts


def fingerprint_font(path: str, face: int = 0) -> dict:
    with open(path, "rb") as f:
        raw = f.read()
    tables = unpack_font(raw, face_index=face)
    offs, glyf = _glyph_offsets(tables)
    cmap = parse_cmap(tables)

    by_fp: dict[str, list[int]] = {}
    gid_fp: dict[int, str] = {}
    for gid in range(len(offs) - 1):
        start, end = offs[gid], offs[gid + 1]
        if start >= end:
            gid_fp[gid] = "empty"
            by_fp.setdefault("empty", []).append(gid)
            continue
        blob = glyf[start:end]
        parsed = _parse_simple_glyph(blob)
        if parsed is None:
            # 复合字形：退化为整段字节的 hash
            fp = "raw:" + hashlib.md5(blob).hexdigest()[:16]
        else:
            n, end_pts, pts = parsed
            canon = f"n={n};e={','.join(map(str, end_pts))};p=" + ";".join(
                f"{x},{y},{oc}" for x, y, oc in pts
            )
            fp = "pts:" + hashlib.md5(canon.encode()).hexdigest()[:16]
        gid_fp[gid] = fp
        by_fp.setdefault(fp, []).append(gid)

    return {
        "source": path,
        "face_index": face,
        "num_glyphs": len(offs) - 1,
        "fingerprints": len(by_fp),
        "by_fingerprint": by_fp,
        "gid_to_fp": {str(k): v for k, v in gid_fp.items()},
        "cmap": {f"0x{cp:04x}": gid for cp, gid in sorted(cmap.items())},
    }


def cmd_fingerprint(args: argparse.Namespace) -> int:
    payload = fingerprint_font(args.font, args.face)
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text)
        print(
            f"[ok] {payload['num_glyphs']} 字形 / {payload['fingerprints']} 个唯一轮廓 -> {args.output}",
            file=sys.stderr,
        )
    else:
        print(text)
    return 0


def cmd_crosswalk(args: argparse.Namespace) -> int:
    with open(args.a, encoding="utf-8") as f:
        a = json.load(f)
    with open(args.b, encoding="utf-8") as f:
        b = json.load(f)

    fp_a = a["by_fingerprint"]
    fp_b = b["by_fingerprint"]
    # gid_b -> 唯一指纹 -> gid_a
    gid_to_fp_b = {int(k): v for k, v in b["gid_to_fp"].items()}
    gid_to_fp_a = {int(k): v for k, v in a["gid_to_fp"].items()}
    fp_to_gid_a: dict[str, int] = {}
    ambiguous = 0
    for fp, gids in fp_a.items():
        if len(gids) == 1:
            fp_to_gid_a[fp] = gids[0]
        else:
            ambiguous += 1

    cmap_a = {k: v for k, v in a["cmap"].items()}
    crosswalk: dict[str, str] = {}
    matched = 0
    for code_b, gid_b in b["cmap"].items():
        fp = gid_to_fp_b.get(gid_b)
        gid_a = fp_to_gid_a.get(fp) if fp else None
        if gid_a is None:
            continue
        # 反查 a 版里哪个码位用这个 gid
        for code_a, ga in cmap_a.items():
            if ga == gid_a:
                crosswalk[code_b] = code_a
                matched += 1
                break

    print(
        f"A={args.a}  B={args.b}\n"
        f"可对齐码位: {matched} / B 版共 {len(b['cmap'])} 个码位\n"
        f"轮廓不唯一（同一指纹对应多个 gid，已跳过）: {ambiguous}\n"
        "用法：把 B 版文本里的 code_b 先换成 code_a，即可直接复用 A 版人工校准表。"
    )
    for k in list(crosswalk)[:8]:
        print(f"  {k} -> {crosswalk[k]}")
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(crosswalk, f, ensure_ascii=False, indent=2)
        print(f"[ok] 对照表 -> {args.output}", file=sys.stderr)
    return 0


# --------------------------------------------------------------------------
# 自检：合成 head/maxp/loca/glyf
# --------------------------------------------------------------------------


def _simple_glyph(pts: list[tuple[int, int]]) -> bytes:
    """把一个单轮廓字形编码成 glyf 记录（全 long 坐标，便于合成）。"""
    n = len(pts)
    body = struct.pack(">hhhhh", 1, 0, 0, 0, 0)
    body += struct.pack(">H", n - 1)
    body += struct.pack(">H", 0)  # instructionLength
    body += bytes([ON_CURVE] * n)  # 每个点 on-curve、坐标用 int16
    x = 0
    for px, _ in pts:
        body += struct.pack(">h", px - x)
        x = px
    y = 0
    for _, py in pts:
        body += struct.pack(">h", py - y)
        y = py
    return body


def cmd_selftest(_: argparse.Namespace) -> int:
    glyphs = [
        _simple_glyph([(0, 0), (100, 0), (100, 200), (0, 200)]),   # gid0 方形
        _simple_glyph([(0, 0), (50, 100), (100, 0)]),              # gid1 三角
        b"",                                                       # gid2 空字形
    ]
    glyf = b""
    offs = [0]
    for g in glyphs:
        glyf += g
        if len(glyf) % 2:
            glyf += b"\x00"
        offs.append(len(glyf))
    loca = b"".join(struct.pack(">I", o) for o in offs)
    head = bytearray(54)
    struct.pack_into(">h", head, 50, 1)  # indexToLocFormat = long
    maxp = bytearray(6)
    struct.pack_into(">H", maxp, 4, 3)  # numGlyphs

    tables = {"head": bytes(head), "loca": loca, "maxp": bytes(maxp), "glyf": glyf}

    class _Tmp:
        pass

    tmp = _Tmp()
    # 直接调用内部函数，避免落盘
    o, g = _glyph_offsets(tables)
    assert o == offs, f"loca 解析不一致 {o} != {offs}"
    parsed = _parse_simple_glyph(g[o[0] : o[1]])
    assert parsed is not None
    n, end_pts, pts = parsed
    assert n == 1 and end_pts == [3], (n, end_pts)
    assert pts == [(0, 0, 1), (100, 0, 1), (100, 200, 1), (0, 200, 1)], pts

    # 两个「同形不同 gid」的字体应当产生相同指纹；不同轮廓不应同指纹
    canon1 = f"n=1;e=3;p=" + ";".join(f"{x},{y},{oc}" for x, y, oc in pts)
    f1 = hashlib.md5(canon1.encode()).hexdigest()
    parsed2 = _parse_simple_glyph(g[o[1] : o[2]])
    n2, e2, pts2 = parsed2
    canon2 = f"n={n2};e={','.join(map(str, e2))};p=" + ";".join(
        f"{x},{y},{oc}" for x, y, oc in pts2
    )
    f2 = hashlib.md5(canon2.encode()).hexdigest()
    assert f1 != f2, "不同轮廓不应同指纹"
    # 空字形：loca 里 start == end，主流程直接标 "empty"，不会进点解析
    assert offs[2] == offs[3], "空字形 loca 应等长"
    assert _parse_simple_glyph(g[offs[2] : offs[3]]) is None, "空切片应为 None"

    print("[selftest] PASS  head/maxp/loca/glyf 定位 + 简单字形点序列解析一致")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="字形轮廓指纹与跨版本字体对齐（零依赖）")
    ap.add_argument("--selftest", action="store_true")
    sub = ap.add_subparsers(dest="cmd")

    p_fp = sub.add_parser("fingerprint")
    p_fp.add_argument("font")
    p_fp.add_argument("-o", "--output")
    p_fp.add_argument("--face", type=int, default=0)
    p_fp.set_defaults(func=cmd_fingerprint)

    p_cw = sub.add_parser("crosswalk")
    p_cw.add_argument("a")
    p_cw.add_argument("b")
    p_cw.add_argument("-o", "--output")
    p_cw.set_defaults(func=cmd_crosswalk)

    args = ap.parse_args(argv)
    if args.selftest:
        return cmd_selftest(args)
    if not getattr(args, "cmd", None):
        ap.print_help()
        return 2
    try:
        return args.func(args)
    except FontFormatError as exc:
        print(f"[fail] {exc}", file=sys.stderr)
        return 1
    except OSError as exc:
        # 文件不存在/无权限：给一行可读的失败信息，不要甩裸 traceback
        print(f"IO FAIL: {exc}", file=sys.stderr)
        return 1
    except (KeyError, ValueError, json.JSONDecodeError) as exc:
        # 传进来的 JSON 不是本工具产出的格式
        print(f"INPUT FAIL: {exc}（期望 font_cmap_dump.py dump 产出的 JSON）", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
