#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""浏览器驱动的论坛搜索（绕过 hubcli `search` 的字符集失效 + `--limit` 截断）。

为什么需要它（52pojie 实测，见 SKILL.md 坑 27~29）：
  1. `hubcli <platform> search --keyword <中文>` 现在**恒定返回 `[]`** —— hubcli 按 UTF-8
     百分号编码提交关键词，而 52pojie 是 **GBK** 站点，服务端按 GBK 解码 → 关键词变乱码
     （"滑块" → "婊戝潡"）→ 0 结果。这不是限频、不是 WAF、也不是「真实零结果」。
  2. `search --limit 40` 对热门词**截断**（坑 14），而搜索页自带 `searchid` 分页
     （`共 N 页`，每页 50 条）→ 单关键词最多 ~200 条。**历轮被截断的存量老帖只能靠这里拿回**。
  3. 本仓库 shell 宿主是 cmd.exe：`subprocess.run(..., shell=True)` 会把 URL 里的 `&`
     当命令分隔符，把 navigate 的 URL 截断成 `search.php?mod=forum` → **必须 `shell=False`**。
  4. **不能**用 `waf_slider_verify` 之类的字符串直接判 WAF：正常搜索页尾部 `<script>` 就引用了
     `waf_*_verify.html`。判据应为「**页面没有 `相关内容` 标记** 且命中 WAF 文案」。

