#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""验证码轨迹**容器**编解码：把「轨迹点」和「提交字段」互转（零依赖）。

为什么单独做这件事
------------------
各厂商提交的"轨迹"字段，**差别主要在容器（怎么把点串起来）**，而不在点本身。
判错容器的典型症状是"算法全对但服务端说轨迹不合法"，而且**不报错、只失败**。
本脚本把已实测过的容器做成可复现的编解码器，用来做三件事：

1. **对拍**：拿浏览器真实值当 oracle，`decode` 出来看与你的点点列表是否逐点相同；
2. **生成**：`encode` 出与浏览器同形的字符串（点由 `scripts/generate_motion_track.py` 产）；
3. **判型**：`identify` 从一个提交值反推它属于哪个容器族。

已收录容器（均有明确出处）
--------------------------
| 名称 | 形态 | 出处 |
| --- | --- | --- |
| `kuaishou-comma` | `x|y|Δt` 用 `,` 连接；**原始值**是 `"," + join`，提交前 `.slice(1)` 去掉首逗号 | `52pojie-1697353`（快手 `verifyParam` 的 `c`） |
| `aliyun-tracklist` | 对象：`TrackList.mp/mm` 为 `x,y,t,f|…`；外层带 `TrackStartTime/VerifyTime/arg` | `52pojie-1982617`（某云无感滑块） |

