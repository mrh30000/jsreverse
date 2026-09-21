#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""assign_by_similarity.py —— 零依赖「相似度矩阵 → 坐标指派」求解 CLI

用途
----
点选类验证码算完 `matrix[i][j] = 题目第 i 个 与 候选框第 j 个 的相似度` 之后，
需要把它变成一个**行列不相交**的指派（一个题目只能配一个框，一个框只能用一次）。
本脚本提供两种解法并给出置信度判据，纯标准库实现，不依赖 numpy / scipy。

* `greedy`    ：反复取全局最大，然后把该行该列置 0。N ≤ 6 时够用。
* `hungarian` ：Kuhn–Munkres（O(n³)，矩形矩阵也支持），贪心被"大分数挡路"时用。
* `auto`      ：两种都算，不一致时以 hungarian 为准并在报告里标 `greedy_disagrees`。

为什么要专门做这一步
--------------------
"每个题目各自取相似度最大的框"在**有重复目标**或**分数接近**时会返回同一个框两遍，
或者整体错位一格 —— 这两种都不会抛异常，只会静默提交失败。

用法
----
    # 1) 直接给矩阵（行用 ; 分隔，列用 , 分隔）
    python assign_by_similarity.py \
        --matrix "0.1,0.2,0.8,0.5;0.9,0.3,0.5,0.1;0.5,0.1,0.1,0.8;0.2,0.7,0.1,0.3" --pretty

    # 2) 从 JSON 读（二维数组，或 {"matrix": [[...]]}）
    python assign_by_similarity.py --matrix-file sim.json --method hungarian --pretty

    # 3) 带置信度门槛：top1 与 top2 分差 < 0.08 就标记为不可信
    python assign_by_similarity.py --matrix-file sim.json --min-margin 0.08 --pretty

    # 4) 自检（含随机矩阵与暴力枚举对照）
    python assign_by_similarity.py --selftest

