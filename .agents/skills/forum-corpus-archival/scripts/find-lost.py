#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""失联 ID 体检（坑 76）：找出「已抓正文、却既未归档、也未入任何噪声名单」的帖子。

背景：候选排除集 = 已归档 ∪ 噪声名单 ∪ 已抓正文，但这三个集合并不自洽 ——
实测 4311 个 bodies 文件里有 903 个 ID 处于「三不管」状态（某轮抓过后被 finalize 遗漏）。
它们既不会进候选（被 bodies 排除），也从未被复核，是**累积型静默盲区**。

本脚本输出全表 + 标题级 web 信号打分，按分从高到低排序，便于人工复核（正文已在本地，无需再抓）。

用法:
  python find-lost.py --corpus docs/references --artifacts artifacts --platform 52pojie
  python find-lost.py ... --min-score 3 --top 200
  python find-lost.py ... --dump lost28.txt
"""
import argparse
import glob
import json
import os
import re

# web 逆向正向信号（加权）
POS = [
    (r"逆向|反编译|反汇编", 3),
    (r"加密|解密|密文|明文|加签|验签|\bsign\b|签名", 3),
    (r"参数|token|cookie|请求头|header", 2),
    (r"补环境|jsdom|node\s*vm|execjs|rpc|本地复现", 3),
    (r"hook|注入|劫持|拦截|代理|替换", 2),
    (r"debugger|反调试|断点|F12|审查元素", 2),
    (r"\bast\b|反混淆|混淆还原|webpack|扣代码|扣js|免扣", 3),
    (r"jsvmp|\bvmp\b|字节码|opcode|指令还原|插桩", 3),
    (r"风控|反爬|指纹|滑块|验证码|captcha|点选|极验|某验|易盾|瑞数|加速乐|\bjsl\b|akamai|cloudflare", 3),
    (r"接口|协议|报文|响应|请求|ajax|xhr|\bapi\b", 2),
    (r"m3u8|hls|\bts\b|直播源|drm|widevine|aes-?128|key|ckey|直链|真实地址", 2),
    (r"小程序|wxapkg|uni-?app|taro|webview|electron|asar|jsc|nw\.js|crx|油猴|userscript", 2),
    (r"字体|woff|canvas|webgl", 2),
    (r"网盘|蓝奏|云盘|onedrive|webdav|上传|切片", 1),
    (r"音乐|视频|音频|听书|直播|弹幕|漫画|小说|影视|电影|电视剧", 1),
    (r"\bjs\b|javascript|前端|网页|h5|网站", 2),
]
# 负向信号（非 web / 非逆向）
NEG = [
    (r"\bapk\b|安卓|android|frida|unidbg|jadx|smali|ios|iphone|x64dbg|ollydbg|\bida\b|idapro", 5),
    (r"脱壳|加壳|加固|ollvm|vmprotect|d-?810|de4dot|\.net\b|dotfuscator|reactor|confuserex|minifilter|il2cpp|elf", 5),
    (r"注册机|爆破|追码|crackme|keygen|内存补丁|机器码|易语言|按键精灵|autojs|auto\.js|autoX", 4),
    (r"远控|木马|病毒|勒索|银狐|蠕虫|后门", 4),
    (r"外挂|辅助|多开|内购|游戏破解|游戏辅助", 3),
    (r"爬虫入门|从零开始|保姆级|新手教程|学习笔记|毕业设计|课程设计", 3),
    (r"美女|套图|壁纸|数据可视化|matplotlib|pandas|词云", 3),
    (r"CTF|writeup|题解|靶场|竞赛", 4),
    (r"flutter|unity|虚幻", 3),
    (r"网站源码|整站|仿站|\bCMS\b|源码分享|discuz|wordpress", 2),
]


def load_blocked(artifacts):
    blocked = set()
    for f in glob.glob(os.path.join(artifacts, "*", "BLOCK_EXTRA*.json")) + \
             glob.glob(os.path.join(artifacts, "*", "REVIEWED_NOISE.json")):
        try:
            d = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        if isinstance(d, dict):
            blocked |= set(d.keys())
        elif isinstance(d, list):
            for x in d:
                if isinstance(x, dict) and "id" in x:
                    blocked.add(str(x["id"]))
                elif isinstance(x, str):
                    blocked.add(x)
    return blocked


def load_bodies(artifacts):
    """返回 {帖子ID: [目录...]}。ID 一律用文件名里第一个 ≥5 位数字串（坑 56），
    这样 `123456.md` 与 `csdn-123456.md` 都能归一。"""
    bodies = {}
    for d in glob.glob(os.path.join(artifacts, "*", "bodies*")):
        if os.path.isdir(d):
            for f in os.listdir(d):
                if not f.endswith(".md"):
                    continue
                m = re.search(r"(\d{5,})", f)
                if m:
                    bodies.setdefault(m.group(1), []).append(d)
    return bodies


def load_pool(artifacts, platform):
    """把历轮 pool_v*.json 合并成 {id: {title, forum}}。"""
    pool = {}
    for f in glob.glob(os.path.join(artifacts, "*", "pool_v*.json")):
        try:
            d = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        if isinstance(d, dict):
            for k, v in d.items():
                if isinstance(v, dict) and k not in pool:
                    pool[k] = {"title": v.get("title", ""), "forum": v.get("forum", "")}
    return pool


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", required=True, help="语料目录（docs/references）")
    ap.add_argument("--artifacts", required=True, help="artifacts 根目录")
    ap.add_argument("--platform", default="52pojie")
    ap.add_argument("--min-score", type=int, default=0)
    ap.add_argument("--top", type=int, default=300)
    ap.add_argument("--dump", default="")
    a = ap.parse_args()

    arch = set()
    for f in os.listdir(a.corpus):
        m = re.search(r"(\d{5,})", f)
        if m:
            arch.add(m.group(1))
    blocked = load_blocked(a.artifacts)
    bodies = load_bodies(a.artifacts)
    pool = load_pool(a.artifacts, a.platform)
    lost = {k: v for k, v in bodies.items() if k not in arch and k not in blocked}
    print("bodies=%d | 已归档=%d | 噪声名单=%d | 失联=%d"
          % (len(bodies), len(arch), len(blocked), len(lost)))

    rows = []
    for tid, dirs in lost.items():
        t = pool.get(tid, {}).get("title", "")
        if not t:
            # fallback: 从正文首行取
            p = os.path.join(dirs[0], tid + ".md")
            try:
                head = open(p, encoding="utf-8", errors="replace").read(400)
                t = head.strip().splitlines()[0] if head.strip() else ""
            except Exception:
                t = ""
        s, hits = 0, []
        for pat, w in POS:
            if re.search(pat, t, re.I):
                s += w
                hits.append("+" + pat.split("|")[0])
        for pat, w in NEG:
            if re.search(pat, t, re.I):
                s -= w
                hits.append("-" + pat.split("|")[0])
        rows.append({"id": tid, "score": s, "title": t, "hits": hits, "dir": dirs[0]})
    def _num(s):
        return int(s) if str(s).isdigit() else 0

    rows.sort(key=lambda r: (-r["score"], -_num(r["id"])))
    keep = [r for r in rows if r["score"] >= a.min_score]
    print("评分后（≥%d）: %d 条\n" % (a.min_score, len(keep)))
    for i, r in enumerate(keep[:a.top], 1):
        print("%3d %s %s | %s" % (i, r["score"], r["id"], r["title"][:70]))
    if a.dump:
        with open(a.dump, "w", encoding="utf-8", newline="\n") as fh:
            for r in keep:
                fh.write("%s\t%d\t%s\t%s\n" % (r["id"], r["score"], r["dir"], r["title"]))
        print("\n已写出:", a.dump)


if __name__ == "__main__":
    main()
