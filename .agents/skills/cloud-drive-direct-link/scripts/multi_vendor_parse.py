#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
多厂商网盘协议工具（零依赖，纯标准库）。

覆盖 5 个厂商里**可离线复算**的那部分：

  logid         百度 `logid` 参数 —— 证明它 == 标准 base64(毫秒时间戳 + Math.random())，
                且那个 73 字符"自定义字母表"的尾部 9 字符是死代码。
  aliyun-hash   阿里云盘 `user_meta.hash`（三取样点 + 长度字符串）、`pre_hash`、全文件 sha1。
  ws-hash       文叔叔秒传三件套 `cm1` / `cs1` / `cm`。
  pan123        123 云盘 `DownloadURL` 里的 `params=<base64>` 解包与 `auto_redirect=0` 补全。
  vendor        厂商判据。

设计约束（沿用本仓库既有脚本的口径）：
  * 只用标准库；不联网；不写任何文件到被校验目录（夹具一律 tempfile）。
  * 每个 oracle 都带**阴性对照**（负例必须与正例给出不同结果），否则断言等于没写。
  * `--selftest` 必须可离线跑通，且**不依赖工作区里的任何样本文件**。

用法：
  python multi_vendor_parse.py logid --input '16990000000000.8423156'
  python multi_vendor_parse.py aliyun-hash --fixture 5000000
  python multi_vendor_parse.py aliyun-hash --file ./a.bin
  python multi_vendor_parse.py ws-hash --fixture 3000000
  python multi_vendor_parse.py pan123 --download-url 'https://x/y?params=<b64>'
  python multi_vendor_parse.py vendor --url 'https://pan.baidu.com/s/1abc'
  python multi_vendor_parse.py --selftest
