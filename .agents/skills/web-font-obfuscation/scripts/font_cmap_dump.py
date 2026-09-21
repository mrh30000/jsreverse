#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""font_cmap_dump.py —— 字体反爬 cmap 映射离线导出/比对工具（零第三方依赖）。

为什么不用 fontTools：
    补环境/反爬场景常在干净容器里跑，`pip install fontTools` 不一定能装。
    本脚本只用标准库解析 sfnt(TTF/OTF) 与 WOFF1 的 cmap 表，覆盖字体反爬 95% 的样本。

能力：
    1. `dump`     导出 {codepoint: glyphName} 与反向表，落 JSON（默认 stdout）。
    2. `--text`   直接把 HTML/文本里的 `&#x9fa4;`、`0x9fa4`、`\\u9fa4` 替换成映射结果。
    3. `diff`     比对两次抓取（页面刷新前后）的映射，判定「哪一层是稳定的」。
    4. `--selftest` 自造一份最小 sfnt + cmap(format4) 往返校验解析器，不依赖任何外部样本。

用法：
    python font_cmap_dump.py dump font.ttf -o font.json
    python font_cmap_dump.py dump font.woff --json
    python font_cmap_dump.py diff a.json b.json
    python font_cmap_dump.py text font.json page.html
    python font_cmap_dump.py --selftest
