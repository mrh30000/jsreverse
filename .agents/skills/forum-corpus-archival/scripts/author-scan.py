#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""作者维度通道（forum-corpus-archival 技能脚本，见坑 97/99）。

思路：已归档语料里抽取 `> **作者**: X`，对「有 >=2 篇归档」的作者（= 已证明的同领域写手），
解析其个人空间主题列表（`home.php?mod=space&uid=..&do=thread`），与全量池/已归档/黑名单 diff
—— 这类帖是「标题不含关键词、也不在版块采样深度内」的第三类盲区。

两个必须记住的坑（本轮实测）：
  1. `hubcli browser eval` **不 await Promise**：async IIFE 一律得到 `None`，必须用**同步 XHR**。
  2. Discuz 的 `?username=` 参数要 **GBK 百分号编码**（与搜索关键词同源，UTF-8 直接返回「提示信息」错误页）。

用法：python author-scan.py --tab <标签页ID> --authors authors.json --out author.json [--min-arch 2] [--limit N]

⚠️ 硬约束（务必先读坑 97）：本脚本走浏览器同源 XHR，⚠️ 必须在所有 RPC 抓取**之后**再跑，
   且节奏 ≥6 s/作者；一旦发现 WAF 立即停止（脚本会在 result 里带 err/waf 迹象，请人工判读日志）。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import urllib.parse

JS_TMPL = r"""
(function () {
  var A = __AUTHOR__;
  var PROF = __PROF__;
  var out = {a: A, uid: null, n: 0, items: []};
  var best = {};
  try {
    var x = new XMLHttpRequest();
    x.open('GET', '/home.php?mod=space&username=' + PROF, false);
    x.send();
    var h = x.responseText || '';
    var m = h.match(/uid=(\d+)[^"']{0,40}do=thread/);
    if (m) out.uid = m[1];
  } catch (e) { return JSON.stringify({a: A, uid: null, err: String(e).slice(0, 60), n: 0, items: []}); }
  if (!out.uid) return JSON.stringify(out);
  for (var p = 1; p <= 15; p++) {
    var txt;
    try {
      var x2 = new XMLHttpRequest();
      x2.open('GET', '/home.php?mod=space&uid=' + out.uid + '&do=thread&type=thread&page=' + p, false);
      x2.send();
      txt = x2.responseText || '';
    } catch (e) { break; }
    var doc = new DOMParser().parseFromString(txt, 'text/html');
    var as = doc.querySelectorAll('#ct .mn a[href*="thread-"]');
    var n = 0;
    for (var i = 0; i < as.length; i++) {
      var hh = as[i].getAttribute('href') || '';
      var mm = hh.match(/thread-(\d+)/);
      if (!mm) continue;
      var t = (as[i].textContent || '').trim();
      if (t.length < 4) continue;
      if (!best[mm[1]]) { best[mm[1]] = t; out.items.push({id: mm[1], t: t.slice(0, 90)}); n++; }
      else if (t.length > best[mm[1]].length) {
        best[mm[1]] = t;
        for (var j = 0; j < out.items.length; j++) if (out.items[j].id === mm[1]) out.items[j].t = t.slice(0, 90);
      }
    }
    if (n === 0) break;
  }
  out.n = out.items.length;
  return JSON.stringify(out);
})()
"""


def gbk_enc(name):
    return urllib.parse.quote(name.encode("gbk", "ignore"), safe="")


def run_author(tab, author, retries=2):
    code = (JS_TMPL.replace("__AUTHOR__", json.dumps(author, ensure_ascii=False))
                    .replace("__PROF__", json.dumps(gbk_enc(author))))
    for k in range(retries + 1):
        try:
            r = subprocess.run(["hubcli", "browser", "eval", "--tab_id", str(tab),
                                "--code", code, "--json"],
                               capture_output=True, text=True, encoding="utf-8",
                               timeout=240, shell=False)
            out = (r.stdout or "").strip()
            if not out:
                time.sleep(3)
                continue
            data = json.loads(out)
            res = data[0]["result"] if isinstance(data, list) and data else None
            if isinstance(res, str):
                return json.loads(res)
            return res
        except Exception as e:
            sys.stderr.write("  retry %s: %s\n" % (author, str(e)[:90]))
            time.sleep(4)
    return {"a": author, "uid": None, "n": 0, "items": []}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tab", type=int, required=True)
    ap.add_argument("--authors", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--min-arch", type=int, default=2)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--sleep", type=float, default=1.0)
    a = ap.parse_args()

    files = json.load(open(a.authors, encoding="utf-8"))
    names = [k for k, v in files.items() if len(v) >= a.min_arch]
    names.sort(key=lambda k: -len(files[k]))
    if a.limit:
        names = names[:a.limit]
    print("待扫作者 %d" % len(names), flush=True)

    res = {}
    for i, nm in enumerate(names, 1):
        d = run_author(a.tab, nm)
        res[nm] = d
        print("%3d/%d %-24s uid=%s n=%d" % (i, len(names), nm, d.get("uid"), d.get("n", 0)), flush=True)
        time.sleep(a.sleep)
    json.dump(res, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    tot = sum(d.get("n", 0) for d in res.values())
    print("总计主题 %d 条（%d 位作者）" % (tot, len(res)))


if __name__ == "__main__":
    main()
