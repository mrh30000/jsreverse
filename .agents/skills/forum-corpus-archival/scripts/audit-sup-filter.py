#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""audit-sup-filter.py —— 把审计脚本（audit-corpus.py）的 B/G 表「精筛」成可用候选（零依赖）。

为什么需要它（SKILL.md 坑 57）：
  `audit-corpus.py` 的 **B 表（NOTWEB 误杀）** 与 **G 表（历史黑名单误杀）** 名义上是
  「口径外的召回通道」，但 **「STRONG 命中」只是必要条件，不是真阳性** ——
  实测 B∪G 去重后 2271 条里 99.5% 是「web 开发/工具类」与「通用爬虫教程」
  （web 服务器、WebDAV、小说爬取器、M3U8 下载器、CTF web 题解、求插件/课程/电子书…）。
  直接人工翻必漏必累，且不可复现。

四层收窄（本脚本实现，实测 2271 → 10）：
  ① 去重 + 排除 已归档 ∪ --exclude 列表 ∪ --exclude-bodies 目录 ∪ 求助版块；
  ② 必须含 **web 侧硬 token**（javascript/js/前端/网页/浏览器/h5/小程序/webpack/jsvmp/m3u8/爬虫/滑块/sign…）；
  ③ 排除 **web 开发/工具词**（web服务器/web端/web界面/webdav/vue/react/django…）；
  ④ 排除求助/下载器/教程/工具句式，且**要求动作词**（分析·逆向·解密·还原·破解·记录·实战）
     —— 本质是用「作者做了什么」过滤「作者在问什么」。

用法：
  python audit-corpus.py --ref docs/references --pool <pool.json> \\
      --good-forum ... --strong-re ... --notweb-re ... --block-re ... --block-ids ... \\
      > artifacts/x-fetch22/audit22.out
  python audit-sup-filter.py --audit artifacts/x-fetch22/audit22.out \\
      --pool artifacts/x-fetch22/pool_v22.json --ref docs/references \\
      --exclude "artifacts/*/BLOCK_EXTRA*.json" --exclude "artifacts/*/REVIEWED_NOISE.json" \\
      --exclude-bodies "artifacts/*/bodies*/" \\
      --out-json artifacts/x-fetch22/sup22.json --out-txt artifacts/x-fetch22/sup22.txt
