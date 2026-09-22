#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
m3u8_rewrite.py —— 播放列表本地化改写 + 地址差值分析（零依赖，仅标准库）

为什么需要它
------------
流媒体这一族里，**"把远程 KEY 变成本地 key.key、再交给下载器/ffmpeg"** 是每道题都要做一遍的
机械动作；过去靠手改（把 key 写进 key.key、把 m3u8 里的 URI 换成 key.key、key 与 m3u8 放同一目录）。
本脚本把这套动作一次做对，并且顺带解决两件高频事：

  1. 分片 URL 上的时效 token（`?upt=` / `?token=` / `?wsSecret=`）**必须扩散到每个分片**，
     只给 m3u8 带 token 是常见的"能下不能播"来源；
  2. **地址差值法**：同一路资源用两种途径抓到的两条 URL 并排 diff，
     把"不变段（资源真实标识）"与"变化段（时效鉴权）"分离 —— 直播源/直链类题目的通用解法。

用法
----
    # 0) 自检（含拒绝路径）
    python m3u8_rewrite.py --selftest

    # 1) 本地化改写：远程 KEY → 本地 key.key
    python m3u8_rewrite.py playlist.m3u8 -o local.m3u8 --key-file key.key
    python m3u8_rewrite.py playlist.m3u8 -o local.m3u8 --key-file key.key --key-hex <32位hex>
    python m3u8_rewrite.py playlist.m3u8 -o local.m3u8 --key-file key.key --key-utf8 <16字符>

    # 2) 相对分片 → 绝对地址；去掉分片上的时效 query
    python m3u8_rewrite.py playlist.m3u8 -o local.m3u8 --base https://cdn.example.com/hls/
    python m3u8_rewrite.py playlist.m3u8 -o local.m3u8 --base <url> --strip-query

    # 3) 只想要分片清单
    python m3u8_rewrite.py playlist.m3u8 --dump-urls segs.txt --pretty

    # 4) 地址差值法：两条 URL / 两个 m3u8 并排 diff
    python m3u8_rewrite.py --diff-url "<抓包A的URL>" "<抓包B的URL>"
    python m3u8_rewrite.py --diff a.m3u8 b.m3u8

退出码：0 成功 / 1 输入有问题 / 2 拒绝执行（判据不足或形态不符）
"""

import argparse
import base64
import os
import re
import sys

VERSION = "1.0.0"

ATTR_LINE_RE = re.compile(r"^#EXT-X-(?:SESSION-)?KEY:(.*)$", re.I)
KEY_ATTR_ORDER = ["METHOD", "URI", "IV", "KEYFORMAT", "KEYFORMATVERSIONS"]


# --------------------------------------------------------------------------
# 基础工具
# --------------------------------------------------------------------------
def split_attrs(s):
    """切分 `METHOD=AES-128,URI="a,b",IV=0x00` 这种属性串。

    引号内的逗号不算分隔符（URI 里出现逗号是合法的，天真的 split(',') 会切坏）。
    返回 [(key, value)]，value 已去掉外层引号。
    """
    out, buf, in_q, esc = [], [], False, False
    for ch in s:
        if esc:
            buf.append(ch)
            esc = False
            continue
        if ch == "\\" and in_q:
            buf.append(ch)
            esc = True
            continue
        if ch == '"':
            in_q = not in_q
            buf.append(ch)
            continue
        if ch == "," and not in_q:
            out.append("".join(buf))
            buf = []
            continue
        buf.append(ch)
    if buf:
        out.append("".join(buf))

    pairs = []
    for item in out:
        item = item.strip()
        if not item:
            continue
        if "=" not in item:
            pairs.append((item.upper(), ""))
            continue
        k, v = item.split("=", 1)
        v = v.strip()
        if len(v) >= 2 and v[0] == '"' and v[-1] == '"':
            v = v[1:-1]
        pairs.append((k.strip().upper(), v))
    return pairs


#: HLS 规范里这些属性的值是 quoted-string，必须带引号
QUOTED_ATTRS = {"URI", "KEYFORMAT", "KEYFORMATVERSIONS"}


def join_attrs(pairs):
    """把 [(key, value)] 还原成属性串；含逗号/空格的值、以及 URI 类属性自动加引号。"""
    parts = []
    order = {k: i for i, k in enumerate(KEY_ATTR_ORDER)}
    pairs = sorted(pairs, key=lambda kv: (order.get(kv[0], 99), kv[0]))
    for k, v in pairs:
        if v == "":
            parts.append(k)
            continue
        if not (v.startswith('"') and v.endswith('"')):
            if k in QUOTED_ATTRS or re.search(r"[,\s]", v):
                v = '"%s"' % v
        parts.append("%s=%s" % (k, v))
    return ",".join(parts)


def parse_key_line(line):
    """解析 #EXT-X-KEY 行 → (tag, pairs)；不是 KEY 行则返回 None。"""
    m = ATTR_LINE_RE.match(line.strip())
    if not m:
        return None
    tag = line.strip().split(":", 1)[0].upper()
    return tag, split_attrs(m.group(1))


