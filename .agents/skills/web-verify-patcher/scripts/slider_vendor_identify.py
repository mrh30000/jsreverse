#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""非极验滑块厂商判据器（零依赖）。

输入一份「抓包指纹」，输出最可能的滑块厂商 + 该读的文档锚点 + 落地配方。
规则与配方来自 `references/slider-vendor-matrix.md`（唯一权威源），
本脚本 **不重复定义知识**，只做判定与路由。

用法
----
  python scripts/slider_vendor_identify.py --fingerprint fp.json --markdown
  python scripts/slider_vendor_identify.py --fingerprint fp.json --json
  python scripts/slider_vendor_identify.py --fingerprint - --explain < fp.txt
  python scripts/slider_vendor_identify.py --list
  python scripts/slider_vendor_identify.py --selftest

指纹格式（JSON；除 `blob`/`text` 外字段都可省）
----
  {
    "urls":    ["https://turing.captcha.qcloud.com/cap_union_prehandle"],
    "params":  ["collect", "tlg", "eks", "ans"],
    "cookies": ["sl-session"],
    "js":      "tdc.js",
    "body":    "pn=com.web.tianyu&sdkName=360CaptchaSDK",
    "headers": {"host": "turing.captcha.qcloud.com"},   // headers 的 **key 与 value 都会参与匹配**
    "image":   {"slices": 32, "layout": "vertical"},
    "blob":    "任意原始文本，参与全文匹配"
  }
非 JSON 输入按纯文本处理（整段进 `blob`）。

退出码
----
  0  判出厂商（可能 `ambiguous: true`）；`--selftest` 通过也返回 0
  2  输入错误（文件不存在 / JSON 非法 / 参数缺失）
  1  `--selftest` 断言失败（要修脚本，不是"没判出来"）
  3  证据不足，返回 `unknown` —— **这是正常结果，不是失败**（不要伪造一个厂商）

边界（显式声明）
----
  * 规则共 **19 条 = `references/slider-vendor-matrix.md` §2 的 17 族 + 2 条路由**
    （`geetest` → `geetest-protocol-matrix.md`；`tencent-tcaptcha-old`（带 `vData` 的防水墙旧形态）→ `tencent-tcaptcha-protocol.md`）。
    `tencent-turing` 对 `vData` 有**排他 veto**：命中即取消，避免把两代形态混为一谈。
  * 图像侧「异型拼接」只能靠域名或文案线索命中，纯图片输入会返回 `unknown`（设计如此）。
  * 规则里的 `10jqka` / `verify5` / `ishumei` 等厂商名是**由来源 base64 域名解出的推导值**；
    匹配用的都是真实抓包里会原样出现的域名/参数子串，不是来源里的脱敏串。
  * 本脚本不联网、不读取页面、不发起任何请求。
