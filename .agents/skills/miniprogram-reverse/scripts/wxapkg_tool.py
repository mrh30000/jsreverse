#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wxapkg_tool.py —— 小程序包「识别 / 解密 / 列举 / 提取」零依赖工具

适用对象（按 magic 自动分流）：
  * `V1MMWX`  —— **PC 微信**下载到本地的加密包（需解密，算法见下）
  * `0xBE … 0xED` —— 明文 wxapkg（**安卓端 / 解包后**的都是这个，无需解密）
  * `TPKG`    —— 抖音小程序包（.pkg / .ttpkg.js，**不加密**，结构见 references/unpack-and-decrypt.md）
  * `tar`     —— 支付宝小程序源码包（`nebulaInstallApps/<tinyAppId>/*.tar`，**不加密**）
  * `gzip`    —— 少数平台把 wxapkg 再压一层

PC 微信加密包的算法（社区多份实现一致，见 references/unpack-and-decrypt.md §1）：
  1. 文件布局 = `magic(6B "V1MMWX") + aesBlock(1024B) + xorBody(其余全部)`
  2. key = PBKDF2-HMAC-SHA1(passphrase = **小程序 wxid**, salt = `saltiest`, iter = 1000, dkLen = 32)
  3. iv  = `"the iv: 16 bytes"`（字面量，16 字节）
  4. aesBlock 用 AES-256-CBC 解密；**PKCS7 填充后的明文长度正好 1024 ⇒ 真实头部是前 1023 字节**
     （这也是为什么"取前 1023 字节"和"unpad"在这份格式里等价——本工具两条都验）
  5. xorBody 逐字节异或 `xorKey`；`xorKey = ord(wxid[-2])`（倒数第 2 个字符）；
     **wxid 长度 < 2 时 xorKey = 0x66（字符 'f'）**（兜底值，容易漏）

wxapkg（明文）索引布局（社区 `unveilr` / `wxappUnpacker` 实现）：
    [0]      u8   0xBE           firstMark
    [1..4]   u32BE info1
    [5]      u8   0xED           lastMark
    [6..9]   u32BE info2
    [10..13] u32BE indexInfoLength
    [14..17] u32BE bodyInfoLength
    [18..21] u32BE fileCount
    然后 fileCount 条：u32BE nameLen + name(utf-8) + u32BE offset + u32BE size
  文件内容按 offset/size 从包内取。

⚠️ 本工具**只做"规范化搬运"**：把包变成可读的工程目录，加密算法一律照抄站方实现，
   不猜测、不发明。所有子命令都带 `--selftest` 自检（含往返与边界）。

用法：
  python wxapkg_tool.py identify  <包> [...]
  python wxapkg_tool.py decrypt   --in <加密包> --out <包> --wxid wx1234567890abcdef [--head-bytes 1023]
  python wxapkg_tool.py list      <包> [--json]
  python wxapkg_tool.py extract   <包> -o <目录>
  python wxapkg_tool.py --selftest
