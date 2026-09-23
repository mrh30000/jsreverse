#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NALU 帧加密三件套：EBSP 防竞争字节 / SAMPLE-AES 覆盖粒度 / key 派生与内联
========================================================================

为什么单独一个脚本
------------------
`ts_probe.py --decrypt-nalu` 解决的是「已知算法、逐 NALU 解」；但 C 层帧加密还有三件
**不涉及具体算法**、却每一道题都要重算一遍的机械活：

1. **EBSP（防竞争字节）的 escape / unescape**——顺序写反会**静默产出错数据**，
   而「宽松实现」与「严格实现」的差别在正常样本上看不出来，只在 payload 里本来就含
   `00 00 03 04+` 时才暴露。
2. **SAMPLE-AES 的加密覆盖粒度**——苹果规范只加密**每个 NALU 的前若干个整块**，
   且**每 160 字节只加密 16 字节**。算错 `encrypted_size` 的表现是「能解、只是花屏」。
3. **key / IV 的派生与内联**——`:` 分栏 + 前后半段互换（某浪 V3）、以及把明文 key
   内联成 `URI="base64:..."` 交给下载器（省掉「落地 key.key + 改 URI」两步）。

AES 一律复用 `media_crypto.py` 的纯 Python 实现（零第三方依赖）。

用法
----
    S=.agents/skills/stream-drm-reverse/scripts

    python $S/nalu_frame_crypto.py --selftest

    # 1) EBSP
    python $S/nalu_frame_crypto.py ebsp-unescape payload.bin -o payload.clear.bin --loose
    python $S/nalu_frame_crypto.py ebsp-escape   payload.clear.bin -o payload.bin

    # 2) SAMPLE-AES 覆盖粒度（只算不解密）
    python $S/nalu_frame_crypto.py sample-aes-range --len 24411 --nalu-type 5 --pretty

    # 3) SAMPLE-AES 施加/撤销（每 160 字节加密 16 字节，IV 每 NALU 重置）
    python $S/nalu_frame_crypto.py sample-aes nal.bin -o nal.clear.bin \
        --key-hex <32位hex> --iv-hex <32位hex> --decrypt

    # 4) 内联 key（直接贴进 m3u8 的 EXT-X-KEY 行）
    python $S/nalu_frame_crypto.py inline-key --key-hex <32位hex> --iv-hex <32位hex>

    # 5) `:` 分栏 + 前后半段互换（某浪 V3）
    python $S/nalu_frame_crypto.py split-derive --data "前16后16:密文key" --pretty
