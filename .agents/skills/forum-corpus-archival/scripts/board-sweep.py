#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""board-sweep.py —— 论坛「版块枚举」通用采集器（零依赖）

为什么需要它（skill 坑 52）：
  关键词搜索是**标题短语匹配** —— 标题里不含任何关键词词形的老帖**永远进不了候选池**；
  「最新/精华/热门/技术」这类策展榜只覆盖近期/精选内容。
  **唯一能稳定产出池外新帖的结构性通道是「按版块逐页枚举全部主题」**。
  52pojie 实测：7 个版块 × 30 页 = 8881 唯一主题，其中 **7668 篇（86%）是历轮池外新帖**；
  而同期四类策展榜 958 条里池外只有 6 条（0.6%），web 逆向产出为 0。

用法：
  # 1) 先拿版块 fid（52pojie 可跳过，见 FALLBACK_FORUMS）
  hubcli browser eval --tab_id <52pojie 标签页> \\
      --code 'JSON.stringify([...document.querySelectorAll("a[href*=\\"forum-\\"]")].map(a=>a.getAttribute("href")))'

  # 2) 枚举（断点续跑：已存在的 <fid>_p<n>.json 自动跳过）
  python board-sweep.py --out ./boards20 --maxpage 30 \\
      --fids 5,24,2,6,59,4,41 --pool ../52pojie-fetch19/pool_v19.json

  # 3) 继续加深（同一 --out 目录，已抓页不会重复请求）
  python board-sweep.py --out ./boards20 --maxpage 120 --fids 5,24,2

输出：
  <out>/<fid>_p<n>.json    每页原始结果（断点续跑用）
  <out>/board_pool.json    全量唯一主题（id/title/url/forum/fid）
  <out>/board_scan.txt     池外新帖中「标题含 web 信号」的清单（优先复核）
  stdout                   每 5 页进度 + 版块分布 + 池外比例

注意：
  * Thread 接口**无 10 s 限频**（那是 search 的限制），~4 s/页，可放心连续拉；
  * **禁止与 search 扫描并发**（坑 17）；
  * 中英混排标题的正则**不要用 \\b**（坑 51）。
"""
import argparse
import glob
import json
import os
import re
import subprocess
import sys
import time
from collections import Counter

# 52pojie 版块 fid（可用 browser eval 在 forum.php 上重新取值）
FALLBACK_FORUMS = {
    5: "脱壳破解区", 24: "编程语言区", 2: "原创发布区", 6: "动画发布区",
    59: "软件调试区", 4: "逆向资源区", 41: "安全工具区",
    22: "UnPackMe/CrackMe", 8: "悬赏问答区", 68: "教学培训区",
    65: "移动安全区", 32: "病毒分析区", 75: "脱壳破解讨论求助区",
}

# web 逆向信号（标题级宽口径；**不加 \\b**，见坑 51）
WEB = re.compile(
    r"js|javascript|前端|网页|webpack|jsvmp|h5|小程序|浏览器|油猴|扩展|插件|"
    r"爬虫|爬取|接口|api|sign|签名|token|cookie|滑块|验证码|captcha|风控|反爬|"
    r"补环境|字体|m3u8|hls|ts帧|drm|widevine|wasm|electron|asar|webview|"
    r"扣代码|混淆|加密|解密|逆向|hook|调试|协议|报文|还原|算法|app",
    re.I)


def fetch(url, page, retries=3):
    for _ in range(retries):
        try:
            r = subprocess.run(["hubcli", "52pojie", "Thread", "--url", url,
                                "--page", str(page), "--json"],
                               capture_output=True, text=True, encoding="utf-8",
                               timeout=120, shell=False)
            return json.loads((r.stdout or "").strip())
        except Exception:
            time.sleep(2)
    return None


def tid_of(url):
    m = re.search(r"thread-(\d+)-", url or "")
    return m.group(1) if m else ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--maxpage", type=int, default=30)
    ap.add_argument("--fids", default="5,24,2,6,59,4,41")
    ap.add_argument("--tpl", default="https://www.52pojie.cn/forum-%d-%d.html",
                    help="版块 URL 模板（%%d= fid, %%d= page）")
    ap.add_argument("--pool", default="", help="上轮全量池 json，用于算池外比例")
    ap.add_argument("--sleep", type=float, default=0.4)
    a = ap.parse_args()

    os.makedirs(a.out, exist_ok=True)
    pool = set()
    if a.pool and os.path.exists(a.pool):
        d = json.load(open(a.pool, encoding="utf-8"))
        items = d.values() if isinstance(d, dict) else d
        pool = {str(x.get("id")) for x in items
                if isinstance(x, dict) and x.get("id")}
    print("pool:", len(pool), flush=True)

    rows = {}
    for fid in [int(x) for x in a.fids.split(",") if x.strip()]:
        name = FALLBACK_FORUMS.get(fid, "fid%d" % fid)
        stale = 0
        for pg in range(1, a.maxpage + 1):
            path = os.path.join(a.out, "%d_p%d.json" % (fid, pg))
            if os.path.exists(path):
                d = json.load(open(path, encoding="utf-8"))
            else:
                d = fetch(a.tpl % (fid, pg), pg)
                if d is None:
                    print("%s p%d: FETCH-FAILED -> break" % (name, pg), flush=True)
                    break
                if not d:
                    print("%s p%d: EMPTY -> break" % (name, pg), flush=True)
                    break
                json.dump(d, open(path, "w", encoding="utf-8"),
                          ensure_ascii=False, indent=1)
            added = 0
            for x in d:
                tid = tid_of(x.get("url", ""))
                if tid and tid not in rows:
                    added += 1
                if tid:
                    rows[tid] = {"id": tid, "title": x.get("title", ""),
                                 "url": x.get("url", ""), "forum": name, "fid": fid}
            # 坑 54：版块翻到末页后，Discuz **不会返回空列表**，而是**回卷到第 1 页内容**
            # （实测 安全工具区 fid41 只有 8 页，p9~p150 全是 thread-1859777 那一页的复制）。
            # 只判「空列表」的旧写法会白抓上百页 → 加「连续 2 页零新增」熔断。
            stale = stale + 1 if added == 0 else 0
            if stale >= 2:
                print("%s p%d: 连续 2 页零新增（已到末页，站点回卷第 1 页）-> break"
                      % (name, pg), flush=True)
                break
            if pg % 5 == 0 or pg <= 2:
                print("%s p%d: union=%d (+%d)" % (name, pg, len(rows), added), flush=True)
            time.sleep(a.sleep)

    json.dump(rows, open(os.path.join(a.out, "board_pool.json"), "w",
                         encoding="utf-8"), ensure_ascii=False, indent=1)
    outside = {k: v for k, v in rows.items() if k not in pool}
    hits = {k: v for k, v in outside.items() if WEB.search(v["title"])}
    print("\n唯一主题 %d | 池外 %d (%.0f%%) | 其中标题含 web 信号 %d"
          % (len(rows), len(outside),
             100.0 * len(outside) / max(1, len(rows)), len(hits)))
    print("版块分布:", dict(Counter(v["forum"] for v in rows.values())))
    with open(os.path.join(a.out, "board_scan.txt"), "w", encoding="utf-8",
              newline="\n") as fh:
        fh.write("版块枚举唯一: %d | 池外: %d | web信号: %d\n\n"
                 % (len(rows), len(outside), len(hits)))
        for k, v in sorted(hits.items(), key=lambda z: -int(z[0])):
            fh.write("%s\t[%s]\t%s\n" % (k, v["forum"], v["title"]))
    print("→ %s/board_scan.txt" % a.out)


if __name__ == "__main__":
    main()