"""

import argparse
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DOC = os.path.normpath(os.path.join(HERE, "..", "references", "slider-vendor-matrix.md"))

# ---------------------------------------------------------------- 规则表
# signals: [(needle, weight)]  —— needle 在语料里**不区分大小写**地做子串匹配
# veto:    [needle]            —— 命中即**取消**该厂商（用于"两家长得很像"的判别）
# anchor:  文档内小节号（脚本自检会验证该小节真的存在）
RULES = [
    {
        "id": "geetest",
        "label": "极验（某验）—— 路由项，不在本文档的 17 族内",
        "anchor": "2",
        "redirect": "geetest-protocol-matrix.md",
        "route_only": True,
        "signals": [("gettype.php", 3), ("geetest", 3), ("gt_cut_bg_slice", 3),
                    ("lot_number", 2), ("captcha_id", 1), ("challenge=", 1)],
        "veto": ["authcode.51.com"],
        "recipe": "本族不在本文档；读 geetest-protocol-matrix.md（v3 三个 w / v4 两接口 / 无感两个 w）。",
    },
    {
        "id": "tencent-turing",
        "label": "腾讯云验证码（turing / qcloud）",
        "anchor": "3.1",
        "signals": [("cap_union_prehandle", 3), ("cap_union_new_verify", 3), ("pow_answer", 3),
                    ("pow_calc_time", 2), ("tdc_path", 3), ("tdc.js", 3), ("turing.captcha", 3),
                    ("DynAnswerType_POS", 3), ("eks", 1), ("collect", 1)],
        "veto": ["com.web.tianyu", "360CaptchaSDK", "vdata"],
        "recipe": "prehandle 取 sess/pow_cfg/sprite → 补 tdc.js 出 collect → 真算 PoW → verify 取 ticket/randstr。",
    },
    {
        "id": "tencent-tcaptcha-old",
        "label": "腾讯防水墙 `cap_union_*` 旧形态 —— 路由项",
        "anchor": "2",
        "redirect": "tencent-tcaptcha-protocol.md",
        "route_only": True,
        "signals": [("vdata", 3), ("cap_union", 1), ("tdc.js", 1)],
        "veto": [],
        "recipe": "五参数 `ua/sess/collect/eks/vData` + TDC 37 段 + 魔改 TEA：读 tencent-tcaptcha-protocol.md。",
    },
    {
        "id": "360-tianyu",
        "label": "360 天御 / 360CaptchaSDK",
        "anchor": "3.2",
        "signals": [("com.web.tianyu", 3), ("360captchasdk", 3), ("tianyu.360.cn", 3),
                    ("encryptlong", 2), ("vconfig", 2), ("appid", 1)],
        "veto": [],
        "recipe": "前置 auto 参数 + sign=MD5(k+v 顺序拼接)；32 条还原底图；report=RSA_long(轨迹)+MD5(captchaId+token)。",
    },
    {
        "id": "shumei",
        "label": "数美（ishumei）",
        "anchor": "3.3",
        "signals": [("captchauuid", 3), ("ishumei", 3), ("isjsformat", 3),
                    ("abcdefghjkmnpqrstwxyzabcdefhijkmnprstwxyz2345678", 3),
                    ("fengkongcloud", 3), ("castatic", 2),
                    ("/ca/v1/conf", 3), ("/ca/v1/register", 2), ("/ca/v2/fverify", 2),
                    ("auto_slide", 2), ("spatial_select", 2), ("seq_select", 2),
                    ("getencryptcontent", 2),
                    ("organization", 1), ("risklevel", 1), ("shumei", 2)],
        "veto": [],
        "recipe": ("DES-ECB/ZeroPadding；**绝不格式化 JS**（isJsFormat 会让 key 变）；距离识别后除 2。"
                   "⚠️ 提交参数名与 DES key **随 SDK 小版本变**（`tm/tb/ly`、`qd/mu/en/kq`、`gg/hg/th` 都是同一家）"
                   "⇒ 判据只能用 `captchaUuid`/`organization`/域名/model 枚举，**不要拿参数名当判据**。"),
    },
    {
        "id": "yunpian",
        "label": "云片（yunpian）",
        "anchor": "3.4",
        "signals": [("yp_riddler_id", 3), ("captcha.yunpian.com", 3), ("yunpian", 2),
                    ("riddler-sdk", 2), ("distancex", 2)],
        "veto": ["verify5"],
        "recipe": "get/verify 两个 JSONP 接口；i=AES-CBC、k=RSA(key+iv)；points 超 50 点要抽稀。",
    },
    {
        "id": "luosimao",
        "label": "螺丝帽（Luosimao）",
        "anchor": "3.5",
        "signals": [("luosimao", 3), ("data-site-key", 2), ("captchaimage", 2),
                    ("user_verify", 2), ("site-key", 1)],
        "veto": [],
        "recipe": "widget→request→frame→user_verify；AES（函数名假称 SHA3）；30 片 20×80；dots 倒序且 x/y 互换；frame 校验 Host。",
    },
    {
        "id": "anjuke",
        "label": "安居客（anjuke）",
        "anchor": "3.6",
        "signals": [("getinfotp", 3), ("checkinfotp", 3), ("anjuke", 3), ("dinfo", 2),
                    ("responseid", 1), ("captchanew", 2)],
        "veto": [],
        "recipe": "AES key=iv=sessionId 奇位字符；dInfo 要 encodeURIComponent；输出 base64 后再 quote_plus（encodeURIComponent 不能省）。",
    },
    {
        "id": "fang",
        "label": "房天下（fang / soufun）",
        "anchor": "3.7",
        "signals": [("getslidecodeinit", 3), ("codedrag", 3), ("soufunimg", 3),
                    ("fangcheck_", 3), ("jigsawpc", 2), ("fang.com", 1)],
        "veto": [],
        "recipe": "三接口 + 状态码 100/101/102；i=41 项指纹 6bit 压缩；t=轨迹同套压缩；图片必须先缩放。",
    },
    {
        "id": "51com",
        "label": "51.com（仿极验 HTML 布局）",
        "anchor": "3.8",
        "signals": [("authcode.51.com", 3), ("gt_cut_fullbg_slice", 2), ("yz2", 2),
                    ("times", 1), ("51.com", 3)],
        "veto": [],
        "recipe": "13×25 片还原 260×100；token=md5(challenge+times+point)；**不要套极验流程**。",
    },
    {
        "id": "lofter",
        "label": "乐某（LOFTER）自研",
        "anchor": "3.9",
        "signals": [("lofter", 3), ("x-encseckey", 3), ("x_encseckey", 3),
                    ("type=jigsaw", 2), ("passport", 1)],
        "veto": [],
        "recipe": "图片内联 base64；AES-CBC 随机 key/iv；头 x-encseckey=RSA(key-iv)；响应解密用本次 key/iv。",
    },
    {
        "id": "dangdang",
        "label": "当当（dangdang）",
        "anchor": "3.10",
        "signals": [("getslidingverifycode", 3), ("checkslidingverifycode", 3), ("ddclick521", 3),
                    ("getrankey", 3), ("dangdang", 3), ("permanent_id", 2)],
        "veto": [],
        "recipe": "permanent_id 链（时间+MD5 前 8 位转十进制取 6 位）；sign=AES(key=rankey)；requestId 来自接口。",
    },
    {
        "id": "ths",
        "label": "同花顺（10jqka）",
        "anchor": "3.11",
        "signals": [("10jqka", 3), ("passwdsalt", 3), ("thsencrypt", 3), ("getprehandle", 2),
                    ("crnd", 2)],
        "veto": [],
        "recipe": "登录 RSA(10001)；passwdsalt 三段链（SHA256→XOR→HMAC_SHA256）；滑块 phrase=x;inity;w;h。",
    },
    {
        "id": "eastmoney",
        "label": "东方财富（eastmoney）",
        "anchor": "3.12",
        "signals": [("qgqp_b_id", 3), ("eastmoney", 3), ("decodeimg", 2), ("xxtea", 3),
                    ("ctxid", 2)],
        "veto": [],
        "recipe": "request=base64(XXTEA(pipe 明文))；browserid 20 位（首位 1-9、后 19 位 0-8）；26×2 片；距离 -8。",
    },
    {
        "id": "verify5",
        "label": "v5（verify5）—— WebSocket 承载",
        "anchor": "3.13",
        "signals": [("verify5", 3), ("websocket", 1), ("requestid", 1), ("command", 1)],
        "veto": [],
        "recipe": "ws 三轮消息；1024 分片 + 消息头；AES-CTR(iv 前置 32 hex)；key=token 奇偶拆；时间戳必须新鲜。",
    },
    {
        "id": "safeline",
        "label": "雷池 WAF 滑块（SafeLine）",
        "anchor": "3.14",
        "signals": [("sl-challenge-jwt", 3), ("sl-session", 2), ("issue_id", 3),
                    ("safeline", 3), ("calc.js", 2), ("challenge.js", 2)],
        "veto": [],
        "recipe": "五步链 + wasm(reset/arg/calc/ret)；43 检测点 ≥100 分触发；轨迹不校验；无图属 waf-challenge。",
    },
    {
        "id": "ali-227",
        "label": "阿里 227（AWSC 无痕 / 滑块）",
        "anchor": "3.15",
        "signals": [("nocaptcha", 3), ("getfytoken", 3), ("awsc.js", 3), ("__fy_options", 3),
                    ("fireyejs", 3), ("et_f.js", 2)],
        "veto": [],
        "recipe": "脚本顺序 awsc→et_f→fireyejs→nc；导出 m.init 后取 __fy.getFYToken；s[] 环境数组；降层只用于阅读。",
    },
    {
        "id": "kuaishou",
        "label": "快手（kuaishou）",
        "anchor": "3.16",
        "signals": [("rest/zt/captcha/sliding", 3), ("kuaishou", 3), ("verifyparam", 3),
                    ("dragstartcb", 2), ("slideend", 2)],
        "veto": [],
        "recipe": "config 返回 a/q/d/sx/sy/ix/iy；坐标换算含站点常量 276/282.25；**先跑不变异基线**再决定复刻变异。",
    },
    {
        "id": "acla-jigsaw",
        "label": "异型拼接滑块",
        "anchor": "3.17",
        "signals": [("credit.acla", 3), ("拼接错位", 2), ("异型滑块", 3)],
        "veto": [],
        "recipe": "拼接错位而非镂空；余弦相似度路线准确率约 70% ⇒ 批量任务优先走模型并报失败率。",
    },
]

VETO_PENALTY_REASON = "命中排他信号，取消该厂商"

MIN_SCORE = 3
AMBIGUOUS_GAP = 2

IMAGE_HINTS = [
    ({"slices": 30}, "luosimao", "30 片（上下两半各 15，20×80）"),
    ({"slices": 32}, "360-tianyu", "32 条竖条乱序"),
    ({"slices": 52}, "eastmoney", "26×2 = 52 片"),
    ({"slices": 26}, "eastmoney", "26×2 片（按列给 26）"),
    ({"layout": "vertical", "slices": 32}, "360-tianyu", "竖条 + 32 片"),
    ({"layout": "stitch"}, "acla-jigsaw", "拼接错位（无镂空）"),
]


# ---------------------------------------------------------------- 语料构建
def build_corpus(fp):
    """把指纹拉平成一份可全文匹配的语料 + 结构化命中记录。"""
    parts = []

    def add(key, value):
        if value is None:
            return
        if isinstance(value, (list, tuple)):
            for v in value:
                add(key, v)
            return
        if isinstance(value, dict):
            for k, v in value.items():
                # 注意：dict 的 **key 与 value 都要进语料**——`headers` 里厂商指纹往往在 key 上
                # （如 `x-encseckey`），只收 value 会让这类信号永远匹配不到。
                parts.append(str(k))
                add("%s.%s" % (key, k) if key else str(k), v)
            return
        parts.append(str(value))

    for key in ("urls", "params", "cookies", "js", "body", "headers", "image", "blob", "text", "har"):
        if key in fp:
            add(key, fp[key])
    return "\n".join(parts).lower()


def image_hits(fp):
    """结构化图片几何提示（只在字段真的给了值时才命中）。

    同一厂商**只取最具体的一条**：若 `slices:32` 与 `layout:vertical,slices:32` 同时命中，
    两者描述的是同一件事，重复计分会让阈值失真。
    """
    img = fp.get("image") or {}
    if not isinstance(img, dict):
        return []
    hits, seen = [], set()
    for cond, vendor, why in IMAGE_HINTS:
        if vendor in seen:
            continue
        if all(str(img.get(k, "")).lower() == str(v).lower() for k, v in cond.items()):
            hits.append((vendor, why))
            seen.add(vendor)
    return hits


# ---------------------------------------------------------------- 判定
def identify(fp, min_score=MIN_SCORE):
    corpus = build_corpus(fp)
    img_hits = image_hits(fp)
    candidates = []
    for order, rule in enumerate(RULES):
        matched = [(n, w) for n, w in rule["signals"] if n.lower() in corpus]
        # 去重叠：若某 needle 是同一规则内另一条已命中 needle 的真子串，只计更长的那个
        # （否则 `yunpian` 会被 `captcha.yunpian.com` 顺带重复计分，阈值形同虚设）
        matched = [(n, w) for n, w in matched
                   if not any(n.lower() != m.lower() and n.lower() in m.lower() for m, _w in matched)]
        score = sum(w for _n, w in matched)
        for vendor, why in img_hits:
            if vendor == rule["id"]:
                matched.append(("<image:%s>" % why, 2))
                score += 2
        vetoed = [n for n in rule.get("veto", []) if n.lower() in corpus]
        disqualified = bool(vetoed)
        candidates.append({
            "vendor": rule["id"],
            "label": rule["label"],
            "score": 0 if disqualified else score,
            "raw_score": score,
            "matched": [n for n, _w in matched],
            "vetoed_by": vetoed,
            "veto_reason": VETO_PENALTY_REASON if disqualified else None,
            "anchor": rule["anchor"],
            "recipe": rule["recipe"],
            "redirect": rule.get("redirect"),
            "order": order,
        })
    # 确定性排序：分数降序 → 声明顺序升序
    candidates.sort(key=lambda c: (-c["score"], c["order"]))
    for c in candidates:
        c.pop("order", None)
    alive = [c for c in candidates if c["score"] >= min_score]
    out = {
        "vendor": "unknown",
        "label": None,
        "score": 0,
        "confidence": "insufficient-evidence",
        "ambiguous": False,
        "matched": [],
        "vetoed": [{"vendor": c["vendor"], "vetoed_by": c["vetoed_by"]} for c in candidates if c["vetoed_by"]],
        "candidates": candidates[:3],
        "doc": None,
        "next_steps": ["补齐 §5 证据表里的缺项后重跑", "按 §4 八条共性先做「接口/图片/轨迹/换票」四分"],
        "evidence_needed": [
            "接口名（看 URL 列表）",
            "请求体 key 集合",
            "Cookie key 集合",
            "图片：切片数与方向 / 是否镂空",
        ],
    }
    if alive:
        top = alive[0]
        second = alive[1]["score"] if len(alive) > 1 else 0
        ambiguous = (top["score"] - second) < AMBIGUOUS_GAP
        out.update({
            "vendor": top["vendor"],
            "label": top["label"],
            "score": top["score"],
            "confidence": "ambiguous" if ambiguous else ("high" if top["score"] >= 6 else "medium"),
            "ambiguous": ambiguous,
            "matched": top["matched"],
            "doc": "%s §%s" % (os.path.basename(DEFAULT_DOC), top["anchor"]),
            "recipe": top["recipe"],
            "redirect": top["redirect"],
            "next_steps": [
                "读 references/%s §%s" % (os.path.basename(DEFAULT_DOC), top["anchor"]),
                top["recipe"],
            ],
        })
        if top["redirect"]:
            out["next_steps"] = ["本项是路由：直接读 references/%s" % top["redirect"]] + [
                s for s in out["next_steps"] if not s.startswith("读 references/%s" % os.path.basename(DEFAULT_DOC))]
        if ambiguous:
            out["next_steps"].append("top1 与 top2 分差 < %d：按 §5 补齐证据再判，不要凭猜。" % AMBIGUOUS_GAP)
    return out


# ---------------------------------------------------------------- 输出
def fmt_markdown(result):
    lines = ["| 项 | 值 |", "| --- | --- |"]
    lines.append("| 厂商 | `%s` |" % result["vendor"])
    lines.append("| 名称 | %s |" % (result["label"] or "—"))
    lines.append("| 置信度 | %s（score=%s，ambiguous=%s） |"
                 % (result["confidence"], result["score"], result["ambiguous"]))
    lines.append("| 命中信号 | %s |" % ("、".join("`%s`" % m for m in result["matched"]) or "—"))
    if result.get("redirect"):
        lines.append("| 文档锚点 | %s（**路由，不在本文件**） |" % result["redirect"])
    else:
        lines.append("| 文档锚点 | %s |" % (result["doc"] or "—"))
    for i, step in enumerate(result.get("next_steps", []), 1):
        lines.append("| 下一步 %d | %s |" % (i, step))
    if result.get("candidates"):
        lines.append("| top 候选 | %s |"
                     % "；".join("%s(%s)" % (c["vendor"], c["score"]) for c in result["candidates"]))
    if result.get("vetoed"):
        lines.append("| 被排他取消除 | %s |"
                     % "；".join("%s←%s" % (v["vendor"], ",".join(v["vetoed_by"])) for v in result["vetoed"]))
    return "\n".join(lines)


def fmt_text(result, explain=False):
    lines = ["vendor   : %s (%s)" % (result["vendor"], result["label"] or "—"),
             "confidence: %s  score=%s  ambiguous=%s"
             % (result["confidence"], result["score"], result["ambiguous"])]
    if explain:
        lines.append("matched  : %s" % (", ".join(result["matched"]) or "—"))
        for c in result.get("candidates", []):
            lines.append("  cand %-16s score=%-3s matched=%s%s"
                         % (c["vendor"], c["score"], ",".join(c["matched"]) or "-",
                            "  [VETO %s]" % ",".join(c["vetoed_by"]) if c["vetoed_by"] else ""))
    if result.get("redirect"):
        lines.append("doc      : %s（路由，不在本文件）" % result["redirect"])
    elif result.get("doc"):
        lines.append("doc      : %s" % result["doc"])
    for i, step in enumerate(result.get("next_steps", []), 1):
        lines.append("step %d   : %s" % (i, step))
    return "\n".join(lines)


# ---------------------------------------------------------------- 自检
def selftest():
    passed = 0
    failed = []

    def ok(cond, name):
        nonlocal passed
        if cond:
            passed += 1
        else:
            failed.append(name)

    # 1) 每族至少有一条"正例"指纹必须选中它
    positives = {
        "tencent-turing": {"params": ["collect", "tlg", "eks"], "js": "tdc.js",
                           "urls": ["https://turing.captcha.qcloud.com/cap_union_prehandle"]},
        "360-tianyu": {"body": "pn=com.web.tianyu&sdkName=360CaptchaSDK&appId=dc1db94ea7b3843c"},
        "shumei": {"params": ["captchaUuid", "organization"], "blob": "isJsFormat"},
        "yunpian": {"params": ["yp_riddler_id", "distanceX"], "urls": ["https://captcha.yunpian.com/v1/jsonp/captcha/get"]},
        "luosimao": {"js": "captcha.luosimao.com/demo", "body": "data-site-key=abc"},
        "anjuke": {"params": ["sessionId", "responseId", "dInfo"], "urls": ["/web/general/captchaNew.html"]},
        "fang": {"urls": ["passport.fang.com/getslidecodeinit.api", "/c=index&a=codeDrag"]},
        "51com": {"urls": ["https://authcode.51.com/authcode/slidecode"], "js": "gt_cut_fullbg_slice"},
        "lofter": {"headers": {"x-encseckey": "abc"}, "urls": ["https://www.lofter.com/front/login"]},
        "dangdang": {"urls": ["login.dangdang.com/getSlidingVerifyCode", "checkSlidingVerifyCode"]},
        "ths": {"urls": ["https://upass.10jqka.com.cn/login"], "params": ["passwdsalt", "crnd"]},
        "eastmoney": {"cookies": ["qgqp_b_id"], "params": ["ctxid"], "blob": "XXTEA"},
        "verify5": {"urls": ["https://www.verify5.com/demo"], "blob": "WebSocket requestId"},
        "safeline": {"cookies": ["sl-session", "sl-challenge-jwt"], "js": "challenge.js calc.js"},
        "ali-227": {"params": ["n"], "js": "awsc.js et_f.js fireyejs.js", "blob": "o.__fy.getFYToken"},
        "kuaishou": {"urls": ["live.kuaishou.com", "/rest/zt/captcha/sliding/config"]},
        "acla-jigsaw": {"blob": "credit.acla.org.cn 异型滑块"},
    }
    for vendor, fp in positives.items():
        res = identify(fp)
        ok(res["vendor"] == vendor, "正例 %s 应命中，实际 %s" % (vendor, res["vendor"]))
    # 只用 header 名、不带域名：守住「dict 的 key 也要进语料」这条实现细节
    res = identify({"headers": {"x-encseckey": "irrelevant-value"}})
    ok(res["vendor"] == "lofter", "仅靠 header 名应能判出 lofter，实际 %s" % res["vendor"])

    # 2) 判别对：360 与 turing 不能互串
    both = {"params": ["collect", "eks"], "js": "tdc.js",
            "body": "pn=com.web.tianyu&sdkName=360CaptchaSDK"}
    res = identify(both)
    ok(res["vendor"] == "360-tianyu", "判绝对：同时含 turing 与 tianyu 信号应判 360，实际 %s" % res["vendor"])
    ok(any(v["vendor"] == "tencent-turing" for v in res["vetoed"]), "判绝对：turing 应被排他取消")

    # 3) 排他性：51.com 不得被判成极验
    res = identify({"js": "gt_cut_fullbg_slice", "urls": ["https://authcode.51.com/authcode/slidecode"]})
    ok(res["vendor"] == "51com", "gt_cut_* + authcode.51.com 应判 51com，实际 %s" % res["vendor"])
    res = identify({"js": "gt_cut_fullbg_slice", "urls": ["https://authcode.51.com/x.php"]})
    ok(res["vendor"] != "geetest", "51.com 域名存在时不得判极验")

    # 4) 证据不足必须返回 unknown（反向断言：不许"什么都认"）
    negatives = [
        {"urls": ["https://example.com/api/list?page=1"], "params": ["page", "limit"]},
        {"blob": "拖动滑块完成拼图"},                       # 只有"滑块"两个字
        {"blob": "captcha"},                                 # 只有通用词
        {"urls": ["https://shop.test/cart"], "cookies": ["JSESSIONID"]},
        {"blob": ""},
    ]
    for i, fp in enumerate(negatives):
        res = identify(fp)
        ok(res["vendor"] == "unknown", "反例 %d 应 unknown，实际 %s" % (i, res["vendor"]))
        ok(res["confidence"] == "insufficient-evidence", "反例 %d 置信度应为 insufficient-evidence" % i)

    # 5) 模糊检测：weak 信号必须 ambiguous 或 unknown
    res = identify({"js": "gt_cut_fullbg_slice"})
    ok(res["ambiguous"] is True or res["vendor"] == "unknown", "弱信号应 ambiguous 或 unknown")
    # 5b) 让 ambiguous 分支**真的被执行**：两家强信号并列、分差 < 2
    res = identify({"params": ["captchaUuid"], "cookies": ["qgqp_b_id"]})
    ok(res["ambiguous"] is True, "两家并列强信号时应标 ambiguous，实际 %s" % res)

    # 5c) 腾讯防水墙旧形态必须路由出去，且新形态被排他（回归：防止两代形态再次混判）
    res = identify({"params": ["ua", "sess", "collect", "eks", "vData"], "js": "cap_union_prehandle"})
    ok(res["vendor"] == "tencent-tcaptcha-old",
       "带 vData 的旧形态应判 tencent-tcaptcha-old，实际 %s" % res["vendor"])
    ok(any(v["vendor"] == "tencent-turing" for v in res["vetoed"]), "vData 应排他 tencent-turing")
    ok(res["redirect"] == "tencent-tcaptcha-protocol.md", "旧形态必须带 redirect 指向旧形态文档")
    ok(res["next_steps"] and res["next_steps"][0].startswith("本项是路由"),
       "路由项的 next_steps 首条必须是「本项是路由：…」，而不是指向本文件的 §2")
    ok(not any("slider-vendor-matrix.md §" in s for s in res["next_steps"]),
       "路由项不得给出本文件的小节锚点（指错文档）")

    # 5d) 极验路由项同样必须覆盖（否则「路由只测一条」是半覆盖）
    res = identify({"js": "gettype.php", "blob": "geetest"})
    ok(res["vendor"] == "geetest", "极验路由应命中，实际 %s" % res["vendor"])
    ok(res["redirect"] == "geetest-protocol-matrix.md", "极验路由必须带 redirect")
    ok(res["next_steps"] and res["next_steps"][0].startswith("本项是路由"),
       "极验路由项的 next_steps 首条必须是「本项是路由：…」")

    # 5e) B20：数美的"版本稳定信号"要能判出（域名 + model 枚举），
    #     而"只有某一代的提交参数名"必须判不出来 —— 参数名随 SDK 版本变，拿它当判据是最常见的误判方向。
    res = identify({"urls": ["https://captcha1.fengkongcloud.cn/ca/v1/register"],
                    "blob": "model=auto_slide&organization=abc"})
    ok(res["vendor"] == "shumei",
       "数美域名 + model 枚举应判 shumei，实际 %s" % res["vendor"])
    res = identify({"params": ["gg", "hg", "th"], "blob": "protocol=185"})
    ok(res["vendor"] == "unknown",
       "只给某一代的数美参数名（gg/hg/th）不得判出 shumei，实际 %s" % res["vendor"])

    # 6) 阈值行为：低于 --min-score 判定为 unknown
    res = identify({"blob": "captcha.yunpian.com"}, min_score=4)
    ok(res["vendor"] == "unknown", "min_score=4 时仅 3 分信号应 unknown，实际 %s" % res["vendor"])
    res = identify({"blob": "captcha.yunpian.com"}, min_score=2)
    ok(res["vendor"] == "yunpian", "min_score=2 时应判 yunpian，实际 %s" % res["vendor"])

    # 7) 单调性：多给一条匹配信号，分数不得下降
    a = identify({"cookies": ["qgqp_b_id"]})
    b = identify({"cookies": ["qgqp_b_id"], "blob": "XXTEA"})
    ok(b["score"] >= a["score"], "分数单调性：加信号后分数不应下降")

    # 8) 确定性：同输入两次结果一致
    fp = {"params": ["captchaUuid"], "blob": "isJsFormat"}
    ok(json.dumps(identify(fp), sort_keys=True) == json.dumps(identify(fp), sort_keys=True),
       "确定性：同输入两次输出应一致")

    # 9) 文档锚点可达性（B13 判据④：脚本声明的依赖必须真存在）
    doc_ok = os.path.isfile(DEFAULT_DOC)
    ok(doc_ok, "依赖文档存在：%s" % DEFAULT_DOC)
    if doc_ok:
        with io.open(DEFAULT_DOC, "r", encoding="utf-8") as fh:
            doc = fh.read()
        for rule in RULES:
            anchor = rule["anchor"]
            if rule.get("route_only"):
                continue  # 路由项的目标在别的文件，不在本文件校验
            level = "##" if "." not in anchor else "###"
            # 用带边界的正则：`### 3.1` 不能靠子串匹配 `### 3.10` 蒙混过关
            pat = re.compile(r"^%s\s+§?\s*%s(?:[.．、\s]|$)" % (level, re.escape(anchor)), re.M)
            ok(bool(pat.search(doc)),
               "文档缺少规则声明的小节：%s %s %s（%s）" % (os.path.basename(DEFAULT_DOC), level, anchor, rule["id"]))
        # B20：数美小节必须把"参数名随版本变"写出来 —— 规则表的 recipe 与本断言成对，
        # 只改一处会在这里被拦下（防止"脚本知道、文档没说"）。
        shumei_rule = next((r for r in RULES if r["id"] == "shumei"), None)
        if shumei_rule:
            sec = re.search(r"^###\s+§?\s*%s(?:[.．、\s]|$)(?:(?!^###\s).)*" % re.escape(shumei_rule["anchor"]),
                            doc, re.M | re.S)
            ok(bool(sec) and "参数名" in sec.group(0) and "版本" in sec.group(0),
               "数美小节（§%s）必须写明「提交参数名随 SDK 版本变、不可当判据」" % shumei_rule["anchor"])

    # 10) 规则表自身健康度
    ok(len(RULES) >= 17, "规则数应 ≥17，实际 %d" % len(RULES))
    ids = [r["id"] for r in RULES]
    ok(len(ids) == len(set(ids)), "厂商 id 不应重复")
    ok(all(r["signals"] for r in RULES), "每条规则都应有 signals")
    ok(all(r.get("recipe") for r in RULES), "每条规则都应有 recipe")
    ok(all(any(w >= 3 for _n, w in r["signals"]) for r in RULES),
       "每条规则都应有 ≥3 分的强信号（否则会退化成'什么都能认'）")
    ok(all(r["anchor"] == "2" for r in RULES if r.get("route_only")),
       "路由项不应指本文件的小节（它们的 anchor 只能是 2）")
    ok(len([r for r in RULES if not r.get("route_only")]) == 17,
       "非路由规则应恰为 17 族")

    total = passed + len(failed)
    print("slider_vendor_identify.py --selftest: %d/%d passed" % (passed, total))
    for f in failed:
        print("  FAIL: %s" % f)
    return 0 if not failed else 1


# ---------------------------------------------------------------- main
def load_fingerprint(source):
    if source == "-":
        raw = sys.stdin.read()
        name = "<stdin>"
    else:
        if os.path.isdir(source):
            raise IOError("--fingerprint 需要文件，收到的是目录：%s" % source)
        if not os.path.isfile(source):
            raise IOError("指纹文件不存在：%s" % source)
        with io.open(source, "r", encoding="utf-8", errors="replace") as fh:
            raw = fh.read()
        name = source
    text = raw.strip()
    if not text:
        return {"blob": ""}
    if text[0] in "{[":
        try:
            data = json.loads(text)
        except ValueError as exc:
            raise IOError("指纹 JSON 解析失败（%s）：%s" % (name, exc))
        if not isinstance(data, dict):
            raise IOError("指纹 JSON 顶层必须是对象，实际是 %s" % type(data).__name__)
        return data
    return {"blob": text}


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="非极验滑块厂商判据器（离线、零依赖）",
        epilog="退出码：0 判出厂商 / 2 输入错误 / 3 证据不足（unknown）",
    )
    parser.add_argument("--fingerprint", "-f", metavar="FILE|-", help="指纹 JSON 文件；用 - 从 stdin 读")
    parser.add_argument("--min-score", type=int, default=MIN_SCORE, help="判定阈值，默认 %d" % MIN_SCORE)
    parser.add_argument("--json", action="store_true", help="输出完整 JSON")
    parser.add_argument("--markdown", action="store_true", help="输出 Markdown 表格")
    parser.add_argument("--explain", action="store_true", help="打印候选与命中明细")
    parser.add_argument("--list", action="store_true", help="列出全部厂商与文档锚点")
    parser.add_argument("--selftest", action="store_true", help="跑内置自检")
    args = parser.parse_args(argv)

    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    if args.selftest:
        return selftest()
    if args.list:
        for rule in RULES:
            target = rule.get("redirect") or "slider-vendor-matrix.md §%s" % rule["anchor"]
            tag = "路由" if rule.get("route_only") else "族  "
            print("%s %-22s %-34s -> %s" % (tag, rule["id"], rule["label"], target))
        print("共 %d 条：%d 族 + %d 条路由（路由项的目标文档不在本技能）"
              % (len(RULES), len([r for r in RULES if not r.get("route_only")]),
                 len([r for r in RULES if r.get("route_only")])))
        return 0
    if not args.fingerprint:
        parser.print_help()
        print("\n[错误] 缺少 --fingerprint（或用 --list / --selftest）", file=sys.stderr)
        return 2

    try:
        fp = load_fingerprint(args.fingerprint)
    except IOError as exc:
        print("[错误] %s" % exc, file=sys.stderr)
        return 2

    result = identify(fp, min_score=args.min_score)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif args.markdown:
        print(fmt_markdown(result))
    else:
        print(fmt_text(result, explain=args.explain))
    return 0 if result["vendor"] != "unknown" else 3


if __name__ == "__main__":
    sys.exit(main())
