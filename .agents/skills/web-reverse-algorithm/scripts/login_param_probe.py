#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
login_param_probe.py —— 登录 / 账号体系「提交参数」取证与还原（零依赖）

配套文档：`references/12-login-and-account-params.md`（唯一权威源）
本脚本只做「**判族 + 取证 + 复算**」，不重复实现 AES/SM4
（那两个在 `../../stream-drm-reverse/scripts/media_crypto.py`，带 NIST / 国标向量自检）。

子命令
------
  classify      密文形态 → 加密族判据（含「base64 解出来是乱码 ⇒ 内层是分组密码」这条关键分岔）
  b64-probe     base64 解码后的载荷体检（明文 / gzip / 分组密码密文 / 疑似 RSA）
  md5-chain     实测的四种 MD5 链形态复算（含 `charCodeAt & 0xff` 口径开关）
  rsa-pubkey    纯 Python 解析 RSA 公钥（PEM / JSEncrypt base64 / 裸 DER hex）→ n、e
                并可与接口下发的 `publickey_mod` / `publickey_exp` 逐值对拍
  des           纯 Python DES / 3DES（ECB / CBC，pkcs7 / zero / none 填充）
                —— 本仓库此前**没有 DES**，登录簇里 `b64(des_encode(params))` 是常见形态
  --selftest    全部自检（含失败分支与「区分性断言」）

设计口径（与 B8 / B12 / B13 / B14 教训一致）
  - 凡是「不报错但结果错」的路径，一律**显式报错退出**（exit 2），不静默兜底
  - 所有标准向量来自**独立实现**：MD5 用 RFC 1321；DES 用 OpenSSL（`--openssl-legacy-provider`）
  - `--selftest` 里的「断言条数」以实跑输出为准，不要在文档里手抄
