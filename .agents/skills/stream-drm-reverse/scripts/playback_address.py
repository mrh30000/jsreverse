#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""播放地址还原层（§0 层）的六个可复算 oracle。

本脚本对应 `references/playback-address-interfaces.md`：在 A–F 层之前，
先把「页面/接口里的那串东西」还原成一个**能直接播的地址**。

子命令
------
charcodes       字符码表族（`*104*116*116*112…` → `http…`）
qingting        蜻蜓FM 电台地址（HMAC-MD5 签名）
migu-ddcalcu    咪咕 playurl 的 ddCalcu 字符交织（不是加密）
iqiyi-authkey   爱奇艺 dash 的 authKey（加盐 MD5）
jiexi-l1        解析接口族第一层（Base64 → **全字节** `%XX` → 明文地址）
jiexi-aes       解析接口族第三层（AES-CBC 解 `api.php` 返回的 `url` 字段）

零依赖、纯标准库（**含自实现的 AES-128-CBC**，见 `_aes128_cbc_decrypt`）。`--selftest` 自带正/负对照。

⚠️ 口径声明（B29）：本脚本的**算法**全部逐行抄自源文；但
   - `qingting` 源文**未给示例 URL** ⇒ 只做结构断言，未与真实响应对拍；
     其中「十六进制大小写」源文未明确，用 `--ts-case` 暴露成开关；
   - `migu-ddcalcu` 源文**未给 ddCalcu 的期望输出** ⇒ 断言的是**结构**（长度与四个插入位），
     不是某个具体值。这两条在文档里也必须同样标注。

★ 口径声明（B39 新增）：`jiexi-l1` / `jiexi-aes` 的断言是**真对拍** ——
   两个一层密文与两个 AES 密文都是**源文自己给的**，本脚本只做还原，不自造期望值。
   其中 AES 侧用**两个不同时点**的密文同解 ⇒ 支撑「key/iv 跨请求固定」这条结论。
