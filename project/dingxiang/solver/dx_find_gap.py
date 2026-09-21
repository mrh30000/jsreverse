#!/usr/bin/env python3
"""在交付的背景图上定位缺口, 并用服务端返回的 y 做交叉验证。

思路: 缺口是滑块片被抠走的位置, 轮廓处会有明显的边缘能量(亮/暗描边)。
用滑块 alpha 的轮廓环在背景上滑窗, 环内梯度能量最大的位置 = 缺口。
判据: 检出位置的 y 若等于服务端 y, 说明交付图就是匹配用图(不需要先按 o 还原)。

用法: python dx_find_gap.py [bg] [piece] [y_server]
"""

import sys

import numpy as np
from PIL import Image


def ring_mask(alpha: np.ndarray) -> np.ndarray:
    on = alpha > 128
    up, dn = np.roll(on, 1, axis=0), np.roll(on, -1, axis=0)
    lf, rt = np.roll(on, 1, axis=1), np.roll(on, -1, axis=1)
    return on & ~(up & dn & lf & rt)


def to_int(s, default):
    try:
        return int(s)
    except (TypeError, ValueError):
        return default


def main(bg_path, piece_path, y_raw):
    y_server = to_int(y_raw, -1)
    bg = np.asarray(Image.open(bg_path).convert("L"), dtype=np.float64)
    piece = np.asarray(Image.open(piece_path).convert("RGBA"), dtype=np.uint8)
    ring = ring_mask(piece[:, :, 3])
    gh, gw = bg.shape
    ph, pw = ring.shape
    energy = np.abs(np.gradient(bg, axis=0)) + np.abs(np.gradient(bg, axis=1))
    ys, xs = np.nonzero(ring)

    ny, nx = gh - ph + 1, gw - pw + 1
    scores = np.empty((ny, nx))
    for y in range(ny):
        for x in range(nx):
            scores[y, x] = energy[y : y + ph, x : x + pw][ring].mean()

    print(f"背景 {gw}x{gh}  滑块 {pw}x{ph}  轮廓环像素 {len(ys)}  服务端 y={y_server}")
    print("轮廓能量 top5 (x, y, score):")
    picked = []
    for idx in scores.argsort(axis=None)[::-1]:
        y, x = np.unravel_index(idx, scores.shape)
        if any(abs(y - py) < 6 and abs(x - px) < 6 for py, px in picked):
            continue
        picked.append((y, x))
        print(f"  x={x:<4} y={y:<4} {scores[y, x]:.1f}")
        if len(picked) >= 5:
            break

    top = picked[0]
    near = min(picked, key=lambda p: abs(p[0] - y_server))
    print(
        f"\ntop1: x={top[1]} y={top[0]}   最贴近服务端 y: x={near[1]} y={near[0]} "
        f"(|Δy|={abs(near[0] - y_server)})"
    )

    # y 是服务端直接给的 -> 把搜索锁在 [y-3, y+3] 行内, x 只靠轮廓能量选
    row_scores = sorted(
        (
            (scores[y_server + dy, x], x)
            for dy in range(-3, 4)
            for x in range(nx)
            if 0 <= y_server + dy < ny
        ),
        reverse=True,
    )
    uniq = []
    for s, x in row_scores:
        if any(abs(x - u) < 6 for _, u in uniq):
            continue
        uniq.append((s, x))
        if len(uniq) >= 3:
            break
    print("锁 y 行后 top3 x:", ", ".join(f"x={x}({s:.1f})" for s, x in uniq))
    verdict = (
        "交付图可直接匹配 -> 无需先还原"
        if abs(top[0] - y_server) <= 6
        else "top1 的 y 对不上服务端 y -> 需先按 o 还原"
    )
    print(f"结论: {verdict}")
    if uniq:
        gap_x = uniq[0][1]
        init_off = 10
        for speed in (0.9, 1.0, 1.2):
            actual = (gap_x - init_off) // speed
            print(
                f"  type=0 示例 speed={speed}: 实际滑动={actual:.0f} 上传 x={actual + 10:.0f}"
            )
    return 0 if abs(top[0] - y_server) <= 6 else 1


if __name__ == "__main__":
    a = sys.argv
    rc = main(
        a[1] if len(a) > 1 else "dingxiang/artifacts/p-bg.bin",
        a[2] if len(a) > 2 else "dingxiang/artifacts/p-slider.bin",
        a[3] if len(a) > 3 else "74",
    )
    sys.exit(rc)
