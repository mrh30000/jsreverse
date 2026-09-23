#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ASAR 归档解析 / 偏移体检 / 偏移修复（零依赖）。

用途
----
Electron 桌面包的业务代码几乎都在 ``app.asar`` 里。asar 是「头 + JSON 目录 + 数据段」
的三段结构，每个文件的 ``offset`` 都是**相对数据段起点**的：

    [0:4)   u32le = 4                （未使用，固定 4）
    [4:8)   u32le = header_size      （= align4(4 + json_len)）
    [8:12)  u32le = json_len
    [12:12+json_len)  JSON 目录
    [8+header_size : ...)  数据段（各文件内容按 offset 排列）

只要 ``header_size`` 或数据段起始位置错一点点，解包出来的**每个文件头部都会多/少一段垃圾**
（`asar extract` 仍然"成功"，因为目录能读；只有打不开内容时才暴露）。
本脚本的作用就是把这个偏移量**量出来**并修回去，而不是靠肉眼看 hex 猜。

子命令
------
* ``identify``  判定一个文件是不是 asar（结构自洽性），给 header_size / data_start / 文件数。
* ``check``     逐文件做「按扩展名的内容合理性」检查，反推单一偏移差 ``delta``。
* ``fix``       按 delta 重排归档（只动包头长度，不改 JSON 里任何 offset）。
* ``strip-prefix``  去掉归档前面的 N 字节前缀（真实样本：前面多了 25 字节）。

判据与边界
----------
* ``delta`` 只在**所有被抽样文件同时命中**同一偏移时才敢用；命中数不足一律报
  ``inconsistent`` 并以退出码 4 收尾 —— 不做"猜一个最近的"。
* 修复只改 ``[4:8)`` 的长度字段与包头长度，**JSON 内的 ``offset`` 一律不动**，
  因此产物可用标准 ``asar`` 工具继续处理。
* 若 JSON 里带 ``integrity``（Electron asar 完整性校验），修完**仍然**会被应用拒绝加载，
  必须先处理 fuse ``EnableEmbeddedAsarIntegrityValidation``（见
  ``references/electron-asar-and-fuses.md``）。本脚本只报警、不代劳。
