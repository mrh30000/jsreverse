#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""系列名差集（forum-corpus-archival 技能脚本）—— 从论坛全量池里捞出「同系列但未归档」的帖子。

两种模式，**互为正交，建议都跑**：

  --mode struct   结构法：在首个「编号标记」处截断标题取前缀 + 提取 `《》【】` 内的书名/系列名。
                  覆盖 `XXX（一）` / `XXX 第N讲` / `XXX之N` / `《JavaScript AST其实很简单》一、…`。

  --mode ngram    反向法（坑 88 必做）：反过来从**已归档标题**里抽 n-gram 当「系列名候选」，
                  再去全量池找**未归档**的同族标题。覆盖结构法漏掉的形态：
                    · 引号书名      …"消灭病毒"无限邀请
                    · 方括号系列名  [油猴脚本开发指南]实战…
                    · 只在续篇出现的系列名  Fiddler大解析！…真的可以为所欲为。

关键参数（坑 90/91，别乱调）：
  --min-arch 2 --max-arch 6   系列名必须出现在 2~6 篇已归档标题里（<2 孤例，>6 通用词）
  --min-len 5                 系列名最短 5 字符
  --only-archived-gap         只看「既已有归档成员、又还有空缺」的组 —— **命中率最高的子集**

用法：
  python series-diff.py --mode both --pool artifacts/52pojie-fetch32/pool_v32.json \\
         --ref docs/references --out artifacts/52pojie-fetch32/series_gap
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
from collections import defaultdict

# ---------------------------------------------------------------- 常量

# 编号标记：在其首次出现处截断标题，取前缀作为系列名
NUM_MARK = re.compile(
    r"[（(【\[]\s*[一二三四五六七八九十百千\d]{1,4}\s*[)）】\]]"
    r"|第\s*[一二三四五六七八九十百千\d]{1,4}\s*[讲课篇部章节期回集弹]"
    r"|之\s*[一二三四五六七八九十百千\d]{1,3}"
    r"|(?:^|[^\dA-Za-z])\d{1,2}\s*[、.．，,：:\-—]"
    r"|[A-Za-z]{0,3}\s*EP?\s*\d{1,3}(?![A-Za-z0-9])"
    r"|No\.?\s*\d{1,3}"
    r"|[一二三四五六七八九十]\s*[、.．]"
)
BRACKET = re.compile(r"[《【]([^》】]{2,40})[》】]")
SERIES_WORD = re.compile(r"(系列|合集|连载|大讲堂|其实很简单|小白讲解|从入门到|入门到精通)")
CLEAN = re.compile(r"[\s\-—_·:：,，。.!！?？\"'“”‘’/\\|~（）()【】\[\]《》]+")
CJK_RUN = re.compile(r"[\u4e00-\u9fa5]+")
LAT_RUN = re.compile(r"[A-Za-z][A-Za-z0-9_]{3,}")

# web 逆向信号（宽松；含中文子串版本，不依赖 \b —— 坑 51/84）
WEBSIG = re.compile(
    r"js逆向|web逆向|javascript|jsvmp|vmp|补环境|环境检测|环境补全|"
    r"ast|反混淆|混淆|控制流|平坦化|插桩|字节码|opcode|"
    r"滑块|验证码|captcha|点选|极验|某验|易盾|数美|瑞数|加速乐|顶象|"
    r"加密参数|参数加密|参数逆向|参数分析|加密入口|算法还原|签名算法|sign|验签|"
    r"wasm|webassembly|反爬|反调试|指纹|hook|扣代码|扣js|免扣|"
    r"webpack|protobuf|akamai|cloudflare|h5st|bogus|acw_sc|zp_stoken|"
    r"油猴|userscript|浏览器扩展|crx|electron|asar|小程序|wxapkg|"
    r"m3u8|hls|直播源|drm|widevine|直链|mediasource|"
    r"字体反爬|canvas|webgl|抓包|协议逆向|接口|token|cookie|js\b", re.I)
NEGWEB = re.compile(
    r"安卓|android|\bapk\b|frida|unidbg|jadx|smali|ollvm|x64dbg|ollydbg|"
    r"idapro|ios|iphone|flutter|unity|易语言|按键精灵|远控|木马|病毒|勒索|外挂|辅助|"
    r"网盘运营|短视频运营|自媒体|考研|电子书|书籍|小说|电影|电视剧|壁纸", re.I)

