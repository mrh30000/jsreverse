#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""「家族/系列」+「web 主题家族」候选扫描器（52pojie 实测，第二十六轮）。

用途：从全量帖子池里找出**成系列的教程/实战帖**与**web 主题家族帖**，
产出可直接抓正文的候选表。对应 SKILL.md 坑 67（家族是被结构性掩盖的存量池）、
坑 70（通用 SERIES 通道产出以 native 为主，应按主题家族用）、坑 71（两条噪声爆炸口径坑）。

两种模式：
  --mode series   通用「系列词」扫描：SERIES ∧ WEBCTX ∧ ¬NOISE（口径见坑 71，**不要**加裸序数词）
  --mode theme    web 主题家族扫描：THEME ∧ WEB ∧ ¬ASK ∧ ¬TOOL（第二十六轮真正高产的那条）

用法：
  python family-scan.py --mode series --pool artifacts/x/pool_vNN.json --ref docs/references \
      --exclude "artifacts/*/BLOCK_EXTRA*.json" --exclude "artifacts/*/REVIEWED_NOISE.json" \
      --exclude-bodies "artifacts/*/bodies*" \
      --out-json artifacts/x/family.json --out-txt artifacts/x/family.txt

口径注意（坑 71，务必遵守）：
  * SERIES **禁止**裸 `一|二|三` 与 `第N版|期` —— 会命中几乎所有含序数词的中文标题（实测 608 → 898）。
  * WEBCTX **禁止**单独放歧义/过泛词：`钓鱼`（垂钓义）、`脚本`（AutoX.js）、`小程序`（写了个计算器小程序）。
