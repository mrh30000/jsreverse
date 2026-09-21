#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""restore_slices.py —— 零依赖「切片乱序底图」还原 CLI

用途
----
把被水平/网格切片后打乱的验证码底图还原成正确顺序，并输出可复核的 JSON 报告。
本机没有 Pillow / OpenCV / numpy，所以 PNG 读写全部用标准库 `zlib` + 手写
scanline 反滤波实现，不引入任何第三方依赖。

核心要解决的问题（也是这个脚本存在的理由）
------------------------------------------
同一个「顺序数组」在不同站点有两种互为**逆置换**的语义，搞反了会得到一张
看起来"也像图片"但缺口位置完全错的底图：

* `target-to-source`（顶象）：`order[目标槽位] = 来源槽位`
  即 `drawImage(img, order[r]*w, 0, w, h, r*w, 0, w, h)`
* `source-to-target`（接口直下发，如智慧酒店/Tuya）：`order[来源槽位] = 目标槽位`
  即 `crop(i)` → `paste(order[i])`

用 `--semantics auto` 可以两种都试，按切片接缝处的边缘连续性自动判优。

用法
----
    # 1) 顺序来自前端派生算法（顶象：URL 文件名逐字符 ord%32 去重递增）
    python restore_slices.py --input bg.webp.png --rows 2 --cols 32 \
        --order-from-name 4ac41ecfd57b44c1b62fa07c9c843ed4 --out restored.png --pretty

    # 2) 顺序来自接口下发的 shuffle 数组（JSON 数组或逗号串）
    python restore_slices.py --input bg.png --rows 2 --cols 26 \
        --order-file shuffle.json --semantics source-to-target --out restored.png

    # 3) 顺序未知，两种语义都试并自动判优
    python restore_slices.py --input bg.png --rows 2 --cols 26 \
        --order "3,0,1,2,..." --semantics auto --out restored.png --pretty

    # 3b) 顺序以 hex 字符串下发（同盾 bgImageSplitSequence：每字符一位十六进制）
    python restore_slices.py --input bg.jpg --rows 2 --cols 8 \
        --order-hex "4F387A69D1C2B50E" --semantics source-to-target \
        --out new_bg.jpg --pretty

    # 4) 极验 v3（52 片 = 26×2，源 stride 12 + 左偏移 1，源图 312×160 → 还原 260×160）
    python restore_slices.py --model gt3 --input bg.png --out bg.restored.png --pretty
    python restore_slices.py --model gt3 --gt3-salt "6_11_7_10_4_12_3_1_0_5_2_9_8" \
        --input fullbg.png --out fullbg.restored.png
    python restore_slices.py --model gt3 --order "39,38,48,49,..." \
        --input bg.png --out bg.restored.png

    # 5) 自检（无外部样本，纯合成图往返）
    python restore_slices.py --selftest

注意
----
* 只支持非隔行 PNG、位深 8（color type 0/2/3/4/6）。WebP/JPEG 请先转成 PNG
  （浏览器 canvas `toDataURL('image/png')`、`magick`、或站点自带的还原接口）。
* `--model gt3` 会把 `--rows/--cols` 固定为 2×26 并改用极验自己的切片几何；
  语义固定为 `target-to-source`（该厂商不存在"两种语义"歧义）。
  极验 v3 的 `bg` 与 `fullbg` 要用**同一套顺序**各还原一次。
