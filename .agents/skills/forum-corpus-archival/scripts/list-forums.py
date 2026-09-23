#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""list-forums.py —— 动态抓取论坛「全部版块清单」（Discuz / 通用）

为什么需要它（skill 坑 58）：
  历轮把「要枚举哪些版块」写死在 board-sweep.py 的 FALLBACK_FORUMS 里（13 个"有人气"版块），
  **从未核对站点真实清单**。52pojie 实测真实有 35 个版块 —— 漏掉的 22 个里包括
  精品软件区（27548 帖）、水漫金山（14998 帖）、编程语言讨论求助区（6398 帖）、
  恶意网址区（797 帖，第二十三轮 2/3 产出）。**版块清单必须动态抓，不要手工维护。**

用法：
  hubcli browser tabs                                   # 找到目标站点的 tab_id
  python list-forums.py --tab-id 228607468              # 打印 fid=名称 列表
  python list-forums.py --tab-id 228607468 --fids-only  # 只打印逗号分隔的 fid（喂给 board-sweep）

实现要点（本轮踩过的坑）：
  * 必须用 `Array.from(document.links).map(a=>a.getAttribute("href")).filter(...indexOf...)`；
    `querySelectorAll('a[href*="forum-"]')` 这类带转义引号的选择器经 CLI 传参会报
    `SyntaxError: Unexpected token ')'`。
  * 同一 fid 会以「折叠 / 展开」两种锚文本出现 → 取最长名称去重。
  * hubcli 输出形如：`228607468,"[\\"15=...\\",...]",str` → 先定位首个 `"` 再 `raw_decode`。
"""
import argparse
import json
import subprocess
import sys

JS = (
    "JSON.stringify(Array.from(document.links)"
    ".filter(a=>/^forum-[0-9]+-1[.]html$/.test(a.getAttribute('href')||''))"
    ".map(a=>a.getAttribute('href').match(/[0-9]+/)[0]+'='+(a.textContent||'').trim()))"
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tab-id", required=True, help="站点标签页 id（hubcli browser tabs 可查）")
    ap.add_argument("--fids-only", action="store_true", help="只输出逗号分隔的 fid 列表")
    a = ap.parse_args()

    r = subprocess.run(["hubcli", "browser", "eval", "--tab_id", a.tab_id, "--code", JS],
                       capture_output=True, text=True, encoding="utf-8", timeout=120, shell=False)
    out = (r.stdout or "").strip()
    i = out.find('"')
    if i < 0:
        print("解析失败，原始输出：\n" + out[:800], file=sys.stderr)
        return 1
    payload, _ = json.JSONDecoder().raw_decode(out[i:])
    pairs = json.loads(payload)          # ["15=投诉举报…", "16=精品软件区", ...]

    names = {}
    for p in pairs:
        if "=" not in p:
            continue
        fid, nm = p.split("=", 1)
        nm = nm.strip()
        if nm and len(nm) > len(names.get(fid, "")):
            names[fid] = nm
    if a.fids_only:
        print(",".join(sorted(names, key=int)))
        return 0
    for fid in sorted(names, key=int):
        print("%4s = %s" % (fid, names[fid]))
    print("\n共 %d 个版块 → --fids %s"
          % (len(names), ",".join(sorted(names, key=int))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