用法:
  python browser-search.py --kw-file kw.txt --outdir search12 [--tab 228607142]
                           [--base https://www.52pojie.cn] [--path search.php?mod=forum]
                           [--encoding gbk] [--gap 12] [--limit-kw N]
  # kw.txt 一行一个关键词（UTF-8）；结果落盘 <outdir>/<kw>.json = [{"id","title","forum","url"}]
  # 结果文件存在即跳过（断点续跑）。汇总写 <outdir>_pool.json。
"""
import argparse
import html as htmlmod
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse

ITEM_RE = re.compile(r'<li class="pbw" id="(\d+)">(.*?)(?=<li class="pbw"|</ul>)', re.S)
TITLE_RE = re.compile(r'<h3 class="xs3">\s*<a[^>]*>(.*?)</a>', re.S)
FORUM_RE = re.compile(r'href="forum-(\d+)-1\.html"[^>]*class="xi1">(.*?)</a>')
SEARCHID_RE = re.compile(r"searchid=(\d+)")
PAGES_RE = re.compile(r"共\s*(\d+)\s*页")
COUNT_RE = re.compile(r"相关内容\s*(\d+)\s*个")
TAG_RE = re.compile(r"<[^>]+>")
RATELIMIT = "10 秒内只能进行一次搜索"
WAF_SIGNS = ("访问验证", "请完成安全验证", "向右滑动填充拼图", "安全验证")
RESULT_MARK = ("相关内容", '<li class="pbw"')

CFG = {}


def sh(args, timeout=150):
    try:
        r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=timeout, shell=False)
        return (r.stdout or "") + (r.stderr or "")
    except Exception as e:                                  # noqa: BLE001
        return f"__ERR__ {e}"


def clean(s):
    return re.sub(r"\s+", " ", htmlmod.unescape(TAG_RE.sub("", s))).strip()


def parse(html):
    items = []
    for tid, blk in ITEM_RE.findall(html):
        m = TITLE_RE.search(blk)
        title = clean(m.group(1)) if m else ""
        if not title:
            m2 = re.search(r"viewthread&amp;tid=%s[^>]*>(.*?)</a>" % tid, blk, re.S)
            title = clean(m2.group(1)) if m2 else ""
        fm = FORUM_RE.search(blk)
        items.append({"id": tid, "title": title,
                      "forum": clean(fm.group(2)) if fm else "",
                      "url": f"{CFG['base']}/thread-{tid}-1-1.html"})
    sid = SEARCHID_RE.search(html)
    pg = PAGES_RE.search(html)
    cnt = COUNT_RE.search(html)
    return (items, sid.group(1) if sid else None,
            int(pg.group(1)) if pg else 1, int(cnt.group(1)) if cnt else len(items))


def search(kw, tmp, confirm=True):
    """confirm=True 时对「零结果」做二次确认（坑 17）：首次 [] 不算数，隔一个 GAP 复测。"""
    q = urllib.parse.quote(kw.encode(CFG["encoding"]), safe="")
    url1 = (f"{CFG['base']}/{CFG['path']}&srchtxt={q}"
            f"&orderby=lastpost&ascdesc=desc&searchsubmit=yes")
    for _ in range(3):
        sh(["hubcli", "browser", "navigate", "--tab_id", CFG["tab"], "--url", url1])
        time.sleep(2.5)
        sh(["hubcli", "browser", "content", "--tab_id", CFG["tab"],
            "--type", "html", "--output", tmp])
        if not os.path.exists(tmp):
            time.sleep(CFG["gap"])
            continue
        h = open(tmp, encoding="utf-8", errors="replace").read()
        has = any(k in h for k in RESULT_MARK)
        if not has and any(s in h for s in WAF_SIGNS):
            return None, "WAF"
        if RATELIMIT in h:
            time.sleep(CFG["gap"] + 4)
            continue
        items, sid, pages, cnt = parse(h)
        if sid is None and cnt == 0 and "相关内容 0 个" in h:
            if not confirm:
                return [], "zero"
            time.sleep(CFG["gap"])
            again, note2 = search(kw, tmp, confirm=False)
            if again is None:
                return None, note2
            if again:
                return again, "zero->confirm-hit"
            return [], "zero(confirmed)"
        if sid is None:
            time.sleep(CFG["gap"])
            continue
        seen = {x["id"]: x for x in items}
        for p in range(2, min(pages, 10) + 1):
            url = (f"{CFG['base']}/{CFG['path']}&searchid={sid}"
                   f"&orderby=lastpost&ascdesc=desc&searchsubmit=yes&kw={q}&page={p}")
            sh(["hubcli", "browser", "navigate", "--tab_id", CFG["tab"], "--url", url])
            time.sleep(1.5)
            sh(["hubcli", "browser", "content", "--tab_id", CFG["tab"],
                "--type", "html", "--output", tmp])
            if not os.path.exists(tmp):
                break
            hp = open(tmp, encoding="utf-8", errors="replace").read()
            if not any(k in hp for k in RESULT_MARK):
                break
            for x in parse(hp)[0]:
                seen.setdefault(x["id"], x)
        return list(seen.values()), f"pages={pages} count={cnt}"
    return None, "failed"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kw-file", required=True)
    ap.add_argument("--outdir", required=True)
    ap.add_argument("--tab", default="")
    ap.add_argument("--base", default="https://www.52pojie.cn")
    ap.add_argument("--path", default="search.php?mod=forum")
    ap.add_argument("--encoding", default="gbk")
    ap.add_argument("--gap", type=float, default=12)
    ap.add_argument("--limit-kw", type=int, default=0)
    ap.add_argument("--zero-fuse", type=int, default=0,
                    help="连续 N 个「已二次确认的零结果」后收口中止（0=关闭，建议 12）")
    a = ap.parse_args()
    CFG.update(vars(a))
    os.makedirs(a.outdir, exist_ok=True)
    kws = [l.strip() for l in open(a.kw_file, encoding="utf-8") if l.strip()]
    if a.limit_kw:
        kws = kws[:a.limit_kw]
    tmp = os.path.join(a.outdir, "_tmp_page.html")
    total, zero, failed = {}, [], []
    consec_zero = 0
    for i, kw in enumerate(kws, 1):
        path = os.path.join(a.outdir, re.sub(r'[\\/:*?"<>|\s]', "_", kw) + ".json")
        if os.path.exists(path):
            print(f"[{i}/{len(kws)}] {kw}: skip(done)", flush=True)
            continue
        items, note = search(kw, tmp)
        if items is None:
            failed.append((kw, note))
            print(f"[{i}/{len(kws)}] {kw}: FAILED ({note})", flush=True)
            if note == "WAF":
                print("!! WAF -> 中止（先恢复浏览器标签页再续跑）", flush=True)
                break
            time.sleep(a.gap)
            continue
        json.dump(items, open(path, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        if not items:
            zero.append(kw)
            consec_zero += 1
            print(f"[{i}/{len(kws)}] {kw}: ZERO (consec={consec_zero})", flush=True)
        else:
            consec_zero = 0
            for x in items:
                total[x["id"]] = x
            print(f"[{i}/{len(kws)}] {kw}: {len(items)} ({note}) union={len(total)}",
                  flush=True)
        time.sleep(a.gap)
        if a.zero_fuse and consec_zero >= a.zero_fuse:
            print(f"!! 连续 {consec_zero} 个零结果 -> 收口中止（尾部已无收益）", flush=True)
            break
    out = a.outdir.rstrip("/\\") + "_pool.json"
    json.dump(total, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n== summary == kw:{len(kws)} union:{len(total)} zero:{len(zero)} failed:{failed}")
    print("zero:", zero)
    print("wrote", out)


if __name__ == "__main__":
    main()
