#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""waf_clearance_solver.py — 边缘 WAF / CDN 准入 Cookie 的离线求解器（零依赖，仅标准库）

覆盖四族**可离线**的部分：

  classify     从 HTML / 状态码 / Set-Cookie / 响应头定族与判层
  jsl-first    加速乐第一趟：求值 `document.cookie=...` 表达式
  jsl          加速乐第二趟：由 go({...}) 参数暴力补位求出 __jsl_clearance_s
  acw-table    阿里 acw_sc__v2 的 RC4 字符串表：标定旋转量并按索引反查
  acw-v2-old   阿里 acw_sc__v2 旧版：unsbox + hexXor
  cf-decode    Cloudflare 响应体：rayId 派生 XOR 解码（含 base64 占比自检）
  cf-strtable  Cloudflare 字符串表：按写死的数论恒等式枚举旋转量
  pow-drop     Cloudflare Drop 时间锁 PoW（检查点链）
  pow-bigint   Cloudflare Turnstile 的 BigInt 模幂 PoW

设计约束：
  * 只做**离线可判**的部分。环境校验、isTrusted 事件、图片/canvas 外呼不在本脚本范围。
  * 参数名与语义以 `../../web-js-env-patcher/references/edge-waf-cookie-challenge.md` 为唯一权威源。
  * 每个子命令的 `--selftest` 都带**反例断言**（错误输入必须被拒绝或产出可判别信号），
    避免出现「什么都能认」的退化解。

用法：
  python waf_clearance_solver.py <subcommand> [options]
  python waf_clearance_solver.py --selftest        # 全部子命令自检
  python waf_clearance_solver.py <sub> --selftest  # 单个子命令自检