def is_segment_line(line):
    s = line.strip()
    return bool(s) and not s.startswith("#")


def strip_query(url):
    return url.split("?", 1)[0].split("#", 1)[0]


def join_url(base, rel):
    if not base:
        return rel
    if re.match(r"^[a-zA-Z][a-zA-Z0-9+.\-]*://", rel):
        return rel
    if rel.startswith("/"):
        m = re.match(r"^([a-zA-Z][a-zA-Z0-9+.\-]*://[^/]+)", base)
        return (m.group(1) if m else base.rstrip("/")) + rel
    return base.rstrip("/") + "/" + rel.lstrip("/")


def key_bytes_from_args(a):
    """把 --key-hex / --key-utf8 / --key-b64 归一成 bytes。"""
    if a.key_hex:
        h = a.key_hex.strip().replace("0x", "").replace(" ", "")
        if len(h) % 2:
            raise ValueError("--key-hex 长度必须是偶数（当前 %d 个字符）" % len(h))
        try:
            b = bytes.fromhex(h)
        except ValueError as e:
            raise ValueError("--key-hex 不是合法 hex：%s" % e)
        if len(b) not in (16, 24, 32):
            raise ValueError("--key-hex 解出 %d 字节；AES key 应为 16/24/32 字节" % len(b))
        return b
    if a.key_utf8:
        b = a.key_utf8.encode("utf-8")
        if len(b) not in (16, 24, 32):
            raise ValueError("--key-utf8 编码后 %d 字节；应为 16/24/32" % len(b))
        return b
    if a.key_b64:
        try:
            b = base64.b64decode(a.key_b64, validate=True)
        except Exception as e:
            raise ValueError("--key-b64 不是合法 base64：%s" % e)
        if len(b) not in (16, 24, 32):
            raise ValueError("--key-b64 解出 %d 字节；应为 16/24/32" % len(b))
        return b
    return None


# --------------------------------------------------------------------------
# 主功能 1：播放列表本地化改写
# --------------------------------------------------------------------------
def load_playlist(path):
    if not os.path.isfile(path):
        raise FileNotFoundError("找不到播放列表：%s" % path)
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read().splitlines()