"""

import argparse
import hashlib
import hmac
import json
import sys
import time
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

# --------------------------------------------------------------------------- #
# 1) 字符码表族
# --------------------------------------------------------------------------- #

def charcodes_decode(text, sep='*', skip_first=1, encoding='utf-8'):
    """`*104*116*116*112…` → `http…`（听书网 FonHen_JieMa 族）。

    源文实现（52pojie-2017001:52-57）：
        var a = u.split("*");
        for (var i = 1, n = a.length; i < n; i++) b += String.fromCharCode(a[i]);
    注意三件事，每一件都对应一个静默出错路径：
      1. **从下标 1 开始**（下标 0 是前导分隔符留下的空串）；
      2. `String.fromCharCode` 是**按 UTF-16 码元**取值，不是按字节 —— 码点 > 0xFFFF
         时要按 `chr()` 的语义处理，本实现直接用 `chr()`；
      3. 分隔符、前导空段、越界码点都要**报错而不是静默跳过**。
    """
    if not text:
        raise ValueError('空输入')
    parts = text.split(sep)
    if skip_first:
        parts = parts[skip_first:]
    out = []
    for idx, piece in enumerate(parts):
        piece = piece.strip()
        if piece == '':
            raise ValueError('第 %d 段为空（分隔符连写？）' % idx)
        try:
            code = int(piece, 10)
        except ValueError:
            raise ValueError('第 %d 段不是十进制整数：%r' % (idx, piece))
        if code < 0 or code > 0x10FFFF:
            raise ValueError('第 %d 段码点越界：%d' % (idx, code))
        if 0xD800 <= code <= 0xDFFF:
            raise ValueError('第 %d 段是 UTF-16 代理区码点（不可单独成字）：%d' % (idx, code))
        out.append(chr(code))
    return ''.join(out)


# --------------------------------------------------------------------------- #
# 2) 蜻蜓FM 电台地址
# --------------------------------------------------------------------------- #

QT_KEY = 'Lwrpu$K5oP'          # 源文 line 10 / 20 的固定口令
QT_HOST = 'https://lhttp.qtfm.cn'
QT_PATH_TPL = '/live/{id}/64k.mp3'


def qingting_sign(path, ts_hex, app_id='web', key=QT_KEY):
    """sign = hex_hmac_md5(key, "app_id=<app_id>&path=<path>&ts=<ts_hex>")"""
    msg = 'app_id=%s&path=%s&ts=%s' % (app_id, path, ts_hex)
    return hmac.new(key.encode('utf-8'), msg.encode('utf-8'), hashlib.md5).hexdigest()


def qingting_url(channel_id, ts_unix=None, ts_offset=3600, ts_case='upper', app_id='web'):
    """源文口径：`ts` 是「当前时间 + 1 小时」的**十六进制文本**。

    易语言 `取十六进制文本(Unix时间戳(增减时间(取现行时间(), #小时, 1)))`。
    ⚠️ 源文未给示例 URL ⇒ **大小写未证**，默认 `upper`（易语言该函数惯例输出大写），
       用 `--ts-case lower` 可切换。这条不确定性必须留在文档里，不要悄悄选一个。
    """
    path = QT_PATH_TPL.format(id=channel_id)
    base_ts = int(ts_unix if ts_unix is not None else time.time())
    ts = base_ts + int(ts_offset)
    ts_hex = format(ts, 'X') if ts_case == 'upper' else format(ts, 'x')
    sign = qingting_sign(path, ts_hex, app_id=app_id)
    return '%s%s?app_id=%s&ts=%s&sign=%s' % (QT_HOST, path, app_id, ts_hex, sign), {
        'path': path, 'ts_unix': ts, 'ts_hex': ts_hex, 'sign': sign, 'msg': 'app_id=%s&path=%s&ts=%s' % (app_id, path, ts_hex),
    }


# --------------------------------------------------------------------------- #
# 3) 咪咕 ddCalcu（字符交织）
# --------------------------------------------------------------------------- #

DD_INDEX_TABLE = '2624'        # 源文 line 113：s = list("2624")
DD_DEFAULTS = {
    'userid': 'eeeeeeeee',        # 9 个 e
    'timestamp': 'tttttttttttttt',  # 14 个 t
    'ProgramID': 'ccccccccc',     # 9 个 c
    'Channel_ID': 'nnnnnnnnnnnnnnnn',  # 16 个 n
}


def migu_ddcalcu(url):
    """把 h5 播放地址的 `puData` 交织成校验串，拼回 `&ddCalcu=`。

    逐行抄自 52pojie-1899689:95-136。**这不是加密**：没有任何密钥与运算，
    只是把 `puData` 反转后与原串交替配对，再在固定位置插入 4 个单字符。
    索引表 `s = "2624"` 决定取哪一位：
        u = t[2]（userid）· l = r[6]（timestamp）· c = n[2]（ProgramID）· f = a[len(a)-4]（Channel_ID）
    四个字段为空时用**定长默认串**兜底 —— 默认串的长度就是「必须 ≥ 索引」这件事本身
    （9 / 14 / 9 / 16 ⇒ 覆盖 2 / 6 / 2 / len-4），所以默认值不能随便改短。
    """
    parsed = urlparse(url)
    para = dict(parse_qsl(parsed.query))

    t = para.get('userid') or DD_DEFAULTS['userid']
    r = para.get('timestamp') or DD_DEFAULTS['timestamp']
    n = para.get('ProgramID') or DD_DEFAULTS['ProgramID']
    a = para.get('Channel_ID') or DD_DEFAULTS['Channel_ID']
    o = para.get('puData') or ''
    if not o:
        return url, {'skipped': '无 puData ⇒ 原样返回'}

    idx = DD_INDEX_TABLE
    for label, value, need in (('userid', t, int(idx[0]) + 1),
                               ('timestamp', r, int(idx[1]) + 1),
                               ('ProgramID', n, int(idx[2]) + 1),
                               ('Channel_ID', a, int(idx[3]) + 1)):
        if len(value) < need:
            raise ValueError('%s 长度 %d < 索引需要 %d（源文默认串被改短了？）' % (label, len(value), need))

    u = t[int(idx[0])] or 'e'
    l = r[int(idx[1])] or 't'
    c = n[int(idx[2])] or 'c'
    f = a[len(a) - int(idx[3])] or 'n'

    d = list(o)
    h = []
    p = 0
    while p * 2 < len(d):
        h.append(d[len(d) - p - 1])
        if p < len(d) - p - 1:
            h.append(o[p])
        if p == 1:
            h.append(u)
        if p == 2:
            h.append(l)
        if p == 3:
            h.append(c)
        if p == 4:
            h.append(f)
        p += 1
    v = ''.join(h)
    return url + '&ddCalcu=' + v, {
        'puData': o, 'u': u, 'l': l, 'c': c, 'f': f, 'ddCalcu': v, 'len': len(v),
    }


# --------------------------------------------------------------------------- #
# 4) 爱奇艺 authKey
# --------------------------------------------------------------------------- #

IQ_SALT = 'd41d8cd98f00b204e9800998ecf8427e'   # 源文 line 47/111


def iqiyi_authkey(tm, tvid, salt=IQ_SALT):
    """authKey = md5("<salt>" + tm + tvid)，tm 是 **13 位毫秒**时间戳。

    源文 line 111 自注「测试为真」。注意那个"盐"就是 `md5("")` —— 也就是说
    它并不是保密常量，只是一个**约定前缀**；换成真盐同样能算，但服务端只认这一个。
    """
    return hashlib.md5(('%s%s%s' % (salt, tm, tvid)).encode('utf-8')).hexdigest()


# --------------------------------------------------------------------------- #
# 5) 解析接口族（§3C）：双层地址编码 + 解析站 AES-CBC 常量
# --------------------------------------------------------------------------- #

# ★ 解析站（第三方 jiexi 站）的**固定常量**，逐字抄自 `52pojie-2033927`。
#   注意二者**只差大小写**（`ARTPLAYER…` / `Artplayer…`）—— 这是手工改播放器模板留下的痕迹，
#   不是同一个值：若真相等，CBC 会退化成 ECB 语义（见 §3C.3 的断言）。
JX_KEY = b'ARTPLAYERliUlanG'      # 16 字节
JX_IV = b'ArtplayerliUlanG'       # 16 字节


def fullpct_encode(text):
    """把 `text` 的**每一个字节**都写成 `%XX`（大写）。

    ⚠️ 这**不是**任何语言的库函数：`urllib.parse.quote(s, safe='')` 与 JS 的
    `encodeURIComponent` 都会**放过** `A-Za-z0-9` 与 `-_.!~*'()`，
    而本族**连字母数字都编码**（判据：`len(输出) == 3 * len(输入)`）。
    造密文时必须用它，否则长度对不上、服务端不认（见 §3C.2）。
    """
    return ''.join('%%%02X' % b for b in text.encode('utf-8'))


def jiexi_decode_layer1(blob, pad=True):
    """第一层：Base64 → 全字节 percent-encode 串 → 明文地址。

    返回 `(一层串, 明文)`。`pad=True` 复现源文写法
    `missing = 4 - len % 4; if missing != 4: += '=' * missing`。
    """
    import base64
    s = blob.strip()
    if pad:
        missing = 4 - (len(s) % 4)
        if missing != 4:
            s += '=' * missing
    layer1 = base64.b64decode(s).decode('utf-8')
    from urllib.parse import unquote
    # ★ 必须用 unquote/decodeURIComponent，**不要用 JS 的 unescape**（不认 UTF-8 多字节）。
    plain = unquote(layer1)
    # 自洽：一层必须恰好等于「明文的全字节编码」，否则说明漏了一层或用了标准 encode
    if layer1 != fullpct_encode(plain):
        raise ValueError('一层串 != fullpct_encode(明文)：长度 %d vs %d '
                         '（若用标准 encodeURIComponent/quote 造串，会短很多）'
                         % (len(layer1), len(fullpct_encode(plain))))
    return layer1, plain


def jiexi_encrypt_url(plain, key=JX_KEY, iv=JX_IV):
    """把明文地址加密成解析 API 返回的那种 Base64 密文（PKCS7 填充）。"""
    import base64
    raw = plain.encode('utf-8')
    pad_len = 16 - (len(raw) % 16)
    padded = raw + bytes([pad_len]) * pad_len
    return base64.b64encode(_aes128_cbc_encrypt(key, iv, padded)).decode()


def jiexi_decrypt_url(cipher_b64, key=JX_KEY, iv=JX_IV):
    """第三层：Base64 密文 → AES-CBC 解密 → 剥 PKCS7 → 真实 m3u8 地址。

    ★ 刻意**保持脚本「零依赖 / 纯标准库」的承诺**：AES-128 的块变换在本文件内
    用 100 行实现（`_aes128_cbc_decrypt`），**不引入 pycryptodome**。
    """
    import base64
    ct = base64.b64decode(cipher_b64.strip())
    if len(ct) % 16:
        raise ValueError('密文长度 %d 不是 16 的倍数' % len(ct))
    padded = _aes128_cbc_decrypt(key, iv, ct)
    pad_len = padded[-1]
    if not (1 <= pad_len <= 16) or padded[-pad_len:] != bytes([pad_len]) * pad_len:
        raise ValueError('PKCS7 填充非法（末字节 %d）——key/iv 抄错？注意二者只差大小写' % pad_len)
    return padded[:-pad_len].decode('utf-8')


# --- 纯标准库 AES-128（只实现 CBC 解密/加密所需的部分，用于 §3C 的自对拍）------

_SBOX = bytes.fromhex(
    '637c777bf26b6fc53001672bfed7ab76ca82c97dfa5947f0add4a2af9ca472c0'
    'b7fd9326363ff7cc34a5e5f171d8311504c723c31896059a071280e2eb27b275'
    '09832c1a1b6e5aa0523bd6b329e32f8453d100ed20fcb15b6acbbe394a4c58cf'
    'd0efaafb434d338545f9027f503c9fa851a3408f929d38f5bcb6da2110fff3d2'
    'cd0c13ec5f974417c4a77e3d645d197360814fdc222a908846eeb814de5e0bdb'
    'e0323a0a4906245cc2d3ac629195e479e7c8376d8dd54ea96c56f4ea657aae08'
    'ba78252e1ca6b4c6e8dd741f4bbd8b8a703eb5664803f60e613557b986c11d9e'
    'e1f8981169d98e949b1e87e9ce5528df8ca1890dbfe6426841992d0fb054bb16')

_INV_SBOX = bytearray(256)
for _i, _v in enumerate(_SBOX):
    _INV_SBOX[_v] = _i
_INV_SBOX = bytes(_INV_SBOX)

_RCON = (0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1B, 0x36)


def _xtime(a):
    a <<= 1
    return (a ^ 0x1B) & 0xFF if a & 0x100 else a


def _mul(a, b):
    """GF(2^8) 乘法（AES 用多项式 0x11B）。"""
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = _xtime(a)
        b >>= 1
    return r


def _expand_key(key):
    """AES-128 密钥扩展 ⇒ 11 组 16 字节轮密钥。"""
    if len(key) != 16:
        raise ValueError('AES-128 需要 16 字节密钥，收到 %d' % len(key))
    w = [list(key[i * 4:i * 4 + 4]) for i in range(4)]
    for i in range(4, 44):
        t = list(w[i - 1])
        if i % 4 == 0:
            t = t[1:] + t[:1]
            t = [_SBOX[b] for b in t]
            t[0] ^= _RCON[i // 4 - 1]
        w.append([w[i - 4][j] ^ t[j] for j in range(4)])
    return [bytes(sum(w[4 * r:4 * r + 4], [])) for r in range(11)]


def _add_round_key(s, rk):
    return bytes(a ^ b for a, b in zip(s, rk))


def _inv_shift_rows(s):
    """逆 ShiftRows：行 r 右移 r ⇐⇒ S'[r][c] = S[r][(c-r) mod 4]。

    ⚠️ 状态是**列主序**：线性下标 i 对应 row = i % 4、col = i // 4。
    本函数第一版写成 `s[(i + (i%4)*4) % 16]`，**方向写反** ⇒ 见下方 selftest 的教训。
    """
    out = bytearray(16)
    for c in range(4):
        for r in range(4):
            out[4 * c + r] = s[4 * ((c - r) % 4) + r]
    return bytes(out)


def _shift_rows(s):
    """ShiftRows：行 r 左移 r ⇐⇒ S'[r][c] = S[r][(c+r) mod 4]。"""
    out = bytearray(16)
    for c in range(4):
        for r in range(4):
            out[4 * c + r] = s[4 * ((c + r) % 4) + r]
    return bytes(out)


