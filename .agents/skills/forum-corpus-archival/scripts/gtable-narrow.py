#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""G 表（历史黑名单）体检 · 第一段：标题级两段式收窄（forum-corpus-archival 技能脚本）。

背景（见 SKILL.md 坑 111/112）：黑名单是「**当时口径**」的函数，不是「领域」的函数 ——
口径一扩（例如从「只收 web」扩到「含 App/so 接口层」），旧黑名单立刻变成系统性误杀源，
且历轮审计发现不了（审计把旧名单当「已判定」）。⇒ **每次口径扩大后必须重跑本脚本**。

本脚本只做第一段（零成本）：
  黑名单并集  →  标题级「强信号 POS ∧ ¬(求助/工具/教程/招聘/小白/入门/下载/安装/配置/报错)」收窄
  →  区分 local（历轮 `bodies*` 已有正文，**读本地即可，不发请求**）与 remote（需新抓）

第二段用 `gtable-body.py` 做正文度量排序。

用法：
  python gtable-narrow.py --ref docs/references --pool artifacts/<p>/pool_v<N>.json \
      --block-glob "artifacts/<p>-fetch*/BLOCK_EXTRA*.json" \
      --bodies-glob "artifacts/<p>-fetch*/bodies*" \
      --out-prefix artifacts/<p>-fetch<N>/gtable<N>
输出：<out-prefix>_titles.json（id→标题）/ _remote_ids.txt / 控制台分档清单。
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re

# 「现口径」强信号：协议/接口层的签名·加密参数·响应解密（含 App/so 层）
STRONG = re.compile(
    r"js逆向|web逆向|补环境|扣代码|jsvmp|jsdom|webpack|\bast\b|瑞数|极验|数美|顶象|易盾|akamai|cloudflare|"
    r"五秒盾|jsl\b|acw|sign|签名|加密参数|参数逆向|参数分析|参数还原|签名逆向|响应解密|请求加密|封包|"
    r"x-bogus|a_bogus|h5st|zp_stoken|mns|_signature|接口逆向|协议逆向|hook cookie|cookie hook|"
    r"小程序逆向|wxapkg|electron|asar|js混淆|ast反混淆|ast还原|滑块|字体反爬|字体加密|反爬|直链|真实地址", re.I)
# 排除：求助 / 工具成品 / 教程 / 招聘 / 纯环境搭建
NEG = re.compile(
    r"求助|求[一一个两几]|请教|怎么办|如何|怎么|大佬|有没有|哪个|问下|问题|求解|答疑|悬赏|招聘|急招|"
    r"招[聘人]|求推荐|小白|入门|教程|视频|课程|资料|工具|源码分享|成品|软件|下载器|解析工具|一键|"
    r"助手|脚本分享|油猴脚本|签到|答题|刷课|挂机|安装|配置|报错|失败|无法|不能用|讨论|思路|基础|笔记|学习", re.I)


def block_union(pattern):
    """兼容历轮 BLOCK 三种格式（dict 键=ID / dict 键=标题 / list[dict] / list[str]）。"""
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
    ap.add_argument("--ref", required=True, help="语料目录")
    ap.add_argument("--pool", required=True, help="全量池 json（{id:{title,...}}）")
    ap.add_argument("--block-glob", required=True)
    ap.add_argument("--bodies-glob", required=True, help="历轮已抓正文目录 glob")
    ap.add_argument("--out-prefix", required=True)
    ap.add_argument("--strong-re", default=None, help="覆盖内置强信号正则")
    ap.add_argument("--notweb-re", default=None, help="覆盖内置排除正则")
    a = ap.parse_args()

    strong = re.compile(a.strong_re, re.I) if a.strong_re else STRONG
    neg = re.compile(a.notweb_re, re.I) if a.notweb_re else NEG

    pool = json.load(open(a.pool, encoding="utf-8"))
    blk = block_union(a.block_glob)
    arch = {m.group(1) for f in os.listdir(a.ref)
            if (m := re.search(r"(?:[a-z0-9]+-)?(\d{5,})-?.*\.md$", f))}
    have = {}
    for d in glob.glob(a.bodies_glob):
        if not os.path.isdir(d):
            continue
        for f in os.listdir(d):
            if f.endswith(".md"):
                have.setdefault(f[:-3], os.path.basename(d))

    res = []
    for i, src in blk.items():
        t = pool.get(i, {}).get("title", "")
        if not t or i in arch:
            continue
        if strong.search(t) and not neg.search(t):
            res.append((i, t))
    loc = [r for r in res if r[0] in have]
    remote = [r for r in res if r[0] not in have]
    print("黑名单并集 %d 条（%d 文件）| 归档 %d" % (len(blk), len(glob.glob(a.block_glob)), len(arch)))
    print("标题级收窄（现口径强信号 ∧ ¬求助/工具/教程）: %d" % len(res))
    print("  ├ 本地已有正文（零请求，直接读）: %d" % len(loc))
    print("  └ 需新抓                    : %d" % len(remote))
    for i, t in sorted(loc):
        print("  [LOCAL %s] %s | %s" % (have[i], i, t))
    for i, t in sorted(remote):
        print("  [REMOTE]    %s | %s" % (i, t))

    json.dump({i: t for i, t in sorted(res)}, open(a.out_prefix + "_titles.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    with open(a.out_prefix + "_remote_ids.txt", "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(i for i, _ in sorted(remote)) + "\n")
    print("输出：%s_titles.json / %s_remote_ids.txt" % (a.out_prefix, a.out_prefix))


if __name__ == "__main__":
    main()