def rewrite(lines, args):
    """返回 (out_lines, report)。"""
    if not lines or not lines[0].strip().upper().startswith("#EXTM3U"):
        raise ValueError("首行不是 #EXTM3U —— 这不像一个播放列表"
                         "（若响应体是 base64 变体，先按 vendor-key-schemes.md §2.4 还原）")

    key_bytes = key_bytes_from_args(args)
    if key_bytes is not None and not args.key_file:
        raise ValueError("给了 --key-hex/--key-utf8/--key-b64 就必须同时给 --key-file（写到哪里）")
    if key_bytes is not None:
        d = os.path.dirname(os.path.abspath(args.key_file))
        if d and not os.path.isdir(d):
            os.makedirs(d, exist_ok=True)
        with open(args.key_file, "wb") as f:
            f.write(key_bytes)

    key_name = os.path.basename(args.key_file) if args.key_file else None
    out, urls, report = [], [], {
        "keys": [], "segments": 0, "rewritten_keys": 0,
        "absolutized": 0, "stripped": 0, "media_sequence": None,
        "key_file": args.key_file, "key_file_written": key_bytes is not None,
    }

    for raw in lines:
        line = raw.rstrip("\r")
        kl = parse_key_line(line)
        if kl:
            tag, pairs = kl
            d = dict(pairs)
            report["keys"].append({
                "tag": tag, "method": d.get("METHOD", ""),
                "uri": d.get("URI", ""), "iv": d.get("IV", ""),
                "keyformat": d.get("KEYFORMAT", ""),
            })
            if key_name and "URI" in d:
                new_pairs = [(k, key_name if k == "URI" else v) for k, v in pairs]
                out.append("%s:%s" % (tag, join_attrs(new_pairs)))
                report["rewritten_keys"] += 1
                continue
            out.append(line)
            continue

        if line.startswith("#EXT-X-MEDIA-SEQUENCE"):
            report["media_sequence"] = line.split(":", 1)[1].strip()

        if is_segment_line(line):
            report["segments"] += 1
            seg = line
            if args.base:
                new = join_url(args.base, seg)
                if new != seg:
                    report["absolutized"] += 1
                seg = new
            if args.strip_query:
                new = strip_query(seg)
                if new != seg:
                    report["stripped"] += 1
                seg = new
            urls.append(seg)
            out.append(seg)
            continue

        out.append(line)

    return out, urls, report