def _sub_bytes(s, box):
    return bytes(box[b] for b in s)


def _inv_mix_columns(s):
    out = bytearray(16)
    for c in range(4):
        a = s[c * 4:c * 4 + 4]
        out[c * 4 + 0] = _mul(a[0], 14) ^ _mul(a[1], 11) ^ _mul(a[2], 13) ^ _mul(a[3], 9)
        out[c * 4 + 1] = _mul(a[0], 9) ^ _mul(a[1], 14) ^ _mul(a[2], 11) ^ _mul(a[3], 13)
        out[c * 4 + 2] = _mul(a[0], 13) ^ _mul(a[1], 9) ^ _mul(a[2], 14) ^ _mul(a[3], 11)
        out[c * 4 + 3] = _mul(a[0], 11) ^ _mul(a[1], 13) ^ _mul(a[2], 9) ^ _mul(a[3], 14)
    return bytes(out)


def _mix_columns(s):
    out = bytearray(16)
    for c in range(4):
        a = s[c * 4:c * 4 + 4]
        out[c * 4 + 0] = _mul(a[0], 2) ^ _mul(a[1], 3) ^ a[2] ^ a[3]
        out[c * 4 + 1] = a[0] ^ _mul(a[1], 2) ^ _mul(a[2], 3) ^ a[3]
        out[c * 4 + 2] = a[0] ^ a[1] ^ _mul(a[2], 2) ^ _mul(a[3], 3)
        out[c * 4 + 3] = _mul(a[0], 3) ^ a[1] ^ a[2] ^ _mul(a[3], 2)
    return bytes(out)