"""

import argparse
import base64
import binascii
import gzip
import hashlib
import json
import os
import re
import sys
import zlib

# --------------------------------------------------------------------------
# 通用工具
# --------------------------------------------------------------------------

HEX_RE = re.compile(r'^[0-9a-fA-F]+$')
B64_RE = re.compile(r'^[A-Za-z0-9+/]+={0,2}$')
B64URL_RE = re.compile(r'^[A-Za-z0-9_-]+={0,2}$')

# latin-1 可打印（含常见空白），用于判「base64 解出来是不是文本」
_PRINTABLE = set(range(0x20, 0x7F)) | {0x09, 0x0A, 0x0D}


class ProbeError(Exception):
    """可读的失败（一律以 exit 2 抛出，不静默兜底）"""


def die(msg):
    sys.stderr.write('错误：%s\n' % msg)
    sys.exit(2)


def latin1_bytes(s):
    """复现 JS 的 `charCodeAt(i) & 0xff`：非 Latin-1 字符按低 8 位截断。

    这条口径**必须**显式建模：`CryptoJS.MD5(str)` 走 UTF-8，而手写 `hex_md5` 走 `& 0xff`，
    同一个字符串在两种实现下**算出完全不同的哈希**（B14 `../../stream-drm-reverse/references/key-wrapper-families.md` §7 同源坑）。
    """
    return bytes(ord(c) & 0xFF for c in s)


def utf8_bytes(s):
    return s.encode('utf-8')


def entropy(b):
    """香农熵（bit/byte）。长度 0 时返回 0.0。"""
    if not b:
        return 0.0
    from math import log2
    freq = {}
    for x in b:
        freq[x] = freq.get(x, 0) + 1
    n = len(b)
    return -sum((c / n) * log2(c / n) for c in freq.values())


def printable_ratio(b):
    if not b:
        return 0.0
    return sum(1 for x in b if x in _PRINTABLE) / len(b)


def _is_utf8(b):
    try:
        b.decode('utf-8')
        return True
    except UnicodeDecodeError:
        return False


def b64_decode_forgiving(s):
    """宽容 base64 解码（等价 Python 的 validate=False / JS 的 forgiving-base64 子集）。

    返回 (bytes, 被忽略的非法字符列表)。**不抛异常**是本意，因为「宽容度」本身就是判据的一部分
    （见 `../../stream-drm-reverse/references/key-wrapper-families.md` §4.2 三侧宽容度矩阵）；
    但**长度不合法（数据字符数 ≡ 1 mod 4）必须显式报错** —— 那种输入无论怎么补都解不出原文，
    静默产出垃圾字节比报错危险得多（B12 / B14 教训）。
    """
    ignored = [c for c in s if c not in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=_- \t\r\n']
    kept = re.sub(r'[^A-Za-z0-9+/=]', '', s)
    data = kept.rstrip('=')
    m = len(data) % 4
    if m == 1:
        raise ProbeError('base64 数据字符数 %d ≡ 1 (mod 4)：**至少缺 3 个字符**，'
                         '无论怎么补位都解不出原文（多半是复制/抓包时被截断或含换行）' % len(data))
    cleaned = data + '=' * ((4 - m) % 4)
    try:
        return base64.b64decode(cleaned), ignored
    except binascii.Error as e:
        raise ProbeError('base64 解码失败：%s（数据字符 %d，补位后 %d）' % (e, len(data), len(cleaned)))


def hexdump(b, limit=64):
    out = []
    for i in range(0, min(len(b), limit), 16):
        chunk = b[i:i + 16]
        hx = ' '.join('%02x' % x for x in chunk)
        asc = ''.join(chr(x) if x in _PRINTABLE else '.' for x in chunk)
        out.append('%08x  %-47s  %s' % (i, hx, asc))
    if len(b) > limit:
        out.append('... (共 %d 字节，仅示前 %d)' % (len(b), limit))
    return '\n'.join(out)


# --------------------------------------------------------------------------
# 1) classify —— 密文形态 → 加密族
# --------------------------------------------------------------------------

def classify(cipher, raw=False):
    """返回 {'family':..., 'confidence':..., 'reason':..., 'next':...} 的候选列表。"""
    s = cipher.strip()
    if not s:
        raise ProbeError('输入为空')
    cands = []

    def add(family, conf, reason, nxt):
        cands.append({'family': family, 'confidence': conf, 'reason': reason, 'next': nxt})

    # ---- hex 形态
    if HEX_RE.match(s):
        n = len(s)
        if n == 32:
            add('md5-hex32', 'high',
                '32 位 hex：MD5 的长度特征（也可能是 md5 链的**外层**结果，链本身不影响形态）',
                '用 md5-chain 逐个试四种实测形态；不要只看长度就断言「就是裸 md5」')
        elif n == 40:
            add('sha1-hex40', 'high', '40 位 hex：SHA-1', '确认站点用的是 SHA-1 而不是 MD5')
        elif n == 64:
            add('sha256-hex64', 'high', '64 位 hex：SHA-256', '确认盐与拼接顺序')
        elif n % 16 == 0:
            add('hex-blob', 'medium',
                '全 hex 且长度是 16 的倍数（%d 字符 = %d 字节）：可能是 hex(分组密码密文)，'
                '也可能是 hex(随机字节串 / 拼接串)' % (n, n // 2),
                '先 rsa-pubkey/接口确认有没有非对称；否则按字节处理（不要当字符串）')
        else:
            add('hex-blob', 'low', '全 hex 但长度不是 32/40/64 也不是 16 的倍数：可能是拼接串',
                '搜 JS 里拼这个串的那一行')
        if n >= 32:
            add('base64-of-hex?', 'low',
                '也检查一下：把这段 hex 当成「明文的 hex 表示」解回去看是不是可打印文本',
                'b64-probe 不适用；直接 bytes.fromhex 看内容')
        return cands

    # ---- URL 编码（不是加密）
    if '%' in s and re.search(r'%[0-9a-fA-F]{2}', s):
        add('url-encoded', 'medium',
            '含 %XX：这是**编码**不是加密（常见于 `su = base64(encodeURIComponent(手机号))` 这类）',
            '先 unquote 再看；不要把编码层当成加密层')

    # ---- base64 形态
    # 判「该不该按 base64 处理」的三条：
    #   ① 含 `+` / `/` / `=` 之一（base64 的**信号字符**，纯英文单词几乎不会出现）；
    #   ② 或长度 ≥ 16 且长度是 4 的倍数（严格 base64）；
    #   ③ 否则当明文（`hello` / `token` / `abcd` 这类单词的字符集恰好被 base64 全集包含，
    #      是最常见的假阳性来源 —— B15 自检实测踩到）。
    b64_charset = bool(B64_RE.match(s))
    b64_signal = bool(re.search(r'[+/=]', s))
    if b64_charset and (b64_signal or len(s) >= 16) and len(s) % 4 == 0:
        try:
            dec, ignored = b64_decode_forgiving(s)
        except ProbeError as e:
            add('base64-malformed', 'low', str(e), '检查是否被截断/含换行')
            return cands

        pr = printable_ratio(dec)
        ent = entropy(dec)
        is_text = _is_utf8(dec) and pr >= 0.8
        if dec[:2] == b'\x1f\x8b':
            add('base64-gzip', 'high',
                'base64 解码后以 `1f 8b` 开头：**gzip**，不是加密',
                'gzip.decompress 后再判')
        elif dec[:2] == b'\x78\x9c':
            add('base64-zlib', 'high', 'base64 解码后以 `78 9c` 开头：zlib', 'zlib.decompress 后再判')
        elif is_text:
            add('base64-text', 'high',
                'base64 解码后**可打印且是合法 UTF-8**（可打印率 %.0f%%）：内层是文本而不是密文。'
                '最常见是 base64(md5hex) 或 base64(参数拼接串)' % (pr * 100),
                '把解码结果当字符串看；若它是 32 位 hex，再去 md5-chain 验证')
        else:
            # ★ 分组密码判据：**「解出来是乱码」本身就是判据**，不要用熵做闸门 ——
            #   单个 16 字节分组的熵上界就是 4.0 bit/byte，拿 `entropy > 4.0` 当条件
            #   会把「恰好只采到一个分组样本」的 AES 密文放过去（B15 自检实测踩到）。
            #   熵只作为**描述信息**输出。
            if len(dec) in (64, 128, 256):
                add('base64-rsa', 'medium',
                    'base64 解码后长度恰为 %d 字节（= 512 / 1024 / 2048 位 RSA 的一个分组）、'
                    '熵 %.2f bit/byte、不可打印：疑似 **RSA 密文**' % (len(dec), ent),
                    '去页面里搜 `encrypt` / `JSEncrypt` / `RSA`；公钥用 rsa-pubkey 解析；'
                    '同一明文两次密文不同 ⇒ 非对称（含随机填充）')
            if len(dec) % 16 == 0 and len(dec) >= 16:
                add('base64-blockcipher', 'high',
                    'base64 解码后**不可打印/非文本**（可打印率 %.0f%%）、长度 %d 是 **16 的倍数**、'
                    '熵 %.2f bit/byte：**内层是分组密码密文（AES / SM4 家族）**。'
                    '这条「解出来是乱码但字节数对」正是判据本身 —— 不要以为解错了'
                    % (pr * 100, len(dec), ent),
                    '跑 `../../stream-drm-reverse/scripts/media_crypto.py aes-cbc/sm4-cbc`；'
                    '若是 8 的倍数（不是 16）则先试本脚本 `des --mode cbc`')
            elif len(dec) % 8 == 0 and len(dec) >= 8:
                add('base64-blockcipher-8', 'medium',
                    'base64 解码后不可打印、长度 %d 是 **8 的倍数但不是 16 的倍数**：'
                    '优先怀疑 **DES / 3DES**' % len(dec),
                    '`python login_param_probe.py des --mode cbc --key-hex <16位hex> '
                    '--iv-hex <16位hex> --input-b64 <密文>`')
            else:
                add('base64-binary', 'low',
                    'base64 解码后不可打印、长度 %d 既不是 8/16 的倍数也不像 RSA 分组：形态未识别'
                    % len(dec),
                    '按 hexdump 找魔数（1f8b / 789c / 78da / PK / %PDF）')
        if ignored:
            add('base64-forgiving', 'info',
                '含 %d 个非 base64 字符（%r）：Python 会**忽略**它们，但浏览器 `atob` 可能**抛错**。'
                '判据必须在目标运行时里实测' % (len(ignored), ''.join(sorted(set(ignored)))[:12]),
                '见 stream-drm-reverse/references/key-wrapper-families.md §4.2')
        return cands

    if b64_charset and b64_signal:
        # 含 base64 信号字符、但长度不是 4 的倍数 ⇒ 大概率是**抓包时被截断/换行**
        try:
            dec, _ = b64_decode_forgiving(s)
        except ProbeError as e:
            add('base64-malformed', 'low', str(e), '检查是否被截断/含换行')
            return cands
        add('base64-len-mismatch', 'medium',
            '含 base64 信号字符（`+`/`/`/`=`）但长度 %d 不是 4 的倍数 ⇒ 严格 base64 非法。'
            '宽容解码得到 %d 字节、可打印率 %.0f%%、长度 %%16 = %d'
            % (len(s), len(dec), printable_ratio(dec) * 100, len(dec) % 16),
            '**先怀疑抓包文本被截断或含换行**（复制粘贴时最容易发生），'
            '补齐到 4 的倍数再判；若确实不是 4 的倍数，那它就不是 base64')
        return cands

    if B64URL_RE.match(s) and ('-' in s or '_' in s):
        add('base64url', 'medium', '含 `-`/`_`：base64url 变体（不是加密）',
            '换成 +/ 再解；或直接按 base64url 解')
        return cands

    # ---- 明文
    if printable_ratio(s.encode('latin-1', 'ignore')) >= 0.95 and not re.search(r'[^\x20-\x7e]', s):
        add('plaintext', 'high',
            '全可打印且无编码特征：**这一项没有加密**（或只是编码）',
            '别在它身上找算法；先确认它是「服务器下发字段」还是「上一接口返回值」')
        return cands

    add('unknown', 'low', '形态未识别（既非纯 hex / base64，也不是纯可打印文本）',
        '看长度与字符集分布：entropy / hexdump 走 b64-probe')
    return cands


# --------------------------------------------------------------------------
# 2) b64-probe
# --------------------------------------------------------------------------

def b64_probe(payload):
    dec, ignored = b64_decode_forgiving(payload)
    info = {
        'input_len': len(payload),
        'decoded_len': len(dec),
        'decoded_len_mod8': len(dec) % 8,
        'decoded_len_mod16': len(dec) % 16,
        'printable_ratio': round(printable_ratio(dec), 4),
        'entropy_bit_per_byte': round(entropy(dec), 4),
        'ignored_chars': ''.join(sorted(set(ignored))),
        'hexdump': hexdump(dec),
    }
    magic = dec[:4]
    pr = printable_ratio(dec)
    if magic[:2] == b'\x1f\x8b':
        info['container'] = 'gzip'
    elif magic[:2] in (b'\x78\x9c', b'\x78\xda', b'\x78\x01'):
        info['container'] = 'zlib'
    elif pr >= 0.8 and _is_utf8(dec):
        info['container'] = 'text'
    elif len(dec) % 16 == 0 and len(dec) >= 16:
        # 注意：**不要**用 entropy > 4.0 当闸门 —— 单个 16 字节分组的熵上界就是 4.0
        info['container'] = 'block-cipher-16'
    elif len(dec) % 8 == 0 and len(dec) >= 8:
        info['container'] = 'block-cipher-8'
    else:
        info['container'] = 'binary-unknown'
    try:
        info['as_utf8'] = dec.decode('utf-8')
    except UnicodeDecodeError:
        info['as_utf8'] = None
    return info


# --------------------------------------------------------------------------
# 3) md5-chain —— 四种实测形态
# --------------------------------------------------------------------------

MD5_PRESETS = {
    # 裸 MD5（吾爱论坛 / 各类 pwmd5）
    'bare': 'md5(pwd)',
    # 青果教务：hex_md5(hex_md5(password) + hex_md5(randnumber.toLowerCase()))
    'pwd-then-salt': 'md5(md5(pwd) + md5(salt_lower))',
    # 青果 token：md5(md5(params) + md5(timestamp))
    'hex-pair': 'md5(md5(x) + md5(y))',
    # 某卢小说：hex_md5(A + hex_md5(B + pwd + ts))
    'nested-with-ts': 'md5(A + md5(B + pwd + ts))',
}


def md5_chain(preset, pwd='', salt='', x='', y='', ts='',
              outer_prefix='', inner_prefix='', salt_case='lower',
              encoding='latin1', upper=False):
    enc = latin1_bytes if encoding == 'latin1' else utf8_bytes
    md5 = lambda s: hashlib.md5(enc(s)).hexdigest()
    if preset == 'bare':
        out = md5(pwd)
    elif preset == 'pwd-then-salt':
        s = salt.lower() if salt_case == 'lower' else salt.upper()
        out = md5(md5(pwd) + md5(s))
    elif preset == 'hex-pair':
        out = md5(md5(x) + md5(y))
    elif preset == 'nested-with-ts':
        out = md5(outer_prefix + md5(inner_prefix + pwd + ts))
    else:
        raise ProbeError('未知 preset：%s（可选 %s）' % (preset, ' / '.join(sorted(MD5_PRESETS))))
    return out.upper() if upper else out


# --------------------------------------------------------------------------
# 4) rsa-pubkey —— 极简 DER 解析（纯 Python）
# --------------------------------------------------------------------------

OID_RSA = '2a864886f70d010101'          # 1.2.840.113549.1.1.1 rsaEncryption


def _der_read_tlv(buf, i):
    """读一个 TLV，返回 (tag, content_start, content_end, next_i)。"""
    if i >= len(buf):
        raise ProbeError('DER 越界（偏移 %d）' % i)
    tag = buf[i]
    i += 1
    if i >= len(buf):
        raise ProbeError('DER 长度字段越界')
    l = buf[i]
    i += 1
    if l & 0x80:
        nbytes = l & 0x7F
        if nbytes == 0 or nbytes > 4:
            raise ProbeError('不支持的 DER 长度编码（0x%02x）' % l)
        if i + nbytes > len(buf):
            raise ProbeError('DER 长长度字段越界')
        l = int.from_bytes(buf[i:i + nbytes], 'big')
        i += nbytes
    if i + l > len(buf):
        raise ProbeError('DER 内容越界（声明 %d，实际只剩 %d）' % (l, len(buf) - i))
    return tag, i, i + l, i + l


def _der_int(buf, i):
    tag, a, b, nxt = _der_read_tlv(buf, i)
    if tag != 0x02:
        raise ProbeError('期望 INTEGER(0x02)，实得 0x%02x' % tag)
    return int.from_bytes(buf[a:b], 'big'), nxt


def _der_children(buf, a, b):
    out = []
    i = a
    while i < b:
        tag, ca, cb, nxt = _der_read_tlv(buf, i)
        out.append((tag, ca, cb))
        i = nxt
    return out


def parse_rsa_pubkey_der(der):
    """支持 PKCS#1 RSAPublicKey 与 X.509 SubjectPublicKeyInfo 两种 DER。"""
    tag, a, b, _ = _der_read_tlv(der, 0)
    if tag != 0x30:
        raise ProbeError('顶层不是 SEQUENCE(0x30)，实得 0x%02x' % tag)
    kids = _der_children(der, a, b)
    if not kids:
        raise ProbeError('SEQUENCE 为空')

    # ---- 形态 A：PKCS#1 = SEQUENCE { INTEGER n, INTEGER e }
    if kids[0][0] == 0x02 and len(kids) >= 2 and kids[1][0] == 0x02:
        n = int.from_bytes(der[kids[0][1]:kids[0][2]], 'big')
        e = int.from_bytes(der[kids[1][1]:kids[1][2]], 'big')
        if n <= 0 or e <= 0:
            raise ProbeError('RSA 公钥的 n / e 必须为正整数')
        return {'form': 'pkcs1', 'n': n, 'e': e}

    # ---- 形态 B：SPKI = SEQUENCE { AlgorithmIdentifier, BIT STRING { RSAPublicKey } }
    if kids[0][0] == 0x30 and len(kids) >= 2 and kids[1][0] == 0x03:
        alg = kids[0]
        alg_kids = _der_children(der, alg[1], alg[2])
        if not alg_kids or alg_kids[0][0] != 0x06:
            raise ProbeError('SPKI 的 AlgorithmIdentifier 里没有 OID')
        oid = der[alg_kids[0][1]:alg_kids[0][2]].hex()
        if oid != OID_RSA:
            raise ProbeError('公钥算法 OID 不是 rsaEncryption（实得 %s）' % oid)
        bitstr = der[kids[1][1]:kids[1][2]]
        if not bitstr or bitstr[0] != 0x00:
            raise ProbeError('BIT STRING 有未使用位（首字节 0x%02x），不是 RSA 公钥' % (bitstr[0] if bitstr else -1))
        inner = bitstr[1:]
        t2, a2, b2, _ = _der_read_tlv(inner, 0)
        if t2 != 0x30:
            raise ProbeError('BIT STRING 内层不是 SEQUENCE')
        k2 = _der_children(inner, a2, b2)
        n = int.from_bytes(inner[k2[0][1]:k2[0][2]], 'big')
        e = int.from_bytes(inner[k2[1][1]:k2[1][2]], 'big')
        return {'form': 'spki', 'n': n, 'e': e, 'oid': oid}

    raise ProbeError('无法识别的公钥 DER 结构（首个 child tag = 0x%02x）' % kids[0][0])