"""

from __future__ import annotations

import argparse
import json
import struct
import sys
import zlib

# --------------------------------------------------------------------------
# 二进制读取助手
# --------------------------------------------------------------------------


def _u16(buf: bytes, off: int) -> int:
    return struct.unpack_from(">H", buf, off)[0]


def _i16(buf: bytes, off: int) -> int:
    return struct.unpack_from(">h", buf, off)[0]


def _u32(buf: bytes, off: int) -> int:
    return struct.unpack_from(">I", buf, off)[0]


class FontFormatError(Exception):
    """字体容器无法识别或结构损坏。"""


# --------------------------------------------------------------------------
# 容器解包：sfnt / woff1 -> {tag: 表数据}
# --------------------------------------------------------------------------

WOFF_SIGNATURE = 0x774F4646  # 'wOFF'
TTC_SIGNATURE = 0x74746366  # 'ttcf'
SFNT_SIGNATURES = {0x00010000, 0x4F54544F, 0x74727565}  # 1.0 / 'OTTO' / 'true'


def unpack_font(data: bytes, face_index: int = 0) -> dict[str, bytes]:
    """返回 {table_tag: table_bytes}。支持 sfnt、WOFF1 与 TTC（取第 face_index 个字面）。"""
    if len(data) < 12:
        raise FontFormatError("文件过短，不是字体容器")
    sig = _u32(data, 0)
    if sig in SFNT_SIGNATURES:
        return _unpack_sfnt(data)
    if sig == WOFF_SIGNATURE:
        return _unpack_woff1(data)
    if sig == TTC_SIGNATURE:
        n_faces = _u32(data, 8)
        if face_index >= n_faces:
            raise FontFormatError(f"TTC 只有 {n_faces} 个字面，face_index={face_index} 越界")
        off = _u32(data, 12 + face_index * 4)
        # TTC 的表偏移相对整个文件起点，不是相对该字面的 sfnt 头
        return _unpack_sfnt(data, base=off)
    raise FontFormatError(
        f"未识别的字体签名 0x{sig:08X}；"
        "WOFF2 需要 brotli 解压，请先用 `fonttools ttLib.woff2` 或浏览器另存为 .ttf"
    )


def _unpack_sfnt(data: bytes, base: int = 0) -> dict[str, bytes]:
    num_tables = _u16(data, base + 4)
    tables: dict[str, bytes] = {}
    for i in range(num_tables):
        rec = base + 12 + i * 16
        if rec + 16 > len(data):
            raise FontFormatError("sfnt 表目录越界")
        tag = data[rec : rec + 4].decode("latin-1")
        offset = _u32(data, rec + 8)
        length = _u32(data, rec + 12)
        if offset + length > len(data):
            raise FontFormatError(f"表 {tag} 数据越界")
        tables[tag] = data[offset : offset + length]
    return tables


def _unpack_woff1(data: bytes) -> dict[str, bytes]:
    num_tables = _u16(data, 12)
    tables: dict[str, bytes] = {}
    for i in range(num_tables):
        rec = 44 + i * 20
        if rec + 20 > len(data):
            raise FontFormatError("woff 表目录越界")
        tag = data[rec : rec + 4].decode("latin-1")
        offset = _u32(data, rec + 4)
        comp_len = _u32(data, rec + 8)
        orig_len = _u32(data, rec + 12)
        raw = data[offset : offset + comp_len]
        if comp_len < orig_len:
            raw = zlib.decompress(raw)
        if len(raw) != orig_len:
            raise FontFormatError(f"woff 表 {tag} 解压长度不符")
        tables[tag] = raw
    return tables


# --------------------------------------------------------------------------
# cmap 解析
# --------------------------------------------------------------------------


def parse_cmap(tables: dict[str, bytes]) -> dict[int, str]:
    """返回 {codepoint: glyphName}。glyphName 优先取 post 表真名，否则用 gid 占位。"""
    if "cmap" not in tables:
        raise FontFormatError("字体缺少 cmap 表")
    cmap = tables["cmap"]
    num_sub = _u16(cmap, 2)
    best: dict[int, int] | None = None  # {codepoint: glyphId}
    for i in range(num_sub):
        rec = 4 + i * 8
        offset = _u32(cmap, rec + 4)
        sub = cmap[offset:]
        fmt = _u16(sub, 0)
        if fmt == 4:
            parsed = _parse_cmap_format4(sub)
        elif fmt == 12:
            parsed = _parse_cmap_format12(sub)
        elif fmt in (0, 6):
            parsed = _parse_cmap_format06(sub, fmt)
        else:
            continue
        if parsed and (best is None or len(parsed) > len(best)):
            best = parsed
    if best is None:
        raise FontFormatError("cmap 中没有可解析的 format 0/4/6/12 子表")

    names = _parse_post_glyph_names(tables.get("post", b""))
    out: dict[int, str] = {}
    for cp, gid in best.items():
        name = names.get(gid) if names else None
        out[cp] = name or f"gid{gid}"
    return out


def _parse_cmap_format4(sub: bytes) -> dict[int, int]:
    seg_x2 = _u16(sub, 6)
    seg = seg_x2 // 2
    if seg == 0:
        return {}
    end_off = 14
    start_off = end_off + seg_x2 + 2
    delta_off = start_off + seg_x2
    range_off = delta_off + seg_x2
    out: dict[int, int] = {}
    for i in range(seg):
        end = _u16(sub, end_off + i * 2)
        start = _u16(sub, start_off + i * 2)
        delta = _i16(sub, delta_off + i * 2)
        ro = _u16(sub, range_off + i * 2)
        if start > end or start == 0xFFFF:
            continue
        for cp in range(start, end + 1):
            if ro == 0:
                gid = (cp + delta) & 0xFFFF
            else:
                # idRangeOffset 相对自身地址定位
                idx = range_off + i * 2 + ro + (cp - start) * 2
                if idx + 2 > len(sub):
                    continue
                gid = _u16(sub, idx)
                if gid:
                    gid = (gid + delta) & 0xFFFF
            if gid:
                out[cp] = gid
    return out


def _parse_cmap_format12(sub: bytes) -> dict[int, int]:
    n_groups = _u32(sub, 12)
    out: dict[int, int] = {}
    for i in range(n_groups):
        off = 16 + i * 12
        if off + 12 > len(sub):
            break
        start = _u32(sub, off)
        end = _u32(sub, off + 4)
        gid0 = _u32(sub, off + 8)
        if end - start > 0x10FFFF:
            continue
        for cp in range(start, end + 1):
            out[cp] = gid0 + (cp - start)
    return out


def _parse_cmap_format06(sub: bytes, fmt: int) -> dict[int, int]:
    first = _u16(sub, 6) if fmt == 6 else 0
    count = _u16(sub, 8) if fmt == 6 else _u16(sub, 4)
    arr = 10 if fmt == 6 else 6
    out: dict[int, int] = {}
    for i in range(count):
        off = arr + i * 2
        if off + 2 > len(sub):
            break
        gid = _u16(sub, off)
        if gid:
            out[first + i] = gid
    return out


def _parse_post_glyph_names(post: bytes) -> dict[int, str]:
    """post 2.0 自定义字形名。返回 {glyphId: name}；非 2.0 返回 {}。"""
    if len(post) < 34 or _u32(post, 0) != 0x00020000:
        return {}
    num_glyphs = _u16(post, 32)
    idx = []
    for i in range(num_glyphs):
        off = 34 + i * 2
        if off + 2 > len(post):
            return {}
        idx.append(_u16(post, off))
    # 名称字符串区
    str_off = 34 + num_glyphs * 2
    pascal: list[bytes] = []
    p = str_off
    while p < len(post):
        n = post[p]
        pascal.append(post[p + 1 : p + 1 + n])
        p += 1 + n
    std = _MAC_GLYPH_NAMES
    out: dict[int, str] = {}
    for gid, name_index in enumerate(idx):
        if name_index >= 258:
            k = name_index - 258
            if k < len(pascal):
                out[gid] = pascal[k].decode("latin-1")
        elif name_index < len(std):
            out[gid] = std[name_index]
    return out


# post 表 258 个标准名（仅需前若干项；越界即回退 gid 占位）
_MAC_GLYPH_NAMES = [
    ".notdef", ".null", "nonmarkingreturn", "space", "exclam", "quotedbl",
    "numbersign", "dollar", "percent", "ampersand", "quotesingle", "parenleft",
    "parenright", "asterisk", "plus", "comma", "hyphen", "period", "slash",
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
    "nine", "colon", "semicolon", "less", "equal", "greater", "question", "at",
]


# --------------------------------------------------------------------------
# 子命令
# --------------------------------------------------------------------------


def cmd_dump(args: argparse.Namespace) -> int:
    with open(args.font, "rb") as f:
        data = f.read()
    tables = unpack_font(data, face_index=args.face)
    cmap = parse_cmap(tables)
    payload = {
        "source": args.font,
        "face_index": args.face,
        "tables": sorted(tables.keys()),
        "has_post_names": "post" in tables and _u32(tables["post"], 0) == 0x00020000,
        "count": len(cmap),
        "by_codepoint": {f"0x{cp:04x}": name for cp, name in sorted(cmap.items())},
        "by_glyph": {},
    }
    for cp, name in cmap.items():
        payload["by_glyph"].setdefault(name, []).append(f"0x{cp:04x}")
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"[ok] {len(cmap)} 个码位 -> {args.output}", file=sys.stderr)
    else:
        print(text)
    return 0


def cmd_diff(args: argparse.Namespace) -> int:
    with open(args.a, encoding="utf-8") as f:
        a = json.load(f)
    with open(args.b, encoding="utf-8") as f:
        b = json.load(f)
    ca = a["by_codepoint"]
    cb = b["by_codepoint"]
    shared = sorted(set(ca) & set(cb))
    code_changed = [k for k in shared if ca[k] != cb[k]]
    # 反向：glyphName 稳定的码位
    glyph_stable = [k for k in shared if ca[k] == cb[k]]
    print(f"A={args.a} ({len(ca)} 项)  B={args.b} ({len(cb)} 项)  交集={len(shared)}")
    print(f"code->glyphName 稳定: {len(glyph_stable)}")
    print(f"code->glyphName 变化: {len(code_changed)}")
    for k in code_changed[:10]:
        print(f"  {k}: {ca[k]} -> {cb[k]}")
    print(
        "\n判读：若「code->glyphName 变化」占比高、而 by_glyph 侧同名字形集合不变，"
        "说明 code 层随机、glyphName 层稳定 —— 必须按 glyphName 建映射表。"
    )
    return 0


def cmd_text(args: argparse.Namespace) -> int:
    with open(args.mapping, encoding="utf-8") as f:
        mapping = json.load(f)["by_codepoint"]
    with open(args.html, encoding="utf-8") as f:
        content = f.read()
    replaced = 0
    for code, name in mapping.items():
        cp = int(code, 16)
        # 该字形名如果是纯数字（人工校准表已把它映射成真值），直接替换
        for form in (f"&#x{cp:04x};", f"&#X{cp:04X};", f"&#{cp};", code, f"\\u{cp:04x}"):
            if form in content:
                content = content.replace(form, name)
                replaced += 1
    out = args.output or (args.html + ".decoded.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[ok] 命中 {replaced} 种写法 -> {out}")
    return 0


# --------------------------------------------------------------------------
# 自检：合成最小 sfnt + cmap(format 4) 往返
# --------------------------------------------------------------------------


def _build_cmap_format4(pairs: list[tuple[int, int]]) -> bytes:
    """pairs: [(codepoint, glyphId)]，每项独立成段，便于自检。"""
    pairs = sorted(pairs)
    seg = len(pairs) + 1  # +1 收尾段 0xFFFF
    ends = [cp for cp, _ in pairs] + [0xFFFF]
    starts = [cp for cp, _ in pairs] + [0xFFFF]
    deltas = [((gid - cp) & 0xFFFF) for cp, gid in pairs] + [1]
    ranges = [0] * seg
    sub = struct.pack(">HHHHHHH", 4, 0, 0, seg * 2, 0, 0, 0)
    sub += b"".join(struct.pack(">H", e) for e in ends)
    sub += struct.pack(">H", 0)
    sub += b"".join(struct.pack(">H", s) for s in starts)
    sub += b"".join(struct.pack(">H", d) for d in deltas)
    sub += b"".join(struct.pack(">H", r) for r in ranges)
    sub = sub[:2] + struct.pack(">H", len(sub)) + sub[4:]
    return sub


def _build_sfnt(tables: dict[str, bytes], abs_base: int = 0) -> bytes:
    """abs_base: TTC 中表记录偏移是相对整个文件的绝对偏移，合成时需把基准加回去。"""
    tags = sorted(tables)
    n = len(tags)
    header = struct.pack(">IHHHH", 0x00010000, n, 0, 0, 0)
    offset = abs_base + 12 + n * 16
    records, blobs = b"", b""
    for tag in tags:
        body = tables[tag]
        records += struct.pack(">4sIII", tag.encode("latin-1"), 0, offset, len(body))
        blobs += body
        pad = (-len(body)) % 4
        blobs += b"\x00" * pad
        offset += len(body) + pad
    return header + records + blobs


def cmd_selftest(_: argparse.Namespace) -> int:
    pairs = [(0xE602, 1), (0xE603, 2), (0x9FA4, 10), (0x9FA5, 11)]
    cmap_table = struct.pack(">HHHHI", 0, 1, 3, 1, 12) + _build_cmap_format4(pairs)
    sfnt = _build_sfnt({"cmap": cmap_table})
    tables = unpack_font(sfnt)
    assert "cmap" in tables, "sfnt 解包失败"
    got = parse_cmap(tables)
    want = {cp: f"gid{gid}" for cp, gid in pairs}
    assert got == want, f"format4 往返不一致: {got} != {want}"

    # WOFF1 往返：单表、zlib 压缩
    # 头固定 44 字节：signature flavor length numTables reserved totalSfntSize
    #                majorVer minorVer metaOffset metaLength metaOrigLength privOffset privLength
    raw = cmap_table
    comp = zlib.compress(raw)
    dir_off = 44
    data_off = dir_off + 20
    header = struct.pack(
        ">4sIIHHIHHIIIII",
        b"wOFF", 0x00010000, data_off + len(comp), 1, 0, len(raw),
        1, 0, 0, 0, 0, 0, 0,
    )
    assert len(header) == 44, len(header)
    woff = header + struct.pack(">4sIIII", b"cmap", data_off, len(comp), len(raw), 0) + comp
    got_w = parse_cmap(unpack_font(woff))
    assert got_w == want, f"woff 往返不一致: {got_w} != {want}"

    # format12 往返
    f12 = struct.pack(">HHIII", 12, 0, 0, 0, 1) + struct.pack(">III", 0x1F600, 0x1F602, 30)
    f12 = f12[:2] + struct.pack(">I", len(f12)) + f12[6:]
    got_12 = parse_cmap({"cmap": struct.pack(">HHHHI", 0, 1, 3, 10, 12) + f12})
    assert got_12 == {0x1F600: "gid30", 0x1F601: "gid31", 0x1F602: "gid32"}, got_12

    # TTC 往返：两个字面，表偏移按规范写成「相对整个 TTC 文件」的绝对偏移
    ttcf_len = 12 + 8  # tag+version+numFonts + 2 个 offset
    sfnt_a = _build_sfnt({"cmap": cmap_table}, abs_base=ttcf_len)
    base_b = ttcf_len + len(sfnt_a)
    cmap_b = struct.pack(">HHHHI", 0, 1, 3, 1, 12) + _build_cmap_format4([(0x9476, 10)])
    sfnt_b = _build_sfnt({"cmap": cmap_b}, abs_base=base_b)
    ttcf = struct.pack(">4sII", b"ttcf", 0x00010000, 2) + struct.pack(">II", ttcf_len, base_b)
    ttc = ttcf + sfnt_a + sfnt_b
    assert parse_cmap(unpack_font(ttc, 0)) == want, "ttc face0 不一致"
    assert parse_cmap(unpack_font(ttc, 1)) == {0x9476: "gid10"}, "ttc face1 不一致"

    print("[selftest] PASS  sfnt/format4 + woff1/zlib + format12 + ttc 四路往返一致")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="字体反爬 cmap 映射导出/比对（零依赖）")
    ap.add_argument("--selftest", action="store_true", help="自检解析器")
    sub = ap.add_subparsers(dest="cmd")

    p_dump = sub.add_parser("dump", help="导出 cmap 映射 JSON")
    p_dump.add_argument("font")
    p_dump.add_argument("-o", "--output")
    p_dump.add_argument("--face", type=int, default=0, help="TTC 字面索引（默认 0）")
    p_dump.add_argument("--json", action="store_true", help="（默认即 JSON，保留兼容）")
    p_dump.set_defaults(func=cmd_dump)

    p_diff = sub.add_parser("diff", help="比对两次抓取的映射稳定性")
    p_diff.add_argument("a")
    p_diff.add_argument("b")
    p_diff.set_defaults(func=cmd_diff)

    p_text = sub.add_parser("text", help="用映射替换文本中的码位写法")
    p_text.add_argument("mapping")
    p_text.add_argument("html")
    p_text.add_argument("-o", "--output")
    p_text.set_defaults(func=cmd_text)

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
