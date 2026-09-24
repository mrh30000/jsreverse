#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""蓝奏云系（lanzou*）代际判据 / 参数抽取 / 最终地址组装 / 302 解析 / 门禁自查。

零依赖（只用标准库）。所有正则与字段名都来自真实来源文章，
来源与取证年份逐条记在 `references/lanzou-protocol-generations.md` §6 与
`references/direct-link-gating-and-freshness.md` §6 的来源表里。

⚠️ 站点平均一到两年换一次代际。**任何写死的形状都要连同"取证年份"一起引用**，
   复用前先用 `detect` 对当前页面重新判据。

用法：
    python lanzou_parse.py detect  --in share-page.html
    python lanzou_parse.py params  --in hop2.html [--pwd 6666]
    python lanzou_parse.py final   --json '{"zt":1,"dom":"https:\\/\\/x","url":"?A"}'
    python lanzou_parse.py location --in 302-headers.txt
    python lanzou_parse.py folder  --in folder-page.html [--pwd fp0b]
    python lanzou_parse.py gating  --referer '<hop2>' --full '<dom>/file/<url>'
    python lanzou_parse.py --selftest
"""

from __future__ import annotations

import argparse
import json
import re
import sys

# ---------------------------------------------------------------------------
# 常量：全部来自来源文章（见 references 的来源表）
# ---------------------------------------------------------------------------

# G2024 / G2022 无码链：<iframe class="ifr2" name="\d+" src="..." frameborder="0" scrolling="no">
IFRAME_ANY_RE = re.compile(r"<iframe\b[^>]*?\bsrc=\"([^\"]+)\"", re.I)
IFRAME_IFR2_RE = re.compile(r"<iframe\b[^>]*?\bclass=\"ifr2\"[^>]*?\bsrc=\"([^\"]+)\"", re.I)
# G2018 / G2019 分享页的 iframe：`src="/fn?f=…&t=…&k=…"`（两代同形，2019 的增量是 Cookie/UA/Referer 与验证码）
IFRAME_FN_RE = re.compile(r"<iframe\b[^>]*?\bsrc=\"/fn\?[^\"]*\"", re.I)

# G2024 无码链第二跳
SIGN_RE = re.compile(r"['\"]sign['\"]\s*:\s*'([^']+)'")
URL_RE = re.compile(r"\burl\s*:\s*'([^']+)'")
# 有码链
SKDKLD_RE = re.compile(r"var\s+skdklds\s*=\s*'([^']*)';")
AJAXM_FILE_RE = re.compile(r"url\s*:\s*'(/ajaxm\.php\?file=\d+)'")
# G2018/G2019 六字段：data : 'action=down_process&file_id='+ A +'&t='+ B +'&k='+ C
G2018_DATA_RE = re.compile(
    r"data\s*:\s*'action=down_process&file_id='\s*\+\s*(\w+)\s*\+\s*'&t='\s*\+\s*(\w+)\s*\+\s*'&k='\s*\+\s*(\w+)"
)
VAR_STR_RE = r"var\s+%s\s*=\s*'([^']*)'"

# 域名族判据（分享域与接口同域；下载域是另一族）
LANZOU_HOST_RE = re.compile(r"(?:^|\.)(?:lanzou[a-z]|lanzoui|lanzoue|lanzouf|lanzoux|lanzouu|lanzouj)\.com$")
LANRAR_HOST_RE = re.compile(r"(?:^|\.)(?:lanrar|baidupan|pujirc|store\.pujirc)\.", re.I)

# 文件夹分页：t/k 是"变量名 → 值"两跳
FOLDER_TNAME_RE = re.compile(r"t'\s*:\s*([A-Za-z0-9_$]+)\s*,")
FOLDER_KNAME_RE = re.compile(r"k'\s*:\s*([A-Za-z0-9_$]+)\s*,")
FOLDER_FID_RE = re.compile(r"fid'\s*:\s*'?(\d+)'?\s*,")
FOLDER_UID_RE = re.compile(r"uid'\s*:\s*'([^']*)'")


def _pwd_marker(html: str) -> bool:
    """有提取码的三条判据（任一命中即判有码）。"""
    return ("<title>文件</title>" in html) or ("function down_p(){" in html.replace(" ", ""))


def detect(html: str) -> dict:
    """判代际 + 有无提取码 + 域名族。

    判据优先级（先强后弱）：
      2025 Cloudflare 挑战 → 老链六字段表达式 → `fn?` iframe → `class=ifr2` / `websignkey`
      → `skdklds` / `down_p()` → `signs` / 一般 iframe → unknown
    """
    out: dict = {"generation": "unknown", "has_pwd": _pwd_marker(html), "signals": []}

    if "acw_sc__v2" in html or "_0x4818" in html or "posList" in html:
        out["generation"] = "g2025-cf"
        out["signals"].append("acw_sc__v2/_0x4818/posList")
        out["next_skill"] = "web-js-env-patcher"
        return out

    has_ifr2 = bool(IFRAME_IFR2_RE.search(html))
    has_fn = bool(IFRAME_FN_RE.search(html))
    has_iframe = bool(IFRAME_ANY_RE.search(html)) or has_ifr2
    has_websignkey = "websignkey" in html
    has_signs = "signs" in html
    has_skd = bool(SKDKLD_RE.search(html))
    has_old = bool(G2018_DATA_RE.search(html))

    if has_old:
        out["generation"] = "g2018"
        out["signals"].append("action=down_process 六字段表达式")
    elif has_ifr2 or has_websignkey:
        # `class="ifr2"` 是**更新**的信号：2024 的 iframe 也带 `src="/fn?…"`，
        # 所以必须先判 ifr2，再判 `fn?`（否则 2024 分享页会被误判成老链）
        out["generation"] = "g2024"
        out["signals"] += ["class=ifr2" if has_ifr2 else "", "websignkey" if has_websignkey else ""]
    elif has_fn:
        # 2018/2019 分享页同形；2019 的增量是"POST 必须带 Cookie/UA/Referer"与验证码
        out["generation"] = "g2018"
        out["signals"].append('iframe src="/fn?f=…&t=…&k=…"（2018/2019 同形）')
    elif has_skd:
        out["generation"] = "g2022"
        out["signals"].append("down_p()/skdklds（有码一跳）")
    elif has_signs or has_iframe:
        out["generation"] = "g2022"
        out["signals"].append("signs + iframe 两跳")
    elif out["has_pwd"]:
        out["generation"] = "g2022"
        out["signals"].append("down_p() 有码一跳")

    out["signals"] = [s for s in out["signals"] if s]
    out["has_iframe"] = has_iframe
    out["has_sign"] = bool(SIGN_RE.search(html))

    # 代际混用自检：老链字段名 + 新链字段名同时出现 ⇒ 页面被改过或字段名被写死了
    mixed = sum([has_old, has_websignkey, has_skd]) > 1
    if mixed:
        out["warn"] = "同页出现多代际字段名（老链 + 新链）⇒ 先人工确认以哪一组为准"
    return out


def extract_iframes(html: str) -> list:
    """返回所有 iframe 的 src 及其推荐索引。

    ⚠️ G2024 的原文用的是 `matches[1]`（第 2 个）—— 页面里不止一个 iframe，
       所以这里**不做隐式猜测**：给出全部候选 + 一个"形状上最像"的推荐值。
    """
    srcs = IFRAME_ANY_RE.findall(html)
    ifr2 = IFRAME_IFR2_RE.findall(html)
    rec = -1
    for i, s in enumerate(srcs):
        if s in ifr2:
            rec = i
            break
    if rec < 0:
        # 退化为"带相对路径的那个"，再退化为原文口径 matches[1]
        rel = [i for i, s in enumerate(srcs) if s.startswith("/")]
        rec = rel[0] if rel else (1 if len(srcs) > 1 else (0 if srcs else -1))
    return [{"index": i, "src": s, "is_ifr2": s in ifr2, "recommended": i == rec} for i, s in enumerate(srcs)]


def _nopwd_forms(sign: str, endpoint):
    """无码链的两版表单：G2022 三字段 / G2024 五字段（后者是 2022→2024 的增量）。"""
    return {
        "g2024": {"action": "downprocess", "signs": "?ctdf", "sign": sign,
                  "websign": "", "websignkey": "bL27", "ves": 1},
        "g2022": {"action": "downprocess", "signs": "?ctdf", "sign": sign},
    }


def extract_params(html: str, pwd: str = "", generation: str = "") -> dict:
    """从第二跳（或分享页）抽参数并给出将要发出的 POST 表单。

    `generation` 不给则自动判据；**判不出来时不会瞎猜**：
    返回两版表单（`forms`）并附 `note`，由调用方先试 G2024 五字段、再退 G2022 三字段。
    """
    gen = detect(html)
    eff = generation or gen["generation"]

    # ① G2018/G2019 六字段：按 data 表达式里的变量名逐项取（注释掉的那行不会命中）
    m = G2018_DATA_RE.search(html)
    if m:
        vals = {}
        for role, var in zip(("file_id", "t", "k"), m.groups()):
            mm = re.search(VAR_STR_RE % re.escape(var), html)
            vals[role] = mm.group(1) if mm else None
        return {
            "generation": "g2018",
            "action": "down_process",
            "endpoint": "/ajaxm.php",
            "vars": {v: vals[r] for r, v in zip(("file_id", "t", "k"), m.groups())},
            "form": {"action": "down_process", "file_id": vals["file_id"], "t": vals["t"], "k": vals["k"]},
            "referer_should_be": "share_page",
            "note": "G2019 与 G2018 同形，增量是 POST 必须带 Cookie/UA/Referer（并可能出验证码）",
        }

    # ② 有码链（G2022+）：skdklds + /ajaxm.php?file=<id>
    skd = SKDKLD_RE.search(html)
    ajax_file = AJAXM_FILE_RE.search(html)
    if skd:
        um = URL_RE.search(html)
        form_url = ajax_file.group(1) if ajax_file else (um.group(1) if um else None)
        form = {"action": "downprocess", "sign": skd.group(1)}
        if pwd:
            form["p"] = pwd
        return {
            "generation": "g2022",
            "has_pwd": True,
            "action": "downprocess",
            "endpoint": form_url,
            "form": form,
            "referer_should_be": "share_page",
            "need_pwd": not pwd,
        }

    # ③ 无码链（G2022 三字段 / G2024 五字段）：sign + url
    sg = SIGN_RE.search(html)
    if sg:
        um = URL_RE.search(html)
        forms = _nopwd_forms(sg.group(1), um.group(1) if um else None)
        base = {
            "has_pwd": gen["has_pwd"],
            "action": "downprocess",
            "endpoint": um.group(1) if um else None,
            "referer_should_be": "hop2_iframe_url",
        }
        if eff in ("g2022", "g2024"):
            base["generation"] = eff
            base["form"] = forms[eff]
            base["note"] = ("无码链字段组是 2022→2024 的增量：G2024 多 websign/websignkey/ves；"
                            "若 zt != 1 就换另一版再试")
            return base
        # 判不出来：两版都给，别猜
        base["generation"] = "g2022|g2024"
        base["forms"] = forms
        base["note"] = ("第二跳页面里没有代际信号（class=ifr2 / websignkey 在分享页上）⇒ "
                        "先试 g2024 五字段，zt != 1 再退 g2022 三字段")
        return base

    return {"generation": gen["generation"], "error": "未找到可识别的参数组（先确认是否 G2025 Cloudflare 挑战页）"}


def assemble_final(payload: str) -> dict:
    """从 ajaxm.php 的 JSON 响应组装最终地址：dom + '/file/' + url。"""
    try:
        data = json.loads(payload)
    except json.JSONDecodeError as exc:
        return {"ok": False, "error": f"响应不是合法 JSON：{exc}"}
    if not isinstance(data, dict):
        return {"ok": False, "error": "响应不是对象"}
    if data.get("zt") != 1:
        return {"ok": False, "zt": data.get("zt"), "inf": data.get("inf"), "error": "zt != 1（先看 inf）"}
    dom = (data.get("dom") or "").replace("\\", "").rstrip("/")
    url = (data.get("url") or "").replace("\\", "")
    if not dom or not url:
        return {"ok": False, "error": "缺少 dom 或 url"}
    if not url.startswith("?"):
        url = "?" + url.lstrip("/")
    # ⚠️ `.com` 后直接跟 `?` 不是合法 URL 结构 ⇒ 必须补 `/file/` 段
    full = f"{dom}/file/{url}"
    return {"ok": True, "full": full, "dom": dom, "url": url, "has_file_segment": "/file/" in full}


LOCATION_RE = re.compile(r"^\s*location\s*:\s*(\S+)\s*$", re.I | re.M)


def extract_location(raw: str) -> dict:
    """从 302 响应头里取直链（`curl -i` 原始输出或单独的 header 文件都行）。"""
    m = LOCATION_RE.search(raw)
    if not m:
        return {"ok": False, "error": "未找到 Location 头"}
    url = m.group(1)
    params = dict(re.findall(r"[?&]([A-Za-z_]+)=([^&]*)", url))
    return {"ok": True, "location": url, "params": params}


def extract_folder(html: str, pwd: str = "") -> dict:
    """文件夹分享：抽 filemoreajax.php 需要的字段（t/k 是"变量名 → 值"两跳）。"""
    tn, kn = FOLDER_TNAME_RE.search(html), FOLDER_KNAME_RE.search(html)
    if not (tn and kn):
        return {"ok": False, "error": "未找到 t'/k' 变量名（页面形状不同或不是文件夹分享）"}
    tm = re.search(r"var\s+%s\s*=\s*'([^']*)'" % re.escape(tn.group(1)), html)
    km = re.search(r"var\s+%s\s*=\s*'([^']*)'" % re.escape(kn.group(1)), html)
    if not (tm and km):
        return {"ok": False, "error": f"找到变量名 {tn.group(1)}/{kn.group(1)}，但找不到它们的赋值"}
    fid = FOLDER_FID_RE.search(html)
    uid = FOLDER_UID_RE.search(html)
    fields = {
        "lx": 2,
        "fid": fid.group(1) if fid else None,
        "uid": uid.group(1) if uid else None,
        "pg": 1,
        "rep": 0,
        "t": tm.group(1),
        "k": km.group(1),
        "up": 1,
        "ls": 1,
        "pwd": pwd,
    }
    return {
        "ok": True,
        "endpoint": "/filemoreajax.php",
        "var_names": {"t": tn.group(1), "k": kn.group(1)},
        "form": fields,
        "note": "T/K 与第一页必须同批；网页缓存约 3 分钟 ⇒ 同会话内「取 T/K → 立刻翻页」",
    }


def build_gating(referer: str, full: str) -> dict:
    """门禁自查：打印该带的头 + 对最终地址做结构检查。"""
    warns = []
    if not referer:
        warns.append("缺 Referer：请求 ajaxm.php 与下载域时都必须带上一跳地址")
    if "/file/" not in full:
        warns.append("最终地址缺少 /file/ 段（dom + '/file/' + url）")
    if re.search(r"\.com\?", full):
        warns.append("`.com?` 形态：不是合法 URL 结构，确认是否漏了 /file/")
    if full and not full.startswith("http"):
        warns.append("最终地址不是绝对 URL（dom 可能少了协议）")
    return {
        "headers": {
            "Referer": referer,
            "Cookie": "down_ip=1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        },
        "full": full,
        "warnings": warns,
        "ok": not warns,
    }


# ---------------------------------------------------------------------------
# 夹具（selftest 用）
# ---------------------------------------------------------------------------

# ① G2018：**逐字取自 52pojie-713762**（含被注释掉的那行，用来验证抽取器不会误取注释）
FIX_G2018_HOP2 = """<script type="text/javascript">
                var a = 'down_process';
                var iay7or = '2843560';
                var igwjqk = '1521525328';
                var imuvsd = 'ada9b5c064ee3f1baf176ae849194dd1';
                $.ajax({
                        type : 'post',
                        url : '/ajaxm.php',
                        //data : { 'action':'down_process','file_id':iay7or,'t':igwjqk,'k':imuvsd },
                        data : 'action=down_process&file_id='+ iay7or +'&t='+ igwjqk +'&k='+ imuvsd,
                        dataType : 'json',
"""

# ② G2018 分享页：**逐字取自 52pojie-713762**
FIX_G2018_SHARE = """<iframe src="/fn?f=2843560&t=1521525682&k=702303f99ddec1ee347e83d3e6954ff1">
"""

# ③ G2024 第二跳：**逐字取自 52pojie-1901884**（sign 与 url 两个值都在原文里）
FIX_G2024_HOP2 = """<script>
   var _v = { 'sign':'VTMHOVloBjcEDVRrCzsAPFQ_aBTZSPgMwBzFXYwVsW29SYVUkAClSOwViVjdUMQEwVzsFMwRtADQCMVBk' }
   url : '/ajaxm.php?file=163112553'
</script>
"""

# ④ 有码分享页：**逐字取自 52pojie-1904710 / 52pojie-1668489**
FIX_PWD_SHARE = """<html><head><title>文件</title><style>.x{}</style></head>
<script>
function down_p(){
  url : '/ajaxm.php?file=163112553'
  var skdklds = 'VTMHOVloBjcEDVRrCzsAPFQ_aBTZSPgMwBzFXYwVsW29SYVUkAClSOwViVjdUMQEwVzsFMwRtADQCMVBk';
}
</script>
"""

# ⑤ 无码分享页（G2024 的 iframe 与 G2022 的 iframe 同形）：
#    ⚠️ **构造夹具**：属性顺序与形态取自 52pojie-1901884 的正则
#       `<iframe\\s+class="ifr2"\\s+name="\\d+"\\s+src="([^"]+)"\\s+frameborder="0"\\s+scrolling="no"></iframe>`，
#       **src 的值本身是构造的**（原文没有给出该页面的 src 值）。只验证抽取器形状。
FIX_G2024_SHARE = """<div id="go">
<iframe class="ifr2" name="100001" src="/fn?f=RETENTION-NOT-IN-SOURCE" frameborder="0" scrolling="no"></iframe>
<iframe class="ifr2" name="100002" src="/fn?f=OK" frameborder="0" scrolling="no"></iframe>
</div>
"""

# ⑥ 文件夹页：**字段值逐字取自 52pojie-1701084 的抓包表**（变量名 TZkK3/kZ9w 为构造，原文未给变量名）
FIX_FOLDER = """<script>
var _cfg = { 'fid':2455975, 'uid':'569689', t':TZkK3, k':kZ9w, 'lx':2 };
var TZkK3 = '1666146943';
var kZ9w = '5e30653d4f54227c4856e473e49c3d5b';
</script>
"""

# ⑦ 2025 代际：**逐字取自 52pojie-2078178**
FIX_CF = """<script>var arg1='5E0FE59B4D9B6E7B5B7EF3A5F1B0C5A0B4B34F3C';var posList=[0x4,0x5];</script>
<script>acw_sc__v2</script>
"""

# ⑧ 普通页面（阴性对照）
FIX_PLAIN = "<html><body><h1>404</h1></body></html>"

# ⑨ ajaxm.php 响应：**逐字取自 52pojie-1901884**
FIX_AJAXM_JSON = ('{"zt":1,"dom":"https:\\/\\/down-load.lanrar.com",'
                  '"url":"?VDJVaw08BzYBCFdvAjdTP1JtADhfTVESCkxXtFGdUtcB5gb2CNgFuAPCBf0AvVX2V5VXugX9CqsG5FHRXbJXsFTCVbsNtgfyAd9XNQJ4U2FSJgBgX3hRNgorVzdRZFI\\/AWQGDgg8BTUDaAViAGJVZ1c8V2MFaAo9BjRRZF0nVzBUJ1U\\/DWEHawFmVzkCYFNgUjwAI19wUSMKMFdjUT1SYQE1Bn4IZQVjA3oFYgBmVXtXaFdnBWsKMAZiUWFdMldkVGJVZw02B2YBZFdkAjdTMFJsAGNfYVEwCj1XNFE6UjEBZAZmCGAFYwMwBTcAbVVjVyNXNwUiCm0GJ1EiXXJXM1QmVWsNNAduAWZXNwJvU2dSMAA9XzVRdQp5VzhRYFI2AWcGbAhkBWEDZQVjAGRVelcjV3QFPApkBnZRal0wV2FUZVUyDWUHagFiVzgCYFNrUi4AcF9wUSQKMFdgUTpSYwE2BmYIZgVjA2UFYgBmVXJXeFc7BSoKNQY0UW9dL1dgVGZVLA1hB2ABYlcvAmdTZw==","inf":0}')

# ⑩ 302 响应头：**逐字取自 52pojie-713762**
FIX_302 = ("Connection: keep-alive\nDate: Tue, 20 Mar 2018 06:04:19 GMT\n"
           "Transfer-Encoding: chunked\nContent-Type: text/html\n"
           "Location: http://development01.baidupan.com/2018032014bb/2018/03/17/98ce5e4dc270150784d4f5cf1af4a920.zip"
           "?st=bYKY5VG3dkyPOnKSO0_OjQ&q=%E6%B5%81%E5%85%89%E5%8A%A9%E6%89%8B5.1.0.zip"
           "&e=1521527859&ip=%E4%BD%A0%E7%9A%84IP%E5%9C%B0%E5%9D%80&fi=2843560&up=\n")


# ---------------------------------------------------------------------------
# selftest
# ---------------------------------------------------------------------------

def selftest() -> int:
    checks = 0
    fails = []

    def ok(cond, label):
        nonlocal checks
        checks += 1
        if not cond:
            fails.append(label)

    def eq(a, b, label):
        ok(a == b, f"{label}（期望 {b!r}，实得 {a!r}）")

    # ---- detect：代际判据
    eq(detect(FIX_G2018_SHARE)["generation"], "g2018", "detect 2018 分享页")
    eq(detect(FIX_G2024_SHARE)["generation"], "g2024", "detect 2024 分享页（class=ifr2）")
    eq(detect(FIX_G2024_HOP2)["generation"], "unknown",
       "detect 第二跳：页面里没有代际信号就该报 unknown（不猜）")
    eq(detect(FIX_G2024_HOP2)["has_sign"], True, "第二跳仍能识别为「有 sign 的页面」")
    eq(detect(FIX_PWD_SHARE)["generation"], "g2022", "detect 有码页")
    eq(detect(FIX_CF)["generation"], "g2025-cf", "detect 2025 Cloudflare")
    eq(detect(FIX_CF)["next_skill"], "web-js-env-patcher", "2025 代际转交目标")
    eq(detect(FIX_PLAIN)["generation"], "unknown", "detect 阴性对照")
    # 有码三条判据
    ok(detect(FIX_PWD_SHARE)["has_pwd"] is True, "有码判据：<title>文件</title> 或 down_p()")
    ok(detect(FIX_G2018_SHARE)["has_pwd"] is False, "无码判据阴性")
    # 代际混用自检
    mixed_html = FIX_PWD_SHARE + "\nvar websignkey = 'bL27';"
    ok("warn" in detect(mixed_html), "代际混用自检（老链 + 新链字段名同页）")
    ok("warn" not in detect(FIX_PWD_SHARE), "代际混用自检阴性对照")

    # ---- iframe 抽取
    ifs = extract_iframes(FIX_G2024_SHARE)
    eq(len(ifs), 2, "iframe 抽取数量")
    eq(ifs[0]["src"], "/fn?f=RETENTION-NOT-IN-SOURCE", "iframe[0] src")
    ok(any(x["is_ifr2"] for x in ifs), "识别 class=ifr2")
    ok(sum(1 for x in ifs if x["recommended"]) == 1, "只推荐一个 iframe")
    eq([x["src"] for x in extract_iframes(FIX_PLAIN)], [], "无 iframe 时返回空（阴性对照）")

    # ---- params：G2018 六字段（注意不能取到注释那行）
    p = extract_params(FIX_G2018_HOP2)
    eq(p["generation"], "g2018", "params 判 2018")
    eq(p["action"], "down_process", "2018 action")
    eq(p["endpoint"], "/ajaxm.php", "2018 endpoint")
    eq(p["form"]["file_id"], "2843560", "2018 file_id")
    eq(p["form"]["t"], "1521525328", "2018 t")
    eq(p["form"]["k"], "ada9b5c064ee3f1baf176ae849194dd1", "2018 k")
    eq(p["referer_should_be"], "share_page", "2018 Referer 口径")
    ok("websignkey" not in p["form"], "2018 表单不混入新链字段")

    # ---- params：G2024 无码五字段（第二跳无代际信号 ⇒ 显式给 generation）
    p = extract_params(FIX_G2024_HOP2, generation="g2024")
    eq(p["generation"], "g2024", "params 判 2024")
    eq(p["endpoint"], "/ajaxm.php?file=163112553", "2024 endpoint")
    eq(p["form"]["signs"], "?ctdf", "2024 signs")
    eq(p["form"]["websignkey"], "bL27", "2024 websignkey")
    eq(p["form"]["ves"], 1, "2024 ves")
    ok(len(p["form"]["sign"]) > 60, "2024 sign 长度合理")
    eq(p["referer_should_be"], "hop2_iframe_url", "2024 Referer 口径")
    # G2022 三字段版（同一份页面，只是代际不同）
    p22 = extract_params(FIX_G2024_HOP2, generation="g2022")
    eq(p22["generation"], "g2022", "params 判 2022")
    ok("websignkey" not in p22["form"], "2022 表单只有三字段")
    ok("ves" not in p22["form"], "2022 表单不含 ves")
    eq(p22["form"]["sign"], p["form"]["sign"], "两版 sign 相同（只有附加字段不同）")
    # 判不出来时不猜：两版都给
    pu = extract_params(FIX_G2024_HOP2)
    eq(pu["generation"], "g2022|g2024", "无代际信号时标为未定")
    ok(set(pu["forms"]) == {"g2022", "g2024"}, "未定时给出两版表单")
    ok("websignkey" in pu["forms"]["g2024"], "未定时 g2024 版含 websignkey")
    ok("websignkey" not in pu["forms"]["g2022"], "未定时 g2022 版不含 websignkey")
    ok("先试 g2024" in pu["note"], "未定时给出试验顺序")

    # ---- params：有码链
    p = extract_params(FIX_PWD_SHARE, pwd="6666")
    eq(p["generation"], "g2022", "params 判有码代际")
    eq(p["has_pwd"], True, "params 有码标记")
    eq(p["form"]["p"], "6666", "有码表单带 p")
    ok(p["form"]["sign"].startswith("VTMHOVloBjcE"), "有码 sign 取到 skdklds")
    ok("websignkey" not in p["form"], "有码链不带 websignkey")
    eq(extract_params(FIX_PWD_SHARE)["need_pwd"], True, "未给提取码时提示 need_pwd")
    eq(extract_params(FIX_PWD_SHARE, pwd="6666")["need_pwd"], False, "给了提取码后 need_pwd 消失")

    # ---- params 阴性
    ok("error" in extract_params(FIX_PLAIN), "普通页 params 报错（阴性对照）")

    # ---- final 组装
    f = assemble_final(FIX_AJAXM_JSON)
    eq(f["ok"], True, "final ok")
    eq(f["dom"], "https://down-load.lanrar.com", "final 去反斜杠转义")
    eq(f["full"], "https://down-load.lanrar.com/file/?VDJVaw08BzYBCFdvAjdTP1JtADhfTVESCkxXtFGdUtcB5gb2CNgFuAPCBf0AvVX2V5VXugX9CqsG5FHRXbJXsFTCVbsNtgfyAd9XNQJ4U2FSJgBgX3hRNgorVzdRZFI/AWQGDgg8BTUDaAViAGJVZ1c8V2MFaAo9BjRRZF0nVzBUJ1U/DWEHawFmVzkCYFNgUjwAI19wUSMKMFdjUT1SYQE1Bn4IZQVjA3oFYgBmVXtXaFdnBWsKMAZiUWFdMldkVGJVZw02B2YBZFdkAjdTMFJsAGNfYVEwCj1XNFE6UjEBZAZmCGAFYwMwBTcAbVVjVyNXNwUiCm0GJ1EiXXJXM1QmVWsNNAduAWZXNwJvU2dSMAA9XzVRdQp5VzhRYFI2AWcGbAhkBWEDZQVjAGRVelcjV3QFPApkBnZRal0wV2FUZVUyDWUHagFiVzgCYFNrUi4AcF9wUSQKMFdgUTpSYwE2BmYIZgVjA2UFYgBmVXJXeFc7BSoKNQY0UW9dL1dgVGZVLA1hB2ABYlcvAmdTZw==", "final 补 /file/ 段")
    ok(f["has_file_segment"], "final 标记 /file/ 段")
    # 阴性：zt != 1 / 非法 JSON / 缺字段
    eq(assemble_final('{"zt":0,"inf":"文件取消分享了"}')["ok"], False, "zt!=1 阴性")
    eq(assemble_final('{"zt":0,"inf":"文件取消分享了"}')["inf"], "文件取消分享了", "zt!=1 时透出 inf")
    eq(assemble_final("not json")["ok"], False, "非 JSON 阴性")
    eq(assemble_final('[1,2]')["ok"], False, "非对象 阴性")
    eq(assemble_final('{"zt":1,"dom":"","url":"?A"}')["ok"], False, "缺 dom 阴性")
    eq(assemble_final('{"zt":1,"dom":"https://d.com","url":""}')["ok"], False, "缺 url 阴性")

    # ---- 302
    loc = extract_location(FIX_302)
    eq(loc["ok"], True, "302 ok")
    ok(loc["location"].startswith("http://development01.baidupan.com/"), "302 主机")
    eq(loc["params"]["st"], "bYKY5VG3dkyPOnKSO0_OjQ", "302 st")
    eq(loc["params"]["e"], "1521527859", "302 e")
    eq(loc["params"]["fi"], "2843560", "302 fi")
    eq(loc["params"]["up"], "", "302 up 为空")
    eq(extract_location("HTTP/1.1 200 OK\n")["ok"], False, "无 Location 阴性")
    eq(extract_location("x-location: http://a.b/c")["ok"], False, "仅前缀像 Location 的阴性")

    # ---- 文件夹
    fd = extract_folder(FIX_FOLDER, pwd="fp0b")
    eq(fd["ok"], True, "folder ok")
    eq(fd["endpoint"], "/filemoreajax.php", "folder endpoint")
    eq(fd["var_names"]["t"], "TZkK3", "folder t 变量名")
    eq(fd["var_names"]["k"], "kZ9w", "folder k 变量名")
    eq(fd["form"]["t"], "1666146943", "folder t 值")
    eq(fd["form"]["k"], "5e30653d4f54227c4856e473e49c3d5b", "folder k 值")
    eq(fd["form"]["lx"], 2, "folder lx=2")
    eq(fd["form"]["rep"], 0, "folder rep=0")
    eq(fd["form"]["up"], 1, "folder up=1")
    eq(fd["form"]["ls"], 1, "folder ls=1")
    eq(fd["form"]["pg"], 1, "folder pg 从 1 开始")
    eq(fd["form"]["fid"], "2455975", "folder fid")
    eq(fd["form"]["uid"], "569689", "folder uid")
    eq(fd["form"]["pwd"], "fp0b", "folder pwd")
    ok("3 分钟" in fd["note"], "folder 提示 T/K 时效")
    eq(extract_folder(FIX_PLAIN)["ok"], False, "folder 阴性对照")
    # t/k 两跳：变量名在页面里，值在另一处 ⇒ 只改值不该影响变量名
    eq(extract_folder(FIX_FOLDER.replace("1666146943", "1666000000"))["form"]["t"], "1666000000",
       "folder t 值可变")

    # ---- 门禁
    g = build_gating("/fn?f=2843560&t=1521525682&k=702303f99ddec1ee347e83d3e6954ff1",
                     "https://down-load.lanrar.com/file/?VDJVaw==")
    eq(g["ok"], True, "门禁 ok 用例")
    eq(g["headers"]["Cookie"], "down_ip=1", "门禁 cookie")
    ok(g["headers"]["Referer"].startswith("/fn?"), "门禁 Referer 原样保留")
    ok(not build_gating("", "https://d.com/file/?A")["ok"], "门禁：缺 Referer 必须报警")
    ok(not build_gating("r", "https://down-load.lanrar.com?VDJVaw==")["ok"], "门禁：缺 /file/ 必须报警")
    ok(any(".com?" in w for w in build_gating("r", "https://d.com?A")["warnings"]), "门禁：`.com?` 形态必须报警")

    # ---- 域名族
    ok(bool(LANZOU_HOST_RE.search("wwt.lanzouu.com")), "域名族：wwt.lanzouu.com")
    ok(bool(LANZOU_HOST_RE.search("wwanu.lanzoue.com")), "域名族：wwanu.lanzoue.com")
    ok(bool(LANZOU_HOST_RE.search("www.lanzouf.com")), "域名族：www.lanzouf.com")
    ok(not LANZOU_HOST_RE.search("lanzou.evil.com"), "域名族阴性：后缀伪造不通过")
    ok(bool(LANRAR_HOST_RE.search("down-load.lanrar.com")), "下载域族：lanrar")
    ok(bool(LANRAR_HOST_RE.search("vip.d0.baidupan.com")), "下载域族：baidupan")

    if fails:
        print("FAILED %d / %d" % (len(fails), checks))
        for f_ in fails:
            print("  -", f_)
        return 1
    print("OK: %d/%d" % (checks, checks))
    return 0


# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description="蓝奏云系直链解析工具")
    ap.add_argument("cmd", nargs="?", help="detect|params|final|location|folder|gating")
    ap.add_argument("--in", dest="infile", help="输入文件（HTML / JSON / 响应头）")
    ap.add_argument("--text", help="直接给文本（与 --in 二选一）")
    ap.add_argument("--json", dest="json_payload", help="ajaxm.php 的 JSON 响应")
    ap.add_argument("--pwd", default="", help="提取码")
    ap.add_argument("--generation", default="", help="g2018|g2022|g2024（不给则自动判据；判不出时给两版表单）")
    ap.add_argument("--referer", default="", help="上一跳地址")
    ap.add_argument("--full", default="", help="最终地址 dom + /file/ + url")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        return selftest()
    if not args.cmd:
        ap.print_help()
        return 1

    if args.cmd == "final":
        payload = args.json_payload
        if payload is None and args.infile:
            payload = open(args.infile, encoding="utf-8").read()
        out = assemble_final(payload or "")
    elif args.cmd == "gating":
        out = build_gating(args.referer, args.full)
    else:
        raw = args.text if args.text is not None else (
            open(args.infile, encoding="utf-8", errors="replace").read() if args.infile else "")
        if args.cmd == "detect":
            out = detect(raw)
            out["iframes"] = extract_iframes(raw)
        elif args.cmd == "params":
            out = extract_params(raw, pwd=args.pwd, generation=args.generation)
            if out.get("endpoint"):
                out["endpoint_is_relative"] = out["endpoint"].startswith("/")
        elif args.cmd == "location":
            out = extract_location(raw)
        elif args.cmd == "folder":
            out = extract_folder(raw, pwd=args.pwd)
        else:
            ap.print_help()
            return 1

    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
