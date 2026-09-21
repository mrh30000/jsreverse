#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
media_crypto.py — 流媒体内容解密的零依赖密码学工具箱

覆盖 A/B/C 层用得到的算法：
  * AES-128/192/256 · ECB / CBC / CTR   （纯 Python 实现，S 盒由 GF(2^8) 逆元生成，非手工转录）
  * SM4 (GB/T 32907-2016) · ECB / CBC / CTR
  * dcm —— CDRM 式「1 次 CTR + N 次 XOR」混合块模式

为什么零依赖：本机 Python 无 Crypto / gmssl / cryptography。
S 盒一律程序化生成 + 标准测试向量自检，避免手工抄表抄错一位而**静默**出错。

用法：
  python media_crypto.py --selftest
  python media_crypto.py aes-cbc  --input seg.ts --out clear.ts --key-hex <hex> --iv-hex <hex>
  python media_crypto.py aes-cbc  --input seg.ts --out clear.ts --key-utf8 <16字符> --iv-utf8 <16字符> --strip-crc16
  python media_crypto.py aes-ctr  --input seg.bin --out clear.bin --key-hex <hex> --iv-hex <hex>
  python media_crypto.py sm4-cbc  --input seg.ts --out clear.ts --key-hex <hex> --iv-hex <hex>
  python media_crypto.py sm4-ecb  --input blk.bin --out clear.bin --key-hex <hex>   # 无填充
  python media_crypto.py dcm      --input nalu.bin --out nalu.clear.bin --key-hex <hex> --iv-hex <hex> \
                                  --ctr-blocks 1 --xor-blocks 9 --total-rounds 10 --strip-crc16