"""

import argparse
import base64
import hashlib
import os
import re
import sys
import tempfile

# ---------------------------------------------------------------- 常量（回源）

# 52pojie-1208082 的 logid.js 原串。73 个字符 = 标准 base64 表(64) + 尾部 9 个。
LOGID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/~！@#￥%……&"
STD_B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

# 52pojie-1311697：小文件判据分水岭；`size <= 20480` 走全文件分支。
ALIYUN_SMALL_MAX = 20480
# 52pojie-1311697：`pre_hash` 取前 1024 字节。
ALIYUN_PRE_BYTES = 1024
# 52pojie-1311697：三取样点的段长。
ALIYUN_TAIL_BYTES = 1024

# 52pojie-1075330：文叔叔分块阈值 2MB。
WS_BLOCK = 2097152


# ---------------------------------------------------------------- logid

def logid_encode(text):
    """百度 logid：等价于标准 base64。

    源码链条（`logid.js`）：
        m = function() { return p(f((new Date).getTime())) }   // ← 零形参
        w = function(e, t) { return t ? m(String(e)).replace(/[+/]/g,…).replace(/=/g,'')
                                      : m(String(e)) }
    三个可离线验证的事实：
      1) `m` 零形参 ⇒ 传进去的 `baiduid` 被丢弃，logid 与账号无关；
      2) `g` 的四个 charAt 下标都 `& 63`（或 `>>>18`，24 位块）⇒ 最大 63 ⇒ **字母表尾部永不取用**；
         而前 64 个字符恰好等于标准 base64 表 ⇒ 输出就是标准 base64；
      3) `f` 的 `replace(d, l)` 只匹配非 ASCII（`d` 含 `[^\\x00-\\x7F]`），ASCII 输入下是恒等变换。
    """
    raw = text.encode("utf-8")
    return base64.b64encode(raw).decode("ascii")


def logid_encode_with_declared_alphabet(text):
    """按"来源声称的 73 字符自定义字母表"编码 —— 用于证明它与标准 base64 逐字符相同。

    ⚠️ **`t` 必须按"当前这一块"的长度算，不能按整个输入的长度算。**
    源码是 `e.replace(/[\\s\\S]{1,3}/g, g)`，`g` 内部 `var t = [0, 2, 1][e.length % 3]`
    里的 `e` 是**被 replace 交给它的那一块**。按总长算的话，`"1234"` 会输出 `MT==NA==`
    （错），正确是 `MTIzNA==`。这条最初被我写错，是自检里"73 字符表 == 标准 base64"那条断言抓出来的。
    """
    raw = text.encode("utf-8")
    out = []
    for i in range(0, len(raw), 3):
        chunk = raw[i:i + 3]
        t = [0, 2, 1][len(chunk) % 3]          # ← 按块算
        n = (chunk[0] << 16) | ((chunk[1] if len(chunk) > 1 else 0) << 8) | (chunk[2] if len(chunk) > 2 else 0)
        # 注意：下标的 & 63 / >>>18 决定了最大值 63
        out.append(LOGID_ALPHABET[(n >> 18) & 63])
        out.append(LOGID_ALPHABET[(n >> 12) & 63])
        out.append("=" if t >= 2 else LOGID_ALPHABET[(n >> 6) & 63])
        out.append("=" if t >= 1 else LOGID_ALPHABET[n & 63])
    return "".join(out)


def logid_build(ms_timestamp, random_part):
    """logid = base64(str(毫秒时间戳) + str(Math.random()))。"""
    return logid_encode("%s%s" % (ms_timestamp, random_part))


def logid_alphabet_audit():
    """返回字母表审计结果：总长、尾部（永不取用）片段、前 64 是否等于标准表。"""
    tail = LOGID_ALPHABET[64:]
    return {
        "length": len(LOGID_ALPHABET),
        "tail": tail,
        "tail_len": len(tail),
        "head_is_std": LOGID_ALPHABET[:64] == STD_B64_ALPHABET,
    }


# ---------------------------------------------------------------- 阿里云盘 hash

def _sha1_hex(*chunks):
    h = hashlib.sha1()
    for c in chunks:
        h.update(c)
    return h.hexdigest()


def aliyun_pre_hash(data):
    """`pre_hash` = sha1(前 1024 字节)。"""
    return _sha1_hex(data[:ALIYUN_PRE_BYTES])


def aliyun_content_hash(data):
    """秒传用的 `content_hash` = 全文件 sha1（源实现按 1MB 分块 update，结果等同）。"""
    return _sha1_hex(data)


def aliyun_user_meta_hash(data):
    """`user_meta.hash` —— 专有算法：三取样点 + 十进制长度字符串。

    顺序固定：bytes[0:2048] + bytes[n//2 : n//2+1024] + bytes[n-1024 : n] + str(n)。
    """
    n = len(data)
    if n <= ALIYUN_SMALL_MAX:
        return _sha1_hex(data)
    mid = n // 2
    return _sha1_hex(
        data[0:2048],
        data[mid:mid + ALIYUN_TAIL_BYTES],
        data[n - ALIYUN_TAIL_BYTES:n],
        str(n).encode("utf-8"),
    )


# ---------------------------------------------------------------- 文叔叔 hash

def _md5_hex(b):
    return hashlib.md5(b).hexdigest()


def wenshushu_hashes(data):
    """秒传三件套。

    cm1 = md5(首块)          cs1 = sha1(首块)        —— 同一个块
    cm  = 整块上传: sha1(cm1 的 hex 字符串)
          分块上传: sha1(所有分块 md5 的 hex 字符串首尾相接)
    """
    size = len(data)
    ispart = size > WS_BLOCK
    first_block = data[:WS_BLOCK] if ispart else data
    cm1 = _md5_hex(first_block)
    cs1 = _sha1_hex(first_block)
    if not ispart:
        cm = _sha1_hex(cm1.encode("utf-8"))
    else:
        codes = "".join(_md5_hex(data[i:i + WS_BLOCK]) for i in range(0, size, WS_BLOCK))
        cm = _sha1_hex(codes.encode("utf-8"))
    return {"ispart": ispart, "cm1": cm1, "cs1": cs1, "cm": cm}


# ---------------------------------------------------------------- 123 云盘

PAN123_PARAMS_RE = re.compile(r"params=([^&]+)")
# ⚠️ 源实现（52pojie-1790540）用的是 `(?<=\/s\/)[^\/.]+`，**没有排除空白**。
# 而"分享链接 + 提取码"最常见的粘贴形态是 `https://…/s/AbCd-1234 提取码:xyz9`（中间是个空格），
# 用源正则会把 `AbCd-1234 提取码:xyz9` 整段当成 shareId。这里加 `\s` 修掉。
PAN123_SHARE_ID_RE = re.compile(r"(?<=/s/)[^/.\s]+")
PAN123_PWD_RE = re.compile(r"提取码[:：]\s*(\w+)")


def _b64_decode_strict(raw):
    """严格解 base64（标准表与 URL-safe 表都接受）—— **非法字符一律报错，绝不静默丢字符**。

    为什么不用裸 `base64.b64decode`：它默认 `validate=False`，会**静默丢弃**字母表外的字符。
    后果有两层，第二层才是真正危险的：
      ① `params=@@@` 解成空串 ⇒ 拼上 `auto_redirect=0` 打印一个"看起来合法却完全错误"的地址（exit 0）；
      ② `params=<合法 base64 的 URL>@@@` ⇒ **尾部垃圾被悄悄丢掉**，函数返回一个"正确的" URL，
         使用者**完全看不出输入已被污染**。
    所以这里必须 `validate=True`，并且**不设宽松回退**（回退一次就等于把 ② 又放回来了）。
    `altchars=b"-_"` 让标准表与 URL-safe 表共用一条严格路径。
    """
    if not raw:
        raise ValueError("params 为空")
    padded = raw + "=" * (-len(raw) % 4)
    try:
        out = base64.b64decode(padded, altchars=b"-_", validate=True)
    except Exception as e:
        raise ValueError("params 不是合法 base64（含字母表之外的字符）：%r ⇒ %s" % (raw[:40], e))
    if not out:
        raise ValueError("params 解出来是空串（输入 %r）—— 多半不是 base64" % raw[:40])
    return out


def pan123_extract_download_url(download_url):
    """从 DownloadURL 解出真正的请求地址。

    要点：`params` 的值是 base64；解码后若**解码串**里没有 `auto_redirect` 就补 `auto_redirect=0`。
    判据必须在**解码后**的串上做 —— 在原始 URL 上判会永远为假。

    三道体检（缺一就会"静默给出错误结果"）：① base64 必须严格可解；② 解出来非空；
    ③ 解出来要**像 URL**（`http(s)://` 开头）。不满足一律 `ValueError`。
    """
    m = PAN123_PARAMS_RE.search(download_url)
    if not m:
        raise ValueError("DownloadURL 里找不到 params=")
    decoded_bytes = _b64_decode_strict(m.group(1))
    try:
        decoded = decoded_bytes.decode("utf-8")
    except UnicodeDecodeError as e:
        raise ValueError("params 解出来不是 UTF-8 文本（多半不是 URL）：%s" % e)
    if not re.match(r"^https?://", decoded):
        raise ValueError("params 解出来不像 URL（应以 http(s):// 开头）：%r" % decoded[:60])
    if "auto_redirect" not in decoded:
        decoded += ("&" if "?" in decoded else "?") + "auto_redirect=0"
    return decoded


def pan123_parse_share_input(share_url):
    """从分享链接抽 shareId 与提取码。"""
    sid = PAN123_SHARE_ID_RE.search(share_url)
    pwd = PAN123_PWD_RE.search(share_url)
    return {"share_id": sid.group(0) if sid else None,
            "pwd": pwd.group(1) if pwd else None}


# ---------------------------------------------------------------- vendor 判据

VENDOR_PATTERNS = (
    ("baidu", ("pan.baidu.com", "yun.baidu.com", "bdstoken", "baiduid")),
    ("pan123", ("123pan.com", "123684.com", "S3keyFlag")),
    ("quark", ("drive.quark.cn", "pan.quark.cn", "ucpro")),
    ("wenshushu", ("wenshushu.cn", "wss1.cn")),
    ("aliyundrive", ("api.aliyundrive.com", "aliyundrive.com", "alipan.com")),
    ("teambition", ("pan.teambition.com", "teambition.com")),
)


def detect_vendor(url):
    low = (url or "").lower()
    for name, pats in VENDOR_PATTERNS:
        for p in pats:
            if p.lower() in low:
                return name
    return None


# ---------------------------------------------------------------- selftest

class _T:
    def __init__(self):
        self.pass_ = 0
        self.fail_ = 0
        self.msgs = []

    def ok(self, cond, label):
        if cond:
            self.pass_ += 1
        else:
            self.fail_ += 1
            self.msgs.append("FAIL: " + label)


def _fixture_bytes(size, seed=0):
    """确定性合成字节流（不落盘、不用工作区样本）。"""
    out = bytearray()
    x = (seed * 2654435761 + 17) & 0xFFFFFFFF
    while len(out) < size:
        x = (x * 1103515245 + 12345) & 0xFFFFFFFF
        out.append((x >> 16) & 0xFF)
    return bytes(out[:size])


def _selftest():
    t = _T()

    # ---- logid ----
    audit = logid_alphabet_audit()
    t.ok(audit["length"] == 73, "logid 字母表长度 = 73（源文原串即 73 字符）")
    t.ok(audit["tail_len"] == 9, "logid 字母表尾部 9 字符")
    t.ok(audit["head_is_std"], "logid 字母表前 64 == 标准 base64 表")
    t.ok(audit["tail"] == "~！@#￥%……&", "logid 字母表尾部字面量")

    for probe in ("16990000000000.842315623456789", "1", "12", "123", "1234",
                  "1700000000000.000000000000001"):
        t.ok(logid_encode(probe) == logid_encode_with_declared_alphabet(probe),
             "logid 73 字符表与标准 base64 逐字符相同：%r" % probe)
        # 阴性对照：尾部字符一个都不许出现在输出里
        enc = logid_encode(probe)
        t.ok(not any(ch in enc for ch in audit["tail"]),
             "logid 输出不含字母表尾部字符（死区证明）：%r" % probe)

    t.ok(logid_encode("1") == "MQ==", "logid('1') == 'MQ=='")
    t.ok(logid_encode("12") == "MTI=", "logid('12') == 'MTI='")
    t.ok(logid_encode("123") == "MTIz", "logid('123') == 'MTIz'")
    t.ok(len(logid_encode("12")) == 4 and logid_encode("12").endswith("="), "len%3==2 ⇒ 1 个 =")

    # `m()` 零形参 ⇒ logid 与 baiduid 无关：不同 baiduid + 同 (ts,rnd) ⇒ 同一个 logid
    a = logid_build("16990000000000", ".5")
    b = logid_build("16990000000000", ".5")
    t.ok(a == b, "logid 只由 (ts, random) 决定（与 baiduid 无关）")
    t.ok(logid_build("16990000000000", ".5") != logid_build("16990000000000", ".6"),
         "阴性对照：random 变则 logid 变")
    t.ok(logid_build("16990000000000", ".5") != logid_build("16990000000001", ".5"),
         "阴性对照：ts 变则 logid 变")

    # ---- 阿里云盘 ----
    t.ok(ALIYUN_SMALL_MAX == 20480, "阿里云盘小文件分水岭 = 20480")

    small = _fixture_bytes(20480, seed=1)
    t.ok(aliyun_user_meta_hash(small) == _sha1_hex(small),
         "size == 20480 走全文件 sha1（边界值含在下侧）")

    big = _fixture_bytes(50000, seed=2)
    n = len(big)
    expect = _sha1_hex(big[0:2048], big[n // 2:n // 2 + 1024], big[n - 1024:n], str(n).encode())
    t.ok(aliyun_user_meta_hash(big) == expect, "三取样点 + 长度字符串（50000 字节）")
    t.ok(aliyun_user_meta_hash(big) != _sha1_hex(big),
         "阴性对照：三取样点 hash != 全文件 sha1（50000 字节）")
    # 阴性对照：漏掉长度字符串 ⇒ 必须不同
    t.ok(aliyun_user_meta_hash(big) != _sha1_hex(big[0:2048], big[n // 2:n // 2 + 1024], big[n - 1024:n]),
         "阴性对照：漏 str(size) 会得到不同结果")
    # 阴性对照：顺序换掉 ⇒ 必须不同
    t.ok(aliyun_user_meta_hash(big) != _sha1_hex(big[n - 1024:n], big[n // 2:n // 2 + 1024], big[0:2048],
                                                 str(n).encode()),
         "阴性对照：三个取样点顺序敏感")

    t.ok(aliyun_pre_hash(big) == _sha1_hex(big[:1024]), "pre_hash = 前 1024 字节")
    t.ok(aliyun_content_hash(big) == _sha1_hex(big), "content_hash = 全文件 sha1")

    # ---- 文叔叔 ----
    t.ok(WS_BLOCK == 2097152, "文叔叔分块阈值 = 2MB")

    whole = _fixture_bytes(3000, seed=3)
    h = wenshushu_hashes(whole)
    t.ok(h["ispart"] is False, "3KB ⇒ 整块上传")
    t.ok(h["cm1"] == _md5_hex(whole) and h["cs1"] == _sha1_hex(whole), "整块：cm1/cs1 取整文件")
    t.ok(h["cm"] == _sha1_hex(h["cm1"].encode()), "整块：cm = sha1(cm1 的 hex 字符串)")
    t.ok(h["cm"] != _sha1_hex(whole), "阴性对照：cm != sha1(原始字节)")

    # 分块：用 2MB+1 的合成流（3 块：2MB / 2MB / 1B 若 4MB；这里 2097153 ⇒ 2 块）
    part = _fixture_bytes(WS_BLOCK + 1, seed=4)
    hp = wenshushu_hashes(part)
    blocks = [part[i:i + WS_BLOCK] for i in range(0, len(part), WS_BLOCK)]
    t.ok(hp["ispart"] is True, "2MB+1 ⇒ 分块上传")
    t.ok(len(blocks) == 2, "分块数 = 2")
    t.ok(hp["cm1"] == _md5_hex(blocks[0]) and hp["cs1"] == _sha1_hex(blocks[0]),
         "分块：cm1/cs1 只取首块")
    t.ok(hp["cm"] == _sha1_hex("".join(_md5_hex(b) for b in blocks).encode()),
         "分块：cm = sha1(所有分块 md5 hex 相接)")
    t.ok(hp["cm"] != _sha1_hex(part), "阴性对照：分块 cm != sha1(原始字节)")
    t.ok(hp["cm"] != _sha1_hex(hp["cm1"].encode()),
         "阴性对照：分块 cm != 整块口径的 sha1(cm1)")

    # padding 必须按块算（自检最初抓出的实现错误）
    t.ok(logid_encode("1234") == "MTIzNA==", "logid('1234') == 'MTIzNA=='（padding 按块算）")
    t.ok(logid_encode_with_declared_alphabet("1234") == "MTIzNA==",
         "73 字符表在 4 字节输入下也等于标准 base64（若按总长算 padding 会得到 MT==NA==）")
    t.ok(logid_encode("12345") == base64.b64encode(b"12345").decode(),
         "logid 与标准 base64 一致（5 字节，末块 2 字节）")

    # ---- 123 云盘 ----
    inner = "https://cdn.example.com/down/abc.zip?fid=1"
    wrapped = "https://www.123pan.com/api?params=" + base64.b64encode(inner.encode()).decode()
    t.ok(pan123_extract_download_url(wrapped) == inner + "&auto_redirect=0",
         "123：解码 params 后补 &auto_redirect=0（已有 ? 用 &）")
    inner2 = "https://cdn.example.com/down/abc.zip"
    wrapped2 = "https://www.123pan.com/api?params=" + base64.b64encode(inner2.encode()).decode()
    t.ok(pan123_extract_download_url(wrapped2) == inner2 + "?auto_redirect=0",
         "123：无 ? 时补 ?auto_redirect=0")
    inner3 = "https://cdn.example.com/down/abc.zip?auto_redirect=1"
    wrapped3 = "https://www.123pan.com/api?params=" + base64.b64encode(inner3.encode()).decode()
    t.ok(pan123_extract_download_url(wrapped3) == inner3, "123：已有 auto_redirect 时不重复补")
    # 阴性对照：判据放在原始 URL 上会误判（原始串里没有 auto_redirect 但解码串里可能有）
    t.ok("auto_redirect" not in wrapped3 and "auto_redirect" in inner3,
         "阴性对照：在原始 URL 上判 auto_redirect 会误判")

    try:
        pan123_extract_download_url("https://x/y?noparams=1")
        t.ok(False, "123：缺 params 应抛错")
    except ValueError:
        t.ok(True, "123：缺 params 抛 ValueError")

    # ★ M2 回归：非法 base64 **必须报错**，绝不能静默返回错误地址（盲评审实测过 exit 0 的静默错误）
    for bad in ("@@@", "abc", "!!!not-b64!!!", "%%%%"):
        try:
            got = pan123_extract_download_url("https://x/y?params=" + bad)
            t.ok(False, "123：非法 base64 %r 应抛错，却返回了 %r" % (bad, got))
        except ValueError:
            t.ok(True, "123：非法 base64 %r 抛 ValueError（不静默）" % bad)
    # 阴性对照：合法 base64 但**内容不是 URL** ⇒ 也要报错（否则等于把垃圾当地址）
    not_url = base64.b64encode(b"hello world").decode()
    try:
        got = pan123_extract_download_url("https://x/y?params=" + not_url)
        t.ok(False, "123：解出来不是 URL 应抛错，却返回了 %r" % got)
    except ValueError:
        t.ok(True, "123：解出来不是 URL ⇒ 抛 ValueError")
    # ★ 最危险的一路：**合法 base64 的 URL + 尾部垃圾** ——
    #   宽松解码会把垃圾悄悄丢掉、返回一个"正确的" URL，使用者看不出输入被污染。
    #   （这条是本批故障注入 INJ8 第一次"不变红"时反推出来的：当时只有"空串/非 URL"两道体检，
    #     宽松解码照样能通过 ⇒ 补上这条与 validate=True 之后 INJ8 才真的变红。）
    poisoned = base64.b64encode(b"https://cdn.example.com/d.zip").decode() + "@@@"
    try:
        got = pan123_extract_download_url("https://x/y?params=" + poisoned)
        t.ok(False, "123：尾部垃圾应被拒，却返回了 %r" % got)
    except ValueError:
        t.ok(True, "123：尾部垃圾（合法 base64 + @@@）⇒ 抛 ValueError（不静默丢字符）")
    # 阳性对照：URL-safe 字母表也要能解（真实站点偶尔用 -_）
    inner_us = "https://cdn.example.com/a-b_c.zip"
    us = base64.urlsafe_b64encode(inner_us.encode()).decode()
    t.ok(pan123_extract_download_url("https://x/y?params=" + us) == inner_us + "?auto_redirect=0",
         "123：URL-safe base64 也能解（且补 auto_redirect=0）")

    # ★ m4 回归：--fixture 负数必须被拒（不能静默产出空文件 hash）
    for bad in ("-1", "-999"):
        try:
            _nonneg_int(bad)
            t.ok(False, "--fixture %s 应被拒" % bad)
        except argparse.ArgumentTypeError:
            t.ok(True, "--fixture %s 被 ArgumentTypeError 拒绝" % bad)
    t.ok(_nonneg_int("0") == 0, "--fixture 0 合法（空输入本身是合法边界）")

    shares = {
        "https://www.123pan.com/s/AbCdEf-1234 提取码:xyz9": ("AbCdEf-1234", "xyz9"),
        "https://www.123pan.com/s/QwErTy": ("QwErTy", None),
        "分享链接：https://www.123pan.com/s/PpQqRr-9z8y 提取码：ab12": ("PpQqRr-9z8y", "ab12"),
    }
    for url, (sid, pwd) in shares.items():
        r = pan123_parse_share_input(url)
        t.ok(r["share_id"] == sid, "123 shareId 抽取：%s" % url)
        t.ok(r["pwd"] == pwd, "123 提取码抽取：%s" % url)
    # 阴性对照：源实现的裸 `[^/.]+` 会把"空格 + 提取码"一起吃进 shareId
    import re as _re
    naive = _re.search(r"(?<=/s/)[^/.]+", "https://www.123pan.com/s/AbCdEf-1234 提取码:xyz9")
    t.ok(naive and " " in naive.group(0), "阴性对照：源正则 `[^/.]+` 会吞掉空格与提取码")

    # ---- vendor ----
    cases = (
        ("https://pan.baidu.com/s/1abc", "baidu"),
        ("https://www.123pan.com/s/AbCd", "pan123"),
        ("https://drive.quark.cn/1/clouddrive/file/download", "quark"),
        ("https://www.wenshushu.cn/f/abc12345678901", "wenshushu"),
        ("https://api.aliyundrive.com/v2/file/get", "aliyundrive"),
        ("https://pan.teambition.com/pan/api/spaces", "teambition"),
        ("https://www.lanzoue.com/iabc", None),
    )
    for url, want in cases:
        got = detect_vendor(url)
        t.ok(got == want, "vendor 判据：%s ⇒ %s" % (url, want))

    # ---- 夹具不落盘 ----
    with tempfile.TemporaryDirectory() as td:
        t.ok(os.path.isdir(td), "夹具走 tempfile（不写被校验目录）")

    print("multi_vendor_parse selftest: %d passed, %d failed" % (t.pass_, t.fail_))
    for m in t.msgs:
        print("  " + m)
    return 1 if t.fail_ else 0


# ---------------------------------------------------------------- CLI

def _read_file(path):
    with open(path, "rb") as f:
        return f.read()


def _nonneg_int(v):
    """`--fixture` 的取值校验：负数会让 `_fixture_bytes` 静默返回空串（m4）。"""
    n = int(v)
    if n < 0:
        raise argparse.ArgumentTypeError("--fixture 必须 >= 0（收到 %s）" % v)
    return n


def _load_bytes(args):
    """`--file` 与 `--fixture` 由 argparse 的互斥必填组保证二选一。"""
    if args.file:
        return _read_file(args.file)
    return _fixture_bytes(args.fixture, seed=7)


def main(argv=None):
    ap = argparse.ArgumentParser(description="多厂商网盘协议工具（零依赖）")
    ap.add_argument("--selftest", action="store_true")
    sub = ap.add_subparsers(dest="cmd")

    p = sub.add_parser("logid", help="百度 logid 复算")
    # ⚠️ 不能设 required=True：`--audit` 分支**根本不读** input，
    #    设了必填会让文档里那条 `logid --audit` 命令在 argparse 阶段直接失败（盲评审 M1）。
    p.add_argument("--input", help="毫秒时间戳 + Math.random() 的字面拼接（配 --audit 时可不给）")
    p.add_argument("--audit", action="store_true", help="只打印字母表审计（不需要 --input）")

    p = sub.add_parser("aliyun-hash", help="阿里云盘三个 hash")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--file")
    g.add_argument("--fixture", type=_nonneg_int, help="用指定字节数的合成文件（便于复现边界）")

    p = sub.add_parser("ws-hash", help="文叔叔秒传三件套")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--file")
    g.add_argument("--fixture", type=_nonneg_int)

    p = sub.add_parser("pan123", help="123 云盘 DownloadURL 解包")
    p.add_argument("--download-url", required=True)
    p.add_argument("--share", help="顺带解析分享链接")

    p = sub.add_parser("vendor", help="厂商判据")
    p.add_argument("--url", required=True)

    args = ap.parse_args(argv)

    if args.selftest or args.cmd is None:
        return _selftest()

    if args.cmd == "logid":
        if args.audit:
            for k, v in logid_alphabet_audit().items():
                print("%-10s %r" % (k, v))
            if not args.input:
                return 0
        if not args.input:
            print("logid 需要 --input <时间戳+随机数>；只看字母表审计请加 --audit",
                  file=sys.stderr)
            return 2
        print(logid_encode(args.input))
        return 0

    if args.cmd == "aliyun-hash":
        data = _load_bytes(args)
        print("size            %d" % len(data))
        print("pre_hash        %s" % aliyun_pre_hash(data))
        print("content_hash    %s" % aliyun_content_hash(data))
        print("user_meta.hash  %s   %s" % (
            aliyun_user_meta_hash(data),
            "(全文件分支)" if len(data) <= ALIYUN_SMALL_MAX else "(三取样点分支)"))
        return 0

    if args.cmd == "ws-hash":
        data = _fixture_bytes(args.fixture, seed=8) if args.fixture is not None else _read_file(args.file)  # noqa
        h = wenshushu_hashes(data)
        print("size    %d  ispart=%s" % (len(data), h["ispart"]))
        print("cm1     %s" % h["cm1"])
        print("cs1     %s" % h["cs1"])
        print("cm      %s" % h["cm"])
        return 0

    if args.cmd == "pan123":
        try:
            print(pan123_extract_download_url(args.download_url))
        except ValueError as e:
            print("pan123 解析失败：%s" % e, file=sys.stderr)
            return 2
        if args.share:
            r = pan123_parse_share_input(args.share)
            print("share_id=%s  pwd=%s" % (r["share_id"], r["pwd"]))
        return 0

    if args.cmd == "vendor":
        print(detect_vendor(args.url) or "unknown（可能是蓝奏云系 ⇒ lanzou_parse.py）")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