* 脚本只做离线图像还原，不发起任何网络请求、不控制浏览器。
"""

from __future__ import annotations

import argparse
import json
import re
import struct
import sys
import zlib

PNG_SIG = b"\x89PNG\r\n\x1a\n"
_CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}


# --------------------------------------------------------------------------
# PNG 解码（非隔行、位深 8）
# --------------------------------------------------------------------------
def _paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def _unfilter(raw: bytes, height: int, stride: int, bpp: int) -> bytearray:
    out = bytearray(height * stride)
    prev = bytearray(stride)
    pos = 0
    for y in range(height):
        ft = raw[pos]
        pos += 1
        line = bytearray(raw[pos:pos + stride])
        pos += stride
        if ft == 1:  # Sub
            for i in range(bpp, stride):
                line[i] = (line[i] + line[i - bpp]) & 0xFF
        elif ft == 2:  # Up
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif ft == 3:  # Average
            for i in range(stride):
                left = line[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + ((left + prev[i]) >> 1)) & 0xFF
        elif ft == 4:  # Paeth
            for i in range(stride):
                left = line[i - bpp] if i >= bpp else 0
                upleft = prev[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + _paeth(left, prev[i], upleft)) & 0xFF
        elif ft != 0:
            raise ValueError("不支持的 PNG 滤波类型: %d" % ft)
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return out


def read_png_checked(path: str):
    """读取 PNG，失败时抛 SystemExit + JSON（而不是裸 traceback）。

    新用户最常见的第一个错误就是路径写错/文件没下载，裸 FileNotFoundError
    会淹没在栈帧里；这里统一成与其它参数错误一致的可读输出。
    """
    try:
        return read_png(path)
    except FileNotFoundError:
        raise SystemExit(json.dumps({
            "error": "input_not_found",
            "input": path,
            "hint": "输入文件不存在。--input 必须是已存在的 PNG（WebP/JPEG 请先转 PNG）。",
        }, ensure_ascii=False))
    except OSError as exc:
        raise SystemExit(json.dumps({
            "error": "input_unreadable",
            "input": path,
            "detail": str(exc),
            "hint": "文件无法读取：确认路径拼写、权限，以及它确实是 PNG。",
        }, ensure_ascii=False))


def read_png(path: str):
    """返回 (width, height, bytearray RGBA)。"""
    with open(path, "rb") as f:
        data = f.read()
    if data[:8] != PNG_SIG:
        raise ValueError("%s 不是 PNG 文件（WebP/JPEG 请先转换）" % path)

    pos = 8
    idat = bytearray()
    palette = None
    trns = None
    width = height = depth = ctype = interlace = None

    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        ctag = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if ctag == b"IHDR":
            width, height, depth, ctype, _comp, _filt, interlace = struct.unpack(">IIBBBBB", body)
        elif ctag == b"PLTE":
            palette = body
        elif ctag == b"tRNS":
            trns = body
        elif ctag == b"IDAT":
            idat += body
        elif ctag == b"IEND":
            break

    if depth != 8:
        raise ValueError("仅支持位深 8，实际 %s（可用画布/工具先转 8-bit PNG）" % depth)
    if interlace != 0:
        raise ValueError("不支持 Adam7 隔行 PNG，请先转成非隔行 PNG")
    if ctype not in _CHANNELS:
        raise ValueError("不支持的 PNG color type: %s" % ctype)

    ch = _CHANNELS[ctype]
    stride = width * ch
    raw = zlib.decompress(bytes(idat))
    expect = height * (stride + 1)
    if len(raw) < expect:
        raise ValueError("PNG 数据不完整：期望 %d 字节，实际 %d" % (expect, len(raw)))
    px = _unfilter(raw, height, stride, ch)

    rgba = bytearray(width * height * 4)
    n = width * height
    if ctype == 6:
        rgba[:] = px
    elif ctype == 2:
        for i in range(n):
            rgba[i * 4:i * 4 + 3] = px[i * 3:i * 3 + 3]
            rgba[i * 4 + 3] = 255
    elif ctype == 0:
        for i in range(n):
            g = px[i]
            rgba[i * 4:i * 4 + 3] = bytes((g, g, g))
            rgba[i * 4 + 3] = 255
    elif ctype == 4:
        for i in range(n):
            g = px[i * 2]
            rgba[i * 4:i * 4 + 3] = bytes((g, g, g))
            rgba[i * 4 + 3] = px[i * 2 + 1]
    else:  # 3 = palette
        if palette is None:
            raise ValueError("调色板 PNG 缺少 PLTE 块")
        for i in range(n):
            idx = px[i]
            rgba[i * 4:i * 4 + 3] = palette[idx * 3:idx * 3 + 3]
            a = 255
            if trns is not None and idx < len(trns):
                a = trns[idx]
            rgba[i * 4 + 3] = a
    return width, height, rgba


def write_png(path: str, width: int, height: int, rgba: bytes) -> None:
    """把 RGBA 写成非隔行 8-bit PNG（filter 0）。"""
    stride = width * 4
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        raw += rgba[y * stride:(y + 1) * stride]

    def chunk(tag: bytes, body: bytes) -> bytes:
        return (struct.pack(">I", len(body)) + tag + body
                + struct.pack(">I", zlib.crc32(tag + body) & 0xFFFFFFFF))

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(PNG_SIG)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", zlib.compress(bytes(raw), 6)))
        f.write(chunk(b"IEND", b""))


# --------------------------------------------------------------------------
# 顺序来源：前端派生算法
# --------------------------------------------------------------------------
def derive_order_from_name(name: str, alphabet: int = 32) -> list:
    """还原顶象 `_n()`：逐字符取 ord(c) % 32，冲突则自增到未被占用。

    站点把图片 URL 的文件名（去扩展名）当作种子，前 32 个字符参与，
    因此「换一张图 = 换一个顺序」，纯算还原时必须用**当次**的 p1/p2 URL 文件名。
    """
    order = []
    for i, ch in enumerate(name):
        if i == 32:
            break
        o = ord(ch)
        while (o % alphabet) in order:
            o += 1
        order.append(o % alphabet)
    return order


def derive_order_from_query(url: str, alphabet: int = 32) -> list:
    """还原顶象 `Cn()`：从 query 里取 `c`；没有则用 `sid` + `aid` 拼接后再派生。

    优先级是 `c` 覆盖一切（命中即整体替换），否则按 `sid`(前) `aid`(后) 组装。
    """
    query = url.split("?", 1)[1] if "?" in url else ""
    picked = None
    sid = aid = ""
    for pair in query.split("&"):
        if not pair or "=" not in pair:
            continue
        k, v = pair.split("=", 1)
        if k == "c" and v and v != "null":
            picked = v
        elif k == "sid":
            sid = v
        elif k == "aid":
            aid = v
    seed = picked if picked is not None else (sid + aid)
    return derive_order_from_name(seed, alphabet)


def load_order(spec: str) -> list:
    """接受 JSON 数组、`[1,2,3]` 或 `1,2,3` 三种写法。"""
    text = spec.strip()
    if text.startswith("["):
        return [int(x) for x in json.loads(text)]
    return [int(x) for x in text.replace(" ", "").split(",") if x != ""]


def load_order_hex(spec: str) -> list:
    """解析 **hex 字符串**顺序：每个字符一位十六进制，字符数 = 切片总数。

    同盾 `bgImageSplitSequence` 用这种形式下发（如 `4F387A69D1C2B50E`，
    16 个字符 = 2 层 × 8 片），`int(c, 16)` 即目标槽位。
    空格与逗号会被忽略，便于直接从抓包里粘贴。
    """
    text = re.sub(r"[\s,]+", "", spec.strip())
    if not text:
        raise ValueError("hex 顺序串为空")
    if not re.fullmatch(r"[0-9a-fA-F]+", text):
        raise ValueError("hex 顺序串含非十六进制字符：%r" % spec)
    return [int(c, 16) for c in text]


# --------------------------------------------------------------------------
# 极验 v3 专用几何（`--model gt3`）
#
# 极验 v3 的乱序图不是均匀网格：52 片 = 26 列 × 2 行，每片 10×80，
# **源图** stride 为 12（块宽 10 + 2px 间隙）且左偏移 +1，所以源图宽 312；
# **还原后**画布宽只有 26×10 = 260（间隙被去掉）。
#
# 顺序来源是 JS 里一个 `SEQUENCE()` 函数把 13 元素盐数组展开成 52 元素置换；
# 语义固定为 `target-to-source`（`order[目标槽位] = 来源槽位`）。
# 公开文章中另一处直接给出的 52 元素硬编码表与本函数的输出**逐元素相同**
# （见 `--selftest` 用例 9），属于两条独立来源的交叉验证。
# --------------------------------------------------------------------------
GT3_SALT_DEFAULT = "6_11_7_10_4_12_3_1_0_5_2_9_8"
GT3_COLS, GT3_ROWS = 26, 2
GT3_SLICE_W, GT3_SLICE_H = 10, 80
GT3_SRC_STRIDE = 12
GT3_SRC_X_OFFSET = 1
GT3_TOTAL = GT3_COLS * GT3_ROWS                       # 52
GT3_SRC_WIDTH = GT3_COLS * GT3_SRC_STRIDE             # 312
GT3_OUT_WIDTH = GT3_COLS * GT3_SLICE_W                # 260
GT3_HEIGHT = GT3_ROWS * GT3_SLICE_H                   # 160

# 公开文章里直接给出的等价硬编码表（与 gt3_sequence_order() 输出一致）
GT3_KNOWN_TABLE = [
    39, 38, 48, 49, 41, 40, 46, 47, 35, 34, 50, 51, 33, 32, 28, 29, 27, 26,
    36, 37, 31, 30, 44, 45, 43, 42, 12, 13, 23, 22, 14, 15, 21, 20, 8, 9,
    25, 24, 6, 7, 3, 2, 0, 1, 11, 10, 4, 5, 19, 18, 16, 17,
]


def gt3_sequence_order(salt: str = GT3_SALT_DEFAULT) -> list:
    """复刻极验 v3 `SEQUENCE()`：13 元素盐数组 → 52 元素置换。

    盐数组每个元素必须落在 `0..GT3_COLS/2-1`（即 0..12）区间内，
    否则展开结果会越界、不是合法置换 —— 这里直接拒绝，而不是产出一张错位底图。
    """
    parts = [int(x) for x in salt.strip().split("_") if x != ""]
    if not parts:
        raise ValueError("gt3 salt 为空")
    limit = GT3_COLS // 2
    for v in parts:
        if not (0 <= v < limit):
            raise ValueError(
                "gt3 salt 元素 %d 越界：SEQUENCE() 要求每个元素落在 0..%d，"
                "否则展开结果不是 0..51 的置换" % (v, limit - 1))
    out = []
    for r in range(GT3_TOTAL):
        t = 2 * parts[(r % GT3_COLS) // 2] + r % 2
        if (r // 2) % 2 == 0:
            t += -1 if (r % 2) else 1
        t += GT3_COLS if r < GT3_COLS else 0
        out.append(t)
    return out


def _gt3_src_box(idx: int):
    return ((idx % GT3_COLS) * GT3_SRC_STRIDE + GT3_SRC_X_OFFSET,
            GT3_SLICE_H if idx >= GT3_COLS else 0)


def _gt3_dst_box(idx: int):
    return ((idx % GT3_COLS) * GT3_SLICE_W,
            GT3_SLICE_H if idx >= GT3_COLS else 0)


def restore_gt3(width: int, height: int, rgba: bytes, order: list):
    """极验 v3 底图还原。返回 `(RGBA bytes, out_width, out_height)`。"""
    if len(order) != GT3_TOTAL:
        raise ValueError("gt3 顺序数组长度必须是 %d，实际 %d" % (GT3_TOTAL, len(order)))
    if sorted(order) != list(range(GT3_TOTAL)):
        raise ValueError("gt3 顺序数组必须是 0..51 的排列")
    if width < GT3_SRC_WIDTH or height != GT3_HEIGHT:
        raise ValueError(
            "gt3 源图尺寸应为 %dx%d（含 2px 间隙的 312 宽原图），实际 %dx%d；"
            "若图片被缩放或裁剪过，请先用原图重跑" % (GT3_SRC_WIDTH, GT3_HEIGHT, width, height))

    out_w, out_h = GT3_OUT_WIDTH, GT3_HEIGHT
    out = bytearray(out_w * out_h * 4)
    for slot in range(GT3_TOTAL):
        src = order[slot]
        if not (0 <= src < GT3_TOTAL):
            raise ValueError("gt3 顺序元素越界：%s" % src)
        sx, sy = _gt3_src_box(src)
        dx, dy = _gt3_dst_box(slot)
        for row in range(GT3_SLICE_H):
            so = ((sy + row) * width + sx) * 4
            do = ((dy + row) * out_w + dx) * 4
            out[do:do + GT3_SLICE_W * 4] = rgba[so:so + GT3_SLICE_W * 4]
    return out, out_w, out_h


# --------------------------------------------------------------------------
# 还原
# --------------------------------------------------------------------------
def _slice_box(idx: int, cols: int, rows: int, sw: int, sh: int):
    return ((idx % cols) * sw, (idx // cols) * sh)


def restore(width: int, height: int, rgba: bytes,
            rows: int, cols: int, order: list, semantics: str) -> bytearray:
    """按 order 重排切片。

    semantics:
      * ``target-to-source``：`order[目标] = 来源`（顶象 drawImage 语义）
      * ``source-to-target``：`order[来源] = 目标`（接口 shuffle 语义）
    """
    total = rows * cols
    if len(order) < total:
        raise ValueError("order 长度 %d < rows*cols=%d" % (len(order), total))
    sw, sh = width // cols, height // rows
    if sw * cols != width or sh * rows != height:
        raise ValueError("图片尺寸 %dx%d 不能被 %dx%d 网格整除" % (width, height, cols, rows))

    out = bytearray(width * height * 4)
    for slot in range(total):
        if semantics == "target-to-source":
            src, dst = order[slot], slot
        elif semantics == "source-to-target":
            src, dst = slot, order[slot]
        else:
            raise ValueError("未知 semantics: %s" % semantics)
        if not (0 <= src < total) or not (0 <= dst < total):
            raise ValueError("order 元素越界：src=%s dst=%s" % (src, dst))

        sx, sy = _slice_box(src, cols, rows, sw, sh)
        dx, dy = _slice_box(dst, cols, rows, sw, sh)
        for row in range(sh):
            so = ((sy + row) * width + sx) * 4
            do = ((dy + row) * width + dx) * 4
            out[do:do + sw * 4] = rgba[so:so + sw * 4]
    return out


def seam_score(width: int, height: int, rgba: bytes, rows: int, cols: int) -> float:
    """切片接缝处的边缘连续性打分（越小越连续）。

    只比较每个切片**右边界列**与右邻居**左边界列**的像素差，以及上下边界行。
    随机乱序 ≈ 高分；正确顺序 ≈ 低分。用于 `--semantics auto` 自动判优。
    """
    sw, sh = width // cols, height // rows

    def px(x, y):
        o = (y * width + x) * 4
        return rgba[o], rgba[o + 1], rgba[o + 2]

    total = 0
    count = 0
    for r in range(rows):
        for c in range(cols - 1):
            xr, xl = (c + 1) * sw - 1, (c + 1) * sw
            for y in range(r * sh, (r + 1) * sh):
                a, b = px(xr, y), px(xl, y)
                total += abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])
                count += 3
    for r in range(rows - 1):
        for c in range(cols):
            yb, ya = (r + 1) * sh - 1, (r + 1) * sh
            for x in range(c * sw, (c + 1) * sw):
                a, b = px(x, yb), px(x, ya)
                total += abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])
                count += 3
    return (total / count) if count else float("inf")


# --------------------------------------------------------------------------
# 自检
# --------------------------------------------------------------------------
def _make_test_png(path: str, width: int, height: int, cols: int, rows: int,
                   order: list) -> None:
    """造一张乱序图，满足 `scr[order[b]] = base[b]`。

    `base` 每切片用唯一底色 + 水平渐变，便于逐块校验与接缝评分。
    `scr[order[b]] = base[b]` 正是 `target-to-source`（`order[目标]=来源`）语义的
    被打乱形态，因此 `restore(..., "target-to-source")` 必须还原回 `base`。
    """
    sw, sh = width // cols, height // rows
    total = rows * cols

    def blit(dst_buf, dst_slot, src_buf, src_slot):
        dx, dy = _slice_box(dst_slot, cols, rows, sw, sh)
        sx, sy = _slice_box(src_slot, cols, rows, sw, sh)
        for y in range(sh):
            so = ((sy + y) * width + sx) * 4
            do = ((dy + y) * width + dx) * 4
            dst_buf[do:do + sw * 4] = src_buf[so:so + sw * 4]

    base = bytearray(width * height * 4)
    for slot in range(total):
        x0, y0 = _slice_box(slot, cols, rows, sw, sh)
        for y in range(sh):
            for x in range(sw):
                o = ((y0 + y) * width + (x0 + x)) * 4
                base[o] = (slot * 37) % 256
                base[o + 1] = (x * 255) // max(sw - 1, 1)
                base[o + 2] = (slot * 11) % 256
                base[o + 3] = 255

    scrambled = bytearray(width * height * 4)
    for b in range(total):
        blit(scrambled, order[b], base, b)
    write_png(path, width, height, bytes(scrambled))


def selftest() -> int:
    import os
    import tempfile

    failures = []

    def check(name, cond):
        print(("  PASS  " if cond else "  FAIL  ") + name)
        if not cond:
            failures.append(name)

    print("restore_slices.py --selftest")
    tmp = tempfile.mkdtemp(prefix="rs_")

    # 1) PNG 往返：RGBA
    w, h = 37, 19
    buf = bytearray(w * h * 4)
    for i in range(w * h):
        buf[i * 4:i * 4 + 4] = bytes((i % 251, (i * 7) % 253, (i * 13) % 249, 255))
    p1 = os.path.join(tmp, "rt_rgba.png")
    write_png(p1, w, h, bytes(buf))
    w2, h2, back = read_png(p1)
    check("PNG RGBA 往返", (w2, h2) == (w, h) and bytes(back) == bytes(buf))

    # 2) 派生算法：确定性 + 是 0..31 的排列
    name = "4ac41ecfd57b44c1b62fa07c9c843ed4"
    o1 = derive_order_from_name(name)
    o2 = derive_order_from_name(name)
    check("_n 派生确定且为 0..31 排列", o1 == o2 and sorted(o1) == list(range(32)))

    # 3) 派生算法：不同文件名 → 不同顺序（换图换序）
    check("_n 换名换序", derive_order_from_name("a" * 32) != derive_order_from_name("b" * 32))

    # 4) query 派生：`c` 优先级高于 sid/aid
    check("Cn 中 c 覆盖 sid/aid",
          derive_order_from_query("http://x/y.webp?c=abc&sid=zzz&aid=999")
          == derive_order_from_name("abc"))

    # 5) 网格还原往返（target-to-source）
    cols, rows = 8, 2
    order = [3, 0, 7, 1, 5, 2, 6, 4, 9, 8, 15, 10, 12, 11, 14, 13]
    p2 = os.path.join(tmp, "scrambled.png")
    _make_test_png(p2, cols * 8, rows * 8, cols, rows, order)
    ww, hh, sc = read_png(p2)
    fixed = restore(ww, hh, sc, rows, cols, order, "target-to-source")
    p3 = os.path.join(tmp, "restored.png")
    write_png(p3, ww, hh, bytes(fixed))
    _, _, rt = read_png(p3)
    # 还原后应与「未打乱」的规则图一致：slot 底色 = slot*37
    ok = True
    for slot in range(rows * cols):
        x0, y0 = _slice_box(slot, cols, rows, 8, 8)
        if rt[(y0 * ww + x0) * 4] != (slot * 37) % 256:
            ok = False
            break
    check("target-to-source 网格还原", ok)

    # 6) 两种语义互为逆置换 → 结果一致
    inv = [0] * len(order)
    for s, d in enumerate(order):
        inv[d] = s
    fixed2 = restore(ww, hh, sc, rows, cols, inv, "source-to-target")
    check("两种语义互逆等价", bytes(fixed2) == bytes(fixed))

    # 7) seam_score 判优：正确顺序应优于打乱顺序
    s_ok = seam_score(ww, hh, bytes(fixed), rows, cols)
    s_bad = seam_score(ww, hh, bytes(sc), rows, cols)
    check("seam_score 判优 (%.1f < %.1f)" % (s_ok, s_bad), s_ok < s_bad)

    # 8) 参数校验：order 长度不足要报错
    try:
        restore(ww, hh, sc, rows, cols, [0, 1, 2], "target-to-source")
        check("order 长度校验", False)
    except ValueError:
        check("order 长度校验", True)

    # 9) 极验 v3：SEQUENCE() 复刻 == 公开硬编码表（两条独立来源交叉验证）
    o_gt3 = gt3_sequence_order()
    check("gt3 SEQUENCE 复刻 == 公开硬编码表且为 0..51 排列",
          o_gt3 == GT3_KNOWN_TABLE and sorted(o_gt3) == list(range(GT3_TOTAL))
          and len(o_gt3) == GT3_TOTAL)
    check("gt3 换盐换序", gt3_sequence_order("12_11_10_9_8_7_6_5_4_3_2_1_0") != o_gt3)
    check("gt3 换盐仍是 0..51 排列",
          sorted(gt3_sequence_order("12_11_10_9_8_7_6_5_4_3_2_1_0")) == list(range(GT3_TOTAL)))
    try:
        gt3_sequence_order("0_1_2_13_4_5_6_7_8_9_10_11_12")
        check("gt3 盐越界拒绝", False)
    except ValueError:
        check("gt3 盐越界拒绝", True)

    # 10) 极验 v3 还原往返：乱序 312×160 → 还原 260×160
    gw, gh = GT3_SRC_WIDTH, GT3_HEIGHT
    gt = bytearray(gw * gh * 4)
    for slot in range(GT3_TOTAL):
        gsx, gsy = _gt3_src_box(o_gt3[slot])
        for y in range(GT3_SLICE_H):
            for x in range(GT3_SLICE_W):
                gpo = ((gsy + y) * gw + (gsx + x)) * 4
                gt[gpo] = (slot * 5) % 256
                gt[gpo + 1] = (slot * 37) % 256
                gt[gpo + 2] = 200
                gt[gpo + 3] = 255
    fixed_gt, ow, oh = restore_gt3(gw, gh, bytes(gt), o_gt3)
    ok = (ow, oh) == (GT3_OUT_WIDTH, GT3_HEIGHT)
    if ok:
        for slot in range(GT3_TOTAL):
            gdx, gdy = _gt3_dst_box(slot)
            gpo = (gdy * ow + gdx) * 4
            if (fixed_gt[gpo], fixed_gt[gpo + 1]) != ((slot * 5) % 256, (slot * 37) % 256):
                ok = False
                break
    check("gt3 底图还原往返（312×160 → 260×160）", ok)

    # 11) 极验 v3：排列校验与源图尺寸校验
    try:
        restore_gt3(gw, gh, bytes(gt), [0] * GT3_TOTAL)
        check("gt3 排列校验", False)
    except ValueError:
        check("gt3 排列校验", True)
    try:
        restore_gt3(GT3_OUT_WIDTH, GT3_HEIGHT, bytes(gt), o_gt3)
        check("gt3 源图尺寸校验", False)
    except ValueError:
        check("gt3 源图尺寸校验", True)

    # 12) 极验 v3：CLI 端到端（--model gt3）
    import contextlib
    import io
    gt_in = os.path.join(tmp, "gt3_in.png")
    gt_out = os.path.join(tmp, "gt3_out.png")
    write_png(gt_in, gw, gh, bytes(gt))
    with contextlib.redirect_stdout(io.StringIO()):
        rc = main(["--model", "gt3", "--input", gt_in, "--out", gt_out,
                   "--report", os.path.join(tmp, "gt3.json"), "--pretty"])
    w3, h3, _ = read_png(gt_out)
    check("gt3 CLI 端到端 (rc=0, 260×160)", rc == 0 and (w3, h3) == (GT3_OUT_WIDTH, GT3_HEIGHT))

    # 13) hex 字符串顺序（同盾 bgImageSplitSequence 形式）
    hex_spec = "4F387A69D1C2B50E"
    check("hex 顺序解析 = 逐字符 int(c,16)",
          load_order_hex(hex_spec) == [int(c, 16) for c in hex_spec]
          and load_order_hex(hex_spec) == [4, 15, 3, 8, 7, 10, 6, 9, 13, 1, 12, 2, 11, 5, 0, 14])
    check("hex 顺序忽略空格/逗号",
          load_order_hex("4F,38 7A 69 D1 C2 B5 0E") == load_order_hex(hex_spec))
    for bad in ("", "XY", "12G4"):
        try:
            load_order_hex(bad)
            check("hex 非法输入拒绝(%r)" % bad, False)
        except ValueError:
            check("hex 非法输入拒绝(%r)" % bad, True)

    # 14) hex 顺序 CLI 端到端：与 --order 十进制写法产物逐字节一致
    hex_of_order = "".join(format(v, "X") for v in order)   # order 见用例 5
    hex_out = os.path.join(tmp, "restored_hex.png")
    with contextlib.redirect_stdout(io.StringIO()):
        rc_hex = main(["--input", p2, "--out", hex_out, "--rows", str(rows),
                       "--cols", str(cols), "--order-hex", hex_of_order,
                       "--semantics", "target-to-source", "--pretty"])
    _, _, via_hex = read_png(hex_out)
    check("hex 顺序 CLI 端到端与十进制一致 (rc=%d)" % rc_hex,
          rc_hex == 0 and bytes(via_hex) == bytes(fixed))

    for f in os.listdir(tmp):
        os.remove(os.path.join(tmp, f))
    os.rmdir(tmp)

    print("-" * 52)
    print("结果：%s" % ("全部通过" if not failures else "失败 %d 项" % len(failures)))
    return 1 if failures else 0


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------
def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        description="切片乱序验证码底图还原（零依赖 PNG 读写）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("用法")[1] if "用法" in __doc__ else None)
    ap.add_argument("--input", help="乱序 PNG 路径")
    ap.add_argument("--out", help="还原后 PNG 输出路径")
    ap.add_argument("--model", default="grid", choices=["grid", "gt3"],
                    help="还原几何：grid=均匀网格（默认）；gt3=极验 v3（26×2 片、源 stride 12、左偏移 1）")
    ap.add_argument("--gt3-salt", default=GT3_SALT_DEFAULT,
                    help="极验 v3 SEQUENCE() 的 13 元素盐数组（默认 %s）" % GT3_SALT_DEFAULT)
    ap.add_argument("--rows", type=int, default=1, help="切片行数（默认 1，--model gt3 时忽略）")
    ap.add_argument("--cols", type=int, help="切片列数（--model gt3 时忽略）")
    ap.add_argument("--order", help="顺序数组：`1,2,0` 或 `[1,2,0]`")
    ap.add_argument("--order-hex",
                    help="hex 字符串顺序（每个字符一位十六进制，如 `4F387A69D1C2B50E`）")
    ap.add_argument("--order-file", help="顺序数组 JSON 文件（站点接口下发）")
    ap.add_argument("--order-from-name", help="按站点派生算法从该字符串生成顺序（顶象 _n）")
    ap.add_argument("--order-from-url", help="按站点派生算法从该 URL 生成顺序（顶象 Cn，优先 c）")
    ap.add_argument("--semantics", default="auto",
                    choices=["auto", "target-to-source", "source-to-target"],
                    help="顺序语义；auto 两种都试并按接缝连续性判优")
    ap.add_argument("--report", help="把 JSON 报告写到该路径")
    ap.add_argument("--pretty", action="store_true", help="报告缩进输出")
    ap.add_argument("--selftest", action="store_true", help="运行内置自检")
    args = ap.parse_args(argv)

    if args.selftest:
        return selftest()

    # ---------------- 极验 v3 专用分支 ----------------
    if args.model == "gt3":
        if not args.input or not args.out:
            ap.error("--model gt3 需要 --input / --out")
        if args.order_hex:
            order, order_source = load_order_hex(args.order_hex), "inline-hex"
        elif args.order:
            order, order_source = load_order(args.order), "inline"
        elif args.order_file:
            with open(args.order_file, "r", encoding="utf-8") as f:
                order, order_source = load_order(f.read()), "file:%s" % args.order_file
        else:
            try:
                order = gt3_sequence_order(args.gt3_salt)
            except ValueError as exc:
                raise SystemExit(json.dumps({
                    "error": "gt3_salt_invalid",
                    "salt": args.gt3_salt,
                    "detail": str(exc),
                    "hint": ("盐数组应形如 `6_11_7_10_4_12_3_1_0_5_2_9_8`（13 个 0..12 的整数，"
                             "下划线分隔）；它来自当前 SDK 版本 slide.*.js 里 SEQUENCE() 的入参，"
                             "换版本要重新取。"),
                }, ensure_ascii=False, indent=2 if args.pretty else None))
            order_source = "gt3-sequence"

        width, height, rgba = read_png_checked(args.input)
        if len(order) != GT3_TOTAL:
            raise SystemExit(json.dumps({
                "error": "gt3_order_length_mismatch",
                "order_length": len(order),
                "expected": GT3_TOTAL,
                "hint": "极验 v3 必须是 52 元素置换；长度不符说明拿到的不是极验 v3 的顺序数组。",
            }, ensure_ascii=False, indent=2 if args.pretty else None))
        # 与 grid 分支保持一致的「强校验 → 结构化 JSON 报错」行为：
        # 排列性与源图尺寸都直接拒绝，不产出一张看起来像图片、实际缺块错位的底图。
        try:
            img, out_w, out_h = restore_gt3(width, height, rgba, order)
        except ValueError as exc:
            raise SystemExit(json.dumps({
                "error": "gt3_restore_failed",
                "detail": str(exc),
                "input_size": [width, height],
                "expected_input_size": [GT3_SRC_WIDTH, GT3_HEIGHT],
                "hint": ("必须用**未被缩放/裁剪的原图**；若站点返回 webp，先用浏览器 canvas "
                         "toDataURL('image/png') 转成 PNG，不要用第三方工具缩放。"),
            }, ensure_ascii=False, indent=2 if args.pretty else None))
        write_png(args.out, out_w, out_h, bytes(img))
        report = {
            "model": "gt3",
            "input": args.input,
            "output": args.out,
            "input_size": [width, height],
            "output_size": [out_w, out_h],
            "grid": {"rows": GT3_ROWS, "cols": GT3_COLS},
            "slice_size": [GT3_SLICE_W, GT3_SLICE_H],
            "src_stride": GT3_SRC_STRIDE,
            "src_x_offset": GT3_SRC_X_OFFSET,
            "order_source": order_source,
            "order_length": len(order),
            "order_is_permutation": True,
            "semantics": "target-to-source",
            "notes": [
                "极验 v3 的 bg 与 fullbg 使用同一套顺序，两张图都要各跑一次。",
                "还原后画布为 260×160（间隙被去掉），后续缺口定位按该尺寸做。",
            ],
            "warnings": [],
            "next_step": ("缺口定位：灰度 → Canny(255,255) → matchTemplate(TM_CCOEFF_NORMED)，"
                          "或用 ddddocr.slide_match；再用 load 返回的 ypos 交叉验证 y。"),
        }
        if args.gt3_salt != GT3_SALT_DEFAULT:
            report["warnings"].append("使用了非默认盐数组，请确认它来自当前 SDK 版本的 SEQUENCE()")
        text = json.dumps(report, ensure_ascii=False, indent=2 if args.pretty else None)
        if args.report:
            with open(args.report, "w", encoding="utf-8") as f:
                f.write(text)
        print(text)
        return 0

    if not args.input or not args.out or not args.cols:
        ap.error("需要 --input / --out / --cols（或使用 --selftest）")

    order = None
    order_source = None
    if args.order_from_name:
        order, order_source = derive_order_from_name(args.order_from_name), "derived-from-name"
    elif args.order_from_url:
        order, order_source = derive_order_from_query(args.order_from_url), "derived-from-url"
    elif args.order_file:
        with open(args.order_file, "r", encoding="utf-8") as f:
            order, order_source = load_order(f.read()), "file:%s" % args.order_file
    elif args.order_hex:
        order, order_source = load_order_hex(args.order_hex), "inline-hex"
    elif args.order:
        order, order_source = load_order(args.order), "inline"
    if order is None:
        ap.error("需要 --order / --order-file / --order-from-name / --order-from-url 之一")

    width, height, rgba = read_png_checked(args.input)
    total = args.rows * args.cols

    # 强校验：顺序数组的长度与排列性都必须成立。
    # 「长度不足就截断」「有重复就照跑」都会产出一张看起来像图片、实际缺块错位的底图，
    # 且不会有任何报错 —— 这是本流程最容易静默失败的地方，所以直接拒绝。
    if len(order) != total:
        raise SystemExit(
            json.dumps({
                "error": "order_length_mismatch",
                "order_length": len(order),
                "rows_cols_product": total,
                "hint": ("顺序数组长度与 rows*cols 不一致。先确认网格切法（rows/cols）是否对；"
                         "若顺序来自派生算法（--order-from-name/--order-from-url），"
                         "说明该站的 alphabet 大小或冲突自增策略与派生假设不符，不要硬跑。"),
            }, ensure_ascii=False, indent=2 if args.pretty else None))
    if sorted(order) != list(range(total)):
        raise SystemExit(
            json.dumps({
                "error": "order_not_a_permutation",
                "order": order,
                "duplicates": sorted({x for x in order if order.count(x) > 1}),
                "hint": "顺序数组必须是 0..N-1 的排列。出现重复通常意味着语义判错或网格切法错误。",
            }, ensure_ascii=False, indent=2 if args.pretty else None))

    report = {
        "input": args.input,
        "output": args.out,
        "image_size": [width, height],
        "grid": {"rows": args.rows, "cols": args.cols},
        "slice_size": [width // args.cols, height // args.rows],
        "order_source": order_source,
        "order_length": len(order),
        "order_is_permutation": True,
        "semantics": args.semantics,
        "warnings": [],
    }

    candidates = (["target-to-source", "source-to-target"]
                  if args.semantics == "auto" else [args.semantics])
    scored = []
    best = None
    for sem in candidates:
        try:
            img = restore(width, height, rgba, args.rows, args.cols, order, sem)
        except ValueError as exc:
            report["warnings"].append("%s 失败：%s" % (sem, exc))
            continue
        score = seam_score(width, height, bytes(img), args.rows, args.cols)
        scored.append({"semantics": sem, "seam_score": round(score, 4)})
        if best is None or score < best[0]:
            best = (score, sem, img)

    if best is None:
        print(json.dumps(report, ensure_ascii=False, indent=2 if args.pretty else None))
        return 2

    write_png(args.out, width, height, bytes(best[2]))
    report["seam_scores"] = scored
    report["chosen_semantics"] = best[1]
    report["seam_score"] = round(best[0], 4)
    # 接缝判优是启发式：两种语义得分接近时不可信（纯色块 / 重复纹理 / 低对比图尤其如此）。
    # 阈值 5 是经验值，未经大规模标定 ⇒ confidence=low 时一律要求用真实成功样本反查。
    auto_judged = len(scored) > 1
    report["confidence"] = ("low" if auto_judged and abs(
        scored[0]["seam_score"] - scored[1]["seam_score"]) <= 5 else
        ("medium" if auto_judged else "high"))
    if auto_judged and report["confidence"] == "low":
        report["warnings"].append(
            "两种语义的接缝得分接近（阈值 5，经验值），无法自动判优：请用一次真实成功样本的缺口位置反查")
    if not auto_judged:
        report["warnings"].append(
            "指定的语义未经交叉验证；建议再用 --semantics auto 对照一次，或用成功样本反查")
    report["next_step"] = ("底图还原完成后，用 references/tile-scramble-and-coordinate-mapping.md "
                           "的公式把缺口视觉位置换算成提交坐标，再生成轨迹")

    text = json.dumps(report, ensure_ascii=False, indent=2 if args.pretty else None)
    if args.report:
        with open(args.report, "w", encoding="utf-8") as f:
            f.write(text)
    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