"""
import argparse
import glob
import json
import os
import re
import sys

# —— 成词的「系列」标记（坑 71：不得使用裸序数词）——
SERIES = re.compile(
    r"大讲堂|第[0-9一二三四五六七八九十]{1,3}[讲课篇部章节回季辑]|系列|连载|"
    r"[（(][一二三四五六七八九十]{1,3}[)）]|之[一二三四五六七八九十]{1,2}|"
    r"合集|全集|续集|上篇|中篇|下篇|第[一二三四五六七八九十]{1,2}弹|part\s*\d",
    re.I)
# —— web 侧上下文（已剔除歧义/过泛词）——
WEBCTX = re.compile(
    r"网页|网站|前端|浏览器|h5|\bweb\b|http|接口|协议|抓包|报文|请求|响应|cookie|token|"
    r"websocket|m3u8|hls|html|\bdom\b|油猴|篡改猴|userscript|扩展|chrome|小程序|"
    r"js逆向|web逆向|javascript|\bjs\b|json|ajax|fetch|签名|加密|解密|逆向|"
    r"网马|挂马|盗号|视频解析|直播源|播放器|app逆向",
    re.I)
# —— web 主题家族（第二十六轮真正高产的一条）——
THEME = re.compile(
    r"m3u8|直播源|播放器|视频解析|视频地址解析|弹幕|h5\s*游戏|h5网页|网页视频|"
    r"音乐|音频|推流|rtmp|flv|hls|drm|解析站|影视|短剧|听书", re.I)
THEME_WEB = re.compile(
    r"js|javascript|网页|h5|前端|接口|协议|抓包|websocket|签名|加密|解密|逆向|"
    r"中间人|fiddler|分析|采集|获取", re.I)
# —— 求助 / 工具发布（家族通道的两大噪声源）——
ASK = re.compile(r"求|求助|请教|请问|帮忙|有没有|哪位|怎么|如何|大佬|找|谁知道|问一下", re.I)
TOOL = re.compile(r"源码|播放器|模板|合集|开源|v\d+\.\d+|下载器|转换器|下载工具|软件|插件|"
                  r"小工具|构建|开发|练习|特效|可视化", re.I)
NOISE = re.compile(
    r"求|求助|悬赏|请问|帮忙|有没有|资源|电子书|pdf|epub|书籍|教材|网盘|"
    r"课程|教程|培训|vip|学习笔记|从零开始|小白|入门到精通|摸鱼|撒币|水漫", re.I)
# —— native / 移动 / 桌面 / 游戏（系列通道的主要产出，可按需保留或排除）——
NATIVE = re.compile(
    r"apk|smali|jadx|frida|xposed|unidbg|安卓|android|ios|iphone|越狱|"
    r"ollvm|\bida\b|idapro|x64dbg|x32dbg|ollydbg|vmprotect|\bod\b|汇编|驱动|内核|"
    r"minifilter|\bdll\b|\.sys\b|脱壳|加壳|游戏|外挂|辅助|内购|模拟器|"
    r"crackme|keygen|\bctf\b|writeup|题解|靶场|红包|加固|lua|unity|galgame|汉化|"
    r"微信\s*pc|pc端|桌面端|exe\b|C\+\+|c#|winform|mfc|vc\+\+|delphi|易语言|"
    r"按键精灵|autojs|auto\.js", re.I)


def load_id_file(path):
    out = set()
    try:
        d = json.load(open(path, encoding="utf-8"))
    except Exception:
        return out
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
    if not os.path.isdir(ref):
        return ids
    for f in os.listdir(ref):
        # 坑 56：一律 `re.search(r"(\d{5,})", f)`；不要用 `^[a-z0-9]*-?(\d{5,})`（会吃掉首位数字）
        m = re.search(r"(\d{5,})", f)
        if m:
            ids.add(m.group(1))
    return ids


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pool", required=True)
    ap.add_argument("--ref", default="docs/references")
    ap.add_argument("--mode", choices=["series", "theme"], default="series")
    ap.add_argument("--exclude", action="append", default=[])
    ap.add_argument("--exclude-bodies", action="append", default=[])
    ap.add_argument("--keep-native", action="store_true",
                    help="series 模式下保留 native 候选（默认单独归入 native 层）")
    ap.add_argument("--out-json", required=True)
    ap.add_argument("--out-txt", required=True)
    a = ap.parse_args()

    pool = json.load(open(a.pool, encoding="utf-8"))
    items = list(pool.values()) if isinstance(pool, dict) else list(pool)
    arch = archived_ids(a.ref)
    excl = set()
    for g in a.exclude:
        for f in glob.glob(g):
            excl |= load_id_file(f)
    for g in a.exclude_bodies:
        for d in glob.glob(g):
            if os.path.isdir(d):
                excl |= {f.split(".")[0] for f in os.listdir(d)}
            else:
                excl.add(os.path.basename(d).split(".")[0])

    web, native = [], []
    for it in items:
        tid = str(it.get("id") or "").strip()
        t = (it.get("title") or "").strip()
        if not tid or not t or tid in arch or tid in excl:
            continue
        if a.mode == "series":
            if not (SERIES.search(t) and WEBCTX.search(t)) or NOISE.search(t):
                continue
        else:
            if not (THEME.search(t) and THEME_WEB.search(t)):
                continue
            if ASK.search(t) or TOOL.search(t):
                continue
        rec = {"id": tid, "title": t, "forum": (it.get("forum") or "").strip()}
        (native if NATIVE.search(t) else web).append(rec)
    for L in (web, native):
        L.sort(key=lambda x: -int(x["id"]))
    json.dump({"web": web, "native": native},
              open(a.out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(a.out_txt, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("mode=%s | web %d | native %d\n\n" % (a.mode, len(web), len(native)))
        for r in web:
            fh.write("%s [%s] %s\n" % (r["id"], r["forum"], r["title"]))
        fh.write("\n== native 层（series 模式主要产出，通常不收）==\n")
        for r in native:
            fh.write("%s [%s] %s\n" % (r["id"], r["forum"], r["title"]))
    print("池 %d | 已归档 %d | 排除集 %d | mode=%s → web %d / native %d"
          % (len(items), len(arch), len(excl), a.mode, len(web), len(native)))
    print("  （提示：series 模式实测 native 占比极高，见 SKILL.md 坑 70）")
    for r in web[:40]:
        print("    %s [%s] %s" % (r["id"], r["forum"], r["title"][:64]))


if __name__ == "__main__":
    main()
