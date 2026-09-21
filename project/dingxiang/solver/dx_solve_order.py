#!/usr/bin/env python3
"""从图片本身反解真实切片置换, 再和 o 推导的表对比。

不猜规则: 32 等宽竖切片, 代价 C[i][j] = 切片i末列 vs 切片j首列 的平均绝对色差。
最近邻 + 2-opt 求最优排列 = 图片的真实还原顺序。
然后与 o 的 ord%32 去重置换表(正向/逆向)比对, 判定文章算法对不对。
"""

import sys

from PIL import Image

W, H = 300, 150
N = 32


def order_from_o(o, n=N):
    out = []
    for ch in o[:n]:
        v = ord(ch) % n
        guard = 0
        while v in out:
            v = (v + 1) % n
            guard += 1
            if guard > n * n:
                raise RuntimeError("o 去重循环不收敛")
        out.append(v)
    return out


def slices(img, n=N):
    sw = img.width / n
    return [round(i * sw) for i in range(n)] + [img.width]


def cost_matrix(img, n=N):
    px = img.load()
    assert px is not None
    b = slices(img, n)
    left = [[px[b[j], y] for y in range(img.height)] for j in range(n)]
    right = [[px[b[i + 1] - 1, y] for y in range(img.height)] for i in range(n)]
    C = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j:
                C[i][j] = 1e9
                continue
            s = 0
            for y in range(img.height):
                a, c = right[i][y], left[j][y]
                s += abs(a[0] - c[0]) + abs(a[1] - c[1]) + abs(a[2] - c[2])
            C[i][j] = s / img.height
    return C, b


def path_cost(order, C):
    return sum(C[order[i]][order[i + 1]] for i in range(len(order) - 1))


def solve(C, n=N):
    # 固定起点为 0 会漏掉环位移; 对每个起点跑一次最近邻+2opt, 取最优
    best = None
    best_o: list[int] = list(range(n))
    for start in range(n):
        order = [start]
        seen = {start}
        while len(order) < n:
            cur = order[-1]
            nxt = min((C[cur][j], j) for j in range(n) if j not in seen)[1]
            seen.add(nxt)
            order.append(nxt)
        improved = True
        while improved:
            improved = False
            for i in range(1, n - 1):
                for k in range(i + 1, n):
                    cand = order[:i] + order[i : k + 1][::-1] + order[k + 1 :]
                    if path_cost(cand, C) < path_cost(order, C) - 1e-9:
                        order = cand
                        improved = True
        c = path_cost(order, C)
        if best is None or c < best:
            best, best_o = c, order
    return best_o, best


def main(o, path):
    img = Image.open(path).convert("RGB")
    assert img.width == W and img.height == H, f"尺寸 {img.size}"
    C, b = cost_matrix(img)
    true_o, cost = solve(C)
    raw = path_cost(list(range(32)), C)
    cand_fwd = order_from_o(o)
    cand_inv = [cand_fwd.index(i) for i in range(32)]

    def agree(a, t):
        return sum(1 for x, y in zip(a, t, strict=True) if x == y)

    print(f"边界代价: 乱序原图={raw:.1f}  反解最优={cost:.1f}  (越低越连贯)")
    print(f"反解真实顺序: {true_o}")
    print(f"o 推导(正向): {cand_fwd}  一致位={agree(cand_fwd, true_o)}/32")
    print(f"o 推导(逆向): {cand_inv}  一致位={agree(cand_inv, true_o)}/32")
    for name, cand in (("fwd", cand_fwd), ("inv", cand_inv)):
        print(f"  o-{name} 排列的边界代价={path_cost(cand, C):.1f}")
    out = Image.new("RGB", img.size)
    sw = img.width / 32
    for i, s in enumerate(true_o):
        out.paste(
            img.crop((round(s * sw), 0, round((s + 1) * sw), H)), (round(i * sw), 0)
        )
    out.save("dingxiang/artifacts/bg-solved.png")
    print("已存 dingxiang/artifacts/bg-solved.png (按反解顺序还原)")


if __name__ == "__main__":
    main(
        sys.argv[1] if len(sys.argv) > 1 else "e4a6239f0b0d55924acf9c194238ef1a",
        sys.argv[2] if len(sys.argv) > 2 else "dingxiang/artifacts/p-bg.bin",
    )
