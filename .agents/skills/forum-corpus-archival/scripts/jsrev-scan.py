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

# —— 分版块降权（SKILL.md 坑 63，第二十四轮落地）——
# 软件发布 / 水贴 / 站务类版块整区是「软件·工具·资源·闲聊」发布，命中表高分项**全是假阳性**
# （第 23 轮实测：精品软件区 27548 帖，web 逆水产出一篇未出）。
# **不能加进全局 NEG** —— 会误杀「插件逆向 / 扩展逆向 / 油猴脚本逆向」这类真阳性标题。
# 故做成**分版块降权**：仅当帖子**所在版块**属软化版块、且标题**没有**具体逆向信号时，才扣分。
# 用 --soft-forums 开启（默认关闭，保持历史行为可复现）。
SOFT_FORUMS = {
    "精品软件区": 12, "『精品软件区』": 12,
    "水漫金山": 12, "『水漫金山』": 12,
    "招聘求职": 12, "『招聘求职』": 12,
    "申请专区": 10, "『申请专区』": 10,
    "站务处理": 12, "『站务处理』": 12,
    "投诉举报": 12, "站点公告": 12,
    "福利经验": 8, "『福利经验』": 8,
    "电子书策划制作区": 10, "教学培训区": 6,
    "2014CrackMe大赛": 6, "吾爱破解2016安全挑战赛": 6,
    "腾讯游戏安全技术竞赛": 8, "往届吾爱破解动画大赛": 6, "周边活动作品区": 8,
}
# 命中以下任一「真阳性形态」，即使在软化版块也**不降权**。
# ⚠️ 只放**具体逆向信号**，不要放 `m3u8/接口/插件/脚本/抓包` 这类**泛 web 词** ——
# 精品软件区整区就是「m3u8 播放器 / 抓包工具 / 插件」发布帖，泛词豁免 = 降权形同虚设。
# 注意中英混排**不要加 \b**（坑 51）。
SOFT_EXEMPT = re.compile(
    r"逆向|加密|解密|密文|明文|密钥|签名|验签|算法还原|滑块|验证码|captcha|"
    r"hook|反调试|debugger|混淆|反混淆|扣代码|扣js|js逆向|web逆向|webpack|jsvmp|"
    r"字节码|opcode|wasm|electron|asar|jsc|\bdrm\b|widevine|补环境|jsdom|"
    r"js脚本|脚本分析|插件逆向|扩展逆向|反编译",
    re.I)


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
        # 坑 56：**不要**用 `^[a-z0-9]*-?(\d{5,})` —— `[a-z0-9]*` 会把文件名开头的数字
        # 一起吃掉（"2080428-x.md" → group(1)="80428"），使**全部早期 slug 命名文件
        # （`<id>-<slug>.md`）的 ID 提取错误** ⇒ 已归档集漏掉 49 个 ID ⇒ 老帖被重复抓取/重复归档。
        # 正确做法：正文（去掉扩展名）里**第一个长度 ≥5 的数字串**就是帖子 ID。
        m = re.search(r"(\d{5,})", f)
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
    ap.add_argument("--soft-forums", action="store_true",
                    help="对软件发布/水贴/站务类版块做分版块降权（坑 63，推荐开启）")
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
    soft_dropped = 0
    for it in items:
        tid = str(it.get("id") or "").strip()
        t = (it.get("title") or "").strip()
        if not tid or not t or tid in arch or tid in excl:
            continue
        pos = sum(w for r, w in POS if re.search(r, t, re.I))
        neg = sum(w for r, w in NEG if re.search(r, t, re.I))
        pen = 0
        fm = (it.get("forum") or "").strip()
        if a.soft_forums and fm in SOFT_FORUMS and not SOFT_EXEMPT.search(t):
            pen = SOFT_FORUMS[fm]
            if pos - neg >= a.min_score:
                soft_dropped += 1
        if pos - neg - pen >= a.min_score:
            rows.append({"id": tid, "score": pos - neg - pen, "pos": pos, "neg": neg,
                         "soft_penalty": pen, "forum": fm, "title": t})
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
    if a.soft_forums:
        print("  分版块降权：命中表内保留 %d 条 / 被降权剔除 %d 条（软化版块噪声，坑 63）"
              % (sum(1 for r in rows if r.get("soft_penalty")), soft_dropped))


if __name__ == "__main__":
    main()