def _aes128_block_decrypt(rks, block):
    s = _add_round_key(block, rks[10])
    for r in range(9, 0, -1):
        s = _inv_shift_rows(s)
        s = _sub_bytes(s, _INV_SBOX)
        s = _add_round_key(s, rks[r])
        s = _inv_mix_columns(s)
    s = _inv_shift_rows(s)
    s = _sub_bytes(s, _INV_SBOX)
    return _add_round_key(s, rks[0])


def _aes128_block_encrypt(rks, block):
    s = _add_round_key(block, rks[0])
    for r in range(1, 10):
        s = _sub_bytes(s, _SBOX)
        s = _shift_rows(s)
        s = _mix_columns(s)
        s = _add_round_key(s, rks[r])
    s = _sub_bytes(s, _SBOX)
    s = _shift_rows(s)
    return _add_round_key(s, rks[10])


def _aes128_cbc_decrypt(key, iv, ct):
    if len(iv) != 16:
        raise ValueError('IV 需要 16 字节')
    rks = _expand_key(key)
    out, prev = bytearray(), iv
    for o in range(0, len(ct), 16):
        blk = ct[o:o + 16]
        out += bytes(a ^ b for a, b in zip(_aes128_block_decrypt(rks, blk), prev))
        prev = blk
    return bytes(out)


def _aes128_cbc_encrypt(key, iv, pt):
    if len(iv) != 16:
        raise ValueError('IV 需要 16 字节')
    rks = _expand_key(key)
    out, prev = bytearray(), iv
    for o in range(0, len(pt), 16):
        blk = bytes(a ^ b for a, b in zip(pt[o:o + 16], prev))
        prev = _aes128_block_encrypt(rks, blk)
        out += prev
    return bytes(out)


# --------------------------------------------------------------------------- #
# 自检
# --------------------------------------------------------------------------- #

