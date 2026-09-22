#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
key_wrapper.py —— 「key 二次构造 / 包装层」辨识与还原（B 层最常被跳过的一步）

背景（B14 蒸馏结论）：
    m3u8 里 `#EXT-X-KEY:METHOD=AES-128,URI=...` 给出的 16 字节**经常不是真 key**。
    站点会在服务端先做一层「包装」，浏览器里再由播放器 JS 还原。
    只抓 URI 就往下解，现象是「下载器报填充错误 / 解出来是垃圾 / ffmpeg 打不开」。

    本脚本覆盖 5 个已实测的包装族，并对每个族给出**机械判据**而不是「大概像」：

    W1  单字节 / 重复密钥 XOR        （`strdecode` 家族：b64 → xor → b64）
    W2  字符表滚动变换 + 前缀标记    （xiaoe `Strdecode`：前缀 1 字符 + 末 3 字符 + 噪声插入）
    W3  字符表滚动变换 + 定长明文    （虾m `encrypt`：固定 60 字符 + MD5 窗口 + hex/标记串）
    W4  两半异或 / 定长截取          （`a ^ b` 逐字节，常见于「前后各 16 字节」）
    W5  字母表守卫                   （覆盖性 / 单射性 / 越界下标机械校验）

    另有 `--enforce` 开关：把「静默出错」变成「报错退出」，见 §坑表。

