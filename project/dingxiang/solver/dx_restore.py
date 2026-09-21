#!/usr/bin/env python3
"""顶象滑块背景图还原 (references/2125447 第六步).

o 列表算法 (原文): 32 个字符逐个转十进制 %32 取余; 若结果已在列表里, 就 (值+1)%32 继续试,
直到不在列表才放入并跳出 -> 得到 32 个切片的还原顺序。

坑 (原文警告): 300/32 = 9.375 不是整数, 按 9px 切片只能拼回 288~291px, 后面算 x 必然偏。
这里用「输出像素 -> 源切片」的坐标映射, 不做整数切宽, 所以零丢失。
"""

import sys

from PIL import Image

W, H = 300, 150
NSLICE = 32


def order_from_o(o: str) -> list[int]:
    """o -> 长度为 32 的置换表 (每个值是 0..31 的切片号)."""
    assert len(o) == 32, f"o 必须 32 字符, 收到 {len(o)}"
    out: list[int] = []
    for ch in o:
        v = ord(ch) % NSLICE
        while v in out:
            v = (v + 1) % NSLICE
        out.append(v)
    assert sorted(out) == list(range(NSLICE)), f"置换表不完整: {out}"
    return out


def restore(img: Image.Image, order: list[int], forward: bool = True) -> Image.Image:
    """forward=True: 第 i 个输出切片取自 order[i]; False: 第 order[i] 个输出切片取自 i."""
    src_w = img.width / NSLICE
    out = Image.new("RGB", (img.width, img.height))
    for i in range(NSLICE):
        s, d = (i, order[i]) if forward else (order[i], i)
        out.paste(
            img.crop((round(s * src_w), 0, round((s + 1) * src_w), img.height)),
            (round(d * src_w), 0),
        )
    return out


def continuity_score(img: Image.Image, xs: list[int]) -> float:
    """跨切片边界的相邻像素平均差, 越小=拼接处越自然."""
    px = img.load()
    assert px is not None
    tot = n = 0
    for x in xs:
        if x <= 0 or x >= img.width:
            continue
        for y in range(img.height):
            a, b = px[x - 1, y], px[x, y]
            tot += abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])
            n += 1
    return tot / max(n, 1)


def demo(o: str, path: str) -> int:
    img = Image.open(path).convert("RGB")
    assert img.width == W, f"背景宽度应为 {W}, 实际 {img.width}"
    assert img.height == H, f"背景高度应为 {H}, 实际 {img.height}"
    order = order_from_o(o)
    src_w = W / NSLICE
    bounds = [round(i * src_w) for i in range(1, NSLICE)]

    raw = continuity_score(img, bounds)
    fwd = continuity_score(restore(img, order, True), bounds)
    inv = continuity_score(restore(img, order, False), bounds)
    print(f"o        = {o}")
    print(f"order    = {order}")
    print(f"拼接处平均差  乱序={raw:.1f}  正向={fwd:.1f}  反向={inv:.1f}")

    best = min((fwd, "forward"), (inv, "inverse"))[1]
    assert best != "raw" and min(fwd, inv) < raw, (
        "还原没有比乱序更连贯 -> 算法或方向不对"
    )
    for name, im in (
        ("scrambled", img),
        ("restored-fwd", restore(img, order, True)),
        ("restored-inv", restore(img, order, False)),
    ):
        im.save(f"dingxiang/artifacts/bg-{name}.png")
    print(f"方向判定: {best} (胜出者已存 dingxiang/artifacts/bg-restored-*.png)")
    return 0


if __name__ == "__main__":
    o = sys.argv[1] if len(sys.argv) > 1 else "e4a6239f0b0d55924acf9c194238ef1a"
    p = sys.argv[2] if len(sys.argv) > 2 else "dingxiang/artifacts/p-bg.bin"
    sys.exit(demo(o, p))
