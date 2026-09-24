#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""历轮黑名单并集抽取器（forum-corpus-archival 技能脚本）。

为什么需要：历轮 BLOCK_EXTRA*.json 有三种格式（见坑 96），只读 dict 会漏掉一半。
统一吃：dict 键=ID / dict 键=标题（取 value["id"]）/ list[dict]（取 ["id"]）/ list[str]。

用法：
  python block-union.py --root . --glob "artifacts/<platform>-*/BLOCK*.json" --out blk.json
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re


def block_union(pattern):
    bl = {}
    for f in glob.glob(pattern):
        try:
            d = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        items = []
        if isinstance(d, dict):
            for k, v in d.items():
                if re.fullmatch(r"\d{5,}", str(k)):
                    items.append(str(k))
                if isinstance(v, dict) and str(v.get("id", "")).isdigit():
                    items.append(str(v["id"]))
        elif isinstance(d, list):
            for x in d:
                if isinstance(x, dict) and str(x.get("id", "")).isdigit():
                    items.append(str(x["id"]))
                elif str(x).isdigit():
                    items.append(str(x))
        for k in items:
            bl.setdefault(k, os.path.basename(f))
    return bl


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--glob", default="artifacts/*/BLOCK*.json")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    pat = os.path.join(a.root, a.glob)
    bl = block_union(pat)
    print("黑名单并集: %d（来源 %d 个文件）" % (len(bl), len(glob.glob(pat))))
    if a.out:
        json.dump(bl, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