# 组级噪声闸门（坑 89）：发帖前缀标签 / 软件发布帖
TAG_KEY = re.compile(
    r"^(逆向|破解|加密|解密|分析|教程|学习|新手|小白|系列|入门|实战|分享|笔记|总结|记录|更新|搬运|转载|"
    r"源码|工具|软件|资源|福利|活动|公告|讨论|建议|原创|原创源码|原创发布|首发|求助|开源|已更新|已解决|"
    r"申请通过|全网首发|已失效|已完结|未完成|伪原创|转帖|带源码|有源码|已开源|更新|已更新|转自看雪|"
    r"python|python3|java|php|c\+\+|c#|golang|rust|vc|net|js|javascript|web|html|css|"
    r"vmprotect|vmp|exeinfo|exeinfope|snipaste|autojs|fastcopy|typora|wireshark)$", re.I)
VERSIONISH = re.compile(r"\d+\.\d+")
PRODUCTISH = re.compile(r"工具|下载器|播放器|绿色版|汉化|安装版|简体中文|官方版|便携版|破解版|"
                        r"^v\d|VIP|激活|注册机|补丁|客户端|浏览器$|编辑器|模拟器")
GENERIC_NGRAM = set("""
一个简单的 个简单的 一个简单 简单分析 算法分析 视频下载 下载地址 下载链接 逆向分析 逆向破解 逆向工程
逆向学习 逆向入门 逆向工具 加密解密 加密方式 加密算法 学习笔记 学习记录 记录一次 详细教程 手把手教
原理分析 分析过程 分析报告 解决方案 的小程序 浏览器插件 破解思路 加密与解密 视频解析 破解教程
吾爱破解 百度网盘 油猴脚本 网易云音乐 酷狗音乐 QQ音乐 新浪微博 微信小程序 抖音小程序 抖音直播
selenium javascript chrome cookie websocket python java 继续教育 验证码识别 游戏破解
""".split())


# ---------------------------------------------------------------- 工具

def pool_titles(path):
    d = json.load(open(path, encoding="utf-8"))
    return {k: (v.get("title") or "", v.get("forum", "")) for k, v in d.items()}


def archived(ref_dir):
    """返回 (ID 集合, 标题列表)。支持 `52pojie-<id>-<标题>.md` 与 `<id>-<slug>.md`。"""
    ids, titles = set(), []
    for f in os.listdir(ref_dir):
        if not f.endswith(".md") or f == "README.md":
            continue
        m = re.search(r"(\d{5,})", f)
        if not m:
            continue
        ids.add(m.group(1))
        t = re.sub(r"\.md$", "", f)
        t = re.sub(r"^\d{5,}-", "", t)
        t = re.sub(r"^52pojie-", "", t)
        t = re.sub(r"^csdn-\d+-", "", t)
        titles.append(t)
    return ids, titles


def struct_keys(title):
    """结构法：返回该标题归属的系列名集合。"""
    ks = set()
    for m in BRACKET.finditer(title):
        ks.add(CLEAN.sub("", m.group(1)))
    cut = len(title)
    m = NUM_MARK.search(title)
    if m:
        cut = min(cut, m.start())
    if cut < len(title):
        pre = CLEAN.sub("", title[:cut])
        if len(pre) >= 2:
            ks.add(pre)
    m = SERIES_WORD.search(title)
    if m and m.start() >= 2:
        pre = CLEAN.sub("", title[:m.start()])
        if len(pre) >= 2:
            ks.add(pre)
    elif m:
        ks.add(CLEAN.sub("", title))
    return {k[:40] for k in ks if 2 <= len(k) <= 40 and not TAG_KEY.match(k)}


def ngram_terms(title, nmin=4, nmax=8):
    """反向法切分：CJK 连续串取 n-gram；拉丁取**整词**（不做字符级 n-gram）。"""
    t = CLEAN.sub("", title)
    out = set()
    for run in CJK_RUN.findall(t):
        for n in range(nmin, nmax + 1):
            for i in range(len(run) - n + 1):
                out.add(run[i:i + n])
    out |= set(LAT_RUN.findall(t))
    return out