退出码：0 成功；1 参数/IO 错误；2 自检失败；3 求解失败（有明确原因）。
"""

import argparse
import base64
import binascii
import contextlib
import hashlib
import io
import json
import math
import os
import re
import sys
import urllib.parse

SCHEMA = "waf-clearance/v1"

HASH_BY_NAME = {
    "md5": hashlib.md5,
    "sha1": hashlib.sha1,
    "sha224": hashlib.sha224,
    "sha256": hashlib.sha256,
    "sha384": hashlib.sha384,
    "sha512": hashlib.sha512,
    "sha3": hashlib.sha3_256,
}


class SolveError(Exception):
    """求解失败（有明确原因，不是崩溃）。"""


def _fail(msg):
    raise SolveError(msg)


def read_text_file(path, opt):
    """读文本文件，报错信息面向使用者（把「传了目录」这种高频误用单独说清）。

    `--body` 是最常被传成目录的选项（浏览器把响应体存成一个目录名时），
    直接用 open() 会报 `Permission denied`，对新手完全没有指向性。
    """
    if os.path.isdir(path):
        _fail("%s 传的是目录不是文件：%r。请指向**单个响应体文件**"
              "（例如 cloudflare/xai-cloudflare/artifacts/fo_stage2.txt）。" % (opt, path))
    if not os.path.exists(path):
        _fail("%s 指向的文件不存在：%r。检查路径，或用绝对路径重试。" % (opt, path))
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            return fh.read()
    except OSError as exc:
        _fail("%s 读取失败：%s" % (opt, exc))


# ===========================================================================
# 1. classify —— 定族 / 判层
# ===========================================================================

CLUES = [
    # (vendor, family, layer, 判据列表[(kind, needle, weight)])
    ("jsl", "jsl-2pass-521", "purecalc", [
        ("status", "521", 3),
        ("cookie", "__jsluid_s", 3),
        ("cookie", "__jsl_clearance_s", 4),
        ("body", "document.cookie=('_')", 3),
        ("body", "__jsl_clearance_s", 3),
        ("body", "location.href=location.pathname+location.search", 1),
    ]),
    ("alibaba", "acw-sc-v2-old", "purecalc", [
        ("cookie", "acw_sc__v2", 5),
        ("body", "arg1", 2),
        ("body", "unsbox", 4),
        ("body", "hexXor", 4),
    ]),
    ("alibaba", "acw-sc-v2-new", "purecalc+browser-probe", [
        ("cookie", "acw_sc__v2", 5),
        ("body", "PxjRjE", 3),
        ("body", "debugger;return s['charCodeAt'](0);", 3),
    ]),
    ("cloudflare", "managed-challenge-5s", "mixed", [
        ("body", "_cf_chl_opt", 5),
        ("body", "/cdn-cgi/challenge-platform/", 4),
        ("cookie", "cf_clearance", 5),
        ("cookie", "__cf_bm", 3),
        ("body", "Just a moment", 4),
        ("body", "challenge-platform/h/g/", 3),
    ]),
    ("cloudflare", "turnstile", "mixed", [
        ("body", "challenges.cloudflare.com/turnstile/", 5),
        ("body", "cf-turnstile-response", 5),
        ("body", "turnstile.render", 3),
    ]),
    ("cloudflare", "drop-pow", "purecalc", [
        ("body", "/client/v4/provisioning/previews", 5),
        ("body", "challengeToken", 3),
        ("body", "checkpoints", 3),
    ]),
    ("akamai", "bot-manager", "envfit", [
        ("cookie", "_abck", 5),
        ("cookie", "bm_sz", 4),
        ("cookie", "ak_bmsc", 3),
        ("body", "sensor_data", 4),
    ]),
    ("f5shape", "reese84", "envfit", [
        ("cookie", "reese84", 5),
        ("header", "x-d-token", 4),
        ("body", "reese84interrogatorconstructor", 5),
        ("body", "y-Almost-yet-know-Now-Son-ther-That-swearers-of-", 3),
        ("body", "pplacked-bothe-right-eque-mine-in-him-aftend-Thi", 3),
    ]),
    ("imperva", "incapsula", "envfit", [
        ("cookie", "visid_incap", 4),
        ("cookie", "incap_ses", 4),
        ("body", "___utmvc", 4),
    ]),
    ("kasada", "kpsdk", "envfit+pow", [
        ("header", "x-kpsdk-ct", 5),
        ("header", "x-kpsdk-cd", 5),
        ("cookie", "KP_UID", 3),
        ("body", "ips.js", 3),
    ]),
    ("datadome", "datadome", "envfit", [
        ("cookie", "datadome", 5),
        ("header", "x-datadome", 4),
        ("body", "boring_challenge", 3),
    ]),
    ("human", "perimeterx", "envfit", [
        ("cookie", "_px3", 5),
        ("cookie", "pxvid", 4),
        ("body", "px-captcha", 3),
    ]),
    ("aws", "waf-token", "pow", [
        ("cookie", "aws-waf-token", 5),
        ("body", "challenge.js", 3),
        ("body", "captcha.js", 3),
    ]),
    ("fastly", "bot-management", "pow", [
        ("cookie", "fs_ch_st", 5),
        ("cookie", "fs_ch_cp", 5),
    ]),
    ("ruishu", "botgate", "envfit", [
        ("body", "meta.content", 3),
        ("body", "$_ts", 4),
        ("status", "412", 2),
        ("status", "202", 2),
    ]),
]

LAYER_NOTE = {
    "purecalc": "全部可离线求解：按对应子命令算即可，无需浏览器。",
    "purecalc+browser-probe": "骨架可离线，但要先一次性从浏览器取 3 个值（oO / z / T 表）与未格式化源码。",
    "mixed": "响应体可离线解（cf-decode / cf-strtable）；环境校验必须真浏览器（校验点顺序随机）。",
    "envfit": "环境拟合族：离线性极低，优先真实浏览器 + 环境数组逐字段对齐。",
    "envfit+pow": "环境完整性 + PoW 双门禁：PoW 部分可离线，完整性部分必须真浏览器。",
    "pow": "PoW 可离线求解（花 CPU），无需真实浏览器。",
}


def cmd_classify(args):
    pieces = []
    if args.html:
        pieces.append(read_text_file(args.html, "--html"))
    if args.text:
        # 高频误用：把文件路径传给 --text。此时正文是空/错内容，只剩 --status 在打分，
        # 会给出一个**低置信度但看起来像结果**的判定 —— 比直接报错危险得多。
        if os.path.exists(args.text.strip()) and not args.text.strip().startswith(("__", "{")):
            _fail("--text 传的是**文件路径** %r，它只接受**文本内容**。"
                  "整页响应体请改用 --html <文件>（acw / Akamai / Reese84 这类 200 响应也一样）。"
                  % args.text.strip())
        pieces.append(args.text)
    if args.headers:
        pieces.append(read_text_file(args.headers, "--headers"))
    if args.cookies:
        try:
            pieces.append(open(args.cookies, "r", encoding="utf-8", errors="replace").read())
        except OSError:
            pieces.append(args.cookies)
    body = "\n".join(pieces)
    if not body and not args.status:
        _fail("至少要提供 --html / --text / --cookies / --status 之一")

    lowered = body.lower()
    scored = []
    for vendor, family, layer, clues in CLUES:
        score = 0
        hits = []
        for kind, needle, weight in clues:
            if kind == "status":
                if args.status is not None and str(args.status).strip() == needle:
                    score += weight
                    hits.append("status=%s (+%d)" % (needle, weight))
                continue
            pool = lowered
            if kind == "cookie":
                pool = (args.cookies or "").lower() + "\n" + lowered
            hay = needle.lower()
            if hay in pool or hay in body:
                score += weight
                hits.append("%s:%s (+%d)" % (kind, needle, weight))
        if score > 0:
            scored.append({"vendor": vendor, "family": family, "layer": layer,
                           "score": score, "evidence": hits})
    scored.sort(key=lambda r: (-r["score"], r["vendor"]))
    if not scored:
        _fail("未命中任何族的判据。补充 --html / --cookies / --status 后重试；"
              "不要因为判不出就套一个族继续。")

    top = scored[0]
    # 歧义判据：与第二名同分或差距 <= 2
    ambiguous = len(scored) > 1 and (top["score"] - scored[1]["score"]) <= 2
    result = {
        "schema": SCHEMA,
        "vendor": top["vendor"],
        "family": top["family"],
        "layer": top["layer"],
        "confidence": "low" if ambiguous else ("high" if top["score"] >= 8 else "medium"),
        "ambiguous": ambiguous,
        "evidence": top["evidence"],
        "runners_up": scored[1:4],
        "layer_note": LAYER_NOTE.get(top["layer"], ""),
        "next_step": _next_step(top["family"]),
    }
    _emit(result, args)
    # 退出码口径与 Node 版 classify_edge_challenge.js 对齐：歧义 ⇒ 3（结果不可信），
    # 命中唯一族 ⇒ 0。这样调用方可以只看退出码决定「继续」还是「补证据」。
    return 3 if ambiguous else 0


def _next_step(family):
    return {
        "jsl-2pass-521": "python scripts/waf_clearance_solver.py jsl-first --html <521页面>；再 jsl --json '<go 参数>'",
        "acw-sc-v2-old": "python scripts/waf_clearance_solver.py acw-v2-old --arg1 <40位hex>",
        "acw-sc-v2-new": "先 acw-table 标定字符串表旋转量；再从浏览器取 oO / z / T 表与未格式化源码",
        "managed-challenge-5s": "python scripts/waf_clearance_solver.py cf-strtable --table <表> --base <基址> --target <magic>；再 cf-decode --body <fo响应> --ray <rayId>",
        "turnstile": "cf-decode 解 fo 响应体；交互走真实浏览器（closed shadow root）",
        "drop-pow": "python scripts/waf_clearance_solver.py pow-drop --seed <seed> --k <k> --g <g>",
        "bot-manager": "读 ../../web-js-env-patcher/references/edge-waf-cookie-challenge.md §2.4 环境数组下标表，逐字段对齐下标 1 的 UA/Screen 合并串（配对方向必须现场 dump）",
        "reese84": "读 ../../web-js-env-patcher/references/edge-waf-cookie-challenge.md §2.5 的 22 函数采集清单；注意 st 时间戳校验与动态路径替换",
    }.get(family, "读 ../../web-js-env-patcher/references/edge-waf-cookie-challenge.md 对应小节")


# ===========================================================================
# 2. jsl-first —— 加速乐第一趟表达式求值
# ===========================================================================

# 只允许这些 token：数字、字符串、**白名单字面量**、()、[]、{} 与 JS 的算术/位/比较运算符。
# 白名单字面量之外的标识符、属性访问、函数调用、赋值、分号一律**拒绝** ——
# 输入来自不可信页面，绝不对其执行代码。
JS_LITERALS = {"true": True, "false": False, "undefined": None, "null": None,
               "NaN": float("nan"), "Infinity": float("inf")}
_LITERAL_RE = "|".join(sorted(JS_LITERALS, key=len, reverse=True))

_TOKEN_RE = re.compile(r"""
    (?P<ws>\s+)
  | (?P<kw>""" + _LITERAL_RE + r""")(?![\w$])
  | (?P<num>(?:\d+\.\d+|\d+))
  | (?P<str>'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")
  | (?P<op><<|>>>|>>|<=|>=|===|!==|==|!=|&&|\|\||[-+*/%&|^~!<>()\[\]{},])
""", re.X)

_NAN = float("nan")
_INF = float("inf")


def _tokenize(src):
    tokens, pos = [], 0
    while pos < len(src):
        m = _TOKEN_RE.match(src, pos)
        if not m:
            _fail("表达式含不允许的语法（只支持数字、字符串、数组、空对象与算术/位/逻辑运算符），"
                  "位置 %d 起：%r" % (pos, src[pos:pos + 40]))
        pos = m.end()
        if m.lastgroup != "ws":
            tokens.append((m.lastgroup, m.group()))
    tokens.append(("end", ""))
    return tokens


# ------------------------------------------------------- JS 值语义（子集）

def _js_to_primitive(v):
    if isinstance(v, list):
        return ",".join(_js_to_string(x) for x in v)
    if isinstance(v, dict):
        return "[object Object]"
    return v


def _js_to_string(v):
    p = _js_to_primitive(v)
    if p is None:
        return "null"
    if isinstance(p, bool):
        return "true" if p else "false"
    if isinstance(p, str):
        return p
    if p != p:
        return "NaN"
    if p == _INF:
        return "Infinity"
    if p == -_INF:
        return "-Infinity"
    if isinstance(p, float) and p.is_integer():
        return str(int(p))
    return repr(p)


def _js_to_number(v):
    p = _js_to_primitive(v)
    if p is None:
        return _NAN          # null/undefined 不参与实际表达式，这里保守取 NaN
    if isinstance(p, bool):
        return 1.0 if p else 0.0
    if isinstance(p, str):
        s = p.strip()
        if s == "":
            return 0.0
        try:
            return float(s)
        except ValueError:
            return _NAN
    return float(p)


def _js_to_int32(v):
    n = _js_to_number(v)
    if n != n or n in (_INF, -_INF):
        return 0
    n = int(n) & 0xFFFFFFFF          # Python int() 向零截断，与 JS ToInt32 一致
    return n - 0x100000000 if n >= 0x80000000 else n


def _js_to_uint32(v):
    return _js_to_int32(v) & 0xFFFFFFFF


def _js_truthy(v):
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return len(v) > 0
    if isinstance(v, (list, dict)):
        return True
    if isinstance(v, float):
        return not (v == 0 or v != v)
    return v != 0


def _js_add(a, b):
    pa, pb = _js_to_primitive(a), _js_to_primitive(b)
    if isinstance(pa, str) or isinstance(pb, str):
        return _js_to_string(a) + _js_to_string(b)
    return _js_to_number(a) + _js_to_number(b)


def _js_mod(a, b):
    x, y = _js_to_number(a), _js_to_number(b)
    if y == 0 or x != x or y != y or x in (_INF, -_INF):
        return _NAN
    return math.fmod(x, y)


# ------------------------------------------------------- 递归下降解析器

class _Parser:
    """JS 表达式子集解析器：优先级与 JS 一致，语义按 JS 的 ToPrimitive/ToNumber/ToInt32 实现。"""

    BINARY = [
        ("||",), ("&&",), ("|",), ("^",), ("&",),
        ("==", "!=", "===", "!=="), ("<", "<=", ">", ">="),
        ("<<", ">>", ">>>"), ("+", "-"), ("*", "/", "%"),
    ]

    def __init__(self, tokens):
        self.tokens = tokens
        self.i = 0

    def peek(self):
        return self.tokens[self.i]

    def eat(self, value):
        if self.tokens[self.i][1] != value:
            _fail("表达式语法错误：期望 %r，实际 %r" % (value, self.tokens[self.i][1]))
        self.i += 1

    def parse(self):
        v = self.level(0)
        if self.peek()[1] != "":
            _fail("表达式尾部有多余内容：%r" % self.peek()[1])
        return v

    def level(self, depth):
        if depth >= len(self.BINARY):
            return self.unary()
        ops = self.BINARY[depth]
        left = self.level(depth + 1)
        while self.peek()[1] in ops:
            op = self.peek()[1]
            self.i += 1
            if op == "&&":
                left = self.level(depth + 1) if _js_truthy(left) else left
                continue
            if op == "||":
                right = self.level(depth + 1)
                left = left if _js_truthy(left) else right
                continue
            right = self.level(depth + 1)
            left = self.apply(op, left, right)
        return left

    def unary(self):
        kind, val = self.peek()
        if kind == "op" and val in ("-", "+", "!", "~"):
            self.i += 1
            operand = self.unary()
            if val == "-":
                return -_js_to_number(operand)
            if val == "+":
                return _js_to_number(operand)
            if val == "!":
                return not _js_truthy(operand)
            return ~_js_to_int32(operand)
        return self.primary()

    def primary(self):
        kind, val = self.peek()
        if kind == "num":
            self.i += 1
            return float(val)
        if kind == "kw":
            self.i += 1
            return JS_LITERALS[val]
        if kind == "str":
            self.i += 1
            body = val[1:-1]
            return re.sub(r"\\(.)", r"\1", body)
        if val == "(":
            self.i += 1
            v = self.level(0)
            self.eat(")")
            return v
        if val == "[":
            self.i += 1
            items = []
            if self.peek()[1] != "]":
                items.append(self.level(0))
                while self.peek()[1] == ",":
                    self.i += 1
                    if self.peek()[1] == "]":
                        break
                    items.append(self.level(0))
            self.eat("]")
            return items
        if val == "{":
            self.i += 1
            self.eat("}")
            return {}
        _fail("表达式含不允许的原子：%r（只支持数字、字符串、数组、空对象）" % val)

    @staticmethod
    def apply(op, a, b):
        if op == "+":
            return _js_add(a, b)
        if op == "-":
            return _js_to_number(a) - _js_to_number(b)
        if op == "*":
            return _js_to_number(a) * _js_to_number(b)
        if op == "/":
            x, y = _js_to_number(a), _js_to_number(b)
            if y == 0:
                if x == 0 or x != x:
                    return _NAN
                return _INF if x > 0 else -_INF
            return x / y
        if op == "%":
            return _js_mod(a, b)
        if op == "<<":
            return _js_to_int32(_js_to_int32(a) << (_js_to_uint32(b) & 31))
        if op == ">>":
            return _js_to_int32(a) >> (_js_to_uint32(b) & 31)
        if op == ">>>":
            return _js_to_uint32(a) >> (_js_to_uint32(b) & 31)
        if op == "&":
            return _js_to_int32(a) & _js_to_int32(b)
        if op == "|":
            return _js_to_int32(a) | _js_to_int32(b)
        if op == "^":
            return _js_to_int32(a) ^ _js_to_int32(b)
        if op in ("==", "==="):
            return _js_to_number(a) == _js_to_number(b) if op == "==" else a == b
        if op in ("!=", "!=="):
            return not (_js_to_number(a) == _js_to_number(b)) if op == "!=" else a != b
        if op == "<":
            return _js_to_number(a) < _js_to_number(b)
        if op == "<=":
            return _js_to_number(a) <= _js_to_number(b)
        if op == ">":
            return _js_to_number(a) > _js_to_number(b)
        if op == ">=":
            return _js_to_number(a) >= _js_to_number(b)
        _fail("不支持的运算符：%r" % op)


def eval_cookie_expr(expr):
    """求值加速乐第一趟的 `('_')+('_')+...` 表达式，返回拼接后的字符串。

    不使用任何 JS 引擎：白名单 token 化 + 递归下降求值，语义按 JS 的
    ToPrimitive / ToNumber / ToInt32 实现（`1+[2]` 得 `"12"`，`~~[]` 得 `0`）。
    输入来自不可信页面，出现标识符 / 属性访问 / 函数调用一律拒绝。
    """
    expr = expr.strip().rstrip(";").strip()
    if expr.startswith("document.cookie"):
        expr = expr.split("=", 1)[1]
    if not expr:
        _fail("表达式为空")
    value = _Parser(_tokenize(expr)).parse()
    return _js_to_string(value)


def extract_document_cookie_expr(html):
    """从 521 页面原文里抽出 `document.cookie=` 右侧的表达式。

    不能用 `[^;]+` 一刀切：表达式里**本身就可能出现 `;`**（cookie 属性被逐字符拼出来，
    形如 `...+(';')+('m')+('a')+('x')...`）。所以按「括号深度 + 引号状态」扫描，
    只在**顶层、引号外**遇到 `;` 才截断。
    """
    m = re.search(r"document\.cookie\s*=\s*", html)
    if not m:
        _fail("在 --html 里没找到 `document.cookie=` 形态。请确认传的是 521 首页原文"
              "（不是浏览器渲染后的 DOM，也不是解混淆产物）。")
    depth, quote, out = 0, None, []
    for ch in html[m.end():]:
        if quote:
            out.append(ch)
            if ch == quote:
                quote = None
            continue
        if ch in "'\"":
            quote = ch
            out.append(ch)
            continue
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            if depth == 0:
                break
            depth -= 1
        elif ch == ";" and depth == 0:
            break
        out.append(ch)
    expr = "".join(out).strip()
    if not expr:
        _fail("`document.cookie=` 右侧为空 —— 抽取失败")
    return expr


def cmd_jsl_first(args):
    """三选一入口：--expr / --expr-file / --html（从 521 页面里抽表达式）。"""
    if args.expr_file:
        expr = read_text_file(args.expr_file, "--expr-file")
    elif args.expr:
        expr = args.expr
    elif args.html:
        expr = None  # 下面从 HTML 里抽
    else:
        _fail("需要 --expr、--expr-file 或 --html 三者之一："
              "整页 521 响应体用 --html <文件>；只贴右侧表达式用 --expr '<表达式>'。")
    if args.html:
        expr = extract_document_cookie_expr(read_text_file(args.html, "--html"))

    full = eval_cookie_expr(expr)
    # 拆 `name=value`
    if "=" not in full:
        _fail("求值结果不是 `name=value` 形态：%r" % full[:120])
    name, rest = full.split("=", 1)
    value = rest.split(";", 1)[0]
    attrs = rest[len(value):]
    segs = value.split("|")
    result = {
        "schema": SCHEMA,
        "cookie_name": name.strip(),
        "cookie_value": value,
        "full_set_cookie": full,
        "attributes": attrs.strip(),
        "value_segments": segs,
        "segment_count": len(segs),
    }
    if len(segs) == 3:
        result["structure"] = "<unix_ts>.<ms>|<flag>|<urlenc-base64>"
        result["flag"] = segs[1]
        result["flag_note"] = ("第一趟实测 flag 为 -1；第二趟 go({...}) 的 bts[0] 同结构且 flag 为 0。"
                               "同一次会话内第一趟与第二趟的 <unix_ts> 相同、毫秒不同。")
    _emit(result, args)
    return 0


# ===========================================================================
# 3. jsl —— 加速乐第二趟补位求解
# ===========================================================================

JSL_KEYS = ("bts", "chars", "ct", "ha", "tn", "vt", "wt", "is")


def jsl_solve(params):
    for key in ("bts", "chars", "ct", "ha"):
        if key not in params:
            _fail("go() 参数缺字段 %r" % key)
    bts = params["bts"]
    if not isinstance(bts, (list, tuple)) or len(bts) != 2:
        _fail("bts 必须是有两个元素的数组（[前缀, 后缀]）")
    chars = params["chars"]
    ct = str(params["ct"]).lower()
    ha = str(params["ha"]).lower()
    if ha not in HASH_BY_NAME:
        _fail("不支持的 ha=%r；支持 %s" % (ha, "/".join(sorted(HASH_BY_NAME))))
    hf = HASH_BY_NAME[ha]
    matches = []
    for i, c in enumerate(chars):
        for j, d in enumerate(chars):
            cand = "%s%s%s%s" % (bts[0], c, d, bts[1])
            if hf(cand.encode("utf-8")).hexdigest() == ct:
                matches.append({"i": i, "j": j, "value": cand})
    return {"ha": ha, "ct": ct, "chars_len": len(chars),
            "combinations": len(chars) ** 2, "matches": matches}


def cmd_jsl(args):
    if args.json:
        raw = args.json
        if os.path.isdir(raw):
            _fail("--json 传的是目录不是文件：%r。请传 JSON 字符串，或指向单个 .json 文件。" % raw)
        if os.path.exists(raw):
            raw = read_text_file(raw, "--json")
        try:
            params = json.loads(raw)
        except json.JSONDecodeError as exc:
            _fail("--json 不是合法 JSON：%s" % exc)
    elif args.html:
        html = read_text_file(args.html, "--html")
        m = re.search(r"go\((\{.*?\})\s*\)", html, re.S)
        if not m:
            _fail("在 --html 里找不到 `go({...})`")
        lit = m.group(1)
        lit = re.sub(r"([{,]\s*)([A-Za-z_$][\w$]*)\s*:", r'\1"\2":', lit)
        try:
            params = json.loads(lit)
        except json.JSONDecodeError as exc:
            _fail("go({...}) 参数不是合法 JSON（已尝试补引号）：%s" % exc)
    else:
        _fail("需要 --json 或 --html")

    res = jsl_solve(params)
    distinct = sorted({m["value"] for m in res["matches"]})
    result = {"schema": SCHEMA, "params": params,
              "solution": distinct[0] if distinct else None,
              "distinct_solutions": distinct,
              "match_count": len(res["matches"]),
              "combinations": res["combinations"], "ha": res["ha"],
              "cookie_name": params.get("tn", "__jsl_clearance_s")}
    if len(res["matches"]) > 1:
        result["match_note"] = ("match_count 大于 1 是因为 chars 里有重复字符，多个 (i,j) 指向同一个候选串；"
                                "distinct_solutions 去重后若仍大于 1，才是真的多解。")
    if not distinct:
        _fail("补位枚举 %d 组后无命中：ct/ha/bts/chars 至少有一项取错了；"
              "注意 bts[1] 必须保持 URL 编码原样，不要 unquote。" % res["combinations"])
    _emit(result, args)
    return 0


# ===========================================================================
# 4. acw-table —— 阿里 acw_sc__v2 的 RC4 字符串表
# ===========================================================================

def _rc4(data: bytes, key: bytes) -> bytes:
    if not key:
        _fail("RC4 的 key 不能为空 —— 反查表项时必须给出该表项对应的 key（Console 对照里的第二个字段）")
    s = list(range(256))
    j = 0
    for i in range(256):
        j = (j + s[i] + key[i % len(key)]) % 256
        s[i], s[j] = s[j], s[i]
    out = bytearray()
    i = j = 0
    for b in data:
        i = (i + 1) % 256
        j = (j + s[i]) % 256
        s[i], s[j] = s[j], s[i]
        out.append(b ^ s[(s[i] + s[j]) % 256])
    return bytes(out)


def acw_decode_entry(b64_entry: str, key: str) -> str:
    """`_0x55f3(i, key)` 的单条解码：`atob → decodeURIComponent(escape(...)) → RC4`。

    字节口径（**这里是本族最容易静默错一位的地方**）：
    `decodeURIComponent(escape(atob(x)))` 把每字节当 UTF-8 解释，得到一个 JS 字符串；
    而 RC4 在 JS 里是按 **`charCodeAt`** 取字符的（即「一字符一个字节」），**不是**再按 UTF-8 编码回去。
    ⇒ 所以喂给 RC4 的必须是 `text` 的 **`latin-1`（= charCode 低 8 位）** 编码，
    **不是** `text.encode("utf-8")`（那样等于把原字节又还原回去，解出来是乱码）。

    这个口径由 13 组浏览器 Console 对照 oracle 钉死（旋转 347 → 13/13）。
    """
    try:
        raw = base64.b64decode(b64_entry, validate=True)
    except (binascii.Error, ValueError) as exc:
        _fail("表项不是合法 base64：%r (%s)" % (b64_entry[:40], exc))
    # 等价于 JS 的 decodeURIComponent(escape(atob(x)))：把每字节按 UTF-8 解释
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    data = bytes(ord(ch) & 0xFF for ch in text)          # charCodeAt 语义
    return _rc4(data, key.encode("utf-8")).decode("latin-1")


def _rotate(lst, n):
    n = n % len(lst) if lst else 0
    return lst[n:] + lst[:n]


def cmd_acw_table(args):
    table = _load_json_or_lines(args.table)
    if not isinstance(table, list) or not table:
        _fail("--table 必须是非空 JSON 数组或每行一项的文件")
    # 1) 用 oracle 标定旋转量
    oracle = []
    for item in (args.oracle or []):
        if "=" not in item:
            _fail("--oracle 格式应为 idx=key=明文，收到 %r" % item)
        idx, rest = item.split("=", 1)
        key, expect = rest.split("=", 1)
        oracle.append((idx, key, expect))
    if not oracle:
        _fail("需要至少一条 --oracle idx=key=明文 才能标定旋转量"
              "（旋转量差 1 位结果仍然是可打印字符，不标定就会静默出错）")

    best, hits = None, -1
    for rot in range(len(table)):
        cand = _rotate(table, rot)
        ok = 0
        for idx, key, expect in oracle:
            try:
                got = acw_decode_entry(cand[int(idx, 16)], key)
            except SolveError:
                continue
            if got == expect:
                ok += 1
        if ok > hits:
            best, hits, best_rot = ok, ok, rot
        if ok == len(oracle):
            break
    if best is None or hits == 0:
        _fail("枚举 %d 个旋转量后没有任何命中：--oracle 的 key 或明文写错了" % len(table))
    if hits < len(oracle):
        _fail("最佳旋转量 %d 只命中 %d/%d 条 oracle —— 说明旋转量或 key 有误，"
              "不要带着部分命中继续用" % (best_rot, hits, len(oracle)))

    rotated = _rotate(table, best_rot)
    lit = args.literal
    result = {
        "schema": SCHEMA, "table_size": len(table), "rotation": best_rot,
        "oracle_total": len(oracle), "oracle_hit": hits,
        "rotation_rule": ("`while(--n){push(shift())}` 的迭代次数 = 源码 IIFE 的第二个实参（字面量）；"
                          "但 `push(shift())` 是**绕环**的 ⇒ **实际左移位数 = 字面量 mod 表长**。"
                          "本工具枚举的正是这个「实际左移位数」，范围 0..表长-1。"),
    }
    if lit is not None:
        result["rotation_literal"] = lit
        result["rotation_check"] = ("字面量 %d %% 表长 %d = %d，与实际枚举到的 %d %s"
                                    % (lit, len(table), lit % len(table), best_rot,
                                       "一致" if lit % len(table) == best_rot else "**不一致，别照用**"))
    if args.lookup:
        if not args.key:
            _fail("--lookup 必须与 --key 一起用：表项是「按 key 做 RC4」解出来的，"
                  "**每条 key 不同**，不存在「不传 key 也能反查」的用法。"
                  "key 取自浏览器 Console 对照（`_0x55f3('<idx>','<key>')`）的第二个参数。")
        entries = {}
        for idx in args.lookup:
            try:
                entries[idx] = acw_decode_entry(rotated[int(idx, 16)], args.key)
            except SolveError as exc:
                entries[idx] = "ERR: %s" % exc
        result["lookup"] = entries
    if args.range:
        if not args.key:
            _fail("--range 必须与 --key 一起用（理由同 --lookup）。")
        lo, hi = args.range
        full = {}
        for i in range(lo, hi + 1):
            if i < len(rotated):
                full[str(i)] = acw_decode_entry(rotated[i], args.key)
        result["decoded_range"] = full
    _emit(result, args)
    return 0


# ===========================================================================
# 5. acw-v2-old —— unsbox + hexXor
# ===========================================================================

UNSBOX_TABLE = [15, 35, 29, 24, 33, 16, 1, 38, 10, 9, 19, 31, 40, 27, 22, 23, 25, 13, 6, 11,
                39, 18, 20, 8, 14, 21, 32, 26, 2, 30, 7, 4, 17, 5, 3, 28, 34, 37, 12, 36]
HEXXOR_KEY = "3000176000856006061501533003690027800375"


def acw_unsbox(src: str) -> str:
    """等价于 JS 的 `String.prototype.unsbox`（置换表固定 40 项）。

    逐字符找 `T[k] == pos+1`，命中就把该字符放到第 k 位；未命中的位保持空洞，
    JS 里 `holes.join('')` 会渲染成空串 ⇒ 这里用 `None` 表示空洞，最后过滤掉。
    因此 `len(src) < 40` 时输出更短（**与 JS 一致**），`len(src) > 40` 时 JS 会**静默丢弃**多余字符，
    这里选择**大声报错**（静默丢字符比报错危险得多）。
    """
    if len(src) > len(UNSBOX_TABLE):
        raise SolveError("arg1 长度 %d 超出置换表长度 %d：JS 会静默丢弃多余字符，"
                         "这里按失败处理（请先确认 arg1 提取正确）" % (len(src), len(UNSBOX_TABLE)))
    out = [None] * len(UNSBOX_TABLE)
    for pos, ch in enumerate(src):
        for k, tv in enumerate(UNSBOX_TABLE):
            if tv == pos + 1:
                out[k] = ch
                break
    return "".join(c for c in out if c is not None)


def acw_hex_xor(a: str, b: str) -> str:
    """等价于 JS 的 `String.prototype.hexXor`：按 2 字符一组取 hex，异或后转 hex。

    细节：JS 的循环条件是 `i < this.length && i < key.length`，步长 2；
    长度是奇数时最后一组只取到 1 个字符（`parseInt` 仍能解析一个 nibble），
    所以**不能**简单写成 `range(0, min(len)-1, 2)`。
    结果转 hex 后**长度为 1 时前补 `0`**。
    """
    out = []
    i = 0
    while i < len(a) and i < len(b):
        x = int(a[i:i + 2], 16) ^ int(b[i:i + 2], 16)
        seg = format(x, "x")
        if len(seg) == 1:
            seg = "0" + seg
        out.append(seg)
        i += 2
    return "".join(out)


def cmd_acw_v2_old(args):
    arg1 = (args.arg1 or "").strip()
    if args.html:
        html = read_text_file(args.html, "--html")
        m = re.search(r"arg1\s*=\s*['\"]([0-9A-Fa-f]+)['\"]", html)
        if not m:
            _fail("在 --html 里找不到 arg1")
        arg1 = m.group(1)
    if not arg1:
        _fail("需要 --arg1 或 --html")
    if not re.fullmatch(r"[0-9A-Fa-f]+", arg1):
        _fail("arg1 必须是十六进制串，收到 %r" % arg1[:40])
    key = args.key or HEXXOR_KEY
    mid = acw_unsbox(arg1)
    value = acw_hex_xor(mid, key)
    result = {
        "schema": SCHEMA, "arg1": arg1, "arg1_len": len(arg1),
        "unsbox": mid, "hex_xor_key": key,
        "cookie_name": "acw_sc__v2", "cookie_value": value,
        "note": "unsbox 是 1..40 的双射（可逆，长度保持）；"
                "hexXor 按 2 字符一组做 hex 异或、结果 hex 长度为 1 时前补 '0'，且自逆。",
    }
    _emit(result, args)
    return 0


# ===========================================================================
# 6. cf-decode —— Cloudflare 响应体 rayId-XOR
# ===========================================================================

B64_ALPHABET = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=")


def cf_xor_key(ray_id: str) -> int:
    key = 32
    seg = ray_id + "_0"
    for ch in seg:
        key ^= ord(ch)
    return key


def cf_decode(encoded: str, ray_id: str) -> str:
    # 与浏览器 atob 对齐：先去掉全部空白，再严格解码（atob 不接受非法字符）
    compact = re.sub(r"\s+", "", encoded)
    try:
        raw = base64.b64decode(compact, validate=True)
    except (binascii.Error, ValueError) as exc:
        _fail("响应体不是合法 base64（等价于 atob 失败）：%s" % exc)
    key = cf_xor_key(ray_id)
    out = []
    for i, b in enumerate(raw):
        out.append(chr(((b & 255) - key - (i % 65535) + 65535) % 255))
    return "".join(out)


def cf_encode(plain: str, ray_id: str) -> str:
    """`cf_decode` 的逆运算（用于自造 fixture / 做往返断言）。"""
    key = cf_xor_key(ray_id)
    raw = bytes(((ord(ch) + key + (i % 65535)) % 255) for i, ch in enumerate(plain))
    return base64.b64encode(raw).decode("ascii")


def _b64_ratio(s: str) -> float:
    if not s:
        return 0.0
    return sum(1 for ch in s if ch in B64_ALPHABET) / len(s)


def cf_decode_checked(encoded: str, ray_id: str):
    """返回 (明文, 自检信息)。base64 占比 != 1.0 即判定 rayId 取错。"""
    text = cf_decode(encoded, ray_id)
    ratio = _b64_ratio(text)
    branch = "plaintext-script" if text.startswith("window._") else "bytecode-vm"
    return text, {"b64_ratio": round(ratio, 4), "ray_id_ok": ratio >= 0.999,
                  "expected_head": "window._" if text.startswith("window._") else "base64 串",
                  "branch": branch, "length": len(text)}


def cmd_cf_decode(args):
    if args.body:
        body = read_text_file(args.body, "--body").strip()
    elif args.text:
        body = args.text.strip()
    else:
        _fail("需要 --body 或 --text")
    if not args.ray:
        _fail("需要 --ray（取 _cf_chl_opt.rayId，16 位 hex，**不是** challengeRayId）")
    ray = args.ray.strip()
    if not re.fullmatch(r"[0-9a-fA-F]{8,32}", ray):
        _fail("rayId 形态异常（应为 8~32 位 hex）：%r" % ray)

    text, info = cf_decode_checked(body, ray)
    result = {"schema": SCHEMA, "ray_id": ray, "cipher_len": len(body),
              "decoded_len": len(text), **info}
    if not info["ray_id_ok"]:
        # 仍然输出（不做静默降级），但同时在 stderr 明说，免得只扫一眼 JSON 的人继续往下走
        result["diagnosis"] = ("base64 字母表占比 %.4f != 1.0 ⇒ rayId 取错了。"
                               "实测参考值：真实 rayId=1.000；末位差 1 = 0.83(fo_stage2) / 0.79(fo_stage1)；"
                               "全 0 假值 = 0.35 / 0.29。**判据阈值就是 1.0**，不要放宽到 0.9。"
                               % info["b64_ratio"])
        print("[不可信] 解码结果不是合法 base64 串（占比 %.4f != 1.0）⇒ 几乎可以断定 --ray 取错了，"
              "**不要拿这个结果继续**。rayId 必须从**同一个**响应体的 `_cf_chl_opt.rayId` 里取。"
              % info["b64_ratio"], file=sys.stderr)
    result["head"] = text[:200]
    if args.out:
        try:
            with open(args.out, "w", encoding="utf-8") as fh:
                fh.write(text)
        except OSError as exc:
            _fail("写出 --out 失败：%s" % exc)
        result["written"] = args.out
    _emit(result, args)
    return 0 if info["ray_id_ok"] else 3


# ===========================================================================
# 7. cf-strtable —— Cloudflare 字符串表旋转
# ===========================================================================

def _load_json_or_lines(path):
    try:
        raw = open(path, "r", encoding="utf-8", errors="replace").read()
    except OSError as exc:
        _fail("读取 %s 失败：%s" % (path, exc))
    stripped = raw.strip()
    if stripped.startswith("["):
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            pass
    if ";" in stripped and "\n" not in stripped[:2000]:
        return stripped.split(";")
    return [ln for ln in stripped.splitlines() if ln.strip()]


_LEADING_INT = re.compile(r"^[+-]?\d+")


def _js_parse_int(v):
    """等价于 JS `parseInt(v)`（十进制）：取前导整数前缀，取不到返回 NaN。

    不能直接用 Python 的 int()/float()：表项形如 `'998842qYxftE'`，
    JS 的 parseInt 取到 998842，而 Python 会直接报错 —— 报错就会被静默跳过，
    导致旋转量永远找不到。
    """
    s = str(_js_to_primitive(v)).strip()
    m = _LEADING_INT.match(s)
    if not m:
        return _NAN
    try:
        return float(int(m.group(0), 10))
    except ValueError:
        return _NAN


def cf_identity(table, base, terms):
    """按一项项 `±取表器(k)/div*(取表器(k2)/div2)` 求值。

    terms: [(sign, k, div, k2, div2)]；k2 为 None 表示单项。
    语义严格对齐 JS：`parseInt` 取前导整数、IEEE754 双精度、**从左到右**累加。
    """
    total = 0.0
    for sign, k, div, k2, div2 in terms:
        v1 = _js_parse_int(table[k - base])
        if v1 != v1:
            return _NAN
        if k2 is None:
            total += sign * v1 / div
        else:
            v2 = _js_parse_int(table[k2 - base])
            if v2 != v2:
                return _NAN
            total += sign * (v1 / div) * (v2 / div2)
    return total


def cmd_cf_strtable(args):
    table = _load_json_or_lines(args.table)
    if not isinstance(table, list) or not table:
        _fail("--table 必须是非空数组")
    if args.terms:
        terms = []
        for raw in args.terms:
            segs = raw.split(",")
            if len(segs) != 5:
                _fail("--terms 每项格式 sign,k,div,k2,div2（k2 用 - 表示无）；收到 %r" % raw)
            sign = 1.0 if segs[0] in ("+", "1") else -1.0
            k = int(segs[1])
            div = float(segs[2])
            k2 = None if segs[3] in ("-", "") else int(segs[3])
            div2 = float(segs[4]) if segs[4] not in ("", "-") else 1.0
            terms.append((sign, k, div, k2, div2))
    else:
        # 默认：本批 new_chl_script_2.js 的实测恒等式（magic 608776，基址 458）。
        # 第 6 项源码是 `-parseInt(xL(1797))/8*(-parseInt(xL(1532))/9)`：两个负号相乘得正，
        # 所以 sign 取 +1、div2 取 9（不要照抄成 -1）。
        terms = [(1, 539, 1, None, 1), (-1, 2236, 2, None, 1), (-1, 1037, 3, 2421, 4),
                 (-1, 1247, 5, 2279, 6), (-1, 1176, 7, None, 1),
                 (1, 1797, 8, 1532, 9), (1, 2302, 10, None, 1)]
    base = args.base
    target = args.target

    hit = None
    for rot in range(len(table)):
        cand = _rotate(table, rot)
        try:
            # 严格用 `==`：与 JS 的 `F === bl` 一致，不做容差匹配
            if cf_identity(cand, base, terms) == target:
                hit = rot
                break
        except (SolveError, IndexError, ZeroDivisionError):
            continue
    if hit is None:
        _fail("枚举 %d 个旋转量后没命中 magic=%s：检查 --base（取表器偏移）与 --terms（恒等式系数）。"
              "基址 / 旋转量 / magic 三者每版本都不同，必须**现场从脚本里读**，不能硬编码。"
              % (len(table), target))

    rotated = _rotate(table, hit)
    result = {"schema": SCHEMA, "table_size": len(table), "base": base,
              "target": target, "rotation": hit,
              "rotation_semantics": "startup 执行 be.push(be.shift()) 共 rotation 次后命中 magic",
              "accessor": "i(n) = table[n - %d]" % base,
              "note": "旋转量、基址、magic 每个版本都不同；必须用脚本内的恒等式现场枚举。"}
    if args.verify:
        checks = {}
        for item in args.verify:
            if "=" not in item:
                _fail("--verify 格式应为 idx=明文")
            idx, expect = item.split("=", 1)
            got = rotated[int(idx) - base]
            checks[idx] = {"got": got, "expect": expect, "ok": got == expect}
        result["verify"] = checks
        if not all(v["ok"] for v in checks.values()):
            result["diagnosis"] = "有 verify 项不匹配 ⇒ 旋转量虽然命中 magic，但基址或表分列可能错了。"
    if args.out_table:
        try:
            with open(args.out_table, "w", encoding="utf-8") as fh:
                for i, item in enumerate(rotated):
                    fh.write("%d\t%s\n" % (i + base, item))
        except OSError as exc:
            _fail("写出 --out-table 失败：%s" % exc)
        result["written"] = args.out_table
    _emit(result, args)
    return 0


# ===========================================================================
# 8. pow-drop —— Cloudflare Drop 时间锁 PoW
# ===========================================================================

def drop_pow(seed_b64url: str, k: int, g: int):
    if k <= 0 or g <= 0:
        _fail("k 与 g 必须为正整数（实测 k=1000、g=2000）")
    pad = "=" * (-len(seed_b64url) % 4)
    try:
        start = hashlib.sha256(base64.urlsafe_b64decode(seed_b64url + pad)).digest()
    except (binascii.Error, ValueError) as exc:
        _fail("seed 不是合法 base64url：%s" % exc)
    state = start
    checkpoints = [state]
    for _ in range(k):
        for _ in range(g):
            state = hashlib.sha256(state).digest()
        checkpoints.append(state)
    return b"".join(checkpoints), checkpoints, start


def drop_verify_segment(prev_cp: bytes, next_cp: bytes, g: int) -> bool:
    state = prev_cp
    for _ in range(g):
        state = hashlib.sha256(state).digest()
    return state == next_cp


def cmd_pow_drop(args):
    if args.seed:
        seed = args.seed.strip()
    elif args.challenge_json:
        try:
            data = json.loads(read_text_file(args.challenge_json, "--challenge-json"))
        except json.JSONDecodeError as exc:
            _fail("--challenge-json 不是合法 JSON：%s" % exc)
        res = data.get("result", data)
        seed = res.get("seed")
        args.k = args.k or int(res.get("k", 1000))
        args.g = args.g or int(res.get("g", 2000))
        if not seed:
            _fail("挑战 JSON 里没有 result.seed")
    else:
        _fail("需要 --seed 或 --challenge-json")
    k = args.k if args.k is not None else 1000
    g = args.g if args.g is not None else 2000

    raw, checkpoints, start = drop_pow(seed, k, g)
    solution = base64.b64encode(raw).decode("ascii")
    result = {
        "schema": SCHEMA, "k": k, "g": g, "s": args.s,
        "sha256_iterations": (k + 1) * g,
        "checkpoint_count": len(checkpoints),
        "raw_bytes": len(raw), "solution_len": len(solution),
        "solution": solution,
        "note": "s=16 在当前版本未参与计算（预留参数）；SHA-256 链天然串行，GPU/多线程无法加速；"
                "检查点链可分段验证（服务端每收一段验一段）。",
    }
    if args.emit_checkpoints:
        result["checkpoints_b64"] = [base64.b64encode(cp).decode("ascii") for cp in checkpoints]
    if not args.no_verify:
        seg_ok = drop_verify_segment(checkpoints[0], checkpoints[1], g)
        result["segment_verify"] = {"first_segment_ok": seg_ok}
        if not seg_ok:
            _fail("分段验证失败 —— 实现有 bug，不要使用该结果")
    _emit(result, args)
    return 0


# ===========================================================================
# 9. pow-bigint —— Turnstile BigInt 模幂
# ===========================================================================

CF_MODULUS_HEX = ("00e9d3dca1328a49ad3403e4badda37a6a13610b608b5099839e1074e720f5a3"
                  "3b2ebd8c2ffd12c09be0015a4635aa9d2022d8f72f90ed11610c3742b0baef5b"
                  "7da73d7e79aff6cdbdeab72492ce0a858e4c1f4c27a14ebbb4ce3beacfda982f"
                  "e74463e76f654aab0c597d5e73686ea149023e8f60ae6365a30055fe2c5eb2ebfb")
CF_EXPONENT = 65537


def cmd_pow_bigint(args):
    mod = int(args.modulus_hex or CF_MODULUS_HEX, 16)
    exp = int(args.exponent or CF_EXPONENT)
    if args.seed:
        seed = args.seed.strip()
        pad = "=" * (-len(seed) % 4)
        try:
            raw = base64.urlsafe_b64decode(seed + pad)
        except (binascii.Error, ValueError):
            try:
                raw = bytes.fromhex(seed)
            except ValueError as exc:
                _fail("--seed 既不是 base64url 也不是 hex：%s" % exc)
    elif args.random:
        raw = os.urandom(128)
    else:
        _fail("需要 --seed 或 --random（模拟 crypto.getRandomValues(new Uint8Array(128))）")
    if len(raw) != 128:
        _fail("seed 必须是 128 字节（与 getRandomValues(new Uint8Array(128)) 一致），收到 %d" % len(raw))
    # 源码里明确写了 seed[0] = 0，所以默认把首字节清零（--no-force-zero-first 关闭）
    seed_bytes = bytes([0]) + raw[1:] if args.force_zero_first else raw

    base = int.from_bytes(seed_bytes, "big") % mod
    res = pow(base, exp, mod)
    res_fixed = res.to_bytes(128, "big")
    result = {
        "schema": SCHEMA, "modulus_bits": mod.bit_length(), "exponent": exp,
        "seed_len": len(seed_bytes),
        "base_head": hex(base)[:34],
        "result_hex": res_fixed.hex(),
        "result_hex_stripped": hex(res)[2:],
        "note": "模数是写死的 1024 bit 常量（三处来源逐字符一致），两个脚本共用同一常量 ⇒ 可跨版本复用；"
                "seed 的 128 字节直接当大整数取模，模幂结果按 128 字节填充后进入载荷；"
                "指数固定 65537（0x10001）。",
    }
    if args.verify_with_python:
        # Python 内置 pow(a,b,m) 是独立实现，用来自证我方实现（这里是同一路径，做接口自检）
        result["independent_check"] = pow(base, exp, mod) == res
        if not result["independent_check"]:
            _fail("与独立实现不一致")
    _emit(result, args)
    return 0


# ===========================================================================
# 输出
# ===========================================================================

def _emit(result, args):
    if getattr(args, "markdown", False):
        print("## %s" % result.get("schema", SCHEMA))
        for key, val in result.items():
            if key == "schema":
                continue
            if isinstance(val, (dict, list)):
                print("- **%s**:" % key)
                print("```json")
                print(json.dumps(val, ensure_ascii=False, indent=2))
                print("```")
            else:
                print("- **%s**: %s" % (key, val))
        return
    print(json.dumps(result, ensure_ascii=False, indent=2))


# ===========================================================================
# 自检
# ===========================================================================

def _selftest_jsl():
    # 4 组来自真实文章的 go({...}) 参数，逐个补位求解
    cases = [
        ({"ha": "md5", "bts": ["1626918646.167|0|xcX", "rLB%2FdFGil%2FWSDtvv5CSWRc%3D"],
          "chars": "vyPzcSzkrMmFNwvtkEHtwG", "ct": "30ef50b82076b2284fa6ca90acbb5938"},
         "1626918646.167|0|xcXwtrLB%2FdFGil%2FWSDtvv5CSWRc%3D"),
        ({"ha": "sha1", "bts": ["1742210366.499|0|C5I", "Q%2F9kYuj%2B4tZg3eUTzG0FMI%3D"],
          "chars": "CVOIhfIxdhyiNDpQAYHxbN", "ct": "25e3a650286ae514c4499fd072c62baac2a5aa7e"},
         "1742210366.499|0|C5IdxQ%2F9kYuj%2B4tZg3eUTzG0FMI%3D"),
        ({"ha": "sha1", "bts": ["1741586083.055|0|8CI", "B7T2GJJz%2FcUdeHFkRe6pg3bg%3D"],
          "chars": "YSmMypDsqQ2ohC%jibqXLT", "ct": "460ea567c075a1ae6961688fdfb94b90ad348834"},
         "1741586083.055|0|8CI%2B7T2GJJz%2FcUdeHFkRe6pg3bg%3D"),
        ({"ha": "sha256", "bts": ["1741572280.105|0|muv", "sjo3nn%2FimqQAhNp9X1aCuY%3D"],
          "chars": "TqPahdOXDzvVxEzQfGHK5v", "ct": "d38f1d26d274ebfb77ae39fda3893f0611b8256716fa6ce1a11a1bba7feaedcf"},
         "1741572280.105|0|muv5xsjo3nn%2FimqQAhNp9X1aCuY%3D"),
    ]
    for params, expect in cases:
        try:
            res = jsl_solve(params)
        except SolveError as exc:
            raise AssertionError("jsl %s 求解失败：%s" % (params["ha"], exc))
        if res["matches"][0]["value"] != expect:
            raise AssertionError("jsl %s 结果不符：%r != %r"
                                 % (params["ha"], res["matches"][0]["value"], expect))
        if res["combinations"] != len(params["chars"]) ** 2:
            raise AssertionError("jsl 组合数不符")
    # 反例 1：ha 不支持 → 必须拒绝
    try:
        jsl_solve({"ha": "md4", "bts": ["a", "b"], "chars": "kk", "ct": "00"})
        raise AssertionError("jsl 应拒绝未知 ha 却通过了")
    except SolveError:
        pass
    # 反例 2：ct 改一位 → 必须无命中
    bad = dict(cases[0][0])
    bad["ct"] = "0" * 32
    if jsl_solve(bad)["matches"]:
        raise AssertionError("jsl 对错误 ct 仍然命中 —— 退化解")
    # 反例 3：bts 被 unquote 后必须无命中（证明「保持 URL 编码」这条口径是硬约束）
    bad2 = dict(cases[0][0])
    bad2["bts"] = [bad2["bts"][0], urllib.parse.unquote(bad2["bts"][1])]
    if jsl_solve(bad2)["matches"]:
        raise AssertionError("jsl 在 bts[1] 被 unquote 后仍命中 —— 口径错误")
    return 4


def _selftest_jsl_first():
    # 两组真实表达式 + 期望值。期望值由 node 的 eval() 独立求出（差分 oracle）：
    #   node -e "console.log(JSON.stringify(eval(expr)))"
    cases = [
        # 52pojie-1513028（cnvd）：{ts}|-1|{urlenc-base64} —— 证明第一趟 flag 是 -1
        ("('_')+('_')+('j')+('s')+('l')+('_')+('c')+('l')+('e')+('a')+('r')+('a')+('n')+('c')+('e')"
         "+('_')+('s')+('=')+(-~{}+'')+((1+[2])/[2]+'')+((1<<1)+'')+(2+4+'')+(4+5+'')+(-~{}+'')"
         "+((1<<3)+'')+([2]*(3)+'')+((2)*[2]+'')+(1+5+'')+('.')+(~~[]+'')+(([2]+0>>2)+'')+(2+7+'')"
         "+('|')+('-')+(+!+[]+'')+('|')+('z')+('G')+('A')+(9+'')+('N')+('Y')+('U')+('%')+((1<<1)+'')"
         "+('B')+('g')+('Y')+('R')+('W')+('V')+('Z')+('b')+('W')+('m')+('i')+('S')+(2+4+'')+('X')"
         "+('w')+('v')+('A')+('Q')+('P')+('g')+('%')+((1+[2]>>2)+'')+('D')",
         "__jsl_clearance_s=1626918646.059|-1|zGA9NYU%2BgYRWVZbWmiS6XwvAQPg%3D"),
        # 52pojie-2016235（120ask）：带 SameSite/Secure 的完整 Set-Cookie
        ("('_')+('_')+('j')+('s')+('l')+('_')+('c')+('l')+('e')+('a')+('r')+('a')+('n')+('c')+('e')"
         "+('_')+('s')+('=')+((+true)+'')+(1+6+'')+(1+3+'')+(-~1+'')+(0+1+0+1+'')+(1+[0]-(1)+'')"
         "+([3]*(3)+'')+(9-1*2+'')+((1+[2])/[2]+'')+(([2]+0>>2)+'')+('.')+(-~[5]+'')+(-~[6]+'')"
         "+(7+'')+('|')+('-')+((+true)+'')+('|')+('d')+('W')+('S')+('x')+('Z')+('R')+('l')+('N')"
         "+('N')+('K')+('z')+('I')+('V')+('E')+(~~[]+'')+((2<<2)+'')+('l')+('Z')+('v')+(1+8+'')"
         "+('T')+(5+'')+('D')+('m')+('G')+('j')+('Q')+('%')+((1+[2]>>2)+'')+('D')+(';')+(' ')"
         "+('M')+('a')+('x')+('-')+('a')+('g')+('e')+('=')+(1+2+'')+([2]*(3)+'')+((+[])+'')"
         "+(~~[]+'')+(';')+(' ')+('P')+('a')+('t')+('h')+('=')+('/')+(';')+(' ')+('S')+('a')+('m')"
         "+('e')+('S')+('i')+('t')+('e')+('=')+('N')+('o')+('n')+('e')+(';')+(' ')+('S')+('e')"
         "+('c')+('u')+('r')+('e')",
         "__jsl_clearance_s=1742299765.677|-1|dWSxZRlNNKzIVE08lZv9T5DmGjQ%3D"
         "; Max-age=3600; Path=/; SameSite=None; Secure"),
    ]
    for expr, expect in cases:
        got = eval_cookie_expr(expr)
        if got != expect:
            raise AssertionError("jsl-first 结果不符：\n got=%r\n exp=%r" % (got, expect))
    # JS 值语义断言：这三条是本脚本最容易写错的地方
    if _js_to_string(_Parser(_tokenize("1+[2]")).parse()) != "12":
        raise AssertionError("JS `1+[2]` 应为字符串 \"12\"")
    if _js_to_string(_Parser(_tokenize("~~[]")).parse()) != "0":
        raise AssertionError("JS `~~[]` 应为 0")
    if _js_to_string(_Parser(_tokenize("-~{}")).parse()) != "1":
        raise AssertionError("JS `-~{}` 应为 1")
    if _js_to_string(_Parser(_tokenize("(-~{}>\"\")")).parse()) != "true" or \
       _js_to_string(_Parser(_tokenize("1+\"0\"-1")).parse()) != "9":
        raise AssertionError("JS 字符串→数字转换不符")
    # 反例：含标识符 / 属性访问 / 函数调用的表达式必须被拒绝（不做任何代码执行）
    for bad in ["document.cookie", "window['x']", "alert(1)", "__proto__", "a=b", "x;y"]:
        try:
            eval_cookie_expr("('a')+" + bad)
            raise AssertionError("jsl-first 应拒绝 %r 却通过了" % bad)
        except SolveError:
            pass
    # 反例：空表达式必须被拒绝
    try:
        eval_cookie_expr("   ")
        raise AssertionError("jsl-first 应拒绝空表达式")
    except SolveError:
        pass
    # --html 抽取：表达式**内部含 `;`**（cookie 属性被逐字符拼出来）时不能被截断
    expr2, expect2 = cases[1]
    fake_page = ("<html><script>document.cookie=" + expr2 +
                 ";location.href=location.pathname+location.search;</script></html>")
    if extract_document_cookie_expr(fake_page) != expr2:
        raise AssertionError("--html 抽取把表达式里的 `(';')` 当成语句结束符截断了")
    if eval_cookie_expr(extract_document_cookie_expr(fake_page)) != expect2:
        raise AssertionError("--html 抽取后再求值结果与 --expr 直传不一致")
    # 反例：页面里没有 `document.cookie=` 必须给出可操作报错，而不是静默返回空串
    try:
        extract_document_cookie_expr("<html>Just a moment...</html>")
        raise AssertionError("--html 抽取应拒绝没有 document.cookie 的页面")
    except SolveError:
        pass
    return len(cases) + 4 + 6 + 1 + 3


def _selftest_acw():
    # 表是 1..40 的排列（双射）
    if sorted(UNSBOX_TABLE) != list(range(1, 41)):
        raise AssertionError("UNSBOX_TABLE 不是 1..40 的排列")
    arg1 = "F5552FD53D7DEE57A54020812B92605A1D2314C4"
    mid = acw_unsbox(arg1)
    if len(mid) != len(arg1) or sorted(mid) != sorted(arg1):
        raise AssertionError("unsbox 不是长度保持的双射（字符多重集应相同）")
    if mid == arg1:
        raise AssertionError("unsbox 未改变任何字符 —— 表位错")
    v1 = acw_hex_xor(mid, HEXXOR_KEY)
    if not re.fullmatch(r"[0-9a-f]+", v1) or len(v1) != 40:
        raise AssertionError("hexXor 输出形态不对：%r" % v1)
    # hexXor 自逆
    if acw_hex_xor(v1, HEXXOR_KEY) != mid.lower():
        raise AssertionError("hexXor 不是自逆 —— 实现有误")
    # 奇数长度：JS 的循环条件允许最后一组只有 1 个字符 ⇒ 输出取整段 len//2+1 组
    odd = acw_hex_xor("abc", "0f0")
    if len(odd) != 4:   # ab^0f → 2 字符；c(1 nibble)^0 → 1 字符前补 0 ⇒ 共 4
        raise AssertionError("hexXor 奇数长度的分组语义不符 JS，得到 %r" % odd)
    # 反例：超长 arg1 必须被拒绝（JS 会静默丢字符，我们选择报错）
    try:
        acw_unsbox("A" * 41)
        raise AssertionError("acw_unsbox 应拒绝超长输入")
    except SolveError:
        pass
    # 短输入（<40）应长度收缩，不能报错
    short = acw_unsbox("F5552FD5")
    if len(short) >= 40:
        raise AssertionError("unsbox 短输入应输出更短（JS 的 holes.join('') 语义）")
    # 反例：非 hex arg1
    try:
        acw_hex_xor("zz", HEXXOR_KEY)
        raise AssertionError("acw_hex_xor 应拒绝非 hex 输入")
    except ValueError:
        pass
    return 6


def _selftest_acw_table():
    arr = ["csKHwqMI", "ZsKJwr8VeAsy", "UcKiN8O/wplwMA==", "JR8CTg==",
           "YsOnbSEQw7ozwqZKesKUw7kwX8ORIQ==", "w7oVS8OSwoPCl3jChMKhw6HDlsKXw4s/YsOG",
           "fwVmI1AtwplaY8Otw5cNfSgpw6M=", "OcONwrjCqsKxTGTChsOjEWE8PcOcJ8K6",
           "U8K5LcOtwpV0EMOkw47DrMOX", "HMO2woHCiMK9SlXClcOoC1k=",
           "asKIwqMDdgMuPsOKBMKcwrrCtkLDrMKBw64d", "wqImMT0tw6RNw5k=", "DMKcU0JmUwUv",
           "VjHDlMOHVcONX3fDicKJHQ==", "wqhBH8Knw4TDhSDDgMOdwrjCncOWwphhN8KCGcKqw6dHAU5+wrg2JcKaw4IEJcOcwrRJwoZ0wqF9YgAV",
           "dzd2w5bDm3jDpsK3wpY=", "w4PDgcKXwo3CkcKLwr5qwrY=", "wrJOTcOQWMOg",
           "wqTDvcOjw447wr4=", "w5XDqsKhMF1/", "wrAyHsOfwppc", "J3dVPcOxLg==",
           "wrdHw7p9Zw==", "w4rDo8KmNEw=", "IMKAUkBt", "w6bDrcKQwpVHwpNQwqU=",
           "d8OsWhAUw7YzwrU=", "wqnCksOeezrDhw==", "UsKnIMKWV8K/", "w4zDocK8NUZv",
           "c8OxZhAJw6skwqJj", "PcKIw4nCkkVb", "KHgodMO2VQ==", "wpsmwqvDnGFq",
           "wqLDt8Okw4c=", "w7w1w4PCpsO4wqA=", "wq9FRsOqWMOq", "byBhw7rDm34=",
           "LHg+S8OtTw==", "wqhOw715dsOH", "U8O7VsO0wqvDvcKuKsOqX8Kr",
           "Yittw5DDnWnDrA==", "YMKIwqUUfgIk", "aB7DlMODTQ==", "wpfDh8Orw6kk",
           "w7vCqMOrY8KAVk5OwpnCu8OaXsKZP3DClcKyw6HDrQ==",
           "wow+w6vDmHpsw7Rtwo98LC7CiG7CksORT8KlW8O5wr3Di8OTHsODeHjDmcKlJsKqVA==",
           "NwV+", "w7HDrcKtwpJawpZb", "wpQswqvDiHpuw6I=", "YMKUwqMJZQ==",
           "KH1VKcOqKsK1", "fQ5sFUkkwpI=", "wrvCrcOBR8Kk", "M3w0fQ==", "w6xXwqPDvMOFwo5d"]
    oracle = [("0x3", "jS1Y", "3000176000856006061501533003690027800375"),
              ("0x19", "Pg54", "unsbox"), ("0x1b", "z5O&", "hexXor"),
              ("0x14", "Z*DM", "unsbox"), ("0x16", "aH*N", "length"),
              ("0x5", "n]fR", "prototype"), ("0x6", "Pg54", "hexXor"),
              ("0xa", "jE&^", "length"), ("0xb", "V2KE", "slice"),
              ("0xd", "XMW^", "slice"), ("0xf", "W1FE", "toString"),
              ("0x11", "MGrv", "length"), ("0x8", ")hRc", "length")]
    LITERAL = 347                       # 源码里 IIFE 的第二个实参

    def hits_for(rot):
        cand = _rotate(arr, rot)
        return sum(1 for idx, key, exp in oracle
                   if acw_decode_entry(cand[int(idx, 16)], key) == exp)

    # 1) 全枚举，收集所有「满命中」的旋转量
    full = [rot for rot in range(len(arr)) if hits_for(rot) == len(oracle)]
    if len(full) != 1:
        raise AssertionError("满命中旋转量应恰有 1 个，实际 %r" % full)
    # 2) 唯一满命中必须 = 字面量 347 对表长取模（JS 的 `while(--n)` 是 347 次左移，
    #    环形数组下等价于左移 347 % len）
    if full[0] != LITERAL % len(arr):
        raise AssertionError("唯一满命中旋转量 %d != %d %% %d = %d"
                             % (full[0], LITERAL, len(arr), LITERAL % len(arr)))
    # 3) 反例：任何其它旋转量必须 0 命中（差 1 位就全错，且**结果仍是可打印字符**）
    others = [rot for rot in range(len(arr)) if rot != full[0] and hits_for(rot)]
    if others:
        raise AssertionError("非目标旋转量 %r 竟然也有命中 —— 标定退化" % others)
    # 4) 反例：把 oracle 的明文改一个字符，满命中必须消失（防止「无论怎么转都算过」）
    idx, key, expect = oracle[0]
    tampered = oracle[1:] + [(idx, key, expect + "X")]
    tfull = [rot for rot in range(len(arr))
             if sum(1 for i2, k2, e2 in tampered
                    if acw_decode_entry(_rotate(arr, rot)[int(i2, 16)], k2) == e2) == len(tampered)]
    if tfull:
        raise AssertionError("oracle 被篡改后仍有满命中 %r —— 判据无区分力" % tfull)
    # 5) CLI 端到端：真写一个表文件，跑 `acw-table --oracle ...`，标定出的旋转量必须可复现
    import json as _json
    import tempfile
    tmp = os.path.join(tempfile.gettempdir(), "acw_table_selftest.json")
    with open(tmp, "w", encoding="utf-8") as fh:
        _json.dump(arr, fh)
    try:
        payload = _capture_main(["acw-table", "--table", tmp,
                                 "--oracle", "%s=%s=%s" % oracle[0]])
        got = _json.loads(payload)
        if got.get("rotation") != LITERAL % len(arr):
            raise AssertionError("acw-table CLI 标定出的旋转量 %r 与 %d %% %d 不符"
                                 % (got.get("rotation"), LITERAL, len(arr)))
        if got.get("oracle_hit") != 1:
            raise AssertionError("acw-table CLI 的单条 oracle 命中数应为 1，实际 %r" % got.get("oracle_hit"))
        rc, msg = _quiet_main_rc(["acw-table", "--table", tmp,
                                  "--oracle", "%s=%s=%s" % oracle[0], "--lookup", "0x3"])
        if rc != 3 or "key" not in msg:
            raise AssertionError("--lookup 缺 --key 应报可读错误（rc=3），实际 rc=%r msg=%r" % (rc, msg[-160:]))
    finally:
        try:
            os.remove(tmp)
        except OSError:
            pass
    return len(oracle) + 6


def _selftest_cf_decode():
    checked = 0
    # (a) 合成往返：明文分支与字节码分支各一
    for ray in ("a393f8784a8dce7a", "0123456789abcdef"):
        for plain in ("window._cf_chl_opt = {x:1};", "QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo="):
            enc = cf_encode(plain, ray)
            back, info = cf_decode_checked(enc, ray)
            if back != plain:
                raise AssertionError("cf-decode 往返失败（ray=%s）" % ray)
            if info["b64_ratio"] != 1.0 and "window._" not in plain:
                raise AssertionError("base64 串的合成样本占比应为 1.0，实际 %.4f" % info["b64_ratio"])
            checked += 1
        # 反例：错误 rayId 必须让占比显著下降
        enc = cf_encode("QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=", ray)
        _, bad = cf_decode_checked(enc, ray[:-1] + ("b" if ray[-1] != "b" else "c"))
        if bad["b64_ratio"] >= 0.999:
            raise AssertionError("错误 rayId 的占比未下降 —— 判别指标失效")
        checked += 1

    # (b) 真实样本：与仓内 .plain 逐字节一致
    xai = os.path.join("cloudflare", "xai-cloudflare", "artifacts")
    for name, ray in (("fo_stage2.txt", "a393f8784a8dce7a"), ("fo_stage1.txt", "a393f8784a8dce7a")):
        p = os.path.join(xai, name)
        exp_path = p + ".plain"
        if not (os.path.exists(p) and os.path.exists(exp_path)):
            continue
        body = open(p, "r", encoding="utf-8").read().strip()
        text, info = cf_decode_checked(body, ray)
        if not info["ray_id_ok"] or info["b64_ratio"] != 1.0:
            raise AssertionError("%s 真实 ray 解码后 base64 占比 %.4f != 1.0" % (name, info["b64_ratio"]))
        if info["branch"] != "bytecode-vm":
            raise AssertionError("%s 应命中 bytecode-vm 分支，实际 %s" % (name, info["branch"]))
        expected = open(exp_path, "r", encoding="utf-8").read()
        if text != expected:
            raise AssertionError("%s 与仓内 .plain 不逐字节一致" % name)
        # 反例：末位差 1 的真实样本
        _, bad = cf_decode_checked(body, ray[:-1] + ("b" if ray[-1] != "b" else "c"))
        if bad["b64_ratio"] >= 0.999:
            raise AssertionError("%s 错误 rayId 的占比未下降 —— 判别指标失效" % name)
        checked += 2

    # (c) 反例：非 base64 输入必须被拒绝；rayId 形态异常必须被拒绝
    try:
        cf_decode("!!!not-base64!!!", "a393f8784a8dce7a")
        raise AssertionError("cf_decode 应拒绝非 base64 输入")
    except SolveError:
        pass
    checked += 1
    if cf_xor_key("a") == cf_xor_key("b"):
        raise AssertionError("不同 rayId 派生出相同 key —— key 派生有误")
    checked += 1
    return checked


def _selftest_cf_strtable():
    checked = 0
    # (a) 合成可移植用例：不依赖 workspace，验证「枚举旋转量直到恒等式命中」
    syn_terms = [(1, 1, 1, None, 1)]
    syn = ["0"] * 50
    syn[1] = "12345"
    syn_rotation = 7
    # raw 是「启动前」的表；对它左旋 7 次即得到满足恒等式的顺序
    syn_table = _rotate(syn, -syn_rotation)
    found = None
    for rot in range(len(syn_table)):
        try:
            if cf_identity(_rotate(syn_table, rot), 0, syn_terms) == 12345.0:
                found = rot
                break
        except (SolveError, IndexError, ZeroDivisionError):
            continue
    if found != syn_rotation:
        raise AssertionError("cf-strtable 合成用例应命中旋转 %d，实际 %r" % (syn_rotation, found))
    checked += 1
    # 反例：magic 改一位必须命中不了
    for rot in range(len(syn_table)):
        try:
            if cf_identity(_rotate(syn_table, rot), 0, syn_terms) == 12346.0:
                raise AssertionError("合成用例 magic 改一位后仍命中 —— 判别退化")
        except (SolveError, IndexError, ZeroDivisionError):
            continue
    checked += 1

    # (b) 真实用例：本仓 new_chl_script_2.js 的实测恒等式
    p = os.path.join("cloudflare", "xai-cloudflare", "artifacts", "new_table_raw.txt")
    if not os.path.exists(p):
        return checked
    table = open(p, "r", encoding="utf-8").read().strip().split(";")
    base, target = 458, 608776
    terms = [(1, 539, 1, None, 1), (-1, 2236, 2, None, 1), (-1, 1037, 3, 2421, 4),
             (-1, 1247, 5, 2279, 6), (-1, 1176, 7, None, 1), (1, 1797, 8, 1532, 9),
             (1, 2302, 10, None, 1)]
    hit = None
    for rot in range(len(table)):
        try:
            if cf_identity(_rotate(table, rot), base, terms) == target:
                hit = rot
                break
        except (SolveError, IndexError, ZeroDivisionError):
            continue
    if hit != 434:
        raise AssertionError("cf-strtable 旋转量应为 434，实际 %r" % hit)
    rotated = _rotate(table, hit)
    if rotated[1487 - base] != "document" or rotated[618 - base] != "BCkZA9":
        raise AssertionError("cf-strtable 索引校验失败：%r / %r"
                             % (rotated[1487 - base], rotated[618 - base]))
    # 反例：magic 改一位必须命中不了（防止恒等式判别退化）
    for rot in range(len(table)):
        try:
            if cf_identity(_rotate(table, rot), base, terms) == target + 1:
                raise AssertionError("magic 改一位后仍命中 —— 恒等式判别退化")
        except (SolveError, IndexError, ZeroDivisionError):
            continue
    # 反例：`parseInt` 语义必须实现（表项形如 '998842qYxftE'，用 float() 会抛错被跳过）
    if _js_parse_int("998842qYxftE") != 998842.0:
        raise AssertionError("_js_parse_int 未实现 JS parseInt 的前导整数语义")
    if _js_parse_int("qYxftE") == _js_parse_int("qYxftE"):
        raise AssertionError("_js_parse_int 对非数字串应返回 NaN")
    return checked + 4


def _selftest_pow():
    raw, cps, start = drop_pow("AAAA", 3, 4)
    if len(cps) != 4 or len(raw) != 4 * 32:
        raise AssertionError("drop PoW 检查点数量/长度不对")
    if not drop_verify_segment(cps[0], cps[1], 4):
        raise AssertionError("drop PoW 分段验证失败")
    # 反例：g 改错必须验证失败
    if drop_verify_segment(cps[0], cps[1], 3):
        raise AssertionError("drop PoW 在 g=3 时仍验证通过 —— 退化解")
    # 反例：非法 k/g
    for bad in ((0, 4), (3, 0), (-1, 4)):
        try:
            drop_pow("AAAA", bad[0], bad[1])
            raise AssertionError("drop PoW 应拒绝 k/g=%r" % (bad,))
        except SolveError:
            pass
    # BigInt 模幂：与 Python 内置 pow 独立核对
    mod = int(CF_MODULUS_HEX, 16)
    if mod.bit_length() != 1024:
        raise AssertionError("CF 模数位长应为 1024，实际 %d" % mod.bit_length())
    # 跨来源核对：同一常量应在本仓三处逐字符一致（文章 / 案例报告 / 真实脚本）
    srcs = ["docs/references/1752891-cloudflare-turnstile-reverse.md",
            "cloudflare/xai-cloudflare/REPORT.md",
            "cloudflare/xai-cloudflare/artifacts/new_chl_script_2.js"]
    checked_src = 0
    for src in srcs:
        if not os.path.exists(src):
            continue
        txt = open(src, encoding="utf-8", errors="replace").read()
        m = re.search(r"0x0*([0-9a-fA-F]{100,})", txt)
        if not m:
            raise AssertionError("%s 里找不到 CF 模数常量" % src)
        if int(m.group(1), 16) != mod:
            raise AssertionError("%s 里的模数与内置常量不一致" % src)
        checked_src += 1
    seed = bytes([0]) + os.urandom(127)
    b = int.from_bytes(seed, "big") % mod
    if pow(b, CF_EXPONENT, mod) != pow(b, 65537, mod):
        raise AssertionError("模幂自检失败")
    if pow(b, CF_EXPONENT, mod) >= mod:
        raise AssertionError("模幂结果未取模")
    # 反例：走**真实 CLI 路径**验证参数门禁与退出码
    with contextlib.redirect_stderr(io.StringIO()):
        if main(["pow-bigint", "--seed", "AAAA"]) != 3:
            raise AssertionError("pow-bigint 应拒绝长度不足的 seed（退出码 3）")
        if main(["pow-drop", "--seed", "AAAA", "--k", "0"]) != 3:
            raise AssertionError("pow-drop 应拒绝 k=0（退出码 3）")
        if main(["cf-decode", "--text", "QUJD", "--ray", "zz"]) != 3:
            raise AssertionError("cf-decode 应拒绝形态异常的 rayId（退出码 3）")
        if main(["jsl", "--json", "{}"]) != 3:
            raise AssertionError("jsl 应拒绝缺字段的 go 参数（退出码 3）")
    return 6 + checked_src + 4


def _quiet_main(argv):
    """跑 main() 但吞掉输出，只取退出码（自检里不该把 JSON 打到屏幕上）。"""
    import contextlib
    import io as _io
    buf = _io.StringIO()
    try:
        with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
            return main(argv), buf.getvalue()
    except SystemExit as exc:                                  # argparse 用法错误
        return (exc.code if isinstance(exc.code, int) else 2), buf.getvalue()


def _quiet_main_rc(argv):
    """同 `_quiet_main`，但只返回 (退出码, 输出) —— 语义更直白。"""
    rc, out = _quiet_main(argv)
    return rc, out


def _capture_main(argv):
    """跑 main() 并要求成功（退出码 0），返回其 stdout。失败时抛 AssertionError。"""
    rc, out = _quiet_main(argv)
    if rc != 0:
        raise AssertionError("`%s` 期望成功（0），实际 %r：\n%s"
                             % (" ".join(argv), rc, out[-600:]))
    return out


def _selftest_cli_errors():
    """CLI 健壮性：所有误用都必须走「可读报错 + 约定退出码」，**不允许抛裸 traceback**。

    这是本族最常见的第一次使用体验：把目录当文件传、路径写错、JSON 写坏。
    报错必须能回答「我传错了什么、下一步怎么办」。
    """
    n = 0
    cases = [
        (["jsl", "--json", "cloudflare"], 3),                 # 目录当文件传
        (["jsl", "--json", "{bad json"], 3),                  # JSON 写坏
        (["jsl", "--json", "no_such_file_xyz.json"], 3),       # 路径不存在
        (["cf-decode", "--body", "cloudflare", "--ray", "a393f8784a8dce7a"], 3),
        (["cf-decode", "--body", "no_such_fo.txt", "--ray", "a393f8784a8dce7a"], 3),
        (["jsl-first"], 3),                                    # 三选一入口一个都没给
        (["jsl-first", "--html", "no_such_page.html"], 3),
        (["classify"], 3),                                     # 一点证据都没给
        (["acw-v2-old", "--arg1", "ZZZZ"], 3),                 # 非 hex
        (["acw-table", "--table", "cloudflare"], 3),           # 表传成目录
        (["--help"], 0),                                       # 帮助可读
        ([], 1),                                               # 没给子命令 ⇒ 帮助 + 1
    ]
    for argv, want in cases:
        rc, out = _quiet_main(argv)
        if rc != want:
            raise AssertionError("`%s` 退出码应为 %d，实际 %r" % (" ".join(argv) or "(空)", want, rc))
        # 误用必须给中文可读原因，不能是裸 traceback
        if want == 3 and "Traceback" in out:
            raise AssertionError("`%s` 抛了裸 traceback：\n%s" % (" ".join(argv), out[-400:]))
        n += 1
    # 反例：定族歧义必须返回 3（与 Node 版 classify 口径一致），唯一命中必须 0
    rc_amb, out_amb = _quiet_main(["classify", "--text",
                                   "__jsluid_s=a; __jsl_clearance_s=b; cf_clearance=c",
                                   "--status", "521", "--headers", "x-kpsdk-ct: 1"])
    if rc_amb != 3:
        raise AssertionError("定族歧义应返回 3，实际 %r" % rc_amb)
    n += 1
    rc_one, _ = _quiet_main(["classify", "--text", "__jsluid_s=a", "--status", "521"])
    if rc_one != 0:
        raise AssertionError("定族唯一命中应返回 0，实际 %r" % rc_one)
    n += 1
    # 反例：把**文件路径**传给 --text 必须被拒（否则只剩 --status 打分，会给出看似结果的误判）
    rc_txt, out_txt = _quiet_main(["classify", "--text", __file__, "--status", "521"])
    if rc_txt != 3:
        raise AssertionError("--text 传文件路径应被拒绝（3），实际 %r" % rc_txt)
    if "文件路径" not in out_txt:
        raise AssertionError("--text 传文件路径的报错必须点明「只接受文本内容」：%r" % out_txt[-200:])
    n += 1
    return n


def run_selftest(which="all"):
    groups = {
        "jsl": ("jsl 加速乐第二趟补位", _selftest_jsl),
        "jsl-first": ("jsl-first 加速乐第一趟表达式", _selftest_jsl_first),
        "acw": ("acw-v2-old + acw-table", lambda: _selftest_acw() + _selftest_acw_table()),
        "cf-decode": ("cf-decode rayId-XOR", _selftest_cf_decode),
        "cf-strtable": ("cf-strtable 字符串表旋转", _selftest_cf_strtable),
        "pow": ("pow-drop + pow-bigint", _selftest_pow),
        "cli": ("CLI 误用与退出码", _selftest_cli_errors),
    }
    selected = groups if which == "all" else {which: groups[which]}
    total, failed = 0, []
    for key, (label, fn) in selected.items():
        try:
            n = fn()
            total += n
            print("  [ok]   %-34s %d 项断言" % (label, n))
        except AssertionError as exc:
            failed.append((label, str(exc)))
            print("  [FAIL] %-34s %s" % (label, exc))
    print("\n断言合计 %d 项；失败分组 %d 个" % (total, len(failed)))
    if failed:
        print("自检未通过，不要使用本脚本产出的结果。")
        return 2
    print("全部自检通过。")
    return 0


# ===========================================================================
# CLI
# ===========================================================================

def build_parser():
    p = argparse.ArgumentParser(
        prog="waf_clearance_solver.py",
        description="边缘 WAF / CDN 准入 Cookie 离线求解器（零依赖）。"
                    "语义与参数名以 `../../web-js-env-patcher/references/edge-waf-cookie-challenge.md` 为准。")
    p.add_argument("--selftest", action="store_true", help="跑全部子命令的自检")
    p.add_argument("--markdown", action="store_true", help="输出人读 Markdown")
    sub = p.add_subparsers(dest="command")
    # `--markdown` 在父解析器与子解析器上都注册一次：父级默认 False，子级用 SUPPRESS
    # 以免覆盖父级已置位的 True ⇒ `--markdown <cmd>` 与 `<cmd> --markdown` 都能用。
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--markdown", action="store_true", default=argparse.SUPPRESS,
                        help="输出人读 Markdown")

    c = sub.add_parser("classify", parents=[common], help="从 HTML / 状态码 / Set-Cookie 定族与判层")
    c.add_argument("--html", help="页面/响应体**文件路径**（不是内容；内容用 --text）")
    c.add_argument("--text", help="直接给**文本内容**（不是文件路径；文件用 --html）")
    c.add_argument("--headers", help="响应头**文件路径**")
    c.add_argument("--cookies", help="Set-Cookie 原始串（或含 Set-Cookie 的文件路径）")
    c.add_argument("--status", type=int, help="HTTP 状态码；不是唯一判据（acw 首访是 200）")
    c.set_defaults(func=cmd_classify)

    c = sub.add_parser("jsl-first", parents=[common], help="加速乐第一趟 document.cookie 表达式求值")
    c.add_argument("--expr", help="表达式字符串（`document.cookie=` 右侧那一段）")
    c.add_argument("--expr-file", help="表达式所在文件")
    c.add_argument("--html", help="整页 521 响应体文件，自动抽 `document.cookie=` 右侧表达式")
    c.set_defaults(func=cmd_jsl_first)

    c = sub.add_parser("jsl", parents=[common], help="加速乐第二趟补位求解")
    c.add_argument("--json", help="go({...}) 参数（JSON 字符串，或 .json 文件路径）")
    c.add_argument("--html", help="整页 521 响应体文件，自动抽 `go({...})` 参数")
    c.set_defaults(func=cmd_jsl)

    c = sub.add_parser("acw-table", parents=[common], help="阿里 acw_sc__v2 的 RC4 字符串表标定与反查")
    c.add_argument("--table", required=True, help="表文件（JSON 数组或每行一项）")
    c.add_argument("--key", default="", help="解码时用的 RC4 key（查表时用）")
    c.add_argument("--oracle", action="append", metavar="IDX=KEY=PLAINTEXT",
                   help="浏览器 Console 拿到的 索引=key=明文 对照；至少要一条")
    c.add_argument("--lookup", action="append", metavar="IDX", help="要解码的索引（必须同时给 --key）")
    c.add_argument("--range", nargs=2, type=int, metavar=("LO", "HI"),
                   help="按十进制下标区间批量反查（必须同时给 --key）")
    c.add_argument("--literal", type=int, metavar="N",
                   help="源码里 IIFE 的第二个实参（如 347）；给了就核对 N %% 表长 是否等于枚举到的位数")
    c.set_defaults(func=cmd_acw_table)

    c = sub.add_parser("acw-v2-old", parents=[common], help="阿里 acw_sc__v2 旧版 unsbox + hexXor")
    c.add_argument("--arg1", help="页面内联隐藏 textarea 里的 40 位 hex（每次访问都变）")
    c.add_argument("--html", help="整页响应体文件，自动抽 arg1")
    c.add_argument("--key", default=None, help="覆盖默认 40 位 hex（20 字节）的 hexXor key")
    c.set_defaults(func=cmd_acw_v2_old)

    c = sub.add_parser("cf-decode", parents=[common], help="Cloudflare 响应体 rayId-XOR 解码")
    c.add_argument("--body", help="fo 响应体**文件路径**（不是内容；内容用 --text）")
    c.add_argument("--text", help="直接给响应体**内容**")
    c.add_argument("--ray", help="同一响应体的 _cf_chl_opt.rayId（16 位 hex，**不是** challengeRayId）")
    c.add_argument("--out")
    c.set_defaults(func=cmd_cf_decode)

    c = sub.add_parser("cf-strtable", parents=[common], help="Cloudflare 字符串表按恒等式枚举旋转量")
    c.add_argument("--table", required=True)
    c.add_argument("--base", type=int, default=458, help="取表器偏移 i(n)=table[n-base]")
    c.add_argument("--target", type=float, default=608776, help="写死的 magic 值")
    c.add_argument("--terms", action="append", metavar="SIGN,K,DIV,K2,DIV2",
                   help="恒等式每项；不传则用本批实测表达式")
    c.add_argument("--verify", action="append", metavar="IDX=PLAINTEXT")
    c.add_argument("--out-table")
    c.set_defaults(func=cmd_cf_strtable)

    c = sub.add_parser("pow-drop", parents=[common], help="Cloudflare Drop 时间锁 PoW")
    c.add_argument("--seed", help="base64url seed")
    c.add_argument("--challenge-json")
    c.add_argument("--k", type=int)
    c.add_argument("--g", type=int)
    c.add_argument("--s", type=int, default=16)
    c.add_argument("--emit-checkpoints", action="store_true")
    c.add_argument("--no-verify", action="store_true")
    c.set_defaults(func=cmd_pow_drop)

    c = sub.add_parser("pow-bigint", parents=[common], help="Cloudflare Turnstile BigInt 模幂 PoW")
    c.add_argument("--seed")
    c.add_argument("--random", action="store_true")
    c.add_argument("--modulus-hex")
    c.add_argument("--exponent", type=int)
    c.add_argument("--force-zero-first", action="store_true", default=True,
                   help="把 seed[0] 清零（源码里写了 seed[0]=0，默认开启）")
    c.add_argument("--no-force-zero-first", dest="force_zero_first", action="store_false")
    c.add_argument("--verify-with-python", action="store_true", default=True)
    c.set_defaults(func=cmd_pow_bigint)

    return p


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    which = "all"
    if "--selftest" in argv:
        idx = argv.index("--selftest")
        cmd = None
        for a in argv[:idx]:
            if not a.startswith("-"):
                cmd = a
                break
        which = cmd or "all"
        if which != "all" and which not in ("jsl", "jsl-first", "acw-table", "acw", "cf-decode",
                                            "cf-strtable", "pow", "pow-drop", "pow-bigint", "cli"):
            which = "all"
        elif which == "acw-table":
            which = "acw"
        elif which in ("pow-drop", "pow-bigint"):
            which = "pow"
        print("自检：%s" % which)
        return run_selftest(which)

    parser = build_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "func", None):
        parser.print_help()
        return 1
    try:
        return args.func(args)
    except SolveError as exc:
        print("[求解失败] %s" % exc, file=sys.stderr)
        return 3
    except KeyboardInterrupt:
        print("[中断]", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())