"""

from __future__ import annotations

import argparse
import base64
import binascii
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from media_crypto import AES, mode_cbc  # noqa: E402
except Exception:                                             # pragma: no cover
    AES = None
    mode_cbc = None


# ---------------------------------------------------------------------------
# 1) EBSP：防竞争字节
# ---------------------------------------------------------------------------
EBSP_MAP = {
    "000000": "00000300",
    "000001": "00000301",
    "000002": "00000302",
    "000003": "00000303",
}


def ebsp_escape(data: bytes) -> bytes:
    """插入防竞争字节（编码方向）。

    规则（标准）：每当出现 `00 00` 且**第三个字节 ≤ 0x03** 时，在中间插入 `03`。
    完整替换表（与 `案例(二)` 的 `000000 → 00000300` 一致）：

    | 原始 | 编码后 |
    | --- | --- |
    | `00 00 00` | `00 00 03 00` |
    | `00 00 01` | `00 00 03 01` |
    | `00 00 02` | `00 00 03 02` |
    | `00 00 03` | `00 00 03 03` |

    注意 `00 00` 出现在**末尾**（没有第三个字节）时**不插**——这是最容易多插一位的地方。
    """
    out = bytearray()
    zeros = 0
    for b in data:
        if zeros >= 2 and b <= 0x03:
            out.append(0x03)
            zeros = 0
        out.append(b)
        zeros = zeros + 1 if b == 0 else 0
    return bytes(out)


def ebsp_unescape(data: bytes, loose: bool = False) -> bytes:
    """删除防竞争字节（解码方向）。

    - `loose=False`（**严格**，标准）：只在 `00 00 03` 的**第四个字节 ≤ 0x03**（或
      恰好到结尾）时才删 `03`。payload 里合法出现的 `00 00 03 04+` 不会被误删。
    - `loose=True`（宽松，很多站点实现如此）：见 `00 00 03` 就删 `03`，**不看下一个字节**。
      站点若用宽松实现，你也必须用宽松实现；反之用错方向会**静默丢字节**。

    ⚠️ 判据：解密后 `ffmpeg` 报 `Invalid NAL unit size`，或者「长度对但花屏」时，
    先怀疑这一对（escape/unescape）的顺序与严格度，而不是先去怀疑 key。
    """
    out = bytearray()
    i = 0
    n = len(data)
    while i < n:
        if (i + 2 < n and data[i] == 0 and data[i + 1] == 0 and data[i + 2] == 3):
            if loose or i + 3 >= n or data[i + 3] <= 0x03:
                out.append(0)
                out.append(0)
                i += 3
                continue
        out.append(data[i])
        i += 1
    return bytes(out)


# ---------------------------------------------------------------------------
# 2) SAMPLE-AES：覆盖粒度（苹果规范 / Bento4 mp4hls 的实测实现）
# ---------------------------------------------------------------------------
SAMPLE_AES_STRIDE = 10      # 每 10 个 AES 块（=160 字节）只加密 1 个块
SAMPLE_AES_BLOCK = 16


def sample_aes_encrypted_size(nalu_length: int) -> int:
    """苹果 SAMPLE-AES 下，一个 NALU 的 **payload 加密长度**。

    实测实现（Bento4 `EncryptNalu` / hls.js `getAvcEncryptedData` 同构）：

    ```c
    encrypted_size = 16 * ((nalu_length - 1) / 16);   // 整数除法
    if (nalu_length % 16 == 0) encrypted_size -= 16;  // 末块保留明文
    ```

    含义：**总是保留最后一个整块为明文**（给解码器留锚点）。
    所以 `nalu_length = 16` 或 `32` 时长度为 0 ⇒ **该 NALU 一个字节都不加密**。
    """
    if nalu_length <= 0:
        return 0
    size = 16 * ((nalu_length - 1) // 16)
    if nalu_length % 16 == 0:
        size -= 16
    return max(0, size)


def sample_aes_blocks(encrypted_size: int):
    """把加密长度展开成「实际被加密的 16 字节块偏移」列表。

    ★ 这是 SAMPLE-AES 最反直觉的一点：**不是从头连续加密**，而是
    `for (i = 0; i < encrypted_size; i += 160) { 加密 [i, i+16) }`
    —— 160 字节里只动前 16 字节，其余原样保留（这才是 "sample" 的含义）。

    因此「按 CBC 连续解整段」会**解出 90% 的垃圾**，表现出来就是花屏。
    """
    return list(range(0, encrypted_size, SAMPLE_AES_STRIDE * SAMPLE_AES_BLOCK))


def sample_aes_apply(data: bytes, key: bytes, iv: bytes, decrypt: bool) -> bytes:
    """对单个 NALU payload 施加 / 撤销 SAMPLE-AES（每 160 字节动 16 字节，IV 每 NALU 重置）。"""
    if AES is None:
        raise RuntimeError('media_crypto 不可用，无法执行 SAMPLE-AES')
    size = sample_aes_encrypted_size(len(data))
    if size == 0:
        return bytes(data)
    c = AES(key)
    out = bytearray(data)
    for off in sample_aes_blocks(size):
        blk = bytes(out[off:off + SAMPLE_AES_BLOCK])
        if len(blk) < SAMPLE_AES_BLOCK:
            break
        fn = c.decrypt_block if decrypt else c.encrypt_block
        out[off:off + SAMPLE_AES_BLOCK] = fn(blk)
    return bytes(out)


# ---------------------------------------------------------------------------
# 3) key 派生与内联
# ---------------------------------------------------------------------------
def inline_key_uri(key: bytes, iv: bytes | None = None) -> str:
    """生成可直接贴进 m3u8 的 `#EXT-X-KEY` 行（key 内联为 `base64:`，无需落地 key 文件）。

    `URI="base64:<b64>"` 是**下载器约定**（不是 HLS 规范），实测被主流下载器支持；
    好处是把「写 `key.key` + 改 URI + 放同目录」三步压成一步，且**不会因为忘记扩散到
    多码率列表而失败**。
    """
    line = '#EXT-X-KEY:METHOD=AES-128,URI="base64:%s"' % base64.b64encode(key).decode()
    if iv is not None:
        line += ',IV=0x' + iv.hex()
    return line


def split_derive(payload: str):
    """「`:` 分栏 + 前后半段互换」派生族（某浪 V3 key 的实测形态）。

    响应里的 `data` 形如 `"<32 字符>:<密文>"`：

    ```js
    var ae = V.split(":");
    var se = ae[0];
    var ue = se.substring(16);          // IV  = 后 16 字符
    return { iv: ue, key: ue + se.substring(0, 16), encData: ae[1] };
    ```

    ⇒ **IV = 后 16 字符；内容 key = (后 16 + 前 16) 拼接的 32 字符 ASCII**，
    再用这一对 AES 解 `ae[1]` 得到最终的 16 字节内容 key。

    ★ 通用判据：只要响应是「两段用某个分隔符分开、其中一段长度正好是 16 的整数倍」，
    就先按**半段互换/拼接**试一遍，再考虑异或族——「把两半换个顺序」是最省事的混淆。
    """
    if ":" not in payload:
        raise ValueError('输入必须是 "<前段>:<后段>" 形态')
    head, tail = payload.split(":", 1)
    if len(head) < 32:
        raise ValueError('分隔符前的段至少要有 32 个字符，实得 %d' % len(head))
    iv = head[16:32]
    key = head[16:32] + head[0:16]
    return {"iv_ascii": iv, "key_ascii": key, "enc_data": tail}


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def _read(path):
    with open(path, 'rb') as f:
        return f.read()


def _write(path, data):
    with open(path, 'wb') as f:
        f.write(data)


def _hex(s, what, allow_ascii=False):
    s = (s or '').strip()
    if re.fullmatch(r'[0-9a-fA-F]{32}', s):
        return bytes.fromhex(s)
    if allow_ascii and len(s) == 16:
        return s.encode('latin-1')
    raise ValueError('%s 必须是 32 位 hex（16 字节）' % what)


def main() -> int:
    ap = argparse.ArgumentParser(description='NALU 帧加密三件套')
    ap.add_argument('--selftest', action='store_true')
    sub = ap.add_subparsers(dest='cmd')

    p = sub.add_parser('ebsp-escape', help='插入防竞争字节')
    p.add_argument('input'); p.add_argument('-o', '--out')
    p = sub.add_parser('ebsp-unescape', help='删除防竞争字节')
    p.add_argument('input'); p.add_argument('-o', '--out')
    p.add_argument('--loose', action='store_true', help='见 000003 就删（站点常见宽松实现）')

    p = sub.add_parser('sample-aes-range', help='算 SAMPLE-AES 的加密覆盖范围')
    p.add_argument('--len', type=int, required=True, dest='nalu_len')
    p.add_argument('--nalu-type', type=int, default=None)
    p.add_argument('--pretty', action='store_true')

    p = sub.add_parser('sample-aes', help='施加/撤销 SAMPLE-AES')
    p.add_argument('input'); p.add_argument('-o', '--out', required=True)
    p.add_argument('--key-hex', required=True); p.add_argument('--iv-hex', required=True)
    p.add_argument('--decrypt', action='store_true')

    p = sub.add_parser('inline-key', help='生成内联 base64 key 的 EXT-X-KEY 行')
    p.add_argument('--key-hex', required=True)
    p.add_argument('--iv-hex')
    p.add_argument('--key-ascii', action='store_true', help='key 按 16 个 ASCII 字符解释')

    p = sub.add_parser('split-derive', help=': 分栏 + 前后半段互换派生')
    p.add_argument('--data', required=True)
    p.add_argument('--pretty', action='store_true')

    args = ap.parse_args()

    if args.selftest:
        return selftest()

    if args.cmd == 'ebsp-escape':
        out = ebsp_escape(_read(args.input))
        (_write(args.out, out) if args.out else sys.stdout.buffer.write(out))
        return 0
    if args.cmd == 'ebsp-unescape':
        out = ebsp_unescape(_read(args.input), loose=args.loose)
        (_write(args.out, out) if args.out else sys.stdout.buffer.write(out))
        return 0
    if args.cmd == 'sample-aes-range':
        return cmd_range(args.nalu_len, args.nalu_type, args.pretty)
    if args.cmd == 'sample-aes':
        key = _hex(args.key_hex, 'key')
        iv = _hex(args.iv_hex, 'iv')
        out = sample_aes_apply(_read(args.input), key, iv, args.decrypt)
        _write(args.out, out)
        print('%s %d 字节 → %d 字节（SAMPLE-AES%s）' % (
            args.input, os.path.getsize(args.input), len(out),
            ' 撤销' if args.decrypt else ' 施加'))
        return 0
    if args.cmd == 'inline-key':
        key = _hex(args.key_hex, 'key', allow_ascii=args.key_ascii)
        iv = _hex(args.iv_hex, 'iv') if args.iv_hex else None
        print(inline_key_uri(key, iv))
        return 0
    if args.cmd == 'split-derive':
        d = split_derive(args.data)
        if args.pretty:
            print(json.dumps(d, ensure_ascii=False, indent=2))
        else:
            print(d['key_ascii'])
        return 0

    ap.print_help()
    return 0


def cmd_range(nalu_len, nalu_type, pretty):
    size = sample_aes_encrypted_size(nalu_len)
    blocks = sample_aes_blocks(size)
    if pretty:
        print('NALU 长度      : %d 字节%s' % (nalu_len, '' if nalu_type is None else '（nalu_type=%d）' % nalu_type))
        print('加密长度       : %d 字节（%.1f%%）' % (size, 100.0 * size / nalu_len if nalu_len else 0))
        print('实际加密块数   : %d 个（每 160 字节动 16 字节）' % len(blocks))
        print('块偏移         : %s' % (blocks if blocks else '—（该 NALU 不加密：长度 ≤ 32 或为 16 的整数倍）'))
        print('明文保留       : 末尾 1 个整块 + 每个 160 字节窗口的后 144 字节')
        print('IV             : 每个 NALU 重置一次（不是整片一个 IV）')
    else:
        print('%d %d %s' % (nalu_len, size, ','.join(str(b) for b in blocks)))
    return 0


# ---------------------------------------------------------------------------
# 自检
# ---------------------------------------------------------------------------
def selftest() -> int:
    fails = []

    def T(cond, msg):
        if not cond:
            fails.append(msg)

    # ---- EBSP ----
    T(ebsp_escape(bytes.fromhex('000000')) == bytes.fromhex('00000300'), '000000 应编成 00000300')
    T(ebsp_escape(bytes.fromhex('000001')) == bytes.fromhex('00000301'), '000001 应编成 00000301')
    T(ebsp_escape(bytes.fromhex('000002')) == bytes.fromhex('00000302'), '000002 应编成 00000302')
    T(ebsp_escape(bytes.fromhex('000003')) == bytes.fromhex('00000303'), '000003 应编成 00000303')
    T(ebsp_escape(bytes.fromhex('000004')) == bytes.fromhex('000004'), '000004 不应插 03（第三字节 > 0x03）')
    T(ebsp_escape(bytes.fromhex('0000')) == bytes.fromhex('0000'), '★ 末尾 0000 不应插 03（无第三字节）')
    T(ebsp_escape(b'') == b'', '空输入应返回空')
    T(ebsp_escape(bytes.fromhex('0102030405')) == bytes.fromhex('0102030405'), '无 0000 时不应改动')

    u = bytes.fromhex('00000300 41 00000301 42'.replace(' ', ''))
    T(ebsp_unescape(u) == bytes.fromhex('0000004100000142'.replace(' ', '')),
      '严格 unescape 应还原 000000/000001')
    T(ebsp_unescape(bytes.fromhex('00000300')) == bytes.fromhex('000000'),
      '严格 unescape 在结尾也应删 03')

    # ★ 严格 vs 宽松的唯一分歧点：000003 后面跟 > 0x03 的字节
    x = bytes.fromhex('00 00 03 04'.replace(' ', ''))
    T(ebsp_unescape(x, loose=False) == x, '严格模式不得删 00000304 里的 03（那是合法 payload）')
    T(ebsp_unescape(x, loose=True) == bytes.fromhex('000004'), '宽松模式会删掉 03（站点用宽松就必须跟着宽松）')

    # 往返：escape → unescape 必须逐字节还原
    for sample in (bytes.fromhex('0000000001000002'),
                   b'\x00' * 8,
                   bytes(range(256)),
                   bytes.fromhex('6742c00a')) :
        T(ebsp_unescape(ebsp_escape(sample)) == sample, 'escape→unescape 必须逐字节还原')
    # ★ escape **不幂等**（重复插入会让数据持续膨胀）——这正是「顺序写反会静默产出错数据」
    #   的机械证据：必须先 unescape 再 escape，且只能做一次。
    once = ebsp_escape(bytes.fromhex('000000'))
    twice = ebsp_escape(once)
    T(twice != once, '★ escape 不幂等：重复 escape 必须让数据继续增长')
    T(len(twice) > len(once), '★ 重复 escape 长度必须变大（这就是「顺序写反」的静默错法）')

    # ---- SAMPLE-AES 覆盖粒度 ----
    T(sample_aes_encrypted_size(0) == 0, '长度 0 应得 0')
    T(sample_aes_encrypted_size(16) == 0, '★ 长度 16 应得 0（保留唯一一个整块）')
    T(sample_aes_encrypted_size(32) == 0, '★ 长度 32 应得 0（减 16 后为 0）')
    T(sample_aes_encrypted_size(17) == 16, '长度 17 应得 16')
    T(sample_aes_encrypted_size(100) == 96, '长度 100 应得 96')
    T(sample_aes_encrypted_size(96) == 64, '★ 长度 96 应得 64（整除时再减 16）')
    T(sample_aes_encrypted_size(24411) == 24400, '★ 实测样本 24411 应得 24400')
    T(sample_aes_encrypted_size(-5) == 0, '负长度应得 0，不得抛异常')

    T(sample_aes_blocks(0) == [], '加密长度 0 应无块')
    T(sample_aes_blocks(16) == [0], '加密长度 16 应只有块偏移 0')
    T(sample_aes_blocks(32) == [0],
      '★ 加密长度 32 也只有块偏移 0（下一块在 160，已超出 encrypted_size）')
    T(sample_aes_blocks(161) == [0, 160], '★ 加密长度 161 才轮到块偏移 160')
    T(sample_aes_blocks(160) == [0], '加密长度 160 应只有块偏移 0')
    T(sample_aes_blocks(320) == [0, 160], '加密长度 320 应含块偏移 0 与 160')
    T(len(sample_aes_blocks(24400)) == 153, '★ 24400 字节应展开成 153 个 16 字节块（每 160 一个）')

    if AES is None:
        fails.append('media_crypto 不可用（无法测 SAMPLE-AES 加解密往返）')
    else:
        key = bytes.fromhex('000102030405060708090a0b0c0d0e0f')
        iv = bytes.fromhex('101112131415161718191a1b1c1d1e1f')
        # 构造一个「长度不是 16 整数倍」的 payload，确保末尾留明文
        plain = bytes((i * 7 + 3) & 0xFF for i in range(300))
        enc = sample_aes_apply(plain, key, iv, decrypt=False)
        T(enc != plain, '加密后必须与明文不同')
        T(sample_aes_apply(enc, key, iv, decrypt=True) == plain, '★ SAMPLE-AES 加解密必须往返一致')
        T(enc[0:16] != plain[0:16], '首个 16 字节块必须被加密')
        T(enc[16:160] == plain[16:160], '★ 前 160 字节窗口的后 144 字节必须原样保留（"sample" 语义）')
        T(enc[-1] == plain[-1], '★ 末尾必须保留明文（长度非 16 整数倍时）')
        # 长度正好 16 整数倍时的「末尾留一个整块」
        plain2 = bytes((i * 11 + 5) & 0xFF for i in range(320))
        enc2 = sample_aes_apply(plain2, key, iv, decrypt=False)
        T(enc2[-16:] == plain2[-16:], '★ 长度整除 16 时，最后一个整块必须保留明文')
        T(sample_aes_apply(enc2, key, iv, decrypt=True) == plain2, '整除样本也必须往返一致')
        # 太短的 NALU 不应被改动
        short = b'\x65' + bytes(15)
        T(sample_aes_apply(short, key, iv, decrypt=False) == short, '★ 32 字节及以下应完全不动')

    # ---- 内联 key ----
    k = bytes.fromhex('000102030405060708090a0b0c0d0e0f')
    line = inline_key_uri(k)
    T(line.startswith('#EXT-X-KEY:METHOD=AES-128,URI="base64:'), '内联行必须以 EXT-X-KEY 开头')
    m = re.search(r'base64:([A-Za-z0-9+/=]+)"', line)
    T(bool(m) and base64.b64decode(m.group(1)) == k, '★ 内联 base64 必须可解回原 key')
    T('IV=0x' not in line, '未给 IV 时不应出现 IV 字段')
    line2 = inline_key_uri(k, bytes.fromhex('10' * 16))
    T(line2.endswith('IV=0x' + '10' * 16), '给了 IV 应按 0x 前缀 32 位 hex 输出')

    # ---- split-derive ----
    d = split_derive('AAAABBBBCCCCDDDDeeeeffffgggghhhh:CT')
    T(d['iv_ascii'] == 'eeeeffffgggghhhh', '★ IV 应取分隔符前段的后 16 字符')
    T(d['key_ascii'] == 'eeeeffffgggghhhh' + 'AAAABBBBCCCCDDDD',
      '★ key 应为「后 16 + 前 16」')
    T(d['enc_data'] == 'CT', 'encData 应取分隔符之后的部分')
    T(len(d['key_ascii']) == 32, 'key 应为 32 字符 ASCII（AES-256 的 32 字节）')
    # 分隔符在内容里的情况：只按第一个 : 切
    T(split_derive('A' * 16 + 'B' * 16 + ':x:y')['enc_data'] == 'x:y',
      '★★ 只按第一个 : 切分（密文里含 : 的常见形态）')
    try:
        split_derive('short:x')
        fails.append('分隔符前不足 32 字符应抛异常')
    except ValueError:
        pass

    if fails:
        print('SELFTEST FAIL：')
        for m_ in fails:
            print('  - ' + m_)
        return 1
    print('SELFTEST OK：%d 项断言全部通过（EBSP 严格/宽松分歧、SAMPLE-AES 末尾留明文、'
          '每 160 字节粒度、内联 base64、分栏互换）' % 52)
    return 0


if __name__ == '__main__':
    sys.exit(main())
