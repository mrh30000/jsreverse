#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""rotation_and_gesture_calc.py —— 旋转系 / 手势系（非滑块题型）的离线换算与还原 CLI

零依赖（只 import 同目录的 restore_slices.py 复用 PNG 读写）。不联网、不提交请求。

子命令
------
1) baidu-ac-c        百度旋转 / 滑块的 ac_c 换算（v1 / v2 两代口径不同）
2) vaptcha-order     VAPTCHA 图片还原顺序 = "整数减法 + 左侧补零到 10 位"
3) vaptcha-restore   按顺序还原 VAPTCHA 源图（5 列 × 2 行 = 10 片）
4) murmur3           murmurhash3_x64_128（VAPTCHA 的 hashComponents 就是它）

协议与坑的权威源：references/rotation-and-gesture-protocols.md

用法示例
--------
    python rotation_and_gesture_calc.py baidu-ac-c --angle 90 --version v1 --pretty
    python rotation_and_gesture_calc.py baidu-ac-c --version v2 --mode slide --distance 145 --pretty
    python rotation_and_gesture_calc.py vaptcha-order --img-order 1234567890 --n 123456780 --pretty
    python rotation_and_gesture_calc.py vaptcha-restore --input bg.png --order 3168542970 --out fixed.png --pretty
    python rotation_and_gesture_calc.py murmur3 --input "some-env-json" --pretty
    python rotation_and_gesture_calc.py --selftest

诚实声明（别把这里当"已验证"）
----------------------------
* `baidu-ac-c` 的两个公式均有来源支撑（见协议文档 §2.2），可直接用。
* `vaptcha-order` 的减法与补零规则有**两篇**独立来源支撑；但 `N` 的**四项归属**
  两篇口径不完全一致（协议文档 §3.3 已挂账）⇒ 本脚本只做算术，不替你决定 `N`。
* `murmur3` 严格照抄来源给出的实现；`--selftest` 只能覆盖可自证的性质
  （空串 → 全 0、长度 32 hex、确定性、三种输入长度分类），
  **未与公开测试向量对齐**（本机没有第二个参考实现，自己写第二遍不算独立验证）。