"""

import argparse
import hashlib
import json
import os
import struct
import sys

WXAPKG_FIRST_MARK = 0xBE
WXAPKG_LAST_MARK = 0xED
PC_MAGIC = b"V1MMWX"
DEFAULT_IV = b"the iv: 16 bytes"
DEFAULT_SALT = b"saltiest"
DEFAULT_ITER = 1000
DEFAULT_HEAD_BYTES = 1023
FALLBACK_XOR_KEY = 0x66


# --------------------------------------------------------------------------- 算法

def pbkdf2_key(wxid, salt=DEFAULT_SALT, iterations=DEFAULT_ITER, dklen=32):
    """PBKDF2-HMAC-SHA1 派生 AES key。"""
    return hashlib.pbkdf2_hmac("sha1", wxid.encode("utf-8"), salt, iterations, dklen)


def xor_key_byte(wxid):
    """xorKey = 倒数第 2 个字符；wxid 长度 < 2 时兜底 0x66（'f'）。

    边界：`wxid` 为单字符 / 空串时**绝不能**取 `wxid[-2]`（会 IndexError 或越界取到别的字符），
    必须走兜底 —— 这一支在样本里永远遇不到，只能靠自检覆盖。
    """
    if len(wxid) < 2:
        return FALLBACK_XOR_KEY
    return ord(wxid[-2])


def _aes_cbc_decrypt(key, iv, data):
    """AES-CBC 解密。优先 pycryptodome；缺失时退到纯 Python 实现。"""
    if len(data) % 16 != 0:
        raise ValueError(f"AES 块长度必须是 16 的倍数，实际 {len(data)}")
    try:
        from Crypto.Cipher import AES  # type: ignore

        return AES.new(key, AES.MODE_CBC, iv).decrypt(data)
    except ImportError:
        pass
    try:
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes  # type: ignore

        dec = Cipher(algorithms.AES(key), modes.CBC(iv)).decryptor()
        return dec.update(data) + dec.finalize()
    except ImportError:
        pass
    return _aes_cbc_decrypt_py(key, iv, data)


# --- 纯 Python AES-128/192/256-CBC 解密（零依赖兜底，约 120 行） -----------------

_SBOX = None


def _build_sbox():
    global _SBOX
    if _SBOX is not None:
        return _SBOX
    p = q = 1
    sbox = [0] * 256
    while True:
        p = (p ^ ((p << 1) & 0xFF) ^ (0x1B if p & 0x80 else 0)) & 0xFF
        q ^= (q << 1) & 0xFF
        q ^= (q << 2) & 0xFF
        q ^= (q << 4) & 0xFF
        q &= 0xFF
        if q & 0x80:
            q ^= 0x09
        q &= 0xFF
        x = q ^ ((q << 1) | (q >> 7)) ^ ((q << 2) | (q >> 6)) ^ ((q << 3) | (q >> 5)) ^ ((q << 4) | (q >> 4))
        sbox[p] = (x ^ 0x63) & 0xFF
        if p == 1:
            break
    sbox[0] = 0x63
    _SBOX = sbox
    return sbox


def _xtime(a):
    a <<= 1
    return (a ^ 0x1B) & 0xFF if a & 0x100 else a


def _mul(a, b):
    r = 0
    for _ in range(8):
        if b & 1:
            r ^= a
        b >>= 1
        a = _xtime(a)
    return r & 0xFF


def _expand_key(key):
    sbox = _build_sbox()
    nk = len(key) // 4
    nr = nk + 6
    w = [list(key[4 * i:4 * i + 4]) for i in range(nk)]
    rcon = 1
    for i in range(nk, 4 * (nr + 1)):
        t = list(w[i - 1])
        if i % nk == 0:
            t = t[1:] + t[:1]
            t = [sbox[b] for b in t]
            t[0] ^= rcon
            rcon = _xtime(rcon)
        elif nk > 6 and i % nk == 4:
            t = [sbox[b] for b in t]
        w.append([w[i - nk][j] ^ t[j] for j in range(4)])
    return w, nr


def _decrypt_block(block, w, nr):
    sbox = _build_sbox()
    inv = [0] * 256
    for i, v in enumerate(sbox):
        inv[v] = i
    state = [list(block[i::4]) for i in range(4)]  # 列主序

    def add_round_key(rnd):
        for c in range(4):
            word = w[rnd * 4 + c]
            for r in range(4):
                state[r][c] ^= word[r]

    def inv_shift_rows():
        for r in range(1, 4):
            state[r] = state[r][-r:] + state[r][:-r]

    def inv_sub_bytes():
        for r in range(4):
            for c in range(4):
                state[r][c] = inv[state[r][c]]

    def inv_mix_columns():
        for c in range(4):
            a = [state[r][c] for r in range(4)]
            state[0][c] = _mul(a[0], 14) ^ _mul(a[1], 11) ^ _mul(a[2], 13) ^ _mul(a[3], 9)
            state[1][c] = _mul(a[0], 9) ^ _mul(a[1], 14) ^ _mul(a[2], 11) ^ _mul(a[3], 13)
            state[2][c] = _mul(a[0], 13) ^ _mul(a[1], 9) ^ _mul(a[2], 14) ^ _mul(a[3], 11)
            state[3][c] = _mul(a[0], 11) ^ _mul(a[1], 13) ^ _mul(a[2], 9) ^ _mul(a[3], 14)

    add_round_key(nr)
    for rnd in range(nr - 1, 0, -1):
        inv_shift_rows()
        inv_sub_bytes()
        add_round_key(rnd)
        inv_mix_columns()
    inv_shift_rows()
    inv_sub_bytes()
    add_round_key(0)
    return bytes(state[r][c] for c in range(4) for r in range(4))


def _aes_cbc_decrypt_py(key, iv, data):
    w, nr = _expand_key(key)
    out = bytearray()
    prev = iv
    for i in range(0, len(data), 16):
        blk = data[i:i + 16]
        dec = _decrypt_block(blk, w, nr)
        out += bytes(a ^ b for a, b in zip(dec, prev))
        prev = blk
    return bytes(out)


# --------------------------------------------------------------------------- 识别

def identify(data):
    """返回 (kind, 说明)。kind ∈ wechat-pc-encrypted / wxapkg-plain / douyin-pkg / tar / gzip / unknown"""
    if data.startswith(PC_MAGIC):
        return "wechat-pc-encrypted", "PC 微信加密包（首 6 字节 V1MMWX），需 decrypt"
    if len(data) > 21 and data[0] == WXAPKG_FIRST_MARK and data[5] == WXAPKG_LAST_MARK:
        return "wxapkg-plain", "明文 wxapkg（安卓端 / 已解密）"
    if data.startswith(b"TPKG"):
        return "douyin-pkg", "抖音小程序包（TPKG），明文"
    if data[:2] == b"\x1f\x8b":
        return "gzip", "gzip 压缩（先解压再看内层 magic）"
    if len(data) > 262 and data[257:262] == b"ustar":
        return "tar", "tar 归档（支付宝小程序源码包）"
    return "unknown", "未识别 magic，用 --hex 看头 32 字节再人工判"


# --------------------------------------------------------------------------- 解密

def _unpad_pkcs7(buf):
    """返回 (unpadded, pad_len)；pad 非法时返回 (buf, 0) 表示"没敢动"。"""
    if not buf:
        return buf, 0
    n = buf[-1]
    if 1 <= n <= 16 and buf[-n:] == bytes([n]) * n:
        return buf[:-n], n
    return buf, 0


def decrypt_pc_pkg(blob, wxid, head_bytes=DEFAULT_HEAD_BYTES):
    """PC 微信加密包 → 明文 wxapkg 字节串。

    返回 dict：{ok, out, kind, xor_key, pad_len, tail_ok, warn[]}
    """
    warn = []
    if not blob.startswith(PC_MAGIC):
        return {"ok": False, "out": b"", "warn": ["首 6 字节不是 V1MMWX，不是 PC 加密包（安卓端本来就不加密）"]}
    body = blob[6:]
    if len(body) < 1024:
        return {"ok": False, "out": b"", "warn": [f"magic 之后不足 1024 字节（实际 {len(body)}）"]}
    head_enc, tail = body[:1024], body[1024:]

    key = pbkdf2_key(wxid)
    plain = _aes_cbc_decrypt(key, DEFAULT_IV, head_enc)

    unpadded, pad_len = _unpad_pkcs7(plain)
    head = plain[:head_bytes]
    if unpad_ok := (len(unpadded) == head_bytes):
        head = unpadded
    else:
        warn.append(
            f"PKCS7 校验异常（pad_len={pad_len}，去填充后 {len(unpadded)} ≠ {head_bytes}）"
            f" ⇒ 已按 {head_bytes} 字节硬切；**大概率 wxid 用错了**（wxid 错时 AES 仍会稳定输出 1024 字节随机数据，"
            f"只是 xor 之后体部全乱、头部无 magic）"
        )

    xk = xor_key_byte(wxid)
    out = head + bytes(b ^ xk for b in tail)
    return {
        "ok": True,
        "out": out,
        "kind": identify(out)[0],
        "xor_key": xk,
        "pad_len": pad_len,
        "unpad_ok": unpad_ok,
        "tail_bytes": len(tail),
        "warn": warn,
    }


def encrypt_pc_pkg(plain_pkg, wxid, head_bytes=DEFAULT_HEAD_BYTES):
    """逆向函数：给自检造夹具用。注意 PKCS7 padding 由 head_bytes 决定（1023 → pad 0x01）。"""
    key = pbkdf2_key(wxid)
    head = plain_pkg[:head_bytes]
    tail = plain_pkg[head_bytes:]
    pad_len = 16 - (len(head) % 16)
    padded = head + bytes([pad_len]) * pad_len
    enc = _aes_cbc_encrypt(key, DEFAULT_IV, padded)
    xk = xor_key_byte(wxid)
    return PC_MAGIC + enc + bytes(b ^ xk for b in tail)


def _aes_cbc_encrypt(key, iv, data):
    """仅供自检使用的最小 AES-CBC 加密（走同一份 round function 的逆序）。"""
    w, nr = _expand_key(key)

    def encrypt_block(block):
        sbox = _build_sbox()
        state = [list(block[i::4]) for i in range(4)]

        def add_round_key(rnd):
            for c in range(4):
                word = w[rnd * 4 + c]
                for r in range(4):
                    state[r][c] ^= word[r]

        def sub_bytes():
            for r in range(4):
                for c in range(4):
                    state[r][c] = sbox[state[r][c]]

        def shift_rows():
            for r in range(1, 4):
                state[r] = state[r][r:] + state[r][:r]

        def mix_columns():
            for c in range(4):
                a = [state[r][c] for r in range(4)]
                state[0][c] = _mul(a[0], 2) ^ _mul(a[1], 3) ^ a[2] ^ a[3]
                state[1][c] = a[0] ^ _mul(a[1], 2) ^ _mul(a[2], 3) ^ a[3]
                state[2][c] = a[0] ^ a[1] ^ _mul(a[2], 2) ^ _mul(a[3], 3)
                state[3][c] = _mul(a[0], 3) ^ a[1] ^ a[2] ^ _mul(a[3], 2)

        add_round_key(0)
        for rnd in range(1, nr):
            sub_bytes()
            shift_rows()
            mix_columns()
            add_round_key(rnd)
        sub_bytes()
        shift_rows()
        add_round_key(nr)
        return bytes(state[r][c] for c in range(4) for r in range(4))

    out = bytearray()
    prev = iv
    for i in range(0, len(data), 16):
        blk = encrypt_block(bytes(a ^ b for a, b in zip(data[i:i + 16], prev)))
        out += blk
        prev = blk
    return bytes(out)


# --------------------------------------------------------------------------- 索引

def parse_index(data):
    """解析明文 wxapkg 索引。返回 dict{ok, header, files[], warn[]}"""
    warn = []
    if len(data) < 22:
        return {"ok": False, "header": {}, "files": [], "warn": ["包长不足 22 字节"]}
    first, last = data[0], data[5]
    if first != WXAPKG_FIRST_MARK or last != WXAPKG_LAST_MARK:
        return {
            "ok": False,
            "header": {},
            "files": [],
            "warn": [f"magic 不符（[0]=0x{first:02X} 期望 0xBE，[5]=0x{last:02X} 期望 0xED）"],
        }
    info1 = struct.unpack(">I", data[1:5])[0]
    info2 = struct.unpack(">I", data[6:10])[0]
    index_len = struct.unpack(">I", data[10:14])[0]
    body_len = struct.unpack(">I", data[14:18])[0]
    count = struct.unpack(">I", data[18:22])[0]
    header = {
        "firstMark": first, "info1": info1, "lastMark": last, "info2": info2,
        "indexInfoLength": index_len, "bodyInfoLength": body_len, "fileCount": count,
    }
    files = []
    off = 22
    for i in range(count):
        if off + 4 > len(data):
            warn.append(f"第 {i} 条索引越界（off={off}）")
            break
        nlen = struct.unpack(">I", data[off:off + 4])[0]
        off += 4
        if off + nlen + 8 > len(data):
            warn.append(f"第 {i} 条文件名越界（nlen={nlen}）")
            break
        name = data[off:off + nlen].decode("utf-8", "replace")
        off += nlen
        foff, fsize = struct.unpack(">II", data[off:off + 8])
        off += 8
        files.append({"name": name, "offset": foff, "size": fsize})
    real = [f for f in files if f["offset"] + f["size"] <= len(data)]
    if len(real) != len(files):
        warn.append(f"{len(files) - len(real)} 条索引指向包外（offset+size 超出 {len(data)}）")
    return {"ok": True, "header": header, "files": files, "warn": warn}


def build_plain_pkg(entries, appid="wx1234567890abcdef"):
    """构造明文 wxapkg（自检夹具）。entries = [(name, bytes), ...]

    索引区长度 = 22 + Σ(4 + len(name) + 8)，文件内容紧跟索引区之后 ⇒ offset 必须**先算索引区总长**，
    所以这里分两趟：第一趟算长度，第二趟才填 offset（一趟写死会把 offset 写错，而"文件名对、内容错"很难发现）。
    """
    index_len = 22 + sum(4 + len(n.encode("utf-8")) + 8 for n, _ in entries)
    index = bytearray()
    body = bytearray()
    for name, blob in entries:
        nb = name.encode("utf-8")
        index += struct.pack(">I", len(nb)) + nb + struct.pack(">II", index_len + len(body), len(blob))
        body += blob
    header = (bytes([WXAPKG_FIRST_MARK]) + struct.pack(">I", 0) + bytes([WXAPKG_LAST_MARK])
              + struct.pack(">IIII", 0, index_len, len(body), len(entries)))
    return header + bytes(index) + bytes(body)


# --------------------------------------------------------------------------- 自检

def selftest():
    checks = []

    def ck(name, cond, extra=""):
        checks.append((name, bool(cond), extra))

    px = lambda b: b.hex()

    # 0) 纯 Python AES 与已知向量对齐（FIPS-197 CBC 向量，NIST SP800-38A F.2.1）
    key = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")
    iv = bytes.fromhex("000102030405060708090a0b0c0d0e0f")
    ct = bytes.fromhex(
        "7649abac8119b246cee98e9b12e9197d"
        "5086cb9b507219ee95db113a917678b2"
        "73bed6b8e3c1743b7116e69e22229516"
        "3ff1caa1681fac09120eca307586e1a7")
    pt = _aes_cbc_decrypt_py(key, iv, ct)
    ck("NIST-SP800-38A F.2.1 CBC 解密", px(pt) ==
       "6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e51"
       "30c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710", px(pt)[:32])
    enc = _aes_cbc_encrypt(key, iv, pt)
    ck("AES-CBC 加密↔解密往返", enc == ct)

    # 1) xorKey 边界
    ck("xorKey: 正常 wxid 取倒数第 2 个字符", xor_key_byte("wx1234567890abcdef") == ord("e"), hex(xor_key_byte("wx1234567890abcdef")))
    ck("xorKey: 单字符 wxid → 兜底 0x66", xor_key_byte("x") == 0x66)
    ck("xorKey: 空 wxid → 兜底 0x66（不得抛异常）", xor_key_byte("") == 0x66)

    # 2) PC 包加解密往返
    #    注意：PC 加密包的最小合法尺寸是 `6(magic) + 1024(aes) + xorBody`，
    #    所以夹具必须 > 1023 字节，否则"头部 1023 字节"这一刀就把整个包吃掉了（round trip 必然失败）。
    big = b"// " + bytes(range(256)) * 20  # 5123 B
    fixture = build_plain_pkg([("app-service.js", big), ("app.json", b'{"pages":[]}')])
    ck("夹具长度 > 1023（PC 加密包的最小合法尺寸前提）", len(fixture) > 1023, str(len(fixture)))
    for wxid in ["wx1234567890abcdef", "x", ""]:
        blob = encrypt_pc_pkg(fixture, wxid)
        r = decrypt_pc_pkg(blob, wxid)
        ck(f"PC 包往返 wxid={wxid!r}", r["ok"] and r["out"] == fixture and r["unpad_ok"])
        ck(f"PC 包往返后 identify = wxapkg-plain wxid={wxid!r}", identify(r["out"])[0] == "wxapkg-plain")

    # 3) 头部 1023 字节语义：PKCS7 padding 恰为 1 字节
    ck("1023 字节头部 + PKCS7 ⇒ pad_len == 1", len(_unpad_pkcs7(b"Z" * 1023 + b"\x01")[0]) == 1023)

    # 4) 错 wxid 必须"能跑但判得出来"
    wrong = decrypt_pc_pkg(encrypt_pc_pkg(fixture, "wx1234567890abcdef"), "wx000000000000000000")
    ck("错 wxid → 头部 magic 立刻不对（tail 全乱）", wrong["ok"] and identify(wrong["out"])[0] != "wxapkg-plain")
    ck("错 wxid → 输出 unpad 校验失败并给出 warn", not wrong["unpad_ok"] and any("wxid" in w for w in wrong["warn"]))

    # 5) t/magic 识别
    ck("identify: PC 加密包", identify(encrypt_pc_pkg(fixture, "wx1234567890abcdef"))[0] == "wechat-pc-encrypted")
    ck("identify: 抖音 TPKG", identify(b"TPKG\x00\x00\x01\x02rest")[0] == "douyin-pkg")
    ck("identify: gzip", identify(b"\x1f\x8b\x08\x00" + b"\0" * 20)[0] == "gzip")
    ck("identify: 未知 magic 不误判", identify(b"ZZZZZZZZZZZZZZZZZZZZZZZZ")[0] == "unknown")
    ck("identify: 只有 0xBE 没有 0xED 不误判为明文包", identify(bytes([0xBE]) + b"\0" * 30)[0] == "unknown")

    # 6) 明文包索引往返
    info = parse_index(fixture)
    ck("plain pkg 索引解析 ok", info["ok"] and not info["warn"], str(info["warn"]))
    ck("plain pkg 文件数正确", info["header"]["fileCount"] == 2 and len(info["files"]) == 2)
    ck("plain pkg 文件名正确", [f["name"] for f in info["files"]] == ["app-service.js", "app.json"])
    got = [fixture[f["offset"]:f["offset"] + f["size"]] for f in info["files"]]
    ck("plain pkg 取出的内容与写入一致", got[0] == big and got[1] == b'{"pages":[]}')
    ck("plain pkg 索引区长度声明与实际一致", info["header"]["indexInfoLength"] == 22 + sum(
        4 + len(f["name"].encode()) + 8 for f in info["files"]))

    # 7) 索引损坏必须报 warn 而不是静默漏文件
    #    ⚠️ 截断点不同会走到**两个不同的分支**，必须各自有用例（B20 教训：测不到的分支等于没写）：
    #      A. 截在"下一条索引头都读不全"处  → 走「第 i 条索引越界」
    #      B. 截在"名字读不全"处            → 走「第 i 条文件名越界」
    #    截在 30 字节只会触发 B；只测 B 的话 A 永远没有覆盖。
    n0 = 22 + 4 + len("app-service.js".encode()) + 8   # 第 0 条索引结束位置
    ti_a = parse_index(fixture[:n0 + 2])               # A：第 1 条索引头读不全
    ti_b = parse_index(fixture[:30])                   # B：第 0 条名字读不全
    ck("索引截断 A（下一条索引头读不全）→ 有 warn 且指明「索引越界」",
       (not ti_a["ok"]) or any("索引越界" in w for w in ti_a["warn"]), str(ti_a["warn"]))
    ck("索引截断 B（名字读不全）→ 有 warn 且指明「文件名越界」",
       (not ti_b["ok"]) or any("文件名越界" in w for w in ti_b["warn"]), str(ti_b["warn"]))
    ck("两种截断都不静默（warn 非空或 ok=False）",
       ((not ti_a["ok"]) or bool(ti_a["warn"])) and ((not ti_b["ok"]) or bool(ti_b["warn"])))

    bad = bytearray(fixture)
    bad[0] = 0x00
    ck("firstMark 被改 → ok=False", not parse_index(bytes(bad))["ok"])

    ok = sum(1 for _, c, _ in checks if c)
    for name, cond, extra in checks:
        print(("  ✓ " if cond else "  ✗ ") + name + (("   [" + extra + "]") if (extra and not cond) else ""))
    print(f"\n自检 {ok}/{len(checks)} 通过")
    return 0 if ok == len(checks) else 1


# --------------------------------------------------------------------------- CLI

def main(argv=None):
    ap = argparse.ArgumentParser(description="小程序包识别 / 解密 / 列举 / 提取（零依赖）")
    ap.add_argument("--selftest", action="store_true")
    sub = ap.add_subparsers(dest="cmd")

    p = sub.add_parser("identify")
    p.add_argument("files", nargs="+")

    p = sub.add_parser("decrypt")
    p.add_argument("--in", dest="src", required=True)
    p.add_argument("--out", dest="dst", required=True)
    p.add_argument("--wxid", required=True, help="小程序 appid，如 wx1234567890abcdef（**错一个字符就全废，且不报错**）")
    p.add_argument("--head-bytes", type=int, default=DEFAULT_HEAD_BYTES)

    p = sub.add_parser("list")
    p.add_argument("pkg")
    p.add_argument("--json", action="store_true")

    p = sub.add_parser("extract")
    p.add_argument("pkg")
    p.add_argument("-o", "--outdir", required=True)

    args = ap.parse_args(argv)
    if args.selftest:
        return selftest()
    if args.cmd == "identify":
        for f in args.files:
            with open(f, "rb") as fh:
                head = fh.read(4096)
            size = os.path.getsize(f)
            kind, desc = identify(head)
            print(f"{kind:22s} {size:>10d}B  {f}\n{'':22s} {desc}")
        return 0
    if args.cmd == "decrypt":
        blob = open(args.src, "rb").read()
        r = decrypt_pc_pkg(blob, args.wxid, args.head_bytes)
        for w in r["warn"]:
            print("[warn] " + w, file=sys.stderr)
        if not r["ok"]:
            return 2
        open(args.dst, "wb").write(r["out"])
        kind, desc = identify(r["out"])
        print(f"解密完成 → {args.dst}")
        print(f"  xorKey=0x{r['xor_key']:02X} pad_len={r['pad_len']} unpad_ok={r['unpad_ok']} tail={r['tail_bytes']}B")
        print(f"  产物识别：{kind} —— {desc}")
        return 0 if kind == "wxapkg-plain" else 3
    if args.cmd in ("list", "extract"):
        data = open(args.pkg, "rb").read()
        kind, desc = identify(data)
        if kind != "wxapkg-plain":
            print(f"[!] 该包识别为 {kind}（{desc}）；本命令只处理明文 wxapkg", file=sys.stderr)
            return 2
        info = parse_index(data)
        for w in info["warn"]:
            print("[warn] " + w, file=sys.stderr)
        if args.cmd == "list":
            if args.json:
                print(json.dumps(info, ensure_ascii=False, indent=2))
            else:
                print(f"fileCount={info['header']['fileCount']}  包内文件 {len(info['files'])} 个")
                for f in info["files"]:
                    print(f"  {f['size']:>8d}B  @0x{f['offset']:06X}  {f['name']}")
            return 0
        for f in info["files"]:
            dst = os.path.join(args.outdir, f["name"].lstrip("/"))
            os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
            with open(dst, "wb") as fh:
                fh.write(data[f["offset"]:f["offset"] + f["size"]])
        print(f"提取 {len(info['files'])} 个文件 → {args.outdir}")
        return 0
    ap.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
