#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""全站「未归档命中表」生成器（可复现、可重复跑）。

用途：从全量帖子池里找出「标题带 JS 逆向信号、但尚未归档」的帖子，**自动打分排序**，
产出可直接交付抓取的候选表。取代「人工从命中表里随手挑」的旧做法（见 SKILL.md 坑 44）。

用法：
  python jsrev-scan.py --pool artifacts/x-fetch18/pool_v18.json \
      --ref docs/references \
      --exclude "artifacts/*/BLOCK_EXTRA*.json" \
      --exclude "artifacts/*/REVIEWED_NOISE.json" \
      --exclude-bodies "artifacts/*/bodies*/" \
      --out-json artifacts/x-fetch18/jsrev_hits18.json \
      --out-txt  artifacts/x-fetch18/jsrev_scan18.txt

口径：
  score = Σ POS(命中权重) − Σ NEG(命中权重)，只保留 score > 0。
  * 排除集 = 已归档(按 ref 目录文件名里的 ID) ∪ 各 --exclude 列表文件 ∪ 各 --exclude-bodies 目录内文件名。
  * 支持两类 id 列表文件：JSON 数组、或 [{"id": ...}, ...] 数组、或 {"k": [...]} 字典（自动展平）。
"""
import argparse
import glob
import json
import os
import re

# —— 信号词（web/JS 侧逆向）——
POS = [
    (r"补环境|jsdom|node\s*vm|vm\.runIn|全局补齐|环境补齐", 10),
    (r"jsvmp|\bvmp\b|字节码|opcode|指令还原|插桩", 9),
    (r"webpack|__webpack_require__|扣代码|扣js|抠js|免扣|扣取", 9),
    (r"反混淆|混淆还原|\bast\b|babel|语法树|还原字符串", 8),
    (r"瑞数|加速乐|\bjsl\b|wzws|akamai|cloudflare|cf盾|盾验证|5秒盾|五秒盾", 8),
    (r"极验|某验|易盾|顶象|数美|腾讯验证|滑块|验证码|captcha|点选|轨迹", 6),
    (r"加密参数|参数加密|参数逆向|参数分析|参数定位|参数生成|参数校验|参数签名|"
     r"sign参数|\bsign\b|验签|加签|签名", 6),
    (r"接口|协议|报文|请求|响应解密|返回数据", 4),
    (r"加密|解密|密文|明文|密钥|算法还原|\baes\b|\brsa\b|\bmd5\b|国密|sm2|sm4", 4),
    (r"反调试|debugger|hook|注入|插桩", 4),
    (r"小程序|h5|web端|网页|前端|浏览器|web逆向|js逆向|\bjs\b|javascript", 5),
    (r"爬虫|采集|抓取|爬取", 2),
    (r"m3u8|直播源|drm|widevine|视频解密|ts切片|hls", 4),
    (r"字体|woff|canvas|webgl|指纹|风控|反爬|token|cookie|websocket", 3),
    (r"wasm|electron|扩展|插件|chrome|\bjsc\b|\bv8\b|source.?map|protobuf", 3),
]
# —— 降权（非 web/JS 侧，或无实质内容）——
NEG = [
    (r"apk|smali|jadx|frida|unidbg|安卓|android|ios|iphone|越狱|macos|linux|windows", 10),
    (r"ollvm|\bida\b|idapro|x64dbg|x32dbg|\bod\b|ollydbg|vmprotect|\bso\b|ndk|\barm\b|汇编", 10),
    (r"驱动|内核|minifilter|\bpe\b|\bdll\b|\.sys\b|脱壳|加壳", 8),
    (r"木马|病毒|远控|勒索|银狐|窃密|免杀|钓鱼|外挂|破解会员|解锁会员|激活码", 10),
    (r"crackme|keygen|\bctf\b|writeup|题解|赛题|靶场|靶机|pwn", 8),
    (r"识别工具|识别软件|识别源码|识别系统|识别率|生成器|加密软件|解密软件|"
     r"加密工具|解密工具|文件夹加密|文件加密|密码管理|数据可视化", 8),
    (r"爬虫入门|保姆级|从零开始|学习笔记|小白入门|教程汇总|课程|视频教程|培训|小册", 7),
    (r"求|求助|悬赏|请问|帮忙|有没有|哪里下载|下载|资源|电子书|pdf|epub|书籍|教材|网盘", 8),
    (r"易语言|按键精灵|autojs|auto\.js|脚本精灵|python基础", 8),
    (r"服务器|数据库|运维|docker|k8s|nginx|redis|mysql|linux命令", 6),
    (r"游戏|外挂|辅助", 4),
    (r"Workers?\s*(部署|搭建|集成)|wrangler|R2\s*存储|serverless|无服务", 4),
    (r"招聘|急招|岗位|简历|面试", 4),
]


def load_id_file(path):
    """把任意 id 列表文件读成 set[str]。"""
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
        m = re.match(r"^[a-z0-9]*-?(\d{5,})-?.*\.md$", f, re.I)
        if m:
            ids.add(m.group(1))
    return ids


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pool", required=True, help="全量池 JSON（{id:{title,forum,url}} 或 [...]）")
    ap.add_argument("--ref", default="docs/references", help="语料目录（用于算已归档 ID）")
    ap.add_argument("--exclude", action="append", default=[],
                    help="id 列表文件 glob（可重复），如 artifacts/*/BLOCK_EXTRA*.json")
    ap.add_argument("--exclude-bodies", action="append", default=[],
                    help="已抓正文目录 glob（可重复），目录内 <id>.md 视为已复核")
    ap.add_argument("--out-json", required=True)
    ap.add_argument("--out-txt", required=True)
    ap.add_argument("--min-score", type=int, default=1)
    a = ap.parse_args()

    pool = json.load(open(a.pool, encoding="utf-8"))
    items = pool.values() if isinstance(pool, dict) else pool
    arch = archived_ids(a.ref)
    excl = set()
    for g in a.exclude:
        for f in glob.glob(g):
            excl |= load_id_file(f)
    for g in a.exclude_bodies:
        for d in glob.glob(g):
            for f in os.listdir(d):
                excl.add(os.path.basename(f).split(".")[0])

    rows = []
    for it in items:
        tid = str(it.get("id") or "").strip()
        t = (it.get("title") or "").strip()
        if not tid or not t or tid in arch or tid in excl:
            continue
        pos = sum(w for r, w in POS if re.search(r, t, re.I))
        neg = sum(w for r, w in NEG if re.search(r, t, re.I))
        if pos - neg >= a.min_score:
            rows.append({"id": tid, "score": pos - neg, "pos": pos, "neg": neg,
                         "forum": it.get("forum") or "", "title": t})
    rows.sort(key=lambda x: (-x["score"], -int(x["id"])))
    json.dump(rows, open(a.out_json, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    with open(a.out_txt, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("未归档命中: %d\n" % len(rows))
        for r in rows:
            fh.write("%s %+4d %s\n" % (r["id"], r["score"], r["title"]))
    print("池 %d | 已归档 %d | 排除集 %d | 命中(score>=%d) %d"
          % (len(pool), len(arch), len(excl), a.min_score, len(rows)))
    for k in (12, 8, 6, 4, 1):
        print("  score>=%2d: %d" % (k, sum(1 for r in rows if r["score"] >= k)))


if __name__ == "__main__":
    main()