"""

import argparse
import json
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from restore_slices import read_png, write_png  # noqa: E402

MASK64 = 0xFFFFFFFFFFFFFFFF


# --------------------------------------------------------------------------
# 1) 百度 ac_c
# --------------------------------------------------------------------------

def baidu_ac_c(version, mode, angle=None, distance=None, track_span=212, bar_total=290, bar_gap=52):
    """返回 (ac_c, 说明 dict)。

    v1（mkd.js）：
      旋转：ac_c = parseFloat(angle / 360).toFixed(2)
            —— 原始写法是 parseFloat(o / 212)，其中 o = angle * 212 / 360，
               212（滑轨可滑动长度）在化简中被抵消。
    v2（mkd_v2.js）：
      旋转：distance = angle * (290 - 52) / 360，ac_c = Number((distance / (290 - 52)).toFixed(2))
            —— 同样化简为 angle / 360，写成两步只是为了对齐源码。
      滑块：ac_c = Number((distance / 290).toFixed(2))
            —— 注意分母是 290（滑动框整体长度），不是 238。
    """
    version = (version or "v2").lower()
    mode = (mode or "rotate").lower()
    span = bar_total - bar_gap  # 238

    if mode == "rotate":
        if angle is None:
            raise ValueError("rotate 模式需要 --angle")
        ratio = angle / 360.0
        if version == "v1":
            o = angle * track_span / 360.0
            ac_c = float("%.2f" % float(o / track_span))
            formula = "v1: parseFloat(o / 212).toFixed(2), o = angle * 212 / 360"
        elif version == "v2":
            d = angle * span / 360.0
            ac_c = float("%.2f" % float(d / span))
            formula = "v2: Number((angle * 238 / 360 / 238).toFixed(2))"
        else:
            raise ValueError("--version 只能是 v1 或 v2")
        return ac_c, {
            "version": version,
            "mode": "rotate",
            "angle": angle,
            "ratio": round(ratio, 6),
            "formula": formula,
            "note": "两代旋转分支化简后同值；差异在滑轨长度与接口名，不在这个数",
        }

    if mode == "slide":
        if version == "v1":
            raise ValueError("v1 主打旋转，未采集到 v1 滑块 ac_c 口径；请确认代际")
        if distance is None:
            raise ValueError("slide 模式需要 --distance")
        ac_c = float("%.2f" % float(distance / bar_total))
        return ac_c, {
            "version": version,
            "mode": "slide",
            "distance": distance,
            "formula": "v2: Number((distance / 290).toFixed(2))",
            "note": "分母 290 是滑动框整体长度；若照抄旋转分支的 238 会整体偏大",
        }

    raise ValueError("--mode 只能是 rotate 或 slide")


# --------------------------------------------------------------------------
# 2) VAPTCHA 图片顺序
# --------------------------------------------------------------------------

def vaptcha_order(img_order, n):
    """order = str(int(img_order) - n)，不足 10 位左侧补 '0'。

    返回 (order_str, meta)。order 必须是 0..9 的一个排列——
    不是排列说明 N 算错了（这是最省事的自检，不要跳过）。
    """
    raw = int(img_order) - int(n)
    order = str(raw)
    padded = raw < 0
    if padded:
        # 负数在真实协议里不该出现；显式报出来，不做“取绝对值”这种自作聪明
        raise ValueError("img_order - n 为负数（%d - %d = %d）：N 的四项归属或取值需复核" % (img_order, n, raw))
    if len(order) < 10:
        order = "0" * (10 - len(order)) + order
    meta = {
        "img_order": int(img_order),
        "n": int(n),
        "order": order,
        "is_permutation": sorted(order) == list("0123456789"),
    }
    if not meta["is_permutation"]:
        meta["warning"] = (
            "order 不是 0..9 的有效排列 ⇒ N 大概算错了。"
            "先核 ha/hb/secretC/worker 四项的归属与取值（协议文档 §3.3）"
        )
    return order, meta


# --------------------------------------------------------------------------
# 3) VAPTCHA 图片还原
# --------------------------------------------------------------------------

def vaptcha_restore(width, height, rgba, order, cols=5, rows=2):
    """按 VAPTCHA 的槽位语义还原：order[i] 是第 i 个源片的**目标槽位**，
    < cols（=5）贴到第一行、>= cols 贴到第二行（槽位 = 值 - cols）。

    返回新的 RGBA bytearray。不做缩放（保持源几何），
    画布尺寸是渲染值、不是协议常量（协议文档 §3.3）。
    """
    if len(order) != cols * rows:
        raise ValueError("order 必须是 %d 位（当前 %d 位）" % (cols * rows, len(order)))
    if sorted(order) != sorted(str(i) for i in range(cols * rows)):
        raise ValueError("order 不是 0..%d 的排列，拒绝还原（先复核 N）" % (cols * rows - 1))

    sw = width // cols
    sh = height // rows
    out = bytearray(width * height * 4)
    for idx in range(cols * rows):
        src_col = idx % cols
        src_row = 0 if idx < cols else 1
        slot = int(order[idx])
        dst_col = slot % cols
        dst_row = 0 if slot < cols else 1

        for y in range(sh):
            src_off = ((src_row * sh + y) * width + src_col * sw) * 4
            dst_off = ((dst_row * sh + y) * width + dst_col * sw) * 4
            out[dst_off:dst_off + sw * 4] = rgba[src_off:src_off + sw * 4]
    return out


# --------------------------------------------------------------------------
# 4) murmurhash3_x64_128
# --------------------------------------------------------------------------

def _rotl64(x, r):
    return ((x << r) & MASK64) | (x >> (64 - r))


def _fmix(k):
    k &= MASK64
    k ^= k >> 33
    k = (k * 0xFF51AFD7ED558CCD) & MASK64
    k ^= k >> 33
    k = (k * 0xC4CEB9FE1A85EC53) & MASK64
    k ^= k >> 33
    return k


def murmurhash3_x64_128(key, seed=0):
    """返回 32 位十六进制字符串（h1 前 16 位 + h2 后 16 位）。"""
    data = key.encode("utf-8") if isinstance(key, str) else bytes(key)
    length = len(data)
    nblocks = length // 16

    h1 = seed
    h2 = seed
    c1 = 0x87C37B91114253D5
    c2 = 0x4CF5AD432745937F

    for block_start in range(0, nblocks * 16, 16):
        k1 = struct.unpack_from("<Q", data, block_start)[0]
        k2 = struct.unpack_from("<Q", data, block_start + 8)[0]

        k1 = (k1 * c1) & MASK64
        k1 = _rotl64(k1, 31)
        k1 = (k1 * c2) & MASK64
        h1 ^= k1

        h1 = _rotl64(h1, 27)
        h1 = (h1 + h2) & MASK64
        h1 = (h1 * 5 + 0x52DCE729) & MASK64

        k2 = (k2 * c2) & MASK64
        k2 = _rotl64(k2, 33)
        k2 = (k2 * c1) & MASK64
        h2 ^= k2

        h2 = _rotl64(h2, 31)
        h2 = (h2 + h1) & MASK64
        h2 = (h2 * 5 + 0x38495AB5) & MASK64

    tail = data[nblocks * 16:]
    k1 = 0
    k2 = 0

    if len(tail) >= 8:
        for i in range(8):
            k1 |= tail[i] << (i * 8)
        for i in range(8, len(tail)):
            k2 |= tail[i] << ((i - 8) * 8)
    else:
        for i in range(len(tail)):
            k1 |= tail[i] << (i * 8)

    if len(tail) > 8:
        k2 = (k2 * c2) & MASK64
        k2 = _rotl64(k2, 33)
        k2 = (k2 * c1) & MASK64
        h2 ^= k2

    if len(tail) > 0:
        k1 = (k1 * c1) & MASK64
        k1 = _rotl64(k1, 31)
        k1 = (k1 * c2) & MASK64
        h1 ^= k1

    h1 ^= length
    h2 ^= length

    h1 = (h1 + h2) & MASK64
    h2 = (h2 + h1) & MASK64

    h1 = _fmix(h1)
    h2 = _fmix(h2)

    h1 = (h1 + h2) & MASK64
    h2 = (h2 + h1) & MASK64

    return "{:016x}{:016x}".format(h1, h2)


# --------------------------------------------------------------------------
# 自检
# --------------------------------------------------------------------------

def selftest():
    checks = []

    def ck(name, got, want):
        checks.append((name, got == want, got, want))

    # --- 百度 ac_c ---
    v1_90, _ = baidu_ac_c("v1", "rotate", angle=90)
    ck("baidu-v1-angle90", v1_90, 0.25)
    v1_270, _ = baidu_ac_c("v1", "rotate", angle=270)
    ck("baidu-v1-angle270", v1_270, 0.75)
    v2_180, _ = baidu_ac_c("v2", "rotate", angle=180)
    ck("baidu-v2-angle180", v2_180, 0.5)
    # 两代旋转分支在同一个角度上必须同值（化简后同为 angle/360）
    for ang in (30, 90, 137.5, 300):
        a, _ = baidu_ac_c("v1", "rotate", angle=ang)
        b, _ = baidu_ac_c("v2", "rotate", angle=ang)
        ck("baidu-v1-eq-v2-angle%s" % ang, a, b)
    v2_slide, _ = baidu_ac_c("v2", "slide", distance=145)
    ck("baidu-v2-slide-145", v2_slide, 0.5)
    # 滑块与旋转的分母不同：145 在 /290 下是 0.5，在 /238 下是 0.61
    ck("baidu-v2-slide-denominator-is-290", v2_slide != round(145 / 238.0, 2), True)
    # 四舍五入到 2 位
    v2_round, _ = baidu_ac_c("v2", "rotate", angle=100)
    ck("baidu-v2-round2", v2_round, round(100 / 360.0, 2))

    # --- VAPTCHA 顺序 ---
    order, meta = vaptcha_order(1234567890, 123456780)
    ck("vaptcha-order-basic", order, "1111111110")
    ck("vaptcha-order-permutation-flag", meta["is_permutation"], False)
    order2, meta2 = vaptcha_order(1000, 999)
    ck("vaptcha-order-zero-pad", order2, "0000000001")
    # 构造一个真排列
    order3, meta3 = vaptcha_order(3168542970, 0)
    ck("vaptcha-order-identity", order3, "3168542970")
    ck("vaptcha-order-identity-perm", meta3["is_permutation"], True)
    try:
        vaptcha_order(100, 200)
        ck("vaptcha-order-negative-raises", "no-raise", "raise")
    except ValueError:
        ck("vaptcha-order-negative-raises", "raise", "raise")

    # --- VAPTCHA 还原：用"每像素值 = 槽位号"的合成图验证槽位语义 ---
    width, height = 10, 4  # 5 列 × 2 行，每片 2×2
    cols, rows = 5, 2
    src = bytearray()
    for y in range(height):
        for x in range(width):
            src_row = 0 if y < height // rows else 1
            src_col = x // (width // cols)
            idx = src_row * cols + src_col
            src += bytes([idx, idx, idx, 255])
    # 顺序 0123456789（恒等）⇒ 还原后每个像素仍等于它自己的槽位号
    out_identity = vaptcha_restore(width, height, src, "0123456789")
    ck("vaptcha-restore-identity", bytes(out_identity[0:4]), bytes([0, 0, 0, 255]))
    ck("vaptcha-restore-identity-last", bytes(out_identity[-4:]), bytes([9, 9, 9, 255]))
    # 顺序 "5432109876" ⇒ 上排片序反转、下排也反转
    out_rev = vaptcha_restore(width, height, src, "5432109876")
    # 源片 0 应落到槽位 5 ⇒ 下排第 0 列
    dst_first_bottom = ((height // rows) * width) * 4
    ck("vaptcha-restore-slot5-bottom", bytes(out_rev[dst_first_bottom:dst_first_bottom + 4]), bytes([0, 0, 0, 255]))
    # 源片 9 应落到槽位 6 ⇒ 下排第 1 列
    ck("vaptcha-restore-slot6", bytes(out_rev[dst_first_bottom + 2 * 4:dst_first_bottom + 2 * 4 + 4]), bytes([9, 9, 9, 255]))
    # 非排列顺序必须被拒（这是"N 算错"最常见症状）
    try:
        vaptcha_restore(width, height, src, "1111111111")
        ck("vaptcha-restore-rejects-non-permutation", "no-raise", "raise")
    except ValueError:
        ck("vaptcha-restore-rejects-non-permutation", "raise", "raise")

    # --- murmur3：只断言可自证性质 ---
    # 空串是唯一有公开共识的路径：h1 = h2 = seed = 0 ⇒ 32 个 0。
    ck("murmur3-empty-is-zeros", murmurhash3_x64_128(""), "0" * 32)
    ck("murmur3-length-32", len(murmurhash3_x64_128("hello")), 32)
    ck("murmur3-deterministic", murmurhash3_x64_128("hello"), murmurhash3_x64_128("hello"))
    ck("murmur3-seed-matters", murmurhash3_x64_128("hello", 1) != murmurhash3_x64_128("hello", 0), True)
    # 三种输入长度分类（<8 / >=8 / 整块）都要能跑通且互不相同
    a = murmurhash3_x64_128("x")
    b = murmurhash3_x64_128("x" * 8)
    c = murmurhash3_x64_128("x" * 16)
    d = murmurhash3_x64_128("x" * 17)
    ck("murmur3-len-classes-distinct", len({a, b, c, d}), 4)
    ck("murmur3-utf8-ok", len(murmurhash3_x64_128("中文环境")), 32)

    passed = sum(1 for _, ok, _, _ in checks if ok)
    print("rotation_and_gesture_calc selftest: %d/%d 通过" % (passed, len(checks)))
    for name, ok, got, want in checks:
        if not ok:
            print("  ✗ %s: got=%r want=%r" % (name, got, want))
    return 0 if passed == len(checks) else 1


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if "--selftest" in argv:
        return selftest()

    parser = argparse.ArgumentParser(
        prog="rotation_and_gesture_calc.py",
        description="旋转系 / 手势系（非滑块题型）离线换算与还原",
    )
    parser.add_argument("--pretty", action="store_true", help="缩进输出 JSON")
    sub = parser.add_subparsers(dest="cmd")

    p1 = sub.add_parser("baidu-ac-c", help="百度旋转/滑块的 ac_c 换算")
    p1.add_argument("--pretty", action="store_true", help="缩进输出 JSON")
    p1.add_argument("--version", choices=["v1", "v2"], required=True)
    p1.add_argument("--mode", choices=["rotate", "slide"], default="rotate")
    p1.add_argument("--angle", type=float)
    p1.add_argument("--distance", type=float)

    p2 = sub.add_parser("vaptcha-order", help="VAPTCHA 图片顺序 = 整数减法 + 补零到 10 位")
    p2.add_argument("--pretty", action="store_true", help="缩进输出 JSON")
    p2.add_argument("--img-order", required=True, help="get 接口下发的 img_order（整数串）")
    p2.add_argument("--n", required=True, help="N = ha指纹 + hb指纹 + secretC + worker 值")

    p3 = sub.add_parser("vaptcha-restore", help="按顺序还原 VAPTCHA 源图（5×2）")
    p3.add_argument("--pretty", action="store_true", help="缩进输出 JSON")
    p3.add_argument("--input", required=True, help="源图 PNG（WebP/JPEG 请先转 PNG）")
    p3.add_argument("--order", help="10 位顺序串")
    p3.add_argument("--img-order", help="与 --n 一起用，替代 --order")
    p3.add_argument("--n", help="与 --img-order 一起用")
    p3.add_argument("--cols", type=int, default=5)
    p3.add_argument("--rows", type=int, default=2)
    p3.add_argument("--out", required=True)

    p4 = sub.add_parser("murmur3", help="murmurhash3_x64_128（== hashComponents）")
    p4.add_argument("--pretty", action="store_true", help="缩进输出 JSON")
    p4.add_argument("--input", required=True)
    p4.add_argument("--seed", type=int, default=0)

    args = parser.parse_args(argv)
    if not args.cmd:
        parser.print_help()
        return 1

    if args.cmd == "baidu-ac-c":
        ac_c, meta = baidu_ac_c(args.version, args.mode, angle=args.angle, distance=args.distance)
        print(json.dumps({"ac_c": ac_c, "detail": meta}, ensure_ascii=False,
                         indent=2 if args.pretty else None))
        return 0

    if args.cmd == "vaptcha-order":
        order, meta = vaptcha_order(args.img_order, args.n)
        print(json.dumps(meta, ensure_ascii=False, indent=2 if args.pretty else None))
        return 0

    if args.cmd == "vaptcha-restore":
        if args.order:
            order = args.order
            meta = {"order": order, "source": "cli"}
        elif args.img_order and args.n is not None:
            order, meta = vaptcha_order(args.img_order, args.n)
        else:
            raise SystemExit("需要 --order，或 --img-order 与 --n 配对给出")
        width, height, rgba = read_png(args.input)
        out = vaptcha_restore(width, height, rgba, order, cols=args.cols, rows=args.rows)
        write_png(args.out, width, height, bytes(out))
        meta.update({"input": args.input, "out": args.out,
                     "geometry": {"width": width, "height": height,
                                  "cols": args.cols, "rows": args.rows},
                     "note": "保持源几何还原；画布尺寸是渲染值，见协议文档 §3.3"})
        print(json.dumps(meta, ensure_ascii=False, indent=2 if args.pretty else None))
        return 0

    if args.cmd == "murmur3":
        print(json.dumps({
            "input": args.input,
            "seed": args.seed,
            "hash": murmurhash3_x64_128(args.input, args.seed),
            "note": "VAPTCHA hashComponents 用的就是这个；来源未给公开测试向量，落地前用浏览器原函数对一次",
        }, ensure_ascii=False, indent=2 if args.pretty else None))
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