def cmd_rewrite(args):
    lines = load_playlist(args.input)
    out, urls, report = rewrite(lines, args)

    if args.dump_urls:
        d = os.path.dirname(os.path.abspath(args.dump_urls))
        if d and not os.path.isdir(d):
            os.makedirs(d, exist_ok=True)
        with open(args.dump_urls, "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(urls) + ("\n" if urls else ""))

    if args.out:
        d = os.path.dirname(os.path.abspath(args.out))
        if d and not os.path.isdir(d):
            os.makedirs(d, exist_ok=True)
        with open(args.out, "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(out) + "\n")

    # 本地化后校验：key_file 必须真的存在，否则下载器会在运行时才炸
    warns = []
    if report["rewritten_keys"] and not os.path.isfile(args.key_file):
        warns.append("播放列表已指向 %s，但该文件不存在" % args.key_file)
    if not args.key_file and report["keys"]:
        warns.append("播放列表里仍有远程 KEY（%d 条）——加 --key-file 才能本地化" % len(report["keys"]))

    if args.pretty or True:
        print("== m3u8 改写报告 ==")
        print("输出            : %s" % (args.out or "(未写盘)"))
        print("分片数          : %d" % report["segments"])
        print("KEY 行          : %d（已本地化 %d）" % (len(report["keys"]), report["rewritten_keys"]))
        for k in report["keys"]:
            print("  - %s METHOD=%s URI=%s%s%s"
                  % (k["tag"], k["method"] or "-", k["uri"] or "-",
                     " IV=%s" % k["iv"] if k["iv"] else "",
                     " KEYFORMAT=%s" % k["keyformat"] if k["keyformat"] else ""))
        print("MEDIA-SEQUENCE  : %s" % (report["media_sequence"] or "(无 —— IV 缺省时无法用序列号推导)"))
        print("绝对化 / 去参   : %d / %d" % (report["absolutized"], report["stripped"]))
        if report["key_file"]:
            print("key 落盘        : %s%s"
                  % (report["key_file"], "(本次写入)" if report["key_file_written"] else "(沿用已有文件)"))
        for w in warns:
            print("⚠️  %s" % w)
        if not report["keys"] and report["segments"]:
            print("提示：本播放列表里没有 #EXT-X-KEY ⇒ 判为 A 层不成立，"
                  "key 可能来自接口/派生（见 vendor-key-schemes.md）。")
    return 0


# --------------------------------------------------------------------------
# 主功能 2：地址差值法
# --------------------------------------------------------------------------
URL_RE = re.compile(r"^([a-zA-Z][a-zA-Z0-9+.\-]*)://([^/?#]*)([^?#]*)(?:\?([^#]*))?")


def url_parts(u):
    m = URL_RE.match(u.strip())
    if not m:
        return None
    return {"scheme": m.group(1), "host": m.group(2),
            "path": m.group(3) or "", "query": m.group(4) or ""}


def query_pairs(q):
    if not q:
        return []
    out = []
    for item in q.split("&"):
        if not item:
            continue
        if "=" in item:
            k, v = item.split("=", 1)
        else:
            k, v = item, ""
        out.append((k, v))
    return out


def url_diff(u1, u2):
    a, b = url_parts(u1), url_parts(u2)
    if a is None or b is None:
        raise ValueError("两条里至少有一条不是合法 URL")
    rep = {"host_same": a["host"] == b["host"], "a_host": a["host"], "b_host": b["host"],
           "scheme_same": a["scheme"] == b["scheme"],
           "a_path": a["path"], "b_path": b["path"],
           "stable_path_prefix": "", "varying_path_tail": [],
           "only_a": [], "only_b": [], "same_val": [], "diff_val": []}

    pa = [s for s in a["path"].split("/")]
    pb = [s for s in b["path"].split("/")]
    i = 0
    while i < len(pa) and i < len(pb) and pa[i] == pb[i]:
        i += 1
    rep["stable_path_prefix"] = "/".join(pa[:i])
    rep["varying_path_tail"] = [("A", "/".join(pa[i:])), ("B", "/".join(pb[i:]))]

    qa, qb = dict(query_pairs(a["query"])), dict(query_pairs(b["query"]))
    for k in qa:
        if k not in qb:
            rep["only_a"].append((k, qa[k]))
        elif qa[k] == qb[k]:
            rep["same_val"].append((k, qa[k]))
        else:
            rep["diff_val"].append((k, qa[k], qb[k]))
    for k in qb:
        if k not in qa:
            rep["only_b"].append((k, qb[k]))
    return rep


def cmd_diff(args):
    if args.diff:
        if len(args.diff) != 2:
            print("--diff 需要恰好两个文件", file=sys.stderr)
            return 1
        lists = []
        for p in args.diff:
            lines = load_playlist(p)
            lists.append([l.strip() for l in lines if is_segment_line(l)])
        n = min(len(lists[0]), len(lists[1]))
        if n == 0:
            print("两个文件里都没有分片行", file=sys.stderr)
            return 1
        print("== 分片清单差值（前 %d 条）==" % n)
        for i in range(n):
            r = url_diff(lists[0][i], lists[1][i])
            print("\n[%d] A: %s" % (i, lists[0][i]))
            print("    B: %s" % lists[1][i])
            _print_diff(r)
        return 0

    if len(args.diff_url) != 2:
        print("--diff-url 需要恰好两条 URL", file=sys.stderr)
        return 1
    r = url_diff(args.diff_url[0], args.diff_url[1])
    print("== 地址差值 ==")
    print("A: %s" % args.diff_url[0])
    print("B: %s" % args.diff_url[1])
    _print_diff(r)
    if r["stable_path_prefix"]:
        host = r["a_host"] if r["host_same"] else "<域名不一致，见上>"
        print("\n建议的『标准格式』骨架：")
        print("  %s://%s%s/<资源标识>" % (
            "https" if r["scheme_same"] and "https" in args.diff_url[0][:8] else "http",
            host, r["stable_path_prefix"]))
        print("  ⇒ 把 <资源标识> 换成变化段里的那截；全部 query 先整段删掉再试。")
    return 0


def _print_diff(r):
    print("  域名            : %s" % ("相同" if r["host_same"] else "不同 → A=%s / B=%s"
                                     % (r["a_host"], r["b_host"])))
    print("  路径不变前缀    : %s" % (r["stable_path_prefix"] or "(无)"))
    print("  路径变化段      : %s" % (" | ".join("%s=%s" % t for t in r["varying_path_tail"])))
    if r["only_a"]:
        print("  只在 A 的 query  : %s" % ", ".join("%s=%s" % t for t in r["only_a"]))
    if r["only_b"]:
        print("  只在 B 的 query  : %s" % ", ".join("%s=%s" % t for t in r["only_b"]))
    if r["same_val"]:
        print("  两遍都相同      : %s" % ", ".join("%s=%s" % t for t in r["same_val"]))
    if r["diff_val"]:
        print("  两遍不同（时效）: %s" % ", ".join("%s: %s → %s" % t for t in r["diff_val"]))
    if not r["only_a"] and not r["only_b"] and not r["same_val"] and not r["diff_val"]:
        print("  query           : (无)")


# --------------------------------------------------------------------------
# 自检
# --------------------------------------------------------------------------
SAMPLE_PLAYLIST = """#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-KEY:METHOD=AES-128,URI="https://cdn.example.com/key?token=abc",IV=0x00000000000000000000000000000000
#EXTINF:10.0,
seg0.ts?upt=deadbeef&news
#EXTINF:10.0,
seg1.ts?upt=deadbeef&news
#EXT-X-ENDLIST
"""

SAMPLE_PLAYLIST_NO_KEY = """#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
seg0.ts
"""


def _selftest():
    import contextlib
    import io
    import tempfile
    import shutil
    ok = fail = 0
    msgs = []

    def chk(name, cond, extra=""):
        nonlocal ok, fail
        if cond:
            ok += 1
        else:
            fail += 1
            msgs.append("FAIL %s %s" % (name, extra))

    # 被测函数的正常输出（报告）在自检里是噪声，统一吞掉，只在失败时把 extra 打出来
    quiet = contextlib.redirect_stdout(io.StringIO())

    tmp = tempfile.mkdtemp(prefix="m3u8rw-")
    try:
        pl = os.path.join(tmp, "playlist.m3u8")
        with open(pl, "w", encoding="utf-8", newline="\n") as f:
            f.write(SAMPLE_PLAYLIST)
        plnk = os.path.join(tmp, "nokey.m3u8")
        with open(plnk, "w", encoding="utf-8", newline="\n") as f:
            f.write(SAMPLE_PLAYLIST_NO_KEY)

        # --- 1. 属性切分：URI 里带逗号不能被切坏 ---
        pairs = split_attrs('METHOD=AES-128,URI="https://a/b,c.ts",IV=0x00')
        d = dict(pairs)
        chk("split_attrs 引号内逗号", d.get("URI") == "https://a/b,c.ts", str(d))
        chk("split_attrs METHOD", d.get("METHOD") == "AES-128")
        chk("split_attrs IV", d.get("IV") == "0x00")
        chk("split_attrs 项数", len(pairs) == 3, str(len(pairs)))

        # 还原后再解析，必须等价（往返）
        s = join_attrs(pairs)
        chk("join/split 往返", dict(split_attrs(s)) == d, s)
        chk("join 给含逗号值加引号", '"https://a/b,c.ts"' in s, s)

        # --- 2. 本地化改写 + key 落盘 ---
        keyfile = os.path.join(tmp, "key.key")
        a = argparse.Namespace(
            input=pl, out=os.path.join(tmp, "local.m3u8"), key_file=keyfile,
            key_hex="00112233445566778899aabbccddeeff",
            key_utf8=None, key_b64=None, base=None, strip_query=False,
            dump_urls=None, pretty=True, diff=None, diff_url=None)
        with quiet:
            rc = cmd_rewrite(a)
        chk("rewrite 退出码 0", rc == 0, str(rc))
        with open(keyfile, "rb") as f:
            kb = f.read()
        chk("key 落盘字节正确", kb == bytes.fromhex("00112233445566778899aabbccddeeff"), kb.hex())
        local = open(os.path.join(tmp, "local.m3u8"), encoding="utf-8").read()
        chk("URI 已指向 key.key", 'URI="key.key"' in local, local)
        chk("本地化后不再出现远程域名", "cdn.example.com/key" not in local)
        chk("METHOD 保留", "METHOD=AES-128" in local)
        chk("IV 保留", "0x00000000000000000000000000000000" in local)
        chk("分片行数不变", local.count("seg0.ts") == 1 and local.count("seg1.ts") == 1)
        chk("分片 query 未被误删", "upt=deadbeef" in local)

        # --- 3. --base + --strip-query ---
        a2 = argparse.Namespace(
            input=pl, out=os.path.join(tmp, "local2.m3u8"), key_file=keyfile,
            key_hex=None, key_utf8=None, key_b64=None,
            base="https://cdn2.example.com/hls", strip_query=True,
            dump_urls=os.path.join(tmp, "segs.txt"), pretty=True,
            diff=None, diff_url=None)
        with quiet:
            rc = cmd_rewrite(a2)
        chk("base+strip 退出码 0", rc == 0, str(rc))
        l2 = open(os.path.join(tmp, "local2.m3u8"), encoding="utf-8").read()
        chk("相对分片已绝对化", "https://cdn2.example.com/hls/seg0.ts" in l2, l2)
        chk("分片 query 已去掉", "upt=deadbeef" not in l2)
        segs = open(os.path.join(tmp, "segs.txt"), encoding="utf-8").read().strip().split("\n")
        chk("dump-urls 条数", len(segs) == 2, str(segs))
        chk("dump-urls 内容", segs[0] == "https://cdn2.example.com/hls/seg0.ts", segs[0])
        # key 行 URI 指向本地文件，--base 只作用于分片，不该把它拼成绝对地址
        chk("KEY 行指向本地 key 且未被 --base 改写",
            'URI="key.key"' in l2 and "https://cdn2.example.com/hls/key.key" not in l2, l2)

        # --- 4. --key-utf8 长度校验（拒绝路径）---
        a3 = argparse.Namespace(
            input=pl, out=None, key_file=keyfile, key_hex=None,
            key_utf8="short", key_b64=None, base=None, strip_query=False,
            dump_urls=None, pretty=True, diff=None, diff_url=None)
        try:
            with quiet:
                cmd_rewrite(a3)
            chk("短 key 应报错", False, "没有抛异常")
        except ValueError as e:
            chk("短 key 报错可读", "16/24/32" in str(e), str(e))

        # --- 5. 奇数长度 hex（拒绝路径）---
        a4 = argparse.Namespace(
            input=pl, out=None, key_file=keyfile, key_hex="abc",
            key_utf8=None, key_b64=None, base=None, strip_query=False,
            dump_urls=None, pretty=True, diff=None, diff_url=None)
        try:
            with quiet:
                cmd_rewrite(a4)
            chk("奇数 hex 应报错", False, "没有抛异常")
        except ValueError as e:
            chk("奇数 hex 报错可读", "偶数" in str(e), str(e))

        # --- 6. 非播放列表（拒绝路径）---
        bad = os.path.join(tmp, "bad.m3u8")
        with open(bad, "w", encoding="utf-8") as f:
            f.write("this is not a playlist\n")
        a5 = argparse.Namespace(
            input=bad, out=None, key_file=None, key_hex=None, key_utf8=None,
            key_b64=None, base=None, strip_query=False, dump_urls=None,
            pretty=True, diff=None, diff_url=None)
        try:
            with quiet:
                cmd_rewrite(a5)
            chk("非播放列表应拒绝", False, "没有抛异常")
        except ValueError as e:
            chk("非播放列表报错可读", "#EXTM3U" in str(e), str(e))

        # --- 7. 无 KEY 的播放列表：不报错，但报告里要给出提示 ---
        a6 = argparse.Namespace(
            input=plnk, out=None, key_file=None, key_hex=None, key_utf8=None,
            key_b64=None, base=None, strip_query=False, dump_urls=None,
            pretty=True, diff=None, diff_url=None)
        with quiet:
            rc = cmd_rewrite(a6)
        chk("无 KEY 播放列表可正常处理", rc == 0, str(rc))

        # --- 8. 地址差值法：直播源场景 ---
        u1 = "http://hls1a.douyucdn.cn/live/1525851rffvVYsm7_2200/playlist.m3u8?wsSecret=0a0646be&wsTime=1557997214&did=abc"
        u2 = "https://tx2play1.douyucdn.cn/live/1525851rffvVYsm7_4000p.xs?token=h5-douyu-0-1525851-f166&did=abc"
        r = url_diff(u1, u2)
        chk("diff 域名不同", r["host_same"] is False)
        chk("diff 不变前缀 /live", r["stable_path_prefix"] == "/live", r["stable_path_prefix"])
        chk("diff 变化段含资源标识",
            any("1525851rffvVYsm7" in t[1] for t in r["varying_path_tail"]),
            str(r["varying_path_tail"]))
        chk("diff 只 A 有的时效参数", any(k == "wsSecret" for k, _ in r["only_a"]), str(r["only_a"]))
        chk("diff 只 B 有的时效参数", any(k == "token" for k, _ in r["only_b"]), str(r["only_b"]))
        chk("diff 两遍相同的参数", any(k == "did" for k, _ in r["same_val"]), str(r["same_val"]))

        # 同 URL 自己和自己 diff：不该报出任何差异
        r2 = url_diff(u1, u1)
        chk("自 diff 无变化段", all(not v for v in r2["diff_val"]), str(r2["diff_val"]))
        chk("自 diff 域名相同", r2["host_same"] is True)

        # 非法 URL（拒绝路径）
        try:
            url_diff("not a url", u1)
            chk("非法 URL 应报错", False, "没有抛异常")
        except ValueError:
            chk("非法 URL 报错", True)

        # --- 9. 缺文件（干净失败，不甩裸 traceback）---
        try:
            load_playlist(os.path.join(tmp, "nope.m3u8"))
            chk("缺文件应报错", False, "没有抛异常")
        except FileNotFoundError as e:
            chk("缺文件报错可读", "找不到播放列表" in str(e), str(e))

        # --- 10. strip_query 不应影响带 query 的目录型 URI 里的路径 ---
        chk("strip_query 只砍 query", strip_query("a/b.ts?x=1&y=2") == "a/b.ts")
        chk("join_url 绝对地址原样返回",
            join_url("https://h/hls", "https://o/k.ts") == "https://o/k.ts")
        chk("join_url 根路径替换 host",
            join_url("https://h/hls/", "/k.ts") == "https://h/k.ts")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print("== m3u8_rewrite.py 自检 ==")
    for m in msgs:
        print("  " + m)
    print("通过 %d / 失败 %d" % (ok, fail))
    return 0 if fail == 0 else 1


# --------------------------------------------------------------------------
def main(argv=None):
    ap = argparse.ArgumentParser(
        prog="m3u8_rewrite.py",
        description="m3u8 本地化改写（远程 KEY → 本地 key.key / 绝对化 / 去时效参数）+ 地址差值分析")
    ap.add_argument("input", nargs="?", help="输入播放列表（.m3u8）")
    ap.add_argument("-o", "--out", help="输出播放列表")
    ap.add_argument("--key-file", help="本地 key 文件名（播放列表将指向它；也是 --key-* 的落盘目标）")
    ap.add_argument("--key-hex", help="16/24/32 字节 key（hex），配合 --key-file 落盘")
    ap.add_argument("--key-utf8", help="key（UTF-8 字符串，编码后须为 16/24/32 字节）")
    ap.add_argument("--key-b64", help="key（base64）")
    ap.add_argument("--base", help="把相对分片拼成绝对地址的基地址")
    ap.add_argument("--strip-query", action="store_true", help="去掉分片 URL 上的 query（时效参数）")
    ap.add_argument("--dump-urls", help="把所有分片 URL 写到这个文件")
    ap.add_argument("--pretty", action="store_true", help="打印报告")
    ap.add_argument("--diff", nargs=2, metavar=("A.m3u8", "B.m3u8"),
                    help="两个播放列表逐条做地址差值")
    ap.add_argument("--diff-url", nargs=2, metavar=("URL_A", "URL_B"),
                    help="两条 URL 做地址差值（直播源/直链场景）")
    ap.add_argument("--selftest", action="store_true", help="跑内置自检")
    ap.add_argument("--version", action="version", version="m3u8_rewrite.py " + VERSION)
    args = ap.parse_args(argv)

    if args.selftest:
        return _selftest()
    if args.diff or args.diff_url:
        return cmd_diff(args)
    if not args.input:
        ap.print_help()
        return 1
    try:
        return cmd_rewrite(args)
    except (ValueError, FileNotFoundError) as e:
        print("错误：%s" % e, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