退出码：0 成功；1 参数/IO 错误；2 自检失败。
"""

import argparse
import binascii
import os
import sys

# ---------------------------------------------------------------------------
# AES —— S 盒程序化生成（GF(2^8)，模 0x11B），附 FIPS-197 测试向量自检
# ---------------------------------------------------------------------------

def _gmul(a: int, b: int) -> int:
    p = 0
    for _ in range(8):
        if b & 1:
            p ^= a
        hi = a & 0x80
        a = (a << 1) & 0xFF
        if hi:
            a ^= 0x1B
        b >>= 1
    return p


def _build_aes_sbox():
    # 乘法逆元（0 的逆元规定为 0），再做仿射变换
    inv = [0] * 256
    for i in range(1, 256):
        x = 1
        e = 254                      # a^254 = a^-1 in GF(2^8)*
        base = i
        while e:
            if e & 1:
                x = _gmul(x, base)
            base = _gmul(base, base)
            e >>= 1
        inv[i] = x

    def rotl8(v, n):
        return ((v << n) | (v >> (8 - n))) & 0xFF

    sbox = []
    for i in range(256):
        v = inv[i]
        sbox.append((v ^ rotl8(v, 1) ^ rotl8(v, 2) ^ rotl8(v, 3) ^ rotl8(v, 4) ^ 0x63) & 0xFF)
    return sbox


AES_SBOX = _build_aes_sbox()
AES_INV_SBOX = [0] * 256
for _i, _v in enumerate(AES_SBOX):
    AES_INV_SBOX[_v] = _i
AES_RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1B, 0x36, 0x6C, 0xD8, 0xAB, 0x4D]

# --slow-selftest 开关（SM4 百万次迭代向量，纯 Python 约 38 秒）
_SLOW = False


def _xtime(a):
    a <<= 1
    return (a ^ 0x1B) & 0xFF if a & 0x100 else a & 0xFF


class AES:
    """AES 分组加密（仅实现加密方向；解密用逆轮）"""

    def __init__(self, key: bytes):
        if len(key) not in (16, 24, 32):
            raise ValueError('AES key 长度必须是 16/24/32 字节，收到 %d 字节' % len(key))
        self.nk = len(key) // 4
        self.nr = self.nk + 6
        self.rk = self._expand(key)

    def _expand(self, key: bytes):
        nk, nr = self.nk, self.nr
        w = [list(key[4 * i:4 * i + 4]) for i in range(nk)]
        for i in range(nk, 4 * (nr + 1)):
            t = list(w[i - 1])
            if i % nk == 0:
                t = t[1:] + t[:1]                       # RotWord
                t = [AES_SBOX[b] for b in t]            # SubWord
                t[0] ^= AES_RCON[i // nk - 1]
            elif nk > 6 and i % nk == 4:
                t = [AES_SBOX[b] for b in t]
            w.append([w[i - nk][j] ^ t[j] for j in range(4)])
        return w

    def _add_round_key(self, s, rnd):
        for c in range(4):
            k = self.rk[rnd * 4 + c]
            for r in range(4):
                s[r][c] ^= k[r]

    def encrypt_block(self, blk: bytes) -> bytes:
        if len(blk) != 16:
            raise ValueError('AES 分组长度必须是 16 字节')
        s = [[blk[r + 4 * c] for c in range(4)] for r in range(4)]
        self._add_round_key(s, 0)
        for rnd in range(1, self.nr):
            for r in range(4):
                for c in range(4):
                    s[r][c] = AES_SBOX[s[r][c]]
            s = [s[r][r:] + s[r][:r] for r in range(4)]          # ShiftRows
            for c in range(4):
                a = [s[r][c] for r in range(4)]
                s[0][c] = _xtime(a[0]) ^ _xtime(a[1]) ^ a[1] ^ a[2] ^ a[3]
                s[1][c] = a[0] ^ _xtime(a[1]) ^ _xtime(a[2]) ^ a[2] ^ a[3]
                s[2][c] = a[0] ^ a[1] ^ _xtime(a[2]) ^ _xtime(a[3]) ^ a[3]
                s[3][c] = _xtime(a[0]) ^ a[0] ^ a[1] ^ a[2] ^ _xtime(a[3])
            self._add_round_key(s, rnd)
        for r in range(4):
            for c in range(4):
                s[r][c] = AES_SBOX[s[r][c]]
        s = [s[r][r:] + s[r][:r] for r in range(4)]
        self._add_round_key(s, self.nr)
        out = bytearray(16)
        for c in range(4):
            for r in range(4):
                out[r + 4 * c] = s[r][c]
        return bytes(out)

    def decrypt_block(self, blk: bytes) -> bytes:
        if len(blk) != 16:
            raise ValueError('AES 分组长度必须是 16 字节')
        s = [[blk[r + 4 * c] for c in range(4)] for r in range(4)]
        self._add_round_key(s, self.nr)
        for rnd in range(self.nr - 1, 0, -1):
            s = [s[r][-r:] + s[r][:-r] if r else s[r] for r in range(4)]   # InvShiftRows
            for r in range(4):
                for c in range(4):
                    s[r][c] = AES_INV_SBOX[s[r][c]]
            self._add_round_key(s, rnd)
            for c in range(4):
                a = [s[r][c] for r in range(4)]
                s[0][c] = _gmul(a[0], 14) ^ _gmul(a[1], 11) ^ _gmul(a[2], 13) ^ _gmul(a[3], 9)
                s[1][c] = _gmul(a[0], 9) ^ _gmul(a[1], 14) ^ _gmul(a[2], 11) ^ _gmul(a[3], 13)
                s[2][c] = _gmul(a[0], 13) ^ _gmul(a[1], 9) ^ _gmul(a[2], 14) ^ _gmul(a[3], 11)
                s[3][c] = _gmul(a[0], 11) ^ _gmul(a[1], 13) ^ _gmul(a[2], 9) ^ _gmul(a[3], 14)
        s = [s[r][-r:] + s[r][:-r] if r else s[r] for r in range(4)]
        for r in range(4):
            for c in range(4):
                s[r][c] = AES_INV_SBOX[s[r][c]]
        self._add_round_key(s, 0)
        out = bytearray(16)
        for c in range(4):
            for r in range(4):
                out[r + 4 * c] = s[r][c]
        return bytes(out)


# ---------------------------------------------------------------------------
# SM4 —— 国密分组密码（GB/T 32907-2016）
# S 盒为规范固定表；CK 由 (28*i + 7*j) & 0xFF 程序化生成（与规范逐值等价，避免转录错误）
# ---------------------------------------------------------------------------

SM4_SBOX = bytes([
    0xd6, 0x90, 0xe9, 0xfe, 0xcc, 0xe1, 0x3d, 0xb7, 0x16, 0xb6, 0x14, 0xc2, 0x28, 0xfb, 0x2c, 0x05,
    0x2b, 0x67, 0x9a, 0x76, 0x2a, 0xbe, 0x04, 0xc3, 0xaa, 0x44, 0x13, 0x26, 0x49, 0x86, 0x06, 0x99,
    0x9c, 0x42, 0x50, 0xf4, 0x91, 0xef, 0x98, 0x7a, 0x33, 0x54, 0x0b, 0x43, 0xed, 0xcf, 0xac, 0x62,
    0xe4, 0xb3, 0x1c, 0xa9, 0xc9, 0x08, 0xe8, 0x95, 0x80, 0xdf, 0x94, 0xfa, 0x75, 0x8f, 0x3f, 0xa6,
    0x47, 0x07, 0xa7, 0xfc, 0xf3, 0x73, 0x17, 0xba, 0x83, 0x59, 0x3c, 0x19, 0xe6, 0x85, 0x4f, 0xa8,
    0x68, 0x6b, 0x81, 0xb2, 0x71, 0x64, 0xda, 0x8b, 0xf8, 0xeb, 0x0f, 0x4b, 0x70, 0x56, 0x9d, 0x35,
    0x1e, 0x24, 0x0e, 0x5e, 0x63, 0x58, 0xd1, 0xa2, 0x25, 0x22, 0x7c, 0x3b, 0x01, 0x21, 0x78, 0x87,
    0xd4, 0x00, 0x46, 0x57, 0x9f, 0xd3, 0x27, 0x52, 0x4c, 0x36, 0x02, 0xe7, 0xa0, 0xc4, 0xc8, 0x9e,
    0xea, 0xbf, 0x8a, 0xd2, 0x40, 0xc7, 0x38, 0xb5, 0xa3, 0xf7, 0xf2, 0xce, 0xf9, 0x61, 0x15, 0xa1,
    0xe0, 0xae, 0x5d, 0xa4, 0x9b, 0x34, 0x1a, 0x55, 0xad, 0x93, 0x32, 0x30, 0xf5, 0x8c, 0xb1, 0xe3,
    0x1d, 0xf6, 0xe2, 0x2e, 0x82, 0x66, 0xca, 0x60, 0xc0, 0x29, 0x23, 0xab, 0x0d, 0x53, 0x4e, 0x6f,
    0xd5, 0xdb, 0x37, 0x45, 0xde, 0xfd, 0x8e, 0x2f, 0x03, 0xff, 0x6a, 0x72, 0x6d, 0x6c, 0x5b, 0x51,
    0x8d, 0x1b, 0xaf, 0x92, 0xbb, 0xdd, 0xbc, 0x7f, 0x11, 0xd9, 0x5c, 0x41, 0x1f, 0x10, 0x5a, 0xd8,
    0x0a, 0xc1, 0x31, 0x88, 0xa5, 0xcd, 0x7b, 0xbd, 0x2d, 0x74, 0xd0, 0x12, 0xb8, 0xe5, 0xb4, 0xb0,
    0x89, 0x69, 0x97, 0x4a, 0x0c, 0x96, 0x77, 0x7e, 0x65, 0xb9, 0xf1, 0x09, 0xc5, 0x6e, 0xc6, 0x84,
    0x18, 0xf0, 0x7d, 0xec, 0x3a, 0xdc, 0x4d, 0x20, 0x79, 0xee, 0x5f, 0x3e, 0xd7, 0xcb, 0x39, 0x48,
])

SM4_FK = (0xA3B1BAC6, 0x56AA3350, 0x677D9197, 0xB27022DC)


def _sm4_ck():
    """规范 CK[i] 的 4 个字节 = (28*i + 7*j) mod 256 —— 程序化生成，规避手工转录。"""
    return [((28 * i + 7 * 0) & 0xFF) << 24 | ((28 * i + 7 * 1) & 0xFF) << 16 |
            ((28 * i + 7 * 2) & 0xFF) << 8 | ((28 * i + 7 * 3) & 0xFF) for i in range(32)]


SM4_CK = _sm4_ck()


def _rotl32(v, n):
    return ((v << n) | (v >> (32 - n))) & 0xFFFFFFFF


class SM4:
    def __init__(self, key: bytes):
        if len(key) != 16:
            raise ValueError('SM4 key 长度必须是 16 字节，收到 %d 字节' % len(key))
        self.rk = self._key_schedule(key)

    def _key_schedule(self, key):
        mk = [int.from_bytes(key[4 * i:4 * i + 4], 'big') for i in range(4)]
        k = [mk[i] ^ SM4_FK[i] for i in range(4)]
        rk = []
        for i in range(32):
            t = self._tau(k[1] ^ k[2] ^ k[3] ^ SM4_CK[i])
            t = t ^ _rotl32(t, 13) ^ _rotl32(t, 23)          # L'
            nk = k[0] ^ t
            k = [k[1], k[2], k[3], nk]
            rk.append(nk)
        return rk

    @staticmethod
    def _tau(x):
        return ((SM4_SBOX[(x >> 24) & 0xFF] << 24) | (SM4_SBOX[(x >> 16) & 0xFF] << 16) |
                (SM4_SBOX[(x >> 8) & 0xFF] << 8) | SM4_SBOX[x & 0xFF])

    def _crypt_block(self, blk: bytes) -> bytes:
        x = [int.from_bytes(blk[4 * i:4 * i + 4], 'big') for i in range(4)]
        for i in range(32):
            t = self._tau(x[1] ^ x[2] ^ x[3] ^ self.rk[i])
            t = t ^ _rotl32(t, 2) ^ _rotl32(t, 10) ^ _rotl32(t, 18) ^ _rotl32(t, 24)   # L
            nx = x[0] ^ t
            x = [x[1], x[2], x[3], nx]
        out = b''.join(int(v).to_bytes(4, 'big') for v in reversed(x))
        return out

    # SM4 加解密同构（轮密钥逆序），无需单独实现解密
    def encrypt_block(self, blk):
        return self._crypt_block(blk)

    def decrypt_block(self, blk):
        save, self.rk = self.rk, list(reversed(self.rk))
        try:
            return self._crypt_block(blk)
        finally:
            self.rk = save


# ---------------------------------------------------------------------------
# 分组模式
# ---------------------------------------------------------------------------

def _pkcs7_strip(data: bytes) -> bytes:
    if not data:
        return data
    n = data[-1]
    if 1 <= n <= 16 and len(data) >= n and data[-n:] == bytes([n]) * n:
        return data[:-n]
    return data


def mode_ecb(block_cipher, data: bytes, decrypt: bool, pad: bool = False) -> bytes:
    if len(data) % 16:
        if not pad:
            raise ValueError('ECB 输入长度 %d 不是 16 的整数倍（无填充模式下请先自行截断）' % len(data))
        data = data + bytes([16 - len(data) % 16]) * (16 - len(data) % 16)
    fn = block_cipher.decrypt_block if decrypt else block_cipher.encrypt_block
    out = b''.join(fn(data[i:i + 16]) for i in range(0, len(data), 16))
    return _pkcs7_strip(out) if (decrypt and pad) else out


def mode_cbc(block_cipher, data: bytes, iv: bytes, decrypt: bool, pad_pkcs7: bool = True) -> bytes:
    if len(iv) != 16:
        raise ValueError('CBC IV 长度必须是 16 字节，收到 %d 字节' % len(iv))
    if len(data) % 16:
        if not (pad_pkcs7 and not decrypt):
            raise ValueError('CBC 输入长度 %d 不是 16 的整数倍' % len(data))
        data = data + bytes([16 - len(data) % 16]) * (16 - len(data) % 16)
    out = bytearray()
    prev = iv
    if decrypt:
        for i in range(0, len(data), 16):
            blk = data[i:i + 16]
            out += bytes(a ^ b for a, b in zip(block_cipher.decrypt_block(blk), prev))
            prev = blk
        return _pkcs7_strip(bytes(out))
    for i in range(0, len(data), 16):
        blk = bytes(a ^ b for a, b in zip(data[i:i + 16], prev))
        enc = block_cipher.encrypt_block(blk)
        out += enc
        prev = enc
    return bytes(out)


def mode_ctr(block_cipher, data: bytes, counter: bytes, decrypt: bool, inc='big') -> bytes:
    """CTR 模式：加解密同构。counter 为 16 字节初始计数器。"""
    if len(counter) != 16:
        raise ValueError('CTR counter 长度必须是 16 字节，收到 %d 字节' % len(counter))
    out = bytearray()
    ctr = int.from_bytes(counter, inc)
    for i in range(0, len(data), 16):
        ks = block_cipher.encrypt_block(int(ctr % (1 << 128)).to_bytes(16, inc))
        chunk = data[i:i + 16]
        out += bytes(a ^ b for a, b in zip(chunk, ks))
        ctr += 1
    return bytes(out)


def mode_dcm(block_cipher, data: bytes, iv: bytes, ctr_blocks=1, xor_blocks=9, total_rounds=10) -> bytes:
    """
    dcm —— CDRM 式混合块模式（逐行对照原 so 的 `dcm_block` 复现）：

      每 16 字节一块，`total_rounds` 轮为一个周期；每轮的处理规则是：

        if (remaining <= 16) or (rounds > xorBlocksInCycl):
            走标准 AES-CTR（用分组密码生成 keystream 异或）
        else:
            xord = counter ^ in ; counter += 1 ; in = xord

    **两个容易实现错的点（都会静默算错数据）**：
      1. `remaining <= 16` 是**独立于轮次**的条件 —— **最后一块无论轮次如何都走 CTR**。
         只按轮次判断，会在「末块恰好落在 XOR 相位」时算错（如 32 字节 payload 的第 2 块、
         160 字节 payload 的第 10 块），而且解密不报任何错。
      2. XOR 分支里 `counter` 必须递增（`addOne(counter, 0x10)`）。

    表面是「1 次 CTR + 9 次 XOR」，实际两侧都在消耗连续计数器，canonical 等价的表述是
    「连续 N 个 keystream 块的异或」——但第 1 块必须由分组密码生成，**不能简化成纯 XOR**。
    """
    if len(iv) != 16:
        raise ValueError('dcm IV 长度必须是 16 字节，收到 %d 字节' % len(iv))
    if ctr_blocks <= 0 or xor_blocks < 0 or total_rounds <= 0:
        raise ValueError('dcm 参数非法：ctr_blocks/total_rounds 必须为正，xor_blocks 不得为负')
    if ctr_blocks + xor_blocks != total_rounds:
        raise ValueError('dcm 参数不自洽：ctr_blocks(%d) + xor_blocks(%d) != total_rounds(%d)'
                         % (ctr_blocks, xor_blocks, total_rounds))

    out = bytearray()
    ctr = int.from_bytes(iv, 'big')
    rounds = total_rounds
    pos, n = 0, len(data)
    while pos < n:
        remaining = n - pos
        take = min(16, remaining)
        blk = bytearray(data[pos:pos + take])
        ks = None
        if remaining <= 16 or rounds > xor_blocks:
            ks = block_cipher.encrypt_block(int(ctr % (1 << 128)).to_bytes(16, 'big'))
        else:
            ks = int(ctr % (1 << 128)).to_bytes(16, 'big')
        for i in range(take):
            blk[i] ^= ks[i]
        ctr += 1
        out += blk
        pos += take
        rounds -= 1
        if rounds == 0:
            rounds = total_rounds
    return bytes(out)


# ---------------------------------------------------------------------------
# CRC16 —— 多项式未知时的自适应探针
# ---------------------------------------------------------------------------

def _crc16(data: bytes, poly: int, init: int, refin: bool, refout: bool, xorout: int) -> int:
    def rev8(b):
        return int('{:08b}'.format(b)[::-1], 2)

    def rev16(v):
        return int('{:016b}'.format(v)[::-1], 2)

    crc = init
    for byte in data:
        b = rev8(byte) if refin else byte
        crc ^= b << 8
        for _ in range(8):
            crc = ((crc << 1) ^ poly) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    if refout:
        crc = rev16(crc)
    return (crc ^ xorout) & 0xFFFF


CRC16_VARIANTS = {
    'CCITT-FALSE': (0x1021, 0xFFFF, False, False, 0x0000),
    'XMODEM': (0x1021, 0x0000, False, False, 0x0000),
    'CCITT/KERMIT': (0x1021, 0x0000, True, True, 0x0000),
    'X25': (0x1021, 0xFFFF, True, True, 0xFFFF),
    'MODBUS': (0x8005, 0xFFFF, True, True, 0x0000),
    'IBM/USB': (0x8005, 0xFFFF, True, True, 0xFFFF),
    'ARC': (0x8005, 0x0000, True, True, 0x0000),
    'DNP': (0x3D65, 0x0000, True, True, 0xFFFF),
    'T10-DIF': (0x8BB7, 0x0000, False, False, 0x0000),
}


def crc16_probe(data: bytes) -> dict:
    """用尾部 2 字节作为期望值，报告哪些 CRC16 变体命中（大端/小端都试）。

    这是「厂商 CRC 多项式未知」时的正确做法：不猜，让数据说话。
    """
    if len(data) < 3:
        return {'error': '数据太短'}
    body, tail = data[:-2], data[-2:]
    exp_be = int.from_bytes(tail, 'big')
    exp_le = int.from_bytes(tail, 'little')
    hits = []
    for name, (poly, init, refin, refout, xorout) in CRC16_VARIANTS.items():
        v = _crc16(body, poly, init, refin, refout, xorout)
        if v == exp_be:
            hits.append({'variant': name, 'endian': 'big', 'value': '0x%04X' % v})
        if v == exp_le:
            hits.append({'variant': name, 'endian': 'little', 'value': '0x%04X' % v})
    return {
        'body_len': len(body),
        'tail_hex': tail.hex(),
        'tail_be': '0x%04X' % exp_be,
        'tail_le': '0x%04X' % exp_le,
        'hits': hits,
        'matched': bool(hits),
    }


def strip_crc16(data: bytes) -> bytes:
    """剪掉尾部 2 字节校验值（不校验，仅裁剪）。"""
    if len(data) < 2:
        raise ValueError('数据长度 %d < 2，无法剪除 CRC16' % len(data))
    return data[:-2]


# ---------------------------------------------------------------------------
# key / iv 解析
# ---------------------------------------------------------------------------

def parse_key(spec, kind: str, what: str) -> bytes:
    """kind: hex | utf8 | latin1 | auto

    `auto` 用于「从 key URI 取回来的一串字符」的**保守**判定：
      32 字符且全为 hex 字符 → 当 16 字节二进制（hex 形态）
      否则能 base64 解出 16/24/32 字节 → 当二进制
      否则按 latin1 当「密钥明文」用

    ⚠️ 已知歧义：`32 个 hex 字符` 既可能是「16 字节密钥的 hex」，也可能是
    「32 字节 ASCII 明文密钥（AES-256）」。本函数**优先按 hex 解释**。
    遇到「解出来不对但长度合法」时，用 `--key-latin1` 强制按明文再试一次。
    """
    if spec is None or spec == '':
        raise ValueError('缺少 %s：请用 --%s-hex / --%s-utf8 / --%s-latin1 之一指定'
                         % (what, what, what, what))
    if kind == 'hex':
        s = spec.replace('0x', '').replace(' ', '').strip()
        try:
            return binascii.unhexlify(s)
        except Exception:
            raise ValueError('%s 不是合法十六进制：%s' % (what, spec))
    if kind == 'utf8':
        return spec.encode('utf-8')
    if kind == 'latin1':
        return spec.encode('latin-1')
    if kind == 'auto':
        # 明文 key URI 的三种常见返回形态
        s = spec.strip()
        if len(s) == 32 and all(c in '0123456789abcdefABCDEF' for c in s):
            return binascii.unhexlify(s)
        import base64
        try:
            pad = s + '=' * (-len(s) % 4)
            b = base64.b64decode(pad, validate=True)
            if len(b) in (16, 24, 32):
                return b
        except Exception:
            pass
        return s.encode('latin-1')
    raise ValueError('未知 key 类型：%s' % kind)


def read_bytes(path: str) -> bytes:
    if not os.path.exists(path):
        raise IOError('输入文件不存在：%s' % path)
    with open(path, 'rb') as f:
        return f.read()


def write_bytes(path: str, data: bytes):
    d = os.path.dirname(os.path.abspath(path))
    if d and not os.path.isdir(d):
        os.makedirs(d, exist_ok=True)
    with open(path, 'wb') as f:
        f.write(data)


# ---------------------------------------------------------------------------
# 自检
# ---------------------------------------------------------------------------

def _selftest() -> int:
    fails = []
    total = 0

    def check(name, cond, extra=''):
        nonlocal total
        total += 1
        if not cond:
            fails.append('%s %s' % (name, extra))

    # --- AES 标准测试向量（FIPS-197 附录 C） ---
    pt = binascii.unhexlify('00112233445566778899aabbccddeeff')
    vectors = [
        ('000102030405060708090a0b0c0d0e0f', '69c4e0d86a7b0430d8cdb78070b4c55a'),
        ('000102030405060708090a0b0c0d0e0f1011121314151617', 'dda97ca4864cdfe06eaf70a0ec0d7191'),
        ('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
         '8ea2b7ca516745bfeafc49904b496089'),
    ]
    for keyhex, expect in vectors:
        got = AES(binascii.unhexlify(keyhex)).encrypt_block(pt).hex()
        check('AES-%d 测试向量' % (len(keyhex) * 4 // 2), got == expect, 'got %s expect %s' % (got, expect))

    # --- AES 分组模式的标准向量（NIST SP 800-38A，独立于上面的分组向量） ---
    cbc_cases = [
        ('128', '2b7e151628aed2a6abf7158809cf4f3c',
         '7649abac8119b246cee98e9b12e9197d'),
        ('192', '8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b',
         '4f021db243bc633d7178183a9fa071e8'),
        ('256', '603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4',
         'f58c4c04d6e5f1ba779eabfb5f7bfbd6'),
    ]
    nist_iv = binascii.unhexlify('000102030405060708090a0b0c0d0e0f')
    nist_pt = binascii.unhexlify('6bc1bee22e409f96e93d7e117393172a')
    for bits, keyhex, expect in cbc_cases:
        got = mode_cbc(AES(binascii.unhexlify(keyhex)), nist_pt, nist_iv, decrypt=False).hex()
        check('AES-%s-CBC NIST 向量' % bits, got == expect, 'got %s expect %s' % (got, expect))
        back = mode_cbc(AES(binascii.unhexlify(keyhex)), binascii.unhexlify(expect), nist_iv, decrypt=True)
        check('AES-%s-CBC NIST 向量可逆' % bits, back == nist_pt)
    # CTR：SP 800-38A F.5.1（初始计数器块 f0f1...feff）
    ctr_iv = binascii.unhexlify('f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff')
    got = mode_ctr(AES(binascii.unhexlify('2b7e151628aed2a6abf7158809cf4f3c')), nist_pt, ctr_iv,
                   decrypt=False).hex()
    check('AES-128-CTR NIST 向量', got == '874d6191b620e3261bef6864990db6ce', got)

    # --- AES S 盒完整性 ---
    check('AES S 盒是双射', len(set(AES_SBOX)) == 256)
    check('AES 逆 S 盒自洽', all(AES_INV_SBOX[AES_SBOX[i]] == i for i in range(256)))

    # --- AES 模式往返 ---
    key = bytes(range(16))
    iv = bytes(range(16, 32))
    payload = b'HELLO-STREAM-PAYLOAD-0123456789' * 3          # 非 16 倍数，测填充
    ct = mode_cbc(AES(key), payload, iv, decrypt=False)
    check('AES-CBC 往返', mode_cbc(AES(key), ct, iv, decrypt=True) == payload)
    check('AES-CBC 密文长度对齐', len(ct) % 16 == 0)
    ct2 = mode_ecb(AES(key), payload, decrypt=False, pad=True)
    check('AES-ECB 往返', mode_ecb(AES(key), ct2, decrypt=True, pad=True) == payload)
    ct3 = mode_ctr(AES(key), payload, iv, decrypt=False)
    check('AES-CTR 往返', mode_ctr(AES(key), ct3, iv, decrypt=True) == payload)
    check('AES-CTR 密文与明文等长', len(ct3) == len(payload))

    # --- 拒绝路径 ---
    for bad, why in [(b'123', 'key 长度非 16'), ]:
        try:
            AES(bad)
            check('AES 拒绝非法 key', False)
        except ValueError:
            check('AES 拒绝非法 key', True)
    try:
        mode_cbc(AES(key), b'abc', iv, decrypt=True)
        check('AES-CBC 拒绝非对齐输入', False)
    except ValueError:
        check('AES-CBC 拒绝非对齐输入', True)
    try:
        mode_cbc(AES(key), payload, b'short', decrypt=False)
        check('AES-CBC 拒绝非法 IV', False)
    except ValueError:
        check('AES-CBC 拒绝非法 IV', True)

    # --- SM4 标准测试向量（GB/T 32907-2016 附录 A） ---
    sm4key = binascii.unhexlify('0123456789abcdeffedcba9876543210')
    sm4pt = binascii.unhexlify('0123456789abcdeffedcba9876543210')
    sm4expect = '681edf34d206965e86b3e94f536e4246'
    got = SM4(sm4key).encrypt_block(sm4pt).hex()
    check('SM4 测试向量', got == sm4expect, 'got %s expect %s' % (got, sm4expect))
    check('SM4 S 盒是双射', len(set(SM4_SBOX)) == 256)
    check('SM4 CK 与规范常量一致',
          SM4_CK[0] == 0x00070E15 and SM4_CK[1] == 0x1C232A31 and SM4_CK[31] == 0x646B7279,
          'CK0=%08x CK1=%08x CK31=%08x' % (SM4_CK[0], SM4_CK[1], SM4_CK[31]))
    # 100 万次加密（GB/T 32907 推荐的自检）—— 纯 Python 实测约 38 秒，
    # 因此只在 --slow-selftest 下跑；默认自检用 10000 次做稳定性抽查。
    c = SM4(sm4key)
    for _ in range(10000):
        c = SM4(sm4key)
        _ = c.encrypt_block(sm4pt)
    check('SM4 重复加密稳定', c.encrypt_block(sm4pt).hex() == sm4expect)
    if _SLOW:
        cur = sm4pt
        s = SM4(sm4key)
        for _ in range(1000000):
            cur = s.encrypt_block(cur)
        check('SM4 100 万次迭代标准向量',
              cur.hex() == '595298c7c6fd271f0402f804c33d3f66', cur.hex())
    check('SM4 解密还原', SM4(sm4key).decrypt_block(binascii.unhexlify(sm4expect)) == sm4pt)

    # --- SM4 模式往返 ---
    sm4payload = b'SM4-CBC-PAYLOAD-0123456789' * 2
    sct = mode_cbc(SM4(sm4key), sm4payload, iv, decrypt=False)
    check('SM4-CBC 往返', mode_cbc(SM4(sm4key), sct, iv, decrypt=True) == sm4payload)
    # ECB 无填充是 DRM 许可证的硬要求：长度非 16 倍数必须报错
    try:
        mode_ecb(SM4(sm4key), b'12345', decrypt=True, pad=False)
        check('SM4-ECB 无填充拒绝非对齐输入', False)
    except ValueError:
        check('SM4-ECB 无填充拒绝非对齐输入', True)
    eblock = mode_ecb(SM4(sm4key), sm4pt, decrypt=False, pad=False)
    check('SM4-ECB 无填充往返', mode_ecb(SM4(sm4key), eblock, decrypt=True, pad=False) == sm4pt)
    try:
        SM4(b'short')
        check('SM4 拒绝非法 key', False)
    except ValueError:
        check('SM4 拒绝非法 key', True)

    # --- dcm 往返（多种轮次配置 × 多种长度） ---
    for cb, xb, tr in [(1, 9, 10), (3, 7, 10), (1, 0, 1)]:
        for plen in (16, 32, 37, 48, 160, 176, 512):
            dcm_payload = bytes(range(256))[:plen]
            try:
                enc = mode_dcm(AES(key), dcm_payload, iv, cb, xb, tr)
                dec = mode_dcm(AES(key), enc, iv, cb, xb, tr)
                check('dcm(%d,%d,%d,%d字节) 往返' % (cb, xb, tr, plen), dec == dcm_payload)
                check('dcm(%d,%d,%d,%d字节) 等长' % (cb, xb, tr, plen), len(enc) == len(dcm_payload))
            except Exception as e:
                check('dcm(%d,%d,%d,%d字节) 往返' % (cb, xb, tr, plen), False, str(e))
    dcm_odd = bytes(range(37))
    check('dcm 支持 16 非整数倍长度',
          mode_dcm(AES(key), mode_dcm(AES(key), dcm_odd, iv), iv) == dcm_odd)
    # **末块强制走 CTR** 的正向断言：32 字节 payload 的第 2 块处于 XOR 相位，
    # 但 remaining(16) <= 16 ⇒ 必须由分组密码生成 keystream。
    # 只按轮次判断的实现会把第 2 块算成 counter 明文异或 —— 这里逐字节钉死。
    dcm32 = bytes(range(32))
    try:
        got32 = mode_dcm(AES(key), dcm32, iv, 1, 9, 10)
        ks0 = AES(key).encrypt_block(iv)
        ks1 = AES(key).encrypt_block(((int.from_bytes(iv, 'big') + 1) % (1 << 128)).to_bytes(16, 'big'))
        expect32 = bytes(a ^ b for a, b in zip(dcm32[:16], ks0)) +                    bytes(a ^ b for a, b in zip(dcm32[16:], ks1))
        check('dcm 末块走 CTR（32 字节 payload 第 2 块）', got32 == expect32,
              'got %s expect %s' % (got32.hex(), expect32.hex()))
    except Exception as e:
        check('dcm 末块走 CTR（32 字节 payload 第 2 块）', False, str(e))
    # 同一语义在 160 字节（共 10 块：第 1 块 CTR、第 2~9 块 XOR、第 10 块因 remaining==16 又回 CTR）
    # 上复验。这里只钉「第 10 块」这一条判别性断言，逐步独立推导，避免循环论证：
    dcm160 = bytes(range(160))
    ivint = int.from_bytes(iv, 'big')
    ctr9 = ((ivint + 9) % (1 << 128)).to_bytes(16, 'big')
    got160 = mode_dcm(AES(key), dcm160, iv, 1, 9, 10)
    last = dcm160[144:160]
    expect_is_ctr = bytes(a ^ b for a, b in zip(last, AES(key).encrypt_block(ctr9)))
    expect_is_raw = bytes(a ^ b for a, b in zip(last, ctr9))
    check('dcm 末块走 CTR（160 字节第 10 块 = AES(ctr9) keystream）',
          got160[144:160] == expect_is_ctr, got160[144:160].hex())
    check('dcm 末块不是裸 counter 异或（区分性断言）',
          got160[144:160] != expect_is_raw)
    # 第 2 块（rounds=9 ⇒ XOR 相位）必须是裸 counter 异或，而不是 AES keystream
    ctr1 = ((ivint + 1) % (1 << 128)).to_bytes(16, 'big')
    check('dcm 第 2 块走 XOR（裸 counter，非 AES keystream）',
          got160[16:32] == bytes(a ^ b for a, b in zip(dcm160[16:32], ctr1))
          and got160[16:32] != bytes(a ^ b for a, b in zip(dcm160[16:32], AES(key).encrypt_block(ctr1))))
    # 参数不自洽必须报错（而不是静默产出错数据）
    try:
        mode_dcm(AES(key), dcm_odd, iv, 1, 9, 8)
        check('dcm 拒绝不自洽参数', False)
    except ValueError:
        check('dcm 拒绝不自洽参数', True)
    # 「dcm 不是 10 次纯 XOR」的负向断言：dcm(1,9,10) != 10 轮纯异或
    pure_xor = bytearray(dcm_odd)
    ctr = int.from_bytes(iv, 'big')
    for i in range(0, len(pure_xor), 16):
        ks = int(ctr % (1 << 128)).to_bytes(16, 'big')
        for j in range(min(16, len(pure_xor) - i)):
            pure_xor[i + j] ^= ks[j]
        ctr += 1
    check('dcm 与单次 CTR 不同（防止退化成纯 XOR）',
          mode_dcm(AES(key), dcm_odd, iv, 1, 9, 10) != bytes(pure_xor))

    # --- CRC16 探针：用已知变体构造样本，必须命中 ---
    body = b'the quick brown fox jumps over the lazy dog'
    for name in ('CCITT-FALSE', 'XMODEM', 'MODBUS', 'X25'):
        poly, init, refin, refout, xorout = CRC16_VARIANTS[name]
        v = _crc16(body, poly, init, refin, refout, xorout)
        probe = crc16_probe(body + v.to_bytes(2, 'big'))
        check('CRC16 探针命中 %s' % name,
              probe['matched'] and any(h['variant'] == name and h['endian'] == 'big' for h in probe['hits']),
              'probe=%s' % probe)
    # 随机尾部不得命中（防止探针「什么都能认」）
    check('CRC16 探针拒绝随机尾部', not crc16_probe(body + b'\x12\x34')['matched'])
    check('CRC16 探针处理过短数据', 'error' in crc16_probe(b'ab'))
    check('strip_crc16 剪除正确', strip_crc16(b'abcde') == b'abc')
    try:
        strip_crc16(b'a')
        check('strip_crc16 拒绝过短数据', False)
    except ValueError:
        check('strip_crc16 拒绝过短数据', True)

    # --- key 解析三形态 ---
    check('auto: 32位hex → 16字节', parse_key('000102030405060708090a0b0c0d0e0f', 'auto', 'k') == bytes(range(16)))
    check('auto: base64 → 16字节', parse_key('AAECAwQFBgcICQoLDA0ODw==', 'auto', 'k') == bytes(range(16)))
    check('auto: 明文 → latin1', parse_key('0123456789abcdef', 'auto', 'k') == b'0123456789abcdef')
    # 已知歧义必须被显式表达：32 位 hex 形态优先按 hex 解，latin1 需显式指定
    check('auto: 32位hex 优先按 hex 解释（歧义已文档化）',
          parse_key('00112233445566778899aabbccddeeff', 'auto', 'k') == binascii.unhexlify('00112233445566778899aabbccddeeff')
          and parse_key('00112233445566778899aabbccddeeff', 'latin1', 'k') == b'00112233445566778899aabbccddeeff')
    check('auto: 明文非 ASCII 走 latin1', parse_key('é' * 16, 'auto', 'k') == ('é' * 16).encode('latin-1'))
    check('utf8 与 latin1 在纯 ASCII 下一致', parse_key('abc', 'utf8', 'k') == parse_key('abc', 'latin1', 'k'))
    try:
        parse_key('zz', 'hex', 'k')
        check('hex 解析拒绝非法字符', False)
    except ValueError:
        check('hex 解析拒绝非法字符', True)
    # 缺参数必须给可读错误（而不是 AttributeError: 'NoneType' object has no attribute 'encode'）
    for missing in (None, ''):
        try:
            parse_key(missing, 'utf8', 'key')
            check('缺 key 参数给出可读错误（%r）' % missing, False)
        except ValueError as e:
            check('缺 key 参数给出可读错误（%r）' % missing, '--key-hex' in str(e), str(e))
        except Exception as e:                                # noqa: BLE001
            check('缺 key 参数给出可读错误（%r）' % missing, False, '%s: %s' % (type(e).__name__, e))

    print('media_crypto 自检：%d 项，失败 %d 项' % (total, len(fails)))
    for f in fails:
        print('  FAIL ' + f)
    return 1 if fails else 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _load(args, need_iv=True):
    data = read_bytes(args.input)
    if getattr(args, 'input_b64', False):
        import base64 as _b64
        txt = data.decode('ascii', 'ignore').strip()
        data = _b64.b64decode(txt + '=' * (-len(txt) % 4))
    key = parse_key(args.key_hex or args.key_utf8 or args.key_latin1,
                    'hex' if args.key_hex else ('utf8' if args.key_utf8 else 'latin1'), 'key')
    iv = b''
    if need_iv:
        spec = args.iv_hex or args.iv_utf8 or args.iv_latin1
        if not spec:
            raise ValueError('缺少 IV：请给 --iv-hex / --iv-utf8 / --iv-latin1')
        iv = parse_key(spec, 'hex' if args.iv_hex else ('utf8' if args.iv_utf8 else 'latin1'), 'iv')
    return data, key, iv


def _emit(data, args):
    if args.strip_crc16:
        data = strip_crc16(data)
    if args.crc16_probe:
        import json
        print(json.dumps(crc16_probe(data), ensure_ascii=False, indent=2))
    write_bytes(args.out, data)
    print('OK  %s → %s  (%d 字节)' % (args.input, args.out, len(data)))


def main(argv=None):
    ap = argparse.ArgumentParser(description='流媒体内容解密工具箱（零依赖）')
    sub = ap.add_subparsers(dest='cmd')

    def add_common(p, need_iv=True):
        p.add_argument('--input', required=True)
        p.add_argument('--out', required=True)
        p.add_argument('--key-hex'); p.add_argument('--key-utf8'); p.add_argument('--key-latin1')
        if need_iv:
            p.add_argument('--iv-hex'); p.add_argument('--iv-utf8'); p.add_argument('--iv-latin1')
        p.add_argument('--strip-crc16', action='store_true', help='输出前剪掉尾部 2 字节校验值')
        p.add_argument('--crc16-probe', action='store_true', help='打印 CRC16 变体命中情况')
        p.add_argument('--encrypt', action='store_true',
                       help='做加密而不是解密（默认解密：本技能的主用途）')
        p.add_argument('--input-b64', action='store_true',
                       help='输入文件是 base64 文本，先解码再处理（D 层密文常是 base64）')

    add_common(sub.add_parser('aes-ecb', help='AES-ECB（--pad 启用 PKCS7）'), need_iv=False)
    for name in ('aes-cbc', 'aes-ctr', 'sm4-cbc', 'sm4-ctr'):
        add_common(sub.add_parser(name))
    p = sub.add_parser('sm4-ecb', help='SM4-ECB，无填充（DRM 许可证标准用法）')
    p.add_argument('--input', required=True); p.add_argument('--out', required=True)
    p.add_argument('--key-hex'); p.add_argument('--key-utf8'); p.add_argument('--key-latin1')
    p.add_argument('--strip-crc16', action='store_true'); p.add_argument('--crc16-probe', action='store_true')
    p.add_argument('--encrypt', action='store_true')
    p.add_argument('--input-b64', action='store_true')

    p = sub.add_parser('dcm', help='CDRM 式混合块模式')
    add_common(p)
    p.add_argument('--ctr-blocks', type=int, default=1)
    p.add_argument('--xor-blocks', type=int, default=9)
    p.add_argument('--total-rounds', type=int, default=10)

    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--slow-selftest', action='store_true',
                    help='额外跑 SM4 百万次迭代标准向量（约 38 秒）')
    args = ap.parse_args(argv)

    global _SLOW
    if args.slow_selftest:
        _SLOW = True
    if args.selftest or args.slow_selftest:
        return _selftest()
    if not args.cmd:
        ap.print_help()
        return 1
    try:
        enc = bool(getattr(args, 'encrypt', False))
        if args.cmd == 'aes-ecb':
            data, key, _ = _load(args, need_iv=False)
            _emit(mode_ecb(AES(key), data, decrypt=not enc, pad=True), args)
        elif args.cmd == 'aes-cbc':
            data, key, iv = _load(args)
            _emit(mode_cbc(AES(key), data, iv, decrypt=not enc), args)
        elif args.cmd == 'aes-ctr':
            data, key, iv = _load(args)
            _emit(mode_ctr(AES(key), data, iv, decrypt=not enc), args)
        elif args.cmd == 'sm4-ecb':
            data, key, _ = _load(args, need_iv=False)
            _emit(mode_ecb(SM4(key), data, decrypt=not enc, pad=False), args)
        elif args.cmd == 'sm4-cbc':
            data, key, iv = _load(args)
            _emit(mode_cbc(SM4(key), data, iv, decrypt=not enc), args)
        elif args.cmd == 'sm4-ctr':
            data, key, iv = _load(args)
            _emit(mode_ctr(SM4(key), data, iv, decrypt=not enc), args)
        elif args.cmd == 'dcm':
            data, key, iv = _load(args)
            _emit(mode_dcm(AES(key), data, iv, args.ctr_blocks, args.xor_blocks, args.total_rounds), args)
        return 0
    except (ValueError, IOError) as e:
        print('ERROR %s' % e, file=sys.stderr)
        return 1
    except Exception as e:                                    # noqa: BLE001
        print('ERROR 未预期异常：%s: %s' % (type(e).__name__, e), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())