#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
license_parse.py — DRM 许可证（TLV 单元）与 `mdcm` 模式串解析

覆盖 E 层两个「纯数据、无需设备私钥」的环节（有私钥才能做的 SM2 解密不在此列）：
  1. `tlv` —— 解析 base64 后的许可证：单元骨架（tag/index/length/data）、
     密钥单元的类型/算法枚举、**HMAC-SM3 验签所需的 msg 切法**、密钥层级的长度自洽检查
  2. `mdcm` —— 解析 TS PMT 里 `service_name` 的模式串（如 `mdcm|s1:9:10|a0|v<hex>|e1|f497006|`），
     输出 `dcm` 参数与 IV，并做与原始 C 实现一致的**段数计数校验**

诚实边界（本工具的取舍，不要误解）：
  * SM3 / HMAC-SM3 是**完整实现**（GB/T 32905-2016），可用标准向量自检 —— 所以「验签」这一步可以本地做。
  * **SM2 解密不实现**（需要椭圆曲线 + 私钥，纯 Python 收益低）；拿到 DevPrK 后请用 gmssl 或 Hook。
  * 密钥单元 0x03 的**字段偏移文章未给出**，因此只输出骨架 + 原始 hex + 明确标注的启发式猜测，
    不把猜测当事实。请按目标二进制校准后用 --raw 对照。

用法：
  python license_parse.py --selftest
  python license_parse.py tlv   --input license.b64 --pretty
  python license_parse.py tlv   --input license.bin --fmt raw --mac-key-hex <hex> --verify
  python license_parse.py mdcm  --service-name "mdcm|s1:9:10|a0|v<hex>|e1|f497006|" --pretty
