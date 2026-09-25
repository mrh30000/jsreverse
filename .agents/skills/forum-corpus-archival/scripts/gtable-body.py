#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""G 表（历史黑名单）体检 · 第二段：正文级度量排序（forum-corpus-archival 技能脚本）。

与 `gtable-narrow.py` 配套：吃它的 `_titles.json`，对 local（历轮 `bodies*`）与 remote
（新抓目录）统一做正文度量，按分排序，供**人工逐条判读**。

判据（现口径）：正文是否含「可复用技术内容」——
  · 有效正文长度（剥离 `#` / `>` / `---` 行）
  · 代码块 / 函数定义 / 十六进制常量
  · 接口 URL
  · 加密函数名（md5/aes/hmac/btoa/JSON.stringify/Date.now…）
  · 逆向动作词（hook/断点/调用栈/补环境/扣代码/加密/解密/签名）

⚠️ 打分**只作排序**，绝不能替代人工读正文（历史上榜首常是 Flutter/移动端 native 帖）。

用法：
  python gtable-body.py --titles artifacts/<p>-fetch<N>/gtable<N>_titles.json \
      --bodies-glob "artifacts/<p>-fetch*/bodies*" --out artifacts/<p>-fetch<N>/gtable<N>_body.json
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re

CODE = re.compile(r"```|function\s*\w*\s*\(|=>\s*\{|var\s+\w+\s*=|let\s+\w+\s*=|const\s+\w+\s*=|0x[0-9a-fA-F]{4,}")
URL = re.compile(r"https?://[^\s\"'<>)]+|/[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-/]{3,}\.(?:json|php|do|action|api)")
CRYPTO = re.compile(r"md5|sha1|sha256|hmac|aes|des|rsa|sm2|sm3|sm4|base64|btoa|atob|CryptoJS|JSEncrypt|"
                    r"JSON\.stringify|Date\.now|Math\.random|encrypt|decrypt|sign\b", re.I)
ACT = re.compile(r"hook|断点|调用栈|补环境|扣代码|插桩|反混淆|ast|webpack|jsvmp|wasm|逆向|抓包|请求头|"
                 r"cookie|localStorage|sessionStorage|接口|参数|签名|加密|解密|token|验证码|滑块|"
                 r"反爬|反调试|调试|定位|还原|frida|unidbg|jadx|ida", re.I)


def strip_md(t):
    return "\n".join(s for s in (l.strip() for l in t.splitlines())
                     if s and not s.startswith(("#", ">", "---")))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--titles", required=True, help="gtable-narrow.py 的 _titles.json")
    ap.add_argument("--bodies-glob", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--min-len", type=int, default=200, help="低于此长度视为空正文/仅外链")
    a = ap.parse_args()

    titles = json.load(open(a.titles, encoding="utf-8"))
    have = {}
    for d in glob.glob(a.bodies_glob):
        if not os.path.isdir(d):
            continue
        for f in os.listdir(d):
            if f.endswith(".md"):
                have.setdefault(f[:-3], os.path.join(d, f))

    rows = []
    for tid, title in titles.items():
        p = have.get(tid)
        if not p or not os.path.exists(p):
            rows.append({"id": tid, "title": title, "score": -1, "len": 0, "st": "NO_BODY"})
            continue
        body = strip_md(open(p, encoding="utf-8", errors="replace").read())
        n = len(body)
        sc = 3 if n >= 1500 else 2 if n >= 600 else 1 if n >= a.min_len else 0
        sc += 2 if CODE.search(body) else 0
        sc += 1 if URL.search(body) else 0
        sc += 2 if len(CRYPTO.findall(body)) >= 3 else (1 if CRYPTO.search(body) else 0)
        sc += 2 if len(ACT.findall(body)) >= 6 else (1 if ACT.search(body) else 0)
        rows.append({"id": tid, "title": title, "score": sc, "len": n, "st": "OK"})
    rows.sort(key=lambda r: (-r["score"], -r["len"]))
    print("共 %d 条 | 有正文 %d | 无正文 %d"
          % (len(rows), sum(1 for r in rows if r["st"] == "OK"), sum(1 for r in rows if r["st"] != "OK")))
    for r in rows:
        print("  sc=%2d len=%6d %-7s %s | %s" % (r["score"], r["len"], r["st"], r["id"], r["title"]))
    json.dump(rows, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("输出:", a.out)


if __name__ == "__main__":
    main()