注意
----
* 输入按**最大化**处理（相似度越大越像）。若你的矩阵是"距离/代价"，先取负或 `1 - d`。
* 只做离线指派计算，不发起网络请求、不控制浏览器、不提交验证。
"""

from __future__ import annotations

import argparse
import itertools
import json
import random
import sys

INF = float("inf")


def configure_utf8_stdio() -> None:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")


configure_utf8_stdio()


# --------------------------------------------------------------------------- #
# 求解器
# --------------------------------------------------------------------------- #
def greedy_assign(matrix):
    """反复取全局最大，置零该行该列。返回 [(row, col, score), ...]。"""
    n = len(matrix)
    m = len(matrix[0]) if n else 0
    work = [list(row) for row in matrix]
    pairs = []
    for _ in range(min(n, m)):
        best = None
        for i in range(n):
            for j in range(m):
                v = work[i][j]
                if v is None:
                    continue
                if best is None or v > best[0]:
                    best = (v, i, j)
        if best is None:
            break
        v, i, j = best
        pairs.append((i, j, float(v)))
        for jj in range(m):
            work[i][jj] = None
        for ii in range(n):
            work[ii][j] = None
    return pairs


def hungarian_assign(matrix):
    """Kuhn–Munkres（e-maxx 版）最大化指派。返回 [(row, col, score), ...]。

    实现要点：先转成最小化代价 `cost = max_value - matrix[i][j]`（非负，避免
    delta 初值被负代价干扰），再跑最短增广路。要求行数 <= 列数，否则先转置。
    """
    n = len(matrix)
    m = len(matrix[0]) if n else 0
    if n == 0 or m == 0:
        return []
    transposed = n > m
    if transposed:
        matrix = [[matrix[i][j] for i in range(n)] for j in range(m)]
        n, m = m, n

    flat_max = max(v for row in matrix for v in row)
    a = [[flat_max - matrix[i][j] for j in range(m)] for i in range(n)]

    u = [0.0] * (n + 1)
    v = [0.0] * (m + 1)
    p = [0] * (m + 1)
    way = [0] * (m + 1)
    for i in range(1, n + 1):
        p[0] = i
        j0 = 0
        minv = [INF] * (m + 1)
        used = [False] * (m + 1)
        while True:
            used[j0] = True
            i0 = p[j0]
            delta = INF
            j1 = -1
            for j in range(1, m + 1):
                if used[j]:
                    continue
                cur = a[i0 - 1][j - 1] - u[i0] - v[j]
                if cur < minv[j]:
                    minv[j] = cur
                    way[j] = j0
                if minv[j] < delta:
                    delta = minv[j]
                    j1 = j
            if j1 == -1:
                break
            for j in range(0, m + 1):
                if used[j]:
                    u[p[j]] += delta
                    v[j] -= delta
                else:
                    minv[j] -= delta
            j0 = j1
            if p[j0] == 0:
                break
        while j0:
            j1 = way[j0]
            p[j0] = p[j1]
            j0 = j1

    pairs = []
    for j in range(1, m + 1):
        if p[j]:
            i = p[j] - 1
            jj = j - 1
            if transposed:
                # 转置后：i 是转置行（= 原列），jj 是转置列（= 原行）
                pairs.append((jj, i, float(matrix[i][jj])))
            else:
                pairs.append((i, jj, float(matrix[i][jj])))
    pairs.sort()
    return pairs


def brute_force_assign(matrix):
    """仅用于自检：枚举所有指派取最优。n! 增长，n <= 7 才调用。"""
    n = len(matrix)
    m = len(matrix[0]) if n else 0
    if n == 0 or m == 0:
        return []
    best = None
    for cols in itertools.permutations(range(m), min(n, m)):
        total = sum(matrix[i][cols[i]] for i in range(len(cols)))
        if best is None or total > best[0]:
            best = (total, cols)
    return [(i, best[1][i], float(matrix[i][best[1][i]])) for i in range(len(best[1]))]


# --------------------------------------------------------------------------- #
# 报告
# --------------------------------------------------------------------------- #
def margin_report(matrix, pairs):
    """对每个已指派行，算 top1 与该行**次优列**的分差（同一行内比较）。

    口径说明：这里故意用"同一行的 top1 vs top2"，而不是"排除别人已占列之后的最好值"——
    方形矩阵里每个框都会被占走，后者恒为空、门槛永远失效。行内分差才是
    "这个题目的答案有多确定"的直接度量。
    """
    n = len(matrix)
    m = len(matrix[0]) if n else 0
    per_row = []
    for i, j, score in pairs:
        others = [matrix[i][k] for k in range(m) if k != j]
        runner_up = max(others) if others else None
        margin = None if runner_up is None else score - runner_up
        per_row.append({
            "row": i,
            "col": j,
            "score": round(score, 6),
            "runner_up": None if runner_up is None else round(runner_up, 6),
            "margin": None if margin is None else round(margin, 6),
        })
    return per_row


def parse_matrix(text):
    rows = [r for r in text.replace("\n", ";").split(";") if r.strip()]
    return [[float(x) for x in r.split(",") if x.strip() != ""] for r in rows]


def main():
    ap = argparse.ArgumentParser(
        description="相似度矩阵 → 坐标指派（贪心 / 匈牙利），零依赖",
        formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--matrix", help="矩阵字符串：行用 ; 分隔，列用 , 分隔")
    ap.add_argument("--matrix-file", help="JSON 文件：二维数组或 {\"matrix\": [[...]]}")
    ap.add_argument("--method", choices=["greedy", "hungarian", "auto"], default="auto")
    ap.add_argument("--min-margin", type=float, default=0.05,
                    help="置信度门槛：任一行分差低于该值则 overall_confidence=low（默认 0.05）")
    ap.add_argument("--pretty", action="store_true")
    ap.add_argument("--report", help="把 JSON 报告写入文件")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        return selftest()

    if args.matrix_file:
        raw = json.loads(open(args.matrix_file, encoding="utf-8").read())
        matrix = raw["matrix"] if isinstance(raw, dict) else raw
        matrix = [[float(x) for x in row] for row in matrix]
    elif args.matrix:
        matrix = parse_matrix(args.matrix)
    else:
        ap.error("需要 --matrix 或 --matrix-file（或 --selftest）")

    if not matrix or not matrix[0]:
        ap.error("矩阵为空")
    width = len(matrix[0])
    for row in matrix:
        if len(row) != width:
            ap.error("矩阵每行长度必须一致")

    report = {
        "matrix_shape": [len(matrix), width],
        "method_requested": args.method,
        "warnings": [],
    }

    greedy = greedy_assign(matrix)
    hungarian = hungarian_assign(matrix)
    if args.method == "greedy":
        chosen, method = greedy, "greedy"
    elif args.method == "hungarian":
        chosen, method = hungarian, "hungarian"
    else:
        chosen, method = hungarian, "hungarian"
        g_total = sum(s for _, _, s in greedy)
        h_total = sum(s for _, _, s in hungarian)
        if abs(g_total - h_total) > 1e-9:
            report["warnings"].append(
                "贪心与匈牙利结果不一致（贪心总分 %.6f < 最优 %.6f）⇒ 已采用匈牙利结果" % (g_total, h_total))
            report["greedy_total"] = round(g_total, 6)

    if len(matrix) > width:
        report["warnings"].append(
            "题目数(%d) > 候选框数(%d)：必然有题目分不到框，应重新取题而不是硬提交" % (len(matrix), width))

    rows = margin_report(matrix, chosen)
    report.update({
        "method": method,
        "assignment": [{"order": idx + 1, "row": r, "col": c, "score": round(s, 6)}
                       for idx, (r, c, s) in enumerate(chosen)],
        "per_row_margin": rows,
        "total_score": round(sum(s for _, _, s in chosen), 6),
        "greedy_total": round(sum(s for _, _, s in greedy), 6),
        "hungarian_total": round(sum(s for _, _, s in hungarian), 6),
    })

    weak = [r for r in rows if r["margin"] is not None and r["margin"] < args.min_margin]
    report["weak_rows"] = weak
    report["overall_confidence"] = "low" if weak else "high"
    if weak:
        report["warnings"].append(
            "以下行 top1 与次优分差 < %.4f：相似度路线在此类题上必然误判，建议整轮丢弃重取，不要硬提交"
            % args.min_margin)
    report["next_step"] = (
        "按 assignment 的 order 顺序取候选框中心点作为点击坐标；"
        "提交前按 references/tile-scramble-and-coordinate-mapping.md §4 做视觉→提交坐标换算")

    text = json.dumps(report, ensure_ascii=False, indent=2 if args.pretty else None)
    if args.report:
        with open(args.report, "w", encoding="utf-8") as f:
            f.write(text)
    print(text)
    return 0 if report["overall_confidence"] == "high" else 1


# --------------------------------------------------------------------------- #
# 自检
# --------------------------------------------------------------------------- #
def selftest():
    failures = []
    checks = 0

    # 1) 文章里的 4×4 案例：两种解法都应得到总分 3.2
    art = [[0.1, 0.2, 0.8, 0.5],
           [0.9, 0.3, 0.5, 0.1],
           [0.5, 0.1, 0.1, 0.8],
           [0.2, 0.7, 0.1, 0.3]]
    checks += 1
    g = sum(s for _, _, s in greedy_assign(art))
    h = sum(s for _, _, s in hungarian_assign(art))
    if abs(h - 3.2) > 1e-9:
        failures.append("4×4 匈牙利最优应为 3.2，实得 %.6f" % h)
    checks += 1
    if abs(g - 3.2) > 1e-9:
        failures.append("4×4 贪心应为 3.2，实得 %.6f" % g)

    # 2) 指派必须行列不相交且覆盖 min(n,m) 个
    checks += 1
    pairs = hungarian_assign(art)
    if len({r for r, _, _ in pairs}) != 4 or len({c for _, c, _ in pairs}) != 4:
        failures.append("4×4 指派出现行列冲突：%r" % (pairs,))

    # 3) 矩形：3 行 5 列 → 应给出 3 个指派，且列互不重复
    checks += 1
    rect = [[0.1, 0.9, 0.2, 0.3, 0.4],
            [0.8, 0.1, 0.7, 0.2, 0.3],
            [0.2, 0.3, 0.1, 0.6, 0.5]]
    rp = hungarian_assign(rect)
    if len(rp) != 3 or len({c for _, c, _ in rp}) != 3:
        failures.append("3×5 矩形指派错误：%r" % (rp,))
    checks += 1
    if abs(sum(s for _, _, s in rp) - (0.9 + 0.8 + 0.6)) > 1e-9:
        failures.append("3×5 最优总分应为 2.3，实得 %.6f" % sum(s for _, _, s in rp))

    # 4) 5 行 3 列 → 只能指派 3 个，且不得抛异常
    checks += 1
    tall = [[0.5, 0.1, 0.2],
            [0.1, 0.9, 0.2],
            [0.2, 0.2, 0.8],
            [0.7, 0.1, 0.1],
            [0.1, 0.1, 0.1]]
    tp = hungarian_assign(tall)
    if len(tp) != 3:
        failures.append("5×3 应指派 3 个，实得 %d" % len(tp))

    # 5) 随机矩阵：匈牙利必须等于暴力枚举最优（100 组，2×2 ~ 5×5）
    rng = random.Random(20260920)
    for trial in range(100):
        n = rng.randint(2, 5)
        mat = [[round(rng.random(), 4) for _ in range(n)] for _ in range(n)]
        h_total = sum(s for _, _, s in hungarian_assign(mat))
        b_total = sum(s for _, _, s in brute_force_assign(mat))
        checks += 1
        if abs(h_total - b_total) > 1e-9:
            failures.append("随机第 %d 组：匈牙利 %.6f != 暴力最优 %.6f" % (trial, h_total, b_total))
            break

    # 6) 分差门槛：故意做一个 top1/top2 接近的矩阵，应判 low
    checks += 1
    close = [[0.90, 0.895],
             [0.20, 0.80]]
    rows = margin_report(close, hungarian_assign(close))
    weak = [r for r in rows if r["margin"] is not None and r["margin"] < 0.05]
    if not weak:
        failures.append("分差门槛未生效：%r" % (rows,))

    print("自检项：%d，失败：%d" % (checks, len(failures)))
    for f in failures:
        print("  FAIL", f)
    if not failures:
        print("  PASS assign_by_similarity")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