"""
import argparse
import glob
import json
import os
import re

# —— ② web 侧硬 token（不含 web 开发/工具词）——
WEBHARD = re.compile(
    r"javascript|\bjs\b|js逆向|web逆向|逆向js|前端|网页|浏览器|h5|小程序|公众号|"
    r"webpack|jsvmp|扣代码|扣js|补环境|hook|反混淆|sourcemap|"
    r"m3u8|直播源|ts帧|drm|widevine|video解密|"
    r"爬虫|爬取|采集接口|cookie|token|滑块|验证码|极验|某验|易盾|数美|瑞数|"
    r"参数加密|加密参数|参数逆向|参数分析|sign|签名|登录算法|风控|反爬|指纹|"
    r"wasm|electron|asar|jsc|接口逆向|协议分析|报文", re.I)

# —— ③ web 开发/工具词（不是逆向）——
WEBTOOL = re.compile(r"web服务器|web端|web界面|web版|web通信|webdav|web ftp|网站搭建|"
                     r"小程序源码|源码分享|前端框架|vue|react|django|flask|spring", re.I)

# —— ④ 噪声句式 + 动作词 ——
NOISE = re.compile(r"求|求助|悬赏|请问|请教|有没有|哪里|哪位|大神|帮忙|推荐|寻找|寻个|谁有|找个|"
                   r"下载|资源|电子书|电子版|pdf|epub|书籍|教材|网盘|课程|教程|学习|资料|"
                   r"安装包|破解版|汉化|激活|注册机|序列号|授权|"
                   r"软件|工具分享|版本更新|更新日志|怎么|如何|为什么|无法|不能|报错|崩溃|"
                   r"下载器|下载工具|下载软件|工具[vV]?\d|新人|小白", re.I)
GOOD = re.compile(r"分析|逆向|解密|还原|破解|记录|实战|探索|研究|浅析|详解|剖析|学习笔记|思路", re.I)
REVERSE = re.compile("逆向|破解|加密|解密|签名|sign|参数|hook|补环境|风控|反爬|滑块|验证码|"
                     "token|cookie|抓包|扣代码|jsvmp|webpack|m3u8", re.I)

# —— ① 求助/闲聊版块（B/G 表里占绝大多数）——
BAD_FORUM = ("悬赏问答区", "『水漫金山』", "『福利经验』", "病毒分析区", "站务", "投诉",
             "建议", "休闲", "茶馆", "『精品软件区』", "讨论求助区", "『移动安全讨论求助区』")


def load_ids(patterns):
    out = set()
    for g in patterns or []:
        for f in glob.glob(g):
            try:
                d = json.load(open(f, encoding="utf-8"))
            except Exception:
                continue
            stack = [d]
            while stack:
                x = stack.pop()
                if isinstance(x, str):
                    if x.isdigit():
                        out.add(x)
                elif isinstance(x, list):
                    stack.extend(x)
                elif isinstance(x, dict):
                    if str(x.get("id", "")).isdigit():
                        out.add(str(x["id"]))
                    else:
                        stack.extend(x.values())
    return out


def archived_ids(ref):
    ids = set()
    for f in os.listdir(ref):
        # 坑 56：不要用字符类前缀（`[A-Za-z0-9_]+` 含数字），否则吃掉文件名首位数字
        m = re.search(r"(\d{5,})", f)
        if m and f.endswith(".md") and f.lower() != "readme.md":
            ids.add(m.group(1))
    return ids


def parse_tables(path, tables=("B", "G")):
    """从 audit-corpus.py 的输出里取出指定表的 ID（行格式: '  <id>  <forum>  <title>'）。"""
    ids, cur = [], None
    for ln in open(path, encoding="utf-8", errors="replace"):
        if re.match(r"^-- [A-G]\.", ln):
            cur = ln[3]
            continue
        if ln.strip().startswith("count:"):
            cur = None
            continue
        if cur in tables:
            m = re.match(r"\s+(\d{5,})\s+(.*)$", ln.rstrip("\n"))
            if m:
                ids.append((m.group(1), m.group(2)))
    return ids


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audit", required=True, help="audit-corpus.py 的输出文件")
    ap.add_argument("--pool", required=True)
    ap.add_argument("--ref", default="docs/references")
    ap.add_argument("--exclude", action="append", default=[])
    ap.add_argument("--exclude-bodies", action="append", default=[])
    ap.add_argument("--tables", default="B,G")
    ap.add_argument("--out-json", required=True)
    ap.add_argument("--out-txt", required=True)
    a = ap.parse_args()

    pool = json.load(open(a.pool, encoding="utf-8"))
    items = pool.values() if isinstance(pool, dict) else pool
    pt = {str(x.get("id")): x for x in items if isinstance(x, dict)}

    dead = archived_ids(a.ref) | load_ids(a.exclude)
    for g in a.exclude_bodies:
        for d in glob.glob(g):
            for f in os.listdir(d):
                dead.add(os.path.basename(f).split(".")[0])

    killed = dict(dead=0, badforum=0, webtool=0, noweb=0, noise=0)
    rows, seen = [], set()
    for tid, _ in parse_tables(a.audit, tuple(a.tables.split(","))):
        if tid in seen:
            continue
        seen.add(tid)
        if tid in dead:
            killed["dead"] += 1
            continue
        t = str((pt.get(tid) or {}).get("title") or "")
        fo = str((pt.get(tid) or {}).get("forum") or "")
        if not t:
            continue
        if any(b in fo for b in BAD_FORUM):
            killed["badforum"] += 1
            continue
        if WEBTOOL.search(t):
            killed["webtool"] += 1
            continue
        if not WEBHARD.search(t):
            killed["noweb"] += 1
            continue
        if NOISE.search(t) and not REVERSE.search(t):
            killed["noise"] += 1
            continue
        if not GOOD.search(t):
            killed["noise"] += 1
            continue
        rows.append({"id": tid, "tier": "S1", "title": t, "forum": fo})

    rows.sort(key=lambda r: -int(r["id"]))
    json.dump(rows, open(a.out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(a.out_txt, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("审计表精筛补充批: %d\n\n" % len(rows))
        for r in rows:
            fh.write("S1 %s [%s] %s\n" % (r["id"], r["forum"], r["title"]))
    print("表 %s 候选去重后 %d | 精筛后 %d | 剔除 %s"
          % (a.tables, len(seen), len(rows), killed))
    print("→ %s / %s" % (a.out_json, a.out_txt))


if __name__ == "__main__":
    main()
