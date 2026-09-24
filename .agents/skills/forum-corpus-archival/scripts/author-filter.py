#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""作者维度通道的候选筛选（forum-corpus-archival 技能脚本，见坑 99 / filter-rules 第十二层）。

缺口 = 主题 ID ∉ 已归档 ∪ 已归档黑名单 ∪ 全量池噪声(不适用) ，再叠标题信号 + 反例。
用法：python author-filter.py --scan author.json --block blk.json --ref docs/references --out need.txt
"""
from __future__ import annotations

import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

SIG = re.compile(
    r"逆向|javascript|\bjs\b|前端|网页|浏览器|接口|参数|签名|sign\b|token|hook|断点|抓包|加密|解密|"
    r"算法|验证码|滑块|cookie|m3u8|小程序|wasm|jsvmp|\bast\b|混淆|反混淆|补环境|websocket|爬虫|"
    r"a_bogus|h5st|字体|反爬|协议|webpack|扣代码|直链|播放|阿里|某里|猿人学|调试|指纹|风控",
    re.I)

NEG = re.compile(
    r"排序|并查集|线段树|最短路|最小生成树|Dijkstra|Kruskal|Prim|SPFA|Bellman|匈牙利|快速排序|归并|插入排序|"
    r"选择排序|数据结构|做题|题目|作业|求|求助|悬赏|请|如何|怎么|为什么|有没有|寻|找|消息|公告|招聘|"
    r"unidbg|frida|安卓|android|\bios\b|apk|smali|jadx|易语言|汇编|ida\b|\bod\b|壳|脱壳|外挂|"
    r"下载器|播放器|工具|成品|源码分享|绿色版|新手|入门教程|课程|培训|"
    r"心理|可视化|excel|vba|word|ncm|网易云", re.I)


def main():
    d = json.load(open(os.path.join(HERE, "author_scan35.json"), encoding="utf-8"))
    blk = set(json.load(open(os.path.join(HERE, "blk35.json"), encoding="utf-8")))
    arch = set()
    for f in os.listdir(os.path.join(ROOT, "docs", "references")):
        m = re.search(r"(\d{5,})", f)
        if m:
            arch.add(m.group(1))

    items = {}
    for a, v in d.items():
        for it in v.get("items", []):
            items.setdefault(it["id"], {"t": it["t"], "by": set()})["by"].add(a)

    gaps = {k: v for k, v in items.items() if k not in arch and k not in blk}
    web = {k: v for k, v in gaps.items() if SIG.search(v["t"]) and not NEG.search(v["t"])}

    print("作者 %d 位 | 主题 %d 唯一 | 未归档未黑名单 %d | 过信号门禁 %d"
          % (len(d), len(items), len(gaps), len(web)))
    rows = sorted(web.items(), key=lambda x: -len(x[1]["by"]))
    with open(os.path.join(HERE, "need_author35.txt"), "w", encoding="utf-8") as w:
        for k, v in rows:
            w.write("%s\t%s\t%s\n" % (k, "|".join(sorted(v["by"])), v["t"]))
    for k, v in rows:
        print("  %-9s %-58s by %s" % (k, v["t"][:58], ",".join(sorted(v["by"]))[:26]))
    print("\n清单写入 need_author35.txt（%d 条）" % len(rows))


if __name__ == "__main__":
    main()
