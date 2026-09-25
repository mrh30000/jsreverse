#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""author-coverage.py —— 作者覆盖度审计（forum-corpus-archival 技能脚本，见坑 101）。

回答一个问题：**「≥N 篇归档作者」里，还有哪些没被历轮 author-scan 扫过？**

用法：
  python author-coverage.py --ref docs/references \
         --scanned artifacts/*/author_scan*.json \
         --min-arch 2 --out authors_todo.json

输入：
  --ref      语料目录（从每个 md 的头部 `> **作者**: X` 抽作者）
  --scanned  历轮 author-scan 结果（dict: author -> {...}），可传多个 / 通配
输出：
  未扫作者清单（含其已归档篇数），按篇数降序；同时打印覆盖率。

退出码：0 正常；2 参数错误。
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys

AUTHOR_RE = re.compile(r"^>\s*\*\*作者\*\*:\s*([^|]+?)\s*(?:\||$)", re.M)


def scan_authors(ref):
    """归档目录 → {author: [file, ...]}"""
    out = {}
    for f in sorted(os.listdir(ref)):
        if not f.endswith(".md") or f.lower() == "readme.md":
            continue
        try:
            head = open(os.path.join(ref, f), encoding="utf-8", errors="replace").read(4000)
        except OSError:
            continue
        m = AUTHOR_RE.search(head)
        if not m:
            continue
        out.setdefault(m.group(1).strip(), []).append(f)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", required=True)
    ap.add_argument("--scanned", nargs="*", default=[])
    ap.add_argument("--min-arch", type=int, default=2)
    ap.add_argument("--out", default=None)
    a = ap.parse_args()

    arch = scan_authors(a.ref)
    multi = {k: v for k, v in arch.items() if len(v) >= a.min_arch}

    scanned = set()
    for pat in a.scanned:
        for p in glob.glob(pat):
            try:
                scanned |= set(json.load(open(p, encoding="utf-8")))
            except Exception:
                pass

    todo = {k: v for k, v in multi.items() if k not in scanned}
    print("作者总数 %d | ≥%d 篇 %d | 历轮已扫 %d | 未扫 %d | 覆盖率 %.1f%%"
          % (len(arch), a.min_arch, len(multi), len(scanned), len(todo),
             100.0 * (len(multi) - len(todo)) / max(1, len(multi))))
    for k, v in sorted(todo.items(), key=lambda x: -len(x[1])):
        print("  %-16s n=%d  %s" % (k, len(v), v[0][:60]))
    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        json.dump(todo, open(a.out, "w", encoding="utf-8", newline="\n"),
                  ensure_ascii=False, indent=1)
        print("清单写入", a.out)


if __name__ == "__main__":
    main()