def _replay(der, kid):
    """给 SEQUENCE 的 child 找回它的 TLV 起点（tag 位置）。"""
    return 0


def der_encode_len(l):
    if l < 0x80:
        return bytes([l])
    b = l.to_bytes((l.bit_length() + 7) // 8, 'big')
    return bytes([0x80 | len(b)]) + b


def der_tlv(tag, content):
    return bytes([tag]) + der_encode_len(len(content)) + content


def der_int(v):
    b = v.to_bytes((v.bit_length() + 8) // 8 or 1, 'big')
    if b[0] & 0x80:
        b = b'\x00' + b
    return der_tlv(0x02, b)


def der_rsa_pubkey_pkcs1(n, e):
    return der_tlv(0x30, der_int(n) + der_int(e))


def der_rsa_pubkey_spki(n, e):
    alg = der_tlv(0x30, der_tlv(0x06, binascii.unhexlify(OID_RSA)) + der_tlv(0x05, b''))
    return der_tlv(0x30, alg + der_tlv(0x03, b'\x00' + der_rsa_pubkey_pkcs1(n, e)))


def normalize_pubkey_input(text):
    """接受 PEM（含头尾）/ JSEncrypt 裸 base64 / 裸 hex，统一成 DER bytes。"""
    t = text.strip()
    if '-----BEGIN' in t:
        body = re.sub(r'-----[^-]+-----', '', t)
        body = re.sub(r'\s+', '', body)
        return base64.b64decode(body), 'pem'
    if HEX_RE.match(t) and len(t) % 2 == 0:
        return bytes.fromhex(t), 'hex'
    if B64_RE.match(t):
        return base64.b64decode(t), 'base64'
    raise ProbeError('无法识别的公钥输入（既不是 PEM，也不是裸 hex / base64）')


def rsa_pubkey(text, match_mod=None, match_exp=None):
    der, form = normalize_pubkey_input(text)
    got = parse_rsa_pubkey_der(der)
    n, e = got['n'], got['e']
    nhex = '%x' % n
    if len(nhex) % 2:
        nhex = '0' + nhex
    out = {
        'input_form': form,
        'der_form': got['form'],
        'modulus_hex': nhex,
        'modulus_len_hex': len(nhex),
        'modulus_bits': n.bit_length(),
        'exponent': e,
        'exponent_hex': '%x' % e,
    }
    if match_mod is not None:
        mm = match_mod.strip().lower().lstrip('0')
        out['match_mod'] = (mm == nhex.lower().lstrip('0'))
    if match_exp is not None:
        try:
            me = int(str(match_exp).strip(), 16)
        except ValueError:
            raise ProbeError('--match-exp 必须是 hex（如 `010001` 或 `10001`）')
        out['match_exp'] = (me == e)
    return out


# --------------------------------------------------------------------------
# 5) DES / 3DES（纯 Python）
# --------------------------------------------------------------------------

_IP = [58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4,
       62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
       57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3,
       61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7]
_FP = [40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31,
       38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29,
       36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27,
       34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25]
_E = [32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17,
      16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25, 24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1]
_P = [16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10,
      2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25]
_PC1 = [57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18,
        10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36,
        63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22,
        14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4]
_PC2 = [14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2,
        41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32]
_SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]
_SBOX = [
    [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7,
     0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8,
     4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0,
     15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
    [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10,
     3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5,
     0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15,
     13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
    [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8,
     13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1,
     13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7,
     1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
    [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15,
     13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9,
     10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4,
     3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
    [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9,
     14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6,
     4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14,
     11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
    [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11,
     10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8,
     9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6,
     4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
    [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1,
     13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6,
     1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2,
     6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
    [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7,
     1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2,
     7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8,
     2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11],
]


def _perm(bits, table):
    return [bits[t - 1] for t in table]


def _bytes_to_bits(b):
    out = []
    for x in b:
        for i in range(7, -1, -1):
            out.append((x >> i) & 1)
    return out


def _bits_to_bytes(bits):
    out = bytearray()
    for i in range(0, len(bits), 8):
        v = 0
        for b in bits[i:i + 8]:
            v = (v << 1) | b
        out.append(v)
    return bytes(out)


def _subkeys(key8):
    if len(key8) != 8:
        raise ProbeError('DES 密钥必须是 8 字节（实得 %d 字节）' % len(key8))
    kb = _perm(_bytes_to_bits(key8), _PC1)
    c, d = kb[:28], kb[28:]
    keys = []
    for shift in _SHIFTS:
        c = c[shift:] + c[:shift]
        d = d[shift:] + d[:shift]
        keys.append(_perm(c + d, _PC2))
    return keys


def _f(r, k):
    x = [a ^ b for a, b in zip(_perm(r, _E), k)]
    out = []
    for i in range(8):
        blk = x[i * 6:i * 6 + 6]
        row = (blk[0] << 1) | blk[5]
        col = (blk[1] << 3) | (blk[2] << 2) | (blk[3] << 1) | blk[4]
        v = _SBOX[i][row * 16 + col]
        out.extend([(v >> 3) & 1, (v >> 2) & 1, (v >> 1) & 1, v & 1])
    return _perm(out, _P)


def _des_block(block8, subkeys):
    bits = _perm(_bytes_to_bits(block8), _IP)
    l, r = bits[:32], bits[32:]
    for k in subkeys:
        l, r = r, [a ^ b for a, b in zip(l, _f(r, k))]
    return _bits_to_bytes(_perm(r + l, _FP))


def des_encrypt_block(block8, key8):
    return _des_block(block8, _subkeys(key8))


def des_decrypt_block(block8, key8):
    return _des_block(block8, list(reversed(_subkeys(key8))))


def _des_ede_encrypt_block(block8, key24):
    return des_encrypt_block(des_decrypt_block(des_encrypt_block(block8, key24[:8]), key24[8:16]), key24[16:24])


def _des_ede_decrypt_block(block8, key24):
    return des_decrypt_block(des_encrypt_block(des_decrypt_block(block8, key24[16:24]), key24[8:16]), key24[:8])


def _pad(data, mode, block=8):
    if mode == 'none':
        if len(data) % block:
            raise ProbeError('--pad none 要求数据长度是 %d 的倍数（实得 %d）' % (block, len(data)))
        return data
    if mode == 'zero':
        r = len(data) % block
        return data if r == 0 else data + b'\x00' * (block - r)
    if mode == 'pkcs7':
        p = block - (len(data) % block)
        return data + bytes([p]) * p
    raise ProbeError('未知 padding：%s' % mode)


def _unpad(data, mode, block=8):
    if mode == 'none':
        return data
    if mode == 'zero':
        return data.rstrip(b'\x00')
    if mode == 'pkcs7':
        if not data or len(data) % block:
            raise ProbeError('pkcs7 去填充：长度不是 %d 的倍数' % block)
        p = data[-1]
        if p < 1 or p > block or data[-p:] != bytes([p]) * p:
            raise ProbeError('pkcs7 去填充失败：末字节 0x%02x 与填充内容不符（key/iv/mode 大概率有错）'
                             % (data[-1] if data else 0))
        return data[:-p]
    raise ProbeError('未知 padding：%s' % mode)


def des_crypt(data, key, mode='ecb', iv=None, decrypt=False, padding='pkcs7', ede3=False):
    """DES / 3DES 的 ECB / CBC。返回 bytes。"""
    blk = 8
    if ede3:
        if len(key) != 24:
            raise ProbeError('3DES 密钥必须是 24 字节（实得 %d 字节）' % len(key))
        enc_b, dec_b = _des_ede_encrypt_block, _des_ede_decrypt_block
    else:
        if len(key) != 8:
            raise ProbeError('DES 密钥必须是 8 字节（实得 %d 字节）；3DES 请加 --ede3' % len(key))
        enc_b, dec_b = des_encrypt_block, des_decrypt_block

    if mode == 'cbc':
        if iv is None or len(iv) != blk:
            raise ProbeError('CBC 需要 8 字节 IV（实得 %s）'
                             % ('None' if iv is None else '%d 字节' % len(iv)))
    elif mode != 'ecb':
        raise ProbeError('未知 mode：%s' % mode)

    if decrypt:
        if len(data) % blk:
            raise ProbeError('密文长度必须是 %d 的倍数（实得 %d）' % (blk, len(data)))
        out = bytearray()
        prev = iv
        for i in range(0, len(data), blk):
            c = data[i:i + blk]
            p = dec_b(c, key)
            if mode == 'cbc':
                p = bytes(a ^ b for a, b in zip(p, prev))
                prev = c
            out += p
        return _unpad(bytes(out), padding)

    data = _pad(data, padding)
    out = bytearray()
    prev = iv
    for i in range(0, len(data), blk):
        blk_in = data[i:i + blk]
        if mode == 'cbc':
            blk_in = bytes(a ^ b for a, b in zip(blk_in, prev))
        c = enc_b(blk_in, key)
        if mode == 'cbc':
            prev = c
        out += c
    return bytes(out)


# --------------------------------------------------------------------------
# 6) --selftest
# --------------------------------------------------------------------------

def _selftest():
    ok = 0
    fail = []

    def check(name, cond, extra=''):
        nonlocal ok
        if cond:
            ok += 1
        else:
            fail.append('%s %s' % (name, extra))

    # ---- 基础工具
    check('latin1_bytes 走 &0xff', latin1_bytes('中') == b'\x2d', latin1_bytes('中').hex())
    check('utf8_bytes 走 UTF-8', utf8_bytes('中') == b'\xe4\xb8\xad')
    check('entropy 空输入为 0', entropy(b'') == 0.0)
    check('entropy 单字节分布为 0', abs(entropy(b'\x00' * 16)) < 1e-9)
    check('printable_ratio 全可打印为 1', printable_ratio(b'abc') == 1.0)
    check('b64_decode_forgiving 忽略非法字符', b64_decode_forgiving('YQ!!==')[0] == b'a')

    # ---- classify
    c = classify('0' * 32)
    check('classify: 32 hex → md5-hex32', c[0]['family'] == 'md5-hex32', c[0]['family'])
    c = classify('0' * 40)
    check('classify: 40 hex → sha1-hex40', c[0]['family'] == 'sha1-hex40')
    c = classify('0' * 64)
    check('classify: 64 hex → sha256-hex64', c[0]['family'] == 'sha256-hex64')
    c = classify(base64.b64encode(b'hello world').decode())
    check('classify: base64 明文 → base64-text', c[0]['family'] == 'base64-text', c[0]['family'])
    c = classify(base64.b64encode(bytes(range(32))).decode())
    check('classify: base64 二进制(16 的倍数) → base64-blockcipher',
          c[0]['family'] == 'base64-blockcipher', c[0]['family'])
    c = classify(base64.b64encode(b'Now is the time for all ').decode())
    check('classify: base64 文本(16 的倍数但可打印) 仍判 text',
          c[0]['family'] == 'base64-text', c[0]['family'])
    c = classify('user%40example.com')
    check('classify: 含 %XX → 提示 url-encoded', any(x['family'] == 'url-encoded' for x in c))
    c = classify('hello')
    check('classify: 纯文本 → plaintext', c[0]['family'] == 'plaintext')
    # 区分性断言：16 字节**高熵**与 16 字节**低熵**必须被判到不同族
    hi = classify(base64.b64encode(bytes([(i * 37 + 11) % 256 for i in range(16)])).decode())
    lo = classify(base64.b64encode(b'ABCDEFGHIJKLMNOP').decode())
    check('classify: 区分「高熵 16 字节」与「低熵 16 字节文本」',
          hi[0]['family'] == 'base64-blockcipher' and lo[0]['family'] == 'base64-text',
          '%s / %s' % (hi[0]['family'], lo[0]['family']))
    # 8 的倍数但非 16 → 提示 DES
    c = classify(base64.b64encode(bytes([(i * 53 + 7) % 256 for i in range(24)])).decode())
    check('classify: 24 字节高熵 → 提示 DES 族',
          any(x['family'] == 'base64-blockcipher-8' for x in c), str([x['family'] for x in c]))

    # ---- b64-probe
    p = b64_probe(base64.b64encode(b'hello').decode())
    check('b64-probe: text', p['container'] == 'text' and p['as_utf8'] == 'hello')
    p = b64_probe(base64.b64encode(gzip.compress(b'hello')).decode())
    check('b64-probe: gzip', p['container'] == 'gzip')
    p = b64_probe(base64.b64encode(zlib.compress(b'hello')).decode())
    check('b64-probe: zlib', p['container'] == 'zlib')
    p = b64_probe(base64.b64encode(bytes(range(32))).decode())
    check('b64-probe: block-cipher-16', p['container'] == 'block-cipher-16')

    # ---- md5-chain：RFC 1321 与「文章原样 JS 实跑」双来源
    check('RFC1321: md5("")', md5_chain('bare', pwd='') == 'd41d8cd98f00b204e9800998ecf8427e')
    check('RFC1321: md5("abc")', md5_chain('bare', pwd='abc') == '900150983cd24fb0d6963f7d28e17f72')
    check('RFC1321: md5(长串)',
          md5_chain('bare', pwd='abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')
          == '8215ef0796a20bcaaae116d3876c664a')

    # ★ 某卢小说（52pojie-1815692）的**文章原样 JS 实跑**向量：
    #   node artifacts/skill-evolution/b15-run-20260922-1733/oracle-login-md5-vectors.js
    LI_A = '@345Kie(873_dfbKe>d3<.d23432='
    LI_B = 'EW234@![#$&]*{,OP}Kd^w349Op+-32_'
    li_vectors = [
        ('123456', '1690810935', 'edca867125d5f76542c10e1cc4667969'),
        ('123456', '1690810936', '4d10d3e452cda2cab1fb499e3086fcd7'),
        ('', '1690810935', '03c736215c87f9f6c9ee82909bf3d850'),
        ('P@ssw0rd!中文', '1700000000', '2244564e7a4df75797335fddcbf0f0a7'),
        ('a' * 64, '0', '59aeff92801e68f55d8ce4a0e16d5643'),
    ]
    for pwd, ts, exp in li_vectors:
        got = md5_chain('nested-with-ts', pwd=pwd, ts=ts, outer_prefix=LI_A, inner_prefix=LI_B)
        check('oracle(1815692): pwd=%r ts=%s' % (pwd[:12], ts), got == exp, '%s != %s' % (got, exp))
    # 区分性断言：口径换 UTF-8 后，含中文的那条**必须**变
    check('区分性：latin1 与 utf8 口径对非 ASCII 明文必须给出不同结果',
          md5_chain('nested-with-ts', pwd='P@ssw0rd!中文', ts='1700000000',
                    outer_prefix=LI_A, inner_prefix=LI_B, encoding='latin1')
          != md5_chain('nested-with-ts', pwd='P@ssw0rd!中文', ts='1700000000',
                       outer_prefix=LI_A, inner_prefix=LI_B, encoding='utf8'))
    # 区分性断言：ts 变 1 秒，结果必须变（防止把 ts 漏掉也能「看起来对」）
    check('区分性：ts 必须真的参与（差 1 秒结果不同）',
          md5_chain('nested-with-ts', pwd='123456', ts='1690810935',
                    outer_prefix=LI_A, inner_prefix=LI_B)
          != md5_chain('nested-with-ts', pwd='123456', ts='1690810936',
                       outer_prefix=LI_A, inner_prefix=LI_B))
    # 青果教务（1108756）：hex_md5(hex_md5(pwd) + hex_md5(randnumber.toLowerCase()))
    inner_pwd = hashlib.md5(b'123456').hexdigest()
    inner_salt = hashlib.md5(b'4a7b').hexdigest()
    expect = hashlib.md5((inner_pwd + inner_salt).encode('latin-1')).hexdigest()
    check('oracle(1108756): pwd-then-salt 与手算一致',
          md5_chain('pwd-then-salt', pwd='123456', salt='4A7B') == expect)
    check('区分性：salt 大小写归一（--salt-case lower）必须生效',
          md5_chain('pwd-then-salt', pwd='123456', salt='4A7B', salt_case='lower')
          == md5_chain('pwd-then-salt', pwd='123456', salt='4a7b', salt_case='lower'))
    check('区分性：--upper 只改输出大小写，不改语义',
          md5_chain('bare', pwd='abc', upper=True) == md5_chain('bare', pwd='abc').upper())
    check('md5-chain: 未知 preset 必须报错',
          _raises(lambda: md5_chain('nope')))

    # ---- RSA 公钥：用**自造 DER** 做往返（不依赖任何库）
    N = 0xC0FFEE1234567890ABCDEF00FEDCBA9876543210DEADBEEF0102030405060708090A0B0C0D0E0F10
    E = 65537
    pkcs1 = der_rsa_pubkey_pkcs1(N, E)
    spki = der_rsa_pubkey_spki(N, E)
    r1 = parse_rsa_pubkey_der(pkcs1)
    check('rsa: PKCS#1 往返', r1['form'] == 'pkcs1' and r1['n'] == N and r1['e'] == E, str(r1)[:80])
    r2 = parse_rsa_pubkey_der(spki)
    check('rsa: SPKI 往返', r2['form'] == 'spki' and r2['n'] == N and r2['e'] == E, str(r2)[:80])
    r3 = rsa_pubkey(base64.b64encode(spki).decode(), match_mod='%x' % N, match_exp='10001')
    check('rsa: JSEncrypt 裸 base64 + 与接口下发值对拍',
          r3['match_mod'] is True and r3['match_exp'] is True and r3['modulus_bits'] == N.bit_length())
    r4 = rsa_pubkey(base64.b64encode(pkcs1).decode(), match_mod='ff%x' % N)
    check('rsa: 对拍不通过时必须给出 False（不能静默 True）', r4['match_mod'] is False)
    check('rsa: 截断的 DER 必须被拒绝', _raises(lambda: parse_rsa_pubkey_der(spki[:-6])))
    check('rsa: 非 RSA OID 必须被拒绝',
          _raises(lambda: parse_rsa_pubkey_der(
              der_tlv(0x30, der_tlv(0x30, der_tlv(0x06, binascii.unhexlify('2a8648ce3d0201')) + der_tlv(0x05, b''))
                      + der_tlv(0x03, b'\x00' + pkcs1)))))
    check('rsa: 非法输入必须报错', _raises(lambda: normalize_pubkey_input('!!!not a key!!!')))

    # ---- DES / 3DES：期望值来自 OpenSSL（独立实现）
    #   生成器：node --openssl-legacy-provider artifacts/skill-evolution/b15-run-20260922-1733/gen-des-vectors.js
    ct = des_crypt(bytes.fromhex('0123456789ABCDEF'), bytes.fromhex('133457799BBCDFF1'),
                   mode='ecb', padding='none')
    check('DES-ECB 经典向量 (FIPS 81)', ct.hex() == '85e813540f0ab405', ct.hex())
    ct = des_crypt(bytes.fromhex('4e6f77206973207468652074696d6520'), bytes.fromhex('0123456789abcdef'),
                   mode='cbc', iv=bytes.fromhex('1234567890abcdef'), padding='none')
    check('DES-CBC 向量 (OpenSSL 对拍)', ct.hex() == 'e5c7cdde872bf27c43e934008c389c0f', ct.hex())
    ct = des_crypt(bytes.fromhex('0123456789abcdef'),
                   bytes.fromhex('0123456789abcdef23456789abcdef01456789abcdef0123'),
                   mode='ecb', padding='none', ede3=True)
    check('3DES-EDE-ECB 向量 (OpenSSL 对拍)', ct.hex() == 'f2afd84ee809e2b5', ct.hex())
    # 往返
    for mode, iv in (('ecb', None), ('cbc', bytes.fromhex('1234567890abcdef'))):
        for pad in ('pkcs7', 'zero', 'none'):
            data = bytes.fromhex('4e6f77206973207468652074696d6520')   # "Now is the time " 16B
            key = bytes.fromhex('0123456789abcdef')
            c = des_crypt(data, key, mode=mode, iv=iv, padding=pad)
            p = des_crypt(c, key, mode=mode, iv=iv, decrypt=True, padding=pad)
            check('DES 往返 %s/%s' % (mode, pad), p == data, p.hex())
    # CBC 必须**逐块等于**「ECB + 前块异或」——这是能抓住「CBC 只做了异或没做链」的区分性断言
    key = bytes.fromhex('0123456789abcdef')
    iv = bytes.fromhex('1234567890abcdef')
    data = bytes.fromhex('00112233445566778899aabbccddeeff')
    cbc = des_crypt(data, key, mode='cbc', iv=iv, padding='none')
    b1 = des_crypt(bytes(a ^ b for a, b in zip(data[:8], iv)), key, mode='ecb', padding='none')
    b2 = des_crypt(bytes(a ^ b for a, b in zip(data[8:], b1)), key, mode='ecb', padding='none')
    check('DES-CBC 逐块等于「ECB + 前密文异或」（区分性）', cbc == b1 + b2, cbc.hex())
    # 失败分支
    check('DES: 7 字节密钥必须被拒绝', _raises(lambda: des_crypt(b'12345678', b'1234567')))
    check('DES: 非 8 倍数密文在解密时必须被拒绝',
          _raises(lambda: des_crypt(b'1234567', b'12345678', decrypt=True)))
    check('DES: 3DES 密钥不是 24 字节必须被拒绝',
          _raises(lambda: des_crypt(b'12345678', b'12345678' * 2, ede3=True)))
    check('DES: CBC 缺 IV 必须被拒绝', _raises(lambda: des_crypt(b'12345678', b'12345678', mode='cbc')))
    check('DES: --pad none 且长度非 8 倍数必须被拒绝',
          _raises(lambda: des_crypt(b'1234567', b'12345678', padding='none')))
    check('DES: pkcs7 去填充失败必须报错（防静默出垃圾）',
          _raises(lambda: des_crypt(bytes.fromhex('0000000000000000'), bytes.fromhex('133457799BBCDFF1'),
                                    decrypt=True, padding='pkcs7')))

    total = ok + len(fail)
    print('login_param_probe.py --selftest')
    print('  PASS %d / %d' % (ok, total))
    if fail:
        for f in fail:
            print('  FAIL %s' % f)
        return 1
    print('  全部通过（本脚本断言数以此实跑输出为准，不要在文档里手抄）')
    return 0


def _raises(fn):
    try:
        fn()
    except (ProbeError, ValueError, binascii.Error):
        return True
    except Exception:
        return True
    return False


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def _load_bytes(args):
    if args.input_b64:
        return b64_decode_forgiving(args.input_b64)[0]
    if args.input_hex:
        try:
            return bytes.fromhex(re.sub(r'\s+', '', args.input_hex))
        except ValueError as e:
            raise ProbeError('--input-hex 非法：%s' % e)
    if args.input is not None:
        if args.input == '-':
            return sys.stdin.buffer.read()
        return args.input.encode('utf-8')
    raise ProbeError('需要 --input / --input-hex / --input-b64 之一')


def main(argv=None):
    ap = argparse.ArgumentParser(prog='login_param_probe.py', description='登录提交参数取证与还原（零依赖）')
    ap.add_argument('--selftest', action='store_true', help='跑全部自检')
    sub = ap.add_subparsers(dest='cmd')

    p = sub.add_parser('classify', help='密文形态 → 加密族判据')
    p.add_argument('--cipher', required=True)
    p.add_argument('--json', action='store_true')

    p = sub.add_parser('b64-probe', help='base64 载荷体检')
    p.add_argument('--input', required=True)
    p.add_argument('--json', action='store_true')

    p = sub.add_parser('md5-chain', help='MD5 链复算')
    p.add_argument('--preset', required=True, choices=sorted(MD5_PRESETS))
    p.add_argument('--pwd', default='')
    p.add_argument('--salt', default='')
    p.add_argument('--x', default='')
    p.add_argument('--y', default='')
    p.add_argument('--ts', default='')
    p.add_argument('--outer-prefix', default='')
    p.add_argument('--inner-prefix', default='')
    p.add_argument('--salt-case', default='lower', choices=['lower', 'upper'])
    p.add_argument('--encoding', default='latin1', choices=['latin1', 'utf8'],
                   help='latin1 = JS 的 charCodeAt&0xff 口径；utf8 = CryptoJS.MD5(str) 口径')
    p.add_argument('--upper', action='store_true')
    p.add_argument('--verify', help='与期望值比对（不符则 exit 1）')
    p.add_argument('--json', action='store_true')

    p = sub.add_parser('rsa-pubkey', help='解析 RSA 公钥')
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument('--pem', help='PEM 文件路径，或 `-` 读 stdin')
    g.add_argument('--b64', help='JSEncrypt 形式的裸 base64')
    g.add_argument('--hex', dest='hexstr', help='裸 DER 的 hex')
    p.add_argument('--match-mod', help='与接口下发的 publickey_mod 对拍')
    p.add_argument('--match-exp', help='与接口下发的 publickey_exp 对拍（hex）')
    p.add_argument('--json', action='store_true')

    p = sub.add_parser('des', help='DES / 3DES')
    p.add_argument('--input'); p.add_argument('--input-hex', dest='input_hex')
    p.add_argument('--input-b64', dest='input_b64')
    p.add_argument('--key-hex', required=True)
    p.add_argument('--iv-hex')
    p.add_argument('--mode', default='ecb', choices=['ecb', 'cbc'])
    p.add_argument('--pad', default='pkcs7', choices=['pkcs7', 'zero', 'none'])
    p.add_argument('--ede3', action='store_true', help='3DES（密钥 24 字节）')
    p.add_argument('--decrypt', action='store_true', help='默认是**解密**（这一族的主用途）')
    p.add_argument('--encrypt', action='store_true')
    p.add_argument('--out')
    p.add_argument('--json', action='store_true')

    args = ap.parse_args(argv)

    if args.selftest:
        return _selftest()
    if not args.cmd:
        ap.print_help()
        return 0

    try:
        if args.cmd == 'classify':
            res = classify(args.cipher)
            if args.json:
                print(json.dumps(res, ensure_ascii=False, indent=2))
            else:
                for i, r in enumerate(res, 1):
                    print('%d) [%s] %s' % (i, r['confidence'], r['family']))
                    print('   判据：%s' % r['reason'])
                    print('   下一步：%s' % r['next'])
            return 0

        if args.cmd == 'b64-probe':
            info = b64_probe(args.input)
            if args.json:
                print(json.dumps(info, ensure_ascii=False, indent=2))
            else:
                for k in ('input_len', 'decoded_len', 'decoded_len_mod8', 'decoded_len_mod16',
                          'printable_ratio', 'entropy_bit_per_byte', 'container', 'ignored_chars'):
                    print('%-24s %s' % (k, info[k]))
                print('as_utf8                  %s' % (repr(info['as_utf8'])[:80] if info['as_utf8'] else 'None'))
                print(info['hexdump'])
            return 0

        if args.cmd == 'md5-chain':
            out = md5_chain(args.preset, pwd=args.pwd, salt=args.salt, x=args.x, y=args.y, ts=args.ts,
                            outer_prefix=args.outer_prefix, inner_prefix=args.inner_prefix,
                            salt_case=args.salt_case, encoding=args.encoding, upper=args.upper)
            ok = True
            if args.verify:
                ok = (out.lower() == args.verify.strip().lower())
            if args.json:
                print(json.dumps({'preset': args.preset, 'result': out, 'verified': ok}, ensure_ascii=False))
            else:
                print(out)
                if args.verify:
                    print('verify: %s' % ('MATCH' if ok else 'MISMATCH（期望 %s）' % args.verify.strip()))
            return 0 if ok else 1

        if args.cmd == 'rsa-pubkey':
            if args.pem:
                text = sys.stdin.read() if args.pem == '-' else open(args.pem, 'r', encoding='utf-8').read()
            elif args.b64:
                text = args.b64
            else:
                text = args.hexstr
            info = rsa_pubkey(text, match_mod=args.match_mod, match_exp=args.match_exp)
            if args.json:
                print(json.dumps(info, ensure_ascii=False, indent=2))
            else:
                for k in ('input_form', 'der_form', 'modulus_bits', 'modulus_len_hex', 'exponent_hex'):
                    print('%-18s %s' % (k, info[k]))
                print('%-18s %s' % ('modulus_hex', info['modulus_hex']))
                if 'match_mod' in info:
                    print('%-18s %s' % ('match_mod', info['match_mod']))
                if 'match_exp' in info:
                    print('%-18s %s' % ('match_exp', info['match_exp']))
            bad = [k for k in ('match_mod', 'match_exp') if k in info and not info[k]]
            return 1 if bad else 0

        if args.cmd == 'des':
            data = _load_bytes(args)
            key = bytes.fromhex(re.sub(r'\s+', '', args.key_hex))
            iv = bytes.fromhex(re.sub(r'\s+', '', args.iv_hex)) if args.iv_hex else None
            decrypt = args.decrypt or not args.encrypt
            out = des_crypt(data, key, mode=args.mode, iv=iv, decrypt=decrypt,
                            padding=args.pad, ede3=args.ede3)
            if args.out:
                with open(args.out, 'wb') as fh:
                    fh.write(out)
                if args.json:
                    print(json.dumps({'out': args.out, 'len': len(out)}, ensure_ascii=False))
                else:
                    print('已写入 %s（%d 字节）' % (args.out, len(out)))
            elif args.json:
                print(json.dumps({'hex': out.hex(),
                                  'utf8': _try_utf8(out)}, ensure_ascii=False))
            else:
                print('hex: %s' % out.hex())
                t = _try_utf8(out)
                if t is not None:
                    print('utf8: %s' % t)
            return 0

    except ProbeError as e:
        die(str(e))
    except OSError as e:
        die('IO 失败：%s' % e)
    return 0


def _try_utf8(b):
    try:
        return b.decode('utf-8')
    except UnicodeDecodeError:
        return None


if __name__ == '__main__':
    sys.exit(main())
