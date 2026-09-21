#!/usr/bin/env python3
"""穷举 o->置换 的候选解释, 用真实边界代价矩阵打分。

判据: 把候选表当作「输出位置 i 取源切片 order[i]」还原后的边界代价, 越低越接近真相。
"""

import sys

sys.path.insert(0, "dingxiang/solver")
from dx_solve_order import cost_matrix, path_cost  # noqa: E402


def dedupe(vals, n):
    out = []
    for v in vals:
        v %= n
        guard = 0
        while v in out:
            v = (v + 1) % n
            guard += 1
            if guard > n * n:
                return None
        out.append(v)
    return out if sorted(out) == list(range(n)) else None


def candidates(o, n):
    hexv = [int(c, 16) for c in o]
    decv = [int(c, 10) if c.isdigit() else -1 for c in o]
    ordv = [ord(c) for c in o]
    out = {}
    for name, vals in (("hex", hexv), ("ord", ordv), ("dec", decv)):
        for mode, seq in (("direct", vals), ("+1step", [v + 1 for v in vals])):
            cand = dedupe(seq, n)
            if cand:
                out[f"{name}-{mode}"] = cand
                out[f"{name}-{mode}-inv"] = [cand.index(i) for i in range(n)]
    # 十六进制两两一组 (16 片) 等变体在 n=16 分支里跑
    return out


def main(o, path):
    img = Image_open(path)
    for n in (8, 10, 16, 20, 24, 32):
        C, _b = cost_matrix(img, n)
        ident = path_cost(list(range(n)), C)
        best = None
        for name, cand in candidates(o, n).items():
            c = path_cost(cand, C)
            if best is None or c < best[0]:
                best = (c, name, cand)
        msg = f"n={n:<3} 原图(恒等)={ident:8.1f}"
        if best:
            msg += f"  最佳候选={best[1]:<14} 代价={best[0]:8.1f}"
            msg += "  <== 优于原图" if best[0] < ident * 0.85 else ""
        print(msg)
    print("\n(恒等=直接按 o 还原前的顺序; 若某候选显著低于恒等, 它就是真实还原表)")


def Image_open(path):
    from PIL import Image

    return Image.open(path).convert("RGB")


if __name__ == "__main__":
    main(
        sys.argv[1] if len(sys.argv) > 1 else "e4a6239f0b0d55924acf9c194238ef1a",
        sys.argv[2] if len(sys.argv) > 2 else "dingxiang/artifacts/p-bg.bin",
    )