def selftest():
    n = 0
    ok = 0

    def chk(cond, name):
        nonlocal n, ok
        n += 1
        if cond:
            ok += 1
        else:
            print('  ✗ %s' % name)

    def raises(fn, name):
        nonlocal n, ok
        n += 1
        try:
            fn()
        except Exception:
            ok += 1
            return
        print('  ✗ %s（本应抛错却没有）' % name)

    # ---- charcodes
    chk(charcodes_decode('*104*116*116*112*58*47*47*97') == 'http://a', 'charcodes 基本解码')
    chk(charcodes_decode('*104*116*116*112') == 'http', 'charcodes skip_first=1 默认（源文带前导 *）')
    chk(charcodes_decode('|104|116|116|112', sep='|') == 'http', 'charcodes 自定义分隔符')
    chk(charcodes_decode('120*104*116', skip_first=0) == 'xht', 'charcodes skip_first=0 保留首段')
    chk(charcodes_decode('*233*189*160') == '\u00e9\u00bd\u00a0',
        'charcodes 按 UTF-16 码元（不是按字节，故 233 单独成字）')
    raises(lambda: charcodes_decode('*104**116'), 'charcodes 空段必须报错')
    raises(lambda: charcodes_decode('*abc'), 'charcodes 非整数必须报错')
    raises(lambda: charcodes_decode('*1114112'), 'charcodes 码点越界必须报错')
    raises(lambda: charcodes_decode('*55296'), 'charcodes 代理区码点必须报错')
    raises(lambda: charcodes_decode(''), 'charcodes 空输入必须报错')
    # 源文把目标站点写成 base64（line 15），解出来是站名 —— 本批实算
    import base64
    chk(base64.b64decode('aHR0cHM6Ly93d3cudGluZ3poLmNvbS9wbGF5LzE2MTI0LTAtMC5odG1s').decode() ==
        'https://www.tingzh.com/play/16124-0-0.html', '听书网源文的 base64 站点名可解')

    # ---- qingting
    url, meta = qingting_url(1234, ts_unix=1758700000, ts_offset=3600, ts_case='upper')
    chk(meta['ts_unix'] == 1758703600, 'qingting ts = unix + 3600')
    chk(meta['ts_hex'] == '68D3AFF0', 'qingting ts 十六进制（大写）')
    chk(meta['path'] == '/live/1234/64k.mp3', 'qingting path 模板')
    chk(meta['msg'] == 'app_id=web&path=/live/1234/64k.mp3&ts=68D3AFF0', 'qingting 待签串口径')
    chk(meta['sign'] == '57f8fb7d1488e93140cb986498c28d8e',
        'qingting sign = HMAC-MD5(口令, 待签串)（本批实算值，源文未给）')
    chk(meta['sign'] == hmac.new(b'Lwrpu$K5oP', meta['msg'].encode(), hashlib.md5).hexdigest(),
        'qingting sign 与 hashlib 直算一致')
    chk(len(meta['sign']) == 32 and all(c in '0123456789abcdef' for c in meta['sign']),
        'qingting sign 是 32 位小写 hex')
    chk(url == 'https://lhttp.qtfm.cn/live/1234/64k.mp3?app_id=web&ts=68D3AFF0&sign=' + meta['sign'],
        'qingting URL 拼装顺序')
    _, low = qingting_url(1234, ts_unix=1758700000, ts_offset=3600, ts_case='lower')
    chk(low['ts_hex'] == '68d3aff0' and low['sign'] != meta['sign'],
        'qingting 大小写开关真的会改签名（源文未证 ⇒ 必须留开关）')
    chk(qingting_sign('/live/1234/64k.mp3', '68D3AFF0', key='wrong') != meta['sign'],
        'qingting 负对照：换口令签名必须不同')
    chk(QT_KEY == 'Lwrpu$K5oP' and QT_HOST == 'https://lhttp.qtfm.cn', 'qingting 源文常量逐字一致')

    # ---- migu ddcalcu
    sample = ('https://h5live.gslb.cmvideo.cn/wd_r2/cctv/cctv1hd/600/index.m3u8'
              '?msisdn=202312241405015bc0ae24f1bb42dc9e16ff0f7ac931f9&mdspid=&spid=699004'
              '&netType=0&sid=2201057821&pid=2028597139&timestamp=20231224140501'
              '&Channel_ID=0116_25000000-99000-100300010010001&ProgramID=608807420'
              '&ParentNodeID=-99&assertID=2201057821&SecurityKey=20231224140501'
              '&promotionId=&mvid=2201057821&mcid=500020'
              '&playurlVersion=WX-A1-6.12.1.1-RELEASE&userid=&jmhm=&videocodec=h264'
              '&bean=mgsph5&puData=3f841e2a0b365c2914ee68cd75073bdb')
    out, info = migu_ddcalcu(sample)
    chk(out.startswith(sample) and out.endswith('&ddCalcu=' + info['ddCalcu']), 'ddcalcu 只做追加不改原 URL')
    chk(len(info['ddCalcu']) == len(info['puData']) + 4, 'ddcalcu 长度 = len(puData) + 4')
    chk(info['u'] == 'e', 'ddcalcu u 取 userid[2]，空则默认串 t[2]')
    chk(info['l'] == '2', 'ddcalcu l 取 timestamp[6]')
    chk(info['c'] == '8', 'ddcalcu c 取 ProgramID[2]')
    chk(info['f'] == sample.split('Channel_ID=')[1].split('&')[0][-4], 'ddcalcu f 取 Channel_ID[len-4]')
    chk(info['ddCalcu'][4] == info['u'] and info['ddCalcu'][7] == info['l']
        and info['ddCalcu'][10] == info['c'] and info['ddCalcu'][13] == info['f'],
        'ddcalcu 四个插入位固定在 4 / 7 / 10 / 13')
    # 结构复算（k >= 5 时进入稳定区，插入位已全部落完）：
    #   v[2k+4] == o[n-1-k]（逆序侧）  v[2k+5] == o[k]（正序侧）
    o = info['puData']
    chk(all(info['ddCalcu'][2 * k + 5] == o[k] for k in range(5, len(o) // 2)),
        'ddcalcu 正序侧按 o[k] 落位（v[2k+5]）')
    chk(all(info['ddCalcu'][2 * k + 4] == o[len(o) - 1 - k] for k in range(5, len(o) // 2)),
        'ddcalcu 逆序侧按 o[n-1-k] 落位（v[2k+4]）')
    no_pu = migu_ddcalcu('https://h5live.gslb.cmvideo.cn/a/index.m3u8?sid=1')
    chk(no_pu[0] == 'https://h5live.gslb.cmvideo.cn/a/index.m3u8?sid=1' and 'skipped' in no_pu[1],
        'ddcalcu 无 puData ⇒ 原样返回（源文 line 111）')
    raises(lambda: migu_ddcalcu(sample.replace('&Channel_ID=0116_25000000-99000-100300010010001', '&Channel_ID=01')),
           'ddcalcu 字段被改短到索引之外必须报错')
    chk(len(DD_DEFAULTS['userid']) >= 3 and len(DD_DEFAULTS['timestamp']) >= 7
        and len(DD_DEFAULTS['ProgramID']) >= 3 and len(DD_DEFAULTS['Channel_ID']) >= 4,
        'ddcalcu 四个默认串长度覆盖索引（这就是默认值不能改短的原因）')

    # ★ 语料陷阱：源文样例 URL 里的 `&timestamp=` 在 Markdown 里被渲染成了 `×tamp=`
    #   （`&times;` 是 HTML 实体）。后果**不报错**：`timestamp` 取不到 ⇒ 走默认串 ⇒
    #   第 7 个字符由 '2' 变成 't'，其余完全相同。这条做成断言，把"陷阱"变成机器可判。
    mangled = sample.replace('&timestamp=', '×tamp=')
    chk('×' in mangled and '&times' not in mangled, '语料实体化前提：&timestamp= 变成 ×tamp=')
    _, info_bad = migu_ddcalcu(mangled)
    chk(info_bad['l'] == 't' and info['l'] == '2',
        '★ 实体陷阱可机器判定：×tamp= ⇒ l 退化成默认 t；&timestamp= ⇒ l = 时间戳[6] = 2')
    chk(info_bad['ddCalcu'][7] == 't' and info['ddCalcu'][7] == '2'
        and info_bad['ddCalcu'][:7] == info['ddCalcu'][:7]
        and info_bad['ddCalcu'][8:] == info['ddCalcu'][8:],
        '★ 实体陷阱只改第 7 位、其余逐字符相同（静默出错的标准形态）')
    # 回归护栏：源文**未给** ddCalcu 的期望输出，因此这条不是「对拍」，而是「本批实算基线」。
    # 任何算法改动都会打红它 —— 它是护栏，不是证据。
    chk(info['ddCalcu'] == 'b3dfeb823487100e527ad0cb8366e5ec4219',
        'ddcalcu 本批实算基线（不是源文对拍值，仅作回归护栏）')

    # ---- iqiyi authkey
    chk(IQ_SALT == hashlib.md5(b'').hexdigest(), '爱奇艺"盐"就是 md5("")（不是保密常量）')
    chk(iqiyi_authkey('1625936950392', '8485811691506600') ==
        hashlib.md5(b'd41d8cd98f00b204e9800998ecf8427e1625936950392' + b'8485811691506600').hexdigest(),
        'authKey = md5(salt + tm + tvid)')
    # ★ 源文 line 92 与 line 136 各给了一条**完整样例 URL**，其中 authKey / tm / tvid 同时出现
    #   ⇒ 这两条是「源文自带的对拍向量」，不是本批自己编的。实算逐字符命中。
    chk(iqiyi_authkey('1625936950392', '8485811691506600') == 'c45e671cc7f74b52f477dc8fb32e27ba',
        '★ 源文 line 92 样例 URL 复算命中（authKey=c45e671c…）')
    chk(iqiyi_authkey('1625847214729', '4742103680293600') == 'f39c6550d42daea8c13722e0351a789c',
        '★ 源文 line 136 样例 URL 复算命中（authKey=f39c6550…）')
    chk(iqiyi_authkey('1', '2') != iqiyi_authkey('2', '1'), 'authKey 拼接顺序敏感（tm 在前）')
    chk(len(iqiyi_authkey('1', '2')) == 32, 'authKey 是 32 位 hex')
    # 源文 line 44：node 输出要取尾部 33 个字符再 strip ⇒ vf 是最后 32 位
    node_stdout = 'some noise from js\n8f2b8b04a29e5e8d0f10b8e7a7bc7668\n'
    chk(node_stdout[-33:].strip() == '8f2b8b04a29e5e8d0f10b8e7a7bc7668',
        '爱奇艺源文的 result[-33:] 切片口径')

    # ---- jiexi（解析接口族，§3C；两篇源文的密文都是源文自己给的 ⇒ 这是**对拍**不是自算）
    # ★ 两个常量由 `artifacts/skill-evolution/tools/b39-extract-ct.py` 从源文**程序抽取**
    #   （首次手抄 B_CT 漏了一个字符 'g'，导致断言红 —— 长常量一律不许手抄）。
    A_CT = (
        'JTY4JTc0JTc0JTcwJTczJTNBJTJGJTJGJTZEJTMzJTc1JTM4JTJFJTY3JTY5JTcyJTY5JTY3JTY5JT'
        'cyJTY5JTZDJTZGJTc2JTY1JTJFJTYzJTZGJTZEJTJGJTdBJTY5JTZBJTY5JTYxJTZFJTJGJTZGJTZD'
        'JTY0JTYxJTZFJTY5JTZEJTY1JTJGJTMyJTMwJTMyJTM1JTJGJTMwJTM0JTJGJTVBJTYxJTc0JTczJT'
        'c1JTU0JTYxJTYyJTY5JTU0JTY4JTYxJTc0JTczJTRBJTZGJTc1JTcyJTZFJTY1JTc5JTJGJTMwJTMx'
        'JTUwJTcyJTY1JTYxJTY5JTcyJTJGJTcwJTZDJTYxJTc5JTZDJTY5JTczJTc0JTJFJTZEJTMzJTc1JT'
        'M4'
    )
    B_CT = (
        'JTY4JTc0JTc0JTcwJTczJTNBJTJGJTJGJTc2JTJFJTcxJTcxJTJFJTYzJTZGJTZEJTJGJTc4JTJGJT'
        'YzJTZGJTc2JTY1JTcyJTJGJTMyJTc3JTMyJTZDJTY1JTY3JTc0JTMwJTY3JTM4JTdBJTMyJTM2JTYx'
        'JTZDJTJGJTc1JTMwJTMwJTMyJTM5JTM2JTcwJTM2JTc0JTM1JTMwJTJFJTY4JTc0JTZEJTZD'
    )
    l1a, plaina = jiexi_decode_layer1(A_CT)
    l1b, plainb = jiexi_decode_layer1(B_CT)
    chk(plaina == 'https://m3u8.girigirilove.com/zijian/oldanime/2025/04/'
                  'ZatsuTabiThatsJourney/01/1.m3u8' or plaina.endswith('.m3u8'),
        'jiexi 2016709 一层解码得合法地址（%s…）' % plaina[:42])
    chk(plainb == 'https://v.qq.com/x/cover/2w2legt0g8z26al/u00296p6t50.html',
        '★ jiexi 2033927 一层解码**逐字符命中源文明文**（源文 line 48 的 unescape 结果）')
    chk(len(l1a) == 3 * len(plaina) and len(l1b) == 3 * len(plainb),
        '★ jiexi 判据：一层长度 == 3 × 二层字符数（294==3×98 / 171==3×57）⇒ 每字节都编码')
    # 负对照：标准库的 encodeURIComponent/quote 会放过 alnum ⇒ 一定**更短**
    from urllib.parse import quote
    chk(len(quote(plainb, safe='')) < len(l1b),
        '★ 负对照：quote(safe="") 长 %d < 源文一层 %d ⇒ 源文那层**不是标准库函数**'
        % (len(quote(plainb, safe='')), len(l1b)))
    chk(l1b.startswith('%68%74%74%70%73%3A%2F%2F'),
        '★ jiexi 一层前缀 %68%74… = 连字母都被编码（源文两篇一致）')
    chk(fullpct_encode(plainb) == l1b, 'jiexi fullpct_encode 可**正向重造**源文密文层')
    raises(lambda: jiexi_decode_layer1(plainb), 'jiexi 拿明文当密文必须报错（长度/自洽拦截）')

    # ★ 纯标准库 AES-128 的自证：必须用 **FIPS-197 的原配向量**。
    #   ⚠️ 本断言第一版把「全零密钥」和「附录 C.1 的明文」配成一对 —— 那不是官方向量，
    #   红的是**断言**不是代码。教训：官方向量的 key/plaintext/ciphertext **三者必须原配**。
    _rks0 = _expand_key(bytes(16))
    chk(_aes128_block_encrypt(_rks0, bytes(16)).hex() == '66e94bd4ef8a2c3b884cfa59ca342b2e',
        '★ AES-128 单块加密命中 FIPS-197 官方向量（全零密钥 + 全零明文）')
    chk(_aes128_block_decrypt(_rks0, bytes.fromhex('66e94bd4ef8a2c3b884cfa59ca342b2e')) == bytes(16),
        'AES-128 块解密是块加密的逆')
    # FIPS-197 附录 B（key/plaintext/ciphertext **原配**）
    chk(_aes128_block_encrypt(_expand_key(bytes.fromhex('2b7e151628aed2a6abf7158809cf4f3c')),
                              bytes.fromhex('3243f6a8885a308d313198a2e0370734')).hex() ==
        '3925841d02dc09fbdc118597196a0b32',
        '★ AES-128 附录 B 向量（原配三元组；★ 全零向量抓不到行置换类 bug，必须有非零向量）')
    # FIPS-197 附录 C.1（原配三元组）
    chk(_aes128_block_encrypt(_expand_key(bytes.fromhex('000102030405060708090a0b0c0d0e0f')),
                              bytes.fromhex('00112233445566778899aabbccddeeff')).hex() ==
        '69c4e0d86a7b0430d8cdb78070b4c55a',
        '★ AES-128 附录 C.1 向量（原配三元组）')
    # ShiftRows 必须是**行循环移位**（列主序：下标 i 的 row = i%4、col = i//4）
    chk(_shift_rows(b'0123456789abcdef') == b'05af49e38d27c16b',
        'ShiftRows 逐行左移（本批手算期望值 05af49e38d27c16b）')
    _arb = bytes(range(16, 32))
    chk(_inv_shift_rows(_shift_rows(_arb)) == _arb and _shift_rows(_arb) != _arb,
        '★ ShiftRows 与 InvShiftRows 互逆，且真的改变了排列（非恒等）')

    _round = 'https://example.test/vod/AAAA.m3u8'
    chk(jiexi_decrypt_url(jiexi_encrypt_url(_round)) == _round,
        'jiexi 加密→解密 往返一致（PKCS7 补齐/剥离自洽）')
    chk(len(JX_KEY) == 16 and len(JX_IV) == 16, 'jiexi key/iv 各 16 字节 ⇒ AES-128')
    chk(JX_KEY != JX_IV, '★ jiexi key != iv（若相等 CBC 退化为 ECB 语义）')
    chk(JX_KEY.lower() == JX_IV.lower(),
        '★ jiexi key 与 iv **只差大小写**（ARTPLAYER… / Artplayer…，手工改模板的痕迹）')
    # 换 IV 必须解不出原文（CBC 的 IV 语义护栏；同时也证明 IV 真的参与了运算）
    _wrong = None
    try:
        _wrong = jiexi_decrypt_url(jiexi_encrypt_url(_round), iv=b'x' * 16)
    except Exception:
        _wrong = '<raises>'
    chk(_wrong != _round, 'jiexi 负对照：换 IV 后解不出原文（IV 真的参与运算）')
    # ★★ C7 对拍：源文**同时给了两个不同时点**的响应密文（各 240 字节）。
    #   用**同一组** key/iv 都必须解出合法 m3u8 —— 这就是「key/iv 跨请求固定」的机器判据。
    #   两个常量均由 `artifacts/skill-evolution/tools/b39-extract-aes-ct.py` **程序抽取**
    #   （首次手抄折行错位 ⇒ 解出错值；长常量一律不许手抄）。
    AES_CT_LATE = (      # 源文 line 213 的实解样本
        'n8DB0IMAq13Am1RbWthn17mGLk1OnfZv2xHDeWUzc2RAxgkcU1Xq6jmCHgycEIHKMwqGgVuafTQG'
        'pYmDB9xEOXE6yRXcawiUod7z1e2JeMxU2klBcUP95AcO3VDQXc5DkX6sLn3QFk/dV8h4E3guWjA0'
        'eRggAhokFVZkTNLIUp4b/mquxtgkpgv4rrH+HWY2Lx+u/1RFAlYlrt6wT+tq6SwHe3hiIQ4Upmzp'
        '9Zk/oIPte+w/fYViBhjoyRpTZd+ZNj1t96ItrKGgnTlyVjuHBv/vRtR8NunPGgFlOxaH3wF4KuBL'
        '4R4YjdNpT8WJB8D/'
    )
    AES_CT_EARLY = (     # 源文 line 110 的首个响应（与上一条**不同**）
        'n8DB0IMAq13Am1RbWthn17mGLk1OnfZv2xHDeWUzc2QlBpQ1dkmNAgpC3FBy8bQCV4jb47ZB3uvKp'
        '2Eq8hVrHnrF+jQkGkTf9HOId/3bJzgPwfXKn4h2g5fVTVJZZHu39+Q5OnoUstVa8w5jLufcp896FJ'
        '/FUlxYQa3tWIzOhiZgC8nDaBN/Y+txr2b5u3ZVWnUkM7AB6wBDoDCjhc2OX/jRdBDArq6tOPu6iXb'
        '8emtUiNNlcsSggPprYlhLfrXXDGNeqkFjPqIqhkXFWBDHOCoEkMPQ8S91iZm47Q1p95Bk8F2Vfco'
        'PqkrsziEq7S91'
    )
    import base64 as _b64
    _late = jiexi_decrypt_url(AES_CT_LATE)
    _early = jiexi_decrypt_url(AES_CT_EARLY)
    chk(_late != _early and AES_CT_LATE != AES_CT_EARLY,
        '★ C7 两个密文**互不相同**（同一 api.php 的两次响应）')
    chk(len(_b64.b64decode(AES_CT_LATE)) == 240 and len(_b64.b64decode(AES_CT_EARLY)) == 240,
        '★ C4 两份密文均 240 字节（16 的倍数，= 15 个 AES 块）')
    chk(all(u.startswith('https://ts.key.') and u.endswith('.m3u8') for u in (_late, _early)),
        '★★ C7 判据：**同一组 key/iv 解出两个不同的合法 m3u8** ⇒ key/iv 跨请求固定'
        '（源文只解了其中一个，本库补出第二个 ⇒ 该结论从「单样本」升到「2 样本」）')
    # 路径末段是 base64（含 '=' 填充，URL 编码为 %3D）—— 地址形态判据
    # ⚠️ 必须**整段 unquote**（段内还有 %2F / %2B 等），只把 %3D 换成 '=' 会 padding 错。
    from urllib.parse import unquote as _uq
    _seg = _uq(_late.split('/')[-1].replace('.m3u8', ''))
    chk(_late.split('/')[-1].endswith('%3D.m3u8') and _seg.endswith('=') and
        len(_b64.b64decode(_seg)) == 128,
        '★ 地址形态：路径末段是 128 字节的 base64（172 字符含 %3D）—— 下一层用途仍是 gap')
    chk(all(c in '0123456789ABCDEF' for c in l1b[1:3]),
        'jiexi 一层 %XX 是**大写** hex（源文一致）')

    print('playback_address selftest: %d/%d' % (ok, n))
    return 0 if ok == n else 1


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def main(argv=None):
    ap = argparse.ArgumentParser(description='播放地址还原层 oracle（§0 层）')
    ap.add_argument('--selftest', action='store_true')
    sub = ap.add_subparsers(dest='cmd')

    p1 = sub.add_parser('charcodes', help='字符码表族解码（*104*116…）')
    p1.add_argument('--input', required=True)
    p1.add_argument('--sep', default='*')
    p1.add_argument('--skip-first', type=int, default=1)
    p1.add_argument('--json', action='store_true')

    p2 = sub.add_parser('qingting', help='蜻蜓FM 电台地址')
    p2.add_argument('--id', required=True, help='电台 id（path 里的那段）')
    p2.add_argument('--ts-unix', type=int, default=None, help='不传则用当前时间')
    p2.add_argument('--ts-offset', type=int, default=3600)
    p2.add_argument('--ts-case', choices=['upper', 'lower'], default='upper')
    p2.add_argument('--app-id', default='web')
    p2.add_argument('--json', action='store_true')

    p3 = sub.add_parser('migu-ddcalcu', help='咪咕 playurl 的 ddCalcu')
    p3.add_argument('--url', required=True)
    p3.add_argument('--json', action='store_true')

    p4 = sub.add_parser('iqiyi-authkey', help='爱奇艺 dash 的 authKey')
    p4.add_argument('--tm', required=True, help='13 位毫秒时间戳')
    p4.add_argument('--tvid', required=True)
    p4.add_argument('--json', action='store_true')

    p5 = sub.add_parser('jiexi-l1', help='解析接口族第一层：Base64 → 全字节 %XX → 明文地址')
    p5.add_argument('--input', required=True, help='HTML 里 aaa= / player_aaaa= 的那串')
    p5.add_argument('--json', action='store_true')

    p6 = sub.add_parser('jiexi-aes', help='解析接口族第三层：AES-CBC 解 api.php 返回的 url 字段')
    p6.add_argument('--input', required=True, help='api.php 响应 JSON 里的 url 字段')
    p6.add_argument('--key', default=JX_KEY.decode())
    p6.add_argument('--iv', default=JX_IV.decode())
    p6.add_argument('--json', action='store_true')

    args = ap.parse_args(argv)
    if args.selftest:
        return selftest()
    if not args.cmd:
        ap.print_help()
        return 2

    if args.cmd == 'charcodes':
        val = charcodes_decode(args.input, sep=args.sep, skip_first=args.skip_first)
        print(json.dumps({'decoded': val}, ensure_ascii=False) if args.json else val)
    elif args.cmd == 'qingting':
        url, meta = qingting_url(args.id, ts_unix=args.ts_unix, ts_offset=args.ts_offset,
                                 ts_case=args.ts_case, app_id=args.app_id)
        print(json.dumps({'url': url, **meta}, ensure_ascii=False, indent=2) if args.json else url)
    elif args.cmd == 'migu-ddcalcu':
        url, meta = migu_ddcalcu(args.url)
        print(json.dumps({'url': url, **meta}, ensure_ascii=False, indent=2) if args.json else url)
    elif args.cmd == 'iqiyi-authkey':
        val = iqiyi_authkey(args.tm, args.tvid)
        print(json.dumps({'authKey': val}, ensure_ascii=False) if args.json else val)
    elif args.cmd == 'jiexi-l1':
        layer1, plain = jiexi_decode_layer1(args.input)
        if args.json:
            print(json.dumps({'layer1': layer1, 'plain': plain,
                              'len_layer1': len(layer1), 'len_plain': len(plain)},
                             ensure_ascii=False, indent=2))
        else:
            print(plain)
    elif args.cmd == 'jiexi-aes':
        val = jiexi_decrypt_url(args.input, key=args.key.encode('utf-8'),
                                iv=args.iv.encode('utf-8'))
        print(json.dumps({'url': val}, ensure_ascii=False, indent=2) if args.json else val)
    return 0


if __name__ == '__main__':
    sys.exit(main())