**不收录**：`si` 这类语义未明的字段（原文只给了一个观测值，未给出含义）——
一律当**透传字符串**处理，不允许臆造公式。
"""

from __future__ import annotations

import argparse
import json
import os
import sys

EXIT_OK = 0
EXIT_UNKNOWN = 3
EXIT_USAGE = 2
EXIT_INVALID = 4


# --------------------------------------------------------------------------- #
# 快手：x|y|Δt 逗号连接（原始值带前导逗号）
# --------------------------------------------------------------------------- #

def kuaishou_encode(points, keep_leading_comma: bool = False, limit_last: int = 0) -> str:
    """points: [[x, y, t], …]（t 为绝对时间戳，秒/毫秒均可，只要求同单位）。

    参考实现（原文扣出的 JS）：

        let r = t.trajectory[0] ? t.trajectory[0][2] : 0
        let c = t.trajectory.slice(-100).reduce(function (n, t) {
          return n + ',' + t[0] + '|' + t[1] + '|' + (t[2] - r)
        }, '')
        // 提交的是 c.slice(1)
    """
    pts = list(points)
    if not pts:
        raise ValueError("轨迹点为空")
    # 注意：t0 取的是**原列表**首点（原文里 `r = t.trajectory[0][2]` 在 slice(-100) **之外**），
    # 所以"只取最后 N 点"时 dt 仍然相对**整个轨迹的起点**，不是相对被截断后的首点。
    t0 = pts[0][2]
    if limit_last:
        pts = pts[-limit_last:]
    body = ",".join("%s|%s|%s" % (p[0], p[1], p[2] - t0) for p in pts)
    return ("," + body) if keep_leading_comma else body


def kuaishou_decode(text: str, t0=None) -> list:
    body = text[1:] if text.startswith(",") else text
    out = []
    for group in body.split(","):
        if not group:
            continue
        parts = group.split("|")
        if len(parts) < 3:
            raise ValueError("kuaishou 容器每段应为 x|y|dt，收到 %r" % group)
        dt = int(parts[2])
        out.append([int(parts[0]), int(parts[1]), (t0 + dt) if t0 is not None else dt])
    return out


# --------------------------------------------------------------------------- #
# 阿里云验证码 2.0：TrackList（x,y,t,f 四元组，pipe 串）
# --------------------------------------------------------------------------- #

def _quad_join(points, t0) -> str:
    return "|".join("%s,%s,%s,1" % (p[0], p[1], p[2] - t0) for p in points)


def aliyun_tracklist(points, si: str, start_time: int, verify_time: int, arg: str = "") -> dict:
    """构造 TrackList。

    实测结构（`1982617`）：

        TrackList.mc  = "597,308,15083, ,1"   ← 起点（第三个字段是相对 startTime 的 ms）
        TrackList.mp  = "x,y,t,1|x,y,t,1|…"   ← 移动轨迹（长）
        TrackList.mm  = 同 mp 的尾部子集
        TrackList.te/tc/mu/tmv/ks/fi = ""     ← 空串占位
        TrackList.si  = "1393,3440,1271,1393,1271,1392,1440,154.55950543806017,3440"
        TrackStartTime / VerifyTime / arg
    """
    pts = list(points)
    if not pts:
        raise ValueError("轨迹点为空")
    t0 = pts[0][2]
    first = pts[0]
    return {
        "TrackList": {
            "mc": "%s,%s,%s, ,1" % (first[0], first[1], first[2] - start_time),
            "tc": "", "mu": "", "te": "",
            "mp": _quad_join(pts, t0),
            "tmv": "",
            "mm": _quad_join(pts[-40:], t0),
            "ks": "", "fi": "",
            "startTime": start_time,
            "si": si,
        },
        "TrackStartTime": start_time,
        "VerifyTime": verify_time,
        "arg": arg,
    }


def aliyun_decode(joined: str) -> list:
    out = []
    for group in joined.split("|"):
        if not group:
            continue
        parts = group.split(",")
        if len(parts) < 3:
            raise ValueError("aliyun 四元组应为 x,y,t,f，收到 %r" % group)
        out.append([int(parts[0]), int(parts[1]), int(parts[2])])
    return out


# --------------------------------------------------------------------------- #
# 判型
# --------------------------------------------------------------------------- #

def identify(text: str) -> str:
    if "|" in text and "~" not in text:
        groups = [g for g in text.split(",") if g]
        if all(len(g.split("|")) == 3 for g in groups):
            return "kuaishou-comma"
    if "|" in text:
        groups = [g for g in text.split("|") if g]
        if all(len(g.split(",")) >= 4 for g in groups):
            return "aliyun-tracklist(mp/mm)"
    return "unknown"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="验证码轨迹容器编解码（零依赖）")
    ap.add_argument("--selftest", action="store_true")
    sub = ap.add_subparsers(dest="cmd")

    p1 = sub.add_parser("identify", help="从提交值反推容器族")
    p1.add_argument("--value", required=True)

    p2 = sub.add_parser("decode", help="容器串 → 点列表")
    p2.add_argument("--format", choices=["kuaishou-comma", "aliyun-tracklist"], required=True)
    p2.add_argument("--value", required=True)
    p2.add_argument("--t0", type=int, help="首个点的绝对时间戳（给了就还原绝对时间）")

    p3 = sub.add_parser("encode", help="点列表（JSON）→ 容器串")
    p3.add_argument("--format", choices=["kuaishou-comma", "aliyun-tracklist"], required=True)
    p3.add_argument("--points", required=True, help='[[x,y,t],…] 或 {"points":[…]}')
    p3.add_argument("--raw-comma", action="store_true", help="保留前导逗号（浏览器里的原始 c）")
    p3.add_argument("--limit-last", type=int, default=0, help="只取最后 N 点（原文是 slice(-100)）")
    p3.add_argument("--si", default="", help="aliyun si 字段（语义未明，原样透传）")
    p3.add_argument("--start-time", type=int, default=0)
    p3.add_argument("--verify-time", type=int, default=0)
    args = ap.parse_args(argv)

    if args.selftest:
        return _selftest()

    if args.cmd == "identify":
        kind = identify(args.value)
        print(kind)
        return EXIT_OK if kind != "unknown" else EXIT_UNKNOWN

    if args.cmd == "decode":
        try:
            if args.format == "kuaishou-comma":
                pts = kuaishou_decode(args.value, args.t0)
            else:
                pts = aliyun_decode(args.value)
        except ValueError as exc:
            print("解析失败：%s" % exc)
            return EXIT_INVALID
        print(json.dumps({"format": args.format, "points": len(pts), "head": pts[:5]},
                         ensure_ascii=False, indent=2))
        return EXIT_OK

    if args.cmd == "encode":
        if os.path.exists(args.points):
            with open(args.points, encoding="utf-8") as fh:
                raw = json.load(fh)
        else:
            raw = json.loads(args.points)
        pts = raw["points"] if isinstance(raw, dict) else raw
        if args.format == "kuaishou-comma":
            print(kuaishou_encode(pts, args.raw_comma, args.limit_last))
        else:
            print(json.dumps(aliyun_tracklist(pts, args.si, args.start_time, args.verify_time),
                             ensure_ascii=False))
        return EXIT_OK

    ap.print_help()
    return EXIT_USAGE


# --------------------------------------------------------------------------- #
# 自检：用原文的**真实轨迹**做夹具
# --------------------------------------------------------------------------- #

# 来源：52pojie-1697353 里从浏览器直接复制的 trajectory（原样保留，未做任何加工）
KUAISHOU_FIXTURE = [
    [0, 22, 1664078425847], [7, 22, 1664078425857], [25, 20, 1664078425864], [50, 18, 1664078425875],
    [79, 17, 1664078425881], [108, 15, 1664078425891], [141, 13, 1664078425898], [170, 11, 1664078425904],
    [199, 9, 1664078425911], [228, 8, 1664078425918], [257, 7, 1664078425926], [289, 5, 1664078425934],
    [315, 4, 1664078425942], [333, 3, 1664078425950], [355, 3, 1664078425958], [369, 3, 1664078425966],
    [384, 3, 1664078425976], [398, 3, 1664078425985], [413, 3, 1664078425990], [423, 3, 1664078425997],
    [431, 3, 1664078426007], [438, 3, 1664078426014], [449, 3, 1664078426023], [452, 3, 1664078426030],
    [456, 3, 1664078426036], [460, 3, 1664078426044], [467, 3, 1664078426052], [471, 3, 1664078426211],
]


def _selftest() -> int:
    import subprocess
    fails = []
    seen = []

    def ok(cond, label):
        seen.append(label)
        if not cond:
            fails.append(label)

    # 1) 快手：原文的 reduce 语义必须与"逗号 join"等价，且提交值是 slice(1)
    body = kuaishou_encode(KUAISHOU_FIXTURE)
    raw = kuaishou_encode(KUAISHOU_FIXTURE, keep_leading_comma=True)

    def ref_reduce(pts, limit=100):
        """独立转录原文那段 JS（不是调用本文件的正向编码）：用于双实现互证。"""
        r = pts[0][2] if pts else 0
        n = ""
        for t in pts[-limit:]:
            n = n + "," + str(t[0]) + "|" + str(t[1]) + "|" + str(t[2] - r)
        return n[1:]

    ok(ref_reduce(KUAISHOU_FIXTURE) == body, "双实现互证：原文 reduce+slice(1) == 逗号 join")
    ok(raw == "," + body, "快手原始 c = 逗号 + join（slice(1) 后才是提交值）")
    ok(body.startswith("0|22|0,"), "快手首段 dt 必须相对首点（实测 0|22|0）")
    ok(body.endswith("471|3|364"), "快手末段 dt 实测为 364（相对首点，不是相邻点差）")
    ok(body.count("|") == 2 * len(KUAISHOU_FIXTURE), "快手每段恰好 2 个分隔符（x|y|dt）")
    ok(body.split(",")[1] == "7|22|10", "快手第二段实测为 7|22|10")

    # 2) 快手往返（带 t0 还原绝对时间）
    pts = kuaishou_decode(body, t0=KUAISHOU_FIXTURE[0][2])
    ok(pts == KUAISHOU_FIXTURE, "快手 decode(encode) 必须逐点等于真实夹具")

    # 3) slice(-100) 语义：夹具只有 28 点，limit 大于全长时不应丢点
    ok(kuaishou_encode(KUAISHOU_FIXTURE, limit_last=100) == body, "limit-last 大于点数时不丢点")
    ok(kuaishou_encode(KUAISHOU_FIXTURE, limit_last=2) == "467|3|205,471|3|364",
       "limit-last=2 只保留最后两点，且 dt 仍相对全轨迹首点")
    ok(ref_reduce(KUAISHOU_FIXTURE, limit=2) == "467|3|205,471|3|364", "截断语义与原文 reduce 一致")

    # 4) aliyun TrackList：结构与空串占位必须齐全
    st = 1664078425832          # 取与夹具同时钟的起点，才能验证"相对差值"口径
    tl = aliyun_tracklist(KUAISHOU_FIXTURE, si="1393,3440,1271", start_time=st,
                          verify_time=st + 15232, arg="ak0haTIeEhFPZD69TgF/NhZ+Qn2WFvAlZZ8OCRkY")
    ok(set(tl) == {"TrackList", "TrackStartTime", "VerifyTime", "arg"}, "aliyun 外层字段齐全")
    inner = tl["TrackList"]
    ok(set(inner) == {"mc", "tc", "mu", "te", "mp", "tmv", "mm", "ks", "fi", "startTime", "si"},
       "aliyun TrackList 字段齐全（含 7 个空串占位）")
    ok(inner["tc"] == "" and inner["mu"] == "" and inner["te"] == "" and inner["tmv"] == ""
       and inner["ks"] == "" and inner["fi"] == "", "未明字段一律空串，不臆造")
    ok(inner["mc"] == "0,22,15, ,1", "aliyun mc = 首点相对 startTime（实测形态 x,y,t,空格,1）")
    ok(inner["mp"].count("|") == len(KUAISHOU_FIXTURE) - 1, "aliyun mp 段数")
    expect_mp = [[p[0], p[1], p[2] - KUAISHOU_FIXTURE[0][2]] for p in KUAISHOU_FIXTURE]
    ok(aliyun_decode(inner["mp"]) == expect_mp, "aliyun mp 往返（相对首点毫秒，逐点一致）")
    ok(aliyun_decode(inner["mm"]) == expect_mp[-40:], "aliyun mm 是 mp 的尾部子集")

    # 5) 判型：两个族的真实串都要认出来，且不要互相误判
    ok(identify(body) == "kuaishou-comma", "判型：快手串")
    ok(identify(inner["mp"]) == "aliyun-tracklist(mp/mm)", "判型：aliyun mp 串")
    ok(identify("hello world") == "unknown", "判型：普通文本必须 unknown")
    ok(identify("1|2|3,4|5|6") == "kuaishou-comma", "判型：最小快手串")

    # 6) 失败分支：坏输入必须报错而不是"猜一个"
    for bad, label in (("1|2", "快手段缺字段"), ("a,b,c,d", "aliyun 段非数字")):
        try:
            (kuaishou_decode if "|" not in bad or bad.count("|") == 1 else aliyun_decode)(bad)
            ok(False, "坏输入必须抛错：%s" % label)
        except ValueError:
            pass

    # 7) CLI 契约
    with tempfile_dir() as tmp:
        import os
        p = os.path.join(tmp, "points.json")
        with open(p, "w", encoding="utf-8") as fh:
            json.dump({"points": KUAISHOU_FIXTURE}, fh)
        rc = _run_cli(["encode", "--format", "kuaishou-comma", "--points", p])
        ok(rc == 0, "CLI encode 退出码 0（实际 %s）" % rc)
        out = _run_cli_out(["encode", "--format", "kuaishou-comma", "--points", p])
        ok(out.strip() == body, "CLI encode 产物与函数一致")
        rc = _run_cli(["identify", "--value", "not-a-track"])
        ok(rc == EXIT_UNKNOWN, "CLI identify 未识别必须返回 3（实际 %s）" % rc)

    print("trajectory_codec --selftest：%d 项断言，失败 %d" % (len(seen), len(fails)))
    for f in fails:
        print("  ✗ %s" % f)
    return 1 if fails else 0


class tempfile_dir:
    def __enter__(self):
        import tempfile
        self._t = tempfile.TemporaryDirectory()
        return self._t.name

    def __exit__(self, *a):
        self._t.cleanup()
        return False


def _run_cli(argv) -> int:
    import os
    import subprocess
    proc = subprocess.run([sys.executable, os.path.abspath(__file__)] + argv,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return proc.returncode


def _run_cli_out(argv) -> str:
    import os
    import subprocess
    proc = subprocess.run([sys.executable, os.path.abspath(__file__)] + argv,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return proc.stdout.decode("utf-8", "replace")


if __name__ == "__main__":
    sys.exit(main())