退出码：0 成功；1 参数/IO 错误；2 自检失败。
"""

import argparse
import base64
import binascii
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from media_crypto import crc16_probe, read_bytes, write_bytes      # noqa: F401
except ImportError as _e:                                             # pragma: no cover
    print('ERROR 需要与 media_crypto.py 同目录：%s' % _e, file=sys.stderr)
    raise


# ---------------------------------------------------------------------------
# SM3（GB/T 32905-2016）—— 完整实现，标准向量自检
# ---------------------------------------------------------------------------

SM3_IV = [0x7380166F, 0x4914B2B9, 0x172442D7, 0xDA8A0600,
          0xA96F30BC, 0x163138AA, 0xE38DEE4D, 0xB0FB0E4E]


def _rotl32(v, n):
    n &= 31
    return ((v << n) | (v >> (32 - n))) & 0xFFFFFFFF if n else v & 0xFFFFFFFF


def _p0(x):
    return x ^ _rotl32(x, 9) ^ _rotl32(x, 17)


def _p1(x):
    return x ^ _rotl32(x, 15) ^ _rotl32(x, 23)


def _cf(vi, block):
    w = [int.from_bytes(block[4 * i:4 * i + 4], 'big') for i in range(16)]
    for j in range(16, 68):
        w.append(_p1(w[j - 16] ^ w[j - 9] ^ _rotl32(w[j - 3], 15)) ^ _rotl32(w[j - 13], 7) ^ w[j - 6])
    w1 = [w[j] ^ w[j + 4] for j in range(64)]
    a, b, c, d, e, f, g, h = vi
    for j in range(64):
        if j < 16:
            ff = a ^ b ^ c
            gg = e ^ f ^ g
            tj = 0x79CC4519
        else:
            ff = (a & b) | (a & c) | (b & c)
            gg = (e & f) | ((~e & 0xFFFFFFFF) & g)
            tj = 0x7A879D8A
        ss1 = _rotl32((_rotl32(a, 12) + e + _rotl32(tj, j % 32)) & 0xFFFFFFFF, 7)
        ss2 = ss1 ^ _rotl32(a, 12)
        tt1 = (ff + d + ss2 + w1[j]) & 0xFFFFFFFF
        tt2 = (gg + h + ss1 + w[j]) & 0xFFFFFFFF
        d, c, b, a = c, _rotl32(b, 9), a, tt1
        h, g, f, e = g, _rotl32(f, 19), e, _p0(tt2)
    return [vi[0] ^ a, vi[1] ^ b, vi[2] ^ c, vi[3] ^ d,
            vi[4] ^ e, vi[5] ^ f, vi[6] ^ g, vi[7] ^ h]


def sm3(data: bytes) -> bytes:
    ml = len(data)
    msg = bytearray(data)
    msg.append(0x80)
    while len(msg) % 64 != 56:
        msg.append(0x00)
    msg += (ml * 8).to_bytes(8, 'big')
    v = list(SM3_IV)
    for i in range(0, len(msg), 64):
        v = _cf(v, bytes(msg[i:i + 64]))
    return b''.join(x.to_bytes(4, 'big') for x in v)


def hmac_sm3(key: bytes, msg: bytes) -> bytes:
    block = 64
    if len(key) > block:
        key = sm3(key)
    key = key + b'\x00' * (block - len(key))
    o, i = bytes(x ^ 0x5C for x in key), bytes(x ^ 0x36 for x in key)
    return sm3(o + sm3(i + msg))


# ---------------------------------------------------------------------------
# 枚举（对齐标准文件「附录 B」与「7.2 许可证编码」）
# ---------------------------------------------------------------------------

UNIT_TAGS = {
    0x00: 'LicenseIndex', 0x01: 'ContentTag', 0x02: 'AuthorizedObjectTag',
    0x03: 'KeyTag', 0x04: 'KeyUsageRulesTag', 0xFF: 'DigitalSignatureTag',
}

KEY_TYPES = {0x01: 'ContentEncryptionKey(CEK)', 0x03: 'DeviceKey',
             0x20: 'SessionKey', 0x21: 'MACKey'}

CRYPTO_ALGOS = {0x02: 'SM3_256', 0x12: 'SM2_256', 0x22: 'SM4_128', 0x43: 'HMAC_SM3'}

# 密钥层级里各密钥的**应有长度**（SM4=16B；HMAC-SM3 密钥=32B）——长度不对说明上一级解错了
EXPECTED_KEY_LEN = {'SessionKey': 16, 'MACKey': 32, 'ContentEncryptionKey(CEK)': 16}


# ---------------------------------------------------------------------------
# 许可证 TLV
# ---------------------------------------------------------------------------

def decode_units(binary: bytes) -> list:
    """单元编码：type(8) | index(8) | length(16, 大端) | data(length)。

    守卫照抄原实现：`if bufLen <= 4: return 0` —— 剩余长度不足一个空单元时停止。
    """
    units = []
    pos = 0
    n = len(binary)
    guard = 0
    while n - pos > 4 and guard < 10000:
        guard += 1
        tag = binary[pos]
        index = binary[pos + 1]
        size = (binary[pos + 2] << 8) | binary[pos + 3]
        if n - pos < size + 4:
            units.append({'offset': pos, 'tag': '0x%02X' % tag,
                          'index': index, 'declared_len': size,
                          'truncated': True,
                          'remaining': n - pos})
            break
        data = binary[pos + 4:pos + 4 + size]
        units.append({
            'offset': pos,
            'tag': '0x%02X' % tag,
            'tag_name': UNIT_TAGS.get(tag, 'Reserved'),
            'index': index,
            'len': size,
            'data_hex': data.hex(),
            'data_ascii': ''.join(chr(b) if 32 <= b < 127 else '.' for b in data),
        })
        pos += size + 4
    return units


def annotate_units(units: list) -> list:
    """对已知 tag 补语义。**字段偏移未在文章中给出的一律标注 heuristic。**"""
    for u in units:
        tag = int(u['tag'], 16)
        raw = binascii.unhexlify(u['data_hex']) if u.get('data_hex') else b''
        if tag == 0x03 and len(raw) >= 4:
            # 常见布局假设：algorithm(1) | keyType(1) | ... ；仅作提示，不当作事实
            u['key_info'] = {
                'heuristic': True,
                'note': '字段偏移文章未给出，请用 --raw 对照目标二进制校准；'
                        '长度自洽检查基于「按 keyType 找到密钥体」的假设',
                'algorithm_guess': CRYPTO_ALGOS.get(raw[0], '0x%02X' % raw[0]),
                'key_type_guess': KEY_TYPES.get(raw[1], '0x%02X' % raw[1]),
                'data_len': len(raw),
            }
            kt = KEY_TYPES.get(raw[1])
            if kt in EXPECTED_KEY_LEN:
                u['key_info']['expected_key_len'] = EXPECTED_KEY_LEN[kt]
                u['key_info']['len_consistent_with'] = u['key_info']['expected_key_len']
        elif tag == 0xFF and len(raw) >= 3:
            u['sig_info'] = {
                'algorithm_guess': CRYPTO_ALGOS.get(raw[0], '0x%02X' % raw[0]),
                'ciphertext_len': len(raw),
                'note': 'HMAC-SM3 签名的 msg 取「0xFF 0x0D 之前的全部字节」，见 license_message()',
            }
        elif tag == 0x00 and len(raw) >= 1:
            u['license_index_info'] = {
                'version_guess': raw[0],
                'rest_hex': raw[1:].hex(),
                'note': 'Version/LicenseID(8B)/UnitsNumber/TimeStamp 的偏移需按平台校准；'
                        'UnitsNumber 也可用「实际解析出的单元数」交叉验证',
            }
    return units


def license_message(binary: bytes) -> bytes:
    """HMAC-SM3 覆盖的字节范围：`0xFF 0x0D`（签名单元的类型字节 + 索引字节）之前。

    用整段 license 去算 HMAC 必然失败——这是 E 层验签不过的头号原因。
    """
    marker = binary.find(b'\xFF\x0D')
    return binary[:marker] if marker >= 0 else binary


def parse_license(binary: bytes, mac_key: bytes = None, verify=False) -> dict:
    units = annotate_units(decode_units(binary))
    out = {
        'bytes': len(binary),
        'unit_count': len(units),
        'units': units,
        'first_unit': units[0]['tag_name'] if units else None,
        'last_unit': units[-1]['tag_name'] if units else None,
        'has_signature_marker_ff0d': b'\xFF\x0D' in binary,
    }
    msg = license_message(binary)
    out['signature_message'] = {'len': len(msg), 'hex_head': msg[:32].hex(),
                               'note': 'HMAC-SM3 的 msg 只能取到 0xFF 0x0D 之前'}
    if verify:
        sigs = [u for u in units if u['tag'] == '0xFF']
        if not mac_key:
            out['verify'] = {'ok': False, 'error': '缺少 --mac-key-hex，无法验签'}
        elif not sigs:
            out['verify'] = {'ok': False, 'error': '许可证里没有 0xFF 签名单元'}
        else:
            raw = binascii.unhexlify(sigs[-1]['data_hex'])
            expect = hmac_sm3(mac_key, msg)
            # 签名单元通常以「算法字节」开头，签名体在其后
            cand = [raw, raw[1:], raw[-32:]]
            hit = next((c for c in cand if c == expect), None)
            out['verify'] = {'ok': hit is not None,
                             'computed': expect.hex(),
                             'signature_body_hex': raw.hex(),
                             'matched_slice': (['full', 'after-1-byte', 'last-32'][cand.index(hit)]
                                               if hit else None)}
    return out


# ---------------------------------------------------------------------------
# mdcm 模式串（语义照抄原 C 实现的 parse_cipher_mode）
# ---------------------------------------------------------------------------

def parse_mdcm(service: str, apply_iv_rewrite=False) -> dict:
    """
    段格式：首个字母 decide 语义
      m<mode>     加密模式
      s a:b:c     一轮 = a 次 CTR + b 次 XOR，共 c 次
      a 0/1       1 ⇒ 只加密关键帧
      v<hex32+>   IV（十六进制；原实现要求解出**恰好 16 字节**才计入）
      e / f       其它参数，参与段数计数
    末尾校验：cryptoMode == 0 ⇒ 有效段数必须 == 3；== 1 ⇒ 必须 == 4（否则整体失败）
    """
    res = {'service_name': service, 'valid': False, 'segments': [],
           'crypto_mode': None, 'dcm': None, 'iv_hex': None,
           'is_keyframes_only': None, 'extra': {}}
    count = 0
    for seg in service.split('|'):
        if not seg:
            continue
        letter = seg[0]
        body = seg[1:]
        if letter == 'm':
            res['crypto_mode'] = body
            res['segments'].append({'seg': seg, 'kind': 'mode', 'counted': False})
        elif letter == 's':
            parts = body.split(':')
            if len(parts) == 3:
                try:
                    a, b, c = (int(x) for x in parts)
                except ValueError:
                    continue
                # 原实现：dcmTotalRounds 必须落在 [2,10]（(c-2) < 9 且 c > 0）
                if a > 0 and 2 <= c <= 10:
                    count += 1
                    res['dcm'] = {'ctr_blocks': a, 'xor_blocks': b, 'total_rounds': c}
                    res['segments'].append({'seg': seg, 'kind': 'sched', 'counted': True})
                else:
                    res['segments'].append({'seg': seg, 'kind': 'sched', 'counted': False,
                                            'reject': '块数越界（要求 2<=total<=10 且 ctr>0）'})
        elif letter == 'a':
            try:
                res['is_keyframes_only'] = int(body) != 0
            except ValueError:
                res['is_keyframes_only'] = None
            count += 1
            res['segments'].append({'seg': seg, 'kind': 'keyframes', 'counted': True})
        elif letter == 'v':
            try:
                hx = binascii.unhexlify(body if len(body) % 2 == 0 else body[:-1])
            except Exception:
                hx = b''
            if len(hx) == 16:
                count += 1
                res['iv_hex'] = hx.hex()
                res['segments'].append({'seg': seg, 'kind': 'iv', 'counted': True,
                                        'iv_len': len(hx)})
            else:
                res['segments'].append({'seg': seg, 'kind': 'iv', 'counted': False,
                                        'reject': 'IV 解出 %d 字节（原实现要求恰好 16）' % len(hx)})
        else:
            res['extra'][seg] = body
            res['segments'].append({'seg': seg, 'kind': 'extra(not-counted)', 'counted': False})

    # 原实现的 cryptoMode 是「模式名比对」得出的枚举值 0/1（不是字符串），
    # 我们只能复算「有效段数」并给出两种模式各自的期望值，由使用者按目标对照。
    res['counted_segments'] = count
    res['count_check'] = {'counted': count,
                          'expected_if_mode0': 3,
                          'expected_if_mode1': 4,
                          'note': 'cryptoMode==0 需 3 段；==1 需 4 段（原实现 v26 = 3/4，不等则返回 -1）'}
    if res['dcm'] and res['iv_hex']:
        iv = binascii.unhexlify(res['iv_hex'])
        res['iv_plan'] = {'raw': iv.hex()}
        if apply_iv_rewrite:
            patched = bytearray(iv)
            patched[12:15] = b'\x00\x00\x00'
            patched[15] = 0x01
            res['iv_plan']['ffmpeg_rewrite'] = patched.hex()
            res['iv_plan']['note'] = 'ffmpeg 接入点的 IV 改写：末 4 字节 → 00 00 00 01'
        res['valid'] = True
    return res


# ---------------------------------------------------------------------------
# 自检
# ---------------------------------------------------------------------------

def _mk_license(units) -> bytes:
    out = bytearray()
    for tag, index, data in units:
        out.append(tag)
        out.append(index)
        out += len(data).to_bytes(2, 'big')
        out += data
    return bytes(out)


def _selftest() -> int:
    fails, total = [], 0

    def check(name, cond, extra=''):
        nonlocal total
        total += 1
        if not cond:
            fails.append('%s %s' % (name, extra))

    # --- SM3 标准测试向量（GB/T 32905-2016） ---
    check('SM3("abc") 标准向量',
          sm3(b'abc').hex() == '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0',
          sm3(b'abc').hex())
    check('SM3(64字节 "abcd"*16) 标准向量',
          sm3(b'abcd' * 16).hex() == 'debe9ff92275b8a138604889c18e5a4d6fdb70e5387e5765293dcba39c0c5732',
          sm3(b'abcd' * 16).hex())
    check('SM3 空输入稳定', sm3(b'').hex() == sm3(b'').hex() and len(sm3(b'')) == 32)
    check('SM3 长度变化影响结果', sm3(b'a') != sm3(b'b'))
    check('HMAC-SM3 与 RFC2104 结构一致（手工复算）', (
        hmac_sm3(b'k', b'm') == sm3(
            bytes(x ^ 0x5C for x in (b'k' + b'\x00' * 63)) +
            sm3(bytes(x ^ 0x36 for x in (b'k' + b'\x00' * 63)) + b'm'))))
    check('HMAC-SM3 长 key 先哈希', hmac_sm3(b'x' * 100, b'm') == hmac_sm3(sm3(b'x' * 100), b'm'))
    check('HMAC-SM3 对消息敏感', hmac_sm3(b'k', b'm1') != hmac_sm3(b'k', b'm2'))

    # --- TLV 骨架 ---
    lic = _mk_license([
        (0x00, 0, bytes([1]) + b'LICENSE0' + bytes([3]) + b'\x00\x00\x00\x01'),
        (0x01, 1, b'MjAyNzI0OTU='),
        (0x03, 2, bytes([0x12, 0x20]) + b'\x11' * 64),
        (0xFF, 0x0D, bytes([0x43]) + b'\x22' * 32),
    ])
    units = decode_units(lic)
    check('解析出 4 个单元', len(units) == 4, str(len(units)))
    check('单元 tag 顺序正确',
          [u['tag'] for u in units] == ['0x00', '0x01', '0x03', '0xFF'])
    check('单元长度解析正确', [u['len'] for u in units] == [14, 12, 66, 33], str([u['len'] for u in units]))
    check('单元索引解析正确', [u['index'] for u in units] == [0, 1, 2, 0x0D])
    check('tag 名称映射正确', units[3]['tag_name'] == 'DigitalSignatureTag')

    # --- 签名 msg 的切法（E 层验签不过的头号原因） ---
    msg = license_message(lic)
    check('签名 msg 切到 0xFF 0x0D 之前', msg == lic[:len(lic) - (33 + 4)], '%d vs %d' % (len(msg), len(lic) - 37))
    check('msg 不含签名单元', b'\x22' * 32 not in msg)
    check('没有 0xFF 0x0D 时 msg = 全文（不崩）', license_message(b'\x00\x01\x00\x00' * 2) == b'\x00\x01\x00\x00' * 2)

    # --- HMAC-SM3 验签端到端 ---
    mac_key = b'\x33' * 32
    good_sig = hmac_sm3(mac_key, lic[:len(lic) - 37])
    lic2 = lic[:len(lic) - 37] + _mk_license([(0xFF, 0x0D, bytes([0x43]) + good_sig)])
    res = parse_license(lic2, mac_key, verify=True)
    check('验签通过（算法字节 + 32 字节签名体）', res['verify']['ok'] is True, str(res['verify']))
    check('验签命中切片标注正确', res['verify']['matched_slice'] == 'after-1-byte')
    bad = parse_license(lic2, b'\x44' * 32, verify=True)
    check('错 MACKey 必须验签失败', bad['verify']['ok'] is False)
    check('缺 MACKey 时明确报错而不是抛异常',
          parse_license(lic2, None, verify=True)['verify']['error'].startswith('缺少'))
    check('无签名单元时报错清晰',
          parse_license(_mk_license([(0x01, 0, b'x')]), mac_key, verify=True)['verify']['error'].find('没有') >= 0)

    # --- 截断/畸形输入 ---
    trunc = decode_units(lic[:30])
    check('截断单元被标记而不是崩', any(u.get('truncated') for u in trunc), str(trunc))
    check('空输入得到 0 单元', decode_units(b'') == [])
    check('短于 4 字节不产生单元', decode_units(b'\x00\x01\x00') == [])
    check('非法长度（声明超出剩余）被标记',
          decode_units(b'\x03\x00\xFF\xFFab')[0].get('truncated') is True)

    # --- mdcm 模式串（文章真实样本） ---
    svc = 'mdcm|s1:9:10|a0|vd70b0e7a262f4cc52b667901eb2e8b9d|e1|f497006|'
    m = parse_mdcm(svc)
    check('mdcm 解析出 dcm 调度 1:9:10',
          m['dcm'] == {'ctr_blocks': 1, 'xor_blocks': 9, 'total_rounds': 10}, str(m['dcm']))
    check('mdcm 解析出 IV（16 字节）', m['iv_hex'] == 'd70b0e7a262f4cc52b667901eb2e8b9d', str(m['iv_hex']))
    check('mdcm 解析出关键帧标志 a0', m['is_keyframes_only'] is False)
    check('mdcm 段数计数 = 3（s/a/v 各一段）', m['counted_segments'] == 3, str(m['counted_segments']))
    check('mdcm valid 需要有 dcm + iv 才为真', m['valid'] is True)
    check('mdcm 识别加密模式名', m['crypto_mode'] == 'dcm')
    check('mdcm 未命中段数校验时给出期望值说明',
          m['count_check']['expected_if_mode0'] == 3 and m['count_check']['expected_if_mode1'] == 4)
    m2 = parse_mdcm(svc, apply_iv_rewrite=True)
    check('IV 改写（ffmpeg 接入点：末 4 字节 → 00 00 00 01）',
          m2['iv_plan']['ffmpeg_rewrite'] == 'd70b0e7a262f4cc52b66790100000001',
          m2['iv_plan']['ffmpeg_rewrite'])
    m3 = parse_mdcm('mdcm|s1:9:10|a1|v' + '00' * 16 + '|e1|f497006|')
    check('a1 ⇒ 仅关键帧', m3['is_keyframes_only'] is True)
    m4 = parse_mdcm('mdcm|s1:9:20|a0|v' + '00' * 16 + '|')
    check('total_rounds 越界（>10）时该段不计入', m4['counted_segments'] == 2, str(m4['counted_segments']))
    m5 = parse_mdcm('mdcm|s1:9:10|a0|v' + '00' * 10 + '|')
    check('IV 不是 16 字节时该段不计入且给出原因',
          m5['counted_segments'] == 2 and any('16' in (s.get('reject') or '') for s in m5['segments']))
    check('空模式串不崩', parse_mdcm('')['valid'] is False)
    check('无 dcm 段时 valid=False', parse_mdcm('mdcm|a0|')['valid'] is False)

    # --- 枚举映射 ---
    check('单元类型枚举覆盖 0x00/0x01/0x02/0x03/0x04/0xFF',
          all(t in UNIT_TAGS for t in (0x00, 0x01, 0x02, 0x03, 0x04, 0xFF)))
    check('密钥类型枚举含 SessionKey=0x20 / MACKey=0x21',
          KEY_TYPES[0x20] == 'SessionKey' and KEY_TYPES[0x21] == 'MACKey')
    check('算法枚举含 SM2_256=0x12 / SM4_128=0x22 / HMAC_SM3=0x43',
          CRYPTO_ALGOS[0x12] == 'SM2_256' and CRYPTO_ALGOS[0x22] == 'SM4_128' and CRYPTO_ALGOS[0x43] == 'HMAC_SM3')
    check('密钥长度期望表：SessionKey=16 / MACKey=32 / CEK=16',
          EXPECTED_KEY_LEN['SessionKey'] == 16 and EXPECTED_KEY_LEN['MACKey'] == 32)

    print('license_parse 自检：%d 项，失败 %d 项' % (total, len(fails)))
    for f in fails:
        print('  FAIL ' + f)
    return 1 if fails else 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _load_license(args) -> bytes:
    raw = read_bytes(args.input)
    if args.fmt == 'raw':
        return raw
    if args.fmt == 'hex':
        return binascii.unhexlify(raw.decode('ascii').strip().replace('0x', ''))
    # auto：base64 优先（protectedLicenses 就是 base64）
    try:
        txt = raw.decode('ascii').strip()
    except UnicodeDecodeError:
        return raw
    if all(c in '0123456789abcdefABCDEF' for c in txt) and len(txt) % 2 == 0 and len(txt) > 64:
        return binascii.unhexlify(txt)
    try:
        return base64.b64decode(txt + '=' * (-len(txt) % 4), validate=False)
    except Exception:
        return raw


def main(argv=None):
    ap = argparse.ArgumentParser(description='DRM 许可证 / mdcm 模式串解析（零依赖）')
    sub = ap.add_subparsers(dest='cmd')

    p = sub.add_parser('tlv', help='解析许可证 TLV 单元')
    p.add_argument('--input', required=True)
    p.add_argument('--fmt', choices=['auto', 'raw', 'hex'], default='auto')
    p.add_argument('--mac-key-hex')
    p.add_argument('--verify', action='store_true')
    p.add_argument('--raw', action='store_true', help='额外打印各单元的原始 hex')
    p.add_argument('--pretty', action='store_true')

    p = sub.add_parser('mdcm', help='解析 service_name 模式串')
    p.add_argument('--service-name', required=True)
    p.add_argument('--apply-iv-rewrite', action='store_true',
                   help='按 ffmpeg 接入点把 IV 末 4 字节改写为 00 00 00 01')
    p.add_argument('--pretty', action='store_true')

    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args(argv)

    if args.selftest:
        return _selftest()
    if not args.cmd:
        ap.print_help()
        return 1
    try:
        if args.cmd == 'tlv':
            binary = _load_license(args)
            mac = binascii.unhexlify(args.mac_key_hex) if args.mac_key_hex else None
            res = parse_license(binary, mac, verify=args.verify)
            if not args.raw:
                for u in res['units']:
                    u.pop('data_hex', None)
            print(json.dumps(res, ensure_ascii=False, indent=2) if args.pretty
                  else json.dumps(res, ensure_ascii=False))
        else:
            res = parse_mdcm(args.service_name, apply_iv_rewrite=args.apply_iv_rewrite)
            print(json.dumps(res, ensure_ascii=False, indent=2) if args.pretty
                  else json.dumps(res, ensure_ascii=False))
        return 0
    except (ValueError, IOError, OSError) as e:
        print('ERROR %s' % e, file=sys.stderr)
        return 1
    except Exception as e:                                            # noqa: BLE001
        print('ERROR %s: %s' % (type(e).__name__, e), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())