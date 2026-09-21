#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通用语料库审计 / 终检。

用法:
  # 终检：ID 唯一性、空文件、薄文件、命名规范
  python audit-corpus.py --ref <语料目录>

  # 审计候选池：口径饱和度 + 潜在误杀 + 可能漏拣（A/B/C/D 表）
  python audit-corpus.py --ref <语料目录> --pool <pool.json> [--good-forum A,B] [--block-re <regex>] \
      [--strong-re <regex>] [--notweb-re <regex>]

  # 增量体检 / 扩容体检 / 黑名单误杀体检（可选）
  python audit-corpus.py ... --inc-pool <本轮池.json>          # E 表
  python audit-corpus.py ... --strong-new-re <新token正则>     # F 表
  python audit-corpus.py ... --block-ids 2026911,2054685       # G 表（见坑 18）

--pool 支持 dict(id->record) 或 list[record]，record 需含 id/title，forum 可选。
--good-forum 缺省时第二三张表按「forum 为空或不在 bad 列表」处理。
A/B 表需 --strong-re 与 --notweb-re 同时给出才启用。
"""
import argparse
import collections
import json
import os
import re
import sys


def load_pool(path):
    d = json.load(open(path, encoding="utf-8"))
    items = d.values() if isinstance(d, dict) else d
    out = {}
    for x in items:
        tid = str(x.get("id") or "").strip()
        if tid:
            out[tid] = {"id": tid, "title": x.get("title") or "",
                        "forum": x.get("forum") or ""}
    return out


def existing_ids(ref):
    ids = set()
    for f in os.listdir(ref):
        m = re.match(r"(?:[A-Za-z0-9_]+-)?(\d{5,})-?.*\.md$", f)
        if m:
            ids.add(m.group(1))
    return ids


def final_check(ref):
    files = [f for f in os.listdir(ref)
             if f.endswith(".md") and f.lower() != "readme.md"]
    ids = collections.defaultdict(list)
    noid, empty, thin = [], [], []
    for f in files:
        m = re.match(r"(?:[A-Za-z0-9_]+-)?(\d{5,})-(.*)\.md$", f)
        if m:
            ids[m.group(1)].append(f)
        else:
            noid.append(f)
        sz = os.path.getsize(os.path.join(ref, f))
        if sz < 400:
            empty.append((f, sz))
        elif sz < 1500:
            thin.append((f, sz))

    print("=" * 60)
    print("[终检] 文件总数(不含 README):", len(files))
    print("  ID 命名:", sum(len(v) for v in ids.values()), "| 无 ID:", len(noid))
    print("  唯一 ID 数:", len(ids))
    dups = {k: v for k, v in ids.items() if len(v) > 1}
    # 同一 ID 的「.验证报告.md」类附属文件不算重复
    real_dups = {k: v for k, v in dups.items()
                 if len([x for x in v if "验证报告" not in x]) > 1}
    print("  重复 ID(疑似):", len(real_dups))
    for k, v in sorted(real_dups.items()):
        print("    ", k, v)
    if dups and not real_dups:
        print("   （另有 %d 组主文+验证报告共用 ID，属预期）" % len(dups))
    print("  空文件(<400B):", len(empty))
    for f, s in empty:
        print("    ", s, f)
    print("  薄文件(<1500B):", len(thin))
    for f, s in thin:
        print("    ", s, f)
    if noid:
        print("  无 ID 文件:", len(noid))
        for f in noid:
            print("    ", f)
    return files


def audit_pool(ref, pool, good_forum, bad_forum, block_re, strong_re, notweb_re,
               inc_pools=(), strong_new_re="", block_ids=None):
    block_ids = block_ids or set()
    have = existing_ids(ref)
    un = [v for v in pool.values() if v["id"] not in have]
    print("\n" + "=" * 60)
    print("[池审计] 池:", len(pool), "| 已归档 ID:", len(have),
          "| 池中未归档:", len(un))

    blk = re.compile(block_re) if block_re else None
    strong = re.compile(strong_re, re.I) if strong_re else None
    notweb = re.compile(notweb_re, re.I) if notweb_re else None
    # 逆向/爬虫/加密类信号（用于「漏拣」与「forum 空盲区」两表）
    sig = re.compile(r"逆向|爬虫|爬取|采集|抓取|加密|解密|混淆|js|web|接口|协议|"
                     r"hook|sign|token|cookie|滑块|验证码|指纹|反爬|风控|参数|"
                     r"补环境|小程序|h5|vmp|wasm|抓包", re.I)

    def in_bad(fo):
        return any(b in fo for b in bad_forum)

    print("\n-- A. 口径仍会保留（应为 0；>0 说明抓取失败或口径与池不一致）--")
    n = 0
    if strong and notweb:
        for v in sorted(un, key=lambda x: -int(x["id"])):
            t, fo = v["title"], v["forum"]
            if not t or (blk and blk.search(t)):
                continue
            if in_bad(fo):
                continue
            if good_forum and fo and not any(g in fo for g in good_forum):
                continue
            if notweb.search(t) or not strong.search(t):
                continue
            print(f"  {v['id']}  {fo[:12]:14s} {t[:76]}")
            n += 1
    print("  count:", n)

    print("\n-- B. 被 NOTWEB 拦下但 STRONG 命中（潜在误杀，最值得看）--")
    n = 0
    if strong and notweb:
        for v in sorted(un, key=lambda x: -int(x["id"])):
            t, fo = v["title"], v["forum"]
            if blk and blk.search(t):
                continue
            if in_bad(fo):
                continue
            if not (strong.search(t) and notweb.search(t)):
                continue
            print(f"  {v['id']}  {fo[:12]:14s} {t[:76]}")
            n += 1
    print("  count:", n)

    print("\n-- C. 白名单版块内、有信号但 STRONG 未命中（可能漏拣）--")
    n = 0
    for v in sorted(un, key=lambda x: -int(x["id"])):
        t, fo = v["title"], v["forum"]
        if not fo or (good_forum and not any(g in fo for g in good_forum)):
            continue
        if in_bad(fo):
            continue
        if (strong and strong.search(t)) or (notweb and notweb.search(t)) \
                or (blk and blk.search(t)):
            continue
        if not sig.search(t):
            continue
        print(f"  {v['id']}  {fo[:12]:14s} {t[:76]}")
        n += 1
    print("  count:", n)

    print("\n-- D. forum 为空（Thread 来源）+ 有信号但 STRONG 未命中（盲区）--")
    print("    版块黑名单对 forum 为空的记录完全失效，本表用于抓回被放过的帖子")
    n = 0
    for v in sorted(un, key=lambda x: -int(x["id"])):
        t, fo = v["title"], v["forum"]
        if fo:
            continue
        if (strong and strong.search(t)) or (notweb and notweb.search(t)):
            continue
        if not sig.search(t):
            continue
        print(f"  {v['id']}  {t[:78]}")
        n += 1
    print("  count:", n)

    # —— E. 本轮增量来源体检（可选，需 --inc-pool）——
    if inc_pools:
        inc = {}
        for p in inc_pools:
            if not os.path.exists(p):
                print("  skip(missing):", p)
                continue
            inc.update(load_pool(p))
        inc_un = [v for v in inc.values() if v["id"] not in have]
        print("\n-- E. 本轮增量来源（--inc-pool）未归档项体检 --")
        print("    增量条目:", len(inc), "| 未归档:", len(inc_un))
        n = 0
        for v in sorted(inc_un, key=lambda x: -int(x["id"])):
            t = v["title"]
            if (notweb and notweb.search(t)) or (blk and blk.search(t)):
                continue
            if not sig.search(t):
                continue
            print(f"  {v['id']}  {v['forum'][:12]:14s} {t[:74]}")
            n += 1
        print("  count:", n)

    # —— F. 口径扩容增量（可选，需 --strong-new-re，见坑 15）——
    if strong_new_re:
        snew = re.compile(strong_new_re, re.I)
        print("\n-- F. 口径扩容增量（新 token 命中、旧口径落选；必须逐条抓正文复核）--")
        n = 0
        for v in sorted(un, key=lambda x: -int(x["id"])):
            t, fo = v["title"], v["forum"]
            if not t or (blk and blk.search(t)):
                continue
            if in_bad(fo):
                continue
            if good_forum and fo and not any(g in fo for g in good_forum):
                continue
            if (strong and strong.search(t)) or (notweb and notweb.search(t)):
                continue
            if not snew.search(t):
                continue
            print(f"  {v['id']}  {fo[:12]:14s} {t[:76]}")
            n += 1
        print("  count:", n)

    # —— G. 历史人工黑名单的潜在误杀（可选，需 --block-ids，见坑 18）——
    # 动机：人工黑名单是按「标题」判的，标题骗人时就会静默误杀真阳性，
    # 且**任何后续审计都不会再看到它**（A/B/C/D/E 表都把黑名单项当既定结论跳过）。
    if block_ids:
        print("\n-- G. 历史人工黑名单命中 + STRONG 命中 + NOTWEB 未命中（潜在历史误杀）--")
        print("    逐条抓正文复核；确认是真阳性的移入下一轮 ALLOW_EXTRA")
        n = 0
        for v in sorted(un, key=lambda x: -int(x["id"])):
            t, fo = v["title"], v["forum"]
            if v["id"] not in block_ids:
                continue
            if good_forum and fo and not any(g in fo for g in good_forum):
                continue
            if strong and not strong.search(t):
                continue
            if notweb and notweb.search(t):
                continue
            print(f"  {v['id']}  {fo[:12]:14s} {t[:72]}")
            n += 1
        print("  count:", n)
    return un


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", required=True, help="语料目录")
    ap.add_argument("--pool", help="候选池 json（dict 或 list）")
    ap.add_argument("--good-forum", default="", help="版块白名单，逗号分隔")
    ap.add_argument("--bad-forum", default="", help="版块黑名单，逗号分隔")
    ap.add_argument("--block-re", default="", help="人工黑名单标题正则")
    ap.add_argument("--strong-re", default="", help="标题强特征正则（启用 A/B 表）")
    ap.add_argument("--notweb-re", default="", help="反例正则（启用 A/B 表）")
    ap.add_argument("--inc-pool", default="",
                    help="本轮增量池 json 路径，逗号分隔（启用 E 表）")
    ap.add_argument("--strong-new-re", default="",
                    help="STRONG 扩容新增的 token 正则（启用 F 表，见坑 15）")
    ap.add_argument("--block-ids", default="",
                    help="历史人工黑名单 ID（逗号分隔或文件路径，启用 G 表，见坑 18）")
    a = ap.parse_args()

    if not os.path.isdir(a.ref):
        sys.exit("语料目录不存在: %s" % a.ref)
    final_check(a.ref)
    if a.pool:
        good = [s for s in a.good_forum.split(",") if s]
        bad = [s for s in a.bad_forum.split(",") if s]
        inc = [s for s in a.inc_pool.split(",") if s]
        # --block-ids 支持 "id,id" 或一个每行/id 的文本文件（兼容从 filter_*.py 提取）
        raw = a.block_ids.strip()
        if raw and os.path.isfile(raw):
            raw = open(raw, encoding="utf-8").read()
        bids = {x.strip() for x in re.findall(r"\d{5,}", raw)}
        audit_pool(a.ref, load_pool(a.pool), good, bad, a.block_re,
                   a.strong_re, a.notweb_re, inc, a.strong_new_re, bids)


if __name__ == "__main__":
    main()