def dump(path, groups, note):
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("# %s\n" % note)
        for key, tot, items in groups:
            fh.write("\n### %s  (组内 %d / 候选 %d)\n" % (key, tot, len(items)))
            for tid, title, forum in sorted(items, key=lambda z: -int(z[0])):
                fh.write("%s\t%s\t%s\n" % (tid, forum, title))


# ---------------------------------------------------------------- 模式

def mode_struct(pool, arch_ids, arch_titles, out, only_gap):
    # 已归档标题也走一遍结构法，得到「已有归档成员的系列名」集合（坑 90）
    arch_keys = set()
    if only_gap:
        for t in arch_titles:
            arch_keys |= struct_keys(t)
    groups = defaultdict(list)
    for tid, (title, forum) in pool.items():
        if not title or tid in arch_ids:
            continue
        for k in struct_keys(title):
            groups[k].append((tid, title, forum))
    rows = []
    for k, items in groups.items():
        ids = {x[0] for x in items}
        if len(ids) < 2 or TAG_KEY.match(k):
            continue
        if only_gap and k not in arch_keys:      # 只看「既已有归档成员、又还有空缺」的组
            continue
        if PRODUCTISH.search(k):
            continue
        if sum(1 for x in items if VERSIONISH.search(x[1])) * 2 >= len(ids):
            continue
        web = [x for x in items if WEBSIG.search(x[1]) and not NEGWEB.search(x[1])]
        if web:
            rows.append((k, len(ids), web))
    rows.sort(key=lambda z: -z[1])
    dump(out, rows, "结构法（系列名前缀 / 括号书名）—— 只列未归档候选")
    print("[struct] 组 %d / 候选 %d" % (len(rows), sum(len(r[2]) for r in rows)))
    return rows


def mode_ngram(pool, arch_ids, arch_titles, out, min_arch, max_arch, min_len, only_gap):
    term_docs = defaultdict(set)
    for i, t in enumerate(arch_titles):
        for g in ngram_terms(t):
            term_docs[g].add(i)
    terms = {g for g, s in term_docs.items()
             if min_arch <= len(s) <= max_arch and len(g) >= min_len and g not in GENERIC_NGRAM}
    print("[ngram] 系列名候选 %d" % len(terms))

    bys = defaultdict(list)
    for tid, (title, forum) in pool.items():
        if not title or tid in arch_ids:
            continue
        hit = {g for g in ngram_terms(title) if g in terms}
        best = max(sorted(hit), key=len) if hit else None
        if best:
            bys[best].append((tid, title, forum))

    rows = [(k, len(term_docs[k]), v) for k, v in bys.items()]
    rows.sort(key=lambda z: -z[1])          # 按「已有归档成员数」降序（坑 90）
    dump(out, rows, "反向 n-gram 差集 —— 系列名取自已归档标题，只列未归档候选")
    print("[ngram] 组 %d / 候选 %d" % (len(rows), sum(len(r[2]) for r in rows)))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pool", required=True, help="全量池 json（{id:{title,forum,...}}）")
    ap.add_argument("--ref", required=True, help="语料目录（docs/references）")
    ap.add_argument("--out", required=True, help="输出前缀，会生成 <out>_struct.txt / <out>_ngram.txt")
    ap.add_argument("--mode", choices=["struct", "ngram", "both"], default="both")
    ap.add_argument("--min-arch", type=int, default=2)
    ap.add_argument("--max-arch", type=int, default=6)
    ap.add_argument("--min-len", type=int, default=5)
    ap.add_argument("--only-archived-gap", action="store_true",
                    help="只看「既已有归档成员、又还有空缺」的组（命中率最高的子集）")
    a = ap.parse_args()

    pool = pool_titles(a.pool)
    arch_ids, arch_titles = archived(a.ref)
    print("池=%d | 归档=%d | 归档标题=%d" % (len(pool), len(arch_ids), len(arch_titles)))

    if a.mode in ("struct", "both"):
        mode_struct(pool, arch_ids, arch_titles, a.out + "_struct.txt", a.only_archived_gap)
    if a.mode in ("ngram", "both"):
        mode_ngram(pool, arch_ids, arch_titles, a.out + "_ngram.txt",
                   a.min_arch, a.max_arch, a.min_len, a.only_archived_gap)


if __name__ == "__main__":
    main()