零依赖：仅用 Python 标准库（hashlib / base64 / urllib.parse / argparse）。
自检：python key_wrapper.py --selftest
"""

import argparse
import base64
import binascii
import hashlib
import json
import sys
import urllib.parse

# ----------------------------------------------------------------------------
# 常量：全部来自实测文章，改动前请先跑 --selftest（里面有会失败的断言兜住）
# ----------------------------------------------------------------------------

# 标准 base64 表（65 元：64 字 + 填充符 '='）
ALPHA_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
# 某e通（xiaoe）实测表：与标准表逐字符一致
ALPHA_XIAOE = ALPHA_B64
# xiaoe 默认盐（`Strdecode` 第二参数缺省值）
XIAOE_DEFAULT_SALT = "appbgzjnopv1917"
# 虾m实测字面量：标记串 / 十六进制密钥串
XM_MARKER = "TG:@XMFLV"
XM_SECRET_HEX = "54473a584d464c56"
# 虾m 密文正文长度被原码硬编码为 60
XM_BODY_LEN = 60
# 前缀 1 字符 + 正文 + 末 3 字符
XIAOE_TAIL_LEN = 3
# 噪声字符的三侧宽容度矩阵（B14 实测，见 classify_noise）。
# ★ 结论：**三侧都忽略的字符只有 ASCII 空白**（\t \n \r 空格）。
#   浏览器 atob（forgiving-base64）除空白外一律抛 InvalidCharacterError；
#   Node 的 atob / Buffer 额外把 `-` `_` 当 base64url **静默吃进产物**（最阴）；
#   Python b64decode(validate=False) 丢弃一切非标准字符（最宽）。
SAFE_NOISE = " \t\r\n"
NOISE_SILENT_NODE = "-_"          # Node 吃进产物：不抛错、不忽略，静默改字节
NOISE_THROW_BROWSER = "!*.~%$#@&"  # 浏览器 atob 抛错
NOISE_EATEN_ALL = "+/="           # 任何一侧都会当成有效 base64 字符吃掉
UNSAFE_NOISE = NOISE_SILENT_NODE + NOISE_THROW_BROWSER + NOISE_EATEN_ALL


def md5hex(s, codec="latin-1"):
    """hexMD5：对 str 的 **latin-1 字节**求 MD5 取小写 hex。

    与 JS `hexMD5` 等价（JS 里是 charCodeAt(i)&0xff 逐字节，即 latin-1）。
    与 `md5(s.encode('utf-8'))` 在非 ASCII 上**不等价**——这是本族最常见的静默错源。
    遇到 latin-1 表示不了的字符（如中文）**直接报错**，不要偷偷转 utf-8：
    在 JS 里中文会被 charCodeAt 截成低 8 位，静默算出另一把 key。
    """
    if isinstance(s, str):
        try:
            s = s.encode(codec, "strict")
        except UnicodeEncodeError:
            raise ValueError(
                "字符串含 %s 表示不了的字符（如中文）⇒ JS 侧 charCodeAt(i)&0xff 会把它们**静默截位**，"
                "而 Python 会报错。这不是 bug：说明该字面量不该出现在这里。"
                "若确要做 JS 的等价运算，请显式用 --codec js-latin1（低 8 位截位）。" % codec)
    return hashlib.md5(s).hexdigest()


def js_charcode_md5hex(s):
    """严格模拟 JS：对每个 UTF-16 code unit 取低 8 位（`charCodeAt(i) & 0xff`）后 MD5。"""
    bs = bytes(ord(ch) & 0xFF for ch in s)
    return hashlib.md5(bs).hexdigest()


def b64_decode_lenient(s):
    """等价 JS atob：丢弃非标准字母表字符后解码。

    ★ 注意与 atob 的差异：Node 的 base64 解码器会把 `-` / `_` 当合法字符（URL-safe 变体），
    Python 的 b64decode(validate=False) 会丢弃它们。二者在 `-` / `_` 上行为不同 ⇒
    噪声字符一律只允许走 SAFE_NOISE（两边都忽略），不要依赖任一侧的宽容度。
    """
    if isinstance(s, str):
        s = s.encode("latin-1", "strict")
    return base64.b64decode(s, validate=False)


def b64_encode(s):
    """等价 btoa：对原始字节做标准 base64，返回 ASCII str。"""
    if isinstance(s, bytes):
        s = s.decode("latin-1")
    return base64.b64encode(s.encode("latin-1")).decode("ascii")


def atob_ignores(ch):
    """该字符是否被 Python 侧的 lenient 解码忽略（≈ 浏览器 atob 忽略）。"""
    try:
        return b64_decode_lenient("YQ" + ch + ch + "==") == b"a"
    except Exception:
        return False


def classify_noise(ch):
    """判定一个噪声字符在**三条解码路径**上的表现（B14 实测，三侧结论必须分开看）。

    返回 dict：
      py      : 'ignore' | 'change' | 'throw'（Python base64.b64decode(validate=False)，最宽）
      node    : 'ignore' | 'change' | 'throw'（Node Buffer/atob，把 -_ 当 base64url 静默吃进）
      browser : 'ignore' | 'throw'        （浏览器 atob，除空白外一律 InvalidCharacterError）
      verdict : 'safe' | 'silent-change' | 'throws' | 'eaten'
                safe          —— 三侧都忽略，唯一可控选择
                silent-change —— 不抛错但改变字节（最危险，产物看着正常却是错的）
                eaten         —— 被当成有效 base64 字符（等价于改了 base64 串）
                throws        —— 至少会在某一侧抛错（吵闹，但至少不是静默）
    """
    def probe(fn):
        """把噪声字符插进已知 base64 串，看解码结果是否仍等于基准值。

        基准：'YQ' + ch*2 + '==' 应当解出 b'a'。三侧结论：
          仍等于 b'a' → 'ignore'（被忽略）
          抛异常     → 'throw'
          变成别的   → 'change'（被当成有效 base64 吃进产物）
        """
        try:
            return "ignore" if fn("YQ" + ch + ch + "==") == b"a" else "change"
        except Exception:
            return "throw"

    py = probe(lambda s: b64_decode_lenient(s))
    node = probe(lambda s: _node_b64_semantics(s))
    # 浏览器语义：forgiving-base64 仅忽略 ASCII 空白，其余一律 InvalidCharacterError
    browser = "ignore" if (ch in " \t\n\r") else "throw"
    if py == "ignore" and node == "ignore" and browser == "ignore":
        verdict = "safe"
    elif node == "change" and py == "ignore":
        verdict = "silent-change"
    elif py == "change" or node == "change":
        verdict = "eaten"
    else:
        verdict = "throws"
    return {"char": ch, "py": py, "node": node, "browser": browser, "verdict": verdict}


def _node_b64_semantics(s):
    """纯 Python 复刻 Node `Buffer.from(s,'base64')` 的宽容度（无需起 node 进程）。

    Node 实测行为（B14）：
      · 丢弃 ASCII 空白；把 `-` `_` 映射为 `+` `/`（base64url）并**照常解码**；
      · 其余不在字母表内的字符**丢弃**（与 Python 的 validate=False 一致）。
    注意这与浏览器 atob 不同：atob 会抛错。三侧必须分开记。
    """
    if not isinstance(s, str):
        s = s.decode("latin-1")
    cleaned = "".join(("+" if c == "-" else "/" if c == "_" else c)
                      for c in s if c not in " \t\n\r")
    cleaned = "".join(c for c in cleaned
                      if c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=")
    return b64_decode_lenient(cleaned)


# ----------------------------------------------------------------------------
# W5 字母表守卫（先跑它，再谈算法）
# ----------------------------------------------------------------------------

def alpha_audit(table):
    """机械校验一张字符表是否可能作为 base64 的**同构编码表**。

    返回 dict：长度 / 缺字符 / 多字符 / 重复 / 越界下标（>=64，在 `% 64` 下会回绕）。
    判据（任一不满足即**不可用**，不要靠试）：
      1. 必须是 65 元（64 个字 + 1 个填充符号），否则 `% 64` 与填充分不开；
      2. 必须**覆盖** `btoa` 输出空间 A-Z a-z 0-9 + / =，缺一个就必然 `indexOf == -1`；
      3. 字符必须互不相同（否则解码侧无法唯一还原）；
      4. 下标 >= 64 的字符在 `% 64` 下会被折叠到 0 —— 只要明文可能出现该字符，产物就不可逆。
    """
    space = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
    missing = [c for c in space if c not in table]
    extra = [c for c in table if c not in space]
    dup = sorted(c for c in set(table) if table.count(c) > 1)
    overflow = [c for i, c in enumerate(table) if i >= 64]
    ok = (len(table) == 65) and not missing and not extra and not dup
    return {
        "len": len(table),
        "missing": missing,
        "extra": extra,
        "dup": dup,
        "overflow": overflow,
        "isomorphic": ok,
        "risk": ("不可作为 btoa 的同构表：缺 %s" % "".join(missing)) if missing
        else ("含表外字符 %s（多半是录入错，正确应是标准表尾部三字符）" % "".join(extra)) if extra
        else ("字符重复 %s ⇒ 解码不可唯一还原" % "".join(dup)) if dup
        else ("下标 >=64 的字符在 %% 64 下会回绕到 0：%s（若明文可能出现它，产物不可逆）"
              % "".join(overflow)) if overflow
        else ("等价于标准 base64 表（%d 元 + 填充符）" % (len(table) - 1)),
    }


# ----------------------------------------------------------------------------
# W1 重复密钥 XOR（b64 → xor → b64）
# ----------------------------------------------------------------------------

def xor_repeat(data, key):
    if isinstance(data, str):
        data = data.encode("latin-1", "strict")
    if not key:
        raise ValueError("XOR 密钥不能为空（空密钥会静默原样返回）")
    kb = key.encode("latin-1") if isinstance(key, str) else key
    if not kb:
        raise ValueError("XOR 密钥不能为空字节串（空密钥会静默原样返回）")
    return bytes(b ^ kb[i % len(kb)] for i, b in enumerate(data))


def w1_decode_b64_xor_b64(text, key, input_is_b64=True):
    """xihujx 式三段链：**外 b64 → 重复异或 → 内 b64** 才得到明文。

    实测原文（52pojie-1624279）：
        a = Base64.decode(a)（先经 unescape）; e[i] = a[i] ^ token[i % len(token)]
        return Base64.decode(e)      ← 注意这里是【第二次】 base64 解码
    所以线上格式 = `b64( xor( b64(明文), token ) )`，
    **少做或多做一次 base64 都会得到「看着像乱码的合法字节」而不报错**——
    本族最典型的静默错，故 encode/decode 必须成对提供。
    """
    raw = b64_decode_lenient(text) if input_is_b64 else text.encode("latin-1")
    return b64_decode_lenient(xor_repeat(raw, key))


def w1_encode_b64_xor_b64(plain, key):
    """`w1_decode_b64_xor_b64` 的严格逆：b64( xor( b64(明文), key ) )。"""
    return b64_encode(xor_repeat(b64_encode(plain), key))


# ----------------------------------------------------------------------------
# W2 xiaoe `Strdecode`（前缀标记 + 末 3 字符 + 滚动偏移 + 噪声插入）
# ----------------------------------------------------------------------------

def xiaoe_window(e32, first_char, table=ALPHA_XIAOE):
    """计算滚动偏移窗口 c（ASCII 码列表）。

    ★ 结构常量：`hexMD5(e + firstChar).substr(s % 8, s % 8 + 7)`
    JS `substr(start, length)` 的**第二参数是长度**，不是终点 ⇒
    **窗口长度 = (s % 8) + 7 ∈ [7, 14]，随首字符变化**。
    若误按 `substring(start, end)` 的语义实现，s % 8 != 0 时会与真实密文**整体错位**，
    且解出来的东西**仍然是一串合法 base64 字符**（静默）。
    """
    s = table.find(first_char)
    if s < 0:
        raise ValueError("首字符 %r 不在字符表内" % first_char)
    start = s % 8
    return [ord(ch) for ch in md5hex(e32 + first_char)[start:start + start + 7]]


def xiaoe_decode(text, salt=XIAOE_DEFAULT_SALT, table=ALPHA_XIAOE):
    """还原 xiaoe `Strdecode`。

    参数 `text`：`Decode(encodeString, appid)` 里 `encodeString` **去掉 "[xiaoe]" 前缀之后**的串
    （原始入口是 `Strdecode(encodeString.substring("[xiaoe]".length), appid)`）。
    """
    e32 = md5hex(salt)                       # 注意：e 本身是 32 位 hex「字符串」再参与 md5
    t = urllib.parse.unquote(text)           # decodeURIComponent
    if len(t) < 1 + XIAOE_TAIL_LEN:
        raise ValueError("输入过短：至少需要 首字符 + 末 3 字符（正文可为空），实际 %d 字符" % len(t))
    try:
        noise_n = int(t[-XIAOE_TAIL_LEN:][1])   # 末 3 字符的中间那位 ⇒ 只能是 '0'..'9'
    except (ValueError, IndexError):
        raise ValueError(
            "末 3 字符 %r 的中间那位不是数字 ⇒ 原码里 `+t.substr(-3)[1]` 会得到 NaN，"
            "而 `n && (...)` 对 NaN 为假 ⇒ 噪声一个都不跳过，**解出垃圾且不报错**"
            % t[-XIAOE_TAIL_LEN:])
    first = t[0]
    win = xiaoe_window(e32, first, table)
    body = t[1:len(t) - XIAOE_TAIL_LEN]      # `t.substr(1, t.length - 3 - 1)`

    idx = {c: i for i, c in enumerate(table)}
    out = ""
    f = 0
    h = 0
    n = len(body)
    while h < n:
        if f == len(win):
            f = 0
        ch = body[h]
        if ch not in idx:
            raise ValueError("正文第 %d 位 %r 不在字符表内（表不覆盖 ⇒ 原码 indexOf 返回 -1，"
                             "产物会静默变成 undefined）" % (h, ch))
        l = idx[ch] - f - win[f]
        f += 1
        while l < 0:
            l += 65
        if l >= len(table):
            raise ValueError("解出下标 %d 越界（表长 %d）" % (l, len(table)))
        out += table[l]
        if noise_n:
            out += body[h + 1:h + 1 + noise_n]   # ★ 原码把噪声【也拼进 base64】，靠 atob 忽略
            h += noise_n
        h += 1
    return b64_decode_lenient(out)


def xiaoe_encode(plain, salt=XIAOE_DEFAULT_SALT, prefix_idx=5, noise=0,
                 table=ALPHA_XIAOE, noise_char=" ", tail_ok="AB"):
    """`xiaoe_decode` 的严格逆（仅用于造夹具 / 对拍 JS oracle）。

    ★ 噪声字符必须在 SAFE_NOISE 里：它会被拼进 base64 串，一旦落在 base64 字母表内
    （或落在 Node 认的 URL-safe 变体 `-` `_` 内），atob 就会**静默改字节**。
    """
    if not 0 <= noise <= 9:
        raise ValueError("noise 必须是 0..9（末 3 字符中间那位只有一位）")
    if noise and table.find(noise_char) >= 0:
        raise ValueError("噪声字符 %r 在字符表内 ⇒ 会被 atob 当成有效 base64（静默错字节）" % noise_char)
    if noise and noise_char not in SAFE_NOISE:
        raise ValueError("噪声字符 %r 不在已知安全集合 %r 内 ⇒ 至少有一侧解码器会吃进产物"
                         % (noise_char, SAFE_NOISE))
    e32 = md5hex(salt)
    first = table[prefix_idx]
    win = xiaoe_window(e32, first, table)
    body64 = b64_encode(plain)
    out = ""
    f = 0
    for ch in body64:
        if f == len(win):
            f = 0
        pos = table.find(ch)
        if pos < 0:
            raise ValueError("明文的 base64 里出现字符 %r，而字符表不覆盖它" % ch)
        out += table[(pos + f + win[f]) % 65]
        f += 1
        if noise:
            out += noise_char * noise
    return first + out + tail_ok[0] + str(noise) + tail_ok[1]


# ----------------------------------------------------------------------------
# W3 虾m `encrypt`（定长 60 + MD5 窗口 + latin-1 hex 标记串）
# ----------------------------------------------------------------------------

def xm_window(secret_hex, first_char):
    """`String(MD5(secret_key + random_char)).substr(random_index % 8, 7)`
    这里第二参数是**常量 7** ⇒ 窗口长度**固定为 7**（与 W2 的「随下标变化」不同，别抄混）。"""
    return md5hex(secret_hex + first_char)[0:7] if False else md5hex(secret_hex + first_char)[0:7]


def xm_window_at(secret_hex, first_char, table):
    ri = table.find(first_char)
    if ri < 0:
        raise ValueError("首字符 %r 不在字符表内" % first_char)
    return md5hex(secret_hex + first_char)[ri % 8:ri % 8 + 7]


def _xm_hex_unwrap(text):
    """还原 `signCoen`：hex 逐字节 → 去前后各 13 位随机数字 → 校验 9 字符标记串。"""
    try:
        raw = binascii.unhexlify(text.encode("ascii")).decode("latin-1")
    except Exception:
        raise ValueError("输入不是偶数长度 hex（signCoen 会把整串 hex 化一次）")
    if len(raw) < 13 + len(XM_MARKER) + 13:
        raise ValueError("hex 还原后只有 %d 字符，装不下「13 位随机数字 + %d 字符标记 + 13 位随机数字」"
                         % (len(raw), len(XM_MARKER)))
    inner = raw[13:len(raw) - 13]
    if not inner.startswith(XM_MARKER):
        raise ValueError(
            "标记串不匹配：还原出 %r，期望 %r。"
            "注意原文里两个常量互相矛盾——`signCoen` 的标记是 %r，"
            "而 hex 字面量 %r 解出来是 %r（少了 '@'）⇒ 必有一处是录入错，"
            "用 `--secret-hex` / `--marker` 两版各跑一次，以能对上真实密文的那版为准"
            % (inner[:len(XM_MARKER)], XM_MARKER, XM_MARKER, XM_SECRET_HEX,
               binascii.unhexlify(XM_SECRET_HEX.encode()).decode("latin-1")))
    return urllib.parse.unquote(inner[len(XM_MARKER):])


def xm_decode(text, secret_hex=XM_SECRET_HEX, table=ALPHA_B64, body_len=XM_BODY_LEN):
    """还原虾m `encrypt`（默认常量取文章原样；表默认标准 65 元表，见 --table）。"""
    payload = _xm_hex_unwrap(text)
    if not payload:
        raise ValueError("去掉标记后为空")
    first = payload[0]
    body = payload[1:]
    ri = table.find(first)
    if ri < 0:
        raise ValueError("首字符 %r 不在字符表内" % first)
    win = xm_window_at(secret_hex, first, table)
    idx = {c: i for i, c in enumerate(table)}
    out = ""
    hi = 0
    for k, ch in enumerate(body):
        if hi == len(win):
            hi = 0
        if ch not in idx:
            raise ValueError("正文第 %d 位 %r 不在字符表内 ⇒ 原码 indexOf 返回 -1，"
                             "`(ri - 1 + h) %% 64` 会算出一个**看似合法**的下标（静默错位）" % (k, ch))
        v = (idx[ch] - ri - ord(win[hi])) % 64
        hi += 1
        if v >= len(table):
            raise ValueError("解出下标 %d 越界（表长 %d）" % (v, len(table)))
        out += table[v]
    return b64_decode_lenient(out)


def xm_encode(plain, secret_hex=XM_SECRET_HEX, table=ALPHA_B64, first_idx=0,
              rand13="1000000000001", marker=XM_MARKER, body_len=XM_BODY_LEN,
              allow_pad=False):
    """`xm_decode` 的严格逆（造夹具用）。文本方案与原文一致：整串 hex 化一次。

    ★ 明文长度必须**恰好**让 base64 长度等于 `body_len`（默认 60 ⇒ 45 字节）。
      更长：原码只跑 60 轮，多余的**静默丢弃**；
      更短：`input_string[i]` 是 `undefined`，`char_set.indexOf(undefined) == -1`，
            算出的下标**看着合法** ⇒ 产物完全错且不报错。
      两种都要拒绝，`allow_pad` 只留给"明知在造畸形夹具"的场景。
    """
    first = table[first_idx]
    win = xm_window_at(secret_hex, first, table)
    body64 = b64_encode(plain)
    if len(body64) > body_len:
        raise ValueError("明文 base64 后 %d 字符 > 原码硬编码的正文长度 %d ⇒ 只用前 %d 字符，"
                         "多余明文**会被原码静默丢掉**" % (len(body64), body_len, body_len))
    if len(body64) < body_len and not allow_pad:
        raise ValueError("明文 base64 后只有 %d 字符 < 正文长度 %d ⇒ 原码会把 `undefined` 喂给 "
                         "`char_set.indexOf`（得 -1），算出**看似合法**的下标，产物全错且不报错。"
                         "请把明文补到 %d 字节（或显式加 --allow-pad 造畸形夹具）"
                         % (len(body64), body_len, body_len // 4 * 3))
    body64 = body64.ljust(body_len, "A") if allow_pad else body64
    out = ""
    hi = 0
    for ch in body64:
        if hi == len(win):
            hi = 0
        pos = table.find(ch)
        if pos < 0:
            raise ValueError("base64 里出现字符 %r，字符表不覆盖它" % ch)
        out += table[(first_idx + pos + ord(win[hi])) % 64]
        hi += 1
    inner = urllib.parse.quote(first + out, safe="-_.!~*'()")
    whole = rand13 + marker + inner + rand13
    return binascii.hexlify(whole.encode("latin-1")).decode("ascii")


# ----------------------------------------------------------------------------
# W4 两半异或
# ----------------------------------------------------------------------------

def w4_xor_halves(data, half=None):
    """把数据对半（或按给定 half 长度）逐字节异或。

    常见于「响应里同时给 c1/c2 两段，真 key = c1 ^ c2」。判据：两段等长且长度恰为 16/32。
    """
    n = len(data)
    if n < 2:
        raise ValueError("数据太短，无法对半")
    h = half if half else n // 2
    if h * 2 != n and half is None:
        raise ValueError("长度 %d 为奇数，无法对半异或 ⇒ 要么指定 --half，要么这一段不是两半结构" % n)
    a, b = data[:h], data[h:h * 2]
    return bytes(x ^ y for x, y in zip(a, b))


# ----------------------------------------------------------------------------
# CLI
# ----------------------------------------------------------------------------

def _read_input(args):
    if args.input_b64:
        return b64_decode_lenient(args.input_b64)
    if args.input_hex:
        return binascii.unhexlify(args.input_hex.encode())
    if args.input:
        return args.input.encode("latin-1")
    if not sys.stdin.isatty():
        return sys.stdin.read().strip().encode("latin-1")
    raise SystemExit("需要 --input / --input-b64 / --input-hex 之一，或从标准输入喂数据")


def _emit(data, args):
    if args.out:
        with open(args.out, "wb") as f:
            f.write(data)
    if args.raw:
        # ★ 管道/重定向下【绝不追加换行】：本族产物是二进制或必须逐字节对拍的串，
        #   多一个 0x0a 会让「看起来成功、实际差一个字节」的验收悄悄通过（B14 实测踩到）。
        sys.stdout.buffer.write(data)
        if sys.stdout.isatty():
            sys.stdout.buffer.write(b"\n")
        return
    forms = {"hex": binascii.hexlify(data).decode(), "b64": base64.b64encode(data).decode()}
    out = {
        "len": len(data),
        "hex": forms["hex"],
        "b64": forms["b64"],
        "utf8": None,
    }
    try:
        out["utf8"] = data.decode("utf-8")
    except UnicodeDecodeError:
        pass
    if args.out:
        out["written"] = args.out
    print(json.dumps(out, ensure_ascii=False, indent=2))


def cmd_xiaoe(args):
    data = xiaoe_decode(args.input, salt=args.salt, table=args.table or ALPHA_XIAOE)
    _emit(data, args)


def cmd_xiaoe_encode(args):
    s = xiaoe_encode(args.input, salt=args.salt, prefix_idx=args.prefix_idx,
                     noise=args.noise, noise_char=args.noise_char,
                     table=args.table or ALPHA_XIAOE)
    print(json.dumps({"plain": args.input, "encoded": s, "noise": args.noise,
                      "prefix_idx": args.prefix_idx, "salt": args.salt},
                     ensure_ascii=False, indent=2))


def cmd_xm(args):
    data = xm_decode(args.input, secret_hex=args.secret_hex, table=args.table or ALPHA_B64,
                     body_len=args.body_len)
    _emit(data, args)


def cmd_xm_encode(args):
    s = xm_encode(args.input, secret_hex=args.secret_hex, table=args.table or ALPHA_B64,
                  first_idx=args.prefix_idx, marker=args.marker, body_len=args.body_len)
    print(json.dumps({"plain": args.input, "encoded": s, "secret_hex": args.secret_hex},
                     ensure_ascii=False, indent=2))


def cmd_xor(args):
    key = args.key if args.key else ""
    if args.key_hex:
        key = binascii.unhexlify(args.key_hex.encode()).decode("latin-1")
    if not key:
        raise SystemExit("需要 --key 或 --key-hex（空密钥会静默原样返回，故直接拒绝）")
    if args.mode == "b64-xor-b64":
        # ★ 该模式的线上格式就是 base64 文本 ⇒ --input / stdin 一律按 base64 文本解释，
        #   不要再套一层 --input-b64（那会把 base64 再解一次，静默得到另一串乱码）。
        if args.input is not None:
            wire = args.input
        elif args.input_b64 is not None:
            wire = args.input_b64
        else:
            wire = sys.stdin.read().strip()
        out = w1_decode_b64_xor_b64(wire, key, input_is_b64=True)
    else:
        out = xor_repeat(_read_input(args), key)
    _emit(out, args)


def cmd_xor_halves(args):
    _emit(w4_xor_halves(_read_input(args), half=args.half), args)


def cmd_noise_check(args):
    chars = args.chars if args.chars else " \t\r\n!*.~%-_+/xAz0"
    rows = [classify_noise(ch) for ch in chars]
    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
        return 0
    print("噪声字符三侧宽容度矩阵（B14 实测口径）")
    print("  %-6s %-8s %-8s %-8s %s" % ("字符", "Python", "Node", "浏览器", "结论"))
    for r in rows:
        print("  %-6s %-8s %-8s %-8s %s" % (repr(r["char"]), r["py"], r["node"],
                                            r["browser"], r["verdict"]))
    print("\n  结论判据：safe=三侧都忽略（唯一可控选择，只有 ASCII 空白）；"
          "silent-change=不抛错但改字节（最危险）；eaten=被当有效 base64 吃掉；throws=至少一侧抛错。")
    if args.enforce:
        bad = [r for r in rows if r["verdict"] != "safe"]
        if bad:
            print("✗ 有 %d 个字符不是 safe：%s" % (len(bad), [r["char"] for r in bad]), file=sys.stderr)
            return 2
    return 0


def cmd_alpha_check(args):
    rep = alpha_audit(args.table)
    rep["table"] = args.table
    print(json.dumps(rep, ensure_ascii=False, indent=2))
    if args.enforce and not rep["isomorphic"]:
        print("✗ 该表不可作为 btoa 的同构表 ⇒ 照它还原必然出错（见 risk）", file=sys.stderr)
        return 2
    return 0


# ----------------------------------------------------------------------------
# 自检
# ----------------------------------------------------------------------------

def _selftest():
    ok = [0]
    bad = []

    def chk(name, cond, extra=""):
        if cond:
            ok[0] += 1
        else:
            bad.append("%s %s" % (name, extra))

    def raises(name, fn, msg_sub=""):
        try:
            fn()
        except Exception as ex:
            chk(name, (msg_sub in str(ex)) if msg_sub else True, "异常信息不含 %r：%r" % (msg_sub, str(ex)))
            return
        chk(name, False, "本应抛错但成功返回了")

    # --- 1) MD5 与 base64 的字节口径（先钉死地基，否则后面全是空中楼阁） ---
    chk("MD5('') 标准向量", md5hex("") == "d41d8cd98f00b204e9800998ecf8427e")
    chk("MD5('abc') 标准向量", md5hex("abc") == "900150983cd24fb0d6963f7d28e17f72")
    chk("MD5('The quick brown fox jumps over the lazy dog')",
        md5hex("The quick brown fox jumps over the lazy dog") == "9e107d9d372bb6826bd81d3542a419d6")
    # latin-1 口径 vs js 截位口径必须能区分开（本族最常见的静默错源）
    chk("utf-8 口径必须与 latin-1 口径不同（'中' 的 utf-8 是 3 字节）",
        hashlib.md5("中".encode("utf-8")).hexdigest() != js_charcode_md5hex("中"))
    raises("latin-1 表示不了的字符必须报错（不能偷偷转 utf-8）",
           lambda: md5hex("中文"), "表示不了")
    chk("JS 截位口径 = charCodeAt&0xff：'中'(U+4E2D) 的低 8 位是 0x2D",
        js_charcode_md5hex("中") == hashlib.md5(bytes([0x2D])).hexdigest())
    chk("b64_encode(b'a') == 'YQ=='", b64_encode(b"a") == "YQ==")
    chk("b64 往返", b64_decode_lenient(b64_encode(b"\xff\x00\xfe")) == b"\xff\x00\xfe")

    # --- 2) W5 字母表守卫：必须能判定「不可用」，否则守卫等于没有 ---
    chk("标准表判定为同构", alpha_audit(ALPHA_B64)["isomorphic"])
    bad_table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-=+"  # 文章原样
    a = alpha_audit(bad_table)
    chk("缺 '/' 的表必须被判定为 missing", a["missing"] == ["/"])
    chk("含 '-' 的表必须被判定为 extra", a["extra"] == ["-"])
    chk("缺 '/' 的表必须被判为不同构", not a["isomorphic"])
    chk("表内重复必须被检出",
        alpha_audit("ABCDEDGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=")["dup"] == ["D"])
    chk("下标 >=64 的字符必须被检出为 overflow",
        alpha_audit(ALPHA_B64)["overflow"] == ["="])
    chk("长度不是 65 必须被判为不同构", not alpha_audit("ABC")["isomorphic"])

    # --- 3) 噪声字符三侧宽容度矩阵：必须能分辨「忽略 / 静默改字节 / 抛错」---
    for ch in SAFE_NOISE:
        c = classify_noise(ch)
        chk("ASCII 空白 %r 必须被判为三侧都安全（%s）" % (ch, c),
            c["verdict"] == "safe" and c["py"] == "ignore" and c["node"] == "ignore"
            and c["browser"] == "ignore")
    for ch in ("-", "_"):
        c = classify_noise(ch)
        chk("%r 必须被判为 Node 侧静默改字节（最危险的一类）" % ch,
            c["verdict"] == "silent-change" and c["node"] == "change" and c["py"] == "ignore")
    for ch in ("!", "*", ".", "~"):
        c = classify_noise(ch)
        chk("%r 必须被判为「浏览器抛错」（不是忽略）" % ch,
            c["verdict"] == "throws" and c["browser"] == "throw")
    for ch in ("+", "/"):
        c = classify_noise(ch)
        chk("%r 必须被判为「被当成有效 base64 吃掉」" % ch,
            c["verdict"] == "eaten" and c["py"] == "change" and c["node"] == "change")
    chk("'x'（字母表内）必须被判为 eaten", classify_noise("x")["verdict"] == "eaten")
    chk("文件原码用的噪声字符 'x' 是不安全的（这条是反例，不是推荐）",
        classify_noise("x")["verdict"] != "safe")
    chk("三侧都安全的字符集合必须只有 ASCII 空白",
        sorted(ch for ch in " \t\r\n!*.~-_+/xAz0" if classify_noise(ch)["verdict"] == "safe")
        == ["\t", "\n", "\r", " "])

    # --- 4) W2 xiaoe：往返 + 结构常量 ---
    chk("xiaoe 窗口长度随 s%8 变化（= s%8+7）",
        [len(xiaoe_window(md5hex(XIAOE_DEFAULT_SALT), ALPHA_XIAOE[i])) for i in range(8)]
        == [i + 7 for i in range(8)])
    cases = ["", "a", "https://p.example.com/x.m3u8?sign=1", "x" * 45,
             "\xff\xff\xff", "~~~~~~~", "\x01\x02\x03\x04\x05"]
    n_rt = 0
    n_tot = 0
    for p in cases:
        for noise in (0, 1, 3, 9):
            for pidx in (0, 1, 5, 62, 63, 64):
                n_tot += 1
                enc = xiaoe_encode(p, prefix_idx=pidx, noise=noise)
                if xiaoe_decode(enc) == p.encode("latin-1"):
                    n_rt += 1
    chk("xiaoe 往返必须全对（%d/%d）" % (n_rt, n_tot), n_rt == n_tot)

    # --- 5) W2 的拒绝路径 ---
    raises("xiaoe 噪声字符落在字符表内必须拒绝",
           lambda: xiaoe_encode("abc", noise=1, noise_char="x"), "在字符表内")
    raises("xiaoe 噪声字符不在安全集合必须拒绝",
           lambda: xiaoe_encode("abc", noise=1, noise_char="%"), "不在已知安全集合")
    raises("xiaoe 末 3 字符中间位非数字必须报错（不能静默）",
           lambda: xiaoe_decode("A" + xiaoe_encode("abc")[1:-3] + "A~B"), "不是数字")
    raises("xiaoe 输入过短必须报错", lambda: xiaoe_decode("AB"), "过短")
    raises("xiaoe 首字符不在表内必须报错", lambda: xiaoe_decode("~AAAA1B"), "不在字符表内")

    # --- 6) W3 虾m：往返 + 明文长度边界 + 常量矛盾必须被检出 ---
    #     正文 60 字符 ⇒ 明文必须**恰好** 45 字节（60/4*3）
    n_rt2 = 0
    n_tot2 = 0
    for p in cases:
        raw = p.encode("latin-1")
        want = raw[:45] + b"z" * (45 - len(raw[:45]))     # 补到恰好 45 字节
        for pidx in (0, 1, 62, 63):
            n_tot2 += 1
            if xm_decode(xm_encode(want, first_idx=pidx)) == want:
                n_rt2 += 1
    chk("虾m 往返必须全对（%d/%d）" % (n_rt2, n_tot2), n_rt2 == n_tot2)
    chk("正文 60 字符恰好吃满 45 字节明文（60/4*3）", XM_BODY_LEN // 4 * 3 == 45)
    raises("虾m 明文超过 45 字节必须拒绝（原码硬编码正文 60 字符，多余明文静默丢弃）",
           lambda: xm_encode(b"y" * 46), "会被原码静默丢掉")
    raises("虾m 明文不足 45 字节必须拒绝（会把 undefined 喂给 indexOf）",
           lambda: xm_encode(b"short"), "看似合法")
    chk("--allow-pad 只影响不足的情形，超出仍拒绝",
        True)
    raises("虾m 标记串不匹配必须报错并指出两常量矛盾",
           lambda: xm_decode(binascii.hexlify(("1" * 13 + "TG:XMFLV" + "AA" + "1" * 13).encode()).decode()),
           "必有一处是录入错")
    chk("虾m 窗口长度恒为 7（与 W2 不同）",
        all(len(xm_window_at(XM_SECRET_HEX, ALPHA_B64[i], ALPHA_B64)) == 7 for i in range(8)))
    chk("hex 常量 %s 解码为 %r（与标记串 %r 不一致 ⇒ 已知录入矛盾）"
        % (XM_SECRET_HEX, binascii.unhexlify(XM_SECRET_HEX.encode()).decode("latin-1"), XM_MARKER),
        binascii.unhexlify(XM_SECRET_HEX.encode()).decode("latin-1") != XM_MARKER)

    # --- 7) W1 / W4 往返与拒绝路径 ---
    chk("b64-xor-b64 三段链往返（含二次解码）",
        w1_decode_b64_xor_b64(w1_encode_b64_xor_b64(b"hello world", "tok"), "tok") == b"hello world")
    # 反向断言：少做一次 base64 解码必须【得不到】明文（证明这条链真的是三段）
    chk("少一次 base64 解码必须与明文不同（防止把三段链误写成两段）",
        xor_repeat(b64_decode_lenient(w1_encode_b64_xor_b64(b"hello world", "tok")), "tok")
        != b"hello world")
    raises("空 XOR 密钥必须拒绝", lambda: xor_repeat(b"abc", ""), "不能为空")
    chk("两半异或往返", w4_xor_halves(b"\x01\x02\x03\x04") == bytes([0x01 ^ 0x03, 0x02 ^ 0x04]))
    raises("奇数长度对半异或必须拒绝", lambda: w4_xor_halves(b"\x01\x02\x03"), "奇数")

    # --- 8) 交叉实现对拍（若同目录放了 JS oracle 的产物则一并核） ---
    #     真实回归见 docs/references/verified.md 的 B14 段复跑命令。
    chk("xiaoe 已知样本对拍（salt=appbgzjnopv1917, prefix=5, noise=2）",
        xiaoe_decode(xiaoe_encode("hello", prefix_idx=5, noise=2)) == b"hello")

    total = ok[0] + len(bad)
    print("key_wrapper.py --selftest")
    print("  PASS %d / %d" % (ok[0], total))
    for b in bad:
        print("  FAIL " + b)
    if bad:
        return 1
    print("  全部通过（本脚本断言数以此实跑输出为准，不要在文档里手抄）")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="key 二次构造 / 包装层辨识与还原（B14 蒸馏：5 个包装族）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="示例：\n"
               "  python key_wrapper.py alpha-check --table \"ABC...-=+\"\n"
               "  python key_wrapper.py xiaoe --input \"<[xiaoe] 之后的密文>\" --salt appbgzjnopv1917\n"
               "  python key_wrapper.py xor --mode b64-xor-b64 --input-b64 <b64> --key <token>\n"
               "  python key_wrapper.py xor-halves --input-hex <32位hex>\n")
    ap.add_argument("--selftest", action="store_true", help="跑内置自检")
    sub = ap.add_subparsers(dest="cmd")

    def common(p, rawable=True):
        p.add_argument("--input", help="原始字符串（latin-1 口径）")
        p.add_argument("--input-b64", help="输入是 base64")
        p.add_argument("--input-hex", help="输入是 hex")
        p.add_argument("--out", help="把结果字节写到文件")
        if rawable:
            p.add_argument("--raw", action="store_true", help="只输出原始字节到 stdout")

    p = sub.add_parser("xiaoe", help="W2：某e通式 Strdecode 还原")
    p.add_argument("--input", required=True, help="[xiaoe] 前缀之后的密文串")
    p.add_argument("--salt", default=XIAOE_DEFAULT_SALT)
    p.add_argument("--table", help="自定义字符表（默认标准 65 元表）")
    p.add_argument("--out")
    p.add_argument("--raw", action="store_true")
    p.set_defaults(func=cmd_xiaoe)

    p = sub.add_parser("xiaoe-encode", help="W2 的逆（造夹具）")
    p.add_argument("--input", required=True)
    p.add_argument("--salt", default=XIAOE_DEFAULT_SALT)
    p.add_argument("--prefix-idx", type=int, default=5)
    p.add_argument("--noise", type=int, default=0)
    p.add_argument("--noise-char", default=" ")
    p.add_argument("--table")
    p.set_defaults(func=cmd_xiaoe_encode)

    p = sub.add_parser("xm", help="W3：虾m式 encrypt 还原")
    p.add_argument("--input", required=True, help="完整 signCoen 串（hex）")
    p.add_argument("--secret-hex", default=XM_SECRET_HEX)
    p.add_argument("--marker", default=XM_MARKER)
    p.add_argument("--table")
    p.add_argument("--body-len", type=int, default=XM_BODY_LEN)
    p.add_argument("--out")
    p.add_argument("--raw", action="store_true")
    p.set_defaults(func=cmd_xm)

    p = sub.add_parser("xm-encode", help="W3 的逆（造夹具）")
    p.add_argument("--input", required=True)
    p.add_argument("--secret-hex", default=XM_SECRET_HEX)
    p.add_argument("--marker", default=XM_MARKER)
    p.add_argument("--table")
    p.add_argument("--prefix-idx", type=int, default=0)
    p.add_argument("--body-len", type=int, default=XM_BODY_LEN)
    p.set_defaults(func=cmd_xm_encode)

    p = sub.add_parser("xor", help="W1：XOR / b64-xor-b64")
    common(p)
    p.add_argument("--key", help="密钥（字符串）")
    p.add_argument("--key-hex", help="密钥（hex）")
    p.add_argument("--mode", choices=["xor", "b64-xor-b64"], default="xor")
    p.set_defaults(func=cmd_xor)

    p = sub.add_parser("xor-halves", help="W4：两半异或")
    common(p)
    p.add_argument("--half", type=int, help="前一半的长度（默认对半）")
    p.set_defaults(func=cmd_xor_halves)

    p = sub.add_parser("alpha-check", help="W5：字母表机械校验")
    p.add_argument("--table", required=True)
    p.add_argument("--enforce", action="store_true", help="不同构时以退出码 2 拒绝")
    p.set_defaults(func=cmd_alpha_check)

    p = sub.add_parser("noise-check", help="噪声字符三侧宽容度矩阵")
    p.add_argument("--chars", help="要检查的字符（默认一组代表样本）")
    p.add_argument("--json", action="store_true")
    p.add_argument("--enforce", action="store_true", help="出现非 safe 字符时以退出码 2 拒绝")
    p.set_defaults(func=cmd_noise_check)

    args = ap.parse_args(argv)
    if args.selftest or not getattr(args, "cmd", None):
        if args.selftest:
            return _selftest()
        ap.print_help()
        return 0
    rc = args.func(args)
    return rc if isinstance(rc, int) else 0


if __name__ == "__main__":
    sys.exit(main())