"""

from __future__ import annotations

import argparse
import json
import os
import struct
import sys

EXIT_OK = 0
EXIT_UNKNOWN = 3
EXIT_INCONSISTENT = 4
EXIT_USAGE = 2

SIG_NORMAL = 0
SIG_PREFIX = 1
SIG_GAP = 2

TEXT_EXT = {
    ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".json", ".json5", ".html", ".htm",
    ".css", ".scss", ".less", ".txt", ".md", ".map", ".yml", ".yaml", ".xml", ".svg",
    ".license", ".node.json",
}
BIN_SIGS = {
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".gif": (b"GIF8",),
    ".webp": (b"RIFF",),
    ".ico": (b"\x00\x00\x01\x00",),
    ".exe": (b"MZ",),
    ".dll": (b"MZ",),
    ".node": (b"\x7fELF", b"MZ", b"\xcf\xfa\xed\xfe"),
    ".so": (b"\x7fELF",),
    ".dylib": (b"\xcf\xfa\xed\xfe", b"\xca\xfe\xba\xbe"),
    ".zip": (b"PK\x03\x04",),
    ".woff": (b"wOFF",),
    ".woff2": (b"wOF2",),
    ".ttf": (b"\x00\x01\x00\x00", b"true", b"ttcf"),
    ".wasm": (b"\x00asm",),
}


class AsarError(Exception):
    pass


def align4(n: int) -> int:
    return (n + 3) & ~3


def u32(buf: bytes, off: int) -> int:
    if off + 4 > len(buf):
        raise AsarError("读取 u32 越界：offset=%d len=%d" % (off, len(buf)))
    return struct.unpack_from("<I", buf, off)[0]


def parse(buf: bytes, start: int = 0) -> dict:
    """解析 asar 头；失败抛 AsarError（不返回"半个结果"）。"""
    if len(buf) - start < 12:
        raise AsarError("长度不足 12 字节，不可能包含 asar 头")
    first = u32(buf, start)
    if first != 4:
        raise AsarError("首 4 字节应为 4，实际 %d（不是 asar 或已错位）" % first)
    header_size = u32(buf, start + 4)
    json_len = u32(buf, start + 8)
    if json_len <= 0 or json_len > 64 * 1024 * 1024:
        raise AsarError("json_len 不合理：%d" % json_len)
    if header_size < 4 + json_len:
        raise AsarError("header_size(%d) 小于 4+json_len(%d)" % (header_size, 4 + json_len))
    json_start = start + 12
    json_end = json_start + json_len
    if json_end > len(buf):
        raise AsarError("JSON 段越界：需要到 %d，文件只有 %d" % (json_end, len(buf)))
    raw = buf[json_start:json_end]
    try:
        header = json.loads(raw.decode("utf-8", "strict"))
    except Exception as exc:  # noqa: BLE001 - 解析失败原因需要原样带出
        raise AsarError("JSON 目录解析失败：%s" % exc) from exc
    data_start = start + 8 + header_size
    if data_start > len(buf):
        raise AsarError("数据段起点(%d)超过文件长度(%d)" % (data_start, len(buf)))
    return {
        "start": start,
        "header_size": header_size,
        "json_len": json_len,
        "json": header,
        "data_start": data_start,
        "integrity": header.get("integrity"),
    }


def iter_files(node: dict, prefix: str = ""):
    """展开 JSON 目录里的所有叶子文件，产出 (路径, entry)。"""
    for name, entry in (node.get("files") or {}).items():
        path = prefix + name
        if "files" in entry and entry["files"] is not None:
            yield from iter_files(entry, path + "/")
        else:
            yield path, entry


def sample_bytes(buf: bytes, base: int, entry: dict, cap: int = 256) -> bytes:
    size = int(entry.get("size", 0))
    return buf[base:base + min(size, cap)]


TEXT_HEAD = {
    ".js": (b"const", b"let", b"var", b"function", b"async", b"class", b"module.", b"require(",
            b"import", b"export", b"\"use strict\"", b"'use strict'", b"!", b"#!", b";", b"(",
            b"/*", b"//", b"window.", b"self.", b"Object.", b"(()=>", b"(() =>", b"return"),
    ".mjs": (b"const", b"let", b"var", b"function", b"import", b"export", b"class", b"/*", b"//"),
    ".cjs": (b"const", b"let", b"var", b"function", b"require(", b"module.", b"class", b"/*", b"//"),
    ".html": (b"<!doctype", b"<html", b"<meta", b"<script", b"<link", b"<div", b"<head", b"<!--", b"<body"),
    ".css": (b"/*", b"@", b".", b"#", b":root", b"body", b"*", b"@media", b"@import"),
    ".xml": (b"<?xml", b"<"),
    ".svg": (b"<svg", b"<?xml"),
    ".map": (b"{"),
    ".json": (b"{", b"["),
    ".json5": (b"{", b"["),
    ".txt": (),
    ".md": (b"#", b"-", b"*", b"[", b"!", b">"),
}


def plausible(path: str, blob: bytes) -> bool:
    """按扩展名判断这段字节"像不像"该文件的真实内容。

    判据刻意做成"**开头必须像**"：只做「能解码成文本」太弱 —— 从任意位置切进一段文本
    都能解码成功，会导致偏移检索出现大量假阳性（实测过：delta=0 也会被判成满命中）。
    """
    if not blob:
        return False
    ext = os.path.splitext(path.lower())[1]
    if ext in BIN_SIGS:
        return any(blob.startswith(sig) for sig in BIN_SIGS[ext])
    if b"\x00" in blob[:64]:
        return False
    try:
        text = blob.decode("utf-8")
    except UnicodeDecodeError:
        return False
    printable = sum(1 for ch in text if ch.isprintable() or ch in "\r\n\t")
    if printable / max(len(text), 1) <= 0.9:
        return False
    head = blob.lstrip(b" \t\r\n\xef\xbb\xbf").lower()
    heads = TEXT_HEAD.get(ext)
    if heads is None:
        # 未知扩展名：只要求"开头是文本且不是明显的二进制垃圾"
        return head[:1].isascii() and head[:1] not in b""
    if not heads:
        return True
    return any(head.startswith(h) for h in heads)


def infer_delta(buf: bytes, info: dict, window: int = 512, samples: int = 12) -> dict:
    """在 ±window 内搜索唯一能把"所有抽样文件"同时判为合理的偏移差。"""
    entries = [(p, e) for p, e in iter_files(info["json"]) if str(e.get("offset", "")).isdigit()]
    entries = [x for x in entries if int(x[1].get("size", 0)) > 0][:samples]
    if not entries:
        return {"delta": 0, "hits": 0, "total": 0, "status": "empty"}
    best = None
    for delta in sorted(range(-window, window + 1), key=lambda d: (abs(d), d)):
        hits = 0
        for path, entry in entries:
            base = info["data_start"] + int(entry["offset"]) + delta
            if base < 0 or base >= len(buf):
                continue
            if plausible(path, sample_bytes(buf, base, entry)):
                hits += 1
        if hits == len(entries):
            best = delta
            break
    if best is None:
        # 找命中数最多的，用来报告"最接近但不自洽"
        top = {"delta": 0, "hits": -1, "total": len(entries)}
        for delta in range(-window, window + 1):
            hits = 0
            for path, entry in entries:
                base = info["data_start"] + int(entry["offset"]) + delta
                if 0 <= base < len(buf) and plausible(path, sample_bytes(buf, base, entry)):
                    hits += 1
            if hits > top["hits"]:
                top = {"delta": delta, "hits": hits, "total": len(entries)}
        top["status"] = "inconsistent"
        return top
    return {"delta": best, "hits": len(entries), "total": len(entries), "status": "ok"}


def detect_prefix(buf: bytes, limit: int = 4096) -> int:
    """归档前面若有多余前缀，返回前缀长度（0 表示没有）。"""
    if len(buf) >= 12 and u32(buf, 0) == 4:
        return 0
    for off in range(1, min(limit, len(buf) - 12)):
        if u32(buf, off) != 4:
            continue
        try:
            parse(buf, start=off)
            return off
        except AsarError:
            continue
    return -1


def rebuild(buf: bytes, info: dict, delta: int) -> bytes:
    """按 delta 重排归档。

    关键认识：**一个字节都不用搬**。asar 的数据段起点是 `8 + header_size` 推出来的，
    而各文件 offset 是相对这个起点的 —— 所以「整体偏了 d 字节」等价于
    「`header_size` 少了/多了 d 字节」：把长度字段改掉，偏移立刻全部对齐；
    `[DS, DS+d)` 那 d 个字节自然变成包头填充（解析器只按 `json_len` 读 JSON，
    包头多余的尾字节**被忽略**）。反过来物理删/插字节也行，但要同步改所有 offset，容易出错。

    因为 Electron 侧的解析器只按 `json_len` 读目录、按 `header_size` 找数据段，
    这里**只改长度字段**是等价且可逆的最小改动。
    """
    if delta == 0:
        return bytes(buf)
    new_size = info["header_size"] + delta
    if new_size < 4 + info["json_len"]:
        raise AsarError("负偏移过大：header_size 会小于 4+json_len（%d < %d）"
                        % (new_size, 4 + info["json_len"]))
    out = bytearray(buf)
    struct.pack_into("<I", out, info["start"] + 4, new_size)
    return bytes(out)


def cmd_identify(args) -> int:
    buf = open(args.archive, "rb").read()
    off = detect_prefix(buf)
    if off < 0:
        print("未识别：不是 asar（首 4 字节非 4，且 ±%d 字节内找不到自洽头）" % 4096)
        return EXIT_UNKNOWN
    info = parse(buf, start=off)
    files = list(iter_files(info["json"]))
    print(json.dumps({
        "archive": args.archive,
        "size": len(buf),
        "prefix_bytes": off,
        "header_size": info["header_size"],
        "json_len": info["json_len"],
        "data_start": info["data_start"],
        "file_count": len(files),
        "has_integrity": bool(info["integrity"]),
    }, ensure_ascii=False, indent=2))
    if off:
        print("提示：归档前有 %d 字节前缀，先跑 strip-prefix 再 check。" % off)
    return EXIT_OK


def cmd_check(args) -> int:
    buf = open(args.archive, "rb").read()
    off = detect_prefix(buf)
    if off < 0:
        print("未识别：不是 asar")
        return EXIT_UNKNOWN
    info = parse(buf, start=off)
    res = infer_delta(buf, info, window=args.window)
    entries = [x for x in iter_files(info["json"]) if str(x[1].get("offset", "")).isdigit()]
    print("归档            : %s (%d 字节%s)" % (args.archive, len(buf), "，前缀 %d 字节" % off if off else ""))
    print("header_size     : %d  · json_len: %d · data_start: %d" % (info["header_size"], info["json_len"], info["data_start"]))
    print("目录文件        : %d" % len(entries))
    if res["status"] == "empty":
        print("结论            : 目录里没有可抽样文件，无法反推偏移")
        return EXIT_UNKNOWN
    print("抽样            : %d/%d 个文件同时命中" % (res["hits"], res["total"]))
    print("推断 delta      : %+d" % res["delta"])
    if res["status"] != "ok":
        print("结论            : inconsistent（没有单一 delta 能让所有抽样文件都合理）")
        print("                 不要再猜偏移了：先确认这三件事 —— ① 是否被加了前缀；")
        print("                 ② 是否每段数据自身还有一层包装；③ 目录 JSON 是否被改过（offset 不可信）。")
        return EXIT_INCONSISTENT
    if res["delta"] == 0:
        print("结论            : ok（数据段起点正确，offset 可信）")
    else:
        print("结论            : offset 整体偏 %+d ⇒ 用 `fix --out new.asar` 修" % res["delta"])
    if info["integrity"]:
        print("⚠ 该归档带 integrity 字段：修好 offset 仍会被 Electron 完整性校验拒绝，")
        print("  需要同时处理 fuse EnableEmbeddedAsarIntegrityValidation（见 references/electron-asar-and-fuses.md）。")
    return EXIT_OK


def cmd_fix(args) -> int:
    buf = open(args.archive, "rb").read()
    off = detect_prefix(buf)
    if off < 0:
        print("未识别：不是 asar")
        return EXIT_UNKNOWN
    if off:
        print("发现 %d 字节前缀，先自动剥离。" % off)
        buf = buf[off:]
    info = parse(buf)
    res = infer_delta(buf, info, window=args.window)
    if res["status"] != "ok":
        print("不修：偏移不自洽（%d/%d 命中）" % (res["hits"], res["total"]))
        return EXIT_INCONSISTENT
    out = rebuild(buf, info, res["delta"]) if res["delta"] else buf
    if args.out:
        with open(args.out, "wb") as fh:
            fh.write(out)
    after = parse(out)
    bad = []
    for path, entry in iter_files(after["json"]):
        base = after["data_start"] + int(entry.get("offset", 0))
        if not plausible(path, sample_bytes(out, base, entry)):
            bad.append(path)
    print("修复            : delta=%+d，产物 %s" % (res["delta"], args.out or "(未落盘, --out 省略)"))
    print("复检            : 目录文件 %d 个，内容不合理 %d 个" % (len(list(iter_files(after["json"]))), len(bad)))
    if bad:
        print("                 前若干个: %s" % ", ".join(bad[:8]))
        print("                 说明偏移不是「单一常数」型，请回 check 的 inconsistent 分支。")
        return EXIT_INCONSISTENT
    print("结论            : ok —— 产物可用标准 asar 工具解包")
    if after["integrity"]:
        print("⚠ 仍带 integrity 字段：加载前必须处理完整性校验 fuse。")
    return EXIT_OK


def cmd_strip_prefix(args) -> int:
    buf = open(args.archive, "rb").read()
    if u32(buf, 0) == 4:
        print("无需处理：首 4 字节已经是 4")
        return EXIT_OK
    n = args.bytes
    cand = buf[n:]
    try:
        parse(cand)
    except AsarError as exc:
        print("剥离 %d 字节后仍然解析失败：%s" % (n, exc))
        return EXIT_UNKNOWN
    with open(args.out, "wb") as fh:
        fh.write(cand)
    print("已剥离前 %d 字节 → %s（重新 check 确认）" % (n, args.out))
    return EXIT_OK


# --------------------------------------------------------------------------- #
# 自检：构造合成归档 + 注入四类真实故障，验证"能抓 + 能修"
# --------------------------------------------------------------------------- #

def build_asar(files, extra_header_pad=0):
    """按 asar 真实布局拼一个归档，返回 bytes。"""
    manifest = {"files": {}}
    blob = bytearray()
    for name, data in files:
        manifest["files"][name] = {"size": len(data), "offset": str(len(blob))}
        blob += data
    raw = json.dumps(manifest, separators=(",", ":")).encode("utf-8")
    json_len = len(raw)
    header_size = align4(4 + json_len) + extra_header_pad
    out = bytearray()
    out += struct.pack("<I", 4)
    out += struct.pack("<I", header_size)
    out += struct.pack("<I", json_len)
    out += raw
    out += b"\x00" * (header_size - 4 - json_len)
    out += blob
    return bytes(out)


SAMPLE = [
    ("package.json", b'{"name":"demo","main":"main.js"}'),
    ("main.js", b"const {app}=require('electron');app.whenReady().then(()=>{});\n"),
    ("index.html", b"<!doctype html><html><body>hi</body></html>"),
]


def _selftest() -> int:
    import tempfile
    fails = []
    seen = []

    def ok(cond, label):
        seen.append(label)
        if not cond:
            fails.append(label)

    good = build_asar(SAMPLE)
    info = parse(good)
    ok(info["data_start"] == 8 + info["header_size"], "自检-A data_start 公式")
    ok(infer_delta(good, info)["delta"] == 0, "自检-B 正常归档 delta 必须为 0")
    ok(detect_prefix(good) == 0, "自检-C 正常归档无前缀")

    # ① 前缀型（真实样本：多 25 字节）
    prefixed = b"\x11" * 25 + good
    ok(detect_prefix(prefixed) == 25, "自检-D 应测出 25 字节前缀")
    stripped = prefixed[25:]
    ok(parse(stripped)["data_start"] == info["data_start"], "自检-E 剥离后结构一致")
    try:
        parse(prefixed)
        ok(False, "自检-F 带前缀的归档必须直接解析失败（否则 detect_prefix 没意义）")
    except AsarError:
        pass

    # ② 数据段被插入垃圾但不改 header_size ⇒ delta = +25
    ds = info["data_start"]
    gap = good[:ds] + b"\xAA" * 25 + good[ds:]
    ginfo = parse(gap)
    gres = infer_delta(gap, ginfo)
    ok(gres["delta"] == 25, "自检-G 数据段后移应推出 +25（实际 %s）" % gres["delta"])
    fixed = rebuild(gap, ginfo, 25)
    fin = parse(fixed)
    ok(infer_delta(fixed, fin)["delta"] == 0, "自检-H 修复后 delta 必须归零")
    for name, data in SAMPLE:
        entry = fin["json"]["files"][name]
        base = fin["data_start"] + int(entry["offset"])
        ok(fixed[base:base + len(data)] == data, "自检-I 修复后 %s 内容逐字节一致" % name)

    # ③ header_size 虚高（负 delta）
    over = build_asar(SAMPLE, extra_header_pad=20)
    raw_head = bytearray(over)
    # 故意把长度字段再吹大 20：此时数据实际位置比声称的靠前 20 字节
    struct.pack_into("<I", raw_head, 4, parse(over)["header_size"] + 20)
    over = bytes(raw_head)
    oinfo = parse(over)
    ores = infer_delta(over, oinfo)
    ok(ores["delta"] == -20, "自检-J 长度虚高应推出 -20（实际 %s）" % ores["delta"])
    ofixed = rebuild(over, oinfo, -20)
    ok(infer_delta(ofixed, parse(ofixed))["delta"] == 0, "自检-K 负 delta 修复后归零")

    # ④ 不自洽：目录被改过（offset 全错且无单一常数可救）⇒ 必须报 inconsistent
    bad_manifest = json.loads(json.dumps(info["json"]))
    for i, (name, _) in enumerate(SAMPLE):
        bad_manifest["files"][name]["offset"] = str(i * 7 + 3)
    raw = json.dumps(bad_manifest, separators=(",", ":")).encode("utf-8")
    hs = align4(4 + len(raw))
    bogus = struct.pack("<I", 4) + struct.pack("<I", hs) + struct.pack("<I", len(raw)) + raw
    bogus += b"\x00" * (hs - 4 - len(raw)) + good[info["data_start"]:]
    binfo = parse(bogus)
    bres = infer_delta(bogus, binfo, window=64)
    ok(bres["status"] == "inconsistent", "自检-L 目录被改必须报 inconsistent（实际 %s）" % bres["status"])

    # ⑤ 非 asar 必须被拒（不能"猜一个"）
    ok(detect_prefix(os.urandom(512)) == -1, "自检-M 随机数据必须判非 asar")
    try:
        parse(os.urandom(64))
        ok(False, "自检-N 随机数据 parse 必须抛错")
    except AsarError:
        pass

    # ⑥ integrity 字段必须被识别出来并报警（不静默）
    intg = {"files": {"main.js": {"size": 8, "offset": "0", "integrity": {"algorithm": "SHA256", "hash": "x"}}},
            "integrity": {"algorithm": "SHA256", "blocksize": 4194304, "blocks": ["y"]}}
    raw = json.dumps(intg, separators=(",", ":")).encode("utf-8")
    hs = align4(4 + len(raw))
    ib = struct.pack("<I", 4) + struct.pack("<I", hs) + struct.pack("<I", len(raw)) + raw
    ib += b"\x00" * (hs - 4 - len(raw)) + b"var a=1;"
    ok(bool(parse(ib)["integrity"]), "自检-O integrity 字段必须被识别")
    ok(infer_delta(ib, parse(ib))["delta"] == 0, "自检-P 带 integrity 的归档仍应能定 delta")

    # ⑦ CLI 端到端（真跑子进程，避免"函数对但命令不对"）
    with tempfile.TemporaryDirectory() as tmp:
        p_gap = os.path.join(tmp, "gap.asar")
        p_out = os.path.join(tmp, "fixed.asar")
        with open(p_gap, "wb") as fh:
            fh.write(gap)
        rc = _run_cli(["check", p_gap])
        ok(rc == 0, "自检-Q CLI check 退出码应为 0（实际 %s）" % rc)
        rc = _run_cli(["fix", p_gap, "--out", p_out])
        ok(rc == 0, "自检-R CLI fix 退出码应为 0（实际 %s）" % rc)
        out = open(p_out, "rb").read()
        oinfo2 = parse(out)
        ok(infer_delta(out, oinfo2)["delta"] == 0, "自检-S CLI 产物 delta 为 0")
        p_rand = os.path.join(tmp, "rand.bin")
        with open(p_rand, "wb") as fh:
            fh.write(os.urandom(300))
        rc = _run_cli(["identify", p_rand])
        ok(rc == EXIT_UNKNOWN, "自检-T 非 asar 的 identify 必须返回 3（实际 %s）" % rc)
        p_pre = os.path.join(tmp, "pre.asar")
        p_pre_out = os.path.join(tmp, "pre-fixed.asar")
        with open(p_pre, "wb") as fh:
            fh.write(prefixed)
        rc = _run_cli(["strip-prefix", p_pre, "--bytes", "25", "--out", p_pre_out])
        ok(rc == 0, "自检-U strip-prefix 退出码应为 0（实际 %s）" % rc)
        ok(detect_prefix(open(p_pre_out, "rb").read()) == 0, "自检-V 剥离产物首部无前缀")

    print("asar_offset_repair --selftest：%d 项断言，失败 %d" % (len(seen), len(fails)))
    for f in fails:
        print("  ✗ %s" % f)
    return 1 if fails else 0


def _run_cli(argv) -> int:
    """在子进程里跑本脚本，验证 CLI 契约（含退出码）。"""
    import subprocess
    proc = subprocess.run([sys.executable, os.path.abspath(__file__)] + argv,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return proc.returncode


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="ASAR 偏移体检 / 修复（零依赖）")
    ap.add_argument("--selftest", action="store_true", help="跑内置自检（构造样本 + 故障注入）")
    sub = ap.add_subparsers(dest="cmd")

    p1 = sub.add_parser("identify", help="判定是不是 asar，打印头部结构")
    p1.add_argument("archive")
    p1.set_defaults(func=cmd_identify)

    p2 = sub.add_parser("check", help="反推单一偏移差 delta")
    p2.add_argument("archive")
    p2.add_argument("--window", type=int, default=512)
    p2.set_defaults(func=cmd_check)

    p3 = sub.add_parser("fix", help="按 delta 重排归档")
    p3.add_argument("archive")
    p3.add_argument("--out", help="产物路径（省略则只做体检+复检，不落盘）")
    p3.add_argument("--window", type=int, default=512)
    p3.set_defaults(func=cmd_fix)

    p4 = sub.add_parser("strip-prefix", help="剥离归档前的 N 字节前缀")
    p4.add_argument("archive")
    p4.add_argument("--bytes", type=int, required=True)
    p4.add_argument("--out", required=True)
    p4.set_defaults(func=cmd_strip_prefix)

    args = ap.parse_args(argv)
    if args.selftest:
        return _selftest()
    if not getattr(args, "func", None):
        ap.print_help()
        return EXIT_USAGE
    try:
        return args.func(args)
    except AsarError as exc:
        print("解析失败：%s" % exc)
        return EXIT_UNKNOWN


if __name__ == "__main__":
    sys.exit(main())
