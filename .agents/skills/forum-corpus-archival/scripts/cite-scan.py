#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""正文互链差集（forum-corpus-archival 技能脚本，见坑 94）。

扫「已归档正文」里出现的 `52pojie.cn/thread-<id>` 引用链接，取「未归档 ∧ 未入历史黑名单」的被引用帖。
长尾期命中率最高（~21%）、零网络成本。

用法：
  python cite-scan.py --ref docs/references --pool arts/pool.json \
         --root . --out studies/cite.json
  --pool 可选（只用于给候选补标题）；--block-glob 默认 artifacts/*/BLOCK*.json
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
from collections import defaultdict

LINK = re.compile(r"52pojie\.cn/thread-(\d{5,})")


def load_block(pattern):
    bl = set()
    for f in glob.glob(pattern):
        try:
            d = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        if isinstance(d, dict):
            bl |= {str(k) for k in d if re.fullmatch(r"\d{5,}", str(k))}
            bl |= {str(v["id"]) for v in d.values() if isinstance(v, dict) and str(v.get("id", "")).isdigit()}
        elif isinstance(d, list):
            for x in d:
                if isinstance(x, dict) and str(x.get("id", "")).isdigit():
                    bl.add(str(x["id"]))
                elif str(x).isdigit():
                    bl.add(str(x))
    return bl


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", required=True, help="语料目录（docs/references）")
    ap.add_argument("--root", default=".", help="用于解析 BLOCK glob 的根")
    ap.add_argument("--block-glob", default="artifacts/*/BLOCK*.json")
    ap.add_argument("--pool", default=None, help="全量池 json（可选，用于补标题）")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    arch = set()
    for f in os.listdir(a.ref):
        m = re.search(r"(\d{5,})", f)
        if m:
            arch.add(m.group(1))
    bl = load_block(os.path.join(a.root, a.block_glob))
    pool = json.load(open(a.pool, encoding="utf-8")) if a.pool else {}

    cited = defaultdict(set)
    nfile = 0
    for f in os.listdir(a.ref):
        if not f.endswith(".md") or f == "README.md":
            continue
        nfile += 1
        txt = open(os.path.join(a.ref, f), encoding="utf-8", errors="ignore").read()
        m = re.match(r"^.*?(\d{5,})", f)
        srcid = m.group(1) if m else "?"
        for mm in LINK.finditer(txt):
            tid = mm.group(1)
            if tid == srcid:
                continue
            cited[tid].add(srcid)

    notarch = {k: v for k, v in cited.items() if k not in arch}
    net = {k: v for k, v in notarch.items() if k not in bl}
    out = {k: {"title": pool.get(k, {}).get("title", ""), "in_pool": k in pool,
               "cited_by": sorted(v)} for k, v in net.items()}
    json.dump(out, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("归档文件 %d | 被引用唯一帖 %d | 未归档 %d | 净候选 %d（池外 %d）"
          % (nfile, len(cited), len(notarch), len(net),
             sum(1 for v in out.values() if not v["in_pool"])))


if __name__ == "__main__":
    main()
